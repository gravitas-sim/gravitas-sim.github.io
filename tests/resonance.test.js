// =============================================================================
// The resonance analysis
// -----------------------------------------------------------------------------
// js/resonance/elements.js is pure arithmetic, so it can be tested against
// closed-form answers rather than against the engine. That matters more here
// than usual: the classifier's job is to *withhold* a verdict when the evidence
// does not support one, and the only way to check a refusal is to hand it a
// series whose true behaviour you already know.
//
// So most of what follows is synthetic. A libration is a sine, a circulation is
// a ramp, and a slow circulation with a wobble on it - the case that fooled an
// earlier version of the classifier into reporting a tidy libration for
// Callisto - is a ramp plus a sine. The engine-backed checks live in
// tools/physics-checks.mjs, where they belong.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import {
  ANGLE_CRITERIA,
  ANGLE_STATE,
  classifyAngle,
  conjunctionCluster,
  conjunctions,
  coorbitalAngle,
  laplaceArgument,
  largestStep,
  nearestRatio,
  plutoArgument,
  ratioSurprise,
  resonanceElements,
  resonantArgument,
  rotatingFrame,
  smoothOverTime,
  tadpolePeriod,
  triangularPoints,
  turningPoints,
  twoBodyArgument,
  unwrapDegrees,
  wrap180,
  wrap360,
  wrapAbout,
} from '../js/resonance/elements.js';
import {
  GALILEAN,
  JUPITER_TROJANS,
  PLUTO_NEPTUNE,
  SCALE_JOVIAN,
  TIME_SCALE_JOVIAN,
  balance,
  galileanBodies,
  plutoBodies,
  simSecondsToDays,
  simSecondsToYears,
  stateFromElements,
  trojanBodies,
} from '../js/resonance/systems.js';
import { createRecorder, partition } from '../js/resonance/recorder.js';

const G = 2;

// --- Angle arithmetic ---------------------------------------------------------

describe('wrapping', () => {
  test('wrap360 lands in [0, 360)', () => {
    expect(wrap360(0)).toBe(0);
    expect(wrap360(360)).toBe(0);
    expect(wrap360(-1)).toBeCloseTo(359, 10);
    expect(wrap360(725)).toBeCloseTo(5, 10);
    expect(wrap360(-725)).toBeCloseTo(355, 10);
  });

  test('wrap180 lands in [-180, 180)', () => {
    expect(wrap180(0)).toBe(0);
    expect(wrap180(180)).toBe(-180);
    expect(wrap180(179)).toBeCloseTo(179, 10);
    expect(wrap180(181)).toBeCloseTo(-179, 10);
    expect(wrap180(-190)).toBeCloseTo(170, 10);
  });

  test('a non-finite angle stays non-finite rather than becoming zero', () => {
    expect(Number.isNaN(wrap360(NaN))).toBe(true);
    expect(Number.isNaN(wrap180(Infinity))).toBe(true);
  });

  test('wrapAbout re-centres, which is what a libration about zero needs', () => {
    // An angle librating about 0 crosses 360 on every swing. Wrapped to
    // [0, 360) it reads as a sawtooth of amplitude 180; re-centred it reads as
    // the ten-degree swing it is.
    const raw = [350, 355, 0, 5, 10, 5, 0, 355, 350];
    const centred = raw.map(a => wrapAbout(a, 0));
    expect(Math.max(...centred) - Math.min(...centred)).toBeCloseTo(20, 10);
  });
});

describe('unwrapping', () => {
  test('removes the jumps from a steadily advancing angle', () => {
    const wrapped = [];
    for (let i = 0; i < 40; i++) wrapped.push(wrap360(i * 37));
    const out = unwrapDegrees(wrapped);
    for (let i = 1; i < out.length; i++) {
      expect(out[i] - out[i - 1]).toBeCloseTo(37, 8);
    }
    expect(out[out.length - 1]).toBeCloseTo(39 * 37, 6);
  });

  test('handles a retreating angle as well as an advancing one', () => {
    const wrapped = [];
    for (let i = 0; i < 20; i++) wrapped.push(wrap360(-i * 50));
    const out = unwrapDegrees(wrapped);
    expect(out[out.length - 1]).toBeCloseTo(-19 * 50, 6);
  });

  test('a NaN sample does not corrupt the running offset', () => {
    const out = unwrapDegrees([10, 20, NaN, 40]);
    expect(Number.isNaN(out[2])).toBe(true);
    expect(out[3]).toBeCloseTo(40, 10);
  });

  test('largestStep reports the biggest wrapped hop', () => {
    expect(largestStep([0, 10, 30, 25])).toBeCloseTo(20, 10);
    // 350 to 10 is a twenty-degree step forward, not a 340-degree one back.
    expect(largestStep([350, 10])).toBeCloseTo(20, 10);
  });
});

// --- Elements -----------------------------------------------------------------

