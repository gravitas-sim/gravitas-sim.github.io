import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';

import INTEGRATORS from '../js/data/investigations/integrators-in-practice.js';
import EXTENDING from '../js/data/investigations/extending-an-experiment.js';
import INTEGRATORS_ES from '../js/data/investigations/es/integrators-in-practice.js';
import EXTENDING_ES from '../js/data/investigations/es/extending-an-experiment.js';
import REFITTING from '../js/data/investigations/refitting-a-transit.js';
import PERIODOGRAMS from '../js/data/investigations/two-periodograms.js';
import SAMPLING from '../js/data/investigations/sampling-a-posterior.js';
import REFITTING_ES from '../js/data/investigations/es/refitting-a-transit.js';
import PERIODOGRAMS_ES from '../js/data/investigations/es/two-periodograms.js';
import SAMPLING_ES from '../js/data/investigations/es/sampling-a-posterior.js';
import { ES_DEFERRED } from '../js/i18n/es.deferred.js';
import { lessonKey } from '../js/i18n/lesson.js';
import { stepFingerprint } from '../js/investigations/progressBackup.js';
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

const fingerprint = step => stepFingerprint(step);
const cut = (lesson, from, to) =>
  JSON.stringify(
    lesson.steps.slice(
      lesson.steps.findIndex(s => s.sid === from),
      lesson.steps.findIndex(s => s.sid === to)
    )
  );
// What a lesson says before its first measuring step must not hold a number the
// notebook returns (Prompt 299's rule and L4): digits of an output, to four places.
const outputs = values => values.map(x => String(x));
// A reworded step keeps the fingerprint it had (progressBackup.js:70); the two
// opening steps lose only their scenario, because a quiet canvas stages nothing
// and they are read steps that store no answer.
const BASELINE_FINGERPRINTS = {
  integrators: {
    'which-loses-most': 'predict|-|-|-|-|4|a=0;c=0',
    'four-drifts': 'measure|-|-|-|euler+symplectic+verlet+rk4+steps|-|-',
    'why-bounded': 'question|choice|-|-|-|4|a=0;c=0',
    'the-engine': 'measure|-|-|-|verlet+rk4+symplectic|-|-',
    'phase-luck': 'question|choice|-|-|-|4|a=0;c=0',
    'what-you-worked-out': 'read|-|-|-|-|-|-',
  },
  extending: {
    'how-well-can-twenty-place-an-edge': 'predict|-|-|-|-|4|a=1;c=1',
    'the-fit': 'measure|-|-|-|edge+edgeSigma+sample+extended|-|-',
    'a-uniform-population': 'measure|-|-|-|extended+gap|-|-',
    'why-the-sample-differs': 'question|choice|-|-|-|4|a=0;c=0',
    'what-you-worked-out': 'read|-|-|-|-|-|-',
  },
  refitting: {
    'same-model-another-route': 'read|-|-|-|-|-|-',
    'how-close': 'predict|-|-|-|-|4|a=1;c=1',
    'the-fit': 'measure|-|-|-|period+k+aRs+b+chi2|-|-',
    'sigma-and-profile': 'measure|-|-|-|kSigma+kLow+kHigh+bLow+bHigh|-|-',
    'why-they-differ': 'question|choice|-|-|-|4|a=0;c=0',
    'what-is-not-counted': 'question|choice|-|-|-|4|a=0;c=0',
    'what-you-worked-out': 'read|-|-|-|-|-|-',
  },
  periodograms: {
    'two-ways-to-look-for-a-period': 'read|-|-|-|-|-|-',
    'the-tallest-peak': 'predict|-|-|-|-|4|a=1;c=1',
    'the-two-periods': 'measure|-|-|-|ls+bls+ratio|-|-',
    'why-half': 'question|choice|-|-|-|4|a=0;c=0',
    'what-a-grid-step-is': 'question|choice|-|-|-|4|a=0;c=0',
    'what-you-worked-out': 'read|-|-|-|-|-|-',
  },
  sampling: {
    'what-a-sampler-does': 'read|-|-|-|-|-|-',
    'did-it-converge': 'measure|-|-|-|rhat+ess+acceptance|-|-',
    'profile-and-posterior': 'question|choice|-|-|-|4|a=0;c=0',
    'why-narrower': 'question|choice|-|-|-|4|a=0;c=0',
    'refuse-a-short-run': 'question|choice|-|-|-|4|a=0;c=0',
    'what-you-worked-out': 'read|-|-|-|-|-|-',
  },
};

