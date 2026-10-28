#!/usr/bin/env python3
"""The independent oracle for the small-body kernel (Prompt 198).

No Gravitas code. numpy, scipy and astropy only. It reads the committed
thresholds (rules, gaps) and writes two files beside the thresholds:

  oracle-inputs.json   the inputs it drew (pinned: the kernel reads them as data)
  oracle-results.json  what it computed from them

  python3 tools/small-bodies-oracle/oracle.py            write both
  python3 tools/small-bodies-oracle/oracle.py --check    recompute, compare to the
                                                         committed results

b1  resonance axes from period ratios (Kepler III)
b2  projected area of a triaxial ellipsoid by a SURFACE INTEGRAL of
    max(0, (r_u x r_v) . s) du dv on a 2000 x 4000 midpoint grid of the
    ellipsoid's own parametrisation (not the closed form)
b3  Lomb-Scargle peaks of pinned series by astropy (fit_mean=True), a 2e5-point
    frequency grid refined by a parabola
b4  the log-polynomial Poisson baseline by scipy.optimize.minimize of the negative
    log-likelihood, and the depletion of each window, on three pinned synthetic
    catalogs drawn here by numpy

It is an independent implementation of the same estimator on the same synthetic
catalogs. It is NOT a cited analysis of a real catalog cut (tier e1, NOT RUN).
"""
import json
import sys
from pathlib import Path

import types

import numpy as np

# astropy.table imports PyYAML for ECSV input and output, which this script never
# touches; PyYAML is not installed here and nothing may be downloaded, so a stub
# module stands in for the import only.
if "yaml" not in sys.modules:
    try:
        import yaml  # noqa: F401
    except ImportError:
        sys.modules["yaml"] = types.ModuleType("yaml")

from astropy.timeseries import LombScargle
from scipy import integrate, optimize

HERE = Path(__file__).resolve().parent
FIX = HERE.parent.parent / "tests" / "fixtures" / "small-bodies"
TH = json.loads((FIX / "thresholds.json").read_text())
R = TH["rules"]
RNG = np.random.default_rng(198)


def axis(a_planet, inner, outer, body):
    ratio = outer / inner if body == "inner" else inner / outer
    return a_planet * ratio ** (2.0 / 3.0)


# ---- b1 -------------------------------------------------------------------------
JUP = [("4:1", 4, 1), ("3:1", 3, 1), ("5:2", 5, 2), ("7:3", 7, 3), ("2:1", 2, 1), ("3:2", 3, 2), ("1:1", 1, 1)]
NEP = [("3:2", 3, 2), ("5:3", 5, 3), ("7:4", 7, 4), ("2:1", 2, 1)]


def b1():
    return {
        "jupiter": {k: axis(R["planets"]["jupiterAu"], i, o, "inner") for k, i, o in JUP},
        "neptune": {k: axis(R["planets"]["neptuneAu"], i, o, "outer") for k, i, o in NEP},
    }


# ---- b2 -------------------------------------------------------------------------
def surface_area(a, b, c, theta_deg, phi_deg, nu=2000, nv=4000, chunk=250):
    th = np.radians(theta_deg)
    ph = np.radians(phi_deg)
    s = np.array([np.sin(th) * np.cos(ph), np.sin(th) * np.sin(ph), np.cos(th)])
    du = np.pi / nu
    dv = 2 * np.pi / nv
    v = (np.arange(nv) + 0.5) * dv
    total = 0.0
    for start in range(0, nu, chunk):
        u = (np.arange(start, min(nu, start + chunk)) + 0.5) * du
        U, V = np.meshgrid(u, v, indexing="ij")
        # r(u, v) = (a sin u cos v, b sin u sin v, c cos u)
        ru = np.stack([a * np.cos(U) * np.cos(V), b * np.cos(U) * np.sin(V), -c * np.sin(U)], -1)
        rv = np.stack([-a * np.sin(U) * np.sin(V), b * np.sin(U) * np.cos(V), np.zeros_like(U)], -1)
        n = np.cross(ru, rv)  # outward for u in (0, pi)
        # the projected (visible) area is the integral of max(0, n . s) du dv
        dot = n @ s
        total += np.maximum(dot, 0.0).sum() * du * dv
    return total


def b2_inputs(count=40):
    rows = []
    for _ in range(count):
        a = float(RNG.uniform(1.1, 2.5))
        b = float(RNG.uniform(1.0, a))
        c = float(RNG.uniform(0.6, b))
        rows.append(
            {
                "a": round(a, 6),
                "b": round(b, 6),
                "c": round(c, 6),
                "thetaDeg": round(float(RNG.uniform(0, 90)), 6),
                "phiDeg": round(float(RNG.uniform(0, 360)), 6),
            }
        )
    return rows


