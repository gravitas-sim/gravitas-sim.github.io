// =============================================================================
// The Metallicity Term and the new depth of Which Kind of Variable (Prompt 223)
// -----------------------------------------------------------------------------
// Every number a step states is recomputed from the panels the lessons draw
// (js/variablesIIWidgets.js over js/variablesIIField.js and the kernel), read in the
// form the validator takes and fed to the step's own validator; a wrong reading is
// refused; the Spanish carries the same step structure.
// =============================================================================

import { describe, test, expect, beforeAll } from '@jest/globals';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import '../js/kernels/variables/index.js';
import { loadVariablesData } from '../js/variablesData.js';
import {
  plzView,
  featuresView,
  ambiguityView,
} from '../js/variablesIIField.js';
import { VARIABLES_II_WIDGETS } from '../js/variablesIIWidgets.js';
import {
  THE_METALLICITY_TERM as LESSON,
  THE_METALLICITY_TERM_ES as LESSON_ES,
  THE_METALLICITY_TERM_DEEPER as DEEP,
  THE_METALLICITY_TERM_DEEPER_ES as DEEP_ES,
  INSTRUCTOR,
} from '../js/data/investigations/variables-ii-sequence.js';
import KIND_DEEP from '../js/data/investigations/depth/which-kind-of-variable.js';
import KIND_DEEP_ES from '../js/data/investigations/depth/es/which-kind-of-variable.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fileFetch = async url => ({
  ok: true,
  json: async () =>
    JSON.parse(readFileSync(path.join(REPO, url.slice(1)), 'utf8')),
});
let data;
beforeAll(async () => {
  data = await loadVariablesData(fileFetch);
});
const all = [...LESSON.steps, ...DEEP.steps, ...KIND_DEEP.steps];
const step = sid => all.find(s => s.sid === sid);
const near = (x, y, tol) => Math.abs(x - y) <= tol;

describe('The Metallicity Term: the numbers the steps state', () => {
  test('NGC 4258: 29.403 left out, 29.444 included, a shift of 0.041 mag', () => {
    const a = plzView({ host: 0, term: 0, metal: 0, dz: 0 }, data);
    const b = plzView({ host: 0, term: 1, metal: 0, dz: 0 }, data);
    expect(
      step('the-distance-twice').validate({ a: a.mu, b: b.mu }).level
    ).toBe('ok');
    expect(
      step('the-distance-twice').validate({ a: b.mu, b: a.mu }).level
    ).toBe('error');
    expect(near(a.mu, 29.403, 0.001)).toBe(true);
    expect(near(b.mu, 29.444, 0.001)).toBe(true);
    expect(near(b.shift, 0.0412, 0.0005)).toBe(true);
    expect(near(b.dZ, 0.19, 1e-9)).toBe(true);
  });
  test('the distance changes by 1.9 percent: 7.59 and 7.74 Mpc, and the error is 2.3 percent', () => {
    const a = plzView({ host: 0, term: 0 }, data);
    const b = plzView({ host: 0, term: 1 }, data);
    expect(near(100 * (b.distanceMpc / a.distanceMpc - 1), 1.9, 0.05)).toBe(
      true
    );
    expect(near(a.distanceMpc, 7.59, 0.005)).toBe(true);
    expect(near(b.distanceMpc, 7.74, 0.005)).toBe(true);
    expect(near((100 * a.distanceErrorMpc) / a.distanceMpc, 2.3, 0.05)).toBe(
      true
    );
  });
  test('the error goes from 0.051 to 0.053 and the three new terms are 0.009, 0.011 and 0.004', () => {
    const a = plzView({ host: 0, term: 0 }, data);
    const b = plzView({ host: 0, term: 1 }, data);
    expect(near(a.sigma, 0.051, 0.0005)).toBe(true);
    expect(near(b.sigma, 0.053, 0.0005)).toBe(true);
    expect(near(b.budget.gamma, 0.009, 0.0005)).toBe(true);
    expect(near(b.budget.hostMetallicity, 0.011, 0.0005)).toBe(true);
    expect(near(b.budget.anchorMetallicity, 0.004, 0.0005)).toBe(true);
    expect(near(b.budget.host, 0.043, 0.0005)).toBe(true);
    expect(near(b.budget.anchorDistance, 0.026, 1e-9)).toBe(true);
    expect(near(100 * (b.sigma / a.sigma - 1), 4, 0.3)).toBe(true);
  });
  test('a galaxy 0.6 dex below the LMC is outside the cited span; the cited ones are inside', () => {
    expect(plzView({ host: 0, term: 1, metal: 2, dz: -0.6 }, data).status).toBe(
      'outside-range'
    );
    expect(
      near(
        plzView({ host: 0, term: 1, metal: 2, dz: -0.6 }, data).zHost,
        -0.89,
        1e-9
      )
    ).toBe(true);
    expect(plzView({ host: 0, term: 1, metal: 0 }, data).status).toBe(
      'applied'
    );
    expect(plzView({ host: 1, term: 1, metal: 0 }, data).status).toBe(
      'applied'
    );
    expect(plzView({ host: 0, term: 0 }, data).status).toBe('left-out');
    expect(plzView({ host: 0, term: 1, metal: 1 }, data).shift).toBe(0);
  });
  test('M101: a shift of 0.085 mag and 4.0 percent in distance, 6.95 to 7.23 Mpc', () => {
    const a = plzView({ host: 1, term: 0 }, data);
    const b = plzView({ host: 1, term: 1 }, data);
    expect(step('the-shift-for-m101').validate).toBeUndefined();
    expect(
      near(
        b.shift,
        step('the-shift-for-m101').answer,
        step('the-shift-for-m101').tolerance
      )
    ).toBe(true);
    expect(
      near(
        100 * (b.distanceMpc / a.distanceMpc - 1),
        step('the-distance-for-m101').answer,
        step('the-distance-for-m101').tolerance
      )
    ).toBe(true);
    expect(near(a.distanceMpc, 6.95, 0.005)).toBe(true);
    expect(near(b.distanceMpc, 7.23, 0.005)).toBe(true);
  });
  test('two coefficients: the shifts differ by 0.012 mag; the maser comparison is 0.1 and 0.8 errors', () => {
    const s = step('two-published-coefficients');
    expect(near((0.28 - 0.217) * 0.19, s.answer, s.tolerance)).toBe(true);
    const a = plzView({ host: 0, term: 0 }, data);
    const b = plzView({ host: 0, term: 1 }, data);
    const sig = r => (r.mu - 29.397) / Math.hypot(r.sigma, 0.032);
    expect(near(Math.abs(sig(a)), 0.1, 0.05)).toBe(true);
    expect(near(Math.abs(sig(b)), 0.8, 0.05)).toBe(true);
  });
});

