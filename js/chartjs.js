// =============================================================================
// Loading Chart.js on demand
// -----------------------------------------------------------------------------
// Chart.js is 70KB from a CDN, and it was loaded by a plain script tag on every
// visit. Two panels use it - the light curve and the energy chart in the object
// inspector - and both start closed.
//
// Both consumers already read the global `Chart`, so nothing about how they use
// it changes: they await this first, and the global is there when they do.
// =============================================================================

const SRC = 'https://cdn.jsdelivr.net/npm/chart.js@4.5.1/dist/chart.umd.min.js';

let loading = null;

/**
 * Ensure Chart.js is available.
 *
 * @returns {Promise<Function|null>} The Chart constructor, or null if the
 *   script could not be fetched. Callers degrade rather than throw: a panel
 *   without its chart is a worse panel, not a broken application.
 */
export function ensureChartJs() {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.Chart) return Promise.resolve(window.Chart);

  if (!loading) {
    loading = new Promise(resolve => {
      const el = document.createElement('script');
      el.src = SRC;
      el.async = true;
      el.onload = () => resolve(window.Chart ?? null);
      el.onerror = () => {
        console.error('Chart.js could not be loaded from the CDN.');
        // Not cached as a failure: a visitor who regains their connection and
        // opens the panel again should get another attempt.
        loading = null;
        resolve(null);
      };
      document.head.appendChild(el);
    });
  }
  return loading;
}
