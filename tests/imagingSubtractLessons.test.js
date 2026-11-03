// =============================================================================
// Following a Planet, in two languages (Roadmap III, Prompt 230 Part B)
// -----------------------------------------------------------------------------
// Every number a step states is recomputed from the panels the lesson draws
// (js/directImagingWidgets.js over js/directImagingSubtractField.js, the gate's own
// modules js/kernels/imaging/subtract.js and orbit.js, and Prompt 187's fitter); a wrong
// reading is refused; the Spanish carries the same step structure; the panels' words hold the
// working-radius and refusal statements; and no step reports an orbit the fitter refused.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
// The shared modules first: Jest's VM loses a module several imports link at once.
import '../js/kernels/imaging/subtract.js';
import '../js/measure/orbit-fit.js';
import {
  subtractionView,
  orbitView,
} from '../js/directImagingSubtractField.js';
import { DIRECT_IMAGING_WIDGETS } from '../js/directImagingWidgets.js';
import {
  FOLLOWING as L,
  FOLLOWING_ES as L_ES,
  FOLLOWING_DEEPER as D,
  FOLLOWING_DEEPER_ES as D_ES,
  INSTRUCTOR,
} from '../js/data/investigations/imaging-sequence.js';

const all = [...L.steps, ...D.steps];
const step = sid => all.find(s => s.sid === sid);
const ok = (sid, v) => expect(step(sid).validate(v).level).toBe('ok');
const bad = (sid, v) => expect(step(sid).validate(v).level).toBe('error');
const S = (v = {}) =>
  subtractionView({ sep: 4, contrast: 1, mismatch: 1, scene: 0, ...v });
const O = (v = {}) => orbitView({ system: 0, arc: 1, ...v });

describe('Following a Planet: the numbers the steps state', () => {
  test('the first scene: a residual of 2.7 percent of the star within two FWHM, the planet found at about signal to noise 9.5', () => {
    const v = S();
    expect(v.refusal).toBeUndefined();
    expect(v.depth).toBeCloseTo(0.027, 3);
    expect(v.measure.ok).toBe(true);
    expect(v.measure.snr).toBeGreaterThan(8.5);
    expect(v.measure.snr).toBeLessThan(10.5);
    expect(v.found).toBe(true);
  });
  test('2 FWHM is inside the working radius (2.5 FWHM) and the sentence says so; the residual there is 3.5 percent', () => {
    const v = S({ sep: 2, contrast: 3 });
    expect(v.workingFwhm).toBe(2.5);
    expect(v.measure.ok).toBe(false);
    expect(v.measure.code).toBe('inside-working-region');
    expect(v.measure.message).toBe(
      "not measurable behind the star's residual with this subtraction"
    );
    expect(v.depth).toBeCloseTo(0.035, 3);
  });
  test('a reference 20 percent wider is refused: 0.16 of the star against the limit 0.10', () => {
    const v = S({ mismatch: 2 });
    expect(v.refusal.code).toBe('reference-mismatch');
    expect(v.refusal.depth).toBeCloseTo(0.16, 2);
    expect(v.depthLimit).toBe(0.1);
  });
  test('the throughput at 5 FWHM and 1e-2: 2,992 ± 92 electrons against 3,090 injected, 0.97', () => {
    const v = S({ sep: 5, contrast: 2 });
    expect(v.injected).toBeGreaterThan(3000);
    expect(v.injected).toBeLessThan(3200);
    expect(Math.round(v.measure.flux)).toBe(2992);
    expect(Math.round(v.measure.sigmaFlux)).toBe(92);
    expect(Math.round(v.injected)).toBe(3090);
    expect(v.measure.flux / v.injected).toBeCloseTo(0.968, 2);
    expect(v.measure.snr).toBeCloseTo(32.7, 0);
    expect(v.limit.contrast).toBeCloseTo(1.53e-3, 4);
  });
  test('30 percent of the circular orbit: the fitter refuses (coverage 0.25 against 0.50) and the map allows 4.6 to 37 years and eccentricity 0 to 0.8', () => {
    const o = O();
    expect(o.kept).toBe(12);
    expect(o.fit.ok).toBe(false);
    expect(o.fit.code).toBe('coverage');
    expect(o.fit.data.coverageLower).toBeCloseTo(0.253, 2);
    expect(o.fit.data.coverageNeeded).toBe(0.5);
    expect(o.periodRange95[0]).toBeCloseTo(4.59, 1);
    expect(o.periodRange95[1]).toBeCloseTo(37.1, 0);
    expect(o.periodRange95[1] / o.periodRange95[0]).toBeGreaterThan(7.5);
    expect(o.eccentricityRange95[0]).toBe(0);
    expect(o.eccentricityRange95[1]).toBeCloseTo(0.8, 2);
  });
  test('110 percent of the eccentric orbit: 10.02 years (68 percent 9.99 to 10.05), eccentricity 0.35, the truth 10 and 0.35', () => {
    const o = O({ system: 1, arc: 3 });
    expect(o.fit.ok).toBe(true);
    const el = o.fit.elements;
    expect(el.P.value).toBeCloseTo(10.018, 2);
    expect(el.P.interval68[0]).toBeCloseTo(9.991, 2);
    expect(el.P.interval68[1]).toBeCloseTo(10.045, 2);
    expect(el.P.interval68[0]).toBeLessThan(o.truth.P);
    expect(el.P.interval68[1]).toBeGreaterThan(o.truth.P);
    expect(el.e.value).toBeCloseTo(0.351, 2);
    expect(o.truth.e).toBe(0.35);
  });
  test('no orbit below the criterion: every refused arc carries no elements', () => {
    for (const system of [0, 1, 2])
      for (const arc of [0, 1]) {
        const o = orbitView({ system, arc });
        expect(o.fit.ok).toBe(false);
        expect(o.fit.elements).toBeUndefined();
      }
  });
});

