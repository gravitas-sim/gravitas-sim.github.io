// =============================================================================
// Investigations: the guided-lesson engine and its panel
// -----------------------------------------------------------------------------
// Turns the lesson descriptions in data/investigations.js into a walkthrough a
// student can work through beside a live simulation, and collects what they
// write down.
//
// Two deliberate choices about assessment. Nothing blocks on a correct answer:
// a student stuck on step 6 should still reach the end; answers are checked and
// shown, attempts are counted and go in the report. Predictions are recorded
// before the answer is revealed and never marked wrong: their value is the
// commitment, and grading them would teach students to skip ahead and look.
//
// Progress lives in localStorage, because the lesson outlives any one page load
//: a rebuild wipes the simulation, and a student will close the tab.
// =============================================================================

import {
  drawEllipse,
  drawPlot as drawPlotFigure,
  fitSlope,
  bindPersistence,
  bindStepInputs,
  formatFieldNumber,
  keyForAssignment,
  load,
  parseFieldNumber,
  progressFor,
  renderProgressNotice,
  renderSaveStatus,
  save,
  sessionProgress,
  stepMarkup,
  storageKey,
} from './investigations/stepView.js';
// The public readers of the saved record, as they were exported from here.
export { getStudentName } from './investigations/progressSchema.js';
export { progressFor } from './investigations/stepView.js';
import { getLocale, t, onLocaleChange } from './i18n/index.js';
import { lessonText } from './i18n/lesson.js';
import {
  ENTITIES,
  decodeEntities,
  escapeHtml as escape,
  prose,
} from './lessonMarkup.js';
import { SCENARIO_IDS, scenarioId } from './scenarios.js';
// The registry, not the barrel. ../data/investigations.js pulls all ten lessons
// in statically, which is right for a build script and wrong here: the browser
// draws ten cards from the manifest, and opening one lesson fetches that one.
import {
  MANIFEST,
  hasInvestigation,
  loadInvestigation,
  provideLessonLoaders,
  gradedSteps,
} from './data/investigations/registry.js';
// Lessons provided by capability packages load through the platform resolver,
// which installs their loaders in the registry when it is imported.
import { state, SETTINGS, command } from './appState.js';

import {
  bh_list,
  stars,
  planets,
  gas_giants,
  asteroids,
  comets,
  neutron_stars,
  white_dwarfs,
  getSimulationTime,
  conservationDrift,
  getWorldGeneration,
} from './physics.js';
import { blackHoleFacts } from './blackHolePhysics.js';
import {
  habitableZoneBounds,
  habitableZoneStatus,
  relativeInsolation,
  stellarPropertiesFor,
} from './habitability.js';
import { habitableZoneModelFromSettings } from './render.js';
import { currentRadialVelocity, observedStar } from './radialVelocity.js';
import { orbitalElements, dominantPrimary, pairEnergy } from './orbital.js';
import {
  formatDistance,
  formatSpeed,
  formatTime,
  formatMass,
  timeUnitSeconds,
  SIM_UNITS_PER_AU,
} from './units.js';
import {
  ensureWidget,
  getWidget,
  needsLoading,
  toolFold,
  widgetDefaults,
} from './widgets.js';
import { wireMore } from './settingsSchema.js';
import {
  inDepth,
  indexOfSid,
  isValidSid,
  getStudentName,
  setStudentName,
  stepKey,
} from './investigations/progressSchema.js';
import {
  rotationCurveState,
  clusterState,
  darkMatterHaloOn,
} from './rotationCurve.js';
import {
  setLightCurveEnabled,
  isLightCurveEnabled,
  setObserverAngle,
  getObserverAngle,
  currentBrightness,
  currentTimeDays,
  clearLightCurve,
  transitAnalysis,
  transitGeometry,
} from './lightCurve.js';
import { encodePayload, parseDocument, shareUrl } from './shareState.js';
import { normalizeSeed, formatSeed } from './rng.js';
// From js/notify.js rather than through js/controls.js, which only re-exports
// them. Going through controls put this module in a cycle - controls
// dynamic-imports the loader, the loader dynamic-imports this - and although
// every edge in it was lazy, a cycle that exists only because of a convenience
// re-export is not one worth keeping.
import { toast, announce, loadFailed } from './notify.js';
import { setEvidenceContext } from './widgetRuntime.js';
// Lives in its own module so the instructor answer keys, which are generated
// in Node, can grade with the identical function this page grades with.
import { checkAnswer } from './answerCheck.js';
import {
  UNITS,
  localeOfAnswer,
  parseNumber,
  recordAnswer,
} from './answerParse.js';
import { filterResponses, stepBindings } from './assignments/assignment.js';
import { stepFingerprint } from './investigations/progressBackup.js';
import {
  bindChooser,
  closeBrowser,
  isBrowserOpen,
  openBrowser,
  renderBrowser,
  setChooserElements,
  wireBrowserFilters,
} from './investigations/browser.js';
import { drop, get, put } from './storage/local.js';
import { helpStages, helpTaken } from './answerFeedback.js';
import { frameState } from './referenceFrame.js';
import {
  SCALE,
  BINARY_SCALE,
  applyStage,
  centerOnSelected,
  clearStage,
  fitStage,
  setStageScale,
  stageScale,
  becomeRemnant,
  placeBinary,
  restageHole,
  restageStarPair,
  stagedBarycenter,
  clearSnapshots,
  pinSnapshot,
  pinnedSnapshots,
  pulseSource,
  remnantKindOf,
  restageBinary,
  restagePopulation,
  restageStar,
  setSourceMode,
  stageKey,
  stagePresence,
  stagedPopulation,
  stagedStars,
  takeFit,
} from './lessonStage.js';
import {
  bindRoles,
  boundRoles,
  roleBody,
  selectBody,
  enterLessonScope,
  evidenceSnapshot,
  leaveLessonScope,
  modeDescription,
  releaseModelOwnership,
  resolveRole,
  roleOf,
  selectRole,
  selectableBodies,
} from './lessonScene.js';

export { checkAnswer };
export {
  browserSummary,
  closeBrowser,
  openBrowser,
  resetBrowserFilters,
} from './investigations/browser.js';

const applyShareState = command('applyShareState');
const captureShareState = command('captureShareState');
const setInspectorSuppressed = command('setInspectorSuppressed');
const hideObjectInspector = command('hideObjectInspector');
const showAreaSweepFor = command('showAreaSweepFor');
const setAreaSweepSuppressed = command('setAreaSweepSuppressed');
const syncPlacementAvailability = command('syncPlacementAvailability');

let active = null; // the investigation object
let stepIndex = 0;
let responses = {}; // stepId -> value
let attempts = {}; // stepId -> number of tries
let visited = new Set();
/**
 * What reading the saved progress had to say for itself.
 *
 * Populated by progressSchema.readProgress: a migration from the pre-sid
 * format, keys for steps the lesson no longer has, a payload from a newer
 * build. Surfaced once when the lesson opens rather than swallowed, because
 * each of them means an answer may not be where the reader left it.
 */
let progressNotes = [];
let startedAt = null;
// Seconds this reader has had the lesson open and in view (the where line).
let spent = 0;
let lastTick = 0;
// Depth (DEPTH.md).
let depth = 'core';
let depthChoice = null;
let deepest = 'core';
let depthName = '';
let probeTimer = null;
let els = {};
let plotCanvas = null;
let plotTransformed = false;
let plotLog = false;
let toolValues = {};
let toolFrame = null;
/** The action descriptors the step's buttons were rendered from (labels are live getters). */
let toolActionsShown = [];
/** What every "More" is wired with: said through the live region. */
const MORE = { say: announce, locale: getLocale };
/** Cancels the current step's canvas listeners. @type {AbortController|null} */
let toolPointer = null;
let lastToolHtml = '';
let lightCurveOpenedByLesson = false;
// Which step's declarative setup the world on screen was built from.
let appliedSetup = null;
// Settings the lesson overrides while it runs, so they can be handed back.
let lockedSettings = null;

// --- Authoring preview --------------------------------------------------------
// Set by js/authoring/preview.js when ?author= is in the URL. While it is on,
// the lesson is a preview: nothing is read from a student's saved progress and
// nothing is written back to it.
let authoring = null;

// --- Persistence --------------------------------------------------------------

/**
 * The assignment being worked through, if this is one rather than a lesson.
 *
 * A short activity cut from a lesson keeps its own answers: two assignments
 * built from the same lesson are two pieces of work, and neither is the
 * lesson. So the storage key comes from the assignment when there is one, and
 * the lesson's own progress is left exactly as the student left it.
 *
 * @type {?object}
 */
let assignment = null;

/** How the assignment's steps resolved against the lesson as it is today. */
let assignmentBinding = null;

/** @returns {?object} The assignment in force */
export const activeAssignment = () => assignment;

/** @returns {?string} Where the open assignment's progress is stored */
export const activeAssignmentKey = () => (assignment ? assignmentKey : null);

/** @returns {?object} How its steps bound to the current lesson */
export const activeAssignmentBinding = () => assignmentBinding;

/** The open assignment's progress key; set with `assignment`. */
let assignmentKey = null;

// What persistence (./investigations/stepView.js) reads of this module, once.
bindPersistence({
  state: () => ({
    active,
    responses,
    attempts,
    visited,
    stepIndex,
    startedAt,
    depthChoice,
    deepest,
    spent,
    progressNotes,
  }),
  authoring: () => authoring,
  assigned: () => Boolean(assignment),
  assignmentKey: () => assignmentKey,
  els: () => els,
  clock: () => clock(),
});

// --- Live simulation context --------------------------------------------------

const allBodies = () => [
  ...bh_list,
  ...stars,
  ...planets,
  ...gas_giants,
  ...asteroids,
  ...comets,
  ...neutron_stars,
  ...white_dwarfs,
];

/**
 * Build the object a step's probe reads from.
 *
 * Handing the lesson a prepared context, rather than letting it import the
 * simulation, is what keeps data/investigations.js a description of teaching
 * instead of a piece of the engine.
 */
