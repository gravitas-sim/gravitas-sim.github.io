// =============================================================================
// The three resonant systems, as published numbers
// -----------------------------------------------------------------------------
// One table per system, each carrying the measured quantities and the paper
// they came from, and one function per system that turns the table into bodies.
// js/ui.js builds the scenarios from these, tools/physics-checks.mjs validates
// them from these, and tests/resonance.test.js checks the arithmetic - so a
// scenario, its validation and its lesson cannot quote three different numbers
// for the same moon.
//
// Scale, and where it was unavoidable
// -----------------------------------------------------------------------------
// Gravitas fixes two anchors: 1000 mass units is a solar mass and one length
// unit is 0.01 AU. Two of the three systems fit inside those without touching
// anything:
//
//   Pluto and Neptune   3007 and 3940 units. True scale, and every distance,
//                       speed and period the interface reports is the real one.
//   Jupiter's Trojans   520 units. Same.
//
// The Jovian system does not. Io orbits 421,800 km out, which is 0.28 length
// units - smaller than the softening floor, far smaller than Jupiter would be
// drawn, and about a thousandth of the smallest scene the renderer is built
// for. So that one scenario is a scale model: every distance is multiplied by
// SCALE_JOVIAN, which under Newtonian gravity with the masses left alone is
// exactly equivalent to multiplying every time by SCALE_JOVIAN^1.5. Nothing
// dimensionless changes - not the 4:2:1 ratios, not the eccentricities, not the
// Laplace angle, not the libration amplitude or the number of orbits it takes.
// What does change is that the interface's own distance and time readouts are
// wrong for that scenario by those two factors, which is why the scenario says
// so in its summary and why the resonance instrument converts for itself.
//
// The masses are not scaled anywhere, and neither is G.
// =============================================================================

/** Length scale of the Jovian scenario: distances are this much larger. */
export const SCALE_JOVIAN = 100;
/** ...so its clock runs this much faster. Newtonian scale invariance. */
export const TIME_SCALE_JOVIAN = Math.pow(SCALE_JOVIAN, 1.5);

/** Simulation length units in one astronomical unit, from js/units.js. */
const UNITS_PER_AU = 100;
/** Simulation mass units in one solar mass, from js/physics.js. */
const UNITS_PER_SOLAR_MASS = 1000;
const KM_PER_AU = 1.495978707e8;
/** Days in one simulated second at G = 2, from js/units.js timeUnitSeconds(). */
export const DAYS_PER_SIM_SECOND = 2.5993;

const DEG = Math.PI / 180;

// --- The Galilean moons -------------------------------------------------------

/**
 * Io, Europa, Ganymede and Callisto.
 *
 * Orbital elements and masses from JPL Solar System Dynamics ("Planetary
 * Satellite Mean Elements" and "Planetary Satellite Physical Parameters"),
 * which are the values Murray & Dermott, Solar System Dynamics (1999) §8.9
 * tabulate for the same purpose.
 *
 * Callisto is in the table although it is not in the resonance, and it is the
 * most useful body here. Its period ratio with Ganymede is 2.33258, which is
 * 0.032% from 7:3 - ten times closer to a small-integer ratio than Pluto's is
 * to 3:2 - and it is not resonant with anything. It is the lesson's proof that
 * a near-rational ratio settles nothing.
 */
