// =============================================================================
// Binary masses and radii: the double-lined orbit and the eclipse (Prompt 218)
// -----------------------------------------------------------------------------
// Two radial-velocity curves of one orbit give the mass ratio and, with the
// period and the eccentricity, the SIZE of the orbit times sin i and the sum
// of the masses times sin^3 i. An eclipse says the orbit is seen nearly edge
// on, and the eclipse light curve gives the inclination and the radii as
// fractions of the orbit. Together they give absolute masses and radii
// (Torres, Andersen and Gimenez 2010, A&ARv 18, 67). Neither alone does:
// velocities alone leave sin i free, so every mass is a MINIMUM; eclipses alone
// leave the size of the orbit in kilometres free.
//
// The chain, with K in km/s and P in days (SI inside):
//
//   a sin i = (K1 + K2) P sqrt(1 - e^2) / (2 pi)
//   (M1 + M2) sin^3 i = 4 pi^2 (a sin i)^3 / (GM_sun P^2)         solar masses
//   M2 / M1 = K1 / K2                          (the barycentre does not move)
//   a = (a sin i) / sin i;   R1 = a rsum / (1 + k),  R2 = k R1
//
// The Sun's GM, not G, carries the mass scale (IAU 2015 B3 nominal), so no
// uncertain G enters a mass; the radii are in the nominal solar radius.
//
// A single-lined system gives one amplitude. What it fixes is the mass
// function f(M) = P K1^3 (1 - e^2)^(3/2) / (2 pi G) = M2^3 sin^3 i / (M1 + M2)^2,
// and for a STATED primary mass a MINIMUM companion mass (sin i = 1). It never
// gives a mass, with or without an eclipse here, because the primary's mass is
// an assumption of the reader's, not a measurement.
//
// Conventions are those of js/inference/binaries.js and rv.js: star 1 is the
// star eclipsed at the primary eclipse, K1 and K2 are positive, the
// line-of-sight velocity is positive for receding, star 1 recedes before the
// primary eclipse and star 2 does the opposite. Pure: no DOM, no state.
// =============================================================================

import { rvCurve } from './rv.js';

// Bound once: free globals are 8-25x slower in Jest's vm context.
const { Math, Float64Array } = globalThis;

/** IAU 2015 B3 nominal solar mass parameter, m^3 s^-2. */
export const GM_SUN = 1.3271244e20;
/** IAU 2015 B3 nominal solar radius, m. */
export const R_SUN = 6.957e8;
/** The astronomical unit, m (IAU 2012 B2). */
export const AU = 149597870700;
/** Seconds in a day. */
export const DAY = 86400;
const TWO_PI = 2 * Math.PI;

/** log10 of the Sun's surface gravity in cgs, from the nominal values. */
export const LOGG_SUN = Math.log10((GM_SUN / (R_SUN * R_SUN)) * 100);

/** Eccentricity of the pair (e cos w, e sin w). */
const ecc = (ecosw, esinw) => Math.hypot(ecosw || 0, esinw || 0);

/**
 * Both stars' radial velocities, systemic velocity excluded: star 1 is
 * K1 g(t) and star 2 is -K2 g(t), with g the unit-amplitude curve of rv.js
 * (the orbit placed by the primary conjunction time tc).
 * @param {ArrayLike<number>} times - Days
 * @param {{tc: number, P: number, K1: number, K2: number, ecosw: number,
 *   esinw: number}} p
 * @returns {{v1: Float64Array, v2: Float64Array}} km/s
 */
export function rvPair(times, p) {
  const e = ecc(p.ecosw, p.esinw);
  const s = e > 0 ? 1 / Math.sqrt(e) : 0;
  const g = rvCurve(times, {
    P: p.P,
    tc: p.tc,
    K: 1,
    sqrtEcosw: (p.ecosw || 0) * s,
    sqrtEsinw: (p.esinw || 0) * s,
  });
  return {
    v1: Float64Array.from(g, v => p.K1 * v),
    v2: Float64Array.from(g, v => -p.K2 * v),
  };
}

/** a sin i in solar radii. */
export function asini(K1, K2, P, e) {
  return ((K1 + K2) * 1e3 * P * DAY * Math.sqrt(1 - e * e)) / TWO_PI / R_SUN;
}

