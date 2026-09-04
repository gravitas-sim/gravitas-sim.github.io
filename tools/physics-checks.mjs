// =============================================================================
// The scientific validation suite
// -----------------------------------------------------------------------------
// One registry of checks, consumed by two front ends: `npm run validate:physics`
// (tools/validate-physics.mjs, which prints a table) and jest
// (tests/physicsValidation.test.js, which fails a build). They run the same
// code, so the table a reviewer prints and the suite CI enforces cannot drift
// apart.
//
// What a check is
// -----------------------------------------------------------------------------
// A measured number, an expected number, a tolerance, and - the part that makes
// this a validation suite rather than a set of assertions - a written reason the
// tolerance is what it is. A tolerance with no justification is a number chosen
// to make a test pass, which is the opposite of the exercise.
//
// Four kinds of check, and they are not interchangeable:
//
//   analytic       Closed-form arithmetic against the equation it claims to
//                  implement. Tolerances are at or near machine epsilon,
//                  because there is nothing here for a tolerance to absorb.
//
//   integration    A quantity measured by actually running the N-body
//                  integrator. Tolerances are set by the discretization error
//                  of symplectic Euler at the stated timestep, and every one of
//                  them says which.
//
//   approximation  An educational model that is not the full physics. Validated
//                  against the equation it says it uses, never against reality,
//                  and labeled so nobody mistakes the two.
//
//   data           A stored parameter for a real system, checked against a
//                  published value with its source named.
//
// What this suite does not do
// -----------------------------------------------------------------------------
// It does not test rendering. Nothing here reads a pixel. Every check is a
// deterministic number-in, number-out computation, so a failure names a
// quantity rather than a screenshot.
//
// It also does not check things the model does not claim. Gravitas is Newtonian,
// two-dimensional and non-relativistic; scenarios containing a "Static" black
// hole deliberately break Newton's third law, because a fixed potential well is
// the pedagogical object. Those are recorded in PHYSICS_VALIDATION.md as
// documented departures, not silently omitted.
// =============================================================================

import { installDomShim } from './dom-shim.mjs';

// --- Published reference values ----------------------------------------------
//
// Everything the suite compares against that did not come out of this codebase.
// Each carries its source. Where a value is quoted to two figures in the
// literature, the tolerance on the check that uses it says so.

const REF = {
  // IAU 2015 nominal solar and planetary values, and CODATA 2018 constants.
  // Independent of js/constants.js on purpose: a constants file checked against
  // itself is checked against nothing.
  G: 6.6743e-11, // m^3 kg^-1 s^-2, CODATA 2018
  c: 299792458, // m/s, exact
  solarMassKg: 1.98892e30, // kg, from GM_sun / G
  au: 1.495978707e11, // m, exact by definition (IAU 2012)

  // NASA planetary fact sheets, retrieved values rounded as published.
  earthEscapeKms: 11.186,
  earthOrbitalSpeedKms: 29.78,
  earthSiderealYearDays: 365.256,
  moonEscapeKms: 2.38,
  sunEscapeKms: 617.7,
  jupiterEscapeKms: 59.5,

  // The Sun-Jupiter barycenter lies just outside the solar photosphere.
  // Standard textbook figure, e.g. Murray & Dermott, Solar System Dynamics.
  sunJupiterBarycenterKm: 742000,

  // Schwarzschild radius of one solar mass. Standard quoted value.
  schwarzschildSolarKm: 2.95,
  // Hawking temperature and evaporation lifetime of a solar-mass hole.
  hawkingSolarK: 6.17e-8,
  evaporationSolarYears: 2.1e67,
  // Sagittarius A*, GRAVITY Collaboration (2019), A&A 625, L10.
  sgrAMassSuns: 4.297e6,
  sgrARsMeters: 1.269e10,

  // TRAPPIST-1. Agol et al. (2021) PSJ 2, 1; Gillon et al. (2017) Nature 542,
  // 456; Ducrot et al. (2020) A&A 640, A112.
  trappist1MassSuns: 0.0898,
  trappist1RadiusSuns: 0.1192,
  trappist1LuminositySuns: 5.53e-4,
  trappist1TeffK: 2566,
  // Conservative (runaway greenhouse to maximum greenhouse) habitable zone,
  // Gillon et al. (2017), consistent with the Kopparapu prescription.
  trappist1HzInnerAU: 0.024,
  trappist1HzOuterAU: 0.049,

  // HD 209458. Torres, Winn & Holman (2008) ApJ 677, 1324; Naef et al. (2004)
  // A&A 414, 351 for the semi-amplitude.
  hd209458DepthPercent: 1.5,
  hd209458SemiAmplitudeMs: 84,

  // The Sun as seen from outside, for the RV and astrometry contrast cases.
  // The reflex signal Jupiter imposes on the Sun.
  sunJupiterSemiAmplitudeMs: 12.5,
  sunJupiterSignatureAt10pcMicroarcsec: 497,

  // Kopparapu et al. (2013) ApJ 765, 131 with the 2014 erratum (ApJ 787, L29).
  // Conservative habitable zone of the Sun for a 1 Earth-mass planet, as the
  // prescription is usually quoted.
  sunHzInnerAU: 0.99,
  sunHzOuterAU: 1.7,

  // Earth's insolation, the solar constant. IPCC / TSIS-1.
  solarConstantWm2: 1361,

  // Orbital resonance. Galilean elements from JPL Solar System Dynamics; the
  // Laplace libration from Lieske (1998) A&AS 129, 205 and Musotto et al.
  // (2002) Icarus 159, 500. Pluto from Cohen & Hubbard (1965) AJ 70, 10 and
  // Williams & Benson (1971) AJ 76, 167. The Trojan figures are the linearised
  // restricted three-body results, Murray & Dermott chapter 3.
  laplacePeriodDays: 2071,
  laplaceCentreDeg: 180,
  plutoLibrationYears: 19670,
  plutoLibrationAmplitudeDeg: 82,
  plutoCentreDeg: 180,
  plutoNeptuneMinimumAU: 17.2,
  plutoNeptunePeriodRatio: 1.5046,
  tadpolePeriodJupiterYears: 12.47,
  ganymedeCallistoRatio: 2.3326,
};

// --- Small helpers ------------------------------------------------------------

const relError = (measured, expected) =>
  expected === 0
    ? Math.abs(measured)
    : Math.abs(measured - expected) / Math.abs(expected);

/**
 * Build one check record and score it.
 *
 * @param {object} spec - The check
 * @returns {object} The check with `error` and `pass` filled in
 */
function score(spec) {
  const { measured, expected, tolerance, toleranceKind = 'relative' } = spec;

  // Anything that is not a number is compared exactly: booleans for claims like
  // "this orbit is bound", strings for claims like "e, f and g are the planets
  // in the zone". A tolerance on either would be meaningless.
  if (typeof expected !== 'number') {
    const pass = measured === expected;
    return { ...spec, toleranceKind: 'exact', error: pass ? 0 : 1, pass };
  }
  if (!Number.isFinite(measured)) {
    return {
      ...spec,
      error: Infinity,
      pass: false,
      note: 'measured value is not finite',
    };
  }
  // A one-sided claim: the measured value has to stay under a limit, and being
  // well under it is the point rather than a near miss. Written as its own kind
  // because scoring it as a relative error against the limit would fail exactly
  // the cases it is meant to pass.
  if (toleranceKind === 'bound') {
    const over = measured - expected;
    return {
      ...spec,
      toleranceKind,
      error: over > 0 ? over : 0,
      pass: measured <= expected + (tolerance || 0),
    };
  }
  const error =
    toleranceKind === 'absolute'
      ? Math.abs(measured - expected)
      : relError(measured, expected);
  return { ...spec, toleranceKind, error, pass: error <= tolerance };
}

// --- The N-body test harness --------------------------------------------------
//
// Drives the real engine. Nothing here reimplements gravity: every integrated
// check goes through js/physics.js's own updatePhysics, which is the function
// the application calls sixty times a second.

const BODY_LISTS = [
  'bh_list',
  'planets',
  'stars',
  'gas_giants',
  'asteroids',
  'comets',
  'debris',
  'particles',
  'neutron_stars',
  'white_dwarfs',
  'galaxies',
  'accretion_disk_particles',
];

/**
 * Settings that make the engine a clean laboratory: pure Newtonian mutual
 * gravity, no softening at the scales used here, no mergers, no halo, no
 * inspiral damping, and the direct N^2 solver rather than the Barnes-Hut
 * worker (which is approximate by construction and cannot run without a
 * Worker implementation).
 */
const LAB_SETTINGS = {
  gravitational_constant: 1,
  mutual_gravity: true,
  star_only_gravity: false,
  enable_star_merging: false,
  dynamic_object_properties: false,
  use_barnes_hut: false,
  bh_behavior: 'Orbiting',
  orbit_decay_rate: 0,
  dark_matter_halo: false,
  max_timestep: 0,
  // Far below every separation used in these checks, so the softening floor
  // never touches the force law. A check that silently ran inside the floor
  // would be validating a different equation from the one it names.
  min_interaction_distance: 1e-6,
};

/**
 * A disposable world backed by the real engine.
 * @param {object} P - The js/physics.js module namespace
 * @returns {object} reset / commit / step
 */
function makeLab(P) {
  return {
    reset(overrides = {}) {
      for (const key of BODY_LISTS) {
        if (Array.isArray(P[key])) P[key].length = 0;
      }
      P.resetPhysicsObjectCounter();
      P.updatePhysicsSettings({ ...LAB_SETTINGS, ...overrides });
      P.setStateReference({
        frame_count: 0,
        zoom: 1,
        pan: { x: 0, y: 0 },
        paused: false,
      });
      P.bumpWorldGeneration();
    },
    /** Tell the engine the object lists changed. */
    commit() {
      P.bumpWorldGeneration();
    },
    step(dt, steps, onStep) {
      for (let i = 0; i < steps; i++) {
        P.updatePhysics(dt);
        if (onStep) onStep(i);
      }
    },
  };
}

/**
 * A near-massless tracer that the engine will not throw away.
 *
 * Not an Asteroid, which is what this originally used. The engine culls
 * asteroids, comets and debris once they leave a box about five canvas widths
 * across, on the reasonable grounds that a sandbox should not integrate
 * fragments nobody will ever see again. A validation check does not want that:
 * the 0.98 v_esc orbit below has an apoapsis at 2425 units, well outside the
 * cull box, and with an Asteroid it froze at the boundary and reported an
 * apoapsis of 2033 - the same wrong answer at every timestep, which is exactly
 * what a discretization error does not look like. A Planet marked persistent
 * survives the cull, so the check measures the orbit rather than the housekeeping.
 *
 * @param {object} P - The physics module namespace
 * @param {{x: number, y: number}} pos - Initial position
 * @param {{x: number, y: number}} vel - Initial velocity
 * @returns {object} The tracer
 */
function makeTracer(P, pos, vel) {
  const t = new P.Planet({ ...pos }, { ...vel }, 1);
  // Small enough that it cannot move the primary at the precision these checks
  // work to, but not zero: a zero mass would drop out of the barycenter.
  t.mass = 1e-9;
  t.radius = 0.1;
  t.persistent = true;
  return t;
}

/** A massive point that will not be destroyed or reshaped by the engine. */
function makeStar(P, pos, vel, massUnits) {
  const s = new P.StarObject({ ...pos }, { ...vel }, massUnits / 1000);
  s.mass = massUnits;
  s.radius = 0.5;
  s.intact = true;
  s.persistent = true;
  return s;
}

const hypot = (x, y) => Math.hypot(x, y);

/** Total linear momentum of a set of bodies. */
const momentum = bodies => ({
  x: bodies.reduce((s, b) => s + b.mass * b.vel.x, 0),
  y: bodies.reduce((s, b) => s + b.mass * b.vel.y, 0),
});

/** Centre of mass of a set of bodies. */
const centreOf = bodies => {
  let m = 0;
  let x = 0;
  let y = 0;
  for (const b of bodies) {
    m += b.mass;
    x += b.mass * b.pos.x;
    y += b.mass * b.pos.y;
  }
  return m > 0 ? { x: x / m, y: y / m } : { x: 0, y: 0 };
};

/** Angular momentum about a point. */
const angularMomentum = (bodies, about = { x: 0, y: 0 }) =>
  bodies.reduce(
    (s, b) =>
      s +
      b.mass * ((b.pos.x - about.x) * b.vel.y - (b.pos.y - about.y) * b.vel.x),
    0
  );

/** Total energy of a set of mutually attracting bodies, simulation units. */
function totalEnergy(bodies, G) {
  let E = 0;
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    E += 0.5 * b.mass * (b.vel.x ** 2 + b.vel.y ** 2);
    for (let j = i + 1; j < bodies.length; j++) {
      const o = bodies[j];
      E -= (G * b.mass * o.mass) / hypot(b.pos.x - o.pos.x, b.pos.y - o.pos.y);
    }
  }
  return E;
}

// =============================================================================
// The checks
// =============================================================================

/**
 * Build and run every check.
 *
 * @returns {Promise<Array<object>>} Scored check records, in group order
 */
