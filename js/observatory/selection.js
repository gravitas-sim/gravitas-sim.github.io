// =============================================================================
// One selection, shared by every view of an observation
// -----------------------------------------------------------------------------
// The plot, the table and the image are views of the same rows (an image's
// rows are its pixels), and a selection made in one is the selection in all
// of them. This holds it: a set of row indices and a focused row, the one the
// keyboard is on. A view that changes it says which view it is, so a view
// that is told of a change it made itself does not redraw it twice.
//
// A change that renumbers the rows - a crop, a bin - leaves nothing a
// selection could still point at, and the workspace clears it (clear()).
// =============================================================================

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
