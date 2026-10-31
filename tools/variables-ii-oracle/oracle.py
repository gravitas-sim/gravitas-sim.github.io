#!/usr/bin/env python3
"""The independent oracle of the variables-II features (Prompt 223, VARIABLES_II.md).

Shares no code with js/kernels/variables/: it decodes the SU Dra sector 15 sidecar
(variables/tess-su-dra-s15.json, table-columns/1: little-endian integers, value =
offset + step * q) itself and computes with numpy and astropy 6.0.1's
LombScargle(nterms=3) (Astropy Collaboration 2022, ApJ 935, 167; VanderPlas and
Ivezic 2015, ApJ 812, 18):

  - the three-term periodogram's best period on [0.3, 1.2] d;
  - at that period, and at a fixed period given on the command line (the kernel's own),
    the model coefficients, the peak-to-peak amplitude, R21, R31, phi21 and phi31.

Usage: python3 tools/variables-ii-oracle/oracle.py [kernel_period_days]
Writes tests/fixtures/variables-ii/oracle-results.json.
"""
import base64
import json
import sys
from pathlib import Path

import numpy as np
from astropy.timeseries import LombScargle
import astropy

ROOT = Path(__file__).resolve().parents[2]
FIX = ROOT / "tests/fixtures/variables-ii"
NTERMS = 3


def decode(col):
    dt = {"int16": "<i2", "int32": "<i4"}[col["type"]]
    q = np.frombuffer(base64.b64decode(col["data"]), dtype=dt).astype(float)
    return col["offset"] + col["step"] * q


def load():
    d = json.loads((ROOT / "variables/tess-su-dra-s15.json").read_text())
    t, flux, err = (decode(c) for c in d["columns"])
    return t, -2.5 * np.log10(flux)


def astropy_model(t, y, period):
    """The coefficients through astropy's model_parameters (its own design matrix), t0 = t[0] reference."""
    ls = LombScargle(t, y, nterms=NTERMS, fit_mean=True, center_data=False)
    f = 1.0 / period
    # astropy fits y = theta0 + sum theta_{2k-1} sin(2 pi k f t) + theta_{2k} cos(2 pi k f t) with t as given;
    # shifting the origin to t[0] makes the phases the kernel's reference.
    ls0 = LombScargle(t - t[0], y, nterms=NTERMS, fit_mean=True, center_data=False)
    th = ls0.model_parameters(f)
    out = {"mean": float(th[0]), "coefficients": []}
    amps, phis = [], []
    for k in range(1, NTERMS + 1):
        s, c = th[2 * k - 1], th[2 * k]  # sin then cos
        out["coefficients"].append({"cos": float(c), "sin": float(s)})
        amps.append(float(np.hypot(c, s)))
        phis.append(float(np.arctan2(-s, c)))
    ph = np.linspace(0, 1, 7200, endpoint=False)
    model = ls0.model(ph * period, f)
    amp = float(model.max() - model.min())
    wrap = lambda x: float(np.mod(x, 2 * np.pi))
    out.update(
        amplitude=amp,
        r21=amps[1] / amps[0],
        r31=amps[2] / amps[0],
        phi21=wrap(phis[1] - 2 * phis[0]),
        phi31=wrap(phis[2] - 3 * phis[0]),
    )
    return out


def main():
    t, y = load()
    freq = np.linspace(1 / 1.2, 1 / 0.3, 20000)
    ls = LombScargle(t - t[0], y, nterms=NTERMS)
    p = ls.power(freq, method='chi2')
    f0 = freq[int(np.argmax(p))]
    # refine on a fine grid around the peak
    fine = np.linspace(f0 - 2e-3, f0 + 2e-3, 4001)
    pf = ls.power(fine, method='chi2')
    fbest = float(fine[int(np.argmax(pf))])
    period = 1 / fbest
    res = {
        "format": "gravitas.variables-ii-oracle/1",
        "tool": f"astropy {astropy.__version__} LombScargle(nterms={NTERMS}), numpy {np.__version__}",
        "input": {"n": int(len(t)), "file": "variables/tess-su-dra-s15.json", "magnitude": "-2.5 log10(flux)"},
        "period": period,
        "atOraclePeriod": astropy_model(t, y, period),
    }
    if len(sys.argv) > 1:
        kp = float(sys.argv[1])
        res["kernelPeriod"] = kp
        res["atKernelPeriod"] = astropy_model(t, y, kp)
    (FIX / "oracle-results.json").write_text(json.dumps(res, indent=2) + "\n")
    print(json.dumps({k: v for k, v in res.items() if k in ("period",)}))


if __name__ == "__main__":
    main()
