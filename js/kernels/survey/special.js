// =============================================================================
// The few special functions the survey kernel needs (Prompt 215, SURVEY_DESIGN.md)
// -----------------------------------------------------------------------------
// The Gaussian tail and distribution, the gamma function, and the Poisson
// distribution with its prediction interval. Written out here, with no import, so
// the kernel stands alone; each is checked against SciPy in
// tests/fixtures/survey/oracle-results.json (A6, A7, A1).
// =============================================================================

const { Math } = globalThis;

/** erfc(x) to about 1e-14 relative: the Maclaurin series of erf below 2.5, Lentz's continued fraction above. */
export function erfc(x) {
  if (Number.isNaN(x)) return NaN;
  if (x < 0) return 2 - erfc(-x);
  if (x === 0) return 1;
  if (x < 2.5) {
    let term = x;
    let sum = x;
    for (let n = 1; n < 120; n++) {
      term *= (-x * x) / n;
      const d = term / (2 * n + 1);
      sum += d;
      if (Math.abs(d) < 1e-17 * Math.abs(sum)) break;
    }
    return 1 - (2 / Math.sqrt(Math.PI)) * sum;
  }
  // erfc(x) = exp(-x^2) / (x sqrt(pi)) * 1 / (1 + (1/(2x^2)) / (1 + (2/(2x^2)) / (1 + ...)))
  const z = 2 * x * x;
  let f = 1;
  for (let k = 80; k >= 1; k--) f = 1 + k / z / f;
  return Math.exp(-x * x) / (x * Math.sqrt(Math.PI) * f);
}

/** The standard normal distribution function. */
export const normalCdf = z => 0.5 * erfc(-z / Math.SQRT2);

/** The upper tail of the standard normal: Q(z) = 1 - Phi(z). */
export const normalTail = z => 0.5 * erfc(z / Math.SQRT2);

const LANCZOS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028,
  771.32342877765313, -176.61502916214059, 12.507343278686905,
  -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
];

/** ln Gamma(x) for x > 0 (Lanczos, g = 7), about 1e-15 relative. */
export function lnGamma(x) {
  if (x < 0.5)
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - lnGamma(1 - x);
  const y = x - 1;
  let a = LANCZOS[0];
  const t = y + 7.5;
  for (let i = 1; i < 9; i++) a += LANCZOS[i] / (y + i);
  return (
    0.5 * Math.log(2 * Math.PI) + (y + 0.5) * Math.log(t) - t + Math.log(a)
  );
}

export const gamma = x => Math.exp(lnGamma(x));

/** The regularised upper incomplete gamma function Q(a, x) (Numerical Recipes' series and continued fraction). */
export function gammaQ(a, x) {
  if (!(x >= 0) || !(a > 0)) return NaN;
  if (x === 0) return 1;
  const lg = lnGamma(a);
  if (x < a + 1) {
    let ap = a;
    let del = 1 / a;
    let sum = del;
    for (let n = 0; n < 40000; n++) {
      ap += 1;
      del *= x / ap;
      sum += del;
      if (Math.abs(del) < Math.abs(sum) * 1e-16) break;
    }
    return 1 - sum * Math.exp(-x + a * Math.log(x) - lg);
  }
  const tiny = 1e-300;
  let b = x + 1 - a;
  let c = 1 / tiny;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 40000; i++) {
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
  return Math.exp(-x + a * Math.log(x) - lg) * h;
}

/** P(K <= k) for K Poisson with mean `lambda`. */
export function poissonCdf(k, lambda) {
  if (k < 0) return 0;
  if (!(lambda > 0)) return 1;
  return gammaQ(k + 1, lambda);
}

/** The smallest integer k with P(K <= k) >= p. */
export function poissonQuantile(p, lambda) {
  if (!(lambda > 0)) return 0;
  let lo = 0;
  let hi = Math.max(10, Math.ceil(lambda + 12 * Math.sqrt(lambda)));
  while (poissonCdf(hi, lambda) < p) hi *= 2;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (poissonCdf(mid, lambda) >= p) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}

/** The standard normal quantile by bisection on normalCdf (a few hundred operations; used only for large means). */
function normalQuantile(p) {
  let lo = -40;
  let hi = 40;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (normalCdf(mid) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Above this mean the exact sums are replaced by the Cornish-Fisher normal form (relative error below 1e-5 of the width). */
export const LARGE_MEAN = 2e5;

/**
 * The central prediction interval of a Poisson count at `level`: its exact coverage
 * is never below the level (the discreteness makes it conservative). Above LARGE_MEAN the
 * quantiles are lambda + z sqrt(lambda) + (z^2 - 1) / 6 rounded outwards and `approximate` is true.
 * @returns {{lo:number, hi:number, level:number, coverage:number, approximate?:boolean}}
 */
export function poissonInterval(lambda, level = 0.6827) {
  const tail = (1 - level) / 2;
  if (lambda > LARGE_MEAN) {
    const zl = normalQuantile(tail);
    const zh = normalQuantile(1 - tail);
    const sd = Math.sqrt(lambda);
    return {
      lo: Math.floor(lambda + zl * sd + (zl * zl - 1) / 6),
      hi: Math.ceil(lambda + zh * sd + (zh * zh - 1) / 6),
      level,
      coverage: level,
      approximate: true,
    };
  }
  const lo = poissonQuantile(tail, lambda);
  const hi = poissonQuantile(1 - tail, lambda);
  return {
    lo,
    hi,
    level,
    coverage: poissonCdf(hi, lambda) - poissonCdf(lo - 1, lambda),
  };
}
