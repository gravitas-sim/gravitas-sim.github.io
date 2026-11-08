# Independent oracle for Prompt 273 Part A. Imports no Gravitas code; reads inputs/inputs.json
# (constants, initial states, seeded sets) and the downloaded Horizons files. Run with python3 -E.
# Usage: python3 -E oracle.py FIXTURE_DIR DATA_DIR part [part ...]
#   parts: r1 jup laplace pluto secular ensemble
import json, math, os, sys, time
import numpy as np
from scipy.integrate import solve_ivp, quad

FIX, DATA = sys.argv[1], sys.argv[2]
FIXED = any(a.startswith('c:') for a in sys.argv[3:])
parts = [a.replace('c:', '') for a in sys.argv[3:]]
K = '_c' if FIXED else ''
inp = json.load(open(os.path.join(FIX, 'inputs', 'inputs.json')))
C = inp['constants']
RES = os.path.join(FIX, 'oracle-results.json')
res = json.load(open(RES)) if os.path.exists(RES) else {}
os.makedirs(os.path.join(DATA, 'oracle'), exist_ok=True)
SER = os.path.join(DATA, 'oracle', 'series.json')
ser = json.load(open(SER)) if os.path.exists(SER) else {}
RAD = math.pi / 180


def wrap(d):
    return d % 360.0


def arg(terms):
    if abs(sum(c + d for c, d, _, _ in terms)) > 1e-9:
        return None
    return wrap(sum(c * l + d * v for c, d, l, v in terms))


def elements(x, v, mu):
    x = np.asarray(x, float); v = np.asarray(v, float)
    r = np.linalg.norm(x); h = np.cross(x, v); hn = np.linalg.norm(h)
    ev = np.cross(v, h) / mu - x / r; e = np.linalg.norm(ev)
    inc = math.acos(max(-1, min(1, h[2] / hn)))
    planar = inc < 1e-11 or math.pi - inc < 1e-11
    node = np.array([1.0, 0, 0]) if planar else np.array([-h[1], h[0], 0.0])
    Om = 0.0 if planar else math.atan2(node[1], node[0])
    nn = np.linalg.norm(node)
    ang = lambda a, b: math.atan2(np.dot(np.cross(a, b), h) / hn, np.dot(a, b))
    circ = e < 1e-11
    om = 0.0 if circ else ang(node / nn, ev)
    ref = node / nn if circ else ev / e
    nu = ang(ref, x)
    E = 2 * math.atan2(math.sqrt(1 - e) * math.sin(nu / 2), math.sqrt(1 + e) * math.cos(nu / 2))
    M = E - e * math.sin(E)
    return wrap((Om + om + M) / RAD), wrap((Om + om) / RAD)


def pole_rot():
    a, d = C['pole']['raDeg'] * RAD, C['pole']['decDeg'] * RAD
    p = np.array([math.cos(d) * math.cos(a), math.cos(d) * math.sin(a), math.sin(d)])
    ce, se = math.cos(C['obliquityDeg'] * RAD), math.sin(C['obliquityDeg'] * RAD)
    z = np.array([p[0], p[1] * ce + p[2] * se, -p[1] * se + p[2] * ce]); z /= np.linalg.norm(z)
    x = np.cross([0, 0, 1.0], z); x /= np.linalg.norm(x)
    return np.array([x, np.cross(z, x), z])


def integrate(bodies, G, T, tgrid, rtol, atol):
    m = np.array([b['m'] for b in bodies], float)
    n = len(m)
    y0 = np.concatenate([np.array([b['x'] for b in bodies]).ravel(), np.array([b['v'] for b in bodies]).ravel()])

    def rhs(t, y):
        X = y[:3 * n].reshape(n, 3)
        d = X[None, :, :] - X[:, None, :]
        r3 = (d ** 2).sum(-1) ** 1.5
        np.fill_diagonal(r3, 1.0)
        w = G * m[None, :] / r3
        np.fill_diagonal(w, 0.0)
        a = (w[:, :, None] * d).sum(1)
        return np.concatenate([y[3 * n:], a.ravel()])

    s = solve_ivp(rhs, [0, T], y0, method='DOP853', t_eval=tgrid, rtol=rtol, atol=atol)
    assert s.success
    return s.t, s.y[:3 * n].T.reshape(-1, n, 3), s.y[3 * n:].T.reshape(-1, n, 3), m


