// =============================================================================
// Stellar rotation and flares (Roadmap III, Prompt 220)
// -----------------------------------------------------------------------------
// The validation contract of tests/fixtures/stellar-activity/thresholds.json,
// committed before the kernel existed (STELLAR_ACTIVITY.md). The ensemble legs take
// about four CPU-minutes, so their table is pinned in results.json by
// `npm run activity:validate -- --write-results` and held here against failed-legs.json:
// a leg that crossed its bound is recorded there and this test holds that it still fails
// and that nothing else does. The quick tests hold the kernel's public contract.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import * as K from '../js/kernels/activity/index.js';

const read = f => JSON.parse(readFileSync(f, 'utf8'));
const THR = read('tests/fixtures/stellar-activity/thresholds.json');
const FAILED = read('tests/fixtures/stellar-activity/failed-legs.json');
const PINNED = read('tests/fixtures/stellar-activity/results.json').rows;

describe('the committed thresholds', () => {
  test('every check of the contract is present and no amendment moved a bound', () => {
    const ids = THR.checks.map(c => c.id);
    for (const id of [
      'A1.centre',
      'A2.full',
      'A3.hidden',
      'A4.periodic',
      'A5.antipodal',
      'A6.shear',
      'A7.template',
      'A8.edBox',
      'A9.slope',
      'B1.spotOracle',
      'B2.periodogram',
      'B3.flareOracle',
      'B4.periodOracle',
      'C1.periodCoverage',
      'C2.edCoverage',
      'C3.slopeCoverage',
      'C4.completeness',
      'D1.noise',
      'D2.shortBaseline',
      'D3.doubleDipEqual',
      'D4.doubleDipUnequal',
      'D5.evolving',
      'D6.spotsNotFlares',
      'E1.auMicPeriod',
      'E2.auMicFlares',
      'E3.ekDraPeriod',
      'E4.auMicFfd',
    ])
      expect(ids).toContain(id);
    expect(THR.amendments.map(a => a.id)).toEqual([
      'AM1',
      'AM2',
      'AM3',
      'AM4',
      'AM5',
    ]);
    expect(THR.amendments.every(a => a.boundMoved === false)).toBe(true);
  });
});

describe('the pinned validation table', () => {
  test('every committed leg ran, and exactly the recorded legs fail', () => {
    const ran = new Set(PINNED.map(r => r.id));
    for (const c of THR.checks)
      expect(ran.has(c.id) || c.id.startsWith('P')).toBe(true);
    const failing = PINNED.filter(r => r.status === 'fail')
      .map(r => r.id)
      .sort();
    expect(failing).toEqual(FAILED.failed.map(f => f.id).sort());
    expect(failing).toEqual(['B4.periodOracle', 'D4.doubleDipUnequal']);
    expect(PINNED.filter(r => r.status === 'not-run')).toEqual([]);
    expect(
      FAILED.failed.every(
        f => typeof f.reason === 'string' && f.reason.length > 40
      )
    ).toBe(true);
  });
});

describe('the spot model', () => {
  test('a spot at the disc centre matches its closed form', () => {
    const rho = 0.4;
    const G = x =>
      (0.38 * x * x) / 2 + (0.84 * x ** 3) / 3 - (0.22 * x ** 4) / 4;
    const exact =
      (2 * Math.PI * (G(1) - G(Math.cos(rho)))) / K.discLight(0.4, 0.22);
    expect(K.spotDeficit(0, rho)).toBeCloseTo(exact, 10);
  });
  test('a spot behind the limb hides nothing and a hemisphere spot covers the disc', () => {
    expect(K.spotDeficit((100 * Math.PI) / 180, (8 * Math.PI) / 180)).toBe(0);
    expect(K.spotDeficit(0, Math.PI / 2)).toBeCloseTo(1, 12);
  });
  test('two antipodal equal spots have half the rotation period', () => {
    const t = Float64Array.from({ length: 50 }, (_, i) => i * 0.13);
    const spec = {
      period: 2.5,
      inc: 90,
      spots: [
        { lat: 0, lon: 0, radius: 12, contrast: 0.5 },
        { lat: 0, lon: 180, radius: 12, contrast: 0.5 },
      ],
    };
    const a = K.spottedFlux(t, spec);
    const b = K.spottedFlux(
      t.map(v => v + 1.25),
      spec
    );
    for (let i = 0; i < t.length; i++) expect(a[i]).toBeCloseTo(b[i], 12);
  });
});

