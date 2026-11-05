#!/usr/bin/env python3
"""
The independent oracle of the X-ray counts kernel (Roadmap III, Prompt 243).

Run offline, never by a test, with the interpreter isolated (python 3.9.22, numpy 1.26.4,
scipy 1.13.1, astropy 6.0.1 were the versions of the pinned run):

    /usr/local/bin/python3.9 -I tools/xray-oracle/oracle.py > tests/fixtures/xray/oracle-results.json

Nothing here reads Gravitas code. It reads the committed thresholds (the grids and cases of
the legs, as data) and tests/fixtures/xray/oracle-inputs.json (the series of legs B3 and B4 as
plain arrays, written by tools/xray-oracle/make-inputs.mjs). The kernel's answers are
compared with these in tools/xray-validate.mjs. Pieces:

  garwood      scipy.stats.chi2.ppf: the exact Poisson interval's two ends
  clopper      scipy.stats.beta.ppf: the Clopper-Pearson ends, HR = 2 p - 1
  gls          astropy.timeseries.LombScargle (generalized, floating mean, standard
               normalization, method 'cython') on the grid the roadmap's period search uses
  significance the same statistic in a numpy matrix form (checked against astropy on the
               observed series), with this file's own random generator (numpy default_rng) and
               19999 simulations of the constant-rate Poisson null
  net          the net-rate profile interval by scipy.optimize: the background rate maximised
               by minimize_scalar (never the closed form), the root by brentq
  nethardness  the net hardness interval, the same, with the total net rate maximised too
"""
import json
import math
import sys
from pathlib import Path

import numpy as np
from scipy import optimize, stats
from astropy.timeseries import LombScargle

ROOT = Path(__file__).resolve().parents[2]
FIX = ROOT / "tests" / "fixtures" / "xray"
THR = json.loads((FIX / "thresholds.json").read_text())
INP = json.loads((FIX / "oracle-inputs.json").read_text())
LIM = {c["id"]: c["limits"] for c in THR["checks"]}
rng = np.random.default_rng(THR["seeds"]["oracleNumpy"])


def garwood():
    L = LIM["B1.garwoodOracle"]
    lo, hi = L["counts"][0], L["counts"][1]
    counts = list(range(lo, hi + 1)) + L["counts"][2:]
    out = []
    for n in counts:
        for T in L["exposures"]:
            for level in L["levels"]:
                a = (1 - level) / 2
                lo_ = 0.0 if n == 0 else stats.chi2.ppf(a, 2 * n) / 2 / T
                hi_ = stats.chi2.ppf(1 - a, 2 * n + 2) / 2 / T
                out.append({"counts": n, "exposure": T, "level": level, "lo": lo_, "hi": hi_})
    return out


