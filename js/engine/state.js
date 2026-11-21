// The engine's state: body lists, settings, clocks, counters, the camera
// reference and the registries the render layer fills (D-DECOMP-18, S1).
// Everything else in the engine reads these, so they cannot leave js/physics.js
// without a cycle.
//
// Importers can read a binding but only this module assigns it, so every place
// that reassigns a list calls a setter below. `planets` here is a live binding:
// a step that replaces the list is seen everywhere, which is why the lists are
// `export let` and never copied. A test that captures one holds a detached list
// after the next step.
//
// js/physics.js re-exports these names. This module imports nothing that paints
// and nothing above the services layer.
import { setSimGravitationalConstant } from '../units.js';
import { clearFrameHistory } from '../referenceFrame.js';
import { SOLAR_MASS_KG, SOLAR_MASS_UNIT } from '../constants.js';
import { currentTier } from '../quality.js';
import { trailReferenceStep, trailSpanTime } from '../trailSpan.js';

// Global state variables
export let bh_list = [],
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

// One setter, named by list, for the sites that replace a list (step filters,
// merger purges, particle refresh). An unknown name throws.
const assignList = {
  bh_list: l => (bh_list = l),
  planets: l => (planets = l),
  stars: l => (stars = l),
  gas_giants: l => (gas_giants = l),
  asteroids: l => (asteroids = l),
  comets: l => (comets = l),
  debris: l => (debris = l),
  particles: l => (particles = l),
  gwaves: l => (gwaves = l),
  gravity_ripples: l => (gravity_ripples = l),
  neutron_stars: l => (neutron_stars = l),
  white_dwarfs: l => (white_dwarfs = l),
  galaxies: l => (galaxies = l),
  accretion_disk_particles: l => (accretion_disk_particles = l),
};
export const setBodyList = (name, list) => {
  assignList[name](list);
};

export let PhysicsObject_id_counter = 0;

/** @returns {number} The next body id; ids are handed out in construction order. */
export const nextPhysicsObjectId = () => PhysicsObject_id_counter++;

// Import state from ui.js to ensure single source of truth
export let state = null;

// Function to set state reference from ui.js
export const setStateReference = stateRef => {
  state = stateRef;
};

// Body painting lives in js/bodyDraw.js and js/bodyDrawSky.js, registered by
// kind. A kind with no drawer draws nothing (a worker has no canvas); a page
// with a canvas and no drawers gets one warning: a missing import.
const bodyDrawers = Object.create(null);
let drawersSeen = false; // registered, or already warned about
export const registerBodyDrawers = table => {
  drawersSeen = true;
  return Object.assign(bodyDrawers, table);
};
export const paintBody = (o, ctx, kind) => {
  if (bodyDrawers[kind]) return bodyDrawers[kind](o, ctx);
  if (drawersSeen || typeof document === 'undefined') return;
  drawersSeen = true;
  console.warn('No body drawers are registered: import js/bodyDraw.js.');
};

// js/bodyEffects.js files the particle pool (registerEffects). Until then it
// spawns nothing but hands back a scratch particle, so every explosion builder
// takes the same random draws in any realm: the collision stream must not
// depend on what was imported.
const scratchParticle = {};
const emptyPool = {
  getParticle: () => scratchParticle,
  updateAndCleanup() {},
  getActiveParticles: () => [],
  clear() {},
};
export let particlePool = emptyPool;

// js/bodyEffects.js also files a burst's look (size, color) and the tracer's
// color. How many particles, how fast, how long is the random draws, not
// appearance, so it stays here and an engine with no module takes them all the
// same (a look is then empty and nothing reads it).
export let effectLooks = {};
export let tracerColor = () => undefined;
export const registerEffects = ({ pool, looks, tracer }) => {
  if (pool) particlePool = pool;
  if (looks) effectLooks = looks;
  if (tracer) tracerColor = tracer;
};

