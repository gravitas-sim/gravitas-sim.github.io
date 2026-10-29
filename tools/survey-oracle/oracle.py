#!/usr/bin/env python3
"""Independent oracle for Prompt 215 (tests/fixtures/survey/thresholds.json).

No Gravitas code. NumPy and SciPy build the CCD equation, the depths (brentq), the counts (quad) and the completeness
(norm.cdf) their own way; Astropy's FlatLambdaCDM checks the Euclidean count. Usage:
  python3 tools/survey-oracle/oracle.py > tests/fixtures/survey/oracle-results.json
"""
import json, sys, types, math
import numpy as np
from scipy import integrate, optimize, special, stats

try:
    import yaml  # noqa: F401
except ModuleNotFoundError:
    # astropy.cosmology imports astropy.io.misc.yaml at load although nothing here reads YAML: an inert stand-in
    # with the classes it subclasses lets the import finish (PyYAML is not installed; nothing was installed).
    class _Meta(type):
        def __getattr__(cls, name):
            return lambda *a, **k: None
    class _Inert(metaclass=_Meta):
        pass
    class _Stub(types.ModuleType):
        def __getattr__(self, name):
            if name.startswith('__'):
                raise AttributeError(name)
            if name[0].isupper():
                return _Meta(name, (_Inert,), {})
            return _Stub(name)
    stub = _Stub('yaml')
    sys.modules['yaml'] = stub
import astropy
from astropy.cosmology import FlatLambdaCDM

ROOT = __file__.replace('tools/survey-oracle/oracle.py', '')
THR = json.load(open(ROOT + 'tests/fixtures/survey/thresholds.json'))
SET = {k: v for k, v in THR['setups'].items() if k != 'note'}
CLS = {k: v for k, v in THR['classes'].items() if k != 'note'}
NIGHT = THR['night']
FWHM = 2 * math.sqrt(2 * math.log(2))
SR = (math.pi / 180) ** 2


def sky_pix(S):
    return S['zeroPoint'] * 10 ** (-0.4 * S['skyMag']) * S['pixelScale'] ** 2


def sigma_pix(S):
    return S['fwhm'] / S['pixelScale'] / FWHM


def npix(S):
    return 4 * math.pi * sigma_pix(S) ** 2


def snr(S, t, v, m):
    F = S['zeroPoint'] * 10 ** (-0.4 * m)
    sig = F * t * v
    var = sig + npix(S) * ((sky_pix(S) + S['darkRate']) * t * v + S['readNoise'] ** 2 * v)
    return sig / math.sqrt(var)


def mag_at(S, t, v, s):
    return optimize.brentq(lambda m: snr(S, t, v, m) - s, -5, 45, xtol=1e-12)


def n_cum(C, m):
    return C['n0'] * 10 ** (C['alpha'] * (m - C['m0']))


def detections(S, t, v, theta, C):
    mA = mag_at(S, t, v, theta + 4)
    mB = mag_at(S, t, v, max(theta - 4.75, 0.05))
    mEnd = min(mB, C['mMax'])
    a = C['alpha'] * math.log(10)
    f = lambda m: stats.norm.cdf(snr(S, t, v, m) - theta) * a * n_cum(C, m)
    tail = integrate.quad(f, mA, mEnd, epsabs=0, epsrel=1e-12, limit=400)[0] if mEnd > mA else 0.0
    return n_cum(C, mA) + tail


def plan(S, C, t, v, nights, theta=5.0, h=8.0, clear=0.6):
    total = nights * h * 3600 * clear
    cycle = v * (t + S['overhead'])
    pts = math.floor(total / cycle)
    area = pts * S['fovDeg2']
    depth = mag_at(S, t, v, theta)
    well = S['fullWell'] / (sky_pix(S) + S['darkRate'])
    out = dict(pointings=pts, area=area, depth=depth, well=well)
    if depth <= C['mMax']:
        d = detections(S, t, v, theta, C)
        el = 3600 ** 2 / (4 * math.pi * (S['fwhm'] / FWHM) ** 2)
        fp = stats.norm.sf(theta) * el
        out.update(sharp=n_cum(C, depth) * area, detected=d * area, falsePositives=fp * area,
                   reliability=(d * area) / (d * area + fp * area) if d > 0 and area > 0 else None)
    return out


