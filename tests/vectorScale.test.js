import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  planets,
  stars,
  Planet,
  StarObject,
  updatePhysics,
  updatePhysicsSettings,
  setStateReference,
} from '../js/physics.js';
import '../js/bodyEffects.js';
import {
  drawBodyVectors,
  vectorLegendRows,
  resetVectorScale,
  fitFont,
  canvasRatio,
} from '../js/vectorOverlay.js';
import { trailSpanTime } from '../js/trailSpan.js';
import { formatTime } from '../js/units.js';

// An arrow's length is the magnitude it shows, on one scale for the scene, and
// the legend says what a centimetre of it is. A recording context stands in for
// the canvas: what matters is the length of the shaft drawn in each colour.

const VELOCITY_COLOR = '#3ef2a0';

/** A context that records each stroked shaft and the font it last set. */
function recorder({ width = 800, clientWidth = 800 } = {}) {
  const shafts = [];
  let first = null;
  let last = null;
  const ctx = {
    canvas: { width, clientWidth },
    strokeStyle: '',
    fillStyle: '',
    font: '',
    save() {},
    restore() {},
    beginPath() {
      first = null;
      last = null;
    },
    closePath() {},
    moveTo(x, y) {
      if (!first) first = [x, y];
      last = [x, y];
    },
    lineTo(x, y) {
      last = [x, y];
    },
    stroke() {
      if (this.strokeStyle === VELOCITY_COLOR && first && last) {
        shafts.push(Math.hypot(last[0] - first[0], last[1] - first[1]));
      }
    },
    fill() {},
    strokeText() {},
    fillText() {},
    setLineDash() {},
  };
  return { ctx, shafts };
}

const toScreen = p => ({ x: 400 + p.x, y: 300 - p.y });
const on = { show_velocity_vectors: true, show_acceleration_vectors: false };

/** A planet moving along +x at `speed` simulation units. */
function mover(speed, x = 0) {
  const p = new Planet({ x, y: 0 }, { x: speed, y: 0 }, 1);
  planets.push(p);
  return p;
}

/** The shaft length drawn for `body` (the second stroke of the arrow). */
function shaftFor(body, ctxOptions) {
  const { ctx, shafts } = recorder(ctxOptions);
  const drawn = drawBodyVectors(ctx, body, toScreen, on);
  return { drawn, shaft: shafts[shafts.length - 1], ctx };
}

describe('arrow length', () => {
  beforeEach(() => {
    planets.length = 0;
    stars.length = 0;
    resetVectorScale();
  });

  test('is monotonic in speed, on one scale for the scene', () => {
    const slow = mover(1, -100);
    const fast = mover(3, 100);
    const a = shaftFor(slow).shaft;
    const b = shaftFor(fast).shaft;
    expect(b).toBeGreaterThan(a * 1.15);
    // On a shared scale a body three times as fast has an arrow three times as
    // long (the shaft stops short of the head, so the ratio is close, not exact).
    expect(b / a).toBeGreaterThan(2.5);
    expect(b / a).toBeLessThan(3.5);
  });

  test('does not depend on which body is selected first', () => {
    const slow = mover(1, -100);
    const fast = mover(3, 100);
    const first = shaftFor(fast).shaft;
    resetVectorScale();
    const again = shaftFor(slow).shaft;
    expect(first / again).toBeGreaterThan(2.5);
  });

  test('the legend states the scale, and it agrees with the arrow', () => {
    const fast = mover(3, 100);
    mover(1, -100);
    const { drawn } = shaftFor(fast);
    const rows = vectorLegendRows(drawn);
    const text = rows.map(r => r.label).join(' | ');
    expect(text).toMatch(/Velocity arrow: 1 cm = [\d.,]+\s(km\/s|m\/s)/);
    // The value of the arrow itself is in the text, not only in its length.
    expect(rows[0].label).toMatch(/^velocity [\d.,]+\s(km\/s|m\/s)/);
    expect(rows.some(r => r.note)).toBe(true);
  });

  test('a slow body keeps a visible arrow and the legend says so', () => {
    mover(10, 100);
    const crawl = mover(0.01, -100);
    const { drawn, shaft } = shaftFor(crawl);
    expect(shaft).toBeGreaterThan(5);
    expect(drawn.velocityLimit).toBe('floor');
    const text = vectorLegendRows(drawn)
      .map(r => r.label)
      .join(' ');
    expect(text).toContain('shown at its shortest');
  });

  test('a body far faster than the scale does not leave the canvas', () => {
    const body = mover(1);
    shaftFor(body);
    body.vel.x = 3.5;
    const { drawn, shaft } = shaftFor(body);
    expect(drawn.velocityLimit).toBe('ceiling');
    expect(shaft).toBeLessThan(230);
    expect(
      vectorLegendRows(drawn)
        .map(r => r.label)
        .join(' ')
    ).toContain('shortened to fit');
  });

  test('on a display at twice the pixel ratio the arrow is the same size on screen', () => {
    const body = mover(2);
    const plain = shaftFor(body, { width: 800, clientWidth: 800 }).shaft;
    resetVectorScale();
    const hidpi = shaftFor(body, { width: 1600, clientWidth: 800 }).shaft;
    expect(hidpi / plain).toBeGreaterThan(1.9);
    expect(hidpi / plain).toBeLessThan(2.2);
  });

  test('keeps the direction, with the world y flipped', () => {
    const body = new Planet({ x: 0, y: 0 }, { x: 0, y: 2 }, 1);
    planets.push(body);
    const tips = [];
    const { ctx } = recorder();
    const lineTo = ctx.lineTo;
    ctx.lineTo = function (x, y) {
      tips.push([x, y]);
      return lineTo.call(this, x, y);
    };
    drawBodyVectors(ctx, body, toScreen, on);
    const shaftEnd = tips.find(([, y]) => y < 300);
    expect(shaftEnd).toBeDefined();
    expect(Math.abs(shaftEnd[0] - 400)).toBeLessThan(1e-6);
  });
});

