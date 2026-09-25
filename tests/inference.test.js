import { describe, test, expect } from '@jest/globals';

// =============================================================================
// The inference core, without a page
// -----------------------------------------------------------------------------
// INFERENCE_CORE.md describes it. What these hold:
//   - the transit model: the exact overlap of two circles for a uniform star,
//     the closed-form center depth with limb darkening, symmetry, contact
//     durations, and exposure smearing;
//   - the orbit: Kepler's equation, a circular orbit's sinusoid, and the
//     conjunction the orbit is placed by;
//   - the fitter: recovery of injected signals, in absolute values; the three
//     uncertainties kept apart; bounds held; the same answer every time;
//     cancellation; an unweighted fit; a signal it cannot see, said so;
//   - the manifest: its rules, its prices and refusals, and the fingerprint.
// =============================================================================

import {
  halfDuration,
  kippingQ,
  limbDarkening,
  occultation,
  totalLight,
  transitFlux,
  uniformOccultation,
} from '../js/inference/transit.js';
import { eccentricity, rvCurve, solveKepler } from '../js/inference/rv.js';
import {
  Canceled,
  crossing,
  invertSpd,
  solveSpd,
} from '../js/inference/fit.js';
import {
  TIME_UNIT_SECONDS,
  boxSearch,
  dataFrom,
  fitOnce,
  perDayOf,
  profileTask,
} from '../js/inference/infer.js';
import {
  gaussian,
  syntheticRv,
  syntheticTransit,
  tessLikeTimes,
} from '../js/inference/synthetic.js';
import {
  PROFILES,
  engineFingerprint,
  estimate,
  inferenceManifest,
  validateInference,
} from '../js/inference/manifest.js';
import { MODELS } from '../js/inference/models.js';

const HD = {
  t0: 2826.782,
  P: 3.5247486,
  k: 0.1209,
  aRs: 8.76,
  b: 0.503,
  q1: 0.36,
  q2: 0.3,
};
const EXPOSURE = 20 / 1440;
const transitRequest = times => ({
  model: { id: 'transit-quadratic' },
  parameters: {
    t0: { lo: times[0], hi: times[0] + 3.6 },
    P: { lo: 3.4, hi: 3.65 },
  },
  settings: { exposure: EXPOSURE, supersample: 5, annuli: 32 },
});

