#!/usr/bin/env python3
"""The independent oracle for Prompt 255 (late-time FLRW kernel).

Written after tests/fixtures/cosmology2/thresholds.json and before js/kernels/cosmology/late existed.
It imports no Gravitas code and reads only that file's `worlds` block. Two independent calculations:

  astropy  the cited cosmology code (FlatLambdaCDM, LambdaCDM, FlatwCDM, wCDM) for the ten parameter sets
  own      this file's own implementation, scipy quad at epsabs 0 and epsrel 1e-13 with limit 500, the
           geometry and the age in the scale factor written here, and a complex-step derivative

It also draws the seeded ensemble (numpy default_rng(255)), applies its own brute-force domain check, solves
the degeneracy contours with brentq, and writes everything to tests/fixtures/cosmology2/oracle-results.json.

  python3 tools/cosmology2-oracle/oracle.py [out.json]
"""
import json
import math
import os
import sys
import warnings

import numpy as np
import scipy
from scipy.integrate import quad
from scipy.optimize import brentq, minimize_scalar

import astropy
import astropy.units as u
from astropy.cosmology import FlatLambdaCDM, FlatwCDM, LambdaCDM, wCDM

warnings.filterwarnings('ignore')

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
FIX = os.path.join(ROOT, 'tests', 'fixtures', 'cosmology2')
THRESHOLDS = json.load(open(os.path.join(FIX, 'thresholds.json')))
W = THRESHOLDS['worlds']
DOM = THRESHOLDS['domain']

C = 299792.458  # km/s, exact by the definition of the metre
GYR_PER_INV_H0 = (1.0 / (1.0 * u.km / u.s / u.Mpc)).to(u.Gyr).value  # Gyr for H0 = 1
MPC_PER_10PC = 1.0


# ---------------------------------------------------------------- own implementation (works for complex parameters too)
class P:
    def __init__(self, H0, Om, Or, Ode, w):
        self.H0, self.Om, self.Or, self.Ode, self.w = H0, Om, Or, Ode, w
        self.Ok = 1 - Om - Or - Ode


def E2(z, p):
    x = 1 + z
    return p.Om * x**3 + p.Or * x**4 + p.Ok * x**2 + p.Ode * x ** (3 * (1 + p.w))


def F(a, p):
    return p.Or + p.Om * a + p.Ok * a**2 + p.Ode * a ** (1 - 3 * p.w)


def breaks(lo, hi, pts):
    return [lo] + [b for b in pts if lo < b < hi] + [hi]


def qint(f, lo, hi, pts):
    """Sum of quads over breakpoints, scipy quad at epsabs 0, epsrel 1e-13."""
    total = 0.0
    bs = breaks(lo, hi, pts)
    for a, b in zip(bs[:-1], bs[1:]):
        total += quad(f, a, b, epsabs=0, epsrel=1e-13, limit=500)[0]
    return total


def qint_complex(f, lo, hi, pts):
    re = qint(lambda z: f(z).real, lo, hi, pts)
    im = qint(lambda z: f(z).imag, lo, hi, pts)
    return complex(re, im)


ZPTS = [0.01, 0.1, 0.5, 1, 2, 5, 10, 30, 100, 300, 1000, 3000]
SPTS = [1e-4, 1e-3, 1e-2, 0.03, 0.1, 0.2, 0.3, 0.5, 0.7, 0.9]


def chi_over_dh(z, p, cx=False):
    f = lambda zz: 1 / np.sqrt(E2(zz, p))
    return (qint_complex if cx else qint)(f, 0.0, z, ZPTS)


def lookback_gyr(z, p):
    return GYR_PER_INV_H0 / p.H0 * qint(lambda zz: 1 / ((1 + zz) * math.sqrt(E2(zz, p))), 0.0, z, ZPTS)


def age_at_z_gyr(z, p):
    """Age at redshift z in Gyr: integral of a da / sqrt(F(a)), a = s^2."""
    smax = math.sqrt(1.0 / (1 + z))
    val = qint(lambda s: 2 * s**3 / math.sqrt(F(s * s, p)), 0.0, smax, SPTS)
    return GYR_PER_INV_H0 / p.H0 * val


def geometry(chi, p, cx=False):
    """Transverse comoving distance over dh from chi = D_C / dh; None past the antipode."""
    if cx:
        if p.Ok == 0:
            return chi
        s = np.sqrt(p.Ok)
        return np.sinh(s * chi) / s
    if abs(p.Ok) < 1e-14:
        return chi
    if p.Ok > 0:
        s = math.sqrt(p.Ok)
        return math.sinh(s * chi) / s
    s = math.sqrt(-p.Ok)
    if s * chi >= math.pi:
        return None
    return math.sin(s * chi) / s