describe('resonanceElements', () => {
  const primary = { pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, mass: 1000 };

  /** A body on a circular orbit of radius r, at angle theta. */
  const circular = (r, thetaDeg) => {
    const th = (thetaDeg * Math.PI) / 180;
    const v = Math.sqrt((G * 1000) / r);
    return {
      pos: { x: r * Math.cos(th), y: r * Math.sin(th) },
      vel: { x: -v * Math.sin(th), y: v * Math.cos(th) },
      mass: 0,
    };
  };

  test('a circular orbit has zero eccentricity and the Kepler period', () => {
    const el = resonanceElements(circular(100, 0), primary, G);
    expect(el.e).toBeLessThan(1e-12);
    expect(el.a).toBeCloseTo(100, 8);
    expect(el.period).toBeCloseTo(2 * Math.PI * Math.sqrt(1e6 / 2000), 6);
  });

  test('mean longitude equals true longitude when the orbit is a circle', () => {
    for (const theta of [0, 45, 137, 260, 359]) {
      const el = resonanceElements(circular(100, theta), primary, G);
      expect(el.lambda).toBeCloseTo(theta, 6);
      expect(el.trueLongitude).toBeCloseTo(theta, 6);
    }
  });

  test('an eccentric orbit is recovered from the state it was built from', () => {
    const mu = G * 1000;
    for (const [a, e, varpi, lambda] of [
      [500, 0.25, 30, 100],
      [500, 0.25, 200, 15],
      [1200, 0.6, 0, 270],
      [80, 0.02, 355, 5],
    ]) {
      const state = stateFromElements({
        a,
        e,
        varpiDeg: varpi,
        lambdaDeg: lambda,
        mu,
      });
      const el = resonanceElements({ ...state, mass: 0 }, primary, G);
      expect(el.a).toBeCloseTo(a, 6);
      expect(el.e).toBeCloseTo(e, 9);
      expect(el.varpi).toBeCloseTo(varpi, 6);
      expect(el.lambda).toBeCloseTo(lambda, 6);
    }
  });

  test('the mean longitude of a real orbit advances linearly with time', () => {
    // The property that makes lambda the right thing to build an argument
    // from: the true longitude of an eccentric orbit races and dawdles, and
    // the mean longitude does not.
    const mu = G * 1000;
    const a = 400;
    const e = 0.3;
    const period = 2 * Math.PI * Math.sqrt(a ** 3 / mu);
    const lambdas = [];
    for (let i = 0; i <= 8; i++) {
      const lambda = (i * 360) / 8;
      const state = stateFromElements({
        a,
        e,
        varpiDeg: 40,
        lambdaDeg: lambda,
        mu,
      });
      lambdas.push(resonanceElements({ ...state, mass: 0 }, primary, G).lambda);
    }
    const steps = [];
    for (let i = 1; i < lambdas.length; i++) {
      steps.push(wrap180(lambdas[i] - lambdas[i - 1]));
    }
    for (const step of steps) expect(step).toBeCloseTo(45, 6);
    expect(period).toBeGreaterThan(0);
  });

  test('a retrograde orbit still has a mean longitude that increases', () => {
    const body = circular(100, 0);
    body.vel.y = -body.vel.y;
    const el = resonanceElements(body, primary, G);
    expect(el.retrograde).toBe(true);
    expect(el.n).toBeLessThan(0);
    expect(Number.isFinite(el.lambda)).toBe(true);
  });

  test('an unbound body has no elements at all', () => {
    const fast = circular(100, 0);
    fast.vel.y *= 2;
    expect(resonanceElements(fast, primary, G)).toBeNull();
  });

  test('degenerate inputs return null rather than NaN-filled objects', () => {
    expect(resonanceElements(null, primary, G)).toBeNull();
    expect(resonanceElements(circular(100, 0), primary, 0)).toBeNull();
    expect(
      resonanceElements(
        { pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, mass: 0 },
        primary,
        G
      )
    ).toBeNull();
  });
});

// --- Ratios -------------------------------------------------------------------

describe('nearestRatio', () => {
  test('finds the textbook commensurabilities', () => {
    expect(nearestRatio(2.0073, 10)).toMatchObject({ p: 2, q: 1 });
    expect(nearestRatio(1.50458, 10)).toMatchObject({ p: 3, q: 2 });
    expect(nearestRatio(2.33258, 10)).toMatchObject({ p: 7, q: 3 });
    expect(nearestRatio(1.40355, 10)).toMatchObject({ p: 7, q: 5 });
  });

  test('respects the denominator limit', () => {
    // 2.33258 is very close to 7:3, but with q capped at 2 the best available
    // is 5:2, and the reported error grows to match.
    const tight = nearestRatio(2.33258, 2);
    expect(tight.q).toBeLessThanOrEqual(2);
    expect(tight.fractional).toBeGreaterThan(
      nearestRatio(2.33258, 10).fractional
    );
  });

  test('an exact ratio is reported exactly', () => {
    const r = nearestRatio(1.5, 10);
    expect(r).toMatchObject({ p: 3, q: 2 });
    expect(r.fractional).toBeLessThan(1e-12);
  });

  test('refuses nonsense rather than inventing a ratio for it', () => {
    expect(nearestRatio(0, 10)).toBeNull();
    expect(nearestRatio(-2, 10)).toBeNull();
    expect(nearestRatio(NaN, 10)).toBeNull();
  });

  test('it finds a ratio for any number at all, which is the point', () => {
    // The lesson's central claim, as an assertion: pick numbers with nothing to
    // do with resonance and every one of them lands close to a small ratio.
    for (const x of [Math.PI / 2, Math.E / 2, Math.SQRT2, 1.61803, 2.71828]) {
      const near = nearestRatio(x, 10);
      expect(near).not.toBeNull();
      expect(near.fractional).toBeLessThan(0.02);
    }
  });
});

