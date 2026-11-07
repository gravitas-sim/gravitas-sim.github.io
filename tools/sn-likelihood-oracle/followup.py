#!/usr/bin/env python3
"""The independent oracle for the Prompt 256 follow-up (legs X2 and X3 of the merged gate).

Written after followup-thresholds.json (the contract, committed first). It imports no Gravitas code. It reuses the
merged gate's oracle module (oracle.py beside it: astropy distances, the domain check, the grid and the refinement
code, themselves Gravitas-free) and reads the contract, the raw .dat, the release's covariance (held outside every
repository) and published-flat.json. No random numbers anywhere. It writes derived numbers only.

  STUBS=<dir with the import-only yaml stand-in> python3 -E followup.py CONTRACT.json COV_FILE PUBLISHED.json OUT_DIR
"""
import hashlib
import json
import math
import os
import sys
import time
import zlib
import warnings

import numpy as np
import scipy
import scipy.linalg as sla
import scipy.stats as sst
from scipy.optimize import brentq, minimize_scalar

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
if os.environ.get('STUBS'):
    sys.path.insert(1, os.environ['STUBS'])   # the import-only PyYAML stand-in, outside the tree (python -E ignores PYTHONPATH)
import oracle as O  # noqa: E402  (the merged gate's oracle; no Gravitas code)

warnings.filterwarnings('ignore')

CONTRACT, COVFILE, PUBFILE, OUTDIR = sys.argv[1:5]
t0 = time.time()


def log(*a):
    print(f'[{time.time() - t0:6.0f} s]', *a, file=sys.stderr, flush=True)


contract_bytes = open(CONTRACT, 'rb').read()
CT = json.loads(contract_bytes)
CONTRACT_SHA = hashlib.sha256(contract_bytes).hexdigest()
PUB = json.loads(open(PUBFILE).read())
PUB_SHA = hashlib.sha256(open(PUBFILE, 'rb').read()).hexdigest()
OM_PUB = float(PUB['flat_lcdm_sne_alone']['Omega_M'])
SIG_PUB = float(PUB['flat_lcdm_sne_alone']['sigma'])

N = O.N
L1A = O.PLANES['L1']['a']
LEVEL68, LEVEL95 = 0, 1          # indices into O.D2 (2.2957, 6.1801, 11.8292)


# ---------------------------------------------------------------------------------------------- the file
def read_cov(path):
    raw = open(path, 'rb').read()
    sha = hashlib.sha256(raw).hexdigest()
    toks = raw.split()
    n = int(toks[0])
    vals = np.array(toks[1:], dtype=float)
    return raw, sha, n, vals


raw_bytes, COV_SHA, NC, vals = read_cov(COVFILE)
shape_ok = (vals.size == NC * NC)
CALL = vals.reshape(NC, NC) if shape_ok else None
del raw_bytes
log('covariance read', NC, vals.size, shape_ok)

# the raw .dat in FILE order, each row keeping its index
lines = [ln for ln in open(O.RAW).read().split('\n')]
head = lines[0].split()
at = {k: i for i, k in enumerate(head)}
FILE_ROWS = []
for ln in lines[1:]:
    if not ln.strip():
        continue
    f = ln.split()
    FILE_ROWS.append(dict(cid=f[at['CID']], z=float(f[at['zHD']]), mu=float(f[at['MU_SH0ES']]),
                          err=float(f[at['MU_SH0ES_ERR_DIAG']]), cal=int(float(f[at['IS_CALIBRATOR']])),
                          survey=int(float(f[at['IDSURVEY']]))))
NFILE = len(FILE_ROWS)
F_ERR = np.array([r['err'] for r in FILE_ROWS])
F_Z = np.array([r['z'] for r in FILE_ROWS])
F_MU = np.array([r['mu'] for r in FILE_ROWS])
F_CAL = np.array([r['cal'] for r in FILE_ROWS])
# the sample, in the merged gate's order, with the raw-file index of every row
order = sorted(range(NFILE), key=lambda i: (FILE_ROWS[i]['z'], FILE_ROWS[i]['cid'], FILE_ROWS[i]['survey']))
SIDX = np.array([i for i in order if FILE_ROWS[i]['cal'] == 0 and FILE_ROWS[i]['z'] >= O.ZCUT])
assert len(SIDX) == N and np.all(F_MU[SIDX] == O.MU) and np.all(F_ERR[SIDX] == O.SIG), 'sample mapping differs from the merged gate'

