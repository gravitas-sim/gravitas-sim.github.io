/**
 * @jest-environment jsdom
 */
// =============================================================================
// Black Holes by the Numbers: the four scalings, the student's choices, and
// saved work under the two retired steps
// -----------------------------------------------------------------------------
// The lesson asks the student to pick three masses for the horizon experiment,
// to predict how radius, average density, Hawking temperature and evaporation
// lifetime change from 10 to 20 solar masses, and to read the four factors off
// the black hole on the canvas. This checks, without a browser:
//
//   - the model (js/blackHolePhysics.js) against the formulas the lesson
//     states, R_s = 2GM/c^2, rho = M / (4/3 pi R_s^3), T = hbar c^3 / (8 pi G M
//     k_B) and t = 5120 pi G^2 M^3 / (hbar c^4), recomputed here from SI
//     constants, and the exponents 1, -2, -1 and 3 measured as log slopes;
//   - the readings step's four factors at 20 against 10, and that the
//     prediction's keyed option is the one the model gives;
//   - the choice of masses: three equal masses, masses bunched under a factor
//     of four, a chain of doublings and a radius taken at another mass are each
//     refused with an authored message; a spread set is accepted;
//   - the readings step refuses factors taken at another mass or at two masses;
//   - answers saved under `three-measurements` and `where-the-room-comes-from`
//     read as an earlier version, named with their successors.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { INVESTIGATIONS } from '../js/data/investigations.js';
import { blackHoleFacts } from '../js/blackHolePhysics.js';
import { readProgress } from '../js/investigations/progressSchema.js';
import { earlierAnswers, wasIn } from '../js/investigations/stepView.js';

const L = INVESTIGATIONS.find(l => l.id === 'black-holes');
const step = sid => L.steps.find(s => s.sid === sid);

// CODATA 2018 and the IAU nominal solar mass parameter, independent of the
// module under test.
const G = 6.6743e-11;
const C = 299792458;
const HBAR = 1.054571817e-34;
const K_B = 1.380649e-23;
const M_SUN = 1.98892e30;
const YEAR = 3.15576e7;

const formula = suns => {
  const M = suns * M_SUN;
  const rs = (2 * G * M) / C ** 2;
  return {
    rsKm: rs / 1000,
    density: M / ((4 / 3) * Math.PI * rs ** 3),
    temperature: (HBAR * C ** 3) / (8 * Math.PI * G * M * K_B),
    lifetimeYears: (5120 * Math.PI * G ** 2 * M ** 3) / (HBAR * C ** 4) / YEAR,
  };
};

const QUANTITIES = ['rsKm', 'density', 'temperature', 'lifetimeYears'];
const EXPONENT = { rsKm: 1, density: -2, temperature: -1, lifetimeYears: 3 };

const ctxAt = suns => ({
  role: r => (r === 'hole' && suns ? { massInSuns: suns } : null),
  holeFacts: blackHoleFacts,
});
const rows = (sid, suns) =>
  Object.fromEntries(
    step(sid)
      .probe(ctxAt(suns))
      .filter(r => r.id)
      .map(r => [r.id, r.value])
  );
const firstNumber = text => Number(String(text).match(/[\d.]+/)[0]);

describe('the model against the formulas the lesson states', () => {
  test.each([1, 2, 10, 20, 25, 4.3e6])(
    'at %p solar masses each quantity agrees with its formula to 0.1%%',
    suns => {
      const model = blackHoleFacts(suns);
      const want = formula(suns);
      for (const q of QUANTITIES)
        expect(Math.abs(model[q] / want[q] - 1)).toBeLessThan(1e-3);
    }
  );

  test('the four scale with mass as M, 1/M², 1/M and M³ from 2 to a billion solar masses', () => {
    for (const [a, b] of [
      [2, 25],
      [10, 20],
      [1, 1e9],
    ]) {
      const fa = blackHoleFacts(a);
      const fb = blackHoleFacts(b);
      for (const q of QUANTITIES) {
        const slope = Math.log(fb[q] / fa[q]) / Math.log(b / a);
        expect(slope).toBeCloseTo(EXPONENT[q], 9);
      }
    }
  });

  test('the numbers the lesson quotes are the model’s', () => {
    expect(blackHoleFacts(1).rsKm).toBeCloseTo(2.95, 2);
    expect(blackHoleFacts(10).rsKm).toBeCloseTo(29.5, 1);
    expect(blackHoleFacts(10).temperature).toBeGreaterThan(6.0e-9);
    expect(blackHoleFacts(10).temperature).toBeLessThan(6.4e-9);
    expect(blackHoleFacts(4.3e6).temperature).toBeCloseTo(1.4e-14, 15);
  });
});