describe('ratioSurprise', () => {
  test('Callisto is closer to chance than Pluto by a wide margin', () => {
    const callisto = ratioSurprise(2.33258, 10);
    const pluto = ratioSurprise(1.50458, 10);
    expect(callisto.timesCloser).toBeGreaterThan(pluto.timesCloser * 4);
    // ...and Callisto is the one that is not in resonance. This is the
    // arithmetic the whole investigation is built on.
    expect(callisto.timesCloser).toBeGreaterThan(20);
    expect(pluto.timesCloser).toBeLessThan(5);
  });

  test('a typical distance shrinks as the denominator limit grows', () => {
    expect(ratioSurprise(1.234567, 20).typical).toBeLessThan(
      ratioSurprise(1.234567, 10).typical
    );
  });

  test('an exact ratio is infinitely surprising and says so finitely', () => {
    expect(ratioSurprise(1.5, 10).timesCloser).toBe(Infinity);
  });
});

// --- Arguments ----------------------------------------------------------------

describe('resonant arguments', () => {
  test('the d’Alembert rule is enforced, not assumed', () => {
    // Coefficients that do not sum to zero make the value depend on where the
    // x axis points, which is not a resonant argument at all.
    expect(
      resonantArgument([
        { coefficient: 2, lambda: 10 },
        { coefficient: -1, lambda: 20 },
      ])
    ).toBeNull();
    expect(
      resonantArgument([
        { coefficient: 2, lambda: 10 },
        { coefficient: -1, lambda: 20 },
        { coefficient: -1, lambda: 0, varpi: 0 },
      ])
    ).not.toBeNull();
  });

  test('a valid argument is invariant under rotating the frame', () => {
    const build = shift =>
      resonantArgument([
        { coefficient: 3, lambda: 100 + shift },
        { coefficient: -2, lambda: 40 + shift },
        { coefficient: 0, varpiCoefficient: -1, lambda: 0, varpi: 25 + shift },
      ]);
    expect(build(0)).toBeCloseTo(build(137), 8);
    expect(build(0)).toBeCloseTo(build(-260), 8);
  });

  test('the Laplace argument is the published combination', () => {
    // 1 - 3 + 2 = 0, and with the moons at the equilibrium the argument is 180.
    expect(laplaceArgument(0, 180, 0)).toBeCloseTo(180, 10);
    expect(laplaceArgument(30, 210, 30)).toBeCloseTo(180, 10);
    // Rotating every longitude together must not move it.
    expect(laplaceArgument(47, 227, 47)).toBeCloseTo(180, 10);
  });

  test('Pluto’s argument collapses to the conjunction longitude at conjunction', () => {
    // At conjunction the two mean longitudes are equal, and phi reduces to
    // lambda - varpi. This identity is the entire protection mechanism.
    for (const lambda of [0, 73, 200, 355]) {
      for (const varpi of [0, 90, 271]) {
        expect(plutoArgument(lambda, lambda, varpi)).toBeCloseTo(
          wrap360(lambda - varpi),
          8
        );
      }
    }
  });

  test('a two-body argument has coefficients summing to zero by construction', () => {
    const value = twoBodyArgument(7, 3, 100, 40, 25);
    const shifted = twoBodyArgument(7, 3, 100 + 60, 40 + 60, 25 + 60);
    expect(value).toBeCloseTo(shifted, 8);
  });
});

// --- Smoothing and turning points ---------------------------------------------

describe('smoothOverTime', () => {
  test('removes a ripple whose period matches the window', () => {
    const times = [];
    const values = [];
    for (let i = 0; i < 600; i++) {
      times.push(i);
      values.push(100 + 8 * Math.sin((2 * Math.PI * i) / 20));
    }
    const out = smoothOverTime(values, times, 20);
    // Away from the ends, where the window is full, the ripple is all but
    // gone. Not exactly gone: a discrete window spanning twenty samples covers
    // twenty-one of them, so it is a hair wider than one period and leaves a
    // residual of about a tenth of the amplitude. That is a ninety percent
    // reduction, which is all the turning-point search needs.
    const middle = out.slice(100, 500);
    expect(Math.max(...middle) - Math.min(...middle)).toBeLessThan(0.15 * 16);
  });

  test('leaves a trend alone', () => {
    const times = [];
    const values = [];
    for (let i = 0; i < 400; i++) {
      times.push(i);
      values.push(3 * i);
    }
    const out = smoothOverTime(values, times, 20);
    for (let i = 50; i < 350; i++) expect(out[i]).toBeCloseTo(values[i], 6);
  });

  test('a window of zero or a series of two is returned untouched', () => {
    expect(smoothOverTime([1, 2, 3], [0, 1, 2], 0)).toEqual([1, 2, 3]);
    expect(smoothOverTime([1, 2], [0, 1], 5)).toEqual([1, 2]);
  });
});

describe('turningPoints', () => {
  const sine = (n, cycles, amp) => {
    const out = [];
    for (let i = 0; i < n; i++)
      out.push(amp * Math.sin((2 * Math.PI * i * cycles) / n));
    return out;
  };

  test('finds one extremum per half cycle', () => {
    const turns = turningPoints(sine(600, 3, 20), 4);
    // Three cycles starting at the centre: max, min, max, min, max, min.
    expect(turns.length).toBe(6);
    expect(turns.map(p => p.kind)).toEqual([
      'max',
      'min',
      'max',
      'min',
      'max',
      'min',
    ]);
  });

  test('a ripple below the prominence is not a turning point', () => {
    const values = sine(600, 3, 20).map(
      (v, i) => v + 0.4 * Math.sin((2 * Math.PI * i) / 7)
    );
    expect(turningPoints(values, 4).length).toBe(6);
  });

  test('the first sample is never a turning point', () => {
    // A reversal needs the series to arrive at the extremum as well as leave
    // it, and nothing arrived at sample zero. Without this rule a series that
    // starts mid-rise reports a spurious minimum at index 0 and every half
    // period after it is measured from the wrong place.
    const rising = [];
    for (let i = 0; i < 100; i++)
      rising.push(Math.sin((Math.PI * i) / 99) * 30);
    const turns = turningPoints(rising, 3);
    expect(turns.every(p => p.index > 0)).toBe(true);
  });

  test('a monotone series has none', () => {
    expect(turningPoints([1, 2, 3, 4, 5, 6], 0.5)).toEqual([]);
  });
});

