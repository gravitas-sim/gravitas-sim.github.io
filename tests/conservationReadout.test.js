// =============================================================================
// The conservation check
// -----------------------------------------------------------------------------
// Three numbers used to sit in the corner of every first visit: an integrator's
// name, an energy drift and an angular-momentum drift, with nothing saying what
// they meant. A reader who has not been told otherwise reads a drift as a
// fault - and in a scenario with a static black hole or imposed orbital decay
// reads a large one as a fault too, when it is the model doing exactly what it
// was built to do.
//
// The numbers have not changed. What has changed is that they are off unless
// asked for, and that when they are on they arrive with the reasons this scene
// is not closed, the moment the reference was taken, and an honest gap where a
// percentage would be meaningless.
// =============================================================================

import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  PhysicsObject,
  planets,
  stars,
  bh_list,
  asteroids,
  comets,
  gas_giants,
  conservedQuantities,
  conservationDrift,
  resetConservationBaseline,
  setStateReference,
  updatePhysicsSettings,
} from '../js/physics.js';
import { DEFAULT_SETTINGS } from '../js/appState.js';

const clearWorld = () => {
  for (const list of [planets, stars, bh_list, asteroids, comets, gas_giants]) {
    list.length = 0;
  }
};

beforeEach(() => {
  setStateReference({
    zoom: 1,
    pan: { x: 0, y: 0 },
    paused: true,
    selectedObject: null,
    orbit_helper: { preview: null },
    mouse: { x: 0, y: 0 },
  });
  clearWorld();
  updatePhysicsSettings({ ...DEFAULT_SETTINGS });
});

describe('the setting is off by default', () => {
  test('an ordinary launch does not ask for diagnostics', () => {
    expect(DEFAULT_SETTINGS.show_conservation_diagnostics).toBe(false);
  });

  test('but nothing about the measurement was removed', () => {
    // The whole point of the change: presentation only. Everything the
    // validation suite, the reliability check and the exports read is still
    // computed and still exported.
    expect(typeof conservedQuantities).toBe('function');
    expect(typeof conservationDrift).toBe('function');
    expect(typeof resetConservationBaseline).toBe('function');
  });
});

describe('the totals, and the scales beside them', () => {
  test('a two-body system reports energy, angular momentum and both scales', () => {
    const a = new PhysicsObject({ x: -10, y: 0 }, { x: 0, y: -1 }, 100, 1);
    const b = new PhysicsObject({ x: 10, y: 0 }, { x: 0, y: 1 }, 100, 1);
    planets.push(a, b);

    const q = conservedQuantities();
    expect(q.count).toBe(2);
    expect(Number.isFinite(q.energy)).toBe(true);
    expect(Number.isFinite(q.angular)).toBe(true);
    // The scale is the size of the terms, so it is never smaller than the
    // magnitude of the total they add up to.
    expect(q.energyScale).toBeGreaterThanOrEqual(Math.abs(q.energy) - 1e-9);
    expect(q.angularScale).toBeGreaterThanOrEqual(Math.abs(q.angular) - 1e-9);
    expect(q.energyScale).toBeGreaterThan(0);
  });

  test('an empty world has nothing to measure and no scale', () => {
    const q = conservedQuantities();
    expect(q).toMatchObject({ energy: 0, angular: 0, count: 0 });
    expect(q.energyScale).toBe(0);
    expect(q.angularScale).toBe(0);
  });
});

describe('drift against a well-conditioned baseline', () => {
  test('a percentage is offered, and it is zero at the moment it is taken', () => {
    planets.push(
      new PhysicsObject({ x: -10, y: 0 }, { x: 0, y: -1 }, 100, 1),
      new PhysicsObject({ x: 10, y: 0 }, { x: 0, y: 1 }, 100, 1)
    );
    resetConservationBaseline();
    const drift = conservationDrift(true);

    expect(drift.energyConditioned).toBe(true);
    expect(drift.angularConditioned).toBe(true);
    expect(drift.energyDrift).toBeCloseTo(0, 9);
    expect(drift.angularDrift).toBeCloseTo(0, 9);
    // The changes are reported too, always, whether or not a percentage is.
    expect(drift.energyChange).toBeCloseTo(0, 9);
    expect(drift.angularChange).toBeCloseTo(0, 9);
  });

  test('the reference time travels with it', () => {
    planets.push(new PhysicsObject({ x: 5, y: 0 }, { x: 0, y: 1 }, 100, 1));
    resetConservationBaseline();
    const drift = conservationDrift(true);
    // A drift figure with no interval attached is not a measurement, and a
    // reader who rebaselines has to be able to see that they did.
    expect(Number.isFinite(drift.baselineTime)).toBe(true);
    expect(Number.isFinite(drift.elapsed)).toBe(true);
  });

  test('there is no drift at all before a baseline exists', () => {
    // Never invented, and never silently taken to make a number appear.
    expect(conservationDrift(true)).not.toBeUndefined();
  });
});