describe('twenty against ten', () => {
  const at20 = rows('read-twenty-against-ten', 20);

  test('the readings are the model’s factors, to the three figures shown', () => {
    expect(firstNumber(at20.fr)).toBe(2);
    expect(firstNumber(at20.fd)).toBe(0.25);
    expect(firstNumber(at20.ft)).toBe(0.5);
    expect(firstNumber(at20.fl)).toBe(8);
  });

  test('the prediction’s keyed option is the set the model gives, and every option names all four', () => {
    const predict = step('predict-twenty-against-ten');
    expect(predict.type).toBe('predict');
    expect(predict.reveal).toBe('say-what-scales-with-what');
    expect(predict.options[predict.answer]).toBe(
      'radius ×2, density ×¼, temperature ×½, lifetime ×8'
    );
    for (const o of predict.options)
      expect(o).toMatch(
        /^radius ×\S+, density ×\S+, temperature ×\S+, lifetime ×\S+$/
      );
    // Each wrong set is a named slip, not a random one.
    expect(predict.misconceptions.map(m => m.option).sort()).toEqual([0, 1, 3]);
  });

  test('the reveal sets the prediction beside the four readings', () => {
    const reveal = step('say-what-scales-with-what');
    expect(reveal.evidence).toEqual(
      ['fr', 'fd', 'ft', 'fl'].map(field => ({
        step: 'read-twenty-against-ten',
        field,
      }))
    );
    const order = L.steps.map(s => s.sid);
    expect(order.indexOf('read-twenty-against-ten')).toBeLessThan(
      order.indexOf('say-what-scales-with-what')
    );
    expect(order.indexOf('predict-twenty-against-ten')).toBeLessThan(
      order.indexOf('from-city-sized-to-solar')
    );
  });

  test('readings taken at another mass, or at two masses, are refused', () => {
    const { validate } = step('read-twenty-against-ten');
    const read = suns => {
      const r = rows('read-twenty-against-ten', suns);
      return Object.fromEntries(
        Object.entries(r).map(([k, v]) => [k, firstNumber(v)])
      );
    };
    expect(validate(read(20)).level).toBe('ok');
    expect(validate(read(15))).toMatchObject({
      level: 'error',
      message: expect.stringMatching(/mass other than 20/),
    });
    expect(validate({ ...read(20), fd: read(15).fd })).toMatchObject({
      level: 'error',
      message: expect.stringMatching(/not all taken at one mass/),
    });
    expect(validate({ fr: 2, fd: NaN, ft: 0.5, fl: 8 })).toBeNull();
  });

  test('with no hole on the canvas every reading row is there, with nothing to take', () => {
    const none = rows('read-twenty-against-ten', null);
    expect(Object.keys(none)).toEqual(['fr', 'fd', 'ft', 'fl']);
    for (const v of Object.values(none)) expect(v).toBe('-');
  });
});

