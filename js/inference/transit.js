// A transiting planet's light curve, computed so it can be checked: a dark disk
// of radius k (stellar radii) crossing a star with quadratic limb darkening
// (js/limbDarkening.js). The blocked fraction at separation z is the light in
// the rings of the star the planet covers over the star's total light; the
// wholly covered inner disk (r <= k - z) is integrated in closed form, the
// partly covered annulus by the midpoint rule on nodes clustered toward both
// ends, where the integrand's derivative is singular. This is Mandel & Agol's
// (2002) quantity by direct quadrature, slower with every step visible; error
// falls fourfold per doubling of nodes. Against 4,096 nodes, for HD 209458 b
// across every separation: 64 nodes at most 5e-5 of the depth (0.9 ppm); the
// default 32, 2e-4 (3.5 ppm), worst near z = k/2. tests/inference.test.js holds
// it to the exact overlap area of two circles for a uniform star.
//
// The orbit is circular: z = (a/R*) sqrt(sin^2 phi + cos^2 i cos^2 phi),
// cos i = b / (a/R*), phi = 2 pi (t - t0) / P, in front when cos phi > 0.
// Eccentricity is not modeled; a fit says so. An exposure is the mean of
// `supersample` instants across it (Kipping 2010). Pure: no DOM, no state.

import {
  kippingToQuadratic,
  quadraticToKipping,
  quadraticIntensity,
  diskAverage,
} from '../limbDarkening.js';

// Bound once, not read as globals: in Jest's vm context every free global read
// goes through the context, which made these loops 8-25x slower than in Node.
const { Math, Number, Float64Array } = globalThis;

// The law and its Kipping (2013) pair are in js/limbDarkening.js.
export const limbDarkening = kippingToQuadratic;
export const kippingQ = quadraticToKipping;

const intensity = (r, u1, u2) =>
  quadraticIntensity(Math.sqrt(Math.max(0, 1 - r * r)), u1, u2);

/**
 * The star's light inside radius R: the integral of I(r) 2 pi r dr from 0.
 * With mu = sqrt(1 - r^2), r dr = -mu dmu, and I is a polynomial in mu.
 */
function lightWithin(R, u1, u2) {
  const F = mu =>
    (mu * mu) / 2 -
    u1 * ((mu * mu) / 2 - (mu * mu * mu) / 3) -
    u2 * ((mu * mu) / 2 - (2 * mu * mu * mu) / 3 + mu ** 4 / 4);
  const muR = Math.sqrt(Math.max(0, 1 - R * R));
  return 2 * Math.PI * (F(1) - F(muR));
}

/** The whole star's light: pi (1 - u1/3 - u2/6). */
export const totalLight = (u1, u2) => Math.PI * diskAverage(u1, u2);

/**
 * The fraction of the star's light a planet of radius k at separation z hides.
 * @param {number} z - Center-to-center separation, in stellar radii
 * @param {number} k - Planet radius, in stellar radii
 * @param {number} u1 - Quadratic limb darkening
 * @param {number} u2
 * @param {number} [n] - Quadrature nodes across the partly covered annulus
 */
export function occultation(z, k, u1, u2, n = 64) {
  if (!(k > 0) || z >= 1 + k) return 0;
  const total = totalLight(u1, u2);
  if (k >= 1 + z) return 1;
  // The rings entirely inside the planet.
  const inner = z < k ? lightWithin(Math.min(1, k - z), u1, u2) : 0;
  // The rings the planet's edge crosses.
  const a = Math.abs(z - k);
  const b = Math.min(1, z + k);
  let partial = 0;
  if (b > a && z > 0) {
    const w = b - a;
    for (let j = 0; j < n; j++) {
      const s = (j + 0.5) / n;
      const r = a + (w * (1 - Math.cos(Math.PI * s))) / 2;
      const dr = ((w * Math.PI * Math.sin(Math.PI * s)) / 2) * (1 / n);
      const c = (r * r + z * z - k * k) / (2 * r * z);
      const arc = 2 * r * Math.acos(Math.max(-1, Math.min(1, c)));
      partial += intensity(r, u1, u2) * arc * dr;
    }
  }
  return Math.min(1, (inner + partial) / total);
}

/**
 * The exact overlap of the unit circle and a circle of radius k at distance z,
 * over pi: a uniform star's occultation, in closed form, for the tests.
 */
export function uniformOccultation(z, k) {
  if (z >= 1 + k) return 0;
  if (z <= k - 1) return 1;
  if (z <= 1 - k) return k * k;
  const k0 = Math.acos((z * z + k * k - 1) / (2 * z * k));
  const k1 = Math.acos((z * z + 1 - k * k) / (2 * z));
  const root = Math.sqrt(
    Math.max(0, (-z + k + 1) * (z + k - 1) * (z - k + 1) * (z + k + 1))
  );
  return (k * k * k0 + k1 - root / 2) / Math.PI;
}

/** The sky separation, in stellar radii, and whether the planet is in front. */
export function separation(t, { t0, P, aRs, b }) {
  const phi = (2 * Math.PI * (t - t0)) / P;
  const cosi = b / aRs;
  const s = Math.sin(phi);
  const c = Math.cos(phi);
  return { z: aRs * Math.sqrt(s * s + cosi * cosi * c * c), front: c > 0 };
}

/**
 * Half the total duration (first to fourth contact) of a transit, in the
 * units of P, for a circular orbit (Seager & Mallen-Ornelas 2003).
 * @returns {number} NaN when the planet never touches the star
 */
export function halfDuration({ P, k, aRs, b }) {
  const cosi = b / aRs;
  const sini = Math.sqrt(Math.max(0, 1 - cosi * cosi));
  const arg = Math.sqrt(Math.max(0, (1 + k) ** 2 - b * b)) / (aRs * sini);
  if (!((1 + k) ** 2 > b * b) || !(arg <= 1)) return NaN;
  return (P / (2 * Math.PI)) * Math.asin(arg);
}

/**
 * The relative flux at each time.
 *
 * @param {ArrayLike<number>} times - In the units of t0 and P
 * @param {{t0: number, P: number, k: number, aRs: number, b: number,
 *   u1: number, u2: number}} p
 * @param {{exposure?: number, supersample?: number, annuli?: number}} [opts]
 *   exposure is each point's integration time in the units of P
 * @returns {Float64Array} 1 out of transit
 */
export function transitFlux(times, p, opts = {}) {
  const { exposure = 0, supersample = 1, annuli = 64 } = opts;
  const out = new Float64Array(times.length);
  const n = exposure > 0 ? Math.max(1, Math.round(supersample)) : 1;
  const half = halfDuration(p);
  // Beyond this far from mid-transit nothing in an exposure can be in front.
  const reach = (Number.isFinite(half) ? half : 0) + exposure / 2;
  for (let i = 0; i < times.length; i++) {
    const t = times[i];
    const cycles = (t - p.t0) / p.P;
    const dt = (cycles - Math.round(cycles)) * p.P;
    if (!Number.isFinite(half) || Math.abs(dt) > reach) {
      out[i] = 1;
      continue;
    }
    let sum = 0;
    for (let j = 0; j < n; j++) {
      const tj = n === 1 ? t : t + exposure * ((j + 0.5) / n - 0.5);
      const { z, front } = separation(tj, p);
      sum += front ? 1 - occultation(z, p.k, p.u1, p.u2, annuli) : 1;
    }
    out[i] = sum / n;
  }
  return out;
}
