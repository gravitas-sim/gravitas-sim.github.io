// =============================================================================
// The Clock That Drifts, in two languages (Roadmap III, Prompt 226)
// -----------------------------------------------------------------------------
// Every number a step states is recomputed from the panels the lesson draws
// (js/ttvWidgets.js over js/ttvField.js and js/kernels/ttv/), read in the form the
// validator takes and fed to the step's own validator; a wrong reading is refused; the
// Spanish carries the same step structure.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
// The shared modules first: Jest's VM loses a module several imports link at once.
import '../js/kernels/ttv/index.js';
import { pairOf, timingView, transitView } from '../js/ttvField.js';
import { TTV_WIDGETS } from '../js/ttvWidgets.js';
import {
  THE_CLOCK_THAT_DRIFTS as LESSON,
  THE_CLOCK_THAT_DRIFTS_ES as LESSON_ES,
  THE_CLOCK_THAT_DRIFTS_DEEPER as DEEP,
  THE_CLOCK_THAT_DRIFTS_DEEPER_ES as DEEP_ES,
  INSTRUCTOR,
} from '../js/data/investigations/ttv-sequence.js';

const all = [...LESSON.steps, ...DEEP.steps];
const step = sid => all.find(s => s.sid === sid);
const ok = (sid, v) => expect(step(sid).validate(v).level).toBe('ok');
const bad = (sid, v) => expect(step(sid).validate(v).level).toBe('error');
const MIN = 1440;

describe('The Clock That Drifts: the numbers the steps state', () => {
  test('transit 40 of the inner planet at 100 ppm: 1.53 minutes from the prediction, 0.52 minutes, true to 0.07', () => {
    const m = transitView({ system: 0, planet: 0, transit: 40, noise: 0 });
    ok('one-transit-time', {
      a: (m.fit.time - m.guess) * MIN,
      b: m.sigmaMinutes,
    });
    bad('one-transit-time', { a: 1.53, b: 2.0 });
    expect(Math.abs(m.errorMinutes)).toBeLessThan(0.15);
    expect(m.fit.regime).toBe('reliable');
    expect(m.fit.flagged).toBe(false);
  });
  test('four times the noise: the error bar is 4 times larger (0.52 to 2.1 minutes) and is a lower bound', () => {
    const a = transitView({ system: 0, planet: 0, transit: 40, noise: 0 });
    const b = transitView({ system: 0, planet: 0, transit: 40, noise: 1 });
    expect(b.sigmaMinutes / a.sigmaMinutes).toBeGreaterThan(3.9);
    expect(b.sigmaMinutes / a.sigmaMinutes).toBeLessThan(4.1);
    expect(b.sigmaMinutes).toBeCloseTo(2.09, 1);
    expect(b.fit.regime).toBe('low-snr');
  });
  test('the far system keeps a steady clock: no signal, scatter about half a minute, about 109 transits', () => {
    const t = timingView({ system: 2, planet: 0 });
    expect(t.analysis.status).toBe('no-signal');
    expect(t.analysis.signal.rms * MIN).toBeGreaterThan(0.4);
    expect(t.analysis.signal.rms * MIN).toBeLessThan(0.7);
    expect(t.count).toBe(109);
    expect(t.pair.relation.status).toBe('refused');
    expect(t.domain.reason).toBe('far-from-resonance');
  });
  test('the near two-to-one pair, inner planet: a 345-day wave of 4.7 minutes, the relation says 346', () => {
    const t = timingView({ system: 0, planet: 0 });
    const a = t.analysis;
    expect(a.status).toBe('ok');
    ok('read-the-wave', { a: a.superPeriod.value, b: a.amplitude * MIN });
    bad('read-the-wave', { a: 173, b: 4.7 });
    expect(t.pair.superPeriod).toBeCloseTo(346.2, 0);
    expect(Math.abs(a.superPeriod.value - t.pair.superPeriod)).toBeLessThan(3);
    expect(t.relationAmplitudeMinutes).toBeCloseTo(4.93, 1);
  });
  test('the beat of the two clocks: 10.0003 and 20.5955 days give 346 days', () => {
    const p = pairOf(0);
    ok('the-beat', { a: p.eph[0].P, b: p.eph[1].P, c: p.superPeriod });
    bad('the-beat', { a: 10, b: 20.6, c: 100 });
  });
  test('the near three-to-two pair: about 174 days both ways', () => {
    const t = timingView({ system: 1, planet: 0 });
    ok('a-different-pair', {
      a: t.analysis.superPeriod.value,
      b: t.pair.superPeriod,
    });
    bad('a-different-pair', { a: 346, b: 346 });
  });
  test('the inner planet swings 4.7 minutes and the outer 1.6, about three times', () => {
    const i = timingView({ system: 0, planet: 0 }).analysis.amplitude * MIN;
    const o = timingView({ system: 0, planet: 1 }).analysis.amplitude * MIN;
    expect(i).toBeCloseTo(4.7, 0);
    expect(o).toBeCloseTo(1.6, 0);
    expect(i / o).toBeGreaterThan(2.7);
    expect(i / o).toBeLessThan(3.1);
  });
  test('40 percent of the record: 44 transits, 430 days, 1.2 cycles, a signal and no period', () => {
    const t = timingView({ system: 0, planet: 0, span: 40 });
    expect(t.analysis.status).toBe('unresolved');
    expect(t.analysis.signal.verdict).toBe('signal');
    expect(t.count).toBe(44);
    expect(Math.round(t.analysis.baseline)).toBe(430);
    expect(t.analysis.cycles).toBeCloseTo(1.24, 1);
    expect(t.analysis.superPeriod).toBeUndefined();
    expect(1.5 * t.pair.superPeriod).toBeGreaterThan(510);
  });
  test('the circular mass: 14.4 Earth masses from 12.1 to 17.4, the engine has 15.0, four percent low', () => {
    const t = timingView({ system: 0, planet: 0, view: 1, zfree: 0.01 });
    const e = t.mass.earth;
    ok('a-mass-if-circular', { a: e.central, b: e.lo, c: e.hi });
    bad('a-mass-if-circular', { a: 15, b: 12, c: 18 });
    expect(t.mass.assumption).toBe('circular');
    expect(t.mass.truthEarth).toBeCloseTo(15.0, 1);
    expect(e.lo).toBeLessThan(t.mass.truthEarth);
    expect(e.hi).toBeGreaterThan(t.mass.truthEarth);
    expect(1 - e.central / t.mass.truthEarth).toBeGreaterThan(0.03);
    expect(1 - e.central / t.mass.truthEarth).toBeLessThan(0.05);
  });
  test('an eccentricity of 0.010 moves the inner amplitude 45 percent either way, the outer one -73 to +127', () => {
    const a = timingView({ system: 0, planet: 0, view: 1, zfree: 0.01 }).spread;
    expect(100 * (a.min - 1)).toBeCloseTo(-45, 0);
    expect(100 * (a.max - 1)).toBeCloseTo(45, 0);
    const b = timingView({ system: 0, planet: 1, view: 1, zfree: 0.01 }).spread;
    expect(100 * (b.min - 1)).toBeCloseTo(-73, 0);
    expect(100 * (b.max - 1)).toBeCloseTo(127, 0);
  });
  test('a mass is refused where the relation is, and never given without the assumption', () => {
    const far = timingView({ system: 2, planet: 0, view: 1 });
    expect(far.mass.status).toBe('refused');
    const rows = TTV_WIDGETS[1].readout({ system: 0, planet: 0, view: 1 });
    expect(rows.some(r => /circular/i.test(r.value))).toBe(true);
  });
});

