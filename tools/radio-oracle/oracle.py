#!/usr/bin/env python3
"""
The independent oracle of the HI spectroscopy kernel (Roadmap III, Prompt 241).

Run offline, never by a test:

    python3 -I tools/radio-oracle/oracle.py > tests/fixtures/radio/oracle-results.json

Nothing here reads Gravitas code. It reads two data files: the committed thresholds
(parameters of the worlds, the bounds' inputs) and tests/fixtures/radio/oracle-inputs.json (the two atomic
constants as inputs, and the spectra the kernel's generator made). The kernel's answers are compared with
these in tools/radio-validate.mjs. Pieces:

  doppler   astropy.units' doppler_radio, doppler_optical, doppler_relativistic equivalencies
  los       the line-of-sight velocity in numpy, and the terminal velocity by scipy.optimize.minimize_scalar
  spectrum  the forward model as a matrix over distance and channel (midpoint rule on a finer grid than the
            kernel's, cumulative optical depth by cumsum), thin and with radiative transfer
  analysis  the stated rules (LSR shift, edge rule E1 to E7, the uncertainty formula) re-implemented in numpy
  column    the column coefficient from scipy.constants' exact SI constants and a numpy trapezoid
  edge      the universal edge by scipy.integrate.quad, its peak as the root of dg/dx by brentq (AM3)
"""
import json
import math
import sys
from pathlib import Path

import numpy as np
from scipy import constants as sc
from scipy import integrate, optimize, stats

import astropy.units as u

ROOT = Path(__file__).resolve().parents[2]
FIX = ROOT / "tests" / "fixtures" / "radio"
THR = json.loads((FIX / "thresholds.json").read_text())
INP = json.loads((FIX / "oracle-inputs.json").read_text())
SYN = THR["synthetic"]
F0 = INP["atomic"]["restFrequencyHz"]
A10 = INP["atomic"]["spinFlipRateS"]
C_KMS = sc.c / 1000.0
KPC_CM = (648000.0 / math.pi) * sc.au * 1e3 * 100.0  # IAU 2015 parsec, kpc in cm
rng = np.random.default_rng(THR["seeds"]["oracleNumpy"])

R0 = SYN["r0Kpc"]
TH0 = SYN["theta0KmS"]
RC = SYN["rcKpc"]
ALPHA = SYN["alphas"]
SCH = (11.1, 12.24, 7.25)
STR = (11.1, 3.77, 7.25)


def curve(R, name):
    k = math.sqrt(R0 * R0 + RC * RC) / R0
    return TH0 * k * (R / np.sqrt(R * R + RC * RC)) * (R / R0) ** ALPHA[name]


def lsr_shift(l_deg, motion):
    l = np.radians(l_deg)
    return motion[0] * np.cos(l) + motion[1] * np.sin(l)


def radius(d, l_deg):
    l = np.radians(l_deg)
    return np.sqrt(R0 * R0 + d * d - 2 * R0 * d * np.cos(l))


def los_v(d, l_deg, name):
    R = radius(d, l_deg)
    return (curve(R, name) * R0 / R - TH0) * np.sin(np.radians(l_deg))


# ---------------------------------------------------------------------------
# doppler
# ---------------------------------------------------------------------------
def doppler():
    v = rng.uniform(-500, 500, 200)
    f = F0 * (1.0 - v / C_KMS)
    rest = F0 * u.Hz
    eqs = {
        "radio": u.doppler_radio(rest),
        "optical": u.doppler_optical(rest),
        "relativistic": u.doppler_relativistic(rest),
    }
    out = {"frequencyHz": f.tolist(), "velocityKmS": v.tolist(), "vFromF": {}, "fFromV": {}}
    for name, eq in eqs.items():
        out["vFromF"][name] = (f * u.Hz).to(u.km / u.s, equivalencies=eq).value.tolist()
        out["fFromV"][name] = (v * u.km / u.s).to(u.Hz, equivalencies=eq).value.tolist()
    return out


# ---------------------------------------------------------------------------
# line of sight
# ---------------------------------------------------------------------------
def los():
    lims = {c["id"]: c["limits"] for c in THR["checks"]}["B2.losOracle"]
    out = []
    for name in ("flat", "rising", "falling"):
        for l in lims["longitudes"]:
            d = np.linspace(0.1, 15.0, lims["distances"])
            v = los_v(d, l, name)
            side = 1.0 if l < 180 else -1.0
            dmax = 2 * R0 * math.cos(math.radians(l))
            r = optimize.minimize_scalar(
                lambda x: -side * los_v(x, l, name),
                bounds=(0.01, dmax),
                method="bounded",
                options={"xatol": 1e-12},
            )
            out.append({
                "curve": name,
                "l": l,
                "d": d.tolist(),
                "v": v.tolist(),
                "terminal": float(los_v(r.x, l, name)),
                "terminalDistance": float(r.x),
            })
    return out


