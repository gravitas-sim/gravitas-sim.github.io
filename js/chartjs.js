// =============================================================================
// Loading Chart.js on demand
// -----------------------------------------------------------------------------
// Nothing calls it now: the experiment bench's comparison and sweep were the
// last two charts on it, and they draw with js/plot/chart.js since D-PLOT-02
// stage 3c (as the energy chart, the light curve and the radial-velocity trace
// did since stage 3b). It, the vendor entry and the package dependency go in
// stage 4; until then tests/chartParity.test.js pins that no module imports it.
//
// It was loaded when a chart first opened, and used to be a <script> tag
// pointing at jsdelivr.
// That made a third-party request during ordinary use, could not be pinned by
// the lockfile, and could not be served offline. It is now a dynamic import of
// vendor/chartjs/chart.js, bundled from the pinned package by
// tools/vendor-deps.mjs - so esbuild puts it in its own deferred chunk and the
// service worker can precache it.
//
// Its consumers read the global `Chart`, so it is still published there.
// =============================================================================

let loading = null;

/**
 * Ensure Chart.js is available.
 *
 * @returns {Promise<Function|null>} The Chart constructor, or null if the
 *   chunk could not be fetched. Callers degrade rather than throw: a panel
 *   without its chart is a worse panel, not a broken application.
 */
export function ensureChartJs() {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.Chart) return Promise.resolve(window.Chart);

  if (!loading) {
    loading = import('../vendor/chartjs/chart.js')
      .then(mod => {
        const Chart = mod.Chart ?? mod.default ?? null;
        if (Chart) window.Chart = Chart;
        return Chart;
      })
      .catch(err => {
        console.error('Chart.js could not be loaded.', err);
        // Not cached as a failure: a visitor whose connection came back should
        // get another attempt the next time they open the panel.
        loading = null;
        return null;
      });
  }
  return loading;
}
