// =============================================================================
// Two-body orbital elements, and Kepler's equation
// -----------------------------------------------------------------------------
// What an investigation asks a student to measure comes from here. The
// inspector's "Orbital Period" assumes a central mass of 1000 whatever the
// parent is; these solve the real two-body problem. Pure: no DOM, no imports.
//
// Kepler's equation has one solver, solveKepler below (Prompt 142): M any real,
// e in [0, 1), E on M's own turn. Its contract and its fixture grid are in
// tests/keplerSolver.test.js. Three modules keep their own: js/lab3d/elements.js (an
// instructor-bundle source, held bit-identical), js/kernels/sky/planets.js (the
// Sky Lab's weight gate) and js/resonance/systems.js (a bit-for-bit world golden).
//
// twoBodyModel below is the one authority for a two-body claim: which of a
// pair pulls the other, the mu that follows, and whether the force is
// inverse-square over the distances the claim covers. Its one import is the
// halo's field, so it can weigh a halo against the primary.
// =============================================================================

import { haloAcceleration } from './darkMatter.js';

// Bound once: free globals are 8-25x slower in Jest's vm context.
const { Math } = globalThis;

/**
 * Kepler's equation E - e sin E = M, for 0 <= e < 1. Newton's method from
 * Danby's starting value, kept inside the bracket [M - e, M + e] that always
 * holds the root, with a bisection whenever a step would leave it: started
 * at pi, plain Newton wanders at high eccentricity (e = 0.95, M = -1.74
 * never converged).
 * @param {number} M - Mean anomaly, radians, any turn
 * @param {number} e - Eccentricity, [0, 1)
 * @returns {number} The eccentric anomaly on M's own turn, radians
 */
export function solveKepler(M, e) {
  const wrapped = M - 2 * Math.PI * Math.round(M / (2 * Math.PI));
  let lo = wrapped - e;
  let hi = wrapped + e;
  let E = wrapped + 0.85 * e * Math.sign(Math.sin(wrapped) || 1);
  for (let k = 0; k < 200; k++) {
    const f = E - e * Math.sin(E) - wrapped;
    if (f > 0) hi = E;
    else lo = E;
    let next = E - f / (1 - e * Math.cos(E));
    if (!(next > lo && next < hi)) next = (lo + hi) / 2;
    if (Math.abs(next - E) <= 1e-16 * (1 + Math.abs(E))) {
      E = next;
      break;
    }
    E = next;
  }
  return E + (M - wrapped);
}

/**
 * Orbital elements of a body about a primary.
 *
 * Vis-viva: the energy fixes a, the eccentricity vector the shape.
 *
 * @param {Object} body - {pos:{x,y}, vel:{x,y}, mass}
 * @param {Object} primary - {pos:{x,y}, vel:{x,y}, mass}
 * @param {number} G - Gravitational constant, simulation units
 * @param {number} [muIn] - The pair's mu, when a caller knows it (from
 *   twoBodyModel). Omitted, mu is G(M+m), as it always was.
 * @returns {Object|null} Elements, or null if the inputs are unusable
 */
export function orbitalElements(body, primary, G, muIn) {
  if (!body || !primary || !isFinite(G) || G <= 0) return null;

  const rx = body.pos.x - primary.pos.x;
  const ry = body.pos.y - primary.pos.y;
  const vx = body.vel.x - primary.vel.x;
  const vy = body.vel.y - primary.vel.y;

  const r = Math.hypot(rx, ry);
  const v = Math.hypot(vx, vy);
  if (!isFinite(r) || r <= 0) return null;

  // Both masses: equal-mass binaries are a 50% period error otherwise. A
  // caller that knows only the primary pulls passes G M instead.
  const mu = muIn !== undefined ? muIn : G * (primary.mass + (body.mass || 0));
  if (!isFinite(mu) || mu <= 0) return null;

  // Specific orbital energy. Negative is bound, positive escapes.
  const energy = (v * v) / 2 - mu / r;

  // Specific angular momentum (z component).
  const h = rx * vy - ry * vx;

  // Eccentricity vector, e = (v x h)/mu - r/|r|
  const ex = (vy * h) / mu - rx / r;
  const ey = (-vx * h) / mu - ry / r;
  const e = Math.hypot(ex, ey);

  const bound = energy < 0;
  // Not handed to a student as "the size" when hyperbolic.
  const a = bound ? -mu / (2 * energy) : Infinity;

  const period = bound ? 2 * Math.PI * Math.sqrt((a * a * a) / mu) : Infinity;
  const periapsis = bound ? a * (1 - e) : (h * h) / mu / (1 + e);
  const apoapsis = bound ? a * (1 + e) : Infinity;

  // Escape speed at the current separation.
  const escapeSpeed = Math.sqrt((2 * mu) / r);

  return {
    r,
    v,
    a,
    e,
    period,
    periapsis,
    apoapsis,
    energy,
    angularMomentum: h,
    escapeSpeed,
    bound,
    mu,
    // True anomaly, so a step can tell how far round the orbit the body is.
    trueAnomaly: Math.atan2(ry, rx) - Math.atan2(ey, ex),
    // Where periapsis points, from the primary. A circle has none, so the
    // body's own direction stands in for it.
    periapsisAngle: e > 0 ? Math.atan2(ey, ex) : Math.atan2(ry, rx),
  };
}

