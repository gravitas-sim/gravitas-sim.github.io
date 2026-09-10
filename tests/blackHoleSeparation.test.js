// =============================================================================
// The drawing cannot reach the model
// -----------------------------------------------------------------------------
// This file exists because it used not to be true, in three separate ways, and
// each of them is one test below.
//
//   1. Turning the accretion disk ON created thirty to sixty PhysicsObjects
//      per black hole, in the constructor. Each drew several values from
//      Math.random(), which js/rng.js patches to the seeded generator while a
//      world is being built - so a *display* setting changed the bodies a seed
//      produced, and two people sharing a seed saw different worlds if one of
//      them had the disk switched off.
//
//   2. Those objects added their mass to the black hole when they fell in. The
//      quality tier set how many there were, so the tier set how fast a black
//      hole grew.
//
//   3. A merger spawned up to two hundred and twenty more, so two black holes
//      merging in vacuum produced a flare and a mass gain, both of which came
//      from the renderer.
//
// Real accretion is untouched and has its own test at the bottom: a modelled
// body falling into a black hole still transfers its mass, through
// handle_collisions, which is the only path that ever should have.
// =============================================================================

import { describe, test, expect, beforeEach } from '@jest/globals';
import { BlackHole, Planet, updatePhysicsSettings } from '../js/physics.js';
import { ENVIRONMENT } from '../js/blackHole/appearance.js';

/** Count how many values a function draws from the seeded stream. */
function draws(fn) {
  let n = 0;
  const real = Math.random;
  Math.random = () => {
    n++;
    return real();
  };
  try {
    fn();
  } finally {
    Math.random = real;
  }
  return n;
}

describe('a display setting cannot change the world', () => {
  test('how much a black hole draws does not depend on any display setting', () => {
    // The invariant that matters. A black hole still draws from the stream to
    // pick its name, which is a property of the world and belongs there; what
    // must never happen is the *count* changing with a rendering choice,
    // because everything placed after it then moves.
    const build = () => draws(() => new BlackHole({ x: 0, y: 0 }, 10));
    const counts = new Set();
    for (const on of [true, false]) {
      for (const jets of [true, false]) {
        updatePhysicsSettings({
          show_accretion_disk: on,
          show_bh_jets: jets,
          realistic_disk_physics: on,
        });
        // Twice each, because the first call of a run can warm a name pool.
        build();
        counts.add(build());
      }
    }
    expect(counts.size).toBe(1);
  });

  test('and building one costs at most a name', () => {
    // Thirty to sixty tracers used to be created here, each drawing several
    // values. One draw is a name; anything in the dozens is the old behaviour
    // come back.
    updatePhysicsSettings({ show_accretion_disk: true, show_bh_jets: true });
    new BlackHole({ x: 0, y: 0 }, 10);
    expect(draws(() => new BlackHole({ x: 0, y: 0 }, 10))).toBeLessThanOrEqual(
      2
    );
  });

  // "Two seeded worlds agree whatever the disk setting is" is the claim these
  // two tests exist to support, and it is checked where a world can actually
  // be built: e2e/blackHole.spec.js loads one scenario twice under one seed
  // with the disk on and off and compares the bodies. A unit test cannot build
  // a world - nothing here has a rendering context - and a unit test that
  // pretended to would be checking its own stub.
});

describe('decoration cannot add mass', () => {
  test('a black hole built with a disk weighs what it was told to weigh', () => {
    const bh = new BlackHole({ x: 0, y: 0 }, 12345);
    expect(bh.mass).toBe(12345);
  });

  test('and its radius follows only its mass', () => {
    const a = new BlackHole({ x: 0, y: 0 }, 100);
    const b = new BlackHole({ x: 0, y: 0 }, 100);
    b.setAppearance({ environment: ENVIRONMENT.JET, inclinationDeg: 12 });
    expect(b.radius).toBe(a.radius);
    expect(b.mass).toBe(a.mass);
  });

  test('nothing creates decorative tracers any more', () => {
    const bh = new BlackHole({ x: 0, y: 0 }, 500);
    expect(bh.disk_particles).toEqual([]);
    expect(typeof bh.generateInitialDiskParticles).toBe('undefined');
    expect(typeof bh.generateEnhancedMergerParticle).toBe('undefined');
  });
});

