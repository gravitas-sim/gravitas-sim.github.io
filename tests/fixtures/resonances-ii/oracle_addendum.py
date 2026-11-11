# Independent oracle for the Prompt 273 Part A addendum (addendum-thresholds.json, AM6).
# Imports no Gravitas code; reads inputs/inputs.json and the downloaded Horizons files.
# Run with python3 -E. oracle.py and oracle-results.json are not touched.
# Usage: python3 -E oracle_addendum.py FIXTURE_DIR DATA_DIR part [part ...]
#   parts: selfcheck jup laplace pluto ensemble
import json, math, os, sys, time
import numpy as np
from scipy.integrate import solve_ivp
from scipy.optimize import least_squares

FIX, DATA = sys.argv[1], sys.argv[2]
parts = sys.argv[3:]
inp = json.load(open(os.path.join(FIX, 'inputs', 'inputs.json')))
C = inp['constants']
RES = os.path.join(FIX, 'addendum-oracle-results.json')
res = json.load(open(RES)) if os.path.exists(RES) else {}
os.makedirs(os.path.join(DATA, 'oracle'), exist_ok=True)
SER = os.path.join(DATA, 'oracle', 'addendum-series.json')
ser = json.load(open(SER)) if os.path.exists(SER) else {}
RAD = math.pi / 180


def wrap(d):
    return d % 360.0


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


def angles_series(X, V, m, G):
    n = X.shape[1]
    lam = [[] for _ in range(n - 1)]; vp = [[] for _ in range(n - 1)]
    for k in range(X.shape[0]):
        for i in range(1, n):
            l, w = elements(X[k, i] - X[k, 0], V[k, i] - V[k, 0], G * (m[0] + m[i]))
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


def turning(t, phi, ref, floor, required=3):
    """The first oracle's estimator with AM5/AM6: a turning point at the first or last sample is dropped."""
    t = np.asarray(t, float); u = unwrap_deg(np.asarray(phi, float))
    win = t[-1] - t[0]; sm = smooth(t, u, ref)
    rng = sm.max() - sm.min(); drift = sm[-1] - sm[0]
    if abs(drift) >= 355:
        return {'state': 'circulation', 'period': win / (abs(drift) / 360), 'amplitude': None}
    tr = [k for k in turns_of(sm, max(floor, 0.12 * rng)) if 0 < k[1] < len(t) - 1]
    if len(tr) >= 2:
        sp = np.diff([t[k[1]] for k in tr])
        if 2 * sp.mean() < 4 * ref: tr = []
    if len(tr) < 2:
        return {'state': 'not-constrained', 'period': None, 'amplitude': None}
    P = 2 * float(np.mean(np.diff([t[k[1]] for k in tr])))
    mx = [k[2] for k in tr if k[0] == 'max']; mn = [k[2] for k in tr if k[0] == 'min']
    if win / P < required:
        return {'state': 'not-constrained', 'period': None, 'amplitude': None}
    return {'state': 'libration', 'period': P, 'amplitude': float((np.mean(mx) - np.mean(mn)) / 2),
            'center': float(wrap((np.mean(mx) + np.mean(mn)) / 2)), 'turns': len(tr)}


def harmonic(t, phi):
    """AM6: Hann-tapered line. `fft` is the zero-padded peak between W/8 and W/3; `lsq` the weighted fit from it."""
    t = np.asarray(t, float); u = unwrap_deg(np.asarray(phi, float))
    n = len(t); W = t[-1] - t[0]; dt = W / (n - 1); x = t - 0.5 * (t[0] + t[-1])
    w = 0.5 * (1 - np.cos(2 * np.pi * (t - t[0]) / W))
    d = u - np.polyval(np.polyfit(x, u, 1), x)
    pad = 64 * n
    X = np.abs(np.fft.rfft(w * d, pad)); f = np.arange(len(X)) / (pad * dt)
    band = np.where((f >= 3 / W) & (f <= 8 / W))[0]
    k = band[np.argmax(X[band])]
    y0, y1, y2 = X[k - 1], X[k], X[k + 1]
    off = 0.5 * (y0 - y2) / (y0 - 2 * y1 + y2) if (y0 - 2 * y1 + y2) != 0 else 0.0
    f_fft = (k + off) / (pad * dt)
    a_fft = 2 * (y1 - 0.25 * (y0 - y2) * off) / w.sum()
    sw = np.sqrt(w)

    def model(th):
        return th[0] + th[1] * x + th[2] * np.cos(th[4] * x) + th[3] * np.sin(th[4] * x)

    w0 = 2 * math.pi * f_fft
    A = np.column_stack([np.ones(n), x, np.cos(w0 * x), np.sin(w0 * x)]) * sw[:, None]
    lin = np.linalg.lstsq(A, sw * u, rcond=None)[0]
    th0 = np.array([lin[0], lin[1], lin[2], lin[3], w0])
    sol = least_squares(lambda th: sw * (u - model(th)), th0, x_scale='jac', method='trf',
                        ftol=1e-15, xtol=1e-15, gtol=1e-15, max_nfev=2000)
    th = sol.x
    return {'fft': {'period': 1 / f_fft, 'amplitude': float(a_fft)},
            'lsq': {'period': 2 * math.pi / abs(th[4]), 'amplitude': float(math.hypot(th[2], th[3])),
                    'center': float(wrap(th[0])), 'slope': float(th[1]), 'cost': float(2 * sol.cost),
                    'converged': bool(sol.success)}}


