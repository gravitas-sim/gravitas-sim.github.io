// =============================================================================
// Loading the spacetime view on demand
// -----------------------------------------------------------------------------
// The 3-D view is built on three.js, which is 256KB from a CDN. It was being
// fetched on every visit, before the splash had finished, for a panel that
// starts closed and that most visitors never open.
//
// This module is what the start-up path and the render loop see instead. It
// holds the toggle button, and the first time anyone presses it the real module
// arrives with three.js behind it. Until then the per-frame call is a null
// check.
//
// The render loop cannot import view3d.js directly for the same reason, so the
// updater is handed over here once the module has loaded.
// =============================================================================

import { t } from './i18n/index.js';

let loading = null;
let updater = null;

/**
 * Advance the 3-D scene, if there is one.
 *
 * Called every frame by the renderer. Before the view has ever been opened this
 * is a property read and a comparison, which is cheaper than the guard clause
 * it replaced.
 *
 * @param {number} timestamp - Frame timestamp
 */
export function update3DScene(timestamp) {
  if (updater) updater(timestamp);
}

/**
 * Load the spacetime view and wire it up, once.
 * @returns {Promise<Object>} The view3d module
 */
export function ensureView3D() {
  if (!loading) {
    loading = import('./view3d.js').then(mod => {
      mod.init3DView();
      updater = mod.update3DScene;
      return mod;
    });
  }
  return loading;
}

/**
 * Wire the toggle button. Called once from start-up.
 *
 * The button carries its own listener until the module loads, at which point
 * init3DView() attaches the real one and this stands down: leaving both
 * attached would toggle the view twice per click.
 */
export function watchFor3DView() {
  const btn = document.getElementById('toggle3DView');
  if (!btn) return;

  const firstClick = async () => {
    btn.removeEventListener('click', firstClick);
    // Loading three.js over a slow connection is not instant, and a button
    // that looks inert is a button people press again.
    const previous = btn.textContent;
    btn.textContent = 'Loading…';
    btn.disabled = true;
    try {
      const mod = await ensureView3D();
      btn.disabled = false;
      // init3DView() has attached its own handler by now, but it did not see
      // this click, so the first activation is completed here.
      mod.set3DViewEnabled?.(true);
    } catch (err) {
      console.error('The spacetime view could not be loaded:', err);
      btn.textContent = previous;
      btn.disabled = false;
      const { toast } = await import('./controls.js');
      toast(t('view3d.loadFailed'));
    }
  };

  btn.addEventListener('click', firstClick);
}
