// =============================================================================
// Declarative scenario geometry, slice 5 (Roadmap II Prompt 108)
// -----------------------------------------------------------------------------
// Five scenarios placed bodies inside applyPlacement, before its momentum
// balance: Binary Black Hole (placed again at the end of the build), Slingshot,
// Triple Black Hole System, Neutron Star Collision (named at the end whatever
// the layout) and White Dwarf Binary. They are declared in ENGINE_GEOMETRY with
// a `place` stage that runs at the point the code ran, so the balance takes
// the same state. This holds them to the world the code made:
//
//   1. Every field of every body, the settings, the camera and the seeded
//      generator's next draw, at seven seeds and under 174 share-link cases
//      (every population count at 0 and 3, the settings the arithmetic reads,
//      every layout), captured from the code before it was changed.
//   2. The draws: the same number, in the same order, and the same next one.
//   3. The arithmetic against closed forms, not only against the old code.
//   4. The validator, for the `place` stage and the rules it adds.
// =============================================================================

import { readFileSync } from 'node:fs';
import { DEFAULT_SETTINGS } from '../js/appState.js';
import * as physics from '../js/physics.js';
import { SCENARIO_GEOMETRY, SCENARIO_PRESETS } from '../js/scenarios.js';
import { ENGINE_GEOMETRY } from '../js/world/build.js';
import { GEOMETRY_RULES, validateGeometry } from '../js/scenarioPack.js';
import { digest } from './scenarioDigest.js';
import {
  SLICE5_COUNTS,
  SLICE5_EDGE_IDS,
  SLICE5_PLACEMENTS,
  SLICE5_SCENARIOS,
  SLICE5_SEEDS,
  worldKey,
} from './scenarioSlice5Cases.js';

const read = name => JSON.parse(readFileSync(`tests/fixtures/${name}`, 'utf8'));
const GOLDEN = read('scenarioGeometrySlice5Golden.json');
const EDGE = read('scenarioGeometrySlice5EdgeGolden.json');

describe('slice 5: the five declared scenarios build the world the code built', () => {
  test('they are declared in the engine, and nowhere a pack could carry them', () => {
    for (const key of SLICE5_SCENARIOS) {
      expect(ENGINE_GEOMETRY[key].place.length).toBeGreaterThan(0);
      expect(SCENARIO_GEOMETRY[key]).toBeUndefined();
      expect(validateGeometry(ENGINE_GEOMETRY[key])).toEqual([]);
      expect(
        validateGeometry(ENGINE_GEOMETRY[key], { rules: false }).length
      ).toBeGreaterThan(0);
    }
  });

  test('the fixture covers every scenario at seven seeds and every case', () => {
    expect(Object.keys(GOLDEN).length).toBe(SLICE5_SCENARIOS.length * 7);
    expect(Object.keys(EDGE).sort()).toEqual([...SLICE5_EDGE_IDS].sort());
    for (const key of SLICE5_SCENARIOS) {
      const ids = SLICE5_EDGE_IDS.filter(id => id.startsWith(`${key}@`));
      for (const p of SLICE5_COUNTS)
        for (const n of [0, 3]) expect(ids).toContain(`${key}@{"${p}":${n}}`);
      for (const l of SLICE5_PLACEMENTS)
        expect(ids).toContain(`${key}@{"placement":"${l}"}`);
    }
  });

  test.each(Object.keys(GOLDEN))(
    '%s: every field of every body, the settings, the camera and the generator',
    id => {
      const [key, seed] = id.split('@');
      expect(SLICE5_SEEDS).toContain(Number(seed));
      expect(worldKey(digest(key, Number(seed)))).toEqual(GOLDEN[id]);
    }
  );

  test.each(SLICE5_EDGE_IDS)('%s is the world the code made', id => {
    const at = id.indexOf('@');
    const d = digest(id.slice(0, at), 1, JSON.parse(id.slice(at + 1)));
    expect(worldKey(d)).toEqual(EDGE[id]);
  });

  test('the draws are the code’s: the same number of them, and the same next one', () => {
    const count = fn => {
      const real = Math.random;
      let cur = real;
      let n = 0;
      Object.defineProperty(Math, 'random', {
        configurable: true,
        get: () => () => {
          n++;
          return cur();
        },
        set: v => {
          cur = v;
        },
      });
      try {
        fn();
      } finally {
        Object.defineProperty(Math, 'random', {
          configurable: true,
          writable: true,
          value: real,
        });
      }
      return n;
    };
    const plus3 = {
      num_planets: 3,
      num_gas_giants: 3,
      num_asteroids: 3,
      num_stars: 3,
    };
    const DRAWS = {
      'binary-bh': [129, 36],
      slingshot: [458, 89],
      'triple-bh-system': [88, 25],
      'neutron-star-collision': [43, 32],
      'white-dwarf-binary': [89, 30],
    };
    for (const [key, [plain, three]] of Object.entries(DRAWS)) {
      expect([key, count(() => digest(key, 1))]).toEqual([key, plain]);
      expect([key, count(() => digest(key, 1, plus3))]).toEqual([key, three]);
    }
    for (const id of Object.keys(GOLDEN))
      expect(typeof GOLDEN[id].tail).toBe('number');
  });
});

