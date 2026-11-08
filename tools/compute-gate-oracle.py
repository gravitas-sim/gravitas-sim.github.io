# Spike, Prompt 268 (spike/compute-gate, never merged): the independent oracle of the compute gate.
#   python3 -E tools/compute-gate-oracle.py <inputs dir> <repo root> <out.json>
# Reads documents (data) only: no Gravitas code, no notebook, no notebook output. numpy, scipy,
# astropy and the standard library. Every definition is the one in thresholds.json (and its amendments).
import base64, hashlib, json, math, os, struct, sys, time
import numpy as np
from scipy.integrate import solve_ivp
from scipy import optimize, interpolate, stats

INP, REPO, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
t_start = time.process_time()
def load(p): return json.load(open(p))
def sha(p): return hashlib.sha256(open(p, 'rb').read()).hexdigest()
def grid_values(g):
    b = base64.b64decode(g['storage']['data'])
    return np.array(struct.unpack('<%dd' % (len(b) // 8), b))
R = {"format": "gravitas.compute-gate-ii-oracle-results/1", "python": sys.version.split()[0],
     "numpy": np.__version__, "scipy": __import__('scipy').__version__}
R["thresholdsSha256"] = sha(os.path.join(REPO, 'tests/fixtures/compute-gate-ii/thresholds.json'))

# ---------------------------------------------------------------- N01 / N02
sysdoc = load(os.path.join(REPO, 'compute/inputs/kepler-16.gravitas-system.json'))
G = float(sysdoc['initial']['G']); bd = sysdoc['initial']['bodies']
m = np.array([b['mass'] for b in bd]); X0 = np.array([[b['x'], b['y']] for b in bd]); V0 = np.array([[b['vx'], b['vy']] for b in bd])
N = len(m)
def acc(x):
    a = np.zeros_like(x)
    for i in range(N):
        for j in range(N):
            if i != j:
                d = x[j] - x[i]
                a[i] += G * m[j] * d / (d @ d) ** 1.5
    return a
best = None
for i in range(N):
    for j in range(i + 1, N):
        d = float(np.linalg.norm(X0[i] - X0[j]))
        if best is None or d < best[0]: best = (d, i, j)
d_, ia, ja = best
Ts = 2 * math.pi * math.sqrt(d_ ** 3 / (G * (m[ia] + m[ja])))
com = (m[:, None] * X0).sum(0) / m.sum()
r_far = float(np.max(np.linalg.norm(X0 - com, axis=1)))
def rhs(t, y):
    x = y[:2 * N].reshape(N, 2); v = y[2 * N:].reshape(N, 2)
    return np.concatenate([v.ravel(), acc(x).ravel()])
y0 = np.concatenate([X0.ravel(), V0.ravel()])
ref = solve_ivp(rhs, (0, Ts), y0, method='DOP853', rtol=1e-13, atol=1e-13)
Xref = ref.y[:2 * N, -1].reshape(N, 2)
def err(x): return float(np.max(np.linalg.norm(x - Xref, axis=1)))
def euler(x, v, h): return x + h * v, v + h * acc(x)
def symp(x, v, h):
    v2 = v + h * acc(x); return x + h * v2, v2
def verlet(x, v, h):
    a = acc(x); v1 = v + 0.5 * h * a; x2 = x + h * v1; return x2, v1 + 0.5 * h * acc(x2)
def rk4(x, v, h):
    k1x, k1v = v, acc(x)
    k2x, k2v = v + 0.5 * h * k1v, acc(x + 0.5 * h * k1x)
    k3x, k3v = v + 0.5 * h * k2v, acc(x + 0.5 * h * k2x)
    k4x, k4v = v + h * k3v, acc(x + h * k3x)
    return x + h / 6 * (k1x + 2 * k2x + 2 * k3x + k4x), v + h / 6 * (k1v + 2 * k2v + 2 * k3v + k4v)
ns = [50, 100, 200, 400, 800]
n01 = {"Ts": Ts, "r_far": r_far, "errors": {}, "order": {}}
for name, f in [("euler", euler), ("symplectic", symp), ("verlet", verlet), ("rk4", rk4)]:
    es = []
    for n in ns:
        h = Ts / n; x, v = X0.copy(), V0.copy()
        for _ in range(n): x, v = f(x, v, h)
        es.append(err(x))
    n01["errors"][name] = es
    n01["order"][name] = float(np.polyfit(np.log([Ts / n for n in ns]), np.log(es), 1)[0])
R["N01"] = n01
n02 = {}
for tol in [1e-4, 1e-6, 1e-8, 1e-10]:
    s = solve_ivp(rhs, (0, Ts), y0, method='RK45', rtol=tol, atol=tol)
    n02[repr(tol)] = {"err_rel": err(s.y[:2 * N, -1].reshape(N, 2)) / r_far, "accepted": int(len(s.t) - 1), "nfev": int(s.nfev)}
R["N02"] = n02

# ---------------------------------------------------------------- N03
def window_fit(sep):
    sep = np.asarray(sep, float); n = len(sep); t = 0.1 * np.arange(n)
    S = float(np.median(sep[-20:])); s0 = sep[0]
    idx = np.nonzero(sep > 3 * s0)[0]
    if len(idx) == 0: return {"status": "refused", "why": "no growth"}
    i0 = int(idx[0])
    over = np.nonzero((sep > 0.1 * S) & (np.arange(n) > i0))[0]
    i1 = int(over[0]) - 1 if len(over) else n - 1
    if i1 - i0 + 1 < 10: return {"status": "refused", "why": "short window", "i0": i0, "i1": i1}
    tt = t[i0:i1 + 1]; yy = np.log(sep[i0:i1 + 1])
    c = np.polyfit(tt, yy, 1); res = yy - np.polyval(c, tt)
    r2 = 1 - float(res @ res) / float(((yy - yy.mean()) ** 2).sum())
    if r2 < 0.98: return {"status": "refused", "why": "r2", "r2": r2, "i0": i0, "i1": i1}
    return {"status": "ok", "lambda": float(c[0]), "r2": r2, "i0": i0, "i1": i1, "S": S, "lyapunovTime": 1 / float(c[0])}
n03 = {}
for name in ['n03-engine-pair', 'n03-different-clusters', 'n03-logistic-0.7', 'n03-logistic-1.5', 'n03-linear']:
    n03[name] = window_fit(grid_values(load(os.path.join(INP, name + '.grid.json'))))
R["N03"] = n03

# ---------------------------------------------------------------- N04
es = [b['e'] for b in sysdoc['bodies'][1:]] + [0.5, 0.9, 0.99, 0.999]
Ms = [2 * math.pi * k / 720 for k in range(721)] + [1e-6, 1e-3, 2 * math.pi - 1e-3]
n04 = {"e": es, "M": Ms, "roots": {}}
for e in es:
    n04["roots"][repr(e)] = [optimize.brentq(lambda E: E - e * math.sin(E) - M, M - e, M + e, xtol=1e-15, rtol=8.9e-16) for M in Ms]
R["N04"] = n04

# ---------------------------------------------------------------- N05 / N06
tess = load(os.path.join(REPO, 'compute/inputs/tess-hd209458-s56.observation.json'))
cols = {c['id']: np.array(c['values'], float) for c in tess['columns']}
t, f, fe = cols['time'], cols['flux'], cols['flux-error']
n = 600; tt, ff, ee = t[:n], f[:n], fe[:n]
mid, half = (tt.min() + tt.max()) / 2, (tt.max() - tt.min()) / 2
x = (tt - mid) / half; w = 1 / ee ** 2
n05 = {"n": n, "degrees": {}, "F": []}
chis = []
for d in range(5):
    A = np.vander(x, d + 1, increasing=True)
    sw = np.sqrt(w)
    beta = np.linalg.lstsq(A * sw[:, None], ff * sw, rcond=None)[0]
    cov = np.linalg.inv(A.T @ (A * w[:, None]))
    r = ff - A @ beta; chi2 = float((w * r * r).sum()); chis.append(chi2)
    n05["degrees"][str(d)] = {"coef": beta.tolist(), "covdiag": np.diag(cov).tolist(), "chi2": chi2, "dof": n - (d + 1)}
for d in range(4):
    p_full = d + 2; dof = n - p_full
    F = (chis[d] - chis[d + 1]) / (chis[d + 1] / dof)
    n05["F"].append({"from": d, "to": d + 1, "F": float(F), "p": float(stats.f.sf(F, 1, dof))})
R["N05"] = n05
import types
sys.modules.setdefault('yaml', types.ModuleType('yaml'))  # AM4: PyYAML is not importable here; astropy only needs it for ECSV files
from astropy.timeseries import LombScargle
P = 0.5 * 20.0 ** (np.arange(400) / 399)
pw = LombScargle(t, f, fit_mean=True, center_data=True).power(1 / P, method='slow', normalization='standard')
R["N06"] = {"periods": P.tolist(), "power": pw.tolist(), "peakIndex": int(np.argmax(pw))}

# ---------------------------------------------------------------- N07
mist = load(os.path.join(INP, 'n07-mist.observation.json'))
mc = {c['id']: np.array(c['values'], float) for c in mist['columns']}
fehs = sorted(set(mc['feh'].tolist()))
feh0 = min(fehs, key=lambda v: (abs(v), v))
sel = (mc['feh'] == feh0) & (mc['phase'] == 0)
ages = sorted(set(mc['logAge'][sel].tolist()))
per = {}
for a in ages:
    s = sel & (mc['logAge'] == a)
    mm, rr = mc['mass'][s], mc['r'][s]
    o = np.argsort(mm); per[a] = (mm[o], rr[o])
K = len(ages)
def r_at(a, mass): return interpolate.interp1d(per[a][0], per[a][1], kind='linear')(mass)
preds = []
for k in range(2, K - 2):
    nb = [ages[k - 2], ages[k - 1], ages[k + 1], ages[k + 2]]
    lo = max(per[a][0][0] for a in nb); hi = min(per[a][0][-1] for a in nb)
    mm, rr = per[ages[k]]
    for mass, rtrue in zip(mm, rr):
        if not (lo <= mass <= hi): continue
        ys = [float(r_at(a, mass)) for a in nb]
        lin = float(interpolate.interp1d([nb[1], nb[2]], [ys[1], ys[2]], kind='linear')(ages[k]))
        cub = float(interpolate.BarycentricInterpolator(nb, ys)(ages[k]))
        preds.append([k, float(mass), float(rtrue), lin, cub])
pa = np.array(preds)
R["N07"] = {"feh": feh0, "ages": ages, "count": len(preds), "predictions": preds,
            "rms": {"linear": float(np.sqrt(np.mean((pa[:, 3] - pa[:, 2]) ** 2))), "cubic": float(np.sqrt(np.mean((pa[:, 4] - pa[:, 2]) ** 2)))},
            "max": {"linear": float(np.max(np.abs(pa[:, 3] - pa[:, 2]))), "cubic": float(np.max(np.abs(pa[:, 4] - pa[:, 2])))}}

# ---------------------------------------------------------------- N08
pg = load(os.path.join(INP, 'n08-polytrope.grid.json'))
nn = pg['axes'][0]['values']
def lane(nidx):
    x0 = 1e-4
    th0 = 1 - x0 ** 2 / 6 + nidx * x0 ** 4 / 120; ph0 = -x0 / 3 + nidx * x0 ** 3 / 30
    def f(xi, y): return [y[1], -(max(y[0], 0.0) ** nidx if nidx != 0 else 1.0) - 2 * y[1] / xi]
    ev = lambda xi, y: y[0]
    ev.terminal = True; ev.direction = -1
    s = solve_ivp(f, (x0, 50), [th0, ph0], method='Radau', rtol=1e-11, atol=1e-13, events=ev)
    xi1 = float(s.t_events[0][0]); ph1 = float(s.y_events[0][0][1])
    return {"xi1": xi1, "mass": -xi1 ** 2 * ph1, "rhoRatio": xi1 / (-3 * ph1)}
n08 = {"closed": {"0": {"xi1": math.sqrt(6), "mass": 2 * math.sqrt(6)}, "1": {"xi1": math.pi, "mass": math.pi}}, "radau": {}}
for v in nn:
    n08["radau"][repr(v)] = lane(v)
R["N08"] = n08

# ---------------------------------------------------------------- N09
sn = load(os.path.join(INP, 'n09-snapshot.grid.json'))
v = grid_values(sn); Nb = len(sn['axes'][0]['values'])
px, py, mm_ = v[:Nb], v[Nb:2 * Nb], v[2 * Nb:]
eps = 0.05
dx = px[None, :] - px[:, None]; dy = py[None, :] - py[:, None]
r3 = (dx * dx + dy * dy + eps * eps) ** 1.5
ax = (mm_[None, :] * dx / r3).sum(1); ay = (mm_[None, :] * dy / r3).sum(1)
R["N09"] = {"N": Nb, "eps": eps, "ax": ax.tolist(), "ay": ay.tolist()}

# ---------------------------------------------------------------- N10 (Prompt 264's pinned oracle, read as a fixture)
p264 = load(os.path.join(REPO, 'tests/fixtures/population/oracle-results.json'))
R["N10"] = {"source": "tests/fixtures/population/oracle-results.json", "sourceSha256": sha(os.path.join(REPO, 'tests/fixtures/population/oracle-results.json')),
            "S1mu": p264['designs']['S1']['fit']['mu'], "S2mu": p264['designs']['S2']['fit']['mu'], "S2exposure": p264['designs']['S2']['exposure']}
R["inputs"] = {n: sha(os.path.join(INP, n)) for n in sorted(os.listdir(INP))}
R["cpuSeconds"] = time.process_time() - t_start
json.dump(R, open(OUT, 'w'), indent=1, sort_keys=True)
print("oracle written", OUT, round(R["cpuSeconds"], 1), "s CPU")
