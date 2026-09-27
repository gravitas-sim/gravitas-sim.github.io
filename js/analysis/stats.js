// =============================================================================
// The statistics the analysis laboratory rests on
// -----------------------------------------------------------------------------
// Small, exact where it can be, and every one named in ANALYSIS_LAB.md with
// what it assumes. Nothing here touches the DOM or the clock, and every random
// draw comes from a seeded stream, so the same seed gives the same interval,
// bit for bit, on every machine.
//
// It imports nothing, on purpose. Its callers are lazy panels on pages that
// already load js/rng.js and js/measure/periodogram.js's neighbors at start,
// and esbuild moves a module two such chunks share into a chunk of its own:
// one more request for every visitor. So the generator (mulberry32, as
// js/rng.js has it) and ln Gamma (Lanczos, as js/measure/periodogram.js has
// it) are here too, each tested against known values.
//
//   describe      n, mean, standard deviation and error, quantiles
//   quantile      type 7 (linear between order statistics), R's default
//   meanInterval  Student's t interval for a mean, at 95%
//   bootstrap     percentile interval of any statistic, seeded
//   permutation   a seeded permutation test of "the groups do not differ"
//   histogram     Freedman-Diaconis bins, or a count asked for
//   spearman      rank correlation, ties averaged
//   chiSquareSf   upper tail of chi-square, by the regularized gamma function
//
// The confidence level is 95% throughout. A second level would be a second
// table of t quantiles and a second meaning to explain; one is enough to
// teach with, and the methods say which it is.
// =============================================================================

/** The level of every interval here. */
export const LEVEL = 0.95;

/** The finite values, ascending, as a Float64Array. */
export function sortedFinite(values) {
  const out = Float64Array.from(
    Array.from(values).filter(v => Number.isFinite(v))
  );
  return out.sort();
}

/**
 * Quantile p of values already sorted ascending: type 7 of Hyndman and Fan
 * (1996), linear between the order statistics at (n - 1) p.
 * @param {ArrayLike<number>} s - Sorted values
 * @param {number} p - In [0, 1]
 * @returns {number|null}
 */
export function quantile(s, p) {
  const n = s.length;
  if (!n) return null;
  const h = (n - 1) * p;
  const lo = Math.floor(h);
  const hi = Math.min(n - 1, lo + 1);
  return s[lo] + (h - lo) * (s[hi] - s[lo]);
}

/**
 * Student's t quantile at 0.975 for df degrees of freedom. Tabulated to three
 * decimals (the values every statistics table prints), and interpolated in
 * 1/df between the entries, which is exact enough for the third decimal.
 */
const T975 = [
  12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201,
  2.179, 2.16, 2.145, 2.131, 2.12, 2.11, 2.101, 2.093, 2.086, 2.08, 2.074,
  2.069, 2.064, 2.06, 2.056, 2.052, 2.048, 2.045, 2.042,
];
const T975_TAIL = [
  [30, 2.042],
  [40, 2.021],
  [60, 2.0],
  [120, 1.98],
  [Infinity, 1.96],
];
export function t975(df) {
  if (!(df >= 1)) return null;
  if (df <= 30 && Number.isInteger(df)) return T975[df - 1];
  for (let i = 1; i < T975_TAIL.length; i++) {
    const [d0, v0] = T975_TAIL[i - 1];
    const [d1, v1] = T975_TAIL[i];
    if (df <= d1) {
      const u = (1 / df - 1 / d0) / (1 / d1 - 1 / d0);
      return v0 + u * (v1 - v0);
    }
  }
  return 1.96;
}

/**
 * The usual numbers of a sample.
 * @param {ArrayLike<number>} values - Non-finite values are left out, and counted
 * @returns {{n: number, left: number, mean: number|null, sd: number|null,
 *   se: number|null, min: number|null, q16: number|null, median: number|null,
 *   q84: number|null, max: number|null}}
 */
export function describe(values) {
  const all = Array.from(values);
  const s = sortedFinite(all);
  const n = s.length;
  const out = {
    n,
    left: all.length - n,
    mean: null,
    sd: null,
    se: null,
    min: null,
    q16: null,
    median: null,
    q84: null,
    max: null,
  };
  if (!n) return out;
  let sum = 0;
  for (const v of s) sum += v;
  const mean = sum / n;
  out.mean = mean;
  if (n > 1) {
    let ss = 0;
    for (const v of s) ss += (v - mean) ** 2;
    out.sd = Math.sqrt(ss / (n - 1));
    out.se = out.sd / Math.sqrt(n);
  }
  out.min = s[0];
  out.max = s[n - 1];
  out.q16 = quantile(s, 0.16);
  out.median = quantile(s, 0.5);
  out.q84 = quantile(s, 0.84);
  return out;
}

