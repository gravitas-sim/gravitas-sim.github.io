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
  SOLAR_MASS_UNIT,
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

import { worldToScreen, debugLog, canRecordClips } from './utils.js';
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
import { lastEvent } from './pauseAtEventBridge.js';
import { SPACE_OBJECT_NAMES } from './data/objectNames.js';
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
import { t, onLocaleChange, registerMessages } from './i18n/index.js';
import { scenarioTitle, scenarioSummary } from './i18n/scenario.js';
import { resetPotentialCache } from './vectorOverlay.js';
import { toast, announce } from './notify.js';
import { registerShortcut } from './shortcuts.js';
import {
  toggleTool,
  isToolActive,
  toolsPointerDown,
  toolsPointerMove,
  toolsPointerUp,
  latchStopwatchTo,
  stopwatch,
  stopwatchTarget,
  setCaptureMode,
  SCENARIO_SOURCES,
} from './sandboxTools.js';
import { withSeed, getWorldSeed, setWorldSeed, randomSeed } from './rng.js';
import { keplerNewton } from './orbital.js';
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
import { glyphMarkup } from './inspectorView.js';
import { initSoundPanel, stopSignalAudio } from './soundPanel.js';
import {
  showObjectInspector,
  hideObjectInspector,
  inspectorTypeFor,
  setInspectorSuppressed,
  setupOverlayMinimize,
  wireInspectorControls,
} from './inspectorWindow.js';
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

// No global annotation helpers in clean state
// Return attractors sorted by gravitational influence m/r^2
function getDominantAttractors(startPos, limit = 1) {
  const candidates = [...bh_list, ...stars, ...neutron_stars, ...white_dwarfs];
  const G = SETTINGS.gravitational_constant;
  const scored = candidates
    .filter(b => b && b.alive)
    .map(b => {
      const dx = b.pos.x - startPos.x;
      const dy = b.pos.y - startPos.y;
      const r2 = Math.max(1e-6, dx * dx + dy * dy);
      return { body: b, influence: (G * b.mass) / r2 };
    })
    .sort((a, b) => b.influence - a.influence);
  return scored.slice(0, Math.max(1, limit)).map(s => s.body);
}

// How many equal-time slices the area-sweep overlay is cut into. Exposed so a
// lesson can let a student change it and watch the areas stay equal.
let areaSweepWedges = 8;

/**
 * Set the number of equal-area wedges and rebuild the overlay.
 * @param {number} n - Wedge count
 */
const setAreaSweepWedges = n => {
  areaSweepWedges = Math.max(2, Math.min(24, Math.round(n)));
  const ov = state.areaSweepOverlay;
  if (!ov.active || !ov.objectId) return;
  const body = [...planets, ...asteroids, ...comets, ...gas_giants].find(
    o => o.id === ov.objectId
  );
  if (!body) return;
  const data = computeAreaSweep(body, areaSweepWedges);
  if (data) Object.assign(state.areaSweepOverlay, data, { active: true });
};

/** @returns {number} Current wedge count */
const getAreaSweepWedges = () => areaSweepWedges;

/**
 * Draw the equal-area wedges for a given body.
 *
 * Normally this is reached through the inspector's toggle, which a lesson
 * hides. A lesson that asks a student to click planets and compare their
 * orbits needs the overlay to follow the selection instead.
 *
 * @param {Object} obj - Body to draw the sweep for
 * @returns {boolean} True if an overlay was produced
 */
const showAreaSweepFor = obj => {
  if (!obj || areaSweepSuppressed) return false;
  const data = computeAreaSweep(obj, areaSweepWedges);
  if (!data) return false;
  Object.assign(state.areaSweepOverlay, data, { active: true });
  return true;
};

// The Kepler's 2nd Law scenario switches the wedges on when it builds, a fifth
// of a second after the rest of it. That is right for the lesson that scenario
// was made for and wrong for any other lesson borrowing the same star and
// planets, so a caller can refuse them outright rather than racing that timer
// to switch them off again.
let areaSweepSuppressed = false;

/**
 * Refuse or allow the equal-area wedges.
 * @param {boolean} on - True to keep them off the screen
 */
const setAreaSweepSuppressed = on => {
  areaSweepSuppressed = Boolean(on);
  if (areaSweepSuppressed) state.areaSweepOverlay.active = false;
};

/** @returns {boolean} True while the wedges are being refused */
const isAreaSweepSuppressed = () => areaSweepSuppressed;

/**
 * Build the equal-area wedges for a body's orbit.
 *
 * The orbit is constructed analytically from the orbital elements rather than
 * by integrating. Integrating stepped for exactly one analytic period, but
 * symplectic Euler's own period differs from the analytic one by a fraction of
 * a percent, so the path never quite closed: the wedges spanned 359.3 degrees
 * and left a thin unfilled remainder at periapsis, where the angular rate is
 * highest and the gap is most visible. Solving Kepler's equation instead closes
 * the ellipse exactly and divides it into intervals of exactly equal time,
 * which by conservation of angular momentum are intervals of exactly equal
 * area.
 *
 * @param {Object} obj - The orbiting body
 * @param {number} [wedgeCount] - How many equal-time segments to cut
 * @returns {Object|null} Overlay data, or null if the orbit is not bound
 */
function computeAreaSweep(obj, wedgeCount = areaSweepWedges) {
  const G = SETTINGS.gravitational_constant;
  const candidates = [
    ...bh_list,
    ...stars,
    ...neutron_stars,
    ...white_dwarfs,
    ...gas_giants,
  ];
  let parent = null;
  let maxInfluence = -Infinity;
  for (const b of candidates) {
    if (!b || !b.alive || b === obj) continue;
    const dx = obj.pos.x - b.pos.x;
    const dy = obj.pos.y - b.pos.y;
    const r2 = Math.max(1e-6, dx * dx + dy * dy);
    const influence = (G * b.mass) / r2;
    if (influence > maxInfluence) {
      maxInfluence = influence;
      parent = b;
    }
  }
  if (!parent) return null;

  const rx = obj.pos.x - parent.pos.x;
  const ry = obj.pos.y - parent.pos.y;
  const vx = obj.vel.x - parent.vel.x;
  const vy = obj.vel.y - parent.vel.y;

  const r = Math.hypot(rx, ry);
  if (!(r > 0)) return null;
  const mu = G * (parent.mass + (obj.mass || 0));
  const energy = (vx * vx + vy * vy) / 2 - mu / r;
  if (!(energy < 0)) return null; // unbound: no closed orbit to divide

  const a = -mu / (2 * energy);
  const h = rx * vy - ry * vx;
  // Eccentricity vector, which points from the focus toward periapsis.
  const ex = (vy * h) / mu - rx / r;
  const ey = (-vx * h) / mu - ry / r;
  const e = Math.min(0.999, Math.hypot(ex, ey));
  const omega = Math.atan2(ey, ex);
  // Sign of the angular momentum sets the direction of travel.
  const dir = h >= 0 ? 1 : -1;

  // Where the body is now, as a mean anomaly, so the wedges start from it.
  const cosNu = (ex * rx + ey * ry) / (Math.max(e, 1e-9) * r);
  const nu0 =
    Math.sign(rx * ey - ry * ex) === 0
      ? Math.acos(Math.max(-1, Math.min(1, cosNu)))
      : -Math.sign(rx * ey - ry * ex) *
        Math.acos(Math.max(-1, Math.min(1, cosNu)));
  const E0 =
    2 *
    Math.atan2(
      Math.sqrt(1 - e) * Math.sin(nu0 / 2),
      Math.sqrt(1 + e) * Math.cos(nu0 / 2)
    );
  const M0 = E0 - e * Math.sin(E0);

  const N = Math.max(2, Math.min(24, Math.round(wedgeCount)));
  const PER_WEDGE = 90;
  const b = a * Math.sqrt(1 - e * e);
  const cosW = Math.cos(omega);
  const sinW = Math.sin(omega);

  const at = M => {
    const E = keplerNewton(M, e, e < 0.8 ? M : Math.PI, 1e-13, 40);
    // Perifocal coordinates, then rotated into the simulation frame.
    const xp = a * (Math.cos(E) - e);
    const yp = b * Math.sin(E) * dir;
    return { x: xp * cosW - yp * sinW, y: xp * sinW + yp * cosW };
  };

  const wedges = [];
  const orbitPoints = [];
  for (let w = 0; w < N; w++) {
    const wedge = [];
    for (let k = 0; k <= PER_WEDGE; k++) {
      const M = M0 + 2 * Math.PI * ((w + k / PER_WEDGE) / N);
      const pt = at(M);
      wedge.push(pt);
      if (k < PER_WEDGE || w === N - 1) orbitPoints.push(pt);
    }
    wedges.push(wedge);
  }
  // Close the outline exactly on the point it started from.
  orbitPoints.push({ ...orbitPoints[0] });

  const period = 2 * Math.PI * Math.sqrt((a * a * a) / mu);
  return {
    parentId: parent.id,
    parent,
    objectId: obj.id,
    wedges,
    orbitPoints,
    wedgeCount: N,
    period,
    wedgeTime: period / N,
    a,
    e,
  };
}

