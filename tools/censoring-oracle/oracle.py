"""The independent oracle of the censoring and truncation gate (Roadmap III, Prompt 262 Part A).

/usr/bin/python3 -E tools/censoring-oracle/oracle.py <thresholds.json> <out.json>

An independent implementation: it reads no Gravitas code and no output of the
prototype. numpy, scipy and the standard library only. Its output is pinned
before the prototype is run.

It holds, for the legs of the committed thresholds file:
  - the reference samples (generated here by numpy default_rng) and, for each,
    the product-limit estimate by its own code and by scipy.stats.ecdf on the
    flipped data, the log-rank check by its own code and by scipy.stats.logrank;
  - the truncation estimate by the closed-form product and by a fixed-point
    maximisation of the conditional likelihood;
  - the effective volumes by scipy.integrate.quad;
  - the hand examples;
  - the oracle's own coverage ensembles (C1o and C2o).
"""

import hashlib
import json
import math
import sys
import time

import numpy as np
import scipy
from scipy import stats
from scipy.integrate import quad
from scipy.special import ndtr, ndtri

thr_path, out_path = sys.argv[1], sys.argv[2]
thr_bytes = open(thr_path, "rb").read()
thr = json.loads(thr_bytes)
CONST = thr["constants"]
LEVEL = CONST["level"]
ALPHA = CONST["independenceAlpha"]
MIN_DET = CONST["minDetections"]
MIN_RISK = CONST["minRiskAtFrom"]
MIN_GRP = CONST["minGroupDetections"]
Z = float(-ndtri((1.0 - LEVEL) / 2.0))
CMAX = {"K1": 0.8, "K2": 2.5, "K3": 5.0}

t0 = time.process_time()

# ----------------------------------------------------------------------------
# generators
# ----------------------------------------------------------------------------


def gen_censored(rng, n, cmax):
    x = rng.gamma(2.0, 1.0, size=n)
    c = rng.uniform(0.0, cmax, size=n)
    det = x >= c
    value = np.where(det, x, c)
    return value, ~det, c


def gen_truncated(rng, n):
    xs, us = [], []
    have = 0
    while have < n:
        m = max(4 * (n - have), 256)
        x = rng.standard_normal(m)
        d = rng.uniform(0.0, 1.0, size=m) ** (1.0 / 3.0)
        d = np.maximum(d, 1e-300)
        u = 0.5 + 2.0 * np.log10(d)
        keep = x >= u
        xs.append(x[keep])
        us.append(u[keep])
        have += int(keep.sum())
    x = np.concatenate(xs)[:n]
    u = np.concatenate(us)[:n]
    return x, u


def round_to(a, step):
    return a if step is None else np.round(a / step) * step


# ----------------------------------------------------------------------------
# the product-limit estimator, left censoring by the flip: my own code
# ----------------------------------------------------------------------------


def km_left(value, censored, floor):
    value = np.asarray(value, float)
    cens = np.asarray(censored, bool)
    M = float(value.max())
    y = M - value
    ev_y = np.unique(y[~cens])
    S = 1.0
    support = []  # (value, mass)
    ds, ns, Ss = [], [], []
    for t in ev_y:
        n = int((y >= t).sum())
        d = int(((y == t) & ~cens).sum())
        S_new = S * (1.0 - d / n)
        support.append((M - float(t), S - S_new))
        ds.append(d)
        ns.append(n)
        Ss.append(S_new)
        S = S_new
    tau = float(y.max())
    tail = S
    # area under S on [0, tau]
    area = 0.0
    prev_t, prev_S = 0.0, 1.0
    seg = []
    for t, s in zip(ev_y, Ss):
        area += prev_S * (float(t) - prev_t)
        prev_t, prev_S = float(t), s
    area += prev_S * (tau - prev_t)
    # A_i = integral of S from t_i to tau (reverse cumulative sum of S times the gap to the next event time, or to tau)
    nxt = list(ev_y[1:]) + [tau]
    contrib = [Ss[i] * (float(nxt[i]) - float(ev_y[i])) for i in range(len(ev_y))]
    A = list(np.cumsum(contrib[::-1])[::-1]) if contrib else []
    var = 0.0
    for a, d, n in zip(A, ds, ns):
        if n > d:
            var += a * a * d / (n * (n - d))
    out = {
        "M": M,
        "support": [[v, m] for v, m in support],
        "tailMass": tail,
        "variance": var,
        "se": math.sqrt(var),
        "ySurvivalAtEvents": [[float(t), s] for t, s in zip(ev_y, Ss)],
    }
    if tail == 0.0:
        out["status"] = "complete"
        out["mean"] = M - area
        out["meanLow"] = M - area
        out["meanHigh"] = M - area
    else:
        out["status"] = "bounded"
        out["mean"] = None
        out["meanHigh"] = M - area
        if floor is not None:
            out["meanLow"] = M - (area + tail * ((M - floor) - tau))
        else:
            out["meanLow"] = None
    return out


