#!/usr/bin/env python3
"""Independent oracle for Prompt 227 (tests/fixtures/joint-inference/thresholds.json).

No Gravitas code. numpy, scipy (least_squares, brentq, minimize_scalar) and batman 2.5.1 (Kreidberg 2015,
PASP 127, 1161), an independent implementation of the Mandel and Agol (2002) occultation with an exact eccentric
orbit. What it supplies:

  analytic   the planet's mass from K by a root find of the full relation; Jupiter and the Earth around the Sun;
             the line-of-sight velocity of the star in a three-dimensional two-body orbit, differentiated
             numerically (the ground truth of the w convention); the total duration of eccentric transits from
             batman's exact light curve; the bulk density of one Jupiter.
  systems    S1 and S2 of the thresholds: its own data (batman light curve with 21-sample exposure averaging,
             velocities of two instruments, numpy noise, seed 227) and its own joint least-squares solution,
             the jitter by the same -2 ln L search, with the covariance (J^T J)^-1, and the derived planet mass,
             radius and density by a 400,000-draw Monte Carlo from that covariance and the stated star.

Usage: python3 tools/joint-inference-oracle/oracle.py > tests/fixtures/joint-inference/oracle-results.json
"""
import json, math, os, sys
import numpy as np
import batman
import scipy
from scipy.optimize import least_squares, brentq, minimize_scalar

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
DIR = os.path.join(ROOT, 'tests/fixtures/joint-inference')
THR = json.load(open(os.path.join(DIR, 'thresholds.json')))
C = THR['constants']
G = C['G_m3kg1s2']
GMS, GMJ, GME = C['GM_sun_m3s2'], C['GM_jup_m3s2'], C['GM_earth_m3s2']
RSUN, RJUP = C['R_sun_m'], C['R_jup_eq_m']
DAY = C['day_s']
SAMP = THR['sampling']['oracleGrid']
LC = SAMP['lightCurve']
RVS = SAMP['rv']
ST = THR['systems']['stellar']
rng = np.random.default_rng(THR['seeds']['oracle'])


def sig(x, d=9):
    return float(f'{x:.{d}g}') if np.isfinite(x) else None


def kepler_E(M, e):
    M = np.mod(M, 2 * np.pi)
    E = M + e * np.sin(M) if e < 0.8 else np.full_like(M, np.pi)
    for _ in range(60):
        E = E - (E - e * np.sin(E) - M) / (1 - e * np.cos(E))
    return E


def true_anomaly(M, e):
    E = kepler_E(M, e)
    return 2 * np.arctan2(np.sqrt(1 + e) * np.sin(E / 2), np.sqrt(1 - e) * np.cos(E / 2))


def mean_anomaly_at_conjunction(e, w):
    f = np.pi / 2 - w
    E = 2 * np.arctan2(np.sqrt(1 - e) * np.sin(f / 2), np.sqrt(1 + e) * np.cos(f / 2))
    return E - e * np.sin(E)


# ---- the planet from its mass: a, a/R*, i, K (by geometry) ----------------------------------------------------

def build(S):
    P = S['P'] * DAY
    e = S['e']
    w = math.radians(S['w_deg'])
    gm_tot = GMS * S['Ms_Msun'] + GMJ * S['Mp_MJup']
    a = (gm_tot * P * P / (4 * math.pi ** 2)) ** (1 / 3)
    aRs = a / (S['Rs_Rsun'] * RSUN)
    cosi = S['b'] * (1 + e * math.sin(w)) / (aRs * (1 - e * e))
    inc = math.acos(cosi)
    # K by geometry: the star's orbital speed projected on the line of sight (no mass formula, no G apart from the GMs)
    q = GMJ * S['Mp_MJup'] / gm_tot
    K = 2 * math.pi * a * math.sin(inc) * q / (P * math.sqrt(1 - e * e))
    return dict(P=P, e=e, w=w, a=a, aRs=aRs, inc=inc, K=K, q=q)


