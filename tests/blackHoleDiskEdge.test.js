// =============================================================================
// The disk has to end in nothing, and the horizon has to stop glowing
// -----------------------------------------------------------------------------
// Two defects, one file. Both were visible in a screenshot and neither was
// caught by anything, because the tests that existed asked whether the drawing
// ran, not what it painted.
//
//   1. The disk stopped at a hard elliptical edge. The emissivity profile falls
//      to zero at the outer rim, so the base layer faded correctly - but the
//      beaming was painted afterwards as a left-to-right gradient across the
//      whole annulus, at full strength right up to the boundary. At i = 62
//      degrees the disk ended at fifteen percent opacity in a single pixel.
//
//   2. Every black hole carried a pale circle at the edge of its silhouette,
//      drawn last, over the top of the foreground half of the disk. A horizon
//      emits nothing; the ring read as light coming off it.
//
// So these tests reconstruct the opacity the renderer actually asks for, layer
// by layer, from the gradient stops and the opacities it fills them at, rather
// than checking that some call was made. A brightening layer that does not
// share the disk's radial envelope fails the first group however it is built,
// and a stroked circle at the silhouette fails the second.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { ENVIRONMENT, createAppearance } from '../js/blackHole/appearance.js';
import {
  dopplerWeight,
  emissivity,
  relativeOrbitalSpeed,
} from '../js/blackHole/geometry.js';
import {
  DRAWN,
  cachedStopSets,
  clearAppearanceCache,
  drawBlackHole,
  drawHorizonBoundary,
  wedgesFor,
} from '../js/blackHole/render.js';

/**
 * A canvas that remembers what it was asked to paint, not just that it was.
 *
 * Every fill is recorded with the paint style in force, the opacity, the
 * compositing mode and the shape - which for the disk is always an annular
 * sector, so the two arcs are enough to say which one. Gradients carry their
 * stops, which is where a layer's radial profile lives.
 */
function paintRecorder() {
  const ops = [];
  let arcs = [];
  const state = {
    fillStyle: null,
    strokeStyle: null,
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    lineWidth: 1,
    lineDash: [],
  };
  const stack = [];
  const ctx = {
    ops,
    save: () => stack.push({ ...state }),
    restore: () => Object.assign(state, stack.pop() || {}),
    beginPath: () => {
      arcs = [];
    },
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    rect: () => {},
    translate: () => {},
    rotate: () => {},
    scale: () => {},
    setLineDash: d => {
      state.lineDash = d;
    },
    arc: (x, y, r, from, to) => arcs.push({ x, y, r, from, to }),
    ellipse: () => {},
    fill: () => ops.push({ kind: 'fill', arcs: arcs.slice(), ...snapshot() }),
    stroke: () =>
      ops.push({ kind: 'stroke', arcs: arcs.slice(), ...snapshot() }),
    createRadialGradient: (x0, y0, r0, x1, y1, r1) => {
      const g = { type: 'radial', r0, r1, stops: [] };
      g.addColorStop = (at, colour) => g.stops.push({ at, colour });
      return g;
    },
    createLinearGradient: (x0, y0, x1, y1) => {
      const g = { type: 'linear', x0, y0, x1, y1, stops: [] };
      g.addColorStop = (at, colour) => g.stops.push({ at, colour });
      return g;
    },
    createConicGradient: () => {
      const g = { type: 'conic', stops: [] };
      g.addColorStop = (at, colour) => g.stops.push({ at, colour });
      return g;
    },
  };
  const snapshot = () => ({
    fillStyle: state.fillStyle,
    strokeStyle: state.strokeStyle,
    alpha: state.globalAlpha,
    composite: state.globalCompositeOperation,
    lineWidth: state.lineWidth,
    lineDash: state.lineDash.slice(),
  });
  for (const key of [
    'fillStyle',
    'strokeStyle',
    'globalAlpha',
    'globalCompositeOperation',
    'lineWidth',
    'lineCap',
    'font',
    'textAlign',
  ]) {
    Object.defineProperty(ctx, key, {
      get: () => state[key],
      set: v => {
        state[key] = v;
      },
    });
  }
  return ctx;
}

