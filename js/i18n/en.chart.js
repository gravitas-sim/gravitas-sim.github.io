// =============================================================================
// The live charts' words, in English
// -----------------------------------------------------------------------------
// What a screen reader hears from the series chart (js/plot/chart.js): what
// the chart is, what its legend is, what a toggle said, and a name for each of
// the three live charts. Registered by js/observationChart.js when the first
// chart is built, so no page carries them until a chart is drawn, and kept out
// of js/i18n/en.js, which the instructor materials read.
// =============================================================================

export const EN_CHART = {
  'chart.role': 'line chart',
  'chart.legend': 'Series',
  'chart.shown': '{label} shown',
  'chart.hidden': '{label} hidden',
  'energyChart.label':
    'Energy against time: kinetic, potential and total. Arrow keys read the values.',
  'lightCurve.chartLabel':
    'Relative brightness against time in days. Arrow keys read the values.',
  'rv.chartLabel':
    'Radial velocity in meters per second against time in days. Arrow keys read the values.',
};
