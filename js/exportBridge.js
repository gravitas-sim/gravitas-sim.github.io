// =============================================================================
// Loading the export dialog on demand
// -----------------------------------------------------------------------------
// Nobody exports anything on a first visit. The dialog, its file catalog and
// every CSV builder behind it - light curves, radial velocity measurements, the
// analysis fit, transits, the whole of js/dataExport.js - were in the start-up
// path for the sake of a button in a menu.
//
// This is what start-up keeps: one click handler. The first press fetches the
// chunk, wires it, and opens it; every press after that goes straight through.
// =============================================================================

import { ensureDeferredMessages } from './i18n/deferredMessages.js';
import {
  loadFragment,
  mountFragment,
  unmountFragment,
} from './i18n/deferredMessages.js';

let loading = null;

/** Whether the first press has been handed to the dialog's own toggle. */
let handedOver = false;

/**
 * Fetch the dialog and wire it up, once.
 *
 * @returns {Promise<object>} The export dialog module
 */
function ensureDialog() {
  if (!loading) {
    // The prose is nice to have; the dialog is the point. A failure to fetch
    // the strings must not stop the dialog opening - it would show message ids,
    // which is visible and recoverable, where not opening is neither.
    // Its markup is js/fragments/export.html (INDEX_DECOMPOSITION.md).
    loading = ensureDeferredMessages()
      .catch(() => {})
      .then(() =>
        Promise.all([import('./exportDialog.js'), loadFragment('export')])
      )
      .then(([mod, html]) => {
        const signal = mountFragment('export', html);
        mod.initExportDialog({ signal: signal ?? undefined });
        return mod;
      });
    loading.catch(() => (loading = null));
  }
  return loading;
}

/**
 * Put the one handler start-up needs on the export button.
 *
 * The dialog installs its own handler on the same button when it loads, so the
 * first press is handled here and opens it explicitly; later presses are the
 * dialog's own toggle. This one steps aside after the first press rather than
 * competing with it.
 *
 * @returns {void}
 */
/**
 * Open the export dialog from anywhere - the E shortcut - initialising it
 * first. Importing the dialog's module and calling open, as the shortcut did,
 * opened nothing until Export had been pressed once.
 * @returns {Promise<void>}
 */
export async function openExport() {
  (await ensureDialog()).openExportDialog();
}

export function initExportBridge() {
  const button = document.getElementById('exportDataBtn');
  if (!button) return;

  button.addEventListener('click', async () => {
    if (handedOver) return;
    handedOver = true;
    const mod = await ensureDialog();
    mod.openExportDialog();
  });
}

/**
 * Unmount the dialog; the button's next press loads it afresh.
 * @returns {Promise<boolean>} Whether it was mounted
 */
export async function unmountExport() {
  if (!loading) return false;
  const mod = await loading;
  mod.teardownExportDialog();
  loading = null;
  handedOver = false;
  return unmountFragment('export');
}

/**
 * Whether the dialog has been loaded.
 *
 * Asked by anything that wants to publish into the export catalog without
 * pulling the chunk in for somebody who has never opened it.
 *
 * @returns {boolean} True once the chunk has been fetched
 */
export const exportDialogLoaded = () => loading !== null;