def arg_laplace(lam):
    return [wrap(a - 3 * b + 2 * c) for a, b, c in zip(*lam)]


def arg_pluto(lam, vp):
    return [wrap(3 * lp - 2 * ln - w) for ln, lp, w in zip(lam[0], lam[1], vp[1])]


tic = time.time()
if 'selfcheck' in parts:
    rng = np.random.default_rng(27312)
    t = np.arange(4001.0); W = 4000.0
    worstP = worstA = 0.0
    for _ in range(200):
        P0 = W / rng.uniform(3.5, 5.5)
        y = 180 + np.sin(2 * np.pi * t / P0 + rng.uniform(0, 2 * np.pi))
        for cyc, amp in ((37.3, 3.0), (91.7, 2.0), (411.3, 3.0)):
            y = y + amp * np.sin(2 * np.pi * cyc * t / W + rng.uniform(0, 2 * np.pi))
        y = y + rng.normal(0, 0.5, len(t))
        h = harmonic(t, y)['lsq']
        worstP = max(worstP, abs(h['period'] - P0) / P0); worstA = max(worstA, abs(h['amplitude'] - 1))
    res['selfcheck'] = {'series': 200, 'worstPeriodRel': worstP, 'worstAmplitudeAbs': worstA}
if 'jup' in parts:
    R = pole_rot(); GMs = C['GM_jupiter_km3_s2']
    nwin = inp['windows']['L'] + 1
    lam = []
    for k, c in enumerate((501, 502, 503)):
        txt = open(os.path.join(DATA, 'raw', 'horizons_%d.txt' % c)).read()
        body = txt[txt.index('$$SOE') + 5: txt.index('$$EOE')]
        rows = [[float(q) for q in ln.split(',')[2:8]] for ln in body.strip().split('\n')][:nwin]
        mu = GMs * (1 + C['moonMassOverJupiter'][k])
        lam.append([elements(R @ np.array(r[:3]), R @ np.array(r[3:]), mu)[0] for r in rows])
    phi = arg_laplace(lam)
    ser['jup365'] = {'phi': phi}
    res['jup365'] = harmonic(np.arange(len(phi), dtype=float), phi)
if 'laplace' in parts:
    b = inp['laplace']; n = b['n']
    t, X, V, m = integrate(b['bodies'], 1.0, n - 1.0, np.arange(n) * 1.0, 1e-10, 1e-6)
    lam, vp = angles_series(X, V, m, 1.0)
    phi = arg_laplace(lam)
    ser['laplace'] = {'phi': phi}
    res['laplace'] = {'turning': turning(t, phi, b['ref'], b['floor']), **harmonic(t, phi)}
if 'pluto' in parts:
    b = inp['pluto']; n = b['n']; G = C['G_au_yr']
    t, X, V, m = integrate(b['bodies'], G, (n - 1) * 20.0, np.arange(n) * 20.0, 1e-11, 1e-14)
    lam, vp = angles_series(X, V, m, G)
    phi = arg_pluto(lam, vp)
    ser['pluto'] = {'phi': phi}
    res['pluto'] = {'turning': turning(t, phi, b['ref'], b['floor']), **harmonic(t, phi)}
if 'ensemble' in parts:
    b = inp['laplace']; n = b['n']; out = []
    for mb in inp['ensemble']:
        t, X, V, m = integrate(mb['bodies'], 1.0, n - 1.0, np.arange(n) * 1.0, 1e-10, 1e-6)
        lam, vp = angles_series(X, V, m, 1.0)
        phi = arg_laplace(lam)
        out.append({'id': mb['id'], 'turning': turning(t, phi, b['ref'], b['floor']), **harmonic(t, phi)})
        print('member', mb['id'], out[-1]['turning']['period'], out[-1]['lsq']['period'], round(time.time() - tic, 1), flush=True)
    res['ensemble'] = out
res['_ran'] = {'python': sys.version.split()[0], 'numpy': np.__version__, 'parts': parts,
               'seconds_last_call': round(time.time() - tic, 1)}
json.dump(res, open(RES, 'w'), indent=1)
json.dump(ser, open(SER, 'w'))
print('done', parts, round(time.time() - tic, 1), 's')
