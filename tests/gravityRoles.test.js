// What pulls on what (docs/gravity-roles.md). The relation `gravityRoles` and
// the per-body test `canMoveNow` (js/engine/state.js) are the engine's rule;
// this file holds the engine to them by experiment. For every ordered pair of
// the nine kinds, under each of the four mutual and star-only combinations and
// with Static and Orbiting holes, two bodies at rest 100 apart take one step,
// and a velocity changes exactly where the relation says. Momentum is required
// only of a pair that pulls both ways; of a one-way pair the source must not
// move and the target's change must be G M dt / r^2.
import { describe, test, expect, beforeEach } from '@jest/globals';
import * as physics from '../js/physics.js';
import {
  gravityRoles,
  canMoveNow,
  oneWayPairs,
  sourceLists,
} from '../js/engine/state.js';
import { sceneRoles, bodyRoles, LIST_KIND } from '../js/engine/sources.js';

const R = 100;
const DT_STEP = 1e-4;
const G = 1;

// The nine kinds of the relation and how to make one at rest.
const MAKE = {
  BlackHole: p => new physics.BlackHole(p, 1000, { x: 0, y: 0 }, false),
  StarObject: p => new physics.StarObject(p, { x: 0, y: 0 }, 1),
  NeutronStar: p => new physics.NeutronStar(p, { x: 0, y: 0 }, 1.4, false),
  WhiteDwarf: p => new physics.WhiteDwarf(p, { x: 0, y: 0 }, 0.6),
  Galaxy: p => new physics.Galaxy(p, { x: 0, y: 0 }, 1000),
  GasGiant: p => new physics.GasGiant(p, { x: 0, y: 0 }, 1),
  Planet: p => new physics.Planet(p, { x: 0, y: 0 }, 1),
  Asteroid: p => new physics.Asteroid(p, { x: 0, y: 0 }, 1),
  Comet: p => new physics.Comet(p, { x: 0, y: 0 }, 1),
};
const KINDS = Object.keys(MAKE);
const LIST_OF = Object.fromEntries(
  Object.entries(LIST_KIND).map(([list, kind]) => [kind, list])
);
const COMBOS = [
  { mutual_gravity: true, star_only_gravity: false },
  { mutual_gravity: false, star_only_gravity: false },
  { mutual_gravity: true, star_only_gravity: true },
  { mutual_gravity: false, star_only_gravity: true },
];

// Read afresh each call: physics.js reassigns its lists.
const lists = () => [
  physics.bh_list,
  physics.planets,
  physics.stars,
  physics.gas_giants,
  physics.asteroids,
  physics.comets,
  physics.debris,
  physics.particles,
  physics.neutron_stars,
  physics.white_dwarfs,
  physics.galaxies,
];

const clearWorld = () => {
  for (const l of lists()) l.length = 0;
  physics.resetPhysicsObjectCounter();
  physics.bumpWorldGeneration();
};

/** One body of a kind at x, placed in its engine list, nothing else acting. */
const place = (kind, x) => {
  const b = MAKE[kind]({ x, y: 0 });
  b.vel = { x: 0, y: 0 };
  b.persistent = true;
  b.intact = true;
  physics[LIST_OF[kind]].push(b);
  return b;
};

const BASE = {
  gravitational_constant: G,
  mutual_gravity: true,
  star_only_gravity: false,
  bh_behavior: 'Orbiting',
  enable_star_merging: false,
  dynamic_object_properties: false,
  use_barnes_hut: false,
  orbit_decay_rate: 0,
  dark_matter_halo: false,
  galaxy_gravity: 'newtonian',
  max_timestep: 0,
  min_interaction_distance: 1e-6,
  integrator: 'Symplectic Euler',
};

beforeEach(() => {
  physics.setStateReference({
    frame_count: 0,
    zoom: 1,
    pan: { x: 0, y: 0 },
    frameOffset: { x: 0, y: 0 },
    paused: false,
  });
  physics.updatePhysicsSettings(BASE);
  clearWorld();
  physics.resetSimulationTime();
});

const cases = [];
for (const combo of COMBOS)
  for (const bh_behavior of ['Static', 'Orbiting'])
    for (const a of KINDS)
      for (const b of KINDS) cases.push({ combo, bh_behavior, a, b });

