// =============================================================================
// The divergence rate of an ensemble of pairs, with its window
// -----------------------------------------------------------------------------
// NUMERICS_INSTRUMENTS.md, instrument I3. One pair of runs gives one
// finite-window growth rate, or a refusal (js/chaos/divergence.js, unchanged:
// it is the authority for the window, the fit and the refusals). This is the
// ensemble form: many pairs, the median rate, and bounds that are the spread
// of the pairs' rates in their windows. The bounds are not a confidence
// interval and the median is not a Lyapunov exponent: a finite window on a
// finite run measures how fast these pairs came apart, in this window.
//
// It refuses when the ensemble does not show exponential growth: fewer than
// MIN_PAIRS pairs, or fewer than MIN_PAIRS or fewer than half of the pairs
// classed 'exponential'; the refusal names what the other pairs did.
//
// Pure. Rates are per unit of the series' time. Imported by no shipped module.
// =============================================================================
import { analyzeDivergence, BEHAVIOR } from '../../chaos/divergence.js';

const { Math } = globalThis;

export const MIN_PAIRS = 10;
export const MIN_FRACTION = 0.5;
const ORDER = [
  BEHAVIOR.IDENTICAL,
  BEHAVIOR.BOUNDED,
  BEHAVIOR.LINEAR,
  BEHAVIOR.SATURATED,
  BEHAVIOR.INSUFFICIENT,
];

/** The q-quantile of a sorted array, linear between order statistics (numpy's default). */
export function quantile(sorted, q) {
  const h = (sorted.length - 1) * q;
  const lo = Math.floor(h);
  const hi = Math.min(lo + 1, sorted.length - 1);
  return sorted[lo] + (h - lo) * (sorted[hi] - sorted[lo]);
}
const sortedOf = a => a.slice().sort((x, y) => x - y);

/**
 * The separation of two runs sampled at the same times: positions as flat
 * arrays [x0, y0, x1, y1, ...] per sample, bodies matched by index (valid only
 * while no body merges or is removed).
 */
export function separationOf(a, b) {
  let sum = 0;
  for (let k = 0; k < a.length; k++) sum += (a[k] - b[k]) * (a[k] - b[k]);
  return Math.sqrt(sum);
}

/**
 * @param {Array<Array<{t: number, d: number}>>} seriesList - One separation series per pair
 * @param {{level?: number}} [opts] - The central fraction the bounds hold (0.9)
 * @returns {object} `{refused, ...}` or the estimate
 */
export function ensembleRate(seriesList, { level = 0.9 } = {}) {
  if (!(level > 0 && level < 1))
    throw new RangeError('the level must be between 0 and 1');
  const pairs = (seriesList || []).map(s => {
    const v = analyzeDivergence(s);
    return {
      behavior: v.behavior,
      rate: v.rate,
      r2: v.r2,
      from: v.window?.from ?? null,
      to: v.window?.to ?? null,
      reason: v.reason,
    };
  });
  const n = pairs.length;
  const counts = {};
  for (const b of Object.values(BEHAVIOR)) counts[b] = 0;
  for (const p of pairs) counts[p.behavior]++;
  const base = { n, counts, pairs, level };
  if (n < MIN_PAIRS) return { refused: 'too-few-pairs', ...base };
  const exp = pairs.filter(p => p.behavior === BEHAVIOR.EXPONENTIAL);
  if (exp.length < MIN_PAIRS || exp.length < MIN_FRACTION * n) {
    let behavior = ORDER[0];
    for (const b of ORDER) if (counts[b] > counts[behavior]) behavior = b;
    return { refused: 'not-exponential', behavior, ...base };
  }
  const rates = sortedOf(exp.map(p => p.rate));
  const median = quantile(rates, 0.5);
  return {
    ...base,
    median,
    lo: quantile(rates, (1 - level) / 2),
    hi: quantile(rates, (1 + level) / 2),
    efoldingTime: 1 / median,
    r2: quantile(sortedOf(exp.map(p => p.r2)), 0.5),
    window: {
      from: quantile(sortedOf(exp.map(p => p.from)), 0.5),
      to: quantile(sortedOf(exp.map(p => p.to)), 0.5),
    },
  };
}
