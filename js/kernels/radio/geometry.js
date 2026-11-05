// =============================================================================
// Radio kernel: the geometry of a line of sight in an axisymmetric Galaxy
// -----------------------------------------------------------------------------
// For gas on circular orbits about the Galactic centre with speed Theta(R), the
// Sun at R0 moving at Theta0 on a circle, a line of sight at (l, b) meets gas at
// distance d with galactocentric radius
//
//   R^2 = R0^2 + (d cos b)^2 - 2 R0 d cos b cos l
//
// and an LSR velocity
//
//   v = (Theta(R) R0 / R - Theta0) sin l cos b.
//
// Inside the solar circle (cos l > 0) the sightline's smallest R, R0 |sin l|, is
// the TANGENT POINT, at distance R0 cos l, and the largest |v| along the line is
// reached there when Theta / R falls with R: so |v_t| = Theta(R_t) - Theta0 |sin l|
// and the circular speed at R_t is |v_t| + Theta0 |sin l|, the tangent-point
// method. It needs no distances. Outside the solar circle (cos l <= 0) there is no
// tangent point: R only grows along the line.
//
// The method is only ever run on the fixed longitude mask below (b = 0).
//
// Pure: no DOM, no clock. kpc, km/s, degrees at the interface.
// =============================================================================

import { finite, refusal } from './constants.js';

const DEG = Math.PI / 180;

/**
 * The fixed longitude mask: the sightlines the pathway uses, in the plane.
 * Inside 20 degrees the tangent radius is under 0.35 R0 and an axisymmetric
 * circular model is not claimed there; past 65 degrees the terminal velocity
 * falls toward the dispersion of the local gas and the edge cannot be separated
 * from it. The same list is committed in tests/fixtures/radio/thresholds.json.
 */
export const MASK = Object.freeze({
  firstQuadrant: Object.freeze([20, 25, 30, 35, 40, 45, 50, 55, 60, 65]),
  fourthQuadrant: Object.freeze([295, 300, 305, 310, 315, 320, 325, 330, 335, 340]),
  b: 0,
});

/** All the mask's longitudes, ascending. */
export const MASK_LONGITUDES = Object.freeze([
  ...MASK.firstQuadrant,
  ...MASK.fourthQuadrant,
]);

/** A longitude in [0, 360). */
export const wrapLongitude = l => ((l % 360) + 360) % 360;

/** The quadrant's side: +1 in the first (the line's maximum velocity), -1 in the fourth. */
export const sideOf = l => (wrapLongitude(l) < 180 ? 1 : -1);

/**
 * Whether a sightline may be used: null if it is on the mask, else the refusal
 * record. 'no-tangent-point' when the line does not pass inside the solar circle,
 * 'outside-mask' for any other longitude or any latitude but zero.
 */
export function maskRefusal(lDeg, bDeg = 0) {
  if (!Number.isFinite(lDeg) || !Number.isFinite(bDeg))
    return refusal('outside-mask', 'the longitude and latitude must be numbers');
  const l = wrapLongitude(lDeg);
  if (Math.cos(l * DEG) <= 1e-12)
    return refusal(
      'no-tangent-point',
      'a sightline at this longitude does not pass inside the solar circle, so it has no tangent point'
    );
  if (bDeg !== 0)
    return refusal('outside-mask', 'the mask is in the plane: the latitude must be 0');
  if (!MASK_LONGITUDES.some(m => Math.abs(m - l) < 1e-9))
    return refusal(
      'outside-mask',
      'this longitude is not on the fixed mask (20 to 65 and 295 to 340 degrees in steps of 5)'
    );
  return null;
}

/** Whether (l, b) is on the mask. */
export const inMask = (l, b = 0) => maskRefusal(l, b) === null;

/**
 * The tangent point of a sightline: radius, distance and the side, or the
 * refusal. It does not check the mask (the geometry holds for any l with cos l
 * > 0); the method does.
 */
export function tangentGeometry(lDeg, r0) {
  finite(r0, 'r0');
  const l = wrapLongitude(lDeg) * DEG;
  if (Math.cos(l) <= 1e-12)
    return refusal('no-tangent-point', 'no tangent point outside the solar circle');
  return {
    status: 'ok',
    radius: r0 * Math.abs(Math.sin(l)),
    distance: r0 * Math.cos(l),
    side: sideOf(lDeg),
  };
}

/**
 * The world's rotation curve of the synthetic generator and the suitability
 * tests use: Theta(R) = Theta0 k (R / sqrt(R^2 + Rc^2)) (R / R0)^alpha with
 * k = sqrt(R0^2 + Rc^2) / R0, so Theta(R0) = Theta0. alpha 0 is a flat curve,
 * positive a rising one, negative a falling one.
 */
export function worldCurve({ theta0, r0, rc = 1.5, alpha = 0 }) {
  const k = Math.sqrt(r0 * r0 + rc * rc) / r0;
  return R => theta0 * k * (R / Math.sqrt(R * R + rc * rc)) * (R / r0) ** alpha;
}

/** The galactocentric radius at distance d on (l, b), kpc. */
export function radiusAt(dKpc, lDeg, bDeg, r0) {
  const l = lDeg * DEG;
  const dp = dKpc * Math.cos(bDeg * DEG);
  return Math.sqrt(r0 * r0 + dp * dp - 2 * r0 * dp * Math.cos(l));
}

/**
 * The LSR velocity of circular gas at distance d on (l, b), km/s, positive
 * receding. `curve` is Theta(R); `radialKmS` (default 0) is a galactocentric
 * outward streaming added through its projection on the line of sight.
 */
export function losVelocity({ l, b = 0, d, curve, r0, theta0, radialKmS = 0 }) {
  const R = radiusAt(d, l, b, r0);
  const lr = l * DEG;
  const cb = Math.cos(b * DEG);
  const circ = ((curve(R) * r0) / R - theta0) * Math.sin(lr) * cb;
  // The outward unit vector of the gas projected on the line of sight is
  // (d cos b - R0 cos l) / R (zero at the tangent point).
  const stream = radialKmS ? (radialKmS * (d * cb - r0 * Math.cos(lr))) / R : 0;
  return circ + stream;
}

/**
 * The circular-orbit terminal velocity of a sightline, km/s: the extreme of the
 * LSR velocity, positive in the first quadrant and negative in the fourth.
 */
export function terminalVelocity({ l, curve, r0, theta0 }) {
  const t = tangentGeometry(l, r0);
  if (t.status !== 'ok') return NaN;
  return t.side * (curve(t.radius) - theta0 * Math.abs(Math.sin(wrapLongitude(l) * DEG)));
}

/** The circular speed at the tangent radius from a terminal velocity, km/s. */
export function circularSpeedFromTerminal(vTerminal, lDeg, theta0) {
  return Math.abs(vTerminal) + theta0 * Math.abs(Math.sin(wrapLongitude(lDeg) * DEG));
}

/**
 * Whether the extreme of v along a mask sightline is at the tangent point for
 * this curve: Theta(R) / R must fall as R grows from the smallest tangent radius
 * of the mask to three solar radii. Solid-body rotation (Theta proportional to R) fails it, and so does a
 * curve rising faster.
 */
export function curveIsSuitable(curve, r0) {
  const lo = r0 * Math.sin(MASK.firstQuadrant[0] * DEG);
  const hi = 3 * r0; // every radius a mask sightline reaches inside the gas
  let prev = Infinity;
  for (let i = 0; i <= 120; i++) {
    const R = lo + ((hi - lo) * i) / 120;
    const q = curve(R) / R;
    if (!(q < prev)) return false;
    prev = q;
  }
  return true;
}
