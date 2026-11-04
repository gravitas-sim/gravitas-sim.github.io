#!/usr/bin/env python3
"""Independent reference for the galactic kinematics kernel (Prompt 235).

Run offline, never by a test:

    python3 tools/kinematics-oracle/oracle.py            # writes tests/fixtures/kinematics/oracle-results.json

It reads tests/fixtures/kinematics/oracle-inputs.json (written by
`node tools/kinematics-validate.mjs --write-oracle-inputs`: pinned synthetic samples with their
truth manifests, no real data) and computes, with code that shares nothing with js/:

  * the Oort fit: astropy's ICRS to Galactic proper motions (SkyCoord) and numpy.linalg.lstsq on the
    weighted design matrix, in the planar form motion.js uses and in the latitude-corrected form (AM1);
  * the dispersion of a velocity sample with per-star errors and an exclusion window: scipy.optimize
    maximum likelihood (Nelder-Mead, tight tolerances) and a sandwich covariance from central
    differences with its own step sizes;
  * the asymmetric-drift line: astropy's Galactic space velocities (U, V, W) from the astrometry and
    a numpy weighted straight line with the normal-equation covariance.

The oracle is a cited independent routine in the sense of the roadmap: numpy (linalg.lstsq), scipy
(optimize.minimize, stats.norm) and astropy (coordinates), versions recorded in the output.
"""
import json
import pathlib
import sys

import numpy as np
import scipy
import scipy.optimize
import scipy.stats
import astropy
import astropy.units as u
from astropy.coordinates import SkyCoord

ROOT = pathlib.Path(__file__).resolve().parents[2]
DIR = ROOT / "tests" / "fixtures" / "kinematics"
K = 4.740470446  # km/s per (mas/yr kpc), the IAU value the kernel states; the only constant shared


def oort(rows, max_distance, planar):
    ra = np.array([r["ra"] for r in rows])
    dec = np.array([r["dec"] for r in rows])
    plx = np.array([r["parallax"] for r in rows])
    pmra = np.array([r["pmRa"] for r in rows])
    pmdec = np.array([r["pmDec"] for r in rows])
    keep = (plx > 0) & (1.0 / np.where(plx > 0, plx, 1.0) <= max_distance)
    c = SkyCoord(
        ra=ra[keep] * u.deg,
        dec=dec[keep] * u.deg,
        pm_ra_cosdec=pmra[keep] * u.mas / u.yr,
        pm_dec=pmdec[keep] * u.mas / u.yr,
        frame="icrs",
    ).galactic
    l = c.l.rad
    b = c.b.rad
    y = K * c.pm_l_cosb.to_value(u.mas / u.yr)
    p = plx[keep]
    cb = np.ones_like(b) if planar else np.cos(b)
    X = np.column_stack([cb * np.cos(2 * l), cb, p * np.sin(l), -p * np.cos(l)])
    w = 1.0 / p**2
    sw = np.sqrt(w)
    beta, *_ = np.linalg.lstsq(X * sw[:, None], y * sw, rcond=None)
    res = y - X @ beta
    n = len(y)
    scale = np.sum(w * res**2) / (n - 4)
    cov = np.linalg.inv((X * w[:, None]).T @ X) * scale
    return {
        "n": int(n),
        "A": float(beta[0]),
        "B": float(beta[1]),
        "solarU": float(beta[2]),
        "solarV": float(beta[3]),
        "errA": float(np.sqrt(cov[0, 0])),
        "errB": float(np.sqrt(cov[1, 1])),
    }


def star_ll(mu, var, v, e, windowed, window):
    s2 = var + e**2
    ll = scipy.stats.norm.logpdf(v, loc=mu, scale=np.sqrt(s2))
    if window is not None:
        s = np.sqrt(s2)
        p = scipy.stats.norm.cdf((window[1] - mu) / s) - scipy.stats.norm.cdf((window[0] - mu) / s)
        ll = ll - np.where(windowed, np.log(np.maximum(1.0 - p, 1e-300)), 0.0)
    return ll


