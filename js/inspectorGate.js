// =============================================================================
// The inspector's door
// -----------------------------------------------------------------------------
// The inspector card (js/inspectorWindow.js, inspectorView.js, inspectorPanel.js)
// is fetched on the first selection. This module answers the calls the rest of
// the application makes of it until then: show fetches it first (calls made
// meanwhile run in order, a hide cancels the earlier ones), hide has nothing to
// do before it has ever been shown, and the lesson's suppression flag and the
// type mapping live here, where the card reads them. It also holds what shares
// the card's old module but is not the card: the readout's minimize control, the
// rail's reference-frame selector, and the maneuver planner's loader.
// =============================================================================

import { barycenterBodies } from './physics.js';
import {
  WORLD,
  BARYCENTER,
  OBJECT,
  setFrame,
  frameState,
  onFrameChange,
} from './referenceFrame.js';
import { t } from './i18n/index.js';
import { loadFailed } from './notify.js';
import { setBodySelector } from './widgetRuntime.js';
import { state, SETTINGS, current_scenario_name, command } from './appState.js';
import { EV_MANEUVER_REQUESTED, EV_SIMULATION_RESET } from './names.js';

// --- The card, fetched on first use -------------------------------------------
let cardModule = null;
let cardLoading = null;
/** Bumped by every show and hide, so a late card shows only the latest wish. */
let wish = 0;

/**
 * Fetch the card's code once and wire its header buttons once.
 *
 * @returns {Promise<object>} The inspector window module
 */
export function ensureInspector() {
  cardLoading ??= import('./inspectorWindow.js').then(
    mod => {
      mod.wireInspectorControls({
        isSuppressed: isInspectorSuppressed,
        paintFrameControls,
        setupOverlayMinimize,
      });
      cardModule = mod;
      return mod;
    },
    err => {
      cardLoading = null;
      throw err;
    }
  );
  return cardLoading;
}

/** @returns {boolean} Whether the card's code is here */
export const inspectorLoaded = () => cardModule !== null;

/**
 * Show the card for an object.
 *
 * @param {object} object - A physics object
 * @param {string} type - Its inspector type
 * @returns {void}
 */
export const showObjectInspector = (object, type) => {
  if (cardModule) {
    cardModule.showObjectInspector(object, type);
    return;
  }
  // Selecting is synchronous, as it is with the card here: readers of
  // state.selectedObject (the lesson port, the observing panels) see it at
  // once, under the card's own guards (the splash, the card's element).
  if (
    window.splashScreenEnded &&
    !window.isSplashActive &&
    document.getElementById('objectInspector')
  )
    state.selectedObject = { object, type };
  const mine = ++wish;
  ensureInspector().then(
    mod => {
      if (mine === wish) mod.showObjectInspector(object, type);
    },
    err => {
      console.error('The inspector could not be loaded:', err);
      loadFailed(() => showObjectInspector(object, type), err);
    }
  );
};

/** Hide the card, if it has ever been shown. @returns {void} */
export const hideObjectInspector = () => {
  wish++;
  if (cardModule) cardModule.hideObjectInspector();
  else if (state.selectedObject) {
    state.selectedObject = null;
    paintFrameControls();
  }
};

// Selecting and inspecting are one call, through the port in
// js/widgetRuntime.js, so a lesson's object list, a plot marker and a click on
// the canvas cannot disagree about what is selected.
setBodySelector(showObjectInspector);

/**
 * The type string the inspector dispatches on, for a body.
 *
 * Not obj_type, which is what this used to pass. A StarObject's obj_type is
 * "StarObject" and objectInfoFor's case is "Star", so a star merger re-selected
 * the product and then logged "Unknown object type: StarObject" and rendered
 * nothing. Every other caller of showObjectInspector gets its type from
 * findObjectAtPosition, which is where this mapping otherwise lives; this is
 * the one caller that has a body and no click to resolve it from.
 *
 * Keyed on the class rather than obj_type because the two are not
 * interchangeable - a transformed body carries the obj_type of what it became
 * and the class of what it was - and build.js keeps class names through
 * minification for exactly this kind of comparison.
 *
 * @param {object} body - A physics body
 * @returns {string} The inspector's type string
 */
export const inspectorTypeFor = body => {
  const byClass = {
    BlackHole: 'BlackHole',
    StarObject: 'Star',
    NeutronStar: 'NeutronStar',
    WhiteDwarf: 'WhiteDwarf',
    Planet: 'Planet',
    GasGiant: 'GasGiant',
    Comet: 'Comet',
    Asteroid: 'Asteroid',
    Galaxy: 'Galaxy',
  };
  return byClass[body?.kind] || body?.obj_type || 'Planet';
};

