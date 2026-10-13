// =============================================================================
// Declarative scenario geometry, slice 4 (Roadmap II Prompt 108)
// -----------------------------------------------------------------------------
// Nine more scenarios are declared in ENGINE_GEOMETRY (js/world/build.js): the
// two galaxy discs and the cluster (`tracer-disc`, `bound-cluster`), three
// systems of generated bodies on circular orbits (`circular-binary-stars`,
// `orbital-population`, and Kuiper belt as a published system), a tidal
// disruption (`tidal-infall`), black hole billiards (`staggered-orbits`) and
// GW150914 (`inspiral-pair`). This holds them to the world the hand-built
// blocks made:
//
//   1. Every field of every body, the settings, the camera and the seeded
//      generator's next draw are the code's, at seven seeds
//      (tests/fixtures/scenarioGeometrySlice4Golden.json) and under 220 share
//      link cases: every population count at 0 and 3, the settings the
//      arithmetic reads, every layout the Settings panel offers
//      (tests/fixtures/scenarioGeometrySlice4EdgeGolden.json). Both were
//      captured from the code before it was deleted.
//   2. Everything here is random in its own way, and a world is the same only
//      if the draws come in the same order: a rule that makes bodies is a
//      generator, so each body is made (its constructor draws a name) before
//      the next body's draws. The count of draws, and the next number the
//      generator returns, are pinned.
//   3. The arithmetic is the textbook's, checked against closed forms and not
//      only against the code it replaced.
//   4. Each rule has a validator that names the field it refuses.
// =============================================================================

import { readFileSync } from 'node:fs';
import { DEFAULT_SETTINGS } from '../js/appState.js';
import { haloEnclosedMass } from '../js/darkMatter.js';
import * as physics from '../js/physics.js';
import { SCENARIO_PRESETS, SCENARIO_GEOMETRY } from '../js/scenarios.js';
import { ENGINE_GEOMETRY } from '../js/world/build.js';
import { GEOMETRY_RULES, validateGeometry } from '../js/scenarioPack.js';
import { digest } from './scenarioDigest.js';
import {
  SLICE4_COUNTS,
  SLICE4_EDGE_IDS,
  SLICE4_PLACEMENTS,
  SLICE4_SCENARIOS,
  worldKey,
} from './scenarioSlice4Cases.js';

const read = name => JSON.parse(readFileSync(`tests/fixtures/${name}`, 'utf8'));
const GOLDEN = read('scenarioGeometrySlice4Golden.json');
const EDGE = read('scenarioGeometrySlice4EdgeGolden.json');
const SUN = physics.SOLAR_MASS_UNIT;

describe('slice 4: the nine declared scenarios build the world the code built', () => {
  test('they are declared in the engine, and nowhere a pack could carry them', () => {
    for (const key of SLICE4_SCENARIOS) {
      expect(ENGINE_GEOMETRY[key]).toBeTruthy();
      expect(SCENARIO_GEOMETRY[key]).toBeUndefined();
      expect(validateGeometry(ENGINE_GEOMETRY[key])).toEqual([]);
      // Rules are the engine's: a pack that wants one names the built-in.
      expect(
        validateGeometry(ENGINE_GEOMETRY[key], { rules: false }).length
      ).toBeGreaterThan(0);
    }
  });

  test('the fixture covers every scenario at seven seeds', () => {
    expect(Object.keys(GOLDEN).length).toBe(SLICE4_SCENARIOS.length * 7);
    for (const key of SLICE4_SCENARIOS)
      expect(
        Object.keys(GOLDEN).filter(id => id.startsWith(`${key}@`)).length
      ).toBe(7);
  });

  test.each(Object.keys(GOLDEN))(
    '%s: every field of every body, the settings, the camera and the generator',
    id => {
      const [key, seed] = id.split('@');
      expect(worldKey(digest(key, Number(seed)))).toEqual(GOLDEN[id]);
    }
  );

  test('the draws are the code’s: the same number of them, and the same next one', () => {
    // Counted with a getter on Math.random, which sees the seeded generator
    // withSeed() installs. The counts are the hand-built blocks' own.
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
      'spiral-galaxy': [182, 203],
      'milky-way-rotation': [182, 203],
      'coma-cluster': [121, 142],
      'binary-star-system': [88, 36],
      'rogue-encounter': [291, 34],
      'kuiper-belt': [358, 43],
      'tidal-disruption-event': [5, 24],
      'black-hole-billiards': [297, 101],
      gw150914: [3, 21],
    };
    for (const [key, [plain, three]] of Object.entries(DRAWS)) {
      expect([key, count(() => digest(key, 1))]).toEqual([key, plain]);
      expect([key, count(() => digest(key, 1, plus3))]).toEqual([key, three]);
    }
    // The generator's next number after the build is part of every row above
    // (`tail`); name it for the one place a count could hide a reordering.
    for (const id of Object.keys(GOLDEN))
      expect(typeof GOLDEN[id].tail).toBe('number');
  });

  test('the cases cover every scenario: each count at 0 and 3, every layout', () => {
    expect(Object.keys(EDGE).sort()).toEqual([...SLICE4_EDGE_IDS].sort());
    for (const key of SLICE4_SCENARIOS) {
      const ids = SLICE4_EDGE_IDS.filter(id => id.startsWith(`${key}@`));
      for (const p of SLICE4_COUNTS)
        for (const n of [0, 3]) expect(ids).toContain(`${key}@{"${p}":${n}}`);
      for (const l of SLICE4_PLACEMENTS)
        expect(ids).toContain(`${key}@{"placement":"${l}"}`);
    }
  });

  test.each(SLICE4_EDGE_IDS)('%s is the world the code made', id => {
    const at = id.indexOf('@');
    const d = digest(id.slice(0, at), 1, JSON.parse(id.slice(at + 1)));
    expect(worldKey(d)).toEqual(EDGE[id]);
  });
});