function probeContext() {
  const G = SETTINGS.gravitational_constant;
  const selected = state.selectedObject?.object || null;
  const primaries = [...bh_list, ...stars, ...neutron_stars, ...white_dwarfs];

  const primaryOf = body =>
    dominantPrimary(
      body,
      primaries.filter(p => p !== body)
    );

  return {
    selected,
    bodies: allBodies(),
    G,
    elements: body => {
      const b = body || selected;
      if (!b) return null;
      const primary = primaryOf(b);
      return primary ? orbitalElements(b, primary, G) : null;
    },
    energy: body => {
      const b = body || selected;
      if (!b) return null;
      const primary = primaryOf(b);
      return primary ? pairEnergy(b, primary, G) : null;
    },
    distance: formatDistance,
    speed: formatSpeed,
    time: formatTime,
    mass: formatMass,
    // The simulated clock itself, in simulated seconds. An instrument that
    // measures anything over time - a period, a resonant angle, a libration -
    // needs the engine's own clock rather than wall time, because the two are
    // not proportional: the frame rate varies and the scenarios run at speeds
    // from one to seven and a half thousand.
    clock: () => getSimulationTime(),
    // Plain numbers, for steps that need to compute rather than display.
    years: simTime => (simTime * timeUnitSeconds()) / 3.15576e7,
    au: simDistance => simDistance * 0.01,
    // Photometry, for the steps that ask students to read a light curve rather
    // than an orbit. The clock is the one the light curve plots against, so a
    // time stamped here lands under the dip the student is looking at.
    flux: () => currentBrightness(),
    days: () => currentTimeDays(),
    observerAngle: () => getObserverAngle(),
    // What the recorded light curve contains: the baseline, every complete
    // transit in it and a running count. A transit that goes past in half a
    // second cannot be caught by hand, and a real measurement is not made that
    // way either.
    photometry: () => transitAnalysis(),
    // The rotation curve and the cluster measurements, so a step can ask a
    // student to read a slope or a dispersion and then check what they read.
    // Same functions the panel itself calls: a lesson and the instrument it
    // points at must not be able to disagree.
    rotationCurve: () => rotationCurveState(),
    cluster: () => clusterState(),
    haloOn: () => darkMatterHaloOn(),
    // Which reference frame the view is in, and where a body lies as seen from
    // its origin. A lesson about retrograde motion has to be able to say
    // "you have not switched frames yet" and to report the direction a body is
    // in, which is the observable the whole subject rests on.
    frame: () => frameState(),
    seenFrom: (body, originName) => {
      const origin = allBodies().find(b =>
        String(b.name || '')
          .toLowerCase()
          .includes(String(originName).toLowerCase())
      );
      if (!body || !origin || body === origin) return null;
      const dx = body.pos.x - origin.pos.x;
      const dy = body.pos.y - origin.pos.y;
      let lon = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (lon < 0) lon += 360;
      return { separation: Math.hypot(dx, dy), longitude: lon };
    },
    /**
     * The body a step's `bind` gave this role, or null.
     *
     * The replacement for `find` below, and the difference is the whole point:
     * a role was resolved once, against one world, by an exact matcher that
     * refused to choose when more than one body answered to it. `find` is a
     * case-insensitive substring search that returns whichever came first.
     * Both are here because the eight steps that use `find` have not been
     * migrated; new steps should bind.
     */
    role: name => resolveRole(name).body,
    /** How a role stands: bound, stale, gone, or never bound. */
    roleStatus: name => resolveRole(name).status,
    /** Which role, if any, names a body. Null for anything unbound. */
    roleOf,
    /** Every role this step bound, in binding order. */
    roles: () => boundRoles(),
    /** Select a role's body, as though the reader had clicked it. */
    selectRole,
    /**
     * Select a body by id, as though the reader had clicked it.
     *
     * What an instrument needs when the thing it was clicked on is a star on
     * a card rather than a role in a step: the card carries body ids, so it
     * can say which star without knowing what the step called it.
     */
    selectId: id => {
      const body = allBodies().find(b => b.id === id);
      return body ? selectBody(body) : false;
    },
    /** Who is computing what, for a line under an instrument. */
    mode: modeDescription,
    /**
     * The stars this step stood on the canvas, as values.
     */
    stagedSample: () =>
      stagedStars().map(entry => ({
        role: entry.role,
        name: entry.star?.name ?? entry.role,
        bodyId: entry.star?.id ?? null,
        model: entry.model,
        anonymous: Boolean(entry.star?.anonymous),
      })),
    /** A cheap signature of the current stage, so a widget can memoise. */
    stageKey: () => stageKey(),
    /**
     * Draw the stage of a star's life around a staged body.
     */
    showEvolutionScene: (role, frame, opts = {}) => {
      const body = roleBody(role);
      if (!body || !frame) return false;
      state.evolutionOverlay.active = true;
      state.evolutionOverlay.bodyId = body.id;
      state.evolutionOverlay.frame = frame;
      state.evolutionOverlay.seed = opts.seed ?? 'lives';
      state.evolutionOverlay.lostFraction = Number(opts.lostFraction) || 0;
      state.evolutionOverlay.stillFrame = Boolean(opts.stillFrame);
      return true;
    },
    /** Take it down. */
    clearEvolutionScene,
    /**
     * Change which gravitational-wave source is on the canvas.
     *
     * The beginner lesson's central claim is that motion is not what makes a
     * source radiate, and it needs a reader to be able to stand a static
     * mass, a spherically pulsing one and a binary on the canvas in turn.
     * This is what its source control calls.
     */
    setSourceMode,
    /** Breathe the single source, from the model clock. */
    pulseSource,
    /** Rebuild the staged pair when its components change. */
    restageBinary,
    /**
     * The units the staged binary is placed in.
     *
     * Handed over rather than imported, so an instrument can size an overlay
     * against the pair without js/gwWidgets.js taking a dependency on the
     * stage - and so there is one definition of the scale rather than a copy
     * of the constant in the widget.
     */
    binaryScale: () => BINARY_SCALE,
    /**
     * Put the crests a source has emitted on the canvas.
     *
     * Handed the rings themselves, computed from the model's emission history
     * by js/lesson/gwWavefronts.js, so the picture belongs to the playhead
     * position rather than to a wall clock. Null takes the overlay down,
     * which is what a source with no changing quadrupole gets.
     */
    showWavefronts: crests => {
      const o = state.gwWaveOverlay;
      if (!o) return false;
      if (!crests?.length) {
        o.active = false;
        o.crests = [];
        return false;
      }
      o.active = true;
      o.crests = crests;
      return true;
    },
    /** Re-apply the population stage under a new brightness cut. */
    restagePopulation,
    /** What the population stage last put up: counts, cut, and provenance. */
    population: () => stagedPopulation(),
    /** Write a model's answer onto a staged star, sizing it as it goes. */
    restageStar,
    /**
     * Replace a staged star with the remnant its track's prescription names.
     *
     * The reader's selection follows it, because a white dwarf is a different
     * body class from a star and the card they have open must not close on
     * them. A prescription of 'unfinished' leaves the star where it is:
     * inventing a remnant for a model that stopped first is the one thing
     * js/stellar/endpoints.js exists to refuse.
     */
    becomeRemnant,
    /** Which remnant a staged role has become, if any. */
    remnantKindOf,
    /**
     * Put the staged binary where a waveform model says it is.
     *
     * The separation and phase come from the timeline the plot is drawn from,
     * so the picture on the canvas and the curve in the panel are one thing
     * described twice rather than two things that happen to look alike.
     */
    placeBinary,
    /**
     * Where the staged pair's balance point is, and how far each star is from
     * it - measured off the live bodies, not restated from the declaration.
     *
     * The ratio of the two arms is the inverse of the mass ratio, which is the
     * one relationship "Weighing the Stars" is built on, so it is read rather
     * than told.
     */
    barycenter: stagedBarycenter,
    /**
     * Rebuild the staged pair with different masses, same separation.
     *
     * A mass-ratio control has to restand the pair rather than edit a mass in
     * place: a star whose mass changed mid-orbit is on a path that no longer
     * closes, and the lesson would be showing a decaying spiral while calling
     * it a circle.
     */
    restageStarPair,
    /**
     * Rebuild the staged black hole with a different mass.
     *
     * A restage rather than an edit for the same reason the star pair is: the
     * orbiters' speeds were chosen for the old mass, and changing the central
     * mass under them would leave every one of them on a path that no longer
     * closes.
     */
    restageHole,
    /**
     * What a black hole of a given mass is really like, in SI.
     *
     * Kept separate from anything the canvas draws, and the reason is the one
     * this lesson has to keep making: the dark disc on screen is a drawing at
     * a scale chosen so the orbits fit in a window, and the Schwarzschild
     * radius is a physical length in kilometers. Quoting the second while
     * pointing at the first is the misconception the step exists to prevent,
     * so the readout that uses this says which is which.
     */
    holeFacts: massSun => blackHoleFacts(massSun),
    /**
     * Where the observed star is in its orbit, and what the spectrograph is
     * reading at that instant.
     */
    rvNow: () => {
      const star = observedStar();
      if (!star) return null;
      const velocity = currentRadialVelocity();
      const primary = star ? primaryOf(star) : null;
      const el = primary ? orbitalElements(star, primary, G) : null;
      const angle = Math.atan2(star.pos.y, star.pos.x);
      return {
        star,
        name: star.name,
        velocity,
        held: velocity === null,
        towards:
          velocity === null
            ? null
            : velocity < 0
              ? 'towards us'
              : 'away from us',
        phaseDeg: ((angle * 180) / Math.PI + 360) % 360,
        period: el?.period ?? null,
        observerAngleDeg: getObserverAngle(),
      };
    },
    /**
     * Where a planet sits against its own star's habitable zone, right now.
     */
    habitability: body => {
      const planet = body || selected;
      if (!planet) return null;
      const star = primaryOf(planet);
      if (!star) return null;
      const props = stellarPropertiesFor(star);
      if (!props) return null;
      const model = habitableZoneModelFromSettings(SETTINGS);
      const bounds = habitableZoneBounds(props, model);
      const dx = planet.pos.x - star.pos.x;
      const dy = planet.pos.y - star.pos.y;
      const distanceAU = Math.hypot(dx, dy) / SIM_UNITS_PER_AU;
      return {
        planet,
        star,
        starName: star.name,
        distanceAU,
        insolation: relativeInsolation(props.luminositySolar, distanceAU),
        bounds,
        model,
        ...habitableZoneStatus(distanceAU, bounds),
      };
    },
    /**
     * How far the whole world's conserved quantities have moved.
     */
    conservation: () => conservationDrift(),
    /**
     * Where a transiting body is against its star's disc, right now.
     *
     * The link between the dot on the canvas and the dip on the plot. Read from
     * js/lightCurve.js, which is the module that decides it while computing the
     * curve, so the label and the curve cannot disagree.
     */
    transitGeometry: body => transitGeometry(body || selected),
    /** Pin a labeled copy of a staged star as it is right now. */
    pinSnapshot,
    /** Every pinned snapshot, oldest first. */
    snapshots: pinnedSnapshots,
    /** An immutable record of what was on screen, for the notebook. */
    evidence: evidenceSnapshot,
    find: name =>
      allBodies().find(b =>
        String(b.name || '')
          .toLowerCase()
          .includes(String(name).toLowerCase())
      ),
    /**
     * The Experiment Bench's active experiment, if the bench has been opened.
     *
     * A getter rather than a value, and null rather than an import, because the
     * bench is lazily loaded: a lesson that never touches it must not pull its
     * chunk in, and a widget that reads it has to cope with it not being there
     * yet. The chaos lesson's divergence widget is the only consumer.
     */
    experiment: () => {
      try {
        return window.__gravitasBench?.activeExperiment?.() ?? null;
      } catch {
        return null;
      }
    },
    /**
     * Whether a recorded run still describes the scene on the canvas.
     */
    runMatchesScene: run => {
      const stamped = run?.worldGeneration;
      if (!Number.isFinite(stamped)) return null;
      return stamped === getWorldGeneration();
    },
  };
}

// --- Setting up a step's scenario ---------------------------------------------

/**
 * Convert a lesson's declarative setup into a shared-link payload.
 *
 * Reusing the link format means a lesson step and a shared link travel the same
 * code path, so a step cannot set up a state that could not also be handed out
 * as a URL, which is how the "open this exact state" links in the report stay
 * honest.
 *
 * @param {Object} setup - From a step definition
 * @returns {Object} Payload for applyShareState
 */
function payloadFromSetup(setup) {
  const payload = {
    v: 1,
    s: setup.scenario,
    seed: formatSeed(normalizeSeed(setup.seed ?? setup.scenario)),
  };
  if (setup.settings) payload.d = { ...setup.settings };
  if (setup.camera) {
    payload.c = [
      setup.camera.zoom ?? 1.5,
      setup.camera.pan?.x ?? 0,
      setup.camera.pan?.y ?? 0,
    ];
  }
  if (setup.paused) payload.p = 1;
  return payload;
}

function applySetup(setup) {
  if (!setup) return;
  appliedSetup = setup;
  try {
    applyShareState(payloadFromSetup(setup));
    // A rebuild resets settings to the scenario's own, so the lesson's locks
    // have to be reasserted every time rather than set once on open.
    applyLocks();
  } catch (err) {
    console.warn('Could not set up investigation step:', err);
    toast(t('inv.error.scenario'));
  }
}

/**
 * Hold the simulation still in the ways a lesson depends on.
 *
 * Clicking a planet to select it and dragging on empty space to place a new one
 * are the same gesture a few pixels apart, so a student aiming at a planet
 * regularly drops a star next to it instead, which silently changes the system
 * they are measuring. Placement is therefore off by default during a lesson,
 * and can be turned back on for the steps that ask for it.
 */
/**
 * Resolve this step's `bind` against the world that is on screen.
 * @returns {void}
 */
function bindStepRoles() {
  const step = currentStep();
  // Whatever the last step was illustrating is not this step's business. The
  // widget re-asserts it on its first tick if this step wants one, so the
  // cost of clearing here is one frame and the cost of not clearing is a
  // supernova drawn around a star that has just been restaged as the Sun.
  clearEvolutionScene();
  // Frozen copies belong to the screen that froze them, and two consecutive
  // steps can share a stage - in which case applyStage does nothing and the
  // copies would otherwise still be standing there under a different question.
  clearSnapshots();
  // A stage declares the whole scene and binds its own roles, so it takes
  // precedence: a step cannot both stand its own stars on the canvas and bind
  // roles to somebody else's.
  if (step?.stage) {
    const { problems } = applyStage(step.stage);
    // The fit itself is deferred: applyStage records that one was asked for
    // and the panel's own tick performs it, once the panel and the instrument
    // have been laid out and the application has finished setting up its
    // camera. Fitting here instead measured panels that were not there yet and
    // was then overwritten by the boot.

    for (const [role, reason] of Object.entries(problems)) {
      console.warn(
        `Investigation "${active?.id}" step "${step.sid}": staged star "${role}" - ${reason}`
      );
    }
    return;
  }
  clearStage();
  if (!step?.bind) {
    releaseModelOwnership();
    return;
  }
  const { problems } = bindRoles(step.bind, {
    modelOwned: step.prescribes || [],
  });
  for (const [role, reason] of Object.entries(problems)) {
    console.warn(
      `Investigation "${active?.id}" step "${step.sid}": role "${role}" is unbound - ${reason}`
    );
  }
}

function applyLocks() {
  if (!active) return;
  const lock = active.lock || {};
  const step = currentStep();
  // A step can opt back in: the energy lesson asks students to launch things.
  const allowPlacement = step?.allowPlacement === true;
  if (lock.placement !== false && !allowPlacement) {
    SETTINGS.interactive_add = false;
  } else {
    SETTINGS.interactive_add = true;
  }
  // The rail button may be lit and the cursor a crosshair from before the
  // lesson opened. Placement is already refused, but the interface should not
  // keep offering it - and on a narrow window the picker would open over the
  // lesson panel itself.
  syncPlacementAvailability();
  // A step can hand the object card back for one screen, which is how the
  // TRAPPIST-1 step lets students click a planet and read its period off the
  // live system.
  const allowInspector = step?.allowInspector === true;
  setInspectorSuppressed(lock.inspector !== false && !allowInspector);
  // A lesson that borrows a scenario built for a different lesson can refuse
  // the overlay that scenario switches on for itself.
  setAreaSweepSuppressed(lock.areaSweep === false);
}

/**
 * Take down the life-stage illustration.
 *
 * Called on a step change as well as on close, because the overlay names a
 * body and a moment and both belong to one screen. A cloud left drawn around
 * a star the next step has restaged is the kind of leak that looks like a
 * rendering bug rather than a lesson bug.
 *
 * @returns {void}
 */
function clearEvolutionScene() {
  const o = state.evolutionOverlay;
  if (!o) return;
  o.active = false;
  o.bodyId = null;
  o.frame = null;
  o.lostFraction = 0;
  o.stillFrame = false;
}

/** Take the wave crests off the canvas. */
function clearWavefronts() {
  const o = state.gwWaveOverlay;
  if (!o) return;
  o.active = false;
  o.crests = [];
}

/** Hand the simulation back to the user when a lesson closes. */
function releaseLocks() {
  // The explanation labels and the balance point belong to the lesson that
  // asked for them.
  SETTINGS.bh_explain_view = false;
  state.barycenterOverlay.active = false;
  state.barycenterOverlay.ids = [];
  clearEvolutionScene();
  clearWavefronts();
  setInspectorSuppressed(false);
  setAreaSweepSuppressed(false);
  if (lockedSettings) {
    SETTINGS.interactive_add = lockedSettings.interactive_add;
    lockedSettings = null;
  } else {
    SETTINGS.interactive_add = true;
  }
  syncPlacementAvailability();
}

// --- Answer feedback ----------------------------------------------------------

// --- Step helpers -------------------------------------------------------------

/**
 * The response-key prefix for a step, by position.
 *
 * Keyed by the step's stable `sid` rather than its index, so an answer stays
 * attached to its question when a lesson is reordered. See
 * ./investigations/progressSchema.js for why neither position nor a structural
 * fingerprint was enough.
 */
const stepId = index => stepKey(active.id, active.steps[index]?.sid);
const shown = () => active.steps.filter(s => inDepth(s, depth));
const currentStep = () => active?.steps[stepIndex] ?? null;

