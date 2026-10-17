/**
 * @jest-environment jsdom
 */
import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  jest,
} from '@jest/globals';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';

/* global document, window -- jsdom's, installed below */

// =============================================================================
// js/plot/chart.js: the series chart, without a page (D-PLOT-02, stage 3a)
// -----------------------------------------------------------------------------
// One test group per feature the five Chart.js charts need and the component
// had not got:
//   - connected series with a color, a width and a dash, points, a filled area;
//   - a legend that hides and shows series, from the keyboard;
//   - a tooltip, and a keyboard readout that says the same in words;
//   - a draw that updates the nodes it has, and a cap on the points drawn;
//   - the chart as a standalone image;
//   - error bars with caps;
//   - a repaint on a theme change;
//   - raw arrays, with no unit registered.
// The rendering tests read the drawn markup back against the chart's own
// geometry, as tests/plot.test.js does for the table plot: the path's vertices
// are where the data is, to a tenth of a pixel.
// =============================================================================

import { createChart, decimate, niceTicks } from '../js/plot/chart.js';
import { exportSvg } from '../js/plot/export.js';

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

const N = (n, f) => Array.from({ length: n }, (_, i) => f(i));

/** A chart in a fresh host, pointer geometry stubbed to the drawn size. */
function make(opts = {}) {
  const host = document.createElement('div');
  document.body.append(host);
  const chart = createChart(host, {
    number: v => String(Math.round(v * 1000) / 1000),
    labels: {
      legend: 'Series',
      toggled: (label, shown) => `${label} ${shown ? 'shown' : 'hidden'}`,
    },
    theme: false,
    ...opts,
  });
  chart.element.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    width: 640,
    height: 220,
  });
  return { host, chart, svg: chart.element };
}

const SPEC = () => ({
  label: 'Energy over time',
  xTitle: 'Time (s)',
  yTitle: 'Energy (J)',
  series: [
    {
      id: 'ke',
      label: 'Kinetic',
      x: [0, 1, 2, 3, 4],
      y: [1, 3, 2, 5, 4],
      color: '#00ff88',
      width: 2,
    },
    {
      id: 'pe',
      label: 'Potential',
      x: [0, 1, 2, 3, 4],
      y: [-1, -3, -2, -5, -4],
      color: '#ff8800',
      width: 3,
      dash: [5, 3],
    },
  ],
});

/** The vertices of a drawn path, as numbers. */
const vertices = d =>
  [...d.matchAll(/[ML]([-\d.]+),([-\d.]+)/g)].map(m => [+m[1], +m[2]]);

const keydown = (svg, key) =>
  svg.dispatchEvent(
    new window.KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
    })
  );

describe('raw arrays, no registered units', () => {
  test('draw from plain arrays and plain strings', () => {
    const { chart, svg } = make();
    chart.draw({
      xTitle: 'Orbit (binary separations)',
      yTitle: 'Distance from primary',
      series: [
        { label: 'trial', x: new Float64Array([1, 2, 3]), y: [2, 4, 8] },
      ],
    });
    const texts = [...svg.querySelectorAll('text')].map(t => t.textContent);
    expect(texts).toContain('Orbit (binary separations)');
    expect(texts).toContain('Distance from primary');
  });

  test('imports only the name registry: no table readers, no units, no plot core', () => {
    const src = readFileSync('js/plot/chart.js', 'utf8');
    expect(src.match(/^import\s.*$/gm)).toEqual([
      "import { EV_THEME_CHANGED } from '../names.js';",
    ]);
    // The one thing it fetches, and only when asked: the PNG.
    expect(src.match(/import\(['"][^'"]+['"]\)/g)).toEqual([
      "import('./export.js')",
    ]);
    expect(readFileSync('js/plot/export.js', 'utf8')).not.toMatch(/^import\s/m);
  });

  test('draws nothing without data, and says it is a plot of nothing yet', () => {
    const { chart, svg } = make();
    chart.draw({ series: [{ label: 'a', x: [], y: [] }] });
    expect(svg.querySelector('path').getAttribute('d')).toBe('');
    expect(svg.querySelectorAll('circle')).toHaveLength(0);
  });
});

