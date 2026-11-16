// =============================================================================
// Controls: the transport bar, view menu, shortcuts and placement undo
// -----------------------------------------------------------------------------
// New chrome lives here rather than growing ui.js. Everything is built from
// markup already present in index.html; nothing is injected blind.
// =============================================================================

import {
  bh_list,
  planets,
  stars,
  gas_giants,
  asteroids,
  comets,
  neutron_stars,
  white_dwarfs,
  clearObjectEnergyHistory,
  DT,
} from './physics.js';
import {
  state,
  SETTINGS,
  current_scenario_name,
  command,
  releaseHold,
} from './appState.js';
import { resetFollowCamera } from './followCamera.js';
import { ensurePauseAtEvent, renderEventMarker } from './pauseAtEventBridge.js';
import { toast, announce, loadFailed } from './notify.js';
export { toast, announce };
import {
  tickTimeline,
  scrubTo,
  stepBack,
  stepForward,
  returnToLive,
  rewindToHere,
  startReplay,
  isScrubbing,
  isReplaying,
  bindTimelineUI,
  resetTimeline,
  getFrameCount,
} from './timeline.js';
import { STEP_SECONDS, frameAdvance } from './timestep.js';
import {
  initUnits,
  toggleUnitMode,
  getUnitMode,
  unitModeLabel,
  formatTime,
} from './units.js';
import { initTheme, cycleTheme, themeLabel } from './theme.js';
import { t } from './i18n/index.js';
import { scenarioTitle } from './i18n/scenario.js';
import { setSonificationMuted, getSonificationState } from './audio.js';
import {
  initShortcuts,
  registerShortcut,
  toggleShortcutHelp,
  hideShortcutHelp,
  isShortcutHelpOpen,
} from './shortcuts.js';
import {
  EV_ESCAPE,
  EV_OBJECT_PLACED,
  EV_PLACEMENT_ARMED,
  EV_SELECTION_CLEARED,
  EV_SIMULATION_RESET,
  EV_SPEED_CHANGED,
  EV_STOP_SIGNAL_AUDIO,
  EV_UNITS_CHANGED,
  KEY_RAIL_SECTIONS,
} from './names.js';

// --- Placement undo -----------------------------------------------------------
// Only user-placed objects are undoable. Simulation-created bodies (merger
// products, collapse remnants) are not: undoing those would mean rewriting
// history, which is what the timeline is for.
const placementStack = [];
const MAX_UNDO = 50;

const LIST_FOR = obj => {
  if (comets.includes(obj)) return comets;
  if (planets.includes(obj)) return planets;
  if (stars.includes(obj)) return stars;
  if (gas_giants.includes(obj)) return gas_giants;
  if (asteroids.includes(obj)) return asteroids;
  if (neutron_stars.includes(obj)) return neutron_stars;
  if (white_dwarfs.includes(obj)) return white_dwarfs;
  if (bh_list.includes(obj)) return bh_list;
  return null;
};

/**
 * Remember a hand-placed object so it can be undone.
 * @param {Object} obj - The newly created physics object
 */
export function recordPlacement(obj) {
  placementStack.push(obj);
  if (placementStack.length > MAX_UNDO) placementStack.shift();
  refreshUndoButton();
}

/**
 * Remove the most recently placed object.
 * @returns {boolean} True if something was undone
 */
export function undoPlacement() {
  while (placementStack.length) {
    const obj = placementStack.pop();
    const list = LIST_FOR(obj);
    if (!list) continue; // already destroyed by the simulation
    const i = list.indexOf(obj);
    if (i === -1) continue;
    list.splice(i, 1);
    obj.alive = false;
    clearObjectEnergyHistory(obj.id);
    if (state.selectedObject && state.selectedObject.object === obj) {
      window.dispatchEvent(new CustomEvent(EV_SELECTION_CLEARED));
    }
    refreshUndoButton();
    toast(t('toast.undo.removed'));
    return true;
  }
  refreshUndoButton();
  toast(t('toast.undo.nothing'));
  return false;
}

/** Drop the undo stack: called when the simulation is rebuilt. */
export function clearPlacementHistory() {
  placementStack.length = 0;
  refreshUndoButton();
}

function refreshUndoButton() {
  const btn = document.getElementById('undoBtn');
  if (btn) btn.disabled = placementStack.length === 0;
}

