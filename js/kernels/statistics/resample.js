// =============================================================================
// Resampling and Monte Carlo propagation on named streams (Prompt 154)
// -----------------------------------------------------------------------------
// Three ways to turn one fit into a distribution of fits, all deterministic:
// the draws come from js/random/streams.js's `noise` stream, keyed by the seed
// the caller gives, so the same seed gives the same draws bit for bit on every
// engine, and the stream's identity is recorded in the result.
//
//   caseBootstrap       resample the rows with replacement, recompute a statistic
//   residualBootstrap   keep the model's fit, resample its residuals
//   propagate           draw the parameters from a normal with the fitted
//                       covariance and push each draw through a function
//
// The draw count is fixed by the caller and bounded by DRAW_BUDGET: a count
// over the maximum throws (code "budget") rather than run for a minute on a
// student's phone; a count that is not a whole number throws (code "draws").
// Scientific refusals (a covariance that is not one) are returned, not thrown.
// No sampler of a posterior is here and none is promised (D-SAMPLER-01).
// =============================================================================

import { stream, gaussian } from '../../random/streams.js';
import { cholesky } from '../../numeric/linalg.js';

const { Math, Number, Int32Array, Float64Array } = globalThis;

/** The fixed number of draws a method takes unless told otherwise, and its ceiling. */
export const DRAW_BUDGET = Object.freeze({ default: 1000, max: 20000 });

export class StatisticsError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'StatisticsError';
    this.code = code;
  }
}

function checkDraws(draws) {
  if (!Number.isInteger(draws) || draws < 1)
    throw new StatisticsError(
      'draws',
      'the number of draws must be a whole number of at least 1'
    );
  if (draws > DRAW_BUDGET.max)
    throw new StatisticsError(
      'budget',
      `${draws} draws is over the budget of ${DRAW_BUDGET.max}`
    );
}

/** A uniform stream from a seed (named 'noise', labelled), or the stream given. */
function uniformFrom(seed, label) {
  if (typeof seed === 'function') return seed;
  return stream('noise', seed, label);
}

/** Collect statistic results: numbers in a Float64Array, vectors as an array of rows. */
function collector(draws) {
  let numbers = null;
  const rows = [];
  return {
    add(i, v) {
      if (Array.isArray(v) || ArrayBuffer.isView(v))
        rows.push(Float64Array.from(v));
      else {
        numbers ??= new Float64Array(draws);
        numbers[i] = v;
      }
    },
    get samples() {
      return numbers ?? rows;
    },
  };
}

/**
 * Resample n rows with replacement `draws` times and recompute a statistic.
 * @param {{n: number, statistic: function(Int32Array): number|number[],
 *   draws?: number, seed: string|number|function}} args - `statistic` receives
 *   the indices of one resample (a fresh array: it may keep it)
 * @returns {{status: 'ok', method: string, draws: number, stream: object,
 *   estimate: number|number[], samples: Float64Array|Float64Array[]}|{status: 'refused'}}
 */
export function caseBootstrap({
  n,
  statistic,
  draws = DRAW_BUDGET.default,
  seed,
}) {
  checkDraws(draws);
  if (!(n >= 2))
    return {
      status: 'refused',
      code: 'rows',
      why: 'a bootstrap needs at least two rows',
    };
  const u = uniformFrom(seed, 'case-bootstrap');
  const out = collector(draws);
  for (let d = 0; d < draws; d++) {
    const idx = new Int32Array(n);
    for (let i = 0; i < n; i++) idx[i] = Math.floor(u() * n);
    out.add(d, statistic(idx));
  }
  const identity = Int32Array.from({ length: n }, (_, i) => i);
  return {
    status: 'ok',
    method: 'case-bootstrap',
    draws,
    stream: u.stream ?? null,
    estimate: statistic(identity),
    samples: out.samples,
  };
}

/**
 * Hold the fit, resample its residuals (inflated by sqrt(n / (n - parameters))
 * so their variance is the unbiased one), and refit each synthetic data set.
 * @param {{fit: ArrayLike<number>, residuals: ArrayLike<number>,
 *   parameters?: number, refit: function(Float64Array): number|number[],
 *   draws?: number, seed: string|number|function}} args
 */
export function residualBootstrap({
  fit,
  residuals,
  parameters = 0,
  refit,
  draws = DRAW_BUDGET.default,
  seed,
}) {
  checkDraws(draws);
  const n = residuals.length;
  if (!(n >= 2) || fit.length !== n)
    return {
      status: 'refused',
      code: 'rows',
      why: 'a residual bootstrap needs matching fit and residuals of at least two rows',
    };
  if (!(n > parameters))
    return {
      status: 'refused',
      code: 'dof',
      why: 'no degrees of freedom are left',
    };
  const inflate = Math.sqrt(n / (n - parameters));
  const u = uniformFrom(seed, 'residual-bootstrap');
  const out = collector(draws);
  const y = new Float64Array(n);
  for (let d = 0; d < draws; d++) {
    for (let i = 0; i < n; i++)
      y[i] = fit[i] + inflate * residuals[Math.floor(u() * n)];
    out.add(d, refit(y));
  }
  return {
    status: 'ok',
    method: 'residual-bootstrap',
    draws,
    stream: u.stream ?? null,
    samples: out.samples,
  };
}

/**
 * Draw the parameters from a normal with the given mean and covariance
 * (Cholesky: the covariance must be positive definite) and evaluate `fn` at
 * each draw. A covariance a fit could not supply, or one that is not positive
 * definite (a degenerate fit, a parameter the data do not fix), is refused.
 * @param {{mean: number[], covariance: number[][]|null, fn: function(number[]): number|number[],
 *   draws?: number, seed: string|number|function}} args
 */
export function propagate({
  mean,
  covariance,
  fn,
  draws = DRAW_BUDGET.default,
  seed,
}) {
  checkDraws(draws);
  const k = mean?.length ?? 0;
  if (!covariance || covariance.length !== k || !k)
    return {
      status: 'refused',
      code: 'covariance',
      why: 'there is no covariance of the right size',
    };
  const L = cholesky(covariance);
  if (!L)
    return {
      status: 'refused',
      code: 'covariance',
      why: 'the covariance is not positive definite',
    };
  const u = uniformFrom(seed, 'propagation');
  const z = gaussian(u);
  const out = collector(draws);
  const theta = new Array(k);
  const g = new Array(k);
  for (let d = 0; d < draws; d++) {
    for (let j = 0; j < k; j++) g[j] = z();
    for (let i = 0; i < k; i++) {
      let s = mean[i];
      for (let j = 0; j <= i; j++) s += L[i][j] * g[j];
      theta[i] = s;
    }
    out.add(d, fn(theta.slice()));
  }
  return {
    status: 'ok',
    method: 'propagation',
    draws,
    stream: u.stream ?? null,
    samples: out.samples,
  };
}