describe('connected series', () => {
  test('a path through the data, in the series color, width and dash', () => {
    const { chart, svg } = make();
    chart.draw(SPEC());
    const geo = chart.stats().geometry;
    const lines = [...svg.querySelectorAll('path[stroke-linejoin]')];
    expect(lines).toHaveLength(2);
    const [a, b] = lines;
    expect(a.getAttribute('stroke')).toBe('#00ff88');
    expect(a.getAttribute('stroke-width')).toBe('2');
    expect(a.hasAttribute('stroke-dasharray')).toBe(false);
    expect(b.getAttribute('stroke')).toBe('#ff8800');
    expect(b.getAttribute('stroke-width')).toBe('3');
    expect(b.getAttribute('stroke-dasharray')).toBe('5 3');
    const spec = SPEC();
    vertices(a.getAttribute('d')).forEach(([x, y], i) => {
      expect(x).toBeCloseTo(geo.sx(spec.series[0].x[i]), 1);
      expect(y).toBeCloseTo(geo.sy(spec.series[0].y[i]), 1);
    });
    expect(vertices(a.getAttribute('d'))).toHaveLength(5);
  });

  test('a series with gaps is drawn in pieces, not joined across them', () => {
    const { chart, svg } = make();
    chart.draw({
      series: [{ label: 'g', x: [0, 1, 2, 3, 4], y: [1, 2, null, 4, NaN] }],
    });
    const d = svg.querySelector('path[stroke-linejoin]').getAttribute('d');
    expect(d.match(/M/g)).toHaveLength(2);
  });

  test('points only, or points on the line', () => {
    const { chart, svg } = make();
    chart.draw({
      series: [
        {
          id: 'p',
          label: 'p',
          x: [0, 1, 2],
          y: [1, 2, 3],
          mode: 'points',
          radius: 4,
        },
        { id: 'b', label: 'b', x: [0, 1], y: [1, 2], mode: 'both' },
      ],
    });
    const gs = [...svg.querySelectorAll('g[clip-path]')];
    // Points alone: no line drawn, three circles.
    expect(gs[0].querySelector('path[stroke-linejoin]').getAttribute('d')).toBe(
      ''
    );
    expect(gs[0].querySelectorAll('circle')).toHaveLength(3);
    expect(gs[0].querySelector('circle').getAttribute('r')).toBe('4');
    // Both: a line and two circles.
    expect(
      gs[1].querySelector('path[stroke-linejoin]').getAttribute('d')
    ).not.toBe('');
    expect(gs[1].querySelectorAll('circle')).toHaveLength(2);
  });

  test('a filled area closes down to the baseline of the axis', () => {
    const { chart, svg } = make();
    chart.draw({
      yRange: [0.9, 1.1],
      series: [
        {
          label: 'f',
          x: [0, 1, 2],
          y: [1, 0.95, 1],
          fill: true,
          color: '#4facfe',
        },
      ],
    });
    const geo = chart.stats().geometry;
    const area = svg.querySelector('path[stroke="none"]');
    expect(area.getAttribute('fill')).toBe('#4facfe');
    expect(area.getAttribute('fill-opacity')).toBe('0.15');
    const v = vertices(area.getAttribute('d'));
    // The two closing vertices are on the lower edge (zero is off the axis).
    expect(v.at(-1)[1]).toBeCloseTo(geo.sy(0.9), 1);
    expect(v.at(-2)[1]).toBeCloseTo(geo.sy(0.9), 1);
    expect(area.getAttribute('d')).toMatch(/Z$/);
  });

  test('a fill that is a color keeps it, with no extra opacity', () => {
    const { chart, svg } = make();
    chart.draw({
      series: [
        { label: 'f', x: [0, 1], y: [1, 2], fill: 'rgba(79, 172, 254, 0.1)' },
      ],
    });
    const area = svg.querySelector('path[stroke="none"]');
    expect(area.getAttribute('fill')).toBe('rgba(79, 172, 254, 0.1)');
    expect(area.hasAttribute('fill-opacity')).toBe(false);
  });

  test('a series with a higher order is drawn first, behind', () => {
    const { chart, svg } = make();
    chart.draw({
      series: [
        { id: 'ideal', label: 'i', x: [0, 1], y: [0, 1], order: 2 },
        {
          id: 'data',
          label: 'd',
          x: [0, 1],
          y: [1, 0],
          order: 1,
          mode: 'points',
        },
      ],
    });
    const gs = [...svg.querySelectorAll('g[clip-path]')];
    expect(
      gs[0].querySelector('path[stroke-linejoin]').getAttribute('d')
    ).not.toBe('');
    expect(gs[1].querySelectorAll('circle')).toHaveLength(2);
  });
});

