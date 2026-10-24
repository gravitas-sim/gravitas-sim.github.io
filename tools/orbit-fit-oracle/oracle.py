"""
The independent oracle for Prompt 187 (orbit fitting and tracks), run offline,
never by Gravitas.

    python -I oracle.py inputs.json results.json

With numpy, scipy and astropy only, and no Gravitas code, it

  * makes each orbit case's series from the elements with its OWN Kepler solver
    (scipy.optimize.brentq on E - e sin E = M, per epoch) and its own rotations
    (numpy: R_z(Omega) R_x(i) R_z(omega) of the orbital-plane position, the
    north and east components of the result), epochs from numpy's generator
    (an even grid jittered by a fraction of the spacing, the ends fixed), plus
    seeded Gaussian error per axis;
  * fits each series by scipy.optimize.least_squares (method trf, three-point
    differences, tight tolerances) on the Thiele-Innes model in its textbook
    parameters (P, e, T, A, B, F, G) for the elliptical cases and (P, A, B, F, G)
    for the circular ones, started within a few percent of the truth, with the
    covariance inv(J^T J), and the formal sigmas of P and of the semi-major axis
    a = (hypot(A+G, B-F) + hypot(A-G, B+F)) / 2 by the gradient;
  * makes each track case's frames (static sources at random places and one mover
    on a straight line in the tangent plane, positions converted to the sky by the
    inverse gnomonic projection, error added in the tangent plane), fits the mover
    by scipy.optimize.curve_fit with absolute sigmas in the tangent plane
    (rebuilt by the forward gnomonic projection) and reports the rate and the
    position angle, and astropy's SkyCoord.position_angle between two sky
    positions of the fitted line;
  * evaluates Kepler's third-law constant 4 pi^2 au^3 / (GM_sun yr^2) with
    astropy.constants and the Julian year.

It writes the series and every fit for the tests to compare. Run with `-I` from a
directory that holds no other Python, with the script kept apart from the data.
"""

import json
import sys

import numpy as np
from astropy import constants as const
from astropy import units as u
from astropy.coordinates import SkyCoord
from scipy.optimize import brentq, curve_fit, least_squares

TAU = 2 * np.pi
RAD = np.pi / 180.0
ARCSEC = RAD / 3600.0


def kepler(M, e):
    M = (M + np.pi) % TAU - np.pi
    return brentq(lambda E: E - e * np.sin(E) - M, -np.pi - 1.0, np.pi + 1.0, xtol=1e-14, rtol=1e-14)


def rot_z(a):
    c, s = np.cos(a), np.sin(a)
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1.0]])


def rot_x(a):
    c, s = np.cos(a), np.sin(a)
    return np.array([[1.0, 0, 0], [0, c, -s], [0, s, c]])


def orbit_xy(t, el):
    """North and east offsets from the elements: own Kepler solver, own rotations."""
    n = TAU / el["P"]
    R = rot_z(el["Omega"] * RAD) @ rot_x(el["i"] * RAD) @ rot_z(el["omega"] * RAD)
    e = el["e"]
    out = []
    for ti in t:
        E = kepler(n * (ti - el["T"]), e)
        X = el["a"] * (np.cos(E) - e)
        Y = el["a"] * np.sqrt(1 - e * e) * np.sin(E)
        v = R @ np.array([X, Y, 0.0])
        out.append((v[0], v[1]))
    return np.array(out)


def ti_model(t, p, circular):
    if circular:
        P, A, B, F, G = p
        e, T = 0.0, 0.0
    else:
        P, e, T, A, B, F, G = p
    n = TAU / P
    E = np.array([kepler(n * (ti - T), e) for ti in t])
    X = np.cos(E) - e
    Y = np.sqrt(1 - e * e) * np.sin(E)
    return np.column_stack([A * X + F * Y, B * X + G * Y])


def ti_constants(el):
    w, O, i, a = el["omega"] * RAD, el["Omega"] * RAD, el["i"] * RAD, el["a"]
    A = a * (np.cos(w) * np.cos(O) - np.sin(w) * np.sin(O) * np.cos(i))
    B = a * (np.cos(w) * np.sin(O) + np.sin(w) * np.cos(O) * np.cos(i))
    F = a * (-np.sin(w) * np.cos(O) - np.cos(w) * np.sin(O) * np.cos(i))
    G = a * (-np.sin(w) * np.sin(O) + np.cos(w) * np.cos(O) * np.cos(i))
    return A, B, F, G