describe('slice 5: the worlds against their closed forms', () => {
  const world = (key, pending = null) => {
    digest(key, 1, pending);
    return physics;
  };
  const rel = (a, b) => Math.hypot(a.vel.x - b.vel.x, a.vel.y - b.vel.y);

  test('Binary Black Hole: the pair about its center of mass, planets on a ladder about the pair', () => {
    const w = world('binary-bh');
    const [a, b] = w.bh_list;
    // 120 apart on the x axis, the lighter one the farther from the center.
    expect(b.pos.x - a.pos.x).toBeCloseTo(120, 9);
    expect(a.pos.x).toBeCloseTo((-120 * b.mass) / (a.mass + b.mass), 9);
    // 0.95 of the circular relative speed, which a net-momentum balance leaves.
    const G =
      SCENARIO_PRESETS['binary-bh'].gravitational_constant ??
      DEFAULT_SETTINGS.gravitational_constant;
    expect(rel(a, b)).toBeCloseTo(
      0.95 * Math.sqrt((G * (a.mass + b.mass)) / 120),
      6
    );
    w.planets.forEach((p, i) =>
      expect(Math.hypot(p.pos.x, p.pos.y)).toBeCloseTo(180 + i * 30, 9)
    );
    w.gas_giants.forEach((p, i) =>
      expect(Math.hypot(p.pos.x, p.pos.y)).toBeCloseTo(350 + i * 50, 9)
    );
  });

  test('Slingshot: the heavy hole and the light one 100 apart', () => {
    const [a, b] = world('slingshot').bh_list;
    expect(b.pos.x - a.pos.x).toBeCloseTo(100, 9);
    expect(a.pos.y).toBe(0);
    expect(b.pos.y).toBe(0);
  });

  test('Triple Black Hole System: a triangle of circumradius 150', () => {
    const w = world('triple-bh-system');
    w.bh_list.forEach((h, i) => {
      const angle = (i / 3) * 2 * Math.PI;
      expect(h.pos.x).toBeCloseTo(150 * Math.cos(angle), 9);
      expect(h.pos.y).toBeCloseTo(150 * Math.sin(angle), 9);
    });
  });

  test('Neutron Star Collision: two stars 100 apart at 30 relative speed, named', () => {
    const [a, b] = world('neutron-star-collision').neutron_stars;
    expect([a.pos.x, b.pos.x]).toEqual([-50, 50]);
    expect(rel(a, b)).toBeCloseTo(30, 9);
    expect([a.name, b.name]).toEqual(['GW170817-A', 'GW170817-B']);
  });

  test('Neutron Star Collision is named at any layout, and only with two stars', () => {
    expect(
      world('neutron-star-collision', { placement: 'Empty' }).neutron_stars.map(
        n => n.name
      )
    ).toEqual(['GW170817-A', 'GW170817-B']);
    expect(
      world('neutron-star-collision', { num_neutron_stars: 1 }).neutron_stars[0]
        .name
    ).not.toBe('GW170817-A');
  });

  test('White Dwarf Binary: two dwarfs 160 apart at 40 relative speed', () => {
    const [a, b] = world('white-dwarf-binary').white_dwarfs;
    expect([a.pos.x, b.pos.x]).toEqual([-80, 80]);
    expect(rel(a, b)).toBeCloseTo(40, 9);
  });
});