export const GALILEAN = {
  id: 'galilean',
  scenario: 'Galilean Resonance',
  scale: SCALE_JOVIAN,
  /** M_sun / M_jupiter, IAU 2015 nominal. */
  sunOverJupiter: 1047.3486,
  jupiterRadiusKm: 71492,
  source:
    'JPL Solar System Dynamics satellite mean elements; Murray & Dermott, Solar System Dynamics (1999) §8.9',
  moons: [
    // periodDays is the quantity the resonance is built from and the one this
    // module preserves exactly; aKm is quoted for reference and is consistent
    // with it to about 0.1%, the difference being Jupiter's oblateness, which
    // contributes to the real mean motions and which Gravitas does not model.
    {
      name: 'Io',
      periodDays: 1.769137786,
      aKm: 421800,
      e: 0.0041,
      massOverJupiter: 4.704e-5,
      radiusKm: 1821.6,
      lambda0: 0,
      varpi0: 0,
      color: '#e8d26a',
    },
    {
      name: 'Europa',
      periodDays: 3.551181041,
      aKm: 671100,
      e: 0.0094,
      massOverJupiter: 2.528e-5,
      radiusKm: 1560.8,
      // Europa's apsidal line is anti-aligned with Io's in the real system, and
      // that 180 degrees is exactly what makes the Laplace angle 180 rather
      // than 0 when the two-body arguments sit at their equilibria.
      lambda0: 180,
      varpi0: 180,
      color: '#cfc6b4',
    },
    {
      name: 'Ganymede',
      periodDays: 7.15455296,
      aKm: 1070400,
      e: 0.0013,
      massOverJupiter: 7.805e-5,
      radiusKm: 2631.2,
      lambda0: 0,
      varpi0: 0,
      color: '#9c8d78',
      inResonance: true,
    },
    {
      name: 'Callisto',
      periodDays: 16.6890184,
      aKm: 1882700,
      e: 0.0074,
      massOverJupiter: 5.667e-5,
      radiusKm: 2410.3,
      lambda0: 90,
      varpi0: 0,
      color: '#6f6152',
    },
  ],
  /** Published behaviour of the Laplace argument, for the validation suite. */
  published: {
    laplaceCentreDeg: 180,
    laplaceAmplitudeDeg: 0.064,
    laplacePeriodDays: 2071,
    ratioEuropaIo: 2.0073,
    ratioGanymedeEuropa: 2.0147,
    ratioGanymedeIo: 4.0441,
    ratioCallistoGanymede: 2.3326,
  },
  /**
   * How far Europa has to be moved for the lock to break, as a multiplier on
   * its semi-major axis. Measured against this engine, not asserted: at 1.001
   * the argument is still ambiguous after 300 Io orbits, at 1.002 it completes
   * a circuit every 234, and at 1.01 every 46.
   */
  detune: 1.01,
};

/**
 * The Galilean system as bodies, in simulation units.
 *
 * Semi-major axes are derived from the published periods rather than from the
 * published distances, because the resonance is a statement about mean motions:
 * n_Io - 3 n_Europa + 2 n_Ganymede = 0 holds in the real system to about one
 * part in ten million, and reproducing it is the whole point. Deriving the
 * axes instead from the published kilometres leaves a residual fifty times the
 * real one, which is a third of the libration frequency and would put the model
 * near the edge of the resonance rather than in it.
 *
 * Io's axis is pinned to its published distance times the scale factor, and the
 * rest follow from the period ratios, so the model is the real system to within
 * the 0.1% the two published quantities disagree by.
 *
 * @param {number} G - Gravitational constant in simulation units
 * @param {{detune?: number, drawScale?: number}} [opts] - `detune` multiplies
 *   Europa's semi-major axis, breaking the resonance; `drawScale` enlarges the
 *   moons' drawn radii, which has no dynamical effect
 * @returns {{primary: Object, bodies: Array<Object>}} Jupiter and its moons
 */
export function galileanBodies(G, opts = {}) {
  const { detune = 1, drawScale = 20 } = opts;
  const jupiterMass = UNITS_PER_SOLAR_MASS / GALILEAN.sunOverJupiter;
  const [io] = GALILEAN.moons;

  const aIo = (io.aKm / KM_PER_AU) * UNITS_PER_AU * GALILEAN.scale;
  const nIo = Math.sqrt(
    (G * (jupiterMass + jupiterMass * io.massOverJupiter)) / aIo ** 3
  );

  const primary = {
    name: 'Jupiter',
    kind: 'star',
    mass: jupiterMass,
    radius:
      (GALILEAN.jupiterRadiusKm / KM_PER_AU) * UNITS_PER_AU * GALILEAN.scale,
    pos: { x: 0, y: 0 },
    vel: { x: 0, y: 0 },
    color: '#c8a97a',
  };

  const bodies = GALILEAN.moons.map(moon => {
    const mass = jupiterMass * moon.massOverJupiter;
    const mu = G * (jupiterMass + mass);
    const n = nIo * (io.periodDays / moon.periodDays);
    const stretch = moon.name === 'Europa' ? detune : 1;
    const a = Math.cbrt(mu / (n * n)) * stretch;
    const state = stateFromElements({
      a,
      e: moon.e,
      varpiDeg: moon.varpi0,
      lambdaDeg: moon.lambda0,
      mu,
    });
    return {
      name: moon.name,
      kind: 'planet',
      mass,
      // Twenty times life size, so a body 1,800 km across is a legible disc
      // beside a planet 71,000 km across. Drawn radius only, and safe: every
      // pair of moons clears the sum of its own two radii by better than a
      // factor of three even with both at their worst apses, which
      // tests/resonance.test.js checks. It is a lie about size in a renderer
      // that already draws Earth ten thousand times too large, and the ratios
      // the lesson measures are untouched by it.
      radius:
        (moon.radiusKm / KM_PER_AU) * UNITS_PER_AU * GALILEAN.scale * drawScale,
      color: moon.color,
      ...state,
    };
  });

  return { primary, bodies, meanMotionIo: nIo, periodIo: (2 * Math.PI) / nIo };
}

