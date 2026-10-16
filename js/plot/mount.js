// =============================================================================
// js/plot/: the series chart with the application's words
// -----------------------------------------------------------------------------
// What js/observationChart.js fetches the first time a live chart is built: the
// chart (./chart.js) and the catalogs of what a screen reader hears from it
// (../i18n/en.chart.js, ../i18n/es.chart.js), registered here, in one chunk
// and so one request, and in neither start-up catalog (js/i18n/en.js is read by
// the instructor materials, and a string added there makes their bundle stale).
// =============================================================================

import { registerMessages } from '../i18n/index.js';
import { EN_CHART } from '../i18n/en.chart.js';
import { ES_CHART } from '../i18n/es.chart.js';

registerMessages('en', EN_CHART);
registerMessages('es', ES_CHART);

export { createChart } from './chart.js';