def scipy_km_masses(value, censored, ev_y_list):
    """scipy.stats.ecdf on the flipped data: S at the event times."""
    value = np.asarray(value, float)
    cens = np.asarray(censored, bool)
    M = float(value.max())
    y = M - value
    sample = stats.CensoredData(uncensored=y[~cens], right=y[cens])
    res = stats.ecdf(sample)
    return [float(res.sf.evaluate(t)) for t in ev_y_list]


def logrank_check(value, censored, limit):
    value = np.asarray(value, float)
    cens = np.asarray(censored, bool)
    limit = np.asarray(limit, float)
    med = float(np.median(limit))
    g1 = limit <= med
    g2 = ~g1
    if g1.sum() == 0 or g2.sum() == 0:
        return {"checked": False, "reason": "group-too-small", "n1": int(g1.sum()), "n2": int(g2.sum())}
    det1 = int((~cens & g1).sum())
    det2 = int((~cens & g2).sum())
    if det1 < MIN_GRP or det2 < MIN_GRP:
        return {"checked": False, "reason": "group-too-small", "n1": int(g1.sum()), "n2": int(g2.sum()), "det1": det1, "det2": det2}
    M = float(value.max())
    y = M - value
    ev = np.unique(y[~cens])
    O1 = E1 = V = 0.0
    for t in ev:
        atr = y >= t
        n = int(atr.sum())
        n1 = int((atr & g1).sum())
        n2 = n - n1
        dd = (y == t) & ~cens
        d = int(dd.sum())
        d1 = int((dd & g1).sum())
        O1 += d1
        E1 += d * n1 / n
        if n > 1:
            V += d * (n1 / n) * (n2 / n) * (n - d) / (n - 1)
    z = (O1 - E1) / math.sqrt(V) if V > 0 else float("nan")
    p = float(2.0 * ndtr(-abs(z)))
    s1 = stats.CensoredData(uncensored=y[~cens & g1], right=y[cens & g1])
    s2 = stats.CensoredData(uncensored=y[~cens & g2], right=y[cens & g2])
    r = stats.logrank(s1, s2)
    return {
        "checked": True,
        "reason": "ok",
        "n1": int(g1.sum()),
        "n2": int(g2.sum()),
        "det1": det1,
        "det2": det2,
        "z": z,
        "p": p,
        "flag": bool(p < ALPHA),
        "scipyZ": float(r.statistic),
        "scipyP": float(r.pvalue),
    }


# ----------------------------------------------------------------------------
# the truncation estimator: closed form, and the fixed-point maximisation
# ----------------------------------------------------------------------------


def cm_closed(x, u, frm, min_risk):
    x = np.asarray(x, float)
    u = np.asarray(u, float)
    keep = x >= frm
    xk, uk = x[keep], u[keep]
    xs = np.unique(xk)
    S = 1.0
    support, ns, ds, Ss = [], [], [], []
    for t in xs:
        n = int(((uk <= t) & (xk >= t)).sum())
        d = int((xk == t).sum())
        S_new = S * (1.0 - d / n)
        support.append((float(t), S - S_new))
        ns.append(n)
        ds.append(d)
        Ss.append(S_new)
        S = S_new
    mean = sum(v * m for v, m in support)
    xmax = float(xs[-1])
    nxt = list(xs[1:]) + [xmax]
    contrib = [Ss[i] * (float(nxt[i]) - float(xs[i])) for i in range(len(xs))]
    A = list(np.cumsum(contrib[::-1])[::-1])
    var = sum(a * a * d / (n * (n - d)) for a, d, n in zip(A, ds, ns) if n > d)
    return {
        "from": frm,
        "support": [[v, m] for v, m in support],
        "associatedSets": [[float(t), n] for t, n in zip(xs, ns)],
        "riskAtFrom": ns[0],
        "mean": mean,
        "variance": var,
        "se": math.sqrt(var),
        "xmax": xmax,
    }


