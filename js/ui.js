// UI and event handling functions

import {
  screen_to_world,
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
  updatePhysicsSettings,
  particlePool,
  findObjectAtPosition,
  clearAllEnergyHistory,
} from './physics.js';

import { worldToScreen, debugLog } from './utils.js';
import {
  setFrame,
  resetFrame,
  frameState,
  transferFrame,
} from './referenceFrame.js';
import {
  getPositionAngle,
  getInclination,
  setPositionAngle,
  setInclination,
} from './observerGeometry.js';
import { withExtras, readExtras } from './experiments/canonicalState.js';
// Both are already on the start-up path via js/main.js, so naming them here
// adds nothing to the initial download.
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
import { SPACE_OBJECT_NAMES } from './names.js';
import {
  getBlackHoleInfo,
  getStarInfo,
  getPlanetInfo,
  getGasGiantInfo,
  getAsteroidInfo,
  getNeutronStarInfo,
  getWhiteDwarfInfo,
} from './inspectorInfo.js';
import { SCENARIO_INFO } from './data/scenarioInfo.js';
import { SCENARIO_TAGS } from './data/scenarioTags.js';
import { applyPreset, scenarioId } from './scenarios.js';
import { buildWorld } from './world/build.js';
import { t, onLocaleChange } from './i18n/index.js';
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
} from './shareState.js';

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
import { generateStarfield } from './render.js';
import { initSoundPanel, stopSignalAudio } from './soundPanel.js';
import {
  showObjectInspector,
  hideObjectInspector,
  inspectorTypeFor,
  setInspectorSuppressed,
  setupOverlayMinimize,
  wireInspectorControls,
} from './inspectorWindow.js';
import {
  initPlacement,
  initObjectPicker,
  placeBody,
  keyboardPlacementActive,
  beginKeyboardPlacement,
  cancelKeyboardPlacement,
  commitKeyboardPlacement,
  constructBody,
  typeName,
  typeKeyOf,
  updateObjectTypeButton,
  syncPlacementAvailability,
  canvasPoint,
  placementArmed,
  updateOrbitHelper,
  objectPickerContains,
} from './placement.js';
import {
  initCaptureMeasure,
  updateSpeedDisplay,
  adjustSimSpeed,
  takeScreenshot,
  computeAreaSweep,
  isAreaSweepSuppressed,
  setAreaSweepWedges,
  getAreaSweepWedges,
  showAreaSweepFor,
  setAreaSweepSuppressed,
} from './captureMeasure.js';
import { mountFragment } from './i18n/deferredMessages.js';
import {
  getCourseLevel,
  initCourseLevel,
  setCourseLevel,
} from './settingsSchema.js';

initCourseLevel();

// -----------------------------------------------------------------------------
// The three panels this module binds at load, and the markup they bind to.
// Their markup was static in index.html; it lives here now, beside the code
// that binds it (INDEX_DECOMPOSITION.md), and goes in at the hosts index.html
// keeps for them before anything below reaches for an element - this module
// binds several of them at the top level. In a page without the hosts (a test
// that wrote its own markup) mountFragment declines, and nothing changes.
// -----------------------------------------------------------------------------

export const SOUND_PANEL_MARKUP = `<!--
The sound panel. Moved to <body> at start-up and positioned from the
speaker button, for the same reason the object picker is: the readout is
an overflow container and clips its absolutely positioned descendants.
-->
<div
id="soundPanel"
class="sound-panel"
role="dialog"
aria-modal="false"
aria-labelledby="soundPanelTitle"
hidden
>
<h2 id="soundPanelTitle" class="sound-panel-title"></h2>
<p id="soundPanelState" class="sound-panel-state" aria-live="polite"></p>
<button
id="soundPanelToggle"
type="button"
class="sound-panel-switch"
aria-pressed="false"
></button>
<p id="soundPanelPermission" class="sound-panel-note"></p>
<dl class="sound-panel-rows">
<div class="sound-panel-row">
<dt id="soundPanelModeLabel"></dt>
<dd id="soundPanelMode"></dd>
</div>
<div class="sound-panel-row">
<dt id="soundPanelNowLabel"></dt>
<dd id="soundPanelNow"></dd>
</div>
</dl>
<!--
What the tones stand for, in numbers. The sandbox's audio is lossy by
design - orbital frequency is compressed and then quantized onto a
pentatonic scale - so this is deliberately not a description of what
you hear. It is the quantity the sound is derived from, printed
losslessly, for a reader who cannot use the audio at all.

NOT aria-live, and that is not an oversight. The voices are re-chosen
several times a second; a polite live region over them would interrupt
a screen reader continuously and make the panel unusable for exactly
the person it exists for. js/soundPanel.js fills this in refreshSoundPanel(),
which runs when the panel opens and on each state change and returns
immediately while the panel is hidden - so the list is a snapshot that
holds still while it is being read.
-->
<section id="soundPanelVoices" class="sound-panel-voices" hidden>
<h3 id="soundPanelVoicesTitle" class="sound-panel-voices-title"></h3>
<ol id="soundPanelVoicesList" class="sound-panel-voices-list"></ol>
<p id="soundPanelVoicesNote" class="sound-panel-note"></p>
</section>
<label class="sound-panel-volume" for="soundPanelVolume">
<span id="soundPanelVolumeLabel"></span>
<input
id="soundPanelVolume"
type="range"
min="0"
max="1"
step="0.05"
value="0.65"
/>
<output id="soundPanelVolumeOut">65%</output>
</label>
<div class="sound-panel-actions">
<button
id="soundPanelPreview"
type="button"
class="sound-panel-btn"
></button>
<button
id="soundPanelStop"
type="button"
class="sound-panel-btn"
></button>
</div>
<p id="soundPanelPreviewNote" class="sound-panel-note"></p>
<p class="sound-panel-link">
<!--
The href is set from js/ui.js along with the label. A static
"#investigation=..." here is a route rather than an anchor, and
tools/check-links.mjs is right to say that no element has that id.
-->
<a id="soundPanelLesson"></a>
</p>
</div>
`;

