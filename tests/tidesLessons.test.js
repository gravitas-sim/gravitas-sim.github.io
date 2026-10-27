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
    expect([...used].sort()).toEqual(['Ring Gap', 'Roche Pass']);
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
  test('the recession 3.75 cm per year and the day 2.05 ms per century', () => {
    const m = W.moonView({ gyr: 0 });
    holds(
      L,
      'the-moons-recession',
      { rate: m.dadtCmPerYear, day: m.dayMsPerCentury },
      { rate: 38, day: 20 }
    );
    expect(within(3.75, m.dadtCmPerYear, 0.06)).toBe(true);
    expect(within(2.05, m.dayMsPerCentury, 0.06)).toBe(true);
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
  test('9.33e13 W and 1.43e19 J in one orbit, inside the observed range', () => {
    const h = W.heatingView({});
    holds(
      L,
      'heating-at-the-maximum',
      { power: h.h.power / 1e13, orbit: h.h.energyPerOrbit / 1e19 },
      { power: 1, orbit: 1 }
    );
    expect(h.h.power).toBeGreaterThan(W.IO_OBSERVED.low);
    expect(h.h.power).toBeLessThan(W.IO_OBSERVED.high);
  });
  test('double the eccentricity: four times the heat, 3.73e14 W', () => {
    const a = W.heatingView({}).h.power;
    const b = W.heatingView({ e: 0.0082 }).h.power;
    expect(b / a).toBeCloseTo(4, 12);
    holds(L, 'double-the-eccentricity', { power: b / 1e14 }, { power: 1.9 });
    expect(step(L, 'double-predict').answer).toBe(1);
  });
  test('the bound: the heat needs k2/Q = 0.0177, within the model’s range; 17 times below its largest', () => {
    const h = W.heatingView({});
    holds(L, 'the-bound', { need: h.need.k2OverQ }, { need: 0.3 });
    expect(h.need.withinModel).toBe(true);
    expect(h.range.k2OverQMax / h.need.k2OverQ).toBeCloseTo(
      step(L, 'how-far-from-the-maximum').answer,
      0
    );
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
