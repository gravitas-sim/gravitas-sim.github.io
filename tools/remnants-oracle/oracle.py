#!/usr/bin/env python3
"""The independent oracle of the remnants kernel (Prompt 222, REMNANTS.md).

Shares no code with js/kernels/remnants/: it reads the Montreal sequences'
raw text with its own parser, the pin (tests/fixtures/remnants/cooling-pin.json)
and the cluster white dwarfs, and computes with numpy and scipy

  - the cooling law's coefficient tau and the model term delta, from the text of
    thresholds.json (contract.coolingLaw, contract.modelTerm, AM1) on the pin
    rows and, for the effect of the pin's thinning, on the raw rows;
  - the law's age at every pin row, and the residual statistics B1 and B5;
  - the initial-final mass relation at 500 masses, and the outcome
    probabilities at 500 masses from scipy.stats.uniform;
  - the applicability numbers of the cluster white dwarfs (E1).

Usage: python3 tools/remnants-oracle/oracle.py <directory of seq_NNN_thick.txt>
Writes tests/fixtures/remnants/oracle-results.json.
"""
import json
import re
import sys
from pathlib import Path

import numpy as np
from scipy import stats

ROOT = Path(__file__).resolve().parents[2]
FIX = ROOT / "tests/fixtures/remnants"
TH = json.loads((FIX / "thresholds.json").read_text())
PIN = json.loads((FIX / "cooling-pin.json").read_text())
CL = json.loads((FIX / "cluster-white-dwarfs.json").read_text())

L_SUN = 3.828e33
LO, HI = TH["contract"]["coolingDomain"]["logLSun"]
EXP = 5.0 / 7.0
A_REF = 0.99 / (0.495 / 12 + 0.495 / 16)
MASSES = TH["contract"]["data"]["masses"]
Z95 = 1.959963984540054


def parse_raw(path):
    """[[Teff, logL, R/Rsun, age]] per model, from the three-line records."""
    rows = []
    for line in Path(path).read_text().splitlines():
        f = line.split()
        if len(f) == 6 and re.fullmatch(r"\d+", f[0]) and re.fullmatch(r"[0-9.]+", f[1]):
            teff, _logg, r_cm, age, l_erg = (float(v) for v in f[1:])
            rows.append([teff, float(np.log10(l_erg / L_SUN)), r_cm / 6.957e10, age])
    return rows


def inside(rows):
    return [r for r in rows if LO <= r[1] <= HI]


def trap(x):
    x = np.asarray(x, dtype=float)
    n = len(x)
    w = np.empty(n)
    w[0] = abs(x[1] - x[0]) / 2
    w[-1] = abs(x[-1] - x[-2]) / 2
    for i in range(1, n - 1):
        w[i] = abs(x[i - 1] - x[i + 1]) / 2
    return w


def wquant(values, weights, p):
    order = np.argsort(values, kind="stable")
    v = np.asarray(values)[order]
    w = np.asarray(weights)[order]
    c = np.cumsum(w / w.sum())
    return float(v[np.searchsorted(c, p - 1e-12, side="left")])


def law(m, lum, tau):
    return tau * m**EXP * lum**-EXP


def calibrate(by_mass):
    num = den = 0.0
    for m in MASSES["calibrateTau"]:
        r = np.array(inside(by_mass[f"{m:.1f}"]))
        w = trap(r[:, 1])
        num += np.sum(w * np.log(r[:, 3] * (10 ** r[:, 1]) ** EXP / m**EXP))
        den += w.sum()
    tau = float(np.exp(num / den))
    vals, wts = [], []
    for m in MASSES["calibrateModelTerm"]:
        r = np.array(inside(by_mass[f"{m:.1f}"]))
        w = trap(r[:, 1])
        res = np.abs(np.log(law(m, 10 ** r[:, 1], tau) / r[:, 3]))
        vals += list(res)
        wts += list(w / w.sum() / len(MASSES["calibrateModelTerm"]))
    return tau, wquant(vals, wts, 0.95)