// --- Transport bar ------------------------------------------------------------
const stepOnce = command('stepOnce');
let scrubberEl = null;
let timeLabelEl = null;
let playBtn = null;
let liveBtn = null;
let auxEl = null;
let stepSizeEl = null;
let replayBtn = null;
let rewindBtn = null;
let userDraggingScrubber = false;
let lastClock = NaN;
let lastKey = '';

function setupTransport() {
  scrubberEl = document.getElementById('timelineScrubber');
  timeLabelEl = document.getElementById('timelineTime');
  playBtn = document.getElementById('timelinePlay');
  liveBtn = document.getElementById('timelineLive');
  auxEl = document.getElementById('timelineAux');
  stepSizeEl = document.getElementById('timelineStepSize');
  replayBtn = document.getElementById('timelineReplay');
  rewindBtn = document.getElementById('timelineRewind');

  if (!scrubberEl) return;

  scrubberEl.addEventListener('pointerdown', () => {
    userDraggingScrubber = true;
  });
  const release = () => {
    userDraggingScrubber = false;
  };
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);

  scrubberEl.addEventListener('input', () => {
    const frames = getFrameCount();
    if (frames < 2) return;
    // Slider runs oldest (0) → newest (max); the timeline counts backwards.
    const offset = Number(scrubberEl.max) - scrubberEl.valueAsNumber;
    scrubTo(offset);
  });
  // Said where the reader lands, not on every pixel of a drag.
  scrubberEl.addEventListener('change', () =>
    announce(scrubberEl.getAttribute('aria-valuetext'), false)
  );

  // Looking back, Play is Return to live (the pause state it left comes back).
  playBtn?.addEventListener('click', togglePlay);
  liveBtn?.addEventListener('click', goLive);
  replayBtn?.addEventListener('click', startReplay);
  rewindBtn?.addEventListener('click', rewindHere);
  document
    .getElementById('timelineStepBack')
    ?.addEventListener('click', stepBack);
  document
    .getElementById('timelineStepFwd')
    ?.addEventListener('click', stepForwardOrOne);
  bindTimelineUI({ onChange: onTimelineChange, onClock: paintClock });
}

function togglePlay() {
  if (isScrubbing()) returnToLive();
  else state.paused = !state.paused;
  releaseHold();
  refreshTransport();
}

function goLive() {
  returnToLive();
  refreshTransport();
}

function rewindHere() {
  rewindToHere();
  toast(t('transport.rewind.hint'));
  refreshTransport();
}

/** One step when paused and live, one recorded frame when looking back. */
function stepForwardOrOne() {
  if (isScrubbing()) stepForward();
  else if (state.paused) stepOnce();
}

/** Each live frame: the label follows the clock; so do the pause and speed. */
function paintClock(simClock) {
  const key = `${state.paused}${SETTINGS.sim_speed}`;
  if (key !== lastKey) {
    lastKey = key;
    refreshTransport();
  }
  if (!timeLabelEl || simClock === lastClock) return;
  lastClock = simClock;
  timeLabelEl.textContent = formatTime(simClock);
}

function paintStepSize() {
  if (!stepSizeEl) return;
  const size = formatTime(frameAdvance(STEP_SECONDS, SETTINGS.sim_speed, DT));
  stepSizeEl.textContent = t('transport.stepSize', { size });
}

function onTimelineChange({ frameCount, offset, scrubbing, simClock, behind }) {
  if (!scrubberEl) return;
  const max = Math.max(1, frameCount - 1);
  scrubberEl.max = String(max);
  scrubberEl.disabled = frameCount < 2;
  if (!userDraggingScrubber) scrubberEl.value = String(max - offset);

  paintClock(simClock);
  scrubberEl.setAttribute(
    'aria-valuetext',
    scrubbing
      ? t('transport.scrubAt', {
          behind: formatTime(behind),
          n: frameCount - offset,
          total: frameCount,
        })
      : t('transport.scrubLive')
  );

  const bar = document.getElementById('timelineBar');
  bar?.classList.toggle('is-scrubbing', scrubbing);
  for (const el of [liveBtn, replayBtn, rewindBtn])
    if (el) el.hidden = !scrubbing;
  // The event marker rides the same track, so it is repositioned whenever the
  // track changes. It draws nothing unless an event has fired.
  renderEventMarker({ frameCount, simClock });
  refreshTransport();
}

