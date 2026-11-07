"""The independent oracle of the CMB angular-scale gate (Prompt 258 Part A). SPIKE ONLY, never merged.

python3 -E, numpy, scipy, astropy 6.0.1; imports no Gravitas code; reads only the thresholds file and the Planck
extraction fixture.  usage: python3 -E oracle.py <thresholds.json> <planck-cmb.json> <out.json>
(astropy.cosmology imports PyYAML, which this machine lacks: an import-only stand-in outside the tree via STUBS.)
"""
import hashlib
import json
import math
import os
import re
import sys
import time
import warnings

import numpy as np
import scipy
from scipy.integrate import quad
from scipy.stats import chi2 as chi2dist  # noqa: F401  (kept for parity with the BAO oracle)

warnings.simplefilter('ignore')
if os.environ.get('STUBS'):
    sys.path.insert(0, os.environ['STUBS'])
import astropy  # noqa: E402
import astropy.constants as const  # noqa: E402
import astropy.units as u  # noqa: E402
from astropy.cosmology import FlatLambdaCDM, FlatwCDM, LambdaCDM  # noqa: E402

THR_PATH, PLANCK_PATH, OUT_PATH = sys.argv[1], sys.argv[2], sys.argv[3]
THR_BYTES = open(THR_PATH, 'rb').read()
PL_BYTES = open(PLANCK_PATH, 'rb').read()
T = json.loads(THR_BYTES)
PLK = json.loads(PL_BYTES)

C = 299792.458
MPC_M = 3.0856775814913673e22
K_B = 1.380649e-23
H_PLANCK = 6.62607015e-34
HBAR = H_PLANCK / (2 * math.pi)
C_SI = 299792458.0
E_CHARGE = 1.602176634e-19
G_SI = float(const.G.value)
_f = os.path.join(os.path.dirname(astropy.__file__), 'cosmology', 'data', 'Planck18.ecsv')
_lines = [l for l in open(_f).read().splitlines() if l and not l.startswith('#')]
_cols, _row = _lines[0].split(), _lines[-1].split()
TCMB = float(_row[_cols.index('Tcmb0')])
NU = 7.0 / 8.0 * (4.0 / 11.0) ** (4.0 / 3.0)
t0 = time.time()


def omega_gamma_h2():
    rho_g = (math.pi ** 2 / 15.0) * (K_B * TCMB) ** 4 / (HBAR * C_SI) ** 3 / C_SI ** 2
    h100 = 100.0 * 1e3 / MPC_M
    rho_c = 3.0 * h100 ** 2 / (8.0 * math.pi * G_SI)
    return rho_g / rho_c


OG = omega_gamma_h2()


def radiation_h2(neff):
    return OG * (1.0 + NU * neff)


# ---------------------------------------------------------------- worlds
def make_world(w):
    h = w['H0'] / 100.0
    Or = radiation_h2(w['Neff']) / h ** 2
    Ode = (1.0 - w['Om'] - Or) if w['Ode'] == 'flat' else w['Ode']
    return dict(id=w['id'], H0=w['H0'], Om=w['Om'], Ode=Ode, w=w['w'], Neff=w['Neff'], omegaB=w['omegaB'], zstar=w['zstar'], Or=Or, h=h)


def astropy_cosmo(W):
    kw = dict(Tcmb0=TCMB * u.K, Neff=W['Neff'], m_nu=0.0 * u.eV)
    flat = abs(1.0 - W['Om'] - W['Or'] - W['Ode']) < 1e-12
    if W['w'] != -1:
        assert flat
        return FlatwCDM(H0=W['H0'], Om0=W['Om'], w0=W['w'], **kw)
    if flat:
        return FlatLambdaCDM(H0=W['H0'], Om0=W['Om'], **kw)
    return LambdaCDM(H0=W['H0'], Om0=W['Om'], Ode0=W['Ode'], **kw)


