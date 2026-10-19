// =============================================================================
// The world: build, clear, rebuild, save, load and share, and the embed shell
// -----------------------------------------------------------------------------
// Everything that makes a world, tears one down and describes one to somebody
// else, moved out of js/ui.js (Prompt 107, slice 11) with the live state it keeps:
//
//   builtSystem              what Refresh rebuilds under 'None'
//   worldPack                the scenario pack the world came from
//   generationSettings       SETTINGS as they stood when the world was built
//   worldTouched             the author changed the world by hand
//   pendingSettingsOverride  settings from a link, waiting for the next build
//   (allBodies               a function of the physics lists, not state)
//
// There is no context object. The state moved with the code that owns it, so
// js/ui.js hands nothing in; it reaches two of the pieces it still writes
// through setBuiltSystem() (Blank Simulation) and setPendingSettings() (Apply),
// and marks the world touched through markWorldTouched(). Module level `let`s,
// not an object, because the physics lists the rest of the world reads are
// module-level bindings too and a second holder would be a second truth.
//
// Nothing runs at import: initWorld() wires the listeners and is called by
// js/ui.js where those statements ran. World construction stays synchronous
// and seeded (initialize_simulation -> withSeed -> js/world/build.js).
//
// The embed shell is folded in (it was js/embed.js) because its ready signal
// waits on the first world, and to pay for this module's request: no route
// gains one.
//
// Embed mode (`?embed=1`) turns any Gravitas URL into an interactive figure for
// an iframe in a course page. It is a query parameter and a share payload is a
// fragment (`#3z...`), so the two cannot collide and any share link becomes
// embeddable by adding one parameter; js/shareState.js is untouched. The
// presentation shell (js/presentation.js) sets body.presentation-embed and CSS
// takes the rail, readout, footer and front door off the screen. What stays is
// the canvas, play/pause, speed, reset view and the inspector; one affordance
// is added, an "Open in Gravitas" link to the same state without embed=1.
// =============================================================================

import {
  bh_list,
  planets,
  stars,
  gas_giants,
  asteroids,
  comets,
  debris,
  particles,
  gravity_ripples,
  neutron_stars,
  white_dwarfs,
  galaxies,
  accretion_disk_particles,
  resetPhysicsObjectCounter,
  resetTrailTick,
  bumpWorldGeneration,
  setPhysicsObjectCounter,
  getSimulationTime,
  resetSimulationTime,
  setSimulationTime,
  resetAbsorptionAccounting,
  resetConservationBaseline,
  Planet,
  GasGiant,
  Asteroid,
  Comet,
  StarObject,
  BlackHole,
  Debris,
  NeutronStar,
  WhiteDwarf,
  Galaxy,
  particlePool,
  clearAllEnergyHistory,
  updatePhysicsSettings,
} from './physics.js';
import { debugLog } from './utils.js';
import { setFrame, resetFrame, frameState } from './referenceFrame.js';
import {
  getPositionAngle,
  getInclination,
  setPositionAngle,
  setInclination,
} from './observerGeometry.js';
import { withExtras, readExtras } from './experiments/canonicalState.js';
import {
  clearRadialVelocity,
  observedStarId,
  setObservedStar,
} from './radialVelocity.js';
import {
  clearAstrometry,
  getAssumedDistance,
  resetAssumedDistance,
  setAssumedDistance,
} from './astrometry.js';
import { SCENARIO_INFO } from './data/scenarioInfo.js';
import { SCENARIO_TAGS } from './data/scenarioTags.js';
import { applyPreset, scenarioId } from './scenarios.js';
import { buildWorld } from './world/build.js';
import { t } from './i18n/index.js';
import { scenarioTitle, scenarioSummary } from './i18n/scenario.js';
import { resetPotentialCache } from './vectorOverlay.js';
import { toast } from './notify.js';
import { isToolActive } from './sandboxTools.js';
import { withSeed, getWorldSeed, setWorldSeed, randomSeed } from './rng.js';
import {
  buildPayload,
  packBody,
  payloadSeed,
  chooseKind,
  migrateSettings,
} from './shareState.js';
import { generateStarfield } from './render.js';
import { stopSignalAudio } from './soundPanel.js';
import { hideObjectInspector } from './inspectorWindow.js';
import {
  constructBody,
  typeName,
  typeKeyOf,
  updateObjectTypeButton,
} from './placement.js';
import {
  updateSpeedDisplay,
  computeAreaSweep,
  isAreaSweepSuppressed,
} from './captureMeasure.js';
import {
  state,
  SETTINGS,
  DEFAULT_SETTINGS,
  commitSettings,
  registerSettingsReceiver,
  setSettings,
  current_scenario_name,
  setScenarioName as setCurrentScenarioName,
} from './appState.js';
import {
  setPresentationMode,
  embedRequested,
  withEmbedParam,
} from './presentation.js';
import { fixTheme, forgetThemes } from './theme.js';
import { reduceMotion } from './quality.js';

// Where Save and Load keep the world, in localStorage.
const SAVE_KEY = 'gravitas_simulation_save';

/**
 * Apply the selected preset scenario to the live settings.
 * Thin wrapper: the preset table itself lives in scenarios.js.
 */
