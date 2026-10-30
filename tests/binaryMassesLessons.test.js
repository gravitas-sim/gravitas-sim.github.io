// =============================================================================
// The binary-masses lesson, in two languages (Roadmap III, Prompt 218)
// -----------------------------------------------------------------------------
// Every number a step states is recomputed from the panels the lesson draws
// (js/massesWidgets.js over js/massesField.js, js/inference/binaryMasses.js and the
// inference core), read in the form the validator takes and fed to the step's own
// validator; the Spanish carries the same step structure; the diagram's table of
// solved systems is held against a fresh fit.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
// The shared modules first: Jest's VM loses a module several imports link at once.
import '../js/inference/binaryMasses.js';
import '../js/inference/infer.js';
import {
  SYSTEMS,
  ECLIPSING,
  SOLVED,
  compact,
  diagramView,
  fitOfSystem,
  inclinationShare,
  insideBand,
  minimumView,
  mistBand,
  sigmaOf,
  solveView,
  solvedStars,
  temperatureFromJ,
} from '../js/massesField.js';
import { MASSES_WIDGETS } from '../js/massesWidgets.js';
import {
  WEIGHING_THE_STARS as LESSON,
  WEIGHING_THE_STARS_ES as LESSON_ES,
  WEIGHING_THE_STARS_DEEPER as DEEP,
  WEIGHING_THE_STARS_DEEPER_ES as DEEP_ES,
} from '../js/data/investigations/binary-masses-sequence.js';

const all = [...LESSON.steps, ...DEEP.steps];
const step = sid => all.find(s => s.sid === sid);
const value = (m, n) =>
  m.fit.parameters.find(p => p.name === n) ||
  m.fit.derived.find(p => p.name === n);

