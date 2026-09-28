// =============================================================================
// A hierarchical system from orbital elements
// -----------------------------------------------------------------------------
// The Orbital System Builder asks for what an astronomer would write down about
// a system - which body each companion goes round, how big the orbit is, how
// eccentric, which way it points and where along it the companion starts - and
// this module turns that into the positions and velocities the integrator
// takes. It is the schema, the arithmetic and the checks, and nothing else: no
// DOM, no i18n, no live world. js/systemBuilder.js is the form around it and
// js/ui.js builds the bodies, the same split js/place/preciseFields.js and
// js/precisePlacement.js make.
//
// How a system is put together
// -----------------------------------------------------------------------------
// The first body is the root. Every other body names a primary that comes
// before it in the list, so the list is a tree and there is exactly one order
// to build it in. A primary's companions are added innermost first, by
// semi-major axis, and each one orbits everything already inside it: the
// primary, its inner companions and their own companions, taken together at
// their barycenter. That is the Jacobi construction, and it is what makes an
// outer planet's elements mean what a reader expects - Jupiter's orbit is
// about the Sun and the Earth-Moon pair together, not about a Sun that the
// Earth has already tugged off center.
//
// Each step is an exact two-body split. The companion's subtree and the inner
// system are two points of mass m and M; their relative orbit has the entered
// elements under mu = G(M + m); the inner system moves by -m/(M+m) of that
// relative vector and the companion's subtree by M/(M+m) of it. The pair's
// barycenter stays where it was and its momentum stays zero, so the finished
// system has its barycenter at the origin and no net momentum by construction,
// not by a correction afterwards - and every orbit can be read back out of the
// final state exactly, which is what tests/systemSpec.test.js checks.
//
// What the elements are, once the world runs
// -----------------------------------------------------------------------------
// They are osculating: the two-body orbit each companion would follow if only
// the bodies inside it pulled. Every other body perturbs it, so in the running
// world a, e and the periapsis direction all wander. The checks below catch the
// placements that are wrong on their face - touching bodies, a moon outside its
// planet's Hill sphere, orbits that cross, a planet inside a binary's unstable
// zone - using published criteria where there are some, and none of them is a
// proof that what passes will last. The builder says so beside the results.
//
// Two dimensions
// -----------------------------------------------------------------------------
// The integrator is planar, so there is no inclination and no node. Direction
// is the one bit of orientation left: prograde turns the way every shipped
// scenario turns (positive angular momentum in simulation coordinates),
// retrograde is its mirror image across the periapsis line.
// =============================================================================

import {
  AU_METERS,
  G_SI,
  SOLAR_MASS_KG,
  SIM_UNITS_PER_AU,
} from './constants.js';
import {
  SOLAR_MASS_UNIT,
  EARTH_MASS_UNIT,
  JUPITER_MASS_UNIT,
  ABSORB_BUFFER,
  BH_RADIUS_BASE,
  PLANET_RADIUS,
  GAS_GIANT_RADIUS,
  STAR_OBJ_RADIUS,
  NEUTRON_STAR_RADIUS,
  WHITE_DWARF_RADIUS,
  MAX_STAR_MASS_BEFORE_BH,
  GAS_GIANT_TO_STAR_THRESHOLD,
  MIN_INTERACTION_DISTANCE,
} from './physics.js';
import { orbitalElements } from './orbital.js';
import { hashState } from './experiments/canonicalState.js';
import { MASS_FIELD, TYPE_NAME_KEY } from './place/preciseFields.js';

const DEG = Math.PI / 180;

/**
 * The Holman and Wiegert (1999) stability fits, S-type and P-type.
 *
 * The same polynomials js/binaryStability.js exports, and not imported from
 * there on purpose: that module shares a chunk with the binary-watch
 * instrument every lesson loads, and a second importer would split it into a
 * chunk of its own and cost every lesson one more request.
 * tests/systemSpec.test.js holds the two copies to each other.
 *
 * @param {number} mu - Companion mass fraction m2/(m1+m2)
 * @param {number} e - Binary eccentricity
 * @returns {{a: number, inRange: boolean}} Critical a in binary separations
 */
export const holmanWiegert = {
  sType: (mu, e) => ({
    a:
      0.464 -
      0.38 * mu -
      0.631 * e +
      0.586 * mu * e +
      0.15 * e * e -
      0.198 * mu * e * e,
    inRange: mu >= 0.1 && mu <= 0.9 && e >= 0 && e <= 0.8,
  }),
  pType: (mu, e) => ({
    a:
      1.6 +
      5.1 * e -
      2.22 * e * e +
      4.12 * mu -
      4.27 * e * mu -
      5.09 * mu * mu +
      4.61 * e * e * mu * mu,
    inRange: mu >= 0.1 && mu <= 0.9 && e >= 0 && e <= 0.7,
  }),
};