res = {}
# A1: the Schechter-Euclid count by numerical integration of the luminosity function
sch = CLS['galaxies-local']['schechter']
a1 = {}
for m in THR['checks'][0]['limits']['magnitudes']:
    dstar = 10 ** ((m - sch['MStar'] + 5) / 5) / 1e6
    g = lambda x: x ** sch['alphaS'] * math.exp(-x) * x ** 1.5
    val = integrate.quad(g, 0, np.inf, epsabs=0, epsrel=1e-12)[0]
    a1[str(m)] = SR / 3 * sch['phiStar'] * dstar ** 3 * val
res['A1'] = a1

# A5: time ratio of two sky-limited setups to one depth, one visit (exposure from brentq)
A = SET['skyLimited']
B = dict(A, zeroPoint=A['zeroPoint'] * 4, fwhm=A['fwhm'] * 0.75)
def time_to(S, depth, theta=5.0):
    return optimize.brentq(lambda t: mag_at(S, t, 1, theta) - depth, 1e-2, 1e8, xtol=1e-10, rtol=1e-13)
lim = [c for c in THR['checks'] if c['id'] == 'A5.timeRatio'][0]['limits']
tA, tB = time_to(A, lim['depth']), time_to(B, lim['depth'])
res['A5'] = dict(tA=tA, tB=tB, ratio=tB / tA, B=B)

# A6 and A7
res['A6'] = {str(t): stats.norm.sf(t) for t in [3, 4, 5, 6]}
a7 = {}
for lam in [0.5, 3, 12, 40, 200, 1000]:
    for level in [0.6827, 0.9545]:
        tail = (1 - level) / 2
        lo, hi = int(stats.poisson.ppf(tail, lam)), int(stats.poisson.ppf(1 - tail, lam))
        a7[f'{lam}|{level}'] = dict(lo=lo, hi=hi, coverage=stats.poisson.cdf(hi, lam) - stats.poisson.cdf(lo - 1, lam))
res['A7'] = a7

# B1: the grid
g = THR['grids']['b1']
C = CLS[g['class']]
b1 = []
for s in g['setups']:
    for t in g['exposures']:
        for v in g['visits']:
            r = plan(SET[s], C, t, v, g['nights'])
            r.update(setup=s, exposure=t, visits=v)
            b1.append(r)
res['B1'] = b1

# B2: Euclidean count against LambdaCDM (no K-correction, no evolution)
cosmo = FlatLambdaCDM(H0=70, Om0=0.3)
def upper_gamma(a, x):
    # Gamma(a, x) for a = alphaS + 1 < 0: recurrence from a + 1 > 0
    return (special.gamma(a + 1) * special.gammaincc(a + 1, x) - x ** a * math.exp(-x)) / a
def lcdm_count(m):
    def integrand(z):
        dm = cosmo.distmod(z).value
        Mlim = m - dm
        x = 10 ** (-0.4 * (Mlim - sch['MStar']))
        return cosmo.differential_comoving_volume(z).value * sch['phiStar'] * upper_gamma(sch['alphaS'] + 1, x)
    val = integrate.quad(integrand, 1e-5, 0.6, epsabs=0, epsrel=1e-9, limit=400)[0]
    return val * SR
res['B2'] = {str(m): dict(lcdm=lcdm_count(m), euclid=a1.get(str(m)) if str(m) in a1 else None) for m in [14, 15, 16.5]}
for m in [16.5]:
    dstar = 10 ** ((m - sch['MStar'] + 5) / 5) / 1e6
    val = integrate.quad(lambda x: x ** sch['alphaS'] * math.exp(-x) * x ** 1.5, 0, np.inf, epsabs=0, epsrel=1e-12)[0]
    res['B2'][str(m)]['euclid'] = SR / 3 * sch['phiStar'] * dstar ** 3 * val