def angles_series(X, V, m, G, rot=None):
    n = X.shape[1]
    lam = [[] for _ in range(n - 1)]; vp = [[] for _ in range(n - 1)]
    for k in range(X.shape[0]):
        for i in range(1, n):
            x = X[k, i] - X[k, 0]; v = V[k, i] - V[k, 0]
            if rot is not None:
                x = rot @ x; v = rot @ v
            l, w = elements(x, v, G * (m[0] + m[i]))
            lam[i - 1].append(l); vp[i - 1].append(w)
    return lam, vp


def unwrap_deg(a):
    return np.degrees(np.unwrap(np.radians(a)))


def smooth(t, y, ref):
    out = np.empty_like(y); cs = np.concatenate([[0], np.cumsum(y)])
    half = ref / 2
    for i in range(len(y)):
        w = min(half, t[i] - t[0], t[-1] - t[i])
        lo = np.searchsorted(t, t[i] - w, 'left'); hi = np.searchsorted(t, t[i] + w, 'right')
        out[i] = (cs[hi] - cs[lo]) / (hi - lo)
    return out


def turns_of(y, thr):
    out = []; hi = lo = y[0]; ihi = ilo = 0; state = 0
    for i in range(1, len(y)):
        v = y[i]
        if state == 0:
            if v > hi: hi, ihi = v, i
            if v < lo: lo, ilo = v, i
            if hi - v >= thr: out.append(('max', ihi, hi)); state = -1; lo, ilo = v, i
            elif v - lo >= thr: out.append(('min', ilo, lo)); state = 1; hi, ihi = v, i
        elif state == 1:
            if v > hi: hi, ihi = v, i
            elif hi - v >= thr: out.append(('max', ihi, hi)); state = -1; lo, ilo = v, i
        else:
            if v < lo: lo, ilo = v, i
            elif v - lo >= thr: out.append(('min', ilo, lo)); state = 1; hi, ihi = v, i
    return out


def measure(t, phi, ref, floor, required=3, span=None):
    span = span or ref
    t = np.asarray(t, float); u = unwrap_deg(np.asarray(phi, float))
    win = t[-1] - t[0]; sm = smooth(t, u, span)
    rng = sm.max() - sm.min(); drift = sm[-1] - sm[0]
    if abs(drift) >= 355:
        return {'state': 'circulation', 'period': win / (abs(drift) / 360), 'amplitude': None}
    tr = turns_of(sm, max(floor, 0.12 * rng))
    if FIXED: tr = [k for k in tr if 0 < k[1] < len(t) - 1]
    if len(tr) >= 2:
        sp = np.diff([t[k[1]] for k in tr])
        if 2 * sp.mean() < 4 * ref: tr = []
    if len(tr) < 2:
        return {'state': 'not-constrained', 'period': None, 'amplitude': None}
    P = 2 * float(np.mean(np.diff([t[k[1]] for k in tr])))
    gain = 1.0 if span == ref else math.sin(math.pi * span / P) / (math.pi * span / P)
    mx = [k[2] for k in tr if k[0] == 'max']; mn = [k[2] for k in tr if k[0] == 'min']
    A = (np.mean(mx) - np.mean(mn)) / 2
    if win / P < required:
        return {'state': 'not-constrained', 'period': None, 'amplitude': None}
    return {'state': 'libration', 'period': P, 'amplitude': float(A), 'amplitudeCorrected': float(A) / gain, 'center': float(wrap((np.mean(mx) + np.mean(mn)) / 2))}


def arg_laplace(lam):
    return [wrap(a - 3 * b + 2 * c) for a, b, c in zip(*lam)]


def arg_pluto(lam, vp):
    return [wrap(3 * lp - 2 * ln - w) for ln, lp, w in zip(lam[0], lam[1], vp[1])]


R = pole_rot()
tic = time.time()
if 'r1' in parts:
    res['r1'] = {'laplace': [], 'pluto': [], 'generic': []}
    for s in inp['r1']:
        l, v = s['lam'], s['vp']
        res['r1']['laplace'].append(arg([(1, 0, l[0], 0), (-3, 0, l[1], 0), (2, 0, l[2], 0)]))
        res['r1']['pluto'].append(arg([(3, -1, l[0], v[0]), (-2, 0, l[1], 0)]))
        res['r1']['generic'].append(arg([(5, -1, l[0], v[0]), (-3, -1, l[1], v[1])]))
