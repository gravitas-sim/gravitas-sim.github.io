// =============================================================================
// Two-body motion: speeds, periods and Kepler's problem in universal variables
// -----------------------------------------------------------------------------
// One body of negligible mass about a point mass GM = mu, in km, s and km/s
// (./bodies.js). propagate() carries a state forward or back by a time on any
// conic, ellipse or hyperbola, through the universal anomaly chi and the
// Stumpff functions C(z) and S(z) (Bate, Mueller and White 1971, ch. 4;
// Curtis, Orbital Mechanics for Engineering Students, algorithm 3.4).
//
// Kepler's equation in chi is monotonic, its derivative being the radius,
// so it is solved by Newton's method kept inside a bracket that always holds
// the root: a step that would leave it bisects instead. The answer says how
// many iterations it took, and a solve that did not converge says so rather
// than returning its last guess.
//
// Pure arithmetic: no DOM, no Worker. The solvers, the Worker and the tests
// share it. The Math functions are local names because Jest's module realm
// makes every global lookup slow (tests/, #105).
// =============================================================================

const { sqrt, sin, cos, sinh, cosh, abs, PI } = Math;
const MAX_ITERATIONS = 200;

export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const norm = a => sqrt(dot(a, a));
export const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
export const vec3 = v =>
  Array.isArray(v) && v.length === 3 && v.every(Number.isFinite);

/** Speed on a circular orbit of radius r. */
export const circularSpeed = (mu, r) => sqrt(mu / r);
/** Escape speed at radius r. */
export const escapeSpeed = (mu, r) => sqrt((2 * mu) / r);
/** Speed at radius r on a conic of semi-major axis a (negative: hyperbola). */
export const visViva = (mu, r, a) => sqrt(mu * (2 / r - 1 / a));
/** Period of an ellipse of semi-major axis a. */
export const period = (mu, a) => 2 * PI * sqrt((a * a * a) / mu);

/**
 * Stumpff's C(z) = (1 - cos sqrt z) / z, continued through z <= 0. Near zero
 * the closed form loses digits to cancellation, so there it is the series.
 */
export function stumpffC(z) {
  if (z > 0.1) return (1 - cos(sqrt(z))) / z;
  if (z < -0.1) return (cosh(sqrt(-z)) - 1) / -z;
  // sum (-z)^k / (2k + 2)!, to k = 7: the next term is below 1e-18.
  let term = 0.5;
  let sum = term;
  for (let k = 1; k <= 7; k++) {
    term *= -z / ((2 * k + 1) * (2 * k + 2));
    sum += term;
  }
  return sum;
}

/** Stumpff's S(z) = (sqrt z - sin sqrt z) / sqrt(z)^3, likewise. */
export function stumpffS(z) {
  if (z > 0.1) {
    const s = sqrt(z);
    return (s - sin(s)) / (s * s * s);
  }
  if (z < -0.1) {
    const s = sqrt(-z);
    return (sinh(s) - s) / (s * s * s);
  }
  let term = 1 / 6;
  let sum = term;
  for (let k = 1; k <= 7; k++) {
    term *= -z / ((2 * k + 2) * (2 * k + 3));
    sum += term;
  }
  return sum;
}

/** Specific energy, angular momentum vector and semi-major axis of a state. */
export function orbitOf(mu, r, v) {
  const rn = norm(r);
  const energy = dot(v, v) / 2 - mu / rn;
  return { energy, h: cross(r, v), a: -mu / (2 * energy), radius: rn };
}

/**
 * The state `dt` seconds on (or back, for dt < 0) from r0, v0.
 * @returns {{ok: true, r, v, iterations, chi} | {ok: false, status, iterations}}
 *   status 'noConvergence' or 'notFinite'; the input is the caller's to check
 */
export function propagate(mu, r0, v0, dt) {
  if (dt === 0)
    return { ok: true, r: [...r0], v: [...v0], iterations: 0, chi: 0 };
  const rn = norm(r0);
  const vr = dot(r0, v0) / rn;
  const alpha = 2 / rn - dot(v0, v0) / mu;
  const smu = sqrt(mu);
  const sign = dt > 0 ? 1 : -1;
  // F(chi) = 0 is Kepler's equation; F' = r(chi) > 0, so F is increasing.
  const F = chi => {
    const z = alpha * chi * chi;
    return (
      ((rn * vr) / smu) * chi * chi * stumpffC(z) +
      (1 - alpha * rn) * chi * chi * chi * stumpffS(z) +
      rn * chi -
      smu * dt
    );
  };
  const dF = chi => {
    const z = alpha * chi * chi;
    return (
      ((rn * vr) / smu) * chi * (1 - z * stumpffS(z)) +
      (1 - alpha * rn) * chi * chi * stumpffC(z) +
      rn
    );
  };
  // The bracket: chi = 0 on one side; on the other, grow a guess until the
  // sign changes. An overflowing hyperbola reads as past the root.
  let lo = 0;
  let hi =
    sign *
    Math.max(smu * abs(alpha) * abs(dt), (1e-8 * smu * abs(dt)) / rn, 1e-12);
  let expand = 0;
  const past = x => {
    const f = F(x);
    return Number.isNaN(f) ? true : sign * f > 0;
  };
  while (!past(hi)) {
    lo = hi;
    hi *= 2;
    if (++expand > 200)
      return { ok: false, status: 'noConvergence', iterations: expand };
  }
  // Start from the usual guess where it is inside (Vallado, algorithm 8):
  // sqrt(mu) alpha dt on an ellipse, the logarithmic one on a hyperbola.
  let chi = (lo + hi) / 2;
  let guess = smu * alpha * dt;
  if (alpha < 0) {
    const a = 1 / alpha;
    guess =
      sign *
      sqrt(-a) *
      Math.log(
        (-2 * mu * alpha * dt) /
          (dot(r0, v0) + sign * sqrt(-mu * a) * (1 - rn * alpha))
      );
  }
  if (sign > 0 ? guess > lo && guess < hi : guess < lo && guess > hi)
    chi = guess;
  let iterations = 0;
  for (; iterations < MAX_ITERATIONS; iterations++) {
    const f = F(chi);
    if (!Number.isFinite(f)) {
      hi = chi;
      chi = (lo + hi) / 2;
      continue;
    }
    if (f === 0) break;
    if (sign * f > 0) hi = chi;
    else lo = chi;
    let next = chi - f / dF(chi);
    const inside = sign > 0 ? next > lo && next < hi : next < lo && next > hi;
    if (!inside) next = (lo + hi) / 2;
    const done = abs(next - chi) <= 1e-15 * (1 + abs(chi));
    chi = next;
    if (done || abs(hi - lo) <= 1e-15 * (1 + abs(chi))) break;
  }
  if (iterations >= MAX_ITERATIONS)
    return { ok: false, status: 'noConvergence', iterations };
  const z = alpha * chi * chi;
  const C = stumpffC(z);
  const S = stumpffS(z);
  const f = 1 - ((chi * chi) / rn) * C;
  const g = dt - ((chi * chi * chi) / smu) * S;
  const r = add(scale(r0, f), scale(v0, g));
  const r1 = norm(r);
  const fdot = (smu / (r1 * rn)) * (alpha * chi * chi * chi * S - chi);
  const gdot = 1 - ((chi * chi) / r1) * C;
  const v = add(scale(r0, fdot), scale(v0, gdot));
  if (![...r, ...v].every(Number.isFinite))
    return { ok: false, status: 'notFinite', iterations };
  return { ok: true, r, v, iterations: iterations + 1, chi };
}
