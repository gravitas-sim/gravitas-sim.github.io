// =============================================================================
// The effects an engine event spawns are the ones the engine used to make
// -----------------------------------------------------------------------------
// The particle pool and the four merger explosions moved out of js/physics.js
// into js/bodyEffects.js (D-DECOMP-16). The move is only right if every event
// still takes the same random draws in the same order, leaves the same next
// draw, and spawns the same particles and ripples. tools/effects-trace.mjs runs
// fifteen events through the engine under a counting stream; the fixture is its
// answer from the commit before the move, byte for byte.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { traceEffects } from '../tools/effects-trace.mjs';
import * as effects from '../js/bodyEffects.js';
import { particlePool } from '../js/physics.js';

const golden = JSON.parse(
  readFileSync(
    new URL('./fixtures/effectsGolden.json', import.meta.url),
    'utf8'
  )
);

describe('effects after the move', () => {
  test('every event draws, spawns and ripples exactly as before', async () => {
    const now = JSON.parse(JSON.stringify(await traceEffects()));
    expect(Object.keys(now)).toEqual(Object.keys(golden));
    for (const name of Object.keys(golden)) {
      expect({ name, ...now[name] }).toEqual({ name, ...golden[name] });
    }
  });

  test('the explosions are the big ones: hundreds of draws and particles', () => {
    expect(golden['ns-ns heavy (kilonova)'].rows[0].draws).toBeGreaterThan(
      3000
    );
    expect(golden['ns-ns heavy (kilonova)'].rows[0].particles).toBe(450);
    expect(golden['wd-wd under the limit'].rows[0].particles).toBe(20);
  });

  test('the engine reads the pool this module made', () => {
    expect(particlePool).toBe(effects.particlePool);
    expect(effects.particlePool).toBeInstanceOf(effects.ParticlePool);
  });

  test('a pooled particle is reset in place and lives a tenth of a second at least', () => {
    const pool = new effects.ParticlePool(2);
    const p = pool.getParticle({ x: 1, y: 2 }, { x: 3, y: 4 }, 0.01);
    expect(p).toBeInstanceOf(effects.Particle);
    expect(p.lifetime).toBe(0.1);
    pool.updateAndCleanup(1);
    expect(pool.getActiveParticles()).toHaveLength(0);
    expect(pool.getParticle({ x: 0, y: 0 }, { x: 0, y: 0 })).toBe(p);
    expect(p.age).toBe(0);
  });

  test('the engine no longer exports the particle classes', async () => {
    const physics = await import('../js/physics.js');
    expect('Particle' in physics).toBe(false);
    expect('ParticlePool' in physics).toBe(false);
  });

  test('a white dwarf color is by temperature, as the class method was', () => {
    expect(effects.whiteDwarfColor(16000)).toBe('#9BB0FF');
    expect(effects.whiteDwarfColor(12000)).toBe('#CAD7FF');
    expect(effects.whiteDwarfColor(8000)).toBe('#F8F7FF');
    expect(effects.whiteDwarfColor(5000)).toBe('#FFE4B5');
  });
});
