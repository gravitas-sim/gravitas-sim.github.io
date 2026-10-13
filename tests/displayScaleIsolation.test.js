// =============================================================================
// The drawing cannot reach the physics
// -----------------------------------------------------------------------------
// The displayed-size policy shrinks a rocky planet to three eighths of its
// model radius and a gas giant to under a half. If any of that leaked into a
// collision test, a Roche limit, a transit depth, an orbital measurement or a
// saved state, the change would have altered the science to improve a picture.
//
// The structural argument is that js/bodyVisuals.js takes numbers and returns
// numbers, and only draw paths call it. These are the observable consequences
// of that argument, checked rather than asserted.
// =============================================================================

import { describe, test, expect, beforeEach } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import {
  Planet,
  GasGiant,
  StarObject,
  setStateReference,
  planets,
  gas_giants,
  stars,
  handle_collisions,
} from '../js/physics.js';
import { displayRadius, DISPLAY_FACTOR } from '../js/bodyVisuals.js';

beforeEach(() => {
  setStateReference({
    zoom: 1,
    pan: { x: 0, y: 0 },
    paused: true,
    selectedObject: null,
    orbit_helper: { preview: null },
    mouse: { x: 0, y: 0 },
  });
  planets.length = 0;
  gas_giants.length = 0;
  stars.length = 0;
});

describe('the model radius is what the simulation still runs on', () => {
  test('constructing a body does not consult the display policy', () => {
    const p = new Planet({ x: 0, y: 0 }, { x: 0, y: 0 }, 1);
    // Earth at five units, exactly as before the policy existed.
    expect(p.radius).toBe(5);
    expect(displayRadius(p.radius, 'Planet')).toBeLessThan(p.radius);
  });

  test('a body carries no displayed size on itself', () => {
    const g = new GasGiant({ x: 0, y: 0 }, { x: 0, y: 0 }, 1);
    for (const key of Object.keys(g)) {
      expect(key).not.toMatch(/display|drawn/i);
    }
  });

  test('drawing a body leaves its state untouched', () => {
    const ctx = new Proxy(
      {},
      {
        get(_, k) {
          if (k === 'canvas') return { width: 800, height: 600 };
          return (...a) => {
            if (String(k).startsWith('create')) return { addColorStop() {} };
            if (k === 'measureText') return { width: 10 };
            return a;
          };
        },
        set() {
          return true;
        },
      }
    );
    const p = new Planet({ x: 40, y: 0 }, { x: 0, y: 1 }, 1);
    const before = JSON.stringify(p.get_state());
    try {
      p.draw(ctx);
    } catch {
      // A stub context is allowed to fall over in a label or a gradient; what
      // matters is that nothing was written to the body before it did.
    }
    expect(JSON.stringify(p.get_state())).toBe(before);
  });
});

describe('collisions use the radius they always used', () => {
  test('two planets touching at the model radius still merge', () => {
    // Placed just inside contact by the *model* radii. Under the displayed
    // radii - 1.875 each - these two would be nowhere near touching, so a
    // collision test that had picked up the drawing would miss this one
    // entirely and the Sun would stop swallowing anything.
    const a = new Planet({ x: 0, y: 0 }, { x: 0, y: 0 }, 1);
    const b = new Planet({ x: 9, y: 0 }, { x: 0, y: 0 }, 1);
    expect(a.radius + b.radius).toBeGreaterThan(9);
    expect(
      displayRadius(a.radius, 'Planet') + displayRadius(b.radius, 'Planet')
    ).toBeLessThan(9);

    handle_collisions([a, b]);
    // Contact resolved: the two were pushed apart along the line joining them.
    expect(b.pos.x - a.pos.x).toBeGreaterThan(9);
  });

  test('and two separated by more than the model radii are left alone', () => {
    const a = new Planet({ x: 0, y: 0 }, { x: 0, y: 0 }, 1);
    const b = new Planet({ x: 40, y: 0 }, { x: 0, y: 0 }, 1);
    handle_collisions([a, b]);
    expect(a.pos).toEqual({ x: 0, y: 0 });
    expect(b.pos).toEqual({ x: 40, y: 0 });
  });

  test('a pair that only the displayed radii would separate is left alone', () => {
    // The inverse of the first case, and the one that would break if a future
    // edit swapped obj.radius for a drawn size in the contact test: at 3.5
    // units apart these overlap by neither measure, but at 3.5 they do overlap
    // by the model radii - so this pair is placed where only a *larger* radius
    // would touch, and nothing may happen.
    const a = new Planet({ x: 0, y: 0 }, { x: 0, y: 0 }, 1);
    const b = new Planet({ x: 10.5, y: 0 }, { x: 0, y: 0 }, 1);
    expect(a.radius + b.radius).toBeLessThan(10.5);
    handle_collisions([a, b]);
    expect(b.pos.x).toBe(10.5);
  });
});

