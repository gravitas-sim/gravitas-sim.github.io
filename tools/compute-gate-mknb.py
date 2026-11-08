# Spike, Prompt 268: writes the ten prototype notebooks (compute/notebooks/gate/*.ipynb) from the cells below.
# python3 -I tools/compute-gate-mknb.py
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'compute', 'notebooks', 'gate')
os.makedirs(OUT, exist_ok=True)
def nb(name, title, cells):
    md = "# %s\n\nA PROTOTYPE of the compute gate (Prompt 268, COMPUTE_GATE_II.md): it is not in the catalogue and not shipped. It reads its input as the text `gravitas_input` and its settings as the JSON text `gravitas_params`, and returns `gravitas_output`, a dict of numbers. Python only, numpy and scipy only.\n" % title
    d = {"cells": [{"cell_type": "markdown", "metadata": {}, "source": md.splitlines(True)}] +
         [{"cell_type": "code", "metadata": {}, "execution_count": None, "outputs": [], "source": c.strip("\n").splitlines(True)} for c in cells],
         "metadata": {"kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"}, "language_info": {"name": "python"}},
         "nbformat": 4, "nbformat_minor": 5}
    open(os.path.join(OUT, name + ".ipynb"), "w").write(json.dumps(d, indent=1) + "\n")

SYSTEM = '''
import json, math
import numpy as np
from scipy.integrate import solve_ivp
doc = json.loads(gravitas_input)
assert doc.get("format") == "gravitas.orbital-system" and doc.get("version") == 1, "this notebook reads gravitas.orbital-system/1"
init = doc.get("initial")
assert isinstance(init, dict), "the file has no initial state: save it again from the Orbital System Builder"
G = float(init["G"])
bodies = init["bodies"]
m = np.array([b["mass"] for b in bodies], float)
X0 = np.array([[b["x"], b["y"]] for b in bodies], float)
V0 = np.array([[b["vx"], b["vy"]] for b in bodies], float)
N = len(m)
assert 2 <= N <= 12, "from two to twelve bodies"
d0 = np.linalg.norm(X0[:, None, :] - X0[None, :, :], axis=2)
iu = np.triu_indices(N, 1)
assert d0[iu].min() > 1e-9 * d0[iu].max(), "refused: two bodies start at the same place"
k = int(np.argmin(d0[iu])); ia, ja = int(iu[0][k]), int(iu[1][k])
Ts = 2 * math.pi * math.sqrt(d0[ia, ja] ** 3 / (G * (m[ia] + m[ja])))
com = (m[:, None] * X0).sum(axis=0) / m.sum()
r_far = float(np.max(np.linalg.norm(X0 - com, axis=1)))

def accel(x):
    d = x[None, :, :] - x[:, None, :]
    r2 = (d ** 2).sum(axis=2)
    np.fill_diagonal(r2, 1.0)
    w = r2 ** -1.5
    np.fill_diagonal(w, 0.0)
    return G * ((m[None, :] * w)[:, :, None] * d).sum(axis=1)

def rhs(t, y):
    return np.concatenate([y[2 * N:], accel(y[:2 * N].reshape(N, 2)).ravel()])

ref = solve_ivp(rhs, (0, Ts), np.concatenate([X0.ravel(), V0.ravel()]), method="DOP853", rtol=1e-13, atol=1e-13)
Xref = ref.y[:2 * N, -1].reshape(N, 2)
def final_error(x):
    return float(np.max(np.linalg.norm(x - Xref, axis=1)))
'''

nb("integration-order", "Integration accuracy and order", [SYSTEM, '''
def euler(x, v, h):
    return x + h * v, v + h * accel(x)

def symplectic(x, v, h):
    v = v + h * accel(x)
    return x + h * v, v

def verlet(x, v, h):
    v = v + 0.5 * h * accel(x)
    x = x + h * v
    return x, v + 0.5 * h * accel(x)

def rk4(x, v, h):
    k1x, k1v = v, accel(x)
    k2x, k2v = v + 0.5 * h * k1v, accel(x + 0.5 * h * k1x)
    k3x, k3v = v + 0.5 * h * k2v, accel(x + 0.5 * h * k2x)
    k4x, k4v = v + h * k3v, accel(x + h * k3x)
    return (x + h / 6 * (k1x + 2 * k2x + 2 * k3x + k4x), v + h / 6 * (k1v + 2 * k2v + 2 * k3v + k4v))

STEPS = [50, 100, 200, 400, 800]
errors, order = {}, {}
for name, f in [("euler", euler), ("symplectic", symplectic), ("verlet", verlet), ("rk4", rk4)]:
    es = []
    for n in STEPS:
        h = Ts / n
        x, v = X0.copy(), V0.copy()
        for _ in range(n):
            x, v = f(x, v, h)
        es.append(final_error(x))
    errors[name] = es
    order[name] = float(np.polyfit(np.log([Ts / n for n in STEPS]), np.log(es), 1)[0])
gravitas_output = {"answer": {"Ts": Ts, "r_far": r_far, "steps": STEPS, "errors": errors, "order": order}}
'''])