describe('Integrators in Practice', () => {
  const main = byId(answer('integrators-compared'));
  const choices = {
    250: RUNS['integrators-compared/steps250'],
    438: RUNS['integrators-compared/steps438'],
    750: RUNS['integrators-compared/steps750'],
    1000: RUNS['integrators-compared/steps1000'],
  };
  const six = RUNS['integrators-compared/orbits6'];
  const second = step(INTEGRATORS, 'choose-the-second-step');
  const field = id => second.fields.find(f => f.id === id);
  /** What a student who chose `n` types, as four significant digits. */
  const typed = n => ({
    second: n,
    verlet: four(choices[n]['drift.verlet'].value),
    rk4: four(choices[n]['drift.rk4'].value),
    ratioVerlet: four(
      main['drift.verlet'].value / choices[n]['drift.verlet'].value
    ),
    ratioRk4: four(main['drift.rk4'].value / choices[n]['drift.rk4'].value),
  });

  test('accounts for every step of the matrix, in order', () => {
    expect(INTEGRATORS.steps.map(s => s.sid)).toEqual([
      'one-system-four-steps',
      'which-loses-most',
      'four-drifts',
      'why-bounded',
      'predict-the-halving',
      'choose-the-second-step',
      'the-engine',
      'phase-luck',
      'trust-at-six-orbits',
      'what-you-worked-out',
    ]);
    expect(INTEGRATORS.steps[0].canvas).toBe('quiet');
    expect(INTEGRATORS.steps[0].setup).toBeUndefined();
  });

  test('reworded steps keep their fingerprint and the revised one gets a new id', () => {
    for (const [sid, fp] of Object.entries(BASELINE_FINGERPRINTS.integrators))
      expect(fingerprint(step(INTEGRATORS, sid))).toBe(fp);
    expect(fingerprint(second)).not.toBe(
      'measure|-|-|-|verlet+rk4+ratioVerlet+ratioRk4|-|-'
    );
    expect(second.sid).not.toBe('halve-the-step');
    expect(step(INTEGRATORS, 'halve-the-step')).toBeUndefined();
    expect(INTEGRATORS.retired['halve-the-step']).toMatchObject({
      to: 'choose-the-second-step',
      release: '3.1',
    });
    expect(INTEGRATORS.retired['halve-the-step'].was.es).toBeTruthy();
  });

  test('no notebook output is stated before the step that measures it', () => {
    const before = cut(INTEGRATORS, 'one-system-four-steps', 'four-drifts');
    for (const n of outputs([
      '49.75',
      '0.002317',
      '0.001768',
      '6.47',
      '10722',
      '10,722',
    ]))
      expect(before).not.toContain(n);
    // Nor in the bodies of the runs that follow: the engine's two figures are in
    // the check that follows the run, not in the instruction to make it.
    for (const sid of ['choose-the-second-step', 'the-engine']) {
      const text = JSON.stringify(step(INTEGRATORS, sid).body);
      for (const n of ['0.002299', '1.217', '26.5', '0.000442'])
        expect(text).not.toContain(n);
    }
    // The menu choices and fixed settings are instructions, not outputs.
    expect(step(INTEGRATORS, 'the-engine').body).toContain('0.0278');
  });

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
    // The baseline run says it is the reference every later choice is compared with.
    expect(step(INTEGRATORS, 'four-drifts').body).toMatch(/baseline run/);
  });

  test('the menu is the fixtures: one run per choice, each literal copied from it', () => {
    expect(field('second').options).toEqual([250, 438, 750, 1000]);
    for (const n of field('second').options) {
      const run = choices[n];
      const v = typed(n);
      expect(field('verlet').by[n]).toBe(v.verlet);
      expect(field('rk4').by[n]).toBe(v.rk4);
      expect(field('ratioVerlet').by[n]).toBe(v.ratioVerlet);
      expect(field('ratioRk4').by[n]).toBe(v.ratioRk4);
      // The run is the one the choice names: n steps per period of the tightest pair.
      expect(run.steps.value).toBeGreaterThan(0);
    }
    // The 500-step run the ratios are taken against is the baseline's.
    expect(four(main['drift.verlet'].value)).toBe(0.001768);
    expect(four(main['drift.rk4'].value)).toBe(-6.473e-8);
    // Each choice's step count is in proportion to the run's: more steps, more steps.
    const counts = [250, 438, 750, 1000].map(n => choices[n].steps.value);
    expect(counts).toEqual([...counts].sort((x, y) => x - y));
    // The check's key lists the choices, so an instructor reads them all.
    expect(Object.keys(field('verlet').by)).toEqual([
      '250',
      '438',
      '750',
      '1000',
    ]);
  });

  test('accepts each menu choice with its own results', () => {
    for (const n of [250, 438, 750, 1000]) {
      expect(
        verdict(INTEGRATORS, 'choose-the-second-step', typed(n)).level
      ).toBe('ok');
    }
    // The halving is the one the prediction was about.
    expect(
      verdict(INTEGRATORS, 'choose-the-second-step', typed(1000)).message
    ).toMatch(/second order/);
  });

  test('a number from another setting fails with feedback that names the setting', () => {
    for (const n of [250, 438, 750, 1000]) {
      for (const m of [250, 438, 750, 1000].filter(x => x !== n)) {
        const wrong = verdict(INTEGRATORS, 'choose-the-second-step', {
          ...typed(m),
          second: n,
        });
        expect(wrong.level).toBe('error');
        expect(wrong.message).toContain(`${m}-step run`);
        expect(wrong.message).toContain(`You chose ${n}`);
      }
      // The default's numbers, typed after choosing something else.
      const baseline = verdict(INTEGRATORS, 'choose-the-second-step', {
        ...typed(n),
        verlet: four(main['drift.verlet'].value),
        rk4: four(main['drift.rk4'].value),
      });
      expect(baseline.level).toBe('error');
      expect(baseline.message).toMatch(/baseline run, 500 steps/);
    }
    // Drifts right, ratio the wrong way round: the old number over the new.
    const inverted = verdict(INTEGRATORS, 'choose-the-second-step', {
      ...typed(750),
      ratioVerlet: four(1 / typed(750).ratioVerlet),
    });
    expect(inverted.level).toBe('error');
    expect(inverted.message).toMatch(/old number over the new/);
    // No choice yet.
    expect(
      verdict(INTEGRATORS, 'choose-the-second-step', {
        ...typed(750),
        second: NaN,
      }).level
    ).toBe('warn');
    expect(verdict(INTEGRATORS, 'choose-the-second-step', {})).toBeNull();
  });

  test('velocity Verlet improves by the square of the ratio of step counts at every choice', () => {
    // The sentence on the reveal step says so; the fixtures hold it to a tenth of a percent.
    for (const n of [250, 438, 750, 1000]) {
      const ratio =
        main['drift.verlet'].value / choices[n]['drift.verlet'].value;
      expect(Math.abs(ratio / (n / 500) ** 2 - 1)).toBeLessThan(0.001);
    }
    expect(step(INTEGRATORS, 'the-engine').compare).toMatch(
      /square of the step ratio/
    );
  });

  test('the prediction is about the step ratio, so every menu choice tests it, and it claims neither sixteen for Runge-Kutta 4 nor its own answer in an earlier step', () => {
    const predict = step(INTEGRATORS, 'predict-the-halving');
    expect(predict.type).toBe('predict');
    expect(predict.reveal).toBe('the-engine');
    expect(predict.options).toHaveLength(4);
    expect(predict.options.join(' ')).not.toMatch(/\b16\b|sixteen/i);
    // The right option says the square for Verlet and a higher power for Runge-Kutta 4;
    // every choice of the menu bears it out (the improvement is old drift over new).
    expect(predict.options[predict.answer]).toMatch(
      /squared.*higher power.*at least the fourth/
    );
    for (const n of [250, 438, 750, 1000]) {
      const t = typed(n);
      const r = n / 500;
      expect(t.ratioVerlet / r ** 2).toBeGreaterThan(0.99);
      expect(t.ratioVerlet / r ** 2).toBeLessThan(1.01);
      expect(Math.log(t.ratioRk4) / Math.log(r)).toBeGreaterThan(4);
    }
    // The compare sentence is about the choice made, not about 1000.
    expect(step(INTEGRATORS, 'the-engine').compare).not.toMatch(/about 1000/);
    // Nothing earlier states the improvement: the objectives, the first body and the tips.
    const earlier = JSON.stringify([
      INTEGRATORS.objectives,
      INTEGRATORS.steps.slice(0, 4),
    ]);
    expect(earlier).not.toMatch(/fourfold|four times|squared|sixteen/);
    expect(JSON.stringify(INTEGRATORS_ES.objectives)).not.toMatch(
      /cuatro veces/
    );
  });

  test('no step claims Runge-Kutta 4 is a hundred thousand times better', () => {
    // 0.001768 over 6.47e-8 is about 27,000, and symplectic Euler's 0.002317 gives about 36,000.
    const ratio = Math.abs(
      main['drift.verlet'].value / main['drift.rk4'].value
    );
    expect(ratio).toBeGreaterThan(2e4);
    expect(ratio).toBeLessThan(5e4);
    expect(JSON.stringify([INTEGRATORS, INTEGRATORS_ES])).not.toMatch(
      /hundred thousand|cien mil/
    );
  });

  test('accepts the 438-step run, which is the application’s own step', () => {
    const app = choices[438];
    const v = {
      verlet: four(app['drift.verlet'].value),
      rk4: four(app['drift.rk4'].value),
      symplectic: four(app['drift.symplectic'].value),
    };
    expect(verdict(INTEGRATORS, 'the-engine', v).level).toBe('ok');
    // The engine's own figures, quoted in the check that follows the run: within
    // a half percent for velocity Verlet and RK4 (tests/computeCurriculum.test.js
    // ran the engine).
    expect(Math.abs(app['drift.verlet'].value / 0.002299 - 1)).toBeLessThan(
      0.005
    );
    expect(Math.abs(app['drift.rk4'].value / -1.217e-7 - 1)).toBeLessThan(
      0.005
    );
    const ok = verdict(INTEGRATORS, 'the-engine', v).message;
    expect(ok).toContain('0.002299');
    expect(ok).toContain('1.217');
    expect(
      verdict(INTEGRATORS, 'the-engine', { ...v, verlet: v.verlet * 2 }).level
    ).toBe('error');
    // The reveal step sets the prediction beside the student's own improvements.
    expect(step(INTEGRATORS, 'the-engine').evidence).toEqual([
      { step: 'choose-the-second-step', field: 'ratioVerlet' },
      { step: 'choose-the-second-step', field: 'ratioRk4' },
    ]);
  });

  test('says "the application’s step is the tightest pair’s period over about 438"', () => {
    // 12.18 time units over 438 is 0.0278: the figure in the step's text.
    expect(12.1772 / 438).toBeCloseTo(0.0278, 4);
    expect(step(INTEGRATORS, 'the-engine').body).toContain('0.0278');
  });

  test('the six-orbit run: the feedback does not print the numbers the student is to read off their own run', () => {
    const trust = step(INTEGRATORS, 'trust-at-six-orbits');
    const say = id => trust.misconceptions.find(m => m.id === id).say;
    const d = (run, k) => run[`drift.${k}`].value;
    // What the feedback claims, held to the notebook's own runs.
    expect(Math.abs(d(six, 'rk4'))).toBeGreaterThan(Math.abs(d(main, 'rk4')));
    expect(Math.abs(d(six, 'rk4'))).toBeLessThan(2 * Math.abs(d(main, 'rk4')));
    expect(Math.sign(d(six, 'rk4'))).toBe(Math.sign(d(main, 'rk4')));
    expect(Math.abs(d(six, 'verlet'))).toBeLessThan(
      Math.abs(d(main, 'verlet'))
    );
    expect(d(main, 'verlet') / d(six, 'verlet')).toBeGreaterThan(5);
    expect(Math.sign(d(six, 'symplectic'))).not.toBe(
      Math.sign(d(main, 'symplectic'))
    );
    expect(
      Math.abs(d(six, 'symplectic') / d(main, 'symplectic'))
    ).toBeGreaterThan(10);
    expect(Math.round(d(six, 'euler'))).toBe(60);
    // No six-orbit number, and no digit at all, in what a wrong answer is told, or in the
    // options: the student reads those off their own run.
    for (const id of [
      'smallest-number-is-accurate',
      'bounded-is-representative',
      'euler-trend',
    ])
      expect(say(id)).not.toMatch(/\d/);
    expect(trust.options.join(' ')).not.toMatch(/%/);
    // The Runge-Kutta 4 claim is the two-point one: tiny and within a factor of two, not "steadily".
    expect(JSON.stringify([trust, INTEGRATORS_ES.steps])).not.toMatch(
      /steadily|de forma constante|pre-asymptotic/
    );
    // Authored feedback exists for the plausible wrong turns, one per wrong option, and the
    // smallest-number mistake is among them.
    expect(trust.answer).toBe(0);
    expect(trust.misconceptions.map(m => m.option).sort()).toEqual([1, 2, 3]);
  });

  test('the Spanish feedback of the six-orbit step prints no six-orbit number either', () => {
    const es = mergeTranslation(INTEGRATORS, INTEGRATORS_ES).steps.find(
      s => s.sid === 'trust-at-six-orbits'
    );
    for (const m of es.misconceptions) expect(m.say).not.toMatch(/\d/);
    expect(es.options.join(' ')).not.toMatch(/%/);
  });
});