# ---------------------------------------------------------------------------
# the column coefficient and the spectrum
# ---------------------------------------------------------------------------
def column_coefficient():
    si = 32 * math.pi * sc.k * F0 ** 2 / (3 * sc.h * sc.c ** 3 * A10)
    return si * 1e3 * 1e-4


CN = column_coefficient()


def channel_velocities(count, width):
    df = F0 * width / C_KMS
    f = F0 + (np.arange(count) - (count - 1) / 2) * df
    return C_KMS * (1 - f / F0)


def spectrum(l_deg, name, sigma, density, ts=None, r_in=None, r_out=None, step=0.001):
    r_in = SYN["gas"]["rInKpc"] if r_in is None else r_in
    r_out = SYN["gas"]["rOutKpc"] if r_out is None else r_out
    ch = SYN["channels"]
    vc = channel_velocities(ch["count"], ch["widthKmSAtRest"])
    lr = math.radians(l_deg)
    dmax = R0 * math.cos(lr) + math.sqrt(max(0.0, r_out ** 2 - (R0 * math.sin(lr)) ** 2))
    d = (np.arange(int(math.ceil(dmax / step))) + 0.5) * step
    R = radius(d, l_deg)
    keep = (R >= r_in) & (R <= r_out)
    d = d[keep]
    vh = los_v(d, l_deg, name) - lsr_shift(l_deg, SCH)
    col = density * step * KPC_CM
    G = np.exp(-0.5 * ((vc[None, :] - vh[:, None]) / sigma) ** 2) / (sigma * math.sqrt(2 * math.pi)) * col
    if ts is None:
        T = G.sum(axis=0) / CN
    else:
        dtau = G / (CN * ts)
        fg = np.cumsum(dtau, axis=0) - dtau
        T = (ts * (1 - np.exp(-dtau)) * np.exp(-fg)).sum(axis=0)
    return T


def spectra():
    lims = {c["id"]: c["limits"] for c in THR["checks"]}["B3.spectrumOracle"]
    op = SYN["opacity"]
    out = {"thin": [], "thick": []}
    for world in SYN["worlds"]:
        name, sv = world.split(":")
        for l in lims["longitudes"]:
            T = spectrum(l, name, float(sv), SYN["gas"]["thinDensityCm3"])
            out["thin"].append({"world": world, "l": l, "T": [float(f"{t:.9g}") for t in T]})
    for name in ("flat", "rising", "falling"):
        for l in lims["longitudes"]:
            for key in ("thinWithSpinTemperature", "thick"):
                o = op[key]
                T = spectrum(l, name, 5.0, o["densityCm3"], ts=o["spinTemperatureK"])
                out["thick"].append({"curve": name, "setting": key, "l": l, "T": [float(f"{t:.9g}") for t in T]})
    return out


# ---------------------------------------------------------------------------
# the universal edge (quad, brentq)
# ---------------------------------------------------------------------------
def phi(x):
    return math.exp(-0.5 * x * x) / math.sqrt(2 * math.pi)


def g(x):
    top = math.sqrt(max(0.0, -x) + 12.0)
    return 2 * integrate.quad(lambda t: phi(x + t * t), 0, top, epsabs=1e-14, epsrel=1e-13, limit=400)[0]


def dg(x):
    top = math.sqrt(max(0.0, -x) + 12.0)
    return -2 * integrate.quad(lambda t: (x + t * t) * phi(x + t * t), 0, top, epsabs=1e-14, epsrel=1e-13, limit=400)[0]


def edge_shape(f=0.5):
    xpk = optimize.brentq(dg, -3.0, 1.0, xtol=1e-14)
    gpk = g(xpk)
    cf = optimize.brentq(lambda x: g(x) - f * gpk, xpk, 12.0, xtol=1e-14)
    # minimize_scalar for information only: the flat maximum's value-based location
    ms = optimize.minimize_scalar(lambda x: -g(x), bounds=(-3, 1), method="bounded", options={"xatol": 1e-12})
    return {"f": f, "xPeak": xpk, "gPeak": gpk, "cf": cf, "g0": g(0.0), "minimizeScalarPeak": float(ms.x)}


EDGE = edge_shape(THR["edgeRule"]["f"])


