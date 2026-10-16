// =============================================================================
// Loading pause-at-event on demand
// -----------------------------------------------------------------------------
// The watch and its panel were 34 KB and two requests of every start-up, for a
// panel that starts closed. This is what start-up sees instead: the rail
// button, and an import the first time somebody presses it - or a starting
// panel does, or a lesson arms a watch (js/investigations/eventWatch.js).
//
// Every path loads through ensurePauseAtEvent(), so the timeline marker and a
// screenshot's note see an event whoever armed it. Until the tool is loaded
// nothing can have fired, and both are a null check.
//
// The same shape as js/view3dBridge.js.
// =============================================================================

import { t } from './i18n/index.js';
import {
  loadFragment,
  mountFragment,
  unmountFragment,
} from './i18n/deferredMessages.js';

let loading = null;
let loaded = null;

/**
 * Load the watch and its panel, and wire the panel once.
 * @returns {Promise<{watch: object, panel: object}>} The two modules
 */
export function ensurePauseAtEvent() {
  // Its markup is js/fragments/pause-event.html (INDEX_DECOMPOSITION.md).
  loading ??= Promise.all([
    import('./pauseAtEvent.js'),
    import('./pauseAtEventPanel.js'),
    loadFragment('pause-event'),
  ]).then(([watch, panel, html]) => {
    const signal = mountFragment('pause-event', html);
    panel.initPauseAtEvent({ signal: signal ?? undefined });
    loaded = { watch, panel };
    return loaded;
  });
  return loading;
}

/**
 * Unmount the panel; the rail button's next press loads it afresh.
 * @returns {Promise<boolean>} Whether it was mounted
 */
export async function unmountPauseAtEvent() {
  if (!loading) return false;
  const { panel } = await loading;
  panel.teardownPauseAtEvent();
  loading = null;
  loaded = null;
  const was = unmountFragment('pause-event');
  watchForPauseAtEvent();
  return was;
}

/** @returns {?object} The event that fired last, or null if none could have */
export const lastEvent = () => loaded?.watch.lastEvent() ?? null;

/**
 * The timeline's marker for that event. Called every frame by controls.js.
 * @param {{frameCount: number, simClock: number}} info - From the timeline
 */
export function renderEventMarker(info) {
  loaded?.panel.renderEventMarker(info);
}

/**
 * Wire the rail button. Called once from start-up.
 *
 * The panel attaches its own toggle listener when it loads; this one stands
 * down first, or a click would toggle it twice.
 */
let firstClick = null;

export function watchForPauseAtEvent() {
  const btn = document.getElementById('togglePauseAtEvent');
  if (!btn) return;
  // Called again by unmountPauseAtEvent(); one first-press listener, never two.
  if (firstClick) btn.removeEventListener('click', firstClick);
  firstClick = async () => {
    btn.removeEventListener('click', firstClick);
    btn.disabled = true;
    try {
      const { panel } = await ensurePauseAtEvent();
      // The panel's own listener did not see this click.
      panel.setPauseAtEventEnabled(true);
    } catch (err) {
      console.error('Pause at event could not be loaded:', err);
      loading = null;
      btn.addEventListener('click', firstClick);
      // From the deferred catalog, not a new start-up string: every page that
      // loads the base catalog pays for one, and the Composer has no room.
      // notify.js, not controls.js, which imports this module: the check
      // of the module graph refuses the cycle (tools/check-architecture.mjs).
      const [{ toast }, { ensureDeferredMessages }] = await Promise.all([
        import('./notify.js'),
        import('./i18n/deferredMessages.js'),
      ]);
      await ensureDeferredMessages().catch(() => {});
      toast(t('failure.error', { message: err.message }));
    } finally {
      btn.disabled = false;
    }
  };
  btn.addEventListener('click', firstClick);
}