describe('axes from the arrays', () => {
  test('ticks and titles: golden values for round data', () => {
    expect(niceTicks(0, 10, 5)).toEqual([0, 2, 4, 6, 8, 10]);
    expect(niceTicks(0.9, 1.1, 5)).toEqual([0.9, 0.95, 1, 1.05, 1.1]);
    expect(niceTicks(-5, 5, 5)).toEqual([-4, -2, 0, 2, 4]);
    expect(niceTicks(0, 0.003, 3)).toEqual([0, 0.001, 0.002, 0.003]);
    expect(niceTicks(1000, 1250, 5)).toEqual([
      1000, 1050, 1100, 1150, 1200, 1250,
    ]);
    expect(niceTicks(3, 3)).toEqual([3]);
  });

  test("the tick labels are the caller's words, and the titles are drawn", () => {
    const { chart, svg } = make({ number: v => `<${v}>` });
    chart.draw({ ...SPEC(), xRange: [0, 4], yRange: [-5, 5] });
    const texts = [...svg.querySelectorAll('text')].map(t => t.textContent);
    expect(texts).toEqual(
      expect.arrayContaining([
        '<0>',
        '<2>',
        '<4>',
        '<-4>',
        '<4>',
        'Time (s)',
        'Energy (J)',
      ])
    );
  });

  test('each axis can write its own ticks, and a change of words redraws the axes', () => {
    const { chart, svg } = make();
    const spec = { ...SPEC(), xRange: [0, 4], yRange: [-5, 5] };
    chart.draw({ ...spec, xNumber: v => `${v} s`, yNumber: v => `${v} J` });
    let texts = [...svg.querySelectorAll('text')].map(t => t.textContent);
    expect(texts).toEqual(
      expect.arrayContaining(['2 s', '4 s', '-2 J', '2 J'])
    );
    // The same ticks in another language: the axes follow the words.
    chart.draw({ ...spec, xNumber: v => `${v} seg`, yNumber: v => `${v} J` });
    texts = [...svg.querySelectorAll('text')].map(t => t.textContent);
    expect(texts).toContain('2 seg');
    expect(texts).not.toContain('2 s');
  });

  test('a fixed y range is exact; an automatic one pads the data by 5%', () => {
    const { chart } = make();
    chart.draw({ ...SPEC(), yRange: [-10, 10] });
    expect(chart.stats().geometry).toMatchObject({ y0: -10, y1: 10 });
    chart.draw(SPEC());
    const g = chart.stats().geometry;
    expect(g.y0).toBeCloseTo(-5 - 0.5, 9);
    expect(g.y1).toBeCloseTo(5 + 0.5, 9);
  });

  test('the ranges follow the series that are shown', () => {
    const { chart } = make();
    chart.draw(SPEC());
    chart.setHidden('pe', true);
    const g = chart.stats().geometry;
    expect(g.y0).toBeGreaterThan(0);
    expect(g.y1).toBeCloseTo(5 + 0.2, 9);
  });

  test('error bars widen the range', () => {
    const { chart } = make();
    chart.draw({
      series: [
        { label: 'm', x: [0, 1], y: [10, 12], sigma: [2, 2], mode: 'points' },
      ],
    });
    const g = chart.stats().geometry;
    expect(g.y0).toBeLessThan(8);
    expect(g.y1).toBeGreaterThan(14);
  });
});

describe('error bars', () => {
  test('a bar of plus and minus sigma with 3 px caps, in the series color', () => {
    const { chart, svg } = make();
    chart.draw({
      yRange: [0, 20],
      series: [
        {
          label: 'm',
          x: [1, 2],
          y: [10, 12],
          sigma: [2, 3],
          color: '#e2725b',
          mode: 'points',
        },
      ],
    });
    const { sx, sy } = chart.stats().geometry;
    const bars = svg.querySelector('g[clip-path] path[stroke-width="1"]');
    expect(bars.getAttribute('stroke')).toBe('#e2725b');
    // The path: for each point, the bar, then the two caps.
    const nums = [
      ...bars.getAttribute('d').matchAll(/[ML]([-\d.]+),([-\d.]+)/g),
    ].map(m => [+m[1], +m[2]]);
    expect(nums).toHaveLength(12);
    const [px, top, bot, capA1, capA2, capB1, capB2] = [
      nums[0][0],
      nums[0][1],
      nums[1][1],
      nums[2],
      nums[3],
      nums[4],
      nums[5],
    ];
    expect(px).toBeCloseTo(sx(1), 1);
    expect(top).toBeCloseTo(sy(12), 1);
    expect(bot).toBeCloseTo(sy(8), 1);
    expect(capA1[0]).toBeCloseTo(px - 3, 1);
    expect(capA2[0]).toBeCloseTo(px + 3, 1);
    expect(capA1[1]).toBeCloseTo(top, 1);
    expect(capB1[1]).toBeCloseTo(bot, 1);
    expect(capB2[0] - capB1[0]).toBeCloseTo(6, 1);
  });

  test('a bar with no sigma, or a sigma that is not positive, is not drawn', () => {
    const { chart, svg } = make();
    chart.draw({
      series: [
        {
          label: 'm',
          x: [1, 2, 3],
          y: [1, 2, 3],
          sigma: [0, NaN, 1],
          mode: 'points',
        },
      ],
    });
    const d = svg.querySelector('path[stroke-width="1"]').getAttribute('d');
    expect(d.match(/M/g)).toHaveLength(3); // one bar and its two caps
  });

  test('the cap is a setting, in pixels', () => {
    const { chart, svg } = make({ capPx: 5 });
    chart.draw({
      series: [
        { label: 'm', x: [1, 2], y: [1, 2], sigma: [1, 1], mode: 'points' },
      ],
    });
    const v = vertices(
      svg.querySelector('path[stroke-width="1"]').getAttribute('d')
    );
    expect(v[3][0] - v[2][0]).toBeCloseTo(10, 1);
  });
});

