#!/usr/bin/env python3
"""
The independent oracle of the SED kernel's legs B1 to B4 (Prompt 245).

Reads tests/fixtures/sed/oracle-inputs.json (the pack's bands and the points of the fit legs,
written by tools/sed-oracle/make-inputs.mjs) and writes tests/fixtures/sed/oracle-results.json.
It imports no Gravitas code and shares no code with the kernel: conversions through
astropy.units, the blackbody through astropy.modeling (and a numpy Planck function checked
against it), band integration by scipy Simpson on a 0.05 nm refinement, the fit by
scipy.optimize.least_squares on the full (ln theta, ln T) residual vector, the interval ends by
brentq on the oracle's own chi-square profile, the chord integral and the tails by
scipy.integrate.quad.

Run with a Python that has numpy, scipy and astropy:  python3.9 tools/sed-oracle/oracle.py
"""
import json
import sys
from pathlib import Path

import numpy as np
import scipy
import astropy
import astropy.units as u
import astropy.constants as const
from astropy.modeling.physical_models import BlackBody
from scipy import integrate, optimize, stats

ROOT = Path(__file__).resolve().parents[2]
DIR = ROOT / "tests" / "fixtures" / "sed"
INP = json.loads((DIR / "oracle-inputs.json").read_text())

C = const.c.value
H = const.h.value
K = const.k_B.value
JY = 1e-26
REFINE_NM = 0.05


def planck_lambda_si(lam_m, T):
    """B_lambda in W m^-3 sr^-1, numpy."""
    x = H * C / (lam_m * K * T)
    with np.errstate(over="ignore"):
        return 2 * H * C * C / lam_m**5 / np.expm1(x)


# the numpy Planck function is checked against astropy once, so a later use of it is sound
_chk = np.array([150.0, 550.0, 2200.0, 22000.0]) * 1e-9
for _T in (3600.0, 9500.0):
    _w = _chk * u.m
    _a = BlackBody(temperature=_T * u.K)(_w).to(u.W / u.m**2 / u.m / u.sr, u.spectral_density(_w)).value
    _b = planck_lambda_si(_chk, _T)
    assert np.max(np.abs(_a / _b - 1)) < 1e-9, "numpy Planck disagrees with astropy"


class Band:
    def __init__(self, raw):
        self.id = raw["id"]
        lam = np.array(raw["lambdaNm"], float)
        s = np.array(raw["response"], float)
        n = int(np.ceil((lam[-1] - lam[0]) / REFINE_NM)) + 1
        self.lam = np.linspace(lam[0], lam[-1], n)
        self.s = np.interp(self.lam, lam, s)
        self.ab_minus_vega = raw["abMinusVega"]
        self.den = integrate.simpson(self.s / self.lam, x=self.lam)
        self.pivot = float(np.sqrt(integrate.simpson(self.s * self.lam, x=self.lam) / self.den))

    def mean_fnu_jy(self, T):
        """Photon-weighted mean f_nu of pi B_lambda through the band, Jy (numpy Planck)."""
        fl = np.pi * planck_lambda_si(self.lam * 1e-9, T) * 1e-9  # W m^-2 nm^-1
        num = integrate.simpson(fl * self.s * self.lam, x=self.lam)
        return float(num / (C * 1e9 * self.den) / JY)

    def mean_fnu_astropy_jy(self, T):
        """The same with astropy.modeling's BlackBody."""
        bb = BlackBody(temperature=T * u.K)
        w = self.lam * u.nm
        fl = np.pi * bb(w).to(u.W / u.m**2 / u.nm / u.sr, u.spectral_density(w)).value
        num = integrate.simpson(fl * self.s * self.lam, x=self.lam)
        return float(num / (C * 1e9 * self.den) / JY)


BANDS = {b["id"]: Band(b) for b in INP["bands"]}
OUT = {"format": "gravitas.sed-oracle-results/1"}
OUT["versions"] = {
    "python": sys.version.split()[0],
    "numpy": np.__version__,
    "scipy": scipy.__version__,
    "astropy": astropy.__version__,
}

# ---- B1: conversions through astropy.units ---------------------------------------------------
c1 = INP["conversions"]
b1 = {"flambdaSi": [], "flambdaCgs": [], "abToJy": []}
for lam in c1["wavelengthsNm"]:
    for f in c1["fluxes"]:
        q = (f * u.W / u.m**2 / u.nm).to(u.Jy, u.spectral_density(lam * u.nm)).value
        b1["flambdaSi"].append({"lambdaNm": lam, "flux": f, "jy": float(q)})
        q = (f * u.erg / u.s / u.cm**2 / u.AA).to(u.Jy, u.spectral_density(lam * u.nm)).value
        b1["flambdaCgs"].append({"lambdaNm": lam, "flux": f, "jy": float(q)})
for m in c1["magnitudes"]:
    b1["abToJy"].append({"mag": m, "jy": float((m * u.ABmag).to(u.Jy).value)})
OUT["b1"] = b1

# ---- B2: band-integrated mean f_nu of a blackbody through every band ---------------------------
OUT["b2"] = {
    str(T): {bid: b.mean_fnu_astropy_jy(T) for bid, b in BANDS.items()}
    for T in INP["bandMeans"]["temperaturesK"]
}


OUT["pivots"] = {bid: b.pivot for bid, b in BANDS.items()}

