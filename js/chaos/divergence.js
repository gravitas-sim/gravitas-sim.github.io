// =============================================================================
// Measuring how two runs come apart
// -----------------------------------------------------------------------------
// Given two recorded runs of the same system started from almost the same
// state, this answers three questions in order, and refuses to answer the third
// unless the first two came out right:
//
//   1. How far apart are the two runs, at each moment of simulated time?
//   2. Is that separation growing exponentially, or is it doing something else
//      - staying put, or creeping up in proportion to time?
//   3. If it is exponential, how long does it take to grow by a factor of e?
//
// The refusal is the important part. Any monotonically increasing series can be
// fitted with a straight line in the log domain and made to yield a number with
// units of time, and that number can then be called a Lyapunov time. Doing so
// for a two-body orbit - where the separation grows linearly because one run is
// very slightly ahead of the other in phase - produces a confident-looking
// figure describing something that is not chaos at all. The whole point of this
// module is that it declines.
//
// What "distance between two runs" means here
// -----------------------------------------------------------------------------
// Configuration-space separation: with the bodies matched by their stable ids,
//
//   d(t) = sqrt( sum_i | r_i^A(t) - r_i^B(t) |^2 )
//
// in simulation length units. Positions only. A phase-space distance that added
// velocities would have to weigh a length against a speed, and any choice of
// weight is a choice of units masquerading as physics; the growth *rate* - the
// thing this actually reports - is the same either way, because both components
// grow at the same exponential rate in a chaotic system. `phaseDistance()`
// below computes the normalised phase-space version for anyone who wants it,
// and the widget shows both.
//
// Everything here is pure. It takes sample arrays and returns numbers, so the
// classroom claim "your two runs diverged exponentially with an e-folding time
// of seven simulated seconds" is a claim a test can check.
// =============================================================================

import { alignSeries, samplingStats } from '../experiments/align.js';

/** How the separation behaves over the interval that was measured. */
export const BEHAVIOUR = {
  IDENTICAL: 'identical',
  BOUNDED: 'bounded',
  LINEAR: 'linear',
  EXPONENTIAL: 'exponential',
  SATURATED: 'saturated',
  INSUFFICIENT: 'insufficient',
};

/** Why a Lyapunov-like estimate was not produced. */
export const REJECTION = {
  TOO_FEW_POINTS: 'too-few-points',
  TOO_LITTLE_RANGE: 'too-little-range',
  TOO_SHORT: 'too-short',
  POOR_FIT: 'poor-fit',
  NOT_GROWING: 'not-growing',
  NO_WINDOW: 'no-window',
};

/**
 * Thresholds, in one place, with the reason for each.
 *
 * These are deliberately strict. A classroom run is short, and the failure that
 * matters is a confident wrong number, not a missing one.
 */
export const CRITERIA = {
  // Three e-folds. Two is a factor of seven, which a linear trend can imitate
  // over a short window; three is a factor of twenty, which it cannot.
  minEfolds: 3,
  // Enough points that the fit is not being carried by two of them.
  minPoints: 10,
  // The fit has to be good in the log domain. 0.98 rejects the two-body phase
  // drift, which fits at about 0.89, while comfortably accepting real
  // exponential growth, which fits above 0.99.
  minR2: 0.98,
  // At least this many e-folding times must fit inside the fitted window, or
  // the "exponential" is one bend in a curve.
  minWindowEfolds: 2,
  // Below this the separation is at the level where two runs differ only by
  // floating-point summation order, and its logarithm is noise.
  noiseFloor: 1e-12,
};

/**
 * Configuration-space separation between two snapshots.
 *
 * Bodies are matched by stable id, never by array position. Two runs of the
 * same world can list their bodies in different orders once a merger has
 * removed one, and matching by index would then subtract one star's position
 * from another's and report the result as divergence.
 *
 * @param {Array<{id:number, x:number, y:number}>} a - Run A bodies
 * @param {Array<{id:number, x:number, y:number}>} b - Run B bodies
 * @returns {{d:number, matched:number, missing:number}} The separation
 */
export function configurationDistance(a, b) {
  const byId = new Map((b || []).map(o => [o.id, o]));
  let sum = 0;
  let matched = 0;
  for (const one of a || []) {
    const other = byId.get(one.id);
    if (!other) continue;
    sum += (one.x - other.x) ** 2 + (one.y - other.y) ** 2;
    matched++;
  }
  const total = (a || []).length;
  return {
    d: matched ? Math.sqrt(sum) : NaN,
    matched,
    missing: total - matched,
  };
}

