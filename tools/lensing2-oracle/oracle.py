#!/usr/bin/env python3
"""
The independent oracle of Prompt 251 (enclosed mass, arcs and images; the gate's pinned delay and
finite-source numbers).

Reads tests/fixtures/lensing2/oracle-inputs.json (written by make-inputs.mjs) and writes
tests/fixtures/lensing2/oracle-results.json. It imports no Gravitas code and shares no code with the
kernel: distances from astropy's FlatLambdaCDM (Tcmb0 = 0, so no radiation, as the kernel neglects it),
constants from astropy.constants, the enclosed mass by scipy quadrature of the singular isothermal
sphere's projected density (a different route from the kernel's critical-density form), image positions
by brentq roots of the lens equation and magnifications from 1 / det of a numerical Jacobian, circle
fits by scipy.optimize.least_squares from the centroid start, the interval by Monte Carlo draws, the
delays by differencing the Fermat potential at brentq roots, the Hubble constant by brentq on astropy's
time-delay distance, and the finite-source magnification by an integral in polar angle about the lens
(scipy quad with the closed radial integral).

Run with a Python that has numpy, scipy and astropy:  python3.9 tools/lensing2-oracle/oracle.py
"""
import json
import sys
from pathlib import Path

import numpy as np
import scipy
import astropy
import astropy.units as u
import astropy.constants as const
from astropy.cosmology import FlatLambdaCDM
from scipy import integrate, optimize, stats

ROOT = Path(__file__).resolve().parents[2]
DIR = ROOT / "tests" / "fixtures" / "lensing2"
INP = json.loads((DIR / "oracle-inputs.json").read_text())

C = const.c.value
G = const.G.value
ARCSEC = np.pi / 180 / 3600
MPC = u.Mpc.to(u.m)
COSMO = FlatLambdaCDM(H0=INP["cosmology"]["H0"] * u.km / u.s / u.Mpc, Om0=INP["cosmology"]["Om"], Tcmb0=0)


def dist(zl, zs, cosmo=COSMO):
    dl = cosmo.angular_diameter_distance(zl).to(u.Mpc).value
    ds = cosmo.angular_diameter_distance(zs).to(u.Mpc).value
    dls = cosmo.angular_diameter_distance_z1z2(zl, zs).to(u.Mpc).value
    return dl, ds, dls


def sigma_crit(dl_m, ds_m, dls_m):
    return C**2 * ds_m / (4 * np.pi * G * dl_m * dls_m)


# ---- B1, B2: distances, critical density, enclosed mass by quadrature of the SIS profile ----------
distances, mass = [], []
for zl, zs in INP["redshiftPairs"]:
    dl, ds, dls = dist(zl, zs)
    distances.append({"zl": zl, "zs": zs, "dlMpc": dl, "dsMpc": ds, "dlsMpc": dls})
    dl_m, ds_m, dls_m = dl * MPC, ds * MPC, dls * MPC
    for te in INP["thetaEArcsec"]:
        th = te * ARCSEC
        sig = C * np.sqrt(th * ds_m / (4 * np.pi * dls_m))  # the SIS dispersion with this Einstein angle
        R = th * dl_m
        m, err = integrate.quad(lambda r: 2 * np.pi * r * sig**2 / (2 * G * r), 0, R, epsabs=0, epsrel=1e-13)
        mass.append({"zl": zl, "zs": zs, "thetaEArcsec": te, "sigmaCrit": sigma_crit(dl_m, ds_m, dls_m),
                     "sigmaMs": sig, "massKg": m, "quadErr": err})

# ---- B3: image positions and magnifications by root finding --------------------------------------
ys = np.geomspace(INP["images"]["yRange"][0], INP["images"]["yRange"][1], INP["images"]["nY"])


def point_roots(y):
    f = lambda x: x - 1 / x - y
    return [optimize.brentq(f, 1.0, y + 2, xtol=1e-15, rtol=1e-15), optimize.brentq(f, -1.0, -1e-12, xtol=1e-15, rtol=1e-15)]


def sis_roots(y):
    g = lambda x: x - np.sign(x) - y
    r = [optimize.brentq(g, 1e-9, y + 2, xtol=1e-15, rtol=1e-15)]
    if y < 1:
        r.append(optimize.brentq(g, -2.0, -1e-9, xtol=1e-15, rtol=1e-15))
    return r


def mu_of(lens_y, x, h=1e-5):
    dy = (lens_y(x + h) - lens_y(x - h)) / (2 * h)
    return 1.0 / (dy * lens_y(x) / x)