function computeCircularVelocity(startPos, body) {
  const G = SETTINGS.gravitational_constant;
  const dx = startPos.x - body.pos.x;
  const dy = startPos.y - body.pos.y;
  const dist = Math.max(1e-6, Math.hypot(dx, dy));
  const v = Math.sqrt((G * body.mass) / dist);
  const angle = Math.atan2(startPos.y - body.pos.y, startPos.x - body.pos.x);
  const tangent = angle + Math.PI / 2;
  return { x: v * Math.cos(tangent), y: v * Math.sin(tangent) };
}

// Integrate a short trajectory preview under dominant attractors
function computeTrajectoryPreview(
  startPos,
  initialVel,
  useCircularSnap = false
) {
  const bodies = getDominantAttractors(startPos, 1);
  if (bodies.length === 0) return null;
  let vel = { x: initialVel.x, y: initialVel.y };
  // If snapping, replace initial velocity with circular around most influential body
  if (useCircularSnap && bodies[0]) {
    vel = computeCircularVelocity(startPos, bodies[0]);
  }
  const points = [];
  let p = { x: startPos.x, y: startPos.y };
  const dt = 0.12; // preview integration step in sim seconds
  // Adaptive number of steps: fewer when moving slowly, more when fast
  const vPreviewMag = Math.hypot(vel.x, vel.y);
  const stepsBase = 120;
  const stepsK = 0.8; // sensitivity; tune if needed
  const steps = Math.max(
    80,
    Math.min(300, Math.floor(stepsBase + stepsK * vPreviewMag))
  );
  const softening2 = 1e-3;
  const G = SETTINGS.gravitational_constant;
  for (let i = 0; i < steps; i++) {
    const b = bodies[0];
    const dx = b.pos.x - p.x;
    const dy = b.pos.y - p.y;
    const r2 = dx * dx + dy * dy + softening2;
    const invR = 1 / Math.sqrt(r2);
    const aMag = (G * b.mass) / r2;
    const ax = aMag * dx * invR;
    const ay = aMag * dy * invR;
    vel.x += ax * dt;
    vel.y += ay * dt;
    p.x += vel.x * dt;
    p.y += vel.y * dt;
    points.push({ x: p.x, y: p.y });
    // Early stop if far off-screen to save work
    if (Math.abs(p.x) > 1e6 || Math.abs(p.y) > 1e6) break;
  }
  return { points, velSuggested: vel, attractor: bodies[0] };
}

// Update orbit helper preview during drag (reflects trajectory if released now)
function updateOrbitHelper(shiftSnap) {
  if (!state.adding_mass || !state.orbit_helper.enabled) {
    state.orbit_helper.preview = null;
    return;
  }
  // Compute initial velocity from current drag vector (same scaling as placement)
  const current = screen_to_world(state.mouse);
  const initialVel = {
    x: (current.x - state.add_start_world.x) * 3,
    y: (current.y - state.add_start_world.y) * 3,
  };
  state.orbit_helper.preview = computeTrajectoryPreview(
    state.add_start_world,
    initialVel,
    !!shiftSnap
  );
}

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

// Utility functions
/**
 * Update the speed display in the UI to show current simulation speed
 */
const updateSpeedDisplay = () => {
  const speedDisplay = document.getElementById('speedDisplay');
  if (speedDisplay) {
    // One decimal reads any speed below 0.05 as "0.0x", which looks like the
    // simulation is stopped. A compact scenario can legitimately run at 0.01.
    const v = SETTINGS.sim_speed;
    const shown = v === 0 ? '0' : v < 0.1 ? v.toFixed(2) : v.toFixed(1);
    speedDisplay.textContent = `${shown}\u00d7`;
  }
};

/**
 * Adjust simulation speed with custom stepping:
 * - From <=0.5x downward: 0.5 -> 0.3 -> 0.1 -> 0.0 (pause)
 * - From <=0.5x upward: 0.0 -> 0.1 -> 0.3 -> 0.5
 * - Above 0.5x: steps of 0.5x up to 5.0x
 */
const adjustSimSpeed = (current, direction) => {
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const epsilon = 1e-9;
  const stepsBelow = [0.0, 0.1, 0.3, 0.5]; // ascending

  // Normalize very small values to exact 0
  if (Math.abs(current) < epsilon) current = 0.0;

  // Handle <= 0.5x region with special stepping
  if (current < 0.5 - epsilon) {
    if (direction > 0) {
      for (let i = 0; i < stepsBelow.length; i++) {
        if (stepsBelow[i] > current + epsilon) return stepsBelow[i];
      }
      return 0.5;
    }
    if (direction < 0) {
      for (let i = stepsBelow.length - 1; i >= 0; i--) {
        if (stepsBelow[i] < current - epsilon) return stepsBelow[i];
      }
      return 0.0;
    }
    return current;
  }
  // If exactly ~0.5x, go up to 1.0 or down to 0.3
  if (Math.abs(current - 0.5) <= epsilon) {
    if (direction > 0) return 1.0;
    if (direction < 0) return 0.3;
    return current;
  }

  // Above 0.5x: increments of 0.5
  const next = current + (direction > 0 ? 0.5 : -0.5);
  return clamp(Number(next.toFixed(1)), 0.0, 5.0);
};

/**
 * What a captured frame should call itself.
 *
 * The scenario's translated title, or 'Sandbox' when the user has built the
 * scene by hand and there is no scenario to name. Either way the exported
 * image says which run it is a picture of, which - with the scale bar and the
 * clock beside it - is what makes it citable rather than decorative.
 *
 * @returns {string} The caption to burn into the frame
 */
const captureCaption = () => {
  const named = current_scenario_name && current_scenario_name !== 'None';
  if (!named) return t('capture.caption.sandbox');
  const title = scenarioTitle(current_scenario_name) || current_scenario_name;
  // A scenario built on a real system says where its numbers come from, and
  // when some are approximate (js/data/realSystemSources.js). Its words are a
  // small catalog of their own, loaded before the first capture
  // (ensureCaptureStrings below), so no page that never captures pays for them.
  const cited = captureStringsReady && SCENARIO_SOURCES[current_scenario_name];
  if (!cited) return title;
  const approximate =
    cited.approximate === 'all'
      ? t('capture.caption.approximate.all')
      : cited.approximate === 'some'
        ? t('capture.caption.approximate.some')
        : '';
  const sources = [cited.cites, approximate].filter(Boolean).join('; ');
  // Drawn as a second, smaller line under the title (js/sandboxTools.js).
  return `${title}\n${t('capture.caption.sources', { sources })}`;
};

/** The provenance line's words (js/i18n/en.capture.js), once loaded. */
let captureStringsReady = false;
let captureLoad = null;
/**
 * Load them, both languages, once. Never rejects: a caption without its
 * sources line is still a caption.
 * @returns {Promise<void>}
 */
const ensureCaptureStrings = () =>
  (captureLoad ??= Promise.all([
    import('./i18n/en.capture.js'),
    import('./i18n/es.capture.js'),
  ])
    .then(([en, es]) => {
      registerMessages('en', en.EN_CAPTURE);
      registerMessages('es', es.ES_CAPTURE);
      captureStringsReady = true;
    })
    .catch(() => {
      captureLoad = null;
    }));

/**
 * Take a screenshot of the current simulation
 * Combines the starfield and simulation canvases into a single image
 */
const takeScreenshot = async () => {
  await ensureCaptureStrings();
  // Ask for the provenance line - the simulated clock, the stopwatch, the
  // vector key - to be painted on the canvas, then let one frame be drawn
  // before reading the pixels back. Live, those readings are in the readout
  // panel and painting them over the simulation as well would say the same
  // thing twice; a saved image has no readout panel, so it needs them.
  // A pause-at-event stop can carry the reader's own note, and an exported
  // figure is exactly where that belongs: the picture shows the moment, the
  // note says what they were looking at.
  setCaptureMode(true, {
    caption: captureCaption(),
    note: lastEvent()?.note || '',
  });
  const capture = () => {
    try {
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;

      tempCtx.drawImage(starfieldCanvas, 0, 0);
      tempCtx.drawImage(canvas, 0, 0);

      const link = document.createElement('a');
      link.download = `gravitas-screenshot-${Date.now()}.png`;
      link.href = tempCanvas.toDataURL();
      link.click();
    } catch (error) {
      console.error('Screenshot failed:', error);
      toast(t('capture.screenshotFailed'));
    } finally {
      // A recording holds capture mode on for its whole length. A still taken
      // during one must not switch the burned-in caption and clock off in the
      // middle of the clip.
      if (isRecording()) setCaptureMode(true, { caption: captureCaption() });
      else setCaptureMode(false);
    }
  };
  // Two frames: the first is the one that repaints with the flag set, the
  // second is where it is certainly on the canvas.
  requestAnimationFrame(() => requestAnimationFrame(capture));
};

