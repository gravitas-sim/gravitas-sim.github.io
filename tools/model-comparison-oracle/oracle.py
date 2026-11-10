"""Independent oracle for Prompt 261 (model comparison within valid model classes).

Run as `python3 -E tools/model-comparison-oracle/oracle.py OUT.json`. It imports
numpy, scipy and astropy only; it reads no Gravitas code, no file of the tree
and no network. The thresholds it is judged against are
tests/fixtures/model-comparison/thresholds.json, committed before this file.

It draws its own inputs (the kernel is then run on exactly those inputs):

  numpy.random.default_rng(261), used in this order:
    1. y_slope   30 normals   y = 1 + 0.12 x + e,        x = 0..29
    2. y_null    30 normals   y = 1 + e
    3. y_sinus   30 normals   y = 1 + 0.4 sin(2 pi x / 12) + 0.3 cos(2 pi x / 12) + e
    4. y_crit    40 normals   y = 2 + 0.7 x + e,         x = 1 + i / 4
    5. the searched-case candidates, each in the order P, phi, a, e (40 normals),
       P uniform [4, 20], phi uniform [0, 2 pi), a uniform [0.55, 0.95], until one
       has an oracle p value (20000 draws, default_rng(261000 + k)) in [0.02, 0.30].
  default_rng(2611) and default_rng(2612): the two independent null ensembles
  (20000 draws each) for the chosen case.

The statistic is the maximum, over the grid, of the fraction of the variance one
sinusoid and a floating mean explain, computed here by numpy least squares on a
[1, cos, sin] design at every frequency (an implementation that shares no code
with js/kernels/variables/period.js), and checked against astropy's
LombScargle standard power. The p value is (1 + #{T* >= T}) / (1 + B).
"""

import json
import math
import sys
import types

# astropy.table imports PyYAML at import time for table serialisation, which the
# periodogram never uses; PyYAML is not installed here and nothing is downloaded,
# so an empty module stands in (recorded in the output as astropyYamlStub).
if "yaml" not in sys.modules:
    try:
        import yaml  # noqa: F401
        YAML_STUB = False
    except ModuleNotFoundError:
        sys.modules["yaml"] = types.ModuleType("yaml")
        YAML_STUB = True
else:
    YAML_STUB = False

import numpy as np
import scipy
import scipy.stats as st
import astropy
from astropy.timeseries import LombScargle

N_SERIES = 40
MIN_P, MAX_P, OVERSAMPLE = 2.0, 40.0, 4
B_ORACLE = 20000


def series_time():
    return np.array([i + 0.5 * (((7 * i) % 11) / 10.0 - 0.5) for i in range(N_SERIES)])


def freq_grid(t):
    T = float(t.max() - t.min())
    fmin, fmax = 1.0 / MAX_P, 1.0 / MIN_P
    df = 1.0 / (OVERSAMPLE * T)
    m = int(math.floor((fmax - fmin) / df)) + 1
    return fmin + df * np.arange(m)


def max_power_batch(t, Y, freqs):
    """Y is B x n. Max over freqs of 1 - RSS_full / RSS_0, floating mean."""
    n = len(t)
    Yc = Y - Y.mean(axis=1, keepdims=True)
    rss0 = (Yc ** 2).sum(axis=1)
    best = np.zeros(Y.shape[0])
    tm = t.mean()
    for f in freqs:
        x = 2 * math.pi * f * (t - tm)
        D = np.column_stack([np.ones(n), np.cos(x), np.sin(x)])
        coef, *_ = np.linalg.lstsq(D, Y.T, rcond=None)
        res = Y.T - D @ coef
        rss = (res ** 2).sum(axis=0)
        best = np.maximum(best, 1.0 - rss / rss0)
    return best


def calibrated_p(t, y, freqs, rng, B):
    obs = float(max_power_batch(t, y[None, :], freqs)[0])
    sd = math.sqrt(((y - y.mean()) ** 2).sum() / (len(y) - 1))
    sims = y.mean() + sd * rng.standard_normal((B, len(y)))
    T = max_power_batch(t, sims, freqs)
    return obs, (1 + int((T >= obs).sum())) / (1 + B), T


def rss_ls(D, y):
    coef, *_ = np.linalg.lstsq(D, y, rcond=None)
    r = y - D @ coef
    return float((r ** 2).sum()), coef, D @ coef