// --- Classification -----------------------------------------------------------

/** A sampled angle from a closed-form description. */
const series = (n, dt, fn) => {
  const out = [];
  for (let i = 0; i < n; i++) out.push({ t: i * dt, phi: wrap360(fn(i * dt)) });
  return out;
};

describe('classifyAngle', () => {
  test('a clean libration is recognised, with centre, amplitude and period', () => {
    const P = 400;
    const s = series(600, 1, t => 180 + 25 * Math.sin((2 * Math.PI * t) / P));
    const v = classifyAngle(s, { referencePeriod: 10 });
    expect(v.state).toBe(ANGLE_STATE.LIBRATION);
    expect(v.centre).toBeCloseTo(180, 0);
    expect(v.amplitude).toBeCloseTo(25, 0);
    expect(v.period).toBeCloseTo(P, -1);
    expect(v.periodResolved).toBe(true);
  });

  test('a libration about zero is handled, not reported as a 180-degree swing', () => {
    const s = series(600, 1, t => 8 * Math.sin((2 * Math.PI * t) / 300));
    const v = classifyAngle(s, { referencePeriod: 10 });
    expect(v.state).toBe(ANGLE_STATE.LIBRATION);
    expect(v.amplitude).toBeCloseTo(8, 0);
  });

  test('a circulation is recognised, and its period measured', () => {
    const s = series(600, 1, t => 1.5 * t);
    const v = classifyAngle(s, { referencePeriod: 10 });
    expect(v.state).toBe(ANGLE_STATE.CIRCULATION);
    expect(v.period).toBeCloseTo(240, -1);
  });

  test('a circulation the other way round is still a circulation', () => {
    const v = classifyAngle(
      series(600, 1, t => -1.5 * t),
      { referencePeriod: 10 }
    );
    expect(v.state).toBe(ANGLE_STATE.CIRCULATION);
  });

  test('a body sitting exactly at an equilibrium is reported as one', () => {
    const v = classifyAngle(
      series(600, 1, () => 60),
      { referencePeriod: 10 }
    );
    expect(v.state).toBe(ANGLE_STATE.LIBRATION);
    expect(v.reason).toBe('stationary');
    expect(v.centre).toBeCloseTo(60, 6);
    expect(v.amplitude).toBeCloseTo(0, 6);
  });
});

describe('classifyAngle refuses when it should', () => {
  test('too few samples', () => {
    const v = classifyAngle(
      series(5, 1, t => t),
      { referencePeriod: 1 }
    );
    expect(v.state).toBe(ANGLE_STATE.INCONCLUSIVE);
    expect(v.reason).toBe('too-few-samples');
  });

  test('a window shorter than the conjunction cycles it needs', () => {
    const v = classifyAngle(
      series(200, 1, t => 180 + 0.01 * t),
      {
        referencePeriod: 100,
      }
    );
    expect(v.reason).toBe('too-short');
  });

  test('a series sampled too coarsely to unwrap', () => {
    // 170 degrees per sample: the unwrapper cannot tell forward from backward.
    const v = classifyAngle(
      series(200, 1, t => 170 * t),
      { referencePeriod: 1 }
    );
    expect(v.reason).toBe('undersampled');
  });

  test('a confined angle that has not turned back is not called a libration', () => {
    // The case that matters most. Twenty degrees of drift over a long record
    // is consistent with a libration and equally with a circulation eighteen
    // times slower than the observation, and nothing in the data separates
    // them. An earlier version reported this as a libration.
    const s = series(2000, 1, t => 180 + 0.01 * t);
    const v = classifyAngle(s, { referencePeriod: 20 });
    expect(v.state).toBe(ANGLE_STATE.INCONCLUSIVE);
    expect(v.reason).toBe('confined');
    // ...but it still reports what it has ruled out.
    expect(v.minimumCirculationPeriod).toBeCloseTo(36000, -2);
    expect(v.amplitudeIsBound).toBe(true);
  });

  test('a single reversal is not enough', () => {
    // Half a swing of a slow libration, which is also what a circulating angle
    // with a wobble looks like early on.
    const s = series(
      1200,
      1,
      t => 180 + 40 * Math.sin((2 * Math.PI * t) / 1800)
    );
    const v = classifyAngle(s, { referencePeriod: 10 });
    expect(v.state).toBe(ANGLE_STATE.INCONCLUSIVE);
    expect(['one-reversal', 'confined']).toContain(v.reason);
  });

  test('a slow circulation with a wobble is not a libration', () => {
    // This is Callisto, in closed form: a steady drift of a third of a turn
    // over the record with a 25-degree oscillation on top. The two reversals
    // are real; the centre moves, and that is what gives it away.
    const s = series(
      1600,
      1,
      t => 100 + 0.075 * t + 25 * Math.sin((2 * Math.PI * t) / 500)
    );
    const v = classifyAngle(s, { referencePeriod: 10 });
    expect(v.state).toBe(ANGLE_STATE.INCONCLUSIVE);
    expect(v.turns.length).toBeGreaterThanOrEqual(2);
    expect(['drifting-centre', 'one-reversal']).toContain(v.reason);
  });

  test('...while the same wobble about a fixed centre is a libration', () => {
    // Identical except that the drift is gone. The classifier must separate
    // these two, and nothing but the drift distinguishes them.
    const s = series(
      1600,
      1,
      t => 100 + 25 * Math.sin((2 * Math.PI * t) / 500)
    );
    const v = classifyAngle(s, { referencePeriod: 10 });
    expect(v.state).toBe(ANGLE_STATE.LIBRATION);
    expect(v.amplitude).toBeCloseTo(25, 0);
  });

  test('short-period ripple is not mistaken for libration', () => {
    // A ripple at the conjunction frequency has two extrema per cycle. Without
    // the averaging in smoothOverTime this reports a libration whose period is
    // the synodic period, which is confidently wrong.
    const s = series(
      3000,
      1,
      t => 180 + 0.02 * t + 6 * Math.sin((2 * Math.PI * t) / 30)
    );
    const v = classifyAngle(s, { referencePeriod: 30 });
    expect(v.state).not.toBe(ANGLE_STATE.LIBRATION);
    expect(v.ripple).toBeGreaterThan(3);
  });

  test('every refusal still carries the series, so a plot is never blank', () => {
    const v = classifyAngle(
      series(200, 1, t => 180 + 0.01 * t),
      {
        referencePeriod: 100,
      }
    );
    expect(v.reason).toBe('too-short');
    expect(v.unwrapped.length).toBe(200);
    expect(v.secular.length).toBe(200);
  });

  test('without a reference period the test falls back to the run length', () => {
    const s = series(2000, 1, t => 180 + 0.001 * t);
    const v = classifyAngle(s);
    expect(v.observedCycles).toBeNull();
    expect(v.state).toBe(ANGLE_STATE.INCONCLUSIVE);
  });

  test('the thresholds are all documented constants, not literals', () => {
    for (const key of [
      'minSamples',
      'maxStepDeg',
      'circulationDeg',
      'turnProminence',
      'boundedSpanDeg',
      'confinedCycles',
      'minCycles',
      'minLibrationCycles',
      'extremaWander',
      'driftOverAmplitude',
      'stationaryDeg',
    ]) {
      expect(typeof ANGLE_CRITERIA[key]).toBe('number');
    }
  });
});

