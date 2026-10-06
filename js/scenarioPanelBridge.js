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
// their own behavior of appearing with their scenario; all that changes is
// that the code arrives at the same moment rather than half a minute earlier.
//
// Deliberately not a rail chip and deliberately not lazy-on-first-click: a
// scenario-specific instrument should be there when its scenario is, and
// making the reader ask for it twice - once by loading the scenario, once by
// pressing something - would be worse than the kilobytes.
// =============================================================================

import { current_scenario_name } from './appState.js';
import { ensureDeferredMessages } from './i18n/deferredMessages.js';
import {
  loadFragment,
  mountFragment,
  unmountFragment,
} from './i18n/deferredMessages.js';

/**
 * Which scenarios pull in which chunk, and the host of a panel whose markup
 * ships with it (js/fragments/, INDEX_DECOMPOSITION.md).
 */
const PANELS = [
  {
    scenarios: ['binary-planet-lab', 'circumbinary-planet-lab'],
    // Its markup stays in index.html: lessons and tests drive this panel
    // directly, in the same task as the rebuild that fetches it.
    load: () => import('./binaryRunPanel.js'),
    init: m => m.initBinaryRun(),
  },
  {
    scenarios: ['gravity-assist-lab', 'gravity-assist-heliocentric'],
    host: 'assist',
    load: () => import('./assistPanel.js'),
    init: (m, opts) => m.initAssist(opts),
    teardown: m => m.teardownAssist(),
  },
  {
    scenarios: ['lagrange-point-lab'],
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
 * handles every subsequent rebuild itself, which is the behavior it already
 * had when it was imported eagerly.
 *
 * @returns {Promise<void>}
 */
async function loadForScenario() {
  const name = current_scenario_name;
  for (const entry of PANELS) {
    if (!entry.scenarios.includes(name)) continue;
    // The strings for these panels are not in the start-up catalog.
    await ensureDeferredMessages().catch(() => {});
    const [mod, html] = await Promise.all([
      entry.load(),
      entry.host ? loadFragment(entry.host) : null,
    ]);
    if (!loaded.has(mod)) {
      loaded.add(mod);
      // Markup a page already has (a test's own) is wired as it stands.
      const signal = entry.host ? mountFragment(entry.host, html) : null;
      entry.init(mod, { signal: signal ?? undefined });
      // init() subscribes to the reset event, but the reset that triggered
      // this import has already been dispatched, so the first appearance has
      // to be asked for directly.
      mod.notifyScenarioReady?.();
    }
  }
}

/**
 * Unmount a scenario panel; its next scenario brings it back.
 * @param {string} host - 'assist'
 * @returns {Promise<boolean>} Whether it was mounted
 */
export async function unmountScenarioPanel(host) {
  const entry = PANELS.find(p => p.host === host);
  if (!entry) return false;
  const mod = await entry.load();
  if (!loaded.has(mod)) return false;
  entry.teardown(mod);
  loaded.delete(mod);
  return unmountFragment(host);
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