const apply_preset = () => {
  // bh_layout used to be deleted here, because it had no entry in
  // DEFAULT_SETTINGS and so was the one leaked key anything noticed. It has an
  // entry now, along with the rest of the scenario-only keys, so the reset
  // inside applyPreset clears it the same way it clears everything else.
  applyPreset(SETTINGS, DEFAULT_SETTINGS, state);
};
/**
 * Show scenario information banner with title and description
 * Displays information about the current simulation scenario for 6 seconds
 */
const show_scenario_info = () => {
  // Prevent automatic display on page load - only show if user has interacted
  // Also add a frame count check to prevent early display
  if (!state.user_has_interacted || state.frame_count < 300) {
    return;
  }

  const scenarioInfoDiv = document.getElementById('scenarioInfoDisplay');
  if (current_scenario_name && SCENARIO_INFO[current_scenario_name]) {
    const mergingNote =
      SETTINGS.enable_star_merging === false
        ? `<p style="color:#f5a623;font-size:12px;margin-top:4px;">⚠ ${t('scenarioCard.notice.mergingDisabled')}</p>`
        : '';
    scenarioInfoDiv.innerHTML = `<h4>${scenarioTitle(current_scenario_name)}</h4><p>${scenarioSummary(current_scenario_name)}</p>${mergingNote}`;
    scenarioInfoDiv.classList.add('visible');
    setTimeout(() => scenarioInfoDiv.classList.remove('visible'), 6000);
  } else {
    scenarioInfoDiv.classList.remove('visible');
  }
};

// Enhanced scenario info box function
const show_enhanced_scenario_info = scenarioName => {
  if (!scenarioName || !SCENARIO_INFO[scenarioName]) {
    return;
  }

  // A lesson loads a scenario every time a step asks for one, and this card is
  // 720px wide and lands on top of the instrument panel. During an
  // investigation the step's own text is the introduction to the scenario, so
  // the card is redundant as well as in the way.
  if (document.body.classList.contains('investigation-open')) return;

  const infoBox = document.getElementById('scenarioInfoBox');
  const title = document.getElementById('scenarioInfoTitle');
  const summary = document.getElementById('scenarioInfoSummary');
  const features = document.getElementById('scenarioInfoFeatures');

  // The info card is optional chrome; a missing node must not abort
  // initialize_simulation and leave the app half-built.
  if (!infoBox || !title || !summary || !features) return;

  // A card the reader closed does not come back for the same scenario - on
  // Refresh, or an Apply that rebuilds it. A different scenario is new news.
  if (infoBox.dataset.dismissed === scenarioName) return;
  delete infoBox.dataset.dismissed;

  // Set the title and summary. The key is kept on the element because the card
  // outlives the call that wrote it: a language arriving late has to be able to
  // ask which scenario is on screen.
  infoBox.dataset.scenarioKey = scenarioName;
  title.textContent = scenarioTitle(scenarioName);
  summary.textContent = scenarioSummary(scenarioName);

  // Populate features with relevant notices
  features.innerHTML = '';
  if (SETTINGS.enable_star_merging === false) {
    const li = document.createElement('li');
    li.className = 'merging-disabled-notice';
    li.textContent = t('scenarioCard.notice.mergingDisabledLong');
    features.appendChild(li);
  }

  // Whether anything is currently covering the simulation. The card is shown
  // for eighteen seconds and then hides itself, so raising it under a
  // full-screen layer would burn the whole eighteen seconds where nobody can
  // read it: a first-time visitor would enter the sandbox to find the card that
  // names their scenario already gone. Both start-up layers are checked, and
  // the welcome screen through a body class, which needs no import of it.
  const onboardingLayerUp = () => {
    const splash = document.getElementById('splash');
    const splashUp =
      splash &&
      !splash.classList.contains('hidden') &&
      splash.style.display !== 'none';
    return (
      Boolean(splashUp) ||
      document.body.classList.contains('welcome-open') ||
      document.body.classList.contains('welcome-pending')
    );
  };

  const raise = () => {
    infoBox.classList.add('showUI');
    setTimeout(() => infoBox.classList.remove('showUI'), 18000);
  };

  if (onboardingLayerUp()) {
    const waitForClearScreen = () => {
      if (onboardingLayerUp()) {
        setTimeout(waitForClearScreen, 100);
        return;
      }
      raise();
    };
    waitForClearScreen();
  } else {
    raise();
  }
};
// What Refresh rebuilds under 'None', which it would otherwise rebuild as an
// empty world: the system js/systemBuilder.js last built, or {link} for a
// link that brought its own bodies (a scenario pack). Any other build forgets it.
let builtSystem = null;

// The scenario pack this world was built from, {id, version}, carried on into
// any link made of it (the extras' `pack`). Any build forgets it; restoring a
// pack's link sets it again, Refresh of a pack with bodies included.
let worldPack = null;

/**
 * Build the world, then hand it a fresh identity.
 *
 * World generation draws on Math.random in roughly 180 places, so on its own
 * it produces a different system every time - which is fine for a sandbox and
 * useless for a shared link. Running it inside withSeed() makes the whole
 * build a function of one number, so the same seed rebuilds the same universe
 * and a link only has to carry the seed.
 *
 * @param {Object} [options]
 * @param {string|number} [options.seed] - Reuse this seed instead of a new one
 * @param {boolean} [options.keepSeed] - Rebuild with the seed already in use
 * @returns {number} The seed the world was built from
 */

