// =============================================================================
// Shared styling for the observing charts
// -----------------------------------------------------------------------------
// Three instruments now draw time series - photometry, radial velocity and
// astrometry - and they have to look like three views of one instrument rather
// than three graphs by three authors. This is the one place that reads the
// design tokens.
//
// The light curve had already solved the hard part of this: a chart whose grid
// lines are hardcoded for a dark theme vanishes in a light one, so every color
// comes from a CSS custom property with a fallback. That solution is lifted here
// verbatim rather than reimplemented, which is the whole point of the file.
// =============================================================================

import { t } from './i18n/index.js';
import { tickLabel } from './format.js';

/**
 * The design tokens the observing charts draw with, each with the fallback a
 * page without the token gets. One table, so the color a chart asks for and
 * the color the whole palette reports cannot drift apart.
 */
const TOKENS = {
  accent: ['--accent', '#4facfe'],
  accentSoft: ['--accent-soft', 'rgba(79, 172, 254, 0.1)'],
  label: ['--text-secondary', '#999'],
  tick: ['--text-muted', '#666'],
  grid: ['--border-subtle', 'rgba(128,128,128,0.25)'],
  // Receding and approaching. Never the only cue: every readout that uses
  // these also says "AWAY FROM US" or "TOWARD US" in words, because a
  // red/blue pair carries no meaning for a red-green color-blind student and
  // none at all for a screen reader.
  warm: ['--danger', '#e2725b'],
  cool: ['--info', '#5b9bd5'],
  // A third model curve, for the rotation-curve panel: the halo and MOND are
  // alternatives and are never drawn at the same time, so a reader comparing
  // them is comparing across a switch and the hue is what carries which is
  // which. Distinguished by dash pattern as well, for the same reason the
  // pair above is always backed by words.
  alt: ['--success', '#3fb950'],
  // The energy chart's second curve (potential energy), beside alt and accent.
  caution: ['--warning', '#d29922'],
  neutral: ['--text-muted', '#888'],
};

/**
 * One theme color, read from the live design tokens now.
 *
 * A chart's colors are functions of this, so the component reads them again on
 * a theme change instead of the page pushing literals into it.
 *
 * @param {keyof TOKENS} name - A key of the palette
 * @returns {string} A CSS color
 */
export function chartColor(name) {
  // A color is asked for again on every draw, and a computed-style read after
  // the draw has changed the chart's markup forces a style recalculation. The
  // palette is what the root's theme and inline variables say, so it is read
  // again only when either changes (a theme change sets the first).
  const root = document.documentElement;
  const key = `${root.getAttribute('data-theme')}|${root.getAttribute('style')}`;
  if (key !== cacheKey) {
    cacheKey = key;
    cache = new Map();
  }
  let color = cache.get(name);
  if (color === undefined) {
    const [token, fallback] = TOKENS[name];
    color = getComputedStyle(root).getPropertyValue(token).trim() || fallback;
    cache.set(name, color);
  }
  return color;
}
let cacheKey = null;
let cache = new Map();

/**
 * Theme colors for an observing chart, read from the live design tokens.
 *
 * Called at build time and again whenever the theme changes, because the tokens
 * are what change; the chart objects are not rebuilt.
 *
 * @returns {{accent: string, accentSoft: string, label: string, tick: string,
 *   grid: string, warm: string, cool: string, alt: string, caution: string,
 *   neutral: string}} Colors
 */
export function chartColors() {
  return Object.fromEntries(Object.keys(TOKENS).map(k => [k, chartColor(k)]));
}

/**
 * An axis tick, written with the figures it needs and no more: "0.1", "12.5",
 * "1.25 × 10³⁹", with a true minus sign and grouped thousands.
 *
 * The chart's ticks are round numbers (multiples of 1, 2, 2.5 or 5 of a power
 * of ten), so each is exact in at most four figures; rounding every tick to
 * two, as the energy chart did, would label 12.5 as 13.
 *
 * @param {number} v - A tick value
 * @returns {string} Its label
 */
export function chartTick(v) {
  let sig = 1;
  while (sig < 6 && Number(v.toPrecision(sig)) !== v) sig++;
  return tickLabel(v, sig);
}

/**
 * A series chart (js/plot/chart.js) in `host`, in the application's words.
 *
 * The component and its words (./plot/mount.js) are fetched here, the first
 * time a chart is wanted, so a page whose chart panels are closed never
 * downloads them. The words a screen reader
 * hears (what the chart is, what the legend is, what a toggle said) come from
 * the catalogue as getters, so a chart built before the language changed
 * speaks the language the page has now.
 *
 * @param {HTMLElement} host - Emptied and drawn into
 * @param {object} options - createChart()'s options; `labels` is added to
 * @returns {Promise<object>} The chart (draw, resize, toPNG, destroy)
 */
export async function mountChart(host, options = {}) {
  const { createChart } = await import('./plot/mount.js');
  return createChart(host, {
    ...options,
    labels: {
      get role() {
        return t('chart.role');
      },
      get legend() {
        return t('chart.legend');
      },
      toggled: (label, shown) =>
        t(shown ? 'chart.shown' : 'chart.hidden', { label }),
    },
  });
}