/**
 * The prediction, if any, that this step is where the answer arrives.
 * @param {Object} step - The step being rendered
 * @returns {?{chose: string, answer: string, right: boolean, because: string}}
 */
function predictionAnsweredHere(step) {
  if (!active || !step?.sid) return null;
  const from = active.steps.find(x => x.reveal === step.sid);
  if (!from || !Array.isArray(from.options) || from.answer === undefined) {
    return null;
  }
  const chosen = responses[stepKey(active.id, from.sid)];
  if (chosen === undefined) return null;
  const index = Number(chosen);
  return {
    chose: from.options[index] ?? String(chosen),
    answer: from.options[from.answer] ?? '',
    right: index === from.answer,
    because: from.because || '',
  };
}

// --- Measured values ----------------------------------------------------------

/**
 * The numbers a student has typed into the current step, keyed by field id.
 * @param {Object} step - Step definition
 * @param {string} id - Step response-key prefix
 * @returns {Object} field id -> number (NaN where blank or unparseable)
 */
function fieldValues(step, id) {
  const out = {};
  for (const f of step.fields || []) {
    const key = `${id}:${f.id}`;
    const raw = responses[key];
    // In the convention it was typed in: Number() made "0,91" NaN.
    out[f.id] = parseFieldNumber(
      raw,
      localeOfAnswer(responses, key, getLocale())
    );
    out[`${f.id}_text`] = raw ?? '';
  }
  return out;
}

/**
 * Fill in any field that is derived from the others.
 *
 * Arithmetic a student does on a calculator and copies back is arithmetic they
 * can get wrong in a way that has nothing to do with the astronomy. Computing
 * the derived value here keeps the assessment pointed at the concept, and it
 * gives the validator a number it can trust.
 *
 * @param {Object} step - Step definition
 * @param {string} id - Step response-key prefix
 * @returns {boolean} True if anything changed
 */
function recomputeFields(step, id) {
  let changed = false;
  const vals = fieldValues(step, id);
  for (const f of step.fields || []) {
    if (!f.compute) continue;
    let next;
    try {
      // The second argument reads an earlier step's field.
      next = f.compute(vals, (sid, field) => {
        const key = `${stepKey(active.id, sid)}:${field}`;
        return parseFieldNumber(
          responses[key],
          localeOfAnswer(responses, key, getLocale())
        );
      });
    } catch {
      next = NaN;
    }
    // Recorded with its convention: "0.910" read as Spanish is 910.
    const locale = getLocale();
    const text = formatFieldNumber(next, f.decimals ?? 2, locale);
    const key = `${id}:${f.id}`;
    if (
      responses[key] !== text ||
      localeOfAnswer(responses, key, '') !== locale
    ) {
      recordAnswer(responses, key, text, locale);
      changed = true;
    }
  }
  return changed;
}

/**
 * Run a step's sanity check over what has been entered.
 * @param {Object} step - Step definition
 * @param {string} id - Step response-key prefix
 * @returns {{level:string, message:string}|null} Feedback, or null
 */
function validateStep(step, id) {
  if (!step.validate) return null;
  try {
    return step.validate(fieldValues(step, id), probeContext()) || null;
  } catch (err) {
    console.warn('Step validation failed:', err);
    return null;
  }
}

/** Draw the step's scatter plot from the lesson's current state. */
function drawPlot(step, id) {
  drawPlotFigure(step, fieldValues(step, id), {
    canvas: plotCanvas,
    els,
    transformed: plotTransformed,
    log: plotLog,
  });
}

// --- Panel rendering ----------------------------------------------------------

function renderStep() {
  const step = currentStep();
  if (!step || !els.body) return;
  const id = stepId(stepIndex);
  const saved = responses[id];

  const parts = stepMarkup(step, {
    id,
    saved,
    active,
    responses,
    visited,
    shown,
    predictionAnsweredHere,
    recomputeFields,
  });

  els.body.innerHTML = parts.join('');

  // Both classes are set before the panels are filled, not after: a widget
  // sizes its canvas from the space it is about to be given, and reads these
  // classes to know what that is. Toggling them afterwards left every
  // measurement screen drawing at full height and pushing its own controls out
  // of view.
  //
  // investigation-aux: a second panel is docked beside the lesson. The light
  // curve gives up height to it when both are on screen.
  document.body.classList.toggle(
    'investigation-aux',
    Boolean(step?.tool || step?.plot || step?.type === 'ellipse')
  );
  // investigation-split: a step carries an instrument and a plot at once, which
  // is what a measurement screen wants: read the value off the instrument, type
  // it in, watch the point land. The two panels dock to the same place, so they
  // are told to share the column.
  document.body.classList.toggle(
    'investigation-split',
    Boolean(step?.tool && step?.plot)
  );

  syncPlotPanel(step);
  syncEllipsePanel(step);
  syncToolPanel(step);
  syncLightCurve(step);
  syncEventWatch(step);
  renderProbe();
  renderFooter();
  bindStepInputs({
    els: () => els,
    responses: () => responses,
    attempts: () => attempts,
    stepId: () => stepId(stepIndex),
    currentStep,
    save,
    renderStep,
    refreshMeasurements,
    importSelection,
  });
  refreshMeasurements();
}

/**
 * Open the pause-at-event tool for a step that asks a student to catch a
 * moment. A step declares `pauseAt: {kind, body, primary, label, note}`; the
 * tool opens with those chosen and arms NOTHING, so the reader's press of Arm
 * is the interaction asked for. All of it is behind a dynamic import. The
 * release on the way out matters: a watch armed on one step must not fire into
 * the next (js/investigations/eventWatch.js).
 *
 * @param {Object} step - Step definition
 */
function syncEventWatch(step) {
  const spec = step?.pauseAt;
  if (!spec) {
    // Leaving the activity. Released unconditionally rather than only when we
    // armed something, because the listener is ours either way and a lesson
    // that closed with one attached is a lesson whose callbacks outlive it.
    if (eventWatchLoaded) {
      import('./investigations/eventWatch.js')
        .then(m => m.release())
        .catch(() => {});
    }
    return;
  }

  eventWatchLoaded = true;
  import('./investigations/eventWatch.js')
    .then(async watch => {
      // A fresh step gets a fresh generation, so anything armed for the
      // previous one cannot report into this one.
      watch.release();
      const ctx = probeContext();
      const bodies = ctx?.bodies || [];
      const body = watch.resolveByName(bodies, spec.body);
      const primary = watch.resolveByName(bodies, spec.primary);
      // A transit watch needs no bodies: it reads the photometer's own
      // detector, so it is armable with nothing selected.
      if (spec.kind !== 'transit' && (!body || !primary)) return;
      await watch.openToolFor({
        kind: spec.kind,
        bodyId: body?.id ?? null,
        primaryId: primary?.id ?? null,
        separation: Number.isFinite(spec.separation) ? spec.separation : null,
      });
    })
    .catch(err => {
      console.warn('The pause-at-event tool could not be opened:', err);
    });
}

/** Whether this session has ever loaded the event-watch integration. */
let eventWatchLoaded = false;

/**
 * Show or hide the docked plot panel for the current step.
 * @param {Object} step - Step definition
 */
function syncPlotPanel(step) {
  if (!els.plotPanel) return;
  const spec = step?.plot;
  els.plotPanel.hidden = !spec;
  plotCanvas = spec ? els.plotCanvas : null;
  if (!spec) {
    if (els.plotTableWrap) els.plotTableWrap.hidden = true;
    return;
  }
  resetExplainer(els.plotExplain);
  els.plotTitle.textContent = spec.title || t('inv.plot.title');
  els.plotNote.innerHTML = spec.note ? prose(spec.note) : '';
  els.plotNote.hidden = !spec.note;
  if (els.plotToggle) {
    els.plotToggle.hidden = !spec.transform;
    if (spec.transform) {
      els.plotToggle.textContent = spec.transform.label;
      els.plotToggle.setAttribute('aria-pressed', String(plotTransformed));
      els.plotToggle.classList.toggle('is-on', plotTransformed);
    }
  }
}

/**
 * The "What am I looking at?" button of a docked panel.
 *
 * Its label and its closed state are set each time the panel is drawn for a
 * step, so a region opened on one step is not left under the next. The words
 * are a lazy module fetched on the first press (js/explainers.js).
 *
 * @param {?HTMLElement} button - The panel header's button
 * @returns {void}
 */
function resetExplainer(button) {
  if (!button) return;
  const host = button.closest('header');
  if (host?.nextElementSibling?.classList.contains('explainer'))
    host.nextElementSibling.remove();
  button.setAttribute('aria-expanded', 'false');
  button.removeAttribute('aria-controls');
  button.textContent = t('inv.explain.open');
}

/**
 * Wire a panel's explainer button once.
 * @param {?HTMLElement} button - The button
 * @param {(m: object) => ?string} keyOf - The explainer for what is showing now
 * @param {object} [opts] - Listener options (the unmount signal)
 */
function wireExplainer(button, keyOf, opts) {
  button?.addEventListener(
    'click',
    async () => {
      const m = await import('./explainers.js');
      const key = keyOf(m);
      if (key) m.toggleExplainer(button, key, button.closest('header'));
    },
    opts
  );
}

/**
 * Show or hide the ellipse explorer panel for the current step.
 * @param {Object} step - Step definition
 */
function syncEllipsePanel(step) {
  if (!els.ellipsePanel) return;
  const on = step?.type === 'ellipse';
  els.ellipsePanel.hidden = !on;
  if (!on) return;
  resetExplainer(els.ellipseExplain);
  const id = stepId(stepIndex);
  const e = Number(responses[`${id}:e`] ?? step.start ?? 0.5);
  els.ecc.value = String(e);
  els.eccOut.textContent = e.toFixed(3);
  els.presets.innerHTML = (step.presets || [])
    .map(
      (pr, i) =>
        `<button type="button" class="inv-preset" data-preset="${i}">${escape(pr.label)}<span>${pr.e.toFixed(3)}</span></button>`
    )
    .join('');
  els.presets.querySelectorAll('[data-preset]').forEach(btn => {
    btn.addEventListener('click', () => {
      const pr = currentStep().presets[Number(btn.dataset.preset)];
      els.ecc.value = String(pr.e);
      paintEllipse(pr.e);
      els.presetNote.innerHTML = prose(pr.note || '');
    });
  });
  els.presetNote.textContent = '';
  paintEllipse(e);
}

/**
 * Show or hide the interactive instrument for the current step.
 *
 * A widget is a canvas, some sliders and a readout, all described in
 * transitWidgets.js. Rendering them from one place means a lesson adds an
 * instrument by naming it, and the panel, the persistence and the redraw on a
 * theme change all come for free.
 *
 * @param {Object} step - Step definition
 */
