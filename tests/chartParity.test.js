import { describe, test, expect } from '@jest/globals';
import { existsSync, readFileSync, readdirSync } from 'node:fs';

// =============================================================================
// The five Chart.js charts: what they are, as data (D-PLOT-02, stage 3a)
// -----------------------------------------------------------------------------
// Stage 4 removes Chart.js, and a chart is ported only if the plot component
// matches it. "Matches" needs the chart written down first. Two fixtures hold
// it:
//
//   tests/fixtures/chart-parity.json   what the running charts are: series,
//       colors (as design tokens where one supplies them), widths, dashes,
//       axis titles, tick formats, legend, tooltip, error-bar caps. Recorded
//       from the real application by e2e/chartParity.spec.js, which compares
//       to it on every run.
//   tests/fixtures/chart-limits.json   what lives in source constants: the
//       caps, the redraw rates, the y-range rule. This file holds each to the
//       line of source that sets it, so a change to a cap shows up here and
//       not as a chart that quietly holds fewer points.
//
// Both are the contract a later stage compares the component to.
// =============================================================================

const read = path => readFileSync(path, 'utf8');
const parity = JSON.parse(read('tests/fixtures/chart-parity.json'));
const limits = JSON.parse(read('tests/fixtures/chart-limits.json'));

describe('the recorded charts', () => {
  test('are all five, with the series each draws', () => {
    expect(Object.keys(parity).sort()).toEqual(['A1', 'A2', 'A3', 'A4', 'A5']);
    expect(parity.A1.series.map(s => s.label)).toEqual([
      'Kinetic Energy',
      'Potential Energy',
      'Total Energy',
    ]);
    expect(parity.A2.series.map(s => s.label)).toEqual(['Relative Brightness']);
    expect(parity.A3.plain.series.map(s => s.label)).toEqual([
      'Radial velocity',
      'Measurements',
    ]);
    expect(parity.A4.series.map(s => s.label)).toEqual(['Run A', 'Run B']);
    expect(parity.A5.series).toHaveLength(1);
  });

  test('keep the distinctions the parity table names', () => {
    // Dashed against solid: the survey's teaching overlay, and run B.
    expect(parity.A3.survey.series[0].dash).toEqual([4, 4]);
    expect(parity.A3.plain.series[0].dash).toEqual([]);
    expect(parity.A4.series.map(s => s.dash)).toEqual([[], [5, 3]]);
    // Points only where a line would show a curve nobody observed.
    expect(parity.A3.plain.series[1].line).toBe(false);
    expect(parity.A3.plain.series[1].hidden).toBe(true);
    expect(parity.A3.survey.series[1].hidden).toBe(false);
    // Filled: the light curve alone.
    expect(
      Object.values(parity)
        .flatMap(c => c.series ?? [])
        .filter(s => s.fill)
    ).toHaveLength(1);
    expect(parity.A2.series[0].fill).toBe(true);
  });

  test('keep the legends: every visible one toggles; the RV one only in a survey', () => {
    expect(parity.A1.legend.shown).toBe(true);
    expect(parity.A2.legend.shown).toBe(false);
    expect(parity.A3.plain.legend.shown).toBe(false);
    expect(parity.A3.survey.legend.shown).toBe(true);
    expect(parity.A4.legend.shown).toBe(true);
    expect(parity.A5.legend.shown).toBe(true);
    const all = [
      parity.A1,
      parity.A2,
      parity.A3.plain,
      parity.A3.survey,
      parity.A4,
      parity.A5,
    ];
    expect(all.every(c => c.legend.togglesSeries)).toBe(true);
  });

  test('keep the axis titles', () => {
    expect([parity.A1.x.title, parity.A1.y.title]).toEqual([
      'Time (s)',
      'Energy (J)',
    ]);
    expect([parity.A2.x.title, parity.A2.y.title]).toEqual([
      'Time (days)',
      'Brightness',
    ]);
    expect([parity.A3.plain.x.title, parity.A3.plain.y.title]).toEqual([
      'Time (days)',
      'Radial velocity (m/s)',
    ]);
  });

  test("keep the energy chart's tick and tooltip text", () => {
    // tickLabel() from js/format.js: round, grouped, a true minus sign.
    expect(parity.A1.y.customTickLabels).toEqual([
      '0',
      '1.5',
      '120',
      '12,000',
      '10⁶',
      '−0.0025',
    ]);
    expect(parity.A1.tooltip.sample).toBe('Kinetic: 1,230 J');
    expect(parity.A2.tooltipSample).toBe('Brightness: 0.998765');
  });

  test('keep the hover rules and the error bars', () => {
    expect(parity.A1.tooltip).toMatchObject({
      mode: 'index',
      intersect: false,
    });
    expect(parity.A2.tooltip).toMatchObject({
      mode: 'nearest',
      intersect: false,
    });
    expect(parity.A3.survey.errorBars).toMatchObject({
      sigmaBothWays: true,
      lineWidth: 1,
      capHalfWidth: limits.A3.errorBarCapHalfWidthPx,
    });
    expect(parity.A3.plain.plugins).toEqual(['rvErrorBars']);
  });

  test('say which axis is categorical today, so the change is recorded', () => {
    // PLOT_COMPONENT.md: a category x of strings becomes a numeric x.
    expect(parity.A2.categoryX).toBe(true);
    expect(parity.A4.categoryX).toBe(true);
    expect(parity.A1.categoryX).toBe(false);
    expect(parity.A3.plain.categoryX).toBe(false);
    expect(parity.A5.categoryX).toBe(false);
  });
});

