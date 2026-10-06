// =============================================================================
// js/plot/: one selection, shared by every view of the rows, and the plot's
// ways of making one
// -----------------------------------------------------------------------------
// The plot, the table and the image are views of the same rows (an image's
// rows are its pixels), and a selection made in one is the selection in all
// of them: a set of row indices and a focused row, the one the keyboard is
// on. A view that changes it says which view it is, so a view told of its own
// change does not redraw it twice. A change that renumbers the rows - a crop,
// a bin - leaves nothing a selection could point at, and the page clears it.
//
// interact() is how a plot makes one: a drag selects the rows between, a
// click the nearest, and the keyboard moves a focused point along the axis,
// extending with Shift. The focused point is announced, since a screen reader
// cannot see where a dot is. A plot that only shows its data does not load it.
// =============================================================================

import { FH, PAD, W, el } from './plot.js';

/**
 * @param {number} n - Rows in the observation
 */
export function createSelection(n) {
  let rows = new Set();
  let focus = n ? 0 : -1;
  let anchor = -1;
  const listeners = new Set();
  const emit = source => {
    for (const fn of listeners) fn({ source });
  };
  const clamp = i => Math.max(0, Math.min(n - 1, i));
  return {
    get size() {
      return rows.size;
    },
    get focus() {
      return focus;
    },
    has: i => rows.has(i),
    /** The selected rows, ascending. */
    rows: () => Uint32Array.from(rows).sort(),
    /** The first and last selected row, or null. */
    bounds() {
      if (!rows.size) return null;
      let lo = Infinity;
      let hi = -Infinity;
      for (const r of rows) {
        lo = Math.min(lo, r);
        hi = Math.max(hi, r);
      }
      return [lo, hi];
    },
    /** Replace the selection. */
    set(list, source) {
      rows = new Set(
        [...list].filter(i => Number.isInteger(i) && i >= 0 && i < n)
      );
      // A loop, not Math.min(...rows): a large selection overflows the stack.
      anchor = -1;
      for (const r of rows) if (anchor < 0 || r < anchor) anchor = r;
      emit(source);
    },
    /** Select a run of rows, first to last inclusive, in either order. */
    range(a, b, source) {
      const lo = clamp(Math.min(a, b));
      const hi = clamp(Math.max(a, b));
      rows = new Set();
      for (let i = lo; i <= hi; i++) rows.add(i);
      emit(source);
    },
    /** Add a row, or take it away. */
    toggle(i, source) {
      if (!(i >= 0 && i < n)) return;
      if (rows.has(i)) rows.delete(i);
      else rows.add(i);
      anchor = i;
      emit(source);
    },
    /** Move the focus; with `extend`, select from the anchor to it. */
    moveFocus(i, source, { extend = false } = {}) {
      if (!n) return;
      focus = clamp(i);
      if (extend) {
        if (anchor < 0) anchor = focus;
        const lo = Math.min(anchor, focus);
        const hi = Math.max(anchor, focus);
        rows = new Set();
        for (let k = lo; k <= hi; k++) rows.add(k);
      } else anchor = focus;
      emit(source);
    },
    clear(source) {
      rows = new Set();
      anchor = -1;
      emit(source);
    },
    /** @returns {Function} Unsubscribe */
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

/**
 * @param {object} plot - From createPlot(); its draw() is given the selection
 * @param {SVGSVGElement} svg - The plot's element
 * @param {{announce: Function, describe: Function}} hooks - announce(text)
 *   speaks; describe(row) is what a focused row is called
 */
export function interact(plot, svg, hooks) {
  let brush = null;
  // Where a Shift extension started, for the rows the plot last drew.
  let anchor = null;
  let anchorOf = null;
  const point = e => {
    const r = svg.getBoundingClientRect();
    return ((e.clientX - r.left) / r.width) * W;
  };

  function drawBrush() {
    svg.querySelector('.ow-brush')?.remove();
    if (!brush) return;
    svg.append(
      el('rect', {
        class: 'ow-brush',
        x: Math.min(brush.from, brush.to),
        y: PAD.top,
        width: Math.abs(brush.to - brush.from),
        height: FH,
      })
    );
  }

  svg.addEventListener('pointerdown', e => {
    if (!plot.at() || e.button !== 0) return;
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
    const a = plot.toX(Math.min(brush.from, brush.to));
    const b = plot.toX(Math.max(brush.from, brush.to));
    brush = null;
    drawBrush();
    const { xs, order, selection } = plot.at();
    if (Math.abs(plot.sx(b) - plot.sx(a)) < 3) {
      // A click, not a drag: the nearest row.
      const d = i => Math.abs(xs[i] - a);
      const near = order.reduce((m, i) => (d(i) < d(m) ? i : m), order[0]);
      if (near >= 0) selection.moveFocus(near, 'plot');
      return;
    }
    selection.set(
      order.filter(i => xs[i] >= a && xs[i] <= b),
      'plot'
    );
  });

  svg.addEventListener('keydown', e => {
    const state = plot.at();
    if (!state || !state.order.length) return;
    const { order, selection, o } = state;
    if (anchorOf !== o) anchor = null;
    anchorOf = o;
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
      anchor ??= at;
      selection.set(
        order.slice(Math.min(anchor, next), Math.max(anchor, next) + 1),
        'plot'
      );
      selection.moveFocus(order[next], 'plot-focus');
    } else {
      anchor = null;
      selection.moveFocus(order[next], 'plot');
    }
    hooks.announce(hooks.describe(order[next]));
  });
}
