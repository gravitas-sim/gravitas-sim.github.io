// =============================================================================
// gravitas.observing-setup/1: validation, epochs, noise statistics, migration
// -----------------------------------------------------------------------------
// Tolerances for the statistical checks are fixed from the sample size before
// the run, at four and a half standard errors of the estimate (a false failure
// about once in 140,000 runs); each is written beside its check.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { valid } from './jsonSchemaSubset.js';
import {
  applyNoise,
  isNoiseFree,
  planEpochs,
  readSetup,
  setupFromExperiment,
  setupFromSurveyConfig,
  validateSetup,
} from '../js/forward/setup.js';
import { gaussianAt, normalizeSurveyConfig } from '../js/rvSurvey.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schema = JSON.parse(
  readFileSync(path.join(REPO, 'sdk/schemas/observing-setup-1.schema.json'))
);

const base = (over = {}) => ({
  format: 'gravitas.observing-setup',
  formatVersion: 1,
  seed: 'unit',
  epochs: { kind: 'regular', duration: 10, count: 21 },
  noise: { white: { sigma: 5, unit: 'm/s' } },
  instrument: { kind: 'spectrograph' },
  ...over,
});

describe('validation, in the app and in the schema', () => {
  test('a good setup passes both', () => {
    expect(validateSetup(base())).toEqual([]);
    expect(valid(schema, base())).toBe(true);
  });

  const bad = [
    ['no seed', { seed: '' }, 'seed'],
    [
      'unknown epoch kind',
      { epochs: { kind: 'daily', duration: 1, count: 3 } },
      'epochs.kind',
    ],
    [
      'negative sigma',
      { noise: { white: { sigma: -1 } } },
      'noise.white.sigma',
    ],
    [
      'unknown unit',
      { noise: { white: { sigma: 1, unit: 'furlongs' } } },
      'noise.white.unit',
    ],
    [
      'red noise without a timescale',
      { noise: { red: { sigma: 1 } } },
      'noise.red',
    ],
    [
      'half of the points outliers',
      { noise: { outliers: { fraction: 0.9, amplitude: 1 } } },
      'noise.outliers',
    ],
    [
      'a gap that ends before it starts',
      { epochs: { kind: 'regular', duration: 5, count: 5, gaps: [[3, 1]] } },
      'epochs.gaps[0]',
    ],
    [
      'one listed epoch',
      { epochs: { kind: 'listed', list: [1] } },
      'epochs.list',
    ],
    [
      'an unknown instrument',
      { instrument: { kind: 'telescope' } },
      'instrument.kind',
    ],
    [
      'an epoch unit that is not time',
      { epochs: { kind: 'regular', unit: 'kg', duration: 1, count: 3 } },
      'epochs.unit',
    ],
  ];
  test.each(bad)('refuses %s', (_, over, where) => {
    const paths = validateSetup(base(over)).map(p => p.path);
    expect(paths).toContain(where);
  });

  test('an imager or a catalogue needs no epochs', () => {
    const s = base({ instrument: { kind: 'imager', width: 8, height: 8 } });
    delete s.epochs;
    expect(validateSetup(s)).toEqual([]);
  });
});

