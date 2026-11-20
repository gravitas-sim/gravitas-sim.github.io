// =============================================================================
// Why Mars Goes Backwards: the reversal the student times
// -----------------------------------------------------------------------------
// The lesson asks the student to bracket each turn of the direction from Earth
// to Mars between two readings of their own, and its check accepts a set whose
// brackets hold the true turning days. Those days are written in the step as
// literals (a lesson file has no imports), so this file works them out apart
// from the engine, from the two circular orbits the scenario declares, holds
// the literals to them, and then holds both to the engine's own turns.
//
// What can go wrong, and what is asserted: a set in which nothing fell is
// refused; a bracket that leaves out the true turn is refused; two turns from
// different loops are refused; a bracket too wide to say much is warned about, and its width is
// reported by the step's own fields; a bracket across 360 degrees is read as a
// small step. The browser walk is e2e/centralExperiments.spec.js.
// =============================================================================

import { describe, expect, test } from '@jest/globals';
import RETRO from '../js/data/investigations/retrograde-motion.js';
import { SCENARIO_GEOMETRY } from '../js/scenarios.js';
import { AU_METERS, G_SI, SOLAR_MASS_KG } from '../js/tidalPhysics.js';
import * as physics from '../js/physics.js';
import { timeUnitSeconds } from '../js/units.js';
import { buildScene } from './barycentreRuns.js';
import { engine } from '../js/random/streams.js';
import { lessonKey } from '../js/i18n/lesson.js';
import { ES_DEFERRED } from '../js/i18n/es.deferred.js';

const steps = RETRO.steps;
const at = sid => steps.findIndex(s => s.sid === sid);
const step = sid => steps[at(sid)];
const MEASURE = step('time-the-reversal');
const plain = s => String(s).replace(/<[^>]*>/g, ' ');

// --- The two circular orbits, worked out without the engine ---------------------

const [, EARTH_STEP, MARS_STEP] = SCENARIO_GEOMETRY['retrograde-mars'].steps;
const orbit = s => ({
  r: s.body.orbit.distance.au,
  phase: (s.body.orbit.angle.deg * Math.PI) / 180,
});
const EARTH = orbit(EARTH_STEP);
const MARS = orbit(MARS_STEP);
const DAY = 86400;
const periodDays = aAU =>
  (2 * Math.PI * Math.sqrt((aAU * AU_METERS) ** 3 / (G_SI * SOLAR_MASS_KG))) /
  DAY;
const P_EARTH = periodDays(EARTH.r);
const P_MARS = periodDays(MARS.r);
const SYNODIC = 1 / (1 / P_EARTH - 1 / P_MARS);

/** The sky position of Mars from Earth on a day, as a vector. */
const sky = t => {
  const e = EARTH.phase + (2 * Math.PI * t) / P_EARTH;
  const m = MARS.phase + (2 * Math.PI * t) / P_MARS;
  return {
    x: MARS.r * Math.cos(m) - EARTH.r * Math.cos(e),
    y: MARS.r * Math.sin(m) - EARTH.r * Math.sin(e),
  };
};
/** The direction from Earth to Mars in degrees, 0 to 360, as the readout prints it. */
const direction = t => {
  const { x, y } = sky(t);
  const d = (Math.atan2(y, x) * 180) / Math.PI;
  return d < 0 ? d + 360 : d;
};
/** The rate of change of direction (cross product over the square of the range). */
const rate = t => {
  const h = 1e-3;
  const a = sky(t - h);
  const b = sky(t + h);
  const p = sky(t);
  const vx = (b.x - a.x) / (2 * h);
  const vy = (b.y - a.y) / (2 * h);
  return (p.x * vy - p.y * vx) / (p.x * p.x + p.y * p.y);
};
/** Every day in [0, end] where the rate changes sign, found by bisection. */
const turns = end => {
  const out = [];
  let prev = rate(0);
  for (let t = 0.05; t < end; t += 0.05) {
    const now = rate(t);
    if (prev * now < 0) {
      let lo = t - 0.05;
      let hi = t;
      for (let i = 0; i < 60; i++) {
        const mid = (lo + hi) / 2;
        if (rate(lo) * rate(mid) <= 0) hi = mid;
        else lo = mid;
      }
      out.push({ day: (lo + hi) / 2, rising: now > 0 });
    }
    prev = now;
  }
  return out;
};
// A turn where the rate goes from positive to negative starts a loop; the next one ends it.
const TURNS = turns(6000);
const STARTS = TURNS.filter(t => !t.rising).map(t => t.day);
const ENDS = TURNS.filter(t => t.rising).map(t => t.day);

