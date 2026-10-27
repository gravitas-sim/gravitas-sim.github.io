"""Independent implementation of the crater-chronology functions for Prompt 196's gate.

Run with: python3 -I oracle.py  (numpy and scipy only; nothing of Gravitas runs).
It reads the committed thresholds (the coefficients as typed there) and a grid, and
writes oracle-results.json. It shares the recalled coefficients with the spike, so it
checks the implementation, never the table.
"""
import json, sys, math
import numpy as np
from scipy import stats, optimize

root = sys.argv[1]
th = json.load(open(f"{root}/tests/fixtures/crater-chronology-gate/thresholds.json"))
fr = json.load(open(f"{root}/frames/craters-regions.json"))
a = th["functions"]["lunarProduction"]["a"]
ch = th["functions"]["lunarChronology"]
c1, lam, c2 = ch["c1"], ch["lambda"], ch["c2"]


def pf(D):
    L = np.log10(np.asarray(D, dtype=float))
    # np.polyval wants the highest degree first
    return 10.0 ** np.polyval(a[::-1], L)


def n1(T):
    T = np.asarray(T, dtype=float)
    return c1 * np.expm1(lam * T) + c2 * T


def age(N):
    if N <= 0:
        return 0.0
    if N > float(n1(4.5)):
        return math.inf
    return optimize.brentq(lambda t: float(n1(t)) - N, 0.0, 4.5, xtol=1e-15, rtol=1e-14)


def garwood(n, level=0.95):
    al = 1 - level
    lo = 0.0 if n == 0 else stats.chi2.ppf(al / 2, 2 * n) / 2
    hi = stats.chi2.ppf(1 - al / 2, 2 * (n + 1)) / 2
    return float(lo), float(hi)


Dg = np.logspace(-2, np.log10(300), 40)
Tg = [0.01, 0.05, 0.1, 0.5, 1, 2, 3, 3.5, 3.9, 4.2, 4.5]
counts = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765,
          10, 20, 50, 100, 200, 500, 1000, 3000, 5000, 9000]
area = 2.0e5
out = {
    "tool": {"python": sys.version.split()[0], "numpy": np.__version__, "scipy": __import__("scipy").__version__,
             "flags": "python3 -I"},
    "D": [float(x) for x in Dg],
    "pf": [float(x) for x in pf(Dg)],
    "T": Tg,
    "n1": [float(n1(t)) for t in Tg],
    "inverse": [age(float(n1(t))) for t in Tg],
    "area": area,
    "counts": counts,
    "intervals": {},
    "o1": {},
}
for dMin in (1.0, 3.0):
    f = float(pf(1.0) / pf(dMin))
    rows = []
    for n in counts:
        lo, hi = garwood(n)
        rows.append({"n": n, "lo": lo, "hi": hi,
                     "ageLo": age(lo / area * f), "ageHi": age(hi / area * f),
                     "agePoint": age(n / area * f)})
    out["intervals"][str(dMin)] = {"factor": f, "rows": rows}
for k, r in fr["regions"].items():
    if r["body"] != "moon":
        continue
    kpp = r["geometry"]["kmPerPixelAtCentre"]
    dMin = max(8 * kpp, 1.0)
    out["o1"][k] = {"kmPerPixel": kpp, "dMin": dMin, "area": r["areaKm2"],
                    "expectedAt3_5": float(r["areaKm2"] * pf(dMin) / pf(1.0) * n1(3.5))}
json.dump(out, open(f"{root}/tests/fixtures/crater-chronology-gate/oracle-results.json", "w"), indent=1)
print("oracle written")
