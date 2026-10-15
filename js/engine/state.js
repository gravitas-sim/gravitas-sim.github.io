// The engine's state: the body lists, the settings, the clocks and counters,
// the camera reference and the registries that the render layer fills
// (D-DECOMP-18, slice S1). Everything else in the engine reads these and cannot
// leave js/physics.js without a cycle until they have a home.
//
// ES module bindings can be read by every importer and assigned only here, so
// each place that used to reassign one of them now calls a setter below. An
// importer's `planets` is this module's `planets`, a live binding, and a step
// that replaces the list is seen by every importer; that is why the lists are
// `export let` and never copied into another object. A test that captures one
// once holds a detached list after the next step, as it always did.
//
// js/physics.js is the facade: it re-exports these names, so no importer changes.
// This module imports nothing that paints and nothing above the services layer.
import { setSimGravitationalConstant } from '../units.js';
import { clearFrameHistory } from '../referenceFrame.js';

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

// One setter, named by list, for the sites that replace a list (the step's
// filters, the mergers' purges, the particle refresh). An unknown name throws
// rather than creating a list nobody reads.
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

// How a body is painted lives in js/bodyDraw.js and js/bodyDrawSky.js,
// registered by kind so this module imports nothing that paints. A kind with
// no drawer draws nothing (a worker has no canvas); a page with a canvas and no
// drawers at all gets one warning, the mark of a missing import.
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

// The particle pool is filed by js/bodyEffects.js (registerEffects). Until then
// the pool spawns nothing, but it hands back a scratch particle, so every
// explosion builder below takes the same random draws in any realm: the stream
// the collisions draw from must not depend on what was imported.
const scratchParticle = {};
const emptyPool = {
  getParticle: () => scratchParticle,
  updateAndCleanup() {},
  getActiveParticles: () => [],
  clear() {},
};
export let particlePool = emptyPool;

// What a burst looks like (size and color) and the tracer's color are filed by
// js/bodyEffects.js with the pool. How many particles a burst throws, how fast
// and for how long is not appearance: it is the random draws, so it stays here
// and an engine with no module takes them all the same (a look is then empty
// and nothing reads it).
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
// js/appState.js, and two of them disagree with it: gravitational_constant is
// 2.0 there and 1.0 here, trail_length is 15 there and 100 here. That is not a
// bug, but it is a trap, so it is written down.
//
// These are bootstrap values only. Every path that runs the simulation calls
// updatePhysicsSettings(SETTINGS) first - js/world/build.js does it on every
// world build - which merges the real settings over the top. Nothing integrates
// an orbit at G = 1. The values here are what the module answers with in the
// window before any world exists, and js/units.js is seeded from the same 1 so
// that its conversions agree with whatever this object says at the time.
//
// They are deliberately not imported from js/appState.js: that would make the
// engine depend on the interface's state module, which is the dependency this
// file has spent this pass getting rid of.
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
  // Which law governs a galaxy's outskirts. One setting with three values
  // rather than two booleans, because the halo and MOND are competing
  // explanations for the same observation and applying both at once would be
  // physically meaningless. An enum cannot express that mistake.
  //
  //   'newtonian'  visible matter only, and the curve falls
  //   'halo'       Newtonian gravity plus the pseudo-isothermal halo
  //   'mond'       Milgrom's law applied to the visible matter's own field
  //
  // `dark_matter_halo` is kept alongside it as a mirror, not as a second source
  // of truth: scenarios, saved games and shared links written before this
  // existed all set the boolean, and normalizeGalaxyGravity() below keeps the
  // two in step whichever one a caller writes.
  galaxy_gravity: 'newtonian',
  dark_matter_halo: false,
  halo_v_flat: 6.0,
  halo_core_radius: 300,
  // What one simulation unit represents, for the scenarios that are scale
  // models of a galaxy. Zero means "this is not a galaxy", and MOND refuses to
  // run: there is no defensible acceleration scale for a planetary system or a
  // black-hole encounter, and applying one silently would be worse than
  // refusing. See js/mond.js.
  galaxy_kpc_per_unit: 0,
  galaxy_msun_per_unit: 0,

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
export const setSimulationTime = t => {
  simulationTime = Number.isFinite(t) && t >= 0 ? t : 0;
};

/** How many bodies are on screen, for the crowded-field marker floor. */
export let liveBodyCount = 0;

/** Record how many bodies are on screen, for the crowding rule above. */
export const setLiveBodyCount = n => {
  liveBodyCount = n;
};

// Function to update physics settings
export const updatePhysicsSettings = settings => {
  physicsSettings = normalizeGalaxyGravity(
    {
      ...physicsSettings,
      ...settings,
    },
    settings
  );
  // js/units.js derives the length of a time unit from G, and used to import
  // getPhysicsSetting to read it - which made the foundation layer depend on
  // the engine. It is pushed from here instead, which is the one place
  // physicsSettings is ever written.
  setSimGravitationalConstant(physicsSettings.gravitational_constant);
};

