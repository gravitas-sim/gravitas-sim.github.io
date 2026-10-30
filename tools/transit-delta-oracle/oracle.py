#!/usr/bin/env python3
"""Independent oracle for Prompt 225 (tests/fixtures/transit-delta/thresholds.json).

No Gravitas code. numpy, scipy (least_squares) and batman 2.5.1 (Kreidberg 2015, PASP 127, 1161), which holds the
quadratic and the four-coefficient ("nonlinear", Claret 2000) laws: an independent implementation of the Mandel and
Agol (2002) occultation. The fitter is scipy's trust-region least squares, multi-start, with the baseline fitted as a
parameter and the covariance (J^T J)^-1 at the optimum; nothing is shared with js/inference.
It writes its own noise for the synthetic cases (numpy default_rng, seed 225) and fits the shipped HD 209458 rows.
Usage: python3 tools/transit-delta-oracle/oracle.py > tests/fixtures/transit-delta/oracle-results.json
"""
import json, math, os, sys
import numpy as np
import batman
import scipy
from scipy.optimize import least_squares

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
DIR = os.path.join(ROOT, 'tests/fixtures/transit-delta')
THR = json.load(open(os.path.join(DIR, 'thresholds.json')))
C4 = THR['law']['test']
SAMP = THR['sampling']['oracleGrid']
EXPO = SAMP['exposure_d']
SS = SAMP['supersample']  # the exposure integral's converged sampling (batman includes both end points, so 5 is not converged)
SS_SCREEN = 5  # the first pass over the starts
MAXERR = 0.01  # ppm, batman's quadrature tolerance


def q_to_u(q1, q2):
    s = math.sqrt(q1)
    return [2 * s * q2, s * (1 - 2 * q2)]


def flux_model(t, t0, P, k, aRs, b, law, u, exposure=0.0, inc=None, ecc=0.0, w=90.0, max_err=MAXERR, ss=None):
    p = batman.TransitParams()
    p.t0 = t0
    p.per = P
    p.rp = k
    p.a = aRs
    p.inc = inc if inc is not None else math.degrees(math.acos(min(1.0, b / aRs)))
    p.ecc = ecc
    p.w = w
    p.limb_dark = 'nonlinear' if law == 'claret4' else 'quadratic'
    p.u = list(u)
    if exposure > 0:
        m = batman.TransitModel(p, t, supersample_factor=ss or SS, exp_time=exposure, max_err=max_err)
    else:
        m = batman.TransitModel(p, t, max_err=max_err)
    return m.light_curve(p)


NAMES_Q = ['t0', 'P', 'k', 'aRs', 'b', 'q1', 'q2', 'f0']
NAMES_C = ['t0', 'P', 'k', 'aRs', 'b', 'f0']


def fit(t, f, sig, law, bounds, starts, c4=None, exposure=EXPO, fixed=None, max_err=MAXERR):
    fixed = fixed or {}
    names = [n for n in (NAMES_Q if law == 'quadratic' else NAMES_C) if n not in fixed]
    lo = np.array([bounds[n][0] for n in names])
    hi = np.array([bounds[n][1] for n in names])

    def model(x, ss):
        d = dict(zip(names, x), **fixed)
        u = q_to_u(d['q1'], d['q2']) if law == 'quadratic' else c4
        return d['f0'] * flux_model(t, d['t0'], d['P'], d['k'], d['aRs'], d['b'], law, u, exposure, max_err=max_err, ss=ss)

    def run(x0, ss, nfev):
        return least_squares(lambda x: (model(x, ss) - f) / sig, x0, bounds=(lo, hi), method='trf', x_scale='jac',
                             ftol=1e-12, xtol=1e-12, gtol=1e-12, max_nfev=nfev)

    # Pass one: every start, at the screening sampling of the exposure. Pass two: the best three, polished at the
    # converged sampling (SS). The answer is the lowest chi-square at the converged sampling.
    screened = []
    for s_ in starts:
        x0 = np.clip(np.array([s_[n] for n in names]), lo + 1e-9, hi - 1e-9)
        try:
            r = run(x0, SS_SCREEN, 150)
        except Exception:
            continue
        screened.append((float(np.sum(r.fun ** 2)), r.x))
    screened.sort(key=lambda a: a[0])
    best = None
    for _, x0 in screened[:3]:
        try:
            r = run(np.clip(x0, lo + 1e-9, hi - 1e-9), SS, 300)
        except Exception:
            continue
        chi2 = float(np.sum(r.fun ** 2))
        if best is None or chi2 < best[0]:
            best = (chi2, r)
    chi2, r = best
    J = r.jac
    JtJ = J.T @ J
    singular = bool(np.linalg.cond(JtJ) > 1e14)
    cov = np.linalg.pinv(JtJ) if singular else np.linalg.inv(JtJ)
    sig_p = np.sqrt(np.abs(np.diag(cov)))
    return {
        'names': names,
        'values': {n: float(v) for n, v in zip(names, r.x)},
        'sigma': {n: float(v) for n, v in zip(names, sig_p)},
        'chi2': chi2,
        'n': int(len(t)),
        'atBound': [n for n, v, a, b_ in zip(names, r.x, lo, hi) if abs(v - a) < 1e-7 or abs(v - b_) < 1e-7],
        'nfev': int(r.nfev),
        'singular': singular,
        'fixed': fixed,
    }


def law_of(c):
    return c['law']


def rnd(a, d=9):
    return [round(float(v), d) for v in a]


