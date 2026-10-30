#!/usr/bin/env python3
"""
An independent check of the cluster fit (Prompt 219, CLUSTER_FITTING.md).

Written from the document's equations, not from js/kernels/clusters/: its own
isochrone morph (numpy), its own IMF integral, its own forward model (a fixed
Monte Carlo of 4e5 stars per isochrone, common random numbers across
parameters, histogrammed), its own deviance, its own optimiser (SciPy
Nelder-Mead after a coarse scan), an unbinned conditional likelihood (exact
normal kernels summed over the isochrone), and emcee (Foreman-Mackey et al.
2013, PASP 125, 306) for the width of the posterior of that likelihood.

Run:
  node tools/cluster-fit-validate.mjs --export-oracle-input <dir>
  python3 tools/cluster-fit-oracle/oracle.py <dir> > tests/fixtures/cluster-fit/oracle-results.json

Reads <dir>/oracle-input.json (isochrone rows, constants, the three synthetic
datasets with their truth, the test points). Needs numpy, scipy, emcee. It
imports no Gravitas code and no isochrone-fitting package: MATCH (Dolphin 2002),
BASE-9 and ASteCA are not installed and were not downloaded, so no published
isochrone-fitting program checks the kernel; what is independent is the
implementation, the integration scheme and the optimiser, not the idea (the
Poisson-type deviance on a colour-magnitude Hess diagram is Dolphin's).
"""
import json
import math
import sys
import numpy as np
from scipy.optimize import minimize
from scipy.stats import norm
import emcee

inp = json.load(open(sys.argv[1] + "/oracle-input.json"))
C = inp["constants"]
ROWS_ = np.array(inp["iso"]["feh"]), np.array(inp["iso"]["logAge"]), np.array(inp["iso"]["phase"])
MASS, G, R = (np.array(inp["iso"][k]) for k in ("mass", "g", "r"))
SCALE = (0.03, 0.15)
W = C["window"]
G0, G1 = W["g"]
C0, C1 = W["colour"]
DG, DC = W["rowMag"], W["colourWidth"]
NR = int(round((G1 - G0) / DG))
NC = int(round((C1 - C0) / DC))
EPS = C["eps"]
RR = C["R"]
EM = C["errorModel"]
BR = C["bridge"]


def sigma(m):
    return np.sqrt(EM["floor"] ** 2 + (EM["sigmaAt"] * 10 ** (0.4 * (m - EM["magAt"]))) ** 2)


def imf_weight(m1, m2):
    """Kroupa 2001 number between m1 and m2 (vectorised), continuous at 0.5."""
    a1, a2, mb, lo = 1.3, 2.3, 0.5, 0.08
    k2 = mb ** (a2 - a1)
    m1 = np.maximum(m1, lo)
    m2 = np.maximum(m2, m1)
    f1 = lambda a, b: (b ** (1 - a1) - a ** (1 - a1)) / (1 - a1)
    f2 = lambda a, b: k2 * (b ** (1 - a2) - a ** (1 - a2)) / (1 - a2)
    w = np.zeros_like(m1)
    lo1 = np.minimum(m1, mb)
    hi1 = np.minimum(m2, mb)
    w += f1(lo1, hi1)
    lo2 = np.maximum(m1, mb)
    hi2 = np.maximum(m2, mb)
    w += f2(lo2, hi2)
    return w


def grid_iso(feh, la):
    sel = (np.abs(ROWS_[0] - feh) < 1e-6) & (np.abs(ROWS_[1] - la) < 1e-6)
    out = []
    ph = ROWS_[2][sel]
    for p in dict.fromkeys(ph.tolist()):
        s = ph == p
        out.append((p, MASS[sel][s], G[sel][s], R[sel][s]))
    return out


def arclen(g, r):
    dc = np.diff(g - r) / SCALE[0]
    dg = np.diff(g) / SCALE[1]
    return np.concatenate([[0.0], np.cumsum(np.hypot(dc, dg))])


def resample(m, g, r, k):
    s = arclen(g, r)
    t = np.linspace(0, s[-1], k)
    return np.interp(t, s, m), np.interp(t, s, g), np.interp(t, s, r)


