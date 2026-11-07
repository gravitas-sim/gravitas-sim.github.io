"""The independent oracle of the structure-growth gate (Roadmap III, Prompt 259 Part A).

python -E tools/growth-oracle/oracle.py <thresholds.json> <planck-best-fit.json> <out.json>

An independent implementation: it reads no Gravitas code and no output of the
prototype. numpy, scipy and the standard library only. Its output is pinned
before the prototype is run.
"""

import hashlib
import json
import math
import sys
import time
from decimal import Decimal, getcontext

import warnings

import numpy as np
import scipy
from scipy.integrate import quad, solve_ivp
from scipy.special import hyp2f1

thr_path, planck_path, out_path = sys.argv[1], sys.argv[2], sys.argv[3]
thr_bytes = open(thr_path, "rb").read()
thr = json.loads(thr_bytes)
planck = json.load(open(planck_path))

GRID_A = [10.0 ** (-2.0 + 2.0 * i / 40.0) for i in range(41)]
GRID_U = [math.log(a) for a in GRID_A]
SETS = {s["id"]: s for s in thr["parameterSets"]["growth"]}


# ---------------------------------------------------------------- background
def e2(a, om, ode, w, ok=None):
    ok = 1.0 - om - ode if ok is None else ok
    return om * a ** -3 + ok * a ** -2 + ode * a ** (-3.0 * (1.0 + w))


def dlne(a, om, ode, w):
    ok = 1.0 - om - ode
    num = -3.0 * om * a ** -3 - 2.0 * ok * a ** -2 - 3.0 * (1.0 + w) * ode * a ** (-3.0 * (1.0 + w))
    return num / (2.0 * e2(a, om, ode, w))


def omega_m(a, om, ode, w):
    return om * a ** -3 / e2(a, om, ode, w)


def growth_dop(om, ode, w, ai, kappa=0.0, u_eval=GRID_U, series=True):
    """DOP853 solve of D'' + (2 + dlnE) D' + [(kappa/(aE))^2 - 1.5 Om(a)] D = 0 from the matter-era series at ai."""
    ok = 1.0 - om - ode
    kk = ok / om
    d0 = ai * (1.0 - (4.0 / 7.0) * kk * ai) if series else ai
    p0 = ai * (1.0 - (8.0 / 7.0) * kk * ai) if series else ai

    def rhs(u, y):
        a = math.exp(u)
        E2 = e2(a, om, ode, w)
        pr = (kappa * kappa) / (a * a * E2) if kappa else 0.0
        return [y[1], -(2.0 + dlne(a, om, ode, w)) * y[1] - (pr - 1.5 * omega_m(a, om, ode, w)) * y[0]]

    sol = solve_ivp(rhs, [math.log(ai), 0.0], [d0, p0], method="DOP853", t_eval=u_eval, rtol=1e-13, atol=1e-300)
    assert sol.success and len(sol.t) == len(u_eval)
    return sol.y[0], sol.y[1]


# ------------------------------------------------------------- closed forms
def heath(a, om, ode):
    ok = 1.0 - om - ode

    def f(s):
        if s <= 0.0:
            return 0.0
        E = math.sqrt(om * s ** -3 + ok * s ** -2 + ode)
        return (s * E) ** -3

    I, _ = quad(f, 0.0, a, epsabs=0.0, epsrel=1e-13, limit=400)
    E = math.sqrt(om * a ** -3 + ok * a ** -2 + ode)
    D = 2.5 * om * E * I
    fr = dlne(a, om, ode, -1.0) + 1.0 / (a * a * E ** 3 * I)
    return D, fr


getcontext().prec = 200
DEC = Decimal


def peebles(x):
    x = DEC(x)
    one = DEC(1)
    return one + DEC(3) / x + DEC(3) * (one + x).sqrt() * x ** DEC("-1.5") * ((one + x).sqrt() - x.sqrt()).ln()


def peebles_limit():
    x = DEC("1e-30")
    return peebles(x) / x


PEEBLES_L = peebles_limit()


def open_form(a, om):
    k = 1.0 / om - 1.0
    x = DEC(repr(a)) * (DEC(1) / DEC(repr(om)) - DEC(1))
    D = DEC(repr(a)) * peebles(x) / (PEEBLES_L * x)
    h = DEC("1e-40")
    ex = h.exp()
    f = ((peebles(x * ex)).ln() - (peebles(x / ex)).ln()) / (2 * h)
    return float(D), float(f)