describe('Extending an Experiment', () => {
  const main = byId(answer('population-at-scale'));
  const uniform = RUNS['population-at-scale/slope0'];
  const runs = {
    2: RUNS['population-at-scale/cutoff2'],
    4: RUNS['population-at-scale/cutoff4'],
    6: RUNS['population-at-scale/cutoff6'],
    10: RUNS['population-at-scale/cutoff10'],
  };
  const moves = RUNS['population-at-scale/moves'];
  const yours = step(EXTENDING, 'move-the-definition-yours');
  const moved = step(EXTENDING, 'which-trial-moved');
  const typedCut = c => ({
    cutoff: c,
    edge: four(runs[c]['a.crit'].value),
    extended: four(runs[c]['bound.extended'].value),
  });
  const pairKey = (a, b) => `${Math.min(a, b)}|${Math.max(a, b)}`;
  /** What a student who compared cutoffs a and b types, from the fixture's trial list. */
  const typedPair = (a, b) => {
    const list = moves[pairKey(a, b)];
    return {
      from: a,
      to: b,
      count: list.length,
      where: list.length ? list[0].bin : NaN,
      where_text: list.length ? String(list[0].bin) : 'none',
    };
  };

  test('accounts for every step of the matrix, in order', () => {
    expect(EXTENDING.steps.map(s => s.sid)).toEqual([
      'twenty-planets',
      'how-well-can-twenty-place-an-edge',
      'the-fit',
      'a-uniform-population',
      'why-the-sample-differs',
      'move-the-definition-yours',
      'which-trial-moved',
      'what-you-worked-out',
    ]);
    expect(EXTENDING.steps[0].canvas).toBe('quiet');
    expect(EXTENDING.steps[0].setup).toBeUndefined();
    expect(EXTENDING.prerequisites).toContain('binary-star-planets');
    expect(
      readFileSync('js/data/investigations/binary-star-planets.js', 'utf8')
    ).toContain("id: 'binary-star-planets'");
    const last = step(EXTENDING, 'what-you-worked-out').body;
    expect(last).toMatch(
      /not the ejection test of the binary-star investigation/
    );
  });

  test('reworded steps keep their fingerprint and each revised step gets a new id', () => {
    for (const [sid, fp] of Object.entries(BASELINE_FINGERPRINTS.extending))
      expect(fingerprint(step(EXTENDING, sid))).toBe(fp);
    expect(fingerprint(yours)).not.toBe('measure|-|-|-|edge+extended|-|-');
    expect(fingerprint(moved)).not.toBe('question|choice|-|-|-|4|a=0;c=0');
    for (const [old, to] of [
      ['move-the-definition', 'move-the-definition-yours'],
      ['what-moved-it', 'which-trial-moved'],
    ]) {
      expect(step(EXTENDING, old)).toBeUndefined();
      expect(EXTENDING.retired[old]).toMatchObject({ to, release: '3.1' });
      expect(EXTENDING.retired[old].was.es).toBeTruthy();
    }
  });

  test('the edge of the bound region is not stated before the run that finds it', () => {
    const second = step(EXTENDING, 'how-well-can-twenty-place-an-edge').body;
    expect(second).not.toMatch(/0\.25|0\.34/);
    expect(JSON.stringify(step(EXTENDING, 'twenty-planets'))).not.toMatch(
      /0\.255|0\.289/
    );
    expect(JSON.stringify(EXTENDING_ES.steps[1])).not.toMatch(/0,25|0,34/);
  });

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

  test('the cutoff menu is the fixtures: one run per choice, each literal copied from it', () => {
    const field = id => yours.fields.find(f => f.id === id);
    expect(field('cutoff').options).toEqual([2, 4, 6, 10]);
    for (const c of field('cutoff').options) {
      expect(field('edge').by[c]).toBe(typedCut(c).edge);
      expect(field('extended').by[c]).toBe(typedCut(c).extended);
    }
    // The baseline the check names for a number from the default's run: cutoff 3.
    expect(four(main['a.crit'].value)).toBe(0.255);
    expect(four(main['bound.extended'].value)).toBe(0.5959);
    // Cutoffs 4, 6 and 10 classify the twenty trials the same way, so they give one result.
    expect(runs[4]).toEqual(runs[6]);
    expect(runs[6]).toEqual(runs[10]);
    expect(runs[2]['bound.sample'].value).toBe(0.55);
    expect(main['bound.sample'].value).toBe(0.6);
    expect(runs[6]['bound.sample'].value).toBe(0.65);
  });

  test('accepts each cutoff on the menu with its own results', () => {
    for (const c of [2, 4, 6, 10])
      expect(
        verdict(EXTENDING, 'move-the-definition-yours', typedCut(c)).level
      ).toBe('ok');
    expect(
      verdict(EXTENDING, 'move-the-definition-yours', typedCut(6)).message
    ).toMatch(/4, 6 and 10 give the same numbers/);
    // The edge moved the way the numbers say.
    expect(runs[2]['a.crit'].value).toBeLessThan(main['a.crit'].value);
    expect(runs[6]['a.crit'].value).toBeGreaterThan(main['a.crit'].value);
    expect(four(runs[6]['bound.extended'].value)).toBe(0.7007);
  });

  test('a number from another cutoff fails with feedback that names the cutoff', () => {
    const wrong = (chose, numbers) =>
      verdict(EXTENDING, 'move-the-definition-yours', {
        ...typedCut(numbers),
        cutoff: chose,
      });
    expect(wrong(6, 2).level).toBe('error');
    expect(wrong(6, 2).message).toContain('cutoff 2');
    expect(wrong(2, 6).message).toContain('cutoffs 4, 6 and 10');
    // The baseline's numbers (cutoff 3), typed after choosing another cutoff.
    const baseline = verdict(EXTENDING, 'move-the-definition-yours', {
      cutoff: 6,
      edge: four(main['a.crit'].value),
      extended: four(main['bound.extended'].value),
    });
    expect(baseline.level).toBe('error');
    expect(baseline.message).toMatch(/baseline run, cutoff 3/);
    expect(baseline.message).toContain('You chose 6');
    // Numbers that are neither, and no choice made yet.
    expect(
      verdict(EXTENDING, 'move-the-definition-yours', {
        cutoff: 6,
        edge: 0.5,
        extended: 0.1,
      }).level
    ).toBe('error');
    expect(
      verdict(EXTENDING, 'move-the-definition-yours', {
        ...typedCut(6),
        cutoff: NaN,
      }).level
    ).toBe('warn');
    expect(verdict(EXTENDING, 'move-the-definition-yours', {})).toBeNull();
  });

  test('the trials that move are the experiment’s own, for every pair of cutoffs', () => {
    const MOVED = JSON.parse(
      readFileSync('js/data/investigations/extending-an-experiment.js', 'utf8')
        .match(/const MOVED = (\{[\s\S]*?\n\});/)[1]
        .replace(/'/g, '"')
        .replace(/,\s*([}\]])/g, '$1')
    );
    expect(Object.keys(MOVED).sort()).toEqual(Object.keys(moves).sort());
    const bound = { 2: 11, 3: 12, 4: 13, 6: 13, 10: 13 };
    for (const [pair, list] of Object.entries(moves)) {
      // Each literal in the step is the fixture's trial, to the four places a student sees.
      expect(MOVED[pair]).toEqual(
        list.map(m => [Number(m.start.toFixed(4)), m.bin])
      );
      // The notebook's own bound counts agree: the pair moves exactly the difference.
      const [a, b] = pair.split('|').map(Number);
      expect(list).toHaveLength(Math.abs(bound[a] - bound[b]));
    }
    expect(bound[3]).toBe(Math.round(main['bound.sample'].value * 20));
    expect(bound[2]).toBe(Math.round(runs[2]['bound.sample'].value * 20));
    expect(bound[6]).toBe(Math.round(runs[6]['bound.sample'].value * 20));
    // The trial the lesson used to name, 0.2315, is the one that moves between 3 and 6.
    expect(moves['3|6']).toHaveLength(1);
    expect(moves['3|6'][0].start.toFixed(4)).toBe('0.2315');
  });

  test('accepts the trial that moved for every pair, and a pair that moves none only with "none"', () => {
    const cutoffs = [2, 3, 4, 6, 10];
    for (const a of cutoffs)
      for (const b of cutoffs.filter(x => x !== a)) {
        expect(
          verdict(EXTENDING, 'which-trial-moved', typedPair(a, b)).level
        ).toBe('ok');
      }
    const none = typedPair(4, 6);
    expect(none).toMatchObject({ count: 0, where_text: 'none' });
    expect(verdict(EXTENDING, 'which-trial-moved', none).level).toBe('ok');
    expect(
      verdict(EXTENDING, 'which-trial-moved', {
        ...none,
        where_text: 'Ninguno',
      }).level
    ).toBe('ok');
    // Zero is not enough, and neither is a number.
    expect(
      verdict(EXTENDING, 'which-trial-moved', {
        ...none,
        where_text: '0',
        where: 0,
      }).level
    ).toBe('error');
    expect(
      verdict(EXTENDING, 'which-trial-moved', { ...none, where_text: '' })
    ).toBeNull();
    expect(
      verdict(EXTENDING, 'which-trial-moved', { ...none, count: 1 }).level
    ).toBe('error');
    // Saying "none" for a pair that moves one is told so.
    const refused = verdict(EXTENDING, 'which-trial-moved', {
      ...typedPair(3, 6),
      count: 0,
      where: NaN,
      where_text: 'none',
    });
    expect(refused.level).toBe('error');
    expect(refused.message).toMatch(/do differ/);
    // The answer for another pair is named.
    const other = verdict(EXTENDING, 'which-trial-moved', {
      ...typedPair(2, 3),
      from: 3,
      to: 6,
    });
    expect(other.level).toBe('error');
    expect(other.message).toContain('cutoffs 2 and 3');
    // The same cutoff twice is not a comparison: a warning, whatever else is typed.
    for (const c of [2, 3, 4, 6, 10]) {
      const twice = verdict(EXTENDING, 'which-trial-moved', {
        from: c,
        to: c,
        count: 0,
        where: NaN,
        where_text: 'none',
      });
      expect(twice.level).toBe('warn');
      expect(twice.message).toMatch(/same cutoff twice/);
    }
    // No pair chosen yet.
    expect(
      verdict(EXTENDING, 'which-trial-moved', { ...typedPair(3, 6), from: NaN })
        .level
    ).toBe('warn');
    expect(verdict(EXTENDING, 'which-trial-moved', {})).toBeNull();
  });

  test('both bins show where the two moved trials stand in the notebook’s table', () => {
    // The notebook's ten bins are 0.03 wide from 0.12; the trial at 0.2315 is in the bin
    // centred on 0.225 and the one at 0.2468 in the bin centred on 0.255.
    const bin = x =>
      Number((0.12 + (Math.floor((x - 0.12) / 0.03) + 0.5) * 0.03).toFixed(3));
    for (const list of Object.values(moves))
      for (const m of list) expect(m.bin).toBe(bin(m.start));
    // And the table the notebook returns holds the bound counts the lesson tells them to compare.
    const table = JSON.parse(
      JSON.parse(
        readFileSync(
          'tests/fixtures/compute/population-at-scale.answer.json',
          'utf8'
        )
      ).table
    );
    expect(table.columns.find(c => c.id === 'bound').name).toBe('bound trials');
    const bound = table.columns.find(c => c.id === 'bound').values;
    expect(bound[3]).toBe(1);
    expect(bound[4]).toBe(1);
  });

  test('the numbers quoted in the prose are the notebook’s', () => {
    const text = JSON.stringify(EXTENDING.steps);
    expect(text).toContain('0.255');
    expect(text).toContain('0.451');
    expect(text).toContain('0.289');
    expect(text).toContain('0.233');
    expect(four(runs[6]['bound.extended'].value)).toBe(0.7007);
    expect(four(runs[2]['bound.extended'].value)).toBe(0.5292);
    expect(four(runs[2]['a.crit'].value)).toBe(0.233);
    expect(four(main['bound.extended'].uncertainty.sigma)).toBe(0.07597);
  });
});