def rv_geometry(times_d, S, B):
    """Line-of-sight velocity (receding positive) of the star: v = q d(z_rel)/dt, z_rel toward the observer,
    differentiated with a symmetric difference over a small step. The planet's position is built from the
    orbit's own geometry (periastron at argument w from the node, node on the sky plane's x axis)."""
    P, e, w, a, inc, q = B['P'], B['e'], B['w'], B['a'], B['inc'], B['q']
    Mc = mean_anomaly_at_conjunction(e, w)

    def z(t_s):
        M = Mc + 2 * np.pi * (t_s - S['t0'] * DAY) / P
        f = true_anomaly(M, e)
        r = a * (1 - e * e) / (1 + e * np.cos(f))
        return r * np.sin(w + f) * math.sin(inc)

    t = np.asarray(times_d) * DAY
    h = 1.0  # one second
    return q * (z(t + h) - z(t - h)) / (2 * h)


def rv_formula(times_d, t0_d, P_d, K, e, w):
    Mc = mean_anomaly_at_conjunction(e, w)
    M = Mc + 2 * np.pi * (np.asarray(times_d) - t0_d) / P_d
    f = true_anomaly(M, e)
    return K * (np.cos(f + w) + e * math.cos(w))


# ---- mass from K by the full relation --------------------------------------------------------------------------

def mass_from_K(K, P_s, e, sini, Ms_msun):
    """Mp (Jupiter masses) from K = (2 pi G/P)^(1/3) Mp sini / ((Ms+Mp)^(2/3) sqrt(1-e^2)), by brentq; G cancels in
    Mp/MJup when the masses are ratios of the nominal GMs: K^3 = 2 pi GM_J^3 x^3 sini^3 /(G... ) handled with GMs."""
    def f(x):  # x in Jupiter masses
        gm_tot = GMS * Ms_msun + GMJ * x
        return (2 * math.pi / P_s) ** (1 / 3) * (GMJ * x) * sini / (gm_tot ** (2 / 3) * math.sqrt(1 - e * e)) - K
    return brentq(f, 1e-9, 1e4, xtol=1e-14, rtol=1e-14)


def density_gcc(Mp_mj, Rp_rj):
    m = GMJ * Mp_mj / G
    r = RJUP * Rp_rj
    return m / (4 / 3 * math.pi * r ** 3) / 1000.0


# ---- analytic -------------------------------------------------------------------------------------------------

