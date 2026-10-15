// Import utility functions
import {
  JUPITER_MASSES_PER_SOLAR_MASS,
  CERES_MASS_KG,
  HALLEY_MASS_KG,
  DEBRIS_FRAGMENT_MASS_KG,
  SOLAR_MASS_UNIT,
  EARTH_MASS_UNIT,
} from './constants.js';
import { SPACE_OBJECT_NAMES } from './names.js';
import {
  debugLog,
  hexToRgb,
  worldToScreen,
  screenToWorld,
  isOffscreen,
} from './utils.js';
import { recordBarycenter } from './referenceFrame.js';
import { haloAcceleration } from './darkMatter.js';
import { a0InSimUnits, mondVector } from './mond.js';
import { ENVIRONMENT, createAppearance } from './blackHole/appearance.js';
import { followCamera, resetFollowCamera } from './followCamera.js';
// The drawing policy, as far as the engine reads it (tests/bodyVisuals.test.js).
import {
  visualSeed,
  hitRadius,
  DISPLAY_MIN_PX,
  hasRingsForSeed,
  ringGeometryFor,
} from './bodyVisuals.js';
// Re-exported for the drawers: the engine still reaching these keeps the build's
// chunk groups, and every route's request count, as they were.
export { currentTier } from './quality.js';
export { stellarPropertiesFor } from './habitability.js';
// The state the rest of the engine reads (D-DECOMP-18, slice S1). The names the
// facade used to export are re-exported below, live, so no importer changes.
import {
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
  setBodyList,
  PhysicsObject_id_counter,
  nextPhysicsObjectId,
  resetPhysicsObjectCounter,
  setPhysicsObjectCounter,
  state,
  setStateReference,
  registerBodyDrawers,
  paintBody,
  particlePool,
  effectLooks,
  tracerColor,
  registerEffects,
  physicsSettings,
  updatePhysicsSettings,
  getPhysicsSetting,
  simulationTime,
  getSimulationTime,
  resetSimulationTime,
  setSimulationTime,
  advanceSimulationTime,
  liveBodyCount,
  setLiveBodyCount,
  setDetailScale,
  getDetailScale,
  trailTick,
  getTrailTick,
  resetTrailTick,
  advanceTrailTick,
  trailBudget,
  worldGeneration,
  bumpWorldGeneration,
  MIN_INTERACTION_DISTANCE,
  minInteractionDistance,
  MASS_UNIT_KG,
  INTEGRATORS,
  activeIntegrator,
  setWorkerFailed,
  isBarnesHutActive,
} from './engine/state.js';
// Conservation and energy (slice S3), re-exported live below.
import {
  ENERGY_SAMPLE_RATE,
  bankAbsorbedSpin,
  bankDiscardedMomentum,
  clearObjectEnergyHistory,
  clearEnergyHistory,
  updateEnergyHistory,
} from './engine/conservation.js';
// The events and the step listeners (slice S2), re-exported live.
import {
  broadcastImpact,
  announceWorkerFailed,
  announceMerge,
  runStepListeners,
} from './engine/events.js';
export { simulation, onPhysicsStep } from './engine/events.js';
export {
  getWorldGeneration,
  getInterventionEpoch,
  noteIntervention,
} from './engine/state.js';

/**
 * Pick a random display name for a new object of the given type.
 *
 * The pools used to be written out again here, all 355 of them, byte for byte
 * identical to js/names.js. Two copies of a table is one copy too
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
// SOLAR_MASS_UNIT and EARTH_MASS_UNIT are imported from js/constants.js and
// re-exported below, so that everything that used to read them from here still
// can. They moved because js/units.js needed them and had to import the whole
// engine to get at two numbers.
//
// EARTH_MASS_UNIT is derived from the solar mass for the same reason
// JUPITER_MASS_UNIT is, and it had the same failure: it was a literal 3, which
// is 1000x too heavy. A body built as "1 Earth mass" weighed a thousandth of
// the Sun, and formatMass divided by the same 3 to print "1 M_E" back, so the
// number on screen agreed with itself and disagreed with physics.
//
// Two scenarios had already noticed and patched around it locally with a
// SOLAR_SYSTEM_MASS_SCALE of 0.001, which is exactly the error. Those patches
// are gone; the constant is right instead.
const ABSORB_BUFFER = 6;
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
 * The radius a newly placed body of each type is built with.
 *
 * Exported so the placement preview can draw a marker the size of the thing it
 * is promising, at the level of detail the renderer would use for it. Reading
 * the constants is the only way to be sure the two agree: constructing a
 * throwaway body to measure would draw a name out of the seeded generator and
 * make the world depend on how many times somebody hovered the canvas.
 */
export const NOMINAL_RADIUS = Object.freeze({
  Star: STAR_OBJ_RADIUS,
  Planet: PLANET_RADIUS,
  GasGiant: GAS_GIANT_RADIUS,
  Asteroid: ASTEROID_RADIUS,
  Comet: ASTEROID_RADIUS * 0.8,
  WhiteDwarf: WHITE_DWARF_RADIUS,
  NeutronStar: NEUTRON_STAR_RADIUS,
  BlackHole: BH_RADIUS_BASE,
});

/**
 * The mass at which a star collapses to a black hole, in solar masses.
 *
 * A setting rather than the bare constant, because `max_star_mass_before_bh`
 * has been in DEFAULT_SETTINGS and written by two scenarios since before this
 * function existed, and nothing read it: the threshold was always the literal
 * above, whatever a scenario asked for. Both scenarios happen to ask for 20,
 * which is why nobody noticed, and which is also why wiring it up changes no
 * present behavior.
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
// "1.00 M_J" in the inspector pulled on its neighbors with 52 Jupiter masses,
// a twentieth of a star. Nothing in the display was wrong about the mass it was
// given; the mass it was given was wrong about Jupiter.
const JUPITER_MASS_UNIT = SOLAR_MASS_UNIT / JUPITER_MASSES_PER_SOLAR_MASS;

// Simulation mass units per Ceres mass, per Halley mass, and per kilometer-scale
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
const canvas = (typeof document !== 'undefined' &&
  document.getElementById('simulationCanvas')) || {
  width: 0,
  height: 0,
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
let workerSentAt = 0;

// A dead or silent worker left workerBusy set, and every pull went stale.
const failPhysicsWorker = why => {
  console.error(`Physics Worker ${why}; summing gravity on the main thread`);
  physicsWorker?.terminate();
  physicsWorker = null;
  setWorkerFailed(why);
  workerBusy = false;
  workerJobObjects = [];
  announceWorkerFailed();
};

// The thirteen bursts: count, speed (range, floor) and lifetime (range, floor).
// One draw for the direction, one for the speed, then one for the lifetime, in
// that order, count times; a plume (`aim`) draws its direction within 0.6 of the
// aim, and a null color (an absorbed body with no usable color) draws the first
// two and spawns nothing, as the absorption burst always did.
const BURSTS = {
  absorb: { n: 15, v: [50, 30], t: [0.6, 0.4] },
  tracer: { n: 6, v: [60, 40], t: [1.2, 0.8] },
  starMerge: { n: 20, v: [40, 20], t: [0.8, 0.6] },
  starPlanet: { n: 5, v: [20, 10], t: [0.5, 0.3] },
  starGas: { n: 8, v: [30, 15], t: [0.6, 0.4] },
  starAsteroid: { n: 3, v: [15, 8], t: [0.4, 0.2] },
  rocky: { n: 10, v: [30, 20], t: [0.6, 0.4] },
  collapseStar: { n: 30, v: [60, 40], t: [1.2, 0.8] },
  collapseNS: { n: 25, v: [80, 60], t: [1.0, 0.6] },
  collapseWD: { n: 20, v: [70, 50], t: [0.8, 0.5] },
  gasAccretion: { n: 8, v: [25, 15], t: [0.5, 0.3] },
  gasMerge: { n: 15, v: [35, 15], t: [0.7, 0.5] },
  gasStar: { n: 10, v: [50, 25], t: [1.0, 0.8] },
};
const NO_LOOK = {};
const burst = (name, pos, color, aim) => {
  const { n, v, t } = BURSTS[name];
  const look = effectLooks[name] || NO_LOOK;
  for (let k = 0; k < n; k++) {
    const angle =
      aim === undefined
        ? Math.random() * 2 * Math.PI
        : aim + (Math.random() - 0.5) * 1.2;
    const speed = Math.random() * v[0] + v[1];
    if (color === null) continue;
    particlePool.getParticle(
      pos,
      { x: speed * Math.cos(angle), y: speed * Math.sin(angle) },
      Math.random() * t[0] + t[1],
      look.start,
      look.end,
      color === undefined ? look.color : color
    );
  }
};

/**
 * An appearance for a black hole that has not got one.
 *
 * Old saves and any object built before appearances existed. Deterministic
 * from the id, so restoring the same save twice draws the same picture, and
 * quiescent, because a hole whose environment nobody stated has not been said
 * to be accreting.
 *
 * @param {number} id - The object's id
 * @returns {object} An appearance
 */
