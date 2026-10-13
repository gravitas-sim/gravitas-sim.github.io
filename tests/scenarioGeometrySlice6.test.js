// =============================================================================
// Declarative scenario geometry, slice 6 (Roadmap II Prompt 108)
// -----------------------------------------------------------------------------
// The Solar System was the last scenario whose bodies were made by hand: a
// published table of eight planets and giants, sixteen named asteroids and
// twelve named comets, with engine state a row cannot name (Saturn's rings sized
// from the radius the constructor derived, an asteroid's reported Ceres count
// re-synchronized with its mass). It is declared as `published-system`
// (solar-system) in ENGINE_GEOMETRY, and this holds it to the world the code
// made:
//
//   1. Every field of every body, the settings, the camera and the seeded
//      generator's next draw, at seven seeds and under 51 share-link cases
//      (every count at 0 and 3, counts around the tables' lengths, the asteroid
//      switch, G, every layout, the low quality tier), captured from the code
//      before it was changed.
//   2. The draws: the same number, in the same order, and the same next one.
//   3. The arithmetic against closed forms, not only against the old code.
//   4. The validator for the new system name.
// =============================================================================

import { readFileSync } from 'node:fs';
import * as physics from '../js/physics.js';
import { setTier } from '../js/quality.js';
import { SCENARIO_GEOMETRY } from '../js/scenarios.js';
import { ENGINE_GEOMETRY } from '../js/world/build.js';
import { GEOMETRY_RULES, validateGeometry } from '../js/scenarioPack.js';
import { digest } from './scenarioDigest.js';
import {
  SLICE6_COUNTS,
  SLICE6_EDGE_IDS,
  SLICE6_PLACEMENTS,
  SLICE6_SCENARIOS,
  SLICE6_SEEDS,
  worldKey,
} from './scenarioSlice6Cases.js';

const read = name => JSON.parse(readFileSync(`tests/fixtures/${name}`, 'utf8'));
const GOLDEN = read('scenarioGeometrySlice6Golden.json');
const EDGE = read('scenarioGeometrySlice6EdgeGolden.json');

describe('slice 6: the Solar System builds the world the code built', () => {
  test('it is declared in the engine, and nowhere a pack could carry it', () => {
    expect(ENGINE_GEOMETRY['solar-system'].steps).toHaveLength(1);
    expect(SCENARIO_GEOMETRY['solar-system']).toBeUndefined();
    expect(validateGeometry(ENGINE_GEOMETRY['solar-system'])).toEqual([]);
    expect(
      validateGeometry(ENGINE_GEOMETRY['solar-system'], { rules: false }).length
    ).toBeGreaterThan(0);
  });

  test('the fixture covers seven seeds and every case', () => {
    expect(Object.keys(GOLDEN).length).toBe(SLICE6_SCENARIOS.length * 7);
    expect(Object.keys(EDGE).sort()).toEqual([...SLICE6_EDGE_IDS].sort());
    for (const p of SLICE6_COUNTS)
      for (const n of [0, 3])
        expect(SLICE6_EDGE_IDS).toContain(`solar-system@{"${p}":${n}}`);
    for (const l of SLICE6_PLACEMENTS)
      expect(SLICE6_EDGE_IDS).toContain(`solar-system@{"placement":"${l}"}`);
  });

  test.each(Object.keys(GOLDEN))(
    '%s: every field of every body, the settings, the camera and the generator',
    id => {
      const [key, seed] = id.split('@');
      expect(SLICE6_SEEDS).toContain(Number(seed));
      expect(worldKey(digest(key, Number(seed)))).toEqual(GOLDEN[id]);
    }
  );

  test.each(SLICE6_EDGE_IDS)('%s is the world the code made', full => {
    const low = full.startsWith('low:');
    const id = low ? full.slice(4) : full;
    const at = id.indexOf('@');
    if (low) setTier('low');
    try {
      const d = digest(id.slice(0, at), 1, JSON.parse(id.slice(at + 1)));
      expect(worldKey(d)).toEqual(EDGE[full]);
    } finally {
      if (low) setTier('full');
    }
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
    const draws = pending => count(() => digest('solar-system', 1, pending));
    expect(draws(null)).toBe(195);
    expect(draws({ num_asteroids: 3, num_comets: 3 })).toBe(60);
    expect(draws({ enable_asteroids: false, num_comets: 0 })).toBe(27);
    for (const id of Object.keys(GOLDEN))
      expect(typeof GOLDEN[id].tail).toBe('number');
  });
});