describe('the transit model', () => {
  test('a uniform star is the exact overlap of two circles, to 10^-4 of the depth', () => {
    for (const k of [0.01, 0.05, 0.12, 0.3]) {
      for (let z = 0; z <= 1 + k; z += 0.0173) {
        expect(
          Math.abs(occultation(z, k, 0, 0) - uniformOccultation(z, k))
        ).toBeLessThan(1e-4 * k * k);
      }
    }
  });

  test('a limb-darkened center depth is its closed form, and the edges are dimmer', () => {
    const k = 0.12;
    const { u1, u2 } = { u1: 0.4, u2: 0.25 };
    // Wholly inside at the center: the light within r = k over the total.
    const mu = Math.sqrt(1 - k * k);
    const F = m =>
      (m * m) / 2 -
      u1 * ((m * m) / 2 - m ** 3 / 3) -
      u2 * ((m * m) / 2 - (2 * m ** 3) / 3 + m ** 4 / 4);
    const exact = (2 * Math.PI * (F(1) - F(mu))) / totalLight(u1, u2);
    expect(occultation(0, k, u1, u2)).toBeCloseTo(exact, 14);
    // Deeper than a uniform star at the center, shallower near the limb.
    expect(occultation(0, k, u1, u2)).toBeGreaterThan(k * k);
    expect(occultation(0.85, k, u1, u2)).toBeLessThan(k * k);
    expect(occultation(1.2, k, u1, u2)).toBe(0);
  });

  test('Kipping q1, q2 map to u1, u2 and back', () => {
    const { u1, u2 } = limbDarkening(0.36, 0.3);
    expect(u1).toBeCloseTo(0.36, 14);
    expect(u2).toBeCloseTo(0.24, 14);
    const { q1, q2 } = kippingQ(u1, u2);
    expect(q1).toBeCloseTo(0.36, 14);
    expect(q2).toBeCloseTo(0.3, 14);
  });

  test('is symmetric about mid-transit and lasts the contact-to-contact duration', () => {
    const p = { ...HD, ...limbDarkening(HD.q1, HD.q2) };
    const half = halfDuration(p);
    // HD 209458 b: 3.09 hours for these parameters, circular.
    expect(2 * half * 24).toBeCloseTo(3.0914, 3);
    const times = [-0.05, -0.02, 0.02, 0.05].map(d => HD.t0 + d);
    const f = transitFlux(times, p);
    expect(f[0]).toBeCloseTo(f[3], 12);
    expect(f[1]).toBeCloseTo(f[2], 12);
    expect(transitFlux([HD.t0 + half * 1.001], p)[0]).toBe(1);
    expect(transitFlux([HD.t0 + half * 0.999], p)[0]).toBeLessThan(1);
    // A planet on the far side of its orbit blocks nothing.
    expect(transitFlux([HD.t0 + HD.P / 2], p)[0]).toBe(1);
  });

  test('an exposure smears the transit: shallower at the center, wider at the edges', () => {
    const p = { ...HD, ...limbDarkening(HD.q1, HD.q2) };
    const half = halfDuration(p);
    const snap = transitFlux([HD.t0, HD.t0 + half + 0.003], p)[0];
    const binned = transitFlux([HD.t0, HD.t0 + half + 0.003], p, {
      exposure: EXPOSURE,
      supersample: 11,
    });
    expect(binned[0]).toBeGreaterThan(snap);
    expect(binned[1]).toBeLessThan(1);
  });
});

describe('the orbit', () => {
  test("Kepler's equation is solved to 10^-12 across eccentricities", () => {
    for (const e of [0, 0.1, 0.5, 0.9]) {
      for (let M = -3; M <= 3; M += 0.37) {
        const E = solveKepler(M, e);
        expect(Math.abs(E - e * Math.sin(E) - M)).toBeLessThan(1e-12);
      }
    }
  });

  test('a circular orbit is a sinusoid, zero and falling at conjunction', () => {
    const p = { P: 3, tc: 1, K: 50, sqrtEcosw: 0, sqrtEsinw: 0 };
    const v = rvCurve([1, 1 + 0.75, 1 + 1.5, 1 + 2.25], p);
    expect(v[0]).toBeCloseTo(0, 10);
    expect(v[1]).toBeCloseTo(-50, 10);
    expect(v[2]).toBeCloseTo(0, 10);
    expect(v[3]).toBeCloseTo(50, 10);
    expect(eccentricity(0.3, 0.4).e).toBeCloseTo(0.25, 14);
  });

  test('an eccentric orbit keeps its mean over a period at the zero point', () => {
    const p = { P: 5, tc: 0, K: 30, sqrtEcosw: 0.4, sqrtEsinw: 0.3 };
    const t = Array.from({ length: 4000 }, (_, i) => (i / 4000) * 5);
    const v = rvCurve(t, p);
    // Averaged over time, v = K e cos w + K <cos(nu + w)>, and the second term
    // averages to -e cos w: the mean is zero.
    expect(v.reduce((a, b) => a + b, 0) / v.length).toBeCloseTo(0, 6);
  });
});

