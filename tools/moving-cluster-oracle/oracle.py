#!/usr/bin/env python3
"""
Independent oracle for the moving-cluster gate (Roadmap III, Prompt 234 Part A).

Written from the contract in tests/fixtures/moving-cluster/thresholds.json
("contracts", "forms", AM1 to AM3). numpy, scipy and astropy only; no Gravitas
code. It receives the sample as data (the real file by path; the synthetic
realizations as a pinned input file written by the validator), recomputes the
whole pipeline for both forms (committed and amended) and a bootstrap with its
own generator (numpy default_rng).

    python3 oracle.py --synthetic DIR/synthetic.json --csv hyades.csv \
        --mask DIR/real-zeropoints.json --out oracle-results.json
"""
import argparse
import hashlib
import json
import math
import sys

import numpy as np
import scipy
import astropy
from astropy.coordinates import SkyCoord
import astropy.units as u

K = 4.740470446
SIGMA0 = 1.0
RV_CUT = 3.0
MIN_SIN = 0.1
MIN_COS2 = 0.05
OFF_FLOOR = 0.01
OFF_CAP = 6.0
WINDOW = 0.30
Q_FLOOR = 1e-4
Q_CAP = 0.25
NSIG = 3.0
MAX_ITER = 30
MIN_MEMBERS = 20
MIN_RV = 10
MAX_OFF_SIGMA = 3.0
MAX_RV_SCATTER = 3.0
MAX_REL_INTERVAL = 0.10
MAX_DISCARD = 0.05
FORMS = {
    "committed": dict(seed="density", q_always=False),
    "amended": dict(seed="cp", q_always=True),
}


def mad_sigma(x):
    m = np.median(x)
    return 1.4826 * np.median(np.abs(x - m)), m


def prepare(rows, rv_cut=RV_CUT, mask=None):
    """rows: list of dicts. Returns a dict of arrays for the usable stars and their row indices."""
    n_rows = len(rows)
    ra = np.array([r["ra"] for r in rows], float)
    dec = np.array([r["dec"] for r in rows], float)
    plx = np.array([r["parallax"] for r in rows], float)
    plxe = np.array([r["parallaxError"] if r["parallaxError"] is not None else np.nan for r in rows], float)
    pmra = np.array([r["pmra"] for r in rows], float)
    pmdec = np.array([r["pmdec"] for r in rows], float)
    rv = np.array([np.nan if r.get("rv") is None else r["rv"] for r in rows], float)
    rve = np.array([np.nan if r.get("rvError") is None else r["rvError"] for r in rows], float)
    a = np.radians(ra)
    d = np.radians(dec)
    n = np.stack([np.cos(d) * np.cos(a), np.cos(d) * np.sin(a), np.sin(d)], 1)
    e = np.stack([-np.sin(a), np.cos(a), np.zeros_like(a)], 1)
    g = np.stack([-np.cos(a) * np.sin(d), -np.sin(a) * np.sin(d), np.cos(d)], 1)
    p = pmra[:, None] * e + pmdec[:, None] * g
    mu = np.linalg.norm(p, axis=1)
    ok = np.isfinite(ra + dec + plx + pmra + pmdec) & (plxe > 0) & (mu > 0)
    if mask is not None:
        ok &= mask
    idx = np.nonzero(ok)[0]
    n, p, mu = n[idx], p[idx], mu[idx]
    t = p / mu[:, None]
    b = np.cross(n, t)
    rv_ok = np.isfinite(rv[idx]) & np.isfinite(rve[idx]) & (rve[idx] <= rv_cut)
    st = dict(
        index=idx, n=n, p=p, t=t, b=b, mu=mu,
        plx=plx[idx], plxe=plxe[idx], pmra=pmra[idx], pmdec=pmdec[idx],
        rv=np.where(rv_ok, rv[idx], np.nan), rve=np.where(rv_ok, rve[idx], np.nan), hasrv=rv_ok,
    )
    # an independent check of the sky vectors with astropy
    sc = SkyCoord(ra=ra[idx] * u.deg, dec=dec[idx] * u.deg)
    xyz = np.stack([sc.cartesian.x.value, sc.cartesian.y.value, sc.cartesian.z.value], 1)
    st["astropy_max_diff"] = float(np.max(np.abs(xyz - n))) if len(idx) else 0.0
    return st


