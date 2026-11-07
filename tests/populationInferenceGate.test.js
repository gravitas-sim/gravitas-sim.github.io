// =============================================================================
// The population inference gate record (Roadmap III, Prompt 264 Part A)
// -----------------------------------------------------------------------------
// POPULATION_INFERENCE_GATE.md and tests/fixtures/population/ are a record, not a kernel: the
// prototype that produced results.json is on spike/population-inference-gate and is never merged.
// This holds that the record is consistent with itself and with the contract committed first:
//
//   - thresholds.json carries its recorded amendments and its committed legs; the oracle's output
//     and results.json name the thresholds file they were run against;
//   - every row is a committed leg, the status of every pass/fail row is recomputed here from its
//     measured numbers and its committed bound, and the verdict is the one the committed function
//     gives;
//   - failed-legs.json holds every failing row and nothing else;
//   - the legs that need a source nobody supplied are NOT RUN and name a request that exists;
//   - the first run, which the validator's correction (AM3) describes, is kept and differs from the
//     pinned run in the one row the amendment names;
//   - no fixture holds a home path, and the document and the register state the counts and the
//     verdict the files hold.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const DIR = 'tests/fixtures/population';
const bytes = f => readFileSync(`${DIR}/${f}`);
const read = f => JSON.parse(bytes(f));
const sha = b => createHash('sha256').update(b).digest('hex');
const thresholds = read('thresholds.json');
const oracle = read('oracle-results.json');
const results = read('results.json');
const first = read('first-run-results.json');
const failedFile = read('failed-legs.json');
const diag = read('diagnostic-d8.json');
const doc = readFileSync('POPULATION_INFERENCE_GATE.md', 'utf8');
const register = readFileSync('DECISION_REGISTER.md', 'utf8');
const TOL = thresholds.tolerance;
const row = id => results.rows.find(r => r.id === id);
const close = (a, b, tol = TOL.closedForm) =>
  Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
const range = (v, lo, hi) => v >= lo && v <= hi;
const allSeen = (seen, extra) =>
  Object.entries(seen).every(([code, list]) => list.every(c => c === code)) &&
  extra.every(s => s === 'ok');

// The committed bound of every pass/fail row, applied to its measured numbers.
const RULE = {
  'I1.inputs': x => x.thresholdsSha256 === x.oracleRecorded,
  'O1.twoAlgorithms': x => x.maxAbs <= TOL.oracleLogLik,
  'O2.hand': x =>
    x.totalErr <= 1e-9 && x.logLikErr <= 1e-12 && x.gstarRel <= 1e-9,
  'O3.garwood': x => x.maxRel <= 1e-12,
  'O4.profileEnds': x => x.maxAbs <= 1e-6,
  'A1.handCounts': x =>
    close(x.rates[0], 0.3) &&
    close(x.rates[2], 0.4) &&
    close(x.limit, -Math.log(0.05) / 8) &&
    x.statuses.join() === 'ok,upper-limit,ok',
  'A2.handNonIdentified': x =>
    x.totalErr <= 1e-9 &&
    x.logLikErr <= 1e-12 &&
    x.gstarRel <= 1e-9 &&
    x.lo === 0,
  'A3.exposureConstant': x => x.maxRel <= TOL.closedForm,
  'A4.exposureLogistic': x => x.maxRel <= TOL.oracleExposure,
  'A5.exposureVolume': x => x.rel <= TOL.closedForm,
  'Q1.equivalenceCounts': x =>
    x.mismatches === 0 && x.maxRel <= TOL.equivalence,
  'Q2.equivalenceObjects': x =>
    x.mismatches === 0 && x.maxRel <= TOL.equivalence,
  'Q3.continuity': x => x.maxRateRel <= 1e-6 && x.maxEndRel <= TOL.continuity,
  'R1.countsReference': x =>
    x.statuses && x.maxRate <= 1e-12 && x.maxEnd <= 1e-12,
  'R2.logLik': x => x.maxAbs <= TOL.oracleLogLik,
  'R3.mu': x => x.maxRel <= TOL.oracleMu,
  'R4.endpoints': x =>
    x.maxRel <= TOL.oracleEndpoint &&
    x.maxAbsWhereOracleZero <= 1e-6 &&
    x.statusMismatches === 0,
  'R5.zeroAndFloor': x =>
    x.statusesIdentical && x.maxLimitRel <= TOL.oracleEndpoint,
  'R6.resolutionFlag': x => x.maxRel <= 1e-9 && x.flagsIdentical,
  'V1.recoveryU1': x => x.maxErr <= 0.05,
  'V2.recoveryM': x => x.maxErr <= 0.08,
  'C1.coverageU1': x => range(x.mean, 0.93, 0.97),
  'C1b.coverageU1PerBin': x => x.min >= 0.91,
  'C2.coverageU1sigma': x => range(x.mean, 0.65, 0.72),
  'C3.coverageU3': x => range(x.mean, 0.9, 0.99),
  'C4.coverageM': x => range(x.mean, 0.93, 0.97),
  'C4b.coverageMPerBin': x => x.min >= 0.9,
  'C5.bias': x => x.maxAbsBiasMinusOne <= 0.03,
  'C6.converged': x => x.share <= 0.005,
  'C7.coverageOracle': x => range(x.pooled, 0.92, 0.98),
  'D1.widthWithSigma': x => x.ratio >= 1.05,
  'D2.resolutionFlag': x => x.U1okShare === 1 && x.U2notOkShare >= 0.99,
  'D3.refusalsCounts': x => allSeen(x.seen, x.neighbours),
  'D4.refusalsObjects': x => allSeen(x.seen, x.neighbours),
  'D5.floorCounts': x =>
    x.statuses.join() === 'not-constrained,ok,ok' &&
    x.whole === 'not-constrained',
  'D6.floorObjects': x => x.statuses.join() === 'not-constrained,ok,ok',
  'D7.emptySample': x => x.maxRel <= 1e-9,
  'D8.noZeroRule': x => x.share !== null && x.share >= 0.94,
  'P1.zeroKappa': x => x.maxRel <= 1e-9,
  'P2.penaltyOracle': x => x.maxAbs <= TOL.penaltyOracle,
  'P3.penaltyHelps': x => x.ratio <= 0.9,
  'P4.penaltyNamed': x =>
    Object.values(x).every(o => Object.values(o).every(v => v === true)),
  'P5.penaltyGap': x => x.negative === 'penalty' && x.gap === 'penalty-gap',
};

