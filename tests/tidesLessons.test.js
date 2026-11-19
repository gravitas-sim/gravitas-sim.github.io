/**
 * @jest-environment jsdom
 */
// =============================================================================
// The ring and tide investigations and instruments (Roadmap III, Prompt 204 part 2)
// -----------------------------------------------------------------------------
// Every number a step of "Why Rings?", "Tides That Move the Moon" and "Io's Fire"
// states is recomputed here from the kernel (js/kernels/tides/) and compared at
// the tolerance the step carries (lessonNumbers in
// tests/fixtures/tides/display-thresholds.json: 0.5 percent where the step states
// no tolerance of its own): each validator accepts the kernel's value, refuses a
// wrong one, a prediction points at its answer, a numeric depth step's stated
// answer is the kernel's, and the instruments read the same words in English and
// Spanish. The two scenarios' legs are in tests/tidesScenarios.test.js.
// =============================================================================

/* global document */
import { describe, test, expect, beforeAll } from '@jest/globals';
import { INVESTIGATIONS } from '../js/data/investigations.js';
import { withAllDepths } from '../js/investigations/depthAll.js';
import * as K from '../js/kernels/tides/index.js';
import { EN_TIDES } from '../js/i18n/en.tides.js';
import { ES_TIDES } from '../js/i18n/es.tides.js';
import ES_LESSONS from '../js/data/investigations/es/satellite-sequence.js';
import ES_DEEP from '../js/data/investigations/depth/es/satellite-sequence.js';
import { LAZY_FAMILIES } from '../js/widgets.js';
import THRESHOLDS from './fixtures/tides/display-thresholds.json' with { type: 'json' };

const IDS = ['why-rings', 'tides-that-move-the-moon', 'ios-fire'];
const lesson = id => withAllDepths(INVESTIGATIONS.find(l => l.id === id));
const step = (id, sid) => lesson(id).steps.find(s => s.sid === sid);
const REL = THRESHOLDS.lessonNumbers.bounds.relative;
const within = (stated, actual, tol) =>
  Math.abs(stated - actual) <= Math.max(tol ?? 0, REL * Math.abs(actual));

let W;
beforeAll(async () => {
  W = await import('../js/tidesWidgets.js');
});

/** The validator accepts `good` and refuses `bad`, both with a message. */
function holds(id, sid, good, bad) {
  const s = step(id, sid);
  expect(s.validate(good).level).toBe('ok');
  const r = s.validate(bad);
  expect(r.level).toBe('error');
  expect(r.message.length).toBeGreaterThan(20);
  expect(s.validate({})).toBeNull();
}

describe('the lessons are registered whole', () => {
  test('three exist with three depths, and Spanish in step', () => {
    for (const id of IDS) {
      const l = INVESTIGATIONS.find(x => x.id === id);
      expect(l).toBeTruthy();
      expect(l.depths).toEqual(['core', 'quantitative', 'advanced']);
      const full = lesson(id);
      expect(full.steps.some(s => s.depth === 'quantitative')).toBe(true);
      expect(full.steps.some(s => s.depth === 'advanced')).toBe(true);
      expect(ES_LESSONS[id].steps).toHaveLength(l.steps.length);
      expect(ES_DEEP[id].steps).toHaveLength(
        full.steps.filter(s => s.depth).length
      );
    }
  });

  test('every step names a tool the tides family owns', () => {
    const owned = LAZY_FAMILIES.tides.ids;
    expect(owned).toEqual([
      'tides-roche',
      'tides-resonance',
      'tides-moon',
      'tides-heating',
    ]);
    for (const id of IDS)
      for (const s of lesson(id).steps.filter(x => x.tool))
        expect(owned).toContain(s.tool.id);
  });

  test('every prediction reveals a step that exists and carries its explanation', () => {
    for (const id of IDS)
      for (const s of lesson(id).steps.filter(x => x.reveal)) {
        expect(lesson(id).steps.map(x => x.sid)).toContain(s.reveal);
        expect(s.because.length).toBeGreaterThan(40);
      }
  });

  test('the two scenario steps open the scenarios the geometry table declares', () => {
    const used = new Set();
    for (const id of IDS)
      for (const s of lesson(id).steps)
        if (s.setup?.scenario) used.add(s.setup.scenario);
    expect([...used].sort()).toEqual([
      'Galilean Resonance',
      'Ring Gap',
      'Roche Pass',
    ]);
  });
});

