// Import utility functions
import {
  SOLAR_MASS_KG,
  AU_METERS,
  G_SI,
  JUPITER_MASSES_PER_SOLAR_MASS,
  EARTH_MASSES_PER_JUPITER_MASS,
  EARTH_MASSES_PER_SOLAR_MASS,
  CERES_MASS_KG,
  HALLEY_MASS_KG,
  DEBRIS_FRAGMENT_MASS_KG,
} from './constants.js';
import { SPACE_OBJECT_NAMES } from './data/objectNames.js';
import { formatNumber, withUnit } from './format.js';
import { forEachCandidatePair } from './spatialHash.js';
import {
  drawSolarLabel,
  EARTH_SYMBOL,
  debugLog,
  hexToRgb,
  computeDynamicColor,
  getStarColor,
  worldToScreen,
  screenToWorld,
  isOffscreen,
} from './utils.js';
import { recordBarycenter, clearFrameHistory } from './referenceFrame.js';
import { haloAcceleration } from './darkMatter.js';

// Import the getRandomName function from ui.js
// import { getRandomName } from './ui.js';

// Local getRandomName function since it's not exported from ui.js
/**
 * Pick a random display name for a new object of the given type.
 *
 * The pools used to be written out again here, all 355 of them, byte for byte
 * identical to js/data/objectNames.js. Two copies of a table is one copy too
 * many: adding a ninth pool meant adding it twice, and the moment one edit
 * missed the other the same object would be named from two different lists
 * depending on which module made it.
 *
 * @param {string} type - Pool name, e.g. 'stars' or 'galaxies'
 * @returns {string} A name from that pool
 */
const getRandomName = type => {
  const typeNames = SPACE_OBJECT_NAMES[type] || SPACE_OBJECT_NAMES.planets;
  return typeNames[Math.floor(Math.random() * typeNames.length)];
};

// Physics constants and utilities
const DT = 0.1;
const SOLAR_MASS_UNIT = 1000;
// Simulation mass units per Earth mass. Derived from the solar mass for the
// same reason JUPITER_MASS_UNIT is, and it had the same failure: this was a
// literal 3, which is 1000x too heavy. A body built as "1 Earth mass" weighed a
// thousandth of the Sun, and formatMass divided by the same 3 to print "1 M_E"
// back, so the number on screen agreed with itself and disagreed with physics.
//
// Two scenarios had already noticed and patched around it locally with a
// SOLAR_SYSTEM_MASS_SCALE of 0.001, which is exactly the error. Those patches
// are gone; the constant is right instead.
const EARTH_MASS_UNIT = SOLAR_MASS_UNIT / EARTH_MASSES_PER_SOLAR_MASS;
const ABSORB_BUFFER = 6;
// Softening floor on the gravity calculation, to keep a near-miss from
// producing a singular force. Five units is right for scenarios laid out at
// hundreds of units, and completely wrong for a compact one: TRAPPIST-1's seven
// planets orbit between 1.15 and 6.19 units of their star, so six of them sat
// inside the floor, felt a fraction of the gravity they should, and left on
// hyperbolic orbits within a few hundred circuits regardless of timestep. A
// scenario can lower it to suit its own scale.
const MIN_INTERACTION_DISTANCE = 5.0;

/** @returns {number} The softening floor currently in force */
const minInteractionDistance = () => {
  const v = physicsSettings.min_interaction_distance;
  return Number.isFinite(v) && v > 0 ? v : MIN_INTERACTION_DISTANCE;
};
const BH_RADIUS_BASE = 8; // Reduced from 15 to make black holes smaller
const PLANET_RADIUS = 5;
const GAS_GIANT_RADIUS = 8; // Reduced from 15 to make gas giants smaller than stars
const ASTEROID_RADIUS = 2;
const STAR_OBJ_RADIUS = 10;
const NEUTRON_STAR_RADIUS = 3;
const WHITE_DWARF_RADIUS = 8;
const DEBRIS_RADIUS = 2;
const MAX_STAR_MASS_BEFORE_BH = 20.0;

/**
 * The mass at which a star collapses to a black hole, in solar masses.
 *
 * A setting rather than the bare constant, because `max_star_mass_before_bh`
 * has been in DEFAULT_SETTINGS and written by two scenarios since before this
 * function existed, and nothing read it: the threshold was always the literal
 * above, whatever a scenario asked for. Both scenarios happen to ask for 20,
 * which is why nobody noticed, and which is also why wiring it up changes no
 * present behaviour.
 *
 * @returns {number} The threshold in force
 */
const maxStarMassBeforeBH = () => {
  const v = physicsSettings.max_star_mass_before_bh;
  return Number.isFinite(v) && v > 0 ? v : MAX_STAR_MASS_BEFORE_BH;
};
// Disk speed that maps to beta ~ 1 for Doppler beaming. Chosen so a typical
// inner-disk particle lands around beta 0.3-0.5, matching the asymmetry seen
// in real images without needing physical velocity units.
const DISK_REFERENCE_SPEED = 90.0;
const GAS_GIANT_TO_STAR_THRESHOLD = 80.0; // Jupiter masses needed to become a star
// Simulation mass units per Jupiter mass. Derived from the solar mass rather
// than chosen, because the solar mass is the anchor the whole mass scale hangs
// from and a second independent number is a second chance to disagree with it.
// This was 50 for a long time, which is 52.4x too heavy: a gas giant labeled
// "1.00 M_J" in the inspector pulled on its neighbours with 52 Jupiter masses,
// a twentieth of a star. Nothing in the display was wrong about the mass it was
// given; the mass it was given was wrong about Jupiter.
const JUPITER_MASS_UNIT = SOLAR_MASS_UNIT / JUPITER_MASSES_PER_SOLAR_MASS;

// Kilograms in one simulation mass unit. The solar mass is the anchor, so this
// is the one conversion the small-body units below are allowed to go through:
// a second route from kilograms to simulation units would be a second chance
// to disagree with the anchor, which is the failure JUPITER_MASS_UNIT and
// EARTH_MASS_UNIT both had.
const MASS_UNIT_KG = SOLAR_MASS_KG / SOLAR_MASS_UNIT;

// Simulation mass units per Ceres mass, per Halley mass, and per kilometre-scale
// rocky fragment.
//
// Asteroid, Comet and Debris were built with hardcoded masses of 0.1, 0.1 and
// 0.01 units, set without reference to any unit constant. 0.1 units is 33 Earth
// masses. That is not an asteroid by five orders of magnitude, and formatMass
// would happily print one of them in Earth masses and be wrong by all five.
// These are the same architectural line GasGiant has always had - a mass in the
// body's natural unit, multiplied by that unit's size in simulation units - and
// the natural units here are the ones each class already counted in: the Comet
// class has always documented "Halley's Comet = 1.0".
//
// The numbers are small: one Ceres is 4.7e-7 units and one Halley is 1.1e-13.
// That is the correct answer and not a rounding failure. A real asteroid is
// gravitationally irrelevant next to a star, and the point of these bodies in a
// scenario is that they are traced by gravity rather than sources of it.
const CERES_MASS_UNIT = CERES_MASS_KG / MASS_UNIT_KG;
const HALLEY_MASS_UNIT = HALLEY_MASS_KG / MASS_UNIT_KG;
const DEBRIS_MASS_UNIT = DEBRIS_FRAGMENT_MASS_KG / MASS_UNIT_KG;

// The element, or a zero-sized stand-in for it.
//
// The two coordinate transforms below read canvas.width, and there are three
// situations where the element is not there to read: a page that has not
// finished parsing, a test running the physics without a DOM, and the headless
// validation runner. All three used to throw from inside worldToScreen, which
// is a long way from anything a caller could act on. A zero-sized canvas gives
// the same transform with its origin in the corner instead of the middle -
// still exact, still invertible - and is_offscreen already guards for it
// explicitly, so the rest of the module is expecting it.
const canvas = document.getElementById('simulationCanvas') || {
  width: 0,
  height: 0,
};

// Global state variables
let bh_list = [],
  planets = [],
  stars = [],
  gas_giants = [],
  asteroids = [],
  comets = [],
  debris = [],
  particles = [],
  gwaves = [],
  gravity_ripples = [],
  neutron_stars = [],
  white_dwarfs = [],
  galaxies = [],
  accretion_disk_particles = [];

const dispatchSimulationEvent = (name, detail = {}) => {
  if (
    typeof window !== 'undefined' &&
    typeof window.dispatchEvent === 'function' &&
    typeof window.CustomEvent === 'function'
  ) {
    window.dispatchEvent(new window.CustomEvent(name, { detail }));
  }
};

const emitCollisionEvent = detail => {
  dispatchSimulationEvent('gravitasCollision', detail);
};

const buildImpactPayload = (source, target, impactType) => {
  const sourcePos = source?.pos || target?.pos || { x: 0, y: 0 };
  const targetPos = target?.pos || sourcePos;
  const avgPos = {
    x: (sourcePos.x + targetPos.x) / 2,
    y: (sourcePos.y + targetPos.y) / 2,
  };
  const relativeSpeed = Math.hypot(
    (source?.vel?.x || 0) - (target?.vel?.x || 0),
    (source?.vel?.y || 0) - (target?.vel?.y || 0)
  );
  return {
    impactType,
    sourceType: source?.obj_type || source?.constructor?.name || 'Unknown',
    targetType: target?.obj_type || target?.constructor?.name || impactType,
    relativeSpeed,
    masses: [source?.mass || 0, target?.mass || 0],
    position: avgPos,
  };
};

const broadcastImpact = (source, target, impactType) => {
  emitCollisionEvent(buildImpactPayload(source, target, impactType));
};

// Worker state
let physicsWorker = null;
let workerBusy = false;
let workerBuffers = {
  sx: null,
  sy: null,
  sm: null,
  tx: null,
  ty: null,
  tself: null,
};
let workerJobObjects = []; // Stores references to objects currently being processed by worker
let cachedGravityDirty = false; // True while any object holds worker-cached gravity

let PhysicsObject_id_counter = 0;

// Import state from ui.js to ensure single source of truth
let state = null;

// Function to set state reference from ui.js
const setStateReference = stateRef => {
  state = stateRef;
};

// Physics settings that can be updated from UI
let physicsSettings = {
  gravitational_constant: 1.0,
  mutual_gravity: false,
  enable_star_merging: true,
  show_bh_glow: true,
  show_accretion_disk: true,
  realistic_disk_physics: true,
  show_bh_jets: false,
  trail_length: 100,
  dynamic_object_properties: true,
  star_base_color: '#ffff00',
  planet_base_color: '#6495ed',
  bh_behavior: 'Static',
  orbit_decay_rate: 0.005,
  max_timestep: 0,
  min_interaction_distance: 0,
  habitable_zone_optimism: 1.0,
  star_only_gravity: false,
  disk_doppler: true,
  use_barnes_hut: false,
  // Calibrated against the direct N^2 solver on a 78-body cluster:
  //   theta 0.3 -> 0.20% mean / 2.6% worst error
  //   theta 0.4 -> 0.46% mean / 3.4% worst   <- default
  //   theta 0.7 -> 3.74% mean / 75.5% worst
  // 0.7 is the textbook default but costs the same here as 0.4 while being an
  // order of magnitude less accurate, so it is not worth the error budget.
  barnes_hut_theta: 0.4,

  // A dark-matter halo added to the force law as a smooth background field.
  // Off by default: the halo is a claim about the universe, and a student
  // should switch it on deliberately and watch what changes.
  //
  // The halo is a field, not a body. It has no position of its own to
  // integrate, it never merges or is captured, and it does not appear in the
  // object counts, because nothing about it is visible. That is the point.
  dark_matter_halo: false,
  halo_v_flat: 6.0,
  halo_core_radius: 300,

  // The numerical scheme the bodies are advanced with. Symplectic Euler is the
  // default, and has to stay the default: every shipped scenario was laid out,
  // timed and tuned against its particular error, and quietly moving them to a
  // more accurate scheme would change the dynamics of all of them at once.
  // See INTEGRATORS below for what the other two are for.
  integrator: 'Symplectic Euler',
};

// =============================================================================
// Simulated time, and the accelerations the last step actually used
// -----------------------------------------------------------------------------
// Both exist so that something outside the physics can report on it without
// recomputing it. A readout that recalculated the acceleration on a body would
// be a second implementation of the force law, free to disagree with the one
// the integrator used; the point of publishing it is that it cannot.
// =============================================================================

let simulationTime = 0;

/** @returns {number} Simulated time since the world was built, in sim units */
const getSimulationTime = () => simulationTime;

/** Put the simulated clock back to zero. Called when a world is built. */
const resetSimulationTime = () => {
  simulationTime = 0;
};

/**
 * Set the simulated clock, for a state that is being restored rather than built.
 *
 * The A/B bench needs this: Run B has to resume from the same point on the
 * clock Run A started from, or the two runs cannot be put on one time axis
 * without a fudge factor. Nothing in the integrator reads the clock - it is a
 * readout, and the conservation baseline's own timestamp - so setting it moves
 * the reported time and nothing else.
 *
 * @param {number} t - Simulated seconds
 */
const setSimulationTime = t => {
  simulationTime = Number.isFinite(t) && t >= 0 ? t : 0;
};

// =============================================================================
// Absorption by a black hole
// -----------------------------------------------------------------------------
// What accretion does to the hole that did the accreting.
//
// This used to be one line - `bh.mass += this.mass` - inside
// PhysicsObject.check_absorption. The hole gained the mass and kept its own
// velocity, so a body falling into a moving hole deposited its mass and threw
// its momentum away. That is not a small effect in the scenarios that lean on
// it: Stellar Graveyard absorbs 98% of its mass within a few seconds, and the
// linear-momentum drift the stability probe reported for Star Cluster,
// Stellar Graveyard and Black Hole Billiards was almost entirely this.
//
// Awkwardly, the engine already had the right answer written down twice.
// handle_star_merging sets a hole that swallows a star to the mass-weighted
// mean velocity, and the black-hole/black-hole merger below builds its product
// at the mass-weighted mean of both position and velocity. Absorption was the
// one path of the three that did neither. It now does the same thing as the
// BH-BH merger, which is the more complete of the two.
//
// The model is a perfectly inelastic collision:
//
//   M      = m_bh + m_body
//   r_new  = (m_bh r_bh + m_body r_body) / M
//   v_new  = (m_bh v_bh + m_body v_body) / M
//
// Total mass, total linear momentum and the system's centre of mass are then
// all exactly preserved across the event. Kinetic energy is not, and is not
// meant to be: an inelastic merger is where the energy goes.
//
// What is NOT preserved, and cannot be
// -----------------------------------------------------------------------------
// Total angular momentum splits into the motion of the centre of mass and the
// pair's motion about it:
//
//   L_total = L_com + L_spin,     L_spin = mu * (r_rel x v_rel)
//   mu      = m_bh * m_body / M
//
// Collapsing the pair to a single point mass keeps L_com exactly and discards
// L_spin. Physically L_spin is not lost at all - it becomes black-hole spin,
// and a body spiralling in through an accretion disk is the standard way a real
// hole is spun up. Gravitas models a hole as a point mass with no spin degree
// of freedom, so there is nowhere for it to go.
//
// It is therefore banked rather than dropped. Each hole accumulates the spin
// angular momentum it has swallowed in `spin_angular_momentum`, and the module
// keeps the running total, so the size of the departure is a number anyone can
// read instead of a caveat in a comment. It is bounded and small: the body is
// inside `bh.radius + ABSORB_BUFFER` when this runs, so
//
//   |L_spin| <= mu * (r_horizon + ABSORB_BUFFER) * |v_rel|
//
// and for the usual case of a small body falling into a large hole mu tends to
// the body's own mass.
//
// When the transfer is suppressed
// -----------------------------------------------------------------------------
// Two configurations are deliberate approximations, documented as such on the
// model page and flagged by conservationCaveats(), and both of them describe a
// hole that is not a dynamical participant:
//
//   * A static hole (bh_behavior other than 'Orbiting') is a fixed potential
//     well - it pulls on everything and is pulled by nothing. Giving one a
//     recoil would be the one moment in its life it responded to another body,
//     and it would then be visibly nudged off the mark a scenario placed it on.
//
//   * One-way gravity (mutual_gravity off, or star_only_gravity on) makes the
//     small bodies test particles with no dynamical influence. Momentum they
//     never exerted through gravity should not appear at the moment they are
//     eaten.
//
// In both cases the hole still gains the mass, exactly as before, and the
// momentum that goes nowhere is added to the discarded total below so that it
// too is quantified rather than silent.
// =============================================================================

let absorbedSpinAngularMomentum = 0;
let discardedAbsorptionMomentum = { x: 0, y: 0 };

/**
 * The angular momentum banked as black-hole spin by every absorption so far.
 * @returns {number} Sum of mu * (r_rel x v_rel), in simulation units
 */
const getAbsorbedSpinAngularMomentum = () => absorbedSpinAngularMomentum;

/**
 * The linear momentum absorption has thrown away in static and one-way-gravity
 * configurations, where the hole is not a dynamical participant.
 * @returns {{x: number, y: number}} Running total
 */
const getDiscardedAbsorptionMomentum = () => ({
  ...discardedAbsorptionMomentum,
});

/** Clear the absorption accounting. Called when a world is built. */
const resetAbsorptionAccounting = () => {
  absorbedSpinAngularMomentum = 0;
  discardedAbsorptionMomentum = { x: 0, y: 0 };
};

/**
 * Whether an absorption by this hole should move the hole.
 *
 * A mock hole from a unit test carries neither `can_move` nor a velocity; it is
 * treated as a hole that cannot move, so the mass transfer still happens and
 * nothing reads an undefined vector.
 *
 * @param {object} bh - The absorbing black hole
 * @returns {boolean} True when the hole takes the recoil
 */
const absorptionMovesHole = bh => {
  if (!bh || !bh.vel) return false;
  if (!Number.isFinite(bh.vel.x) || !Number.isFinite(bh.vel.y)) return false;
  if (typeof bh.can_move === 'function' && !bh.can_move()) return false;
  if (typeof bh.can_move !== 'function') return false;
  if (physicsSettings.mutual_gravity !== true) return false;
  if (physicsSettings.star_only_gravity === true) return false;
  return true;
};

/**
 * Merge a body into a black hole, conserving what the model can conserve.
 *
 * @param {object} bh - The absorbing black hole
 * @param {object} body - The body being absorbed; already marked not alive
 * @returns {void}
 */
const absorb_into_black_hole = (bh, body) => {
  const m1 = Number.isFinite(bh.mass) ? bh.mass : 0;
  const m2 = Number.isFinite(body.mass) ? body.mass : 0;
  const total = m1 + m2;

  if (!(total > 0) || m2 === 0) {
    bh.mass = total;
    if (typeof bh.updateRadius === 'function') bh.updateRadius();
    return;
  }

  if (!absorptionMovesHole(bh)) {
    // The hole keeps its state. Record the momentum that consequently goes
    // nowhere, so the departure is measured rather than assumed small.
    if (
      body.vel &&
      Number.isFinite(body.vel.x) &&
      Number.isFinite(body.vel.y)
    ) {
      discardedAbsorptionMomentum.x += m2 * body.vel.x;
      discardedAbsorptionMomentum.y += m2 * body.vel.y;
    }
    bh.mass = total;
    if (typeof bh.updateRadius === 'function') bh.updateRadius();
    return;
  }

  const bx = body.pos?.x ?? bh.pos.x;
  const by = body.pos?.y ?? bh.pos.y;
  const bvx = body.vel?.x ?? bh.vel.x;
  const bvy = body.vel?.y ?? bh.vel.y;

  // Banked before the state is overwritten: r_rel and v_rel are relative to the
  // hole as it is now, not as the merged object will be.
  const mu = (m1 * m2) / total;
  const rx = bx - bh.pos.x;
  const ry = by - bh.pos.y;
  const vx = bvx - bh.vel.x;
  const vy = bvy - bh.vel.y;
  const spin = mu * (rx * vy - ry * vx);
  if (Number.isFinite(spin)) {
    absorbedSpinAngularMomentum += spin;
    bh.spin_angular_momentum = (bh.spin_angular_momentum || 0) + spin;
  }

  const px = (bh.pos.x * m1 + bx * m2) / total;
  const py = (bh.pos.y * m1 + by * m2) / total;
  const pvx = (bh.vel.x * m1 + bvx * m2) / total;
  const pvy = (bh.vel.y * m1 + bvy * m2) / total;

  // The same refusal PhysicsObject.apply_step makes: a non-finite hole poisons
  // every body in the scene through the gravity sum and nothing recovers.
  if (
    Number.isFinite(px) &&
    Number.isFinite(py) &&
    Number.isFinite(pvx) &&
    Number.isFinite(pvy)
  ) {
    bh.pos.x = px;
    bh.pos.y = py;
    bh.vel.x = pvx;
    bh.vel.y = pvy;
  }

  bh.mass = total;
  if (typeof bh.updateRadius === 'function') bh.updateRadius();
};

// =============================================================================
// Live conservation diagnostics
// -----------------------------------------------------------------------------
// Energy and angular momentum, against a baseline taken when the world was
// built, so a student can watch the integrator setting change the answer. The
// definitions are deliberately the same ones tools/scenario-stability.mjs uses
// offline: a readout that measured something slightly different from the
// validation harness would let one of them pass while the other failed and
// leave nobody able to say which was right.
//
// Debris, particles and disk fragments are left out, on the same grounds the
// barycenter leaves them out: they are culled aggressively once they leave the
// visible world, and a body vanishing from the sum is a step change in the
// total that has nothing to do with the integrator.
// =============================================================================

/**
 * The bodies the conserved quantities are summed over.
 * @returns {Array} Live list, rebuilt on each call
 */
const conservedBodies = () =>
  [
    ...bh_list,
    ...stars,
    ...neutron_stars,
    ...white_dwarfs,
    ...planets,
    ...gas_giants,
    ...asteroids,
    ...comets,
    ...galaxies,
  ].filter(b => b && b.alive !== false && Number.isFinite(b.mass));

/**
 * Total energy and angular momentum of the current configuration.
 *
 * The potential is the full pairwise sum, which is O(N^2); the caller decides
 * how often to pay for it. Angular momentum is taken about the instantaneous
 * center of mass, so a system drifting across the screen does not report a
 * growing L.
 *
 * @returns {{energy: number, angular: number, count: number}} The totals
 */
const conservedQuantities = () => {
  const bodies = conservedBodies();
  const n = bodies.length;
  const G = physicsSettings.gravitational_constant;

  // Flat arrays, and Math.sqrt rather than Math.hypot in the inner loop. This
  // is the one O(N^2) sum in the application: a nine-hundred-body scene is
  // four hundred thousand pairs, and hypot - which guards against intermediate
  // overflow the simulation's coordinates cannot reach - costs several times
  // what the square root does. Measured on Galactic Collision, the two changes
  // together take this from 29ms to 2.8.
  const px = new Float64Array(n);
  const py = new Float64Array(n);
  const mass = new Float64Array(n);
  let m = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < n; i++) {
    const b = bodies[i];
    px[i] = b.pos.x;
    py[i] = b.pos.y;
    mass[i] = b.mass;
    m += b.mass;
    cx += b.mass * b.pos.x;
    cy += b.mass * b.pos.y;
  }
  const ox = m > 0 ? cx / m : 0;
  const oy = m > 0 ? cy / m : 0;

  let energy = 0;
  let angular = 0;
  for (let i = 0; i < n; i++) {
    const b = bodies[i];
    energy += 0.5 * mass[i] * (b.vel.x * b.vel.x + b.vel.y * b.vel.y);
    angular += mass[i] * ((px[i] - ox) * b.vel.y - (py[i] - oy) * b.vel.x);
    const gmi = G * mass[i];
    let pot = 0;
    for (let j = i + 1; j < n; j++) {
      const dx = px[i] - px[j];
      const dy = py[i] - py[j];
      const r2 = dx * dx + dy * dy;
      if (r2 > 0) pot -= mass[j] / Math.sqrt(r2);
    }
    energy += gmi * pot;
  }
  return { energy, angular, count: n };
};

let conservationBaseline = null;

/**
 * Take the reference state the drift is measured against.
 *
 * Called when a world is built, and available to the user as a "rebaseline"
 * so a drift figure can be started from a configuration that has settled
 * rather than from the instant of construction.
 *
 * @returns {object} The new baseline
 */
const resetConservationBaseline = () => {
  invalidateConservationCache();
  const now = conservedQuantities();
  conservationBaseline = {
    energy: now.energy,
    angular: now.angular,
    count: now.count,
    atTime: simulationTime,
  };
  return conservationBaseline;
};

/**
 * Reasons the configuration is not expected to conserve anything, so a drift
 * figure can say whether it is measuring the scheme or the model.
 *
 * Each of these is a deliberate simplification that is documented elsewhere in
 * this file, and each of them breaks a conservation law by construction rather
 * than by numerical error. A diagnostic that reported 40% energy drift without
 * saying "there is a static black hole in this scene" would be blamed on the
 * integrator.
 *
 * @returns {Array<string>} Short reasons, empty when the system is closed
 */
const conservationCaveats = () => {
  // Message ids rather than sentences: physics.js is the wrong place to hold
  // prose, and the readout that prints these is drawn on the canvas in the
  // reader's language. js/sandboxTools.js translates them at the point of use.
  const out = [];
  if (bh_list.length > 0 && physicsSettings.bh_behavior !== 'Orbiting') {
    out.push('caveat.staticBlackHole');
  }
  if (
    physicsSettings.star_only_gravity === true ||
    physicsSettings.mutual_gravity !== true
  ) {
    out.push('caveat.oneWayGravity');
  }
  if (physicsSettings.dark_matter_halo === true) {
    out.push('caveat.halo');
  }
  if ((physicsSettings.orbit_decay_rate || 0) > 0 && bh_list.length > 1) {
    out.push('caveat.orbitDecay');
  }
  if (physicsSettings.enable_star_merging === true) {
    out.push('caveat.merging');
  }
  // Tidal stripping runs whenever there is a hole for a body to pass close to,
  // and it is not gated by a setting the way merging is. It removes mass from
  // the body and returns fixed-mass fragments that do not account for it, so it
  // is a mass sink and therefore an energy and momentum sink too.
  if (bh_list.length > 0) {
    out.push('caveat.tidalDisruption');
  }
  return out;
};

// The drift readout is repainted every frame and the potential sum inside it is
// O(N^2): a nine-hundred-body scene is four hundred thousand pairs, which is a
// few milliseconds, and a few milliseconds sixty times a second is most of a
// frame budget spent on a number that changes far too slowly to need it.
//
// So the expensive half - the two totals - is cached and recomputed a few times
// a second. The interval scales with the size of the system, because the cost
// is quadratic in it while the usefulness of a faster update is not: a two-body
// scenario refreshes ten times a second and a thousand-body one twice.
//
// Only the totals are cached. The scheme in force and the reasons the system is
// not closed are free to compute and can change between two frames, so they are
// read fresh every time; a readout that named the previous integrator for half
// a second after the setting changed would look like the setting had not taken.
let totalsCache = null;
let totalsCachedAt = -Infinity;
let totalsCachedGeneration = -1;

// How long to wait before measuring again, from how long the last measurement
// took. The rule is a budget rather than a schedule: never spend more than one
// frame in fifty on the readout, whatever the scene turns out to cost. A
// three-body system refreshes at the floor of ten times a second; a
// nine-hundred-body one, where the sum is a few milliseconds, backs off to
// about three times a second on its own and needs no special case.
const DRIFT_BUDGET = 50;
const DRIFT_MIN_MS = 100;
const DRIFT_MAX_MS = 2000;
let lastDriftCostMs = 0;

const driftIntervalMs = () =>
  Math.min(
    DRIFT_MAX_MS,
    Math.max(DRIFT_MIN_MS, lastDriftCostMs * DRIFT_BUDGET)
  );

const monotonicMs = () =>
  typeof performance !== 'undefined' && performance.now
    ? performance.now()
    : Date.now();

/** Throw away the cached totals, so the next read measures the world again. */
const invalidateConservationCache = () => {
  totalsCache = null;
  totalsCachedAt = -Infinity;
};

/**
 * The conserved totals, measured now or read from the cache.
 * @param {boolean} fresh - Skip the cache
 * @returns {{energy: number, angular: number, count: number}} The totals
 */
const cachedConservedQuantities = fresh => {
  const nowMs = monotonicMs();
  if (
    !fresh &&
    totalsCache &&
    totalsCachedGeneration === worldGeneration &&
    nowMs - totalsCachedAt < driftIntervalMs()
  ) {
    return totalsCache;
  }
  totalsCache = conservedQuantities();
  lastDriftCostMs = monotonicMs() - nowMs;
  totalsCachedAt = nowMs;
  totalsCachedGeneration = worldGeneration;
  return totalsCache;
};

/**
 * Drift from the baseline, as percentages.
 *
 * @param {boolean} [fresh] - Skip the cache and measure the totals now
 * @returns {?object} energyDrift, angularDrift, the raw totals, the baseline,
 *   the caveats, and the body count; null before a baseline exists
 */
const conservationDrift = (fresh = false) => {
  if (!conservationBaseline) return null;
  const now = cachedConservedQuantities(fresh);
  const e0 = conservationBaseline.energy;
  const l0 = conservationBaseline.angular;
  return {
    energy: now.energy,
    angular: now.angular,
    baselineEnergy: e0,
    baselineAngular: l0,
    energyDrift: e0 !== 0 ? (100 * (now.energy - e0)) / Math.abs(e0) : NaN,
    angularDrift: l0 !== 0 ? (100 * (now.angular - l0)) / Math.abs(l0) : NaN,
    count: now.count,
    baselineCount: conservationBaseline.count,
    elapsed: simulationTime - conservationBaseline.atTime,
    integrator: activeIntegrator(),
    caveats: conservationCaveats(),
  };
};

/**
 * Bring a body's reported mass back into agreement with its actual one.
 *
 * Every class carries its mass twice: once as `mass`, in simulation units,
 * which is what gravity uses, and once in the unit the class is built and
 * displayed in - Earth masses, Jupiter masses, solar masses, Ceres masses,
 * Halley masses, fragments. Any code that writes `mass` and leaves the other
 * one behind produces a body that gravitates as one thing and is labelled as
 * another, which is the single most repeated bug in this file's history.
 *
 * @param {object} obj - The body
 * @returns {object} The same body
 */
const syncReportedMass = obj => {
  if (!obj || !Number.isFinite(obj.mass)) return obj;
  if (obj.massInEarths != null) obj.massInEarths = obj.mass / EARTH_MASS_UNIT;
  if (obj.massInJupiters != null) {
    obj.massInJupiters = obj.mass / JUPITER_MASS_UNIT;
  }
  if (obj.massInSuns != null) obj.massInSuns = obj.mass / SOLAR_MASS_UNIT;
  if (obj.massInCeres != null) obj.massInCeres = obj.mass / CERES_MASS_UNIT;
  if (obj.massInComets != null) obj.massInComets = obj.mass / HALLEY_MASS_UNIT;
  if (obj.massInFragments != null) {
    obj.massInFragments = obj.mass / DEBRIS_MASS_UNIT;
  }
  return obj;
};

/**
 * The gravitational sources acting on one body, right now.
 *
 * The same list the integrator sums over, filtered the same way, so a drawing
 * built on it shows the forces that are actually being applied rather than the
 * ones a second piece of code thinks should be.
 *
 * @param {object} body - The body being acted on
 * @returns {Array} The sources, excluding the body itself
 */
const gravitySourcesFor = body => {
  if (!body) return [];
  return cachedMajorSources.filter(s => s && s.id !== body.id);
};

