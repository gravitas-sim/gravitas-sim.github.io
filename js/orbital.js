// =============================================================================
// Two-body orbital elements
// -----------------------------------------------------------------------------
// Everything an investigation asks a student to measure comes from here, so
// that the numbers on screen are the ones the textbook relation predicts.
//
// The object inspector already reports an "Orbital Period", but it computes it
// against a hard-coded central mass of 1000 simulation units regardless of what
// the body is actually orbiting. That is fine as flavour text and useless as a
// measurement: a Kepler's-third-law exercise run against it would produce a
// slope of 1.5 only by coincidence. These functions solve the real two-body
// problem for the parent the body is actually bound to.
//
// Pure and free of DOM or simulation imports, so it can be tested directly.
// =============================================================================

/**
 * Orbital elements of a body about a primary.
 *
 * Standard vis-viva derivation. The specific orbital energy fixes the
 * semi-major axis, and the eccentricity vector fixes the shape; between them
 * every other element follows without integrating anything.
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

  // Both masses, not just the primary's: for a planet about a star the
  // difference is negligible, but these scenarios also hold equal-mass binaries
  // where ignoring the secondary would be a 50% error in the period.
  const mu = G * (primary.mass + (body.mass || 0));
  if (!isFinite(mu) || mu <= 0) return null;

  // Specific orbital energy. Negative is bound, positive escapes.
  const energy = (v * v) / 2 - mu / r;

  // Specific angular momentum; in 2D the cross product has only a z component.
  const h = rx * vy - ry * vx;

  // Eccentricity vector, e = (v x h)/mu - r/|r|
  const ex = (vy * h) / mu - rx / r;
  const ey = (-vx * h) / mu - ry / r;
  const e = Math.hypot(ex, ey);

  const bound = energy < 0;
  // a is negative for a hyperbolic orbit, which is meaningful but not something
  // to hand a student as "the size of the orbit".
  const a = bound ? -mu / (2 * energy) : Infinity;

  const period = bound ? 2 * Math.PI * Math.sqrt((a * a * a) / mu) : Infinity;
  const periapsis = bound ? a * (1 - e) : (h * h) / mu / (1 + e);
  const apoapsis = bound ? a * (1 + e) : Infinity;

  // Escape speed at the body's current separation, for the energy exercises.
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
 * Chooses by gravitational acceleration rather than by mass or distance alone,
 * which is what decides the orbit a student is actually looking at: a moon next
 * to its planet belongs to the planet even though the star is far heavier.
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
 * Track periapsis passages, so a period can be measured rather than derived.
 *
 * Watching the separation turn from decreasing to increasing is how a student
 * would time an orbit by eye, and it gives an independent check on the analytic
 * period: agreement between the two is the point of the exercise.
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