if 'jup' in parts:
    GMs = C['GM_jupiter_km3_s2']
    rows = []
    for c in (501, 502, 503):
        txt = open(os.path.join(DATA, 'raw', 'horizons_%d.txt' % c)).read()
        body = txt[txt.index('$$SOE') + 5: txt.index('$$EOE')]
        rows.append([[float(q) for q in ln.split(',')[2:8]] for ln in body.strip().split('\n')])
    nwin = inp['windows']['L'] + 1
    lam, vp = [], []
    for k, r in enumerate(rows):
        mu = GMs * (1 + C['moonMassOverJupiter'][k])
        L, W = [], []
        for row in r[:nwin]:
            a, b = elements(R @ np.array(row[:3]), R @ np.array(row[3:]), mu)
            L.append(a); W.append(b)
        lam.append(L); vp.append(W)
    phi = arg_laplace(lam)
    ser['jup365'] = {'lam': lam, 'vp': vp, 'phi': phi}
    import hashlib
    sha = {os.path.basename(p): hashlib.sha256(open(p, 'rb').read()).hexdigest() for p in
           [os.path.join(DATA, 'raw', 'horizons_%d.txt' % c) for c in (501, 502, 503)]}
    json.dump({'format': 'gravitas.resonances-ii-pinned-argument/1',
               'what': 'Laplace argument io - 3 europa + 2 ganymede (deg, wrapped, rounded to 1e-5) from JUP365 osculating elements about Jupiter in its equatorial frame, one value per day from 2025-11-20 00:00 TDB, 8,285 values',
               'source': 'NASA/JPL Horizons API 1.2, JUP365 (Jacobson), retrieved 2026-11-08; see thresholds.json data', 'sha256': sha,
               'phi': [round(p, 5) for p in phi]}, open(os.path.join(FIX, 'jup365-laplace-argument.json'), 'w'))
    m = measure(range(len(phi)), phi, 3.5249, 0.002)
    res['jup365'+K] = m
    res['jup365s'+K] = measure(range(len(phi)), phi, 3.5249, 0.002, span=1000.0)
if 'laplace' in parts:
    b = inp['laplace']; n = b['n']; h = 1.0
    t, X, V, m = integrate(b['bodies'], 1.0, (n - 1) * h, np.arange(n) * h, 1e-10, 1e-6)
    lam, vp = angles_series(X, V, m, 1.0)
    phi = arg_laplace(lam)
    ser['laplace'+K] = {'phi': phi}
    res['laplace'+K] = measure(t, phi, b['ref'], b['floor'])
if 'ensemble' in parts:
    b = inp['laplace']; n = b['n']; out = []
    for mb in inp['ensemble']:
        t, X, V, m = integrate(mb['bodies'], 1.0, n - 1, np.arange(n) * 1.0, 1e-10, 1e-6)
        lam, vp = angles_series(X, V, m, 1.0)
        out.append({'id': mb['id'], **measure(t, arg_laplace(lam), b['ref'], b['floor'])})
        print('member', mb['id'], out[-1]['period'], time.time() - tic, flush=True)
    res['ensemble'+K] = out
if 'pluto' in parts:
    b = inp['pluto']; n = b['n']; h = 20.0; G = C['G_au_yr']
    t, X, V, m = integrate(b['bodies'], G, (n - 1) * h, np.arange(n) * h, 1e-11, 1e-14)
    lam, vp = angles_series(X, V, m, G)
    phi = arg_pluto(lam, vp)
    ser['pluto'+K] = {'phi': phi}
    res['pluto'+K] = measure(t, phi, b['ref'], b['floor'])
if 'secular' in parts:
    b = inp['secular']; G = b['G']; al = b['a'] / b['aJ']
    bcoef = (1 / math.pi) * quad(lambda p: math.cos(p) / (1 - 2 * al * math.cos(p) + al * al) ** 1.5, 0, 2 * math.pi, epsabs=1e-13, epsrel=1e-13, limit=400)[0]
    nn = math.sqrt(G / b['a'] ** 3)
    A = 0.25 * nn * b['massRatio'] * al * al * bcoef
    nS = int(round(4 * (2 * math.pi / A) / 5)) + 1
    t, X, V, m = integrate(b['bodies'], G, (nS - 1) * 5.0, np.arange(nS) * 5.0, 1e-11, 1e-14)
    lam, vp = angles_series(X, V, m, G)
    y = unwrap_deg(vp[1]); tt = np.asarray(t)
    slope = np.polyfit(tt, y, 1)[0] * RAD
    res['secular'] = {'rateRadPerYr': float(slope), 'theoryRadPerYr': A, 'laplaceB': bcoef, 'samples': nS}
res['_ran'] = {'python': sys.version.split()[0], 'numpy': np.__version__, 'seconds_last_call': round(time.time() - tic, 1)}
json.dump(res, open(RES, 'w'), indent=1)
json.dump(ser, open(SER, 'w'))
print('done', parts, round(time.time() - tic, 1), 's')
