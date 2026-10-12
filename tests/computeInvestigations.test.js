import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';

import INTEGRATORS from '../js/data/investigations/integrators-in-practice.js';
import EXTENDING from '../js/data/investigations/extending-an-experiment.js';
import INTEGRATORS_ES from '../js/data/investigations/es/integrators-in-practice.js';
import EXTENDING_ES from '../js/data/investigations/es/extending-an-experiment.js';
import {
  mergeTranslation,
  translationCoverage,
} from '../js/data/investigations/i18n.js';

// =============================================================================
// The two companion investigations of the computational notebooks (Prompt 102)
// -----------------------------------------------------------------------------
// Each graded step takes numbers off the compute page, so a number here is a
// number a notebook declares. This holds every one of them to the notebook's
// own answer (tests/fixtures/compute/<id>.answer.json for the default run and
// investigation-runs.json for the others, both written by
// tools/compute-answers.mjs from the vendored cells), as a student would type
// it: rounded to four significant digits. A notebook that changes, or a step
// whose tolerance drifts, fails here and not in front of a student.
// =============================================================================

const answer = id =>
  JSON.parse(
    JSON.parse(readFileSync(`tests/fixtures/compute/${id}.answer.json`, 'utf8'))
      .envelope
  ).quantities;
const RUNS = JSON.parse(
  readFileSync('tests/fixtures/compute/investigation-runs.json', 'utf8')
);
const four = x => Number(x.toPrecision(4));
const byId = list => Object.fromEntries(list.map(q => [q.id, q]));
const step = (lesson, sid) => lesson.steps.find(s => s.sid === sid);
const verdict = (lesson, sid, values) => step(lesson, sid).validate(values);

describe('Integrators in Practice', () => {
  const main = byId(answer('integrators-compared'));
  const half = RUNS['integrators-compared/steps1000'];
  const app = RUNS['integrators-compared/steps438'];

  test('accepts the four drifts the notebook returns, and refuses a changed one', () => {
    const v = {
      euler: four(main['drift.euler'].value),
      symplectic: four(main['drift.symplectic'].value),
      verlet: four(main['drift.verlet'].value),
      rk4: four(main['drift.rk4'].value),
      steps: main.steps.value,
    };
    expect(verdict(INTEGRATORS, 'four-drifts', v).level).toBe('ok');
    for (const k of ['euler', 'symplectic', 'verlet', 'rk4']) {
      expect(
        verdict(INTEGRATORS, 'four-drifts', { ...v, [k]: v[k] * 1.5 }).level
      ).toBe('error');
    }
    expect(
      verdict(INTEGRATORS, 'four-drifts', { ...v, steps: 10000 }).level
    ).toBe('warn');
    expect(verdict(INTEGRATORS, 'four-drifts', { ...v, rk4: NaN })).toBeNull();
  });

  test('accepts the halved-step run and the improvements worked from the two runs', () => {
    const v = {
      verlet: four(half['drift.verlet'].value),
      rk4: four(half['drift.rk4'].value),
      ratioVerlet: four(
        main['drift.verlet'].value / half['drift.verlet'].value
      ),
      ratioRk4: four(main['drift.rk4'].value / half['drift.rk4'].value),
    };
    expect(verdict(INTEGRATORS, 'halve-the-step', v).level).toBe('ok');
    // Second order is a factor of four; the lesson's claim, from the numbers.
    expect(v.ratioVerlet).toBeGreaterThan(3.8);
    expect(v.ratioVerlet).toBeLessThan(4.2);
    expect(
      verdict(INTEGRATORS, 'halve-the-step', { ...v, ratioVerlet: 2 }).level
    ).toBe('error');
  });

  test('accepts the 438-step run, which is the application’s own step', () => {
    const v = {
      verlet: four(app['drift.verlet'].value),
      rk4: four(app['drift.rk4'].value),
      symplectic: four(app['drift.symplectic'].value),
    };
    expect(verdict(INTEGRATORS, 'the-engine', v).level).toBe('ok');
    // The engine's own figures, quoted in the step: within a half percent for
    // velocity Verlet and RK4 (tests/computeCurriculum.test.js ran the engine).
    expect(Math.abs(app['drift.verlet'].value / 0.002299 - 1)).toBeLessThan(
      0.005
    );
    expect(Math.abs(app['drift.rk4'].value / -1.217e-7 - 1)).toBeLessThan(
      0.005
    );
    expect(
      verdict(INTEGRATORS, 'the-engine', { ...v, verlet: v.verlet * 2 }).level
    ).toBe('error');
  });

  test('says "the application’s step is the tightest pair’s period over about 438"', () => {
    // 12.18 time units over 438 is 0.0278: the figure in the step's text.
    expect(12.1772 / 438).toBeCloseTo(0.0278, 4);
    expect(step(INTEGRATORS, 'the-engine').body).toContain('0.0278');
  });
});

