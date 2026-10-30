#!/usr/bin/env python3
"""Independent oracle for Prompt 218 (tests/fixtures/binary-masses/thresholds.json).

No Gravitas code. numpy 1.26 and scipy 1.13 (DOP853 integration of the two-body problem, least_squares) and batman 2.5.1
(Kreidberg 2015, PASP 127, 1161) for the two eclipses (the second in the swapped frame, as in Prompt 217's oracle).
Writes its own noise realization for X1 and X2 and fits them jointly; the radial velocities come from integrating
Newton's equation for the relative orbit in three dimensions, not from the semi-amplitude formula.
Usage: python3 tools/binary-masses-oracle/oracle.py > tests/fixtures/binary-masses/oracle-results.json
"""
import json, math, os, sys
import numpy as np
import batman
from scipy.integrate import solve_ivp
from scipy.optimize import least_squares, brentq

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
THR = json.load(open(os.path.join(ROOT, 'tests/fixtures/binary-masses/thresholds.json')))
C = THR['constants']
GM, RS, DAY = C['GM_sun_m3s2'], C['R_sun_m'], C['day_s']
SMP = THR['sampling']


def elements(s):
    """From the physical system to the observable elements, by Kepler's third law with the nominal GM."""
    M = s['M1'] + s['M2']
    Ps = s['P'] * DAY
    a = (GM * M * Ps ** 2 / (4 * math.pi ** 2)) ** (1.0 / 3)
    n = 2 * math.pi / Ps
    si = math.sin(math.radians(s['inc']))
    k1 = n * a * si / math.sqrt(1 - s['e'] ** 2) * s['M2'] / M / 1e3
    k2 = n * a * si / math.sqrt(1 - s['e'] ** 2) * s['M1'] / M / 1e3
    r1 = s['R1'] * RS / a
    r2 = s['R2'] * RS / a
    w = math.radians(s['w'])
    return dict(a=a, a_rsun=a / RS, K1=k1, K2=k2, rsum=r1 + r2, k=s['R2'] / s['R1'],
                ecosw=s['e'] * math.cos(w), esinw=s['e'] * math.sin(w), inc=s['inc'], J=s['J'],
                tc=s['tc'], P=s['P'])


def lum_ratio(el, s):
    a, b = s['ldA'], s['ldB']
    return el['J'] * el['k'] ** 2 * (1 - b[0] / 3 - b[1] / 6) / (1 - a[0] / 3 - a[1] / 6)


def flux(el, s, t):
    e = math.hypot(el['ecosw'], el['esinw'])
    w = math.degrees(math.atan2(el['esinw'], el['ecosw'])) if e > 0 else 90.0
    r1 = el['rsum'] / (1 + el['k'])
    r2 = el['k'] * r1
    p = batman.TransitParams()
    p.t0 = el['tc']; p.per = el['P']; p.rp = el['k']; p.a = 1.0 / r1; p.inc = el['inc']; p.ecc = e; p.w = w
    p.u = list(s['ldA']); p.limb_dark = 'quadratic'
    m = batman.TransitModel(p, t)
    f1 = m.light_curve(p)
    ts = float(m.get_t_secondary(p))
    q = batman.TransitParams()
    q.t0 = ts; q.per = el['P']; q.rp = 1.0 / el['k']; q.a = 1.0 / r2; q.inc = el['inc']; q.ecc = e; q.w = (w + 180.0) % 360.0
    q.u = list(s['ldB']); q.limb_dark = 'quadratic'
    f2 = batman.TransitModel(q, t).light_curve(q)
    L = lum_ratio(el, s)
    return (f1 + L * f2) / (1 + L)


