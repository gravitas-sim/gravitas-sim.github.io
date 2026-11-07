#!/usr/bin/env python3
"""The independent oracle for Prompt 257 Part A (the BAO gate).

Written after tests/fixtures/bao/thresholds.json (c9f15eac) and before any prototype code existed.
It imports no Gravitas code and reads only that file's blocks and the pack sidecar (decoded here, by this
file's own decoder of the documented quantisation). Independent calculations:

  astropy 6.0.1   FlatLambdaCDM, LambdaCDM, FlatwCDM for the ten worlds: D_M, H(z); Ogamma0, Onu0
  own             radiation density from the SI constants, the sound-horizon integral by scipy quad in its own
                  variable, the closed forms, the profile likelihood over theta and the intervals by brentq,
                  the ensembles (numpy default_rng), the brute-force domain decision, mulberry32 + FNV-1a,
                  pair counts by scipy cKDTree, the Landy-Szalay estimator and the block jackknife

  python3 -E tools/bao-oracle/oracle.py <thresholds.json> <sidecar.json> <out.json>
"""
import hashlib
import json
import math
import os
import sys
import time
import warnings

import numpy as np
import scipy
from scipy.integrate import quad
from scipy.optimize import brentq
from scipy.spatial import cKDTree
from scipy.stats import chi2 as chi2dist

warnings.simplefilter('ignore')
# astropy.cosmology imports PyYAML, which this machine lacks: an import-only stand-in outside the tree (STUBS)
if os.environ.get('STUBS'):
    sys.path.insert(0, os.environ['STUBS'])
import astropy  # noqa: E402
import astropy.constants as const  # noqa: E402
import astropy.units as u  # noqa: E402
from astropy.cosmology import FlatLambdaCDM, FlatwCDM, LambdaCDM  # noqa: E402

THR_PATH, SIDECAR_PATH, OUT_PATH = sys.argv[1], sys.argv[2], sys.argv[3]
THR_BYTES = open(THR_PATH, 'rb').read()
T = json.loads(THR_BYTES)

C = 299792.458  # km/s, exact
MPC_M = 3.0856775814913673e22  # m
K_B = 1.380649e-23
H_PLANCK = 6.62607015e-34
HBAR = H_PLANCK / (2 * math.pi)
C_SI = 299792458.0
G_SI = float(const.G.value)
# Tcmb0 of astropy's Planck18 realization, read from the installed data file's header row and last row (the
# realization itself cannot be built without PyYAML); only this one column is read
_f = os.path.join(os.path.dirname(astropy.__file__), 'cosmology', 'data', 'Planck18.ecsv')
_lines = [l for l in open(_f).read().splitlines() if l and not l.startswith('#')]
_cols, _row = _lines[0].split(), _lines[-1].split()
TCMB = float(_row[_cols.index('Tcmb0')])
NU = 7.0 / 8.0 * (4.0 / 11.0) ** (4.0 / 3.0)

t0 = time.time()


# ---------------------------------------------------------------- radiation
def omega_gamma_h2():
    """rho_gamma / rho_crit with h = 1 (rho_crit at H0 = 100 km/s/Mpc)."""
    rho_g = (math.pi ** 2 / 15.0) * (K_B * TCMB) ** 4 / (HBAR * C_SI) ** 3 / C_SI ** 2  # kg/m^3
    h100 = 100.0 * 1e3 / MPC_M  # 1/s
    rho_c = 3.0 * h100 ** 2 / (8.0 * math.pi * G_SI)
    return rho_g / rho_c


OG = omega_gamma_h2()


def radiation_h2(neff):
    return OG * (1.0 + NU * neff)


# ---------------------------------------------------------------- worlds
def make_world(w):
    h = w['H0'] / 100.0
    Neff = w['Neff']
    Or = radiation_h2(Neff) / h ** 2
    Om = w['Om']
    Ode = (1.0 - Om - Or) if w['Ode'] == 'flat' else w['Ode']
    return dict(id=w['id'], H0=w['H0'], Om=Om, Ode=Ode, w=w['w'], Neff=Neff, omegaB=w['omegaB'], zd=w['zd'], Or=Or,
                omegaGamma=OG, h=h)


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