const initialize_simulation = (options = {}) => {
  // The world about to be torn down is the one anything currently playing was
  // a measurement of. A chirp that outlives its binary is not a signal from
  // the new scenario, so it goes before the new one is built.
  stopSignalAudio();
  if (options.seed !== undefined) {
    setWorldSeed(options.seed);
  } else if (!options.keepSeed) {
    // A plain rebuild - a new scenario, or Refresh - is meant to give
    // something new to look at, so it gets a new seed.
    setWorldSeed(randomSeed());
  }
  // applyPreset signs off by setting preset_scenario to the 'None' sentinel,
  // so a second build reads no scenario: it skips the preset, keeps the old
  // settings and records the scenario name as 'None'. Callers compensate by
  // reassigning the name first - the Refresh and Reset buttons each do it by
  // hand - which is a precondition easy to forget and silent when missed.
  // Restoring it here makes every rebuild idempotent instead.
  if (SETTINGS.preset_scenario === 'None' && current_scenario_name) {
    SETTINGS.preset_scenario = current_scenario_name;
  }

  builtSystem = null;
  worldPack = null;
  const seed = getWorldSeed();
  withSeed(seed, () => build_simulation());
  // The object lists have just been repopulated; the physics caches hold the
  // previous set and must not be reused.
  bumpWorldGeneration();
  // The clock and the conservation baseline belong to the world that was just
  // torn down, not to this one. The baseline is taken after the caches are
  // bumped, so it is measured over the bodies that now exist rather than over
  // whatever the previous scenario left in the cached lists.
  resetSimulationTime();
  // The absorption ledger counts spin banked and momentum discarded since the
  // world was built, so it starts over with the world.
  resetAbsorptionAccounting();
  resetConservationBaseline();
  resetPotentialCache();
  worldTouched = false;
  // A preset sets its own speed, so the readout is stale until it is told.
  updateSpeedDisplay();
  // Kept so a shared link can rebuild under the settings that actually
  // produced this world, then apply anything changed since. Some scenarios
  // read settings while generating - Kepler's 2nd Law derives its launch
  // velocities from the gravitational constant - so applying a later value
  // during the rebuild would quietly hand over a different experiment.
  generationSettings = JSON.parse(JSON.stringify(SETTINGS));
  return seed;
};

// Settings as they stood when the current world was built.
let generationSettings = null;

// Set when the author changes the world by hand. A seeded link stops being a
// truthful description of the simulation at that moment, because re-running
// generation would not produce what is now on screen.
let worldTouched = false;

/** Mark the world as hand-edited, so sharing switches to full state. */
const markWorldTouched = () => {
  worldTouched = true;
};

// Settings from a shared link, waiting for the next build to apply them.
let pendingSettingsOverride = null;

// The page's writers (SETTINGS_WRITERS) reach the engine through commitSettings();
// this file holds both ends, so it says who takes them.
registerSettingsReceiver(updatePhysicsSettings);

// World construction lives in js/world/build.js. What stays here is the wiring:
// the settings object, the mutable bindings it reads and writes, and the four
// pieces of user interface it has to touch on the way through.
const build_simulation = () =>
  buildWorld({
    settings: SETTINGS,
    pushSettings: () => commitSettings('world-build'),
    state,
    applyPreset: apply_preset,
    takePendingSettings: () => {
      const pending = pendingSettingsOverride;
      pendingSettingsOverride = null;
      return pending;
    },
    setScenarioName: name => {
      setCurrentScenarioName(name);
    },
    hideObjectInspector,
    showScenarioInfo: show_enhanced_scenario_info,
    updateObjectTypeButton,
    computeAreaSweep,
    isAreaSweepSuppressed,
    regenerateStarfield: generateStarfield,
  });

// Save/Load functions

/**
 * Every body currently in the simulation, in a stable order.
 *
 * Galaxies first. Coma Cluster, the one scenario that has them, builds them
 * before anything else exists, and a share link that carries no ids mints new
 * ones in this order. Listed first, each member gets its old id back, and with
 * it the angle the drawing was turned to.
 */
const allBodies = () => [
  ...galaxies,
  ...bh_list,
  ...planets,
  ...stars,
  ...gas_giants,
  ...asteroids,
  ...comets,
  ...neutron_stars,
  ...white_dwarfs,
  ...debris,
];

/** Empty every object list, pool and derived cache. */
const clearWorld = () => {
  bh_list.length = 0;
  planets.length = 0;
  stars.length = 0;
  gas_giants.length = 0;
  asteroids.length = 0;
  comets.length = 0;
  neutron_stars.length = 0;
  white_dwarfs.length = 0;
  galaxies.length = 0;
  debris.length = 0;
  particles.length = 0;
  gravity_ripples.length = 0;
  accretion_disk_particles.length = 0;
  particlePool.clear();
  // Restored bodies reuse their saved ids, so any surviving history from the
  // previous run would be silently attributed to them.
  clearAllEnergyHistory();
  resetPhysicsObjectCounter();
  resetFrame();
  resetTrailTick();
};

/**
 * Rebuild the object lists from an array of saved states.
 *
 * Shared by the localStorage load and the shared-link load: both need exactly
 * this, and when it existed only inside load_simulation_state the two would
 * have drifted the first time a new body type was added.
 *
 * @param {Array<Object>} objectStates - Results of get_state(), in any order
 * @returns {number} How many bodies were restored
 */
