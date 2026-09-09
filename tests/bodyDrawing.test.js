// =============================================================================
// What the body classes actually ask the canvas to do
// -----------------------------------------------------------------------------
// js/bodyVisuals.js is tested on its own arithmetic. This is the other half:
// that the body classes obey it. The four properties here are the ones a
// drawing change breaks silently, because none of them shows up as an error -
// only as a picture that is subtly wrong on somebody else's machine.
//
//   Detail follows size. A body draws its cheap passes when it is small and
//   its expensive ones only when it is large, and the low quality tier never
//   reaches the expensive ones at all.
//
//   Markings stay inside the limb. Every band, cap and surface mark is drawn
//   under a clip, and every clip is inside a save/restore pair - an unbalanced
//   one leaks into every body drawn after it, which is a whole-scene defect
//   from one line.
//
//   The same body looks the same twice. No Math.random in a draw path, so a
//   screenshot of a seeded scenario is reproducible and a share link opens the
//   picture it promised.
//
//   A comet's tails point where the physics says. Covered here through the
//   real draw path, not only through the geometry helper.
// =============================================================================

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import {
  Planet,
  GasGiant,
  Asteroid,
  Comet,
  StarObject,
  stars,
  comets,
  asteroids,
  setStateReference,
} from '../js/physics.js';
import { setTier } from '../js/quality.js';
import { clearVisualCaches } from '../js/bodyVisuals.js';
import { auToSim } from '../js/units.js';

/**
 * A 2D context that records the calls made on it, in order.
 *
 * Every method the body classes reach for, and nothing they do not: an
 * unexpected call throws rather than being silently swallowed, which is how a
 * new drawing pass gets noticed here instead of in a screenshot.
 */
function recorder() {
  const calls = [];
  const log = (name, args) => calls.push({ name, args });
  const gradient = { addColorStop: () => {} };
  const ctx = {
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
    save: () => log('save', []),
    restore: () => log('restore', []),
    clip: () => log('clip', []),
    setTransform: (...a) => log('setTransform', a),
    translate: (...a) => log('translate', a),
    rotate: (...a) => log('rotate', a),
    beginPath: () => log('beginPath', []),
    closePath: () => log('closePath', []),
    moveTo: (...a) => log('moveTo', a),
    lineTo: (...a) => log('lineTo', a),
    arc: (...a) => log('arc', a),
    ellipse: (...a) => log('ellipse', a),
    rect: (...a) => log('rect', a),
    fill: (...a) => log('fill', a),
    stroke: () => log('stroke', []),
    fillRect: (...a) => log('fillRect', a),
    fillText: (...a) => log('fillText', a),
    drawImage: (...a) => log('drawImage', a),
    measureText: () => ({ width: 10 }),
    createLinearGradient: (...a) => {
      log('createLinearGradient', a);
      return gradient;
    },
    createRadialGradient: (...a) => {
      log('createRadialGradient', a);
      return gradient;
    },
  };
  return ctx;
}

/** Names only, for comparing two draws of the same body. */
const shape = ctx =>
  ctx.calls.map(
    c =>
      `${c.name}(${c.args.map(n => (typeof n === 'number' ? n.toFixed(6) : typeof n)).join(',')})`
  );

/** save/restore, as a running depth. Never negative, and zero at the end. */
function balance(ctx) {
  let depth = 0;
  let lowest = 0;
  for (const c of ctx.calls) {
    if (c.name === 'save') depth++;
    if (c.name === 'restore') depth--;
    lowest = Math.min(lowest, depth);
  }
  return { end: depth, lowest };
}

const view = { paused: true, zoom: 1, pan: { x: 0, y: 0 }, frame_count: 0 };

beforeEach(() => {
  setStateReference(view);
  view.zoom = 1;
  view.frame_count = 0;
  stars.length = 0;
  comets.length = 0;
  asteroids.length = 0;
  clearVisualCaches();
  setTier('full');
});

afterEach(() => {
  setTier('full');
  stars.length = 0;
  comets.length = 0;
  asteroids.length = 0;
});

/** A star at the origin, bright enough to light anything. */
function sunAt(x = 0, y = 0) {
  const star = new StarObject({ x, y }, { x: 0, y: 0 }, 1);
  stars.push(star);
  return star;
}

/** Draw a body at a chosen on-screen size by setting the zoom to suit. */
function drawAtScreenRadius(body, px) {
  view.zoom = px / body.radius;
  const ctx = recorder();
  body.draw(ctx);
  return ctx;
}