describe('Following a Planet: the validators', () => {
  test('read-the-snr', () => {
    ok('read-the-snr', { a: 33 });
    bad('read-the-snr', { a: 9.5 });
  });
  test('read-the-limit', () => {
    ok('read-the-limit', { a: 1.5 });
    bad('read-the-limit', { a: 15 });
  });
  test('read-the-band', () => {
    ok('read-the-band', { a: 4.6, b: 37 });
    bad('read-the-band', { a: 9, b: 11 });
  });
});

describe('the panels', () => {
  const [, , sub, orb] = DIRECT_IMAGING_WIDGETS;
  test('the two panels are in the family and every readout row is text', () => {
    expect(sub.id).toBe('imaging-subtraction');
    expect(orb.id).toBe('imaging-orbit');
    for (const mismatch of [0, 1, 2])
      for (const sep of [2, 5, 8])
        for (const r of sub.readout({ sep, contrast: 2, mismatch, scene: 1 })) {
          expect(typeof r.value).toBe('string');
          expect(r.value).not.toMatch(/undefined|NaN/);
        }
    for (const system of [0, 1, 2])
      for (const arc of [0, 3])
        for (const r of orb.readout({ system, arc, reveal: arc })) {
          expect(typeof r.value).toBe('string');
          expect(r.value).not.toMatch(/undefined|NaN/);
        }
  });
  test('the working radius is said not to be λ/D or an inner working angle, and a refused arc says no orbit is reported', () => {
    const rows = sub.readout({ sep: 2, contrast: 3, mismatch: 1, scene: 0 });
    expect(rows.find(r => r.label === 'The planet').value).toMatch(
      /not λ\/D and not an instrument’s inner working angle/
    );
    const orbit = orb.readout({ system: 0, arc: 1, reveal: 0 });
    expect(orbit.find(r => r.label === 'The orbit').value).toMatch(
      /No orbit is reported/
    );
    expect(
      orbit.find(r => r.label === 'The true orbit (invented)').value
    ).toMatch(/hidden/);
  });
});

describe('the lesson', () => {
  test('a three-depth lesson with four objectives, eight core steps, unique sids and a real hang for each deeper step', () => {
    expect(L.depths).toEqual(['core', 'quantitative', 'advanced']);
    expect(L.objectives.length).toBe(4);
    expect(L.steps.length).toBe(8);
    expect(L.steps.every(s => s.sid && s.stage)).toBe(true);
    expect(new Set(all.map(s => s.sid)).size).toBe(all.length);
    const sids = new Set(all.map(s => s.sid));
    for (const s of D.steps) expect(sids.has(s.after)).toBe(true);
    for (const s of all.filter(x => x.options)) {
      expect(s.answer).toBeGreaterThanOrEqual(0);
      expect(s.answer).toBeLessThan(s.options.length);
    }
    expect(step('short-arc').reveal).toBe('the-map');
    expect(sids.has('the-map')).toBe(true);
  });
  test('the Spanish has the same step structure', () => {
    const pair = (en, es) => {
      expect(es.steps.length).toBe(en.steps.length);
      en.steps.forEach((s, i) => {
        if (s.options)
          expect(es.steps[i].options.length).toBe(s.options.length);
        if (s.hints) expect(es.steps[i].hints.length).toBe(s.hints.length);
        if (s.fields) expect(es.steps[i].fields.length).toBe(s.fields.length);
        if (s.rubricCriteria)
          expect(es.steps[i].rubricCriteria.length).toBe(
            s.rubricCriteria.length
          );
        if (s.misconceptions)
          expect(es.steps[i].misconceptions.length).toBe(
            s.misconceptions.length
          );
      });
    };
    pair(L, L_ES);
    pair(D, D_ES);
    expect(L_ES.objectives.length).toBe(4);
  });
  test('the instructor content states what is synthetic, what is not modeled and the amendments', () => {
    const c = INSTRUCTOR.content['following-a-planet'];
    expect(c.keyConcepts.length).toBe(3);
    expect(c.misconceptions.length).toBeGreaterThanOrEqual(3);
    expect(INSTRUCTOR.flow['following-a-planet'].length).toBeGreaterThanOrEqual(
      3
    );
    const text = JSON.stringify(c);
    expect(text).toMatch(/synthetic/);
    expect(text).toMatch(/not λ\/D/);
    expect(text).toMatch(/AM1 to AM6/);
    expect(text).toMatch(/none is modeled/);
  });
});
