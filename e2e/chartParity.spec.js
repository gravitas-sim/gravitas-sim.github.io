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
//   All five charts are ported (A1-A3 in stage 3b, A4 and A5 in stage 3c):
//   each is read through the component's own
//   description of the chart (js/plot/chart.js `parts()`, plus the chart's
//   markup for what it draws: colors as the page resolves them, the error bars
//   as paths, the tooltip as hovered) and compared to the SAME fixture. A fact
//   the component cannot state, or that changed on purpose, is listed in
//   `portedExpectation()` below with its reason (PLOT_COMPONENT.md,
//   "Documented equivalents"), so the fixture stays the Chart.js record and the
//   comparison is strict everywhere else.
//
// The fixture was recorded from the running Chart.js charts and is not
// rewritten: stage 3c added each bench chart's `contract` (its text
// alternative, the title each metric gives the y axis, which data it draws)
// by running the same facts against the Chart.js bench before it was ported.
// =============================================================================

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test, expect } from './fixtures.js';

const FIXTURE = join(process.cwd(), 'tests', 'fixtures', 'chart-parity.json');

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
  A4: {
    hostId: 'benchChart',
    mod: '/js/experiments/panel.js',
    accessor: 'benchComparisonParts',
  },
  A5: {
    hostId: 'benchSweepChart',
    mod: '/js/experiments/panel.js',
    accessor: 'benchSweepParts',
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
 * @param {number} lineCount - How many lines the hover's tooltip shows
 * @returns {object}
 */
function portedExpectation(f, lineCount) {
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
  // The tooltip's lines are read by hovering. What is compared is how many
  // there are: a title and one row for each series the hover names (A1 names
  // all three, A2 and A3 the one nearest). The words are asserted apart, from
  // the recorded sample.
  e.tooltip.lines = lineCount;
  // An error-bar plugin is not a plugin: the bars are the series' sigma, and
  // what they draw is compared apart, from the paths.
  e.plugins = [];
  delete e.errorBars;
  delete e.tooltipSample;
  delete e.xLabelIsDays;
  // The bench charts' own facts are checked apart, from the page and the
  // fixture's `contract`.
  for (const k of [
    'metricChoices',
    'xValuesAreTimes',
    'pointsAreXY',
    'xTitleNamesTheParameter',
    'contract',
  ])
    delete e[k];
  // A5 was a scatter chart with its line drawn; the component draws the
  // same marks as a series of points joined by a line, and it finds the
  // nearest point where Chart.js's scatter default wanted the pointer on one.
  if (e.type === 'scatter') e.type = 'line';
  if (e.tooltip.mode === 'point') e.tooltip.mode = 'nearest';
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
      lines: read.tooltip.lines.length,
    },
    plugins: [],
  };
}

/** The tooltip's line count at the probe's hover, by chart. */
const TIP_LINES = { A1: 4, A2: 2, A3: 2, A4: 2, A5: 2 };

/**
 * Compare a ported chart to the fixture: every recorded fact the component can
 * state, with the documented equivalents applied.
 * @param {string} key - A1 to A5
 * @param {object} read - What readComponent() returned
 * @param {string} [sub] - A3's 'plain' or 'survey'
 */
function compareToFixture(key, read, sub) {
  const fixture = JSON.parse(readFileSync(FIXTURE, 'utf8'))[key];
  const f = sub ? fixture[sub] : fixture;
  expect(portedFacts(read, f)).toEqual(portedExpectation(f, TIP_LINES[key]));
}

/**
 * What a bench chart draws, in the shape of the fixture's `contract`: its text
 * alternative, the y-axis title each metric gives it, whether its series are
 * the bench's own aligned rows (A4) or the trials that measured, sorted by
 * parameter (A5), and whether the table beside it names every metric. Runs the
 * metric picker through every choice, as a student does.
 * @param {import('@playwright/test').Page} page
 * @param {'A4'|'A5'} which
 * @returns {Promise<object>}
 */
