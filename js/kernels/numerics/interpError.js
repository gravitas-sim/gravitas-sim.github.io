// =============================================================================
// The error of interpolating a table, at points left out
// -----------------------------------------------------------------------------
// NUMERICS_INSTRUMENTS.md, instrument I5. A table gives a model at its grid
// points; between them a value is somebody's interpolation. This measures what
// that costs on the table itself: each interior point in turn is removed, the
// straight line and the natural cubic spline through the rest are evaluated
// where it was (js/numeric/interp.js, the routines of Prompt 152, unchanged),
// and the two are compared with the value that was left out.
//
// The error is that of a table one point coarser at the held-out place, so it
// overstates the error of the full table between its points; it is the
// measurable stand-in, and it is said to be one. Which method is closer is a
// result, not a rule: a higher-order curve is not always more accurate. With a
// `limit` (the error the use tolerates, in the units of y) the table is
// refused as too coarse when neither method meets it.
//
// Pure. No uncertainty is reported. Imported by no shipped module.
// =============================================================================
import { linear, cubicSpline } from '../../numeric/interp.js';

const { Math, Number } = globalThis;

export const MIN_TABLE = 5;
/** Two RMS errors closer than this fraction of the larger are a tie. */
export const TIE = 1e-9;
/** Both RMS errors at or below this are exact to rounding, and a tie. */
export const EXACT = 1e-12;

/**
 * @param {ArrayLike<number>} xs - Strictly increasing
 * @param {ArrayLike<number>} ys - One value per x
 * @param {{limit?: number}} [opts] - The tolerated error, in the units of y
 * @returns {object} `{refused, ...}` or the errors
 */
export function heldOut(xs, ys, { limit } = {}) {
  const n = xs?.length;
  if (!(n >= 0) || ys?.length !== n)
    throw new RangeError('need one y for each x');
  if (limit !== undefined && !(Number.isFinite(limit) && limit > 0))
    throw new RangeError('the limit must be a positive number');
  for (let i = 0; i < n; i++)
    if (
      !Number.isFinite(xs[i]) ||
      !Number.isFinite(ys[i]) ||
      (i && !(xs[i] > xs[i - 1]))
    )
      throw new RangeError(
        'x must be finite and strictly increasing, y finite'
      );
  if (n < MIN_TABLE) return { refused: 'too-few', n };
  const points = [];
  const sum = { linear: 0, spline: 0 };
  const max = { linear: 0, spline: 0 };
  for (let k = 1; k < n - 1; k++) {
    const x = [];
    const y = [];
    for (let i = 0; i < n; i++)
      if (i !== k) {
        x.push(xs[i]);
        y.push(ys[i]);
      }
    const errLinear = linear(x, y, xs[k]) - ys[k];
    const errSpline = cubicSpline(x, y).at(xs[k]) - ys[k];
    points.push({
      x: xs[k],
      y: ys[k],
      gap: xs[k + 1] - xs[k - 1],
      errLinear,
      errSpline,
    });
    sum.linear += errLinear * errLinear;
    sum.spline += errSpline * errSpline;
    max.linear = Math.max(max.linear, Math.abs(errLinear));
    max.spline = Math.max(max.spline, Math.abs(errSpline));
  }
  const rms = {
    linear: Math.sqrt(sum.linear / points.length),
    spline: Math.sqrt(sum.spline / points.length),
  };
  const larger = Math.max(rms.linear, rms.spline);
  const closer =
    larger <= EXACT || Math.abs(rms.linear - rms.spline) <= TIE * larger
      ? 'tie'
      : rms.linear < rms.spline
        ? 'linear'
        : 'spline';
  const out = {
    n,
    points,
    linear: { rms: rms.linear, max: max.linear },
    spline: { rms: rms.spline, max: max.spline },
  };
  if (limit !== undefined && rms.linear > limit && rms.spline > limit)
    return { refused: 'too-coarse', limit, ...out };
  return { ...out, closer, ...(limit === undefined ? {} : { limit }) };
}