def analytic():
    out = {}
    cases = []
    for Mp, P, e, i_deg, Ms in [
        (0.1, 2.5, 0.0, 90, 1.0), (0.3, 3.4, 0.05, 87, 0.9), (0.7, 3.5247, 0.0, 86.9, 1.1), (1.0, 7.0, 0.2, 89, 0.95),
        (2.0, 12.0, 0.4, 80, 1.3), (4.0, 30.0, 0.6, 60, 1.0), (8.0, 2.0, 0.1, 90, 1.5), (0.054, 4.5, 0.0, 88, 1.0),
        (0.3, 100.0, 0.3, 75, 0.7), (1.5, 1.5, 0.0, 70, 1.2), (5.0, 400.0, 0.5, 90, 1.0), (0.2, 20.0, 0.1, 85, 0.6),
    ]:
        P_s = P * DAY
        sini = math.sin(math.radians(i_deg))
        gm_tot = GMS * Ms + GMJ * Mp
        K = (2 * math.pi / P_s) ** (1 / 3) * (GMJ * Mp) * sini / (gm_tot ** (2 / 3) * math.sqrt(1 - e * e))
        cases.append(dict(Mp_MJup=Mp, P_d=P, e=e, sini=sini, Ms_Msun=Ms, K=sig(K, 12), oracleMp=sig(mass_from_K(K, P_s, e, sini, Ms), 12)))
    out['massFromK'] = cases
    # Jupiter and the Earth around the Sun, edge on and circular
    PJ = 4332.589 * DAY
    KJ = (2 * math.pi / PJ) ** (1 / 3) * GMJ / ((GMS + GMJ) ** (2 / 3))
    PE = 365.25636 * DAY
    KE = (2 * math.pi / PE) ** (1 / 3) * GME / ((GMS + GME) ** (2 / 3))
    out['jupiter'] = dict(P_d=4332.589, K=sig(KJ, 9), Mp_MJup_back=sig(mass_from_K(KJ, PJ, 0.0, 1.0, 1.0), 12))
    out['earth'] = dict(P_d=365.25636, K=sig(KE, 9))
    out['densityJupiter_gcc'] = sig(density_gcc(1.0, 1.0), 12)
    # the geometry of the velocity: three-dimensional orbit against the formula
    geo = []
    S = dict(P=3.5247, t0=2.25, k=0.12, b=0.5, Mp_MJup=1.0, Ms_Msun=1.0, Rs_Rsun=1.0, e=0, w_deg=90)
    for e in (0.0, 0.2, 0.5):
        for wd in (0, 40, 120, 250):
            S2 = dict(S, e=e, w_deg=wd, P=5.0, t0=1.0)
            B = build(S2)
            ts = np.linspace(1.0, 6.0, 61)
            v = rv_geometry(ts, S2, B)
            Kmeas = (v.max() - v.min()) / 2
            fo = rv_formula(ts, S2['t0'], S2['P'], B['K'], e, math.radians(wd))
            # the star recedes just after the transit? (planet in front: velocity falls through zero going down
            # for the circular orbit; the sign test is on the circular case below)
            geo.append(dict(e=e, w_deg=wd, K=sig(B['K'], 12), Kgeometry=sig(Kmeas, 9), maxAbsOverK_geometry_vs_formula=sig(np.abs(v - fo).max() / B['K'], 6),
                            times=[sig(x, 9) for x in ts], v_over_K=[sig(x / B['K'], 12) for x in v]))
    out['velocityGeometry'] = geo
    # sign: circular orbit, velocity a quarter period after the transit is negative (the star approaches)
    S3 = dict(S, e=0.0, w_deg=90, P=5.0, t0=1.0)
    B3 = build(S3)
    out['circularSignAfterTransit'] = sig(float(rv_geometry([1.0 + 1.25], S3, B3)[0] / B3['K']), 9)
    # eccentric durations: batman's exact light curve against the circular-equivalent mapping
    dur = []
    for e in (0.1, 0.2):
        for wd in (40, 90, 250):
            P, k, b = 4.0, 0.08, 0.3
            aRs = 9.0
            w = math.radians(wd)
            inc = math.degrees(math.acos(b * (1 + e * math.sin(w)) / (aRs * (1 - e * e))))
            p = batman.TransitParams()
            p.t0, p.per, p.rp, p.a, p.inc, p.ecc, p.w = 0.0, P, k, aRs, inc, e, wd
            p.limb_dark, p.u = 'uniform', []
            t = np.linspace(-0.3, 0.3, 600001)
            m = batman.TransitModel(p, t)
            f = m.light_curve(p)
            idx = np.where(f < 1.0 - 1e-12)[0]
            T14 = t[idx[-1]] - t[idx[0]]
            dur.append(dict(e=e, w_deg=wd, P=P, k=k, b=b, aRs_true=aRs, T14=sig(T14, 9)))
    out['durations'] = dur
    return out


# ---- the data of a system ---------------------------------------------------------------------------------------

def q_from_u(u1, u2):
    return (u1 + u2) ** 2, u1 / (2 * (u1 + u2))


def u_from_q(q1, q2):
    s = math.sqrt(q1)
    return 2 * s * q2, s * (1 - 2 * q2)


def lc_model(t, t0, P, k, aRs, b, e, w, q1, q2, f0=1.0):
    u1, u2 = u_from_q(q1, q2)
    inc = math.degrees(math.acos(min(1.0, b * (1 + e * math.sin(w)) / (aRs * (1 - e * e)))))
    p = batman.TransitParams()
    p.t0, p.per, p.rp, p.a, p.inc, p.ecc, p.w = t0, P, k, aRs, inc, e, math.degrees(w)
    p.limb_dark, p.u = 'quadratic', [u1, u2]
    ss = LC['supersample']
    m = batman.TransitModel(p, t, supersample_factor=ss, exp_time=LC['exposure_d'] * (ss - 1) / ss, max_err=0.01)
    return f0 * m.light_curve(p)