describe('slice 4: the validator, rule by rule', () => {
  const why = (g, opts) =>
    validateGeometry(g, opts).map(p => `${p.path}: ${p.why}`);
  const rule = (name, params) => ({ steps: [{ rule: { name, params } }] });
  const params = name =>
    Object.values(ENGINE_GEOMETRY)
      .flatMap(g => g.steps)
      .find(s => s.rule?.name === name).rule.params;
  const NEW_RULES = [
    'tracer-disc',
    'bound-cluster',
    'orbital-population',
    'inspiral-pair',
    'staggered-orbits',
    'tidal-infall',
    'circular-binary-stars',
  ];

  test('each rule needs each parameter it does not mark optional, by name, and nothing else', () => {
    for (const name of NEW_RULES) {
      const spec = GEOMETRY_RULES[name];
      const p = params(name);
      expect(why(rule(name, p))).toEqual([]);
      for (const k of Object.keys(spec)) {
        if (spec[k].optional) continue;
        const { [k]: _gone, ...rest } = p;
        expect(why(rule(name, rest)).join()).toMatch(
          new RegExp(`params.${k}\\b`)
        );
      }
      expect(why(rule(name, { ...p, extra: 1 }))[0]).toMatch(/extra/);
      expect(why(rule(name, p), { rules: false })[0]).toMatch(
        /may not use a named rule/
      );
    }
  });

  test('optional parameters may be left out, and are checked when given', () => {
    expect(
      why(rule('orbital-population', { centralStars: 1, planetInner: 50 }))
    ).toEqual([]);
    expect(
      why(rule('orbital-population', { centralStars: 1, planetInner: -1 }))[0]
    ).toMatch(/planetInner/);
    const p = params('orbital-population');
    expect(
      why(rule('orbital-population', { ...p, asteroidNames: ['a'] }))[0]
    ).toMatch(/asteroidNames.*a list of 12/);
  });

  test('a count is a whole number from 1 to 1000; a curve is one of two', () => {
    const t = params('tracer-disc');
    for (const bad of [0, 1.5, 1001, '90'])
      expect(why(rule('tracer-disc', { ...t, count: bad }))[0]).toMatch(
        /count.*whole number from 1 to 1000/
      );
    expect(why(rule('tracer-disc', { ...t, curve: 'falling' }))[0]).toMatch(
      /one of keplerian, flat/
    );
    expect(why(rule('tracer-disc', { ...t, bulgeColor: 'gold' }))[0]).toMatch(
      /bulgeColor.*color/
    );
    expect(
      why(
        rule('circular-binary-stars', { massesSuns: [1], separation: 120 })
      )[0]
    ).toMatch(/a list of 2/);
    expect(
      why(
        rule('circular-binary-stars', { massesSuns: [1, -2], separation: 1 })
      )[0]
    ).toMatch(/massesSuns\[1\]/);
  });

  test('the Kuiper belt is a published system, and only that one takes no more', () => {
    expect(why(rule('published-system', { system: 'kuiper-belt' }))).toEqual(
      []
    );
    expect(
      why(rule('published-system', { system: 'kuiper-belt', detuned: true }))[0]
    ).toMatch(/only the Galilean/);
  });

  test('from.keepName is true or false, and a pack may not reuse a generated body at all', () => {
    const hole = keepName => ({
      steps: [
        {
          body: {
            type: 'BlackHole',
            name: 'Hole',
            from: { generated: 0, keepName },
          },
        },
      ],
    });
    expect(why(hole(true))).toEqual([]);
    expect(why(hole(undefined))).toEqual([]);
    expect(why(hole('yes'))[0]).toMatch(/keepName.*true or false/);
    expect(why(hole(true), { rules: false })[0]).toMatch(
      /reused from the generator/
    );
  });
});

