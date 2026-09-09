// =============================================================================
// Comets are drawn, in the same coordinate space as every other body
// -----------------------------------------------------------------------------
// Two defects met here, and both were invisible for the same reason: nothing
// ever called Comet.draw(). js/render.js did not import `comets` at all, so the
// ten comets the Solar System scenario builds - and every comet a reader placed
// by hand - existed, gravitated, and were never painted.
//
// With the draw call restored, the second defect surfaces. Every other body
// draws in world coordinates, because the render pass has already applied the
// pan, the zoom and the frame offset to the context. Comet.draw() converted to
// screen coordinates first, which through that same transform puts the comet
// somewhere else entirely. And it used the raw physical radius, which at any
// scenario zoom is a fraction of a pixel.
//
// These tests are about the drawing only. The physical radius, the mass and the
// collision behaviour are deliberately asserted to be unchanged: making a comet
// visible must not make it a bigger object.
// =============================================================================

import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  Comet,
  Asteroid,
  comets,
  asteroids,
  findObjectAtPosition,
  setStateReference,
} from '../js/physics.js';

/**
 * A 2D context that records what was asked of it.
 *
 * Enough of the interface for a body's draw(), and nothing else: the point is
 * to read back the geometry, not to rasterise anything.
 */
function recordingContext() {
  const calls = { arc: [], fillRect: [], moveTo: [], lineTo: [], gradients: 0 };
  const gradient = { addColorStop: () => {} };
  return {
    calls,
    fillStyle: '',
    strokeStyle: '',
    globalAlpha: 1,
    lineWidth: 1,
    font: '',
    textAlign: '',
    textBaseline: '',
    shadowColor: '',
    shadowBlur: 0,
    save() {},
    restore() {},
    setTransform() {},
    clip() {},
    rect() {},
    ellipse(x, y, rx) {
      calls.arc.push({ x, y, r: rx });
    },
    drawImage() {},
    translate() {},
    rotate() {},
    beginPath() {},
    closePath() {},
    fill() {},
    stroke() {},
    moveTo(x, y) {
      calls.moveTo.push({ x, y });
    },
    lineTo(x, y) {
      calls.lineTo.push({ x, y });
    },
    arc(x, y, r) {
      calls.arc.push({ x, y, r });
    },
    fillRect(x, y, w, h) {
      calls.fillRect.push({ x, y, w, h });
    },
    fillText() {},
    createLinearGradient() {
      calls.gradients++;
      return gradient;
    },
    createRadialGradient() {
      calls.gradients++;
      return gradient;
    },
  };
}

/** Where the comet is, in world units. Deliberately far from the origin. */
const POS = { x: 640, y: -420 };

/** The view the draws are measured against. */
const view = { paused: true, zoom: 0.5, pan: { x: 120, y: -75 } };

beforeEach(() => {
  // A pan and a zoom that are not the identity, so a screen-space draw and a
  // world-space draw cannot accidentally agree.
  view.zoom = 0.5;
  view.pan = { x: 120, y: -75 };
  setStateReference(view);
});

describe('a comet draws where it is', () => {
  test('every shape it draws is centred on its world position', () => {
    const comet = new Comet(POS, { x: 0, y: 0 }, 0.05);
    const ctx = recordingContext();
    comet.draw(ctx);

    expect(ctx.calls.arc.length).toBeGreaterThan(0);
    for (const { x, y } of ctx.calls.arc) {
      expect(x).toBeCloseTo(POS.x, 6);
      expect(y).toBeCloseTo(POS.y, 6);
    }
  });

  test('nothing it draws is left in screen coordinates', () => {
    // The failure this catches: world_to_screen() applied inside a context that
    // has already been transformed, which lands the comet at roughly
    // (zoom * pos + pan + half the canvas) instead of at pos.
    const comet = new Comet(POS, { x: 7, y: -3 }, 0.05);
    const ctx = recordingContext();
    comet.draw(ctx);

    const points = [...ctx.calls.arc, ...ctx.calls.moveTo, ...ctx.calls.lineTo];
    expect(points.length).toBeGreaterThan(0);
    // Everything it draws belongs within a few hundred world units of the
    // comet - the tail is the longest of them - and a screen-space coordinate
    // would be thousands of units away.
    for (const p of points) {
      expect(Math.hypot(p.x - POS.x, p.y - POS.y)).toBeLessThan(300);
    }
  });
});