nb("adaptive-steps", "Adaptive steps", [SYSTEM, '''
A = [[], [1 / 5], [3 / 40, 9 / 40], [44 / 45, -56 / 15, 32 / 9],
     [19372 / 6561, -25360 / 2187, 64448 / 6561, -212 / 729],
     [9017 / 3168, -355 / 33, 46732 / 5247, 49 / 176, -5103 / 18656],
     [35 / 384, 0, 500 / 1113, 125 / 192, -2187 / 6784, 11 / 84]]
C = [0, 1 / 5, 3 / 10, 4 / 5, 8 / 9, 1, 1]
BSTAR = [5179 / 57600, 0, 7571 / 16695, 393 / 640, -92097 / 339200, 187 / 2100, 1 / 40]
EC = [a - b for a, b in zip(A[6] + [0], BSTAR)]
MAX_STEPS = 200000

def f(t, y):
    return rhs(t, y)

def integrate(tol):
    y = np.concatenate([X0.ravel(), V0.ravel()])
    t, h = 0.0, 1e-3 * Ts
    acc = rej = nfev = 0
    f0 = f(0.0, y); nfev += 1
    while t < Ts:
        if acc + rej >= MAX_STEPS:
            raise ValueError("refused: more than %d steps; the system has a close encounter at this tolerance" % MAX_STEPS)
        if h < 1e-12 * Ts:
            raise ValueError("refused: the step fell below 1e-12 of the span")
        h = min(h, Ts - t)
        ks = [f0]
        for i in range(1, 7):
            ks.append(f(0.0, y + h * sum(a * kj for a, kj in zip(A[i], ks))))
        nfev += 6
        ynew = y + h * sum(a * kj for a, kj in zip(A[6], ks))
        err = h * sum(e * kj for e, kj in zip(EC, ks))
        scale = tol + tol * np.abs(y)
        en = float(np.sqrt(np.mean((err / scale) ** 2)))
        if en <= 1.0:
            t += h; y = ynew; acc += 1
            f0 = ks[6]
        else:
            rej += 1
        h *= min(5.0, max(0.2, 0.9 * (en ** -0.2 if en > 0 else 5.0)))
    return y, acc, rej, nfev

def rk4_error(n):
    h = Ts / n
    x, v = X0.copy(), V0.copy()
    for _ in range(n):
        k1x, k1v = v, accel(x)
        k2x, k2v = v + 0.5 * h * k1v, accel(x + 0.5 * h * k1x)
        k3x, k3v = v + 0.5 * h * k2v, accel(x + 0.5 * h * k2x)
        k4x, k4v = v + h * k3v, accel(x + h * k3x)
        x, v = (x + h / 6 * (k1x + 2 * k2x + 2 * k3x + k4x), v + h / 6 * (k1v + 2 * k2v + 2 * k3v + k4v))
    return final_error(x)

out = {}
for tol in [1e-4, 1e-6, 1e-8, 1e-10]:
    y, acc, rej, nfev = integrate(tol)
    e = final_error(y[:2 * N].reshape(N, 2))
    n = 50
    while n <= 102400 and rk4_error(n) > e:
        n *= 2
    out[repr(tol)] = {"err_rel": e / r_far, "accepted": acc, "rejected": rej, "nfev": nfev, "rk4_nfev": (4 * n if n <= 102400 else None)}
gravitas_output = {"answer": {"Ts": Ts, "r_far": r_far, "tolerances": out}}
'''])

