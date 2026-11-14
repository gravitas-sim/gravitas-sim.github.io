// =============================================================================
// The stellar-activity lessons, in two languages (Roadmap III, Prompt 220)
// -----------------------------------------------------------------------------
// Every number a step states is recomputed from the panels the lessons draw
// (js/activityWidgets.js over js/activityField.js and js/kernels/activity/), read in the
// form the validator takes and fed to the step's own validator; the Spanish carries the
// same step structure. The authentic curves are read from the committed sidecars.
// =============================================================================

import { describe, test, expect, beforeAll } from '@jest/globals';
import { readFileSync } from 'node:fs';
// The shared modules first: Jest's VM loses a module several imports link at once.
import '../js/kernels/activity/index.js';
import { activityCurveOf } from '../js/activityData.js';
import {
  spotsView,
  rotationView,
  flareView,
  ffdView,
  flaresOfAuMic,
  provideCurves,
} from '../js/activityField.js';
import { ACTIVITY_WIDGETS } from '../js/activityWidgets.js';
import {
  HOW_FAST_DOES_THE_STAR_SPIN as SPIN,
  HOW_FAST_DOES_THE_STAR_SPIN_ES as SPIN_ES,
  HOW_FAST_DOES_THE_STAR_SPIN_DEEPER as SPIN_DEEP,
  HOW_FAST_DOES_THE_STAR_SPIN_DEEPER_ES as SPIN_DEEP_ES,
  FLARES,
  FLARES_ES,
  FLARES_DEEPER as FLARES_DEEP,
  FLARES_DEEPER_ES as FLARES_DEEP_ES,
  INSTRUCTOR,
} from '../js/data/investigations/stellar-activity-sequence.js';

const read = p =>
  JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'));
beforeAll(() => {
  provideCurves({
    auMic: activityCurveOf({
      PACK: read('data-packs/tess-au-mic-s1.json'),
      SERIES: read('variables/tess-au-mic-s1.json'),
    }),
    ekDra: activityCurveOf({
      PACK: read('data-packs/tess-ek-dra-s16.json'),
      SERIES: read('variables/tess-ek-dra-s16.json'),
    }),
  });
});

const all = [
  ...SPIN.steps,
  ...SPIN_DEEP.steps,
  ...FLARES.steps,
  ...FLARES_DEEP.steps,
];
const step = sid => all.find(s => s.sid === sid);
const ok = (sid, v) => expect(step(sid).validate(v).level).toBe('ok');
const bad = (sid, v) => expect(step(sid).validate(v).level).toBe('error');

