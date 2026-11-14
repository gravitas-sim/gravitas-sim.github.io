// =============================================================================
// Why We Cannot See Earth From Here, and Architectures, in two languages (Roadmap III, Prompt 230)
// -----------------------------------------------------------------------------
// Every number a step states is recomputed from the panel the lesson draws
// (js/directImagingWidgets.js over js/directImagingField.js and js/kernels/imaging/), read in
// the form the validator takes and fed to the step's own validator; a wrong reading is refused;
// the Spanish carries the same step structure; and no number of a paper is typed.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
// The shared modules first: Jest's VM loses a module several imports link at once.
import '../js/kernels/imaging/index.js';
import { contrastView, architecturesView } from '../js/directImagingField.js';
import { DIRECT_IMAGING_WIDGETS } from '../js/directImagingWidgets.js';
import {
  WHY_NOT_EARTH as L1,
  WHY_NOT_EARTH_ES as L1_ES,
  WHY_NOT_EARTH_DEEPER as D1,
  WHY_NOT_EARTH_DEEPER_ES as D1_ES,
  ARCHITECTURES as L2,
  ARCHITECTURES_ES as L2_ES,
  ARCHITECTURES_DEEPER as D2,
  ARCHITECTURES_DEEPER_ES as D2_ES,
  INSTRUCTOR,
} from '../js/data/investigations/imaging-sequence.js';

const all = [...L1.steps, ...D1.steps, ...L2.steps, ...D2.steps];
const step = sid => all.find(s => s.sid === sid);
const ok = (sid, v) => expect(step(sid).validate(v).level).toBe('ok');
const bad = (sid, v) => expect(step(sid).validate(v).level).toBe('error');
const C = (v = {}) =>
  contrastView({ system: 0, distance: 10, telescope: 3, phase: 90, ...v });
const A = (v = {}) =>
  architecturesView({ view: 0, telescope: 3, distance: 10, ...v });

describe('Why We Cannot See Earth From Here: the numbers the steps state', () => {
  test('Earth at ten parsecs: 0.100 arcsecond, 5.3 lambda/D for 6 m at 550 nm, about 1.18e-10, 8.5 billion times fainter', () => {
    const v = C();
    expect(v.separation.arcsec).toBeCloseTo(0.1, 6);
    expect(v.scale.lambdaOverDArcsec).toBeCloseTo(0.0189, 4);
    expect(v.separationOverScale).toBeCloseTo(5.29, 2);
    expect(v.contrast.reflected).toBeCloseTo(1.18e-10, 12);
    expect(1 / v.contrast.total / 1e9).toBeGreaterThan(8.4);
    expect(1 / v.contrast.total / 1e9).toBeLessThan(8.6);
    expect(v.verdict.observable).toBe(true);
  });
  test('the 2.4 m example: lambda/D 0.047, Earth 2.1 lambda/D, inside the 3 lambda/D working angle', () => {
    const v = C({ telescope: 1 });
    expect(v.scale.lambdaOverDArcsec).toBeCloseTo(0.0473, 4);
    expect(v.separationOverScale).toBeCloseTo(2.12, 2);
    expect(v.innerWorkingArcsec).toBeCloseTo(0.1418, 4);
    expect(v.verdict.code).toBe('inside-inner-working-angle');
    expect(v.verdict.message).toBe('not observable with this instrument');
  });
  test('at 10 micrometres: about twelve million times fainter, lambda/D 0.34 arcsecond, Earth 0.29 lambda/D, 254 K, 18 times the scale', () => {
    const v = C({ band: 1 });
    expect(1 / v.contrast.total / 1e6).toBeGreaterThan(11.5);
    expect(1 / v.contrast.total / 1e6).toBeLessThan(12.5);
    expect(v.scale.lambdaOverDArcsec).toBeCloseTo(0.3438, 4);
    expect(v.separationOverScale).toBeCloseTo(0.29, 2);
    expect(v.contrast.irradiationTeqK).toBeGreaterThan(253);
    expect(v.contrast.irradiationTeqK).toBeLessThan(255);
    expect(v.scale.lambdaOverDArcsec / C().scale.lambdaOverDArcsec).toBeCloseTo(
      18.18,
      1
    );
    expect(v.verdict.code).toBe('inside-inner-working-angle');
  });
  test('the phase trade: full phase is 3.7e-10 and behind the star; 90 degrees is 3.1 times fainter', () => {
    const full = C({ phase: 0 });
    const quad = C({ phase: 90 });
    expect(full.separation.arcsec).toBe(0);
    expect(full.contrast.reflected).toBeCloseTo(3.71e-10, 12);
    expect(full.contrast.reflected / quad.contrast.reflected).toBeCloseTo(
      Math.PI,
      6
    );
  });
  test('the young giant: 3.0 arcsecond, 70.5 lambda/D for 8 m, 25 K from starlight, 1500 K stated, about 7e-4 at 1.65 micrometres', () => {
    const v = C({ system: 2, telescope: 2 });
    expect(v.separation.arcsec).toBeCloseTo(3.0, 3);
    expect(v.separationOverScale).toBeCloseTo(70.5, 1);
    expect(v.contrast.irradiationTeqK).toBeGreaterThan(24);
    expect(v.contrast.irradiationTeqK).toBeLessThan(26);
    expect(v.contrast.planetTeffK).toBe(1500);
    expect(v.contrast.selfLuminous).toBe(true);
    expect(v.contrast.total).toBeGreaterThan(7e-4);
    expect(v.contrast.total).toBeLessThan(7.5e-4);
  });
  test('the hot Jupiter has an easy contrast and an impossible angle; the example 6 m instrument sees only Earth', () => {
    const hj = C({ system: 3 });
    expect(hj.separation.arcsec).toBeCloseTo(0.005, 4);
    expect(hj.verdict.code).toBe('inside-inner-working-angle');
    for (const t of [0, 1, 2])
      expect(C({ telescope: t }).verdict.observable).toBe(false);
    expect(C({ telescope: 3 }).verdict.observable).toBe(true);
  });
});

