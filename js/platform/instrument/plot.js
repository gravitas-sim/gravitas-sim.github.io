// =============================================================================
// The public face of the plotting component
// -----------------------------------------------------------------------------
// Imported as `gravitas:instrument/plot`. `createPlot(svg, hooks)` is the same
// accessible SVG plot the Observatory draws (PLOT_COMPONENT.md): a table of
// columns with unit ids, min-max decimation, masks, uncertainty bars, keyboard
// selection. `ticks(lo, hi, count)` is its tick chooser, useful alone.
// An instrument's own `draw(canvas, values)` stays a canvas drawing, so these
// are for what builds DOM: a vendored page or panel, not a lesson instrument.
// =============================================================================

export { createPlot, ticks } from '../../plot/plot.js';
