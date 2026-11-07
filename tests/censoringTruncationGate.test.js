// =============================================================================
// The censoring and truncation gate record (Roadmap III, Prompt 262 Part A)
// -----------------------------------------------------------------------------
// CENSORING_TRUNCATION_GATE.md and tests/fixtures/censoring/ are a record, not a kernel: the
// prototype that produced results.json is on spike/censoring-truncation-gate and is never
// merged. This holds that the record is consistent with itself and with the contract committed
// first:
//
//   - thresholds.json carries its recorded amendments and its committed legs; the oracle's
//     output and results.json name the thresholds file they were run against;
//   - every row is a committed leg, the status of every pass/fail row is recomputed here from
//     its measured numbers and its committed bound, and the verdict is the one the committed
//     function gives;
//   - failed-legs.json holds every failing row and nothing else;
//   - the legs that need a source nobody supplied are NOT RUN and name a request that exists;
//   - no fixture holds a home path, and the document and the register state the counts and the
//     verdict the files hold.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const DIR = 'tests/fixtures/censoring';
const bytes = f => readFileSync(`${DIR}/${f}`);
const read = f => JSON.parse(bytes(f));
const sha = b => createHash('sha256').update(b).digest('hex');
const thresholds = read('thresholds.json');
const oracle = read('oracle-results.json');
const results = read('results.json');
const failedFile = read('failed-legs.json');
const doc = readFileSync('CENSORING_TRUNCATION_GATE.md', 'utf8');
const register = readFileSync('DECISION_REGISTER.md', 'utf8');
const TOL = thresholds.tolerance;
const row = id => results.rows.find(r => r.id === id);
const close = (a, b, tol = TOL.closedForm) =>
  Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
const range = (v, lo, hi) => v >= lo && v <= hi;

// The committed bound of every pass/fail row, applied to its measured numbers.
const RULE = {
  'I1.inputs': x => x.thresholdsSha256 === x.oracleRecorded,
  'O0.kmInternal': x => x.maxAbs <= TOL.oracleMass,
  'O1.cmInternal': x => x.maxAbs <= TOL.emAlgorithm,
  'O2.hand': x => x.agrees === true,
  'O3.logrankInternal': x => x.maxZRel <= TOL.logrank,
  'A1.kmUncensored': x =>
    x.status === 'complete' && close(x.mean, 3.7) && close(x.variance, 1.632),
  'A2.kmHand': x => {
    const e = thresholds.handExamples.A2.expected;
    return (
      x.status === 'complete' &&
      close(x.mean, e.mean) &&
      close(x.variance, e.variance) &&
      Object.keys(e.masses).every(k => close(x.masses[k], e.masses[k]))
    );
  },
  'A3.kmBounded': x => {
    const e = thresholds.handExamples.A3.expected;
    return (
      x.status === 'bounded' &&
      close(x.meanLow, e.meanLow) &&
      close(x.meanHigh, e.meanHigh) &&
      close(x.variance, e.variance) &&
      close(x.tailMass, e.tailMass) &&
      x.noFloor === 'unbounded-tail'
    );
  },
  'A4.cmHand': x => {
    const e = thresholds.handExamples.A4.expected;
    return (
      Object.keys(e.associatedSets).every(
        k => x.sets[k] === e.associatedSets[k]
      ) &&
      Object.keys(e.masses).every(k => close(x.masses[k], e.masses[k])) &&
      close(x.mean, e.mean) &&
      close(x.variance, e.variance)
    );
  },
  'A5.cmNoTruncation': x =>
    x.masses.length === 5 &&
    x.masses.every(v => close(v, 0.2)) &&
    close(x.mean, 3.7) &&
    close(x.variance, 1.632),
  'A6.vmaxHand': x => {
    const e = thresholds.handExamples.A6.expected;
    return (
      close(x.meanVOverVmax, e.meanVOverVmax) &&
      close(x.z, e.z) &&
      close(x.sumInverseVmax, e.sumInverseVmax) &&
      close(x.variance, e.variance)
    );
  },
  'A7.vmaxEffective': x => close(x.veff, 4.5) && close(x.inverseVeff, 1 / 4.5),
  'R1.kmReference': x =>
    x.notes.length === 0 &&
    x.worstMassAbs <= TOL.oracleMass &&
    x.worstRelative <= TOL.oracle,
  'R2.cmReference': x =>
    x.bad.length === 0 &&
    x.setsExact &&
    x.worstMassAbs <= TOL.oracleMass &&
    x.worstRelative <= TOL.oracle,
  'R3.logrankReference': x =>
    x.bad.length === 0 &&
    x.worstZRel <= TOL.logrank &&
    x.worstPRel <= TOL.logrank,
  'R4.veffReference': x => x.worstRelative <= TOL.quadrature,
  'L1.kmLarge': x => x.supDistance <= 0.04 && Math.abs(x.mean - 2) <= 0.06,
  'L2.cmLarge': x =>
    x.supDistance <= 0.05 && Math.abs(x.mean - x.truth) <= 0.05,
  'C1a.kmCoverageK1': x => range(x.coverage, 0.92, 0.98),
  'C1b.kmCoverageK2': x => range(x.coverage, 0.92, 0.98),
  'C1c.kmCoverageK3': x => range(x.coverage, 0.92, 0.98),
  'C1o.kmCoverageOracle': x =>
    [x.K1, x.K2, x.K3].every(v => range(v, 0.92, 0.98)),
  'C2a.cmCoverageT1': x => range(x.coverage, 0.92, 0.98),
  'C2b.cmCoverageT2': x => range(x.coverage, 0.92, 0.98),
  'C2o.cmCoverageOracle': x => [x.T1, x.T2].every(v => range(v, 0.92, 0.98)),
  'D1.dependenceFlag': x => x.fraction >= 0.9 && x.refused < 1e6,
  'D2.falseAlarm': x => x.fraction <= 0.02,
  'D3.kmRefusals': x => x.cases.length === 7 && x.cases.every(c => c.ok),
  'D4.cmRefusals': x => x.cases.length === 7 && x.cases.every(c => c.ok),
  'D6.vmaxRefusals': x => x.cases.length === 6 && x.cases.every(c => c.ok),
  'V1.vmaxNull': x => range(x.rejectionRate, 0.035, 0.065),
  'V1n.vmaxEvolution': x => x.rejectionRate >= 0.95,
  'C4.densityCoverage': x => range(x.coverage, 0.92, 0.98),
  'C4b.rampCoverage': x => range(x.coverage, 0.92, 0.98),
};

