import { describe, test, expect } from '@jest/globals';

// =============================================================================
// A fit on a table: the models that claim nothing about what the numbers are
// (Roadmap II, Prompt 66 step 1 repair R-T; INFERENCE_CORE.md)
// -----------------------------------------------------------------------------
// js/inference/models.js: a straight line and a quadratic about a recorded
// center x0, and a power law. Each is held to an answer worked out outside the
// code under test, with its tolerance stated:
//   - the textbook five-point regression (x = 1..5, y = 2, 4, 5, 4, 5):
//     slope 0.6, intercept 2.2, residual sum of squares 2.4, so the slope's
//     standard error is sqrt(0.8 / 10) from the unweighted scatter;
//   - the same points with a stated error bar: the slope's error is the
//     closed form sigma / sqrt(Sxx), whatever the scatter;
//   - a noise-free quadratic and power law are recovered to 1e-6 of their size;
//   - 300 seeded noisy lines: the slope lies within one fitted sigma of the
//     truth 68.3% of the time, to within three binomial deviations;
//   - for a model linear in its parameters the Delta chi^2 = 1 profile interval
//     is the covariance's sigma, exactly: that is the check the core's two
//     uncertainty methods agree where they must;
//   - the experiment fixture's Kepler's-third-law table (P ~ a^1.5) gives an
//     exponent of 1.5 through the whole path: result, observation, fit,
//     envelope, with the digest of the rows and the experiment named.
// =============================================================================

import { dataFrom, fitOnce, profileTask } from '../js/inference/infer.js';
import { MODELS } from '../js/inference/models.js';
import {
  engineFingerprint,
  inferenceManifest,
  validateInference,
} from '../js/inference/manifest.js';
import { gaussian } from '../js/inference/synthetic.js';
import { compareModels, nestedIn } from '../js/analysis/modelCompare.js';

const S = await import('../js/analysis/seams.js');
const { validateArtifact } = await import('../js/platform/artifact.js');
const { METRIC_UNITS } = await import('../js/experiments/metrics.js');
const { result, clone } = await import('./analysisSeamsFixtures.js');

const frame = (x, y, sigma = null) => ({
  x: Float64Array.from(x),
  y: Float64Array.from(y),
  sigma: sigma ? Float64Array.from(sigma) : null,
  groups: null,
  rows: x.map((_, i) => i),
  counts: {
    total: x.length,
    used: x.length,
    masked: 0,
    missing: 0,
    withoutUncertainty: 0,
  },
  columns: { x: 'x', y: 'y', sigma: sigma ? 's' : null },
  units: { x: 's', y: 'm' },
  perDay: null,
});

const line = (
  data,
  { x0 = 3, extra = {}, id = 'poly-1', settings = { x0 } } = {}
) =>
  fitOnce(
    {
      model: { id },
      parameters: {
        c0: { mode: 'fitted', lo: -1e3, hi: 1e3 },
        c1: { mode: 'fitted', lo: -1e3, hi: 1e3 },
        ...extra,
      },
      settings,
      algorithm: { profile: { points: 11 } },
    },
    data
  );
const val = (fit, name) => fit.parameters.find(p => p.name === name);