def dispersion(stars, window):
    v = np.array([s["v"] for s in stars])
    e = np.array([s["e"] for s in stars])
    windowed = np.array([bool(s["windowed"]) for s in stars])

    def nll(x):
        mu, var = x
        if var < 0:
            return 1e30
        return -np.sum(star_ll(mu, var, v, e, windowed, window))

    x0 = [float(np.mean(v)), float(max(np.var(v, ddof=1) - np.mean(e**2), 1.0))]
    r = scipy.optimize.minimize(
        nll, x0, method="Nelder-Mead", options={"xatol": 1e-11, "fatol": 1e-13, "maxiter": 20000, "maxfev": 40000}
    )
    mu, var = r.x
    # Observed information by central differences with its own steps.
    hm = 2e-3 * np.sqrt(var + 1.0)
    hv = 2e-3 * (var + 1.0)

    def hess():
        f = lambda a, b: -nll([a, b])  # log-likelihood
        f0 = f(mu, var)
        aa = (f(mu + hm, var) - 2 * f0 + f(mu - hm, var)) / hm**2
        bb = (f(mu, var + hv) - 2 * f0 + f(mu, var - hv)) / hv**2
        ab = (f(mu + hm, var + hv) - f(mu + hm, var - hv) - f(mu - hm, var + hv) + f(mu - hm, var - hv)) / (4 * hm * hv)
        return np.array([[aa, ab], [ab, bb]])

    info = -hess()
    # Per-star scores.
    g1 = (star_ll(mu + hm, var, v, e, windowed, window) - star_ll(mu - hm, var, v, e, windowed, window)) / (2 * hm)
    g2 = (star_ll(mu, var + hv, v, e, windowed, window) - star_ll(mu, var - hv, v, e, windowed, window)) / (2 * hv)
    g = np.column_stack([g1, g2])
    B = g.T @ g
    ia = np.linalg.inv(info)
    cov = ia @ B @ ia
    sigma = float(np.sqrt(var))
    return {
        "n": int(len(v)),
        "mean": float(mu),
        "sigma": sigma,
        "sigmaErr": float(np.sqrt(cov[1, 1]) / (2 * sigma)),
        "meanErr": float(np.sqrt(cov[0, 0])),
    }


def drift(groups):
    pts = []
    for rows in groups:
        ra = np.array([r["ra"] for r in rows])
        dec = np.array([r["dec"] for r in rows])
        plx = np.array([r["parallax"] for r in rows])
        c = SkyCoord(
            ra=ra * u.deg,
            dec=dec * u.deg,
            distance=(1.0 / plx) * u.kpc,
            pm_ra_cosdec=np.array([r["pmRa"] for r in rows]) * u.mas / u.yr,
            pm_dec=np.array([r["pmDec"] for r in rows]) * u.mas / u.yr,
            radial_velocity=np.array([r["rv"] for r in rows]) * u.km / u.s,
            frame="icrs",
        ).galactic
        vel = c.velocity  # Cartesian differential in the Galactic frame: d_x = U, d_y = V, d_z = W
        U = vel.d_x.to_value(u.km / u.s)
        V = vel.d_y.to_value(u.km / u.s)
        n = len(U)
        s2 = float(np.var(U, ddof=1))
        # variance of the sample variance from the fourth central moment (numpy, no Gaussian assumption)
        m4 = float(np.mean((U - U.mean()) ** 4))
        varx = max((m4 - (n - 3) / (n - 1) * s2**2) / n, 0.0)
        pts.append((n, s2, float(np.mean(V)), float(np.sqrt(np.var(V, ddof=1) / n)), varx))
    x = np.array([p[1] for p in pts])
    y = np.array([p[2] for p in pts])
    err = np.array([p[3] for p in pts])
    varx = np.array([p[4] for p in pts])

    def line(slope0):
        w = 1.0 / (err**2 + slope0**2 * varx)
        X = np.column_stack([np.ones_like(x), x])
        cov = np.linalg.inv((X * w[:, None]).T @ X)
        beta = cov @ ((X * w[:, None]).T @ y)
        return beta, cov

    beta, cov = line(0.0)
    out = {
        "committed": {
            "intercept": float(beta[0]),
            "slope": float(beta[1]),
            "interceptErr": float(np.sqrt(cov[0, 0])),
            "slopeErr": float(np.sqrt(cov[1, 1])),
        }
    }
    slope = beta[1]
    for _ in range(200):
        beta, cov = line(slope)
        if abs(beta[1] - slope) <= 1e-13 * abs(slope):
            slope = beta[1]
            break
        slope = beta[1]
    beta, cov = line(slope)
    out["am2"] = {
        "intercept": float(beta[0]),
        "slope": float(beta[1]),
        "interceptErr": float(np.sqrt(cov[0, 0])),
        "slopeErr": float(np.sqrt(cov[1, 1])),
    }
    out["groups"] = [{"n": p[0], "sigmaU2": p[1], "meanV": p[2], "err": p[3], "varX": p[4]} for p in pts]
    return out


def main():
    inputs = json.loads((DIR / "oracle-inputs.json").read_text())
    out = {
        "format": "gravitas.kinematics-oracle-results/1",
        "tool": "tools/kinematics-oracle/oracle.py",
        "versions": {
            "python": sys.version.split()[0],
            "numpy": np.__version__,
            "scipy": scipy.__version__,
            "astropy": astropy.__version__,
        },
        "inputsSha256": inputs.get("sha256"),
        "oort": {
            "planar": oort(inputs["oort"]["rows"], inputs["oort"]["maxDistance"], True),
            "cosb": oort(inputs["oort"]["rows"], inputs["oort"]["maxDistance"], False),
        },
        "dispersion": [
            dispersion(b["stars"], inputs["dispersion"]["window"]) for b in inputs["dispersion"]["bins"]
        ],
        "drift": drift(inputs["drift"]["groups"]),
    }
    (DIR / "oracle-results.json").write_text(json.dumps(out, indent=1) + "\n")
    print("wrote", DIR / "oracle-results.json")


if __name__ == "__main__":
    main()
