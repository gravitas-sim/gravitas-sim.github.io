#!/usr/bin/env python3
"""The independent reference runs of Prompt 237 (tests/fixtures/dynamics/thresholds.json).

No Gravitas code. numpy for the arrays and scipy.integrate.solve_ivp (DOP853) for the integration: direct
summation of the planar N-body problem with the softened force the thresholds file states,
a_i = G sum_j m_j (x_j - x_i) / max(r_ij, eps)^3, in Heggie units (G = 1, total cluster mass 1, virial radius 1).

  python3 tools/dynamics-oracle/reference.py ics   > tests/fixtures/dynamics/initial-conditions.json
  python3 tools/dynamics-oracle/reference.py run   > tests/fixtures/dynamics/reference-runs.json

The initial conditions are written first and read back from the pinned file by `run`, so that the
engine and this code start from the same bytes. `run` works in two processes and keeps one scratch file per
finished run (--cache DIR) so an interrupted run resumes.
"""
import json
import math
import os
import sys
import time
from multiprocessing import get_context

import numpy as np
from scipy.integrate import solve_ivp
from scipy.optimize import brentq

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
FIX = os.path.join(ROOT, 'tests/fixtures/dynamics')
THR = json.load(open(os.path.join(FIX, 'thresholds.json')))
ENS = THR['ensembles']
N = ENS['N']
EPS = 0.02
DT = 0.0025
S_EVERY = 3394  # steps between family S samples
S_SAMPLES = 10
D_EVERY = 113
D_SNAPS = 150  # snapshots 0..150
SEEDS_S = list(range(1, 17))
SEEDS_D = list(range(101, 117))
ALPHA = 2.35
MLO, MHI = 0.3, 10.0
UMAX = 0.97
RTOL, ATOL = 1e-10, 1e-12


# --- the force and the energy: the problem statement -------------------------------------------------
def accel(X, Y, m):
    dx = X[None, :] - X[:, None]
    dy = Y[None, :] - Y[:, None]
    r2 = dx * dx + dy * dy
    np.maximum(r2, EPS * EPS, out=r2)
    w = 1.0 / (r2 * np.sqrt(r2))
    np.fill_diagonal(w, 0.0)
    w *= m[None, :]
    return (w * dx).sum(1), (w * dy).sum(1)


def pair_potential(r):
    """The potential of unit masses at separation r (G = 1): -1/r outside eps, -(3 eps^2 - r^2)/(2 eps^3) inside."""
    r = np.asarray(r, float)
    inside = -(3 * EPS ** 2 - r * r) / (2 * EPS ** 3)
    with np.errstate(divide='ignore'):
        outside = -1.0 / r
    return np.where(r >= EPS, outside, inside)


def potential_each(X, Y, m):
    """phi_i = sum over j != i of m_j times the pair potential."""
    dx = X[None, :] - X[:, None]
    dy = Y[None, :] - Y[:, None]
    r = np.sqrt(dx * dx + dy * dy)
    p = pair_potential(r)
    np.fill_diagonal(p, 0.0)
    return (p * m[None, :]).sum(1)


def total_energy(X, Y, VX, VY, m):
    K = 0.5 * np.sum(m * (VX * VX + VY * VY))
    W = 0.5 * np.sum(m * potential_each(X, Y, m))
    return K + W, K, W


# --- the measurement specification (thresholds.json, definitions.measurement) -----------------------
def measure(X, Y, VX, VY, m, satellite=None):
    M = m.sum()
    Vx = np.sum(m * VX) / M
    Vy = np.sum(m * VY) / M
    E = 0.5 * ((VX - Vx) ** 2 + (VY - Vy) ** 2) + potential_each(X, Y, m)
    bound = E < 0
    out = {}
    if satellite is not None:
        cl = np.ones(len(m), bool)
        cl[satellite] = False
        cx = np.sum(m[cl] * X[cl]) / m[cl].sum()
        cy = np.sum(m[cl] * Y[cl]) / m[cl].sum()
        out['rs'] = float(math.hypot(X[satellite] - cx, Y[satellite] - cy))
        return out
    mb, xb, yb = m[bound], X[bound], Y[bound]
    MB = mb.sum()
    cx = np.sum(mb * xb) / MB
    cy = np.sum(mb * yb) / MB
    r = np.hypot(xb - cx, yb - cy)
    order = np.argsort(r, kind='stable')
    rs, ms = r[order], mb[order]
    cum = np.cumsum(ms)

    def lag(p):
        return float(rs[np.searchsorted(cum, p * MB, side='left')])

    r10, r50, r90 = lag(0.1), lag(0.5), lag(0.9)
    inner = r <= r50
    seg = float((mb[inner].sum() / inner.sum()) / (MB / len(mb)))
    esc = float((M - MB) / M)
    out.update({'r10': r10, 'r50': r50, 'r90': r90, 'seg': seg, 'esc': esc})
    return out