describe('detail follows size', () => {
  test('a planet under a few pixels draws a dot and nothing else', () => {
    const p = new Planet({ x: 200, y: 0 }, { x: 0, y: 0 }, 1);
    const ctx = drawAtScreenRadius(p, 2);
    // No clip, so no markings; no gradient, so no shading pass.
    expect(ctx.calls.some(c => c.name === 'clip')).toBe(false);
    expect(ctx.calls.some(c => c.name === 'createRadialGradient')).toBe(false);
    expect(ctx.calls.some(c => c.name === 'arc')).toBe(true);
  });

  test('at medium size it adds one shading pass, clipped', () => {
    const p = new Planet({ x: 200, y: 0 }, { x: 0, y: 0 }, 1);
    const ctx = drawAtScreenRadius(p, 6);
    expect(ctx.calls.some(c => c.name === 'clip')).toBe(true);
    const gradients = ctx.calls.filter(c => c.name === 'createRadialGradient');
    // One, on the canvas. Anything the bloom layer does is on a different
    // context and is not counted here.
    expect(gradients).toHaveLength(1);
  });

  test('at large size it adds body-specific detail', () => {
    const rocky = new Planet({ x: 200, y: 0 }, { x: 0, y: 0 }, 1);
    rocky.density = 'rocky';
    const ctx = drawAtScreenRadius(rocky, 40);
    // Maria: ellipses, which the medium-size draw does not make.
    expect(ctx.calls.filter(c => c.name === 'ellipse').length).toBeGreaterThan(
      0
    );
  });

  test('an asteroid is a circle when small and a silhouette when large', () => {
    const rock = new Asteroid({ x: 100, y: 0 }, { x: 0, y: 0 }, 1);
    const small = drawAtScreenRadius(rock, 4);
    expect(small.calls.filter(c => c.name === 'lineTo')).toHaveLength(0);
    const large = drawAtScreenRadius(rock, 30);
    // Nine vertices: one moveTo and eight lineTo, then closePath.
    expect(large.calls.filter(c => c.name === 'lineTo').length).toBeGreaterThan(
      5
    );
  });
});

describe('the quality tier picks features', () => {
  test('the low tier stops short of body-specific detail', () => {
    const rocky = new Planet({ x: 200, y: 0 }, { x: 0, y: 0 }, 1);
    rocky.density = 'rocky';

    setTier('full');
    const full = drawAtScreenRadius(rocky, 40);
    setTier('low');
    const low = drawAtScreenRadius(rocky, 40);

    expect(full.calls.filter(c => c.name === 'ellipse').length).toBeGreaterThan(
      0
    );
    expect(low.calls.filter(c => c.name === 'ellipse')).toHaveLength(0);
    // But it still shades: the tier is a budget, not a blank.
    expect(low.calls.some(c => c.name === 'createRadialGradient')).toBe(true);
  });

  test('the low tier draws a smaller total number of operations', () => {
    const g = new GasGiant({ x: 300, y: 0 }, { x: 0, y: 0 }, 2);
    setTier('full');
    const full = drawAtScreenRadius(g, 50);
    setTier('low');
    const low = drawAtScreenRadius(g, 50);
    expect(low.calls.length).toBeLessThan(full.calls.length);
  });
});

describe('markings stay inside the limb', () => {
  for (const [name, make] of [
    [
      'a rocky planet',
      () => {
        const p = new Planet({ x: 200, y: 0 }, { x: 0, y: 0 }, 1);
        p.density = 'rocky';
        return p;
      },
    ],
    [
      'an icy planet',
      () => {
        const p = new Planet({ x: 200, y: 0 }, { x: 0, y: 0 }, 4);
        p.density = 'icy';
        return p;
      },
    ],
    [
      'a gaseous planet',
      () => {
        const p = new Planet({ x: 200, y: 0 }, { x: 0, y: 0 }, 4);
        p.density = 'gaseous';
        return p;
      },
    ],
    ['a gas giant', () => new GasGiant({ x: 300, y: 0 }, { x: 0, y: 0 }, 4)],
  ]) {
    test(`${name} clips before it marks, and puts the state back`, () => {
      sunAt(0, 0);
      const ctx = drawAtScreenRadius(make(), 50);

      const firstClip = ctx.calls.findIndex(c => c.name === 'clip');
      expect(firstClip).toBeGreaterThan(-1);
      // Every clip is inside a save.
      const before = ctx.calls.slice(0, firstClip);
      expect(before.filter(c => c.name === 'save').length).toBeGreaterThan(
        before.filter(c => c.name === 'restore').length
      );
      // And the context is handed back exactly as it was found: an unbalanced
      // restore leaks a clip into every body drawn after this one.
      const { end, lowest } = balance(ctx);
      expect(end).toBe(0);
      expect(lowest).toBe(0);
    });
  }

  test('a comet leaves the context balanced too', () => {
    sunAt(0, 0);
    const c = new Comet({ x: auToSim(0.8), y: 0 }, { x: 0, y: 12 }, 0.5);
    comets.push(c);
    const ctx = drawAtScreenRadius(c, 20);
    expect(balance(ctx)).toEqual({ end: 0, lowest: 0 });
  });

  test('a star leaves the context balanced too', () => {
    const s = sunAt(0, 0);
    const ctx = drawAtScreenRadius(s, 30);
    expect(balance(ctx)).toEqual({ end: 0, lowest: 0 });
  });
});