function syncToolPanel(step) {
  if (!els.toolPanel) return;
  const spec = step?.tool;
  const widget = spec ? getWidget(spec.id) : null;
  stopToolLoop();
  // An instrument whose family is fetched on demand. The panel says it is
  // loading, in the note - made a status region for as long as it is saying
  // so, because it is not one otherwise - fetches the family, and redraws only
  // if the reader is still on this step. A failed fetch says so in the same
  // region. If asking again can help, it offers a retry, which takes focus; if
  // it cannot (see WidgetLoadError), it offers a reload, which keeps the
  // reader's answers because they are already saved.
  els.toolNote.removeAttribute('role');
  if (spec && !widget && needsLoading(spec.id)) {
    els.toolNote.setAttribute('role', 'status');
    els.toolPanel.hidden = false;
    els.toolTitle.textContent = spec.title || '';
    els.toolNote.textContent = t('inv.tool.loading');
    els.toolNote.hidden = false;
    els.toolControls.innerHTML = '';
    els.toolControls.hidden = els.toolMore.hidden = true;
    clearToolInstrument();
    ensureWidget(spec.id)
      .then(() => {
        if (currentStep() === step) syncToolPanel(step);
      })
      .catch(err => {
        if (currentStep() !== step) return;
        const retryable = err?.retryable !== false;
        els.toolNote.textContent = t(
          retryable ? 'inv.tool.failed' : 'inv.tool.reloadNeeded'
        );
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'ui-button';
        button.textContent = t(
          retryable ? 'inv.tool.retry' : 'inv.tool.reload'
        );
        button.addEventListener('click', () =>
          retryable ? syncToolPanel(step) : window.location.reload()
        );
        els.toolControls.replaceChildren(button);
        els.toolControls.hidden = false;
        button.focus();
      });
    return;
  }
  els.toolPanel.hidden = !widget;
  if (!widget) return;

  const id = stepId(stepIndex);
  // Values persist per step, so moving back to a step finds the sliders where
  // they were left rather than reset to the lesson's opening position.
  toolValues = widgetDefaults(widget, spec.values);
  for (const c of widget.controls) {
    const saved = responses[`${id}:tool:${c.id}`];
    if (saved !== undefined && saved !== '' && Number.isFinite(Number(saved))) {
      toolValues[c.id] = Number(saved);
    }
  }

  resetExplainer(els.toolExplain);
  els.toolTitle.textContent = spec.title || widget.title;
  els.toolNote.innerHTML = prose(spec.note ?? widget.note ?? '');
  els.toolNote.hidden = !els.toolNote.innerHTML;

  const shown = widget.controls.filter(c => !spec.hide?.includes(c.id));
  // What the step does not ask about folds behind "More" (widgets.js toolFold).
  const fold = toolFold(step, shown);
  const row = c => `<label class="inv-ecc-row" for="invTool-${escape(c.id)}">
              <span>${prose(c.label)}</span>
              <input type="range" id="invTool-${escape(c.id)}" data-tool="${escape(c.id)}"
                     min="${c.min}" max="${c.max}" step="${c.step}"
                     value="${toolValues[c.id]}" />
              <output data-tool-out="${escape(c.id)}"></output>
            </label>`;
  // Presets go home before the rebuild, then into More if they fold.
  els.toolPanel.append(els.toolPresets, els.toolPresetNote);
  els.toolControls.innerHTML = fold.open.map(row).join('');
  // An empty controls block is a bordered strip of nothing: left out.
  els.toolControls.hidden = shown.length === 0;
  els.toolMore.lastElementChild.innerHTML = fold.folded.map(row).join('');
  if (fold.presets) els.toolMore.lastElementChild.append(els.toolPresets);
  wireMore(els.toolMore, 'tool', { ...MORE, depth, declared: assignment?.mo });

  // A widget can decide its buttons from the step: the binary instrument grows
  // a stopwatch on the step that asks for one and not before.
  const actions =
    (typeof widget.actions === 'function'
      ? widget.actions(spec)
      : widget.actions) || [];
  els.toolActions.innerHTML = actions
    .map(
      a =>
        // An action may name an icon from css/icons.css; the words stay, in a
        // span of their own so a relabel below does not erase the picture.
        `<button type="button" class="inv-tool-action" data-tool-action="${escape(a.id)}">${a.icon ? `<span class="icon icon-${escape(a.icon)}" aria-hidden="true"></span>` : ''}<span>${escape(a.label)}</span></button>`
    )
    .join('');
  els.toolActions.hidden = !actions.length;
  toolActionsShown = actions;

  // Presets can depend on the step, as actions can: a step that hides a control
  // must be able to hide the presets that set it (the rotation-curve fit hides
  // its halo sliders, and a "published decomposition" button would hand over
  // the answer with no visible reason for the fit).
  const declared =
    typeof widget.presets === 'function'
      ? widget.presets(spec)
      : widget.presets;
  const presets = spec.presets === false ? [] : declared || [];
  els.toolPresets.innerHTML = presets
    .map(
      (pr, i) =>
        `<button type="button" class="inv-preset" data-tool-preset="${i}">${escape(pr.label)}</button>`
    )
    .join('');
  els.toolPresets.hidden = presets.length === 0;
  els.toolMore.hidden =
    !fold.folded.length && !(fold.presets && presets.length);
  els.toolPresetNote.textContent = '';

  const applied = () => {
    els.toolPanel.querySelectorAll('[data-tool]').forEach(input => {
      input.value = String(toolValues[input.dataset.tool]);
    });
    // A widget that animates restarts its run from the new settings: change
    // the speed, watch it happen. `fromControl` says a reader moved something,
    // not that the step opened: a widget that parks itself where the step asked
    // (the evolutionary playback's phase and track) does that once, on entry,
    // or the playhead and the track could not be changed (dead controls).
    widget.reset?.(toolValues, { autorun: true, spec, fromControl: true });
    paintTool();
  };

  els.toolPanel.querySelectorAll('[data-tool]').forEach(input => {
    input.addEventListener('input', () => {
      toolValues[input.dataset.tool] = input.valueAsNumber;
      els.toolPresetNote.textContent = '';
      applied();
    });
  });
  els.toolPresets.querySelectorAll('[data-tool-preset]').forEach(btn => {
    btn.addEventListener('click', () => {
      const pr = presets[Number(btn.dataset.toolPreset)];
      Object.assign(toolValues, pr.values);
      els.toolPresetNote.innerHTML = prose(pr.note || '');
      applied();
    });
  });
  wireToolPointer(widget, spec, applied);

  els.toolActions.querySelectorAll('[data-tool-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      try {
        // A live widget's action gets the lesson context, the same way its
        // frame and its readout do: a Capture button on an instrument whose
        // subject is the main scene has to be able to read that scene at the
        // instant of the click.
        widget.act?.(
          btn.dataset.toolAction,
          toolValues,
          spec,
          widget.live ? probeContext() : undefined
        );
      } catch (err) {
        console.warn('Widget action failed:', err);
      }
      paintTool();
    });
  });

  // A step can ask for the instrument to sit still until the student presses
  // Run, which is what a prediction step needs: showing them the answer while
  // asking them to predict it defeats the point of asking.
  widget.reset?.(toolValues, { autorun: spec.autorun !== false, spec });
  paintTool();
  if (widget.animated) startToolLoop(widget, spec);
}

/**
 * Run a widget that has to redraw itself continuously.
 *
 * Two kinds need it: one that animates a trajectory, and one that plots the
 * live simulation. Both are stopped the moment the step changes, so a lesson
 * never leaves a loop running behind a hidden panel.
 *
 * @param {Object} widget - The widget to drive
 */
function startToolLoop(widget, toolSpec) {
  let last = performance.now();
  const tick = now => {
    if (toolFrame === null) return;
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    try {
      // A live widget's frame is handed the lesson context too, the way its
      // draw and readout already are: an instrument whose controls drive the
      // main scene has to be able to reach it from the frame that moved them.
      widget.step?.(
        toolValues,
        dt,
        toolSpec,
        widget.live ? probeContext() : undefined
      );
      paintTool({ quiet: true });
    } catch (err) {
      console.warn('Widget frame failed:', err);
      stopToolLoop();
      return;
    }
    toolFrame = requestAnimationFrame(tick);
  };
  toolFrame = requestAnimationFrame(tick);
}

/** Stop the widget repaint loop, if one is running. */
function stopToolLoop() {
  if (toolFrame !== null) cancelAnimationFrame(toolFrame);
  toolFrame = null;
  toolActionsShown = [];
  toolPointer?.abort();
  toolPointer = null;
}

/**
 * Take the last step's instrument off the panel while this step's is fetched.
 */
function clearToolInstrument() {
  els.toolReadout.innerHTML = '';
  els.toolReadout.hidden = true;
  lastToolHtml = '';
  els.toolActions.innerHTML = '';
  els.toolActions.hidden = true;
  toolActionsShown = [];
  els.toolPresets.innerHTML = '';
  els.toolPresets.hidden = true;
  els.toolPresetNote.textContent = '';
  const canvas = els.toolCanvas;
  if (!canvas) return;
  canvas.removeAttribute('aria-label');
  canvas.removeAttribute('role');
  canvas.removeAttribute('tabindex');
  const g = canvas.getContext('2d');
  g?.setTransform(1, 0, 0, 1, 0, 0);
  g?.clearRect(0, 0, canvas.width, canvas.height);
}

/**
 * Let a widget be driven by pointing at its canvas, if it declares `pick`.
 * The hook gets a position in CSS pixels, writes into the values, and goes
 * through paintTool like a slider, so the sliders move to match. A widget that
 * declares `pick` also names the two controls the arrow keys step, and its
 * canvas becomes focusable: a diagram only a drag can drive is closed to some
 * students.
 * @param {Object} widget - The widget being shown
 * @param {Object} spec - The step's tool spec
 * @param {Function} applied - The runner's own "a control moved" path
 */
function wireToolPointer(widget, spec, applied) {
  const canvas = els.toolCanvas;
  if (!canvas || typeof widget.pick !== 'function') {
    canvas?.removeAttribute('tabindex');
    canvas?.removeAttribute('role');
    canvas?.removeAttribute('aria-label');
    return;
  }
  toolPointer = new window.AbortController();
  const { signal } = toolPointer;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'application');
  canvas.setAttribute('aria-label', t('inv.tool.pickable'));

  const at = event => {
    const box = canvas.getBoundingClientRect();
    return {
      x: event.clientX - box.left,
      y: event.clientY - box.top,
      width: box.width,
      height: box.height,
    };
  };
  const send = event => {
    if (widget.pick(toolValues, at(event), spec)) {
      els.toolPresetNote.textContent = '';
      applied();
    }
  };

  let dragging = false;
  canvas.addEventListener(
    'pointerdown',
    event => {
      dragging = true;
      canvas.setPointerCapture?.(event.pointerId);
      canvas.focus({ preventScroll: true });
      send(event);
      event.preventDefault();
    },
    { signal }
  );
  canvas.addEventListener(
    'pointermove',
    event => {
      if (dragging) send(event);
    },
    { signal }
  );
  for (const end of ['pointerup', 'pointercancel']) {
    canvas.addEventListener(end, () => (dragging = false), { signal });
  }

  // An axis can run backwards on the canvas - the H-R diagram's temperature
  // increases to the LEFT - and the arrow keys have to follow the picture
  // rather than the slider, or pressing left makes the star cooler on a
  // diagram whose left-hand side is the hot one.
  const axes = widget.pickAxes || {};
  const xWay = axes.flipX ? -1 : 1;
  const yWay = axes.flipY ? -1 : 1;
  const STEPS = {
    ArrowLeft: [axes.x, -xWay],
    ArrowRight: [axes.x, xWay],
    ArrowDown: [axes.y, -yWay],
    ArrowUp: [axes.y, yWay],
  };
  canvas.addEventListener(
    'keydown',
    event => {
      const move = STEPS[event.key];
      if (!move || !move[0]) return;
      const control = widget.controls.find(c => c.id === move[0]);
      if (!control) return;
      // Shift is the coarse move, the way it is on a slider.
      const by = control.step * move[1] * (event.shiftKey ? 10 : 1);
      const next = Math.min(
        control.max,
        Math.max(control.min, Number(toolValues[control.id]) + by)
      );
      if (next === toolValues[control.id]) return;
      toolValues[control.id] = next;
      els.toolPresetNote.textContent = '';
      applied();
      event.preventDefault();
    },
    { signal }
  );
}

/**
 * Redraw the current widget, refresh its readout and remember its settings.
 * @param {Object} [opts]
 * @param {boolean} [opts.quiet] - Skip the settings save, for animation frames
 */
function paintTool({ quiet = false } = {}) {
  const step = currentStep();
  const widget = step?.tool ? getWidget(step.tool.id) : null;
  if (!widget || !els.toolCanvas) return;
  const id = stepId(stepIndex);

  for (const c of widget.controls) {
    const value = Number(toolValues[c.id]);
    const out = els.toolPanel.querySelector(`[data-tool-out="${c.id}"]`);
    if (out) {
      out.textContent = c.format
        ? c.format(value)
        : `${value.toFixed(c.decimals ?? 2)}${c.unit ? ` ${c.unit}` : ''}`;
    }
    // An animated widget can move its own controls - a playhead advancing
    // along a timeline is a control the student can also drag - and until this
    // was here the number beside the slider tracked while the thumb sat still.
    // Never while the control has focus: writing a value into an input a
    // student is dragging fights them for it.
    const input = els.toolPanel.querySelector(`[data-tool="${c.id}"]`);
    if (
      input &&
      input !== document.activeElement &&
      input.value !== String(value)
    ) {
      input.value = String(value);
    }
    if (!quiet) responses[`${id}:tool:${c.id}`] = String(toolValues[c.id]);
  }

  // A toggle's label is a statement about the state it is in, so it has to be
  // re-read rather than written once when the step opened. The playback's
  // button said "Pause" for as long as the step lasted - including while the
  // playback was stopped - and because the text is the button's accessible
  // name, a screen reader was told the same wrong thing. The descriptors are
  // the ones the buttons were rendered from and their labels are getters, so
  // this reads the widget's current answer without rebuilding anything.
  for (const action of toolActionsShown) {
    const btn = els.toolActions?.querySelector(
      `[data-tool-action="${CSS.escape(action.id)}"]`
    );
    const label = action.label;
    const text = btn?.querySelector('span:not(.icon)');
    if (text && typeof label === 'string' && text.textContent !== label) {
      text.textContent = label;
    }
  }

  // Only widgets that ask for it are handed the simulation, so the rest stay
  // testable models that run with no world loaded.
  const ctx = widget.live ? probeContext() : undefined;
  try {
    widget.draw(els.toolCanvas, toolValues, ctx, step.tool);
    const rows = widget.readout(toolValues, ctx, step.tool);
    // The canvas is an image of what these rows say. Named from the widget's
    // own title so a screen reader says which instrument this is, and pointed
    // at the readout so the numbers on it are reachable without the picture.
    if (els.toolCanvas) {
      els.toolCanvas.setAttribute(
        'aria-label',
        `${String(widget.title || '').replace(/<[^>]*>/g, '')}${
          rows.length ? `: ${rows.length} measured values, listed below` : ''
        }`
      );
    }
    const html = rows
      .map(
        r =>
          `<div class="inv-tool-row${r.emphasis ? ' is-emphasis' : ''}">
             <dt>${prose(r.label)}</dt><dd>${escape(r.value)}</dd></div>`
      )
      .join('');
    if (html !== lastToolHtml) {
      els.toolReadout.innerHTML = html;
      // A widget can decide it has nothing to report, and an empty readout is a
      // bordered strip of nothing rather than a neutral absence.
      els.toolReadout.hidden = !html;
      lastToolHtml = html;
    }
  } catch (err) {
    console.warn('Widget draw failed:', err);
  }
  if (!quiet) save();
}

/**
 * Open or close the live light curve for the current step.
 *
 * Turned on from the lesson rather than left for the student to find in the
 * Tools menu, because a step that says "watch the dip" is useless if the plot
 * it means is three clicks away. It is only turned off again if the lesson was
 * the thing that opened it.
 *
 * @param {Object} step - Step definition
 */
function syncLightCurve(step) {
  if (step?.lightCurve === true) {
    if (!isLightCurveEnabled()) {
      setLightCurveEnabled(true);
      lightCurveOpenedByLesson = true;
    }
    if (Number.isFinite(step.observerAngle)) {
      setObserverAngle(step.observerAngle);
    }
    if (step.clearLightCurve) clearLightCurve();
  } else if (lightCurveOpenedByLesson && step?.lightCurve === false) {
    setLightCurveEnabled(false);
    lightCurveOpenedByLesson = false;
  }
  reflowForLightCurve();
}

/**
 * Tell the layout whether the light curve is on screen.
 *
 * Read from the tool's real state rather than from what the step asked for,
 * because a student can open or close it from the Tools menu at any point and
 * an instrument panel sized for the wrong answer either overlaps it or wastes
 * half the column.
 */
function reflowForLightCurve() {
  document.body.classList.toggle(
    'investigation-lightcurve',
    Boolean(active) && isLightCurveEnabled()
  );
}

/** Draw the ellipse and record the eccentricity as the step's answer. */
function paintEllipse(e) {
  if (!active) return;
  els.eccOut.textContent = Number(e).toFixed(3);
  drawEllipse(els.ellipseCanvas, Number(e));
  responses[`${stepId(stepIndex)}:e`] = String(e);
  save();
}

