// =============================================================================
// The validation suite's harness (Prompt 137)
// -----------------------------------------------------------------------------
// What every group of checks shares: the published reference values, the
// scorer, and the laboratory that drives the real engine. Moved out of
// js/validation/physicsChecks.js verbatim so a group can be a file of its own
// (js/validation/groups/<name>.js, registered in the table in physicsChecks.js)
// instead of lines added to one module.
// =============================================================================

// --- Published reference values ----------------------------------------------
//
// Everything the suite compares against that did not come out of this codebase.
// Each carries its source. Where a value is quoted to two figures in the
// literature, the tolerance on the check that uses it says so.

export const REF = {
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
  // --- Spherical astronomy -------------------------------------------------
  // Everything the observing-window group compares against. Sources named on
  // each line; the checks that use them quote the source again in their `why`,
  // because a tolerance is only defensible next to the thing it is tolerating.

  // Greenwich mean sidereal time at J2000.0: 18h 41m 50.5482s. The defining
  // value of the IAU 1982 expression.
  gmstAtJ2000Hours: 18 + 41 / 60 + 50.5482 / 3600,
  // A sidereal day in mean solar days: 23h 56m 04.0905s. The reciprocal of the
  // rate term in the same IAU 1982 expression the constant above comes from
  // (Aoki et al. 1982, A&A 105, 359), as tabulated in the Explanatory
  // Supplement to the Astronomical Almanac.
  siderealDayDays: 0.997269566,
  // Obliquity of the ecliptic at J2000.0, IAU 2006.
  obliquityJ2000Deg: 23.4392911,
  // The Sun at 2000 January 1.5 TT, apparent geocentric, Astronomical Almanac:
  // RA 18h 45m 07s, Dec -23 deg 01' 55".
  sunRaJ2000Deg: (18 + 45 / 60 + 7 / 3600) * 15,
  sunDecJ2000Deg: -(23 + 1 / 60 + 55 / 3600),
  // Equation of time extremes, from the Astronomical Almanac's daily equation-
  // of-time table: about +16m33s in early November and -14m15s in mid-February.
  // Extremes rather than a dated value on purpose - the exact figure drifts by
  // about ten seconds from year to year, so a check against one year's number
  // would be a check against the year.
  eotMaxMinutes: 16.55,
  eotMinMinutes: -14.25,
  // Equinoxes and solstices, UT, from the Astronomical Almanac.
  marchEquinox2026Jd: 2461120.115278, // 2026 March 20, 14:46 UT
  juneSolstice2026Jd: 2461212.850694, // 2026 June 21, 08:25 UT
  // Lunar phase instants, UT, published to the minute. Espenak, Six Millennium
  // Catalog of Phases of the Moon (NASA GSFC), which is the same reduction the
  // eclipse canon below comes from.
  newMoon2000Jan6Jd: 2451550.259722, // 2000 January 6, 18:14 UT
  fullMoon2018Jul27Jd: 2458327.347222, // 2018 July 27, 20:20 UT
  // Gamma of two total lunar eclipses, in equatorial Earth radii: the least
  // distance of the Moon's centre from the axis of the Earth's shadow. NASA
  // five millennium canon of lunar eclipses (Espenak & Meeus, 2009).
  lunarEclipse2018Gamma: 0.1168,
  lunarEclipse2018Jd: 2458327.348611, // greatest eclipse 20:22 UT
  lunarEclipse2000Gamma: -0.2996,
  lunarEclipse2000Jd: 2451564.697222, // greatest eclipse 04:44 UT
  earthRadiusKm: 6378.137, // WGS 84 equatorial radius
  // The Moon's orbit. Semi-major axis and eccentricity as tabulated in the
  // Explanatory Supplement to the Astronomical Almanac; the mean synodic month
  // from the ELP lunar theory as Meeus gives it (Astronomical Algorithms, 2nd
  // ed., ch. 49); the perigee extreme from Meeus, Mathematical Astronomy
  // Morsels, which is where the extreme perigee and apogee distances are
  // worked out.
  moonSemiMajorKm: 384399,
  moonEccentricity: 0.0549,
  synodicMonthDays: 29.530589,
  moonPerigeeKm: 356400,
  moonApogeeKm: 406700,
  // Kasten & Young (1989), Applied Optics 28, 4735: the relative optical air
  // mass at the horizon under their interpolative formula.
  airmassHorizonKY: 37.92,

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
  laplaceCenterDeg: 180,
  plutoLibrationYears: 19670,
  plutoLibrationAmplitudeDeg: 82,
  plutoCenterDeg: 180,
  plutoNeptuneMinimumAU: 17.2,
  plutoNeptunePeriodRatio: 1.5046,
  tadpolePeriodJupiterYears: 12.47,
  ganymedeCallistoRatio: 2.3326,
};

// --- Small helpers ------------------------------------------------------------

export const relError = (measured, expected) =>
  expected === 0
    ? Math.abs(measured)
    : Math.abs(measured - expected) / Math.abs(expected);

/**
 * Build one check record and score it.
 *
 * @param {object} spec - The check
 * @returns {object} The check with `error` and `pass` filled in
 */
export function score(spec) {
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

export const BODY_LISTS = [
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
export const LAB_SETTINGS = {
  gravitational_constant: 1,
  mutual_gravity: true,
  star_only_gravity: false,
  enable_star_merging: false,
  dynamic_object_properties: false,
  use_barnes_hut: false,
  bh_behavior: 'Orbiting',
  orbit_decay_rate: 0,
  // Newtonian unless a check says otherwise, and the galaxy scale cleared with
  // it. Both matter: updatePhysicsSettings merges rather than replaces, so a
  // check that switched MOND on would otherwise leave it on for every check
  // after it. That happened - the Pluto-Neptune resonance checks ran under
  // modified gravity and reported nonsense - which is a small demonstration of
  // why the mode is gated on a declared scale in the first place.
  galaxy_gravity: 'newtonian',
  galaxy_kpc_per_unit: 0,
  galaxy_msun_per_unit: 0,
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
export function makeLab(P) {
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
export function makeTracer(P, pos, vel) {
  const t = new P.Planet({ ...pos }, { ...vel }, 1);
  // Small enough that it cannot move the primary at the precision these checks
  // work to, but not zero: a zero mass would drop out of the barycenter.
  t.mass = 1e-9;
  t.radius = 0.1;
  t.persistent = true;
  return t;
}

/** A massive point that will not be destroyed or reshaped by the engine. */
export function makeStar(P, pos, vel, massUnits) {
  const s = new P.StarObject({ ...pos }, { ...vel }, massUnits / 1000);
  s.mass = massUnits;
  s.radius = 0.5;
  s.intact = true;
  s.persistent = true;
  return s;
}

export const hypot = (x, y) => Math.hypot(x, y);

/** Total linear momentum of a set of bodies. */
export const momentum = bodies => ({
  x: bodies.reduce((s, b) => s + b.mass * b.vel.x, 0),
  y: bodies.reduce((s, b) => s + b.mass * b.vel.y, 0),
});

/** Center of mass of a set of bodies. */
export const centerOf = bodies => {
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
export const angularMomentum = (bodies, about = { x: 0, y: 0 }) =>
  bodies.reduce(
    (s, b) =>
      s +
      b.mass * ((b.pos.x - about.x) * b.vel.y - (b.pos.y - about.y) * b.vel.x),
    0
  );

/** Total energy of a set of mutually attracting bodies, simulation units. */
export function totalEnergy(bodies, G) {
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

/** (Rp/Rs)^2 as a percentage. */
export function k2Percent(k) {
  return k * k * 100;
}
