// =============================================================================
// Bound, Unbound and Escape; What If Gravity Were Not Inverse Square?
// -----------------------------------------------------------------------------
// What can be tested without a browser: that the dividing speed is found by the
// student and never handed over (no speed in a tip, no instrument that opens at
// the answer, no escape-speed row on the steps that ask for it), that the
// bracket refuses a pair on one side of the line and says which side, that the
// slope rule is derived from two readings before it is used, that the numbers
// the lessons rest on are the ones the tree computes, and that the steps these
// two lessons retired say what they became. The browser walk is
// e2e/centralExperiments.spec.js and the lesson-by-lesson checks beside it.
// =============================================================================

import { describe, expect, test } from '@jest/globals';
import ENERGY from '../js/data/investigations/orbital-energy.js';
import POWER from '../js/data/investigations/power-law-gravity.js';
import {
  ENERGY_WIDGETS,
  circularSpeed,
  escapeSpeed,
} from '../js/energyWidgets.js';
import { expectedKeplerSlope } from '../js/powerLawGravity.js';
import { POWER_LAW_WIDGETS } from '../js/powerLawWidgets.js';
import { canvasAt, canvasProblems } from '../js/lesson/canvasKind.js';
import { predictionState } from '../js/lesson/held.js';

const stepOf = (lesson, sid) => lesson.steps.find(s => s.sid === sid);
const indexOf = (lesson, sid) => lesson.steps.findIndex(s => s.sid === sid);
const plain = s => String(s ?? '').replace(/<[^>]*>/g, ' ');
const launch = ENERGY_WIDGETS.find(w => w.id === 'launch');
const compare = ENERGY_WIDGETS.find(w => w.id === 'escape-compare');

// The cannon: 320 km up is 1.05 Earth radii (js/energyWidgets.js LAUNCH_HEIGHT).
const EARTH = { mass: 5.972e24, radius: 6.371e6 };
const R0 = EARTH.radius * 1.05;

describe('the numbers the lessons rest on, from the tree', () => {
  test('7.7 km/s is the circular speed 320 km up, and 10.92 km/s the escape speed there', () => {
    // sqrt(GM / r) at 1.05 Earth radii, and sqrt(2GM / r).
    const circular = circularSpeed(EARTH.mass, R0) / 1000;
    const escape = escapeSpeed(EARTH.mass, R0) / 1000;
    expect(circular).toBeCloseTo(7.72, 2);
    expect(escape).toBeCloseTo(10.916, 3);
    expect(escape / circular).toBeCloseTo(Math.SQRT2, 6);
    // 10.916 is the line the bracket check uses.
    expect(escape).toBeGreaterThan(10.9);
    expect(escape).toBeLessThan(10.92);
  });

  test('n = 2.01 at 1 AU: 17 percent weaker in kilometers, 4.5 in the engine’s units, none in AU', () => {
    const weaker = unit => 1 - Math.pow(unit, 2 - 2.01);
    const AU_KM = 1.495978707e8;
    expect(weaker(AU_KM)).toBeCloseTo(0.17, 2);
    // The engine's own units: 100 to the AU (js/constants.js).
    expect(weaker(100)).toBeCloseTo(0.045, 3);
    expect(weaker(1)).toBe(0);
  });
});