/**
 * Recompute derived fields, re-run the sanity check and redraw the plot.
 * Called on every keystroke in a measure step.
 */
function refreshMeasurements() {
  const step = currentStep();
  if (!step || step.type !== 'measure') return;
  const id = stepId(stepIndex);

  if (recomputeFields(step, id)) {
    for (const f of step.fields || []) {
      if (!f.compute) continue;
      const input = els.body.querySelector(
        `[data-field="${CSS.escape(`${id}:${f.id}`)}"]`
      );
      if (input) input.value = responses[`${id}:${f.id}`] ?? '';
    }
    save();
  }

  const slot = els.body.querySelector('[data-check-slot]');
  if (slot) {
    const result = validateStep(step, id);
    slot.className = `inv-check${result ? ` is-${result.level}` : ''}`;
    slot.innerHTML = result ? prose(lessonText(result.message)) : '';
    slot.hidden = !result;
  }

  drawPlot(step, id);
}

/** Count the time since the last tick, unless the page was hidden or idle. */
function clock() {
  const now = Date.now();
  if (lastTick && !document.hidden)
    spent += Math.min(now - lastTick, 6e4) / 1e3;
  lastTick = now;
}

/** The steps the lesson's declared time is for: the whole lesson at core depth. */
let fullSteps = 0;

/**
 * The lesson's declared time ("35-45 min") scaled to what is on offer: an
 * assignment is part of the lesson, and a deeper level is more of it. Whole
 * minutes, and the declared text untouched when nothing is scaled.
 *
 * @param {string} duration - The lesson's range, e.g. '35-45 min'
 * @param {number} count - Steps on offer now
 * @returns {string} The range to show
 */
function plannedTime(duration, count) {
  const base =
    fullSteps || active.steps.filter(s => inDepth(s, 'core')).length || 0;
  const m = /^(\d+)\s*-\s*(\d+)(.*)$/.exec(duration || '');
  const f = base ? count / base : 1;
  if (!m || !(f > 0) || Math.abs(f - 1) < 0.03) return duration || '';
  const lo = Math.max(1, Math.round(m[1] * f));
  const hi = Math.max(lo, Math.round(m[2] * f));
  return `${lo === hi ? lo : `${lo}-${hi}`}${m[3]}`;
}

/** The where line: step, depth and time against what the lesson declares. */
function renderWhere(seen) {
  const w = els.where;
  if (!w) return;
  clock();
  const tpl = w.dataset[getLocale() === 'es' ? 'es' : 'en'];
  w.textContent = tpl
    .replace('{n}', seen.indexOf(currentStep()) + 1)
    .replace('{total}', seen.length)
    .replace('{depth}', depthName ? ` · ${depthName}` : '')
    .replace('{m}', Math.floor(spent / 60))
    .replace('{planned}', plannedTime(active.duration, seen.length));
}

function renderFooter() {
  const step = currentStep();
  if (authoring?.render) authoring.render(active, stepIndex);
  renderSaveStatus();
  renderProgressNotice();
  // An authoring preview has no progress to back up and must not write any: the
  // controls that do are not offered (the status line says why).
  const backup = els.backupDownload?.closest('.inv-backup');
  if (backup) backup.hidden = Boolean(authoring);
  els.prev.disabled = stepIndex === 0;
  els.next.textContent =
    stepIndex === active.steps.length - 1
      ? t('inv.action.finish')
      : t('inv.action.next');
  const seen = shown();
  const done = seen.filter(s => visited.has(s.sid)).length;
  els.progressBar.style.width = `${Math.round((done / seen.length) * 100)}%`;
  els.progressText.textContent = t('inv.progress.steps', {
    done,
    total: seen.length,
  });
  renderDepth();
  renderWhere(seen);
  els.probeWrap.hidden = !step?.probe;
}

let lastProbeHtml = '';
let lastSweepId = null;
let lastObjectsKey = '';
/** Whether the lesson's objects list was left open. */
const OBJECTS_OPEN_KEY = 'gravitas_lesson_objects_open';

/** Past this many, the object list is a count rather than a row of chips. */
const OBJECT_LIST_MAX = 12;

/**
 * The keyboard's way to select the objects a step is about.
 * @returns {void}
 */
/**
 * A reader-facing name for a lesson's role key. A translation wins; otherwise
 * the key is derived (`starA` becomes "star A", `m2000` "20 M☉"), right in both
 * languages, so a role a lesson invents still gets a sensible label.
 *
 * @param {string} key - The role as the lesson wrote it
 * @returns {string} What to show in the object list
 */
function roleLabel(key) {
  const id = `inv.role.${key}`;
  const text = t(id);
  if (text !== id) return text;
  // The stellar shelves name their members by mass in hundredths of a solar
  // mass, which is a storage format and not a label.
  const mass = /^m(\d{2,4})$/.exec(key);
  if (mass) return `${Number(mass[1]) / 100} M☉`;
  return key.replace(/([a-z])([A-Z])/g, '$1 $2');
}

/**
 * Whether the role chip would only repeat the body's own name.
 *
 * Half the lessons name their roles after the bodies - `earth`, `io`, `moon` -
 * and the chip then read "EARTH Earth", which is a label and its own echo. The
 * name is the more useful of the two, so in that case the role is dropped.
 *
 * @param {string} label - The resolved role label
 * @param {string} name - The body's name in the world
 * @returns {boolean} True when the role adds nothing
 */
function roleEchoesName(label, name) {
  const a = String(label).trim().toLowerCase();
  const b = String(name).trim().toLowerCase();
  return Boolean(a) && (a === b || b.startsWith(`${a} `));
}

function renderObjectList() {
  if (!els.objects || !els.objectsWrap) return;
  const step = currentStep();
  const wanted = Boolean(step?.bind || step?.stage);
  els.objectsWrap.hidden = !wanted;
  if (els.stageTools) els.stageTools.hidden = !step?.stage;
  if (!wanted) {
    lastObjectsKey = '';
    els.objects.replaceChildren();
    return;
  }
  // A stage of three stars lists three chips. A population stage of a hundred
  // and twenty would list a hundred and twenty, which is not an accessibility
  // feature but a wall, so past a dozen the list becomes a count plus whatever
  // is selected - and the canvas, which is where a population is read anyway.
  const all = selectableBodies().filter(entry => entry.role);
  const crowded = all.length > OBJECT_LIST_MAX;
  const named = crowded ? all.filter(e => e.selected) : all;
  const key = `${crowded ? all.length : 0}|${named
    .map(e => `${e.id}:${e.role}:${e.selected ? 1 : 0}`)
    .join('|')}`;
  if (key === lastObjectsKey) return;
  lastObjectsKey = key;
  // Selecting from this list changes the list - the selected entry is marked -
  // which rebuilds it, which throws away the focus a keyboard user was
  // standing on. Remembering which entry had it and putting it back is what
  // makes the list usable with a keyboard at all: press Enter and you are
  // still on the thing you just selected, not at the top of the document.
  const hadFocus = els.objects.contains(document.activeElement)
    ? document.activeElement.dataset.objectId
    : null;
  els.objects.replaceChildren();
  if (crowded) {
    const note = document.createElement('p');
    note.className = 'inv-probe-row';
    note.textContent = t('inv.objects.many', {
      count: all.length,
      staged: stagedStars().length,
    });
    els.objects.append(note);
  } else if (!named.length) {
    const empty = document.createElement('p');
    empty.className = 'inv-probe-row';
    empty.textContent = t('inv.objects.empty');
    els.objects.append(empty);
    return;
  }
  for (const entry of named) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'inv-object';
    // A pressed toggle rather than a listbox option: one tab stop each, no
    // roving tabindex to get wrong, and a state a screen reader announces
    // without the container having to manage anything.
    button.setAttribute('aria-pressed', String(entry.selected));
    button.dataset.objectId = String(entry.id);
    const label = roleLabel(entry.role);
    const name = document.createElement('span');
    name.className = 'inv-object-name';
    name.textContent = entry.name;
    if (roleEchoesName(label, entry.name)) {
      button.append(name);
    } else {
      const role = document.createElement('span');
      role.className = 'inv-object-role';
      role.textContent = label;
      button.append(role, name);
    }
    const choose = () => {
      const body = selectableBodies().find(b => b.id === entry.id);
      if (body) selectRole(body.role);
    };
    button.addEventListener('click', choose);
    // Enter and Space by hand, and stopped from traveling any further.
    // A button fires click on Enter by itself, but this one is inside a
    // document that binds single keys as shortcuts, and the first handler to
    // see the event decides: pressing Enter here selected nothing and did
    // whatever the shortcut layer thought Enter meant.
    button.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      event.stopPropagation();
      choose();
    });
    els.objects.append(button);
  }
  if (hadFocus) {
    els.objects
      .querySelector(`[data-object-id="${CSS.escape(hadFocus)}"]`)
      ?.focus();
  }
}

/** The body the last probe tick saw selected, so a change can be noticed. */
let lastProbeSelection = null;

function renderProbe() {
  const step = currentStep();
  // A stage owns the whole scene, so if something else has replaced the scene
  // the stage puts itself back. This happens on a cold load into a staged step:
  // the application rebuilds its own world after the lesson has opened, and
  // without this the reader is left looking at a scenario the step knows
  // nothing about. Cheap: it rebuilds only when the stars have actually gone.
  if (step?.stage) {
    // Only when the scene has been *replaced*, not when the reader has been
    // experimenting. Deleting a body, firing one into a star, letting two
    // merge - those are things a reader did on purpose, and rebuilding the
    // stage under them would be the application undoing their work every
    // quarter of a second. A world that has been swapped wholesale leaves
    // nothing of the stage behind, and that is what this waits for.
    const presence = stagePresence();
    if (presence.allGone) {
      applyStage(step.stage, { force: true });
      // The instrument is what places a model-driven stage - the binary's
      // separation and phase come from the waveform, not from the declaration
      // - so a rebuilt stage needs one repaint to be put where it belongs.
      // Without it the two components sit on top of each other at the origin
      // until the reader happens to touch a control.
      paintTool({ quiet: true });
    }
  }
  // A live instrument whose subject is the scene has to notice the reader
  // choosing a different body. It is repainted on a control change and on a
  // stage rebuild, and neither of those happens when somebody clicks a star -
  // so the H-R diagram sat where the sliders had left it while the reader
  // clicked star after star in front of it, and the comparison card marked
  // nothing. Guarded on the selection actually changing rather than repainted
  // every tick: a widget that redraws four times a second for no reason is
  // the other way to get this wrong.
  const chosen = state.selectedObject?.object?.id ?? null;
  if (chosen !== lastProbeSelection) {
    lastProbeSelection = chosen;
    if (step?.tool && getWidget(step.tool.id)?.live) paintTool({ quiet: true });
  }
  renderObjectList();
  // A fit a stage asked for, taken as soon as there is something to measure.
  takeFit();

  // A step can turn on the renderer's own "Explain this view" labels, which
  // name the dark region, the disk and the jets on the black hole itself. The
  // lesson uses the existing overlay rather than drawing its own: the labels
  // have to point at what the renderer actually drew, and a second set drawn
  // by the panel would drift from it the moment either changed.
  if (els.probe && active) {
    SETTINGS.bh_explain_view = Boolean(step?.explainView);
  }

  // A step can ask for the balance point to be drawn on the main scene. The
  // panel supplies only *which* bodies; js/render.js recomputes the point from
  // them every frame, so what is drawn is where the pair actually is.
  if (els.probe) {
    const wantBary = Boolean(step?.showBarycenter);
    state.barycenterOverlay.active = wantBary;
    if (wantBary) {
      state.barycenterOverlay.ids = (boundRoles() || [])
        .map(r => roleBody(r)?.id)
        .filter(id => Number.isFinite(id));
    }
  }

  // A step can ask for the equal-area wedges to follow whatever is selected,
  // so that clicking from planet to planet redraws them for each orbit.
  if (step?.showAreaSweep) {
    const sel = state.selectedObject?.object || null;
    if (sel && sel.id !== lastSweepId) {
      lastSweepId = sel.id;
      showAreaSweepFor(sel);
    }
  }

  if (!step?.probe || !els.probe) {
    lastProbeHtml = '';
    return;
  }
  let rows;
  try {
    rows = step.probe(probeContext());
  } catch (err) {
    console.warn('Probe failed:', err);
    rows = [{ label: t('inv.probe.unavailable'), value: '-' }];
  }
  const html = rows
    .map(
      r =>
        `<div class="inv-probe-row${r.emphasis ? ' is-emphasis' : ''}">
           <span>${escape(lessonText(r.label))}</span><span>${escape(lessonText(r.value))}</span></div>`
    )
    .join('');
  // Only touch the DOM when something changed: this runs several times a second
  // and rewriting it every tick makes the text unselectable, which matters when
  // the whole point is copying numbers out of it.
  if (html !== lastProbeHtml) {
    els.probe.innerHTML = html;
    lastProbeHtml = html;
  }
}

/**
 * Copy the selected object's measurements into the next empty row.
 *
 * Reading four numbers off a panel and retyping them is where transcription
 * errors come from, and they are indistinguishable in the report from a student
 * who misunderstood the physics. The click still requires them to have chosen
 * the object, which is the part that is actually being assessed.
 */
function importSelection() {
  const step = currentStep();
  if (!step?.importFromSelection) return;
  const id = stepId(stepIndex);
  const ctx = probeContext();
  let values;
  try {
    values = step.importFromSelection(ctx);
  } catch (err) {
    console.warn('Import failed:', err);
    values = null;
  }
  const hint = els.body.querySelector('[data-import-hint]');
  if (!values) {
    if (hint) hint.textContent = t('inv.import.needObject');
    return;
  }

  const groups = step.importGroups || [];

  // Refuse a row that is already recorded. Two clicks between one transit and
  // the next would otherwise stamp the same event twice and hand back a period
  // of zero, and the same click on the same planet would duplicate a row in a
  // measurement table.
  const already = groups.some(g =>
    g.every(
      (fid, i) =>
        String(responses[`${id}:${fid}`] ?? '').trim() === String(values[i])
    )
  );
  if (already) {
    if (hint) hint.textContent = t('inv.import.duplicate');
    return;
  }

  // Find the first row whose fields are all still empty.
  const target = groups.find(g =>
    g.every(fid => String(responses[`${id}:${fid}`] ?? '').trim() === '')
  );
  if (!target) {
    if (hint) hint.textContent = t('inv.import.full');
    return;
  }

  // The lesson writes these the JavaScript way, so they are English.
  target.forEach((fid, i) => {
    if (values[i] !== undefined)
      recordAnswer(responses, `${id}:${fid}`, String(values[i]), 'en');
  });
  save();
  renderStep();
  const h = els.body.querySelector('[data-import-hint]');
  if (h) h.textContent = t('inv.import.added', { value: values[0] });
}