describe('Which Kind of Variable: the new quantitative steps', () => {
  test('SU Draconis: R21 0.539 within 0.007 over 39 cycles', () => {
    const f = featuresView({ star: 0, days: 28 }, data).features;
    const s = step('features-with-their-errors');
    expect(f.status).toBe('ok');
    expect(near(f.fourier.r21.value, s.answer, s.tolerance)).toBe(true);
    expect(near(f.fourier.r21.sigma, 0.007, 0.0005)).toBe(true);
    expect(Math.round(f.cycles)).toBe(39);
  });
  test('Eta Aquilae: six days is 0.83 of a cycle and withdrawn; the whole run is 3.7 and constrained', () => {
    const short = featuresView({ star: 1, days: 6 }, data).features;
    expect(short.status).toBe('not-constrained');
    expect(short.reason).toBe('cycles');
    expect(near(short.cycles, 0.83, 0.005)).toBe(true);
    const whole = featuresView({ star: 1, days: 28 }, data).features;
    expect(whole.status).toBe('ok');
    expect(near(whole.cycles, 3.7, 0.05)).toBe(true);
  });
  test('period and amplitude, 4 of 5: 11 left open, 109 called at 94.5 percent against 90.8; 5 of 5 leaves 37', () => {
    const a = ambiguityView({ features: 1, votes: 4 }, data);
    expect(a.open).toBe(step('when-not-to-say').answer);
    expect(a.called).toBe(109);
    expect(near(100 * a.calledAccuracy, 94.5, 0.05)).toBe(true);
    expect(near(100 * a.accuracyEveryone, 90.8, 0.05)).toBe(true);
    expect(a.openByClass.eclipsing).toBe(6);
    expect(a.openByClass.dscuti).toBe(3);
    expect(ambiguityView({ features: 1, votes: 5 }, data).open).toBe(37);
  });
});

describe('the family, the Spanish and the instructor content', () => {
  test('three panels with the ids the lessons use', () => {
    expect(VARIABLES_II_WIDGETS.map(w => w.id)).toEqual([
      'plz-metallicity',
      'variable-features',
      'variable-ambiguity',
    ]);
    const ids = new Set(VARIABLES_II_WIDGETS.map(w => w.id));
    for (const s of all)
      if (s.tool)
        expect(ids.has(s.tool.id) || s.tool.id === 'variable-class').toBe(true);
  });
  test('the Spanish carries the same structure, step for step', () => {
    expect(LESSON_ES.steps).toHaveLength(LESSON.steps.length);
    expect(DEEP_ES.steps).toHaveLength(DEEP.steps.length);
    expect(KIND_DEEP_ES.steps).toHaveLength(KIND_DEEP.steps.length);
    LESSON.steps.forEach((s, i) => {
      if (s.options)
        expect(LESSON_ES.steps[i].options).toHaveLength(s.options.length);
      if (s.fields)
        expect(LESSON_ES.steps[i].fields).toHaveLength(s.fields.length);
    });
    DEEP.steps.forEach((s, i) => {
      if (s.options)
        expect(DEEP_ES.steps[i].options).toHaveLength(s.options.length);
    });
    KIND_DEEP.steps.forEach((s, i) => {
      if (s.options)
        expect(KIND_DEEP_ES.steps[i].options).toHaveLength(s.options.length);
    });
  });
  test('every flow step and expectation names a step of the lesson', () => {
    const sids = new Set(LESSON.steps.map(s => s.sid));
    for (const f of INSTRUCTOR.flow['the-metallicity-term']) {
      expect(sids.has(f.from)).toBe(true);
      expect(sids.has(f.to)).toBe(true);
    }
    for (const sid of Object.keys(
      INSTRUCTOR.expectations['the-metallicity-term']
    ))
      expect(sids.has(sid)).toBe(true);
  });
});