describe('Bound, Unbound and Escape: the dividing speed is found, not handed over', () => {
  const finding = [
    'fire-it',
    'fire-it-again',
    'find-the-dividing-line',
    'bracket-the-dividing-speed',
  ];

  test('no speed from the dividing line is in a tip, a body or a checklist before the bracket', () => {
    const before = ENERGY.steps.slice(
      0,
      indexOf(ENERGY, 'bracket-the-dividing-speed') + 1
    );
    const text = before
      .map(s =>
        plain(`${s.tip ?? ''} ${s.body ?? ''} ${(s.checklist || []).join(' ')}`)
      )
      .join(' ');
    expect(text).not.toMatch(/\b(7\.[67]|10\.9\d?|11\.2|350)\b/);
  });

  test('the tips locate the line and the readouts', () => {
    for (const sid of [
      'fire-it',
      'find-the-dividing-line',
      'watch-the-total',
    ]) {
      expect(plain(stepOf(ENERGY, sid).tip)).toMatch(/Does it come back\?/);
    }
  });

  test('no instrument opens at the answer, and none offers it', () => {
    for (const sid of finding) {
      const tool = stepOf(ENERGY, sid).tool;
      expect(tool.presets).toBe(false);
      expect(tool.withhold).toEqual(['escape']);
      const opens = (tool.start ?? tool.values).v;
      expect(Math.abs(opens - 10.9)).toBeGreaterThan(1);
    }
    // The bracket opens neutral and says so by declaring where it starts.
    expect(stepOf(ENERGY, 'bracket-the-dividing-speed').tool.start).toEqual({
      v: 9,
    });
  });

  test('the escape-speed row is withheld where a step asks for it and shown elsewhere', () => {
    const v = { v: 9 };
    launch.reset(v, { autorun: false });
    const rows = spec =>
      launch.readout(v, undefined, spec).map(r => r.id ?? r.label);
    expect(rows({ withhold: ['escape'] })).not.toContain('escape');
    expect(rows({})).toContain('escape');
    expect(rows(undefined)).toContain('escape');
    expect(rows({ withhold: ['escape'] })).toHaveLength(rows({}).length - 1);
  });

  test('the launch instrument still reports the same escape speed', () => {
    const v = { v: 9 };
    launch.reset(v, { autorun: false });
    const row = launch.readout(v).find(r => r.id === 'escape');
    expect(row.value).toMatch(/10\.92/);
  });

  describe('bracket-the-dividing-speed', () => {
    const { validate } = stepOf(ENERGY, 'bracket-the-dividing-speed');
    const check = (back, gone) => validate({ back, gone }, {});

    test('both boxes are needed', () => {
      expect(check(NaN, 11).level).toBe('warn');
      expect(check(10.9, NaN).level).toBe('warn');
    });

    test('the speed that left must be the larger', () => {
      const r = check(11, 10.9);
      expect(r.level).toBe('error');
      expect(r.message).toMatch(/larger/);
    });

    test('a pair that both come back is refused, and the side is named', () => {
      for (const [a, b] of [
        [9, 10],
        [6, 10.9],
        [10.5, 10.9],
      ]) {
        const r = check(a, b);
        expect(r.level).toBe('error');
        expect(r.message).toMatch(/both of those shots still come back/i);
        expect(r.message).toMatch(/higher/);
        // It does not say where the line is.
        expect(r.message).not.toMatch(/\d/);
      }
    });

    test('a pair that both leave is refused, and the side is named', () => {
      for (const [a, b] of [
        [11, 12],
        [11, 14],
        [10.92, 11],
      ]) {
        const r = check(a, b);
        expect(r.level).toBe('error');
        expect(r.message).toMatch(/both of those shots leave for good/i);
        expect(r.message).toMatch(/lower/);
        expect(r.message).not.toMatch(/\d/);
      }
    });

    test('a bracket either side of the line is accepted, and the narrow ones are graded ok', () => {
      for (const [a, b] of [
        [10.9, 11],
        [10.8, 11],
        [10.5, 11],
        [10.7, 11.1],
      ]) {
        expect(check(a, b).level).toBe('ok');
      }
    });

    test('the width is the reported uncertainty', () => {
      expect(check(10.9, 11).message).toMatch(/give or take 0\.05/);
      expect(check(10.5, 11).message).toMatch(/give or take 0\.25/);
    });

    test('a wide bracket is valid but wide, wherever its middle sits', () => {
      // 10.0 / 11.9 once passed as pinned because its middle was near the
      // line; the honest coarse 6 / 14 was refused. Width decides now.
      for (const [a, b] of [
        [10, 11.9],
        [6, 14],
        [9, 13],
        [9.5, 12.2],
        [6, 12],
        [10, 14],
      ]) {
        const r = check(a, b);
        expect(r.level).toBe('ok');
        expect(r.message).toMatch(/a wide uncertainty/);
        expect(r.message).toContain(`give or take ${((b - a) / 2).toFixed(2)}`);
        // It brackets the line without saying where the line is.
        expect(r.message).not.toMatch(/10\.9/);
      }
    });

    test("the line the check uses is the instrument's escape speed at the cannon", () => {
      const v = { v: 9 };
      launch.reset(v, { autorun: false });
      const line = launch.compute(v).escape / 1000;
      expect(line).toBeCloseTo(10.916, 3);
      expect(escapeSpeed(EARTH.mass, R0) / 1000).toBeCloseTo(10.916, 3);
      // A pair 2 m/s either side of the line is a bracket; one that ends a
      // hair short of it is refused as both coming back.
      expect(check(line - 0.002, line + 0.002).level).toBe('ok');
      expect(check(10.9, line - 0.002).level).toBe('error');
      expect(check(line + 0.002, 11.5).level).toBe('error');
    });
  });
});

