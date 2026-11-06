// =============================================================================
// The morphology-density relation as a measured fraction (Prompt 250, rule R13)
// -----------------------------------------------------------------------------
// Local projected density of a member: Sigma_N = N / (pi d_N^2), d_N the projected distance to its N-th
// nearest other member in the table the caller gives (N is the caller's). Neighbours beyond the aperture
// are not in the table, so the density near the edge is underestimated. A bin is [lo, hi) in log10 Sigma;
// the fraction of a class is k / n with the exact Clopper-Pearson interval. Class labels are the
// caller's data with their source: the kernel holds no classification rule.
// =============================================================================

import { betaI, levelOfSigma } from '../../statistics/index.js';
import { refused } from './constants.js';

/**
 * Exact (Clopper-Pearson) interval for k successes in n trials at `level`.
 * @returns {{lo: number, hi: number}}
 */
export function clopperPearson(k, n, level = levelOfSigma(1)) {
  const alpha = 1 - level;
  const invert = (a, b, p) => {
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 200; i++) {
      const mid = 0.5 * (lo + hi);
      if (mid === lo || mid === hi) break;
      if (betaI(mid, a, b) < p) lo = mid;
      else hi = mid;
    }
    return 0.5 * (lo + hi);
  };
  return {
    lo: k === 0 ? 0 : invert(k, n - k + 1, alpha / 2),
    hi: k === n ? 1 : invert(k + 1, n - k, 1 - alpha / 2),
  };
}

/**
 * Sigma_N for every row of a pair-separation matrix (Mpc); NaN where fewer than N other members exist.
 * @param {ArrayLike<ArrayLike<number>>} rows
 */
export function localDensities(rows, neighbours) {
  if (!Number.isInteger(neighbours) || neighbours < 1)
    return refused(
      'bad-neighbours',
      'the neighbour count must be a positive integer'
    );
  const n = rows.length;
  const out = new Float64Array(n).fill(NaN);
  for (let i = 0; i < n; i++) {
    if (n - 1 < neighbours) continue;
    const d = [];
    for (let j = 0; j < n; j++) if (j !== i) d.push(rows[i][j]);
    d.sort((a, b) => a - b);
    const dN = d[neighbours - 1];
    out[i] = neighbours / (Math.PI * dN * dN);
  }
  return out;
}

/**
 * The fraction of a class per bin of log10 Sigma.
 * @param {{density: ArrayLike<number>, isClass: boolean[], edgesLog10: number[], level?: number}} p
 */
export function morphologyDensity({
  density,
  isClass,
  edgesLog10,
  level = levelOfSigma(1),
}) {
  if (!Array.isArray(edgesLog10) || edgesLog10.length < 2)
    return refused('bad-edges', 'the bins need at least two edges');
  const bins = [];
  for (let b = 0; b + 1 < edgesLog10.length; b++) {
    let n = 0;
    let k = 0;
    for (let i = 0; i < density.length; i++) {
      if (!(density[i] > 0)) continue;
      const l = Math.log10(density[i]);
      if (l >= edgesLog10[b] && l < edgesLog10[b + 1]) {
        n++;
        if (isClass[i]) k++;
      }
    }
    const row = { lo: edgesLog10[b], hi: edgesLog10[b + 1], n, k };
    if (n > 0) {
      const ci = clopperPearson(k, n, level);
      Object.assign(row, {
        fraction: k / n,
        intervalLo: ci.lo,
        intervalHi: ci.hi,
        level,
      });
    } else Object.assign(row, { fraction: null });
    bins.push(row);
  }
  return {
    status: 'ok',
    bins,
    caveat:
      "neighbours beyond the aperture are not in the table, so the density near its edge is underestimated; class labels are the caller's",
  };
}
