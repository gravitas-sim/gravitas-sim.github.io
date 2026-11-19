// =============================================================================
// Weighing the Stars: the central measurement, judged on the student's readings
// -----------------------------------------------------------------------------
// The wrong turns of the weighing step are named (the wrong star's arm, a sum that
// counts a piece twice, a period of half a lap, a stopwatch reading not divided by
// the laps timed, a period in months) and each gets feedback without a value; a reading
// taken at another phase of the circular orbit is the same reading and passes; the
// quantitative step refuses an error bar narrower than the scatter of the student's own
// timings. Run on the lesson's own data, with no browser.
// =============================================================================

import { describe, expect, test } from '@jest/globals';
import { INVESTIGATIONS } from '../js/data/investigations.js';
import depth from '../js/data/investigations/depth/weighing-stars.js';
import { matchMisconception } from '../js/answerFeedback.js';
import { cueFindings } from '../tools/authoring/cueRules.mjs';

const lesson = INVESTIGATIONS.find(i => i.id === 'weighing-stars');
const step = sid => lesson.steps.find(s => s.sid === sid);
const deeper = sid => depth.steps.find(s => s.sid === sid);

/** A barycenter context for a circular pair of 4 AU at any orbital phase. */
const pairAt = phase => ({
  barycenter: () => ({
    separation: 400,
    arms: [
      { name: 'Star A', r: 100, massSun: 3, phase },
      { name: 'Star B', r: 300, massSun: 1, phase },
    ],
  }),
});

/** The slip a typed value shows in one field of a step, as the engine matches it. */
function slip(sid, fieldId, value) {
  const f = step(sid).fields.find(x => x.id === fieldId);
  const model = Number(f.want);
  const hit = matchMisconception(
    { misconceptions: f.misconceptions, answer: model },
    value,
    f.tolerance ?? Math.abs(model) * 0.05
  );
  return hit?.id ?? null;
}

describe('the orbit size and the period, in the weighing step', () => {
  test.each([
    [1.0, 'armA'],
    [3.0, 'armB'],
    [5.0, 'armPlusSeparation'],
    [7.0, 'armPlusSeparationB'],
    [8.0, 'allThree'],
  ])('an orbit size of %s is named (%s)', (value, id) => {
    expect(slip('weigh-the-pair', 'a', value)).toBe(id);
  });

  test.each([
    [2.0, 'halfLap'],
    [8.0, 'laps2'],
    [12.0, 'laps3'],
    [16.0, 'laps4'],
    [48.0, 'months'],
  ])('a period of %s is named (%s)', (value, id) => {
    expect(slip('weigh-the-pair', 'p', value)).toBe(id);
  });

  test('the star-to-star distance and a period near a lap are not slips', () => {
    for (const v of [3.9, 4.0, 4.1]) {
      expect(slip('weigh-the-pair', 'a', v)).toBeNull();
      expect(slip('weigh-the-pair', 'p', v)).toBeNull();
    }
  });

  test('every slip says what it is and states no value (the authoring rule)', () => {
    const s = step('weigh-the-pair');
    expect(cueFindings(s, { a: 4, p: 4 }, {})).toEqual([]);
  });

  const check = (a, p) => step('weigh-the-pair').validate({ a, p });

  test('the right readings pass and give the total from the student own numbers', () => {
    expect(check(4, 4).level).toBe('ok');
    expect(check(4, 4).message).toContain('4.0 solar masses');
    expect(check(4.02, 3.95).level).toBe('ok');
  });

  test('the wrong star arm, half a lap and a unit slip do not pass', () => {
    for (const [a, p] of [
      [1, 4],
      [3, 4],
      [4, 2],
      [4, 48],
      [4, 8],
    ])
      expect(check(a, p).level).toBe('warn');
  });
});