// The eight things a reader can add. The picture for each is in
// js/inspectorView.js; these once carried an emoji apiece, which the operating
// system drew - eight different pictures on three platforms, eight different
// widths, and a gemstone standing in for a white dwarf.
// =============================================================================
// Placing a body without a pointer
// -----------------------------------------------------------------------------
// All eight types could be placed by mouse and by touch, and none of them by
// keyboard. Placement needs two things a click-and-drag gives at once - where
// the body starts and how fast it is thrown - so there was nothing to hang a
// single keystroke on, and the gesture simply had no keyboard equivalent. A
// reader who cannot use a pointer could load a scenario and watch it, and could
// not add anything to it.
//
// This drives the same state the drag does. `state.adding_mass`,
// `state.add_start_world/screen` and `state.mouse` are what js/render.js reads
// to draw the placement line, the start dot and the velocity arrow, so the
// keyboard gets that preview for free and cannot drift from what a dragging
// reader sees. Committing calls placeBody(), which is the same function the
// other two paths call, with the same velocity scale as the mouse.
// =============================================================================

/** How far one arrow press moves the aim, in canvas pixels. */
const AIM_STEP = 24;
/** Shift for a bigger stride, Alt for a finer one. */
const AIM_COARSE = 4;
const AIM_FINE = 0.25;

/** Null when the keyboard is not placing anything. */
let keyboardAim = null;

/** @returns {boolean} Whether a keyboard placement is in progress */
export const keyboardPlacementActive = () => keyboardAim !== null;

/**
 * Start placing a body from the keyboard, aimed from the middle of the view.
 *
 * @returns {boolean} Whether it started
 */
export function beginKeyboardPlacement() {
  if (!placementArmed()) {
    announce(t('place.keyboard.notArmed'));
    return false;
  }
  if (keyboardAim) return true;
  // Canvas pixels, not CSS pixels. state.mouse and screen_to_world both work in
  // the backing store's coordinates, and the two have differed since the low
  // tier shipped at 0.7 - this placed the keyboard aim off-centre by the same
  // factor, and a device-pixel ratio above 1 widens the gap rather than
  // creating it. canvasPoint() converts the same way for pointer events.
  const at = { x: canvas.width / 2, y: canvas.height / 2 };
  state.add_start_screen = { ...at };
  state.add_start_world = screen_to_world(at);
  state.mouse.x = at.x;
  state.mouse.y = at.y;
  state.adding_mass = true;
  keyboardAim = { ...at };
  announce(
    t('place.keyboard.started', { type: typeName(SETTINGS.input_object_type) })
  );
  return true;
}

/** Stop without placing anything. */
export function cancelKeyboardPlacement({ quiet = false } = {}) {
  if (!keyboardAim) return false;
  keyboardAim = null;
  state.adding_mass = false;
  state.orbit_helper.preview = null;
  if (!quiet) announce(t('place.keyboard.canceled'));
  return true;
}

/**
 * Commit what is aimed.
 *
 * The velocity is the same expression the mouse path uses - the aim offset in
 * world units, times 1.5 - so a keyboard placement and a drag of the same
 * length produce the same orbit.
 *
 * @returns {?object} The body, or null
 */
export function commitKeyboardPlacement() {
  if (!keyboardAim) return null;
  const end = screen_to_world({ x: state.mouse.x, y: state.mouse.y });
  const vel = {
    x: (end.x - state.add_start_world.x) * 1.5,
    y: (end.y - state.add_start_world.y) * 1.5,
  };
  const at = { ...state.add_start_world };
  keyboardAim = null;
  state.adding_mass = false;
  state.orbit_helper.preview = null;
  const obj = placeBody(at, vel);
  if (obj) {
    announce(
      t('place.keyboard.placed', {
        type: typeName(SETTINGS.input_object_type),
        speed: Math.hypot(vel.x, vel.y).toFixed(1),
      })
    );
  }
  return obj;
}

/**
 * Move the aim, or the start point when nothing has been aimed yet.
 *
 * @param {number} dx - Horizontal, in steps
 * @param {number} dy - Vertical, in steps
 * @param {object} [opts] - {coarse, fine}
 */
function moveKeyboardAim(dx, dy, { coarse = false, fine = false } = {}) {
  if (!keyboardAim) return;
  const step = AIM_STEP * (coarse ? AIM_COARSE : fine ? AIM_FINE : 1);
  // Canvas pixels, like state.mouse, not the CSS box.
  const { width, height } = canvas;
  state.mouse.x = Math.max(0, Math.min(width, state.mouse.x + dx * step));
  state.mouse.y = Math.max(0, Math.min(height, state.mouse.y + dy * step));
}

