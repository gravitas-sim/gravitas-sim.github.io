"""
Independent oracle for the crater-counting kernel (Prompt 195, CRATER_COUNTING.md).

    <venv>/bin/python -I tools/craters-oracle/oracle.py <inputs.json> <results.json>

scipy and numpy only; no Gravitas code runs. The statistics are written out here
from their definitions: Garwood's exact Poisson interval from chi-square
quantiles, the Clopper-Pearson interval of a binomial proportion from beta
quantiles (and the density ratio it maps to), the maximum-likelihood Pareto
index and its exact chi-square interval. The list of diameters is made here
(numpy.random.default_rng) and written into the results so that the kernel is
run on exactly these numbers. This is a general-statistics oracle, not a
crater-statistics tool: a pin of craterstats is not available offline.
"""

import json
import sys

import numpy as np
from scipy import stats

inputs = json.load(open(sys.argv[1]))

L = inputs["list"]
rng = np.random.default_rng(L["seed"])
# Lomax draws shifted to a Pareto of minimum dMin: x = dMin (1 + lomax(a)).
d = L["dMinKm"] * (1.0 + rng.pareto(L["index"], L["n"]))
d = np.sort(d)[::-1]  # large to small
area = float(L["areaKm2"])


def garwood(n, level, scale=1.0):
    a = (1.0 - level) / 2.0
    lo = 0.0 if n == 0 else 0.5 * stats.chi2.ppf(a, 2 * n)
    hi = 0.5 * stats.chi2.ppf(1.0 - a, 2 * n + 2)
    return lo / scale, hi / scale


curve = []
c = inputs["curve"]
for k in range(c["thresholds"]):
    t = L["dMinKm"] * c["factor"] ** k
    n = int(np.sum(d >= t))
    row = {"D": t, "N": n, "density": n / area, "intervals": {}}
    for lv in c["levels"]:
        lo, hi = garwood(n, lv, area)
        row["intervals"][str(lv)] = {"lo": lo, "hi": hi}
    curve.append(row)


def clopper(k, n, level):
    a = (1.0 - level) / 2.0
    lo = 0.0 if k == 0 else stats.beta.ppf(a, k, n - k + 1)
    hi = 1.0 if k == n else stats.beta.ppf(1.0 - a, k + 1, n - k)
    return float(lo), float(hi)


ratios = []
for r in inputs["ratioCases"]:
    n = r["na"] + r["nb"]
    lo, hi = clopper(r["na"], n, r["level"])
    f = r["areaB"] / r["areaA"]
    ratios.append(
        {
            **r,
            "pLo": lo,
            "pHi": hi,
            "rLo": lo / (1.0 - lo) * f,
            "rHi": None if hi == 1.0 else hi / (1.0 - hi) * f,
        }
    )

slopes = []
for dm in inputs["slope"]["dMinKm"]:
    x = d[d >= dm]
    n = len(x)
    s = float(np.sum(np.log(x / dm)))
    fit = stats.pareto.fit(x, floc=0, fscale=dm)
    entry = {"dMin": dm, "n": n, "S": s, "bFit": float(fit[0]), "bClosed": n / s, "intervals": {}}
    for lv in inputs["slope"]["levels"]:
        a = (1.0 - lv) / 2.0
        entry["intervals"][str(lv)] = {
            "lo": float(stats.chi2.ppf(a, 2 * n) / (2.0 * s)),
            "hi": float(stats.chi2.ppf(1.0 - a, 2 * n) / (2.0 * s)),
        }
    slopes.append(entry)

out = {
    "format": "gravitas.craters-oracle-results/1",
    "prompt": 195,
    "diametersKm": [float(v) for v in d],
    "areaKm2": area,
    "curve": curve,
    "ratios": ratios,
    "slopes": slopes,
}
with open(sys.argv[2], "w") as fh:
    json.dump(out, fh, indent=1)
    fh.write("\n")