def cm_fixed_point(x, u, frm, cap=1_000_000, tol=1e-15):
    x = np.asarray(x, float)
    u = np.asarray(u, float)
    keep = x >= frm
    xk, uk = x[keep], u[keep]
    xs, counts = np.unique(xk, return_counts=True)
    m = len(xs)
    W = (xs[:, None] >= uk[None, :]).astype(float)  # m x N: support point k is reachable for row i
    p = np.full(m, 1.0 / m)
    it = 0
    last = None
    for it in range(1, cap + 1):
        D = p @ W
        g = W @ (1.0 / D)
        pn = counts / g
        pn = pn / pn.sum()
        last = float(np.max(np.abs(pn - p)))
        p = pn
        if last < tol:
            break
    return {"support": [[float(v), float(q)] for v, q in zip(xs, p)], "iterations": it, "lastChange": last}


# ----------------------------------------------------------------------------
# the effective volume
# ----------------------------------------------------------------------------


def veff_ramp(dmax, D):
    f = lambda d: (4.0 * math.pi * d * d) / (1.0 + (d / dmax) ** 8)
    v, err = quad(f, 0.0, D, epsabs=0.0, epsrel=1e-13, limit=500)
    return float(v), float(err)


# ----------------------------------------------------------------------------
# I. the hand examples
# ----------------------------------------------------------------------------
hand = {}


def close(a, b, tol=1e-12):
    return abs(a - b) <= tol * max(1.0, abs(b))


# A2
a2 = km_left([2, 3, 5, 6, 7], [False, True, False, True, False], 0.0)
hand["A2"] = {
    "mean": a2["mean"], "variance": a2["variance"], "status": a2["status"], "tailMass": a2["tailMass"],
    "masses": {str(int(v)): m for v, m in a2["support"]},
}
# A3
a3 = km_left([4, 6, 9, 2], [False, False, False, True], 0.0)
hand["A3"] = {
    "status": a3["status"], "meanLow": a3["meanLow"], "meanHigh": a3["meanHigh"],
    "variance": a3["variance"], "tailMass": a3["tailMass"],
    "masses": {str(int(v)): m for v, m in a3["support"]},
}
# A1
a1 = km_left([3, 1, 4, 1.5, 9], [False] * 5, 0.0)
hand["A1"] = {"mean": a1["mean"], "variance": a1["variance"], "status": a1["status"]}
# A4
a4 = cm_closed([2, 5, 4, 6, 3], [1, 2, 4, 3, 3], 2.0, 1)
hand["A4"] = {
    "associatedSets": {str(int(t)): n for t, n in a4["associatedSets"]},
    "masses": {str(int(v)): m for v, m in a4["support"]},
    "mean": a4["mean"], "variance": a4["variance"],
}
# A5
a5 = cm_closed([3, 1, 4, 1.5, 9], [-1e9] * 5, 1.0, 1)
hand["A5"] = {"masses": [m for v, m in a5["support"]], "mean": a5["mean"], "variance": a5["variance"]}
# A6, unit volume V(d) = d^3
d6 = np.array([0.5, 1.0, 2.0])
m6 = np.array([1.0, 2.0, 2.0])
vv = (d6 / m6) ** 3
hand["A6"] = {
    "meanVOverVmax": float(vv.mean()),
    "z": float((vv.mean() - 0.5) * math.sqrt(12 * 3)),
    "sumInverseVmax": float((1.0 / m6**3).sum()),
    "variance": float((1.0 / m6**6).sum()),
}
# A7: step completeness 1 to d=1, 0.5 to d=2, unit volume
v7 = 1.0**3 + 0.5 * (2.0**3 - 1.0**3)
hand["A7"] = {"veff": v7, "inverseVeff": 1.0 / v7}