describe('the engine moves a body exactly where the relation says', () => {
  test.each(cases)(
    '$a then $b, mutual $combo.mutual_gravity, star-only $combo.star_only_gravity, $bh_behavior',
    ({ combo, bh_behavior, a, b }) => {
      const s = { ...BASE, ...combo, bh_behavior };
      physics.updatePhysicsSettings(s);
      const A = place(a, 0);
      const B = place(b, R);
      physics.updatePhysics(DT_STEP);

      const { pulls } = gravityRoles(physics.physicsSettings);
      const bMoves = pulls(a, b) && canMoveNow(B);
      const aMoves = pulls(b, a) && canMoveNow(A);
      const kick = m => (G * m * DT_STEP) / R ** 2;

      if (bMoves) expect(B.vel.x).toBeCloseTo(-kick(A.mass), 15);
      else expect(B.vel.x).toBe(0);
      if (aMoves) expect(A.vel.x).toBeCloseTo(kick(B.mass), 15);
      else expect(A.vel.x).toBe(0);
      expect(A.vel.y).toBe(0);
      expect(B.vel.y).toBe(0);

      if (bMoves && aMoves) {
        // Reciprocal: momentum is conserved to rounding.
        const p = A.mass * A.vel.x + B.mass * B.vel.x;
        const scale = A.mass * Math.abs(A.vel.x) + B.mass * Math.abs(B.vel.x);
        expect(Math.abs(p)).toBeLessThanOrEqual(1e-12 * scale);
      } else if (bMoves) {
        // One way: the change is the source's pull alone, to rounding.
        expect(Math.abs(B.vel.x + kick(A.mass)) / kick(A.mass)).toBeLessThan(
          1e-12
        );
      }
    }
  );
});

describe('the relation', () => {
  test('a hole is pulled by holes only, and pulls every kind', () => {
    for (const combo of COMBOS) {
      const { pulls } = gravityRoles(combo);
      for (const k of KINDS) {
        expect(pulls(k, 'BlackHole')).toBe(k === 'BlackHole');
        expect(pulls('BlackHole', k)).toBe(true);
      }
    }
  });

  test('comets never pull; planets and asteroids only with mutual gravity and not star-only', () => {
    for (const combo of COMBOS) {
      const { pulls } = gravityRoles(combo);
      const small = combo.mutual_gravity && !combo.star_only_gravity;
      expect(pulls('Comet', 'StarObject')).toBe(false);
      expect(pulls('Planet', 'StarObject')).toBe(small);
      expect(pulls('Asteroid', 'Planet')).toBe(small);
      expect(pulls('GasGiant', 'Planet')).toBe(!combo.star_only_gravity);
      expect(pulls('StarObject', 'Galaxy')).toBe(true);
    }
  });

  test('the step sums the lists the relation names, in the same order as before', () => {
    expect(sourceLists({ mutual_gravity: true })).toEqual([
      'bh_list',
      'stars',
      'galaxies',
      'gas_giants',
      'neutron_stars',
      'white_dwarfs',
      'planets',
      'asteroids',
    ]);
    expect(sourceLists({ mutual_gravity: false })).toEqual([
      'bh_list',
      'stars',
      'galaxies',
      'gas_giants',
      'neutron_stars',
      'white_dwarfs',
    ]);
    expect(
      sourceLists({ mutual_gravity: true, star_only_gravity: true })
    ).toEqual(['bh_list', 'stars', 'galaxies']);
  });

  test('one-way pairs: a hole beside a star with mutual gravity on; none among stars alone', () => {
    const on = { mutual_gravity: true };
    expect(oneWayPairs(['BlackHole', 'StarObject'], on)).toEqual([
      ['BlackHole', 'StarObject'],
    ]);
    expect(
      oneWayPairs(['StarObject', 'Galaxy'], { mutual_gravity: false })
    ).toEqual([]);
    expect(
      oneWayPairs(['StarObject', 'Planet'], { mutual_gravity: false })
    ).toEqual([['StarObject', 'Planet']]);
  });

  test('a model-owned body is pulled by nothing the engine applies and still pulls', () => {
    physics.updatePhysicsSettings({ ...BASE, mutual_gravity: true });
    const A = place('StarObject', 0);
    const B = place('Planet', R);
    B.model_owned = true;
    expect(canMoveNow(B)).toBe(false);
    physics.updatePhysics(DT_STEP);
    expect(B.vel.x).toBe(0);
    // The star still feels the planet: a model-owned body stays a source.
    expect(A.vel.x).toBeCloseTo((G * B.mass * DT_STEP) / R ** 2, 15);
  });
});

