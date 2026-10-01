// =============================================================================
// An accretion-disk tracer moves once per step
// -----------------------------------------------------------------------------
// Every tracer a black hole spawns goes into two lists: the hole's own
// disk_particles and the engine's accretion_disk_particles. Both were walked
// every step and both called update_physics, so each tracer moved twice as
// far and aged twice as fast as its dt said. The engine's pass is the one that
// moves them - it also reaches the tracers of a hole that has been swallowed -
// and the hole's own list only forgets the ones that have died.
// =============================================================================

import { describe, test, expect } from '@jest/globals';

import {
  BlackHole,
  AccretionDiskParticle,
  updatePhysicsSettings,
} from '../js/physics.js';

describe("a black hole's own pass over its tracers", () => {
  const hole = () => {
    updatePhysicsSettings({
      show_accretion_disk: true,
      realistic_disk_physics: true,
    });
    const bh = new BlackHole({ x: 0, y: 0 }, 100);
    const tracer = new AccretionDiskParticle(
      { x: 20, y: 0 },
      { x: 0, y: 1 },
      bh
    );
    bh.disk_particles.push(tracer);
    return { bh, tracer };
  };

  test('does not move or age a tracer', () => {
    const { bh, tracer } = hole();
    const before = { x: tracer.pos.x, y: tracer.pos.y, age: tracer.age };
    bh.updateDiskParticles(0.05);
    expect({ x: tracer.pos.x, y: tracer.pos.y, age: tracer.age }).toEqual(
      before
    );
  });

  test('forgets one that has died', () => {
    const { bh, tracer } = hole();
    tracer.alive = false;
    bh.updateDiskParticles(0.05);
    expect(bh.disk_particles).not.toContain(tracer);
  });
});