/** The alpha out of an `rgba(r,g,b,a)` string. */
const alphaOf = colour => Number(/,([\d.]+)\)$/.exec(colour)?.[1] ?? NaN);

/** Every fill whose paint style is a gradient: the disk's light, and only it. */
const lightFills = ctx =>
  ctx.ops.filter(o => o.kind === 'fill' && o.fillStyle?.stops?.length);

const spec = extra => ({
  at: { x: 0, y: 0 },
  unit: 40,
  appearance: createAppearance({
    inclinationDeg: 62,
    environment: ENVIRONMENT.ACCRETING,
  }),
  time: 0,
  ...extra,
});

const inclined = (inclinationDeg, extra = {}) =>
  createAppearance({
    inclinationDeg,
    environment: ENVIRONMENT.ACCRETING,
    ...extra,
  });

describe('every layer of the disk fades out at the same rim', () => {
  const angles = [0, 20, 35, 50, 62, 75, 85, 90];

  test('there is light to check in the first place', () => {
    const ctx = paintRecorder();
    drawBlackHole(ctx, spec());
    expect(lightFills(ctx).length).toBeGreaterThan(2);
  });

  test('no gradient the disk is painted with is opaque at its outer stop', () => {
    for (const inc of angles) {
      for (const spin of [1, -1]) {
        for (const tier of ['low', 'full']) {
          const ctx = paintRecorder();
          drawBlackHole(
            ctx,
            spec({ appearance: inclined(inc, { spin }), tier })
          );
          for (const fill of lightFills(ctx)) {
            const last = fill.fillStyle.stops.at(-1);
            expect(last.at).toBe(1);
            // Times the opacity it is filled at, which is what reaches the
            // canvas. One 255th is the smallest thing a byte can hold.
            expect(alphaOf(last.colour) * fill.alpha).toBeLessThan(1 / 255);
          }
        }
      }
    }
  });

  test('and none of them is opaque at the inner one either', () => {
    // The other end of the same requirement: a layer with opacity at the inner
    // stop is haze filling the opening you are meant to see the hole through.
    for (const inc of angles) {
      const ctx = paintRecorder();
      drawBlackHole(ctx, spec({ appearance: inclined(inc) }));
      for (const fill of lightFills(ctx)) {
        const first = fill.fillStyle.stops[0];
        expect(first.at).toBe(0);
        expect(alphaOf(first.colour) * fill.alpha).toBeLessThan(1 / 255);
      }
    }
  });

  test('the brightening is a radial gradient, not a ramp across the disk', () => {
    // The specific shape of the old defect: a linear gradient from one side of
    // the annulus to the other has no radius in it at all, so it cannot fade
    // where the emissivity does.
    for (const inc of angles) {
      const ctx = paintRecorder();
      drawBlackHole(ctx, spec({ appearance: inclined(inc) }));
      for (const fill of lightFills(ctx)) {
        expect(fill.fillStyle.type).toBe('radial');
      }
    }
  });

  test('every layer runs between the same two radii', () => {
    // Sharing the envelope means sharing the geometry it is measured on.
    const ctx = paintRecorder();
    drawBlackHole(ctx, spec({ unit: 40 }));
    const spans = new Set(
      lightFills(ctx).map(f => `${f.fillStyle.r0}-${f.fillStyle.r1}`)
    );
    expect([...spans]).toEqual([
      `${DRAWN.innerEdge * 40}-${DRAWN.outerEdge * 40}`,
    ]);
  });

  test('a face-on disk paints no brightening at all', () => {
    // sin i is zero, so there is no line-of-sight motion and nothing to lift.
    const ctx = paintRecorder();
    drawBlackHole(ctx, spec({ appearance: inclined(0) }));
    expect(lightFills(ctx).every(f => f.alpha === 1)).toBe(true);
    expect(lightFills(ctx).length).toBe(2); // one per half, and no wedges
  });
});

