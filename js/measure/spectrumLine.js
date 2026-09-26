// =============================================================================
// One spectral line: a continuum, an equivalent width, a center
// -----------------------------------------------------------------------------
// The textbook measurement, done so every number says what it rests on:
//
//   continuum   a straight line fitted by least squares to two windows either
//               side of the line (MEASURED: its two coefficients and their
//               covariance)
//   EW          equivalent width, sum over the line window of (1 - F/C) d-lambda,
//               positive for absorption (MEASURED)
//   center      the depth-weighted mean wavelength, sum lambda (C - F) d-lambda /
//               sum (C - F) d-lambda (MEASURED)
//   velocity    c (center / rest - 1), when a rest wavelength is given
//               (DERIVED; the rest wavelength is ASSUMED, cited by the caller,
//               and must be in the same medium as the spectrum)
//
// Uncertainties are propagated linearly: each point's flux error through the
// sums, and the continuum's covariance through C. Where the spectrum carries no
// errors - the SDSS bundle does not - each point's error is the scatter of the
// continuum windows about their line, which ASSUMES the noise is white and the
// same inside the line as outside it, and the result says so.
// =============================================================================

export const VERSION = '1.0.0';
const C_KM_S = 299792.458;

export class LineError extends Error {
  constructor(code, message, detail = {}) {
    super(message);
    this.name = 'LineError';
    this.code = code;
    this.detail = detail;
  }
}

/** Each sample's width: half the distance to its neighbors. */
function widths(x) {
  const n = x.length;
  const w = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const a = i > 0 ? x[i - 1] : x[i] - (x[1] - x[0]);
    const b = i < n - 1 ? x[i + 1] : x[i] + (x[n - 1] - x[n - 2]);
    w[i] = (b - a) / 2;
  }
  return w;
}

const inside =
  ([lo, hi]) =>
  v =>
    v >= lo && v <= hi;

/**
 * @param {{x: ArrayLike<number>, y: ArrayLike<number>,
 *   dy?: ArrayLike<number>|null}} data - Wavelength increasing, flux, error
 * @param {{line: [number, number], blue: [number, number],
 *   red: [number, number], rest?: number|null}} windows - In x's unit
 */