describe('a draw that updates, with a cap', () => {
  test('a second draw keeps the nodes it has', () => {
    const { chart, svg } = make();
    const spec = SPEC();
    chart.draw(spec);
    const path = svg.querySelector('path[stroke-linejoin]');
    const axes = svg.querySelector('g > line');
    const before = chart.stats();
    expect(before.rebuilds).toBe(2);
    // More data, same ranges: the same nodes, with new geometry.
    spec.series[0].x.push(4.5);
    spec.series[0].y.push(4.5);
    chart.draw(spec);
    expect(svg.querySelector('path[stroke-linejoin]')).toBe(path);
    expect(svg.querySelector('g > line')).toBe(axes);
    expect(chart.stats().rebuilds).toBe(2);
    expect(vertices(path.getAttribute('d'))).toHaveLength(6);
  });

  test('the axes are moved, not rebuilt: a scrolling window keeps its tick nodes', () => {
    const { chart, svg } = make();
    const labelsOf = () =>
      [...svg.querySelectorAll('text')].filter(t => t.hasAttribute('x'));
    const spec = { ...SPEC(), yRange: [-6, 6] };
    chart.draw(spec);
    const before = labelsOf();
    const first = before[0];
    // The window moves on by a few seconds: the ticks move with the data.
    for (const s of spec.series) {
      s.x = s.x.map(v => v + 1.3);
    }
    chart.draw(spec);
    const after = labelsOf();
    expect(after[0]).toBe(first);
    // Every x tick label sits where its own value is drawn.
    const g = chart.stats().geometry;
    const xLabels = after.filter(
      t => t.getAttribute('y') === String(g.frame.top + g.fh + 16)
    );
    expect(xLabels.length).toBeGreaterThan(2);
    for (const t of xLabels) {
      // Written to a tenth of a pixel, so within half of that.
      expect(
        Math.abs(+t.getAttribute('x') - g.sx(Number(t.textContent)))
      ).toBeLessThan(0.0501);
    }
  });

  test('ticks that go away take their nodes, and new ones are added', () => {
    const { chart, svg } = make();
    chart.draw({ ...SPEC(), xRange: [0, 4] });
    const many = svg.querySelectorAll('line').length;
    chart.draw({ ...SPEC(), xRange: [0, 4000] });
    const wide = svg.querySelectorAll('line').length;
    // Different tick counts, never leftovers: lines are a multiple of the ticks.
    expect(wide).not.toBe(0);
    chart.draw({ ...SPEC(), xRange: [0, 4] });
    expect(svg.querySelectorAll('line').length).toBe(many);
  });

  test('writes only what changed', () => {
    const { chart, svg } = make();
    const spec = SPEC();
    chart.draw(spec);
    const path = svg.querySelector('path[stroke-linejoin]');
    const set = jest.spyOn(path, 'setAttribute');
    chart.draw(spec);
    expect(set).not.toHaveBeenCalled();
  });

  test('a series that goes away takes its nodes with it, and one that returns gets new ones', () => {
    const { chart, svg } = make();
    const spec = SPEC();
    chart.draw(spec);
    const both = spec.series;
    chart.draw({ ...spec, series: [both[0]] });
    expect(svg.querySelectorAll('path[stroke-linejoin]')).toHaveLength(1);
    chart.draw({ ...spec, series: both });
    expect(svg.querySelectorAll('path[stroke-linejoin]')).toHaveLength(2);
  });

  test('the pool of points shrinks and grows with the data', () => {
    const { chart, svg } = make();
    const x = N(30, i => i);
    chart.draw({ series: [{ id: 'm', label: 'm', x, y: x, mode: 'points' }] });
    expect(svg.querySelectorAll('circle')).toHaveLength(30);
    const circle = svg.querySelector('circle');
    chart.draw({
      series: [
        {
          id: 'm',
          label: 'm',
          x: x.slice(0, 5),
          y: x.slice(0, 5),
          mode: 'points',
        },
      ],
    });
    expect(svg.querySelectorAll('circle')).toHaveLength(5);
    expect(svg.querySelector('circle')).toBe(circle);
  });

  test('only the newest points of a series are drawn, and the axes follow them', () => {
    const { chart, svg } = make({ maxPoints: 200 });
    const x = N(5000, i => i);
    chart.draw({ series: [{ label: 's', x, y: x.map(Math.sin) }] });
    const v = vertices(
      svg.querySelector('path[stroke-linejoin]').getAttribute('d')
    );
    expect(v).toHaveLength(200);
    const g = chart.stats().geometry;
    expect(g.x0).toBe(4800);
    expect(g.x1).toBe(4999);
  });

  test("a cap on one series beats the chart's", () => {
    const { chart, svg } = make({ maxPoints: 200 });
    const x = N(300, i => i);
    chart.draw({
      series: [
        { id: 'a', label: 'a', x, y: x },
        { id: 'b', label: 'b', x, y: x, maxPoints: 50 },
      ],
    });
    const lens = [...svg.querySelectorAll('path[stroke-linejoin]')].map(
      p => vertices(p.getAttribute('d')).length
    );
    expect(lens).toEqual([200, 50]);
  });

  test('a long series is drawn as the lowest and highest in each column', () => {
    const x = N(2000, i => i);
    const y = x.map(
      i => Math.sin(i / 7) + (i === 777 ? 9 : 0) - (i === 1500 ? 9 : 0)
    );
    const { chart, svg } = make({ width: 200 });
    chart.draw({ series: [{ label: 's', x, y }] });
    const v = vertices(
      svg.querySelector('path[stroke-linejoin]').getAttribute('d')
    );
    const { fw } = chart.stats().geometry;
    expect(v.length).toBeLessThanOrEqual(2 * fw);
    expect(v.length).toBeGreaterThan(fw);
    // The spike and the dip a reader could see are kept.
    const { sy } = chart.stats().geometry;
    const ys = v.map(p => p[1]);
    expect(Math.min(...ys)).toBeCloseTo(sy(Math.max(...y)), 0);
    expect(Math.max(...ys)).toBeCloseTo(sy(Math.min(...y)), 0);
  });

  test('decimate() keeps the extreme of each column, in x order', () => {
    const xs = N(100, i => i);
    const ys = xs.map(i => (i === 40 ? 50 : i === 41 ? -50 : 0));
    // Four columns of 25: the spike and the dip share the second, and come
    // out in the order they happen; a flat column keeps one point.
    expect(decimate(xs, ys, 0, 100, 0, 99, 4)).toEqual([0, 40, 41, 50, 75]);
    // Few enough points: nothing to thin.
    expect(decimate(xs, ys, 0, 6, 0, 99, 4)).toBeNull();
  });
});

