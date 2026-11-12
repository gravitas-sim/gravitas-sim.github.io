// =============================================================================
// The HI spectroscopy kernel's public contract (Roadmap III, Prompt 241)
// -----------------------------------------------------------------------------
// The validation contract is tests/fixtures/radio/thresholds.json, run by
// tools/radio-validate.mjs and held in tests/radioResults.test.js. These tests hold
// the contracts a caller relies on: the Doppler scale and its conventions, the LSR
// options and what each result shows, the fixed mask and its refusals, the shape of
// the tangent-point record (assumptions, alternatives, interval label), the
// degeneracy of Theta0 with the Sun's V, the column density and its opacity verdicts,
// and the synthetic generator's label, truth manifest and determinism.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import * as K from '../js/kernels/radio/index.js';
import { SCHONRICH_2010 } from '../js/galactic/model.js';

const R0 = 8;
const TH0 = 220;
const spec = (l, o = {}) =>
  K.generateSpectrum({ l, curveName: 'flat', sigmaV: 5, ...o });
const run = (s, o = {}) =>
  K.tangentPoint({
    l: s.truth.l,
    frequencyHz: s.frequencyHz,
    temperature: s.temperature,
    r0: R0,
    theta0: TH0,
    sigmaV: s.truth.sigmaV,
    sigmaNoise: 0,
    ...o,
  });

describe('the 21-cm line and the Doppler scale', () => {
  test('the two atomic constants carry their status: unverified, the source still to be supplied', () => {
    expect(K.HI_LINE.status).toMatch(/not verified/);
    expect(K.HI_LINE.status).toMatch(/still to be supplied/);
    expect(Object.isFrozen(K.HI_LINE)).toBe(true);
  });
  test('three conventions agree to first order and round-trip', () => {
    for (const convention of K.CONVENTIONS) {
      const f = K.frequencyFromVelocity(40, { convention });
      expect(K.velocityFromFrequency(f, { convention })).toBeCloseTo(40, 8);
    }
    const f = K.frequencyFromVelocity(3);
    const radio = K.velocityFromFrequency(f);
    const optical = K.velocityFromFrequency(f, { convention: 'optical' });
    expect(Math.abs(optical - radio)).toBeLessThan(1e-3);
  });
  test('an unknown convention and a non-positive frequency are refused by code', () => {
    expect(() => K.velocityFromFrequency(1.4e9, { convention: 'x' })).toThrow(
      expect.objectContaining({ code: 'convention' })
    );
    expect(() => K.velocityFromFrequency(-1)).toThrow(
      expect.objectContaining({ code: 'bad-argument' })
    );
  });
});

describe('the LSR options', () => {
  test('both published values of D-GAIA-03 are kept, labelled, and agree with the galactic model', () => {
    expect(K.LSR_OPTIONS.schonrich.U).toBe(SCHONRICH_2010.U);
    expect(K.LSR_OPTIONS.schonrich.V).toBe(SCHONRICH_2010.V);
    expect(K.LSR_OPTIONS.schonrich.W).toBe(SCHONRICH_2010.W);
    expect(K.LSR_OPTIONS.stromberg.V).toBe(3.77);
    expect(K.LSR_OPTIONS.stromberg.U).toBe(K.LSR_OPTIONS.schonrich.U);
    for (const o of Object.values(K.LSR_OPTIONS))
      expect(o.label.length).toBeGreaterThan(10);
  });
  test('a custom (U, V, W) is accepted, named custom, and a bad one refused', () => {
    expect(K.resolveLsr({ U: 1, V: 2, W: 3 }).name).toBe('custom');
    expect(() => K.resolveLsr({ U: 1, V: 2 })).toThrow();
    expect(() => K.resolveLsr('galactic')).toThrow(
      expect.objectContaining({ code: 'lsr-option' })
    );
  });
});

describe('the fixed mask', () => {
  test('twenty longitudes in two quadrants, b = 0, and the refusals by code', () => {
    expect(K.MASK_LONGITUDES).toHaveLength(20);
    expect(K.maskRefusal(30, 0)).toBeNull();
    expect(K.maskRefusal(100, 0).code).toBe('no-tangent-point');
    expect(K.maskRefusal(10, 0).code).toBe('outside-mask');
    expect(K.maskRefusal(30, 2).code).toBe('outside-mask');
    expect(K.maskRefusal(32, 0).code).toBe('outside-mask');
    expect(K.maskRefusal(NaN, 0).code).toBe('outside-mask');
  });
  test('a longitude is wrapped, so -30 degrees is the fourth quadrant', () => {
    expect(K.maskRefusal(-30, 0)).toBeNull();
    expect(K.sideOf(-30)).toBe(-1);
    expect(K.sideOf(30)).toBe(1);
  });
});

