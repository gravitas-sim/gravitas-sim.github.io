// =============================================================================
// Laying out a controlled binary, and a planet in it
// -----------------------------------------------------------------------------
// The randomized "Binary Star System" scenario is a fine thing to look at and
// useless to experiment on: its masses, separation and phases come out of the
// world generator, so two runs are never the same setup and a difference
// between them means nothing. An investigation into what survives around a
// binary needs the opposite - every number stated, nothing sampled - so that
// the one thing a student changes is the only thing that changed.
//
// Everything here is closed-form state vectors from orbital elements. No
// integration, no search, no iteration: given masses, a separation, an
// eccentricity and two phase angles, there is exactly one answer and this
// computes it. That matters twice over. It makes the starting state
// reproducible to the bit, which the experiment bench needs in order to restore
// a run; and it means the *initial* orbit is exact, so any departure from it
// later is the physics or the integrator rather than a sloppy launch.
//
// Frames and conventions
// -----------------------------------------------------------------------------
//   - The barycenter of the two stars is at the origin and at rest.
//   - The binary's periapsis lies along +x, and both the binary and the planet
//     go counter-clockwise. Same sense means prograde, which is what the
//     published stability boundary in js/binaryStability.js assumes.
//   - Phases are true anomalies in degrees, measured from periapsis for the
//     binary and from +x for the planet.
//   - Units are whatever the caller uses, as long as G, the masses and the
//     lengths agree. The world builder passes simulation units; the validation
//     suite passes its own. Nothing here knows about AU.
// =============================================================================

/** A planet around one star of the pair. */
export const CIRCUMSTELLAR = 'circumstellar';

/** A planet around both stars at once. */
export const CIRCUMBINARY = 'circumbinary';

const DEG = Math.PI / 180;

/**
 * The scalar facts about a binary, before anybody is placed anywhere.
 *
 * @param {object} cfg - Binary parameters
 * @param {number} cfg.m1 - Primary mass
 * @param {number} cfg.m2 - Secondary mass
 * @param {number} cfg.separation - Semi-major axis of the relative orbit
 * @param {number} cfg.eccentricity - Eccentricity of the relative orbit
 * @param {number} cfg.G - Gravitational constant, in the caller's units
 * @returns {{total:number, mu:number, period:number, periapsis:number, apoapsis:number}}
 */
export function binaryFacts({ m1, m2, separation, eccentricity, G }) {
  const total = m1 + m2;
  return {
    total,
    // The companion's share of the mass. This is the mu that the Holman &
    // Wiegert fits are written in, and getting it the wrong way round moves
    // the predicted boundary by tens of per cent, so it is defined once here
    // and never recomputed at a call site.
    mu: m2 / total,
    period: 2 * Math.PI * Math.sqrt(separation ** 3 / (G * total)),
    periapsis: separation * (1 - eccentricity),
    apoapsis: separation * (1 + eccentricity),
  };
}

/**
 * Position and velocity of the relative orbit at a given true anomaly.
 *
 * @param {number} a - Semi-major axis
 * @param {number} e - Eccentricity
 * @param {number} nu - True anomaly, radians
 * @param {number} gm - G times the total mass of the pair
 * @returns {{pos:{x:number,y:number}, vel:{x:number,y:number}}} Relative state
 */
function relativeState(a, e, nu, gm) {
  const p = a * (1 - e * e);
  const r = p / (1 + e * Math.cos(nu));
  const h = Math.sqrt(gm * p);
  const k = gm / h;
  return {
    pos: { x: r * Math.cos(nu), y: r * Math.sin(nu) },
    vel: { x: -k * Math.sin(nu), y: k * (e + Math.cos(nu)) },
  };
}

/**
 * Where the two stars start, in the barycentric frame.
 *
 * Each star sits on the opposite side of the origin from the other, at the
 * fraction of the separation the *other* one's mass calls for. Built this way
 * the pair has zero net momentum by construction rather than by correction, so
 * the system does not walk off the screen over a long integration and the
 * planet's distance "from the system" means something fixed.
 *
 * @param {object} cfg - Binary parameters
 * @param {number} cfg.m1 - Primary mass
 * @param {number} cfg.m2 - Secondary mass
 * @param {number} cfg.separation - Semi-major axis of the relative orbit
 * @param {number} cfg.eccentricity - Eccentricity of the relative orbit
 * @param {number} cfg.phaseDeg - Binary true anomaly at t=0, degrees from periapsis
 * @param {number} cfg.G - Gravitational constant
 * @returns {{star1:{pos:object, vel:object}, star2:{pos:object, vel:object}, facts:object}}
 */