// Its own listener, in the capture phase and before the general shortcut
// handler, because while a placement is being aimed the arrow keys belong to it
// rather than to whatever else uses them.
window.addEventListener(
  'keydown',
  e => {
    if (!keyboardAim) return;
    if (isTypingTarget(e.target)) return;
    const arrows = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    if (arrows[e.key]) {
      const [dx, dy] = arrows[e.key];
      moveKeyboardAim(dx, dy, { coarse: e.shiftKey, fine: e.altKey });
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (e.key === 'Enter') {
      commitKeyboardPlacement();
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (e.key === 'Escape') {
      cancelKeyboardPlacement();
      e.preventDefault();
      e.stopPropagation();
    }
  },
  true
);

// The keyboard equivalent of a click-and-drag placement.
//
// Registered here rather than in js/controls.js, which is where the other
// shortcuts live: controls.js is a feature module and this module is the
// coordinator, so a shortcut there that reached for beginKeyboardPlacement()
// would be an upward import - tools/check-architecture.mjs says so, and it is
// right. The shortcut registry is the seam, and it points the other way.
registerShortcut({
  keys: 'A',
  match: 'a',
  group: 'Editing',
  label: t('shortcut.placeKeyboard'),
  run: () => {
    if (keyboardPlacementActive()) commitKeyboardPlacement();
    else beginKeyboardPlacement();
  },
});

/**
 * Make one body of the armed type, at a place, with a velocity, and file it.
 *
 * The one place that knows how the eight types are built and which list each
 * belongs in. It was written out twice - once on the mouse path and once on the
 * touch path - and both copies carry a comment about the same bug: a
 * hand-placed comet went into `asteroids` and behaved as a rock, because Comet
 * extends Planet and the checks were in the wrong order. Two copies of a list
 * like that is two chances to get the order wrong again, and there is now a
 * third caller.
 *
 * The `instanceof` order below is load-bearing and is asserted in
 * tests/bodyPlacement.test.js: Comet before Planet, and every branch an
 * `else if`.
 *
 * A mass may be given and usually is not. Every constructor but BlackHole's
 * takes its own physical unit as a third argument and randomizes when handed
 * null, which is what the pointer paths do and must keep doing - so `mass`
 * defaults to null and the behaviour of a click is unchanged to the bit. The
 * precise-placement dialog is the one caller that passes a number, in the unit
 * js/place/preciseFields.js names for that type; BlackHole is the exception it
 * documents, taking simulation units, and the conversion happens at that call
 * site rather than here.
 *
 * @param {{x: number, y: number}} at - Where, in world coordinates
 * @param {{x: number, y: number}} vel - Initial velocity, world units
 * @param {string} [type] - One of the eight; defaults to what is armed
 * @param {?number} [mass] - In the type's own unit; null randomizes as a click does
 * @returns {?object} The body, already in its collection, or null
 */
export function placeBody(
  at,
  vel,
  type = SETTINGS.input_object_type,
  mass = null
) {
  if (
    !Number.isFinite(at?.x) ||
    !Number.isFinite(at?.y) ||
    !Number.isFinite(vel?.x) ||
    !Number.isFinite(vel?.y)
  ) {
    console.warn('Invalid coordinates during object placement:', { at, vel });
    return null;
  }

  const obj = constructBody(at, vel, type, mass);
  if (!obj) return null;

  // Announced rather than called directly: controls.js already imports ui.js,
  // and a direct call back would close an import cycle. The undo stack and the
  // double-tap guard both listen.
  window.dispatchEvent(
    new CustomEvent('gravitasObjectPlaced', { detail: { object: obj } })
  );
  return obj;
}

/**
 * placeBody() without the announcement, for the system builder: a toast and
 * an undo entry per body would describe placements nobody made.
 * @returns {?object} The body, already in its collection, or null
 */
function constructBody(at, vel, type, mass) {
  // null everywhere it is not given, which is exactly what each constructor's
  // own default is - so this reads as the same call it was.
  const m = Number.isFinite(mass) ? mass : null;
  // Asteroid is the one class whose third argument defaults to 1.0 rather than
  // null, so passing null would change what a click builds. It keeps its own
  // default when nobody asked.
  let obj = null;
  if (type === 'Planet') obj = new Planet(at, vel, m);
  else if (type === 'Star') obj = new StarObject(at, vel, m);
  else if (type === 'Asteroid')
    obj = m === null ? new Asteroid(at, vel) : new Asteroid(at, vel, m);
  else if (type === 'GasGiant') obj = new GasGiant(at, vel, m);
  else if (type === 'NeutronStar') obj = new NeutronStar(at, vel, m, null);
  else if (type === 'WhiteDwarf') obj = new WhiteDwarf(at, vel, m);
  else if (type === 'Comet') obj = new Comet(at, vel, m);
  else if (type === 'BlackHole') {
    // Simulation units here, not solar masses: the caller converts.
    obj = new BlackHole(
      at,
      m === null ? generateRandomBlackHoleMass() : m,
      vel,
      true
    );
  }
  if (!obj) return null;

  // NB: Comet is checked before Asteroid and Planet and lands in `comets`.
  if (obj instanceof Comet) comets.push(obj);
  else if (obj instanceof Planet) planets.push(obj);
  else if (obj instanceof StarObject) stars.push(obj);
  else if (obj instanceof Asteroid) asteroids.push(obj);
  else if (obj instanceof GasGiant) gas_giants.push(obj);
  else if (obj instanceof NeutronStar) neutron_stars.push(obj);
  else if (obj instanceof WhiteDwarf) white_dwarfs.push(obj);
  else if (obj instanceof BlackHole) bh_list.push(obj);
  return obj;
}

const objectTypes = [
  { type: 'Star', label: 'objectType.stars' },
  { type: 'Planet', label: 'objectType.rockyPlanets' },
  { type: 'GasGiant', label: 'objectType.gasGiants' },
  { type: 'Asteroid', label: 'objectType.asteroids' },
  { type: 'Comet', label: 'objectType.comets' },
  { type: 'WhiteDwarf', label: 'objectType.whiteDwarfs' },
  { type: 'NeutronStar', label: 'objectType.neutronStars' },
  { type: 'BlackHole', label: 'objectType.blackHoles' },
];

/** Singular names, for a status line or an announcement. */
const OBJECT_NAME_KEY = Object.freeze({
  Star: 'objectName.star',
  Planet: 'objectName.planet',
  GasGiant: 'objectName.gasGiant',
  Asteroid: 'objectName.asteroid',
  Comet: 'objectName.comet',
  WhiteDwarf: 'objectName.whiteDwarf',
  NeutronStar: 'objectName.neutronStar',
  BlackHole: 'objectName.blackHole',
});

/** The name of a type on its own: 'Comet', not 'Add Comets'. */
const typeName = type => t(OBJECT_NAME_KEY[type] || 'objectName.star');

/**
 * Which of the eight an object is.
 *
 * By instanceof rather than by obj_type: only four of the eight classes pass
 * an obj_type to the base constructor.
 *
 * @param {object} obj - A physics body
 * @returns {?string} A type key, or null for something not on the list
 */
const typeKeyOf = obj => {
  if (obj instanceof Comet) return 'Comet';
  if (obj instanceof Planet) return 'Planet';
  if (obj instanceof GasGiant) return 'GasGiant';
  if (obj instanceof StarObject) return 'Star';
  if (obj instanceof Asteroid) return 'Asteroid';
  if (obj instanceof NeutronStar) return 'NeutronStar';
  if (obj instanceof WhiteDwarf) return 'WhiteDwarf';
  if (obj instanceof BlackHole) return 'BlackHole';
  return null;
};

let currentTypeIndex = 0;

// Function to generate random black hole mass based on existing black holes
const generateRandomBlackHoleMass = () => {
  // Find the largest black hole mass in the simulation
  let largestMass = SETTINGS.bh_mass * SOLAR_MASS_UNIT; // Default fallback

  if (bh_list.length > 0) {
    largestMass = Math.max(...bh_list.map(bh => bh.mass));
  }

  // Convert to solar masses for easier calculation
  const largestMassInSuns = largestMass / SOLAR_MASS_UNIT;

  // Generate random mass with normal distribution centered around largest mass
  // Use a wider spread for more variety (±50% of the largest mass)
  const spread = largestMassInSuns * 0.5;
  const minMass = Math.max(1.0, largestMassInSuns - spread); // At least 1 solar mass
  const maxMass = largestMassInSuns + spread;

  // Generate random value with bias toward center (using two random numbers for normal-ish distribution)
  const random1 = Math.random();
  const random2 = Math.random();
  const normalRandom = (random1 + random2) / 2; // Rough approximation of normal distribution

  const randomMassInSuns = minMass + (maxMass - minMass) * normalRandom;
  return randomMassInSuns * SOLAR_MASS_UNIT;
};

const updateObjectTypeButton = () => {
  const btn = document.getElementById('objectTypeBtn');
  if (!btn) return; // Guard against missing button
  const currentType = objectTypes[currentTypeIndex];
  const armed = document.body.classList.contains('is-adding');
  // Armed, the caption says what the next click will do and how to stop; idle,
  // it says what the button opens. The emoji stays either way so the control
  // keeps its shape in the rail.
  // Idle, the button says what it opens rather than which type is loaded: it
  // is a picker now, and naming one of eight types on a control whose job is to
  // let you choose among them read as though that type were already committed.
  // The emoji still tracks the selection, so the current choice is visible
  // without the caption claiming to be it.
  btn.innerHTML = `${glyphMarkup(currentType.type)}<span></span>`;
  btn.querySelector('span').textContent = armed
    ? t('rail.objectType.placing')
    : t('rail.objectType.choose');
  btn.classList.toggle('is-armed', armed);
  btn.setAttribute('aria-pressed', String(armed));
  // Both captions were English regardless of locale, and the glyph is
  // aria-hidden, so armed the control has to name its type in the accessible
  // name rather than only in the picture.
  btn.title = armed
    ? t('rail.objectType.armedHint', { type: t(currentType.label) })
    : t('rail.objectType.hint');
  btn.setAttribute(
    'aria-label',
    armed
      ? t('rail.objectType.armedHint', { type: t(currentType.label) })
      : t('rail.objectType.label')
  );
  SETTINGS.input_object_type = currentType.type;
};

// --- Pointer input, and the one place CSS pixels become canvas pixels ---------
//
// The simulation canvas is laid out at 100% of the window by CSS and its
// backing store is set in js/render.js. Those were the same number until the
// low quality tier started rendering below native resolution and letting the
// compositor upscale, and from that moment a pointer event - which arrives in
// CSS pixels - stopped being a canvas coordinate.
//
// Everything downstream of here works in canvas pixels: screen_to_world reads
// canvas.width, state.mouse is drawn straight into the context, and state.pan
// is added to a world-to-screen result. So the conversion happens once, at the
// boundary, and nothing inside has to know the tier exists.
//
// getBoundingClientRect rather than innerWidth: the canvas is the thing being
// scaled, and asking it is both correct and robust to a future layout that does
// not have it filling the window.
/**
 * A pointer event in canvas coordinates.
 *
 * @param {{clientX: number, clientY: number}} e - A mouse or touch point
 * @returns {{x: number, y: number}} The same point in canvas pixels
 */
const canvasPoint = e => {
  const rect = canvas.getBoundingClientRect();
  const sx = rect.width > 0 ? canvas.width / rect.width : 1;
  const sy = rect.height > 0 ? canvas.height / rect.height : 1;
  return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
};

/**
 * A pointer *movement* in canvas pixels.
 *
 * movementX/Y are CSS pixels, and state.pan is in canvas pixels, so a drag at
 * the low tier would move the view more slowly than the cursor without this.
 *
 * @param {{movementX: number, movementY: number}} e - A mouse move
 * @returns {{x: number, y: number}} The movement in canvas pixels
 */
const canvasMovement = e => {
  const rect = canvas.getBoundingClientRect();
  const sx = rect.width > 0 ? canvas.width / rect.width : 1;
  const sy = rect.height > 0 ? canvas.height / rect.height : 1;
  return { x: e.movementX * sx, y: e.movementY * sy };
};

// Event handlers
canvas.addEventListener('mousedown', e => {
  if (e.button !== 0) return;

  // Mark that user has interacted with the page
  state.user_has_interacted = true;

  // Check if click is in UI area - improved detection with buffer zone
  const uiContainer = document.querySelector('.ui-container');
  const uiRect = uiContainer.getBoundingClientRect();
  const bufferZone = 5; // 5px buffer around UI elements

  // Check if click is within the UI container bounds (including buffer zone)
  if (
    e.clientX >= uiRect.left - bufferZone &&
    e.clientX <= uiRect.right + bufferZone &&
    e.clientY >= uiRect.top - bufferZone &&
    e.clientY <= uiRect.bottom + bufferZone
  ) {
    return;
  }

  // The measurement tools get first refusal on the press. A ruler end sitting
  // over a planet has to be grabbable, and without this the click would select
  // the planet underneath it instead - or, on empty space, start dragging a new
  // body into existence out of the handle the user meant to move.
  const pointer = canvasPoint(e);
  if (toolsPointerDown(pointer)) {
    state.isHolding = false;
    state.adding_mass = false;
    state.isDragging = false;
    return;
  }

  const worldPos = screen_to_world(pointer);
  const clickedObject = findObjectAtPosition(worldPos);

  if (clickedObject) {
    // Clicking an existing object should ONLY open inspector, never start add/hold
    state.isHolding = false;
    state.adding_mass = false;
    state.isDragging = false;
    showObjectInspector(clickedObject.object, clickedObject.type);
    return;
  }

  // Only close inspector if we clicked on empty space and inspector is open
  if (state.inspector_open && !clickedObject) {
    hideObjectInspector();
    // Do not add on this click when closing inspector
    return;
  }

  // Set before the guard below, because dragging to pan has to work whether or
  // not this press could place anything.
  state.mouse.down = true;

  // Armed placement only, and that governs the preview as well as the object.
  //
  // Without this a stray click on empty canvas - the common one being a near
  // miss on a small body whose inspector was wanted - created a mass that
  // perturbs everything already there.
  //
  // The hold state below is part of the same gate. It used to be set on every
  // press on empty sky, which meant getOrbitPreview() had a start and a current
  // point and the renderer drew its dashed launch line: a click on empty space
  // left a pair of dashes hanging in the field with no object coming and
  // nothing to explain them. A preview is a promise about what releasing the
  // mouse will do, so it must not appear when the answer is "nothing".
  if (!placementArmed()) return;

  // Begin hold for orbit preview on empty space only
  state.isHolding = true;
  state.holdStart = { ...worldPos };
  state.holdCurrent = { ...worldPos };
  // Reset sticky orbit on new hold
  state.stickyOrbit.active = false;
  state.stickyOrbit.centralId = null;
  state.stickyOrbit.snappedVel = null;

  // Validate world coordinates before proceeding
  if (
    isNaN(worldPos.x) ||
    isNaN(worldPos.y) ||
    !isFinite(worldPos.x) ||
    !isFinite(worldPos.y)
  ) {
    console.warn('Invalid world coordinates:', worldPos);
    return;
  }

  state.adding_mass = true;
  state.add_start_screen = { ...pointer };
  state.add_start_world = worldPos;
  // Start drag preview
  state.isDragging = true;
  state.dragStart = { ...worldPos };
  state.dragCurrent = { ...worldPos };
});

window.addEventListener('mousemove', e => {
  const moved = canvasPoint(e);
  state.mouse.x = moved.x;
  state.mouse.y = moved.y;
  if (toolsPointerMove(moved)) return;
  if (state.mouse.down && !state.adding_mass) {
    const delta = canvasMovement(e);
    state.pan.x += delta.x;
    state.pan.y += delta.y;
    state.cameraTouchedAt = Date.now();
  }
  if (state.adding_mass) {
    updateOrbitHelper(e.shiftKey);
    // Update drag preview current
    const worldPos = screen_to_world(moved);
    state.dragCurrent = worldPos;
    if (state.isHolding) state.holdCurrent = { ...worldPos };
  }
});

window.addEventListener('mouseup', e => {
  if (e.button !== 0) return;
  if (toolsPointerUp()) {
    state.mouse.down = false;
    return;
  }
  state.mouse.down = false;
  if (state.adding_mass) {
    state.adding_mass = false;
    state.isDragging = false;
    const add_end_world = screen_to_world(canvasPoint(e));

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
      console.warn('Invalid world coordinates during object placement:', {
        start: state.add_start_world,
        end: add_end_world,
      });
      return;
    }

    let vel = {
      x: (add_end_world.x - state.add_start_world.x) * 1.5,
      y: (add_end_world.y - state.add_start_world.y) * 1.5,
    };
    // If sticky orbit was active at release, use the snapped velocity for stable orbit
    if (state.stickyOrbit.active && state.stickyOrbit.snappedVel) {
      vel = { ...state.stickyOrbit.snappedVel };
    }
    // Snap to circular around dominant body if Shift key is held
    if (state.orbit_helper.enabled && e.shiftKey) {
      const prev = state.orbit_helper.preview;
      if (prev && prev.attractor) {
        vel = computeCircularVelocity(state.add_start_world, prev.attractor);
      }
    }
    placeBody(state.add_start_world, vel);

    // Clear helper after placement
    state.orbit_helper.preview = null;
    // Clear holding flags
    state.isHolding = false;
    state.holdStart = null;
    state.holdCurrent = null;
    // Clear sticky state after placement
    state.stickyOrbit.active = false;
    state.stickyOrbit.centralId = null;
    state.stickyOrbit.snappedVel = null;
  }
});

window.addEventListener(
  'wheel',
  e => {
    if (e.target !== canvas) return;
    e.preventDefault();

    // Use a smaller zoom factor for smoother zooming
    const zoomFactor = 1.05; // Reduced from 1.1
    const oldZoom = state.zoom;
    let newZoom = e.deltaY < 0 ? oldZoom * zoomFactor : oldZoom / zoomFactor;
    newZoom = Math.max(0.01, Math.min(newZoom, 100));

    // Get the world position at the mouse cursor (using current zoom and pan)
    const anchor = canvasPoint(e);
    const worldPos = screen_to_world(anchor);

    // Update zoom
    state.zoom = newZoom;
    state.cameraTouchedAt = Date.now();

    // Calculate where that world position should be on screen with the new zoom
    const newScreenPos = worldToScreen(worldPos, state, canvas);

    // Both in canvas pixels. Mixing the world-to-screen result with a raw
    // clientX here would anchor the zoom to the wrong point at the low tier.
    const deltaX = newScreenPos.x - anchor.x;
    const deltaY = newScreenPos.y - anchor.y;

    state.pan.x -= deltaX;
    state.pan.y -= deltaY;
  },
  { passive: false }
);

/**
 * True when a key event came from somewhere that owns the keyboard.
 *
 * Kept local rather than imported from shortcuts.js: that module is loaded by
 * controls.js, which imports this one, and a static import here would close the
 * cycle for the sake of one predicate.
 *
 * @param {EventTarget} target - Event target
 * @returns {boolean} True if the user is typing
 */
const isTypingTarget = target => {
  if (!target) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable === true
  );
};