// Physics settings that can be updated from UI.
//
// Twenty-six of these twenty-seven keys also appear in DEFAULT_SETTINGS in
// js/appState.js, and two disagree: gravitational_constant is 2.0 there and
// 1.0 here, trail_length 15 there and 100 here. Not a bug, but a trap.
//
// Bootstrap values only. Every path that runs the simulation calls
// updatePhysicsSettings(SETTINGS) first (js/world/build.js on every world
// build), merging the real settings over these. Nothing integrates an orbit at
// G = 1. These answer in the window before any world exists, and js/units.js
// is seeded from the same 1 so its conversions agree.
//
// Not imported from js/appState.js: that would make the engine depend on the
// interface's state module.
export let physicsSettings = {
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
  // Against direct N^2 on a 78-body cluster:
  //   theta 0.3 -> 0.20% mean / 2.6% worst error
  //   theta 0.4 -> 0.46% mean / 3.4% worst   <- default
  //   theta 0.7 -> 3.74% mean / 75.5% worst
  // 0.7 (the textbook value) costs the same as 0.4 and is far less accurate.
  barnes_hut_theta: 0.4,

  // A dark-matter halo as a smooth background field in the force law. Off by
  // default: it is a claim about the universe, so a student switches it on
  // deliberately. It is a field, not a body: no position to integrate, never
  // merged or captured, absent from the object counts.
  //
  // Which law governs a galaxy's outskirts: one enum rather than two booleans,
  // because the halo and MOND compete as explanations and applying both is
  // meaningless.
  //
  //   'newtonian'  visible matter only, and the curve falls
  //   'halo'       Newtonian gravity plus the pseudo-isothermal halo
  //   'mond'       Milgrom's law applied to the visible matter's own field
  //
  // `dark_matter_halo` stays as a mirror, not a second source of truth: older
  // scenarios, saves and links set the boolean, and normalizeGalaxyGravity()
  // keeps the two in step whichever a caller writes.
  galaxy_gravity: 'newtonian',
  dark_matter_halo: false,
  halo_v_flat: 6.0,
  halo_core_radius: 300,
  // What one simulation unit represents, for galaxy scale models. Zero means
  // "not a galaxy" and MOND refuses to run: a planetary system or black-hole
  // encounter has no defensible acceleration scale. See js/mond.js.
  galaxy_kpc_per_unit: 0,
  galaxy_msun_per_unit: 0,

  // The scheme the bodies are advanced with. Symplectic Euler has to stay the
  // default: every shipped scenario was tuned against its particular error, and
  // a more accurate scheme would change them all. See INTEGRATORS below.
  integrator: 'Symplectic Euler',
};

// =============================================================================
// Simulated time, and the accelerations the last step actually used
// -----------------------------------------------------------------------------
// Both let something outside the physics report on it without recomputing it:
// a readout that recalculated an acceleration would be a second force law,
// free to disagree with the integrator's.
// =============================================================================

// What pulls on what (docs/gravity-roles.md). Holes, stars and galaxies always
// pull; giants, neutron stars and white dwarfs unless only stars pull; planets
// and asteroids only with mutual gravity on and star-only gravity off; comets
// and debris never. A hole is pulled by holes only (and the halo or MOND),
// whatever it is near. The step's order is the summation order.
const SOURCE_ORDER = [
  ['bh_list', 'BlackHole', 0],
  ['stars', 'StarObject', 0],
  ['galaxies', 'Galaxy', 0],
  ['gas_giants', 'GasGiant', 1],
  ['neutron_stars', 'NeutronStar', 1],
  ['white_dwarfs', 'WhiteDwarf', 1],
  ['planets', 'Planet', 2],
  ['asteroids', 'Asteroid', 2],
  ['comets', 'Comet', 3],
];

/**
 * Which kind pulls on which under these settings. Whether a given body moves
 * at all is canMoveNow's, per body and per moment; the two are read together.
 * @param {object} s - Settings (mutual_gravity, star_only_gravity, bh_behavior)
 * @returns {{pulls: function(string, string): boolean, staticHoles: boolean}}
 *   `pulls(sourceKind, targetKind)` and whether holes are Static
 */
export const gravityRoles = s => {
  const only = s?.star_only_gravity === true;
  const tier = only ? 0 : s?.mutual_gravity ? 2 : 1;
  const src = new Set(SOURCE_ORDER.filter(r => r[2] <= tier).map(r => r[1]));
  return {
    pulls: (source, target) =>
      src.has(source) && (target !== 'BlackHole' || source === 'BlackHole'),
    staticHoles: s?.bh_behavior !== 'Orbiting',
  };
};

/**
 * The ordered pairs of these kinds where the first pulls the second and is not
 * pulled back: where total momentum is not conserved, by the model.
 * @param {string[]} kinds - Body kinds present
 * @param {object} s - Settings
 * @returns {Array<[string, string]>} [source, target] pairs
 */
export const oneWayPairs = (kinds, s) => {
  const { pulls } = gravityRoles(s);
  return kinds.flatMap(a =>
    kinds.filter(b => pulls(a, b) && !pulls(b, a)).map(b => [a, b])
  );
};