def own_quantities(z, p):
    dh = C / p.H0
    chi = chi_over_dh(z, p)
    dm_over = geometry(chi, p)
    out = {'E': math.sqrt(E2(z, p)), 'Dc': dh * chi, 'lookback': lookback_gyr(z, p), 'ageAtZ': age_at_z_gyr(z, p)}
    if dm_over is not None:
        dm = dh * dm_over
        out.update({'Dm': dm, 'Dl': (1 + z) * dm, 'Da': dm / (1 + z), 'mu': 5 * math.log10((1 + z) * dm) + 25})
    return out


def own_q(z, p):
    """q = -1 + (1 + z) E'/E by a complex-step derivative of E (no closed form for q is used)."""
    h = 1e-30
    pz = complex(z, h)
    e_c = np.sqrt(E2(pz, p))
    return -1 + (1 + z) * (e_c.imag / h) / e_c.real


def own_transition(p):
    """Brent root of own_q; None when q(0) >= 0 or there is no root up to x = 1e12."""
    if own_q(0.0, p) >= 0:
        return None
    hi = 1.0
    while own_q(hi, p) < 0:
        hi = hi * 2 + 1
        if hi > 1e12:
            return None
    return brentq(lambda z: own_q(z, p), 0.0, hi, xtol=1e-15, rtol=1e-15)


def ratio_min(p):
    """The scale-free ratio r(a) = F / (Or + Om a + |Ok| a^2 + Ode a^(1-3w)) on a dense log grid, refined."""
    a = np.geomspace(1e-8, 1.0, 200001)
    num = F(a, p)
    den = p.Or + p.Om * a + abs(p.Ok) * a**2 + p.Ode * a ** (1 - 3 * p.w)
    r = num / den
    i = int(np.argmin(r))
    lo = a[max(i - 1, 0)]
    hi = a[min(i + 1, len(a) - 1)]
    res = minimize_scalar(
        lambda la: F(math.exp(la), p) / (p.Or + p.Om * math.exp(la) + abs(p.Ok) * math.exp(2 * la) + p.Ode * math.exp((1 - 3 * p.w) * la)),
        bounds=(math.log(lo), math.log(hi)),
        method='bounded',
        options={'xatol': 1e-12},
    )
    return min(float(r[i]), float(res.fun))


def own_domain(H0, Om, Or, Ode, w):
    """The oracle's own verdict: (code, rmin, margin). Order of checks as in the amended R3."""
    vals = [H0, Om, Or, Ode, w]
    if not all(math.isfinite(v) for v in vals):
        return 'not-finite', None, False
    if not (0 < H0 <= DOM['H0'][1]):
        return 'bad-H0', None, False
    if Om < 0 or Or < 0 or Ode < 0:
        return 'negative-density', None, False
    if Om > DOM['Om'][1] or Or > DOM['Or'][1] or Ode > DOM['Ode'][1]:
        return 'density-out-of-domain', None, False
    margin_w = abs(w - DOM['w'][0]) < 1e-9 or abs(w - DOM['w'][1]) < 1e-9
    if not (DOM['w'][0] <= w <= DOM['w'][1]):
        return 'w-out-of-domain', None, margin_w
    rmin = ratio_min(P(H0, Om, Or, Ode, w))
    margin = abs(rmin) < 1e-4 or margin_w
    if rmin <= 0:
        return 'bounce', rmin, margin
    return 'ok', rmin, margin


def own_distance(params, z, quantity):
    """One quantity for a contour or a gradient (works with complex parameters); None if refused."""
    H0, Om, Or, Ode, w = params
    p = P(H0, Om, Or, Ode, w)
    dh = C / H0
    cx = any(isinstance(v, complex) for v in params)
    chi = chi_over_dh(z, p, cx)
    if quantity == 'comoving':
        return dh * chi
    dm_over = geometry(chi, p, cx)
    if dm_over is None:
        return None
    if quantity == 'transverse':
        return dh * dm_over
    if quantity == 'luminosity':
        return (1 + z) * dh * dm_over
    if quantity == 'angularDiameter':
        return dh * dm_over / (1 + z)
    raise ValueError(quantity)


# ---------------------------------------------------------------- astropy
def astropy_cosmo(s):
    T = s['tcmbK']
    kw = {}
    if T > 0:
        kw = {'Tcmb0': T * u.K, 'Neff': s.get('neff', 3.0)}
    flat = s.get('flat', False) or ('Ode' not in s)
    w = s['w']
    if flat:
        return (FlatLambdaCDM(H0=s['H0'], Om0=s['Om'], **kw) if w == -1 else FlatwCDM(H0=s['H0'], Om0=s['Om'], w0=w, **kw))
    return (LambdaCDM(H0=s['H0'], Om0=s['Om'], Ode0=s['Ode'], **kw) if w == -1 else wCDM(H0=s['H0'], Om0=s['Om'], Ode0=s['Ode'], w0=w, **kw))