# --- the initial conditions (thresholds.json, ensembles) --------------------------------------------
def softened_W(X, Y, m):
    return 0.5 * np.sum(m * potential_each(X, Y, m))


def normalise(X, Y, VX, VY, m):
    M = m.sum()
    cx, cy = np.sum(m * X) / M, np.sum(m * Y) / M
    X, Y = X - cx, Y - cy
    vx, vy = np.sum(m * VX) / M, np.sum(m * VY) / M
    VX, VY = VX - vx, VY - vy
    # |W| = G M^2 / (2 R_v) with R_v = 1 and M = 1: find the scale of the lengths
    f = lambda s: -softened_W(s * X, s * Y, m) - 0.5 * M * M
    s = brentq(f, 0.05, 20.0, xtol=1e-15, rtol=1e-15)
    X, Y = s * X, s * Y
    K = 0.5 * np.sum(m * (VX * VX + VY * VY))
    W = softened_W(X, Y, m)
    k = math.sqrt(-0.5 * W / K)  # 2K = |W|
    return X, Y, k * VX, k * VY


def make_cluster(rng, n, spectrum):
    if spectrum:
        u = rng.random(n)
        a1 = 1 - ALPHA
        m = (MLO ** a1 + u * (MHI ** a1 - MLO ** a1)) ** (1 / a1)
        m = m / m.sum()
    else:
        m = np.full(n, 1.0 / n)
    u = rng.random(n) * UMAX
    R = np.sqrt(u / (1 - u))
    th = rng.random(n) * 2 * math.pi
    X, Y = R * np.cos(th), R * np.sin(th)
    sigma = np.sqrt(0.5 * (u / UMAX) / (R + EPS))
    VX, VY = rng.normal(size=n) * sigma, rng.normal(size=n) * sigma
    return m, X, Y, VX, VY


def ics_S(seed):
    rng = np.random.default_rng(seed)
    m, X, Y, VX, VY = make_cluster(rng, N, True)
    X, Y, VX, VY = normalise(X, Y, VX, VY, m)
    return m, X, Y, VX, VY


def ics_D(seed):
    rng = np.random.default_rng(seed)
    m, X, Y, VX, VY = make_cluster(rng, N, False)
    X, Y, VX, VY = normalise(X, Y, VX, VY, m)
    phi = rng.random() * 2 * math.pi
    menc = m[np.hypot(X, Y) < 2.0].sum()
    vc = math.sqrt(menc / 2.0)
    ms = 0.1
    xs, ys = 2.0 * math.cos(phi), 2.0 * math.sin(phi)
    vxs, vys = -vc * math.sin(phi), vc * math.cos(phi)
    m = np.append(m, ms)
    X, Y = np.append(X, xs), np.append(Y, ys)
    VX, VY = np.append(VX, vxs), np.append(VY, vys)
    M = m.sum()
    X, Y = X - np.sum(m * X) / M, Y - np.sum(m * Y) / M
    VX, VY = VX - np.sum(m * VX) / M, VY - np.sum(m * VY) / M
    return m, X, Y, VX, VY


def ics_json():
    out = {'format': 'gravitas.dynamics-initial-conditions/1', 'generator': 'tools/dynamics-oracle/reference.py ics',
           'numpy': np.__version__, 'units': 'Heggie: G = 1, cluster mass 1, virial radius 1; planar',
           'epsilon': EPS, 'S': {}, 'D': {}}
    for fam, seeds, fn in (('S', SEEDS_S, ics_S), ('D', SEEDS_D, ics_D)):
        for s in seeds:
            m, X, Y, VX, VY = fn(s)
            out[fam][str(s)] = {'m': m.tolist(), 'x': X.tolist(), 'y': Y.tolist(), 'vx': VX.tolist(), 'vy': VY.tolist()}
    return out


