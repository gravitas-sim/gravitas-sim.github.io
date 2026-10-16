// =============================================================================
// The mission core's model inputs: units, bodies and the planets' orbits
// -----------------------------------------------------------------------------
// Every quantity the solvers take is in one consistent set, km, s and
// km^3/s^2, and every number here is an input of the model, stated once:
//
//   GM       km^3/s^2, the body's gravitational parameter (its mass never
//            appears on its own: GM is what is measured)
//   radius   km, equatorial, for the surface a periapsis may not go below
//   a        AU, the mean semi-major axis of the planet's orbit
//   L0       degrees, the mean longitude at J2000.0 (2000-01-01 12:00 TT)
//
// The planets' orbits are a model, not an ephemeris: circles in one plane at
// the mean semi-major axis, moving at the Keplerian rate the Sun's GM gives,
// from the J2000 mean longitude. That is what a textbook's first transfer
// window assumes, and it is what MISSION.md lists as an approximation: real
// orbits are eccentric and inclined, and a mission would read an ephemeris
// (Prompt 39's packs), not these circles.
//
// Values: GM and radii are the rounded standard values of the IAU and JPL's
// Solar System Dynamics group; a and L0 are Standish's mean elements for
// 1800 to 2050 (JPL, "Keplerian Elements for Approximate Positions of the
// Major Planets"). The AU is exact by the IAU's 2012 definition.
// =============================================================================

/** km in one astronomical unit (IAU 2012 Resolution B2, exact). */
export const AU = 149597870.7;
/** Seconds in a day. */
export const DAY = 86400;

export const BODIES = Object.freeze({
  sun: Object.freeze({ id: 'sun', GM: 1.32712440018e11, radius: 695700 }),
  venus: Object.freeze({
    id: 'venus',
    GM: 324858.592,
    radius: 6051.8,
    a: 0.72333566,
    L0: 181.9790995,
  }),
  earth: Object.freeze({
    id: 'earth',
    GM: 398600.4418,
    radius: 6378.137,
    a: 1.00000261,
    L0: 100.46457166,
  }),
  mars: Object.freeze({
    id: 'mars',
    GM: 42828.37,
    radius: 3396.19,
    a: 1.52371034,
    L0: -4.55343205,
  }),
  jupiter: Object.freeze({
    id: 'jupiter',
    GM: 126686534,
    radius: 71492,
    a: 5.202887,
    L0: 34.39644051,
  }),
});
/** The bodies a spacecraft can orbit, depart from or fly by. */
export const PLANETS = Object.freeze(['venus', 'earth', 'mars', 'jupiter']);
/** Every body a transfer between circular orbits may be about. */
export const CENTRAL = Object.freeze([
  'earth',
  'mars',
  'venus',
  'jupiter',
  'sun',
]);

const TAU = 2 * Math.PI;
const { sqrt, cos, sin, PI } = Math;

/**
 * Canonical units for a body and a length: DU = the length, TU the time in
 * which a circular orbit of radius DU moves one radian, so GM = 1 DU^3/TU^2.
 * What the 3-D kernel is run in when it checks a solver (./verify.js).
 * @returns {{DU: number, TU: number, VU: number}} km, s and km/s
 */
export function canonical(GM, length) {
  if (!(GM > 0) || !(length > 0)) throw new Error('canonical: GM and length');
  const TU = sqrt((length * length * length) / GM);
  return { DU: length, TU, VU: length / TU };
}

/** The planet's orbital radius, km, and its mean motion, rad/s. */
export function circularOrbit(id) {
  const p = BODIES[id];
  if (!p?.a) throw new Error(`circularOrbit: ${id}`);
  const r = p.a * AU;
  return { r, n: sqrt(BODIES.sun.GM / (r * r * r)) };
}

/**
 * Where the model puts a planet, heliocentric, in the ecliptic plane:
 * position (km) and velocity (km/s), `days` after J2000.0.
 */
export function planetState(id, days) {
  const { r, n } = circularOrbit(id);
  const L = (BODIES[id].L0 * PI) / 180 + n * days * DAY;
  const c = cos(L);
  const s = sin(L);
  const v = r * n;
  return { r: [r * c, r * s, 0], v: [-v * s, v * c, 0], longitude: mod(L) };
}

/** An angle in [0, 2 pi). */
export const mod = a => ((a % TAU) + TAU) % TAU;

/** The synodic period of two planets in the model, days. */
export function synodicDays(a, b) {
  const na = circularOrbit(a).n;
  const nb = circularOrbit(b).n;
  if (na === nb) return Infinity;
  return TAU / Math.abs(na - nb) / DAY;
}

/**
 * Days from J2000.0 as a calendar date (UTC, to the day). The model's clock
 * is TT; the 69 s between them is far below a day.
 */
export function dateOf(days) {
  const ms = Date.UTC(2000, 0, 1, 12) + days * DAY * 1000;
  return new Date(ms).toISOString().slice(0, 10);
}

/** A calendar date, YYYY-MM-DD, as days from J2000.0 at 00:00 UTC; NaN if not one. */
export function daysOf(date) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date));
  if (!m) return NaN;
  const ms = Date.UTC(+m[1], +m[2] - 1, +m[3]);
  const back = new Date(ms).toISOString().slice(0, 10);
  if (back !== date) return NaN;
  return (ms - Date.UTC(2000, 0, 1, 12)) / (DAY * 1000);
}
