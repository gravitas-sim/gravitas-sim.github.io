// =============================================================================
// What the five Chart.js charts were, and what the ported ones are (D-PLOT-02)
// -----------------------------------------------------------------------------
// The plot component (js/plot/chart.js) replaces the five Chart.js charts, and
// "matches" has to mean something. tests/fixtures/chart-parity.json is what
// each chart was, recorded from the real application before any was ported:
// the series, their colors (as design tokens where a token supplies them),
// widths and dashes, the axis titles and tick formats, the legend, the
// tooltip, the error-bar caps. The caps and rates that live in source
// constants are pinned by tests/chartParity.test.js.
//
//   A4 and A5 (still Chart.js): read through Chart.js's own registry and
//   compared to the fixture as they always were.
//
//   A1, A2 and A3 (ported, stage 3b): read through the component's own
//   description of the chart (js/plot/chart.js `parts()`, plus the chart's
//   markup for what it draws: colors as the page resolves them, the error bars
//   as paths, the tooltip as hovered) and compared to the SAME fixture. A fact
//   the component cannot state, or that changed on purpose, is listed in
//   `portedExpectation()` below with its reason (PLOT_COMPONENT.md,
//   "Documented equivalents"), so the fixture stays the Chart.js record and the
//   comparison is strict everywhere else.
//
// CHART_PARITY_RECORD=1 rewrites the fixture from the running application
// instead of comparing, for A4 and A5 only: A1 to A3 would record the
// component, and the fixture is the Chart.js record they are held to (then
// `npx prettier --write` the fixture):
//
//   CHART_PARITY_RECORD=1 npx playwright test e2e/chartParity.spec.js
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test, expect } from './fixtures.js';

const FIXTURE = join(process.cwd(), 'tests', 'fixtures', 'chart-parity.json');
const RECORD = process.env.CHART_PARITY_RECORD === '1';

/**
 * What a Chart.js chart is, as plain data. Runs in the page.
 * @param {string} canvasId
 * @param {string[]} custom - Axes whose source defines a tick callback
 * @returns {object|null}
 */
function readChart(canvasId, custom) {
  const chart = window.Chart?.getChart?.(document.getElementById(canvasId));
  if (!chart) return null;
  const tokens = window.__chartTokens;
  // A color is its design token where one supplies it: the token is the fact,
  // the resolved value depends on the theme.
  const color = c => {
    if (typeof c !== 'string') return c ?? null;
    const hit = Object.entries(tokens)
      .filter(([, v]) => v === c)
      .map(([k]) => k);
    return hit.length ? `token:${hit.join('|')}` : c;
  };
  const o = chart.options;
  const own = chart.config._config.options;
  const defaults = window.Chart.defaults;
  const axis = a => {
    const s = o.scales[a];
    return {
      type: chart.scales[a].type,
      title: s.title?.display ? s.title.text : null,
      titleColor: color(s.title?.color),
      titleSize: s.title?.font?.size ?? null,
      tickColor: color(s.ticks?.color),
      tickSize: s.ticks?.font?.size ?? null,
      maxTicks: s.ticks?.maxTicksLimit ?? null,
      gridColor: color(s.grid?.color),
      // Only where the chart's source writes its own tick text: the merged
      // options always hold the library's formatter, so the source is named.
      customTickLabels: custom.includes(a)
        ? [0, 1.5, 123.456, 12345, 1e6, -0.0025].map(v =>
            String(s.ticks.callback.call(chart.scales[a], v, 0, []))
          )
        : null,
    };
  };
  const legend = o.plugins.legend;
  const tip = o.plugins.tooltip;
  const datasetIndexes = chart.data.datasets.map((_, i) => i);
  return {
    type: chart.config.type,
    responsive: o.responsive,
    keepsAspect: o.maintainAspectRatio,
    animation:
      o.animation === false || o.animation?.duration === 0 ? 'none' : 'on',
    parsing: o.parsing === false ? 'objects' : 'default',
    categoryX: chart.scales.x.type === 'category',
    series: datasetIndexes.map(i => {
      const d = chart.data.datasets[i];
      return {
        label: String(d.label),
        color: color(d.borderColor),
        fillColor: d.fill ? color(d.backgroundColor) : null,
        width: d.borderWidth ?? null,
        dash: d.borderDash ?? [],
        fill: Boolean(d.fill),
        tension: d.tension ?? 0,
        pointRadius: d.pointRadius ?? null,
        line: d.showLine !== false,
        hidden: Boolean(d.hidden) || chart.getDatasetMeta(i).hidden === true,
        order: d.order ?? 0,
      };
    }),
    x: axis('x'),
    y: axis('y'),
    legend: {
      shown: legend.display !== false,
      position: legend.position,
      textColor: color(own.plugins?.legend?.labels?.color),
      togglesSeries: legend.onClick === defaults.plugins.legend.onClick,
    },
    tooltip: {
      enabled: tip.enabled !== false,
      mode: tip.mode ?? o.interaction?.mode ?? null,
      intersect: tip.intersect ?? o.interaction?.intersect ?? null,
      custom: typeof own.plugins?.tooltip?.callbacks?.label === 'function',
    },
    plugins: (chart.config.plugins || []).map(p => p.id),
  };
}

