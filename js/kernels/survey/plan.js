// =============================================================================
// A survey plan: depth, area, counts, false positives and a verdict (Prompt 215)
// -----------------------------------------------------------------------------
// SURVEY_DESIGN.md states the model and its limits. In short: the depth of a stack
// (depth.js), the area the time buys (pointings = floor(time / (visits (exposure +
// overhead))) times the field), the detections of a stated class through the
// completeness Phi(s - theta), the false positives of the threshold, Poisson
// intervals on the count, and a verdict with reason codes. A plan whose depth is
// beyond the class's range is refused (never extrapolated). Pure: no DOM.
// =============================================================================

import { CLASSES, classOf, cumulative, differential } from './counts.js';
import {
  completeness,
  depthOf,
  exposureForDepth,
  magnitudeAtSnr,
  matchedPixels,
  normalizeSetup,
  sigmaPixels,
  snrOfMagnitude,
  wellTime,
} from './depth.js';
import { normalTail, poissonInterval } from './special.js';
import { FWHM_PER_SIGMA } from '../detector/snr.js';

const { Math } = globalThis;

export const NIGHT = Object.freeze({
  hoursPerNight: 8,
  clearFraction: 0.6,
  threshold: 5,
});

/** The reliability below which a plan is called unreliable: false positives outnumber detections. */
export const RELIABLE = 0.5;

const SNR_BRIGHT = 4;
const SNR_FAINT_GAP = 4.75;
const SNR_FLOOR = 0.05;

const refuse = (code, extra = {}) => ({ ok: false, status: 'refused', code, ...extra });

/** Gauss-Legendre nodes and weights on [-1, 1], n points (Newton on the Legendre polynomial). */
function gaussLegendre(n) {
  const x = [];
  const w = [];
  for (let i = 0; i < n; i++) {
    let z = Math.cos((Math.PI * (i + 0.75)) / (n + 0.5));
    let pp = 1;
    for (let it = 0; it < 100; it++) {
      let p1 = 1;
      let p2 = 0;
      for (let j = 1; j <= n; j++) {
        const p3 = p2;
        p2 = p1;
        p1 = ((2 * j - 1) * z * p2 - (j - 1) * p3) / j;
      }
      pp = (n * (z * p1 - p2)) / (z * z - 1);
      const dz = p1 / pp;
      z -= dz;
      if (Math.abs(dz) < 1e-15) break;
    }
    x.push(z);
    w.push(2 / ((1 - z * z) * pp * pp));
  }
  return { x, w };
}
const GL = gaussLegendre(16);

/** The integral of f over [a, b] by `panels` panels of 16-point Gauss-Legendre. */
export function integrate(f, a, b, panels = 24) {
  const h = (b - a) / panels;
  let sum = 0;
  for (let p = 0; p < panels; p++) {
    const c = a + (p + 0.5) * h;
    for (let i = 0; i < GL.x.length; i++) sum += GL.w[i] * f(c + (h / 2) * GL.x[i]);
  }
  return (sum * h) / 2;
}

/** Elements (independent resolution cells of the matched filter) in one square degree. */
export const elementsPerDeg2 = setup =>
  3600 ** 2 / (4 * Math.PI * (setup.fwhm / FWHM_PER_SIGMA) ** 2);

/** False positives per independent element at threshold theta. */
export const falseRate = theta => normalTail(theta);

/**
 * Detections per square degree of a class by a stack: the sources brighter than the magnitude at which
 * the completeness is 0.99997, plus the integral of completeness times the differential count to the
 * magnitude where the completeness is 1e-6 (or the signal to noise 0.05, whichever is brighter), and
 * never beyond the class's mMax. Returns null when the depth is beyond the class's range.
 */
export function detectionsPerDeg2(setup, exposure, visits, theta, cls) {
  const mSharp = magnitudeAtSnr(setup, exposure, visits, theta);
  if (mSharp > cls.mMax) return null;
  const mA = magnitudeAtSnr(setup, exposure, visits, theta + SNR_BRIGHT);
  const mB = magnitudeAtSnr(
    setup,
    exposure,
    visits,
    Math.max(theta - SNR_FAINT_GAP, SNR_FLOOR)
  );
  const mEnd = Math.min(mB, cls.mMax);
  const C = m => completeness(snrOfMagnitude(setup, exposure, visits, m), theta);
  const bright = cumulative(cls, mA);
  const tail = mEnd > mA ? integrate(m => C(m) * differential(cls, m), mA, mEnd) : 0;
  return {
    sharp: cumulative(cls, mSharp),
    detected: bright + tail,
    mSharp,
    mBright: mA,
    mFaint: mEnd,
    truncated: mB > cls.mMax,
  };
}