/** The file format a saved system is written in. */
export const SYSTEM_FORMAT = 'gravitas.orbital-system';
/** Its schema version. A file with a larger one is refused, not guessed at. */
export const SYSTEM_VERSION = 1;

/** Enough for a planetary system with moons; more is a scenario, not a form. */
export const MAX_BODIES = 12;

/**
 * The types a system can be built from, with the mass each is entered in.
 *
 * The precise-placement bounds, with two changes that keep a body what it was
 * entered as. A star over the collapse threshold becomes a black hole on the
 * first step (js/physics.js checks it every frame), and a gas giant at the
 * star threshold becomes a star; either would leave the builder's orbit
 * computed for a body that no longer exists.
 *
 * Two types are left out on purpose. A comet never pulls on anything, so it
 * cannot be a primary and is a test particle as a companion; an asteroid is
 * removed from the world five canvas widths out whatever it is marked, which
 * a wide system reaches at an ordinary zoom. Neither survives as the orbit it
 * was given, so neither is offered.
 *
 * @type {Readonly<Record<string, {unit: string, min: number, max: number, placeholder: number}>>}
 */
export const BUILDER_TYPES = Object.freeze({
  Star: { ...MASS_FIELD.Star, max: MAX_STAR_MASS_BEFORE_BH },
  WhiteDwarf: MASS_FIELD.WhiteDwarf,
  NeutronStar: MASS_FIELD.NeutronStar,
  BlackHole: MASS_FIELD.BlackHole,
  GasGiant: { ...MASS_FIELD.GasGiant, max: GAS_GIANT_TO_STAR_THRESHOLD - 1 },
  Planet: MASS_FIELD.Planet,
});

/** The type ids, in the order a form offers them. */
export const SYSTEM_TYPES = Object.freeze(Object.keys(BUILDER_TYPES));

export { TYPE_NAME_KEY };

/** Bounds on the orbital elements. */
export const ELEMENT_LIMITS = Object.freeze({
  // Ten thousand AU is the precise-placement position bound, and a system
  // wider than that is off the edge of every scenario in the catalog.
  aMaxAu: 1e4,
  // A bound orbit only. 0.99 rather than anything closer to 1, because the
  // periapsis of a nearer-parabolic orbit is smaller than any radius here.
  eMax: 0.99,
  radiusMax: 1e4,
});

/** Simulation mass units per unit of each entry unit. */
const MASS_UNIT = Object.freeze({
  suns: SOLAR_MASS_UNIT,
  earths: EARTH_MASS_UNIT,
  jupiters: JUPITER_MASS_UNIT,
});

/**
 * A body's mass in simulation units.
 *
 * @param {string} type - One of SYSTEM_TYPES
 * @param {number} mass - In that type's entry unit
 * @returns {number} Simulation mass units
 */
export const simMass = (type, mass) =>
  mass * MASS_UNIT[BUILDER_TYPES[type].unit];

/**
 * What each constructor is handed as its mass argument.
 *
 * Every class counts in its own physical unit except BlackHole, which takes
 * simulation units (js/place/preciseFields.js documents the same exception).
 *
 * @param {string} type - One of SYSTEM_TYPES
 * @param {number} mass - In the entry unit
 * @returns {number} The constructor's argument
 */
export const constructorMass = (type, mass) =>
  type === 'BlackHole' ? mass * SOLAR_MASS_UNIT : mass;

/**
 * The model radius a class gives a body of this mass, in simulation units.
 *
 * The contact radius: collisions, merging and absorption test against it
 * (js/physics.js; the drawn size is a separate number). These are the
 * constructors' own rules, and tests/systemSpec.test.js builds one of each
 * class to hold them to it.
 *
 * @param {string} type - One of SYSTEM_TYPES
 * @param {number} mass - In the entry unit
 * @returns {number} Radius in simulation length units
 */
export function defaultRadius(type, mass) {
  switch (type) {
    case 'Star':
      return STAR_OBJ_RADIUS * Math.pow(mass, 0.85);
    case 'Planet':
      return PLANET_RADIUS * Math.pow(mass, 0.3);
    case 'GasGiant':
      return GAS_GIANT_RADIUS * Math.pow(mass, 0.3);
    case 'WhiteDwarf':
      return WHITE_DWARF_RADIUS;
    case 'NeutronStar':
      return NEUTRON_STAR_RADIUS;
    case 'BlackHole':
      return BH_RADIUS_BASE * Math.pow(Math.max(0.1, mass), 0.3);
    default:
      return NaN;
  }
}