describe('linear algebra', () => {
  test('solves and inverts symmetric positive-definite systems', () => {
    const A = [
      [4, 1, 0.5],
      [1, 3, 0.2],
      [0.5, 0.2, 2],
    ];
    const x = solveSpd(A, [1, 2, 3]);
    A.forEach((row, i) =>
      expect(row.reduce((s, v, j) => s + v * x[j], 0)).toBeCloseTo(
        [1, 2, 3][i],
        12
      )
    );
    const inv = invertSpd(A);
    expect(
      inv[0][0] * A[0][0] + inv[0][1] * A[1][0] + inv[0][2] * A[2][0]
    ).toBeCloseTo(1, 12);
    expect(
      solveSpd(
        [
          [1, 2],
          [2, 1],
        ],
        [1, 1]
      )
    ).toBe(null);
  });

  test('a profile crossing is interpolated each side, and open where never reached', () => {
    const pts = [0, 1, 2, 3, 4].map(v => ({ value: v, chi2: (v - 2) ** 2 }));
    expect(crossing(pts, 0, 1)).toEqual([1, 3]);
    expect(crossing(pts.slice(2), 0, 1)).toEqual([null, 3]);
    // Exact for a parabola however coarse the points: a best fit and one
    // point each side at Delta chi^2 = 9.9, where interpolating Delta chi^2
    // itself would put the crossing a third of the way out.
    const coarse = [-3.146, 0, 3.146].map(v => ({ value: v, chi2: v * v }));
    const [lo, hi] = crossing(coarse, 0, 1);
    expect(lo).toBeCloseTo(-1, 12);
    expect(hi).toBeCloseTo(1, 12);
  });

  test('a profile whose grid a degeneracy made coarse is refined where its interval is decided', () => {
    // At 2000 ppm, seed 1: the covariance's sigma for Rp/R* is 0.025, five
    // times the interval's width, and the first grid point past the best is
    // at Delta chi^2 = 9.9. Without refinement the interval was 0.0027 wide.
    const times = tessLikeTimes();
    const noisy = syntheticTransit({
      seed: 'noisy-1',
      times,
      sigma: 2000e-6,
      truth: HD,
      exposure: EXPOSURE,
    });
    const request = transitRequest(times);
    const fit = fitOnce(request, noisy);
    const pr = profileTask(request, noisy, fit, 'k');
    const [lo, hi] = pr.interval;
    const k = fit.parameters.find(p => p.name === 'k').value;
    // Points were added inside each bracket, until each crossing lies
    // between two points no further out than Delta chi^2 = 4.
    expect(pr.points.length).toBeGreaterThan(12);
    for (const [edge, dir] of [
      [lo, -1],
      [hi, 1],
    ]) {
      const beyond = pr.points
        .filter(q => (q.value - k) * dir > (edge - k) * dir)
        .sort((x, y) => (x.value - y.value) * dir)[0];
      expect(beyond.dchi2).toBeLessThan(4);
    }
    expect(hi - lo).toBeGreaterThan(0.008);
  });
});