describe('Why Rings?: every stated number from the kernel', () => {
  const L = 'why-rings';
  const roche = (system, kind) => W.rocheView({ system, own: 1 })[kind];
  test('Shoemaker-Levy 9 and Jupiter: 1.64 and 3.18 radii', () => {
    const r = roche(1, 'rigid').inPrimaryRadii;
    const f = roche(1, 'fluid').inPrimaryRadii;
    holds(L, 'sl9-limits', { rigid: r, fluid: f }, { rigid: 1, fluid: 1 });
    expect(within(1.64, r, 0.03)).toBe(true);
    expect(within(3.18, f, 0.04)).toBe(true);
  });
  test('Phobos and Mars: the limits 5,466 and 10,585 km, and Phobos at 9,376 km lies between', () => {
    const r = roche(0, 'rigid').distance / 1e3;
    const f = roche(0, 'fluid').distance / 1e3;
    holds(L, 'phobos-where', { rigid: r, fluid: f }, { rigid: 1, fluid: 1 });
    expect(r).toBeLessThan(9376);
    expect(9376).toBeLessThan(f);
    expect(step(L, 'phobos-predict').answer).toBe(1);
  });
  test('the 2:1 resonance of Mimas is 116,883 km, 0.59 percent inside the B ring’s edge', () => {
    const v = W.resonanceView({ moon: 0, p: 2, q: 1 });
    holds(
      L,
      'where-the-gap-falls',
      { radius: v.radius / 1e3, offset: v.offset * 100 },
      { radius: 120000, offset: 3 }
    );
    expect(v.offset).toBeLessThan(0);
    expect(v.nearest.id).toBe('bOuter');
  });
  test('the depth steps: fluid limit of ice 134.4 and Mimas’s 3:1 at 89.2 thousand km', () => {
    const ice = K.rocheLimit({
      primaryRadius: 60268e3,
      primaryDensity: 687,
      satelliteDensity: 900,
      kind: 'fluid',
    }).distance;
    const sd = step(L, 'saturn-ice-limit');
    expect(within(sd.answer, ice / 1e6, 0.01)).toBe(true);
    const r3 = K.resonanceRadius({
      semiMajorAxis: 185540e3,
      p: 3,
      q: 1,
    }).radius;
    const m = step(L, 'mimas-3-to-1');
    expect(within(m.answer, r3 / 1e6, 0.01)).toBe(true);
    expect(ice).toBeGreaterThan(117580e3);
  });
});