point_y = lambda x: x - 1 / x
sis_y = lambda x: x - np.sign(x)
images = []
for y in ys:
    pr, sr = point_roots(y), sis_roots(y)
    images.append({"y": float(y), "point": {"x": pr, "mu": [mu_of(point_y, x) for x in pr]},
                   "sis": {"x": sr, "mu": [mu_of(sis_y, x) for x in sr]}})

# ---- B4: circle fits -----------------------------------------------------------------------------
circles = []
for arc in INP["arcs"]:
    P = np.array([[p["x"], p["y"]] for p in arc["points"]])
    s = arc["sigma"]
    c0 = arc["centre"]
    d = np.hypot(P[:, 0] - c0["x"], P[:, 1] - c0["y"])
    fixed = {"radius": float(d.mean()), "sigmaRadius": s / np.sqrt(len(d))}

    def resid(p):
        return (np.hypot(P[:, 0] - p[0], P[:, 1] - p[1]) - p[2]) / s

    x0 = [P[:, 0].mean(), P[:, 1].mean(), np.hypot(P[:, 0] - P[:, 0].mean(), P[:, 1] - P[:, 1].mean()).mean()]
    res = optimize.least_squares(resid, x0, method="lm", xtol=1e-15, ftol=1e-15, gtol=1e-15, max_nfev=20000)
    cov = np.linalg.inv(res.jac.T @ res.jac)
    circles.append({"id": arc["id"], "fixed": fixed,
                    "free": {"cx": float(res.x[0]), "cy": float(res.x[1]), "radius": float(res.x[2]),
                             "sigmaRadius": float(np.sqrt(cov[2, 2])), "chi2": float(2 * res.cost), "status": int(res.status)}})

# ---- B5: the interval by Monte Carlo ---------------------------------------------------------------
iv = INP["interval"]
dl, ds, dls = [x * MPC for x in dist(iv["zl"], iv["zs"])]
scr = sigma_crit(dl, ds, dls)
M = lambda th: np.pi * scr * (th * dl) ** 2
rng = np.random.default_rng(iv["seed"])
draws = rng.normal(iv["thetaEArcsec"] * ARCSEC, iv["sigmaArcsec"] * ARCSEC, iv["draws"])
md = M(draws)
interval = []
for L in iv["levels"]:
    z = float(stats.norm.ppf((1 + L) / 2))
    q = np.quantile(md, [(1 - L) / 2, (1 + L) / 2])
    interval.append({"level": L, "z": z, "mcLo": float(q[0]), "mcHi": float(q[1]),
                     "exactLo": float(M((iv["thetaEArcsec"] - z * iv["sigmaArcsec"]) * ARCSEC)),
                     "exactHi": float(M((iv["thetaEArcsec"] + z * iv["sigmaArcsec"]) * ARCSEC))})
interval_out = {"massKg": float(M(iv["thetaEArcsec"] * ARCSEC)), "intervals": interval}

# ---- Part B: pinned independent delay and H0 calculations (no kernel exists for these) -----------------
def fermat_delay(theta_a, theta_b, tau):
    """Seconds: tau(theta_b) - tau(theta_a), the later image minus the earlier one by the caller's order."""
    return tau(theta_b) - tau(theta_a)