describe('slice 5: the validator for the place stage', () => {
  const why = (g, opts) =>
    validateGeometry(g, opts).map(p => `${p.path}: ${p.why}`);
  const pin = {
    name: 'pin-pair',
    params: { type: 'WhiteDwarf', x: 80, speed: 20 },
  };

  test('a geometry of place steps alone is valid, and one with no steps and no place is not', () => {
    expect(why({ place: [{ rule: pin }] })).toEqual([]);
    expect(why({})[0]).toMatch(/steps/);
    expect(why({ place: [{ rule: pin }], steps: [] })[0]).toMatch(/steps/);
  });

  test('a place step names a rule that places, with its parameters; at most four', () => {
    expect(
      why({ place: [{ rule: { name: 'name-pair', params: {} } }] })[0]
    ).toMatch(/place\[0\].*pin-pair/);
    expect(why({ place: [{ body: {} }] })[0]).toMatch(/place\[0\]/);
    expect(why({ place: 'x' })[0]).toMatch(/place/);
    expect(why({ place: Array(5).fill({ rule: pin }) })[0]).toMatch(/up to 4/);
    expect(
      why({
        place: [{ rule: { ...pin, params: { ...pin.params, x: -1 } } }],
      })[0]
    ).toMatch(/place\[0\].rule.params.x/);
  });

  test('a pack may not carry a place stage', () => {
    expect(why({ place: [{ rule: pin }] }, { rules: false })[0]).toMatch(
      /may not place bodies/
    );
  });

  test('pin-pair takes two kinds of body, name-pair two names, triangle-holes a radius and a speed', () => {
    const rule = (name, params) => ({ steps: [{ rule: { name, params } }] });
    expect(why(rule('pin-pair', { type: 'Star', x: 1, speed: 1 }))[0]).toMatch(
      /one of NeutronStar, WhiteDwarf/
    );
    expect(
      why(rule('name-pair', { type: 'NeutronStar', names: ['a'] }))[0]
    ).toMatch(/a list of 2/);
    expect(
      why(rule('name-pair', { type: 'NeutronStar', names: ['a', 'b'] }))
    ).toEqual([]);
    expect(why(rule('triangle-holes', { radius: 1 }))[0]).toMatch(/speed/);
    expect(Object.keys(GEOMETRY_RULES)).toEqual(
      expect.arrayContaining(['pin-pair', 'triangle-holes', 'name-pair'])
    );
  });

  test('orbital-population takes the stars or the holes that set the speed, not both, not neither', () => {
    const rule = params => ({
      steps: [{ rule: { name: 'orbital-population', params } }],
    });
    expect(why(rule({ centralHoles: 2, planetInner: 1 }))).toEqual([]);
    expect(why(rule({ centralStars: 1, planetInner: 1 }))).toEqual([]);
    expect(why(rule({ planetInner: 1 }))[0]).toMatch(
      /exactly one of centralStars/
    );
    expect(
      why(rule({ centralStars: 1, centralHoles: 2, planetInner: 1 }))[0]
    ).toMatch(/exactly one of centralStars/);
  });
});