function refreshTransport() {
  if (!playBtn) return;
  const scrubbingNow = isScrubbing();
  const paused = state.paused;
  const showPlayIcon = scrubbingNow || paused;
  // The picture is an icon (css/icons.css) and the name is the aria-label
  // below, so swapping the class is all the glyph needs.
  playBtn
    .querySelector('.icon')
    ?.setAttribute('class', `icon icon-${showPlayIcon ? 'play' : 'pause'}`);
  // In the reader's language: these were English literals, so a paused figure
  // told a Spanish screen reader "Play simulation" over a Spanish interface.
  playBtn.setAttribute(
    'aria-label',
    t(
      scrubbingNow
        ? 'transport.timelineLive.hint'
        : showPlayIcon
          ? 'transport.timelinePlay.playLabel'
          : 'transport.timelinePlay.label'
    )
  );
  playBtn.title = t(
    showPlayIcon
      ? 'transport.timelinePlay.playHint'
      : 'transport.timelinePlay.hint'
  );
  // One step's size is worth a line only while there is a step to take.
  if (auxEl) {
    auxEl.hidden = !showPlayIcon;
    if (stepSizeEl) stepSizeEl.hidden = scrubbingNow;
    if (!scrubbingNow && paused) paintStepSize();
  }
}

// --- Rail sections ------------------------------------------------------------
//
// The rail outgrew a laptop screen once every group was present. Collapsing is
// the user's answer to that: shut the sections you are not using and the rest
// fits without scrolling. What is open is remembered, because a panel that
// reopens everything on every visit is not a preference, it is a chore.

const RAIL_SECTIONS_KEY = KEY_RAIL_SECTIONS;

// The rail is an accordion: one section open at a time, so it is four headings
// and one section and fits any screen. The choice persists.
const RAIL_SECTIONS = ['railScenario', 'railState', 'railTools'];

/** The one open on a first visit: loading something is where everyone starts. */
const DEFAULT_OPEN = 'railScenario';

/**
 * Which section is open.
 *
 * Stored as the list of *shut* sections, which is the shape the older
 * multi-open rail wrote, so a returning user's saved preference is read rather
 * than discarded. Whatever it says, exactly one section ends up open.
 *
 * @returns {string} A section toggle id
 */
function readOpenSection() {
  let shut = [];
  try {
    const raw = window.localStorage?.getItem(RAIL_SECTIONS_KEY);
    if (raw) shut = JSON.parse(raw);
  } catch {
    /* no stored preference; the default stands */
  }
  const open = RAIL_SECTIONS.filter(id => !shut.includes(id));
  // More than one open is a preference from before the rail was an accordion:
  // the first of them is the one nearest the top, which is the one to keep.
  return open[0] || DEFAULT_OPEN;
}

function setupRailSections() {
  let openId = readOpenSection();

  const toggles = [...document.querySelectorAll('.rail-section-toggle')].filter(
    toggle => document.getElementById(toggle.getAttribute('aria-controls'))
  );
  if (!toggles.length) return;
  // A stored id for a section that no longer exists must not leave the rail
  // with nothing open.
  if (!toggles.some(toggle => toggle.id === openId)) openId = toggles[0].id;

  const save = () => {
    try {
      window.localStorage?.setItem(
        RAIL_SECTIONS_KEY,
        JSON.stringify(RAIL_SECTIONS.filter(id => id !== openId))
      );
    } catch {
      /* the rail still works; the preference just will not persist */
    }
  };

  const apply = () => {
    for (const toggle of toggles) {
      const body = document.getElementById(
        toggle.getAttribute('aria-controls')
      );
      const open = toggle.id === openId;
      toggle.setAttribute('aria-expanded', String(open));
      body.hidden = !open;
    }
  };
  apply();

  for (const toggle of toggles) {
    toggle.addEventListener('click', () => {
      // Clicking the open section shuts it, so the rail can be reduced to four
      // headings when the simulation itself is what the user wants to see.
      openId = openId === toggle.id ? '' : toggle.id;
      apply();
      save();
      // The rail scrolls internally; opening a section further down should not
      // leave its heading off the top of the visible area.
      if (openId) toggle.scrollIntoView({ block: 'nearest' });
    });
  }
}

// --- View menu ----------------------------------------------------------------
function setupViewMenu() {
  setupRailSections();

  const unitBtn = document.getElementById('unitToggle');
  if (unitBtn) {
    const sync = () => {
      unitBtn.textContent = unitModeLabel();
      unitBtn.dataset.state = getUnitMode() === 'physical' ? 'on' : 'off';
      unitBtn.setAttribute(
        'aria-label',
        `Units: ${unitModeLabel()}. Activate to switch.`
      );
    };
    sync();
    unitBtn.addEventListener('click', () => {
      toggleUnitMode();
      sync();
      toast(t('toast.units.showing', { units: unitModeLabel().toLowerCase() }));
    });
    window.addEventListener(EV_UNITS_CHANGED, sync);
  }

  document.getElementById('undoBtn')?.addEventListener('click', undoPlacement);
  document
    .getElementById('shortcutsBtn')
    ?.addEventListener('click', toggleShortcutHelp);
  refreshUndoButton();
}

