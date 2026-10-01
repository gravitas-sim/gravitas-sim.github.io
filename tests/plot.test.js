/**
 * @jest-environment jsdom
 */
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { JSDOM } from 'jsdom';

/* global document -- jsdom's, installed below */

// =============================================================================
// js/plot/: the plotting component, without a page
// -----------------------------------------------------------------------------
// PLOT_COMPONENT.md's acceptance rule asks for rendering golden tables rather
// than screenshots: data in, axis ticks and labels out. These are those
// tables, recorded from the Observatory's plot before it became js/plot/ and
// unchanged by the move. What else they hold:
//   - decimation keeps the lowest and highest point in each pixel column, and
//     a cloud keeps one point in each cell;
//   - a plot that only shows its data has no selection layer and listens to
//     nothing; one given ./select.js selects by keyboard and by pointer;
//   - the table's numbers are the plotted data: every row's cells, read back,
//     are where its point is drawn.
// =============================================================================

import {
  axisTitle,
  createPlot,
  decimate,
  decimateGrid,
  ticks,
} from '../js/plot/plot.js';
import { createSelection, interact } from '../js/plot/select.js';
import { createTable } from '../js/plot/table.js';

// tests/setup.js replaces the global document with a stub for the physics
// tests; these need a real one.
let saved;
beforeAll(() => {
  saved = globalThis.document;
  globalThis.document = new JSDOM(
    '<!doctype html><body></body>'
  ).window.document;
});
afterAll(() => {
  globalThis.document = saved;
});

/** The Observatory's own number formatter, in English. */
const number = v => {
  if (!Number.isFinite(v)) return '—';
  const a = Math.abs(v);
  if (a !== 0 && (a < 1e-4 || a >= 1e7)) return v.toExponential(4);
  return new Intl.NumberFormat('en', {
    maximumSignificantDigits: 8,
    useGrouping: false,
  }).format(v);
};
const labels = {
  notStated: 'unit not stated',
  row: 'Row',
  masked: '(masked)',
  missing: 'missing',
};

const col = (id, name, unit, role, values, extra = {}) => ({
  id,
  name,
  unit,
  role,
  values: Float64Array.from(values),
  ...extra,
});
const N = (n, f) => Array.from({ length: n }, (_, i) => f(i));

const FIXTURES = {
  // A scaled unit, a standard deviation, two masked rows.
  flux: {
    kind: 'time-series',
    axes: ['t', 'f'],
    columns: [
      col(
        't',
        'Time',
        'd',
        'x',
        N(12, i => 2459000 + i * 0.5)
      ),
      col(
        'f',
        'Flux',
        '1e-17 erg/s/cm2/Angstrom',
        'value',
        N(12, i => 1 + 0.01 * Math.sin(i))
      ),
      col(
        'e',
        'Flux error',
        '1e-17 erg/s/cm2/Angstrom',
        'uncertainty',
        N(12, () => 0.004),
        { of: 'f' }
      ),
    ],
    masks: [{ rows: [3, 4] }],
  },
  // A magnitude, drawn brighter-up, with an interval.
  magnitude: {
    kind: 'time-series',
    axes: ['t', 'm'],
    columns: [
      col(
        't',
        'Time',
        'd',
        'x',
        N(9, i => i * 0.1)
      ),
      col(
        'm',
        'Magnitude',
        'mag',
        'value',
        N(9, i => 12 + 0.2 * Math.cos(i))
      ),
      col(
        'lo',
        'Lower',
        'mag',
        'lower',
        N(9, () => -0.05),
        { of: 'm' }
      ),
      col(
        'hi',
        'Upper',
        'mag',
        'upper',
        N(9, () => 0.08),
        { of: 'm' }
      ),
    ],
    masks: [],
  },
  // A table: a unit not stated, and bars that do not stretch the range.
  cloud: {
    kind: 'table',
    axes: ['c', 'g'],
    columns: [
      col(
        'c',
        'Color',
        null,
        'x',
        N(400, i => ((i * 7919) % 1000) / 500 - 0.5)
      ),
      col(
        'g',
        'G',
        'mag',
        'value',
        N(400, i => 8 + ((i * 104729) % 997) / 100)
      ),
      col(
        'ge',
        'G error',
        'mag',
        'uncertainty',
        N(400, i => (i % 50) / 10),
        {
          of: 'g',
        }
      ),
    ],
    masks: [],
  },
  // Long enough to be decimated.
  velocity: {
    kind: 'time-series',
    axes: ['t', 'v'],
    columns: [
      col(
        't',
        'Time',
        's',
        'x',
        N(3000, i => i)
      ),
      col(
        'v',
        'Velocity',
        'km/s',
        'value',
        N(3000, i => Math.sin(i / 40) * 30 + (i % 7))
      ),
    ],
    masks: [],
  },
  // No spread on either axis, and no unit at all.
  constant: {
    kind: 'time-series',
    axes: ['t', 'y'],
    columns: [
      col('t', 'Time', 'd', 'x', [2, 2, 2]),
      col('y', 'Y', '', 'value', [1, 1, 1]),
    ],
    masks: [],
  },
};