# B4: density at 17.77 (closed form only)
dstar = 10 ** ((17.77 - sch['MStar'] + 5) / 5) / 1e6
res['B4'] = SR / 3 * sch['phiStar'] * dstar ** 3 * special.gamma(sch['alphaS'] + 2.5)

# D1: ten plans against goals set from the oracle's own numbers
d1 = []
for s in ['lcoLike', 'rubinLike']:
    S = SET[s]
    base = plan(S, CLS['test-power-law'], 300, 1, 10)
    D, Ar, well = base['depth'], base['area'], base['well']
    cases = [
        ('feasible', 300, 10, D - 0.2, 0.8 * Ar),
        ('depth', 300, 10, D + 0.2, 0.8 * Ar),
        ('area', 300, 10, D - 0.2, 1.25 * Ar),
        ('saturates', 1.5 * well, 10, D - 0.2, 0.8 * Ar),
        ('time', 300, 0.01, D - 0.2, 0.8 * Ar),
    ]
    for name, t, nights, gd, ga in cases:
        p = plan(S, CLS['test-power-law'], t, 1, nights)
        reasons = []
        if p['pointings'] < 1: reasons.append('time')
        if p['depth'] < gd: reasons.append('depth')
        if p['area'] < ga: reasons.append('area')
        if t > p['well']: reasons.append('saturates')
        d1.append(dict(setup=s, name=name, exposure=t, nights=nights, goalDepth=gd, goalArea=ga,
                       depth=p['depth'], area=p['area'], well=p['well'], feasible=not reasons, reasons=sorted(reasons)))
res['D1'] = d1

# D4: reliability cases
d4 = []
for s, c, t, th in [('lcoLike', 'steep', 30, 3), ('lcoLike', 'steep', 300, 3), ('rubinLike', 'flattened', 30, 3),
                    ('lcoLike', 'steep', 30, 5), ('lcoLike', 'steep', 300, 5), ('rubinLike', 'flattened', 30, 5)]:
    p = plan(SET[s], CLS[c], t, 1, 10, theta=th)
    d4.append(dict(setup=s, cls=c, exposure=t, threshold=th, reliability=p['reliability'],
                   unreliable=bool(p['reliability'] is not None and p['reliability'] < 0.5), detected=p['detected'], falsePositives=p['falsePositives']))
res['D4'] = d4

# D4b (added after the six cases above never flipped: THRESHOLDS amendment AM3): a rare class, where false positives can outnumber detections
d4b = []
for s_, t, th in [('lcoLike', 30, 3), ('lcoLike', 300, 3), ('rubinLike', 30, 3), ('lcoLike', 30, 5), ('lcoLike', 300, 5), ('rubinLike', 30, 5)]:
    p = plan(SET[s_], CLS['rare'], t, 1, 10, theta=th)
    d4b.append(dict(setup=s_, cls='rare', exposure=t, threshold=th, reliability=p['reliability'],
                    unreliable=bool(p['reliability'] is not None and p['reliability'] < 0.5), detected=p['detected'], falsePositives=p['falsePositives']))
res['D4b'] = d4b

# A4b (added by AM6): the exposure that maximises the sharp count at fixed time, one visit, continuous pointings, from the oracle's own depths
A4 = SET['skyLimited']
grid = [4 * (20000 / 4) ** (i / 399) for i in range(400)]
T = 30 * 8 * 3600 * 0.6
a4b = {}
for alpha in [0.4, 0.6, 1.0]:
    C = dict(n0=1000, m0=20, alpha=alpha, mMax=99)
    vals = [n_cum(C, mag_at(A4, t, 1, 5.0)) * T / (t + A4['overhead']) * A4['fovDeg2'] for t in grid]
    i = int(np.argmax(vals))
    a4b[str(alpha)] = dict(best=grid[i], index=i, rising=bool(all(vals[j] >= vals[j - 1] * (1 - 1e-12) for j in range(1, len(vals)))))
res['A4b'] = a4b

json.dump(res, sys.stdout, indent=1)