const rebuildWorldFromStates = objectStates => {
  clearWorld();
  let maxId = 0;
  let restored = 0;

  for (const obj_state of objectStates || []) {
    if (!obj_state || typeof obj_state !== 'object') continue;
    const { type, pos, vel, mass } = obj_state;
    // A link can be edited by hand, so nothing here may assume well-formed
    // input; a body without a position would otherwise throw on first draw.
    if (!pos || !Number.isFinite(pos.x) || !Number.isFinite(pos.y)) continue;
    const v = vel && Number.isFinite(vel.x) ? vel : { x: 0, y: 0 };

    let new_obj = null;
    if (type === 'Planet') new_obj = new Planet(pos, v);
    else if (type === 'GasGiant') new_obj = new GasGiant(pos, v);
    else if (type === 'Asteroid') new_obj = new Asteroid(pos, v);
    else if (type === 'Comet') new_obj = new Comet(pos, v);
    else if (type === 'StarObject') new_obj = new StarObject(pos, v);
    else if (type === 'NeutronStar')
      new_obj = new NeutronStar(pos, v, null, null);
    else if (type === 'WhiteDwarf') new_obj = new WhiteDwarf(pos, v);
    else if (type === 'Debris') new_obj = new Debris(pos, v);
    else if (type === 'BlackHole') new_obj = new BlackHole(pos, mass, v, true);
    // A galaxy's constructor has no mass of its own to fall back on, and a
    // member without one would put NaN into every force in the cluster.
    else if (type === 'Galaxy' && Number.isFinite(mass))
      new_obj = new Galaxy(pos, v, mass);
    if (!new_obj) continue;

    new_obj.set_state(obj_state);
    if (new_obj instanceof Planet) planets.push(new_obj);
    else if (new_obj instanceof GasGiant) gas_giants.push(new_obj);
    else if (new_obj instanceof Comet) comets.push(new_obj);
    else if (new_obj instanceof Asteroid) asteroids.push(new_obj);
    else if (new_obj instanceof StarObject) stars.push(new_obj);
    else if (new_obj instanceof NeutronStar) neutron_stars.push(new_obj);
    else if (new_obj instanceof WhiteDwarf) white_dwarfs.push(new_obj);
    else if (new_obj instanceof Debris) debris.push(new_obj);
    else if (new_obj instanceof BlackHole) bh_list.push(new_obj);
    else if (new_obj instanceof Galaxy) galaxies.push(new_obj);
    maxId = Math.max(maxId, new_obj.id ?? 0);
    restored++;
  }

  setPhysicsObjectCounter(maxId + 1);
  bumpWorldGeneration();
  return restored;
};

/**
 * Save the current simulation state to localStorage
 * Includes all settings, object states, and view parameters
 */
const save_simulation_state = () => {
  try {
    const savedState = {
      settings: SETTINGS,
      view: { zoom: state.zoom, pan: state.pan },
      objects: allBodies().map(o => o.get_state()),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(savedState));
    toast(t('state.saved'));
  } catch (e) {
    console.error('Error saving state:', e);
    toast(t('state.saveFailed'));
  }
};

/**
 * Load a previously saved simulation state from localStorage
 * Restores all settings, objects, and view parameters
 */
const load_simulation_state = () => {
  const scenarioInfoDiv = document.getElementById('scenarioInfoDisplay');
  scenarioInfoDiv.classList.remove('visible');

  const savedJSON = localStorage.getItem(SAVE_KEY);
  if (!savedJSON) {
    toast(t('state.none'));
    return;
  }
  try {
    const loadedState = JSON.parse(savedJSON);
    setSettings(
      migrateSettings(loadedState.settings) || { ...DEFAULT_SETTINGS }
    );
    const view = loadedState.view || { zoom: 1.5, pan: { x: 0, y: 0 } };
    state.zoom = view.zoom;
    state.pan = view.pan;
    commitSettings('saved-world');
    rebuildWorldFromStates(loadedState.objects);
    builtSystem = null;
    resetConservationBaseline();
    // A restored save is a hand-made world by definition: no seed regenerates
    // it, so sharing it has to carry the bodies themselves.
    markWorldTouched();
    window.dispatchEvent(new CustomEvent('gravitasSimulationReset'));
    toast(t('state.loaded'));
    state.paused = false;
    updateSpeedDisplay();
  } catch (e) {
    console.error('Error loading state:', e);
    toast(t('state.loadFailed'));
  }
};

// --- Shared links -------------------------------------------------------------

/**
 * Describe the current simulation as a payload fit for a URL.
 *
 * Takes the elapsed simulation clock as an argument rather than importing
 * timeline.js: timeline.js already imports this module, and the cycle is
 * avoidable by letting the caller - which imports both - supply the number.
 *
 * @param {Object} [opts]
 * @param {'seeded'|'full'|'auto'} [opts.kind] - Payload kind; 'auto' decides
 * @param {boolean} [opts.includeCamera] - Carry zoom and pan
 * @param {number} [opts.elapsed] - Simulated seconds run since the world built
 * @returns {Object} Payload for encodePayload()
 */