nb("orbital-chaos", "Orbital chaos from exported engine runs", [
'''
import base64, json, math
import numpy as np
doc = json.loads(gravitas_input)
assert doc.get("format") == "gravitas.grid" and doc.get("formatVersion") == 1, "this notebook reads gravitas.grid/1"
assert [a["name"] for a in doc["axes"]] == ["snapshot"] and [o["name"] for o in doc["outputs"]] == ["separation"], "the grid must have the axis snapshot and the output separation"
n = len(doc["axes"][0]["values"])
raw = np.frombuffer(base64.b64decode(doc["storage"]["data"]), dtype="<f8")
assert len(raw) == n and n >= 40 and bool(np.all(np.isfinite(raw))) and bool(np.all(raw > 0)), "the separation must be a positive finite series of at least 40 snapshots"
sep = raw.astype(float)
t = 0.1 * np.arange(n)
''', '''
S = float(np.median(sep[-20:]))
s0 = float(sep[0])
grew = np.nonzero(sep > 3 * s0)[0]
if len(grew) == 0:
    raise ValueError("not constrained: the separation never exceeds three times its start")
i0 = int(grew[0])
over = np.nonzero((sep > 0.1 * S) & (np.arange(n) > i0))[0]
i1 = int(over[0]) - 1 if len(over) else n - 1
if i1 - i0 + 1 < 10:
    raise ValueError("not constrained: the growth window is %d snapshots long (i0=%r i1=%r), fewer than 10" % (i1 - i0 + 1, i0, i1))
tt, yy = t[i0:i1 + 1], np.log(sep[i0:i1 + 1])
tm, ym = tt.mean(), yy.mean()
slope = float(((tt - tm) * (yy - ym)).sum() / ((tt - tm) ** 2).sum())
res = yy - (ym + slope * (tt - tm))
r2 = 1.0 - float((res ** 2).sum()) / float(((yy - ym) ** 2).sum())
if r2 < 0.98:
    raise ValueError("not constrained: ln(separation) is not a straight line in time over the window (R2=%r i0=%r i1=%r)" % (r2, i0, i1))
gravitas_output = {"answer": {"lambda": slope, "lyapunovTime": 1.0 / slope, "r2": r2, "i0": i0, "i1": i1, "S": S}}
'''])

nb("kepler-root", "Root finding for Kepler's equation", [
'''
import json, math
import numpy as np
doc = json.loads(gravitas_input)
assert doc.get("format") == "gravitas.orbital-system" and doc.get("version") == 1, "this notebook reads gravitas.orbital-system/1"
es = [float(b["e"]) for b in doc["bodies"][1:] if "e" in b]
assert all(0.0 <= e < 1.0 for e in es), "refused: Kepler's equation as written needs 0 <= e < 1"
es = es + [0.5, 0.9, 0.99, 0.999]
Ms = [2 * math.pi * k / 720 for k in range(721)] + [1e-6, 1e-3, 2 * math.pi - 1e-3]
TOL = 1e-14
''', '''
def newton_history(M, e, steps):
    E, hist = M, []
    for _ in range(steps):
        E = E - (E - e * math.sin(E) - M) / (1 - e * math.cos(E))
        hist.append(E)
    return hist

def newton(M, e):
    E = M
    for k in range(1, 101):
        dE = (E - e * math.sin(E) - M) / (1 - e * math.cos(E))
        E -= dE
        if abs(dE) <= TOL:
            return E, k, True
    return E, 100, False

def halley(M, e):
    E = M
    for k in range(1, 101):
        f = E - e * math.sin(E) - M
        f1 = 1 - e * math.cos(E)
        f2 = e * math.sin(E)
        dE = f / (f1 - f * f2 / (2 * f1))
        E -= dE
        if abs(dE) <= TOL:
            return E, k, True
    return E, 100, False

def bisect(M, e):
    lo, hi = M - e, M + e
    for k in range(1, 101):
        mid = 0.5 * (lo + hi)
        if mid - e * math.sin(mid) - M > 0:
            hi = mid
        else:
            lo = mid
        if hi - lo <= TOL:
            return 0.5 * (lo + hi), k, True
    return 0.5 * (lo + hi), 100, False

roots, stats = {}, {}
for e in es:
    runs = {name: [fn(M, e) for M in Ms] for name, fn in (("newton", newton), ("halley", halley), ("bisection", bisect))}
    roots[repr(e)] = [r[0] for r in runs["bisection"]]
    stats[repr(e)] = {name: {"failures": sum(1 for r in rr if not r[2]), "meanIterations": float(np.mean([r[1] for r in rr if r[2]])) if any(r[2] for r in rr) else None, "maxIterations": max(r[1] for r in rr)} for name, rr in runs.items()}
orders = []
for M, root in zip(Ms, roots[repr(0.5)]):
    errs = [abs(E - root) for E in newton_history(M, 0.5, 8)]
    for k in range(len(errs) - 2):
        if errs[k] < 1e-2 and errs[k + 2] > 1e-14 and errs[k + 1] > 0 and errs[k] > 0:
            orders.append(math.log(errs[k + 2] / errs[k + 1]) / math.log(errs[k + 1] / errs[k]))
            break
assert orders, "no mesh point gave an error sequence to measure the order from"
gravitas_output = {"answer": {"e": es, "M": Ms, "bisectionRoots": roots, "stats": stats, "newtonOrder": float(np.median(orders)), "orderSamples": len(orders)}}
'''])

