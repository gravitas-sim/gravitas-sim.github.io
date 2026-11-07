#!/usr/bin/env python3
"""Judge the follow-up legs: reads the contract (followup-thresholds.json) and the oracle's derived numbers and
writes followup-results.json and followup-failed-legs.json. Every bound is the contract's, restated here as code
and checked by tests/supernovaLikelihoodFollowup.test.js, which judges the same rows again in JavaScript.

  python3 followup_judge.py CONTRACT.json ORACLE.json PUBLISHED.json OUTDIR
"""
import hashlib
import json
import math
import sys
import os

CONTRACT, ORACLE, PUBFILE, OUTDIR = sys.argv[1:5]
cb = open(CONTRACT, 'rb').read()
CT = json.loads(cb)
ob = open(ORACLE, 'rb').read()
OR = json.loads(ob)
PUB = json.load(open(PUBFILE))
OM_PUB = float(PUB['flat_lcdm_sne_alone']['Omega_M'])
SIG_PUB = float(PUB['flat_lcdm_sne_alone']['sigma'])
D2 = OR['levels']['d2']

if 'stopped' in OR:
    raise SystemExit('oracle stopped: ' + OR['stopped'])

M = OR['measures']
FS = M['fullSample']
PL = OR['planes']
rows = []


def row(id_, status, measured, bound):
    spec = next(c for c in CT['checks'] if c['id'] == id_)
    rows.append(dict(id=id_, set=spec['set'], status=status, measured=measured, bound=bound))


def pf(ok):
    return 'pass' if ok else 'fail'


def jaccard(a, b):
    A = {i for i, c in enumerate(a) if c == '1'}
    B = {i for i, c in enumerate(b) if c == '1'}
    return 1.0 if not A and not B else len(A & B) / len(A | B)