/**
 * Normalised phase-space separation.
 *
 * Positions are divided by a length scale and velocities by a speed scale, so
 * the two halves are dimensionless before they are added. The scales are the
 * system's own - its extent and a characteristic speed - which is the only
 * choice that does not smuggle in an arbitrary constant.
 *
 * @param {Array<Object>} a - Run A bodies, {id,x,y,vx,vy}
 * @param {Array<Object>} b - Run B bodies
 * @param {{length:number, speed:number}} scale - Normalising scales
 * @returns {{d:number, matched:number}} The dimensionless separation
 */
export function phaseDistance(a, b, scale) {
  const L = scale?.length > 0 ? scale.length : 1;
  const V = scale?.speed > 0 ? scale.speed : 1;
  const byId = new Map((b || []).map(o => [o.id, o]));
  let sum = 0;
  let matched = 0;
  for (const one of a || []) {
    const other = byId.get(one.id);
    if (!other) continue;
    sum +=
      ((one.x - other.x) / L) ** 2 +
      ((one.y - other.y) / L) ** 2 +
      ((one.vx - other.vx) / V) ** 2 +
      ((one.vy - other.vy) / V) ** 2;
    matched++;
  }
  return { d: matched ? Math.sqrt(sum) : NaN, matched };
}

/**
 * The separation series for two recorded runs.
 *
 * Alignment is delegated to the Experiment Bench's own aligner, so the chaos
 * lesson and the bench cannot disagree about what "the same simulated time"
 * means. Samples that the two runs do not both cover are left out rather than
 * extrapolated.
 *
 * @param {Array<Object>} runA - Samples, each {t, bodies:[{id,x,y,vx,vy}]}
 * @param {Array<Object>} runB - Samples
 * @param {Object} [opts]
 * @param {'configuration'|'phase'} [opts.metric] - Which distance
 * @param {{length:number, speed:number}} [opts.scale] - For the phase metric
 * @returns {{series:Array<{t:number, d:number}>, window:Object,
 *   sampling:Object, unmatched:number}} The separation over time
 */
export function separationSeries(
  runA,
  runB,
  { metric = 'configuration', scale } = {}
) {
  const a = runA || [];
  const b = runB || [];
  // Align on simulated time by handing the aligner a scalar it can interpolate:
  // here, the index, so each aligned row names one sample from each run.
  const indexA = a.map((s, i) => ({ t: s.t, v: i }));
  const indexB = b.map((s, i) => ({ t: s.t, v: i }));
  const aligned = alignSeries(indexA, indexB, { maxRows: 20000 });

  const series = [];
  let unmatched = 0;
  for (const row of aligned.rows) {
    // Nearest sample rather than an interpolated body list: interpolating
    // positions between samples of a chaotic run would smooth exactly the
    // structure being measured.
    const sa = a[Math.round(row.a)];
    const sb = b[Math.round(row.b)];
    if (!sa || !sb) continue;
    const result =
      metric === 'phase'
        ? phaseDistance(sa.bodies, sb.bodies, scale)
        : configurationDistance(sa.bodies, sb.bodies);
    if (result.missing) unmatched += result.missing;
    if (Number.isFinite(result.d)) series.push({ t: row.t, d: result.d });
  }

  return {
    series,
    window: aligned.window,
    sampling: {
      a: samplingStats(a),
      b: samplingStats(b),
    },
    unmatched,
  };
}

// --- Fitting -------------------------------------------------------------------

/**
 * A least-squares line through log(d) against t.
 * @param {Array<{t:number, d:number}>} points - Strictly positive d
 * @returns {{slope:number, intercept:number, r2:number, n:number}} The fit
 */
export function logLinearFit(points) {
  const n = points.length;
  if (n < 2) return { slope: NaN, intercept: NaN, r2: 0, n };
  let st = 0;
  let sy = 0;
  let stt = 0;
  let sty = 0;
  for (const p of points) {
    const y = Math.log(p.d);
    st += p.t;
    sy += y;
    stt += p.t * p.t;
    sty += p.t * y;
  }
  const denom = n * stt - st * st;
  if (!(Math.abs(denom) > 0)) return { slope: NaN, intercept: NaN, r2: 0, n };
  const slope = (n * sty - st * sy) / denom;
  const intercept = (sy - slope * st) / n;
  const mean = sy / n;
  let residual = 0;
  let total = 0;
  for (const p of points) {
    const y = Math.log(p.d);
    residual += (y - (slope * p.t + intercept)) ** 2;
    total += (y - mean) ** 2;
  }
  return {
    slope,
    intercept,
    r2: total > 0 ? 1 - residual / total : 0,
    n,
  };
}

