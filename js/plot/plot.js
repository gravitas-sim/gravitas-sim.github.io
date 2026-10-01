// =============================================================================
// js/plot/: one plotting component (PLOT_COMPONENT.md). This is its core.
// -----------------------------------------------------------------------------
// SVG, drawn by hand, because what it draws is small and has to be honest.
// The data is a table of columns with unit ids, as an observation is
// (js/observatory/schema.js). The core only draws: selecting rows is
// ./select.js and the rows as a table ./table.js, so a route pays only for
// what its charts do.
//
// - **Every row is in the data; not every row is always drawn.** Past about
//   two points per pixel column a line or a scatter shows nothing more, so a
//   long series is drawn as the lowest and highest point in each column
//   (min-max decimation, which keeps every dip and spike a reader could see).
//   The plot then says how many of how many it drew, and that the table and
//   every export hold all of them. drawnCount() is what the caption quotes.
// - **Masked rows are drawn hollow and gray**, not hidden: a mask says a row
//   is left out of what is computed, not that it never existed.
// - **Uncertainty is drawn where the data has it** - one standard deviation
//   as a bar, an interval as a bar to its edges - and where it has none, the
//   page says so; a plot without bars is not a claim of precision.
// =============================================================================

import { formatUnit, parseUnit } from '../observatory/units.js';
import { columnOf, maskedRows, uncertaintyOf } from '../observatory/schema.js';

const NS = 'http://www.w3.org/2000/svg';
export const W = 720;
const H = 380;
export const PAD = { left: 70, right: 16, top: 14, bottom: 46 };
/** The frame's width and height, inside the axes. */
const FW = W - PAD.left - PAD.right;
export const FH = H - PAD.top - PAD.bottom;
/** Points drawn per pixel column before decimation starts. */
const PER_COLUMN = 2;

export const el = (name, attrs = {}) => {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
};

/** A coordinate as the markup writes it. */
const px = v => v.toFixed(1);

/** Round, readable tick values across a range. */
export function ticks(lo, hi, count = 5) {
  if (!(hi > lo)) return [lo];
  const raw = (hi - lo) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw) || raw;
  const out = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-9; v += step) {
    out.push(Number(v.toPrecision(12)));
  }
  return out;
}

/**
 * Which rows to draw: all of them, or the lowest and highest in each pixel
 * column when there are more than the plot can show.
 * @returns {number[]} Row indices, in x order
 */
export function decimate(order, xs, ys, x0, x1, columns) {
  if (order.length <= columns * PER_COLUMN) return order;
  const lo = new Map();
  const hi = new Map();
  const span = x1 - x0 || 1;
  for (const i of order) {
    const c = Math.min(
      columns - 1,
      Math.floor(((xs[i] - x0) / span) * columns)
    );
    if (!lo.has(c) || ys[i] < ys[lo.get(c)]) lo.set(c, i);
    if (!hi.has(c) || ys[i] > ys[hi.get(c)]) hi.set(c, i);
  }
  const keep = new Set([...lo.values(), ...hi.values()]);
  return order.filter(i => keep.has(i));
}

/**
 * Which rows of a scatter plot to draw: all of them, or one in each small
 * cell of the plot when there are more than it can show. A table's points are
 * a cloud, not a curve: thinned by pixel column, as a series is, a
 * color-magnitude diagram would keep only its top and bottom edges.
 * @returns {number[]} Row indices, in x order
 */