describe('the rotation period', () => {
  const t = Float64Array.from({ length: 1296 }, (_, i) => (i * 30) / 1440);
  const star = (P, spots, seed) =>
    K.syntheticActivity({
      seed,
      days: 27,
      cadenceMin: 30,
      period: P,
      inc: 80,
      spots,
      noise: 1e-3,
    }).flux;
  test('one spot gives the period with its factor-two alias listed, never a bare number', () => {
    const y = star(
      4.1,
      [{ lat: 25, lon: 40, radius: 11, contrast: 0.6 }],
      'unit-1'
    );
    const r = K.rotationPeriod(t, y, { minPeriod: 0.5, maxPeriod: 13 });
    expect(r.verdict).toBe('period-with-alias');
    expect(Math.abs(r.period - 4.1) / 4.1).toBeLessThan(0.02);
    expect(r.candidates.map(c => c.role)).toEqual(['peak', 'double-period']);
  });
  test('white noise has no signal and a short baseline is not constrained', () => {
    const noise = K.syntheticActivity({
      seed: 'unit-noise',
      days: 27,
      cadenceMin: 30,
      period: 3,
      noise: 1e-3,
    });
    expect(
      K.rotationPeriod(t, noise.flux, { minPeriod: 0.5, maxPeriod: 13.5 })
        .verdict
    ).toBe('no-signal');
    const short = K.syntheticActivity({
      seed: 'unit-short',
      days: 15,
      cadenceMin: 30,
      period: 12,
      inc: 70,
      noise: 1e-3,
      spots: [{ lat: 30, lon: 10, radius: 12, contrast: 0.6 }],
    });
    const r = K.rotationPeriod(short.t, short.flux, {
      minPeriod: 0.5,
      maxPeriod: 15,
    });
    expect(r.verdict).toBe('not-constrained');
    expect(r.period).toBeNull();
  });
});

describe('flares', () => {
  test('the template integrates to 1.827 amp t_1/2 and a seeded curve returns its flares', () => {
    expect(K.TEMPLATE_INTEGRAL).toBeCloseTo(1.827046, 5);
    const fc = read('tests/fixtures/stellar-activity/flare-curve.json');
    const t = Float64Array.from(
      { length: fc.flux.length },
      (_, i) => i * fc.cadenceDays
    );
    const r = K.detectFlares(t, Float64Array.from(fc.flux), 1e-3, {
      period: fc.period,
    });
    expect(r.flares.length).toBe(fc.truth.length);
    const ratio = r.flares.map((f, i) => f.ed / fc.truth[i].ed);
    for (const v of ratio) expect(Math.abs(v - 1)).toBeLessThan(0.35);
  });
  test('the slope of a power law and its exact interval', () => {
    const s = K.powerLawSlope([1, 2, 4], 1);
    expect(s.alpha).toBeCloseTo(1 + 3 / Math.log(8), 10);
    const s7 = K.powerLawSlope([1, 2, 4, 8, 16, 32, 64], 1);
    expect(s7.interval[0]).toBeCloseTo(1.1933, 3);
    expect(s7.interval[1]).toBeCloseTo(1.8972, 3);
  });
  test('no energy is computed here', () => {
    expect(Object.keys(K).some(k => /energy|erg|bolometric/i.test(k))).toBe(
      false
    );
  });
});