def crit_from_fit(y, fitted, k):
    """K = k + 1; lnL from scipy's normal log pdf at sigma_hat = sqrt(RSS / n)."""
    n = len(y)
    rss = float(((y - fitted) ** 2).sum())
    sigma = math.sqrt(rss / n)
    lnL = float(st.norm.logpdf(y, loc=fitted, scale=sigma).sum())
    K = k + 1
    aic = -2 * lnL + 2 * K
    aicc = aic + 2 * K * (K + 1) / (n - K - 1)
    bic = -2 * lnL + K * math.log(n)
    return {"k": k, "K": K, "rss": rss, "lnL": lnL, "aic": aic, "aicc": aicc, "bic": bic}


def hand_case():
    n = 40
    out = []
    for rss, k in ((100.0, 2), (80.0, 3)):
        K = k + 1
        lnL = -(n / 2.0) * (math.log(2 * math.pi * rss / n) + 1.0)
        aic = -2 * lnL + 2 * K
        out.append({
            "rss": rss, "k": k, "K": K, "lnL": lnL, "aic": aic,
            "aicc": aic + 2 * K * (K + 1) / (n - K - 1),
            "bic": -2 * lnL + K * math.log(n),
        })
    return {"n": n, "models": out}


def f_test_from_rss(rss0, p0, rss1, p1, n):
    d1, d2 = p1 - p0, n - p1
    F = ((rss0 - rss1) / d1) / (rss1 / d2)
    return {"F": F, "d1": d1, "d2": d2, "p": float(st.f.sf(F, d1, d2))}


def press(D, y):
    H = D @ np.linalg.pinv(D)
    r = y - H @ y
    loo = r / (1.0 - np.diag(H))
    return {"press_over_n": float((loo ** 2).mean()), "residuals": loo.tolist()}


