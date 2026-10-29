/**
 * @jest-environment jsdom
 */
// =============================================================================
// Counts to Magnitudes (Roadmap III, Prompt 212)
// -----------------------------------------------------------------------------
// Every number the lesson's steps state is recomputed here from the instrument
// (js/photcalWidgets.js over the calibration kernel), the lesson's own validators
// accept the values the instrument gives and refuse a wrong one, the Spanish
// parallels the English step for step, and the distinction of the committed
// thresholds holds over every string: the extinction of the lesson is the
// atmosphere's, never the interstellar dust's.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import {
  COUNTS_TO_MAGNITUDES as EN,
  COUNTS_TO_MAGNITUDES_DEEPER as DEEP,
  COUNTS_TO_MAGNITUDES_ES as ES,
  COUNTS_TO_MAGNITUDES_DEEPER_ES as DEEP_ES,
  INSTRUCTOR,
} from '../js/data/investigations/photometric-calibration-sequence.js';
import { calibrationView, TARGET } from '../js/photcalWidgets.js';

const base = {
  night: 0,
  stars: 14,
  noise: 5,
  reach: 2.4,
  model: 0,
  prior: 0,
  view: 0,
  cindex: 0.8,
  airmass: 1.9,
  truth: 0,
};
const view = (o = {}) => calibrationView({ ...base, ...o });
const step = sid => [...EN.steps, ...DEEP.steps].find(s => s.sid === sid);
const r = (x, d) => Math.round(x * 10 ** d) / 10 ** d;