/** @returns {string[]} The kinds with a live body in the scene (debris aside) */
export const presentKinds = () => {
  const l = {
    bh_list,
    stars,
    galaxies,
    gas_giants,
    neutron_stars,
    white_dwarfs,
    planets,
    asteroids,
    comets,
  };
  return SOURCE_ORDER.filter(r =>
    l[r[0]].some(b => b && b.alive !== false)
  ).map(r => r[1]);
};

/** The lists the step sums as sources, in its order (js/engine/sources.js). */
export const sourceLists = s => {
  const { pulls } = gravityRoles(s);
  return SOURCE_ORDER.filter(r => pulls(r[1], 'Planet')).map(r => r[0]);
};

/**
 * Whether this body integrates its own motion now. A prescribed model moves
 * the body it owns; a Static hole is fixed once its grace period, in simulated
 * time, has run out, so a merger product does not freeze in flight.
 * @param {object} b - A body
 * @param {object} [s] - Settings (bh_behavior)
 * @returns {boolean} True when the engine moves it
 */
export const canMoveNow = (b, s = physicsSettings) =>
  !b?.model_owned &&
  (b?.kind !== 'BlackHole' ||
    s?.bh_behavior === 'Orbiting' ||
    (Boolean(b.isNewlyCreated) && b.graceUsed < b.movementGracePeriod));

export let simulationTime = 0;

/** @returns {number} Simulated time since the world was built, in sim units */
export const getSimulationTime = () => simulationTime;

/** Advance the simulated clock by one step. Called by updatePhysics only. */
export const advanceSimulationTime = dt => {
  simulationTime += dt;
};

/** Put the simulated clock back to zero. Called when a world is built. */
export const resetSimulationTime = () => {
  simulationTime = 0;
};

/**
 * Set the simulated clock, for a restored rather than built state.
 *
 * The A/B bench needs it: Run B resumes from the clock point Run A started at,
 * so the runs share one time axis. Nothing in the integrator reads the clock
 * (a readout and the conservation baseline's timestamp), so only the reported
 * time moves.
 *
 * @param {number} t - Simulated seconds
 */
export const setSimulationTime = t => {
  simulationTime = Number.isFinite(t) && t >= 0 ? t : 0;
};

/** How many bodies are on screen, for the crowded-field marker floor. */
export let liveBodyCount = 0;

/** Record how many bodies are on screen, for the crowding rule above. */
export const setLiveBodyCount = n => {
  liveBodyCount = n;
};

// 'bootstrap' until the first push, then the context that last pushed:
// 'application' (the page; every push is the whole of its SETTINGS, so G is
// the application's) or 'headless' (a Worker, tool, test or the validation
// suite, whose own fixtures, G = 1 included, are the input).
let engineContext = 'bootstrap';

/** @returns {string} 'bootstrap', 'application' or 'headless' */
export const getEngineContext = () => engineContext;

/**
 * Take a settings object: the one door into `physicsSettings`. Merges over the
 * copy and leaves it frozen, a projection of what was pushed. The page pushes
 * through commitSettings() in js/appState.js; any other caller is headless.
 *
 * @param {object} settings - Keys to merge in
 * @param {{engineContext?: 'application'|'headless'}} [options]
 */
export const updatePhysicsSettings = (settings, options = {}) => {
  const context = options.engineContext ?? 'headless';
  if (context !== 'application' && context !== 'headless')
    throw new TypeError(`unknown engine context "${context}"`);
  // An application push is its whole SETTINGS; less would leave the bootstrap G of 1.
  if (
    context === 'application' &&
    !Number.isFinite(settings?.gravitational_constant)
  )
    throw new TypeError('an application push carries gravitational_constant');
  engineContext = context;
  physicsSettings = Object.freeze(
    normalizeGalaxyGravity({ ...physicsSettings, ...settings }, settings)
  );
  // js/units.js takes G from here, the one place physicsSettings is written.
  setSimGravitationalConstant(physicsSettings.gravitational_constant);
  return physicsSettings;
};

/**
 * Keep the galaxy-gravity mode and the legacy halo boolean in step.
 *
 * The halo and MOND are alternatives, so at most one is in the force law; the
 * enum makes "both" unsayable and this stops the old boolean saying it.
 *
 * Which wins when a caller writes both is decided by what this patch asked
 * for, not what was there: `updatePhysicsSettings({ galaxy_gravity: 'mond' })`
 * turns the halo off, and a save that only knows `dark_matter_halo` still works.
 *
 * @param {object} next - The merged settings
 * @param {object} patch - Only the keys this call supplied
 * @returns {object} The merged settings, made self-consistent
 */