const svgEl = () =>
  document.createElementNS('http://www.w3.org/2000/svg', 'svg');

function drawn(name, view = {}) {
  const o = FIXTURES[name];
  const svg = svgEl();
  const plot = createPlot(svg, { number, labels });
  const out = plot.draw(o, { xColumn: o.axes[0], yColumn: o.axes[1], ...view });
  return { svg, plot, out, o };
}

const texts = (svg, sel) =>
  [...svg.querySelectorAll(sel)].map(t => t.textContent);

describe('the golden tables', () => {
  test('ticks: round values across a range', () => {
    const golden = [
      [0, 1, [0, 0.2, 0.4, 0.6, 0.8, 1]],
      [0, 10, [0, 2, 4, 6, 8, 10]],
      [-3.2, 7.9, [-2.5, 0, 2.5, 5, 7.5]],
      [2459000.1, 2459005.4, [2459002, 2459004]],
      [1e-6, 3e-6, [1e-6, 1.5e-6, 2e-6, 2.5e-6, 3e-6]],
      [0, 0.0007, [0, 0.0002, 0.0004, 0.0006]],
      [-1e5, 1e5, [-1e5, -5e4, 0, 5e4, 1e5]],
      [0.95, 1.05, [0.95, 0.975, 1, 1.025, 1.05]],
      [11.8, 12.1, [11.8, 11.9, 12, 12.1]],
      // No range: the one value. A reversed range is not one.
      [5, 5, [5]],
      [3, 1, [3]],
    ];
    for (const [lo, hi, want] of golden) expect(ticks(lo, hi)).toEqual(want);
    expect(ticks(0, 1, 3)).toEqual([0, 0.5, 1]);
    expect(ticks(0, 1, 10)).toEqual([
      0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1,
    ]);
  });

  test('decimation: the lowest and highest in each column, in x order', () => {
    const xs = N(20, i => i);
    const ys = [5, 1, 9, 3, 7, 2, 8, 0, 6, 4, 5, 5, 1, 9, 9, 0, 2, 7, 3, 8];
    const order = N(20, i => i);
    expect(decimate(order, xs, ys, 0, 20, 4)).toEqual([
      1, 2, 6, 7, 12, 13, 15, 19,
    ]);
    // Two per column or fewer: all of them.
    expect(decimate(order.slice(0, 8), xs, ys, 0, 20, 4)).toEqual(
      order.slice(0, 8)
    );
  });

  test('a cloud keeps one point in each cell', () => {
    const xs = [0.1, 0.2, 0.9, 1.1, 1.2, 1.9, 0.15, 0.95, 1.5, 0.5];
    const ys = [0.1, 0.15, 0.2, 0.1, 0.9, 0.95, 0.12, 0.8, 0.5, 0.5];
    const order = [0, 6, 1, 9, 2, 7, 3, 4, 8, 5];
    expect(decimateGrid(order, xs, ys, 0, 2, 0, 1, 2, 2)).toEqual([0, 9, 3, 4]);
    expect(decimateGrid(order, xs, ys, 0, 2, 0, 1, 4, 4)).toEqual(order);
  });

  test('axis ticks and labels, data in and text out', () => {
    const golden = {
      flux: {
        x: ['2459000', '2459002', '2459004'],
        y: ['0.99', '1', '1.01'],
        titles: ['Time (d)', 'Flux (10^-17 erg s⁻¹ cm⁻² Å⁻¹)'],
        drawn: 12,
        bars: 12,
        masked: 2,
      },
      magnitude: {
        x: ['0', '0.2', '0.4', '0.6', '0.8'],
        y: ['11.8', '12', '12.2'],
        titles: ['Time (d)', 'Magnitude (mag)'],
        drawn: 9,
        bars: 9,
        masked: 0,
      },
      cloud: {
        x: ['-0.5', '0', '0.5', '1'],
        y: ['10', '12.5', '15', '17.5'],
        titles: ['Color (unit not stated)', 'G (mag)'],
        drawn: 400,
        bars: 400,
        masked: 0,
      },
      velocity: {
        x: ['0', '1000', '2000'],
        y: ['-20', '0', '20'],
        titles: ['Time (s)', 'Velocity (km/s)'],
        drawn: 1268,
        bars: 0,
        masked: 0,
      },
      constant: {
        x: ['1.9', '1.95', '2', '2.05', '2.1'],
        y: ['0.95', '0.975', '1', '1.025', '1.05'],
        titles: ['Time (d)', 'Y'],
        drawn: 3,
        bars: 0,
        masked: 0,
      },
    };
    for (const [name, want] of Object.entries(golden)) {
      const { svg, out, o } = drawn(name);
      expect({
        x: texts(svg, '.ow-tick[text-anchor="middle"]'),
        y: texts(svg, '.ow-tick[text-anchor="end"]'),
        titles: texts(svg, '.ow-label'),
        drawn: out.drawn,
        bars: svg.querySelectorAll('.ow-bars line').length,
        masked: svg.querySelectorAll('.ow-pt.is-masked').length,
      }).toEqual(want);
      expect(out.plotted).toBe(o.columns[0].values.length);
    }
  });

  test('a magnitude axis is drawn brighter-up, every other axis upward', () => {
    const y = name =>
      [...drawn(name).svg.querySelectorAll('.ow-tick[text-anchor="end"]')].map(
        t => Number(t.getAttribute('y'))
      );
    const mag = y('magnitude');
    expect(mag[0]).toBeLessThan(mag.at(-1));
    const flux = y('flux');
    expect(flux[0]).toBeGreaterThan(flux.at(-1));
  });

  test('an axis title says when a unit is not stated, and nothing for none', () => {
    expect(axisTitle({ name: 'Color', unit: null }, 'not stated')).toBe(
      'Color (not stated)'
    );
    expect(axisTitle({ name: 'Y', unit: '' }, 'not stated')).toBe('Y');
    expect(axisTitle({ name: 'Speed', unit: 'km/s' }, 'x')).toBe(
      'Speed (km/s)'
    );
  });
});