describe('Bound, Unbound and Escape: the prediction comes back beside the readings', () => {
  test('the four readings sit between the prediction and its reveal', () => {
    const predict = stepOf(ENERGY, 'somewhere-else-entirely');
    const measure = stepOf(ENERGY, 'read-the-escape-speeds');
    const reveal = stepOf(ENERGY, 'more-mass-harder-to-leave');
    expect(predict.reveal).toBe('more-mass-harder-to-leave');
    expect(indexOf(ENERGY, predict.sid)).toBeLessThan(
      indexOf(ENERGY, measure.sid)
    );
    expect(indexOf(ENERGY, measure.sid)).toBeLessThan(
      indexOf(ENERGY, reveal.sid)
    );
    expect(reveal.evidence.map(e => e.field)).toEqual([
      'v_moon',
      'v_earth',
      'v_jupiter',
      'v_sun',
    ]);
    expect(reveal.compare).toBeTruthy();
  });

  test('each reading is taken from a row the escape-compare instrument prints', () => {
    const measure = stepOf(ENERGY, 'read-the-escape-speeds');
    const rows = compare.readout({ dist: 1 });
    for (const f of measure.fields) {
      const row = rows.find(r => r.id === f.source.tool);
      expect({ field: f.id, found: Boolean(row) }).toEqual({
        field: f.id,
        found: true,
      });
      expect(row.value).toMatch(/km\/s$/);
    }
  });

  test('the readings are for the surface: a start further out is told so', () => {
    const { validate } = stepOf(ENERGY, 'read-the-escape-speeds');
    const surface = Object.fromEntries(
      compare.readout({ dist: 1 }).map(r => [`v_${r.id}`, parseFloat(r.value)])
    );
    expect(validate(surface, {})).toBeNull();
    const out = Object.fromEntries(
      compare.readout({ dist: 4 }).map(r => [`v_${r.id}`, parseFloat(r.value)])
    );
    expect(validate(out, {}).message).toMatch(/further out than the surface/);
  });

  test('the prediction stays committed, not revealed, while the readings are taken', () => {
    const responses = { 'orbital-energy:somewhere-else-entirely': '3' };
    const upTo = sid =>
      new Set(ENERGY.steps.slice(0, indexOf(ENERGY, sid) + 1).map(s => s.sid));
    const state = sid =>
      predictionState(ENERGY.steps, stepOf(ENERGY, sid), upTo(sid), responses);
    expect(state('read-the-escape-speeds')).toBe('committed');
    expect(state('more-mass-harder-to-leave')).toBe('revealed');
    expect(
      predictionState(
        ENERGY.steps,
        stepOf(ENERGY, 'read-the-escape-speeds'),
        upTo('read-the-escape-speeds'),
        {}
      )
    ).toBe('uncommitted');
  });

  test('wrong turns on the reading signs and on what stays put have authored feedback', () => {
    for (const sid of ['reading-the-sign', 'what-stays-put']) {
      const s = stepOf(ENERGY, sid);
      const wrong = s.options.map((_, i) => i).filter(i => i !== s.answer);
      const covered = (s.misconceptions || []).map(m => m.option);
      expect(covered.sort()).toEqual(wrong);
      for (const m of s.misconceptions) {
        expect(m.say.length).toBeGreaterThan(20);
        // Feedback never states the right option.
        expect(m.say).not.toContain(s.options[s.answer]);
      }
    }
  });
});