describe('the same body draws the same way twice', () => {
  test('a rocky planet is identical between two draws', () => {
    sunAt(0, 0);
    const p = new Planet({ x: 200, y: 0 }, { x: 0, y: 0 }, 1);
    p.density = 'rocky';
    const a = drawAtScreenRadius(p, 40);
    const b = drawAtScreenRadius(p, 40);
    expect(shape(b)).toEqual(shape(a));
  });

  test('an asteroid keeps its silhouette across a cache clear', () => {
    const rock = new Asteroid({ x: 100, y: 0 }, { x: 0, y: 0 }, 1);
    const a = drawAtScreenRadius(rock, 30);
    clearVisualCaches();
    const b = drawAtScreenRadius(rock, 30);
    // Rebuilt from the seed, not remembered: the cache is an optimisation and
    // must not be the source of truth for what the rock looks like.
    expect(shape(b)).toEqual(shape(a));
  });

  test("a gas giant's rings have a fixed tilt", () => {
    const g = new GasGiant({ x: 300, y: 0 }, { x: 0, y: 0 }, 4);
    g.hasRings = true;
    const first = g.ringGeometry();
    const again = g.ringGeometry();
    expect(again).toBe(first);

    // A second giant built identically but with a different id gets its own.
    const h = new GasGiant({ x: 300, y: 0 }, { x: 0, y: 0 }, 4);
    h.hasRings = true;
    expect(h.ringGeometry().angle).not.toBe(first.angle);
    // Within thirty degrees of the equator, as a ring system is.
    expect(Math.abs(first.angle)).toBeLessThanOrEqual(Math.PI / 6);
    expect(first.inner).toBeLessThan(first.outer);
  });

  test('the rings are drawn behind the body and then in front of it', () => {
    const g = new GasGiant({ x: 300, y: 0 }, { x: 0, y: 0 }, 4);
    g.hasRings = true;
    const ctx = drawAtScreenRadius(g, 60);
    const rotates = ctx.calls
      .map((c, i) => (c.name === 'rotate' ? i : -1))
      .filter(i => i >= 0);
    // Two ring passes: one before the body's own arc and one after it.
    expect(rotates.length).toBeGreaterThanOrEqual(2);
    const bodyArc = ctx.calls.findIndex(
      c => c.name === 'arc' && Math.abs(c.args[2] - g.radius) < 1e-9
    );
    expect(bodyArc).toBeGreaterThan(rotates[0]);
    expect(rotates[rotates.length - 1]).toBeGreaterThan(bodyArc);
  });
});

describe("a comet's tails, through the real draw path", () => {
  test('the ion tail leaves along the line from the star, not from the velocity', () => {
    const star = sunAt(0, 0);
    // Directly above the star, moving to the right: anti-solar is up,
    // anti-velocity is left.
    const c = new Comet({ x: 0, y: auToSim(0.6) }, { x: 25, y: 0 }, 0.5);
    comets.push(c);
    const ctx = drawAtScreenRadius(c, 16);

    const grads = ctx.calls.filter(c2 => c2.name === 'createLinearGradient');
    expect(grads.length).toBeGreaterThan(0);
    // The first linear gradient is the ion tail, from the nucleus outward.
    const [x0, y0, x1, y1] = grads[0].args;
    expect(x1 - x0).toBeCloseTo(0, 6);
    expect(y1 - y0).toBeGreaterThan(0);
    expect(star.pos.y).toBe(0);
  });

  test('a cold comet has no coma and no tails at all', () => {
    sunAt(0, 0);
    // Twenty astronomical units out: nothing has sublimated.
    const c = new Comet({ x: auToSim(20), y: 0 }, { x: 0, y: 3 }, 0.5);
    comets.push(c);
    const ctx = drawAtScreenRadius(c, 16);
    expect(ctx.calls.some(c2 => c2.name === 'createLinearGradient')).toBe(
      false
    );
    expect(ctx.calls.some(c2 => c2.name === 'createRadialGradient')).toBe(
      false
    );
    // Still a nucleus, so it is visible and clickable.
    expect(ctx.calls.some(c2 => c2.name === 'arc')).toBe(true);
  });

  test('with no star in the scene there is only a nucleus', () => {
    const c = new Comet({ x: 100, y: 0 }, { x: 0, y: 3 }, 0.5);
    comets.push(c);
    const ctx = drawAtScreenRadius(c, 16);
    expect(ctx.calls.some(c2 => c2.name === 'createLinearGradient')).toBe(
      false
    );
    expect(ctx.calls.filter(c2 => c2.name === 'arc').length).toBe(1);
  });

  test('activity grows as the comet comes in', () => {
    sunAt(0, 0);
    const near = new Comet({ x: auToSim(0.7), y: 0 }, { x: 0, y: 20 }, 0.5);
    const mid = new Comet({ x: auToSim(2.2), y: 0 }, { x: 0, y: 12 }, 0.5);
    comets.push(near, mid);
    const nearCtx = drawAtScreenRadius(near, 16);
    const midCtx = drawAtScreenRadius(mid, 16);
    const spread = ctx =>
      ctx.calls.filter(c => c.name === 'lineTo' || c.name === 'moveTo').length;
    expect(spread(nearCtx)).toBeGreaterThan(0);
    // The far one is past the onset, so it draws less or nothing.
    expect(spread(midCtx)).toBeLessThanOrEqual(spread(nearCtx));
  });
});