describe('the lesson is graded and structured', () => {
  test('every question has an answer inside its options, and every measure a validator', () => {
    for (const s of all) {
      if (s.options) {
        expect(Number.isInteger(s.answer)).toBe(true);
        expect(s.answer).toBeGreaterThanOrEqual(0);
        expect(s.answer).toBeLessThan(s.options.length);
      }
      if (s.type === 'measure') expect(typeof s.validate).toBe('function');
    }
  });
  test('the deeper steps hang on core steps or each other, at their own depth', () => {
    const sids = new Set(all.map(s => s.sid));
    for (const s of DEEP.steps) {
      expect(['quantitative', 'advanced']).toContain(s.depth);
      expect(sids.has(s.after)).toBe(true);
    }
  });
  test('every step names a panel that exists and values its controls can take', () => {
    for (const s of all) {
      const w = TTV_WIDGETS.find(x => x.id === s.tool.id);
      expect(w).toBeTruthy();
      const ids = w.controls.map(c => c.id);
      for (const k of Object.keys(s.tool.values)) expect(ids).toContain(k);
    }
  });
  test('instructor material exists for the lesson, and its expectations name graded steps', () => {
    const id = 'the-clock-that-drifts';
    expect(INSTRUCTOR.content[id]).toBeTruthy();
    expect(INSTRUCTOR.flow[id]).toBeTruthy();
    expect(INSTRUCTOR.bands[id]).toBeTruthy();
    for (const sid of Object.keys(INSTRUCTOR.expectations[id]))
      expect(step(sid).type).toBe('measure');
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
  test('the lesson and its deeper steps', () => {
    same(LESSON, LESSON_ES);
    same(DEEP, DEEP_ES);
  });
});

describe('the panels', () => {
  test('two widgets, each with controls and a readout that states what it leaves out', () => {
    expect(TTV_WIDGETS.map(w => w.id)).toEqual(['ttv-transit', 'ttv-timing']);
    for (const w of TTV_WIDGETS) {
      expect(w.controls.length).toBeGreaterThan(1);
      const rows = w.readout({});
      expect(rows.some(r => r.emphasis)).toBe(true);
      expect(rows[rows.length - 1].value).toMatch(/\S/);
    }
  });
  test('the noisy transit setting says its error bar is a lower bound', () => {
    const rows = TTV_WIDGETS[0].readout({
      system: 0,
      planet: 0,
      transit: 40,
      noise: 1,
    });
    expect(rows.some(r => /lower bound/.test(r.value))).toBe(true);
  });
});
