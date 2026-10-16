// UI and event handling functions

import {
  screen_to_world,
  updatePhysicsSettings,
  findObjectAtPosition,
} from './physics.js';

import { worldToScreen } from './utils.js';
import { transferFrame } from './referenceFrame.js';

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

import { onLocaleChange } from './i18n/index.js';
import { scenarioTitle, scenarioSummary } from './i18n/scenario.js';

import { generateStarfield } from './render.js';
import {
  initWorld,
  allBodies,
  clearWorld,
  apply_preset,
  initialize_simulation,
  show_scenario_info,
  show_enhanced_scenario_info,
  save_simulation_state,
  load_simulation_state,
  captureShareState,
  applyShareState,
  markWorldTouched,
  setBuiltSystem,
  setPendingSettings,
  validateScenarioData,
  loadScenarioByKey,
} from './world.js';
import { initSoundPanel } from './soundPanel.js';
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
  typeName,
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

initSoundPanel({ typeName: type => typeName(type) });

// Build, save, load and share live in js/world.js; its listeners are wired here.
initWorld();

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

initPlacement({ canvas });

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
    setPendingSettings(changed);
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
  loadScenarioByKey,
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
      setBuiltSystem(null);

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
