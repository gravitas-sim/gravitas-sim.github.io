#!/usr/bin/env python3
"""The independent oracle of the numerics instruments (NUMERICS_INSTRUMENTS.md).

Run as:  /usr/bin/python3 -E oracle.py <inputs.json> <oracle-results.json>

numpy and scipy only; no Gravitas code is imported or read. Every integrator,
step control, window rule, sum and interpolation below is written here from the
definitions in tests/fixtures/numerics-instruments/thresholds.json. The inputs
file holds data only (exported separations and positions, the seeded synthetic
series, the decimated TESS series, the MIST slice).
"""
import json
import math
import sys

import numpy as np
import scipy
from scipy.integrate import solve_ivp
from scipy.interpolate import CubicSpline
from scipy.signal import lombscargle

P = 2 * math.pi
M0, M1 = 0.75, 0.25


# ----------------------------------------------------------------- two bodies
def kepler_pair(e):
    r = 1.0 - e
    v = math.sqrt((1.0 + e) / r)
    x = np.array([[-M1 * r, 0.0, 0.0], [M0 * r, 0.0, 0.0]])
    w = np.array([[0.0, -M1 * v, 0.0], [0.0, M0 * v, 0.0]])
    return x, w


def acc(x):
    d = x[1] - x[0]
    r2 = float(d @ d)
    inv = 1.0 / (r2 * math.sqrt(r2))
    return np.array([M1 * inv * d, -M0 * inv * d])


def energy(x, v):
    d = x[1] - x[0]
    return 0.5 * M0 * float(v[0] @ v[0]) + 0.5 * M1 * float(v[1] @ v[1]) - M0 * M1 / math.sqrt(float(d @ d))


def sep(x):
    d = x[1] - x[0]
    return math.sqrt(float(d @ d))


def step_euler(x, v, h):
    a = acc(x)
    return x + h * v, v + h * a


def step_symplectic(x, v, h):
    v = v + h * acc(x)
    return x + h * v, v


def step_verlet(x, v, h):
    v = v + 0.5 * h * acc(x)
    x = x + h * v
    v = v + 0.5 * h * acc(x)
    return x, v


def step_rk4(x, v, h):
    k1x, k1v = v, acc(x)
    k2x, k2v = v + 0.5 * h * k1v, acc(x + 0.5 * h * k1x)
    k3x, k3v = v + 0.5 * h * k2v, acc(x + 0.5 * h * k2x)
    k4x, k4v = v + h * k3v, acc(x + h * k3x)
    return (x + h / 6.0 * (k1x + 2 * k2x + 2 * k3x + k4x),
            v + h / 6.0 * (k1v + 2 * k2v + 2 * k3v + k4v))


STEPS = {"explicit-euler": step_euler, "symplectic-euler": step_symplectic,
         "velocity-verlet": step_verlet, "rk4": step_rk4}


def ledger(e, scheme, h, span):
    x, v = kepler_pair(e)
    n = int(math.floor(span / h + 0.5))
    e0 = energy(x, v)
    s0 = sep(x)
    end = 0.0
    worst = 0.0
    worst_half = 0.0
    for k in range(1, n + 1):
        x, v = STEPS[scheme](x, v, h)
        end = (energy(x, v) - e0) / abs(e0)
        worst = max(worst, abs(end))
        if k == n // 2:
            worst_half = worst
    return {"steps": n, "end": end, "maxAbs": worst, "maxAbsHalf": worst_half, "sepRatio": sep(x) / s0}


def two_step(e, scheme, h, span):
    c = ledger(e, scheme, h, span)
    f = ledger(e, scheme, h / 2, span)
    secular = abs(c["end"]) >= 0.5 * c["maxAbs"] and abs(f["end"]) >= 0.5 * f["maxAbs"]
    # AM2: the kind from the first half of the span against the whole.
    grows = c["maxAbs"] >= 1.5 * c["maxAbsHalf"] and f["maxAbs"] >= 1.5 * f["maxAbsHalf"]
    return {"coarse": c, "fine": f, "kind": "secular" if secular else "oscillating",
            "kind2": "secular" if grows else "oscillating",
            "orderEnd2": math.log2(abs(c["end"] / f["end"])) if grows else None,
            "ratioEnd": c["end"] / f["end"], "ratioMax": c["maxAbs"] / f["maxAbs"],
            "orderEnd": math.log2(abs(c["end"] / f["end"])) if secular else None,
            "orderMax": math.log2(c["maxAbs"] / f["maxAbs"])}