// --- Conjunctions -------------------------------------------------------------

describe('conjunctions', () => {
  /** Two bodies with fixed mean motions, sampled. */
  const pair = (nInner, nOuter, n, dt) => {
    const out = [];
    for (let i = 0; i < n; i++) {
      out.push({
        t: i * dt,
        inner: wrap360(nInner * i * dt),
        outer: wrap360(nOuter * i * dt),
      });
    }
    return out;
  };

  test('finds one line-up per synodic period', () => {
    // 3 and 2 degrees per unit, so the relative longitude gains one degree per
    // unit and they line up every 360. The record starts with the two aligned,
    // so t = 0 is itself a conjunction and the 2,000-unit run holds six of
    // them: 0, 360, 720, 1080, 1440 and 1800.
    const events = conjunctions(pair(3, 2, 2000, 1));
    expect(events.length).toBe(6);
    expect(events[0].t).toBeCloseTo(0, 6);
    for (let i = 1; i < events.length; i++) {
      expect(events[i].t - events[i - 1].t).toBeCloseTo(360, 0);
    }
  });

  test('the longitude reported is the inner body’s at that instant', () => {
    const events = conjunctions(pair(3, 2, 2000, 1));
    for (const e of events) {
      expect(e.longitude).toBeCloseTo(wrap360(3 * e.t), 0);
    }
  });

  test('a pair that never lines up yields nothing', () => {
    const same = [];
    for (let i = 0; i < 200; i++)
      same.push({ t: i, inner: wrap360(i), outer: wrap360(i + 90) });
    expect(conjunctions(same)).toEqual([]);
  });

  test('cluster statistics are circular, not arithmetic', () => {
    // The mean of 1 and 359 is 0, not 180.
    const c = conjunctionCluster([{ longitude: 1 }, { longitude: 359 }]);
    expect(c.mean).toBeCloseTo(0, 6);
    expect(c.R).toBeGreaterThan(0.99);
  });

  test('a smear has a short mean vector and a tight clump a long one', () => {
    const spread = [];
    for (let i = 0; i < 36; i++) spread.push({ longitude: i * 10 });
    expect(conjunctionCluster(spread).R).toBeLessThan(0.05);

    const clump = [];
    for (let i = -18; i <= 18; i++) clump.push({ longitude: 180 + i * 0.5 });
    const tight = conjunctionCluster(clump);
    expect(tight.R).toBeGreaterThan(0.99);
    expect(tight.mean).toBeCloseTo(180, 6);
  });

  test('no events gives null rather than a fabricated mean', () => {
    expect(conjunctionCluster([])).toBeNull();
  });
});

// --- The rotating frame -------------------------------------------------------