describe('a Static hole keeps moving through its grace period', () => {
  test('a fresh hole and an old one at rest 100 apart, one step of 0.0001', () => {
    physics.updatePhysicsSettings({ ...BASE, bh_behavior: 'Static' });
    const fresh = new physics.BlackHole(
      { x: 0, y: 0 },
      1000,
      { x: 0, y: 0 },
      true
    );
    const old = new physics.BlackHole(
      { x: R, y: 0 },
      1000,
      { x: 0, y: 0 },
      false
    );
    physics.bh_list.push(fresh, old);
    expect(canMoveNow(fresh)).toBe(true);
    expect(canMoveNow(old)).toBe(false);
    physics.updatePhysics(1e-4);
    expect(fresh.vel.x).toBeCloseTo(1e-5, 17);
    expect(old.vel.x).toBe(0);
    expect(old.vel.y).toBe(0);
  });

  test('a hole whose grace has run out does not move; until then it does', () => {
    physics.updatePhysicsSettings({ ...BASE, bh_behavior: 'Static' });
    const merged = new physics.BlackHole(
      { x: 0, y: 0 },
      1000,
      { x: 1, y: 0 },
      true
    );
    physics.bh_list.push(merged);
    expect(canMoveNow(merged)).toBe(true);
    merged.graceUsed = merged.movementGracePeriod;
    expect(canMoveNow(merged)).toBe(false);
    const x = merged.pos.x;
    physics.updatePhysics(0.1);
    expect(merged.pos.x).toBe(x);
  });

  test('a merger product moves until its grace has run out', () => {
    physics.updatePhysicsSettings({ ...BASE, bh_behavior: 'Static' });
    const product = new physics.BlackHole(
      { x: 0, y: 0 },
      1000,
      { x: 1, y: 0 },
      true
    );
    physics.bh_list.push(product);
    let steps = 0;
    while (canMoveNow(product) && steps < 1e5) {
      const x = product.pos.x;
      physics.updatePhysics(0.1);
      expect(product.pos.x).toBeGreaterThan(x);
      steps++;
    }
    expect(canMoveNow(product)).toBe(false);
    const x = product.pos.x;
    physics.updatePhysics(0.1);
    expect(product.pos.x).toBe(x);
  });
});

describe('the statement reads the same relation', () => {
  test('sceneRoles names the one-way pairs present and the two hole rules', () => {
    const counts = { bh_list: 1, stars: 2, planets: 3 };
    const r = sceneRoles(counts, {
      mutual_gravity: false,
      bh_behavior: 'Static',
    });
    expect(r.pulling.map(x => x.list)).toEqual(['bh_list', 'stars']);
    expect(r.feeling.map(x => x.list)).toEqual(['planets']);
    expect(r.oneWay).toEqual([
      ['bh_list', 'stars'],
      ['bh_list', 'planets'],
      ['stars', 'planets'],
    ]);
    expect(r.holesFeelOnlyHoles).toBe(true);
    expect(r.staticHoles).toBe(true);
  });

  test('bodyRoles: a planet among stars, with and without mutual gravity', () => {
    const counts = { stars: 1, planets: 2 };
    const planet = { kind: 'Planet' };
    expect(bodyRoles(planet, counts, { mutual_gravity: true })).toEqual({
      pulledBy: ['stars', 'planets'],
      pulls: ['stars', 'planets'],
      moves: true,
    });
    expect(bodyRoles(planet, counts, { mutual_gravity: false })).toEqual({
      pulledBy: ['stars'],
      pulls: [],
      moves: true,
    });
    // Alone of its kind: no other planet to pull or be pulled by.
    expect(
      bodyRoles(planet, { stars: 1, planets: 1 }, { mutual_gravity: true })
    ).toEqual({ pulledBy: ['stars'], pulls: ['stars'], moves: true });
  });
});
