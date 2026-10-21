// =============================================================================
// Special functions for the statistics kernel (Prompt 154, STATISTICS.md)
// -----------------------------------------------------------------------------
// ln Gamma, the regularised incomplete gamma P and Q, the regularised
// incomplete beta I_x(a, b), and from them the normal, chi-square, Student t
// and F distributions with their quantiles. Written from the definitions
// (Lanczos for ln Gamma; a series and a continued fraction for the incomplete
// functions, after Press et al., Numerical Recipes, 6.1-6.4), so that no
// library is needed and every step is open to a reader. Accuracy is about
// 1e-14 relative for the arguments an astronomy course meets; the cases in
// tools/statistics-cases.mjs hold it to 1e-12 against closed forms and to
// 1e-10 against a second method.
//
// An argument outside a function's domain returns NaN, never a number.
// Quantiles are found by bisection on the CDF: slow by the standards of a
// library and exact to the last bit of a double, and they never fail to
// converge.
// =============================================================================

const { Math, Number } = globalThis;

const EPS = 1e-16;
const TINY = 1e-300;

const LANCZOS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028,
  771.32342877765313, -176.61502916214059, 12.507343278686905,
  -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
];

/** ln Gamma(x) for x > 0 (Lanczos, g = 7, nine terms; reflection below 1/2). */
export function lnGamma(x) {
  if (!(x > 0)) return NaN;
  if (x < 0.5)
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - lnGamma(1 - x);
  const z = x - 1;
  let a = LANCZOS[0];
  const t = z + 7.5;
  for (let i = 1; i < 9; i++) a += LANCZOS[i] / (z + i);
  return (
    0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(a)
  );
}

function gammaSeries(a, x) {
  let ap = a;
  let del = 1 / a;
  let sum = del;
  for (let n = 0; n < 100000; n++) {
    ap += 1;
    del *= x / ap;
    sum += del;
    if (Math.abs(del) < Math.abs(sum) * EPS) break;
  }
  return sum * Math.exp(-x + a * Math.log(x) - lnGamma(a));
}

function gammaFraction(a, x) {
  let b = x + 1 - a;
  let c = 1 / TINY;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 100000; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < TINY) d = TINY;
    c = b + an / c;
    if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return Math.exp(-x + a * Math.log(x) - lnGamma(a)) * h;
}

/** The regularised lower incomplete gamma P(a, x) = gamma(a, x) / Gamma(a). */
export function gammaP(a, x) {
  if (!(a > 0) || !(x >= 0)) return NaN;
  if (x === 0) return 0;
  if (x === Infinity) return 1;
  return x < a + 1 ? gammaSeries(a, x) : 1 - gammaFraction(a, x);
}

/** The regularised upper incomplete gamma Q(a, x) = 1 - P(a, x), without the cancellation. */
export function gammaQ(a, x) {
  if (!(a > 0) || !(x >= 0)) return NaN;
  if (x === 0) return 1;
  if (x === Infinity) return 0;
  return x < a + 1 ? 1 - gammaSeries(a, x) : gammaFraction(a, x);
}

function betaFraction(x, a, b) {
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < TINY) d = TINY;
  d = 1 / d;
  let h = d;
  for (let m = 1; m < 100000; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < TINY) d = TINY;
    c = 1 + aa / c;
    if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < TINY) d = TINY;
    c = 1 + aa / c;
    if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

/** The regularised incomplete beta function I_x(a, b). */
export function betaI(x, a, b) {
  if (!(x >= 0 && x <= 1) || !(a > 0) || !(b > 0)) return NaN;
  if (x === 0) return 0;
  if (x === 1) return 1;
  const front = Math.exp(
    lnGamma(a + b) -
      lnGamma(a) -
      lnGamma(b) +
      a * Math.log(x) +
      b * Math.log(1 - x)
  );
  return x < (a + 1) / (a + b + 2)
    ? (front * betaFraction(x, a, b)) / a
    : 1 - (front * betaFraction(1 - x, b, a)) / b;
}

// --- Inverting a CDF -----------------------------------------------------------

