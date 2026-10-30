// =============================================================================
// Vetting: odd-even depths, the secondary-eclipse search, the difference-image
// centroid test, blend candidates and the summary (Roadmap III, Prompt 228)
// -----------------------------------------------------------------------------
// The validation contract of tests/fixtures/vetting/thresholds.json, committed before
// the kernel existed (VETTING.md). The ensemble legs take about half a minute, so
// their table is pinned in results.json by `npm run vetting:validate -- --write-results`
// and held here against failed-legs.json. The quick tests hold the kernel's public
// contract, with absolute values beside every ratio, and the oracle's pinned cases.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import * as K from '../js/kernels/vetting/index.js';
import { RATES } from '../js/kernels/vetting/rates.js';
import { validateArtifact } from '../js/platform/artifact.js';
import { boxDepth as guideBoxDepth } from '../js/observatory/guides/science.js';

const read = f => JSON.parse(readFileSync(f, 'utf8'));
const THR = read('tests/fixtures/vetting/thresholds.json');
const FAILED = read('tests/fixtures/vetting/failed-legs.json');
const PINNED = read('tests/fixtures/vetting/results.json').rows;
const ORACLE = read('tests/fixtures/vetting/oracle-results.json');

describe('the committed thresholds', () => {
  test('every check of the contract is present and the defaults are the committed ones', () => {
    const ids = THR.checks.map(c => c.id);
    for (const id of [
      'A1.boxDepth',
      'A2.oddEvenRecovery',
      'A3.secondaryRecovery',
      'A4.dilution',
      'A5.centroidLocation',
      'A6.centroidShiftAnalytic',
      'A7.verdictLogic',
      'B1.oracleBlendLightCurve',
      'B2.oracleCleanLightCurve',
      'B3.oracleFrames',
      'C1.oddEvenFalseRejection',
      'C2.oddEvenFalseAcceptance',
      'C3.lowPowerNeverPasses',
      'C4.secondaryRates',
      'C5.differenceCoverage',
      'C6.centroidRates',
      'C7.centroidCoverage',
      'C8.blindSpotsReported',
      'D1.tooFewTransits',
      'D2.noSignal',
      'D3.frameRefusals',
      'D4.invalidInputs',
      'D5.summaryNeverPlanet',
      'E1.authenticHd209458',
      'E2.authenticKepler13',
    ])
      expect(ids).toContain(id);
    expect({ ...K.DEFAULTS }).toEqual(THR.contract.defaults);
    // The three amendments are recorded and the originals were not replaced.
    expect(THR.amendments.map(a => a.id)).toEqual(['AM1', 'AM2', 'AM3']);
    expect(THR.checks.find(c => c.id === 'C1.oddEvenFalseRejection').limits).toEqual({
      failMax: 0.02,
      passMin: 0.97,
    });
  });

  test('the pinned run covers every check and nothing failed beyond the labelled legs', () => {
    const ids = THR.checks.map(c => c.id);
    expect(PINNED.map(r => r.id).sort()).toEqual([...ids].sort());
    const failed = PINNED.filter(r => r.status === 'fail').map(r => r.id);
    expect(failed.sort()).toEqual(FAILED.failed.map(f => f.id).sort());
    expect(FAILED.notRun).toEqual([]);
    expect(PINNED.filter(r => r.status === 'report').map(r => r.id)).toEqual([
      'C8.blindSpotsReported',
    ]);
  });

  test('the rates the student is shown are the pinned ensembles', () => {
    const c = id => PINNED.find(r => r.id === id).measured;
    expect(RATES.oddEven.planet).toEqual(c('C8.blindSpotsReported') && RATES.oddEven.planet);
    expect(RATES.oddEven.planet.n).toBe(400);
    expect(RATES.oddEven.planet.fail / 400).toBe(c('C1.oddEvenFalseRejection').fail);
    expect(RATES.oddEven.blendAlternating.pass / 400).toBe(c('C2.oddEvenFalseAcceptance').pass);
    expect(RATES.secondary.binary.fail).toBe(c('C4.secondaryRates').eb.fail);
    expect(RATES.frames.blend.pass).toBe(c('C6.centroidRates').blend.pass);
  });
});

