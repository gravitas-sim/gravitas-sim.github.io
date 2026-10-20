// =============================================================================
// The engine's conservation and energy module (D-DECOMP-18, slice S3)
// -----------------------------------------------------------------------------
// js/engine/conservation.js owns the absorption ledgers, the live drift
// diagnostics and the energy history; js/physics.js re-exports them. What has to
// hold is that every number is the one the engine gave before the move.
// tests/fixtures/engineConservationGolden.json was recorded on the commit before
// the move from tools/conservation-trace.mjs (six scenarios, seeded, the clocks
// pinned, every number rounded to 12 significant figures): the conserved totals,
// the drift, the ledgers, the energy of the first bodies and a hash of every
// energy history, at the start and at each sample. The unit tests below assert
// absolute values worked out by hand, because a ratio against the old code would
// divide a uniform error out.
// =============================================================================

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import * as physics from '../js/physics.js';
import * as conservation from '../js/engine/conservation.js';
import * as engineState from '../js/engine/state.js';
import { AU_METERS, G_SI } from '../js/constants.js';
import { absorb_into_star } from '../js/engine/bodies.js';
import { OUTCOMES } from '../js/validation/engineTolerances.js';

const golden = JSON.parse(
  readFileSync(
    new URL('./fixtures/engineConservationGolden.json', import.meta.url),
    'utf8'
  )
);

const run = args =>
  execFileSync(
    process.execPath,
    [
      new URL('../tools/conservation-trace.mjs', import.meta.url).pathname,
    ].concat(args),
    { maxBuffer: 1 << 28, encoding: 'utf8' }
  );

describe('the numbers are the ones the engine gave before the move', () => {
  for (const id of Object.keys(golden)) {
    test(`${id}: totals, drift, ledgers, energies and histories`, () => {
      const text = run(golden[id].args);
      expect(JSON.parse(text).samples).toEqual(golden[id].samples);
      expect(createHash('sha256').update(text).digest('hex')).toBe(
        golden[id].sha256
      );
    }, 120000);
  }

  test('the goldens hold absolute values, not only agreement', () => {
    const graveyard = golden['stellar-graveyard:5'].samples;
    expect(graveyard[0].totals.energy).toBe('-6517309.37878');
    expect(graveyard[0].totals.angular).toBe('-6505987.4472');
    expect(graveyard[0].drift.energyDrift).toBe('0');
    // Re-recorded for D-R10-23: it was -0.000393366119608 when only a hole
    // banked spin; a star that absorbs a small body now banks its share too.
    expect(graveyard[1].spin).toBe('-0.000303633314114');
    expect(graveyard[1].discarded.x).toBe('9.59581497618');
    // A moving hole banks spin, a fixed one discards momentum: both occur.
    expect(Number(graveyard[4].spin)).not.toBe(0);
    expect(
      Number(golden['black-hole-billiards:3'].samples[4].discarded.y)
    ).toBeGreaterThan(0.8);
    expect(
      Number(golden['galactic-collision:1'].samples[2].spin)
    ).toBeGreaterThan(40);
    expect(golden['binary-bh:4:RK4'].samples[4].drift.integrator).toBe('RK4');
  });
});

describe('the facade re-exports the module', () => {
  test('every moved name is the module own binding', () => {
    for (const name of Object.keys(conservation)) {
      if (name in physics) expect(physics[name]).toBe(conservation[name]);
    }
    for (const name of [
      'conservedQuantities',
      'conservationDrift',
      'resetConservationBaseline',
      'conservationCaveats',
      'getAbsorbedSpinAngularMomentum',
      'getDiscardedAbsorptionMomentum',
      'resetAbsorptionAccounting',
      'calculateKineticEnergy',
      'calculateGravitationalPotentialEnergy',
      'calculateTotalPotentialEnergy',
      'calculateObjectEnergy',
      'getAllPhysicsObjects',
      'updateEnergyHistory',
      'getObjectEnergyHistory',
      'clearObjectEnergyHistory',
      'clearEnergyHistory',
      'clearAllEnergyHistory',
      'getObjectEnergyStats',
      'getEnergySystemMemoryStats',
      'trimAllEnergyHistory',
      'updateEnergySystemConfig',
    ])
      expect(physics[name]).toBe(conservation[name]);
  });

  test('the settings readers the module needs are the state module own', () => {
    for (const name of [
      'MIN_INTERACTION_DISTANCE',
      'minInteractionDistance',
      'MASS_UNIT_KG',
      'INTEGRATORS',
      'activeIntegrator',
    ])
      expect(physics[name]).toBe(engineState[name]);
  });
});

