// =============================================================================
// The transfer window as a table, with a cursor (Prompt 281)
// -----------------------------------------------------------------------------
// The porkchop plot is a picture, and its description says only the best cell.
// This is the same grid as a table a reader can walk by keyboard: one row for
// each departure date, one column for each flight time, the total delta-v in
// each cell (or the reason the solver refused it). It is an ARIA grid with one
// Tab stop; the arrows move a cursor one cell, Page Up and Page Down ten
// departures, Home and End go to the first and last flight time, Control with
// Home or End to the first and last cell. Each cell carries its whole meaning
// as its label ("Departure 2024-08-12, flight 210 days: total 5.43 km/s"), so
// the cursor is announced by the cell it lands on and nothing else speaks.
//
// A window can hold 40,000 cells, so the table draws only the few rows and
// columns around the cursor (aria-rowcount and aria-colcount say how many
// there are; aria-rowindex and aria-colindex say which these are).
//
// Loaded the first time the table is opened (js/missionPage.js), so no one
// who only reads the picture pays for it.
// =============================================================================

export const SPAN_ROWS = 7;
export const SPAN_COLS = 7;
export const PAGE = 10;

/** The value on an axis of `steps` points from `start` over `span`. */
const at = (start, span, steps, k) =>
  steps === 1 ? start : start + (span * k) / (steps - 1);

/**
 * The cursor after a key, or null when the key is not the grid's.
 *
 * @param {{i: number, j: number}} cur - Departure row and flight-time column
 * @param {string} key - `event.key`
 * @param {boolean} ctrl - Control (or Command) is down
 * @param {number} rows - Departures
 * @param {number} cols - Flight times
 * @returns {?{i: number, j: number}}
 */
export function moved(cur, key, ctrl, rows, cols) {
  const c = (v, n) => Math.min(Math.max(v, 0), n - 1);
  const to = (i, j) => ({ i: c(i, rows), j: c(j, cols) });
  switch (key) {
    case 'ArrowDown':
      return to(cur.i + 1, cur.j);
    case 'ArrowUp':
      return to(cur.i - 1, cur.j);
    case 'ArrowRight':
      return to(cur.i, cur.j + 1);
    case 'ArrowLeft':
      return to(cur.i, cur.j - 1);
    case 'PageDown':
      return to(cur.i + PAGE, cur.j);
    case 'PageUp':
      return to(cur.i - PAGE, cur.j);
    case 'Home':
      return ctrl ? to(0, 0) : to(cur.i, 0);
    case 'End':
      return ctrl ? to(rows - 1, cols - 1) : to(cur.i, cols - 1);
    default:
      return null;
  }
}

/**
 * Build the grid in `host`.
 *
 * @param {object} o
 * @param {HTMLElement} o.host - Where the table goes (emptied first)
 * @param {object} o.result - The window's result (rows, options, total,
 *   cellStatus, best)
 * @param {object} o.say - Words and numbers, in the page's language:
 *   `label(wording)`, `date(day)`, `flight(days)`, `value(dv)`, `refused(code)`,
 *   `caption`, `corner`, `best`
 * @param {(cursor: {i: number, j: number}) => void} [o.onMove] - Called after
 *   the cursor moves (the page marks it on the picture)
 * @returns {{cursor: () => {i: number, j: number}, go: (i: number, j: number) => void, focus: () => void}}
 */
export function createGrid({ host, result: r, say, onMove = () => {} }) {
  const o = r.options;
  const nt = o.tofSteps;
  const nr = r.rows;
  const depart = i => at(o.departStart, o.departSpan, o.departSteps, i);
  const flight = j => at(o.tofMin, o.tofMax - o.tofMin, nt, j);
  let cur = r.best
    ? { i: Math.floor(r.best.index / nt), j: r.best.index % nt }
    : { i: 0, j: 0 };

  const make = (tag, attrs = {}, text) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    if (text !== undefined) n.textContent = text;
    return n;
  };

  const wording = (i, j) => {
    const k = i * nt + j;
    const ok = r.cellStatus[k] === 0;
    return {
      ok,
      text: say.label({
        date: say.date(depart(i)),
        tof: say.flight(flight(j)),
        dv: ok ? say.value(r.total[k]) : '',
        why: ok ? '' : say.refused(r.cellStatus[k]),
        ok,
      }),
      value: ok ? say.value(r.total[k]) : '–',
    };
  };

  const grid = make('table', {
    class: 'ui-table mn-grid',
    role: 'grid',
    'aria-rowcount': String(nr + 1),
    'aria-colcount': String(nt + 1),
    'aria-label': say.caption,
  });
  const status = make('p', { class: 'mn-grid-cursor' });
  const best = make('button', { type: 'button', class: 'ui-button' }, say.best);
  best.disabled = !r.best;

  function render(focus) {
    const top = Math.min(
      Math.max(cur.i - Math.floor(SPAN_ROWS / 2), 0),
      Math.max(nr - SPAN_ROWS, 0)
    );
    const left = Math.min(
      Math.max(cur.j - Math.floor(SPAN_COLS / 2), 0),
      Math.max(nt - SPAN_COLS, 0)
    );
    const rows = Math.min(SPAN_ROWS, nr);
    const cols = Math.min(SPAN_COLS, nt);
    const head = make('tr', { 'aria-rowindex': '1' });
    head.append(make('th', { scope: 'col', 'aria-colindex': '1' }, say.corner));
    for (let j = left; j < left + cols; j++)
      head.append(
        make(
          'th',
          { scope: 'col', 'aria-colindex': String(j + 2) },
          say.flight(flight(j))
        )
      );
    const body = make('tbody');
    let here = null;
    for (let i = top; i < top + rows; i++) {
      const tr = make('tr', { 'aria-rowindex': String(i + 2) });
      tr.append(
        make('th', { scope: 'row', 'aria-colindex': '1' }, say.date(depart(i)))
      );
      for (let j = left; j < left + cols; j++) {
        const w = wording(i, j);
        const on = i === cur.i && j === cur.j;
        const td = make(
          'td',
          {
            role: 'gridcell',
            'aria-colindex': String(j + 2),
            'aria-label': w.text,
            tabindex: on ? '0' : '-1',
            'data-i': String(i),
            'data-j': String(j),
          },
          w.value
        );
        if (!w.ok) td.className = 'is-refused';
        if (on) here = td;
        tr.append(td);
      }
      body.append(tr);
    }
    const thead = make('thead');
    thead.append(head);
    grid.replaceChildren(thead, body);
    status.textContent = wording(cur.i, cur.j).text;
    if (focus) here?.focus();
  }

  const go = (i, j, focus = true) => {
    cur = { i, j };
    render(focus);
    onMove(cur);
  };

  grid.addEventListener('keydown', e => {
    const next = moved(cur, e.key, e.ctrlKey || e.metaKey, nr, nt);
    if (!next) return;
    e.preventDefault();
    go(next.i, next.j);
  });
  grid.addEventListener('click', e => {
    const td = e.target.closest('td[data-i]');
    if (td) go(Number(td.dataset.i), Number(td.dataset.j));
  });
  best.addEventListener('click', () => {
    if (r.best) go(Math.floor(r.best.index / nt), r.best.index % nt);
  });

  host.replaceChildren(grid, status, best);
  render(false);
  return { cursor: () => ({ ...cur }), go, focus: () => render(true) };
}