def own_E(W, z):
    x = 1.0 + z
    Ok = 1.0 - W['Om'] - W['Or'] - W['Ode']
    return math.sqrt(W['Om'] * x ** 3 + W['Or'] * x ** 4 + Ok * x ** 2 + W['Ode'] * x ** (3.0 * (1.0 + W['w'])))


def own_chi(W, z):
    return quad(lambda uu: math.exp(uu) / own_E(W, math.exp(uu) - 1.0), 0, math.log1p(z), epsabs=0, epsrel=1e-13, limit=500)[0]


def own_DM(W, z):
    Ok = 1.0 - W['Om'] - W['Or'] - W['Ode']
    dh = C / W['H0']
    chi = own_chi(W, z)
    if abs(Ok) < 1e-12:
        return dh * chi
    s = math.sqrt(abs(Ok))
    return dh * (math.sinh(s * chi) / s if Ok > 0 else math.sin(s * chi) / s)


PIECES = [0.0, 0.1, 0.3, 0.6, 1.0]


def rs_own(W, omegaB=None, zstar=None, omegaGamma=None):
    omegaB = W['omegaB'] if omegaB is None else omegaB
    zs = W['zstar'] if zstar is None else zstar
    og = OG if omegaGamma is None else omegaGamma
    Ok = 1.0 - W['Om'] - W['Or'] - W['Ode']
    b = 3.0 * omegaB / (4.0 * og)
    ad = 1.0 / (1.0 + zs)

    def f(t):
        a = ad * t * t
        d = W['Om'] * a + W['Or'] + Ok * a * a + W['Ode'] * a ** (1.0 - 3.0 * W['w'])
        return 2.0 * ad * t / (math.sqrt(3.0 * (1.0 + b * a)) * math.sqrt(d))

    return C / W['H0'] * sum(quad(f, lo, hi, epsabs=0, epsrel=1e-13, limit=500)[0] for lo, hi in zip(PIECES[:-1], PIECES[1:]))


def rs_astropy(W, cosmo):
    b = 3.0 * W['omegaB'] / (4.0 * OG)
    ad = 1.0 / (1.0 + W['zstar'])

    def f(t):
        a = ad * t * t
        z = 1.0 / a - 1.0
        return 2.0 * ad * t * C / (math.sqrt(3.0 * (1.0 + b * a)) * a * a * float(cosmo.H(z).value))

    return sum(quad(f, lo, hi, epsabs=0, epsrel=1e-12, limit=500)[0] for lo, hi in zip(PIECES[:-1], PIECES[1:]))


def rs_closed(H0, omegaB, Neff, zs):
    Or = radiation_h2(Neff) / (H0 / 100.0) ** 2
    Om = 1.0 - Or
    ad = 1.0 / (1.0 + zs)
    b = 3.0 * omegaB / (4.0 * OG)
    pre = 2.0 / math.sqrt(b * Om)
    v = pre * (math.log(math.sqrt(b * (Om * ad + Or)) + math.sqrt(Om * (1.0 + b * ad))) - math.log(math.sqrt(b * Or) + math.sqrt(Om)))
    return C / H0 / math.sqrt(3.0) * v


out = dict(
    format='gravitas.cmb-scale-oracle-results/1',
    note='written by tools/cmb-oracle/oracle.py (numpy, scipy, astropy; no Gravitas code) after tests/fixtures/cmb-scale/thresholds.json (with AM1 to AM3) and before the prototype existed',
    tools=dict(python=sys.version.split()[0], numpy=np.__version__, scipy=scipy.__version__, astropy=astropy.__version__),
    thresholdsSha256=hashlib.sha256(THR_BYTES).hexdigest(),
    planckExtractionSha256=hashlib.sha256(PL_BYTES).hexdigest(),
    constants=dict(c_kms=C, G_SI=G_SI, Tcmb0=TCMB, Mpc_m=MPC_M, k_B=K_B, h_Planck=H_PLANCK, omegaGammaH2=OG, nuFactor=NU),
)