describe('the numbers the lesson states', () => {
  test('the slope of the clear night is the extinction, and the night says what it was made with', () => {
    const m = view();
    const k = m.solution.parameters.k;
    expect(k.value).toBeCloseTo(0.2129, 4);
    expect(k.sigma).toBeCloseTo(0.0029, 4);
    expect(m.night.truth.k).toBe(0.21);
    const dm = step('bouguer').fields[1].compute({ k: r(k.value, 3) });
    expect(dm).toBeCloseTo(0.298, 2);
    expect(step('bouguer').validate({ k: r(k.value, 3), dm }).level).toBe('ok');
    expect(step('bouguer').validate({ k: 0.5, dm: 0.7 }).level).toBe('error');
    // the prediction: 2.15 is 1.1 airmasses above 1.05
    expect(1.1 * k.value).toBeGreaterThan(0.2);
    expect(1.1 * k.value).toBeLessThan(0.3);
  });
  test('the zero point at airmass 1 and outside the atmosphere', () => {
    const s = view().solution.parameters;
    expect(s.Z1.value).toBeCloseTo(24.8029, 4);
    expect(s.Z1.sigma).toBeCloseTo(0.0031, 4);
    const z = step('the-zero-point');
    const v = { z: r(s.Z1.value, 3), k: r(s.k.value, 3) };
    v.z0 = z.fields[2].compute(v);
    expect(v.z0).toBeCloseTo(24.59, 2);
    expect(z.validate(v).level).toBe('ok');
    expect(z.validate({ z: 23, k: 0.2 }).level).toBe('error');
  });
  test('the target calibrates within its error of the truth', () => {
    const m = view({ truth: 1 });
    const c = m.calibrated;
    expect(c.ok).toBe(true);
    expect(c.M).toBeCloseTo(13.2031, 4);
    expect(c.sigma).toBeCloseTo(0.0082, 4);
    expect(Math.abs(c.M - TARGET.M)).toBeLessThan(c.sigma);
    const s = step('calibrate-a-target');
    const v = { M: r(c.M, 3), s: r(c.sigma, 3) };
    expect(s.fields[2].compute(v)).toBeCloseTo(0.016, 3);
    expect(s.validate(v).level).toBe('ok');
    expect(s.validate({ M: 13.5, s: 0.1 }).level).toBe('error');
  });
  test('above airmass 2.5 six measurements are left out and a target there is refused', () => {
    const m = view({ reach: 3 });
    expect(m.solution.excluded.length).toBe(6);
    expect(m.solution.parameters.k.value).toBeCloseTo(0.2095, 4);
    expect(
      step('the-airmass-limit').validate({
        n: m.solution.excluded.length,
        k: r(m.solution.parameters.k.value, 3),
      }).level
    ).toBe('ok');
    expect(step('the-airmass-limit').validate({ n: 0, k: 0.213 }).level).toBe(
      'error'
    );
    const refused = view({ airmass: 3 }).calibrated;
    expect(refused).toMatchObject({
      ok: false,
      code: 'airmass-above-limit',
      limit: 2.5,
    });
    expect(view({ airmass: 2.4 }).calibrated.ok).toBe(true);
  });
  test('a night of one airmass leaves the extinction and the zero point open and gives no number', () => {
    const m = view({ night: 1 });
    const p = m.solution.parameters;
    expect(p.k.value).toBeNull();
    expect(p.Z1.value).toBeNull();
    expect(p.k.status).toBe('not-constrained');
    expect(m.calibrated).toMatchObject({
      ok: false,
      code: 'extinction-not-constrained',
    });
    expect(p.c.value).toBeCloseTo(0.0788, 4);
    const lo = Math.min(...m.solution.residuals.map(x => x.X));
    const hi = Math.max(...m.solution.residuals.map(x => x.X));
    expect([r(lo, 2), r(hi, 2)]).toEqual([1.3, 1.42]);
    const s = step('narrow-night');
    const v = { lo: r(lo, 2), hi: r(hi, 2), c: r(p.c.value, 3) };
    expect(s.fields[2].compute(v)).toBeCloseTo(0.12, 9);
    expect(s.validate(v).level).toBe('ok');
    expect(s.validate({ ...v, hi: 2.4 }).level).toBe('error');
  });
  test('a cited coefficient calibrates the narrow night, flagged, with an assumed sigma', () => {
    const m = view({ night: 1, prior: 1 });
    const c = m.calibrated;
    expect(c.ok).toBe(true);
    expect(c.M).toBeCloseTo(13.2202, 4);
    expect(c.sigma).toBeCloseTo(0.0115, 4);
    expect(c.flags.map(f => f.code)).toContain('extinction-from-prior');
    expect(m.site).toMatchObject({ k: 0.126, assumedSigma: true });
    expect(m.solution.parameters.k.value).toBeCloseTo(0.1811, 4);
    const iv = c.intervals[1];
    expect(iv.lo).toBeLessThan(13.2);
    expect(iv.hi).toBeGreaterThan(13.2);
    expect(r(iv.lo, 3)).toBe(13.198);
    expect(r(iv.hi, 3)).toBe(13.243);
    const s = step('a-cited-coefficient');
    const v = { M: r(c.M, 3), s: r(c.sigma, 4) };
    expect(s.fields[2].compute(v)).toBeCloseTo(0.02, 2);
    expect(s.validate(v).level).toBe('ok');
    expect(s.validate({ M: 13.3, s: 0.01 }).level).toBe('error');
  });
  test('two standards leave the colour term open; three bring the error down nine times', () => {
    const a = view({ stars: 2 });
    const b = view({ stars: 3 });
    expect(a.solution.parameters.c.status).toBe('not-constrained');
    expect(b.solution.parameters.c.status).toBe('constrained');
    expect(a.calibrated.sigma).toBeCloseTo(0.0812, 4);
    expect(b.calibrated.sigma).toBeCloseTo(0.0088, 4);
    const s = step('how-few-standards');
    const v = { s2: r(a.calibrated.sigma, 4), s3: r(b.calibrated.sigma, 4) };
    expect(s.fields[2].compute(v)).toBeCloseTo(9.2, 1);
    expect(s.validate(v).level).toBe('ok');
    expect(s.validate({ s2: 0.01, s3: 0.0088 }).level).toBe('error');
  });
  test('the colour-dependent night: the nested test, the second-order term and the blue target', () => {
    const first = view({ night: 2 });
    const second = view({ night: 2, model: 1 });
    expect(first.solution.secondOrder.deltaChi2).toBeCloseTo(67.8, 1);
    expect(first.solution.secondOrder.p).toBeLessThan(1e-12);
    expect(first.solution.flags.map(f => f.code)).toEqual(
      expect.arrayContaining(['lack-of-fit', 'second-order-extinction-suspected'])
    );
    expect(second.solution.parameters.k2.value).toBeCloseTo(-0.0466, 4);
    expect(second.solution.parameters.k2.sigma).toBeCloseTo(0.0057, 4);
    expect(second.solution.p).toBeGreaterThan(0.6);
    const so = step('second-order');
    const dv = {
      dchi: r(first.solution.secondOrder.deltaChi2, 1),
      k2: r(second.solution.parameters.k2.value, 3),
    };
    expect(so.validate(dv).level).toBe('ok');
    expect(so.validate({ dchi: 1, k2: 0 }).level).toBe('error');
    const b1 = view({ night: 2, cindex: -0.2 }).calibrated;
    const b2 = view({ night: 2, cindex: -0.2, model: 1 }).calibrated;
    expect(b1.M).toBeCloseTo(13.2149, 4);
    expect(b2.M).toBeCloseTo(13.2019, 4);
    expect(Math.abs(b1.M - 13.2)).toBeGreaterThan(Math.abs(b2.M - 13.2));
    const bs = step('a-blue-target');
    const v = { m1: r(b1.M, 3), m2: r(b2.M, 3) };
    expect(bs.fields[2].compute(v)).toBeCloseTo(0.013, 3);
    expect(bs.validate(v).level).toBe('ok');
    expect(bs.validate({ m1: 13.2, m2: 13.2 }).level).toBe('error');
  });
  test('the bigger model costs precision where the night does not need it', () => {
    const f = view().solution.parameters;
    const s = view({ model: 1 }).solution.parameters;
    expect(f.k.sigma).toBeCloseTo(0.0029, 4);
    expect(s.k.sigma).toBeCloseTo(0.0047, 4);
    expect(Math.abs(s.k2.value)).toBeLessThan(s.k2.sigma);
  });
  test('the clear night carries no flag of the kind the lesson shows on others', () => {
    const m = view();
    expect(m.solution.flags).toEqual([]);
    expect(m.solution.secondOrder.detected).toBe(false);
  });
});