// --- Pluto and Neptune --------------------------------------------------------

/**
 * The 3:2 resonance, at true scale.
 *
 * Elements from the NASA planetary fact sheets; the resonance itself from
 * Cohen & Hubbard (1965), who found it, and Williams & Benson (1971) and
 * Malhotra & Williams (1997) for the libration.
 *
 * Two departures from the real system, both stated in the lesson:
 *
 *   Planar.   Pluto's orbit is inclined 17.16 degrees and Gravitas is two
 *             dimensional. The 3:2 argument librates in the planar problem too;
 *             what the projection loses is the Kozai libration of the argument
 *             of perihelion, which is a separate and much slower phenomenon.
 *             It also brings the closest Pluto-Neptune approach down from the
 *             real 17.2 AU to about 16.6.
 *
 *   Pluto's   Set to the exact resonant value, a_N (3/2)^(2/3) = 39.403 AU,
 *   axis      rather than the observed 39.482. The 0.2% difference is taken up
 *             in the real system by the precession of Pluto's perihelion, which
 *             enters the argument and which this model does not reproduce at
 *             the right rate. Starting at the exact commensurability puts the
 *             libration centre where it belongs.
 */
export const PLUTO_NEPTUNE = {
  id: 'pluto-neptune',
  scenario: 'Pluto and Neptune',
  scale: 1,
  source:
    'NASA planetary fact sheets; Cohen & Hubbard (1965) AJ 70, 10; Williams & Benson (1971) AJ 76, 167; Malhotra & Williams (1997), in Pluto and Charon',
  neptune: {
    name: 'Neptune',
    aAU: 30.0699,
    e: 0.00859,
    periodYears: 164.79,
    sunOverMass: 19412,
    radiusKm: 24622,
    lambda0: 0,
    varpi0: 0,
    color: '#4a7fb5',
  },
  pluto: {
    name: 'Pluto',
    // Not used to place it - see the note above - but quoted so the lesson can
    // compare the resonant value with the observed one.
    observedAU: 39.482,
    e: 0.2488,
    periodYears: 247.94,
    massSolar: 6.5512e-9,
    radiusKm: 1188.3,
    inclinationDeg: 17.16,
    varpi0: 0,
    color: '#c9b8a4',
  },
  /**
   * A body on the same kind of orbit that is not in the resonance: four percent
   * further out, which is well outside the 3:2 and enough to make the point
   * within a run a student will sit through.
   */
  rogue: {
    name: 'Unbound Wanderer',
    axisMultiplier: 1.04,
    color: '#8a7f74',
  },
  /** Where the argument sits, and what the model has to reproduce. */
  published: {
    argument: '3*lambda_Pluto - 2*lambda_Neptune - varpi_Pluto',
    centreDeg: 180,
    amplitudeDeg: 82,
    periodYears: 19670,
    minimumSeparationAU: 17.2,
    periodRatio: 1.5046,
  },
  /**
   * Where the argument starts. A hundred degrees is eighty short of the
   * libration centre, and starting at a turning point of the libration - which
   * is what the exact commensurability makes it - gives an amplitude of eighty
   * degrees, the observed one.
   */
  argument0: 100,
};

/**
 * Pluto, Neptune and the Sun as bodies, in simulation units.
 * @param {number} G - Gravitational constant
 * @param {{withRogue?: boolean}} [opts] - Include the non-resonant comparison
 * @returns {{primary: Object, bodies: Array<Object>}} The Sun and the rest
 */