describe('a reading at another phase is the same reading', () => {
  const rows = ctx => step('measurement-one-how-big-is').probe(ctx);

  test('the arms and the separation do not depend on the phase of a circular pair', () => {
    const a = rows(pairAt(0));
    const b = rows(pairAt(2.1));
    expect(b).toEqual(a);
    expect(a.map(r => r.id)).toEqual(['ra', 'rb', 'sep']);
  });

  test('three readings that fit together are accepted, whatever phase they were taken at', () => {
    const v = step('measurement-one-how-big-is').validate;
    expect(v({ ra: 1, rb: 3, sep: 4 }).level).toBe('ok');
    expect(v({ ra: 1.0, rb: 3.01, sep: 4.0 }).level).toBe('ok');
    expect(v({ ra: 1, rb: 3, sep: 5 }).level).toBe('warn');
    expect(v({ ra: 1, rb: NaN, sep: 4 })).toBeNull();
  });
});

describe('the period from the laps timed', () => {
  const p = step('measurement-two-how-long-does').fields.find(
    f => f.id === 'p'
  );
  const check = step('measurement-two-how-long-does').validate;

  test('the page divides the stopwatch reading by the laps', () => {
    expect(p.compute({ t: 12, laps: 3 })).toBeCloseTo(4, 12);
    expect(p.compute({ t: 4.04, laps: 1 })).toBeCloseTo(4.04, 12);
  });

  test('a fraction of a lap or no laps is refused in words', () => {
    expect(check({ t: 4, laps: 0 }).level).toBe('error');
    expect(check({ t: 4, laps: 1.5 }).level).toBe('error');
    expect(check({ t: 4, laps: 1 }).level).toBe('ok');
    expect(check({ t: NaN, laps: 1 })).toBeNull();
  });
});

describe('the error bar, in the quantitative step', () => {
  const s = deeper('how-sure-is-the-total');
  const field = id => s.fields.find(f => f.id === id);
  // The student weighed with a = 4 and P = 4.
  const earlier = (sid, id) => ({ a: 4, p: 4 })[id];

  /** The step as the page computes it for a set of typed values. */
  function values(typed) {
    const v = { ...typed };
    for (const f of s.fields) if (f.compute) v[f.id] = f.compute(v, earlier);
    return v;
  }

  const timings = { t1: 4.1, t2: 3.9, t3: 4.2 };

  test('the scatter of the mean is the sample standard deviation over the root of n', () => {
    const v = values({ ...timings, sa: 0.01, sp: 0.2 });
    expect(v.n).toBe(3);
    const mean = (4.1 + 3.9 + 4.2) / 3;
    const ss = [4.1, 3.9, 4.2].reduce((a, x) => a + (x - mean) ** 2, 0);
    expect(v.se).toBeCloseTo(Math.sqrt(ss / 2 / 3), 9);
  });

  test('one timing cannot show its own scatter', () => {
    const v = values({ t1: 4.1, sa: 0.01, sp: 0.2 });
    expect(s.validate(v).level).toBe('warn');
  });

  test('an error bar narrower than the scatter of the timings is refused, a wider one is quoted', () => {
    const narrow = values({ ...timings, sa: 0.01, sp: 0.01 });
    expect(narrow.se).toBeGreaterThan(0.01);
    expect(s.validate(narrow).level).toBe('warn');
    expect(s.validate(narrow).message).toMatch(/smaller than the scatter/);
    const wide = values({ ...timings, sa: 0.01, sp: 0.2 });
    expect(s.validate(wide).level).toBe('ok');
  });

  test('moving one reading at a time shows the period moves the mass more', () => {
    const v = values({ ...timings, sa: 0.01, sp: 0.2 });
    // d(a^3/P^2): 3 sa/a of 4 = 0.03 for a, 2 sp/P of 4 = 0.2 for P (first order).
    expect(v.move_a).toBeCloseTo(0.0303, 3);
    expect(v.move_p).toBeGreaterThan(5 * v.move_a);
    expect(field('s_tot').compute(v, earlier)).toBeGreaterThan(0.1);
  });

  test('every deeper step names what the student decides', () => {
    for (const d of depth.steps) expect(d.decides).toBeTruthy();
  });
});