describe('the tangent point record', () => {
  const s = K.withNoise(spec(40), 0.1, 241, 'unit');
  const r = run(s, {
    sigmaNoise: undefined,
    sigmaSigmaV: 0.75,
    sigmaTheta0: 8,
  });
  test('it shows what it assumed: R0, Theta0, dispersion, LSR option and its alternatives', () => {
    expect(r.status).toBe('ok');
    expect(r.assumed).toMatchObject({ r0: R0, theta0: TH0, sigmaV: 5 });
    expect(r.lsr.name).toBe('schonrich');
    expect(r.lsrAlternatives.map(a => a.option)).toEqual([
      'schonrich',
      'stromberg',
      'none',
    ]);
    expect(r.terminalVelocity.frame).toBe('LSR');
    expect(r.terminalVelocity.convention).toBe('radio');
    expect(r.assumptions.length).toBeGreaterThanOrEqual(5);
    expect(r.assumptions.join(' ')).toMatch(/optically thin/);
    expect(r.assumptions.join(' ')).toMatch(/fixed longitude mask/);
  });
  test("its interval is the statistics kernel's, labelled, and the 95 percent one is wider", () => {
    expect(r.interval68.method).toBe('covariance');
    expect(r.interval95.hi - r.interval95.lo).toBeGreaterThan(
      r.interval68.hi - r.interval68.lo
    );
    expect(r.interval68.lo).toBeLessThan(r.theta);
    expect(r.interval68.hi).toBeGreaterThan(r.theta);
  });
  test('its width is the quadrature of the five terms', () => {
    const q = Math.sqrt(Object.values(r.terms).reduce((a, t) => a + t * t, 0));
    expect(r.sigma).toBeCloseTo(q, 12);
    expect(r.terms.theta0).toBeCloseTo(Math.sin((40 * Math.PI) / 180) * 8, 12);
  });
  test('the tangent radius and distance are R0 |sin l| and R0 cos l', () => {
    expect(r.radiusKpc).toBeCloseTo(R0 * Math.sin((40 * Math.PI) / 180), 12);
    expect(r.distanceKpc).toBeCloseTo(R0 * Math.cos((40 * Math.PI) / 180), 12);
  });
  test("Theta0 and the Sun's V enter only as a sum: the curve moves by the same amount times |sin l|", () => {
    const base = run(s);
    const moved = run(s, { theta0: TH0 + 10 });
    expect(moved.theta - base.theta).toBeCloseTo(
      10 * Math.sin((40 * Math.PI) / 180),
      10
    );
    const none = run(s, { lsr: 'none' });
    const lsrShift = K.lsrShift(40, 0, 'schonrich');
    expect(base.theta - none.theta).toBeCloseTo(lsrShift, 9);
  });
  test('a U error is an asymmetry between the quadrants, not a common shift', () => {
    const custom = { U: 21.1, V: 12.24, W: 7.25 };
    const shift = l => {
      const s = K.withNoise(spec(l), 0.1, 241, 'u');
      const a = run(s, { sigmaNoise: undefined });
      const b = run(s, { sigmaNoise: undefined, lsr: custom });
      return b.theta - a.theta;
    };
    expect(shift(40)).toBeGreaterThan(0);
    expect(shift(320)).toBeLessThan(0);
  });
});

describe('the refusals carry a code and a reason and no number', () => {
  const s = spec(30);
  test('outside the mask and outside the solar circle', () => {
    expect(run(spec(30), { l: 31 }).code).toBe('outside-mask');
    expect(run(spec(30), { l: 100 }).code).toBe('no-tangent-point');
  });
  test('missing assumptions have no default', () => {
    for (const k of ['r0', 'theta0', 'sigmaV']) {
      const r = run(s, { [k]: undefined });
      expect(r.code).toBe('missing-assumption');
      expect(r.theta).toBeUndefined();
    }
  });
  test('a bad spectrum and a bad axis', () => {
    expect(run(s, { temperature: s.temperature.slice(0, 10) }).code).toBe(
      'bad-spectrum'
    );
    expect(run(s, { frequencyHz: s.frequencyHz.map(f => f + 5e9) }).code).toBe(
      'axis'
    );
  });
  test('a spectrum of nothing has no edge', () => {
    const z = { ...s, temperature: s.temperature.map(() => 0) };
    expect(run(z).code).toBe('edge-not-significant');
  });
  test('the curve lists what it refused', () => {
    const items = [30, 100, 33].map(l => ({
      l,
      frequencyHz: s.frequencyHz,
      temperature: s.temperature,
    }));
    const c = K.tangentCurve(items, {
      r0: R0,
      theta0: TH0,
      sigmaV: 5,
      sigmaNoise: 0,
    });
    expect(c.points).toHaveLength(1);
    expect(c.refused.map(x => x.code).sort()).toEqual([
      'no-tangent-point',
      'outside-mask',
    ]);
  });
});