def b2(rows):
    return [surface_area(r["a"], r["b"], r["c"], r["thetaDeg"], r["phiDeg"]) for r in rows]


# ---- b3 -------------------------------------------------------------------------
def closed_area(a, b, c, theta_deg, phi_deg):
    th, ph = np.radians(theta_deg), np.radians(phi_deg)
    nx, ny, nz = np.sin(th) * np.cos(ph), np.sin(th) * np.sin(ph), np.cos(th)
    return np.pi * np.sqrt(b * b * c * c * nx * nx + a * a * c * c * ny * ny + a * a * b * b * nz * nz)


def b3_inputs():
    specs = [
        (3.1, 0.01, 4, 6, (1.7, 1.0, 0.8), 70),
        (5.4, 0.03, 5, 7, (1.5, 1.0, 0.9), 55),
        (8.8, 0.01, 5, 7, (2.0, 1.0, 0.7), 80),
        (14.0, 0.03, 6, 8, (1.4, 1.0, 0.8), 65),
        (21.5, 0.01, 6, 8, (1.8, 1.0, 0.9), 75),
        (37.0, 0.03, 6, 8, (1.6, 1.0, 0.8), 60),
    ]
    out = []
    for P, noise, nights, hours, (a, b, c), theta in specs:
        n_per = int(RNG.integers(30, 41))
        t = []
        for k in range(nights):
            t.extend(k + np.sort(RNG.uniform(0, hours / 24.0, n_per)))
        t = np.array(t)
        phase0 = float(RNG.uniform(0, 360))
        ph = phase0 + 360.0 * 24.0 * (t - t[0]) / P
        m = -2.5 * np.log10(closed_area(a, b, c, theta, ph) / (np.pi * a * b)) + noise * RNG.standard_normal(len(t))
        out.append(
            {
                "periodHours": P,
                "noiseMag": noise,
                "t": [round(float(x), 7) for x in t],
                "m": [round(float(x), 6) for x in m],
            }
        )
    return out


def b3(series):
    res = []
    lo_p, hi_p = R["lightcurve"]["periodMinHours"] / 2 / 24, R["lightcurve"]["periodMaxHours"] / 2 / 24
    f = np.linspace(1 / hi_p, 1 / lo_p, 200000)
    for s in series:
        t = np.array(s["t"])
        m = np.array(s["m"])
        pw = LombScargle(t, m, fit_mean=True).power(f, method="fast")
        k = int(np.argmax(pw))
        k0 = max(1, min(len(f) - 2, k))
        y0, y1, y2 = pw[k0 - 1], pw[k0], pw[k0 + 1]
        denom = y0 - 2 * y1 + y2
        shift = 0.5 * (y0 - y2) / denom if denom != 0 else 0.0
        fpeak = f[k0] + shift * (f[1] - f[0])
        res.append({"peakFrequencyPerDay": float(fpeak), "peakPeriodHours": float(24 / fpeak), "rotationPeriodHours": float(2 * 24 / fpeak)})
    return res


# ---- b4 -------------------------------------------------------------------------
def pdf_components():
    return [(0.4, 2.4, 0.2), (0.6, 2.95, 0.3)]


def thin(a, gaps):
    d = np.zeros_like(a)
    for g in gaps:
        d += g["dmax"] * np.maximum(0, 1 - np.abs(a - g["centerAu"]) / g["halfWidthAu"])
    return d


def draw_catalog(n0, gaps):
    lo, hi = 1.9, 3.6
    comp = RNG.random(n0 * 2) < 0.4
    a = np.where(comp, RNG.normal(2.4, 0.2, n0 * 2), RNG.normal(2.95, 0.3, n0 * 2))
    a = a[(a >= lo) & (a < hi)][:n0]
    keep = RNG.random(len(a)) >= thin(a, gaps)
    return a[keep]


def b4_inputs():
    gaps = [
        {"id": g["id"], "centerAu": axis(R["planets"]["jupiterAu"], g["inner"], g["outer"], "inner"), "halfWidthAu": g["halfWidthAu"], "dmax": g["dmax"]}
        for g in R["gaps"]
    ]
    cats = []
    for n0 in (8000, 3000, 800):
        a = draw_catalog(n0, gaps)
        cats.append({"n0": n0, "a": [round(float(x), 6) for x in a]})
    return {"gaps": gaps, "catalogs": cats}


