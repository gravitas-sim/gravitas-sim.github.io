// =============================================================================
// Two-body orbital elements, and Kepler's equation
// -----------------------------------------------------------------------------
// What an investigation asks a student to measure comes from here. The
// inspector's "Orbital Period" assumes a central mass of 1000 whatever the
// parent is; these solve the real two-body problem. Pure: no DOM, no imports.
//
// Kepler's equation has one solver, solveKepler below (Prompt 142). Nine modules
// had each solved it for themselves, with their own start, tolerance and cap;
// outside the range their callers use, six could miss the root: the three that
// start at pi wander for M below zero at e = 0.8 and up, and the radial-velocity,
// resonance and sky solvers do not settle at e = 0.995. The bracketed one the
// 3-D lab used is the one that stays. Its contract, which
// tests/keplerSolver.test.js holds on a grid against a reference that shares
// none of its code:
//   input    M any finite real, radians; e in [0, 1). A hyperbola is the 3-D
//            lab's own branch (js/lab3d/elements.js), and e = 1 has no a.
//   output   the E on the same turn as M: E - e sin E = M to rounding
//            (periapsis and apoapsis come back as 0 and pi to rounding).
//   stop     the Newton step is below 1e-16 of |E|, or the bracket has closed.
//            The bracket [M - e, M + e] always holds the root, and a step that
//            would leave it is a bisection, so 200 iterations is a ceiling
//            nothing reaches.
//   e = 0    returns M. e near 1 is limited by the equation, not the solver:
//            the root's slope is 1 / (1 - e), so one ulp in M is up to
//            1 / (1 - e) ulps in E.
// js/kernels/sky/planets.js keeps its own step, for the Sky Lab's weight gate
// (SKY_LAB_GATE.md): its eccentricities stop at 0.21, where it is exact to 1e-12.
// =============================================================================

// Bound once: in Jest's vm context every free global read goes through the
// context, which made hot loops over this 8-25x slower than in Node (the
// radial-velocity fits call the solver per observation).
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
 * @returns {Object|null} Elements, or null if the inputs are unusable
 */
export function orbitalElements(body, primary, G) {
  if (!body || !primary || !isFinite(G) || G <= 0) return null;

  const rx = body.pos.x - primary.pos.x;
  const ry = body.pos.y - primary.pos.y;
  const vx = body.vel.x - primary.vel.x;
  const vy = body.vel.y - primary.vel.y;

  const r = Math.hypot(rx, ry);
  const v = Math.hypot(vx, vy);
  if (!isFinite(r) || r <= 0) return null;

  // Both masses: equal-mass binaries are a 50% period error otherwise.
  const mu = G * (primary.mass + (body.mass || 0));
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