def fit_cp(b, t, n):
    S = b.T @ b
    w, v = np.linalg.eigh(S)
    c = v[:, 0]
    tu_sum = 0.0
    # sum of t . u(c) over the set
    cn = n @ c
    w_ = c[None, :] - cn[:, None] * n
    sin = np.linalg.norm(w_, axis=1)
    with np.errstate(invalid="ignore", divide="ignore"):
        u_ = w_ / sin[:, None]
    tu = np.where(sin > 0, np.sum(t * u_, axis=1), 0.0)
    if tu.sum() < 0:
        c = -c
    return c


def geometry(st, c, sel=None):
    n = st["n"] if sel is None else st["n"][sel]
    t = st["t"] if sel is None else st["t"][sel]
    p = st["p"] if sel is None else st["p"][sel]
    b = st["b"] if sel is None else st["b"][sel]
    cn = n @ c
    w = c[None, :] - cn[:, None] * n
    sin = np.linalg.norm(w, axis=1)
    with np.errstate(invalid="ignore", divide="ignore"):
        u_ = w / sin[:, None]
    tu = np.where(sin > 0, np.sum(t * u_, axis=1), 0.0)
    mu_par = np.where(sin > 0, np.sum(p * u_, axis=1), 0.0)
    off = np.degrees(np.arcsin(np.clip(b @ c, -1, 1)))
    return dict(cos=cn, sin=sin, tu=tu, mu_par=mu_par, off=off)


def star_plx(mu_par, sin, V):
    with np.errstate(invalid="ignore", divide="ignore"):
        out = K * mu_par / (V * sin)
    bad = ~((sin >= MIN_SIN) & (mu_par > 0) & (V > 0))
    out = np.where(bad, np.nan, out)
    return out


def fit_speed(st, sel, c):
    s = sel[st["hasrv"][sel]]
    if len(s) == 0:
        return dict(n=0, V=np.nan, meancos2=np.nan)
    cos = st["n"][s] @ c
    w = 1.0 / (st["rve"][s] ** 2 + SIGMA0**2)
    den = np.sum(w * cos * cos)
    V = np.sum(w * st["rv"][s] * cos) / den if den > 0 else np.nan
    return dict(n=len(s), V=V, meancos2=float(np.mean(cos * cos)))


def wmean(st, sel, vals):
    w = 1.0 / st["plxe"][sel] ** 2
    return float(np.sum(w * vals) / np.sum(w))


def seed_density(st):
    x = np.stack([st["plx"] / 2.0, st["pmra"] / 20.0, st["pmdec"] / 20.0], 1)
    N = len(x)
    f = np.empty(N)
    chunk = 500
    for i in range(0, N, chunk):
        d2 = ((x[i : i + chunk, None, :] - x[None, :, :]) ** 2).sum(-1)
        f[i : i + chunk] = np.exp(-0.5 * d2).sum(1)
    best = int(np.argmax(f))
    c = x[best].copy()
    for _ in range(100):
        d2 = ((x - c) ** 2).sum(1)
        k = np.exp(-0.5 * d2)
        nc = (k[:, None] * x).sum(0) / k.sum()
        shift = np.linalg.norm(nc - c)
        c = nc
        if shift < 1e-6:
            break
    return np.nonzero(np.linalg.norm(x - c, axis=1) <= 2.0)[0]


def fibonacci(N):
    i = np.arange(N)
    z = 1 - (2 * i + 1) / N
    r = np.sqrt(1 - z * z)
    phi = i * math.pi * (3 - math.sqrt(5))
    return np.stack([r * np.cos(phi), r * np.sin(phi), z], 1)


def count_at(st, c, tol):
    bc = np.abs(st["b"] @ c)
    tc = st["t"] @ c
    # t . u = (t . c) / sin(theta); the sign is that of t . c (sin theta > 0)
    return np.nonzero((bc <= tol) & (tc > 0))[0]


def seed_cp(st):
    tol = math.sin(math.radians(1.5))
    grid = fibonacci(20000)
    counts = np.empty(len(grid), int)
    chunk = 2000
    for i in range(0, len(grid), chunk):
        g = grid[i : i + chunk]
        bc = np.abs(st["b"] @ g.T)
        tc = st["t"] @ g.T
        counts[i : i + chunk] = ((bc <= tol) & (tc > 0)).sum(0)
    c = grid[int(np.argmax(counts))]
    sel = count_at(st, c, tol)
    for _ in range(8):
        if len(sel) < 3:
            break
        c = fit_cp(st["b"][sel], st["t"][sel], st["n"][sel])
        nxt = count_at(st, c, tol)
        same = len(nxt) == len(sel) and np.all(nxt == sel)
        sel = nxt
        if same:
            break
    return sel


