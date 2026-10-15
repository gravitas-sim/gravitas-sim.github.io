import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';

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

  test('A1: 200 points a series, 8 Hz, a PNG from the chart', () => {
    expect(inspector).toContain(
      `const maxPoints = ${limits.A1.pointsPerSeries};`
    );
    expect(inspector).toContain(
      `updateHz > 0 ? updateHz : ${limits.A1.updateHz}`
    );
    expect(settings).toContain(`chart_update_hz: ${limits.A1.updateHz},`);
    expect(inspector).toContain("toBase64Image('image/png'");
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
    expect(lightCurve).toContain('scales.y.min = Math.max(0, minB - margin)');
    expect(lightCurve).toContain('scales.y.max = maxB + margin');
    expect(lightCurve).toContain(
      `addEventListener('${limits.A2.themeRepaintEvent}', repaintChart)`
    );
  });

  test('A3: 900 samples, one every 60 ms, thinned two to one in a survey', () => {
    expect(rv).toContain(`const MAX_SAMPLES = ${limits.A3.pointsPerSeries};`);
    expect(rv).toContain(
      `const SAMPLE_INTERVAL_MS = ${limits.A3.sampleIntervalMs};`
    );
    expect(rv).toContain('series.filter((_, i) => i % 2 === 0)');
    expect(rv).toContain(`el.x - ${limits.A3.errorBarCapHalfWidthPx}`);
    expect(rv).toContain(`el.x + ${limits.A3.errorBarCapHalfWidthPx}`);
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
