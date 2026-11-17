import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  updatePhysics,
  updatePhysicsSettings,
  setStateReference,
  resetTrailTick,
  bh_list,
  planets,
  stars,
  gas_giants,
  asteroids,
  debris,
  particles,
  neutron_stars,
  white_dwarfs,
  Planet,
  StarObject,
  DT,
} from '../js/physics.js';
import {
  getTrailTime,
  trailSpan,
  setDetailScale,
} from '../js/engine/state.js';
import { setTier } from '../js/quality.js';
import { frameAdvance, substepPlan } from '../js/timestep.js';
import {
  TRAIL_REFERENCE_DT,
  trailReferenceStep,
  trailSpanTime,
} from '../js/trailSpan.js';
import '../js/bodyEffects.js';

// A trail is a stated stretch of simulated time. The frame rate sets how big a
// physics step is, and a trail that counted steps covered a third as much orbit
// on a busy machine as on an idle one. These drive the real engine at three
// frame rates and read the span back off the recorded points.

const lists = [
  bh_list,
  planets,
  stars,
  gas_giants,
  asteroids,
  debris,
  particles,
  neutron_stars,
  white_dwarfs,
];

/** A star and a planet on a circular orbit, with the trail setting given. */
function build(trailLength, maxTimestep = 0) {
  for (const l of lists) l.length = 0;
  updatePhysicsSettings({
    gravitational_constant: 2,
    mutual_gravity: false,
    follow_mode: 'None',
    bh_behavior: 'Static',
    max_timestep: maxTimestep,
    trail_length: trailLength,
  });
  setStateReference({ frame_count: 0, zoom: 1, pan: { x: 0, y: 0 } });
  updatePhysics(0.001);
  resetTrailTick();
  const star = new StarObject({ x: 0, y: 0 }, { x: 0, y: 0 }, 1);
  const planet = new Planet({ x: 100, y: 0 }, { x: 0, y: 4.47 }, 1);
  stars.push(star);
  planets.push(planet);
  return planet;
}

/** Run the engine at a frame rate for `seconds` of wall clock, at 1x. */
function runAt(fps, seconds, maxTimestep = 0) {
  const frames = Math.round(fps * seconds);
  const advance = frameAdvance(1 / fps, 1, DT);
  const plan = substepPlan(advance, maxTimestep);
  for (let f = 0; f < frames; f++) {
    for (let s = 0; s < plan.substeps; s++) updatePhysics(plan.step);
  }
}

/** The simulated time from the oldest to the newest recorded point. */
const spanOf = body => {
  const t = body.trail;
  return t[t.length - 1].t - t[0].t;
};

describe('a trail spans a stated time', () => {
  beforeEach(() => {
    setTier('full');
    setDetailScale(1);
  });

  test('the reference DT is the engine DT', () => {
    expect(TRAIL_REFERENCE_DT).toBe(DT);
  });

  test('the span is the same at 30, 60 and 144 frames per second', () => {
    const spans = {};
    for (const fps of [30, 60, 144]) {
      const planet = build(40);
      runAt(fps, 12);
      spans[fps] = spanOf(planet);
    }
    const values = Object.values(spans);
    const ratio = Math.max(...values) / Math.min(...values);
    expect(ratio).toBeLessThanOrEqual(1.05);
    // And it is the stated duration, to within one sample.
    const stated = trailSpan();
    for (const v of values) {
      expect(v).toBeLessThanOrEqual(stated);
      expect(v).toBeGreaterThan(stated - 2 * trailReferenceStep(0));
    }
  });

  test('at the reference conditions it keeps the samples it always did', () => {
    const planet = build(40);
    runAt(60, 6);
    expect(planet.trail.length).toBe(40);
    // Age is reference steps: 0 at the body, one less than the setting at the tail.
    expect(planet.trail[planet.trail.length - 1].age).toBeCloseTo(0, 9);
    expect(planet.trail[0].age).toBeGreaterThan(38);
    expect(planet.trail[0].age).toBeLessThan(40);
  });

  test('a faster frame rate does not add points beyond the setting', () => {
    const planet = build(40);
    runAt(144, 12);
    expect(planet.trail.length).toBeLessThanOrEqual(40);
  });

  test('a scenario that caps its step keeps its span', () => {
    const planet = build(40, 0.05);
    runAt(60, 12, 0.05);
    expect(spanOf(planet)).toBeLessThanOrEqual(trailSpan());
    expect(spanOf(planet)).toBeGreaterThan(
      trailSpan() - 2 * trailReferenceStep(0.05)
    );
    // trailSpan reads the same cap the step plan does.
    expect(trailSpan()).toBeCloseTo(trailSpanTime(40, 0.05), 12);
  });

  test('the low tier thins the samples and keeps the span', () => {
    setTier('full');
    const full = build(60);
    runAt(60, 12);
    const fullSpan = spanOf(full);
    const fullCount = full.trail.length;

    setTier('low');
    const low = build(60);
    runAt(60, 12);
    setTier('full');
    expect(spanOf(low)).toBeGreaterThan(fullSpan * 0.9);
    expect(spanOf(low)).toBeLessThanOrEqual(trailSpan());
    expect(low.trail.length).toBeLessThanOrEqual(Math.ceil(fullCount / 2) + 1);
    expect(low.trail.length).toBeGreaterThan(fullCount / 3);
  });

  test('adaptive detail thins the samples and keeps the span', () => {
    const planet = build(60);
    setDetailScale(0.5);
    runAt(60, 12);
    setDetailScale(1);
    expect(spanOf(planet)).toBeGreaterThan(trailSpan() * 0.9);
    expect(planet.trail.length).toBeLessThan(40);
  });

  test('a speed other than 1 does not stretch the trail', () => {
    const planet = build(40);
    // Five times the speed: the frame advances five times as far.
    const advance = frameAdvance(1 / 60, 5, DT);
    for (let f = 0; f < 200; f++) {
      const plan = substepPlan(advance, 0);
      for (let s = 0; s < plan.substeps; s++) updatePhysics(plan.step);
    }
    expect(spanOf(planet)).toBeLessThanOrEqual(trailSpan());
    expect(getTrailTime()).toBeGreaterThan(trailSpan());
  });
});

describe('the saved sample count keeps its meaning', () => {
  test('a count is that many reference steps, and the migration is the identity at 60 fps and 1x', () => {
    // The stored key and its numbers are unchanged. At the reference (60 fps,
    // speed 1) the engine took one step per sample, so N samples is N steps.
    for (const n of [5, 15, 100, 400]) {
      expect(trailSpanTime(n, 0)).toBeCloseTo(
        n * frameAdvance(1 / 60, 1, DT),
        12
      );
    }
    // A cap on the step makes the reference step the capped one.
    const plan = substepPlan(frameAdvance(1 / 60, 1, DT), 0.04);
    expect(trailReferenceStep(0.04)).toBeCloseTo(plan.step, 12);
  });
});