out = {
    "format": "gravitas.growth-oracle/1",
    "thresholdsSha256": hashlib.sha256(thr_bytes).hexdigest(),
    "environment": {
        "python": sys.version.split()[0],
        "numpy": np.__version__,
        "scipy": scipy.__version__,
        "decimalPrecision": 200,
        "flags": "python -E",
    },
    "grid": {"a": GRID_A},
}
tstart = time.time()

# --------------------------------------------------------------- growth sets
growth = {}
for sid, s in SETS.items():
    D, P = growth_dop(s["Om"], s["Ode"], s["w"], 1e-10)
    growth[sid] = {"Om": s["Om"], "Ode": s["Ode"], "w": s["w"], "D": D.tolist(), "f": (P / D).tolist()}
out["growth"] = growth

# closed forms with their own residual against the DOP853 solve of the same case
closed = {"eds": {}, "open": {}, "flat": {}, "heath": {}}
selfcheck = {"open": 0.0, "flat": 0.0, "heath": 0.0}
for om in (0.1, 0.3, 0.5, 0.8):
    Dp, Pp = growth_dop(om, 0.0, -1.0, 1e-10)
    pairs = [open_form(a, om) for a in GRID_A]
    closed["open"][repr(om)] = {"D": [p[0] for p in pairs], "f": [p[1] for p in pairs]}
    selfcheck["open"] = max(
        selfcheck["open"],
        max(abs(p[0] / d - 1.0) for p, d in zip(pairs, Dp)),
        max(abs(p[1] - q / d) for p, q, d in zip(pairs, Pp, Dp)),
    )
for om in (0.1, 0.3, 0.5, 0.8):
    ode = 1.0 - om
    Dp, Pp = growth_dop(om, ode, -1.0, 1e-10)
    Dh = [a * float(hyp2f1(1.0 / 3.0, 1.0, 11.0 / 6.0, -(ode / om) * a ** 3)) for a in GRID_A]
    fh = [heath(a, om, ode)[1] for a in GRID_A]
    closed["flat"][repr(om)] = {"D": Dh, "f": fh}
    selfcheck["flat"] = max(
        selfcheck["flat"],
        max(abs(x / d - 1.0) for x, d in zip(Dh, Dp)),
        max(abs(x - q / d) for x, q, d in zip(fh, Pp, Dp)),
    )
for om, ode in ((0.3, 0.5), (0.3, 0.9), (0.2, 0.6), (0.5, 0.9), (0.1, 1.2)):
    Dp, Pp = growth_dop(om, ode, -1.0, 1e-10)
    pr = [heath(a, om, ode) for a in GRID_A]
    closed["heath"][f"{om}_{ode}"] = {"Om": om, "Ode": ode, "D": [p[0] for p in pr], "f": [p[1] for p in pr]}
    selfcheck["heath"] = max(
        selfcheck["heath"],
        max(abs(p[0] / d - 1.0) for p, d in zip(pr, Dp)),
        max(abs(p[1] - q / d) for p, q, d in zip(pr, Pp, Dp)),
    )
closed["eds"] = {"D": list(GRID_A), "f": [1.0] * 41}
out["closedForms"] = closed
out["closedFormSelfCheck"] = {
    "what": "the largest disagreement of each closed form with the oracle's own DOP853 solve of the same case (relative in D, absolute in f)",
    **selfcheck,
    "peeblesSmallXLimit": float(PEEBLES_L),
}

# ------------------------------------------------------------ cited fit (A4)
def cpt(a, om, ode):
    z = 1.0 / a - 1.0
    orr = 1.0 - om - ode
    den = ode + orr * (1.0 + z) ** 2 + om * (1.0 + z) ** 3
    O = om * (1.0 + z) ** 3 / den
    OL = ode / den
    return (1.0 / (1.0 + z)) * 2.5 * O / (O ** (4.0 / 7.0) - OL + (1.0 + O / 2.0) * (1.0 + OL / 70.0))


out["cptFit"] = {sid: [cpt(a, SETS[sid]["Om"], SETS[sid]["Ode"]) for a in GRID_A] for sid in ("S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8")}