describe('the lesson’s structure', () => {
  test('every step has a sid, the night is said to be synthetic, and the deeper steps hang on core steps', () => {
    const sids = [...EN.steps, ...DEEP.steps].map(s => s.sid);
    expect(new Set(sids).size).toBe(sids.length);
    expect(EN.steps[0].body).toMatch(/synthetic/);
    for (const s of DEEP.steps) expect(sids).toContain(s.after);
    expect(EN.depths).toEqual(['core', 'quantitative', 'advanced']);
    expect(DEEP.steps.filter(s => s.depth === 'quantitative').length).toBe(8);
    expect(DEEP.steps.filter(s => s.depth === 'advanced').length).toBe(5);
    expect(EN.steps.length).toBe(6);
  });
  test('every control a step hides exists and every set value is one the panel takes', () => {
    const ids = [
      'night',
      'stars',
      'noise',
      'reach',
      'model',
      'prior',
      'view',
      'cindex',
      'airmass',
      'truth',
    ];
    for (const s of [...EN.steps, ...DEEP.steps]) {
      expect(s.tool.id).toBe('photometric-calibration');
      for (const h of s.tool.hide) expect(ids).toContain(h);
      for (const k of Object.keys(s.tool.values)) expect(ids).toContain(k);
    }
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
      expect((es.hints ?? []).length).toBe((en.hints ?? []).length);
      expect((es.misconceptions ?? []).length).toBe(
        (en.misconceptions ?? []).length
      );
    }
    expect(ES.objectives.length).toBe(EN.objectives.length);
  });
  test('the guide’s expectations name steps that exist and carry the numbers the instrument gives', () => {
    const sids = [...EN.steps, ...DEEP.steps].map(s => s.sid);
    const ex = INSTRUCTOR.expectations['counts-to-magnitudes'];
    for (const k of Object.keys(ex)) expect(sids).toContain(k);
    for (const f of INSTRUCTOR.flow['counts-to-magnitudes']) {
      expect(sids).toContain(f.from);
      expect(sids).toContain(f.to);
    }
    expect(
      INSTRUCTOR.content['counts-to-magnitudes'].misconceptions.some(m =>
        /dust of the galaxy/i.test(m.claim)
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
describe('the distinction: atmospheric extinction is not interstellar extinction', () => {
  const all = [
    ...strings(EN),
    ...strings(DEEP),
    ...strings(INSTRUCTOR),
    ...strings(ES),
    ...strings(DEEP_ES),
  ];
  test('no string uses A_V or the interstellar law for the night’s k', () => {
    const forbidden = [
      /\bA_V\b.*\bk\b.*\bairmass\b/i,
      /\bk\b (is|equals) (the )?(interstellar|A_V)/i,
      /\bR_V\b/,
    ];
    expect(all.filter(s => forbidden.some(p => p.test(s)))).toEqual([]);
  });
  test('the lesson asks whether k is the dust and answers that it is not, in both languages', () => {
    expect(step('not-the-dust').answer).toBe(0);
    expect(step('not-the-dust').options[0]).toMatch(/^No: it is the Earth/);
    expect(ES.steps[4].options[0]).toMatch(/^No: es la atmósfera/);
    expect(step('what-a-calibration-does').body).toMatch(/not the dust/);
    expect(step('the-limits').body).toMatch(/dust between the stars/);
  });
  test('the nights are said to be synthetic and the truth is shown only on request', () => {
    expect(step('a-night-of-standards').body).toMatch(/synthetic/);
    expect(step('a-night-of-standards').tool.values.truth).toBe(0);
    expect(step('calibrate-a-target').tool.values.truth).toBe(1);
  });
});
