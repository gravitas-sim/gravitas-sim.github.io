// =============================================================================
// The table: every row, readable by eye and by screen reader, and selectable
// -----------------------------------------------------------------------------
// An ARIA grid (a real <table> with the grid role), a page of rows at a time.
// It holds every row there is, masked and missing ones included, and the
// plot and image views select the same rows through the same selection:
//
// - Each column's header says its unit, or that it has none stated.
// - A missing value reads "missing", not a blank cell or a zero.
// - A masked row is marked, in text as well as in color.
// - Up and Down move the focused row, a page at a time with Page Up and Page
//   Down, to either end with Home and End; Space adds or removes the focused
//   row; Shift with a movement selects from where it started. A click selects
//   a row, Shift-click a run, Ctrl- or Command-click adds one.
// - When the selection or focus changes elsewhere, the table turns to the
//   page that holds the focused row, so what the plot points at is in view.
//
// Only the visible page is in the document, so a 200,000-row import is 50
// rows of DOM. The row count and each row's index are given to assistive
// technology (aria-rowcount, aria-rowindex), so the whole is still announced.
// =============================================================================

import { formatUnit, parseUnit } from './units.js';
import { maskedRows } from './schema.js';

export const PAGE = 50;

/**
 * @param {HTMLTableElement} table
 * @param {{announce: Function, describe: Function, labels: object,
 *   number: Function, onPage?: Function}} hooks
 */
export function createTable(table, hooks) {
  table.setAttribute('role', 'grid');
  table.setAttribute('aria-multiselectable', 'true');
  let state = null;
  let page = 0;
  let anchor = -1;

  const L = hooks.labels;

  table.addEventListener('keydown', e => {
    if (!state) return;
    const { selection, n } = state;
    const f = Math.max(0, selection.focus);
    let next = null;
    if (e.key === 'ArrowDown') next = f + 1;
    else if (e.key === 'ArrowUp') next = f - 1;
    else if (e.key === 'PageDown') next = f + PAGE;
    else if (e.key === 'PageUp') next = f - PAGE;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = n - 1;
    else if (e.key === ' ') {
      e.preventDefault();
      selection.toggle(f, 'table');
      anchor = f;
      hooks.announce(hooks.describe(f));
      return;
    } else if (e.key === 'Escape') {
      selection.clear('table');
      return;
    } else return;
    e.preventDefault();
    next = Math.max(0, Math.min(n - 1, next));
    if (e.shiftKey) {
      if (anchor < 0) anchor = f;
      selection.range(anchor, next, 'table');
    } else anchor = next;
    selection.moveFocus(next, 'table');
    showRow(next, { focus: true });
    hooks.announce(hooks.describe(next));
  });

  table.addEventListener('click', e => {
    const tr = e.target.closest?.('tr[data-row]');
    if (!tr || !state) return;
    const i = Number(tr.dataset.row);
    const { selection } = state;
    if (e.shiftKey && anchor >= 0) selection.range(anchor, i, 'table');
    else if (e.ctrlKey || e.metaKey) selection.toggle(i, 'table');
    else selection.set([i], 'table');
    if (!e.shiftKey) anchor = i;
    selection.moveFocus(i, 'table');
    showRow(i, { focus: true });
  });

  /** Turn to the page holding a row, and focus it if asked. */
  function showRow(i, { focus = false } = {}) {
    const p = Math.floor(i / PAGE);
    if (p !== page) {
      page = p;
      render();
    } else refresh();
    if (focus) table.querySelector(`tr[data-row="${i}"]`)?.focus();
  }

  const cellText = (c, i) => {
    const v = c.values[i];
    if (c.role === 'label')
      return v === null || v === undefined ? null : String(v);
    return Number.isFinite(v) ? hooks.number(v) : null;
  };

  /**
   * Show an observation.
   * @param {object} o - After the changes
   * @param {{selection: object, caption: string}} view
   */
  function draw(o, { selection, caption }) {
    const n = o.columns[0].values.length;
    state = { o, selection, n, caption, masked: maskedRows(o) };
    page = Math.min(page, Math.floor((n - 1) / PAGE));
    if (selection.focus >= 0) page = Math.floor(selection.focus / PAGE);
    render();
  }

  function render() {
    const { o, n, caption } = state;
    const first = page * PAGE;
    const last = Math.min(n, first + PAGE) - 1;
    table.setAttribute('aria-rowcount', String(n + 1));
    table.setAttribute('aria-colcount', String(o.columns.length + 1));
    const cap = document.createElement('caption');
    cap.textContent = `${caption} ${hooks.t('obs.table.rows', { first: first + 1, last: last + 1, n })}`;
    const head = document.createElement('thead');
    const hr = document.createElement('tr');
    hr.setAttribute('aria-rowindex', '1');
    const th0 = document.createElement('th');
    th0.setAttribute('role', 'columnheader');
    th0.scope = 'col';
    th0.textContent = L.row;
    hr.append(th0);
    for (const c of o.columns) {
      const th = document.createElement('th');
      th.setAttribute('role', 'columnheader');
      th.scope = 'col';
      const unit =
        c.role === 'label'
          ? ''
          : formatUnit(parseUnit(c.unit).unit, L.notStated);
      th.textContent = unit ? `${c.name} (${unit})` : c.name;
      hr.append(th);
    }
    head.append(hr);
    const body = document.createElement('tbody');
    for (let i = first; i <= last; i++) body.append(row(i));
    table.replaceChildren(cap, head, body);
    hooks.onPage?.({ first, last, n });
  }

  function row(i) {
    const { o, selection, masked } = state;
    const tr = document.createElement('tr');
    tr.dataset.row = String(i);
    tr.setAttribute('role', 'row');
    tr.setAttribute('aria-rowindex', String(i + 2));
    tr.setAttribute('aria-selected', selection.has(i) ? 'true' : 'false');
    tr.tabIndex = i === Math.max(0, selection.focus) ? 0 : -1;
    if (masked.has(i)) tr.classList.add('is-masked');
    const th = document.createElement('td');
    th.setAttribute('role', 'gridcell');
    th.textContent = masked.has(i) ? `${i + 1} ${L.masked}` : String(i + 1);
    tr.append(th);
    for (const c of o.columns) {
      const td = document.createElement('td');
      td.setAttribute('role', 'gridcell');
      const text = cellText(c, i);
      if (text === null) {
        td.textContent = '—';
        const sr = document.createElement('span');
        sr.className = 'visually-hidden';
        sr.textContent = ` ${L.missing}`;
        td.append(sr);
        td.classList.add('is-missing');
      } else td.textContent = text;
      tr.append(td);
    }
    return tr;
  }

  /** Re-mark the visible rows after the selection or focus moved. */
  function refresh() {
    if (!state) return;
    const { selection } = state;
    for (const tr of table.querySelectorAll('tr[data-row]')) {
      const i = Number(tr.dataset.row);
      tr.setAttribute('aria-selected', selection.has(i) ? 'true' : 'false');
      tr.tabIndex = i === Math.max(0, selection.focus) ? 0 : -1;
    }
  }

  /** The selection or focus changed in another view. */
  function update() {
    if (!state) return;
    const f = state.selection.focus;
    if (f >= 0 && Math.floor(f / PAGE) !== page) showRow(f);
    else refresh();
  }

  return {
    draw,
    update,
    page: () => page,
    turn(delta) {
      if (!state) return;
      const max = Math.floor((state.n - 1) / PAGE);
      page = Math.max(0, Math.min(max, page + delta));
      render();
    },
  };
}