def two_body_rv(s, times):
    """Line-of-sight velocities (km/s, receding positive) of both stars at times, by integrating the relative orbit.

    Frame: Z toward the observer. The orbit is built at periapsis in its plane (x toward periapsis), rotated by the
    argument of periastron w about the plane's normal and tilted by the inclination: X = -r cos(w+f), Y = -r sin(w+f) cos i,
    Z = r sin(w+f) sin i (Winn 2010). The integration is of Newton's equation; the primary conjunction is found as the
    time at which X = 0 with Z > 0 and the clock is shifted so that it is tc."""
    M = s['M1'] + s['M2']
    mu = GM * M
    e = s['e']; w = math.radians(s['w']); inc = math.radians(s['inc'])
    Ps = s['P'] * DAY
    a = (mu * Ps ** 2 / (4 * math.pi ** 2)) ** (1.0 / 3)
    q = a * (1 - e)
    vp = math.sqrt(mu * (1 + e) / q)
    # orbital-plane basis vectors in sky coordinates: unit vector at argument angle theta = w + f is
    # (-cos theta, -sin theta cos i, sin theta sin i); the in-plane position at f is r * u(w + f).
    def u(theta):
        return np.array([-math.cos(theta), -math.sin(theta) * math.cos(inc), math.sin(theta) * math.sin(inc)])
    def du(theta):
        return np.array([math.sin(theta), -math.cos(theta) * math.cos(inc), math.cos(theta) * math.sin(inc)])
    pos0 = q * u(w)                      # periapsis, f = 0
    vel0 = vp * du(w)                    # velocity at periapsis is perpendicular to the radius, along +theta
    def rhs(_, y):
        r = y[:3]
        d = np.linalg.norm(r)
        return np.concatenate([y[3:], -mu * r / d ** 3])
    span = 3.2 * Ps
    sol = solve_ivp(rhs, [0, span], np.concatenate([pos0, vel0]), method='DOP853', rtol=1e-12, atol=1e-3, dense_output=True)
    X = lambda t: sol.sol(t)[0]
    # first upward crossing of X = 0 with Z > 0 after periapsis, bracketed on a fine grid
    grid = np.linspace(0, 1.5 * Ps, 6000)
    xs = X(grid); zs = sol.sol(grid)[2]
    tconj = None
    for i in range(len(grid) - 1):
        if xs[i] * xs[i + 1] < 0 and zs[i] > 0:
            tconj = brentq(X, grid[i], grid[i + 1], xtol=1e-6, rtol=1e-14); break
    assert tconj is not None
    t = np.asarray(times, float)
    tt = tconj + ((t - s['tc']) * DAY) % (2 * Ps) * 1.0
    # fold into the integrated span: use periodicity, one period after tconj stays inside [0, 3.2 Ps]
    tt = tconj + ((t - s['tc']) * DAY) % Ps
    st = sol.sol(tt)
    vz_rel = st[5]
    v1 = (s['M2'] / M) * vz_rel / 1e3          # star 1 moves opposite to the relative velocity of star 2; receding = -Z velocity
    v2 = -(s['M1'] / M) * vz_rel / 1e3
    return v1, v2


def make_data(name, s, seed):
    el = elements(s)
    rng = np.random.default_rng(seed)
    P = s['P']
    t0 = s['tc'] - 0.15 * P
    tf = t0 + np.arange(0, int(round(4 * P * 48))) / 48.0
    f = flux(el, s, tf) + s['sigmaFlux'] * rng.standard_normal(len(tf))
    tr = np.sort(t0 + 4 * P * rng.random(20))
    v1, v2 = two_body_rv(s, tr)
    g = SMP['gammaTrue']
    sg = SMP['sigmaRv']
    y1 = g + v1 + sg * rng.standard_normal(len(tr))
    y2 = g + v2 + sg * rng.standard_normal(len(tr))
    return el, dict(tFlux=tf.tolist(), flux=f.tolist(), sigmaFlux=s['sigmaFlux'],
                    tRv=tr.tolist(), rv1=y1.tolist(), rv2=y2.tolist(), sigmaRv=sg, gamma=g)


def physical(theta, sparse=False):
    """Masses and radii from fitted elements; the oracle's own copy of the chain."""
    tc, P, rsum, k, inc, J, ecosw, esinw, K1, K2 = theta
    e = math.hypot(ecosw, esinw)
    Ps = P * DAY
    si = math.sin(math.radians(inc))
    asini = (K1 + K2) * 1e3 * Ps * math.sqrt(1 - e * e) / (2 * math.pi)
    a = asini / si
    Mt = 4 * math.pi ** 2 * a ** 3 / (GM * Ps ** 2)
    M1 = Mt * K2 / (K1 + K2)
    M2 = Mt * K1 / (K1 + K2)
    r1 = rsum / (1 + k)
    return dict(M1=M1, M2=M2, R1=r1 * a / RS, R2=k * r1 * a / RS, a=a / RS, K1=K1, K2=K2, inc=inc)