describe('Tides That Move the Moon: every stated number from the kernel', () => {
  const L = 'tides-that-move-the-moon';
  test('the Q that matches the measured recession, 3.82 ± 0.07 cm per year, is the whole number 12, which gives 2.05 ms per century', () => {
    const m = W.moonView({ gyr: 0 });
    holds(
      L,
      'match-the-recession',
      { q: m.Q, day: m.dayMsPerCentury },
      { q: 30, day: 1 }
    );
    // 3.75 against 3.82 ± 0.07: one standard error off, the closest the slider's whole numbers come.
    expect(Math.abs(3.82 - m.dadtCmPerYear)).toBeLessThan(0.075);
    expect(within(2.05, m.dayMsPerCentury, 0.06)).toBe(true);
    // Of the slider's whole numbers (5 to 200) 12 comes closest to the measurement.
    let best = 5;
    for (let Q = 5; Q <= 200; Q++)
      if (
        Math.abs(3.82 - W.moonView({ Q, gyr: 0 }).dadtCmPerYear) <
        Math.abs(3.82 - W.moonView({ Q: best, gyr: 0 }).dadtCmPerYear)
      )
        best = Q;
    expect(best).toBe(12);
    const s = step(L, 'match-the-recession');
    for (let Q = 5; Q <= 200; Q++)
      expect(s.validate({ q: Q, day: m.dayMsPerCentury }).level).toBe(
        Q === 12 ? 'ok' : 'error'
      );
  });
  test('a Q that is too large or too small gets the authored message that points the other way', () => {
    const s = step(L, 'match-the-recession');
    const day = W.moonView({ gyr: 0 }).dayMsPerCentury;
    expect(s.validate({ q: 40, day }).message).toMatch(/slower than laser/);
    expect(s.validate({ q: 8, day }).message).toMatch(/faster than laser/);
    expect(s.validate({ q: 12, day: 3 }).message).toMatch(/day’s lengthening/);
    // The laser-ranging value is the task's, never the feedback to a reading.
    for (const sid of ['forward-one-billion', 'the-model-run-backward'])
      expect(
        JSON.stringify(step(L, sid).validate({ a: 1, day: 1, gyr: 9 }))
      ).not.toMatch(/3\.82/);
    expect(step(L, 'what-the-model-leaves-out').body).not.toMatch(/3\.82/);
  });
  test('the instrument opens on the steps that read it at a time that is not the answer', () => {
    for (const sid of [
      'match-the-recession',
      'forward-one-billion',
      'the-model-run-backward',
    ]) {
      const s = step(L, sid);
      expect(s.tool.start).toBeTruthy();
      expect(s.tool.start.gyr === 0 || s.tool.start.Q === 40).toBe(true);
    }
    expect(step(L, 'forward-predict').tool).toBeUndefined();
  });
  test('a billion years on: 414.6 thousand km and a 29.5 hour day; the prediction is 65 radii', () => {
    const m = W.moonView({ gyr: 1 });
    const a = m.last.a / 1e6;
    const day = m.last.spinPeriod / 3600;
    holds(L, 'forward-one-billion', { a, day }, { a: 60, day: 24 });
    expect(a).toBeCloseTo(414.6, 0);
    expect(day).toBeCloseTo(29.5, 0);
    expect(m.last.a / 6371e3).toBeGreaterThan(64);
    expect(m.last.a / 6371e3).toBeLessThan(66);
    expect(step(L, 'forward-predict').answer).toBe(1);
  });
  test('run backward, the model reaches contact 1.58 billion years ago and says so', () => {
    const m = W.moonView({ gyr: -3 });
    expect(m.endedBy.code).toBe('orbit-inside-body');
    const gyr = Math.abs(m.endedBy.time) / (365.25 * 86400 * 1e9);
    holds(L, 'the-model-run-backward', { gyr }, { gyr: 4.5 });
    expect(gyr).toBeCloseTo(1.58, 1);
  });
  test('the depth step: the Moon’s own spin locks in 1.15 hundred million years', () => {
    const t = K.lockingTime({
      perturberMass: 5.972e24,
      satelliteMass: 7.342e22,
      satelliteRadius: 1737.4e3,
      semiMajorAxis: 384400e3,
      k2: 0.024,
      Q: 100,
      spin: (2 * Math.PI) / 36000,
      alpha: 0.393,
    });
    const s = step(L, 'moon-locking-time');
    expect(within(s.answer, t.years / 1e8, 0.1)).toBe(true);
    expect(t.torque / 1e15).toBeCloseTo(4.2, 1);
  });
});