describe('rotatingFrame', () => {
  const primary = { pos: { x: -1, y: 0 }, mass: 1000 };
  const secondary = { pos: { x: 999, y: 0 }, mass: 1 };

  test('the secondary lands on the positive x axis at unit distance', () => {
    const at = rotatingFrame(secondary.pos, primary, secondary, {
      normalise: true,
    });
    expect(at.x).toBeCloseTo(1, 6);
    expect(at.y).toBeCloseTo(0, 6);
  });

  test('a body sixty degrees ahead lands on L4', () => {
    const L4 = triangularPoints().L4;
    const sep = 1000;
    const th = Math.PI / 3;
    // Sixty degrees ahead of the secondary, one separation from the primary.
    const point = {
      x: primary.pos.x + sep * Math.cos(th),
      y: primary.pos.y + sep * Math.sin(th),
    };
    const at = rotatingFrame(point, primary, secondary, { normalise: true });
    // The frame's origin is the barycentre, which for this mass ratio is
    // essentially the primary, so the two agree to a part in a thousand.
    expect(at.x).toBeCloseTo(L4.x, 2);
    expect(at.y).toBeCloseTo(L4.y, 2);
  });

  test('the transform turns with the secondary', () => {
    // Rotate the whole configuration and every rotating-frame coordinate must
    // be unchanged. This is the property that makes the frame useful at all.
    const rotate = (p, a) => ({
      x: p.x * Math.cos(a) - p.y * Math.sin(a),
      y: p.x * Math.sin(a) + p.y * Math.cos(a),
    });
    const body = { x: 300, y: 700 };
    const before = rotatingFrame(body, primary, secondary, { normalise: true });
    for (const angle of [0.3, 1.9, -2.7]) {
      const after = rotatingFrame(
        rotate(body, angle),
        { ...primary, pos: rotate(primary.pos, angle) },
        { ...secondary, pos: rotate(secondary.pos, angle) },
        { normalise: true }
      );
      expect(after.x).toBeCloseTo(before.x, 8);
      expect(after.y).toBeCloseTo(before.y, 8);
    }
  });

  test('the triangular points are exactly equilateral', () => {
    const { L4, L5 } = triangularPoints();
    // Distance from the primary (origin, to the accuracy that matters here)
    // and from the secondary at (1, 0) are both one.
    expect(Math.hypot(L4.x, L4.y)).toBeCloseTo(1, 12);
    expect(Math.hypot(L4.x - 1, L4.y)).toBeCloseTo(1, 12);
    expect(L5.y).toBeCloseTo(-L4.y, 12);
  });

  test('degenerate configurations return null', () => {
    expect(rotatingFrame({ x: 0, y: 0 }, null, secondary)).toBeNull();
    expect(
      rotatingFrame(
        { x: 0, y: 0 },
        { pos: { x: 0, y: 0 }, mass: 0 },
        { pos: { x: 0, y: 0 }, mass: 0 }
      )
    ).toBeNull();
  });

  test('the co-orbital angle is the difference of the two directions', () => {
    const sun = { pos: { x: 0, y: 0 } };
    const jup = { pos: { x: 100, y: 0 } };
    const at60 = { pos: { x: 50, y: 50 * Math.sqrt(3) } };
    expect(coorbitalAngle(at60, sun, jup)).toBeCloseTo(60, 8);
    const behind = { pos: { x: 50, y: -50 * Math.sqrt(3) } };
    expect(coorbitalAngle(behind, sun, jup)).toBeCloseTo(-60, 8);
  });

  test('the tadpole period matches the linearised prediction for Jupiter', () => {
    const mu = 1 / 1047.3486;
    const massRatio = mu / (1 + mu);
    // Murray & Dermott give P / sqrt(27 mu / 4); for Jupiter that is 12.47
    // Jupiter years.
    expect(tadpolePeriod(1, massRatio)).toBeCloseTo(12.47, 1);
    expect(Number.isNaN(tadpolePeriod(0, 0.1))).toBe(true);
    expect(Number.isNaN(tadpolePeriod(1, 1))).toBe(true);
  });
});

// --- The published systems ----------------------------------------------------

