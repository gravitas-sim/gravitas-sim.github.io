// =============================================================================
// The plot: an observation's rows as points, linked to the selection
// -----------------------------------------------------------------------------
// SVG, drawn by hand, because what it draws is small and has to be honest:
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
// - **The selection is the workspace's** (./selection.js). A drag across the
//   plot selects the rows between; the keyboard moves a focused point along
//   the axis and extends a selection with Shift. What the focused point is
//   gets announced, since a screen reader cannot see where a dot is.
// =============================================================================

import { formatUnit, parseUnit } from './units.js';
import { columnOf, maskedRows, uncertaintyOf } from './schema.js';

const NS = 'http://www.w3.org/2000/svg';
const W = 720;
const H = 380;
const PAD = { left: 70, right: 16, top: 14, bottom: 46 };
/** Points drawn per pixel column before decimation starts. */
const PER_COLUMN = 2;

const el = (name, attrs = {}) => {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
};

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
 * @param {SVGSVGElement} svg
 * @param {{announce: Function, describe: Function, labels: object}} hooks -
 *   announce(text) speaks; describe(row) is what a focused row is called;
 *   labels holds the translated words the plot draws
 */
export function createPlot(svg, hooks) {
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  let state = null;
  let brush = null;

  const sx = x =>
    PAD.left +
    ((x - state.x0) / (state.x1 - state.x0 || 1)) * (W - PAD.left - PAD.right);
  // Magnitudes are drawn brighter-up.
  const sy = y => {
    const f =
      ((y - state.y0) / (state.y1 - state.y0 || 1)) *
      (H - PAD.top - PAD.bottom);
    return state.flip ? PAD.top + f : H - PAD.bottom - f;
  };
  const toX = px =>
    state.x0 +
    ((px - PAD.left) / (W - PAD.left - PAD.right)) * (state.x1 - state.x0);

  function point(svgEvent) {
    const r = svg.getBoundingClientRect();
    return ((svgEvent.clientX - r.left) / r.width) * W;
  }

  svg.addEventListener('pointerdown', e => {
    if (!state || e.button !== 0) return;
    // A drag here is a selection of rows, not of the page's text: without
    // this the browser selects text and scrolls the page under the pointer.
    e.preventDefault();
    svg.focus({ preventScroll: true });
    svg.setPointerCapture?.(e.pointerId);
    brush = { from: point(e), to: point(e) };
    drawBrush();
  });
  svg.addEventListener('pointermove', e => {
    if (!brush) return;
    brush.to = point(e);
    drawBrush();
  });
  svg.addEventListener('pointerup', e => {
    if (!brush) return;
    brush.to = point(e);
    const a = toX(Math.min(brush.from, brush.to));
    const b = toX(Math.max(brush.from, brush.to));
    brush = null;
    drawBrush();
    const { xs, order } = state;
    if (Math.abs(sx(b) - sx(a)) < 3) {
      // A click, not a drag: the nearest row.
      const near = nearest(a);
      if (near >= 0) state.selection.moveFocus(near, 'plot');
      return;
    }
    state.selection.set(
      order.filter(i => xs[i] >= a && xs[i] <= b),
      'plot'
    );
  });

  function nearest(x) {
    const { xs, order } = state;
    let best = -1;
    let d = Infinity;
    for (const i of order) {
      const k = Math.abs(xs[i] - x);
      if (k < d) {
        d = k;
        best = i;
      }
    }
    return best;
  }

  svg.addEventListener('keydown', e => {
    if (!state || !state.order.length) return;
    const { order, selection } = state;
    const at = Math.max(0, state.position.get(selection.focus) ?? 0);
    let next = null;
    if (e.key === 'ArrowRight') next = at + 1;
    else if (e.key === 'ArrowLeft') next = at - 1;
    else if (e.key === 'PageDown') next = at + 50;
    else if (e.key === 'PageUp') next = at - 50;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = order.length - 1;
    else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      selection.toggle(order[at], 'plot');
      return;
    } else if (e.key === 'Escape') {
      selection.clear('plot');
      return;
    } else return;
    e.preventDefault();
    next = Math.max(0, Math.min(order.length - 1, next));
    if (e.shiftKey) {
      // Extend along the axis: every row between the anchor and here.
      const from = state.anchor ?? at;
      state.anchor = from;
      const lo = Math.min(from, next);
      const hi = Math.max(from, next);
      selection.set(order.slice(lo, hi + 1), 'plot');
      selection.moveFocus(order[next], 'plot-focus');
    } else {
      state.anchor = null;
      selection.moveFocus(order[next], 'plot');
    }
    hooks.announce(hooks.describe(order[next]));
  });

  function drawBrush() {
    svg.querySelector('.ow-brush')?.remove();
    if (!brush) return;
    const a = Math.min(brush.from, brush.to);
    svg.append(
      el('rect', {
        class: 'ow-brush',
        x: a,
        y: PAD.top,
        width: Math.abs(brush.to - brush.from),
        height: H - PAD.top - PAD.bottom,
      })
    );
  }

  /**
   * Draw an observation.
   * @param {object} o - After the changes
   * @param {{xColumn: string, yColumn: string, selection: object}} view
   */
  function draw(o, { xColumn, yColumn, selection }) {
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
    const position = new Map(order.map((r, k) => [r, k]));
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (const i of order) {
      x0 = Math.min(x0, xs[i]);
      x1 = Math.max(x1, xs[i]);
      const e = sigma ? sigma.values[i] : 0;
      const lo = lower ? lower.values[i] : 0;
      const up = upper ? upper.values[i] : 0;
      y0 = Math.min(
        y0,
        ys[i] -
          (Number.isFinite(e) ? e : 0) +
          (Number.isFinite(lo) ? Math.min(lo, 0) : 0)
      );
      y1 = Math.max(
        y1,
        ys[i] +
          (Number.isFinite(e) ? e : 0) +
          (Number.isFinite(up) ? Math.max(up, 0) : 0)
      );
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
      position,
      selection,
      anchor: state?.o === o ? state.anchor : null,
      x0: x0 - padX,
      x1: x1 + padX,
      y0: y0 - padY,
      y1: y1 + padY,
      // A column's unit is a canonical id (./schema.js), so this is every
      // magnitude.
      flip: yc.unit === 'mag',
    };
    const columns = W - PAD.left - PAD.right;
    const drawn = decimate(order, xs, ys, state.x0, state.x1, columns);
    state.drawn = drawn.length;

    svg.replaceChildren();
    const L = hooks.labels;
    // Axes and ticks.
    const g = el('g', { class: 'ow-axes', 'aria-hidden': 'true' });
    g.append(
      el('line', {
        x1: PAD.left,
        y1: H - PAD.bottom,
        x2: W - PAD.right,
        y2: H - PAD.bottom,
      }),
      el('line', {
        x1: PAD.left,
        y1: PAD.top,
        x2: PAD.left,
        y2: H - PAD.bottom,
      })
    );
    const fmt = v => hooks.number(v);
    for (const v of ticks(state.x0, state.x1)) {
      const x = sx(v);
      g.append(
        el('line', { x1: x, y1: H - PAD.bottom, x2: x, y2: H - PAD.bottom + 5 })
      );
      const t = el('text', {
        x,
        y: H - PAD.bottom + 18,
        'text-anchor': 'middle',
        class: 'ow-tick',
      });
      t.textContent = fmt(v);
      g.append(t);
    }
    for (const v of ticks(state.y0, state.y1)) {
      const y = sy(v);
      g.append(el('line', { x1: PAD.left - 5, y1: y, x2: PAD.left, y2: y }));
      const t = el('text', {
        x: PAD.left - 8,
        y: y + 4,
        'text-anchor': 'end',
        class: 'ow-tick',
      });
      t.textContent = fmt(v);
      g.append(t);
    }
    const xl = el('text', {
      x: (PAD.left + W - PAD.right) / 2,
      y: H - 6,
      'text-anchor': 'middle',
      class: 'ow-label',
    });
    xl.textContent =
      `${xc.name} (${formatUnit(parseUnit(xc.unit).unit, L.notStated)})`.replace(
        ' ()',
        ''
      );
    const yl = el('text', {
      x: 14,
      y: (PAD.top + H - PAD.bottom) / 2,
      'text-anchor': 'middle',
      class: 'ow-label',
      transform: `rotate(-90 14 ${(PAD.top + H - PAD.bottom) / 2})`,
    });
    yl.textContent =
      `${yc.name} (${formatUnit(parseUnit(yc.unit).unit, L.notStated)})`.replace(
        ' ()',
        ''
      );
    g.append(xl, yl);
    svg.append(g);

    // Uncertainty bars, where they are few enough to read.
    if ((sigma || (lower && upper)) && drawn.length <= 2000) {
      const bars = el('g', { class: 'ow-bars', 'aria-hidden': 'true' });
      for (const i of drawn) {
        let a;
        let b;
        if (sigma) {
          const e = sigma.values[i];
          if (!Number.isFinite(e)) continue;
          a = ys[i] - e;
          b = ys[i] + e;
        } else {
          const lo = lower.values[i];
          const up = upper.values[i];
          if (!Number.isFinite(lo) || !Number.isFinite(up)) continue;
          a = ys[i] + lo;
          b = ys[i] + up;
        }
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
    const r = drawn.length > 3000 ? 1.2 : drawn.length > 500 ? 1.8 : 3;
    state.r = r;
    for (const i of drawn) {
      pts.append(
        el('circle', {
          cx: sx(xs[i]).toFixed(1),
          cy: sy(ys[i]).toFixed(1),
          r,
          class: masked.has(i) ? 'ow-pt is-masked' : 'ow-pt',
        })
      );
    }
    svg.append(pts, el('g', { class: 'ow-selected', 'aria-hidden': 'true' }));
    drawSelected();
    drawFocus();
    return { drawn: drawn.length, plotted: order.length };
  }

  /** Every selected row that has a point, drawn above the rest. */
  function drawSelected() {
    const layer = svg.querySelector('.ow-selected');
    if (!layer) return;
    const { selection, position, xs, ys, r } = state;
    const dots = [];
    for (const i of selection.rows()) {
      if (!position.has(i)) continue;
      dots.push(
        el('circle', {
          cx: sx(xs[i]).toFixed(1),
          cy: sy(ys[i]).toFixed(1),
          r: Math.max(r, 2),
          class: 'ow-pt is-selected',
        })
      );
    }
    layer.replaceChildren(...dots);
  }

  /** Redraw only the selection and focus, which change far more often. */
  function update() {
    if (!state) return;
    drawSelected();
    drawFocus();
  }

  function drawFocus() {
    svg.querySelector('.ow-focus')?.remove();
    const f = state?.selection.focus;
    if (!(f >= 0) || !state.position.has(f)) return;
    svg.append(
      el('circle', {
        class: 'ow-focus',
        cx: sx(state.xs[f]).toFixed(1),
        cy: sy(state.ys[f]).toFixed(1),
        r: 6,
        'aria-hidden': 'true',
      })
    );
  }

  return { draw, update, drawnCount: () => state?.drawn ?? 0 };
}
