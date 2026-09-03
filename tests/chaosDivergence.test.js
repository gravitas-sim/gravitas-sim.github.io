import { describe, test, expect } from '@jest/globals';
import {
  BEHAVIOUR,
  REJECTION,
  CRITERIA,
  configurationDistance,
  phaseDistance,
  separationSeries,
  logLinearFit,
  chooseWindow,
  analyseDivergence,
  straightLineR2,
  refinementVerdict,
} from '../js/chaos/divergence.js';

// The whole value of this module is what it refuses to do, so most of these
// are tests that it declined to produce a number.

/** An exponentially growing separation, sampled evenly. */
const exponential = (tau, d0 = 1e-3, from = 0, to = 120, step = 1) => {
  const out = [];
  for (let t = from; t <= to; t += step) {
    out.push({ t, d: d0 * Math.exp(t / tau) });
  }
  return out;
};

/** A separation growing in proportion to time: two-body phase drift. */
const linear = (slope, d0 = 1e-3, to = 120, step = 1) => {
  const out = [];
  for (let t = 0; t <= to; t += step) out.push({ t, d: d0 + slope * t });
  return out;
};

const body = (id, x, y, vx = 0, vy = 0) => ({ id, x, y, vx, vy });

describe('the distance between two runs', () => {
  test('is zero for identical configurations', () => {
    const a = [body(1, 3, 4), body(2, -5, 1)];
    expect(configurationDistance(a, a).d).toBe(0);
  });

  test('adds in quadrature over the bodies', () => {
    const a = [body(1, 0, 0), body(2, 0, 0)];
    const b = [body(1, 3, 4), body(2, 0, 12)];
    // sqrt(5^2 + 12^2) = 13
    expect(configurationDistance(a, b).d).toBeCloseTo(13, 9);
  });

  test('matches bodies by identity, not by array position', () => {
    const a = [body(1, 10, 0), body(2, -10, 0)];
    const shuffled = [body(2, -10, 0), body(1, 10, 0)];
    // Matched by index this would report 40; matched by id it is zero.
    expect(configurationDistance(a, shuffled).d).toBe(0);
  });

  test('reports a body that is missing from the other run', () => {
    const a = [body(1, 0, 0), body(2, 1, 1)];
    const b = [body(1, 0, 0)];
    const out = configurationDistance(a, b);
    expect(out.matched).toBe(1);
    expect(out.missing).toBe(1);
  });

  test('the phase-space version is dimensionless and includes velocity', () => {
    const a = [body(1, 0, 0, 0, 0)];
    const b = [body(1, 0, 0, 3, 4)];
    // Positions equal, speeds differ by 5, normalised by a speed scale of 10.
    expect(phaseDistance(a, b, { length: 100, speed: 10 }).d).toBeCloseTo(
      0.5,
      9
    );
  });
});

describe('aligning two recorded runs', () => {
  const run = (times, offset = 0) =>
    times.map(t => ({ t, bodies: [body(1, offset, 0)] }));

  test('compares samples at the same simulated time', () => {
    const a = run([0, 1, 2, 3], 0);
    const b = run([0, 1, 2, 3], 5);
    const { series } = separationSeries(a, b);
    expect(series.length).toBe(4);
    expect(series.every(p => Math.abs(p.d - 5) < 1e-9)).toBe(true);
  });

  test('uses only the overlapping stretch', () => {
    const a = run([0, 1, 2, 3, 4, 5]);
    const b = run([3, 4, 5, 6, 7]);
    const { series, window } = separationSeries(a, b);
    expect(window.start).toBe(3);
    expect(window.end).toBe(5);
    expect(series.every(p => p.t >= 3 && p.t <= 5)).toBe(true);
  });

  test('produces nothing when the runs do not overlap', () => {
    const { series } = separationSeries(run([0, 1, 2]), run([9, 10]));
    expect(series).toEqual([]);
  });
});

describe('the log-linear fit', () => {
  test('recovers the e-folding time of a clean exponential', () => {
    const fit = logLinearFit(exponential(7).slice(0, 40));
    expect(1 / fit.slope).toBeCloseTo(7, 6);
    expect(fit.r2).toBeGreaterThan(0.999);
  });

  test('reports a poor r-squared for something that is not exponential', () => {
    const fit = logLinearFit(linear(1).filter(p => p.d > 0));
    expect(fit.r2).toBeLessThan(0.95);
  });

  test('a straight line through a linear series fits almost perfectly', () => {
    expect(straightLineR2(linear(1))).toBeGreaterThan(0.999);
  });
});

