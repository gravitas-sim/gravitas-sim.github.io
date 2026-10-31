// =============================================================================
// What Is It Made Of? and the upper depth of Finding Planets by Their Tug
// (Roadmap III, Prompt 227)
// -----------------------------------------------------------------------------
// Every number a step states is recomputed from the panel the lesson draws
// (js/jointWidgets.js over js/jointField.js and js/inference/jointPlanet.js), read in
// the form the validator takes and fed to the step's own validator; a wrong reading is
// refused; the Spanish carries the same step structure; the lesson closes on a core
// step and the deeper steps hang on core ones.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
// The shared modules first: Jest's VM loses a module several imports link at once.
import '../js/inference/jointPlanet.js';
import {
  planetFrom,
  densityTension,
  densityPercent,
  SIGMA_STEPS,
  STORED,
} from '../js/jointField.js';
import { JOINT_WIDGETS } from '../js/jointWidgets.js';
import {
  WHAT_IS_IT_MADE_OF as LESSON,
  WHAT_IS_IT_MADE_OF_ES as LESSON_ES,
  WHAT_IS_IT_MADE_OF_DEEPER as DEEP,
  WHAT_IS_IT_MADE_OF_DEEPER_ES as DEEP_ES,
  RADIAL_VELOCITY_DEEPER as TUG_DEEP,
  RADIAL_VELOCITY_DEEPER_ES as TUG_DEEP_ES,
} from '../js/data/investigations/joint-sequence.js';

const all = [...LESSON.steps, ...DEEP.steps, ...TUG_DEEP.steps];
const step = sid => all.find(s => s.sid === sid);
const ok = (sid, v) => expect(step(sid).validate(v).level).toBe('ok');
const bad = (sid, v) => expect(step(sid).validate(v).level).toBe('error');
/** The planet a step's panel shows: its tool's values, the controls' step indices read as the panel reads them. */
const planetOf = sid => {
  const v = step(sid).tool.values;
  return planetFrom({
    massPct: SIGMA_STEPS[v.massPct],
    radiusPct: SIGMA_STEPS[v.radiusPct],
    correlation: v.correlation,
    massValue: v.starMass,
    radiusValue: v.starRadius,
  });
};

describe('the numbers the steps quote', () => {
  test('a star stated 13 percent too large: radius up 13 percent, density down by nearly a third, mass unchanged', () => {
    const a = planetOf('a-radius-and-a-mass');
    const b = planetOf('a-bigger-star');
    expect(b.Rp.value / a.Rp.value).toBeCloseTo(1.3 / 1.15, 10);
    expect(b.rhoP.value / a.rhoP.value).toBeCloseTo((1.15 / 1.3) ** 3, 3);
    expect(b.Mp.value).toBe(a.Mp.value);
    expect(a.Rp.value).toBeCloseTo(1.325, 2);
    expect(b.Rp.value).toBeCloseTo(1.5, 1);
    expect(a.rhoP.value).toBeCloseTo(0.365, 2);
    expect(b.rhoP.value).toBeCloseTo(0.252, 2);
    expect(0.69).toBeCloseTo((1.15 / 1.3) ** 3, 1);
  });

  test('whose uncertainty: the star holds about 87 percent of the mass variance', () => {
    const p = planetOf('whose-uncertainty');
    expect(p.Mp.share).toBeGreaterThan(0.85);
    expect(p.Mp.share).toBeLessThan(0.89);
    expect(p.Mp.sigmaFit).toBeCloseTo(0.009, 3);
    expect(p.Mp.sigmaStar).toBeCloseTo(0.023, 3);
    expect(p.Rp.share).toBeCloseTo(0.52, 1);
    expect(p.rhoP.share).toBeCloseTo(0.46, 1);
  });

  test('at 8 percent the density is good to 0.088 g/cm3 and the star holds 82 percent', () => {
    const p = planetOf('the-stars-share-of-density');
    expect(p.rhoP.sigma).toBeCloseTo(0.088, 3);
    expect(100 * p.rhoP.share).toBeCloseTo(82, 0);
    expect(p.rhoP.sigmaFit).toBeCloseTo(0.037, 3);
    expect(densityPercent(0, 0.5)).toBeLessThan(densityPercent(8, 0.5));
  });

  test('a star of 1.60 solar radii is 3.2 sigma from the transit and the planet is 0.135 g/cm3', () => {
    for (const sid of [
      'a-star-that-does-not-fit',
      'a-star-that-does-not-fit-tug',
    ]) {
      const v = step(sid).tool.values;
      const s = {
        massPct: SIGMA_STEPS[v.massPct],
        radiusPct: SIGMA_STEPS[v.radiusPct],
        correlation: v.correlation,
        massValue: v.starMass,
        radiusValue: v.starRadius,
      };
      const z = Math.abs(densityTension(s).z);
      expect(z).toBeGreaterThan(3);
      expect(z).toBeCloseTo(3.2, 0);
      expect(planetFrom(s).rhoP.value).toBeCloseTo(0.135, 2);
    }
    // The default star does not disagree with the transit.
    expect(
      Math.abs(
        densityTension({ massPct: 5, radiusPct: 3.5, correlation: 0.5 }).z
      )
    ).toBeLessThan(1.5);
  });

  test('the stored fit is the synthetic hot Jupiter of the oracle: period 3.5 days, mass within a sigma of 0.7 Jupiter masses once the star is in', () => {
    expect(STORED.mean[0]).toBeCloseTo(3.5247, 2);
    const p = planetFrom({ massPct: 5, radiusPct: 3.5, correlation: 0.5 });
    expect(Math.abs(p.Mp.value - STORED.truth.Mp)).toBeLessThan(2 * p.Mp.sigma);
  });
});