window.addEventListener('keydown', e => {
  // Typing into a field must not also drive the simulation. This handler binds
  // bare letters, so without the guard writing a planet's name into a lesson
  // answer pans the view on W, A, S and D, pauses on space and fires a
  // screenshot on P. shortcuts.js already guards its own registry the same way;
  // this listener predates it and was never given the check.
  if (isTypingTarget(e.target)) return;
  // A modifier means the key belongs to the browser or the OS, not to us.
  if (e.metaKey || e.ctrlKey || e.altKey) return;

  const panSpeed = 40 / state.zoom;
  // Space is deliberately not here.
  //
  // It was, and js/controls.js registers it as a shortcut as well, so one press
  // ran both: this handler set paused true and the registered one set it
  // straight back. Two correct toggles, one keypress, and a space bar that did
  // nothing at all.
  //
  // The registered one is the one to keep. It resumes from a scrubbed timeline
  // before pausing and calls refreshTransport(), so the button on the transport
  // bar changes with the state - neither of which this branch did - and being
  // in the registry is also what puts it in the shortcuts overlay. The registry
  // calls preventDefault() before it runs, so the page still does not scroll.
  if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a')
    state.pan.x += panSpeed;
  else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd')
    state.pan.x -= panSpeed;
  else if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w')
    state.pan.y += panSpeed;
  else if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's')
    state.pan.y -= panSpeed;
  else if (e.key.toLowerCase() === 'home') {
    state.zoom = 1.0;
    state.pan = { x: 0, y: 0 };
    resetFollowCamera(state);
  } else if (e.key === '-' || e.key === '_') {
    SETTINGS.sim_speed = adjustSimSpeed(SETTINGS.sim_speed, -1);
    updateSpeedDisplay();
  } else if (e.key === '=' || e.key === '+') {
    SETTINGS.sim_speed = adjustSimSpeed(SETTINGS.sim_speed, +1);
    updateSpeedDisplay();
  } else if (e.key.toLowerCase() === 'p') {
    takeScreenshot();
  } else if (e.key === 'Escape') {
    debugLog('Escape key pressed, inspector_open:', state.inspector_open);
    if (state.inspector_open) {
      hideObjectInspector();
    }
  }
});

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

/**
 * Point a button that is an icon and a label at another icon and message.
 *
 * The label is a span carrying data-i18n, so moving the id as well as the
 * text keeps a language change mid-recording on the right words; textContent
 * on the button itself would have erased the icon.
 * @param {HTMLElement} btn - The button
 * @param {string} icon - A name from css/icons.css, without the icon- prefix
 * @param {string} id - The message the label should carry
 */
const setIconLabel = (btn, icon, id) => {
  btn.querySelector('.icon')?.setAttribute('class', `icon icon-${icon}`);
  const label = btn.querySelector('[data-i18n]') || btn;
  if (label !== btn) label.dataset.i18n = id;
  label.textContent = t(id);
};

// Demo mode functionality
let demoModeInterval = null;
let demoModeActive = false;
let demoScenarios = Object.keys(SCENARIO_INFO).filter(key => key !== 'None');
let currentDemoIndex = 0;

const startDemoMode = () => {
  if (demoModeActive) return;

  demoModeActive = true;
  const demoBtn = document.getElementById('demoModeBtn');
  demoBtn.classList.add('active');
  setIconLabel(demoBtn, 'stop', 'settings.demoMode.stop');

  // Start with a random scenario
  currentDemoIndex = Math.floor(Math.random() * demoScenarios.length);

  const cycleScenario = () => {
    if (!demoModeActive) return;

    const scenario = demoScenarios[currentDemoIndex];
    SETTINGS.preset_scenario = scenario;
    initialize_simulation();
    state.paused = false;
    show_enhanced_scenario_info(scenario);
    updateSpeedDisplay();

    // Move to next scenario (randomly)
    currentDemoIndex = Math.floor(Math.random() * demoScenarios.length);
  };

  // Start cycling every 20 seconds
  demoModeInterval = setInterval(cycleScenario, 20000);

  // Start immediately
  cycleScenario();
};