def semi_major(A, B, F, G):
    return 0.5 * (np.hypot(A + G, B - F) + np.hypot(A - G, B + F))


def orbit_case(case):
    rng = np.random.default_rng(case["noiseSeed"])
    el = dict(case["truth"])
    circular = case["kind"] == "circular"
    P = el["P"]
    span = case["arc"] * P
    n = case["n"]
    dt = span / (n - 1)
    t = case["startYear"] + dt * np.arange(n)
    t[1:-1] += dt * case["jitter"] * rng.uniform(-1, 1, n - 2)
    if circular:
        el = {"a": el["a"], "e": 0.0, "i": el["i"], "Omega": el["Omega"], "omega": el["phase"], "P": P, "T": case["startYear"]}
    truth_xy = orbit_xy(t, el)
    noise = case["sigma"] * rng.standard_normal((n, 2))
    data = truth_xy + noise
    A, B, F, G = ti_constants(el)
    if circular:
        # the circular model is fitted with T fixed at 0: the phase is absorbed
        # by (A, B, F, G), and the epochs are referred to the first epoch
        tt = t - case["startYear"]
        p0 = np.array([P * 1.01, A * 1.02, B * 0.98, F * 1.02, G * 0.98])
    else:
        tt = t
        p0 = np.array([P * 1.01, el["e"] * 1.03, el["T"] + 0.01 * P, A * 1.02, B * 0.98, F * 1.02, G * 0.98])

    def resid(p):
        return ((ti_model(tt, p, circular) - data) / case["sigma"]).ravel()

    r = least_squares(resid, p0, method="trf", jac="3-point", diff_step=1e-6, x_scale="jac", xtol=1e-15, ftol=1e-15, gtol=1e-15, max_nfev=2000)
    J = r.jac
    cov = np.linalg.inv(J.T @ J)
    p = r.x
    a_fit = semi_major(*p[-4:])
    # gradient of a with respect to the parameters, by central differences
    g = np.zeros(len(p))
    for k in range(len(p)):
        h = 1e-6 * max(abs(p[k]), 1e-3)
        pp, pm = p.copy(), p.copy()
        pp[k] += h
        pm[k] -= h
        g[k] = (semi_major(*pp[-4:]) - semi_major(*pm[-4:])) / (2 * h)
    sigma_a = float(np.sqrt(g @ cov @ g))
    return {
        "id": case["id"],
        "kind": case["kind"],
        "sigma": case["sigma"],
        "epochs": [float(x) for x in t],
        "x": [float(x) for x in data[:, 0]],
        "y": [float(x) for x in data[:, 1]],
        "truthXY": [[float(a), float(b)] for a, b in truth_xy],
        "fit": {
            "P": float(p[0]),
            "e": 0.0 if circular else float(p[1]),
            "a": float(a_fit),
            "chi2": float(2 * r.cost),
            "dof": int(2 * n - len(p)),
            "sigmaP": float(np.sqrt(cov[0, 0])),
            "sigmaA": sigma_a,
            "sigmaE": 0.0 if circular else float(np.sqrt(cov[1, 1])),
            "success": bool(r.success),
            "nfev": int(r.nfev),
        },
    }


def gnomonic_inverse(a0, d0, xi, eta):
    """Sky (ra, dec) in degrees of tangent-plane offsets (arcsec east, north)."""
    a0, d0 = a0 * RAD, d0 * RAD
    x, y = xi * ARCSEC, eta * ARCSEC
    den = np.cos(d0) - y * np.sin(d0)
    ra = a0 + np.arctan2(x, den)
    dec = np.arctan2(np.sin(d0) + y * np.cos(d0), np.hypot(x, den))
    return (np.degrees(ra) % 360.0), np.degrees(dec)


def gnomonic(a0, d0, ra, dec):
    a0, d0, a, d = a0 * RAD, d0 * RAD, ra * RAD, dec * RAD
    c = np.sin(d0) * np.sin(d) + np.cos(d0) * np.cos(d) * np.cos(a - a0)
    xi = np.cos(d) * np.sin(a - a0) / c / ARCSEC
    eta = (np.cos(d0) * np.sin(d) - np.sin(d0) * np.cos(d) * np.cos(a - a0)) / c / ARCSEC
    return xi, eta


