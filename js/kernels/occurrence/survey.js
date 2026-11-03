// =============================================================================
// The searched population: stars, geometry and the epochs a span holds (Prompt 229)
// -----------------------------------------------------------------------------
// An occurrence rate is defined on a searched population: the targets a survey
// looked at, each with its own noise and its own span. Every number here is a
// definition (OCCURRENCE_RATES.md, "Definitions"), written out before the code:
//
//   star         radius and mass in solar units, noise as the relative flux scatter of one cadence,
//                the length of the continuous series (days)
//   a            Kepler's third law, a circular orbit, GM_sun times the star's mass
//   p_geo        R* / a: a transit occurs when the impact parameter a cos i / R* is below one
//   epochs       a transit whose mid-time falls in [0, span): ceil((span - t0) / P), t0 in [0, P)
//
// The stars are synthetic and labelled so: a survey of N independent draws, the
// radius log-normal, the mass R^0.9 (a stated relation: the mass enters only a),
// the noise log-normal, the span one of three. A population whose rates are
// known is built on them (population.js), so every estimate can be judged
// against its truth. Pure; no DOM.
// =============================================================================

import { stream, gaussian } from '../../random/streams.js';

const { Math, Float64Array, Int32Array } = globalThis;

export const VERSION = 1;
export const GM_SUN = 1.3271244e20;
export const R_SUN = 695700000;
export const R_EARTH = 6378100;
export const DAY = 86400;
export const CADENCE = 1 / 48;
export const LIMB = Object.freeze([0.4, 0.25]);
/** The stated detection threshold (sigma) and the least number of transits a target must hold. */
export const THRESHOLD = 7.1;
export const MIN_TRANSITS = 3;
export const PERIOD_EDGES = Object.freeze([1, 2, 4, 8, 16, 32, 64, 128, 256]);
export const RADIUS_EDGES = Object.freeze([0.5, 1, 2, 4, 8, 16]);
export const SPANS = Object.freeze([90, 365, 1460]);
const SPAN_CUM = Object.freeze([0.25, 0.5, 1]);

export const LIMITS = Object.freeze({ stars: 20000 });

/** The semi-major axis of a circular orbit of period P (days) around a star of `mass` solar masses, meters. */
export const semiMajorM = (P, mass) =>
  Math.cbrt((GM_SUN * mass * (P * DAY) ** 2) / (4 * Math.PI * Math.PI));

/** a / R* for a star {radius, mass}. */
export const aOverR = (P, star) =>
  semiMajorM(P, star.mass) / (star.radius * R_SUN);

/** The probability a randomly oriented orbit transits: R* / a, at most one. */
export const geometricProbability = (P, star) =>
  Math.min(1, 1 / aOverR(P, star));

/** The number of transit epochs a span holds when the first is at t0 (days). */
export const epochCount = (P, span, t0) =>
  t0 < span && t0 >= 0 ? Math.ceil((span - t0) / P) : 0;

/** The geometric middle of a bin's edges. */
export const midpoint = (lo, hi) => Math.sqrt(lo * hi);

/** The synthetic survey: n stars from the named streams of `seed`. */
export function makeStars({ seed = 'occ', n = 2000 } = {}) {
  if (!Number.isInteger(n) || n < 1 || n > LIMITS.stars)
    throw new RangeError(`the survey holds 1 to ${LIMITS.stars} stars`);
  const draw = stream('forward', seed, 'stars');
  const g = gaussian(draw);
  const radius = new Float64Array(n);
  const mass = new Float64Array(n);
  const sigma = new Float64Array(n);
  const span = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    radius[i] = Math.min(1.6, Math.max(0.6, Math.exp(0.2 * g())));
    mass[i] = radius[i] ** 0.9;
    sigma[i] = Math.min(800, Math.max(40, 130 * Math.exp(0.4 * g()))) * 1e-6;
    const u = draw();
    span[i] = SPANS[u < SPAN_CUM[0] ? 0 : u < SPAN_CUM[1] ? 1 : 2];
  }
  return { n, seed, radius, mass, sigma, span, synthetic: true };
}

/** One star of a survey as the object the signal functions take. */
export const starAt = (stars, i) => ({
  radius: stars.radius[i],
  mass: stars.mass[i],
  sigma: stars.sigma[i],
  span: stars.span[i],
});

/** A survey from explicit lists (the oracle's stars): radius, sigma and span; the mass follows. */
export function starsFrom({ radius, sigma, span }) {
  const n = radius.length;
  const r = Float64Array.from(radius);
  return {
    n,
    seed: null,
    radius: r,
    mass: Float64Array.from(r, x => x ** 0.9),
    sigma: Float64Array.from(sigma),
    span: Float64Array.from(span),
    synthetic: true,
  };
}

export const binCount = () => ({
  periods: PERIOD_EDGES.length - 1,
  radii: RADIUS_EDGES.length - 1,
});
export { Int32Array };