const literal = name =>
  Number(
    new RegExp(`const ${name} = ([0-9.]+);`).exec(
      MEASURE.validate.toString()
    )[1]
  );

describe('the turning days the check holds to', () => {
  test('the circular orbits give a synodic period of 780.4 days and a loop of 72.7', () => {
    expect(SYNODIC).toBeCloseTo(780.44, 1);
    expect(ENDS[0] - STARTS[0]).toBeCloseTo(72.7, 0);
    expect(STARTS[1] - STARTS[0]).toBeCloseTo(SYNODIC, 1);
  });

  test('the literals in the step are those days, to the hundredth', () => {
    expect(literal('START')).toBeCloseTo(STARTS[0], 1);
    expect(literal('END')).toBeCloseTo(ENDS[0], 1);
    expect(literal('EVERY')).toBeCloseTo(SYNODIC, 1);
    expect(Math.abs(literal('START') - STARTS[0])).toBeLessThan(0.05);
    expect(Math.abs(literal('END') - ENDS[0])).toBeLessThan(0.05);
    expect(Math.abs(literal('EVERY') - SYNODIC)).toBeLessThan(0.05);
  });
});

// --- The engine's own turns, at four frame rates and over up to six loops -----

/**
 * Run the scene as the page runs it at a frame rate (substeps to the frame, the
 * plan the page would use) and record the unwrapped direction from Earth to
 * Mars at every frame.
 */
const engineTrack = (rate, loops) => {
  const { plan } = buildScene('retrograde-mars', 1, rate);
  physics.resetSimulationTime();
  const all = () => [...physics.stars, ...physics.planets];
  const earth = all().find(b => b.name === 'Earth');
  const mars = all().find(b => b.name === 'Mars');
  expect(earth && mars).toBeTruthy();
  const days = () => (physics.getSimulationTime() * timeUnitSeconds()) / DAY;
  const track = [];
  engine(1, () => {
    let last = null;
    let unwrapped = 0;
    while (days() < STARTS[0] + loops * SYNODIC + 120) {
      for (let i = 0; i < (plan.substeps || 1); i++)
        physics.updatePhysics(plan.step);
      const raw = Math.atan2(
        mars.pos.y - earth.pos.y,
        mars.pos.x - earth.pos.x
      );
      if (last !== null) {
        let d = raw - last;
        while (d > Math.PI) d -= 2 * Math.PI;
        while (d < -Math.PI) d += 2 * Math.PI;
        unwrapped += d;
      }
      last = raw;
      track.push({ day: days(), lon: unwrapped, dir: raw });
    }
  });
  return track;
};
/** The frames either side of each turn, and the turn itself from a parabola through three frames. */
const turnsOf = track => {
  const out = [];
  for (let i = 1; i < track.length - 1; i++) {
    const [a, b, c] = [track[i - 1].lon, track[i].lon, track[i + 1].lon];
    if ((b > a && b >= c) || (b < a && b <= c)) {
      const den = a - 2 * b + c;
      const shift = den === 0 ? 0 : (0.5 * (a - c)) / den;
      out.push({
        index: i,
        max: b > a,
        day: track[i].day + (shift * (track[i + 1].day - track[i - 1].day)) / 2,
      });
    }
  }
  return out;
};
const degrees = r => ((((r * 180) / Math.PI) % 360) + 360) % 360;