// Set while a guided investigation is running; see showObjectInspector.
let inspectorSuppressed = false;

/** @returns {boolean} Whether a lesson has asked for the card to be withheld */
export const isInspectorSuppressed = () => inspectorSuppressed;

/**
 * Hide the object inspector without disabling selection.
 * @param {boolean} value - True to withhold the panel on click
 */
export const setInspectorSuppressed = value => {
  inspectorSuppressed = !!value;
  // Deliberately not hideObjectInspector(): that also clears the orbit overlay
  // and the equal-areas wedges, which are exactly what a lesson wants left on
  // screen. Only the panel itself is put away.
  if (inspectorSuppressed) {
    const el = document.getElementById('objectInspector');
    if (el) {
      el.classList.remove('visible');
      el.style.display = 'none';
      el.style.pointerEvents = 'none';
    }
    state.inspector_open = false;
    if (state.inspectorUpdateInterval) {
      clearInterval(state.inspectorUpdateInterval);
      state.inspectorUpdateInterval = null;
    }
  } else {
    const el = document.getElementById('objectInspector');
    if (el) el.style.display = '';
  }
};

// Overlay minimize/maximize functionality. Run at start-up and again for every
// selection; the registrations of the run before are taken back each time.
let overlayAbort = null;
export const setupOverlayMinimize = () => {
  const overlay = document.getElementById('overlay');
  const minimizeBtn = document.getElementById('overlayMinimize');

  if (!overlay || !minimizeBtn) return;

  overlayAbort?.abort();
  overlayAbort = new AbortController();
  const on = (target, type, fn) =>
    target.addEventListener(type, fn, { signal: overlayAbort.signal });

  // Add minimize/maximize handler
  on(minimizeBtn, 'click', toggleOverlayMinimize);

  // The whole collapsed panel is the target for re-opening, not just the chip
  on(overlay, 'click', e => {
    if (!overlay.classList.contains('minimized')) return;
    if (minimizeBtn.contains(e.target)) return;
    setOverlayMinimized(overlay, minimizeBtn, false);
  });

  setOverlayMinimized(
    overlay,
    minimizeBtn,
    overlay.classList.contains('minimized')
  );
};

const toggleOverlayMinimize = e => {
  e.preventDefault();
  e.stopPropagation();

  const overlay = document.getElementById('overlay');
  const minimizeBtn = document.getElementById('overlayMinimize');

  if (!overlay || !minimizeBtn) return;

  const isMinimized = overlay.classList.contains('minimized');

  setOverlayMinimized(overlay, minimizeBtn, !isMinimized);
};

/**
 * Apply the minimized/expanded state to the readout panel and its control.
 * The button carries a word as well as a glyph - a bare "−" gave no clue that
 * the panel could be collapsed, and the collapsed state was an unlabeled box.
 * @param {HTMLElement} overlay - The overlay panel
 * @param {HTMLElement} btn - The minimize/expand button
 * @param {boolean} minimized - Target state
 */
const setOverlayMinimized = (overlay, btn, minimized) => {
  overlay.classList.toggle('minimized', minimized);
  const glyph = minimized ? '▸' : '▾';
  const label = minimized ? t('readout.toggle.show') : t('readout.toggle.hide');
  btn.innerHTML =
    `<span aria-hidden="true">${glyph}</span>` +
    `<span class="overlay-toggle-label">${label}</span>`;
  btn.title = minimized
    ? t('readout.toggle.show.hint')
    : t('readout.toggle.hide.hint');
  btn.setAttribute('aria-expanded', String(!minimized));
  btn.setAttribute(
    'aria-label',
    minimized ? t('readout.toggle.show.label') : t('readout.toggle.hide.hint')
  );
};

// --- Reference-frame switcher -------------------------------------------------
// The rail control and the inspector row are two doors into the same state, so
// both are driven from one subscription rather than each trying to keep the
// other in step.

/**
 * The name to show for a frame, and what choosing it does.
 *
 * @param {{mode: string, objectId: ?number}} frame - The frame
 * @returns {{value: string, note: string, active: boolean}} What the rail shows
 */
