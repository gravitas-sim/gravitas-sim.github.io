#!/usr/bin/env python3
"""
The independent oracle of the SED follow-up legs B1b and B2b (Prompt 245, follow-up).

Reads tests/fixtures/sed/oracle-inputs.json (the first gate's inputs: the pack's bands and the
conversion cases) and writes tests/fixtures/sed/followup/oracle-results.json. It imports no Gravitas
code. B1b: astropy.units conversions and astropy's own AB zero-magnitude flux density. B2b: the band
means of a blackbody and the pivots by an exact quadrature: every response segment is integrated by
40-point Gauss-Legendre (exact to arithmetic for a piecewise-linear response times a smooth function).

Run with a Python that has numpy, scipy and astropy:  python3.9 tools/sed-oracle/oracle-followup.py
"""
import json
import sys
from pathlib import Path

import numpy as np
import scipy
import astropy
import astropy.units as u
import astropy.constants as const

ROOT = Path(__file__).resolve().parents[2]
DIR = ROOT / "tests" / "fixtures" / "sed"
INP = json.loads((DIR / "oracle-inputs.json").read_text())
THR = json.loads((DIR / "followup" / "thresholds.json").read_text())

C = const.c.value
H = const.h.value
K = const.k_B.value
JY = 1e-26
NODES = [c for c in THR["checks"] if c["id"] == "B2b.quadratureErrorRule"][0]["limits"]["gaussLegendreNodes"]
B1 = [c for c in THR["checks"] if c["id"] == "B1b.abConventions"][0]["limits"]
B2 = [c for c in THR["checks"] if c["id"] == "B2b.quadratureErrorRule"][0]["limits"]


def planck_lambda_si(lam_m, T):
    x = H * C / (lam_m * K * T)
    with np.errstate(over="ignore"):
        return 2 * H * C * C / lam_m**5 / np.expm1(x)


OUT = {"format": "gravitas.sed-followup-oracle-results/1"}
OUT["versions"] = {"python": sys.version.split()[0], "numpy": np.__version__, "scipy": scipy.__version__, "astropy": astropy.__version__}

# ---- B1b -----------------------------------------------------------------------------------------
b1 = {"flambdaSi": [], "flambdaCgs": [], "abToJy": []}
for lam in B1["wavelengthsNm"]:
    for f in B1["fluxes"]:
        q = (f * u.W / u.m**2 / u.nm).to(u.Jy, u.spectral_density(lam * u.nm)).value
        b1["flambdaSi"].append({"lambdaNm": lam, "flux": f, "jy": float(q)})
        q = (f * u.erg / u.s / u.cm**2 / u.AA).to(u.Jy, u.spectral_density(lam * u.nm)).value
        b1["flambdaCgs"].append({"lambdaNm": lam, "flux": f, "jy": float(q)})
for m in B1["magnitudes"]:
    b1["abToJy"].append({"mag": m, "jy": float((m * u.ABmag).to(u.Jy).value)})
b1["astropyZeroJy"] = float((0 * u.ABmag).to(u.Jy).value)
OUT["b1b"] = b1


# ---- B2b -----------------------------------------------------------------------------------------
x_gl, w_gl = np.polynomial.legendre.leggauss(NODES)


def exact(band, T):
    lam = np.array(band["lambdaNm"], float)
    s = np.array(band["response"], float)
    num = den = pn = pd = 0.0
    for i in range(len(lam) - 1):
        a, b = lam[i], lam[i + 1]
        l = 0.5 * (b - a) * x_gl + 0.5 * (b + a)
        w = w_gl * 0.5 * (b - a)
        S = np.interp(l, lam, s)
        num += np.sum(w * np.pi * planck_lambda_si(l * 1e-9, T) * 1e-9 * S * l)
        den += np.sum(w * S / l)
        pn += np.sum(w * S * l)
        pd += np.sum(w * S / l)
    return num / (C * 1e9 * den) / JY, float(np.sqrt(pn / pd))


OUT["b2b"] = {"mean": {}, "pivot": {}}
for T in B2["temperaturesK"]:
    OUT["b2b"]["mean"][str(T)] = {b["id"]: exact(b, T)[0] for b in INP["bands"]}
OUT["b2b"]["pivot"] = {b["id"]: exact(b, 5772.0)[1] for b in INP["bands"]}

(DIR / "followup" / "oracle-results.json").write_text(json.dumps(OUT, indent=1) + "\n")
print("wrote", DIR / "followup" / "oracle-results.json")