const stopDemoMode = () => {
  if (!demoModeActive) return;

  demoModeActive = false;
  const demoBtn = document.getElementById('demoModeBtn');
  demoBtn.classList.remove('active');
  setIconLabel(demoBtn, 'clapper', 'settings.demoMode');

  if (demoModeInterval) {
    clearInterval(demoModeInterval);
    demoModeInterval = null;
  }
};

document.getElementById('demoModeBtn').onclick = () => {
  if (demoModeActive) {
    stopDemoMode();
  } else {
    startDemoMode();
  }
};

// Cleanup demo mode on page unload
window.addEventListener('beforeunload', () => {
  if (demoModeActive) {
    stopDemoMode();
  }
});

// BH Masses Modal event handlers
document.getElementById('bhMassesDone').onclick = () =>
  hideBHMassesModal('done');
document.getElementById('bhMassesCloseChip').onclick = () =>
  hideBHMassesModal('cancel');

// Speed control functionality
document.getElementById('slowDownBtn').onclick = () => {
  SETTINGS.sim_speed = adjustSimSpeed(SETTINGS.sim_speed, -1);
  updateSpeedDisplay();
};

document.getElementById('speedUpBtn').onclick = () => {
  SETTINGS.sim_speed = adjustSimSpeed(SETTINGS.sim_speed, +1);
  updateSpeedDisplay();
};

// Reset view functionality - improved to center on main objects
document.getElementById('resetViewBtn').onclick = () => {
  // Collect all objects to find the center of mass
  const allObjects = [
    ...bh_list,
    ...stars,
    ...neutron_stars,
    ...white_dwarfs,
    ...gas_giants,
    ...planets,
    ...asteroids,
    // Comets belong here for the same reason asteroids do: they are bodies a
    // reader placed or a scenario built, and a view that frames everything
    // except them frames the wrong thing. Debris and particles stay out - they
    // are ejecta, they scatter, and including them would zoom the view out to
    // fit a spray of fragments.
    ...comets,
  ].filter(obj => obj.alive);

  if (allObjects.length > 0) {
    // Calculate center of mass
    let totalMass = 0;
    let centerX = 0;
    let centerY = 0;

    for (const obj of allObjects) {
      totalMass += obj.mass;
      centerX += obj.pos.x * obj.mass;
      centerY += obj.pos.y * obj.mass;
    }

    if (totalMass > 0) {
      centerX /= totalMass;
      centerY /= totalMass;
    }

    // Calculate bounds to determine appropriate zoom level
    let minX = Infinity,
      maxX = -Infinity;
    let minY = Infinity,
      maxY = -Infinity;

    for (const obj of allObjects) {
      minX = Math.min(minX, obj.pos.x);
      maxX = Math.max(maxX, obj.pos.x);
      minY = Math.min(minY, obj.pos.y);
      maxY = Math.max(maxY, obj.pos.y);
    }

    // Add some padding around the objects
    const padding = 50;
    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;

    // Calculate zoom to fit all objects on screen
    const zoomX = canvas.width / width;
    const zoomY = canvas.height / height;
    const newZoom = Math.min(zoomX, zoomY, 2.0); // Cap zoom at 2.0x

    // Set the view to center on the objects
    state.zoom = Math.max(0.1, newZoom);
    state.pan.x = -centerX * state.zoom;
    state.pan.y = centerY * state.zoom;
  } else {
    // Fallback to default view if no objects
    state.zoom = 1.0;
    state.pan = { x: 0.0, y: 0.0 };
  }
  // Reset view is a command, not a drag. Without this, Follow mode's next step
  // would measure the difference it just made and fold it into the very offset
  // this button exists to clear.
  resetFollowCamera(state);
};

// Screenshot functionality
document.getElementById('screenshotBtn').onclick = takeScreenshot;

// --- Clip recording -----------------------------------------------------------
//
// A screenshot documents a moment and most of what this simulation shows is
// motion, so the same Capture group also records a stretch of the run to a
// video file. The recorder itself - the compositing, the container choice, the
// byte and time budgets - is in js/capture.js; what is here is the button, the
// indicator and the save, which are the parts that have to know about this
// page.
//
// js/capture.js is fetched on the first press of the button. Most visits never
// record, and it was 11 KB and a request of every start-up. Until it is here
// nothing is recording, which is all the rest of this module asks of it.

/** js/capture.js, once the record button has fetched it. */
let recorder = null;
function isRecording() {
  return Boolean(recorder?.isRecording());
}

const recordBtn = document.getElementById('recordBtn');
const recordingBadge = document.getElementById('recordingBadge');
const recordingReadout = document.getElementById('recordingReadout');

/** mm:ss, for the indicator. @param {number} s - Seconds @returns {string} */
const clockText = s => {
  const whole = Math.max(0, Math.floor(s));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
};

/**
 * Paint the button and the indicator from the recorder's own counters, so the
 * two can never disagree with what is actually being written.
 * @param {object|null} status - recordingStatus(), or null when idle
 */
const paintRecordingState = status => {
  const on = Boolean(status?.recording);
  if (recordBtn) {
    recordBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    setIconLabel(
      recordBtn,
      on ? 'stop' : 'video',
      on ? 'rail.record.stop' : 'rail.record'
    );
    recordBtn.title = on ? t('rail.record.stop.hint') : t('rail.record.hint');
  }
  if (!recordingBadge || !recordingReadout) return;
  recordingBadge.hidden = !on;
  if (!on) {
    recordingBadge.removeAttribute('data-nearly');
    return;
  }
  const mb = status.bytes / (1024 * 1024);
  const capMb = status.maxBytes / (1024 * 1024);
  recordingReadout.textContent = `REC ${clockText(status.seconds)}  ${mb.toFixed(0)}/${capMb.toFixed(0)} MB`;
  // Within a tenth of either budget the recording is about to stop itself,
  // which is worth a color rather than a surprise.
  const nearly =
    status.seconds > status.maxSeconds * 0.9 ||
    status.bytes > status.maxBytes * 0.9;
  if (nearly) recordingBadge.setAttribute('data-nearly', 'true');
  else recordingBadge.removeAttribute('data-nearly');
};

/**
 * Save a finished clip, and say why it ended when it was not the user who
 * ended it.
 * @param {Blob|null} blob - The assembled recording
 * @param {object} meta - {reason, seconds, bytes, type}
 */
const saveRecording = (blob, meta) => {
  setCaptureMode(false);
  paintRecordingState(null);
  if (!blob || !blob.size) {
    toast(t('capture.record.failed'));
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `gravitas-clip-${Date.now()}.${recorder.extensionFor(meta.type)}`;
  link.href = url;
  link.click();
  // The Blob is the last thing holding the recording; the URL keeps it alive
  // until it is revoked, so it is revoked as soon as the download has taken
  // its reference.
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  const mb = (meta.bytes / (1024 * 1024)).toFixed(1);
  if (meta.reason === 'size') toast(t('capture.record.cappedSize', { mb }));
  else if (meta.reason === 'duration')
    toast(t('capture.record.cappedTime', { mb }));
  else toast(t('capture.record.saved', { s: clockText(meta.seconds), mb }));
};

const toggleRecording = async () => {
  try {
    recorder ??= await import('./capture.js');
  } catch {
    toast(t('capture.record.failed'));
    return;
  }
  if (isRecording()) {
    recorder.stopRecording('user');
    return;
  }
  // The clip carries the same provenance a still does: the scenario title, the
  // scale bar and the simulated clock, burned in for every frame of it.
  await ensureCaptureStrings();
  setCaptureMode(true, { caption: captureCaption() });
  const started = recorder.startRecording({
    sources: [starfieldCanvas, canvas],
    onTick: status => {
      // Re-read the caption rather than holding the one the take started with:
      // a lecturer who loads a second scenario mid-clip would otherwise have
      // the rest of the recording labeled with the first one's name.
      setCaptureMode(true, { caption: captureCaption() });
      paintRecordingState(status);
    },
    onStop: saveRecording,
  });
  if (!started) {
    setCaptureMode(false);
    toast(t('capture.record.unsupported'));
    return;
  }
  paintRecordingState(recorder.recordingStatus());
};

if (recordBtn) {
  // Nothing to offer where MediaRecorder or captureStream is missing: a button
  // that can only apologize is worse than no button.
  if (!canRecordClips()) recordBtn.hidden = true;
  else recordBtn.onclick = toggleRecording;
}

// A language change rewrites every data-i18n element from its key, which would
// put "Record Clip" back on a button that is currently recording.
onLocaleChange(() => {
  if (isRecording()) paintRecordingState(recorder.recordingStatus());
});

// Leaving the page mid-take releases the encoder and the chunks it is holding.
// The file is lost - a download cannot be started from a page that is going
// away - but a take that is abandoned should not also leave a recorder running
// against a canvas that is about to be torn down.
window.addEventListener('pagehide', () => {
  if (isRecording()) recorder.stopRecording('user');
});

// --- Measurement tools --------------------------------------------------------
//
// The buttons only toggle state; every tool draws itself from the render loop
// and reads the world through the same transform the bodies are drawn with. See
// js/sandboxTools.js for why the handles are stored in world coordinates.

const stopwatchControls = document.getElementById('stopwatchControls');
const stopwatchLatchBtn = document.getElementById('stopwatchLatch');

/** Push the tools' state back onto their buttons. */
const syncToolButtons = () => {
  const pairs = [
    ['toggleRuler', 'ruler'],
    ['toggleProtractor', 'protractor'],
    ['toggleStopwatch', 'stopwatch'],
  ];
  for (const [id, name] of pairs) {
    const el = document.getElementById(id);
    if (el) el.setAttribute('aria-pressed', String(isToolActive(name)));
  }
  if (stopwatchControls) stopwatchControls.hidden = !isToolActive('stopwatch');
  if (stopwatchLatchBtn) {
    stopwatchLatchBtn.setAttribute('aria-pressed', String(!!stopwatchTarget()));
  }
};

const wireToolToggle = (id, name) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.onclick = () => {
    toggleTool(name, canvas);
    syncToolButtons();
  };
};
wireToolToggle('toggleRuler', 'ruler');
wireToolToggle('toggleProtractor', 'protractor');
wireToolToggle('toggleStopwatch', 'stopwatch');