export function plutoBodies(G, opts = {}) {
  const { withRogue = true } = opts;
  const S = PLUTO_NEPTUNE;
  const sunMass = UNITS_PER_SOLAR_MASS;
  const neptuneMass = UNITS_PER_SOLAR_MASS / S.neptune.sunOverMass;
  const plutoMass = UNITS_PER_SOLAR_MASS * S.pluto.massSolar;

  const aN = S.neptune.aAU * UNITS_PER_AU;
  const aP = aN * Math.pow(1.5, 2 / 3);

  // Schematic radii, as everywhere in Gravitas: at thirty AU across, a body
  // drawn to scale is a hundredth of a pixel. These are sized so each is a
  // legible disc at the scenario's zoom, and the closest approach in the
  // scenario - Pluto to Neptune, 1,656 length units - is sixteen times the
  // largest pair of them, so nothing here can touch anything.
  const primary = {
    name: 'Sun',
    kind: 'star',
    mass: sunMass,
    radius: 110,
    pos: { x: 0, y: 0 },
    vel: { x: 0, y: 0 },
    color: '#FFD86B',
  };

  const make = (spec, a, e, lambdaDeg, mass, radius) => ({
    name: spec.name,
    kind: 'planet',
    mass,
    radius,
    color: spec.color,
    ...stateFromElements({
      a,
      e,
      varpiDeg: spec.varpi0 ?? 0,
      lambdaDeg,
      mu: G * (sunMass + mass),
    }),
  });

  const bodies = [
    make(S.neptune, aN, S.neptune.e, S.neptune.lambda0, neptuneMass, 60),
    // phi = 3 lam_P - 2 lam_N - varpi_P, and with lam_N and varpi_P both zero
    // that is 3 lam_P, so the starting argument fixes the starting longitude.
    make(S.pluto, aP, S.pluto.e, S.argument0 / 3, plutoMass, 5),
  ];

  if (withRogue) {
    bodies.push(
      make(
        { ...S.rogue, varpi0: 0 },
        aP * S.rogue.axisMultiplier,
        S.pluto.e,
        S.argument0 / 3,
        plutoMass,
        40
      )
    );
  }

  return { primary, bodies, semiMajorNeptune: aN, semiMajorPluto: aP };
}

// --- Jupiter's Trojans --------------------------------------------------------

/**
 * The 1:1 co-orbital resonance, at true scale.
 *
 * The triangular points are Lagrange's 1772 result: with the secondary on a
 * circular orbit, a third body at the far vertex of an equilateral triangle
 * feels a net force that is exactly the centripetal one it needs, so it stays
 * there. Gascheau (1843) showed the two triangular points are stable when the
 * primary is more than 24.96 times the secondary; the Sun is 1047 times
 * Jupiter, so they are, and L3 - which is also an equilibrium - is not.
 *
 * The five test bodies are the lesson. Two are real Trojans placed with
 * realistic libration amplitudes, one marks the equilibrium itself, one starts
 * one degree off the unstable equilibrium, and one is on an ordinary orbit ten
 * percent wider and is not co-orbital at all. Their masses are a billionth of a
 * mass unit: enough to exist, far too little to disturb anything.
 */