// --- Scenario search ----------------------------------------------------------
// Scenario search used to be wired here, filtering the browser's DOM after the
// fact by hiding list items. It now lives in js/scenarioBrowser.js, which owns
// the gallery and filters the catalog rather than the markup: that is what lets
// search combine with the concept chips instead of fighting them.

// --- Shortcuts ----------------------------------------------------------------
function setupShortcuts() {
  registerShortcut({
    keys: 'Space',
    match: ' ',
    group: 'Playback',
    label: t('shortcut.pause'),
    run: togglePlay,
  });
  registerShortcut({
    keys: ',',
    match: ',',
    group: 'Playback',
    label: t('shortcut.stepBack'),
    run: stepBack,
  });
  registerShortcut({
    keys: '.',
    match: '.',
    group: 'Playback',
    label: t('shortcut.stepForward'),
    run: stepForwardOrOne,
  });
  registerShortcut({
    keys: 'L',
    match: 'l',
    group: 'Playback',
    label: t('shortcut.live'),
    run: () => {
      if (!isScrubbing()) return;
      goLive();
      toast(t('toast.timeline.live'));
    },
  });
  registerShortcut({
    keys: '[',
    match: '[',
    group: 'Playback',
    label: 'Slower',
    run: () => adjustSpeed(-1),
  });
  registerShortcut({
    keys: ']',
    match: ']',
    group: 'Playback',
    label: 'Faster',
    run: () => adjustSpeed(1),
  });

  registerShortcut({
    keys: 'Arrow keys',
    match: '__pan',
    group: 'View',
    label: t('shortcut.pan'),
  });
  registerShortcut({
    keys: 'Scroll',
    match: '__zoom',
    group: 'View',
    label: t('shortcut.zoom'),
  });
  registerShortcut({
    keys: 'R',
    match: 'r',
    group: 'View',
    label: t('shortcut.resetView'),
    run: () => {
      state.zoom = 1.0;
      state.pan = { x: 0, y: 0 };
      // Deliberate, so Follow mode re-centers instead of reading it as a drag.
      resetFollowCamera(state);
      toast(t('toast.view.reset'));
    },
  });
  registerShortcut({
    keys: 'I',
    match: 'i',
    group: 'Learn',
    label: t('shortcut.investigations'),
    run: () => {
      // Through the loader rather than importing the module directly: it is the
      // one place that guarantees initInvestigations() has run, and the module
      // does nothing useful before it has.
      import('./investigationsLoader.js').then(m =>
        m.ensureInvestigations().then(inv => inv.openBrowser())
      );
    },
  });
  registerShortcut({
    keys: 'K',
    match: 'k',
    group: 'State',
    label: t('shortcut.share'),
    run: () => {
      // Imported lazily: share.js imports this module, so a static import here
      // would close a cycle that only exists for one keystroke.
      import('./share.js').then(m => m.openShareDialog());
    },
  });
  registerShortcut({
    keys: 'E',
    match: 'e',
    group: 'State',
    label: t('shortcut.export'),
    run: () => {
      // Through the bridge, which initialises the dialog first; lazily, for the
      // same reason as the two above (exportDialog.js imports this module).
      const open = () =>
        import('./exportBridge.js')
          .then(m => m.openExport())
          .catch(() => loadFailed(open));
      open();
    },
  });
  registerShortcut({
    keys: 'T',
    match: 't',
    group: 'View',
    label: t('shortcut.theme'),
    run: () => {
      const id = cycleTheme();
      toast(t('toast.theme.changed', { theme: themeLabel(id) }));
    },
  });
  // Mute stays one keystroke away now that the speaker button opens a panel
  // instead of toggling. A reader who wants silence in a hurry should not have
  // to open a dialog to get it.
  registerShortcut({
    keys: 'M',
    match: 'm',
    group: 'View',
    label: t('sound.shortcut'),
    run: () => {
      const next = setSonificationMuted(!getSonificationState().muted);
      if (next.muted) {
        window.dispatchEvent(new CustomEvent(EV_STOP_SIGNAL_AUDIO));
      }
      toast(t(`sound.state.long.${next.muted ? 'muted' : 'ready'}`));
    },
  });
  registerShortcut({
    keys: 'U',
    match: 'u',
    group: 'View',
    label: t('shortcut.units'),
    run: () => {
      toggleUnitMode();
      toast(`Showing ${unitModeLabel().toLowerCase()}`);
    },
  });
  registerShortcut({
    keys: 'G',
    match: 'g',
    group: 'View',
    label: t('shortcut.trails'),
    run: () => {
      SETTINGS.show_trails = !SETTINGS.show_trails;
      toast(SETTINGS.show_trails ? 'Trails on' : 'Trails off');
    },
  });

  registerShortcut({
    keys: 'Z',
    match: 'z',
    group: 'Editing',
    label: t('shortcut.undo'),
    run: undoPlacement,
  });
  registerShortcut({
    keys: 'Click',
    match: '__click',
    group: 'Editing',
    label: t('shortcut.inspect'),
  });
  registerShortcut({
    keys: 'Drag',
    match: '__drag',
    group: 'Editing',
    label: t('shortcut.place'),
  });
  registerShortcut({
    keys: 'Shift + Drag',
    match: '__shiftdrag',
    group: 'Editing',
    label: t('shortcut.snap'),
  });
  registerShortcut({
    keys: 'V',
    match: 'v',
    group: 'View',
    label: t('shortcut.lecture'),
    run: async () => {
      const { toggleLecture, lectureReady } = await import('./lecture.js');
      await lectureReady;
      toggleLecture();
    },
  });
  registerShortcut({
    keys: 'N',
    match: 'n',
    group: 'Tools',
    label: t('shortcut.pauseAtEvent'),
    run: async () => {
      const toggle = document.getElementById('togglePauseAtEvent');
      toggle?.click();
      // The first press fetches the tool (js/pauseAtEventBridge.js). The
      // button's handler awaits the same load and was first to, so the panel
      // is open by the time this resumes.
      await ensurePauseAtEvent().catch(() => {});
      // Focus the panel's first control, so the whole tool is reachable without
      // a mouse: choose an event, tab to Arm, press it.
      if (toggle?.getAttribute('aria-pressed') === 'true') {
        document.getElementById('pauseEventKind')?.focus();
      }
    },
  });
  registerShortcut({
    keys: '?',
    match: '?',
    group: 'Help',
    label: t('shortcut.showList'),
    shift: true,
    run: toggleShortcutHelp,
  });
  // Presses the explain button of the panel focus is in (js/explainers.js,
  // fetched on the first press); js/plot/plot.js leaves the key to this list.
  document.documentElement.dataset.helpKey = 'list';
  registerShortcut({
    keys: 'H',
    match: 'h',
    group: 'Help',
    label: t('shortcut.explainHere'),
    run: async () => (await import('./explainers.js')).pressHere(),
  });
  registerShortcut({
    keys: 'Esc',
    match: 'escape',
    group: 'Help',
    label: t('shortcut.closePanel'),
    run: event => {
      // An Escape inside the list has already closed it (js/dialog.js), and
      // closes nothing else.
      if (event?.target?.closest?.('#shortcutOverlay')) return;
      if (isShortcutHelpOpen()) {
        hideShortcutHelp();
        return;
      }
      window.dispatchEvent(new CustomEvent(EV_ESCAPE));
    },
  });

  initShortcuts();
}

