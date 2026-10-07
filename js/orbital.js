// =============================================================================
// Two-body orbital elements
// -----------------------------------------------------------------------------
// What an investigation asks a student to measure comes from here. The
// inspector's "Orbital Period" assumes a central mass of 1000 whatever the
// parent is; these solve the real two-body problem. Pure: no DOM, no imports.
// =============================================================================

// --- Kepler's equation: one Newton, each caller keeps its own domain ----------
//   caller                      start E0                  tol    cap
//   ui.js wedges                e < 0.8 ? M : pi          1e-13  40
//   systemSpec.js               e > 0.8 ? pi sign(M) : M  1e-15  60
// A start at pi is tested over M in [-6, 7] at e = 0.8, 0.9 and 0.95 and
// converged each time, but convergence from pi is not guaranteed for M outside
// [0, 2 pi] (ui.js can pass M < 0 with e up to 0.999). Kept as it was.
// habitability.js and binaryWidgets.js (e < 0.8 ? M : pi, 1e-12, 60 and 40),
// inference/rv.js (M + e sin M, 1e-13, 50), resonance/systems.js (M, 1e-14, 100)
// and lab3d/elements.js (bracketed, hyperbolic) keep their own: the routes that
// load them do not load this module and each would pay its 6.7 KB;
// js/mission/twobody.js is universal-variable.

/** Newton on E - e sin E = M, 0 <= e < 1; the last step is applied. */
export function keplerNewton(M, e, E0, tol, maxIter) {
  let E = E0;
  for (let i = 0; i < maxIter; i++) {
    const step = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= step;
    if (Math.abs(step) < tol) break;
  }
  return E;
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
