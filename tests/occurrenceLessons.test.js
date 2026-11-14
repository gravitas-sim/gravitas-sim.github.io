// =============================================================================
// How Many Earths? and the upper depth of Who Gets Counted (Roadmap III, Prompt 229)
// -----------------------------------------------------------------------------
// Every number a step states is recomputed from the panels the lesson draws
// (js/occurrenceWidgets.js over js/occurrenceField.js and the occurrence kernel), read in the
// form the step takes and fed to the step's own validator; a wrong reading is refused; the
// Spanish carries the same step structure; the lesson closes on a core step and the deeper
// steps hang on core ones.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
// The shared modules first: Jest's VM loses a module several imports link at once.
import '../js/kernels/occurrence/index.js';
import {
  FLOOR,
  SURVEY,
  binRecord,
  radiusRow,
  radiusSum,
  starsWithEpochs,
  truth,
  curvePoints,
} from '../js/occurrenceField.js';
import { OCCURRENCE_WIDGETS } from '../js/occurrenceWidgets.js';
import {
  HOW_MANY_EARTHS as LESSON,
  HOW_MANY_EARTHS_ES as LESSON_ES,
  HOW_MANY_EARTHS_DEEPER as DEEP,
  HOW_MANY_EARTHS_DEEPER_ES as DEEP_ES,
} from '../js/data/investigations/occurrence-sequence.js';
import WHO from '../js/data/investigations/depth/who-gets-counted.js';
import WHO_ES from '../js/data/investigations/depth/es/who-gets-counted.js';

const all = [...LESSON.steps, ...DEEP.steps];
const step = sid => all.find(s => s.sid === sid);
const ok = (sid, v) => expect(step(sid).validate(v).level).toBe('ok');
const bad = (sid, v) => expect(step(sid).validate(v).level).toBe('error');
/** The bin a step's grid panel shows, read as the panel reads its control values. */
const binOf = sid => {
  const v = step(sid).tool.values;
  return binRecord({
    seed: v.seed,
    j: v.period,
    k: v.radius,
    level: v.level ? 0.95 : 0.6827,
    mode: ['none', 'stated', 'doubled'][v.reliability ?? 1],
  });
};

describe('the numbers the steps quote', () => {
  test('36 percent of the smallest planets at 8 to 16 days, 85 percent at 1 to 2 Earth radii', () => {
    expect(SURVEY.efficiency[3][0]).toBeCloseTo(0.36, 2);
    expect(SURVEY.efficiency[3][1]).toBeCloseTo(0.85, 2);
    expect(SURVEY.efficiency[3][2]).toBeGreaterThan(0.98);
    const tool = step('who-the-survey-sees').tool.values;
    expect([tool.radius, tool.period]).toEqual([0, 3]);
  });

  test('ten listings over a completeness of 82 are 0.116 planets per star, with the reliability of 0.95', () => {
    const r = binOf('how-many-it-lists');
    expect(r.status).toBe('ok');
    expect(r.n).toBe(10);
    expect(r.E).toBeCloseTo(81.8, 1);
    expect(r.reliability).toBeCloseTo(0.95, 12);
    expect(r.rate).toBeCloseTo((10 * 0.95) / r.E, 12);
    expect(r.rate).toBeCloseTo(0.116, 3);
    expect(10 / r.E).toBeCloseTo(0.122, 3);
    expect(r.lo).toBeCloseTo(0.08, 2);
    expect(r.hi).toBeCloseTo(0.166, 3);
  });

  test('another population moves the bin within its interval: 9 listings and 0.105 at seed 2, 7 and 0.081 at seed 3', () => {
    const a = binOf('the-next-population');
    expect([a.n, Number(a.rate.toFixed(3))]).toEqual([9, 0.105]);
    const c = binRecord({ seed: 3, j: 3, k: 1 });
    expect([c.n, Number(c.rate.toFixed(3))]).toEqual([7, 0.081]);
    // all of them inside the interval of the first seed's rate, widened to its upper end
    const first = binRecord({ seed: 1, j: 3, k: 1 });
    for (const r of [a, c]) expect(r.rate).toBeLessThan(first.hi);
  });

  test('a bin the survey cannot see: a completeness of 1.3 under the floor of 5, no rate and no limit', () => {
    const r = binOf('a-bin-it-cannot-see');
    expect(r.status).toBe('not-constrained');
    expect(r.E).toBeCloseTo(1.3, 1);
    expect(r.E).toBeLessThan(FLOOR);
    expect('rate' in r || 'upperLimit' in r).toBe(false);
  });

  test('a bin with none: the 95 percent limit is 3.0 over a completeness of 96.4, 0.031', () => {
    const r = binOf('a-bin-with-none');
    expect(r.status).toBe('upper-limit');
    expect(r.upperLimit).toBeCloseTo(-Math.log(0.05) / r.E, 12);
    expect(r.upperLimit).toBeCloseTo(0.031, 3);
    expect(r.E).toBeCloseTo(96.4, 1);
  });

  test('a stated reliability of 0.8 at 64 to 128 days takes the rate from 0.224 to 0.179', () => {
    const none = binOf('what-a-stated-reliability-does');
    const stated = binRecord({ seed: 1, j: 6, k: 2, mode: 'stated' });
    expect(none.rate).toBeCloseTo(0.224, 3);
    expect(stated.rate).toBeCloseTo(0.179, 3);
    expect(stated.rate / none.rate).toBeCloseTo(0.8, 12);
    expect(none.n).toBe(4);
  });

  test('the rates of the smallest planets add to about 0.98 over six bins, two are not constrained, and the truth is 1.6', () => {
    const sum = radiusSum(
      radiusRow({ seed: 1, level: 0.6827, mode: 'stated' }, 0)
    );
    expect(sum.sum).toBeCloseTo(0.98, 2);
    expect(sum.rates).toBe(6);
    expect(sum.unconstrained).toBe(2);
    const t = truth();
    expect(t.reduce((a, row) => a + row[0], 0)).toBeCloseTo(1.6, 10);
    // the 'rates add to 0.98' is not the total: 0.76 of the truth is in the two bins under the floor
    expect(t[6][0] + t[7][0]).toBeCloseTo(0.764, 3);
  });

  test('the measured curve follows the analytic form beside it', () => {
    const pts = curvePoints().filter(
      p => p.n >= 1000 && p.p > 0.02 && p.p < 0.98
    );
    expect(pts.length).toBeGreaterThan(2);
    for (const p of pts) expect(Math.abs(p.p - p.analytic)).toBeLessThan(0.12);
    expect(starsWithEpochs(3)).toBe(2000);
  });
});

