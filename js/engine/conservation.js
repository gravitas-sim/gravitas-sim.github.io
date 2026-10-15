// The engine's conservation and energy accounting (D-DECOMP-18, slice S3): the
// absorption ledgers, the live drift diagnostics and the energy history. It reads
// the state module and writes only its own ledgers, caches and history.
import { AU_METERS, G_SI } from '../constants.js';
import { debugLog } from '../utils.js';
import {
  bh_list,
  stars,
  neutron_stars,
  white_dwarfs,
  planets,
  gas_giants,
  asteroids,
  comets,
  galaxies,
  physicsSettings,
  simulationTime,
  worldGeneration,
  state,
  minInteractionDistance,
  activeIntegrator,
  isBarnesHutActive,
  MASS_UNIT_KG,
} from './state.js';

// Absorption accounting: what absorb_into_black_hole banks and discards.
let absorbedSpinAngularMomentum = 0;
let discardedAbsorptionMomentum = { x: 0, y: 0 };

/**
 * The angular momentum banked as black-hole spin by every absorption so far.
 * @returns {number} Sum of mu * (r_rel x v_rel), in simulation units
 */
export const getAbsorbedSpinAngularMomentum = () => absorbedSpinAngularMomentum;

/**
 * The linear momentum absorption has thrown away in static and one-way-gravity
 * configurations, where the hole is not a dynamical participant.
 * @returns {{x: number, y: number}} Running total
 */
export const getDiscardedAbsorptionMomentum = () => ({
  ...discardedAbsorptionMomentum,
});

/** Clear the absorption accounting. Called when a world is built. */
export const resetAbsorptionAccounting = () => {
  absorbedSpinAngularMomentum = 0;
  discardedAbsorptionMomentum = { x: 0, y: 0 };
};

/** Bank the spin angular momentum one absorption carried into the hole. */
export const bankAbsorbedSpin = spin => {
  absorbedSpinAngularMomentum += spin;
};

