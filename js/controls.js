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

/** Drop the undo stack: called when the simulation is rebuilt. */
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

// --- Theme dock ---------------------------------------------------------------
//
// The picker sits beside the copyright rather than in the control rail: it is a
// preference for the page, not a control for the simulation, and the rail had
// grown past the height of a laptop screen. Closed it is a swatch and a word;
// open it lists every theme with its one-line hint, so choosing Daylight is one
// click rather than three presses of the cycle shortcut.

/** Repaint the dock's swatch and label from the active theme. */
function syncThemeDock() {
  const name = document.getElementById('themeButtonName');
  const active = THEMES.find(t => t.id === getTheme());
  if (name) name.textContent = active?.label ?? 'Theme';
  for (const item of document.querySelectorAll('[data-theme-option]')) {
    const on = item.dataset.themeOption === getTheme();
    item.setAttribute('aria-checked', String(on));
    item.classList.toggle('is-active', on);
  }
}

function setupThemeDock() {
  const btn = document.getElementById('themeButton');
  const menu = document.getElementById('themeMenu');
  if (!btn || !menu) return;

  menu.innerHTML = THEMES.map(
    t => `<button type="button" role="menuitemradio" aria-checked="false"
             class="theme-menu-item" data-theme-option="${t.id}">
             <span class="theme-menu-swatch" data-swatch="${t.id}"></span>
             <span class="theme-menu-text">
               <span class="theme-menu-label">${t.label}</span>
               <span class="theme-menu-hint">${t.hint}</span>
             </span>
           </button>`
  ).join('');

  const close = ({ refocus = false } = {}) => {
    if (menu.hidden) return;
    menu.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    if (refocus) btn.focus();
  };

  const open = () => {
    menu.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    menu.querySelector('.is-active, .theme-menu-item')?.focus();
  };

  btn.addEventListener('click', () => (menu.hidden ? open() : close()));

  menu.addEventListener('click', e => {
    const item = e.target.closest('[data-theme-option]');
    if (!item) return;
    setTheme(item.dataset.themeOption);
    close({ refocus: true });
  });

  // A menu that cannot be dismissed by Escape or by clicking away is a trap,
  // and this one floats over the simulation.
  menu.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close({ refocus: true });
    }
  });
  document.addEventListener('click', e => {
    if (!menu.hidden && !e.target.closest('.theme-dock')) close();
  });
  window.addEventListener('gravitasEscape', () => close({ refocus: true }));

  // The T shortcut and any other caller change the theme without going through
  // this menu, so the dock follows the theme rather than its own clicks.
  window.addEventListener('gravitasThemeChanged', syncThemeDock);
  syncThemeDock();
}

// --- Rail sections ------------------------------------------------------------
//
// The rail outgrew a laptop screen once every group was present. Collapsing is
// the user's answer to that: shut the sections you are not using and the rest
// fits without scrolling. What is open is remembered, because a panel that
// reopens everything on every visit is not a preference, it is a chore.

const RAIL_SECTIONS_KEY = 'gravitas_rail_sections';

// Shut on a first visit. Learn is reference material rather than controls, and
// with it open the rail is taller than a laptop screen before the user has done
// anything. Its header stays visible, so it is folded rather than hidden.
const DEFAULT_COLLAPSED = ['railLearn'];

function readCollapsedSections() {
  try {
    const raw = window.localStorage?.getItem(RAIL_SECTIONS_KEY);
    return new Set(raw ? JSON.parse(raw) : DEFAULT_COLLAPSED);
  } catch {
    return new Set(DEFAULT_COLLAPSED);
  }
}

function setupRailSections() {
  const collapsed = readCollapsedSections();
  const save = () => {
    try {
      window.localStorage?.setItem(
        RAIL_SECTIONS_KEY,
        JSON.stringify([...collapsed])
      );
    } catch {
      /* the rail still works; the preference just will not persist */
    }
  };

  for (const toggle of document.querySelectorAll('.rail-section-toggle')) {
    const body = document.getElementById(toggle.getAttribute('aria-controls'));
    if (!body) continue;

    const apply = () => {
      const shut = collapsed.has(toggle.id);
      toggle.setAttribute('aria-expanded', String(!shut));
      body.hidden = shut;
    };
    apply();

    toggle.addEventListener('click', () => {
      if (collapsed.has(toggle.id)) collapsed.delete(toggle.id);
      else collapsed.add(toggle.id);
      apply();
      save();
    });
  }
}

// --- View menu ----------------------------------------------------------------
function setupViewMenu() {
  setupThemeDock();
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
    keys: 'I',
    match: 'i',
    group: 'Learn',
    label: 'Open the guided investigations',
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
    label: 'Share a link to this simulation',
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
    label: 'Export the recorded data as CSV',
    run: () => {
      // Lazily imported for the same reason as the two above: exportDialog.js
      // imports this module for its toast, so a static import here would close
      // a cycle for one keystroke.
      import('./exportDialog.js').then(m => m.openExportDialog());
    },
  });
  registerShortcut({
    keys: 'T',
    match: 't',
    group: 'View',
    label: 'Cycle theme',
    run: () => {
      const id = cycleTheme();
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

/**
 * Keep every range input's filled portion in step with its value.
 *
 * The fill is a CSS gradient stop rather than a native progress element,
 * because the sliders set -webkit-appearance: none and so lose the platform's
 * own filled track. Delegated from the document and re-run on demand, so it
 * covers sliders that are created long after load, like the inspector's mass
 * control and the lesson panels.
 *
 * @param {HTMLInputElement} el - The range input
 */
function paintRangeFill(el) {
  const min = Number(el.min || 0);
  const max = Number(el.max || 100);
  const span = max - min;
  const pct = span > 0 ? ((Number(el.value) - min) / span) * 100 : 0;
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

/** Initialise every control surface this module owns. */
export function initControls() {
  setupRangeFills();
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
  setupShortcuts();
  refreshTransport();
}

export { tickTimeline, resetTimeline };