function benchFacts(page, which) {
  return page.evaluate(async which => {
    const bench = await import('/js/experiments/bench.js');
    const panel = await import('/js/experiments/panel.js');
    const A4 = which === 'A4';
    const parts = () =>
      A4 ? panel.benchComparisonParts() : panel.benchSweepParts();
    const picker = document.getElementById(
      A4 ? 'benchChartMetric' : 'benchSweepMetric'
    );
    const same = (a, b) =>
      a.length === b.length &&
      a.every((v, i) =>
        Number.isFinite(v) || Number.isFinite(b[i]) ? v === b[i] : true
      );
    // What the chart should be drawing for a metric, from the bench itself.
    const wanted = metric => {
      if (A4) {
        const rows = bench.compare().aligned[metric].rows;
        return [
          rows.map(r => Number(r.t.toPrecision(6))),
          rows.map(r => r.a),
          rows.map(r => r.b),
        ];
      }
      const ok = bench
        .latestSweep()
        .trials.filter(tr => Number.isFinite(tr.results?.[metric]))
        .map(tr => [tr.value, tr.results[metric]])
        .sort((p, q) => p[0] - q[0]);
      return [ok.map(q => q[0]), ok.map(q => q[1])];
    };
    const drawing = metric => {
      const p = parts();
      const [x, ...ys] = wanted(metric);
      const got = p.series;
      return (
        same(got[0].x, x) &&
        ys.every((y, k) => same(got[k].y, y)) &&
        (A4 || got[0].x.every((v, i, a) => i === 0 || a[i - 1] <= v))
      );
    };
    const titles = [];
    let matches = true;
    let dropsFailed = true;
    for (const opt of [...picker.options]) {
      picker.value = opt.value;
      picker.dispatchEvent(new Event('change'));
      // The draw follows the change a moment later: wait for it to land.
      for (
        let i = 0;
        i < 200 &&
        !(parts()?.yTitle.startsWith(opt.textContent) && drawing(opt.value));
        i++
      )
        await new Promise(r => setTimeout(r, 25));
      titles.push([opt.textContent, parts().yTitle]);
      matches = matches && drawing(opt.value);
      if (!A4) {
        // A failed trial is left out, not drawn as a zero: fewer points than
        // trials, and exactly the ones that measured.
        const n = parts().series[0].x.length;
        dropsFailed =
          dropsFailed &&
          n === wanted(opt.value)[0].length &&
          n < bench.latestSweep().trials.length;
      }
    }
    const table = document.querySelector(
      A4 ? '#benchResults table' : '#benchSweepResults table'
    );
    const out = {
      label: parts().label,
      metricTitles: titles,
      tableBeside: [...picker.options].every(o =>
        table?.textContent.includes(o.textContent)
      ),
    };
    if (A4) out.dataIsTheAlignedRows = matches;
    else {
      out.dataIsTheTrialsThatMeasured = matches;
      out.failedTrialLeftOut = dropsFailed;
    }
    return out;
  }, which);
}

/**
 * What the component adds to the bench charts (the Chart.js ones had none of
 * it): a focusable, named chart whose arrow keys read the values and say them
 * in a polite status, and a legend whose buttons toggle a series from the
 * keyboard.
 * @param {import('@playwright/test').Page} page
 * @param {object} read - What readComponent() returned
 * @param {string} hostId
 */
async function readsAndSpeaks(page, read, hostId) {
  expect(read.focusable).toBe(true);
  expect(read.label).not.toBe('');
  const svg = page.locator(`#${hostId} svg[role="group"]`);
  const status = page.locator(`#${hostId} [role="status"]`);
  await svg.focus();
  await page.keyboard.press('Home');
  await expect(status).toContainText(/\S/);
  const first = await status.textContent();
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => status.textContent()).not.toBe(first);
  await page.keyboard.press('Escape');
  // The legend: a real button, pressed by the keyboard, hides its series and
  // says so; pressed again it comes back.
  const button = page.locator(`#${hostId} button[data-series]`).first();
  await button.focus();
  await page.keyboard.press('Enter');
  await expect(button).toHaveAttribute('aria-pressed', 'false');
  await expect(status).toContainText(/\S/);
  await page.keyboard.press('Enter');
  await expect(button).toHaveAttribute('aria-pressed', 'true');
}

