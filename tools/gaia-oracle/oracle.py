#!/usr/bin/env python3
"""Independent oracle for Prompt 233's distance likelihood and posterior (leg B1).

Run offline by the coordinator, never by a test:

    python3 tools/gaia-oracle/oracle.py tests/fixtures/gaia-workflows/thresholds.json \
        tests/fixtures/gaia-workflows/oracle-results.json

Written from the equations in GAIA_WORKFLOWS.md with numpy and scipy only, and
sharing no code with js/kernels/galactic/astrometry.js. What is independent is
the arithmetic (scipy adaptive quadrature in place of a grid trapezoid, Brent
root finding on a likelihood drop and on a cumulative integral, a bounded
scalar minimiser for modes), not the idea of the model: the likelihood in 1/r
and the three priors are the ones the document states.
"""
import json
import sys

import numpy as np
import scipy
from scipy import integrate, optimize, stats

LEVEL = 0.6827
R_MIN = 0.001
R_MAX = 100.0


def case_results(case, grid):
    p, sp = case["p"], case["s"]
    z, sz = case["z"], case["sz"]
    w = p - z
    s = float(np.hypot(sp, sz))
    k = float(stats.norm.ppf((1 + LEVEL) / 2))

    def lnl(r):
        return -0.5 * ((w - 1.0 / r) / s) ** 2

    out = {"id": case["id"], "w": w, "s": s}
    prior = case["prior"]
    if prior == "none":
        lo_r, hi_r = 1e-4, 1e6
        res = optimize.minimize_scalar(
            lambda x: -lnl(np.exp(x)),
            bounds=(np.log(lo_r), np.log(hi_r)),
            method="bounded",
            options={"xatol": 1e-13},
        )
        rmax = float(np.exp(res.x))
        out["point"] = rmax
        top = lnl(rmax)
        target = top - 0.5 * k * k
        f = lambda x: lnl(np.exp(x)) - target
        lower = float(np.exp(optimize.brentq(f, np.log(1e-4), np.log(rmax), xtol=1e-14)))
        out["intervalLo"] = lower
        if f(np.log(1e9)) >= 0:
            out["intervalHi"] = None
        else:
            out["intervalHi"] = float(np.exp(optimize.brentq(f, np.log(rmax), np.log(1e9), xtol=1e-14)))
        return out

    if "edsd" in prior:
        L = prior["edsd"]["L"]
        lp = lambda r: lnl(r) + 2 * np.log(r) - r / L
        hi = grid["rMax"]
    else:
        rm = prior["uniformDensity"]["rMax"]
        lp = lambda r: lnl(r) + 2 * np.log(r)
        hi = min(rm, grid["rMax"])
    lo = grid["rMin"]
    xs = np.exp(np.linspace(np.log(lo), np.log(hi), 200001))
    vals = np.array([lp(x) for x in xs])
    j = int(np.argmax(vals))
    a, b = xs[max(j - 1, 0)], xs[min(j + 1, len(xs) - 1)]
    mode = optimize.minimize_scalar(lambda r: -lp(r), bounds=(a, b), method="bounded", options={"xatol": 1e-14}).x
    top = lp(mode)
    dens = lambda r: float(np.exp(lp(r) - top))
    pts = sorted({float(x) for x in [mode * f for f in (0.5, 0.8, 0.9, 1.0, 1.1, 1.25, 2.0)] if lo < x < hi})
    # Break the range at the mode's neighbourhood; each piece is integrated adaptively.
    edges = [lo] + pts + [hi]
    pieces = []
    total = 0.0
    for e0, e1 in zip(edges[:-1], edges[1:]):
        val, _ = integrate.quad(dens, e0, e1, limit=500, epsabs=0, epsrel=1e-12)
        pieces.append((e0, e1, val))
        total += val

    def cdf(r):
        acc = 0.0
        for e0, e1, val in pieces:
            if r >= e1:
                acc += val
            elif r > e0:
                part, _ = integrate.quad(dens, e0, r, limit=500, epsabs=0, epsrel=1e-12)
                acc += part
                break
            else:
                break
        return acc / total

    def quantile(q):
        return float(optimize.brentq(lambda r: cdf(r) - q, lo, hi, xtol=1e-14, rtol=1e-14))

    out["mode"] = float(mode)
    out["q16"] = quantile((1 - LEVEL) / 2)
    out["q50"] = quantile(0.5)
    out["q84"] = quantile((1 + LEVEL) / 2)
    return out


def main():
    thr = json.load(open(sys.argv[1]))
    chk = next(c for c in thr["checks"] if c["id"] == "B1.oracleTenStars")["limits"]
    results = [case_results(c, chk["grid"]) for c in chk["cases"]]
    json.dump(
        {
            "format": "gravitas.gaia-workflows-oracle/1",
            "level": LEVEL,
            "run": "Python %s, numpy %s, scipy %s" % (sys.version.split()[0], np.__version__, scipy.__version__),
            "cases": results,
        },
        open(sys.argv[2], "w"),
        indent=2,
    )
    open(sys.argv[2], "a").write("\n")


if __name__ == "__main__":
    main()