# ---------------------------------------------------------------- the ten worlds
PHI = T['worlds']['designOffset']
worlds = []
for w in T['worlds']['list']:
    W = make_world(w)
    cos = astropy_cosmo(W)
    dm_a = float(cos.comoving_transverse_distance(W['zstar']).value)
    dm_o = own_DM(W, W['zstar'])
    rs_o = rs_own(W)
    rs_a = rs_astropy(W, cos)
    th = rs_o / dm_o
    worlds.append(dict(id=W['id'], Or=W['Or'], omegaGamma=OG, astropyOgamma0=float(cos.Ogamma0), astropyOnu0=float(cos.Onu0), DM_astropy=dm_a, DM_own=dm_o,
                       rs_own=rs_o, rs_astropyH=rs_a, theta=th, ellA=math.pi / th, ell1=math.pi * (1.0 - PHI) / th, Ode=W['Ode'],
                       H0=W['H0'], Ok=1.0 - W['Om'] - W['Or'] - W['Ode']))
out['worlds'] = worlds

# five closed forms (AM3 item 3)
CF = [(70, 0.0224, 3.046, 1090), (60, 0.02, 3.046, 1000), (75, 0.025, 2.0, 1100), (67.4, 0.0224, 3.5, 1050), (50, 0.03, 3.046, 1200)]
out['closedForm'] = [dict(H0=a, omegaB=b, Neff=c, zstar=d, rs=rs_closed(a, b, c, d)) for a, b, c, d in CF]

# directions (B5) on W1: the oracle's own steps
W1 = make_world(T['worlds']['list'][0])
dirs = {}
steps = np.linspace(0.0, 1.0, 21)
vals = [rs_own(W1, omegaB=0.018 + 0.010 * s) for s in steps]
dirs['rs_vs_omegaB'] = all(vals[i + 1] < vals[i] for i in range(20))
vals = []
for s in steps:
    V = dict(W1)
    V['Om'] = 0.2 + 0.2 * s
    V['Ode'] = 1.0 - V['Om'] - V['Or']
    vals.append(rs_own(V))
dirs['rs_vs_Om'] = all(vals[i + 1] < vals[i] for i in range(20))
vals = [rs_own(W1, zstar=900 + 400 * s) for s in steps]
dirs['rs_vs_zstar'] = all(vals[i + 1] > vals[i] for i in range(20))  # B5 as committed (increases): wrong physics, left failing
dirs['rs_decreases_with_zstar'] = all(vals[i + 1] < vals[i] for i in range(20))  # B5b (AM4)
vals = [own_DM(W1, 900 + 400 * s) for s in steps]
dirs['DM_vs_zstar'] = all(vals[i + 1] > vals[i] for i in range(20))
out['directions'] = dirs


# ---------------------------------------------------------------- the published comparison: one massive neutrino
KT_NU_EV = K_B * (4.0 / 11.0) ** (1.0 / 3.0) * TCMB / E_CHARGE
I0 = 7.0 * math.pi ** 4 / 120.0


def fd_ratio(y):
    g = lambda x: x * x * math.sqrt(x * x + y * y) / (math.exp(x) + 1.0)
    pts = [0.0, 1.0, 4.0, 12.0, 30.0, 80.0]
    return sum(quad(g, a, b, epsabs=0, epsrel=1e-13, limit=500)[0] for a, b in zip(pts[:-1], pts[1:])) / I0