describe('Refitting a Transit', () => {
  const main = byId(answer('refit-transit'));
  const held = RUNS['refit-transit/limb0'];
  const shiftStep = step(REFITTING, 'shift-from-your-fit');
  /** What a student who ran both settings types, as four significant digits. */
  const typedShift = (yours = main.k.value) => ({
    yours: four(yours),
    k: four(held.k.value),
    kSigma: four(held.k.sigma),
    shift: four(Math.abs((held.k.value - yours) / held.k.sigma)),
  });

  test('accounts for every step of the matrix, in order', () => {
    expect(REFITTING.steps.map(s => s.sid)).toEqual([
      'same-model-another-route',
      'how-close',
      'the-fit',
      'sigma-and-profile',
      'why-they-differ',
      'predict-the-shift',
      'shift-from-your-fit',
      'what-is-not-counted',
      'what-you-worked-out',
    ]);
    expect(REFITTING.steps[0].canvas).toBe('quiet');
    expect(REFITTING.steps[0].setup).toBeUndefined();
    // The fit panel is named as the thing to open first, and its SciPy terms are glossed.
    expect(REFITTING.steps[0].body).toMatch(
      /Open the panel on that light curve/
    );
    expect(REFITTING.steps[0].body).toMatch(/covariance/);
  });

  test('reworded steps keep their fingerprint and the revised one gets a new id', () => {
    for (const [sid, fp] of Object.entries(BASELINE_FINGERPRINTS.refitting))
      expect(fingerprint(step(REFITTING, sid))).toBe(fp);
    expect(fingerprint(shiftStep)).not.toBe('measure|-|-|-|k+kSigma+shift|-|-');
    expect(step(REFITTING, 'hold-the-limb-darkening')).toBeUndefined();
    expect(REFITTING.retired['hold-the-limb-darkening']).toMatchObject({
      to: 'shift-from-your-fit',
      release: '3.1',
    });
    expect(REFITTING.retired['hold-the-limb-darkening'].was.es).toBeTruthy();
  });

  test('the interval numbers are not stated before the step that asks about them', () => {
    const text = JSON.stringify([
      step(REFITTING, 'why-they-differ').body,
      step(REFITTING, 'why-they-differ').options,
      REFITTING_ES.steps[4].body,
    ]);
    for (const n of ['0.062', '0.046', '0.071', '0.368', '0.476', '0,062'])
      expect(text).not.toContain(n);
    // The held run's figures are not in the step that sends the student to make it.
    const asks = JSON.stringify(step(REFITTING, 'predict-the-shift'));
    for (const n of ['0.11767', '0.0005', '3.2', '0.0016'])
      expect(asks.replace(/because[\s\S]*$/, '')).not.toContain(n);
  });

  test('accepts the five fitted numbers, and refuses a changed one', () => {
    const v = {
      period: Number(main.P.value.toPrecision(6)),
      k: four(main.k.value),
      aRs: four(main.aRs.value),
      b: four(main.b.value),
      chi2: four(main['chi2.reduced'].value),
    };
    expect(verdict(REFITTING, 'the-fit', v).level).toBe('ok');
    for (const k of Object.keys(v))
      expect(
        verdict(REFITTING, 'the-fit', { ...v, [k]: v[k] * 1.05 }).level
      ).toBe('error');
    expect(verdict(REFITTING, 'the-fit', { ...v, k: NaN })).toBeNull();
  });

  test('accepts the sigma and the two profile intervals', () => {
    const v = {
      kSigma: four(main.k.uncertainty.sigma),
      kLow: four(main['k.profile'].uncertainty.lo),
      kHigh: four(main['k.profile'].uncertainty.hi),
      bLow: four(main['b.profile'].uncertainty.lo),
      bHigh: four(main['b.profile'].uncertainty.hi),
    };
    expect(verdict(REFITTING, 'sigma-and-profile', v).level).toBe('ok');
    expect(
      verdict(REFITTING, 'sigma-and-profile', { ...v, bLow: 0.3 }).level
    ).toBe('error');
    // The lopsidedness the question is about: the profile of b is wider
    // below its best value than above it, where its sigma is symmetric.
    const b = main.b.value;
    expect(b - main['b.profile'].uncertainty.lo).toBeGreaterThan(
      main['b.profile'].uncertainty.hi - b
    );
  });

  test('the shift is about the old sigma, which is what the prediction says, and several new ones', () => {
    const moved = Math.abs(held.k.value - main.k.value);
    // The held run moves Rp/R* by about its old sigma (0.97 of it) and by 3.2 of its new ones.
    expect(moved / main.k.uncertainty.sigma).toBeGreaterThan(0.8);
    expect(moved / main.k.uncertainty.sigma).toBeLessThan(1.1);
    expect(moved / held.k.sigma).toBeGreaterThan(3);
    expect(held.k.sigma).toBeLessThan(main.k.uncertainty.sigma / 3 + 1e-4);
    const predict = step(REFITTING, 'predict-the-shift');
    expect(predict.options[predict.answer]).toMatch(/^about that sigma, /);
    expect(predict.reveal).toBe('shift-from-your-fit');
    expect(REFITTING.steps.findIndex(s => s.sid === predict.sid)).toBe(
      REFITTING.steps.findIndex(s => s.sid === 'shift-from-your-fit') - 1
    );
  });

  test('accepts the run with the limb darkening held, worked out from the student’s own value', () => {
    expect(verdict(REFITTING, 'shift-from-your-fit', typedShift()).level).toBe(
      'ok'
    );
    // A value of one's own that is a little off the notebook's, with a shift worked out from it.
    const mine = typedShift(0.1191);
    expect(mine.shift).toBeGreaterThan(2.5);
    expect(verdict(REFITTING, 'shift-from-your-fit', mine).level).toBe('ok');
    // The fixed 3.2 is not accepted against the student's own number when it differs from it.
    expect(
      verdict(REFITTING, 'shift-from-your-fit', { ...mine, shift: 3.2 }).level
    ).toBe('error');
    expect(
      verdict(REFITTING, 'shift-from-your-fit', { ...typedShift(), shift: 1 })
        .level
    ).toBe('error');
    // The fitted run typed as the held one, and an own value from some other run.
    expect(
      verdict(REFITTING, 'shift-from-your-fit', {
        ...typedShift(),
        k: four(main.k.value),
      }).message
    ).toMatch(/fitted run again/);
    expect(
      verdict(REFITTING, 'shift-from-your-fit', {
        ...typedShift(),
        yours: 0.125,
      }).message
    ).toMatch(/limb darkening fitted/);
    expect(verdict(REFITTING, 'shift-from-your-fit', {})).toBeNull();
    expect(
      verdict(REFITTING, 'shift-from-your-fit', {
        ...typedShift(),
        yours: NaN,
      })
    ).toBeNull();
  });

  test('the numbers quoted in the prose are the notebook’s', () => {
    const text = JSON.stringify(REFITTING.steps);
    expect(text).toContain('0.0016');
    expect(four(main['chi2.reduced'].value)).toBe(7.981);
    // The 0.0027 the last step quotes is the sigma times the panel's red-noise factor.
    expect(main.k.uncertainty.sigma * 1.656).toBeCloseTo(0.0027, 4);
    // The held run's sigma is a third of the fitted one's, as the close says.
    expect(main.k.uncertainty.sigma / held.k.sigma).toBeGreaterThan(3);
  });
});