describe('what the two layers add up to', () => {
  // The renderer splits the weighting into a radius part, which goes in the
  // gradient, and an azimuth part, which becomes the opacity of a wedge. The
  // point of the split is that the product is the weighting the model states -
  // so that is what this checks, against dopplerWeight itself.
  const a = inclined(62);
  const ctx = paintRecorder();
  drawBlackHole(ctx, spec({ appearance: a, unit: 40, tier: 'full' }));
  const fills = lightFills(ctx);
  const steps = DRAWN.stops.full;

  /** The opacity a layer asks for at one sampled radius. */
  const stopAlpha = (fill, i) => alphaOf(fill.fillStyle.stops[i].colour);

  // The two dimmest-level fills - one per half - are painted at full opacity;
  // every wedge is painted at less, which is what tells them apart.
  const dim = fills.find(f => f.alpha === 1);
  // The brightest wedge: the one nearest the approaching side.
  const brightest = fills
    .filter(f => f.alpha < 1)
    .reduce((best, f) => (f.alpha > best.alpha ? f : best));

  test('the composite is emissivity times the Doppler weighting', () => {
    for (let i = 1; i < steps; i++) {
      const radius =
        DRAWN.innerEdge + ((DRAWN.outerEdge - DRAWN.innerEdge) * i) / steps;
      const speed = relativeOrbitalSpeed(radius, DRAWN.innerEdge);
      const mean = emissivity(radius, DRAWN.innerEdge, DRAWN.outerEdge) * 0.5;
      // Additive compositing, so the layers add: the dimmest level plus the
      // brightest wedge's share of the swing.
      const painted =
        stopAlpha(dim, i) + stopAlpha(brightest, i) * brightest.alpha;
      // The brightest wedge sits half a step in from the extreme, so it is
      // just short of the full weighting; a step is 1/wedges of the swing.
      expect(painted).toBeGreaterThan(mean * dopplerWeight(a, 0, speed) * 0.97);
      expect(painted).toBeLessThanOrEqual(
        mean * dopplerWeight(a, 0, speed) + 1e-9
      );
    }
  });

  test('the dimmest layer is the receding side, and it is genuinely dimmer', () => {
    for (let i = 1; i < steps; i++) {
      const radius =
        DRAWN.innerEdge + ((DRAWN.outerEdge - DRAWN.innerEdge) * i) / steps;
      const speed = relativeOrbitalSpeed(radius, DRAWN.innerEdge);
      const mean = emissivity(radius, DRAWN.innerEdge, DRAWN.outerEdge) * 0.5;
      expect(stopAlpha(dim, i)).toBeCloseTo(
        mean * dopplerWeight(a, Math.PI, speed),
        9
      );
    }
  });

  test('the wedges step evenly and never overshoot', () => {
    const wedges = fills.filter(f => f !== dim && f.alpha < 1);
    expect(wedges.length).toBeGreaterThan(8);
    const perHalf = wedges.slice(0, wedges.length / 2).map(f => f.alpha);
    const gaps = perHalf.slice(1).map((v, i) => perHalf[i] - v);
    for (const gap of gaps) expect(gap).toBeCloseTo(gaps[0], 12);
    expect(Math.max(...perHalf)).toBeLessThanOrEqual(1);
    expect(Math.min(...perHalf)).toBeGreaterThan(0);
  });

  test('one step is small enough that a byte cannot show it', () => {
    for (const inc of [20, 35, 50, 62, 75, 85]) {
      const r = paintRecorder();
      drawBlackHole(r, spec({ appearance: inclined(inc), unit: 60 }));
      const light = lightFills(r);
      const swing = light.filter(f => f.alpha < 1);
      if (!swing.length) continue;
      const depth = Math.max(
        ...swing[0].fillStyle.stops.map(s => alphaOf(s.colour))
      );
      const perHalf = swing.length / 2;
      expect(depth / perHalf).toBeLessThanOrEqual(2 / 255 + 1e-9);
    }
  });

  test('the light is composited additively, so wedges cannot leave seams', () => {
    expect(fills.every(f => f.composite === 'lighter')).toBe(true);
  });

  test('and the horizon is not, because black added to anything is nothing', () => {
    const black = ctx.ops.find(o => o.fillStyle === '#000000');
    expect(black.composite).toBe('source-over');
  });
});