delay = {"sis": [], "sheet": [], "point": []}
for case in INP["delay"]["sis"]:
    zl, zs, te, y = case["zl"], case["zs"], case["thetaEArcsec"], case["y"]
    dl, ds, dls = [x * MPC for x in dist(zl, zs)]
    ddt = (1 + zl) * dl * ds / dls
    thE, beta = te * ARCSEC, y * te * ARCSEC
    k = ddt / C
    tau = lambda th, beta=beta, thE=thE, k=k: k * ((th - beta) ** 2 / 2 - thE * abs(th))
    lens = lambda th, thE=thE: th - thE * np.sign(th)
    xp = optimize.brentq(lambda t: lens(t) - beta, 1e-12, 10 * thE, xtol=1e-30, rtol=1e-15)
    xm = optimize.brentq(lambda t: lens(t) - beta, -10 * thE, -1e-12, xtol=1e-30, rtol=1e-15)
    dt = fermat_delay(xp, xm, tau)  # the inner (nearer the lens) image arrives later
    delay["sis"].append({**case, "ddtM": ddt, "thetaPlus": xp, "thetaMinus": xm, "delayS": dt,
                         "delayClosedS": 2 * ddt * thE * beta / C})
    # mass-sheet family
    for lam in INP["delay"]["sheet"]["lambda"]:
        thE2, ks, beta2 = lam * thE, 1 - lam, lam * beta
        lens2 = lambda th: th - (thE2 * np.sign(th) + ks * th)
        tau2 = lambda th: k * ((th - beta2) ** 2 / 2 - (thE2 * abs(th) + ks * th * th / 2))
        ap = optimize.brentq(lambda t: lens2(t) - beta2, 1e-12, 50 * thE, xtol=1e-30, rtol=1e-15)
        am = optimize.brentq(lambda t: lens2(t) - beta2, -50 * thE, -1e-12, xtol=1e-30, rtol=1e-15)
        h = 1e-9 * thE
        mu = lambda th: 1.0 / (((lens2(th + h) - lens2(th - h)) / (2 * h)) * (lens2(th) / th))
        dt2 = tau2(am) - tau2(ap)
        # H0 inferred with lambda = 1 from the sheeted delay (what a model without the sheet reports)
        def model_delay(H0):
            c2 = FlatLambdaCDM(H0=H0 * u.km / u.s / u.Mpc, Om0=INP["cosmology"]["Om"], Tcmb0=0)
            d1, d2, d3 = [x * MPC for x in dist(zl, zs, c2)]
            return 2 * (1 + zl) * d1 * d2 / d3 * thE * beta / C
        h0 = optimize.brentq(lambda H0: model_delay(H0) - dt2, 5.0, 500.0, xtol=1e-13, rtol=1e-14)
        delay["sheet"].append({**case, "lambda": lam, "thetaPlus": ap, "thetaMinus": am, "muPlus": mu(ap), "muMinus": mu(am),
                               "delayS": dt2, "delayRatio": dt2 / dt, "h0Lambda1": h0, "h0True": INP["delay"]["trueH0"]})
for zl in INP["p0"]["zl"]:
    for y in INP["p0"]["y"]:
        M0 = INP["p0"]["massKg"]
        thE_sq_scale = 4 * G * M0 / C**2  # Dl Ds/Dls * thetaE^2
        # work in units of thetaE = 1: phi(x) = (x - y)^2 / 2 - ln|x|
        phi = lambda x: (x - y) ** 2 / 2 - np.log(abs(x))
        f = lambda x: x - 1 / x - y
        xp = optimize.brentq(f, 1.0, y + 2, xtol=1e-15, rtol=1e-15)
        xm = optimize.brentq(f, -1.0, -1e-12, xtol=1e-15, rtol=1e-15)
        delay["point"].append({"zl": zl, "y": y, "massKg": M0, "delayS": (1 + zl) * thE_sq_scale / C * (phi(xm) - phi(xp))})

# ---- P1: the finite-source magnification by an integral in polar angle about the lens -----------------
F = lambda r: r * np.sqrt(r * r + 4) / 2  # the closed integral of r A(r) dr


def finite_source(u0, rho):
    if u0 >= rho:
        phim = np.arcsin(min(1.0, rho / u0))

        def integrand(t):
            ph = phim * np.sin(t)
            root = np.sqrt(max(rho * rho - (u0 * np.sin(ph)) ** 2, 0.0))
            return (F(u0 * np.cos(ph) + root) - F(u0 * np.cos(ph) - root)) * phim * np.cos(t)

        v, _ = integrate.quad(integrand, 0, np.pi / 2, epsabs=0, epsrel=1e-13, limit=400)
        tot = 2 * v
    else:
        def integrand(ph):
            return F(u0 * np.cos(ph) + np.sqrt(rho * rho - (u0 * np.sin(ph)) ** 2))

        v, _ = integrate.quad(integrand, 0, np.pi, epsabs=0, epsrel=1e-13, limit=400)
        tot = 2 * v
    return tot / (np.pi * rho * rho)


finite = []
for rho in INP["p1"]["rho"]:
    for r in INP["p1"]["uOverRho"]:
        finite.append({"rho": rho, "uOverRho": r, "u": r * rho, "magnification": finite_source(r * rho, rho)})

out = {
    "format": "gravitas.lensing2-oracle-results/1",
    "versions": {"python": sys.version.split()[0], "numpy": np.__version__, "scipy": scipy.__version__,
                 "astropy": astropy.__version__},
    "constants": {"c": C, "G": G, "Msun": const.M_sun.value, "Mpc_m": MPC},
    "distances": distances,
    "mass": mass,
    "images": images,
    "circles": circles,
    "interval": interval_out,
    "delay": delay,
    "finite": finite,
}
(DIR / "oracle-results.json").write_text(json.dumps(out) + "\n")
print("wrote oracle-results.json")
