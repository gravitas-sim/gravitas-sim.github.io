// =============================================================================
// Loading the experiment bench on demand
// -----------------------------------------------------------------------------
// The bench and the chart it draws are the heaviest thing in the feature, and
// most visitors never open it. This is what the start-up path sees instead: a
// button, and an import that happens the first time somebody presses it.
//
// The same shape as js/view3dBridge.js, and for the same reason. It also owns
// the one piece of glue that cannot live inside the lazy chunk: reading an
// experiment out of a share link at start-up, which has to happen before the
// student has pressed anything.
// =============================================================================

import { t } from './i18n/index.js';

let loading = null;

/**
 * Load the bench and hand it the parts of ui.js it needs.
 *
 * ui.js is imported here, inside the lazy path, rather than at the top of
 * bench.js: a static import would pull the whole application into the bench's
 * chunk and undo the point of deferring it.
 *
 * @returns {Promise<{bench:Object, panel:Object}>} The loaded modules
 */
export function ensureBench() {
  if (!loading) {
    loading = (async () => {
      const [bench, panel, ui, share, render] = await Promise.all([
        import('./experiments/bench.js'),
        import('./experiments/panel.js'),
        import('./ui.js'),
        import('./share.js'),
        import('./render.js'),
      ]);
      bench.initBench({
        captureShareState: ui.captureShareState,
        applyShareState: ui.applyShareState,
        getSettings: () => ui.SETTINGS,
        getScenario: () => ui.current_scenario_name,
        getState: () => ui.state,
        getDefaults: () => ui.DEFAULT_SETTINGS,
        setFixedStep: render.setFixedStep,
      });
      panel.setShareHandler(() => share.openShareDialog());
      return { bench, panel };
    })();
  }
  return loading;
}

/**
 * Whether the bench has already been loaded.
 *
 * The share dialog asks before reaching for an experiment block, so that
 * opening the dialog never pulls in the bench chunk for somebody who has not
 * used it.
 *
 * @returns {boolean} True once ensureBench() has been called
 */
export function benchIsLoaded() {
  return loading !== null;
}

/**
 * Wire the rail button. Called once from start-up.
 * @returns {void}
 */
export function watchForBench() {
  const btn = document.getElementById('toggleExperiments');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const previous = btn.textContent;
    btn.disabled = true;
    try {
      const { panel } = await ensureBench();
      const open = panel.togglePanel();
      btn.setAttribute('aria-pressed', open ? 'true' : 'false');
      btn.dataset.state = open ? 'on' : 'off';
    } catch (err) {
      console.error('The experiment bench could not be loaded:', err);
      btn.textContent = previous;
      const { toast } = await import('./controls.js');
      toast(t('bench.error.load'));
    } finally {
      btn.disabled = false;
    }
  });
}

/**
 * Adopt an experiment that arrived in a share link.
 *
 * Called after the link's world has been built. A link without an `xp` block
 * does nothing here, which is every link made before this feature existed.
 *
 * @param {Object} payload - The decoded share payload
 * @returns {Promise<boolean>} Whether an experiment was adopted
 */
export async function adoptExperimentFromLink(payload) {
  if (!payload?.xp) return false;
  try {
    const [{ readExperimentBlock }, { bench, panel }] = await Promise.all([
      import('./experiments/shareExperiment.js'),
      ensureBench(),
    ]);
    const setup = readExperimentBlock(payload);
    if (!setup.present) return false;
    bench.adoptFromLink(setup, payload);
    panel.openPanel();
    const btn = document.getElementById('toggleExperiments');
    if (btn) {
      btn.setAttribute('aria-pressed', 'true');
      btn.dataset.state = 'on';
    }
    return true;
  } catch (err) {
    console.warn('Could not open the experiment in this link:', err);
    return false;
  }
}