describe('choosing the interval to fit', () => {
  test('excludes the flat tail where the separation has saturated', () => {
    const growing = exponential(6, 1e-3, 0, 80);
    const saturated = [];
    for (let t = 81; t <= 160; t++) saturated.push({ t, d: growing[80].d });
    const w = chooseWindow([...growing, ...saturated]);
    expect(w.ok).toBe(true);
    // The window must stop well before the tail begins.
    expect(w.to).toBeLessThan(81);
  });

  test('refuses when the separation never grows through enough e-folds', () => {
    const w = chooseWindow(exponential(60, 1e-3, 0, 40));
    expect(w.ok).toBe(false);
    expect(w.reason).toBe(REJECTION.TOO_LITTLE_RANGE);
  });

  test('refuses a series with too few usable points', () => {
    const w = chooseWindow([
      { t: 0, d: 1 },
      { t: 1, d: 3 },
      { t: 2, d: 9 },
    ]);
    expect(w.ok).toBe(false);
    expect(w.reason).toBe(REJECTION.TOO_FEW_POINTS);
  });

  test('ignores separations at the noise floor, whose logarithm is noise', () => {
    const noise = Array.from({ length: 40 }, (_, i) => ({
      t: i,
      d: CRITERIA.noiseFloor / 10,
    }));
    expect(chooseWindow(noise).ok).toBe(false);
  });
});

describe('classifying a divergence', () => {
  test('identical runs are identical, and get no timescale', () => {
    const v = analyseDivergence(
      Array.from({ length: 50 }, (_, i) => ({ t: i, d: 0 }))
    );
    expect(v.behaviour).toBe(BEHAVIOUR.IDENTICAL);
    expect(v.tau).toBeNull();
  });

  test('exponential growth yields the right e-folding time', () => {
    const v = analyseDivergence(exponential(6.9, 1e-3, 0, 140));
    expect(v.behaviour).toBe(BEHAVIOUR.EXPONENTIAL);
    expect(v.tau).toBeCloseTo(6.9, 1);
    expect(v.r2).toBeGreaterThan(CRITERIA.minR2);
    expect(v.window.ok).toBe(true);
  });

  test('linear drift is called linear, and gets no e-folding time', () => {
    // This is the two-body control, and the most important test in the file.
    const v = analyseDivergence(linear(0.5, 1e-3, 200));
    expect(v.behaviour).toBe(BEHAVIOUR.LINEAR);
    expect(v.tau).toBeNull();
    expect(v.linearR2).toBeGreaterThan(0.99);
  });

  test('a bounded wobble is not chaos either', () => {
    const wobble = Array.from({ length: 100 }, (_, i) => ({
      t: i,
      d: 1 + 0.2 * Math.sin(i / 5),
    }));
    const v = analyseDivergence(wobble);
    expect(v.behaviour).toBe(BEHAVIOUR.BOUNDED);
    expect(v.tau).toBeNull();
  });

  test('too short a run gives no estimate however clean the growth', () => {
    const v = analyseDivergence(exponential(7, 1e-3, 0, 12));
    expect(v.tau).toBeNull();
    expect(v.behaviour).not.toBe(BEHAVIOUR.EXPONENTIAL);
  });

  test('the reported growth factor is end over start', () => {
    const v = analyseDivergence(exponential(10, 1, 0, 100, 5));
    expect(v.growth).toBeCloseTo(Math.exp(10), -2);
  });

  test('a straight-line comparison is always reported', () => {
    const v = analyseDivergence(exponential(6.9, 1e-3, 0, 140));
    // Even when the answer is exponential, the alternative is shown, because
    // that comparison is what the lesson turns on.
    expect(v.linearR2).toBeGreaterThan(0);
    expect(v.linearR2).toBeLessThan(v.r2);
  });
});

describe('the refinement verdict', () => {
  const at = (tau, behaviour = BEHAVIOUR.EXPONENTIAL) => ({ tau, behaviour });

  test('agreeing timescales are resolved', () => {
    const v = refinementVerdict([at(6.9), at(7.0), at(7.2)]);
    expect(v.resolved).toBe(true);
    expect(v.spread).toBeLessThan(0.2);
  });

  test('a timescale that moves with the numerics is not', () => {
    const v = refinementVerdict([at(6.9), at(21), at(1.4)]);
    expect(v.resolved).toBe(false);
    expect(v.reason).toBe('timescale-moved');
  });

  test('a behaviour that changes with the numerics is not', () => {
    const v = refinementVerdict([at(6.9), at(7.0, BEHAVIOUR.LINEAR)]);
    expect(v.resolved).toBe(false);
    expect(v.reason).toBe('behaviour-changed');
  });

  test('one estimate is never enough to call something resolved', () => {
    const v = refinementVerdict([at(6.9)]);
    expect(v.resolved).toBe(false);
    expect(v.reason).toBe('need-two-estimates');
  });

  test('the measured spread across this lab is inside tolerance', () => {
    // The nine integrator/timestep combinations actually measured for the
    // Three-Body Sensitivity Lab. If a change to the engine moves these, the
    // lesson's conclusion is affected and this should fail.
    const measured = [6.91, 6.86, 6.95, 7.19, 7.62, 6.97, 6.81, 7.23, 7.03];
    const v = refinementVerdict(measured.map(t => at(t)));
    expect(v.resolved).toBe(true);
  });
});
