// =============================================================================
// Canvas helpers shared by the lesson instruments
// -----------------------------------------------------------------------------
// Nothing here knows any physics. It exists so a widget can ask for a crisp
// drawing surface and the current theme's colors without repeating the
// device-pixel-ratio arithmetic in every file.
// =============================================================================

/**
 * Read a CSS custom property, with a fallback.
 * @param {string} name - Custom property name
 * @param {string} fallback - Value to use when the token is missing
 * @returns {string} A CSS color
 */
export function token(name, fallback) {
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return v || fallback;
}

/**
 * Set up a canvas for crisp drawing at a chosen CSS height.
 * @param {HTMLCanvasElement} canvas - The target
 * @param {number} height - CSS pixels
 * @returns {{ctx: CanvasRenderingContext2D, w: number, h: number}} Context and size
 */
export function surface(canvas, height) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth || 420;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, height);
  return { ctx, w, h: height };
}

/**
 * A drawing height that fits the window it is in.
 *
 * The instrument panels are docked into a fixed column between the lesson and
 * the transport bar, so on a short window the tallest of them runs out of room
 * and starts scrolling inside itself. Giving up some canvas is a better trade
 * than hiding the controls underneath it.
 *
 * @param {number} base - Height on a tall window
 * @param {number} min - Height on a short one
 * @returns {number} Height in CSS pixels
 */
export function responsiveHeight(base, min) {
  const w = window.innerWidth || 1400;
  const h = window.innerHeight || 900;
  // On a phone the instrument shares the screen with the lesson sheet rather
  // than sitting in a column beside it, so there is far less room than the
  // window height suggests: take the smallest useful picture straight away.
  if (w <= 900) return min;

  // A measurement screen stacks the instrument above its plot in the same
  // column, so the instrument has about three fifths of the height it normally
  // gets. Without allowing for that the picture pushes the widget's own slider
  // and presets below the fold, and a step that says "set the slider" opens
  // with no slider in view. The same viewport-height curve still applies, just
  // over a lower pair of bounds.
  const split =
    typeof document !== 'undefined' &&
    document.body?.classList.contains('investigation-split');
  const top = split ? Math.max(190, min - 60) : base;
  const floor = split ? Math.max(180, min - 70) : min;

  if (h >= 900) return top;
  if (h <= 700) return floor;
  return Math.round(floor + ((top - floor) * (h - 700)) / 200);
}

/** The monospaced face the readouts and axis labels use. */
export const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

/**
 * The theme colors a widget normally needs.
 * @returns {Object} ink, muted, grid, accent, warn, good
 */
export const palette = () => ({
  ink: token('--text-primary', '#e9edf7'),
  muted: token('--text-muted', '#8a8f9e'),
  grid: token('--border-subtle', '#2a2f3d'),
  accent: token('--accent', '#38bdf8'),
  warn: '#f2a65a',
  good: '#8de08a',
});