describe('the engine turns on those days', () => {
  // The page's own rate (60) and the clamped one run six loops; the others three.
  test.each([
    ['60', 6],
    ['30', 3],
    ['120', 3],
    ['clamp', 6],
  ])(
    'at frame rate %s, over %i loops, to within half a day, and a pair of frames brackets each turn',
    (rate, LOOPS) => {
      const track = engineTrack(rate, LOOPS);
      const found = turnsOf(track);
      const maxima = found.filter(f => f.max);
      const minima = found.filter(f => !f.max);
      expect(maxima.length).toBeGreaterThanOrEqual(LOOPS);
      expect(minima.length).toBeGreaterThanOrEqual(LOOPS);
      for (let n = 0; n < LOOPS; n++) {
        expect(Math.abs(maxima[n].day - STARTS[n])).toBeLessThan(0.6);
        expect(Math.abs(minima[n].day - ENDS[n])).toBeLessThan(0.6);
      }
      // What a student takes: a frame still rising and the first that has fallen
      // below it, at each turn, with the direction as the readout prints it.
      const reading = i => ({
        dir: Number(degrees(track[i].dir).toFixed(2)),
        day: Number(track[i].day.toFixed(1)),
      });
      for (let n = 0; n < LOOPS; n++) {
        const hi = maxima[n].index;
        const lo = minima[n].index;
        // Two frames before the peak, and the first frame after it that reads lower.
        const a1 = reading(hi - 2);
        let k = hi + 1;
        while (reading(k).dir >= a1.dir) k++;
        const a2 = reading(k);
        // The same at the lowest point, from a frame still falling to the first that has risen.
        const b1 = reading(lo - 2);
        let m = lo + 1;
        while (reading(m).dir <= b1.dir) m++;
        const b2 = reading(m);
        const v = {
          a1_dir: a1.dir,
          a1_day: a1.day,
          a2_dir: a2.dir,
          a2_day: a2.day,
          b1_dir: b1.dir,
          b1_day: b1.day,
          b2_dir: b2.dir,
          b2_day: b2.day,
        };
        expect({ rate, loop: n, level: verdict(v).level }).toEqual({
          rate,
          loop: n,
          level: 'ok',
        });
      }
    },
    240000
  );
});

// --- The check, on sets of readings --------------------------------------------

/** A set of eight readings from the circular model: a pair around each turn. */
const readings = ({
  loop = 0,
  before = 2,
  after = 3,
  endBefore = 2,
  endAfter = 3,
} = {}) => {
  const s = STARTS[loop];
  const e = ENDS[loop];
  const point = t => [direction(t), t];
  const [a1_dir, a1_day] = point(s - before);
  const [a2_dir, a2_day] = point(s + after);
  const [b1_dir, b1_day] = point(e - endBefore);
  const [b2_dir, b2_day] = point(e + endAfter);
  return { a1_dir, a1_day, a2_dir, a2_day, b1_dir, b1_day, b2_dir, b2_day };
};
const fieldsOf = v => {
  const out = { ...v };
  for (const f of MEASURE.fields) if (f.compute) out[f.id] = f.compute(out);
  return out;
};
const verdict = v => MEASURE.validate(fieldsOf(v));

describe('a set that brackets both turns of one loop', () => {
  test('is accepted, for any loop the student reaches', () => {
    for (let loop = 0; loop < 5; loop++)
      expect(verdict(readings({ loop })).level).toBe('ok');
  });

  test('is accepted across the 360 degree wrap, where the direction goes 359 to 1', () => {
    // A fall of 0.3 degree from 0.2 to 359.9, and a rise of 0.3 from 359.8 to 0.1.
    const v = readings();
    Object.assign(v, {
      a1_dir: 0.2,
      a2_dir: 359.9,
      b1_dir: 359.8,
      b2_dir: 0.1,
    });
    expect(verdict(v).level).toBe('ok');
    // The same pair the other way round is a rise, and is refused.
    Object.assign(v, { a1_dir: 359.9, a2_dir: 0.2 });
    expect(verdict(v).level).toBe('warn');
  });

  test('reports the widths and the uncertainty of the brackets it accepts', () => {
    const v = readings({ before: 3.5, after: 4, endBefore: 3.5, endAfter: 4 });
    const f = fieldsOf(v);
    expect(verdict(v).level).toBe('ok');
    expect(f.wid_a).toBeCloseTo(7.5, 6);
    expect(f.wid_b).toBeCloseTo(7.5, 6);
    // The uncertainty is the half-widths added.
    expect(f.loop_unc).toBeCloseTo(7.5, 6);
    // The middles of the two brackets, which the page gives as the days of the turns.
    expect(f.turn_a).toBeCloseTo(STARTS[0] + 0.25, 6);
    expect(f.turn_b).toBeCloseTo(ENDS[0] + 0.25, 6);
  });

  test('gives a length with an uncertainty that shrinks with the brackets', () => {
    const wide = fieldsOf(
      readings({ before: 8, after: 10, endBefore: 8, endAfter: 10 })
    );
    const narrow = fieldsOf(
      readings({ before: 2, after: 3, endBefore: 2, endAfter: 3 })
    );
    expect(narrow.loop_unc).toBeLessThan(wide.loop_unc);
    expect(Math.abs(narrow.loop_len - (ENDS[0] - STARTS[0]))).toBeLessThan(
      narrow.loop_unc
    );
    expect(wide.loop_unc).toBeCloseTo(18, 6);
  });

  test('is accepted when a pair’s end sits a little past the turn, within the engine’s own offset', () => {
    // The engine turns up to half a day from the circular model's turn (measured at four
    // frame rates over six loops below), so a reading 0.4 day past the turn is honest.
    const v = readings({ before: 0.2, after: 3 });
    v.a1_day = STARTS[0] + 0.4;
    expect(verdict(v).level).toBe('ok');
  });
});