/**
 * Real seconds in one simulation time unit, for a gravitational constant.
 *
 * js/units.js answers the same question for the world on screen, from the
 * constant that world is running at. The builder needs it for the constant
 * the system will be built at, which is not necessarily the one loaded now -
 * the Earth-Moon scenario runs at 9000.
 *
 * @param {number} G - Simulation gravitational constant
 * @returns {number} Seconds per simulation time unit
 */
export function secondsPerTimeUnit(G) {
  const metres = AU_METERS / SIM_UNITS_PER_AU;
  const kilograms = SOLAR_MASS_KG / SOLAR_MASS_UNIT;
  return Math.sqrt((G * metres ** 3) / (G_SI * kilograms));
}

/**
 * Position and velocity on a Keplerian orbit, relative to the focus.
 *
 * Kepler's equation by Newton-Raphson from E = M (from pi above e = 0.8,
 * where M is a poor start), to the last bit. The perifocal state is then
 * mirrored across the periapsis line for a retrograde orbit and turned
 * through the argument of periapsis.
 *
 * @param {object} el - The elements
 * @param {number} el.a - Semi-major axis, simulation units
 * @param {number} el.e - Eccentricity, 0 <= e < 1
 * @param {number} el.omegaDeg - Argument of periapsis, degrees from +x
 * @param {number} el.phaseDeg - Mean anomaly at the start, degrees
 * @param {number} el.mu - G(M + m), simulation units
 * @param {boolean} [el.retrograde] - Turn the other way
 * @returns {{pos: {x: number, y: number}, vel: {x: number, y: number}}} State
 */
export function keplerState({ a, e, omegaDeg, phaseDeg, mu, retrograde }) {
  // Reduced to (-pi, pi], so Newton starts inside the branch it converges to.
  let M = (phaseDeg * DEG) % (2 * Math.PI);
  if (M > Math.PI) M -= 2 * Math.PI;
  if (M <= -Math.PI) M += 2 * Math.PI;

  let E = e > 0.8 ? Math.PI * Math.sign(M || 1) : M;
  for (let i = 0; i < 60; i++) {
    const step = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= step;
    if (Math.abs(step) < 1e-15) break;
  }

  const cosE = Math.cos(E);
  const sinE = Math.sin(E);
  const root = Math.sqrt(1 - e * e);
  const n = Math.sqrt(mu / (a * a * a));
  const denom = 1 - e * cosE;
  const sense = retrograde ? -1 : 1;

  const px = a * (cosE - e);
  const py = sense * a * root * sinE;
  const pvx = (-a * n * sinE) / denom;
  const pvy = (sense * a * n * root * cosE) / denom;

  const w = omegaDeg * DEG;
  const c = Math.cos(w);
  const s = Math.sin(w);
  return {
    pos: { x: px * c - py * s, y: px * s + py * c },
    vel: { x: pvx * c - pvy * s, y: pvx * s + pvy * c },
  };
}

/**
 * Read one number out of a field, where blank has a meaning of its own.
 *
 * @param {*} raw - Typed text or a number
 * @returns {{empty: boolean, value: number, bad: boolean}} What it was
 */
function readNumber(raw) {
  if (typeof raw === 'number') {
    return Number.isFinite(raw)
      ? { empty: false, value: raw, bad: false }
      : { empty: false, value: 0, bad: true };
  }
  if (raw === null || raw === undefined) {
    return { empty: true, value: 0, bad: false };
  }
  const text = String(raw).trim();
  if (text === '') return { empty: true, value: 0, bad: false };
  const value = Number(text);
  return Number.isFinite(value)
    ? { empty: false, value, bad: false }
    : { empty: false, value: 0, bad: true };
}

/**
 * Turn a system as entered - typed text or a loaded file - into numbers, or
 * into complaints that each name the body and the field they are about.
 *
 * The keys are message ids; this module has no catalog. `index` is the body's
 * place in the list, which is also how primaries are named, so a file stays
 * readable and nothing depends on an id a form happened to mint.
 *
 * @param {{bodies: Array<object>}} input - The system
 * @returns {{ok: boolean, errors: Array<{index: number, field: string, key: string, vars: object}>,
 *   bodies: Array<object>}} Parsed bodies, whether or not all of them passed
 */