describe('the light-curve tests', () => {
  const planet = K.candidate({ kind: 'planet', seed: 'vetting-test-planet' });
  const blend = K.candidate({ kind: 'blend-alternating', seed: 'vetting-test-blend' });

  test('a clean planet passes both, and the blend of unequal stars is rejected by odd-even', () => {
    const o = K.oddEvenTest(planet, planet.ephemeris);
    expect(o.verdict).toBe('pass');
    expect(o.reason).toBe('depths-agree');
    expect(o.odd.depth).toBeCloseTo(0.0115, 3);
    expect(o.even.depth).toBeCloseTo(0.0115, 3);
    expect(Math.abs(o.difference)).toBeLessThan(3 * o.sigma);
    expect(K.secondaryTest(planet, planet.ephemeris).verdict).toBe('pass');
    const b = K.oddEvenTest(blend, blend.ephemeris);
    expect(b.verdict).toBe('fail');
    expect(b.odd.depth).toBeGreaterThan(0.008);
    expect(b.even.depth).toBeLessThan(0.006);
  });

  test('inconclusive is never a pass: noisy data, one odd cycle, no coverage', () => {
    const faint = K.candidate({ kind: 'planet', sigma: K.CANDIDATE.sigmaLow, seed: 'vetting-test-faint' });
    const o = K.oddEvenTest(faint, faint.ephemeris);
    expect(o.verdict).toBe('inconclusive');
    expect(o.reason).toBe('low-power');
    expect(o.minDetectableDifference / o.meanDepth).toBeGreaterThan(0.5);
    const keep = [...planet.t.keys()].filter(i => {
      const n = Math.round((planet.t[i] - 0.5) / 3.2);
      return n % 2 === 0 || n === 1;
    });
    const one = {
      t: keep.map(i => planet.t[i]),
      y: keep.map(i => planet.y[i]),
      dy: keep.map(i => planet.dy[i]),
    };
    expect(K.oddEvenTest(one, planet.ephemeris).reason).toBe('too-few-transits');
  });

  test('the box depth equals the guide estimator on a flat baseline', () => {
    // A step that is not a divisor of the box's edges, so no point sits on one.
    const t = Float64Array.from({ length: 8000 }, (_, i) => i * 0.0037);
    const eph = { P: 3.2, t0: 0.5, duration: 0.12 };
    const y = Float64Array.from(t, x => {
      const c = Math.round((x - 0.5) / 3.2);
      return Math.abs(x - 0.5 - c * 3.2) < 0.03 ? 0.99 : 1;
    });
    const dy = new Float64Array(t.length).fill(0.001);
    const a = K.boxDepth({ t, y, dy }, eph);
    const g = guideBoxDepth({ t, y, dy }, { period: 3.2, epoch: 0.5, duration: 0.12 });
    expect(a.depth).toBeCloseTo(0.01, 6);
    expect(Math.abs(g.depth - a.depth)).toBeLessThan(5e-4);
    expect(a.sigmaWhite).toBeGreaterThan(0);
  });

  test('invalid inputs throw and name the input', () => {
    expect(() => K.oddEvenTest(planet, { P: 3.2, t0: 0.5, duration: 1.7 })).toThrow(/duration/);
    expect(() => K.secondaryTest(planet, { P: -1, t0: 0, duration: 0.1 })).toThrow(/period/);
    expect(() => K.oddEvenTest({ t: [1, 2, 3], y: [1, 1] }, planet.ephemeris)).toThrow(/length/);
  });
});