def residual_stats(by_mass, masses, tau):
    vals, wts, per_mass = [], [], {}
    for m in masses:
        r = np.array(inside(by_mass[f"{m:.1f}"]))
        w = trap(r[:, 1])
        res = np.abs(np.log(law(m, 10 ** r[:, 1], tau) / r[:, 3]))
        wn = w / w.sum()
        vals += list(res)
        wts += list(wn / len(masses))
        per_mass[f"{m:.1f}"] = {
            "median": wquant(res, wn, 0.5),
            "p90": wquant(res, wn, 0.9),
            "max": float(res.max()),
        }
    return {
        "median": wquant(vals, wts, 0.5),
        "p90": wquant(vals, wts, 0.9),
        "max": float(max(vals)),
        "perMass": per_mass,
    }


def main():
    pin = {m: v["rows"] for m, v in PIN["masses"].items()}
    tau_pin, delta_pin = calibrate(pin)
    out = {
        "tauPin": tau_pin,
        "deltaPin": delta_pin,
        "ages": {
            m: [float(law(float(m), 10 ** r[1], tau_pin)) for r in rows if LO <= r[1] <= HI]
            for m, rows in pin.items()
        },
        "b1": residual_stats(pin, [0.5, 0.7, 0.8, 0.9, 1.0], tau_pin),
        "calibrationMass": residual_stats(pin, [0.6], tau_pin),
        "b5": residual_stats(pin, [1.2], tau_pin),
        "coverageHeldOutMasses": MASSES["heldOut"],
    }
    if len(sys.argv) > 1:
        raw = {
            f"{int(p.stem.split('_')[1]) / 100:.1f}": parse_raw(p)
            for p in sorted(Path(sys.argv[1]).glob("seq_*_thick.txt"))
        }
        tau_raw, delta_raw = calibrate(raw)
        out["rawResolution"] = {
            "tau": tau_raw,
            "delta": delta_raw,
            "tauRelativeToPin": tau_raw / tau_pin - 1,
            "deltaRelativeToPin": delta_raw / delta_pin - 1,
            "b1": residual_stats(raw, [0.5, 0.7, 0.8, 0.9, 1.0], tau_raw),
            "rowsInDomain": {m: len(inside(v)) for m, v in raw.items()},
        }
    # the relations, at 500 masses
    mi = np.linspace(0.83, 7.5, 500)
    def mist(m):
        return np.where(m < 2.85, 0.080 * m + 0.489, np.where(m < 3.60, 0.187 * m + 0.184, 0.107 * m + 0.471))
    def parsec(m):
        return np.where(m < 2.80, 0.0873 * m + 0.476, np.where(m < 3.65, 0.181 * m + 0.210, 0.0835 * m + 0.565))
    mi_p = np.linspace(0.87, 7.5, 500)
    out["ifmr"] = {
        "mist": {"mi": mi.tolist(), "mf": mist(mi).tolist()},
        "parsec": {"mi": mi_p.tolist(), "mf": parsec(mi_p).tolist()},
    }
    m = np.linspace(0.8, 120, 500)
    wd = stats.uniform(loc=7.0, scale=2.5)
    bh = stats.uniform(loc=20.0, scale=20.0)
    p_wd = wd.sf(m)
    p_bh = bh.cdf(m)
    out["outcomes"] = {
        "m": m.tolist(),
        "whiteDwarf": p_wd.tolist(),
        "blackHole": p_bh.tolist(),
        "neutronStar": (1 - p_wd - p_bh).tolist(),
    }
    # E1 applicability: the MIST relation against the cluster white dwarfs
    rows = [r for r in CL["rows"] if not r.get("outlier")]
    mf = np.array([r["finalMass"] for r in rows])
    mi_c = np.array([r["initialMassMist"] for r in rows])
    res = mf - mist(mi_c)
    sig_param = np.hypot(
        np.where(mi_c < 2.85, 0.016, np.where(mi_c < 3.6, 0.061, 0.016)) * mi_c,
        np.where(mi_c < 2.85, 0.030, np.where(mi_c < 3.6, 0.199, 0.077)),
    )
    half = Z95 * np.hypot(0.06, sig_param)
    out["clusterWhiteDwarfs"] = {
        "n": len(rows),
        "rms": float(np.sqrt(np.mean(res**2))),
        "insideFraction": float(np.mean(np.abs(res) <= half)),
        "nAll": len(CL["rows"]),
    }
    (FIX / "oracle-results.json").write_text(json.dumps(out) + "\n")
    print(json.dumps({k: out[k] for k in ("tauPin", "deltaPin")}))


if __name__ == "__main__":
    main()