/**
 * What two velocity amplitudes fix: every mass here is a minimum.
 * @param {{K1: number, K2: number, P: number, e: number}} o - km/s, d
 * @returns {{q: number, asini: number, msumSin3i: number, m1sin3i: number,
 *   m2sin3i: number}} q = M2/M1; masses in solar masses
 */
export function minimumMasses({ K1, K2, P, e }) {
  const a = asini(K1, K2, P, e) * R_SUN;
  const Ps = P * DAY;
  const msum = (TWO_PI * TWO_PI * a * a * a) / (GM_SUN * Ps * Ps);
  return {
    q: K1 / K2,
    asini: a / R_SUN,
    msumSin3i: msum,
    m1sin3i: (msum * K2) / (K1 + K2),
    m2sin3i: (msum * K1) / (K1 + K2),
  };
}

/** The surface gravity, log10 cgs, of a star of M and R in solar units. */
export const logg = (M, R) => LOGG_SUN + Math.log10(M / (R * R));

/** The mean density in solar units (the Sun is 1) of a star of M and R in solar units. */
export const density = (M, R) => M / (R * R * R);

/**
 * Absolute masses and radii: the amplitudes, the period and the eccentricity
 * with the inclination and the radii as fractions of the orbit from the eclipse.
 * @param {{K1: number, K2: number, P: number, e: number, inc: number,
 *   rsum: number, k: number}} o - km/s, d, degrees
 */
export function absoluteProperties({ K1, K2, P, e, inc, rsum, k }) {
  const m = minimumMasses({ K1, K2, P, e });
  const s = Math.sin((inc * Math.PI) / 180);
  const s3 = s * s * s;
  const a = m.asini / s;
  const r1 = rsum / (1 + k);
  const M1 = m.m1sin3i / s3;
  const M2 = m.m2sin3i / s3;
  const R1 = r1 * a;
  const R2 = k * r1 * a;
  return {
    q: m.q,
    a,
    M1,
    M2,
    R1,
    R2,
    logg1: logg(M1, R1),
    logg2: logg(M2, R2),
    density1: density(M1, R1),
    density2: density(M2, R2),
  };
}

/** The single-lined mass function f(M), solar masses, from one amplitude (km/s), P (d), e. */
export function massFunction(K, P, e) {
  const a1 = (K * 1e3 * P * DAY * Math.sqrt(1 - e * e)) / TWO_PI;
  const Ps = P * DAY;
  return (TWO_PI * TWO_PI * a1 * a1 * a1) / (GM_SUN * Ps * Ps);
}

/**
 * The smallest companion mass a stated primary allows: the root of
 * M2^3 = f (M1 + M2)^2, which is the companion's mass at sin i = 1. The true
 * mass is this divided by what the inclination takes away; it is never smaller.
 * @param {number} f - Mass function, solar masses
 * @param {number} M1 - The stated primary mass, solar masses
 */
export function companionMinimumMass(f, M1) {
  if (!(f >= 0) || !(M1 > 0)) return NaN;
  const g = M2 => (M2 * M2 * M2) / ((M1 + M2) * (M1 + M2)) - f;
  let lo = 0;
  let hi = Math.max(1, f);
  while (g(hi) < 0 && hi < 1e6) hi *= 2;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (g(mid) < 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * The observable elements of a system given by its physical properties: the
 * forward map used to build synthetic systems and to test the chain.
 * @param {{M1: number, M2: number, R1: number, R2: number, P: number,
 *   e: number, w: number, inc: number}} s - solar units, d, degrees (w of
 *   star 2's orbit about star 1, as binaries.js)
 * @returns {{a: number, K1: number, K2: number, rsum: number, k: number,
 *   ecosw: number, esinw: number}} a in solar radii, K in km/s
 */
export function elementsOf(s) {
  const M = s.M1 + s.M2;
  const Ps = s.P * DAY;
  const a = Math.cbrt((GM_SUN * M * Ps * Ps) / (TWO_PI * TWO_PI));
  const sin = Math.sin((s.inc * Math.PI) / 180);
  const v = (TWO_PI * a * sin) / Ps / Math.sqrt(1 - s.e * s.e) / 1e3;
  const w = (s.w * Math.PI) / 180;
  return {
    a: a / R_SUN,
    K1: (v * s.M2) / M,
    K2: (v * s.M1) / M,
    rsum: (s.R1 + s.R2) * (R_SUN / a),
    k: s.R2 / s.R1,
    ecosw: s.e * Math.cos(w),
    esinw: s.e * Math.sin(w),
  };
}