export const JUPITER_TROJANS = {
  id: 'jupiter-trojans',
  scenario: 'Jupiter Trojans',
  scale: 1,
  source:
    'NASA Jupiter fact sheet; Lagrange (1772); Gascheau (1843); Murray & Dermott, Solar System Dynamics (1999) §3.9',
  jupiter: {
    aAU: 5.2044,
    periodYears: 11.862,
    sunOverMass: 1047.3486,
    radiusKm: 71492,
  },
  /**
   * Angles are measured from Jupiter, in the direction of motion, so +60 is L4
   * (leading) and -60 is L5 (trailing).
   */
  probes: [
    // One body per Lagrange point, and that is a constraint rather than a
    // choice. A tadpole orbit is a very flat loop around its equilibrium - the
    // longitude swings by tens of degrees while the semi-major axis moves by
    // one or two percent - so the loop passes within about five length units of
    // the point it encircles. A second body sitting exactly there would be
    // inside the contact test in js/physics.js handle_rocky_collisions, which
    // separates the pair, exchanges momentum and, above 15 units per second of
    // relative speed, makes debris with Math.random(). That would destroy both
    // the orbit and the reproducibility, so no two of these share a point.
    {
      name: 'L4 probe',
      offsetDeg: 60,
      axisMultiplier: 1,
      role: 'equilibrium',
      color: '#7fe0a8',
    },
    {
      // 617 Patroclus is a real member of the trailing camp, which is the
      // Trojan camp proper; the leading camp is the Greeks. Its libration here
      // is set by the starting offset rather than measured from the object.
      name: 'Patroclus',
      offsetDeg: -88,
      axisMultiplier: 1,
      role: 'tadpole',
      color: '#ffab6b',
    },
    {
      name: 'L3 probe',
      offsetDeg: 179,
      axisMultiplier: 1,
      role: 'unstable',
      color: '#ff7a7a',
    },
    {
      // A quarter again as far out. Not co-orbital, and far enough from
      // Jupiter to stay on its own orbit for the length of the lesson: at 1.20
      // it is scattered onto an eccentric orbit within seventy Jupiter years,
      // at 1.25 its eccentricity after the same run is 0.002.
      //
      // Its period ratio with Jupiter is 1.3975, which is 0.18% from 7:5 -
      // closer to a small-integer ratio than Pluto is to 3:2 - and its resonant
      // angle circulates. That is not a coincidence to be tidied away; it is
      // the lesson.
      name: 'Wide orbit probe',
      offsetDeg: 60,
      axisMultiplier: 1.25,
      role: 'circulating',
      color: '#b9a7ff',
    },
  ],
  published: {
    /** Gascheau's criterion: stable when the mass ratio exceeds this. */
    stabilityMassRatio: 24.9599,
    /** Small-amplitude tadpole period, in Jupiter years. */
    tadpolePeriodOrbits: 12.47,
    /** L3's e-folding time, in Jupiter years. */
    l3EfoldOrbits: 3.19,
  },
  /** The closest any two probes come, in length units. Measured, not asserted. */
  closestProbeApproach: 19.8,
};

/**
 * The Sun, Jupiter and the test bodies, in simulation units.
 *
 * Built in the circular restricted frame rather than as a Sun at rest with a
 * planet round it, because the triangular points are only exact when both
 * massive bodies turn about their common centre at the same rate. Placed the
 * other way, an "exact" L4 body drifts by a degree or so - which looks like
 * physics and is arithmetic.
 *
 * @param {number} G - Gravitational constant
 * @returns {{primary: Object, bodies: Array<Object>}} Sun, Jupiter and probes
 */
export function trojanBodies(G) {
  const S = JUPITER_TROJANS;
  // Four units, against a closest approach of 19.8 between any two probes:
  // a margin of two and a half, checked by the validation suite. It cannot go
  // much higher. The L3 probe leaves its equilibrium into a horseshoe that
  // carries it right past both triangular points at nearly the same distance
  // from the Sun, and twenty units is how close that pass gets however the
  // starting angles are arranged - a measured floor, not a tuned one.
  const PROBE_RADIUS = 4;
  const sunMass = UNITS_PER_SOLAR_MASS;
  const jupiterMass = UNITS_PER_SOLAR_MASS / S.jupiter.sunOverMass;
  const total = sunMass + jupiterMass;
  const a = S.jupiter.aAU * UNITS_PER_AU;
  const n = Math.sqrt((G * total) / a ** 3);

  // Both on the x axis about a barycentre at the origin, turning at rate n.
  const rSun = -(jupiterMass / total) * a;
  const rJup = (sunMass / total) * a;

  const primary = {
    name: 'Sun',
    kind: 'star',
    mass: sunMass,
    radius: 20,
    pos: { x: rSun, y: 0 },
    vel: { x: 0, y: n * rSun },
    color: '#FFD86B',
  };

  const jupiter = {
    name: 'Jupiter',
    kind: 'gasGiant',
    mass: jupiterMass,
    radius: 14,
    pos: { x: rJup, y: 0 },
    vel: { x: 0, y: n * rJup },
    color: '#d8a56b',
  };

  const probes = S.probes.map(p => {
    const th = p.offsetDeg * DEG;
    if (p.axisMultiplier === 1) {
      // On the co-rotating circle: one Sun-Jupiter separation from the Sun, at
      // angle `offsetDeg` from Jupiter, moving with the frame. This is what
      // makes L4 and L5 equilibria rather than merely equidistant.
      const x = rSun + a * Math.cos(th);
      const y = a * Math.sin(th);
      return {
        name: p.name,
        kind: 'planet',
        role: p.role,
        mass: 1e-9,
        radius: PROBE_RADIUS,
        color: p.color,
        pos: { x, y },
        vel: { x: -n * y, y: n * x },
      };
    }
    // An ordinary circular orbit of a different radius: Keplerian speed, not
    // the frame's, because this body is not co-orbital and must not be given
    // the velocity of something that is.
    const r = a * p.axisMultiplier;
    const v = Math.sqrt((G * total) / r);
    return {
      name: p.name,
      kind: 'planet',
      role: p.role,
      mass: 1e-9,
      radius: PROBE_RADIUS,
      color: p.color,
      pos: { x: r * Math.cos(th), y: r * Math.sin(th) },
      vel: { x: -v * Math.sin(th), y: v * Math.cos(th) },
    };
  });

  return {
    primary,
    bodies: [jupiter, ...probes],
    secondary: jupiter,
    semiMajor: a,
    period: (2 * Math.PI) / n,
    massRatio: jupiterMass / total,
  };
}