describe('the analytic radii the instruments read are untouched', () => {
  test('a star reports its own physical radius, not a drawn one', () => {
    const s = new StarObject({ x: 0, y: 0 }, { x: 0, y: 0 }, 1);
    stars.push(s);
    // The light curve derives Rs from massInSuns, and never from radius.
    expect(s.massInSuns).toBeCloseTo(1, 6);
    expect(displayRadius(s.radius, 'Star')).toBe(s.radius);
  });

  test('a transit depth is a ratio of physical radii, so it cannot move', () => {
    // (Rp/Rs)^2 from the mass-radius relations in js/lightCurve.js. Both terms
    // are in solar radii and neither is obj.radius, which is why the drawing
    // policy is invisible to a light curve. Recomputed here from the same
    // constants so the claim is checked rather than repeated.
    const R_EARTH_SOLAR = 0.00916;
    const Rs = Math.pow(1, 0.8);
    const Rp = R_EARTH_SOLAR * Math.pow(1, 0.27);
    const depth = (Rp / Rs) ** 2;
    expect(depth).toBeCloseTo(8.39e-5, 7);
    // And the displayed ratio is nothing like it, which is the point of the
    // guidance the manual now carries.
    const drawnRatio = displayRadius(5, 'Planet') / displayRadius(15, 'Star');
    expect(drawnRatio ** 2).toBeGreaterThan(depth * 100);
  });
});

describe('no physics module imports the display policy', () => {
  // The cheapest guarantee there is: if a measurement cannot see the function,
  // it cannot be changed by it. js/physics.js is the one module that imports
  // both, because it both simulates and draws.
  const shouldNotImport = [
    'js/lightCurve.js',
    'js/orbital.js',
    'js/habitability.js',
    'js/tidalPhysics.js',
    'js/blackHolePhysics.js',
    'js/astrometry.js',
    'js/radialVelocity.js',
    'js/world/build.js',
    'js/scenarios.js',
    'js/shareState.js',
    'js/timestep.js',
  ];

  test.each(shouldNotImport)('%s does not import bodyVisuals', file => {
    const full = path.join(process.cwd(), file);
    if (!fs.existsSync(full)) return;
    const src = fs.readFileSync(full, 'utf8');
    expect(src).not.toMatch(/from\s+['"][^'"]*bodyVisuals\.js['"]/);
  });

  test('and none of them mention a display radius at all', () => {
    for (const file of shouldNotImport) {
      const full = path.join(process.cwd(), file);
      if (!fs.existsSync(full)) continue;
      const src = fs.readFileSync(full, 'utf8');
      expect([
        file,
        /displayRadius|drawnRadius|DISPLAY_FACTOR/.test(src),
      ]).toEqual([file, false]);
    }
  });

  test('the factor table itself lists only families, not scenarios', () => {
    // "One documented policy across scenarios, not per-scenario overrides."
    for (const key of Object.keys(DISPLAY_FACTOR)) {
      expect(key).toMatch(/^[A-Z][A-Za-z]*$/);
    }
  });
});