res = dict(format='gravitas.supernova-likelihood-followup-oracle/1', thresholdsSha256=CONTRACT_SHA,
           software=dict(python=sys.version.split()[0], numpy=np.__version__, scipy=scipy.__version__,
                         astropy=O.astropy.__version__),
           note='derived numbers only; no covariance entry is stored; Brout et al. 2022 and Scolnic et al. 2022 are the source of the covariance')
meas = {}     # raw measures every leg is judged from


# ---------------------------------------------------------------------------------------------- I1 to I4
I = {}
I['sha256'] = COV_SHA
I['bytes'] = os.path.getsize(COVFILE)
I['firstLine'] = NC
I['values'] = int(vals.size)
I['shapeOk'] = bool(shape_ok)
I['rawRows'] = NFILE
I['sampleRows'] = int(N)
asym = float(np.max(np.abs(CALL - CALL.T)))
I['maxAsymmetry'] = asym
SYMMETRISED = asym > 1e-9
C_ALL = 0.5 * (CALL + CALL.T) if SYMMETRISED else CALL
I['symmetrised'] = bool(SYMMETRISED)
w_all = np.linalg.eigvalsh(C_ALL)
I['eigMinFull'] = float(w_all[0])
I['eigMaxFull'] = float(w_all[-1])
C_F = C_ALL[np.ix_(SIDX, SIDX)]
w_s = np.linalg.eigh(C_F)
EVAL, EVEC = w_s[0][::-1].copy(), w_s[1][:, ::-1].copy()        # descending
I['eigMinSample'] = float(EVAL[-1])
I['eigMaxSample'] = float(EVAL[0])
I['conditionSample'] = float(EVAL[0] / EVAL[-1])
try:
    sla.cho_factor(C_F, lower=True)
    I['choSampleOk'] = True
except Exception:
    I['choSampleOk'] = False
try:
    sla.cho_factor(C_ALL, lower=True)
    I['choFullOk'] = True
except Exception:
    I['choFullOk'] = False
dg = np.sqrt(np.diag(C_ALL))
I['spearman'] = float(sst.spearmanr(dg, F_ERR).correlation)
I['maxDiagMinusErr'] = float(np.max(np.abs(dg - F_ERR)))
I['medianRatioDiagOverErr'] = float(np.median(dg / F_ERR))
I['minRatioDiagOverErr'] = float(np.min(dg / F_ERR))
I['maxRatioDiagOverErr'] = float(np.max(dg / F_ERR))
res['covariance'] = I
res['published'] = dict(sha256=PUB_SHA, Omega_M=OM_PUB, sigma=SIG_PUB)
log('integrity measured', I['spearman'], I['maxDiagMinusErr'])
if not shape_ok:
    res['stopped'] = 'the file has the wrong shape: every later leg is NOT RUN'
    json.dump(res, open(os.path.join(OUTDIR, 'followup-oracle-results.json'), 'w'), indent=1)
    sys.exit(0)

# ---- AM1: the row mapping proven by the covariance's own structure (permutation tests, seeded)
d_all = np.sqrt(np.diag(C_ALL))
CORR = C_ALL / np.outer(d_all, d_all)
cids = [r['cid'] for r in FILE_ROWS]
bycid = {}
for i_, c_ in enumerate(cids):
    bycid.setdefault(c_, []).append(i_)
pairs = [(a_, b_) for v_ in bycid.values() if len(v_) > 1 for k_, a_ in enumerate(v_) for b_ in v_[k_ + 1:]]
pi_, pj_ = np.array([p[0] for p in pairs]), np.array([p[1] for p in pairs])
obs_c = float(CORR[pi_, pj_].mean())
rng = np.random.default_rng(np.random.SeedSequence([256, 3, 0]))
perm_c = np.empty(2000)
for t_ in range(2000):
    pm = rng.permutation(NC)
    perm_c[t_] = CORR[pm[pi_], pm[pj_]].mean()