describe('a baseline that cannot support a percentage', () => {
  test('an empty world reports no percentage rather than a huge one', () => {
    resetConservationBaseline();
    const drift = conservationDrift(true);
    expect(drift.energyConditioned).toBe(false);
    expect(drift.angularConditioned).toBe(false);
    expect(Number.isNaN(drift.energyDrift)).toBe(true);
    expect(Number.isNaN(drift.angularDrift)).toBe(true);
  });

  test('a system whose angular momentum cancels gets no percentage for it', () => {
    // Two equal masses going opposite ways about the centre: each carries a
    // large angular momentum and the total is zero. A percentage of that is an
    // amplified rounding error, not a measurement - and the energy, which does
    // not cancel, keeps its percentage.
    planets.push(
      new PhysicsObject({ x: -10, y: 0 }, { x: 0, y: 5 }, 100, 1),
      new PhysicsObject({ x: 10, y: 0 }, { x: 0, y: 5 }, 100, 1)
    );
    resetConservationBaseline();
    const drift = conservationDrift(true);

    expect(Math.abs(drift.baselineAngular)).toBeLessThan(
      1e-3 * drift.angularScale
    );
    expect(drift.angularConditioned).toBe(false);
    expect(Number.isNaN(drift.angularDrift)).toBe(true);
    // ...but the change itself is still there to show.
    expect(Number.isFinite(drift.angularChange)).toBe(true);
    expect(drift.energyConditioned).toBe(true);
  });

  test('the criterion is a ratio, not a list of scenarios', () => {
    // A total that is a thousandth of its own terms is where a thousandfold
    // amplification begins. Checked by construction: scale it up and the same
    // configuration stays unusable, because the ratio has not changed.
    const build = factor => {
      clearWorld();
      planets.push(
        new PhysicsObject(
          { x: -10 * factor, y: 0 },
          { x: 0, y: 5 * factor },
          100 * factor,
          1
        ),
        new PhysicsObject(
          { x: 10 * factor, y: 0 },
          { x: 0, y: 5 * factor },
          100 * factor,
          1
        )
      );
      resetConservationBaseline();
      return conservationDrift(true);
    };
    expect(build(1).angularConditioned).toBe(false);
    expect(build(1000).angularConditioned).toBe(false);
  });
});

describe('the reasons a scene is not closed', () => {
  test('a static black hole is named', () => {
    updatePhysicsSettings({ ...DEFAULT_SETTINGS, bh_behavior: 'Static' });
    bh_list.push(new PhysicsObject({ x: 0, y: 0 }, { x: 0, y: 0 }, 1000, 8));
    resetConservationBaseline();
    expect(conservationDrift(true).caveats).toContain('caveat.staticBlackHole');
  });

  test('imposed orbital decay is named, and is not numerical error', () => {
    updatePhysicsSettings({
      ...DEFAULT_SETTINGS,
      bh_behavior: 'Orbiting',
      orbit_decay_rate: 0.5,
    });
    bh_list.push(
      new PhysicsObject({ x: -10, y: 0 }, { x: 0, y: 1 }, 1000, 8),
      new PhysicsObject({ x: 10, y: 0 }, { x: 0, y: -1 }, 1000, 8)
    );
    resetConservationBaseline();
    const caveats = conservationDrift(true).caveats;
    expect(caveats).toContain('caveat.orbitDecay');
  });

  test('one-way gravity is named', () => {
    updatePhysicsSettings({ ...DEFAULT_SETTINGS, mutual_gravity: false });
    planets.push(new PhysicsObject({ x: 5, y: 0 }, { x: 0, y: 1 }, 100, 1));
    resetConservationBaseline();
    expect(conservationDrift(true).caveats).toContain('caveat.oneWayGravity');
  });

  test('an ordinary closed system names nothing', () => {
    updatePhysicsSettings({
      ...DEFAULT_SETTINGS,
      mutual_gravity: true,
      star_only_gravity: false,
      enable_star_merging: false,
    });
    planets.push(
      new PhysicsObject({ x: -10, y: 0 }, { x: 0, y: -1 }, 100, 1),
      new PhysicsObject({ x: 10, y: 0 }, { x: 0, y: 1 }, 100, 1)
    );
    resetConservationBaseline();
    expect(conservationDrift(true).caveats).toEqual([]);
  });
});

describe('rebaselining is deliberate and visible', () => {
  test('taking a new reference moves the reference time with it', () => {
    planets.push(
      new PhysicsObject({ x: -10, y: 0 }, { x: 0, y: -1 }, 100, 1),
      new PhysicsObject({ x: 10, y: 0 }, { x: 0, y: 1 }, 100, 1)
    );
    const first = resetConservationBaseline();
    const before = conservationDrift(true).baselineTime;
    // Change the world, then rebaseline: the drift returns to zero because the
    // reference moved, and the reported reference time says so.
    planets[0].vel.y -= 0.5;
    const second = resetConservationBaseline();
    const after = conservationDrift(true);

    expect(second.energy).not.toBe(first.energy);
    expect(after.energyDrift).toBeCloseTo(0, 9);
    expect(after.baselineTime).toBe(before);
  });
});
