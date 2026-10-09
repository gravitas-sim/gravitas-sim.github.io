"""Offline reference for the low-z linear fit: weighted mean of mu - 5 log10(cz)
over the raw rows with zHD < 0.1, weights 1/sigma^2, and the implied H0.
Reads the raw CSV (not the shipped derivative). Output: results/lowz-ref.json."""
import csv, json, numpy as np, scipy
C = 299792.458
rows = [r for r in csv.DictReader(open("sources/DES-SN5YR_HD.csv")) if float(r["zHD"]) < 0.1]
z = np.array([float(r["zHD"]) for r in rows]); mu = np.array([float(r["MU"]) for r in rows]); e = np.array([float(r["MUERR_FINAL"]) for r in rows])
y = mu - 5 * np.log10(C * z)
w = 1 / e**2
c0 = np.sum(w * y) / np.sum(w)
# the free-slope straight line, for the slope the core reports
A = np.vstack([np.ones_like(z), np.log10(C * z)]).T
W = np.sqrt(w)
coef, *_ = np.linalg.lstsq(A * W[:, None], mu * W, rcond=None)
json.dump(dict(n=len(z), c0=c0, H0=10 ** ((25 - c0) / 5), freeSlope=dict(intercept=coef[0], slope=coef[1]), scipy=scipy.__version__, numpy=np.__version__), open("results/lowz-ref.json", "w"), indent=1)
print(len(z), c0, 10 ** ((25 - c0) / 5), coef)