def track_case(case):
    rng = np.random.default_rng(case["noiseSeed"])
    F = case["frames"]
    t_h = case["stepHours"] * np.arange(F)
    jd = case["startJd"] + t_h / 24.0
    field = case["fieldArcsec"]
    statics = rng.uniform(-field / 2, field / 2, (case["statics"], 2))
    m = case["mover"]
    rate = m["rateArcsecPerHour"]
    pa = m["paDeg"] * RAD
    vx, vy = rate * np.sin(pa), rate * np.cos(pa)  # east, north
    frames = []
    mover_pts = []
    for k in range(F):
        pts = statics + case["sigma"] * rng.standard_normal(statics.shape)
        mv = np.array([m["x0"] + vx * t_h[k], m["y0"] + vy * t_h[k]]) + case["sigma"] * rng.standard_normal(2)
        mover_pts.append(mv)
        allp = np.vstack([pts, mv])
        order = rng.permutation(len(allp))
        ra, dec = gnomonic_inverse(case["tangent"][0], case["tangent"][1], allp[:, 0], allp[:, 1])
        frames.append({"jd": float(jd[k]), "ra": [float(x) for x in ra[order]], "dec": [float(x) for x in dec[order]]})
    mover_pts = np.array(mover_pts)
    # the fit: tangent plane rebuilt from the sky positions (the tangent point is the one given)
    ra_m, dec_m = gnomonic_inverse(case["tangent"][0], case["tangent"][1], mover_pts[:, 0], mover_pts[:, 1])
    xi, eta = gnomonic(case["tangent"][0], case["tangent"][1], ra_m, dec_m)
    th = (jd - jd.mean()) * 24.0
    sig = np.full(F, case["sigma"])

    def line(t, c0, v):
        return c0 + v * t

    px, cx = curve_fit(line, th, xi, p0=[0.0, 0.1], sigma=sig, absolute_sigma=True)
    py, cy = curve_fit(line, th, eta, p0=[0.0, 0.1], sigma=sig, absolute_sigma=True)
    rate_fit = float(np.hypot(px[1], py[1]))
    pa_fit = float(np.degrees(np.arctan2(px[1], py[1])) % 360.0)
    # astropy's position angle (the bearing on the sphere) from the fitted line's position at the
    # mean epoch toward its position one hour later: the local position angle, which differs from
    # the tangent plane's by the convergence of the meridians
    p1 = gnomonic_inverse(case["tangent"][0], case["tangent"][1], px[0], py[0])
    p2 = gnomonic_inverse(case["tangent"][0], case["tangent"][1], px[0] + px[1], py[0] + py[1])
    c1 = SkyCoord(p1[0] * u.deg, p1[1] * u.deg)
    c2 = SkyCoord(p2[0] * u.deg, p2[1] * u.deg)
    pa_astropy = float(c1.position_angle(c2).to_value(u.deg))
    return {
        "id": case["id"],
        "tangent": case["tangent"],
        "sigma": case["sigma"],
        "frames": frames,
        "fit": {
            "rate": rate_fit,
            "paPlane": pa_fit,
            "paAstropy": pa_astropy,
            "vx": float(px[1]),
            "vy": float(py[1]),
            "sigmaVx": float(np.sqrt(cx[1, 1])),
            "sigmaVy": float(np.sqrt(cy[1, 1])),
        },
    }


def main():
    with open(sys.argv[1]) as fh:
        inp = json.load(fh)
    out = {
        "format": "gravitas.orbit-fit-oracle-results/1",
        "prompt": 187,
        "orbits": [orbit_case(c) for c in inp["orbits"]],
        "tracks": [track_case(c) for c in inp["tracks"]],
    }
    yr = 365.25 * 86400.0 * u.s
    k = (4 * np.pi**2 * const.au**3 / (const.GM_sun * yr**2)).decompose()
    out["keplerK"] = float(k.value)
    with open(sys.argv[2], "w") as fh:
        json.dump(out, fh, indent=2)
        fh.write("\n")


if __name__ == "__main__":
    main()