describe('the frames and the summary', () => {
  test('a neighbor that eclipses is placed off the target, the target that eclipses is not', () => {
    const a = K.transitFrames({ seed: 'vetting-test-a', eclipsed: 'neighbour' });
    const da = K.differenceCentroid(a, a.ephemeris, a.target);
    expect(da.verdict).toBe('fail');
    expect(da.reason).toBe('off-target');
    expect(Math.hypot(da.offset.dx, da.offset.dy)).toBeGreaterThan(1.2);
    expect(Math.hypot(da.offset.dx, da.offset.dy)).toBeLessThan(1.9);
    expect(da.nIn).toBe(15);
    expect(da.nOut).toBe(36);
    const b = K.transitFrames({ seed: 'vetting-test-b', eclipsed: 'target' });
    const db = K.differenceCentroid(b, b.ephemeris, b.target);
    expect(db.verdict).toBe('pass');
    expect(db.exclusionRadius).toBeLessThan(1);
    expect(Math.hypot(db.offset.dx, db.offset.dy)).toBeLessThan(0.4);
  });

  test('the aperture centroid moves toward the neighbor when the target eclipses, away when it does', () => {
    const a = K.transitFrames({ seed: 'vetting-test-c', eclipsed: 'target', separation: 1.6, angleDeg: 0 });
    const sa = K.differenceCentroid(a, a.ephemeris, a.target).apertureShift;
    expect(sa.dx).toBeGreaterThan(0);
    expect(sa.dx).toBeCloseTo(0.0038, 2);
    const b = K.transitFrames({ seed: 'vetting-test-d', eclipsed: 'neighbour', separation: 1.6, angleDeg: 0 });
    const sb = K.differenceCentroid(b, b.ephemeris, b.target).apertureShift;
    expect(sb.dx).toBeLessThan(0);
  });

  test('the oracle cases: the kernel agrees with the independent implementation', () => {
    for (const name of ['clean', 'blend']) {
      const c = ORACLE.lightCurves[name];
      const t = Float64Array.from({ length: c.y.length }, (_, i) => i * c.cadence);
      const s = { t, y: Float64Array.from(c.y), dy: new Float64Array(c.y.length).fill(c.sigma) };
      const o = K.oddEvenTest(s, c.ephemeris);
      expect(o.verdict).toBe(c.oddEven.verdict);
      expect(o.odd.depth).toBeCloseTo(c.oddEven.odd.depth, 9);
      expect(o.sigma).toBeCloseTo(c.oddEven.sigma, 9);
      expect(K.secondaryTest(s, c.ephemeris).verdict).toBe(c.secondary.verdict);
    }
    expect(ORACLE.lightCurves.blend.oddEven.verdict).toBe('fail');
    expect(ORACLE.lightCurves.clean.oddEven.verdict).toBe('pass');
  });

  test('the summary says rejected, undecided or survives, never planet, and the record validates', () => {
    const c = K.candidate({ kind: 'blend-twin', binary: { ldB: K.BINARY.ldA }, seed: 'vetting-test-twin' });
    const s = K.vet({ series: c, ephemeris: c.ephemeris });
    // Two equal stars pass both light-curve tests; no frames were taken.
    expect(s.tests.oddEven.verdict).toBe('pass');
    expect(s.tests.secondary.verdict).toBe('pass');
    expect(s.tests.centroid).toBeUndefined();
    expect(s.overall).toBe('survives');
    expect(K.overallOf(['pass', 'inconclusive', 'pass'])).toBe('undecided');
    expect(K.overallOf(['pass', 'fail', 'inconclusive'])).toBe('rejected');
    expect(K.overallOf([])).toBe('undecided');
    const rec = K.vettingRecord(s);
    expect(validateArtifact(rec)).toEqual([]);
    expect(rec.quantities.map(q => q.id)).toEqual(['oddEvenDifference', 'secondaryDepth']);
    expect(rec.quantities[1].uncertainty.kind).toBe('limit');
    expect(JSON.stringify(rec)).not.toMatch(/"overall":"planet"/);
    expect(rec.warnings[0]).toMatch(/not validation/);
  });
});