export function validateSystem(input) {
  const errors = [];
  const fail = (index, field, key, vars = {}) =>
    errors.push({ index, field, key, vars });
  const list = Array.isArray(input?.bodies) ? input.bodies : [];

  if (list.length < 2) fail(-1, 'bodies', 'builder.error.tooFew');
  if (list.length > MAX_BODIES) {
    fail(-1, 'bodies', 'builder.error.tooMany', { max: MAX_BODIES });
  }

  const bodies = list.slice(0, MAX_BODIES).map((raw, index) => {
    const body = {
      index,
      name: String(raw?.name ?? '')
        .trim()
        .slice(0, 40),
      type: raw?.type,
      mass: NaN,
      radius: null,
      primary: null,
      a: NaN,
      e: 0,
      omega: 0,
      phase: 0,
      retrograde: raw?.retrograde === true || raw?.retrograde === 'retrograde',
    };

    const spec = BUILDER_TYPES[body.type];
    if (!spec) {
      fail(index, 'type', 'builder.error.type');
      return body;
    }

    const mass = readNumber(raw.mass);
    if (mass.bad || mass.empty) {
      fail(index, 'mass', 'builder.error.number');
    } else if (mass.value < spec.min || mass.value > spec.max) {
      fail(index, 'mass', 'builder.error.massRange', {
        min: spec.min,
        max: spec.max,
      });
    } else {
      body.mass = mass.value;
    }

    // A black hole's radius follows its mass every time it is restored
    // (BlackHole.set_state recomputes it), so a typed one would not survive a
    // share link. It is refused rather than silently dropped.
    const radius = readNumber(raw.radius);
    if (radius.bad) fail(index, 'radius', 'builder.error.number');
    else if (!radius.empty) {
      if (body.type === 'BlackHole') {
        fail(index, 'radius', 'builder.error.blackHoleRadius');
      } else if (
        !(radius.value > 0) ||
        radius.value > ELEMENT_LIMITS.radiusMax
      ) {
        fail(index, 'radius', 'builder.error.radiusRange', {
          max: ELEMENT_LIMITS.radiusMax,
        });
      } else {
        body.radius = radius.value;
      }
    }

    if (index === 0) {
      // The root goes round nothing; anything typed for its orbit is ignored,
      // and a primary on it would make the list something other than a tree.
      if (raw.primary !== null && raw.primary !== undefined) {
        if (raw.primary !== '' && raw.primary !== -1) {
          fail(index, 'primary', 'builder.error.rootPrimary');
        }
      }
      return body;
    }

    const primary = readNumber(raw.primary);
    if (
      primary.bad ||
      primary.empty ||
      !Number.isInteger(primary.value) ||
      primary.value < 0 ||
      primary.value >= index
    ) {
      fail(index, 'primary', 'builder.error.primary');
    } else {
      body.primary = primary.value;
    }

    const a = readNumber(raw.a);
    if (a.bad || a.empty) fail(index, 'a', 'builder.error.number');
    else if (!(a.value > 0) || a.value > ELEMENT_LIMITS.aMaxAu) {
      fail(index, 'a', 'builder.error.aRange', {
        max: ELEMENT_LIMITS.aMaxAu,
      });
    } else {
      body.a = a.value;
    }

    const e = readNumber(raw.e);
    if (e.bad) fail(index, 'e', 'builder.error.number');
    else if (e.value >= 1) {
      // Named, because "out of range" undersells it: this is a companion that
      // leaves and never comes back.
      fail(index, 'e', 'builder.error.unbound');
    } else if (e.value < 0 || e.value > ELEMENT_LIMITS.eMax) {
      fail(index, 'e', 'builder.error.eRange', { max: ELEMENT_LIMITS.eMax });
    } else {
      body.e = e.value;
    }

    for (const field of ['omega', 'phase']) {
      const angle = readNumber(raw[field]);
      if (angle.bad) fail(index, field, 'builder.error.number');
      else body[field] = angle.value;
    }
    return body;
  });

  // Black holes feel only other black holes (BlackHole.orbit_acceleration),
  // so one in a system of stars or planets goes straight on while they orbit
  // it, and the system's momentum is not conserved. That is not a caution
  // about stability; it is a system the engine cannot integrate as entered.
  const types = new Set(bodies.map(b => b.type));
  if (types.has('BlackHole') && types.size > 1) {
    fail(-1, 'bodies', 'builder.error.mixedBlackHoles');
  }

  return { ok: errors.length === 0, errors, bodies };
}

/** The mass of each subtree, in simulation units, by root index. */
function subtreeMasses(bodies, children) {
  const out = new Array(bodies.length).fill(0);
  const visit = i => {
    let m = simMass(bodies[i].type, bodies[i].mass);
    for (const c of children[i]) m += visit(c);
    out[i] = m;
    return m;
  };
  visit(0);
  return out;
}

/**
 * Build a validated system.
 *
 * @param {Array<object>} bodies - validateSystem(...).bodies, all valid
 * @param {object} opts
 * @param {number} opts.G - The gravitational constant the world will run at
 * @returns {object} Initial conditions, the orbits as built, the checks and
 *   the residuals; see the return statement
 */