/** Make the design tokens' resolved colors known to readChart(). */
async function exposeTokens(page) {
  await page.evaluate(async () => {
    const { chartColors } = await import('/js/observationChart.js');
    window.__chartTokens = chartColors();
    window.__readChart = null;
  });
}

const read = (page, canvasId, custom = []) =>
  page.evaluate(
    `(${readChart.toString()})(${JSON.stringify(canvasId)}, ${JSON.stringify(custom)})`
  );

/** Poll until the canvas has a chart, then read it. */
async function chartOf(page, canvasId, custom = []) {
  await exposeTokens(page);
  await expect
    .poll(async () => (await read(page, canvasId)) !== null, {
      timeout: 30_000,
      message: `${canvasId} never got a chart`,
    })
    .toBe(true);
  return read(page, canvasId, custom);
}

/**
 * Each test checks its own chart against its own key of the fixture, so every
 * test runs alone, in any order, and in any shard. With RECORD set it merges
 * its key into the fixture instead.
 */
function settle(key, value) {
  const fixture = JSON.parse(readFileSync(FIXTURE, 'utf8'));
  if (RECORD) {
    fixture[key] = value;
    const sorted = Object.fromEntries(
      Object.entries(fixture).sort(([a], [b]) => (a < b ? -1 : 1))
    );
    writeFileSync(FIXTURE, JSON.stringify(sorted, null, 2) + '\n');
    return;
  }
  expect(value).toEqual(fixture[key]);
}

/**
 * What a chart drawn by the component is, in the fixture's shape. Runs in the
 * page. The numbers and words come from the chart's `parts()`; the colors are
 * what the page resolves the drawn marks to (a CSS variable written on an
 * attribute), named as the design token that supplies them; the tooltip is
 * what hovering the chart shows; the legend's toggle is a click.
 * @param {{hostId: string, mod: string, accessor: string}} where
 * @returns {Promise<object|null>}
 */