def fit(el0, s, data, rng):
    names = ['tc', 'P', 'rsum', 'k', 'inc', 'J', 'ecosw', 'esinw', 'K1', 'K2']
    truth = np.array([el0[n] for n in names])
    tf = np.array(data['tFlux']); yf = np.array(data['flux']); tr = np.array(data['tRv'])
    y1 = np.array(data['rv1']); y2 = np.array(data['rv2'])
    sf = data['sigmaFlux']; sr = data['sigmaRv']
    ecc0 = math.hypot(el0['ecosw'], el0['esinw'])

    def model(theta):
        el = dict(zip(names, theta))
        fl = flux(el, s, tf)
        e = math.hypot(el['ecosw'], el['esinw'])
        # radial velocities from the semi-amplitude form here; the integrator is the other check (B1)
        w = math.atan2(el['esinw'], el['ecosw']) if e > 0 else math.pi / 2
        # true anomaly at the primary conjunction: pi/2 - w
        fc = math.pi / 2 - w
        Ec = 2 * math.atan2(math.sqrt(1 - e) * math.sin(fc / 2), math.sqrt(1 + e) * math.cos(fc / 2))
        Mc = Ec - e * math.sin(Ec)
        Mm = Mc + 2 * math.pi * (tr - el['tc']) / el['P']
        E = Mm.copy()
        for _ in range(60):
            E = E - (E - e * np.sin(E) - Mm) / (1 - e * np.cos(E))
        f = 2 * np.arctan2(np.sqrt(1 + e) * np.sin(E / 2), np.sqrt(1 - e) * np.cos(E / 2))
        sh = np.cos(f + w) + e * math.cos(w)
        return fl, el['K1'] * sh, -el['K2'] * sh

    def resid(theta):
        fl, a1, a2 = model(theta)
        # linear parameters f0 and gamma by exact weighted least squares
        f0 = np.sum(yf * fl) / np.sum(fl * fl)
        g = (np.sum((y1 - a1) / sr ** 2) + np.sum((y2 - a2) / sr ** 2)) / (2 * len(tr) / sr ** 2)
        return np.concatenate([(yf - f0 * fl) / sf, (y1 - a1 - g) / sr, (y2 - a2 - g) / sr])

    lo = np.array([s['tc'] - 0.1 * s['P'], s['P'] * 0.985, 0.02, 0.05, 45, 0.01, -0.7, -0.7, 1, 1])
    hi = np.array([s['tc'] + 0.1 * s['P'], s['P'] * 1.015, 0.9, 20, 90, 1.0, 0.7, 0.7, 400, 400])
    x0 = truth * (1 + 0.01 * rng.standard_normal(len(truth)))
    x0[4] = min(x0[4], 89.9); x0[0] = truth[0] + 0.002
    if ecc0 == 0:
        x0[6] = 0.01; x0[7] = 0.005
    x0 = np.clip(x0, lo + 1e-9, hi - 1e-9)
    sol = least_squares(resid, x0, bounds=(lo, hi), xtol=1e-13, ftol=1e-13, gtol=1e-13, x_scale=np.maximum(np.abs(truth), 1e-3) * 0.01)
    J = sol.jac
    cov = np.linalg.inv(J.T @ J)
    dof = len(sol.fun) - len(names) - 2
    chi2 = float(np.sum(sol.fun ** 2))
    best = sol.x
    quantities = physical(best)
    # delta method through the covariance, numerical Jacobian of the physical quantities
    sig = {}
    for key in quantities:
        g = np.zeros(len(best))
        for j in range(len(best)):
            h = 1e-6 * max(abs(best[j]), 1e-3)
            up = best.copy(); dn = best.copy(); up[j] += h; dn[j] -= h
            g[j] = (physical(up)[key] - physical(dn)[key]) / (2 * h)
        sig[key] = float(math.sqrt(g @ cov @ g))
    return dict(names=names, best=best.tolist(), sigma=np.sqrt(np.diag(cov)).tolist(), quantities=quantities, sigmaQ=sig,
                chi2=chi2, dof=dof)


def main():
    res = {'format': 'gravitas.binary-masses-oracle/1', 'versions': {'numpy': np.__version__, 'batman': batman.__version__}, 'systems': {}, 'twoBody': {}}
    # B1: two-body radial velocities against phase grids for X1, X2, X3 (kernel compares to these numbers)
    for name in ('X1', 'X2', 'X3'):
        s = THR['systems'][name]
        el = elements(s)
        phases = np.arange(400) / 400.0
        t = s['tc'] + s['P'] * phases
        v1, v2 = two_body_rv(s, t)
        res['twoBody'][name] = dict(phase=400, v1=[round(float(v), 9) for v in v1], v2=[round(float(v), 9) for v in v2],
                                    K1=el['K1'], K2=el['K2'], rsum=el['rsum'], k=el['k'], a_rsun=el['a_rsun'])
    # B2/B3: data and joint fits
    for name in ('X1', 'X2'):
        s = THR['systems'][name]
        el, data = make_data(name, s, THR['seeds']['oracle'] + (1 if name == 'X1' else 2))
        out = fit(el, s, data, np.random.default_rng(THR['seeds']['oracle'] + 10))
        truthq = physical([el[n] for n in out['names']])
        res['systems'][name] = dict(data=data, fit=out, truth=dict(M1=s['M1'], M2=s['M2'], R1=s['R1'], R2=s['R2'], a=el['a_rsun'], K1=el['K1'], K2=el['K2'], inc=s['inc']),
                                    truthChain=truthq)
    print(json.dumps(res))


main()