describe('epochs', () => {
  test('regular with a count spans the duration', () => {
    const p = planEpochs(
      base({ epochs: { kind: 'regular', start: 100, duration: 10, count: 11 } })
    );
    expect(p.times[0]).toBe(100);
    expect(p.times.at(-1)).toBe(110);
    expect(p.times.length).toBe(11);
  });

  test('a cadence of exactly the duration is two epochs', () => {
    const p = planEpochs(
      base({ epochs: { kind: 'regular', duration: 1, cadence: 1 } })
    );
    expect(p.times.length).toBe(2);
  });

  test('a gap removes epochs and the survivors keep their indices', () => {
    const open = planEpochs(
      base({ epochs: { kind: 'regular', duration: 10, count: 11 } })
    );
    const gapped = planEpochs(
      base({
        epochs: { kind: 'regular', duration: 10, count: 11, gaps: [[3, 6]] },
      })
    );
    expect(gapped.times.length).toBe(8);
    expect(Array.from(gapped.indices)).toEqual(
      [0, 1, 2, 3 + 3, 7, 8, 9, 10].map((v, i) => (i < 3 ? i : v))
    );
    // The same epoch has the same time in both.
    for (let k = 0; k < gapped.indices.length; k++)
      expect(gapped.times[k]).toBe(open.times[gapped.indices[k]]);
  });

  test('irregular and clustered are seeded; listed is as typed', () => {
    const a = planEpochs(
      base({
        seed: 'a',
        epochs: { kind: 'irregular', duration: 10, count: 12 },
      })
    );
    const a2 = planEpochs(
      base({
        seed: 'a',
        epochs: { kind: 'irregular', duration: 10, count: 12 },
      })
    );
    const b = planEpochs(
      base({
        seed: 'b',
        epochs: { kind: 'irregular', duration: 10, count: 12 },
      })
    );
    expect(Array.from(a.times)).toEqual(Array.from(a2.times));
    expect(Array.from(a.times)).not.toEqual(Array.from(b.times));
    const c = planEpochs(
      base({
        epochs: { kind: 'clustered', duration: 10, count: 12, clusters: 3 },
      })
    );
    expect(c.times.length).toBe(12);
    const l = planEpochs(
      base({ epochs: { kind: 'listed', list: [4, 0.5, 2.25] } })
    );
    expect(Array.from(l.times)).toEqual([0.5, 2.25, 4]);
  });
});

describe('long schedules', () => {
  test("a regular setup past the planner's 400 epochs is not truncated, and is the same line as a short one", () => {
    const long = planEpochs(
      base({ epochs: { kind: 'regular', duration: 10, count: 5001 } })
    );
    expect(long.times.length).toBe(5001);
    expect(long.times.at(-1)).toBe(10);
    expect(long.times[2500]).toBe(5);
    const gapped = planEpochs(
      base({
        epochs: { kind: 'regular', duration: 10, count: 5001, gaps: [[2, 4]] },
      })
    );
    expect(gapped.times.length).toBe(5001 - 1000);
    expect(gapped.indices[gapped.indices.length - 1]).toBe(5000);
  });
  test('a long listed setup keeps every time, and an over-long irregular one is refused in words', () => {
    const list = Array.from({ length: 1000 }, (_, i) => i * 0.01);
    expect(
      planEpochs(base({ epochs: { kind: 'listed', list } })).times.length
    ).toBe(1000);
    const problems = validateSetup(
      base({ epochs: { kind: 'irregular', duration: 10, count: 500 } })
    );
    expect(problems.map(p => p.message).join()).toMatch(/at most 400/);
  });
});