def main(out_path):
    rng = np.random.default_rng(261)
    x30 = np.arange(30, dtype=float)
    y_slope = 1 + 0.12 * x30 + rng.standard_normal(30)
    y_null = 1 + rng.standard_normal(30)
    y_sinus = 1 + 0.4 * np.sin(2 * np.pi * x30 / 12) + 0.3 * np.cos(2 * np.pi * x30 / 12) + rng.standard_normal(30)
    x40 = 1 + np.arange(40) / 4.0
    y_crit = 2 + 0.7 * x40 + rng.standard_normal(40)

    res = {
        "format": "gravitas.model-comparison-oracle/1",
        "versions": {"python": sys.version.split()[0], "numpy": np.__version__, "scipy": scipy.__version__, "astropy": astropy.__version__},
        "prompt": "261",
        "astropyYamlStub": YAML_STUB,
    }

    # A1: line against constant, scipy.stats.linregress
    a1 = []
    for name, y in (("slope", y_slope), ("null", y_null)):
        lr = st.linregress(x30, y)
        t_stat = lr.slope / lr.stderr
        rss0, _, _ = rss_ls(np.ones((30, 1)), y)
        rss1, _, _ = rss_ls(np.column_stack([np.ones(30), x30]), y)
        a1.append({"name": name, "y": y.tolist(), "t": float(t_stat), "F_t2": float(t_stat ** 2),
                   "p_linregress": float(lr.pvalue), "rss0": rss0, "rss1": rss1,
                   "ftest": f_test_from_rss(rss0, 1, rss1, 2, 30)})
    res["A1"] = a1

    # A2: constant against a sinusoid of period 12 (two added parameters)
    Ds = np.column_stack([np.ones(30), np.cos(2 * np.pi * x30 / 12), np.sin(2 * np.pi * x30 / 12)])
    rss0, _, _ = rss_ls(np.ones((30, 1)), y_sinus)
    rss1, _, _ = rss_ls(Ds, y_sinus)
    res["A2"] = {"y": y_sinus.tolist(), "rss0": rss0, "rss1": rss1, "ftest": f_test_from_rss(rss0, 1, rss1, 3, 30)}

    # A3: criteria for the non-nested pair and the polynomial ladder
    D1 = np.column_stack([np.ones(40), x40])
    D2 = np.column_stack([np.ones(40), np.log(x40), 1.0 / x40])
    pair = []
    for name, D in (("line", D1), ("log+inverse", D2)):
        _, _, fitted = rss_ls(D, y_crit)
        pair.append({"name": name, **crit_from_fit(y_crit, fitted, D.shape[1])})
    ladder = []
    for deg in range(4):
        D = np.vander(x40, deg + 1, increasing=True)
        _, _, fitted = rss_ls(D, y_crit)
        ladder.append({"degree": deg, **crit_from_fit(y_crit, fitted, deg + 1)})

    def pref(models, key):
        return int(np.argmin([m[key] for m in models]))

    res["A3"] = {"x": x40.tolist(), "y": y_crit.tolist(), "pair": pair, "ladder": ladder, "hand": hand_case(),
                 "preferred": {"pair": {k: pref(pair, k) for k in ("aic", "aicc", "bic")},
                               "ladder": {k: pref(ladder, k) for k in ("aic", "aicc", "bic")}}}

    # A5: PRESS by the hat matrix
    res["A5"] = {
        "null_constant": press(np.ones((30, 1)), y_null),
        "null_line": press(np.column_stack([np.ones(30), x30]), y_null),
        "crit_line": press(D1, y_crit),
        "crit_loginv": press(D2, y_crit),
    }

    # C3: exact expected false-preference rates, n = 30, one regular parameter
    n = 30
    thr_aic = (n - 2) * (math.exp(2.0 / n) - 1)
    thr_bic = (n - 2) * (math.exp(math.log(n) / n) - 1)
    res["C3"] = {"n": n, "thresholdAic": thr_aic, "thresholdBic": thr_bic,
                 "expectedAic": float(st.f.sf(thr_aic, 1, n - 2)), "expectedBic": float(st.f.sf(thr_bic, 1, n - 2))}

    # the searched case
    t = series_time()
    freqs = freq_grid(t)
    case = None
    cands = []
    for k in range(200):
        P = rng.uniform(4, 20)
        phi = rng.uniform(0, 2 * math.pi)
        a = rng.uniform(0.55, 0.95)
        e = rng.standard_normal(N_SERIES)
        y = 1 + a * np.sin(2 * math.pi * t / P + phi) + e
        obs, p, _ = calibrated_p(t, y, freqs, np.random.default_rng(261000 + k), B_ORACLE)
        cands.append({"k": k, "P": P, "phi": phi, "a": a, "observed": obs, "p": p})
        if 0.02 <= p <= 0.30:
            case = {"k": k, "P": P, "phi": phi, "a": a, "y": y}
            break
    if case is None:
        raise SystemExit("no candidate in [0.02, 0.30] in 200 draws")
    y = case["y"]
    obs, p1, T1 = calibrated_p(t, y, freqs, np.random.default_rng(2611), B_ORACLE)
    _, p2, T2 = calibrated_p(t, y, freqs, np.random.default_rng(2612), B_ORACLE)

    ls = LombScargle(t, y, fit_mean=True, center_data=True)
    ap = ls.power(freqs, method="cython", normalization="standard")
    astro_stat = float(ap.max())
    fap_baluev = float(ls.false_alarm_probability(astro_stat, method="baluev", minimum_frequency=float(freqs[0]), maximum_frequency=float(freqs[-1])))
    # astropy against the oracle's own numpy statistic on 25 null draws
    sd = math.sqrt(((y - y.mean()) ** 2).sum() / (N_SERIES - 1))
    r = np.random.default_rng(99)
    sims = y.mean() + sd * r.standard_normal((25, N_SERIES))
    own = max_power_batch(t, sims, freqs)
    ast = [float(LombScargle(t, s, fit_mean=True, center_data=True).power(freqs, method="cython", normalization="standard").max()) for s in sims]
    res["searched"] = {
        "t": t.tolist(), "freqs": freqs.tolist(), "case": {k: v for k, v in case.items() if k != "y"}, "y": y.tolist(),
        "candidatesTried": len(cands), "candidates": cands,
        "observed": obs, "astropyObserved": astro_stat,
        "p2611": p1, "p2612": p2, "B": B_ORACLE,
        "pMean": 0.5 * (p1 + p2),
        "falseAlarmBaluev": fap_baluev,
        "numpyVsAstropy25": float(np.max(np.abs(own - np.array(ast)) / np.array(ast))),
        "nullStatQuantiles": {str(q): float(np.quantile(T1, q)) for q in (0.5, 0.9, 0.95, 0.99)},
        "nGrid": int(len(freqs)),
    }
    with open(out_path, "w") as fh:
        json.dump(res, fh, indent=1)
        fh.write("\n")


if __name__ == "__main__":
    main(sys.argv[1])