const defaultAppearance = id =>
  createAppearance({
    seed: `bh:${id}`,
    positionAngleDeg: (id * 47) % 360,
    spin: id % 2 === 0 ? 1 : -1,
    environment: ENVIRONMENT.QUIESCENT,
  });

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
// Total mass, total linear momentum and the system's center of mass are then
// all exactly preserved across the event. Kinetic energy is not, and is not
// meant to be: an inelastic merger is where the energy goes.
//
// What is NOT preserved, and cannot be
// -----------------------------------------------------------------------------
// Total angular momentum splits into the motion of the center of mass and the
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
      bankDiscardedMomentum(m2 * body.vel.x, m2 * body.vel.y);
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
    bankAbsorbedSpin(spin);
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
// What happens when two bodies become one
// -----------------------------------------------------------------------------
// Three families of merger in this engine decide different things and then do
// the same bookkeeping:
//
//   BH-BH                 always a black hole
//   gas giant + gas giant a bigger gas giant, or a star above the ignition
//                         threshold
//   star / remnant        nine branches: star+star, WD+WD, NS+NS, the mixed
//                         remnants, and star+BH, choosing between a star, a
//                         white dwarf, a neutron star and a black hole
//
// The decision is physics and stays in its branch. The bookkeeping is not, and
// it had been written out three times - twice with an event and once, in the
// richest family of the three, without one. Every consumer of `gravitasMerge`
// is a continuity handler: js/ui.js moves an object reference frame onto the
// result and re-opens the inspector on it, because the product can be a
// different kind of body from either progenitor. A star that merged while the
// reader was following it emitted nothing, so there was nothing to move to and
// the view fell back to the world origin - the exact failure
// e2e/cameraStability.spec.js exists to catch, in the one path that never fired
// the event it watches for.
//
// Where the boundary is, and why absorption is on the other side of it
// -----------------------------------------------------------------------------
// `absorb_into_black_hole` above is not a merger and is deliberately not routed
// through this, and the line is about what is worth announcing rather than
// about arithmetic.
//
// An announced merger is a state transition a reader could be watching: two
// star-class bodies become one, it is rare, and something holding one of them
// needs to be told what to hold instead. Absorption is the opposite on every
// count. It is a planet, an asteroid or a comet falling into a hole that keeps
// its own identity; it is not rare - Stellar Graveyard absorbs 98 per cent of
// its mass within a few seconds - and announcing each one would flood a
// thousand-entry event log and fire the audio layer's bass drop hundreds of
// times in a row. Gas-giant accretion is the same shape and stays outside for
// the same reason.
//
// The one case that sits on the line is a star, white dwarf or neutron star
// falling into a black hole. It is handled inside handle_star_merging, it
// emits a gravitational-wave ripple, and the hole survives as the result - so
// it is announced, with the surviving hole as the result id, and the loop
// above declines to retire a progenitor that is also the result. A reader
// following the star then follows the hole its mass is now inside, which is
// the honest continuation; the alternative is the view falling back to the
// world origin.
//
// This does bookkeeping, not arithmetic. `mergedState` below is offered to the
// branches whose product genuinely is the mass-weighted mean, and the branches
// that compute something else - a merger that shed mass, a remnant whose radius
// follows its own rule - keep computing it. Centralising the arithmetic as well
// would be a physics change wearing a refactor's clothes.
// =============================================================================

/**
 * The mass, position and velocity of a perfectly inelastic merger.
 *
 * Total mass, mass-weighted center of mass, and the velocity that conserves
 * linear momentum. Offered rather than imposed: see the note above.
 *
 * @param {object} a - One progenitor
 * @param {object} b - The other
 * @returns {{mass: number, pos: {x: number, y: number}, vel: {x: number, y: number}}} The product's state
 */
const mergedState = (a, b) => {
  const m1 = Number.isFinite(a?.mass) ? a.mass : 0;
  const m2 = Number.isFinite(b?.mass) ? b.mass : 0;
  const mass = m1 + m2;
  if (!(mass > 0)) {
    return { mass: 0, pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 } };
  }
  return {
    mass,
    pos: {
      x: (a.pos.x * m1 + b.pos.x * m2) / mass,
      y: (a.pos.y * m1 + b.pos.y * m2) / mass,
    },
    vel: {
      x: (a.vel.x * m1 + b.vel.x * m2) / mass,
      y: (a.vel.y * m1 + b.vel.y * m2) / mass,
    },
  };
};

/**
 * Whether these two may merge at all.
 *
 * A body a prescribed model owns is not the integrator's to evolve, and merging
 * is evolution. A lesson that stands a binary on the canvas draws its
 * components as fixed-size markers and moves them to the separation the
 * waveform is plotted from, so they spend most of an inspiral inside each
 * other's drawn radius - without this the engine merged them into one randomly
 * named black hole a second after the lesson opened, on every step, in both
 * gravitational-wave lessons.
 *
 * @param {object} a - One progenitor
 * @param {object} b - The other
 * @returns {boolean} True when the engine owns both
 */
const mergeAllowed = (a, b) => !a?.model_owned && !b?.model_owned;

/**
 * Retire two progenitors into one result, and say so exactly once.
 *
 * @param {object} a - The first progenitor
 * @param {object} b - The second
 * @param {?object} result - What replaced them; null when the pair annihilated
 * @param {object} [opts] - Options
 * @param {Function} [opts.remove] - Removes a progenitor from its collection.
 *   The default marks it not alive, which is what `purgeDead` and the step's
 *   own `filterAndClearEnergy` sweep act on; callers that splice their own list
 *   pass their own and take responsibility for the history.
 * @returns {?object} The event detail that was dispatched, or null
 */
const completeMerger = (a, b, result, { remove } = {}) => {
  if (!a || !b) return null;

  // Both are gone whatever happened, and their energy history goes with them.
  // `purgeDead` clears history for anything it filters out, so the default
  // path is covered; clearing here as well is idempotent and keeps a caller
  // that splices from leaking.
  for (const body of [a, b]) {
    // One family of merger keeps one of its progenitors: a star falling into a
    // black hole leaves the hole heavier and still itself, and the hole is the
    // result. Retiring it here would kill the thing that survived.
    if (body === result) continue;
    body.alive = false;
    if (typeof remove === 'function') remove(body);
    clearObjectEnergyHistory(body.id);
  }

  const detail = {
    type: 'merge',
    // Wall-clock, kept because the audio layer's bass drop is a wall-clock
    // effect and reads it. It is not the simulation's clock and never was.
    time: performance.now(),
    // The simulation's own clock, which is what a reader's timeline, a
    // recording and an exported measurement are all indexed by. In sim units,
    // measured from the moment the world was built.
    simTime: getSimulationTime(),
    simTimeUnits: 'sim',
    primaryId: a.id,
    secondaryId: b.id,
    resultId: result ? result.id : null,
    // Body kinds (the class names, set below), which the merger branches
    // decide on; the minifier cannot rename them.
    //
    // `resultObjType` is separate and is not a synonym: a transformed body
    // carries the obj_type of what it became and the class of what it was, and
    // js/ui.js renders the inspector by obj_type. Both are here so that no
    // consumer has to guess which one it wanted.
    types: {
      primary: a.kind ?? null,
      secondary: b.kind ?? null,
      result: result ? (result.kind ?? null) : null,
      resultObjType: result ? (result.obj_type ?? null) : null,
    },
    masses: {
      primary: Number.isFinite(a.mass) ? a.mass : null,
      secondary: Number.isFinite(b.mass) ? b.mass : null,
      // What the product actually came out at, which is not always the sum:
      // a gas-giant pair that ignites, and the remnant branches that shed
      // mass, both end lighter than m1 + m2.
      result: result && Number.isFinite(result.mass) ? result.mass : null,
      units: 'sim',
    },
    // Kept for the consumers that already read it.
    mergedMass: result && Number.isFinite(result.mass) ? result.mass : null,
    position: result ? { x: result.pos.x, y: result.pos.y } : null,
    velocity: result ? { x: result.vel.x, y: result.vel.y } : null,
    // Neither progenitor was model-owned or this would not have run, so the
    // product is the integrator's. Carried explicitly because a consumer
    // should not have to infer provenance from the absence of a refusal.
    modelOwned: Boolean(result?.model_owned),
    engineOwned: !result?.model_owned,
  };

  announceMerge(detail);

  return detail;
};