def planck_model(wb, wc, H0, zs, mnu_ev, neff):
    h = H0 / 100.0
    wm = wb + wc
    kappa = NU * neff / 3.0
    y0 = mnu_ev / KT_NU_EV
    wrel0 = OG * (1.0 + 2.0 * kappa)
    wL = h * h - wm - wrel0 - OG * kappa * fd_ratio(y0)
    b = 3.0 * wb / (4.0 * OG)
    ad = 1.0 / (1.0 + zs)

    def d(a):
        return wm * a + wrel0 + OG * kappa * fd_ratio(y0 * a) + wL * a ** 4

    def fr(t):
        a = ad * t * t
        return 2.0 * ad * t / (math.sqrt(3.0 * (1.0 + b * a)) * math.sqrt(d(a)))

    rs = C / 100.0 * sum(quad(fr, lo, hi, epsabs=0, epsrel=1e-12, limit=500)[0] for lo, hi in zip(PIECES[:-1], PIECES[1:]))
    # D_M = (c/100) Int_{a*}^1 da / sqrt(d(a)), in u = ln a
    dm = C / 100.0 * quad(lambda uu: math.exp(uu) / math.sqrt(d(math.exp(uu))), math.log(ad), 0.0, epsabs=0, epsrel=1e-12, limit=500)[0]
    return dict(rs=rs, DM=dm, theta=rs / dm, theta100=100.0 * rs / dm, wL=wL, y0=y0)


pv = PLK['values']
P = {k: float(pv[k]) for k in ('omegaB', 'omegaC', 'H0', 'zstar', 'zstarSigma', 'neutrinoMassEv')}
base = planck_model(P['omegaB'], P['omegaC'], P['H0'], P['zstar'], P['neutrinoMassEv'], 3.046)
out['planck'] = dict(inputs=P, model=base, printed=dict(theta100Table1Best=float(pv['theta100Table1Best']), rstar=float(pv['rstar']), rstarSigma=float(pv['rstarSigma'])))
sens = {}
for name, kw in [('zstarPlusSigma', dict(zs=P['zstar'] + P['zstarSigma'])), ('zstarMinusSigma', dict(zs=P['zstar'] - P['zstarSigma'])),
                 ('Neff3.044', dict(neff=3.044)), ('Neff3.05', dict(neff=3.05))]:
    a = dict(wb=P['omegaB'], wc=P['omegaC'], H0=P['H0'], zs=P['zstar'], mnu_ev=P['neutrinoMassEv'], neff=3.046)
    a.update(kw)
    sens[name] = planck_model(**a)
out['planckSensitivity'] = sens
# the 255-style massless-radiation value at the same inputs (flat, Om = (wb + wc)/h^2, photons plus 3.046 massless neutrinos)
h = P['H0'] / 100.0
Wp = make_world(dict(id='P', H0=P['H0'], Om=(P['omegaB'] + P['omegaC']) / h ** 2, Ode='flat', w=-1, Neff=3.046, omegaB=P['omegaB'], zstar=P['zstar']))
out['planckMassless'] = dict(rs=rs_own(Wp), DM=own_DM(Wp, Wp['zstar']))
out['planckMassless']['theta100'] = 100.0 * out['planckMassless']['rs'] / out['planckMassless']['DM']

# ---------------------------------------------------------------- the refusal ensemble (committed order + AM1)
CODES = T['refusals']['codesInOrder']


def decide(p):
    vals = [p['H0'], p['Om'], p['Or'], p['w'], p['omegaGamma'], p['omegaB'], p['zstar'], p['phi']]
    flat = p['Ode'] == 'flat'
    Ode = (1.0 - p['Om'] - p['Or']) if flat else p['Ode']
    vals.append(Ode)
    if not all(math.isfinite(v) for v in vals):
        return 'not-finite'
    if not (0 < p['H0'] <= 1000):
        return 'bad-H0'
    if p['Om'] < 0 or p['Or'] < 0 or Ode < 0:
        return 'negative-density'
    if p['Om'] > 10 or p['Or'] > 1 or Ode > 10:
        return 'density-out-of-domain'
    if not (-3 <= p['w'] <= 0):
        return 'w-out-of-domain'
    Ok = 1.0 - p['Om'] - p['Or'] - Ode
    xs = np.exp(np.linspace(0.0, math.log(1e8), 400001))
    e2 = p['Om'] * xs ** 3 + p['Or'] * xs ** 4 + Ok * xs ** 2 + Ode * xs ** (3.0 * (1.0 + p['w']))
    if not np.all(e2 > 0):
        return 'bounce'
    if p['Or'] <= 0 or p['omegaGamma'] <= 0:
        return 'no-radiation'
    h = p['H0'] / 100.0
    if p['omegaB'] <= 0 or p['omegaB'] / h ** 2 >= p['Om']:
        return 'bad-baryons'
    if p['zstar'] < 800 or p['zstar'] > 1500:
        return 'bad-recombination-redshift'
    if p['phi'] < 0 or p['phi'] > 0.5:
        return 'bad-offset'
    W = dict(H0=p['H0'], Om=p['Om'], Or=p['Or'], Ode=Ode, w=p['w'])
    chi = own_chi(W, p['zstar'])
    if Ok < 0 and math.sqrt(-Ok) * chi >= math.pi:
        return 'beyond-antipode'
    return 'accept'


