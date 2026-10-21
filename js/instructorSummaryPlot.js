// =============================================================================
// One measured quantity of the class, drawn by js/plot/ (Prompt 173)
// -----------------------------------------------------------------------------
// Each report's value of the quantity, ordered by value along the x axis, with
// the uncertainty that report's evidence table states as a bar: one standard
// deviation where it states a sigma, the interval's edges where it states an
// interval, none where it states none (a plot without a bar is not a claim of
// precision; the table beside it says which). Ordering the values shows the
// class's spread and where its stated uncertainties do and do not cover it
// without naming anyone: the x position is a rank, never a report.
//
// js/instructorSummaryView.js imports this on the first plot, so a page with
// nothing measured never fetches the plot component. It is named
// js/instructor*.js so the service worker installs it with the instructor
// modules (tools/build-service-worker.mjs).
// =============================================================================

import { createPlot } from './plot/plot.js';
import { parseUnit } from './observatory/units.js';

/**
 * @param {SVGSVGElement} svg - The slot summaryHtml() left
 * @param {object} group - One of the summary's measured groups
 * @param {{t: Function, number: Function}} words - The page's
 * @returns {{drawn: number, plotted: number}} What the plot drew
 */
export function drawGroup(svg, group, { t, number }) {
  const pts = group.points;
  const known = Boolean(group.unit) && parseUnit(group.unit).ok;
  // The bar's two ends as offsets from the value: a sigma is symmetric, an
  // interval is whatever its edges say. NaN is "no bar for this report".
  const lower = p =>
    !p.bar
      ? NaN
      : p.bar.sigma !== undefined
        ? -p.bar.sigma
        : p.bar.lo - p.value;
  const upper = p =>
    !p.bar ? NaN : p.bar.sigma !== undefined ? p.bar.sigma : p.bar.hi - p.value;
  const unit = known ? group.unit : '';
  const name =
    known || !group.unit ? group.quantity : `${group.quantity} (${group.unit})`;
  const o = {
    kind: 'time-series',
    masks: [],
    columns: [
      {
        id: 'x',
        name: t('sub.sum.plot.x'),
        unit: '',
        role: 'x',
        values: Float64Array.from(pts, p => p.rank),
      },
      {
        id: 'y',
        name,
        unit,
        role: 'value',
        values: Float64Array.from(pts, p => p.value),
      },
      {
        id: 'lo',
        name,
        unit,
        role: 'lower',
        of: 'y',
        values: Float64Array.from(pts, lower),
      },
      {
        id: 'hi',
        name,
        unit,
        role: 'upper',
        of: 'y',
        values: Float64Array.from(pts, upper),
      },
    ],
  };
  const plot = createPlot(svg, { number, labels: { notStated: '' } });
  return plot.draw(o, { xColumn: 'x', yColumn: 'y' });
}