describe('slice 6: the world against its closed forms', () => {
  const world = (pending = null) => {
    digest('solar-system', 1, pending);
    return physics;
  };
  const G = 1;

  test('the Sun, and eight planets at the table’s distances on circular orbits', () => {
    const w = world();
    expect(w.stars).toHaveLength(1);
    expect(w.stars[0].name).toBe('Sol');
    expect(w.stars[0].isSolarSystemSun).toBe(true);
    expect(w.stars[0].temperature).toBe(5772);
    const all = [...w.planets, ...w.gas_giants];
    expect(all.map(p => p.name).sort()).toEqual(
      [
        'Earth',
        'Jupiter',
        'Mars',
        'Mercury',
        'Neptune',
        'Saturn',
        'Uranus',
        'Venus',
      ].sort()
    );
    const earth = w.planets.find(p => p.name === 'Earth');
    expect(Math.hypot(earth.pos.x, earth.pos.y)).toBeCloseTo(100, 9);
    expect(Math.hypot(earth.vel.x, earth.vel.y)).toBeCloseTo(
      Math.sqrt((G * w.stars[0].mass) / 100),
      9
    );
  });

  test('only Saturn has rings, sized from the radius its constructor derived', () => {
    const w = world();
    for (const g of w.gas_giants) {
      expect(g.hasRings).toBe(g.name === 'Saturn');
      if (g.name === 'Saturn') {
        expect(g.ringInnerRadius).toBe(g.radius * 1.3);
        expect(g.ringOuterRadius).toBe(g.radius * 2.2);
      }
    }
  });

  test('asteroids and comets: named from the tables, reported counts follow the mass', () => {
    const w = world();
    expect(w.asteroids).toHaveLength(16);
    expect(w.asteroids[0].name).toBe('Ceres');
    const vesta = w.asteroids.find(a => a.name === 'Vesta');
    expect(vesta.massInCeres).toBeCloseTo(vesta.mass / w.asteroids[0].mass, 0);
    expect(w.comets).toHaveLength(10);
    const halley = w.comets[0];
    expect(halley.name).toBe('Halley');
    expect(Math.hypot(halley.pos.x, halley.pos.y)).toBeCloseTo(
      ((0.586 + 35.1) / 2) * 100,
      9
    );
  });

  test('the asteroid switch and the counts are honored, and a missing Sun is made', () => {
    expect(world({ enable_asteroids: false }).asteroids).toHaveLength(0);
    expect(world({ num_comets: 0 }).comets).toHaveLength(0);
    expect(world({ num_asteroids: 3 }).asteroids).toHaveLength(3);
    expect(world({ num_asteroids: 40 }).asteroids).toHaveLength(16);
    expect(world({ num_comets: 40 }).comets).toHaveLength(12);
    expect(world({ num_stars: 0 }).stars).toHaveLength(1);
  });
});

describe('slice 6: the validator for the new system name', () => {
  const why = g => validateGeometry(g).map(p => `${p.path}: ${p.why}`);
  test('solar-system is a published system; an unknown one is named as wrong', () => {
    expect(
      why({
        steps: [
          {
            rule: {
              name: 'published-system',
              params: { system: 'solar-system' },
            },
          },
        ],
      })
    ).toEqual([]);
    expect(
      why({
        steps: [
          {
            rule: { name: 'published-system', params: { system: 'sol-3' } },
          },
        ],
      })[0]
    ).toMatch(/system/);
    expect(GEOMETRY_RULES['published-system'].system).toContain('solar-system');
  });
});