// --- Navigation ---------------------------------------------------------------

/**
 * The scenario a step runs against.
 *
 * Not every step carries its own setup: a lesson sets up a system once and
 * then asks several things about it. Walking backwards to the most recent one
 * is what makes resuming work: a student who closes the tab on step 6 and comes
 * back would otherwise return to whatever scenario happened to be loaded,
 * reading questions about a system that is no longer on screen.
 *
 * @param {number} index - Step index
 * @returns {Object|null} The setup in force at that step
 */
function setupInForceAt(index) {
  for (let i = index; i >= 0; i--) {
    if (active.steps[i]?.setup) return active.steps[i].setup;
  }
  return null;
}

/**
 * Move to a step.
 * @param {number} index - Step to show
 * @param {Object} [opts]
 * @param {boolean} [opts.rebuild] - Reload the scenario in force at that step
 */
/**
 * Release any sound a lesson started: a waveform belongs to the step that
 * started it, and one still playing after the step is gone sounds like an
 * answer. Sent as an event, because js/gwAudio.js pulls in the whole waveform
 * model; the scope is the prefix js/gwWidgets.js owns, so it cannot silence
 * sound started outside a lesson.
 *
 * @returns {void}
 */
function releaseLessonAudio() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('gravitasStopSignalAudio', {
      detail: { scope: 'gw-lab:' },
    })
  );
}

function goToStep(index, { rebuild = false } = {}) {
  if (!active) return;
  stepIndex = Math.max(0, Math.min(active.steps.length - 1, index));
  const sid = active.steps[stepIndex]?.sid;
  if (sid) visited.add(sid);

  // Reload when the scenario the step belongs to is not the one on screen, and
  // only then, so work a student has done: objects placed, mass changed,
  // survives moving between questions about the same system.
  //
  // Comparing the setup in force rather than testing for a setup on this step
  // is what makes going backwards correct. The transit lesson swaps in a
  // blended binary near the end; stepping back to an earlier measurement used
  // to leave that binary loaded, so a student re-doing the measurement would
  // quietly be measuring the wrong system.
  const setup = setupInForceAt(stepIndex);
  if (rebuild || (setup && setup !== appliedSetup)) applySetup(setup);
  else applyLocks();

  // Before the new step draws anything, so a reader never hears the last
  // step's signal over the new step's instructions.
  releaseLessonAudio();
  bindStepRoles();

  // A lesson that leaves the inspector reachable, as the black hole one does,
  // can have its object card open when the student moves on. The card is a
  // 600px panel docked in exactly the place an instrument goes, so a step that
  // carries one would open with its picture completely hidden behind a card
  // about the previous step. Steps with nothing docked keep the card.
  const opened =
    active.lock?.inspector === false ||
    active.steps.some(x => x.allowInspector);
  if (opened && (currentStep()?.tool || currentStep()?.plot)) {
    hideObjectInspector();
  }

  save();
  renderStep();
  els.body.scrollTop = 0;
  // On a narrow screen it is the whole sheet that scrolls, not the body, and
  // Next sits at the bottom of it: without this the next step would open
  // scrolled to wherever the reader had to go to press it.
  els.panel.scrollTop = 0;
}

function renderDepth() {
  const o = active.depths;
  if (!els.depth) return;
  els.depth.hidden = !o;
  const i = o ? o.indexOf(depth) : 0;
  els.depthState.textContent = depthName;
  els.deeper.hidden = !o || Boolean(assignment) || i >= o.length - 1;
  els.shallower.hidden = !o || Boolean(assignment) || i < 1;
}

async function changeDepth(by) {
  if (!active || assignment) return;
  const r = await (
    await import('./investigations/depth.js')
  ).change({ active, depth, deepest, stepIndex, by, locale: getLocale() });
  if (!r || r.lesson.id !== active?.id) return;
  ({ depth, deepest, depthName } = r);
  depthChoice = depth;
  active = r.lesson;
  announce(r.said);
  goToStep(r.at);
}

/**
 * Whether a step is for this student. A remediation step (`when`, from an
 * investigation pack: js/platform/investigation.js) is shown only when the
 * graded step it names has an answer that is wrong - or right - now. One not
 * yet answered, or answered the other way, is passed over by Next and
 * Previous; every other step always applies. A held prediction counts as not
 * yet answered until its reveal step is reached, as renderStep() holds its
 * verdict: the compiler refuses remediation before the reveal, and a lesson
 * compiled before it did must not give the answer away by skipping one.
 */
function stepApplies(index) {
  if (!inDepth(active.steps[index], depth)) return false;
  const w = active.steps[index]?.when;
  if (!w) return true;
  const target = active.steps.find(x => x.sid === w.sid);
  const key = stepKey(active.id, w.sid);
  const value = responses[key];
  if (!target || value === undefined || value === '') return false;
  if (target.reveal && !visited.has(target.reveal)) return false;
  const right = checkAnswer(target, value, {
    locale: localeOfAnswer(responses, key, getLocale()),
  });
  if (right === null) return false;
  return w.is === 'correct' ? right : !right;
}

/** The nearest step that applies, one way from `from`; the ends always do. */
function applyingFrom(from, dir) {
  let i = from + dir;
  while (i > 0 && i < active.steps.length - 1 && !stepApplies(i)) i += dir;
  return i;
}

function next() {
  if (stepIndex === active.steps.length - 1) {
    openFinish();
    return;
  }
  goToStep(applyingFrom(stepIndex, 1));
}

// --- Opening and closing ------------------------------------------------------

// Bumped by every open and every close. A lesson now arrives over the network,
// and a student who changes their mind while it is on the way - closes the
// browser, or picks a different card - must not have the abandoned one open on
// top of them when it lands.
let openGeneration = 0;

function peekDepth(id) {
  try {
    const p =
      sessionProgress.get(storageKey(id)) ?? JSON.parse(get(storageKey(id)));
    return { ...p, level: get('gravitas_course_level') };
  } catch {
    return {};
  }
}

/**
 * Start or resume an investigation.
 * @param {string} id - Investigation id
 * @returns {Promise<void>} Resolves once the lesson is open, or abandoned
 */
export async function openInvestigation(id, opts = {}) {
  const generation = ++openGeneration;
  // The one await in the panel's life. Everything below it runs against a
  // lesson that is fully in hand, so no other code path had to learn that a
  // lesson might not be there yet.
  let inv = await loadInvestigation(id);
  if (!inv || generation !== openGeneration) return;
  // A question whose expected value is a formula over the student's own
  // measurements (js/formula/grade.js) is bound to read them, so every grader
  // below sees the number that student is owed; the module loads only for a
  // lesson that has one.
  if (inv.steps.some(s => s.formula)) {
    const { bindFormulas, useNumberReader } =
      await import('./formula/grade.js');
    useNumberReader(parseNumber);
    if (generation !== openGeneration) return;
    inv = bindFormulas(inv, (sid, field) => {
      const key = `${stepKey(inv.id, sid)}:${field}`;
      return parseFieldNumber(
        responses[key],
        localeOfAnswer(responses, key, getLocale())
      );
    });
  }
  depth = 'core';
  depthChoice = null;
  deepest = 'core';
  depthName = '';
  const mem = inv.depths && !authoring && peekDepth(id);
  if (mem && opts.depth) mem.depth = opts.depth;
  if (
    opts.assignment?.d ||
    mem?.depth ||
    mem?.deepest ||
    /^[ma]/.test(mem?.level)
  ) {
    const m = await (
      await import('./investigations/depth.js')
    ).openDepth(inv, mem, opts.assignment, getLocale());
    if (generation !== openGeneration) return;
    ({ inv, depth, depthChoice, deepest, depthName } = m);
  }
  // Every step key is written into the panel's attributes and selectors. The
  // pack validator and the lesson checker refuse a sid that could end an
  // attribute; this refuses a lesson that reached the panel without passing
  // either - a Composer preview staged before they did, for one - rather than
  // rendering it.
  const unsafe = inv.steps.find(s => !isValidSid(s.sid));
  if (unsafe) {
    throw new Error(
      `Investigation "${id}" has a step id that is not a safe key: ${JSON.stringify(unsafe.sid)}`
    );
  }

  // An assignment is the same lesson with most of its steps taken out. It is
  // built here rather than being a second kind of thing the panel has to know
  // about: everything below works on `active`, and `active.id` stays the
  // lesson's, so a response key means the same question whether it was
  // answered in the assignment or in the whole lesson.
  assignment = opts.assignment ?? null;
  assignmentBinding = null;
  if (assignment) {
    assignmentBinding = stepBindings(assignment, inv, stepFingerprint);
    if (!assignmentBinding.usable) {
      assignment = null;
      assignmentBinding = null;
      return { ok: false, reason: 'noStepsLeft' };
    }
    active = { ...inv, steps: assignmentBinding.steps };
    assignmentKey = keyForAssignment(assignment);
    fullSteps = inv.steps.filter(s => inDepth(s, 'core')).length;
  } else {
    fullSteps = 0;
    active = inv;
  }
  // In an authoring preview the saved progress is not read at all: an author is
  // shown a clean lesson rather than somebody's half-finished one, and reading
  // it would also mean the position they asked for could be silently overridden.
  const saved = authoring ? null : load(id, active);
  responses = saved?.responses || {};
  if (assignment && saved?.responses) {
    // A step rewritten under its own id since this assignment was made is a
    // different question, and a stored answer to the old one is not an answer
    // to it. Held back rather than shown, which is the whole point of
    // carrying fingerprints in the payload.
    const filtered = filterResponses(
      assignmentBinding,
      saved.responses,
      sid => `${inv.id}:${sid}`
    );
    responses = filtered.kept;
  }
  attempts = saved?.attempts || {};
  visited = saved?.visited || new Set();
  startedAt = saved?.startedAt || new Date().toISOString();
  spent = saved?.spent || 0;
  lastTick = Date.now();
  // Resolved against `active`, which for an assignment is the SUBSET: against
  // the whole lesson, a student resuming an eight-step assignment was sent to
  // the position that sid holds in the lesson, past its end. A sid not in the
  // subset means the assignment was recut: start at the beginning.
  stepIndex = saved?.stepSid
    ? Math.max(0, indexOfSid(active, saved.stepSid))
    : 0;
  while (stepIndex > 0 && !inDepth(active.steps[stepIndex], depth)) stepIndex--;
  progressNotes = saved?.notes || [];
  if (authoring?.step) {
    stepIndex = Math.min(Math.max(authoring.step - 1, 0), inv.steps.length - 1);
  }

  lockedSettings = { interactive_add: SETTINGS.interactive_add };
  els.panel.hidden = false;
  els.panel.classList.add('is-open');
  wireMore(els.more, 'lesson', { ...MORE, depth, declared: assignment?.mo });
  els.title.textContent = assignment?.t || inv.title;
  // The lesson it was cut from stays visible: a student should be able to see
  // that this is eight steps of Tides rather than a thing called Week 3.
  els.subtitle.textContent = assignment
    ? t('assign.subtitle', {
        lesson: inv.title,
        n: active.steps.length,
        total: inv.steps.length,
      })
    : inv.subtitle;
  document.body.classList.add('investigation-open');
  closeBrowser({ restoreFocus: false });
  // Focus follows the choice into the panel. Without this, closing the browser
  // destroys the focused card and drops a keyboard user at the top of the
  // document, with the lesson they just started somewhere below them.
  els.title.focus?.();
  // A scenario introduction card left over from before the lesson opened lands
  // squarely on top of the instrument panel. New ones are suppressed for the
  // duration; this dismisses the one that may already be up.
  const infoBox = document.getElementById('scenarioInfoBox');
  if (infoBox) infoBox.classList.remove('showUI', 'show');
  // What the lesson is about to borrow, saved once. Entering is idempotent, so
  // the twenty step changes that follow cannot overwrite these with values the
  // lesson itself set - which is what makes "close the lesson and you are back
  // where you were" true rather than nearly true.
  enterLessonScope({
    selection: state.selectedObject
      ? { id: state.selectedObject.object?.id ?? null, generation: null }
      : null,
    paused: state.paused,
    zoom: state.zoom,
    pan: state.pan ? { ...state.pan } : null,
    // The whole world, in the format share links and the experiment bench
    // already use. A lesson that stages its own scene tears the sandbox down
    // to build it, and until now that was simply the end of whatever the
    // reader had made: they came back to an empty sky or to a scenario they
    // never chose. `forExperiment` carries the clock and the observing context
    // as well, which is what makes the restored world the same world rather
    // than a fresh copy of its scenario.
    //
    // Captured here, inside enterLessonScope, so it is captured exactly once:
    // the twenty step changes that follow cannot overwrite it with a world the
    // lesson itself built.
    sandbox: (() => {
      try {
        return captureShareState({
          kind: 'full',
          includeCamera: true,
          forExperiment: true,
        });
      } catch (err) {
        console.warn(
          'Could not save the sandbox before the investigation:',
          err
        );
        return null;
      }
    })(),
    // What the sandbox was, so a restore can tell whether it is putting back
    // the world it saved or trampling one the reader has since chosen.
    sandboxGeneration: getWorldGeneration(),
  });
  // rebuild: the simulation on screen belongs to whatever the student was doing
  // before, not to the step they are resuming at.
  goToStep(stepIndex, { rebuild: true });
  startProbeLoop();
  announce(t('inv.announce.started', { title: inv.title }));
}

