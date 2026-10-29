/**
 * @jest-environment jsdom
 */
// =============================================================================
// The Saturated Star (Roadmap III, Prompt 211)
// -----------------------------------------------------------------------------
// Every number the lesson's steps state is recomputed here from the instrument
// (js/effectsWidgets.js over the detector kernel's effects and Prompt 180's
// photometry), the lesson's own validators accept the values the instrument gives
// and refuse a wrong one, the Spanish parallels the English step for step, and the
// statement rule of the committed thresholds holds over every string.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import {
  THE_SATURATED_STAR as EN,
  THE_SATURATED_STAR_DEEPER as DEEP,
  THE_SATURATED_STAR_ES as ES,
  THE_SATURATED_STAR_DEEPER_ES as DEEP_ES,
  INSTRUCTOR,
} from '../js/data/investigations/saturated-star-sequence.js';
import { effectsView, configOf, readoutRows } from '../js/effectsWidgets.js';

const base = {
  bright: 9.5,
  exposure: 3,
  nonlinear: 0,
  bleed: 0,
  cosmic: 0,
  fwhm: 2.8,
  flags: 1,
};
const view = (o = {}) => effectsView({ ...base, ...o });
const row = (m, id) => m.rows.find(r => r.id === id);
const step = sid => [...EN.steps, ...DEEP.steps].find(s => s.sid === sid);

describe('the numbers the lesson states', () => {
  test('the clipped star reads 30 percent of the true flux, 1.3 magnitudes too faint', () => {
    const m = view();
    const s = row(m, 'S');
    expect(s.code).toBe('saturated');
    const r = 100 * s.ignored.ratio;
    expect(r).toBeGreaterThan(28.2);
    expect(r).toBeLessThan(32.2);
    expect(step('clipped-star').validate({ r }).level).toBe('ok');
    expect(step('clipped-star').validate({ r: 90 }).level).toBe('error');
    const dm = 2.5 * Math.log10(100 / r);
    expect(
      step('magnitude-error').validate({ r: Math.round(r), dm }).level
    ).toBe('ok');
    expect(step('magnitude-error').validate({ r: 90, dm: 0.1 }).level).toBe(
      'error'
    );
    expect(step('magnitude-error').fields[1].compute({ r })).toBeCloseTo(dm, 9);
  });
  test('bleeding refuses the two faint stars on the column and feeds 85 pixels', () => {
    const m = view({ bleed: 1 });
    expect(['N1', 'N2'].map(i => row(m, i).code)).toEqual(['masked', 'masked']);
    expect(row(m, 'C').code).toBeUndefined();
    expect(Math.abs(row(m, 'C').pull)).toBeLessThan(3);
    const p = m.result.frame.truth.effects.bleed.pixels;
    expect(p).toBe(85);
    expect(step('trail').validate({ k: 2, p }).level).toBe('ok');
    expect(step('trail').validate({ k: 3, p }).level).toBe('error');
    expect(view({ bleed: 0 }).rows.filter(r => r.code === 'masked')).toEqual(
      []
    );
  });
  test('a cosmic-ray track refuses the stars it crosses', () => {
    const m = view({ cosmic: 1, bright: 13 });
    expect(m.rows.filter(r => r.code === 'masked').map(r => r.id)).toEqual([
      'S',
      'L5',
    ]);
  });
  test('the linear limit, the plateau and the brightest star still measured', () => {
    const m = view({ nonlinear: 1, bright: 12.5 });
    const fx = m.result.frame.truth.effects;
    expect(fx.linearLimitElectrons).toBeCloseTo(45330.04, 1);
    expect(fx.plateauElectrons).toBeCloseTo(47615.94, 1);
    expect(
      step('linear-limit').validate({
        lim: Math.round(fx.linearLimitElectrons),
        plateau: Math.round(fx.plateauElectrons),
      }).level
    ).toBe('ok');
    expect(step('linear-limit').fields[2].compute({ lim: 45330 })).toBeCloseTo(
      90.66,
      2
    );
    const measured = mag =>
      view({ nonlinear: 1, bright: mag }).rows.find(r => r.id === 'S').net !==
      undefined;
    expect(measured(12.5)).toBe(true);
    expect(measured(12)).toBe(false);
    expect(step('brightest-measured').validate({ m: 12.5 }).level).toBe('ok');
    expect(step('brightest-measured').validate({ m: 12 }).level).toBe('error');
  });
  test('the safe flux from the largest peak share', () => {
    const m = view({ nonlinear: 1, bright: 12.5 });
    expect(100 * m.phase.peakMax).toBeCloseTo(10.62, 2);
    const s = step('safe-flux');
    const v = { share: Math.round(100 * m.phase.peakMax) };
    v.f = s.fields[1].compute(v);
    v.m = s.fields[2].compute(v);
    expect(s.validate(v).level).toBe('ok');
    const w = { share: 9 };
    w.m = s.fields[2].compute(w);
    expect(s.validate(w).level).toBe('error');
    // the star of that brightness really is the edge of what the tool measures
    expect(
      view({ nonlinear: 1, bright: 12.5 }).rows.find(r => r.id === 'S').net
    ).toBeDefined();
    expect(
      view({ nonlinear: 1, bright: 12 }).rows.find(r => r.id === 'S').code
    ).toBe('saturated');
  });
  test('the peak share and the aperture scatter, by width', () => {
    const a = view({ fwhm: 1.2 }).phase;
    const b = view({ fwhm: 2.8 }).phase;
    const p = (x, k) => Math.round(100 * x[k]);
    const v = {
      lo12: p(a, 'peakMin'),
      hi12: p(a, 'peakMax'),
      lo28: p(b, 'peakMin'),
      hi28: p(b, 'peakMax'),
    };
    expect(v).toEqual({ lo12: 24, hi12: 45, lo28: 9, hi28: 11 });
    expect(step('phase-dependence').validate(v).level).toBe('ok');
    expect(step('phase-dependence').validate({ ...v, hi12: 30 }).level).toBe(
      'error'
    );
    const s = {
      s12: Math.round(1000 * 100 * a.apRelStd) / 1000,
      s28: Math.round(1000 * 100 * b.apRelStd) / 1000,
    };
    s.ratio = step('aperture-scatter').fields[2].compute(s);
    expect(s).toMatchObject({ s12: 0.271, s28: 0.035 });
    expect(step('aperture-scatter').validate(s).level).toBe('ok');
    expect(a.peakMax / a.peakMin).toBeGreaterThan(1.5);
    expect(b.peakMax / b.peakMin).toBeLessThan(1.25);
  });
  test('the readout carries the rows a step reads, as the table alternative to the picture', () => {
    const rows = readoutRows({ ...base, nonlinear: 1, fwhm: 1.2 });
    const labels = rows.map(r => r.label);
    expect(labels).toContain('Linear limit');
    expect(labels).toContain('Star S');
    expect(labels).toContain('Sampling');
    expect(rows.find(r => r.label === 'Sampling').value).toMatch(
      /undersampled.*24 to 45 percent.*0\.271 percent/
    );
  });
});

