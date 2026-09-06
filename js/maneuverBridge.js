// =============================================================================
// Loading the manoeuvre planner on demand
// -----------------------------------------------------------------------------
// Most visitors never plan a burn, and the planner drags in the panel and its
// prose. This is what the start-up path sees instead: one function, and an
// import that happens the first time somebody asks for it from the inspector.
//
// The same shape as js/experimentsBridge.js, and for the same reason: ui.js is
// imported inside the lazy path rather than at the top, because a static
// import would pull the whole application into this chunk and undo the point.
// =============================================================================

let loading = null;

/**
 * Load the planner and hand it the parts of ui.js it needs.
 *
 * @returns {Promise<object>} The planner module
 */
export function ensureManeuverPlanner() {
  if (!loading) {
    loading = (async () => {
      const [planner, ui, i18n] = await Promise.all([
        import('./maneuverPlanner.js'),
        import('./ui.js'),
        import('./i18n/deferredMessages.js'),
      ]);
      await i18n.ensureDeferredMessages();
      planner.initManeuver({
        captureShareState: ui.captureShareState,
        applyShareState: ui.applyShareState,
        getSettings: () => ui.SETTINGS,
        getScenario: () => ui.current_scenario_name,
      });
      // A rebuilt world is a different set of bodies, so the burns recorded
      // against the old ones are not a log of anything that is on screen.
      window.addEventListener('gravitasSimulationReset', () => {
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

/** @returns {boolean} Whether the planner has been loaded */
export const maneuverPlannerLoaded = () => loading !== null;