describe('a set that is refused, with a message the author wrote', () => {
  const said = v => verdict(v).message;

  test('a first pair in which no reading fell', () => {
    const v = readings();
    [v.a1_dir, v.a2_dir] = [v.a2_dir, v.a1_dir];
    const r = verdict(v);
    expect(r.level).toBe('warn');
    expect(r.message).toMatch(/No reading in your first pair has fallen/);
  });

  test('a second pair in which nothing rose again', () => {
    const v = readings();
    [v.b1_dir, v.b2_dir] = [v.b2_dir, v.b1_dir];
    expect(verdict(v).message).toMatch(/second pair.*not higher/);
  });

  test('a pair of days that runs backwards', () => {
    const v = readings();
    [v.a1_day, v.a2_day] = [v.a2_day, v.a1_day];
    const r = verdict(v);
    expect(r.level).toBe('error');
    expect(r.message).toMatch(/later day than the first/);
  });

  test('a first bracket that leaves out the true turn', () => {
    const v = readings({ before: 22, after: -12 });
    // Both days sit before the turn but the direction still fell, as a wrong day would give.
    v.a2_dir = v.a1_dir - 1;
    expect(v.a2_day).toBeLessThan(STARTS[0] - 8);
    const r = verdict(v);
    expect(r.level).toBe('warn');
    expect(r.message).toMatch(/first turn is not between/);
  });

  test('a second bracket that leaves out the true turn', () => {
    const v = readings();
    v.b1_day += 15;
    v.b2_day += 15;
    expect(said(v)).toMatch(/second turn is not between/);
  });

  test('two turns from different loops', () => {
    const a = readings({ loop: 0 });
    const b = readings({ loop: 1 });
    const v = {
      ...a,
      b1_dir: b.b1_dir,
      b1_day: b.b1_day,
      b2_dir: b.b2_dir,
      b2_day: b.b2_day,
    };
    expect(verdict(v).level).toBe('warn');
    expect(said(v)).toMatch(/different loops/);
  });

  test('a late reading: the first turn already past when the pair begins is refused', () => {
    // The direction was already falling at the first reading, 0.9 day after the turn.
    const v = readings();
    v.a1_day = STARTS[0] + 0.9;
    v.a2_day = STARTS[0] + 1.9;
    const r = verdict(v);
    expect(r.level).toBe('warn');
    expect(r.message).toMatch(/first turn is not between/);
  });

  test('brackets that are far too wide are accepted as brackets but not as a measurement', () => {
    const v = readings({ before: 70, after: 30, endBefore: 25, endAfter: 40 });
    // A fall and a rise, as a wide bracket of the true days would give.
    v.a2_dir = v.a1_dir - 3;
    v.b2_dir = v.b1_dir + 3;
    expect(fieldsOf(v).loop_unc).toBeGreaterThan(10);
    const r = verdict(v);
    expect(r.level).toBe('warn');
    expect(r.message).toMatch(/brackets are wide/);
    // The loop-sized brackets a reader might type to get past the check.
    v.a1_day = 100;
    v.a2_day = 200;
    v.b1_day = 201;
    v.b2_day = 400;
    expect(verdict(v).level).toBe('warn');
    expect(verdict(v).message).toMatch(/brackets are wide/);
  });

  test('brackets of the width a student’s own frames give are accepted', () => {
    // The first frame 0.1 degree under the printed peak and the first below it
    // are about nine days apart at the 0.01 degree readout; twelve is the most
    // the browser test lets a bracket be.
    for (const w of [9, 12]) {
      const v = readings({
        before: w / 2 - 0.5,
        after: w / 2 + 0.5,
        endBefore: w / 2 - 0.5,
        endAfter: w / 2 + 0.5,
      });
      expect(fieldsOf(v).wid_a).toBeCloseTo(w, 6);
      expect(fieldsOf(v).loop_unc).toBeCloseTo(w, 6);
      expect(verdict(v).level).toBe('ok');
    }
  });

  test('a second turn taken before the first pair is finished', () => {
    const v = readings();
    v.b1_day = v.a2_day - 1;
    expect(said(v)).toMatch(/second pair must come after your first/);
  });

  test('a set with a box empty says nothing yet', () => {
    const v = readings();
    delete v.b2_day;
    expect(MEASURE.validate({ ...fieldsOf(v), b2_day: NaN })).toBeNull();
  });
});