/**
 * Choose the interval to fit, and refuse if there is not one.
 *
 * The window has to avoid two things at both ends. At the bottom, the noise
 * floor: separations at the level of floating-point round-off carry no
 * information and their logarithm is nonsense. At the top, saturation: once the
 * two runs have completely rearranged themselves the separation stops growing
 * because it has run out of system to grow into, and including that flat tail
 * drags the fitted slope down and reports an e-folding time that is too long.
 *
 * The chosen upper bound is a fraction of the largest separation seen, which is
 * a proxy for the system's size that needs no extra input.
 *
 * @param {Array<{t:number, d:number}>} series - Separation series
 * @param {Object} [opts]
 * @param {number} [opts.floor] - Lower bound; defaults to the noise floor
 * @param {number} [opts.saturationFraction] - Upper bound as a fraction of max
 * @returns {{ok:boolean, points:Array, from:number, to:number,
 *   efolds:number, reason:string}} The window
 */
export function chooseWindow(series, { floor, saturationFraction = 0.2 } = {}) {
  const positive = (series || []).filter(
    p => Number.isFinite(p.d) && p.d > CRITERIA.noiseFloor
  );
  if (positive.length < CRITERIA.minPoints) {
    return empty(REJECTION.TOO_FEW_POINTS);
  }

  const max = Math.max(...positive.map(p => p.d));
  const lower = Math.max(
    floor ?? 0,
    CRITERIA.noiseFloor,
    // Start above the initial separation, which is the perturbation itself and
    // is not yet growth.
    positive[0].d * 1.5
  );
  const upper = max * saturationFraction;
  if (!(upper > lower)) return empty(REJECTION.TOO_LITTLE_RANGE);

  const points = positive.filter(p => p.d >= lower && p.d <= upper);
  if (points.length < CRITERIA.minPoints) {
    return empty(REJECTION.TOO_FEW_POINTS);
  }

  const efolds = Math.log(points[points.length - 1].d / points[0].d);
  if (!(efolds >= CRITERIA.minEfolds)) {
    return empty(REJECTION.TOO_LITTLE_RANGE, points);
  }

  return {
    ok: true,
    points,
    from: points[0].t,
    to: points[points.length - 1].t,
    efolds,
    reason: '',
  };
}

function empty(reason, points = []) {
  return { ok: false, points, from: NaN, to: NaN, efolds: 0, reason };
}

/**
 * Classify the separation, and estimate an e-folding time only if entitled to.
 *
 * @param {Array<{t:number, d:number}>} series - Separation series
 * @param {Object} [opts] - Passed to chooseWindow
 * @returns {{behaviour:string, tau:number|null, rate:number|null, r2:number,
 *   window:Object, efolds:number, growth:number, reason:string,
 *   linearR2:number}} The verdict
 */