def load_ics():
    return json.load(open(os.path.join(FIX, 'initial-conditions.json')))


# --- integration -------------------------------------------------------------------------------------
def rhs_factory(m):
    n = len(m)

    def rhs(t, y):
        X, Y, VX, VY = y[:n], y[n:2 * n], y[2 * n:3 * n], y[3 * n:]
        ax, ay = accel(X, Y, m)
        return np.concatenate([VX, VY, ax, ay])

    return rhs


def integrate(ic, times):
    m = np.array(ic['m'])
    y0 = np.concatenate([ic['x'], ic['y'], ic['vx'], ic['vy']])
    n = len(m)
    sol = solve_ivp(rhs_factory(m), [0.0, times[-1]], y0, method='DOP853', rtol=RTOL, atol=ATOL, t_eval=times)
    if not sol.success or sol.y.shape[1] != len(times):
        raise RuntimeError('integration failed: ' + str(sol.message))
    snaps = []
    for k in range(len(times)):
        y = sol.y[:, k]
        snaps.append((y[:n], y[n:2 * n], y[2 * n:3 * n], y[3 * n:]))
    return m, snaps, int(sol.nfev)


def conservation(m, snaps):
    E0 = total_energy(*snaps[0][:2], *snaps[0][2:], m)[0]
    dE = 0.0
    pmax = 0.0
    L0 = None
    dL = 0.0
    for (X, Y, VX, VY) in snaps:
        E = total_energy(X, Y, VX, VY, m)[0]
        dE = max(dE, abs(E - E0) / abs(E0))
        p = math.hypot(np.sum(m * VX), np.sum(m * VY))
        pmax = max(pmax, p)
        L = float(np.sum(m * (X * VY - Y * VX)))
        L0 = L if L0 is None else L0
        dL = max(dL, abs(L - L0))
    return {'energyRelative': dE, 'momentum': pmax, 'angularMomentum': dL, 'E0': float(E0)}


def run_S(seed):
    ics = load_ics()
    times = [k * S_EVERY * DT for k in range(S_SAMPLES + 1)]
    t0 = time.time()
    m, snaps, nfev = integrate(ics['S'][str(seed)], times)
    obs = [measure(*s, m) for s in snaps]
    cons = conservation(m, snaps)
    keep = {}
    if seed in (1, 2, 3):
        keep = {str(k): {'x': snaps[k][0].tolist(), 'y': snaps[k][1].tolist(), 'vx': snaps[k][2].tolist(), 'vy': snaps[k][3].tolist(), 'm': m.tolist(), 'observables': obs[k]} for k in (1, 5, 10)}
    return {'seed': seed, 'observables': obs, 'conservation': cons, 'nfev': nfev, 'seconds': time.time() - t0, 'snapshots': keep}


def run_D(seed):
    ics = load_ics()
    times = [j * D_EVERY * DT for j in range(D_SNAPS + 1)]
    t0 = time.time()
    m, snaps, nfev = integrate(ics['D'][str(seed)], times)
    sat = len(m) - 1
    rs = [measure(*s, m, satellite=sat)['rs'] for s in snaps]
    cons = conservation(m, snaps)
    keep = {}
    if seed in (101, 102, 103):
        keep = {str(j): {'x': snaps[j][0].tolist(), 'y': snaps[j][1].tolist(), 'vx': snaps[j][2].tolist(), 'vy': snaps[j][3].tolist(), 'm': m.tolist(), 'observables': {'rs': rs[j]}} for j in (10, 50, 100)}
    return {'seed': seed, 'rs': rs, 'conservation': cons, 'nfev': nfev, 'seconds': time.time() - t0, 'snapshots': keep}