/**
 * A 95% interval for a mean, from Student's t: mean ± t(n - 1) s / sqrt(n).
 * It assumes the values scatter normally about the mean; the methods say so,
 * and the validation measures how it does when they do not.
 * @returns {{lo: number, hi: number}|null} Null for fewer than two values
 */
export function meanInterval(d) {
  if (!(d.n >= 2) || d.se === null) return null;
  const h = t975(d.n - 1) * d.se;
  return { lo: d.mean - h, hi: d.mean + h };
}

/**
 * A seeded uniform stream in [0, 1): mulberry32, seeded by the FNV-1a hash
 * of the seed's text, as js/rng.js seeds it.
 */
export function stream(seed) {
  let h = 0x811c9dc5;
  const text = String(seed);
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The percentile bootstrap (Efron and Tibshirani 1993, ch. 13): resample the
 * values with replacement, recompute the statistic, and take the 2.5th and
 * 97.5th percentiles of the recomputed ones.
 * @param {ArrayLike<number>} values - Finite values
 * @param {(xs: Float64Array) => number} stat
 * @param {{resamples?: number, seed?: string|number, next?: () => number}} [o]
 *   A caller running many intervals passes one stream as `next`, so their
 *   draws do not repeat each other.
 * @returns {{estimate: number, lo: number, hi: number, resamples: number}|null}
 *   Null for fewer than two values: a single value resamples to itself.
 */
export function bootstrap(values, stat, o = {}) {
  const xs = Float64Array.from(values);
  const n = xs.length;
  if (n < 2) return null;
  const B = o.resamples ?? 1000;
  const next = o.next ?? stream(o.seed ?? 'bootstrap');
  const draw = new Float64Array(n);
  const got = new Float64Array(B);
  for (let b = 0; b < B; b++) {
    for (let i = 0; i < n; i++) draw[i] = xs[Math.floor(next() * n)];
    got[b] = stat(draw);
  }
  got.sort();
  const a = (1 - LEVEL) / 2;
  return {
    estimate: stat(xs),
    lo: quantile(got, a),
    hi: quantile(got, 1 - a),
    resamples: B,
  };
}

export const mean = xs => {
  let s = 0;
  for (const v of xs) s += v;
  return s / xs.length;
};
export const median = xs => quantile(Float64Array.from(xs).sort(), 0.5);

/**
 * The share of the total scatter that lies between groups: the correlation
 * ratio eta² = SS_between / SS_total of a one-way analysis of variance.
 * @param {number[][]} groups - Each group's values
 * @returns {{eta2: number, between: number, within: number, n: number}|null}
 */
export function varianceShare(groups) {
  const all = groups.flat();
  const n = all.length;
  if (n < 2) return null;
  const grand = mean(all);
  let total = 0;
  for (const v of all) total += (v - grand) ** 2;
  let between = 0;
  for (const g of groups)
    if (g.length) between += g.length * (mean(g) - grand) ** 2;
  return {
    eta2: total > 0 ? between / total : 0,
    between,
    within: total - between,
    n,
  };
}

/**
 * A permutation test of "which group a value is in makes no difference":
 * shuffle the values among the groups, keeping their sizes, and count how
 * often the shuffled eta² is at least the observed one. p = (1 + k) / (1 + B),
 * which is never zero, because the observed labeling is one of the
 * permutations (Phipson and Smyth 2010).
 * @param {number[][]} groups
 * @param {{permutations?: number, next?: () => number, seed?: string|number}} [o]
 * @returns {{p: number, eta2: number, permutations: number}|null}
 */
export function permutationTest(groups, o = {}) {
  const sizes = groups.map(g => g.length).filter(k => k > 0);
  if (sizes.length < 2) return null;
  const pool = Float64Array.from(groups.flat());
  const n = pool.length;
  if (n < 3) return null;
  const observed = varianceShare(groups).eta2;
  const B = o.permutations ?? 999;
  const next = o.next ?? stream(o.seed ?? 'permutation');
  const work = Float64Array.from(pool);
  let k = 0;
  const grand = mean(pool);
  let total = 0;
  for (const v of pool) total += (v - grand) ** 2;
  if (!(total > 0)) return { p: 1, eta2: 0, permutations: B };
  for (let b = 0; b < B; b++) {
    // Fisher-Yates, then read the groups off in order.
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      const tmp = work[i];
      work[i] = work[j];
      work[j] = tmp;
    }
    let between = 0;
    let at = 0;
    for (const size of sizes) {
      let s = 0;
      for (let i = at; i < at + size; i++) s += work[i];
      between += size * (s / size - grand) ** 2;
      at += size;
    }
    // A tolerance, so a shuffle that ties the observation counts as one.
    if (between / total >= observed - 1e-12) k++;
  }
  return { p: (1 + k) / (1 + B), eta2: observed, permutations: B };
}