function adjustSpeed(direction) {
  const steps = [0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 5, 8];
  const current = SETTINGS.sim_speed || 1;
  let next;
  if (current > steps[steps.length - 1]) {
    // Above the table. Three scenarios live up here - the resonance ones run
    // between 150 and 7,500 - and snapping them to 8 because that is the last
    // entry would take a system whose point is that it advances twenty
    // thousand years a minute and stop it dead. Scale instead, so the keys
    // still mean "faster" and "slower" rather than "abandon this scenario".
    next = direction > 0 ? current * 2 : Math.max(steps[0], current / 2);
  } else {
    let i = steps.findIndex(s => Math.abs(s - current) < 1e-6);
    if (i === -1) i = steps.findIndex(s => s > current);
    if (i === -1) i = steps.length - 1;
    next = steps[Math.max(0, Math.min(steps.length - 1, i + direction))];
  }
  SETTINGS.sim_speed = next;
  window.dispatchEvent(
    new CustomEvent(EV_SPEED_CHANGED, { detail: { speed: next } })
  );
  toast(t('toast.speed.changed', { speed: next }));
}

// --- Entry point --------------------------------------------------------------

/**
 * Confirm that a long press has armed object placement on a touch device.
 * Without this the gesture is invisible: nothing on screen changes until the
 * finger is released and an object appears.
 */
