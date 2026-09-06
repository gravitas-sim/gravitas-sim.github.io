// =============================================================================
// Loading the export dialog on demand
// -----------------------------------------------------------------------------
// Nobody exports anything on a first visit. The dialog, its file catalogue and
// every CSV builder behind it - light curves, radial velocity measurements, the
// analysis fit, transits, the whole of js/dataExport.js - were in the start-up
// path for the sake of a button in a menu.
//
// This is what start-up keeps: one click handler. The first press fetches the
// chunk, wires it, and opens it; every press after that goes straight through.
// =============================================================================

import { ensureDeferredMessages } from './i18n/deferredMessages.js';

let loading = null;

/**
 * Fetch the dialog and wire it up, once.
 *
 * @returns {Promise<object>} The export dialog module
 */
function ensureDialog() {
  if (!loading) {
    loading = ensureDeferredMessages()
      .then(() => import('./exportDialog.js'))
      .then(mod => {
        mod.initExportDialog();
        return mod;
      });
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
export function initExportBridge() {
  const button = document.getElementById('exportDataBtn');
  if (!button) return;

  let handedOver = false;
  button.addEventListener('click', async () => {
    if (handedOver) return;
    handedOver = true;
    const mod = await ensureDialog();
    mod.openExportDialog();
  });
}

/**
 * Whether the dialog has been loaded.
 *
 * Asked by anything that wants to publish into the export catalogue without
 * pulling the chunk in for somebody who has never opened it.
 *
 * @returns {boolean} True once the chunk has been fetched
 */
export const exportDialogLoaded = () => loading !== null;