/** Add the linear momentum an absorption by a fixed or one-way hole discarded. */
export const bankDiscardedMomentum = (px, py) => {
  discardedAbsorptionMomentum.x += px;
  discardedAbsorptionMomentum.y += py;
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
export const conservedQuantities = () => {
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
  // The size of the terms the totals are made of, accumulated alongside them.
  //
  // A total can be small because nothing is happening or because two large
  // numbers nearly canceled, and a percentage cannot tell those apart: a
  // marginally bound system has kinetic and potential energies of the same
  // magnitude and opposite sign, so its total is near zero and a relative
  // drift figure divides by nearly nothing. These scales are what let the
  // caller notice that before printing 40,000%.
  //
  // They cost two additions per body inside a loop that already does the
  // multiplications, and they change no total.
  let energyScale = 0;
  let angularScale = 0;
  for (let i = 0; i < n; i++) {
    const b = bodies[i];
    const kinetic = 0.5 * mass[i] * (b.vel.x * b.vel.x + b.vel.y * b.vel.y);
    const spin = mass[i] * ((px[i] - ox) * b.vel.y - (py[i] - oy) * b.vel.x);
    energy += kinetic;
    angular += spin;
    energyScale += kinetic;
    angularScale += Math.abs(spin);
    const gmi = G * mass[i];
    let pot = 0;
    for (let j = i + 1; j < n; j++) {
      const dx = px[i] - px[j];
      const dy = py[i] - py[j];
      const r2 = dx * dx + dy * dy;
      if (r2 > 0) pot -= mass[j] / Math.sqrt(r2);
    }
    energy += gmi * pot;
    energyScale += Math.abs(gmi * pot);
  }
  return { energy, angular, energyScale, angularScale, count: n };
};

/**
 * Is a relative drift figure meaningful against this baseline?
 *
 * A percentage of a total that is itself the difference of two much larger
 * numbers is an amplified rounding error wearing a per-cent sign. The test is
 * conditioning, not size: a baseline is usable when it is not vanishingly
 * small compared with the terms that produced it.
 *
 * The threshold is one part in a thousand, and it is chosen rather than tuned.
 * Below it, a change of one part in a thousand of the *terms* - which is a
 * perfectly ordinary amount of integration error over a long run - moves the
 * reported percentage by 100% or more, so the figure says more about the
 * cancellation than about the integrator. Above it the amplification is at
 * most a thousandfold and the number still means something.
 *
 * This is deliberately not a list of scenarios. A marginally bound pair, a
 * system whose net angular momentum happens to cancel, and an empty sandbox
 * all fail it for the same reason, and a new scenario that does the same will
 * fail it without anybody adding a case.
 */
const CONDITION_FLOOR = 1e-3;

/**
 * @param {number} total - The baseline total
 * @param {number} scale - The sum of the magnitudes it was built from
 * @returns {boolean} True when a percentage of `total` is worth printing
 */
const wellConditioned = (total, scale) =>
  Number.isFinite(total) &&
  Number.isFinite(scale) &&
  scale > 0 &&
  Math.abs(total) >= CONDITION_FLOOR * scale;

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
export const resetConservationBaseline = () => {
  invalidateConservationCache();
  const now = conservedQuantities();
  conservationBaseline = {
    energy: now.energy,
    angular: now.angular,
    // Kept so the drift figure can tell a small total from a canceled one.
    energyScale: now.energyScale,
    angularScale: now.angularScale,
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
export const conservationCaveats = () => {
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
  if (physicsSettings.galaxy_gravity === 'halo') {
    out.push('caveat.halo');
  }
  if (physicsSettings.galaxy_gravity === 'mond') {
    out.push('caveat.mond');
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
export const conservationDrift = (fresh = false) => {
  if (!conservationBaseline) return null;
  const now = cachedConservedQuantities(fresh);
  const e0 = conservationBaseline.energy;
  const l0 = conservationBaseline.angular;
  // Conditioned against the baseline's own scale, not the current one: the
  // question is whether the number being divided by was ever a usable
  // denominator.
  const energyOk = wellConditioned(e0, conservationBaseline.energyScale);
  const angularOk = wellConditioned(l0, conservationBaseline.angularScale);
  return {
    energy: now.energy,
    angular: now.angular,
    baselineEnergy: e0,
    baselineAngular: l0,
    // NaN where a percentage would be an amplified cancellation rather than a
    // measurement. The absolute changes below are always available, and are
    // what a caller should show instead of an enormous figure.
    energyDrift: energyOk ? (100 * (now.energy - e0)) / Math.abs(e0) : NaN,
    angularDrift: angularOk ? (100 * (now.angular - l0)) / Math.abs(l0) : NaN,
    energyChange: now.energy - e0,
    angularChange: now.angular - l0,
    energyConditioned: energyOk,
    angularConditioned: angularOk,
    energyScale: conservationBaseline.energyScale,
    angularScale: conservationBaseline.angularScale,
    count: now.count,
    baselineCount: conservationBaseline.count,
    baselineTime: conservationBaseline.atTime,
    elapsed: simulationTime - conservationBaseline.atTime,
    integrator: activeIntegrator(),
    caveats: conservationCaveats(),
  };
};

// ===== ENERGY SYSTEM =====
// Fresh energy calculation and tracking system

// Energy system configuration
export const ENERGY_SAMPLE_RATE = 10; // Sample energy every 10 frames (100ms at 60fps)
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
// length (DISTANCE_UNIT_TO_M meters per unit). The time unit is not free once
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
export const calculateKineticEnergy = object =>
  calculateKineticEnergySim(object) * getSimEnergyToJoules();

/**
 * Calculate gravitational potential energy between two objects
 * @param {Object} obj1 - First physics object
 * @param {Object} obj2 - Second physics object
 * @param {number} distance - Distance between objects in simulation units
 * @returns {number} Gravitational potential energy in joules
 */
export const calculateGravitationalPotentialEnergy = (obj1, obj2, distance) => {
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
export const calculateTotalPotentialEnergy = (object, allObjects) =>
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
export const calculateObjectEnergy = (object, timestamp, allObjects) => {
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
export const getAllPhysicsObjects = () => {
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
export const updateEnergyHistory = () => {
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
export const getObjectEnergyHistory = objectId => {
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
export const clearObjectEnergyHistory = objectId => {
  if (objectId !== undefined && objectId !== null) {
    energyHistory.delete(objectId);
  }
};

/**
 * Clear energy history for a specific object (alias for consistency)
 * @param {string|number} objectId - ID of the object
 */
export const clearEnergyHistory = objectId => {
  clearObjectEnergyHistory(objectId);
};

/**
 * Clear all energy history
 */
export const clearAllEnergyHistory = () => {
  energyHistory.clear();
};

/**
 * Get energy statistics for an object
 * @param {string|number} objectId - ID of the object
 * @returns {Object} Energy statistics object
 */
export const getObjectEnergyStats = objectId => {
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
export const getEnergySystemMemoryStats = () => {
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
export const updateEnergySystemConfig = config => {
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
export const trimAllEnergyHistory = (maxPoints = MAX_ENERGY_HISTORY_POINTS) => {
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