/**
 * The export: the chart's picture is a PNG twice the chart's width (the
 * export's scale), and at least as tall. Chart.js had no export here.
 * @param {import('@playwright/test').Page} page
 * @param {'A4'|'A5'} key
 */
async function exportsAPicture(page, key) {
  const out = await page.evaluate(async where => {
    const parts = (await import(where.mod))[where.accessor]();
    const { toPNG } = await import('/js/plot/export.js');
    const blob = await toPNG(parts);
    const bmp = await window.createImageBitmap(blob);
    return {
      type: blob.type,
      w: bmp.width,
      h: bmp.height,
      cw: parts.width,
      ch: parts.height,
    };
  }, PORTED[key]);
  expect(out.type).toBe('image/png');
  expect(out.w).toBe(out.cw * 2);
  expect(out.h).toBeGreaterThanOrEqual(out.ch * 2);
}

test.describe('the five charts, held to what the Chart.js ones were', () => {
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
    // (at least 1e-4), floored at zero, drawn as the chart's exact edges. The
    // run is paused first, so the recording stops growing; the chart redraws
    // every sixth sample, so its last draw can trail the recording by up to
    // five, and the tolerance is the one the rule can drift by in that time
    // (a twentieth of the span) plus one tick step.
    await app.setPaused(true);
    // Two frames on: the pause has taken, and the last redraw has landed.
    await page.evaluate(
      () =>
        new Promise(done =>
          window.requestAnimationFrame(() =>
            window.requestAnimationFrame(() =>
              window.requestAnimationFrame(done)
            )
          )
        )
    );
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
    const [wantLo, wantHi] = rule.want;
    const tickLo = Math.min(...rule.ticks);
    const tickHi = Math.max(...rule.ticks);
    expect(rule.ticks.length).toBeGreaterThanOrEqual(2);
    expect(rule.ticks.every(Number.isFinite)).toBe(true);
    const step = (tickHi - tickLo) / (rule.ticks.length - 1);
    const tol = 0.05 * (wantHi - wantLo) + step;
    // The floor at zero: no tick below it.
    expect(tickLo).toBeGreaterThanOrEqual(0);
    // The ticks sit inside the range and reach to within a step of each edge:
    // they bracket the rule's range.
    expect(tickLo).toBeGreaterThanOrEqual(wantLo - tol);
    expect(tickLo).toBeLessThanOrEqual(wantLo + tol);
    expect(tickHi).toBeLessThanOrEqual(wantHi + tol);
    expect(tickHi).toBeGreaterThanOrEqual(wantHi - tol);
    // And the range is wider than the data alone: the margin is drawn.
    const lows = await page.evaluate(async () => {
      const { flux } = (await import('/js/lightCurve.js')).lightCurveSeries();
      return [Math.min(...flux), Math.max(...flux)];
    });
    expect(wantHi).toBeGreaterThan(lows[1]);
    await app.setPaused(false);

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

    // The tooltip on a measurement: the row the old chart's default tooltip
    // gave, with the bar's size added ("Measurements: 12.3 ± 5 m/s"), and a
    // title in days. Hovered on the dot itself, so the nearest point is it.
    const tip = await page.evaluate(() => {
      const svg = document.querySelector('#rvChart svg[role="group"]');
      const dot = svg.querySelector('g[clip-path] circle');
      const r = dot.getBoundingClientRect();
      svg.dispatchEvent(
        new window.PointerEvent('pointermove', {
          bubbles: true,
          clientX: r.left + r.width / 2,
          clientY: r.top + r.height / 2,
        })
      );
      const box = svg.nextElementSibling;
      const lines = [...box.children].map(d => d.textContent);
      svg.dispatchEvent(
        new window.PointerEvent('pointerleave', { bubbles: true })
      );
      return lines;
    });
    expect(tip).toHaveLength(2);
    expect(tip[0]).toMatch(/^[−-]?[\d.,]+\s?d$/);
    expect(tip[1]).toMatch(/^.+: [+−-]?[\d.,]+ ± 5(?:\.0+)?\s?m\/s$/);
  });

  test('A4: the bench comparison, and A5: the sweep (ported)', async ({
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
    const fixture = JSON.parse(readFileSync(FIXTURE, 'utf8'));

    // --- A4 ---------------------------------------------------------------
    const comparison = await portedChart(page, 'A4');
    compareToFixture('A4', comparison);
    expect(await page.evaluate(() => typeof window.Chart)).toBe('undefined');
    expect(
      await page
        .locator('#benchChartMetric option')
        .evaluateAll(os => os.length > 1)
    ).toBe(fixture.A4.metricChoices);
    expect(
      await page.evaluate(async () => {
        const parts = (
          await import('/js/experiments/panel.js')
        ).benchComparisonParts();
        return parts.series.every(v => v.x.every(Number.isFinite));
      })
    ).toBe(fixture.A4.xValuesAreTimes);
    expect(await benchFacts(page, 'A4')).toEqual(fixture.A4.contract);
    await readsAndSpeaks(page, comparison, 'benchChart');
    await exportsAPicture(page, 'A4');

    // --- A5 ---------------------------------------------------------------
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
    const sweep = await portedChart(page, 'A5', 1);
    compareToFixture('A5', sweep);
    expect(
      await page.evaluate(async () => {
        const parts = (
          await import('/js/experiments/panel.js')
        ).benchSweepParts();
        return parts.series[0].x.every(
          (x, i) => Number.isFinite(x) && Number.isFinite(parts.series[0].y[i])
        );
      })
    ).toBe(fixture.A5.pointsAreXY);
    expect(/\(.+\)/.test(sweep.x.title)).toBe(
      fixture.A5.xTitleNamesTheParameter
    );
    // A trial that failed is left out, not drawn as a zero: fail one of the
    // three and the chart holds only the ones that measured.
    await page.evaluate(async () => {
      const bench = await import('/js/experiments/bench.js');
      const trial = bench.latestSweep().trials[1];
      trial.results = null;
      trial.status = 'failed';
      (await import('/js/experiments/panel.js')).render();
    });
    expect(await benchFacts(page, 'A5')).toEqual(fixture.A5.contract);
    await readsAndSpeaks(page, sweep, 'benchSweepChart');
    await exportsAPicture(page, 'A5');

    // --- Both, after a language change ------------------------------------
    // The panel is built again in the new language. Each chart was built in a
    // host that is gone: the new host gets a chart of its own, in the new
    // words, and the old one is destroyed (one chart in each host, not two).
    // (Chart.js drew into the detached canvas and left the new one blank.)
    await page.evaluate(async () =>
      (await import('/js/i18n/index.js')).setLocale('es')
    );
    for (const key of ['A4', 'A5']) {
      await expect
        .poll(
          () =>
            page.evaluate(
              async ({ where, labelKey }) => {
                const parts = (await import(where.mod))[where.accessor]();
                const host = document.getElementById(where.hostId);
                const { t, getLocale } = await import('/js/i18n/index.js');
                return Boolean(
                  getLocale() === 'es' &&
                  parts &&
                  host?.contains(parts.svg) &&
                  host.querySelectorAll('svg[role="group"]').length === 1 &&
                  parts.label === t(labelKey)
                );
              },
              {
                where: PORTED[key],
                labelKey: key === 'A4' ? 'bench.chart.label' : 'sweep.title',
              }
            ),
          {
            timeout: 30_000,
            message: `${key} was not redrawn after the language changed`,
          }
        )
        .toBe(true);
    }
  });

  test('the fixture holds the five charts and nothing else', async () => {
    const fixture = JSON.parse(readFileSync(FIXTURE, 'utf8'));
    expect(Object.keys(fixture).sort()).toEqual(['A1', 'A2', 'A3', 'A4', 'A5']);
  });
});

