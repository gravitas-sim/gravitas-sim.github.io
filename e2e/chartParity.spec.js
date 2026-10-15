// =============================================================================
// What the five Chart.js charts are today (characterization, D-PLOT-02)
// -----------------------------------------------------------------------------
// The plot component (js/plot/chart.js) is built to replace the five Chart.js
// charts, and "matches" has to mean something before any of them is ported. So
// this reads each real chart, in the real application, through Chart.js's own
// registry, and holds what it reads to tests/fixtures/chart-parity.json: the
// series, their colors (as design tokens where a token supplies them), widths
// and dashes, the axis titles and tick formats, the legend, the tooltip, the
// error-bar caps. The caps and rates that live in source constants are pinned
// by tests/chartParity.test.js.
//
// The stage that ports a chart replaces `read()` below with the component's own
// description of the same chart, and compares it to the same fixture. A fact
// that changes on purpose changes in the fixture in that pull request, with the
// reason in PLOT_COMPONENT.md's documented equivalents.
//
// CHART_PARITY_RECORD=1 rewrites the fixture from the running application
// instead of comparing (then `npx prettier --write` the fixture):
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

test.describe('the five Chart.js charts, as they are today', () => {
  test('A1: the energy chart in the object inspector', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.loadScenario('binary-pair');
    await app.selectFirstObject('StarObject');
    await page.locator('#inspectorTabEnergy').click();
    await expect(page.locator('#energyTab')).toBeVisible();
    const chart = await chartOf(page, 'energyChart', ['y']);
    // The tooltip's line, for a kinetic energy of 1234.5 J.
    chart.tooltip.sample = await page.evaluate(() => {
      const c = window.Chart.getChart(document.getElementById('energyChart'));
      const cb = c.options.plugins.tooltip.callbacks.label;
      return cb({ dataset: { label: 'Kinetic' }, parsed: { y: 1234.5 } });
    });
    settle('A1', chart);
  });

  test('A2: the light curve', async ({ page, app }) => {
    await app.boot();
    await app.loadScenario('transit-lab');
    await app.openPanel('toggleLightCurve', 'lightCurveContainer');
    const chart = await chartOf(page, 'lightCurveCanvas');
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const lc = await import('/js/lightCurve.js');
          return lc.lightCurveSeries().flux.length;
        })
      )
      .toBeGreaterThan(12);
    Object.assign(
      chart,
      await page.evaluate(() => {
        const c = window.Chart.getChart(
          document.getElementById('lightCurveCanvas')
        );
        const cb = c.options.plugins.tooltip.callbacks.label;
        return {
          tooltipSample: cb({ raw: 0.9987654321 }),
          // Days, two decimals (the value moves with the run).
          xLabelIsDays: /^\d+\.\d{2}$/.test(String(c.data.labels[0])),
        };
      })
    );
    settle('A2', chart);
  });

  test('A3: the radial-velocity trace, plain and during a survey', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.loadScenario('exoplanet-characterization-lab');
    await app.waitForFrames(10);
    await app.openPanel('toggleRadialVelocity', 'rvContainer');
    const plain = await chartOf(page, 'rvCanvas');

    await page.locator('#rvSurveyEnabled').check();
    await expect(page.locator('#rvSurveyFields')).toBeVisible();
    await page.locator('#rvSurveyCadence').fill('0.4');
    await page.locator('#rvSurveyBaseline').fill('1.2');
    await page.locator('#rvSurveySigma').fill('5');
    await page.locator('#rvSurveySeed').fill('e2e');
    await page.locator('#rvSurveySeed').blur();
    await expect
      .poll(async () => (await read(page, 'rvCanvas')).legend.shown)
      .toBe(true);
    const survey = await read(page, 'rvCanvas');

    // The error bars: the plugin is run against a recording context, so what
    // it draws is the fact, not what it is called.
    const bars = await page.evaluate(() => {
      const chart = window.Chart.getChart(document.getElementById('rvCanvas'));
      const plugin = chart.config.plugins.find(p => p.id === 'rvErrorBars');
      const calls = [];
      const ctx = new Proxy(
        { strokeStyle: null, lineWidth: null },
        {
          get: (t, k) =>
            k in t ? t[k] : (...a) => calls.push([String(k), ...a]),
          set: (t, k, v) => {
            t[k] = v;
            calls.push(['set:' + String(k), v]);
            return true;
          },
        }
      );
      const fake = {
        getDatasetMeta: () => ({ hidden: false, data: [{ x: 100 }] }),
        data: {
          datasets: [
            {},
            { data: [{ x: 1, y: 10, sigma: 2 }], borderColor: 'red' },
          ],
        },
        scales: { y: { getPixelForValue: v => 500 - v * 10 } },
        ctx,
      };
      plugin.afterDatasetsDraw(fake);
      return calls;
    });
    // Top of the bar at y = 12 is pixel 380, bottom at y = 8 is 420.
    expect(bars).toEqual([
      ['save'],
      ['set:strokeStyle', 'red'],
      ['set:lineWidth', 1],
      ['beginPath'],
      ['moveTo', 100, 380],
      ['lineTo', 100, 420],
      ['moveTo', 97, 380],
      ['lineTo', 103, 380],
      ['moveTo', 97, 420],
      ['lineTo', 103, 420],
      ['stroke'],
      ['restore'],
    ]);
    survey.errorBars = {
      plugin: 'rvErrorBars',
      sigmaBothWays: true,
      lineWidth: 1,
      capHalfWidth: 3,
      color: 'the measurements series border color',
    };
    settle('A3', { plain, survey });
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
