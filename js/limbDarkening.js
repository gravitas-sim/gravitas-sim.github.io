// Quadratic limb darkening, I(mu) = 1 - u1 (1 - mu) - u2 (1 - mu)^2, in both
// parameterizations: fixed (u1, u2) in the lesson instruments (which keep their
// own copy of the Claret values: a shared chunk costs every route a request and
// is held against them by tests/sharedPhysics.test.js), fitted Kipping
// (2013) (q1, q2) in the inference core, where the unit square is exactly the
// physical stars. q1 = (u1 + u2)^2, q2 = u1 / (2 (u1 + u2)); the inverse is
// u1 = 2 sqrt(q1) q2, u2 = sqrt(q1) (1 - 2 q2). tests/sharedPhysics.test.js.

/** Solar optical coefficients, Claret (2000). */
export const SOLAR_QUADRATIC = { u1: 0.4, u2: 0.26 };

/** Intensity relative to the centre, at mu = cos(angle from disk centre). */
export function quadraticIntensity(mu, u1, u2) {
  const m = 1 - mu;
  return 1 - u1 * m - u2 * m * m;
}

/** Disk-averaged intensity relative to the centre. */
export const diskAverage = (u1, u2) => 1 - u1 / 3 - u2 / 6;

export function kippingToQuadratic(q1, q2) {
  const s = Math.sqrt(q1);
  return { u1: 2 * s * q2, u2: s * (1 - 2 * q2) };
}

export function quadraticToKipping(u1, u2) {
  const q1 = (u1 + u2) ** 2;
  return { q1, q2: q1 > 0 ? u1 / (2 * (u1 + u2)) : 0 };
}
