// =============================================================================
// The step history of the adaptive integrator
// -----------------------------------------------------------------------------
// NUMERICS_INSTRUMENTS.md, instrument I2. The 3-D kernel's Dormand-Prince 5(4)
// (js/lab3d/kernel.js dopri5, unchanged) chooses each step from a local error
// tolerance; this reads its onStep into a history: where the steps are short,
// how many were taken and thrown away, and what a fixed step of the same final
// error would have cost. It refuses a run whose step collapses (a close pair)
// and says where it stopped.
//
// Units are the kernel's (G = 1 unless given). Deterministic: the same bodies,
// span and tolerance give the same history. No uncertainty is reported.
// Imported by no shipped module (never precached).
// =============================================================================
import { makeState, dopri5, rk4 } from '../../lab3d/kernel.js';
import { separation } from './ledger.js';

const { Math, Number } = globalThis;

/** 2: the first step (the caller's guess) and the last (cut to the span) are not the controller's, and are left out of hMin, hMax and the slope (AM2). */
export const STEP_HISTORY_VERSION = 2;
/** A step shorter than this fraction of the span is a collapse. */
export const COLLAPSE = 1e-12;
/** Accepted plus rejected steps allowed. */
export const STEP_BUDGET = 200000;
/** The fixed-step search of costAtEqualError: N = 2^k for k in this range. */
export const FIXED_K = Object.freeze({ min: 4, max: 22 });

function checked(bodies, span, tol) {
  if (!(bodies?.length >= 2)) throw new RangeError('need two or more bodies');
  if (!(Number.isFinite(span) && span > 0))
    throw new RangeError('the span must be a positive number');
  if (!(Number.isFinite(tol) && tol > 0))
    throw new RangeError('the tolerance must be a positive number');
}

/**
 * One adaptive run and its history.
 * @param {Array<{m: number, x: number[], v: number[]}>} bodies - Two or more
 * @param {number} span - The time to cover
 * @param {{tol: number, h0?: number, G?: number}} opts
 * @returns {object} The history, or `{refused, at}` with what was taken so far
 */
export function stepHistory(bodies, span, { tol, h0 = 1e-3, G = 1 } = {}) {
  checked(bodies, span, tol);
  const s = makeState(bodies, { G });
  const steps = [];
  let collapsed = false;
  const r = dopri5(s, span, {
    tol,
    h0,
    maxSteps: STEP_BUDGET,
    onStep(h) {
      steps.push({ t: s.t, h, r: separation(s) });
      if (h < span * COLLAPSE && span - s.t > span * COLLAPSE) {
        collapsed = true;
        return false;
      }
      return true;
    },
  });
  const base = {
    accepted: r.accepted,
    rejected: r.rejected,
    evaluations: 1 + 6 * (r.accepted + r.rejected),
    steps,
  };
  if (collapsed || r.stopped) {
    const last = steps[steps.length - 1] ?? {
      t: s.t,
      h: r.h,
      r: separation(s),
    };
    return {
      refused: collapsed ? 'step-collapse' : 'step-budget',
      at: { t: last.t, h: last.h, r: last.r },
      ...base,
    };
  }
  steps[0].first = true;
  steps[steps.length - 1].last = true;
  let rMin = Infinity;
  let rMax = 0;
  for (const p of steps) {
    rMin = Math.min(rMin, p.r);
    rMax = Math.max(rMax, p.r);
  }
  const chosen = steps.slice(1, -1);
  if (chosen.length < 2) return { refused: 'too-few-steps', at: null, ...base };
  let lo = chosen[0];
  let hi = chosen[0];
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let sxy = 0;
  for (const p of chosen) {
    if (p.h < lo.h) lo = p;
    if (p.h > hi.h) hi = p;
    const x = Math.log(p.r);
    const y = Math.log(p.h);
    sx += x;
    sy += y;
    sxx += x * x;
    sxy += x * y;
  }
  const n = chosen.length;
  const denom = n * sxx - sx * sx;
  return {
    ...base,
    hMin: { ...lo },
    hMax: { ...hi },
    slope: denom > 0 ? (n * sxy - sx * sy) / denom : null,
    separationRange: { min: rMin, max: rMax },
    final: Array.from(s.x),
  };
}

const worst = (a, b) => {
  let e = 0;
  for (let k = 0; k < a.length; k++) e = Math.max(e, Math.abs(a[k] - b[k]));
  return e;
};

/**
 * What a fixed step of the same final error costs. The reference is the same
 * integrator at tol / 1000; the fixed step is the kernel's RK4 with N = 2^k
 * steps, the smallest k whose error against the reference is no larger than
 * the adaptive run's. Costs are force evaluations.
 * @returns {object} `{refused}` or the comparison
 */
export function costAtEqualError(bodies, span, { tol, h0 = 1e-3, G = 1 } = {}) {
  checked(bodies, span, tol);
  const adaptive = stepHistory(bodies, span, { tol, h0, G });
  if (adaptive.refused) return { refused: adaptive.refused, at: adaptive.at };
  const ref = makeState(bodies, { G });
  const rr = dopri5(ref, span, { tol: tol / 1000, h0, maxSteps: STEP_BUDGET });
  if (rr.stopped) return { refused: 'step-budget' };
  const errAdaptive = worst(adaptive.final, ref.x);
  for (let k = FIXED_K.min; k <= FIXED_K.max; k++) {
    const N = 2 ** k;
    const s = makeState(bodies, { G });
    const h = span / N;
    for (let i = 0; i < N; i++) rk4(s, h);
    const err = worst(s.x, ref.x);
    if (err <= errAdaptive)
      return {
        errAdaptive,
        errFixed: err,
        fixedSteps: N,
        fixedEvaluations: 4 * N,
        adaptiveEvaluations: adaptive.evaluations,
        ratio: (4 * N) / adaptive.evaluations,
      };
  }
  return { refused: 'no-fixed-step', errAdaptive };
}
