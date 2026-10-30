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
//
// Prompt 225 adds a second limb-darkening law beside the quadratic one, the
// four-coefficient law of Claret (2000), I(mu) = 1 - sum_n c_n (1 - mu^(n/2))
// for n = 1..4, with the same two integrals in closed form: with r dr = -mu dmu
// the light within radius R is 2 pi [F(1) - F(mu_R)], F(mu) = mu^2/2 - sum_n c_n
// (mu^2/2 - mu^(2 + n/2) / (2 + n/2)), and the whole star's is pi (1 - sum_n c_n
// n / (n + 4)). Its coefficients are fixed from a table, never fitted. The
// quadratic path is unchanged to the last bit: a law is an object {u1, u2} or
// {c}, and every quadratic expression below is the one it always was.
// The stellar density from P and a/R* is at the end of this file.

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

/** The four-coefficient law's intensity at mu, relative to the centre. */
export function claretIntensity(mu, c) {
  const s = Math.sqrt(mu);
  return (
    1 -
    c[0] * (1 - s) -
    c[1] * (1 - mu) -
    c[2] * (1 - mu * s) -
    c[3] * (1 - mu * mu)
  );
}

/** The whole star's light under the four-coefficient law: pi (1 - sum c_n n / (n + 4)). */
export const claretTotalLight = c =>
  Math.PI * (1 - c[0] / 5 - c[1] / 3 - (3 * c[2]) / 7 - c[3] / 2);

/** The four-coefficient law's disk-averaged intensity relative to the centre. */
export const claretDiskAverage = c => claretTotalLight(c) / Math.PI;

const intensity = (r, law) => {
  const mu = Math.sqrt(Math.max(0, 1 - r * r));
  return law.c
    ? claretIntensity(mu, law.c)
    : quadraticIntensity(mu, law.u1, law.u2);
};

/**
 * The star's light inside radius R: the integral of I(r) 2 pi r dr from 0.
 * With mu = sqrt(1 - r^2), r dr = -mu dmu, and I is a polynomial in mu (the
 * quadratic law) or in sqrt(mu) (the four-coefficient law).
 */
function lightWithin(R, law) {
  const muR = Math.sqrt(Math.max(0, 1 - R * R));
  if (law.c) {
    const [c1, c2, c3, c4] = law.c;
    const F = mu => {
      const m2 = mu * mu;
      const s = Math.sqrt(mu);
      return (
        m2 / 2 -
        c1 * (m2 / 2 - (m2 * s) / 2.5) -
        c2 * (m2 / 2 - (m2 * mu) / 3) -
        c3 * (m2 / 2 - (m2 * mu * s) / 3.5) -
        c4 * (m2 / 2 - (m2 * m2) / 4)
      );
    };
    return 2 * Math.PI * (F(1) - F(muR));
  }
  const { u1, u2 } = law;
  const F = mu =>
    (mu * mu) / 2 -
    u1 * ((mu * mu) / 2 - (mu * mu * mu) / 3) -
    u2 * ((mu * mu) / 2 - (2 * mu * mu * mu) / 3 + mu ** 4 / 4);
  return 2 * Math.PI * (F(1) - F(muR));
}

/** The whole star's light: pi (1 - u1/3 - u2/6). */
export const totalLight = (u1, u2) => Math.PI * diskAverage(u1, u2);

/**
 * The fraction of the star's light a planet of radius k at separation z hides,
 * for a limb-darkening law: {u1, u2} (quadratic) or {c: [c1, c2, c3, c4]}
 * (Claret 2000).
 * @param {number} z - Center-to-center separation, in stellar radii
 * @param {number} k - Planet radius, in stellar radii
 * @param {{u1: number, u2: number}|{c: number[]}} law
 * @param {number} [n] - Quadrature nodes across the partly covered annulus
 */
export function occultationLaw(z, k, law, n = 64) {
  if (!(k > 0) || z >= 1 + k) return 0;
  const total = law.c ? claretTotalLight(law.c) : totalLight(law.u1, law.u2);
  if (k >= 1 + z) return 1;
  // The rings entirely inside the planet.
  const inner = z < k ? lightWithin(Math.min(1, k - z), law) : 0;
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
      partial += intensity(r, law) * arc * dr;
    }
  }
  return Math.min(1, (inner + partial) / total);
}

/**
 * The same for the quadratic law, in its two coefficients.
 * @param {number} u1 - Quadratic limb darkening
 * @param {number} u2
 */
export const occultation = (z, k, u1, u2, n = 64) =>
  occultationLaw(z, k, { u1, u2 }, n);

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
 *   u1: number, u2: number}|{t0: number, P: number, k: number, aRs: number,
 *   b: number, c: number[]}} p - u1 and u2, or the four coefficients c
 * @param {{exposure?: number, supersample?: number, annuli?: number}} [opts]
 *   exposure is each point's integration time in the units of P
 * @returns {Float64Array} 1 out of transit
 */
export function transitFlux(times, p, opts = {}) {
  const { exposure = 0, supersample = 1, annuli = 64 } = opts;
  const out = new Float64Array(times.length);
  const n = exposure > 0 ? Math.max(1, Math.round(supersample)) : 1;
  const half = halfDuration(p);
  const law = p.c ? { c: p.c } : { u1: p.u1, u2: p.u2 };
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
      sum += front ? 1 - occultationLaw(z, p.k, law, annuli) : 1;
    }
    out[i] = sum / n;
  }
  return out;
}

// --- The star's density -------------------------------------------------------------

/** CODATA 2018, m^3 kg^-1 s^-2. */
export const G_SI = 6.6743e-11;
/** IAU 2015 B3 nominal solar GM and radius, for the density in solar units. */
const GM_SUN = 1.3271244e20;
const R_SUN = 6.957e8;
/** The Sun's mean density, kg m^-3: 3 GM / (4 pi G R^3). */
export const RHO_SUN = (3 * GM_SUN) / (4 * Math.PI * G_SI * R_SUN ** 3);

/**
 * The star's mean density from the orbit alone, kg m^-3: 3 pi (a/R*)^3 / (G P^2),
 * Kepler's third law with the planet's mass neglected and the orbit circular.
 * @param {number} aRs - a/R*
 * @param {number} periodDays
 */
export const stellarDensity = (aRs, periodDays) =>
  (3 * Math.PI * aRs ** 3) / (G_SI * (periodDays * 86400) ** 2);

/**
 * The factor by which a circular-orbit fit misstates the density of a star
 * whose planet is on an orbit of eccentricity e and argument of periastron w
 * (degrees): rho_circ = rho_true Psi, Psi = ((1 + e sin w) / sqrt(1 - e^2))^3
 * (Kipping 2010; Dawson and Johnson 2012). First order: it is the cube of the
 * ratio of the planet's sky-plane speed at the transit to the circular speed.
 */
export const eccentricityFactor = (e, wDegrees) =>
  ((1 + e * Math.sin((wDegrees * Math.PI) / 180)) / Math.sqrt(1 - e * e)) ** 3;