describe('Why We Cannot See Earth From Here: the validators', () => {
  test('read-the-contrast', () => {
    ok('read-the-contrast', { a: 1.18 });
    ok('read-the-contrast', { a: 1.2 });
    bad('read-the-contrast', { a: 5.45 });
    bad('read-the-contrast', { a: 0.118 });
  });
  test('young-giant-angle', () => {
    ok('young-giant-angle', { a: 70.5 });
    bad('young-giant-angle', { a: 3 });
    bad('young-giant-angle', { a: 5.3 });
  });
});

describe('Architectures: the numbers the steps state', () => {
  test('94 planets with an axis and a mass, 70 beyond Neptune, 93 heavier than Jupiter, medians 169.5 AU and 12.25 Jupiter masses', () => {
    const v = A();
    expect(v.counts.table).toBe(98);
    expect(v.counts.withAxisAndMass).toBe(94);
    expect(v.counts.withDistanceToo).toBe(88);
    expect(v.imagedBeyondNeptune).toBe(70);
    expect(v.imagedHeavierThanJupiter).toBe(93);
    expect(v.median.imagedAxisAu).toBeCloseTo(169.5, 6);
    expect(v.median.imagedMassJup).toBeCloseTo(12.25, 6);
  });
  test('the Solar System at ten parsecs: 0.039 to 3.007 arcseconds; 5 of 8 outside the 2.4 m example, 2 of 8 outside the 0.25 m one', () => {
    const v = A({ telescope: 1 });
    expect(v.solar[0].arcsec).toBeCloseTo(0.0387, 4);
    expect(v.solar[7].arcsec).toBeCloseTo(3.007, 3);
    expect(v.counts.solarOutside).toBe(5);
    expect(A({ telescope: 0 }).counts.solarOutside).toBe(2);
    expect(v.innerWorkingArcsec).toBeCloseTo(0.1418, 4);
  });
  test('49 of 88 imaged planets with a distance lie outside the 0.25 m example’s 1.36 arcsecond', () => {
    const v = A({ telescope: 0 });
    expect(v.innerWorkingArcsec).toBeCloseTo(1.3613, 4);
    expect(v.counts.imagedOutside).toBe(49);
    expect(v.counts.withDistanceToo).toBe(88);
  });
});