def fit_baseline(a, gaps):
    lo, hi = R["fitRangeAu"]
    bw = R["binWidthAu"]
    nb = int(round((hi - lo) / bw))
    # Integer binning: the values carry at most six decimals, so (a - lo) in millionths
    # is an exact integer and a value on an edge is in the bin above it (floating
    # point edges lo + bw * k put 2.49 below 2.4900000000000002).
    k = (np.round((a - lo) * 1e6).astype(np.int64)) // int(round(bw * 1e6))
    counts = np.bincount(k[(k >= 0) & (k < nb)], minlength=nb)
    edges = lo + bw * np.arange(nb + 1)
    centers = 0.5 * (edges[:-1] + edges[1:])
    mid, half = 0.5 * (lo + hi), 0.5 * (hi - lo)
    keep = np.ones(nb, bool)
    for g in gaps:
        w = g["halfWidthAu"] + R["baselineMarginAu"]
        keep &= ~((centers >= g["centerAu"] - w) & (centers <= g["centerAu"] + w))
    x = (centers[keep] - mid) / half
    y = counts[keep].astype(float)
    deg = R["baselineDegree"]
    X = np.vander(x, deg + 1, increasing=True)

    def nll(c):
        eta = X @ c
        return float(np.sum(np.exp(eta) - y * eta))

    def grad(c):
        return X.T @ (np.exp(X @ c) - y)

    def hess(c):
        return X.T @ (np.exp(X @ c)[:, None] * X)

    c0 = np.linalg.lstsq(X, np.log(y + 0.5), rcond=None)[0]
    res = optimize.minimize(nll, c0, jac=grad, hess=hess, method="trust-exact", options={"gtol": 1e-9, "maxiter": 500})
    c = res.x
    for _ in range(5):  # Newton polish: the optimiser stops on an absolute gradient
        c = c - np.linalg.solve(hess(c), grad(c))
    # converged: the gradient of the log-likelihood is at rounding, relative to the counts
    return c, mid, half, bool(np.linalg.norm(grad(c)) < 1e-9 * max(1.0, y.sum()))


def b4(inp):
    out = []
    for cat in inp["catalogs"]:
        a = np.array(cat["a"])
        a = a[(a >= R["fitRangeAu"][0]) & (a < R["fitRangeAu"][1])]
        c, mid, half, ok = fit_baseline(a, inp["gaps"])
        bw = R["binWidthAu"]
        rows = []
        for g in inp["gaps"]:
            lo, hi = g["centerAu"] - g["halfWidthAu"], g["centerAu"] + g["halfWidthAu"]
            dens = lambda s: np.exp(np.polyval(c[::-1], (s - mid) / half)) / bw
            nexp = integrate.quad(dens, lo, hi, epsabs=1e-12, epsrel=1e-12)[0]
            nobs = int(np.sum((a >= lo) & (a < hi)))
            rows.append({"id": g["id"], "nObs": nobs, "nExp": float(nexp), "depletion": float(1 - nobs / nexp)})
        out.append({"n0": cat["n0"], "n": int(len(a)), "converged": ok, "gaps": rows})
    return out


def main():
    inputs = {
        "note": "Drawn by tools/small-bodies-oracle/oracle.py (numpy default_rng(198)); pinned, read by the kernel's validation as data.",
        "b2": b2_inputs(),
        "b3": b3_inputs(),
        "b4": b4_inputs(),
    }
    results = {
        "note": "Computed by tools/small-bodies-oracle/oracle.py from oracle-inputs.json with numpy %s, scipy %s, astropy; no Gravitas code." % (np.__version__, __import__("scipy").__version__),
        "versions": {"numpy": np.__version__, "scipy": __import__("scipy").__version__, "astropy": __import__("astropy").__version__},
        "b1": b1(),
        "b2": b2(inputs["b2"]),
        "b3": b3(inputs["b3"]),
        "b4": b4(inputs["b4"]),
    }
    if "--check" in sys.argv:
        old = json.loads((FIX / "oracle-results.json").read_text())
        ok = all(np.allclose(np.array(old["b2"]), np.array(results["b2"]), rtol=1e-9)) and old["b1"] == results["b1"]
        print("oracle check:", "ok" if ok else "DIFFERENT")
        return 0 if ok else 1
    (FIX / "oracle-inputs.json").write_text(json.dumps(inputs, separators=(",", ":")) + "\n")
    (FIX / "oracle-results.json").write_text(json.dumps(results, indent=1) + "\n")
    print("wrote", FIX)
    return 0


if __name__ == "__main__":
    sys.exit(main())