/**
 * Decompose the acceleration on one body into one term per source.
 *
 * `total` is the acceleration the integrator used on the last step, read back
 * from the body rather than recomputed, so the arrow drawn for it cannot
 * disagree with the motion. `sources` is the same force law evaluated one
 * source at a time; their sum is the gravitational part of the total, and the
 * difference between that sum and the total is whatever else acted - the halo,
 * or a Barnes-Hut approximation - which is reported rather than hidden.
 *
 * @param {object} body - The body
 * @returns {?object} total, sources, sumOfSources and residual, or null
 */
const accelerationBreakdown = body => {
  if (!body || body.alive === false) return null;
  const G_val = physicsSettings.gravitational_constant;
  const min_dist_sq = minInteractionDistance() ** 2;
  const sources = [];
  let sx = 0;
  let sy = 0;
  for (const s of gravitySourcesFor(body)) {
    const dx = s.pos.x - body.pos.x;
    const dy = s.pos.y - body.pos.y;
    let r_sq = dx * dx + dy * dy;
    if (!(r_sq >= 0) || !isFinite(s.mass)) continue;
    if (r_sq < min_dist_sq) r_sq = min_dist_sq;
    if (r_sq === 0) continue;
    const a_mag = (G_val * s.mass) / r_sq;
    const r_inv = 1 / Math.sqrt(r_sq);
    const ax = a_mag * dx * r_inv;
    const ay = a_mag * dy * r_inv;
    sx += ax;
    sy += ay;
    sources.push({
      id: s.id ?? -1,
      label: s.name || s.obj_type || 'source',
      type: s.obj_type || s.constructor?.name || 'source',
      mass: s.mass,
      ax,
      ay,
    });
  }
  // Strongest first, so a body with twenty sources draws the ones that matter
  // on top of the ones that do not.
  sources.sort((a, b) => Math.hypot(b.ax, b.ay) - Math.hypot(a.ax, a.ay));

  // The halo is a smooth background field rather than a body, so it is not a
  // source with an arrow of its own; it is reported separately and included in
  // the total, which is what stops the components from failing to add up in a
  // scenario that has one switched on.
  const halo = activeHalo();
  const field = halo ? haloAcceleration(body.pos, halo) : { ax: 0, ay: 0 };

  // `total` is evaluated at the body's position now, which is where the arrow
  // is drawn from, so the components add up to it exactly. `stepped` is what
  // the integrator used on the last step, taken from the position the body was
  // at before it moved; the two agree to one step's worth of change, and the
  // difference between them is a statement about the timestep rather than about
  // either of them being wrong.
  const total = { ax: sx + field.ax, ay: sy + field.ay };
  const stepped = body.last_accel
    ? { ax: body.last_accel.x, ay: body.last_accel.y }
    : null;
  return {
    total,
    sources,
    field,
    stepped,
    sumOfSources: { ax: sx, ay: sy },
    residual: { ax: total.ax - sx - field.ax, ay: total.ay - sy - field.ay },
  };
};

/**
 * Record the acceleration each body is about to be stepped with.
 *
 * Written onto the body rather than into a side table so it cannot go stale
 * against a body that has been culled, and mutated in place rather than
 * replaced so a scenario with three thousand fragments does not allocate three
 * thousand objects every frame.
 *
 * @param {Array} objs - The bodies, in the same index order as stepAx/stepAy
 * @param {number} count - How many
 */
const publishStepAccelerations = (objs, count) => {
  for (let i = 0; i < count; i++) {
    const obj = objs[i];
    if (!obj) continue;
    if (obj.last_accel) {
      obj.last_accel.x = stepAx[i];
      obj.last_accel.y = stepAy[i];
    } else {
      obj.last_accel = { x: stepAx[i], y: stepAy[i] };
    }
  }
};

/**
 * The halo parameters currently in force, or null when the halo is switched off.
 *
 * Centered on the origin, which is where every scenario that means to have a
 * halo puts the thing the halo belongs to.
 *
 * @returns {?{vFlat: number, coreRadius: number}} Halo parameters
 */
const activeHalo = () =>
  physicsSettings.dark_matter_halo
    ? {
        vFlat: physicsSettings.halo_v_flat,
        coreRadius: physicsSettings.halo_core_radius,
      }
    : null;

/**
 * Whether the Barnes-Hut worker path is currently driving gravity.
 * @returns {boolean} True when approximate tree gravity is active
 */
const isBarnesHutActive = () =>
  physicsSettings.mutual_gravity === true &&
  physicsSettings.use_barnes_hut === true;

/**
 * Drop accelerations and potentials cached from the Barnes-Hut worker.
 * Called whenever the worker path is not active so stale values from a
 * previous run cannot be mistaken for current ones.
 */
const clearCachedGravity = () => {
  if (!cachedGravityDirty) return;
  for (let i = 0; i < cachedAllPhysicsObjects.length; i++) {
    const obj = cachedAllPhysicsObjects[i];
    if (!obj) continue;
    obj.cached_accel = undefined;
    obj.cached_phi = undefined;
  }
  for (let i = 0; i < workerJobObjects.length; i++) {
    const obj = workerJobObjects[i];
    if (!obj) continue;
    obj.cached_accel = undefined;
    obj.cached_phi = undefined;
  }
  workerJobObjects = [];
  cachedGravityDirty = false;
};

// Click hit-radius minimums scaled by 1/state.zoom

// Screen-space floor for drawing a body, in pixels of radius.
//
// At true Solar System scale Neptune sits 78x further out than Mercury, so no
// single zoom shows the whole system with everything visible: zoomed out far
// enough to see Neptune, Earth's 7-unit radius covers less than a pixel and the
// planets vanish. Clicking already had this problem and already solved it with
// CLICK_MIN_RADIUS, so drawing uses the same trick.
//
// This is deliberately a *drawing* floor only. The world radius is what decides
// collisions and merging, and inflating that to make planets visible would let
// the Sun swallow Mercury for cosmetic reasons. Zoom in and the dot grows into
// the body's true relative size; zoom out and it holds at a visible minimum.
const DRAW_MIN_RADIUS_PX = 2.75;

// In a crowded scenario the floor works against itself: a thousand bodies each
// held at 2.75px turns a galaxy into a single blob, where the point is the
// structure. Dense fields get a smaller floor, so they read as a field of
// specks while an eight-planet system still reads as eight planets.
const CROWDED_COUNT = 250;
const DRAW_MIN_RADIUS_PX_CROWDED = 1.35;

let liveBodyCount = 0;

/** Record how many bodies are on screen, for the crowding rule above. */
const setLiveBodyCount = n => {
  liveBodyCount = n;
};

/**
 * Radius to draw a body at, in world units.
 * @param {Object} obj - Body with a radius
 * @returns {number} Radius to draw, never below a few screen pixels
 */
const drawRadius = obj => {
  const z = (state && state.zoom) || 1;
  const px =
    liveBodyCount > CROWDED_COUNT
      ? DRAW_MIN_RADIUS_PX_CROWDED
      : DRAW_MIN_RADIUS_PX;
  const floor = px / z;
  return obj.radius > floor ? obj.radius : floor;
};

const CLICK_MIN_RADIUS = {
  BlackHole: 14,
  Star: 12,
  GasGiant: 12,
  Planet: 10,
  NeutronStar: 10,
  WhiteDwarf: 10,
  Asteroid: 8,
  Comet: 8,
  Galaxy: 16,
};

// Function to update physics settings
const updatePhysicsSettings = settings => {
  physicsSettings = { ...physicsSettings, ...settings };
};

/**
 * Read a single physics setting. Lets other modules observe the live physics
 * configuration without importing the mutable object itself.
 * @param {string} key - Setting name
 * @returns {any} Current value
 */
const getPhysicsSetting = key => physicsSettings[key];

// Adaptive level-of-detail multiplier owned by the renderer (see render.js).
// Kept separate from physicsSettings so it can never be persisted to a save
// file or written back over a user setting.
let detailScale = 1;

/**
 * Set the adaptive level-of-detail multiplier.
 * @param {number} scale - Multiplier applied to detail budgets (clamped 0.5-1.5)
 */
const setDetailScale = scale => {
  // Capped at 1: adaptive detail may only trim below what the user asked for,
  // never inflate past it.
  detailScale =
    typeof scale === 'number' && isFinite(scale)
      ? Math.max(0.5, Math.min(1, scale))
      : 1;
};

/**
 * Get the current adaptive level-of-detail multiplier.
 * @returns {number} Current detail scale
 */
/**
 * Sample counter for trails.
 *
 * Every live body appends one trail point per physics step, so a shared counter
 * is enough to say which samples were taken at the same moment. That is what
 * lets one body's trail be re-expressed in another body's frame: without a
 * common clock the two arrays are just two lists of coordinates, and lining them
 * up by array index breaks the moment one body is younger than the other.
 */
let trailTick = 0;

/** @returns {number} The tick of the most recent trail sample */
const getTrailTick = () => trailTick;

/** Restart the trail clock and drop frame history. Called when the world is rebuilt. */
const resetTrailTick = () => {
  trailTick = 0;
  clearFrameHistory();
};

/**
 * How many trail samples a body keeps.
 *
 * Extracted from update_trail so the barycenter history can be kept to exactly
 * the same length. A barycenter history shorter than the trails would silently
 * truncate the re-expressed trails; one longer would just waste memory.
 *
 * @returns {number} Sample budget, at least 1
 */
const trailBudget = () => {
  // Zoom-based budget: fewer points when zoomed out, more when zoomed in
  const zoom = state ? state.zoom : 1.0;
  // detailScale is the renderer's adaptive-quality multiplier. It is applied
  // here, at read time, so the user's configured trail_length is never
  // overwritten.
  const baseLen = Math.max(
    1,
    Math.round(physicsSettings.trail_length * detailScale)
  );
  if (baseLen < 10) {
    // Preserve exact behavior for small budgets (tests rely on this)
    return baseLen;
  }
  const minLen = Math.max(10, Math.floor(baseLen * 0.4));
  const maxLen = Math.max(baseLen, 10);
  return Math.max(
    minLen,
    Math.min(maxLen, Math.floor(baseLen * Math.min(1.5, Math.max(0.6, zoom))))
  );
};

const getDetailScale = () => detailScale;

// Utility functions
/**
 * Reset the physics object ID counter to 0
 */
const resetPhysicsObjectCounter = () => {
  PhysicsObject_id_counter = 0;
};

/**
 * Set the physics object ID counter to a specific value
 * @param {number} value - The new counter value
 */
const setPhysicsObjectCounter = value => {
  PhysicsObject_id_counter = value;
};

// Coordinate transformation functions (using utils)
/**
 * Convert world coordinates to screen coordinates
 * @param {Object} pos - World position with x, y properties
 * @returns {Object} Screen position with x, y properties
 */
const world_to_screen = pos => {
  if (!state) return { x: 0, y: 0 }; // Fallback if state not set
  return worldToScreen(pos, state, canvas);
};
/**
 * Convert screen coordinates to world coordinates
 * @param {Object} spos - Screen position with x, y properties
 * @returns {Object} World position with x, y properties
 */
const screen_to_world = spos => {
  if (!state) return { x: 0, y: 0 }; // Fallback if state not set
  return screenToWorld(spos, state, canvas);
};
/**
 * Check if a position is offscreen
 * @param {Object} pos - World position with x, y properties
 * @param {number} buffer_factor - Buffer factor for offscreen detection
 * @returns {boolean} True if position is offscreen
 */
const is_offscreen = (pos, buffer_factor = 10.0) => {
  if (!state) return false; // Fallback if state not set
  if (!canvas) return false; // Fallback if canvas not available

  // A zero-area canvas (page opened in a background tab, a hidden container, a
  // window mid-restore) would make the visible world zero-width and report
  // every object as off-screen, wiping the simulation on the first frame.
  if (!(canvas.width > 0) || !(canvas.height > 0)) return false;

  // Scale buffer factor with zoom level to prevent aggressive culling
  const zoom_adjusted_buffer = buffer_factor * Math.max(1.0, state.zoom);
  return isOffscreen(pos, state, canvas, zoom_adjusted_buffer);
};

// Color utilities (using utils)
/**
 * Compute dynamic color based on proximity to black holes
 * @param {string} base_color_hex - Base color in hex format
 * @param {Object} pos - Position object with x, y properties
 * @param {Array} bh_list - Array of black hole objects
 * @param {number} threshold - Distance threshold for color change
 * @param {Object} target_color - Target RGB color to blend towards
 * @param {Object} settings - Settings object (optional)
 * @returns {string} RGB color string
 */
const compute_dynamic_color = computeDynamicColor;

// Core physics function
/**
 * Calculate gravitational acceleration at a target position from multiple sources
 * @param {Object} target_pos - Target position with x, y properties
 * @param {Array} sources - Array of gravitational source objects with pos and mass properties
 * @returns {Object} Acceleration vector with ax, ay properties
 */
// Optimized gravitational acceleration with distance caching
const gravitational_acceleration = (target_pos, sources) => {
  let ax = 0.0,
    ay = 0.0;
  const G_val = physicsSettings.gravitational_constant;
  const min_dist_sq = minInteractionDistance() ** 2;

  for (let i = 0; i < sources.length; i++) {
    const s = sources[i];
    const dx = s.pos.x - target_pos.x;
    const dy = s.pos.y - target_pos.y;
    let r_sq = dx * dx + dy * dy;

    // A single non-finite source would return NaN here, and because every body
    // sums over the same source list that NaN reaches the whole simulation in
    // one frame and never washes out. Skip the bad source instead.
    if (!(r_sq >= 0) || !isFinite(s.mass)) continue;

    if (r_sq < min_dist_sq) r_sq = min_dist_sq;
    if (r_sq === 0) continue;

    // Avoid sqrt when possible - use r_sq directly
    const a_mag = (G_val * s.mass) / r_sq;
    const r_inv = 1 / Math.sqrt(r_sq);

    ax += a_mag * dx * r_inv;
    ay += a_mag * dy * r_inv;
  }
  return { ax, ay };
};

/**
 * Return the body with the greatest mass from an array.
 * @param {Array<{mass:number}>} bodies
 * @returns {any|null}
 */
const getMostMassiveBody = bodies => {
  if (!Array.isArray(bodies) || bodies.length === 0) return null;
  let mostMassive = null;
  let maxMass = -Infinity;
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    if (!b || typeof b.mass !== 'number') continue;
    if (b.mass > maxMass) {
      maxMass = b.mass;
      mostMassive = b;
    }
  }
  return mostMassive;
};

/**
 * Sample a two-body Keplerian orbit around a central mass (at the origin)
 * using symplectic Euler integration.
 * The integrator updates velocity first using acceleration at the current
 * position, then advances position using the updated velocity.
 * @param {Object} params
 * @param {{x:number,y:number}} params.r0 - Initial position (world units)
 * @param {{x:number,y:number}} params.v0 - Initial velocity (world units per second)
 * @param {number} params.mCentral - Central mass (simulation mass units)
 * @param {number} params.dt - Timestep
 * @param {number} params.steps - Number of steps to integrate
 * @returns {Array<{x:number,y:number}>} Array of sampled positions including the initial position
 */
const sampleTwoBodyOrbit = ({ r0, v0, mCentral, dt, steps }) => {
  // Validate inputs
  if (
    !r0 ||
    !v0 ||
    typeof r0.x !== 'number' ||
    typeof r0.y !== 'number' ||
    typeof v0.x !== 'number' ||
    typeof v0.y !== 'number' ||
    typeof mCentral !== 'number' ||
    !isFinite(mCentral) ||
    typeof dt !== 'number' ||
    dt <= 0 ||
    typeof steps !== 'number' ||
    steps <= 0
  ) {
    return [];
  }

  const positions = [];
  const pos = { x: r0.x, y: r0.y };
  const vel = { x: v0.x, y: v0.y };
  const G_val = physicsSettings.gravitational_constant;

  // Always include the initial position
  positions.push({ x: pos.x, y: pos.y });

  for (let i = 0; i < steps; i++) {
    // Acceleration toward origin due to central mass
    const rx = pos.x;
    const ry = pos.y;
    let r2 = rx * rx + ry * ry;
    if (r2 < 1e-9) r2 = 1e-9; // Prevent singularities
    const invR = 1 / Math.sqrt(r2);
    const invR3 = invR / r2; // = 1/r^3
    const ax = -G_val * mCentral * rx * invR3;
    const ay = -G_val * mCentral * ry * invR3;

    // Symplectic Euler: update velocity, then position using new velocity
    vel.x += ax * dt;
    vel.y += ay * dt;
    pos.x += vel.x * dt;
    pos.y += vel.y * dt;

    positions.push({ x: pos.x, y: pos.y });
  }

  return positions;
};

// Scratch acceleration buffers for the two-pass step, grown as the world does
// and reused between frames so a per-frame allocation does not appear in the
// profile of a scenario with a few thousand bodies.
let stepAx = new Float64Array(256);
let stepAy = new Float64Array(256);

// The extra scratch the multi-stage integrators need: a saved copy of the state
// at the start of the step, and the stage derivatives. Allocated on the same
// grow-and-reuse rule as the pair above, and never touched at all while the
// default scheme is selected, so a user who never opens the setting pays
// nothing for its existence.
let intX0 = new Float64Array(256);
let intY0 = new Float64Array(256);
let intVx0 = new Float64Array(256);
let intVy0 = new Float64Array(256);
let intAx = new Float64Array(256);
let intAy = new Float64Array(256);
let intSumVx = new Float64Array(256);
let intSumVy = new Float64Array(256);
let intSumAx = new Float64Array(256);
let intSumAy = new Float64Array(256);
let intKx = new Float64Array(256);
let intKy = new Float64Array(256);

// =============================================================================
// Numerical integrators
// -----------------------------------------------------------------------------
// Symplectic Euler is the scheme every shipped scenario was built and tuned
// against, and it stays the default and the fallback for anything unrecognized.
// The other two exist so that a student can watch the choice of scheme change
// the answer, which is a lesson the sandbox could not previously teach.
//
// What they share: every acceleration in a stage is evaluated from one frozen
// snapshot of every body's position, and no body moves until the whole stage is
// computed. That is the property that makes the forces on a pair equal and
// opposite, and losing it costs both conservation laws - see the note on
// PhysicsObject.apply_step for what that looked like on screen.
//
// What is deliberately outside them:
//
//   Black holes take their own path below. Their step carries the orbit-decay
//   term, which is a phenomenological inspiral model rather than a force, and
//   running a fourth-order scheme over a first-order damping law would report
//   an order it does not have. Within a body's step the holes are frozen, which
//   is exactly what symplectic Euler already did with them.
//
//   The Barnes-Hut worker's cached acceleration is a snapshot from a previous
//   frame. It is correct to reuse once per step and wrong to reuse four times
//   inside one: every stage would see the same force and the scheme would
//   quietly collapse to Euler while still calling itself RK4. The multi-stage
//   schemes therefore evaluate the direct sum, and say so in the settings help.
// =============================================================================

/** The schemes, by the label the settings dropdown uses. */
const INTEGRATORS = ['Symplectic Euler', 'Velocity Verlet', 'RK4'];

/**
 * The scheme in force, always one of INTEGRATORS.
 *
 * Anything unrecognized resolves to symplectic Euler rather than throwing: a
 * saved link or an old scenario file naming a scheme that no longer exists
 * should load into the default, not into a broken simulation.
 *
 * @returns {string} The active scheme's label
 */
const activeIntegrator = () => {
  const want = physicsSettings.integrator;
  return INTEGRATORS.includes(want) ? want : 'Symplectic Euler';
};

/** Grow the multi-stage scratch buffers to hold `n` bodies. */
const growIntegratorScratch = n => {
  if (intX0.length >= n) return;
  const size = Math.max(n, 256);
  intX0 = new Float64Array(size);
  intY0 = new Float64Array(size);
  intVx0 = new Float64Array(size);
  intVy0 = new Float64Array(size);
  intAx = new Float64Array(size);
  intAy = new Float64Array(size);
  intSumVx = new Float64Array(size);
  intSumVy = new Float64Array(size);
  intSumAx = new Float64Array(size);
  intSumAy = new Float64Array(size);
  intKx = new Float64Array(size);
  intKy = new Float64Array(size);
};

/**
 * Fill `axOut`/`ayOut` with the acceleration on every body at its current
 * position.
 *
 * The one place gravity is evaluated for the moving bodies, so every scheme
 * sees the same force law, the same halo, the same softening and the same
 * source list. Positions are read, never written.
 *
 * @param {Array} objs - The bodies, in index order
 * @param {number} count - How many of them to do
 * @param {object|null} halo - The dark-matter halo, or null
 * @param {boolean} allowCache - Whether the Barnes-Hut snapshot may be used
 * @param {Float64Array} axOut - Acceleration, x
 * @param {Float64Array} ayOut - Acceleration, y
 */
const computeAccelerations = (objs, count, halo, allowCache, axOut, ayOut) => {
  const mutual = physicsSettings.mutual_gravity;
  for (let i = 0; i < count; i++) {
    const obj = objs[i];
    axOut[i] = 0;
    ayOut[i] = 0;
    if (!obj.alive) continue;

    if (halo) {
      const { ax, ay } = haloAcceleration(obj.pos, halo);
      axOut[i] += ax;
      ayOut[i] += ay;
    }

    if (allowCache && obj.cached_accel) {
      // Asynchronous gravity from the worker, already computed against one
      // snapshot of the source positions.
      axOut[i] += obj.cached_accel.x;
      ayOut[i] += obj.cached_accel.y;
    } else {
      // Direct sum: the N^2 solver, and the first-frame fallback when the
      // Barnes-Hut worker has not answered yet.
      let effective_sources = cachedMajorSources;
      if (mutual) {
        effective_sources = cachedMajorSources.filter(s => s.id !== obj.id);
      }
      const { ax, ay } = gravitational_acceleration(obj.pos, effective_sources);
      axOut[i] += ax;
      ayOut[i] += ay;
    }
  }
};

/**
 * Write a body's state, refusing anything non-finite.
 *
 * Once a position is NaN it poisons every other body through the gravity sum
 * and the simulation cannot recover without a reload, so a stage that produced
 * one leaves the body where it was. Same rule as PhysicsObject.apply_step.
 *
 * @param {object} obj - The body
 * @param {number} px - Position, x
 * @param {number} py - Position, y
 * @param {number} vx - Velocity, x
 * @param {number} vy - Velocity, y
 */
const writeState = (obj, px, py, vx, vy) => {
  if (!isFinite(px) || !isFinite(py) || !isFinite(vx) || !isFinite(vy)) return;
  obj.pos.x = px;
  obj.pos.y = py;
  obj.vel.x = vx;
  obj.vel.y = vy;
};

/**
 * Velocity Verlet: kick a half step, drift a full one, re-evaluate, kick again.
 *
 * Second order and symplectic, so like the default it has a bounded rather than
 * a secular energy error - but the bound is proportional to dt^2 instead of dt,
 * which at the sandbox's own timestep is roughly a hundredfold smaller. Two
 * force evaluations per step.
 *
 * @param {Array} objs - The bodies
 * @param {number} count - How many
 * @param {number} dt - Timestep
 * @param {object|null} halo - The halo, or null
 */
const stepVelocityVerlet = (objs, count, dt, halo) => {
  growIntegratorScratch(count);
  const half = dt * 0.5;

  // a(t) is already in stepAx/stepAy: the caller computed it before deciding
  // which scheme to run, so the first stage of every scheme is shared.
  for (let i = 0; i < count; i++) {
    const obj = objs[i];
    if (!obj.alive) continue;
    const vxh = obj.vel.x + stepAx[i] * half;
    const vyh = obj.vel.y + stepAy[i] * half;
    intVx0[i] = vxh;
    intVy0[i] = vyh;
    writeState(obj, obj.pos.x + vxh * dt, obj.pos.y + vyh * dt, vxh, vyh);
  }

  computeAccelerations(objs, count, halo, false, intAx, intAy);

  for (let i = 0; i < count; i++) {
    const obj = objs[i];
    if (!obj.alive) continue;
    writeState(
      obj,
      obj.pos.x,
      obj.pos.y,
      intVx0[i] + intAx[i] * half,
      intVy0[i] + intAy[i] * half
    );
  }
};

/**
 * Classical fourth-order Runge-Kutta on the first-order system (x' = v,
 * v' = a(x)).
 *
 * Fourth-order accurate and not symplectic, which is the interesting pair of
 * facts: over a few orbits it is far more accurate than either of the others,
 * and over a few thousand it loses energy steadily rather than oscillating,
 * because nothing constrains it to a nearby Hamiltonian. That contrast is the
 * whole reason the setting exists. Four force evaluations per step.
 *
 * The stages are written into the bodies' own positions and then read back,
 * rather than into a private array, because the sources gravity is summed over
 * are the same objects: a stage that left the sources behind at their old
 * positions would be integrating a different problem from the one on screen,
 * and would not be fourth order in it.
 *
 * @param {Array} objs - The bodies
 * @param {number} count - How many
 * @param {number} dt - Timestep
 * @param {object|null} halo - The halo, or null
 */
const stepRK4 = (objs, count, dt, halo) => {
  growIntegratorScratch(count);
  const half = dt * 0.5;
  const sixth = dt / 6;

  for (let i = 0; i < count; i++) {
    const obj = objs[i];
    intX0[i] = obj.pos.x;
    intY0[i] = obj.pos.y;
    intVx0[i] = obj.vel.x;
    intVy0[i] = obj.vel.y;
    // k1 = (v0, a(x0)). a(x0) is in stepAx/stepAy: the caller evaluated it
    // before choosing a scheme, so every scheme shares its first stage.
    intSumVx[i] = obj.vel.x;
    intSumVy[i] = obj.vel.y;
    intSumAx[i] = stepAx[i];
    intSumAy[i] = stepAy[i];
    // The position stage 2 is evaluated at.
    intKx[i] = obj.vel.x;
    intKy[i] = obj.vel.y;
  }

  // Three more stages, each the same three moves: put every body at the stage
  // position, evaluate the force there, and fold the result into the two sums.
  // The weights are 2, 2, 1 and the step fractions 1/2, 1/2, 1.
  const weights = [2, 2, 1];
  const fractions = [half, half, dt];
  for (let stage = 0; stage < 3; stage++) {
    const frac = fractions[stage];
    const w = weights[stage];
    for (let i = 0; i < count; i++) {
      const obj = objs[i];
      if (!obj.alive) continue;
      const sx = intX0[i] + intKx[i] * frac;
      const sy = intY0[i] + intKy[i] * frac;
      // A stage position is written straight onto the body, where the gravity
      // sum will read it, so the same refusal the final write makes has to be
      // made here: one non-finite coordinate reaches every other body through
      // the sum in a single stage and the simulation cannot recover from it.
      if (!isFinite(sx) || !isFinite(sy)) continue;
      obj.pos.x = sx;
      obj.pos.y = sy;
    }
    // The velocity half of this stage's slope, built from the *previous*
    // stage's acceleration, which has to be read before it is overwritten.
    const prevAx = stage === 0 ? stepAx : intAx;
    const prevAy = stage === 0 ? stepAy : intAy;
    for (let i = 0; i < count; i++) {
      intKx[i] = intVx0[i] + prevAx[i] * frac;
      intKy[i] = intVy0[i] + prevAy[i] * frac;
    }
    computeAccelerations(objs, count, halo, false, intAx, intAy);
    for (let i = 0; i < count; i++) {
      intSumVx[i] += w * intKx[i];
      intSumVy[i] += w * intKy[i];
      intSumAx[i] += w * intAx[i];
      intSumAy[i] += w * intAy[i];
    }
  }

  for (let i = 0; i < count; i++) {
    // A body that is not alive was held at its starting position through every
    // stage and is about to be culled; moving it now would be integrating a
    // corpse, which is what the default scheme's own early return avoids.
    if (!objs[i].alive) continue;
    writeState(
      objs[i],
      intX0[i] + sixth * intSumVx[i],
      intY0[i] + sixth * intSumVy[i],
      intVx0[i] + sixth * intSumAx[i],
      intVy0[i] + sixth * intSumAy[i]
    );
  }
};

/**
 * Advance every body one step under the selected scheme.
 *
 * a(t) is expected in stepAx/stepAy already, because the caller needs it for
 * the default scheme anyway and every other scheme uses it as its first stage.
 *
 * @param {Array} objs - The bodies
 * @param {number} count - How many
 * @param {number} dt - Timestep
 * @param {object|null} halo - The halo, or null
 * @returns {string} The scheme actually used
 */
const applyIntegratorStep = (objs, count, dt, halo) => {
  const scheme = activeIntegrator();
  if (scheme === 'Velocity Verlet') {
    stepVelocityVerlet(objs, count, dt, halo);
  } else if (scheme === 'RK4') {
    stepRK4(objs, count, dt, halo);
  } else {
    // The default, and byte for byte the loop that was here before the setting
    // existed. Every shipped scenario was tuned against it.
    for (let i = 0; i < count; i++) {
      const obj = objs[i];
      if (!obj.alive) continue;
      obj.apply_step(dt, stepAx[i], stepAy[i]);
    }
  }
  return scheme;
};

// Physics optimization: Cache arrays to avoid repeated spread operations
let cachedMajorSources = [];
let cachedAllPhysicsObjects = [];
const cachedBarycenterBodies = [];

/**
 * Every body a reference frame's barycenter is averaged over.
 *
 * Exposed so the renderer's current barycenter and the recorded history are
 * taken over exactly the same set. If they disagreed, the origin would jump by
 * the difference the moment a frame was selected.
 *
 * @returns {Array} The live list, not a copy
 */
const barycenterBodies = () => cachedBarycenterBodies;
let lastMutualGravityState = null;
let lastStarOnlyGravityState = null;
let lastObjectCounts = {
  bh: 0,
  stars: 0,
  gas_giants: 0,
  planets: 0,
  asteroids: 0,
  debris: 0,
};

// Barnes–Hut tree gravity lives in physicsWorker.js; the main thread only
// ships positions to it and reads accelerations back.

/**
 * Update cached arrays only when object counts change
 */
// Bumped whenever the object lists are repopulated. The cache below keyed only
// off list *lengths*, so rebuilding a scenario into the same shape (Refresh
// Scenario, or a lesson re-applying its setup) left cachedAllPhysicsObjects
// holding the discarded objects: the integrator went on advancing bodies that
// were no longer in the simulation while the renderer drew the new ones.
let worldGeneration = 0;
let lastWorldGeneration = -1;

/** Invalidate the physics caches. Call after repopulating the object lists. */
const bumpWorldGeneration = () => {
  worldGeneration++;
};

