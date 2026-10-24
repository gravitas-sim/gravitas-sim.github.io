"""
The independent oracle for Prompt 186 (astrometric time series), run offline,
never by Gravitas.

    python -I oracle.py inputs.json results.json

With numpy, scipy and astropy only, and no Gravitas code, it

  * evaluates the Earth's barycentric position with astropy.coordinates
    get_body_barycentric('earth') (the built-in ephemeris: ERFA epv00, nothing
    downloaded) on a 365-date grid and at every epoch of every case;
  * converts 40 UTC Julian dates to TT and TDB with astropy.time (ERFA, the
    leap-second table) and returns the offsets in seconds;
  * makes each case's series from the EXACT spherical geometry: the source at
    distance 1/parallax parsecs with a constant barycentric velocity tangent to
    the sky, the apparent direction the normalised vector from the Earth's
    barycentric position to the source, right ascension and declination from
    it, plus seeded Gaussian error per axis (numpy.random.default_rng);
    noise-free versions of the cases named in "noiseFree" are made too;
  * fits each noisy series by scipy.optimize.least_squares (method lm) on the
    exact spherical model with its own Earth, five parameters (position at the
    first epoch, proper motion, parallax), covariance from the Jacobian;
  * fits the tangent-plane offsets about the normalised mean direction by
    scipy.optimize.curve_fit with absolute sigmas, one straight line per axis.

It writes the series and every fit for the tests to compare. Run with `-I` from
a directory that holds no other Python, with the script kept apart from the data.
"""

import json
import sys

import numpy as np
from astropy.coordinates import get_body_barycentric
from astropy.time import Time
from scipy.optimize import curve_fit, least_squares

ARCSEC = np.pi / 648000.0
AU_PER_PC = 648000.0 / np.pi  # parsec in au
YEAR = 365.25


def unit(a, d):
    return np.array([np.cos(d) * np.cos(a), np.cos(d) * np.sin(a), np.sin(d)])


def basis(a, d):
    ea = np.array([-np.sin(a), np.cos(a), 0.0])
    ed = np.array([-np.cos(a) * np.sin(d), -np.sin(a) * np.sin(d), np.cos(d)])
    return ea, ed


def earth(jd):
    t = Time(np.atleast_1d(jd), format="jd", scale="tdb")
    return get_body_barycentric("earth", t).xyz.to_value("au").T  # (n, 3)


def epochs_of(spec):
    n = spec["n"]
    if spec["kind"] == "even":
        return spec["startJd"] + spec["spanDays"] * np.arange(n) / (n - 1)
    rng = np.random.default_rng(spec["seed"])
    inner = np.sort(rng.uniform(0, spec["spanDays"], n - 2))
    return spec["startJd"] + np.concatenate([[0.0], inner, [spec["spanDays"]]])


def model_radec(theta, jd, e_au):
    """The exact apparent right ascension and declination (radians) of the source."""
    a0, d0, mua, mud, plx = theta  # radians, radians, arcsec/yr (a*), arcsec/yr, arcsec
    p0 = unit(a0, d0)
    ea, ed = basis(a0, d0)
    m = (mua * ARCSEC) * ea + (mud * ARCSEC) * ed
    dist = AU_PER_PC / plx
    t_yr = (jd - jd[0]) / YEAR
    x = dist * (p0[None, :] + m[None, :] * t_yr[:, None])
    u = x - e_au
    u /= np.linalg.norm(u, axis=1)[:, None]
    return np.arctan2(u[:, 1], u[:, 0]) % (2 * np.pi), np.arcsin(u[:, 2])


def series(case, jd, e_au, noisy):
    theta = [
        np.radians(case["ra"]),
        np.radians(case["dec"]),
        case["mu"][0],
        case["mu"][1],
        case["parallax"],
    ]
    ra, dec = model_radec(theta, jd, e_au)
    if noisy:
        rng = np.random.default_rng(case["noiseSeed"])
        na = rng.normal(0.0, case["sigma"], len(jd))
        nd = rng.normal(0.0, case["sigma"], len(jd))
        ra = ra + na * ARCSEC / np.cos(dec)
        dec = dec + nd * ARCSEC
    return np.degrees(ra) % 360.0, np.degrees(dec)


def tangent(ra, dec, ra_deg, dec_deg):
    """Standard coordinates (arcsec) about the normalised mean direction."""
    u = np.array([unit(np.radians(a), np.radians(d)) for a, d in zip(ra_deg, dec_deg)])
    m = u.mean(axis=0)
    m /= np.linalg.norm(m)
    a0 = np.arctan2(m[1], m[0])
    d0 = np.arcsin(m[2])
    ea, ed = basis(a0, d0)
    c = u @ m
    return (u @ ea) / c / ARCSEC, (u @ ed) / c / ARCSEC, np.degrees(a0), np.degrees(d0)