describe('the legend', () => {
  test('one real button per series, pressed while it is shown', () => {
    const { chart, host } = make();
    chart.draw(SPEC());
    const buttons = [...host.querySelectorAll('ul button')];
    expect(buttons.map(b => b.textContent)).toEqual(['Kinetic', 'Potential']);
    expect(buttons.every(b => b.type === 'button')).toBe(true);
    expect(buttons.map(b => b.getAttribute('aria-pressed'))).toEqual([
      'true',
      'true',
    ]);
    expect(host.querySelector('ul').getAttribute('aria-label')).toBe('Series');
    // The dash is in the swatch, not only the color.
    const dash = buttons[1]
      .querySelector('line')
      .getAttribute('stroke-dasharray');
    expect(dash).toBe('5 3');
  });

  test('a single series has no legend unless asked for', () => {
    const { chart, host } = make();
    const spec = SPEC();
    chart.draw({ ...spec, series: [spec.series[0]] });
    expect(host.querySelector('ul').hidden).toBe(true);
    chart.draw({ ...spec, series: [spec.series[0]], legend: true });
    expect(host.querySelector('ul').hidden).toBe(false);
    chart.draw({ ...spec, legend: false });
    expect(host.querySelector('ul').hidden).toBe(true);
  });

  test('pressing a button hides the series, and says so', () => {
    const { chart, host, svg } = make();
    chart.draw(SPEC());
    const [first] = host.querySelectorAll('ul button');
    first.click();
    expect(svg.querySelectorAll('path[stroke-linejoin]')).toHaveLength(1);
    expect(chart.isHidden('ke')).toBe(true);
    const again = host.querySelector('ul button');
    expect(again.getAttribute('aria-pressed')).toBe('false');
    expect(host.querySelector('[role=status]').textContent).toBe(
      'Kinetic hidden'
    );
    again.click();
    expect(svg.querySelectorAll('path[stroke-linejoin]')).toHaveLength(2);
    expect(host.querySelector('[role=status]').textContent).toBe(
      'Kinetic shown'
    );
  });

  test('toggling changes the button, it does not replace it: the keyboard stays where it was', () => {
    const { chart, host } = make();
    chart.draw(SPEC());
    const [first] = host.querySelectorAll('ul button');
    first.focus();
    first.click();
    expect(host.querySelector('ul button')).toBe(first);
    expect(document.activeElement).toBe(first);
    expect(first.getAttribute('aria-pressed')).toBe('false');
  });

  test('a rebuilt legend (a language change) hands focus back to the same series', () => {
    const { chart, host } = make();
    chart.draw(SPEC());
    host.querySelectorAll('ul button')[1].focus();
    const renamed = SPEC();
    renamed.series[1].label = 'Potencial';
    chart.draw(renamed);
    expect(document.activeElement.textContent).toBe('Potencial');
  });

  test('a redraw keeps what the reader hid', () => {
    const { chart, host } = make();
    const spec = SPEC();
    spec.series[0].hidden = false;
    chart.draw(spec);
    host.querySelector('ul button').click();
    chart.draw(spec); // the same spec again, hidden: false repeated
    expect(chart.isHidden('ke')).toBe(true);
  });

  test("a spec that changes a series' visibility is obeyed", () => {
    const { chart } = make();
    const spec = SPEC();
    spec.series[1].hidden = true;
    chart.draw(spec);
    expect(chart.isHidden('pe')).toBe(true);
    spec.series[1].hidden = false;
    chart.draw(spec);
    expect(chart.isHidden('pe')).toBe(false);
  });

  test('keyboard: buttons are in the tab order and Enter or Space press them', () => {
    const { chart, host } = make();
    chart.draw(SPEC());
    const [first] = host.querySelectorAll('ul button');
    expect(first.tabIndex).toBe(0);
    // A native button turns Enter and Space into a click; the click is what
    // the component listens to, so a keyboard needs nothing else of it.
    first.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    expect(chart.isHidden('ke')).toBe(true);
  });

  test('the legend is rebuilt only when it changes', () => {
    const { chart, host } = make();
    chart.draw(SPEC());
    const button = host.querySelector('ul button');
    chart.draw(SPEC());
    expect(host.querySelector('ul button')).toBe(button);
    const renamed = SPEC();
    renamed.series[0].label = 'Cinética';
    chart.draw(renamed);
    expect(host.querySelector('ul button').textContent).toBe('Cinética');
  });
});