// The caps, on the live paths. tests/chartParity.test.js holds each number to
// the line of source that sets it; these feed more than the cap through the
// real update functions and count what the chart is given.
test.describe('the point caps hold on the live paths', () => {
  test('A1: 250 samples through updateChart draw the newest 200', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.loadScenario('binary-pair');
    await app.selectFirstObject('StarObject');
    await page.locator('#inspectorTabEnergy').click();
    await expect(page.locator('#energyTab')).toBeVisible();
    await portedChart(page, 'A1');
    const drawn = await page.evaluate(async () => {
      const m = await import('/js/inspectorPanel.js');
      // The running inspector feeds the same function; take its rate gate and
      // read back in the same task, so no other call can redraw in between.
      m.updateChart._last = 0;
      const data = Array.from({ length: 250 }, (_, i) => ({
        timestamp: 1000 + i * 100,
        ke: 10 + (i % 7),
        pe: -20 - (i % 5),
        total: -10 + (i % 3),
      }));
      m.updateChart(data, 1e6);
      const counts = [
        ...document.querySelectorAll('#energyChart svg g[clip-path] > path'),
      ]
        .map(p => (p.getAttribute('d') || '').split('L').length)
        .filter(n => n > 1);
      return { counts, ticks: m.energyChartParts().ticks.x.map(([v]) => v) };
    });
    // Three series, each exactly the cap: 200 points, not 250.
    expect(drawn.counts).toEqual([200, 200, 200]);
    // And they are the newest: time is counted from the first sample passed
    // in, so the window is 5.0 to 24.9 s. Had the oldest 200 been kept, it
    // would end at 19.9.
    expect(Math.min(...drawn.ticks)).toBeGreaterThanOrEqual(5 - 1e-9);
    expect(Math.max(...drawn.ticks)).toBeGreaterThan(19.9);
    expect(Math.max(...drawn.ticks)).toBeLessThanOrEqual(24.9 + 1e-9);
  });

  test('A2: 2050 samples through updateLightCurve leave a recording of 2000', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.loadScenario('transit-lab');
    await app.openPanel('toggleLightCurve', 'lightCurveContainer');
    await portedChart(page, 'A2', 3);
    const out = await page.evaluate(async () => {
      const lc = await import('/js/lightCurve.js');
      for (let i = 0; i < 2050; i++) lc.updateLightCurve();
      const { days, flux } = lc.lightCurveSeries();
      return { days: days.length, flux: flux.length };
    });
    expect(out).toEqual({ days: 2000, flux: 2000 });
  });

  test('A3: more than 900 samples leave a recording of 900, never more', async ({
    page,
    app,
  }) => {
    test.setTimeout(240_000);
    await app.boot();
    await app.loadScenario('exoplanet-characterization-lab');
    await app.waitForFrames(10);
    await app.openPanel('toggleRadialVelocity', 'rvContainer');
    await portedChart(page, 'A3');
    // The panel samples once a wall-clock 60 ms, which would take a minute for
    // a thousand. A clock that runs thirty times faster makes every frame a
    // sampling frame; the integration step is clamped, so the physics is the
    // same one, only reached sooner.
    await page.evaluate(() => {
      window.__realNow = performance.now.bind(performance);
      performance.now = () => window.__realNow() * 30;
      window.__rvMax = 0;
      window.__rvAtCap = 0;
      window.__rvWatch = window.setInterval(async () => {
        const rv = await import('/js/radialVelocity.js');
        const n = rv.radialVelocitySeries().length;
        window.__rvMax = Math.max(window.__rvMax, n);
        if (n >= 900) window.__rvAtCap++;
      }, 20);
    });
    try {
      // At the cap, and watched there for forty readings while the new
      // samples displace the old: it holds, and does not creep past it.
      await expect
        .poll(() => page.evaluate(() => window.__rvAtCap), {
          timeout: 200_000,
          message: 'the recording never reached its cap',
        })
        .toBeGreaterThanOrEqual(40);
    } finally {
      await page.evaluate(() => {
        window.clearInterval(window.__rvWatch);
        performance.now = window.__realNow;
      });
    }
    expect(await page.evaluate(() => window.__rvMax)).toBe(900);
  });
});