describe('three masses of the student’s own', () => {
  const s = step('choose-three-masses');
  const ctx = ctxAt(10);
  const trial = (...masses) =>
    Object.fromEntries(
      masses.flatMap((m, i) => [
        [`m${i + 1}`, m],
        [`r${i + 1}`, Number(blackHoleFacts(m).rsKm.toFixed(1))],
      ])
    );

  test('no mass, radius or factor is printed in the body or the checklist', () => {
    const text = [s.body, ...s.checklist].join(' ');
    expect(text).not.toMatch(/\d+(\.\d+)?\s*(M☉|km|solar mass)/);
    expect(s.tool.values).toBeUndefined();
  });

  test('a spread set is accepted', () => {
    expect(s.validate(trial(3, 7, 20), ctx).level).toBe('ok');
    expect(s.validate(trial(25, 2, 9), ctx).level).toBe('ok');
  });

  test.each([
    ['three equal masses', [10, 10, 10], /same mass/],
    ['two equal masses', [4, 4, 20], /same mass/],
    [
      'masses bunched under a factor of four',
      [5, 8, 12],
      /less than four times/,
    ],
    ['a chain of doublings', [5, 10, 20], /double the one before/],
  ])('%s is refused with authored feedback', (_, masses, said) => {
    expect(s.validate(trial(...masses), ctx)).toMatchObject({
      level: 'error',
      message: expect.stringMatching(said),
    });
  });

  test('a radius taken at another mass is refused', () => {
    const v = {
      ...trial(3, 7, 20),
      r2: Number(blackHoleFacts(8).rsKm.toFixed(1)),
    };
    expect(s.validate(v, ctx)).toMatchObject({
      level: 'error',
      message: expect.stringMatching(/does not belong to the mass/),
    });
  });

  test('the readings come from the hole on the canvas, which the slider moves', () => {
    expect(s.tool).toMatchObject({
      id: 'bh-scaling',
      scene: true,
      capture: true,
    });
    const r = rows('choose-three-masses', 7);
    expect(firstNumber(r.mass)).toBe(7);
    expect(firstNumber(r.rs)).toBeCloseTo(blackHoleFacts(7).rsKm, 1);
  });

  test('the zero count opens below the setting it asks about', () => {
    const z = step('count-the-zeros');
    expect(z.tool.values.zeros).not.toBe(3);
    expect(z.body).not.toMatch(/three directions|cube/);
  });
});

describe('saved work under the retired steps', () => {
  const SAVED = {
    schema: 2,
    lesson: 'black-holes',
    stepSid: 'where-the-room-comes-from',
    responses: {
      'black-holes:now-make-it-heavier': 1,
      'black-holes:three-measurements:tool:mass': '20',
      'black-holes:where-the-room-comes-from': '9',
      'black-holes:where-the-room-comes-from:locale': 'en',
      'black-holes:which-way-did-it-go': 1,
    },
    attempts: { 'black-holes:where-the-room-comes-from': 1 },
    visited: ['now-make-it-heavier', 'where-the-room-comes-from'],
    startedAt: '2026-10-01T00:00:00.000Z',
  };
  const read = readProgress(SAVED, L);

  test('the steps that kept their task keep their answers; the retired ones are an earlier version', () => {
    expect(read.responses['black-holes:now-make-it-heavier']).toBe(1);
    expect(read.responses['black-holes:which-way-did-it-go']).toBe(1);
    expect(
      read.responses['black-holes:where-the-room-comes-from']
    ).toBeUndefined();
    expect(Object.keys(read.earlier.responses).sort()).toEqual(
      Object.keys(SAVED.responses)
        .filter(k => /three-measurements|where-the-room/.test(k))
        .sort()
    );
  });

  test('each earlier answer names its successor and what it asked, in both languages', () => {
    const shown = earlierAnswers(L, read.earlier.responses);
    const to = Object.fromEntries(shown.map(r => [r.id, r.r.to]));
    expect(to['where-the-room-comes-from']).toBe('count-the-zeros');
    for (const r of shown) {
      expect(L.steps.map(x => x.sid)).toContain(r.r.to);
      expect(wasIn(r.r.was, 'en')).toBeTruthy();
      expect(wasIn(r.r.was, 'es')).toBeTruthy();
    }
    expect(L.retired['three-measurements'].to).toBe('choose-three-masses');
  });
});
