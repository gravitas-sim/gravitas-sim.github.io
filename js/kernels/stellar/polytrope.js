// =============================================================================
// Lane-Emden polytropes
// -----------------------------------------------------------------------------
// A polytrope is a star whose pressure follows P = K rho^(1 + 1/n). With
// rho = rho_c theta^n and r = a xi, hydrostatic equilibrium and the mass
// integral combine into the Lane-Emden equation
//
//     theta'' + (2/xi) theta' + theta^n = 0,   theta(0) = 1, theta'(0) = 0.
//
// Three things are singular and each is handled, not avoided:
//   * xi = 0, where 2 theta'/xi is 0/0: the integration starts at a small xi
//     from the series theta = 1 - xi^2/6 + n xi^4/120 - ..., whose error is
//     O(xi^6), far below the integrator's.
//   * theta^n for theta <= 0 (non-integer n, and the step that crosses the
//     surface): the right side uses 0 there, and the surface is then found
//     by bisection on the length of one step, not read off a grid.
//   * n = 5, whose radius is infinite: its solution is the closed form
//     theta = (1 + xi^2/3)^(-1/2) (Schuster), with finite mass sqrt(3).
// n = 0, 1 and 5 also have closed forms; they are the exact checks of the
// integrator. For n > 5 the mass is infinite: refused.
//
// Pure: no DOM, no clock. The integrator is classical RK4 with a fixed step.
// =============================================================================

export const DEFAULT_STEP = 5e-4;

/** The closed forms, for n = 0, 1 and 5. */
export function analyticTheta(n, xi) {
  if (n === 0) return 1 - (xi * xi) / 6;
  if (n === 1) return xi === 0 ? 1 : Math.sin(xi) / xi;
  if (n === 5) return 1 / Math.sqrt(1 + (xi * xi) / 3);
  return NaN;
}

const power = (theta, n) => (n === 0 ? 1 : theta > 0 ? theta ** n : 0);

function rk4(n, xi, th, ph, h) {
  const f = (x, a, b) => [b, -power(a, n) - (2 * b) / x];
  const [k1a, k1b] = f(xi, th, ph);
  const [k2a, k2b] = f(xi + h / 2, th + (h / 2) * k1a, ph + (h / 2) * k1b);
  const [k3a, k3b] = f(xi + h / 2, th + (h / 2) * k2a, ph + (h / 2) * k2b);
  const [k4a, k4b] = f(xi + h, th + h * k3a, ph + h * k3b);
  return [
    th + (h / 6) * (k1a + 2 * k2a + 2 * k3a + k4a),
    ph + (h / 6) * (k1b + 2 * k2b + 2 * k3b + k4b),
  ];
}

/**
 * Integrate the Lane-Emden equation from the centre to the surface.
 *
 * Returns { n, xi1, mass, dtheta1, rhoRatio, xi, theta, dtheta }:
 *   xi1      the first zero of theta (the dimensionless radius), Infinity at n = 5
 *   mass     -xi1^2 theta'(xi1), the dimensionless mass, sqrt(3) at n = 5
 *   dtheta1  theta'(xi1)
 *   rhoRatio rho_c over the mean density, xi1 / (-3 theta'(xi1))
 *   xi, theta, dtheta  the profile, at most `points` samples, the surface last
 *
 * @param {number} n - Polytropic index, 0 <= n <= 5 (the integration needs n < 5)
 * @param {object} [options]
 * @param {number} [options.h] - Step in xi
 * @param {number} [options.points] - Samples kept for the profile
 */
