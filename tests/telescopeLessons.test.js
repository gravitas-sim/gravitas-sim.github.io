/**
 * @jest-environment jsdom
 */
// =============================================================================
// What a Telescope Resolves (Roadmap III, Prompt 208)
// -----------------------------------------------------------------------------
// Every number the lesson's steps state is recomputed here from the instrument
// (js/telescopeWidgets.js over the optics kernel and Prompt 183's PSF tool), the
// lesson's own validators accept the values the instrument gives and refuse a
// wrong one, the Spanish parallels the English step for step, and the claim rule
// of the committed thresholds holds over every string of both languages.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import {
  WHAT_A_TELESCOPE_RESOLVES as EN,
  WHAT_A_TELESCOPE_RESOLVES_DEEPER as DEEP,
  WHAT_A_TELESCOPE_RESOLVES_ES as ES,
  WHAT_A_TELESCOPE_RESOLVES_DEEPER_ES as DEEP_ES,
  INSTRUCTOR,
} from '../js/data/investigations/telescope-sequence.js';
import { telescopeView, EXPOSURES_S } from '../js/telescopeWidgets.js';

const THR = JSON.parse(
  readFileSync('tests/fixtures/telescopes/thresholds.json', 'utf8')
);
const base = {
  focal: 12,
  wavelength: 550,
  seeing: 0.6,
  obstruction: 0,
  exposure: 3,
  scene: 0,
  separation: 1,
};
const view = (aperture, o = {}) => telescopeView({ ...base, aperture, ...o });
const step = (lesson, sid) =>
  [...lesson.steps, ...DEEP.steps].find(s => s.sid === sid);

describe('the numbers the lesson states', () => {
  test('the dips at 10, 20 and 40 cm', () => {
    const d = [1, 2, 4].map(a => 100 * view(a).pair.dip);
    expect(d[0]).toBeLessThan(0.5);
    expect(d[1]).toBeCloseTo(26.8, 0);
    expect(d[2]).toBeCloseTo(50.3, 0);
    expect(
      step(EN, 'dips').validate({ d10: d[0], d20: d[1], d40: d[2] }).level
    ).toBe('ok');
    expect(step(EN, 'dips').validate({ d10: 20, d20: 27, d40: 50 }).level).toBe(
      'error'
    );
  });
  test('the exposures at which the faint star is listed', () => {
    const first = a => {
      for (let e = 0; e < EXPOSURES_S.length; e++)
        if (
          telescopeView({
            ...base,
            seeing: 1,
            aperture: a,
            exposure: e,
            scene: 1,
          }).faint.detected
        )
          return EXPOSURES_S[e];
      return null;
    };
    expect([1, 2, 4].map(first)).toEqual([600, 120, 60]);
    expect(
      step(EN, 'faint-appears').validate({ t10: 600, t20: 120, t40: 60 }).level
    ).toBe('ok');
  });
  test('the measured width and the Rayleigh separation at 20 cm', () => {
    const m = view(2);
    expect(m.measuredFwhmArcsec).toBeGreaterThan(0.74);
    expect(m.measuredFwhmArcsec).toBeLessThan(0.8);
    expect(m.rayleighArcsec).toBeCloseTo(0.692, 2);
    expect(m.rayleighArcsec).not.toBeCloseTo(m.measuredFwhmArcsec, 1);
    expect(
      step(EN, 'measure-the-width').validate({
        w: m.measuredFwhmArcsec,
        s: m.measuredFwhmSigmaArcsec,
      }).level
    ).toBe('ok');
    const r = step(EN, 'rayleigh-by-hand');
    const v = { d: 20, wl: 550 };
    v.r = r.fields[2].compute(v);
    expect(r.validate(v).level).toBe('ok');
  });
  test('seeing sets a floor, space follows the aperture, and the crossover', () => {
    const w = (a, o) =>
      view(a, { seeing: 1, focal: a >= 7 ? 6 : 12, ...o }).truthFwhmArcsec;
    expect([w(2), w(6), w(8)].map(x => Math.round(100 * x) / 100)).toEqual([
      1.19, 1.03, 1.01,
    ]);
    expect(
      step(DEEP, 'seeing-sets-a-floor').validate({
        w20: w(2),
        w100: w(6),
        w400: w(8),
      }).level
    ).toBe('ok');
    const a = (ap, f) => view(ap, { seeing: 0, focal: f }).airyFwhmArcsec;
    expect(a(6, 12)).toBeCloseTo(0.117, 3);
    expect(a(8, 6)).toBeCloseTo(0.029, 3);
    expect(
      step(DEEP, 'why-space-does').validate({ a100: a(6, 12), a400: a(8, 6) })
        .level
    ).toBe('ok');
    const c = step(DEEP, 'the-crossover');
    const v = { see: 1, wl: 550 };
    v.dc = c.fields[2].compute(v);
    expect(v.dc).toBeCloseTo(11.67, 1);
    expect(c.validate(v).level).toBe('ok');
  });
  test('without the atmosphere the FWHM is not the Rayleigh separation (a ratio of 1.185)', () => {
    const m = view(2, { seeing: 0 });
    expect(m.rayleighArcsec / m.airyFwhmArcsec).toBeCloseTo(1.1853, 3);
  });
});

describe('the lesson’s structure', () => {
  test('every step has a sid, the synthetic frame is said, and the deeper steps hang on core steps', () => {
    const sids = [...EN.steps, ...DEEP.steps].map(s => s.sid);
    expect(new Set(sids).size).toBe(sids.length);
    expect(EN.steps[0].body).toMatch(/synthetic/);
    for (const s of DEEP.steps) expect(sids).toContain(s.after);
    expect(EN.depths).toEqual(['core', 'quantitative', 'advanced']);
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
      INSTRUCTOR.content['what-a-telescope-resolves'].misconceptions.some(m =>
        /magnification/i.test(m.claim)
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
describe('the claim rule: the FWHM is not the resolution limit, and magnification is not what a telescope is for', () => {
  const rule = THR.claimRule;
  const hit = (text, lang) =>
    rule.forbidden[lang].some(p => new RegExp(p, 'iu').test(text));
  test('the patterns catch the bad controls and pass the permitted ones', () => {
    for (const b of rule.badControls)
      expect(hit(b, /[áéíóúñ]/.test(b) || /^El /.test(b) ? 'es' : 'en')).toBe(
        true
      );
    for (const g of rule.permittedControls)
      expect(
        hit(g, /[áéíóúñ]/.test(g) || /^El |^La /.test(g) ? 'es' : 'en')
      ).toBe(false);
  });
  test('no string of the lesson, its Spanish or its guide trips it', () => {
    const en = [...strings(EN), ...strings(DEEP), ...strings(INSTRUCTOR)];
    expect(en.filter(s => hit(s, 'en'))).toEqual([]);
    const es = [...strings(ES), ...strings(DEEP_ES)];
    expect(es.filter(s => hit(s, 'es'))).toEqual([]);
  });
});