describe('the parameter tables', () => {
  test('the Galilean moons reproduce their published period ratios', () => {
    const [io, europa, ganymede, callisto] = GALILEAN.moons;
    const r = (a, b) => a.periodDays / b.periodDays;
    expect(r(europa, io)).toBeCloseTo(GALILEAN.published.ratioEuropaIo, 3);
    expect(r(ganymede, europa)).toBeCloseTo(
      GALILEAN.published.ratioGanymedeEuropa,
      3
    );
    expect(r(ganymede, io)).toBeCloseTo(GALILEAN.published.ratioGanymedeIo, 3);
    expect(r(callisto, ganymede)).toBeCloseTo(
      GALILEAN.published.ratioCallistoGanymede,
      3
    );
  });

  test('the Laplace relation holds in the published periods themselves', () => {
    // n_Io - 3 n_Europa + 2 n_Ganymede = 0, to about one part in ten million.
    const [io, europa, ganymede] = GALILEAN.moons;
    const n = m => 360 / m.periodDays;
    const residual = n(io) - 3 * n(europa) + 2 * n(ganymede);
    expect(Math.abs(residual)).toBeLessThan(1e-4);
  });

  test('the built moons carry the published period ratios into the model', () => {
    const { primary, bodies, periodIo } = galileanBodies(G);
    expect(primary.name).toBe('Jupiter');
    expect(bodies.map(b => b.name)).toEqual([
      'Io',
      'Europa',
      'Ganymede',
      'Callisto',
    ]);
    const el = bodies.map(b => resonanceElements(b, primary, G));
    const [io, europa, ganymede, callisto] = el;
    expect(io.period).toBeCloseTo(periodIo, 6);
    expect(europa.period / io.period).toBeCloseTo(
      GALILEAN.published.ratioEuropaIo,
      3
    );
    expect(ganymede.period / io.period).toBeCloseTo(
      GALILEAN.published.ratioGanymedeIo,
      2
    );
    expect(callisto.period / ganymede.period).toBeCloseTo(
      GALILEAN.published.ratioCallistoGanymede,
      3
    );
  });

  test('the moons start with the Laplace argument at exactly 180 degrees', () => {
    const { primary, bodies } = galileanBodies(G);
    const el = Object.fromEntries(
      bodies.map(b => [b.name, resonanceElements(b, primary, G)])
    );
    expect(
      laplaceArgument(el.Io.lambda, el.Europa.lambda, el.Ganymede.lambda)
    ).toBeCloseTo(180, 6);
  });

  test('detuning moves Europa and nothing else', () => {
    const plain = galileanBodies(G);
    const bent = galileanBodies(G, { detune: GALILEAN.detune });
    const a = spec =>
      Object.fromEntries(
        spec.bodies.map(b => [b.name, resonanceElements(b, spec.primary, G).a])
      );
    const before = a(plain);
    const after = a(bent);
    expect(after.Europa / before.Europa).toBeCloseTo(GALILEAN.detune, 6);
    for (const name of ['Io', 'Ganymede', 'Callisto']) {
      expect(after[name]).toBeCloseTo(before[name], 8);
    }
  });

  test('the moons are drawn large enough to see and far enough apart to be safe', () => {
    // js/physics.js runs a contact test on planets, and a pair inside the sum
    // of their drawn radii is separated, given a momentum kick and, above 15
    // units per second of relative speed, turned into debris with Math.random.
    // Enlarged radii are cosmetic only as long as nothing can touch.
    const { primary, bodies } = galileanBodies(G);
    let worst = Infinity;
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const inner = resonanceElements(bodies[i], primary, G);
        const outer = resonanceElements(bodies[j], primary, G);
        // Worst case for this pair: the outer at its perihelion and the inner
        // at its aphelion, which is closer than they ever actually get.
        const gap = outer.periapsis - inner.apoapsis;
        worst = Math.min(worst, gap / (bodies[i].radius + bodies[j].radius));
      }
    }
    expect(worst).toBeGreaterThan(3);
    // ...and Jupiter itself, against the innermost moon at its closest.
    const io = resonanceElements(bodies[0], primary, G);
    expect(io.periapsis / (primary.radius + bodies[0].radius)).toBeGreaterThan(
      3
    );
  });

  test('Pluto is placed on the exact 3:2, not on its observed axis', () => {
    const { primary, bodies, semiMajorNeptune, semiMajorPluto } =
      plutoBodies(G);
    expect(primary.name).toBe('Sun');
    expect(semiMajorPluto / semiMajorNeptune).toBeCloseTo(
      Math.pow(1.5, 2 / 3),
      10
    );
    const el = Object.fromEntries(
      bodies.map(b => [b.name, resonanceElements(b, primary, G)])
    );
    expect(el.Pluto.period / el.Neptune.period).toBeCloseTo(1.5, 3);
    // ...and the observed axis is quoted so the lesson can name the difference.
    expect(PLUTO_NEPTUNE.pluto.observedAU).toBeGreaterThan(
      semiMajorPluto / 100
    );
  });

  test('Pluto’s perihelion really is inside Neptune’s orbit', () => {
    const { primary, bodies } = plutoBodies(G);
    const el = Object.fromEntries(
      bodies.map(b => [b.name, resonanceElements(b, primary, G)])
    );
    expect(el.Pluto.periapsis).toBeLessThan(el.Neptune.apoapsis);
    // The crossing is what makes the resonance interesting; without it there
    // would be nothing to protect.
    expect(el.Pluto.periapsis / 100).toBeCloseTo(29.66, 0);
  });

  test('Pluto starts at the argument the table asks for', () => {
    const { primary, bodies } = plutoBodies(G);
    const el = Object.fromEntries(
      bodies.map(b => [b.name, resonanceElements(b, primary, G)])
    );
    expect(
      plutoArgument(el.Pluto.lambda, el.Neptune.lambda, el.Pluto.varpi)
    ).toBeCloseTo(PLUTO_NEPTUNE.argument0, 4);
  });

  test('the Trojan scene puts the probes exactly where it says', () => {
    const spec = trojanBodies(G);
    const jupiter = spec.secondary;
    const by = name => spec.bodies.find(b => b.name === name);
    for (const probe of JUPITER_TROJANS.probes) {
      const body = by(probe.name);
      expect(body).toBeDefined();
      if (probe.axisMultiplier === 1) {
        expect(coorbitalAngle(body, spec.primary, jupiter)).toBeCloseTo(
          wrap180(probe.offsetDeg),
          6
        );
      }
    }
  });

  test('the L4 probe is at the exact equilateral point', () => {
    const spec = trojanBodies(G);
    const probe = spec.bodies.find(b => b.name === 'L4 probe');
    const sunToProbe = Math.hypot(
      probe.pos.x - spec.primary.pos.x,
      probe.pos.y - spec.primary.pos.y
    );
    const jupToProbe = Math.hypot(
      probe.pos.x - spec.secondary.pos.x,
      probe.pos.y - spec.secondary.pos.y
    );
    expect(sunToProbe).toBeCloseTo(spec.semiMajor, 6);
    expect(jupToProbe).toBeCloseTo(spec.semiMajor, 6);
  });

  test('the Trojan scene is built balanced about the origin', () => {
    const spec = trojanBodies(G);
    const all = [spec.primary, ...spec.bodies];
    let m = 0;
    let px = 0;
    let cx = 0;
    for (const b of all) {
      m += b.mass;
      px += b.mass * b.vel.x;
      cx += b.mass * b.pos.x;
    }
    expect(Math.abs(cx / m)).toBeLessThan(1e-6);
    expect(Math.abs(px / m)).toBeLessThan(1e-9);
  });

  test('Gascheau’s criterion is satisfied, which is why L4 holds at all', () => {
    const spec = trojanBodies(G);
    const ratio = (1 - spec.massRatio) / spec.massRatio;
    expect(ratio).toBeGreaterThan(JUPITER_TROJANS.published.stabilityMassRatio);
  });

  test('balance() zeroes the momentum and centres the system', () => {
    const bodies = [
      { mass: 10, pos: { x: 5, y: 0 }, vel: { x: 1, y: 0 } },
      { mass: 30, pos: { x: -5, y: 4 }, vel: { x: 0, y: 2 } },
    ];
    balance(bodies);
    const total = bodies.reduce((s, b) => s + b.mass, 0);
    const px = bodies.reduce((s, b) => s + b.mass * b.vel.x, 0);
    const py = bodies.reduce((s, b) => s + b.mass * b.vel.y, 0);
    const cx = bodies.reduce((s, b) => s + b.mass * b.pos.x, 0);
    expect(px / total).toBeCloseTo(0, 12);
    expect(py / total).toBeCloseTo(0, 12);
    expect(cx / total).toBeCloseTo(0, 12);
  });

  test('the Jovian scale factors are consistent with each other', () => {
    // Newtonian scale invariance: lengths by k means times by k^1.5.
    expect(TIME_SCALE_JOVIAN).toBeCloseTo(Math.pow(SCALE_JOVIAN, 1.5), 8);
    // And the converters honour it, so a period reported for the moons is in
    // real Jovian days rather than in the scenario's own inflated ones.
    const ioPeriodSim = galileanBodies(G).periodIo;
    expect(simSecondsToDays(ioPeriodSim, TIME_SCALE_JOVIAN)).toBeCloseTo(
      GALILEAN.moons[0].periodDays,
      2
    );
  });

  test('Neptune’s period comes out at the published value at true scale', () => {
    const { primary, bodies } = plutoBodies(G);
    const neptune = bodies.find(b => b.name === 'Neptune');
    const el = resonanceElements(neptune, primary, G);
    expect(simSecondsToYears(el.period)).toBeCloseTo(
      PLUTO_NEPTUNE.neptune.periodYears,
      0
    );
  });

  test('Jupiter’s period comes out at the published value at true scale', () => {
    const spec = trojanBodies(G);
    expect(simSecondsToYears(spec.period)).toBeCloseTo(
      JUPITER_TROJANS.jupiter.periodYears,
      1
    );
  });

  test('every table names its source', () => {
    for (const table of [GALILEAN, PLUTO_NEPTUNE, JUPITER_TROJANS]) {
      expect(typeof table.source).toBe('string');
      expect(table.source.length).toBeGreaterThan(30);
    }
  });
});