describe('Io’s Fire: every stated number from the kernel', () => {
  const L = 'ios-fire';
  const HELD = { k2: 0.8, Q: 250 };
  test('with k2 and Q held, 1.99e13 W at Io’s eccentricity and four times that, 7.96e13 W, at twice it', () => {
    const a = W.heatingView({ ...HELD, e: 0.0041 }).h.power;
    const b = W.heatingView({ ...HELD, e: 0.0082 }).h.power;
    expect(b / a).toBeCloseTo(4, 12);
    holds(
      L,
      'heating-at-two-eccentricities',
      { p1: a / 1e13, p2: b / 1e13 },
      { p1: 0.12, p2: 0.47 }
    );
    expect(step(L, 'double-predict').answer).toBe(1);
  });
  test('the instrument opens where the reading is wrong, and the check says to move the eccentricity', () => {
    const s = step(L, 'heating-at-two-eccentricities');
    expect(s.tool.start).toEqual({ k2: 0.8, Q: 250, e: 0.001 });
    const open = W.heatingView(s.tool.start).h.power / 1e13;
    expect(s.validate({ p1: open, p2: open }).level).toBe('error');
    expect(s.validate({ p1: open, p2: open }).message).toMatch(
      /change only the eccentricity/
    );
    // A reading taken with k2 and Q moved is not the held-fixed reading.
    const moved = W.heatingView({ k2: 1.5, Q: 100, e: 0.0041 }).h.power / 1e13;
    expect(s.validate({ p1: moved, p2: moved * 4 }).level).toBe('error');
  });
  test('the reveal names the student’s two readings, and the prediction was asked before any rule', () => {
    const reveal = step(L, 'what-doubling-did');
    expect(reveal.evidence).toEqual([
      { step: 'heating-at-two-eccentricities', field: 'p1' },
      { step: 'heating-at-two-eccentricities', field: 'p2' },
    ]);
    const sids = lesson(L).steps.map(s => s.sid);
    expect(sids.indexOf('double-predict')).toBe(1);
    expect(step(L, 'double-predict').reveal).toBe('what-doubling-did');
    for (const s of lesson(L).steps.slice(0, 2))
      expect(`${s.body} ${(s.hints || []).join(' ')}`).not.toMatch(
        /square|proportional|four times|e squared/i
      );
  });
  describe('the search for interiors', () => {
    const s = step(L, 'find-the-interiors');
    const power = (k2, Q) => W.heatingView({ k2, Q, e: 0.0041 }).h.power;
    const range = () => W.IO_OBSERVED;
    const pair = (a, b) => ({ k2a: a[0], qa: a[1], k2b: b[0], qb: b[1] });
    test('the check’s constants are the instrument’s: watts per unit of k2/Q and the observed range', () => {
      const { low, high } = range();
      for (const [k, q] of [
        [0.5, 30],
        [1.5, 5],
        [0.1, 500],
        [0.9, 77],
      ])
        expect(Math.abs((6.2226e15 * k) / q / power(k, q) - 1)).toBeLessThan(
          1e-4
        );
      expect(low).toBe(6e13);
      expect(high).toBe(1.6e14);
    });
    test('any two pairs that bring the heating inside the observed range, with k2 at least 0.2 apart, pass', () => {
      const { low, high } = range();
      const inside = [];
      for (let i = 2; i <= 30; i++)
        for (let Q = 5; Q <= 500; Q++) {
          const k = +(i * 0.05).toFixed(2);
          const p = power(k, Q);
          if (p >= low && p <= high) inside.push([k, Q]);
        }
      expect(inside.length).toBeGreaterThan(100);
      let accepted = 0;
      for (let i = 0; i < inside.length; i += 7)
        for (let j = 0; j < inside.length; j += 11) {
          const ok = Math.abs(inside[i][0] - inside[j][0]) >= 0.2;
          const r = s.validate(pair(inside[i], inside[j]));
          expect(r.level).toBe(ok ? 'ok' : 'error');
          if (ok) accepted++;
          else expect(r.message).toMatch(/nearly the same interior/);
        }
      expect(accepted).toBeGreaterThan(50);
    });
    test('a pair outside the range fails with the authored message for the side it is on', () => {
      const { low, high } = range();
      const good = [1.0, 60];
      const hot = [1.5, 50];
      const cold = [0.8, 250];
      expect(power(...hot)).toBeGreaterThan(high);
      expect(power(...cold)).toBeLessThan(low);
      expect(s.validate(pair(good, hot)).message).toMatch(/^Too much/);
      expect(s.validate(pair(cold, [0.4, 20])).message).toMatch(/^Too little/);
      expect(s.validate(pair([0.6, 300], [0.4, 20])).level).toBe('error');
      for (const bad of [
        [2, 100],
        [0.05, 5],
        [1, 4],
        [1, 600],
      ])
        expect(s.validate(pair(good, bad)).message).toMatch(/sliders can set/);
      expect(s.validate({ k2a: 1 })).toBeNull();
    });
    test('the opening instrument is outside the range: the search is not handed over', () => {
      const { low } = range();
      expect(power(0.8, 250)).toBeLessThan(low);
      expect(s.tool.start).toBeUndefined();
      expect(s.tool.values).toMatchObject({ k2: 0.8, Q: 250, e: 0.0041 });
    });
  });
  test('the deeper steps: 17 times below the model’s largest, a factor of 2.7 across the observed range, and the measurement that depends on k2 alone', () => {
    const h = W.heatingView({});
    expect(h.need.withinModel).toBe(true);
    expect(h.range.k2OverQMax / h.need.k2OverQ).toBeCloseTo(
      step(L, 'how-far-from-the-maximum').answer,
      0
    );
    expect(
      within(
        step(L, 'how-wide-is-the-bound').answer,
        W.IO_OBSERVED.high / W.IO_OBSERVED.low,
        0.1
      )
    ).toBe(true);
    const ch = step(L, 'what-would-separate-them');
    expect(ch.answer).toBe(1);
    expect(ch.misconceptions.map(m => m.option).sort()).toEqual([0, 2, 3]);
    expect(lesson(L).steps.map(s => s.sid)).toEqual([
      'a-moon-that-melts',
      'double-predict',
      'heating-at-two-eccentricities',
      'what-doubling-did',
      'find-the-interiors',
      'two-interiors-one-heat',
      'how-far-from-the-maximum',
      'how-wide-is-the-bound',
      'what-would-separate-them',
      'what-the-formula-leaves-out',
      'what-heat-is',
    ]);
  });
  test('retired steps name where they went, and the canvas is Jupiter and Io or quiet', () => {
    const io = INVESTIGATIONS.find(l => l.id === L);
    const live = new Set(io.steps.map(s => s.sid));
    for (const [id, r] of Object.entries(io.retired)) {
      expect(live.has(id)).toBe(false);
      expect(live.has(r.to)).toBe(true);
    }
    expect(Object.keys(io.retired).sort()).toEqual([
      'double-the-eccentricity',
      'heating-at-the-maximum',
      'the-bound',
    ]);
    expect(io.canvas).toBe('portrait');
    expect(io.picture).toMatch(/Jupiter/);
    expect(io.steps.every(s => s.bind?.io?.name === 'Io')).toBe(true);
    expect(io.steps[0].setup.scenario).toBe('Galilean Resonance');
    const moon = INVESTIGATIONS.find(l => l.id === 'tides-that-move-the-moon');
    expect(moon.canvas).toBe('quiet');
    expect(moon.steps.some(s => s.stage || s.bind || s.setup)).toBe(false);
    expect(Object.keys(moon.retired)).toEqual(['the-moons-recession']);
  });
});