describe('Two Periodograms', () => {
  const main = byId(answer('periodograms'));
  const runs = {
    2: RUNS['periodograms/limit2'],
    3: RUNS['periodograms/limit3'],
    4: RUNS['periodograms/limit4'],
    6: main,
    8: RUNS['periodograms/limit8'],
  };
  /** A run's quantity, from the main answer or a generated run. */
  const q = (n, id) => (n === 6 ? main[id].value : runs[n][id].value);
  const box = step(PERIODOGRAMS, 'the-box-with-your-limit');
  const apart = step(PERIODOGRAMS, 'separation-from-your-period');
  const bf = id => box.fields.find(f => f.id === id);
  const typedBox = n => ({
    limit: n,
    duration: Number(q(n, 'bls.duration').toFixed(1)),
    depth: Math.round(q(n, 'bls.depth')),
    snr: Number(q(n, 'bls.snr').toFixed(1)),
    edge: Math.abs(q(n, 'bls.duration') - n) < 1e-6 ? 1 : 0,
  });
  const typedApart = (n, factor = 1.7) => {
    const sigmas = Math.abs(q(n, 'bls.period') - 3.52454) / 0.00003;
    return {
      period: Number(q(n, 'bls.period').toFixed(5)),
      sigmas: four(sigmas),
      corrected: four(sigmas / factor),
      survives: 1,
    };
  };

  test('accounts for every step of the matrix, in order', () => {
    expect(PERIODOGRAMS.steps.map(s => s.sid)).toEqual([
      'two-ways-to-look-for-a-period',
      'the-tallest-peak',
      'the-two-periods',
      'why-half',
      'the-box-with-your-limit',
      'separation-from-your-period',
      'what-a-grid-step-is',
      'what-you-worked-out',
    ]);
    expect(PERIODOGRAMS.steps[0].canvas).toBe('quiet');
    expect(PERIODOGRAMS.steps[0].setup).toBeUndefined();
  });

  test('reworded steps keep their fingerprint and each revised step gets a new id', () => {
    for (const [sid, fp] of Object.entries(BASELINE_FINGERPRINTS.periodograms))
      expect(fingerprint(step(PERIODOGRAMS, sid))).toBe(fp);
    expect(fingerprint(box)).not.toBe('measure|-|-|-|duration+depth+snr|-|-');
    expect(fingerprint(apart)).not.toBe('measure|-|-|-|difference+sigmas|-|-');
    for (const [old, to] of [
      ['the-box', 'the-box-with-your-limit'],
      ['against-the-fit', 'separation-from-your-period'],
    ]) {
      expect(step(PERIODOGRAMS, old)).toBeUndefined();
      expect(PERIODOGRAMS.retired[old]).toMatchObject({ to, release: '3.1' });
      expect(PERIODOGRAMS.retired[old].was.es).toBeTruthy();
    }
  });

  test('the search range is not stated before the run that makes it', () => {
    const peak = step(PERIODOGRAMS, 'the-tallest-peak').body;
    expect(peak).not.toMatch(/half a day|fifteen|15 days/);
    expect(JSON.stringify(PERIODOGRAMS_ES.steps[1].body)).not.toMatch(
      /medio día|quince/
    );
  });

  test('accepts the two best periods and their ratio', () => {
    const v = {
      ls: four(main['ls.period'].value),
      bls: four(main['bls.period'].value),
      ratio: four(main['period.ratio'].value),
    };
    expect(verdict(PERIODOGRAMS, 'the-two-periods', v).level).toBe('ok');
    expect(
      verdict(PERIODOGRAMS, 'the-two-periods', { ...v, ls: 3.524 }).level
    ).toBe('error');
    expect(
      verdict(PERIODOGRAMS, 'the-two-periods', { ...v, ls: NaN })
    ).toBeNull();
  });

  test('the best box reaches the limit when the limit is below it, and only then', () => {
    // Verified by the generated runs: the best box is as long as the limit at 2 hours,
    // and inside the range at every other limit on the menu.
    expect(q(2, 'bls.duration')).toBe(2);
    for (const n of [3, 4, 6, 8]) {
      expect(q(n, 'bls.duration')).toBeGreaterThan(2.4);
      expect(q(n, 'bls.duration')).toBeLessThan(n);
    }
    // And a shorter box rests on fewer points: its signal-to-noise ratio is the lowest.
    for (const n of [3, 4, 6, 8])
      expect(q(2, 'bls.snr')).toBeLessThan(q(n, 'bls.snr') / 1.5);
    expect(q(2, 'bls.depth')).toBeGreaterThan(q(6, 'bls.depth'));
  });

  test('the menu is the fixtures: one run per choice, each literal copied from it', () => {
    expect(bf('limit').options).toEqual([2, 3, 4, 6, 8]);
    for (const n of bf('limit').options) {
      const v = typedBox(n);
      expect(bf('duration').by[n]).toBe(v.duration);
      expect(bf('depth').by[n]).toBe(v.depth);
      expect(bf('snr').by[n]).toBe(v.snr);
      expect(bf('edge').by[n]).toBe(v.edge);
    }
    // Limits 4 and 6 give the same box: the lesson says so by name.
    expect(typedBox(4)).toEqual({ ...typedBox(6), limit: 4 });
    // The default run is the main answer, the one the earlier steps used.
    expect(four(main['bls.depth'].value)).toBe(14580);
  });

  test('accepts each menu choice with its own results', () => {
    for (const n of [2, 3, 4, 6, 8])
      expect(
        verdict(PERIODOGRAMS, 'the-box-with-your-limit', typedBox(n)).level
      ).toBe('ok');
    expect(
      verdict(PERIODOGRAMS, 'the-box-with-your-limit', typedBox(2)).message
    ).toMatch(/the limit itself/);
    expect(
      verdict(PERIODOGRAMS, 'the-box-with-your-limit', typedBox(3)).message
    ).toMatch(/inside the range/);
  });

  test('a number from another limit fails with feedback that names the limit', () => {
    for (const n of [2, 3, 6, 8]) {
      for (const m of [2, 3, 6, 8].filter(x => x !== n)) {
        const wrong = verdict(PERIODOGRAMS, 'the-box-with-your-limit', {
          ...typedBox(m),
          limit: n,
        });
        expect(wrong.level).toBe('error');
        expect(wrong.message).toContain(`You chose ${n}`);
        expect(wrong.message).toContain(
          m === 6 ? 'limits 4 and 6' : `limit ${m}`
        );
      }
    }
    // The reference run's box, typed after choosing the limit that sits at the edge.
    const reference = verdict(PERIODOGRAMS, 'the-box-with-your-limit', {
      ...typedBox(6),
      limit: 2,
    });
    expect(reference.message).toContain('limits 4 and 6');
    // Numbers right, but the edge read the wrong way, in both directions.
    expect(
      verdict(PERIODOGRAMS, 'the-box-with-your-limit', {
        ...typedBox(2),
        edge: 0,
      }).message
    ).toMatch(/at the edge of the range/);
    expect(
      verdict(PERIODOGRAMS, 'the-box-with-your-limit', {
        ...typedBox(8),
        edge: 1,
      }).message
    ).toMatch(/shorter than the limit/);
    // No choice yet; nothing entered.
    expect(
      verdict(PERIODOGRAMS, 'the-box-with-your-limit', {
        ...typedBox(3),
        limit: NaN,
      }).level
    ).toBe('warn');
    expect(verdict(PERIODOGRAMS, 'the-box-with-your-limit', {})).toBeNull();
  });

  test('the separation is worked out from the student’s own period, and survives the red-noise factor', () => {
    for (const n of [2, 3, 4, 6, 8]) {
      expect(
        verdict(PERIODOGRAMS, 'separation-from-your-period', typedApart(n))
          .level
      ).toBe('ok');
      // Every choice stays beyond ten of the fit's uncertainties, so the grid-step question may say so,
      // and beyond three of the larger ones, so "survives" is the right answer for each.
      expect(Number(typedApart(n).sigmas)).toBeGreaterThan(10);
      expect(Number(typedApart(n).corrected)).toBeGreaterThan(3);
    }
    // The factor is the panel's 1.66, which the refitting investigation quotes: about 1.7.
    expect(JSON.stringify(REFITTING.steps)).toContain('1.66');
    expect(Math.round(1.66 * 10) / 10).toBe(1.7);
    const v = typedApart(6);
    // Multiplied instead of divided, and the factor left out.
    expect(
      verdict(PERIODOGRAMS, 'separation-from-your-period', {
        ...v,
        corrected: four(v.sigmas * 1.7),
      }).message
    ).toMatch(/divide by 1\.7, not multiply/);
    expect(
      verdict(PERIODOGRAMS, 'separation-from-your-period', {
        ...v,
        corrected: v.sigmas,
      }).level
    ).toBe('error');
    // The separation is not from the student's own period.
    expect(
      verdict(PERIODOGRAMS, 'separation-from-your-period', {
        ...v,
        sigmas: 3,
        corrected: 1.8,
      }).message
    ).toMatch(/Subtract your period/);
    // "No" is not the right answer, and a period that is not the notebook's is refused.
    expect(
      verdict(PERIODOGRAMS, 'separation-from-your-period', {
        ...v,
        survives: 0,
      }).message
    ).toMatch(/survives the correction/);
    expect(
      verdict(PERIODOGRAMS, 'separation-from-your-period', {
        ...v,
        period: 3.52454,
      }).level
    ).toBe('error');
    expect(verdict(PERIODOGRAMS, 'separation-from-your-period', {})).toBeNull();
  });

  test('the harmonics the question quotes are the Lomb-Scargle table’s', () => {
    // The question quotes 0.056, 0.073, 0.071, 0.071 at P, P/2, P/3, P/4; the
    // fixture holds the peak (0.0723 at P/2) and the table is checked in
    // tests/computeCurriculum.test.js against a Lomb-Scargle written again.
    expect(four(main['ls.power'].value)).toBe(0.07233);
    expect(four(main['period.ratio'].value)).toBe(0.502);
  });
});

