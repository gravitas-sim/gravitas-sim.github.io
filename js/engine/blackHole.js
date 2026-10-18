// The black hole (D-DECOMP-18, slice S5): its default appearance and the class
// itself, moved from js/physics.js verbatim. It builds accretion-disk tracers
// and reads the body constants, so it imports js/engine/bodies.js; the facade
// imports both and re-exports every name it used to define.
import { SOLAR_MASS_UNIT } from '../constants.js';
import { haloAcceleration } from '../darkMatter.js';
import { mondVector } from '../mond.js';
import { ENVIRONMENT, createAppearance } from '../blackHole/appearance.js';
import {
  activeHalo,
  activeMondA0,
  gravitational_acceleration,
} from './forces.js';
import {
  accretion_disk_particles,
  nextPhysicsObjectId,
  physicsSettings,
  paintBody,
} from './state.js';
import {
  getRandomName,
  DT,
  BH_RADIUS_BASE,
  AccretionDiskParticle,
} from './bodies.js';

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
export const defaultAppearance = id =>
  createAppearance({
    seed: `bh:${id}`,
    positionAngleDeg: (id * 47) % 360,
    spin: id % 2 === 0 ? 1 : -1,
    environment: ENVIRONMENT.QUIESCENT,
  });

/**
 * Black hole physics object with gravitational effects
 */
export class BlackHole {
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