def spherical_fit(case, jd, e_au, ra_deg, dec_deg):
    sig = case["sigma"]
    truth = [
        np.radians(case["ra"]),
        np.radians(case["dec"]),
        case["mu"][0],
        case["mu"][1],
        case["parallax"],
    ]
    ra_o = np.radians(ra_deg)
    dec_o = np.radians(dec_deg)

    def resid(th):
        # th: offsets of (a0, d0) in arcsec from the truth start, mu, plx
        t = [truth[0] + th[0] * ARCSEC / np.cos(truth[1]), truth[1] + th[1] * ARCSEC, th[2], th[3], th[4]]
        ra, dec = model_radec(t, jd, e_au)
        da = ((ra_o - ra + np.pi) % (2 * np.pi)) - np.pi
        return np.concatenate([da * np.cos(dec_o) / ARCSEC / sig, (dec_o - dec) / ARCSEC / sig])

    start = np.array([0.0, 0.0, truth[2] * 1.05, truth[3] * 0.95, truth[4] * 1.1])
    r = least_squares(resid, start, method="lm", x_scale="jac", xtol=1e-15, ftol=1e-15, gtol=1e-15, max_nfev=2000)
    cov = np.linalg.inv(r.jac.T @ r.jac)
    return {
        "parallax": r.x[4],
        "mua": r.x[2],
        "mud": r.x[3],
        "sigmaParallax": float(np.sqrt(cov[4, 4])),
        "sigmaMua": float(np.sqrt(cov[2, 2])),
        "sigmaMud": float(np.sqrt(cov[3, 3])),
        "chi2": float(np.sum(r.fun**2)),
        "dof": int(len(r.fun) - 5),
        "nfev": int(r.nfev),
        "status": int(r.status),
    }


def line_fit(case, jd, ra_deg, dec_deg):
    sig = case["sigma"]
    xi, eta, a0, d0 = tangent(None, None, ra_deg, dec_deg)
    w = np.full(len(jd), 1.0 / sig**2)
    t_ref = float(np.sum(w * jd) / np.sum(w))
    t_yr = (jd - t_ref) / YEAR

    def f(t, x0, mu):
        return x0 + mu * t

    out = {"tRefJd": t_ref, "tangentRa": a0, "tangentDec": d0}
    for name, y in (("x", xi), ("y", eta)):
        popt, pcov = curve_fit(
            f,
            t_yr,
            y,
            p0=[0.1, 0.1],
            sigma=np.full(len(jd), sig),
            absolute_sigma=True,
            jac=lambda t, x0, mu: np.column_stack([np.ones_like(t), t]),
            xtol=1e-15,
            ftol=1e-15,
            gtol=1e-15,
        )
        res = (y - f(t_yr, *popt)) / sig
        out[name] = {
            "x0": float(popt[0]),
            "mu": float(popt[1]),
            "covariance": [[float(v) for v in row] for row in pcov],
            "chi2": float(np.sum(res**2)),
        }
    return out


def main(inp, outp):
    cfg = json.load(open(inp))
    g = cfg["earthGrid"]
    grid_jd = g["startJd"] + g["stepDays"] * np.arange(g["count"])
    grid = earth(grid_jd)

    tc = cfg["timeCases"]
    utc_jd = tc["startJdUtc"] + tc["stepDays"] * np.arange(tc["count"])
    t = Time(utc_jd, format="jd", scale="utc")
    off = lambda x: ((x.jd1 - t.jd1) + (x.jd2 - t.jd2)) * 86400.0
    times = {
        "jdUtc": utc_jd.tolist(),
        "ttMinusUtcSeconds": off(t.tt).tolist(),
        "tdbMinusUtcSeconds": off(t.tdb).tolist(),
    }

    cases = []
    for c in cfg["cases"]:
        jd = epochs_of(c["epochs"])
        e_au = earth(jd)
        ra, dec = series(c, jd, e_au, True)
        rec = {
            "id": c["id"],
            "truth": {k: c[k] for k in ("ra", "dec", "parallax", "mu", "sigma", "noiseSeed")},
            "epochsJd": jd.tolist(),
            "earthAu": e_au.tolist(),
            "ra": ra.tolist(),
            "dec": dec.tolist(),
            "line": line_fit(c, jd, ra, dec),
        }
        if c["id"] != "D":
            rec["spherical"] = spherical_fit(c, jd, e_au, ra, dec)
        if c["id"] in cfg["noiseFree"]:
            ra0, dec0 = series(c, jd, e_au, False)
            rec["noiseFree"] = {"ra": ra0.tolist(), "dec": dec0.tolist()}
        cases.append(rec)

    json.dump(
        {
            "format": "gravitas.astrometric-series-oracle-results/1",
            "earthGrid": {"jd": grid_jd.tolist(), "xyzAu": grid.tolist()},
            "times": times,
            "cases": cases,
        },
        open(outp, "w"),
        indent=1,
    )


main(sys.argv[1], sys.argv[2])