const body = (id, mass, x, y, vx, vy) => ({
  id,
  mass,
  pos: { x, y },
  vel: { x: vx, y: vy },
  alive: true,
});

describe('conserved quantities, worked by hand', () => {
  beforeEach(() => {
    physics.setStateReference({ frame_count: 0, zoom: 1, paused: false });
    physics.updatePhysicsSettings({
      gravitational_constant: 2,
      min_interaction_distance: 0,
      integrator: 'Symplectic Euler',
      mutual_gravity: true,
      star_only_gravity: false,
      bh_behavior: 'Orbiting',
      galaxy_gravity: 'none',
      orbit_decay_rate: 0,
      enable_star_merging: false,
    });
    for (const l of ['planets', 'stars', 'bh_list', 'galaxies'])
      physics[l].length = 0;
    physics.resetAbsorptionAccounting();
    physics.clearAllEnergyHistory();
  });

  afterEach(() => {
    for (const l of ['planets', 'stars', 'bh_list', 'galaxies'])
      physics[l].length = 0;
    physics.clearAllEnergyHistory();
  });

  test('two bodies: energy 0.5 and angular momentum 6, exactly', () => {
    // KE = 1/2 * 1 * 2^2 = 2; PE = -G m1 m2 / r = -2 * 3 * 1 / 4 = -1.5.
    // The centre of mass is (1, 0); L = 1 * ((4 - 1) * 2 - 0) = 6.
    physics.planets.push(body(1, 3, 0, 0, 0, 0), body(2, 1, 4, 0, 0, 2));
    const q = physics.conservedQuantities();
    expect(q.energy).toBeCloseTo(0.5, 12);
    expect(q.angular).toBeCloseTo(6, 12);
    expect(q.count).toBe(2);
    // The scales are the sums of magnitudes: 2 + 1.5, and |6|.
    expect(q.energyScale).toBeCloseTo(3.5, 12);
    expect(q.angularScale).toBeCloseTo(6, 12);
  });

  test('dead bodies and bodies with no finite mass are left out', () => {
    physics.planets.push(
      body(1, 3, 0, 0, 0, 0),
      { ...body(2, 1, 4, 0, 0, 2), alive: false },
      body(3, NaN, 1, 1, 0, 0)
    );
    expect(physics.conservedQuantities().count).toBe(1);
  });

  test('drift: moving one body by 1 unit changes the energy by the hand value', () => {
    physics.planets.push(body(1, 3, 0, 0, 0, 0), body(2, 1, 4, 0, 0, 2));
    physics.resetConservationBaseline();
    // Baseline energy 0.5; at r = 5 the potential is -2 * 3 / 5 = -1.2, so the
    // energy is 2 - 1.2 = 0.8 and the change +0.3, a drift of +60%.
    physics.planets[1].pos.x = 5;
    const d = physics.conservationDrift(true);
    expect(d.baselineEnergy).toBeCloseTo(0.5, 12);
    expect(d.energy).toBeCloseTo(0.8, 12);
    expect(d.energyChange).toBeCloseTo(0.3, 12);
    expect(d.energyDrift).toBeCloseTo(60, 10);
    expect(d.energyConditioned).toBe(true);
    expect(d.integrator).toBe('Symplectic Euler');
    expect(d.baselineCount).toBe(2);
    expect(d.caveats).toEqual([]);
  });

  test('a baseline that is the difference of large terms prints no percentage', () => {
    // KE 2, PE -2 * 3 * 1 / 1.5 would be -4 but r = 4: use a marginally bound pair.
    physics.planets.push(
      body(1, 3, 0, 0, 0, 0),
      body(2, 1, 4, 0, 0, Math.sqrt(3))
    );
    physics.resetConservationBaseline();
    const d = physics.conservationDrift(true);
    expect(Math.abs(d.baselineEnergy)).toBeLessThan(1e-12);
    expect(d.energyConditioned).toBe(false);
    expect(Number.isNaN(d.energyDrift)).toBe(true);
  });

  test('the caveats name what breaks a law by construction', () => {
    physics.bh_list.push(body(9, 5, 0, 0, 0, 0));
    physics.bh_list.push(body(10, 5, 9, 0, 0, 0));
    physics.updatePhysicsSettings({
      bh_behavior: 'Static',
      mutual_gravity: false,
      galaxy_gravity: 'halo',
      orbit_decay_rate: 1,
      enable_star_merging: true,
    });
    expect(physics.conservationCaveats()).toEqual([
      'caveat.staticBlackHole',
      'caveat.oneWayGravity',
      'caveat.halo',
      'caveat.orbitDecay',
      'caveat.merging',
      'caveat.tidalDisruption',
    ]);
    physics.updatePhysicsSettings({
      galaxy_gravity: 'mond',
      galaxy_kpc_per_unit: 1,
      galaxy_msun_per_unit: 1,
    });
    expect(physics.conservationCaveats()).toContain('caveat.mond');
  });

  test('the drift is null before a baseline and cached between reads', () => {
    physics.planets.push(body(1, 3, 0, 0, 0, 0), body(2, 1, 4, 0, 0, 2));
    physics.resetConservationBaseline();
    const a = physics.conservationDrift(true);
    physics.planets[1].pos.x = 5;
    // Not fresh: the cached totals are still the ones at r = 4.
    expect(physics.conservationDrift().energy).toBeCloseTo(a.energy, 12);
    expect(physics.conservationDrift(true).energy).toBeCloseTo(0.8, 12);
  });
});