def half_extent(kind, bits):
    pl = PL[kind]
    n2 = len(pl['b'])
    ix = [i for i, c in enumerate(bits) if c == '1']
    if not ix:
        return None
    a = [pl['a'][i // n2] for i in ix]
    b = [pl['b'][i % n2] for i in ix]
    sa, sb = (max(a) - min(a)) / 2, (max(b) - min(b)) / 2
    return (sa, sb)


def h(rec, key='i68'):
    v = rec['L1'][key]
    return None if v is None else v['h']


# ---- integrity
cov = OR['covariance']
EXPECT_SHA = 'abf806d966485e64afdb359c87bffc0ecc00d05eff0a31ced66f247385df0fdc'
ok1 = (cov['sha256'] == EXPECT_SHA and cov['bytes'] == 33284960 and cov['firstLine'] == 1701
       and cov['values'] == 1701 * 1701 and cov['rawRows'] == 1701)
row('I1.file', pf(ok1), dict(sha256=cov['sha256'], bytes=cov['bytes'], firstLine=cov['firstLine'], values=cov['values']), 'exact')
row('I2.symmetry', pf(cov['maxAsymmetry'] <= 1e-9), cov['maxAsymmetry'], 'at most 1e-9')
row('I3.positive', pf(cov['eigMinFull'] > 0 and cov['eigMinSample'] > 0 and cov['choSampleOk'] and cov['choFullOk']),
    dict(eigMinFull=cov['eigMinFull'], eigMinSample=cov['eigMinSample'], conditionSample=cov['conditionSample']), 'above 0, Cholesky succeeds')
row('I4a.rowmap', pf(cov['spearman'] >= 0.99), cov['spearman'], 'at least 0.99')
row('I4b.premise', pf(cov['maxDiagMinusErr'] <= 1e-5),
    dict(maxAbsDiff=cov['maxDiagMinusErr'], ratioMin=cov['minRatioDiagOverErr'], ratioMedian=cov['medianRatioDiagOverErr'], ratioMax=cov['maxRatioDiagOverErr']),
    'at most 1e-5 mag')
c_ = cov['cidPairs']
row('I4c.cidPairs', pf(c_['aboveAll'] and c_['z'] >= 10), c_, 'above all 2,000 permutations and z at least 10')
c_ = cov['surveyShare']
row('I4d.surveyShare', pf(c_['aboveAll'] and c_['z'] >= 10), c_, 'above all 2,000 permutations and z at least 10')
s = M['solvers']
row('I5.solvers', pf(s['maxRelDiff'] <= 1e-8 and s['choleskyResidual'] <= 1e-8), s, '1e-8 and 1e-8')
g = M['regression']
row('I6.regression', pf(g['maxAbsDiff'] <= 1e-6 and g['N'] == 1580), g, 'within 1e-6; N = 1,580')

# ---- published
F = FS['FULL']
Sp = FS['SPLIT']
D = FS['DIAG']
hF, hS, hD = h(F), h(Sp), h(D)
row('E3a.fullVsPublished', pf(abs(F['L1']['best'] - OM_PUB) <= SIG_PUB),
    dict(OmFull=F['L1']['best'], OmPublished=OM_PUB, sigmaPublished=SIG_PUB, difference=F['L1']['best'] - OM_PUB,
         inSigmas=(F['L1']['best'] - OM_PUB) / SIG_PUB), 'at most 1.0 sigma_pub')
row('E3b.decidedVsPublished', pf(abs(Sp['L1']['best'] - OM_PUB) <= SIG_PUB),
    dict(OmSplit=Sp['L1']['best'], difference=Sp['L1']['best'] - OM_PUB, inSigmas=(Sp['L1']['best'] - OM_PUB) / SIG_PUB), 'at most 1.0 sigma_pub')
ok = hF is not None and (2 / 3) <= hF / SIG_PUB <= 1.5
row('E3d.fullScale', pf(ok), dict(h68Full=hF, ratio=None if hF is None else hF / SIG_PUB), '[2/3, 3/2]')
ok = hS is not None and (2 / 3) <= hS / SIG_PUB <= 1.5
row('E3e.decidedScale', pf(ok), dict(h68Split=hS, ratio=None if hS is None else hS / SIG_PUB), '[2/3, 3/2]')

# ---- adequacy


def q_rows(X):
    rec = FS[X]
    u = hD
    # Q1
    d1 = abs(rec['L1']['best'] - F['L1']['best'])
    row(f'Q1.bestFit.{X}', pf(u is not None and d1 <= 0.25 * u), dict(difference=d1, u=u, inUnits=None if not u else d1 / u), 'at most 0.25 u')
    # Q2
    hx, hx95, hF95 = h(rec), h(rec, 'i95'), h(F, 'i95')
    r68 = None if (hx is None or hF is None) else hx / hF
    r95 = None if (hx95 is None or hF95 is None) else hx95 / hF95
    ok = r68 is not None and r95 is not None and 0.8 <= r68 <= 1.25 and 0.8 <= r95 <= 1.25
    row(f'Q2.width.{X}', pf(ok), dict(ratio68=r68, ratio95=r95), 'each in [0.80, 1.25]')
    # Q3
    meas3, ok3 = {}, True
    for kind in ('P1', 'P2'):
        s_ = half_extent(kind, D[kind]['regions']['68']) if D[kind]['closed']['68'] else None
        for ax in (0, 1):
            diff = abs(rec[kind]['best'][ax] - F[kind]['best'][ax])
            okx = s_ is not None and s_[ax] > 0 and diff <= 0.25 * s_[ax]
            meas3[f'{kind}.{"ab"[ax]}'] = dict(difference=diff, s=None if s_ is None else s_[ax])
            ok3 = ok3 and okx
    row(f'Q3.planeBestFit.{X}', pf(ok3), meas3, 'at most 0.25 s on each of four')
    # Q4
    meas4, ok4 = {}, True
    for kind in ('P1', 'P2'):
        for lv in ('68', '95'):
            j = jaccard(rec[kind]['regions'][lv], F[kind]['regions'][lv])
            meas4[f'{kind}.{lv}'] = j
            ok4 = ok4 and j >= 0.70
    row(f'Q4.planeOverlap.{X}', pf(ok4), meas4, 'each at least 0.70')
    # Q5
    ok5a = hx is not None and hF is not None and hD is not None and abs(math.log(hx / hF)) <= abs(math.log(hD / hF))
    jx, jd = jaccard(rec['P1']['regions']['68'], F['P1']['regions']['68']), jaccard(D['P1']['regions']['68'], F['P1']['regions']['68'])
    row(f'Q5.beatsDiag.{X}', pf(ok5a and jx >= jd),
        dict(logWidthX=None if not (hx and hF) else abs(math.log(hx / hF)), logWidthDiag=None if not (hD and hF) else abs(math.log(hD / hF)),
             jaccardP1_68=jx, jaccardP1_68Diag=jd), 'both')


for X in ('SPLIT', 'T2-k10', 'T2-k30', 'T2-k100'):
    q_rows(X)
for k in (10, 30, 100):
    t = M['t2'][f'k{k}']
    row(f'V0.T2-k{k}', pf(t['minResidualDiag'] > 1e-12 and t['maxDiagDiff'] <= 1e-12 and t['cholOk']), t, 'as stated')

# ---- subsets
for n in (100, 300, 800):
    t = M['t1'][f'n{n}']
    row(f'U1.T1-n{n}', pf(t['u1'] <= 4.0), t['u1'], 'at most 4')
    row(f'U2.T1-n{n}', pf(t['u2'] <= D2[1]), t['u2'], f'at most {D2[1]}')
    row(f'U3.T1-n{n}', pf(t['u3'] <= D2[1]), t['u3'], f'at most {D2[1]}')
    ht = None if t['L1']['i68'] is None else t['L1']['i68']['h']
    ratio = None if (ht is None or hF is None) else ht / hF
    row(f'W1.T1-n{n}', pf(ratio is not None and ratio <= 2.0),
        dict(ratio=ratio, h68=ht, expectedBySqrtRule=math.sqrt(1580 / n)), 'at most 2.0')

# ---- reported and not run
REP = OR['reported']
for c in CT['checks']:
    if c['set'] is None and c['id'] != 'X1.fitPackage':
        row(c['id'], 'reported', REP.get(c['id']) if c['id'] in REP else dict(R9=OR['diagonalReport'],
            R6=dict(DIAG=D['L1']), R7={k: v['forms'] for k, v in M['t1'].items()}).get(c['id'][:2]), 'REPORTED, no bound')
row('X1.fitPackage', 'notrun', 'not fetched; downloading or running code is not authorised', 'NOT RUN')

# ---- verdict
by = {r['id']: r for r in rows}
passing = lambda ids: all(by[i]['status'] == 'pass' for i in ids)
ids_I = ['I1.file', 'I2.symmetry', 'I3.positive', 'I4a.rowmap', 'I4b.premise', 'I5.solvers', 'I6.regression']
qids = lambda X: [r['id'] for r in rows if r['id'].startswith('Q') and r['id'].endswith('.' + X)]
split_q = qids('SPLIT')
q1_split = by['Q1.bestFit.SPLIT']['status'] == 'pass'
if passing(split_q):
    split_form = 'ADEQUATE'
elif q1_split:
    split_form = 'DIAG-GRADE'
else:
    split_form = 'INADEQUATE'
alts = []
for k in (10, 30, 100):
    X = f'T2-k{k}'
    if passing(qids(X) + [f'V0.T2-k{k}']):
        alts.append(dict(form=X, bytes=OR['reported']['R5.sizes'][X]['bytes']))
for n in (100, 300, 800):
    if passing([f'{p}.T1-n{n}' for p in ('U1', 'U2', 'U3', 'W1')]):
        alts.append(dict(form=f'T1-n{n}', bytes=OR['reported']['R5.sizes'][f'T1-n{n}']['bytes']))
alts.sort(key=lambda a: a['bytes'])


def letter_for(ids_base):
    FA = passing(ids_I) and passing(['E3a.fullVsPublished', 'E3d.fullScale']) and passing(split_q)
    base_ok = passing(ids_base) and passing(['E3a.fullVsPublished', 'E3d.fullScale'])
    if FA:
        return 'FA', base_ok
    if base_ok and alts:
        return 'FB', base_ok
    return 'FC', base_ok


# (1) the committed function, as committed: I1 to I4a, I5, I6 all required for FB (I4b too for FA)
committed_base = [i for i in ids_I if i != 'I4b.premise']
letter, base_ok = letter_for(committed_base)
# (2) the reading under AM1: I4a replaced by I4c and I4d, I2 not required; FA' is impossible while I4b fails
am1_base = ['I1.file', 'I3.positive', 'I4c.cidPairs', 'I4d.surveyShare', 'I5.solvers', 'I6.regression']
am1_ok = passing(am1_base) and passing(['E3a.fullVsPublished', 'E3d.fullScale'])
if by['I4b.premise']['status'] == 'pass' and am1_ok and passing(split_q) and passing(['I2.symmetry']):
    letter_am1 = "FA'"
elif am1_ok and alts:
    letter_am1 = "FB'"
else:
    letter_am1 = "FC'"
verdict = dict(letter=letter, splitForm=split_form, referenceConfirmed=bool(base_ok),
               passingAlternatives=alts, recommendedAlternative=(alts[0] if letter == 'FB' else None),
               underAM1=dict(letter=letter_am1, referenceConfirmed=bool(am1_ok),
                             recommendedAlternative=(alts[0] if letter_am1 == "FB'" else None)))

counts = {k: sum(1 for r in rows if r['status'] == k) for k in ('pass', 'fail', 'reported', 'notrun')}
out = dict(format='gravitas.supernova-likelihood-followup-results/1',
           thresholdsSha256=hashlib.sha256(cb).hexdigest(), oracleResultsSha256=hashlib.sha256(ob).hexdigest(),
           publishedSha256=hashlib.sha256(open(PUBFILE, 'rb').read()).hexdigest(),
           covarianceSha256=cov['sha256'], rows=rows, counts=counts, verdict=verdict)
with open(os.path.join(OUTDIR, 'followup-results.json'), 'w') as f:
    json.dump(out, f, indent=1)
    f.write('\n')
failed = [dict(id=r['id'], measured=r['measured'], bound=r['bound']) for r in rows if r['status'] == 'fail']
with open(os.path.join(OUTDIR, 'followup-failed-legs.json'), 'w') as f:
    json.dump(dict(format='gravitas.supernova-likelihood-followup-failed/1', count=len(failed), legs=failed), f, indent=1)
    f.write('\n')
print(counts, verdict['letter'], verdict['splitForm'], verdict['underAM1']['letter'])