const updateCachedArrays = () => {
  const currentCounts = {
    bh: bh_list.length,
    stars: stars.length,
    gas_giants: gas_giants.length,
    planets: planets.length,
    asteroids: asteroids.length,
    comets: comets.length,
    debris: debris.length,
    neutron_stars: neutron_stars.length,
    white_dwarfs: white_dwarfs.length,
    galaxies: galaxies.length,
  };

  const countsChanged = Object.keys(currentCounts).some(
    key => currentCounts[key] !== lastObjectCounts[key]
  );

  // Debug logging for tests
  // if (countsChanged) {
  //   console.log('Array counts changed:', lastObjectCounts, '->', currentCounts);
  // }

  if (
    countsChanged ||
    lastWorldGeneration !== worldGeneration ||
    lastMutualGravityState !== physicsSettings.mutual_gravity ||
    lastStarOnlyGravityState !== physicsSettings.star_only_gravity
  ) {
    const starOnlyGravity = physicsSettings.star_only_gravity === true;

    // Update major sources
    cachedMajorSources.length = 0;
    cachedMajorSources.push(...bh_list, ...stars);

    // Galaxies are always sources. A cluster whose members did not attract
    // each other would not be a cluster, and star_only_gravity is a
    // simplification aimed at planetary systems.
    cachedMajorSources.push(...galaxies);

    if (!starOnlyGravity) {
      cachedMajorSources.push(...gas_giants, ...neutron_stars, ...white_dwarfs);
    }

    if (physicsSettings.mutual_gravity && !starOnlyGravity) {
      cachedMajorSources.push(...planets, ...asteroids);
    }

    // Update all physics objects - include neutron stars and white dwarfs
    cachedAllPhysicsObjects.length = 0;
    cachedAllPhysicsObjects.push(
      ...planets,
      ...asteroids,
      ...comets,
      ...gas_giants,
      ...debris,
      ...stars,
      ...neutron_stars,
      ...white_dwarfs,
      ...galaxies
    );

    // The bodies a barycenter is taken over. Black holes are in it and are not
    // in cachedAllPhysicsObjects, which integrates their orbits separately; a
    // barycenter of the default binary-black-hole scenario that left them out
    // would be a barycenter of the debris.
    //
    // Debris, particles and disk fragments are left out on purpose. They carry
    // little mass and they are culled aggressively when they drift off screen,
    // so counting them would make the origin of the frame jump every time a
    // fragment left the visible world.
    cachedBarycenterBodies.length = 0;
    cachedBarycenterBodies.push(
      ...bh_list,
      ...stars,
      ...neutron_stars,
      ...white_dwarfs,
      ...planets,
      ...gas_giants,
      ...asteroids,
      ...comets,
      ...galaxies
    );

    lastObjectCounts = currentCounts;
    lastWorldGeneration = worldGeneration;
    lastMutualGravityState = physicsSettings.mutual_gravity;
    lastStarOnlyGravityState = physicsSettings.star_only_gravity;
  }
};

// Physics update function - optimized
/**
 * Update physics simulation for one time step
 * @param {number} dt - Delta time for physics update
 */
const updatePhysics = dt => {
  if (dt <= 0) return;
  // The clock the elapsed-time readout and the stopwatch both run on. Advanced
  // here rather than in the render loop so that it counts what was actually
  // integrated: a scenario that substeps takes several calls per frame, and a
  // paused or scrubbing frame takes none.
  simulationTime += dt;
  // If simulation is effectively empty, clear particle pool and exported array
  try {
    const totalObjects =
      bh_list.length +
      planets.length +
      stars.length +
      gas_giants.length +
      asteroids.length +
      debris.length +
      neutron_stars.length +
      white_dwarfs.length;
    if (totalObjects === 0) {
      if (particlePool) particlePool.clear();
      particles.length = 0;
    }
  } catch {
    // Ignore particle pool clearing errors in legacy test modes
    void 0;
  }

  // Track frame count (matching original)
  if (state) state.frame_count++;

  setLiveBodyCount(
    bh_list.length +
      planets.length +
      stars.length +
      gas_giants.length +
      asteroids.length +
      comets.length +
      neutron_stars.length +
      white_dwarfs.length +
      debris.length
  );

  // Update cached arrays only when needed
  updateCachedArrays();

  // Update physics for all objects - use cached arrays and for loop for better performance
  // Optional Barnes–Hut acceleration when mutual gravity enabled
  const useBarnesHut = isBarnesHutActive();

  // The cached values below are only meaningful while the worker is feeding
  // them. Drop them as soon as it is not, so stale accelerations and
  // potentials cannot leak into the integrator or the energy readout.
  if (!useBarnesHut) clearCachedGravity();

  // Initialize worker if needed
  if (useBarnesHut && !physicsWorker) {
    try {
      const url = new URL('./physicsWorker.js', import.meta.url);
      physicsWorker = new Worker(url, { type: 'module' });
      physicsWorker.onmessage = e => {
        const { type, ax, ay, phi, sources, targets } = e.data;
        if (type === 'accel') {
          // Restore buffers for reuse
          workerBuffers.sx = sources.x;
          workerBuffers.sy = sources.y;
          workerBuffers.sm = sources.m;
          workerBuffers.tx = targets.x;
          workerBuffers.ty = targets.y;
          workerBuffers.tself = targets.self || null;

          const axView = new Float32Array(ax);
          const ayView = new Float32Array(ay);
          const phiView = phi ? new Float32Array(phi) : null;

          // Apply to stored objects corresponding to this batch
          for (let i = 0; i < workerJobObjects.length; i++) {
            const obj = workerJobObjects[i];
            if (obj && obj.alive) {
              obj.cached_accel = { x: axView[i], y: ayView[i] };
              if (phiView) obj.cached_phi = phiView[i];
              cachedGravityDirty = true;
            }
          }
          workerJobObjects = []; // Clear references
          workerBusy = false;
        }
      };
    } catch (err) {
      console.error('Physics Worker init failed:', err);
      physicsWorker = null;
    }
  }

  // Schedule new worker job if free
  if (
    useBarnesHut &&
    physicsWorker &&
    !workerBusy &&
    cachedMajorSources.length > 0 &&
    cachedAllPhysicsObjects.length > 0
  ) {
    const nSrc = cachedMajorSources.length;
    const nTar = cachedAllPhysicsObjects.length;

    // Resize buffers if needed
    if (!workerBuffers.sx || workerBuffers.sx.byteLength < nSrc * 4) {
      workerBuffers.sx = new Float32Array(Math.max(nSrc, 1024)).buffer;
      workerBuffers.sy = new Float32Array(Math.max(nSrc, 1024)).buffer;
      workerBuffers.sm = new Float32Array(Math.max(nSrc, 1024)).buffer;
    }
    if (!workerBuffers.tx || workerBuffers.tx.byteLength < nTar * 4) {
      workerBuffers.tx = new Float32Array(Math.max(nTar, 1024)).buffer;
      workerBuffers.ty = new Float32Array(Math.max(nTar, 1024)).buffer;
      workerBuffers.tself = new Int32Array(Math.max(nTar, 1024)).buffer;
    }
    if (!workerBuffers.tself) {
      workerBuffers.tself = new Int32Array(
        Math.max(nTar, workerBuffers.tx.byteLength / 4)
      ).buffer;
    }

    // Create views
    const sx = new Float32Array(workerBuffers.sx, 0, nSrc);
    const sy = new Float32Array(workerBuffers.sy, 0, nSrc);
    const sm = new Float32Array(workerBuffers.sm, 0, nSrc);
    const tx = new Float32Array(workerBuffers.tx, 0, nTar);
    const ty = new Float32Array(workerBuffers.ty, 0, nTar);
    const tself = new Int32Array(workerBuffers.tself, 0, nTar);

    // Fill buffers
    const sourceIndexById = new Map();
    for (let i = 0; i < nSrc; i++) {
      const s = cachedMajorSources[i];
      sx[i] = s.pos.x;
      sy[i] = s.pos.y;
      sm[i] = s.mass;
      sourceIndexById.set(s.id, i);
    }
    workerJobObjects = new Array(nTar);
    for (let i = 0; i < nTar; i++) {
      const o = cachedAllPhysicsObjects[i];
      tx[i] = o.pos.x;
      ty[i] = o.pos.y;
      // With mutual gravity on, most targets are also sources. Tell the worker
      // which source each target is so a body cannot attract itself.
      const si = sourceIndexById.get(o.id);
      tself[i] = si === undefined ? -1 : si;
      workerJobObjects[i] = o;
    }

    const theta = physicsSettings.barnes_hut_theta || 0.4;
    const G = physicsSettings.gravitational_constant;

    // Send to worker (transfer buffers)
    physicsWorker.postMessage(
      {
        type: 'bh',
        G,
        theta,
        minDist: minInteractionDistance(),
        sources: {
          x: workerBuffers.sx,
          y: workerBuffers.sy,
          m: workerBuffers.sm,
        },
        targets: {
          x: workerBuffers.tx,
          y: workerBuffers.ty,
          self: workerBuffers.tself,
        },
      },
      [
        workerBuffers.sx,
        workerBuffers.sy,
        workerBuffers.sm,
        workerBuffers.tx,
        workerBuffers.ty,
        workerBuffers.tself,
      ]
    );

    // Mark buffers as transferred (unusable in main thread until returned)
    workerBuffers.sx = null;
    workerBuffers.tself = null;
    workerBusy = true;
  }

  // One tick per step, before anything appends: every point pushed below shares
  // this number, which is what makes cross-body frame changes possible.
  trailTick++;

  // One place for the halo, applied before whichever gravity solver runs.
  //
  // It goes here rather than inside gravitational_acceleration because there
  // are two solvers - the direct sum and the Barnes-Hut worker - and the worker
  // is handed a list of point masses, which a smooth background field is not.
  // Adding it here is an operator split: a velocity kick from the halo, then
  // the existing step. The halo field is smooth and slowly varying compared
  // with the timestep, so the split costs nothing measurable; the check that
  // matters is that a circular orbit in the halo stays circular, and there is
  // a test for exactly that.
  const halo = activeHalo();

  // Two passes, and the order matters more than it looks. Every acceleration is
  // computed from the same snapshot of positions, and only then is any body
  // moved. Advancing bodies one at a time made the second member of a pair feel
  // the first at its already-updated position, which broke the equal-and-
  // opposite pairing and with it both conservation laws the simulation exists
  // to show. See PhysicsObject.apply_step for the measured cost of that.
  const stepCount = cachedAllPhysicsObjects.length;
  if (stepAx.length < stepCount) {
    stepAx = new Float64Array(Math.max(stepCount, 256));
    stepAy = new Float64Array(stepAx.length);
  }

  // A multi-stage scheme has to move the bodies to evaluate its later stages,
  // and the sources it sums over are those same bodies, so it cannot use the
  // Barnes-Hut worker's snapshot: every stage would see one frozen force and
  // the scheme would collapse to Euler while still calling itself RK4.
  const multiStage = activeIntegrator() !== 'Symplectic Euler';
  computeAccelerations(
    cachedAllPhysicsObjects,
    stepCount,
    halo,
    useBarnesHut && !multiStage,
    stepAx,
    stepAy
  );

  // The accelerations the step is about to be taken with, kept for the vector
  // overlay and the diagnostics so what is drawn is what was integrated rather
  // than a second calculation that might disagree with it.
  publishStepAccelerations(cachedAllPhysicsObjects, stepCount);

  applyIntegratorStep(cachedAllPhysicsObjects, stepCount, dt, halo);

  for (let i = 0; i < stepCount; i++) {
    const obj = cachedAllPhysicsObjects[i];
    if (!obj.alive) continue;
    obj.update_trail();
  }

  // Same tick, same budget as the trails just appended, so the barycenter frame
  // can be resolved for exactly the span the trails cover.
  recordBarycenter(trailTick, cachedBarycenterBodies, trailBudget());

  // Update black hole orbits and effects
  // Same two-pass rule as the bodies above: every hole's acceleration comes
  // from one snapshot of the positions, and only then does any hole move.
  const bhAccel = bh_list.map(bh => bh.orbit_acceleration(bh_list));
  bh_list.forEach((bh, i) => {
    bh.apply_orbit_step(dt, bhAccel[i].ax, bhAccel[i].ay);
    bh.update_dynamic_effects(dt);
  });

  // ---------------------------------------------------------------------------
  // Tidal disruption
  // ---------------------------------------------------------------------------
  // Four classes implement tidal_mass_loss - StarObject, Planet, GasGiant and
  // Comet - each with its own tidal radius and its own stripping rate, and for
  // a long time this loop iterated `stars` alone. Three of the four
  // implementations were unreachable: a comet could fall through a black hole's
  // tidal radius intact, which is the one thing a comet is famous for not
  // doing. It read as a deliberate restriction and was not; the loop simply
  // never grew past the class it was written for.
  //
  // Connecting them needed one repair first. GasGiant's destruction threshold
  // was a bare `this.mass <= 0.5`, a literal from when JUPITER_MASS_UNIT was 50
  // and 0.5 units meant a hundredth of a Jupiter. After that constant was
  // corrected the same literal meant half a Jupiter, so every gas giant lighter
  // than that - most of them - would have been destroyed on the frame it
  // entered the tidal radius, the moment this loop started calling it. The
  // threshold is expressed against its own unit now, as the asteroid and comet
  // ones already were.
  //
  // Not conservative, and never was: the body loses mass continuously while the
  // Debris it sheds carry a fixed fragment mass that has nothing to do with the
  // amount stripped. Tidal disruption is a mass sink, which is why it is
  // reported by conservationCaveats() as soon as there is a hole in the scene
  // for it to happen near.
  const new_debris = [];
  const tidal_candidates = [stars, planets, gas_giants, comets];
  for (const list of tidal_candidates) {
    for (const body of list) {
      if (!body.alive || !body.intact || !body.tidal_mass_loss) continue;
      const { debris_count, fraction } = body.tidal_mass_loss(bh_list, dt);
      if (debris_count <= 0) continue;
      for (let i = 0; i < debris_count; i++) {
        const eject_speed = (Math.random() * 9 + 1) * (1 + fraction);
        const angle = Math.random() * 2 * Math.PI;
        const dv = {
          x: eject_speed * Math.cos(angle),
          y: eject_speed * Math.sin(angle),
        };
        const spawn_pos = {
          x: body.pos.x + Math.random() * 4 - 2,
          y: body.pos.y + Math.random() * 4 - 2,
        };
        new_debris.push(
          new Debris(spawn_pos, {
            x: body.vel.x * 0.1 + dv.x,
            y: body.vel.y * 0.1 + dv.y,
          })
        );
      }
    }
  }
  debris.push(...new_debris);

  // Handle star merging separately from other collisions
  if (physicsSettings.enable_star_merging) {
    // Use PhysicsObject-like wrappers for black holes
    const merge_candidates = [
      ...stars,
      ...neutron_stars,
      ...white_dwarfs,
      ...bh_list.map(asPhysicsObject),
    ];
    handle_star_merging(merge_candidates);
  }

  // Handle collisions between stars and smaller objects (planets, gas giants, asteroids)
  handle_star_object_collisions();

  // Handle enhanced rocky collisions between planets, asteroids and comets
  handle_rocky_collisions([...planets, ...asteroids, ...comets]);

  // Handle gas giant merging and collisions
  handle_gas_giant_merging();

  // Gas giants sweep up any smaller body that reaches them
  handle_gas_giant_accretion();

  // Handle basic collisions for remaining objects (gas giants with each other, etc.)
  handle_collisions([...gas_giants]);

  // Check for stellar collapse into black holes
  check_stellar_collapse();

  // Check for absorption by black holes - improved version matching original
  const check_and_absorb = obj_list => {
    return obj_list.filter(obj => {
      if (obj.alive && obj.check_absorption(bh_list)) {
        // Create absorption particles matching original
        for (let i = 0; i < 15; i++) {
          const angle = Math.random() * 2 * Math.PI;
          const speed = Math.random() * 50 + 30;
          const p_vel = {
            x: speed * Math.cos(angle),
            y: speed * Math.sin(angle),
          };
          const baseColor =
            (obj && obj.baseColor) ||
            (obj && obj.obj_type
              ? physicsSettings[`${obj.obj_type.toLowerCase()}_base_color`]
              : undefined) ||
            '#c8c8c8';
          const rgb = hexToRgb(baseColor);
          if (rgb) {
            particlePool.getParticle(
              obj.pos,
              p_vel,
              Math.random() * 0.6 + 0.4,
              5,
              1,
              `rgb(${rgb.r},${rgb.g},${rgb.b})`
            );
          }
        }
        // (event system removed)
        return false;
      }
      // Objects already killed this frame (merged away, collided) are dropped
      // here, before filterAndClearEnergy runs, so release their history now or
      // it is never reclaimed.
      if (!obj.alive) {
        clearObjectEnergyHistory(obj.id);
        return false;
      }
      return true;
    });
  };

  // Apply absorption check to all object types
  planets = check_and_absorb(planets);
  stars = check_and_absorb(stars);
  gas_giants = check_and_absorb(gas_giants);
  asteroids = check_and_absorb(asteroids);
  comets = check_and_absorb(comets);
  debris = check_and_absorb(debris);
  neutron_stars = check_and_absorb(neutron_stars);
  white_dwarfs = check_and_absorb(white_dwarfs);

  // Update particles
  // Legacy test compatibility: if external tests pushed mock particles with is_alive/update,
  // honor and update those, then remove dead without overwriting the array from the pool.
  const hasLegacyParticles =
    Array.isArray(particles) &&
    particles.length > 0 &&
    typeof particles[0]?.is_alive === 'function' &&
    typeof particles[0]?.update === 'function';

  if (hasLegacyParticles) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      // Guarded update for mocks
      if (typeof p.update === 'function') {
        p.update(dt);
      }
      if (typeof p.is_alive === 'function' && !p.is_alive()) {
        particles.splice(i, 1);
      }
    }
  } else {
    // Default: use the particle pool system
    particlePool.updateAndCleanup(dt);
    particles = particlePool.getActiveParticles();
  }

  // Update accretion disk particles - this was missing!
  for (const particle of accretion_disk_particles) {
    if (particle.alive) {
      particle.update_physics(dt, []);
    }
  }

  // Clean up dead accretion disk particles
  accretion_disk_particles = accretion_disk_particles.filter(p => p.alive);

  // Black hole merging logic - enhanced with accretion disk transfer
  let merged_this_step = true;
  while (merged_this_step && bh_list.length > 1) {
    merged_this_step = false;
    for (let i = 0; i < bh_list.length; i++) {
      if (bh_list[i].alive === false) continue;
      for (let j = i + 1; j < bh_list.length; j++) {
        if (bh_list[j].alive === false) continue;
        const bh1 = bh_list[i],
          bh2 = bh_list[j];
        const dx = bh1.pos.x - bh2.pos.x,
          dy = bh1.pos.y - bh2.pos.y;
        if (dx * dx + dy * dy < (bh1.radius + bh2.radius) ** 2) {
          const m1 = bh1.mass,
            m2 = bh2.mass,
            new_mass = m1 + m2;
          const new_pos = {
            x: (bh1.pos.x * m1 + bh2.pos.x * m2) / new_mass,
            y: (bh1.pos.y * m1 + bh2.pos.y * m2) / new_mass,
          };
          const new_vel = {
            x: (bh1.vel.x * m1 + bh2.vel.x * m2) / new_mass,
            y: (bh1.vel.y * m1 + bh2.vel.y * m2) / new_mass,
          };

          // Create new merged black hole
          const new_black_hole = new BlackHole(new_pos, new_mass, new_vel);

          // Transfer accretion disk particles from both black holes to the new one
          const combined_disk_particles = [
            ...bh1.disk_particles,
            ...bh2.disk_particles,
          ];

          // Clear the old black holes' disk particle arrays
          bh1.disk_particles = [];
          bh2.disk_particles = [];

          // Update each particle to orbit the new black hole
          for (const particle of combined_disk_particles) {
            if (particle.alive) {
              // Update particle's parent black hole reference
              particle.parentBlackHole = new_black_hole;

              // Recalculate orbital parameters for the new black hole
              const dx_p = particle.pos.x - new_black_hole.pos.x;
              const dy_p = particle.pos.y - new_black_hole.pos.y;
              const distance = Math.sqrt(dx_p * dx_p + dy_p * dy_p);

              // Set new orbital velocity around the merged black hole
              const new_orbital_speed =
                Math.sqrt(new_black_hole.mass / distance) * 0.4;
              const current_angle = Math.atan2(dy_p, dx_p);
              const tangent_angle = current_angle + Math.PI / 2;

              // Update velocity to orbit the new black hole
              particle.vel.x = new_orbital_speed * Math.cos(tangent_angle);
              particle.vel.y = new_orbital_speed * Math.sin(tangent_angle);

              // Give a small spiral kick after merger
              particle.spiral_factor = 0.3 + Math.random() * 0.3; // Standard spiral
              const spiral_kick = 0.05 + Math.random() * 0.05;
              particle.vel.x += spiral_kick * Math.cos(current_angle);
              particle.vel.y += spiral_kick * Math.sin(current_angle);

              // Add to new black hole's disk particles
              new_black_hole.disk_particles.push(particle);
            }
          }

          // Standard merger effects for accretion disk
          new_black_hole.accretion_intensity = Math.min(
            1.0,
            0.5 + (m1 + m2) / (20 * SOLAR_MASS_UNIT)
          );
          new_black_hole.disk_growth = Math.min(
            1.2,
            0.6 + (m1 + m2) / (25 * SOLAR_MASS_UNIT)
          );
          new_black_hole.merger_boost_timer = 25.0; // Standard merger effects
          new_black_hole.merger_particle_boost =
            1.2 + (m1 + m2) / (30 * SOLAR_MASS_UNIT);

          // Trigger gravitational wave ripple effect at merger location
          gravity_ripples.push({
            x: new_pos.x,
            y: new_pos.y,
            time: Date.now(),
            created: performance.now(),
            duration: 3000, // ms
            mass: new_mass / SOLAR_MASS_UNIT, // Merger mass in solar masses
            gw_strength: 1.0, // Full strength for BH-BH mergers
          });

          // Emit clean merge event tag (BH-BH)
          const evt = {
            type: 'merge',
            time: performance.now(),
            primaryId: bh1.id,
            secondaryId: bh2.id,
            mergedMass: new_black_hole.mass,
            position: { x: new_pos.x, y: new_pos.y },
          };
          if (!simulation.eventLog) simulation.eventLog = [];
          simulation.eventLog.push(evt);
          if (simulation.eventLog.length > 1000) simulation.eventLog.shift();
          if (
            typeof window !== 'undefined' &&
            window.dispatchEvent &&
            typeof window.CustomEvent === 'function'
          ) {
            window.dispatchEvent(
              new window.CustomEvent('gravitasMerge', { detail: evt })
            );
          }

          // Spliced out directly, so the filterAndClearEnergy pass below will
          // never see them - release their history here.
          clearObjectEnergyHistory(bh1.id);
          clearObjectEnergyHistory(bh2.id);
          bh_list.splice(j, 1);
          bh_list.splice(i, 1);
          bh_list.push(new_black_hole);
          merged_this_step = true;
          break;
        }
      }
      if (merged_this_step) break;
    }
  }

  // Clean up offscreen objects - matching original
  // Filter out dead objects and objects that are off-screen, clearing energy history for removed objects
  const filterAndClearEnergy = (objects, filterFn) => {
    const beforeCount = objects.length;
    const filtered = objects.filter(filterFn);
    const afterCount = filtered.length;

    // If objects were removed, clear their energy history
    if (afterCount < beforeCount) {
      const removedIds = new Set();
      const kept = new Set(filtered);
      objects.forEach(obj => {
        // ids start at 0, so compare against null rather than testing truthiness
        if (!kept.has(obj) && obj.id !== undefined && obj.id !== null) {
          removedIds.add(obj.id);
        }
      });

      removedIds.forEach(id => {
        clearEnergyHistory(id);
      });

      if (removedIds.size > 0) {
        debugLog(
          `Cleared energy history for ${removedIds.size} removed objects`
        );
      }
    }

    return filtered;
  };

  // A body a scenario declares as permanent survives the distance cull.
  //
  // The cull box is about ten canvas widths of world on each side, which is
  // generous for a sandbox and far too small for a system whose whole point is
  // that part of it sits outside the field of view: a stellar companion three
  // hundred AU from a hot Jupiter is unresolvable from Earth and off-screen
  // here for the same reason, and deleting it would delete the lesson.
  const kept = obj => obj.persistent === true;

  // More conservative filtering for important objects - only remove if truly far away
  planets = filterAndClearEnergy(
    planets,
    p => p.alive && (kept(p) || !is_offscreen(p.pos, 20.0))
  );
  stars = filterAndClearEnergy(
    stars,
    s => s.alive && (kept(s) || !is_offscreen(s.pos, 20.0))
  );
  gas_giants = filterAndClearEnergy(
    gas_giants,
    g => g.alive && (kept(g) || !is_offscreen(g.pos, 20.0))
  );
  neutron_stars = filterAndClearEnergy(
    neutron_stars,
    ns => ns.alive && (kept(ns) || !is_offscreen(ns.pos, 20.0))
  );
  white_dwarfs = filterAndClearEnergy(
    white_dwarfs,
    wd => wd.alive && (kept(wd) || !is_offscreen(wd.pos, 20.0))
  );
  galaxies = filterAndClearEnergy(
    galaxies,
    g => g.alive && (kept(g) || !is_offscreen(g.pos, 20.0))
  );
  bh_list = filterAndClearEnergy(
    bh_list,
    bh => bh.alive !== false && !is_offscreen(bh.pos, 50.0)
  ); // Black holes should never be removed

  // More aggressive filtering for smaller/less important objects
  asteroids = filterAndClearEnergy(
    asteroids,
    a => a.alive && !is_offscreen(a.pos, 5.0)
  );
  comets = filterAndClearEnergy(
    comets,
    c => c.alive && !is_offscreen(c.pos, 20.0)
  );
  debris = filterAndClearEnergy(
    debris,
    d => d.alive && !is_offscreen(d.pos, 3.0)
  );
  accretion_disk_particles = filterAndClearEnergy(
    accretion_disk_particles,
    ap => ap.alive && !is_offscreen(ap.pos, 2.0)
  );

  // Follow mode logic - matching original exactly
  let target = null;
  if (physicsSettings.follow_mode !== 'None') {
    const follow_map = {
      Galaxy: galaxies,
      BlackHole: bh_list,
      Planet: planets,
      GasGiant: gas_giants,
      Star: stars,
    };
    const target_list = follow_map[physicsSettings.follow_mode];
    if (target_list && target_list.length > 0) {
      if (target_list.length > 1) {
        let totalMass = 0,
          com = { x: 0, y: 0 };
        target_list.forEach(obj => {
          com.x += obj.pos.x * obj.mass;
          com.y += obj.pos.y * obj.mass;
          totalMass += obj.mass;
        });
        if (totalMass > 0)
          target = { pos: { x: com.x / totalMass, y: com.y / totalMass } };
      } else {
        target = target_list[0];
      }
    }
  }
  if (target && state) {
    // Follow moves the camera; a reference frame moves the coordinates. They
    // compose, so the pan that centers the target has to be measured in the
    // frame the target is being drawn in, not in world coordinates. Without
    // this, turning on a frame while following sends the camera off by however
    // far the frame's origin sits from the world origin.
    const off = state.frameOffset || { x: 0, y: 0 };
    state.pan.x = -(target.pos.x - off.x) * state.zoom;
    state.pan.y = (target.pos.y - off.y) * state.zoom;
  }

  // Update energy history for all objects (sample every 10 frames for performance)
  if (state && state.frame_count % ENERGY_SAMPLE_RATE === 0) {
    updateEnergyHistory();
  }
};

// Base PhysicsObject class
/**
 * Base class for all physics objects in the simulation
 */
class PhysicsObject {
  /**
   * Create a physics object
   * @param {Object} pos - Initial position with x, y properties
   * @param {Object} vel - Initial velocity with x, y properties
   * @param {number} mass - Object mass
   * @param {number} radius - Object radius
   * @param {string} obj_type - Type identifier for the object
   */
  constructor(pos, vel, mass, radius, obj_type = 'object') {
    this.id = PhysicsObject_id_counter++;
    this.pos = { ...pos };
    this.vel = { ...vel };
    this.mass = parseFloat(mass);
    this.radius = parseFloat(radius);
    this.obj_type = obj_type;
    this.trail = [];
    this.alive = true;
  }

  update_physics(dt, _gravity_sources) {
    if (!this.alive) return;
    const { ax, ay } = gravitational_acceleration(this.pos, _gravity_sources);
    this.apply_step(dt, ax, ay);
  }

  /**
   * One symplectic-Euler step from an acceleration that has already been
   * computed: kick the velocity, then drift the position with the new velocity.
   *
   * Split out from update_physics so the main loop can compute every body's
   * acceleration from the *same* snapshot of positions before any of them move.
   * When bodies were advanced one at a time, the second body of a pair felt the
   * first at its already-updated position, so the two forces were no longer
   * equal and opposite. That cost the simulation both of the conservation laws
   * it is meant to demonstrate: linear momentum drifted, and a two-body orbit
   * lost energy secularly - about 1% of its binding energy per orbit at
   * dt = 0.1 - instead of oscillating about a fixed value the way a symplectic
   * integrator should. The visible symptom was binaries spiralling together and
   * merging on their own, which several scenarios worked around by capping the
   * timestep. Computing first and applying afterwards restores both laws:
   * momentum is now conserved to machine precision and the energy error is
   * bounded rather than accumulating.
   *
   * @param {number} dt - Timestep
   * @param {number} ax - Acceleration, x
   * @param {number} ay - Acceleration, y
   */
  apply_step(dt, ax, ay) {
    if (!this.alive) return;
    const vx = this.vel.x + ax * dt;
    const vy = this.vel.y + ay * dt;
    const px = this.pos.x + vx * dt;
    const py = this.pos.y + vy * dt;
    // Refuse to store a non-finite state: once a body's position is NaN it
    // poisons every other body through the gravity sum and the simulation
    // cannot recover without a reload.
    if (!isFinite(px) || !isFinite(py) || !isFinite(vx) || !isFinite(vy)) {
      return;
    }
    this.vel.x = vx;
    this.vel.y = vy;
    this.pos.x = px;
    this.pos.y = py;
  }

  update_trail() {
    if (!this.alive) return;
    const budget = trailBudget();

    // Ensure array does not exceed budget
    if (this.trail.length >= budget) {
      this.trail.shift();
    }
    this.trail.push({
      ...this.pos,
      tick: trailTick,
      timestamp: Date.now(),
      velocity: Math.hypot(this.vel.x, this.vel.y),
      age: 0,
    });

    // Increment ages
    for (let i = 0; i < this.trail.length; i++) {
      this.trail[i].age += 1;
    }
  }

  check_absorption(bh_list) {
    if (!this.alive) return false;
    for (const bh of bh_list) {
      const dx = this.pos.x - bh.pos.x;
      const dy = this.pos.y - bh.pos.y;
      if (dx * dx + dy * dy < (bh.radius + ABSORB_BUFFER) ** 2) {
        this.alive = false;
        // Mass, momentum and centre of mass, rather than mass alone. See the
        // note on absorb_into_black_hole for what it conserves, what it cannot,
        // and which configurations opt out.
        absorb_into_black_hole(bh, this);
        // Clear energy history for absorbed object
        clearObjectEnergyHistory(this.id);
        return true;
      }
    }
    return false;
  }

  get_state() {
    return {
      id: this.id,
      type: this.obj_type,
      pos: this.pos,
      vel: this.vel,
      mass: this.mass,
      radius: this.radius,
      alive: this.alive,
      // A body's name is part of its identity, not decoration. Restoring a
      // saved state without it renamed every star, so a full share link
      // reopened as a different cast of characters and an experiment that
      // measured "Alpha" could not say which star that had been. BlackHole
      // already carried it; everything else inherits it here.
      name: this.name,
    };
  }

  set_state(s) {
    Object.assign(this, s);
    this.trail = [];
  }

  draw(_ctx) {}
}

// Planet class
/**
 * Planet physics object with Earth-like properties
 * @extends PhysicsObject
 */