describe('the instruments', () => {
  test('the same keys in English and Spanish with the same placeholders', () => {
    expect(Object.keys(ES_TIDES).sort()).toEqual(Object.keys(EN_TIDES).sort());
    for (const k of Object.keys(EN_TIDES)) {
      const placeholders = s => (s.match(/\{[a-zA-Z]+\}/g) ?? []).sort().join();
      expect(placeholders(ES_TIDES[k])).toBe(placeholders(EN_TIDES[k]));
    }
  });

  test('four instruments, each drawing through the plot component and reading out', () => {
    expect(W.TIDE_WIDGETS.map(w => w.id)).toEqual([
      'tides-roche',
      'tides-resonance',
      'tides-moon',
      'tides-heating',
    ]);
    for (const w of W.TIDE_WIDGETS) {
      const canvas = document.createElement('canvas');
      document.body.append(canvas);
      const spec = w.draw(canvas, {});
      expect(spec.series.length).toBeGreaterThanOrEqual(1);
      expect(spec.xTitle).toBeTruthy();
      // The resonance strip is a radius, with no vertical axis to name.
      if (w.id !== 'tides-resonance') expect(spec.yTitle).toBeTruthy();
      expect(canvas.style.display).toBe('none');
      const rows = w.readout({});
      expect(rows.length).toBeGreaterThan(2);
      for (const r of rows)
        expect(String(r.value)).not.toMatch(/NaN|undefined/);
    }
  });

  test('the views are the kernel’s numbers', () => {
    const base = {
      primaryRadius: 3389.5e3,
      primaryDensity: 3933,
      satelliteDensity: 1876,
    };
    expect(W.rocheView({ system: 0 }).rigid.distance).toBe(
      K.rocheLimit({ ...base, kind: 'rigid' }).distance
    );
    expect(W.resonanceView({ moon: 0, p: 2, q: 1 }).radius).toBe(
      K.resonanceRadius({ semiMajorAxis: 185540e3, p: 2, q: 1 }).radius
    );
  });
});
