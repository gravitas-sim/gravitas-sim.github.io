// =============================================================================
// The supernova likelihood follow-up record (Roadmap III, Prompt 256 follow-up)
// -----------------------------------------------------------------------------
// The legs the merged gate listed NOT RUN (the published flat-case value, and
// the release's full covariance against the subset-with-block and low-rank
// treatments), run with an independent Python oracle (on
// spike/supernova-likelihood-followup, never merged). This holds that the
// record is consistent with itself and with the contract committed first:
//
//   - the contract carries its amendment and its rows, and the results name it;
//   - every committed row has a result, and the statuses are the ones a second
//     implementation of the judge (written here, in JavaScript, from the
//     contract's words and the oracle's derived numbers) gives;
//   - the verdicts are the committed function's, both readings;
//   - failed-legs.json holds every failing row and nothing else;
//   - the merged gate's files are untouched (checksums pinned);
//   - the 33 MB covariance is nowhere in the repository: only derived numbers
//     and its sha256, and no fixture is large enough to hold it;
//   - the document and the register state what the files hold.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';

const DIR = 'tests/fixtures/supernova-likelihood';
const bytes = f => readFileSync(`${DIR}/${f}`);
const read = f => JSON.parse(bytes(f).toString('utf8'));
const sha = b => createHash('sha256').update(b).digest('hex');
const contract = read('followup-thresholds.json');
const run1 = read('followup-run1.json');
const run2 = read('followup-run2.json');
const oracle = read('followup-oracle-results.json');
const results = read('followup-results.json');
const failedFile = read('followup-failed-legs.json');
const published = read('authentic/published-flat.json');
const doc = readFileSync('SN_LIKELIHOOD_GATE.md', 'utf8');
const register = readFileSync('DECISION_REGISTER.md', 'utf8');

const OM_PUB = published.flat_lcdm_sne_alone.Omega_M;
const SIG_PUB = published.flat_lcdm_sne_alone.sigma;
const COV_SHA =
  'abf806d966485e64afdb359c87bffc0ecc00d05eff0a31ced66f247385df0fdc';
// the merged gate's files as merged (#552, 60e67a74): a changed byte is a moved bound
const OLD = {
  thresholds:
    '5382560db3189941e071e1817451d809dcd4177e2c6d6c5c636fe70174150fee',
  results: 'ec008c2d0df20643836d06536e554a276908dfbc17d0930521ef0732a648d123',
  failed: '087fc1126d68bf33f8326ae5b2be341b5ac96942fec49008fc3aedc162adcadb',
  oracle: 'c75637010e18f2f21408b0566e264629a4c54ff3f5739ae652b9a85589582c53',
};
const D2 = oracle.levels.d2;
const M = oracle.measures;
const FS = M.fullSample;
const PL = oracle.planes;

// ---- the second implementation of the judge ---------------------------------
const jaccard = (a, b) => {
  let inter = 0;
  let uni = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] === '1';
    const y = b[i] === '1';
    if (x && y) inter++;
    if (x || y) uni++;
  }
  return uni === 0 ? 1 : inter / uni;
};
const halfExtent = (kind, bits) => {
  const n2 = PL[kind].b.length;
  const A = [];
  const B = [];
  for (let i = 0; i < bits.length; i++)
    if (bits[i] === '1') {
      A.push(PL[kind].a[Math.floor(i / n2)]);
      B.push(PL[kind].b[i % n2]);
    }
  if (!A.length) return null;
  return [
    (Math.max(...A) - Math.min(...A)) / 2,
    (Math.max(...B) - Math.min(...B)) / 2,
  ];
};
const h = (rec, key = 'i68') => (rec.L1[key] ? rec.L1[key].h : null);
const pf = ok => (ok ? 'pass' : 'fail');