const describeFrame = frame => {
  if (frame.mode === BARYCENTER) {
    return {
      value: BARYCENTER,
      note: 'Positions relative to the system\u2019s center of mass. It does not sit inside the largest body.',
      active: true,
    };
  }
  if (frame.mode === OBJECT) {
    const body = barycenterBodies().find(b => b.id === frame.objectId);
    const name = body?.name || 'the selected object';
    return {
      value: OBJECT,
      note: `Positions and trails as seen from ${name}, which now sits still.`,
      active: true,
    };
  }
  return {
    value: WORLD,
    note: 'Positions as the scenario defines them.',
    active: false,
  };
};

/** Bring the rail control and the inspector row in line with the frame. */
export const paintFrameControls = () => {
  const frame = frameState();
  const shown = describeFrame(frame);

  const select = document.getElementById('referenceFrameSelect');
  if (select) {
    const objectOption = select.querySelector('option[value="object"]');
    if (objectOption) {
      // "Selected object" is only a choice when there is one. Offering it with
      // nothing selected would set a frame with no origin.
      const sel = state.selectedObject?.object;
      objectOption.disabled = !sel;
      objectOption.textContent = sel
        ? `Selected: ${sel.name || 'object'}`
        : 'Selected object';
    }
    select.value = shown.value;
  }

  const note = document.getElementById('referenceFrameNote');
  if (note) {
    // Only shown while a frame is active. It is a reminder that every number on
    // screen is now measured against something other than the scenario's own
    // coordinates, and in the world frame there is nothing to remind anyone of.
    note.textContent = shown.note;
    note.hidden = !shown.active;
  }

  const btn = document.getElementById('frameToggleBtn');
  if (btn) {
    const sel = state.selectedObject?.object;
    const on = !!sel && frame.mode === OBJECT && frame.objectId === sel.id;
    btn.setAttribute('data-state', on ? 'on' : 'off');
    btn.setAttribute('aria-checked', on ? 'true' : 'false');
    btn.textContent = on ? t('settings.toggle.on') : t('settings.toggle.off');
  }
};

/** Wire the rail's frame selector. */
export const setupReferenceFrameControl = () => {
  const select = document.getElementById('referenceFrameSelect');
  if (select) {
    select.addEventListener('change', () => {
      const value = select.value;
      if (value === OBJECT) {
        const sel = state.selectedObject?.object;
        setFrame(sel ? OBJECT : WORLD, sel ? sel.id : null);
      } else {
        setFrame(value === BARYCENTER ? BARYCENTER : WORLD);
      }
    });
  }
  onFrameChange(paintFrameControls);
  paintFrameControls();
};

// --- The maneuver planner, loaded on demand ----------------------------------
// Most visitors never plan a burn, and the planner drags in the panel and its
// prose. This is what the start-up path sees instead: one function, and an
// import that happens the first time somebody asks for it from the inspector.
// The same shape as js/experimentsBridge.js; the application is reached through
// the command bus in js/appState.js, not by importing ui.js.
let loading = null;

/**
 * Load the planner and hand it what it needs of the application.
 *
 * @returns {Promise<object>} The planner module
 */
export function ensureManeuverPlanner() {
  if (!loading) {
    loading = (async () => {
      const [planner, i18n] = await Promise.all([
        import('./maneuverPlanner.js'),
        import('./i18n/deferredMessages.js'),
      ]);
      await i18n.ensureDeferredMessages().catch(() => {});
      planner.initManeuver({
        captureShareState: command('captureShareState'),
        applyShareState: command('applyShareState'),
        getSettings: () => SETTINGS,
        getScenario: () => current_scenario_name,
      });
      // A rebuilt world is a different set of bodies, so the burns recorded
      // against the old ones are not a log of anything that is on screen.
      window.addEventListener(EV_SIMULATION_RESET, () => {
        planner.resetManeuverPlanner();
      });
      return planner;
    })();
  }
  return loading;
}

/**
 * Open the planner on a body.
 *
 * @param {?number} bodyId - Which body, or null for the first available
 * @returns {Promise<void>}
 */
export async function openManeuverFor(bodyId = null) {
  const planner = await ensureManeuverPlanner();
  planner.openManeuverPlanner(bodyId);
}

/**
 * Listen for the inspector asking for the planner. Called once from start-up.
 *
 * The listener is what keeps the dependency one-way: ui.js announces, this
 * module answers, and nothing in the coordinator has to know that the planner
 * exists.
 *
 * @returns {void}
 */
export function watchForManeuver() {
  window.addEventListener(EV_MANEUVER_REQUESTED, event => {
    openManeuverFor(event.detail?.bodyId ?? null).catch(err =>
      console.error('The maneuver planner could not be loaded:', err)
    );
  });
}

/** @returns {boolean} Whether the planner has been loaded */
export const maneuverPlannerLoaded = () => loading !== null;