const normalizeGalaxyGravity = (next, patch = {}) => {
  const wroteMode = Object.hasOwn(patch, 'galaxy_gravity');
  const wroteHalo = Object.hasOwn(patch, 'dark_matter_halo');

  let mode = next.galaxy_gravity;

  // Both named in one patch, and disagreeing: a caller merges a 'newtonian'
  // baseline with an override turning the halo on (the validation harness did,
  // and it silently switched the halo off). Resolved toward the positive
  // assertion: `dark_matter_halo: true` asks for something, where 'newtonian'
  // is usually a baseline with no opinion.
  if (wroteHalo && wroteMode && patch.dark_matter_halo === true) {
    mode = 'halo';
  } else if (wroteHalo && !wroteMode) {
    // A caller that only knows the boolean: on means the halo, off means
    // Newtonian, but not when MOND is running (the boolean was already false).
    if (patch.dark_matter_halo === true) mode = 'halo';
    else if (mode === 'halo') mode = 'newtonian';
  }
  if (mode !== 'halo' && mode !== 'mond') mode = 'newtonian';

  // MOND needs a scale to convert a0 into; without one the mode falls back.
  if (
    mode === 'mond' &&
    !(next.galaxy_kpc_per_unit > 0 && next.galaxy_msun_per_unit > 0)
  ) {
    mode = 'newtonian';
  }

  next.galaxy_gravity = mode;
  next.dark_matter_halo = mode === 'halo';
  return next;
};

/**
 * Read a single physics setting. Lets other modules observe the live physics
 * configuration without importing the mutable object itself.
 * @param {string} key - Setting name
 * @returns {any} Current value
 */
export const getPhysicsSetting = key => physicsSettings[key];

// Adaptive level-of-detail multiplier owned by the renderer (render.js). Apart
// from physicsSettings so it is never saved or written over a user setting.
export let detailScale = 1;

/**
 * Set the adaptive level-of-detail multiplier.
 * @param {number} scale - Multiplier applied to detail budgets (clamped 0.5-1.5)
 */
export const setDetailScale = scale => {
  // Capped at 1: adaptive detail only trims below what the user asked for.
  detailScale =
    typeof scale === 'number' && isFinite(scale)
      ? Math.max(0.5, Math.min(1, scale))
      : 1;
};

/**
 * Get the current adaptive level-of-detail multiplier.
 * @returns {number} Current detail scale
 */
/** Sample counter for trails. */
export let trailTick = 0;

let trailTime = 0;
let lastTrailSample = -Infinity;

/**  */
export const getTrailTick = () => trailTick;

/**  */
export const getTrailTime = () => trailTime;

/** Count one trail sample, unconditionally. Used by the tests. */
export const advanceTrailTick = () => {
  trailTick++;
};

/** The simulated time between two trail samples. */
export const trailSampleInterval = () => {
  const thin = currentTier() === 'low' ? 2 : 1;
  return (
    (trailReferenceStep(
      physicsSettings.max_timestep,
      physicsSettings.sim_speed
    ) *
      thin) /
    (detailScale > 0 ? detailScale : 1)
  );
};

/** How much simulated time a trail covers: trail_length reference steps. */
export const trailSpan = () =>
  trailSpanTime(
    physicsSettings.trail_length,
    physicsSettings.max_timestep,
    physicsSettings.sim_speed
  );

/** Advance the trail clock by one physics step and say whether this step is a */
export const advanceTrailClock = dt => {
  trailTime += Math.abs(dt) || 0;
  if (trailTime - lastTrailSample < trailSampleInterval() * (1 - 1e-9)) {
    return false;
  }
  lastTrailSample = trailTime;
  trailTick++;
  return true;
};

/** Restart the trail clock and drop frame history. Called when the world is rebuilt. */
export const resetTrailTick = () => {
  trailTick = 0;
  trailTime = 0;
  lastTrailSample = -Infinity;
  clearFrameHistory();
};

/** The most trail samples a body keeps. */
export const trailBudget = () =>
  Math.max(1, Math.round(physicsSettings.trail_length) || 1);

export const getDetailScale = () => detailScale;

/**
 * Reset the physics object ID counter to 0
 */
export const resetPhysicsObjectCounter = () => {
  PhysicsObject_id_counter = 0;
};

/**
 * Set the physics object ID counter to a specific value
 * @param {number} value - The new counter value
 */