rr = np.random.default_rng(T['refusals']['ensemble']['seed'])
draws = []
for k in range(T['refusals']['ensemble']['draws']):
    p = dict(H0=float(rr.uniform(-20, 120)), Om=float(rr.uniform(-0.1, 1.2)))
    flatp = rr.uniform() < 0.7
    p['Ode'] = 'flat' if flatp else float(rr.uniform(0, 1.2))
    p['w'] = float(rr.uniform(-3.5, 0.5))
    p['Or'] = float(rr.uniform(-1e-5, 2e-4))
    p['omegaGamma'] = float(rr.uniform(-1e-6, 3e-5))
    p['omegaB'] = float(rr.uniform(-0.005, 0.03))
    p['zstar'] = float(rr.uniform(-100, 6000))
    p['phi'] = float(rr.uniform(-0.2, 0.8))
    code = decide(p)
    rec = dict(p=p, code=code)
    if code == 'accept':
        Ode = (1.0 - p['Om'] - p['Or']) if p['Ode'] == 'flat' else p['Ode']
        W = dict(H0=p['H0'], Om=p['Om'], Or=p['Or'], Ode=Ode, w=p['w'], omegaB=p['omegaB'], zstar=p['zstar'])
        rec['rs'] = rs_own(W, omegaGamma=p['omegaGamma'])
        rec['DM'] = own_DM(W, p['zstar'])
        rec['theta'] = rec['rs'] / rec['DM']
    draws.append(rec)
out['refusals'] = dict(draws=draws, accepted=sum(1 for d in draws if d['code'] == 'accept'),
                       byCode={c: sum(1 for d in draws if d['code'] == c) for c in CODES + ['beyond-antipode', 'accept']})

# ---------------------------------------------------------------- mulberry32 and FNV-1a
M32 = 0xFFFFFFFF


def imul(a, b):
    return (a * b) & M32


def normalize_seed(value):
    if isinstance(value, int):
        return abs(value) & M32
    text = str(value).strip()
    if text == '':
        return 0
    if text.isdigit() and int(text) <= 2 ** 53 - 1:
        return int(text) & M32
    h = 0x811C9DC5
    for c in text:
        h ^= ord(c)
        h = imul(h, 0x01000193)
    return h & M32


class Mulberry:
    def __init__(self, seed):
        self.s = normalize_seed(seed)

    def __call__(self):
        self.s = (self.s + 0x6D2B79F5) & M32
        t = imul(self.s ^ (self.s >> 15), 1 | self.s)
        t = ((t + imul(t ^ (t >> 7), 61 | t)) & M32) ^ t
        return ((t ^ (t >> 14)) & M32) / 4294967296.0


mb = Mulberry('258:cmb:peak:E1')
first = [mb() for _ in range(1000)]
out['streamCheck'] = dict(seed='258:cmb:peak:E1', first5=first[:5], sum1000=sum(first))

# ---------------------------------------------------------------- the bounded peak fit
SP = T['syntheticPeak']
TR = SP['truth']
HALF = 75.0


SYM = False


def d_true(ell):
    ell = np.asarray(ell, dtype=float)
    w = np.where(ell < TR['ell0'], TR['widthBelow'], TR['widthBelow'] if SYM else TR['widthAbove'])
    return TR['base'] + TR['amplitude'] * np.exp(-(ell - TR['ell0']) ** 2 / (2 * w ** 2))


