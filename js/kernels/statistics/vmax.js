// SPIKE (Roadmap III, Prompt 262 Part A): the prototype V/Vmax and 1/Vmax estimators. Never merged.
import { refused } from './check.js';
import { normalQuantile } from './special.js';
import { adaptive } from '../../numeric/quadrature.js';

const { Number, Math, Array } = globalThis;

const volumeOf = kind =>
  kind === 'unit' ? d => d * d * d : d => (4 * Math.PI * d * d * d) / 3;

/** <V/Vmax>, its z against the uniform null, the sum of 1/Vmax and its Poisson variance. */
export function vmaxStats(rows, { D = Infinity, volume = 'euclid', minObjects = 5 } = {}) {
  if (!Array.isArray(rows)) return refused('non-finite', 'rows is not a list');
  for (const r of rows)
    if (!Number.isFinite(r.d) || !Number.isFinite(r.dmax))
      return refused('non-finite', 'a distance is not finite');
  for (const r of rows)
    if (!(r.d > 0) || !(r.dmax > 0))
      return refused('bad-distance', 'a distance must be positive');
  if (rows.length < minObjects)
    return refused('too-few-objects', `${rows.length} objects, at least ${minObjects} are needed`);
  const V = volumeOf(volume);
  let sum = 0;
  let inv = 0;
  let inv2 = 0;
  for (const r of rows) {
    const vmax = V(Math.min(r.dmax, D));
    sum += V(r.d) / vmax;
    inv += 1 / vmax;
    inv2 += 1 / (vmax * vmax);
  }
  const n = rows.length;
  const mean = sum / n;
  return {
    status: 'ok',
    n,
    meanVOverVmax: mean,
    z: (mean - 0.5) * Math.sqrt(12 * n),
    sumInverseVmax: inv,
    variance: inv2,
  };
}

/** The volume out to D weighted by the completeness p(d); `breaks` split the integral. */
export function effectiveVolume({ D, completeness, volume = 'euclid', breaks = [] }) {
  if (!(D > 0)) return refused('bad-distance', 'D must be positive');
  let prevP = Infinity;
  for (let k = 1; k <= 64; k++) {
    const p = completeness((k * D) / 64);
    if (!(p >= 0 && p <= 1) || p > prevP + 1e-12)
      return refused('bad-completeness', 'completeness must lie in [0, 1] and not increase with distance');
    prevP = p;
  }
  const dV =
    volume === 'unit' ? d => 3 * d * d : d => 4 * Math.PI * d * d;
  const edges = [0, ...breaks.filter(b => b > 0 && b < D), D];
  let total = 0;
  for (let k = 0; k + 1 < edges.length; k++) {
    const a = edges[k];
    const b = edges[k + 1];
    const mid = 0.5 * (a + b);
    const p = completeness(mid);
    if (!(p >= 0 && p <= 1)) return refused('bad-completeness', 'completeness must lie in [0, 1]');
    total += adaptive(d => completeness(d) * dV(d), a, b, {
      absTol: 1e-14,
      relTol: 1e-13,
      maxDepth: 40,
    }).value;
  }
  return total;
}

/** The space density of a bin: sum of 1/Veff, its Poisson variance, a normal interval. */
export function spaceDensity(veffs, { level = 0.95, veffReference = null } = {}) {
  if (!Array.isArray(veffs)) return refused('non-finite', 'veffs is not a list');
  for (const v of veffs)
    if (!(Number.isFinite(v) && v > 0)) return refused('bad-completeness', 'an effective volume is not positive');
  if (veffs.length === 0) {
    const events = -Math.log(1 - level);
    return {
      status: 'upper-limit',
      density: null,
      upperLimit: veffReference ? events / veffReference : null,
    };
  }
  let s = 0;
  let s2 = 0;
  for (const v of veffs) {
    s += 1 / v;
    s2 += 1 / (v * v);
  }
  const z = normalQuantile((1 + level) / 2);
  const se = Math.sqrt(s2);
  return { status: 'ok', density: s, variance: s2, interval: [s - z * se, s + z * se] };
}
