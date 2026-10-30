// =============================================================================
// The two remnants lessons, in two languages (Roadmap III, Prompt 222)
// -----------------------------------------------------------------------------
// Every number a step states is recomputed from the panels the lessons draw
// (js/remnantsWidgets.js over js/remnantsField.js and js/kernels/remnants/), read in
// the form the validator takes and fed to the step's own validator; a wrong reading
// is refused; the Spanish carries the same step structure.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
// The shared modules first: Jest's VM loses a module several imports link at once.
import '../js/kernels/remnants/index.js';
import { coolingView, outcomeView } from '../js/remnantsField.js';
import { REMNANTS_WIDGETS } from '../js/remnantsWidgets.js';
import {
  HOW_OLD_IS_THIS_WHITE_DWARF as AGE,
  HOW_OLD_IS_THIS_WHITE_DWARF_ES as AGE_ES,
  HOW_OLD_IS_THIS_WHITE_DWARF_DEEPER as AGE_DEEP,
  HOW_OLD_IS_THIS_WHITE_DWARF_DEEPER_ES as AGE_DEEP_ES,
  FROM_STAR_TO_REMNANT as REM,
  FROM_STAR_TO_REMNANT_ES as REM_ES,
  FROM_STAR_TO_REMNANT_DEEPER as REM_DEEP,
  FROM_STAR_TO_REMNANT_DEEPER_ES as REM_DEEP_ES,
  INSTRUCTOR,
} from '../js/data/investigations/remnants-sequence.js';

const all = [...AGE.steps, ...AGE_DEEP.steps, ...REM.steps, ...REM_DEEP.steps];
const step = sid => all.find(s => s.sid === sid);
const ok = (sid, v) => expect(step(sid).validate(v).level).toBe('ok');
const bad = (sid, v) => expect(step(sid).validate(v).level).toBe('error');
const gyr = r => r.ageYr / 1e9;

describe('How Old Is This White Dwarf?: the numbers the steps state', () => {
  test('0.6 solar masses at a ten-thousandth and a thousandth: 4.09 and 0.79 Gyr, a ratio of 5.2', () => {
    const a = gyr(coolingView({ logL: -4 }).result);
    const b = gyr(coolingView({ logL: -3 }).result);
    ok('read-two-ages', { a, b });
    bad('read-two-ages', { a: 4.09, b: 0.5 });
    bad('read-two-ages', { a: b, b: a });
    expect(a / b).toBeGreaterThan(5.1);
    expect(a / b).toBeLessThan(5.3);
  });
  test('from 6000 K: 2.60 Gyr, 14 percent from the measurements and 19 from the law', () => {
    const r = coolingView({ entry: 1, teff: 6000, precision: 1 }).result;
    const half = iv => (100 * (iv.hi - iv.lo)) / 2 / r.ageYr;
    ok('from-a-temperature', {
      a: gyr(r),
      b: half(r.observational95),
      c: half(r.model95),
    });
    bad('from-a-temperature', { a: 2.6, b: 5, c: 5 });
    // the measurement part is larger than the law's term is not claimed; the two are kept apart
    expect(r.sigmaTotalLn).toBeCloseTo(
      Math.hypot(r.sigmaObsLn, r.sigmaModelLn),
      12
    );
  });
  test('with exact inputs the interval is the law alone: 0.66 to 0.95 Gyr, limited by the law', () => {
    const r = coolingView({ precision: 0 }).result;
    ok('what-better-measurements-buy', {
      a: r.interval95.lo / 1e9,
      b: r.interval95.hi / 1e9,
    });
    bad('what-better-measurements-buy', { a: 0.79, b: 0.79 });
    expect(r.modelLimited).toBe(true);
    expect(r.sigmaObsLn).toBe(0);
  });
  test('1.2 solar masses is refused as out of the validated range', () => {
    const r = coolingView({ mass: 1.2 }).result;
    expect(r.status).toBe('refused');
    expect(r.reason).toBe('mass-out-of-domain');
  });
});

describe('From Star to Remnant: the numbers the steps state', () => {
  test('3 solar masses by MIST: 0.745 solar masses left, 75 percent shed', () => {
    const r = outcomeView({ mi: 3 }).remnant;
    ok('read-the-final-mass', { a: r.finalMass, b: 100 * r.lossFraction });
    bad('read-the-final-mass', { a: 3, b: 25 });
    expect(r.scatter).toBe(0.06);
  });
  test('25 solar masses: 75 percent a neutron star and 25 a black hole, not decisive', () => {
    const o = outcomeView({ mi: 25, view: 1 }).outcome;
    ok('read-the-odds', {
      a: 100 * o.probabilities.neutronStar,
      b: 100 * o.probabilities.blackHole,
    });
    bad('read-the-odds', { a: 100, b: 0 });
    expect(o.decisive).toBe(false);
  });
  test('1 and 6 solar masses: 0.569 and 1.113', () => {
    const a = outcomeView({ mi: 1 }).remnant.finalMass;
    const b = outcomeView({ mi: 6 }).remnant.finalMass;
    ok('the-relation-at-two-masses', { a, b });
    bad('the-relation-at-two-masses', { a: 1, b: 6 });
    expect(b / a).toBeGreaterThan(1.9);
    expect(b / a).toBeLessThan(2.1);
  });
});

describe('the lessons are graded and structured', () => {
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
    for (const s of [...AGE_DEEP.steps, ...REM_DEEP.steps]) {
      expect(['quantitative', 'advanced']).toContain(s.depth);
      expect(sids.has(s.after)).toBe(true);
    }
  });
  test('instructor material exists for both lessons', () => {
    for (const id of ['how-old-is-this-white-dwarf', 'from-star-to-remnant']) {
      expect(INSTRUCTOR.content[id]).toBeTruthy();
      expect(INSTRUCTOR.flow[id]).toBeTruthy();
      expect(INSTRUCTOR.expectations[id]).toBeTruthy();
      expect(INSTRUCTOR.bands[id]).toBeTruthy();
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
    same(AGE, AGE_ES);
    same(AGE_DEEP, AGE_DEEP_ES);
    same(REM, REM_ES);
    same(REM_DEEP, REM_DEEP_ES);
  });
});

describe('the panels', () => {
  test('two widgets, each with controls and a readout that states what it leaves out', () => {
    expect(REMNANTS_WIDGETS.map(w => w.id)).toEqual([
      'remnant-cooling',
      'remnant-outcome',
    ]);
    for (const w of REMNANTS_WIDGETS) {
      expect(w.controls.length).toBeGreaterThan(1);
      const rows = w.readout({});
      expect(rows.some(r => r.emphasis)).toBe(true);
      expect(rows[rows.length - 1].value).toMatch(/\S/);
    }
  });
});