# ------------------------------------------------------------------- shape
THETA = 2.728 / 2.7


def t0(q):
    L0 = math.log(2.0 * math.e + 1.8 * q)
    C0 = 14.2 + 731.0 / (1.0 + 62.5 * q)
    return L0 / (L0 + C0 * q * q)


def shape_T(k_h, om, ob, h):
    omh2 = om * h * h
    obh2 = ob * h * h
    s = 44.5 * math.log(9.83 / omh2) / math.sqrt(1.0 + 10.0 * obh2 ** 0.75)
    fb = ob / om
    ag = 1.0 - 0.328 * math.log(431.0 * omh2) * fb + 0.38 * math.log(22.3 * omh2) * fb * fb
    ks = (k_h * h) * s  # k in 1/Mpc
    geff = om * h * (ag + (1.0 - ag) / (1.0 + (0.43 * ks) ** 4))
    q = k_h * THETA * THETA / geff
    return t0(q)


def window(x):
    if x < 1e-2:
        return 1.0 - x * x / 10.0
    return 3.0 * (math.sin(x) - x * math.cos(x)) / x ** 3


def decade_quad(f, lo, hi, nd):
    """Integral of f(ln k) over [lo, hi], split in nd equal parts; epsabs is 1e-13 of a rough total so the
    far oscillatory tail (negligible beside the total) is not asked for a relative accuracy of its own."""
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        rough, _ = quad(f, lo, hi, limit=4000, epsabs=0.0, epsrel=1e-6)
    tot = 0.0
    edges = [lo + (hi - lo) * i / nd for i in range(nd + 1)]
    for a, b in zip(edges[:-1], edges[1:]):
        v, _ = quad(f, a, b, limit=4000, epsabs=1e-13 * abs(rough), epsrel=1e-12)
        tot += v
    return tot


def sigma2_unnorm(R, T2fun, ns, kmin=1e-5, kmax=1e4):
    """Integral of dlnk k^(3+ns) T^2 W^2, split by decade."""
    def f(lk):
        k = math.exp(lk)
        return k ** (3.0 + ns) * T2fun(k) * window(k * R) ** 2

    lo = math.log(kmin)
    hi = math.log(kmax)
    nd = int(round((hi - lo) / math.log(10.0)))
    return decade_quad(f, lo, hi, nd)


qs = [10.0 ** (-4.0 + 8.0 * i / 300.0) for i in range(301)]
ks = [10.0 ** (-4.0 + 7.0 * i / 300.0) for i in range(301)]
out["shape"] = {"q": qs, "T0": [t0(q) for q in qs], "k": ks, "T": {}, "sigma": {}}
for t in thr["parameterSets"]["shape"]:
    out["shape"]["T"][t["id"]] = [shape_T(k, t["Om"], t["Ob"], t["h"]) for k in ks]
    sg = {}
    I8 = sigma2_unnorm(8.0, lambda k, t=t: shape_T(k, t["Om"], t["Ob"], t["h"]) ** 2, 1.0)
    N = 0.8 ** 2 / I8
    for R in (1.0, 8.0, 30.0, 100.0):
        sg[repr(R)] = math.sqrt(N * sigma2_unnorm(R, lambda k, t=t: shape_T(k, t["Om"], t["Ob"], t["h"]) ** 2, 1.0))
    out["shape"]["sigma"][t["id"]] = sg

# power-law closed form and its own quadrature check
pl = {}
for R in (1.0, 8.0, 30.0):
    A = 1.0
    closed_form = 3.0 * A / (10.0 * math.pi * R)

    tot = decade_quad(lambda lk: math.exp(lk) * window(math.exp(lk) * R) ** 2 / (2.0 * math.pi ** 2), math.log(1e-9), math.log(1e4), 13)
    pl[repr(R)] = {"closedForm": closed_form, "truncatedQuad": tot, "relativeDifference": abs(tot / closed_form - 1.0)}
out["sigmaPowerLaw"] = pl

