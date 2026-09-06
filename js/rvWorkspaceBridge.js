// =============================================================================
// Loading the radial velocity workspace on demand
// -----------------------------------------------------------------------------
// The same shape as js/experimentsBridge.js and for the same reason: most
// visitors never take a recording, and the workspace draws its own charts. This
// is what the start-up path sees instead - a function, and an import that
// happens the first time somebody asks to analyse something.
//
// The fitting core has no dependencies at all, so the chunk this pulls in is
// the two modules and nothing else.
// =============================================================================

let loading = null;

/**
 * Load the workspace and its panel.
 *
 * @returns {Promise<{workspace: object, panel: object}>} The loaded modules
 */
export function ensureRvWorkspace() {
  if (!loading) {
    loading = (async () => {
      const [workspace, panel, dataExport] = await Promise.all([
        import('./rvWorkspace.js'),
        import('./rvWorkspacePanel.js'),
        import('./dataExport.js'),
      ]);
      // Published rather than imported the other way round: dataExport.js is
      // in the start-up path and must not reach into this chunk.
      dataExport.setRvFitReporter(() => workspace.exportReport());
      return { workspace, panel };
    })();
  }
  return loading;
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