def own_DM(W, z):
    Ok = 1.0 - W['Om'] - W['Or'] - W['Ode']
    dh = C / W['H0']
    chi = quad(lambda zz: 1.0 / own_E(W, zz), 0, z, epsabs=0, epsrel=1e-13, limit=500)[0]
    if abs(Ok) < 1e-12:
        return dh * chi
    s = math.sqrt(abs(Ok))
    return dh * (math.sinh(s * chi) / s if Ok > 0 else math.sin(s * chi) / s)


def dv_of(dm, dh_, z):
    return (z * dh_ * dm * dm) ** (1.0 / 3.0)


# ---------------------------------------------------------------- sound horizon
def rs_own(W, omegaB=None, zd=None, omegaGamma=None):
    omegaB = W['omegaB'] if omegaB is None else omegaB
    zd = W['zd'] if zd is None else zd
    og = OG if omegaGamma is None else omegaGamma
    Ok = 1.0 - W['Om'] - W['Or'] - W['Ode']
    b = 3.0 * omegaB / (4.0 * og)
    ad = 1.0 / (1.0 + zd)

    def f(t):
        a = ad * t * t
        d = W['Om'] * a + W['Or'] + Ok * a * a + W['Ode'] * a ** (1.0 - 3.0 * W['w'])
        return 2.0 * ad * t / (math.sqrt(3.0 * (1.0 + b * a)) * math.sqrt(d))

    pts = [0.0, 0.1, 0.3, 0.6, 1.0]
    v = sum(quad(f, lo, hi, epsabs=0, epsrel=1e-13, limit=500)[0] for lo, hi in zip(pts[:-1], pts[1:]))
    return C / W['H0'] * v


def rs_astropy(W, cosmo):
    b = 3.0 * W['omegaB'] / (4.0 * OG)
    ad = 1.0 / (1.0 + W['zd'])

    def f(t):
        a = ad * t * t
        z = 1.0 / a - 1.0
        H = float(cosmo.H(z).value)
        return 2.0 * ad * t * C / (math.sqrt(3.0 * (1.0 + b * a)) * a * a * H)

    pts = [0.0, 0.1, 0.3, 0.6, 1.0]
    return sum(quad(f, lo, hi, epsabs=0, epsrel=1e-12, limit=500)[0] for lo, hi in zip(pts[:-1], pts[1:]))


def rs_closed(H0, omegaB, Neff, zd, baryonFree=False):
    og = OG
    Or = radiation_h2(Neff) / (H0 / 100.0) ** 2
    Om = 1.0 - Or
    ad = 1.0 / (1.0 + zd)
    if baryonFree:
        i0 = (2.0 / Om) * (math.sqrt(Om * ad + Or) - math.sqrt(Or))
        return C / H0 / math.sqrt(3.0) * i0
    b = 3.0 * omegaB / (4.0 * og)
    pre = 2.0 / math.sqrt(b * Om)
    v = pre * (math.log(math.sqrt(b * (Om * ad + Or)) + math.sqrt(Om * (1.0 + b * ad)))
               - math.log(math.sqrt(b * Or) + math.sqrt(Om)))
    return C / H0 / math.sqrt(3.0) * v


# ---------------------------------------------------------------- the decision (brute force)
def decide(p):
    """accept or the refusal code, in the committed order."""
    vals = [p['H0'], p['Om'], p['Or'], p['w'], p['omegaGamma'], p['omegaB'], p['zd']]
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
    if p['zd'] < 500 or p['zd'] > 3000:
        return 'bad-drag-redshift'
    return 'accept'


def rs_of_draw(p):
    W = dict(H0=p['H0'], Om=p['Om'], Or=p['Or'], Ode=(1.0 - p['Om'] - p['Or']) if p['Ode'] == 'flat' else p['Ode'],
             w=p['w'], omegaB=p['omegaB'], zd=p['zd'])
    return rs_own(W, omegaGamma=p['omegaGamma'])