describe('the contract and the files that answer it', () => {
  test('the thresholds file records its amendments and its legs', () => {
    expect(thresholds.amendments.map(a => a.id)).toEqual(['AM1', 'AM2', 'AM3']);
    expect(thresholds.amendments[0].recordedBefore).toMatch(/first run/);
    expect(thresholds.amendments[1].recordedBefore).toBe(
      'the first validator run'
    );
    expect(thresholds.amendments[2].recordedBefore).toMatch(
      /AFTER the first run/
    );
    expect(thresholds.checks).toHaveLength(52);
    expect(new Set(thresholds.checks.map(c => c.id)).size).toBe(52);
    expect(thresholds.committed).toMatch(/typed from memory/);
  });

  test('the oracle and the stream ran against this thresholds file', () => {
    const mine = sha(bytes('thresholds.json'));
    expect(oracle.thresholdsSha256).toBe(mine);
    expect(results.thresholdsSha256).toBe(mine);
    expect(results.oracleSha256).toBe(sha(bytes('oracle-results.json')));
    expect(results.runs).toMatch(/two complete runs agree/);
  });

  test('every row is a committed leg, once, with the committed group, scope and bound', () => {
    expect(results.rows.map(r => r.id).sort()).toEqual(
      thresholds.checks.map(c => c.id).sort()
    );
    for (const c of thresholds.checks) {
      const r = row(c.id);
      expect(r.group).toBe(c.group);
      expect(r.scope).toBe(c.scope);
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
    expect(counts).toEqual({ pass: 42, fail: 1, reported: 6, 'not-run': 3 });
    expect(results.counts).toEqual({
      total: 52,
      pass: 42,
      fail: 1,
      reported: 6,
      notRun: 3,
    });
    const failing = results.rows.filter(r => r.status === 'fail');
    expect(failedFile.legs.map(l => l.id)).toEqual(failing.map(l => l.id));
    expect(failing.map(l => l.id)).toEqual(['D8.noZeroRule']);
    const JUDGED = new Set([
      'integrity',
      'oracle',
      'analytic',
      'equivalence',
      'reference',
      'recovery',
      'coverage',
      'misspecified',
      'refusals',
    ]);
    const judged = results.rows.filter(r => JUDGED.has(r.group));
    const base = judged
      .filter(r => r.scope === 'base' || r.scope === 'all')
      .every(r => r.status === 'pass');
    const unc = judged
      .filter(r => r.scope === 'unc' || r.scope === 'all')
      .every(r => r.status === 'pass');
    const penalty = results.rows
      .filter(r => r.group === 'penalty')
      .every(r => r.status === 'pass');
    expect(results.verdict).toEqual({
      letter: base && unc ? 'A' : base ? 'B' : 'C',
      basePasses: base,
      uncPasses: unc,
      penaltyAdmitted: penalty,
      failing: failing.map(r => r.id),
    });
    expect(results.verdict.letter).toBe('B');
    expect(results.verdict.basePasses).toBe(true);
    expect(results.verdict.penaltyAdmitted).toBe(true);
  });

  test('the first run differs from the pinned run in the row AM3 names and in timings only', () => {
    expect(first.rows.map(r => r.id)).toEqual(results.rows.map(r => r.id));
    const diff = results.rows
      .filter(r => r.id !== 'N6.cpuTime')
      .filter(r => {
        const f = first.rows.find(x => x.id === r.id);
        return (
          f.status !== r.status ||
          JSON.stringify(f.measured) !== JSON.stringify(r.measured)
        );
      })
      .map(r => r.id);
    expect(diff).toEqual(['I1.inputs', 'P2.penaltyOracle']);
    expect(first.rows.find(r => r.id === 'P2.penaltyOracle').status).toBe(
      'fail'
    );
    expect(row('P2.penaltyOracle').status).toBe('pass');
    expect(first.counts).toEqual({
      total: 52,
      pass: 41,
      fail: 2,
      reported: 6,
      notRun: 3,
    });
  });

  test('the oracle agrees with itself and the reference samples are the committed ones', () => {
    expect(oracle.checks.O1maxLogLikDiff).toBeLessThan(TOL.oracleLogLik);
    expect(Object.keys(oracle.designs)).toEqual(
      thresholds.referenceSamples.designs.map(d => d.id)
    );
    expect(oracle.ensembleU1.replicates).toBe(300);
    expect(oracle.hand.A2.total).toBeCloseTo(1, 9);
  });

  test('the hand examples are consistent with the formulas, independently of the files', () => {
    // A2: l_hat = ln(Phi(2) - 1/2) - 1 and the upper end solves 2 (g - 1 - ln g) = chi-square(0.95, 1).
    const g = oracle.hand.A2.gstarClosed;
    expect(2 * (g - 1 - Math.log(g))).toBeCloseTo(3.841458820694124, 9);
    // A1 by arithmetic: n r / E.
    expect((3 * 1) / 10).toBeCloseTo(0.3, 15);
    expect((10 * 0.8) / 20).toBeCloseTo(0.4, 15);
    // A5: 1 x 1 + 7 x 0.5.
    expect(1 * 1 + 7 * 0.5).toBe(4.5);
    // the exposure of U1 rises to the number of targets and not past it
    const E = oracle.exposure.U1.E;
    expect(E[7]).toBeLessThanOrEqual(500);
    expect(E[0]).toBeLessThan(E[1]);
  });

  test('no fixture holds a home path', () => {
    for (const f of [
      'thresholds.json',
      'oracle-results.json',
      'results.json',
      'first-run-results.json',
      'failed-legs.json',
      'diagnostic-d8.json',
    ])
      expect(bytes(f).toString('utf8')).not.toMatch(
        /\/Users\/|\/home\/|C:\\\\Users/
      );
  });

  test('the diagnostic of D8 is labelled post hoc and changes no leg', () => {
    expect(diag.note).toMatch(/post-hoc diagnostic/);
    expect(diag.note).toMatch(/not a leg/);
    // the measurement of the leg is the one the gate stream made
    const d8 = row('D8.noZeroRule').measured;
    expect(diag.objectPathU3.total.zeroStatements).toBe(d8.zeroStatements);
    expect(diag.objectPathU3.total.zeroCovered).toBe(d8.covered);
    // the counts-path rule, conditioned on a zero count at a truth of mu = 5, covers nothing
    expect(diag.countsPath.zeroCovered).toBe(0);
  });
});

describe('the document and the register state what the files hold', () => {
  test('the document names the verdict, the counts, the failing leg and the unmoved bound', () => {
    expect(doc).toContain('**Verdict by the committed function: B**');
    expect(doc).toContain(
      '52 rows: **42 pass, 1 fail, 6 reported, 3 not run.**'
    );
    expect(doc).toContain('D8.noZeroRule');
    expect(doc).toContain('Part B is not begun');
    expect(doc).toContain('consumers rule');
    expect(doc).not.toMatch(/\/Users\//);
  });

  test('the register holds the five rows of this gate', () => {
    for (const n of ['01', '02', '03', '04', '05'])
      expect(register).toContain(`| D-R10-264-${n} |`);
    const rows = register.split('\n').filter(l => l.startsWith('| D-R10-264-'));
    expect(rows).toHaveLength(5);
    for (const r of rows) expect(r).toContain('**DELEGATED**');
    expect(rows[1]).toContain('verdict B');
  });
});