class Planet extends PhysicsObject {
  /**
   * Create a planet object
   * @param {Object} pos - Initial position with x, y properties
   * @param {Object} vel - Initial velocity with x, y properties
   * @param {number|null} massInEarths - Mass in Earth masses (auto-generated if null)
   */
  constructor(pos, vel, massInEarths = null) {
    let finalMassInEarths;
    if (massInEarths !== null) {
      finalMassInEarths = massInEarths;
    } else {
      finalMassInEarths = Math.pow(10, Math.random() * 1.2 - 1.0);
    }

    const radius = PLANET_RADIUS * Math.pow(finalMassInEarths, 0.3);
    // The unit conversion was simply missing here: a planet asked for in Earth
    // masses was built with that number as its mass in simulation units, so
    // "1 Earth mass" arrived weighing 333 of them. GasGiant a few hundred lines
    // down has always multiplied by JUPITER_MASS_UNIT; this is the same line.
    const mass = finalMassInEarths * EARTH_MASS_UNIT;

    super(pos, vel, mass, radius, 'Planet');
    this.massInEarths = finalMassInEarths;
    this.density = this.calculateDensity();
    this.intact = true;
    this.name = getRandomName('planets');
  }

  calculateDensity() {
    if (this.massInEarths > 3.0) {
      return Math.random() > 0.5 ? 'gaseous' : 'icy';
    } else if (this.massInEarths > 0.5) {
      return 'rocky';
    } else {
      return 'rocky';
    }
  }

  draw(ctx) {
    const world_pos = this.pos; // Use direct world coordinates since canvas is already transformed

    // Custom rendering for Earth and Moon
    if (this.isEarth) {
      this.drawEarth(ctx, world_pos);
      return;
    }

    if (this.isMoon) {
      this.drawMoon(ctx, world_pos);
      return;
    }

    // A scenario that names a color means it: the Solar System sets Mercury
    // grey, Venus cream, Mars red, and the Kepler lesson distinguishes its two
    // orbiters by color in the text. Falling straight through to the density
    // switch ignored all of that and drew every planet the same sky blue,
    // including two side by side that the lesson calls "blue" and "orange".
    let baseColor = this.baseColor;
    if (!baseColor) {
      switch (this.density) {
        case 'gaseous':
          baseColor = '#87CEEB';
          break;
        case 'icy':
          baseColor = '#E6E6FA';
          break;
        case 'rocky':
        default:
          baseColor = '#87CEEB';
          break;
      }
    }

    ctx.fillStyle = compute_dynamic_color(baseColor, this.pos, bh_list);
    ctx.beginPath();
    ctx.arc(world_pos.x, world_pos.y, drawRadius(this), 0, 2 * Math.PI);
    ctx.fill();

    // Add soft bloom to offscreen bloom canvas
    try {
      const { x: screenX, y: screenY } = world_to_screen(world_pos);
      const screenR = this.radius * state.zoom;
      const rgbPlanet = hexToRgb(baseColor) || { r: 200, g: 220, b: 255 };
      if (screenR > 1 && typeof window !== 'undefined' && window.bloomCtx) {
        const grad = window.bloomCtx.createRadialGradient(
          screenX,
          screenY,
          0,
          screenX,
          screenY,
          screenR * 2.5
        );
        grad.addColorStop(
          0,
          `rgba(${rgbPlanet.r},${rgbPlanet.g},${rgbPlanet.b},0.15)`
        );
        grad.addColorStop(
          0.6,
          `rgba(${rgbPlanet.r},${rgbPlanet.g},${rgbPlanet.b},0.06)`
        );
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        window.bloomCtx.fillStyle = grad;
        window.bloomCtx.beginPath();
        window.bloomCtx.arc(screenX, screenY, screenR * 2.5, 0, 2 * Math.PI);
        window.bloomCtx.fill();
      }
    } catch {
      // no-op
    }

    // Add soft bloom to offscreen bloom canvas
    try {
      const { x: screenX, y: screenY } = world_to_screen(world_pos);
      const screenR = this.radius * state.zoom;
      const color = { r: 210, g: 230, b: 255 };
      if (screenR > 1 && typeof window !== 'undefined' && window.bloomCtx) {
        const grad = window.bloomCtx.createRadialGradient(
          screenX,
          screenY,
          0,
          screenX,
          screenY,
          screenR * 2.5
        );
        grad.addColorStop(0, `rgba(${color.r},${color.g},${color.b},0.35)`);
        grad.addColorStop(0.6, `rgba(${color.r},${color.g},${color.b},0.15)`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        window.bloomCtx.fillStyle = grad;
        window.bloomCtx.beginPath();
        window.bloomCtx.arc(screenX, screenY, screenR * 2.5, 0, 2 * Math.PI);
        window.bloomCtx.fill();
      }
    } catch {
      // no-op
    }

    if (this.density === 'gaseous' && this.radius * state.zoom > 3) {
      ctx.fillStyle = 'rgba(135, 206, 235, 0.6)';
      const band_height = Math.max(1 / state.zoom, this.radius * 0.2);
      ctx.fillRect(
        world_pos.x - this.radius,
        world_pos.y - this.radius / 2 - band_height / 2,
        this.radius * 2,
        band_height
      );
      ctx.fillRect(
        world_pos.x - this.radius,
        world_pos.y + this.radius / 2 - band_height / 2,
        this.radius * 2,
        band_height
      );
    }

    if (this.density === 'icy' && this.radius * state.zoom > 3) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      const cap_height = Math.max(1 / state.zoom, this.radius * 0.15);
      ctx.fillRect(
        world_pos.x - this.radius,
        world_pos.y - this.radius - cap_height,
        this.radius * 2,
        cap_height
      );
      ctx.fillRect(
        world_pos.x - this.radius,
        world_pos.y + this.radius,
        this.radius * 2,
        cap_height
      );
    }

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const true_screen_pos = world_to_screen(world_pos);
    const screen_radius = this.radius * state.zoom;

    if (screen_radius > 4) {
      const label_y_offset = screen_radius + 10;
      ctx.font = '10px Roboto Mono';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'black';
      ctx.shadowBlur = 3;

      // Show name for Solar System planets, mass for others
      if (this.isSolarSystemPlanet) {
        ctx.fillText(
          this.name,
          true_screen_pos.x,
          true_screen_pos.y + label_y_offset
        );
      } else {
        drawSolarLabel(
          ctx,
          formatNumber(this.massInEarths),
          true_screen_pos.x,
          true_screen_pos.y + label_y_offset,
          { symbol: EARTH_SYMBOL }
        );
      }
    }
    ctx.restore();
  }

  drawEarth(ctx, world_pos) {
    // Draw Earth with realistic appearance - blue oceans with green continents
    const gradient = ctx.createRadialGradient(
      world_pos.x,
      world_pos.y,
      0,
      world_pos.x,
      world_pos.y,
      this.radius
    );

    // Base ocean color
    gradient.addColorStop(0, '#4B7BE5'); // Deep blue center
    gradient.addColorStop(0.7, '#5B8BF5'); // Lighter blue
    gradient.addColorStop(1, '#6B9BF5'); // Light blue edge

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(world_pos.x, world_pos.y, drawRadius(this), 0, 2 * Math.PI);
    ctx.fill();

    // Add continent-like features (simplified)
    if (this.radius * state.zoom > 8) {
      // Draw some green "continents" as simple shapes
      ctx.fillStyle = '#2D5A2D'; // Dark green for continents

      // North America-like shape
      ctx.beginPath();
      ctx.arc(
        world_pos.x - this.radius * 0.3,
        world_pos.y - this.radius * 0.4,
        this.radius * 0.25,
        0,
        2 * Math.PI
      );
      ctx.fill();

      // Europe/Asia-like shape
      ctx.beginPath();
      ctx.arc(
        world_pos.x + this.radius * 0.2,
        world_pos.y - this.radius * 0.3,
        this.radius * 0.3,
        0,
        2 * Math.PI
      );
      ctx.fill();

      // Africa-like shape
      ctx.beginPath();
      ctx.arc(
        world_pos.x + this.radius * 0.1,
        world_pos.y + this.radius * 0.2,
        this.radius * 0.2,
        0,
        2 * Math.PI
      );
      ctx.fill();

      // South America-like shape
      ctx.beginPath();
      ctx.arc(
        world_pos.x - this.radius * 0.4,
        world_pos.y + this.radius * 0.3,
        this.radius * 0.15,
        0,
        2 * Math.PI
      );
      ctx.fill();
    }

    // Add atmospheric glow
    ctx.strokeStyle = 'rgba(135, 206, 235, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(world_pos.x, world_pos.y, drawRadius(this) + 1, 0, 2 * Math.PI);
    ctx.stroke();
  }

  drawMoon(ctx, world_pos) {
    // Draw Moon with realistic gray appearance and mock craters
    const gradient = ctx.createRadialGradient(
      world_pos.x,
      world_pos.y,
      0,
      world_pos.x,
      world_pos.y,
      this.radius
    );

    // Moon surface gradient
    gradient.addColorStop(0, '#6B6B6B'); // Dark gray center
    gradient.addColorStop(0.5, '#8B8B8B'); // Medium gray
    gradient.addColorStop(1, '#A0A0A0'); // Light gray edge

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(world_pos.x, world_pos.y, drawRadius(this), 0, 2 * Math.PI);
    ctx.fill();

    // Add mock craters if zoomed in enough
    if (this.radius * state.zoom > 6) {
      ctx.fillStyle = '#5A5A5A'; // Darker gray for craters

      // Draw several craters of different sizes
      const craters = [
        { x: -0.3, y: -0.2, r: 0.15 },
        { x: 0.2, y: 0.3, r: 0.12 },
        { x: 0.4, y: -0.1, r: 0.08 },
        { x: -0.1, y: 0.4, r: 0.1 },
        { x: 0.1, y: -0.4, r: 0.06 },
        { x: -0.4, y: 0.1, r: 0.09 },
      ];

      craters.forEach(crater => {
        ctx.beginPath();
        ctx.arc(
          world_pos.x + crater.x * this.radius,
          world_pos.y + crater.y * this.radius,
          crater.r * this.radius,
          0,
          2 * Math.PI
        );
        ctx.fill();
      });
    }

    // Add subtle surface texture
    if (this.radius * state.zoom > 4) {
      ctx.strokeStyle = 'rgba(100, 100, 100, 0.2)';
      ctx.lineWidth = 0.5;

      // Draw some subtle lines to simulate lunar surface features
      for (let i = 0; i < 3; i++) {
        const angle = (i * Math.PI) / 3;
        const x1 = world_pos.x + Math.cos(angle) * this.radius * 0.8;
        const y1 = world_pos.y + Math.sin(angle) * this.radius * 0.8;
        const x2 = world_pos.x + Math.cos(angle) * this.radius;
        const y2 = world_pos.y + Math.sin(angle) * this.radius;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }
  }

  tidal_mass_loss(bh_list, dt) {
    if (!this.intact || !bh_list || bh_list.length === 0)
      return { debris_count: 0, fraction: 0 };
    let min_dist_sq = Infinity,
      closest_bh = null;
    for (const bh of bh_list) {
      const dx = this.pos.x - bh.pos.x;
      const dy = this.pos.y - bh.pos.y;
      const dist_sq = dx * dx + dy * dy;
      if (dist_sq < min_dist_sq) {
        min_dist_sq = dist_sq;
        closest_bh = bh;
      }
    }
    if (!closest_bh) return { debris_count: 0, fraction: 0 };

    const tidal_threshold_sq = (closest_bh.radius * 3) ** 2;
    if (min_dist_sq < tidal_threshold_sq) {
      const min_dist = Math.sqrt(min_dist_sq);
      const tidal_threshold = Math.sqrt(tidal_threshold_sq);
      const fraction = Math.max(
        0.0,
        (tidal_threshold - min_dist) / tidal_threshold
      );

      this.mass -= this.mass * fraction * 0.05 * dt;
      let debris_count = Math.floor(fraction * 20 * dt);

      // Expressed against the class's own mass unit rather than as a bare 0.1,
      // which is what this number always meant: 0.1 was the asteroid's whole
      // mass back when that was a hardcoded literal, so an asteroid inside the
      // tidal radius came apart on the frame it arrived. Deriving it keeps that
      // outcome exactly while surviving the mass correction, which took an
      // asteroid to 4.7e-7 units and would have left the comparison always true
      // for a reason nobody could have read off the line.
      if (this.mass <= CERES_MASS_UNIT) {
        this.intact = false;
        this.alive = false;
        debris_count += 15;
      }
      return { debris_count, fraction };
    }
    return { debris_count: 0, fraction: 0 };
  }

  get_state() {
    const baseState = super.get_state();
    return {
      ...baseState,
      massInEarths: this.massInEarths,
      density: this.density,
    };
  }

  set_state(s) {
    super.set_state(s);
    this.massInEarths = s.massInEarths;
    this.density = s.density;
  }
}

// GasGiant class
class GasGiant extends PhysicsObject {
  constructor(pos, vel, massInJupiters = null) {
    let finalMassInJupiters;
    if (massInJupiters !== null) {
      finalMassInJupiters = massInJupiters;
    } else {
      finalMassInJupiters = Math.pow(10, Math.random() * 1.8 - 0.5);
    }

    const radius = GAS_GIANT_RADIUS * Math.pow(finalMassInJupiters, 0.3);
    const mass = finalMassInJupiters * JUPITER_MASS_UNIT;

    super(pos, vel, mass, radius, 'GasGiant');
    this.massInJupiters = finalMassInJupiters;
    this.giantType = this.calculateGiantType();
    this.intact = true;
    this.name = getRandomName('gasGiants');

    // Saturn-like rings: default off; scenarios can enable selectively
    this.hasRings = false;
    if (this.hasRings) {
      // Ring size: inner radius 1.2-1.5x planet, outer 1.7-2.5x planet
      this.ringInnerRadius = this.radius * (1.2 + Math.random() * 0.3);
      this.ringOuterRadius = this.radius * (1.7 + Math.random() * 0.8);
      // Ring orientation: random tilt (within ±30 degrees of equator)
      this.ringAngle = (Math.random() - 0.5) * (Math.PI / 3); // -π/6 to +π/6
      // Ring opacity: varies from planet to planet (0.4 to 0.8) - increased for better visibility
      this.ringOpacity = 0.4 + Math.random() * 0.4;
    }
  }

  calculateGiantType() {
    if (this.massInJupiters > 13) {
      return 'brown_dwarf';
    } else if (this.massInJupiters > 5) {
      return 'super_jupiter';
    } else if (this.massInJupiters > 1) {
      return 'jupiter_like';
    } else if (this.massInJupiters > 0.5) {
      return 'neptune_like';
    } else {
      return 'mini_neptune';
    }
  }

  draw(ctx) {
    const world_pos = this.pos; // Use direct world coordinates since canvas is already transformed

    // Draw rings if present - BACK ARC ONLY FIRST
    if (this.hasRings) {
      ctx.save();
      ctx.translate(world_pos.x, world_pos.y);
      ctx.rotate(this.ringAngle);
      ctx.globalAlpha = this.ringOpacity;

      // The dividing line between front and back is where the Y coordinate in the ring's local frame is zero
      // For an ellipse, this is at angles theta1 = 0 and theta2 = PI
      // But after rotation, these become theta1 = -this.ringAngle and theta2 = PI - this.ringAngle
      // We'll use these as the split points
      const theta1 = -this.ringAngle;
      const theta2 = Math.PI - this.ringAngle;

      // Draw back arc (behind planet): from theta1 to theta2
      ctx.beginPath();
      ctx.ellipse(
        0,
        0,
        this.ringOuterRadius,
        this.ringOuterRadius * 0.32,
        0,
        theta1,
        theta2,
        false
      );
      ctx.ellipse(
        0,
        0,
        this.ringInnerRadius,
        this.ringInnerRadius * 0.32,
        0,
        theta2,
        theta1,
        true
      );
      ctx.closePath();
      ctx.fillStyle = `rgba(180,200,255,${this.ringOpacity})`;
      ctx.fill('evenodd');
      ctx.globalAlpha = 1.0;
      ctx.restore();
    }

    // Draw the gas giant sphere (this will occlude the back portion of the ring)
    let baseColor;
    switch (this.giantType) {
      case 'brown_dwarf':
        baseColor = '#8B4513';
        break;
      case 'super_jupiter':
        baseColor = '#DAA520';
        break;
      case 'jupiter_like':
        baseColor = '#D2B48C';
        break;
      case 'neptune_like':
        baseColor = '#4169E1';
        break;
      case 'mini_neptune':
      default:
        baseColor = '#87CEEB';
        break;
    }

    ctx.fillStyle = compute_dynamic_color(baseColor, this.pos, bh_list);
    ctx.beginPath();
    ctx.arc(world_pos.x, world_pos.y, drawRadius(this), 0, 2 * Math.PI);
    ctx.fill();

    if (this.radius * state.zoom > 4) {
      let bandColor, highlightColor;
      switch (this.giantType) {
        case 'brown_dwarf':
          bandColor = 'rgba(139, 69, 19, 0.6)';
          highlightColor = 'rgba(160, 82, 45, 0.4)';
          break;
        case 'super_jupiter':
          bandColor = 'rgba(218, 165, 32, 0.5)';
          highlightColor = 'rgba(255, 215, 0, 0.3)';
          break;
        case 'jupiter_like':
          bandColor = 'rgba(160, 82, 45, 0.5)';
          highlightColor = 'rgba(210, 180, 140, 0.3)';
          break;
        case 'neptune_like':
          bandColor = 'rgba(65, 105, 225, 0.5)';
          highlightColor = 'rgba(100, 149, 237, 0.3)';
          break;
        case 'mini_neptune':
        default:
          bandColor = 'rgba(135, 206, 235, 0.5)';
          highlightColor = 'rgba(173, 216, 230, 0.3)';
          break;
      }

      const numBands = this.massInJupiters > 3 ? 4 : 2;
      for (let i = 0; i < numBands; i++) {
        const bandOffset = (i - (numBands - 1) / 2) * (this.radius * 0.4);
        const bandWidth = this.radius * 0.15;

        ctx.fillStyle = bandColor;
        ctx.beginPath();
        ctx.ellipse(
          world_pos.x,
          world_pos.y + bandOffset,
          this.radius * 0.9,
          bandWidth,
          0,
          0,
          2 * Math.PI
        );
        ctx.fill();

        ctx.fillStyle = highlightColor;
        ctx.beginPath();
        ctx.ellipse(
          world_pos.x,
          world_pos.y + bandOffset - bandWidth * 0.3,
          this.radius * 0.85,
          bandWidth * 0.4,
          0,
          0,
          2 * Math.PI
        );
        ctx.fill();
      }

      if (this.massInJupiters > 2) {
        ctx.fillStyle = bandColor;
        ctx.beginPath();
        ctx.ellipse(
          world_pos.x,
          world_pos.y - this.radius * 0.7,
          this.radius * 0.3,
          this.radius * 0.2,
          0,
          0,
          2 * Math.PI
        );
        ctx.ellipse(
          world_pos.x,
          world_pos.y + this.radius * 0.7,
          this.radius * 0.3,
          this.radius * 0.2,
          0,
          0,
          2 * Math.PI
        );
        ctx.fill();
      }
    }

    // (Front ring arc intentionally omitted; the planet occludes the near side.)

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const true_screen_pos = world_to_screen(world_pos);
    const screen_radius = this.radius * state.zoom;

    if (screen_radius > 6) {
      const label_y_offset = screen_radius + 12;
      ctx.font = '11px Roboto Mono';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'black';
      ctx.shadowBlur = 3;

      // Show name for Solar System gas giants, mass for others
      if (this.isSolarSystemPlanet) {
        ctx.fillText(
          this.name,
          true_screen_pos.x,
          true_screen_pos.y + label_y_offset
        );
      } else {
        const massInEarths =
          this.massInJupiters * EARTH_MASSES_PER_JUPITER_MASS;
        drawSolarLabel(
          ctx,
          String(Math.round(massInEarths)),
          true_screen_pos.x,
          true_screen_pos.y + label_y_offset,
          { symbol: EARTH_SYMBOL }
        );
      }
    }
    ctx.restore();

    // Draw the front arc of the ring AFTER the planet (so it appears in front)
    if (this.hasRings) {
      ctx.save();
      ctx.translate(world_pos.x, world_pos.y);
      ctx.rotate(this.ringAngle);
      ctx.globalAlpha = this.ringOpacity;

      const theta1 = -this.ringAngle;
      const theta2 = Math.PI - this.ringAngle;
      // Draw front arc (in front of planet): from theta2 to theta1
      ctx.beginPath();
      ctx.ellipse(
        0,
        0,
        this.ringOuterRadius,
        this.ringOuterRadius * 0.32,
        0,
        theta2,
        theta1,
        false
      );
      ctx.ellipse(
        0,
        0,
        this.ringInnerRadius,
        this.ringInnerRadius * 0.32,
        0,
        theta1,
        theta2,
        true
      );
      ctx.closePath();
      ctx.fillStyle = `rgba(180,200,255,${this.ringOpacity})`;
      ctx.fill('evenodd');
      ctx.globalAlpha = 1.0;
      ctx.restore();
    }
  }

  tidal_mass_loss(bh_list, dt) {
    if (!this.intact || !bh_list || bh_list.length === 0)
      return { debris_count: 0, fraction: 0 };
    let min_dist_sq = Infinity,
      closest_bh = null;
    for (const bh of bh_list) {
      const dx = this.pos.x - bh.pos.x;
      const dy = this.pos.y - bh.pos.y;
      const dist_sq = dx * dx + dy * dy;
      if (dist_sq < min_dist_sq) {
        min_dist_sq = dist_sq;
        closest_bh = bh;
      }
    }
    if (!closest_bh) return { debris_count: 0, fraction: 0 };

    const tidal_threshold_sq = (closest_bh.radius * 4) ** 2;
    if (min_dist_sq < tidal_threshold_sq) {
      const min_dist = Math.sqrt(min_dist_sq);
      const tidal_threshold = Math.sqrt(tidal_threshold_sq);
      const fraction = Math.max(
        0.0,
        (tidal_threshold - min_dist) / tidal_threshold
      );

      this.mass -= this.mass * fraction * 0.08 * dt;
      let debris_count = Math.floor(fraction * 35 * dt);

      // A hundredth of a Jupiter, which is what the bare 0.5 always meant:
      // JUPITER_MASS_UNIT was a literal 50 when this line was written, so 0.5
      // units was 0.01 M_J. Correcting the unit to the real 0.955 left the
      // threshold at 0.52 M_J, which is heavier than most of the gas giants the
      // generator makes - every one of them would have come apart on the frame
      // it entered the tidal radius. Same repair as the asteroid and comet
      // thresholds above and below.
      if (this.mass <= 0.01 * JUPITER_MASS_UNIT) {
        this.intact = false;
        this.alive = false;
        debris_count += 20;
      }
      return { debris_count, fraction };
    }
    return { debris_count: 0, fraction: 0 };
  }

  get_state() {
    const baseState = super.get_state();
    return {
      ...baseState,
      massInJupiters: this.massInJupiters,
      giantType: this.giantType,
    };
  }

  set_state(s) {
    super.set_state(s);
    this.massInJupiters = s.massInJupiters;
    this.giantType = s.giantType;
  }
}

// Asteroid class
/**
 * A minor planet, massed in Ceres masses.
 *
 * The same shape as Planet and GasGiant: the caller gives a mass in the body's
 * own natural unit and the constructor converts it once. Before this it was a
 * literal 0.1 simulation units, which is 33 Earth masses - heavier than
 * Neptune, and 200,000 times Ceres.
 *
 * @extends PhysicsObject
 */
class Asteroid extends PhysicsObject {
  /**
   * @param {Object} pos - Initial position
   * @param {Object} vel - Initial velocity
   * @param {number} [massInCeres] - Mass in Ceres masses
   */
  constructor(pos, vel, massInCeres = 1.0) {
    const finalMassInCeres =
      Number.isFinite(massInCeres) && massInCeres > 0 ? massInCeres : 1.0;
    super(
      pos,
      vel,
      finalMassInCeres * CERES_MASS_UNIT,
      ASTEROID_RADIUS,
      'Asteroid'
    );
    this.massInCeres = finalMassInCeres;
    this.name = getRandomName('asteroids');
  }

  draw(ctx) {
    const world_pos = this.pos; // Use direct world coordinates since canvas is already transformed
    ctx.fillStyle = '#8B4513';
    ctx.beginPath();
    ctx.arc(world_pos.x, world_pos.y, drawRadius(this), 0, 2 * Math.PI);
    ctx.fill();
  }
}

// Debris class
/**
 * Collision and tidal ejecta, massed in kilometre-scale rocky fragments.
 *
 * Was a literal 0.01 simulation units, which is three Earth masses of gravel.
 *
 * @extends PhysicsObject
 */
class Debris extends PhysicsObject {
  /**
   * @param {Object} pos - Initial position
   * @param {Object} vel - Initial velocity
   * @param {number} [massInFragments] - Mass in 1 km rocky fragments
   */
  constructor(pos, vel, massInFragments = 1.0) {
    const finalMass =
      Number.isFinite(massInFragments) && massInFragments > 0
        ? massInFragments
        : 1.0;
    super(pos, vel, finalMass * DEBRIS_MASS_UNIT, DEBRIS_RADIUS, 'Debris');
    this.massInFragments = finalMass;
  }

  draw(ctx) {
    const world_pos = this.pos; // Use direct world coordinates since canvas is already transformed
    ctx.fillStyle = compute_dynamic_color('#c8c8c8', this.pos, bh_list, 200.0, {
      r: 255,
      g: 100,
      b: 0,
    });
    ctx.beginPath();
    ctx.arc(world_pos.x, world_pos.y, drawRadius(this), 0, 2 * Math.PI);
    ctx.fill();
  }
}

// AccretionDiskParticle class
/**
 * Represents individual particles in black hole accretion disks
 */
class AccretionDiskParticle extends PhysicsObject {
  constructor(pos, vel, parentBlackHole) {
    const mass = 0.0005; // Even smaller mass for disk particles
    const radius = 0.4; // Much smaller visual radius for more numerous, smaller particles
    super(pos, vel, mass, radius, 'AccretionDiskParticle');

    this.parentBlackHole = parentBlackHole;
    this.initial_temperature = 1000 + Math.random() * 4000; // Initial temperature
    this.temperature = this.initial_temperature;
    this.max_temperature = 50000; // Much higher max temperature for dramatic effects
    this.angular_momentum = 0;
    this.disk_radius = Math.hypot(
      pos.x - parentBlackHole.pos.x,
      pos.y - parentBlackHole.pos.y
    );
    this.orbital_velocity =
      Math.sqrt(parentBlackHole.mass / this.disk_radius) * 0.1; // Standard orbital velocity
    this.lifetime = 60 + Math.random() * 120; // 60-180 seconds - much longer lasting
    this.age = 0;
    this.spiral_factor = 0;
    this.absorbed = false;
    this.heating_intensity = 0; // How much the particle is heating up
    this.brightness_multiplier = 1.0; // Dynamic brightness as it heats up
    this.pulse_phase = Math.random() * Math.PI * 2; // Random phase for pulsing effect
  }

  update_physics(dt, _gravity_sources) {
    if (!this.alive || this.absorbed) return;

    this.age += dt;

    // Age-based decay (much slower now)
    if (this.age > this.lifetime) {
      this.alive = false;
      return;
    }

    // Calculate distance to parent black hole
    const dx = this.pos.x - this.parentBlackHole.pos.x;
    const dy = this.pos.y - this.parentBlackHole.pos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Check if particle has crossed the event horizon
    if (distance <= this.parentBlackHole.radius + 2) {
      this.absorbed = true;
      this.alive = false;

      // Add mass to black hole and trigger accretion effects
      this.parentBlackHole.mass += this.mass;
      this.parentBlackHole.updateRadius();

      // Trigger standard accretion intensity increase
      this.parentBlackHole.accretion_intensity = Math.min(
        1.0,
        this.parentBlackHole.accretion_intensity + 0.08
      );
      this.parentBlackHole.jet_intensity = Math.min(
        1.0,
        this.parentBlackHole.jet_intensity + 0.04
      );

      // When a particle is absorbed, slightly boost the remaining particles' orbital motion
      // This ensures the accretion disk maintains net rotation and spiral motion
      for (const particle of this.parentBlackHole.disk_particles) {
        if (particle !== this && particle.alive && !particle.absorbed) {
          // Slightly boost spiral factor to maintain motion
          particle.spiral_factor = Math.max(particle.spiral_factor, 0.2);
          // Slightly increase orbital velocity to maintain rotation
          particle.orbital_velocity *= 1.05;
        }
      }

      // Create absorption effect with temperature-based colors
      for (let i = 0; i < 6; i++) {
        const angle = Math.random() * 2 * Math.PI;
        const speed = Math.random() * 60 + 40;
        const p_vel = {
          x: speed * Math.cos(angle),
          y: speed * Math.sin(angle),
        };
        particlePool.getParticle(
          this.pos,
          p_vel,
          Math.random() * 1.2 + 0.8,
          8,
          2,
          this.getTemperatureColor()
        );
      }
      return;
    }

    // ENHANCED: Always maintain orbital motion regardless of black hole movement
    // Calculate current angle from black hole center
    const current_angle = Math.atan2(dy, dx);

    // Standard orbital velocity for rotation
    // Use the stored orbital velocity or calculate new one with standard speeds
    const base_orbital_v =
      Math.sqrt(this.parentBlackHole.mass / distance) * 0.3; // Standard rotation speed
    const orbital_v = Math.max(
      this.orbital_velocity || base_orbital_v,
      base_orbital_v
    );

    // Standard spiral motion - particles gradually spiral inward
    this.spiral_factor += dt * 0.01; // Standard spiral rate
    const spiral_velocity = this.spiral_factor * 0.2; // Standard spiral velocity

    // Calculate tangent direction (perpendicular to radial direction)
    const tangent_angle = current_angle + Math.PI / 2;

    // Add some orbital variation for more dynamic motion
    const orbital_variation = Math.sin(this.age * 2) * 0.2; // Small variation in orbital speed
    const final_orbital_v = orbital_v * (1 + orbital_variation);

    // Set velocity components:
    // 1. Orbital motion (tangential) - always present for rotation with dramatic speed
    // 2. Gradual spiral inward (radial) - always present for spiral
    this.vel.x =
      final_orbital_v * Math.cos(tangent_angle) -
      spiral_velocity * Math.cos(current_angle);
    this.vel.y =
      final_orbital_v * Math.sin(tangent_angle) -
      spiral_velocity * Math.sin(current_angle);

    // Update position
    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;

    // Add small random motion for dynamic appearance
    const random_motion = 0.2; // Small random motion factor
    this.pos.x += (Math.random() - 0.5) * random_motion * dt;
    this.pos.y += (Math.random() - 0.5) * random_motion * dt;

    // Enhanced temperature calculations - dramatic heating as particle spirals inward
    // const initial_distance = this.disk_radius; // reserved for future use

    // Exponential heating as particle approaches black hole
    const proximity_factor = Math.max(
      0,
      1 - distance / (this.parentBlackHole.radius * 15)
    );
    const exponential_heating = Math.pow(proximity_factor, 2);

    // Enhanced temperature with dramatic effects
    this.temperature =
      this.initial_temperature +
      (this.max_temperature - this.initial_temperature) * exponential_heating;

    // Dynamic brightness based on heating
    this.heating_intensity = exponential_heating;
    this.brightness_multiplier = 1.0 + this.heating_intensity * 1.5; // Up to 2.5x brighter

    // Add pulsing effect based on orbital motion and heating
    this.pulse_phase += dt * (1 + this.heating_intensity * 3); // Standard pulsing when hotter
  }

