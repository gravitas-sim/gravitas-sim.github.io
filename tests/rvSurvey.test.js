import { describe, test, expect } from '@jest/globals';
import {
  SURVEY_DEFAULTS,
  constantVelocityChiSquare,
  createSurvey,
  epochCount,
  gaussianAt,
  normalizeSurveyConfig,
  phaseCoverage,
  surveyStats,
} from '../js/rvSurvey.js';

// =============================================================================
// Synthetic observing runs
// -----------------------------------------------------------------------------
// The claims this module makes to a student, in the order they matter:
//
//   the same seed gives the same measurements, so two people can compare
//   the schedule is in simulated days, so a slow laptop measures the same thing
//   nothing is recorded between epochs, so a gap stays a gap
//
// Each of those is a test below. The last section is the lesson's own pair of
// schedules, pinned: if the numbers move, the questions stop having answers.
// =============================================================================

/** HD 209458 b, near enough: the signal the lesson observes. */
const PERIOD = 3.5247;
const K = 84;
const signal = t => -K * Math.sin((2 * Math.PI * t) / PERIOD);

/**
 * Drive a run at a fixed frame interval.
 *
 * @param {object} cfg - Survey configuration
 * @param {number} dt - Simulated days between render frames
 * @param {Function} [fn] - The signal; defaults to the lesson's
 */
function run(cfg, dt, fn = signal) {
  const survey = createSurvey(cfg);
  const end = cfg.baselineDays + dt;
  for (let t = 0; t <= end; t += dt) survey.observe(t, fn(t));
  return survey;
}

describe('the noise is reproducible and is actually Gaussian', () => {
  test('the same seed and epoch always give the same draw', () => {
    expect(gaussianAt('lesson', 7)).toBe(gaussianAt('lesson', 7));
    expect(gaussianAt(1234, 0)).toBe(gaussianAt(1234, 0));
  });

  test('a different seed gives a different draw', () => {
    expect(gaussianAt('a', 3)).not.toBe(gaussianAt('b', 3));
  });

  test('neighbouring epochs are not neighbouring numbers', () => {
    // Without a mixing step, seeding a generator on index+1 leaves adjacent
    // epochs visibly correlated and the "noise" walks smoothly across the plot.
    const a = [];
    const b = [];
    for (let i = 0; i < 4000; i++) {
      a.push(gaussianAt('lesson', i));
      b.push(gaussianAt('lesson', i + 1));
    }
    const mean = xs => xs.reduce((s, x) => s + x, 0) / xs.length;
    const ma = mean(a);
    const mb = mean(b);
    const cov = mean(a.map((x, i) => (x - ma) * (b[i] - mb)));
    const sd = xs => {
      const m = mean(xs);
      return Math.sqrt(mean(xs.map(x => (x - m) ** 2)));
    };
    expect(Math.abs(cov / (sd(a) * sd(b)))).toBeLessThan(0.05);
  });

  test('it is standard normal', () => {
    const n = 100_000;
    let sum = 0;
    let sumsq = 0;
    for (let i = 0; i < n; i++) {
      const g = gaussianAt('stats', i);
      sum += g;
      sumsq += g * g;
    }
    expect(Math.abs(sum / n)).toBeLessThan(0.02);
    expect(Math.sqrt(sumsq / n)).toBeCloseTo(1, 1);
  });

  test('drawing noise does not touch Math.random', () => {
    // The world's RNG and the observer's must be separate streams: taking a
    // measurement must not change the next planet the sandbox generates.
    const before = Math.random;
    run({ ...SURVEY_DEFAULTS, seed: 'x' }, 0.01);
    expect(Math.random).toBe(before);
  });
});

describe('two runs of the same configuration agree exactly', () => {
  test('measurement for measurement', () => {
    const a = run(SURVEY_DEFAULTS, 0.01).measurements();
    const b = run(SURVEY_DEFAULTS, 0.01).measurements();
    expect(a).toEqual(b);
  });

  test('and a different seed moves the points but not the schedule', () => {
    const a = run({ ...SURVEY_DEFAULTS, seed: 'one' }, 0.01).measurements();
    const b = run({ ...SURVEY_DEFAULTS, seed: 'two' }, 0.01).measurements();
    expect(a.map(m => m.day)).toEqual(b.map(m => m.day));
    expect(a.map(m => m.rv)).not.toEqual(b.map(m => m.rv));
  });

  test('an epoch keeps its noise draw however the run reaches it', () => {
    // Noise indexed by epoch rather than drawn in sequence. Re-run at a
    // different frame step - which is what scrubbing the timeline and playing
    // forward again amounts to - and epoch 5 gets the number it always got.
    //
    // Only the noise is bit-identical. The value it is added to is read by
    // interpolating between whichever frames bracketed the epoch, so it agrees
    // to interpolation error and not to the last bit; the frame-rate test below
    // is the one that pins how close that has to be.
    const first = run(SURVEY_DEFAULTS, 0.01).measurements();
    const again = run(SURVEY_DEFAULTS, 0.005).measurements();
    const noise = points => points.map(m => m.rv - m.truth);
    // Recovered by subtraction, so it carries a unit of rounding from a
    // `truth` that differs in its last bit; the draw itself is identical, and
    // the first test in this file is the one that says so exactly.
    noise(again).forEach((n, i) => expect(n).toBeCloseTo(noise(first)[i], 9));
    expect(again.map(m => m.day)).toEqual(first.map(m => m.day));
  });
});