def fit_peak(ell, D, sig):
    ell = np.asarray(ell, dtype=float)
    D = np.asarray(D, dtype=float)
    sig = np.asarray(sig, dtype=float)
    if len(ell) == 0:
        return dict(code='empty')
    if not (len(ell) == len(D) == len(sig)):
        return dict(code='length-mismatch')
    if not (np.all(np.isfinite(ell)) and np.all(np.isfinite(D)) and np.all(np.isfinite(sig))):
        return dict(code='not-finite')
    if not np.all(sig > 0):
        return dict(code='bad-sigma')
    if np.any(np.diff(ell) <= 0):
        return dict(code='not-sorted')
    if len(ell) == 1:
        return dict(code='bad-window')
    k = int(np.argmax(D))
    m = np.abs(ell - ell[k]) <= HALF
    n = int(m.sum())
    if n < 5:
        return dict(code='too-few-bins', n=n)
    t = (ell[m] - ell[k]) / HALF
    A = np.stack([np.ones_like(t), t, t * t], axis=1) / sig[m][:, None]
    y = D[m] / sig[m]
    coef = np.linalg.lstsq(A, y, rcond=None)[0]
    V = np.linalg.inv(A.T @ A)
    a, b, c = coef
    sc = math.sqrt(V[2, 2])
    sn = c / sc
    if c >= 0 or sn > -5:
        return dict(code='no-curvature', n=n, curvatureSigma=sn)
    ts = -b / (2 * c)
    if abs(ts) > 1:
        return dict(code='apex-outside-window', n=n, curvatureSigma=sn)
    g = np.array([0.0, -1.0 / (2 * c), b / (2 * c * c)])
    se = HALF * math.sqrt(float(g @ V @ g))
    if 2 * se > 150:
        return dict(code='interval-too-wide', n=n, curvatureSigma=sn)
    return dict(code='ok', apex=float(ell[k] + HALF * ts), sigma=se, curvatureSigma=sn, n=n)


def binned(width, phase_u, rng=None, perturb=None, flat=None):
    ell = np.arange(0, int(720 / width) + 2) * width + phase_u
    ell = ell[(ell >= 20) & (ell <= 700)]
    D0 = d_true(ell) if flat is None else np.full_like(ell, flat)
    sig = 0.015 * D0
    if perturb is not None:
        D = D0 + 0.01 * D0 * np.sin(np.arange(len(ell)) * (perturb + 1) + 0.3)
    else:
        D = D0 + sig * rng.standard_normal(len(ell))
    return ell, D, sig


def coverage(width, n, rng, flat=None, level=1.0):
    cov = 0
    codes = {}
    sigs = []
    apex_err = []
    for _ in range(n):
        u0 = float(rng.uniform(0, width))
        ell, D, sig = binned(width, u0, rng, flat=flat)
        r = fit_peak(ell, D, sig)
        codes[r['code']] = codes.get(r['code'], 0) + 1
        if r['code'] == 'ok':
            sigs.append(r['sigma'])
            apex_err.append(r['apex'] - TR['ell0'])
            if abs(r['apex'] - TR['ell0']) <= level * r['sigma']:
                cov += 1
    return dict(n=n, covered=cov, rate=cov / n, codes=codes, medianSigma=float(np.median(sigs)) if sigs else None,
                meanApexError=float(np.mean(apex_err)) if apex_err else None)


