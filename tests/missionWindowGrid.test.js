// =============================================================================
// The transfer window as a table (Prompt 281)
// -----------------------------------------------------------------------------
// The grid is the porkchop's cells as an ARIA grid with one Tab stop and a
// cursor. Checked here: the keys move the cursor where the plot's axes say
// (rows are departures, columns flight times) and stop at the edges; the table
// draws only a few rows and columns and says how many there are; every cell's
// label carries its date, flight time and total or the reason it was refused;
// the cursor starts on the cheapest cell; and the labels are the numbers of
// the result, not a recomputation.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import {
  PAGE,
  SPAN_COLS,
  SPAN_ROWS,
  createGrid,
  moved,
} from '../js/mission/windowGrid.js';

const nr = 61;
const nt = 41;
/** A window whose total is smallest at row 20, column 12; a refused band at column 30. */
function windowResult() {
  const total = new Float64Array(nr * nt);
  const cellStatus = new Uint8Array(nr * nt);
  for (let i = 0; i < nr; i++)
    for (let j = 0; j < nt; j++) {
      const k = i * nt + j;
      total[k] = 5 + Math.hypot(i - 20, (j - 12) * 2) * 0.1;
      if (j === 30) {
        cellStatus[k] = 2;
        total[k] = NaN;
      }
    }
  return {
    rows: nr,
    options: {
      departStart: 1000,
      departSpan: 120,
      departSteps: nr,
      tofMin: 150,
      tofMax: 350,
      tofSteps: nt,
    },
    total,
    cellStatus,
    best: { index: 20 * nt + 12, total: 5 },
  };
}

const say = {
  label: w =>
    w.ok
      ? `Departure ${w.date}, flight ${w.tof}: total ${w.dv}.`
      : `Departure ${w.date}, flight ${w.tof}: ${w.why}.`,
  date: d => `D${d}`,
  flight: d => `${d} days`,
  value: v => `${v.toFixed(2)} km/s`,
  refused: c => `refused (${c})`,
  caption: 'The grid',
  corner: 'Departure',
  best: 'Cheapest',
};

const key = (grid, k, init = {}) =>
  grid.dispatchEvent(
    new KeyboardEvent('keydown', { key: k, bubbles: true, ...init })
  );

describe('moved: the keys', () => {
  const at = { i: 5, j: 5 };
  test('the arrows move one cell, rows are departures and columns flight times', () => {
    expect(moved(at, 'ArrowDown', false, nr, nt)).toEqual({ i: 6, j: 5 });
    expect(moved(at, 'ArrowUp', false, nr, nt)).toEqual({ i: 4, j: 5 });
    expect(moved(at, 'ArrowRight', false, nr, nt)).toEqual({ i: 5, j: 6 });
    expect(moved(at, 'ArrowLeft', false, nr, nt)).toEqual({ i: 5, j: 4 });
  });
  test('Page Up and Page Down move ten departures; Home and End the row; with Control the whole grid', () => {
    expect(moved(at, 'PageDown', false, nr, nt).i).toBe(5 + PAGE);
    expect(moved(at, 'PageUp', false, nr, nt).i).toBe(0);
    expect(moved(at, 'Home', false, nr, nt)).toEqual({ i: 5, j: 0 });
    expect(moved(at, 'End', false, nr, nt)).toEqual({ i: 5, j: nt - 1 });
    expect(moved(at, 'Home', true, nr, nt)).toEqual({ i: 0, j: 0 });
    expect(moved(at, 'End', true, nr, nt)).toEqual({ i: nr - 1, j: nt - 1 });
  });
  test('the cursor stops at the edges and other keys are not the grid’s', () => {
    expect(moved({ i: 0, j: 0 }, 'ArrowUp', false, nr, nt)).toEqual({
      i: 0,
      j: 0,
    });
    expect(moved({ i: nr - 1, j: nt - 1 }, 'ArrowDown', false, nr, nt)).toEqual(
      {
        i: nr - 1,
        j: nt - 1,
      }
    );
    expect(moved(at, 'a', false, nr, nt)).toBeNull();
    expect(moved(at, 'Tab', false, nr, nt)).toBeNull();
  });
});

describe('the grid', () => {
  const r = windowResult();
  const host = document.createElement('div');
  document.body.append(host);
  const moves = [];
  const g = createGrid({ host, result: r, say, onMove: c => moves.push(c) });
  const grid = host.querySelector('[role="grid"]');
  const cells = () => [...grid.querySelectorAll('td[role="gridcell"]')];
  const on = () => cells().find(td => td.tabIndex === 0);

  test('says how many rows and columns there are and draws a few', () => {
    expect(grid.getAttribute('aria-rowcount')).toBe(String(nr + 1));
    expect(grid.getAttribute('aria-colcount')).toBe(String(nt + 1));
    expect(cells().length).toBe(SPAN_ROWS * SPAN_COLS);
  });

  test('starts on the cheapest cell, with one Tab stop', () => {
    expect(g.cursor()).toEqual({ i: 20, j: 12 });
    expect(cells().filter(td => td.tabIndex === 0).length).toBe(1);
    expect(on().dataset.i).toBe('20');
    expect(on().getAttribute('aria-label')).toBe(
      'Departure D1000, flight 150 days: total 5.00 km/s.'
        .replace('D1000', `D${1000 + (120 * 20) / 60}`)
        .replace('150', `${150 + (200 * 12) / 40}`)
    );
  });

  test('a key moves the cursor, redraws around it, and reports it', () => {
    key(grid, 'ArrowDown');
    expect(g.cursor()).toEqual({ i: 21, j: 12 });
    expect(on().dataset.i).toBe('21');
    key(grid, 'ArrowRight');
    key(grid, 'ArrowRight');
    expect(g.cursor()).toEqual({ i: 21, j: 14 });
    expect(moves.at(-1)).toEqual({ i: 21, j: 14 });
    expect(cells().length).toBe(SPAN_ROWS * SPAN_COLS);
  });

  test('a refused cell is labelled with the reason, not a number', () => {
    g.go(20, 30);
    expect(on().getAttribute('aria-label')).toContain('refused (2)');
    expect(on().textContent).toBe('–');
  });

  test('the last cell is reachable and the window stays inside the grid', () => {
    key(grid, 'End', { ctrlKey: true });
    expect(g.cursor()).toEqual({ i: nr - 1, j: nt - 1 });
    expect(on().dataset.j).toBe(String(nt - 1));
    expect(cells().length).toBe(SPAN_ROWS * SPAN_COLS);
  });

  test('the button returns to the cheapest cell', () => {
    host.querySelector('button').click();
    expect(g.cursor()).toEqual({ i: 20, j: 12 });
  });

  test('a cell shows the result’s own number', () => {
    g.go(7, 3);
    expect(on().textContent).toBe(`${r.total[7 * nt + 3].toFixed(2)} km/s`);
  });
});
