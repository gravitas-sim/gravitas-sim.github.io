// =============================================================================
// The eclipsing-binary lesson, in two languages (Roadmap III, Prompt 217)
// -----------------------------------------------------------------------------
// Every number a step states is recomputed from the panels the lesson draws
// (js/eclipseWidgets.js over js/eclipseField.js, js/stellar/binaries.js and the
// inference core), read in the form the validator takes and fed to the step's own
// validator; the Spanish carries the same step structure.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
// The shared modules first: Jest's VM loses a module several imports link at once.
import '../js/stellar/binaries.js';
import '../js/inference/infer.js';
import { curveView, fitView, sigmaOf, PRESETS } from '../js/eclipseField.js';
import { ECLIPSE_WIDGETS } from '../js/eclipseWidgets.js';
import {
  TWO_STARS_ECLIPSING as LESSON,
  TWO_STARS_ECLIPSING_ES as LESSON_ES,
  TWO_STARS_ECLIPSING_DEEPER as DEEP,
  TWO_STARS_ECLIPSING_DEEPER_ES as DEEP_ES,
} from '../js/data/investigations/binaries-sequence.js';

const all = [...LESSON.steps, ...DEEP.steps];
const step = sid => all.find(s => s.sid === sid);
const survey = { rsum: 0.19, k: 0.75, inc: 89.5, J: 0.55 };
const ecc = {
  rsum: 0.14,
  k: 0.8,
  inc: 88,
  J: 0.7,
  ecosw: 0.14,
  esinw: 0.1,
  data: 2,
};

describe('Two Stars Eclipsing: the numbers the steps state', () => {
  test('the survey system: 48.3 and 23.0 percent, a curved primary and a flat secondary', () => {
    const c = curveView(survey);
    expect(
      step('the-two-depths').validate({
        p: 100 * c.primaryDepth,
        s: 100 * c.secondaryDepth,
      }).level
    ).toBe('ok');
    expect(c.primaryDepth).toBeGreaterThan(c.secondaryDepth);
    expect(c.primaryFlat).toBe(false);
    expect(c.secondaryFlat).toBe(true);
    expect(c.secondaryPhase).toBe(0.5);
    expect(step('the-two-depths').validate({ p: 30, s: 23 }).level).toBe(
      'error'
    );
  });
  test('the unequal pair: R1/a, R2/a and the uncertainty of R2/a', () => {
    const m = fitView({ dataset: 0 });
    const r1 = m.derivedOf('r1');
    const r2 = m.derivedOf('r2');
    expect(
      step('fit-the-pair').validate({
        a: r1.value,
        b: r2.value,
        u: 1e4 * sigmaOf(r2),
      }).level
    ).toBe('ok');
    expect(m.fit.identifiability.status).toBe('constrained');
    expect(m.residualFail).toBe(false);
    // The truth is inside three standard deviations of each.
    expect(Math.abs(r1.value - 0.1086)).toBeLessThan(3 * sigmaOf(r1));
    expect(Math.abs(r2.value - 0.0814)).toBeLessThan(3 * sigmaOf(r2));
  });
  test('the spotted pair fails the residual test: 25.6 and 1.80', () => {
    const m = fitView({ dataset: 3 });
    expect(m.residualFail).toBe(true);
    expect(
      step('the-residual-test').validate({
        c: m.fit.reducedChi2,
        b: m.fit.redNoise.beta,
      }).level
    ).toBe('ok');
    expect(m.param('k').value).toBeCloseTo(0.758, 2);
  });
  test('the eccentric pair: the secondary at 0.5893 and e cos w 0.1402 to first order', () => {
    const c = curveView(ecc);
    const first = (Math.PI / 2) * (c.secondaryPhase - 0.5);
    expect(
      step('the-secondary-phase').validate({ p: c.secondaryPhase, e: first })
        .level
    ).toBe('ok');
    const m = fitView({ dataset: 1 });
    expect(m.param('ecosw').value).toBeCloseTo(0.14, 3);
    expect(Math.abs(first - m.param('ecosw').value)).toBeLessThan(5e-4);
    // e sin w is far less certain than e cos w.
    expect(
      sigmaOf(m.param('esinw')) / sigmaOf(m.param('ecosw'))
    ).toBeGreaterThan(20);
  });
  test('the grazing pair: k 0.162 against a truth of 0.9, flagged, and its profile open above', () => {
    const m = fitView({ dataset: 2, profile: 1 });
    expect(m.fit.identifiability.parameters.k.status).toBe('not constrained');
    expect(PRESETS[2].truth.k).toBe(0.9);
    expect(
      step('the-grazing-fit').validate({
        k: m.param('k').value,
        l: m.profile.interval[0],
      }).level
    ).toBe('ok');
    expect(m.profile.interval[1] === null || m.profile.interval[1] > 0.5).toBe(
      true
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
  test('two widgets, each with controls and a readout of the model and what it leaves out', () => {
    expect(ECLIPSE_WIDGETS.map(w => w.id)).toEqual([
      'eclipse-curve',
      'eclipse-fit',
    ]);
    for (const w of ECLIPSE_WIDGETS) {
      expect(w.controls.length).toBeGreaterThan(2);
      const rows = w.readout({});
      expect(rows.some(r => r.emphasis)).toBe(true);
      expect(rows[rows.length - 1].value).toMatch(/\S/);
    }
  });
});