# ---- B3: the SED fit --------------------------------------------------------------------------
def point_flux(p):
    """f_nu in Jy and the log-flux sigma of a raw point; astropy for the magnitudes."""
    conv = p["convention"]
    if conv in ("ab-mag", "vega-mag"):
        m = p["value"]
        if conv == "vega-mag":
            m = m + BANDS[p["band"]].ab_minus_vega
        # the committed rule (thresholds.json, rules.flux): f_nu = 3631 Jy x 10^(-0.4 m). astropy's ABmag is the
        # 48.60 mag definition (3630.78 Jy), which B1 reports as a finding and these legs do not mix in.
        f = 3631.0 * 10 ** (-0.4 * m)
        return f, 0.4 * np.log(10) * p["sigma"]
    assert conv == "Jy"
    return p["value"], p["sigma"] / p["value"]


def model_jy(p, T):
    """The model per unit theta^2, in Jy, for a point: f_nu = f_lambda lambda^2 / c."""
    if p["kind"] == "band-integrated":
        return BANDS[p["band"]].mean_fnu_jy(T)
    lam_m = p["lambdaNm"] * 1e-9
    f_lam_per_m = np.pi * planck_lambda_si(lam_m, T)  # W m^-3
    return float(f_lam_per_m * lam_m**2 / C / JY)


def fit_case(case):
    pts = case["points"]
    fl = [point_flux(p) for p in pts]
    y = np.array([np.log(f) for f, _ in fl])
    s = np.array([sg for _, sg in fl])

    def g(T):
        return np.array([np.log(model_jy(p, T)) for p in pts])

    def resid(par):
        return (y - par[0] - g(np.exp(par[1]))) / s

    # start from a crude colour temperature, not from the truth
    sol = optimize.least_squares(
        resid, x0=[np.log(1e-18), np.log(6000.0)], method="lm", xtol=1e-15, ftol=1e-15, gtol=1e-15
    )
    u0, v0 = sol.x
    chi2min = float(np.sum(sol.fun**2))

    def prof(v):
        r = y - g(np.exp(v))
        w = 1 / s**2
        uu = np.sum(w * r) / np.sum(w)
        return float(np.sum(w * (r - uu) ** 2))

    res = {
        "T": float(np.exp(v0)),
        "theta": float(np.exp(0.5 * u0)),
        "chi2": chi2min,
        "dof": len(pts) - 2,
        "intervals": [],
    }
    for level in case["levels"]:
        delta = stats.chi2.ppf(level, 1)

        def f(v):
            return prof(v) - chi2min - delta

        lo = optimize.brentq(f, v0 - 1.0, v0, xtol=1e-13, rtol=1e-13)
        hi = optimize.brentq(f, v0, v0 + 1.0, xtol=1e-13, rtol=1e-13)
        res["intervals"].append({"level": level, "lo": float(np.exp(lo)), "hi": float(np.exp(hi))})
    return res


OUT["b3"] = [{"label": c["label"], **fit_case(c)} for c in INP["fits"]]


# ---- B4: the chord integral and the model tails ------------------------------------------------
def chord_flux(case):
    pts = []
    for p in case["points"]:
        f, _ = point_flux(p)
        # AM1: the kernel's own pivot wavelengths, so the chord arithmetic is what is compared
        lam = case["pivotsNm"][p["id"]]
        pts.append((lam, f))
    pts.sort()
    total = 0.0
    for (l1, f1), (l2, f2) in zip(pts[:-1], pts[1:]):
        fl1 = f1 * JY * C / (l1 * 1e-9) ** 2 * 1e-9  # W m^-2 nm^-1
        fl2 = f2 * JY * C / (l2 * 1e-9) ** 2 * 1e-9
        a = np.log(fl2 / fl1) / np.log(l2 / l1)
        total += integrate.quad(lambda l: fl1 * (l / l1) ** a, l1, l2, epsabs=0, epsrel=1e-13)[0]
    return total, pts[0][0], pts[-1][0]


OUT["b4"] = {"data": [], "tails": []}
for case in INP["fits"]:
    F, lo, hi = chord_flux(case)
    OUT["b4"]["data"].append({"label": case["label"], "fluxWm2": float(F), "loNm": lo, "hiNm": hi})

sigma_sb = const.sigma_sb.value
for st in INP["tails"]["stars"]:
    T = st["T"]
    d = st["distancePc"] * u.pc.to(u.m)
    theta = st["radiusSolar"] * const.R_sun.value / d

    def f_lam(l_nm, T=T, theta=theta):
        return theta**2 * np.pi * planck_lambda_si(l_nm * 1e-9, T) * 1e-9  # W m^-2 nm^-1

    lo, hi = INP["tails"]["boundsNm"]
    below = integrate.quad(f_lam, 1.0, lo, epsabs=0, epsrel=1e-12, limit=200)[0]
    mid = integrate.quad(f_lam, lo, hi, epsabs=0, epsrel=1e-12, limit=200)[0]
    a1 = integrate.quad(f_lam, hi, 100 * hi, epsabs=0, epsrel=1e-12, limit=200)[0]
    a2 = integrate.quad(f_lam, 100 * hi, np.inf, epsabs=0, epsrel=1e-12, limit=200)[0]
    OUT["b4"]["tails"].append(
        {
            "key": st["key"],
            "T": T,
            "theta": float(theta),
            "below": float(below),
            "between": float(mid),
            "above": float(a1 + a2),
            "stefanBoltzmann": float(theta**2 * sigma_sb * T**4),
        }
    )

(DIR / "oracle-results.json").write_text(json.dumps(OUT, indent=1) + "\n")
print("wrote", DIR / "oracle-results.json")