  getTemperatureColor() {
    // Enhanced temperature-based color with dramatic effects
    const temp = this.temperature;
    const brightness = this.brightness_multiplier;

    // Pulsing effect
    const pulse_factor = 0.8 + 0.4 * Math.sin(this.pulse_phase);
    const final_brightness = brightness * pulse_factor;

    if (temp < 3000) {
      // Deep red-orange
      const intensity = Math.floor(final_brightness * 150);
      return `rgb(${Math.min(255, intensity)}, ${Math.floor(intensity * 0.3)}, 0)`;
    } else if (temp < 8000) {
      // Orange to yellow
      const intensity = Math.floor(final_brightness * 200);
      return `rgb(${Math.min(255, intensity)}, ${Math.floor(intensity * 0.8)}, ${Math.floor(intensity * 0.2)})`;
    } else if (temp < 15000) {
      // Yellow-white
      const intensity = Math.floor(final_brightness * 220);
      return `rgb(${Math.min(255, intensity)}, ${Math.min(255, intensity)}, ${Math.floor(intensity * 0.6)})`;
    } else if (temp < 30000) {
      // White-hot
      const intensity = Math.floor(final_brightness * 240);
      return `rgb(${Math.min(255, intensity)}, ${Math.min(255, intensity)}, ${Math.min(255, intensity)})`;
    } else {
      // Blue-white plasma
      const intensity = Math.floor(final_brightness * 250);
      return `rgb(${Math.floor(intensity * 0.8)}, ${Math.floor(intensity * 0.9)}, ${Math.min(255, intensity)})`;
    }
  }

  /**
   * Relativistic Doppler beaming factor for this particle.
   *
   * Disk material orbits at a large fraction of c, so the side sweeping
   * towards the viewer is boosted in brightness and the receding side is
   * dimmed. Observed intensity scales as the Doppler factor cubed for a
   * continuum source, which is why a real accretion disk looks lopsided
   * rather than uniformly bright.
   *
   * The viewer is treated as looking down -y, matching the 2D projection.
   * @returns {number} Multiplier applied to brightness and alpha
   */
  getDopplerFactor() {
    if (!physicsSettings.disk_doppler) return 1;
    const bh = this.parentBlackHole;
    if (!bh) return 1;

    // Velocity relative to the hole, as a fraction of the local escape speed -
    // a stand-in for v/c that stays bounded without needing real units.
    const vx = this.vel.x - (bh.vel?.x || 0);
    const vy = this.vel.y - (bh.vel?.y || 0);
    const speed = Math.hypot(vx, vy);
    if (speed < 1e-6) return 1;

    const beta = Math.min(0.55, speed / DISK_REFERENCE_SPEED);
    // Component of motion along the line of sight (towards -y = towards viewer)
    const losFraction = -vy / speed;
    const gamma = 1 / Math.sqrt(1 - beta * beta);
    const doppler = 1 / (gamma * (1 - beta * losFraction));
    return Math.max(0.25, Math.min(3.2, doppler ** 3));
  }

  draw(ctx) {
    if (!this.alive || this.absorbed) return;

    const world_pos = this.pos;
    const color = this.getTemperatureColor();
    const beam = this.getDopplerFactor();

    // Enhanced drawing with glow effect for hot particles
    const glow_radius =
      this.radius * (1 + this.heating_intensity * 2) * (0.8 + beam * 0.25);
    const core_radius = this.radius * 0.6;

    // Draw glow effect for hot particles
    if (this.heating_intensity > 0.1) {
      const glow_alpha = Math.min(0.9, this.heating_intensity * 0.6 * beam);
      ctx.globalAlpha = glow_alpha;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(world_pos.x, world_pos.y, glow_radius, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Draw core particle
    ctx.fillStyle = color;
    ctx.globalAlpha = Math.max(0.15, Math.min(1, 0.9 * beam));
    ctx.beginPath();
    ctx.arc(world_pos.x, world_pos.y, core_radius, 0, 2 * Math.PI);
    ctx.fill();

    // Draw bright center for very hot particles
    if (this.heating_intensity > 0.5) {
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, 0.8 * beam)})`;
      ctx.beginPath();
      ctx.arc(world_pos.x, world_pos.y, core_radius * 0.4, 0, 2 * Math.PI);
      ctx.fill();
    }

    ctx.globalAlpha = 1.0;
  }
}

// BlackHole class
/**
 * Black hole physics object with gravitational effects
 */
class BlackHole {
  /**
   * Create a black hole object
   * @param {Object} pos - Initial position with x, y properties
   * @param {number} mass - Black hole mass
   * @param {Object} vel - Initial velocity with x, y properties
   * @param {boolean} isNewlyCreated - Whether this is a new black hole
   * @param {number} jet_orientation - Angle in radians for jet direction (optional)
   */
  constructor(
    pos,
    mass,
    vel = { x: 0, y: 0 },
    isNewlyCreated = false,
    jet_orientation = null
  ) {
    this.id = PhysicsObject_id_counter++; // Add unique ID for energy tracking
    this.pos = { ...pos };
    this.mass = parseFloat(mass);
    this.vel = { ...vel };
    this.obj_type = 'BlackHole';
    this.alive = true; // Add alive property for deletion support
    this.updateRadius();
    this.name = getRandomName('blackHoles');

    // Track if this black hole is newly created (spawned by user or from merger)
    this.isNewlyCreated = isNewlyCreated;
    this.creationTime = Date.now();
    this.movementGracePeriod = 10.0; // 10 seconds of movement even in static mode

    this.accretion_intensity = 0.0;
    this.jet_intensity = 0.0;
    this.disk_growth = 0.0;
    this.last_mass = this.mass;
    this.time_since_last_accretion = 0.0;
    this.accretion_decay_rate = 0.08; // Much slower decay for longer-lasting effects
    this.jet_decay_rate = 0.06; // Slower jet decay
    this.disk_growth_decay_rate = 0.04; // Very slow disk growth decay
    this.max_disk_growth = 1.2; // Larger maximum disk size
    this.disk_particles = []; // Array to hold accretion disk particles
    this.max_disk_particles = 150; // Much more particles for more dramatic effects
    this.particle_generation_rate = 1.2; // Much higher particle generation rate
    this.time_since_last_particle = 0;
    this.merger_boost_timer = 0; // Timer for enhanced effects after mergers
    this.merger_particle_boost = 1.0; // Multiplier for particle generation after mergers
    // Assign a random jet orientation if not provided
    this.jet_orientation =
      jet_orientation !== null ? jet_orientation : Math.random() * 2 * Math.PI;
    // Generate initial accretion disk particles for all black holes
    this.generateInitialDiskParticles();
  }

  /**
   * Generate initial accretion disk particles for new black holes
   */
  generateInitialDiskParticles() {
    // Only generate if accretion disk is enabled
    if (!physicsSettings || !physicsSettings.show_accretion_disk) return;

    // Generate 30-60 initial particles based on black hole mass
    const massInSuns = this.mass / SOLAR_MASS_UNIT;
    const baseParticles = 30;
    const massBonus = Math.floor(massInSuns * 2); // More particles for more massive black holes
    const totalParticles = Math.min(baseParticles + massBonus, 60);

    for (let i = 0; i < totalParticles; i++) {
      this.generateInitialDiskParticle();
    }

    // Set initial accretion intensity to show the disk is active
    this.accretion_intensity = 0.2;
    this.disk_growth = 0.3;
  }

  /**
   * Generate a single initial disk particle with slightly different properties
   */
  generateInitialDiskParticle() {
    const disk_radius = this.radius * (1.5 + Math.random() * 3.0); // 1.5-4.5 times radius
    const angle = Math.random() * 2 * Math.PI;

    const pos = {
      x: this.pos.x + disk_radius * Math.cos(angle),
      y: this.pos.y + disk_radius * Math.sin(angle),
    };

    // Standard orbital velocity for stable disk formation
    const orbital_speed = Math.sqrt(this.mass / disk_radius) * 0.4; // Standard rotation speed
    const tangent_angle = angle + Math.PI / 2;
    const vel = {
      x: orbital_speed * Math.cos(tangent_angle),
      y: orbital_speed * Math.sin(tangent_angle),
    };

    const particle = new AccretionDiskParticle(pos, vel, this);

    // ENHANCED: Set initial orbital properties to ensure consistent rotation
    particle.orbital_velocity = orbital_speed;
    particle.spiral_factor = Math.random() * 0.2; // Small initial spiral factor

    // Give initial particles longer lifetimes and varied temperatures
    particle.initial_temperature = 2000 + Math.random() * 6000; // 2000-8000K
    particle.temperature = particle.initial_temperature;
    particle.lifetime = 90 + Math.random() * 120; // 90-210 seconds
    particle.brightness_multiplier = 0.8 + Math.random() * 0.4; // 0.8-1.2x brightness

    this.disk_particles.push(particle);
    accretion_disk_particles.push(particle);
  }

  updateRadius() {
    const mass_scale = Math.max(0.1, this.mass / (1.0 * SOLAR_MASS_UNIT)); // Changed from DEFAULT_SETTINGS.bh_mass
    this.radius = BH_RADIUS_BASE * Math.pow(mass_scale, 0.3); // Changed from 0.5 to 0.3 for more conservative scaling
  }

  /**
   * Whether this hole is allowed to move this step.
   *
   * Static holes are a deliberate model: a fixed potential well a student can
   * fly things past. A newly created hole gets a short grace period so a merger
   * product does not freeze in place mid-flight.
   *
   * @returns {boolean} True when the hole integrates its own motion
   */
  can_move() {
    const timeSinceCreation = (Date.now() - this.creationTime) / 1000;
    return (
      physicsSettings.bh_behavior === 'Orbiting' ||
      (this.isNewlyCreated && timeSinceCreation < this.movementGracePeriod)
    );
  }

  /**
   * The acceleration on this hole from the other holes and the halo.
   *
   * Separated from the step for the same reason as PhysicsObject.apply_step:
   * a black-hole binary advanced one hole at a time loses orbital energy on its
   * own, which is indistinguishable on screen from the inspiral term below and
   * is not physics.
   *
   * @param {Array} other_bhs - Every black hole, including this one
   * @returns {{ax: number, ay: number}} Acceleration
   */
  orbit_acceleration(other_bhs) {
    if (!this.can_move()) return { ax: 0, ay: 0 };
    const { ax, ay } = gravitational_acceleration(
      this.pos,
      other_bhs.filter(bh => bh !== this)
    );
    // Black holes take their own path through the integrator, so the halo has
    // to be applied here too. Inside the can_move guard, not outside it: a
    // static black hole that quietly accumulated halo velocity would leap the
    // moment anything set it moving.
    const halo = activeHalo();
    if (!halo) return { ax, ay };
    const h = haloAcceleration(this.pos, halo);
    return { ax: ax + h.ax, ay: ay + h.ay };
  }

  /**
   * Advance this hole with an acceleration already computed.
   * @param {number} dt - Timestep
   * @param {number} ax - Acceleration, x
   * @param {number} ay - Acceleration, y
   */
  apply_orbit_step(dt, ax, ay) {
    if (!this.can_move()) return;
    this.vel.x += ax * dt;
    this.vel.y += ay * dt;
    // The phenomenological inspiral term. Not gravitational-wave emission: a
    // constant fractional damping, documented as such on the model page.
    const decay_factor = 1.0 - physicsSettings.orbit_decay_rate * dt;
    this.vel.x *= decay_factor;
    this.vel.y *= decay_factor;
    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;
  }

  update_orbit(dt, other_bhs) {
    const { ax, ay } = this.orbit_acceleration(other_bhs);
    this.apply_orbit_step(dt, ax, ay);
  }

  update_dynamic_effects(dt) {
    if (this.mass > this.last_mass) {
      const mass_gain = this.mass - this.last_mass;
      const mass_ratio = mass_gain / this.mass;

      // Standard accretion effects during mergers
      this.accretion_intensity = Math.min(
        1.0,
        this.accretion_intensity + mass_ratio * 15
      );
      this.jet_intensity = Math.min(1.0, this.jet_intensity + mass_ratio * 8);
      this.disk_growth = Math.min(
        this.max_disk_growth,
        this.disk_growth + mass_ratio * 12
      );
      this.time_since_last_accretion = 0.0;

      // Trigger merger boost for enhanced particle generation
      this.merger_boost_timer = 20.0; // 20 seconds of enhanced effects
      this.merger_particle_boost = 1.0 + mass_ratio * 5; // Up to 5x more particles

      // Create merger particles - reasonable amount
      const merger_particles = Math.floor(mass_ratio * 200) + 20;
      for (let i = 0; i < merger_particles; i++) {
        this.generateEnhancedMergerParticle();
      }
    }

    this.time_since_last_accretion += dt;
    this.merger_boost_timer = Math.max(0, this.merger_boost_timer - dt);

    // Decay merger boost over time
    if (this.merger_boost_timer <= 0) {
      this.merger_particle_boost = Math.max(
        1.0,
        this.merger_particle_boost - dt * 0.1
      );
    }

    this.accretion_intensity = Math.max(
      0.0,
      this.accretion_intensity - this.accretion_decay_rate * dt
    );
    this.jet_intensity = Math.max(
      0.0,
      this.jet_intensity - this.jet_decay_rate * dt
    );
    this.disk_growth = Math.max(
      0.0,
      this.disk_growth - this.disk_growth_decay_rate * dt
    );

    // Update disk particles
    this.updateDiskParticles(dt);

    this.last_mass = this.mass;
  }

  /**
   * Create accretion disk particles around the black hole
   * @param {number} dt - Delta time
   */
  updateDiskParticles(dt) {
    if (
      !physicsSettings.show_accretion_disk ||
      !physicsSettings.realistic_disk_physics
    )
      return;

    // Generate new particles with merger boost
    this.time_since_last_particle += dt;
    const effective_generation_rate =
      this.particle_generation_rate * this.merger_particle_boost;

    if (
      this.time_since_last_particle >= 1.0 / effective_generation_rate &&
      this.disk_particles.length < this.max_disk_particles
    ) {
      this.generateDiskParticle();
      this.time_since_last_particle = 0;
    }

    // During intense accretion, generate extra particles
    if (
      this.accretion_intensity > 0.7 &&
      this.disk_particles.length < this.max_disk_particles
    ) {
      if (Math.random() < this.accretion_intensity * dt * 2) {
        this.generateDiskParticle();
      }
    }

    // Update existing particles
    for (let i = this.disk_particles.length - 1; i >= 0; i--) {
      const particle = this.disk_particles[i];
      particle.update_physics(dt, []);

      // Remove dead particles
      if (!particle.alive) {
        this.disk_particles.splice(i, 1);
      }
    }
  }

  /**
   * Generate a new accretion disk particle
   */
  generateDiskParticle() {
    const disk_radius = this.radius * (1.2 + Math.random() * 2.5); // Much closer to black hole: 1.2-3.7 times radius
    const angle = Math.random() * 2 * Math.PI;

    const pos = {
      x: this.pos.x + disk_radius * Math.cos(angle),
      y: this.pos.y + disk_radius * Math.sin(angle),
    };

    // Standard orbital motion for disk particles
    const orbital_speed = Math.sqrt(this.mass / disk_radius) * 0.5; // Standard rotation speed
    const tangent_angle = angle + Math.PI / 2;
    const vel = {
      x: orbital_speed * Math.cos(tangent_angle),
      y: orbital_speed * Math.sin(tangent_angle),
    };

    const particle = new AccretionDiskParticle(pos, vel, this);

    // ENHANCED: Set initial orbital velocity to ensure consistent rotation
    particle.orbital_velocity = orbital_speed;
    particle.spiral_factor = Math.random() * 0.3; // Random initial spiral factor for variety

    this.disk_particles.push(particle);
    accretion_disk_particles.push(particle);
  }

  /**
   * Generate enhanced merger particles with more dramatic effects
   */
  generateEnhancedMergerParticle() {
    const disk_radius = this.radius * (0.8 + Math.random() * 2.5); // Even closer to black hole for more dramatic effects
    const angle = Math.random() * 2 * Math.PI;

    const pos = {
      x: this.pos.x + disk_radius * Math.cos(angle),
      y: this.pos.y + disk_radius * Math.sin(angle),
    };

    // Standard orbital velocity for merger particles
    const orbital_speed = Math.sqrt(this.mass / disk_radius) * 0.6; // Standard rotation speed
    const tangent_angle = angle + Math.PI / 2;
    const vel = {
      x: orbital_speed * Math.cos(tangent_angle),
      y: orbital_speed * Math.sin(tangent_angle),
    };

    const particle = new AccretionDiskParticle(pos, vel, this);

    // ENHANCED: Set strong initial orbital properties for merger particles
    particle.orbital_velocity = orbital_speed;
    particle.spiral_factor = 0.5 + Math.random() * 0.5; // Higher initial spiral factor for merger particles

    // Enhanced properties for merger particles
    particle.initial_temperature = 3000 + Math.random() * 7000; // Start hotter
    particle.temperature = particle.initial_temperature;
    particle.lifetime = 90 + Math.random() * 180; // Even longer lifetime
    particle.brightness_multiplier = 1.5 + Math.random() * 0.5; // Start brighter

    this.disk_particles.push(particle);
    accretion_disk_particles.push(particle);
  }

  /**
   * Draw accretion disk particles instead of gradient effect
   */
  drawDiskParticles(ctx) {
    if (
      !physicsSettings.show_accretion_disk ||
      !physicsSettings.realistic_disk_physics
    )
      return;

    for (const particle of this.disk_particles) {
      particle.draw(ctx);
    }
  }

  draw(ctx) {
    const world_pos = this.pos; // Use direct world coordinates since canvas is already transformed
    const world_radius = this.radius;

    if (physicsSettings.show_accretion_disk) {
      // Draw disk particles for more realistic disk behavior
      this.drawDiskParticles(ctx);

      // Enhanced gradient backdrop with more dramatic effects
      const base_disk_radius = world_radius * 3.0; // Increased from 2.5
      const growth_factor = 1.0 + this.disk_growth * 0.8; // Increased from 0.6
      const disk_radius = base_disk_radius * growth_factor;

      if (disk_radius > world_radius) {
        const base_intensity = physicsSettings.realistic_disk_physics
          ? 0.15 + this.accretion_intensity * 0.4 // Increased backdrop intensity
          : 0.4 + this.accretion_intensity * 0.8; // Increased full intensity

        const inner_radius = world_radius * (1.3 + this.disk_growth * 0.4); // Increased from 1.2 and 0.3
        const inner_grad = ctx.createRadialGradient(
          world_pos.x,
          world_pos.y,
          world_radius * 1.1,
          world_pos.x,
          world_pos.y,
          inner_radius
        );
        const inner_intensity =
          base_intensity * (0.9 + this.accretion_intensity * 0.4); // Increased from 0.8 and 0.3
        const opacity_multiplier = physicsSettings.realistic_disk_physics
          ? 0.6
          : 1.0; // Increased from 0.4 and 0.9

        // Enhanced color progression with more dramatic heating effects
        inner_grad.addColorStop(
          0,
          `rgba(255, 255, 255, ${inner_intensity * opacity_multiplier * 0.8})` // Brighter white center
        );
        inner_grad.addColorStop(
          0.2,
          `rgba(255, 255, 200, ${inner_intensity * opacity_multiplier})`
        );
        inner_grad.addColorStop(
          0.4,
          `rgba(255, 220, 100, ${inner_intensity * opacity_multiplier * 0.9})`
        );
        inner_grad.addColorStop(
          0.7,
          `rgba(255, 180, 50, ${inner_intensity * opacity_multiplier * 0.7})`
        );
        inner_grad.addColorStop(
          1,
          `rgba(255, 140, 0, ${inner_intensity * opacity_multiplier * 0.4})`
        );
        ctx.fillStyle = inner_grad;
        ctx.beginPath();
        ctx.arc(world_pos.x, world_pos.y, inner_radius, 0, 2 * Math.PI);
        ctx.fill();

        const outer_grad = ctx.createRadialGradient(
          world_pos.x,
          world_pos.y,
          inner_radius,
          world_pos.x,
          world_pos.y,
          disk_radius
        );

        // Enhanced outer gradient with more dramatic colors
        outer_grad.addColorStop(
          0,
          `rgba(255, 200, 80, ${base_intensity * opacity_multiplier * 0.7})` // Brighter transition
        );
        outer_grad.addColorStop(
          0.3,
          `rgba(255, 160, 40, ${base_intensity * opacity_multiplier * 0.6})`
        );
        outer_grad.addColorStop(
          0.6,
          `rgba(255, 120, 20, ${base_intensity * opacity_multiplier * 0.4})`
        );
        outer_grad.addColorStop(
          0.9,
          `rgba(255, 80, 0, ${base_intensity * opacity_multiplier * 0.2})`
        );
        outer_grad.addColorStop(1, `rgba(255, 50, 0, 0)`);
        ctx.fillStyle = outer_grad;
        ctx.beginPath();
        ctx.arc(world_pos.x, world_pos.y, disk_radius, 0, 2 * Math.PI);
        ctx.fill();
      }
    }

    if (physicsSettings.show_bh_glow) {
      const glow_radius = world_radius * (2.2 + this.disk_growth * 0.5); // Increased from 1.8 and 0.4
      const glow_intensity = 0.5 + this.accretion_intensity * 0.4; // Increased from 0.4 and 0.3
      const grad = ctx.createRadialGradient(
        world_pos.x,
        world_pos.y,
        world_radius,
        world_pos.x,
        world_pos.y,
        glow_radius
      );

      // Enhanced glow colors
      grad.addColorStop(0, `rgba(220, 220, 255, ${glow_intensity * 0.8})`);
      grad.addColorStop(0.5, `rgba(200, 200, 255, ${glow_intensity * 0.4})`);
      grad.addColorStop(1, `rgba(180, 180, 255, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(world_pos.x, world_pos.y, glow_radius, 0, 2 * Math.PI);
      ctx.fill();
    }

    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(world_pos.x, world_pos.y, world_radius, 0, 2 * Math.PI);
    ctx.fill();

    if (physicsSettings.show_bh_jets) {
      // --- Realistic, dynamic jet rendering (many thin lines, volumetric) ---
      const jet_length = world_radius * (11 + this.jet_intensity * 3.5); // Moderately longer jet
      const jet_base_width = Math.max(
        1.5 / state.zoom,
        world_radius * (0.18 + this.jet_intensity * 0.12)
      );
      const jet_tip_width = jet_base_width * 2.2;
      const jet_intensity = 0.7 + this.jet_intensity * 0.5;
      const time = Date.now() * 0.001;
      const precession_angle = Math.sin(time * 0.25 + this.pos.x * 0.13) * 0.09;
      const flicker = 0.85 + 0.35 * Math.sin(time * 10 + this.pos.y * 0.3);
      const jet_colors = [
        { stop: 0, color: [255, 255, 200], alpha: 1.0 },
        { stop: 0.15, color: [255, 240, 160], alpha: 0.85 },
        { stop: 0.35, color: [255, 220, 100], alpha: 0.65 },
        { stop: 0.6, color: [200, 200, 255], alpha: 0.35 },
        { stop: 0.85, color: [150, 170, 255], alpha: 0.13 },
        { stop: 1, color: [100, 140, 255], alpha: 0.0 },
      ];
      for (let i = 0; i < 2; i++) {
        const base_angle = this.jet_orientation + i * Math.PI;
        const angle = base_angle + precession_angle;
        // Draw the main jet beam as a polygon with gradient
        ctx.save();
        ctx.beginPath();
        const base_x = world_pos.x + Math.sin(angle) * world_radius;
        const base_y = world_pos.y + Math.cos(angle) * world_radius;
        const tip_x =
          world_pos.x + Math.sin(angle) * (world_radius + jet_length);
        const tip_y =
          world_pos.y + Math.cos(angle) * (world_radius + jet_length);
        const perp = { x: Math.cos(angle), y: -Math.sin(angle) };
        ctx.moveTo(
          base_x - perp.x * jet_base_width,
          base_y - perp.y * jet_base_width
        );
        ctx.lineTo(
          tip_x - perp.x * jet_tip_width,
          tip_y - perp.y * jet_tip_width
        );
        ctx.lineTo(
          tip_x + perp.x * jet_tip_width,
          tip_y + perp.y * jet_tip_width
        );
        ctx.lineTo(
          base_x + perp.x * jet_base_width,
          base_y + perp.y * jet_base_width
        );
        ctx.closePath();
        const grad = ctx.createLinearGradient(base_x, base_y, tip_x, tip_y);
        for (const stop of jet_colors) {
          // Use the provided alpha for a more gradual fade
          const alpha = stop.alpha * jet_intensity * flicker;
          grad.addColorStop(
            stop.stop,
            `rgba(${stop.color[0]},${stop.color[1]},${stop.color[2]},${alpha})`
          );
        }
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = grad;
        ctx.filter = 'blur(0.5px)';
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.filter = 'none';
        ctx.restore();
        // --- Jet lines: many, very thin, volumetric, flickering ---
        const numLines = 90;
        for (let i = 0; i < numLines; i++) {
          // t: 0 (base) to 1 (tip), randomize for volumetric fill
          const t = Math.random();
          // Random offset from center axis for volumetric effect
          const width = jet_base_width * (1 - t) + jet_tip_width * t;
          const offset = (Math.random() - 0.5) * width * 1.1;
          // Flicker: only draw if random threshold is met (rapid flutter)
          if (Math.random() > 0.38 + 0.55 * Math.sin(time * 16 + t * 10 + i))
            continue;
          // Position along jet, offset from axis
          const px =
            world_pos.x +
            Math.sin(angle) * (world_radius + t * jet_length) +
            perp.x * offset;
          const py =
            world_pos.y +
            Math.cos(angle) * (world_radius + t * jet_length) +
            perp.y * offset;
          // Line direction: mostly along jet, but with small random angular spread
          const angleSpread = angle + (Math.random() - 0.5) * 0.18;
          // Line length tapers and flutters
          const lineLen = width * (1.2 + 0.7 * Math.sin(time * 12 + t * 8 + i));
          // Color: interpolate between stops
          let color = [255, 255, 200];
          if (t > 0.6) color = [180, 200, 255];
          else if (t > 0.25) color = [255, 220, 100];
          // Opacity fades with distance
          const alpha = Math.max(
            0.03,
            Math.min(0.18, jet_intensity * (1 - t * 0.4) * flicker)
          );
          ctx.save();
          ctx.strokeStyle = `rgba(${color[0]},${color[1]},${color[2]},${alpha})`;
          ctx.lineWidth = Math.max(0.5, width * 0.09); // much thinner lines
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(
            px + Math.sin(angleSpread) * lineLen,
            py + Math.cos(angleSpread) * lineLen
          );
          ctx.stroke();
          ctx.restore();
        }
        // Jet tip shock (subtle, fading away gradually)
        const tip_shock_radius =
          jet_tip_width * (1.2 + 0.3 * Math.sin(time * 2 + i));
        const tip_grad = ctx.createRadialGradient(
          tip_x,
          tip_y,
          0,
          tip_x,
          tip_y,
          tip_shock_radius
        );
        tip_grad.addColorStop(0, `rgba(180,200,255,${0.3 * flicker})`);
        tip_grad.addColorStop(0.3, `rgba(120,160,255,${0.15 * flicker})`);
        tip_grad.addColorStop(0.7, `rgba(100,140,255,${0.05 * flicker})`);
        tip_grad.addColorStop(1, `rgba(100,140,255,0)`);
        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.arc(tip_x, tip_y, tip_shock_radius, 0, 2 * Math.PI);
        ctx.fillStyle = tip_grad;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.restore();
      }
    }

    // ... label code ...

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const true_screen_pos = world_to_screen(world_pos);
    const screen_radius = world_radius * state.zoom;
    let label_y_offset = screen_radius + 15;
    if (physicsSettings.show_bh_jets) {
      label_y_offset = screen_radius * 6 + screen_radius + 10;
    } else if (physicsSettings.show_accretion_disk) {
      label_y_offset = screen_radius * 2.5 + 10;
    } else if (physicsSettings.show_bh_glow) {
      label_y_offset = screen_radius * 1.8 + 10;
    }
    ctx.font = '14px Roboto Mono';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 4;
    // Significant figures rather than one decimal place: a stellar-mass hole
    // reads 9.80 and a supermassive one reads 1.00 x 10^6 instead of 1000000.0.
    const massStr = formatNumber(this.mass / SOLAR_MASS_UNIT);
    drawSolarLabel(
      ctx,
      massStr,
      true_screen_pos.x,
      true_screen_pos.y + label_y_offset
    );
    ctx.restore();
  }

  get_state() {
    return {
      id: this.id,
      type: this.obj_type,
      pos: this.pos,
      vel: this.vel,
      mass: this.mass,
      alive: this.alive,
      name: this.name,
      accretion_intensity: this.accretion_intensity,
      jet_intensity: this.jet_intensity,
      disk_growth: this.disk_growth,
      time_since_last_accretion: this.time_since_last_accretion,
    };
  }

  set_state(s) {
    // `??`, not `||`: the very first object built in a world has id 0, and a
    // falsy check hands it a brand-new id on every restore. Nothing noticed
    // while ids were only used for energy bookkeeping; the A/B bench compares
    // "body 0" across a restore and would have measured a different object.
    this.id = s.id ?? PhysicsObject_id_counter++;
    this.pos = s.pos;
    this.vel = s.vel;
    this.mass = s.mass;
    this.alive = s.alive !== undefined ? s.alive : true;
    this.name = s.name || getRandomName('blackHoles');
    this.accretion_intensity = s.accretion_intensity || 0.0;
    this.jet_intensity = s.jet_intensity || 0.0;
    this.disk_growth = s.disk_growth || 0.0;
    this.time_since_last_accretion = s.time_since_last_accretion || 0.0;
    this.updateRadius();
  }
}

// Star color function is now imported from utils.js

// StarObject class
class StarObject extends PhysicsObject {
  constructor(pos, vel, massInSuns = null) {
    let finalMassInSuns;
    if (massInSuns !== null) {
      finalMassInSuns = massInSuns;
    } else {
      finalMassInSuns = Math.pow(10, Math.random() * 1.5 - 0.7);
    }

    const radius = STAR_OBJ_RADIUS * Math.pow(finalMassInSuns, 0.85);

    super(pos, vel, finalMassInSuns * SOLAR_MASS_UNIT, radius, 'StarObject');
    this.massInSuns = finalMassInSuns;
    this.baseColor = getStarColor(this.massInSuns);
    this.intact = true;
    this.name = getRandomName('stars');
    this.temperature = null; // Will be set for specific stars
    this.spectralType = null; // Will be set for specific stars
    this.age = null; // Will be set for specific stars
    // Per-star toggle for rendering habitable (Goldilocks) zone rings
    this.showHabitableZone = false;
  }