describe('Sampling a Posterior', () => {
  const main = byId(answer('posterior-sampling'));
  const width = q => q.uncertainty.hi - q.uncertainty.lo;
  const run = n => RUNS[`posterior-sampling/aRs${n}`];
  const MENU = [8, 8.5, 9.21, 10];
  const draws = step(SAMPLING, 'the-draws-at-your-ratio');
  const df = id => draws.fields.find(f => f.id === id);
  const refusals = RUNS['posterior-sampling/refusals'];
  /** A run's median and interval width, from the main answer or a generated run. */
  const of = (n, id) =>
    n === 9.21
      ? { value: main[id].value, width: width(main[id]) }
      : {
          value: run(n)[id].value,
          width: run(n)[id].hi - run(n)[id].lo,
        };
  /** What a student who held a/R* at n types, as four significant digits. */
  const typed = n => ({
    ratio: n,
    k: four(of(n, 'k').value),
    kWidth: four(of(n, 'k').width),
    b: four(of(n, 'b').value),
    bWidth: four(of(n, 'b').width),
  });

  test('accounts for every step of the matrix, in order', () => {
    expect(SAMPLING.steps.map(s => s.sid)).toEqual([
      'what-a-sampler-does',
      'pick-the-ratio-predict-the-width',
      'the-draws-at-your-ratio',
      'did-it-converge',
      'profile-and-posterior',
      'why-narrower',
      'refuse-a-short-run',
      'what-you-worked-out',
    ]);
    expect(SAMPLING.steps[0].canvas).toBe('quiet');
    expect(SAMPLING.steps[0].setup).toBeUndefined();
  });

  test('reworded steps keep their fingerprint and each revised step gets a new id', () => {
    for (const [sid, fp] of Object.entries(BASELINE_FINGERPRINTS.sampling))
      expect(fingerprint(step(SAMPLING, sid))).toBe(fp);
    expect(fingerprint(draws)).not.toBe('measure|-|-|-|k+kWidth+b+bWidth|-|-');
    for (const [old, to] of [
      ['how-wide', 'pick-the-ratio-predict-the-width'],
      ['the-draws', 'the-draws-at-your-ratio'],
    ]) {
      expect(step(SAMPLING, old)).toBeUndefined();
      expect(SAMPLING.retired[old]).toMatchObject({ to, release: '3.1' });
      expect(SAMPLING.retired[old].was.es).toBeTruthy();
    }
    // The prediction is held and revealed at the run that settles it.
    expect(step(SAMPLING, 'pick-the-ratio-predict-the-width').reveal).toBe(
      'the-draws-at-your-ratio'
    );
  });

  test('the median moves with the held a/R* and the width stays narrow, whichever is held', () => {
    // Verified by the generated runs before the text was written: the median of Rp/R* falls
    // as the held a/R* rises, by many half-widths of the interval, and the interval stays
    // about a twelfth of the fit panel's sigma wide.
    const medians = MENU.map(n => of(n, 'k').value);
    expect([...medians].sort((x, y) => y - x)).toEqual(medians);
    for (const n of MENU) {
      const half = of(n, 'k').width / 2;
      expect(0.0016 / half).toBeGreaterThan(10);
      expect(0.0016 / half).toBeLessThan(13);
      if (n !== 9.21)
        expect(Math.abs(of(n, 'k').value - 0.1193) / half).toBeGreaterThan(10);
    }
    const widths = MENU.map(n => of(n, 'k').width);
    expect(Math.max(...widths) / Math.min(...widths)).toBeLessThan(1.3);
    // The impact parameter moves with it too: it is the held value's trade.
    expect(of(8, 'b').value - of(10, 'b').value).toBeGreaterThan(0.3);
  });

  test('the menu is the fixtures: one run per choice, each literal copied from it', () => {
    expect(df('ratio').options).toEqual(MENU);
    for (const n of MENU) {
      const v = typed(n);
      expect(df('k').by[n]).toBe(v.k);
      expect(df('kWidth').by[n]).toBe(v.kWidth);
      expect(df('b').by[n]).toBe(v.b);
      expect(df('bWidth').by[n]).toBe(v.bWidth);
    }
    // 9.21 is the notebook's own setting: its run is the main answer.
    expect(four(main.k.value)).toBe(0.1193);
    // Every run is one the notebook accepted: its diagnostics pass its limits.
    for (const n of MENU.filter(x => x !== 9.21)) {
      expect(run(n)['rhat.max'].value).toBeLessThan(1.05);
      expect(run(n)['ess.min'].value).toBeGreaterThan(400);
    }
  });

  test('accepts each menu choice with its own results, and the convergence step takes any of them', () => {
    for (const n of MENU)
      expect(verdict(SAMPLING, 'the-draws-at-your-ratio', typed(n)).level).toBe(
        'ok'
      );
    expect(
      verdict(SAMPLING, 'the-draws-at-your-ratio', typed(8)).message
    ).toMatch(/a narrow interval around a different value/);
    expect(
      verdict(SAMPLING, 'the-draws-at-your-ratio', typed(9.21)).message
    ).toMatch(/the value the fit panel found/);
    // R-hat, effective sample size and acceptance at every choice are inside what the step accepts.
    for (const n of MENU) {
      const r = n === 9.21 ? main : run(n);
      const get = id => (n === 9.21 ? r[id].value : r[id].value);
      expect(
        verdict(SAMPLING, 'did-it-converge', {
          rhat: four(get('rhat.max')),
          ess: four(get('ess.min')),
          acceptance: four(get('acceptance')),
        }).level
      ).toBe('ok');
      // The profile ratios the reworded step asks the student to read are close to one.
      expect(Math.abs(get('k.width.ratio') - 1)).toBeLessThan(0.05);
      expect(Math.abs(get('b.width.ratio') - 1)).toBeLessThan(0.05);
      // And the sampler agrees with the grid, as the feedback says.
      expect(get('grid.offset')).toBeLessThan(0.03);
    }
  });

  test('a number from another setting fails with feedback that names the setting', () => {
    for (const n of MENU) {
      for (const m of MENU.filter(x => x !== n)) {
        const wrong = verdict(SAMPLING, 'the-draws-at-your-ratio', {
          ...typed(m),
          ratio: n,
        });
        expect(wrong.level).toBe('error');
        expect(wrong.message).toContain(`a/R* ${m}`);
        expect(wrong.message).toContain(`You chose ${n}`);
      }
    }
    // Medians right, widths not: told to subtract the ends.
    expect(
      verdict(SAMPLING, 'the-draws-at-your-ratio', {
        ...typed(8),
        kWidth: 0.0032,
      }).message
    ).toMatch(/subtract the low end/);
    // No choice yet; nothing entered.
    expect(
      verdict(SAMPLING, 'the-draws-at-your-ratio', {
        ...typed(8),
        ratio: NaN,
      }).level
    ).toBe('warn');
    expect(verdict(SAMPLING, 'the-draws-at-your-ratio', {})).toBeNull();
    expect(
      verdict(SAMPLING, 'the-draws-at-your-ratio', { ...typed(8), k: NaN })
    ).toBeNull();
  });

  test('accepts the three convergence diagnostics', () => {
    const v = {
      rhat: four(main['rhat.max'].value),
      ess: four(main['ess.min'].value),
      acceptance: four(main.acceptance.value),
    };
    expect(verdict(SAMPLING, 'did-it-converge', v).level).toBe('ok');
    expect(
      verdict(SAMPLING, 'did-it-converge', { ...v, rhat: 1.3 }).level
    ).toBe('error');
  });

  test('which step counts are refused is the generated runs’, and the question’s text says it', () => {
    const counts = Object.keys(refusals).map(Number);
    expect(counts).toEqual([1000, 2000, 3000, 4000, 5000]);
    const refused = counts.filter(n => refusals[n].refused);
    const accepted = counts.filter(n => !refusals[n].refused);
    // The short runs are refused and the long ones are not, with one boundary.
    expect(Math.max(...refused)).toBeLessThan(Math.min(...accepted));
    for (const n of refused)
      expect(refusals[n].message).toMatch(/the run is refused/);
    const q = step(SAMPLING, 'refuse-a-short-run');
    const list = refused.map(n => n.toLocaleString('en-US'));
    expect(q.because).toContain(
      `${list.slice(0, -1).join(', ')} and ${list.at(-1)} steps`
    );
    // "An autocorrelation time here is about 40 steps": the notebook's own, at the accepted run.
    expect(refusals[Math.min(...accepted)]['tau.max']).toBeGreaterThan(35);
    expect(refusals[Math.min(...accepted)]['tau.max']).toBeLessThan(45);
    expect(q.because).toContain(Math.min(...accepted).toLocaleString('en-US'));
    expect(q.options[q.answer]).toMatch(/^The short runs/);
    // The question is asked before the two runs, and does not state its own answer.
    expect(q.body).not.toContain(Math.min(...accepted).toLocaleString('en-US'));
  });

  test('the numbers quoted in the prose are the notebook’s', () => {
    const text = JSON.stringify(SAMPLING.steps);
    expect(text).toContain('128,000');
    // 4 ensembles x 8 walkers x 8,000 steps is 256,000 draws; the second half
    // of each chain is kept.
    expect(four(main['k.width.ratio'].value)).toBe(0.9907);
    expect(four(main['b.width.ratio'].value)).toBe(0.9913);
    // The fit panel's sigma against this interval's half-width: twelve times.
    expect(0.0016 / (width(main.k) / 2)).toBeGreaterThan(11);
    expect(0.0016 / (width(main.k) / 2)).toBeLessThan(13);
  });
});