/**
 * Bins for a histogram. Freedman and Diaconis (1981): width 2 IQR n^(-1/3),
 * between 5 and 40 bins, so a tail does not make it one bar or a thousand.
 * @param {ArrayLike<number>} values
 * @param {{bins?: number}} [o]
 * @returns {{edges: number[], counts: number[], rule: string}|null}
 */
export function histogram(values, o = {}) {
  const s = sortedFinite(values);
  const n = s.length;
  if (!n) return null;
  const lo = s[0];
  const hi = s[n - 1];
  let bins = o.bins;
  let rule = 'given';
  if (!bins) {
    const iqr = quantile(s, 0.75) - quantile(s, 0.25);
    const width = (2 * iqr) / Math.cbrt(n);
    bins = width > 0 ? Math.ceil((hi - lo) / width) : 1;
    bins = Math.max(5, Math.min(40, bins));
    rule = 'freedman-diaconis';
  }
  if (hi === lo) return { edges: [lo, hi], counts: [n], rule: 'single-value' };
  const w = (hi - lo) / bins;
  const edges = Array.from({ length: bins + 1 }, (_, i) =>
    i === bins ? hi : lo + i * w
  );
  const counts = new Array(bins).fill(0);
  for (const v of s) counts[Math.min(bins - 1, Math.floor((v - lo) / w))]++;
  return { edges, counts, rule };
}

/** Ranks from 1, ties given the mean of the ranks they share. */
export function ranks(values) {
  const idx = Array.from(values, (v, i) => i).sort(
    (a, b) => values[a] - values[b]
  );
  const r = new Float64Array(values.length);
  for (let i = 0; i < idx.length;) {
    let j = i;
    while (j + 1 < idx.length && values[idx[j + 1]] === values[idx[i]]) j++;
    const rank = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) r[idx[k]] = rank;
    i = j + 1;
  }
  return r;
}

/** Pearson's correlation, or null where either side does not vary. */
export function pearson(x, y) {
  const n = x.length;
  if (n < 3) return null;
  const mx = mean(x);
  const my = mean(y);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (x[i] - mx) * (y[i] - my);
    sxx += (x[i] - mx) ** 2;
    syy += (y[i] - my) ** 2;
  }
  return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : null;
}

/** Spearman's rho: Pearson's correlation of the ranks. */
export function spearman(x, y) {
  return pearson(ranks(x), ranks(y));
}

/** ln Gamma(x), x > 0: Lanczos (g = 7, nine terms), good to about 1e-15. */
export function lnGamma(x) {
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (x < 0.5)
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - lnGamma(1 - x);
  const z = x - 1;
  let a = c[0];
  const t = z + 7.5;
  for (let i = 1; i < 9; i++) a += c[i] / (z + i);
  return (
    0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(a)
  );
}

/**
 * The regularized upper incomplete gamma function Q(a, x) = Gamma(a, x) /
 * Gamma(a): its series below x = a + 1, its continued fraction above
 * (Press et al., Numerical Recipes, 3rd ed., section 6.2).
 */
export function gammaQ(a, x) {
  if (!(a > 0) || !(x >= 0)) return NaN;
  if (x === 0) return 1;
  const lead = -x + a * Math.log(x) - lnGamma(a);
  if (x < a + 1) {
    let sum = 1 / a;
    let term = sum;
    for (let n = 1; n < 1000; n++) {
      term *= x / (a + n);
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * 1e-16) break;
    }
    return Math.max(0, 1 - sum * Math.exp(lead));
  }
  // Modified Lentz.
  const tiny = 1e-300;
  let b = x + 1 - a;
  let c = 1 / tiny;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 1000; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < tiny) d = tiny;
    c = b + an / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-16) break;
  }
  return Math.exp(lead) * h;
}

/** P(chi-square with k degrees of freedom > x). */
export function chiSquareSf(x, k) {
  return gammaQ(k / 2, x / 2);
}
