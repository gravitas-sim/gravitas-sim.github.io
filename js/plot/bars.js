// =============================================================================
// js/plot/: a histogram
// -----------------------------------------------------------------------------
// Counts in bins, drawn on ./plot.js's axes. The counts axis marks whole
// numbers only, and always the highest count. A histogram's numbers are a table beside it, the bins and
// their counts, which the page draws: this draws the picture of them.
// =============================================================================

import { axes, el, px, scales, ticks, W, PAD, FH } from './plot.js';

/**
 * @param {SVGSVGElement} svg
 * @param {{edges: number[], counts: number[]}} h - n + 1 edges, n counts
 * @param {{number: Function, xTitle: string, yTitle: string}} words
 */
export function histogram(svg, { edges, counts }, { number, xTitle, yTitle }) {
  svg.setAttribute('viewBox', `0 0 ${W} ${PAD.top + FH + PAD.bottom}`);
  const s = {
    x0: edges[0],
    x1: edges.at(-1),
    y0: 0,
    y1: Math.max(...counts) || 1,
  };
  const sc = scales(s);
  const bins = el('g', { class: 'ow-bins', 'aria-hidden': 'true' });
  counts.forEach((c, i) => {
    const x = sc.sx(edges[i]);
    const y = sc.sy(c);
    bins.append(
      el('rect', {
        x: px(x + 1),
        y: px(y),
        width: px(Math.max(1, sc.sx(edges[i + 1]) - x - 2)),
        height: px(sc.sy(0) - y),
        class: 'ow-bin',
      })
    );
  });
  svg.replaceChildren(
    axes(s, sc, number, xTitle, yTitle, (lo, hi) => [
      ...new Set([...ticks(lo, hi).filter(Number.isInteger), hi]),
    ]),
    bins
  );
}