// What the integrator counts as a source, by kind (js/engine/step.js,
// updateCachedArrays): holes, stars and galaxies always; giants, neutron stars
// and white dwarfs unless only stars pull; planets and asteroids only with
// mutual gravity on and star-only gravity off; comets and debris never.
const ALWAYS = new Set(['BlackHole', 'StarObject', 'Galaxy']);
const UNLESS_STAR_ONLY = new Set(['GasGiant', 'NeutronStar', 'WhiteDwarf']);
const WITH_MUTUAL = new Set(['Planet', 'Asteroid']);

/**
 * Whether the integrator sums this body's gravity for others.
 * @param {Object} b - A body with `kind`
 * @param {Object} s - Settings (mutual_gravity, star_only_gravity)
 * @returns {boolean} True when it is a source
 */
export function isGravitySource(b, s) {
  const kind = b?.kind;
  if (ALWAYS.has(kind)) return true;
  const starOnly = s?.star_only_gravity === true;
  if (UNLESS_STAR_ONLY.has(kind)) return !starOnly;
  if (WITH_MUTUAL.has(kind)) return Boolean(s?.mutual_gravity) && !starOnly;
  return false;
}

/**
 * Whether `target` is moved by the pull of `source`, given that it is one.
 * A body a prescribed model owns is not stepped; a black hole feels only
 * other holes, and only when holes orbit (js/engine/blackHole.js).
 * @param {Object} target - The body acted on
 * @param {Object} source - The body pulling
 * @param {Object} s - Settings (bh_behavior)
 * @returns {boolean} True when the engine applies that pull
 */
function feels(target, source, s) {
  if (!target || target.model_owned) return false;
  if (target.kind === 'BlackHole') {
    return source?.kind === 'BlackHole' && s?.bh_behavior === 'Orbiting';
  }
  return true;
}

/**
 * The one authority for a two-body claim about a body and its primary.
 *
 * Class, from the engine's own source rule: `mutual` (each pulls the other,
 * mu = G(M+m)), `one-way` (only the primary pulls, mu = G M) or `none` (the
 * primary does not pull on the body; no mu). Domain, for the separations
 * given: `mond` (the summed field is modified), `softened` (one of them is
 * inside the softening length, where the pull grows with distance), or
 * `inverse-square`, marked `approximate` where a halo's pull at the body is 1
 * percent or more of the primary's.
 *
 * The caller resolves what the engine resolves (the softening in force, the
 * MOND a0 and the halo), so this file carries no fallback of its own.
 *
 * @param {Object} body - The orbiting body ({kind, pos, mass, model_owned})
 * @param {Object} primary - The primary ({kind, pos, mass})
 * @param {Object} settings - gravitational_constant, mutual_gravity,
 *   star_only_gravity, bh_behavior, and the resolved softening (length),
 *   mondA0 (0 when MOND is off) and halo (null when there is none)
 * @param {number[]} [distances] - Separations the claim covers; the current
 *   one when omitted
 * @returns {Object|null} {pairClass, mu, primaryPulls, bodyPulls, domain,
 *   inverseSquare, approximate, softening, haloRatio}, or null for bad input
 */