describe('Bound, Unbound and Escape: retired steps say what they became', () => {
  test('the old bracket step has a successor and the old question has none', () => {
    expect(ENERGY.retired['write-down-the-dividing-speed'].to).toBe(
      'bracket-the-dividing-speed'
    );
    expect(ENERGY.retired['where-is-the-line'].to).toBeNull();
    for (const old of Object.keys(ENERGY.retired)) {
      expect(indexOf(ENERGY, old)).toBe(-1);
      const to = ENERGY.retired[old].to;
      if (to) expect(indexOf(ENERGY, to)).toBeGreaterThanOrEqual(0);
      expect(ENERGY.retired[old].was.en.length).toBeGreaterThan(10);
      expect(ENERGY.retired[old].was.es.length).toBeGreaterThan(10);
    }
  });

  test('the cannon predictions, the real-object transfer and the misconception step stay', () => {
    for (const sid of [
      'load-it-lightly',
      'load-it-heavily',
      'somewhere-else-entirely',
      'a-common-misunderstanding',
      'check-it-yourself',
      'will-it-be-back',
    ]) {
      expect(indexOf(ENERGY, sid)).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('What If Gravity Were Not Inverse Square?: a leak fixed, one task changed', () => {
  test('no precession result is stated before it is measured', () => {
    const upTo = indexOf(POWER, 'record-the-precession');
    const text = POWER.steps
      .slice(0, upTo + 1)
      .map(s =>
        plain(
          `${s.body ?? ''} ${(s.checklist || []).join(' ')} ${s.tip ?? ''} ${s.because ?? ''}`
        )
      )
      .join(' ');
    expect(text).not.toMatch(/\b(nine|forty-three|43|9\.38|42\.67|31\.4)\b/i);
    expect(text).not.toMatch(/\bnegative\b/i);
  });

  test('the unit the reference-distance sentence is in is named', () => {
    const body = plain(stepOf(POWER, 'why-there-is-a-reference-distance').body);
    expect(body).toMatch(/engine's own units \(100 to the AU\)/);
    expect(body).toMatch(/17 percent/);
    expect(body).toMatch(/4\.5 percent/);
  });

  test('the slope rule is found from two readings before it is used', () => {
    const rate = stepOf(POWER, 'find-the-slope-rate');
    const use = stepOf(POWER, 'predict-the-slope-at-2-9');
    expect(indexOf(POWER, 'measure-the-slope')).toBeLessThan(
      indexOf(POWER, rate.sid)
    );
    expect(indexOf(POWER, rate.sid)).toBeLessThan(indexOf(POWER, use.sid));
    // The rate is the one the tree's own slope gives.
    const expected =
      (expectedKeplerSlope(2.5) - expectedKeplerSlope(2)) / (2.5 - 2);
    expect(rate.answer).toBeCloseTo(expected, 6);
    expect(use.answer).toBeCloseTo(expectedKeplerSlope(2.9), 6);
    // Two readings are shown, not four, and the formula is in neither body.
    for (const s of [rate, use]) {
      expect(plain(s.body)).not.toMatch(/\(n \+ 1\)|slope =|slope = /);
    }
    expect(plain(rate.body)).toMatch(/1\.5/);
    expect(plain(rate.body)).toMatch(/1\.75/);
    expect(plain(rate.body)).not.toMatch(/1\.4|1\.6\b/);
    // The formula appears only in the reveal text.
    expect(plain(use.explain)).toMatch(/\(n \+ 1\) \/ 2/);
  });

  test('the prediction step opens the instrument away from the answer', () => {
    const use = stepOf(POWER, 'predict-the-slope-at-2-9');
    expect(use.tool.start).toEqual({ n: 2 });
    expect(use.tool.values).toEqual({ n: 2.9 });
  });

  test('the predicted-slope row is withheld on the steps that ask for the slope, and shown elsewhere', () => {
    const kepler = POWER_LAW_WIDGETS.find(w => w.id === 'power-law-kepler');
    const rows = (n, spec) =>
      kepler.readout({ n }, undefined, spec).map(r => r.id ?? r.label);
    for (const sid of ['measure-the-slope', 'predict-the-slope-at-2-9']) {
      const { tool } = stepOf(POWER, sid);
      expect(tool.id).toBe('power-law-kepler');
      expect(tool.withhold).toEqual(['expected']);
      for (const n of [1.8, 2, 2.5, 2.9]) {
        const shown = kepler.readout({ n }, undefined, tool);
        expect(shown.map(r => r.id)).not.toContain('expected');
        // Nothing left on the instrument carries the formula or its value.
        const text = JSON.stringify(shown);
        expect(text).not.toMatch(/\(n\+1\)\/2/);
        expect(text).not.toMatch(/Predicted/);
        // The measurement itself is still there to be read.
        expect(shown.find(r => r.emphasis).label).toMatch(/Measured slope/);
      }
    }
    expect(rows(2.9, {})).toContain('expected');
    expect(rows(2.9, undefined)).toContain('expected');
    expect(rows(2.9, { withhold: ['expected'] })).toHaveLength(
      rows(2.9, {}).length - 1
    );
    // Everywhere else the instrument still says it, and it is the formula's value.
    const at = kepler.readout({ n: 2.9 }, undefined, {});
    expect(at.find(r => r.id === 'expected').value).toBe('1.9500');
  });

  test('the rate and the prediction refuse a wrong turn with the author’s words', () => {
    for (const sid of ['find-the-slope-rate', 'predict-the-slope-at-2-9']) {
      const s = stepOf(POWER, sid);
      expect(s.hints).toHaveLength(2);
      expect(s.feedback.close).toBeTruthy();
      expect(s.feedback.off).toBeTruthy();
      // A hint's first rung does not hand over the value.
      expect(s.hints[0]).not.toMatch(/1\.95|0\.5\b/);
    }
  });

  test('the old step is retired with the prediction as its successor', () => {
    expect(POWER.retired['predict-the-slope'].to).toBe(
      'predict-the-slope-at-2-9'
    );
    expect(indexOf(POWER, 'predict-the-slope')).toBe(-1);
  });

  test('the canvas is quiet behind the precession, timestep and conservation runs, and the scene is the rest', () => {
    expect(canvasProblems(POWER)).toEqual([]);
    expect(stepOf(POWER, 'record-the-precession').canvas).toBe('quiet');
    expect(
      canvasAt(POWER, indexOf(POWER, 'first-look-at-the-orbit'))
    ).toBeNull();
    expect(stepOf(POWER, 'the-exactly').setup.scenario).toBe('Solar System');
    expect(canvasAt(POWER, indexOf(POWER, 'the-exactly'))).toBeNull();
    const quiet = new Set([
      ...POWER.steps
        .slice(
          indexOf(POWER, 'record-the-precession'),
          indexOf(POWER, 'predict-period-and-distance')
        )
        .map(s => s.sid),
      ...POWER.steps
        .slice(
          indexOf(POWER, 'measure-conservation'),
          indexOf(POWER, 'and-energy')
        )
        .map(s => s.sid),
    ]);
    for (const s of POWER.steps.slice(
      indexOf(POWER, 'record-the-precession')
    )) {
      expect([s.sid, canvasAt(POWER, indexOf(POWER, s.sid)).kind]).toEqual([
        s.sid,
        quiet.has(s.sid) ? 'quiet' : 'scene',
      ]);
      expect(s.setup).toBeUndefined();
      expect(s.stage).toBeUndefined();
    }
    // The slope runs, which the layout spec measures on a loud canvas.
    expect(canvasAt(POWER, indexOf(POWER, 'measure-the-slope')).kind).toBe(
      'scene'
    );
  });
});