describe('slice 4: the worlds against their closed forms', () => {
  const G = key =>
    SCENARIO_PRESETS[key].gravitational_constant ??
    DEFAULT_SETTINGS.gravitational_constant;
  const world = (key, pending = null, seed = 1) => {
    digest(key, seed, pending);
    return physics;
  };
  const radius = b => Math.hypot(b.pos.x, b.pos.y);
  const speed = b => Math.hypot(b.vel.x, b.vel.y);
  const rel = (b, c) => Math.hypot(b.vel.x - c.vel.x, b.vel.y - c.vel.y);
  const dot = b => b.pos.x * b.vel.x + b.pos.y * b.vel.y;

  test('Spiral Galaxy: each tracer at the circular speed of the visible mass inside it', () => {
    const w = world('spiral-galaxy');
    const [bulge, ...disc] = w.stars;
    expect(bulge.name).toBe('Galactic bulge');
    expect(bulge.isCentralBody).toBe(true);
    expect(bulge.mass).toBeCloseTo(12 * SUN, 9);
    expect(disc).toHaveLength(90);
    disc.forEach((s, i) => {
      const t = i / 89;
      const r = 150 * Math.pow(900 / 150, t);
      expect(s.name).toBe(`Disc star ${i + 1}`);
      expect(radius(s)).toBeCloseTo(r, 9);
      const enclosed = 12 * SUN + 90 * t * 0.03 * SUN;
      expect(speed(s)).toBeCloseTo(
        Math.sqrt((G('spiral-galaxy') * enclosed) / r),
        9
      );
      // Circular: the velocity is perpendicular to the radius.
      expect(dot(s) / (radius(s) * speed(s))).toBeCloseTo(0, 9);
    });
  });

  test('Milky Way Rotation: the same disc at one speed whatever the radius', () => {
    const w = world('milky-way-rotation');
    expect(w.stars).toHaveLength(91);
    for (const s of w.stars.slice(1)) expect(speed(s)).toBeCloseTo(11, 9);
    expect(radius(w.stars[1])).toBeCloseTo(150, 9);
    expect(radius(w.stars[90])).toBeCloseTo(900, 9);
  });

  test('Coma Cluster: 24 members, six elliptical, at a share of the speed the total mass sets', () => {
    const w = world('coma-cluster');
    expect(w.galaxies).toHaveLength(24);
    expect(w.galaxies.filter(g => g.galaxyType === 'elliptical')).toHaveLength(
      6
    );
    const preset = SCENARIO_PRESETS['coma-cluster'];
    const halo = haloEnclosedMass(
      2600,
      { vFlat: preset.halo_v_flat, coreRadius: preset.halo_core_radius },
      G('coma-cluster')
    );
    const vScale = Math.sqrt(
      (G('coma-cluster') * (24 * 4 * SUN + halo)) / 2600
    );
    for (const g of w.galaxies) {
      expect(g.mass).toBeCloseTo(4 * SUN, 9);
      expect(radius(g)).toBeLessThanOrEqual(2600);
      expect(speed(g)).toBeGreaterThanOrEqual(0.55 * vScale * (1 - 1e-12));
      expect(speed(g)).toBeLessThanOrEqual(1.05 * vScale * (1 + 1e-12));
    }
    // Nothing else is in the cluster.
    expect(w.stars.length + w.planets.length + w.bh_list.length).toBe(0);
  });

  test('Binary Star System: the pair about a stationary center, planets on a ladder', () => {
    const w = world('binary-star-system');
    expect(w.stars).toHaveLength(2);
    const [a, b] = w.stars;
    expect(a.mass).toBeCloseTo(1.2 * SUN, 9);
    expect(b.mass).toBeCloseTo(0.8 * SUN, 9);
    // 120 units apart, the lighter one the farther from the center.
    expect(b.pos.x - a.pos.x).toBeCloseTo(120, 9);
    expect(a.pos.x).toBeCloseTo(-120 * 0.4, 9);
    expect(b.pos.x).toBeCloseTo(120 * 0.6, 9);
    // Recentered: the system as a whole does not move.
    const all = [...w.stars, ...w.planets, ...w.gas_giants, ...w.asteroids];
    const p = all.reduce(
      (s, x) => [s[0] + x.mass * x.vel.x, s[1] + x.mass * x.vel.y],
      [0, 0]
    );
    expect(Math.hypot(...p) / all.reduce((s, x) => s + x.mass, 0)).toBeLessThan(
      1e-9
    );
    w.planets.forEach((x, i) => expect(radius(x)).toBeCloseTo(150 + i * 30, 9));
    w.gas_giants.forEach((x, i) =>
      expect(radius(x)).toBeCloseTo(300 + i * 50, 9)
    );
    for (const x of w.asteroids) {
      expect(radius(x)).toBeGreaterThanOrEqual(400);
      expect(radius(x)).toBeLessThanOrEqual(500);
    }
  });

  test('Rogue Encounter: circular orbits about the star, and a hole that is not recentered', () => {
    const w = world('rogue-encounter');
    const star = w.stars[0];
    const g = G('rogue-encounter');
    w.planets.forEach((x, i) => {
      const r = 50 + i * 25;
      expect(radius(x)).toBeCloseTo(r, 9);
      expect(speed(x)).toBeCloseTo(Math.sqrt((g * star.mass) / r), 9);
    });
    w.gas_giants.forEach((x, i) =>
      expect(radius(x)).toBeCloseTo(200 + i * 50, 9)
    );
    for (const x of w.asteroids) {
      expect(radius(x)).toBeGreaterThanOrEqual(350);
      expect(radius(x)).toBeLessThanOrEqual(450);
    }
    const [hole] = w.bh_list;
    expect(hole.pos).toEqual({ x: -800, y: 200 });
    expect(hole.vel).toEqual({ x: 20, y: -5 });
    // It keeps the name the generator drew; the step's own is only a handle.
    expect(hole.name).not.toBe('Rogue');
  });

  test('Kuiper Belt: eight named objects on the ladder, twelve named small bodies in the band', () => {
    const w = world('kuiper-belt');
    expect(w.stars[0].name).toBe('Sol');
    expect(w.planets.map(p => p.name)).toEqual([
      'Orcus',
      'Pluto',
      'Varuna',
      'Haumea',
      'Quaoar',
      'Makemake',
      'Eris',
      'Sedna',
    ]);
    w.planets.forEach((p, i) => {
      expect(radius(p)).toBeCloseTo(200 + i * 20, 9);
      expect(p.isKuiperBeltObject).toBe(true);
      expect(p.density).toBe('icy');
    });
    expect(w.gas_giants).toHaveLength(0);
    const named = w.asteroids.slice(0, 12);
    expect(named.map(a => a.name)[0]).toBe('Ixion');
    expect(named[11].name).toBe('2007 OR10');
    for (const a of named) {
      expect(radius(a)).toBeGreaterThanOrEqual(190);
      expect(radius(a)).toBeLessThanOrEqual(310);
    }
    // The rest of the 300 stay where the layout put them, unnamed by the rule.
    expect(w.asteroids).toHaveLength(300);
    expect(
      w.asteroids.slice(12).some(a => ['Ixion', 'Huya'].includes(a.name))
    ).toBe(false);
  });

  test('Tidal Disruption Event: periapsis inside the tidal radius, begun partway down the infall', () => {
    const w = world('tidal-disruption-event');
    const [hole] = w.bh_list;
    const [star] = w.stars;
    expect(hole.pos).toEqual({ x: 0, y: 0 });
    expect(hole.vel).toEqual({ x: 0, y: 0 });
    expect(w.stars).toHaveLength(1);
    expect(star.name).toBe('Doomed star');
    expect(star.mass).toBeCloseTo(SUN, 9);
    const GM = G('tidal-disruption-event') * hole.mass;
    const r = radius(star);
    const v2 = star.vel.x ** 2 + star.vel.y ** 2;
    const energy = v2 / 2 - GM / r;
    const h = star.pos.x * star.vel.y - star.pos.y * star.vel.x;
    const a = -GM / (2 * energy);
    const e = Math.sqrt(1 + (2 * energy * h * h) / (GM * GM));
    expect(a * (1 - e)).toBeCloseTo(1.5 * hole.radius, 6);
    expect(a * (1 + e)).toBeCloseTo(Math.max(900, 11 * hole.radius), 6);
    // Inbound: the radial speed points back towards the hole.
    expect(star.pos.x * star.vel.x + star.pos.y * star.vel.y).toBeLessThan(0);
    // Everything else the generator drew is replaced.
    expect(w.planets.length + w.gas_giants.length + w.asteroids.length).toBe(0);
  });

  test('Black Hole Billiards: the light holes circle the heavy one at staggered radii', () => {
    const w = world('black-hole-billiards');
    const [heavy, ...light] = w.bh_list;
    expect(light).toHaveLength(3);
    light.forEach((b, i) => {
      const r = heavy.radius * (3.2 + i * 1.9);
      const d = Math.hypot(b.pos.x - heavy.pos.x, b.pos.y - heavy.pos.y);
      expect(d).toBeCloseTo(r, 6);
      // The system is balanced afterwards (a uniform shift), so the speed is
      // taken relative to the heavy hole.
      expect(rel(b, heavy)).toBeCloseTo(
        Math.sqrt((G('black-hole-billiards') * heavy.mass) / r),
        9
      );
      const angle = (i / 3) * 2 * Math.PI;
      expect(Math.atan2(b.pos.y, b.pos.x)).toBeCloseTo(
        Math.atan2(Math.sin(angle), Math.cos(angle)),
        9
      );
    });
  });

  test('GW150914: the pair about their center of mass, at 0.92 of the circular speed', () => {
    const w = world('gw150914');
    const [a, b] = w.bh_list;
    expect(b.pos.x - a.pos.x).toBeCloseTo(90, 9);
    expect(
      (a.mass * a.pos.x + b.mass * b.pos.x) / (a.mass + b.mass)
    ).toBeCloseTo(0, 9);
    const circular = Math.sqrt((G('gw150914') * (a.mass + b.mass)) / 90);
    expect(rel(a, b)).toBeCloseTo(0.92 * circular, 9);
    // Balanced afterwards: no net momentum.
    expect(
      Math.hypot(
        a.mass * a.vel.x + b.mass * b.vel.x,
        a.mass * a.vel.y + b.mass * b.vel.y
      )
    ).toBeLessThan(1e-9);
  });
});