export function buildSystem(bodies, { G }) {
  const children = bodies.map(() => []);
  for (const b of bodies) if (b.index > 0) children[b.primary].push(b.index);
  // Innermost first; the list order breaks a tie, so the order is total.
  for (const list of children) {
    list.sort((i, j) => bodies[i].a - bodies[j].a || i - j);
  }

  const sub = subtreeMasses(bodies, children);
  const state = bodies.map(() => ({ x: 0, y: 0, vx: 0, vy: 0 }));
  const orbits = [];

  const shift = (members, dx, dy, dvx, dvy) => {
    for (const i of members) {
      state[i].x += dx;
      state[i].y += dy;
      state[i].vx += dvx;
      state[i].vy += dvy;
    }
  };

  /** Assemble one subtree in its own barycentric frame; returns its members. */
  const assemble = root => {
    const members = [root];
    let mass = simMass(bodies[root].type, bodies[root].mass);
    for (const c of children[root]) {
      const inner = members.slice();
      const outer = assemble(c);
      const m = sub[c];
      const body = bodies[c];
      const a = body.a * SIM_UNITS_PER_AU;
      const mu = G * (mass + m);
      const rel = keplerState({
        a,
        e: body.e,
        omegaDeg: body.omega,
        phaseDeg: body.phase,
        mu,
        retrograde: body.retrograde,
      });
      const fIn = m / (mass + m);
      const fOut = mass / (mass + m);
      shift(
        inner,
        -fIn * rel.pos.x,
        -fIn * rel.pos.y,
        -fIn * rel.vel.x,
        -fIn * rel.vel.y
      );
      shift(
        outer,
        fOut * rel.pos.x,
        fOut * rel.pos.y,
        fOut * rel.vel.x,
        fOut * rel.vel.y
      );
      orbits.push({
        index: c,
        primary: root,
        order: orbits.length + 1,
        inner,
        outer,
        innerMass: mass,
        companionMass: m,
        a,
        e: body.e,
        omega: body.omega,
        phase: body.phase,
        retrograde: body.retrograde,
        mu,
        period: 2 * Math.PI * Math.sqrt((a * a * a) / mu),
        periapsis: a * (1 - body.e),
        apoapsis: a * (1 + body.e),
        // How far the inner system's barycenter sits from the pair's: the
        // reflex orbit a star makes about its planet's barycenter, and what a
        // radial-velocity survey measures.
        reflexA: fIn * a,
        massFraction: fIn,
      });
      members.push(...outer);
      mass += m;
    }
    return members;
  };
  assemble(0);

  const radius = bodies.map(b => b.radius ?? defaultRadius(b.type, b.mass));
  const mass = bodies.map(b => simMass(b.type, b.mass));
  const secs = secondsPerTimeUnit(G);
  for (const o of orbits) o.periodDays = (o.period * secs) / 86400;

  const residuals = measureResiduals(orbits, state, mass, G);
  const checks = checkSystem(bodies, orbits, state, radius, mass);

  const shortest = Math.min(...orbits.map(o => o.period));
  const closest = Math.min(...orbits.map(o => o.periapsis));
  const widest = Math.max(
    ...state.map(s => Math.hypot(s.x, s.y)),
    ...orbits.map(o => o.apoapsis)
  );

  return {
    bodies: bodies.map((b, i) => ({
      index: i,
      name: b.name,
      type: b.type,
      mass: b.mass,
      simMass: mass[i],
      constructorMass: constructorMass(b.type, b.mass),
      radius: radius[i],
      radiusGiven: b.radius !== null,
      pos: { x: state[i].x, y: state[i].y },
      vel: { x: state[i].vx, y: state[i].vy },
    })),
    orbits,
    checks,
    residuals,
    G,
    extent: widest,
    settings: worldSettings({ G, shortest, closest }),
  };
}

/**
 * The settings a built system runs under.
 *
 * Every one of these is here because the physics is wrong without it. Planets
 * pull only with mutual gravity on; star-only gravity switches gas giants and
 * compact stars off as sources; a static black hole does not move and the
 * default decay term drains a black-hole pair; the generator would add its own
 * population; and a step as long as a frame, or a softening floor as large as
 * a moon's orbit, turns a Keplerian orbit into something else. The step gives
 * the innermost orbit at least five hundred steps, and the floor is a tenth of
 * the closest periapsis.
 *
 * @param {object} p
 * @param {number} p.G - Gravitational constant
 * @param {number} p.shortest - Shortest period, simulation time
 * @param {number} p.closest - Smallest periapsis, simulation length
 * @returns {object} A settings patch
 */