/** The plan's fields checked and completed. */
export function normalizePlan(p) {
  if (!p || typeof p !== 'object') return refuse('bad-plan');
  const v = { ...NIGHT, visits: 1, ...p };
  if (!(v.exposure > 0) || !Number.isFinite(v.exposure)) return refuse('bad-exposure');
  if (!(Number.isInteger(v.visits) && v.visits >= 1)) return refuse('bad-visits');
  if (!(v.nights > 0) || !Number.isFinite(v.nights)) return refuse('bad-nights');
  if (!(v.hoursPerNight > 0 && v.hoursPerNight <= 24)) return refuse('bad-hours');
  if (!(v.clearFraction > 0 && v.clearFraction <= 1)) return refuse('bad-clear');
  if (!(v.threshold > 0)) return refuse('bad-threshold');
  if (v.fields !== undefined && !(Number.isInteger(v.fields) && v.fields >= 1))
    return refuse('bad-fields');
  return { ok: true, plan: v };
}

/**
 * Evaluate a plan.
 * @param {object} a
 * @param {object} a.setup - zeroPoint, pixelScale, fwhm, skyMag, readNoise, darkRate, fullWell, fovDeg2, overhead
 * @param {object} a.plan - exposure (s), visits, nights, hoursPerNight, clearFraction, threshold, fields (optional cap)
 * @param {string|object} a.cls - a class id or a class
 */
export function evaluate({ setup: rawSetup, plan: rawPlan, cls: rawCls }) {
  const ns = normalizeSetup(rawSetup);
  if (!ns.ok) return refuse(ns.code, { field: ns.field });
  const np = normalizePlan(rawPlan);
  if (!np.ok) return np;
  const cls = classOf(rawCls);
  if (!cls) return refuse('unknown-class');
  const { setup } = ns;
  const { plan } = np;
  const total = plan.nights * plan.hoursPerNight * 3600 * plan.clearFraction;
  const cycle = plan.visits * (plan.exposure + setup.overhead);
  const affordable = Math.floor(total / cycle);
  const pointings = plan.fields ? Math.min(affordable, plan.fields) : affordable;
  const area = pointings * setup.fovDeg2;
  const stack = plan.exposure * plan.visits;
  const depth = depthOf(setup, plan.exposure, plan.visits, plan.threshold);
  const depth5 = depthOf(setup, plan.exposure, plan.visits, 5);
  const tWell = wellTime(setup);
  const out = {
    ok: true,
    status: 'ok',
    version: '1.0.0',
    class: cls.id ?? 'custom',
    secondsAvailable: total,
    cycleSeconds: cycle,
    affordable,
    pointings,
    areaDeg2: area,
    stackSeconds: stack,
    secondsUsed: pointings * cycle,
    depth,
    depth5,
    sigmaPixels: sigmaPixels(setup),
    matchedPixels: matchedPixels(setup),
    wellSeconds: tWell,
    saturates: plan.exposure > tWell,
    elementsPerDeg2: elementsPerDeg2(setup),
    threshold: plan.threshold,
    counts: null,
  };
  if (depth > cls.mMax) {
    return {
      ...out,
      ok: true,
      status: 'outside-count-model',
      code: 'outside-count-model',
      range: [cls.mMin ?? -Infinity, cls.mMax],
    };
  }
  const det = detectionsPerDeg2(setup, plan.exposure, plan.visits, plan.threshold, cls);
  const lambda = det.detected * area;
  const falseDeg2 = falseRate(plan.threshold) * out.elementsPerDeg2;
  const falsePositives = falseDeg2 * area;
  const reliability = lambda + falsePositives > 0 ? lambda / (lambda + falsePositives) : NaN;
  return {
    ...out,
    counts: {
      perDeg2: { sharp: det.sharp, detected: det.detected, falsePositives: falseDeg2 },
      sharp: det.sharp * area,
      detected: lambda,
      falsePositives,
      reliability,
      unreliable: lambda > 0 && reliability < RELIABLE,
      interval68: poissonInterval(lambda, 0.6827),
      interval95: poissonInterval(lambda, 0.9545),
      magnitudes: { sharp: det.mSharp, bright: det.mBright, faint: det.mFaint },
      truncated: det.truncated,
    },
  };
}

/**
 * The verdict of a result against a goal {depth, areaDeg2, minReliability?}: feasible, or not
 * with every reason that applies: time, depth, area, saturates, reliability, outside-count-model.
 */
