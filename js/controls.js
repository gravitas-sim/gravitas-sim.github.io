// =============================================================================
// Controls — the transport bar, view menu, shortcuts and placement undo
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
} from './physics.js';
import { state, SETTINGS } from './ui.js';
import {
  tickTimeline,
  scrubTo,
  stepBack,
  stepForward,
  resumeLive,
  isScrubbing,
  bindTimelineUI,
  resetTimeline,
  getFrameCount,
} from './timeline.js';
import {
  initUnits,
  toggleUnitMode,
  getUnitMode,
  unitModeLabel,
  formatTime,
} from './units.js';
import { initTheme, cycleTheme, getTheme, setTheme, THEMES } from './theme.js';
import {
  initShortcuts,
  registerShortcut,
  toggleShortcutHelp,
  hideShortcutHelp,
  isShortcutHelpOpen,
} from './shortcuts.js';

// --- Placement undo -----------------------------------------------------------
// Only user-placed objects are undoable. Simulation-created bodies (merger
// products, collapse remnants) are not — undoing those would mean rewriting
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
      window.dispatchEvent(new CustomEvent('gravitasSelectionCleared'));
    }
    refreshUndoButton();
    toast('Removed last placed object');
    return true;
  }
  refreshUndoButton();
  toast('Nothing to undo');
  return false;
}

/** Drop the undo stack — called when the simulation is rebuilt. */
export function clearPlacementHistory() {
  placementStack.length = 0;
  refreshUndoButton();
}

function refreshUndoButton() {
  const btn = document.getElementById('undoBtn');
  if (btn) btn.disabled = placementStack.length === 0;
}

// --- Screen-reader announcements ---------------------------------------------
// The canvas is opaque to assistive technology, so anything that only shows up
// visually gets mirrored into a polite live region.
let lastAnnouncement = '';

/**
 * Announce a state change to screen readers.
 * @param {string} message - Text to announce
 */
export function announce(message) {
  if (message === lastAnnouncement) return;
  lastAnnouncement = message;
  const el = document.getElementById('srStatus');
  if (el) el.textContent = message;
}

// --- Toasts -------------------------------------------------------------------
let toastTimer = null;

/**
 * Show a brief status message.
 * @param {string} message - Text to display
 */
export function toast(message) {
  let el = document.getElementById('gravitasToast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'gravitasToast';
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add('is-visible');
  announce(message);
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-visible'), 2200);
}

// --- Transport bar ------------------------------------------------------------
let scrubberEl = null;
let timeLabelEl = null;
let playBtn = null;
let liveBtn = null;
let userDraggingScrubber = false;

function setupTransport() {
  scrubberEl = document.getElementById('timelineScrubber');
  timeLabelEl = document.getElementById('timelineTime');
  playBtn = document.getElementById('timelinePlay');
  liveBtn = document.getElementById('timelineLive');

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
    const offset = Number(scrubberEl.max) - Number(scrubberEl.value);
    scrubTo(offset);
  });

  playBtn?.addEventListener('click', () => {
    if (isScrubbing()) {
      resumeLive();
      state.paused = false;
    } else {
      state.paused = !state.paused;
    }
    refreshTransport();
  });

  liveBtn?.addEventListener('click', () => {
    resumeLive();
    state.paused = false;
    refreshTransport();
  });

  document
    .getElementById('timelineStepBack')
    ?.addEventListener('click', () => stepBack());
  document
    .getElementById('timelineStepFwd')
    ?.addEventListener('click', () => stepForward());

  bindTimelineUI({ onChange: onTimelineChange });
}

function onTimelineChange({ frameCount, offset, scrubbing, simClock }) {
  if (!scrubberEl) return;
  const max = Math.max(1, frameCount - 1);
  scrubberEl.max = String(max);
  scrubberEl.disabled = frameCount < 2;
  if (!userDraggingScrubber) scrubberEl.value = String(max - offset);

  if (timeLabelEl) timeLabelEl.textContent = formatTime(simClock);

  const bar = document.getElementById('timelineBar');
  bar?.classList.toggle('is-scrubbing', scrubbing);
  if (liveBtn) liveBtn.hidden = !scrubbing;
  refreshTransport();
}