def analyse(st, form):
    F = FORMS[form]
    N = len(st["n"])
    if N < MIN_MEMBERS:
        return dict(status="refused", reason="no-cluster")
    M = seed_cp(st) if F["seed"] == "cp" else seed_density(st)
    if len(M) < 5:
        return dict(status="refused", reason="no-cluster")
    converged = False
    steps = 0
    for steps in range(MAX_ITER):
        c = fit_cp(st["b"][M], st["t"][M], st["n"][M])
        gm = geometry(st, c, M)
        sigma_off = max(OFF_FLOOR, mad_sigma(gm["off"])[0])
        sp = fit_speed(st, M, c)
        v_def = sp["n"] >= MIN_RV and sp["meancos2"] >= MIN_COS2 and sp["V"] > 0
        V = sp["V"] if v_def else np.nan
        med_plx = np.median(st["plx"][M])
        q_on = v_def or F["q_always"]
        Vq = V if v_def else 1.0
        med_lnq = np.nan
        sigma_q = np.nan
        if q_on:
            pi_m = star_plx(gm["mu_par"], gm["sin"], Vq)
            lq = np.log(pi_m / st["plx"][M])
            lq = lq[np.isfinite(lq)]
            if len(lq):
                s_, m_ = mad_sigma(lq)
                med_lnq = m_
                sigma_q = max(Q_FLOOR, s_)
        g = geometry(st, c)
        keep = g["tu"] > 0
        keep &= np.abs(g["off"]) <= min(NSIG * sigma_off, OFF_CAP)
        keep &= np.abs(st["plx"] / med_plx - 1) <= WINDOW
        if v_def:
            r = st["rv"] - V * g["cos"]
            lim = NSIG * np.sqrt(st["rve"] ** 2 + SIGMA0**2)
            with np.errstate(invalid="ignore"):
                bad = st["hasrv"] & (np.abs(r) > lim)
            keep &= ~bad
        if q_on and np.isfinite(med_lnq):
            pi_all = star_plx(g["mu_par"], g["sin"], Vq)
            with np.errstate(invalid="ignore", divide="ignore"):
                dev = np.abs(np.log(pi_all / st["plx"]) - med_lnq)
            lim_q = min(NSIG * sigma_q, Q_CAP)
            bad = (g["sin"] >= MIN_SIN) & np.isfinite(pi_all) & (dev > lim_q)
            keep &= ~bad
        nxt = np.nonzero(keep)[0]
        if len(nxt) < 5:
            return dict(status="refused", reason="no-cluster", steps=steps + 1)
        if len(nxt) == len(M) and np.all(nxt == M):
            converged = True
            break
        M = nxt
    if not converged:
        return dict(status="refused", reason="no-convergence", steps=steps)
    return finish(st, M, steps)


def finish(st, M, steps):
    c = fit_cp(st["b"][M], st["t"][M], st["n"][M])
    gm = geometry(st, c, M)
    sigma_off = max(OFF_FLOOR, mad_sigma(gm["off"])[0])
    base = dict(
        members=[int(st["index"][i]) for i in M], n_members=int(len(M)), steps=steps,
        cp=[float(x) for x in c], sigma_off=float(sigma_off),
    )
    sp = fit_speed(st, M, c)
    rv_scatter = np.nan
    if sp["n"] >= 1 and sp["V"] > 0:
        s = M[st["hasrv"][M]]
        res = st["rv"][s] - sp["V"] * (st["n"][s] @ c)
        rv_scatter = mad_sigma(res)[0]
    base["rv_members"] = int(sp["n"])
    if len(M) < MIN_MEMBERS or sigma_off > MAX_OFF_SIGMA or (np.isfinite(rv_scatter) and rv_scatter > MAX_RV_SCATTER):
        return dict(status="refused", reason="no-cluster", **base)
    if sp["n"] < MIN_RV:
        return dict(status="cp-only", reason="no-rv", **base)
    if sp["meancos2"] < MIN_COS2:
        return dict(status="cp-only", reason="perpendicular", **base)
    if not (sp["V"] > 0):
        return dict(status="cp-only", reason="sign", **base)
    V = float(sp["V"])
    pis = star_plx(gm["mu_par"], gm["sin"], V)
    use = np.isfinite(pis)
    if use.sum() < 5:
        return dict(status="cp-only", reason="no-rv", **base)
    sel = M[use]
    pi_mc = wmean(st, sel, pis[use])
    return dict(
        status="ok", reason=None, V=V, pi_mc=pi_mc, n_used=int(use.sum()),
        per_star=[[int(st["index"][i]), float(v)] for i, v in zip(sel, pis[use])], **base,
    )


