import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  niceLength,
  niceScaleLength,
  angleAtVertex,
  bearingDegrees,
  LatchStopwatch,
} from '../js/instruments.js';
import { AU_METERS } from '../js/constants.js';

// The arithmetic behind the ruler, the protractor, the stopwatch and the scale
// bar. It is tested here rather than through the canvas because none of it is
// about drawing: a ruler that reports the wrong distance is wrong whether or
// not anyone can see it, and a scale bar that rounds 0.224 AU to "0.224 AU" is
// a scale nobody can read off.

describe('scale bar rounding', () => {
  test('rounds to 1, 2, 5 and their decades', () => {
    expect(niceLength(1)).toBe(1);
    expect(niceLength(1.4)).toBe(1);
    expect(niceLength(1.6)).toBe(2);
    expect(niceLength(3.4)).toBe(2);
    expect(niceLength(3.6)).toBe(5);
    expect(niceLength(7.4)).toBe(5);
    expect(niceLength(7.6)).toBe(10);
    expect(niceLength(340)).toBe(200);
    expect(niceLength(0.034)).toBe(0.02);
  });

  test('a nonsense target does not produce a nonsense bar', () => {
    // A zero-width canvas, or a scene with no zoom yet, reaches this.
    for (const bad of [0, -5, NaN, Infinity]) {
      expect(Number.isFinite(niceLength(bad))).toBe(true);
      expect(niceLength(bad)).toBeGreaterThan(0);
    }
  });

  test('the unit is chosen before the rounding, not after', () => {
    // Rounding metres and then converting is what produces a bar labelled
    // "0.224 AU", which reads as an accident rather than as a scale.
    const wide = niceScaleLength(0.34 * AU_METERS);
    expect(wide.unit).toBe('AU');
    expect(wide.value).toBe(0.2);
    expect(wide.text).toBe('0.2 AU');
  });

  test('short bars are labelled in kilometres', () => {
    const near = niceScaleLength(4.2e6);
    expect(near.unit).toBe('km');
    expect(near.value).toBe(5000);
    expect(near.text).toBe('5,000 km');
  });

  test('the labelled length really is the length of the bar', () => {
    // The property that matters: the number printed on the bar and the length
    // the bar is drawn at are the same quantity. A scale bar whose label and
    // geometry disagreed would be worse than no scale bar.
    for (const meters of [1e5, 1e8, 0.5 * AU_METERS, 40 * AU_METERS]) {
      const s = niceScaleLength(meters);
      const asMeters = s.unit === 'AU' ? s.value * AU_METERS : s.value * 1000;
      expect(s.meters / asMeters).toBeCloseTo(1, 12);
    }
  });

  test('the bar stays within half again of the space it was offered', () => {
    // It rounds to the nearest round number rather than down, so it can run a
    // little past the width it was given - at most from 3.5 to 5, a factor of
    // 1.43. Every caller leaves room after the bar for its label, so that is
    // affordable; a bar that could double would not be.
    for (let e = -2; e <= 3; e += 0.13) {
      const meters = 10 ** e * AU_METERS;
      const s = niceScaleLength(meters);
      expect(s.meters / meters).toBeLessThan(1.5);
      expect(s.meters / meters).toBeGreaterThan(0.6);
    }
  });
});

describe('protractor geometry', () => {
  const V = { x: 0, y: 0 };

  test('a right angle reads ninety degrees', () => {
    expect(angleAtVertex(V, { x: 5, y: 0 }, { x: 0, y: 5 })).toBeCloseTo(90, 9);
  });

  test('the reading does not depend on which arm came first', () => {
    const a = { x: 3, y: 1 };
    const b = { x: -2, y: 4 };
    expect(angleAtVertex(V, a, b)).toBeCloseTo(angleAtVertex(V, b, a), 9);
  });

  test('it is always the angle the arc encloses, never its reflex', () => {
    // Two arms 250 degrees apart the long way round enclose 110 the short way.
    // A protractor that reported 250 on one side and 110 on the other would be
    // measuring the order of the clicks.
    const at = deg => ({
      x: Math.cos((deg * Math.PI) / 180),
      y: Math.sin((deg * Math.PI) / 180),
    });
    expect(angleAtVertex(V, at(0), at(250))).toBeCloseTo(110, 9);
    expect(angleAtVertex(V, at(0), at(180))).toBeCloseTo(180, 9);
    expect(angleAtVertex(V, at(10), at(350))).toBeCloseTo(20, 9);
  });

  test('the arm length does not change the angle', () => {
    const near = angleAtVertex(V, { x: 1, y: 0 }, { x: 1, y: 1 });
    const far = angleAtVertex(V, { x: 900, y: 0 }, { x: 900, y: 900 });
    expect(near).toBeCloseTo(45, 9);
    expect(far).toBeCloseTo(45, 9);
  });

  test('a nearly-parallel pair keeps its precision', () => {
    // The reason this uses atan2 of the cross and dot products rather than
    // acos of the dot product: acos loses half its digits here, which is
    // exactly the case a student measuring a small angle is in.
    const tiny = angleAtVertex(V, { x: 1, y: 0 }, { x: 1, y: 1e-7 });
    expect(tiny).toBeCloseTo((1e-7 * 180) / Math.PI, 12);
  });

  test('a zero-length arm has no angle rather than a wrong one', () => {
    expect(Number.isNaN(angleAtVertex(V, V, { x: 1, y: 0 }))).toBe(true);
  });

  test('bearings run counterclockwise from east', () => {
    expect(bearingDegrees(V, { x: 1, y: 0 })).toBeCloseTo(0, 9);
    expect(bearingDegrees(V, { x: 0, y: 1 })).toBeCloseTo(90, 9);
    expect(bearingDegrees(V, { x: -1, y: 0 })).toBeCloseTo(180, 9);
    expect(bearingDegrees(V, { x: 0, y: -1 })).toBeCloseTo(270, 9);
  });
});