/**
 * Put the reader's own world back, if it is still theirs to put back: only
 * when the world on screen is still the one the lesson built (a stage was up,
 * or the world generation has not moved past the lesson's rebuilds). A reader
 * who loaded a scenario or followed a link has taken it somewhere deliberate.
 *
 * @param {object} saved - The pairs handed back by leaveLessonScope()
 * @returns {boolean} Whether the sandbox was put back
 */
function restoreSandbox(saved) {
  const payload = saved?.sandbox;
  if (!payload) return false;
  // A world with nothing in it is not worth restoring over, and restoring an
  // empty capture would blank a scene the reader may want. Both directions of
  // that are covered by refusing to act on an empty payload. The bodies ride
  // under `b` - see packBody() and the payload shape in js/shareState.js.
  if (!Array.isArray(payload.b) || payload.b.length === 0) return false;
  try {
    applyShareState(JSON.parse(JSON.stringify(payload)));
    return true;
  } catch (err) {
    console.warn('Could not restore the sandbox after the investigation:', err);
    return false;
  }
}

/**
 * Put the reader's selection back on the body it was on, by id, only after a
 * successful restore (the restored world carries the ids it was saved with).
 * Silent when the body is not there: selecting something arbitrary instead
 * would be worse than nothing.
 *
 * @param {?object} selection - {id} as saved on entry
 * @returns {boolean} Whether a body was reselected
 */
function restoreSelection(selection) {
  const id = selection?.id;
  if (!Number.isFinite(id)) return false;
  const body = allBodies().find(b => b?.id === id);
  if (!body) return false;
  selectBody(body);
  return true;
}

/**
 * Whether the scene on the canvas is still the lesson's to hand back.
 *
 * True while the lesson owns it: a stage is up, or the last thing to build the
 * world was one of the lesson's own step setups. False once the reader has
 * loaded something themselves, which is the case a delayed restore must not
 * overwrite.
 *
 * @returns {boolean} Whether restoring is the right thing to do
 */
function sandboxIsStillOurs() {
  // A stage is up: the world on screen is one the lesson built.
  if (stagedStars().length) return true;
  // Or the last thing to rebuild it was one of the lesson's own step setups.
  return appliedSetup !== null;
}

/** Close the investigation panel, keeping progress. */
export function closeInvestigation() {
  // Cancels a lesson still on its way, as well as closing one already here.
  openGeneration++;
  if (!els.panel) return;
  els.panel.hidden = true;
  els.panel.classList.remove('is-open');
  document.body.classList.remove('investigation-open');
  stopProbeLoop();
  releaseLocks();
  if (els.plotPanel) els.plotPanel.hidden = true;
  if (els.ellipsePanel) els.ellipsePanel.hidden = true;
  stopToolLoop();
  releaseLessonAudio();
  // Hand back what the lesson borrowed, and - the part that matters most -
  // give every model-owned body back to the integrator. A body still flagged
  // when the lesson closes is a body that never moves again.
  //
  // What comes back, and what deliberately does not.
  //
  // The sandbox does: a lesson that stages its own scene destroys whatever the
  // reader had built, and handing back an empty sky was the application
  // throwing their work away. It is restored from the same share payload the
  // experiment bench uses to return from an A/B run, so the bodies, the
  // settings, the clock and the observing context all come back together
  // rather than in pieces.
  //
  // The camera does not, unless it came back with the sandbox. A reader who
  // panned and zoomed during a lesson meant to.
  const saved = Object.fromEntries(leaveLessonScope());
  if ('paused' in saved) state.paused = Boolean(saved.paused);
  // Asked before the stage comes down, because taking it down destroys the
  // evidence: once `staged` is empty there is no way to tell a lesson that
  // owned the world from a reader who has loaded something of their own.
  const ours = sandboxIsStillOurs();
  // Then the stage goes, or its bodies are still on the canvas when the
  // restored world arrives and the reader gets both.
  clearStage();
  if (ours && restoreSandbox(saved)) restoreSelection(saved.selection);
  appliedSetup = null;
  if (els.objectsWrap) els.objectsWrap.hidden = true;
  if (els.stageTools) els.stageTools.hidden = true;
  lastObjectsKey = '';
  if (els.toolPanel) els.toolPanel.hidden = true;
  // A watch this lesson's activity armed goes with the lesson. Closing the
  // panel does not re-render a step, so this cannot be left to
  // syncEventWatch() - a watch armed on the last step visited would otherwise
  // outlive the lesson and pause the simulation into a closed panel.
  syncEventWatch(null);
  document.body.classList.remove('investigation-lightcurve');
  document.body.classList.remove('investigation-aux');
  if (lightCurveOpenedByLesson) {
    setLightCurveEnabled(false);
    lightCurveOpenedByLesson = false;
  }
  plotCanvas = null;
  active = null;
}

function startProbeLoop() {
  stopProbeLoop();
  // Four times a second: fast enough that a changing speed reads as live, slow
  // enough that a student can select the text and copy it.
  probeTimer = setInterval(renderProbe, 250);
}

function stopProbeLoop() {
  if (probeTimer) clearInterval(probeTimer);
  probeTimer = null;
}

/**
 * js/dialog.js, fetched the first time the browser or the finish dialog opens.
 * Dynamic rather than static because this module is on every lesson's route
 * and a lesson that is only being worked through opens neither.
 */
let dialogs = null;
const loadDialogs = async () => (dialogs ??= await import('./dialog.js'));

// The chooser lives in js/investigations/browser.js and takes these four
// instead of importing this module back.
bindChooser({
  progressFor,
  openInvestigation,
  loadDialogs,
  dialogs: () => dialogs,
});

// --- Finishing and the report -------------------------------------------------

function openFinish() {
  if (!els.finish) return;
  const graded = gradedSteps({ steps: shown() });
  const answered = graded.filter(s => {
    const i = active.steps.indexOf(s);
    const id = stepId(i);
    if (s.type === 'measure') {
      return s.fields?.some(f =>
        String(responses[`${id}:${f.id}`] ?? '').trim()
      );
    }
    return String(responses[id] ?? '').trim() !== '';
  }).length;

  showToken('');
  // Not in an authoring preview, as the panel's backup controls are not.
  els.finishProgress.hidden = Boolean(authoring);
  els.finishSummary.innerHTML = `
    <p>${t('inv.finish.summary', {
      visited: shown().filter(s => visited.has(s.sid)).length,
      steps: shown().length,
      answered,
      graded: graded.length,
    })}</p>
    <p class="inv-finish-note">${escape(t('inv.finish.note'))}</p>`;
  els.nameInput.value = getStudentName();
  import('./investigations/next.js').then(m =>
    m.whatNext(document.getElementById('investigationNextList'), {
      id: active.id,
      deeper: active.depths && !els.deeper.hidden && els.deeper.textContent,
      onDeeper: () => {
        closeFinish();
        changeDepth(1);
      },
    })
  );
  // Modal: the lesson behind it inert, Escape and the backdrop closing it,
  // and focus back on Next, where the reader asked to finish.
  const trigger = document.activeElement;
  loadDialogs()
    .then(({ openDialog }) =>
      openDialog(els.finishContent, {
        backdrop: els.finish,
        isolate: true,
        trigger,
        initialFocus: els.nameInput,
      })
    )
    .catch(() => {
      /* offline and never fetched: Next on the last step asks again */
    });
}

function closeFinish() {
  dialogs?.closeDialog(els.finishContent);
}