// --- The recorder -------------------------------------------------------------

describe('the recorder', () => {
  const world = (clock, xs) => ({
    clock,
    primary: {
      name: 'Sun',
      pos: { x: 0, y: 0 },
      vel: { x: 0, y: 0 },
      mass: 1000,
    },
    bodies: xs.map((x, i) => ({
      name: `b${i}`,
      pos: { x, y: 0 },
      vel: { x: 0, y: Math.sqrt((G * 1000) / x) },
      mass: 0,
    })),
    G,
  });

  test('records one sample per clock tick and ignores repeats', () => {
    const r = createRecorder();
    expect(r.record(world(0, [100]))).toBe(true);
    expect(r.record(world(0, [100]))).toBe(false);
    expect(r.record(world(1, [100]))).toBe(true);
    expect(r.series().length).toBe(2);
  });

  test('a clock that goes backwards clears the history', () => {
    const r = createRecorder();
    for (let t = 0; t < 10; t++) r.record(world(t, [100]));
    expect(r.series().length).toBe(10);
    r.record(world(2, [100]));
    expect(r.series().length).toBe(1);
  });

  test('a different set of bodies clears the history', () => {
    const r = createRecorder();
    for (let t = 0; t < 10; t++) r.record(world(t, [100]));
    r.record(world(20, [100, 200]));
    expect(r.series().length).toBe(1);
  });

  test('the buffer decimates instead of growing without bound', () => {
    const r = createRecorder({ maxSamples: 64 });
    for (let t = 0; t < 4000; t++) r.record(world(t, [100]));
    const stats = r.stats();
    expect(stats.samples).toBeLessThanOrEqual(64);
    expect(stats.halvings).toBeGreaterThan(3);
    // The window still reaches back to the beginning: decimation loses
    // resolution, never history.
    expect(r.series()[0].t).toBe(0);
    expect(r.window()).toBeGreaterThan(3000);
  });

  test('samples stay evenly spaced after decimation', () => {
    const r = createRecorder({ maxSamples: 64 });
    for (let t = 0; t < 4000; t++) r.record(world(t, [100]));
    const s = r.series();
    const gaps = [];
    for (let i = 1; i < s.length; i++) gaps.push(s[i].t - s[i - 1].t);
    expect(Math.max(...gaps) / Math.min(...gaps)).toBeLessThan(2.5);
  });

  test('partition picks the heaviest body as the primary', () => {
    const bodies = [
      { name: 'moon', mass: 1, alive: true },
      { name: 'planet', mass: 1000, alive: true },
      { name: 'rock', mass: 0.001, alive: true },
    ];
    const parts = partition({ bodies, G });
    expect(parts.primary.name).toBe('planet');
    expect(parts.bodies.map(b => b.name)).toEqual(['moon', 'rock']);
  });

  test('partition refuses a world with nothing in it', () => {
    expect(partition({ bodies: [], G })).toBeNull();
    expect(partition({ bodies: [{ name: 'lonely', mass: 1 }], G })).toBeNull();
    expect(partition(null)).toBeNull();
  });
});