describe('the config', () => {
  test('the controls mean what the lesson says', () => {
    expect(configOf({ exposure: 3 }).exposureS).toBe(60);
    expect(configOf({ nonlinear: 1 }).nonlinearity).toBe(true);
    expect(configOf({}).fwhmPx).toBe(2.8);
  });
});

describe('the lesson’s structure', () => {
  test('every step has a sid, the synthetic frame is said, and the deeper steps hang on core steps', () => {
    const sids = [...EN.steps, ...DEEP.steps].map(s => s.sid);
    expect(new Set(sids).size).toBe(sids.length);
    expect(EN.steps[0].body).toMatch(/synthetic/);
    for (const s of DEEP.steps) expect(sids).toContain(s.after);
    expect(EN.depths).toEqual(['core', 'quantitative', 'advanced']);
    expect(DEEP.steps.map(s => s.depth)).toEqual([
      'quantitative',
      'quantitative',
      'quantitative',
      'quantitative',
      'quantitative',
      'advanced',
      'advanced',
      'advanced',
      'advanced',
      'advanced',
    ]);
  });
  test('the Spanish parallels the English step for step and field for field', () => {
    expect(ES.steps.length).toBe(EN.steps.length);
    expect(DEEP_ES.steps.length).toBe(DEEP.steps.length);
    const pairs = [
      ...EN.steps.map((s, i) => [s, ES.steps[i]]),
      ...DEEP.steps.map((s, i) => [s, DEEP_ES.steps[i]]),
    ];
    for (const [en, es] of pairs) {
      expect(es.title).toBeTruthy();
      expect((es.fields ?? []).length).toBe((en.fields ?? []).length);
      expect((es.options ?? []).length).toBe((en.options ?? []).length);
      expect((es.misconceptions ?? []).length).toBe(
        (en.misconceptions ?? []).length
      );
    }
    expect(
      INSTRUCTOR.content['the-saturated-star'].misconceptions.some(m =>
        /bright star is easy/i.test(m.claim)
      )
    ).toBe(true);
  });
});

const strings = o =>
  typeof o === 'string'
    ? [o]
    : o && typeof o === 'object'
      ? Object.values(o).flatMap(strings)
      : [];
describe('the statement rule: the effects are stated models of a synthetic detector', () => {
  const forbidden = [
    /\b(real|actual) (detectors?|CCDs?|cameras?)\s+(follow|behave|respond)\b/i,
    /\bvalidated (on|against) (real|authentic) (data|frames?)\b/i,
    /\bthe (response|curve) of (a|any|every) (real )?(CCD|detector) is\b/i,
  ];
  test('no string of the lesson, its Spanish or its guide trips it', () => {
    const all = [
      ...strings(EN),
      ...strings(DEEP),
      ...strings(INSTRUCTOR),
      ...strings(ES),
      ...strings(DEEP_ES),
    ];
    expect(all.filter(s => forbidden.some(p => p.test(s)))).toEqual([]);
  });
  test('the response step says the curve is a model choice and the first step says the frame is synthetic', () => {
    expect(step('the-response').body).toMatch(/a model choice/);
    expect(step('a-bright-star').body).toMatch(/synthetic/);
  });
});
