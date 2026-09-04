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

/**
 * Theme colors for an observing chart, read from the live design tokens.
 *
 * Called at build time and again whenever the theme changes, because the tokens
 * are what change; the chart objects are not rebuilt.
 *
 * @returns {{accent: string, accentSoft: string, label: string, tick: string,
 *   grid: string, warm: string, cool: string, neutral: string}} Colors
 */
export function chartColors() {
  const css = getComputedStyle(document.documentElement);
  const token = (name, fallback) =>
    css.getPropertyValue(name).trim() || fallback;
  const accent = token('--accent', '#4facfe');
  return {
    accent,
    accentSoft: token('--accent-soft', 'rgba(79, 172, 254, 0.1)'),
    label: token('--text-secondary', '#999'),
    tick: token('--text-muted', '#666'),
    grid: token('--border-subtle', 'rgba(128,128,128,0.25)'),
    // Receding and approaching. Never the only cue: every readout that uses
    // these also says "AWAY FROM US" or "TOWARD US" in words, because a
    // red/blue pair carries no meaning for a red-green color-blind student and
    // none at all for a screen reader.
    warm: token('--danger', '#e2725b'),
    cool: token('--info', '#5b9bd5'),
    // A third model curve, for the rotation-curve panel: the halo and MOND are
    // alternatives and are never drawn at the same time, so a reader comparing
    // them is comparing across a switch and the hue is what carries which is
    // which. Distinguished by dash pattern as well, for the same reason the
    // pair above is always backed by words.
    alt: token('--success', '#3fb950'),
    neutral: token('--text-muted', '#888'),
  };
}

/**
 * Apply the current theme to an existing Chart.js instance.
 *
 * @param {object} chart - A Chart.js chart
 * @param {object} [options] - Which dataset colors to refresh
 * @param {boolean} [options.recolorDatasets] - Restyle dataset 0 with the accent
 */
export function applyChartTheme(chart, { recolorDatasets = true } = {}) {
  if (!chart) return;
  const t = chartColors();
  if (recolorDatasets && chart.data?.datasets?.[0]) {
    chart.data.datasets[0].borderColor = t.accent;
    chart.data.datasets[0].backgroundColor = t.accentSoft;
  }
  for (const key of Object.keys(chart.options?.scales ?? {})) {
    const axis = chart.options.scales[key];
    if (!axis) continue;
    if (axis.title) axis.title.color = t.label;
    if (axis.ticks) axis.ticks.color = t.tick;
    if (axis.grid) axis.grid.color = t.grid;
  }
  chart.update('none');
}

/**
 * The axis configuration every observing chart shares.
 *
 * @param {string} titleText - Axis label
 * @param {object} [extra] - Merged over the defaults
 * @returns {object} A Chart.js scale configuration
 */
export function observationAxis(titleText, extra = {}) {
  const t = chartColors();
  return {
    title: {
      display: Boolean(titleText),
      text: titleText,
      color: t.label,
      font: { size: 10 },
    },
    ticks: { color: t.tick, maxTicksLimit: 6, font: { size: 9 } },
    grid: { color: t.grid },
    ...extra,
  };
}
