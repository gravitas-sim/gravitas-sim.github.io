// =============================================================================
// /experiments/: a run's result, drawn by js/plot/
// -----------------------------------------------------------------------------
// js/experimentsPage.js imports this when it shows a result, so the page's
// first load carries no plotting code (PLOT_COMPONENT.md, D5). Each trial's
// value against the parameter, each value's mean as a line, and a trial with
// no measurement as a cross on the axis. Across more than two orders of
// magnitude of positive values the value axis is logarithmic, and says so.
// The summary table beside it is the same numbers, for anybody who cannot
// see it, and the plot's label says so.
//
// Everything of the page's arrives in `words`, as the analysis laboratory's
// does: a module both this chunk and the page's start-up reached would be
// split into a chunk of its own, one more request for every visitor.
// =============================================================================

import { FH, PAD, createPlot, el } from '../plot/plot.js';
import { log10, wantsLog } from '../plot/log.js';
import { parseUnit } from '../observatory/units.js';

/**
 * @param {SVGSVGElement} svg - #xpPlot
 * @param {object} result - The experiment's result
 * @param {string} metric - What is plotted
 * @param {string} key - The parameter it was varied against
 * @param {{t: Function, number: Function, unit: string, measured: Function}}
 *   words - measured(trial) says whether a trial has the metric
 */
export function drawResult(svg, result, metric, key, words) {
  const { t, number, unit = '', measured } = words;
  const trials = result.trials;
  const name = t(`exp.metric.${metric}`);
  // A unit the registry reads is the axis's; any other is said in its name.
  const known = Boolean(unit) && parseUnit(unit).ok;
  const ys = Float64Array.from(trials, tr =>
    measured(tr) ? tr.results[metric] : NaN
  );
  const o = {
    kind: 'time-series',
    masks: [],
    columns: [
      {
        id: 'x',
        name: t(`exp.param.${key}`),
        unit: '',
        role: 'x',
        values: Float64Array.from(trials, tr => tr.params[key]),
      },
      {
        id: 'y',
        name: known || !unit ? name : `${name} (${unit})`,
        unit: known ? unit : '',
        role: 'value',
        values: ys,
      },
    ],
  };
  const log = wantsLog(ys);
  const means = result.summary.metrics[metric].filter(g => g.mean !== null);
  const plot = createPlot(svg, {
    number,
    explain: 'plot-experiment',
    labels: { notStated: '' },
  });
  plot.draw(o, {
    xColumn: 'x',
    yColumn: 'y',
    yScale: log ? log10 : null,
    overlays:
      means.length > 1
        ? [{ label: 'mean', points: means.map(g => [g.params[key], g.mean]) }]
        : [],
  });
  const text = (words, attrs) => {
    const e = el('text', attrs);
    e.textContent = words;
    svg.append(e);
  };
  if (log)
    text(t('exp.plot.log'), {
      x: PAD.left + 6,
      y: PAD.top + 12,
      class: 'xp-tick',
    });
  const failed = trials.filter(tr => !measured(tr));
  for (const tr of failed)
    text('×', {
      x: plot.sx(tr.params[key]),
      y: PAD.top + FH - 4,
      class: 'xp-fail',
      'text-anchor': 'middle',
    });
  svg.setAttribute(
    'aria-label',
    t('exp.plot.label', {
      metric: name,
      param: t(`exp.param.${key}`),
      ok: trials.length - failed.length,
      failed: failed.length,
    })
  );
}