describe('a straight line', () => {
  const x = [1, 2, 3, 4, 5];
  const y = [2, 4, 5, 4, 5];

  test('unweighted, is the textbook regression, with its error from the scatter', () => {
    const fit = line(frame(x, y));
    // Tolerance 1e-6: the fit is Levenberg-Marquardt on a linear problem.
    expect(val(fit, 'c1').value).toBeCloseTo(0.6, 6);
    expect(val(fit, 'c0').value).toBeCloseTo(4, 6); // the mean, at the center
    expect(fit.chi2).toBeCloseTo(2.4, 6);
    expect(fit.dof).toBe(3);
    expect(val(fit, 'c1').sigma).toBeCloseTo(Math.sqrt(0.8 / 10), 6);
    expect(val(fit, 'c0').sigma).toBeCloseTo(Math.sqrt(0.8 / 5), 6);
    expect(fit.warnings.map(w => w.code)).toContain('unweighted');
    // Not a time series: no red-noise factor, no time-unit warning.
    expect(fit.redNoise).toBeNull();
    expect(fit.warnings.map(w => w.code)).not.toContain('timeUnitAssumed');
  });

  test('with a stated error bar, the error is sigma over sqrt(Sxx), whatever the scatter', () => {
    const fit = line(frame(x, y, [2, 2, 2, 2, 2]));
    expect(val(fit, 'c1').value).toBeCloseTo(0.6, 6);
    expect(fit.chi2).toBeCloseTo(2.4 / 4, 6);
    expect(val(fit, 'c1').sigma).toBeCloseTo(2 / Math.sqrt(10), 6);
    expect(val(fit, 'c1').sigmaScaled).toBeNull(); // reduced chi-square 0.2
    // Error bars too small for the scatter scale the error, and say so.
    const tight = line(frame(x, y, [0.2, 0.2, 0.2, 0.2, 0.2]));
    expect(tight.reducedChi2).toBeCloseTo(2.4 / 0.04 / 3, 6);
    expect(val(tight, 'c1').sigma).toBeCloseTo(0.2 / Math.sqrt(10), 6);
    expect(val(tight, 'c1').sigmaScaled).toBeCloseTo(
      (0.2 / Math.sqrt(10)) * Math.sqrt(tight.reducedChi2),
      6
    );
  });

  test('with unequal error bars, is the weighted closed form', () => {
    const s = [1, 1, 1, 1, 4];
    const fit = line(frame(x, y, s));
    // The normal equations, written out here from the definition.
    const w = s.map(v => 1 / (v * v));
    const W = w.reduce((a, b) => a + b);
    const xm = x.reduce((a, v, i) => a + w[i] * v, 0) / W;
    const ym = y.reduce((a, v, i) => a + w[i] * v, 0) / W;
    const sxx = x.reduce((a, v, i) => a + w[i] * (v - xm) ** 2, 0);
    const sxy = x.reduce((a, v, i) => a + w[i] * (v - xm) * (y[i] - ym), 0);
    const slope = sxy / sxx;
    expect(val(fit, 'c1').value).toBeCloseTo(slope, 6);
    expect(val(fit, 'c0').value).toBeCloseTo(ym + slope * (3 - xm), 6);
    expect(val(fit, 'c1').sigma).toBeCloseTo(1 / Math.sqrt(sxx), 6);
  });

  test('the center only moves the intercept: the slope and its error do not change', () => {
    const a = line(frame(x, y, [2, 2, 2, 2, 2]), { x0: 3 });
    const b = line(frame(x, y, [2, 2, 2, 2, 2]), { x0: 0 });
    expect(val(b, 'c1').value).toBeCloseTo(val(a, 'c1').value, 6);
    expect(val(b, 'c1').sigma).toBeCloseTo(val(a, 'c1').sigma, 6);
    expect(val(b, 'c0').value).toBeCloseTo(2.2, 6); // the intercept at x = 0
  });

  test('holds a fixed parameter', () => {
    const fit = line(frame(x, y), {
      extra: { c1: { mode: 'fixed', value: 0.5 } },
    });
    expect(val(fit, 'c1')).toMatchObject({ mode: 'fixed', value: 0.5 });
    expect(val(fit, 'c0').value).toBeCloseTo(4 - 0.5 * 0, 6); // mean y at x0 = mean x
    expect(fit.dof).toBe(4);
  });

  test('the profile interval of a linear model is the covariance sigma', () => {
    const data = frame(x, y, [2, 2, 2, 2, 2]);
    const request = {
      model: { id: 'poly-1' },
      parameters: {
        c0: { mode: 'fitted', lo: -1e3, hi: 1e3 },
        c1: { mode: 'fitted', lo: -1e3, hi: 1e3 },
      },
      settings: { x0: 3 },
      algorithm: { profile: { points: 11 } },
    };
    const fit = fitOnce(request, data);
    const p = profileTask(request, data, fit, 'c1');
    const sigma = val(fit, 'c1').sigma;
    // Delta chi^2 = 1 is one sigma exactly for a quadratic chi-square; the
    // tolerance is the interpolation's, 1e-3 of sigma.
    expect(p.interval[0]).toBeCloseTo(0.6 - sigma, 2);
    expect(p.interval[1]).toBeCloseTo(0.6 + sigma, 2);
    expect(p.lowerThanFit).toBe(false);
  });

  test('is recovered across seeds: the slope is within one sigma 68% of the time', () => {
    const xs = Array.from({ length: 20 }, (_, i) => i);
    let inside = 0;
    const N = 300;
    for (let s = 0; s < N; s++) {
      const g = gaussian(`line-${s}`);
      const ys = xs.map(v => 5 + 0.25 * (v - 9.5) + 0.8 * g());
      const fit = line(
        frame(
          xs,
          ys,
          xs.map(() => 0.8)
        ),
        { x0: 9.5 }
      );
      if (Math.abs(val(fit, 'c1').value - 0.25) <= val(fit, 'c1').sigma)
        inside++;
    }
    // 0.683 +/- 3 binomial deviations (0.027 each) at N = 300.
    expect(inside / N).toBeGreaterThan(0.683 - 3 * 0.0268);
    expect(inside / N).toBeLessThan(0.683 + 3 * 0.0268);
  });
});