// --- Shared arithmetic --------------------------------------------------------

/**
 * Position and velocity from classical elements, in the orbit plane.
 *
 * Kepler's equation by Newton-Raphson, which converges in a handful of
 * iterations for every eccentricity used here - Pluto's 0.249 is the largest -
 * and is given a generous cap rather than a clever starting guess because this
 * runs once per body at scenario load.
 *
 * @param {{a:number, e:number, varpiDeg:number, lambdaDeg:number, mu:number}} el
 * @returns {{pos:{x:number,y:number}, vel:{x:number,y:number}}} State vector
 */
export function stateFromElements({ a, e, varpiDeg, lambdaDeg, mu }) {
  const varpi = varpiDeg * DEG;
  const M = (lambdaDeg - varpiDeg) * DEG;

  let E = M;
  for (let i = 0; i < 100; i++) {
    const step = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= step;
    if (Math.abs(step) < 1e-14) break;
  }

  const f =
    2 *
    Math.atan2(
      Math.sqrt(1 + e) * Math.sin(E / 2),
      Math.sqrt(1 - e) * Math.cos(E / 2)
    );
  const r = a * (1 - e * Math.cos(E));
  const theta = varpi + f;
  const h = Math.sqrt(mu * a * (1 - e * e));
  const radial = (mu / h) * e * Math.sin(f);
  const transverse = h / r;

  return {
    pos: { x: r * Math.cos(theta), y: r * Math.sin(theta) },
    vel: {
      x: radial * Math.cos(theta) - transverse * Math.sin(theta),
      y: radial * Math.sin(theta) + transverse * Math.cos(theta),
    },
  };
}

/**
 * Shift a set of bodies so their barycentre is at rest at the origin.
 *
 * Not cosmetic: a system whose centre of mass drifts leaves the view, and one
 * whose centre of mass is off-origin makes every angle measured from the origin
 * slightly wrong. The Trojan scenario builds itself balanced already; the other
 * two are balanced here.
 *
 * @param {Array<{mass:number, pos:Object, vel:Object}>} bodies - Mutated
 */
export function balance(bodies) {
  let m = 0;
  let px = 0;
  let py = 0;
  let cx = 0;
  let cy = 0;
  for (const b of bodies) {
    m += b.mass;
    px += b.mass * b.vel.x;
    py += b.mass * b.vel.y;
    cx += b.mass * b.pos.x;
    cy += b.mass * b.pos.y;
  }
  if (!(m > 0)) return;
  for (const b of bodies) {
    b.vel.x -= px / m;
    b.vel.y -= py / m;
    b.pos.x -= cx / m;
    b.pos.y -= cy / m;
  }
}

/**
 * Simulated seconds to days, honouring a scenario's own time scale.
 * @param {number} simSeconds - A duration in simulated seconds
 * @param {number} [timeScale] - Divide by this; SCALE_JOVIAN^1.5 for the moons
 * @returns {number} Days
 */
export const simSecondsToDays = (simSeconds, timeScale = 1) =>
  (simSeconds * DAYS_PER_SIM_SECOND) / timeScale;

/**
 * Simulated seconds to years, honouring a scenario's own time scale.
 * @param {number} simSeconds - A duration in simulated seconds
 * @param {number} [timeScale] - Divide by this
 * @returns {number} Years
 */
export const simSecondsToYears = (simSeconds, timeScale = 1) =>
  simSecondsToDays(simSeconds, timeScale) / 365.25;