function refreshTransport() {
  if (!playBtn) return;
  const scrubbingNow = isScrubbing();
  const paused = state.paused;
  const showPlayIcon = scrubbingNow || paused;
  playBtn.textContent = showPlayIcon ? '▶' : '❚❚';
  playBtn.setAttribute(
    'aria-label',
    showPlayIcon ? 'Play simulation' : 'Pause simulation'
  );
  playBtn.title = showPlayIcon ? 'Play (Space)' : 'Pause (Space)';
}

// --- View menu ----------------------------------------------------------------
function setupViewMenu() {
  const themeSelect = document.getElementById('themeSelect');
  if (themeSelect) {
    themeSelect.innerHTML = THEMES.map(
      t => `<option value="${t.id}">${t.label}</option>`
    ).join('');
    themeSelect.value = getTheme();
    themeSelect.addEventListener('change', () => setTheme(themeSelect.value));
  }

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
      toast(`Showing ${unitModeLabel().toLowerCase()}`);
    });
    window.addEventListener('gravitasUnitsChanged', sync);
  }

  document.getElementById('undoBtn')?.addEventListener('click', undoPlacement);
  document
    .getElementById('shortcutsBtn')
    ?.addEventListener('click', toggleShortcutHelp);
  refreshUndoButton();
}

// --- Scenario search ----------------------------------------------------------
function setupScenarioSearch() {
  const input = document.getElementById('scenarioSearch');
  const list = document.getElementById('scenarioListItems');
  if (!input || !list) return;

  const filter = () => {
    const q = input.value.trim().toLowerCase();
    let visible = 0;
    for (const item of list.querySelectorAll('[data-scenario]')) {
      const hay = (
        item.dataset.scenario +
        ' ' +
        (item.dataset.keywords || '') +
        ' ' +
        item.textContent
      ).toLowerCase();
      const show = !q || hay.includes(q);
      item.hidden = !show;
      if (show) visible++;
    }
    const empty = document.getElementById('scenarioSearchEmpty');
    if (empty) empty.hidden = visible > 0;
  };

  input.addEventListener('input', filter);
  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      input.value = '';
      filter();
      e.stopPropagation();
    }
    if (e.key === 'Enter') {
      const first = list.querySelector('[data-scenario]:not([hidden])');
      first?.click();
    }
  });
  // Re-filter whenever the list is repopulated
  new MutationObserver(filter).observe(list, { childList: true });
}