export function decimateGrid(order, xs, ys, x0, x1, y0, y1, columns, rows) {
  if (order.length <= columns * rows) return order;
  const seen = new Set();
  const out = [];
  const sx = (x1 - x0) / columns || 1;
  const sy = (y1 - y0) / rows || 1;
  for (const i of order) {
    const key = `${Math.floor((xs[i] - x0) / sx)},${Math.floor((ys[i] - y0) / sy)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(i);
  }
  return out;
}

/** An axis title: the column's name and its unit, or that none is stated. */
export const axisTitle = (c, notStated) =>
  `${c.name} (${formatUnit(parseUnit(c.unit).unit, notStated)})`.replace(
    ' ()',
    ''
  );

// Each plot's clip region needs an id of its own: two plots, one page.
let plots = 0;

/**
 * @param {SVGSVGElement} svg
 * @param {{number: Function, labels: object}} hooks - number(v) writes a
 *   tick; labels holds the translated words the plot draws
 */
export function createPlot(svg, hooks) {
  const clipId = `owPlotClip${++plots}`;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  let state = null;

  const sx = x => PAD.left + ((x - state.x0) / (state.x1 - state.x0 || 1)) * FW;
  // Magnitudes are drawn brighter-up.
  const sy = y => {
    const f = ((y - state.y0) / (state.y1 - state.y0 || 1)) * FH;
    return state.flip ? PAD.top + f : H - PAD.bottom - f;
  };
  const dot = (i, r, cls) =>
    el('circle', {
      cx: px(sx(state.xs[i])),
      cy: px(sy(state.ys[i])),
      r,
      class: cls,
    });

  /**
   * Draw a table of columns.
   * @param {object} o - The columns, masks and kind
   * @param {{xColumn: string, yColumn: string, selection?: object,
   *   overlays?: Array<{label: string, points: Array<[number, number]>}>}} view
   *   - selection is ./select.js's, for a view that shows one; overlays are
   *   curves drawn over the points in the axes' own units: a model to compare
   *   with, say. A break in a curve is a point that is not finite.
   */
  function draw(o, { xColumn, yColumn, selection = null, overlays = [] }) {
    const xc = columnOf(o, xColumn);
    const yc = columnOf(o, yColumn);
    const xs = xc.values;
    const ys = yc.values;
    const masked = maskedRows(o);
    const { sigma, lower, upper } = uncertaintyOf(o, yColumn);
    const order = [];
    for (let i = 0; i < xs.length; i++) {
      if (Number.isFinite(xs[i]) && Number.isFinite(ys[i])) order.push(i);
    }
    order.sort((a, b) => xs[a] - xs[b] || a - b);
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    // A table's range is its values': one faint star's error bar of several
    // magnitudes would otherwise stretch a whole color-magnitude diagram.
    const withBars = o.kind !== 'table';
    const at = (c, i) => (c && withBars ? c.values[i] : 0);
    const finite = v => (Number.isFinite(v) ? v : 0);
    for (const i of order) {
      x0 = Math.min(x0, xs[i]);
      x1 = Math.max(x1, xs[i]);
      const e = finite(at(sigma, i));
      y0 = Math.min(y0, ys[i] - e + Math.min(finite(at(lower, i)), 0));
      y1 = Math.max(y1, ys[i] + e + Math.max(finite(at(upper, i)), 0));
    }
    if (!order.length) {
      x0 = 0;
      x1 = 1;
      y0 = 0;
      y1 = 1;
    }
    const padY = (y1 - y0) * 0.05 || Math.abs(y0) * 0.05 || 1;
    const padX = x1 === x0 ? Math.abs(x0) * 0.05 || 1 : 0;
    state = {
      o,
      xs,
      ys,
      order,
      position: new Map(order.map((r, k) => [r, k])),
      selection,
      x0: x0 - padX,
      x1: x1 + padX,
      y0: y0 - padY,
      y1: y1 + padY,
      // A column's unit is a canonical id (js/observatory/schema.js), so this
      // is every magnitude.
      flip: yc.unit === 'mag',
    };
    const columns = FW;
    const drawn =
      o.kind === 'table'
        ? decimateGrid(
            order,
            xs,
            ys,
            state.x0,
            state.x1,
            state.y0,
            state.y1,
            columns / 2,
            FH / 2
          )
        : decimate(order, xs, ys, state.x0, state.x1, columns);
    state.drawn = drawn.length;

    svg.replaceChildren();
    // Axes and ticks.
    const B = H - PAD.bottom;
    const g = el('g', { class: 'ow-axes', 'aria-hidden': 'true' });
    const line = (x1, y1, x2, y2) => g.append(el('line', { x1, y1, x2, y2 }));
    const text = (words, x, y, anchor, cls, more) => {
      const t = el('text', {
        x,
        y,
        'text-anchor': anchor,
        class: cls,
        ...more,
      });
      t.textContent = words;
      g.append(t);
    };
    line(PAD.left, B, W - PAD.right, B);
    line(PAD.left, PAD.top, PAD.left, B);
    for (const v of ticks(state.x0, state.x1)) {
      const x = sx(v);
      line(x, B, x, B + 5);
      text(hooks.number(v), x, B + 18, 'middle', 'ow-tick');
    }
    for (const v of ticks(state.y0, state.y1)) {
      const y = sy(v);
      line(PAD.left - 5, y, PAD.left, y);
      text(hooks.number(v), PAD.left - 8, y + 4, 'end', 'ow-tick');
    }
    const mid = (PAD.top + B) / 2;
    const L = hooks.labels;
    text(
      axisTitle(xc, L.notStated),
      PAD.left + FW / 2,
      H - 6,
      'middle',
      'ow-label'
    );
    text(axisTitle(yc, L.notStated), 14, mid, 'middle', 'ow-label', {
      transform: `rotate(-90 14 ${mid})`,
    });
    svg.append(g);
    // The frame: bars that reach past a table's range, and curves, stop at it.
    const clip = el('clipPath', { id: clipId });
    clip.append(el('rect', { x: PAD.left, y: PAD.top, width: FW, height: FH }));
    svg.append(clip);
    const clipped = cls =>
      el('g', {
        class: cls,
        'aria-hidden': 'true',
        'clip-path': `url(#${clipId})`,
      });

    // Uncertainty bars, where they are few enough to read.
    if ((sigma || (lower && upper)) && drawn.length <= 2000) {
      const bars = clipped('ow-bars');
      for (const i of drawn) {
        const e = sigma?.values[i];
        const [a, b] = sigma
          ? [ys[i] - e, ys[i] + e]
          : [ys[i] + lower.values[i], ys[i] + upper.values[i]];
        if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
        bars.append(
          el('line', { x1: sx(xs[i]), x2: sx(xs[i]), y1: sy(a), y2: sy(b) })
        );
      }
      svg.append(bars);
    }

    // The points: kept and masked; then, on top and whether or not the
    // decimation kept them, every selected point; then the one in focus. A
    // selected row that a thinned plot left out would otherwise vanish from
    // the one view that was meant to show it.
    const pts = el('g', { class: 'ow-points', 'aria-hidden': 'true' });
    state.r = drawn.length > 3000 ? 1.2 : drawn.length > 500 ? 1.8 : 3;
    for (const i of drawn) {
      pts.append(dot(i, state.r, masked.has(i) ? 'ow-pt is-masked' : 'ow-pt'));
    }
    svg.append(pts);
    // Curves to compare with, over the points and clipped to the frame.
    if (overlays.length) {
      const lines = clipped('ow-overlays');
      overlays.forEach((ov, k) => {
        let run = [];
        const flush = () => {
          if (run.length > 1)
            lines.append(
              el('polyline', {
                points: run.join(' '),
                class: `ow-overlay ow-overlay-${k % 3}`,
              })
            );
          run = [];
        };
        for (const [x, y] of ov.points) {
          if (Number.isFinite(x) && Number.isFinite(y))
            run.push(`${px(sx(x))},${px(sy(y))}`);
          else flush();
        }
        flush();
      });
      svg.append(lines);
    }
    if (selection) {
      svg.append(el('g', { class: 'ow-selected', 'aria-hidden': 'true' }));
      update();
    }
    return { drawn: drawn.length, plotted: order.length };
  }

  /**
   * Redraw only the selection and focus, which change far more often: every
   * selected row that has a point, above the rest, then the focused one.
   */
  function update() {
    const layer = svg.querySelector('.ow-selected');
    if (!state?.selection || !layer) return;
    const { selection, position, r } = state;
    const dots = [];
    for (const i of selection.rows()) {
      if (position.has(i))
        dots.push(dot(i, Math.max(r, 2), 'ow-pt is-selected'));
    }
    layer.replaceChildren(...dots);
    svg.querySelector('.ow-focus')?.remove();
    const f = selection.focus;
    if (!(f >= 0) || !position.has(f)) return;
    const ring = dot(f, 6, 'ow-focus');
    ring.setAttribute('aria-hidden', 'true');
    svg.append(ring);
  }

  return {
    draw,
    update,
    drawnCount: () => state?.drawn ?? 0,
    /** What ./select.js reads: the rows as drawn, and the x scale both ways. */
    at: () => state,
    sx,
    toX: p => state.x0 + ((p - PAD.left) / FW) * (state.x1 - state.x0),
  };
}
