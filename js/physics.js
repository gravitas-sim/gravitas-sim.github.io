// Import utility functions
import { SOLAR_MASS_UNIT, EARTH_MASS_UNIT } from './constants.js';
import {
  debugLog,
  hexToRgb,
  worldToScreen,
  screenToWorld,
  isOffscreen,
} from './utils.js';
import { recordBarycenter } from './referenceFrame.js';
import { followCamera, resetFollowCamera } from './followCamera.js';
// The drawing policy, as far as the engine reads it (tests/bodyVisuals.test.js).
import { hitRadius, DISPLAY_MIN_PX } from './bodyVisuals.js';
// Re-exported for the drawers: the engine still reaching these keeps the build's
// chunk groups, and every route's request count, as they were.
export { currentTier } from './quality.js';
export { stellarPropertiesFor } from './habitability.js';
// The forces and the integrators (D-DECOMP-18, slice S4).
import {
  accelerationBreakdown,
  activeHalo,
  applyIntegratorStep,
  cachedMajorSources,
  computeAccelerations,
  ensureStepScratch,
  gravitational_acceleration,
  gravitySourcesFor,
  getMostMassiveBody,
  publishStepAccelerations,
  sampleTwoBodyOrbit,
  stepAx,
  stepAy,
} from './engine/forces.js';
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
  resetPhysicsObjectCounter,
  setPhysicsObjectCounter,
  state,
  setStateReference,
  registerBodyDrawers,
  particlePool,
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
  clearObjectEnergyHistory,
  clearEnergyHistory,
  updateEnergyHistory,
} from './engine/conservation.js';
// The events and the step listeners (slice S2), re-exported live.
import {
  announceWorkerFailed,
  completeMerger,
  mergeAllowed,
  mergedState,
  runStepListeners,
} from './engine/events.js';
import {
  DT,
  ABSORB_BUFFER,
  BH_RADIUS_BASE,
  PLANET_RADIUS,
  GAS_GIANT_RADIUS,
  ASTEROID_RADIUS,
  STAR_OBJ_RADIUS,
  NEUTRON_STAR_RADIUS,
  WHITE_DWARF_RADIUS,
  DEBRIS_RADIUS,
  MAX_STAR_MASS_BEFORE_BH,
  GAS_GIANT_TO_STAR_THRESHOLD,
  JUPITER_MASS_UNIT,
  CERES_MASS_UNIT,
  HALLEY_MASS_UNIT,
  DEBRIS_MASS_UNIT,
  burst,
  absorb_into_black_hole,
  PhysicsObject,
  Planet,
  GasGiant,
  Asteroid,
  Debris,
  AccretionDiskParticle,
  StarObject,
  NeutronStar,
  WhiteDwarf,
  GALAXY_RADIUS,
  Galaxy,
  Comet,
  syncReportedMass,
} from './engine/bodies.js';
import { defaultAppearance, BlackHole } from './engine/blackHole.js';
// Collisions, mergers and their explosions (slice S6).
import {
  asPhysicsObject,
  check_stellar_collapse,
  handle_collisions,
  handle_gas_giant_accretion,
  handle_gas_giant_merging,
  handle_rocky_collisions,
  handle_star_merging,
  handle_star_object_collisions,
} from './engine/collisions.js';
export { simulation, onPhysicsStep } from './engine/events.js';
export { NOMINAL_RADIUS } from './engine/bodies.js';
export { className } from './engine/collisions.js';
export {
  getWorldGeneration,
  getInterventionEpoch,
  noteIntervention,
} from './engine/state.js';

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

// Physics optimization: Cache arrays to avoid repeated spread operations
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
  ensureStepScratch(stepCount);

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
