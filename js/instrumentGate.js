// =============================================================================
// Observing panels fetched on the first press of their rail button
// -----------------------------------------------------------------------------
// The first press fetches the panel's module, lets it wire its own controls and
// opens it; the button is disabled meanwhile and a failure offers the press
// again (js/notify.js, as js/experimentsBridge.js does). The render loop's
// per-frame update does nothing until the module is here, as the panel's own
// does while it is closed. The rotation curve is the first; its numbers, which
// the data export and the lesson probes read, are in js/rotationCurveState.js.
// =============================================================================

import { loadFailed } from './notify.js';

/**
 * Open a panel on the first press of its button, fetching it first.
 *
 * @param {object} options - What to wire
 * @param {string} options.buttonId - The rail button's id
 * @param {() => Promise<object>} options.load - Fetches and initialises the
 *   module; may be called again after a failure
 * @param {(mod: object) => void} options.open - What the first press does once
 *   the module is here
 * @returns {void}
 */
export function watchForPanel({ buttonId, load, open }) {
  const button = document.getElementById(buttonId);
  if (!button) return;
  const first = async () => {
    if (button.disabled) return;
    button.disabled = true;
    try {
      const mod = await load();
      // The module wired its own click handler as it was initialised; this one
      // has done its single job.
      button.removeEventListener('click', first);
      open(mod);
    } catch (err) {
      console.error(`${buttonId}: the panel could not be loaded:`, err);
      loadFailed(() => button.click(), err);
    } finally {
      button.disabled = false;
    }
  };
  button.addEventListener('click', first);
}

// --- The rotation curve --------------------------------------------------------
let rotationCurve = null;
let rotationCurveLoading = null;

/**
 * Fetch the rotation-curve panel once and let it wire itself.
 *
 * @returns {Promise<object>} The panel's module
 */
function loadRotationCurve() {
  rotationCurveLoading ??= import('./rotationCurve.js').then(
    mod => {
      mod.initRotationCurve();
      rotationCurve = mod;
      return mod;
    },
    err => {
      rotationCurveLoading = null;
      throw err;
    }
  );
  return rotationCurveLoading;
}

/** Wire the rail's Rotation Curve button. Called once at start-up. */
export const initRotationCurve = () =>
  watchForPanel({
    buttonId: 'toggleRotationCurve',
    load: loadRotationCurve,
    open: mod => mod.setRotationCurveEnabled(true),
  });

/** Redraw the panel if it has ever been opened. Called from the render loop. */
export const updateRotationCurve = () => rotationCurve?.updateRotationCurve();