describe('a Spanish reader gets the check’s words in Spanish', () => {
  // One set for every answer the check can give.
  const sets = () => {
    const swapped = (v, a, b) => ({ ...v, [a]: v[b], [b]: v[a] });
    const wide = readings({
      before: 70,
      after: 30,
      endBefore: 25,
      endAfter: 40,
    });
    wide.a2_dir = wide.a1_dir - 3;
    wide.b2_dir = wide.b1_dir + 3;
    const other = readings({ loop: 1 });
    const late = readings();
    late.b1_day = late.a2_day - 1;
    const out = [
      swapped(readings(), 'a1_day', 'a2_day'),
      swapped(readings(), 'a1_dir', 'a2_dir'),
      swapped(readings(), 'b1_dir', 'b2_dir'),
      late,
      { ...readings(), a1_day: 300, a2_day: 304, b1_day: 310, b2_day: 314 },
      { ...readings(), b1_day: 400, b2_day: 404 },
      { ...readings(), b1_day: other.b1_day, b2_day: other.b2_day },
      wide,
      readings(),
    ];
    return out.map(v => verdict(v));
  };

  test('every message the check returns has a Spanish translation, apart from the English', () => {
    const said = sets();
    expect(new Set(said.map(r => r.message)).size).toBe(9);
    for (const { message } of said) {
      const es = ES_DEFERRED[lessonKey(message)];
      expect({ message, translated: Boolean(es) }).toEqual({
        message,
        translated: true,
      });
      expect(es).not.toBe(message);
    }
  });

  test('the day in the readout is translated too', () => {
    expect(ES_DEFERRED[lessonKey('Day')]).toBe('Día');
    expect(ES_DEFERRED[lessonKey('Mars: direction from Earth')]).toBeTruthy();
  });
});

describe('the readings are taken, not typed', () => {
  const probe = MEASURE.probe({
    find: () => ({ name: 'Mars' }),
    seenFrom: () => ({ longitude: 313.9604, separation: 0.63 }),
    days: () => 169.64,
  });

  test('every reading field reads a row of the step’s own readout', () => {
    const ids = new Set(probe.map(r => r.id));
    const own = MEASURE.fields.filter(f => !f.compute);
    expect(own).toHaveLength(8);
    for (const f of own) expect(ids.has(f.source.probe)).toBe(true);
  });

  test('the readout prints the direction to the hundredth of a degree and the day to a tenth', () => {
    expect(probe.find(r => r.id === 'dir').value).toBe('313.96°');
    expect(probe.find(r => r.id === 'day').value).toBe('169.6');
  });

  test('the two periods are taken in days, as the field asks', () => {
    const row = step('the-two-orbits').probe({
      find: name => ({ name }),
      elements: () => ({ semiMajorAxis: 100, period: 2.3 }),
      distance: x => `${x / 100} AU`,
      years: x => x / 2.3,
    });
    const p = row.find(r => r.id === 'earth_P');
    expect(p.value).toBe('365.3 days');
    expect(
      step('the-two-orbits').fields.find(f => f.id === 'earth_P').unit
    ).toBe('days');
  });
});

// --- The order of the lesson ----------------------------------------------------