def clopper():
    L = LIM["B2.clopperPearsonOracle"]
    cases = []
    for N in L["smallN"]:
        for H in range(0, N + 1):
            cases.append((N, H))
    for N in L["largeN"]:
        for H in sorted({0, 1, N // 10, N // 2, N - 1, N}):
            cases.append((N, H))
    out = []
    for N, H in cases:
        for level in L["levels"]:
            a = (1 - level) / 2
            plo = 0.0 if H == 0 else stats.beta.ppf(a, H, N - H + 1)
            phi = 1.0 if H == N else stats.beta.ppf(1 - a, H + 1, N - H)
            out.append({"N": N, "H": H, "level": level, "lo": 2 * plo - 1, "hi": 2 * phi - 1})
    return out


def grid_of(t, search):
    T = t.max() - t.min()
    fmin = 1.0 / search["maxPeriod"]
    fmax = 1.0 / search["minPeriod"]
    df = 1.0 / (search["oversample"] * T)
    m = int(math.floor((fmax - fmin) / df)) + 1
    return fmin + df * np.arange(m), T, fmin, df, m


def gls():
    g = INP["gls"]
    t = np.array(g["t"])
    y = np.array(g["y"])
    dy = np.array(g["dy"])
    freq, T, fmin, df, m = grid_of(t, INP["search"])
    ls = LombScargle(t, y, dy, fit_mean=True, center_data=True)
    power = ls.power(freq[: g["frequencies"]], method="cython", normalization="standard")
    full = ls.power(freq, method="cython", normalization="standard")
    return {
        "frequencies": g["frequencies"],
        "power": [float(v) for v in power],
        "m": m,
        "fmin": fmin,
        "df": df,
        "maxPower": float(full.max()),
        "bestIndex": int(full.argmax()),
    }


def matrix_powers(t, w, ys, freq):
    """GLS power for each row of ys on freq (weights w sum to 1): numpy matrix form."""
    tm = float(w @ t)
    ang = 2 * np.pi * np.outer(t - tm, freq)
    c = np.cos(ang)
    s = np.sin(ang)
    C = w @ c
    S = w @ s
    CC = w @ (c * c) - C * C
    SS = w @ (s * s) - S * S
    CS = w @ (c * s) - C * S
    D = CC * SS - CS * CS
    Y = ys @ w
    YY = ((ys - Y[:, None]) ** 2) @ w
    YC = (ys * w) @ c - Y[:, None] * C
    YS = (ys * w) @ s - Y[:, None] * S
    P = (SS * YC**2 + CC * YS**2 - 2 * CS * YC * YS) / (YY[:, None] * D)
    return np.clip(P, 0, 1)


def significance():
    L = LIM["B4.significanceOracle"]
    nsim = L["nSimOracle"]
    out = []
    for item in INP["significance"]:
        t = np.array(item["t"])
        e = np.array(item["expo"])
        c = np.array(item["counts"], dtype=float)
        lam = c.sum() / e.sum()
        w = e / e.sum()
        freq, T, fmin, df, m = grid_of(t, INP["search"])
        y = (c / e)[None, :]
        obs = matrix_powers(t, w, y, freq)[0]
        # the same statistic through astropy, as a check of the matrix form
        astro = LombScargle(t, c / e, np.sqrt(lam / e), fit_mean=True, center_data=True).power(
            freq, method="cython", normalization="standard"
        )
        exceed = 0
        batch = 500
        done = 0
        first_check = None
        while done < nsim:
            b = min(batch, nsim - done)
            counts = rng.poisson(lam * e, size=(b, len(e)))
            ys = counts / e
            P = matrix_powers(t, w, ys, freq)
            exceed += int((P.max(axis=1) >= obs.max()).sum())
            if first_check is None:
                ls = LombScargle(t, ys[0], np.sqrt(lam / e), fit_mean=True, center_data=True)
                first_check = float(
                    np.abs(ls.power(freq, method="cython", normalization="standard") - P[0]).max()
                )
            done += b
        out.append(
            {
                "seed": item["seed"],
                "amplitude": item["amplitude"],
                "p": (1 + exceed) / (nsim + 1),
                "nSim": nsim,
                "maxPower": float(obs.max()),
                "maxPowerAstropy": float(astro.max()),
                "matrixVsAstropyObserved": float(np.abs(astro - obs).max()),
                "matrixVsAstropySim0": first_check,
            }
        )
    return out


def loglike(S, B, Ns, Nb, T, Tb, r):
    mu_s = T * (S + r * B)
    mu_b = Tb * B
    if (mu_s <= 0 and Ns > 0) or (mu_b <= 0 and Nb > 0):
        return -1e300
    a = Ns * math.log(mu_s) if Ns > 0 else 0.0
    b = Nb * math.log(mu_b) if Nb > 0 else 0.0
    return a - mu_s + b - mu_b


def best_bkg(S, Ns, Nb, T, Tb, r):
    hi = 10.0 * (Ns + Nb + 1.0) / min(T, Tb) + 10.0
    res = optimize.minimize_scalar(
        lambda B: -loglike(S, B, Ns, Nb, T, Tb, r),
        bounds=(0.0, hi),
        method="bounded",
        options={"xatol": 1e-13},
    )
    # the bounded search never evaluates the end points; check the lower one (B = 0)
    cand = [(-res.fun, res.x), (loglike(S, 0.0, Ns, Nb, T, Tb, r), 0.0)]
    return max(cand)


def prof_loglike(S, Ns, Nb, T, Tb, r):
    return best_bkg(S, Ns, Nb, T, Tb, r)[0]


def prof_max(Ns, Nb, T, Tb, r):
    hi = 10.0 * (Ns + 1.0) / T + 10.0
    res = optimize.minimize_scalar(
        lambda S: -prof_loglike(S, Ns, Nb, T, Tb, r),
        bounds=(0.0, hi),
        method="bounded",
        options={"xatol": 1e-13},
    )
    cand = [(-res.fun, res.x), (prof_loglike(0.0, Ns, Nb, T, Tb, r), 0.0)]
    return max(cand)


def net():
    L = LIM["B5.netRateOracle"]
    out = []
    for (Ns, Nb, T, Tb, r) in L["cases"]:
        Lmax, shat = prof_max(Ns, Nb, T, Tb, r)
        for level in L["levels"]:
            thr = stats.chi2.ppf(level, 1)

            def f(S):
                return 2 * (Lmax - prof_loglike(S, Ns, Nb, T, Tb, r)) - thr

            lo = 0.0 if (shat == 0 or f(0.0) <= 0) else optimize.brentq(f, 0.0, shat, xtol=1e-14, rtol=1e-14)
            top = max(shat, 1.0 / T) * 2
            while f(top) < 0:
                top *= 2
            hi = optimize.brentq(f, shat, top, xtol=1e-14, rtol=1e-14)
            out.append({"case": [Ns, Nb, T, Tb, r], "level": level, "shat": shat, "lo": lo, "hi": hi})
    return out


def nethardness():
    L = LIM["B6.netHardnessOracle"]
    T = L["T"]
    r = L["r"]
    level = L["level"]
    thr = stats.chi2.ppf(level, 1)
    out = []
    for (Nss, Nbs, Nsh, Nbh) in L["cases"]:
        Ls, ss = prof_max(Nss, Nbs, T, T, r)
        Lh, sh = prof_max(Nsh, Nbh, T, T, r)
        hhat = (sh - ss) / (sh + ss)

        def dev(h):
            a = (1 - h) / 2
            b = (1 + h) / 2

            def tot(sg):
                return -(prof_loglike(a * sg, Nss, Nbs, T, T, r) + prof_loglike(b * sg, Nsh, Nbh, T, T, r))

            top = 50.0 * (Nss + Nsh + 1.0) / T + 50.0
            res = optimize.minimize_scalar(tot, bounds=(0.0, top), method="bounded", options={"xatol": 1e-12})
            best = min(res.fun, tot(0.0))
            return 2 * (Ls + Lh + best)

        def f(h):
            return dev(h) - thr

        lo = -1.0
        h = hhat
        while h > -1:
            nxt = max(-1.0, h - 0.02)
            if f(nxt) > 0:
                lo = optimize.brentq(f, nxt, h, xtol=1e-12)
                break
            h = nxt
            if nxt == -1.0:
                break
        hi = 1.0
        h = hhat
        while h < 1:
            nxt = min(1.0, h + 0.02)
            if f(nxt) > 0:
                hi = optimize.brentq(f, h, nxt, xtol=1e-12)
                break
            h = nxt
            if nxt == 1.0:
                break
        out.append({"case": [Nss, Nbs, Nsh, Nbh], "hr": hhat, "lo": lo, "hi": hi})
    return out


def main():
    res = {
        "format": "gravitas.xray-oracle-results/1",
        "versions": {
            "python": sys.version.split()[0],
            "numpy": np.__version__,
            "scipy": __import__("scipy").__version__,
            "astropy": __import__("astropy").__version__,
        },
        "garwood": garwood(),
        "clopper": clopper(),
        "gls": gls(),
        "significance": significance(),
        "net": net(),
        "nethardness": nethardness(),
    }
    print(json.dumps(res))


if __name__ == "__main__":
    main()
