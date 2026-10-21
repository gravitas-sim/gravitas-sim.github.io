// Polynomial least squares (Prompt 152, NUMERICS.md). Consumer: 213.
// Pure: no imports; only + - * / and sqrt, so the same data give the same
// fit on every Node. Householder QR on the Vandermonde matrix of the scaled
// abscissa t = (x - center) / halfWidth in [-1, 1], which keeps a degree-10
// fit on x = 1000..5000 well conditioned where the normal equations in x
// are not (they square the condition number).
const { Math, Number, Float64Array } = globalThis;

/**
 * Fit y = sum c_k t^k, k = 0..degree, minimising sum w_i (y_i - fit_i)^2 with
 * w_i = 1 / sigma_i^2 (or 1 without sigma). Needs more points than
 * parameters, finite x and y, sigma > 0 (else RangeError); null when the columns are
 * numerically dependent (a diagonal of R below m EPS times the largest).
 * `covariance` is (A^T W A)^-1 of the coefficients c (in t); with no sigma it
 * is scaled by chi2 / dof, and `scaled` says so. `at(x)` evaluates the fit.
 * @returns {?{degree: number, center: number, halfWidth: number,
 *   coefficients: number[], covariance: number[][], chi2: number, dof: number,
 *   rms: number, scaled: boolean, at: (x: number) => number}}
 */
export function polyfit(x, y, degree, { sigma = null } = {}) {
  const m = x.length;
  const p = degree + 1;
  if (!Number.isInteger(degree) || degree < 0 || m <= p || y.length !== m)
    throw new RangeError(
      'need an integer degree >= 0 and more points than coefficients'
    );
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < m; i++) {
    if (
      !Number.isFinite(x[i]) ||
      !Number.isFinite(y[i]) ||
      (sigma && !(sigma[i] > 0 && sigma[i] < Infinity))
    )
      throw new RangeError('x and y must be finite and sigma positive');
    lo = Math.min(lo, x[i]);
    hi = Math.max(hi, x[i]);
  }
  const center = 0.5 * (lo + hi);
  const halfWidth = 0.5 * (hi - lo) || 1;
  const A = new Array(m);
  const b = new Float64Array(m);
  for (let i = 0; i < m; i++) {
    const w = sigma ? 1 / sigma[i] : 1;
    const t = (x[i] - center) / halfWidth;
    A[i] = new Float64Array(p);
    let tk = 1;
    for (let k = 0; k < p; k++, tk *= t) A[i][k] = w * tk;
    b[i] = w * y[i];
  }
  // Householder reflections, applied to b as they go.
  for (let k = 0; k < p; k++) {
    let norm = 0;
    for (let i = k; i < m; i++) norm += A[i][k] * A[i][k];
    norm = Math.sqrt(norm);
    if (!(norm > 0)) return null;
    const alpha = A[k][k] > 0 ? -norm : norm;
    const v = new Float64Array(m);
    for (let i = k; i < m; i++) v[i] = A[i][k];
    v[k] -= alpha;
    let vv = 0;
    for (let i = k; i < m; i++) vv += v[i] * v[i];
    for (let j = k; j <= p; j++) {
      let dot = 0;
      for (let i = k; i < m; i++) dot += v[i] * (j < p ? A[i][j] : b[i]);
      const f = (2 * dot) / vv;
      for (let i = k; i < m; i++) {
        if (j < p) A[i][j] -= f * v[i];
        else b[i] -= f * v[i];
      }
    }
  }
  let big = 0;
  for (let k = 0; k < p; k++) big = Math.max(big, Math.abs(A[k][k]));
  for (let k = 0; k < p; k++)
    if (!(Math.abs(A[k][k]) > m * Number.EPSILON * big)) return null;
  const c = new Array(p);
  for (let k = p - 1; k >= 0; k--) {
    let s = b[k];
    for (let j = k + 1; j < p; j++) s -= A[k][j] * c[j];
    c[k] = s / A[k][k];
  }
  let chi2 = 0;
  for (let i = p; i < m; i++) chi2 += b[i] * b[i];
  const dof = m - p;
  // R^-1 by back substitution, then covariance = R^-1 R^-T.
  const Ri = Array.from({ length: p }, () => new Array(p).fill(0));
  for (let j = 0; j < p; j++) {
    Ri[j][j] = 1 / A[j][j];
    for (let i = j - 1; i >= 0; i--) {
      let s = 0;
      for (let k = i + 1; k <= j; k++) s += A[i][k] * Ri[k][j];
      Ri[i][j] = -s / A[i][i];
    }
  }
  const scale = sigma ? 1 : chi2 / dof;
  const covariance = Ri.map((_, i) =>
    Ri.map((__, j) => {
      let s = 0;
      for (let k = Math.max(i, j); k < p; k++) s += Ri[i][k] * Ri[j][k];
      return s * scale;
    })
  );
  return {
    degree,
    center,
    halfWidth,
    coefficients: c,
    covariance,
    chi2,
    dof,
    rms: Math.sqrt(sigma ? 0 : chi2 / m),
    scaled: !sigma,
    at(xv) {
      const t = (xv - center) / halfWidth;
      let s = 0;
      for (let k = p - 1; k >= 0; k--) s = s * t + c[k];
      return s;
    },
  };
}