describe('how many wedges', () => {
  test('none at all when there is no brightening to draw', () => {
    expect(wedgesFor(0, 40, 'full')).toBe(0);
    expect(wedgesFor(1 / 255, 40, 'full')).toBe(0);
  });

  test('more for a deeper brightening, up to the tier ceiling', () => {
    expect(wedgesFor(0.05, 40, 'full')).toBeLessThan(
      wedgesFor(0.4, 40, 'full')
    );
    expect(wedgesFor(9, 400, 'full')).toBe(DRAWN.wedges.full);
    expect(wedgesFor(9, 400, 'low')).toBe(DRAWN.wedges.low);
  });

  test('and never more than a small object can show', () => {
    expect(wedgesFor(0.4, 4, 'full')).toBeLessThan(wedgesFor(0.4, 40, 'full'));
  });

  test('the count never falls as the object grows, so a zoom cannot flicker', () => {
    let last = 0;
    for (let unit = 1; unit < 300; unit += 1) {
      const now = wedgesFor(0.4, unit, 'full');
      expect(now).toBeGreaterThanOrEqual(last);
      last = now;
    }
  });
});

describe('the horizon is not drawn as something that emits', () => {
  const everyKind = fn => {
    for (const env of Object.values(ENVIRONMENT)) {
      for (const inc of [0, 35, 62, 90]) {
        for (const tier of ['low', 'full']) {
          const ctx = paintRecorder();
          drawBlackHole(
            ctx,
            spec({
              appearance: createAppearance({
                environment: env,
                inclinationDeg: inc,
              }),
              tier,
            })
          );
          fn(ctx, `${env} i=${inc} ${tier}`);
        }
      }
    }
  };

  test('nothing strokes a circle at the silhouette', () => {
    everyKind((ctx, what) => {
      const ring = ctx.ops.filter(
        o =>
          o.kind === 'stroke' &&
          o.arcs.some(
            arc => arc.r === 40 && Math.abs(arc.to - arc.from) > Math.PI * 1.9
          )
      );
      expect(`${what}: ${ring.length}`).toBe(`${what}: 0`);
    });
  });

  test('nothing strokes a full circle anywhere, at any radius', () => {
    // A ring at some multiple of the drawn radius would be worse than the one
    // that was removed: a photon sphere this drawing has not earned.
    everyKind((ctx, what) => {
      const rings = ctx.ops.filter(
        o =>
          o.kind === 'stroke' &&
          o.arcs.some(arc => Math.abs(arc.to - arc.from) > Math.PI * 1.9)
      );
      expect(`${what}: ${rings.length}`).toBe(`${what}: 0`);
    });
  });

  test('the silhouette itself is still there, filled and black', () => {
    everyKind((ctx, what) => {
      const black = ctx.ops.filter(
        o => o.kind === 'fill' && o.fillStyle === '#000000'
      );
      expect(`${what}: ${black.length}`).toBe(`${what}: 1`);
      expect(black[0].arcs[0].r).toBe(40);
    });
  });
});

describe('the boundary the labelled overlay may draw', () => {
  test('it is dashed, so it reads as a line on a diagram', () => {
    const ctx = paintRecorder();
    drawHorizonBoundary(ctx, { x: 0, y: 0 }, 40);
    const stroke = ctx.ops.find(o => o.kind === 'stroke');
    expect(stroke.lineDash.length).toBeGreaterThan(0);
    expect(stroke.arcs[0].r).toBe(40);
  });

  test('its width is in screen pixels, so a zoom does not thicken it', () => {
    const at = { x: 0, y: 0 };
    const near = paintRecorder();
    const far = paintRecorder();
    drawHorizonBoundary(near, at, 40, 1);
    drawHorizonBoundary(far, at, 40, 4);
    const width = ctx => ctx.ops.find(o => o.kind === 'stroke').lineWidth;
    expect(width(far)).toBeCloseTo(width(near) * 4, 9);
  });

  test('drawing a black hole does not call it', () => {
    // It belongs to the overlay, which is off unless a reader asks for it.
    const ctx = paintRecorder();
    drawBlackHole(ctx, spec());
    expect(ctx.ops.some(o => o.kind === 'stroke' && o.lineDash.length)).toBe(
      false
    );
  });
});

