// =============================================================================
// The spectrograph kernel: wavelength solutions
// (Prompt 213, SPECTROGRAPH.md)
// -----------------------------------------------------------------------------
// A wavelength solution maps a pixel coordinate x to a wavelength: a polynomial of low
// degree. Two things carry that name here and they are kept apart:
//
//   truthSolution(coefficients)   the instrument's own mapping, known only to the
//                                 simulator: lambda = c0 + c1 x + c2 x^2 + c3 x^3 ...
//   fitSolution(lines, degree)    the student's: a weighted least-squares polynomial
//                                 through marked lines (js/numeric/polyfit.js, Prompt 152)
//                                 with residuals, a covariance and an uncertainty at every
//                                 pixel
//
// The states of a fitted solution (Prompt 150's vocabulary):
//   not-constrained      fewer lines than degree + 1: no coefficients, and why
//   exactly-determined   degree + 1 lines: the polynomial passes through them, its
//                        uncertainty is the lines' errors alone, there is no residual to
//                        test it with, and the result says so
//   constrained          degree + 2 or more: degrees of freedom of at least 1, residuals,
//                        a reduced chi-square and a flag when the scatter exceeds the errors
//   refused              a request the method cannot answer, with its reason
//
// The errors of the marked lines are pixel errors; they enter in nm through the local
// dispersion (an effective variance: the derivative comes from a first, unweighted fit of
// the same degree). The lab wavelengths' own uncertainty is neglected (NIST's is far
// below a hundredth of a pixel). Outside the span of the marked lines the polynomial is an
// extrapolation and is flagged. Pure: no DOM.
// =============================================================================

import { polyfit } from '../../numeric/polyfit.js';
import { inverse } from '../../numeric/linalg.js';
import { chi2Quantile } from '../statistics/special.js';

const { Math, Number } = globalThis;

/** The highest degree this kernel fits: a polynomial of more terms than a spectrograph needs. */
export const MAX_DEGREE = 5;
/** A residual beyond this many sigma is listed as an outlier. */
export const OUTLIER_SIGMAS = 3;
/** The reduced chi-square is flagged above this quantile of the chi-square distribution. */
export const FLAG_QUANTILE = 0.99;

/** The instrument's own solution from its coefficients, with the derivative and the pixel edges. */
export function truthSolution(coefficients) {
  const c = coefficients.slice();
  const at = x => {
    let s = 0;
    for (let k = c.length - 1; k >= 0; k--) s = s * x + c[k];
    return s;
  };
  const slope = x => {
    let s = 0;
    for (let k = c.length - 1; k >= 1; k--) s = s * x + k * c[k];
    return s;
  };
  return { coefficients: c, at, slope, edge: i => at(i - 0.5) };
}

/** The pixel coordinate at which a monotonic solution reaches a wavelength, by bisection and Newton; NaN if outside [lo, hi]. */
export function pixelOf(solution, lambdaNm, lo, hi) {
  let a = lo;
  let b = hi;
  const fa = solution.at(a) - lambdaNm;
  const fb = solution.at(b) - lambdaNm;
  if (!(fa * fb <= 0)) return NaN;
  for (let i = 0; i < 200 && b - a > 1e-12; i++) {
    const m = 0.5 * (a + b);
    const fm = solution.at(m) - lambdaNm;
    if (fa * fm <= 0) b = m;
    else a = m;
  }
  return 0.5 * (a + b);
}

const refuse = (reason, message) => ({ status: 'refused', reason, message });

const basis = (t, p) => {
  const v = new Array(p);
  let tk = 1;
  for (let k = 0; k < p; k++, tk *= t) v[k] = tk;
  return v;
};

/**
 * Fit a wavelength solution to marked lines.
 * @param {Array<{x: number, sigmaX: number, wavelengthNm: number, id?: string}>} lines - pixel centre, its error in
 *   pixels, the lab wavelength (in `medium`)
 * @param {number} degree - 1 to 5
 * @param {{medium?: 'air'|'vacuum'}} [opts] - the medium of the wavelengths, carried on the result
 */