describe('absorption ledgers', () => {
  const hole = movable => ({
    mass: 10,
    pos: { x: 0, y: 0 },
    vel: { x: 0, y: 0 },
    can_move: () => movable,
    updateRadius() {},
  });

  beforeEach(() => {
    physics.updatePhysicsSettings({
      mutual_gravity: true,
      star_only_gravity: false,
    });
    physics.resetAbsorptionAccounting();
  });

  test('a moving hole banks the spin: mu * (r x v) = 20, and takes the mean state', () => {
    const bh = hole(true);
    physics.absorb_into_black_hole(bh, {
      mass: 2,
      pos: { x: 3, y: 0 },
      vel: { x: 0, y: 4 },
    });
    // mu = 10 * 2 / 12; r_rel x v_rel = 3 * 4 - 0.
    expect(physics.getAbsorbedSpinAngularMomentum()).toBeCloseTo(20, 12);
    expect(bh.spin_angular_momentum).toBeCloseTo(20, 12);
    expect(bh.mass).toBe(12);
    expect(bh.pos.x).toBeCloseTo(0.5, 12);
    expect(bh.vel.y).toBeCloseTo(8 / 12, 12);
    expect(physics.getDiscardedAbsorptionMomentum()).toEqual({ x: 0, y: 0 });
  });

  test('a fixed hole discards m * v = (6, 8) and keeps its state', () => {
    const bh = hole(false);
    physics.absorb_into_black_hole(bh, {
      mass: 2,
      pos: { x: 3, y: 0 },
      vel: { x: 3, y: 4 },
    });
    expect(physics.getDiscardedAbsorptionMomentum()).toEqual({ x: 6, y: 8 });
    expect(physics.getAbsorbedSpinAngularMomentum()).toBe(0);
    expect(bh.mass).toBe(12);
    expect(bh.pos).toEqual({ x: 0, y: 0 });
    physics.absorb_into_black_hole(hole(false), {
      mass: 1,
      pos: { x: 1, y: 0 },
      vel: { x: -1, y: 2 },
    });
    expect(physics.getDiscardedAbsorptionMomentum()).toEqual({ x: 5, y: 10 });
  });

  test('the getter hands out a copy and reset clears both ledgers', () => {
    conservation.bankDiscardedMomentum(1, 2);
    conservation.bankAbsorbedSpin(3);
    const copy = physics.getDiscardedAbsorptionMomentum();
    copy.x = 99;
    expect(physics.getDiscardedAbsorptionMomentum()).toEqual({ x: 1, y: 2 });
    expect(physics.getAbsorbedSpinAngularMomentum()).toBe(3);
    physics.resetAbsorptionAccounting();
    expect(physics.getDiscardedAbsorptionMomentum()).toEqual({ x: 0, y: 0 });
    expect(physics.getAbsorbedSpinAngularMomentum()).toBe(0);
  });
});