describe('the fitter, on injected signals', () => {
  const times = tessLikeTimes();
  const data = syntheticTransit({
    seed: 'test-1',
    times,
    sigma: 213e-6,
    truth: HD,
    exposure: EXPOSURE,
  });

  test('finds the transit by box search within a period step', () => {
    const { best } = boxSearch(data, {
      P: [3.4, 3.65],
      t0: [times[0]],
      durations: [0.08, 0.125],
    });
    expect(Math.abs(best.P - HD.P)).toBeLessThan(0.002);
    const phase = (((((best.t0 - HD.t0) / HD.P) % 1) + 1.5) % 1) - 0.5;
    expect(Math.abs(phase * HD.P)).toBeLessThan(0.05);
  });

  test('recovers an HD 209458 b-like transit, in absolute values, within its stated uncertainty', () => {
    const fit = fitOnce(transitRequest(times), data);
    const got = Object.fromEntries(fit.parameters.map(p => [p.name, p]));
    for (const name of ['t0', 'P', 'k', 'aRs', 'b']) {
      const p = got[name];
      expect([
        name,
        Math.abs(p.value - HD[name]) < 3 * (p.sigmaScaled ?? p.sigma),
      ]).toEqual([name, true]);
    }
    // Absolute, not only relative: Rp/R* to 0.005 and the period to 10^-4 d.
    expect(Math.abs(got.k.value - 0.1209)).toBeLessThan(0.005);
    expect(Math.abs(got.P.value - 3.5247486)).toBeLessThan(1e-4);
    expect(fit.reducedChi2).toBeGreaterThan(0.85);
    expect(fit.reducedChi2).toBeLessThan(1.15);
    // White noise: no correlated-noise inflation.
    expect(fit.redNoise.beta).toBeLessThan(1.2);
    // Fitted, fixed and derived are told apart.
    expect(fit.parameters.every(p => p.mode === 'fitted')).toBe(true);
    expect(fit.derived.map(d => d.mode)).toEqual(
      fit.derived.map(() => 'derived')
    );
    // In the time column's unit, days: 3.09 hours.
    expect(fit.derived.find(d => d.name === 'T14').value * 24).toBeCloseTo(
      3.09,
      0
    );
    // The known degeneracy is reported rather than hidden.
    expect(
      fit.warnings.some(
        w => w.code === 'degenerate' && w.parameters.includes('b')
      )
    ).toBe(true);
    expect(fit.notClaimed.join(' ')).toMatch(/mass and density/);
  });

  test('gives the same answer every time', () => {
    const a = fitOnce(transitRequest(times), data);
    const b = fitOnce(transitRequest(times), data);
    expect(b.chi2).toBe(a.chi2);
    expect(b.parameters.map(p => p.value)).toEqual(
      a.parameters.map(p => p.value)
    );
  });

  test('a profile interval, a slice, and the covariance are three different things', () => {
    const request = transitRequest(times);
    const fit = fitOnce(request, data);
    const pr = profileTask(request, data, fit, 'k');
    const center = pr.points.find(q => q.dchi2 === 0);
    expect(center).toBeDefined();
    expect(pr.lowerThanFit).toBe(false);
    const [lo, hi] = pr.interval;
    const k = fit.parameters.find(p => p.name === 'k');
    expect(lo).toBeLessThan(k.value);
    expect(hi).toBeGreaterThan(k.value);
    // Re-fitting the correlated others makes the profile wider than a slice:
    // at each value away from the best, the slice rises at least as fast.
    for (const q of pr.points)
      expect(q.slice + 1e-6).toBeGreaterThanOrEqual(q.dchi2);
    // And the profile's width is near the covariance's, for a well-sampled fit.
    expect((hi - lo) / 2 / k.sigma).toBeGreaterThan(0.5);
    expect((hi - lo) / 2 / k.sigma).toBeLessThan(2);
  });

  test('holds a fixed parameter and keeps every fitted one in its bounds', () => {
    const request = transitRequest(times);
    request.parameters.b = { mode: 'fixed', value: 0.3 };
    request.parameters.aRs = { lo: 5, hi: 8 };
    const fit = fitOnce(request, data);
    const got = Object.fromEntries(fit.parameters.map(p => [p.name, p]));
    expect(got.b.value).toBe(0.3);
    expect(got.b.mode).toBe('fixed');
    expect(got.b.sigma).toBe(null);
    expect(got.aRs.value).toBeLessThanOrEqual(8);
    expect(got.aRs.value).toBeGreaterThanOrEqual(5);
    // Pushed against its bound by the wrong b, and said so.
    expect(fit.warnings.some(w => w.code === 'atBound')).toBe(true);
  });

  test('stops when asked', () => {
    let calls = 0;
    expect(() =>
      fitOnce(transitRequest(times), data, { shouldStop: () => ++calls > 3 })
    ).toThrow(Canceled);
  });

  test('without error bars, fits unweighted and takes the uncertainty from the scatter', () => {
    const plain = { ...data, sigma: null };
    const fit = fitOnce(transitRequest(times), plain);
    expect(fit.weighted).toBe(false);
    expect(fit.warnings.map(w => w.code)).toContain('unweighted');
    const k = fit.parameters.find(p => p.name === 'k');
    expect(Math.abs(k.value - 0.1209)).toBeLessThan(0.005);
    // The scatter stands in for 213 ppm error bars: a similar uncertainty.
    const weighted = fitOnce(transitRequest(times), data).parameters.find(
      p => p.name === 'k'
    );
    expect(k.sigma / weighted.sigma).toBeGreaterThan(0.7);
    expect(k.sigma / weighted.sigma).toBeLessThan(1.4);
  });

  test('a diluted transit is recovered only when the dilution is stated', () => {
    // A third of the aperture's light from another star.
    const diluted = syntheticTransit({
      seed: 'diluted',
      times,
      sigma: 213e-6,
      truth: HD,
      exposure: EXPOSURE,
      dilution: 1 / 3,
    });
    const k = request =>
      fitOnce(request, diluted).parameters.find(p => p.name === 'k');
    const told = transitRequest(times);
    told.settings = { ...told.settings, dilution: 1 / 3 };
    const right = k(told);
    expect(Math.abs(right.value - HD.k)).toBeLessThan(0.005);
    // Untold, the planet comes out smaller by about sqrt(2/3).
    const wrong = k(transitRequest(times));
    expect(wrong.value / HD.k).toBeGreaterThan(0.76);
    expect(wrong.value / HD.k).toBeLessThan(0.87);
  });

  test('says so when there is no transit to find', () => {
    const flat = syntheticTransit({
      seed: 'flat',
      times,
      sigma: 213e-6,
      truth: { ...HD, k: 0.005 },
      exposure: EXPOSURE,
    });
    const fit = fitOnce(transitRequest(times), flat);
    expect(fit.warnings.some(w => w.code === 'notDetected')).toBe(true);
  });

  test('recovers an eccentric orbit, its zero point and its jitter', () => {
    const truth = {
      P: 4.2308,
      tc: 100.3,
      K: 55.9,
      sqrtEcosw: 0.25,
      sqrtEsinw: -0.2,
    };
    const t = Array.from(
      { length: 60 },
      (_, i) => 100 + i * 0.61 + 0.2 * Math.sin(i * 7.1)
    );
    const rv = syntheticRv({
      seed: 'rv-1',
      times: t,
      sigma: 3,
      jitter: 4,
      gamma: -12,
      truth,
    });
    const fit = fitOnce(
      {
        model: { id: 'rv-keplerian' },
        parameters: { P: { lo: 3.5, hi: 5 }, tc: { lo: 99, hi: 105 } },
      },
      rv
    );
    const got = Object.fromEntries(fit.parameters.map(p => [p.name, p]));
    expect(Math.abs(got.P.value - truth.P)).toBeLessThan(
      3 * (got.P.sigmaScaled ?? got.P.sigma)
    );
    expect(Math.abs(got.K.value - truth.K)).toBeLessThan(
      3 * (got.K.sigmaScaled ?? got.K.sigma)
    );
    expect(Math.abs(fit.linear.gamma[0] + 12)).toBeLessThan(2.5);
    expect(fit.nuisance.jitter.value).toBeGreaterThan(1);
    expect(fit.nuisance.jitter.value).toBeLessThan(8);
    expect(fit.notClaimed.join(' ')).toMatch(/Mp sin i/);
  });
});