describe('the tooltip and the keyboard readout', () => {
  const pointer = (svg, x, y) =>
    svg.dispatchEvent(
      new window.MouseEvent('pointermove', {
        clientX: x,
        clientY: y,
        bubbles: true,
      })
    );

  test('hovering shows every series at the pointer in index mode', () => {
    const { chart, host, svg } = make({ tooltip: { mode: 'index' } });
    chart.draw(SPEC());
    const { sx, sy } = chart.stats().geometry;
    pointer(svg, sx(2) + 1, sy(2));
    const tip = host.querySelector('div > div[aria-hidden]');
    expect(tip.style.display).toBe('block');
    expect(tip.textContent).toBe('2Kinetic: 2Potential: -2');
    // Marks on both values, and the guide.
    expect(svg.querySelectorAll('g:last-child circle')).toHaveLength(2);
  });

  test('nearest mode picks the one point closest to the pointer', () => {
    const { chart, host, svg } = make({ tooltip: { mode: 'nearest' } });
    chart.draw(SPEC());
    const { sx, sy } = chart.stats().geometry;
    pointer(svg, sx(3), sy(-5) + 2);
    const tip = host.querySelector('div > div[aria-hidden]');
    expect(tip.textContent).toBe('3Potential: -5');
  });

  test('the caller writes the words', () => {
    const { chart, host, svg } = make({
      tooltip: {
        mode: 'nearest',
        title: x => `t = ${x} s`,
        format: ({ label, y }) => `${label}: ${y} J`,
      },
    });
    chart.draw(SPEC());
    const { sx, sy } = chart.stats().geometry;
    pointer(svg, sx(1), sy(3));
    expect(host.querySelector('div > div[aria-hidden]').textContent).toBe(
      't = 1 sKinetic: 3 J'
    );
  });

  test('error bars are in the words', () => {
    const { chart, host, svg } = make({ tooltip: { mode: 'nearest' } });
    chart.draw({
      series: [
        { label: 'm', x: [1, 2], y: [5, 6], sigma: [0.5, 0.5], mode: 'points' },
      ],
    });
    const { sx, sy } = chart.stats().geometry;
    pointer(svg, sx(2), sy(6));
    expect(host.querySelector('div > div[aria-hidden]').textContent).toContain(
      'm: 6 ± 0.5'
    );
  });

  test('leaving the plot hides it; outside the frame it is not shown', () => {
    const { chart, host, svg } = make();
    chart.draw(SPEC());
    const { sx, sy } = chart.stats().geometry;
    const tip = host.querySelector('div > div[aria-hidden]');
    pointer(svg, sx(1), sy(1));
    expect(tip.style.display).toBe('block');
    svg.dispatchEvent(new window.MouseEvent('pointerleave'));
    expect(tip.style.display).toBe('none');
    pointer(svg, 2, 2);
    expect(tip.style.display).toBe('none');
  });

  test('keyboard: the first arrow lands on the newest point and says every series there', () => {
    const { chart, host, svg } = make();
    chart.draw(SPEC());
    const status = host.querySelector('[role=status]');
    keydown(svg, 'ArrowLeft');
    expect(status.textContent).toBe('4. Kinetic: 4. Potential: -4');
    keydown(svg, 'ArrowLeft');
    expect(status.textContent).toBe('3. Kinetic: 5. Potential: -5');
    keydown(svg, 'ArrowRight');
    expect(status.textContent).toBe('4. Kinetic: 4. Potential: -4');
    keydown(svg, 'Home');
    expect(status.textContent).toBe('0. Kinetic: 1. Potential: -1');
    keydown(svg, 'End');
    expect(status.textContent).toBe('4. Kinetic: 4. Potential: -4');
    keydown(svg, 'PageUp');
    expect(status.textContent).toBe('0. Kinetic: 1. Potential: -1'); // clamped
  });

  test('keyboard: Up and Down change the series the cursor is on, at the same place along x', () => {
    const { chart, host, svg } = make({ tooltip: { mode: 'nearest' } });
    chart.draw(SPEC());
    const status = host.querySelector('[role=status]');
    keydown(svg, 'ArrowRight'); // newest of the first series
    keydown(svg, 'ArrowLeft');
    expect(status.textContent).toBe('3. Kinetic: 5');
    keydown(svg, 'ArrowDown');
    expect(status.textContent).toBe('3. Potential: -5');
    keydown(svg, 'ArrowDown');
    expect(status.textContent).toBe('3. Kinetic: 5'); // wraps
    keydown(svg, 'ArrowUp');
    expect(status.textContent).toBe('3. Potential: -5');
  });

  test('keyboard: in index mode the other series are read at the same x, whichever it is on', () => {
    const { chart, host, svg } = make();
    chart.draw(SPEC());
    const status = host.querySelector('[role=status]');
    keydown(svg, 'ArrowLeft');
    keydown(svg, 'ArrowDown');
    expect(status.textContent).toBe('4. Potential: -4. Kinetic: 4');
  });

  test('keyboard: Escape lets go, and the readout stays out of the way', () => {
    const { chart, host, svg } = make();
    chart.draw(SPEC());
    keydown(svg, 'ArrowLeft');
    const tip = host.querySelector('div > div[aria-hidden]');
    expect(tip.style.display).toBe('block');
    keydown(svg, 'Escape');
    expect(tip.style.display).toBe('none');
  });

  test('keyboard: keys the chart does not use are left alone', () => {
    const { chart, svg } = make();
    chart.draw(SPEC());
    const e = new window.KeyboardEvent('keydown', {
      key: 'Tab',
      cancelable: true,
    });
    svg.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(false);
    const arrow = new window.KeyboardEvent('keydown', {
      key: 'ArrowLeft',
      cancelable: true,
    });
    svg.dispatchEvent(arrow);
    expect(arrow.defaultPrevented).toBe(true);
  });

  test('the readout follows the series as it grows and shrinks', () => {
    const { chart, host, svg } = make({ maxPoints: 3 });
    const spec = SPEC();
    chart.draw(spec);
    const status = host.querySelector('[role=status]');
    keydown(svg, 'ArrowLeft');
    keydown(svg, 'Home');
    // The window is the newest three: its first is row 2.
    expect(status.textContent).toBe('2. Kinetic: 2. Potential: -2');
    // Data arrives; the cursor stays inside what is drawn, at its oldest point.
    spec.series[0].x.push(5, 6);
    spec.series[0].y.push(7, 8);
    chart.draw(spec);
    const tip = host.querySelector('div > div[aria-hidden]');
    expect(tip.style.display).toBe('block');
    expect(tip.textContent).toBe('4Kinetic: 4Potential: -4');
  });

  test('the chart can be labeled and described by the page', () => {
    const { chart, svg } = make({ labels: { role: 'plot' } });
    chart.draw({ ...SPEC(), label: 'Energy over time' });
    expect(svg.getAttribute('aria-label')).toBe('Energy over time');
    expect(svg.getAttribute('aria-roledescription')).toBe('plot');
    expect(svg.getAttribute('role')).toBe('group');
    expect(svg.tabIndex).toBe(0);
  });
});

