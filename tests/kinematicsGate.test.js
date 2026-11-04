// =============================================================================
// The galactic kinematics gate record (Roadmap III, Prompt 235 Part A)
// -----------------------------------------------------------------------------
// KINEMATICS_GATE.md and tests/fixtures/kinematics/ are a record, not a kernel:
// the prototype that produced results.json is on spike/kinematics-gate and is
// never merged (verdict C for all four methods, so nothing ships). What this
// holds is that the record is consistent with itself and with the contract that
// was committed first:
//
//   - thresholds.json carries both amendments and the legs the verdict function
//     reads, and results.json says which thresholds it was run against;
//   - every failing row is in failed-legs.json and every entry there fails;
//   - the verdicts are the ones the committed function gives from the rows;
//   - the legs that need a file Carl has not supplied are NOT RUN while it is
//     absent, and a verdict never changes without a row changing;
//   - the document and the register state the counts the file holds.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const DIR = 'tests/fixtures/kinematics';
const read = f => JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8'));
const thresholds = read('thresholds.json');
const results = read('results.json');
const failedFile = read('failed-legs.json');
const doc = readFileSync('KINEMATICS_GATE.md', 'utf8');
const register = readFileSync('DECISION_REGISTER.md', 'utf8');
const byId = Object.fromEntries(results.rows.map(r => [r.id, r]));
const base = id => id.replace(/\.(am1|am2)(?=:|$)/, '');

describe('the committed contract', () => {
  test('has its two amendments, its seeds and 32 legs in three sets', () => {
    expect(thresholds.amendments.map(a => a.id)).toEqual(['AM1', 'AM2']);
    expect(thresholds.seeds.synthetic).toEqual([
      235001, 235002, 235003, 235004,
    ]);
    const sets = { S: 0, R: 0, none: 0 };
    for (const c of thresholds.checks) sets[c.set ?? 'none']++;
    expect(thresholds.checks.length).toBe(32);
    expect(sets).toEqual({ S: 23, R: 5, none: 4 });
    expect(new Set(thresholds.checks.map(c => c.id)).size).toBe(32);
  });

  test('the amendments say the committed form binds and move no bound', () => {
    for (const a of thresholds.amendments) {
      expect(a.binding).toMatch(/committed/);
      expect(a.binding).toMatch(/Carl/);
    }
    expect(thresholds.syntheticTruth.disk.A).toBe(14.75);
    expect(thresholds.syntheticTruth.disk.B).toBe(-12.75);
  });
});

describe('the gate stream', () => {
  test('was run against these thresholds', () => {
    const sha = createHash('sha256')
      .update(readFileSync(`${DIR}/thresholds.json`))
      .digest('hex');
    expect(results.thresholdsSha256).toBe(sha);
    expect(results.design).toBe(false);
  });

  test('has 66 rows: 37 pass, 22 fail, 4 REPORTED, 3 NOT RUN', () => {
    expect(results.counts).toEqual({
      pass: 37,
      fail: 22,
      reported: 4,
      notRun: 3,
    });
    expect(results.rows.length).toBe(66);
    expect(new Set(results.rows.map(r => r.id)).size).toBe(66);
    for (const s of ['pass', 'fail', 'reported', 'not-run'])
      expect(results.rows.filter(r => r.status === s).length).toBe(
        { pass: 37, fail: 22, reported: 4, 'not-run': 3 }[s]
      );
  });

  test('every row is a committed leg, and a REPORTED row is one with no set', () => {
    const checks = Object.fromEntries(thresholds.checks.map(c => [c.id, c]));
    for (const r of results.rows) {
      const id = base(r.id).replace(/:O\d$/, '');
      expect([r.id, !!checks[id]]).toEqual([r.id, true]);
      if (r.status === 'reported') expect(checks[id].set).toBe(null);
    }
  });

  test('every failing row is in failed-legs.json, and nothing else is', () => {
    const failing = results.rows
      .filter(r => r.status === 'fail')
      .map(r => r.id);
    expect(failedFile.legs.map(l => l.id)).toEqual(failing);
    expect(failing.length).toBe(22);
  });

  test('the legs that need the thresholds source are NOT RUN while it is absent', () => {
    const supplied = existsSync(`${DIR}/disk-halo-source.json`);
    for (const id of ['T.T1.coordinates', 'T.T2.classification', 'T.T3.real'])
      expect([id, byId[id].status === 'not-run']).toEqual([id, !supplied]);
  });
});

describe('the verdicts', () => {
  test('are C for all four methods by the committed function', () => {
    const v = results.verdicts;
    expect(v.O.binding.verdict).toBe('C');
    expect(v.O.am1.verdict).toBe('C');
    expect(v.D.verdict).toBe('C');
    expect(v.T.verdict).toBe('C');
    expect(v.S.binding.verdict).toBe('C');
    expect(v.S.am2.verdict).toBe('C');
  });

  test('follow from the rows: a method with a failing S leg is C', () => {
    const sset = new Set(
      thresholds.checks.filter(c => c.set === 'S').map(c => c.id)
    );
    const failsS = prefix =>
      results.rows.some(
        r =>
          r.id.startsWith(prefix) &&
          r.status !== 'pass' &&
          r.status !== 'reported' &&
          sset.has(base(r.id).replace(/:O\d$/, ''))
      );
    for (const p of ['O.', 'D.', 'T.', 'S.']) expect(failsS(p)).toBe(true);
  });

  test('the Oort amendment is visible in the rows: the planar form fails its analytic leg, the corrected form passes', () => {
    expect(byId['O.A1.exact'].status).toBe('fail');
    expect(byId['O.A1.exact.am1'].status).toBe('pass');
    expect(byId['O.A2.sameAsMotion'].status).toBe('pass');
    expect(byId['O.A1.exact'].measured.relA).toBeGreaterThan(0.1);
  });

  test('both candidate LSR values are reported and neither is chosen (D-GAIA-03)', () => {
    const m = byId['S.L1.lsrOptions'].measured;
    expect(m.chosen).toBe(null);
    expect(m.options.map(o => o.id)).toEqual(['stromberg', 'schonrich2010']);
  });
});

describe('the document and the register', () => {
  test('the document states the verdicts and the counts the results hold', () => {
    expect(doc).toMatch(/All four verdicts are C/);
    expect(doc).toMatch(/66 rows: 37 pass, 22 fail, 4 REPORTED, 3 NOT RUN/);
    expect(doc).toMatch(/`spike\/kinematics-gate`, never merged/);
    for (const a of ['AM1', 'AM2'])
      expect(doc).toMatch(new RegExp(`\\*\\*${a}\\.\\*\\*`));
  });

  test('the register has its five rows, all DELEGATED', () => {
    for (const id of ['01', '02', '03', '04', '90']) {
      const line = register
        .split('\n')
        .find(l => l.startsWith(`| D-R10-235-${id} |`));
      expect([id, !!line]).toEqual([id, true]);
      expect(line).toMatch(/\*\*DELEGATED\*\*/);
      expect(line).toMatch(/`KINEMATICS_GATE.md`/);
    }
  });

  test('the oracle output names its tools and versions', () => {
    const o = read('oracle-results.json');
    expect(o.versions.numpy).toBeTruthy();
    expect(o.versions.scipy).toBeTruthy();
    expect(o.versions.astropy).toBeTruthy();
    expect(o.inputsSha256).toMatch(/^[0-9a-f]{64}$/);
  });
});
