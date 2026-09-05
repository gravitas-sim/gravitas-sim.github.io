import { describe, test, expect } from '@jest/globals';
import {
  INTERPOLATION_TOLERANCE_MS,
  QUALITY,
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

describe('the measured velocities do not depend on the render rate', () => {
  // The previous frame-rate test compared epoch times and noise draws. Both are
  // computed from the schedule and the seed, so they agree by construction
  // whatever the frame rate does - the test could not have failed. What has to
  // agree is the *measurement*: the value read off the simulation at each
  // scheduled instant.

  /** A strongly curved signal: a high-eccentricity reflex curve. */
  const eccentric = (t, { P = 3.5247, K = 84, e = 0.7, omega = 1.1 } = {}) => {
    const M = (2 * Math.PI * t) / P;
    let E = M;
    for (let k = 0; k < 60; k++) {
      E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    }
    const nu =
      2 *
      Math.atan2(
        Math.sqrt(1 + e) * Math.sin(E / 2),
        Math.sqrt(1 - e) * Math.cos(E / 2)
      );
    return K * (Math.cos(nu + omega) + e * Math.cos(omega));
  };

  /** Drive a run from the same initial state at a given frame interval. */
  const runAt = (dt, cfg, signal) => {
    const survey = createSurvey(cfg);
    for (let t = 0; t <= cfg.baselineDays + dt; t += dt) {
      survey.observe(t, signal(t));
    }
    return survey;
  };

  const CFG = {
    cadenceDays: 0.32,
    baselineDays: 3.52,
    sigmaMs: 4,
    seed: 'framerate',
  };

  test.each([
    ['a sinusoid', t => -84 * Math.sin((2 * Math.PI * t) / 3.5247)],
    ['a strongly eccentric curve', t => eccentric(t)],
  ])(
    '%s gives the same measurements at 15, 60 and 240 fps',
    (_what, signal) => {
      // Frame intervals in simulated days for a 3.52-day orbit at three plausible
      // render rates.
      const runs = [0.02, 0.005, 0.00125].map(dt => runAt(dt, CFG, signal));

      for (const run of runs) expect(run.count()).toBe(12);

      const reference = runs[1].measurements();
      for (const run of runs) {
        run.measurements().forEach((m, i) => {
          expect(m.day).toBeCloseTo(reference[i].day, 9);
          // The measurement itself, not the schedule and not the noise.
          expect(m.rv).toBeCloseTo(reference[i].rv, 1);
          expect(m.quality).toBe(reference[i].quality);
        });
      }
    }
  );

  test('with no noise at all the agreement is the interpolation alone', () => {
    // Noise is identical by construction, so a low-noise run is where a
    // sampling difference has nowhere to hide.
    const cfg = { ...CFG, sigmaMs: 0 };
    const fine = runAt(0.001, cfg, t => eccentric(t)).measurements();
    const coarse = runAt(0.02, cfg, t => eccentric(t)).measurements();

    coarse.forEach((m, i) => {
      expect(m.rv).toBeCloseTo(fine[i].rv, 1);
      // And each is close to the signal it claims to have measured.
      expect(m.rv).toBeCloseTo(eccentric(m.day), 1);
    });
  });

  test('a run at a coarse frame rate is flagged, not silently wrong', () => {
    // Frames a quarter of a period apart cannot resolve this curve. The values
    // are still reported - it is what the simulation can say - and they carry
    // an error estimate that exceeds the tolerance.
    const cfg = { ...CFG, sigmaMs: 0 };
    const coarse = runAt(0.9, cfg, t => eccentric(t));
    const marks = coarse.measurements();

    expect(marks.some(m => m.quality === QUALITY.DEGRADED || m.missed)).toBe(
      true
    );
    expect(coarse.anyCoarse()).toBe(true);
  });

  test('the tolerance is about the signal, not about the cadence', () => {
    // A long cadence with well-resolved frames is accurate and must pass; a
    // short cadence with coarse frames is not and must fail. The old
    // gap-as-a-fraction-of-cadence rule got both of these backwards.
    const wellResolved = runAt(
      0.002,
      { cadenceDays: 2, baselineDays: 20, sigmaMs: 0, seed: 'x' },
      t => eccentric(t)
    );
    expect(wellResolved.quality().degraded).toBe(0);
    expect(wellResolved.quality().worstError).toBeLessThan(
      INTERPOLATION_TOLERANCE_MS
    );

    const poorlyResolved = runAt(
      0.4,
      { cadenceDays: 0.5, baselineDays: 5, sigmaMs: 0, seed: 'x' },
      t => eccentric(t)
    );
    expect(poorlyResolved.quality().degraded).toBeGreaterThan(0);
  });
});

describe('epochs nobody observed are missed, not invented', () => {
  const signal = t => -84 * Math.sin((2 * Math.PI * t) / 3.5247);
  const CFG = {
    cadenceDays: 0.32,
    baselineDays: 3.52,
    sigmaMs: 0,
    seed: 'gaps',
  };

  test('suspending marks every epoch that fell due while it was closed', () => {
    const survey = createSurvey(CFG);
    // Observe the first three epochs properly.
    for (let t = 0; t <= 0.7; t += 0.005) survey.observe(t, signal(t));
    const before = survey.count();
    expect(before).toBeGreaterThanOrEqual(3);

    // The panel closes. Time passes. It reopens.
    survey.suspend(0.7);
    for (let t = 2.0; t <= 3.6; t += 0.005) survey.observe(t, signal(t));

    const all = survey.measurements();
    const missed = all.filter(m => m.missed);
    expect(missed.length).toBeGreaterThan(0);
    // A missed epoch has no velocity at all, rather than a plausible one.
    for (const m of missed) {
      expect(m.rv).toBeNull();
      expect(m.quality).toBe(QUALITY.MISSED);
    }
    // The schedule still ran its course: every epoch is accounted for.
    expect(all).toHaveLength(survey.plannedCount);
  });

  test('a long jump with no suspend is treated the same way', () => {
    // A backgrounded tab does not get to call suspend. Readings more than a
    // whole cadence apart mean nobody was watching, whatever the reason.
    const survey = createSurvey(CFG);
    survey.observe(0, signal(0));
    survey.observe(2.0, signal(2.0));
    const missed = survey.measurements().filter(m => m.missed);
    expect(missed.length).toBeGreaterThan(0);
  });

  test('missed epochs stay out of the statistics by default', () => {
    const survey = createSurvey(CFG);
    for (let t = 0; t <= 0.7; t += 0.005) survey.observe(t, signal(t));
    survey.suspend(0.7);
    for (let t = 2.0; t <= 3.6; t += 0.005) survey.observe(t, signal(t));

    const stats = surveyStats(survey.measurements());
    expect(stats.n).toBeLessThan(survey.plannedCount);
    expect(stats.missed).toBeGreaterThan(0);
    expect(stats.planned).toBe(survey.plannedCount);
    // Nothing null reached the arithmetic.
    expect(Number.isFinite(stats.mean)).toBe(true);
    expect(Number.isFinite(stats.rms)).toBe(true);
  });

  test('degraded readings are excluded unless asked for', () => {
    const points = [
      { day: 0, rv: 10, sigma: 1, quality: QUALITY.OK },
      { day: 1, rv: 90, sigma: 1, quality: QUALITY.DEGRADED },
      { day: 2, rv: 12, sigma: 1, quality: QUALITY.OK },
    ];
    expect(surveyStats(points).n).toBe(2);
    expect(surveyStats(points).degraded).toBe(1);
    expect(surveyStats(points, { includeDegraded: true }).n).toBe(3);
    // And the excluded one really was distorting it.
    expect(surveyStats(points).halfRange).toBeLessThan(
      surveyStats(points, { includeDegraded: true }).halfRange
    );
  });
});