function worldSettings({ G, shortest, closest }) {
  const round = v => Number(v.toPrecision(3));
  return {
    gravitational_constant: G,
    placement: 'Empty',
    num_black_holes: 0,
    num_stars: 0,
    num_planets: 0,
    num_gas_giants: 0,
    num_neutron_stars: 0,
    num_white_dwarfs: 0,
    num_asteroids: 0,
    enable_asteroids: false,
    num_comets: 0,
    mutual_gravity: true,
    star_only_gravity: false,
    bh_behavior: 'Orbiting',
    orbit_decay_rate: 0,
    max_timestep: round(shortest / 500),
    min_interaction_distance: round(
      Math.min(MIN_INTERACTION_DISTANCE, closest / 10)
    ),
  };
}

/** Mass-weighted center and velocity of some bodies. */
function barycenterOf(members, state, mass) {
  let m = 0;
  let x = 0;
  let y = 0;
  let vx = 0;
  let vy = 0;
  for (const i of members) {
    m += mass[i];
    x += mass[i] * state[i].x;
    y += mass[i] * state[i].y;
    vx += mass[i] * state[i].vx;
    vy += mass[i] * state[i].vy;
  }
  return {
    mass: m,
    pos: { x: x / m, y: y / m },
    vel: { x: vx / m, y: vy / m },
  };
}

/** The smallest signed difference between two angles, in degrees. */
const angleGap = (a, b) => {
  const d = ((((a - b) % 360) + 540) % 360) - 180;
  return Math.abs(d);
};

/**
 * Read every orbit back out of the finished state.
 *
 * The inverse of the construction, done independently: js/orbital.js's
 * vis-viva elements for each companion's subtree about its inner system,
 * compared with what was entered. Also the two things the construction
 * promises for the whole system - no net momentum, and the barycenter at the
 * origin - each as a fraction of the scale it could be wrong by.
 *
 * @returns {{a: number, e: number, omega: number, momentum: number, barycenter: number}}
 *   The worst relative a, absolute e, periapsis direction (degrees) and the
 *   two system residuals
 */
function measureResiduals(orbits, state, mass, G) {
  let a = 0;
  let e = 0;
  let omega = 0;
  for (const o of orbits) {
    const inner = barycenterOf(o.inner, state, mass);
    const outer = barycenterOf(o.outer, state, mass);
    const el = orbitalElements(outer, inner, G);
    if (!el) {
      a = Infinity;
      continue;
    }
    a = Math.max(a, Math.abs(el.a - o.a) / o.a);
    e = Math.max(e, Math.abs(el.e - o.e));
    // A circular orbit has no periapsis to point anywhere.
    if (o.e > 1e-6) {
      const rx = outer.pos.x - inner.pos.x;
      const ry = outer.pos.y - inner.pos.y;
      const vx = outer.vel.x - inner.vel.x;
      const vy = outer.vel.y - inner.vel.y;
      const h = rx * vy - ry * vx;
      const r = Math.hypot(rx, ry);
      const ex = (vy * h) / el.mu - rx / r;
      const ey = (-vx * h) / el.mu - ry / r;
      omega = Math.max(omega, angleGap(Math.atan2(ey, ex) / DEG, o.omega));
    }
  }

  let p = 0;
  let pScale = 0;
  let c = 0;
  let cScale = 0;
  let px = 0;
  let py = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < state.length; i++) {
    px += mass[i] * state[i].vx;
    py += mass[i] * state[i].vy;
    cx += mass[i] * state[i].x;
    cy += mass[i] * state[i].y;
    pScale += mass[i] * Math.hypot(state[i].vx, state[i].vy);
    cScale += mass[i] * Math.hypot(state[i].x, state[i].y);
  }
  p = pScale > 0 ? Math.hypot(px, py) / pScale : 0;
  c = cScale > 0 ? Math.hypot(cx, cy) / cScale : 0;
  return { a, e, omega, momentum: p, barycenter: c };
}

/**
 * Everything worth saying about a system before it runs.
 *
 * `error` means the builder will not build it: the engine would not integrate
 * it as entered. `caution` means it will, and the reader should know what the
 * running world is likely to do with it. Neither kind is a stability verdict.
 *
 * @returns {Array<{level: string, key: string, vars: object, bodies: number[]}>}
 */
