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
 * A trail sample is taken when a fixed slice of simulated time has passed, not
 * once per physics step (js/trailSpan.js), so a shared counter is enough to say
 * which samples were taken at the same moment. That is what lets one body's
 * trail be re-expressed in another body's frame: without a common clock the two
 * arrays are just two lists of coordinates, and lining them up by array index
 * breaks the moment one body is younger than the other.
 */
export let trailTick = 0;

// Simulated time the trail clock has run, always forward, and when the last
// sample was taken. Separate from simulationTime: a scrub or a lesson may set
// that back, and a trail's age must never run backwards with it.
let trailTime = 0;
let lastTrailSample = -Infinity;

/** @returns {number} The tick of the most recent trail sample */
export const getTrailTick = () => trailTick;

/** @returns {number} The simulated time the trail clock has run */
export const getTrailTime = () => trailTime;

/** Count one trail sample, unconditionally. Used by the tests. */
export const advanceTrailTick = () => {
  trailTick++;
};

/**
 * The simulated time between two trail samples.
 *
 * One reference step at the full tier. The low tier and the adaptive detail
 * scale thin the samples, never the span: a coarser trail is the same stretch
 * of orbit drawn with fewer points.
 *
 * @returns {number} Simulation time units
 */
export const trailSampleInterval = () => {
  const thin = currentTier() === 'low' ? 2 : 1;
  return (
    (trailReferenceStep(physicsSettings.max_timestep) * thin) /
    (detailScale > 0 ? detailScale : 1)
  );
};

/**
 * How much simulated time a trail covers: trail_length reference steps.
 *
 * @returns {number} Simulation time units
 */
export const trailSpan = () =>
  trailSpanTime(physicsSettings.trail_length, physicsSettings.max_timestep);

/**
 * Advance the trail clock by one physics step and say whether this step is a
 * trail sample.
 *
 * Called by updatePhysics once per step, before anything appends. A step longer
 * than the interval is always a sample; a shorter one is a sample only when the
 * interval has passed, which is what keeps the span the same at 30, 60 and 144
 * frames per second.
 *
 * @param {number} dt - The step, simulation time units (its size only)
 * @returns {boolean} True when the bodies should append a trail point
 */
export const advanceTrailClock = dt => {
  trailTime += Math.abs(dt) || 0;
  // A hair under the interval, so 20 steps of a twentieth are one sample and
  // not a sample twenty-one steps later for want of a rounding error.
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

/**
 * The most trail samples a body keeps.
 *
 * The span is set by time (trailSpan), so this is only the ceiling on how many
 * points that can be, and the length the barycenter history is kept to so it
 * always covers the trails. It no longer follows the zoom: a trail that
 * shortened when the view zoomed out would not be a stated stretch of time.
 *
 * @returns {number} Sample budget, at least 1
 */
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

// What the engine reads of the settings, for the conservation and energy module
// (S3) and the slices after it: pure readers over `physicsSettings`, the mass
// anchor, and the Barnes-Hut failure flag with its one writer.
// Softening floor on the gravity calculation, to keep a near-miss from
// producing a singular force. Five units is right for scenarios laid out at
// hundreds of units, and completely wrong for a compact one: TRAPPIST-1's seven
// planets orbit between 1.15 and 6.19 units of their star, so six of them sat
// inside the floor, felt a fraction of the gravity they should, and left on
// hyperbolic orbits within a few hundred circuits regardless of timestep. A
// scenario can lower it to suit its own scale.
export const MIN_INTERACTION_DISTANCE = 5.0;

/**
 * The softening floor currently in force.
 *
 * The one authority on the question, and exported because there was briefly a
 * second. `min_interaction_distance` is zero in DEFAULT_SETTINGS and zero here
 * means "no scenario has an opinion, use the default" - it does not mean "no
 * floor". js/cr3bpPanel.js read the raw setting and took the zero at face
 * value, so a compact system sitting well inside the five-unit default was
 * validated as Newtonian while the engine was clamping every force in it.
 *
 * Anything that needs to know what the force law is actually doing - the
 * integrator, the potential, or a teaching overlay deciding whether its
 * closed-form claims hold - asks this. Nothing re-reads the setting and
 * nothing else carries the fallback.
 *
 * @returns {number} The floor, in simulation length units
 */
export const minInteractionDistance = () => {
  const v = physicsSettings.min_interaction_distance;
  return Number.isFinite(v) && v > 0 ? v : MIN_INTERACTION_DISTANCE;
};

// Kilograms in one simulation mass unit. The solar mass is the anchor, so this
// is the one conversion the small-body units below are allowed to go through:
// a second route from kilograms to simulation units would be a second chance
// to disagree with the anchor, which is the failure JUPITER_MASS_UNIT and
// EARTH_MASS_UNIT both had.
export const MASS_UNIT_KG = SOLAR_MASS_KG / SOLAR_MASS_UNIT;

/** The schemes, by the label the settings dropdown uses. */
export const INTEGRATORS = ['Symplectic Euler', 'Velocity Verlet', 'RK4'];

/**
 * The scheme in force, always one of INTEGRATORS.
 *
 * Anything unrecognized resolves to symplectic Euler rather than throwing: a
 * saved link or an old scenario file naming a scheme that no longer exists
 * should load into the default, not into a broken simulation.
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
