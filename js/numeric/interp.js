// Interpolation on a table (Prompt 152, NUMERICS.md). Consumers: 219, 255.
// Pure: no imports. xs strictly increasing and finite (checked once, by
// RangeError, where a table is built); ys the same length.
const { Number, Float64Array } = globalThis;

/** Index i in [0, n - 2] with xs[i] <= x < xs[i + 1]; the end intervals serve x outside. */
export function locate(xs, x) {
  let lo = 0;
  let hi = xs.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (xs[mid] <= x) lo = mid;
    else hi = mid;
  }
  return lo;
}

function check(xs, ys) {
  if (xs.length < 2 || xs.length !== ys.length)
    throw new RangeError('need two or more points and one y for each x');
  for (let i = 0; i < xs.length; i++)
    if (
      !Number.isFinite(xs[i]) ||
      !Number.isFinite(ys[i]) ||
      (i && !(xs[i] > xs[i - 1]))
    )
      throw new RangeError(
        'x must be finite and strictly increasing, y finite'
      );
}

/**
 * Piecewise-linear value at x. Outside the table: 'clamp' (the end value,
 * default), 'extrapolate' (the end segment's line) or 'nan'. NaN in, NaN out.
 */
export function linear(xs, ys, x, outside = 'clamp') {
  if (Number.isNaN(x)) return NaN;
  const last = xs.length - 1;
  if (x < xs[0] || x > xs[last]) {
    if (outside === 'clamp') return x < xs[0] ? ys[0] : ys[last];
    if (outside === 'nan') return NaN;
  }
  const i = locate(xs, x);
  return ys[i] + ((ys[i + 1] - ys[i]) * (x - xs[i])) / (xs[i + 1] - xs[i]);
}

/**
 * A cubic spline through (xs, ys): C2, with second derivative zero at both
 * ends (natural), or with the end slopes d0 and d1 given (clamped; exact for
 * a cubic when they are its own). Two points give the straight line. Outside
 * the table the end cubic continues, so extrapolation is the caller's risk.
 * @returns {{at: (x: number) => number, slope: (x: number) => number}}
 */
export function cubicSpline(xs, ys, { d0, d1 } = {}) {
  check(xs, ys);
  const n = xs.length;
  const h = i => xs[i + 1] - xs[i];
  const m = new Float64Array(n); // second derivatives
  if (n > 2 || d0 !== undefined || d1 !== undefined) {
    // Tridiagonal system for m, by the Thomas algorithm.
    const lower = new Float64Array(n);
    const diag = new Float64Array(n);
    const upper = new Float64Array(n);
    const rhs = new Float64Array(n);
    diag[0] = d0 === undefined ? 1 : 2 * h(0);
    upper[0] = d0 === undefined ? 0 : h(0);
    rhs[0] = d0 === undefined ? 0 : 6 * ((ys[1] - ys[0]) / h(0) - d0);
    for (let i = 1; i < n - 1; i++) {
      lower[i] = h(i - 1);
      diag[i] = 2 * (h(i - 1) + h(i));
      upper[i] = h(i);
      rhs[i] =
        6 * ((ys[i + 1] - ys[i]) / h(i) - (ys[i] - ys[i - 1]) / h(i - 1));
    }
    diag[n - 1] = d1 === undefined ? 1 : 2 * h(n - 2);
    lower[n - 1] = d1 === undefined ? 0 : h(n - 2);
    rhs[n - 1] =
      d1 === undefined ? 0 : 6 * (d1 - (ys[n - 1] - ys[n - 2]) / h(n - 2));
    for (let i = 1; i < n; i++) {
      const w = lower[i] / diag[i - 1];
      diag[i] -= w * upper[i - 1];
      rhs[i] -= w * rhs[i - 1];
    }
    m[n - 1] = rhs[n - 1] / diag[n - 1];
    for (let i = n - 2; i >= 0; i--)
      m[i] = (rhs[i] - upper[i] * m[i + 1]) / diag[i];
  }
  const piece = x => {
    const i = locate(xs, x);
    const w = h(i);
    return { i, w, a: (xs[i + 1] - x) / w, b: (x - xs[i]) / w };
  };
  return {
    at(x) {
      const { i, w, a, b } = piece(x);
      return (
        a * ys[i] +
        b * ys[i + 1] +
        (((a * a * a - a) * m[i] + (b * b * b - b) * m[i + 1]) * w * w) / 6
      );
    },
    slope(x) {
      const { i, w, a, b } = piece(x);
      return (
        (ys[i + 1] - ys[i]) / w +
        (w * ((1 - 3 * a * a) * m[i] + (3 * b * b - 1) * m[i + 1])) / 6
      );
    },
  };
}