nb("least-squares", "Least squares from scratch", [
'''
import json
import numpy as np
from scipy.stats import f as fdist
doc = json.loads(gravitas_input)
assert doc.get("format") == "gravitas.observation" and doc.get("kind") == "time-series", "this notebook reads a gravitas.observation/1 time series"
col = {c["id"]: np.array(c["values"], float) for c in doc["columns"]}
n = min(600, len(col["time"]))
assert n >= 5, "refused: the window holds %d points and a degree-4 polynomial needs 5" % n
t, y, e = col["time"][:n], col["flux"][:n], col["flux-error"][:n]
assert bool(np.all(e > 0)), "refused: an uncertainty is not positive"
half = (t.max() - t.min()) / 2
assert half > 0, "refused: every time in the window is the same, the design is rank deficient"
x = (t - (t.max() + t.min()) / 2) / half
w = 1.0 / e ** 2
''', '''
sw = np.sqrt(w)
out, chis = {}, []
for d in range(5):
    A = np.vander(x, d + 1, increasing=True) * sw[:, None]
    Q, R = np.linalg.qr(A)
    beta = np.linalg.solve(R, Q.T @ (y * sw))
    Rinv = np.linalg.inv(R)
    cov = Rinv @ Rinv.T
    r = (y - np.vander(x, d + 1, increasing=True) @ beta) * sw
    chi2 = float(r @ r)
    chis.append(chi2)
    out[str(d)] = {"coef": beta.tolist(), "covdiag": np.diag(cov).tolist(), "chi2": chi2, "dof": n - (d + 1)}
tests = []
for d in range(4):
    dof = n - (d + 2)
    F = (chis[d] - chis[d + 1]) / (chis[d + 1] / dof)
    tests.append({"from": d, "to": d + 1, "F": float(F), "p": float(fdist.sf(F, 1, dof)), "rssReduced": chis[d], "rssFull": chis[d + 1], "n": n})
gravitas_output = {"answer": {"n": n, "degrees": out, "F": tests}}
'''])

nb("periodogram-scratch", "A periodogram from scratch", [
'''
import json
import numpy as np
doc = json.loads(gravitas_input)
assert doc.get("format") == "gravitas.observation" and doc.get("kind") == "time-series", "this notebook reads a gravitas.observation/1 time series"
params = json.loads(gravitas_params) if gravitas_params else {}
col = {c["id"]: np.array(c["values"], float) for c in doc["columns"]}
t, y = col["time"], col["flux"]
assert len(t) >= 10, "refused: fewer than 10 points"
assert bool(np.all(np.diff(t) > 0)), "refused: the times are not strictly increasing"
yy = float(((y - y.mean()) ** 2).sum())
assert yy > 0, "refused: the flux is constant, there is no variance to explain"
P = np.array(params["periods"], float) if params.get("periods") else 0.5 * 20.0 ** (np.arange(400) / 399)
assert bool(np.all(P > 0)), "refused: a trial period is not positive"
''', '''
tm = t.mean()
power = np.zeros(len(P))
for k, period in enumerate(P):
    wk = 2 * np.pi / period
    A = np.column_stack([np.cos(wk * (t - tm)), np.sin(wk * (t - tm)), np.ones(len(t))])
    beta = np.linalg.solve(A.T @ A, A.T @ y)
    r = y - A @ beta
    power[k] = 1.0 - float(r @ r) / yy
peak = int(np.argmax(power))
gravitas_output = {"answer": {"periods": P.tolist(), "power": power.tolist(), "peakIndex": peak, "peakPeriod": float(P[peak]), "peakPower": float(power[peak])}}
'''])