def morph(A, B, t):
    out = []
    pa = {p[0]: p for p in A}
    pb = {p[0]: p for p in B}
    for ph in sorted(set(pa) | set(pb)):
        if ph in pa and ph in pb:
            la = arclen(pa[ph][2], pa[ph][3])[-1]
            lb = arclen(pb[ph][2], pb[ph][3])[-1]
            k = int(min(2000, max(8, math.ceil(max(la, lb) / 0.3))))
            a = resample(*pa[ph][1:], k)
            b = resample(*pb[ph][1:], k)
            out.append((ph,) + tuple((1 - t) * x + t * y for x, y in zip(a, b)))
        else:
            out.append(pa.get(ph) if t < 0.5 and ph in pa else pb.get(ph, pa.get(ph)))
    return out


FEHS = sorted(set(ROWS_[0].tolist()))
AGES = sorted(set(round(x, 6) for x in ROWS_[1].tolist()))


def iso_at(feh, la):
    ia = max(0, min(len(AGES) - 2, int(np.searchsorted(AGES, la + 1e-9, side="right") - 1)))
    lo, hi = AGES[ia], AGES[ia + 1]
    t = (la - lo) / (hi - lo)
    # the metallicity is a grid value in every leg of Part A
    fe = min(FEHS, key=lambda x: abs(x - feh))
    if abs(t) < 1e-9:
        return grid_iso(fe, lo)
    if abs(t - 1) < 1e-9:
        return grid_iso(fe, hi)
    return morph(grid_iso(fe, lo), grid_iso(fe, hi), t)


def segments(iso, step=0.004):
    """Points (colour, g) of the chain's short pieces and their IMF weights."""
    cs, gs, ws, ms = [], [], [], []
    prev = None
    for ph, m, g, r in iso:
        chain = []
        if prev is not None:
            chain.append(prev)
        chain.extend(zip(m, g, r))
        join_first = prev is not None
        for i in range(len(chain) - 1):
            a, b = chain[i], chain[i + 1]
            dc = (b[1] - b[2]) - (a[1] - a[2])
            dg = b[1] - a[1]
            ln = max(abs(dc), abs(dg))
            if join_first and i == 0 and ln > BR:
                continue
            w = float(imf_weight(np.array([a[0]]), np.array([b[0]]))[0])
            if not w > 0:
                continue
            k = max(1, int(math.ceil(ln / step)))
            f = (np.arange(k) + 0.5) / k
            cs.append((a[1] - a[2]) + f * dc)
            gs.append(a[1] + f * dg)
            ws.append(np.full(k, w / k))
            ms.append(a[0] + f * (b[0] - a[0]))
        prev = (m[-1], g[-1], r[-1])
    return np.concatenate(cs), np.concatenate(gs), np.concatenate(ws), np.concatenate(ms)


def hist_model(la, dm, E, u, ng, nr):
    c, g, w, _ = segments(iso_at(FEH, la), 0.01)
    cum = np.cumsum(w)
    idx = np.minimum(np.searchsorted(cum, u * cum[-1]), len(cum) - 1)
    gA = g[idx] + dm + RR * E
    cA = c[idx] + E
    rA = gA - cA
    gp = gA + sigma(gA) * ng
    rp = rA + sigma(rA) * nr
    cp = gp - rp
    h, _, _ = np.histogram2d(gp, cp, bins=[NR, NC], range=[[G0, G1], [C0, C1]])
    return h


def binned(g, c):
    h, _, _ = np.histogram2d(g, c, bins=[NR, NC], range=[[G0, G1], [C0, C1]])
    return h


def deviance(model, data):
    n_j = data.sum(axis=1)
    msum = model.sum(axis=1)
    thr = 1e-6 * msum.max()
    p = np.where((msum > thr)[:, None], (1 - EPS) * model / np.maximum(msum, 1e-300)[:, None] + EPS / NC, 1.0 / NC)
    sat = np.where(data > 0, data * np.log(np.where(data > 0, data, 1) / np.maximum(n_j, 1)[:, None]), 0).sum() * 2
    return float(-2 * (data * np.log(p)).sum() + sat)


rng = np.random.default_rng(219)
NMC = int(C["draws"])
U = rng.random(NMC)
NG = rng.standard_normal(NMC)
NRr = rng.standard_normal(NMC)


def binned_dev(la, dm, E, data):
    if la < AGES[0] or la > AGES[-1]:
        return 1e9
    return deviance(hist_model(la, dm, E, U, NG, NRr), data)