async function readComponent({ hostId, mod, accessor }) {
  const host = document.getElementById(hostId);
  const parts = (await import(mod))[accessor]();
  if (!host || !parts) return null;
  const { chartColors } = await import('/js/observationChart.js');
  const probe = document.body.appendChild(document.createElement('i'));
  const norm = c => {
    probe.style.color = '';
    probe.style.color = c;
    return getComputedStyle(probe).color;
  };
  const palette = Object.fromEntries(
    Object.entries(chartColors()).map(([k, v]) => [k, norm(v)])
  );
  const token = c => {
    const n = norm(c);
    const hit = Object.keys(palette).filter(k => palette[k] === n);
    return hit.length ? `token:${hit.join('|')}` : n;
  };
  const svg = parts.svg;
  const style = (selector, prop) =>
    token(getComputedStyle(svg.querySelector(selector))[prop]);
  const size = selector =>
    Number(svg.querySelector(selector).getAttribute('font-size'));
  const legend = host.firstElementChild;
  const box = svg.viewBox.baseVal;
  const axis = a => {
    const ticks = parts.ticks[a];
    return {
      type: ticks.every(([v]) => Number.isFinite(v)) ? 'linear' : 'category',
      title: parts[`${a}Title`],
      titleColor: style('text[font-size="11"]', 'fill'),
      titleSize: size('text[font-size="11"]'),
      tickColor: style('text[font-size="10"]', 'fill'),
      tickSize: size('text[font-size="10"]'),
      tickCount: ticks.length,
      tickValues: ticks.map(([v]) => v),
      tickTexts: ticks.map(([, text]) => text),
      gridColor: style('line[stroke*="--border-subtle"]', 'stroke'),
    };
  };

  // Hover: the tooltip's words, then let go.
  const at = svg.getBoundingClientRect();
  const plot = svg.querySelector('clipPath rect');
  const [px, py, pw, ph] = ['x', 'y', 'width', 'height'].map(a =>
    Number(plot.getAttribute(a))
  );
  svg.dispatchEvent(
    new window.PointerEvent('pointermove', {
      bubbles: true,
      clientX: at.left + (px + pw * 0.6) * (at.width / box.width),
      clientY: at.top + (py + ph * 0.5) * (at.height / box.height),
    })
  );
  const tip = svg.nextElementSibling;
  const hover = {
    shown: tip.style.display === 'block',
    lines: [...tip.children].map(d => d.textContent),
  };
  svg.dispatchEvent(new window.PointerEvent('pointerleave', { bubbles: true }));

  // The legend: a click hides a series, a second shows it again.
  const button = legend.querySelector('button[data-series]');
  let toggles = null;
  if (!legend.hidden && button) {
    const before = button.getAttribute('aria-pressed');
    button.click();
    const hidden = button.getAttribute('aria-pressed');
    button.click();
    toggles = before === 'true' && hidden === 'false';
  }

  // The error bars: the paths the measurements series drew, read against the
  // points beside them.
  let bars = null;
  for (const g of svg.querySelectorAll(':scope > g > g[clip-path]')) {
    const d = g.children[1].getAttribute('d');
    if (!d) continue;
    const nums = d.match(/-?\d+(\.\d+)?/g).map(Number);
    const [px, top, , bottom, capL, , capR] = nums;
    const dot = g.querySelector('circle');
    const yTicks = [...svg.querySelectorAll('text[text-anchor="end"]')];
    const at = parts.ticks.y.slice(0, 2).map(([v, text]) => ({
      v,
      y:
        Number(yTicks.find(t => t.textContent === text).getAttribute('y')) -
        3.5,
    }));
    bars = {
      count: nums.length / 12,
      x: px === Number(dot.getAttribute('cx')),
      centered:
        Math.abs((top + bottom) / 2 - Number(dot.getAttribute('cy'))) < 0.3,
      halfLengthPx: (bottom - top) / 2,
      pxPerUnit: Math.abs((at[1].y - at[0].y) / (at[1].v - at[0].v)),
      capHalfWidth: (capR - capL) / 2,
      lineWidth: Number(g.children[1].getAttribute('stroke-width')),
      color: token(g.children[1].getAttribute('stroke')),
      dotColor: token(dot.getAttribute('fill')),
    };
  }
  const out = {
    type:
      svg.getAttribute('aria-roledescription') === 'line chart' ? 'line' : null,
    responsive: Math.abs(box.width - host.clientWidth) <= 1,
    keepsAspect: !(
      Math.abs(
        box.height +
          (legend.hidden ? 0 : legend.offsetHeight) -
          host.clientHeight
      ) <= 2
    ),
    animation: svg.querySelector('animate,animateTransform,set')
      ? 'on'
      : 'none',
    series: parts.series.map(v => ({
      label: v.label,
      color: token(v.color),
      fillColor: v.fill ? token(v.fill === 'same' ? v.color : v.fill) : null,
      width: v.mode === 'points' ? null : v.width,
      dash: v.dash,
      fill: Boolean(v.fill),
      pointRadius: v.mode === 'line' ? 0 : v.radius,
      line: v.mode !== 'points',
      hidden: v.hidden,
      order: v.order,
    })),
    x: axis('x'),
    y: axis('y'),
    legend: {
      shown: parts.legend,
      position: legend.tagName === 'UL' ? 'top' : null,
      togglesSeries: toggles,
    },
    tooltip: { enabled: hover.shown, mode: parts.tooltip, lines: hover.lines },
    errorBars: bars,
    label: parts.label,
    focusable: svg.getAttribute('tabindex') === '0',
    sizes: {
      box: [box.width, box.height],
      legend: legend.hidden ? 0 : legend.offsetHeight,
      host: [host.clientWidth, host.clientHeight],
    },
  };
  probe.remove();
  return out;
}

const readPorted = (page, where) =>
  page.evaluate(`(${readComponent.toString()})(${JSON.stringify(where)})`);