nb("isochrone-interpolation", "Interpolation of isochrone tables", [
'''
import json
import numpy as np
doc = json.loads(gravitas_input)
params = json.loads(gravitas_params) if gravitas_params else {}
assert doc.get("format") == "gravitas.observation" and doc.get("kind") == "table", "this notebook reads a gravitas.observation/1 table"
c = {k["id"]: np.array(k["values"], float) for k in doc["columns"]}
fehs = sorted(set(c["feh"].tolist()))
feh0 = min(fehs, key=lambda v: (abs(v), v))
req = params.get("request")
if req:
    assert float(req["feh"]) in fehs, "refused: the table does not hold [Fe/H] = %r" % (req["feh"],)
    sel_all = c["feh"] == float(req["feh"])
    assert c["logAge"][sel_all].min() <= float(req["logAge"]) <= c["logAge"][sel_all].max(), "refused: the age %r is outside the table (nothing is extrapolated)" % (req["logAge"],)
sel = (c["feh"] == feh0) & (c["phase"] == 0)
ages = sorted(set(c["logAge"][sel].tolist()))
per = {}
for a in ages:
    s = sel & (c["logAge"] == a)
    o = np.argsort(c["mass"][s])
    per[a] = (c["mass"][s][o], c["r"][s][o])
K = len(ages)
assert K >= 5, "refused: fewer than five ages"
''', '''
def r_at(a, mass):
    return float(np.interp(mass, per[a][0], per[a][1]))

def lagrange(xs, ys, x):
    total = 0.0
    for i in range(len(xs)):
        term = ys[i]
        for j in range(len(xs)):
            if j != i:
                term *= (x - xs[j]) / (xs[i] - xs[j])
        total += term
    return total

preds = []
for k in range(2, K - 2):
    nb = [ages[k - 2], ages[k - 1], ages[k + 1], ages[k + 2]]
    lo = max(per[a][0][0] for a in nb)
    hi = min(per[a][0][-1] for a in nb)
    for mass, rtrue in zip(*per[ages[k]]):
        if not (lo <= mass <= hi):
            continue
        ys = [r_at(a, mass) for a in nb]
        lin = ys[1] + (ys[2] - ys[1]) * (ages[k] - nb[1]) / (nb[2] - nb[1])
        preds.append([k, float(mass), float(rtrue), float(lin), float(lagrange(nb, ys, ages[k]))])
p = np.array(preds)
gravitas_output = {"answer": {"credit": doc.get("credit"), "license": doc["license"]["status"], "feh": feh0, "ages": ages, "count": len(preds), "predictions": preds,
    "rms": {"linear": float(np.sqrt(np.mean((p[:, 3] - p[:, 2]) ** 2))), "cubic": float(np.sqrt(np.mean((p[:, 4] - p[:, 2]) ** 2)))},
    "max": {"linear": float(np.max(np.abs(p[:, 3] - p[:, 2]))), "cubic": float(np.max(np.abs(p[:, 4] - p[:, 2])))}}}
'''])