  draw(ctx) {
    const world_pos = this.pos; // Use direct world coordinates since canvas is already transformed
    // Use custom baseColor if set, otherwise use computed color
    const starColor = this.baseColor || getStarColor(this.massInSuns);
    const rgb = hexToRgb(starColor) || { r: 255, g: 220, b: 160 };
    // Core
    ctx.fillStyle = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
    ctx.beginPath();
    ctx.arc(world_pos.x, world_pos.y, drawRadius(this), 0, 2 * Math.PI);
    ctx.fill();
    // Soft bloom to offscreen canvas for compositing
    try {
      const { x: screenX, y: screenY } = world_to_screen(world_pos);
      const screenR = this.radius * state.zoom;
      if (screenR > 2 && typeof window !== 'undefined' && window.bloomCtx) {
        const grad = window.bloomCtx.createRadialGradient(
          screenX,
          screenY,
          0,
          screenX,
          screenY,
          screenR * 3
        );
        grad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0.35)`);
        grad.addColorStop(0.5, `rgba(${rgb.r},${rgb.g},${rgb.b},0.15)`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        window.bloomCtx.fillStyle = grad;
        window.bloomCtx.beginPath();
        window.bloomCtx.arc(screenX, screenY, screenR * 3, 0, 2 * Math.PI);
        window.bloomCtx.fill();
      }
    } catch {
      // no-op
    }

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const true_screen_pos = world_to_screen(world_pos);
    const screen_radius = this.radius * state.zoom;

    if (screen_radius > 5) {
      const label_y_offset = screen_radius + 12;
      ctx.font = '12px Roboto Mono';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'black';
      ctx.shadowBlur = 4;

      // Show name for Solar System sun, mass for others
      if (this.isSolarSystemSun) {
        ctx.fillText(
          this.name,
          true_screen_pos.x,
          true_screen_pos.y + label_y_offset
        );
      } else {
        drawSolarLabel(
          ctx,
          formatNumber(this.massInSuns),
          true_screen_pos.x,
          true_screen_pos.y + label_y_offset
        );
        // Remove subscript 'sun' drawing
      }
    }
    ctx.restore();
  }

  tidal_mass_loss(bh_list, dt) {
    if (!this.intact || !bh_list || bh_list.length === 0)
      return { debris_count: 0, fraction: 0 };
    let min_dist_sq = Infinity,
      closest_bh = null;
    for (const bh of bh_list) {
      const dx = this.pos.x - bh.pos.x;
      const dy = this.pos.y - bh.pos.y;
      const dist_sq = dx * dx + dy * dy;
      if (dist_sq < min_dist_sq) {
        min_dist_sq = dist_sq;
        closest_bh = bh;
      }
    }
    if (!closest_bh) return { debris_count: 0, fraction: 0 };
    const tidal_threshold_sq = (closest_bh.radius * 5) ** 2;
    if (min_dist_sq < tidal_threshold_sq) {
      const min_dist = Math.sqrt(min_dist_sq);
      const tidal_threshold = Math.sqrt(tidal_threshold_sq);
      const fraction = Math.max(
        0.0,
        (tidal_threshold - min_dist) / tidal_threshold
      );
      this.mass -= this.mass * fraction * 0.1 * dt;
      let debris_count = Math.floor(fraction * 50 * dt);
      // A thousandth of a solar mass - about one Jupiter - which is the same
      // number the bare 1.0 was, written against the unit it means. Below this
      // there is no star left to strip.
      if (this.mass <= 0.001 * SOLAR_MASS_UNIT) {
        this.intact = false;
        this.alive = false;
        debris_count += 30;
      }
      return { debris_count, fraction };
    }
    return { debris_count: 0, fraction: 0 };
  }

  get_state() {
    const baseState = super.get_state();
    return {
      ...baseState,
      massInSuns: this.massInSuns,
      baseColor: this.baseColor,
      showHabitableZone: this.showHabitableZone,
    };
  }

  set_state(s) {
    super.set_state(s);
    this.massInSuns = s.massInSuns;
    this.baseColor = s.baseColor;
    this.showHabitableZone = !!s.showHabitableZone;
  }
}

// NeutronStar class
class NeutronStar extends PhysicsObject {
  constructor(pos, vel, massInSuns = null, isPulsar = null) {
    let finalMassInSuns;
    if (massInSuns !== null) {
      finalMassInSuns = massInSuns;
    } else {
      finalMassInSuns = 1.4 + Math.random() * 0.6; // 1.4 to 2.0 solar masses
    }

    const radius = NEUTRON_STAR_RADIUS;

    super(pos, vel, finalMassInSuns * SOLAR_MASS_UNIT, radius, 'NeutronStar');
    this.massInSuns = finalMassInSuns;
    this.pulsar_period = 0.1 + Math.random() * 2.0; // 0.1 to 2.1 seconds
    this.pulsar_phase = Math.random() * 2 * Math.PI;
    this.magnetic_field_strength = Math.random() * 0.8 + 0.2; // 0.2 to 1.0
    this.intact = true;
    this.name = getRandomName('neutronStars');
    // Randomly assign pulsar status if not specified
    this.isPulsar = isPulsar !== null ? isPulsar : Math.random() < 0.5;
    this.pulsar = this.isPulsar; // For inspector compatibility
  }

  draw(ctx) {
    const world_pos = this.pos; // Use direct world coordinates since canvas is already transformed

    // Pulsar effect
    this.pulsar_phase += 0.1;
    const pulse_intensity =
      0.5 + 0.5 * Math.sin(this.pulsar_phase / this.pulsar_period);

    // Core
    ctx.fillStyle = compute_dynamic_color('#E6E6FA', this.pos, bh_list, 300.0, {
      r: 255,
      g: 255,
      b: 255,
    });
    ctx.beginPath();
    ctx.arc(world_pos.x, world_pos.y, drawRadius(this), 0, 2 * Math.PI);
    ctx.fill();

    // Magnetic field visualization
    if (this.radius * state.zoom > 2) {
      const field_radius = this.radius * (2 + this.magnetic_field_strength);
      const field_intensity = pulse_intensity * 0.3;

      ctx.strokeStyle = `rgba(0, 255, 255, ${field_intensity})`;
      ctx.lineWidth = 1 / state.zoom;
      ctx.beginPath();
      ctx.arc(world_pos.x, world_pos.y, field_radius, 0, 2 * Math.PI);
      ctx.stroke();
    }

    // Pulsar beams (only if isPulsar)
    if (this.isPulsar && this.radius * state.zoom > 1) {
      const beam_length = this.radius * 8;
      const beam_width = Math.max(0.5 / state.zoom, this.radius * 0.3);

      ctx.strokeStyle = `rgba(255, 255, 255, ${pulse_intensity * 0.8})`;
      ctx.lineWidth = beam_width;
      ctx.lineCap = 'round';

      // Two beams at opposing angles
      for (let i = 0; i < 2; i++) {
        const angle = this.pulsar_phase + i * Math.PI;
        const beam_start_x = world_pos.x + Math.cos(angle) * this.radius;
        const beam_start_y = world_pos.y + Math.sin(angle) * this.radius;
        const beam_end_x = world_pos.x + Math.cos(angle) * beam_length;
        const beam_end_y = world_pos.y + Math.sin(angle) * beam_length;

        ctx.beginPath();
        ctx.moveTo(beam_start_x, beam_start_y);
        ctx.lineTo(beam_end_x, beam_end_y);
        ctx.stroke();
      }
    }

    // Label
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const true_screen_pos = world_to_screen(world_pos);
    const screen_radius = this.radius * state.zoom;

    if (screen_radius > 2) {
      const label_y_offset = screen_radius * 8 + 12;
      ctx.font = '12px Roboto Mono';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'black';
      ctx.shadowBlur = 4;
      drawSolarLabel(
        ctx,
        formatNumber(this.massInSuns),
        true_screen_pos.x,
        true_screen_pos.y + label_y_offset,
        { suffix: ' NS' }
      );
    }
    ctx.restore();
  }

  get_state() {
    const baseState = super.get_state();
    return {
      ...baseState,
      massInSuns: this.massInSuns,
      pulsar_period: this.pulsar_period,
      pulsar_phase: this.pulsar_phase,
      magnetic_field_strength: this.magnetic_field_strength,
      isPulsar: this.isPulsar,
      pulsar: this.isPulsar,
    };
  }

  set_state(s) {
    super.set_state(s);
    this.massInSuns = s.massInSuns;
    this.pulsar_period = s.pulsar_period || 1.0;
    this.pulsar_phase = s.pulsar_phase || 0;
    this.magnetic_field_strength = s.magnetic_field_strength || 0.5;
    this.isPulsar = s.isPulsar !== undefined ? s.isPulsar : true;
    this.pulsar = this.isPulsar;
  }
}

// WhiteDwarf class
class WhiteDwarf extends PhysicsObject {
  constructor(pos, vel, massInSuns = null) {
    let finalMassInSuns;
    if (massInSuns !== null) {
      finalMassInSuns = massInSuns;
    } else {
      finalMassInSuns = 0.5 + Math.random() * 0.6; // 0.5 to 1.1 solar masses
    }

    const radius = WHITE_DWARF_RADIUS;

    super(pos, vel, finalMassInSuns * SOLAR_MASS_UNIT, radius, 'WhiteDwarf');
    this.massInSuns = finalMassInSuns;
    this.temperature = 5000 + Math.random() * 15000; // 5000K to 20000K
    this.cooling_age = Math.random() * 10; // Billion years
    this.intact = true;
    this.name = getRandomName('whiteDwarfs');
  }

  getTemperatureColor() {
    // Color based on temperature
    if (this.temperature > 15000)
      return '#9BB0FF'; // Blue-white
    else if (this.temperature > 10000)
      return '#CAD7FF'; // White
    else if (this.temperature > 7500)
      return '#F8F7FF'; // Yellow-white
    else return '#FFE4B5'; // Orange-white
  }

  draw(ctx) {
    const world_pos = this.pos; // Use direct world coordinates since canvas is already transformed

    // Core with temperature-based color
    const temp_color = this.getTemperatureColor();
    ctx.fillStyle = compute_dynamic_color(
      temp_color,
      this.pos,
      bh_list,
      200.0,
      { r: 255, g: 255, b: 255 }
    );
    ctx.beginPath();
    ctx.arc(world_pos.x, world_pos.y, drawRadius(this), 0, 2 * Math.PI);
    ctx.fill();

    // Glow effect based on temperature
    if (this.radius * state.zoom > 3) {
      const glow_radius = this.radius * (1.5 + this.temperature / 20000);
      const glow_intensity = (this.temperature / 20000) * 0.4;

      const grad = ctx.createRadialGradient(
        world_pos.x,
        world_pos.y,
        this.radius,
        world_pos.x,
        world_pos.y,
        glow_radius
      );
      grad.addColorStop(0, `rgba(255, 255, 255, ${glow_intensity})`);
      grad.addColorStop(1, `rgba(255, 255, 255, 0)`);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(world_pos.x, world_pos.y, glow_radius, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Label
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const true_screen_pos = world_to_screen(world_pos);
    const screen_radius = this.radius * state.zoom;

    if (screen_radius > 3) {
      const label_y_offset = screen_radius * 2 + 12;
      ctx.font = '12px Roboto Mono';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'black';
      ctx.shadowBlur = 4;
      drawSolarLabel(
        ctx,
        formatNumber(this.massInSuns),
        true_screen_pos.x,
        true_screen_pos.y + label_y_offset,
        { suffix: ' WD' }
      );
    }
    ctx.restore();
  }

  get_state() {
    const baseState = super.get_state();
    return {
      ...baseState,
      massInSuns: this.massInSuns,
      temperature: this.temperature,
      cooling_age: this.cooling_age,
    };
  }

  set_state(s) {
    super.set_state(s);
    this.massInSuns = s.massInSuns;
    this.temperature = s.temperature || 10000;
    this.cooling_age = s.cooling_age || 1;
  }
}

// Particle object pool for memory optimization
// Visual radius of a galaxy. Drawing size only: as far as the dynamics are
// concerned a member of a cluster is a point mass, which is exactly how Zwicky
// treated them.
//
// The real ratio would put this at about 65. Coma is roughly two megaparsecs
// across and its members roughly fifty kiloparsecs, so a member is about a
// fortieth of the cluster, and the cluster scenario is 2600 units in radius. At
// that size a galaxy is thirteen pixels across at the zoom the whole cluster
// fits in, which is a dot. This is a little over twice the true proportion, for
// the same reason drawRadius enforces a minimum pixel size on everything else:
// an object nobody can see the shape of might as well not have one.
const GALAXY_RADIUS = 150;

/**
 * A galaxy, as a member of a cluster.
 *
 * Deliberately the simplest object in the file. It has a mass, a position and
 * a picture, and that is all, because the only thing any scenario asks of it is
 * to orbit in a cluster and be counted. It does not merge, accrete, collapse or
 * turn into anything else: those are all things that happen to galaxies over
 * billions of years and none of them are what a student is being asked to look
 * at here.
 *
 * The scale is a scale model, and the scenario says so. A real cluster is
 * megaparsecs across and its members are 10^11 solar masses; running those
 * numbers directly would need the whole app's unit system rebuilt around them
 * for no gain, because the quantity the lesson measures - the ratio of the mass
 * implied by the motion to the mass that is visible - is a ratio, and ratios do
 * not care what the units were.
 */
class Galaxy extends PhysicsObject {
  /**
   * @param {Object} pos - Initial position
   * @param {Object} vel - Initial velocity
   * @param {number} mass - Mass in simulation units
   * @param {string} [galaxyType] - 'spiral' or 'elliptical', for the drawing
   */
  constructor(pos, vel, mass, galaxyType = 'spiral') {
    super(pos, vel, mass, GALAXY_RADIUS, 'Galaxy');
    this.galaxyType = galaxyType;
    this.name = getRandomName('galaxies');
    // A cluster is meant to stay a cluster: a member that wanders out of the
    // view box is still a member, and culling it would quietly change the
    // dispersion the lesson is measuring.
    this.persistent = true;
    // Fixed at construction so the drawing does not spin from frame to frame.
    this.tilt = (this.id % 8) * (Math.PI / 8);
  }

  draw(ctx) {
    const { x, y } = this.pos;
    const r = drawRadius(this);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this.tilt);
    // Spirals are seen at some angle; ellipticals are round enough that
    // squashing them would just look like a spiral.
    if (this.galaxyType === 'spiral') ctx.scale(1, 0.42);

    const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    halo.addColorStop(0, 'rgba(255, 246, 224, 0.95)');
    halo.addColorStop(0.28, 'rgba(255, 220, 170, 0.55)');
    halo.addColorStop(1, 'rgba(150, 170, 255, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, 2 * Math.PI);
    ctx.fill();

    if (this.galaxyType === 'spiral') {
      ctx.strokeStyle = 'rgba(186, 210, 255, 0.45)';
      ctx.lineWidth = Math.max(0.4, r * 0.05);
      ctx.lineCap = 'round';
      for (let arm = 0; arm < 2; arm++) {
        ctx.beginPath();
        for (let t = 0.3; t <= 1.02; t += 0.04) {
          // A logarithmic spiral, which is what real arms approximate: the
          // angle grows with the log of the radius rather than with the radius.
          const a = arm * Math.PI + Math.log(t / 0.3) * 2.4;
          const rr = r * t;
          const px = rr * Math.cos(a);
          const py = rr * Math.sin(a);
          if (t === 0.3) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
    }

    // The bright core, drawn round: it is the one part of a tilted disc that
    // is not foreshortened.
    ctx.restore();
    ctx.fillStyle = 'rgba(255, 252, 238, 0.9)';
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0.6, r * 0.11), 0, 2 * Math.PI);
    ctx.fill();
  }
}

class ParticlePool {
  constructor(initialSize = 100) {
    this.pool = [];
    this.activeParticles = [];
    this.maxPoolSize = initialSize;

    // Don't pre-allocate particles to avoid initialization issues
    // They will be created as needed and pooled when they die
  }

  getParticle(
    pos,
    vel,
    lifetime = 0.8,
    start_size = 5,
    end_size = 1,
    color = 'rgb(255,255,100)'
  ) {
    let particle;
    if (this.pool.length > 0) {
      particle = this.pool.pop();
      if (particle.reset) {
        particle.reset(pos, vel, lifetime, start_size, end_size, color);
      } else {
        // Fallback for particles created before reset method was added
        if (!particle.pos) particle.pos = { x: 0, y: 0 };
        if (!particle.vel) particle.vel = { x: 0, y: 0 };
        particle.pos.x = pos.x;
        particle.pos.y = pos.y;
        particle.vel.x = vel.x;
        particle.vel.y = vel.y;
        particle.lifetime = Math.max(0.1, lifetime);
        particle.age = 0;
        particle.start_size = start_size;
        particle.end_size = end_size;
        particle.color = color;
      }
    } else {
      particle = new Particle(pos, vel, lifetime, start_size, end_size, color);
    }
    this.activeParticles.push(particle);
    return particle;
  }

  updateAndCleanup(dt) {
    for (let i = this.activeParticles.length - 1; i >= 0; i--) {
      const particle = this.activeParticles[i];
      particle.update(dt);

      if (!particle.is_alive()) {
        // Return to pool if not at max capacity
        this.activeParticles.splice(i, 1);
        if (this.pool.length < this.maxPoolSize) {
          this.pool.push(particle);
        }
        // Otherwise let it be garbage collected
      }
    }
  }

  getActiveParticles() {
    return this.activeParticles;
  }

  clear() {
    this.pool.push(...this.activeParticles);
    this.activeParticles.length = 0;
  }
}

// Global particle pool - initialize after Particle class is defined
let particlePool;

// Particle class for visual effects - optimized with reset method
class Particle {
  constructor(
    pos,
    vel,
    lifetime = 0.8,
    start_size = 5,
    end_size = 1,
    color = 'rgb(255,255,100)'
  ) {
    this.pos = { x: 0, y: 0 };
    this.vel = { x: 0, y: 0 };
    this.reset(pos, vel, lifetime, start_size, end_size, color);
  }

  reset(pos, vel, lifetime, start_size, end_size, color) {
    this.pos.x = pos.x;
    this.pos.y = pos.y;
    this.vel.x = vel.x;
    this.vel.y = vel.y;
    this.lifetime = Math.max(0.1, lifetime);
    this.age = 0;
    this.start_size = start_size;
    this.end_size = end_size;
    this.color = color;
  }

  update(dt) {
    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;
    this.age += dt;
  }

  is_alive() {
    return this.age < this.lifetime;
  }

  draw(ctx) {
    const life_fraction = this.age / this.lifetime;
    const current_size =
      this.start_size * (1 - life_fraction) + this.end_size * life_fraction;
    const alpha = 1 - life_fraction;

    if (current_size < 1 || alpha < 0.05) return;

    const world_pos = this.pos; // Use direct world coordinates since canvas is already transformed

    // Special kilonova glow effect
    if (this.kilonova_glow && this.glow_intensity) {
      const glow_size = current_size * 3 * this.glow_intensity;
      const glow_alpha = alpha * 0.3 * this.glow_intensity;

      // Draw glow
      ctx.fillStyle = this.color;
      ctx.globalAlpha = glow_alpha;
      ctx.beginPath();
      ctx.arc(world_pos.x, world_pos.y, glow_size / state.zoom, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Draw main particle
    ctx.fillStyle = this.color;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(
      world_pos.x,
      world_pos.y,
      current_size / state.zoom,
      0,
      2 * Math.PI
    );
    ctx.fill();
    ctx.globalAlpha = 1; // Reset alpha
  }
}

// Initialize particle pool after Particle class is defined
particlePool = new ParticlePool(200);

// Add missing utility functions from original
const findObjectAtPosition = worldPos => {
  // Check black holes first (they're usually the most important)
  for (const bh of bh_list) {
    const dx = worldPos.x - bh.pos.x;
    const dy = worldPos.y - bh.pos.y;
    const clickRadius = Math.max(
      bh.radius,
      CLICK_MIN_RADIUS.BlackHole / state.zoom
    );
    if (dx * dx + dy * dy < clickRadius * clickRadius) {
      return { object: bh, type: 'BlackHole' };
    }
  }

  // Check galaxies. Before stars because the only scenarios with galaxies in
  // them have nothing else, and a galaxy is the largest click target there is.
  for (const g of galaxies) {
    if (!g.alive) continue;
    const dx = worldPos.x - g.pos.x;
    const dy = worldPos.y - g.pos.y;
    const clickRadius = Math.max(
      g.radius,
      CLICK_MIN_RADIUS.Galaxy / state.zoom
    );
    if (dx * dx + dy * dy < clickRadius * clickRadius) {
      return { object: g, type: 'Galaxy' };
    }
  }

  // Check stars
  for (const star of stars) {
    if (!star.alive) continue;
    const dx = worldPos.x - star.pos.x;
    const dy = worldPos.y - star.pos.y;
    const clickRadius = Math.max(
      star.radius,
      CLICK_MIN_RADIUS.Star / state.zoom
    );
    if (dx * dx + dy * dy < clickRadius * clickRadius) {
      return { object: star, type: 'Star' };
    }
  }

  // Check neutron stars
  for (const ns of neutron_stars) {
    if (!ns.alive) continue;
    const dx = worldPos.x - ns.pos.x;
    const dy = worldPos.y - ns.pos.y;
    const clickRadius = Math.max(
      ns.radius,
      CLICK_MIN_RADIUS.NeutronStar / state.zoom
    );
    if (dx * dx + dy * dy < clickRadius * clickRadius) {
      return { object: ns, type: 'NeutronStar' };
    }
  }

  // Check white dwarfs
  for (const wd of white_dwarfs) {
    if (!wd.alive) continue;
    const dx = worldPos.x - wd.pos.x;
    const dy = worldPos.y - wd.pos.y;
    const clickRadius = Math.max(
      wd.radius,
      CLICK_MIN_RADIUS.WhiteDwarf / state.zoom
    );
    if (dx * dx + dy * dy < clickRadius * clickRadius) {
      return { object: wd, type: 'WhiteDwarf' };
    }
  }

  // Check gas giants
  for (const gasGiant of gas_giants) {
    if (!gasGiant.alive) continue;
    const dx = worldPos.x - gasGiant.pos.x;
    const dy = worldPos.y - gasGiant.pos.y;
    const clickRadius = Math.max(
      gasGiant.radius,
      CLICK_MIN_RADIUS.GasGiant / state.zoom
    );
    if (dx * dx + dy * dy < clickRadius * clickRadius) {
      return { object: gasGiant, type: 'GasGiant' };
    }
  }

  // Check planets
  for (const planet of planets) {
    if (!planet.alive) continue;
    const dx = worldPos.x - planet.pos.x;
    const dy = worldPos.y - planet.pos.y;
    const clickRadius = Math.max(
      planet.radius,
      CLICK_MIN_RADIUS.Planet / state.zoom
    );
    if (dx * dx + dy * dy < clickRadius * clickRadius) {
      return { object: planet, type: 'Planet' };
    }
  }

  // Check asteroids (including comets)
  for (const asteroid of asteroids) {
    if (!asteroid.alive) continue;
    const dx = worldPos.x - asteroid.pos.x;
    const dy = worldPos.y - asteroid.pos.y;
    const clickRadius = Math.max(
      asteroid.radius,
      CLICK_MIN_RADIUS.Asteroid / state.zoom
    );
    if (dx * dx + dy * dy < clickRadius * clickRadius) {
      // Determine if it's a comet or regular asteroid
      if (asteroid instanceof Comet) {
        return { object: asteroid, type: 'Comet' };
      } else {
        return { object: asteroid, type: 'Asteroid' };
      }
    }
  }

  return null;
};

// Comet class from original
class Comet extends PhysicsObject {
  constructor(pos, vel, massInComets = null) {
    let finalMassInComets;
    if (massInComets !== null) {
      finalMassInComets = massInComets;
    } else {
      // Comets are typically very small. Range ~0.001 to 0.1 comet masses (Halley's Comet = 1.0)
      finalMassInComets = Math.pow(10, Math.random() * 2 - 3);
    }

    const radius = ASTEROID_RADIUS * Math.pow(finalMassInComets, 0.4) * 0.8; // Comets are smaller than asteroids
    // The class has always counted in Halley masses and said so in the comment
    // above; the multiplier was a hardcoded 0.1 simulation units, which is 33
    // Earth masses rather than the 2.2e14 kg Halley actually weighs.
    const mass = finalMassInComets * HALLEY_MASS_UNIT;

    super(pos, vel, mass, radius, 'Comet');
    this.massInComets = finalMassInComets;
    this.cometType = this.calculateCometType();
    this.tailLength = Math.random() * 50 + 20; // Random tail length
    this.intact = true;
    this.name = getRandomName('comets');
  }

  calculateCometType() {
    // Determine comet type based on mass and random factors
    if (this.massInComets > 0.1) {
      return 'periodic'; // Large periodic comets like Halley's
    } else if (this.massInComets > 0.01) {
      return 'long_period'; // Long-period comets
    } else {
      return 'short_period'; // Short-period comets
    }
  }

  draw(ctx) {
    const true_screen_pos = world_to_screen(this.pos);
    const screen_radius = this.radius * state.zoom;

    ctx.save();

    // Draw comet tail (opposite to velocity direction)
    if (screen_radius > 1) {
      const speed = Math.hypot(this.vel.x, this.vel.y);
      if (speed > 0.1) {
        const tailDirection = {
          x: -this.vel.x / speed,
          y: -this.vel.y / speed,
        };
        const tailLength = Math.min(this.tailLength * state.zoom, 100);

        // Draw tail gradient
        const gradient = ctx.createLinearGradient(
          true_screen_pos.x,
          true_screen_pos.y,
          true_screen_pos.x + tailDirection.x * tailLength,
          true_screen_pos.y + tailDirection.y * tailLength
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(0.3, 'rgba(200, 255, 255, 0.6)');
        gradient.addColorStop(0.7, 'rgba(150, 200, 255, 0.3)');
        gradient.addColorStop(1, 'transparent');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(
          true_screen_pos.x,
          true_screen_pos.y,
          screen_radius * 2,
          0,
          2 * Math.PI
        );
        ctx.fill();
      }
    }

    // Draw comet nucleus
    ctx.fillStyle = '#f0f0f0';
    ctx.beginPath();
    ctx.arc(
      true_screen_pos.x,
      true_screen_pos.y,
      screen_radius,
      0,
      2 * Math.PI
    );
    ctx.fill();

    // Draw label if large enough
    if (screen_radius > 3) {
      const label_y_offset = screen_radius + 12;
      ctx.font = '10px Roboto Mono';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'black';
      ctx.shadowBlur = 2;
      ctx.fillText(
        withUnit(formatNumber(this.massInComets), 'C'),
        true_screen_pos.x,
        true_screen_pos.y + label_y_offset
      );
    }
    ctx.restore();
  }

  tidal_mass_loss(bh_list, dt) {
    if (!this.intact || !bh_list || bh_list.length === 0)
      return { debris_count: 0, fraction: 0 };
    let min_dist_sq = Infinity,
      closest_bh = null;
    for (const bh of bh_list) {
      const dx = this.pos.x - bh.pos.x;
      const dy = this.pos.y - bh.pos.y;
      const dist_sq = dx * dx + dy * dy;
      if (dist_sq < min_dist_sq) {
        min_dist_sq = dist_sq;
        closest_bh = bh;
      }
    }
    if (!closest_bh) return { debris_count: 0, fraction: 0 };

    // Comets are easily disrupted
    const tidal_threshold_sq = (closest_bh.radius * 2) ** 2;
    if (min_dist_sq < tidal_threshold_sq) {
      const min_dist = Math.sqrt(min_dist_sq);
      const tidal_threshold = Math.sqrt(tidal_threshold_sq);
      const fraction = Math.max(
        0.0,
        (tidal_threshold - min_dist) / tidal_threshold
      );

      this.mass -= this.mass * fraction * 0.1 * dt;
      let debris_count = Math.floor(fraction * 25 * dt);

      // A tenth of a Halley mass, which is what the old bare 0.01 was: a tenth
      // of the hardcoded 0.1 units a comet used to weigh. See the note on the
      // asteroid's threshold above.
      if (this.mass <= 0.1 * HALLEY_MASS_UNIT) {
        this.intact = false;
        this.alive = false;
        debris_count += 20;
      }
      return { debris_count, fraction };
    }
    return { debris_count: 0, fraction: 0 };
  }

  get_state() {
    const baseState = super.get_state();
    return {
      ...baseState,
      massInComets: this.massInComets,
      cometType: this.cometType,
      tailLength: this.tailLength,
    };
  }
  set_state(s) {
    super.set_state(s);
    this.massInComets = s.massInComets;
    this.cometType = s.cometType;
    this.tailLength = s.tailLength;
  }
}

// Handle collisions between objects
/**
 * Handle collisions between objects in the simulation
 * @param {Array} objects_list - Array of physics objects to check for collisions
 */
const handle_collisions = objects_list => {
  // Broad phase: only pairs sharing a grid neighbourhood reach the contact
  // test, instead of every pair in the list.
  forEachCandidatePair(objects_list, (obj1, obj2) => {
    {
      const dx = obj2.pos.x - obj1.pos.x;
      const dy = obj2.pos.y - obj1.pos.y;
      const dist_sq = dx * dx + dy * dy;
      const min_dist = obj1.radius + obj2.radius;

      if (dist_sq < min_dist ** 2 && dist_sq > 1e-6) {
        const dist = Math.sqrt(dist_sq);
        const overlap = min_dist - dist;
        const nx = dx / dist;
        const ny = dy / dist;

        // Separate objects
        const total_mass = obj1.mass + obj2.mass;
        const move1 = -overlap * (obj2.mass / total_mass);
        const move2 = overlap * (obj1.mass / total_mass);

        obj1.pos.x += move1 * nx;
        obj1.pos.y += move1 * ny;
        obj2.pos.x += move2 * nx;
        obj2.pos.y += move2 * ny;

        // Handle collision response
        const rvx = obj2.vel.x - obj1.vel.x;
        const rvy = obj2.vel.y - obj1.vel.y;
        const vel_normal = rvx * nx + rvy * ny;

        if (vel_normal < 0) {
          const e = 0.8; // Coefficient of restitution
          const j = (-(1 + e) * vel_normal) / (1 / obj1.mass + 1 / obj2.mass);
          const impx = j * nx;
          const impy = j * ny;

          obj1.vel.x -= impx / obj1.mass;
          obj1.vel.y -= impy / obj1.mass;
          obj2.vel.x += impx / obj2.mass;
          obj2.vel.y += impy / obj2.mass;
        }
      }
    }
  });
};

// Create kilonova explosion effect
/**
 * Create a spectacular kilonova explosion when neutron stars merge
 * @param {Object} pos - Position of the explosion
 * @param {number} mass - Combined mass of the merging neutron stars
 */
const createKilonovaExplosion = (pos, mass) => {
  // Kilonova parameters based on mass
  const massInSuns = mass / SOLAR_MASS_UNIT;
  const explosionIntensity = Math.min(2.0, massInSuns / 2.0); // Scale with mass

  // Create massive particle explosion
  const particleCount = Math.floor(200 + massInSuns * 50); // 200-400 particles based on mass

  for (let i = 0; i < particleCount; i++) {
    // Random angle and speed for explosion
    const angle = Math.random() * 2 * Math.PI;
    const speed = (Math.random() * 300 + 200) * explosionIntensity; // 200-500 speed units

    const vel = {
      x: speed * Math.cos(angle),
      y: speed * Math.sin(angle),
    };

    // Random position within explosion radius
    const radius = Math.random() * 50;
    const spawnAngle = Math.random() * 2 * Math.PI;
    const spawnPos = {
      x: pos.x + radius * Math.cos(spawnAngle),
      y: pos.y + radius * Math.sin(spawnAngle),
    };

    // Kilonova colors: bright blue-white to orange-red
    const colors = [
      'rgb(255, 255, 255)', // Pure white
      'rgb(255, 255, 200)', // Bright yellow
      'rgb(255, 200, 100)', // Orange
      'rgb(255, 150, 50)', // Bright orange
      'rgb(255, 100, 0)', // Red-orange
      'rgb(200, 100, 255)', // Purple (r-process elements)
      'rgb(100, 200, 255)', // Blue (gamma rays)
    ];

    const color = colors[Math.floor(Math.random() * colors.length)];

    // Create particle with kilonova properties
    const particle = particlePool.getParticle(
      spawnPos,
      vel,
      Math.random() * 3.0 + 2.0, // 2-5 second lifetime
      Math.random() * 15 + 10, // 10-25 start size
      Math.random() * 3 + 1, // 1-4 end size
      color
    );

    // Add special kilonova glow effect
    if (particle) {
      particle.kilonova_glow = true;
      particle.glow_intensity = Math.random() * 0.5 + 0.5;
    }
  }

  // Create gravitational wave ripple effect
  gravity_ripples.push({
    x: pos.x,
    y: pos.y,
    time: Date.now(),
    created: performance.now(),
    duration: 3000, // 3 seconds - reduced from 5 seconds
    mass: massInSuns,
    gw_strength: 0.4, // Reduced strength from 1.0 to 0.4
    kilonova: true, // Special flag for kilonova GW
  });

  // Create shockwave effect
  for (let i = 0; i < 50; i++) {
    const angle = (i / 50) * 2 * Math.PI;
    const speed = 150 + Math.random() * 100;
    const vel = {
      x: speed * Math.cos(angle),
      y: speed * Math.sin(angle),
    };

    particlePool.getParticle(
      pos,
      vel,
      Math.random() * 2.0 + 1.0, // 1-3 second lifetime
      Math.random() * 8 + 5, // 5-13 start size
      Math.random() * 2 + 1, // 1-3 end size
      'rgb(255, 255, 255)' // White shockwave
    );
  }
};

// Create smaller kilonova explosion for neutron star mergers that don't form black holes
/**
 * Create a smaller kilonova explosion when neutron stars merge but don't form a black hole
 * @param {Object} pos - Position of the explosion
 * @param {number} mass - Combined mass of the merging neutron stars
 */
const createSmallKilonovaExplosion = (pos, mass) => {
  // Kilonova parameters based on mass (reduced intensity)
  const massInSuns = mass / SOLAR_MASS_UNIT;
  const explosionIntensity = Math.min(1.0, massInSuns / 3.0); // Reduced intensity for smaller explosions

  // Create smaller particle explosion
  const particleCount = Math.floor(100 + massInSuns * 25); // 100-200 particles (half of full kilonova)

  for (let i = 0; i < particleCount; i++) {
    // Random angle and speed for explosion
    const angle = Math.random() * 2 * Math.PI;
    const speed = (Math.random() * 200 + 150) * explosionIntensity; // 150-350 speed units (reduced)

    const vel = {
      x: speed * Math.cos(angle),
      y: speed * Math.sin(angle),
    };

    // Random position within explosion radius (smaller)
    const radius = Math.random() * 30;
    const spawnAngle = Math.random() * 2 * Math.PI;
    const spawnPos = {
      x: pos.x + radius * Math.cos(spawnAngle),
      y: pos.y + radius * Math.sin(spawnAngle),
    };

    // Kilonova colors: bright blue-white to orange-red (same as full kilonova)
    const colors = [
      'rgb(255, 255, 255)', // Pure white
      'rgb(255, 255, 200)', // Bright yellow
      'rgb(255, 200, 100)', // Orange
      'rgb(255, 150, 50)', // Bright orange
      'rgb(255, 100, 0)', // Red-orange
      'rgb(200, 100, 255)', // Purple (r-process elements)
      'rgb(100, 200, 255)', // Blue (gamma rays)
    ];

    const color = colors[Math.floor(Math.random() * colors.length)];

    // Create particle with kilonova properties (smaller sizes)
    const particle = particlePool.getParticle(
      spawnPos,
      vel,
      Math.random() * 2.0 + 1.5, // 1.5-3.5 second lifetime (shorter)
      Math.random() * 10 + 6, // 6-16 start size (smaller)
      Math.random() * 2 + 1, // 1-3 end size (smaller)
      color
    );

    // Add special kilonova glow effect (reduced intensity)
    if (particle) {
      particle.kilonova_glow = true;
      particle.glow_intensity = Math.random() * 0.3 + 0.3; // Reduced glow
    }
  }

  // Create gravitational wave ripple effect (smaller)
  gravity_ripples.push({
    x: pos.x,
    y: pos.y,
    time: Date.now(),
    created: performance.now(),
    duration: 2000, // 2 seconds (shorter than full kilonova)
    mass: massInSuns,
    gw_strength: 0.2, // Reduced strength
    kilonova: true, // Special flag for kilonova GW
  });

  // Create smaller shockwave effect
  for (let i = 0; i < 25; i++) {
    // Half the shockwave particles
    const angle = (i / 25) * 2 * Math.PI;
    const speed = 100 + Math.random() * 75; // Reduced speed
    const vel = {
      x: speed * Math.cos(angle),
      y: speed * Math.sin(angle),
    };

    particlePool.getParticle(
      pos,
      vel,
      Math.random() * 1.5 + 0.8, // 0.8-2.3 second lifetime (shorter)
      Math.random() * 6 + 3, // 3-9 start size (smaller)
      Math.random() * 1.5 + 0.5, // 0.5-2 end size (smaller)
      'rgb(255, 255, 255)' // White shockwave
    );
  }
};

// Create neutron star-white dwarf merger explosion
/**
 * Create a moderate explosion when neutron star and white dwarf merge
 * @param {Object} pos - Position of the explosion
 * @param {number} mass - Combined mass of the merging objects
 */
const createNSWDExplosion = (pos, mass) => {
  const massInSuns = mass / SOLAR_MASS_UNIT;
  const explosionIntensity = Math.min(1.5, massInSuns / 1.5); // Moderate intensity

  // Create moderate particle explosion
  const particleCount = Math.floor(80 + massInSuns * 30); // 80-150 particles

  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * 2 * Math.PI;
    const speed = (Math.random() * 200 + 150) * explosionIntensity; // 150-350 speed units

    const vel = {
      x: speed * Math.cos(angle),
      y: speed * Math.sin(angle),
    };

    const radius = Math.random() * 30;
    const spawnAngle = Math.random() * 2 * Math.PI;
    const spawnPos = {
      x: pos.x + radius * Math.cos(spawnAngle),
      y: pos.y + radius * Math.sin(spawnAngle),
    };

    // NS-WD colors: white to blue-white
    const colors = [
      'rgb(255, 255, 255)', // Pure white
      'rgb(255, 255, 220)', // Bright white-yellow
      'rgb(220, 255, 255)', // Cyan-white
      'rgb(200, 220, 255)', // Blue-white
      'rgb(255, 220, 200)', // Pink-white
      'rgb(180, 200, 255)', // Light blue
    ];

    const color = colors[Math.floor(Math.random() * colors.length)];

    const particle = particlePool.getParticle(
      spawnPos,
      vel,
      Math.random() * 2.0 + 1.5, // 1.5-3.5 second lifetime
      Math.random() * 10 + 6, // 6-16 start size
      Math.random() * 2 + 1, // 1-3 end size
      color
    );

    // Add moderate glow effect
    if (particle) {
      particle.kilonova_glow = true;
      particle.glow_intensity = Math.random() * 0.3 + 0.3; // Moderate glow
    }
  }

  // Create gravitational wave ripple effect
  gravity_ripples.push({
    x: pos.x,
    y: pos.y,
    time: Date.now(),
    created: performance.now(),
    duration: 3000, // 3 seconds
    mass: massInSuns,
    gw_strength: 0.6, // Moderate strength
    nswd_merger: true, // Special flag for NS-WD merger
  });

  // Create moderate shockwave effect
  for (let i = 0; i < 25; i++) {
    const angle = (i / 25) * 2 * Math.PI;
    const speed = 120 + Math.random() * 80;
    const vel = {
      x: speed * Math.cos(angle),
      y: speed * Math.sin(angle),
    };

    particlePool.getParticle(
      pos,
      vel,
      Math.random() * 1.5 + 0.8, // 0.8-2.3 second lifetime
      Math.random() * 6 + 4, // 4-10 start size
      Math.random() * 2 + 1, // 1-3 end size
      'rgb(255, 255, 255)' // White shockwave
    );
  }
};

// Create white dwarf-white dwarf merger explosion (Type Ia supernova precursor)
/**
 * Create a smaller explosion when white dwarfs merge
 * @param {Object} pos - Position of the explosion
 * @param {number} mass - Combined mass of the merging white dwarfs
 */
const createWDWDExplosion = (pos, mass) => {
  const massInSuns = mass / SOLAR_MASS_UNIT;
  const explosionIntensity = Math.min(1.0, massInSuns / 1.0); // Smaller intensity

  // Create smaller particle explosion
  const particleCount = Math.floor(40 + massInSuns * 20); // 40-80 particles

  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * 2 * Math.PI;
    const speed = (Math.random() * 150 + 100) * explosionIntensity; // 100-250 speed units

    const vel = {
      x: speed * Math.cos(angle),
      y: speed * Math.sin(angle),
    };

    const radius = Math.random() * 20;
    const spawnAngle = Math.random() * 2 * Math.PI;
    const spawnPos = {
      x: pos.x + radius * Math.cos(spawnAngle),
      y: pos.y + radius * Math.sin(spawnAngle),
    };

    // WD-WD colors: white to yellow
    const colors = [
      'rgb(255, 255, 255)', // Pure white
      'rgb(255, 255, 240)', // Off-white
      'rgb(255, 250, 220)', // Cream
      'rgb(255, 240, 200)', // Light yellow
      'rgb(255, 230, 180)', // Pale yellow
      'rgb(240, 240, 255)', // Very light blue
    ];

    const color = colors[Math.floor(Math.random() * colors.length)];

    const particle = particlePool.getParticle(
      spawnPos,
      vel,
      Math.random() * 1.5 + 1.0, // 1-2.5 second lifetime
      Math.random() * 6 + 4, // 4-10 start size
      Math.random() * 2 + 1, // 1-3 end size
      color
    );

    // Add subtle glow effect
    if (particle) {
      particle.kilonova_glow = true;
      particle.glow_intensity = Math.random() * 0.2 + 0.2; // Subtle glow
    }
  }

  // Create gravitational wave ripple effect
  gravity_ripples.push({
    x: pos.x,
    y: pos.y,
    time: Date.now(),
    created: performance.now(),
    duration: 2000, // 2 seconds
    mass: massInSuns,
    gw_strength: 0.3, // Smaller strength
    wdwd_merger: true, // Special flag for WD-WD merger
  });

  // Create small shockwave effect
  for (let i = 0; i < 15; i++) {
    const angle = (i / 15) * 2 * Math.PI;
    const speed = 80 + Math.random() * 60;
    const vel = {
      x: speed * Math.cos(angle),
      y: speed * Math.sin(angle),
    };

    particlePool.getParticle(
      pos,
      vel,
      Math.random() * 1.0 + 0.5, // 0.5-1.5 second lifetime
      Math.random() * 4 + 3, // 3-7 start size
      Math.random() * 1 + 1, // 1-2 end size
      'rgb(255, 255, 255)' // White shockwave
    );
  }
};

/**
 * Drop objects that are no longer alive, releasing their energy history.
 * A plain `.filter(o => o.alive)` at a removal site silently orphans the
 * object's entry in the energy history map.
 * @param {Array} list - Array of physics objects
 * @returns {Array} New array containing only living objects
 */
const purgeDead = list =>
  list.filter(o => {
    if (o.alive) return true;
    clearObjectEnergyHistory(o.id);
    return false;
  });

// Handle star merging - stars combining into more massive objects
/**
 * Handle merging between stars, neutron stars, and white dwarfs
 * @param {Array} stars_list - Array of star objects to check for merging
 */
const handle_star_merging = stars_list => {
  if (!physicsSettings.enable_star_merging) return;

  let merged_this_step = true;
  while (merged_this_step && stars_list.length > 1) {
    merged_this_step = false;

    for (let i = 0; i < stars_list.length; i++) {
      const star1 = stars_list[i];
      if (!star1.alive) continue;

      for (let j = i + 1; j < stars_list.length; j++) {
        const star2 = stars_list[j];
        if (!star2.alive) continue;

        const dx = star1.pos.x - star2.pos.x;
        const dy = star1.pos.y - star2.pos.y;
        const dist_sq = dx * dx + dy * dy;
        const min_dist = star1.radius + star2.radius;

        if (dist_sq < min_dist ** 2 && dist_sq > 1e-6) {
          // These comparisons are against class names, so the build must not
          // rename the classes. esbuild would: minified, constructor.name comes
          // back as "t" and every branch below is false, which left star
          // merging, stellar collapse, tidal disruption and rocky collisions
          // dead on the deployed site while working perfectly in development.
          // build.js sets keepNames for exactly this, and the validation page's
          // three Mergers checks are what catch it if anyone turns it off.
          //
          // Not obj_type, though every class sets that to its own class name
          // too. The two are not interchangeable: a body that has been
          // transformed carries the obj_type of what it became and the class of
          // what it was, and swapping them here changed behavior enough to hang
          // the physics test suite.
          const star1_type = star1.constructor.name;
          const star2_type = star2.constructor.name;

          // Skip BH-BH pairs here; dedicated BH-BH merger runs separately
          if (star1_type === 'BlackHole' && star2_type === 'BlackHole') {
            continue;
          }

          const m1 = star1.mass;
          const m2 = star2.mass;
          const new_mass = m1 + m2;
          const new_mass_in_suns = new_mass / SOLAR_MASS_UNIT;

          // Calculate center of mass position and velocity
          const new_pos = {
            x: (star1.pos.x * m1 + star2.pos.x * m2) / new_mass,
            y: (star1.pos.y * m1 + star2.pos.y * m2) / new_mass,
          };
          const new_vel = {
            x: (star1.vel.x * m1 + star2.vel.x * m2) / new_mass,
            y: (star1.vel.y * m1 + star2.vel.y * m2) / new_mass,
          };

          // Create merger particles
          for (let k = 0; k < 20; k++) {
            const angle = Math.random() * 2 * Math.PI;
            const speed = Math.random() * 40 + 20;
            const p_vel = {
              x: speed * Math.cos(angle),
              y: speed * Math.sin(angle),
            };
            particlePool.getParticle(
              new_pos,
              p_vel,
              Math.random() * 0.8 + 0.6,
              8,
              2,
              'rgb(255, 220, 100)'
            );
          }

          // Special handling for black hole merging with regular star or white dwarf
          if (
            (star1_type === 'BlackHole' &&
              (star2_type === 'StarObject' ||
                star2_type === 'WhiteDwarf' ||
                star2_type === 'NeutronStar')) ||
            (star2_type === 'BlackHole' &&
              (star1_type === 'StarObject' ||
                star1_type === 'WhiteDwarf' ||
                star1_type === 'NeutronStar'))
          ) {
            // Find the real black hole object
            const bh =
              star1_type === 'BlackHole'
                ? star1._bh_ref || star1
                : star2._bh_ref || star2;
            const other = star1_type === 'BlackHole' ? star2 : star1;
            // Add the mass of the other object to the black hole
            const total_mass = bh.mass + other.mass;
            bh.vel.x =
              (bh.vel.x * bh.mass + other.vel.x * other.mass) / total_mass;
            bh.vel.y =
              (bh.vel.y * bh.mass + other.vel.y * other.mass) / total_mass;
            bh.mass = total_mass;
            bh.updateRadius();
            // Subtle gravitational wave effect for all such mergers
            gravity_ripples.push({
              x: bh.pos.x,
              y: bh.pos.y,
              time: Date.now(),
              created: performance.now(),
              duration: 1800,
              mass: Math.max(0.2, (total_mass / SOLAR_MASS_UNIT) * 0.25),
              gw_strength: 0.13,
            });
            // Mark only the non-BH as dead
            other.alive = false;
            // Remove the non-BH from its global list
            if (other.constructor.name === 'StarObject')
              stars = stars.filter(s => s !== other);
            if (other.constructor.name === 'WhiteDwarf')
              clearObjectEnergyHistory(other.id);
            white_dwarfs = white_dwarfs.filter(wd => wd !== other);
            if (other.constructor.name === 'NeutronStar')
              clearObjectEnergyHistory(other.id);
            neutron_stars = neutron_stars.filter(ns => ns !== other);
            // No new black hole is created, and the existing one remains in bh_list
            merged_this_step = true;
            break;
          }
          // Remove the two original stars
          star1.alive = false;
          star2.alive = false;

          // Determine what type of object to create based on mass and original types
          let new_object = null;

          // Check if either object is a neutron star or white dwarf
          const has_neutron_star =
            star1_type === 'NeutronStar' || star2_type === 'NeutronStar';
          const has_white_dwarf =
            star1_type === 'WhiteDwarf' || star2_type === 'WhiteDwarf';
          const has_regular_star =
            star1_type === 'StarObject' || star2_type === 'StarObject';

          if (has_neutron_star) {
            // Neutron star involved in merger
            const is_bh_merger =
              star1_type === 'BlackHole' || star2_type === 'BlackHole';
            if (is_bh_merger) {
              // NS-BH merger: subtle GW ripple (same as NS-NS)
              new_object = new BlackHole(new_pos, new_mass, new_vel, true);
              bh_list.push(new_object);
              clearObjectEnergyHistory(star1.id);
              clearObjectEnergyHistory(star2.id);
              neutron_stars = neutron_stars.filter(
                ns => ns !== star1 && ns !== star2
              );
              if (star1_type === 'BlackHole' && star1._bh_ref) {
                star1._bh_ref.alive = false;
                bh_list = bh_list.filter(bh => bh !== star1._bh_ref);
              }
              if (star2_type === 'BlackHole' && star2._bh_ref) {
                star2._bh_ref.alive = false;
                bh_list = bh_list.filter(bh => bh !== star2._bh_ref);
              }
              gravity_ripples.push({
                x: new_pos.x,
                y: new_pos.y,
                time: Date.now(),
                created: performance.now(),
                duration: 1200, // ms, subtle
                mass: Math.max(0.2, (new_mass / SOLAR_MASS_UNIT) * 0.18),
                gw_strength: 0.08, // subtle
              });
            } else if (new_mass_in_suns > 3.0) {
              // Exceeds Tolman-Oppenheimer-Volkoff limit -> black hole
              // Check if this is a neutron star-neutron star merger (kilonova)
              const is_ns_ns_merger =
                star1_type === 'NeutronStar' && star2_type === 'NeutronStar';

              if (is_ns_ns_merger) {
                // Create spectacular kilonova explosion for black hole formation
                createKilonovaExplosion(new_pos, new_mass);
              }

              new_object = new BlackHole(new_pos, new_mass, new_vel, true);
              bh_list.push(new_object);
              // Remove merged neutron star from global list
              clearObjectEnergyHistory(star1.id);
              clearObjectEnergyHistory(star2.id);
              neutron_stars = neutron_stars.filter(
                ns => ns !== star1 && ns !== star2
              );

              // Only add regular GW ripple if not a kilonova (kilonova creates its own)
              if (!is_ns_ns_merger) {
                gravity_ripples.push({
                  x: new_pos.x,
                  y: new_pos.y,
                  time: Date.now(),
                  created: performance.now(),
                  duration: 3000, // ms, longer and more visible for NS-BH mergers
                  mass: new_mass / SOLAR_MASS_UNIT,
                  gw_strength: 0.5, // More apparent for NS-BH merger
                });
              }
            } else {
              // Stays as neutron star
              // Check if this is a neutron star-neutron star merger (smaller kilonova)
              const is_ns_ns_merger =
                star1_type === 'NeutronStar' && star2_type === 'NeutronStar';

              if (is_ns_ns_merger) {
                // Create smaller kilonova explosion for neutron star formation
                createSmallKilonovaExplosion(new_pos, new_mass);
              } else {
                // Check if this is a neutron star-white dwarf merger
                const is_ns_wd_merger =
                  (star1_type === 'NeutronStar' &&
                    star2_type === 'WhiteDwarf') ||
                  (star1_type === 'WhiteDwarf' && star2_type === 'NeutronStar');

                if (is_ns_wd_merger) {
                  // Create neutron star-white dwarf merger explosion
                  debugLog(
                    'NS-WD merger detected in neutron star section! Mass:',
                    new_mass_in_suns,
                    'solar masses'
                  );
                  createNSWDExplosion(new_pos, new_mass);
                }
              }

              new_object = new NeutronStar(
                new_pos,
                new_vel,
                new_mass_in_suns,
                null
              );
              neutron_stars.push(new_object);
            }
          } else if (has_white_dwarf) {
            // White dwarf involved in merger
            if (new_mass_in_suns > 1.4) {
              // Exceeds Chandrasekhar limit -> neutron star
              // Check if this is a neutron star-white dwarf merger
              const is_ns_wd_merger =
                (star1_type === 'NeutronStar' && star2_type === 'WhiteDwarf') ||
                (star1_type === 'WhiteDwarf' && star2_type === 'NeutronStar');

              // Check if this is a white dwarf-white dwarf merger
              const is_wd_wd_merger =
                star1_type === 'WhiteDwarf' && star2_type === 'WhiteDwarf';

              if (is_ns_wd_merger) {
                // Create neutron star-white dwarf merger explosion
                debugLog(
                  'NS-WD merger detected! Mass:',
                  new_mass_in_suns,
                  'solar masses'
                );
                createNSWDExplosion(new_pos, new_mass);
              } else if (is_wd_wd_merger) {
                // Create white dwarf-white dwarf merger explosion (results in neutron star)
                createWDWDExplosion(new_pos, new_mass);
              }

              new_object = new NeutronStar(
                new_pos,
                new_vel,
                new_mass_in_suns,
                null
              );
              neutron_stars.push(new_object);

              // Only add regular GW ripple if not a special merger (explosion creates its own)
              if (!is_ns_wd_merger && !is_wd_wd_merger) {
                gravity_ripples.push({
                  x: new_pos.x,
                  y: new_pos.y,
                  time: Date.now(),
                  created: performance.now(),
                  duration: 1800, // ms, even shorter
                  mass: new_mass / SOLAR_MASS_UNIT,
                  gw_strength: 0.1, // WD-NS or WD-BH merger
                });
              }
            } else {
              // Stays as white dwarf (rare case when combined mass <= 1.4 solar masses)
              new_object = new WhiteDwarf(new_pos, new_vel, new_mass_in_suns);
              white_dwarfs.push(new_object);
            }
          } else if (has_regular_star) {
            // Regular star merging
            if (new_mass_in_suns > maxStarMassBeforeBH()) {
              // Exceeds maximum star mass -> black hole
              new_object = new BlackHole(new_pos, new_mass, new_vel, true);
              bh_list.push(new_object);
              gravity_ripples.push({
                x: new_pos.x,
                y: new_pos.y,
                time: Date.now(),
                created: performance.now(),
                duration: 1200, // ms, subtle
                mass: Math.max(0.2, (new_mass / SOLAR_MASS_UNIT) * 0.18),
                gw_strength: 0.08, // subtle
              });
            } else if (new_mass_in_suns > 8.0) {
              // Massive star -> neutron star
              new_object = new NeutronStar(
                new_pos,
                new_vel,
                new_mass_in_suns,
                null
              );
              neutron_stars.push(new_object);
              gravity_ripples.push({
                x: new_pos.x,
                y: new_pos.y,
                time: Date.now(),
                created: performance.now(),
                duration: 2200, // ms, shorter for smaller mergers
                mass: new_mass / SOLAR_MASS_UNIT,
                gw_strength: 0.2, // NS-NS or NS-BH merger
              });
            } else {
              // Regular star
              new_object = new StarObject(new_pos, new_vel, new_mass_in_suns);
              stars.push(new_object);
            }
          }

          merged_this_step = true;
          break;
        }
      }
      if (merged_this_step) break;
    }

    // Purge dead objects from global arrays so subsequent iterations
    // and later collision handlers never see stale references.
    stars = purgeDead(stars);
    neutron_stars = purgeDead(neutron_stars);
    white_dwarfs = purgeDead(white_dwarfs);

    // Rebuild stars_list from global lists (wrap BHs for consistent _bh_ref access)
    stars_list = [
      ...stars,
      ...neutron_stars,
      ...white_dwarfs,
      ...bh_list.map(asPhysicsObject),
    ].filter(obj => obj.alive);
  }
};

// Handle collisions between stars and smaller objects (planets, gas giants, asteroids)
/**
 * Handle stars absorbing planets, gas giants, and asteroids
 */
const handle_star_object_collisions = () => {
  // Collect all stellar objects (stars, neutron stars, white dwarfs)
  const stellar_objects = [
    ...stars.filter(s => s.alive),
    ...neutron_stars.filter(s => s.alive),
    ...white_dwarfs.filter(s => s.alive),
  ];

  // Check collisions between stellar objects and smaller objects
  for (const star of stellar_objects) {
    // Check with planets
    for (let j = 0; j < planets.length; j++) {
      const planet = planets[j];
      if (!planet.alive) continue;

      const dx = planet.pos.x - star.pos.x;
      const dy = planet.pos.y - star.pos.y;
      const dist_sq = dx * dx + dy * dy;
      const min_dist = star.radius + planet.radius;

      if (dist_sq < min_dist ** 2 && dist_sq > 1e-6) {
        // Star absorbs the planet
        star.mass += planet.mass;

        // Update star properties based on type
        if (star.constructor.name === 'NeutronStar') {
          star.massInSuns = star.mass / SOLAR_MASS_UNIT;
        } else if (star.constructor.name === 'WhiteDwarf') {
          star.massInSuns = star.mass / SOLAR_MASS_UNIT;
        } else if (star.constructor.name === 'StarObject') {
          star.massInSuns = star.mass / SOLAR_MASS_UNIT;
          // Update radius for regular stars
          star.radius = STAR_OBJ_RADIUS * Math.pow(star.massInSuns, 0.85);
        }

        // Create absorption particles
        for (let k = 0; k < 5; k++) {
          const angle = Math.random() * 2 * Math.PI;
          const speed = Math.random() * 20 + 10;
          const p_vel = {
            x: speed * Math.cos(angle),
            y: speed * Math.sin(angle),
          };
          particlePool.getParticle(
            planet.pos,
            p_vel,
            Math.random() * 0.5 + 0.3,
            4,
            1,
            'rgb(255, 200, 100)'
          );
        }

        planet.alive = false;
        broadcastImpact(star, planet, 'stellar-absorption');
      }
    }

    // Check with gas giants
    for (let j = 0; j < gas_giants.length; j++) {
      const gasGiant = gas_giants[j];
      if (!gasGiant.alive) continue;

      const dx = gasGiant.pos.x - star.pos.x;
      const dy = gasGiant.pos.y - star.pos.y;
      const dist_sq = dx * dx + dy * dy;
      const min_dist = star.radius + gasGiant.radius;

      if (dist_sq < min_dist ** 2 && dist_sq > 1e-6) {
        // Star absorbs the gas giant
        star.mass += gasGiant.mass;

        // Update star properties based on type
        if (star.constructor.name === 'NeutronStar') {
          star.massInSuns = star.mass / SOLAR_MASS_UNIT;
        } else if (star.constructor.name === 'WhiteDwarf') {
          star.massInSuns = star.mass / SOLAR_MASS_UNIT;
        } else if (star.constructor.name === 'StarObject') {
          star.massInSuns = star.mass / SOLAR_MASS_UNIT;
          // Update radius for regular stars
          star.radius = STAR_OBJ_RADIUS * Math.pow(star.massInSuns, 0.85);
        }

        // Create more dramatic absorption particles for gas giant
        for (let k = 0; k < 8; k++) {
          const angle = Math.random() * 2 * Math.PI;
          const speed = Math.random() * 30 + 15;
          const p_vel = {
            x: speed * Math.cos(angle),
            y: speed * Math.sin(angle),
          };
          particlePool.getParticle(
            gasGiant.pos,
            p_vel,
            Math.random() * 0.6 + 0.4,
            6,
            2,
            'rgb(135, 206, 235)'
          );
        }

        gasGiant.alive = false;
        broadcastImpact(star, gasGiant, 'stellar-absorption');
      }
    }

    // Check with asteroids and comets
    const smallBodies = comets.length ? asteroids.concat(comets) : asteroids;
    for (let j = 0; j < smallBodies.length; j++) {
      const asteroid = smallBodies[j];
      if (!asteroid.alive) continue;

      const dx = asteroid.pos.x - star.pos.x;
      const dy = asteroid.pos.y - star.pos.y;
      const dist_sq = dx * dx + dy * dy;
      const min_dist = star.radius + asteroid.radius;

      if (dist_sq < min_dist ** 2 && dist_sq > 1e-6) {
        // Star absorbs the asteroid/comet
        star.mass += asteroid.mass;

        // Update star properties based on type
        if (star.constructor.name === 'NeutronStar') {
          star.massInSuns = star.mass / SOLAR_MASS_UNIT;
        } else if (star.constructor.name === 'WhiteDwarf') {
          star.massInSuns = star.mass / SOLAR_MASS_UNIT;
        } else if (star.constructor.name === 'StarObject') {
          star.massInSuns = star.mass / SOLAR_MASS_UNIT;
          // Update radius for regular stars
          star.radius = STAR_OBJ_RADIUS * Math.pow(star.massInSuns, 0.85);
        }

        // Create small absorption particles
        for (let k = 0; k < 3; k++) {
          const angle = Math.random() * 2 * Math.PI;
          const speed = Math.random() * 15 + 8;
          const p_vel = {
            x: speed * Math.cos(angle),
            y: speed * Math.sin(angle),
          };
          particlePool.getParticle(
            asteroid.pos,
            p_vel,
            Math.random() * 0.4 + 0.2,
            3,
            1,
            'rgb(200, 150, 100)'
          );
        }

        asteroid.alive = false;
        broadcastImpact(star, asteroid, 'stellar-absorption');
      }
    }
  }
};

// Enhanced rocky planet collision handling
/**
 * Handle collisions between rocky planets with realistic physics
 * @param {Array} objects_list - Array of physics objects to check for collisions
 */
const ROCKY_TYPES = new Set(['Planet', 'Asteroid', 'Comet']);

const handle_rocky_collisions = objects_list => {
  // Comets are included: they are solid bodies and were previously able to fly
  // straight through planets and asteroids because this filter excluded them.
  const rocky_objects = objects_list.filter(obj =>
    ROCKY_TYPES.has(obj.constructor.name)
  );

  // This is the densest pairwise pass in the frame - the Kuiper Belt scenario
  // alone puts 300+ rocky bodies through it - so it gets the broad phase.
  forEachCandidatePair(rocky_objects, (obj1, obj2) => {
    {
      const dx = obj2.pos.x - obj1.pos.x;
      const dy = obj2.pos.y - obj1.pos.y;
      const dist_sq = dx * dx + dy * dy;
      const min_dist = obj1.radius + obj2.radius;

      if (dist_sq < min_dist ** 2 && dist_sq > 1e-6) {
        const dist = Math.sqrt(dist_sq);
        const overlap = min_dist - dist;
        const nx = dx / dist;
        const ny = dy / dist;

        // Calculate relative velocity
        const rvx = obj2.vel.x - obj1.vel.x;
        const rvy = obj2.vel.y - obj1.vel.y;
        const rel_speed = Math.sqrt(rvx * rvx + rvy * rvy);

        // High-speed collisions create debris
        if (rel_speed > 15) {
          // Create debris from collision
          const debris_count = Math.floor(rel_speed / 8) + 2;
          for (let k = 0; k < debris_count; k++) {
            const angle = Math.random() * 2 * Math.PI;
            const speed = Math.random() * rel_speed * 0.5 + 5;
            const debris_vel = {
              x: speed * Math.cos(angle) + (obj1.vel.x + obj2.vel.x) * 0.5,
              y: speed * Math.sin(angle) + (obj1.vel.y + obj2.vel.y) * 0.5,
            };
            const debris_pos = {
              x: (obj1.pos.x + obj2.pos.x) * 0.5 + (Math.random() - 0.5) * 10,
              y: (obj1.pos.y + obj2.pos.y) * 0.5 + (Math.random() - 0.5) * 10,
            };
            debris.push(new Debris(debris_pos, debris_vel));
          }

          // Both objects lose mass from collision. The reported mass has to
          // follow the simulated one: leaving massInEarths behind is how a body
          // ends up gravitating as one thing and labelled as another.
          for (const obj of [obj1, obj2]) {
            obj.mass *= 0.9;
            if (obj.massInEarths != null) obj.massInEarths *= 0.9;
            if (obj.massInJupiters != null) obj.massInJupiters *= 0.9;
            if (obj.massInSuns != null) obj.massInSuns *= 0.9;
          }

          // Create collision particles
          for (let k = 0; k < 10; k++) {
            const angle = Math.random() * 2 * Math.PI;
            const speed = Math.random() * 30 + 20;
            const p_vel = {
              x: speed * Math.cos(angle),
              y: speed * Math.sin(angle),
            };
            particlePool.getParticle(
              {
                x: (obj1.pos.x + obj2.pos.x) * 0.5,
                y: (obj1.pos.y + obj2.pos.y) * 0.5,
              },
              p_vel,
              Math.random() * 0.6 + 0.4,
              5,
              1,
              'rgb(255, 100, 50)'
            );
          }

          broadcastImpact(obj1, obj2, 'rocky-collision');
        }

        // Separate objects
        const total_mass = obj1.mass + obj2.mass;
        const move1 = -overlap * (obj2.mass / total_mass);
        const move2 = overlap * (obj1.mass / total_mass);

        obj1.pos.x += move1 * nx;
        obj1.pos.y += move1 * ny;
        obj2.pos.x += move2 * nx;
        obj2.pos.y += move2 * ny;

        // Handle collision response with more realistic coefficient
        const vel_normal = rvx * nx + rvy * ny;
        if (vel_normal < 0) {
          const e = 0.3; // Lower restitution for rocky objects
          const j = (-(1 + e) * vel_normal) / (1 / obj1.mass + 1 / obj2.mass);
          const impx = j * nx;
          const impy = j * ny;

          obj1.vel.x -= impx / obj1.mass;
          obj1.vel.y -= impy / obj1.mass;
          obj2.vel.x += impx / obj2.mass;
          obj2.vel.y += impy / obj2.mass;
        }
      }
    }
  });
};

// Check for stellar collapse into black holes
/**
 * Check if any stars have exceeded the maximum mass and convert them to black holes
 */
const check_stellar_collapse = () => {
  // Check regular stars
  for (let i = stars.length - 1; i >= 0; i--) {
    const star = stars[i];
    if (!star.alive) continue;

    const massInSuns = star.mass / SOLAR_MASS_UNIT;
    if (massInSuns > maxStarMassBeforeBH()) {
      // Convert star to black hole - mark as newly created for proper accretion disk initialization
      const new_bh = new BlackHole(star.pos, star.mass, star.vel, true);
      bh_list.push(new_bh);

      // Create collapse particles
      for (let k = 0; k < 30; k++) {
        const angle = Math.random() * 2 * Math.PI;
        const speed = Math.random() * 60 + 40;
        const p_vel = {
          x: speed * Math.cos(angle),
          y: speed * Math.sin(angle),
        };
        particlePool.getParticle(
          star.pos,
          p_vel,
          Math.random() * 1.2 + 0.8,
          12,
          3,
          'rgb(255, 255, 255)'
        );
      }

      // Remove the star
      star.alive = false;
      clearObjectEnergyHistory(star.id);
      stars.splice(i, 1);
    }
  }

  // Check neutron stars for collapse to black holes
  for (let i = neutron_stars.length - 1; i >= 0; i--) {
    const ns = neutron_stars[i];
    if (!ns.alive) continue;

    const massInSuns = ns.mass / SOLAR_MASS_UNIT;
    if (massInSuns > 3.0) {
      // Tolman-Oppenheimer-Volkoff limit
      // Convert neutron star to black hole - mark as newly created for proper accretion disk initialization
      const new_bh = new BlackHole(ns.pos, ns.mass, ns.vel, true);
      bh_list.push(new_bh);

      // Create collapse particles
      for (let k = 0; k < 25; k++) {
        const angle = Math.random() * 2 * Math.PI;
        const speed = Math.random() * 80 + 60;
        const p_vel = {
          x: speed * Math.cos(angle),
          y: speed * Math.sin(angle),
        };
        particlePool.getParticle(
          ns.pos,
          p_vel,
          Math.random() * 1.0 + 0.6,
          10,
          2,
          'rgb(200, 200, 255)'
        );
      }

      // Remove the neutron star
      ns.alive = false;
      clearObjectEnergyHistory(ns.id);
      neutron_stars.splice(i, 1);
    }
  }

  // Check white dwarfs for collapse to neutron stars
  for (let i = white_dwarfs.length - 1; i >= 0; i--) {
    const wd = white_dwarfs[i];
    if (!wd.alive) continue;

    const massInSuns = wd.mass / SOLAR_MASS_UNIT;
    if (massInSuns > 1.4) {
      // Chandrasekhar limit
      // Convert white dwarf to neutron star
      const new_ns = new NeutronStar(wd.pos, wd.vel, massInSuns, null);
      neutron_stars.push(new_ns);

      // Create collapse particles
      for (let k = 0; k < 20; k++) {
        const angle = Math.random() * 2 * Math.PI;
        const speed = Math.random() * 70 + 50;
        const p_vel = {
          x: speed * Math.cos(angle),
          y: speed * Math.sin(angle),
        };
        particlePool.getParticle(
          wd.pos,
          p_vel,
          Math.random() * 0.8 + 0.5,
          8,
          2,
          'rgb(255, 200, 200)'
        );
      }

      // Remove the white dwarf
      wd.alive = false;
      clearObjectEnergyHistory(wd.id);
      white_dwarfs.splice(i, 1);
    }
  }
};

/**
 * Gas giants sweeping up smaller bodies.
 *
 * Nothing previously handled gas giant against planet, asteroid or comet, so
 * those bodies passed through a gas giant and sat visibly inside it. A giant is
 * orders of magnitude more massive than anything in this set, so the physical
 * outcome is accretion rather than a bounce: the impactor is absorbed and the
 * giant grows.
 */
const handle_gas_giant_accretion = () => {
  if (gas_giants.length === 0) return;
  const smallBodies = [planets, asteroids, comets];

  for (const gasGiant of gas_giants) {
    if (!gasGiant.alive) continue;

    for (const list of smallBodies) {
      for (const body of list) {
        if (!body.alive) continue;

        const dx = body.pos.x - gasGiant.pos.x;
        const dy = body.pos.y - gasGiant.pos.y;
        const distSq = dx * dx + dy * dy;
        const contact = gasGiant.radius + body.radius;
        if (distSq >= contact * contact) continue;

        // Momentum is conserved through the accretion
        const total = gasGiant.mass + body.mass;
        if (total > 0) {
          gasGiant.vel.x =
            (gasGiant.vel.x * gasGiant.mass + body.vel.x * body.mass) / total;
          gasGiant.vel.y =
            (gasGiant.vel.y * gasGiant.mass + body.vel.y * body.mass) / total;
        }
        gasGiant.mass = total;
        gasGiant.massInJupiters = gasGiant.mass / JUPITER_MASS_UNIT;
        gasGiant.radius =
          GAS_GIANT_RADIUS *
          Math.pow(Math.max(0.05, gasGiant.massInJupiters), 0.3);

        // Impact plume thrown back along the approach direction
        const approach = Math.atan2(dy, dx);
        for (let k = 0; k < 8; k++) {
          const angle = approach + (Math.random() - 0.5) * 1.2;
          const speed = Math.random() * 25 + 15;
          particlePool.getParticle(
            body.pos,
            { x: speed * Math.cos(angle), y: speed * Math.sin(angle) },
            Math.random() * 0.5 + 0.3,
            4,
            1,
            'rgb(255, 190, 120)'
          );
        }

        body.alive = false;
        clearObjectEnergyHistory(body.id);
        broadcastImpact(gasGiant, body, 'gas-giant-accretion');
      }
    }
  }
};

// Handle gas giant merging and collisions
const handle_gas_giant_merging = () => {
  // Check for merging between gas giants
  let merged_this_step = true;
  while (merged_this_step && gas_giants.length > 1) {
    merged_this_step = false;

    for (let i = 0; i < gas_giants.length; i++) {
      const gasGiant1 = gas_giants[i];
      if (!gasGiant1.alive) continue;

      for (let j = i + 1; j < gas_giants.length; j++) {
        const gasGiant2 = gas_giants[j];
        if (!gasGiant2.alive) continue;

        const dx = gasGiant1.pos.x - gasGiant2.pos.x;
        const dy = gasGiant1.pos.y - gasGiant2.pos.y;
        const dist_sq = dx * dx + dy * dy;
        const min_dist = gasGiant1.radius + gasGiant2.radius;

        if (dist_sq < min_dist ** 2 && dist_sq > 1e-6) {
          const m1 = gasGiant1.mass;
          const m2 = gasGiant2.mass;
          const new_mass = m1 + m2;
          const new_mass_in_jupiters = new_mass / JUPITER_MASS_UNIT;

          // Calculate center of mass position and velocity
          const new_pos = {
            x: (gasGiant1.pos.x * m1 + gasGiant2.pos.x * m2) / new_mass,
            y: (gasGiant1.pos.y * m1 + gasGiant2.pos.y * m2) / new_mass,
          };
          const new_vel = {
            x: (gasGiant1.vel.x * m1 + gasGiant2.vel.x * m2) / new_mass,
            y: (gasGiant1.vel.y * m1 + gasGiant2.vel.y * m2) / new_mass,
          };

          // Create merger particles
          for (let k = 0; k < 15; k++) {
            const angle = Math.random() * 2 * Math.PI;
            const speed = Math.random() * 35 + 15;
            const p_vel = {
              x: speed * Math.cos(angle),
              y: speed * Math.sin(angle),
            };
            particlePool.getParticle(
              new_pos,
              p_vel,
              Math.random() * 0.7 + 0.5,
              6,
              2,
              'rgb(135, 206, 235)'
            );
          }

          // Remove the two original gas giants
          gasGiant1.alive = false;
          gasGiant2.alive = false;

          // Determine what type of object to create based on mass
          let new_object = null;

          if (new_mass_in_jupiters >= GAS_GIANT_TO_STAR_THRESHOLD) {
            // Very massive gas giant becomes a low-mass star
            const star_mass_in_suns =
              new_mass_in_jupiters / JUPITER_MASSES_PER_SOLAR_MASS;
            new_object = new StarObject(new_pos, new_vel, star_mass_in_suns);
            new_object.mass = star_mass_in_suns * SOLAR_MASS_UNIT;
            stars.push(new_object);

            // Create extra particles for star formation
            for (let k = 0; k < 10; k++) {
              const angle = Math.random() * 2 * Math.PI;
              const speed = Math.random() * 50 + 25;
              const p_vel = {
                x: speed * Math.cos(angle),
                y: speed * Math.sin(angle),
              };
              particlePool.getParticle(
                new_pos,
                p_vel,
                Math.random() * 1.0 + 0.8,
                10,
                3,
                'rgb(255, 255, 0)'
              );
            }
          } else {
            // Create a larger gas giant
            new_object = new GasGiant(new_pos, new_vel, new_mass_in_jupiters);
            gas_giants.push(new_object);
          }

          // Emit clean merge event tag (gas giant merge -> possibly star formation)
          try {
            const evt = {
              type: 'merge',
              time: performance.now(),
              primaryId: gasGiant1.id,
              secondaryId: gasGiant2.id,
              mergedMass: new_mass,
              position: { x: new_pos.x, y: new_pos.y },
            };
            if (!simulation.eventLog) simulation.eventLog = [];
            simulation.eventLog.push(evt);
            if (simulation.eventLog.length > 1000) simulation.eventLog.shift();
            if (
              typeof window !== 'undefined' &&
              window.dispatchEvent &&
              typeof window.CustomEvent === 'function'
            ) {
              window.dispatchEvent(
                new window.CustomEvent('gravitasMerge', { detail: evt })
              );
            }
          } catch {
            // no-op: event dispatch not supported in this environment
          }

          merged_this_step = true;
          break;
        }
      }
      if (merged_this_step) break;
    }

    // Filter out dead gas giants after processing all collisions
    gas_giants = purgeDead(gas_giants);
  }
};

// Public simulation object for lightweight event access
const simulation = {
  eventLog: [],
  getLatestEvents(count = 20) {
    return (this.eventLog || []).slice(-count);
  },
};

// Export classes and functions for use in other modules
export {
  PhysicsObject,
  Planet,
  GasGiant,
  Asteroid,
  Comet,
  Debris,
  BlackHole,
  StarObject,
  NeutronStar,
  WhiteDwarf,
  Galaxy,
  Particle,
  ParticlePool,
  AccretionDiskParticle,
  particlePool,
  gravitational_acceleration,
  world_to_screen,
  screen_to_world,
  is_offscreen,
  compute_dynamic_color,
  updatePhysics,
  handle_collisions,
  handle_star_merging,
  handle_star_object_collisions,
  handle_rocky_collisions,
  check_stellar_collapse,
  findObjectAtPosition,
  DT,
  SOLAR_MASS_UNIT,
  EARTH_MASS_UNIT,
  JUPITER_MASS_UNIT,
  MASS_UNIT_KG,
  INTEGRATORS,
  activeIntegrator,
  getSimulationTime,
  resetSimulationTime,
  setSimulationTime,
  absorb_into_black_hole,
  getAbsorbedSpinAngularMomentum,
  getDiscardedAbsorptionMomentum,
  resetAbsorptionAccounting,
  conservedQuantities,
  conservationDrift,
  resetConservationBaseline,
  conservationCaveats,
  gravitySourcesFor,
  accelerationBreakdown,
  syncReportedMass,
  CERES_MASS_UNIT,
  HALLEY_MASS_UNIT,
  DEBRIS_MASS_UNIT,
  ABSORB_BUFFER,
  MIN_INTERACTION_DISTANCE,
  minInteractionDistance,
  BH_RADIUS_BASE,
  PLANET_RADIUS,
  GAS_GIANT_RADIUS,
  ASTEROID_RADIUS,
  STAR_OBJ_RADIUS,
  NEUTRON_STAR_RADIUS,
  WHITE_DWARF_RADIUS,
  GALAXY_RADIUS,
  DEBRIS_RADIUS,
  MAX_STAR_MASS_BEFORE_BH,
  GAS_GIANT_TO_STAR_THRESHOLD,
  bh_list,
  planets,
  stars,
  gas_giants,
  asteroids,
  comets,
  debris,
  particles,
  gwaves,
  gravity_ripples,
  neutron_stars,
  white_dwarfs,
  galaxies,
  accretion_disk_particles,
  PhysicsObject_id_counter,
  state,
  resetPhysicsObjectCounter,
  resetTrailTick,
  getTrailTick,
  trailBudget,
  barycenterBodies,
  bumpWorldGeneration,
  setPhysicsObjectCounter,
  updatePhysicsSettings,
  getPhysicsSetting,
  setDetailScale,
  getDetailScale,
  setStateReference,
  // Energy calculation functions
  calculateKineticEnergy,
  calculateGravitationalPotentialEnergy,
  calculateTotalPotentialEnergy,
  calculateObjectEnergy,
  getAllPhysicsObjects,
  updateEnergyHistory,
  getObjectEnergyHistory,
  clearObjectEnergyHistory,
  clearEnergyHistory,
  clearAllEnergyHistory,
  getObjectEnergyStats,
  getEnergySystemMemoryStats,
  trimAllEnergyHistory,
  updateEnergySystemConfig,
  simulation,
  // Orbit preview helpers
  getMostMassiveBody,
  sampleTwoBodyOrbit,
};

// Helper: Wrap BlackHole as PhysicsObject-like for merging
function asPhysicsObject(bh) {
  return {
    pos: bh.pos,
    vel: bh.vel,
    mass: bh.mass,
    radius: bh.radius,
    alive: true,
    constructor: { name: 'BlackHole' },
    _bh_ref: bh, // Keep reference to real BlackHole
  };
}

// ===== ENERGY SYSTEM =====
// Fresh energy calculation and tracking system

// Energy system configuration
const ENERGY_SAMPLE_RATE = 10; // Sample energy every 10 frames (100ms at 60fps)
const MAX_ENERGY_HISTORY_POINTS = 5000; // Maximum data points per object to prevent memory issues
// Memory management: Uses efficient slice() instead of shift() for O(1) trimming

// ---------------------------------------------------------------------------
// Unit system
// ---------------------------------------------------------------------------
// Energies are computed in SIMULATION units first, because those are the only
// units the integrator is actually self-consistent in:
//
//   KE_sim = 1/2 * m * v^2          PE_sim = -G_sim * m1 * m2 / r
//
// Both then share a single conversion to joules, so kinetic and potential
// energy are directly comparable and their sum is meaningful.
//
// The sim fixes two anchors: mass (SOLAR_MASS_UNIT units per solar mass) and
// length (DISTANCE_UNIT_TO_M metres per unit). The time unit is not free once
// those are chosen - it is pinned by requiring the sim's own G to be the real
// G expressed in sim units:
//
//   G_sim = G_SI * M * T^2 / L^3   =>   T = sqrt(G_sim * L^3 / (G_SI * M))
//
// The energy unit follows as M * L^2 / T^2. Because T depends on G_sim, raising
// the gravitational constant genuinely shortens the simulated timescale, and
// the reported energies track that.

// MASS_UNIT_KG, up with the mass anchors, is this same conversion; it is
// declared there because the small-body mass units are derived from it.
const DISTANCE_UNIT_TO_M = AU_METERS / 100; // 1 distance unit -> m (0.01 AU)

/**
 * Seconds per simulation time unit, derived from the current gravitational
 * constant so that the mass, length and time anchors stay mutually consistent.
 * @returns {number} Seconds represented by one simulation time unit
 */
const getTimeUnitSeconds = () => {
  const G_sim = physicsSettings.gravitational_constant;
  if (!(G_sim > 0)) return 1;
  const L3 = DISTANCE_UNIT_TO_M ** 3;
  return Math.sqrt((G_sim * L3) / (G_SI * MASS_UNIT_KG));
};

/**
 * Joules represented by one simulation energy unit (M * L^2 / T^2).
 * @returns {number} Conversion factor from simulation energy units to joules
 */
const getSimEnergyToJoules = () => {
  const T = getTimeUnitSeconds();
  if (!isFinite(T) || T <= 0) return 1;
  return (MASS_UNIT_KG * DISTANCE_UNIT_TO_M ** 2) / (T * T);
};

// Energy history storage - Map of object ID to energy history array
const energyHistory = new Map();

/**
 * Calculate kinetic energy for a physics object, in simulation units
 * @param {Object} object - Physics object with mass and velocity
 * @returns {number} Kinetic energy in simulation energy units
 */
const calculateKineticEnergySim = object => {
  if (!object || !object.vel || !object.mass) return 0;
  const vSq = object.vel.x * object.vel.x + object.vel.y * object.vel.y;
  return 0.5 * object.mass * vSq;
};

/**
 * Calculate kinetic energy for a physics object
 * @param {Object} object - Physics object with mass and velocity
 * @returns {number} Kinetic energy in joules
 */
const calculateKineticEnergy = object =>
  calculateKineticEnergySim(object) * getSimEnergyToJoules();

/**
 * Calculate gravitational potential energy between two objects
 * @param {Object} obj1 - First physics object
 * @param {Object} obj2 - Second physics object
 * @param {number} distance - Distance between objects in simulation units
 * @returns {number} Gravitational potential energy in joules
 */
const calculateGravitationalPotentialEnergy = (obj1, obj2, distance) => {
  if (!obj1 || !obj2 || distance <= 0) return 0;
  return (
    calculateGravitationalPotentialEnergySim(obj1, obj2, distance) *
    getSimEnergyToJoules()
  );
};

/**
 * Gravitational potential energy of a pair, in simulation units
 * @param {Object} obj1 - First physics object
 * @param {Object} obj2 - Second physics object
 * @param {number} distance - Distance between objects in simulation units
 * @returns {number} Pair potential energy in simulation energy units
 */
const calculateGravitationalPotentialEnergySim = (obj1, obj2, distance) => {
  if (!obj1 || !obj2 || distance <= 0) return 0;
  // Match the softening the integrator uses so the reported potential cannot
  // diverge for objects that are effectively on top of each other.
  const r = Math.max(distance, minInteractionDistance());
  const G_sim = physicsSettings.gravitational_constant;
  return (-G_sim * obj1.mass * obj2.mass) / r;
};

/**
 * Calculate total gravitational potential energy for an object relative to all other objects
 * @param {Object} object - Physics object to calculate potential energy for
 * @param {Array} allObjects - Array of all physics objects
 * @returns {number} Total gravitational potential energy in joules
 */
const calculateTotalPotentialEnergy = (object, allObjects) =>
  calculateTotalPotentialEnergySim(object, allObjects) * getSimEnergyToJoules();

/**
 * Total gravitational potential energy of an object, in simulation units
 * @param {Object} object - Physics object to calculate potential energy for
 * @param {Array} allObjects - Array of all physics objects
 * @returns {number} Total potential energy in simulation energy units
 */
const calculateTotalPotentialEnergySim = (object, allObjects) => {
  if (!object) return 0;

  // Optimization: reuse the potential the Barnes-Hut worker already computed.
  // cached_phi is the potential per unit mass in simulation units, so the
  // object's potential energy is simply phi * m. Only trusted while the worker
  // path is actually running - see clearCachedGravity().
  if (isBarnesHutActive() && typeof object.cached_phi === 'number') {
    return object.cached_phi * object.mass;
  }

  if (!allObjects || allObjects.length === 0) return 0;

  let totalPotentialEnergy = 0;

  for (const otherObject of allObjects) {
    if (!otherObject || otherObject.id === object.id) continue;

    const dx = object.pos.x - otherObject.pos.x;
    const dy = object.pos.y - otherObject.pos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 0) {
      totalPotentialEnergy += calculateGravitationalPotentialEnergySim(
        object,
        otherObject,
        distance
      );
    }
  }

  return totalPotentialEnergy;
};

/**
 * Calculate total energy (kinetic + potential) for an object
 * @param {Object} object - Physics object
 * @param {number} timestamp - Current timestamp
 * @returns {Object} Energy data object with timestamp, ke, pe, total
 */
const calculateObjectEnergy = (object, timestamp, allObjects) => {
  if (!object) {
    return {
      timestamp: timestamp || performance.now(),
      ke: 0,
      pe: 0,
      total: 0,
    };
  }

  // Both terms are computed in simulation units and converted with the same
  // factor, so ke + pe is a real total energy: it stays flat for a stable
  // orbit, drifts when an orbit decays, and crosses zero on ejection.
  const toJoules = getSimEnergyToJoules();
  const ke = calculateKineticEnergySim(object) * toJoules;
  const pe =
    calculateTotalPotentialEnergySim(
      object,
      allObjects || getAllPhysicsObjects()
    ) * toJoules;

  return {
    timestamp: timestamp || performance.now(),
    ke,
    pe,
    total: ke + pe,
  };
};

/**
 * Get all physics objects as a flat array, excluding debris and particles
 * @returns {Array} Array of all physics objects
 */
const getAllPhysicsObjects = () => {
  return [
    ...bh_list,
    ...planets,
    ...stars,
    ...gas_giants,
    ...asteroids,
    ...comets,
    ...neutron_stars,
    ...white_dwarfs,
  ].filter(obj => obj && obj.alive !== false);
};

/**
 * Update energy history for all objects
 * Called during the physics update loop at specified intervals
 */
const updateEnergyHistory = () => {
  const allObjects = getAllPhysicsObjects();

  if (allObjects.length === 0) return;

  const timestamp = performance.now();

  for (const object of allObjects) {
    // NB: ids start at 0, so this must be a null check rather than a
    // truthiness check - otherwise the first object ever created is skipped.
    if (!object || object.id === undefined || object.id === null) continue;

    // Initialize energy history for new objects
    if (!energyHistory.has(object.id)) {
      energyHistory.set(object.id, []);
    }

    const history = energyHistory.get(object.id);
    // Pass the object list down: recomputing it per object turns this loop
    // into O(N^2) allocations on top of the O(N^2) potential sum.
    const energy = calculateObjectEnergy(object, timestamp, allObjects);

    // Add new energy data point
    history.push(energy);

    // Maintain data size limit - keep only the most recent entries
    if (history.length > MAX_ENERGY_HISTORY_POINTS) {
      // Use slice to keep only the most recent MAX_ENERGY_HISTORY_POINTS entries
      // This is more efficient than shift() for large arrays
      const startIndex = history.length - MAX_ENERGY_HISTORY_POINTS;
      const trimmedHistory = history.slice(startIndex);
      energyHistory.set(object.id, trimmedHistory);
    }
  }

  // Debug logging (only every 100 frames to avoid spam)
  if (state && state.frame_count % 100 === 0 && allObjects.length > 0) {
    const firstObject = allObjects[0];
    const firstObjectHistory = energyHistory.get(firstObject.id);
    if (firstObjectHistory && firstObjectHistory.length > 0) {
      const latest = firstObjectHistory[firstObjectHistory.length - 1];
      debugLog(`Energy data for object ${firstObject.id}:`, {
        ke: latest.ke.toExponential(2),
        pe: latest.pe.toExponential(2),
        total: latest.total.toExponential(2),
        dataPoints: firstObjectHistory.length,
      });
    }
  }

  // Periodic memory management (every 1000 frames)
  if (state && state.frame_count % 1000 === 0) {
    const memoryStats = getEnergySystemMemoryStats();

    // Log memory usage every 1000 frames
    debugLog('Energy system memory usage:', {
      objects: memoryStats.totalObjects,
      dataPoints: memoryStats.totalDataPoints,
      memoryMB: memoryStats.totalMemoryEstimateMB,
      avgPointsPerObject: memoryStats.averageDataPointsPerObject,
    });

    // If memory usage is high (>50MB), trim all histories
    if (memoryStats.totalMemoryEstimateMB > 50) {
      debugLog('High memory usage detected, trimming energy histories...');
      const trimmedCount = trimAllEnergyHistory();
      debugLog(
        `Trimmed ${trimmedCount} energy histories to reduce memory usage`
      );
    }
  }
};

/**
 * Get energy history for a specific object
 * @param {string|number} objectId - ID of the object
 * @returns {Array} Copy of the energy history array for the object
 */
const getObjectEnergyHistory = objectId => {
  // ids start at 0 - a truthiness check here hides the first object created
  if (objectId === undefined || objectId === null) return [];
  const history = energyHistory.get(objectId);
  return history ? [...history] : [];
};

/**
 * Clear energy history for a specific object
 * This function should be called when:
 * - An object's mass changes (energy calculations depend on mass)
 * - An object is removed from the simulation
 * - The simulation is reset
 * - Object transformation occurs (e.g., star to black hole)
 *
 * @param {string|number} objectId - ID of the object
 */
const clearObjectEnergyHistory = objectId => {
  if (objectId !== undefined && objectId !== null) {
    energyHistory.delete(objectId);
  }
};

/**
 * Clear energy history for a specific object (alias for consistency)
 * @param {string|number} objectId - ID of the object
 */
const clearEnergyHistory = objectId => {
  clearObjectEnergyHistory(objectId);
};

/**
 * Clear all energy history
 */
const clearAllEnergyHistory = () => {
  energyHistory.clear();
};

/**
 * Get energy statistics for an object
 * @param {string|number} objectId - ID of the object
 * @returns {Object} Energy statistics object
 */
const getObjectEnergyStats = objectId => {
  const data = getObjectEnergyHistory(objectId);
  if (data.length === 0) {
    return {
      latest: null,
      average: { ke: 0, pe: 0, total: 0 },
      min: { ke: 0, pe: 0, total: 0 },
      max: { ke: 0, pe: 0, total: 0 },
      dataPoints: 0,
    };
  }

  const latest = data[data.length - 1];
  const keValues = data.map(d => d.ke);
  const peValues = data.map(d => d.pe);
  const totalValues = data.map(d => d.total);

  return {
    latest,
    average: {
      ke: keValues.reduce((a, b) => a + b, 0) / data.length,
      pe: peValues.reduce((a, b) => a + b, 0) / data.length,
      total: totalValues.reduce((a, b) => a + b, 0) / data.length,
    },
    min: {
      ke: Math.min(...keValues),
      pe: Math.min(...peValues),
      total: Math.min(...totalValues),
    },
    max: {
      ke: Math.max(...keValues),
      pe: Math.max(...peValues),
      total: Math.max(...totalValues),
    },
    dataPoints: data.length,
  };
};

/**
 * Get energy system memory usage statistics
 * @returns {Object} Memory usage statistics
 */
const getEnergySystemMemoryStats = () => {
  const totalObjects = energyHistory.size;
  let totalDataPoints = 0;
  let totalMemoryEstimate = 0;

  // Estimate memory usage (rough calculation)
  // Each energy data point contains: timestamp (8 bytes) + ke (8 bytes) + pe (8 bytes) + total (8 bytes) = ~32 bytes
  const bytesPerDataPoint = 32;

  for (const [, history] of energyHistory) {
    totalDataPoints += history.length;
  }

  totalMemoryEstimate = totalDataPoints * bytesPerDataPoint;

  return {
    totalObjects,
    totalDataPoints,
    totalMemoryEstimateBytes: totalMemoryEstimate,
    totalMemoryEstimateKB: Math.round((totalMemoryEstimate / 1024) * 100) / 100,
    totalMemoryEstimateMB:
      Math.round((totalMemoryEstimate / (1024 * 1024)) * 100) / 100,
    averageDataPointsPerObject:
      totalObjects > 0 ? Math.round(totalDataPoints / totalObjects) : 0,
    maxDataPointsPerObject: MAX_ENERGY_HISTORY_POINTS,
  };
};

/**
 * Update energy system configuration
 * @param {Object} config - Configuration object
 * @param {number} config.maxHistoryPoints - Maximum data points per object
 * @param {number} config.sampleRate - Energy sampling rate (frames)
 */
const updateEnergySystemConfig = config => {
  if (config.maxHistoryPoints !== undefined) {
    const oldMax = MAX_ENERGY_HISTORY_POINTS;
    // Note: We can't reassign const, so we'll use the new value in trimAllEnergyHistory
    debugLog(
      `Energy history limit changed from ${oldMax} to ${config.maxHistoryPoints} points per object`
    );

    // Trim existing histories to new limit
    if (config.maxHistoryPoints < oldMax) {
      trimAllEnergyHistory(config.maxHistoryPoints);
    }
  }

  if (config.sampleRate !== undefined) {
    debugLog(
      `Energy sampling rate changed from ${ENERGY_SAMPLE_RATE} to ${config.sampleRate} frames`
    );
  }

  return {
    maxHistoryPoints: config.maxHistoryPoints || MAX_ENERGY_HISTORY_POINTS,
    sampleRate: config.sampleRate || ENERGY_SAMPLE_RATE,
  };
};

/**
 * Trim energy history for all objects to reduce memory usage
 * @param {number} maxPoints - Maximum data points to keep per object (defaults to MAX_ENERGY_HISTORY_POINTS)
 */
const trimAllEnergyHistory = (maxPoints = MAX_ENERGY_HISTORY_POINTS) => {
  let trimmedCount = 0;

  for (const [objectId, history] of energyHistory) {
    if (history.length > maxPoints) {
      const startIndex = history.length - maxPoints;
      const trimmedHistory = history.slice(startIndex);
      energyHistory.set(objectId, trimmedHistory);
      trimmedCount++;
    }
  }

  if (trimmedCount > 0) {
    debugLog(
      `Trimmed energy history for ${trimmedCount} objects to ${maxPoints} data points each`
    );
  }

  return trimmedCount;
};