export const BH_MASSES_MARKUP = `<div
id="bhMassesModal"
class="hidden"
hidden
inert
role="dialog"
aria-modal="true"
aria-labelledby="bhMassesHeading"
>
<div class="bh-masses-header" id="bhMassesHeading">
Set Individual Black Hole Masses (M<sub class="solar-sub">☉</sub>)
</div>
<button
class="floating-close-chip"
id="bhMassesCloseChip"
aria-label="Close"
title="Close without changing the masses"
data-i18n-title="settings.bhMassesCloseChip.hint"
data-i18n-aria-label="settings.bhMassesCloseChip.label"
>
✕
</button>
<div id="bhMassesContent" class="bh-masses-content"></div>
<div class="bh-masses-footer">
<button
id="bhMassesDone"
class="ui-button"
title="Confirm these black hole masses and close"
data-i18n-title="settings.bhMassesDone.hint"
data-i18n="settings.bhMassesDone"
>
Done
</button>
</div>
</div>
`;

export const INSPECTOR_MARKUP = `<!-- Object Inspector Modal -->
<!-- Object inspector: a compact instrument readout, not a modal -->
<div
id="objectInspector"
role="dialog"
aria-labelledby="inspectorTitle"
aria-modal="false"
>
<div class="inspector-header" id="inspectorDragHandle">
<span
class="inspector-icon"
id="inspectorIcon"
aria-hidden="true"
></span>
<span class="inspector-identity">
<span
class="inspector-title"
id="inspectorTitle"
data-i18n="inspector.inspectorTitle"
>Object</span
>
<span class="inspector-kind" id="inspectorKind"></span>
</span>
<span class="inspector-controls">
<button
class="inspector-pin"
id="inspectorPin"
type="button"
aria-label="Pin a copy of this object for comparison"
title="Pin a copy for comparison"
data-i18n-title="inspector.inspectorPin.hint"
data-i18n-aria-label="inspector.inspectorPin.label"
>
<svg
width="14"
height="14"
viewBox="0 0 16 16"
aria-hidden="true"
focusable="false"
>
<path
fill="none"
stroke="currentColor"
stroke-width="1.4"
stroke-linecap="round"
stroke-linejoin="round"
d="M6 1.8h4l-.6 3.3 2.1 2.3H4.5l2.1-2.3zM8 7.4v6.8"
></path>
</svg>
</button>
<button
class="inspector-icon-btn"
id="inspectorManeuver"
type="button"
title="Plan an impulsive burn for this body: set a radial and transverse delta-v, see the orbit it would produce, and apply it only if you mean to"
data-i18n-title="burn.open.hint"
aria-label="Plan a burn"
data-i18n-aria-label="burn.open.label"
hidden
>
&#9650;
</button>
<button
class="inspector-delete"
id="inspectorDelete"
type="button"
aria-label="Delete this object"
title="Delete this object"
data-i18n-title="inspector.inspectorDelete.hint"
data-i18n-aria-label="inspector.inspectorDelete.label"
>
<svg
width="14"
height="14"
viewBox="0 0 16 16"
aria-hidden="true"
focusable="false"
>
<path
fill="none"
stroke="currentColor"
stroke-width="1.4"
stroke-linecap="round"
d="M2.5 4h11M6.5 4V2.6h3V4M4 4l.7 9.4h6.6L12 4M6.6 6.6v4.4M9.4 6.6v4.4"
></path>
</svg>
</button>
<button
class="inspector-close"
id="inspectorClose"
type="button"
aria-label="Close the inspector"
title="Close (Esc)"
data-i18n-title="inspector.inspectorClose.hint"
data-i18n-aria-label="inspector.inspectorClose.label"
>
×
</button>
</span>
</div>

<div
class="inspector-tabs"
role="tablist"
aria-label="Inspector views"
data-i18n-aria-label="inspector.objectInspector.label"
>
<button
class="inspector-tab active"
id="inspectorTabDetails"
data-tab="details"
role="tab"
type="button"
aria-selected="true"
aria-controls="detailsTab"
data-i18n="inspector.inspectorTabDetails"
>
Details
</button>
<button
class="inspector-tab"
id="inspectorTabEnergy"
data-tab="energy"
role="tab"
type="button"
aria-selected="false"
aria-controls="energyTab"
data-i18n="inspector.inspectorTabEnergy"
>
Energy
</button>
</div>

<div class="inspector-content" id="inspectorContent">
<div
class="inspector-tab-content active"
id="detailsTab"
role="tabpanel"
aria-labelledby="inspectorTabDetails"
></div>
<div
class="inspector-tab-content"
id="energyTab"
role="tabpanel"
aria-labelledby="inspectorTabEnergy"
></div>
</div>
</div>
`;