def astropy_row(c, z, ok_antipode):
    r = {
        'E': float(c.efunc(z)),
        'Dc': float(c.comoving_distance(z).to(u.Mpc).value),
        'lookback': float(c.lookback_time(z).to(u.Gyr).value),
        'ageAtZ': float(c.age(z).to(u.Gyr).value),
    }
    if ok_antipode:
        r.update(
            {
                'Dm': float(c.comoving_transverse_distance(z).to(u.Mpc).value),
                'Dl': float(c.luminosity_distance(z).to(u.Mpc).value),
                'Da': float(c.angular_diameter_distance(z).to(u.Mpc).value),
                'mu': float(c.distmod(z).value),
            }
        )
    return r


def rel(a, b):
    return abs(a - b) / max(abs(b), 1e-300)


def main():
    out_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(FIX, 'oracle-results.json')
    result = {
        'format': 'gravitas.cosmology2-oracle/1',
        'note': 'written by tools/cosmology2-oracle/oracle.py (numpy, scipy, astropy; no Gravitas code) after thresholds.json and before js/kernels/cosmology/late existed',
        'tools': {
            'python': sys.version.split()[0],
            'numpy': np.__version__,
            'scipy': scipy.__version__,
            'astropy': astropy.__version__,
        },
        'constants': {'cKms': C, 'gyrPerInvH0': GYR_PER_INV_H0},
    }
    zgrid = W['zGrid']
    worst_self = 0.0
    sets = []
    for s in W['tenSets']:
        c = astropy_cosmo(s)
        Or = float(c.Ogamma0 + c.Onu0)
        Ode = float(c.Ode0)
        params = {'H0': s['H0'], 'Om': s['Om'], 'Or': Or, 'Ode': Ode, 'w': s['w']}
        p = P(params['H0'], params['Om'], Or, Ode, params['w'])
        rows = []
        for z in zgrid:
            own = own_quantities(z, p)
            ant = 'Dm' in own
            ast = astropy_row(c, z, ant)
            for k in own:
                if k in ast:
                    d = abs(own[k] - ast[k]) if k == 'mu' else rel(own[k], ast[k])
                    if k != 'mu':
                        worst_self = max(worst_self, d)
            rows.append({'z': z, 'antipode': not ant, 'astropy': ast, 'own': own, 'q': own_q(z, p)})
        age_own = GYR_PER_INV_H0 / p.H0 * qint(lambda sv: 2 * sv**3 / math.sqrt(F(sv * sv, p)), 0.0, 1.0, SPTS)
        age_ast = float(c.age(0).to(u.Gyr).value)
        worst_self = max(worst_self, rel(age_own, age_ast))
        tr = own_transition(p)
        sets.append(
            {
                'id': s['id'],
                'params': params,
                'Ok': p.Ok,
                'rows': rows,
                'age': {'astropy': age_ast, 'own': age_own},
                'transition': tr,
                'q0': own_q(0.0, p),
            }
        )
    result['sets'] = sets
    result['oracleSelfAgreementWorstRel'] = worst_self

    # -------------------------------------------------------- the seeded ensemble
    E = W['ensemble']
    rng = np.random.default_rng(255)
    draws = []
    for i in range(E['n']):
        H0 = float(rng.uniform(30, 120))
        Om = float(rng.uniform(0, 2))
        coin = float(rng.random())
        or_u = float(rng.uniform(0, 2e-4))
        Or = 0.0 if coin < 0.5 else or_u
        Ode = float(rng.uniform(0, 2))
        w = float(rng.uniform(-3.3, 0.2))
        code, rmin, margin = own_domain(H0, Om, Or, Ode, w)
        d = {'H0': H0, 'Om': Om, 'Or': Or, 'Ode': Ode, 'w': w, 'verdict': code, 'rmin': rmin, 'margin': margin, 'rows': []}
        if code == 'ok':
            p = P(H0, Om, Or, Ode, w)
            age_gyr = GYR_PER_INV_H0 / H0 * qint(lambda sv: 2 * sv**3 / math.sqrt(F(sv * sv, p)), 0.0, 1.0, SPTS)
            for z in E['z']:
                chi = chi_over_dh(z, p)
                dm = geometry(chi, p)
                row = {'z': z, 'antipode': dm is None, 'lookback': lookback_gyr(z, p)}
                if dm is not None:
                    row['luminosity'] = (1 + z) * (C / H0) * dm
                row['age'] = age_gyr
                d['rows'].append(row)
        draws.append(d)
    result['ensemble'] = {'n': E['n'], 'seed': 255, 'draws': draws}

    # -------------------------------------------------------- contours and directions
    def param_vec(base, name, value, flat):
        v = {'H0': base['H0'], 'Om': base['Om'], 'Or': base.get('Or', 0.0), 'Ode': base.get('Ode'), 'w': base.get('w', -1)}
        v[name] = value
        if flat:
            v['Ode'] = 1 - v['Om'] - v['Or']
        return v

    def dist_of(v, z, quantity):
        code, _, _ = own_domain(v['H0'], v['Om'], v['Or'], v['Ode'], v['w'])
        if code != 'ok':
            return None
        return own_distance((v['H0'], v['Om'], v['Or'], v['Ode'], v['w']), z, quantity)

    def solve_contour(spec):
        base = spec['base']
        flat = base.get('flat', False) or ('Ode' not in base)
        bv = param_vec(base, 'Om', base['Om'], flat)
        target = dist_of(bv, spec['z'], spec['quantity'])
        xs = np.linspace(spec['x']['min'], spec['x']['max'], spec['x']['n'])
        ys = np.linspace(spec['y']['min'], spec['y']['max'], 64)
        sols = []
        for xi, x in enumerate(xs):
            vals = []
            for y in ys:
                v = param_vec(base, spec['x']['name'], float(x), flat)
                if flat:
                    v['Ode'] = 1 - v['Om'] - v['Or']
                v[spec['y']['name']] = float(y)
                if flat and spec['y']['name'] != 'Ode':
                    v['Ode'] = 1 - v['Om'] - v['Or']
                d = dist_of(v, spec['z'], spec['quantity'])
                vals.append(None if d is None else d - target)
            root = None
            reason = 'all-refused' if all(v is None for v in vals) else 'no-root'
            for k in range(len(ys) - 1):
                if vals[k] is None or vals[k + 1] is None:
                    continue
                if vals[k] == 0 or vals[k] * vals[k + 1] < 0:

                    def g(y, x=x):
                        v = param_vec(base, spec['x']['name'], float(x), flat)
                        v[spec['y']['name']] = float(y)
                        if flat and spec['y']['name'] != 'Ode':
                            v['Ode'] = 1 - v['Om'] - v['Or']
                        return dist_of(v, spec['z'], spec['quantity']) - target

                    root = brentq(g, float(ys[k]), float(ys[k + 1]), xtol=1e-14, rtol=1e-14)
                    break
            sols.append({'xIndex': xi, 'x': float(x), 'y': root, 'reason': None if root is not None else reason})
        return {'target': target, 'solutions': sols}

    contours = {}
    for name in ['flatOmW', 'openOmOde', 'hubbleOm', 'skipRefusals', 'unreachableTarget']:
        contours[name] = solve_contour(W['contours'][name])
    # F3: the closed-form H0 on every grid point of the hubble contour, H0 = c (1+z) I(Om) / D_target
    spec = W['contours']['hubbleOm']
    xs = np.linspace(spec['x']['min'], spec['x']['max'], spec['x']['n'])
    h0cf = []
    for x in xs:
        p = P(1.0, float(x), 0.0, 1 - float(x), spec['base']['w'])
        h0cf.append(C * (1 + spec['z']) * chi_over_dh(spec['z'], p) / contours['hubbleOm']['target'])
    contours['hubbleOm']['h0ClosedForm'] = h0cf
    result['contours'] = contours

    directions = []
    for d in W['directions']:
        base = d['base']
        flat = base.get('flat', False) or ('Ode' not in base)
        v0 = param_vec(base, 'Om', base['Om'], flat)

        def f_of(name, value):
            v = param_vec(base, 'Om', base['Om'], flat)
            v[name] = value
            if flat and name != 'Ode':
                v['Ode'] = 1 - v['Om'] - v['Or']
            return v

        def cstep(name):
            h = 1e-30
            v = f_of(name, complex(v0[name], h))
            if flat and name != 'Ode':
                v['Ode'] = 1 - v['Om'] - v['Or']
            val = own_distance((v['H0'], v['Om'], v['Or'], v['Ode'], v['w']), d['z'], d['quantity'])
            return val.imag / h

        gx, gy = cstep(d['x']), cstep(d['y'])
        directions.append({'dDdx': gx, 'dDdy': gy, 'slope': -gx / gy, 'D': dist_of(v0, d['z'], d['quantity'])})
    result['directions'] = directions
    json.dump(result, open(out_path, 'w'), indent=1)
    open(out_path, 'a').write('\n')
    print('wrote', out_path, 'oracle self-agreement worst rel', worst_self)


if __name__ == '__main__':
    main()
