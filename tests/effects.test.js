// =============================================================================
// The effects an engine event spawns are the ones the engine used to make
// -----------------------------------------------------------------------------
// The particle pool and the four merger explosions moved out of js/physics.js
// into js/bodyEffects.js (D-DECOMP-16). The move is only right if every event
// still takes the same random draws in the same order, leaves the same next
// draw, and spawns the same particles and ripples. tools/effects-trace.mjs runs
// nineteen events through the engine under a counting stream; the fixture is its
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

  test('the tracer color is by temperature, brightness and pulse, as the class method was', () => {
    // Recorded from the class method (AccretionDiskParticle's temperature color,
    // now tracerColor in js/bodyEffects.js) on the commit before it moved; the channels may pass 255 (the original does not clamp
    // them all), so they are kept as they were.
    const rows = [
      [2000, 1, 0, 'rgb(120, 36, 0)'],
      [5000, 1.5, 1, 'rgb(255, 272, 68)'],
      [12000, 2, 2, 'rgb(255, 255, 307)'],
      [20000, 1, 3, 'rgb(205, 205, 205)'],
      [40000, 2.5, 4, 'rgb(248, 279, 255)'],
      [2999.9, 1, 0.5, 'rgb(148, 44, 0)'],
      [8000, 1, 0.5, 'rgb(218, 218, 130)'],
      [15000, 1, 0.5, 'rgb(238, 238, 238)'],
      [30000, 1, 0.5, 'rgb(197, 222, 247)'],
    ];
    for (const [
      temperature,
      brightness_multiplier,
      pulse_phase,
      want,
    ] of rows) {
      expect(
        effects.tracerColor({ temperature, brightness_multiplier, pulse_phase })
      ).toBe(want);
    }
  });

  test('every burst the engine throws has a look, and every look a burst', () => {
    const source = readFileSync(
      new URL('../js/physics.js', import.meta.url),
      'utf8'
    );
    const thrown = [...source.matchAll(/\bburst\(\s*'(\w+)'/g)].map(m => m[1]);
    const table = source.match(/const BURSTS = \{([\s\S]*?)\n\};/)[1];
    const rows = [...table.matchAll(/^\s+(\w+):/gm)].map(m => m[1]);
    expect(thrown).toHaveLength(13);
    expect([...new Set(thrown)].sort()).toEqual(rows.sort());
    expect(Object.keys(effects.burstLooks).sort()).toEqual(rows);
    for (const look of Object.values(effects.burstLooks)) {
      expect(look.start).toBeGreaterThan(look.end);
    }
  });
});