mountFragment('sound', SOUND_PANEL_MARKUP);
mountFragment('bh-masses', BH_MASSES_MARKUP);
if (mountFragment('inspector', INSPECTOR_MARKUP)) {
  // Hidden before it is ever painted. This was an inline script in index.html,
  // run as the parser reached it; the markup arrives here now, so its first
  // state is set here, and the page carries one inline script fewer.
  const inspector = document.getElementById('objectInspector');
  Object.assign(inspector.style, {
    display: 'none',
    opacity: '0',
    visibility: 'hidden',
    pointerEvents: 'none',
    position: 'absolute',
    left: '-9999px',
    top: '-9999px',
    zIndex: '-9999',
  });
  inspector.classList.remove('visible', 'showUI');
}

const canvas = document.getElementById('simulationCanvas');
const starfieldCanvas = document.getElementById('starfieldCanvas');

// The shared state, which used to be declared here. See js/appState.js for why
// it moved: eleven modules imported this one, and four of them wanted nothing
// from it but these objects, so every such import closed a cycle.
// Re-exported below, so that the module's public surface is unchanged by the
// move to js/preview.js.
import { checkAreaSweepValidity } from './preview.js';
import {
  state,
  SETTINGS,
  DEFAULT_SETTINGS,
  withCurrentSettingNames,
  setSettings,
  current_scenario_name,
  setScenarioName as setCurrentScenarioName,
  registerCommands,
} from './appState.js';
import { resetFollowCamera } from './followCamera.js';
import {
  localSettings,
  setLocalSettings,
  getPendingCourseLevel,
  fetchSettingsHelp,
  levelHintText,
  buildSettingsMenu,
  showBHMassesModal,
  hideBHMassesModal,
} from './settingsPanel.js';

// Immediately hide object inspector when module loads
if (typeof document !== 'undefined') {
  const objectInspector = document.getElementById('objectInspector');
  if (objectInspector) {
    objectInspector.classList.remove('visible');
    objectInspector.classList.remove('showUI');
    objectInspector.style.display = 'none';
    objectInspector.style.opacity = '0';
    objectInspector.style.visibility = 'hidden';
    objectInspector.style.pointerEvents = 'none';
  }
}

// Global variables
const SAVE_KEY = 'gravitas_simulation_save';
// Hold this long on empty canvas to arm object placement on touch devices.
const LONG_PRESS_MS = 380;

// Space Object Name Database
if (typeof window !== 'undefined') {
  window.SPACE_OBJECT_NAMES = SPACE_OBJECT_NAMES;
}

// Expanded scenario information

/**
 * Carry a reader's viewpoint across a merger.
 *
 * Two things can be pointed at a body that a merger removes: the reference
 * frame, and the inspector. Both used to be dropped - the frame back to the
 * world origin, which in Binary BH is a jump of tens of thousands of units, and
 * the inspector closed on the next update because its object was no longer in
 * the simulation. In both cases the reader was watching that body precisely
 * because it was about to merge, so the moment of interest is the moment the
 * interface stopped following it.
 *
 * The merger product is what both should move to: it is the same mass in the
 * same place, one body instead of two. Readers in the world or barycenter
 * frame see nothing change, which is checked in tests/mergeFrameTransfer.js.
 */
if (typeof window !== 'undefined') {
  window.addEventListener('gravitasMerge', event => {
    const { primaryId, secondaryId, resultId } = event.detail || {};
    if (resultId === null || resultId === undefined) return;
    const gone = [primaryId, secondaryId];

    transferFrame(gone, resultId);

    const selected = state.selectedObject;
    if (selected?.object && gone.includes(selected.object.id)) {
      const product = allBodies().find(b => b && b.id === resultId);
      // Re-selected rather than merely re-pointed: the product can be a
      // different kind of body from either progenitor - two gas giants can
      // ignite into a star - and the inspector renders by type.
      if (product) {
        showObjectInspector(product, inspectorTypeFor(product));
      }
    }
  });
}

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

initSoundPanel({ typeName: type => typeName(type) });

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