const captureShareState = ({
  kind = 'auto',
  includeCamera = true,
  elapsed = 0,
  // The A/B bench asks for these. A share link does not need them and pays for
  // every character, so they are opt-in rather than always carried.
  forExperiment = false,
  experiment = null,
} = {}) => {
  const resolved =
    kind === 'auto' ? chooseKind({ touched: worldTouched, elapsed }) : kind;

  // The observing context, on every link.
  //
  // These used to be carried only for the A/B bench, on the reasoning that a
  // share link pays for every character. But an inclination of 30 degrees, a
  // rotating frame centered on Jupiter and an assumed distance of 480 parsecs
  // are not incidental settings - they are what the sender is demonstrating,
  // and a link that drops them reopens on a different measurement while
  // looking like the same one. The codec omits every field still at its
  // default, so a link from a reader who never touched an observing control is
  // the same length it always was.
  //
  // Written through withExtras(), the one codec, rather than a second
  // serializer alongside it: readExtras() already supplies defaults for links
  // that predate any of this.
  const frame = frameState();
  const starId = observedStarId();
  const extras = withExtras(
    {},
    {
      // Clock and tools stay opt-in. The clock in particular would change what
      // a seeded link means - "the world as generated" rather than "the world
      // at this moment" - which is the distinction the two kinds exist to draw.
      ...(forExperiment
        ? { clock: getSimulationTime(), tools: activeToolIds() }
        : {}),
      frame,
      observer: {
        positionAngle: getPositionAngle(),
        inclination: getInclination(),
      },
      observedStarId: starId,
      distancePc: getAssumedDistance(),
      pack: worldPack,
    }
  ).x;

  // Nothing but the version number means nothing was worth carrying, so the
  // block is dropped and a link from a reader who touched no observing control
  // is byte-for-byte what it was before any of this existed. readExtras()
  // yields the same defaults either way. Kept for the bench regardless, which
  // compares payloads and should see a consistent shape.
  const trimmedExtras =
    !forExperiment && Object.keys(extras).length === 1 ? null : extras;

  // Whether anything in the restored context names a body. Both references are
  // stable ids, which survive a seeded rebuild - generation from a seed assigns
  // them in the same order every time - and survive a full restore only if the
  // ids travel with the bodies, because set_state() takes the id from the
  // packed state when one is there and mints a fresh one when it is not.
  const referencesABody =
    (extras.frame?.o !== undefined && extras.frame?.o !== null) ||
    extras.star !== undefined;

  return buildPayload({
    // current_scenario_name, not SETTINGS.preset_scenario: applyPreset leaves
    // the latter set to the 'None' sentinel, so reading it would stamp every
    // link with a scenario that loads nothing.
    scenario: current_scenario_name,
    seed: getWorldSeed(),
    settings: SETTINGS,
    generationSettings,
    DEFAULT_SETTINGS,
    camera: includeCamera ? { zoom: state.zoom, pan: state.pan } : null,
    bodies:
      resolved === 'full'
        ? allBodies()
            .filter(o => o && o.alive !== false)
            // Ids cost characters, so they are carried when something needs
            // them: the bench always, and an ordinary link only when its
            // restored context points at a particular body.
            .map(o =>
              packBody(
                // Not in get_state(); without it a wide system loses its
                // outer bodies to the distance cull.
                o.persistent === true
                  ? { ...o.get_state(), persistent: true }
                  : o.get_state(),
                { withId: forExperiment || referencesABody }
              )
            )
        : null,
    paused: state.paused,
    extras: trimmedExtras,
    experiment,
  });
};

/**
 * Which measurement tools are out, for an experiment's initial state.
 *
 * Only the fact that a tool is active, not where its handles are: restoring a
 * ruler to the pixel is not what makes two runs comparable, and the handles are
 * stored in world coordinates that a rebuilt world may not have.
 *
 * @returns {Array<string>} Active tool ids
 */
const activeToolIds = () =>
  ['ruler', 'protractor', 'stopwatch'].filter(id => {
    try {
      return isToolActive(id);
    } catch {
      return false;
    }
  });

/**
 * Rebuild the simulation described by a decoded payload.
 *
 * @param {Object} payload - From decodePayload()
 * @returns {{scenario:string, kind:string, bodies:number}} What was restored
 */