def i1():
    cases = {
        "b": (0.0, "explicit-euler", 1.0 / 1024, 1.0),
        "c": (0.5, "velocity-verlet", P / 200, 2 * P),
        "d": (0.5, "rk4", P / 200, 2 * P),
        "e": (0.5, "symplectic-euler", P / 400, 2 * P),
        "f": (0.0, "explicit-euler", P / 1000, 3 * P),
        "i2": (0.5, "velocity-verlet", P / 200, 2.25 * P),
    }
    return {k: two_step(*c) for k, c in cases.items()}


# ------------------------------------------------ Dormand-Prince 5(4), own control
A = [[], [1 / 5], [3 / 40, 9 / 40], [44 / 45, -56 / 15, 32 / 9],
     [19372 / 6561, -25360 / 2187, 64448 / 6561, -212 / 729],
     [9017 / 3168, -355 / 33, 46732 / 5247, 49 / 176, -5103 / 18656],
     [35 / 384, 0.0, 500 / 1113, 125 / 192, -2187 / 6784, 11 / 84]]
B5 = [35 / 384, 0.0, 500 / 1113, 125 / 192, -2187 / 6784, 11 / 84, 0.0]
B4 = [5179 / 57600, 0.0, 7571 / 16695, 393 / 640, -92097 / 339200, 187 / 2100, 1 / 40]


def rhs(y):
    x = y[:6].reshape(2, 3)
    return np.concatenate([y[6:], acc(x).reshape(6)])


def dopri(y0, span, tol, h0=1e-3, budget=200000, history=True):
    y = y0.copy()
    t = 0.0
    h = min(h0, span)
    k = [rhs(y)] + [None] * 6
    acc_n = rej_n = 0
    hist = []
    while t < span:
        if t + h > span:
            h = span - t
        for s in range(1, 7):
            yy = y.copy()
            for r in range(s):
                yy = yy + h * A[s][r] * k[r]
            k[s] = rhs(yy)
        new = y.copy()
        err_v = np.zeros_like(y)
        for r in range(7):
            new = new + h * B5[r] * k[r]
            err_v = err_v + h * (B5[r] - B4[r]) * k[r]
        scale = tol * (1.0 + np.maximum(np.abs(y), np.abs(new)))
        err = float(np.max(np.abs(err_v) / scale))
        if err <= 1.0:
            t += h
            y = new
            k[0] = k[6]
            acc_n += 1
            if history:
                hist.append((t, h, sep(y[:6].reshape(2, 3))))
        else:
            rej_n += 1
        if acc_n + rej_n >= budget:
            raise RuntimeError("step budget")
        factor = 5.0 if not err > 0 else min(5.0, max(0.2, 0.9 * err ** (-0.2)))
        h = h * factor
    return y, acc_n, rej_n, hist


