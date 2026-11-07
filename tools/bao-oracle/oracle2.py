#!/usr/bin/env python3
"""The second independent oracle for the Prompt 257 follow-up (the authentic legs of the BAO gate).

Written after tests/fixtures/bao/thresholds-followup.json (commit b7612495) and before any prototype addition or validator
run of the follow-up. It imports no Gravitas code. It reads only the follow-up thresholds, the parent thresholds (for the
seeds-free committed numbers it needs), and the files of tests/fixtures/bao/authentic/, and uses numpy, scipy and
astropy.constants (never astropy.cosmology). Independent calculations:

  eq (4), (6), (26) of Eisenstein and Hu from the transcribed coefficients (read by key, never typed here)
  the sound-horizon integral by scipy quad in its own variable, in the paper's model, and the P1c model with one
  0.06 eV neutrino by its Fermi-Dirac density; the F4 domain decisions; the E6 flag calibration with the closed-form
  non-central chi-square; the release's integrity, printed consistency, the BAO-only fit by profile over theta, the nonlinear
  profile (reported) and the fiducial alphas by its own quadrature of E(z)

  python3 -E tools/bao-oracle/oracle2.py <authentic dir> <thresholds-followup.json> <thresholds.json> <out.json>
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
from scipy.integrate import quad
from scipy.optimize import brentq, minimize_scalar
from scipy.stats import chi2 as chi2dist
from scipy.stats import ncx2

warnings.simplefilter('ignore')
import astropy.constants as const  # noqa: E402

AUTH, FU_PATH, PARENT_PATH, OUT_PATH = sys.argv[1:5]
FU_BYTES = open(FU_PATH, 'rb').read()
FU = json.loads(FU_BYTES)
PARENT = json.loads(open(PARENT_PATH, 'rb').read())
t0 = time.time()


def jload(name):
    return json.loads(open(os.path.join(AUTH, name), 'rb').read())


def sha(b):
    return hashlib.sha256(b).hexdigest()


C = FU['conventions']['constants']['c_kms']
K_B = 1.380649e-23
H_PLANCK = 6.62607015e-34
HBAR = H_PLANCK / (2 * math.pi)
C_SI = 299792458.0
MPC_M = 3.0856775814913673e22
E_CHARGE = 1.602176634e-19
G_SI = float(const.G.value)
NU = 7.0 / 8.0 * (4.0 / 11.0) ** (4.0 / 3.0)
assert G_SI == FU['conventions']['constants']['G_SI']


def omega_gamma_h2(Tk):
    rho_g = (math.pi ** 2 / 15.0) * (K_B * Tk) ** 4 / (HBAR * C_SI) ** 3 / C_SI ** 2
    h100 = 100.0 * 1e3 / MPC_M
    rho_c = 3.0 * h100 ** 2 / (8.0 * math.pi * G_SI)
    return rho_g / rho_c


FF = jload('fitting-formulas.json')['coefficients']
V = lambda k: FF[k]['value']
EXP10 = lambda k: FF[k]['exponent']
out = dict(format='gravitas.bao-followup-oracle/1', thresholdsFollowupSha256=sha(FU_BYTES),
           tools=dict(python=sys.version.split()[0], numpy=np.__version__, scipy=__import__('scipy').__version__,
                      astropyConstants=__import__('astropy').__version__),
           constants=dict(c_kms=C, G_SI=G_SI))
out['inputSha256'] = {k: v['sha256'] for k, v in FU['inputs']['dataFiles'].items()}


# ---------------------------------------------------------------- the Eisenstein and Hu formulas
def zd_eq4(w0, wb):
    b1 = V('b1.a') * w0 ** V('b1.exponentOfOmega0h2') * (1 + V('b1.bracketCoefficient') * w0 ** V('b1.bracketExponent'))
    b2 = V('b2.a') * w0 ** V('b2.exponentOfOmega0h2')
    return V('zd.a') * w0 ** V('zd.exponentOfOmega0h2') / (1 + V('zd.denominatorCoefficient') * w0 ** V('zd.denominatorExponent')) * (1 + b1 * wb ** b2)


def s_eq26(w0, wb):
    return V('s26.a') * math.log(V('s26.lnArgument') / w0) / math.sqrt(1 + V('s26.denominatorCoefficient') * wb ** V('s26.denominatorExponent'))


THETA_EH = FU['conventions']['constants']['Tcmb_ehPaper'] / 2.7


def s_eq6(w0, wb, zd, aR=None, mz=None, mk=None):
    aR = V('R.a') if aR is None else aR
    mz = V('zeq.mantissa') if mz is None else mz
    mk = V('keq.mantissa') if mk is None else mk
    zeq = mz * 10.0 ** EXP10('zeq.power10') * w0 * THETA_EH ** -4
    keq = mk * 10.0 ** EXP10('keq.power10') * w0 * THETA_EH ** -2
    R = lambda z: aR * wb * THETA_EH ** -4 / (z / 10.0 ** EXP10('R.zScale.power10'))
    Rd, Req = R(zd), R(zeq)
    return 2.0 / (3.0 * keq) * math.sqrt(6.0 / Req) * math.log((math.sqrt(1 + Rd) + math.sqrt(Rd + Req)) / (1 + math.sqrt(Req))), zeq


def unit_of(token):
    dec = len(token.split('.')[1]) if '.' in token else 0
    return 10.0 ** (-dec)


# ---------------------------------------------------------------- the integral in the paper's model
OG_EH = omega_gamma_h2(FU['conventions']['constants']['Tcmb_ehPaper'])
WR_EH = OG_EH * (1 + NU * FU['conventions']['constants']['Neff_ehPaper'])


def rs_paper(w0, wb, zd):
    H0 = 100.0
    Om, Or = w0, WR_EH
    Ode = 1.0 - Om - Or
    b = 3.0 * wb / (4.0 * OG_EH)
    ad = 1.0 / (1.0 + zd)

    def f(t):
        a = ad * t * t
        d = Om * a + Or + Ode * a ** 4
        return 2.0 * ad * t / (math.sqrt(3.0 * (1.0 + b * a)) * math.sqrt(d))

    pts = [0.0, 0.1, 0.3, 0.6, 1.0]
    v = sum(quad(f, lo, hi, epsabs=0, epsrel=1e-13, limit=500)[0] for lo, hi in zip(pts[:-1], pts[1:]))
    return C / H0 * v


# ---------------------------------------------------------------- the grid (F2, F5, F6) and the domain (F4)
GRID = []
for k in range(6):
    w0 = 0.025 * 20.0 ** (k / 5.0)
    for j in range(4):
        wb = 0.0125 + (0.03 - 0.0125) * j / 3.0
        if wb < w0:
            GRID.append((w0, wb))
assert len(GRID) == FU['conventions']['formulaGrid']['nodes']
rows = []
HALF = {'aR': 0.5 * unit_of(FF['R.a']['token']), 'mz': 0.5 * unit_of(FF['zeq.mantissa']['token']), 'mk': 0.5 * unit_of(FF['keq.mantissa']['token'])}
for w0, wb in GRID:
    zd = zd_eq4(w0, wb)
    r = rs_paper(w0, wb, zd)
    s26 = s_eq26(w0, wb)
    s6, zeq = s_eq6(w0, wb, zd)
    u = 0.0
    for key, c in (('aR', V('R.a')), ('mz', V('zeq.mantissa')), ('mk', V('keq.mantissa'))):
        h = 1e-4
        up = s_eq6(w0, wb, zd, **{key: c * (1 + h)})[0]
        dn = s_eq6(w0, wb, zd, **{key: c * (1 - h)})[0]
        dln = (math.log(up) - math.log(dn)) / (2 * h)
        u += abs(dln) * HALF[key] / c
    u += 1.0 / zeq
    rows.append(dict(omega0=w0, omegaB=wb, zd=zd, integral=r, s26=s26, s6=s6, errS26=abs(s26 / r - 1), errS6=abs(s6 / r - 1), uS6=u))
out['grid'] = rows
out['gridMaxErrS26'] = max(x['errS26'] for x in rows)
out['gridS6AllWithinU'] = all(x['errS6'] <= x['uS6'] for x in rows)
out['gridWorstS6OverU'] = max(x['errS6'] / x['uS6'] for x in rows)

DOM = dict(w0=(V('domain.omega0h2.lower'), V('domain.omega0h2.upper')), wb=(V('domain.omegaBh2.lower'), V('domain.omegaBh2.upperForDragEpoch')))


def decide(w0, wb):
    if not (math.isfinite(w0) and math.isfinite(wb)):
        return 'not-finite'
    if w0 < DOM['w0'][0]:
        return 'omega0-below-domain'
    if w0 > DOM['w0'][1]:
        return 'omega0-above-domain'
    if wb < DOM['wb'][0]:
        return 'omegab-below-domain'
    if wb > DOM['wb'][1]:
        return 'omegab-above-domain'
    return None


OUT_PTS = [(0.02475, 0.0224), (0.0125, 0.0224), (0.0025, 0.0224), (0.505, 0.0224), (1.0, 0.0224), (5.0, 0.0224),
           (0.14, 0.012375), (0.14, 0.00625), (0.14, 0.00125), (0.14, 0.0303), (0.14, 0.06), (0.14, 0.3)]
IN_PTS = [(0.025, 0.0125), (0.5, 0.03), (0.14, 0.0224)]
out['domain'] = dict(outside=[dict(w0=a, wb=b, code=decide(a, b)) for a, b in OUT_PTS],
                     inside=[dict(w0=a, wb=b, code=decide(a, b)) for a, b in IN_PTS])

# ---------------------------------------------------------------- the Planck row: formulas and P1c
PL = jload('planck-table1.json')['values']
pnum = lambda k: float(PL[k])
w0P = pnum('omegaB') + pnum('omegaC')
out['planckFormulas'] = dict(omega0=w0P, zdEq4=zd_eq4(w0P, pnum('omegaB')), s26=s_eq26(w0P, pnum('omegaB')),
                             s6=s_eq6(w0P, pnum('omegaB'), zd_eq4(w0P, pnum('omegaB')))[0],
                             integralPaperModelAtEq4Zd=rs_paper(w0P, pnum('omegaB'), zd_eq4(w0P, pnum('omegaB'))),
                             zdPrinted=pnum('zdrag'), rdragPrinted=pnum('rdrag'))

TP = FU['conventions']['constants']['Tcmb0_planckRow']
NEFF = FU['conventions']['constants']['Neff_standard']
OG_P = omega_gamma_h2(TP)
KAPPA = NU * NEFF / 3.0
KT_NU_EV = K_B * (4.0 / 11.0) ** (1.0 / 3.0) * TP / E_CHARGE  # eV
I0 = 7.0 * math.pi ** 4 / 120.0


def fd_ratio(y):
    g = lambda x: x * x * math.sqrt(x * x + y * y) / (math.exp(x) + 1.0)
    pts = [0.0, 1.0, 4.0, 12.0, 30.0, 80.0]
    return sum(quad(g, a, b, epsabs=0, epsrel=1e-13, limit=500)[0] for a, b in zip(pts[:-1], pts[1:])) / I0


def r_p1c(wb, wc, H0, zd, mnu_ev):
    h = H0 / 100.0
    wm = wb + wc
    y0 = mnu_ev / KT_NU_EV
    wrel0 = OG_P * (1.0 + 2.0 * KAPPA)
    wL = h * h - wm - wrel0 - OG_P * KAPPA * fd_ratio(y0)
    b = 3.0 * wb / (4.0 * OG_P)
    ad = 1.0 / (1.0 + zd)

    def f(t):
        a = ad * t * t
        d = wm * a + wrel0 + OG_P * KAPPA * fd_ratio(y0 * a) + wL * a ** 4
        return 2.0 * ad * t / (math.sqrt(3.0 * (1.0 + b * a)) * math.sqrt(d))

    pts = [0.0, 0.1, 0.3, 0.6, 1.0]
    return C / 100.0 * sum(quad(f, lo, hi, epsabs=0, epsrel=1e-12, limit=500)[0] for lo, hi in zip(pts[:-1], pts[1:]))


mnu = pnum('neutrinoMassEv')
args = dict(wb=pnum('omegaB'), wc=pnum('omegaC'), H0=pnum('H0'), zd=pnum('zdrag'))
r0 = r_p1c(args['wb'], args['wc'], args['H0'], args['zd'], mnu)
prop = 0.0
for nm in ('wb', 'wc', 'H0', 'zd'):
    key = {'wb': 'omegaB', 'wc': 'omegaC', 'H0': 'H0', 'zd': 'zdrag'}[nm]
    x = args[nm]
    up = dict(args)
    dn = dict(args)
    up[nm] = x * (1 + 1e-4)
    dn[nm] = x * (1 - 1e-4)
    d = abs(r_p1c(up['wb'], up['wc'], up['H0'], up['zd'], mnu) - r_p1c(dn['wb'], dn['wc'], dn['H0'], dn['zd'], mnu)) / (2 * x * 1e-4)
    half = 0.5 * unit_of(PL[key]) + (float(PL['zdragSigma']) if nm == 'zd' else 0.0)
    prop += d * half
u1c = unit_of(PL['rdrag']) + prop
out['p1c'] = dict(rP1c=r0, u=u1c, rdragPrinted=pnum('rdrag'), within=abs(pnum('rdrag') - r0) <= u1c, y0=mnu / KT_NU_EV,
                  fdAtY0=fd_ratio(mnu / KT_NU_EV))

# ---------------------------------------------------------------- the likelihood (the parent's committed form)
SE = PARENT['syntheticEnsemble']
GR = SE['grid']
NODES = np.array([GR['from'] + GR['step'] * k for k in range(int(round((GR['to'] - GR['from']) / GR['step'])) + 1)])
CORR = -0.4
THETA = SE['truth']['theta']
ZS = SE['redshifts']


def E_flat(Om, z):
    return math.sqrt(Om * (1 + z) ** 3 + 1 - Om)


def basis_flat(Om, zs):
    o = []
    for z in zs:
        I = quad(lambda zz: 1.0 / E_flat(Om, zz), 0, z, epsabs=0, epsrel=1e-13, limit=200)[0]
        o += [I, 1.0 / E_flat(Om, z)]
    return np.array(o)


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
    def __init__(self, cov, zs):
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
        res = dict(chi2min=float(ch[i]), bestOm=float(NODES[i]), theta=float(th[i]), index=i, p=float(chi2dist.sf(ch[i], len(d) - 2)))
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


# ---------------------------------------------------------------- E6: the calibration of the poor-fit flag
Om_o, Ok_o = 0.3, 0.7
mis = []
for z in ZS:
    chi = quad(lambda zz: 1.0 / math.sqrt(Om_o * (1 + zz) ** 3 + Ok_o * (1 + zz) ** 2), 0, z, epsabs=0, epsrel=1e-13)[0]
    sk = math.sqrt(Ok_o)
    mis += [THETA * math.sinh(sk * chi) / sk, THETA / math.sqrt(Om_o * (1 + z) ** 3 + Ok_o * (1 + z) ** 2)]
mis = np.array(mis)
flat = np.array([THETA * v for v in basis_flat(SE['truth']['Om'], ZS)])
DRAWS = FU['seeds']['E6']['draws']
q = float(chi2dist.isf(0.0027, 4))


def flag_rate(mean, seed):
    cov = design_cov(mean, np.array([0.01] * len(mean)))
    prof = Prof(cov, ZS)
    lam = float(prof.chi2_nodes(mean)[0].min())
    L = np.linalg.cholesky(cov)
    rng = np.random.default_rng(seed)
    flagged = 0
    for _ in range(DRAWS):
        d = mean + L @ rng.standard_normal(len(mean))
        if chi2dist.sf(prof.chi2_nodes(d)[0].min(), len(d) - 2) < 0.0027:
            flagged += 1
    return lam, flagged / DRAWS


lam_m, rate_m = flag_rate(mis, [257, 7])
lam_n, rate_n = flag_rate(flat, [257, 8])
out['e6'] = dict(draws=DRAWS, q=q, misfit=dict(lambda_=lam_m, pPred=float(ncx2.sf(q, 4, lam_m)) if lam_m > 0 else 0.0027, observed=rate_m),
                 noMisfit=dict(lambda_=lam_n, pPred=float(chi2dist.sf(q, 4)), observed=rate_n),
                 truthVectorMisfit=mis.tolist(), truthVectorFlat=flat.tolist())
out['e6']['nullPPred'] = 0.0027

# ---------------------------------------------------------------- the release
RES_B = open(os.path.join(AUTH, 'BAO_consensus_results_dM_Hz.txt'), 'rb').read()
COV_B = open(os.path.join(AUTH, 'BAO_consensus_covtot_dM_Hz.txt'), 'rb').read()
REL = jload('published-release.json')
labels, zs_r, vals = [], [], []
for ln in RES_B.decode().splitlines():
    if not ln.strip() or ln.startswith('#'):
        continue
    z, lab, val = ln.split()
    zs_r.append(float(z))
    labels.append(lab)
    vals.append(float(val))
vals = np.array(vals)
Cr = np.array([[float(x) for x in ln.split()] for ln in COV_B.decode().splitlines() if ln.strip()])
zeff = sorted(set(zs_r))
sym = float(np.max(np.abs(Cr - Cr.T)) / np.max(np.abs(Cr)))
try:
    np.linalg.cholesky(Cr)
    chol = True
except np.linalg.LinAlgError:
    chol = False
ord_ok = labels == ['dM(rsfid/rs)', 'Hz(rs/rsfid)'] * 3 and zs_r == [z for z in zeff for _ in (0, 1)]
out['o1'] = dict(resultsSha256=sha(RES_B), covSha256=sha(COV_B), resultsBytes=len(RES_B), covBytes=len(COV_B),
                 shaOk=sha(RES_B) == FU['inputs']['dataFiles']['results']['sha256'] and sha(COV_B) == FU['inputs']['dataFiles']['covariance']['sha256'],
                 bytesOk=len(RES_B) == FU['inputs']['dataFiles']['results']['bytes'] and len(COV_B) == FU['inputs']['dataFiles']['covariance']['bytes'],
                 asymmetry=sym, cholesky=chol, minEigenvalue=float(np.linalg.eigvalsh(Cr).min()), dimension=int(Cr.shape[0]),
                 ratios=len(vals), redshifts=zeff, orderOk=bool(ord_ok))

# O1b: the printed Table 7 digits
pr = REL['measurements_BAO_only_consensus']['printed_Table7_rounded']
dm_pr, h_pr = pr['DM'], pr['H']
checks_i, checks_ii = [], []
for k in range(3):
    for kind, pstr, v_idx in (('DM', dm_pr[k], 2 * k), ('H', h_pr[k], 2 * k + 1)):
        m = re.match(r'^([0-9.]+)±([0-9.]+)±([0-9.]+)$', pstr)
        cen, s_, t_ = m.group(1), float(m.group(2)), float(m.group(3))
        un = unit_of(cen)
        rounded = round(vals[v_idx] / un) * un
        checks_i.append(abs(rounded - float(cen)) < un * 1e-6)
        lo = math.sqrt((s_ - 0.5 * un) ** 2 + (t_ - 0.5 * un) ** 2)
        hi = math.sqrt((s_ + 0.5 * un) ** 2 + (t_ + 0.5 * un) ** 2)
        sd = math.sqrt(Cr[v_idx, v_idx])
        checks_ii.append(lo <= sd <= hi)
out['o1b'] = dict(valuesMatchPrinted=checks_i, sigmaInRange=checks_ii)

# O2b: BAO-only fit
RDF = REL['fiducial']['rd_fid_Mpc']
zs3 = zeff
d = np.zeros(6)
J = np.zeros((6, 6))
for k in range(3):
    d[2 * k] = vals[2 * k] / RDF
    d[2 * k + 1] = C / (vals[2 * k + 1] * RDF)
    J[2 * k, 2 * k] = 1.0 / RDF
    J[2 * k + 1, 2 * k + 1] = -C / (vals[2 * k + 1] ** 2 * RDF)
Cd = J @ Cr @ J.T
prof = Prof(Cd, zs3)
fit = prof.fit(d)
A = jload('alam-printed.json')['entries']
om_pc = A['table10.planckPlusBao.omegaM']['value']
om_p = A['table10.planck.omegaM']['value']
fit['dChi2At0309'] = prof.chi2_at(d, om_pc) - fit['chi2min']
fit['dChi2At0317'] = prof.chi2_at(d, om_p) - fit['chi2min']
fit['printedPlanckPlusBao'] = om_pc
fit['printedPlanck'] = om_p
fit['H0rd_kms'] = C / fit['theta']
fit['data'] = d.tolist()
out['o2b'] = fit


# X6: the nonlinear profile in (D_M, H) space
def chi2_nonlin(Om):
    b = basis_flat(Om, zs3)
    bDM = b[0::2]
    Ez = b[1::2]
    Ci = np.linalg.inv(Cr)

    def chi(phi):
        m = np.zeros(6)
        m[0::2] = phi * bDM
        m[1::2] = C / (Ez * phi)  # basis_flat holds 1/E, and H = c E / phi
        r = vals - m
        return float(r @ Ci @ r)

    phi0 = fit['theta'] * RDF
    res = minimize_scalar(chi, bounds=(0.5 * phi0, 1.5 * phi0), method='bounded', options=dict(xatol=1e-12))
    return res.fun, res.x


chs = np.array([chi2_nonlin(o)[0] for o in NODES])
i = int(np.argmin(chs))
nl = dict(bestOm=float(NODES[i]), chi2min=float(chs[i]), phi=float(chi2_nonlin(NODES[i])[1]))
for name, delta in (('68', 1.0), ('95', 4.0)):
    thr = chs[i] + delta
    inside = np.nonzero(chs <= thr)[0]
    lo_i, hi_i = int(inside[0]), int(inside[-1])
    g = lambda o: chi2_nonlin(o)[0] - thr
    nl['lo' + name] = None if lo_i == 0 else float(brentq(g, NODES[lo_i - 1], NODES[lo_i], xtol=1e-12))
    nl['hi' + name] = None if hi_i == len(NODES) - 1 else float(brentq(g, NODES[hi_i], NODES[hi_i + 1], xtol=1e-12))
out['x6'] = nl

# O3b: fiducial alphas by the oracle's own quadrature
fid = REL['fiducial']
H0f = fid['h'] * 100.0
Om_f = fid['Om']


def fid_values(with_radiation):
    Or = (OG_P * (1.0 + NU * NEFF)) / fid['h'] ** 2 if with_radiation else 0.0
    Ode = 1.0 - Om_f - Or
    E = lambda z: math.sqrt(Om_f * (1 + z) ** 3 + Or * (1 + z) ** 4 + Ode)
    f = []
    for z in zs3:
        chi = quad(lambda zz: 1.0 / E(zz), 0, z, epsabs=0, epsrel=1e-13, limit=200)[0]
        f += [C / H0f * chi, H0f * E(z)]
    return np.array(f)


for key, flag in (('o3b', True), ('x7', False)):
    f = fid_values(flag)
    r = vals - f
    Ci = np.linalg.inv(Cr)
    chi2j = float(r @ Ci @ r)
    out[key] = dict(fiducial=f.tolist(), alpha=(vals / f).tolist(), alphaPar=[float(f[2 * k + 1] / vals[2 * k + 1]) for k in range(3)],
                    residualOverSigma=(r / np.sqrt(np.diag(Cr))).tolist(), chi2=chi2j, p=float(chi2dist.sf(chi2j, 6)),
                    componentsWithin3=[bool(abs(r[i]) <= 3 * math.sqrt(Cr[i, i])) for i in range(6)])
out['x7']['largestAlphaChange'] = float(np.max(np.abs(np.array(out['x7']['alpha']) / np.array(out['o3b']['alpha']) - 1)))

out['seconds'] = round(time.time() - t0, 1)
json.dump(out, open(OUT_PATH, 'w'), indent=1)
print('oracle2 done in', out['seconds'], 's')