function checkSystem(bodies, orbits, state, radius, mass) {
  const out = [];
  const say = (level, key, bodyList, vars = {}) =>
    out.push({ level, key, vars, bodies: bodyList });
  const au = v => v / SIM_UNITS_PER_AU;
  const bh = i => bodies[i].type === 'BlackHole';
  const contact = (i, j) =>
    radius[i] + radius[j] + (bh(i) || bh(j) ? ABSORB_BUFFER : 0);

  // Touching at the start: they merge, collide or are absorbed on the first
  // step, so the system the reader entered never runs.
  for (let i = 0; i < state.length; i++) {
    for (let j = i + 1; j < state.length; j++) {
      const d = Math.hypot(state[i].x - state[j].x, state[i].y - state[j].y);
      if (d < contact(i, j)) {
        say('error', 'builder.check.overlap', [i, j], {
          distance: au(d),
          contact: au(contact(i, j)),
        });
      }
    }
  }

  const byIndex = new Map(orbits.map(o => [o.index, o]));

  for (const o of orbits) {
    const c = o.index;
    const p = o.primary;

    // Touching at periapsis: the first close approach ends the orbit.
    if (o.periapsis < contact(c, p)) {
      say('caution', 'builder.check.contact', [c, p], {
        periapsis: au(o.periapsis),
        contact: au(contact(c, p)),
      });
    }

    // A companion of a companion - a moon, or a planet round one star of a
    // pair - has to stay inside its primary's Hill sphere, measured at the
    // primary's own periapsis where the sphere is smallest. Hamilton and
    // Burns (1991) found prograde satellites stable out to about half of it;
    // retrograde ones can survive somewhat further, and beyond the whole of
    // it nothing stays.
    const host = byIndex.get(p);
    if (host) {
      const hill =
        host.periapsis *
        Math.cbrt(
          host.companionMass / (3 * (host.innerMass + host.companionMass))
        );
      const reach = o.apoapsis / hill;
      if (reach > 1) {
        say('caution', 'builder.check.hillOutside', [c, p], {
          reach,
          hill: au(hill),
        });
      } else if (reach > 0.5) {
        say('caution', 'builder.check.hillWide', [c, p], {
          reach,
          hill: au(hill),
        });
      }
    }
  }

  // Neighbours round the same primary, innermost first.
  const siblings = new Map();
  for (const o of orbits) {
    if (!siblings.has(o.primary)) siblings.set(o.primary, []);
    siblings.get(o.primary).push(o);
  }
  for (const list of siblings.values()) {
    for (let k = 1; k < list.length; k++) {
      const inner = list[k - 1];
      const outer = list[k];
      const pair = [inner.index, outer.index];
      // A tenth of the pair's mass is where the Holman-Wiegert fits start.
      const heavyInner = inner.massFraction >= 0.1;
      const heavyOuter = outer.massFraction >= 0.1;

      if (inner.apoapsis >= outer.periapsis) {
        say('caution', 'builder.check.crossing', pair, {
          apoapsis: au(inner.apoapsis),
          periapsis: au(outer.periapsis),
        });
        continue;
      }

      if (heavyInner && !heavyOuter) {
        // A planet round a binary: Holman and Wiegert (1999), P-type.
        const fit = holmanWiegert.pType(inner.massFraction, inner.e);
        const critical = fit.a * inner.a;
        if (outer.a < critical) {
          say('caution', 'builder.check.circumbinary', pair, {
            semiMajor: au(outer.a),
            critical: au(critical),
            inRange: fit.inRange,
          });
        }
      } else if (heavyInner && heavyOuter) {
        // A hierarchical triple: Mardling and Aarseth (2001), coplanar.
        const q = outer.companionMass / outer.innerMass;
        const ratio =
          2.8 *
          Math.pow(1 + q, 2 / 5) *
          Math.pow(1 + outer.e, 2 / 5) *
          Math.pow(1 - outer.e, -6 / 5);
        if (outer.a / inner.a < ratio) {
          say('caution', 'builder.check.triple', pair, {
            ratio: outer.a / inner.a,
            critical: ratio,
          });
        }
      } else if (!heavyInner && heavyOuter) {
        // A star outside the planets: every lighter orbit inside it is an
        // S-type orbit round one star of the pair.
        const fit = holmanWiegert.sType(outer.massFraction, outer.e);
        const critical = fit.a * outer.a;
        for (const planet of list.slice(0, k)) {
          if (planet.massFraction < 0.1 && planet.a > critical) {
            say(
              'caution',
              'builder.check.circumstellar',
              [planet.index, outer.index],
              {
                semiMajor: au(planet.a),
                critical: au(critical),
                inRange: fit.inRange,
              }
            );
          }
        }
      } else {
        // Two planets: Gladman (1993) puts two circular orbits beyond
        // 2*sqrt(3) mutual Hill radii out of each other's reach for good.
        // Closer than that is not a prediction of instability, only the loss
        // of that guarantee.
        const host = mass[inner.primary];
        const mutual =
          Math.cbrt((mass[inner.index] + mass[outer.index]) / (3 * host)) *
          ((inner.a + outer.a) / 2);
        const spacing = (outer.a - inner.a) / mutual;
        if (spacing < 2 * Math.sqrt(3)) {
          say('caution', 'builder.check.spacing', pair, { spacing });
        }
      }
    }
  }

  // A step as short as the innermost orbit needs is capped at 64 substeps a
  // frame (js/timestep.js). At 1x and sixty frames a second a frame is 1/12 of
  // a time unit, so an orbit shorter than about 0.65 time units is integrated
  // with fewer than five hundred steps whatever the cap says.
  const shortest = orbits.reduce((best, o) =>
    o.period < best.period ? o : best
  );
  if (shortest.period < (500 * (1 / 12)) / 64) {
    say('caution', 'builder.check.fastOrbit', [shortest.index], {
      period: shortest.period,
    });
  }

  return out;
}