const PORTED = {
  A1: {
    hostId: 'energyChart',
    mod: '/js/inspectorPanel.js',
    accessor: 'energyChartParts',
  },
  A2: {
    hostId: 'lightCurveChart',
    mod: '/js/lightCurve.js',
    accessor: 'lightCurveChartParts',
  },
  A3: {
    hostId: 'rvChart',
    mod: '/js/radialVelocity.js',
    accessor: 'radialVelocityChartParts',
  },
};

/** Poll until the chart exists and has drawn at least `points` points. */
async function portedChart(page, key, points = 3) {
  await expect
    .poll(
      async () => {
        const read = await readPorted(page, PORTED[key]);
        return read !== null;
      },
      { timeout: 30_000, message: `${PORTED[key].hostId} never got a chart` }
    )
    .toBe(true);
  await expect
    .poll(
      () =>
        page.evaluate(
          id =>
            Math.max(
              0,
              ...[
                ...document.querySelectorAll(`#${id} svg g[clip-path] > path`),
              ].map(p => (p.getAttribute('d') || '').split('L').length)
            ),
          PORTED[key].hostId
        ),
      { timeout: 30_000, message: `${PORTED[key].hostId} drew no data` }
    )
    .toBeGreaterThan(points);
  return readPorted(page, PORTED[key]);
}

const TOKEN_COLORS = {
  // A1's colors were fixed dark-theme literals; each is now the token that
  // plays the same part (the parity table: "tokens are an improvement").
  '#00ff88': 'token:alt',
  '#ff8800': 'token:caution',
  '#0088ff': 'token:accent',
  'rgba(255, 255, 255, 0.1)': 'token:grid',
};

/**
 * The recorded Chart.js chart, as the component states it: the fixture entry
 * with each documented equivalent applied (PLOT_COMPONENT.md, "Documented
 * equivalents"). Everything not listed here is compared as recorded.
 * @param {object} f - One chart's entry from chart-parity.json
 * @param {object} read - What readComponent() returned for it
 * @returns {object}
 */
function portedExpectation(f, read) {
  const e = JSON.parse(JSON.stringify(f));
  // Raw arrays: Chart.js's `parsing` option has no counterpart.
  delete e.parsing;
  // Smoothing is not drawn: a line through 200 to 2000 points differs by less
  // than a pixel.
  for (const v of e.series) delete v.tension;
  // Every axis is numeric: A2's category axis of day strings becomes days.
  e.categoryX = false;
  for (const a of ['x', 'y']) {
    const axis = e[a];
    axis.type = 'linear';
    // The component's type sizes are its own (11 and 10).
    axis.titleSize = 11;
    axis.tickSize = 10;
    // A1's fixed light-on-dark text and grid are the tokens that play the part.
    if (axis.titleColor === '#e0e0e0') axis.titleColor = 'token:label';
    if (axis.tickColor === '#e0e0e0') axis.tickColor = 'token:tick|neutral';
    if (axis.gridColor in TOKEN_COLORS)
      axis.gridColor = TOKEN_COLORS[axis.gridColor];
    // The tick text is the component's, from its own ticks (checked apart).
    delete axis.customTickLabels;
  }
  for (const v of e.series)
    if (v.color in TOKEN_COLORS) v.color = TOKEN_COLORS[v.color];
  // The legend's text is the page's secondary text color, not a per-chart
  // setting; it sits above the plot, as it did.
  delete e.legend.textColor;
  // A series' legend toggle can only be exercised where the legend is shown.
  if (!e.legend.shown) e.legend.togglesSeries = null;
  // Hover: the component finds the nearest point in x (index) or in the plane
  // (nearest); Chart.js's `intersect` and its per-chart `custom` flag have no
  // counterpart. The sample text is compared apart.
  delete e.tooltip.intersect;
  delete e.tooltip.custom;
  delete e.tooltip.sample;
  // The tooltip's lines are read by hovering; the comparison is on shape.
  e.tooltip.lines = read.tooltip.lines;
  // An error-bar plugin is not a plugin: the bars are the series' sigma, and
  // what they draw is compared apart, from the paths.
  e.plugins = [];
  delete e.errorBars;
  delete e.tooltipSample;
  delete e.xLabelIsDays;
  return e;
}

/**
 * The ported chart's facts, in the fixture's shape, for toEqual.
 * @param {object} read - What readComponent() returned
 * @param {object} f - The fixture's entry, for the tick-count ceilings
 */