// World construction lives in js/world/build.js. What stays here is the wiring:
// the settings object, the mutable bindings it reads and writes, and the four
// pieces of user interface it has to touch on the way through.
const build_simulation = () =>
  buildWorld({
    settings: SETTINGS,
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

// Settings functions
// The settings panel and the inspector both render text into the DOM rather
// than carrying data-i18n attributes, so the sweep in js/i18n/dom.js cannot
// reach them. They are rebuilt instead, from the same functions that built them
// in the first place: a language change is a repaint, never a rebuild of the
// world.
onLocaleChange(() => {
  // The add button's caption is written by updateObjectTypeButton rather than
  // carried on a data-i18n attribute, because it says different things armed
  // and idle. The DOM sweep therefore cannot reach it and it is repainted here.
  try {
    updateObjectTypeButton();
  } catch {
    /* the rail is optional chrome */
  }
  try {
    if (
      !document.getElementById('settingsPanel')?.classList.contains('hidden')
    ) {
      buildSettingsMenu();
    }
  } catch {
    /* the panel is optional chrome */
  }
  try {
    if (state.inspector_open && state.selectedObject) {
      showObjectInspector(
        state.selectedObject.object,
        state.selectedObject.type
      );
    }
  } catch {
    /* likewise */
  }
  // The scenario card is written once, when the world is built. On a Spanish
  // first load that happens before the Spanish catalog has arrived - it is a
  // dynamic import - so the card is drawn in English and then never touched
  // again. Rewriting it here is what makes the very first card a reader sees
  // be in their own language.
  try {
    const card = document.getElementById('scenarioInfoBox');
    const title = document.getElementById('scenarioInfoTitle');
    const summary = document.getElementById('scenarioInfoSummary');
    const key = card?.dataset.scenarioKey;
    if (card && title && summary && key && SCENARIO_INFO[key]) {
      title.textContent = scenarioTitle(key);
      summary.textContent = scenarioSummary(key);
    }
  } catch {
    /* the card is optional chrome */
  }
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
      withCurrentSettingNames(loadedState.settings) || { ...DEFAULT_SETTINGS }
    );
    const view = loadedState.view || { zoom: 1.5, pan: { x: 0, y: 0 } };
    state.zoom = view.zoom;
    state.pan = view.pan;
    updatePhysicsSettings(SETTINGS);
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
  pendingSettingsOverride = payload.d
    ? withCurrentSettingNames(payload.d)
    : null;

  const seed = payloadSeed(payload);

  if (Array.isArray(payload.b) && payload.b.length) {
    // A full payload describes a world no seed reproduces. Build the scenario
    // first so settings, starfield and preset geometry are right, then replace
    // the bodies with the ones the link actually carries.
    initialize_simulation({ seed });
    rebuildWorldFromStates(payload.b);
    updatePhysicsSettings(SETTINGS);
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
    Object.assign(SETTINGS, withCurrentSettingNames(payload.a));
    updatePhysicsSettings(SETTINGS);
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
initPlacement({ canvas, adjustSimSpeed, updateSpeedDisplay, takeScreenshot });

// The inspector header buttons and the resize handler (js/inspectorWindow.js).
wireInspectorControls();

/**
 * Settings is one dialog with one way in and one way out.
 *
 * Four places used to add or remove a class, and none of them touched focus,
 * the tab order, or the accessibility tree. These functions are now the only
 * ones that open or close it, which is what makes "closed means closed"
 * something that can be true rather than something each caller remembers.
 */
const settingsPanel = () => document.getElementById('settingsPanel');

/**
 * The dialog machinery, fetched the first time a dialog is opened.
 *
 * Deferred because it is not start-up code: nothing needs it until somebody
 * presses Settings, and the initial download is a budget that is only ever
 * paid for by finding something to move out of it. The closed panel is closed
 * from the first paint by the `hidden` and `inert` attributes in index.html,
 * so nothing here is load-bearing before the first open.
 */
let dialogModule = null;
const dialog = async () => (dialogModule ??= await import('./dialog.js'));

/** Open, asked of the DOM rather than of a module that may not be here yet. */
const settingsOpen = () => settingsPanel()?.hidden === false;

/** What the world was doing before Settings paused it. */
let pausedBeforeSettings = false;

async function openSettings() {
  const panel = settingsPanel();
  if (!panel || settingsOpen()) return;
  const { openDialog } = await dialog();
  // Rebuilt from SETTINGS every time, so nothing staged in a previous visit
  // and then abandoned can leak into this one.
  buildSettingsMenu();
  pausedBeforeSettings = state.paused;
  state.paused = true;
  // The level's description arrives while the reader looks. Written into its
  // one line rather than registered: registering repaints the panel, and a
  // repaint now would take the focus the dialog is about to place.
  fetchSettingsHelp()
    .then(() => {
      const hint = document.getElementById('settingsCourseLevelHint');
      if (hint) hint.textContent = levelHintText(getPendingCourseLevel());
    })
    .catch(() => {});
  openDialog(panel, {
    trigger: document.getElementById('settingsBtn'),
    // The close chip comes first in the markup, and landing on "close" is a
    // poor welcome. The first real control is where a reader wants to be.
    initialFocus:
      '.settings-grid input, .settings-grid select, .settings-grid button',
    // Every way out reports why, including Escape - which the dialog handles
    // itself and this module would otherwise have to race a listener to see.
    // Applying is the one exit that means "carry on"; the rest put the world
    // back exactly as they found it.
    onClose: reason => {
      if (reason !== 'apply') state.paused = pausedBeforeSettings;
    },
  });
}

/**
 * Close Settings without applying anything.
 *
 * The pause is put back as it was found rather than cleared. Opening Settings
 * pauses the simulation; closing it used to unpause unconditionally, so a
 * reader who had deliberately paused, opened Settings and pressed Cancel got a
 * running world they never asked for.
 *
 * @param {string} reason - 'cancel', 'escape' or 'chip'
 */
function dismissSettings(reason) {
  // Loaded by definition: the panel cannot be open without it.
  dialogModule?.closeDialog(settingsPanel(), reason);
}

document.getElementById('settingsBtn').onclick = openSettings;
// A feature module that needs the world rebuilt asks for it here rather than
// reaching for initialize_simulation. js/ui.js is the coordinator: it may
// import anything and nothing may import it, so a panel that wants a rebuild -
// the binary planet lab does, because changing where a planet starts means
// starting over rather than teleporting it mid-flight - has to be able to say
// so without acquiring an edge back up to this module.
window.addEventListener('gravitasRequestRebuild', () => {
  if (rebuildBuiltSystem()) return;
  SETTINGS.preset_scenario = current_scenario_name || SETTINGS.preset_scenario;
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
// Settings that describe how the simulation is *built* - changing any of them
// genuinely requires a rebuild. Everything else is presentation or a live
// physics knob and can be applied to the running simulation, so that adjusting
// a trail style no longer throws away the system you were watching.
const REBUILD_KEYS = new Set([
  'preset_scenario',
  'num_planets',
  'num_gas_giants',
  'num_stars',
  'num_asteroids',
  'num_comets',
  'num_neutron_stars',
  'num_white_dwarfs',
  'num_black_holes',
  'bh_mass',
  'use_individual_bh_masses',
  'bh_masses',
  'placement',
  'sim_size',
  'init_velocity',
  'velocity_stddev',
  'enable_asteroids',
]);

/**
 * Which of the pending settings require a full rebuild.
 * @param {Object} next - The staged settings
 * @returns {Array<string>} Names of changed rebuild-scope settings
 */
const changedRebuildKeys = next =>
  [...REBUILD_KEYS].filter(
    k => JSON.stringify(next[k]) !== JSON.stringify(SETTINGS[k])
  );

document.getElementById('settingsApply').onclick = () => {
  const next = JSON.parse(JSON.stringify(localSettings));
  const needsRebuild = changedRebuildKeys(next);
  const starfieldChanged =
    next.star_density !== SETTINGS.star_density ||
    next.show_ambient_lighting !== SETTINGS.show_ambient_lighting;

  // What the reader changed, to be laid over the scenario's own values when
  // the world is rebuilt. The rebuild applies the scenario's preset first,
  // which resets every setting to the defaults and the scenario's choices; on
  // its own that put back the planet count, the layout and everything else
  // the reader had just changed, so Apply rebuilt the same world it started
  // with. Share links carry their settings through the same override.
  const changed = Object.fromEntries(
    Object.keys(next)
      .filter(
        k =>
          k !== 'preset_scenario' &&
          JSON.stringify(next[k]) !== JSON.stringify(SETTINGS[k])
      )
      .map(k => [k, next[k]])
  );

  setSettings(next);
  if (getPendingCourseLevel() && getPendingCourseLevel() !== getCourseLevel())
    setCourseLevel(getPendingCourseLevel());
  dialogModule?.closeDialog(settingsPanel(), 'apply');

  if (needsRebuild.length > 0) {
    pendingSettingsOverride = changed;
    initialize_simulation();
    show_scenario_info();
  } else {
    // Live path: push the new values into the physics layer and repaint the
    // background if it depends on anything that changed.
    updatePhysicsSettings(SETTINGS);
    if (starfieldChanged) generateStarfield();
    window.dispatchEvent(
      new CustomEvent('gravitasSettingsApplied', {
        detail: { rebuilt: false },
      })
    );
  }

  // Applying is a deliberate "carry on", so this one really does start the
  // world - unlike the dismissals, which put the pause back as they found it.
  state.paused = false;
  pausedBeforeSettings = false;
  updateSpeedDisplay();
  // "Interactive Add" switched off here used to leave the Add object button
  // lit and pressable, arming nothing; a lesson's lock already did this.
  syncPlacementAvailability();
};
document.getElementById('settingsReset').onclick = () => {
  setLocalSettings(JSON.parse(JSON.stringify(DEFAULT_SETTINGS)));
  buildSettingsMenu({ keep: true });
};
document.getElementById('settingsCancel').onclick = () =>
  dismissSettings('cancel');
const settingsCloseChip = document.getElementById('settingsCloseChip');
if (settingsCloseChip)
  settingsCloseChip.onclick = () => dismissSettings('chip');
// Capture, measurement, speed and demo-mode buttons (js/captureMeasure.js).
initCaptureMeasure({ canvas, starfieldCanvas });
// BH Masses Modal event handlers
document.getElementById('bhMassesDone').onclick = () =>
  hideBHMassesModal('done');
document.getElementById('bhMassesCloseChip').onclick = () =>
  hideBHMassesModal('cancel');

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

document
  .getElementById('systemBuilderBtn')
  ?.addEventListener('click', async event => {
    const trigger = event.currentTarget;
    systemBuilderModule ??= await import('./systemBuilder.js');
    systemBuilderModule.openSystemBuilder({ kit: worldKit, trigger });
  });
initObjectPicker();

// Mobile instructions close button
document.getElementById('closeMobileInstructions').onclick = () => {
  document.getElementById('mobileInstructions').style.display = 'none';
};
// Mobile menu functionality
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const uiRail = document.querySelector('.ui-container');

// The narrow-screen menu used to be a second copy of the control rail: parallel
// markup with `mobile*` ids and ~260 lines of duplicated handlers, including a
// divergent scenario list that skipped the HTML sanitising the desktop one did.
// The hamburger now opens the rail itself, so there is one set of controls and
// one set of behaviors at every width.
if (mobileMenuToggle && uiRail) {
  const closeRail = () => {
    mobileMenuToggle.classList.remove('active');
    mobileMenuToggle.setAttribute('aria-expanded', 'false');
    uiRail.classList.remove('is-open');
  };

  mobileMenuToggle.addEventListener('click', e => {
    e.stopPropagation();
    const open = uiRail.classList.toggle('is-open');
    mobileMenuToggle.classList.toggle('active', open);
    mobileMenuToggle.setAttribute('aria-expanded', String(open));
  });

  // Any control in the rail dismisses the menu once it has run - with one
  // exception, and it is the reason the narrow-screen picker was unusable.
  //
  // `#objectTypeBtn` does not run a command; it opens a menu, and the choice
  // the reader came to make is in that menu. Closing the rail on the press that
  // opens it took the picker off the screen before a single object type could
  // be read, let alone chosen. Picking a type then closes both deliberately,
  // from the item's own handler.
  //
  // A section's heading is the other: it opens a section of this menu, and
  // the menu closing under it left a phone reader unable to open any section
  // at all.
  uiRail.addEventListener('click', e => {
    if (!uiRail.classList.contains('is-open')) return;
    if (!e.target.closest('button')) return;
    if (e.target.closest('#objectTypeBtn, .rail-section-toggle')) return;
    closeRail();
  });

  document.addEventListener('click', e => {
    if (!uiRail.classList.contains('is-open')) return;
    if (mobileMenuToggle.contains(e.target) || uiRail.contains(e.target))
      return;
    // The picker is parented to <body>, so it is outside the rail in the DOM
    // and would otherwise read as an outside click - closing the rail, and with
    // it the arming the reader was in the middle of.
    if (objectPickerContains(e.target)) return;
    closeRail();
  });

  window.addEventListener('gravitasEscape', closeRail);
}

// Scenario info box close button
/**
 * Close the card that names the scenario, and remember that it was closed: it
 * does not come back for this scenario (show_enhanced_scenario_info).
 */
const dismissScenarioCard = () => {
  const infoBox = document.getElementById('scenarioInfoBox');
  if (!infoBox?.classList.contains('showUI')) return;
  infoBox.classList.remove('showUI', 'show');
  if (infoBox.dataset.scenarioKey)
    infoBox.dataset.dismissed = infoBox.dataset.scenarioKey;
};

const closeScenarioInfoBtn = document.getElementById('closeScenarioInfo');
if (closeScenarioInfoBtn) {
  // The press is taken on mousedown as well as click so that a drag handler
  // on the canvas beneath cannot swallow it.
  for (const type of ['click', 'mousedown']) {
    closeScenarioInfoBtn.addEventListener(type, e => {
      e.preventDefault();
      e.stopPropagation();
      dismissScenarioCard();
    });
  }
}
// Escape closes it like any other overlay.
window.addEventListener('gravitasEscape', dismissScenarioCard);

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

// Run validation on page load
document.addEventListener('DOMContentLoaded', () => {
  validateScenarioData();
});

// Touch event handlers for mobile
canvas.addEventListener(
  'touchstart',
  e => {
    // Only call preventDefault if necessary (e.g., for custom drag/zoom)
    if (e.touches.length === 1) {
      e.preventDefault(); // Required to prevent scrolling during drag/zoom
    }
    const touchCount = e.touches.length;

    // Mark that user has interacted with the page
    state.user_has_interacted = true;

    if (touchCount === 1) {
      const touch = e.touches[0];
      const touchStartPos = canvasPoint(touch);

      // Was: a bounding-box test against .ui-container. On mobile that element
      // is the closed menu - still laid out, just visibility:hidden - so its
      // 340x697 rect swallowed 78% of the screen and the canvas was mostly
      // untouchable. elementFromPoint only reports what is actually hit-
      // testable, so a hidden panel no longer blocks anything.
      //
      // clientX/clientY, not the converted point: elementFromPoint is a DOM
      // API and takes CSS pixels. Handing it canvas pixels asked about a
      // different place on the screen whenever the backing store and the CSS
      // box differ, which is exactly what the low quality tier does - it
      // renders the canvas at 0.7 scale.
      const hit = document.elementFromPoint(touch.clientX, touch.clientY);
      if (
        hit &&
        hit !== canvas &&
        hit.closest(
          'button, input, select, a, [role="dialog"], .ui-container, #overlay, .timeline-bar'
        )
      ) {
        return;
      }

      state.touch_active = true;
      state.touch_id = touch.identifier;

      // Check for object interaction
      const worldPos = screen_to_world(touchStartPos);
      const clickedObject = findObjectAtPosition(worldPos);

      if (clickedObject) {
        // Always show inspector when touching an object
        showObjectInspector(clickedObject.object, clickedObject.type);
        return;
      }

      // Only close inspector if we touched empty space
      if (state.inspector_open && !clickedObject) {
        hideObjectInspector();
        return;
      }

      // A fresh touch must not inherit the previous one's position, or the
      // first move jumps by the distance between them.
      state.lastTouchPos = touchStartPos;

      if (placementArmed()) {
        if (!isFinite(worldPos.x) || !isFinite(worldPos.y)) {
          console.warn('Invalid world coordinates:', worldPos);
          return;
        }

        // Touch drag pans, the way every map behaves. Placement needs both the
        // picker's arming and a long press: the long press alone was already
        // deliberate enough to pan safely, and requiring the picker as well
        // keeps one rule for what "about to add something" means.
        state.touchHoldTimer = setTimeout(() => {
          if (!state.touch_active) return;
          state.adding_mass = true;
          state.isDragging = true;
          state.add_start_screen = touchStartPos;
          state.add_start_world = worldPos;
          state.dragStart = { ...worldPos };
          state.dragCurrent = { ...worldPos };
          if (navigator.vibrate) navigator.vibrate(12);
          window.dispatchEvent(new CustomEvent('gravitasPlacementArmed'));
        }, LONG_PRESS_MS);
      }
    }
  },
  { passive: false } // passive: false is required because we call preventDefault for custom drag/zoom
);

canvas.addEventListener(
  'touchmove',
  e => {
    e.preventDefault();
    const touchCount = e.touches.length;

    if (touchCount === 1 && state.touch_active) {
      const touch = e.touches[0];
      const currentPos = canvasPoint(touch);

      // Moving means this is a drag, not a hold: cancel the pending arm.
      if (state.touchHoldTimer && !state.adding_mass) {
        const moved = Math.hypot(
          currentPos.x - (state.add_start_screen?.x ?? currentPos.x),
          currentPos.y - (state.add_start_screen?.y ?? currentPos.y)
        );
        if (moved > 10) {
          clearTimeout(state.touchHoldTimer);
          state.touchHoldTimer = null;
        }
      }

      if (state.adding_mass) {
        state.dragCurrent = screen_to_world(currentPos);
        updateOrbitHelper(false);
      } else {
        // Pan the view
        const deltaX = currentPos.x - (state.lastTouchPos?.x || currentPos.x);
        const deltaY = currentPos.y - (state.lastTouchPos?.y || currentPos.y);
        state.pan.x += deltaX;
        state.pan.y += deltaY;
        state.cameraTouchedAt = Date.now();
      }

      state.lastTouchPos = currentPos;
    } else if (touchCount === 2) {
      // A second finger cancels placement and switches to pinch-zoom.
      if (state.touchHoldTimer) {
        clearTimeout(state.touchHoldTimer);
        state.touchHoldTimer = null;
      }
      state.adding_mass = false;
      state.isDragging = false;
      // Pinch zoom handling
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDistance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
          Math.pow(touch2.clientY - touch1.clientY, 2)
      );

      if (state.lastTouchDistance > 0) {
        const zoomFactor = currentDistance / state.lastTouchDistance;

        // Limit the zoom factor per frame to prevent excessive zooming
        // Was clamped to +/-5% per frame, which made pinching feel like it
        // barely responded. A wider clamp still guards against a jump if a
        // touch is momentarily lost.
        const limitedZoomFactor = Math.max(0.7, Math.min(zoomFactor, 1.4));

        const oldZoom = state.zoom;
        let newZoom = oldZoom * limitedZoomFactor;
        newZoom = Math.max(0.01, Math.min(newZoom, 100));

        // Zoom towards the center of the two touches, in canvas pixels.
        //
        // Both halves of an anchored zoom have to be in the same space:
        // screen_to_world and worldToScreen speak canvas pixels, and clientX
        // is CSS pixels. Averaging the raw values and subtracting the result
        // from a worldToScreen output mixed the two, so at the low quality
        // tier - where the canvas backing store is 0.7 of its CSS box - the
        // anchor sat about 40% away from the fingers and the view slid out
        // from under the pinch on every move event.
        const p1 = canvasPoint(touch1);
        const p2 = canvasPoint(touch2);
        const centerX = (p1.x + p2.x) / 2;
        const centerY = (p1.y + p2.y) / 2;

        // Get the world position at the center of the pinch
        const worldPos = screen_to_world({ x: centerX, y: centerY });

        // Update zoom
        state.zoom = newZoom;
        state.cameraTouchedAt = Date.now();

        // Calculate where the center point should be on screen with the new zoom
        const newScreenPos = worldToScreen(worldPos, state, canvas);

        // Calculate the difference and adjust pan to keep the pinch center fixed
        const deltaX = newScreenPos.x - centerX;
        const deltaY = newScreenPos.y - centerY;

        state.pan.x -= deltaX;
        state.pan.y -= deltaY;
      }

      state.lastTouchDistance = currentDistance;
    }
  },
  // Must be non-passive: this handler calls preventDefault to stop the page
  // rubber-banding while you drag the simulation. As a passive listener the
  // call was silently ignored.
  { passive: false }
);

canvas.addEventListener(
  'touchend',
  e => {
    e.preventDefault();
    const touchCount = e.touches.length;

    if (touchCount === 0) {
      if (state.adding_mass) {
        // Add object with velocity
        const touch = e.changedTouches[0];
        // Through canvasPoint, like the press that started this drag and like
        // every mouse path. Passing clientX straight to screen_to_world - which
        // expects canvas pixels - put the release somewhere else entirely at
        // the low tier, so the placed body got the wrong velocity, and on a
        // page where the canvas is not flush with the viewport it was wrong at
        // every tier.
        const add_end_world = screen_to_world(canvasPoint(touch));

        // Validate both start and end world coordinates
        if (
          isNaN(add_end_world.x) ||
          isNaN(add_end_world.y) ||
          !isFinite(add_end_world.x) ||
          !isFinite(add_end_world.y) ||
          isNaN(state.add_start_world.x) ||
          isNaN(state.add_start_world.y) ||
          !isFinite(state.add_start_world.x) ||
          !isFinite(state.add_start_world.y)
        ) {
          console.warn(
            'Invalid world coordinates during touch object placement:',
            {
              start: state.add_start_world,
              end: add_end_world,
            }
          );
          return;
        }

        const vel = {
          x: (add_end_world.x - state.add_start_world.x) * 3,
          y: (add_end_world.y - state.add_start_world.y) * 3,
        };
        placeBody(state.add_start_world, vel);

        state.adding_mass = false;
        state.isDragging = false;
        state.orbit_helper.preview = null;
      }

      state.touch_active = false;
      state.touch_id = null;
      state.lastTouchPos = null;
    }

    // Reset the pinch baseline whenever fewer than two fingers remain, or
    // lifting one finger of a pinch makes the next one jump.
    if (touchCount < 2) state.lastTouchDistance = 0;

    if (state.touchHoldTimer) {
      clearTimeout(state.touchHoldTimer);
      state.touchHoldTimer = null;
    }
  },
  { passive: false }
);

// What the modules below this one ask of it (the command bus, js/appState.js).
registerCommands({
  captureShareState,
  applyShareState,
  initialize_simulation,
  show_enhanced_scenario_info,
  loadScenarioByKey,
  setInspectorSuppressed,
  hideObjectInspector,
  setAreaSweepWedges,
  getAreaSweepWedges,
  showAreaSweepFor,
  setAreaSweepSuppressed,
  syncPlacementAvailability,
  markWorldTouched,
  computeAreaSweep,
});

// Export functions and variables
export {
  showObjectInspector,
  hideObjectInspector,
  getBlackHoleInfo,
  getStarInfo,
  getPlanetInfo,
  getGasGiantInfo,
  getAsteroidInfo,
  getNeutronStarInfo,
  getWhiteDwarfInfo,
  showBHMassesModal,
  hideBHMassesModal,
  show_scenario_info,
  show_enhanced_scenario_info,
  apply_preset,
  initialize_simulation,
  buildSettingsMenu,
  save_simulation_state,
  load_simulation_state,
  isAreaSweepSuppressed,
  checkAreaSweepValidity,
  captureShareState,
  applyShareState,
  markWorldTouched,
  updateSpeedDisplay,
  takeScreenshot,
  updateObjectTypeButton,
  placeBody,
  keyboardPlacementActive,
  beginKeyboardPlacement,
  cancelKeyboardPlacement,
  commitKeyboardPlacement,
  setupOverlayMinimize,
  SETTINGS,
  state,
  current_scenario_name,
  DEFAULT_SETTINGS,
  localSettings,
};
// Tutorial lives in js/tutorial.js - see initTutorial(), wired from main.js.

document.addEventListener('DOMContentLoaded', () => {
  const cleanSimBtn = document.getElementById('cleanSimBtn');
  if (cleanSimBtn) {
    cleanSimBtn.onclick = () => {
      // Was a hand-written copy of clearWorld() that also left the energy
      // history of every deleted body behind.
      clearWorld();

      // Reset view to default
      state.zoom = 1.0;
      state.pan = { x: 0.0, y: 0.0 };
      resetFollowCamera(state);

      // Hide inspector and scenario info
      hideObjectInspector && hideObjectInspector();
      const scenarioInfoDiv = document.getElementById('scenarioInfoDisplay');
      if (scenarioInfoDiv) scenarioInfoDiv.classList.remove('visible');

      // Set scenario to 'None' and update settings
      SETTINGS.preset_scenario = 'None';
      setCurrentScenarioName('None');
      builtSystem = null;

      // Unpause simulation and set normal speed
      state.paused = false;
      SETTINGS.sim_speed = 1.0;

      // Redraw background/starfield if needed
      if (typeof generateStarfield === 'function') generateStarfield();

      // Optionally update UI overlays
      if (typeof show_scenario_info === 'function') show_scenario_info();
    };
  }
});
