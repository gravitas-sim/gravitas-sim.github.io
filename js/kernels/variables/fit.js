// =============================================================================
// Variable stars: a Fourier series fitted to a light curve
// -----------------------------------------------------------------------------
// A pulsating star repeats, so its light is a periodic function and a short
// Fourier series describes it:
//
//     m(t) = m0 + sum over k of A_k cos(k w (t - t0) + phi_k),   w = 2 pi / P
//
// fitted by least squares at a given period. What the fit reports, and what
// kind of number each is:
//
//   mean (m0)        DERIVED: the average of the series over one cycle, in the
//                    unit of the data (magnitudes for a lesson)
//   amplitude        DERIVED: peak to peak of the fitted curve (not of the
//                    noisy data, whose extremes are noise)
//   R21, R31, phi21  DERIVED: the shape numbers of Simon & Lee 1981 (ApJ 248,
//                    291): A_2/A_1, A_3/A_1 and phi_2 - 2 phi_1. They tell an
//                    RR Lyrae star of the sawtooth kind from the sinusoidal one
//                    and a Cepheid from both (Soszynski et al. 2008, AcA 58, 163)
//
// Pure: no DOM, no imports. Bound math once for the Jest vm (see the repo's
// notes on global lookups).
// =============================================================================

const { Math, Float64Array, Number } = globalThis;

export const VERSION = '1.0.0';

/** Solve the symmetric positive system A x = b in place by Gauss-Jordan; returns A^-1 too. */
function invertAndSolve(A, b, n) {
  const M = Array.from({ length: n }, (_, i) => {
    const row = new Float64Array(2 * n);
    for (let j = 0; j < n; j++) row[j] = A[i * n + j];
    row[n + i] = 1;
    return row;
  });
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++)
      if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (!(Math.abs(M[p][c]) > 1e-300)) return null;
    [M[c], M[p]] = [M[p], M[c]];
    const d = M[c][c];
    for (let j = 0; j < 2 * n; j++) M[c][j] /= d;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c];
      if (f === 0) continue;
      for (let j = 0; j < 2 * n; j++) M[r][j] -= f * M[c][j];
    }
  }
  const inv = M.map(r => r.slice(n));
  const x = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = 0; j < n; j++) s += inv[i][j] * b[j];
    x[i] = s;
  }
  return { x, inv };
}

/**
 * A K-harmonic Fourier series at period P by (weighted) least squares.
 * @param {ArrayLike<number>} t
 * @param {ArrayLike<number>} y
 * @param {number} P - the period, in the unit of t
 * @param {number} K - how many harmonics (at least 1)
 * @param {{t0?: number, dy?: ArrayLike<number>|null}} [opts]
 * @returns {{period: number, K: number, t0: number, mean: number,
 *   meanError: number, harmonics: Array<{amplitude: number, phase: number}>,
 *   rms: number, chi2: number, n: number, at: (t: number) => number}|null}
 *   null when the system is singular (too few distinct phases)
 */
export function harmonicFit(t, y, P, K, { t0, dy = null } = {}) {
  const n = t.length;
  const m = 2 * K + 1;
  if (!(P > 0) || !(K >= 1) || n < m + 1) return null;
  const ref = t0 ?? t[0];
  const w = 2 * Math.PI / P;
  const A = new Float64Array(m * m);
  const b = new Float64Array(m);
  const row = new Float64Array(m);
  for (let i = 0; i < n; i++) {
    const wt = dy ? 1 / (dy[i] * dy[i]) : 1;
    row[0] = 1;
    const x = w * (t[i] - ref);
    for (let k = 1; k <= K; k++) {
      row[2 * k - 1] = Math.cos(k * x);
      row[2 * k] = Math.sin(k * x);
    }
    for (let r = 0; r < m; r++) {
      b[r] += wt * row[r] * y[i];
      for (let c = r; c < m; c++) A[r * m + c] += wt * row[r] * row[c];
    }
  }
  for (let r = 0; r < m; r++) for (let c = 0; c < r; c++) A[r * m + c] = A[c * m + r];
  const sol = invertAndSolve(A, b, m);
  if (!sol) return null;
  const { x: coef, inv } = sol;
  let ss = 0;
  for (let i = 0; i < n; i++) {
    let f = coef[0];
    const x = w * (t[i] - ref);
    for (let k = 1; k <= K; k++)
      f += coef[2 * k - 1] * Math.cos(k * x) + coef[2 * k] * Math.sin(k * x);
    const r = (y[i] - f) / (dy ? dy[i] : 1);
    ss += r * r;
  }
  const dof = Math.max(1, n - m);
  const rms = Math.sqrt(dy ? ss / n : ss / dof);
  // Weighted or not, the covariance is (A^T A)^-1 times chi^2 per degree of freedom.
  const scale = ss / dof;
  const harmonics = [];
  for (let k = 1; k <= K; k++) {
    const a = coef[2 * k - 1];
    const s = coef[2 * k];
    harmonics.push({ amplitude: Math.hypot(a, s), phase: Math.atan2(-s, a) });
  }
  const fit = {
    period: P,
    K,
    t0: ref,
    mean: coef[0],
    meanError: Math.sqrt(Math.max(0, inv[0][0] * scale)),
    harmonics,
    rms,
    chi2: ss,
    n,
    at: tt => {
      let f = coef[0];
      const x = w * (tt - ref);
      for (let k = 1; k <= K; k++)
        f += coef[2 * k - 1] * Math.cos(k * x) + coef[2 * k] * Math.sin(k * x);
      return f;
    },
  };
  return fit;
}

const TWO_PI = 2 * Math.PI;
const wrap = x => ((x % TWO_PI) + TWO_PI) % TWO_PI;

/**
 * The numbers a lesson reads off a fitted curve.
 * @param {ReturnType<typeof harmonicFit>} fit
 * @returns {{mean: number, amplitude: number, brightest: number, faintest: number,
 *   r21: number, r31: number, phi21: number, phiMax: number}}
 */
export function curveStats(fit, grid = 720) {
  let lo = Infinity;
  let hi = -Infinity;
  let at = 0;
  let sum = 0;
  for (let i = 0; i < grid; i++) {
    const v = fit.at(fit.t0 + (i / grid) * fit.period);
    sum += v;
    if (v < lo) {
      lo = v;
      at = i / grid;
    }
    if (v > hi) hi = v;
  }
  const [h1, h2, h3] = fit.harmonics;
  return {
    mean: sum / grid,
    amplitude: hi - lo,
    // In magnitudes, smaller is brighter: lo is the brightest, hi the faintest.
    brightest: lo,
    faintest: hi,
    r21: h2 && h1 ? h2.amplitude / h1.amplitude : NaN,
    r31: h3 && h1 ? h3.amplitude / h1.amplitude : NaN,
    phi21: h2 && h1 ? wrap(h2.phase - 2 * h1.phase) : NaN,
    phiMax: at,
  };
}

/** Phase in [0, 1) of each time about t0 for a period. */
export const phasesOf = (t, P, t0 = 0) =>
  Float64Array.from(t, x => {
    const p = (x - t0) / P;
    return p - Math.floor(p);
  });

/** Relative flux to magnitude about the star's own median (the data's zero point). */
export const magnitudesOf = (flux, zero = 0) =>
  Float64Array.from(flux, f => zero - 2.5 * Math.log10(f));

/** The magnitude error of a relative-flux error: 2.5/ln10 sigma_f / f. */
export const magnitudeErrors = (flux, sigma) =>
  Float64Array.from(flux, (f, i) => (2.5 / Math.LN10) * (sigma[i] / f));

export { wrap as wrapAngle };