export function solvePolytrope(n, { h = DEFAULT_STEP, points = 400 } = {}) {
  if (!(n >= 0) || n > 5)
    throw new RangeError('polytropic index must be in [0, 5]');
  if (n === 5) {
    const xi = [];
    const theta = [];
    const dtheta = [];
    for (let i = 0; i < points; i++) {
      const x = 60 * (i / (points - 1)) ** 2;
      xi.push(x);
      theta.push(analyticTheta(5, x));
      dtheta.push(x === 0 ? 0 : -(x / 3) * (1 + (x * x) / 3) ** -1.5);
    }
    return {
      n,
      xi1: Infinity,
      mass: Math.sqrt(3),
      dtheta1: 0,
      rhoRatio: Infinity,
      xi,
      theta,
      dtheta,
    };
  }
  let x = h;
  let th = 1 - (x * x) / 6 + (n * x ** 4) / 120;
  let ph = -x / 3 + (n * x ** 3) / 30;
  const keep = [[0, 1, 0]];
  keep.push([x, th, ph]);
  let guard = 0;
  while (th > 0 && guard++ < 5e6) {
    const [t2, p2] = rk4(n, x, th, ph, h);
    if (t2 <= 0) {
      // The surface lies inside this step: bisect its length.
      let lo = 0;
      let hi = h;
      for (let k = 0; k < 60; k++) {
        const mid = (lo + hi) / 2;
        const [tm] = rk4(n, x, th, ph, mid);
        if (tm > 0) lo = mid;
        else hi = mid;
      }
      const s = (lo + hi) / 2;
      const [, pS] = rk4(n, x, th, ph, s);
      x += s;
      th = 0;
      ph = pS;
      keep.push([x, 0, ph]);
      break;
    }
    x += h;
    th = t2;
    ph = p2;
    keep.push([x, th, ph]);
  }
  const xi1 = x;
  const step = Math.max(1, Math.floor((keep.length - 1) / (points - 1)));
  const sample = keep.filter((_, i) => i % step === 0);
  if (sample[sample.length - 1][0] !== xi1) sample.push(keep[keep.length - 1]);
  return {
    n,
    xi1,
    mass: -xi1 * xi1 * ph,
    dtheta1: ph,
    rhoRatio: xi1 / (-3 * ph),
    xi: sample.map(r => r[0]),
    theta: sample.map(r => r[1]),
    dtheta: sample.map(r => r[2]),
  };
}

/**
 * Enclosed mass fraction at xi (0 to 1), from the profile: m(xi)/M = -xi^2 theta' / mass.
 * Interpolated linearly in the stored profile.
 */
export function massFractionAt(sol, xi) {
  const { xi: X, dtheta: D } = sol;
  if (xi >= sol.xi1) return 1;
  let i = 1;
  while (i < X.length - 1 && X[i] < xi) i++;
  const w = (xi - X[i - 1]) / (X[i] - X[i - 1]);
  const d = D[i - 1] + w * (D[i] - D[i - 1]);
  return Math.min(1, Math.max(0, (-xi * xi * d) / sol.mass));
}

const cache = new Map();
/** solvePolytrope, remembered: a solve is a few milliseconds and the instruments ask often. */
export function polytrope(n) {
  const key = String(n);
  if (!cache.has(key)) cache.set(key, solvePolytrope(n));
  return cache.get(key);
}

/** The indices of the table: 0 to 4.5 in steps of one half. */
export const TABLE_INDICES = Object.freeze([
  0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5,
]);

/** { n, xi1, mass, rhoRatio } for every index of the table: what the Worker returns. */
export const polytropeTable = (indices = TABLE_INDICES) =>
  indices.map(n => {
    const s = polytrope(n);
    return { n, xi1: s.xi1, mass: s.mass, rhoRatio: s.rhoRatio };
  });

/**
 * The index whose central concentration rho_c / mean density equals `ratio`
 * (bisection on the table's own solver; the ratio rises steeply with n).
 */
export function indexFromConcentration(ratio) {
  let lo = 0;
  let hi = 4.5;
  if (ratio <= 1) return 0;
  if (ratio >= polytrope(4.5).rhoRatio) return 4.5;
  for (let k = 0; k < 24; k++) {
    const mid = (lo + hi) / 2;
    if (solvePolytrope(mid, { h: 2e-3, points: 3 }).rhoRatio < ratio) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
