// =============================================================================
// An engine with no effects registered spawns nothing, and draws the same
// -----------------------------------------------------------------------------
// The particle pool is filed with the engine by js/bodyEffects.js
// (D-DECOMP-16). A realm that never imports it (a Worker, a Node script) has an
// empty pool. The merger explosions' builders stay in the engine and draw from
// Math.random whatever is registered, because the collisions that follow draw
// from the same stream: tests/effectsRealm.test.js holds the world-level proof.
// This file imports the engine only.
// =============================================================================

import { describe, test, expect, jest } from '@jest/globals';
import { readFileSync } from 'node:fs';
import {
  NeutronStar,
  neutron_stars,
  particles,
  particlePool,
  updatePhysics,
  gravity_ripples,
} from '../js/physics.js';

const golden = JSON.parse(
  readFileSync(
    new URL('./fixtures/effectsGolden.json', import.meta.url),
    'utf8'
  )
);

describe('the engine without effects', () => {
  test('a neutron star merger merges, spawns nothing, and takes every draw', () => {
    neutron_stars.push(
      new NeutronStar({ x: 0, y: 0 }, { x: 0, y: 0 }, 1.3, false),
      new NeutronStar({ x: 0.5, y: 0 }, { x: 0, y: 0 }, 1.3, false)
    );
    let draws = 0;
    const spy = jest.spyOn(Math, 'random').mockImplementation(() => {
      draws++;
      return 0.5;
    });
    expect(() => updatePhysics(0.01)).not.toThrow();
    spy.mockRestore();
    expect(neutron_stars).toHaveLength(1);
    expect(particles).toHaveLength(0);
    expect(particlePool.getActiveParticles()).toHaveLength(0);
    expect(() => particlePool.clear()).not.toThrow();
    // the same number of draws the registered engine takes (the golden's
    // small kilonova), and the ripple the explosion makes
    expect(draws).toBe(golden['ns-ns light (small kilonova)'].rows[0].draws);
    expect(gravity_ripples).toHaveLength(1);
  });
});