function judge() {
  const st = {};
  const cov = oracle.covariance;
  st['I1.file'] = pf(
    cov.sha256 === COV_SHA &&
      cov.bytes === 33284960 &&
      cov.firstLine === 1701 &&
      cov.values === 1701 * 1701 &&
      cov.rawRows === 1701
  );
  st['I2.symmetry'] = pf(cov.maxAsymmetry <= 1e-9);
  st['I3.positive'] = pf(
    cov.eigMinFull > 0 &&
      cov.eigMinSample > 0 &&
      cov.choSampleOk &&
      cov.choFullOk
  );
  st['I4a.rowmap'] = pf(cov.spearman >= 0.99);
  st['I4b.premise'] = pf(cov.maxDiagMinusErr <= 1e-5);
  st['I4c.cidPairs'] = pf(cov.cidPairs.aboveAll && cov.cidPairs.z >= 10);
  st['I4d.surveyShare'] = pf(
    cov.surveyShare.aboveAll && cov.surveyShare.z >= 10
  );
  st['I5.solvers'] = pf(
    M.solvers.maxRelDiff <= 1e-8 && M.solvers.choleskyResidual <= 1e-8
  );
  st['I6.regression'] = pf(
    M.regression.maxAbsDiff <= 1e-6 && M.regression.N === 1580
  );
  const F = FS.FULL;
  const S = FS.SPLIT;
  const D = FS.DIAG;
  const hF = h(F);
  const hS = h(S);
  const hD = h(D);
  st['E3a.fullVsPublished'] = pf(Math.abs(F.L1.best - OM_PUB) <= SIG_PUB);
  st['E3b.decidedVsPublished'] = pf(Math.abs(S.L1.best - OM_PUB) <= SIG_PUB);
  st['E3d.fullScale'] = pf(
    hF !== null && hF / SIG_PUB >= 2 / 3 && hF / SIG_PUB <= 1.5
  );
  st['E3e.decidedScale'] = pf(
    hS !== null && hS / SIG_PUB >= 2 / 3 && hS / SIG_PUB <= 1.5
  );
  for (const X of ['SPLIT', 'T2-k10', 'T2-k30', 'T2-k100']) {
    const rec = FS[X];
    st[`Q1.bestFit.${X}`] = pf(
      hD !== null && Math.abs(rec.L1.best - F.L1.best) <= 0.25 * hD
    );
    const hx = h(rec);
    const hx95 = h(rec, 'i95');
    const hF95 = h(F, 'i95');
    const band = r => r >= 0.8 && r <= 1.25;
    st[`Q2.width.${X}`] = pf(
      hx !== null &&
        hF !== null &&
        hx95 !== null &&
        hF95 !== null &&
        band(hx / hF) &&
        band(hx95 / hF95)
    );
    let ok3 = true;
    for (const kind of ['P1', 'P2']) {
      const s = D[kind].closed['68']
        ? halfExtent(kind, D[kind].regions['68'])
        : null;
      for (const ax of [0, 1]) {
        const diff = Math.abs(rec[kind].best[ax] - F[kind].best[ax]);
        ok3 = ok3 && s !== null && s[ax] > 0 && diff <= 0.25 * s[ax];
      }
    }
    st[`Q3.planeBestFit.${X}`] = pf(ok3);
    let ok4 = true;
    for (const kind of ['P1', 'P2'])
      for (const lv of ['68', '95'])
        ok4 = ok4 && jaccard(rec[kind].regions[lv], F[kind].regions[lv]) >= 0.7;
    st[`Q4.planeOverlap.${X}`] = pf(ok4);
    const okA =
      hx !== null &&
      hF !== null &&
      hD !== null &&
      Math.abs(Math.log(hx / hF)) <= Math.abs(Math.log(hD / hF));
    const jx = jaccard(rec.P1.regions['68'], F.P1.regions['68']);
    const jd = jaccard(D.P1.regions['68'], F.P1.regions['68']);
    st[`Q5.beatsDiag.${X}`] = pf(okA && jx >= jd);
  }
  for (const k of [10, 30, 100]) {
    const t = M.t2[`k${k}`];
    st[`V0.T2-k${k}`] = pf(
      t.minResidualDiag > 1e-12 && t.maxDiagDiff <= 1e-12 && t.cholOk
    );
  }
  for (const n of [100, 300, 800]) {
    const t = M.t1[`n${n}`];
    st[`U1.T1-n${n}`] = pf(t.u1 <= 4);
    st[`U2.T1-n${n}`] = pf(t.u2 <= D2[1]);
    st[`U3.T1-n${n}`] = pf(t.u3 <= D2[1]);
    const ht = t.L1.i68 ? t.L1.i68.h : null;
    st[`W1.T1-n${n}`] = pf(ht !== null && hF !== null && ht / hF <= 2);
  }
  return st;
}