describe('noise', () => {
  const idx = n => Int32Array.from({ length: n }, (_, i) => i);
  const day = n => Float64Array.from({ length: n }, (_, i) => i);

  test('a noise-free setup returns the model exactly', () => {
    const s = base({ noise: {} });
    expect(isNoiseFree(s)).toBe(true);
    const model = Float64Array.from([1, 2, 3.5, -4]);
    const r = applyNoise(model, day(4), idx(4), s);
    expect(Array.from(r.values)).toEqual(Array.from(model));
    expect(r.sigma).toBeNull();
  });

  test('the same seed gives the same noise, another seed does not', () => {
    const m = new Float64Array(50);
    const a = applyNoise(m, day(50), idx(50), base());
    const b = applyNoise(m, day(50), idx(50), base());
    const c = applyNoise(m, day(50), idx(50), base({ seed: 'other' }));
    expect(Array.from(a.values)).toEqual(Array.from(b.values));
    expect(Array.from(a.values)).not.toEqual(Array.from(c.values));
  });

  test('white noise: mean 0 and standard deviation sigma over 200 seeds of 100 points', () => {
    // 20,000 draws: the mean has standard error sigma / sqrt(20000) = 0.0071 sigma,
    // so the bound is 0.032 sigma; the standard deviation has standard error
    // 0.005 sigma, so the bound is 0.0225 sigma.
    const sigma = 5;
    let sum = 0;
    let sum2 = 0;
    let n = 0;
    for (let k = 0; k < 200; k++) {
      const r = applyNoise(
        new Float64Array(100),
        day(100),
        idx(100),
        base({ seed: `w${k}` })
      );
      for (const v of r.values) {
        sum += v;
        sum2 += v * v;
        n++;
      }
    }
    const mean = sum / n;
    const sd = Math.sqrt(sum2 / n - mean * mean);
    expect(Math.abs(mean) / sigma).toBeLessThan(0.032);
    expect(Math.abs(sd / sigma - 1)).toBeLessThan(0.0225);
  });

  test('the stated uncertainty is the white sigma, and chi-square per point is 1', () => {
    const r = applyNoise(new Float64Array(5000), day(5000), idx(5000), base());
    expect(r.sigma.every(s => s === 5)).toBe(true);
    let chi = 0;
    for (let i = 0; i < 5000; i++) chi += (r.values[i] / r.sigma[i]) ** 2;
    // chi-square / N has standard deviation sqrt(2 / 5000) = 0.02; bound 0.09.
    expect(Math.abs(chi / 5000 - 1)).toBeLessThan(0.09);
  });

  test('red noise has the stated lag-1 correlation exp(-dt / tau) and is not in the stated sigma', () => {
    // 200 seeds of 100 points at dt = 1, tau = 4: rho = exp(-1/4) = 0.7788.
    // The estimate's standard error is about (1 - rho^2) / sqrt(20000) = 0.0028,
    // taken as 0.007 for the finite series; the bound is 0.03.
    const s = base({ noise: { red: { sigma: 3, timescale: 4 } } });
    let num = 0;
    let den = 0;
    for (let k = 0; k < 200; k++) {
      const r = applyNoise(new Float64Array(100), day(100), idx(100), {
        ...s,
        seed: `r${k}`,
      });
      expect(r.sigma).toBeNull();
      for (let i = 1; i < 100; i++) {
        num += r.values[i] * r.values[i - 1];
        den += r.values[i - 1] ** 2;
      }
    }
    expect(Math.abs(num / den - Math.exp(-0.25))).toBeLessThan(0.03);
  });

  test('outliers: the stated fraction, at plus or minus the amplitude', () => {
    // 20,000 points, p = 0.1: standard error 0.0021; the bound is 0.01.
    const s = base({ noise: { outliers: { fraction: 0.1, amplitude: 50 } } });
    let hits = 0;
    let plus = 0;
    let n = 0;
    for (let k = 0; k < 200; k++) {
      const r = applyNoise(new Float64Array(100), day(100), idx(100), {
        ...s,
        seed: `o${k}`,
      });
      for (const v of r.values) {
        n++;
        if (v !== 0) {
          hits++;
          expect(Math.abs(v)).toBe(50);
          if (v > 0) plus++;
        }
      }
    }
    expect(Math.abs(hits / n - 0.1)).toBeLessThan(0.01);
    // Of about 2,000 outliers the plus share has standard error 0.011; bound 0.05.
    expect(Math.abs(plus / hits - 0.5)).toBeLessThan(0.05);
  });

  test('systematics are exactly an offset and a trend from the first epoch', () => {
    const s = base({ noise: {}, systematics: { offset: 2, trend: 0.5 } });
    const r = applyNoise(
      new Float64Array(3),
      Float64Array.from([10, 12, 14]),
      idx(3),
      s
    );
    expect(Array.from(r.values)).toEqual([2, 3, 4]);
  });

  test('removing epochs does not change the noise of the ones that remain', () => {
    const s = base({ noise: { white: { sigma: 5 }, red: { sigma: 0 } } });
    const all = applyNoise(new Float64Array(10), day(10), idx(10), s);
    const some = applyNoise(
      new Float64Array(3),
      Float64Array.from([0, 4, 9]),
      Int32Array.from([0, 4, 9]),
      s
    );
    expect(some.values[1]).toBe(all.values[4]);
    expect(some.values[2]).toBe(all.values[9]);
  });
});