nb("polytrope", "A polytrope against the stellar kernel", [
'''
import base64, json, math
import numpy as np
from scipy.integrate import solve_ivp
doc = json.loads(gravitas_input)
assert doc.get("format") == "gravitas.grid" and doc.get("formatVersion") == 1, "this notebook reads gravitas.grid/1"
assert [a["name"] for a in doc["axes"]] == ["n"] and [o["name"] for o in doc["outputs"]] == ["xi1", "mass", "rhoRatio"], "the grid must have the axis n and the outputs xi1, mass, rhoRatio"
ns = [float(v) for v in doc["axes"][0]["values"]]
assert all(0 <= v < 5 for v in ns), "refused: the polytropic index must satisfy 0 <= n < 5 (n = 5 has an infinite radius, n > 5 an infinite mass, n < 0 is not a star)"
raw = np.frombuffer(base64.b64decode(doc["storage"]["data"]), dtype="<f8")
K = len(ns)
table = {"xi1": raw[:K], "mass": raw[K:2 * K], "rhoRatio": raw[2 * K:]}
''', '''
def lane_emden(n):
    x0 = 1e-6
    th0 = 1 - x0 ** 2 / 6 + n * x0 ** 4 / 120
    ph0 = -x0 / 3 + n * x0 ** 3 / 30
    def f(xi, y):
        return [y[1], -(1.0 if n == 0 else max(y[0], 0.0) ** n) - 2 * y[1] / xi]
    def hit(xi, y):
        return y[0]
    hit.terminal = True
    hit.direction = -1
    s = solve_ivp(f, (x0, 100), [th0, ph0], method="DOP853", rtol=1e-12, atol=1e-14, events=hit)
    xi1 = float(s.t_events[0][0])
    ph1 = float(s.y_events[0][0][1])
    return xi1, -xi1 ** 2 * ph1, xi1 / (-3 * ph1)

res = [lane_emden(v) for v in ns]
sol = {"xi1": [r[0] for r in res], "mass": [r[1] for r in res], "rhoRatio": [r[2] for r in res]}
rel = {k: [abs(a - b) / max(abs(a), abs(b)) for a, b in zip(sol[k], table[k].tolist())] for k in sol}
gravitas_output = {"answer": {"n": ns, "solution": sol, "relativeDifferenceFromTable": rel}}
'''])

nb("barnes-hut-toy", "A Barnes-Hut toy against direct summation", [
'''
import base64, json, math
import numpy as np
doc = json.loads(gravitas_input)
params = json.loads(gravitas_params) if gravitas_params else {}
assert doc.get("format") == "gravitas.grid" and doc.get("formatVersion") == 1, "this notebook reads gravitas.grid/1"
N = len(doc["axes"][0]["values"])
assert N <= 4000, "refused: more than 4000 bodies (the toy's cap)"
eps = float(params.get("eps", 0.05))
assert eps > 0, "refused: the softening must be positive"
raw = np.frombuffer(base64.b64decode(doc["storage"]["data"]), dtype="<f8")
px, py, pm = raw[:N].copy(), raw[N:2 * N].copy(), raw[2 * N:3 * N].copy()
G = 1.0
''', '''
def direct():
    dx = px[None, :] - px[:, None]
    dy = py[None, :] - py[:, None]
    w = G * pm[None, :] / (dx * dx + dy * dy + eps * eps) ** 1.5
    return (w * dx).sum(axis=1), (w * dy).sum(axis=1)

class Cell:
    __slots__ = ("m", "cx", "cy", "side", "kids", "body")

def build(idx, x0, y0, side, depth=0):
    c = Cell()
    c.side = side
    c.m = float(pm[idx].sum())
    c.cx = float((pm[idx] * px[idx]).sum() / c.m)
    c.cy = float((pm[idx] * py[idx]).sum() / c.m)
    c.kids, c.body = [], None
    if len(idx) == 1 or depth > 40:
        c.body = idx
        return c
    h = side / 2
    right = px[idx] >= x0 + h
    up = py[idx] >= y0 + h
    for r in (False, True):
        for u in (False, True):
            sub = idx[(right == r) & (up == u)]
            if len(sub):
                c.kids.append(build(sub, x0 + (h if r else 0.0), y0 + (h if u else 0.0), h, depth + 1))
    return c

root = build(np.arange(N), float(px.min()), float(py.min()), float(max(px.max() - px.min(), py.max() - py.min())) * (1 + 1e-9) + 1e-12)

def tree_accel(theta):
    ax, ay = np.zeros(N), np.zeros(N)
    count = 0
    for i in range(N):
        stack = [root]
        sx = sy = 0.0
        while stack:
            c = stack.pop()
            if c.body is not None:
                for j in c.body:
                    if j != i:
                        dx, dy = px[j] - px[i], py[j] - py[i]
                        w = G * pm[j] / (dx * dx + dy * dy + eps * eps) ** 1.5
                        sx += w * dx; sy += w * dy; count += 1
                continue
            dx, dy = c.cx - px[i], c.cy - py[i]
            d = math.sqrt(dx * dx + dy * dy)
            if theta > 0 and d > 0 and c.side / d < theta:
                w = G * c.m / (d * d + eps * eps) ** 1.5
                sx += w * dx; sy += w * dy; count += 1
            else:
                stack.extend(c.kids)
        ax[i], ay[i] = sx, sy
    return ax, ay, count

dax, day = direct()
mag = np.sqrt(dax ** 2 + day ** 2)
rows = {}
for theta in [0.0, 0.3, 0.5, 0.7, 1.0]:
    ax, ay, count = tree_accel(theta)
    rel = np.sqrt((ax - dax) ** 2 + (ay - day) ** 2) / mag
    rows[repr(theta)] = {"rms": float(np.sqrt(np.mean(rel ** 2))), "max": float(rel.max()), "interactions": count,
                         "ax": ax.tolist() if theta == 0.0 else None, "ay": ay.tolist() if theta == 0.0 else None}
gravitas_output = {"answer": {"N": N, "eps": eps, "directAx": dax.tolist(), "directAy": day.tolist(), "theta": rows}}
'''])

