import { describe, test, expect } from '@jest/globals';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import { Chart } from '../vendor/chartjs/chart.js';

// =============================================================================
// The vendored Chart.js registers what the application's charts need
// -----------------------------------------------------------------------------
// vendor/chartjs/chart.js registers only the controllers, axes, elements and
// plugins Gravitas draws with (tools/vendor-deps.mjs says which, and why).
// Missing one fails in a reader's browser, not here, unless it is tested here:
// an unregistered chart or axis type throws when the chart is made, and an
// unregistered plugin is ignored without a word - a filled curve drawn
// unfilled, a tooltip that never appears.
//
// So this reads every module that makes a chart for the chart and axis types
// it names, and holds each to the registry; and it holds the registry to the
// plugins those charts are configured with.
// =============================================================================

/** Every type name Chart.js ships: the charts and the axes. */
const CHART_TYPES = [
  'bar',
  'bubble',
  'doughnut',
  'line',
  'pie',
  'polarArea',
  'radar',
  'scatter',
];
const AXIS_TYPES = [
  'category',
  'linear',
  'logarithmic',
  'radialLinear',
  'time',
  'timeseries',
];

const registered = (kind, id) => {
  try {
    return Boolean(Chart.registry[kind](id));
  } catch {
    return false;
  }
};

/** The application's modules that make a chart. */
function chartModules() {
  const out = [];
  (function walk(dir) {
    for (const name of readdirSync(dir)) {
      const at = path.join(dir, name);
      if (statSync(at).isDirectory()) walk(at);
      else if (name.endsWith('.js')) {
        const text = readFileSync(at, 'utf8');
        if (/new (Chart|ChartCtor)\(/.test(text)) out.push({ at, text });
      }
    }
  })('js');
  return out;
}

describe('the vendored Chart.js', () => {
  test('registers the two chart types, their elements and both axes', () => {
    expect(registered('getController', 'line')).toBe(true);
    expect(registered('getController', 'scatter')).toBe(true);
    expect(registered('getElement', 'line')).toBe(true);
    expect(registered('getElement', 'point')).toBe(true);
    expect(registered('getScale', 'category')).toBe(true);
    expect(registered('getScale', 'linear')).toBe(true);
  });

  test('registers the plugins the charts are configured with', () => {
    // The light curve is filled (`fill: true`); every chart configures its
    // legend; the light curve, the energy chart and the RV curve their
    // tooltips.
    for (const id of ['filler', 'legend', 'tooltip']) {
      expect({ id, ok: registered('getPlugin', id) }).toEqual({ id, ok: true });
    }
  });

  test('and not the rest of the library', () => {
    expect(registered('getController', 'bar')).toBe(false);
    expect(registered('getScale', 'time')).toBe(false);
  });
});

describe('every chart the application makes', () => {
  const modules = chartModules();

  test('is found, so that the checks below are about something', () => {
    // The light curve, the RV curve, the energy chart and the bench's two.
    expect(modules.map(m => path.basename(m.at)).sort()).toEqual([
      'energyChartNew.js',
      'lightCurve.js',
      'panel.js',
      'radialVelocity.js',
    ]);
  });

  test('names only chart and axis types the vendored build registers', () => {
    const named = [];
    for (const { at, text } of modules) {
      for (const m of text.matchAll(/\btype:\s*'([A-Za-z]+)'/g)) {
        if (CHART_TYPES.includes(m[1])) {
          named.push({ at, type: m[1], ok: registered('getController', m[1]) });
        } else if (AXIS_TYPES.includes(m[1])) {
          named.push({ at, type: m[1], ok: registered('getScale', m[1]) });
        }
      }
    }
    expect(named.length).toBeGreaterThan(4);
    expect(named.filter(n => !n.ok)).toEqual([]);
  });

  test('uses no plugin option the vendored build would ignore', () => {
    for (const { at, text } of modules) {
      // Options only an unregistered plugin reads.
      expect({
        at,
        found: text.match(/\b(decimation|subtitle|colors):/g),
      }).toEqual({
        at,
        found: null,
      });
    }
  });
});