describe('theme', () => {
  test('colors that are functions are read again by repaint()', () => {
    const { chart, svg } = make();
    let accent = '#4facfe';
    chart.draw({
      series: [{ label: 'a', x: [0, 1], y: [0, 1], color: () => accent }],
    });
    const line = svg.querySelector('path[stroke-linejoin]');
    expect(line.getAttribute('stroke')).toBe('#4facfe');
    accent = '#0a5bb5';
    chart.repaint();
    expect(line.getAttribute('stroke')).toBe('#0a5bb5');
  });

  test('the legend swatch follows too', () => {
    const { chart, host } = make();
    let c = '#111111';
    chart.draw({
      series: [
        { label: 'a', x: [0, 1], y: [0, 1], color: () => c },
        { label: 'b', x: [0, 1], y: [1, 0], color: '#222222' },
      ],
    });
    c = '#333333';
    chart.repaint();
    expect(host.querySelector('ul line').getAttribute('stroke')).toBe(
      '#333333'
    );
  });

  test("the page's theme event repaints, and destroy() stops listening", () => {
    const host = document.createElement('div');
    const chart = createChart(host, { number: String });
    let c = 'red';
    chart.draw({
      series: [{ label: 'a', x: [0, 1], y: [0, 1], color: () => c }],
    });
    const line = host.querySelector('path[stroke-linejoin]');
    c = 'blue';
    window.dispatchEvent(new window.CustomEvent('gravitasThemeChanged'));
    expect(line.getAttribute('stroke')).toBe('blue');
    chart.destroy();
    c = 'green';
    window.dispatchEvent(new window.CustomEvent('gravitasThemeChanged'));
    expect(line.getAttribute('stroke')).toBe('blue');
    expect(host.childNodes).toHaveLength(0);
  });

  test('text, grid and axes use the design tokens, with fallbacks, and need no stylesheet', () => {
    const { chart, svg } = make();
    chart.draw(SPEC());
    const fills = new Set(
      [...svg.querySelectorAll('text')].map(t => t.getAttribute('fill'))
    );
    for (const f of fills)
      expect(f).toMatch(/^var\(--[a-z-]+, #[0-9a-f]{3,6}\)$/);
    const strokes = [...svg.querySelectorAll('g > line')].map(l =>
      l.getAttribute('stroke')
    );
    for (const s of strokes) expect(s).toMatch(/^var\(--/);
  });
});

describe('the image', () => {
  test('is the chart with a background, its legend above it, and no page behind it', () => {
    const { chart } = make();
    chart.draw(SPEC());
    const out = exportSvg(chart.parts(), { background: '#101018' });
    const doc = new JSDOM(out.text, { contentType: 'image/svg+xml' }).window
      .document;
    const svg = doc.documentElement;
    expect(svg.getAttribute('xmlns')).toBe('http://www.w3.org/2000/svg');
    expect(+svg.getAttribute('height')).toBe(out.height);
    expect(out.height).toBeGreaterThan(220);
    // One row of legend above the plot: the viewBox starts above zero.
    expect(svg.getAttribute('viewBox').split(' ')[1]).toBe(
      String(220 - out.height)
    );
    expect(svg.hasAttribute('tabindex')).toBe(false);
    const bg = svg.firstElementChild;
    expect(bg.getAttribute('fill')).toBe('#101018');
    const words = [...svg.querySelectorAll('text')].map(t => t.textContent);
    expect(words).toEqual(
      expect.arrayContaining(['Kinetic', 'Potential', 'Time (s)'])
    );
    // The dashed series is dashed in the legend.
    const dashes = [...svg.querySelectorAll('g[transform] line')].map(l =>
      l.getAttribute('stroke-dasharray')
    );
    expect(dashes).toEqual(['none', '5 3']);
  });

  test('a hidden series is not in the legend', () => {
    const { chart } = make();
    chart.draw(SPEC());
    chart.setHidden('pe', true);
    const out = exportSvg(chart.parts(), { background: '#fff' });
    expect(out.text).toContain('Kinetic');
    expect(out.text).not.toContain('>Potential<');
  });

  test('the legend can be left out', () => {
    const { chart } = make();
    chart.draw(SPEC());
    const out = exportSvg(chart.parts(), { legend: false, background: '#fff' });
    expect(out.height).toBe(220);
  });
});

describe('the chart as data (parts), for the ports and their parity test', () => {
  test('say what the chart is: words, legend, ticks with their values, series as drawn', () => {
    const { chart } = make({ tooltip: { mode: 'nearest' } });
    const spec = SPEC();
    spec.series[0].fill = '#223344';
    spec.series[1].order = 2;
    spec.series[1].mode = 'both';
    spec.series[1].radius = 4;
    chart.draw(spec);
    const p = chart.parts();
    expect(p).toMatchObject({
      label: 'Energy over time',
      xTitle: 'Time (s)',
      yTitle: 'Energy (J)',
      legend: true,
      tooltip: 'nearest',
      capPx: 3,
    });
    // A tick is its value and its words, so a test can check the two agree.
    expect(p.ticks.x.length).toBeGreaterThan(1);
    for (const [v, text] of [...p.ticks.x, ...p.ticks.y]) {
      expect(Number.isFinite(v)).toBe(true);
      expect(text).toBe(String(Math.round(v * 1000) / 1000));
    }
    // The series' data, for a test that reads what the chart was given.
    expect(p.series[0].x).toBe(spec.series[0].x);
    expect(p.series[0].y).toBe(spec.series[0].y);
    expect(
      p.series.map(s => [s.id, s.fill, s.order, s.mode, s.radius])
    ).toEqual([
      ['ke', '#223344', 0, 'line', 3],
      ['pe', null, 2, 'both', 4],
    ]);
  });

  test('a single series has no legend, unless the spec asks', () => {
    const { chart } = make();
    const one = SPEC();
    one.series.pop();
    chart.draw(one);
    expect(chart.parts().legend).toBe(false);
    chart.draw({ ...one, legend: true });
    expect(chart.parts().legend).toBe(true);
  });

  test('maxTicks limits the ticks on both axes, and the y axis always has at least two', () => {
    const ticksOf = (opts, axis = 'x') => {
      const { chart, host } = make({ height: 300, ...opts });
      Object.defineProperty(host.querySelector('div'), 'clientWidth', {
        get: () => 900,
      });
      chart.draw({
        series: [
          { id: 'a', x: [0, 10, 20, 30, 40, 50, 60], y: [1, 2, 3, 4, 5, 6, 7] },
        ],
      });
      return chart.parts().ticks[axis].length;
    };
    expect(ticksOf({})).toBeGreaterThan(5);
    expect(ticksOf({ maxTicks: 3 })).toBeLessThanOrEqual(3);
    // A tall host asks for seven along y; the ceiling is honored there too
    // (A3's recorded 6 on both axes, whatever the panel's height).
    expect(ticksOf({}, 'y')).toBeGreaterThan(6);
    expect(ticksOf({ maxTicks: 6 }, 'y')).toBeLessThanOrEqual(6);
    expect(ticksOf({ maxTicks: 3 }, 'y')).toBeLessThanOrEqual(3);
    // A short chart whose range does not straddle a round value still has ticks.
    const small = make({ height: 90 });
    small.chart.draw({
      series: [{ id: 'a', x: [0, 1, 2], y: [-3.2, 0.4, 4.1] }],
    });
    expect(small.chart.parts().ticks.y.length).toBeGreaterThanOrEqual(2);
  });

  test('a host shorter than the old minimum is filled, not overflowed', () => {
    const { chart, host, svg } = make({ height: 'fill' });
    Object.defineProperty(host, 'clientHeight', { get: () => 90 });
    chart.draw(SPEC());
    expect(Number(svg.getAttribute('height'))).toBeLessThanOrEqual(90);
  });
});

describe('round ticks near a constant', () => {
  test('a range whose width is a round step to within float error keeps that step', () => {
    // 1.00018 - 0.99998 is 0.00020000000000009: a fifth of it is a hair over
    // 5e-5, and the step used to jump to 1e-4 and leave two ticks.
    expect(niceTicks(0.99998, 1.00018, 4)).toEqual([
      1, 1.00005, 1.0001, 1.00015,
    ]);
  });
});
