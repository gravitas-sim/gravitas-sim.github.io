// =============================================================================
// Loading a scenario's own instrument when that scenario loads
// -----------------------------------------------------------------------------
// Three panels in this application are not general tools. The Binary Planet Run
// readout means nothing outside the two binary labs, and the Gravity Assist
// two-frame comparison means nothing outside the two assist scenarios - four
// scenarios out of fifty-seven between them. Both were being imported at
// start-up by every visitor, along with the recorders behind them.
//
// This is what the start-up path sees instead: a listener, and an import that
// happens when a scenario that needs one is actually loaded. The panels keep
// their own behaviour of appearing with their scenario; all that changes is
// that the code arrives at the same moment rather than half a minute earlier.
//
// Deliberately not a rail chip and deliberately not lazy-on-first-click: a
// scenario-specific instrument should be there when its scenario is, and
// making the reader ask for it twice - once by loading the scenario, once by
// pressing something - would be worse than the kilobytes.
// =============================================================================

import { current_scenario_name } from './appState.js';
import { ensureDeferredMessages } from './i18n/deferredMessages.js';

/** Which scenarios pull in which chunk. */
const PANELS = [
  {
    scenarios: ['Binary Planet Lab', 'Circumbinary Planet Lab'],
    load: () => import('./binaryRunPanel.js'),
    init: m => m.initBinaryRun(),
  },
  {
    scenarios: ['Gravity Assist Lab', 'Gravity Assist: Heliocentric'],
    load: () => import('./assistPanel.js'),
    init: m => m.initAssist(),
  },
  {
    scenarios: ['Lagrange Point Lab'],
    load: () => import('./cr3bpPanel.js'),
    init: m => m.initCr3bp(),
  },
];

/** Chunks already fetched, so a rebuild does not import twice. */
const loaded = new WeakSet();

/**
 * Load whichever panel the current scenario needs, if any.
 *
 * The panel's own init() wires its DOM and subscribes it to the reset event,
 * so it takes over from here. It is called once per chunk: the panel then
 * handles every subsequent rebuild itself, which is the behaviour it already
 * had when it was imported eagerly.
 *
 * @returns {Promise<void>}
 */
async function loadForScenario() {
  const name = current_scenario_name;
  for (const entry of PANELS) {
    if (!entry.scenarios.includes(name)) continue;
    // The strings for these panels are not in the start-up catalogue.
    await ensureDeferredMessages().catch(() => {});
    const mod = await entry.load();
    if (!loaded.has(mod)) {
      loaded.add(mod);
      entry.init(mod);
      // init() subscribes to the reset event, but the reset that triggered
      // this import has already been dispatched, so the first appearance has
      // to be asked for directly.
      mod.notifyScenarioReady?.();
    }
  }
}

/** Start watching for scenarios that bring their own instrument. */
export function initScenarioPanels() {
  window.addEventListener('gravitasSimulationReset', () => {
    // Errors here must not stop the other reset listeners: a panel that fails
    // to load is a missing readout, not a broken simulation.
    loadForScenario().catch(err =>
      console.warn('A scenario panel failed to load:', err)
    );
  });
}