describe('the caps and rates in source', () => {
  const inspector = read('js/inspectorPanel.js');
  const lightCurve = read('js/lightCurve.js');
  const rv = read('js/radialVelocity.js');
  const panel = read('js/experiments/panel.js');
  const settings = read('js/appState.js');
  const names = read('js/names.js');
  const chartModule = read('js/plot/chart.js');

  test('A1: 200 points a series, 8 Hz, a PNG from the chart', () => {
    expect(inspector).toContain(
      `const maxPoints = ${limits.A1.pointsPerSeries};`
    );
    expect(inspector).toContain(
      `updateHz > 0 ? updateHz : ${limits.A1.updateHz}`
    );
    expect(settings).toContain(`chart_update_hz: ${limits.A1.updateHz},`);
    // The export is the component's PNG (js/plot/export.js), awaited.
    expect(inspector).toContain('await chart.toPNG()');
    expect(inspector).toContain(`maxPoints,\n`);
  });

  test('A2: 2000 points, a repaint every 6th sample, the y rule, the theme repaint', () => {
    expect(lightCurve).toContain(
      `const MAX_DATA_POINTS = ${limits.A2.pointsPerSeries};`
    );
    expect(lightCurve).toContain(
      `const CHART_REDRAW_EVERY = ${limits.A2.redrawEverySamples};`
    );
    expect(lightCurve).toContain(
      `Math.max(range * ${limits.A2.yMarginOfRange}, ${limits.A2.yMarginFloor})`
    );
    expect(lightCurve).toContain(
      'yRange = [Math.max(0, minB - margin), maxB + margin]'
    );
    // The repaint on a theme change is the component's, on the same event.
    expect(names).toContain(`'${limits.A2.themeRepaintEvent}'`);
    expect(chartModule).toContain('window.addEventListener(EV_THEME_CHANGED');
    expect(lightCurve).toContain('maxPoints: MAX_DATA_POINTS');
  });

  test('A3: 900 samples, one every 60 ms, thinned two to one in a survey', () => {
    expect(rv).toContain(`const MAX_SAMPLES = ${limits.A3.pointsPerSeries};`);
    expect(rv).toContain(
      `const SAMPLE_INTERVAL_MS = ${limits.A3.sampleIntervalMs};`
    );
    expect(rv).toContain('series.filter((_, i) => i % 2 === 0)');
    // The error-bar caps: this module's constant is handed to the component,
    // whose own default is the same number.
    expect(rv).toContain(
      `const ERROR_BAR_CAP_PX = ${limits.A3.errorBarCapHalfWidthPx};`
    );
    expect(rv).toContain('capPx: ERROR_BAR_CAP_PX');
    expect(chartModule).toContain(
      `opts.capPx ?? ${limits.A3.errorBarCapHalfWidthPx}`
    );
    expect(rv).toContain('maxPoints: MAX_SAMPLES');
  });

  test('A4 and A5: the metric switch, the rounded time axis, failed trials left out', () => {
    expect(panel).toContain(
      `Number(r.t.toPrecision(${limits.A4.timeAxisRoundedTo}))`
    );
    expect(panel).toContain(
      'picker.onchange = () => renderChart(exp, comparison)'
    );
    expect(panel).toContain('picker.onchange = () => renderSweepChart(sweep)');
    expect(panel).toContain(
      '.filter(tr => Number.isFinite(tr.results?.[metric]))'
    );
    expect(panel).toContain('.sort((a, b) => a.x - b.x)');
  });
});