def unbinned_setup(g, c, la, dm, E):
    cA, gA, w, _ = segments(iso_at(FEH, la), 0.006)
    gA = gA + dm + RR * E
    cA = cA + E
    rA = gA - cA
    return cA, gA, rA, w


def unbinned_dev(la, dm, E, g, c):
    if la < AGES[0] or la > AGES[-1]:
        return 1e9
    cA, gA, rA, w = unbinned_setup(g, c, la, dm, E)
    sg = sigma(gA)[None, :]
    sr = sigma(rA)[None, :]
    gi = g[:, None]
    ci = c[:, None]
    kg = np.exp(-0.5 * ((gi - gA[None, :]) / sg) ** 2) / sg
    kr = np.exp(-0.5 * ((gi - ci - rA[None, :]) / sr) ** 2) / sr
    num = (w[None, :] * kg * kr).sum(axis=1)
    den = (w[None, :] * kg).sum(axis=1) * math.sqrt(2 * math.pi)
    inside = (g >= G0) & (g < G1)
    pdf = np.where(den > 1e-300, num / np.maximum(den, 1e-300), 0.0)
    L = (1 - EPS) * pdf + EPS / (NC * DC)
    return float(-2 * np.log(L[inside]).sum())


out = {"sets": {}, "meta": {"draws": NMC, "numpy": np.__version__, "emcee": emcee.__version__}}
for name, ds in inp["datasets"].items():
    FEH = ds["truth"]["feh"]
    E = ds["truth"]["E"]
    g = np.array(ds["g"])
    c = np.array(ds["colour"])
    sel = (g >= G0) & (g < G1) & (c >= C0) & (c < C1)
    g, c = g[sel], c[sel]
    data = binned(g, c)
    res = {"stars": int(sel.sum())}
    res["test"] = [
        {"logAge": p[0], "dm": p[1], "binned": binned_dev(p[0], p[1], E, data)} for p in ds["testPoints"]
    ]
    # coarse scan, then Nelder-Mead
    best = (1e18, None)
    t = ds["truth"]
    for la in np.arange(9.0, 9.601, 0.05):
        for dm in np.arange(t["dm"] - 1.0, t["dm"] + 1.001, 0.1):
            d = binned_dev(la, dm, E, data)
            if d < best[0]:
                best = (d, (la, dm))
    nm = minimize(lambda x: binned_dev(x[0], x[1], E, data), best[1], method="Nelder-Mead",
                  options={"xatol": 1e-3, "fatol": 1e-2, "initial_simplex": [best[1], (best[1][0] + 0.02, best[1][1]), (best[1][0], best[1][1] + 0.05)]})
    res["binnedBest"] = {"logAge": float(nm.x[0]), "dm": float(nm.x[1]), "deviance": float(nm.fun)}
    nu = minimize(lambda x: unbinned_dev(x[0], x[1], E, g, c), nm.x, method="Nelder-Mead",
                  options={"xatol": 1e-3, "fatol": 1e-2, "initial_simplex": [nm.x, (nm.x[0] + 0.02, nm.x[1]), (nm.x[0], nm.x[1] + 0.05)]})
    res["unbinnedBest"] = {"logAge": float(nu.x[0]), "dm": float(nu.x[1]), "deviance": float(nu.fun)}

    def logp(x):
        if not (AGES[0] <= x[0] <= AGES[-1] and t["dm"] - 1.5 <= x[1] <= t["dm"] + 1.5):
            return -np.inf
        return -0.5 * unbinned_dev(x[0], x[1], E, g, c)

    nw = 20
    p0 = nu.x + 1e-3 * rng.standard_normal((nw, 2))
    sampler = emcee.EnsembleSampler(nw, 2, logp)
    sampler.run_mcmc(p0, int(C["emceeSteps"]), progress=False)
    chain = sampler.get_chain(discard=int(C["emceeBurn"]), flat=True)
    res["posterior"] = {
        "logAgeSd": float(chain[:, 0].std()),
        "dmSd": float(chain[:, 1].std()),
        "logAgeMean": float(chain[:, 0].mean()),
        "dmMean": float(chain[:, 1].mean()),
        "acceptance": float(sampler.acceptance_fraction.mean()),
    }
    out["sets"][name] = res
print(json.dumps(out, indent=1))
