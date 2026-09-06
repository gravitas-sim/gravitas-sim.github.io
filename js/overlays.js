// =============================================================================
// Things drawn over the simulation, registered rather than imported
// -----------------------------------------------------------------------------
// js/render.js draws the world and then a short list of overlays on top of it.
// The light curve's observer indicator is imported there directly, which is
// fine for something in the start-up bundle and wrong for anything lazy: a
// static import from the render loop would pull the whole panel into
// everybody's download to draw something almost nobody switches on.
//
// So a lazily loaded overlay registers itself here instead, and the loop asks
// this module rather than knowing what is in it. The registry is a few lines
// and always resident; what it holds arrives when somebody asks for it.
// =============================================================================

/** @type {Set<Function>} Drawers, called in registration order. */
const overlays = new Set();

/**
 * Add an overlay to the render loop.
 *
 * @param {Function} draw - (ctx, width, height) => void
 * @returns {Function} Call it to remove the overlay again
 */
export function registerOverlay(draw) {
  if (typeof draw !== 'function') return () => {};
  overlays.add(draw);
  return () => overlays.delete(draw);
}

/**
 * Draw every registered overlay.
 *
 * A drawer that throws is reported once per frame and skipped, because a
 * broken overlay must not take the simulation down with it - the world is
 * still being integrated correctly underneath.
 *
 * @param {CanvasRenderingContext2D} ctx - The simulation canvas
 * @param {number} width - Canvas width in device pixels
 * @param {number} height - Canvas height
 * @returns {void}
 */
export function drawOverlays(ctx, width, height) {
  for (const draw of overlays) {
    try {
      draw(ctx, width, height);
    } catch (err) {
      console.warn('An overlay failed to draw:', err);
    }
  }
}

/** @returns {number} How many overlays are registered */
export const overlayCount = () => overlays.size;