describe('a quadratic', () => {
  test('recovers a noise-free parabola to 1e-6 of its size', () => {
    const xs = Array.from({ length: 12 }, (_, i) => -2 + i * 0.4);
    const ys = xs.map(v => 1 + 2 * (v - 0.5) - 0.5 * (v - 0.5) ** 2);
    const fit = fitOnce(
      {
        model: { id: 'poly-2' },
        parameters: {
          c0: { mode: 'fitted', lo: -100, hi: 100 },
          c1: { mode: 'fitted', lo: -100, hi: 100 },
          c2: { mode: 'fitted', lo: -100, hi: 100 },
        },
        settings: { x0: 0.5 },
      },
      frame(
        xs,
        ys,
        xs.map(() => 0.1)
      )
    );
    expect(val(fit, 'c0').value).toBeCloseTo(1, 6);
    expect(val(fit, 'c1').value).toBeCloseTo(2, 6);
    expect(val(fit, 'c2').value).toBeCloseTo(-0.5, 6);
    expect(fit.chi2).toBeLessThan(1e-9);
  });
});

describe('a power law', () => {
  const req = (extra = {}) => ({
    model: { id: 'power-law' },
    parameters: {
      A: { mode: 'fitted', lo: -1e6, hi: 1e6 },
      p: { mode: 'fitted', lo: -6, hi: 6 },
      ...extra,
    },
    settings: {},
  });

  test("recovers y = 3 x^1.5 and Kepler's y = a^2 to 1e-6, from its own start", () => {
    const xs = [1, 2, 3, 4, 5, 6, 7, 8];
    const fit = fitOnce(
      req(),
      frame(
        xs,
        xs.map(v => 3 * v ** 1.5),
        xs.map(() => 0.1)
      )
    );
    expect(val(fit, 'A').value).toBeCloseTo(3, 6);
    expect(val(fit, 'p').value).toBeCloseTo(1.5, 6);
    const decay = fitOnce(
      req(),
      frame(
        xs,
        xs.map(v => 10 / v ** 2),
        xs.map(() => 0.1)
      )
    );
    expect(val(decay, 'p').value).toBeCloseTo(-2, 6);
    expect(val(decay, 'A').value).toBeCloseTo(10, 6);
  });

  test('with noise, finds the exponent within its stated uncertainty', () => {
    const g = gaussian('power-noise');
    const xs = Array.from({ length: 30 }, (_, i) => 1 + i * 0.5);
    const fit = fitOnce(
      req(),
      frame(
        xs,
        xs.map(v => 3 * v ** 1.5 + 0.5 * g()),
        xs.map(() => 0.5)
      )
    );
    const p = val(fit, 'p');
    expect(Math.abs(p.value - 1.5)).toBeLessThan(4 * p.sigma);
    expect(p.sigma).toBeLessThan(0.01);
  });

  test('refuses an x that is not above zero, in the fit and in the panel', () => {
    const data = frame([0, 1, 2, 3, 4, 5], [1, 2, 3, 4, 5, 6]);
    expect(() => fitOnce(req(), data)).toThrow(/every x above zero/);
    expect(MODELS['power-law'].requires(data)).toMatch(/above zero/);
    expect(MODELS['power-law'].requires(frame([1, 2], [1, 2]))).toBeNull();
  });

  test('a unit for the exponent and one for A, as the data states them', () => {
    expect(S.modelUnit('', { x: 's', y: 'm' })).toBe('');
    expect(S.modelUnit('y', { x: 's', y: 'm' })).toBe('m');
    expect(S.modelUnit('y/x', { x: 's', y: 'm' })).toBe('m/s');
    expect(S.modelUnit('y/x^2', { x: 's', y: 'm' })).toBe('m/s^2');
    expect(S.modelUnit('y/x^p', { x: 's', y: 'm' })).toBe('m/s^p');
    expect(S.modelUnit('y/x', { x: null, y: 'm' })).toBeNull();
    expect(S.modelUnit('y/x', { x: '', y: '' })).toBe('');
    // The time-series models' own sentinels are unchanged.
    expect(S.modelUnit('d', { x: 'h', y: 'm' })).toBe('h');
    expect(S.modelUnit('m/s', { x: 'h', y: 'km/s' })).toBe('km/s');
  });
});

