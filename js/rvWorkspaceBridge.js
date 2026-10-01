// =============================================================================
// Loading the radial velocity workspace on demand
// -----------------------------------------------------------------------------
// The same shape as js/experimentsBridge.js and for the same reason: most
// visitors never take a recording, and the workspace draws its own charts. This
// is what the start-up path sees instead - a function, and an import that
// happens the first time somebody asks to analyze something.
//
// The fitting core has no dependencies at all, so the chunk this pulls in is
// the two modules and nothing else.
// =============================================================================

import { ensureDeferredMessages } from './i18n/deferredMessages.js';
import {
  loadFragment,
  mountFragment,
  unmountFragment,
} from './i18n/deferredMessages.js';

let loading = null;

/**
 * Load the workspace and its panel.
 *
 * @returns {Promise<{workspace: object, panel: object}>} The loaded modules
 */
export function ensureRvWorkspace() {
  if (!loading) {
    loading = (async () => {
      await ensureDeferredMessages().catch(() => {});
      // Its markup is js/fragments/rv-workspace.html, mounted before the
      // panel wires it (INDEX_DECOMPOSITION.md).
      const [workspace, panel, dataExport, html] = await Promise.all([
        import('./rvWorkspace.js'),
        import('./rvWorkspacePanel.js'),
        import('./dataExport.js'),
        loadFragment('rv-workspace'),
      ]);
      const signal = mountFragment('rv-workspace', html);
      panel.initRvWorkspacePanel({ signal: signal ?? undefined });
      // Published rather than imported the other way round: dataExport.js is
      // in the start-up path and must not reach into this chunk.
      dataExport.setRvFitReporter(() => workspace.exportReport());
      return { workspace, panel };
    })();
  }
  return loading;
}

/**
 * Unmount the panel; the next request loads it afresh.
 * @returns {Promise<boolean>} Whether it was mounted
 */
export async function unmountRvWorkspace() {
  if (!loading) return false;
  const { panel } = await loading;
  panel.teardownRvWorkspacePanel();
  loading = null;
  return unmountFragment('rv-workspace');
}

/** @returns {boolean} Whether the workspace has already been loaded */
export const rvWorkspaceLoaded = () => loading !== null;

/**
 * Open the workspace on a recording.
 *
 * The one entry point the rest of the application needs. Everything heavier
 * than this function lives behind the import.
 *
 * @param {object} recording - points, config and provenance
 * @returns {Promise<void>}
 */
export async function openRvWorkspace(recording) {
  const { workspace, panel } = await ensureRvWorkspace();
  workspace.loadRecording(recording);
  panel.setRvWorkspaceEnabled(true);
}