describe.each([
  ['Integrators in Practice', INTEGRATORS, INTEGRATORS_ES],
  ['Extending an Experiment', EXTENDING, EXTENDING_ES],
  ['Refitting a Transit', REFITTING, REFITTING_ES],
  ['Two Periodograms', PERIODOGRAMS, PERIODOGRAMS_ES],
  ['Sampling a Posterior', SAMPLING, SAMPLING_ES],
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
    // field's expected value, which is the number it expects.
    const { missing } = translationCoverage(lesson, es);
    expect(
      missing.filter(
        k =>
          !/^(duration|level|audience|courseLevel|mathematics|prerequisites\.\d+|steps\.\d+\.compute)$/.test(
            k
          ) && !/\.fields\.\d+\.want$/.test(k)
      )
    ).toEqual([]);
  });

  test('keeps the vocabulary: investigation, never lesson, in prose', () => {
    const prose = JSON.stringify([lesson.steps, es.steps]);
    expect(prose).not.toMatch(/\blessons?\b/i);
    expect(prose).not.toMatch(/\blabelled\b|\bcolour\b/);
  });
});

describe('The Spanish of the static check messages', () => {
  // A check's sentence is translated by what it says (js/i18n/lesson.js). The ones that
  // carry a number from the student's choice are English until they are enumerated.
  const cutoff = c => ({
    cutoff: c,
    edge: c === 2 ? 0.233 : 0.289,
    extended: c === 2 ? 0.5292 : 0.7007,
  });
  const messages = [
    verdict(INTEGRATORS, 'choose-the-second-step', {
      second: NaN,
      verlet: 1,
      rk4: 1,
    }),
    verdict(INTEGRATORS, 'choose-the-second-step', {
      second: 1000,
      verlet: 0.0004419,
      rk4: -2.443e-9,
      ratioVerlet: 4.0,
      ratioRk4: 26.5,
    }),
    verdict(EXTENDING, 'move-the-definition-yours', {
      cutoff: NaN,
      edge: 1,
      extended: 1,
    }),
    verdict(EXTENDING, 'move-the-definition-yours', cutoff(2)),
    verdict(EXTENDING, 'move-the-definition-yours', cutoff(6)),
    verdict(EXTENDING, 'which-trial-moved', { count: 1, from: NaN, to: NaN }),
    verdict(EXTENDING, 'which-trial-moved', {
      from: 3,
      to: 3,
      count: 0,
      where_text: 'none',
      where: NaN,
    }),
  ].map(r => r.message);

  test('each is in the Spanish catalog', () => {
    expect(messages).toHaveLength(7);
    for (const m of messages) {
      expect(ES_DEFERRED[lessonKey(m)]).toBeTruthy();
    }
  });
});