# ---------------------------------------------------------------- the likelihood
SE = T['syntheticEnsemble']
GR = SE['grid']
NODES = np.array([GR['from'] + GR['step'] * k for k in range(int(round((GR['to'] - GR['from']) / GR['step'])) + 1)])
THETA = SE['truth']['theta']
OM_T = SE['truth']['Om']
ZS = SE['redshifts']
CORR = -0.4


def E_flat(Om, z):
    return math.sqrt(Om * (1 + z) ** 3 + 1 - Om)


def basis_flat(Om, zs):
    out = []
    for z in zs:
        I = quad(lambda zz: 1.0 / E_flat(Om, zz), 0, z, epsabs=0, epsrel=1e-13, limit=200)[0]
        out += [I, 1.0 / E_flat(Om, z)]
    return np.array(out)


def design_cov(mean, frac):
    m = len(mean)
    sig = frac * np.abs(mean)
    Cm = np.zeros((m, m))
    for i in range(m):
        Cm[i, i] = sig[i] ** 2
    for k in range(m // 2):
        i, j = 2 * k, 2 * k + 1
        Cm[i, j] = Cm[j, i] = CORR * sig[i] * sig[j]
    return Cm


class Prof:
    def __init__(self, cov, zs=ZS):
        self.zs = zs
        self.cov = cov
        self.Ci = np.linalg.inv(cov)
        self.B = np.array([basis_flat(o, zs) for o in NODES])
        self.v = np.einsum('ij,jk,ik->i', self.B, self.Ci, self.B)

    def chi2_nodes(self, d):
        Cid = self.Ci @ d
        u_ = self.B @ Cid
        return d @ Cid - u_ ** 2 / self.v, u_ / self.v

    def chi2_at(self, d, Om):
        b = basis_flat(Om, self.zs)
        Cid = self.Ci @ d
        return float(d @ Cid - (b @ Cid) ** 2 / (b @ self.Ci @ b))

    def fit(self, d):
        ch, th = self.chi2_nodes(d)
        i = int(np.argmin(ch))
        res = dict(chi2min=float(ch[i]), bestOm=float(NODES[i]), theta=float(th[i]), index=i)
        res['p'] = float(chi2dist.sf(ch[i], len(d) - 2))
        for name, delta in (('68', 1.0), ('95', 4.0)):
            thr = ch[i] + delta
            inside = np.nonzero(ch <= thr)[0]
            lo_i, hi_i = int(inside[0]), int(inside[-1])
            g = lambda o: self.chi2_at(d, o) - thr
            lo = None if lo_i == 0 else brentq(g, NODES[lo_i - 1], NODES[lo_i], xtol=1e-14, rtol=1e-14)
            hi = None if hi_i == len(NODES) - 1 else brentq(g, NODES[hi_i], NODES[hi_i + 1], xtol=1e-14, rtol=1e-14)
            res['lo' + name] = None if lo is None else float(lo)
            res['hi' + name] = None if hi is None else float(hi)
            res['open' + name] = lo is None or hi is None
        return res

    def covers(self, d, Om_true, delta):
        ch, _ = self.chi2_nodes(d)
        return bool(self.chi2_at(d, Om_true) <= ch.min() + delta)


def ensemble(prof, mean, rng, n, deltas=(1.0, 4.0)):
    L = np.linalg.cholesky(prof.cov)
    cov = {1.0: 0, 4.0: 0}
    opened = 0
    flagged = 0
    violation = False
    for _ in range(n):
        d = mean + L @ rng.standard_normal(len(mean))
        ch, _t = prof.chi2_nodes(d)
        i = int(np.argmin(ch))
        for dl in deltas:
            if prof.chi2_at(d, OM_T) <= ch[i] + dl:
                cov[dl] += 1
        inside = np.nonzero(ch <= ch[i] + 1.0)[0]
        if inside[0] == 0 or inside[-1] == len(NODES) - 1:
            opened += 1
        if chi2dist.sf(ch[i], len(d) - 2) < 0.0027:
            flagged += 1
    return dict(n=n, cover68=cov[1.0] / n, cover95=cov[4.0] / n, openFraction=opened / n, poorFitFraction=flagged / n,
                violation=violation)


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


# ---------------------------------------------------------------- the main run
out = dict(
    format='gravitas.bao-oracle-results/1',
    note='written by tools/bao-oracle/oracle.py (numpy, scipy, astropy; no Gravitas code) after tests/fixtures/bao/thresholds.json '
         'and before the prototype existed',
    tools=dict(python=sys.version.split()[0], numpy=np.__version__, scipy=scipy.__version__, astropy=astropy.__version__),
    thresholdsSha256=hashlib.sha256(THR_BYTES).hexdigest(),
    constants=dict(c_kms=C, G_SI=G_SI, Tcmb0=TCMB, Mpc_m=MPC_M, k_B=K_B, h_Planck=H_PLANCK, omegaGammaH2=OG, nuFactor=NU),
)

# radiation vs astropy
rad = []
for neff in (3.046, 2.0, 4.0):
    cos = FlatLambdaCDM(H0=100.0, Om0=0.3, Tcmb0=TCMB * u.K, Neff=neff, m_nu=0.0 * u.eV)
    rad.append(dict(Neff=neff, ownOmegaGammaH2=OG, ownRadiationH2=radiation_h2(neff),
                    astropyOmegaGammaH2=float(cos.Ogamma0), astropyRadiationH2=float(cos.Ogamma0 + cos.Onu0)))
out['radiation'] = rad

# worlds
zs8 = T['worlds']['redshifts']
worlds = []
for w in T['worlds']['list']:
    W = make_world(w)
    cos = astropy_cosmo(W)
    ap = dict(DM=[], H=[], DH=[], DV=[])
    own = dict(DM=[], DH=[], DV=[])
    for z in zs8:
        dm = float(cos.comoving_transverse_distance(z).value)
        H = float(cos.H(z).value)
        ap['DM'].append(dm)
        ap['H'].append(H)
        ap['DH'].append(C / H)
        ap['DV'].append(dv_of(dm, C / H, z))
        dmo = own_DM(W, z)
        dho = C / (W['H0'] * own_E(W, z))
        own['DM'].append(dmo)
        own['DH'].append(dho)
        own['DV'].append(dv_of(dmo, dho, z))
    W2 = dict(W)
    W2['astropyOr'] = float(cos.Ogamma0 + cos.Onu0)
    W2['astropy'] = ap
    W2['own'] = own
    W2['rsOwn'] = rs_own(W)
    W2['rsAstropyH'] = rs_astropy(W, cos)
    W2.pop('omegaGamma')
    worlds.append(W2)
out['worlds'] = worlds

# closed forms
cf = []
for s in T['worlds']['closedFormSets']['list']:
    Or = radiation_h2(s['Neff']) / 0.49
    Wc = dict(id=s['id'], H0=70.0, Om=1.0 - Or, Or=Or, Ode=0.0, w=-1.0, omegaB=s['omegaB'], zd=1060.0)
    cf.append(dict(id=s['id'], H0=70.0, omegaB=s['omegaB'], Neff=s['Neff'], zd=1060.0, Or=Or,
                   closedForm=rs_closed(70.0, s['omegaB'], s['Neff'], 1060.0), quad=rs_own(Wc)))
out['closedForms'] = cf
bf_Or = radiation_h2(3.046) / 0.49
out['baryonFree'] = dict(H0=70.0, omegaB=1e-8, Neff=3.046, zd=1060.0, Or=bf_Or,
                         closedForm=rs_closed(70.0, 1e-8, 3.046, 1060.0, baryonFree=True))

# ---------------------------------------------------------------- ensembles and pinned vectors
mean = np.array([THETA * v for v in basis_flat(OM_T, ZS)])
true_ratio = mean.copy()
frac = np.array([0.02, 0.04] * len(ZS))
Cdesign = design_cov(mean, frac)
prof = Prof(Cdesign)
rng = np.random.default_rng([257, 1])
e12 = ensemble(prof, mean, rng, SE['draws'])
out['ensemble'] = dict(truth=SE['truth'], redshifts=ZS, meanVector=mean.tolist(), covariance=Cdesign.tolist(), **e12)

# pinned vectors
L = np.linalg.cholesky(Cdesign)
pins = []
for k in range(3):
    r = np.random.default_rng([257, 100 + k])
    d = mean + L @ r.standard_normal(len(mean))
    fit = prof.fit(d)
    fit['data'] = d.tolist()
    pins.append(fit)
out['pinned'] = pins

# K1: the product with the labelled synthetic factor on pinned vector 0
d0 = np.array(pins[0]['data'])
ch0, _ = prof.chi2_nodes(d0)
other = ((NODES - 0.28) / 0.03) ** 2
joint = ch0 + other
ji = int(np.argmin(joint))
thr = joint[ji] + 1.0
inside = np.nonzero(joint <= thr)[0]
fj = lambda o: prof.chi2_at(d0, o) + ((o - 0.28) / 0.03) ** 2 - thr
lo_i, hi_i = int(inside[0]), int(inside[-1])
sample_nodes = [0.1, 0.2, 0.28, 0.3, 0.4, 0.6, 0.9]
out['product'] = dict(
    bestOm=float(NODES[ji]), chi2min=float(joint[ji]),
    lo68=None if lo_i == 0 else float(brentq(fj, NODES[lo_i - 1], NODES[lo_i], xtol=1e-14, rtol=1e-14)),
    hi68=None if hi_i == len(NODES) - 1 else float(brentq(fj, NODES[hi_i], NODES[hi_i + 1], xtol=1e-14, rtol=1e-14)),
    bestOmBao=pins[0]['bestOm'], bestOmOther=0.28,
    nodes=sample_nodes,
    jointAtNodes=[float(prof.chi2_at(d0, o) + ((o - 0.28) / 0.03) ** 2) for o in sample_nodes])

# not constrained: fractional sigma 1.0
nc = T['syntheticEnsemble']['notConstrained']
Cnc = design_cov(mean, np.array([nc['fractionalSigma']] * len(mean)))
profnc = Prof(Cnc)
out['notConstrained'] = ensemble(profnc, mean, np.random.default_rng([257, 2]), nc['draws'])

# misspecified: open matter-only world, fitted flat
Om_o, Ok_o = 0.3, 0.7
mm = []
for z in ZS:
    chi = quad(lambda zz: 1.0 / math.sqrt(Om_o * (1 + zz) ** 3 + Ok_o * (1 + zz) ** 2), 0, z, epsabs=0, epsrel=1e-13)[0]
    sk = math.sqrt(Ok_o)
    mm += [THETA * math.sinh(sk * chi) / sk, THETA / math.sqrt(Om_o * (1 + z) ** 3 + Ok_o * (1 + z) ** 2)]
mm = np.array(mm)
msp = T['syntheticEnsemble']['misspecified']
Cms = design_cov(mm, np.array([0.01] * len(mm)))
profms = Prof(Cms)
out['misspecified'] = ensemble(profms, mm, np.random.default_rng([257, 3]), msp['draws'])
out['misspecified']['truthVector'] = mm.tolist()

# ---------------------------------------------------------------- refusal ensemble
RF = T['refusals']['ensemble']
rr = np.random.default_rng(RF['seed'])
draws = []
for k in range(RF['draws']):
    p = dict(H0=float(rr.uniform(-20, 120)), Om=float(rr.uniform(-0.1, 1.2)))
    flatp = rr.uniform() < 0.7
    p['Ode'] = 'flat' if flatp else float(rr.uniform(0, 1.2))
    p['w'] = float(rr.uniform(-3.5, 0.5))
    p['Or'] = float(rr.uniform(-1e-5, 2e-4))
    p['omegaGamma'] = float(rr.uniform(-1e-6, 3e-5))
    p['omegaB'] = float(rr.uniform(-0.005, 0.03))
    p['zd'] = float(rr.uniform(-100, 12000))
    dec = decide(p)
    rec = dict(p=p, decision=dec)
    if dec == 'accept':
        rec['rs'] = rs_of_draw(p)
    draws.append(rec)
out['refusalEnsemble'] = dict(seed=RF['seed'], n=len(draws), accepted=sum(1 for d in draws if d['decision'] == 'accept'),
                              draws=draws)

# input refusals (the six cases are defined identically in the prototype)
def input_decision(d, Cm):
    d = np.array(d, dtype=float) if not isinstance(d, np.ndarray) else d
    Cm = np.array(Cm, dtype=float)
    if Cm.ndim != 2 or Cm.shape[0] != Cm.shape[1] or Cm.shape[0] != d.size:
        return 'bad-argument'
    if not (np.all(np.isfinite(d)) and np.all(np.isfinite(Cm))):
        return 'not-finite'
    if np.max(np.abs(Cm - Cm.T)) > 1e-9 * np.max(np.abs(Cm)):
        return 'bad-covariance'
    if np.min(np.linalg.eigvalsh(Cm)) <= 0:
        return 'bad-covariance'
    if d.size <= 2:
        return 'underdetermined'
    return 'ok'


ds = pins[0]['data']
Cok = Cdesign
cases = []
cases.append(('1-datum', input_decision(ds[:1], Cok[:1, :1])))
cases.append(('2-data', input_decision(ds[:2], Cok[:2, :2])))
Cas = Cok.copy()
Cas[0, 1] = Cas[0, 1] + 1e-3 * np.max(np.abs(Cok))
cases.append(('asymmetric', input_decision(ds, Cas)))
Cnp = Cok.copy()
Cnp[2, 2] = -abs(Cnp[2, 2])
cases.append(('not-positive-definite', input_decision(ds, Cnp)))
dnan = list(ds)
dnan[3] = float('nan')
cases.append(('nan-datum', input_decision(dnan, Cok)))
cases.append(('dimension-mismatch', input_decision(ds, Cok[:5, :5])))
out['inputRefusals'] = [dict(case=c, decision=d) for c, d in cases]

# ---------------------------------------------------------------- the stream and the demonstration
DM_ = T['demonstration']
side = json.load(open(SIDECAR_PATH))
side_sha = hashlib.sha256(open(SIDECAR_PATH, 'rb').read()).hexdigest()


def decode_col(col, n):
    import base64
    raw = base64.b64decode(col['data'])
    ks = np.frombuffer(raw, dtype='<i4')
    assert ks.size == n
    return col['offset'] + col['step'] * ks.astype(np.float64)


n_gal = side['n']
ra = decode_col(side['columns'][0], n_gal)
zg = decode_col(side['columns'][1], n_gal)
out['data'] = dict(sidecarSha256=side_sha, n=int(n_gal), raMin=float(ra.min()), raMax=float(ra.max()),
                   zMin=float(zg.min()), zMax=float(zg.max()), sorted=bool(np.all(np.diff(ra) >= 0)),
                   finite=bool(np.all(np.isfinite(ra)) and np.all(np.isfinite(zg))),
                   raFirst=[float(x) for x in ra[:5]], zFirst=[float(x) for x in zg[:5]],
                   raSum=float(ra.sum()), zSum=float(zg.sum()))

stream_check = {}
for key in ('257:bao:randoms', '257:bao:null:0', 257):
    g = Mulberry(key)
    vals = [g() for _ in range(1000)]
    stream_check[str(key)] = dict(first=vals[:5], last=vals[-1], sum=float(sum(vals)),
                                  hash=hashlib.sha256(np.array(vals).tobytes()).hexdigest())
out['stream'] = stream_check

# comoving distances of the fiducial wedge cosmology (no radiation)
fid = FlatLambdaCDM(H0=70.0, Om0=0.3, Tcmb0=0.0 * u.K)
h_fid = 0.7
DEC = math.radians(0.25)


def positions(ra_deg, z):
    D = fid.comoving_distance(z).value * h_fid
    a = np.radians(ra_deg)
    return np.column_stack([D * math.cos(DEC) * np.cos(a), D * math.cos(DEC) * np.sin(a), D * math.sin(DEC) * np.ones_like(a)])


Nd = n_gal
Nr = 10 * Nd


def catalog(seedtext, n):
    g = Mulberry(seedtext)
    r = np.empty(n)
    zz = np.empty(n)
    for i in range(n):
        u1 = g()
        u2 = g()
        r[i] = 120.0 + 120.0 * u1
        zz[i] = zg[int(math.floor(u2 * Nd))]
    return r, zz


ra_r, z_r = catalog('257:bao:randoms', Nr)
Pd = positions(ra, zg)
Pr = positions(ra_r, z_r)
EDGES = np.array([40.0 + 10.0 * k for k in range(13)])


def binned_self(tree):
    c = tree.count_neighbors(tree, EDGES)
    return (np.diff(c)) / 2.0


def binned_cross(t1, t2):
    return np.diff(t1.count_neighbors(t2, EDGES))


def ls_from(DD, DR, RR, nd, nr):
    ddn = DD / (nd * (nd - 1) / 2.0)
    drn = DR / (nd * nr)
    rrn = RR / (nr * (nr - 1) / 2.0)
    return (ddn - 2 * drn + rrn) / rrn


td, tr = cKDTree(Pd), cKDTree(Pr)
DD = binned_self(td)
RR = binned_self(tr)
DR = binned_cross(td, tr)
xi = ls_from(DD, DR, RR, Nd, Nr)

# block matrices for the jackknife
NB = 12
bd = np.minimum(((ra - 120.0) // 10.0).astype(int), NB - 1)
br = np.minimum(((ra_r - 120.0) // 10.0).astype(int), NB - 1)
td_b = [cKDTree(Pd[bd == b]) if np.any(bd == b) else None for b in range(NB)]
tr_b = [cKDTree(Pr[br == b]) if np.any(br == b) else None for b in range(NB)]
nd_b = [int(np.sum(bd == b)) for b in range(NB)]
nr_b = [int(np.sum(br == b)) for b in range(NB)]
DDm = np.zeros((NB, NB, 12))
RRm = np.zeros((NB, NB, 12))
DRm = np.zeros((NB, NB, 12))
for b1 in range(NB):
    for b2 in range(b1, NB):
        if td_b[b1] is not None and td_b[b2] is not None:
            DDm[b1, b2] = binned_self(td_b[b1]) if b1 == b2 else binned_cross(td_b[b1], td_b[b2])
        if tr_b[b1] is not None and tr_b[b2] is not None:
            RRm[b1, b2] = binned_self(tr_b[b1]) if b1 == b2 else binned_cross(tr_b[b1], tr_b[b2])
for b1 in range(NB):
    for b2 in range(NB):
        if td_b[b1] is not None and tr_b[b2] is not None:
            DRm[b1, b2] = binned_cross(td_b[b1], tr_b[b2])
assert np.allclose(DDm.sum(axis=(0, 1)), DD) and np.allclose(RRm.sum(axis=(0, 1)), RR) and np.allclose(DRm.sum(axis=(0, 1)), DR)
reps = []
for k in range(NB):
    ddk = DD - DDm[k, :, :].sum(axis=0) - DDm[:, k, :].sum(axis=0) + DDm[k, k]
    rrk = RR - RRm[k, :, :].sum(axis=0) - RRm[:, k, :].sum(axis=0) + RRm[k, k]
    drk = DR - DRm[k, :, :].sum(axis=0) - DRm[:, k, :].sum(axis=0) + DRm[k, k]
    reps.append(ls_from(ddk, drk, rrk, Nd - nd_b[k], Nr - nr_b[k]))
reps = np.array(reps)
sig_jk = np.sqrt((NB - 1.0) / NB * np.sum((reps - reps.mean(axis=0)) ** 2, axis=0))

centres = 0.5 * (EDGES[:-1] + EDGES[1:])
win = (centres >= 90.0) & (centres < 130.0)
outside = ~win
wts = 1.0 / sig_jk[outside] ** 2
A = np.column_stack([np.ones(outside.sum()), np.log10(centres[outside])])
beta = np.linalg.solve(A.T @ (A * wts[:, None]), A.T @ (wts * xi[outside]))
smooth = beta[0] + beta[1] * np.log10(centres)
sn = (xi - smooth) / sig_jk
out['pairs'] = dict(edges=EDGES.tolist(), Nd=Nd, Nr=Nr, DD=DD.tolist(), DR=DR.tolist(), RR=RR.tolist(), xi=xi.tolist(),
                    sigmaJackknife=sig_jk.tolist(), smooth=smooth.tolist(), smoothFit=beta.tolist(), sn=sn.tolist(),
                    windowBins=np.nonzero(win)[0].tolist(), maxWindowSN=float(sn[win].max()),
                    detectable=bool(sn[win].max() >= 4.0), randomsSumRa=float(ra_r.sum()), randomsSumZ=float(z_r.sum()))

# AM1: the reported sensitivity row (X5): randoms over the data's own RA extent, no bound
ra_min = float(ra.min())


def catalog_extent(seedtext, n):
    g = Mulberry(seedtext)
    r = np.empty(n)
    zz = np.empty(n)
    for i in range(n):
        u1 = g()
        u2 = g()
        r[i] = ra_min + (240.0 - ra_min) * u1
        zz[i] = zg[int(math.floor(u2 * Nd))]
    return r, zz


ra_e, z_e = catalog_extent('257:bao:randoms-extent', Nr)
Pe = positions(ra_e, z_e)
te = cKDTree(Pe)
RRe = binned_self(te)
DRe = binned_cross(td, te)
xie = ls_from(DD, DRe, RRe, Nd, Nr)
be = np.minimum(((ra_e - 120.0) // 10.0).astype(int), NB - 1)
te_b = [cKDTree(Pe[be == b]) if np.any(be == b) else None for b in range(NB)]
nr_e = [int(np.sum(be == b)) for b in range(NB)]
RRem = np.zeros((NB, NB, 12))
DRem = np.zeros((NB, NB, 12))
for b1 in range(NB):
    for b2 in range(b1, NB):
        if te_b[b1] is not None and te_b[b2] is not None:
            RRem[b1, b2] = binned_self(te_b[b1]) if b1 == b2 else binned_cross(te_b[b1], te_b[b2])
for b1 in range(NB):
    for b2 in range(NB):
        if td_b[b1] is not None and te_b[b2] is not None:
            DRem[b1, b2] = binned_cross(td_b[b1], te_b[b2])
repe = []
for k in range(NB):
    ddk = DD - DDm[k, :, :].sum(axis=0) - DDm[:, k, :].sum(axis=0) + DDm[k, k]
    rrk = RRe - RRem[k, :, :].sum(axis=0) - RRem[:, k, :].sum(axis=0) + RRem[k, k]
    drk = DRe - DRem[k, :, :].sum(axis=0) - DRem[:, k, :].sum(axis=0) + DRem[k, k]
    repe.append(ls_from(ddk, drk, rrk, Nd - nd_b[k], Nr - nr_e[k]))
repe = np.array(repe)
sige = np.sqrt((NB - 1.0) / NB * np.sum((repe - repe.mean(axis=0)) ** 2, axis=0))
we = 1.0 / sige[outside] ** 2
be_ = np.linalg.solve(A.T @ (A * we[:, None]), A.T @ (we * xie[outside]))
sme = be_[0] + be_[1] * np.log10(centres)
sne = (xie - sme) / sige
out['pairsExtent'] = dict(raMin=ra_min, RR=RRe.tolist(), DR=DRe.tolist(), xi=xie.tolist(), sigmaJackknife=sige.tolist(),
                          smoothFit=be_.tolist(), sn=sne.tolist(), maxWindowSN=float(sne[win].max()),
                          randomsSumRa=float(ra_e.sum()))

# null ensemble
nulls = []
for k in range(16):
    ra_n, z_n = catalog('257:bao:null:%d' % k, Nd)
    Pn = positions(ra_n, z_n)
    tn = cKDTree(Pn)
    nulls.append(ls_from(binned_self(tn), binned_cross(tn, tr), RR, Nd, Nr))
nulls = np.array(nulls)
mean_b = nulls.mean(axis=0)
sd_mean = nulls.std(axis=0, ddof=1) / math.sqrt(len(nulls))
ok_bins = np.abs(mean_b) <= 3.0 * sd_mean + 0.001
out['nullEnsemble'] = dict(n=16, xi=nulls.tolist(), mean=mean_b.tolist(), sdMean=sd_mean.tolist(), passBins=int(ok_bins.sum()))

out['seconds'] = round(time.time() - t0, 1)
json.dump(out, open(OUT_PATH, 'w'), indent=1)
open(OUT_PATH, 'a').write('\n')
print('wrote', OUT_PATH, out['seconds'], 's')