describe('a star absorbing a small body (D-R10-23), worked by hand', () => {
  // The hole tests above, with a star in the hole's place: mass 10 at rest at
  // the origin, a body of mass 2 at (3, 0) moving at (0, 4).
  const star = (extra = {}) => ({
    mass: 10,
    pos: { x: 0, y: 0 },
    vel: { x: 0, y: 0 },
    model_owned: false,
    ...extra,
  });
  const prey = () => ({
    mass: 2,
    pos: { x: 3, y: 0 },
    vel: { x: 0, y: 4 },
  });

  beforeEach(() => {
    physics.updatePhysicsSettings({
      mutual_gravity: true,
      star_only_gravity: false,
    });
    physics.resetAbsorptionAccounting();
  });

  test('a participating star takes the mean state, keeps momentum 8 and banks spin 20', () => {
    const s = star();
    absorb_into_star(s, prey());
    expect(s.mass).toBe(12);
    // The centre of mass: (10 * 0 + 2 * 3) / 12.
    expect(s.pos.x).toBeCloseTo(0.5, 12);
    expect(s.pos.y).toBe(0);
    // The velocity: 2 * 4 / 12, so the system holds 12 * (8 / 12) = 8 in y, the
    // 2 * 4 the body carried, as an absolute number and not a ratio.
    expect(s.vel.x).toBe(0);
    expect(s.vel.y).toBeCloseTo(8 / 12, 12);
    expect(s.mass * s.vel.y).toBeCloseTo(8, 12);
    // mu = 10 * 2 / 12; r_rel x v_rel = 3 * 4 - 0. A star has no spin field.
    expect(physics.getAbsorbedSpinAngularMomentum()).toBeCloseTo(20, 12);
    expect('spin_angular_momentum' in s).toBe(false);
    expect(physics.getDiscardedAbsorptionMomentum()).toEqual({ x: 0, y: 0 });
  });

  test.each([
    ['one-way gravity', { mutual_gravity: false }, {}],
    ['star_only_gravity', { star_only_gravity: true }, {}],
    ['a model-owned star', {}, { model_owned: true }],
  ])(
    '%s: the star keeps its state and the momentum is banked',
    (_, settings, extra) => {
      physics.updatePhysicsSettings(settings);
      const s = star(extra);
      absorb_into_star(s, { ...prey(), vel: { x: 3, y: 4 } });
      expect(s.mass).toBe(12);
      expect(s.pos).toEqual({ x: 0, y: 0 });
      expect(s.vel).toEqual({ x: 0, y: 0 });
      // m * v = 2 * (3, 4).
      expect(physics.getDiscardedAbsorptionMomentum()).toEqual({ x: 6, y: 8 });
      expect(physics.getAbsorbedSpinAngularMomentum()).toBe(0);
    }
  );

  test('through the engine: momentum, centre of mass and the banked spin hold for a real star and planet', () => {
    for (const l of ['planets', 'stars']) physics[l].length = 0;
    const sun = new physics.StarObject({ x: 0, y: 0 }, { x: 1.5, y: -0.5 }, 4);
    sun.model_owned = false;
    sun.persistent = true;
    const rock = new physics.Planet({ x: 0, y: 0 }, { x: -3, y: 4 }, 30);
    rock.pos = { x: sun.radius * 0.5, y: 0 };
    rock.persistent = true;
    physics.stars.push(sun);
    physics.planets.push(rock);
    physics.bumpWorldGeneration();
    const m = rock.mass;
    const rx = rock.pos.x;
    // Worked out here: M = 4 solar masses = 4000 units, the star at the origin.
    const px = 4000 * 1.5 + m * -3;
    const py = 4000 * -0.5 + m * 4;
    const scale = 4000 * Math.hypot(1.5, 0.5) + m * 5;
    const mu = (4000 * m) / (4000 + m);
    const spin = mu * (rx * (4 - -0.5));
    const L0 = m * (rx * 4);
    physics.handle_star_object_collisions();
    expect(rock.alive).toBe(false);
    expect(sun.mass).toBeCloseTo(4000 + m, 9);
    const tol = OUTCOMES.momentumScale * scale;
    expect(Math.abs(sun.mass * sun.vel.x - px)).toBeLessThan(tol);
    expect(Math.abs(sun.mass * sun.vel.y - py)).toBeLessThan(tol);
    // The centre of mass: M x_cm = m * rx (the star stood at the origin).
    expect(Math.abs(sun.mass * sun.pos.x - m * rx)).toBeLessThan(
      OUTCOMES.momentumScale * m * rx
    );
    expect(sun.pos.y).toBe(0);
    expect(physics.getAbsorbedSpinAngularMomentum()).toBeCloseTo(spin, 9);
    // What is not kept is what is banked: L before minus L after.
    const L1 = sun.mass * (sun.pos.x * sun.vel.y - sun.pos.y * sun.vel.x);
    expect(L0 - L1).toBeCloseTo(spin, 9);
    for (const l of ['planets', 'stars']) physics[l].length = 0;
  });
});

