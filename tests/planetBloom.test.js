// =============================================================================
// A planet blooms once, in its own colour
// -----------------------------------------------------------------------------
// Planet.draw() carried two consecutive "Add soft bloom" blocks, both painting
// the same radial gradient at the same place into the same offscreen layer. The
// first used the planet's own base colour at low alpha; the second used a fixed
// pale blue at more than twice the alpha. Additively composited, the second one
// won, so every planet - Mars, Venus, a hand-coloured one - wore the same
// bluish halo, and every planet paid for two full gradients a frame to get it.
//
// One pass, the planet's colour, and the intensity the two of them together
// used to produce.
// =============================================================================

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { Planet, setStateReference } from '../js/physics.js';
import { setTier } from '../js/quality.js';

/** Records the gradients painted into the bloom layer. */
function bloomRecorder() {
  const gradients = [];
  const ctx = {
    fillStyle: null,
    createRadialGradient(x0, y0, r0, x1, y1, r1) {
      const stops = [];
      const g = {
        stops,
        addColorStop: (offset, color) => stops.push({ offset, color }),
      };
      gradients.push({ x: x1, y: y1, r: r1, stops });
      return g;
    },
    beginPath() {},
    arc() {},
    fill() {},
  };
  return { ctx, gradients };
}

/** Minimal 2D context for the body's own drawing. */
const nullContext = () => ({
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
  ellipse() {},
  rect() {},
  drawImage() {},
  translate() {},
  rotate() {},
  beginPath() {},
  closePath() {},
  fill() {},
  stroke() {},
  moveTo() {},
  lineTo() {},
  arc() {},
  fillRect() {},
  fillText() {},
  measureText: () => ({ width: 10 }),
  createLinearGradient: () => ({ addColorStop() {} }),
  createRadialGradient: () => ({ addColorStop() {} }),
});

const view = { paused: true, zoom: 4, pan: { x: 0, y: 0 } };
let recorder;
let previousBloom;

beforeEach(() => {
  setStateReference(view);
  recorder = bloomRecorder();
  previousBloom = Object.getOwnPropertyDescriptor(window, 'bloomCtx');
  Object.defineProperty(window, 'bloomCtx', {
    configurable: true,
    get: () => recorder.ctx,
  });
});

afterEach(() => {
  if (previousBloom) Object.defineProperty(window, 'bloomCtx', previousBloom);
  else delete window.bloomCtx;
});

describe('the bloom pass', () => {
  test('runs once per planet, not twice', () => {
    const planet = new Planet({ x: 0, y: 0 }, { x: 0, y: 0 });
    planet.draw(nullContext());
    expect(recorder.gradients).toHaveLength(1);
  });

  test('is the planet’s own colour, not a fixed blue', () => {
    const planet = new Planet({ x: 0, y: 0 }, { x: 0, y: 0 });
    // A colour nothing else in the palette is near, so a hard-coded value
    // cannot pass by coincidence.
    planet.baseColor = '#ff2200';
    planet.draw(nullContext());

    expect(recorder.gradients).toHaveLength(1);
    const inner = recorder.gradients[0].stops[0].color;
    const rgb = inner.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    expect(rgb).not.toBeNull();
    const [, r, g, b] = rgb.map(Number);
    expect(r).toBeGreaterThan(g);
    expect(r).toBeGreaterThan(b);
    expect(r).toBe(255);
    expect(g).toBe(34);
    expect(b).toBe(0);
  });

  test('keeps the brightness the two passes used to add up to', () => {
    const planet = new Planet({ x: 0, y: 0 }, { x: 0, y: 0 });
    planet.draw(nullContext());
    const stops = recorder.gradients[0].stops;
    const alphaAt = offset => {
      const stop = stops.find(s => s.offset === offset);
      const m = stop && stop.color.match(/rgba\([^)]*,\s*([\d.]+)\)/);
      return m ? Number(m[1]) : 0;
    };
    // 0.15 + 0.35 at the centre, 0.06 + 0.15 at the shoulder.
    expect(alphaAt(0)).toBeCloseTo(0.5, 6);
    expect(alphaAt(0.6)).toBeCloseTo(0.21, 6);
    expect(stops[stops.length - 1].color).toMatch(/,\s*0\)$/);
  });

  test('paints where the planet is, at the size it used to', () => {
    const planet = new Planet({ x: 30, y: -12 }, { x: 0, y: 0 });
    planet.draw(nullContext());
    const bloom = recorder.gradients[0];
    expect(bloom.r).toBeCloseTo(planet.radius * view.zoom * 2.5, 6);
  });

  test('does nothing at the low quality tier', () => {
    // The bloom layer is a second full-size canvas composited every frame, and
    // js/quality.js already names it as one of the passes the low tier exists
    // to skip. Reading window.bloomCtx is what arms that composite, so not
    // reading it is what switches it off.
    const planet = new Planet({ x: 0, y: 0 }, { x: 0, y: 0 });
    setTier('low');
    try {
      planet.draw(nullContext());
    } finally {
      setTier('full');
    }
    expect(recorder.gradients).toHaveLength(0);
  });
});