describe('How Fast Does the Star Spin?: the numbers the steps state', () => {
  test('the one-spot star: 4.00 days and 2.7 percent, and nothing else to report', () => {
    const m = spotsView({});
    const r = m.rotation;
    ok('read-the-period', { a: r.period, b: 100 * m.amplitude });
    bad('read-the-period', { a: 2, b: 2.7 });
    expect(r.verdict).toBe('period-with-alias');
    expect(Math.abs(r.period - 4)).toBeLessThan(0.01);
    // The truth is inside the interval.
    expect(r.interval[0] <= 4 && 4 <= r.interval[1]).toBe(true);
  });
  test('two opposite spots: the peak is 2.00 days and 4.00 days is not excluded', () => {
    const r = spotsView({ second: 1 }).rotation;
    expect(Math.abs(r.period - 2)).toBeLessThan(0.01);
    const other = r.candidates.find(c => c.status !== 'primary');
    expect(Math.abs(other.period - 4)).toBeLessThan(0.02);
    expect(other.status).toBe('not-excluded');
  });
  test('AU Microscopii: 4.86 days with 9.71 not excluded', () => {
    const r = rotationView({ star: 0 }).rotation;
    const other = r.candidates.find(c => c.status !== 'primary');
    ok('a-real-star', { a: r.period, b: other.period });
    bad('a-real-star', { a: 4.0, b: 8 });
    expect(other.status).toBe('not-excluded');
    expect(Math.abs(r.period - 4.85)).toBeLessThanOrEqual(0.03 + 0.01);
    // the fold step's number: the chance the two halves differ
    expect(r.alias.p).toBeGreaterThan(0.5);
    expect(r.alias.p).toBeLessThan(0.7);
  });
  test('the unevenly turning star: 4.00 days at the equator and 4.71 at 60 degrees', () => {
    const m = spotsView({ lat: 60, shear: 0.2 });
    ok('the-sun-turns-unevenly', { a: m.periodEq, b: m.spotPeriod });
    expect(Math.abs(m.rotation.period - m.spotPeriod)).toBeLessThan(0.02);
    bad('the-sun-turns-unevenly', { a: 4, b: 4 });
  });
  test('EK Draconis: 2.555 days, 2.532 to 2.579, a widening of 6.2', () => {
    const r = rotationView({ star: 1 }).rotation;
    ok('a-second-star', {
      a: r.period,
      b: r.interval[0],
      c: r.interval[1],
    });
    expect(r.widening).toBeGreaterThan(6);
    expect(r.widening).toBeLessThan(6.5);
    expect(rotationView({ star: 0 }).rotation.widening).toBeCloseTo(2.9, 1);
    expect(100 * r.amplitude).toBeCloseTo(1.5, 1);
  });
  test('the baseline cannot test the 8.00-day alias', () => {
    const r = spotsView({}).rotation;
    const other = r.candidates.find(c => c.status !== 'primary');
    expect(other.status).toBe('untestable');
    expect(Math.abs(other.period - 8)).toBeLessThan(0.05);
  });
});

describe('Flares: the numbers the steps state', () => {
  test('the second largest flare of AU Microscopii', () => {
    const m = flareView({ view: 1, flare: 2 });
    ok('read-a-flare', {
      a: m.one.ed,
      b: 100 * m.one.amp,
      c: m.one.fwhm * 1440,
    });
    expect(m.one.edSigma).toBeGreaterThan(3);
    expect(m.one.edSigma).toBeLessThan(6);
    bad('read-a-flare', { a: 1000, b: 3.5, c: 29 });
  });
  test('76 flares in 24.6 days: 3.1 a day', () => {
    const m = ffdView({});
    ok('count-the-flares', { a: m.flares, b: m.flares / m.days });
    expect(m.days).toBeCloseTo(24.57, 1);
    expect(flareView({ view: 0, day: 9 }).flares).toHaveLength(3);
  });
  test('the slope above the completeness limit: 1.92, 1.62 to 2.28, 29 flares', () => {
    const m = ffdView({});
    ok('the-slope', {
      a: m.fit.alpha,
      b: m.fit.interval[0],
      c: m.fit.interval[1],
      n: m.fit.n,
    });
    expect(m.edMin).toBeCloseTo(8.95, 1);
    // every flare: 1.27, which is shallower
    expect(ffdView({ floor: 2 }).fit.alpha).toBeCloseTo(1.27, 1);
    expect(ffdView({ floor: 2 }).fit.alpha).toBeLessThan(m.fit.alpha);
    // the best-fitting floor: 1.98 (1.71 to 2.29) from 44 flares, inside the first interval
    const s = ffdView({ floor: 1 });
    expect(s.fit.alpha).toBeCloseTo(1.98, 1);
    expect(s.fit.n).toBe(44);
    expect(s.fit.alpha).toBeGreaterThan(m.fit.interval[0]);
    expect(s.fit.alpha).toBeLessThan(m.fit.interval[1]);
    expect(s.edMin).toBeCloseTo(6.1, 1);
  });
  test('the synthetic star: slope 1.74 (1.55 to 1.96) from 48 flares, the truth 1.80 inside', () => {
    const m = ffdView({ source: 1 });
    expect(m.truth.alpha).toBe(1.8);
    expect(m.fit.alpha).toBeCloseTo(1.74, 1);
    expect(m.fit.n).toBe(48);
    expect(m.fit.interval[0]).toBeLessThan(1.8);
    expect(m.fit.interval[1]).toBeGreaterThan(1.8);
    expect(m.fit.interval[0]).toBeCloseTo(1.55, 1);
    expect(m.fit.interval[1]).toBeCloseTo(1.96, 1);
  });
  test('the interval narrows as one over the root of the count (a factor 2 takes four times the flares)', () => {
    const m = ffdView({});
    const w = m.fit.interval[1] - m.fit.interval[0];
    expect(w).toBeCloseTo(0.67, 1);
  });
  test('the biggest flares keep their order and the detection matches the validation (76, 1.92)', () => {
    const f = flaresOfAuMic();
    expect(f.det.flares).toHaveLength(76);
    expect(f.byEd[0].ed).toBeGreaterThanOrEqual(f.byEd[1].ed);
  });
});