export function fitSolution(lines, degree, { medium } = {}) {
  if (!Number.isInteger(degree) || degree < 1 || degree > MAX_DEGREE)
    return refuse(
      'bad-degree',
      `the degree is an integer from 1 to ${MAX_DEGREE}`
    );
  const n = lines.length;
  for (const l of lines)
    if (!(Number.isFinite(l.x) && Number.isFinite(l.wavelengthNm)))
      return refuse(
        'not-finite',
        'every marked line needs a finite pixel and a finite wavelength'
      );
  for (const l of lines)
    if (!(l.sigmaX > 0 && l.sigmaX < Infinity))
      return refuse(
        'bad-error',
        'every marked line needs a positive, finite error in pixels'
      );
  const xs = lines.map(l => l.x);
  const sorted = xs.slice().sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++)
    if (sorted[i] - sorted[i - 1] < 1e-9)
      return refuse('duplicate-pixel', 'two marked lines are at one pixel');
  const p = degree + 1;
  const base = { degree, n, medium: medium ?? null };
  if (n < p)
    return {
      ...base,
      status: 'not-constrained',
      dof: n - p,
      coefficients: null,
      message: `a degree-${degree} solution has ${p} coefficients and needs at least ${p} lines; ${n} marked`,
    };
  const ls = lines.map(l => l.wavelengthNm);
  const lo = sorted[0];
  const hi = sorted[n - 1];
  const center = 0.5 * (lo + hi);
  const halfWidth = 0.5 * (hi - lo) || 1;
  const ts = xs.map(x => (x - center) / halfWidth);
  // First pass: the unweighted polynomial gives the local dispersion that carries the pixel errors into nm.
  let coef0;
  if (n > p) coef0 = polyfit(xs, ls, degree)?.coefficients;
  else coef0 = interpolate(ts, ls, p)?.coef;
  if (!coef0)
    return refuse(
      'degenerate',
      'the marked lines do not fix a polynomial of this degree'
    );
  const disp = ts.map(t => {
    let s = 0;
    for (let k = p - 1; k >= 1; k--) s = s * t + k * coef0[k];
    return Math.abs(s / halfWidth);
  });
  const sigmaLam = lines.map((l, i) => l.sigmaX * disp[i]);
  let coefficients;
  let covariance;
  let chi2 = 0;
  let dof = n - p;
  if (n === p) {
    const fit = interpolate(ts, ls, p);
    if (!fit)
      return refuse(
        'degenerate',
        'the marked lines do not fix a polynomial of this degree'
      );
    coefficients = fit.coef;
    covariance = fit.covarianceFor(sigmaLam);
  } else {
    const fit = polyfit(xs, ls, degree, { sigma: sigmaLam });
    if (!fit)
      return refuse(
        'degenerate',
        'the marked lines do not fix a polynomial of this degree'
      );
    coefficients = fit.coefficients;
    covariance = fit.covariance;
    chi2 = fit.chi2;
    dof = fit.dof;
  }
  const evalT = t => {
    let s = 0;
    for (let k = p - 1; k >= 0; k--) s = s * t + coefficients[k];
    return s;
  };
  const residualsNm = lines.map((l, i) => l.wavelengthNm - evalT(ts[i]));
  const residualsPx = residualsNm.map((r, i) => r / disp[i]);
  const standardized = residualsNm.map((r, i) => r / sigmaLam[i]);
  const reducedChi2 = dof > 0 ? chi2 / dof : null;
  const flagged =
    dof > 0 && chi2 / dof > chi2Quantile(FLAG_QUANTILE, dof) / dof;
  const scale = flagged ? reducedChi2 : 1;
  const outliers = standardized
    .map((s, i) => (Math.abs(s) > OUTLIER_SIGMAS ? (lines[i].id ?? i) : null))
    .filter(v => v !== null);
  const sigmaAt = x => {
    const v = basis((x - center) / halfWidth, p);
    let s = 0;
    for (let i = 0; i < p; i++)
      for (let j = 0; j < p; j++) s += v[i] * covariance[i][j] * v[j];
    return Math.sqrt(Math.max(0, s) * scale);
  };
  const result = {
    ...base,
    status: n === p ? 'exactly-determined' : 'constrained',
    coefficients,
    center,
    halfWidth,
    covariance,
    dof,
    chi2,
    reducedChi2,
    flagged,
    scale,
    residualsNm,
    residualsPx,
    standardized,
    sigmaLamNm: sigmaLam,
    rmsNm: Math.sqrt(residualsNm.reduce((a, r) => a + r * r, 0) / n),
    outliers,
    span: [lo, hi],
    at: x => evalT((x - center) / halfWidth),
    sigmaAt,
    dispersionAt(x) {
      const t = (x - center) / halfWidth;
      let s = 0;
      for (let k = p - 1; k >= 1; k--) s = s * t + k * coefficients[k];
      return s / halfWidth;
    },
    extrapolated: x => x < lo || x > hi,
    message:
      n === p
        ? `exactly determined: the polynomial passes through the ${n} lines, its uncertainty comes from their errors alone and there is no residual to test it with`
        : flagged
          ? 'the scatter of the lines about the solution exceeds their errors (the uncertainties are scaled up by the reduced chi-square)'
          : 'consistent with the lines’ errors',
  };
  /** A wavelength at a pixel with its uncertainty: the solution's and the line centre's own pixel error together. */
  result.wavelengthOf = (x, sigmaX = 0) => {
    const sol = sigmaAt(x);
    const d = result.dispersionAt(x);
    return {
      nm: result.at(x),
      sigmaNm: Math.hypot(sol, d * sigmaX),
      solutionSigmaNm: sol,
      extrapolated: result.extrapolated(x),
    };
  };
  return result;
}

/** The polynomial through exactly p points in the scaled abscissa, and the covariance the point errors give. */
function interpolate(ts, ls, p) {
  const V = ts.map(t => basis(t, p));
  const Vi = inverse(V);
  if (!Vi) return null;
  const coef = Vi.map(row => row.reduce((a, v, j) => a + v * ls[j], 0));
  return {
    coef,
    covarianceFor(sigma) {
      return Vi.map(ri =>
        Vi.map(rj =>
          ri.reduce((a, v, k) => a + v * rj[k] * sigma[k] * sigma[k], 0)
        )
      );
    },
  };
}
