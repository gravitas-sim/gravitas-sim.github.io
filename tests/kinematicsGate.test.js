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
//   - the T legs were NOT RUN while the thresholds source was absent and run
//     against it since the addendum of 2026-11-04 (T1 pass, T2 fail, T3 reported),
//     and a verdict never changes without a row changing;
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

  test('has 66 rows: 39 pass, 23 fail, 4 REPORTED, 0 NOT RUN', () => {
    expect(results.counts).toEqual({
      pass: 39,
      fail: 23,
      reported: 4,
      notRun: 0,
    });
    expect(results.rows.length).toBe(66);
    expect(new Set(results.rows.map(r => r.id)).size).toBe(66);
    for (const s of ['pass', 'fail', 'reported', 'not-run'])
      expect(results.rows.filter(r => r.status === s).length).toBe(
        { pass: 39, fail: 23, reported: 4, 'not-run': 0 }[s]
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
    expect(failing.length).toBe(23);
  });

  test('the T legs ran against the thresholds source: T1 and T3 pass, T2 fails, none is NOT RUN', () => {
    expect(existsSync(`${DIR}/disk-halo-source.json`)).toBe(true);
    expect(byId['T.T1.coordinates'].status).toBe('pass');
    expect(byId['T.T2.classification'].status).toBe('fail');
    expect(byId['T.T3.real'].status).toBe('pass');
    expect(results.rows.filter(r => r.id.startsWith('T.')).length).toBe(3);
  });

  test('the source file carries both papers, their tables, their frames and the sha256 of each PDF', () => {
    const f = read('disk-halo-source.json');
    expect(f.retrieved).toBe('2026-11-04');
    expect(f.sources.length).toBe(2);
    for (const s of f.sources) {
      expect(s.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(s.url).toMatch(/^https:\/\/arxiv\.org\/pdf\//);
      expect(s.solarMotion.unit).toBe('km/s');
      expect(s.frameNote).toBeTruthy();
    }
    expect(Object.keys(f.sources[0].rows)).toEqual([
      'thin disk',
      'thick disk',
      'halo',
    ]);
    expect(
      Object.keys(
        f.sources[1].tableA1_velocity_dispersions_and_asymmetric_drift_km_s
      )
    ).toEqual(['thin disk', 'thick disk', 'halo']);
    expect(f.verification.verifiedOn).toBe('2026-11-04');
  });

  test('T1 is within its committed bound and T2 reports each rule with the bounds it crossed', () => {
    const lim = id => thresholds.checks.find(c => c.id === id).limits;
    const t1 = byId['T.T1.coordinates'].measured;
    expect(t1.maxAbs).toBeLessThanOrEqual(lim('T.T1.coordinates').maxAbs);
    const t2 = byId['T.T2.classification'].measured;
    const L = lim('T.T2.classification');
    expect(t2.realizations).toBe(L.realizations);
    expect(t2.bounds).toEqual({
      minHaloRecall: L.minHaloRecall,
      minHaloPurity: L.minHaloPurity,
    });
    for (const k of ['venn2004', 'bensby2014']) {
      const r = t2[k];
      const {
        truePositive: tp,
        falseNegative: fn,
        falsePositive: fp,
      } = r.pooled;
      expect(r.haloRecall).toBeCloseTo(tp / (tp + fn), 3);
      expect(r.haloPurity).toBeCloseTo(tp / (tp + fp), 3);
      expect(r.meetsBounds).toBe(
        r.haloRecall >= L.minHaloRecall && r.haloPurity >= L.minHaloPurity
      );
      // no rule meets both bounds, so the leg fails whichever way the rules are weighed
      expect(r.meetsBounds).toBe(false);
    }
  });

  test('T3 accounts for every star under each rule and shows both candidate Sun values', () => {
    const t3 = byId['T.T3.real'].measured;
    const total = o => Object.values(o).reduce((a, x) => a + x.count, 0);
    expect(total(t3.venn2004.classes)).toBe(t3.stars);
    expect(total(t3.bensby2014.classesWithPaperSun)).toBe(t3.stars);
    expect(total(t3.bensby2014.classesWithSampleStrombergV.classes)).toBe(
      t3.stars
    );
    expect(t3.bensby2014.note).toMatch(/neither is chosen/);
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
    expect(doc).toMatch(/66 rows: 39 pass, 23 fail, 4 REPORTED, 0 NOT RUN/);
    expect(doc).toMatch(/verdict for method T is C by the committed function/);
    expect(doc).toMatch(
      /sha256\s+`4b2228f22d7a55e86cfd6db7efc53fa13fa5606a3f5f312347443285d11554c9`/
    );
    expect(doc).toMatch(
      /sha256\s+`fcea82d7e24559d713157cfe3d0e77cf7b0d0840d08d455f3c25018605635d42`/
    );
    expect(doc).toMatch(/`spike\/kinematics-gate`, never merged/);
    for (const a of ['AM1', 'AM2'])
      expect(doc).toMatch(new RegExp(`\\*\\*${a}\\.\\*\\*`));
  });

  test('the register has its six rows, all DELEGATED or RATIFIED', () => {
    for (const id of ['01', '02', '03', '04', '90', '91']) {
      const line = register
        .split('\n')
        .find(l => l.startsWith(`| D-R10-235-${id} |`));
      expect([id, !!line]).toEqual([id, true]);
      expect(line).toMatch(/\*\*(DELEGATED|RATIFIED)\*\*/);
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