describe('the stopwatch', () => {
  let watch;
  beforeEach(() => {
    watch = new LatchStopwatch();
  });

  test('reads nothing before it is marked', () => {
    watch.running = true;
    watch.tick(5);
    expect(watch.elapsed()).toBeNull();
    expect(watch.status()).toBe('idle');
  });

  test('measures the interval since the mark', () => {
    watch.mark();
    watch.tick(3);
    watch.tick(4);
    expect(watch.elapsed()).toBeCloseTo(7, 12);
    expect(watch.status()).toBe('running');
  });

  test('a stopped reading holds while the clock keeps going', () => {
    watch.mark();
    watch.tick(10);
    watch.stop();
    watch.tick(100);
    expect(watch.elapsed()).toBeCloseTo(10, 12);
    expect(watch.status()).toBe('stopped');
    expect(watch.laps[0]).toBeCloseTo(10, 12);
  });

  test('pausing the clock pauses the reading', () => {
    // It runs on simulated time, so pausing the simulation has to pause it or
    // a measured period would depend on how long the student left it paused.
    watch.mark();
    watch.tick(4);
    watch.running = false;
    watch.tick(50);
    expect(watch.elapsed()).toBeCloseTo(4, 12);
    expect(watch.status()).toBe('paused');
  });

  test('marking again starts a fresh interval', () => {
    watch.mark();
    watch.tick(6);
    watch.mark();
    watch.tick(2);
    expect(watch.elapsed()).toBeCloseTo(2, 12);
  });
});

describe('latching the stopwatch to periapsis', () => {
  /**
   * Drive the latch with a body on a circular-plus-radial-oscillation orbit:
   * a distance that dips to a minimum once per period, which is all a periapsis
   * detector is entitled to assume.
   * @param {LatchStopwatch} watch - The clock
   * @param {number} period - Simulated time between minima
   * @param {number} dt - Step
   * @param {number} span - Total time to run
   * @param {number} phase - Where in the cycle to start
   * @returns {Array<number>} The simulated times passages were detected at
   */
  const orbit = (watch, period, dt, span, phase = 0) => {
    const fired = [];
    for (let t = 0; t < span; t += dt) {
      const r = 100 - 30 * Math.cos((2 * Math.PI * (t + phase)) / period);
      watch.tick(dt);
      if (watch.feedRadius(r)) fired.push(watch.now);
    }
    return fired;
  };

  test('measures the period from one periapsis to the next', () => {
    const watch = new LatchStopwatch();
    watch.latchTo(7);
    const period = 40;
    orbit(watch, period, 0.05, 260);
    // The first passage arms the clock and each one after it closes a lap, so
    // five laps come out of six passages over six periods.
    expect(watch.laps.length).toBeGreaterThanOrEqual(3);
    for (const lap of watch.laps) expect(lap).toBeCloseTo(period, 1);
  });

  test('the measured period does not depend on the step size', () => {
    const periods = [];
    for (const dt of [0.2, 0.05, 0.01]) {
      const watch = new LatchStopwatch();
      watch.latchTo(1);
      orbit(watch, 40, dt, 220);
      periods.push(watch.laps[0]);
    }
    for (const p of periods) expect(p).toBeCloseTo(40, 0);
  });

  test('a body at a constant radius never fires the latch', () => {
    // A perfectly circular orbit has no periapsis, and a detector that fired
    // on every frame there would report a period of one timestep.
    const watch = new LatchStopwatch();
    watch.latchTo(2);
    for (let i = 0; i < 500; i++) {
      watch.tick(0.1);
      watch.feedRadius(100);
    }
    expect(watch.laps.length).toBe(0);
    expect(watch.elapsed()).toBeNull();
  });

  test('an unlatched clock ignores radii entirely', () => {
    const watch = new LatchStopwatch();
    orbit(watch, 40, 0.05, 200);
    expect(watch.laps.length).toBe(0);
  });

  test('unlatching leaves the clock usable by hand', () => {
    const watch = new LatchStopwatch();
    watch.latchTo(3);
    orbit(watch, 40, 0.05, 130);
    watch.latchTo(null);
    watch.mark();
    watch.tick(9);
    expect(watch.elapsed()).toBeCloseTo(9, 12);
    expect(watch.feedRadius(1)).toBe(false);
  });
});