describe('nothing is stated before it is measured', () => {
  const before = sid =>
    steps
      .slice(0, at(sid))
      .map(s =>
        plain(
          [
            s.title,
            s.body,
            s.tip,
            ...(s.checklist || []),
            ...(s.hints || []),
          ].join(' ')
        )
      )
      .join(' ');

  test('no loop length, cycle length or share before the step that times the reversal', () => {
    const text = before('time-the-reversal');
    expect(text).not.toMatch(
      /ten weeks|72 days|about 72|10 weeks|two and a half months/i
    );
    // 780 appears only in a step the student has answered, as their own figure's answer.
    for (const s of steps.slice(0, at('how-often-does-earth-catch') + 1)) {
      const body = plain(
        [s.title, s.body, s.tip, ...(s.hints || [])].join(' ')
      );
      expect(body).not.toMatch(/\b780\b/);
    }
  });

  test('the synodic subtraction is not worked in the question', () => {
    const body = plain(step('how-often-does-earth-catch').body);
    expect(body).not.toMatch(/365|687|0\.00274|0\.00146|0\.00128/);
  });

  test('the share is predicted before it is measured, and revealed beside the measurement', () => {
    const predict = step('share-of-the-cycle');
    expect(predict.type).toBe('predict');
    expect(predict.options).toHaveLength(4);
    expect(at('share-of-the-cycle')).toBeLessThan(at('time-the-reversal'));
    expect(predict.reveal).toBe('the-share-you-found');
    const reveal = step('the-share-you-found');
    expect(at('time-the-reversal')).toBeLessThan(at('the-share-you-found'));
    expect(reveal.evidence.map(e => e.field)).toEqual(['loop_len', 'loop_unc']);
    // No body or tip gives the share.
    for (const s of steps) {
      expect(plain([s.body, s.tip].join(' '))).not.toMatch(
        /\b(9|10|11) (percent|per cent)\b/
      );
    }
  });

  test('Jupiter is a calculation: the subtraction is not given', () => {
    const body = plain(step('jupiters-loops').body);
    expect(body).toMatch(/5\.2 AU/);
    expect(body).toMatch(/11\.9 years/);
    expect(body).not.toMatch(/1\/365|4333|0\.0027/);
  });

  test('Prompt 300’s factor of nearly five stays', () => {
    expect(plain(step('bright-and-backwards-together').body)).toMatch(
      /nearly five/
    );
  });
});

describe('the revision is recorded', () => {
  const retired = RETRO.retired;

  test('each retired step has its successor, and the successor is in the lesson', () => {
    expect(Object.keys(retired).sort()).toEqual(
      [
        'a-lap-gained',
        'catch-the-reversal',
        'how-long-does-a-loop',
        'mars-or-jupiter',
        'what-actually-settled-it',
      ].sort()
    );
    for (const [id, r] of Object.entries(retired)) {
      expect(at(id)).toBe(-1);
      if (r.to !== null) expect(at(r.to)).toBeGreaterThanOrEqual(0);
      expect(r.was.en).toBeTruthy();
      expect(r.was.es).toBeTruthy();
    }
    expect(retired['a-lap-gained'].to).toBeNull();
    expect(retired['catch-the-reversal'].to).toBe('time-the-reversal');
    expect(retired['how-long-does-a-loop'].to).toBe('time-the-reversal');
    expect(retired['mars-or-jupiter'].to).toBe('jupiters-loops');
  });

  test('the retired steps’ words are gone and the history reads in one step', () => {
    expect(plain(step('frames-are-not-all-equal').body)).toMatch(
      /stellar parallax/
    );
    expect(plain(step('frames-are-not-all-equal').body)).toMatch(/Tycho/);
  });

  test('the three choices that matter carry named wrong turns, each on a wrong option', () => {
    for (const sid of [
      'which-one-is-faster',
      'when-does-it-reverse',
      'which-one-is-moving',
    ]) {
      const s = step(sid);
      const wrong = s.options.map((_, i) => i).filter(i => i !== s.answer);
      expect(s.misconceptions.map(m => m.option).sort()).toEqual(wrong);
      for (const m of s.misconceptions) {
        expect(m.option).not.toBe(s.answer);
        expect(m.say.length).toBeGreaterThan(40);
      }
    }
  });

  test('Jupiter’s synodic period in years is named, not marked as a slip of the arithmetic alone', () => {
    const s = step('jupiters-loops');
    expect(s.answer).toBe(399);
    expect(s.misconceptions[0].id).toBe('yearsForDays');
  });
});