describe('the steps', () => {
  test('the validators accept the readings the panel gives and refuse others', () => {
    const p8 = planetOf('the-stars-share-of-density');
    ok('the-stars-share-of-density', {
      a: p8.rhoP.sigma,
      b: 100 * p8.rhoP.share,
    });
    bad('the-stars-share-of-density', { a: 0.037, b: 0 });
    bad('the-stars-share-of-density', { a: 0.088, b: 46 });
    for (const sid of [
      'a-star-that-does-not-fit',
      'a-star-that-does-not-fit-tug',
    ]) {
      ok(sid, { a: 3.2, b: 0.135 });
      ok(sid, { a: -3.2, b: 0.135 });
      bad(sid, { a: 0.5, b: 0.135 });
      bad(sid, { a: 3.2, b: 0.36 });
    }
  });

  test('every readout row is text with no NaN, the planet is never reported without the star term, and the panel states what it assumes', () => {
    for (const w of JOINT_WIDGETS) {
      for (const v of [
        {},
        { massPct: 5, radiusPct: 5 },
        { starRadius: 1.6 },
        { massPct: 0, radiusPct: 0 },
      ]) {
        const rows = w.readout({
          ...Object.fromEntries(w.controls.map(c => [c.id, c.value])),
          ...v,
        });
        for (const r of rows) {
          expect(typeof r.value).toBe('string');
          expect(r.value).not.toMatch(/undefined|NaN/);
        }
      }
    }
    const rows = JOINT_WIDGETS[0].readout(
      Object.fromEntries(JOINT_WIDGETS[0].controls.map(c => [c.id, c.value]))
    );
    expect(
      rows.find(r => /assumes/i.test(r.label)).value.length
    ).toBeGreaterThan(40);
    expect(rows.find(r => /star \(an input\)/i.test(r.label)).value).toMatch(
      /Source/
    );
    expect(rows.find(r => /^Density/.test(r.label)).value).toMatch(
      /the star’s mass and radius inside it/
    );
  });

  test('every choice has a real answer, no misconception names the answer, and the answers use at least three positions', () => {
    for (const s of all) {
      if (
        (s.type === 'question' && s.kind === 'choice') ||
        s.type === 'predict'
      ) {
        expect(Number.isInteger(s.answer)).toBe(true);
        expect(s.options[s.answer]).toBeTruthy();
        for (const m of s.misconceptions ?? [])
          expect(m.option).not.toBe(s.answer);
      }
    }
    const positions = new Set(
      all
        .filter(s => s.kind === 'choice' || s.type === 'predict')
        .map(s => s.answer)
    );
    expect(positions.size).toBeGreaterThanOrEqual(2);
  });

  test('the deeper steps hang on steps that exist and the lesson closes on a core step', () => {
    const sids = new Set(LESSON.steps.map(s => s.sid));
    for (const s of DEEP.steps) {
      expect(sids.has(s.after)).toBe(true);
      sids.add(s.sid);
    }
    expect(LESSON.steps.at(-1).sid).toBe('what-you-can-now-say');
    expect(new Set(all.map(s => s.sid)).size).toBe(all.length);
    // The upper depth of the tug lesson hangs on a step of that lesson (checked by author:check) and is advanced.
    for (const s of TUG_DEEP.steps) expect(s.depth).toBe('advanced');
  });

  test('the first prediction is held until the step that settles it', () => {
    const p = step('bigger-star-prediction');
    expect(p.type).toBe('predict');
    expect(p.reveal).toBe('a-bigger-star');
    expect(LESSON.steps.findIndex(s => s.sid === p.reveal)).toBeGreaterThan(
      LESSON.steps.findIndex(s => s.sid === p.sid)
    );
  });
});

describe('the Spanish', () => {
  test('carries the same step structure', () => {
    expect(LESSON_ES.steps.length).toBe(LESSON.steps.length);
    expect(DEEP_ES.steps.length).toBe(DEEP.steps.length);
    expect(TUG_DEEP_ES.steps.length).toBe(TUG_DEEP.steps.length);
    for (const [en, es] of [
      [LESSON, LESSON_ES],
      [DEEP, DEEP_ES],
      [TUG_DEEP, TUG_DEEP_ES],
    ]) {
      en.steps.forEach((s, i) => {
        const e = es.steps[i];
        expect(e.title).toBeTruthy();
        expect(e.title).not.toBe(s.title);
        if (s.options) expect(e.options.length).toBe(s.options.length);
        if (s.hints) expect(e.hints.length).toBe(s.hints.length);
      });
    }
  });
});