describe('acceleration arrows', () => {
  const ACCEL = '#ff45c8';
  test('a stronger pull draws a longer arrow, with a stated scale', () => {
    planets.length = 0;
    stars.length = 0;
    resetVectorScale();
    updatePhysicsSettings({
      gravitational_constant: 2,
      mutual_gravity: false,
      follow_mode: 'None',
      bh_behavior: 'Static',
    });
    setStateReference({ frame_count: 0, zoom: 1, pan: { x: 0, y: 0 } });
    updatePhysics(0.001);
    stars.push(new StarObject({ x: 0, y: 0 }, { x: 0, y: 0 }, 1));
    const near = new Planet({ x: 100, y: 0 }, { x: 0, y: 4.4 }, 1);
    const far = new Planet({ x: 0, y: 300 }, { x: 2.5, y: 0 }, 1);
    planets.push(near, far);
    updatePhysics(0.01);
    const lengthOf = body => {
      const { ctx } = recorder();
      let first = null;
      let last = null;
      ctx.beginPath = () => {
        first = null;
      };
      ctx.moveTo = (x, y) => {
        first = first || [x, y];
        last = [x, y];
      };
      ctx.lineTo = (x, y) => {
        last = [x, y];
      };
      const out = [];
      ctx.stroke = function () {
        if (this.strokeStyle === ACCEL) {
          out.push(Math.hypot(last[0] - first[0], last[1] - first[1]));
        }
      };
      const drawn = drawBodyVectors(ctx, body, toScreen, {
        show_velocity_vectors: false,
        show_acceleration_vectors: true,
      });
      return { drawn, shaft: out[out.length - 1] };
    };
    const a = lengthOf(near);
    const b = lengthOf(far);
    // Gravity falls as 1/r^2: three times as far is a ninth of the pull, so
    // the far arrow is at the floor and the near one is the scene's longest.
    expect(a.shaft).toBeGreaterThan(b.shaft);
    expect(a.drawn.pull / b.drawn.pull).toBeGreaterThan(8);
    const rows = vectorLegendRows(a.drawn);
    expect(rows.map(r => r.label).join(' ')).toMatch(
      /Acceleration arrow: 1 cm = [\d.,]+\s(m\/s²|mm\/s²|µm\/s²)/
    );
    expect(rows[0].label).toMatch(/^acceleration [\d.,]+\s(m|mm|µm)\/s²/);
  });
});

describe('the trail line of the legend', () => {
  beforeEach(() => {
    updatePhysicsSettings({ trail_length: 90, max_timestep: 0, sim_speed: 1 });
  });

  test('states the span as a time, and only with trails on', () => {
    expect(vectorLegendRows(null, { show_trails: false })).toEqual([]);
    const rows = vectorLegendRows(null, { show_trails: true });
    expect(rows).toHaveLength(1);
    expect(rows[0].note).toBe(true);
    expect(rows[0].label).toBe(
      `Trails: the last ${formatTime(trailSpanTime(90, 0, 1))}`
    );
  });

  test('follows the stored length and the speed the world was built with', () => {
    const at = () => vectorLegendRows(null, { show_trails: true })[0].label;
    const base = at();
    updatePhysicsSettings({ trail_length: 180 });
    expect(at()).not.toBe(base);
    updatePhysicsSettings({ trail_length: 90, sim_speed: 4 });
    expect(at()).toBe(
      `Trails: the last ${formatTime(trailSpanTime(90, 0, 4))}`
    );
  });
});

describe('overlay label size', () => {
  test('a font is raised to 11 CSS pixels and scaled to the canvas', () => {
    const plain = { canvas: { width: 800, clientWidth: 800 } };
    const hidpi = { canvas: { width: 1600, clientWidth: 800 } };
    expect(fitFont(plain, '10px sans-serif')).toBe('11px sans-serif');
    expect(fitFont(plain, 'bold 13px sans-serif')).toBe('bold 13px sans-serif');
    expect(fitFont(hidpi, '600 11px mono')).toBe('600 22px mono');
    expect(fitFont(hidpi, 'bold 13px sans-serif')).toBe('bold 26px sans-serif');
    expect(canvasRatio({ canvas: { width: 300, clientWidth: 0 } })).toBe(1);
  });
});