/**
 * Bring a body's reported mass back into agreement with its actual one.
 *
 * Every class carries its mass twice: once as `mass`, in simulation units,
 * which is what gravity uses, and once in the unit the class is built and
 * displayed in - Earth masses, Jupiter masses, solar masses, Ceres masses,
 * Halley masses, fragments. Any code that writes `mass` and leaves the other
 * one behind produces a body that gravitates as one thing and is labeled as
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
      type: s.obj_type || s.kind || 'source',
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

  // Under MOND there is no extra field to draw: the same sources act, harder.
  // So the breakdown reports the boost and scales the total, and the arrows for
  // the individual sources stay Newtonian - which is honest, because that is
  // what they are. The residual line below then shows the difference the law
  // makes, rather than hiding it in a component that does not exist.
  const mondA0 = activeMondA0();
  const boosted =
    mondA0 > 0 ? mondVector(sx + field.ax, sy + field.ay, mondA0) : null;

  // `total` is evaluated at the body's position now, which is where the arrow
  // is drawn from, so the components add up to it exactly. `stepped` is what
  // the integrator used on the last step, taken from the position the body was
  // at before it moved; the two agree to one step's worth of change, and the
  // difference between them is a statement about the timestep rather than about
  // either of them being wrong.
  const total = boosted
    ? { ax: boosted.ax, ay: boosted.ay }
    : { ax: sx + field.ax, ay: sy + field.ay };
  const stepped = body.last_accel
    ? { ax: body.last_accel.x, ay: body.last_accel.y }
    : null;
  return {
    total,
    sources,
    field,
    stepped,
    sumOfSources: { ax: sx, ay: sy },
    mondBoost: boosted ? boosted.boost : 1,
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
  physicsSettings.galaxy_gravity === 'halo'
    ? {
        vFlat: physicsSettings.halo_v_flat,
        coreRadius: physicsSettings.halo_core_radius,
      }
    : null;

/**
 * Milgrom's constant in simulation units, or 0 when MOND is not running.
 *
 * Zero rather than null so the hot loop can test one number. The conversion
 * itself lives in js/mond.js and depends on the scenario's declared scale, so a
 * scenario that has not declared one gets 0 here and is left Newtonian - which
 * is the guard that keeps MOND out of the Solar System.
 *
 * @returns {number} a0 in simulation acceleration units
 */
const activeMondA0 = () => {
  if (physicsSettings.galaxy_gravity !== 'mond') return 0;
  return a0InSimUnits(
    {
      kpcPerUnit: physicsSettings.galaxy_kpc_per_unit,
      solarMassPerUnit: physicsSettings.galaxy_msun_per_unit,
    },
    physicsSettings.gravitational_constant
  );
};

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

// --- The four radii ----------------------------------------------------------
//
// `obj.radius` is the model radius. It decides collisions, merging, Roche
// limits, the geometric part of a transit and the floor of the hit test, and
// nothing below changes it.
//
// What a body is *drawn* at is a different number, and js/bodyVisuals.js owns
// the policy: a per-family compression that gives a Sun-like star eight times
// the displayed radius of an Earth-like planet and four times a Jupiter,
// against model radii that made those ratios 3 and 1.9 and real ones of 109
// and 9.7. Read the long comment at the top of that module before changing any
// of it; the short version is that the drawing is illustrative, says so on the
// canvas, and must never leak into a measurement.
//
// How close a click has to land is a third number, also in that module, and is
// deliberately unrelated to the second. A planet drawn eight times smaller
// than its star is not eight times harder to select.

/**
 * Re-exported so js/render.js can size the placement preview the same way.
 * The value itself lives with the policy.
 */
export { DISPLAY_MIN_PX as DRAW_MIN_RADIUS_PX };