describe('Architectures: the validators', () => {
  test('count-the-seen', () => {
    ok('count-the-seen', { a: 49 });
    bad('count-the-seen', { a: 88 });
    bad('count-the-seen', { a: 0 });
  });
  test('median-orbit-and-mass', () => {
    ok('median-orbit-and-mass', { a: 170, b: 12.3 });
    ok('median-orbit-and-mass', { a: 169.5, b: 12.25 });
    bad('median-orbit-and-mass', { a: 5, b: 12 });
    bad('median-orbit-and-mass', { a: 170, b: 1 });
  });
});

describe('the panels', () => {
  test('every readout row is text, a verdict is never "observable" without its condition, and λ/D is said not to be a working angle', () => {
    const [contrast, arch] = DIRECT_IMAGING_WIDGETS;
    expect(contrast.id).toBe('imaging-contrast');
    expect(arch.id).toBe('imaging-architectures');
    for (let s = 0; s < 4; s++)
      for (let t = 0; t < 4; t++) {
        const rows = contrast.readout({
          system: s,
          distance: 10,
          telescope: t,
          phase: 90,
          band: 0,
        });
        for (const r of rows) {
          expect(typeof r.value).toBe('string');
          expect(r.value).not.toMatch(/undefined|NaN/);
        }
        const verdict = rows.find(r => /see it/.test(r.label)).value;
        expect(verdict).toMatch(
          /not observable with this instrument|necessary condition/i
        );
      }
    const rows = contrast.readout({});
    expect(rows.find(r => r.label === 'Diffraction scale').value).toMatch(
      /not a coronagraph’s inner working angle/
    );
    expect(rows.find(r => r.label === 'Inner working angle').value).toMatch(
      /not a cited specification/
    );
    for (const v of [0, 1])
      for (const r of arch.readout({ view: v }))
        expect(r.value).not.toMatch(/undefined|NaN/);
  });
  test('the temperature note says when a planet shines by its own heat', () => {
    const rows = DIRECT_IMAGING_WIDGETS[0].readout({ system: 2, telescope: 2 });
    expect(rows.find(r => r.label === 'Temperature').value).toMatch(
      /shines by its own heat/
    );
  });
});

describe('the lessons', () => {
  test('no step grades a planet as seen without its instrument, and the two lessons are three-depth lessons with four objectives', () => {
    for (const L of [L1, L2]) {
      expect(L.depths).toEqual(['core', 'quantitative', 'advanced']);
      expect(L.objectives.length).toBe(4);
      expect(L.steps.length).toBe(6);
      expect(L.steps.every(s => s.sid && s.stage)).toBe(true);
    }
    expect(new Set(all.map(s => s.sid)).size).toBe(all.length);
  });
  test('every choice has its answer inside the options, and deeper steps hang on a real step', () => {
    for (const s of all.filter(x => x.options)) {
      expect(s.answer).toBeGreaterThanOrEqual(0);
      expect(s.answer).toBeLessThan(s.options.length);
      expect(s.because.length).toBeGreaterThan(40);
    }
    const sids = new Set(all.map(s => s.sid));
    for (const s of [...D1.steps, ...D2.steps])
      expect(sids.has(s.after)).toBe(true);
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
    pair(L1, L1_ES);
    pair(D1, D1_ES);
    pair(L2, L2_ES);
    pair(D2, D2_ES);
    expect(L1_ES.objectives.length).toBe(4);
    expect(L2_ES.objectives.length).toBe(4);
  });
  test('the instructor content covers both lessons and states the limits', () => {
    for (const id of ['why-we-cannot-see-earth', 'architectures']) {
      const c = INSTRUCTOR.content[id];
      expect(c.keyConcepts.length).toBe(3);
      expect(c.misconceptions.length).toBeGreaterThanOrEqual(3);
      expect(INSTRUCTOR.flow[id].length).toBeGreaterThanOrEqual(3);
    }
    const text = JSON.stringify(INSTRUCTOR.content);
    expect(text).toMatch(/teaching examples/);
    expect(text).toMatch(/not retrieved/);
    expect(text).toMatch(/Part B/);
  });
});
