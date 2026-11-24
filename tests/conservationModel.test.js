/**
 * The energy the model conserves, and the readout's honesty about it.
 *
 * No one sum is conserved in every world the sandbox runs, so the readout
 * computes one sum with every term counted once (each moving body's kinetic
 * energy; the softened potential of each pair where either pulls the other)
 * and shows it as conserved only where the model conserves it. Fixtures and
 * tolerances, written before the readout was changed:
 * - a Static hole and two reciprocal stars: the sum holds to 1e-6 of |E| over
 *   t = 10, where counting the stars' kinetic energy twice would move it by
 *   about 1044;
 * - a moving one-way source: not conserved, and the sum is seen to change;
 * - two Orbiting holes with orbital decay: not conserved, reason decay;
 * - two Earth-mass planets meeting at a relative speed of 2: the sum holds to
 *   rounding until they touch, then falls by 91 percent at the bounce; the
 *   readout names a collision, shows the loss as the event's and measures
 *   drift from after it;
 * - a halo and MOND: not conserved, each named;
 * - a binary of two reciprocal stars: the sum equals the all-pairs figure.
 */
import { describe, test, expect, beforeEach } from '@jest/globals';
import * as physics from '../js/physics.js';
import {
  updatePhysicsSettings,
  bumpWorldGeneration,
  resetSimulationTime,
  setBodyList,
} from '../js/engine/state.js';
import { DEFAULT_SETTINGS } from '../js/appState.js';
import '../js/bodyEffects.js';

const LISTS = [
  'bh_list',
  'stars',
  'planets',
  'gas_giants',
  'asteroids',
  'comets',
  'neutron_stars',
  'white_dwarfs',
  'galaxies',
  'debris',
];

beforeEach(() => {
  physics.setStateReference({
    zoom: 1,
    pan: { x: 0, y: 0 },
    paused: true,
    selectedObject: null,
    orbit_helper: { preview: null },
    mouse: { x: 0, y: 0 },
  });
  for (const l of LISTS) setBodyList(l, []);
  updatePhysicsSettings({
    ...DEFAULT_SETTINGS,
    gravitational_constant: 1,
    galaxy_gravity: 'none',
    orbit_decay_rate: 0,
    enable_star_merging: false,
  });
  resetSimulationTime();
});

/** Put bodies in the world and start its readout. */
const start = bodies => {
  for (const [list, b] of bodies) physics[list].push(b);
  bumpWorldGeneration();
  physics.resetConservationBaseline();
};
const star = (x, y, vx, vy, mass) => {
  const s = new physics.StarObject({ x, y }, { x: vx, y: vy }, 1);
  s.mass = mass;
  return s;
};

describe('a Static hole and two reciprocal stars', () => {
  test('the sum holds to 1e-6 of |E|; the stars’ kinetic energy counted twice would not', () => {
    updatePhysicsSettings({
      bh_behavior: 'Static',
      integrator: 'Velocity Verlet',
    });
    const hole = new physics.BlackHole({ x: 0, y: 0 }, 1000, { x: 0, y: 0 });
    start([
      ['bh_list', hole],
      ['stars', star(100, 0, 0, 0, 1000)],
      ['stars', star(0, 150, 0, 0, 1000)],
    ]);
    const kinetic = () =>
      physics.stars.reduce(
        (s, b) => s + 0.5 * b.mass * (b.vel.x ** 2 + b.vel.y ** 2),
        0
      );
    const d0 = physics.conservationDrift(true);
    expect(d0.model.conserved).toBe(true);
    expect(d0.model.fixedField).toBe(true);
    const e0 = d0.model.energy;
    const k0 = kinetic();
    for (let i = 0; i < 10000; i++) physics.updatePhysics(0.001);
    const d = physics.conservationDrift(true);
    expect(physics.stars.filter(b => b.alive !== false)).toHaveLength(2);
    expect(d.model.conserved).toBe(true);
    expect(Math.abs(d.model.energy - e0)).toBeLessThan(1e-6 * Math.abs(e0));
    // The second count of the stars' kinetic energy.
    expect(kinetic() - k0).toBeGreaterThan(1000);
    expect(kinetic() - k0).toBeLessThan(1100);
  });
});

describe('what the model does not conserve, named', () => {
  test('a one-way source that moves', () => {
    updatePhysicsSettings({ mutual_gravity: false, star_only_gravity: false });
    const p = new physics.Planet({ x: 300, y: 0 }, { x: 0, y: 0 }, 1);
    start([
      ['stars', star(0, 0, 0.5, 0, 1000)],
      ['planets', p],
    ]);
    const e0 = physics.conservationDrift(true).model.energy;
    for (let i = 0; i < 2000; i++) physics.updatePhysics(0.01);
    const d = physics.conservationDrift(true);
    expect(p.alive).not.toBe(false);
    expect(d.model.conserved).toBe(false);
    expect(d.model.failure).toBe('movingSource');
    // The planet's share changes (the star's own kinetic energy, 125, is
    // constant): far above rounding, which is 1e-13 of |E|.
    expect(Math.abs(d.model.energy - e0)).toBeGreaterThan(1e-6 * Math.abs(e0));
  });

  test('two Orbiting holes with orbital decay', () => {
    updatePhysicsSettings({ bh_behavior: 'Orbiting', orbit_decay_rate: 0.1 });
    start([
      [
        'bh_list',
        new physics.BlackHole({ x: -50, y: 0 }, 1000, { x: 0, y: 0 }),
      ],
      ['bh_list', new physics.BlackHole({ x: 50, y: 0 }, 1000, { x: 0, y: 0 })],
    ]);
    physics.updatePhysics(0.001);
    const d = physics.conservationDrift(true);
    expect(d.model.conserved).toBe(false);
    expect(d.model.failure).toBe('decay');
  });

  test.each([
    ['halo', 'halo'],
    ['mond', 'mond'],
  ])('galaxy gravity %s', (mode, failure) => {
    // MOND needs a scale to convert a0 into, or it falls back to Newton.
    updatePhysicsSettings({
      galaxy_gravity: mode,
      galaxy_kpc_per_unit: 0.1,
      galaxy_msun_per_unit: 1e8,
    });
    expect(physics.physicsSettings.galaxy_gravity).toBe(mode);
    start([
      ['stars', star(-50, 0, 0, -1, 1000)],
      ['stars', star(50, 0, 0, 1, 1000)],
    ]);
    const d = physics.conservationDrift(true);
    expect(d.model.conserved).toBe(false);
    expect(d.model.failure).toBe(failure);
  });
});