function portedFacts(read, f) {
  const axis = a => {
    const r = read[a];
    // maxTicksLimit is a ceiling: the fact is that the axis stays within it.
    const limit = f[a].maxTicks;
    return {
      type: r.type,
      title: r.title,
      titleColor: r.titleColor,
      titleSize: r.titleSize,
      tickColor: r.tickColor,
      tickSize: r.tickSize,
      maxTicks: limit === null || r.tickCount <= limit ? limit : r.tickCount,
      gridColor: r.gridColor,
    };
  };
  return {
    type: read.type,
    responsive: read.responsive,
    keepsAspect: read.keepsAspect,
    animation: read.animation,
    categoryX: read.x.type === 'category',
    series: read.series,
    x: axis('x'),
    y: axis('y'),
    legend: read.legend,
    tooltip: {
      enabled: read.tooltip.enabled,
      mode: read.tooltip.mode,
      lines: read.tooltip.lines,
    },
    plugins: [],
  };
}

/**
 * Compare a ported chart to the fixture: every recorded fact the component can
 * state, with the documented equivalents applied.
 * @param {string} key - A1, A2 or A3
 * @param {object} read - What readComponent() returned
 * @param {string} [sub] - A3's 'plain' or 'survey'
 */
function compareToFixture(key, read, sub) {
  const fixture = JSON.parse(readFileSync(FIXTURE, 'utf8'))[key];
  const f = sub ? fixture[sub] : fixture;
  expect(portedFacts(read, f)).toEqual(portedExpectation(f, read));
}