describe('the radial-velocity survey becomes a setup', () => {
  const cfg = {
    cadenceDays: 0.32,
    baselineDays: 3.52,
    sigmaMs: 8,
    seed: 'survey-9',
  };

  test('the same epochs and the same noise, to the last digit', () => {
    const setup = setupFromSurveyConfig(cfg);
    expect(validateSetup(setup)).toEqual([]);
    const p = planEpochs(setup);
    const old = normalizeSurveyConfig(cfg);
    expect(p.times.length).toBe(
      Math.floor(old.baselineDays / old.cadenceDays + 1e-9) + 1
    );
    p.times.forEach((t, i) =>
      expect(Math.abs(t - i * 0.32)).toBeLessThan(1e-6)
    );
    const r = applyNoise(
      new Float64Array(p.times.length),
      p.times,
      p.indices,
      setup
    );
    r.values.forEach((v, i) => expect(v).toBe(8 * gaussianAt('survey-9', i)));
  });

  test('a scheduled configuration keeps its kind, count, gaps and list', () => {
    const s = setupFromSurveyConfig({
      kind: 'irregular',
      epochs: 16,
      baselineDays: 8,
      jitter: 0.2,
      gaps: [[2, 3]],
      seed: 'x',
      sigmaMs: 0,
    });
    expect(s.epochs).toMatchObject({
      kind: 'irregular',
      count: 16,
      duration: 8,
      jitter: 0.2,
      gaps: [[2, 3]],
    });
    expect(isNoiseFree(s)).toBe(true);
    const e = setupFromSurveyConfig({
      kind: 'explicit',
      explicit: [0, 1, 3],
      baselineDays: 3,
    });
    expect(e.epochs).toMatchObject({ kind: 'listed', list: [0, 1, 3] });
  });

  test('readSetup reads the old configuration as version 0, the new one as is, and refuses the rest', () => {
    const old = readSetup(cfg);
    expect(old.ok).toBe(true);
    expect(old.migrated).toBe(true);
    expect(old.notes[0]).toMatch(/survey/);
    const cur = readSetup(base());
    expect(cur).toMatchObject({ ok: true, migrated: false });
    expect(readSetup({ ...base(), formatVersion: 2 })).toMatchObject({
      ok: false,
      reason: 'newer',
    });
    expect(readSetup({ ...base(), seed: '' })).toMatchObject({
      ok: false,
      reason: 'invalid',
    });
    expect(readSetup('nope').ok).toBe(false);
    expect(readSetup({ format: 'something-else', formatVersion: 1 }).ok).toBe(
      false
    );
  });
});

describe('an experiment manifest becomes a setup', () => {
  test('its metrics, its duration and its first seed, noise-free', () => {
    const s = setupFromExperiment({
      observables: { metrics: ['separation', 'speed'] },
      stop: { duration: 400 },
      seeds: ['a', 'b'],
    });
    expect(validateSetup(s)).toEqual([]);
    expect(valid(schema, s)).toBe(true);
    expect(s.observables).toEqual(['separation', 'speed']);
    expect(s.epochs).toMatchObject({ unit: 'sim', duration: 400, count: 120 });
    expect(s.seed).toBe('a');
    expect(isNoiseFree(s)).toBe(true);
    expect(planEpochs(s).times.length).toBe(120);
  });
});