function verdicts(st) {
  const all = ids => ids.every(i => st[i] === 'pass');
  const qids = X =>
    Object.keys(st).filter(i => /^Q\d/.test(i) && i.endsWith(`.${X}`));
  const splitQ = qids('SPLIT');
  const splitForm = all(splitQ)
    ? 'ADEQUATE'
    : st['Q1.bestFit.SPLIT'] === 'pass'
      ? 'DIAG-GRADE'
      : 'INADEQUATE';
  const alts = [];
  const sizes = oracle.reported['R5.sizes'];
  for (const k of [10, 30, 100])
    if (all([...qids(`T2-k${k}`), `V0.T2-k${k}`]))
      alts.push({ form: `T2-k${k}`, bytes: sizes[`T2-k${k}`].bytes });
  for (const n of [100, 300, 800])
    if (all(['U1', 'U2', 'U3', 'W1'].map(p => `${p}.T1-n${n}`)))
      alts.push({ form: `T1-n${n}`, bytes: sizes[`T1-n${n}`].bytes });
  alts.sort((a, b) => a.bytes - b.bytes);
  const ref = ['E3a.fullVsPublished', 'E3d.fullScale'];
  const idsI = [
    'I1.file',
    'I2.symmetry',
    'I3.positive',
    'I4a.rowmap',
    'I4b.premise',
    'I5.solvers',
    'I6.regression',
  ];
  const baseOk = all([...idsI.filter(i => i !== 'I4b.premise'), ...ref]);
  let letter = 'FC';
  if (all(idsI) && all(ref) && all(splitQ)) letter = 'FA';
  else if (baseOk && alts.length) letter = 'FB';
  const am1Ok = all([
    'I1.file',
    'I3.positive',
    'I4c.cidPairs',
    'I4d.surveyShare',
    'I5.solvers',
    'I6.regression',
    ...ref,
  ]);
  const am2Ok = all([
    'I1.file',
    'I3.positive',
    'I4c.cidPairs',
    'I5.solvers',
    'I6.regression',
    ...ref,
  ]);
  const am2 = am2Ok && alts.length ? "FB''" : "FC''";
  let am1 = "FC'";
  if (
    st['I4b.premise'] === 'pass' &&
    st['I2.symmetry'] === 'pass' &&
    am1Ok &&
    all(splitQ)
  )
    am1 = "FA'";
  else if (am1Ok && alts.length) am1 = "FB'";
  return { splitForm, letter, am1, am2, alts };
}