const applyShareState = payload => {
  // By id: a lesson's or a pack's own setup arrives here without passing
  // through decodePayload(), and may name its scenario the way it did before
  // scenarios had ids.
  const scenario = scenarioId(payload.s) ?? payload.s;
  if (scenario === 'None') {
    // Blank Simulation, or a built system. Its delta was taken against the
    // defaults, so it is rebuilt from them; otherwise initialize_simulation()
    // puts back whatever scenario this tab had open, under the link's delta.
    setSettings({
      ...JSON.parse(JSON.stringify(DEFAULT_SETTINGS)),
      quality_tier: SETTINGS.quality_tier ?? DEFAULT_SETTINGS.quality_tier,
    });
    setCurrentScenarioName('None');
  }
  SETTINGS.preset_scenario = scenario;

  // Held for build_simulation() to apply. Settings cannot simply be assigned
  // here: apply_preset() runs first inside the build and resets everything to
  // the scenario's own defaults, which would discard them.
  pendingSettingsOverride = payload.d ? payload.d : null;

  const seed = payloadSeed(payload);

  if (Array.isArray(payload.b) && payload.b.length) {
    // A full payload describes a world no seed reproduces. Build the scenario
    // first so settings, starfield and preset geometry are right, then replace
    // the bodies with the ones the link actually carries.
    initialize_simulation({ seed });
    rebuildWorldFromStates(payload.b);
    commitSettings('share-link');
    // The baseline was taken over the world these bodies just replaced.
    resetConservationBaseline();
    markWorldTouched();
    if (scenario === 'None') builtSystem = { link: payload };
  } else {
    initialize_simulation({ seed });
  }

  // Settings the author changed after the world was built are applied now, in
  // the same order they happened, so live-applied values like gravity land on
  // an already-generated system rather than shaping the generation itself.
  if (payload.a) {
    Object.assign(SETTINGS, payload.a);
    commitSettings('share-link-delta');
  }

  if (Array.isArray(payload.c) && payload.c.length === 3) {
    const [zoom, panX, panY] = payload.c;
    if (Number.isFinite(zoom) && zoom > 0) state.zoom = zoom;
    if (Number.isFinite(panX) && Number.isFinite(panY)) {
      state.pan = { x: panX, y: panY };
    }
  }

  state.paused = payload.p === 1;
  setCurrentScenarioName(scenario);

  // Everything an experiment needs restored that a link never carried. A
  // payload without an `x` block yields the defaults - clock at zero, world
  // frame, edge-on observer - which is exactly what an ordinary share link
  // means, so this path is safe for every link ever made.
  const extras = readExtras(payload);
  worldPack = extras.pack;
  setSimulationTime(extras.clock);
  try {
    if (extras.frame.mode && extras.frame.mode !== 'world') {
      setFrame(extras.frame.mode, extras.frame.objectId);
    } else {
      resetFrame();
    }
  } catch (err) {
    // A frame naming a body that this world does not contain is a bad link,
    // not a reason to fail the whole restore.
    console.warn('Could not restore the reference frame:', err);
  }
  setPositionAngle(extras.observer.positionAngle);
  setInclination(extras.observer.inclination);

  // Restored after the world exists, because both of these name things in it:
  // a star by id, and a distance the astrometry panel reads against whichever
  // star is being observed. Everything above has already rebuilt or
  // regenerated the bodies, so an id resolves here and would not have earlier.
  //
  // Every field is assigned on every restore, including the ones this link does
  // not mention. Absence in a link is a value - it means "whatever this
  // scenario's default is" - and treating it as "leave alone" made a restore
  // depend on what the tab had opened before it. A reader who followed a link
  // with a distance and then an older link without one kept the first link's
  // distance, applied to a different system.
  if (extras.observedStarId !== null) {
    const found = setObservedStar(extras.observedStarId);
    if (!found) {
      // A link whose star is not in this world: the panels fall back to their
      // own choice rather than to nothing. Worth saying, because the reader is
      // now looking at a different star than the sender was.
      console.warn(
        `Share link names star ${extras.observedStarId}, which this world does not contain; observing the default instead.`
      );
    }
  } else {
    setObservedStar(null);
  }

  if (extras.distancePc !== null) setAssumedDistance(extras.distancePc);
  else resetAssumedDistance();

  // The recordings belong to the world that was on screen a moment ago, not to
  // this one. Their own session identity would catch it on the next frame -
  // the world generation has moved - but clearing here means the panels never
  // render the previous link's curve at all, and it keeps every restore going
  // through the same path whether or not a panel happens to be open.
  clearRadialVelocity();
  clearAstrometry();

  updateSpeedDisplay();
  updateObjectTypeButton();

  return {
    scenario,
    kind: payload.b ? 'full' : 'seeded',
    bodies: allBodies().length,
    extras,
  };
};
// What js/systemBuilder.js needs from the coordinator to build a world (the
// rest it imports itself), handed down so that it never imports this module.
const worldKit = {
  rebuild: seed => initialize_simulation({ seed }),
  constructBody,
  finish: system => {
    builtSystem = system;
    resetPotentialCache();
    hideObjectInspector();
    markWorldTouched();
    updateSpeedDisplay();
  },
};
let systemBuilderModule = null;
const rebuildBuiltSystem = () =>
  Boolean(builtSystem && current_scenario_name === 'None') &&
  (builtSystem.link
    ? applyShareState(builtSystem.link)
    : systemBuilderModule.installSystem(builtSystem, worldKit),
  true);

/**
 * Load a built-in scenario by its id (a key of SCENARIO_INFO), or by the
 * English name it had before ids.
 *
 * The one authoritative way to switch scenario from the UI. The scenario
 * browser and the welcome screen's featured gallery both call this, so the two
 * cannot drift: an unknown key is refused in one place, the rebuild happens in
 * one place, and the readouts that depend on the new world are refreshed in one
 * place.
 *
 * @param {string} key - A scenario id, or the English name it had before ids
 * @returns {boolean} True if the scenario existed and was loaded
 */
export function loadScenarioByKey(key, options = {}) {
  const id = scenarioId(key);
  if (!id || !SCENARIO_INFO[id]) {
    console.warn(`Unknown scenario key: ${key}`);
    return false;
  }
  SETTINGS.preset_scenario = id;
  // The rebuild raises the scenario card itself, through apply_preset, so this
  // must not call show_enhanced_scenario_info() as well: a second call stacks a
  // second 18-second auto-hide timer on the same element.
  //
  // `options` is passed straight through, so a caller that needs the same
  // world twice - the browser tests that check a display setting cannot change
  // one - can name the seed instead of getting a fresh one each time.
  initialize_simulation(options);
  // The small transient readout over the canvas. It refuses to fire before the
  // user has interacted and in the first few hundred frames, which is what
  // keeps it off the screen during start-up.
  show_scenario_info();
  updateSpeedDisplay();
  return true;
}