exp = thr["handExamples"]
hand_ok = (
    close(hand["A2"]["mean"], exp["A2"]["expected"]["mean"])
    and close(hand["A2"]["variance"], exp["A2"]["expected"]["variance"])
    and hand["A2"]["status"] == "complete"
    and close(hand["A3"]["meanLow"], 4.75)
    and close(hand["A3"]["meanHigh"], 5.25)
    and close(hand["A3"]["variance"], 1.671875)
    and close(hand["A3"]["tailMass"], 0.25)
    and close(hand["A1"]["mean"], 3.7)
    and close(hand["A1"]["variance"], 1.632)
    and close(hand["A4"]["mean"], exp["A4"]["expected"]["mean"])
    and close(hand["A4"]["variance"], exp["A4"]["expected"]["variance"])
    and close(hand["A5"]["mean"], 3.7)
    and close(hand["A5"]["variance"], 1.632)
    and close(hand["A6"]["meanVOverVmax"], 0.4166666666666667)
    and close(hand["A6"]["z"], -0.5)
    and close(hand["A6"]["sumInverseVmax"], 1.25)
    and close(hand["A6"]["variance"], 1.03125)
    and close(hand["A7"]["veff"], 4.5)
)
hand["agrees"] = bool(hand_ok)

# ----------------------------------------------------------------------------
# II. the reference samples
# ----------------------------------------------------------------------------
cens_out = []
max_km_vs_scipy = 0.0
for d in thr["referenceSamples"]["censored"]:
    rng = np.random.default_rng(d["seed"])
    value, cens, lim = gen_censored(rng, d["n"], CMAX[d["scenario"]])
    value = round_to(value, d["roundTo"])
    lim = round_to(lim, d["roundTo"])
    if d["forceSmallestLimit"]:
        k = int(np.argmin(value))
        cens = cens.copy()
        cens[k] = True
    rows = [{"value": float(v), "censored": bool(c), "limit": float(l)} for v, c, l in zip(value, cens, lim)]
    km = km_left(value, cens, 0.0)
    ev_y = [t for t, _ in km["ySurvivalAtEvents"]]
    sp = scipy_km_masses(value, cens, ev_y)
    diff = max(abs(a - b) for a, b in zip(sp, [s for _, s in km["ySurvivalAtEvents"]]))
    # masses from scipy's survival at the events
    prev = 1.0
    sp_masses = []
    for s in sp:
        sp_masses.append(prev - s)
        prev = s
    mass_diff = max(abs(a - b[1]) for a, b in zip(sp_masses, km["support"]))
    max_km_vs_scipy = max(max_km_vs_scipy, mass_diff, diff)
    lr = logrank_check(value, cens, lim)
    cens_out.append({"id": d["id"], "design": d, "rows": rows, "floor": 0.0, "km": km, "scipySurvival": sp, "scipyMassDiff": mass_diff, "logrank": lr})

lr_diffs = []
for c in cens_out:
    lr = c["logrank"]
    if lr["checked"]:
        lr_diffs.append({"id": c["id"], "zRel": abs(lr["z"] - lr["scipyZ"]) / max(abs(lr["scipyZ"]), 1e-300), "zAbsRel": abs(abs(lr["z"]) - abs(lr["scipyZ"])) / max(abs(lr["scipyZ"]), 1e-300), "pRel": abs(lr["p"] - lr["scipyP"]) / max(lr["scipyP"], 1e-300)})

trunc_out = []
max_em = 0.0
for d in thr["referenceSamples"]["truncated"]:
    rng = np.random.default_rng(d["seed"])
    x, u = gen_truncated(rng, d["n"])
    x = round_to(x, d["roundTo"])
    u = round_to(u, d["roundTo"])
    frm = float(np.sort(x)[2])
    cm = cm_closed(x, u, frm, 1)
    em = cm_fixed_point(x, u, frm)
    cf = dict((v, m) for v, m in cm["support"])
    diff = max(abs(cf[v] - m) for v, m in em["support"])
    max_em = max(max_em, diff)
    trunc_out.append({"id": d["id"], "design": d, "rows": [{"x": float(a), "u": float(b)} for a, b in zip(x, u)], "from": frm, "minRisk": 1, "cm": cm, "fixedPoint": em, "closedVsFixedPoint": diff})