def job(args):
    fam, seed, cache = args
    path = os.path.join(cache, f'{fam}{seed}.json')
    if os.path.exists(path):
        return json.load(open(path))
    r = run_S(seed) if fam == 'S' else run_D(seed)
    json.dump(r, open(path, 'w'))
    print(f'  {fam}{seed}: {r["seconds"]:.0f} s, nfev {r["nfev"]}, dE {r["conservation"]["energyRelative"]:.2e}', file=sys.stderr, flush=True)
    return r


# --- R3: the softened two-body orbit closes ---------------------------------------------------------
def two_body():
    m = np.array([0.5, 0.5])
    a, e = 0.2, 0.5
    mu = m.sum()
    rp = a * (1 - e)
    vp = math.sqrt(mu * (1 + e) / (a * (1 - e)))
    # relative orbit started at periapsis; bodies at +-half the relative vector, velocities +-half
    y0 = np.array([rp / 2, -rp / 2, 0, 0, 0, 0, vp / 2, -vp / 2])  # X(2), Y(2), VX(2), VY(2)
    y0 = np.array([rp / 2, -rp / 2, 0.0, 0.0, 0.0, 0.0, vp / 2, -vp / 2])
    rhs = rhs_factory(m)

    def periapsis(t, y):
        # radial velocity of the relative vector: zero at periapsis and apoapsis
        dx, dy = y[0] - y[1], y[2] - y[3]
        dvx, dvy = y[4] - y[5], y[6] - y[7]
        return dx * dvx + dy * dvy

    periapsis.direction = 1
    T = 2 * math.pi * math.sqrt(a ** 3 / mu)
    sol = solve_ivp(rhs, [0, 10.5 * T], y0, method='DOP853', rtol=1e-12, atol=1e-14, events=periapsis, dense_output=False)
    ev = sol.t_events[0]
    # the start is itself a periapsis with zero radial speed; the 10th later crossing closes ten revolutions
    t10 = float(ev[9]) if len(ev) >= 10 else float('nan')
    period = t10 / 10
    X, Y, VX, VY = sol.y[0:2], sol.y[2:4], sol.y[4:6], sol.y[6:8]
    E0 = total_energy(X[:, 0], Y[:, 0], VX[:, 0], VY[:, 0], m)[0]
    E1 = total_energy(X[:, -1], Y[:, -1], VX[:, -1], VY[:, -1], m)[0]
    L0 = float(np.sum(m * (X[:, 0] * VY[:, 0] - Y[:, 0] * VX[:, 0])))
    L1 = float(np.sum(m * (X[:, -1] * VY[:, -1] - Y[:, -1] * VX[:, -1])))
    return {'periodAnalytic': T, 'periodMeasured': period, 'periodRelative': abs(period - T) / T,
            'energyRelative': abs(E1 - E0) / abs(E0), 'angularMomentumRelative': abs(L1 - L0) / abs(L0), 'periapsisCrossings': int(len(ev))}


# --- R5: reproducibility ----------------------------------------------------------------------------
def reproducibility(pinnedS, pinnedD):
    a = run_S_short(1)
    b = run_D_short(101)
    worst = 0.0
    for key in ('r10', 'r50', 'r90', 'seg', 'esc'):
        worst = max(worst, abs(a[key] - pinnedS['observables'][1][key]) / abs(pinnedS['observables'][1][key]))
    worst = max(worst, abs(b - pinnedD['rs'][50]) / abs(pinnedD['rs'][50]))
    return {'relative': worst, 'S': 'seed 1, sample 1', 'D': 'seed 101, snapshot 50'}


def run_S_short(seed):
    ics = load_ics()
    times = [0.0, S_EVERY * DT]
    m, snaps, _ = integrate(ics['S'][str(seed)], times)
    return measure(*snaps[1], m)


def run_D_short(seed):
    ics = load_ics()
    times = [j * D_EVERY * DT for j in range(51)]
    m, snaps, _ = integrate(ics['D'][str(seed)], times)
    return measure(*snaps[50], m, satellite=len(m) - 1)['rs']