export async function runChecks() {
  installDomShim();

  const [
    constants,
    physics,
    units,
    orbital,
    darkMatter,
    habitability,
    observables,
    blackHole,
    observer,
    frames,
    energyWidgets,
    binaryWidgets,
    transitWidgets,
    trappist,
    exoSystems,
    dmWidgets,
    chaos,
    resonance,
    systems,
  ] = await Promise.all([
    import('../js/constants.js'),
    import('../js/physics.js'),
    import('../js/units.js'),
    import('../js/orbital.js'),
    import('../js/darkMatter.js'),
    import('../js/habitability.js'),
    import('../js/exoplanetObservables.js'),
    import('../js/blackHolePhysics.js'),
    import('../js/observerGeometry.js'),
    import('../js/referenceFrame.js'),
    import('../js/energyWidgets.js'),
    import('../js/binaryWidgets.js'),
    import('../js/transitWidgets.js'),
    import('../js/data/trappist1.js'),
    import('../js/data/exoplanetSystems.js'),
    import('../js/darkMatterWidgets.js'),
    import('../js/chaos/divergence.js'),
    import('../js/resonance/elements.js'),
    import('../js/resonance/systems.js'),
  ]);

  const out = [];
  const add = spec => out.push(score(spec));
  const lab = makeLab(physics);

  // ===========================================================================
  // 1. Unit system
  // ---------------------------------------------------------------------------
  // Everything downstream inherits these three anchors, so they are checked
  // first and against the outside world rather than against each other.
  // ===========================================================================
  {
    const G = 1;
    const secondsPerUnit = units.timeUnitSeconds();
    // A body on a circular orbit at 100 units (= 1 AU) about 1000 units
    // (= 1 solar mass) must take one year. Nothing in the code asserts this;
    // it falls out of the mass, length and time anchors being mutually
    // consistent, which is exactly why it is worth measuring.
    const periodUnits = 2 * Math.PI * Math.sqrt(100 ** 3 / (G * 1000));
    const periodDays = (periodUnits * secondsPerUnit) / 86400;

    add({
      group: 'Unit system',
      kind: 'analytic',
      name: 'One AU about one solar mass takes one year',
      measured: periodDays,
      expected: REF.earthSiderealYearDays,
      unit: 'days',
      tolerance: 2e-3,
      why: 'Pure arithmetic over the unit anchors, so the only error is in the constants themselves. G and the solar mass are known to five figures; 0.2% is a loose bound on their combined effect and would still catch any scale mistake, which are all factors of 10 or more.',
      source: 'IAU 2015 nominal values',
    });

    const earthSpeedKms =
      (Math.sqrt((G * 1000) / 100) * units.velocityUnitToMs()) / 1000;
    add({
      group: 'Unit system',
      kind: 'analytic',
      name: "Earth's circular speed at 1 AU",
      measured: earthSpeedKms,
      expected: REF.earthOrbitalSpeedKms,
      unit: 'km/s',
      tolerance: 2e-3,
      why: "Same anchors as above, read out through velocityUnitToMs(). The published 29.78 km/s is Earth's mean orbital speed on a slightly eccentric orbit; 0.2% covers that difference.",
      source: 'NASA Earth fact sheet',
    });

    add({
      group: 'Unit system',
      kind: 'analytic',
      name: 'Solar mass anchor',
      measured: physics.SOLAR_MASS_UNIT,
      expected: 1000,
      unit: 'units',
      tolerance: 0,
      why: 'The anchor is a definition, so it is checked exactly. Every other mass unit is derived from it.',
    });

    add({
      group: 'Unit system',
      kind: 'analytic',
      name: 'Earth mass unit is the solar mass over the measured mass ratio',
      measured: physics.EARTH_MASS_UNIT * constants.EARTH_MASSES_PER_SOLAR_MASS,
      expected: physics.SOLAR_MASS_UNIT,
      unit: 'units',
      tolerance: 1e-12,
      why: 'A derived constant must reproduce its own definition to machine precision. This constant was a literal 3 - a factor of 1000 too heavy - and nothing caught it, because the inspector divided by the same wrong number to print the mass back.',
    });

    add({
      group: 'Unit system',
      kind: 'analytic',
      name: 'Jupiter mass unit is the solar mass over the measured mass ratio',
      measured:
        physics.JUPITER_MASS_UNIT * constants.JUPITER_MASSES_PER_SOLAR_MASS,
      expected: physics.SOLAR_MASS_UNIT,
      unit: 'units',
      tolerance: 1e-12,
      why: 'As above. This one sat at 50 rather than 0.955 for a long time, a factor of 52.',
    });

    add({
      group: 'Unit system',
      kind: 'analytic',
      name: 'One AU is 100 simulation length units',
      measured: units.auToSim(1),
      expected: 100,
      unit: 'units',
      tolerance: 0,
      why: 'A definition, checked exactly. The habitable-zone renderer once carried a private copy of this set to 160.',
    });
  }

  // ===========================================================================
  // 2. Circular two-body orbit, integrated
  // ===========================================================================
  {
    const G = 1;
    const M = 1000; // one solar mass
    const m = 0.003; // roughly one Earth mass
    const r = 100; // one AU
    const dt = 0.1; // the application's own DT

    lab.reset();
    const star = makeStar(physics, { x: 0, y: 0 }, { x: 0, y: 0 }, M);
    const planet = new physics.Planet({ x: r, y: 0 }, { x: 0, y: 0 }, 1);
    planet.mass = m;
    planet.radius = 1;
    // Circular about the barycenter of the pair, not about the star: with a
    // finite secondary the star moves too, and an initial condition that
    // ignored that would start the orbit slightly eccentric.
    const vRel = Math.sqrt((G * (M + m)) / r);
    star.vel.y = (-vRel * m) / (M + m);
    planet.vel.y = (vRel * M) / (M + m);
    // Put the pair's barycenter at rest at the origin.
    const bx = (star.pos.x * M + planet.pos.x * m) / (M + m);
    star.pos.x -= bx;
    planet.pos.x -= bx;

    physics.stars.push(star);
    physics.planets.push(planet);
    lab.commit();

    const analyticPeriod = 2 * Math.PI * Math.sqrt(r ** 3 / (G * (M + m)));
    const orbits = 20;
    const steps = Math.round((orbits * analyticPeriod) / dt);

    const timer = orbital.createPeriodTimer();
    let minR = Infinity;
    let maxR = -Infinity;
    let t = 0;
    let maxBary = 0;
    lab.step(dt, steps, () => {
      t += dt;
      const sep = hypot(planet.pos.x - star.pos.x, planet.pos.y - star.pos.y);
      minR = Math.min(minR, sep);
      maxR = Math.max(maxR, sep);
      timer.sample(sep, t);
      maxBary = Math.max(
        maxBary,
        hypot(
          (star.pos.x * M + planet.pos.x * m) / (M + m),
          (star.pos.y * M + planet.pos.y * m) / (M + m)
        )
      );
    });

    add({
      group: 'Circular two-body orbit',
      kind: 'integration',
      name: 'Radial excursion equals the predicted discretization error',
      measured: (maxR - minR) / r,
      // Symplectic Euler drifts the position with the post-kick velocity, so a
      // circular orbit's radius wobbles by exactly one drift step: v*dt/r,
      // which is 2*pi*dt/P.
      expected: (2 * Math.PI * dt) / analyticPeriod,
      unit: 'fractional range',
      tolerance: 1e-2,
      why: 'Not "the radius is roughly constant" but "the radius wobbles by exactly the amount the scheme predicts". Symplectic Euler drifts with the post-kick velocity, so the radius oscillates by one drift step, v*dt/r = 2*pi*dt/P = 3.16e-3 here. Measuring against that rather than against zero turns a loose bound into a statement about the integrator, and it is why this check would fail if the scheme were quietly changed. The error is bounded, not accumulating: 20 orbits and 200 give the same figure.',
    });

    add({
      group: 'Circular two-body orbit',
      kind: 'integration',
      name: 'Measured period matches 2*pi*sqrt(a^3/mu)',
      measured: timer.mean(),
      expected: analyticPeriod,
      unit: 'time units',
      tolerance: 2e-3,
      why: 'Periapsis timing has a resolution of one timestep, dt/P = 5e-4, and symplectic Euler shifts the mean motion by O(dt^2/P^2). 0.2% is a few times the timing resolution and would not hide a wrong mu.',
    });

    add({
      group: 'Circular two-body orbit',
      kind: 'integration',
      name: 'Number of periapsis passages timed',
      measured: timer.count(),
      expected: orbits - 1,
      unit: 'orbits',
      tolerance: 1,
      toleranceKind: 'absolute',
      why: 'The timer needs one passage to start its clock, so it closes one fewer period than the number of orbits run. Allowing +/-1 covers the phase the run happens to end on.',
    });

    add({
      group: 'Circular two-body orbit',
      kind: 'integration',
      name: 'Barycenter of an isolated pair stays put',
      measured: maxBary / r,
      expected: 0,
      unit: 'fraction of separation',
      tolerance: 1e-12,
      toleranceKind: 'absolute',
      why: 'With no external force and equal-and-opposite internal ones, the barycenter of an isolated pair started at rest cannot move at all. This is exact arithmetic, not an approximation, so the tolerance is floating-point round-off. Before the integrator was changed to compute all accelerations before moving anything, this failed outright.',
    });

    const elements = orbital.orbitalElements(planet, star, G);
    add({
      group: 'Circular two-body orbit',
      kind: 'integration',
      name: 'Recovered eccentricity of a circular orbit',
      measured: elements.e,
      expected: 0,
      unit: '',
      tolerance: 3e-3,
      toleranceKind: 'absolute',
      why: 'The same spurious eccentricity the radius check measures, read out through the orbital-elements solver instead of by watching the separation. Two independent routes to the same number.',
    });

    add({
      group: 'Circular two-body orbit',
      kind: 'integration',
      name: 'Orbit is still bound after 20 orbits',
      measured: elements.bound,
      expected: true,
      why: 'Specific orbital energy must stay negative. A sign flip here is the failure mode that used to send TRAPPIST-1 planets out of the system.',
    });
  }

  // ===========================================================================
  // 3. Eccentric Kepler orbit
  // ===========================================================================
  {
    const G = 1;
    const M = 1000;
    const a = 150;
    const e = 0.6;
    // Finer than the application's own 0.1, because periapsis is fast on an
    // eccentric orbit and a fixed step resolves the turn worst exactly there.
    const dt = 0.05;

    lab.reset({ min_interaction_distance: 1e-6 });
    const star = makeStar(physics, { x: 0, y: 0 }, { x: 0, y: 0 }, M);
    // Start at apoapsis, where the motion is slowest and the initial condition
    // is least sensitive to the timestep.
    const rApo = a * (1 + e);
    const vApo = Math.sqrt(((G * M) / a) * ((1 - e) / (1 + e)));
    // A test particle: it must not move the star.
    const body = makeTracer(physics, { x: rApo, y: 0 }, { x: 0, y: vApo });
    physics.stars.push(star);
    physics.planets.push(body);
    lab.commit();

    const analyticPeriod = 2 * Math.PI * Math.sqrt(a ** 3 / (G * M));
    const orbits = 8;
    const steps = Math.round((orbits * analyticPeriod) / dt);

    const timer = orbital.createPeriodTimer();
    let minR = Infinity;
    let maxR = -Infinity;
    let t = 0;
    // Kepler's second law: the rate at which the radius vector sweeps area is
    // the specific angular momentum over two, and it must not change.
    let minSweep = Infinity;
    let maxSweep = -Infinity;
    let prev = { x: body.pos.x, y: body.pos.y };

    lab.step(dt, steps, () => {
      t += dt;
      const rx = body.pos.x - star.pos.x;
      const ry = body.pos.y - star.pos.y;
      const sep = hypot(rx, ry);
      minR = Math.min(minR, sep);
      maxR = Math.max(maxR, sep);
      timer.sample(sep, t);
      // Triangle swept since the previous sample, per unit time.
      const sweep =
        Math.abs(prev.x * body.pos.y - prev.y * body.pos.x) / (2 * dt);
      minSweep = Math.min(minSweep, sweep);
      maxSweep = Math.max(maxSweep, sweep);
      prev = { x: body.pos.x, y: body.pos.y };
    });

    add({
      group: 'Eccentric Kepler orbit',
      kind: 'integration',
      name: 'Apoapsis distance a(1+e)',
      measured: maxR,
      expected: a * (1 + e),
      unit: 'units',
      tolerance: 2e-3,
      why: 'The run starts at apoapsis, so this is the turning point the integrator has to return to. Symplectic Euler at dt = 0.05 against a 365-unit period gives a radial error near 1e-4 at the turning point; 0.2% is a generous multiple of that and would still catch a wrong semi-major axis.',
    });

    add({
      group: 'Eccentric Kepler orbit',
      kind: 'integration',
      name: 'Periapsis distance a(1-e)',
      measured: minR,
      expected: a * (1 - e),
      unit: 'units',
      tolerance: 6e-3,
      why: 'Looser than apoapsis, and necessarily so: periapsis is where the body moves fastest and where a fixed timestep resolves the turn worst. The sampled minimum can also fall either side of the true one by up to half a step. 0.6% at e = 0.6 is the expected size of both effects together at dt = 0.05.',
    });

    add({
      group: 'Eccentric Kepler orbit',
      kind: 'integration',
      name: "Kepler's second law: areal sweep rate is constant",
      measured: (maxSweep - minSweep) / ((maxSweep + minSweep) / 2),
      expected: 0,
      unit: 'fractional range',
      tolerance: 2e-2,
      toleranceKind: 'absolute',
      why: 'Angular momentum is conserved exactly by the force law, but the areal rate is measured here from finite chords, and a chord under-measures the swept area by O((v dt / r)^2). At periapsis on an e = 0.6 orbit that geometric term is about 1%. The check is that the rate does not vary by more than the chord error, which is what distinguishes it from a real torque.',
    });

    add({
      group: 'Eccentric Kepler orbit',
      kind: 'integration',
      name: 'Measured period matches the analytic period',
      measured: timer.mean(),
      expected: analyticPeriod,
      unit: 'time units',
      tolerance: 3e-3,
      why: 'Periapsis timing resolution is dt/P = 1.4e-4 here; the rest is the first-order shift in mean motion at e = 0.6, which is larger than for a circle because the error accumulates unevenly around the orbit.',
    });

    // Kepler's third law, measured rather than assumed: run the same primary at
    // four different radii and fit the slope of log P against log a.
    const radii = [60, 100, 160, 260];
    const logA = [];
    const logP = [];
    for (const rr of radii) {
      lab.reset({ min_interaction_distance: 1e-6 });
      const s = makeStar(physics, { x: 0, y: 0 }, { x: 0, y: 0 }, M);
      const p = makeTracer(
        physics,
        { x: rr, y: 0 },
        { x: 0, y: Math.sqrt((G * M) / rr) }
      );
      physics.stars.push(s);
      physics.planets.push(p);
      lab.commit();

      const per = 2 * Math.PI * Math.sqrt(rr ** 3 / (G * M));
      const tm = orbital.createPeriodTimer();
      let tt = 0;
      const fitDt = 0.1;
      const n = Math.round((6 * per) / fitDt);
      lab.step(fitDt, n, () => {
        tt += fitDt;
        tm.sample(hypot(p.pos.x - s.pos.x, p.pos.y - s.pos.y), tt);
      });
      logA.push(Math.log(rr));
      logP.push(Math.log(tm.mean()));
    }
    const meanA = logA.reduce((x, y) => x + y, 0) / logA.length;
    const meanP = logP.reduce((x, y) => x + y, 0) / logP.length;
    let num = 0;
    let den = 0;
    for (let i = 0; i < logA.length; i++) {
      num += (logA[i] - meanA) * (logP[i] - meanP);
      den += (logA[i] - meanA) ** 2;
    }
    add({
      group: 'Eccentric Kepler orbit',
      kind: 'integration',
      name: "Kepler's third law: slope of log P against log a",
      measured: num / den,
      expected: 1.5,
      unit: 'slope',
      tolerance: 2e-3,
      why: 'The number the Kepler investigation asks a student to recover. Measured from four integrated orbits by the same periapsis timer the lesson uses, not from the analytic formula. The residual is the timing resolution at each radius; 0.2% on the slope is well inside what a student could read off a plot and far outside anything a broken force law would produce.',
    });
  }

  // ===========================================================================
  // 4. Conservation laws
  // ===========================================================================
  {
    const G = 1;
    const dt = 0.1;

    // A three-body system with unequal masses and a net drift, so nothing is
    // conserved by symmetry: if momentum comes out constant here it is because
    // the force law pairs correctly, not because the initial condition was
    // chosen kindly.
    lab.reset();
    const drift = { x: 0.7, y: -0.4 };
    const bodies = [
      makeStar(
        physics,
        { x: -120, y: 0 },
        { x: drift.x, y: drift.y - 2.0 },
        1400
      ),
      makeStar(
        physics,
        { x: 180, y: 40 },
        { x: drift.x - 0.3, y: drift.y + 1.6 },
        900
      ),
      makeStar(
        physics,
        { x: 20, y: -220 },
        { x: drift.x + 1.1, y: drift.y + 0.2 },
        500
      ),
    ];
    for (const b of bodies) physics.stars.push(b);
    lab.commit();

    const totalMass = bodies.reduce((s, b) => s + b.mass, 0);
    const p0 = momentum(bodies);
    const com0 = {
      x: bodies.reduce((s, b) => s + b.mass * b.pos.x, 0) / totalMass,
      y: bodies.reduce((s, b) => s + b.mass * b.pos.y, 0) / totalMass,
    };
    const L0 = angularMomentum(bodies, com0);
    const E0 = totalEnergy(bodies, G);
    const pScale = bodies.reduce(
      (s, b) => s + b.mass * hypot(b.vel.x, b.vel.y),
      0
    );

    let maxMomentumError = 0;
    let closestApproach = Infinity;
    const steps = 40000;
    lab.step(dt, steps, () => {
      const p = momentum(bodies);
      maxMomentumError = Math.max(
        maxMomentumError,
        hypot(p.x - p0.x, p.y - p0.y) / pScale
      );
      for (let i2 = 0; i2 < bodies.length; i2++) {
        for (let j2 = i2 + 1; j2 < bodies.length; j2++) {
          closestApproach = Math.min(
            closestApproach,
            hypot(
              bodies[i2].pos.x - bodies[j2].pos.x,
              bodies[i2].pos.y - bodies[j2].pos.y
            )
          );
        }
      }
    });
    void L0;
    void E0;
    void com0;

    add({
      group: 'Conservation laws',
      kind: 'integration',
      name: 'Linear momentum, three unequal masses, 40000 steps',
      measured: maxMomentumError,
      expected: 0,
      unit: 'fraction of total |p|',
      tolerance: 1e-12,
      toleranceKind: 'absolute',
      why: 'Not an approximation: the accelerations are computed pairwise from one snapshot of the positions, so the internal forces sum to zero identically and momentum is conserved to round-off no matter how inaccurate the trajectories are. That is what makes a chaotic three-body run with close encounters the *hardest* available test of the force pairing rather than an unfair one - the orbits here are wrong in detail and the momentum is still exact. The tolerance is floating point, and it is deliberately this tight because a loose one would have hidden a real bug: advancing bodies one at a time broke the pairing and let momentum drift by 1e-3 over this same run.',
    });

    add({
      group: 'Conservation laws',
      kind: 'integration',
      name: 'The three-body run really does have close encounters',
      measured: closestApproach < 30,
      expected: true,
      why: 'A guard on the check above. Momentum conservation is only an interesting test if the configuration actually stresses the solver; if this system quietly settled into three well-separated circles the momentum result would be worth much less. The bodies start 200 to 300 units apart and pass within 30.',
    });
  }

  // Energy and angular momentum, on a configuration where they are meaningful.
  //
  // Deliberately separated from the three-body run above. A chaotic system with
  // close encounters conserves momentum exactly but not energy: a first-order
  // integrator cannot resolve a near-miss, and reporting the resulting error as
  // an energy-conservation failure would be blaming the scheme for the
  // scenario. The claim Gravitas actually makes - and the one its lessons rest
  // on - is that a *resolved* orbit conserves energy without secular drift.
  {
    const G = 1;
    const dt = 0.1;
    const M = 1000;
    const mp = 8; // massive enough that the primary moves measurably
    const a = 180;
    const e = 0.3;

    /**
     * Run an eccentric two-body orbit and report the worst energy and angular
     * momentum excursion seen.
     * @param {number} orbits - How many orbits to integrate
     * @returns {{energy: number, angular: number}} Worst relative errors
     */
    const runFor = orbits => {
      lab.reset();
      const rApo = a * (1 + e);
      const vApo = Math.sqrt(((G * (M + mp)) / a) * ((1 - e) / (1 + e)));
      const primary = makeStar(
        physics,
        { x: (-rApo * mp) / (M + mp), y: 0 },
        { x: 0, y: (-vApo * mp) / (M + mp) },
        M
      );
      const secondary = makeStar(
        physics,
        { x: (rApo * M) / (M + mp), y: 0 },
        { x: 0, y: (vApo * M) / (M + mp) },
        mp
      );
      physics.stars.push(primary, secondary);
      lab.commit();

      const pair = [primary, secondary];
      const total = M + mp;
      const com = () => ({
        x: (primary.pos.x * M + secondary.pos.x * mp) / total,
        y: (primary.pos.y * M + secondary.pos.y * mp) / total,
      });
      const E0b = totalEnergy(pair, G);
      const L0b = angularMomentum(pair, com());
      let worstE = 0;
      let worstL = 0;
      const period = 2 * Math.PI * Math.sqrt(a ** 3 / (G * total));
      // The energy error oscillates once per orbit, and there are ~4800 steps
      // in an orbit at this timestep, so measuring every fifth step still
      // catches the periapsis peak with a thousand samples to spare. Measuring
      // every step doubles the runtime of the whole suite and changes no digit.
      const stride = 5;
      lab.step(dt, Math.round((orbits * period) / dt), i => {
        if (i % stride) return;
        worstE = Math.max(
          worstE,
          Math.abs(totalEnergy(pair, G) - E0b) / Math.abs(E0b)
        );
        worstL = Math.max(
          worstL,
          Math.abs(angularMomentum(pair, com()) - L0b) / Math.abs(L0b)
        );
      });
      return { energy: worstE, angular: worstL };
    };

    const short = runFor(6);
    const long = runFor(60);

    add({
      group: 'Conservation laws',
      kind: 'integration',
      name: 'Total energy error over 60 orbits',
      measured: long.energy,
      expected: 0,
      unit: 'relative',
      tolerance: 5e-3,
      toleranceKind: 'absolute',
      why: "An e = 0.3 two-body orbit at dt = 0.1, which is the application's own timestep. The bound is set by the scheme: symplectic Euler's energy error oscillates with amplitude of order dt/P per unit binding energy, and at periapsis on this orbit that is a few parts in a thousand. 5e-3 is that amplitude, not a number chosen to fit.",
    });

    add({
      group: 'Conservation laws',
      kind: 'integration',
      name: 'Energy error does not grow with run length (6 vs 60 orbits)',
      measured: long.energy / short.energy,
      expected: 1,
      unit: 'ratio of worst errors',
      tolerance: 0.05,
      why: 'The single most important check in this file. A symplectic integrator has a *bounded* energy error: ten times the run length must give the same worst error, not ten times as much. This is the check that failed before the integrator was fixed - the old sequential update lost energy secularly, about 1% of binding energy per orbit, so this ratio came out near 10 and binaries spiralled together on their own. A 5% tolerance distinguishes "bounded" from any accumulation worth the name.',
    });

    add({
      group: 'Conservation laws',
      kind: 'integration',
      name: 'Angular momentum is conserved to machine precision',
      measured: long.angular,
      expected: 0,
      unit: 'relative',
      tolerance: 1e-11,
      toleranceKind: 'absolute',
      why: 'Not an approximation, and worth spelling out because it is easy to assume otherwise. Symplectic Euler kicks with a(x) and then drifts with the new velocity, so over one step the total angular momentum changes by dt * sum_i m_i x_i cross a_i. Pair that sum up and each pair contributes (x_i - x_j) cross F_ij, which vanishes because gravity acts along the line joining the bodies. So the scheme conserves total angular momentum exactly, not to first order, and the measured 9e-14 is floating-point round-off over 60 orbits. This holds only because the accelerations are computed before anything moves: the previous sequential update did not have this property.',
    });
  }

  // Energy error must be first order in the timestep. This is the check that
  // says the tolerances above are physics rather than luck.
  {
    const G = 1;
    const M = 1000;
    const a = 120;
    const e = 0.4;
    const errors = [];
    for (const dt of [0.08, 0.04, 0.02]) {
      lab.reset({ min_interaction_distance: 1e-6 });
      const s = makeStar(physics, { x: 0, y: 0 }, { x: 0, y: 0 }, M);
      const rApo = a * (1 + e);
      const vApo = Math.sqrt(((G * M) / a) * ((1 - e) / (1 + e)));
      const p = makeTracer(physics, { x: rApo, y: 0 }, { x: 0, y: vApo });
      physics.stars.push(s);
      physics.planets.push(p);
      lab.commit();

      const specific = () => {
        const r = hypot(p.pos.x - s.pos.x, p.pos.y - s.pos.y);
        return 0.5 * (p.vel.x ** 2 + p.vel.y ** 2) - (G * M) / r;
      };
      const E0 = specific();
      const per = 2 * Math.PI * Math.sqrt(a ** 3 / (G * M));
      let worst = 0;
      lab.step(dt, Math.round((5 * per) / dt), () => {
        worst = Math.max(worst, Math.abs(specific() - E0) / Math.abs(E0));
      });
      errors.push(worst);
    }
    // Halving the step should halve the error for a first-order method.
    const ratio = (errors[0] / errors[1] + errors[1] / errors[2]) / 2;
    add({
      group: 'Conservation laws',
      kind: 'integration',
      name: 'Energy error halves when the timestep halves',
      measured: ratio,
      expected: 2,
      unit: 'error ratio per halving',
      tolerance: 0.2,
      why: 'The convergence order of the scheme, measured. Symplectic Euler is first order, so the ratio must be 2. Getting this right is what licenses every other integration tolerance in this file to be quoted as "O(dt) at dt = 0.1": if the observed order were wrong, those numbers would be fitted rather than derived. A tolerance of 0.2 on the ratio distinguishes first order (2) from second order (4) with enormous margin.',
    });
  }

  // ===========================================================================
  // Numerical integrators
  // ---------------------------------------------------------------------------
  // Three schemes are selectable, and each one makes a different promise. These
  // checks are what turn those promises into measurements, on physically
  // meaningful problems rather than on cases fitted to the implementations: a
  // bound eccentric Kepler orbit run for whole numbers of periods, which is the
  // problem the application is actually integrating.
  //
  // The promises:
  //
  //   Symplectic Euler   first order, symplectic. Energy error bounded and
  //                      oscillating, not accumulating. The default, and the
  //                      scheme every shipped scenario was tuned against.
  //   Velocity Verlet    second order, symplectic. Same bounded behaviour, with
  //                      a bound smaller by a factor of the timestep.
  //   RK4                fourth order, NOT symplectic. Far more accurate over a
  //                      few orbits, and losing energy steadily over many,
  //                      because nothing holds it to a nearby Hamiltonian. That
  //                      contrast is the reason the setting exists.
  // ===========================================================================
  {
    const G = 1;
    const M = 1000;
    const a = 120;
    const e = 0.4;
    const period = 2 * Math.PI * Math.sqrt(a ** 3 / (G * M));

    /**
     * Integrate one eccentric orbit under a named scheme.
     *
     * The step count is exact rather than rounded, because the whole
     * measurement is a position at a fixed time: rounding the count leaves a
     * fraction of a step of error, which at these speeds is larger than
     * anything the schemes differ by and would make all three look identical.
     *
     * @param {string} scheme - Integrator label
     * @param {number} steps - Steps to take
     * @param {number} T - Physical time to cover
     * @returns {{pos: object, worstEnergy: number, worstAngular: number}} Result
     */
    const integrate = (scheme, steps, T) => {
      lab.reset({ integrator: scheme });
      const s = makeStar(physics, { x: 0, y: 0 }, { x: 0, y: 0 }, M);
      const rApo = a * (1 + e);
      const vApo = Math.sqrt(((G * M) / a) * ((1 - e) / (1 + e)));
      const p = makeTracer(physics, { x: rApo, y: 0 }, { x: 0, y: vApo });
      physics.stars.push(s);
      physics.planets.push(p);
      lab.commit();

      const specific = () => {
        const r = hypot(p.pos.x - s.pos.x, p.pos.y - s.pos.y);
        return 0.5 * (p.vel.x ** 2 + p.vel.y ** 2) - (G * M) / r;
      };
      // The pair's angular momentum about its own centre of mass, which is the
      // quantity that is actually conserved. The tracer's angular momentum
      // about the origin is not: it pulls back on the primary hard enough to
      // move it, and a fixed origin then drifts away from the centre of mass.
      const angular = () => angularMomentum([s, p], centreOf([s, p]));
      const E0 = specific();
      const L0 = angular();
      let worstEnergy = 0;
      let worstAngular = 0;
      const dt = T / steps;
      for (let i = 0; i < steps; i++) {
        physics.updatePhysics(dt);
        worstEnergy = Math.max(
          worstEnergy,
          Math.abs(specific() - E0) / Math.abs(E0)
        );
        worstAngular = Math.max(
          worstAngular,
          Math.abs(angular() - L0) / Math.abs(L0)
        );
      }
      return { pos: { x: p.pos.x, y: p.pos.y }, worstEnergy, worstAngular };
    };

    // The default must be the default. This is the check that would fail if a
    // refactor ever quietly promoted one of the more accurate schemes: the
    // scenarios are laid out against symplectic Euler's particular error and
    // several of them cap their timestep because of it.
    lab.reset();
    add({
      group: 'Numerical integrators',
      kind: 'integration',
      name: 'Symplectic Euler is the default scheme',
      measured: physics.activeIntegrator(),
      expected: 'Symplectic Euler',
      unit: 'scheme',
      why: 'The three schemes give measurably different trajectories, and every shipped scenario was laid out, timed and tuned against this one. Changing the default would change the dynamics of the whole catalog at once, silently, and this is the only place that would notice.',
    });
    add({
      group: 'Numerical integrators',
      kind: 'analytic',
      name: 'An unrecognized scheme falls back to the default',
      measured: (() => {
        lab.reset({ integrator: 'Ludicrous Speed' });
        const got = physics.activeIntegrator();
        lab.reset();
        return got;
      })(),
      expected: 'Symplectic Euler',
      unit: 'scheme',
      why: 'A shared link or a saved scenario naming a scheme that no longer exists has to load into the default rather than into a broken simulation, so the selector resolves anything it does not recognize rather than throwing.',
    });

    // Convergence order, measured as the global position error at a fixed
    // physical time against a reference fine enough to be exact at this
    // precision. Measured at 1.37 periods rather than at a whole number of
    // them: sampled at the same orbital phase, symplectic Euler is conjugate to
    // leapfrog through a half-step shift and reports second order, which is a
    // true statement about that particular sample and not the order of the
    // scheme.
    const T = 1.37 * period;
    const reference = integrate('RK4', 65536, T).pos;
    const orderOf = (scheme, steps) => {
      const errs = steps.map(n => {
        const r = integrate(scheme, n, T).pos;
        return hypot(r.x - reference.x, r.y - reference.y);
      });
      const orders = [];
      for (let i = 0; i < errs.length - 1; i++) {
        orders.push(Math.log2(errs[i] / errs[i + 1]));
      }
      return {
        order: orders.reduce((x, y) => x + y, 0) / orders.length,
        errors: errs,
      };
    };

    const euler = orderOf('Symplectic Euler', [2048, 4096, 8192, 16384]);
    const verlet = orderOf('Velocity Verlet', [2048, 4096, 8192, 16384]);
    // Coarser steps for RK4, and deliberately so: at the step counts the other
    // two need, RK4's error is already down at double-precision round-off and
    // the measured order becomes a measurement of the floating-point noise.
    const rk4 = orderOf('RK4', [512, 1024, 2048, 4096]);

    add({
      group: 'Numerical integrators',
      kind: 'integration',
      name: 'Symplectic Euler converges at first order',
      measured: euler.order,
      expected: 1,
      unit: 'order in dt',
      tolerance: 0.15,
      toleranceKind: 'absolute',
      why: 'Position error against a converged reference, halving the step three times. First order means the error halves with the step, which is a doubling per halving and so an order of 1. The tolerance separates 1 from 2 with a factor of six of margin.',
    });
    add({
      group: 'Numerical integrators',
      kind: 'integration',
      name: 'Velocity Verlet converges at second order',
      measured: verlet.order,
      expected: 2,
      unit: 'order in dt',
      tolerance: 0.15,
      toleranceKind: 'absolute',
      why: 'The same measurement on the same orbit. Second order is the defining property of the scheme, and it is what buys the accuracy in the check below: at a given step Verlet is about a hundred times more accurate than the default here, which is roughly the timestep expressed as a fraction of an orbit.',
    });
    add({
      group: 'Numerical integrators',
      kind: 'integration',
      name: 'RK4 converges at fourth order',
      measured: rk4.order,
      expected: 4,
      unit: 'order in dt',
      tolerance: 0.6,
      toleranceKind: 'absolute',
      why: 'Fourth order, approached from above: on an eccentric orbit the higher terms in the local error are still contributing at the coarse steps this has to be measured at, so the observed order runs a little over 4 and falls toward it as the step shrinks. The tolerance is wide enough for that and nowhere near wide enough to admit a third-order or fifth-order scheme.',
    });

    // Accuracy at a common timestep. The orders above say how each scheme
    // improves; this says what that is worth on the same problem, which is the
    // thing a student changing the setting actually sees.
    const common = 4096;
    const errEuler = hypot(
      integrate('Symplectic Euler', common, T).pos.x - reference.x,
      integrate('Symplectic Euler', common, T).pos.y - reference.y
    );
    const errVerlet = hypot(
      integrate('Velocity Verlet', common, T).pos.x - reference.x,
      integrate('Velocity Verlet', common, T).pos.y - reference.y
    );
    const errRk4 = hypot(
      integrate('RK4', common, T).pos.x - reference.x,
      integrate('RK4', common, T).pos.y - reference.y
    );

    add({
      group: 'Numerical integrators',
      kind: 'integration',
      name: 'Velocity Verlet beats symplectic Euler at the same timestep',
      measured: Math.log10(errEuler / errVerlet),
      expected: 2.4,
      unit: 'orders of magnitude',
      tolerance: 0.5,
      toleranceKind: 'absolute',
      why: 'Two schemes differing only in order have to differ in accuracy by about one power of the number of steps per orbit for each order of difference. At roughly 3000 steps per orbit that is two and a half decades, and measuring it is what shows the two implementations are genuinely different schemes rather than the same loop behind two labels.',
    });
    add({
      group: 'Numerical integrators',
      kind: 'integration',
      name: 'RK4 beats Velocity Verlet at the same timestep',
      measured: Math.log10(errVerlet / errRk4),
      expected: 4.8,
      unit: 'orders of magnitude',
      tolerance: 1.2,
      toleranceKind: 'absolute',
      why: 'The same argument two orders further along, and the reason the tolerance is wider: RK4 at this step is close enough to round-off that the ratio is partly a measurement of the reference. The claim being checked is that the gap is several decades, not that it is exactly this many.',
    });

    // Bounded versus secular. The single most important distinction between the
    // schemes, and the one a numerical-methods investigation is for.
    const orbits = n => {
      // A step small enough that each scheme is well inside its asymptotic
      // regime, and coarse enough for RK4 that its drift is above round-off.
      const runFor = (scheme, count, steps) =>
        integrate(scheme, steps * count, count * period).worstEnergy;
      return runFor(n.scheme, n.count, n.stepsPerOrbit);
    };
    const eulerShort = orbits({
      scheme: 'Symplectic Euler',
      count: 6,
      stepsPerOrbit: 2600,
    });
    const eulerLong = orbits({
      scheme: 'Symplectic Euler',
      count: 60,
      stepsPerOrbit: 2600,
    });
    const verletShort = orbits({
      scheme: 'Velocity Verlet',
      count: 6,
      stepsPerOrbit: 2600,
    });
    const verletLong = orbits({
      scheme: 'Velocity Verlet',
      count: 60,
      stepsPerOrbit: 2600,
    });
    const rkShort = orbits({ scheme: 'RK4', count: 6, stepsPerOrbit: 220 });
    const rkLong = orbits({ scheme: 'RK4', count: 60, stepsPerOrbit: 220 });

    add({
      group: 'Numerical integrators',
      kind: 'integration',
      name: 'Symplectic Euler: energy error is bounded, not secular',
      measured: eulerLong / eulerShort,
      expected: 1,
      unit: 'ratio of worst errors, 60 orbits to 6',
      tolerance: 0.05,
      why: 'The defining property of a symplectic scheme, and the reason the default is a first-order method rather than an embarrassment: its energy error oscillates about a fixed value instead of accumulating, so an orbit left running overnight is still the orbit it started as. Ten times the run length must give the same worst error, not ten times as much.',
    });
    add({
      group: 'Numerical integrators',
      kind: 'integration',
      name: 'Velocity Verlet: energy error is bounded, not secular',
      measured: verletLong / verletShort,
      expected: 1,
      unit: 'ratio of worst errors, 60 orbits to 6',
      tolerance: 0.05,
      why: 'Verlet is symplectic too, so it makes the same promise as the default and keeps it for the same reason. What it buys over the default is the size of the bound, not its existence.',
    });
    add({
      group: 'Numerical integrators',
      kind: 'integration',
      name: 'RK4: energy error accumulates with run length',
      measured: rkLong / rkShort,
      expected: 10,
      unit: 'ratio of worst errors, 60 orbits to 6',
      tolerance: 0.25,
      why: 'The other half of the lesson, and the reason the most accurate scheme in the list is not the default. RK4 is not symplectic: its energy error grows linearly with the number of steps rather than oscillating, so ten times the run gives ten times the error. Over a few orbits it is by far the most accurate of the three; over a few thousand it is the only one that is still getting worse.',
    });
    add({
      group: 'Numerical integrators',
      kind: 'integration',
      name: 'Velocity Verlet conserves angular momentum to round-off',
      measured: integrate('Velocity Verlet', 6000, 2 * period).worstAngular,
      expected: 0,
      unit: 'relative',
      tolerance: 1e-11,
      toleranceKind: 'absolute',
      why: 'Like the default, and for the same reason: every kick is along the line joining the bodies, so the torque on the pair is exactly zero however large the step is. This is not an approximation that gets better as the step shrinks, and a Verlet implementation that got it wrong would have the kick and drift out of order.',
    });
    add({
      group: 'Numerical integrators',
      kind: 'integration',
      name: 'RK4 conserves angular momentum only approximately',
      measured: integrate('RK4', 6000, 2 * period).worstAngular,
      expected: 0,
      unit: 'relative',
      tolerance: 1e-8,
      toleranceKind: 'absolute',
      why: 'The contrast that makes the two checks above mean something. RK4 mixes four stages evaluated at four different positions, so its velocity change is not along any one line joining the bodies and the torque does not cancel exactly. The error is tiny - this is a fourth-order scheme - but it is a truncation error that shrinks with the step rather than a cancellation that holds at any step, which is a different kind of claim and worth being able to point at.',
    });

    lab.reset();
  }

  // Galilean invariance: boost the whole system and the internal motion must be
  // untouched. This tests the integrator's frame handling, not a formula.
  {
    const dt = 0.05;
    const build = boost => {
      lab.reset();
      const a = makeStar(
        physics,
        { x: -80, y: 0 },
        { x: boost.x, y: boost.y - 2.5 },
        1000
      );
      const b = makeStar(
        physics,
        { x: 80, y: 0 },
        { x: boost.x, y: boost.y + 2.5 },
        1000
      );
      physics.stars.push(a, b);
      lab.commit();
      lab.step(dt, 6000);
      return hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y);
    };
    const rest = build({ x: 0, y: 0 });
    const moving = build({ x: 5, y: -3 });
    add({
      group: 'Reference frames',
      kind: 'integration',
      name: 'Galilean invariance: separation after a boost',
      measured: moving,
      expected: rest,
      unit: 'units',
      tolerance: 1e-10,
      why: 'Boosting every body by a constant velocity must leave the relative motion identical, because gravity depends only on separations. The tolerance is round-off: the two runs execute the same arithmetic on numbers that differ by a constant, so they agree to nearly full precision but not bit for bit.',
    });
  }

  // ===========================================================================
  // 5. Binary stars, barycenter and mass ratio
  // ===========================================================================
  {
    const G = 1;
    const dt = 0.05;
    const m1 = 1500;
    const m2 = 500; // a 3:1 mass ratio, so the two distances are visibly unequal
    const sep = 240;

    lab.reset();
    const vRel = Math.sqrt((G * (m1 + m2)) / sep);
    const r1 = (sep * m2) / (m1 + m2);
    const r2 = (sep * m1) / (m1 + m2);
    const A = makeStar(
      physics,
      { x: -r1, y: 0 },
      { x: 0, y: (-vRel * m2) / (m1 + m2) },
      m1
    );
    const B = makeStar(
      physics,
      { x: r2, y: 0 },
      { x: 0, y: (vRel * m1) / (m1 + m2) },
      m2
    );
    physics.stars.push(A, B);
    lab.commit();

    const period = 2 * Math.PI * Math.sqrt(sep ** 3 / (G * (m1 + m2)));
    let sumR1 = 0;
    let sumR2 = 0;
    let n = 0;
    lab.step(dt, Math.round((6 * period) / dt), () => {
      const bary = frames.systemBarycenter([A, B]);
      sumR1 += hypot(A.pos.x - bary.x, A.pos.y - bary.y);
      sumR2 += hypot(B.pos.x - bary.x, B.pos.y - bary.y);
      n++;
    });

    add({
      group: 'Binary stars',
      kind: 'integration',
      name: 'Distances from the barycenter are inversely as the masses',
      measured: sumR2 / sumR1,
      expected: m1 / m2,
      unit: 'r2/r1',
      tolerance: 1e-9,
      why: 'The defining property of a center of mass, and it holds instant by instant regardless of integration error, because both distances are measured from the same computed barycenter. The tolerance is arithmetic round-off over 30000 accumulated samples.',
    });

    add({
      group: 'Binary stars',
      kind: 'integration',
      name: 'Separation is the sum of the two orbital radii',
      measured: (sumR1 + sumR2) / n,
      expected: sep,
      unit: 'units',
      tolerance: 3e-3,
      why: 'A circular binary at dt = 0.05 against a period of 265 units, so the same O(dt/P) spurious eccentricity as the single-planet case. 0.3% is that bound.',
    });

    const facts = binaryWidgets.binaryFacts(1.5, 0.5, 2.4);
    add({
      group: 'Binary stars',
      kind: 'analytic',
      name: "Lesson widget: Kepler's third law in AU, years and solar masses",
      measured: facts.period,
      expected: Math.sqrt(2.4 ** 3 / 2.0),
      unit: 'years',
      tolerance: 1e-12,
      why: 'a^3 = P^2 M is exact in these units by construction; the check is that the widget the "Weighing the Stars" lesson uses implements it and not something else.',
    });

    add({
      group: 'Binary stars',
      kind: 'analytic',
      name: 'Lesson widget: barycenter distances match the mass ratio',
      measured: facts.r1 / facts.r2,
      expected: facts.m2 / facts.m1,
      unit: '',
      tolerance: 1e-12,
      why: 'The relation the lesson asks a student to discover, checked in the instrument that shows it to them.',
    });

    // The Sun and Jupiter, as the archetype: the barycenter is outside the Sun.
    const sunJupiterBaryAU =
      (exoSystems.SUN_JUPITER.planet.semiMajorAU * constants.JUPITER_MASS_KG) /
      (constants.SOLAR_MASS_KG + constants.JUPITER_MASS_KG);
    add({
      group: 'Binary stars',
      kind: 'data',
      name: 'Sun-Jupiter barycenter distance from the solar center',
      measured: (sunJupiterBaryAU * constants.AU_METERS) / 1000,
      expected: REF.sunJupiterBarycenterKm,
      unit: 'km',
      tolerance: 5e-3,
      why: 'Computed from the stored semi-major axis and the two masses. The textbook figure is quoted to two significant figures as 742000 km, so 0.5% is finer than the number it is being compared against.',
      source: 'Murray & Dermott, Solar System Dynamics',
    });
  }

  // ===========================================================================
  // 6. Escape velocity and the bound/unbound boundary
  // ===========================================================================
  {
    const G = 1;
    const M = 1000;
    const r = 100;

    add({
      group: 'Escape and binding',
      kind: 'analytic',
      name: 'Escape speed is sqrt(2) times circular speed',
      measured: Math.sqrt((2 * G * M) / r) / Math.sqrt((G * M) / r),
      expected: Math.SQRT2,
      unit: '',
      tolerance: 1e-15,
      why: 'An identity. Checked at machine precision because there is nothing else it could be.',
    });

    add({
      group: 'Escape and binding',
      kind: 'data',
      name: "Earth's surface escape speed",
      measured: energyWidgets.escapeSpeed(5.972e24, 6.371e6) / 1000,
      expected: REF.earthEscapeKms,
      unit: 'km/s',
      tolerance: 2e-3,
      why: 'The lesson quotes this number to a student, so it has to be the real one. Published to four figures; 0.2% covers the difference between the equatorial radius used here and the mean radius the published figure uses.',
      source: 'NASA Earth fact sheet',
    });

    add({
      group: 'Escape and binding',
      kind: 'data',
      name: "The Sun's surface escape speed",
      measured: energyWidgets.escapeSpeed(1.989e30, 6.957e8) / 1000,
      expected: REF.sunEscapeKms,
      unit: 'km/s',
      tolerance: 2e-3,
      source: 'NASA Sun fact sheet',
      why: "Same reasoning as Earth. The solar mass in kilograms carries G's uncertainty, which is why 0.2% rather than something tighter.",
    });

    add({
      group: 'Escape and binding',
      kind: 'data',
      name: "The Moon's surface escape speed",
      measured: energyWidgets.escapeSpeed(7.346e22, 1.7374e6) / 1000,
      expected: REF.moonEscapeKms,
      unit: 'km/s',
      tolerance: 5e-3,
      source: 'NASA Moon fact sheet',
      why: 'Published to three figures as 2.38 km/s, so 0.5% is finer than the reference.',
    });

    add({
      group: 'Escape and binding',
      kind: 'data',
      name: "Jupiter's surface escape speed",
      measured: energyWidgets.escapeSpeed(1.898e27, 7.1492e7) / 1000,
      expected: REF.jupiterEscapeKms,
      unit: 'km/s',
      tolerance: 5e-3,
      source: 'NASA Jupiter fact sheet',
      why: 'Published to three figures; the radius is the equatorial one, which is what the published escape speed uses.',
    });

    // The boundary itself, through the orbital-elements solver the inspector
    // and the "Bound, Unbound and Escape" lesson both read.
    const at = fraction => {
      const primary = { pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, mass: M };
      const vEsc = Math.sqrt((2 * G * M) / r);
      const body = {
        pos: { x: r, y: 0 },
        vel: { x: 0, y: fraction * vEsc },
        mass: 0,
      };
      return orbital.orbitalElements(body, primary, G);
    };

    add({
      group: 'Escape and binding',
      kind: 'analytic',
      name: 'Specific energy is exactly zero at escape speed',
      measured: at(1).energy,
      expected: 0,
      unit: 'energy units',
      tolerance: 1e-12,
      toleranceKind: 'absolute',
      why: 'v^2/2 = mu/r by definition of the escape speed, so the difference is the round-off of one square root and one division.',
    });

    add({
      group: 'Escape and binding',
      kind: 'analytic',
      name: 'Just below escape speed the orbit is bound',
      measured: at(0.999).bound,
      expected: true,
      why: 'The sign of the specific energy is the whole content of the lesson. A tenth of a percent below escape must still come back.',
    });

    add({
      group: 'Escape and binding',
      kind: 'analytic',
      name: 'Just above escape speed the orbit is unbound',
      measured: at(1.001).bound,
      expected: false,
      why: 'And a tenth of a percent above must not.',
    });

    add({
      group: 'Escape and binding',
      kind: 'analytic',
      name: 'Eccentricity is exactly 1 at escape speed',
      measured: at(1).e,
      expected: 1,
      unit: '',
      tolerance: 1e-9,
      why: 'A parabolic orbit. This is an independent route to the same boundary: the energy check uses the vis-viva relation, this one uses the eccentricity vector, and a mistake in either would break the agreement.',
    });

    // And the boundary as the integrator sees it, which is the version a
    // student actually watches.
    const dt = 0.1; // the application's own timestep
    const runAt = (fraction, bound) => {
      lab.reset({ min_interaction_distance: 1e-6 });
      const s = makeStar(physics, { x: 0, y: 0 }, { x: 0, y: 0 }, M);
      const vEsc = Math.sqrt((2 * G * M) / r);
      const p = makeTracer(
        physics,
        { x: r, y: 0 },
        { x: 0, y: fraction * vEsc }
      );
      physics.stars.push(s);
      physics.planets.push(p);
      lab.commit();
      // Long enough to reach apoapsis and no longer. Launched tangentially at
      // 0.98 v_esc from r = 100 the orbit has a = 1263 and a period of 8914
      // time units, so the turning point is not reached until half of that; a
      // shorter run measures how far the body has got, not how far it goes.
      // An unbound path has no turning point, so it needs only long enough to
      // establish that the separation is still increasing.
      const horizon = bound ? 0.55 * 8914 : 600;
      let maxSep = r;
      lab.step(dt, Math.round(horizon / dt), () => {
        maxSep = Math.max(maxSep, hypot(p.pos.x - s.pos.x, p.pos.y - s.pos.y));
      });
      return { maxSep, final: hypot(p.pos.x - s.pos.x, p.pos.y - s.pos.y) };
    };

    const sub = runAt(0.98, true);
    add({
      group: 'Escape and binding',
      kind: 'integration',
      name: 'At 0.98 v_esc the body turns around',
      measured: sub.maxSep,
      // r_apo = r / (2 - v^2 r / mu) for a radial-ish launch; here the launch is
      // tangential, so a = mu r / (2 mu - v^2 r) and apoapsis = a(1+e).
      expected: (() => {
        const v = 0.98 * Math.sqrt((2 * G * M) / r);
        const energy = (v * v) / 2 - (G * M) / r;
        const aa = -(G * M) / (2 * energy);
        const ee = Math.abs(1 - (r * v * v) / (G * M));
        return aa * (1 + ee);
      })(),
      unit: 'units',
      tolerance: 1e-3,
      why: "A very eccentric bound orbit - e = 0.92, apoapsis 24 times the launch radius - integrated at the application's own dt = 0.1. The measured error is 6e-5 and it falls by a factor of four when the timestep halves, so the turning-point distance converges at second order even though the scheme is first order in energy: the apoapsis depends on the orbit-averaged energy, and symplectic Euler's energy error is oscillatory and largely cancels over a symmetric orbit. 1e-3 is fifteen times the measured error, which leaves room for the periapsis resolution without admitting a wrong semi-major axis.",
    });

    const sup = runAt(1.02, false);
    add({
      group: 'Escape and binding',
      kind: 'integration',
      name: 'At 1.02 v_esc the body never turns around',
      measured: sup.final >= sup.maxSep * 0.999,
      expected: true,
      why: 'On an unbound orbit the separation increases monotonically after launch, so the final separation is the largest one seen. Stated as a monotonicity test rather than a distance, because the distance an unbound body reaches depends only on how long the test runs.',
    });
  }

  // ===========================================================================
  // 7. Reference-frame transformations
  // ===========================================================================
  {
    const bodies = [
      {
        pos: { x: 10, y: 0 },
        vel: { x: 0, y: 3 },
        mass: 300,
        id: 1,
        alive: true,
      },
      {
        pos: { x: -20, y: 40 },
        vel: { x: 1, y: -2 },
        mass: 700,
        id: 2,
        alive: true,
      },
      {
        pos: { x: 5, y: -15 },
        vel: { x: -4, y: 0.5 },
        mass: 200,
        id: 3,
        alive: true,
      },
    ];
    const total = bodies.reduce((s, b) => s + b.mass, 0);
    const bary = frames.systemBarycenter(bodies);

    add({
      group: 'Reference frames',
      kind: 'analytic',
      name: 'Barycenter is the mass-weighted mean position',
      measured: hypot(
        bary.x - bodies.reduce((s, b) => s + b.mass * b.pos.x, 0) / total,
        bary.y - bodies.reduce((s, b) => s + b.mass * b.pos.y, 0) / total
      ),
      expected: 0,
      unit: 'units',
      tolerance: 1e-12,
      toleranceKind: 'absolute',
      why: 'A definition, so the tolerance is round-off. Checked because the renderer and the recorded history must average over the same set: if they disagreed the origin would jump the moment a frame was selected.',
    });

    add({
      group: 'Reference frames',
      kind: 'analytic',
      name: 'Mass-weighted offsets from the barycenter sum to zero',
      measured:
        hypot(
          bodies.reduce((s, b) => s + b.mass * (b.pos.x - bary.x), 0),
          bodies.reduce((s, b) => s + b.mass * (b.pos.y - bary.y), 0)
        ) /
        (total * 40),
      expected: 0,
      unit: 'relative',
      tolerance: 1e-12,
      toleranceKind: 'absolute',
      why: 'The property that makes the barycenter the barycenter, stated the other way round.',
    });

    frames.setFrame(frames.BARYCENTER);
    const originVel = frames.frameOriginVelocity(bodies);
    frames.resetFrame();
    add({
      group: 'Reference frames',
      kind: 'analytic',
      name: 'Barycenter frame velocity is total momentum over total mass',
      measured: hypot(
        originVel.x - bodies.reduce((s, b) => s + b.mass * b.vel.x, 0) / total,
        originVel.y - bodies.reduce((s, b) => s + b.mass * b.vel.y, 0) / total
      ),
      expected: 0,
      unit: 'units per time',
      tolerance: 1e-12,
      toleranceKind: 'absolute',
      why: 'Without this the inspector reports a body moving at 29.8 km/s while the view has it sitting still. Round-off tolerance because it is a definition.',
    });

    // Separations are frame invariants. Transforming into any body's frame must
    // leave every pairwise distance untouched.
    const shifted = bodies.map(b => ({
      x: b.pos.x - bodies[1].pos.x,
      y: b.pos.y - bodies[1].pos.y,
    }));
    let worstPair = 0;
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const before = hypot(
          bodies[i].pos.x - bodies[j].pos.x,
          bodies[i].pos.y - bodies[j].pos.y
        );
        const after = hypot(
          shifted[i].x - shifted[j].x,
          shifted[i].y - shifted[j].y
        );
        worstPair = Math.max(worstPair, Math.abs(before - after) / before);
      }
    }
    add({
      group: 'Reference frames',
      kind: 'analytic',
      name: 'Pairwise separations are unchanged by a frame change',
      measured: worstPair,
      expected: 0,
      unit: 'relative',
      tolerance: 1e-14,
      toleranceKind: 'absolute',
      why: 'A frame change is a translation, and translations preserve distances. The point of checking is that the frame system re-expresses history as well as the present, and a transform applied inconsistently would show up here first.',
    });

    add({
      group: 'Reference frames',
      kind: 'analytic',
      name: 'The chosen origin body sits at the origin in its own frame',
      measured: hypot(shifted[1].x, shifted[1].y),
      expected: 0,
      unit: 'units',
      tolerance: 1e-14,
      toleranceKind: 'absolute',
      why: 'The other half of a frame change: the body the frame is tied to must not move in it. Round-off tolerance, because subtracting a number from itself is exact.',
    });
  }

  // ===========================================================================
  // 8. Observer geometry, transits and projection
  // ===========================================================================
  {
    const edgeOn = observer.geometryFor(0, 90);
    const faceOn = observer.geometryFor(0, 0);
    const pos = { x: 120, y: 0 };

    add({
      group: 'Observer geometry',
      kind: 'analytic',
      name: 'Edge-on: a body on the line of sight has zero sky separation',
      measured: observer.projectedSeparation(pos, edgeOn),
      expected: 0,
      unit: 'units',
      tolerance: 1e-12,
      toleranceKind: 'absolute',
      why: 'At i = 90 and position angle 0 the observer looks along +x, so a body on the +x axis is exactly in front of the star. This is the geometry a transit needs, and it must be exact rather than approximate.',
    });

    add({
      group: 'Observer geometry',
      kind: 'analytic',
      name: 'Face-on: sky separation is the full orbital radius',
      measured: observer.projectedSeparation(pos, faceOn),
      expected: 120,
      unit: 'units',
      tolerance: 1e-12,
      why: 'At i = 0 the orbital plane is the sky plane, so nothing is foreshortened and no transit is possible at any phase.',
    });

    add({
      group: 'Observer geometry',
      kind: 'analytic',
      name: 'Line-of-sight depth is positive in front of the star',
      measured: observer.lineOfSightDepth(pos, edgeOn) > 0,
      expected: true,
      why: 'The sign that decides transit from secondary eclipse. Getting it backwards would put every dip half a period out of phase.',
    });

    add({
      group: 'Observer geometry',
      kind: 'analytic',
      name: 'Radial velocity is negative when approaching',
      measured: observer.projectVelocityLOS({ x: 5, y: 0 }, edgeOn),
      expected: -5,
      unit: 'units per time',
      tolerance: 1e-12,
      why: 'The line-of-sight vector points toward the observer, so motion along it is approach and must report negative. This is the sign convention every spectrograph uses, and it is the one the RV panel has to match.',
    });

    add({
      group: 'Observer geometry',
      kind: 'analytic',
      name: 'Radial velocity scales as sin i',
      measured:
        observer.projectVelocityLOS(
          { x: 5, y: 0 },
          observer.geometryFor(0, 30)
        ) / observer.projectVelocityLOS({ x: 5, y: 0 }, edgeOn),
      expected: Math.sin((30 * Math.PI) / 180),
      unit: '',
      tolerance: 1e-12,
      why: 'The M sin i degeneracy, in the projection code rather than in the formula. Both have to carry it or the panel and the lesson disagree.',
    });

    // Transit depth. The instrument integrates over a limb-darkened disk, so
    // the central depth is not k^2 but k^2 scaled by the ratio of the central
    // intensity to the disk average.
    const u1 = 0.4;
    const u2 = 0.26;
    const iAvg = 1 - u1 / 3 - u2 / 6;
    const k = 0.08;
    add({
      group: 'Transit geometry',
      kind: 'analytic',
      name: 'Central depth is k^2 scaled by limb darkening',
      measured: transitWidgets.blockedFraction(0, k, 220),
      expected: (k * k * 1) / iAvg,
      unit: 'fractional depth',
      tolerance: 3e-3,
      why: "The intensity at disk center is 1 by construction of the quadratic law, so the depth is k^2 / <I>, a 21% enhancement over the naive k^2. The instrument gets there by numerical quadrature over a 220-square grid, whose truncation error at the planet's edge is a few parts in a thousand. That is the whole tolerance; the physics itself is exact.",
      source: 'Quadratic limb darkening, Claret (2000)',
    });

    add({
      group: 'Transit geometry',
      kind: 'analytic',
      name: 'No light is blocked once the planet is off the disk',
      measured: transitWidgets.blockedFraction(1 + k + 1e-9, k, 60),
      expected: 0,
      unit: 'fractional depth',
      tolerance: 0,
      toleranceKind: 'absolute',
      why: 'Exactly zero, not nearly zero: the baseline of a light curve is what a student measures the depth against.',
    });

    add({
      group: 'Transit geometry',
      kind: 'analytic',
      name: 'A grazing transit is shallower than a central one',
      measured:
        transitWidgets.blockedFraction(0.9, k, 220) <
        transitWidgets.blockedFraction(0, k, 220),
      expected: true,
      why: 'Limb darkening plus partial overlap. The lesson asks students to explain why impact parameter changes depth as well as duration, so the instrument has to actually do it.',
    });

    add({
      group: 'Transit geometry',
      kind: 'analytic',
      name: 'Sky separation at mid-transit equals the impact parameter',
      measured: transitWidgets.separationAt(0, 12, 0.4),
      expected: 0.4,
      unit: 'stellar radii',
      tolerance: 1e-12,
      why: 'The definition of the impact parameter, checked in the geometry the widget draws from.',
    });

    // Transit duration, against the standard analytic expression.
    const aOverR = 12;
    const b = 0.3;
    add({
      group: 'Transit geometry',
      kind: 'analytic',
      name: 'Transit half-duration matches the analytic expression',
      measured: transitWidgets.halfDuration(aOverR, b, k),
      expected: Math.asin(
        Math.sqrt(((1 + k) ** 2 - b ** 2) / (aOverR ** 2 - b ** 2))
      ),
      unit: 'radians of orbital phase',
      tolerance: 1e-12,
      why: 'The textbook duration formula for a circular orbit. Exact arithmetic, so machine precision.',
      source: 'Seager & Mallen-Ornelas (2003) ApJ 585, 1038',
    });

    add({
      group: 'Transit geometry',
      kind: 'analytic',
      name: 'No transit when the impact parameter exceeds 1 + k',
      measured: transitWidgets.halfDuration(aOverR, 1 + k + 0.01, k),
      expected: 0,
      unit: 'radians',
      tolerance: 0,
      toleranceKind: 'absolute',
      why: 'Exactly zero, because the geometry admits no transit at all: the planet\'s disk never touches the star\'s. A duration of "almost zero" would draw a spurious dip, which is the artifact a student would then try to measure.',
    });
  }

  // ===========================================================================
  // 9. Radial velocity
  // ===========================================================================
  {
    const params = exoSystems.observableParams(exoSystems.HD209458);
    const K = observables.radialVelocitySemiAmplitude(params);

    add({
      group: 'Radial velocity',
      kind: 'data',
      name: 'HD 209458 b semi-amplitude from stored parameters',
      measured: K,
      expected: REF.hd209458SemiAmplitudeMs,
      unit: 'm/s',
      tolerance: 3e-2,
      why: 'Computed from the stored mass, period and inclination, compared against the measured semi-amplitude in the discovery-era literature. Published values span 82.7 to 84.7 m/s depending on the dataset, a 2% spread; 3% is that spread plus a little, and it is far tighter than the factor of two a semi-amplitude/full-amplitude confusion would produce.',
      source:
        'Naef et al. (2004) A&A 414, 351; Mazeh et al. (2000) ApJ 532, L55',
    });

    const sunJupiter = exoSystems.observableParams(exoSystems.SUN_JUPITER);
    add({
      group: 'Radial velocity',
      kind: 'data',
      name: "The Sun's reflex semi-amplitude from Jupiter",
      measured: observables.radialVelocitySemiAmplitude(sunJupiter),
      expected: REF.sunJupiterSemiAmplitudeMs,
      unit: 'm/s',
      tolerance: 3e-2,
      why: 'The canonical contrast case: 12.5 m/s, usually quoted to two or three figures. 3% covers the range of quoted values.',
      source: 'Lovis & Fischer (2010), Exoplanets, ed. Seager',
    });

    add({
      group: 'Radial velocity',
      kind: 'analytic',
      name: 'K scales as sin i',
      measured:
        observables.radialVelocitySemiAmplitude({
          ...params,
          inclinationDeg: 30,
        }) /
        observables.radialVelocitySemiAmplitude({
          ...params,
          inclinationDeg: 90,
        }),
      expected: 0.5,
      unit: '',
      tolerance: 1e-12,
      why: 'sin 30 = 1/2 exactly. The point of the check is that the inclination enters the amplitude and nothing else.',
    });

    add({
      group: 'Radial velocity',
      kind: 'analytic',
      name: 'A face-on orbit produces no radial-velocity signal',
      measured: observables.radialVelocitySemiAmplitude({
        ...params,
        inclinationDeg: 0,
      }),
      expected: 0,
      unit: 'm/s',
      tolerance: 1e-12,
      toleranceKind: 'absolute',
      why: 'The blind spot of the method, and the reason a transit is worth so much: it pins sin i near 1.',
    });

    add({
      group: 'Radial velocity',
      kind: 'analytic',
      name: 'K rises as the eccentricity does, by 1/sqrt(1-e^2)',
      measured:
        observables.radialVelocitySemiAmplitude({
          ...params,
          eccentricity: 0.5,
        }) /
        observables.radialVelocitySemiAmplitude({ ...params, eccentricity: 0 }),
      expected: 1 / Math.sqrt(1 - 0.25),
      unit: '',
      tolerance: 1e-12,
      why: 'The eccentricity factor in the standard relation, isolated.',
    });

    // Inverting the relation must return what went into it.
    const minMass = observables.minimumPlanetMass({
      semiAmplitudeMs: observables.radialVelocitySemiAmplitude({
        ...params,
        inclinationDeg: 90,
      }),
      starMassSolar: params.starMassSolar,
      periodDays: params.periodDays,
      eccentricity: params.eccentricity,
    });
    add({
      group: 'Radial velocity',
      kind: 'analytic',
      name: 'Minimum mass inverts the semi-amplitude relation',
      measured: minMass,
      expected: params.planetMassJupiter,
      unit: 'Jupiter masses',
      tolerance: 1e-6,
      why: "The planet mass appears on both sides of the relation, so the inverse is solved by fixed-point iteration. Four passes is far more than a planetary-mass companion needs; the residual is the iteration's own convergence, not physics.",
    });

    add({
      group: 'Radial velocity',
      kind: 'analytic',
      name: 'Doppler shift is v/c times the rest wavelength',
      measured: observables.dopplerShiftNm(K, 656.281),
      expected: (656.281 * K) / REF.c,
      unit: 'nm',
      tolerance: 1e-12,
      why: 'Non-relativistic, which at 84 m/s is exact to more digits than any spectrograph delivers: the first relativistic correction is (v/c)^2 = 8e-14.',
    });
  }

  // ===========================================================================
  // 10. Astrometry
  // ===========================================================================
  {
    add({
      group: 'Astrometry',
      kind: 'analytic',
      name: 'One AU at one parsec subtends one arcsecond',
      measured: observables.astrometricSignature({
        starReflexAU: 1,
        distancePc: 1,
      }).arcsec,
      expected: 1,
      unit: 'arcsec',
      tolerance: 1e-15,
      why: 'The definition of the parsec. If this needed a tolerance, something would be badly wrong.',
    });

    const sj = exoSystems.observableParams(exoSystems.SUN_JUPITER);
    const reflex = observables.stellarReflexSemimajorAxis(sj);
    const signature = observables.astrometricSignature({
      starReflexAU: reflex,
      distancePc: sj.distancePc,
    });

    add({
      group: 'Astrometry',
      kind: 'data',
      name: "The Sun's astrometric signature from Jupiter, seen from 10 pc",
      measured: signature.microarcsec,
      expected: REF.sunJupiterSignatureAt10pcMicroarcsec,
      unit: 'microarcsec',
      tolerance: 1e-2,
      why: 'The standard worked example, usually quoted as "about 500 microarcseconds". 1% is tighter than the reference is stated to and confirms the whole chain: mass ratio, reflex orbit, parsec conversion.',
      source: 'Perryman (2011), The Exoplanet Handbook',
    });

    add({
      group: 'Astrometry',
      kind: 'analytic',
      name: 'Star and planet reflex orbits sum to the relative orbit',
      measured:
        observables.stellarReflexSemimajorAxis(sj) +
        observables.planetSemimajorAxisAboutBarycenter(sj),
      expected: sj.semiMajorAU,
      unit: 'AU',
      tolerance: 1e-12,
      why: 'Both bodies orbit the barycenter, and the two orbits have to add up to the separation. Round-off tolerance.',
    });

    add({
      group: 'Astrometry',
      kind: 'analytic',
      name: 'Angular signature is inversely proportional to distance',
      measured:
        observables.astrometricSignature({
          starReflexAU: reflex,
          distancePc: 20,
        }).arcsec /
        observables.astrometricSignature({
          starReflexAU: reflex,
          distancePc: 10,
        }).arcsec,
      expected: 0.5,
      unit: '',
      tolerance: 1e-12,
      why: 'Distance changes the angle and never the orbit. Keeping those two apart is the whole point of the astrometry panel.',
    });

    // The reflex orbit as the integrator produces it, rather than as the
    // formula predicts it: a star pulled by a heavy planet, measured the way
    // the astrometry panel measures it.
    {
      const G = 1;
      const dt = 0.05;
      const M = 1000;
      const mp = 20; // deliberately heavy, so the reflex is large enough to measure
      const sep = 200;
      lab.reset();
      const vRel = Math.sqrt((G * (M + mp)) / sep);
      const rStar = (sep * mp) / (M + mp);
      const rPlanet = (sep * M) / (M + mp);
      const s = makeStar(
        physics,
        { x: -rStar, y: 0 },
        { x: 0, y: (-vRel * mp) / (M + mp) },
        M
      );
      const g = new physics.GasGiant(
        { x: rPlanet, y: 0 },
        { x: 0, y: (vRel * M) / (M + mp) },
        1
      );
      g.mass = mp;
      g.radius = 1;
      physics.stars.push(s);
      physics.gas_giants.push(g);
      lab.commit();

      const period = 2 * Math.PI * Math.sqrt(sep ** 3 / (G * (M + mp)));
      let maxReflex = 0;
      lab.step(dt, Math.round((4 * period) / dt), () => {
        const bary = frames.systemBarycenter([s, g]);
        maxReflex = Math.max(
          maxReflex,
          hypot(s.pos.x - bary.x, s.pos.y - bary.y)
        );
      });
      add({
        group: 'Astrometry',
        kind: 'integration',
        name: 'Integrated stellar reflex amplitude matches a*(m/(M+m))',
        measured: maxReflex,
        expected: rStar,
        unit: 'units',
        tolerance: 3e-3,
        why: "The astrometric panel measures the star's largest excursion from the barycenter and calls it the reflex semi-major axis. This confirms the integrator produces the amplitude the mass ratio demands, to the same O(dt/P) accuracy as any other circular-orbit quantity here.",
      });
    }
  }

  // ===========================================================================
  // 11. Habitable zone and insolation
  // ===========================================================================
  {
    add({
      group: 'Habitable zone',
      kind: 'analytic',
      name: 'Earth receives one Earth insolation at 1 AU',
      measured: habitability.relativeInsolation(1, 1),
      expected: 1,
      unit: 'Earth units',
      tolerance: 0,
      why: 'A definition. The check is that the inverse-square law is what is implemented.',
    });

    add({
      group: 'Habitable zone',
      kind: 'data',
      name: 'Solar constant at 1 AU',
      measured: habitability.insolationWm2(1, 1),
      expected: REF.solarConstantWm2,
      unit: 'W/m^2',
      tolerance: 1e-3,
      source: 'TSIS-1 / IPCC AR6',
      why: 'Total solar irradiance is measured to better than 0.1%; the value stored is the standard rounded one.',
    });

    add({
      group: 'Habitable zone',
      kind: 'analytic',
      name: 'Insolation falls as the inverse square of distance',
      measured:
        habitability.relativeInsolation(1, 2) /
        habitability.relativeInsolation(1, 1),
      expected: 0.25,
      unit: '',
      tolerance: 1e-15,
      why: 'Twice as far, a quarter as much. Machine precision, because it is one division.',
    });

    add({
      group: 'Habitable zone',
      kind: 'analytic',
      name: 'distanceForInsolation inverts relativeInsolation',
      measured: habitability.distanceForInsolation(
        0.5,
        habitability.relativeInsolation(0.5, 3.3)
      ),
      expected: 3.3,
      unit: 'AU',
      tolerance: 1e-12,
      why: 'A round trip. The habitable-zone edges are computed by inverting the insolation relation, so the two directions have to agree; the tolerance is the round-off of a square root.',
    });

    // The published polynomial must reproduce its own solar anchor.
    add({
      group: 'Habitable zone',
      kind: 'analytic',
      name: 'Runaway-greenhouse flux at the solar temperature',
      measured: habitability.effectiveFluxAt(
        'runawayGreenhouse',
        habitability.SUN_TEFF_K
      ),
      expected: 1.0385,
      unit: 'S_eff',
      tolerance: 1e-12,
      why: 'At T_eff = 5780 K every term of the quartic vanishes and only the constant survives, so this checks the tabulated coefficient against the published one exactly.',
      source: 'Kopparapu et al. (2014) ApJ 787, L29 (erratum)',
    });

    add({
      group: 'Habitable zone',
      kind: 'analytic',
      name: 'Maximum-greenhouse flux at the solar temperature',
      measured: habitability.effectiveFluxAt(
        'maximumGreenhouse',
        habitability.SUN_TEFF_K
      ),
      expected: 0.3507,
      unit: 'S_eff',
      tolerance: 1e-12,
      source: 'Kopparapu et al. (2014) ApJ 787, L29 (erratum)',
      why: 'As for the inner edge: at T_eff = 5780 K the quartic collapses to its constant term, so this compares the stored coefficient directly against the published one.',
    });

    const sunHz = habitability.habitableZoneBounds(
      { luminositySolar: 1, teffK: habitability.SUN_TEFF_K },
      'conservative'
    );
    add({
      group: 'Habitable zone',
      kind: 'data',
      name: 'Conservative habitable zone of the Sun, inner edge',
      measured: sunHz.innerAU,
      expected: REF.sunHzInnerAU,
      unit: 'AU',
      tolerance: 2e-2,
      why: 'The prescription is usually quoted for the Sun as 0.99 to 1.70 AU, rounded to two figures. Evaluating the erratum coefficients exactly gives 0.981 AU, 1% below the rounded quote; 2% accommodates that without accommodating a wrong coefficient, which would move the edge by tens of percent.',
      source: 'Kopparapu et al. (2013, 2014)',
    });

    add({
      group: 'Habitable zone',
      kind: 'data',
      name: 'Conservative habitable zone of the Sun, outer edge',
      measured: sunHz.outerAU,
      expected: REF.sunHzOuterAU,
      unit: 'AU',
      tolerance: 2e-2,
      source: 'Kopparapu et al. (2013, 2014)',
      why: 'As above; the exact evaluation gives 1.689 AU against the quoted 1.70.',
    });

    add({
      group: 'Habitable zone',
      kind: 'analytic',
      name: 'Earth is inside the conservative zone',
      measured: habitability.habitableZoneStatus(1, sunHz).status === 'inside',
      expected: true,
      why: 'The sanity check the whole prescription has to pass before it is worth using on anything else.',
    });

    add({
      group: 'Habitable zone',
      kind: 'analytic',
      name: "Mars's orbit is inside the conservative zone, and Venus's is not",
      measured:
        habitability.habitableZoneStatus(1.524, sunHz).status +
        '/' +
        habitability.habitableZoneStatus(0.723, sunHz).status,
      expected: 'inside/inner',
      why: "The result that makes the lesson worth teaching, and the one that catches an outer edge placed by intuition rather than by the model. Kopparapu's maximum-greenhouse edge is at 1.69 AU, beyond Mars: by insolation alone Mars is in the habitable zone. It is not habitable, and the reason has nothing to do with how much sunlight it gets. Venus, at 0.723 AU, is inside the inner edge - which is the half of the Solar System comparison the intuition does get right.",
      source: 'Kopparapu et al. (2013, 2014)',
    });

    add({
      group: 'Habitable zone',
      kind: 'analytic',
      name: 'The optimistic zone contains the conservative one',
      measured: (() => {
        const opt = habitability.habitableZoneBounds(
          { luminositySolar: 1, teffK: habitability.SUN_TEFF_K },
          'optimistic'
        );
        return opt.innerAU < sunHz.innerAU && opt.outerAU > sunHz.outerAU;
      })(),
      expected: true,
      why: 'Recent Venus is hotter than the runaway greenhouse and Early Mars is colder than the maximum greenhouse, so the optimistic edges must bracket the conservative ones. An ordering mistake in the boundary table would show up here and nowhere else.',
    });

    // TRAPPIST-1, the system the Goldilocks lesson is built on.
    const t1 = habitability.habitableZoneBounds(
      {
        luminositySolar: trappist.TRAPPIST1_STAR.luminosityInSuns,
        teffK: trappist.TRAPPIST1_STAR.temperatureK,
      },
      'conservative'
    );

    add({
      group: 'Habitable zone',
      kind: 'data',
      name: 'TRAPPIST-1 conservative zone, inner edge',
      measured: t1.innerAU,
      expected: REF.trappist1HzInnerAU,
      unit: 'AU',
      tolerance: 8e-2,
      why: 'The published zone is quoted to two figures as 0.024 to 0.049 AU. The star is also 34 K below the temperature range the Kopparapu fit was calibrated over, so the model clamps to 2600 K rather than extrapolating a quartic; the code reports that it did (extrapolated = true) and this tolerance carries it. 8% is what that clamp costs and is still an order of magnitude tighter than the mass-luminosity fallback this model replaced, which put the zone out by a factor of four.',
      source: 'Gillon et al. (2017) Nature 542, 456',
    });

    add({
      group: 'Habitable zone',
      kind: 'data',
      name: 'TRAPPIST-1 conservative zone, outer edge',
      measured: t1.outerAU,
      expected: REF.trappist1HzOuterAU,
      unit: 'AU',
      tolerance: 8e-2,
      source: 'Gillon et al. (2017) Nature 542, 456',
      why: 'As above.',
    });

    add({
      group: 'Habitable zone',
      kind: 'analytic',
      name: "TRAPPIST-1 is flagged as outside the fit's calibrated range",
      measured: t1.extrapolated,
      expected: true,
      why: 'The star is at 2566 K and the published fit covers 2600 to 7200 K. Reporting that honestly, rather than quoting an extrapolated quartic as a measurement, is the behaviour under test.',
    });

    add({
      group: 'Habitable zone',
      kind: 'data',
      name: 'TRAPPIST-1 e, f and g are the planets in the conservative zone',
      measured: trappist.TRAPPIST1_PLANETS.filter(
        p => p.a >= t1.innerAU && p.a <= t1.outerAU
      )
        .map(p => p.name)
        .join(''),
      expected: 'efg',
      why: "The result the literature reports for this system, reproduced from the stored semi-major axes and the model's own zone rather than asserted. This is the single claim the Goldilocks lesson rests on.",
      source: 'Gillon et al. (2017) Nature 542, 456',
    });

    add({
      group: 'Habitable zone',
      kind: 'approximation',
      name: 'Mass-luminosity fallback returns 1 L_sun for 1 M_sun',
      measured: habitability.estimateLuminosityFromMass(1),
      expected: 1,
      unit: 'L_sun',
      tolerance: 0,
      why: "A labeled approximation, validated only against its own anchor. The relation is a broken power law good to a factor of order two at the bottom of the main sequence, and it is used only for stars a user invented. Any star carrying a measured luminosity uses that instead - which is the fix that moved TRAPPIST-1's zone by a factor of four.",
    });

    // An eccentric orbit spends more of its year far from the star than near
    // it, which is the point of the eccentricity part of the lesson.
    const eccOrbit = { semiMajorAU: 1, eccentricity: 0.4, luminositySolar: 1 };
    const extremes = habitability.orbitExtremes(eccOrbit);
    add({
      group: 'Habitable zone',
      kind: 'analytic',
      name: 'Periapsis and apoapsis insolation ratio is ((1+e)/(1-e))^2',
      measured: extremes.periapsisInsolation / extremes.apoapsisInsolation,
      expected: ((1 + 0.4) / (1 - 0.4)) ** 2,
      unit: '',
      tolerance: 1e-12,
      why: 'The inverse-square law applied at the two turning points. At e = 0.4 that is a factor of 5.4 between the hottest and coldest part of the year, which is the number the eccentricity part of the lesson turns on.',
    });

    add({
      group: 'Habitable zone',
      kind: 'analytic',
      name: "Kepler's equation solver reproduces the apoapsis distance",
      measured: habitability.orbitalStateAt(eccOrbit, 0.5).distanceAU,
      expected: 1.4,
      unit: 'AU',
      tolerance: 1e-9,
      why: "Half a period after periapsis is apoapsis exactly, at a(1+e). Newton's method on Kepler's equation converges to 1e-12 here; the tolerance is three orders looser than that and still pins the solver.",
    });

    add({
      group: 'Habitable zone',
      kind: 'analytic',
      name: 'More than half the year is spent beyond the semi-major axis',
      measured: (() => {
        let outside = 0;
        const n = 4000;
        for (let i = 0; i < n; i++) {
          if (
            habitability.orbitalStateAt(eccOrbit, (i + 0.5) / n).distanceAU > 1
          ) {
            outside++;
          }
        }
        return outside / n;
      })(),
      expected: 0.6,
      unit: 'fraction of the year',
      tolerance: 5e-2,
      why: "Kepler's second law, in the form the lesson uses it: a planet dawdles through the cold outer half of an eccentric orbit and rushes through the hot inner half. Sampling evenly in mean anomaly samples evenly in time, which is the step that makes this a statement about the year rather than about the path. The exact figure for e = 0.4 is 0.632; 5% covers the sampling.",
    });
  }

  // ===========================================================================
  // 12. Rotation curves and dark matter
  // ===========================================================================
  {
    const G = 1;
    const vFlat = 6;
    const rc = 300;

    add({
      group: 'Dark matter',
      kind: 'analytic',
      name: 'Halo circular speed matches its asymptotic form far out',
      measured: darkMatter.haloCircularSpeed(100 * rc, vFlat, rc) / vFlat,
      // arctan(x) -> pi/2 - 1/x, so v/v_flat -> sqrt(1 - pi/(2x)).
      expected: Math.sqrt(1 - Math.PI / (2 * 100)),
      unit: '',
      tolerance: 2e-4,
      why: 'The asymptote is approached, not reached: at 100 core radii the speed is still 0.79% short of v_flat, because arctan(x)/x falls off as pi/(2x). Checking against 1 with a loose tolerance would hide a wrong profile; checking against sqrt(1 - pi/(2x)) pins the profile itself. The residual 2e-4 is the next term in the expansion, 1/x^2.',
      source: 'Begeman (1989) A&A 223, 47, on NGC 3198',
    });

    add({
      group: 'Dark matter',
      kind: 'analytic',
      name: 'Halo circular speed is within 1% of v_flat at 100 core radii',
      measured: darkMatter.haloCircularSpeed(100 * rc, vFlat, rc) / vFlat,
      expected: 1,
      unit: '',
      tolerance: 1e-2,
      why: 'The claim the lesson makes - that the curve goes flat - stated as a bound rather than as an identity. 1% is the analytic shortfall pi/(4x) at x = 100, so this is the tightest bound the profile permits.',
    });

    add({
      group: 'Dark matter',
      kind: 'analytic',
      name: 'Halo circular speed rises linearly near the center',
      measured:
        darkMatter.haloCircularSpeed(rc / 1000, vFlat, rc) /
        ((vFlat * (1 / 1000)) / Math.sqrt(3)),
      expected: 1,
      unit: '',
      tolerance: 1e-6,
      why: 'The series 1 - arctan(x)/x = x^2/3 - x^4/5 + ... gives v -> v_flat * x / sqrt(3) as x -> 0, so the halo has no cusp and no singular acceleration at the center. The code switches to the series below x = 1e-3 precisely because the closed form loses every significant digit there; this checks the switch does not introduce a step.',
    });

    add({
      group: 'Dark matter',
      kind: 'analytic',
      name: 'The series and closed forms agree across the switchover',
      measured:
        Math.abs(
          darkMatter.haloCircularSpeed(rc * 0.999e-3, vFlat, rc) -
            darkMatter.haloCircularSpeed(rc * 1.001e-3, vFlat, rc)
        ) / darkMatter.haloCircularSpeed(rc * 1e-3, vFlat, rc),
      expected: 0,
      unit: 'relative',
      tolerance: 3e-3,
      toleranceKind: 'absolute',
      why: 'Straddling the x = 1e-3 boundary. The two evaluations are 0.2% apart in radius, so the speeds must be 0.2% apart and no more: a discontinuity at the switchover would show up as a much larger jump.',
    });

    add({
      group: 'Dark matter',
      kind: 'analytic',
      name: 'Halo acceleration is exactly v_c^2 / r',
      measured: (() => {
        const r = 450;
        const a = darkMatter.haloAcceleration(
          { x: r, y: 0 },
          { vFlat, coreRadius: rc }
        );
        const v = darkMatter.haloCircularSpeed(r, vFlat, rc);
        return Math.abs(hypot(a.ax, a.ay) - (v * v) / r) / ((v * v) / r);
      })(),
      expected: 0,
      unit: 'relative',
      tolerance: 1e-14,
      toleranceKind: 'absolute',
      why: 'The condition for a circular orbit. If the acceleration and the quoted circular speed disagreed, a body launched on the curve the panel draws would not stay on it.',
    });

    add({
      group: 'Dark matter',
      kind: 'analytic',
      name: 'Halo enclosed mass reproduces v_c = sqrt(GM/r)',
      measured: (() => {
        const r = 700;
        const M = darkMatter.haloEnclosedMass(r, { vFlat, coreRadius: rc }, G);
        return (
          Math.sqrt((G * M) / r) / darkMatter.haloCircularSpeed(r, vFlat, rc)
        );
      })(),
      expected: 1,
      unit: '',
      tolerance: 1e-14,
      why: 'The enclosed mass is read straight off the circular speed, so inverting it must give the speed back. Round-off tolerance. The mass matters because the lesson asks how much dark matter there is, not just how fast things go.',
    });

    add({
      group: 'Dark matter',
      kind: 'analytic',
      name: 'A point mass gives a Keplerian slope of exactly -1/2',
      measured: (() => {
        const centre = { x: 0, y: 0 };
        const bodies = [{ pos: { x: 0, y: 0 }, mass: 1000 }];
        const pts = [];
        for (let r = 100; r <= 1000; r += 50) {
          pts.push({
            r,
            speed: darkMatter.keplerianSpeed(bodies, centre, r, G),
          });
        }
        return darkMatter.fitPowerLaw(pts).exponent;
      })(),
      expected: -0.5,
      unit: 'slope',
      tolerance: 1e-12,
      why: "The prediction the flat rotation curve refutes, and the number the Solar System actually shows. Fitted by the same least-squares routine the lesson uses, so a bug in the fit would break this before it broke a student's measurement.",
    });

    add({
      group: 'Dark matter',
      kind: 'analytic',
      name: 'A dominant halo flattens the fitted slope toward zero',
      measured: (() => {
        const centre = { x: 0, y: 0 };
        const bodies = [{ pos: { x: 0, y: 0 }, mass: 1 }];
        const halo = { vFlat, coreRadius: 60 };
        const pts = [];
        for (let r = 400; r <= 2000; r += 50) {
          pts.push({
            r,
            speed: darkMatter.totalCircularSpeed(bodies, centre, r, G, halo),
          });
        }
        return darkMatter.fitPowerLaw(pts).exponent;
      })(),
      expected: 0,
      unit: 'slope',
      tolerance: 8e-2,
      toleranceKind: 'absolute',
      why: 'The lesson\'s claim is "flat, not -0.5", and this measures how flat. The residual is not zero and should not be: the pseudo-isothermal speed still rises toward its asymptote as sqrt(1 - pi/(2x)), which contributes a slope of about pi/(4x). Over 400 to 2000 units at a 60-unit core that averages 0.05, so 0.08 is the analytic residual with a little room. The distance from the Keplerian -0.5 is the entire point, and it is a factor of ten.',
      source: 'Rubin & Ford (1970) ApJ 159, 379',
    });

    add({
      group: 'Dark matter',
      kind: 'analytic',
      name: 'Speeds from separate components add in quadrature',
      measured: (() => {
        const centre = { x: 0, y: 0 };
        const bodies = [{ pos: { x: 0, y: 0 }, mass: 800 }];
        const halo = { vFlat, coreRadius: rc };
        const r = 500;
        const vb = darkMatter.keplerianSpeed(bodies, centre, r, G);
        const vh = darkMatter.haloCircularSpeed(r, vFlat, rc);
        return (
          darkMatter.totalCircularSpeed(bodies, centre, r, G, halo) /
          Math.sqrt(vb * vb + vh * vh)
        );
      })(),
      expected: 1,
      unit: '',
      tolerance: 1e-14,
      why: 'Accelerations add, and a = v^2/r for each component, so the speeds add in quadrature. Adding them linearly is the classic mistake here.',
    });

    add({
      group: 'Dark matter',
      kind: 'analytic',
      name: 'Virial mass of a uniform sphere: M = (5/3) R <v^2> / G',
      measured: darkMatter.virialMass(9, 300, G),
      expected: (5 / 3) * ((300 * 9) / G),
      unit: 'mass units',
      tolerance: 1e-12,
      why: "Zwicky's calculation, with U = -(3/5) G M^2 / R for a uniform sphere. Checked against its own algebra, because the assumption (a uniform sphere in equilibrium) is the approximation, not the arithmetic.",
      source: 'Zwicky (1933) Helvetica Physica Acta 6, 110',
    });

    add({
      group: 'Dark matter',
      kind: 'analytic',
      name: 'Line-of-sight dispersion converts with the right dimension factor',
      measured:
        darkMatter.losToMeanSquare(5, 3) / darkMatter.losToMeanSquare(5, 2),
      expected: 1.5,
      unit: '',
      tolerance: 1e-15,
      why: 'A spectrum gives one velocity component, not three. The factor is the number of dimensions the motion occupies, and the simulation being planar is exactly why this is a parameter rather than a hardcoded 3.',
    });

    // The component curves the rotation-curve fitting instrument is built on.
    // These are new physics in the project rather than a re-check of the halo,
    // and a lesson now asks students to fit a real galaxy with them.
    add({
      group: 'Dark matter',
      kind: 'analytic',
      name: 'Modified Bessel functions match tabulated values',
      measured: (() => {
        const cases = [
          [darkMatter.besselI0, 2, 2.2795853023],
          [darkMatter.besselI0, 10, 2815.7166284],
          [darkMatter.besselI1, 2, 1.5906368546],
          [darkMatter.besselI1, 10, 2670.9883037],
          [darkMatter.besselK0, 2, 0.1138938727],
          [darkMatter.besselK0, 10, 1.7780062e-5],
          [darkMatter.besselK1, 2, 0.1398658818],
          [darkMatter.besselK1, 10, 1.8648773e-5],
        ];
        let worst = 0;
        for (const [fn, x, want] of cases) {
          worst = Math.max(worst, Math.abs(fn(x) - want) / want);
        }
        return worst;
      })(),
      expected: 0,
      unit: 'worst relative error',
      tolerance: 2e-7,
      toleranceKind: 'absolute',
      why: 'The Abramowitz & Stegun 9.8.1-9.8.8 polynomial approximations, which claim about 1e-7 relative and deliver it. Both branches of each function are sampled, because the switchover is where an approximation like this goes wrong. They exist in this project for one purpose - the thin exponential disc below - and a disc curve built on a subtly wrong Bessel function looks entirely plausible while putting its peak in the wrong place, which in a fitting exercise would be absorbed into the halo. The halo is the quantity being measured.',
      source: 'Abramowitz & Stegun, Handbook of Mathematical Functions, 9.8',
    });

    add({
      group: 'Dark matter',
      kind: 'analytic',
      name: 'Exponential disc peaks at 2.15 scale lengths',
      measured: (() => {
        const Rd = 3;
        let best = 0;
        let bestR = 0;
        for (let r = 0.02; r < 12 * Rd; r += 0.005) {
          const v = darkMatter.exponentialDiscSpeed(r, 1e10, Rd);
          if (v > best) {
            best = v;
            bestR = r;
          }
        }
        return bestR / Rd;
      })(),
      expected: 2.15,
      unit: 'scale lengths',
      tolerance: 5e-3,
      why: 'A pure number: the peak of a Freeman thin exponential disc sits at the same fraction of its scale length whatever its mass and size. That makes it the sharpest available check that the Bessel combination I0K0 - I1K1 is the right one, because getting the combination wrong moves the peak and nothing else about the curve looks obviously wrong.',
      source: 'Freeman (1970) ApJ 160, 811',
    });

    add({
      group: 'Dark matter',
      kind: 'analytic',
      name: 'Far outside a disc its curve becomes Keplerian',
      measured: (() => {
        const M = 1e10;
        const r = 300;
        return (
          darkMatter.exponentialDiscSpeed(r, M, 2) /
          darkMatter.pointMassSpeed(r, M)
        );
      })(),
      expected: 1,
      unit: '',
      tolerance: 1e-2,
      why: 'The bracket I0K0 - I1K1 tends to 1/(4y^3), which turns the Freeman expression into exactly GM/r. A disc seen from 150 scale lengths away is a point mass, and a function that failed this would be wrong in a way no amount of eyeballing a curve would catch. The residual at 300 kpc is the next term in that expansion.',
    });

    add({
      group: 'Dark matter',
      kind: 'analytic',
      name: 'In its own plane a disc spins faster than the equivalent sphere',
      measured: (() => {
        const M = 1e10;
        const Rd = 3;
        const r = 2.15 * Rd;
        const x = r / Rd;
        const enclosed = M * (1 - (1 + x) * Math.exp(-x));
        return (
          darkMatter.exponentialDiscSpeed(r, M, Rd) /
          darkMatter.pointMassSpeed(r, enclosed)
        );
      })(),
      expected: 1.17,
      unit: 'ratio to the spherical equivalent',
      tolerance: 5e-2,
      why: 'Not a bug, and the reason the disc is done with Bessel functions rather than an enclosed mass. Material at larger radius than the orbit still pulls inward when it lies in the same plane, so a disc spins about 17% faster near its peak than a sphere holding the same mass inside the same radius. Modelling a disc as a sphere understates it by that much, and in a decomposition the shortfall lands on the halo.',
    });

    add({
      group: 'Dark matter',
      kind: 'analytic',
      name: 'Component speeds add in quadrature, not linearly',
      measured: (() => {
        const model = {
          bulgeMass: 1e10,
          discMass: 4e10,
          discScale: 2.6,
          haloVFlat: 150,
          haloCore: 8,
        };
        const c = darkMatter.galaxyCurveAt(10, model);
        return c.total / Math.hypot(c.bulge, c.disc, c.halo);
      })(),
      expected: 1,
      unit: '',
      tolerance: 1e-12,
      why: 'Accelerations add and a = v^2/r for each component, so the speeds add in quadrature. Adding them linearly is the classic mistake, and it would overstate the total by tens of per cent - which a student fitting a curve would compensate for by fitting a smaller halo.',
    });

    add({
      group: 'Dark matter',
      kind: 'analytic',
      name: 'A fitted decomposition beats the best halo-free one by 7x',
      measured: (() => {
        // Swept over the parameter ranges the lesson's sliders actually expose,
        // which is what makes this a statement about the exercise rather than
        // about one convenient setting.
        const observed = dmWidgets.NGC3198_OBSERVED;
        let bestNoHalo = Infinity;
        for (let m = 0; m <= 16; m += 0.25) {
          for (let sc = 1; sc <= 8; sc += 0.25) {
            const rms = darkMatter.curveResidual(observed, {
              bulgeMass: dmWidgets.NGC3198.bulgeMass,
              discMass: m * 1e10,
              discScale: sc,
              haloVFlat: 0,
              haloCore: 6,
            }).rms;
            bestNoHalo = Math.min(bestNoHalo, rms);
          }
        }
        const fitted = darkMatter.curveResidual(
          observed,
          dmWidgets.NGC3198
        ).rms;
        return bestNoHalo / fitted;
      })(),
      expected: 7,
      unit: 'ratio of residuals',
      tolerance: 0.3,
      why: "The claim the lesson's fitting exercise is built on, measured rather than asserted: no disc mass at any scale length reproduces the curve. Swept over the whole range of both sliders a student can reach, the best halo-free residual is 14.5 km/s against 2.1 km/s for the decomposition with a halo - and against measurement errors of 4.7. A tolerance of 0.3 on the ratio would catch either the sweep narrowing or the target curve drifting.",
    });

    // The halo inside the real integrator: a body launched on the halo's own
    // circular speed must stay at that radius.
    {
      const dt = 0.1;
      const r = 600;
      lab.reset({
        dark_matter_halo: true,
        halo_v_flat: vFlat,
        halo_core_radius: rc,
        mutual_gravity: false,
      });
      const v = darkMatter.haloCircularSpeed(r, vFlat, rc);
      const p = makeTracer(physics, { x: r, y: 0 }, { x: 0, y: v });
      physics.planets.push(p);
      lab.commit();

      const period = (2 * Math.PI * r) / v;
      let minR = r;
      let maxR = r;
      lab.step(dt, Math.round((6 * period) / dt), () => {
        const rr = hypot(p.pos.x, p.pos.y);
        minR = Math.min(minR, rr);
        maxR = Math.max(maxR, rr);
      });
      add({
        group: 'Dark matter',
        kind: 'integration',
        name: 'A halo circular orbit stays circular in the integrator',
        measured: (maxR - minR) / r,
        expected: 0,
        unit: 'fractional range',
        tolerance: 5e-3,
        toleranceKind: 'absolute',
        why: 'The halo enters the force law as an operator-split velocity kick rather than through the point-mass sum, so this is the check that the split is consistent with the profile the panel plots. Same O(dt/P) bound as any other circular orbit: 6 orbits at dt = 0.1 against a period of 628 units.',
      });
    }
  }

  // ===========================================================================
  // 13. Compact objects
  // ===========================================================================
  {
    const solar = blackHole.blackHoleFacts(1);

    add({
      group: 'Compact objects',
      kind: 'data',
      name: 'Schwarzschild radius of one solar mass',
      measured: solar.rsKm,
      expected: REF.schwarzschildSolarKm,
      unit: 'km',
      tolerance: 3e-3,
      why: 'R_s = 2GM/c^2. The standard quoted value is 2.95 km to three figures; the exact evaluation with CODATA G and the IAU solar mass gives 2.954 km. 0.3% is the rounding in the reference.',
      source:
        'Schwarzschild (1916); value as standardly quoted, e.g. Misner, Thorne & Wheeler, Gravitation',
    });

    add({
      group: 'Compact objects',
      kind: 'analytic',
      name: 'Schwarzschild radius is linear in mass',
      measured:
        blackHole.schwarzschildRadiusM(10 * constants.SOLAR_MASS_KG) /
        blackHole.schwarzschildRadiusM(constants.SOLAR_MASS_KG),
      expected: 10,
      unit: '',
      tolerance: 1e-14,
      why: 'The trend the "Black Holes by the Numbers" investigation asks a student to discover first.',
    });

    add({
      group: 'Compact objects',
      kind: 'data',
      name: 'Schwarzschild radius of Sagittarius A*',
      measured: blackHole.blackHoleFacts(REF.sgrAMassSuns).rsM,
      expected: REF.sgrARsMeters,
      unit: 'm',
      tolerance: 3e-3,
      source: 'GRAVITY Collaboration (2019) A&A 625, L10',
      why: 'A real object at the other end of the mass range from the solar-mass case, so the check spans seven decades. The measured mass is quoted to four figures; 0.3% is the rounding in the horizon radius derived from it.',
    });

    add({
      group: 'Compact objects',
      kind: 'analytic',
      name: 'Newtonian escape speed at the horizon is exactly c',
      measured:
        blackHole.newtonianEscapeSpeed(constants.SOLAR_MASS_KG, solar.rsM) /
        REF.c,
      expected: 1,
      unit: '',
      tolerance: 1e-14,
      why: 'The pedagogical squeeze-the-Sun panel gets the right radius for the wrong reason: sqrt(2GM/r) = c at r = 2GM/c^2 identically. The lesson makes that point explicitly rather than letting a student think Newtonian gravity predicts event horizons, and this check confirms the arithmetic the point rests on.',
    });

    add({
      group: 'Compact objects',
      kind: 'data',
      name: 'Hawking temperature of one solar mass',
      measured: solar.temperature,
      expected: REF.hawkingSolarK,
      unit: 'K',
      tolerance: 3e-3,
      why: 'T = hbar c^3 / (8 pi G M k_B). Quoted to three figures as 6.17e-8 K.',
      source: 'Hawking (1974) Nature 248, 30',
    });

    add({
      group: 'Compact objects',
      kind: 'analytic',
      name: 'Hawking temperature is inversely proportional to mass',
      measured:
        blackHole.blackHoleFacts(1).temperature /
        blackHole.blackHoleFacts(100).temperature,
      expected: 100,
      unit: '',
      tolerance: 1e-12,
      why: 'The counterintuitive scaling the lesson is built around: bigger holes are colder.',
    });

    add({
      group: 'Compact objects',
      kind: 'data',
      name: 'Evaporation lifetime of one solar mass',
      measured: solar.lifetimeYears,
      expected: REF.evaporationSolarYears,
      unit: 'years',
      tolerance: 2e-2,
      why: 't = 5120 pi G^2 M^3 / (hbar c^4). The commonly quoted figure is "about 2.1e67 years", stated to two figures; 2% is finer than that. The coefficient assumes emission of massless species only, which is the version the lesson states.',
      source: 'Page (1976) Phys. Rev. D 13, 198',
    });

    add({
      group: 'Compact objects',
      kind: 'analytic',
      name: 'Evaporation lifetime scales as the cube of the mass',
      measured:
        blackHole.blackHoleFacts(10).lifetimeYears /
        blackHole.blackHoleFacts(1).lifetimeYears,
      expected: 1000,
      unit: '',
      tolerance: 1e-12,
      why: 'The M^3 in the Hawking lifetime, isolated. Ten times the mass, a thousand times the wait: the scaling the investigation asks a student to find and the reason no stellar-mass hole has evaporated.',
    });

    add({
      group: 'Compact objects',
      kind: 'analytic',
      name: 'Average density falls as the inverse square of mass',
      measured:
        blackHole.blackHoleFacts(1).density /
        blackHole.blackHoleFacts(1000).density,
      expected: 1e6,
      unit: '',
      tolerance: 1e-9,
      why: 'M / R_s^3 with R_s linear in M. The reason a supermassive hole can be less dense than water, which is the single most surprising number in the lesson.',
    });

    add({
      group: 'Compact objects',
      kind: 'analytic',
      name: 'A supermassive hole is less dense than water',
      measured: blackHole.blackHoleFacts(1e9).density < 1000,
      expected: true,
      why: 'The consequence of the scaling above, stated as the claim the lesson actually makes.',
    });

    add({
      group: 'Compact objects',
      kind: 'analytic',
      name: 'ISCO sits at three Schwarzschild radii',
      measured: (() => {
        const f = blackHole.blackHoleFacts(10);
        // The stored ISCO period is Keplerian at r = 3 R_s; invert it.
        const rIsco = Math.cbrt(
          (constants.G_SI * f.massKg * f.iscoPeriodSeconds ** 2) /
            (4 * Math.PI ** 2)
        );
        return rIsco / f.rsM;
      })(),
      expected: 3,
      unit: 'R_s',
      tolerance: 1e-9,
      why: "r_ISCO = 6GM/c^2 for a Schwarzschild hole. Recovered by inverting the stored orbital period rather than read back from the same expression that produced it, so the two have to agree. Kepler's third law happens to hold exactly in Schwarzschild coordinates for circular orbits, which is why a Newtonian period is the right thing to quote here.",
    });

    add({
      group: 'Compact objects',
      kind: 'analytic',
      name: 'Mass categories fall on their stated boundaries',
      measured: [
        blackHole.blackHoleCategory(1),
        blackHole.blackHoleCategory(10),
        blackHole.blackHoleCategory(1e3),
        blackHole.blackHoleCategory(4e6),
      ].join('|'),
      expected: 'Primordial|Stellar-Mass|Intermediate|Supermassive',
      why: 'Conventions rather than physics, and the lesson says so, but they still have to be the conventions the lesson states.',
    });
  }

  // ===========================================================================
  // 14. Mergers
  // ===========================================================================
  {
    lab.reset({ enable_star_merging: true });
    const a = makeStar(physics, { x: -3, y: 0 }, { x: 2.5, y: -1 }, 1200);
    const b = makeStar(physics, { x: 3, y: 0 }, { x: -0.5, y: 3 }, 400);
    a.radius = 6;
    b.radius = 6;
    physics.stars.push(a, b);
    lab.commit();

    const pBefore = momentum([a, b]);
    const mBefore = a.mass + b.mass;
    physics.handle_star_merging(physics.stars);
    const survivors = physics.stars.filter(s => s.alive);
    const pAfter = momentum(survivors);
    const mAfter = survivors.reduce((s, x) => s + x.mass, 0);

    add({
      group: 'Mergers',
      kind: 'integration',
      name: 'A merger conserves linear momentum',
      measured:
        hypot(pAfter.x - pBefore.x, pAfter.y - pBefore.y) /
        hypot(pBefore.x, pBefore.y),
      expected: 0,
      unit: 'relative',
      tolerance: 1e-12,
      toleranceKind: 'absolute',
      why: 'A perfectly inelastic collision: the product carries the mass-weighted mean velocity, so momentum is conserved exactly and kinetic energy is not. That is the model, and it is stated as such on the model page.',
    });

    add({
      group: 'Mergers',
      kind: 'approximation',
      name: 'A merger conserves mass exactly',
      measured: mAfter,
      expected: mBefore,
      unit: 'mass units',
      tolerance: 1e-12,
      why: 'Labeled an approximation because it is one, and in the direction the model page already declares: a real compact-object merger radiates several percent of the total mass away as gravitational waves. Gravitas radiates none. The check is that the code does what the documentation says it does.',
    });

    add({
      group: 'Mergers',
      kind: 'integration',
      name: 'Two stars merge into one',
      measured: survivors.length,
      expected: 1,
      unit: 'bodies',
      tolerance: 0,
      toleranceKind: 'absolute',
      why: 'A guard on the two checks above: they compare momentum and mass before and after a merger, and would both pass trivially if no merger had happened.',
    });
  }

  // ===========================================================================
  // 14b. Absorption by a black hole
  // ---------------------------------------------------------------------------
  // Accretion used to add the mass and drop the momentum. These checks pin the
  // three separate claims the fixed version makes: what it conserves exactly,
  // what it cannot conserve and by how much, and that the two deliberate
  // approximations still behave as documented.
  // ===========================================================================
  {
    /**
     * One absorption, run through the engine, with the totals either side.
     *
     * @param {object} overrides - Settings for the lab world
     * @returns {object} Before/after totals and the hole
     */
    const absorptionRun = overrides => {
      lab.reset({ enable_star_merging: false, ...overrides });
      const hole = new physics.BlackHole(
        { x: 0, y: 0 },
        2000,
        { x: 1.5, y: -0.5 },
        false
      );
      // Not newly created, so `can_move` answers from the setting rather than
      // from the grace period a merger product gets.
      hole.isNewlyCreated = false;
      physics.bh_list.push(hole);

      // Placed inside the absorption radius so it is eaten on the first call,
      // with a velocity that is neither parallel nor antiparallel to its
      // offset: a radial infall would carry no angular momentum at all and
      // would make the spin check pass trivially.
      const prey = new physics.Planet(
        { x: hole.radius + 2, y: 0 },
        { x: -3, y: 7 },
        1
      );
      prey.mass = 300;
      prey.radius = 0.5;
      prey.persistent = true;
      physics.planets.push(prey);
      lab.commit();

      const before = {
        mass: hole.mass + prey.mass,
        p: momentum([hole, prey]),
        com: centreOf([hole, prey]),
        L: angularMomentum([hole, prey]),
      };
      const preyState = {
        mass: prey.mass,
        pos: { ...prey.pos },
        vel: { ...prey.vel },
      };
      const holeState = {
        mass: hole.mass,
        pos: { ...hole.pos },
        vel: { ...hole.vel },
      };

      const absorbed = prey.check_absorption(physics.bh_list);
      const survivors = [hole];

      return {
        absorbed,
        hole,
        before,
        preyState,
        holeState,
        after: {
          mass: hole.mass,
          p: momentum(survivors),
          com: centreOf(survivors),
          L: angularMomentum(survivors),
        },
      };
    };

    const moving = absorptionRun({ bh_behavior: 'Orbiting' });

    add({
      group: 'Absorption',
      kind: 'integration',
      name: 'A body inside the absorption radius is absorbed',
      measured: moving.absorbed,
      expected: true,
      why: 'A guard on every check below: they compare totals across an absorption event and would all pass trivially if nothing had been absorbed.',
    });

    add({
      group: 'Absorption',
      kind: 'integration',
      name: 'Absorption conserves mass exactly',
      measured: moving.after.mass,
      expected: moving.before.mass,
      unit: 'mass units',
      tolerance: 1e-12,
      why: 'Nothing is radiated away. The hole ends at the sum of the two masses, which is the same claim the merger group makes and the same approximation: a real accretion event radiates a few percent of the rest mass as light.',
    });

    add({
      group: 'Absorption',
      kind: 'integration',
      name: 'A moving hole absorbing a body conserves linear momentum',
      measured:
        hypot(
          moving.after.p.x - moving.before.p.x,
          moving.after.p.y - moving.before.p.y
        ) / hypot(moving.before.p.x, moving.before.p.y),
      expected: 0,
      unit: 'relative',
      tolerance: 1e-12,
      toleranceKind: 'absolute',
      why: 'This is the defect the check was written for. Absorption used to add the mass and leave the hole travelling at its old velocity, so every body eaten deposited its mass and threw its momentum away - the dominant term in the momentum drift the scenario probe reported for Star Cluster, Stellar Graveyard and Black Hole Billiards. The hole now takes the mass-weighted mean velocity, which is a perfectly inelastic collision and conserves momentum exactly.',
    });

    add({
      group: 'Absorption',
      kind: 'integration',
      name: "Absorption leaves the pair's centre of mass where it was",
      measured: hypot(
        moving.after.com.x - moving.before.com.x,
        moving.after.com.y - moving.before.com.y
      ),
      expected: 0,
      unit: 'units',
      tolerance: 1e-12,
      toleranceKind: 'absolute',
      why: "The position update is the mass-weighted mean as well as the velocity update, so the merged hole sits exactly where the pair's centre of mass was. Updating the velocity alone would have conserved momentum and still teleported the centre of mass by the body's share of the separation.",
    });

    {
      // The spin term, computed here from the pre-absorption state rather than
      // read back from the engine, so the two have to agree.
      const { preyState: q, holeState: h } = moving;
      const mu = (h.mass * q.mass) / (h.mass + q.mass);
      const expectedSpin =
        mu *
        ((q.pos.x - h.pos.x) * (q.vel.y - h.vel.y) -
          (q.pos.y - h.pos.y) * (q.vel.x - h.vel.x));

      add({
        group: 'Absorption',
        kind: 'approximation',
        name: 'Angular momentum lost equals the banked spin term',
        measured: moving.before.L - moving.after.L,
        expected: expectedSpin,
        unit: 'mass * area / time',
        tolerance: 1e-9,
        why: "Total angular momentum splits into the motion of the centre of mass and the pair's motion about it, L = L_com + mu (r_rel x v_rel). Collapsing the pair to one point mass keeps L_com exactly and discards the second term. That term is not physically lost - it is the spin the hole acquires, which is how real holes are spun up - but Gravitas models a hole as a point mass with no spin, so there is nowhere to put it. It is banked instead, and this check is that the amount banked is exactly the amount that went missing.",
      });

      add({
        group: 'Absorption',
        kind: 'approximation',
        name: 'The engine banks the spin it discarded',
        measured: physics.getAbsorbedSpinAngularMomentum(),
        expected: expectedSpin,
        unit: 'mass * area / time',
        tolerance: 1e-12,
        why: 'The running total the engine exposes, against the same quantity computed from the state before the event. A departure that is documented but not measured is a disclaimer; this makes it a number.',
      });

      add({
        group: 'Absorption',
        kind: 'approximation',
        name: 'The spin term is bounded by the absorption radius',
        measured: Math.abs(expectedSpin),
        expected:
          mu *
          (moving.hole.radius + physics.ABSORB_BUFFER) *
          hypot(q.vel.x - h.vel.x, q.vel.y - h.vel.y),
        unit: 'mass * area / time',
        tolerance: 0,
        toleranceKind: 'bound',
        why: 'The body is inside bh.radius + ABSORB_BUFFER when this runs, so |L_spin| <= mu * (r_horizon + buffer) * |v_rel|. The discarded term is therefore small and bounded rather than merely believed to be, and it shrinks as the hole grows because mu tends to the body mass while the horizon grows only as M^0.3.',
      });
    }

    {
      const stat = absorptionRun({ bh_behavior: 'Static' });
      add({
        group: 'Absorption',
        kind: 'approximation',
        name: 'A static hole does not recoil when it absorbs',
        measured: hypot(
          stat.hole.vel.x - stat.holeState.vel.x,
          stat.hole.vel.y - stat.holeState.vel.y
        ),
        expected: 0,
        unit: 'units per time',
        tolerance: 1e-15,
        toleranceKind: 'absolute',
        why: 'A static hole is a fixed potential well that pulls on everything and is pulled by nothing, which is a deliberate teaching object and is what conservationCaveats() reports. Giving it a recoil at the moment it swallows something would be the one instant in its life it responded to another body, and would nudge it off the mark the scenario placed it on. It still gains the mass; the momentum that goes nowhere is added to the discarded total instead of vanishing unrecorded.',
      });

      add({
        group: 'Absorption',
        kind: 'approximation',
        name: 'Momentum a static hole discards is accounted for',
        measured: hypot(
          physics.getDiscardedAbsorptionMomentum().x,
          physics.getDiscardedAbsorptionMomentum().y
        ),
        expected: hypot(
          stat.preyState.mass * stat.preyState.vel.x,
          stat.preyState.mass * stat.preyState.vel.y
        ),
        unit: 'mass * units per time',
        tolerance: 1e-12,
        why: 'The ledger the engine keeps for exactly this case, against the momentum the absorbed body was carrying. The static-hole approximation is allowed to break momentum conservation; it is not allowed to break it silently.',
      });
    }

    {
      const oneWay = absorptionRun({
        bh_behavior: 'Orbiting',
        mutual_gravity: false,
      });
      add({
        group: 'Absorption',
        kind: 'approximation',
        name: 'Under one-way gravity a hole does not recoil either',
        measured: hypot(
          oneWay.hole.vel.x - oneWay.holeState.vel.x,
          oneWay.hole.vel.y - oneWay.holeState.vel.y
        ),
        expected: 0,
        unit: 'units per time',
        tolerance: 1e-15,
        toleranceKind: 'absolute',
        why: 'One-way gravity makes the small bodies test particles with no dynamical influence, which is the second departure conservationCaveats() reports. Momentum a body never exerted through gravity should not suddenly appear at the moment it is eaten, so the transfer is suppressed there too and the configuration keeps the behaviour it is documented as having.',
      });
    }

    // Left as the engine found it, so nothing downstream inherits the ledger.
    physics.resetAbsorptionAccounting();
  }

  // ===========================================================================
  // 14c. Tidal disruption
  // ---------------------------------------------------------------------------
  // StarObject, Planet, GasGiant and Comet each implement tidal_mass_loss, and
  // updatePhysics used to iterate only `stars`, so three of the four were dead
  // code: a comet could fall through a black hole's tidal radius intact. These
  // checks are that all four are now reached, that each keeps its own tidal
  // radius, and that the destruction thresholds are expressed in units that
  // survive a change to the mass scale - which is how the gas giant's came to
  // be wrong by a factor of fifty in the first place.
  // ===========================================================================
  {
    /**
     * Park one body just inside a hole's tidal radius and run a single step.
     *
     * @param {string} kind - Which class to build
     * @returns {object} Mass either side, and whether the body survived
     */
    const tidalRun = kind => {
      lab.reset({ bh_behavior: 'Static', enable_star_merging: false });
      const hole = new physics.BlackHole({ x: 0, y: 0 }, 5000, { x: 0, y: 0 });
      hole.isNewlyCreated = false;
      physics.bh_list.push(hole);

      // Each class has its own tidal radius as a multiple of the hole's: 5 for
      // a star, 4 for a gas giant, 3 for a planet, 2 for a comet. Placed at
      // 1.5 horizon radii, every one of the four is inside its own radius and
      // outside the absorption radius, so what is measured is stripping rather
      // than swallowing.
      const r = hole.radius * 1.5;
      let body;
      if (kind === 'star') {
        body = makeStar(physics, { x: r, y: 0 }, { x: 0, y: 0 }, 1000);
        physics.stars.push(body);
      } else if (kind === 'planet') {
        body = new physics.Planet({ x: r, y: 0 }, { x: 0, y: 0 }, 1);
        physics.planets.push(body);
      } else if (kind === 'gasGiant') {
        body = new physics.GasGiant({ x: r, y: 0 }, { x: 0, y: 0 }, 1);
        physics.gas_giants.push(body);
      } else {
        body = new physics.Comet({ x: r, y: 0 }, { x: 0, y: 0 }, 1);
        physics.comets.push(body);
      }
      body.persistent = true;
      body.intact = true;
      lab.commit();

      const before = body.mass;
      const debrisBefore = physics.debris.length;
      lab.step(0.1, 1);
      return {
        before,
        after: body.mass,
        intact: body.intact,
        debrisAdded: physics.debris.length - debrisBefore,
        radius: hole.radius,
      };
    };

    for (const [kind, label] of [
      ['star', 'a star'],
      ['planet', 'a planet'],
      ['gasGiant', 'a gas giant'],
      ['comet', 'a comet'],
    ]) {
      const run = tidalRun(kind);
      add({
        group: 'Tidal disruption',
        kind: 'integration',
        name: `Tidal stripping reaches ${label}`,
        measured: run.after < run.before,
        expected: true,
        why: `updatePhysics iterated the star list alone, so ${label} inside a black hole's tidal radius lost nothing. The class had a working tidal_mass_loss the whole time and nothing called it. This check is that the body is lighter after one step than before it.`,
      });
    }

    {
      // The specific repair: a Jupiter-mass gas giant is stripped rather than
      // destroyed outright. Under the stale `this.mass <= 0.5` literal it would
      // have been below the threshold on arrival and destroyed on frame one.
      const giant = tidalRun('gasGiant');
      add({
        group: 'Tidal disruption',
        kind: 'integration',
        name: 'A Jupiter-mass giant is stripped, not destroyed on arrival',
        measured: giant.intact,
        expected: true,
        why: "GasGiant's destruction threshold was a bare 0.5 simulation units, written when JUPITER_MASS_UNIT was a literal 50 and that meant a hundredth of a Jupiter. Correcting the unit to the real 0.955 silently turned the same literal into half a Jupiter, which is heavier than most gas giants the generator makes. The threshold is a hundredth of a Jupiter again, expressed against the unit rather than against the number the unit used to be.",
      });
    }
  }

  // ===========================================================================
  // 14c. The Three-Body Sensitivity Lab
  // ---------------------------------------------------------------------------
  // The chaos investigation asks a student to draw a physical conclusion from
  // a computed divergence, which is only legitimate if the divergence is a
  // property of the system rather than of the timestep. These checks are the
  // evidence for that, and they are here rather than in a browser test because
  // they are numbers rather than pixels.
  //
  // The configuration is Lagrange's equilateral solution with three equal
  // masses: an exact solution of the three-body problem, linearly unstable by
  // Gascheau's criterion 27(m1m2+m2m3+m3m1) < (m1+m2+m3)^2, which for equal
  // masses reads 81m^2 < 9m^2 and fails by a factor of nine.
  // ===========================================================================
  {
    const G = 2;
    const MASS = 6 * physics.SOLAR_MASS_UNIT;
    const R = 50;
    const SIDE = R * Math.sqrt(3);
    const OMEGA = Math.sqrt((G * 3 * MASS) / SIDE ** 3);
    // The perturbation the lesson applies: 1e-3 simulation units on one
    // coordinate, which is 1,496 km.
    const NUDGE = 1e-3;
    // The lesson's own run length, in simulated seconds.
    const RUN = 200;

    /** Build the lab's three stars. */
    const build = () => {
      for (let i = 0; i < 3; i++) {
        const th = (i * 2 * Math.PI) / 3;
        const x = R * Math.cos(th);
        const y = R * Math.sin(th);
        const star = new physics.StarObject(
          { x, y },
          { x: -OMEGA * y, y: OMEGA * x },
          1
        );
        star.mass = MASS;
        star.name = ['Alpha', 'Beta', 'Gamma'][i];
        star.radius = 8;
        star.persistent = true;
        physics.stars.push(star);
      }
    };

    /** Run the lab and sample it. */
    const runLab = ({ nudge = 0, dt, integrator }) => {
      lab.reset({
        gravitational_constant: G,
        mutual_gravity: true,
        star_only_gravity: false,
        enable_star_merging: false,
        integrator,
      });
      // makeLab's reset does not touch the simulated clock, and these two runs
      // are compared on it: without this the second run's samples start where
      // the first run's ended and the two never overlap.
      physics.resetSimulationTime();
      build();
      if (nudge) physics.stars[0].pos.x += nudge;
      lab.commit();
      const before = physics.conservedQuantities();
      const samples = [];
      let minSeparation = Infinity;
      const steps = Math.round(RUN / dt);
      const every = Math.max(1, Math.round(0.5 / dt));
      for (let i = 0; i < steps; i++) {
        physics.updatePhysics(dt);
        if (i % every) continue;
        const alive = physics.stars.filter(b => b.alive !== false);
        samples.push({
          t: physics.getSimulationTime(),
          bodies: alive.map(b => ({
            id: b.id,
            x: b.pos.x,
            y: b.pos.y,
            vx: b.vel.x,
            vy: b.vel.y,
          })),
        });
        for (let a = 0; a < alive.length; a++) {
          for (let b = a + 1; b < alive.length; b++) {
            minSeparation = Math.min(
              minSeparation,
              hypot(
                alive[a].pos.x - alive[b].pos.x,
                alive[a].pos.y - alive[b].pos.y
              )
            );
          }
        }
      }
      const after = physics.conservedQuantities();
      return {
        samples,
        minSeparation,
        survivors: physics.stars.filter(b => b.alive !== false).length,
        energyDrift: Math.abs((after.energy - before.energy) / before.energy),
        angularDrift: Math.abs(
          (after.angular - before.angular) / before.angular
        ),
      };
    };

    const pair = ({ dt, integrator }) => {
      const a = runLab({ dt, integrator });
      const b = runLab({ nudge: NUDGE, dt, integrator });
      const { series } = chaos.separationSeries(a.samples, b.samples);
      return { a, b, series, verdict: chaos.analyseDivergence(series) };
    };

    const base = pair({ dt: 0.1, integrator: 'Symplectic Euler' });
    const fine = pair({ dt: 0.025, integrator: 'Symplectic Euler' });
    const verlet = pair({ dt: 0.1, integrator: 'Velocity Verlet' });

    // 1. Determinism. Two runs from identical starts, bit for bit.
    {
      const twin = runLab({ dt: 0.1, integrator: 'Symplectic Euler' });
      const { series } = chaos.separationSeries(base.a.samples, twin.samples);
      const worst = Math.max(...series.map(p => p.d));
      add({
        group: 'Three-body sensitivity',
        kind: 'integration',
        name: 'Two identical runs stay identical',
        measured: worst,
        expected: 0,
        unit: 'length units',
        tolerance: 0,
        toleranceKind: 'absolute',
        why: 'Exactly zero, not approximately: the engine is deterministic, so the same initial numbers integrated by the same code give the same trajectory. The chaos investigation rests on this - it is what lets a student attribute a later divergence to the perturbation rather than to the machine - and the lesson opens by having them measure it.',
      });
    }

    // 2. The two-body control. Regular, and not exponential.
    {
      const runBinary = nudge => {
        lab.reset({
          gravitational_constant: G,
          mutual_gravity: true,
          star_only_gravity: false,
          enable_star_merging: false,
          integrator: 'Symplectic Euler',
        });
        physics.resetSimulationTime();
        const a = 100;
        const v = Math.sqrt((G * MASS) / (2 * a));
        for (const [sx, sv, name] of [
          [-a / 2, -v, 'Alpha'],
          [a / 2, v, 'Beta'],
        ]) {
          const star = new physics.StarObject(
            { x: sx, y: 0 },
            { x: 0, y: sv },
            1
          );
          star.mass = MASS;
          star.name = name;
          star.persistent = true;
          physics.stars.push(star);
        }
        if (nudge) physics.stars[0].pos.x += nudge;
        lab.commit();
        const samples = [];
        for (let i = 0; i < RUN / 0.1; i++) {
          physics.updatePhysics(0.1);
          if (i % 5) continue;
          samples.push({
            t: physics.getSimulationTime(),
            bodies: physics.stars.map(b => ({
              id: b.id,
              x: b.pos.x,
              y: b.pos.y,
              vx: b.vel.x,
              vy: b.vel.y,
            })),
          });
        }
        return samples;
      };
      const { series } = chaos.separationSeries(runBinary(0), runBinary(NUDGE));
      const verdict = chaos.analyseDivergence(series);

      add({
        group: 'Three-body sensitivity',
        kind: 'integration',
        name: 'The two-body control drifts linearly, not exponentially',
        measured: verdict.linearR2,
        expected: 1,
        unit: 'r-squared',
        tolerance: 0.02,
        toleranceKind: 'absolute',
        why: 'The same perturbation applied to a two-body orbit separates the two runs in proportion to elapsed time, because a slightly displaced star has a slightly different period and the two runs drift out of phase. A straight line fits it to better than r-squared 0.98. This is the control that stops the lesson mistaking any divergence for chaos.',
      });

      add({
        group: 'Three-body sensitivity',
        kind: 'integration',
        name: 'The two-body control is refused a Lyapunov timescale',
        measured: verdict.tau === null ? 0 : 1,
        expected: 0,
        unit: 'estimates produced',
        tolerance: 0,
        toleranceKind: 'absolute',
        why: 'A log-linear fit can be forced through any increasing series and will produce a confident number with units of time. The analysis in js/chaos/divergence.js refuses, because the growth is not exponential and a straight line fits better. If this ever starts producing a number, the lesson is teaching that ordinary phase drift is chaos.',
      });
    }

    // 3. The three-body pair diverges, exponentially, during the lesson.
    add({
      group: 'Three-body sensitivity',
      kind: 'integration',
      name: 'The three-body pair diverges exponentially',
      measured: base.verdict.r2,
      expected: 1,
      unit: 'r-squared of the log-linear fit',
      tolerance: 0.02,
      toleranceKind: 'absolute',
      why: 'Over the lesson\u2019s own 200 simulated seconds, the separation between the perturbed and unperturbed runs grows by seven orders of magnitude, and the logarithm of it is a straight line in time to better than r-squared 0.98. That is what sensitive dependence looks like when it is measured rather than asserted.',
    });

    add({
      group: 'Three-body sensitivity',
      kind: 'integration',
      name: 'The e-folding time is close to the unstable eigenvalue',
      measured: base.verdict.tau,
      expected: Math.SQRT2 / OMEGA,
      unit: 'simulated seconds',
      tolerance: 0.25,
      why: 'Linear stability analysis of the equilateral solution gives a growth rate of n/sqrt(2) for equal masses, so the e-folding time should be sqrt(2)/n = 6.0 s. The measured value is about 15% longer, which is expected: the fit covers a finite window, the perturbation is finite rather than infinitesimal, and the unstable eigenvalue is complex, so an oscillation rides on the growth. A tolerance of 25% asks the measurement to agree with theory to within that finite-amplitude correction and no more; anything outside it would mean the configuration or the force law had changed.',
    });

    // 4. Refinement. The conclusion has to survive better numerics.
    {
      const verdict = chaos.refinementVerdict([
        { tau: base.verdict.tau, behaviour: base.verdict.behaviour },
        { tau: fine.verdict.tau, behaviour: fine.verdict.behaviour },
        { tau: verlet.verdict.tau, behaviour: verlet.verdict.behaviour },
      ]);
      add({
        group: 'Three-body sensitivity',
        kind: 'integration',
        name: 'The divergence survives a quarter timestep and another integrator',
        measured: verdict.spread,
        expected: 0,
        unit: 'fractional spread in the e-folding time',
        tolerance: 0.2,
        toleranceKind: 'absolute',
        why: 'The lesson\u2019s conclusion is that the divergence is physical, and the only evidence for that is refinement. Symplectic Euler at dt = 0.1 and at dt = 0.025, and Velocity Verlet at dt = 0.1, must agree about the e-folding time. Twenty per cent is the same threshold the widget uses to tell a student their result is resolved, so this check and the classroom verdict cannot disagree.',
      });
    }

    // 5. Conservation, on the run the lesson actually uses.
    add({
      group: 'Three-body sensitivity',
      kind: 'integration',
      name: 'Energy drift over the lesson run',
      measured: base.a.energyDrift,
      expected: 0,
      unit: 'relative',
      tolerance: 2e-3,
      toleranceKind: 'absolute',
      why: 'Symplectic Euler at dt = 0.1 over 200 simulated seconds, which is what a student runs. The bound is set by the measured drift of 5e-4 with room for the close passages that appear once the triangle breaks up, and it is two thousand times smaller than the divergence signal the lesson measures - so the conclusion cannot be an artefact of energy leaking out of the integrator.',
    });

    add({
      group: 'Three-body sensitivity',
      kind: 'integration',
      name: 'Angular momentum drift over the lesson run',
      measured: base.a.angularDrift,
      expected: 0,
      unit: 'relative',
      tolerance: 1e-10,
      toleranceKind: 'absolute',
      why: 'A symplectic integrator conserves angular momentum to round-off for a rotationally symmetric force law, and this configuration is a clean test of that: the measured drift is at 1e-15. A bound of 1e-10 is far above the noise and far below anything that would matter, and it would catch a force law that had stopped being central.',
    });

    // 6. No merger, and nothing close to one.
    add({
      group: 'Three-body sensitivity',
      kind: 'integration',
      name: 'All three stars survive the lesson run',
      measured: base.a.survivors,
      expected: 3,
      unit: 'bodies',
      tolerance: 0,
      toleranceKind: 'absolute',
      why: 'The divergence measure matches bodies by identity, so a merger part-way through would silently change what is being compared. This configuration was chosen partly because it never brings two stars close: the Pythagorean three-body problem, the obvious alternative, merges under every integrator in this engine.',
    });

    add({
      group: 'Three-body sensitivity',
      kind: 'integration',
      name: 'Closest approach stays far outside the collision radius',
      measured: base.a.minSeparation,
      expected: SIDE,
      unit: 'length units',
      tolerance: 0.6,
      why: 'Two stars of drawn radius 8 collide inside 16 units. The closest the three ever come during the lesson run is about 80, five times that, so no collision rule fires and the result does not depend on the merger settings. The tolerance is wide because the closest approach is a chaotic quantity; what matters is the order of magnitude, and the check would fail loudly if the configuration ever started grazing.',
    });
  }

  // ===========================================================================
  // 15. The gravitational-wave inspiral approximation
  // ---------------------------------------------------------------------------
  // Explicitly not general relativity. Validated against the equation the model
  // page says it uses, and then measured against the equation it does not, so
  // the documented departure is a number rather than a disclaimer.
  // ===========================================================================
  {
    const lambda = 0.01;
    const dt = 0.05;
    const steps = 2000;

    // One black hole, alone, so gravity contributes nothing and only the decay
    // term acts. v should follow v0 * (1 - lambda dt)^n exactly.
    lab.reset({ bh_behavior: 'Orbiting', orbit_decay_rate: lambda });
    const solo = new physics.BlackHole(
      { x: 0, y: 0 },
      1000,
      { x: 4, y: 0 },
      true
    );
    solo.isNewlyCreated = false;
    physics.bh_list.push(solo);
    lab.commit();
    lab.step(dt, steps);

    add({
      group: 'Inspiral (approximation)',
      kind: 'approximation',
      name: 'Velocity damping matches the stated constant fractional decay',
      measured: hypot(solo.vel.x, solo.vel.y),
      expected: 4 * (1 - lambda * dt) ** steps,
      unit: 'units per time',
      tolerance: 1e-12,
      why: 'The model page states the inspiral is "each black hole\'s velocity multiplied by a factor slightly less than one on every step". This is that claim, isolated from gravity and checked to machine precision. It validates what the code does, not what nature does.',
    });

    // Now the separation decay of an actual binary under the same term.
    //
    // Damping the speed at rate lambda removes orbital energy at
    // lambda * G M m / a, and with E = -G M m / (2a) that gives
    //
    //     adot = -2 lambda a
    //
    // so the separation decays exponentially with an e-folding time of
    // 1/(2 lambda). That derivation is only valid when the damping is slow
    // compared with the orbit - it assumes the orbit stays near-circular while
    // it shrinks - so lambda is chosen here to make lambda * P about 0.02.
    // The default orbit_decay_rate of 0.005 is *not* in that regime for a
    // typical scenario separation, which is a property of the model worth
    // knowing and is recorded in PHYSICS_VALIDATION.md rather than checked
    // here: this check is about whether the implemented term obeys the law it
    // is derived from, not about whether every scenario uses it adiabatically.
    const M = 1000;
    const sep0 = 300;
    const orbitPeriod = 2 * Math.PI * Math.sqrt(sep0 ** 3 / (1 * 2 * M));
    const slowLambda = 0.02 / orbitPeriod;
    lab.reset({ bh_behavior: 'Orbiting', orbit_decay_rate: slowLambda });
    const vRel = Math.sqrt((1 * (2 * M)) / sep0);
    const h1 = new physics.BlackHole(
      { x: -sep0 / 2, y: 0 },
      M,
      { x: 0, y: -vRel / 2 },
      true
    );
    const h2 = new physics.BlackHole(
      { x: sep0 / 2, y: 0 },
      M,
      { x: 0, y: vRel / 2 },
      true
    );
    h1.isNewlyCreated = false;
    h2.isNewlyCreated = false;
    physics.bh_list.push(h1, h2);
    lab.commit();

    const samples = [];
    const bdt = 0.1;
    // Long enough for the separation to fall by about a third, which is plenty
    // to fit an exponential and still far from the radii touching.
    const totalTime = 0.4 / (2 * slowLambda);
    const nSteps = Math.round(totalTime / bdt);
    const sampleEvery = Math.max(1, Math.floor(nSteps / 200));
    lab.step(bdt, nSteps, i => {
      if (i % sampleEvery === 0) {
        samples.push({
          t: i * bdt,
          a: hypot(h1.pos.x - h2.pos.x, h1.pos.y - h2.pos.y),
        });
      }
    });

    /** Slope of ln a against t, which is adot/a. */
    const logSlope = arr => {
      const mt = arr.reduce((acc, q) => acc + q.t, 0) / arr.length;
      const ml = arr.reduce((acc, q) => acc + Math.log(q.a), 0) / arr.length;
      let nn = 0;
      let dd = 0;
      for (const q of arr) {
        nn += (q.t - mt) * (Math.log(q.a) - ml);
        dd += (q.t - mt) ** 2;
      }
      return nn / dd;
    };

    add({
      group: 'Inspiral (approximation)',
      kind: 'approximation',
      name: 'Separation decays exponentially at -2 * decay rate',
      measured: logSlope(samples) / -slowLambda,
      expected: 2,
      unit: 'multiples of the decay rate',
      tolerance: 5e-2,
      why: 'The consequence of the damping term for a near-circular orbit: adot = -2 lambda a, derived above and measured here from an integrated black-hole binary rather than assumed. 5% covers the orbit acquiring a small eccentricity as it shrinks and the fit being over a finite window.',
    });

    add({
      group: 'Inspiral (approximation)',
      kind: 'approximation',
      name: 'Decay is exponential in time, not the GR power law',
      // Peters (1964): adot is proportional to a^-3, so the fractional decay
      // rate adot/a goes as a^-4 and accelerates violently as the binary
      // tightens. Here adot/a is a constant, so the late-window rate and the
      // early-window rate are the same.
      measured: (() => {
        const half = Math.floor(samples.length / 2);
        return logSlope(samples.slice(half)) / logSlope(samples.slice(0, half));
      })(),
      expected: 1,
      unit: 'late rate / early rate',
      tolerance: 5e-2,
      why: 'A documented departure from general relativity, quantified rather than merely disclaimed. Real gravitational-wave emission gives adot proportional to a^-3, so the fractional decay rate goes as a^-4: across a window in which the separation falls by a third, the late rate would be 3.4 times the early one. Here it is 1, because the model is a constant fractional damping of velocity. This check PASSES when the code matches its own documentation - the model page states that "the characteristic runaway at the end is not reproduced" - and it would FAIL if someone silently swapped in a different decay law without updating that page.',
      source: 'Peters (1964) Phys. Rev. 136, B1224',
    });

    // And the size of the departure, stated as the number it actually is.
    add({
      group: 'Inspiral (approximation)',
      kind: 'approximation',
      name: 'GR would give a late/early rate ratio of 3.4 over this window',
      measured: (samples[0].a / samples[samples.length - 1].a) ** 4,
      // The window is sized so that ln(a_start / a_end) = 0.4, so GR's a^-4
      // fractional decay rate would grow by exp(4 * 0.4) across it.
      expected: Math.exp(1.6),
      unit: 'ratio GR would show',
      tolerance: 0.1,
      why: "Not a test of Gravitas, but the number that makes the previous check mean something. The window is deliberately sized so the separation falls by a factor exp(0.4); under Peters' quadrupole formula the fractional decay rate goes as a^-4, so it would rise by exp(1.6) = 4.95 across the same window. The previous check confirms the implemented model holds that ratio at 1.00 within 5%. In other words: the quantity this model does not reproduce is one general relativity would move by a factor of five, and the suite measures the gap rather than asserting it.",
      source: 'Peters (1964) Phys. Rev. 136, B1224',
    });
  }

  // ===========================================================================
  // 16. Stored parameters for real systems
  // ===========================================================================
  {
    const star = trappist.TRAPPIST1_STAR;
    add({
      group: 'Real systems',
      kind: 'data',
      name: 'TRAPPIST-1 stellar mass',
      measured: star.massInSuns,
      expected: REF.trappist1MassSuns,
      unit: 'M_sun',
      tolerance: 1e-9,
      source: 'Agol et al. (2021) PSJ 2, 1',
      why: 'A stored parameter checked against its published source. Tolerance is essentially exact because the stored value should be a transcription, not a derivation.',
    });

    add({
      group: 'Real systems',
      kind: 'data',
      name: 'TRAPPIST-1 stellar radius',
      measured: star.radiusInSuns,
      expected: REF.trappist1RadiusSuns,
      unit: 'R_sun',
      tolerance: 1e-9,
      source: 'Agol et al. (2021) PSJ 2, 1',
      why: 'A transcription, so it is checked essentially exactly. The stellar radius sets every transit depth in this system, so an error here would propagate into seven light curves.',
    });

    add({
      group: 'Real systems',
      kind: 'data',
      name: 'TRAPPIST-1 luminosity',
      measured: star.luminosityInSuns,
      expected: REF.trappist1LuminositySuns,
      unit: 'L_sun',
      tolerance: 2e-3,
      source: 'Ducrot et al. (2020) A&A 640, A112',
      why: 'Stored as 5.53e-4. This is the value that must be measured rather than derived: a main-sequence mass-luminosity relation puts this star out by more than an order of magnitude and its habitable zone out by a factor of four.',
    });

    add({
      group: 'Real systems',
      kind: 'data',
      name: 'TRAPPIST-1 effective temperature',
      measured: star.temperatureK,
      expected: REF.trappist1TeffK,
      unit: 'K',
      tolerance: 1e-9,
      source: 'Agol et al. (2021) PSJ 2, 1',
      why: 'A transcription. This is the value fed to the habitable-zone polynomial, and it is also the value that falls below the range that polynomial was fitted over - which the model reports rather than hides.',
    });

    // Every planet, against Kepler's third law with the stored stellar mass.
    // This is the strongest single consistency test on a stored system: seven
    // independent (a, P) pairs that must all imply the same central mass.
    const implied = trappist.TRAPPIST1_PLANETS.map(
      p => p.a ** 3 / (p.periodDays / 365.25) ** 2
    );
    const worst = Math.max(
      ...implied.map(m => Math.abs(m - star.massInSuns) / star.massInSuns)
    );
    add({
      group: 'Real systems',
      kind: 'data',
      name: 'All seven TRAPPIST-1 planets imply the stored stellar mass',
      measured: worst,
      expected: 0,
      unit: 'worst relative deviation',
      tolerance: 1.5e-2,
      toleranceKind: 'absolute',
      why: 'a^3/P^2 must equal M* in AU, years and solar masses, for every planet. The stored semi-major axes are quoted to three figures and the periods to five, so the ratio inherits roughly a 1% rounding uncertainty from the axes alone; 1.5% is that, and it would still catch a transposed digit or a wrong unit anywhere in the table.',
      source: 'Agol et al. (2021) PSJ 2, 1',
    });

    add({
      group: 'Real systems',
      kind: 'data',
      name: 'TRAPPIST-1 planets are ordered by distance',
      measured: trappist.TRAPPIST1_PLANETS.every(
        (p, i) => i === 0 || p.a > trappist.TRAPPIST1_PLANETS[i - 1].a
      ),
      expected: true,
      why: 'b through h, in order. A table that had drifted out of order would still pass every arithmetic check above, and the lesson names the planets by letter.',
      source: 'Agol et al. (2021) PSJ 2, 1',
    });

    // HD 209458.
    const hd = exoSystems.HD209458;
    const hdImplied =
      hd.planet.semiMajorAU ** 3 / (hd.planet.periodDays / 365.25) ** 2;
    add({
      group: 'Real systems',
      kind: 'data',
      name: "HD 209458's a and P imply its stored stellar mass",
      measured: hdImplied,
      expected: hd.star.massSolar,
      unit: 'M_sun',
      tolerance: 5e-3,
      why: 'Same test as TRAPPIST-1, on the system the transit lesson uses. The stored axis carries four figures, so half a percent is the rounding it inherits.',
      source: 'Torres, Winn & Holman (2008) ApJ 677, 1324',
    });

    const kHd =
      (hd.planet.radiusJupiter * constants.JUPITER_RADIUS_M) /
      (hd.star.radiusSolar * constants.SOLAR_RADIUS_M);
    add({
      group: 'Real systems',
      kind: 'data',
      name: 'HD 209458 b transit depth from the stored radii',
      measured: k2Percent(kHd),
      expected: REF.hd209458DepthPercent,
      unit: '%',
      tolerance: 3e-2,
      why: 'The geometric depth (Rp/Rs)^2, computed from the stored planet and stellar radii, against the measured depth the lesson quotes. They agree to 0.5%, which is the point: a student who measures 1.5% and solves for a radius gets the stored radius back. 3% is the spread in published depths across instruments and bandpasses.',
      source: 'Charbonneau et al. (2000) ApJ 529, L45',
    });

    add({
      group: 'Real systems',
      kind: 'data',
      name: 'HD 209458 b is a hot Jupiter by bulk density',
      measured: observables.planetBulkDensity({
        massJupiter: hd.planet.massJupiter,
        radiusJupiter: hd.planet.radiusJupiter,
      }).gramsPerCm3,
      expected: 0.33,
      unit: 'g/cm^3',
      tolerance: 3e-2,
      why: 'The inflated-radius result the system is famous for: less than a third the density of water. Computed from the stored mass and radius; the published value is 0.33 to two figures.',
      source: 'Southworth (2010) MNRAS 408, 1689',
    });

    const sunJup = exoSystems.SUN_JUPITER;
    add({
      group: 'Real systems',
      kind: 'data',
      name: "Jupiter's a and P imply one solar mass",
      measured:
        sunJup.planet.semiMajorAU ** 3 /
        (sunJup.planet.periodDays / 365.25) ** 2,
      expected: 1,
      unit: 'M_sun',
      tolerance: 3e-3,
      why: "Kepler's third law in the units it was written for, on the pair that defined them. Any error in the stored axis or period shows up here immediately. The 0.09% residual is real and not rounding: the stored period is Jupiter's sidereal period and the stored axis its mean semi-major axis, and the two-body relation neglects the rest of the Solar System, chiefly Saturn.",
      source: 'JPL Horizons mean orbital elements',
    });

    add({
      group: 'Real systems',
      kind: 'data',
      name: 'Earth bulk density from stored constants',
      measured: observables.planetBulkDensity({ massEarth: 1, radiusEarth: 1 })
        .gramsPerCm3,
      expected: 5.51,
      unit: 'g/cm^3',
      tolerance: 5e-3,
      source: 'NASA Earth fact sheet',
      why: 'Uses the equatorial radius, which is what the stored constant is; the published 5.514 g/cm^3 uses the volumetric mean radius, and the two differ by about 0.3%.',
    });
  }

  // ===========================================================================
  // 15. Orbital resonance
  // ---------------------------------------------------------------------------
  // The When Orbits Lock investigation asks a student to conclude that three
  // systems are resonant and two others are not, on the strength of what an
  // angle does over a few minutes of watching. That conclusion is only worth
  // anything if the angle is doing what the physics says rather than what the
  // integrator says, so these checks measure the same quantities the lesson
  // does, from the same parameter tables, and hold them to published values.
  //
  // Everything here reads js/resonance/systems.js, which is what the scenarios
  // in js/ui.js are built from. There is no second copy of a moon's period.
  //
  // Three sorts of check:
  //
  //   the resonance is reproduced   libration centres, amplitudes and periods
  //                                 against Lieske, Williams & Benson and the
  //                                 linearised tadpole formula
  //   the controls behave           the detuned moons and the non-resonant
  //                                 bodies circulate, and the unstable
  //                                 equilibrium departs
  //   it is physics, not arithmetic conservation, no contacts, and the
  //                                 classification unchanged under refinement
  // ===========================================================================
  {
    const G = 2;

    /**
     * Install a system from js/resonance/systems.js into the engine.
     * @param {object} spec - {primary, bodies}
     * @param {object} settings - Overrides, chiefly the softening floor
     * @returns {Map<string, object>} The live bodies, by name
     */
    const install = (spec, settings) => {
      lab.reset({
        gravitational_constant: G,
        mutual_gravity: true,
        star_only_gravity: false,
        enable_star_merging: false,
        dynamic_object_properties: false,
        integrator: 'Velocity Verlet',
        show_trails: false,
        ...settings,
      });
      physics.resetSimulationTime();
      const made = new Map();
      for (const d of [spec.primary, ...spec.bodies]) {
        let body;
        if (d.kind === 'star') {
          body = new physics.StarObject(
            { ...d.pos },
            { ...d.vel },
            d.mass / 1000
          );
          body.intact = true;
          physics.stars.push(body);
        } else if (d.kind === 'gasGiant') {
          body = new physics.GasGiant({ ...d.pos }, { ...d.vel }, 1);
          physics.gas_giants.push(body);
        } else {
          body = new physics.Planet({ ...d.pos }, { ...d.vel }, 1);
          physics.planets.push(body);
        }
        body.mass = d.mass;
        body.name = d.name;
        body.radius = d.radius;
        body.persistent = true;
        made.set(d.name, body);
      }
      lab.commit();
      return made;
    };

    /**
     * Run and sample. Returns the elements of every body at every sample, plus
     * the conservation drift and the closest approach between any two bodies.
     */
    const integrate = (made, primaryName, { dt, total, every }) => {
      const before = physics.conservedQuantities();
      const names = [...made.keys()].filter(n => n !== primaryName);
      const primary = made.get(primaryName);
      const rows = [];
      const closest = new Map();
      const steps = Math.round(total / dt);
      const stride = Math.max(1, Math.round(every / dt));
      let contacts = 0;
      for (let i = 0; i < steps; i++) {
        physics.updatePhysics(dt);
        if (i % stride) continue;
        const el = {};
        for (const n of names) {
          const e = resonance.resonanceElements(made.get(n), primary, G);
          if (e) el[n] = e;
        }
        rows.push({ t: physics.getSimulationTime(), el });
        const all = [primaryName, ...names];
        for (let a = 0; a < all.length; a++) {
          for (let b = a + 1; b < all.length; b++) {
            const A = made.get(all[a]);
            const B = made.get(all[b]);
            const d = hypot(A.pos.x - B.pos.x, A.pos.y - B.pos.y);
            const key = `${all[a]}|${all[b]}`;
            if (!closest.has(key) || d < closest.get(key)) closest.set(key, d);
            if (d < A.radius + B.radius) contacts++;
          }
        }
      }
      const after = physics.conservedQuantities();
      return {
        rows,
        closest,
        contacts,
        survivors: physics.planets.length + physics.gas_giants.length,
        energyDrift: Math.abs((after.energy - before.energy) / before.energy),
        angularDrift: Math.abs(
          (after.angular - before.angular) / before.angular
        ),
      };
    };

    /** Mean measured period of a body over the whole record. */
    const meanPeriod = (rows, name) => {
      let sum = 0;
      let n = 0;
      for (const r of rows) {
        const p = r.el[name]?.period;
        if (Number.isFinite(p) && p > 0) {
          sum += p;
          n++;
        }
      }
      return n ? sum / n : NaN;
    };

    const synodic = (a, b) => Math.abs(1 / (1 / a - 1 / b));

    // --- The Galilean moons ------------------------------------------------
    //
    // Run to 1,400 Io orbits, which is a little over one Laplace libration.
    // A step of 1.0 is 680 substeps per Io orbit, and the refinement check
    // below shows the answer is converged there.
    const galileanRun = ({ dt = 1, detune = 1, orbits = 1400 } = {}) => {
      const spec = systems.galileanBodies(G, { detune });
      systems.balance([spec.primary, ...spec.bodies]);
      const made = install(spec, { min_interaction_distance: 0.05 });
      const run = integrate(made, 'Jupiter', {
        dt,
        total: orbits * spec.periodIo,
        every: 0.1 * spec.periodIo,
      });
      const pIo = meanPeriod(run.rows, 'Io');
      const pEu = meanPeriod(run.rows, 'Europa');
      const laplace = run.rows.map(r => ({
        t: r.t,
        phi: resonance.laplaceArgument(
          r.el.Io?.lambda,
          r.el.Europa?.lambda,
          r.el.Ganymede?.lambda
        ),
      }));
      return {
        ...run,
        spec,
        periodIo: pIo,
        verdict: resonance.classifyAngle(laplace, {
          referencePeriod: synodic(pIo, pEu),
        }),
      };
    };

    const galilean = galileanRun();

    // 1. The period ratios are the published ones.
    {
      const pairs = [
        ['Europa', 'Io', systems.GALILEAN.published.ratioEuropaIo],
        ['Ganymede', 'Europa', systems.GALILEAN.published.ratioGanymedeEuropa],
        ['Ganymede', 'Io', systems.GALILEAN.published.ratioGanymedeIo],
        ['Callisto', 'Ganymede', REF.ganymedeCallistoRatio],
      ];
      for (const [outer, inner, expected] of pairs) {
        add({
          group: 'Orbital resonance',
          kind: 'integration',
          name: `${outer} over ${inner} matches the published period ratio`,
          measured:
            meanPeriod(galilean.rows, outer) / meanPeriod(galilean.rows, inner),
          expected,
          tolerance: 1e-3,
          why: "The moons are placed from their published periods, so a ratio that came out wrong would mean the mutual perturbations had moved a mean motion rather than that the table was misread. A tenth of a percent is well inside the two-tenths the resonance itself permits, and is the width of the lesson's own claim that the ratios are near but not equal to 2:1.",
          source: 'JPL Solar System Dynamics satellite mean elements',
        });
      }
    }

    // 2. The Laplace argument librates about 180 degrees.
    add({
      group: 'Orbital resonance',
      kind: 'integration',
      name: 'The Laplace argument librates rather than circulating',
      measured: galilean.verdict.state === resonance.ANGLE_STATE.LIBRATION,
      expected: true,
      why: 'The claim the whole investigation turns on. Over 1,400 Io orbits the argument must be seen to turn back and return, which is the only evidence that separates a resonance from a near-commensurate pair. A run of 300 orbits is deliberately not enough and the classifier says so; this one is.',
    });

    add({
      group: 'Orbital resonance',
      kind: 'integration',
      name: 'The Laplace libration is centred on 180 degrees',
      measured: galilean.verdict.centre,
      expected: REF.laplaceCentreDeg,
      unit: 'degrees',
      tolerance: 3,
      toleranceKind: 'absolute',
      why: 'Exactly 180 is the analytic value, and it is what makes the three moons unable to meet. Three degrees is the width of the numerical wobble at this step; anything larger would mean the equilibrium had moved, which is a different system.',
      source: 'Murray & Dermott, Solar System Dynamics (1999) §8.9',
    });

    add({
      group: 'Orbital resonance',
      kind: 'integration',
      name: 'The Laplace libration period matches the observed one',
      measured: systems.simSecondsToDays(
        galilean.verdict.period,
        systems.TIME_SCALE_JOVIAN
      ),
      expected: REF.laplacePeriodDays,
      unit: 'days',
      tolerance: 0.08,
      why: 'The strongest single result in this group: a libration period computed by the engine from published orbital elements, against one measured from the real moons. Eight percent covers the finite-amplitude correction - this model librates at 26 degrees where the real system librates at 0.064, and the period of a pendulum grows with amplitude - plus the couple of percent the timestep contributes.',
      source:
        'Lieske (1998) A&AS 129, 205; Musotto et al. (2002) Icarus 159, 500',
    });

    // 3. Conservation, and nothing touching anything.
    add({
      group: 'Orbital resonance',
      kind: 'integration',
      name: 'Energy is conserved across the Galilean run',
      measured: galilean.energyDrift,
      expected: 0,
      tolerance: 1e-6,
      toleranceKind: 'absolute',
      why: 'Velocity Verlet is symplectic, so the energy error over 950,000 steps is bounded rather than accumulating. A part in a million is two orders of magnitude below the fractional change that would move the measured libration period by its own tolerance.',
    });

    add({
      group: 'Orbital resonance',
      kind: 'integration',
      name: 'Angular momentum is conserved across the Galilean run',
      measured: galilean.angularDrift,
      expected: 0,
      tolerance: 1e-11,
      toleranceKind: 'absolute',
      why: 'Angular momentum is exact for a central-force integrator up to rounding, so this is a floating-point bound rather than a physical one. It is here because a body silently removed or added mid-run would break it long before it broke the energy.',
    });

    add({
      group: 'Orbital resonance',
      kind: 'integration',
      name: 'No two Galilean bodies ever touch',
      measured: galilean.contacts,
      expected: 0,
      tolerance: 0,
      toleranceKind: 'absolute',
      why: 'The moons are drawn twenty times life size so they can be seen at all, and js/physics.js runs a contact test on planets that separates an overlapping pair, exchanges momentum between them and above 15 units per second of relative speed makes debris with Math.random(). One contact would destroy both the orbit and the reproducibility. The margin is a factor of three on every pair, and this is the check that says the enlargement stayed cosmetic.',
    });

    add({
      group: 'Orbital resonance',
      kind: 'integration',
      name: 'All four moons survive the Galilean run',
      measured: galilean.survivors,
      expected: 4,
      tolerance: 0,
      toleranceKind: 'absolute',
      why: 'Every measurement in the lesson matches bodies between samples by name, so a body removed by a merge or a cull would not produce a wrong answer - it would produce no answer, silently, part way through.',
    });

    // 4. Refinement: the classification must not be the integrator's.
    {
      const fine = galileanRun({ dt: 0.5 });
      const coarse = galileanRun({ dt: 2 });
      const period = v =>
        systems.simSecondsToDays(v.period, systems.TIME_SCALE_JOVIAN);

      add({
        group: 'Orbital resonance',
        kind: 'integration',
        name: 'The Laplace verdict survives halving the timestep',
        measured:
          fine.verdict.state === galilean.verdict.state &&
          coarse.verdict.state === galilean.verdict.state,
        expected: true,
        why: 'Qualitative agreement first: a conclusion that changed from libration to circulation when the step changed would be a statement about the integrator. Steps of 2, 1 and 0.5 all report libration.',
      });

      add({
        group: 'Orbital resonance',
        kind: 'integration',
        name: 'The Laplace libration period survives halving the timestep',
        measured: Math.abs(period(fine.verdict) - period(galilean.verdict)),
        expected: 0,
        unit: 'days',
        tolerance: 120,
        toleranceKind: 'absolute',
        why: 'Quantitative agreement second, and to a looser bound: 120 days is six percent of the period, which is smaller than the eight percent the published comparison is allowed and therefore cannot be what makes that check pass. Symplectic Euler at the same step gets this wrong by a factor of four, which is why these scenarios do not use it.',
      });
    }

    // 5. The control: one percent out and the lock is gone.
    {
      const broken = galileanRun({
        detune: systems.GALILEAN.detune,
        orbits: 300,
      });
      add({
        group: 'Orbital resonance',
        kind: 'integration',
        name: 'Moving Europa one percent out makes the argument circulate',
        measured: broken.verdict.state === resonance.ANGLE_STATE.CIRCULATION,
        expected: true,
        why: 'The paired control the lesson runs. Without it a librating angle could be an artefact of the instrument; with it, the same instrument on the same system with one number changed reports the opposite. The resonance holds Europa to about a part in a thousand, so one part in a hundred is ten times outside it.',
      });

      add({
        group: 'Orbital resonance',
        kind: 'integration',
        name: 'The broken resonance circulates fast enough to watch',
        measured: broken.verdict.period / broken.periodIo,
        expected: 47,
        unit: 'Io orbits',
        tolerance: 0.25,
        why: 'A lesson claim rather than a physical constant: the contrast is only useful if the student sees a completed circuit in the first few seconds. Forty-seven Io orbits is about nine seconds at the scenario speed. The tolerance is wide because the number is a property of how far out of resonance the control was put, which was a choice.',
      });
    }

    // --- Pluto and Neptune --------------------------------------------------
    const plutoRun = ({ dt = 60, cycles = 3 } = {}) => {
      const spec = systems.plutoBodies(G);
      systems.balance([spec.primary, ...spec.bodies]);
      const made = install(spec, { min_interaction_distance: 1 });
      const pN =
        2 * Math.PI * Math.sqrt(spec.semiMajorNeptune ** 3 / (G * 1000));
      const run = integrate(made, 'Sun', {
        dt,
        total: cycles * 119 * pN,
        every: 0.05 * pN,
      });
      const periodN = meanPeriod(run.rows, 'Neptune');
      const periodP = meanPeriod(run.rows, 'Pluto');
      const ref = synodic(periodN, periodP);
      const argument = name =>
        run.rows.map(r => ({
          t: r.t,
          phi: resonance.plutoArgument(
            r.el[name]?.lambda,
            r.el.Neptune?.lambda,
            r.el[name]?.varpi
          ),
        }));
      // Where Pluto sits on its own orbit at each conjunction. A true anomaly
      // of 180 degrees is aphelion, which is the protection mechanism.
      const events = resonance.conjunctions(
        run.rows.map(r => ({
          t: r.t,
          inner: r.el.Neptune?.lambda,
          outer: r.el.Pluto?.lambda,
        }))
      );
      const anomalies = [];
      let cursor = 0;
      for (const e of events) {
        while (cursor < run.rows.length - 1 && run.rows[cursor + 1].t <= e.t)
          cursor++;
        const f = run.rows[cursor]?.el.Pluto?.trueAnomaly;
        if (Number.isFinite(f)) anomalies.push({ longitude: f });
      }
      return {
        ...run,
        periodN,
        periodP,
        verdict: resonance.classifyAngle(argument('Pluto'), {
          referencePeriod: ref,
        }),
        rogue: resonance.classifyAngle(argument('Unbound Wanderer'), {
          referencePeriod: ref,
        }),
        atConjunction: resonance.conjunctionCluster(anomalies),
      };
    };

    const pluto = plutoRun();

    add({
      group: 'Orbital resonance',
      kind: 'data',
      name: 'Neptune and Pluto are placed on the exact 3:2',
      measured: pluto.periodP / pluto.periodN,
      expected: 1.5,
      tolerance: 2e-3,
      why: "Pluto is placed at a_Neptune (3/2)^(2/3) rather than at its observed 39.482 AU, because the 0.2% difference between the two is taken up in the real system by the precession of Pluto's perihelion, which a point-mass model does not reproduce at the right rate. This check is that the placement did what it says; the comparison with the observed 1.5046 belongs to the lesson.",
      source: 'NASA planetary fact sheets',
    });

    add({
      group: 'Orbital resonance',
      kind: 'integration',
      name: "Pluto's 3:2 argument librates",
      measured: pluto.verdict.state === resonance.ANGLE_STATE.LIBRATION,
      expected: true,
      why: 'Cohen and Hubbard found this in 1965 by integrating the orbit forward, and it is the reason a body whose orbit crosses Neptune has survived for the age of the Solar System.',
      source: 'Cohen & Hubbard (1965) AJ 70, 10',
    });

    add({
      group: 'Orbital resonance',
      kind: 'integration',
      name: "Pluto's libration is centred on 180 degrees",
      measured: pluto.verdict.centre,
      expected: REF.plutoCentreDeg,
      unit: 'degrees',
      tolerance: 2,
      toleranceKind: 'absolute',
      why: "One line of algebra makes this the whole protection mechanism: at a conjunction the two mean longitudes cancel and the argument becomes the conjunction longitude minus Pluto's perihelion, so a centre of 180 degrees says every conjunction happens at aphelion.",
      source: 'Williams & Benson (1971) AJ 76, 167',
    });

    add({
      group: 'Orbital resonance',
      kind: 'integration',
      name: "Pluto's libration amplitude matches the observed one",
      measured: pluto.verdict.amplitude,
      expected: REF.plutoLibrationAmplitudeDeg,
      unit: 'degrees',
      tolerance: 0.06,
      why: 'The amplitude is set by the starting offset, which was chosen as 80 degrees from the centre to reproduce the observed libration; this checks that the planar model then holds it there rather than drifting off it over three full cycles. Six percent is the spread across the timesteps tried.',
      source: 'Williams & Benson (1971) AJ 76, 167',
    });

    add({
      group: 'Orbital resonance',
      kind: 'integration',
      name: "Pluto's libration period matches the observed one",
      measured: systems.simSecondsToYears(pluto.verdict.period),
      expected: REF.plutoLibrationYears,
      unit: 'years',
      tolerance: 0.03,
      why: "A twenty-thousand-year period recovered from published orbital elements by an engine that knows nothing about the resonance. Three percent covers the planar approximation - the real libration is coupled to Pluto's 17 degree inclination, which this model projects away - and leaves no room for a timestep artefact.",
      source: 'Williams & Benson (1971) AJ 76, 167; Malhotra & Williams (1997)',
    });

    add({
      group: 'Orbital resonance',
      kind: 'integration',
      name: 'Every Pluto-Neptune conjunction happens near Pluto’s aphelion',
      measured: pluto.atConjunction.mean,
      expected: 180,
      unit: 'degrees of true anomaly',
      tolerance: 10,
      toleranceKind: 'absolute',
      why: 'The consequence of the libration, measured independently of it: over a hundred and twenty conjunctions, the mean position of Pluto on its own orbit at the moment of line-up. A true anomaly of 180 degrees is aphelion, 49 AU out. The check is deliberately of the conjunctions rather than of the angle, because a student is asked to read this off a different instrument.',
    });

    add({
      group: 'Orbital resonance',
      kind: 'integration',
      name: 'Pluto never comes close to Neptune',
      measured: pluto.closest.get('Neptune|Pluto') / 100,
      expected: REF.plutoNeptuneMinimumAU,
      unit: 'AU',
      tolerance: 0.12,
      why: "The observed minimum separation is 17.2 AU. This model gives about 16.6, and the difference is the inclination: Pluto's orbit is tilted 17 degrees and Gravitas is two-dimensional, so the projection removes the vertical separation that keeps the real minimum higher. Twelve percent bounds that projection error; the check exists to catch a Pluto that wandered out of the resonance, which would bring the figure down by a factor of three.",
      source: 'Cohen & Hubbard (1965) AJ 70, 10',
    });

    add({
      group: 'Orbital resonance',
      kind: 'integration',
      name: 'The unprotected body on the same orbit does come close',
      measured: pluto.closest.get('Neptune|Unbound Wanderer') / 100 < 8,
      expected: true,
      why: 'The control for the check above. A body four percent further out - same eccentricity, same perihelion direction, outside the resonance - passes within about 5 AU of Neptune and has its orbit changed. Without it, "Pluto stays 17 AU away" could just be a fact about crossing orbits rather than about the resonance.',
    });

    add({
      group: 'Orbital resonance',
      kind: 'integration',
      name: "The unprotected body's argument circulates",
      measured: pluto.rogue.state === resonance.ANGLE_STATE.CIRCULATION,
      expected: true,
      why: 'And it circulates while Pluto librates, in the same run, under the same integrator, measured by the same code. That is what makes the libration a property of the resonance rather than of the instrument.',
    });

    add({
      group: 'Orbital resonance',
      kind: 'integration',
      name: 'Energy is conserved across the Pluto run',
      measured: pluto.energyDrift,
      expected: 0,
      tolerance: 1e-6,
      toleranceKind: 'absolute',
      why: 'Sixty thousand years of integration at 390 steps per Neptune orbit. The bound is the same as for the moons because the same integrator is doing the same job; the run is longer and the eccentricity higher, and it still holds.',
    });

    {
      const fine = plutoRun({ dt: 30, cycles: 1.6 });
      const coarse = plutoRun({ dt: 120, cycles: 1.6 });
      add({
        group: 'Orbital resonance',
        kind: 'integration',
        name: "Pluto's libration period survives quartering the timestep",
        measured:
          Math.abs(
            systems.simSecondsToYears(fine.verdict.period) -
              systems.simSecondsToYears(coarse.verdict.period)
          ) / systems.simSecondsToYears(fine.verdict.period),
        expected: 0,
        tolerance: 0.01,
        toleranceKind: 'absolute',
        why: 'Steps of 120, 60 and 30 simulated seconds - 195, 390 and 780 per Neptune orbit - agree on the libration period to under one percent, which is well inside the three percent the published comparison allows. The scenario runs at 60.',
      });
    }

    // --- Jupiter's Trojans ---------------------------------------------------
    const trojanRun = ({ dt = 4, orbits = 40 } = {}) => {
      const spec = systems.trojanBodies(G);
      const made = install(spec, { min_interaction_distance: 0.5 });
      const run = integrate(made, 'Sun', {
        dt,
        total: orbits * spec.period,
        every: 0.04 * spec.period,
      });
      const sun = made.get('Sun');
      const jupiter = made.get('Jupiter');
      const classify = name =>
        resonance.classifyAngle(
          run.rows.map(r => {
            const e = r.el[name];
            const j = r.el.Jupiter;
            return {
              t: r.t,
              phi:
                e && j
                  ? resonance.wrap360(e.trueLongitude - j.trueLongitude)
                  : NaN,
            };
          }),
          { referencePeriod: spec.period }
        );
      return { ...run, spec, sun, jupiter, classify };
    };

    const trojans = trojanRun();

    add({
      group: 'Orbital resonance',
      kind: 'analytic',
      name: 'Gascheau’s criterion is satisfied for the Sun and Jupiter',
      measured: (1 - trojans.spec.massRatio) / trojans.spec.massRatio,
      expected: 1047.3486,
      tolerance: 1e-6,
      why: 'The triangular points are stable when the primary exceeds 24.96 times the secondary, which Gascheau proved in 1843. The Sun is 1,047 times Jupiter, so they are, and every check below depends on it. If this ratio were under 25 the Trojans would not exist and the scenario would be showing something else.',
      source: 'Gascheau (1843); Routh (1875)',
    });

    add({
      group: 'Orbital resonance',
      kind: 'integration',
      name: 'A body placed exactly at L4 stays there',
      measured: trojans.classify('L4 probe').span,
      expected: 0,
      unit: 'degrees',
      tolerance: 0.25,
      toleranceKind: 'absolute',
      why: "Lagrange's 1772 result, as a measurement: at the far vertex of an equilateral triangle with the Sun and Jupiter, the net force is exactly the centripetal one the body needs, so it does not move in the rotating frame at all. A quarter of a degree over forty Jupiter years is the numerical floor, and it is also the threshold the classifier uses to call an angle stationary rather than slowly librating.",
      source: 'Lagrange (1772)',
    });

    add({
      group: 'Orbital resonance',
      kind: 'integration',
      name: 'Patroclus librates about L5 rather than about anything else',
      measured: resonance.wrap180(trojans.classify('Patroclus').centre + 60),
      expected: 0,
      unit: 'degrees from L5',
      tolerance: 8,
      toleranceKind: 'absolute',
      why: 'L5 is 60 degrees behind Jupiter, so a libration centre of -60 is the whole claim. It is not exactly -60: a finite-amplitude tadpole is not symmetric about the point it encircles, and the centre of a 24 degree libration sits a few degrees inside it. Eight degrees bounds that asymmetry.',
    });

    add({
      group: 'Orbital resonance',
      kind: 'integration',
      name: 'The tadpole period matches the linearised prediction',
      measured: trojans.classify('Patroclus').period / trojans.spec.period,
      expected: REF.tadpolePeriodJupiterYears,
      unit: 'Jupiter years',
      tolerance: 0.07,
      why: 'The small-amplitude formula is P / sqrt(27 mu / 4) from the linearised restricted three-body problem, which gives 12.47 Jupiter years. This libration has an amplitude of 24 degrees, which is not small, and a finite-amplitude libration is slower than the linear one - seven percent covers that, and the L4 probe above confirms the linear limit separately.',
      source: 'Murray & Dermott, Solar System Dynamics (1999) §3.9',
    });

    add({
      group: 'Orbital resonance',
      kind: 'integration',
      name: 'A probe one degree from L3 does not stay there',
      measured: trojans.classify('L3 probe').span > 100,
      expected: true,
      why: "L3 is an equilibrium and an unstable one: the linearised growth time is about 3.2 Jupiter years, so a one degree displacement reaches a hundred and eighty in roughly twenty-five. The contrast with the L4 probe - identical construction, identical integrator, one of them motionless and the other gone - is what the lesson uses to separate 'equilibrium' from 'stable'.",
      source: 'Murray & Dermott, Solar System Dynamics (1999) §3.8',
    });

    add({
      group: 'Orbital resonance',
      kind: 'integration',
      name: 'The wide probe is not co-orbital and circulates',
      measured:
        trojans.classify('Wide orbit probe').state ===
        resonance.ANGLE_STATE.CIRCULATION,
      expected: true,
      why: "A body on an ordinary circular orbit a quarter again as wide. Its period ratio with Jupiter is 1.4036, which is a quarter of a percent from 7:5 - closer to a small-integer ratio than Pluto is to 3:2 - and it is in no resonance at all. It is the lesson's sharpest example of why the ratio is not the evidence.",
    });

    add({
      group: 'Orbital resonance',
      kind: 'integration',
      name: 'No two Trojan bodies ever touch',
      measured: trojans.contacts,
      expected: 0,
      tolerance: 0,
      toleranceKind: 'absolute',
      why: 'The tightest geometric constraint in the three scenarios. The L3 probe leaves its equilibrium into a horseshoe that carries it past both triangular points at nearly the same distance from the Sun, and the closest it comes to Patroclus is about twenty length units. The probes are drawn at four, so the margin is two and a half - which is why they are not drawn larger.',
    });

    add({
      group: 'Orbital resonance',
      kind: 'integration',
      name: 'Energy is conserved across the Trojan run',
      measured: trojans.energyDrift,
      expected: 0,
      tolerance: 1e-7,
      toleranceKind: 'absolute',
      why: 'Tighter than the other two because the geometry is easier: near-circular orbits, no close approaches, and 420 substeps per Jupiter orbit.',
    });

    {
      const fine = trojanRun({ dt: 2 });
      const coarse = trojanRun({ dt: 8 });
      const same = name =>
        fine.classify(name).state === trojans.classify(name).state &&
        coarse.classify(name).state === trojans.classify(name).state;
      add({
        group: 'Orbital resonance',
        kind: 'integration',
        name: 'Every Trojan classification survives a factor of four in timestep',
        measured: ['L4 probe', 'Patroclus', 'Wide orbit probe'].every(same),
        expected: true,
        why: 'The equilibrium stays an equilibrium, the tadpole stays a tadpole and the wide probe keeps circulating at steps of 2, 4 and 8. The L3 probe is deliberately excluded: it is exponentially unstable by construction, so where it has got to after forty Jupiter years is genuinely timestep-dependent, and the check above asks only that it has left.',
      });
    }
  }

  return out;
}

/** (Rp/Rs)^2 as a percentage. */
function k2Percent(k) {
  return k * k * 100;
}

/**
 * Group the flat result list, preserving first-seen order.
 * @param {Array<object>} results - From runChecks
 * @returns {Array<{group: string, checks: Array<object>}>} Grouped
 */
export function groupResults(results) {
  const order = [];
  const map = new Map();
  for (const r of results) {
    if (!map.has(r.group)) {
      map.set(r.group, []);
      order.push(r.group);
    }
    map.get(r.group).push(r);
  }
  return order.map(group => ({ group, checks: map.get(group) }));
}

export { REF };