def bootstrap(st, members_local, B, rng):
    M = np.asarray(members_local)
    n = len(M)
    reps = []
    disc = 0
    for _ in range(B):
        pick = M[rng.integers(0, n, n)]
        c = fit_cp(st["b"][pick], st["t"][pick], st["n"][pick])
        sp = fit_speed(st, pick, c)
        if not (sp["V"] > 0):
            disc += 1
            continue
        g = geometry(st, c, pick)
        pis = star_plx(g["mu_par"], g["sin"], sp["V"])
        use = np.isfinite(pis)
        if use.sum() < 5:
            disc += 1
            continue
        reps.append(wmean(st, pick[use], pis[use]))
    reps = np.sort(np.array(reps))
    lo, hi = np.percentile(reps, [15.865, 84.135])
    return dict(sigma=float(0.5 * (hi - lo)), discarded=disc, replicates=int(len(reps)))


def run_case(rows, mask=None, B=4000, seed=234004, baseline=True):
    out = {"forms": {}}
    for form in FORMS:
        st = prepare(rows, mask=mask)
        res = analyse(st, form)
        rec = {k: res.get(k) for k in ("status", "reason", "steps", "members", "cp", "V", "pi_mc", "n_used", "per_star", "n_members", "rv_members", "sigma_off")}
        rec["piMC"] = rec.pop("pi_mc")
        rec["perStar"] = rec.pop("per_star")
        rec["members"] = rec["members"] or []
        if res["status"] == "ok" and baseline:
            local = np.array([int(np.nonzero(st["index"] == m)[0][0]) for m in res["members"]])
            rng = np.random.default_rng(seed)
            rec["sigmaMC"] = bootstrap(st, local, B, rng)["sigma"]
        out["forms"][form] = rec
        out["astropy_max_diff"] = st["astropy_max_diff"]
    return out


def read_csv(path):
    import csv
    rows = []
    with open(path, newline="") as fh:
        for r in csv.DictReader(fh):
            def f(k):
                v = r[k]
                return None if v == "" else float(v)
            rows.append(dict(
                id=r["source_id"], ra=f("ra"), dec=f("dec"), parallax=f("parallax"), parallaxError=f("parallax_error"),
                pmra=f("pmra"), pmdec=f("pmdec"), rv=f("radial_velocity"), rvError=f("radial_velocity_error"),
                ruwe=f("ruwe"), params=int(r["astrometric_params_solved"]),
            ))
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--synthetic")
    ap.add_argument("--csv")
    ap.add_argument("--mask")
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    result = {
        "format": "gravitas.moving-cluster-oracle/1",
        "versions": {"python": sys.version.split()[0], "numpy": np.__version__, "scipy": scipy.__version__, "astropy": astropy.__version__},
        "bootstrap": {"B": 4000, "generator": "numpy.random.default_rng(234004)"},
    }
    if a.synthetic:
        raw = open(a.synthetic, "rb").read()
        data = json.loads(raw)
        result["synthetic"] = {"sha256": hashlib.sha256(raw).hexdigest(), "thresholdsSha256": data["thresholdsSha256"]}
        cases = []
        for c in data["cases"]:
            r = run_case(c["rows"], baseline=c["baseline"])
            cases.append({"id": c["id"], "forms": r["forms"], "astropyMaxDiff": r["astropy_max_diff"]})
        result["cases"] = cases
    if a.csv:
        raw = open(a.csv, "rb").read()
        rows = read_csv(a.csv)
        maskraw = open(a.mask, "rb").read()
        zp = json.loads(maskraw)["zeroPoints"]
        mask = np.array([z is not None for z in zp])
        # the oracle applies the contract's cuts itself; the production mask may only add the
        # rows whose zero point could not be computed
        cuts = np.array([(r["params"] in (31, 95)) and r["ruwe"] < 1.4 for r in rows])
        extra = int((cuts & ~mask).sum())
        sub = (mask & ~cuts).sum()
        r = run_case(rows, mask=cuts & mask, baseline=True)
        result["real"] = {
            "sha256": hashlib.sha256(raw).hexdigest(), "maskSha256": hashlib.sha256(maskraw).hexdigest(),
            "rowsDroppedOnlyByZeroPointMask": extra, "maskRowsOutsideCuts": int(sub),
            "forms": r["forms"], "astropyMaxDiff": r["astropy_max_diff"],
        }
    json.dump(result, open(a.out, "w"))
    print("wrote", a.out)


if __name__ == "__main__":
    main()
