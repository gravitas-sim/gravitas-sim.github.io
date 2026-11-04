"""Independent oracle for the rotation-curve decomposition kernel (Prompt 236).

Written from tests/fixtures/rotation-decomposition/thresholds.json alone ("relations"): no line of
js/kernels/galactic/decomposition.js, js/darkMatter.js or js/inference/fit.js was read to write
it. numpy and scipy only: the disk through scipy's exponentially scaled Bessel functions
(scipy.special.ive, kve), the fit through scipy.optimize.least_squares (trust-region reflective,
with bounds) from several starts, the covariance from a central-difference Jacobian taken here.

    python3.9 oracle.py oracle-inputs.json oracle-results.json
"""
import json
import sys

import numpy as np
from scipy.optimize import least_squares
from scipy.special import ive, kve

GM_SUN = 1.3271244e20
AU = 149597870700.0
PC = 648000.0 / np.pi * AU
KPC = 1000.0 * PC
G = GM_SUN / (KPC * 1e6)  # kpc (km/s)^2 per solar mass, from the definitions


def bulge(r, M, a):
    return np.sqrt(G * M * r) / (r + a)


def disk(r, M, Rd):
    y = r / (2.0 * Rd)
    g = y * y * (ive(0, y) * kve(0, y) - ive(1, y) * kve(1, y))
    return np.sqrt(2.0 * G * M / Rd * g)


def nfw(r, vs, rs):
    x = r / rs
    return vs * np.sqrt((np.log1p(x) - x / (1.0 + x)) / x)


def iso(r, vinf, rc):
    x = r / rc
    return vinf * np.sqrt(1.0 - np.arctan(x) / x)


def total(r, p, bm, ba):
    """p = (log10 Md, Rd, vs, log10 rs)."""
    b = bulge(r, bm, ba)
    d = disk(r, 10.0 ** p[0], p[1])
    h = nfw(r, p[2], 10.0 ** p[3])
    return np.sqrt(b * b + d * d + h * h)


def fit(data, bounds_lo, bounds_hi):
    r = np.array([q["r"] for q in data["points"]])
    v = np.array([q["v"] for q in data["points"]])
    e = np.array([q["err"] for q in data["points"]])
    bm, ba = data["bulge"]["mass"], data["bulge"]["scale"]

    def resid(p):
        return (total(r, p, bm, ba) - v) / e

    best = None
    lo = np.array(bounds_lo)
    hi = np.array(bounds_hi)
    for vs in (100.0, 250.0, 500.0, 800.0):
        for lrs in (0.5, 1.0, 1.5, 2.2):
            for lmd in (0.2, 0.5, 0.8):
                p0 = np.array([lo[0] + lmd * (hi[0] - lo[0]), 2.5, vs, lrs])
                res = least_squares(
                    resid,
                    p0,
                    bounds=(lo, hi),
                    method="trf",
                    x_scale="jac",
                    ftol=1e-14,
                    xtol=1e-14,
                    gtol=1e-14,
                    max_nfev=4000,
                )
                if best is None or res.cost < best.cost:
                    best = res
    p = best.x
    chi2 = 2.0 * best.cost
    # Central-difference Jacobian of the residuals, relative step 1e-6 of each parameter's range.
    J = np.zeros((len(r), 4))
    for j in range(4):
        h = 1e-6 * (hi[j] - lo[j])
        up, dn = p.copy(), p.copy()
        up[j] = min(hi[j], p[j] + h)
        dn[j] = max(lo[j], p[j] - h)
        J[:, j] = (resid(up) - resid(dn)) / (up[j] - dn[j])
    C = np.linalg.inv(J.T @ J)
    sig = {}
    for R in data["sigmaRadii"]:
        grad = np.zeros(4)
        for j in range(4):
            h = 1e-6 * (hi[j] - lo[j])
            up, dn = p.copy(), p.copy()
            up[j] = min(hi[j], p[j] + h)
            dn[j] = max(lo[j], p[j] - h)
            grad[j] = (
                total(np.array([R]), up, bm, ba)[0] - total(np.array([R]), dn, bm, ba)[0]
            ) / (up[j] - dn[j])
        sig[str(R)] = float(np.sqrt(grad @ C @ grad))
    return {
        "theta": p.tolist(),
        "chi2": float(chi2),
        "curve": total(r, p, bm, ba).tolist(),
        "sigmaTotal": sig,
        "nfev": int(best.nfev),
    }


def main(src, dst):
    inp = json.load(open(src))
    out = {"scipy": __import__("scipy").__version__, "numpy": np.__version__, "G": G}
    # B1: component speeds
    comps = []
    for s in inp["B1"]:
        r = np.array(s["r"])
        comps.append(
            {
                "bulge": bulge(r, s["bulgeMass"], s["bulgeScale"]).tolist(),
                "disk": disk(r, s["diskMass"], s["diskScale"]).tolist(),
                "nfw": nfw(r, s["nfwSpeed"], s["nfwScale"]).tolist(),
                "iso": iso(r, s["isoSpeed"], s["isoScale"]).tolist(),
            }
        )
    out["B1"] = comps
    # B2: the disk's shape function
    ys = np.logspace(-3.0, np.log10(500.0), 40)
    out["B2"] = {
        "y": ys.tolist(),
        "g": (ys * ys * (ive(0, ys) * kve(0, ys) - ive(1, ys) * kve(1, ys))).tolist(),
    }
    # B3 to B5: the fit
    out["fit"] = fit(inp["fit"], inp["fit"]["lo"], inp["fit"]["hi"])
    json.dump(out, open(dst, "w"), indent=1)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