const wireStopwatch = (id, fn) => {
  const el = document.getElementById(id);
  if (el) {
    el.onclick = () => {
      fn();
      syncToolButtons();
    };
  }
};
wireStopwatch('stopwatchMark', () => {
  // A manual mark takes the clock off the latch: the two would otherwise both
  // be resetting the same interval and the reading would be whichever fired
  // last, which is not a measurement of anything.
  latchStopwatchTo(null);
  stopwatch().mark();
});
wireStopwatch('stopwatchStop', () => stopwatch().stop());
wireStopwatch('stopwatchReset', () => {
  latchStopwatchTo(null);
  stopwatch().reset();
});
wireStopwatch('stopwatchLatch', () => {
  if (stopwatchTarget()) {
    latchStopwatchTo(null);
    stopwatch().reset();
    return;
  }
  const selected = state.selectedObject && state.selectedObject.object;
  if (!selected) {
    toast(t('stopwatch.needBody'));
    return;
  }
  stopwatch().reset();
  latchStopwatchTo(selected);
});
syncToolButtons();

// --- Choosing what to add, and meaning to add it -----------------------------
//
// This button used to cycle: one click advanced to the next of eight types and
// left-click on the canvas placed one immediately. Two things were wrong with
// that.
//
// Reaching a type took up to seven clicks with no way to see the list, and the
// only feedback was the button's own caption changing.
//
// Worse, placement was always live. A click on empty canvas added a body, so
// aiming at a small planet to open its inspector and missing by a few pixels
// created a star instead - in a simulation where an unwanted mass perturbs
// everything else immediately. Touch never had this problem: a finger has to
// long-press to arm placement, because a single touch had to stay free for
// panning. The mouse now works the way touch already did.
//
// So: the button opens a picker, choosing a type arms placement, and only then
// does a click on empty space place anything. Escape disarms, as does clicking
// the button again or placing with `add_once` set. The armed state is UI state
// and deliberately not a setting - it is not carried in a share link, and a
// rebuilt world starts disarmed.
const objectPicker = document.getElementById('objectTypePicker');
const objectAddWrap = document.getElementById('objectAdd');

// The picker is moved out of the rail and parented to <body>.
//
// It is written inside `.object-add` in index.html, which is where it belongs
// semantically and where a reader of the markup expects it. It cannot stay
// there at run time: `.ui-container` scrolls its own overflow, and an overflow
// container clips absolutely positioned descendants, so the popover was cut off
// whenever the rail was scrolled or the window was short. Reparenting once at
// start-up - rather than on every open - keeps the DOM stable, keeps focus
// order predictable, and means nothing has to be un-done on close.
//
// `aria-controls`, `aria-labelledby` and `aria-expanded` are all id-based, so
// none of them cares where the element lives.
if (objectPicker && document.body) document.body.appendChild(objectPicker);

/** Gap between the trigger and the popover, and from the viewport edge, in px. */
const PICKER_GAP = 8;

/** Below this, a side is too shallow to be worth opening into. */
const PICKER_MIN_USABLE = 140;

/**
 * Put the open picker beside its trigger, inside the viewport.
 *
 * Measured from the trigger's getBoundingClientRect() every time, because the
 * trigger moves: the rail scrolls, the window resizes, a phone rotates, and on
 * a narrow layout the rail slides in and out. Flips above or below depending on
 * which side has room, and caps its height so a long list scrolls internally
 * instead of running off the screen.
 */
const positionObjectPicker = () => {
  const btn = document.getElementById('objectTypeBtn');
  if (!objectPicker || objectPicker.hidden || !btn) return;

  const rect = btn.getBoundingClientRect();
  // clientWidth/clientHeight rather than innerWidth/innerHeight: these exclude
  // a classic scrollbar, which is the difference between "inside the viewport"
  // and "under the scrollbar" on a desktop browser that has one.
  const vw = document.documentElement.clientWidth || window.innerWidth;
  const vh = document.documentElement.clientHeight || window.innerHeight;

  const above = rect.top - PICKER_GAP;
  const below = vh - rect.bottom - PICKER_GAP;

  // Measure unconstrained first: how tall it wants to be decides which side it
  // can use, and a max-height left over from the last placement would answer
  // the wrong question.
  objectPicker.style.maxHeight = 'none';
  const natural = objectPicker.offsetHeight;

  // Above by preference - that is where it has always opened, and the button
  // sits low in the rail - unless it fits below and does not fit above.
  const openUp = natural <= above || above >= below;
  const side = Math.max(0, openUp ? above : below);
  // On a viewport too short for either side, stop trying to dodge the trigger
  // and use the whole window: overlapping the button is a great deal better
  // than a popover the reader cannot see or scroll.
  // Never taller than the viewport, whichever side it opens into. The side
  // measurement alone is not enough: the trigger can be scrolled out of the
  // rail's visible box, in which case its rect reports a position below the
  // window and "the space above it" is larger than the window is.
  const viewportCap = Math.max(0, vh - PICKER_GAP * 2);
  const cap = Math.min(
    side >= PICKER_MIN_USABLE ? side : viewportCap,
    viewportCap
  );
  objectPicker.style.maxHeight = `${Math.round(cap)}px`;

  const height = objectPicker.offsetHeight;
  const width = objectPicker.offsetWidth;

  const left = Math.min(
    Math.max(PICKER_GAP, rect.left),
    Math.max(PICKER_GAP, vw - width - PICKER_GAP)
  );
  let top = openUp ? rect.top - PICKER_GAP - height : rect.bottom + PICKER_GAP;
  top = Math.min(
    Math.max(PICKER_GAP, top),
    Math.max(PICKER_GAP, vh - height - PICKER_GAP)
  );

  objectPicker.style.left = `${Math.round(left)}px`;
  objectPicker.style.top = `${Math.round(top)}px`;
};

/** Is placement currently armed, and with which type. */
let addArmed = false;

/** True while the picker is on screen. */
/**
 * The precise-placement form, fetched the first time somebody asks for it.
 *
 * Deferred for the same reason the dialog machinery is: it is not start-up
 * code, and the bundle it would otherwise sit in has very little room left.
 * placeBody is handed down rather than imported by the module, because a
 * feature module importing this coordinator back is the shape
 * tools/check-architecture.mjs exists to refuse.
 */
let precisePlacementModule = null;
async function openPrecisePlacementDialog(trigger) {
  precisePlacementModule ??= await import('./precisePlacement.js');
  await precisePlacementModule.openPrecisePlacement({ placeBody, trigger });
}

document.getElementById('precisePlaceBtn')?.addEventListener('click', event => {
  openPrecisePlacementDialog(event.currentTarget);
});

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

const objectPickerOpen = () => Boolean(objectPicker && !objectPicker.hidden);

const closeObjectPicker = () => {
  if (!objectPicker) return;
  objectPicker.hidden = true;
  document
    .getElementById('objectTypeBtn')
    ?.setAttribute('aria-expanded', 'false');
};

/**
 * Close the narrow-screen rail, now that the reader has chosen something.
 *
 * The rail's own "any button dismisses me" rule no longer fires for
 * `#objectTypeBtn`, because that button opens a menu rather than running a
 * command. Choosing from that menu is the command, so this is where the
 * dismissal moved to. It reads the DOM rather than closing over the rail's own
 * helper because that helper is defined a few hundred lines further down, with
 * the rest of the narrow-screen menu.
 *
 * A no-op on a wide screen: the rail is not in the `is-open` state there.
 */
const dismissRailAfterChoice = () => {
  const rail = document.querySelector('.ui-container');
  if (!rail || !rail.classList.contains('is-open')) return;
  rail.classList.remove('is-open');
  const toggle = document.getElementById('mobileMenuToggle');
  if (toggle) {
    toggle.classList.remove('active');
    toggle.setAttribute('aria-expanded', 'false');
  }
};

