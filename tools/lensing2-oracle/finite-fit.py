#!/usr/bin/env python3
"""
The independent fit of gate leg G7 (Prompt 251 Part B): the 200 seeded synthetic finite-source events.

Reads tests/fixtures/lensing2/oracle-finite-inputs.json and oracle-results.json (for a self-check of its
own finite-source integral against the pinned scipy-quad values) and writes
tests/fixtures/lensing2/oracle-finite.json. It imports no Gravitas code: the magnification of a uniform
disc by Gauss-Legendre in polar angle about the lens (vectorised numpy; the closed radial integral),
the fit by scipy least_squares over (t0, ln u0, ln tE, ln rho) with the source and blend fluxes solved
linearly at each step, from 18 starts, the covariance from a finite-difference Jacobian of the full
six-parameter model at the solution.

Run:  /usr/local/bin/python3.9 tools/lensing2-oracle/finite-fit.py
"""
import json
import sys
from pathlib import Path

import numpy as np
import scipy
from scipy import optimize

ROOT = Path(__file__).resolve().parents[2]
DIR = ROOT / "tests" / "fixtures" / "lensing2"
INP = json.loads((DIR / "oracle-finite-inputs.json").read_text())
PIN = json.loads((DIR / "oracle-results.json").read_text())
XG, WG = np.polynomial.legendre.leggauss(96)
F = lambda r: r * np.sqrt(r * r + 4) / 2


def point_mag(u):
    return (u * u + 2) / (u * np.sqrt(u * u + 4))


def disc_mag(u, rho):
    u = np.atleast_1d(np.asarray(u, float))
    out = np.empty_like(u)
    far = u >= rho
    if far.any():
        uu = u[far][:, None]
        phim = np.arcsin(np.minimum(1.0, rho / uu))
        t = (np.pi / 4) * (XG[None, :] + 1)
        ph = phim * np.sin(t)
        root = np.sqrt(np.maximum(rho**2 - (uu * np.sin(ph)) ** 2, 0.0))
        f = (F(uu * np.cos(ph) + root) - F(uu * np.cos(ph) - root)) * phim * np.cos(t)
        out[far] = 2 * (f @ WG) * (np.pi / 4) / (np.pi * rho**2)
    near = ~far
    if near.any():
        uu = u[near][:, None]
        ph = (np.pi / 2) * (XG[None, :] + 1)
        f = F(uu * np.cos(ph) + np.sqrt(rho**2 - (uu * np.sin(ph)) ** 2))
        out[near] = 2 * (f @ WG) * (np.pi / 2) / (np.pi * rho**2)
    return out


# self-check against the pinned scipy-quad values of the P1 leg
worst = max(abs(disc_mag(o["u"], o["rho"])[0] / o["magnification"] - 1) for o in PIN["finite"])


def model_shape(p, x):
    t0, lu0, ltE, lrho = p
    u = np.hypot(np.exp(lu0), (x - t0) / np.exp(ltE))
    return disc_mag(u, np.exp(lrho))


def solve_linear(shape, y, s):
    A = np.stack([shape, np.ones_like(shape)], axis=1) / s[:, None]
    coef, *_ = np.linalg.lstsq(A, y / s, rcond=None)
    return coef


def resid(p, x, y, s):
    sh = model_shape(p, x)
    c = solve_linear(sh, y, s)
    return (y - c[0] * sh - c[1]) / s


def fit_event(ev):
    x, y, s = map(np.array, (ev["x"], ev["y"], ev["sigma"]))
    span = x.max() - x.min()
    t0s = x[np.argmax(y)]
    best = None
    lo = [x.min(), np.log(1e-3), np.log(0.05), np.log(1e-3)]
    hi = [x.max(), np.log(5.0), np.log(5000.0), np.log(3.0)]
    for tE in (span / 12, span / 5):
        for u0 in (0.1, 0.5, 1.0):
            for rho in (0.03, 0.1, 0.3):
                p0 = [t0s, np.log(u0), np.log(tE), np.log(rho)]
                try:
                    r = optimize.least_squares(resid, p0, args=(x, y, s), bounds=(lo, hi), xtol=1e-12, ftol=1e-12, gtol=1e-12, max_nfev=400)
                except Exception:
                    continue
                if best is None or r.cost < best.cost:
                    best = r
    p = best.x
    sh = model_shape(p, x)
    c = solve_linear(sh, y, s)
    full = np.array([p[0], np.exp(p[1]), np.exp(p[2]), np.exp(p[3]), c[0], c[1]])

    def model_full(q):
        pp = [q[0], np.log(q[1]), np.log(q[2]), np.log(q[3])]
        return (y - (q[4] * model_shape(pp, x) + q[5])) / s

    J = np.empty((len(x), 6))
    for k in range(6):
        h = 1e-6 * max(abs(full[k]), 1e-3)
        a, b = full.copy(), full.copy()
        a[k] += h
        b[k] -= h
        J[:, k] = (model_full(a) - model_full(b)) / (2 * h)
    try:
        cov = np.linalg.inv(J.T @ J)
        sig = float(np.sqrt(cov[3, 3])) if cov[3, 3] > 0 else None
    except np.linalg.LinAlgError:
        sig = None
    return {"id": ev["id"], "t0": float(full[0]), "u0": float(full[1]), "tE": float(full[2]), "rho": float(full[3]),
            "Fs": float(full[4]), "Fb": float(full[5]), "sigmaRho": sig, "chi2": float(2 * best.cost),
            "atRhoBound": bool(abs(p[3] - lo[3]) < 1e-6 or abs(p[3] - hi[3]) < 1e-6)}


out = {"format": "gravitas.lensing2-finite-oracle/1",
       "versions": {"python": sys.version.split()[0], "numpy": np.__version__, "scipy": scipy.__version__},
       "selfCheckWorstRelVsQuad": float(worst),
       "fits": [fit_event(ev) for ev in INP["events"]]}
(DIR / "oracle-finite.json").write_text(json.dumps(out) + "\n")
print("wrote oracle-finite.json; self-check", worst)