describe('Weighing the Stars: the numbers the steps state', () => {
  test('the double-lined pair that never eclipses: amplitudes, the ratio and the minimum masses', () => {
    const m = minimumView({ system: 0, inc: 90 });
    expect(
      step('read-the-amplitudes').validate({
        a: value(m, 'K1').value,
        b: value(m, 'K2').value,
      }).level
    ).toBe('ok');
    expect(value(m, 'K2').value).toBeGreaterThan(value(m, 'K1').value);
    expect(value(m, 'q').value).toBeCloseTo(
      value(m, 'K1').value / value(m, 'K2').value,
      12
    );
    expect(value(m, 'm1sin3i').value).toBeCloseTo(0.582, 3);
    expect(value(m, 'm2sin3i').value).toBeCloseTo(0.432, 3);
    expect(value(m, 'q').value).toBeCloseTo(0.74, 2);
  });
  test('at 60 degrees the masses are 0.92 and 0.69, at 52 they are twice the minimum', () => {
    const at60 = minimumView({ system: 0, inc: 60 });
    expect(
      step('a-mass-or-a-limit').validate({ a: at60.atInc.M1, b: at60.atInc.M2 })
        .level
    ).toBe('ok');
    const at52 = minimumView({ system: 0, inc: 52 });
    const ratio = 1 / Math.sin((52 * Math.PI) / 180) ** 3;
    expect(
      step('the-tilt-you-did-not-measure').validate({
        a: at52.atInc.M1,
        b: at52.atInc.M2,
        r: ratio,
      }).level
    ).toBe('ok');
    // The truth of the system is 1.2 and 0.9 solar masses at 52 degrees.
    expect(Math.abs(at52.atInc.M1 - 1.2)).toBeLessThan(0.05);
    expect(Math.abs(at52.atInc.M2 - 0.9)).toBeLessThan(0.05);
  });
  test('the F-star pair: masses, radii and the uncertainty of M1, with the truth inside two standard deviations', () => {
    const m = solveView({ system: 0 });
    const M1 = m.value('M1');
    const M2 = m.value('M2');
    expect(
      step('weigh-the-pair').validate({
        a: M1.value,
        b: M2.value,
        u: 1e3 * sigmaOf(M1),
      }).level
    ).toBe('ok');
    expect(Math.abs(M1.value - 1.3)).toBeLessThan(2 * sigmaOf(M1));
    expect(Math.abs(M2.value - 1.1)).toBeLessThan(2 * sigmaOf(M2));
    expect(m.fit.identifiability.status).toBe('constrained');
    expect(m.fit.reducedChi2).toBeLessThan(1.2);
    expect(m.fit.redNoise.correlated).toBe(false);
    expect(inclinationShare(m.fit, 'M1')).toBeLessThan(1e-4);
  });
  test('one line only: the mass function 0.230 and a companion of at least 1.10, and no mass', () => {
    const m = solveView({ system: 0, lines: 1 });
    expect(
      step('one-line-only').validate({
        f: m.value('massFunction').value,
        m: m.value('m2min').value,
      }).level
    ).toBe('ok');
    expect(m.fit.derived.map(d => d.name)).not.toContain('M1');
    expect(m.value('m2min').label).toMatch(/minimum/);
    // The minimum is below the true companion mass of 1.1 only because the orbit is not quite edge on.
    expect(m.value('m2min').value).toBeLessThanOrEqual(1.1 + 0.05);
  });
  test('the diagram: the hot pair, the slope of luminosity against mass, every star inside the band', () => {
    const d = diagramView({ systems: 4, view: 1 });
    const D2 = d.stars.find(s => s.id === 'd' && s.star === 2);
    const D1 = d.stars.find(s => s.id === 'd' && s.star === 1);
    const A1 = d.stars.find(s => s.id === 'a' && s.star === 1);
    expect(step('on-the-diagram').validate({ m: D2.M, r: D2.R }).level).toBe(
      'ok'
    );
    const n = Math.log(D1.L / A1.L) / Math.log(D1.M / A1.M);
    expect(
      step('the-mass-luminosity-slope').validate({ a: D1.L, b: A1.L, n }).level
    ).toBe('ok');
    expect(d.stars).toHaveLength(8);
    for (const s of d.stars) expect(insideBand(s.M, s.R)).toBe(true);
  });
  test('the real star: the numbers the step states are the pinned E1 row of the validation table', () => {
    const rows = JSON.parse(
      readFileSync('tests/fixtures/binary-masses/results.json', 'utf8')
    ).rows;
    const e1 = rows.find(r => r.id === 'E1.authentic').measured;
    const body = step('the-real-star').body;
    const fmt = (v, d) => v.toFixed(d).replace(/0+$/, '');
    for (const [k, d] of [
      ['M_A', 4],
      ['M_B', 4],
      ['R_A', 4],
      ['R_B', 4],
    ])
      expect(body).toContain(fmt(e1[k].ours, d).slice(0, 6));
    expect(e1.R_B.deltaOverPaperSigma).toBeGreaterThan(2.4);
    expect(e1.R_B.deltaOverPaperSigma).toBeLessThan(2.5);
    expect(body).toContain('2.4 published standard deviations');
  });
  test('the table of solved systems equals a fresh fit', () => {
    for (const s of ECLIPSING) {
      const fresh = compact(fitOfSystem(SYSTEMS.indexOf(s)).fit);
      const pinned = SOLVED[s.id];
      expect(pinned).toBeTruthy();
      for (const k of Object.keys(fresh))
        expect(pinned[k]).toBeCloseTo(fresh[k], 6);
    }
    expect(solvedStars()).toHaveLength(8);
  });
  test('temperature of star 2 from the surface brightness ratio inverts the Planck ratio', () => {
    const T1 = 6860;
    const T2 = temperatureFromJ(T1, 0.735);
    expect(Math.abs(T2 - 6180)).toBeLessThan(30);
    expect(temperatureFromJ(T1, 1)).toBeCloseTo(T1, 6);
  });
  test('the MIST band is ordered: zero age below the end of the main sequence in radius', () => {
    const b = mistBand(9);
    b.logM.forEach((_, i) =>
      expect(b.tams.logR[i]).toBeGreaterThanOrEqual(b.zams.logR[i])
    );
  });
});

describe('the lesson is graded and structured', () => {
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
    const sids = new Set(all.map(s => s.sid));
    for (const s of DEEP.steps) {
      expect(sids.has(s.after)).toBe(true);
      expect(['quantitative', 'advanced']).toContain(s.depth);
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
  test('the lesson and its deeper steps', () => {
    same(LESSON, LESSON_ES);
    same(DEEP, DEEP_ES);
  });
});

describe('the panels', () => {
  test('three widgets, each with controls and a readout that states what it assumes', () => {
    expect(MASSES_WIDGETS.map(w => w.id)).toEqual([
      'masses-minimum',
      'masses-solve',
      'masses-diagram',
    ]);
    for (const w of MASSES_WIDGETS) {
      expect(w.controls.length).toBeGreaterThan(1);
      const rows = w.readout({});
      expect(rows.some(r => r.emphasis)).toBe(true);
      expect(rows[rows.length - 1].value).toMatch(/\S/);
    }
  });
});