def i2():
    x, v = kepler_pair(0.9)
    y0 = np.concatenate([x.reshape(6), v.reshape(6)])
    tol = 1e-9
    y, a, r, hist = dopri(y0, P, tol)
    hs = np.array([p[1] for p in hist])
    rs = np.array([p[2] for p in hist])
    slope = float(np.polyfit(np.log(rs), np.log(hs), 1)[0])
    lo = int(np.argmin(hs))
    hi = int(np.argmax(hs))
    ref = solve_ivp(lambda t, yy: rhs(yy), (0.0, P), y0, method="DOP853", rtol=1e-13, atol=1e-13)
    rk45 = solve_ivp(lambda t, yy: rhs(yy), (0.0, P), y0, method="RK45", rtol=1e-9, atol=1e-9)
    # The cost at equal error, by the same definition, with this file's integrators.
    yr, _, _, _ = dopri(y0, P, tol / 1000, history=False)
    err_ad = float(np.max(np.abs(y[:6] - yr[:6])))
    fixed = None
    for kk in range(4, 23):
        n = 2 ** kk
        h = P / n
        xx, vv = x.copy(), v.copy()
        for _ in range(n):
            xx, vv = step_rk4(xx, vv, h)
        err = float(np.max(np.abs(xx.reshape(6) - yr[:6])))
        if err <= err_ad:
            fixed = {"fixedSteps": n, "errFixed": err}
            break
    # AM2: without the first step (the caller's guess) and the last (cut to the span).
    h2, r2 = hs[1:-1], rs[1:-1]
    lo2, hi2 = int(np.argmin(h2)), int(np.argmax(h2))
    v2 = {"hMin": float(h2[lo2]), "rAtHMin": float(r2[lo2]), "hMax": float(h2[hi2]), "rAtHMax": float(r2[hi2]),
          "slope": float(np.polyfit(np.log(r2), np.log(h2), 1)[0]), "rMin": float(rs.min()), "rMax": float(rs.max())}
    return {"v2": v2, "accepted": a, "rejected": r, "hMin": float(hs[lo]), "tAtHMin": hist[lo][0],
            "hMax": float(hs[hi]), "tAtHMax": hist[hi][0], "slope": slope,
            "final": y[:6].tolist(), "dop853": ref.y[:6, -1].tolist(),
            "rk45": {"steps": int(len(rk45.t) - 1), "nfev": int(rk45.nfev)},
            "cost": {"errAdaptive": err_ad, "adaptiveEvaluations": 1 + 6 * (a + r), **(fixed or {})}}


# ------------------------------------------------------------ divergence rates
def classify(series):
    pts = [(p["t"], p["d"]) for p in series if p["d"] is not None and math.isfinite(p["d"])]
    out = {"behavior": None, "rate": None, "r2": 0.0, "from": None, "to": None}
    if len(pts) < 2:
        return {**out, "behavior": "insufficient"}
    first = next((d for _, d in pts if d > 0), 0.0)
    growth = pts[-1][1] / first if first > 0 else math.inf
    if all(d <= 1e-12 for _, d in pts):
        return {**out, "behavior": "identical"}
    t_all = np.array([t for t, _ in pts])
    d_all = np.array([d for _, d in pts])
    lin_r2 = 0.0
    if len(pts) >= 3:
        c = np.polyfit(t_all, d_all, 1)
        tot = float(np.sum((d_all - d_all.mean()) ** 2))
        lin_r2 = 1 - float(np.sum((d_all - np.polyval(c, t_all)) ** 2)) / tot if tot > 0 else 0.0
    # The window: from 1.5 times the first separation to 0.2 of the largest.
    pos = [(t, d) for t, d in pts if d > 1e-12]
    win = None
    if len(pos) >= 10:
        lower = max(1e-12, pos[0][1] * 1.5)
        upper = 0.2 * max(d for _, d in pos)
        if upper > lower:
            w = [(t, d) for t, d in pos if lower <= d <= upper]
            if len(w) >= 10 and math.log(w[-1][1] / w[0][1]) >= 3:
                win = w
    if win is None:
        b = "bounded" if growth < 3 else ("linear" if lin_r2 >= 0.98 else "insufficient")
        return {**out, "behavior": b}
    tw = np.array([t for t, _ in win])
    lw = np.log(np.array([d for _, d in win]))
    slope, icpt = np.polyfit(tw, lw, 1)
    tot = float(np.sum((lw - lw.mean()) ** 2))
    r2 = 1 - float(np.sum((lw - (slope * tw + icpt)) ** 2)) / tot if tot > 0 else 0.0
    out = {**out, "from": float(tw[0]), "to": float(tw[-1])}
    if not slope > 0:
        return {**out, "behavior": "bounded"}
    if r2 < 0.98:
        return {**out, "behavior": "linear" if lin_r2 > r2 else "insufficient", "r2": r2}
    if (tw[-1] - tw[0]) * slope < 2:
        return {**out, "behavior": "insufficient", "r2": r2}
    return {**out, "behavior": "exponential", "rate": float(slope), "r2": r2}


