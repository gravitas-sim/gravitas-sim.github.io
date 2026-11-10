// =============================================================================
// Populations of a joined table: counts with Poisson intervals, and a
// two-sample comparison of means through the statistics kernel (Prompt 263)
// -----------------------------------------------------------------------------
// distribution(): the counts of a column in bins, each with the exact or
// deviance Poisson interval of the statistics kernel's poissonInterval.
// compareSamples(): the difference of two means and its variance from
// difference() (Prompt 154), in the class where that is valid: two independent
// samples of at least 30 values each, finite, with a mean that is roughly
// normal at that size. A smaller sample is refused, not given a p value.
// =============================================================================

import { refused } from '../statistics/check.js';
import { difference } from '../statistics/compare.js';
import { poissonInterval } from '../statistics/intervals.js';
import { normalQuantile } from '../statistics/special.js';
import { LIMITS } from './constants.js';

/**
 * @param {ArrayLike<number>} values
 * @param {{edges: number[], level?: number}} o - ascending bin edges; a value in
 *   [edges[k], edges[k+1]) is in bin k and the last bin includes its upper edge
 */
export function distribution(values, { edges, level = 0.95 } = {}) {
  if (!Array.isArray(edges) || edges.length < 2)
    return refused('edges', 'bins need at least two edges');
  for (let k = 1; k < edges.length; k++)
    if (!(edges[k] > edges[k - 1]) || !Number.isFinite(edges[k]))
      return refused('edges', 'the edges must increase and be finite');
  const counts = new Array(edges.length - 1).fill(0);
  let outside = 0;
  let n = 0;
  for (const v of values) {
    if (!Number.isFinite(v))
      return refused('input', 'a value is not a finite number');
    n++;
    const last = edges.length - 1;
    if (v < edges[0] || v > edges[last]) {
      outside++;
      continue;
    }
    let k = 0;
    while (k < last - 1 && v >= edges[k + 1]) k++;
    counts[k]++;
  }
  const bins = counts.map((count, k) => {
    const iv = poissonInterval([count], { level });
    return {
      lo: edges[k],
      hi: edges[k + 1],
      count,
      intervalLo: iv.lo,
      intervalHi: iv.hi,
      method: iv.method,
    };
  });
  return { status: 'ok', n, outside, level, bins };
}

const meanVar = x => {
  let m = 0;
  for (const v of x) m += v;
  m /= x.length;
  let s = 0;
  for (const v of x) s += (v - m) ** 2;
  return { n: x.length, mean: m, variance: s / (x.length - 1) };
};

/**
 * The difference of the means of two independent samples.
 * @returns {object} {status: 'ok', value, sigma, z, p, lo, hi, ...} or a refusal
 */
export function compareSamples(x, y, { level = 0.95 } = {}) {
  const a = Array.from(x ?? []);
  const b = Array.from(y ?? []);
  if (![...a, ...b].every(Number.isFinite))
    return refused('input', 'a value is not a finite number');
  if (a.length < LIMITS.minSample || b.length < LIMITS.minSample)
    return refused(
      'sample-size',
      `each sample needs at least ${LIMITS.minSample} values (there are ${a.length} and ${b.length}); a smaller sample's mean is not normal enough for this comparison`
    );
  if (!(level > 0 && level < 1))
    return refused('level', 'the level is not between 0 and 1');
  const A = meanVar(a);
  const B = meanVar(b);
  const d = difference({
    a: A.mean,
    b: B.mean,
    varA: A.variance / A.n,
    varB: B.variance / B.n,
  });
  if (d.status !== 'ok')
    return {
      ...d,
      status: 'degenerate',
      why: 'both samples are constant: there is no spread to compare against',
    };
  const half = normalQuantile((1 + level) / 2) * d.sigma;
  return {
    status: 'ok',
    method: 'difference-of-means',
    value: d.value,
    sigma: d.sigma,
    z: d.z,
    p: d.p,
    level,
    lo: d.value - half,
    hi: d.value + half,
    nA: A.n,
    nB: B.n,
    assumes: [
      'the two samples are independent',
      'each mean is roughly normal at this size (the samples are not heavily skewed)',
      ...d.assumes,
    ],
  };
}