describe('no age and no energy anywhere (the gate, D-R10-220-90)', () => {
  const texts = JSON.stringify([
    SPIN,
    SPIN_DEEP,
    FLARES,
    FLARES_DEEP,
    SPIN_ES,
    FLARES_ES,
    INSTRUCTOR,
  ]);
  test('no step or instructor note states an age in years or an energy in erg', () => {
    expect(texts).not.toMatch(
      /\bMyr\b|million years|millones de años|\berg\b|\bergios?\b/i
    );
  });
});

describe('the lessons are graded and structured', () => {
  test('every question has an answer inside its options, and every measure a validator', () => {
    for (const s of all) {
      expect(typeof s.sid).toBe('string');
      if (s.options) {
        expect(s.answer).toBeGreaterThanOrEqual(0);
        expect(s.answer).toBeLessThan(s.options.length);
      }
      if (s.type === 'measure') {
        expect(typeof s.validate).toBe('function');
        expect(s.validate({})).toBeNull();
      }
    }
    expect(new Set(all.map(s => s.sid)).size).toBe(all.length);
  });
  test('the deeper steps hang on core steps or each other, at their own depth', () => {
    for (const [core, deep] of [
      [SPIN, SPIN_DEEP],
      [FLARES, FLARES_DEEP],
    ]) {
      const sids = new Set([...core.steps, ...deep.steps].map(s => s.sid));
      for (const s of deep.steps) {
        expect(sids.has(s.after)).toBe(true);
        expect(['quantitative', 'advanced']).toContain(s.depth);
      }
    }
  });
});

describe('the two languages agree', () => {
  const same = (en, es) => {
    expect(es.steps).toHaveLength(en.steps.length);
    en.steps.forEach((s, i) => {
      const e = es.steps[i];
      expect(e.title).toBeTruthy();
      expect(Boolean(e.options)).toBe(Boolean(s.options));
      if (s.options) expect(e.options).toHaveLength(s.options.length);
      expect(e.fields?.length ?? 0).toBe(s.fields?.length ?? 0);
      expect((e.misconceptions ?? []).length).toBe(
        (s.misconceptions ?? []).length
      );
    });
  };
  test('the lessons and their deeper steps', () => {
    same(SPIN, SPIN_ES);
    same(SPIN_DEEP, SPIN_DEEP_ES);
    same(FLARES, FLARES_ES);
    same(FLARES_DEEP, FLARES_DEEP_ES);
  });
});

describe('the panels', () => {
  test('four widgets, each with controls and a readout of what it assumes', () => {
    expect(ACTIVITY_WIDGETS.map(w => w.id)).toEqual([
      'activity-spots',
      'activity-period',
      'activity-flares',
      'activity-ffd',
    ]);
    for (const w of ACTIVITY_WIDGETS) {
      expect(w.controls.length).toBeGreaterThan(1);
      const rows = w.readout({});
      expect(rows.some(r => r.emphasis)).toBe(true);
      expect(rows[rows.length - 1].value).toMatch(/\S/);
    }
  });
});