ORDER = ["identical", "bounded", "linear", "saturated", "insufficient"]


def ensemble(series_list, level=0.9):
    pairs = [classify(s) for s in series_list]
    counts = {b: 0 for b in ORDER + ["exponential"]}
    for p in pairs:
        counts[p["behavior"]] += 1
    n = len(pairs)
    out = {"n": n, "counts": counts, "pairs": pairs}
    if n < 10:
        return {**out, "refused": "too-few-pairs"}
    ex = [p for p in pairs if p["behavior"] == "exponential"]
    if len(ex) < 10 or len(ex) < 0.5 * n:
        best = ORDER[0]
        for b in ORDER:
            if counts[b] > counts[best]:
                best = b
        return {**out, "refused": "not-exponential", "behavior": best}
    rates = np.array([p["rate"] for p in ex])
    return {**out, "median": float(np.quantile(rates, 0.5)),
            "lo": float(np.quantile(rates, (1 - level) / 2)),
            "hi": float(np.quantile(rates, (1 + level) / 2))}


def i3(inp):
    a8b = inp["i3e"]["series"]
    pa = np.array(inp["i3e1"]["a"])
    pb = np.array(inp["i3e1"]["b"])
    growth = [s[-1]["d"] / s[0]["d"] for s in a8b]
    return {"b": ensemble(inp["i3b"]), "e": ensemble(a8b),
            "e1": np.sqrt(np.sum((pa - pb) ** 2, axis=1)).tolist(),
            "largestGrowth": float(max(growth))}


# ------------------------------------------------------------------ periodogram
def periodogram(t, y, fmin, fmax, n):
    t = np.asarray(t, float)
    y = np.asarray(y, float)
    d = y - y.mean()
    f = np.linspace(fmin, fmax, n)
    ph = 2 * np.pi * np.outer(f, t)
    c = np.cos(ph) @ d
    s = np.sin(ph) @ d
    tot = float(d @ d)
    power = 2 * (c ** 2 + s ** 2) / (len(t) * tot)
    step = (fmax - fmin) / (n - 1)
    res = 1.0 / (t.max() - t.min())
    jp = int(np.argmax(power))
    fp = float(f[jp])
    if 0 < jp < n - 1:
        curve = power[jp - 1] - 2 * power[jp] + power[jp + 1]
        if curve < 0:
            fp += 0.5 * (power[jp - 1] - power[jp + 1]) * step / curve
    half = power[jp] / 2

    def cross(direction):
        j = jp
        while 0 <= j + direction < n:
            if power[j + direction] <= half:
                return f[j] + direction * step * (power[j] - half) / (power[j] - power[j + direction])
            j += direction
        return None

    left, right = cross(-1), cross(1)
    best = None
    for j in range(n):
        if abs(f[j] - f[jp]) <= res:
            continue
        up = j == 0 or power[j] >= power[j - 1]
        down = j == n - 1 or power[j] >= power[j + 1]
        if up and down and (best is None or power[j] > power[best]):
            best = j
    # Reported beside it: scipy's classical Lomb-Scargle on the same grid.
    ls = lombscargle(t, d, 2 * np.pi * f)
    return {"power": power.tolist(), "peakFrequency": fp, "peakPower": float(power[jp]),
            "amplitude": float(2 * math.sqrt(c[jp] ** 2 + s[jp] ** 2) / len(t)),
            "fwhm": None if left is None or right is None else float(right - left),
            "secondFrequency": None if best is None else float(f[best]),
            "secondPower": None if best is None else float(power[best]),
            "resolution": res, "scipyLombScarglePeak": float(f[int(np.argmax(ls))])}