// The click minimums moved to js/bodyVisuals.js, beside the display policy and
// pointedly separate from it: hitRadius() takes the *model* radius, so a body
// drawn at three eighths of it is exactly as easy to select as it was before.
// They are the same numbers they have always been.

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
  // Read once per call rather than per body: it involves a unit conversion and
  // cannot change while a single step is being evaluated.
  const mondA0 = activeMondA0();
  for (let i = 0; i < count; i++) {
    const obj = objs[i];
    axOut[i] = 0;
    ayOut[i] = 0;
    if (!obj.alive) continue;
    // A body a prescribed model owns will not be moved by whatever comes out
    // of here, so summing a force on it is arithmetic nobody reads. It stays a
    // source - everything else still feels its gravity, which is what keeps
    // the rest of the scene honest - but it is not a target. A lesson that
    // stands a hundred display stars on the canvas therefore costs a hundred
    // sources and no targets, instead of ten thousand pair terms a frame.
    if (obj.model_owned) continue;

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

    // MOND, if this scenario is running it.
    //
    // Applied last, and to the summed field rather than to each source, because
    // that is what the law says: the modification is a function of the total
    // Newtonian acceleration a body feels, not of any one contribution to it.
    // Summing modified pair terms would be a different and wrong theory, and it
    // would not even be well defined - nu is nonlinear, so the answer would
    // depend on the order the sources happened to be listed in.
    //
    // The halo branch above cannot have run: the two are exclusive by
    // construction, and a0 is only non-zero in the 'mond' mode.
    if (mondA0 > 0) {
      const m = mondVector(axOut[i], ayOut[i], mondA0);
      axOut[i] = m.ax;
      ayOut[i] = m.ay;
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
  // A body a prescribed model owns is not the integrator's to move. This is
  // the write path for Velocity Verlet and RK4; PhysicsObject.apply_step is
  // the default's, and PhysicsObject.model_owned says why.
  if (obj.model_owned) return;
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
 * Every body a frame's barycenter is averaged over, as its history records.
 * Refreshed first, or a merger's product is missing from it until next step.
 *
 * @returns {Array} The live list, not a copy
 */
const barycenterBodies = () => {
  updateCachedArrays();
  return cachedBarycenterBodies;
};
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

let lastWorldGeneration = -1;

/**
 * Update cached arrays only when object counts change
 */
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
  // Zero and nonsense do nothing; a negative step integrates backwards.
  //
  // This read `dt <= 0`, which refused a negative advance and - because NaN
  // compares false against everything - let NaN through to be added to every
  // position in the scene. Both halves are fixed here.
  //
  // Nothing in the application can ask for a backward step. There is one
  // caller, js/render.js, and it gets its advance from frameAdvance(), which
  // multiplies a non-negative frame time by a sim_speed the settings control
  // bounds at [0, 5]. The reverse direction exists for
  // tools/reversibility-probe.mjs, which measures how well a forward run can
  // be undone - and the answer to that question is what the irreversibility
  // audit is built on. It is a measurement, not a feature: there is no control
  // anywhere that runs the simulation backwards.
  if (!Number.isFinite(dt) || dt === 0) return;
  // The clock the elapsed-time readout and the stopwatch both run on. Advanced
  // here rather than in the render loop so that it counts what was actually
  // integrated: a scenario that substeps takes several calls per frame, and a
  // paused or scrubbing frame takes none.
  advanceSimulationTime(dt);
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
      physicsWorker.onerror = e => failPhysicsWorker(e?.message || 'failed');
      physicsWorker.onmessageerror = () =>
        failPhysicsWorker('sent an unreadable answer');
    } catch (err) {
      console.error('Physics Worker init failed:', err);
      physicsWorker = null;
    }
  }

  if (workerBusy && performance.now() - workerSentAt > 10_000)
    failPhysicsWorker('stopped answering');

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
    workerSentAt = performance.now();
  }

  // One tick per step, before anything appends: every point pushed below shares
  // this number, which is what makes cross-body frame changes possible.
  advanceTrailTick();

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
        const baseColor =
          (obj && obj.baseColor) ||
          (obj && obj.obj_type
            ? physicsSettings[`${obj.obj_type.toLowerCase()}_base_color`]
            : undefined) ||
          '#c8c8c8';
        const rgb = hexToRgb(baseColor);
        burst(
          'absorb',
          obj.pos,
          rgb ? `rgb(${rgb.r},${rgb.g},${rgb.b})` : null
        );
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
  setBodyList('planets', check_and_absorb(planets));
  setBodyList('stars', check_and_absorb(stars));
  setBodyList('gas_giants', check_and_absorb(gas_giants));
  setBodyList('asteroids', check_and_absorb(asteroids));
  setBodyList('comets', check_and_absorb(comets));
  setBodyList('debris', check_and_absorb(debris));
  setBodyList('neutron_stars', check_and_absorb(neutron_stars));
  setBodyList('white_dwarfs', check_and_absorb(white_dwarfs));

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
    setBodyList('particles', particlePool.getActiveParticles());
  }

  // The one place an accretion-disk tracer moves (see updateDiskParticles).
  for (const particle of accretion_disk_particles) {
    if (particle.alive) {
      particle.update_physics(dt, []);
    }
  }

  // Clean up dead accretion disk particles
  setBodyList(
    'accretion_disk_particles',
    accretion_disk_particles.filter(p => p.alive)
  );

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
        // A body a prescribed model owns is not the integrator's to evolve,
        // and merging is evolution. A lesson that stands a binary on the
        // canvas draws its components as fixed-size markers and moves them to
        // the separation the waveform is plotted from, so they spend most of
        // an inspiral inside each other's drawn radius - without this the
        // engine merged them into one randomly named black hole a second
        // after the lesson opened, on every step, in both gravitational-wave
        // lessons.
        if (!mergeAllowed(bh1, bh2)) continue;
        const dx = bh1.pos.x - bh2.pos.x,
          dy = bh1.pos.y - bh2.pos.y;
        if (dx * dx + dy * dy < (bh1.radius + bh2.radius) ** 2) {
          // Identical arithmetic to what was written out here: total mass,
          // mass-weighted center of mass, momentum-conserving velocity.
          const m1 = bh1.mass,
            m2 = bh2.mass;
          const {
            mass: new_mass,
            pos: new_pos,
            vel: new_vel,
          } = mergedState(bh1, bh2);

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

          // The result goes into its collection before the merger is
          // announced, and that ordering is load-bearing. The dispatch is
          // synchronous, and js/ui.js's handler looks the result up by id in
          // order to re-open the inspector on it - so announcing first meant
          // the lookup ran against a list the new hole was not in yet, found
          // nothing, and left the inspector on a body that no longer existed.
          // transferFrame survived that because it only needs the id.
          bh_list.splice(j, 1);
          bh_list.splice(i, 1);
          bh_list.push(new_black_hole);
          completeMerger(bh1, bh2, new_black_hole);
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
  setBodyList(
    'planets',
    filterAndClearEnergy(
      planets,
      p => p.alive && (kept(p) || !is_offscreen(p.pos, 20.0))
    )
  );
  setBodyList(
    'stars',
    filterAndClearEnergy(
      stars,
      s => s.alive && (kept(s) || !is_offscreen(s.pos, 20.0))
    )
  );
  setBodyList(
    'gas_giants',
    filterAndClearEnergy(
      gas_giants,
      g => g.alive && (kept(g) || !is_offscreen(g.pos, 20.0))
    )
  );
  setBodyList(
    'neutron_stars',
    filterAndClearEnergy(
      neutron_stars,
      ns => ns.alive && (kept(ns) || !is_offscreen(ns.pos, 20.0))
    )
  );
  setBodyList(
    'white_dwarfs',
    filterAndClearEnergy(
      white_dwarfs,
      wd => wd.alive && (kept(wd) || !is_offscreen(wd.pos, 20.0))
    )
  );
  setBodyList(
    'galaxies',
    filterAndClearEnergy(
      galaxies,
      g => g.alive && (kept(g) || !is_offscreen(g.pos, 20.0))
    )
  );
  setBodyList(
    'bh_list',
    filterAndClearEnergy(
      bh_list,
      bh => bh.alive !== false && !is_offscreen(bh.pos, 50.0)
    )
  ); // Black holes should never be removed

  // More aggressive filtering for smaller/less important objects
  setBodyList(
    'asteroids',
    filterAndClearEnergy(asteroids, a => a.alive && !is_offscreen(a.pos, 5.0))
  );
  setBodyList(
    'comets',
    filterAndClearEnergy(comets, c => c.alive && !is_offscreen(c.pos, 20.0))
  );
  setBodyList(
    'debris',
    filterAndClearEnergy(debris, d => d.alive && !is_offscreen(d.pos, 3.0))
  );
  setBodyList(
    'accretion_disk_particles',
    filterAndClearEnergy(
      accretion_disk_particles,
      ap => ap.alive && !is_offscreen(ap.pos, 2.0)
    )
  );

  // Follow mode logic
  let target = null;
  if (physicsSettings.follow_mode !== 'None') {
    // Every option the settings menu offers. Four of them - Asteroid, Comet,
    // NeutronStar, WhiteDwarf - were listed in the control and missing from
    // this map, so choosing one silently followed nothing at all.
    const follow_map = {
      Galaxy: galaxies,
      BlackHole: bh_list,
      Planet: planets,
      GasGiant: gas_giants,
      Star: stars,
      Asteroid: asteroids,
      Comet: comets,
      NeutronStar: neutron_stars,
      WhiteDwarf: white_dwarfs,
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
  if (state) {
    // What is being followed, as an identity rather than an object: switching
    // from one black hole to another, or to the center of mass of a pair, is a
    // new camera and must not inherit the previous one's manual offset.
    const followKey = target
      ? `${physicsSettings.follow_mode}:${target.id ?? 'com'}`
      : null;
    if (state.followTarget !== followKey) {
      resetFollowCamera(state);
      state.followTarget = followKey;
    }

    if (target) {
      const applied = followCamera({
        targetPos: target.pos,
        frameOffset: state.frameOffset,
        zoom: state.zoom,
        pan: state.pan,
        lastApplied: state.followPan,
        offset: state.followOffset,
      });
      state.pan.x = applied.pan.x;
      state.pan.y = applied.pan.y;
      state.followOffset = applied.offset;
      state.followPan = { x: applied.pan.x, y: applied.pan.y };
    }
  }

  // Update energy history for all objects (sample every 10 frames for performance)
  if (state && state.frame_count % ENERGY_SAMPLE_RATE === 0) {
    updateEnergyHistory();
  }

  // Anything watching the integration itself, after the step is complete. The
  // set is empty unless something armed a watch, so the ordinary cost is one
  // size check per step. See onPhysicsStep().
  runStepListeners(dt, simulationTime);
};

// Base PhysicsObject class
/**
 * Base class for all physics objects in the simulation
 */
class PhysicsObject {
  // A body's kind: its class's static `kind`, a string minifying cannot rename.
  // An accessor, so it is not state: not enumerated, not saved, and a saved
  // state that names a `kind` cannot replace it. Not obj_type (see below).
  //
  // The setter does nothing on purpose: set_state() and `assign` copy fields
  // with Object.assign, a getter alone would throw there, and a saved `kind`
  // must never change what a body is (CONTRIBUTING.md, Module boundaries).
  get kind() {
    return this.constructor.kind;
  }
  set kind(_) {}
  /**
   * Create a physics object
   * @param {Object} pos - Initial position with x, y properties
   * @param {Object} vel - Initial velocity with x, y properties
   * @param {number} mass - Object mass
   * @param {number} radius - Object radius
   * @param {string} obj_type - Type identifier for the object
   */
  constructor(pos, vel, mass, radius, obj_type = 'object') {
    this.id = nextPhysicsObjectId();
    /**
     * Whether a prescribed scientific model owns this body's state.
     *
     * False for everything the sandbox builds, which is the ordinary case: the
     * N-body integrator moves it and that is the whole story. A lesson running
     * a *prescribed-model* activity - a star walking an evolutionary track, a
     * binary following a waveform - sets this on the bodies that model drives,
     * and the integrator then leaves their position and velocity alone.
     * Gravity from them is unchanged: they still pull on everything else, they
     * simply are not pushed back, which is what "the model owns this" means.
     *
     * Two authors of one number is how a lesson ends up reporting a state no
     * model computed and calling it physics. It is set and cleared through
     * js/lessonScene.js rather than by hand, because a flag nobody clears is a
     * body that never moves again.
     */
    this.model_owned = false;
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
    if (this.model_owned) return;
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
        // Mass, momentum and center of mass, rather than mass alone. See the
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

  draw(ctx) {
    paintBody(this, ctx, this.kind);
  }
}

/**
 * Planet physics object with Earth-like properties
 * @extends PhysicsObject
 */
class Planet extends PhysicsObject {
  static kind = 'Planet';
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

class GasGiant extends PhysicsObject {
  static kind = 'GasGiant';
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

    // Rings, for about a quarter of generated giants.
    //
    // From this body's own visual seed, which comes from its id, so the answer
    // survives a reset, a reload, a share link, a screenshot and an A/B run.
    // Never from Math.random: a hand-placed giant is built outside the seeded
    // section of world building, and the old code gave it a different tilt on
    // every load.
    //
    // A scenario that means something else says so afterwards - js/world/build
    // sets this true for Saturn and false for the other Solar System giants,
    // and either assignment overwrites what the constructor decided. The
    // fraction is a choice about visual variety and is documented as one;
    // nobody knows what share of giant exoplanets carry rings.
    this.hasRings = hasRingsForSeed(visualSeed(this));
  }

  /**
   * This body's ring geometry, in multiples of its displayed radius.
   *
   * The shape itself is js/bodyVisuals.js's; this only supplies the seed and
   * translates whatever the scenario authored. Multiples rather than world
   * units so the rings follow the drawn disc through a zoom, a quality tier
   * and the marker floor.
   *
   * Authored values are read as multiples of the planet's *model* radius,
   * because that is what a scenario writing `radius * 1.3` meant, and are
   * re-applied to the displayed radius so the author's proportion survives the
   * displayed-size policy.
   *
   * @returns {object} From ringGeometryFor
   */
  ringGeometry() {
    if (this._rings) return this._rings;
    const authored = {};
    if (Number.isFinite(this.ringInnerRadius) && this.radius > 0) {
      authored.inner = this.ringInnerRadius / this.radius;
    }
    if (Number.isFinite(this.ringOuterRadius) && this.radius > 0) {
      authored.outer = this.ringOuterRadius / this.radius;
    }
    if (Number.isFinite(this.ringAngle)) authored.angle = this.ringAngle;
    if (Number.isFinite(this.ringOpacity)) authored.opacity = this.ringOpacity;
    this._rings = ringGeometryFor(visualSeed(this), authored);
    return this._rings;
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
  static kind = 'Asteroid';
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
}

/**
 * Collision and tidal ejecta, massed in kilometer-scale rocky fragments.
 *
 * Was a literal 0.01 simulation units, which is three Earth masses of gravel.
 *
 * @extends PhysicsObject
 */
class Debris extends PhysicsObject {
  static kind = 'Debris';
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
}

/**
 * Represents individual particles in black hole accretion disks
 */
class AccretionDiskParticle extends PhysicsObject {
  static kind = 'AccretionDiskParticle';
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

      // It does NOT add its mass to the black hole, and this is a deliberate
      // correction rather than an oversight. These tracers are decoration: how
      // many exist depends on a rendering setting, so a hole that ate them grew
      // at a rate set by the quality tier. A black hole in the sandbox gains
      // mass by absorbing a modeled body, through handle_collisions, and by
      // nothing else. See MODEL.md and /model/#black-holes.

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
      burst('tracer', this.pos, tracerColor(this));
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
}

/**
 * Black hole physics object with gravitational effects
 */
class BlackHole {
  get kind() {
    return 'BlackHole';
  }
  set kind(_) {}
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
    this.id = nextPhysicsObjectId(); // Add unique ID for energy tracking
    // See PhysicsObject: a black hole is not one, and needs its own copy.
    this.model_owned = false;
    this.pos = { ...pos };
    this.mass = parseFloat(mass);
    this.vel = { ...vel };
    this.obj_type = 'BlackHole';
    this.alive = true; // Add alive property for deletion support
    this.updateRadius();
    this.name = getRandomName('blackHoles');

    // Track if this black hole is newly created (spawned by user or from merger)
    this.isNewlyCreated = isNewlyCreated;
    this.creationTime = Date.now(); // a stamp; the grace counts steps
    Object.defineProperty(this, 'graceUsed', { value: 0, writable: true });
    this.movementGracePeriod = 10.0; // seconds of play at 1x, in simulated time

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

    // How this object is drawn. Not physics: see js/blackHole/appearance.js.
    //
    // Derived from the object's own id rather than drawn from Math.random(),
    // because Math.random() is the seeded stream while a world is being built
    // (js/rng.js withSeed patches it), so a *visual* choice used to consume
    // physics randomness and shift every body placed afterwards.
    //
    // `jet_orientation` is kept and honored where a scenario or an old save
    // supplied one: it becomes the disk's position angle (what it always
    // meant on screen), and the jets come out along the disk's normal.
    this.jet_orientation = jet_orientation;
    this.appearance = createAppearance({
      seed: `bh:${this.id}`,
      positionAngleDeg:
        jet_orientation !== null
          ? ((jet_orientation * 180) / Math.PI + 90) % 360
          : (this.id * 47) % 360,
      inclinationDeg: 62,
      spin: this.id % 2 === 0 ? 1 : -1,
      environment: ENVIRONMENT.QUIESCENT,
    });
  }

  /**
   * The decorative accretion tracers are gone.
   *
   * They used to be created here, in the constructor, whenever the
   * `show_accretion_disk` *display* setting was on: thirty to sixty
   * PhysicsObjects per hole, each drawing several values from Math.random() -
   * which is the seeded stream while a world is being built - and each adding
   * its mass to the hole when it fell in. So a rendering toggle changed the
   * bodies a seed produced, and the quality tier set how fast a black hole
   * grew.
   *
   * What replaced them is a drawing: js/blackHole/render.js paints the flow
   * from the object's appearance and the clock it is handed, with no objects,
   * no mass and no calls to the global generator. Real accretion is unchanged
   * and still happens where it always did, in handle_collisions.
   *
   * The class and the arrays remain for saves that still carry particles.
   */

  /**
   * Change how this object is drawn. Never how it moves.
   *
   * The position angle and the seed are kept unless the caller replaces them,
   * so a scenario can say "accreting, seen at 20 degrees" without disturbing
   * the deterministic orientation the object was given at birth.
   *
   * @param {object} patch - Any subset of an appearance
   */
  setAppearance(patch = {}) {
    this.appearance = createAppearance({ ...this.appearance, ...patch });
  }

  updateRadius() {
    const mass_scale = Math.max(0.1, this.mass / (1.0 * SOLAR_MASS_UNIT)); // Changed from DEFAULT_SETTINGS.bh_mass
    this.radius = BH_RADIUS_BASE * Math.pow(mass_scale, 0.3); // Changed from 0.5 to 0.3 for more conservative scaling
  }

  /**
   * Whether this hole is allowed to move this step.
   *
   * Static holes are a deliberate model: a fixed potential well a student can
   * fly things past. A new hole's short grace period, in simulated time so no
   * frame rate changes it, stops a merger product freezing mid-flight.
   *
   * @returns {boolean} True when the hole integrates its own motion
   */
  can_move() {
    return (
      physicsSettings.bh_behavior === 'Orbiting' ||
      (this.isNewlyCreated && this.graceUsed < this.movementGracePeriod)
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
    const mondA0 = activeMondA0();
    if (!halo && !(mondA0 > 0)) return { ax, ay };
    if (halo) {
      const h = haloAcceleration(this.pos, halo);
      return { ax: ax + h.ax, ay: ay + h.ay };
    }
    // MOND instead: the same rescaling of the summed field the other bodies
    // get, so a hole in a galaxy scenario does not quietly stay Newtonian while
    // everything around it is not.
    const m = mondVector(ax, ay, mondA0);
    return { ax: m.ax, ay: m.ay };
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
    this.graceUsed += dt / (50 * DT); // seconds of play at 1x; backward steps give it back
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

      // No burst of particles. Two black holes merging in vacuum emit
      // gravitational waves and no light: there is nothing there to shine.
      // The old code spawned up to two hundred and twenty luminous tracers on
      // every merge, each of which then added its mass to the remnant, so a
      // vacuum merger produced both a flare and a mass gain that came from the
      // renderer. A scenario that wants a gas-rich merger says so by setting
      // its holes' environment; see js/blackHole/appearance.js.
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

    // Moved once per step, by simulate()'s pass over accretion_disk_particles.
    // Every tracer is in that list as well as this one, and moving it here as
    // well ran each one at twice its speed and aged it twice as fast. That
    // pass also keeps moving the tracers of a hole that has been swallowed,
    // so they fade out rather than freeze. This list only forgets the dead.
    for (let i = this.disk_particles.length - 1; i >= 0; i--) {
      if (!this.disk_particles[i].alive) {
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

  draw(ctx) {
    paintBody(this, ctx, 'BlackHole');
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
      // How it is drawn, carried so a shared link shows what its author saw.
      // Four small numbers and two short strings; `jet_orientation` goes with
      // them because older links carry one and it is what the position angle
      // is converted from.
      appearance: this.appearance ? { ...this.appearance } : null,
      jet_orientation: this.jet_orientation,
    };
  }

  set_state(s) {
    // `??`, not `||`: the very first object built in a world has id 0, and a
    // falsy check hands it a brand-new id on every restore. Nothing noticed
    // while ids were only used for energy bookkeeping; the A/B bench compares
    // "body 0" across a restore and would have measured a different object.
    this.id = s.id ?? nextPhysicsObjectId();
    this.pos = s.pos;
    this.vel = s.vel;
    this.mass = s.mass;
    this.alive = s.alive !== undefined ? s.alive : true;
    this.name = s.name || getRandomName('blackHoles');
    this.accretion_intensity = s.accretion_intensity || 0.0;
    this.jet_intensity = s.jet_intensity || 0.0;
    this.disk_growth = s.disk_growth || 0.0;
    this.time_since_last_accretion = s.time_since_last_accretion || 0.0;

    // Appearance, in order of preference: what the state carries, then an old
    // link's explicit jet angle converted the documented way, then a
    // deterministic default from the id. A state that predates appearances
    // therefore restores to something stable rather than to something new on
    // every load, and one that carried a jet direction keeps pointing where it
    // pointed - the jets now come out along the disk's normal, so that angle
    // becomes the disk's position angle, turned by ninety degrees.
    if (s.appearance) {
      this.appearance = createAppearance(s.appearance);
      this.jet_orientation = s.jet_orientation ?? null;
    } else if (Number.isFinite(s.jet_orientation)) {
      this.jet_orientation = s.jet_orientation;
      this.appearance = createAppearance({
        seed: `bh:${this.id}`,
        positionAngleDeg: ((s.jet_orientation * 180) / Math.PI + 90) % 360,
        spin: this.id % 2 === 0 ? 1 : -1,
        environment: ENVIRONMENT.QUIESCENT,
      });
    } else {
      this.appearance = defaultAppearance(this.id);
    }
    this.updateRadius();
  }
}

// Star color function is now imported from utils.js

class StarObject extends PhysicsObject {
  static kind = 'StarObject';
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
    // Null, deliberately. A color here would be indistinguishable from one a
    // scenario chose on purpose, and that is exactly the distinction the
    // drawing has to make: an authored color must survive, and a generated one
    // must give way to the star's temperature. The constructor used to fill
    // this in from the mass, which meant the temperature branch below was
    // unreachable and a star built from a real catalog at 2566 K was drawn
    // the color of a 0.09 solar-mass main-sequence star.
    //
    // Every reader falls back: the draw path colors from the temperature, the
    // trail renderer does the same, and js/view3d.js derives from the mass.
    this.baseColor = null;
    this.intact = true;
    this.name = getRandomName('stars');
    // The modeled properties. Null means nobody supplied one, which is the
    // common case: js/stellar/state.js then estimates from the mass and says
    // that it did. A scenario built from a catalog fills them in, and a
    // future evolutionary track will too.
    this.temperature = null;
    this.spectralType = null;
    this.age = null;
    /** Bolometric luminosity in solar units, where something knows it. */
    this.luminosityInSuns = null;
    /** Photospheric radius in solar radii. NOT the collision radius above. */
    this.radiusInSuns = null;
    /** One of js/stellar/state.js PHASES, where something knows it. */
    this.stellarPhase = null;
    /** Age in years, on the stellar clock, which is not the simulation's. */
    this.ageYr = null;
    /** Mass this star was born with, in solar masses. */
    this.initialMassInSuns = finalMassInSuns;
    // Per-star toggle for rendering habitable (Goldilocks) zone rings
    this.showHabitableZone = false;
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
      initialMassInSuns: this.initialMassInSuns,
      // Null where nobody chose one. That is the difference between "this star
      // is orange because a scenario said so" and "this star is orange because
      // it is cool", and a saved state that wrote the second as the first
      // would freeze a derived color into an authored one.
      baseColor: this.baseColor,
      showHabitableZone: this.showHabitableZone,
      // The modeled properties, each null unless something supplied it. An
      // older save has none of these and restores with nulls, which is exactly
      // what a star that nobody modeled should carry.
      temperature: this.temperature,
      luminosityInSuns: this.luminosityInSuns,
      radiusInSuns: this.radiusInSuns,
      spectralType: this.spectralType,
      stellarPhase: this.stellarPhase,
      ageYr: this.ageYr,
    };
  }

  set_state(s) {
    super.set_state(s);
    this.massInSuns = s.massInSuns;
    this.initialMassInSuns = s.initialMassInSuns ?? s.massInSuns;
    this.baseColor = s.baseColor ?? null;
    this.showHabitableZone = !!s.showHabitableZone;
    // `?? null` rather than a bare assignment: a state written before these
    // existed has them undefined, and undefined is not the same as "nobody
    // knows" to a function that checks Number.isFinite.
    this.temperature = s.temperature ?? null;
    this.luminosityInSuns = s.luminosityInSuns ?? null;
    this.radiusInSuns = s.radiusInSuns ?? null;
    this.spectralType = s.spectralType ?? null;
    this.stellarPhase = s.stellarPhase ?? null;
    this.ageYr = s.ageYr ?? null;
    // The memo is keyed on all of these; drop it so the next draw rebuilds.
    this._visual = null;
  }
}

class NeutronStar extends PhysicsObject {
  static kind = 'NeutronStar';
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

class WhiteDwarf extends PhysicsObject {
  static kind = 'WhiteDwarf';
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

/** How far a galaxy's drawing is turned: one of eight angles, by id. */
const galaxyTilt = id => (id % 8) * (Math.PI / 8);

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
  static kind = 'Galaxy';
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
    this.tilt = galaxyTilt(this.id);
  }

  // The kind travels with the rest of the state: the inspector reports it and
  // the drawing depends on it.
  get_state() {
    return { ...super.get_state(), galaxyType: this.galaxyType };
  }

  set_state(s) {
    super.set_state(s);
    // A link can be edited by hand. The drawing and the inspector test for
    // different values, so anything else would be drawn as one kind and
    // reported as the other.
    if (this.galaxyType !== 'elliptical') this.galaxyType = 'spiral';
    // set_state may have replaced the id the constructor minted with the saved
    // one, and the tilt follows the id.
    this.tilt = galaxyTilt(this.id);
  }
}

const findObjectAtPosition = worldPos => {
  // Check black holes first (they're usually the most important)
  for (const bh of bh_list) {
    const dx = worldPos.x - bh.pos.x;
    const dy = worldPos.y - bh.pos.y;
    const clickRadius = hitRadius(
      bh.radius,
      'BlackHole',
      state.zoom,
      bh.stageRadius
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
    const clickRadius = hitRadius(g.radius, 'Galaxy', state.zoom);
    if (dx * dx + dy * dy < clickRadius * clickRadius) {
      return { object: g, type: 'Galaxy' };
    }
  }

  // Check stars
  for (const star of stars) {
    if (!star.alive) continue;
    const dx = worldPos.x - star.pos.x;
    const dy = worldPos.y - star.pos.y;
    const clickRadius = hitRadius(
      star.radius,
      'Star',
      state.zoom,
      star.stageRadius
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
    const clickRadius = hitRadius(
      ns.radius,
      'NeutronStar',
      state.zoom,
      ns.stageRadius
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
    const clickRadius = hitRadius(
      wd.radius,
      'WhiteDwarf',
      state.zoom,
      wd.stageRadius
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
    const clickRadius = hitRadius(
      gasGiant.radius,
      'GasGiant',
      state.zoom,
      gasGiant.stageRadius
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
    const clickRadius = hitRadius(planet.radius, 'Planet', state.zoom);
    if (dx * dx + dy * dy < clickRadius * clickRadius) {
      return { object: planet, type: 'Planet' };
    }
  }

  // Comets, before asteroids because that is the order they are drawn in and a
  // hit test should return whatever is on top.
  //
  // This loop is new. There used to be only the asteroid loop below, which
  // ended with `if (asteroid instanceof Comet)` - a leftover from when a
  // hand-placed comet was pushed into `asteroids`. Once that was corrected the
  // branch became unreachable and comets stopped being selectable at all: a
  // reader could place one and then not click it, inspect it, follow it or
  // frame on it. The comet entry in HIT_MIN_PX was declared and unused until
  // then.
  for (const comet of comets) {
    if (!comet.alive) continue;
    const dx = worldPos.x - comet.pos.x;
    const dy = worldPos.y - comet.pos.y;
    const clickRadius = hitRadius(comet.radius, 'Comet', state.zoom);
    if (dx * dx + dy * dy < clickRadius * clickRadius) {
      return { object: comet, type: 'Comet' };
    }
  }

  // Check asteroids
  for (const asteroid of asteroids) {
    if (!asteroid.alive) continue;
    const dx = worldPos.x - asteroid.pos.x;
    const dy = worldPos.y - asteroid.pos.y;
    const clickRadius = hitRadius(asteroid.radius, 'Asteroid', state.zoom);
    if (dx * dx + dy * dy < clickRadius * clickRadius) {
      return { object: asteroid, type: 'Asteroid' };
    }
  }

  return null;
};

class Comet extends PhysicsObject {
  static kind = 'Comet';
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

// =============================================================================
// Uniform spatial hash for broad-phase collision detection
// -----------------------------------------------------------------------------
// The collision handlers each walked their own O(N²) double loop, so a frame
// did five full pairwise sweeps. This narrows every one of them to the pairs
// that actually share a neighborhood. A uniform grid suits this simulation:
// bodies are small relative to their separations, the cell size tracks the
// largest radius present, and one huge object touching every cell is bounded
// by clamping the cell count. (Folded in from js/spatialHash.js, whose only
// importer was this module, so the engine's decomposition costs no request.)
// =============================================================================

const GRID_MIN_CELL = 8;
const GRID_MAX_CELLS = 200_000;

// Reused across frames so the hot path allocates nothing.
const gridBuckets = new Map();
let gridCellSize = 64;

/**
 * Build the grid from a list of bodies.
 * @param {Array} objects - Bodies with pos and radius
 * @returns {number} The chosen cell size
 */
function buildGrid(objects) {
  gridBuckets.clear();
  if (objects.length === 0) return gridCellSize;

  // Cell size tracks the largest interaction radius so that a pair can never
  // be separated by more than one cell in each axis.
  let maxRadius = 0;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const o of objects) {
    if (!o.alive) continue;
    if (o.radius > maxRadius) maxRadius = o.radius;
    if (o.pos.x < minX) minX = o.pos.x;
    if (o.pos.x > maxX) maxX = o.pos.x;
    if (o.pos.y < minY) minY = o.pos.y;
    if (o.pos.y > maxY) maxY = o.pos.y;
  }
  if (!isFinite(minX)) return gridCellSize;

  gridCellSize = Math.max(GRID_MIN_CELL, maxRadius * 2);

  // A very sparse, very wide field would otherwise allocate an enormous number
  // of cells; grow the cells instead of the map.
  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);
  const estimate = (spanX / gridCellSize) * (spanY / gridCellSize);
  if (estimate > GRID_MAX_CELLS) {
    gridCellSize *= Math.sqrt(estimate / GRID_MAX_CELLS);
  }

  for (const o of objects) {
    if (!o.alive) continue;
    const key = gridHash(o.pos.x, o.pos.y);
    let cell = gridBuckets.get(key);
    if (!cell) {
      cell = [];
      gridBuckets.set(key, cell);
    }
    cell.push(o);
  }
  return gridCellSize;
}

function gridHash(x, y) {
  const cx = Math.floor(x / gridCellSize);
  const cy = Math.floor(y / gridCellSize);
  // A string key rather than a bit-mixed integer: an integer gridHash can alias two
  // distinct cells into one bucket, and an aliased bucket would hand the same
  // pair to visit() twice: applying a collision impulse or a merge twice.
  return `${cx},${cy}`;
}

/**
 * Visit every candidate pair exactly once.
 *
 * Correctness note: because gridCellSize >= 2 * maxRadius, two touching bodies
 * always land in the same or adjacent cells, so scanning the 3x3 neighborhood
 * cannot miss a contact. Each unordered pair is yielded once: for the same
 * cell by index ordering, and for neighbors by only scanning forward.
 *
 * @param {Array} objects - Bodies with pos, radius and alive
 * @param {Function} visit - Called as visit(a, b)
 */
function forEachCandidatePair(objects, visit) {
  if (objects.length < 2) return;

  // Below this, the grid's bookkeeping costs more than the pairs it saves.
  if (objects.length < 24) {
    for (let i = 0; i < objects.length; i++) {
      const a = objects[i];
      if (!a.alive) continue;
      for (let j = i + 1; j < objects.length; j++) {
        const b = objects[j];
        if (!b.alive) continue;
        visit(a, b);
      }
    }
    return;
  }

  buildGrid(objects);

  // Only half of the 3x3 neighborhood is scanned; the mirrored half is
  // covered when the other cell takes its turn.
  const FORWARD = [
    [1, -1],
    [1, 0],
    [1, 1],
    [0, 1],
  ];

  for (const cell of gridBuckets.values()) {
    // Pairs inside this cell
    for (let i = 0; i < cell.length; i++) {
      const a = cell[i];
      if (!a.alive) continue;
      for (let j = i + 1; j < cell.length; j++) {
        const b = cell[j];
        if (!b.alive) continue;
        visit(a, b);
      }
      // Pairs spanning into forward neighbors
      for (const [dx, dy] of FORWARD) {
        const other = gridBuckets.get(
          gridHash(a.pos.x + dx * gridCellSize, a.pos.y + dy * gridCellSize)
        );
        if (!other) continue;
        for (const b of other) {
          if (!b.alive || b === a) continue;
          visit(a, b);
        }
      }
    }
  }
}

// Handle collisions between objects
/**
 * Handle collisions between objects in the simulation
 * @param {Array} objects_list - Array of physics objects to check for collisions
 */
const handle_collisions = objects_list => {
  // Broad phase: only pairs sharing a grid neighborhood reach the contact
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

/** Create a spectacular kilonova explosion when neutron stars merge (pos, mass). */
const createKilonovaExplosion = (pos, mass) => {
  // Kilonova parameters based on mass
  const massInSuns = mass / SOLAR_MASS_UNIT;
  const explosionIntensity = Math.min(2.0, massInSuns / 2.0); // Scale with mass

  const particleCount = Math.floor(200 + massInSuns * 50); // 200-400 particles based on mass

  for (let i = 0; i < particleCount; i++) {
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

    const particle = particlePool.getParticle(
      spawnPos,
      vel,
      Math.random() * 3.0 + 2.0, // 2-5 second lifetime
      Math.random() * 15 + 10, // 10-25 start size
      Math.random() * 3 + 1, // 1-4 end size
      color
    );

    if (particle) {
      particle.kilonova_glow = true;
      particle.glow_intensity = Math.random() * 0.5 + 0.5;
    }
  }

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

/** Create a smaller kilonova explosion when neutron stars merge but don't form a black hole (pos, mass). */
const createSmallKilonovaExplosion = (pos, mass) => {
  // Kilonova parameters based on mass (reduced intensity)
  const massInSuns = mass / SOLAR_MASS_UNIT;
  const explosionIntensity = Math.min(1.0, massInSuns / 3.0); // Reduced intensity for smaller explosions

  const particleCount = Math.floor(100 + massInSuns * 25); // 100-200 particles (half of full kilonova)

  for (let i = 0; i < particleCount; i++) {
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

    const particle = particlePool.getParticle(
      spawnPos,
      vel,
      Math.random() * 2.0 + 1.5, // 1.5-3.5 second lifetime (shorter)
      Math.random() * 10 + 6, // 6-16 start size (smaller)
      Math.random() * 2 + 1, // 1-3 end size (smaller)
      color
    );

    if (particle) {
      particle.kilonova_glow = true;
      particle.glow_intensity = Math.random() * 0.3 + 0.3; // Reduced glow
    }
  }

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

  for (let i = 0; i < 25; i++) {
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

/** Create a moderate explosion when neutron star and white dwarf merge (pos, mass). */
const createNSWDExplosion = (pos, mass) => {
  const massInSuns = mass / SOLAR_MASS_UNIT;
  const explosionIntensity = Math.min(1.5, massInSuns / 1.5); // Moderate intensity

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

    if (particle) {
      particle.kilonova_glow = true;
      particle.glow_intensity = Math.random() * 0.3 + 0.3; // Moderate glow
    }
  }

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

/** Create a smaller explosion when white dwarfs merge (pos, mass). */
const createWDWDExplosion = (pos, mass) => {
  const massInSuns = mass / SOLAR_MASS_UNIT;
  const explosionIntensity = Math.min(1.0, massInSuns / 1.0); // Smaller intensity

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

    if (particle) {
      particle.kilonova_glow = true;
      particle.glow_intensity = Math.random() * 0.2 + 0.2; // Subtle glow
    }
  }

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

export const className = o =>
  (typeof o?.kind === 'string' && o.kind) || (o ? 'Object' : '');

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
        // Same rule as the black-hole loop above: what a prescribed model owns,
        // the integrator does not merge. The neutron-star pair a lesson stages
        // is the case this catches.
        if (!mergeAllowed(star1, star2)) continue;

        const dx = star1.pos.x - star2.pos.x;
        const dy = star1.pos.y - star2.pos.y;
        const dist_sq = dx * dx + dy * dy;
        const min_dist = star1.radius + star2.radius;

        if (dist_sq < min_dist ** 2 && dist_sq > 1e-6) {
          // By class, never obj_type: a transformed body carries the obj_type
          // of what it became and the class of what it was.
          const star1_type = star1.kind;
          const star2_type = star2.kind;

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
          burst('starMerge', new_pos);

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
            if (other.kind === 'StarObject')
              setBodyList(
                'stars',
                stars.filter(s => s !== other)
              );
            if (other.kind === 'WhiteDwarf') clearObjectEnergyHistory(other.id);
            setBodyList(
              'white_dwarfs',
              white_dwarfs.filter(wd => wd !== other)
            );
            if (other.kind === 'NeutronStar')
              clearObjectEnergyHistory(other.id);
            setBodyList(
              'neutron_stars',
              neutron_stars.filter(ns => ns !== other)
            );
            // No new black hole is created, and the existing one remains in
            // bh_list - so it is the result. completeMerger declines to retire
            // a progenitor that is also the result, and a reader following the
            // star it consumed is moved onto the hole rather than back to the
            // world origin.
            completeMerger(other, bh, bh);
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
              setBodyList(
                'neutron_stars',
                neutron_stars.filter(ns => ns !== star1 && ns !== star2)
              );
              if (star1_type === 'BlackHole' && star1._bh_ref) {
                star1._bh_ref.alive = false;
                setBodyList(
                  'bh_list',
                  bh_list.filter(bh => bh !== star1._bh_ref)
                );
              }
              if (star2_type === 'BlackHole' && star2._bh_ref) {
                star2._bh_ref.alive = false;
                setBodyList(
                  'bh_list',
                  bh_list.filter(bh => bh !== star2._bh_ref)
                );
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
              setBodyList(
                'neutron_stars',
                neutron_stars.filter(ns => ns !== star1 && ns !== star2)
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

          // One call for all nine branches above. Each of them decided what
          // forms - a star, a white dwarf, a neutron star or a black hole -
          // and pushed it into its own collection; this is the bookkeeping
          // every one of them shares, and until now none of them did. A star
          // that merged while the reader was following it announced nothing,
          // so js/ui.js had no result to move the frame and the inspector
          // onto.
          completeMerger(star1, star2, new_object);

          merged_this_step = true;
          break;
        }
      }
      if (merged_this_step) break;
    }

    // Purge dead objects from global arrays so subsequent iterations
    // and later collision handlers never see stale references.
    setBodyList('stars', purgeDead(stars));
    setBodyList('neutron_stars', purgeDead(neutron_stars));
    setBodyList('white_dwarfs', purgeDead(white_dwarfs));

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
        if (star.kind === 'NeutronStar') {
          star.massInSuns = star.mass / SOLAR_MASS_UNIT;
        } else if (star.kind === 'WhiteDwarf') {
          star.massInSuns = star.mass / SOLAR_MASS_UNIT;
        } else if (star.kind === 'StarObject') {
          star.massInSuns = star.mass / SOLAR_MASS_UNIT;
          // Update radius for regular stars
          star.radius = STAR_OBJ_RADIUS * Math.pow(star.massInSuns, 0.85);
        }

        // Create absorption particles
        burst('starPlanet', planet.pos);

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
        if (star.kind === 'NeutronStar') {
          star.massInSuns = star.mass / SOLAR_MASS_UNIT;
        } else if (star.kind === 'WhiteDwarf') {
          star.massInSuns = star.mass / SOLAR_MASS_UNIT;
        } else if (star.kind === 'StarObject') {
          star.massInSuns = star.mass / SOLAR_MASS_UNIT;
          // Update radius for regular stars
          star.radius = STAR_OBJ_RADIUS * Math.pow(star.massInSuns, 0.85);
        }

        // Create more dramatic absorption particles for gas giant
        burst('starGas', gasGiant.pos);

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
        if (star.kind === 'NeutronStar') {
          star.massInSuns = star.mass / SOLAR_MASS_UNIT;
        } else if (star.kind === 'WhiteDwarf') {
          star.massInSuns = star.mass / SOLAR_MASS_UNIT;
        } else if (star.kind === 'StarObject') {
          star.massInSuns = star.mass / SOLAR_MASS_UNIT;
          // Update radius for regular stars
          star.radius = STAR_OBJ_RADIUS * Math.pow(star.massInSuns, 0.85);
        }

        // Create small absorption particles
        burst('starAsteroid', asteroid.pos);

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
  const rocky_objects = objects_list.filter(obj => ROCKY_TYPES.has(obj.kind));

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
          // ends up gravitating as one thing and labeled as another.
          for (const obj of [obj1, obj2]) {
            obj.mass *= 0.9;
            if (obj.massInEarths != null) obj.massInEarths *= 0.9;
            if (obj.massInJupiters != null) obj.massInJupiters *= 0.9;
            if (obj.massInSuns != null) obj.massInSuns *= 0.9;
          }

          // Create collision particles
          burst('rocky', {
            x: (obj1.pos.x + obj2.pos.x) * 0.5,
            y: (obj1.pos.y + obj2.pos.y) * 0.5,
          });

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
    // Not a star a prescribed model owns. "The model owns this" has to mean
    // its evolution as well as its motion, or the sandbox's own rules keep
    // acting on it: a lesson standing a forty-solar-mass track on the canvas
    // had it collapse into a black hole two seconds later, which is the
    // sandbox making a claim about a body it is only being asked to draw.
    if (star.model_owned) continue;

    const massInSuns = star.mass / SOLAR_MASS_UNIT;
    if (massInSuns > maxStarMassBeforeBH()) {
      // Convert star to black hole - mark as newly created for proper accretion disk initialization
      const new_bh = new BlackHole(star.pos, star.mass, star.vel, true);
      bh_list.push(new_bh);

      // Create collapse particles
      burst('collapseStar', star.pos);

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
      burst('collapseNS', ns.pos);

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
      burst('collapseWD', wd.pos);

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
        burst('gasAccretion', body.pos, undefined, approach);

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

        // The guard the BH-BH loop has had all along and this one did not.
        // js/lessonStage.js stages gas giants and marks them model_owned, so
        // without this a lesson that stands two of them on the canvas can have
        // the engine merge them out from under it.
        if (!mergeAllowed(gasGiant1, gasGiant2)) continue;

        const dx = gasGiant1.pos.x - gasGiant2.pos.x;
        const dy = gasGiant1.pos.y - gasGiant2.pos.y;
        const dist_sq = dx * dx + dy * dy;
        const min_dist = gasGiant1.radius + gasGiant2.radius;

        if (dist_sq < min_dist ** 2 && dist_sq > 1e-6) {
          // Identical arithmetic to what was written out here.
          const {
            mass: new_mass,
            pos: new_pos,
            vel: new_vel,
          } = mergedState(gasGiant1, gasGiant2);
          const new_mass_in_jupiters = new_mass / JUPITER_MASS_UNIT;

          // Create merger particles
          burst('gasMerge', new_pos);

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
            burst('gasStar', new_pos);
          } else {
            // Create a larger gas giant
            new_object = new GasGiant(new_pos, new_vel, new_mass_in_jupiters);
            gas_giants.push(new_object);
          }

          // Both progenitors are already out of the list and the result is
          // already in its own - stars for an ignition, gas_giants otherwise -
          // which is the order completeMerger needs: js/ui.js looks the result
          // up by id while the dispatch is still on the stack.
          completeMerger(gasGiant1, gasGiant2, new_object);

          merged_this_step = true;
          break;
        }
      }
      if (merged_this_step) break;
    }

    // Filter out dead gas giants after processing all collisions
    setBodyList('gas_giants', purgeDead(gas_giants));
  }
};

export {
  getAbsorbedSpinAngularMomentum,
  getDiscardedAbsorptionMomentum,
  resetAbsorptionAccounting,
  conservedQuantities,
  conservationDrift,
  resetConservationBaseline,
  conservationCaveats,
  calculateKineticEnergy,
  calculateGravitationalPotentialEnergy,
  calculateTotalPotentialEnergy,
  calculateObjectEnergy,
  getAllPhysicsObjects,
  getObjectEnergyHistory,
  clearAllEnergyHistory,
  getObjectEnergyStats,
  getEnergySystemMemoryStats,
  trimAllEnergyHistory,
  updateEnergySystemConfig,
} from './engine/conservation.js';

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
  AccretionDiskParticle,
  particlePool,
  gravitational_acceleration,
  world_to_screen,
  screen_to_world,
  is_offscreen,
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
  registerBodyDrawers,
  registerEffects,
  // The live values the drawers read (js/bodyDraw.js, js/bodyDrawSky.js). The
  // engine keeps them because it owns them: it reassigns the settings, sets
  // the count of bodies on screen each step and builds the black hole's
  // appearance from the same default.
  physicsSettings,
  liveBodyCount,
  defaultAppearance,
  updateEnergyHistory,
  clearObjectEnergyHistory,
  clearEnergyHistory,
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
    kind: 'BlackHole',
    _bh_ref: bh, // Keep reference to real BlackHole
  };
}