describe('slice 4: what a link or the Settings panel can still do to them', () => {
  test('a link with fewer black holes than the scenario places leaves the rest alone', () => {
    // One hole: nothing is moved (the code required two), and for the tidal
    // disruption no star is made without a hole.
    const w = (key, pending) => {
      digest(key, 1, pending);
      return physics;
    };
    const one = w('gw150914', { num_black_holes: 1 });
    expect(one.bh_list).toHaveLength(1);
    const tde = w('tidal-disruption-event', { num_black_holes: 0 });
    expect(tde.stars).toHaveLength(0);
    expect(tde.bh_list).toHaveLength(0);
  });

  test('the layout a reader picks in Settings still runs the generic placement, as before', () => {
    // The tidal disruption's old code moved a hole and a planet inside the
    // generic placement when it ran (it is unreachable at the scenario's own
    // layout, Empty). That code stays, so the world under any other layout is
    // the code's: the cases above hold it, and this names the two that moved
    // when it was removed.
    for (const id of [
      'tidal-disruption-event@{"placement":"Circular","num_planets":2,"num_white_dwarfs":3}',
      'tidal-disruption-event@{"placement":"Random","num_planets":5,"num_neutron_stars":1}',
    ])
      expect(SLICE4_EDGE_IDS).toContain(id);
  });
});