describe('a plot that only shows its data', () => {
  test('has no selection layer and nothing to focus', () => {
    const { svg, plot } = drawn('flux');
    expect(svg.querySelector('.ow-selected')).toBeNull();
    expect(svg.querySelector('.ow-focus')).toBeNull();
    expect(svg.hasAttribute('tabindex')).toBe(false);
    // update() with no selection is a no-op, not an error.
    expect(() => plot.update()).not.toThrow();
  });

  test('draws the selection it is given, decimated or not', () => {
    const selection = createSelection(3000);
    selection.set([1, 2, 3], 'test');
    const { svg } = drawn('velocity', { selection });
    expect(svg.querySelectorAll('.ow-pt.is-selected')).toHaveLength(3);
    expect(svg.querySelectorAll('.ow-focus')).toHaveLength(1);
  });
});

describe('selection by keyboard and pointer', () => {
  function interactive(name) {
    const o = FIXTURES[name];
    const svg = svgEl();
    document.body.append(svg);
    const plot = createPlot(svg, { number, labels });
    const heard = [];
    interact(plot, svg, {
      announce: s => heard.push(s),
      describe: i => `row ${i}`,
    });
    const selection = createSelection(o.columns[0].values.length);
    // As a page does: the views repaint when the selection changes.
    selection.subscribe(() => plot.update());
    plot.draw(o, { xColumn: o.axes[0], yColumn: o.axes[1], selection });
    const key = (k, extra = {}) =>
      svg.dispatchEvent(
        new document.defaultView.KeyboardEvent('keydown', {
          key: k,
          bubbles: true,
          ...extra,
        })
      );
    return { svg, plot, selection, heard, key };
  }

  test('arrows move the focus along x, Shift extends, Space and Escape', () => {
    const { selection, heard, key, svg } = interactive('flux');
    key('Home');
    expect(selection.focus).toBe(0);
    key('ArrowRight');
    key('ArrowRight');
    expect(selection.focus).toBe(2);
    expect(heard.at(-1)).toBe('row 2');
    key('ArrowRight', { shiftKey: true });
    key('ArrowRight', { shiftKey: true });
    expect([...selection.rows()]).toEqual([2, 3, 4]);
    expect(selection.focus).toBe(4);
    expect(svg.querySelectorAll('.ow-pt.is-selected')).toHaveLength(3);
    key('Escape');
    expect(selection.size).toBe(0);
    key('End');
    expect(selection.focus).toBe(11);
    key(' ');
    expect([...selection.rows()]).toEqual([11]);
    key('PageUp');
    expect(selection.focus).toBe(0);
  });

  test('a drag selects the rows between, a click the nearest', () => {
    const { svg, plot, selection } = interactive('magnitude');
    // The plot's viewBox is 720 wide; drawn at that width on the page.
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 720 });
    const at = (type, x) =>
      svg.dispatchEvent(
        new document.defaultView.MouseEvent(type, {
          clientX: x,
          button: 0,
          bubbles: true,
        })
      );
    at('pointerdown', plot.sx(0.15));
    at('pointermove', plot.sx(0.3));
    expect(svg.querySelector('.ow-brush')).not.toBeNull();
    at('pointerup', plot.sx(0.45));
    expect(svg.querySelector('.ow-brush')).toBeNull();
    expect([...selection.rows()]).toEqual([2, 3, 4]);
    at('pointerdown', plot.sx(0.61));
    at('pointerup', plot.sx(0.61));
    expect(selection.focus).toBe(6);
  });
});