/**
 * The world seed a system is built under.
 *
 * Derived from the system rather than drawn at random, so the same system -
 * typed again, or loaded from its file - is the same world down to the
 * starfield and the cosmetic draws the constructors make.
 *
 * @param {Array<object>} bodies - Validated bodies
 * @returns {number} An unsigned 32-bit seed
 */
export const systemSeed = bodies => {
  const described = bodies.map(b => {
    const copy = { ...b };
    delete copy.index;
    return copy;
  });
  return parseInt(hashState({ b: described }), 16);
};

/**
 * A system as a file an instructor can keep.
 *
 * The elements are the system; the initial state is written beside them so a
 * reader of the file can see the numbers the world started from, and so a
 * later build whose arithmetic had changed would be caught rather than
 * silently open something else.
 *
 * @param {Array<object>} bodies - Validated bodies
 * @param {object} built - buildSystem(...)
 * @returns {object} JSON-ready
 */
export function systemToFile(bodies, built) {
  const sig = v => Number(v.toPrecision(12));
  return {
    format: SYSTEM_FORMAT,
    version: SYSTEM_VERSION,
    bodies: bodies.map(b => {
      const out = { name: b.name, type: b.type, mass: b.mass };
      if (b.radius !== null) out.radius = b.radius;
      if (b.index > 0) {
        Object.assign(out, {
          primary: b.primary,
          a: b.a,
          e: b.e,
          omega: b.omega,
          phase: b.phase,
          retrograde: b.retrograde,
        });
      }
      return out;
    }),
    initial: {
      G: built.G,
      bodies: built.bodies.map(b => ({
        x: sig(b.pos.x),
        y: sig(b.pos.y),
        vx: sig(b.vel.x),
        vy: sig(b.vel.y),
        mass: sig(b.simMass),
      })),
    },
  };
}

/**
 * Read a system file, refusing what this build cannot honestly open.
 *
 * @param {*} data - Parsed JSON
 * @returns {{ok: boolean, key?: string, vars?: object, system?: {bodies: Array<object>}}}
 */
export function systemFromFile(data) {
  if (!data || typeof data !== 'object' || data.format !== SYSTEM_FORMAT) {
    return { ok: false, key: 'builder.file.notSystem' };
  }
  const version = Number(data.version);
  if (!Number.isInteger(version) || version < 1) {
    return { ok: false, key: 'builder.file.notSystem' };
  }
  if (version > SYSTEM_VERSION) {
    return { ok: false, key: 'builder.file.newer', vars: { version } };
  }
  if (!Array.isArray(data.bodies)) {
    return { ok: false, key: 'builder.file.notSystem' };
  }
  return { ok: true, system: { bodies: data.bodies } };
}

/**
 * Whether a file's recorded initial state is the one this build computes.
 *
 * @param {object} data - The file
 * @param {object} built - buildSystem(...) from its elements
 * @returns {boolean} True when every number agrees to a part in 10^9
 */
export function initialStateMatches(data, built) {
  const recorded = data?.initial?.bodies;
  if (!Array.isArray(recorded) || recorded.length !== built.bodies.length) {
    return false;
  }
  if (data.initial.G !== built.G) return false;
  const close = (a, b, scale) =>
    Number.isFinite(a) && Math.abs(a - b) <= 1e-9 * Math.max(scale, 1e-12);
  const posScale = Math.max(
    ...built.bodies.map(b => Math.hypot(b.pos.x, b.pos.y))
  );
  const velScale = Math.max(
    ...built.bodies.map(b => Math.hypot(b.vel.x, b.vel.y))
  );
  return built.bodies.every((b, i) => {
    const r = recorded[i];
    return (
      close(r.x, b.pos.x, posScale) &&
      close(r.y, b.pos.y, posScale) &&
      close(r.vx, b.vel.x, velScale) &&
      close(r.vy, b.vel.y, velScale) &&
      close(r.mass, b.simMass, b.simMass)
    );
  });
}