export function assess(result, goal = {}) {
  if (!result?.ok) return { feasible: false, reasons: [result?.code ?? 'refused'] };
  const reasons = [];
  if (result.status === 'outside-count-model') reasons.push('outside-count-model');
  if (result.pointings < 1) reasons.push('time');
  if (Number.isFinite(goal.depth) && result.depth < goal.depth) reasons.push('depth');
  if (Number.isFinite(goal.areaDeg2) && result.areaDeg2 < goal.areaDeg2) reasons.push('area');
  if (result.saturates) reasons.push('saturates');
  if (
    Number.isFinite(goal.minReliability) &&
    result.counts &&
    !(result.counts.reliability >= goal.minReliability)
  )
    reasons.push('reliability');
  return { feasible: reasons.length === 0, reasons };
}

/**
 * The time a setup needs to reach `goal` ({depth, areaDeg2}): the fewest visits of `exposure` seconds
 * whose stack reaches the depth (read noise of each frame counted), the pointings to cover the area, the
 * seconds and the nights. Reasons: saturates (the frame fills the well), not-reachable (no stack of this
 * frame reaches the depth).
 */
export function timeToGoal({ setup: rawSetup, goal, exposure, threshold = NIGHT.threshold, hoursPerNight = NIGHT.hoursPerNight, clearFraction = NIGHT.clearFraction }) {
  const ns = normalizeSetup(rawSetup);
  if (!ns.ok) return refuse(ns.code, { field: ns.field });
  const { setup } = ns;
  if (!(exposure > 0)) return refuse('bad-exposure');
  if (!(goal?.areaDeg2 > 0) || !Number.isFinite(goal.depth)) return refuse('bad-goal');
  const reasons = [];
  if (exposure > wellTime(setup)) reasons.push('saturates');
  let visits = 1;
  const reach = v => depthOf(setup, exposure, v, threshold) >= goal.depth;
  if (!reach(1e5)) {
    return { ok: true, feasible: false, reasons: [...reasons, 'not-reachable'], visits: null };
  }
  let hi = 1;
  while (!reach(hi)) hi *= 2;
  let lo = Math.floor(hi / 2);
  if (lo < 1) lo = 1;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (reach(mid)) hi = mid;
    else lo = mid + 1;
  }
  visits = lo;
  const pointings = Math.ceil(goal.areaDeg2 / setup.fovDeg2);
  const perPointing = visits * (exposure + setup.overhead);
  const seconds = pointings * perPointing;
  return {
    ok: true,
    feasible: reasons.length === 0,
    reasons,
    visits,
    pointings,
    perPointingSeconds: perPointing,
    seconds,
    nights: seconds / (hoursPerNight * 3600 * clearFraction),
    ratePerHour: (setup.fovDeg2 / perPointing) * 3600,
  };
}

/** Two setups against one goal: the time each needs, their ratio and the area each surveys per hour to the depth. */
export function compareSetups({ a, b, goal, exposureA, exposureB, threshold, hoursPerNight, clearFraction }) {
  const A = timeToGoal({ setup: a, goal, exposure: exposureA, threshold, hoursPerNight, clearFraction });
  const B = timeToGoal({ setup: b, goal, exposure: exposureB, threshold, hoursPerNight, clearFraction });
  if (!A.ok || !B.ok) return { ok: false, a: A, b: B };
  const comparable = Number.isFinite(A.seconds) && Number.isFinite(B.seconds);
  return {
    ok: true,
    a: A,
    b: B,
    timeRatio: comparable ? B.seconds / A.seconds : NaN,
    rateRatio: comparable ? B.ratePerHour / A.ratePerHour : NaN,
  };
}

/**
 * The trade-off at fixed time: one result per exposure of the grid, `visits` frames each, for the same
 * nights. Depth rises and area falls as the exposure grows.
 */
export function tradeoff({ setup, plan, cls, exposures }) {
  return exposures.map(t => {
    const r = evaluate({ setup, plan: { ...plan, exposure: t }, cls });
    return { exposure: t, result: r };
  });
}

/**
 * The exposure at which the sharp-cut count at fixed time is greatest, sky-limited and one visit:
 * beta overhead / (1 - beta), beta = 1.25 alpha, when beta < 1; Infinity when beta >= 1 (deeper always wins).
 */
export function optimumExposure(alpha, overhead) {
  const beta = 1.25 * alpha;
  return beta < 1 ? (beta * overhead) / (1 - beta) : Infinity;
}

/** The time two sky-limited setups need for the same depth stands as the seeing squared over the zero point. */
export const skyLimitedRatio = (a, b) =>
  (b.fwhm * b.fwhm * a.zeroPoint) / (a.fwhm * a.fwhm * b.zeroPoint);

export { CLASSES, exposureForDepth };