I['cidPairs'] = dict(pairs=len(pairs), observedMean=obs_c, permutedMean=float(perm_c.mean()), permutedSd=float(perm_c.std(ddof=1)),
                     permutedMax=float(perm_c.max()), z=float((obs_c - perm_c.mean()) / perm_c.std(ddof=1)),
                     aboveAll=bool(obs_c > perm_c.max()))
surv_all = np.array([r['survey'] for r in FILE_ROWS])
C2 = C_ALL ** 2
np.fill_diagonal(C2, 0.0)
tot_off = float(C2.sum())
codes = np.unique(surv_all)
Mind = (surv_all[:, None] == codes[None, :]).astype(float)
def share(M_):
    return float(np.sum((C2 @ M_) * M_) / tot_off)
obs_s = share(Mind)
rng = np.random.default_rng(np.random.SeedSequence([256, 3, 1]))
perm_s = np.empty(2000)
for t_ in range(2000):
    perm_s[t_] = share(Mind[rng.permutation(NC)])
I['surveyShare'] = dict(surveys=int(len(codes)), observedShare=obs_s, permutedMean=float(perm_s.mean()), permutedSd=float(perm_s.std(ddof=1)),
                        permutedMax=float(perm_s.max()), z=float((obs_s - perm_s.mean()) / perm_s.std(ddof=1)),
                        aboveAll=bool(obs_s > perm_s.max()))
log('AM1 mapping tests', I['cidPairs']['z'], I['surveyShare']['z'])
# R9: the pack's errors against the file's diagonal
excess = F_ERR ** 2 - np.diag(C_ALL)
bands = [(0, 0.01), (0.01, 0.03), (0.03, 0.1), (0.1, 0.5), (0.5, 3.0)]
ratio = d_all / F_ERR
def stats(m):
    return dict(n=int(m.sum()), median=float(np.median(ratio[m])), min=float(ratio[m].min()), max=float(ratio[m].max())) if m.any() else dict(n=0)
R9 = dict(rowsCiiAboveErrSq=int((excess < 0).sum()), maxCiiMinusErrSq=float((-excess).max()),
          spearmanExcessVsZ=float(sst.spearmanr(excess, F_Z).correlation),
          bySurvey={str(int(c)): stats(surv_all == c) for c in codes},
          byBand={f'{a}-{b}': stats((F_Z >= a) & (F_Z < b)) for a, b in bands},
          calibrators=stats(F_CAL == 1), nonCalibrators=stats(F_CAL == 0))
res['covariance'] = I
res['diagonalReport'] = R9
if not (I['cidPairs']['aboveAll'] and I['cidPairs']['z'] >= 10 and I['surveyShare']['aboveAll'] and I['surveyShare']['z'] >= 10):
    res['stopped'] = 'I4c or I4d failed: the row mapping is unproven and every later leg is NOT RUN'
    json.dump(res, open(os.path.join(OUTDIR, 'followup-oracle-results.json'), 'w'), indent=1)
    sys.exit(0)

# ---------------------------------------------------------------------------------------------- a treatment on rows
class MatChol:
    """Cholesky of a covariance block on sample rows idx; the same marginalisation as the merged oracle."""

    def __init__(self, C, idx):
        self.idx = np.asarray(idx)
        self.n = len(self.idx)
        self.L = sla.cholesky(C, lower=True)
        self.e = sla.solve_triangular(self.L, np.ones(self.n), lower=True)
        self.ee = float(self.e @ self.e)

    def chi2_from_r(self, R):
        U = sla.solve_triangular(self.L, R, lower=True)
        if U.ndim == 1:
            return float(U @ U - (self.e @ U) ** 2 / self.ee)
        return np.einsum('ij,ij->j', U, U) - (self.e @ U) ** 2 / self.ee


ALLIDX = np.arange(N)
O.MU_DATA[0] = O.MU

log('building the nodes (astropy)')
NODES = O.build_nodes()
log('nodes built')
P_ACC = {k: ~NODES[k]['refused'] for k in ('L1', 'P1', 'P2')}
NS = {'P1': (len(O.PLANES['P1']['a']), len(O.PLANES['P1']['b'])), 'P2': (len(O.PLANES['P2']['a']), len(O.PLANES['P2']['b']))}


