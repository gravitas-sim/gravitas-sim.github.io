// The engine's bodies (D-DECOMP-18, slice S5): the size and mass constants, the
// bursts, the accretion rule a black hole applies to what falls in, and every
// body class from PhysicsObject to Comet, with the accretion-disk tracer and the
// galaxy helpers. Moved from js/physics.js verbatim. A body's update calls the
// absorption rule and the black hole builds tracers, so this file holds both
// and js/engine/blackHole.js imports it (the other order is a cycle). It reads
// the state, forces and conservation modules; it does not import js/physics.js.
import {
  JUPITER_MASSES_PER_SOLAR_MASS,
  CERES_MASS_KG,
  HALLEY_MASS_KG,
  DEBRIS_FRAGMENT_MASS_KG,
  SOLAR_MASS_UNIT,
  EARTH_MASS_UNIT,
} from '../constants.js';
import { SPACE_OBJECT_NAMES } from '../names.js';
import {
  visualSeed,
  hasRingsForSeed,
  ringGeometryFor,
} from '../bodyVisuals.js';
import { gravitational_acceleration } from './forces.js';
import {
  nextPhysicsObjectId,
  particlePool,
  effectLooks,
  tracerColor,
  physicsSettings,
  trailTick,
  trailBudget,
  MASS_UNIT_KG,
  paintBody,
} from './state.js';
import {
  bankAbsorbedSpin,
  bankDiscardedMomentum,
  clearObjectEnergyHistory,
} from './conservation.js';

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
export const getRandomName = type => {
  const typeNames = SPACE_OBJECT_NAMES[type] || SPACE_OBJECT_NAMES.planets;
  return typeNames[Math.floor(Math.random() * typeNames.length)];
};

// Physics constants and utilities
export const DT = 0.1;
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
export const ABSORB_BUFFER = 6;
export const BH_RADIUS_BASE = 8; // Reduced from 15 to make black holes smaller
export const PLANET_RADIUS = 5;
export const GAS_GIANT_RADIUS = 8; // Reduced from 15 to make gas giants smaller than stars
export const ASTEROID_RADIUS = 2;
export const STAR_OBJ_RADIUS = 10;
export const NEUTRON_STAR_RADIUS = 3;
export const WHITE_DWARF_RADIUS = 8;
export const DEBRIS_RADIUS = 2;
export const MAX_STAR_MASS_BEFORE_BH = 20.0;

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
export const maxStarMassBeforeBH = () => {
  const v = physicsSettings.max_star_mass_before_bh;
  return Number.isFinite(v) && v > 0 ? v : MAX_STAR_MASS_BEFORE_BH;
};
// Disk speed that maps to beta ~ 1 for Doppler beaming. Chosen so a typical
// inner-disk particle lands around beta 0.3-0.5, matching the asymmetry seen
// in real images without needing physical velocity units.
const DISK_REFERENCE_SPEED = 90.0;
export const GAS_GIANT_TO_STAR_THRESHOLD = 80.0; // Jupiter masses needed to become a star
// Simulation mass units per Jupiter mass. Derived from the solar mass rather
// than chosen, because the solar mass is the anchor the whole mass scale hangs
// from and a second independent number is a second chance to disagree with it.
// This was 50 for a long time, which is 52.4x too heavy: a gas giant labeled
// "1.00 M_J" in the inspector pulled on its neighbors with 52 Jupiter masses,
// a twentieth of a star. Nothing in the display was wrong about the mass it was
// given; the mass it was given was wrong about Jupiter.
export const JUPITER_MASS_UNIT =
  SOLAR_MASS_UNIT / JUPITER_MASSES_PER_SOLAR_MASS;

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
export const CERES_MASS_UNIT = CERES_MASS_KG / MASS_UNIT_KG;
export const HALLEY_MASS_UNIT = HALLEY_MASS_KG / MASS_UNIT_KG;
export const DEBRIS_MASS_UNIT = DEBRIS_FRAGMENT_MASS_KG / MASS_UNIT_KG;

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
export const burst = (name, pos, color, aim) => {
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
export const absorb_into_black_hole = (bh, body) => {
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

// Base PhysicsObject class
/**
 * Base class for all physics objects in the simulation
 */
export class PhysicsObject {
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
export class Planet extends PhysicsObject {
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

export class GasGiant extends PhysicsObject {
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
export class Asteroid extends PhysicsObject {
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
export class Debris extends PhysicsObject {
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
export class AccretionDiskParticle extends PhysicsObject {
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

// Star color function is now imported from utils.js

export class StarObject extends PhysicsObject {
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

export class NeutronStar extends PhysicsObject {
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

export class WhiteDwarf extends PhysicsObject {
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
export const GALAXY_RADIUS = 150;

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
export class Galaxy extends PhysicsObject {
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

export class Comet extends PhysicsObject {
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