describe('energy, in joules and in history', () => {
  // The energy unit follows from the mass and length anchors and the sim's G:
  // T = sqrt(G L^3 / (G_SI M)), E = M L^2 / T^2.
  const joulesPerUnit = G => {
    const L = AU_METERS / 100;
    const M = physics.MASS_UNIT_KG;
    const T = Math.sqrt((G * L ** 3) / (G_SI * M));
    return (M * L ** 2) / (T * T);
  };

  beforeEach(() => {
    physics.setStateReference({ frame_count: 0, zoom: 1, paused: false });
    physics.updatePhysicsSettings({
      gravitational_constant: 2,
      min_interaction_distance: 0,
      mutual_gravity: true,
      use_barnes_hut: false,
    });
    for (const l of ['planets', 'stars', 'bh_list']) physics[l].length = 0;
    physics.clearAllEnergyHistory();
    engineState.setWorkerFailed(null);
  });

  afterEach(() => {
    for (const l of ['planets', 'stars', 'bh_list']) physics[l].length = 0;
    physics.clearAllEnergyHistory();
    engineState.setWorkerFailed(null);
  });

  test('kinetic energy of 1000 units at (3, 4) is 12500 sim units in joules', () => {
    const ke = physics.calculateKineticEnergy(body(1, 1000, 0, 0, 3, 4));
    expect(ke / (12500 * joulesPerUnit(2))).toBeCloseTo(1, 12);
    expect(ke).toBeCloseTo(1.1031224260653405e39, -26);
    expect(physics.calculateKineticEnergy(null)).toBe(0);
    expect(physics.calculateKineticEnergy(body(1, 0, 0, 0, 3, 4))).toBe(0);
  });

  test('the pair potential is softened at the floor: -1.2 sim units inside 5', () => {
    const pe = d =>
      physics.calculateGravitationalPotentialEnergy(
        body(1, 3, 0, 0, 0, 0),
        body(2, 1, d, 0, 0, 0),
        d
      );
    // G m1 m2 / r with r = max(d, 5) = 5 for d = 1 and d = 4.
    expect(pe(1)).toBeCloseTo(-1.2 * joulesPerUnit(2), -26);
    expect(pe(4) / pe(1)).toBe(1);
    expect(pe(10) / (-0.6 * joulesPerUnit(2))).toBeCloseTo(1, 12);
    expect(pe(10)).toBeCloseTo(-5.29498764511363e34, -22);
    expect(pe(0)).toBe(0);
  });

  test('the Barnes-Hut potential is used only while the worker path runs', () => {
    const a = body(1, 3, 0, 0, 0, 0);
    const b = body(2, 1, 10, 0, 0, 0);
    a.cached_phi = -7;
    const direct = physics.calculateTotalPotentialEnergy(a, [a, b]);
    expect(direct / (-0.6 * joulesPerUnit(2))).toBeCloseTo(1, 12);
    physics.updatePhysicsSettings({ use_barnes_hut: true });
    // phi * m = -21 sim units.
    expect(physics.calculateTotalPotentialEnergy(a, [a, b])).toBeCloseTo(
      -21 * joulesPerUnit(2),
      -26
    );
    engineState.setWorkerFailed('lost');
    expect(engineState.isBarnesHutActive()).toBe(false);
    expect(physics.calculateTotalPotentialEnergy(a, [a, b])).toBe(direct);
  });

  test('the history samples every body, trims to the limit and clears', () => {
    physics.planets.push(body(0, 3, 0, 0, 0, 0), body(7, 1, 10, 0, 0, 2));
    for (let i = 0; i < 4; i++) physics.updateEnergyHistory();
    // Ids start at 0, so the first body is kept.
    expect(physics.getObjectEnergyHistory(0)).toHaveLength(4);
    expect(physics.getObjectEnergyHistory(7)).toHaveLength(4);
    expect(physics.getObjectEnergyHistory(undefined)).toEqual([]);
    const e = physics.getObjectEnergyHistory(7)[0];
    // KE = 2 sim units; PE = -2 * 3 * 1 / 10 = -0.6.
    expect(e.ke / (2 * joulesPerUnit(2))).toBeCloseTo(1, 12);
    expect(e.pe / (-0.6 * joulesPerUnit(2))).toBeCloseTo(1, 12);
    expect(e.total).toBe(e.ke + e.pe);
    const stats = physics.getObjectEnergyStats(7);
    expect(stats.dataPoints).toBe(4);
    expect(stats.latest.total).toBe(e.total);
    expect(stats.average.ke).toBeCloseTo(e.ke, -26);
    expect(physics.getEnergySystemMemoryStats()).toMatchObject({
      totalObjects: 2,
      totalDataPoints: 8,
      totalMemoryEstimateBytes: 256,
      averageDataPointsPerObject: 4,
      maxDataPointsPerObject: 5000,
    });
    expect(physics.trimAllEnergyHistory(2)).toBe(2);
    expect(physics.getObjectEnergyHistory(0)).toHaveLength(2);
    expect(physics.updateEnergySystemConfig({ maxHistoryPoints: 1 })).toEqual({
      maxHistoryPoints: 1,
      sampleRate: conservation.ENERGY_SAMPLE_RATE,
    });
    expect(physics.getObjectEnergyHistory(0)).toHaveLength(1);
    physics.clearObjectEnergyHistory(0);
    expect(physics.getObjectEnergyHistory(0)).toEqual([]);
    physics.clearEnergyHistory(7);
    expect(physics.getEnergySystemMemoryStats().totalObjects).toBe(0);
  });

  test('a step samples once the frame counter reaches a multiple of ten', () => {
    expect(conservation.ENERGY_SAMPLE_RATE).toBe(10);
    const planet = new physics.Planet({ x: 0, y: 0 }, { x: 0, y: 0 });
    physics.planets.push(planet);
    physics.setStateReference({ frame_count: 8, zoom: 1, paused: false });
    // The counter is incremented before the sampling test: 9, then 10.
    physics.updatePhysics(0.01);
    expect(physics.getObjectEnergyHistory(planet.id)).toHaveLength(0);
    physics.updatePhysics(0.01);
    expect(physics.getObjectEnergyHistory(planet.id)).toHaveLength(1);
    expect(physics.getAllPhysicsObjects().map(o => o.id)).toContain(planet.id);
  });
});