/** A file the browser saves. */
function saveFile(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Put a token in the finish dialog's field, or clear it. */
function showToken(token) {
  els.token.value = token || '';
  els.tokenBody.hidden = !token;
}

/**
 * What the finish flow's module needs of this one. Built on each call, so the
 * variables this module reassigns are read when the module needs them.
 * @returns {import('./investigations/finish.js').FinishHost} The host
 */
const finishHost = () => ({
  state: () => ({
    active,
    stepIndex,
    responses,
    attempts,
    visited,
    startedAt,
    assignment,
    assignmentBinding,
    depth,
  }),
  elements: () => els,
  payloadFromSetup,
  plotData: plotAnywhere,
  stepId,
  reportSlug,
  setStudentName,
  getStudentName,
  saveFile,
  restoreInto: restored => {
    progressNotes = [];
    responses = restored.responses;
    attempts = restored.attempts;
    visited = restored.visited;
    startedAt = restored.startedAt || new Date().toISOString();
    save();
    goToStep(restored.stepIndex, { rebuild: true });
  },
  showToken,
  lib: {
    t,
    getLocale,
    toast,
    announce,
    decodeEntities,
    checkAnswer,
    localeOfAnswer,
    helpStages,
    helpTaken,
    encodePayload,
    shareUrl,
    parseDocument,
  },
});

/**
 * The finish flow runs from a module fetched on first use. If it cannot be
 * fetched, say what the button was for rather than doing nothing.
 */
const finishAction =
  (name, failedKey = 'inv.report.failed') =>
  () =>
    import('./investigations/finish.js')
      .then(m => m[name](finishHost()))
      .catch(() => toast(t(failedKey)));

/** The file name a student's report and token are saved under. */
const reportSlug = name =>
  `${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}-${active.id}`;

/**
 * The plot lives on whichever step owns it, so find it rather than relying on
 * the student being parked there when they press Download.
 */
function plotAnywhere() {
  let plot = null;
  const here = stepIndex;
  for (let i = 0; i < active.steps.length; i++) {
    if (!active.steps[i].plot) continue;
    stepIndex = i;
    plot = currentPlotData();
    if (plot) break;
  }
  stepIndex = here;
  return plot;
}

function resetProgress() {
  if (!active) return;
  responses = {};
  attempts = {};
  visited = new Set();
  startedAt = new Date().toISOString();
  try {
    if (!authoring) drop(storageKey(active.id));
  } catch {
    /* ignore */
  }
  closeFinish();
  goToStep(0);
  toast(t('inv.progress.cleared'));
}

// --- Wiring -------------------------------------------------------------------

/**
 * The plot as it currently stands, for the lab report.
 * @returns {Object|null} {points, xLabel, yLabel, slope} or null
 */
export function currentPlotData() {
  const step = currentStep();
  if (!step?.plot) return null;
  const vals = fieldValues(step, stepId(stepIndex));
  let pts;
  try {
    pts = (step.plot.points(vals) || []).filter(
      p => Number.isFinite(p.x) && Number.isFinite(p.y)
    );
  } catch {
    return null;
  }
  if (!pts.length) return null;
  const t = step.plot.transform;
  const shown = t ? pts.map(t.map) : pts;
  return {
    points: shown,
    xLabel: t ? t.xLabel : step.plot.xLabel,
    yLabel: t ? t.yLabel : step.plot.yLabel,
    slope: fitSlope(shown),
  };
}

/** Wire up the investigations panel. Safe to call once, from init. */
/** Lesson id named in the address bar, if there is one. */
function investigationFromHash() {
  const m = /^#investigation=([\w-]+)(?:\/(\w+))?$/.exec(location.hash);
  return m ? [decodeURIComponent(m[1]), m[2]] : [];
}

/**
 * Open the lesson the URL names.
 *
 * Called at start-up and on every hash change, so a link handed out in an
 * assignment lands the student on the right lesson rather than on the browser.
 */
function openInvestigationFromHash() {
  const [id, depth] = investigationFromHash();
  if (!id) return;
  if (!hasInvestigation(id)) {
    toast(t('inv.link.unknown'));
    return;
  }
  if (active?.id === id) return;
  openInvestigation(id, { depth }).catch(err =>
    loadFailed(() => openInvestigation(id, { depth }).catch(() => {}), err)
  );
}

// A language change swaps the manifest the cards are drawn from, and rewrites
// every word of the panel's own chrome. Both are repainted rather than left to
// the next open: the browser may be on screen at the time.
onLocaleChange(() => {
  if (els?.browser && !els.browser.classList.contains('hidden'))
    renderBrowser();
  if (active && els?.panel && !els.panel.hidden) {
    els.title.textContent = active.title;
    els.subtitle.textContent = active.subtitle;
    renderStep();
  }
});

/**
 * Wire the lesson engine to its markup, once the loader has mounted it.
 *
 * @param {{signal?: AbortSignal}} [options] - Aborted when the markup is
 *   unmounted (js/investigationsLoader.js); removes every listener this adds
 *   outside it - the rail's Lessons button and the window's
 */
export function initInvestigations({ signal } = {}) {
  const opts = signal ? { signal } : undefined;
  // Where a notebook capture is made: the lesson and step the student is on.
  setEvidenceContext(() =>
    active
      ? {
          lesson: active.id,
          step: active.steps[stepIndex]?.sid ?? null,
          ...(assignment ? { assignment: assignment.i } : {}),
        }
      : null
  );
  els = {
    browser: document.getElementById('investigationBrowser'),
    list: document.getElementById('investigationList'),
    browserScroll: document.getElementById('investigationBrowserScroll'),
    browserContent: document.getElementById('investigationBrowserContent'),
    count: document.getElementById('investigationBrowserCount'),
    level: document.getElementById('investigationBrowserLevel'),
    search: document.getElementById('investigationSearch'),
    filterSubject: document.getElementById('investigationFilterSubject'),
    filterLength: document.getElementById('investigationFilterLength'),
    filterCalculation: document.getElementById(
      'investigationFilterCalculation'
    ),
    filterProgress: document.getElementById('investigationFilterProgress'),
    filterClear: document.getElementById('investigationFilterClear'),
    sequences: document.getElementById('investigationSequences'),
    sequenceList: document.getElementById('investigationSequenceList'),
    allHeading: document.getElementById('investigationAllHeading'),
    empty: document.getElementById('investigationEmpty'),
    emptyText: document.getElementById('investigationEmptyText'),
    emptyAction: document.getElementById('investigationEmptyAction'),
    browserClose: document.getElementById('investigationBrowserClose'),
    browserChip: document.getElementById('investigationBrowserChip'),
    panel: document.getElementById('investigationPanel'),
    title: document.getElementById('investigationTitle'),
    subtitle: document.getElementById('investigationSubtitle'),
    body: document.getElementById('investigationBody'),
    probe: document.getElementById('investigationProbe'),
    probeWrap: document.getElementById('investigationProbeWrap'),
    objects: document.getElementById('investigationObjects'),
    objectsWrap: document.getElementById('investigationObjectsWrap'),
    stageTools: document.getElementById('investigationStageTools'),
    fitBtn: document.getElementById('investigationFit'),
    followBtn: document.getElementById('investigationFollow'),
    scaleBtn: document.getElementById('investigationScale'),
    depth: document.getElementById('investigationDepth'),
    depthState: document.getElementById('investigationDepthState'),
    deeper: document.getElementById('investigationDeeper'),
    shallower: document.getElementById('investigationShallower'),
    prev: document.getElementById('investigationPrev'),
    next: document.getElementById('investigationNext'),
    close: document.getElementById('investigationClose'),
    progressBar: document.getElementById('investigationProgressBar'),
    progressText: document.getElementById('investigationProgressText'),
    where: document.getElementById('investigationWhere'),
    help: document.getElementById('investigationHelp'),
    helpPanel: document.getElementById('investigationHelpPanel'),
    saveStatus: document.getElementById('investigationSaveStatus'),
    progressNotice: document.getElementById('investigationProgressNotice'),
    backupDownload: document.getElementById('investigationBackupDownload'),
    backupRestore: document.getElementById('investigationBackupRestore'),
    backupFile: document.getElementById('investigationBackupFile'),
    finish: document.getElementById('investigationFinish'),
    finishContent: document.getElementById('investigationFinishContent'),
    finishSummary: document.getElementById('investigationFinishSummary'),
    nameInput: document.getElementById('investigationName'),
    nameError: document.getElementById('investigationNameError'),
    downloadBtn: document.getElementById('investigationDownload'),
    finishProgress: document.getElementById('investigationFinishProgress'),
    token: document.getElementById('investigationToken'),
    tokenBody: document.getElementById('investigationTokenBody'),
    finishClose: document.getElementById('investigationFinishClose'),
    finishBack: document.getElementById('investigationFinishBack'),
    resetBtn: document.getElementById('investigationReset'),
    resetScenario: document.getElementById('investigationResetScenario'),
    plotPanel: document.getElementById('investigationPlot'),
    plotCanvas: document.getElementById('investigationPlotCanvas'),
    plotTitle: document.getElementById('investigationPlotTitle'),
    plotNote: document.getElementById('investigationPlotNote'),
    plotTable: document.getElementById('investigationPlotTable'),
    plotTableWrap: document.getElementById('investigationPlotTableWrap'),
    plotToggle: document.getElementById('investigationPlotToggle'),
    plotLog: document.getElementById('investigationPlotLog'),
    toolPanel: document.getElementById('investigationTool'),
    toolTitle: document.getElementById('investigationToolTitle'),
    toolExplain: document.getElementById('investigationToolExplain'),
    plotExplain: document.getElementById('investigationPlotExplain'),
    ellipseExplain: document.getElementById('investigationEllipseExplain'),
    toolCanvas: document.getElementById('investigationToolCanvas'),
    toolNote: document.getElementById('investigationToolNote'),
    toolReadout: document.getElementById('investigationToolReadout'),
    toolControls: document.getElementById('investigationToolControls'),
    toolMore: document.getElementById('investigationToolMore'),
    more: document.getElementById('investigationMore'),
    toolActions: document.getElementById('investigationToolActions'),
    toolPresets: document.getElementById('investigationToolPresets'),
    toolPresetNote: document.getElementById('investigationToolPresetNote'),
    ellipsePanel: document.getElementById('investigationEllipse'),
    ellipseCanvas: document.getElementById('investigationEllipseCanvas'),
    ecc: document.getElementById('investigationEcc'),
    eccOut: document.getElementById('investigationEccOut'),
    presets: document.getElementById('investigationPresets'),
    presetNote: document.getElementById('investigationPresetNote'),
  };
  setChooserElements(els);
  if (!els.panel || !els.browser) return;

  // The objects list folds away, and stays folded: on the next step, and on
  // the next visit.
  const objectsDisclosure = document.getElementById(
    'investigationObjectsDisclosure'
  );
  if (objectsDisclosure) {
    // On a phone it starts folded until the reader says otherwise: the step
    // comes first on a sheet that small. Not remembered, being no choice.
    let quiet = false;
    try {
      const kept = get(OBJECTS_OPEN_KEY);
      quiet = kept == null && window.innerWidth <= 767;
      if (kept === '0' || quiet) objectsDisclosure.open = false;
    } catch {
      /* storage unavailable: it opens, as it always did */
    }
    objectsDisclosure.addEventListener('toggle', () => {
      if (quiet) return void (quiet = false);
      try {
        put(
          OBJECTS_OPEN_KEY,
          objectsDisclosure.open ? '1' : '0',
          'preferences'
        );
      } catch {
        /* the list still folds; the choice just will not outlive the page */
      }
    });
  }

  document.getElementById('investigationsBtn')?.addEventListener(
    'click',
    () => {
      isBrowserOpen() ? closeBrowser() : openBrowser();
    },
    opts
  );
  wireBrowserFilters(opts);
  els.browserClose?.addEventListener('click', closeBrowser, opts);
  els.browserChip?.addEventListener('click', closeBrowser, opts);

  els.prev?.addEventListener('click', () =>
    goToStep(applyingFrom(stepIndex, -1))
  );
  els.next?.addEventListener('click', next);
  setInterval(() => active && renderWhere(shown()), 3e4);
  els.help?.addEventListener(
    'click',
    async () => {
      const on = els.help.getAttribute('aria-expanded') !== 'true';
      els.help.setAttribute('aria-expanded', on);
      els.helpPanel.hidden = !on;
      if (on)
        (await import('./investigations/guidance.js')).help(() => ({
          lesson: active,
          n: stepIndex,
          total: shown().length,
          depth,
          spent,
          link: async () => {
            const s = currentStep()?.setup;
            return s ? shareUrl(await encodePayload(payloadFromSetup(s))) : '';
          },
        }));
    },
    opts
  );
  els.deeper?.addEventListener('click', () => changeDepth(1), opts);
  els.shallower?.addEventListener('click', () => changeDepth(-1), opts);
  els.close?.addEventListener('click', closeInvestigation);
  wireExplainer(
    els.toolExplain,
    m => m.explainerKeyFor(currentStep()?.tool?.id),
    opts
  );
  wireExplainer(els.plotExplain, () => 'plot-measure', opts);
  wireExplainer(els.ellipseExplain, () => 'plot-ellipse', opts);
  // The stage's camera and scale. Both cameras act once, on the press: a view
  // that re-framed itself would take the scene back every time a reader looked
  // somewhere else, and the whole point of standing objects on the canvas is
  // that a reader can go and look at them.
  els.fitBtn?.addEventListener('click', () => {
    fitStage();
  });
  els.followBtn?.addEventListener('click', () => {
    if (!centerOnSelected()) toast(t('inv.stage.nothingSelected'));
  });
  els.scaleBtn?.addEventListener('click', () => {
    const next = stageScale() === SCALE.TRUE ? SCALE.DISPLAY : SCALE.TRUE;
    setStageScale(next);
    const on = next === SCALE.TRUE;
    els.scaleBtn.setAttribute('aria-pressed', String(on));
    // At true scale the smallest stars fall below what the canvas can draw.
    // That is the honest picture and it is why the list above exists, so the
    // interface says it rather than leaving a reader hunting for a speck.
    toast(t(on ? 'inv.stage.scale.true' : 'inv.stage.scale.display'));
  });

  els.resetBtn?.addEventListener('click', resetProgress);
  els.ecc?.addEventListener('input', () => {
    paintEllipse(els.ecc.value);
    els.presetNote.textContent = '';
  });

  els.plotLog?.addEventListener('click', () => {
    plotLog = !plotLog;
    els.plotLog.setAttribute('aria-pressed', String(plotLog));
    els.plotLog.classList.toggle('is-on', plotLog);
    drawPlot(currentStep(), stepId(stepIndex));
  });

  els.plotToggle?.addEventListener('click', () => {
    plotTransformed = !plotTransformed;
    els.plotToggle.setAttribute('aria-pressed', String(plotTransformed));
    els.plotToggle.classList.toggle('is-on', plotTransformed);
    drawPlot(currentStep(), stepId(stepIndex));
  });

  els.resetScenario?.addEventListener('click', () => {
    // Left running, a scenario drifts: bodies merge, get flung out, or simply
    // leave the view. Putting the step's system back is a far more common need
    // than restarting the lesson, so it gets its own control.
    applySetup(setupInForceAt(stepIndex));
    toast(t('inv.scenario.reset'));
  });

  els.finishClose?.addEventListener('click', closeFinish);
  els.finishBack?.addEventListener('click', closeFinish);
  const on = (id, fn) =>
    document.getElementById(id)?.addEventListener('click', fn);
  on('investigationDownload', finishAction('generateReport'));
  on('investigationDownloadHtml', finishAction('generateHtmlReport'));
  els.finishProgress?.addEventListener(
    'click',
    finishAction('downloadBackup', 'inv.backup.failed')
  );
  on('investigationTokenShow', finishAction('revealToken', 'inv.token.failed'));
  on('investigationTokenCopy', finishAction('copyToken', 'inv.token.failed'));
  on('investigationTokenSave', () =>
    saveFile(
      new Blob([`${els.token.value}\n`], { type: 'text/plain' }),
      `${reportSlug(els.nameInput.value.trim() || 'token')}-token.txt`
    )
  );

  // The widget and plot canvases are sized from their panel's width, which is a
  // percentage of the viewport, so a resized window leaves them stretched.
  let resizeTimer = null;
  window.addEventListener(
    'resize',
    () => {
      if (!active) return;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const step = currentStep();
        if (step?.tool) paintTool();
        if (step?.plot) drawPlot(step, stepId(stepIndex));
        if (step?.type === 'ellipse') {
          paintEllipse(
            responses[`${stepId(stepIndex)}:e`] ?? step.start ?? 0.5
          );
        }
      }, 150);
    },
    opts
  );

  // js/dialog.js takes an Escape pressed inside either dialog; this is one
  // pressed with focus on <body>.
  window.addEventListener(
    'gravitasEscape',
    () => {
      if (els.finish && !els.finish.classList.contains('hidden')) closeFinish();
      else if (isBrowserOpen()) closeBrowser();
    },
    opts
  );

  // A lesson can be opened by URL: gravitas-sim.online/#investigation=<id>.
  // That is what makes an investigation assignable, and what the instructor
  // resources link to. Shared simulation links use a different hash shape
  // (digits followed by z or r), so the two cannot be confused.
  els.backupDownload?.addEventListener('click', () => {
    finishAction('downloadBackup', 'inv.backup.failed')();
  });
  // The button opens the picker; the input does the work. A bare file input in
  // the footer would be a permanent piece of browser chrome in a teaching
  // panel, and it cannot be styled to match.
  els.backupRestore?.addEventListener('click', () => els.backupFile?.click());
  els.backupFile?.addEventListener('change', event => {
    const file = event.target.files?.[0];
    // Reset first, so choosing the same file twice fires again.
    event.target.value = '';
    if (file) {
      import('./investigations/finish.js')
        .then(m => m.restoreBackup(finishHost(), file))
        .catch(() => toast(t('inv.backup.failed')));
    }
  });

  openInvestigationFromHash();
  window.addEventListener('hashchange', openInvestigationFromHash, opts);

  // The assignment builder (?assign=<lesson>) and the authoring preview
  // (?author=<lesson>&step=<n>) are machinery for the person setting the work,
  // not for the people doing it. Each is imported only when the URL asks, so
  // neither it nor the rule engine behind the preview reaches a student's
  // download; the boot logic lives in the lazy module.
  const assignMatch = /[?&]assign=([A-Za-z0-9_-]+)/.exec(window.location.href);
  if (assignMatch) {
    import('./assignments/assignmentBuilder.js')
      .then(m => m.bootBuilder(assignMatch[1]))
      .catch(() => loadFailed(() => location.reload()));
  }

  if (/[?&#]author=/.test(window.location.href)) {
    import('./authoring/preview.js')
      .then(m =>
        m.bootPreview({
          open: openInvestigation,
          jump: goToStep,
          setAuthoring: value => (authoring = value),
        })
      )
      .catch(() => {
        /* the preview is a development aid; its absence is not a student's problem */
      });
  }

  // The plot reads its colors from the theme tokens, so it has to be redrawn
  // when the theme changes rather than keeping the old palette.
  window.addEventListener(
    'gravitasLightCurveToggled',
    () => {
      if (active) reflowForLightCurve();
    },
    opts
  );

  window.addEventListener(
    'gravitasThemeChanged',
    () => {
      if (!active) return;
      drawPlot(currentStep(), stepId(stepIndex));
      if (currentStep()?.tool) paintTool();
    },
    opts
  );

  // Arrow keys move through a lesson, but only when the student is not typing
  // into one of its own answer fields.
  window.addEventListener(
    'keydown',
    e => {
      if (!active) return;
      const tag = e.target?.tagName;
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        e.target?.isContentEditable
      ) {
        return;
      }
      if (e.key === 'ArrowRight' && e.shiftKey) {
        e.preventDefault();
        next();
      } else if (e.key === 'ArrowLeft' && e.shiftKey) {
        e.preventDefault();
        goToStep(applyingFrom(stepIndex, -1));
      }
    },
    opts
  );
}

/**
 * Undo initInvestigations(), for when the engine's markup leaves the page:
 * close the lesson and its dialogs, and forget every element. The listeners
 * outside the markup go with the mount's signal.
 */
export function teardownInvestigations() {
  if (active) closeInvestigation();
  if (els.finish && !els.finish.classList.contains('hidden')) closeFinish();
  if (isBrowserOpen()) closeBrowser();
  // Opened through js/dialog.js, which keeps two document listeners per
  // dialog; a mounted copy is a new element, so these are let go.
  dialogs?.releaseDialog(els.browserContent);
  dialogs?.releaseDialog(els.finishContent);
  els = {};
  setChooserElements(els);
}

/** What js/remix/open.js needs of the engine. */
export const packFacts = () => ({
  provideLessonLoaders,
  loadInvestigation,
  openInvestigation,
  ENTITIES,
  UNITS,
  scenarios: SCENARIO_IDS,
  scenarioId,
  lessons: MANIFEST.map(m => m.id),
});