nb("synthetic-populations", "Synthetic populations against Prompt 264", [
'''
import json, math
import numpy as np
from scipy.special import ndtr
doc = json.loads(gravitas_input)
assert doc.get("format") == "gravitas.observation" and doc.get("kind") == "table", "this notebook reads a gravitas.observation/1 table"
cols = {c["id"]: np.array(c["values"], float) for c in doc["columns"]}
x, sig = cols["x"], cols["sigma"]
des = doc["design"]
edges = np.array(des["edges"], float)
E = np.array(des["exposure"], float)
r = np.array(des["reliability"], float)
J = len(edges) - 1
assert len(x) >= 1, "refused: there are no objects"
assert bool(np.all(np.diff(edges) > 0)) and len(E) == J and len(r) == J, "refused: the design's edges, exposure and reliability do not agree"
assert bool(np.all(E > 0)), "refused: an exposure is not positive"
assert bool(np.all(r > 0)), "refused: a reliability is not positive"
assert bool(np.all(sig >= 0)), "refused: an uncertainty is negative"
width = np.diff(edges)
''', '''
def kernel(xv, sv):
    K = np.zeros((len(xv), J))
    for j in range(J):
        a, b = edges[j], edges[j + 1]
        pos = sv > 0
        K[pos, j] = (ndtr((b - xv[pos]) / sv[pos]) - ndtr((a - xv[pos]) / sv[pos])) / width[j]
        K[~pos, j] = ((xv[~pos] >= a) & (xv[~pos] < b)) / width[j]
    return K

def fit(xv, sv):
    K = kernel(xv, sv)
    mu = np.full(J, len(xv) / J)
    last = -np.inf
    for it in range(1, 20001):
        s = K @ mu
        ll = float(np.log(s).sum() - mu.sum())
        mu = mu * (K.T @ (1.0 / s))
        if abs(ll - last) <= 1e-12 * max(1.0, abs(ll)):
            break
        last = ll
    s = K @ mu
    return mu, float(np.log(s).sum() - mu.sum()), it

mu_hat, ll, iters = fit(x, sig)
status = ["not constrained" if E[j] < 5 else "ok" for j in range(J)]
gamma = [float(mu_hat[j] * r[j] / E[j]) if status[j] == "ok" else None for j in range(J)]
ans = {"mu": mu_hat.tolist(), "gamma": gamma, "status": status, "logLik": ll, "iterations": iters}
if "truth" in doc and len(doc["truth"]["muTrue"]) == J and des.get("exposure") == [100.0] * J:
    mu_true = np.array(doc["truth"]["muTrue"], float)
    Z = []
    for rep in range(200):
        rng = np.random.default_rng(268001 + rep)
        counts = rng.poisson(mu_true)
        us = np.concatenate([rng.uniform(edges[j], edges[j + 1], counts[j]) for j in range(J)])
        bw = np.repeat(width, counts)
        sg = bw * np.exp(rng.uniform(math.log(0.1), math.log(0.3), len(us)))
        xs = us + sg * rng.standard_normal(len(us))
        Z.append((fit(xs, sg)[0] - mu_true) / np.sqrt(mu_true))
    Z = np.array(Z)
    ans["recovery"] = {"replicates": 200, "meanZ": Z.mean(axis=0).tolist(), "rmsZ": np.sqrt((Z ** 2).mean(axis=0)).tolist(), "pooledRmsZ": float(np.sqrt((Z ** 2).mean()))}
gravitas_output = {"answer": ans}
'''])
print("ten notebooks written to", OUT)