def analyse_full_sample(ch):
    """L1 profile and the two planes on the rows of `ch` (the full sample or a subset)."""
    out = {}
    idx = ch.idx
    d_sub = O.MU[idx]
    nd = NODES['L1']
    chi = ch.chi2_from_r(d_sub[:, None] - nd['mu'][:, idx].T)
    best, pos, prof = O.l1_profile(ch, chi, P_ACC['L1'])
    out['L1'] = dict(best=pos, chi2min=best, d1=prof['d1'], d4=prof['d4'], d9=prof['d9'])
    for kind in ('P1', 'P2'):
        n1, n2 = NS[kind]
        acc = P_ACC[kind]
        chi = np.full(n1 * n2, np.inf)
        ok = np.where(acc)[0]
        chi[ok] = ch.chi2_from_r(d_sub[:, None] - NODES[kind]['mu'][ok][:, idx].T)
        bestc, posc, nfev = O.refine_min(ch, kind, chi, acc, n1, n2)
        gmin = float(np.min(chi[acc]))
        reg, closed = {}, {}
        for lv, name in ((LEVEL68, '68'), (LEVEL95, '95')):
            member = acc & (chi <= gmin + O.D2[lv])
            reg[name] = ''.join('1' if m else '0' for m in member)
            closed[name] = bool(O.region_closed(chi, acc, n1, n2, gmin + O.D2[lv])[0])
        out[kind] = dict(best=posc, chi2min=bestc, gridMin=gmin, regions=reg, closed=closed)
    return out


def interval(rec, key):
    d = rec['L1'][key]
    if d['lowerOpen'] or d['upperOpen'] or len(d['crossings']) != 2:
        return None
    lo, hi = d['crossings']
    return dict(lo=lo, hi=hi, h=0.5 * (hi - lo))


def pack(rec):
    """Strip a full-sample record to the numbers a leg is judged from."""
    out = dict(L1=dict(best=rec['L1']['best'], chi2min=rec['L1']['chi2min'],
                       i68=interval(rec, 'd1'), i95=interval(rec, 'd4'),
                       open68=rec['L1']['d1']['lowerOpen'] or rec['L1']['d1']['upperOpen'],
                       open95=rec['L1']['d4']['lowerOpen'] or rec['L1']['d4']['upperOpen']))
    for kind in ('P1', 'P2'):
        r = rec[kind]
        out[kind] = dict(best=r['best'], chi2min=r['chi2min'], regions=r['regions'], closed=r['closed'])
    return out


# ---------------------------------------------------------------------------------------------- the treatments
TREAT = {}
log('treatments')
TREAT['DIAG'] = O.Chol('diag', ALLIDX)
TREAT['SPLIT'] = O.Chol('cov', ALLIDX)
TREAT['FULL'] = MatChol(C_F, ALLIDX)


def t2_matrix(k):
    V = EVEC[:, :k]
    lam = EVAL[:k]
    approx = (V * lam) @ V.T
    r = np.diag(C_F) - np.einsum('ij,ij,j->i', V, V, lam)
    C2 = approx + np.diag(r)
    return C2, r


T2 = {}
for k in (10, 30, 100):
    C2, r = t2_matrix(k)
    T2[k] = dict(C=C2, r=r)
    ok_chol = True
    try:
        TREAT[f'T2-k{k}'] = MatChol(C2, ALLIDX)
    except Exception:
        ok_chol = False
    T2[k]['cholOk'] = ok_chol

ANALYSES = {}
for name in ('DIAG', 'SPLIT', 'FULL', 'T2-k10', 'T2-k30', 'T2-k100'):
    if name in TREAT:
        ANALYSES[name] = analyse_full_sample(TREAT[name])
        log('analysed', name, ANALYSES[name]['L1']['best'])
meas['fullSample'] = {k: pack(v) for k, v in ANALYSES.items()}

# ---------------------------------------------------------------------------------------------- I5 and I6
def chi2_exact_route(C, idx, nodeset):
    """chi2 at nodes by numpy.linalg.eigh inverse (a different route from cho_solve)."""
    w, V = np.linalg.eigh(C)
    one = np.ones(len(idx))
    Vt1 = V.T @ one
    out = []
    for kind, k in nodeset:
        r = O.MU[idx] - NODES[kind]['mu'][k][idx]
        Vtr = V.T @ r
        a = float(np.sum(Vtr * Vtr / w))
        b = float(np.sum(Vt1 * Vtr / w))
        c = float(np.sum(Vt1 * Vt1 / w))
        out.append(a - b * b / c)
    return np.array(out)