describe('the table models in the core', () => {
  test('state what they do not claim and what they assume, with units', () => {
    for (const id of ['poly-1', 'poly-2', 'power-law']) {
      const m = MODELS[id];
      expect(m.notClaimed.length).toBeGreaterThan(0);
      expect(m.assumptions.length).toBeGreaterThan(0);
      expect(m.version).toBe('1.0.0');
      for (const p of m.parameters) expect(typeof p.unit).toBe('string');
    }
  });

  test('a polynomial needs its center in the manifest, and the reference engine fingerprint is unchanged', () => {
    const data = frame([1, 2, 3, 4, 5], [2, 4, 5, 4, 5]);
    const obs = {
      id: 't',
      title: 't',
      source: { kind: 'builtin', id: 'x', version: null },
    };
    const request = {
      model: { id: 'poly-1' },
      parameters: {
        c0: { mode: 'fitted', lo: -10, hi: 10 },
        c1: { mode: 'fitted', lo: -10, hi: 10 },
      },
      settings: {},
    };
    const bare = inferenceManifest(obs, data, request, {});
    expect(validateInference(bare).map(p => p.path)).toEqual(['settings.x0']);
    const ok = inferenceManifest(
      obs,
      data,
      { ...request, settings: { x0: 3 } },
      {}
    );
    expect(validateInference(ok)).toEqual([]);
    // A parameter with no range is asked for one, as for every model.
    expect(
      validateInference({ ...ok, parameters: { c1: ok.parameters.c1 } }).map(
        p => p.path
      )
    ).toEqual(['parameters.c0']);
    expect(engineFingerprint()).toMatch(/^[0-9a-f]{8}$/);
  });

  test('the constant is nested in a line inside its range, not on a boundary', () => {
    const data = frame(
      [1, 2, 3, 4, 5, 6],
      [1.1, 2.0, 2.9, 4.2, 5.0, 5.9],
      [0.2, 0.2, 0.2, 0.2, 0.2, 0.2]
    );
    const request = {
      model: { id: 'poly-1' },
      parameters: {
        c0: { mode: 'fitted', lo: -50, hi: 50 },
        c1: { mode: 'fitted', lo: -50, hi: 50 },
      },
      settings: { x0: 3.5 },
    };
    const fit = fitOnce(request, data);
    const c = compareModels([{ label: 'line', fit, request, data }], {
      models: MODELS,
    });
    expect(c.nested).toHaveLength(1);
    expect(c.nested[0]).toMatchObject({ simpler: 'constant', df: 1 });
    expect(c.nested[0].boundary).toBe(false);
    expect(c.nested[0].p).toBeLessThan(1e-6); // a slope of 1 in 6 points
    // A transit's depth at zero still is a boundary, as before.
    expect(
      nestedIn(
        { fit: { model: { id: 'constant' } } },
        {},
        [],
        MODELS['transit-quadratic']
      ).boundary
    ).toBe(true);
    expect(
      nestedIn({ fit: { model: { id: 'constant' } } }, {}, []).boundary
    ).toBe(true);
  });
});