describe('the steps check what a student reads', () => {
  test('the validators take the readings and refuse others', () => {
    ok('read-a-rate', { a: 0.116, b: 0.166 });
    bad('read-a-rate', { a: 0.13, b: 0.166 });
    bad('read-a-rate', { a: 0.116, b: 0.116 });
    ok('a-bin-with-none', { a: 0.031, b: 96 });
    bad('a-bin-with-none', { a: 0, b: 96 });
    bad('a-bin-with-none', { a: 0.031, b: 82 });
    expect(step('read-a-rate').validate({ a: NaN, b: 1 })).toBeNull();
  });

  test('every readout row is text with no NaN, and the panels state what they assume', () => {
    for (const w of OCCURRENCE_WIDGETS) {
      for (const v of [
        {},
        { radius: 0, period: 7 },
        { radius: 4, period: 3, level: 1 },
        { seed: 7, reliability: 0, truth: 1 },
        { reliability: 2, radius: 2, period: 6 },
      ]) {
        const rows = w.readout({
          ...Object.fromEntries(w.controls.map(c => [c.id, c.value])),
          ...v,
        });
        for (const r of rows) {
          expect(typeof r.value).toBe('string');
          expect(r.value).not.toMatch(/undefined|NaN/);
        }
        expect(rows.find(r => /assumes/i.test(r.label)).value).toMatch(
          /matched filter/
        );
      }
    }
  });

  test('every choice has a real answer, no misconception names the answer, and the answers use more than one position', () => {
    for (const s of [...all, ...WHO.steps.slice(-2)]) {
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
    expect(
      new Set(
        all
          .filter(s => s.kind === 'choice' || s.type === 'predict')
          .map(s => s.answer)
      ).size
    ).toBeGreaterThanOrEqual(2);
  });

  test('the deeper steps hang on steps that exist; the lesson closes on a core step; the prediction is held', () => {
    const sids = new Set(LESSON.steps.map(s => s.sid));
    for (const s of DEEP.steps) {
      expect(sids.has(s.after)).toBe(true);
      sids.add(s.sid);
    }
    expect(LESSON.steps.at(-1).sid).toBe('what-you-can-now-say');
    expect(new Set(all.map(s => s.sid)).size).toBe(all.length);
    const p = step('what-is-easy-prediction');
    expect(p.type).toBe('predict');
    expect(LESSON.steps.findIndex(s => s.sid === p.reveal)).toBeGreaterThan(
      LESSON.steps.findIndex(s => s.sid === p.sid)
    );
  });

  test('the two steps added to Who Gets Counted are advanced and hang on its last advanced step', () => {
    const added = WHO.steps.slice(-2);
    expect(added.map(s => s.sid)).toEqual([
      'the-same-question-for-planets',
      'what-the-count-becomes',
    ]);
    for (const s of added) expect(s.depth).toBe('advanced');
    expect(added[0].after).toBe('what-the-real-sample-cannot-say');
    expect(WHO_ES.steps.length).toBe(WHO.steps.length);
  });
});

describe('the Spanish', () => {
  test('carries the same step structure', () => {
    expect(LESSON_ES.steps.length).toBe(LESSON.steps.length);
    expect(DEEP_ES.steps.length).toBe(DEEP.steps.length);
    for (const [en, es] of [
      [LESSON, LESSON_ES],
      [DEEP, DEEP_ES],
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