nodeset = []
for kind in ('L1', 'P1', 'P2'):
    acc_ix = np.where(P_ACC[kind])[0]
    step = max(len(acc_ix) // 10, 1)
    nodeset += [(kind, int(acc_ix[i * step])) for i in range(10)]
chi_cho = np.array([float(TREAT['FULL'].chi2_from_r(O.MU[ALLIDX] - NODES[kd]['mu'][k][ALLIDX])) for kd, k in nodeset])
chi_eig = chi2_exact_route(C_F, ALLIDX, nodeset)
x = sla.cho_solve(sla.cho_factor(C_F, lower=True), np.ones(N))
res_solve = float(np.max(np.abs(C_F @ x - 1.0)))
meas['solvers'] = dict(nodes=len(nodeset), maxRelDiff=float(np.max(np.abs(chi_cho - chi_eig) / np.abs(chi_cho))),
                       choleskyResidual=res_solve)

old = json.load(open(os.path.join(O.FIX, 'oracle-results.json')))
reg_old = {}
for tr, key in (('DIAG', 'real.diag'), ('SPLIT', 'real.cov')):
    a = old['analyses'][key]['L1']
    reg_old[tr] = dict(best=a['position'], d1=a['intervals']['d1']['crossings'], d4=a['intervals']['d4']['crossings'])
diffs = []
for tr in ('DIAG', 'SPLIT'):
    n = ANALYSES[tr]['L1']
    diffs.append(abs(n['best'] - reg_old[tr]['best']))
    diffs += [abs(a - b) for a, b in zip(n['d1']['crossings'], reg_old[tr]['d1'])]
    diffs += [abs(a - b) for a, b in zip(n['d4']['crossings'], reg_old[tr]['d4'])]
meas['regression'] = dict(maxAbsDiff=float(max(diffs)), N=int(N), fullSha256Old=old.get('fullFileSha256'))

# ---------------------------------------------------------------------------------------------- T2 facts
tr = float(np.trace(C_F))
offE = float(np.sum(C_F ** 2) - np.sum(np.diag(C_F) ** 2))
t2facts = {}
for k in (10, 30, 100):
    C2 = T2[k]['C']
    r = T2[k]['r']
    offE2 = float(np.sum(C2 ** 2) - np.sum(np.diag(C2) ** 2))
    t2facts[f'k{k}'] = dict(minResidualDiag=float(r.min()),
                            maxDiagDiff=float(np.max(np.abs(np.diag(C2) - np.diag(C_F)))),
                            cholOk=bool(T2[k]['cholOk']),
                            retainedTrace=float(EVAL[:k].sum() / tr),
                            retainedOffDiagEnergy=float(offE2 / offE))
meas['t2'] = t2facts

# ---------------------------------------------------------------------------------------------- T1 subsets
T1 = {}
for n in (100, 300, 800):
    idx = np.array([int(math.floor((m + 0.5) * N / n)) for m in range(n)])
    Cb = C_F[np.ix_(idx, idx)]
    ch = MatChol(Cb, idx)
    rec = analyse_full_sample(ch)
    pk = pack(rec)
    F = ANALYSES['FULL']
    chiL1 = O.exact_chi2(ch, 'L1', (F['L1']['best'],))
    out = dict(rows=int(n), L1=pk['L1'], P1=pk['P1'], P2=pk['P2'],
               u1=float(chiL1 - rec['L1']['chi2min']),
               u2=float(O.exact_chi2(ch, 'P1', tuple(F['P1']['best'])) - rec['P1']['chi2min']),
               u3=float(O.exact_chi2(ch, 'P2', tuple(F['P2']['best'])) - rec['P2']['chi2min']))
    # R7: the same rows with the DIAG and SPLIT forms
    forms = {}
    for form in ('diag', 'cov'):
        if form == 'cov' and not O.pd_ok(idx, O.TAU):
            forms[form] = None
            continue
        c2 = O.Chol(form, idx)
        d = d_sub = O.MU[idx]
        nd = NODES['L1']
        chi = c2.chi2_from_r(d_sub[:, None] - nd['mu'][:, idx].T)
        b, p, prof = O.l1_profile(c2, chi, P_ACC['L1'])
        cr = prof['d1']['crossings']
        forms[form] = dict(best=p, h68=(0.5 * (cr[1] - cr[0]) if len(cr) == 2 and not prof['d1']['lowerOpen'] and not prof['d1']['upperOpen'] else None))
    out['forms'] = forms
    T1[f'n{n}'] = out
    log('subset', n, out['u1'], out['u2'], out['u3'])
meas['t1'] = T1

# ---------------------------------------------------------------------------------------------- R legs
rep = {}

# R1: all 1,701 rows (the calibrators included), flat case, FULL and DIAG, own estimator
zall = F_Z.copy()
good = zall > 0
def l1_all(kind):
    ix = np.where(good)[0]
    zz = zall[ix]
    C = C_ALL[np.ix_(ix, ix)] if kind == 'FULL' else np.diag(F_ERR[ix] ** 2)
    L = sla.cholesky(C, lower=True)
    e = sla.solve_triangular(L, np.ones(len(ix)), lower=True)
    ee = float(e @ e)
    d = F_MU[ix]
    def chi(Om):
        m = 5 * np.log10(O.cosmo('L1', Om).luminosity_distance(zz).value) + 25
        u = sla.solve_triangular(L, d - m, lower=True)
        return float(u @ u - (e @ u) ** 2 / ee)
    grid = np.linspace(0.02, 0.98, 49)
    vals_ = [chi(g) for g in grid]
    k = int(np.argmin(vals_))
    r = minimize_scalar(chi, bounds=(grid[max(k - 1, 0)], grid[min(k + 1, 48)]), method='bounded', options=dict(xatol=1e-10))
    best, pos = r.fun, float(r.x)
    try:
        lo = brentq(lambda x: chi(x) - best - 1.0, 1e-3, pos, xtol=1e-12)
        hi = brentq(lambda x: chi(x) - best - 1.0, pos, 0.999, xtol=1e-12)
        h = 0.5 * (hi - lo)
    except Exception:
        lo = hi = h = None
    return dict(rows=int(len(ix)), calibrators=int(F_CAL[ix].sum()), best=pos, lo68=lo, hi68=hi, h68=h)
rep['R1.allRows'] = {k: l1_all(k) for k in ('FULL', 'DIAG')}
log('R1 done')

# R2: structure
same = (O.SURV[:, None] == O.SURV[None, :]) & ~np.eye(N, dtype=bool)
offmask = ~np.eye(N, dtype=bool)
e_off = float(np.sum(C_F[offmask] ** 2))
Csplit = O.build_cov(ALLIDX, O.TAU)
rep['R2.structure'] = dict(
    fullOffDiagEnergy=e_off,
    fullSharedWithinSurvey=float(np.sum(C_F[same] ** 2) / e_off),
    splitOffDiagEnergy=float(np.sum(Csplit[offmask] ** 2)),
    fullOffDiagMean=float(np.mean(C_F[offmask])),
    fullOffDiagMeanWithinSurvey=float(np.mean(C_F[same])),
    fullOffDiagMeanBetweenSurveys=float(np.mean(C_F[offmask & ~same])),
    fullNegativeOffDiagFraction=float(np.mean(C_F[offmask] < 0)),
    eigenShareLeading1=float(EVAL[0] / EVAL.sum()),
    eigenShareLeading10=float(EVAL[:10].sum() / EVAL.sum()))

# R3: tau*: single tau at which the split form's flat-case h68 (linear crossing on the 201 grid) equals FULL's
def h68_grid(C, idx):
    ch = MatChol(C, idx)
    nd = NODES['L1']
    chi = ch.chi2_from_r(O.MU[idx][:, None] - nd['mu'][:, idx].T)
    chi = np.where(P_ACC['L1'], chi, np.inf)
    k = int(np.argmin(chi))
    lo = hi = None
    for j in range(k, 0, -1):
        if chi[j - 1] > chi[k] + 1.0 >= chi[j]:
            lo = L1A[j - 1] + (chi[k] + 1.0 - chi[j - 1]) / (chi[j] - chi[j - 1]) * (L1A[j] - L1A[j - 1])
            break
    for j in range(k, len(chi) - 1):
        if chi[j + 1] > chi[k] + 1.0 >= chi[j]:
            hi = L1A[j] + (chi[k] + 1.0 - chi[j]) / (chi[j + 1] - chi[j]) * (L1A[j + 1] - L1A[j])
            break
    return None if lo is None or hi is None else 0.5 * (hi - lo), float(L1A[k])

hF_grid = h68_grid(C_F, ALLIDX)[0]
tau_max = 0.0
for code in np.unique(O.SURV):
    m = np.where(O.SURV == code)[0]
    if len(m) >= 2:
        tau_max = min(tau_max or 9.0, float(O.SIG[m].min()))
tau_hi = tau_max * 0.999
f_tau = lambda tau: h68_grid(O.build_cov(ALLIDX, tau), ALLIDX)[0] - hF_grid
f_lo, f_hi = f_tau(1e-4), f_tau(tau_hi)
if f_lo * f_hi < 0:
    tau_star = float(brentq(f_tau, 1e-4, tau_hi, xtol=1e-6))
    rep['R3.tauStar'] = dict(tauStar=tau_star, tauRange=[1e-4, tau_hi], hFullGrid=hF_grid, found=True)
else:
    rep['R3.tauStar'] = dict(found=False, tauRange=[1e-4, tau_hi], hFullGrid=hF_grid, hAtLow=f_lo + hF_grid, hAtHigh=f_hi + hF_grid)
if rep['R3.tauStar'].get('found'):
    chs = MatChol(O.build_cov(ALLIDX, tau_star), ALLIDX)
    rec = analyse_full_sample(chs)
    meas['fullSample']['SPLIT-tauStar'] = pack(rec)
log('R3 done', rep['R3.tauStar'])

# R4, R5, R8
rep['R4.retained'] = t2facts
sizes = {}
def f32(a):
    return np.asarray(a, dtype=np.float32).tobytes()
for n in (100, 300, 800, N):
    idx = np.array([int(math.floor((m + 0.5) * N / n)) for m in range(n)]) if n < N else ALLIDX
    tri = C_F[np.ix_(idx, idx)][np.tril_indices(len(idx))]
    sizes[f'T1-n{n}'] = dict(bytes=int(4 * n * (n + 1) // 2), zlibBytes=len(zlib.compress(f32(tri), 9)))
for k in (10, 30, 100):
    V = EVEC[:, :k] * np.sqrt(EVAL[:k])
    payload = f32(V) + f32(T2[k]['r'])
    sizes[f'T2-k{k}'] = dict(bytes=int(4 * (k * N + N)), zlibBytes=len(zlib.compress(payload, 9)))
rep['R5.sizes'] = sizes
rep['R8.spectrum'] = dict(ranks=[1, 2, 5, 10, 30, 100, 300, N],
                          eigenvalues=[float(EVAL[r - 1]) for r in (1, 2, 5, 10, 30, 100, 300, N)],
                          condition=float(EVAL[0] / EVAL[-1]))
res['reported'] = rep
res['measures'] = meas
res['seconds'] = round(time.time() - t0, 1)

# the planes' coordinates, so a reader can recompute the Jaccard and the half-extents from the region strings
res['planes'] = dict(P1=dict(a=[float(x) for x in O.PLANES['P1']['a']], b=[float(x) for x in O.PLANES['P1']['b']]),
                     P2=dict(a=[float(x) for x in O.PLANES['P2']['a']], b=[float(x) for x in O.PLANES['P2']['b']]),
                     L1=dict(a=[float(x) for x in L1A]),
                     refusedP1=''.join('1' if r else '0' for r in NODES['P1']['refused']),
                     refusedP2=''.join('1' if r else '0' for r in NODES['P2']['refused']))
res['levels'] = dict(d1=O.D1, d2=O.D2)
res['subsets'] = dict(rule='rows i = floor((m + 0.5) N / n), m = 0..n-1, of the sample in the merged gate order', N=int(N))
out_path = os.path.join(OUTDIR, 'followup-oracle-results.json')
with open(out_path, 'w') as f:
    keys = list(res.keys())
    f.write('{\n')
    for n_, k in enumerate(keys):
        f.write(json.dumps(k) + ': ' + json.dumps(res[k], separators=(',', ':')) + (',\n' if n_ + 1 < len(keys) else '\n'))
    f.write('}\n')
log('wrote', out_path)