describe('with the noise turned off the measurements are the signal', () => {
  test('every point sits on the curve', () => {
    const points = run(
      { cadenceDays: 0.25, baselineDays: 3.5, sigmaMs: 0, seed: 'quiet' },
      0.001
    ).measurements();
    expect(points.length).toBeGreaterThan(10);
    for (const m of points) {
      expect(m.rv).toBeCloseTo(signal(m.day), 2);
      // Nothing was added. Compared as a difference rather than by identity,
      // because -0 and 0 are different values to Object.is and the same
      // measurement to everyone else.
      expect(m.rv - m.truth).toBe(0);
      expect(m.sigma).toBe(0);
    }
  });

  test('a zero sigma is kept, not replaced by the default', () => {
    expect(normalizeSurveyConfig({ sigmaMs: 0 }).sigmaMs).toBe(0);
    // ...and so is a nonsensical one, by being refused.
    expect(normalizeSurveyConfig({ sigmaMs: -5 }).sigmaMs).toBe(0);
  });

  test('a noiseless run of a constant star has no scatter to explain', () => {
    const points = run(
      { cadenceDays: 1, baselineDays: 10, sigmaMs: 0, seed: 'flat' },
      0.01,
      () => 12.5
    ).measurements();
    const stats = surveyStats(points);
    expect(stats.rms).toBeCloseTo(0, 9);
    expect(stats.halfRange).toBeCloseTo(0, 9);
    // Chi-square needs an error bar to divide by, and there isn't one.
    expect(stats.chi).toBeNull();
  });
});

describe('the schedule is in simulated days, not frames', () => {
  test('the epoch times are exactly the schedule', () => {
    const points = run(
      { cadenceDays: 0.32, baselineDays: 3.52, sigmaMs: 0, seed: 's' },
      0.01
    ).measurements();
    points.forEach((m, i) => expect(m.day).toBeCloseTo(i * 0.32, 9));
  });

  test('four frame rates produce the same twelve measurements', () => {
    // The whole point of interpolating onto the epoch. A student at 15fps and
    // one at 120fps are looking at the same data.
    const cfg = {
      cadenceDays: 0.32,
      baselineDays: 3.52,
      sigmaMs: 4,
      seed: 'fps',
    };
    const runs = [0.002, 0.005, 0.01, 0.02].map(dt =>
      run(cfg, dt).measurements()
    );
    for (const points of runs) expect(points).toHaveLength(12);
    for (const points of runs.slice(1)) {
      points.forEach((m, i) => {
        expect(m.day).toBeCloseTo(runs[0][i].day, 9);
        // Interpolation error, not a different measurement.
        expect(m.rv).toBeCloseTo(runs[0][i].rv, 0);
      });
    }
  });

  test('frames too far apart to resolve the signal are marked', () => {
    // At a coarse enough frame step the straight line between frames cuts the
    // corners off the curve. The measurement is still taken - it is what the
    // simulation can say - and it says it is coarse.
    const fine = run(
      { cadenceDays: 0.32, baselineDays: 3.52, sigmaMs: 0, seed: 'g' },
      0.01
    );
    const coarse = run(
      { cadenceDays: 0.32, baselineDays: 3.52, sigmaMs: 0, seed: 'g' },
      0.5
    );
    expect(fine.anyCoarse()).toBe(false);
    expect(coarse.anyCoarse()).toBe(true);
  });

  test('a run does not start before the clock does', () => {
    // The first epoch is the first observation, whenever that happens to be.
    const survey = createSurvey({
      cadenceDays: 1,
      baselineDays: 3,
      sigmaMs: 0,
      seed: 'late',
    });
    survey.observe(100, 5);
    expect(survey.startedAt()).toBe(100);
    expect(survey.measurements()[0].day).toBe(100);
    expect(survey.endsAt()).toBe(103);
  });
});