export function analyseDivergence(series, opts = {}) {
  const s = (series || []).filter(p => Number.isFinite(p.d));
  const base = {
    tau: null,
    rate: null,
    r2: 0,
    linearR2: 0,
    window: null,
    efolds: 0,
    growth: 1,
    reason: '',
  };

  if (s.length < 2) {
    return {
      ...base,
      behaviour: BEHAVIOUR.INSUFFICIENT,
      reason: REJECTION.TOO_FEW_POINTS,
    };
  }

  const first = s.find(p => p.d > 0)?.d ?? 0;
  const last = s[s.length - 1].d;
  const growth = first > 0 ? last / first : Infinity;

  // Two runs that never differ at all are the reproducibility control, and it
  // is worth saying so explicitly rather than calling it "bounded".
  if (s.every(p => p.d <= CRITERIA.noiseFloor)) {
    return { ...base, behaviour: BEHAVIOUR.IDENTICAL, growth: 1 };
  }

  const window = chooseWindow(s, opts);

  // How well a straight line - not an exponential - describes the series. The
  // comparison is what separates ordinary phase drift, which is linear in time,
  // from chaos.
  const linearR2 = straightLineR2(s);

  if (!window.ok) {
    const behaviour =
      growth < 3
        ? BEHAVIOUR.BOUNDED
        : linearR2 >= CRITERIA.minR2
          ? BEHAVIOUR.LINEAR
          : BEHAVIOUR.INSUFFICIENT;
    return {
      ...base,
      behaviour,
      growth,
      linearR2,
      window,
      reason: window.reason,
    };
  }

  const fit = logLinearFit(window.points);
  const spanEfolds = fit.slope > 0 ? (window.to - window.from) * fit.slope : 0;

  if (!(fit.slope > 0)) {
    return {
      ...base,
      behaviour: BEHAVIOUR.BOUNDED,
      growth,
      linearR2,
      window,
      reason: REJECTION.NOT_GROWING,
    };
  }
  if (fit.r2 < CRITERIA.minR2) {
    // It grows, but not exponentially. If a straight line fits it better, say
    // so: that is the two-body case, and naming it is the lesson.
    return {
      ...base,
      behaviour: linearR2 > fit.r2 ? BEHAVIOUR.LINEAR : BEHAVIOUR.INSUFFICIENT,
      growth,
      r2: fit.r2,
      linearR2,
      window,
      reason: REJECTION.POOR_FIT,
    };
  }
  if (spanEfolds < CRITERIA.minWindowEfolds) {
    return {
      ...base,
      behaviour: BEHAVIOUR.INSUFFICIENT,
      growth,
      r2: fit.r2,
      linearR2,
      window,
      reason: REJECTION.TOO_SHORT,
    };
  }

  return {
    behaviour: BEHAVIOUR.EXPONENTIAL,
    tau: 1 / fit.slope,
    rate: fit.slope,
    r2: fit.r2,
    linearR2,
    window,
    efolds: window.efolds,
    growth,
    reason: '',
  };
}

/**
 * How well a straight line fits the separation itself.
 * @param {Array<{t:number, d:number}>} s - Separation series
 * @returns {number} r-squared of d against t
 */
export function straightLineR2(s) {
  const n = s.length;
  if (n < 3) return 0;
  let st = 0;
  let sd = 0;
  let stt = 0;
  let std = 0;
  for (const p of s) {
    st += p.t;
    sd += p.d;
    stt += p.t * p.t;
    std += p.t * p.d;
  }
  const denom = n * stt - st * st;
  if (!(Math.abs(denom) > 0)) return 0;
  const slope = (n * std - st * sd) / denom;
  const intercept = (sd - slope * st) / n;
  const mean = sd / n;
  let residual = 0;
  let total = 0;
  for (const p of s) {
    residual += (p.d - (slope * p.t + intercept)) ** 2;
    total += (p.d - mean) ** 2;
  }
  return total > 0 ? 1 - residual / total : 0;
}

/**
 * Is a divergence result resolved, or is it a property of the timestep?
 *
 * The physical claim the lesson makes is that the divergence is real. The only
 * evidence for that is refinement: run it again with a smaller step, or a
 * different integrator, and see whether the answer moves. If the e-folding time
 * shifts by more than a fifth, the number is describing the integrator rather
 * than the system, and the lesson has to say so.
 *
 * @param {Array<{label:string, tau:number|null, behaviour:string}>} results
 * @param {number} [tolerance] - Allowed fractional spread in tau
 * @returns {{resolved:boolean, spread:number|null, reason:string,
 *   agree:boolean}} The verdict
 */
export function refinementVerdict(results, tolerance = 0.2) {
  const usable = (results || []).filter(
    r => r && Number.isFinite(r.tau) && r.tau > 0
  );
  const behaviours = new Set((results || []).map(r => r?.behaviour));
  const agree = behaviours.size === 1;

  if (usable.length < 2) {
    return {
      resolved: false,
      spread: null,
      agree,
      reason: 'need-two-estimates',
    };
  }
  const taus = usable.map(r => r.tau);
  const lo = Math.min(...taus);
  const hi = Math.max(...taus);
  const spread = (hi - lo) / ((hi + lo) / 2);
  return {
    resolved: agree && spread <= tolerance,
    spread,
    agree,
    reason: !agree
      ? 'behaviour-changed'
      : spread > tolerance
        ? 'timescale-moved'
        : '',
  };
}