def i4(inp):
    t = np.arange(64.0)
    y = 3 + 2 * np.cos(2 * np.pi * t / 8)
    d = y - y.mean()
    X = np.fft.rfft(d)
    fourier = (2 * np.abs(X[1:32]) ** 2 / (64 * float(d @ d))).tolist()
    t2 = np.arange(256.0)
    width = periodogram(t2, np.cos(2 * np.pi * t2 / 4), 0.2, 0.3, 1639)
    del width["power"]
    return {"fourier": fourier, "width": width,
            "d": periodogram(inp["i4d"]["t"], inp["i4d"]["y"], 0.1, 1.0, 541),
            "f": periodogram(inp["i4f"]["t"], inp["i4f"]["y"], 1 / 15, 1 / 2, 521)}


# ---------------------------------------------------------------- interpolation
def held_out(xs, ys):
    xs = np.asarray(xs, float)
    ys = np.asarray(ys, float)
    el, es = [], []
    for k in range(1, len(xs) - 1):
        x = np.delete(xs, k)
        y = np.delete(ys, k)
        el.append(float(np.interp(xs[k], x, y) - ys[k]))
        es.append(float(CubicSpline(x, y, bc_type="natural")(xs[k]) - ys[k]))
    el, es = np.array(el), np.array(es)
    rl, rs = float(np.sqrt(np.mean(el ** 2))), float(np.sqrt(np.mean(es ** 2)))
    big = max(rl, rs)
    closer = "tie" if big <= 1e-12 or abs(rl - rs) <= 1e-9 * big else ("linear" if rl < rs else "spline")
    return {"errLinear": el.tolist(), "errSpline": es.tolist(), "rmsLinear": rl, "rmsSpline": rs,
            "maxLinear": float(np.max(np.abs(el))), "maxSpline": float(np.max(np.abs(es))), "closer": closer}


def sorted_unique(mass, r):
    order = np.argsort(np.asarray(mass, float), kind="stable")
    m = np.asarray(mass, float)[order]
    v = np.asarray(r, float)[order]
    keep = np.concatenate([[True], np.diff(m) > 0])
    return m[keep], v[keep]


def i5(inp):
    out = {"sin": held_out(np.linspace(0, math.pi, 9), np.sin(np.linspace(0, math.pi, 9))),
           "runge": held_out(np.linspace(-1, 1, 11), 1 / (1 + 25 * np.linspace(-1, 1, 11) ** 2)),
           "exp": held_out([0, 0.1, 0.25, 0.5, 0.9, 1.4, 2, 3], np.exp([0, 0.1, 0.25, 0.5, 0.9, 1.4, 2, 3]))}
    ages = sorted(inp["i5c"]["ages"], key=lambda a: a["logAge"])
    mid = ages[len(ages) // 2]
    m, r = sorted_unique(mid["mass"], mid["r"])
    out["mass"] = {"logAge": mid["logAge"], "n": int(len(m)), **held_out(m, r)}
    out["age"] = {}
    for mass in (0.6, 0.8, 1.0):
        xs, ys = [], []
        for a in ages:
            mm, rr = sorted_unique(a["mass"], a["r"])
            if mm[0] <= mass <= mm[-1]:
                xs.append(a["logAge"])
                ys.append(float(np.interp(mass, mm, rr)))
        out["age"][str(mass)] = {"n": len(xs), "refused": "too-few"} if len(xs) < 5 else {"n": len(xs), **held_out(xs, ys)}
    return out


def main():
    with open(sys.argv[1]) as fh:
        inp = json.load(fh)
    out = {"format": "gravitas.numerics-instruments-oracle/1",
           "python": sys.version.split()[0], "numpy": np.__version__, "scipy": scipy.__version__,
           "I1": i1(), "I2": i2(), "I3": i3(inp), "I4": i4(inp), "I5": i5(inp)}
    with open(sys.argv[2], "w") as fh:
        json.dump(out, fh, indent=1)
        fh.write("\n")


if __name__ == "__main__":
    main()