describe('a gap is a gap', () => {
  test('the run holds exactly the scheduled epochs and nothing between', () => {
    const cfg = { cadenceDays: 2, baselineDays: 20, sigmaMs: 0, seed: 'gap' };
    const points = run(cfg, 0.01).measurements();
    expect(points).toHaveLength(11);
    const days = points.map(m => m.day);
    // Nothing on the odd days, however many frames went past.
    for (const d of days) expect(Math.round(d) % 2).toBe(0);
  });

  test('observing past the end adds nothing', () => {
    const survey = createSurvey({
      cadenceDays: 1,
      baselineDays: 3,
      sigmaMs: 0,
      seed: 'over',
    });
    for (let t = 0; t <= 50; t += 0.1) survey.observe(t, signal(t));
    expect(survey.count()).toBe(4);
    expect(survey.isComplete()).toBe(true);
  });

  test('the planned count is known before a single frame runs', () => {
    expect(epochCount({ cadenceDays: 0.32, baselineDays: 3.52 })).toBe(12);
    expect(epochCount({ cadenceDays: 3.52, baselineDays: 38.72 })).toBe(12);
    expect(epochCount({ cadenceDays: 1, baselineDays: 0 })).toBe(1);
  });

  test('a reset waits for a new first reading', () => {
    const survey = run(SURVEY_DEFAULTS, 0.01);
    expect(survey.count()).toBeGreaterThan(0);
    survey.reset();
    expect(survey.count()).toBe(0);
    expect(survey.startedAt()).toBeNull();
    survey.observe(500, 1);
    expect(survey.measurements()[0].day).toBe(500);
  });
});

describe('describing a run without claiming a detection', () => {
  test('chi-square measures scatter against the error bars, nothing else', () => {
    const flat = [0, 0, 0, 0].map(rv => ({ rv, sigma: 2 }));
    expect(constantVelocityChiSquare(flat).reduced).toBe(0);

    // Points scattered by exactly one sigma each way: reduced chi-square near 1
    // is what "as noisy as claimed" looks like.
    const typical = [2, -2, 2, -2, 2, -2].map(rv => ({ rv, sigma: 2 }));
    expect(constantVelocityChiSquare(typical).reduced).toBeCloseTo(1.2, 1);

    expect(constantVelocityChiSquare([{ rv: 1, sigma: 1 }])).toBeNull();
  });

  test('phase coverage is what separates the two schedules', () => {
    const dense = [];
    for (let i = 0; i < 12; i++) dense.push(i * 0.32);
    expect(phaseCoverage(dense, PERIOD).fraction).toBe(1);

    const aliased = [];
    for (let i = 0; i < 12; i++) aliased.push(i * 3.52);
    expect(phaseCoverage(aliased, PERIOD).fraction).toBeLessThanOrEqual(0.2);

    expect(phaseCoverage([1, 2], 0)).toBeNull();
  });

  test('the half-range is named as a range, not as K', () => {
    // Two noiseless points either side of zero: the half-range is what the
    // plot shows and is not the semi-amplitude of anything.
    const stats = surveyStats([
      { day: 0, rv: -10, sigma: 1 },
      { day: 1, rv: 30, sigma: 1 },
    ]);
    expect(stats.halfRange).toBe(20);
    expect(stats.mean).toBe(10);
    expect(stats).not.toHaveProperty('K');
    expect(stats).not.toHaveProperty('semiAmplitude');
    expect(stats).not.toHaveProperty('detected');
  });
});

describe("the lesson's two schedules", () => {
  // Twelve measurements each. One covers a cycle; the other steps almost
  // exactly one cycle at a time and lands on the same phase every night.
  const A = {
    cadenceDays: 0.32,
    baselineDays: 3.52,
    sigmaMs: 8,
    seed: 'lesson',
  };
  const B = {
    cadenceDays: 3.52,
    baselineDays: 38.72,
    sigmaMs: 8,
    seed: 'lesson',
  };

  const statsFor = cfg =>
    surveyStats(run(cfg, 0.005).measurements(), { periodDays: PERIOD });

  test('they take the same number of measurements', () => {
    expect(statsFor(A).n).toBe(12);
    expect(statsFor(B).n).toBe(12);
  });

  test('the longer programme has the worse phase coverage', () => {
    const a = statsFor(A);
    const b = statsFor(B);
    expect(b.baselineDays).toBeGreaterThan(a.baselineDays * 10);
    expect(a.coverage.fraction).toBe(1);
    expect(b.coverage.fraction).toBeLessThanOrEqual(0.2);
  });

  test('the well-sampled run is nowhere near a constant velocity', () => {
    const a = statsFor(A);
    expect(a.chi.reduced).toBeGreaterThan(20);
    // ...and its spread is the right size to be the planet, though reading it
    // as K would be reading a biased statistic off twelve noisy points.
    expect(a.halfRange).toBeGreaterThan(70);
    expect(a.halfRange).toBeLessThan(110);
  });

  test('the aliased run is ambiguous rather than negative', () => {
    // The honest outcome, and the one the lesson is built on: not a detection,
    // not a clean null, just a number a careful person would not publish.
    const b = statsFor(B);
    expect(b.chi.reduced).toBeGreaterThan(1);
    expect(b.chi.reduced).toBeLessThan(5);
    // And it badly underestimates the spread, so a student who reads the plot
    // gets a planet several times too light.
    expect(b.halfRange).toBeLessThan(40);
  });
});