describe('which charts still load Chart.js', () => {
  test('none: all five draw with js/plot/chart.js, fetched on first use', () => {
    // D-PLOT-02 stage 3b ported the energy chart, the light curve and the
    // radial-velocity trace; stage 3c the bench's comparison and sweep; stage 4
    // (Prompt 132) removed the library, its wrapper and its vendor entry. Each
    // chart is built through the one mount, which fetches the component on
    // first use, and nothing in the tree can name the library any more.
    const files = readdirSync('js', { recursive: true })
      .filter(f => f.endsWith('.js'))
      .map(f => `js/${f}`);
    const reachers = files.filter(f =>
      /chartjs\.js|vendor\/chartjs|ensureChartJs|window\.Chart\b/.test(read(f))
    );
    expect(reachers).toEqual([]);
    expect(existsSync('js/chartjs.js')).toBe(false);
    expect(existsSync('vendor/chartjs')).toBe(false);
    const pkg = JSON.parse(read('package.json'));
    expect({ ...pkg.dependencies, ...pkg.devDependencies }['chart.js']).toBe(
      undefined
    );
    for (const ported of [
      'js/inspectorPanel.js',
      'js/lightCurve.js',
      'js/radialVelocity.js',
      'js/experiments/panel.js',
    ]) {
      expect(read(ported)).not.toMatch(/window\.Chart|ensureChartJs/);
      // Through the one mount, which fetches the component on first use.
      expect(read(ported)).toContain('mountChart');
    }
    expect(read('js/observationChart.js')).toContain(
      "import('./plot/mount.js')"
    );
  });

  test('the bench charts are div hosts, not canvases, and are torn down with the panel', () => {
    const panel = read('js/experiments/panel.js');
    expect(panel).toContain('<div id="benchChart" class="plot-host"></div>');
    expect(panel).toContain(
      '<div id="benchSweepChart" class="plot-host"></div>'
    );
    expect(panel).not.toContain('<canvas');
    // A language change replaces the panel's markup and so both hosts: the
    // charts are released first and rebuilt in the new ones.
    expect(panel).toMatch(/releaseBenchCharts\(\);\s+root\.remove\(\)/);
  });
});

describe("the bench charts' contract", () => {
  test('each has a text alternative, a title for every metric, and the table beside it', () => {
    expect(parity.A4.contract).toMatchObject({
      label: 'Run A against Run B on a shared simulated-time axis',
      tableBeside: true,
      dataIsTheAlignedRows: true,
    });
    expect(parity.A4.contract.metricTitles.map(([, title]) => title)).toEqual([
      'Separation (AU)',
      'Total energy (sim)',
      'Energy drift (%)',
    ]);
    expect(parity.A5.contract).toMatchObject({
      label: 'Parameter sweep',
      tableBeside: true,
      dataIsTheTrialsThatMeasured: true,
      failedTrialLeftOut: true,
    });
  });
});