/** The x with cdf(x) = p, by bisection inside [lo, hi] (cdf increasing). */
function invert(cdf, p, lo, hi) {
  for (let i = 0; i < 300; i++) {
    const mid = 0.5 * (lo + hi);
    if (mid === lo || mid === hi) break;
    if (cdf(mid) < p) lo = mid;
    else hi = mid;
  }
  return 0.5 * (lo + hi);
}
/** A bracket [0, hi] above the p-quantile of a CDF on [0, inf). */
function upper(cdf, p, start) {
  let hi = start;
  while (cdf(hi) < p && hi < 1e300) hi *= 2;
  return hi;
}

// --- Normal ----------------------------------------------------------------------

/** P(Z <= z) for a standard normal Z. */
export function normalCdf(z) {
  if (Number.isNaN(z)) return NaN;
  if (z === Infinity) return 1;
  if (z === -Infinity) return 0;
  return z >= 0
    ? 0.5 + 0.5 * gammaP(0.5, (z * z) / 2)
    : 0.5 * gammaQ(0.5, (z * z) / 2);
}

/** The z with P(Z <= z) = p. */
export function normalQuantile(p) {
  if (!(p >= 0 && p <= 1)) return NaN;
  if (p === 0) return -Infinity;
  if (p === 1) return Infinity;
  if (p === 0.5) return 0;
  return invert(normalCdf, p, -40, 40);
}

// --- Chi-square ------------------------------------------------------------------

/** P(X <= x) for chi-square on k degrees of freedom. */
export function chi2Cdf(x, k) {
  if (!(k > 0) || Number.isNaN(x)) return NaN;
  return x <= 0 ? 0 : gammaP(k / 2, x / 2);
}
/** P(X > x) for chi-square on k degrees of freedom. */
export function chi2Sf(x, k) {
  if (!(k > 0) || Number.isNaN(x)) return NaN;
  return x <= 0 ? 1 : gammaQ(k / 2, x / 2);
}
/** The x with P(X <= x) = p for chi-square on k degrees of freedom. */
export function chi2Quantile(p, k) {
  if (!(p >= 0 && p <= 1) || !(k > 0)) return NaN;
  if (p === 0) return 0;
  if (p === 1) return Infinity;
  const cdf = x => chi2Cdf(x, k);
  return invert(cdf, p, 0, upper(cdf, p, k + 10));
}

// --- Student t -------------------------------------------------------------------

/** P(T <= t) for Student's t on nu degrees of freedom. */
export function tCdf(t, nu) {
  if (!(nu > 0) || Number.isNaN(t)) return NaN;
  if (t === Infinity) return 1;
  if (t === -Infinity) return 0;
  if (t === 0) return 0.5;
  const tail = 0.5 * betaI(nu / (nu + t * t), nu / 2, 0.5);
  return t > 0 ? 1 - tail : tail;
}
/** The t with P(T <= t) = p on nu degrees of freedom. */
export function tQuantile(p, nu) {
  if (!(p >= 0 && p <= 1) || !(nu > 0)) return NaN;
  if (p === 0) return -Infinity;
  if (p === 1) return Infinity;
  if (p === 0.5) return 0;
  if (p < 0.5) return -tQuantile(1 - p, nu);
  const cdf = t => tCdf(t, nu);
  return invert(cdf, p, 0, upper(cdf, p, 1));
}

// --- F -----------------------------------------------------------------------------

/** P(F <= x) for the F distribution on d1 and d2 degrees of freedom. */
export function fCdf(x, d1, d2) {
  if (!(d1 > 0) || !(d2 > 0) || Number.isNaN(x)) return NaN;
  if (x <= 0) return 0;
  if (x === Infinity) return 1;
  return betaI((d1 * x) / (d1 * x + d2), d1 / 2, d2 / 2);
}
/** P(F > x), the p value of an F statistic, without the cancellation of 1 - CDF. */
export function fSf(x, d1, d2) {
  if (!(d1 > 0) || !(d2 > 0) || Number.isNaN(x)) return NaN;
  if (x <= 0) return 1;
  if (x === Infinity) return 0;
  return betaI(d2 / (d2 + d1 * x), d2 / 2, d1 / 2);
}
/** The x with P(F <= x) = p on d1 and d2 degrees of freedom. */
export function fQuantile(p, d1, d2) {
  if (!(p >= 0 && p <= 1) || !(d1 > 0) || !(d2 > 0)) return NaN;
  if (p === 0) return 0;
  if (p === 1) return Infinity;
  const cdf = x => fCdf(x, d1, d2);
  return invert(cdf, p, 0, upper(cdf, p, 2));
}