/**
 * Keep the galaxy-gravity mode and the legacy halo boolean in step.
 *
 * There is one rule and it is enforced here rather than at every call site:
 * the halo and MOND are alternatives, so at most one of them can be in the
 * force law. Expressing the mode as an enum makes "both at once" unsayable;
 * this function is what stops the old boolean from saying it anyway.
 *
 * Which one wins when a caller writes both is decided by what the caller
 * actually asked for in this patch, not by what was already there - so
 * `updatePhysicsSettings({ galaxy_gravity: 'mond' })` turns the halo off, and
 * a saved game that only knows about `dark_matter_halo` still works.
 *
 * @param {object} next - The merged settings
 * @param {object} patch - Only the keys this call supplied
 * @returns {object} The merged settings, made self-consistent
 */
const normalizeGalaxyGravity = (next, patch = {}) => {
  const wroteMode = Object.hasOwn(patch, 'galaxy_gravity');
  const wroteHalo = Object.hasOwn(patch, 'dark_matter_halo');

  let mode = next.galaxy_gravity;

  // Both named in one patch, and disagreeing. This happens when a caller merges
  // a baseline that says 'newtonian' with an override that says the halo is on
  // - which is exactly what the validation harness does, and it silently
  // switched the halo off until this branch existed.
  //
  // Resolved toward the positive assertion: `dark_matter_halo: true` is
  // somebody asking for something, where 'newtonian' is usually a baseline with
  // no opinion. The state that comes out is consistent either way; this only
  // decides which of two contradictory requests is honored.
  if (wroteHalo && wroteMode && patch.dark_matter_halo === true) {
    mode = 'halo';
  } else if (wroteHalo && !wroteMode) {
    // A caller that only knows the boolean. Turning the halo on means the halo;
    // turning it off means plain Newtonian - but not if MOND is what is
    // running, because then the boolean was already false and saying so again
    // should not silently switch the mode.
    if (patch.dark_matter_halo === true) mode = 'halo';
    else if (mode === 'halo') mode = 'newtonian';
  }
  if (mode !== 'halo' && mode !== 'mond') mode = 'newtonian';

  // MOND needs a scale to convert a0 into. Without one it is not applied, and
  // the mode falls back rather than pretending.
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

// Adaptive level-of-detail multiplier owned by the renderer (see render.js).
// Kept separate from physicsSettings so it can never be persisted to a save
// file or written back over a user setting.
export let detailScale = 1;

/**
 * Set the adaptive level-of-detail multiplier.
 * @param {number} scale - Multiplier applied to detail budgets (clamped 0.5-1.5)
 */
export const setDetailScale = scale => {
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
export let trailTick = 0;

/** @returns {number} The tick of the most recent trail sample */
export const getTrailTick = () => trailTick;

/** Count one trail sample. Called by updatePhysics once per step. */
export const advanceTrailTick = () => {
  trailTick++;
};

/** Restart the trail clock and drop frame history. Called when the world is rebuilt. */
export const resetTrailTick = () => {
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
export const trailBudget = () => {
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

// Bumped whenever the object lists are repopulated. The cache below keyed only
// off list *lengths*, so rebuilding a scenario into the same shape (Refresh
// Scenario, or a lesson re-applying its setup) left cachedAllPhysicsObjects
// holding the discarded objects: the integrator went on advancing bodies that
// were no longer in the simulation while the renderer drew the new ones.
export let worldGeneration = 0;
let interventionEpoch = 0;

/** Invalidate the physics caches. Call after repopulating the object lists. */
export const bumpWorldGeneration = () => {
  worldGeneration++;
};

/**
 * Which world this is.
 *
 * Bumped on every repopulation of the object lists, so it distinguishes two
 * worlds that a body id cannot: ids restart from a counter, and a rebuilt
 * scenario hands the same id to a different star. The observing panels put this
 * in a recording's identity for exactly that reason - without it, a recording
 * of one star could be continued against its replacement.
 *
 * @returns {number} A counter, meaningful only by comparison
 */
export const getWorldGeneration = () => worldGeneration;

/**
 * How many times a body's state has been changed by hand.
 *
 * Distinct from the world generation, which counts rebuilds. This counts
 * interventions: a maneuver burn, a bench perturbation - the same objects,
 * moving differently because somebody made them. An observing session cannot
 * see the difference from the target's identity, and it matters to one: a
 * radial-velocity curve recorded before a burn is a recording of an orbit the
 * planet is no longer on, and continuing it afterwards would splice two
 * different systems into one dataset.
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