// The trigger moves with the rail and with the window, so the popover follows
// it. `true` on the scroll listener is the capture phase: the rail is the
// element that actually scrolls, and a scroll event on it does not bubble.
const repositionIfOpen = () => {
  if (objectPickerOpen()) positionObjectPicker();
};
window.addEventListener('resize', repositionIfOpen);
window.addEventListener('orientationchange', repositionIfOpen);
window.addEventListener('scroll', repositionIfOpen, true);

/**
 * Arm or disarm placement.
 *
 * @param {boolean} on - Whether a click on empty canvas should place a body
 */
const setAddArmed = on => {
  // A lesson that locks the world sets interactive_add to false; arming has to
  // respect that rather than route around it.
  addArmed = Boolean(on) && SETTINGS.interactive_add !== false;
  document.body.classList.toggle('is-adding', addArmed);
  if (!addArmed) {
    state.adding_mass = false;
    state.isDragging = false;
    state.isHolding = false;
  }
  updateObjectTypeButton();
  syncPlacementStatus();
};

/** Whether a press on empty canvas should create something. */
const placementArmed = () => addArmed && SETTINGS.interactive_add !== false;

/**
 * Keep the on-canvas placement status matching whether placement is armed.
 *
 * The rail's button already changes when a type is chosen, but on a narrow
 * screen the rail dismisses itself the moment the choice is made, and on a wide
 * one the button is in the far corner from where the reader is about to click.
 * Either way the canvas itself said nothing about being armed, and the next
 * tap made a black hole.
 */
// The bar it is measured against moves with the window.
window.addEventListener('resize', () => positionPlacementStatus());
window.addEventListener('orientationchange', () => positionPlacementStatus());

// The status carries a translated type name, so it is rebuilt when the reader
// changes language mid-placement rather than being left in the old one.
onLocaleChange(() => syncPlacementStatus());

function syncPlacementStatus() {
  const el = document.getElementById('placementStatus');
  if (!el) return;
  const armed = placementArmed();
  el.hidden = !armed;
  if (!armed) return;
  const type = objectTypes[currentTypeIndex].type;
  const glyph = el.querySelector('.placement-status-glyph');
  if (glyph) glyph.innerHTML = glyphMarkup(type);
  const name = el.querySelector('.placement-status-type');
  if (name) name.textContent = typeName(type);
  positionPlacementStatus();
}

/** How far the status sits from whatever is below it. */
const STATUS_GAP = 8;

/**
 * Put the status above the transport bar, by measuring the bar.
 *
 * A CSS offset cannot do this. The bar's own distance from the bottom is not
 * one number - it changes at the tablet breakpoint and again in an embed - and
 * a status positioned from a guessed constant overlapped the bar by twenty
 * pixels at 768x1024, which is precisely the kind of thing this pass exists to
 * stop doing. So it is measured, the way the object picker is.
 *
 * If there is no room above the bar - a very short window, a lecture display
 * scaled down - the status goes to the top edge instead of on top of the
 * controls.
 */
function positionPlacementStatus() {
  const el = document.getElementById('placementStatus');
  if (!el || el.hidden) return;

  const vh = window.innerHeight || 0;
  const bar = document.getElementById('timelineBar');
  const barRect = bar?.getBoundingClientRect();
  const floor = barRect && barRect.height > 0 ? barRect.top : vh;

  el.style.top = '';
  el.style.bottom = `${Math.max(STATUS_GAP, vh - floor + STATUS_GAP)}px`;

  // Would it be off the top? Then there is no room above the bar, and the top
  // edge is the one place left that is neither a control nor the cursor.
  const rect = el.getBoundingClientRect();
  if (rect.top < STATUS_GAP) {
    el.style.bottom = 'auto';
    el.style.top = `${STATUS_GAP}px`;
  }
}

/**
 * Match the add control to whether placement is allowed at all.
 *
 * Exported for the lesson runner. A step that locks placement clears
 * interactive_add, and placementArmed() honors that on its own - but the
 * crosshair and the lit button would go on promising a click that now does
 * nothing, and the picker would still open, over the lesson panel it is
 * anchored beside on a narrow window. Disabling the button says the same thing
 * once, in the place the reader is looking.
 */
const syncPlacementAvailability = () => {
  const locked = SETTINGS.interactive_add === false;
  const btn = document.getElementById('objectTypeBtn');
  if (btn) {
    btn.disabled = locked;
    btn.setAttribute('aria-disabled', String(locked));
  }
  if (locked) {
    closeObjectPicker();
    setAddArmed(false);
  }
};

const buildObjectPicker = () => {
  if (!objectPicker) return;
  objectPicker.innerHTML = '';

  const list = document.createElement('div');
  list.className = 'object-picker-grid';
  objectTypes.forEach((entry, index) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'object-picker-item';
    item.setAttribute('role', 'menuitemradio');
    item.setAttribute(
      'aria-checked',
      String(index === currentTypeIndex && addArmed)
    );
    item.dataset.objectType = entry.type;
    // The glyph is our own constant markup; the name is a translated string and
    // goes in as text.
    item.innerHTML = `${glyphMarkup(entry.type)}<span class="object-picker-name"></span>`;
    item.querySelector('.object-picker-name').textContent = t(entry.label);
    item.onclick = () => {
      currentTypeIndex = index;
      setAddArmed(true);
      closeObjectPicker();
      // Narrow screens only, and only now that a choice has been made: the
      // canvas is what the reader needs next, and the rail is covering it.
      dismissRailAfterChoice();
      // Choosing with the keyboard used to drop focus onto <body>, because the
      // item that had it was inside the popover that just closed. Escape
      // already gave focus back; a choice has to as well - and only when the
      // trigger is still on screen, which on a narrow window it is not.
      const trigger = document.getElementById('objectTypeBtn');
      if (trigger && trigger.offsetParent !== null) trigger.focus();
    };
    list.appendChild(item);
  });
  objectPicker.appendChild(list);

  const stop = document.createElement('button');
  stop.type = 'button';
  stop.className = 'object-picker-stop';
  stop.setAttribute('role', 'menuitem');
  stop.textContent = t('rail.objectType.stop');
  stop.onclick = () => {
    setAddArmed(false);
    closeObjectPicker();
    dismissRailAfterChoice();
  };
  objectPicker.appendChild(stop);
};

document.getElementById('objectTypeBtn').onclick = event => {
  event.stopPropagation();
  if (!objectPicker) return;
  // Armed already: the button is the off switch, so a reader who armed by
  // accident can undo it with the control they just used.
  if (addArmed) {
    setAddArmed(false);
    closeObjectPicker();
    return;
  }
  const opening = objectPicker.hidden;
  if (opening) buildObjectPicker();
  objectPicker.hidden = !opening;
  document
    .getElementById('objectTypeBtn')
    ?.setAttribute('aria-expanded', String(opening));
  if (opening) {
    // Placed before focus: focusing an item inside a popover that is still at
    // its last position scrolls the page to wherever that was.
    positionObjectPicker();
    objectPicker.querySelector('.object-picker-item')?.focus();
  }
};

document.addEventListener('click', event => {
  if (!objectPickerOpen()) return;
  // Two containers now, because the popover is no longer inside the rail: a
  // click on the trigger is handled above, and a click inside the popover is a
  // choice, not an outside click.
  if (objectAddWrap?.contains(event.target)) return;
  if (objectPicker.contains(event.target)) return;
  closeObjectPicker();
});

/**
 * Arrow keys inside the picker.
 *
 * It carries role="menu" and its rows carry role="menuitemradio", which is a
 * promise that Up and Down move between them. Tab still works and still leaves
 * the popover, which is what a reader who wants out expects; this only adds
 * the movement the roles advertise.
 */
if (objectPicker) {
  objectPicker.addEventListener('keydown', event => {
    const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End'];
    if (!keys.includes(event.key)) return;
    const items = [
      ...objectPicker.querySelectorAll(
        '.object-picker-item, .object-picker-stop'
      ),
    ];
    if (!items.length) return;
    const at = items.indexOf(document.activeElement);
    let next;
    if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = items.length - 1;
    else if (event.key === 'ArrowDown')
      next = at < 0 ? 0 : (at + 1) % items.length;
    else
      next = at < 0 ? items.length - 1 : (at - 1 + items.length) % items.length;
    event.preventDefault();
    items[next].focus();
  });
}

// Capture phase, and it stops the event when it handles it.
//
// Escape is also a registered shortcut, and that shortcut broadcasts
// `gravitasEscape`, which among other things closes the narrow-screen rail. In
// the bubble phase both ran: the picker closed and returned focus to its
// trigger, and the rail then closed around that trigger, leaving the focus on
// an element the reader cannot see or reach. Escape should close the topmost
// thing and stop there, and while this popover is open, it is the topmost
// thing.
document.addEventListener(
  'keydown',
  event => {
    if (event.key !== 'Escape') return;
    if (objectPickerOpen()) {
      closeObjectPicker();
      document.getElementById('objectTypeBtn')?.focus();
      event.stopPropagation();
      event.preventDefault();
      return;
    }
    // Disarming does not swallow the key: nothing is on screen to dismiss, and
    // a reader pressing Escape with a panel open as well means both.
    if (addArmed) setAddArmed(false);
  },
  true
);

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
    if (objectPicker && objectPicker.contains(e.target)) return;
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