# ------------------------------------------------------------ the Planck chain (X1)
pv = {k: float(v["value"]) if isinstance(v, dict) else float(v) for k, v in planck["values"].items()}
h = pv["H0"] / 100.0
om = (pv["omegaBh2"] + pv["omegaCh2"]) / (h * h)
ob = pv["omegaBh2"] / (h * h)
Dflat, _ = heath(1.0, om, 1.0 - om)
k0_h = pv["k0PerMpc"] / h  # pivot in h/Mpc
As = math.exp(pv["lnAs1e10"]) * 1e-10
ns = pv["ns"]


def planck_T2(k):
    return shape_T(k, om, ob, h) ** 2


def planck_integrand_unnorm(R):
    # Delta^2(k) = (4/25) (2997.92458 k)^4 / Om^2 D1^2 T^2 As (k/k0)^(ns-1)
    def f(lk):
        k = math.exp(lk)
        d2 = (4.0 / 25.0) * (2997.92458 * k) ** 4 / (om * om) * Dflat ** 2 * planck_T2(k) * As * (k / k0_h) ** (ns - 1.0)
        return d2 * window(k * R) ** 2

    return decade_quad(f, math.log(1e-5), math.log(1e4), 9)


out["planck"] = {
    "Om": om,
    "Ob": ob,
    "h": h,
    "D1": Dflat,
    "sigma8Model": math.sqrt(planck_integrand_unnorm(8.0)),
    "sigma8Printed": pv["sigma8"],
    "OmPrinted": pv["Om"],
}

# ------------------------------------------------------------------- Jeans
H0 = 70.0
jk = {}
for sid in ("S1", "S4"):
    s = SETS[sid]
    jk[sid] = {}
    for cs in (1.0, 5.0, 20.0):
        jk[sid][repr(cs)] = [
            math.sqrt(1.5 * omega_m(a, s["Om"], s["Ode"], s["w"])) * a * math.sqrt(e2(a, s["Om"], s["Ode"], s["w"])) * H0 / cs
            for a in GRID_A
        ]
out["jeansWavenumber"] = {"H0": H0, "values": jk}

jp = {}
for sid in ("S1", "S4"):
    s = SETS[sid]
    jp[sid] = {}
    for kap in (0.5, 2.0, 10.0, 50.0, 300.0):
        D, P = growth_dop(s["Om"], s["Ode"], s["w"], 1e-6, kappa=kap)
        jp[sid][repr(kap)] = {"D": D.tolist(), "Dprime": P.tolist()}
out["jeansPressure"] = jp
out["jeansEdsCrossing"] = {repr(kap): 1.5 / (kap * kap) for kap in (2.0, 10.0, 50.0)}

# ---------------------------------------------- W2: the radiation sensitivity
def growth_radiation(om, orr, a_start=1e-7):
    ode = 1.0 - om - orr

    def E2(a):
        return om * a ** -3 + orr * a ** -4 + ode

    def rhs(u, y):
        a = math.exp(u)
        dl = (-3.0 * om * a ** -3 - 4.0 * orr * a ** -4) / (2.0 * E2(a))
        omm = om * a ** -3 / E2(a)
        return [y[1], -(2.0 + dl) * y[1] + 1.5 * omm * y[0]]

    aeq = orr / om
    y_ = a_start / aeq
    y0 = [1.0 + 1.5 * y_, 1.5 * y_]
    ue = [math.log(0.01), math.log(0.1), 0.0]
    sol = solve_ivp(rhs, [math.log(a_start), 0.0], y0, method="DOP853", t_eval=ue, rtol=1e-13, atol=1e-300)
    return sol.y[0]


Dr = growth_radiation(0.3, 8.5e-5)
Dm, _ = growth_dop(0.3, 0.7, -1.0, 1e-10, u_eval=[math.log(0.01), math.log(0.1), 0.0])
out["radiationSensitivity"] = {
    "Or": 8.5e-5,
    "ratioWithRadiationAt0p01": (Dr[0] / Dr[2]) / (Dm[0] / Dm[2]) - 1.0,
    "ratioWithRadiationAt0p1": (Dr[1] / Dr[2]) / (Dm[1] / Dm[2]) - 1.0,
    "note": "relative change of D(a)/D(1) when a radiation term is in the background (flat, Om 0.3), Meszaros initial data, DOP853",
}

out["seconds"] = time.time() - tstart
json.dump(out, open(out_path, "w"), indent=1)
print("oracle done in %.1f s; self-check %s" % (out["seconds"], out["closedFormSelfCheck"]))