# ---------------------------------------------------------------------------
# the analysis, from the stated rules
# ---------------------------------------------------------------------------
def analyse(l_deg, T, sigma_v, theta0, sigma_theta0, sigma_sigma_v, lsr, tau, count, width, sigma_noise=None):
    R = THR["edgeRule"]
    f = R["f"]
    ch = SYN["channels"]
    fch = F0 + (np.arange(count) - (count - 1) / 2) * (F0 * width / C_KMS)
    vh = C_KMS * (1 - fch / F0)
    side = 1.0 if (l_deg % 360) < 180 else -1.0
    l = np.radians(l_deg)
    shift = lsr[0] * math.cos(l) + lsr[1] * math.sin(l)
    v = vh + shift
    order = np.argsort(side * v, kind="stable")
    x = side * v[order]
    t = np.asarray(T)[order]
    n = len(x)
    if sigma_noise is None:
        k = max(5, math.ceil(R["outerFraction"] * n))
        tail = t[n - k:]
        sn = 1.4826 * np.median(np.abs(tail - np.median(tail)))
    else:
        sn = sigma_noise
    side_max = t[x >= 0].max()
    level = max(R["outerSigma"] * sn, R["floorFraction"] * side_max)
    run = R["runChannels"]
    i_out = -1
    for i in range(n - 1, run - 2, -1):
        if all(t[i - j] >= level and t[i - j] > 0 for j in range(run)):
            i_out = i
            break
    if i_out < 0:
        return {"status": "refused", "code": "edge-not-significant"}
    x_out = x[i_out]
    lo = x_out - R["windowSigmaV"] * sigma_v
    cand = [i for i in range(0, i_out + 1) if x[i] >= lo]
    if not cand:
        return {"status": "refused", "code": "edge-not-significant"}
    i_pk = cand[0]
    for i in cand:
        if t[i] > t[i_pk]:
            i_pk = i
    t_pk = t[i_pk]
    if not (t_pk > 0) or (sn > 0 and t_pk < R["significanceSigma"] * sn):
        return {"status": "refused", "code": "edge-not-significant"}
    target = f * t_pk
    j = -1
    for i in range(i_out, i_pk, -1):
        if t[i] < target and t[i - 1] >= target:
            j = i
            break
    if j < 0:
        return {"status": "refused", "code": "edge-not-significant"}
    x_edge = x[j - 1] + (target - t[j - 1]) * (x[j] - x[j - 1]) / (t[j] - t[j - 1])
    a = max(0, j - 3)
    b = min(n - 1, j + 1)
    xs = x[a:b + 1]
    ts = t[a:b + 1]
    slope = np.polyfit(xs, ts, 1)[0]
    width_x = x[j] - x[j - 1]
    sigma_x = sn * math.sqrt(1 + f * f) / abs(slope) if (sn > 0 and slope != 0) else 0.0
    x_t = x_edge - EDGE["cf"] * sigma_v
    if x_t < R["separableSigmaV"] * sigma_v:
        return {"status": "refused", "code": "edge-not-separable"}
    sin_l = abs(math.sin(l))
    theta = x_t + theta0 * sin_l
    terms = {
        "noise": sigma_x,
        "channel": width_x / math.sqrt(12),
        "dispersion": EDGE["cf"] * sigma_sigma_v,
        "shape": tau * sigma_v,
        "theta0": sin_l * sigma_theta0,
    }
    sigma = math.sqrt(sum(v_ * v_ for v_ in terms.values()))
    z68 = stats.norm.ppf((1 + (stats.norm.cdf(1) - stats.norm.cdf(-1))) / 2)
    z95 = stats.norm.ppf((1 + 0.95) / 2)
    return {
        "status": "ok",
        "xOut": float(x_out),
        "xEdge": float(x_edge),
        "xTerminal": float(x_t),
        "tPeak": float(t_pk),
        "sigmaNoise": float(sn),
        "theta": float(theta),
        "sigma": float(sigma),
        "half68": float(z68 * sigma),
        "half95": float(z95 * sigma),
    }


def analysis_cases():
    unc = THR["uncertainty"]
    ch = SYN["channels"]
    out = []
    for s in INP["b4"]:
        sv = s["sigmaV"]
        r = analyse(s["l"], s["temperature"], sv, TH0, unc["sigmaTheta0KmS"], unc["sigmaSigmaVFraction"] * sv, SCH,
                    unc["tauShape"], ch["count"], ch["widthKmSAtRest"])
        out.append({"world": s["world"], "l": s["l"], **r})
    return out


def column():
    s = INP["b5"]
    v = np.sort(channel_velocities(SYN["channels"]["count"], SYN["channels"]["widthKmSAtRest"]) )
    # the generator's temperature array is in ascending frequency order = descending velocity
    vv = channel_velocities(SYN["channels"]["count"], SYN["channels"]["widthKmSAtRest"])
    T = np.asarray(s["temperature"])
    order = np.argsort(vv)
    integral = float(np.trapz(T[order], vv[order]))
    return {"coefficient": CN, "integralKKmS": integral, "columnCm2": CN * integral, "generatorColumnCm2": s["columnCm2"]}


def main():
    out = {
        "format": "gravitas.radio-oracle-results/1",
        "tools": {"python": sys.version.split()[0], "numpy": np.__version__, "scipy": __import__("scipy").__version__,
                  "astropy": __import__("astropy").__version__},
        "doppler": doppler(),
        "los": los(),
        "spectra": spectra(),
        "edge": EDGE,
        "analysis": analysis_cases(),
        "column": column(),
    }
    sys.stdout.write(json.dumps(out) + "\n")


if __name__ == "__main__":
    main()