// The scenario gallery lives in js/scenarioBrowser.js. It renders the catalog,
// the concept chips and the search, and calls loadScenarioByKey() above when a
// card is chosen. It used to be built inline here, which put four hundred lines
// of list markup in the middle of the simulation module.

// Validation function for scenario data
const validateScenarioData = () => {
  const issues = [];

  Object.entries(SCENARIO_INFO).forEach(([key, info]) => {
    if (!info || typeof info !== 'object') {
      issues.push(`Invalid scenario object for key: ${key}`);
      return;
    }

    if (!info.title || typeof info.title !== 'string') {
      issues.push(`Missing or invalid title for scenario: ${key}`);
    }

    if (!info.summary || typeof info.summary !== 'string') {
      issues.push(`Missing or invalid summary for scenario: ${key}`);
    }

    if (info.title && info.title.length > 100) {
      issues.push(
        `Title too long for scenario: ${key} (${info.title.length} chars)`
      );
    }

    if (info.summary && info.summary.length > 500) {
      issues.push(
        `Summary too long for scenario: ${key} (${info.summary.length} chars)`
      );
    }

    // The gallery browses by concept and shows a picture, so a scenario with
    // no tags is unreachable through the chips and one with no thumbnail shows
    // a placeholder. Neither is fatal, which is why this warns rather than
    // throwing: a scenario added before its thumbnail is captured should still
    // load and still be searchable.
    if (!Array.isArray(info.tags) || info.tags.length === 0) {
      issues.push(`No concept tags for scenario: ${key}`);
    } else {
      const seen = new Set();
      for (const tag of info.tags) {
        if (!SCENARIO_TAGS[tag]) {
          issues.push(`Unknown tag "${tag}" on scenario: ${key}`);
        }
        if (seen.has(tag)) {
          issues.push(`Duplicate tag "${tag}" on scenario: ${key}`);
        }
        seen.add(tag);
      }
      if (info.tags.length > 4) {
        issues.push(
          `Too many tags on scenario: ${key} (${info.tags.length}); the card shows three`
        );
      }
    }

    if (!info.thumbnail || typeof info.thumbnail !== 'string') {
      issues.push(`No thumbnail path for scenario: ${key}`);
    }
  });

  if (issues.length > 0) {
    console.warn('Scenario data validation issues:', issues);
  } else {
    debugLog('All scenario data validated successfully');
  }

  return issues.length === 0;
};

/**
 * Wire what the world owns: the three window events that touch it, Refresh,
 * Reset all, Save, Load and the system builder's button. Called once from
 * js/ui.js, at the place in its body where these statements used to run, so
 * the registration order is the one every build had.
 */
export function initWorld() {
  // Placing anything by hand puts the world beyond what its seed rebuilds, so
  // from here on a link has to carry the bodies themselves.
  window.addEventListener('gravitasObjectPlaced', markWorldTouched);

  // What just happened, said once, without taking the canvas away.
  //
  // A toast rather than an alert: an alert would stop the world, need dismissing
  // and be read out as a dialog, all to confirm something the reader did on
  // purpose. This is a brief line plus a polite live-region announcement, which
  // is what makes the creation perceivable to somebody who cannot see the canvas
  // it happened on.
  window.addEventListener('gravitasObjectPlaced', event => {
    const type = typeKeyOf(event.detail?.object);
    if (type) toast(t('placement.added', { type: typeName(type) }));
  });

  // Which law governs a galaxy's outskirts is chosen in the rotation-curve panel,
  // which writes it into the physics module. SETTINGS is a separate object, and
  // it is the one the share codec and the A/B bench read - so without this the
  // choice was invisible to both: a link made with the halo switched on reopened
  // with it off, and the bench compared two runs that differed and reported that
  // nothing had changed. That was true of the halo before MOND existed.
  //
  // Done by event rather than by importing the panel, so the dependency runs one
  // way: the panel already announces the change for the listeners that predate
  // three modes.
  window.addEventListener('gravitasGalaxyGravityChanged', event => {
    const mode = event?.detail?.mode;
    if (mode !== 'newtonian' && mode !== 'halo' && mode !== 'mond') return;
    SETTINGS.galaxy_gravity = mode;
    markWorldTouched();
  });

  // A feature module that needs the world rebuilt asks for it here rather than
  // reaching for initialize_simulation. js/ui.js is the coordinator: it may
  // import anything and nothing may import it, so a panel that wants a rebuild -
  // the binary planet lab does, because changing where a planet starts means
  // starting over rather than teleporting it mid-flight - has to be able to say
  // so without acquiring an edge back up to this module.
  window.addEventListener('gravitasRequestRebuild', () => {
    if (rebuildBuiltSystem()) return;
    SETTINGS.preset_scenario =
      current_scenario_name || SETTINGS.preset_scenario;
    initialize_simulation();
    state.paused = false;
    show_scenario_info();
    updateSpeedDisplay();
  });

  document.getElementById('refreshScenarioBtn').onclick = () => {
    if (rebuildBuiltSystem()) return;
    // Preserve current scenario name and restart it
    const currentScenario = current_scenario_name || 'binary-bh';
    SETTINGS.preset_scenario = currentScenario;
    initialize_simulation();
    state.paused = false;
    show_scenario_info();
    updateSpeedDisplay();
  };
  document.getElementById('resetAllBtn').onclick = () => {
    // Reset to default settings and ensure Binary BH scenario
    setSettings(JSON.parse(JSON.stringify(DEFAULT_SETTINGS)));
    SETTINGS.preset_scenario = 'binary-bh'; // Ensure default scenario
    initialize_simulation();
    state.paused = false;
    show_scenario_info();
    updateSpeedDisplay();
  };
  document.getElementById('saveBtn').onclick = save_simulation_state;
  document.getElementById('loadBtn').onclick = load_simulation_state;

  document
    .getElementById('systemBuilderBtn')
    ?.addEventListener('click', async event => {
      const trigger = event.currentTarget;
      systemBuilderModule ??= await import('./systemBuilder.js');
      systemBuilderModule.openSystemBuilder({ kit: worldKit, trigger });
    });
}

