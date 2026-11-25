/**
 * The bookkeeping docs/encounter-rules.md claims for contact and tidal rules,
 * and nothing it does not claim: a merger conserves the pair's mass and
 * momentum, a fast rocky contact costs each body exactly the stated tenth of
 * its mass, tidal stripping lowers the total mass, and the tidal fragment
 * count is the same however finely a stretch of time is stepped.
 */
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import * as physics from '../js/physics.js';
import { handle_gas_giant_merging } from '../js/engine/collisions.js';

const LISTS = ['stars', 'planets', 'gas_giants', 'asteroids', 'comets'];
const clear = () => {
  for (const l of LISTS) physics[l].length = 0;
  physics.bh_list.length = 0;
  physics.debris.length = 0;
};

const totals = bodies => {
  const live = bodies.filter(b => b.alive !== false);
  return {
    m: live.reduce((s, b) => s + b.mass, 0),
    px: live.reduce((s, b) => s + b.mass * b.vel.x, 0),
    py: live.reduce((s, b) => s + b.mass * b.vel.y, 0),
  };
};
const rel = (a, b) => Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b));

let saved;
beforeEach(() => {
  saved = { ...physics.physicsSettings };
  clear();
});
afterEach(() => {
  clear();
  physics.updatePhysicsSettings(saved);
});

describe('mergers conserve the pair’s mass and momentum to 1e-12', () => {
  test('two stars become one', () => {
    physics.updatePhysicsSettings({ enable_star_merging: true });
    const a = new physics.StarObject({ x: 0, y: 0 }, { x: 3, y: -1 }, 1);
    const b = new physics.StarObject({ x: 0, y: 0 }, { x: -2, y: 4 }, 0.6);
    b.pos = { x: (a.radius + b.radius) * 0.4, y: 0.3 };
    physics.stars.push(a, b);
    const before = totals([a, b]);
    physics.handle_star_merging([...physics.stars]);
    const after = totals([
      ...physics.stars,
      ...physics.bh_list,
      ...physics.neutron_stars,
      ...physics.white_dwarfs,
    ]);
    expect(a.alive && b.alive).toBe(false);
    expect(rel(after.m, before.m)).toBeLessThan(1e-12);
    expect(rel(after.px, before.px)).toBeLessThan(1e-12);
    expect(rel(after.py, before.py)).toBeLessThan(1e-12);
  });

  test('two gas giants become one', () => {
    const a = new physics.GasGiant({ x: 0, y: 0 }, { x: 1, y: 2 }, 1);
    const b = new physics.GasGiant({ x: 0, y: 0 }, { x: -3, y: 0.5 }, 2.5);
    b.pos = { x: (a.radius + b.radius) * 0.5, y: 0 };
    physics.gas_giants.push(a, b);
    const before = totals([a, b]);
    handle_gas_giant_merging();
    const live = physics.gas_giants.filter(g => g.alive !== false);
    expect(live).toHaveLength(1);
    const after = totals(live);
    expect(rel(after.m, before.m)).toBeLessThan(1e-12);
    expect(rel(after.px, before.px)).toBeLessThan(1e-12);
    expect(rel(after.py, before.py)).toBeLessThan(1e-12);
  });
});

describe('a fast rocky contact', () => {
  test('costs each body exactly a tenth of its mass and sheds the stated fragments', () => {
    const a = new physics.Planet({ x: 0, y: 0 }, { x: 10, y: 0 }, 1);
    const b = new physics.Planet({ x: 0, y: 0 }, { x: -10, y: 0 }, 2);
    b.pos = { x: (a.radius + b.radius) * 0.5, y: 0 };
    const [ma, mb] = [a.mass, b.mass];
    physics.handle_rocky_collisions([a, b]);
    expect(a.mass).toBe(ma * 0.9);
    expect(b.mass).toBe(mb * 0.9);
    // Relative speed 20: floor(20 / 8) + 2.
    expect(physics.debris).toHaveLength(4);
  });

  test('below a relative speed of 15 it bounces and keeps its mass', () => {
    const a = new physics.Planet({ x: 0, y: 0 }, { x: 7, y: 0 }, 1);
    const b = new physics.Planet({ x: 0, y: 0 }, { x: -7, y: 0 }, 1);
    b.pos = { x: (a.radius + b.radius) * 0.5, y: 0 };
    const m = a.mass;
    physics.handle_rocky_collisions([a, b]);
    expect([a.mass, b.mass]).toEqual([m, m]);
    expect(physics.debris).toHaveLength(0);
  });
});

describe('tidal stripping', () => {
  const near = () => {
    const hole = new physics.BlackHole({ x: 0, y: 0 }, 2000 * 1000, {
      x: 0,
      y: 0,
    });
    const star = new physics.StarObject({ x: 0, y: 0 }, { x: 0, y: 0 }, 1);
    star.pos = { x: hole.radius * 2, y: 0 };
    return { hole, star };
  };

  test('lowers the total mass, fragments included', () => {
    const { hole, star } = near();
    const m0 = star.mass;
    let made = 0;
    for (let i = 0; i < 60; i++)
      made += star.tidal_mass_loss([hole], 1 / 60).debris_count;
    expect(made).toBeGreaterThan(0);
    const fragment = new physics.Debris({ x: 0, y: 0 }, { x: 0, y: 0 }).mass;
    expect(star.mass + made * fragment).toBeLessThan(m0);
  });

  test('sheds the same number of fragments at any step over the same time', () => {
    const count = steps => {
      const { hole, star } = near();
      let made = 0;
      for (let i = 0; i < steps; i++)
        made += star.tidal_mass_loss([hole], 1 / steps).debris_count;
      return made;
    };
    // Each step's share is below one fragment at 120 steps: the old floor
    // of each share gave none there.
    const counts = [120, 60, 30, 20].map(count);
    expect(counts[0]).toBeGreaterThan(0);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
  });
});