describe('the contract and the files that answer it', () => {
  test('the thresholds file records its amendments and was committed with no result in it', () => {
    expect(thresholds.amendments.map(a => a.id)).toEqual([
      'AM1',
      'AM2',
      'AM3',
      'AM4',
    ]);
    for (const a of thresholds.amendments)
      expect(a.recordedBefore).toBe('the first validator run');
    expect(thresholds.checks).toHaveLength(41);
    expect(new Set(thresholds.checks.map(c => c.id)).size).toBe(41);
  });

  test('the oracle and the stream ran against this thresholds file', () => {
    const mine = sha(bytes('thresholds.json'));
    expect(oracle.thresholdsSha256).toBe(mine);
    expect(results.environment.thresholdsSha256).toBe(mine);
    expect(results.environment.oracleSha256).toBe(
      sha(bytes('oracle-results.json'))
    );
    expect(results.environment.runs).toMatch(/two complete runs agree/);
  });

  test('every row is a committed leg, once, with the committed group and estimator', () => {
    expect(results.rows.map(r => r.id).sort()).toEqual(
      thresholds.checks.map(c => c.id).sort()
    );
    for (const c of thresholds.checks) {
      const r = row(c.id);
      expect(r.group).toBe(c.group);
      expect(r.estimator).toBe(c.estimator);
      expect(r.bound).toBe(c.bound);
    }
  });

  test('every pass/fail status is recomputed from the measured numbers and the committed bound', () => {
    for (const r of results.rows) {
      if (r.status === 'not-run' || r.status === 'reported') continue;
      expect(RULE[r.id]).toBeDefined();
      expect([r.id, r.status]).toEqual([
        r.id,
        RULE[r.id](r.measured) ? 'pass' : 'fail',
      ]);
    }
  });

  test('reported and not-run rows are exactly the committed ones, and every request exists', () => {
    for (const c of thresholds.checks) {
      const s = row(c.id).status;
      if (c.group === 'reported') expect(s).toBe('reported');
      else if (c.expected === 'not-run') expect(s).toBe('not-run');
      else expect(['pass', 'fail']).toContain(s);
      if (c.expected === 'not-run')
        expect(thresholds.externalRequests.map(q => q.id)).toContain(c.request);
    }
    for (const q of thresholds.externalRequests)
      expect(doc).toContain(`**${q.id}`);
  });

  test('the counts, the failing legs and the verdict are the committed function applied to the rows', () => {
    const counts = {};
    for (const r of results.rows)
      counts[r.status] = (counts[r.status] || 0) + 1;
    expect(results.counts).toEqual(counts);
    expect(counts).toEqual({ pass: 33, fail: 1, reported: 3, 'not-run': 4 });
    const failing = results.rows.filter(r => r.status === 'fail');
    expect(failedFile.legs.map(l => l.id)).toEqual(failing.map(l => l.id));
    expect(failing.map(l => l.id)).toEqual(['C2o.cmCoverageOracle']);
    const JUDGED = new Set([
      'integrity',
      'oracle',
      'analytic',
      'reference',
      'accuracy',
      'coverage',
      'misspecified',
      'refusals',
    ]);
    const passAll = est =>
      results.rows
        .filter(
          r =>
            (r.estimator === est || r.estimator === 'all') &&
            JUDGED.has(r.group)
        )
        .every(r => r.status === 'pass');
    const km = passAll('km');
    const cm = passAll('cm');
    const vmax = results.rows
      .filter(r => r.estimator === 'vmax' && JUDGED.has(r.group))
      .every(r => r.status === 'pass');
    expect(results.verdict).toEqual({
      km,
      cm,
      vmaxAdmitted: vmax,
      letter: km && cm ? 'A' : km || cm ? 'B' : 'C',
      slice: km && cm ? null : km ? 'B-KM' : 'B-CM',
    });
    expect(results.verdict.letter).toBe('B');
    expect(results.verdict.slice).toBe('B-KM');
    expect(results.verdict.vmaxAdmitted).toBe(true);
  });

  test('the oracle agrees with its hand examples and the reference samples are the committed ones', () => {
    expect(oracle.hand.agrees).toBe(true);
    expect(oracle.censored.map(s => s.id)).toEqual(
      thresholds.referenceSamples.censored.map(s => s.id)
    );
    expect(oracle.truncated.map(s => s.id)).toEqual(
      thresholds.referenceSamples.truncated.map(s => s.id)
    );
    expect(oracle.veff).toHaveLength(20);
    const statuses = new Set(oracle.censored.map(s => s.km.status));
    expect([...statuses].sort()).toEqual(['bounded', 'complete']);
  });

  test('the hand examples are consistent with the formulas, independently of the files', () => {
    // The identity behind A1 and A5: with no censoring the product-limit mean is the arithmetic
    // mean and the variance sum is the plug-in variance of the mean.
    const xs = [3, 1, 4, 1.5, 9];
    const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
    const plugin = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length ** 2;
    expect(mean).toBeCloseTo(3.7, 12);
    expect(plugin).toBeCloseTo(1.632, 12);
    expect(thresholds.handExamples.A4.expected.variance).toBeCloseTo(
      505 / 648,
      12
    );
    expect(thresholds.handExamples.A3.expected.variance).toBeCloseTo(
      107 / 64,
      12
    );
  });

  test('no fixture holds a home path, and nothing was typed from memory', () => {
    for (const f of [
      'thresholds.json',
      'oracle-results.json',
      'results.json',
      'failed-legs.json',
    ])
      expect(bytes(f).toString('utf8')).not.toMatch(
        /\/Users\/|\/home\/|C:\\\\Users/
      );
    expect(thresholds.committed).toMatch(/typed from memory/);
  });
});

describe('the document and the register state what the files hold', () => {
  test('the document names the verdict, the counts, the failing leg and the unmoved bound', () => {
    expect(doc).toContain(
      '**Verdict by the committed function: B, slice B-KM**'
    );
    expect(doc).toContain(
      '41 rows: **33 pass, 1 fail, 3 reported, 4 not run.**'
    );
    expect(doc).toContain('C2o.cmCoverageOracle');
    expect(doc).toContain('Part B is not begun');
    expect(doc).toContain('consumers rule');
    expect(doc).not.toMatch(/\/Users\//);
  });

  test('the register holds the five rows of this gate', () => {
    for (const n of ['01', '02', '03', '04', '05'])
      expect(register).toContain(`| D-R10-262-${n} |`);
    const rows = register.split('\n').filter(l => l.startsWith('| D-R10-262-'));
    expect(rows).toHaveLength(5);
    for (const r of rows) expect(r).toContain('**DELEGATED**');
    expect(rows[1]).toContain('B-KM');
  });
});