export function binaryLayout(cfg) {
  const { m1, m2, separation, eccentricity, phaseDeg, G } = cfg;
  const facts = binaryFacts(cfg);
  const rel = relativeState(
    separation,
    eccentricity,
    phaseDeg * DEG,
    G * facts.total
  );
  const f1 = -m2 / facts.total;
  const f2 = m1 / facts.total;
  return {
    star1: {
      pos: { x: rel.pos.x * f1, y: rel.pos.y * f1 },
      vel: { x: rel.vel.x * f1, y: rel.vel.y * f1 },
    },
    star2: {
      pos: { x: rel.pos.x * f2, y: rel.pos.y * f2 },
      vel: { x: rel.vel.x * f2, y: rel.vel.y * f2 },
    },
    facts,
  };
}

/**
 * Where the planet starts.
 *
 * Circular in both modes, because that is the initial condition the published
 * boundary was fitted for: launching on an eccentric orbit would make the
 * comparison with the fit meaningless while looking exactly the same on screen.
 *
 * The two modes differ in what the planet is orbiting and therefore in what
 * mass sets its speed - one star, or the pair treated as a point. Neither is
 * more than an approximation to the real three-body problem, which is the
 * reason the planet's orbit visibly breathes from the first frame: it is being
 * launched on a two-body orbit into a potential that is not a two-body
 * potential. Saying that out loud is part of the lesson.
 *
 * @param {object} cfg - Planet parameters
 * @param {string} cfg.mode - CIRCUMSTELLAR or CIRCUMBINARY
 * @param {object} cfg.layout - From binaryLayout()
 * @param {number} cfg.m1 - Primary mass
 * @param {number} cfg.m2 - Secondary mass
 * @param {number} cfg.planetMass - Planet mass, in the same units
 * @param {number} cfg.semiMajor - Planet semi-major axis, same length units
 * @param {number} cfg.planetPhaseDeg - Planet phase at t=0, degrees from +x
 * @param {number} cfg.G - Gravitational constant
 * @returns {{pos:{x:number,y:number}, vel:{x:number,y:number}, host:object}}
 */
export function planetLayout(cfg) {
  const { mode, layout, m1, m2, planetMass, semiMajor, planetPhaseDeg, G } =
    cfg;
  const phi = planetPhaseDeg * DEG;
  const ux = Math.cos(phi);
  const uy = Math.sin(phi);

  // Counter-clockwise, matching the binary's sense: prograde.
  const host =
    mode === CIRCUMBINARY
      ? { pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 } }
      : layout.star1;
  const gm =
    mode === CIRCUMBINARY ? G * (m1 + m2 + planetMass) : G * (m1 + planetMass);
  const v = Math.sqrt(gm / semiMajor);

  return {
    pos: {
      x: host.pos.x + semiMajor * ux,
      y: host.pos.y + semiMajor * uy,
    },
    vel: {
      x: host.vel.x - v * uy,
      y: host.vel.y + v * ux,
    },
    host,
  };
}

/**
 * The whole starting state, both stars and the planet, from one description.
 *
 * The two phases are independent on purpose. Where the binary is in its orbit
 * and where the planet is in its own are separate initial conditions, and in a
 * three-body problem they are not interchangeable: the same planet launched at
 * the same radius while the stars are at periapsis rather than apoapsis meets a
 * different force history and can end up somewhere else entirely. Collapsing
 * them into one angle would quietly remove a variable the investigation asks
 * students to hold fixed.
 *
 * @param {object} cfg - Everything binaryLayout and planetLayout need
 * @param {number} cfg.phaseDeg - Binary true anomaly at t=0
 * @param {number} cfg.planetPhaseDeg - Planet phase at t=0, from +x
 * @returns {{star1:object, star2:object, planet:object, facts:object}} The layout
 */
export function systemLayout(cfg) {
  const layout = binaryLayout(cfg);
  const planet = planetLayout({ ...cfg, layout });
  return {
    star1: layout.star1,
    star2: layout.star2,
    planet,
    facts: layout.facts,
  };
}