export function twoBodyModel(body, primary, settings, distances) {
  if (!body?.pos || !primary?.pos || !settings) return null;
  const G = settings.gravitational_constant;
  const primaryPulls =
    isGravitySource(primary, settings) && feels(body, primary, settings);
  const bodyPulls =
    isGravitySource(body, settings) && feels(primary, body, settings);
  const pairClass = !primaryPulls ? 'none' : bodyPulls ? 'mutual' : 'one-way';
  const mu =
    pairClass === 'none'
      ? null
      : G * (primary.mass + (pairClass === 'mutual' ? body.mass || 0 : 0));

  const r = Math.hypot(body.pos.x - primary.pos.x, body.pos.y - primary.pos.y);
  const list = distances?.length ? distances : [r];
  const softening = settings.softening;
  let domain = 'inverse-square';
  let haloRatio = null;
  if (settings.mondA0 > 0) domain = 'mond';
  else if (list.some(d => !(d >= softening))) domain = 'softened';
  else if (settings.halo && r > 0 && G * primary.mass > 0) {
    const h = haloAcceleration(body.pos, settings.halo);
    haloRatio = Math.hypot(h.ax, h.ay) / ((G * primary.mass) / (r * r));
  }
  const inverseSquare = domain === 'inverse-square';
  return {
    pairClass,
    mu,
    primaryPulls,
    bodyPulls,
    domain,
    inverseSquare,
    approximate: inverseSquare && haloRatio !== null && haloRatio >= 0.01,
    softening,
    haloRatio,
  };
}

/**
 * The body a given object is most strongly bound to.
 *
 * By gravitational acceleration, not mass or distance alone: a moon belongs to
 * its planet even though the star is heavier.
 *
 * @param {Object} body - The orbiting object
 * @param {Array} candidates - Possible primaries
 * @returns {Object|null} The dominant attractor, or null
 */
export function dominantPrimary(body, candidates) {
  if (!body || !candidates?.length) return null;
  let best = null;
  let bestPull = 0;
  for (const c of candidates) {
    if (!c || c === body || c.alive === false) continue;
    if (!(c.mass > 0)) continue;
    const d = Math.hypot(c.pos.x - body.pos.x, c.pos.y - body.pos.y);
    if (!(d > 0)) continue;
    const pull = c.mass / (d * d);
    if (pull > bestPull) {
      bestPull = pull;
      best = c;
    }
  }
  return best;
}

/**
 * Total energy of a two-body pair, in simulation units.
 * @param {Object} body - Orbiting object
 * @param {Object} primary - Primary
 * @param {number} G - Gravitational constant
 * @returns {{kinetic:number, potential:number, total:number}|null} Energies
 */
export function pairEnergy(body, primary, G) {
  if (!body || !primary) return null;
  const vx = body.vel.x - primary.vel.x;
  const vy = body.vel.y - primary.vel.y;
  const r = Math.hypot(body.pos.x - primary.pos.x, body.pos.y - primary.pos.y);
  if (!(r > 0)) return null;
  const m = body.mass || 0;
  const kinetic = 0.5 * m * (vx * vx + vy * vy);
  const potential = (-G * primary.mass * m) / r;
  return { kinetic, potential, total: kinetic + potential };
}

/**
 * Track periapsis passages: a measured period, to check the analytic one.
 */
export function createPeriodTimer() {
  let lastR = null;
  let falling = false;
  let lastPassage = null;
  const periods = [];

  return {
    /**
     * Feed the current separation and clock.
     * @param {number} r - Current separation
     * @param {number} t - Current simulation time
     * @returns {number|null} A completed period, when one just closed
     */
    sample(r, t) {
      if (!isFinite(r) || !isFinite(t)) return null;
      let closed = null;
      if (lastR !== null) {
        const nowFalling = r < lastR;
        // The turn from approaching to receding is periapsis.
        if (falling && !nowFalling) {
          if (lastPassage !== null) {
            const p = t - lastPassage;
            if (p > 0) {
              periods.push(p);
              closed = p;
            }
          }
          lastPassage = t;
        }
        falling = nowFalling;
      }
      lastR = r;
      return closed;
    },
    /** @returns {number|null} Mean of the measured periods */
    mean() {
      if (!periods.length) return null;
      return periods.reduce((a, b) => a + b, 0) / periods.length;
    },
    /** @returns {number} How many complete orbits have been timed */
    count() {
      return periods.length;
    },
    reset() {
      lastR = null;
      falling = false;
      lastPassage = null;
      periods.length = 0;
    },
  };
}