veff_pairs = []
for dm in [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.5, 2.0]:
    veff_pairs.append((dm, 1.0))
for dm in (0.5, 1.0):
    for D in (0.25, 0.5, 2.0, 3.0):
        veff_pairs.append((dm, D))
veff_out = []
for dm, D in veff_pairs:
    v, e = veff_ramp(dm, D)
    veff_out.append({"dmax": dm, "D": D, "veff": v, "quadError": e})

# ----------------------------------------------------------------------------
# III. the oracle's own ensembles (C1o, C2o)
# ----------------------------------------------------------------------------
cov = {}
for name in ("K1", "K2", "K3"):
    sc = thr["scenarios"]["censoringK"][name]
    n, reps, base = sc["n"], sc["replicates"], sc["baseSeed"]
    hit = bounded = 0
    for r in range(reps):
        rng = np.random.default_rng(base + r)
        value, cens, _ = gen_censored(rng, n, CMAX[name])
        if (~cens).sum() < MIN_DET:
            continue
        k = km_left(value, cens, 0.0)
        lo = k["meanLow"] - Z * k["se"]
        hi = k["meanHigh"] + Z * k["se"]
        bounded += k["status"] == "bounded"
        hit += lo <= 2.0 <= hi
    cov[name] = {"coverage": hit / reps, "bounded": bounded / reps, "replicates": reps}

for name in ("T1", "T2"):
    sc = thr["scenarios"]["truncationT"][name]
    N, frm, reps, base = sc["N"], sc["from"], sc["replicates"], sc["baseSeed"]
    truth = math.exp(-0.5 * frm * frm) / math.sqrt(2 * math.pi) / (1.0 - float(ndtr(frm)))
    hit = refused = 0
    risk = []
    for r in range(reps):
        rng = np.random.default_rng(base + r)
        x, u = gen_truncated(rng, N)
        kk = x >= frm
        xs, us = x[kk], u[kk]
        # associated set at the smallest x >= from
        if len(xs) == 0:
            refused += 1
            continue
        t_min = xs.min()
        risk_at = int(((us <= t_min) & (xs >= t_min)).sum())
        if risk_at < MIN_RISK:
            refused += 1
            continue
        c = cm_closed(x, u, frm, MIN_RISK)
        risk.append(c["riskAtFrom"])
        lo = c["mean"] - Z * c["se"]
        hi = c["mean"] + Z * c["se"]
        hit += lo <= truth <= hi
    cov[name] = {"coverage": hit / reps, "refused": refused, "replicates": reps, "truth": truth, "medianRiskAtFrom": float(np.median(risk)) if risk else None}

out = {
    "format": "gravitas.censoring-truncation-oracle-results/1",
    "thresholdsSha256": hashlib.sha256(thr_bytes).hexdigest(),
    "environment": {"python": sys.version.split()[0], "numpy": np.__version__, "scipy": scipy.__version__, "executable": "/usr/bin/python3 -E"},
    "z": Z,
    "hand": hand,
    "censored": cens_out,
    "logrankDiffs": lr_diffs,
    "truncated": trunc_out,
    "veff": veff_out,
    "coverage": cov,
    "summary": {
        "kmVsScipyMaxAbs": max_km_vs_scipy,
        "cmClosedVsFixedPointMaxAbs": max_em,
        "handAgrees": hand["agrees"],
        "maxLogrankZRel": max((d["zRel"] for d in lr_diffs), default=None),
        "maxLogrankZAbsRel": max((d["zAbsRel"] for d in lr_diffs), default=None),
        "maxLogrankPRel": max((d["pRel"] for d in lr_diffs), default=None),
        "cpuSeconds": time.process_time() - t0,
    },
}
json.dump(out, open(out_path, "w"), indent=1, allow_nan=False)
print(json.dumps(out["summary"], indent=1))
print(json.dumps(out["coverage"], indent=1))
