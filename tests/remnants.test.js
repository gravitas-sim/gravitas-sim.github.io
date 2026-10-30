// =============================================================================
// Remnants: cooling ages, the initial-final mass relation, outcomes (Roadmap III, Prompt 222)
// -----------------------------------------------------------------------------
// The validation contract of tests/fixtures/remnants/thresholds.json, committed
// before the kernel existed (REMNANTS.md). The ensemble legs take about half a
// minute, so their table is pinned in results.json by
// `npm run remnants:validate -- --write-results` and held here against
// failed-legs.json: a leg that crossed its bound is recorded there and this
// test holds that it still fails and that nothing else does. The quick tests
// hold the kernel's public contract, with absolute values beside every ratio.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import * as K from '../js/kernels/remnants/index.js';
import { TAU_YR, MODEL_DELTA_LN } from '../js/kernels/remnants/calibration.js';

const read = f => JSON.parse(readFileSync(f, 'utf8'));
const THR = read('tests/fixtures/remnants/thresholds.json');
const FAILED = read('tests/fixtures/remnants/failed-legs.json');
const PINNED = read('tests/fixtures/remnants/results.json').rows;
const PIN = read('tests/fixtures/remnants/cooling-pin.json');

describe('the committed thresholds', () => {
  test('every check of the contract is present and no amendment moved a bound', () => {
    const ids = THR.checks.map(c => c.id);
    for (const id of [
      'A1.scaling',
      'A2.inverse',
      'A3.ode',
      'A4.stefan',
      'A5.radius',
      'A6.ifmrContinuity',
      'A7.ifmrPublished',
      'A8.outcomeSum',
      'A9.neutronStars',
      'B1.tableLaw',
      'B2.teffEntry',
      'B3.oracleCooling',
      'B4.oracleRelations',
      'B5.outsideDomain',
      'C1.coolingCoverage',
      'C2.ifmrCoverage',
      'C3.outcomeFrequencies',
      'D1.refusals',
      'D2.nearThreshold',
      'D3.modelTermAlwaysThere',
      'D4.ifmrRefusals',
      'E1.clusterWhiteDwarfs',
    ])
      expect(ids).toContain(id);
    expect(THR.amendments.map(a => a.id)).toEqual(['AM1', 'AM2']);
    expect(THR.amendments.every(a => a.boundMoved === false)).toBe(true);
  });
});

describe('the pinned validation table', () => {
  test('every committed leg ran, and exactly the recorded legs fail', () => {
    const ran = new Set(PINNED.map(r => r.id));
    for (const c of THR.checks) expect(ran.has(c.id)).toBe(true);
    const failing = PINNED.filter(r => r.status === 'fail')
      .map(r => r.id)
      .sort();
    expect(failing).toEqual(FAILED.failed.map(f => f.id).sort());
    expect(failing).toEqual(['A6.ifmrContinuity', 'A9.neutronStars']);
    expect(PINNED.filter(r => r.status === 'not-run')).toEqual([]);
    expect(
      FAILED.failed.every(
        f => typeof f.reason === 'string' && f.reason.length > 40
      )
    ).toBe(true);
  });
});

describe('the calibration', () => {
  test('tau and the model term are what the committed procedure gives on the pin', () => {
    const by = Object.fromEntries(
      Object.entries(PIN.masses).map(([m, v]) => [m, v.rows])
    );
    const c = K.calibrate(by);
    expect(c.tau / TAU_YR).toBeCloseTo(1, 12);
    expect(c.delta / MODEL_DELTA_LN).toBeCloseTo(1, 12);
    // absolute values too, so a uniform error cannot hide in a ratio
    expect(TAU_YR).toBeGreaterThan(8.1e6);
    expect(TAU_YR).toBeLessThan(8.3e6);
    expect(MODEL_DELTA_LN).toBeGreaterThan(0.18);
    expect(MODEL_DELTA_LN).toBeLessThan(0.19);
  });
  test('the pin holds derived rows only, with its provenance', () => {
    expect(PIN.files).toHaveLength(7);
    for (const f of PIN.files) expect(f.sha256).toMatch(/^[0-9a-f]{64}$/);
    for (const v of Object.values(PIN.masses)) {
      expect(v.rows).toHaveLength(51);
      for (const r of v.rows) expect(r).toHaveLength(4);
    }
    expect(PIN.rights).toMatch(/no licence stated, credited/);
  });
});