describe('a comet is big enough to see and to click', () => {
  test('the nucleus is never smaller on screen than the shared floor', () => {
    const comet = new Comet(POS, { x: 0, y: 0 }, 0.05);
    // Its physical radius is a fraction of a world unit; at this zoom that is
    // far less than a pixel.
    expect(comet.radius * view.zoom).toBeLessThan(1);

    const ctx = recordingContext();
    comet.draw(ctx);

    // The smallest circle drawn is the nucleus. The floor is the same one
    // js/physics.js applies to every other body, expressed in world units.
    const smallest = Math.min(...ctx.calls.arc.map(a => a.r));
    expect(smallest * view.zoom).toBeGreaterThanOrEqual(2.5);
  });

  test('it uses the same floor an asteroid uses', () => {
    const comet = new Comet(POS, { x: 0, y: 0 }, 0.05);
    const rock = new Asteroid(POS, { x: 0, y: 0 }, 1);

    const cometCtx = recordingContext();
    const rockCtx = recordingContext();
    comet.draw(cometCtx);
    rock.draw(rockCtx);

    const cometNucleus = Math.min(...cometCtx.calls.arc.map(a => a.r));
    const rockDot = Math.min(...rockCtx.calls.arc.map(a => a.r));
    // Both are below the floor at this zoom, so both are held at exactly it.
    expect(cometNucleus).toBeCloseTo(rockDot, 9);
  });

  test('drawing changes nothing about the object', () => {
    const comet = new Comet(POS, { x: 4, y: 4 }, 0.05);
    const before = {
      radius: comet.radius,
      mass: comet.mass,
      massInComets: comet.massInComets,
      x: comet.pos.x,
      y: comet.pos.y,
      vx: comet.vel.x,
      vy: comet.vel.y,
    };
    comet.draw(recordingContext());
    expect({
      radius: comet.radius,
      mass: comet.mass,
      massInComets: comet.massInComets,
      x: comet.pos.x,
      y: comet.pos.y,
      vx: comet.vel.x,
      vy: comet.vel.y,
    }).toEqual(before);
  });
});

describe('a comet can be picked up by a click', () => {
  beforeEach(() => {
    comets.length = 0;
    asteroids.length = 0;
  });

  test('it is found at its own position', () => {
    // findObjectAtPosition used to walk `asteroids` only, ending in an
    // `instanceof Comet` branch that had been unreachable since hand-placed
    // comets stopped being filed as rocks. A reader could place a comet and
    // then be unable to click it, inspect it, or frame the view on it.
    const comet = new Comet(POS, { x: 0, y: 0 }, 0.05);
    comets.push(comet);
    const hit = findObjectAtPosition({ x: POS.x, y: POS.y });
    expect(hit).not.toBeNull();
    expect(hit.type).toBe('Comet');
    expect(hit.object).toBe(comet);
  });

  test('with the same generous radius the other small bodies get', () => {
    const comet = new Comet(POS, { x: 0, y: 0 }, 0.05);
    comets.push(comet);
    // Well outside its physical radius, inside the click floor at this zoom.
    const near = { x: POS.x + 8 / view.zoom - 1, y: POS.y };
    expect(findObjectAtPosition(near)?.object).toBe(comet);
    const far = { x: POS.x + 8 / view.zoom + 40, y: POS.y };
    expect(findObjectAtPosition(far)).toBeNull();
  });

  test('a dead comet is not clickable', () => {
    const comet = new Comet(POS, { x: 0, y: 0 }, 0.05);
    comet.alive = false;
    comets.push(comet);
    expect(findObjectAtPosition({ x: POS.x, y: POS.y })).toBeNull();
  });

  test('an asteroid is still reported as an asteroid', () => {
    const rock = new Asteroid(POS, { x: 0, y: 0 }, 1);
    asteroids.push(rock);
    const hit = findObjectAtPosition({ x: POS.x, y: POS.y });
    expect(hit?.type).toBe('Asteroid');
    expect(hit?.object).toBe(rock);
  });
});