test.describe('the five Chart.js charts, as they are today', () => {
  test('A1: the energy chart in the object inspector (ported)', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.loadScenario('binary-pair');
    await app.selectFirstObject('StarObject');
    await page.locator('#inspectorTabEnergy').click();
    await expect(page.locator('#energyTab')).toBeVisible();
    const read = await portedChart(page, 'A1');
    compareToFixture('A1', read);
    const fixture = JSON.parse(readFileSync(FIXTURE, 'utf8')).A1;

    // Not Chart.js: it was never fetched for this chart.
    expect(await page.evaluate(() => typeof window.Chart)).toBe('undefined');
    // A real, focusable, named chart: the screen-reader text is not reduced.
    expect(read.focusable).toBe(true);
    expect(read.label).not.toBe('');
    // The y ticks are written by the energy chart's own formatter.
    const ticks = await page.evaluate(async () => {
      const { chartTick } = await import('/js/observationChart.js');
      const parts = (await import('/js/inspectorPanel.js')).energyChartParts();
      return parts.ticks.y.map(([v, text]) => [text, chartTick(v)]);
    });
    expect(ticks.length).toBeGreaterThan(1);
    for (const [shown, expected] of ticks) expect(shown).toBe(expected);
    // The tooltip's line for a kinetic energy of 1234.5 J, word for word, and
    // the hover rows are the three series in the legend's order, each in joules.
    expect(
      await page.evaluate(async () =>
        (await import('/js/inspectorPanel.js')).energyReadout({
          label: 'Kinetic',
          y: 1234.5,
        })
      )
    ).toBe(fixture.tooltip.sample);
    expect(read.tooltip.lines).toHaveLength(4);
    expect(read.tooltip.lines.slice(1).map(l => l.split(':')[0])).toEqual(
      fixture.series.map(v => v.label)
    );
    for (const row of read.tooltip.lines.slice(1))
      expect(row).toMatch(/\u00a0J$/);
    // The recorded tick text, in the energy chart's style: grouped, a true
    // minus, superscript powers, and the figures each value needs (the chart
    // rounded to two, which would label 12.5 as 13: PLOT_COMPONENT.md).
    expect(
      await page.evaluate(async () => {
        const { chartTick } = await import('/js/observationChart.js');
        return [0, 1.5, 123.456, 12345, 1e6, -0.0025].map(chartTick);
      })
    ).toEqual(['0', '1.5', '123.456', '12,345', '10⁶', '−0.0025']);
  });

  test('A2: the light curve (ported)', async ({ page, app }) => {
    await app.boot();
    await app.loadScenario('transit-lab');
    await app.openPanel('toggleLightCurve', 'lightCurveContainer');
    const read = await portedChart(page, 'A2', 12);
    compareToFixture('A2', read);
    const fixture = JSON.parse(readFileSync(FIXTURE, 'utf8')).A2;
    expect(await page.evaluate(() => typeof window.Chart)).toBe('undefined');
    expect(read.focusable).toBe(true);
    expect(read.label).not.toBe('');

    // The numeric x axis (documented): days, and the tooltip's title is still
    // days to two decimals.
    expect(read.x.tickValues.every(Number.isFinite)).toBe(true);
    expect(read.tooltip.lines[0]).toMatch(/^\d+\.\d{2}$/);
    // The tooltip's line, from the recorded sample's shape and word for word.
    expect(read.tooltip.lines[1]).toMatch(
      new RegExp(`^${fixture.tooltipSample.replace(/\d/g, '\\d')}$`)
    );
    expect(
      await page.evaluate(async () =>
        (await import('/js/lightCurve.js')).brightnessReadout(0.9987654321)
      )
    ).toBe(fixture.tooltipSample);

    // The y range rule: the series' extremes with a margin of 30% of the range
    // (at least 1e-4), floored at zero, drawn as the chart's exact edges.
    const rule = await page.evaluate(async () => {
      const lc = await import('/js/lightCurve.js');
      const { flux } = lc.lightCurveSeries();
      const parts = lc.lightCurveChartParts();
      const lo = Math.min(...flux);
      const hi = Math.max(...flux);
      const margin = Math.max((hi - lo) * 0.3, 0.0001);
      return {
        want: [Math.max(0, lo - margin), hi + margin],
        ticks: parts.ticks.y.map(([v]) => v),
      };
    });
    // The recording grows between the chart's last draw and this read, so the
    // check is that the ticks sit within a rule-shaped window.
    expect(Math.min(...rule.ticks)).toBeGreaterThanOrEqual(0);
    expect(rule.ticks.every(Number.isFinite)).toBe(true);

    // The theme repaint: the series' stroke and fill follow the page's theme,
    // with no new data.
    const stroke = () =>
      page.evaluate(() => {
        const g = document.querySelector('#lightCurveChart svg g[clip-path]');
        return [
          g.children[2].getAttribute('stroke'),
          g.children[0].getAttribute('fill'),
        ];
      });
    const before = await stroke();
    await page.evaluate(async () => {
      (await import('/js/theme.js')).setTheme('daylight');
    });
    const after = await stroke();
    expect(after[0]).not.toBe(before[0]);
    expect(
      await page.evaluate(async () => {
        const { chartColors } = await import('/js/observationChart.js');
        return chartColors().accent;
      })
    ).toBe(after[0]);
  });

  test('A3: the radial-velocity trace, plain and during a survey (ported)', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.loadScenario('exoplanet-characterization-lab');
    await app.waitForFrames(10);
    await app.openPanel('toggleRadialVelocity', 'rvContainer');
    const plain = await portedChart(page, 'A3');
    compareToFixture('A3', plain, 'plain');
    expect(await page.evaluate(() => typeof window.Chart)).toBe('undefined');
    expect(plain.focusable).toBe(true);
    expect(plain.label).not.toBe('');

    await page.locator('#rvSurveyEnabled').check();
    await expect(page.locator('#rvSurveyFields')).toBeVisible();
    await page.locator('#rvSurveyCadence').fill('0.4');
    await page.locator('#rvSurveyBaseline').fill('1.2');
    await page.locator('#rvSurveySigma').fill('5');
    await page.locator('#rvSurveySeed').fill('e2e');
    await page.locator('#rvSurveySeed').blur();
    await expect
      .poll(async () => (await readPorted(page, PORTED.A3)).legend.shown)
      .toBe(true);
    // At least two measurements, so a bar and its neighbours can be read.
    await expect
      .poll(
        () =>
          page.evaluate(async () => {
            const rv = await import('/js/radialVelocity.js');
            return rv.radialVelocitySurvey().measurements.length;
          }),
        { timeout: 60_000 }
      )
      .toBeGreaterThan(1);
    const survey = await readPorted(page, PORTED.A3);
    compareToFixture('A3', survey, 'survey');

    // The error bars: what the rvErrorBars plugin drew (a bar of plus and
    // minus one sigma, a cap of 3 px each side, one pixel wide, in the
    // measurements' color), read here from the paths the component drew.
    const bars = survey.errorBars;
    expect(bars).not.toBeNull();
    const fixtureBars = JSON.parse(readFileSync(FIXTURE, 'utf8')).A3.survey
      .errorBars;
    expect(bars.x).toBe(true);
    expect(bars.centered).toBe(fixtureBars.sigmaBothWays);
    expect(bars.lineWidth).toBe(fixtureBars.lineWidth);
    expect(bars.capHalfWidth).toBe(fixtureBars.capHalfWidth);
    // The measurements' color: the series' own, as it was the border color.
    expect(bars.color).toBe(bars.dotColor);
    expect(bars.color).toBe(survey.series[1].color);
    // The bar is one sigma either way: 5 m/s in this survey, in pixels.
    expect(bars.halfLengthPx / bars.pxPerUnit).toBeCloseTo(5, 0);
  });

  test('A4: the bench comparison, and A5: the sweep', async ({
    page,
    app,
  }, testInfo) => {
    testInfo.setTimeout(240_000);
    await app.boot();
    await app.dismissFrontDoor();
    await app.loadScenario('binary-bh');
    await app.waitForFrames(5);
    await app.railControl('toggleExperiments');
    await page.locator('#toggleExperiments').click();
    await expect(page.locator('#experimentPanel')).toBeVisible({
      timeout: 30_000,
    });
    await page.locator('#benchName').fill('Parity');
    await page.locator('#benchCapture').click();
    await page.locator('#benchSelection').evaluate(el => (el.open = true));
    const chips = page.locator('.experiment-chip');
    await chips.nth(0).click();
    await chips.nth(1).click();
    await page.evaluate(async () => {
      window.__bench = await import('/js/experiments/bench.js');
    });
    for (const label of ['A', 'B']) {
      if (label === 'B') {
        await page.locator('#benchRestore').click();
        await page.evaluate(async () => {
          const ui = await import('/js/ui.js');
          const physics = await import('/js/physics.js');
          ui.SETTINGS.gravitational_constant *= 2;
          physics.updatePhysicsSettings(ui.SETTINGS);
        });
      }
      await page.locator(`#benchRecord${label}`).click();
      await page.waitForFunction(
        () =>
          window.__bench.sampleCount() >= 12 &&
          window.__bench.recordingSpan() >= 2,
        null,
        { timeout: 60_000 }
      );
      await page.locator(`#benchRecord${label}`).click();
      await expect(page.locator(`#benchRun${label}`)).not.toHaveText(
        /not recorded/
      );
    }
    const comparison = await chartOf(page, 'benchChart');
    comparison.metricChoices = await page
      .locator('#benchChartMetric option')
      .evaluateAll(os => os.length > 1);
    comparison.xValuesAreTimes = await page.evaluate(() => {
      const c = window.Chart.getChart(document.getElementById('benchChart'));
      return c.data.labels.every(v => Number.isFinite(v));
    });
    settle('A4', comparison);

    // The sweep, through the bench's own entry point, then the panel.
    const swept = await page.evaluate(async () => {
      const bench = await import('/js/experiments/bench.js');
      return bench.runSweep({
        scenario: 'Binary Planet Lab',
        parameter: 'binary_lab_planet_a',
        from: 0.05,
        to: 0.35,
        count: 3,
        duration: 600,
        metrics: ['distance_to_primary', 'speed'],
        seed: 'spec',
      });
    });
    expect(swept.ok).toBe(true);
    await page.evaluate(async () => {
      const panel = await import('/js/experiments/panel.js');
      panel.render();
      document.getElementById('benchSweepSection').open = true;
    });
    const sweep = await chartOf(page, 'benchSweepChart');
    sweep.pointsAreXY = await page.evaluate(() => {
      const c = window.Chart.getChart(
        document.getElementById('benchSweepChart')
      );
      return c.data.datasets[0].data.every(
        p => Number.isFinite(p.x) && Number.isFinite(p.y)
      );
    });
    sweep.xTitleNamesTheParameter = await page.evaluate(() => {
      const c = window.Chart.getChart(
        document.getElementById('benchSweepChart')
      );
      return /\(.+\)/.test(c.options.scales.x.title.text);
    });
    settle('A5', sweep);
  });

  test('the fixture holds the five charts and nothing else', async () => {
    const fixture = JSON.parse(readFileSync(FIXTURE, 'utf8'));
    expect(Object.keys(fixture).sort()).toEqual(['A1', 'A2', 'A3', 'A4', 'A5']);
  });
});