export function measureLine(data, { line, blue, red, rest = null }) {
  const { x, y, dy = null } = data;
  const n = x.length;
  for (const [name, w] of [
    ['line', line],
    ['blue', blue],
    ['red', red],
  ]) {
    if (!(Array.isArray(w) && w[0] < w[1]))
      throw new LineError('window', `the ${name} window is not a range`, {
        window: name,
      });
  }
  if (!(blue[1] <= line[0] && line[1] <= red[0]))
    throw new LineError(
      'order',
      'the windows must be blue, then the line, then red, without overlap'
    );
  const dx = widths(x);
  const inLine = inside(line);
  const inCont = v => inside(blue)(v) || inside(red)(v);
  const cont = [];
  const lin = [];
  let nb = 0;
  let nr = 0;
  for (let i = 0; i < n; i++) {
    if (!Number.isFinite(x[i]) || !Number.isFinite(y[i])) continue;
    if (inCont(x[i])) {
      cont.push(i);
      if (x[i] <= blue[1]) nb++;
      else nr++;
    } else if (inLine(x[i])) lin.push(i);
  }
  if (nb < 2 || nr < 2)
    throw new LineError(
      'continuumPoints',
      `the continuum windows hold ${nb} and ${nr} points; each needs at least 2`,
      { blue: nb, red: nr }
    );
  if (lin.length < 3)
    throw new LineError(
      'linePoints',
      `the line window holds ${lin.length} points; it needs at least 3`,
      { n: lin.length }
    );

  // Weighted least squares for C(x) = c0 + c1 (x - xr).
  const xr = (line[0] + line[1]) / 2;
  const weight = i => (dy ? 1 / (dy[i] * dy[i]) : 1);
  let S = 0;
  let Sx = 0;
  let Sxx = 0;
  let Sy = 0;
  let Sxy = 0;
  for (const i of cont) {
    const w = weight(i);
    const u = x[i] - xr;
    S += w;
    Sx += w * u;
    Sxx += w * u * u;
    Sy += w * y[i];
    Sxy += w * u * y[i];
  }
  const det = S * Sxx - Sx * Sx;
  if (!(det > 0))
    throw new LineError(
      'continuumPoints',
      'the continuum windows do not constrain a line'
    );
  const c0 = (Sxx * Sy - Sx * Sxy) / det;
  const c1 = (S * Sxy - Sx * Sy) / det;
  const C = v => c0 + c1 * (v - xr);
  // Residual scatter of the continuum points: the error per point when the
  // spectrum has none, and a check on the errors when it has.
  let chi = 0;
  let rss = 0;
  for (const i of cont) {
    const r = y[i] - C(x[i]);
    rss += r * r;
    chi += r * r * weight(i);
  }
  const m = cont.length;
  const scatter = Math.sqrt(rss / (m - 2));
  const sig = i => (dy ? dy[i] : scatter);
  // Covariance of (c0, c1): the inverse normal matrix, scaled by the assumed
  // variance when the weights are all 1.
  const s2 = dy ? 1 : scatter * scatter;
  const V00 = (s2 * Sxx) / det;
  const V11 = (s2 * S) / det;
  const V01 = (-s2 * Sx) / det;

  // Sums over the line, with their partials in c0 and c1.
  let ew = 0;
  let num = 0; // sum lambda (C - F) dl
  let den = 0; // sum (C - F) dl
  let varEwF = 0;
  let dEw0 = 0;
  let dEw1 = 0;
  let dNum0 = 0;
  let dNum1 = 0;
  let dDen0 = 0;
  let dDen1 = 0;
  let varNumF = 0;
  let varDenF = 0;
  let covNumDenF = 0;
  let depth = 0;
  for (const i of lin) {
    const c = C(x[i]);
    if (!(c > 0))
      throw new LineError(
        'continuumNotPositive',
        'the continuum is not positive under the line'
      );
    const u = x[i] - xr;
    const f = y[i];
    const d = dx[i];
    ew += (1 - f / c) * d;
    num += x[i] * (c - f) * d;
    den += (c - f) * d;
    depth = Math.max(depth, 1 - f / c);
    const sf = sig(i);
    // d(EW)/dF = -d/c ; d(EW)/dc0 = f d / c^2 ; d(EW)/dc1 = f d u / c^2
    varEwF += (d / c) ** 2 * sf * sf;
    dEw0 += (f * d) / (c * c);
    dEw1 += (f * d * u) / (c * c);
    // num, den: d/dF = -x d, -d ; d/dc0 = x d, d ; d/dc1 = x d u, d u
    varNumF += (x[i] * d) ** 2 * sf * sf;
    varDenF += d * d * sf * sf;
    covNumDenF += x[i] * d * d * sf * sf;
    dNum0 += x[i] * d;
    dNum1 += x[i] * d * u;
    dDen0 += d;
    dDen1 += d * u;
  }
  const quad = (a0, a1, b0, b1) =>
    a0 * b0 * V00 + (a0 * b1 + a1 * b0) * V01 + a1 * b1 * V11;
  const ewError = Math.sqrt(varEwF + quad(dEw0, dEw1, dEw0, dEw1));
  let center = null;
  let centerError = null;
  if (den > 0) {
    center = num / den;
    // center = num/den: d = (dnum - center dden) / den, for each input.
    const g0 = (dNum0 - center * dDen0) / den;
    const g1 = (dNum1 - center * dDen1) / den;
    const varF =
      (varNumF - 2 * center * covNumDenF + center * center * varDenF) /
      (den * den);
    centerError = Math.sqrt(varF + quad(g0, g1, g0, g1));
  }
  let velocity = null;
  let velocityError = null;
  if (rest && center !== null) {
    velocity = C_KM_S * (center / rest - 1);
    velocityError = (C_KM_S * centerError) / rest;
  }
  const warnings = [];
  if (!dy) warnings.push({ code: 'errorsFromScatter', scatter });
  else if (m > 2 && chi / (m - 2) > 2)
    warnings.push({ code: 'continuumPoorFit', reducedChi2: chi / (m - 2) });
  if (!(den > 0)) warnings.push({ code: 'noAbsorption' });
  if (ew < 0) warnings.push({ code: 'emission' });
  return {
    version: VERSION,
    continuum: {
      c0,
      c1,
      reference: xr,
      covariance: [
        [V00, V01],
        [V01, V11],
      ],
      points: m,
      scatter,
    },
    ew,
    ewError,
    center,
    centerError,
    depth,
    velocity,
    velocityError,
    rest,
    points: lin.length,
    weighted: Boolean(dy),
    warnings,
  };
}