describe('the data it is given', () => {
  test('leaves out masked rows and missing values, and counts them', () => {
    const o = {
      axes: { x: 't', y: 'f' },
      columns: [
        {
          id: 't',
          role: 'x',
          unit: 'd',
          values: Float64Array.from([1, 2, 3, 4, 5]),
        },
        {
          id: 'f',
          role: 'value',
          unit: '',
          values: Float64Array.from([1, NaN, 1, 1, 1]),
        },
        {
          id: 'e',
          role: 'uncertainty',
          of: 'f',
          unit: '',
          values: Float64Array.from([1, 1, 0, 1, 1]),
        },
      ],
      masks: [{ id: 'm', source: 'reader', rows: [3] }],
    };
    const d = dataFrom(o);
    expect([...d.x]).toEqual([1, 5]);
    expect(d.counts).toEqual({
      total: 5,
      used: 2,
      masked: 1,
      missing: 1,
      withoutUncertainty: 1,
    });
    expect(d.perDay).toBe(1);
  });

  const series = (unit, labels) => ({
    axes: { x: 't', y: 'v' },
    columns: [
      { id: 't', role: 'x', unit, values: Float64Array.from([1, 2, 3]) },
      {
        id: 'v',
        role: 'value',
        unit: 'm/s',
        values: Float64Array.from([0, 1, 0]),
      },
      { id: 'i', role: 'group', unit: null, values: labels },
    ],
  });

  test("states how many of the time column's units make a day, or that it cannot", () => {
    expect(dataFrom(series('h', ['a', 'a', 'a'])).perDay).toBe(24);
    expect(dataFrom(series('s', ['a', 'a', 'a'])).perDay).toBe(86400);
    expect(dataFrom(series(null, ['a', 'a', 'a'])).perDay).toBe(null);
    expect(dataFrom(series('m', ['a', 'a', 'a'])).perDay).toBe(null);
  });

  test("its copy of the time units is the observatory's", async () => {
    const { UNITS, conversionFactor } =
      await import('../js/observatory/units.js');
    const registry = Object.keys(UNITS).filter(id => UNITS[id].dim === 'time');
    expect(Object.keys(TIME_UNIT_SECONDS).sort()).toEqual(registry.sort());
    for (const id of registry) {
      expect(perDayOf(id)).toBeCloseTo(
        conversionFactor({ id: 'd', scale: 1 }, { id, scale: 1 }),
        12
      );
    }
    // A scaled unit, both ways the registry writes a power of ten.
    expect(perDayOf('1e3 s')).toBeCloseTo(86.4, 12);
    expect(perDayOf('10^-3 d')).toBeCloseTo(1000, 9);
    expect(perDayOf('m')).toBe(null);
    expect(perDayOf('')).toBe(null);
  });

  test('numbers the instruments afresh for every dataset', () => {
    const first = dataFrom(series('d', ['HIRES', 'ELODIE', 'HIRES']), {
      group: 'i',
    });
    const second = dataFrom(series('d', ['CORALIE', 'HARPS', 'HARPS']), {
      group: 'i',
    });
    expect([...first.groups]).toEqual([0, 1, 0]);
    expect([...second.groups]).toEqual([0, 1, 1]);
  });
});

