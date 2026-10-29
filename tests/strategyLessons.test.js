// =============================================================================
// The strategy lessons, in two languages (Roadmap III, Prompt 214)
// -----------------------------------------------------------------------------
// Every number a step states is recomputed from the panels the lesson draws
// (js/strategyWidgets.js over js/strategyField.js and js/kernels/strategy/), read
// in the form the validator takes and fed to the step's own validator; the Spanish
// carries the same step structure; the three advanced steps Design the Schedule
// gains are recomputed too, and its core steps are held unchanged.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
// The shared kernel modules first: Jest's VM loses a module several imports link at once.
import '../js/kernels/strategy/index.js';
import { windowView, planView } from '../js/strategyField.js';
import { STRATEGY_WIDGETS } from '../js/strategyWidgets.js';
import {
  WHY_THE_PERIOD_IS_WRONG as LESSON,
  WHY_THE_PERIOD_IS_WRONG_ES as LESSON_ES,
  WHY_THE_PERIOD_IS_WRONG_DEEPER as DEEP,
  WHY_THE_PERIOD_IS_WRONG_DEEPER_ES as DEEP_ES,
  DESIGN_THE_SCHEDULE_DEEPER as DTS,
  DESIGN_THE_SCHEDULE_DEEPER_ES as DTS_ES,
} from '../js/data/investigations/strategy-sequence.js';
import DESIGN_THE_SCHEDULE from '../js/data/investigations/design-the-schedule.js';

const all = [...LESSON.steps, ...DEEP.steps, ...DTS.steps];
const step = sid => all.find(s => s.sid === sid);
const win = (v = {}) =>
  windowView({ cadence: 0, period: 0.8, nights: 40, snr: 5, ...v });
const alias = (m, near) =>
  m.verdict.aliases.find(a => Math.abs(a.period - near) < 0.2);
const pct = a => 100 * a.power;

describe('Why the Period Is Wrong: the numbers the steps state', () => {
  test('one visit a night is an exact comb: 4.04 days and a preference of 0', () => {
    const m = win();
    const a = alias(m, 4.04);
    expect(m.verdict.verdict).toBe('ambiguous');
    expect(
      step('the-aliases').validate({ p: a.period, x: a.dchi2 }).level
    ).toBe('ok');
    expect(m.verdict.aliases.slice(0, 3).map(x => x.period.toFixed(3))).toEqual(
      ['0.444', '4.044', '0.307']
    );
    expect(step('the-aliases').validate({ p: 1, x: 0 }).level).toBe('error');
  });
  test('three visits a night: about 67 percent and a preference of 491', () => {
    const m = win({ cadence: 1 });
    expect(m.verdict.verdict).toBe('resolved');
    const w = m.verdict.aliases[0];
    expect(
      step('break-the-tie').validate({ h: pct(w), x: w.dchi2 }).level
    ).toBe('ok');
  });
  test('the search on the exact comb returns 0.266 days, an alias', () => {
    const m = win({ series: 1 });
    expect(m.series.period).toBeCloseTo(0.266, 3);
    expect(m.series.rightLobe).toBe(false);
  });
  test('a varying clock time: 77 percent and 116', () => {
    const m = win({ cadence: 2 });
    const a = m.verdict.aliases[0];
    expect(
      step('design-a-cadence').validate({ h: pct(a), x: a.dchi2 }).level
    ).toBe('ok');
  });
  test('three of five cadences resolve the period', () => {
    const n = [0, 1, 2, 3, 4].filter(
      c => win({ cadence: c }).verdict.verdict === 'resolved'
    ).length;
    expect(step('how-many-resolve').validate({ n }).level).toBe('ok');
    expect(n).toBe(3);
  });
  test('the series from three visits a night: 0.8004 and its uncertainty', () => {
    const m = win({ cadence: 1, series: 1 });
    expect(m.series.rightLobe).toBe(true);
    expect(
      step('verify-on-a-series').validate({
        p: m.series.period,
        s: m.series.sigmaPeriod,
      }).level
    ).toBe('ok');
    const z = Math.abs(m.series.period - 0.8) / m.series.sigmaPeriod;
    expect(z).toBeGreaterThan(1.4);
    expect(z).toBeLessThan(1.8);
  });
  test('the width of a peak and the phase coverage', () => {
    const m = win();
    expect(
      step('window-width').validate({ T: m.baseline, r: 1 / m.baseline }).level
    ).toBe('ok');
    const a = win();
    const b = win({ period: 1 });
    expect(
      step('phase-coverage').validate({
        c8: a.coverage.covered,
        g8: a.coverage.largestGap,
        c1: b.coverage.covered,
        g1: b.coverage.largestGap,
      }).level
    ).toBe('ok');
  });
  test('the cost of the 14-night plan and its verdict', () => {
    const p = planView({});
    const c = p.plan.cost;
    expect(
      step('what-a-plan-costs').validate({
        r: c.requestedHours,
        e: c.executedHours,
        l: c.requestedHours - c.executedHours,
      }).level
    ).toBe('ok');
    const three = planView({ run: 1 });
    const one = planView({ run: 1, perNight: 1 });
    expect(
      step('the-plan-and-the-verdict').validate({
        x3: three.verdict.worst.dchi2,
        x1: one.verdict.worst.dchi2,
      }).level
    ).toBe('ok');
    expect(one.verdict.verdict).toBe('ambiguous');
    expect(three.verdict.verdict).toBe('resolved');
    expect(three.series.rightLobe).toBe(true);
  });
});

describe('Design the Schedule: the new advanced steps', () => {
  test('one visit a night at 3.5 days, then three visits', () => {
    const a = win({ period: 3.5, nights: 24 });
    const al = alias(a, 1.4);
    expect(
      step('the-site-sets-the-comb').validate({ p: al.period, x: al.dchi2 })
        .level
    ).toBe('ok');
    const b = win({ cadence: 1, period: 3.5, nights: 24 });
    const w = b.verdict.aliases[0];
    expect(
      step('an-irregular-night-costs-nothing').validate({
        h: pct(w),
        x: w.dchi2,
      }).level
    ).toBe('ok');
  });
  test('its core steps are untouched, and only advanced steps were added', () => {
    expect(DESIGN_THE_SCHEDULE.depths).toEqual(['core', 'advanced']);
    expect(DESIGN_THE_SCHEDULE.steps).toHaveLength(15);
    expect(DTS.steps.every(s => s.depth === 'advanced')).toBe(true);
    const sids = DESIGN_THE_SCHEDULE.steps.map(s => s.sid);
    for (const s of DTS.steps) expect(sids).toContain(s.after);
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
  test('the lesson, its deeper steps and the Design the Schedule steps', () => {
    same(LESSON, LESSON_ES);
    same(DEEP, DEEP_ES);
    same(DTS, DTS_ES);
  });
});

describe('the panels', () => {
  test('two widgets, each with controls and a readout of the model and what it leaves out', () => {
    expect(STRATEGY_WIDGETS.map(w => w.id)).toEqual([
      'strategy-window',
      'strategy-plan',
    ]);
    for (const w of STRATEGY_WIDGETS) {
      expect(w.controls.length).toBeGreaterThan(3);
      const rows = w.readout({});
      expect(rows.some(r => r.emphasis)).toBe(true);
      expect(rows[rows.length - 1].value).toMatch(/\S/);
    }
  });
});