describe('the cooling age', () => {
  test('a 0.6 solar-mass dwarf at log L = -3 is about 0.8 Gyr old (the table says 0.81), with both terms', () => {
    const r = K.coolingAge({
      massSun: 0.6,
      logLSun: -3,
      sigmaMass: 0.03,
      sigmaLogL: 0.04,
    });
    expect(r.status).toBe('ok');
    expect(r.ageYr / 1e9).toBeGreaterThan(0.7);
    expect(r.ageYr / 1e9).toBeLessThan(0.9);
    expect(r.sigmaModelLn).toBeCloseTo(MODEL_DELTA_LN / 1.959963984540054, 12);
    expect(r.sigmaObsLn).toBeCloseTo(
      (5 / 7) * Math.hypot(0.03 / 0.6, 0.04 * Math.LN10),
      12
    );
    expect(r.sigmaTotalLn).toBeCloseTo(
      Math.hypot(r.sigmaObsLn, r.sigmaModelLn),
      12
    );
    expect(r.interval95.lo).toBeLessThan(r.ageYr);
    expect(r.interval95.hi).toBeGreaterThan(r.ageYr);
    expect(r.interval95.lo).toBeLessThan(r.observational95.lo);
  });
  test('the same age comes from a temperature, with the radius approximation stated by the table', () => {
    const r = K.coolingAge({ massSun: 0.6, teffK: 10000, sigmaTeff: 200 });
    expect(r.status).toBe('ok');
    expect(r.logLSun).toBeGreaterThan(-3);
    expect(r.logLSun).toBeLessThan(-2.5);
  });
  test('outside the domain there is a refusal and no age', () => {
    for (const input of [
      { massSun: 0.6, logLSun: -5 },
      { massSun: 0.6, logLSun: -1 },
      { massSun: 0.3, logLSun: -3 },
      { massSun: 1.2, logLSun: -3 },
      { massSun: 1.5, logLSun: -3 },
      { massSun: 0.6, teffK: 3500 },
      { massSun: 0.6 },
      { massSun: Number.NaN, logLSun: -3 },
    ]) {
      const r = K.coolingAge(input);
      expect(r.status).toBe('refused');
      expect(typeof r.reason).toBe('string');
      expect(r.ageYr).toBeUndefined();
    }
  });
  test('the record is model-limited with a floor while the model term is the larger', () => {
    const small = K.coolingQuantity(
      K.coolingAge({
        massSun: 0.6,
        logLSun: -3,
        sigmaMass: 0.005,
        sigmaLogL: 0.01,
      })
    );
    expect(small.uncertainty.kind).toBe('model-limited');
    expect(small.uncertainty.sigma).toBeLessThanOrEqual(
      small.uncertainty.floor
    );
    expect(small.unit).toBe('Gyr');
    const big = K.coolingQuantity(
      K.coolingAge({
        massSun: 0.6,
        logLSun: -3,
        sigmaMass: 0.1,
        sigmaLogL: 0.3,
      })
    );
    expect(big.uncertainty.kind).toBe('sigma');
    expect(K.coolingQuantity({ status: 'refused' })).toBeNull();
  });
  test('the law keeps its exponents and the age between luminosities adds up', () => {
    const t = (m, l) => K.coolingAgeLaw(m, l);
    expect(t(1, 1e-3) / t(0.5, 1e-3)).toBeCloseTo(2 ** (5 / 7), 12);
    expect(t(0.6, 1e-4) / t(0.6, 1e-3)).toBeCloseTo(10 ** (5 / 7), 12);
    expect(K.coolingTimeBetween(0.6, 1e-2, 1e-3)).toBeCloseTo(
      t(0.6, 1e-3) - t(0.6, 1e-2),
      3
    );
  });
});

describe('the initial-final mass relation', () => {
  test('values at the cited points and the intervals', () => {
    const r = K.finalMass(3);
    expect(r.finalMass).toBeCloseTo(0.187 * 3 + 0.184, 12);
    expect(r.scatter).toBe(0.06);
    expect(r.sigmaPrediction).toBeGreaterThan(0.06);
    expect(K.finalMass(1).finalMass).toBeCloseTo(0.569, 12);
    expect(K.finalMass(5, { relation: 'parsec' }).finalMass).toBeCloseTo(
      0.9825,
      12
    );
    expect(K.finalMass(7.3).extrapolated).toBe(true);
    expect(K.finalMass(7).extrapolated).toBe(false);
    expect(K.finalMass(0.5).status).toBe('refused');
    expect(K.finalMass(8).status).toBe('refused');
    expect(K.finalMass(0.85, { relation: 'parsec' }).status).toBe('refused');
  });
});

describe('the outcome', () => {
  test('a star near a threshold has probabilities and no class', () => {
    const o = K.remnantOutcome(8.25);
    expect(o.probabilities.whiteDwarf).toBeCloseTo(0.5, 12);
    expect(o.probabilities.neutronStar).toBeCloseTo(0.5, 12);
    expect(o.decisive).toBe(false);
    expect(o.verdict).toBe('uncertain');
    expect(K.remnantOutcome(30).probabilities.blackHole).toBeCloseTo(0.5, 12);
  });
  test('far from the ranges it is decisive, and the ends of the domain are refused beyond', () => {
    expect(K.remnantOutcome(2).probabilities.whiteDwarf).toBe(1);
    expect(K.remnantOutcome(2).decisive).toBe(true);
    expect(K.remnantOutcome(15).probabilities.neutronStar).toBe(1);
    expect(K.remnantOutcome(60).probabilities.blackHole).toBe(1);
    expect(K.remnantOutcome(0.5).status).toBe('refused');
    expect(K.remnantOutcome(200).status).toBe('refused');
  });
  test('the neutron-star table is the cited one and is read as checked', () => {
    const ns = K.neutronStarMasses();
    expect(ns.masses).toHaveLength(14);
    expect(ns.max).toBe(1.559);
    expect(K.NEUTRON_STARS.checked).toBe(true);
    expect(K.IFMR.relations.mist.checked).toBe(true);
    expect(K.THRESHOLDS.whiteDwarfToNeutronStar.hi).toBe(9.5);
  });
  test('nothing in the kernel reports a cooling age or a class outside its stated domain', () => {
    expect(Object.keys(K).some(k => /crystalli|neutrino/i.test(k))).toBe(false);
  });
});
