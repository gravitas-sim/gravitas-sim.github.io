// The engine's forces and integrators (D-DECOMP-18, slice S4): the gravitational
// sources a body feels, the acceleration at a point, the dark-matter and MOND
// terms, softening, and the three step schemes that turn accelerations into
// motion. Moved from js/physics.js verbatim: the order of every sum, every
// constant and every branch is the one the validation suite and the seeded
// worlds were recorded against. It reads the state module and the pure force
// modules; it does not import js/physics.js back.
import {
  physicsSettings,
  minInteractionDistance,
  activeIntegrator,
} from './state.js';
import { haloAcceleration } from '../darkMatter.js';
import { a0InSimUnits, mondVector } from '../mond.js';

// The bodies whose gravity every other body feels: planets and asteroids,
// refilled each step by updateCachedArrays in js/physics.js (which only ever
// empties and pushes into it, so an importer holds the one array).
export const cachedMajorSources = [];

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
export const gravitySourcesFor = body => {
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
export const accelerationBreakdown = body => {
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
export const publishStepAccelerations = (objs, count) => {
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
export const activeHalo = () =>
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
export const activeMondA0 = () => {
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
 * Calculate gravitational acceleration at a target position from multiple sources
 * @param {Object} target_pos - Target position with x, y properties
 * @param {Array} sources - Array of gravitational source objects with pos and mass properties
 * @returns {Object} Acceleration vector with ax, ay properties
 */
// Optimized gravitational acceleration with distance caching
export const gravitational_acceleration = (target_pos, sources) => {
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
export const getMostMassiveBody = bodies => {
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
export const sampleTwoBodyOrbit = ({ r0, v0, mCentral, dt, steps }) => {
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
export let stepAx = new Float64Array(256);
export let stepAy = new Float64Array(256);

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

// ---------------------------------------------------------------------------
// The tidal seam (SPIKE, Prompt 204 part B): a registered list of tidal pairs.
// Each pair is {planetId, moonId, eps0, a0, rate, spin}: a dissipative
// acceleration along the azimuthal direction of the separation, equal and
// opposite in momentum, a_t(r) = s eps0 [G (M + m) / a0^2] (a0 / r)^7 with
// s = sgn(spin - n_kepler(r)). Position-only, so every stage of every scheme
// sees the same law. An empty list costs one length test.
// ---------------------------------------------------------------------------
export const tidalPairs = [];

/** Torque on the orbit of a pair at its current separation, for the account. */
export const tidalPairTerms = (pair, planet, moon, G) => {
  const rx = moon.pos.x - planet.pos.x;
  const ry = moon.pos.y - planet.pos.y;
  const d = Math.sqrt(rx * rx + ry * ry);
  const muTot = G * (planet.mass + moon.mass);
  const s = Math.sign(pair.spin - Math.sqrt(muTot / (d * d * d)));
  const aT = s * pair.eps0 * (muTot / (pair.a0 * pair.a0)) * (pair.a0 / d) ** 7;
  const mu = (planet.mass * moon.mass) / (planet.mass + moon.mass);
  return { rx, ry, d, s, aT, mu, force: mu * aT, torque: mu * aT * d };
};

const applyTidalPairs = (objs, count, axOut, ayOut) => {
  const G = physicsSettings.gravitational_constant;
  for (const pair of tidalPairs) {
    let planet = null;
    let moon = null;
    let ip = -1;
    let iq = -1;
    for (let i = 0; i < count; i++) {
      if (objs[i].id === pair.planetId) {
        planet = objs[i];
        ip = i;
      } else if (objs[i].id === pair.moonId) {
        moon = objs[i];
        iq = i;
      }
    }
    if (!planet || !moon || !planet.alive || !moon.alive) continue;
    const t = tidalPairTerms(pair, planet, moon, G);
    const tx = -t.ry / t.d;
    const ty = t.rx / t.d;
    axOut[iq] += (t.force / moon.mass) * tx;
    ayOut[iq] += (t.force / moon.mass) * ty;
    axOut[ip] -= (t.force / planet.mass) * tx;
    ayOut[ip] -= (t.force / planet.mass) * ty;
  }
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
export const computeAccelerations = (
  objs,
  count,
  halo,
  allowCache,
  axOut,
  ayOut
) => {
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
  if (tidalPairs.length) applyTidalPairs(objs, count, axOut, ayOut);
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
export const applyIntegratorStep = (objs, count, dt, halo) => {
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

/**
 * Make the two-pass step's acceleration buffers hold `count` bodies.
 * The reassignment lives here, beside the buffers, because an importer cannot
 * assign to an imported binding; it reads `stepAx` and `stepAy` after this.
 *
 * @param {number} count - Bodies in the step
 */
export const ensureStepScratch = count => {
  if (stepAx.length < count) {
    stepAx = new Float64Array(Math.max(count, 256));
    stepAy = new Float64Array(stepAx.length);
  }
};
