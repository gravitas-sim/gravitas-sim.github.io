import { describe, test, expect } from '@jest/globals';
import {
  PHASE_OUTCOME,
  createPhaseSampler,
  tickCeilingFor,
} from '../js/experiments/phaseSampler.js';

// =============================================================================
// The bookkeeping of a recorded phase, driven by a scripted clock
// -----------------------------------------------------------------------------
// A simulation cannot be made to stall on demand, and a permanent stall is
// exactly the case that was being misreported - so the clock here is a list of
// numbers and the sampler is asked what it would do about each one.
// =============================================================================

/**
 * Drive a sampler over a scripted clock and collect what it did.
 *
 * @param {object} cfg - Sampler configuration
 * @param {Array<number>} clocks - The clock at each animation frame
 * @returns {object} The sample times, and the sampler's own report
 */
function drive(cfg, clocks) {
  const sampler = createPhaseSampler(cfg);
  const dt = clocks.length ? clocks[0] : 0;
  const start = cfg.startClock ?? 0;
  const times = [];
  if (sampler.start(start)) times.push(start);
  void dt;
  for (const clock of clocks) {
    const step = sampler.tick(clock, false);
    if (step.sample) times.push(clock);
    if (step.done) break;
  }
  return { times, report: sampler.report() };
}

describe('a phase that advances normally', () => {
  test('N advances cover N steps and produce N+1 samples', () => {
    const dt = 0.5;
    const frames = 6;
    const clocks = Array.from({ length: frames }, (_, i) => (i + 1) * dt);
    const { times, report } = drive({ frames, maxSamples: 1000 }, clocks);

    expect(report.outcome).toBe(PHASE_OUTCOME.COMPLETE);
    expect(report.advancedFrames).toBe(frames);
    // Both endpoints: the initial state and the last advance.
    expect(times).toHaveLength(frames + 1);
    expect(times[0]).toBe(0);
    expect(times[times.length - 1]).toBeCloseTo(frames * dt, 12);
    // The span is what the phase claims to have covered, not one step short.
    expect(times[times.length - 1] - times[0]).toBeCloseTo(frames * dt, 12);
    expect(report.stalledFrames).toBe(0);
    expect(report.complete).toBe(true);
    expect(report.sampleCapHit).toBe(false);
    expect(report.stalledOut).toBe(false);
  });

  test('sample times are finite and strictly increasing', () => {
    const clocks = [1, 2, 3, 4, 5];
    const { times } = drive({ frames: 5, maxSamples: 1000 }, clocks);
    for (const t of times) expect(Number.isFinite(t)).toBe(true);
    for (let i = 1; i < times.length; i++) {
      expect(times[i]).toBeGreaterThan(times[i - 1]);
    }
  });
});

describe('a phase whose clock stutters', () => {
  test('non-advancing ticks produce no sample and no duplicate times', () => {
    // Every other frame does nothing: a throttled tab, a skipped step.
    const clocks = [1, 1, 2, 2, 3, 3, 4, 4];
    const { times, report } = drive({ frames: 4, maxSamples: 1000 }, clocks);

    expect(report.outcome).toBe(PHASE_OUTCOME.COMPLETE);
    expect(report.advancedFrames).toBe(4);
    expect(report.stalledFrames).toBe(3);
    expect(times).toEqual([0, 1, 2, 3, 4]);
    expect(new Set(times).size).toBe(times.length);
  });

  test('a stutter still covers the full span it was asked for', () => {
    const clocks = [0, 0, 0, 1, 1, 2, 2, 2, 3];
    const { times, report } = drive({ frames: 3, maxSamples: 1000 }, clocks);
    expect(report.complete).toBe(true);
    expect(times[times.length - 1] - times[0]).toBe(3);
  });
});

describe('a phase whose clock never moves', () => {
  test('it is stalled, not sample capped', () => {
    const frames = 4;
    const ceiling = tickCeilingFor(frames);
    // Far more ticks than the ceiling, and the clock never budges.
    const clocks = Array.from({ length: ceiling + 50 }, () => 0);
    const { times, report } = drive({ frames, maxSamples: 6 }, clocks);

    expect(report.outcome).toBe(PHASE_OUTCOME.STALLED);
    expect(report.stalledOut).toBe(true);
    // The distinction that was being lost: a run that measured nothing must
    // not be reported as one that measured too much.
    expect(report.sampleCapHit).toBe(false);
    expect(report.complete).toBe(false);
    expect(report.advancedFrames).toBe(0);
    // One sample: the initial state, and nothing repeated after it.
    expect(times).toEqual([0]);
    expect(report.ticks).toBe(ceiling);
  });

  test('a stall cannot exhaust the sample budget', () => {
    // Six samples allowed, hundreds of non-advancing ticks. Before the fix,
    // every tick pushed a sample and the run ended at the cap.
    const clocks = Array.from({ length: 500 }, () => 7);
    const { report } = drive(
      { frames: 10, maxSamples: 6, startClock: 7 },
      clocks
    );
    expect(report.samples).toBe(1);
    expect(report.sampleCapHit).toBe(false);
  });
});

describe('the sample cap', () => {
  test('it ends a genuinely productive run, and says so', () => {
    const clocks = Array.from({ length: 100 }, (_, i) => i + 1);
    const { times, report } = drive({ frames: 100, maxSamples: 5 }, clocks);

    expect(report.outcome).toBe(PHASE_OUTCOME.SAMPLE_CAPPED);
    expect(report.sampleCapHit).toBe(true);
    expect(report.complete).toBe(false);
    expect(report.stalledOut).toBe(false);
    // Five samples, all real, all at different times.
    expect(times).toHaveLength(5);
    expect(new Set(times).size).toBe(5);
    expect(report.advancedFrames).toBe(4);
  });
});

describe('stopping', () => {
  test('a cancelled phase is cancelled, not complete and not stalled', () => {
    const sampler = createPhaseSampler({ frames: 10, maxSamples: 100 });
    sampler.start(0);
    sampler.tick(1, false);
    const step = sampler.tick(2, true);
    expect(step.done).toBe(true);
    expect(step.sample).toBe(false);
    const report = sampler.report();
    expect(report.outcome).toBe(PHASE_OUTCOME.CANCELLED);
    expect(report.cancelled).toBe(true);
    expect(report.complete).toBe(false);
    expect(report.sampleCapHit).toBe(false);
  });
});

describe('two phases of one check stay aligned', () => {
  test('the same frame count gives the same span and the same sample count', () => {
    // The premise of a reliability check: coarse and fine cover identical
    // simulated durations. Same frames, same per-frame advance, so the spans
    // must match exactly - including the endpoint the initial sample provides.
    const frames = 8;
    const dt = 0.25;
    const coarse = drive(
      { frames, maxSamples: 1000 },
      Array.from({ length: frames }, (_, i) => (i + 1) * dt)
    );
    // The fine phase halves the step, so it takes twice as many engine
    // substeps per frame - but the same number of FRAMES, each advancing the
    // clock by the same amount.
    const fine = drive(
      { frames, maxSamples: 1000 },
      Array.from({ length: frames }, (_, i) => (i + 1) * dt)
    );
    expect(fine.times).toEqual(coarse.times);
    expect(fine.report.advancedFrames).toBe(coarse.report.advancedFrames);
    const span = t => t[t.length - 1] - t[0];
    expect(span(fine.times)).toBe(span(coarse.times));
  });
});