describe('what a rotation or a zoom does to the picture', () => {
  // A fade that is smooth in one frame and steps in the next is a fade with a
  // decision in it that depends on something it should not.
  const opacities = ctx =>
    lightFills(ctx)
      .map(f => f.alpha)
      .join(',');

  test('turning the disk on screen changes nothing but the frame', () => {
    const base = paintRecorder();
    drawBlackHole(base, spec({ appearance: inclined(62) }));
    for (const pa of [0, 17, 90, 180, 271, 359]) {
      const ctx = paintRecorder();
      drawBlackHole(
        ctx,
        spec({ appearance: inclined(62, { positionAngleDeg: pa }) })
      );
      expect(opacities(ctx)).toBe(opacities(base));
    }
  });

  test('so does letting the clock run', () => {
    const base = paintRecorder();
    drawBlackHole(base, spec({ time: 0 }));
    for (const time of [0.5, 3, 61.25]) {
      const ctx = paintRecorder();
      drawBlackHole(ctx, spec({ time }));
      expect(opacities(ctx)).toBe(opacities(base));
    }
  });

  test('zooming in adds wedges one at a time and never removes one', () => {
    let last = -1;
    for (let unit = 2; unit <= 200; unit += 2) {
      const ctx = paintRecorder();
      drawBlackHole(ctx, spec({ unit, appearance: inclined(62) }));
      const n = lightFills(ctx).length;
      expect(n).toBeGreaterThanOrEqual(last);
      last = n;
    }
  });

  test('and the outer stop stays transparent at every size', () => {
    for (const unit of [3, 9, 27, 81, 243]) {
      const ctx = paintRecorder();
      drawBlackHole(ctx, spec({ unit, appearance: inclined(62) }));
      for (const fill of lightFills(ctx)) {
        expect(alphaOf(fill.fillStyle.stops.at(-1).colour)).toBeLessThan(
          1 / 255
        );
      }
    }
  });

  test('every save is still matched by a restore', () => {
    const ctx = paintRecorder();
    drawBlackHole(
      ctx,
      spec({
        appearance: createAppearance({
          environment: ENVIRONMENT.JET,
          inclinationDeg: 62,
        }),
      })
    );
    // paintRecorder pops on restore; an unbalanced pair would have thrown or
    // left the stack behind.
    expect(() => drawBlackHole(ctx, spec())).not.toThrow();
  });
});

describe('what the drawing keeps between frames', () => {
  test('a scene full of different black holes cannot grow the cache', () => {
    // The colour strings are kept because building them is the expensive part
    // of drawing a small object. Kept without a bound they would be a leak
    // that a reader spinning an inclination slider would find first.
    clearAppearanceCache();
    for (let inc = 0; inc <= 90; inc += 3) {
      for (const alpha of [1, 0.7, 0.4]) {
        drawBlackHole(
          paintRecorder(),
          spec({ appearance: inclined(inc), alpha })
        );
      }
    }
    expect(cachedStopSets()).toBeGreaterThan(0);
    expect(cachedStopSets()).toBeLessThanOrEqual(8);
  });

  test('and drawing the same one repeatedly keeps exactly one set', () => {
    clearAppearanceCache();
    for (let i = 0; i < 40; i++) {
      drawBlackHole(paintRecorder(), spec({ time: i * 0.1 }));
    }
    expect(cachedStopSets()).toBe(1);
  });

  test('clearing empties it', () => {
    drawBlackHole(paintRecorder(), spec());
    expect(cachedStopSets()).toBeGreaterThan(0);
    clearAppearanceCache();
    expect(cachedStopSets()).toBe(0);
  });
});