// --- Shortcuts ----------------------------------------------------------------
function setupShortcuts() {
  registerShortcut({
    keys: 'Space',
    match: ' ',
    group: 'Playback',
    label: 'Pause / resume',
    run: () => {
      if (isScrubbing()) resumeLive();
      state.paused = !state.paused;
      refreshTransport();
    },
  });
  registerShortcut({
    keys: ',',
    match: ',',
    group: 'Playback',
    label: 'Step back one recorded frame',
    run: stepBack,
  });
  registerShortcut({
    keys: '.',
    match: '.',
    group: 'Playback',
    label: 'Step forward one recorded frame',
    run: stepForward,
  });
  registerShortcut({
    keys: 'L',
    match: 'l',
    group: 'Playback',
    label: 'Jump back to live',
    run: () => {
      resumeLive();
      toast('Back to live');
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
    label: 'Pan the view',
  });
  registerShortcut({
    keys: 'Scroll',
    match: '__zoom',
    group: 'View',
    label: 'Zoom in and out',
  });
  registerShortcut({
    keys: 'R',
    match: 'r',
    group: 'View',
    label: 'Reset view',
    run: () => {
      state.zoom = 1.0;
      state.pan = { x: 0, y: 0 };
      toast('View reset');
    },
  });
  registerShortcut({
    keys: 'T',
    match: 't',
    group: 'View',
    label: 'Cycle theme',
    run: () => {
      const id = cycleTheme();
      const sel = document.getElementById('themeSelect');
      if (sel) sel.value = id;
      toast(`Theme: ${THEMES.find(t => t.id === id)?.label ?? id}`);
    },
  });
  registerShortcut({
    keys: 'U',
    match: 'u',
    group: 'View',
    label: 'Toggle physical / simulation units',
    run: () => {
      toggleUnitMode();
      toast(`Showing ${unitModeLabel().toLowerCase()}`);
    },
  });
  registerShortcut({
    keys: 'G',
    match: 'g',
    group: 'View',
    label: 'Toggle trails',
    run: () => {
      SETTINGS.show_trails = !SETTINGS.show_trails;
      toast(SETTINGS.show_trails ? 'Trails on' : 'Trails off');
    },
  });

  registerShortcut({
    keys: 'Z',
    match: 'z',
    group: 'Editing',
    label: 'Undo last placed object',
    run: undoPlacement,
  });
  registerShortcut({
    keys: 'Click',
    match: '__click',
    group: 'Editing',
    label: 'Inspect an object',
  });
  registerShortcut({
    keys: 'Drag',
    match: '__drag',
    group: 'Editing',
    label: 'Place an object with velocity',
  });
  registerShortcut({
    keys: 'Shift + Drag',
    match: '__shiftdrag',
    group: 'Editing',
    label: 'Snap to a circular orbit',
  });

  registerShortcut({
    keys: '?',
    match: '?',
    group: 'Help',
    label: 'Show this list',
    shift: true,
    run: toggleShortcutHelp,
  });
  registerShortcut({
    keys: 'Esc',
    match: 'escape',
    group: 'Help',
    label: 'Close the open panel',
    run: () => {
      if (isShortcutHelpOpen()) {
        hideShortcutHelp();
        return;
      }
      window.dispatchEvent(new CustomEvent('gravitasEscape'));
    },
  });

  initShortcuts();
}

function adjustSpeed(direction) {
  const steps = [0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 5, 8];
  const current = SETTINGS.sim_speed || 1;
  let i = steps.findIndex(s => Math.abs(s - current) < 1e-6);
  if (i === -1) i = steps.findIndex(s => s > current);
  if (i === -1) i = steps.length - 1;
  const next = steps[Math.max(0, Math.min(steps.length - 1, i + direction))];
  SETTINGS.sim_speed = next;
  window.dispatchEvent(
    new CustomEvent('gravitasSpeedChanged', { detail: { speed: next } })
  );
  toast(`Speed ${next}×`);
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
  window.addEventListener('gravitasPlacementArmed', () => {
    if (!el) {
      el = document.createElement('div');
      el.className = 'placement-armed-hint';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.textContent = `Drag to aim · release to place ${SETTINGS.input_object_type}`;
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
  if (window.innerWidth > 720) return;
  const overlay = document.getElementById('overlay');
  const btn = document.getElementById('overlayMinimize');
  if (!overlay || !btn || overlay.classList.contains('minimized')) return;
  btn.click();
}

/** Initialise every control surface this module owns. */
export function initControls() {
  initTheme();
  initUnits();
  window.addEventListener('gravitasObjectPlaced', e => {
    if (e.detail?.object) recordPlacement(e.detail.object);
  });
  window.addEventListener('gravitasSimulationReset', () => {
    clearPlacementHistory();
    resetTimeline();
    announce(`Scenario loaded: ${SETTINGS.preset_scenario}`);
  });
  setupTransport();
  setupViewMenu();
  setupPlacementHint();
  setupScenarioSearch();
  setupShortcuts();
  refreshTransport();
}

export { tickTimeline, resetTimeline };