DR = SP['draws']
out['E1'] = coverage(30, DR['E1'], np.random.default_rng([258, 1]), level=1.0)
out['E2'] = coverage(30, DR['E2'], np.random.default_rng([258, 2]), level=2.0)
SYM = True
out['E6a'] = coverage(30, SP['symmetricTruth']['draws']['E6a'], np.random.default_rng([258, 6]), level=1.0)
out['E6b'] = coverage(30, SP['symmetricTruth']['draws']['E6b'], np.random.default_rng([258, 7]), level=2.0)
SYM = False
rng4 = np.random.default_rng([258, 4])
out['E4'] = coverage(SP['widths']['coarse'], DR['E4'], rng4)
rng5 = np.random.default_rng([258, 5])
out['E5'] = coverage(30, DR['E5'], rng5, flat=3000.0)
vecs = []
for k, u0 in enumerate([0.0, 10.0, 20.0]):
    ell, D, sig = binned(30, u0, perturb=k)
    r = fit_peak(ell, D, sig)
    vecs.append(dict(k=k, phase=u0, n=len(ell), first3=[float(x) for x in D[:3]], result=r))
out['E3'] = vecs

# Z2: six inputs
z2 = []
ellg = [100.0, 130.0, 160.0, 190.0, 220.0, 250.0, 280.0]
Dg = [1.0, 2.0, 3.0, 4.0, 3.0, 2.0, 1.0]
sg = [0.1] * 7
z2.append(fit_peak(ellg, [1.0, 2.0, float('nan'), 4.0, 3.0, 2.0, 1.0], sg)['code'])
z2.append(fit_peak(ellg, Dg, [0.1, 0.1, 0.0, 0.1, 0.1, 0.1, 0.1])['code'])
z2.append(fit_peak([100.0, 130.0, 120.0, 190.0, 220.0, 250.0, 280.0], Dg, sg)['code'])
z2.append(fit_peak(ellg, Dg[:6], sg)['code'])
z2.append(fit_peak([], [], [])['code'])
z2.append(fit_peak([220.0], [3.0], [0.1])['code'])
out['Z2'] = z2

# ---------------------------------------------------------------- the claim rule
CR = T['claimRule']
tf = CR['testForm']


def terms(label):
    m = re.search(label + r': (.*?)(?:\. (?:READ|NEG)|$)', tf, re.S)
    return [s.strip() for s in m.group(1).split(',')]


def rx(words):
    alt = '|'.join(re.escape(w) for w in sorted(words, key=len, reverse=True))
    return re.compile(r'(?<!\w)(?:' + alt + r')(?!\w)', re.I)


GRIDW = terms('GRID')
READW = terms('READ')
NEGW = [w.rstrip('.') for w in re.search(r'NEG: (.*)$', tf).group(1).rstrip('.').split(',')]
NEGW = [w.strip() for w in NEGW]
G_RX, R_RX, N_RX = rx(GRIDW), rx(READW), rx(NEGW)


def violates(text):
    for sentence in re.split(r'[.!?;\n]+', text):
        if G_RX.search(sentence) and R_RX.search(sentence) and not N_RX.search(sentence):
            return True
    return False


out['claimRule'] = dict(grid=GRIDW, read=READW, neg=NEGW, violating=[violates(s) for s in CR['violating']], clean=[violates(s) for s in CR['clean']])

# ---------------------------------------------------------------- the synthetic grid: nearest node
SG = T['syntheticGrid']
mbg = Mulberry('258:cmb:grid')
pts = []
for _ in range(SG['points']):
    pts.append([float(a['values'][0] + (a['values'][-1] - a['values'][0]) * mbg()) for a in SG['axes']])


def nearest(point):
    idx = []
    for a, x in zip(SG['axes'], point):
        v = a['values']
        rngv = v[-1] - v[0]
        best, bi = None, None
        for i, node in enumerate(v):
            dd = abs(x - node) / rngv
            if best is None or dd < best:
                best, bi = dd, i
        idx.append(bi)
    return idx


out['grid'] = dict(points=pts, nearest=[nearest(p) for p in pts])
out['seconds'] = round(time.time() - t0, 1)
json.dump(out, open(OUT_PATH, 'w'), indent=1)
open(OUT_PATH, 'a').write('\n')
print(json.dumps(dict(seconds=out['seconds'], E1=out['E1']['rate'], E2=out['E2']['rate'], accepted=out['refusals']['accepted'])))