export const setPhysicsObjectCounter = value => {
  PhysicsObject_id_counter = value;
};

// Bumped whenever the object lists are repopulated. The cache keyed only off
// list *lengths*, so rebuilding a scenario into the same shape (Refresh
// Scenario, a lesson re-applying its setup) left cachedAllPhysicsObjects holding
// discarded objects: the integrator advanced bodies no longer in the simulation
// while the renderer drew the new ones.
export let worldGeneration = 0;
let interventionEpoch = 0;

/** Invalidate the physics caches. Call after repopulating the object lists. */
export const bumpWorldGeneration = () => {
  worldGeneration++;
};

/**
 * Which world this is.
 *
 * Bumped on every repopulation, so it tells apart worlds a body id cannot: ids
 * restart from a counter, and a rebuilt scenario hands the same id to a
 * different star. The observing panels put it in a recording's identity so a
 * recording of one star is never continued against its replacement.
 *
 * @returns {number} A counter, meaningful only by comparison
 */
export const getWorldGeneration = () => worldGeneration;

/**
 * How many times a body's state has been changed by hand.
 *
 * Unlike the world generation (rebuilds) this counts interventions: a maneuver
 * burn, a bench perturbation. The target's identity does not show them, and an
 * observing session needs to know: a radial-velocity curve recorded before a
 * burn describes an orbit the planet has left, and continuing it would splice
 * two systems into one dataset.
 *
 * @returns {number} A counter, meaningful only by comparison
 */
export const getInterventionEpoch = () => interventionEpoch;

/**
 * Record that a body's state was changed by hand rather than by integration.
 *
 * @returns {number} The new epoch
 */
export function noteIntervention() {
  return ++interventionEpoch;
}

// What the engine reads of the settings, for the conservation and energy module
// (S3) and the slices after it: pure readers over `physicsSettings`, the mass
// anchor, and the Barnes-Hut failure flag with its one writer.
// Softening floor on the gravity calculation, so a near-miss gives no singular
// force. Five units suits scenarios of hundreds of units and is wrong for a
// compact one: TRAPPIST-1's seven planets orbit at 1.15 to 6.19 units, so six
// sat inside the floor, felt a fraction of their gravity and left on hyperbolic
// orbits within a few hundred circuits at any timestep. A scenario can lower it.
export const MIN_INTERACTION_DISTANCE = 5.0;

/**
 * The softening floor currently in force.
 *
 * The one authority, exported because there was briefly a second. Zero in
 * `min_interaction_distance` means "no scenario has an opinion, use the
 * default", not "no floor". js/cr3bpPanel.js took the raw zero at face value,
 * so a compact system inside the five-unit default was validated as Newtonian
 * while the engine clamped every force in it.
 *
 * Anything that needs what the force law is doing (integrator, potential, a
 * teaching overlay's closed-form claims) asks this; nothing else re-reads the
 * setting or carries the fallback.
 *
 * @returns {number} The floor, in simulation length units
 */
export const minInteractionDistance = () => {
  const v = physicsSettings.min_interaction_distance;
  return Number.isFinite(v) && v > 0 ? v : MIN_INTERACTION_DISTANCE;
};

// Kilograms in one simulation mass unit. The solar mass is the anchor and the
// one conversion the small-body units may go through: a second route could
// disagree with it, as JUPITER_MASS_UNIT and EARTH_MASS_UNIT both did.
export const MASS_UNIT_KG = SOLAR_MASS_KG / SOLAR_MASS_UNIT;

/** The schemes, by the label the settings dropdown uses. */
export const INTEGRATORS = ['Symplectic Euler', 'Velocity Verlet', 'RK4'];

/**
 * The scheme in force, always one of INTEGRATORS. Anything unrecognized
 * resolves to symplectic Euler rather than throwing, so an old link or
 * scenario naming a vanished scheme loads into the default.
 *
 * @returns {string} The active scheme's label
 */
export const activeIntegrator = () => {
  const want = physicsSettings.integrator;
  return INTEGRATORS.includes(want) ? want : 'Symplectic Euler';
};

let workerFailed = null;
export const setWorkerFailed = why => {
  workerFailed = why;
};

/**
 * Whether the Barnes-Hut worker path is currently driving gravity.
 * @returns {boolean} True when approximate tree gravity is active
 */
export const isBarnesHutActive = () =>
  physicsSettings.mutual_gravity === true &&
  physicsSettings.use_barnes_hut === true &&
  !workerFailed;