describe('the table is the plotted data', () => {
  test('every row it shows is where its point is drawn', () => {
    for (const name of ['flux', 'magnitude', 'constant']) {
      const o = FIXTURES[name];
      const { svg, plot } = drawn(name);
      const table = document.createElement('table');
      createTable(table, {
        announce() {},
        describe: () => '',
        number,
        labels,
        range: v => `${v.first}-${v.last} of ${v.n}`,
      }).draw(o, { selection: createSelection(0), caption: name });
      const xi = o.columns.findIndex(c => c.id === o.axes[0]) + 1;
      const yi = o.columns.findIndex(c => c.id === o.axes[1]) + 1;
      const s = plot.at();
      const W = 720 - 70 - 16;
      const H = 380 - 14 - 46;
      const points = [...svg.querySelectorAll('.ow-points .ow-pt')].map(c => [
        Number(c.getAttribute('cx')),
        Number(c.getAttribute('cy')),
      ]);
      // Too few rows to be decimated: one point per row, in x order.
      const rows = [...table.querySelectorAll('tbody tr')];
      expect(points).toHaveLength(rows.length);
      const byX = rows
        .map(tr => [...tr.children].map(td => td.textContent))
        .map((cells, k) => [Number(cells[xi]), Number(cells[yi]), k])
        .sort((a, b) => a[0] - b[0] || a[2] - b[2]);
      byX.forEach(([x, y], k) => {
        const fy = ((y - s.y0) / (s.y1 - s.y0)) * H;
        const cx = 70 + ((x - s.x0) / (s.x1 - s.x0)) * W;
        const cy = s.flip ? 14 + fy : 380 - 46 - fy;
        expect(Math.abs(points[k][0] - cx)).toBeLessThan(0.06);
        expect(Math.abs(points[k][1] - cy)).toBeLessThan(0.06);
      });
    }
  });
});