describe('a collision is an event, not drift', () => {
  test('two Earth-mass planets bounce: 91 percent lost at the event, named', () => {
    updatePhysicsSettings({
      mutual_gravity: true,
      star_only_gravity: false,
      integrator: 'Velocity Verlet',
    });
    const m = 0.003003489616;
    const a = new physics.Planet({ x: -6, y: 0 }, { x: 1, y: 0 }, 1);
    const b = new physics.Planet({ x: 6, y: 0 }, { x: -1, y: 0 }, 1);
    a.mass = m;
    b.mass = m;
    start([
      ['planets', a],
      ['planets', b],
    ]);
    const e0 = physics.conservationDrift(true).model.energy;
    expect(e0).toBeCloseTo(0.0030027379, 9);
    let before = null;
    for (let i = 0; i < 20000; i++) {
      physics.updatePhysics(0.0001);
      const d = physics.conservationDrift(i % 10 === 9);
      if (!d.model.event) before = d;
    }
    const d = physics.conservationDrift(true);
    // Until the contact, the sum held to rounding and was shown as drift-free.
    expect(Math.abs(before.model.energy - e0)).toBeLessThan(1e-12);
    expect(d.model.event?.kind).toBe('collision');
    expect(d.model.event.change).toBeCloseTo(0.0002694255 - 0.0030027379, 6);
    expect(d.model.energy).toBeCloseTo(0.0002694255, 6);
    // Drift is measured from after the event: the loss is not in it.
    expect(Math.abs(d.model.change)).toBeLessThan(1e-9);
    expect(d.model.conserved).toBe(true);
    expect(physics.planets.filter(p => p.alive !== false)).toHaveLength(2);
    expect([a.mass, b.mass]).toEqual([m, m]);
    expect(physics.debris).toHaveLength(0);
  });
});

describe('a reciprocal pair', () => {
  test('the sum is the all-pairs figure', () => {
    start([
      ['stars', star(-200, 0, 0, -1.58, 2000)],
      ['stars', star(200, 0, 0, 1.58, 2000)],
    ]);
    const d = physics.conservationDrift(true);
    expect(d.model.conserved).toBe(true);
    expect(d.model.fixedField).toBe(false);
    expect(d.model.energy).toBeCloseTo(d.energy, 9);
  });
});

describe('Solar System, one-way gravity', () => {
  test('the drift is within a factor 2 of a test-particle sum at t = 50, 500, 3000', async () => {
    // world.js pulls in the renderer, which wants its canvases at import time.
    const find = globalThis.document.getElementById.bind(globalThis.document);
    globalThis.document.getElementById = id => {
      let el = find(id);
      if (!el) {
        el = globalThis.document.createElement(
          /canvas/i.test(id) ? 'canvas' : 'div'
        );
        el.id = id;
        globalThis.document.body.appendChild(el);
      }
      return el;
    };
    const ctx = new Proxy(
      {},
      {
        get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })),
        set: (t, k, v) => ((t[k] = v), true),
      }
    );
    globalThis.HTMLCanvasElement.prototype.getContext = () => ctx;
    const world = await import('../js/world.js');
    const state = await import('../js/appState.js');
    state.SETTINGS.preset_scenario = 'solar-system';
    world.initialize_simulation({ seed: 7 });
    expect(physics.physicsSettings.mutual_gravity).toBe(false);

    // Each small body's specific energy about the fixed Sun, times its mass:
    // written here from the state, not from conservation.js.
    const sun = physics.stars[0];
    const G = physics.physicsSettings.gravitational_constant;
    const testParticles = () =>
      [
        ...physics.planets,
        ...physics.gas_giants,
        ...physics.asteroids,
        ...physics.comets,
      ]
        .filter(b => b.alive !== false)
        .reduce((s, b) => {
          const r = Math.hypot(b.pos.x - sun.pos.x, b.pos.y - sun.pos.y);
          return (
            s +
            b.mass * (0.5 * (b.vel.x ** 2 + b.vel.y ** 2) - (G * sun.mass) / r)
          );
        }, 0);
    physics.resetConservationBaseline();
    const e0 = testParticles();
    const ratios = [];
    for (const until of [50, 500, 3000]) {
      while (physics.getSimulationTime() < until - 1e-9)
        physics.updatePhysics(0.05);
      const d = physics.conservationDrift(true);
      expect(d.model.conserved).toBe(true);
      expect(d.model.fixedField).toBe(true);
      const independent = (100 * (testParticles() - e0)) / Math.abs(e0);
      ratios.push(d.model.drift / independent);
      expect(d.model.drift / independent).toBeGreaterThan(0.5);
      expect(d.model.drift / independent).toBeLessThan(2);
    }
  }, 120000);
});