def make_system(S):
    B = build(S)
    t_lc = LC['start'] + LC['step_d'] * np.arange(LC['n'])
    q1, q2 = q_from_u(S['u1'], S['u2'])
    w = B['w']
    clean = lc_model(t_lc, S['t0'], S['P'], S['k'], B['aRs'], S['b'], S['e'], w, q1, q2)
    flux = clean + rng.normal(0, LC['sigma'], t_lc.size)
    n = RVS['n']
    t_rv = np.sort(rng.uniform(0.0, RVS['span_d'], n))
    inst = np.array([0] * (n // 2) + [1] * (n - n // 2))
    zp = np.array(RVS['zeroPoints_ms'])
    v_true = rv_geometry(t_rv, S, B)
    rv = v_true + zp[inst] + rng.normal(0, math.sqrt(RVS['sigma_ms'] ** 2 + RVS['jitter_ms'] ** 2), n)
    return dict(S=S, B=B, t_lc=t_lc, flux=flux, t_rv=t_rv, inst=inst, rv=rv, q1=q1, q2=q2)


# ---- the joint fit -------------------------------------------------------------------------------------------------

def draw_star(sigma_rel_m, sigma_rel_r, rho):
    pass


def joint_fit(D, free_e, jitter_bounds):
    S, B = D['S'], D['B']
    names = ['t0', 'P', 'k', 'aRs', 'b', 'q1', 'q2', 'K'] + (['sqrtEcosw', 'sqrtEsinw'] if free_e else []) + ['f0', 'g0', 'g1']
    truth = dict(t0=S['t0'], P=S['P'], k=S['k'], aRs=B['aRs'], b=S['b'], q1=D['q1'], q2=D['q2'], K=B['K'],
                 sqrtEcosw=math.sqrt(S['e']) * math.cos(B['w']), sqrtEsinw=math.sqrt(S['e']) * math.sin(B['w']), f0=1.0, g0=12.0, g1=-25.0)
    lo = dict(t0=S['t0'] - 0.2, P=S['P'] - 0.05, k=0.01, aRs=2.0, b=0.0, q1=0.0, q2=0.0, K=0.5, sqrtEcosw=-0.9, sqrtEsinw=-0.9, f0=0.9, g0=-200, g1=-200)
    hi = dict(t0=S['t0'] + 0.2, P=S['P'] + 0.05, k=0.4, aRs=60.0, b=1.3, q1=1.0, q2=1.0, K=500.0, sqrtEcosw=0.9, sqrtEsinw=0.9, f0=1.1, g0=200, g1=200)

    def unpack(x):
        d = dict(zip(names, x))
        if not free_e:
            d['sqrtEcosw'] = 0.0
            d['sqrtEsinw'] = 0.0
        return d

    def pred(d):
        e = d['sqrtEcosw'] ** 2 + d['sqrtEsinw'] ** 2
        w = math.atan2(d['sqrtEsinw'], d['sqrtEcosw']) if e > 0 else math.pi / 2
        # conjunction impact parameter and the true a/R*: the fit parameter aRs is the TRUE a/R* here (exact orbit)
        f = lc_model(D['t_lc'], d['t0'], d['P'], d['k'], d['aRs'], d['b'], e, w, d['q1'], d['q2'], d['f0'])
        zp = np.array([d['g0'], d['g1']])
        v = rv_formula(D['t_rv'], d['t0'], d['P'], d['K'], e, w) + zp[D['inst']]
        return f, v

    def resid(x, jit):
        d = unpack(x)
        f, v = pred(d)
        sr = np.sqrt(RVS['sigma_ms'] ** 2 + jit ** 2)
        return np.concatenate([(D['flux'] - f) / LC['sigma'], (D['rv'] - v) / sr])

    x0 = np.array([truth[n] for n in names])
    rngs = np.random.default_rng(1)
    scale = np.array([1e-3, 1e-4, 0.01, 0.1, 0.05, 0.05, 0.05, 2.0] + ([0.05, 0.05] if free_e else []) + [1e-4, 2.0, 2.0])
    best_cache = {'x': x0}

    def solve(jit):
        best = None
        starts = [best_cache['x']] + [x0 + scale * rngs.normal(0, 1, x0.size) for _ in range(2)]
        for s in starts:
            s = np.clip(s, [lo[n] + 1e-9 for n in names], [hi[n] - 1e-9 for n in names])
            r = least_squares(resid, s, args=(jit,), bounds=([lo[n] for n in names], [hi[n] for n in names]), x_scale=scale * 10, xtol=1e-12, ftol=1e-12, gtol=1e-12)
            if best is None or r.cost < best.cost:
                best = r
        best_cache['x'] = best.x
        return best

    def m2lnL(jit):
        r = solve(jit)
        sr2 = RVS['sigma_ms'] ** 2 + jit ** 2
        return 2 * r.cost + RVS['n'] * math.log(sr2)

    res = minimize_scalar(m2lnL, bounds=tuple(jitter_bounds), method='bounded', options=dict(xatol=1e-3))
    cand = [(res.fun, res.x)]
    for edge in jitter_bounds:
        cand.append((m2lnL(edge), edge))
    jit = min(cand)[1]
    r = solve(jit)
    J = r.jac
    cov = np.linalg.inv(J.T @ J)
    sd = np.sqrt(np.diag(cov))
    d = unpack(r.x)
    return dict(names=names, x=r.x, cov=cov, sd=sd, jitter=jit, chi2=2 * r.cost, d=d, unpack=unpack)


def planet_from(Kv, P_d, e, w, aRs, b, k, Ms, Rs):
    """Mp (MJ), Rp (RJ), rho (g/cc) from a draw, with the true a/R* of the exact orbit."""
    sini = math.sqrt(1 - (b * (1 + e * math.sin(w)) / (aRs * (1 - e * e))) ** 2)
    Msini = mass_from_K(Kv, P_d * DAY, e, 1.0, Ms) if False else None
    # Mp sin i from the full relation, then the mass: solve with sin i inside (equivalent, one root find)
    Mp = mass_from_K(Kv, P_d * DAY, e, sini, Ms)
    Rp = k * Rs * RSUN / RJUP
    return Mp, Rp, density_gcc(Mp, Rp)


def rsig(v):
    v = np.asarray(v)
    v = v[np.isfinite(v)]
    lo, hi = np.percentile(v, [15.865, 84.135])
    return (hi - lo) / 2


def system_result(name, S, free_e):
    D = make_system(S)
    fit = joint_fit(D, free_e, THR['sampling']['fit']['jitterBounds_ms'])
    names, x, cov, sd = fit['names'], fit['x'], fit['cov'], fit['sd']
    d = fit['d']
    # the stated star: central values from the system's own truth (a catalog-like entry, the central values equal the
    # truth for the oracle's comparison, the harness reads the same numbers) with the stated sigmas and correlation
    Ms0, Rs0 = S['Ms_Msun'], S['Rs_Rsun']
    sM, sR = Ms0 * ST['Ms']['sigma_rel'], Rs0 * ST['Rs']['sigma_rel']
    rho = ST['correlation']
    e = d['sqrtEcosw'] ** 2 + d['sqrtEsinw'] ** 2
    w = math.atan2(d['sqrtEsinw'], d['sqrtEcosw']) if e > 0 else math.pi / 2
    Mp, Rp, rh = planet_from(d['K'], d['P'], e, w, d['aRs'], d['b'], d['k'], Ms0, Rs0)
    # Monte Carlo from the fit covariance (nonlinear block) and the star
    idx = [names.index(n) for n in ['P', 'k', 'aRs', 'b', 'K'] + (['sqrtEcosw', 'sqrtEsinw'] if free_e else [])]
    cov_f = cov[np.ix_(idx, idx)]
    nd = 400000
    draws = np.random.default_rng(2270).multivariate_normal(x[idx], cov_f, nd)
    star = np.random.default_rng(2271).multivariate_normal([Ms0, Rs0], [[sM ** 2, rho * sM * sR], [rho * sM * sR, sR ** 2]], nd)
    out = np.zeros((nd, 3))
    keep = 0
    # vectorised: mass by solving the full relation per draw is slow in python, use a few Newton steps vectorised
    Kv = draws[:, idx.index(names.index('K'))] if False else draws[:, 4]
    Pd = draws[:, 0]
    kk, aa, bb = draws[:, 1], draws[:, 2], draws[:, 3]
    if free_e:
        ee = draws[:, 5] ** 2 + draws[:, 6] ** 2
        ww = np.arctan2(draws[:, 6], draws[:, 5])
    else:
        ee = np.zeros(nd)
        ww = np.full(nd, math.pi / 2)
    sini = np.sqrt(np.clip(1 - (bb * (1 + ee * np.sin(ww)) / (aa * (1 - ee ** 2))) ** 2, 1e-12, 1))
    Ms_d, Rs_d = star[:, 0], star[:, 1]
    P_s = Pd * DAY
    # solve K = (2pi/P)^(1/3) GMJ x sini / ((GMS Ms + GMJ x)^(2/3) sqrt(1-e^2)) for x by fixed-point iteration
    x_ = np.full(nd, 1.0)
    for _ in range(60):
        gm_tot = GMS * Ms_d + GMJ * x_
        x_ = Kv * gm_tot ** (2 / 3) * np.sqrt(1 - ee ** 2) / ((2 * math.pi / P_s) ** (1 / 3) * GMJ * sini)
    Mp_d = x_
    Rp_d = kk * Rs_d * RSUN / RJUP
    rho_d = (GMJ * Mp_d / G) / (4 / 3 * math.pi * (RJUP * Rp_d) ** 3) / 1000.0
    ok = np.isfinite(Mp_d) & np.isfinite(rho_d)
    # fit-alone sigma (star fixed)
    star0 = np.tile([Ms0, Rs0], (nd, 1))
    gm0 = GMS * Ms0
    x0_ = np.full(nd, 1.0)
    for _ in range(60):
        x0_ = Kv * (gm0 + GMJ * x0_) ** (2 / 3) * np.sqrt(1 - ee ** 2) / ((2 * math.pi / P_s) ** (1 / 3) * GMJ * sini)
    Rp0 = kk * Rs0 * RSUN / RJUP
    rho0 = (GMJ * x0_ / G) / (4 / 3 * math.pi * (RJUP * Rp0) ** 3) / 1000.0
    return dict(
        name=name, system=S, derivedTruth=dict(aRs_true=sig(D['B']['aRs']), K=sig(D['B']['K']), inc_deg=sig(math.degrees(D['B']['inc']))),
        data=dict(t_lc=[sig(v, 12) for v in D['t_lc']], flux=[sig(v, 9) for v in D['flux']], t_rv=[sig(v, 12) for v in D['t_rv']],
                  inst=[int(v) for v in D['inst']], rv=[sig(v, 9) for v in D['rv']]),
        fixedCircular=not free_e,
        fit=dict(names=names, value=[sig(v) for v in x], sigma=[sig(v) for v in sd], jitter=sig(fit['jitter'], 6), chi2=sig(fit['chi2'])),
        star=dict(Ms=[Ms0, sM], Rs=[Rs0, sR], correlation=rho),
        derived=dict(Mp_MJup=sig(Mp), Rp_RJup=sig(Rp), rho_gcc=sig(rh),
                     sigma=dict(Mp=sig(rsig(Mp_d[ok])), Rp=sig(rsig(Rp_d)), rho=sig(rsig(rho_d[ok]))),
                     sigmaFitOnly=dict(Mp=sig(rsig(x0_)), Rp=sig(rsig(kk * Rs0 * RSUN / RJUP)), rho=sig(rsig(rho0)))),
    )


def main():
    out = dict(
        format='gravitas.joint-inference-oracle/1',
        tools=dict(python=sys.version.split()[0], numpy=np.__version__, scipy=scipy.__version__, batman=batman.__version__),
        analytic=analytic(),
        systems={},
    )
    out['systems']['S1'] = system_result('S1', THR['systems']['S1'], False)
    out['systems']['S2'] = system_result('S2', THR['systems']['S2'], True)
    json.dump(out, sys.stdout, separators=(',', ':'))


if __name__ == '__main__':
    main()