describe('the time unit', () => {
  test('a light curve counted in hours is searched and fitted in hours', () => {
    const days = tessLikeTimes();
    const hours = Float64Array.from(days, t => t * 24);
    const data = syntheticTransit({
      seed: 'hours',
      times: days,
      sigma: 213e-6,
      truth: HD,
      exposure: EXPOSURE,
    });
    const inHours = { ...data, x: hours, units: { x: 'h', y: '' }, perDay: 24 };
    const fit = fitOnce(
      {
        model: { id: 'transit-quadratic' },
        parameters: {
          t0: { lo: hours[0], hi: hours[0] + 3.6 * 24 },
          P: { lo: 3.4 * 24, hi: 3.65 * 24 },
          b: { mode: 'fixed', value: HD.b },
        },
        settings: { exposure: EXPOSURE * 24, supersample: 5, annuli: 32 },
      },
      inHours
    );
    const got = Object.fromEntries(fit.parameters.map(p => [p.name, p.value]));
    expect(Math.abs(got.P - HD.P * 24)).toBeLessThan(24e-4);
    expect(Math.abs(got.k - HD.k)).toBeLessThan(0.005);
    // Its duration in hours, the column's unit.
    expect(fit.derived.find(d => d.name === 'T14').value).toBeCloseTo(3.09, 0);
    expect(fit.warnings.map(w => w.code)).not.toContain('timeUnitAssumed');
  });
});

