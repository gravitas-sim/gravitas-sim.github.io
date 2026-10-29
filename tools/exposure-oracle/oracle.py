#!/usr/bin/env python3
"""The exposure oracle (Prompt 210): an independent implementation, no Gravitas code.

It solves the CCD equation for the 5-sigma depth of a point source seen by
point-spread-function (optimal) photometry, the model behind Ivezic et al. 2019
(ApJ 873, 111, arXiv:0805.2366v5) equation 6, from numpy and scipy alone:

    noise^2 = S + n_eff (B t + n_reads R^2)         n_eff = 4 pi sigma^2 (pixels)
    SNR     = S / noise,  solved for S at SNR = 5:  S^2 - 25 S - 25 V = 0

The zero point of each band (electrons per second for a magnitude-0 AB source at
the zenith) is FITTED to the published single-visit depth m5; everything else in
the output is a prediction from the equation that was not fitted: the loss of depth
to the read noise (Table 2, dCmInf), the correction for a longer exposure (dCm(2)
and equation 7), the depth away from the fiducial conditions (equation 6) and the
loss of depth at airmass 1.2.

    python3 tools/exposure-oracle/oracle.py > tests/fixtures/exposure/oracle-results.json
"""
import json
import math
import sys

import numpy as np
import scipy
from scipy.optimize import brentq

with open(sys.argv[1] if len(sys.argv) > 1 else "tests/fixtures/exposure/thresholds.json") as f:
    THR = json.load(f)
PUB = THR["published"]
PIX = PUB["pixelScaleArcsec"]
READ = PUB["visit"]["readNoiseElectrons"]
NEXP = PUB["visit"]["exposures"]
T_VIS = NEXP * PUB["visit"]["secondsEach"]
FWHM_PER_SIGMA = 2.0 * math.sqrt(2.0 * math.log(2.0))
SNR = 5.0


def depth(zp, msky, theta, t, nexp, read, X=1.0, k=0.0, seeing_exp=0.0):
    """5-sigma depth (AB, at the zenith's extinction) at zero point zp."""
    th = theta * X ** seeing_exp
    sig = th / PIX / FWHM_PER_SIGMA
    neff = 4.0 * math.pi * sig * sig
    sky_pix = zp * 10.0 ** (-0.4 * msky) * PIX * PIX
    v = neff * (sky_pix * t + nexp * read * read)
    s = (SNR * SNR + math.sqrt(SNR ** 4 + 4.0 * SNR * SNR * v)) / 2.0
    return -2.5 * math.log10(s / (t * zp)) - k * (X - 1.0)


def fit_zero_point(i):
    f = lambda lz: depth(10.0 ** lz, PUB["msky"][i], PUB["thetaEff"][i], T_VIS, NEXP, READ) - PUB["m5"][i]
    return 10.0 ** brentq(f, 5.0, 13.0, xtol=1e-14, rtol=1e-14)


def eq7(dinf, tau):
    return dinf - 1.25 * math.log10(1.0 + (10.0 ** (0.8 * dinf) - 1.0) / tau)


def eq6(i, msky=None, theta=None, t=T_VIS, X=1.0, dinf=None):
    m = PUB["msky"][i] if msky is None else msky
    th = PUB["thetaEff"][i] if theta is None else theta
    th = th * X ** 0.6
    tau = t / T_VIS
    cm = PUB["Cm"][i] + (0.0 if abs(tau - 1.0) < 1e-12 else eq7(PUB["dCmInf"][i], tau))
    return cm + 0.5 * (m - 21.0) + 2.5 * math.log10(0.7 / th) + 1.25 * math.log10(t / 30.0) - PUB["km"][i] * (X - 1.0)


# the off-fiducial conditions of check B4: [label, overrides]
CONDITIONS = [
    ["sky-1", {"dsky": -1.0}],
    ["sky+1", {"dsky": 1.0}],
    ["seeing x1.3", {"dtheta": 1.3}],
    ["seeing x0.8", {"dtheta": 0.8}],
    ["60 s", {"t": 60.0}],
    ["120 s", {"t": 120.0}],
    ["airmass 1.5", {"X": 1.5}],
    ["combined", {"dsky": -1.0, "dtheta": 1.3, "t": 60.0, "X": 1.5}],
]

bands = []
for i, b in enumerate(PUB["bands"]):
    zp = fit_zero_point(i)
    m5fid = depth(zp, PUB["msky"][i], PUB["thetaEff"][i], T_VIS, NEXP, READ)
    m5free = depth(zp, PUB["msky"][i], PUB["thetaEff"][i], T_VIS, NEXP, 0.0)
    km = PUB["km"][i]
    row = {
        "band": b,
        "zeroPoint": zp,
        "m5Fiducial": m5fid,
        "readLoss": m5free - m5fid,
        "doubling": {},
        "eq7": {},
        "conditions": [],
        "lossAtX1p2": None,
    }
    for tau in THR["checks"][[c["id"] for c in THR["checks"]].index("B3.doubling")]["limits"]["taus"]:
        m = depth(zp, PUB["msky"][i], PUB["thetaEff"][i], T_VIS * tau, NEXP, READ)
        row["doubling"][str(tau)] = m - m5fid - 1.25 * math.log10(tau)
        row["eq7"][str(tau)] = eq7(PUB["dCmInf"][i], tau)
    for label, o in CONDITIONS:
        msky = PUB["msky"][i] + o.get("dsky", 0.0)
        theta = PUB["thetaEff"][i] * o.get("dtheta", 1.0)
        t = o.get("t", T_VIS)
        X = o.get("X", 1.0)
        impl = depth(zp, msky, theta, t, NEXP, READ, X=X, k=km, seeing_exp=0.6)
        pub = eq6(i, msky=msky, theta=theta, t=t, X=X)
        row["conditions"].append({"label": label, "overrides": o, "implementation": impl, "equation6": pub})
    m12 = depth(zp, PUB["msky"][i], PUB["thetaEff"][i], T_VIS, NEXP, READ, X=1.2, k=km, seeing_exp=0.6)
    row["lossAtX1p2"] = m5fid - m12
    bands.append(row)

out = {
    "format": "gravitas.exposure-oracle/1",
    "thresholds": "tests/fixtures/exposure/thresholds.json",
    "model": "point-spread-function photometry, noise^2 = S + n_eff (B t + n_reads R^2), no dark current, SNR = 5, sky as an AB surface brightness read through the zenith zero point",
    "versions": {"python": sys.version.split()[0], "numpy": np.__version__, "scipy": scipy.__version__},
    "bands": bands,
}
json.dump(out, sys.stdout, indent=2)
sys.stdout.write("\n")