def main():
    rng = np.random.default_rng(THR['seeds']['oracle'])
    out = {'oracle': {'numpy': np.__version__, 'scipy': scipy.__version__, 'batman': batman.__version__,
                      'python': sys.version.split()[0], 'law': 'batman nonlinear = Claret (2000) four-coefficient',
                      'maxErrPpm': MAXERR}}
    # ---- forward cases
    fw = THR['forwardCases']
    out['forward'] = {}
    for name, c in fw['cases'].items():
        t = c['t0'] + np.linspace(-fw['window_d'], fw['window_d'], fw['points'])
        u = c['u'] if c['law'] == 'quadratic' else C4
        fl = flux_model(t, c['t0'], c['P'], c['k'], c['aRs'], c['b'], c['law'], u)
        out['forward'][name] = {'flux': rnd(fl, 10)}
    # sanity: the test law is positive and rises to the centre
    mu = np.linspace(0, 1, 2001)
    I = 1 - sum(c * (1 - mu ** (n / 2)) for n, c in zip([1, 2, 3, 4], C4))
    assert I.min() > 0 and np.all(np.diff(I) >= -1e-12), 'the test law must be physical'
    out['lawCheck'] = {'Imin': float(I.min()), 'monotone': True}

    # ---- synthetic cases
    t = SAMP['start'] + SAMP['step_d'] * np.arange(SAMP['n'])
    out['synthetic'] = {}
    sc = THR['syntheticCases']
    bounds_base = {'k': [0.005, 0.5], 'aRs': [1.5, 200.0], 'b': [0.0, 1.5], 'q1': [0.0, 1.0], 'q2': [0.0, 1.0],
                   'f0': [0.5, 1.5]}
    for name, c in sc.items():
        u = c['u'] if c['law'] == 'quadratic' else C4
        if name == 'S4':
            inc = c['inc']
            fl = flux_model(t, c['t0'], c['P'], c['k'], c['aRs'], None, 'claret4', C4, EXPO, inc=inc, ecc=c['ecc'],
                            w=c['w'])
            e, w = c['ecc'], math.radians(c['w'])
            btrue = c['aRs'] * math.cos(math.radians(inc)) * (1 - e * e) / (1 + e * math.sin(w))
            truth = dict(c, b=btrue)
        else:
            fl = flux_model(t, c['t0'], c['P'], c['k'], c['aRs'], c['b'], c['law'], u, EXPO)
            truth = dict(c)
        f = c['f0'] * fl + c['sigma'] * rng.standard_normal(len(t))
        f = np.array(rnd(f, 9))
        G = THR['constants']['G_m3kg1s2']
        Ps = c['P'] * THR['constants']['day_s']
        rho = 3 * math.pi * c['aRs'] ** 3 / (G * Ps ** 2)
        out['synthetic'][name] = {'truth': truth, 'rhoTrue_gcm3': rho / 1000.0, 'time': rnd(t, 9), 'flux': f.tolist(),
                                  'sigma': c['sigma']}
        bounds = dict(bounds_base)
        bounds['t0'] = [c['t0'] - 0.3, c['t0'] + 0.3]
        bounds['P'] = [c['P'] - 0.05, c['P'] + 0.05]
        starts = []
        for dk, db, da in [(1, 0, 1), (0.85, 0.12, 0.92), (1.15, -0.12, 1.08), (0.9, 0.25, 0.95), (1.1, -0.2, 1.05),
                           (1.0, 0.05, 1.0)]:
            bt = max(0.0, min(1.4, truth['b'] + db))
            for q1, q2 in ((0.38, 0.29), (0.15, 0.6), (0.6, 0.2)):
                starts.append({'t0': c['t0'] + 0.002, 'P': c['P'] * 1.00002, 'k': c['k'] * dk, 'aRs': c['aRs'] * da,
                               'b': bt, 'q1': q1, 'q2': q2, 'f0': 1.0})
            if law_of(c) == 'claret4':
                starts = starts[::3]
        law = c['law']
        res = fit(t, f, c['sigma'] * np.ones_like(t), law, bounds, starts, c4=C4 if law == 'claret4' else None)
        out['synthetic'][name]['fit'] = res
        print('done', name, file=sys.stderr, flush=True)

    # ---- the real light curve
    hd = json.load(open(os.path.join(DIR, 'hd209458-s56.json')))
    th = np.array(hd['time'])
    fh = np.array(hd['flux'])
    sh = np.array(hd['error'])
    x0 = th[0]
    bounds = dict(bounds_base)
    bounds['t0'] = [x0, x0 + 3.65]
    bounds['P'] = [3.4, 3.65]
    # The first transit's centre from the data: the lowest 7-point running mean in the first 3.65 days.
    sel = th < x0 + 3.65
    sm = np.convolve(fh[sel], np.ones(7) / 7, mode='same')
    tc = float(th[sel][3:-3][np.argmin(sm[3:-3])])
    starts = []
    for b0 in (0.15, 0.45, 0.75):
        for q1, q2 in ((0.36, 0.3), (0.15, 0.6), (0.5, 0.2), (0.8, 0.4)):
            starts.append({'t0': tc, 'P': 3.5247, 'k': 0.12, 'aRs': 8.8, 'b': b0, 'q1': q1, 'q2': q2, 'f0': 1.0})
    out['hd209458'] = {'n': int(len(th)), 'tc0Guess': tc}
    print('done synthetic', file=sys.stderr, flush=True)
    out['hd209458']['quadratic'] = fit(th, fh, sh, 'quadratic', bounds, starts, max_err=0.1)
    print('done hd quadratic', file=sys.stderr, flush=True)
    c4starts = [dict(s_, b=0.43) for s_ in starts[::4]]
    out['hd209458']['claret4FixedB'] = fit(th, fh, sh, 'claret4', bounds, c4starts, c4=C4, fixed={'b': 0.43}, max_err=0.1)
    json.dump(out, sys.stdout, separators=(',', ':'))
    sys.stdout.write('\n')


if __name__ == '__main__':
    main()