describe('the manifest', () => {
  const times = tessLikeTimes();
  const data = syntheticTransit({
    seed: 'm',
    times,
    sigma: 213e-6,
    truth: HD,
    exposure: EXPOSURE,
  });
  const observation = {
    id: 'test:obs',
    title: 't',
    source: { kind: 'builtin', id: 'x', version: null },
    time: { format: 'BTJD', scale: 'TDB' },
  };

  test('names the data, the model and its version, and the engine', () => {
    const m = inferenceManifest(observation, data, transitRequest(times), {
      concurrency: 2,
    });
    expect(validateInference(m)).toEqual([]);
    expect(m.data.used).toBe(times.length);
    expect(m.model).toEqual({ id: 'transit-quadratic', version: '1.0.0' });
    expect(m.engine.fingerprint).toMatch(/^[0-9a-f]{8}$/);
    expect(engineFingerprint()).toBe(m.engine.fingerprint);
  });

  test('refuses what it cannot fit, with the path', () => {
    const m = inferenceManifest(observation, data, transitRequest(times), {});
    const at = x => validateInference(x).map(p => p.path);
    expect(at({ ...m, model: { id: 'nope' } })).toEqual(['model.id']);
    expect(at({ ...m, model: { ...m.model, version: '0.9.0' } })).toEqual([
      'model.version',
    ]);
    expect(
      at({ ...m, parameters: { ...m.parameters, k: { lo: 0.3, hi: 0.1 } } })
    ).toContain('parameters.k');
    expect(
      at({ ...m, parameters: { ...m.parameters, b: { mode: 'fixed' } } })
    ).toContain('parameters.b.value');
    expect(
      at({ ...m, parameters: { ...m.parameters, mass: { lo: 0, hi: 1 } } })
    ).toContain('parameters.mass');
    expect(at({ ...m, parameters: {} })).toEqual([
      'parameters.t0',
      'parameters.P',
    ]);
    expect(at({ ...m, settings: { ...m.settings, dilution: 1 } })).toEqual([
      'settings.dilution',
    ]);
    expect(
      at({ ...m, settings: { ...m.settings, stellarRadius: { value: 0 } } })
    ).toEqual(['settings.stellarRadius']);
  });

  test('prices a fit, and refuses one too large for the device rather than freezing it', () => {
    const m = inferenceManifest(observation, data, transitRequest(times), {});
    const small = estimate(m, 1882, 'low-end');
    expect(small.refusals).toEqual([]);
    // A time, from the measured rate, and less of one without the profiles.
    const low = PROFILES['low-end'];
    expect(small.ms.fit).toBeGreaterThan(low.setupMs);
    expect(small.ms.total).toBeLessThan(low.maxWallMs);
    expect(
      estimate(m, 1882, 'low-end', { profiles: false }).ms.total
    ).toBeLessThan(small.ms.total);
    expect(estimate(m, 1882, 'desktop').ms.total).toBeLessThan(small.ms.total);
    // The most it may take, at the slowest rates measured, is more.
    expect(small.msMax.total).toBeGreaterThan(small.ms.total);
    // Longer than the device is asked to run: refused before it starts.
    const rows = Math.ceil((1882 * 2 * low.maxWallMs) / small.ms.total);
    expect(estimate(m, rows, 'low-end').refusals.map(r => r.reason)).toContain(
      'tooSlow'
    );
    const huge = estimate(m, PROFILES['low-end'].maxRows + 1, 'low-end');
    expect(huge.refusals.map(r => r.reason)).toContain('tooManyRows');
    const wide = estimate(
      { ...m, parameters: { ...m.parameters, P: { lo: 0.3, hi: 100 } } },
      1882,
      'desktop'
    );
    expect(wide.refusals.map(r => r.reason)).toContain('periodRangeTooWide');
  });

  test('every model states what it does not claim', () => {
    for (const model of Object.values(MODELS))
      expect(model.notClaimed.length).toBeGreaterThan(0);
  });

  test('seeded noise is the same everywhere, and Gaussian', () => {
    const a = gaussian('seed');
    const b = gaussian('seed');
    const xs = Array.from({ length: 20000 }, () => a());
    expect(Array.from({ length: 5 }, () => b())).toEqual(xs.slice(0, 5));
    const mean = xs.reduce((s, v) => s + v, 0) / xs.length;
    const sd = Math.sqrt(
      xs.reduce((s, v) => s + (v - mean) ** 2, 0) / xs.length
    );
    expect(Math.abs(mean)).toBeLessThan(0.03);
    expect(Math.abs(sd - 1)).toBeLessThan(0.03);
  });
});