describe('Extending an Experiment', () => {
  const main = byId(answer('population-at-scale'));
  const uniform = RUNS['population-at-scale/slope0'];
  const six = RUNS['population-at-scale/cutoff6'];

  test('accepts the edge, its uncertainty and the two fractions', () => {
    const v = {
      edge: four(main['a.crit'].value),
      edgeSigma: four(main['a.crit'].uncertainty.sigma),
      sample: four(main['bound.sample'].value),
      extended: four(main['bound.extended'].value),
    };
    expect(verdict(EXTENDING, 'the-fit', v).level).toBe('ok');
    for (const k of ['edge', 'edgeSigma', 'sample', 'extended'])
      expect(
        verdict(EXTENDING, 'the-fit', { ...v, [k]: v[k] * 1.5 }).level
      ).toBe('error');
    expect(verdict(EXTENDING, 'the-fit', { ...v, edge: NaN })).toBeNull();
  });

  test('accepts the uniform population and the gap from the trials’ fraction', () => {
    const extended = four(uniform['bound.extended'].value);
    const gap = four(uniform['bound.sample'].value - extended);
    expect(
      verdict(EXTENDING, 'a-uniform-population', { extended, gap }).level
    ).toBe('ok');
    // The lesson's own hand calculation of the same population: (a_c - lo) / (hi - lo).
    expect((uniform['a.crit'].value - 0.12) / (0.42 - 0.12)).toBeCloseTo(
      uniform['bound.extended'].value,
      1
    );
    expect(
      verdict(EXTENDING, 'a-uniform-population', { extended: 0.6, gap }).level
    ).toBe('error');
  });

  test('accepts the cutoff-6 run and says the edge moved by a third of its gap', () => {
    const v = {
      edge: four(six['a.crit'].value),
      extended: four(six['bound.extended'].value),
    };
    expect(verdict(EXTENDING, 'move-the-definition', v).level).toBe('ok');
    const moved = six['a.crit'].value - main['a.crit'].value;
    expect(moved / (0.3443 - 0.2468)).toBeGreaterThan(0.3);
    expect(moved / (0.3443 - 0.2468)).toBeLessThan(0.4);
    expect(
      verdict(EXTENDING, 'move-the-definition', { ...v, edge: 0.255 }).level
    ).toBe('error');
  });

  test('the numbers quoted in the prose are the notebook’s', () => {
    const text = JSON.stringify(EXTENDING.steps);
    expect(text).toContain('0.255');
    expect(text).toContain('0.451');
    expect(text).toContain('0.289');
    expect(four(six['bound.extended'].value)).toBe(0.7007);
    expect(four(main['bound.extended'].uncertainty.sigma)).toBe(0.07597);
  });
});

describe.each([
  ['Integrators in Practice', INTEGRATORS, INTEGRATORS_ES],
  ['Extending an Experiment', EXTENDING, EXTENDING_ES],
])('%s in both locales', (name, lesson, es) => {
  test('every step, option and field has Spanish, aligned by index', () => {
    expect(es.steps).toHaveLength(lesson.steps.length);
    const merged = mergeTranslation(lesson, es);
    expect(merged.title).not.toBe(lesson.title);
    lesson.steps.forEach((s, i) => {
      expect(merged.steps[i].sid).toBe(s.sid);
      expect(merged.steps[i].title).not.toBe(s.title);
      expect(merged.steps[i].body).not.toBe(s.body);
      // A label can be a proper name that reads the same in both languages
      // ("Runge-Kutta 4"), so only that it is present and aligned is held.
      for (const f of s.fields ?? [])
        expect(
          merged.steps[i].fields.find(g => g.id === f.id).label
        ).toBeTruthy();
      (s.options ?? []).forEach((o, j) =>
        expect(merged.steps[i].options[j]).not.toBe(o)
      );
    });
    // What a shadow leaves out on purpose: the card's machinery, and a
    // field's hint, which is the number it expects.
    const { missing } = translationCoverage(lesson, es);
    expect(
      missing.filter(
        k =>
          !/^(duration|level|audience|courseLevel|mathematics|prerequisites\.\d+|steps\.\d+\.compute)$/.test(
            k
          ) && !/\.fields\.\d+\.hint$/.test(k)
      )
    ).toEqual([]);
  });

  test('keeps the vocabulary: investigation, never lesson, in prose', () => {
    const prose = JSON.stringify([lesson.steps, es.steps]);
    expect(prose).not.toMatch(/\blessons?\b/i);
    expect(prose).not.toMatch(/\blabelled\b|\bcolour\b/);
  });
});