describe('changing the appearance changes nothing else', () => {
  let bh;
  beforeEach(() => {
    bh = new BlackHole({ x: 3, y: -4 }, 250, { x: 1, y: 2 });
  });

  test('mass, position, velocity and radius are untouched', () => {
    const before = {
      mass: bh.mass,
      radius: bh.radius,
      pos: { ...bh.pos },
      vel: { ...bh.vel },
    };
    for (const inc of [0, 45, 90]) {
      for (const env of Object.values(ENVIRONMENT)) {
        bh.setAppearance({ inclinationDeg: inc, environment: env });
      }
    }
    expect(bh.mass).toBe(before.mass);
    expect(bh.radius).toBe(before.radius);
    expect(bh.pos).toEqual(before.pos);
    expect(bh.vel).toEqual(before.vel);
  });

  test('it draws nothing from the generator either', () => {
    expect(
      draws(() => bh.setAppearance({ inclinationDeg: 33, environment: 'jet' }))
    ).toBe(0);
  });
});

describe('the appearance survives a round trip', () => {
  test('through get_state and set_state', () => {
    const bh = new BlackHole({ x: 0, y: 0 }, 700);
    bh.setAppearance({
      environment: ENVIRONMENT.JET,
      inclinationDeg: 31,
      positionAngleDeg: 200,
      spin: -1,
      jetStrength: 0.4,
    });
    const restored = new BlackHole({ x: 0, y: 0 }, 1);
    restored.set_state(bh.get_state());
    expect(restored.appearance).toEqual(bh.appearance);
  });

  test('a state with no appearance restores a stable one, not a new one', () => {
    const bh = new BlackHole({ x: 0, y: 0 }, 700);
    const state = bh.get_state();
    delete state.appearance;
    delete state.jet_orientation;
    const one = new BlackHole({ x: 0, y: 0 }, 1);
    const two = new BlackHole({ x: 0, y: 0 }, 1);
    one.set_state({ ...state });
    two.set_state({ ...state });
    expect(one.appearance).toEqual(two.appearance);
    // An old state says nothing about the environment, so it does not get one.
    expect(one.appearance.environment).toBe(ENVIRONMENT.QUIESCENT);
  });

  test("an older state's explicit jet angle becomes the disk's position angle", () => {
    const state = new BlackHole({ x: 0, y: 0 }, 700).get_state();
    delete state.appearance;
    state.jet_orientation = Math.PI / 2;
    const bh = new BlackHole({ x: 0, y: 0 }, 1);
    bh.set_state(state);
    // Ninety degrees for the stored angle, plus the ninety that turns a jet
    // direction into the disk normal it now comes out along.
    expect(bh.appearance.positionAngleDeg).toBeCloseTo(180, 6);
    expect(bh.jet_orientation).toBeCloseTo(Math.PI / 2, 9);
  });
});

describe('real accretion still works', () => {
  test('a modelled body falling into a black hole transfers its mass', () => {
    // check_absorption into absorb_into_black_hole: the path that always
    // should have been the only one. Nothing decorative is involved.
    const bh = new BlackHole({ x: 0, y: 0 }, 1000);
    const before = bh.mass;
    const planet = new Planet({ x: 1, y: 0 }, { x: 0, y: 0 }, 25);
    const eaten = planet.mass;
    expect(eaten).toBeGreaterThan(0);
    expect(planet.check_absorption([bh])).toBe(true);
    expect(bh.mass).toBeCloseTo(before + eaten, 6);
    expect(planet.alive).toBe(false);
  });

  // What absorption does to the hole's momentum is an older question with its
  // own switch - absorptionMovesHole - and its own tests. It is untouched by
  // this pass and is deliberately not re-asserted here.

  test('the black hole grows to match its new mass', () => {
    const bh = new BlackHole({ x: 0, y: 0 }, 1000);
    const r0 = bh.radius;
    new Planet({ x: 1, y: 0 }, { x: 0, y: 0 }, 40000).check_absorption([bh]);
    expect(bh.radius).toBeGreaterThan(r0);
  });
});