# --- the initial conditions' own properties (R6) -----------------------------------------------------
def ic_properties():
    ics = load_ics()
    worst = {'mass': 0.0, 'centre': 0.0, 'momentum': 0.0, 'virial': 0.0, 'radius': 0.0}
    for fam in ('S', 'D'):
        for key, ic in ics[fam].items():
            m = np.array(ic['m'])
            X, Y, VX, VY = (np.array(ic[k]) for k in ('x', 'y', 'vx', 'vy'))
            M = m.sum()
            if fam == 'D':
                cl = np.arange(len(m)) < len(m) - 1
                mc, Xc, Yc, VXc, VYc = m[cl], X[cl], Y[cl], VX[cl], VY[cl]
                worst['mass'] = max(worst['mass'], abs(M - 1.1))
            else:
                mc, Xc, Yc, VXc, VYc = m, X, Y, VX, VY
                worst['mass'] = max(worst['mass'], abs(M - 1.0))
            worst['centre'] = max(worst['centre'], abs(np.sum(m * X)) / M, abs(np.sum(m * Y)) / M)
            worst['momentum'] = max(worst['momentum'], abs(np.sum(m * VX)) / M, abs(np.sum(m * VY)) / M)
            # the virial properties are those of the cluster alone (family D: before the satellite)
            Mc = mc.sum()
            cx, cy = np.sum(mc * Xc) / Mc, np.sum(mc * Yc) / Mc
            Xs, Ys = Xc - cx, Yc - cy
            vx, vy = np.sum(mc * VXc) / Mc, np.sum(mc * VYc) / Mc
            K = 0.5 * np.sum(mc * ((VXc - vx) ** 2 + (VYc - vy) ** 2))
            W = softened_W(Xs, Ys, mc)
            worst['virial'] = max(worst['virial'], abs(2 * K / abs(W) - 1))
            worst['radius'] = max(worst['radius'], abs(Mc * Mc / (2 * abs(W)) - 1))
    return worst


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else ''
    if cmd == 'ics':
        print(json.dumps(ics_json(), separators=(',', ':')))
        return
    if cmd != 'run':
        print(__doc__)
        return
    cache = os.environ.get('DYN_CACHE', '/tmp/dyn-ref-cache')
    os.makedirs(cache, exist_ok=True)
    ctx = get_context('spawn')
    jobs = [('S', s, cache) for s in SEEDS_S] + [('D', s, cache) for s in SEEDS_D]
    with ctx.Pool(2) as pool:
        res = pool.map(job, jobs, chunksize=1)
    S = [r for r in res if 'observables' in r]
    D = [r for r in res if 'rs' in r]
    out = {
        'format': 'gravitas.dynamics-reference-runs/1',
        'generator': 'tools/dynamics-oracle/reference.py run',
        'code': 'scipy.integrate.solve_ivp DOP853, rtol 1e-10, atol 1e-12, direct summation in numpy',
        'numpy': np.__version__, 'scipy': __import__('scipy').__version__, 'python': sys.version.split()[0],
        'parameters': {'N': N, 'epsilon': EPS, 'dt': DT, 'sEvery': S_EVERY, 'dEvery': D_EVERY, 'rtol': RTOL, 'atol': ATOL},
        'S': {'seeds': SEEDS_S, 'times': [k * S_EVERY * DT for k in range(S_SAMPLES + 1)],
              'r10': [[o['r10'] for o in r['observables']] for r in S], 'r50': [[o['r50'] for o in r['observables']] for r in S],
              'r90': [[o['r90'] for o in r['observables']] for r in S], 'seg': [[o['seg'] for o in r['observables']] for r in S],
              'esc': [[o['esc'] for o in r['observables']] for r in S],
              'conservation': [r['conservation'] for r in S], 'seconds': [round(r['seconds'], 1) for r in S]},
        'D': {'seeds': SEEDS_D, 'times': [j * D_EVERY * DT for j in range(D_SNAPS + 1)],
              'rs': [r['rs'] for r in D], 'conservation': [r['conservation'] for r in D], 'seconds': [round(r['seconds'], 1) for r in D]},
        'snapshots': {'S': {str(r['seed']): r['snapshots'] for r in S if r['snapshots']},
                      'D': {str(r['seed']): r['snapshots'] for r in D if r['snapshots']}},
        'R3': two_body(),
        'R5': reproducibility(S[0], D[0]),
        'R6': ic_properties(),
    }
    print(json.dumps(out, separators=(',', ':')))


if __name__ == '__main__':
    main()