/** Forget or set the system Refresh rebuilds under 'None'. */
const setBuiltSystem = system => {
  builtSystem = system;
};

/** Hold settings for the next build, which applies and clears them. */
const setPendingSettings = pending => {
  pendingSettingsOverride = pending;
};

export {
  apply_preset,
  show_scenario_info,
  show_enhanced_scenario_info,
  initialize_simulation,
  markWorldTouched,
  allBodies,
  clearWorld,
  save_simulation_state,
  load_simulation_state,
  captureShareState,
  applyShareState,
  setBuiltSystem,
  setPendingSettings,
  validateScenarioData,
};

// The embed shell: embed mode from the URL, its ready signal and its chrome.
/**
 * Enter embed mode if the URL asked for it.
 *
 * Called before the simulation is built, so nothing that embed mode removes is
 * ever painted: a rail that appears for one frame and vanishes reads as a bug
 * in the host page.
 *
 * @returns {boolean} True if embed mode was entered
 */
export function initEmbedMode() {
  if (!embedRequested()) return false;
  setPresentationMode('embed');
  document.documentElement.classList.add('is-embed');
  // A gravitas-embed/1 figure remembers nothing, from the first moment: see
  // embedRequest() for the rest of what it asked for.
  if (new URLSearchParams(location.search).get('ev')) forgetThemes();
  return true;
}

let request = null;

/**
 * What this page's embed URL asked for, read once.
 *
 * Only a figure that opted into gravitas-embed/1 fetches js/embedOptions.js,
 * so nobody else downloads it: every other page, embed or not, gets
 * `{version: 0}` without a request. The figure's choices are applied as they
 * arrive, behind the splash, before anything is revealed - its theme, its
 * motion and its controls here, its language and quality tier by js/main.js,
 * which owns the settings they live in.
 *
 * @returns {Promise<{version: number, options: Object}>} As
 *   readEmbedOptions(); version 0 when this is not a gravitas-embed/1 figure
 */
export function embedRequest() {
  if (!request) {
    const optedIn =
      embedRequested() && new URLSearchParams(location.search).get('ev');
    request = optedIn
      ? import('./embedOptions.js').then(({ readEmbedOptions }) => {
          const read = readEmbedOptions();
          const { options } = read;
          if (read.version) {
            if (options.theme) fixTheme(options.theme);
            if (options.motion === 'reduced') reduceMotion();
            if (options.controls === 'none') {
              document.body.classList.add('embed-no-transport');
            }
          }
          return read;
        })
      : Promise.resolve({ version: 0, options: {} });
  }
  return request;
}

let worldReady;
const worldBuilt = new Promise(resolve => {
  worldReady = resolve;
});

/**
 * The first world is built. Called by js/main.js on every start-up path; the
 * figure tells its page it is ready only after this, so a page's first
 * message never lands on an empty canvas.
 */
export function embedWorldBuilt() {
  worldReady();
}

/**
 * Wire the embed shell's own controls.
 *
 * Called after the interface exists. Everything here is a no-op outside embed
 * mode, so main.js can call it unconditionally.
 */
export function initEmbedChrome({ authored = null, services = null } = {}) {
  const link = document.getElementById('embedOpenFull');
  if (!link) return;
  embedRequest().then(({ version, options }) => {
    if (!version) return;
    const reset = document.getElementById('embedReset');
    if (reset) {
      reset.hidden = false;
      reset.addEventListener('click', () => {
        import('./embedBridge.js')
          .then(m =>
            m.resetFigure({ reset: options.reset, authored, services })
          )
          .catch(err => console.warn('The figure could not be reset:', err));
      });
    }
    // The page's side of the contract, fetched only by a figure that opted
    // in, and started once there is a world for a message to act on.
    worldBuilt
      .then(() => import('./embedBridge.js'))
      .then(m => m.startEmbedBridge({ options, authored, services }))
      .catch(err => console.warn('The embed messages are unavailable:', err));
  });
  // The full-size link is this page without embed=1, so it carries the same
  // share payload and the same scenario. Built at wire time rather than
  // written into the markup, because the payload is only in the URL once a
  // share link has been opened.
  const href = withEmbedParam(location.href, { embed: false });
  link.setAttribute('href', href);
  link.setAttribute('target', '_blank');
  link.setAttribute('rel', 'noopener');
}
