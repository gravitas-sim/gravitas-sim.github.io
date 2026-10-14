// =============================================================================
// An engine with no effects registered spawns nothing and does not fail
// -----------------------------------------------------------------------------
// The pool and the explosions are filed with the engine by js/bodyEffects.js
// (D-DECOMP-16). A realm that never imports it (a Worker, a Node script) has an
// empty pool and no explosions. This file imports the engine only.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import {
  NeutronStar,
  neutron_stars,
  particles,
  particlePool,
  updatePhysics,
  gravity_ripples,
} from '../js/physics.js';

describe('the engine without effects', () => {
  test('a neutron star merger still merges, and nothing is spawned', () => {
    neutron_stars.push(
      new NeutronStar({ x: 0, y: 0 }, { x: 0, y: 0 }, 1.3, false),
      new NeutronStar({ x: 0.5, y: 0 }, { x: 0, y: 0 }, 1.3, false)
    );
    expect(() => updatePhysics(0.01)).not.toThrow();
    expect(neutron_stars).toHaveLength(1);
    expect(particles).toHaveLength(0);
    expect(particlePool.getActiveParticles()).toHaveLength(0);
    expect(particlePool.getParticle({ x: 0, y: 0 }, { x: 0, y: 0 })).toBe(null);
    expect(() => particlePool.clear()).not.toThrow();
    // the explosion makes its own ripple; with none registered there is none
    expect(gravity_ripples).toHaveLength(0);
  });
});