describe('the column density and the thin assumption', () => {
  const thinWorld = spec(30, { densityCm3: 0.02, spinTemperatureK: 120 });
  const thickWorld = spec(30, { densityCm3: 0.5, spinTemperatureK: 120 });
  const col = (w, Ts) =>
    K.columnDensityThin({
      velocity: w.velocityHelio,
      temperature: w.temperature,
      spinTemperatureK: Ts,
    });
  test('the coefficient is about 1.8e18 cm^-2 per K km/s and is derived, not typed', () => {
    expect(K.COLUMN_COEFFICIENT / 1e18).toBeGreaterThan(1.7);
    expect(K.COLUMN_COEFFICIENT / 1e18).toBeLessThan(1.9);
    expect(K.columnCoefficient(2 * K.HI_LINE.restFrequencyHz)).toBeCloseTo(
      4 * K.COLUMN_COEFFICIENT,
      -6
    );
  });
  test('the verdicts: ok, fails, saturated and not assessed', () => {
    expect(col(thinWorld, 120).status).toBe('ok');
    expect(col(thickWorld, 120).status).toBe('thin-assumption-fails');
    expect(col(thickWorld, 120).tauPeak).toBeGreaterThan(K.TAU_LIMIT);
    expect(col(thickWorld, 120).note).toMatch(/fails/);
    expect(
      K.columnDensityThin({
        velocity: thinWorld.velocityHelio,
        temperature: thinWorld.temperature.map(() => 130),
        spinTemperatureK: 120,
      })
    ).toMatchObject({ status: 'saturated', columnCm2: null });
    const none = col(thinWorld, undefined);
    expect(none.status).toBe('opacity-not-assessed');
    expect(none.note).toMatch(/opacity not assessed/);
  });
  test('the thick world has more gas than the thin estimate says', () => {
    expect(
      thickWorld.truth.columnCm2 / col(thickWorld, 120).columnCm2
    ).toBeGreaterThan(1.2);
  });
});

describe('the synthetic generator', () => {
  test('every spectrum carries the label and a truth manifest', () => {
    const s = spec(30);
    expect(s.label).toMatch(/^SYNTHETIC HI SPECTRUM/);
    expect(s.truth).toMatchObject({
      l: 30,
      b: 0,
      r0: R0,
      theta0: TH0,
      sigmaV: 5,
      mask: true,
    });
    expect(s.truth.circularSpeedAtTangent).toBeGreaterThan(150);
    expect(s.truth.lsr.option).toBe('schonrich');
    expect(s.truth.lineOfSightExtremeLsr).toBeCloseTo(
      s.truth.terminalVelocityLsr,
      4
    );
  });
  test('the axis is uniform in frequency, ascending, with the rest frequency at its centre', () => {
    const f = spec(30).frequencyHz;
    expect(f).toHaveLength(501);
    expect(f[250]).toBe(K.HI_LINE.restFrequencyHz);
    const step = f[1] - f[0];
    expect(step).toBeGreaterThan(0);
    expect(Math.abs(f[500] - f[499] - step)).toBeLessThan(1e-3);
  });
  test('the noise is a named stream: the same seed repeats, another differs, the noise-free truth is untouched', () => {
    const s = spec(30);
    const a = K.withNoise(s, 0.1, 5, 'x');
    const b = K.withNoise(s, 0.1, 5, 'x');
    const c = K.withNoise(s, 0.1, 6, 'x');
    expect(a.temperature).toEqual(b.temperature);
    expect(a.temperature).not.toEqual(c.temperature);
    expect(a.truth.noiseK).toBe(0.1);
    expect(s.truth.noiseK).toBe(0);
  });
  test('it refuses a sightline outside the solar circle', () => {
    expect(() => K.generateSpectrum({ l: 120, curveName: 'flat' })).toThrow(
      expect.objectContaining({ code: 'no-tangent-point' })
    );
  });
});

describe('the universal edge', () => {
  test('c_f at half the peak is between 0 and 1.5 and grows as the level falls', () => {
    const e = K.universalEdge();
    expect(e.cf).toBeGreaterThan(0);
    expect(e.cf).toBeLessThan(1.5);
    expect(K.universalEdge(0.2).cf).toBeGreaterThan(e.cf);
    expect(K.edgeProfile(e.cf) / e.gPeak).toBeCloseTo(0.5, 10);
  });
  test('a level outside (0, 1) is refused', () => {
    expect(() => K.universalEdge(1)).toThrow(RangeError);
  });
});