describe('an experiment result reaches a fit and a notebook envelope', () => {
  const r = result();
  const obs = S.resultToObservation(r, { metricUnits: METRIC_UNITS });

  test("Kepler's third law: the exponent of the period against a is 1.5, from the table the runner wrote", () => {
    const data = dataFrom(obs); // axes: setting a, mean orbital_period
    expect(data.sigma).not.toBeNull(); // the standard error column
    expect(data.counts.used).toBe(5);
    const request = {
      model: { id: 'power-law' },
      parameters: {
        A: { mode: 'fitted', lo: -1e5, hi: 1e5 },
        p: { mode: 'fitted', lo: -6, hi: 6 },
      },
      settings: {},
      algorithm: { profile: { points: 11 } },
    };
    const fit = fitOnce(request, data);
    // The fixture's noise is 0.7 d on 365.25 a^1.5 d: tolerance 1e-3.
    expect(val(fit, 'p').value).toBeCloseTo(1.5, 3);
    expect(val(fit, 'A').value).toBeCloseTo(365.25, 0);
    expect(val(fit, 'p').sigma).toBeLessThan(1e-3);

    // What the panel does with it: a manifest, the exported document, the
    // envelope the notebook keeps.
    const m = clone(
      inferenceManifest(obs, data, request, {
        concurrency: 1,
        trialTimeoutMs: 1,
        totalTimeoutMs: 1,
        maxResultBytes: 1,
      })
    );
    expect(validateInference(m)).toEqual([]);
    const doc = clone({
      ...m,
      results: {
        fit: { ...fit, residuals: undefined, fit: undefined, rows: undefined },
        profiles: [],
      },
    });
    const env = S.fitArtifact(doc, {
      digest: S.rowsDigest(data),
      units: data.units,
    });
    expect(validateArtifact(env)).toEqual([]);
    expect(env.source).toMatchObject({
      kind: 'inference',
      id: 'power-law',
      digest: S.rowsDigest(data),
    });
    // The experiment it was made from is named, with the digest of its trials.
    expect(env.made.observation).toEqual({
      id: obs.id,
      source: {
        kind: 'experiment',
        id: '3f2a1c9b',
        digest: S.trialsDigest(r),
      },
    });
    const q = id => env.quantities.find(x => x.id === id);
    expect(q('p')).toMatchObject({
      origin: 'fitted',
      unit: '',
      uncertainty: { kind: 'sigma' },
    });
    expect(q('p').value).toBeCloseTo(1.5, 3);
    // A's unit depends on the exponent; the registry has none for it, and the
    // envelope says so rather than invent one.
    expect(q('A').unit).toBeNull();
    // With the units the columns state, still none for it, and a warning.
    const stated = S.fitArtifact(doc, {
      digest: S.rowsDigest(data),
      units: { x: 'AU', y: 'd' },
    });
    expect(stated.quantities.find(x => x.id === 'A').unit).toBeNull();
    expect(stated.warnings).toContain('unit:A');
    expect(stated.quantities.find(x => x.id === 'p').unit).toBe('');
  });

  test('a line through the same table is kept the same way, in the setting units', () => {
    const data = dataFrom(obs, { y: 'mean:closest_approach' });
    const request = {
      model: { id: 'poly-1' },
      parameters: {
        c0: { mode: 'fitted', lo: -100, hi: 100 },
        c1: { mode: 'fitted', lo: -100, hi: 100 },
      },
      settings: { x0: 3 },
    };
    const fit = fitOnce(request, data);
    // closest_approach = 0.9 a + 0.01 s, s = 0..4 (mean 0.02): exactly linear.
    expect(val(fit, 'c1').value).toBeCloseTo(0.9, 6);
    expect(val(fit, 'c0').value).toBeCloseTo(2.72, 6);
    const doc = clone({
      ...inferenceManifest(obs, data, request, {}),
      results: {
        fit: { ...fit, residuals: undefined, fit: undefined, rows: undefined },
        profiles: [],
      },
    });
    const env = S.fitArtifact(doc, {
      digest: S.rowsDigest(data),
      units: data.units,
    });
    expect(validateArtifact(env)).toEqual([]);
    expect(env.quantities.map(q => q.id)).toEqual(['c0', 'c1']);
  });
});
