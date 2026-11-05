// =============================================================================
// Image positions of the point lens and the singular isothermal sphere, and their inversions (Prompt 251)
// -----------------------------------------------------------------------------
// Positions are signed angles along the line from the lens through the source: the outer image of a
// source at angular separation beta is at theta_+ > 0 and the inner one at theta_- < 0 (the other
// side of the lens), in the units of the caller (radians, arcseconds or pixels, one unit throughout).
//   point lens:  lens equation y = x - 1/x,  x = theta / theta_E,  y = beta / theta_E
//                x_+- = (y +- sqrt(y^2 + 4)) / 2,  x_+ x_- = -1,  theta_E = sqrt(theta_+ |theta_-|)
//   SIS:         y = x - sign(x),  x_+- = y +- 1  (the second only for y < 1),
//                theta_E = (theta_+ + |theta_-|) / 2,  beta = (theta_+ + theta_-) / 2   (R9)
// Two images on opposite sides cannot tell the models apart: each returns its theta_E and the other's
// beside it, with their ratio (arithmetic over geometric mean, at least one), so a caller who assumed
// the wrong one sees the size of the error. The lens centre is taken as known.
// =============================================================================

import { pointImages, sisImages } from '../lens.js';

/** The two images of a point lens of Einstein angle thetaE for a source at beta, angular units. */
export function pointImagePositions(thetaE, beta) {
  const im = pointImages(Math.abs(beta) / thetaE);
  return {
    model: 'point',
    theta: im.x.map(x => x * thetaE * Math.sign(beta || 1)),
    mu: im.mu,
    total: im.total,
  };
}

/** The images of an SIS of Einstein angle thetaE for a source at beta (one image when beta >= thetaE). */
export function sisImagePositions(thetaE, beta) {
  const im = sisImages(Math.abs(beta) / thetaE);
  return {
    model: 'sis',
    theta: im.x.map(x => x * thetaE * Math.sign(beta || 1)),
    mu: im.mu,
    total: im.total,
  };
}

const finite = v => typeof v === 'number' && Number.isFinite(v);

/** The outer and inner separations (theta_+ and |theta_-|) from two signed positions on opposite sides, or a refusal. */
function pairOf(a, b) {
  if (!finite(a) || a === 0) return { status: 'refused', code: 'bad-position' };
  if (b === undefined || b === null)
    return {
      status: 'not-constrained',
      code: 'single-image',
      // The one image of a source outside theta_E, or the outer of two, lies at theta_E (1 + y) >= theta_E.
      bound: {
        thetaEAtMost: Math.abs(a),
        note: 'valid if the image is the outer one',
      },
    };
  if (!finite(b) || b === 0) return { status: 'refused', code: 'bad-position' };
  if (Math.sign(a) === Math.sign(b))
    return { status: 'refused', code: 'images-same-side' };
  return {
    status: 'ok',
    plus: Math.max(Math.abs(a), Math.abs(b)),
    minus: Math.min(Math.abs(a), Math.abs(b)),
  };
}

/** Arithmetic over geometric mean of the two separations: how far the SIS value overstates a point lens. */
export const modelDisagreement = (plus, minus) =>
  (plus + minus) / (2 * Math.sqrt(plus * minus));

/**
 * Invert one image on each side of the lens for theta_E and the source offset, under 'sis' (default)
 * or 'point'. The unassumed model's theta_E is returned in `other`.
 * @param {number} a - signed position of an image
 * @param {number} [b] - signed position of the other image
 * @param {'sis'|'point'} [model]
 */
export function invertImages(a, b, model = 'sis') {
  const p = pairOf(a, b);
  if (p.status !== 'ok') return p;
  const sis = (p.plus + p.minus) / 2;
  const point = Math.sqrt(p.plus * p.minus);
  const ratio = modelDisagreement(p.plus, p.minus);
  const isSis = model === 'sis';
  return {
    status: 'ok',
    model,
    thetaE: isSis ? sis : point,
    beta: isSis ? (p.plus - p.minus) / 2 : p.plus - p.minus,
    other: { model: isSis ? 'point' : 'sis', thetaE: isSis ? point : sis },
    disagreement: ratio,
    note: 'one image on each side cannot tell the point lens from the SIS; the models differ by `disagreement`',
  };
}