function setupPlacementHint() {
  let el = null;
  let timer = null;
  window.addEventListener(EV_PLACEMENT_ARMED, () => {
    if (!el) {
      el = document.createElement('div');
      el.className = 'placement-armed-hint';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    // The option id is built here rather than imported from ui.js: controls.js
    // is loaded before the simulation and importing ui.js for one label would
    // close a cycle between them.
    const type = SETTINGS.input_object_type;
    el.textContent = t('toast.placement.armed', {
      object: t(
        `settings.option.inputObjectType.${String(type).toLowerCase()}`
      ),
    });
    el.classList.add('is-visible');
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => el.classList.remove('is-visible'), 1800);
  });
}

/**
 * Phones get the readout collapsed to its chip on first load: expanded it
 * covers most of a 375px screen, and the simulation is the point.
 */
export function collapseReadoutOnSmallScreens() {
  if (window.innerWidth > 767) return;
  const overlay = document.getElementById('overlay');
  const btn = document.getElementById('overlayMinimize');
  if (!overlay || !btn || overlay.classList.contains('minimized')) return;
  btn.click();
}

/**
 * Keep every range input's filled portion in step with its value (a CSS
 * gradient stop, since the sliders lose the native filled track). Delegated
 * from the document, so late-created sliders are covered too.
 *
 * @param {HTMLInputElement} el - The range input
 */
function paintRangeFill(el) {
  const min = Number(el.min || 0);
  const max = Number(el.max || 100);
  const span = max - min;
  const pct = span > 0 ? ((el.valueAsNumber - min) / span) * 100 : 0;
  el.style.setProperty('--range-fill', `${Math.max(0, Math.min(100, pct))}%`);
}

/** Paint every range input currently in the document. */
export function refreshRangeFills() {
  document.querySelectorAll('input[type="range"]').forEach(paintRangeFill);
}

function setupRangeFills() {
  document.addEventListener(
    'input',
    e => {
      if (e.target?.type === 'range') paintRangeFill(e.target);
    },
    true
  );
  refreshRangeFills();
  // Sliders appear when a panel opens, so repaint as the DOM changes rather
  // than only at load.
  new MutationObserver(muts => {
    for (const m of muts) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.matches?.('input[type="range"]')) paintRangeFill(node);
        node.querySelectorAll?.('input[type="range"]').forEach(paintRangeFill);
      }
    }
  }).observe(document.body, { childList: true, subtree: true });
}

/** Initialize every control surface this module owns. */
/**
 * Run or pause the simulation, as the transport's play button does.
 *
 * Also what an embedding page's play and pause messages reach
 * (js/embedBridge.js), so that the figure and its page cannot disagree about
 * what pressing play means - scrubbing back through history included.
 * @param {boolean} playing - True to run
 */
export function setPlaying(playing) {
  // Playing means running, from the live moment; pausing leaves history be.
  if (playing) returnToLive();
  state.paused = !playing;
  releaseHold();
  refreshTransport();
}

export function initControls() {
  setupRangeFills();
  initTheme();
  initUnits();
  window.addEventListener(EV_OBJECT_PLACED, e => {
    if (e.detail?.object) recordPlacement(e.detail.object);
    // A body placed while looking back commits that moment, or Return to live
    // would put back a world that never had it.
    if (isScrubbing()) rewindHere();
  });
  // Escape ends a replay as Pause does.
  window.addEventListener(EV_ESCAPE, () => {
    if (isReplaying()) goLive();
  });
  window.addEventListener(EV_SIMULATION_RESET, () => {
    clearPlacementHistory();
    resetTimeline();
    // Once: every build fires this, each sweep trial too.
    // By the scenario on screen and in the reader's language. It named
    // SETTINGS.preset_scenario, which a load leaves as the 'None' sentinel, so
    // a screen reader heard "Scenario loaded: None", in English.
    const name = current_scenario_name;
    if (name && name !== 'None')
      announce(
        t('summary.announce.scenario', { name: scenarioTitle(name) || name }),
        false
      );
  });
  setupTransport();
  setupViewMenu();
  setupPlacementHint();
  setupShortcuts();
  refreshTransport();
}

export { tickTimeline, resetTimeline };