// ---- the tests ---------------------------------------------------------------
describe('the committed contract', () => {
  test('has AM1 (after run 1) and AM2 (after run 2, proposed), each moving no bound', () => {
    expect(contract.amendments.map(a => a.id)).toEqual(['AM1', 'AM2']);
    expect(contract.amendments[0].recorded).toMatch(/after run 1/);
    expect(contract.amendments[0].recorded).toMatch(/before any other leg/);
    expect(contract.amendments[1].recorded).toMatch(/after run 2/);
    expect(contract.amendments[1].recorded).toMatch(
      /before any downstream leg/
    );
    expect(contract.amendments[1].status).toMatch(/PROPOSED, not ratified/);
    for (const a of contract.amendments) expect(a.moves).toMatch(/no bound/);
  });

  test('has its rows, unique, each with a set (or none) and a bound', () => {
    const ids = contract.checks.map(c => c.id);
    expect(ids.length).toBe(58);
    expect(new Set(ids).size).toBe(58);
    for (const c of contract.checks) {
      expect(['I', 'E', 'Q', 'T', null]).toContain(c.set);
      expect(c.bound).toBeTruthy();
    }
    expect(contract.checks.filter(c => c.set === null).length).toBe(10);
  });

  test('states what had been seen before it was committed, and keeps the consumers rule', () => {
    expect(contract.committed).toMatch(/before the covariance file was opened/);
    expect(contract.seenBeforeCommitting.join(' ')).toMatch(/NOT blind/);
    expect(contract.decision.question).toMatch(/adequate stand-in/);
    expect(contract.verdict.partB).toMatch(
      /no lesson, panel, viewer or contour/
    );
    expect(contract.verdict.oldVerdict).toMatch(/verdict A/);
  });

  test('has the checksum the results record', () => {
    expect(results.thresholdsSha256).toBe(
      sha(bytes('followup-thresholds.json'))
    );
    expect(oracle.thresholdsSha256).toBe(results.thresholdsSha256);
    expect(run1.thresholdsSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(run1.thresholdsSha256).not.toBe(results.thresholdsSha256);
    expect(results.oracleResultsSha256).toBe(
      sha(bytes('followup-oracle-results.json'))
    );
  });
});

describe('the merged gate is untouched', () => {
  test('its contract, results, oracle numbers and verdict A are as merged', () => {
    const old = read('results.json');
    const oldFailed = read('failed-legs.json');
    expect(old.verdict).toBe('A');
    expect(oldFailed.legs).toEqual([]);
    expect(read('thresholds.json').amendments.map(a => a.id)).toEqual([
      'AM1',
      'AM2',
      'AM3',
    ]);
    expect(sha(bytes('thresholds.json'))).toBe(OLD.thresholds);
    expect(sha(bytes('results.json'))).toBe(OLD.results);
    expect(sha(bytes('failed-legs.json'))).toBe(OLD.failed);
    expect(sha(bytes('oracle-results.json'))).toBe(OLD.oracle);
  });
});

describe('runs 1 and 2 and the stream', () => {
  test('run 2 kept the mapping tests the stream repeats, and I4d failed its committed bound', () => {
    expect(run2.stopped).toMatch(/I4c or I4d/);
    expect(run2.covariance.cidPairs.z).toBeGreaterThanOrEqual(10);
    expect(run2.covariance.surveyShare.z).toBeLessThan(10);
    expect(run2.covariance.surveyShare.aboveAll).toBe(true);
    expect(oracle.covariance.cidPairs).toEqual(run2.covariance.cidPairs);
    expect(oracle.covariance.surveyShare).toEqual(run2.covariance.surveyShare);
    expect(oracle.mappingGate.downstreamRunUnder).toMatch(/AM2 \(proposed/);
    expect(results.mappingGate).toEqual(oracle.mappingGate);
  });

  test('run 1 kept its integrity numbers, which the later run repeats', () => {
    expect(run1.stopped).toMatch(/I4a/);
    expect(run1.covariance.sha256).toBe(COV_SHA);
    for (const k of [
      'maxAsymmetry',
      'spearman',
      'maxDiagMinusErr',
      'eigMinFull',
      'eigMinSample',
    ])
      expect(oracle.covariance[k]).toBe(run1.covariance[k]);
  });

  test('the rows are the committed legs and carry the statuses the second judge gives', () => {
    const ids = contract.checks.map(c => c.id);
    expect(results.rows.map(r => r.id)).toEqual(ids);
    const st = judge();
    for (const r of results.rows) {
      const c = contract.checks.find(x => x.id === r.id);
      expect(r.set).toBe(c.set);
      if (c.set) expect([r.id, r.status]).toEqual([r.id, st[r.id]]);
      else
        expect([r.id, r.status]).toEqual([
          r.id,
          r.id === 'X1.fitPackage' ? 'notrun' : 'reported',
        ]);
    }
  });

  test('X1 stays NOT RUN: no code was downloaded or run', () => {
    const x1 = results.rows.find(r => r.id === 'X1.fitPackage');
    expect(x1.status).toBe('notrun');
    expect(x1.measured).toMatch(/not authorised/);
  });

  test('the counts are the rows', () => {
    const counts = {};
    for (const r of results.rows)
      counts[r.status] = (counts[r.status] ?? 0) + 1;
    for (const k of ['pass', 'fail', 'reported', 'notrun'])
      expect(results.counts[k]).toBe(counts[k] ?? 0);
    expect(Object.values(results.counts).reduce((a, b) => a + b, 0)).toBe(
      results.rows.length
    );
  });

  test('both verdicts are the committed function applied to the rows', () => {
    const v = verdicts(judge());
    expect(results.verdict.letter).toBe(v.letter);
    expect(results.verdict.splitForm).toBe(v.splitForm);
    expect(results.verdict.underAM1.letter).toBe(v.am1);
    expect(results.verdict.underAM2.letter).toBe(v.am2);
    expect(results.verdict.underAM2.status).toMatch(/not ratified/);
    expect(results.verdict.passingAlternatives).toEqual(v.alts);
  });

  test('every failing row is in failed-legs.json and nothing else is', () => {
    const failing = results.rows
      .filter(r => r.status === 'fail')
      .map(r => r.id);
    expect(failedFile.legs.map(l => l.id)).toEqual(failing);
    expect(failedFile.count).toBe(failing.length);
    // the three legs run 1 showed failing are on the list, as committed
    for (const id of ['I2.symmetry', 'I4a.rowmap', 'I4b.premise'])
      expect(failing).toContain(id);
  });

  test('the published value was read from the file, and the file is the one the results name', () => {
    expect(results.publishedSha256).toBe(
      sha(bytes('authentic/published-flat.json'))
    );
    expect(oracle.published.Omega_M).toBe(OM_PUB);
    expect(oracle.published.sigma).toBe(SIG_PUB);
    expect(oracle.published.sha256).toBe(results.publishedSha256);
  });
});

describe('the covariance is not in the repository', () => {
  test('only its sha256 and derived numbers are, and no fixture could hold it', () => {
    expect(results.covarianceSha256).toBe(COV_SHA);
    const walk = d =>
      readdirSync(d).flatMap(f => {
        const p = `${d}/${f}`;
        return statSync(p).isDirectory() ? walk(p) : [p];
      });
    for (const p of walk(DIR)) expect(statSync(p).size).toBeLessThan(1500000);
    const text = JSON.stringify([oracle, results, run1]);
    expect(text).not.toMatch(/\/Users\//);
    for (const bad of ['matrix', 'covarianceRows', 'entries'])
      expect(Object.keys(oracle)).not.toContain(bad);
    // derived numbers only: 1,701 x 1,701 values would be 2.9 million numbers
    expect(text.length).toBeLessThan(1000000);
  });

  test('the terms as read are recorded with the citation duty', () => {
    expect(contract.data.covariance).toMatch(
      /Brout et al. 2022 and Scolnic et al. 2022/
    );
    expect(contract.data.covariance).toMatch(/never committed/);
    expect(doc).toMatch(/Brout et al\. 2022/);
    expect(doc).toMatch(/Scolnic et al\. 2022/);
  });
});

describe('the document and the register', () => {
  test('state the follow-up, both verdicts, what Part B may now do, and the questions', () => {
    expect(doc).toMatch(/## 10\. Follow-up/);
    expect(doc).toMatch(/what the verdict permits/i);
    expect(doc).toMatch(/consumers rule/);
    expect(doc).toMatch(/Part B is not begun/);
    expect(doc).toMatch(/spike\/supernova-likelihood-followup/);
    expect(doc).toContain(
      `Verdict by the committed function: ${results.verdict.letter}`
    );
    expect(doc).toContain(
      `the reading under AM1: ${results.verdict.underAM1.letter}`
    );
    const c = results.counts;
    expect(doc).toContain(
      `${results.rows.length} rows: **${c.pass} pass, ${c.fail} fail, ${c.reported} reported, ${c.notrun} not run**`
    );
  });

  test('the register has the follow-up rows, each DELEGATED or RATIFIED, with a source and sha', () => {
    const rows = register
      .split('\n')
      .filter(l => /^\| D-R10-256-(0[6-9]|1\d) /.test(l));
    expect(rows.length).toBeGreaterThanOrEqual(3);
    for (const line of rows) {
      expect(line).toMatch(/\*\*(DELEGATED|RATIFIED)\*\*/);
      expect(line).toMatch(/\(([0-9a-f]{8})\)/);
    }
  });
});
