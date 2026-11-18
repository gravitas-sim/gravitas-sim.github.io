// =============================================================================
// Plots at reading size (criterion I-9, plot clause)
// -----------------------------------------------------------------------------
// The two pilot plots: Kepler's P against a (the lesson's scatter plot, with
// its fit line once P squared and a cubed are drawn) and the transit light
// curve (the series chart). Measured on what the reader is shown: every text
// node's drawn size in CSS pixels, with ticks at least 11 and titles and names
// at least 12; the fit line told from the points by shape, not by color; the
// light curve's name at the end of its line; and a grayscale capture in which
// the fit line's triangles are still there.
// =============================================================================

import { test, expect, getInvestigation } from './workflow.js';
import {
  judgePlotType,
  judgeSeriesWithoutColour,
  readSvgPlotText,
} from '../tools/visual-criteria.mjs';

const WIDTHS = [412, 768, 1366];
const PLANETS = [
  ['Mercury', '0.387', '0.241'],
  ['Earth', '1.000', '1.000'],
  ['Jupiter', '5.203', '11.86'],
  ['Saturn', '9.537', '29.45'],
];

async function openSid(page, app, lesson, sid) {
  const inv = await getInvestigation(lesson);
  const at = inv.steps.findIndex(s => s.sid === sid) + 1;
  await app.boot({ url: `/?author=${lesson}&step=${at}` });
  await expect(page.locator('#investigationPanel')).toBeVisible();
}

async function fillPlanets(page) {
  const inputs = page.locator('#investigationBody input[data-field]');
  for (let i = 0; i < PLANETS.length; i++)
    for (let j = 0; j < 3; j++) await inputs.nth(i * 3 + j).fill(PLANETS[i][j]);
  await expect(page.locator('#investigationPlotTable tbody tr')).toHaveCount(
    PLANETS.length
  );
}

test.describe('the Kepler plot at reading size', () => {
  for (const width of WIDTHS) {
    test(`ticks are 11 px, titles and names 12 px, the fit line has its own shape at ${width} px`, async ({
      page,
      app,
    }) => {
      await page.setViewportSize({ width, height: width < 700 ? 900 : 800 });
      await openSid(page, app, 'keplers-laws', 'measure-four-planets');
      await fillPlanets(page);
      await page.locator('#investigationPlotToggle').click();
      await expect(
        page.locator('#investigationPlotCanvas .inv-plot-mark')
      ).toHaveCount(1);
      const r = await page.evaluate(
        readSvgPlotText,
        '#investigationPlotCanvas'
      );
      const type = judgePlotType(r.texts);
      expect(
        type.pass,
        `ticks ${type.ticks}, smallest tick ${type.smallestTick}, smallest label ${type.smallestLabel}`
      ).toBe(true);
      // Names of the points and the fit's slope are labels too.
      expect(r.texts.some(t => /^slope /.test(t.text))).toBe(true);
      const shapes = judgeSeriesWithoutColour(r.series);
      expect(shapes.pass, JSON.stringify(r.series)).toBe(true);
      expect(r.series.map(s => s.marker)).toEqual(['circle', 'triangle']);
    });
  }

  test('the fit line is still told from the dots in grayscale', async ({
    page,
    app,
  }) => {
    await page.setViewportSize({ width: 1366, height: 800 });
    await openSid(page, app, 'keplers-laws', 'measure-four-planets');
    await fillPlanets(page);
    await page.locator('#investigationPlotToggle').click();
    await page.addStyleTag({ content: 'html { filter: grayscale(1); }' });
    const svg = page.locator('#investigationPlotCanvas');
    await svg.scrollIntoViewIfNeeded();
    // A shape survives the filter: the triangles are three subpaths, the dots
    // are circles, and neither is the other's element.
    await expect(svg.locator('.inv-plot-mark')).toHaveAttribute(
      'data-marker',
      'triangle'
    );
    expect(
      (await svg.locator('.inv-plot-mark').getAttribute('d')).match(/M/g)
    ).toHaveLength(3);
    await expect(svg.locator('.ow-pt').first()).toHaveJSProperty(
      'tagName',
      'circle'
    );
  });
});

test.describe('the transit light curve at reading size', () => {
  for (const width of WIDTHS) {
    test(`ticks 11 px, titles 12 px and the curve named at its end at ${width} px`, async ({
      page,
      app,
    }) => {
      await page.setViewportSize({ width, height: width < 700 ? 900 : 800 });
      await openSid(page, app, 'transit-photometry', 'your-first-transit');
      await expect(page.locator('#lightCurveChart svg')).toBeVisible({
        timeout: 20000,
      });
      await expect
        .poll(async () => {
          const t = await page.evaluate(
            readSvgPlotText,
            '#lightCurveChart svg'
          );
          return t.texts.length;
        })
        .toBeGreaterThan(0);
      const r = await page.evaluate(readSvgPlotText, '#lightCurveChart svg');
      const type = judgePlotType(r.texts);
      expect(
        type.pass,
        `ticks ${type.ticks}, smallest tick ${type.smallestTick}, smallest label ${type.smallestLabel}`
      ).toBe(true);
      // The curve is named where it ends, not by a legend.
      await expect(page.locator('#lightCurveChart ul')).toBeHidden();
      const named = r.texts.filter(t => /brightness/i.test(t.text));
      expect(named.some(t => t.size >= 12 - 1e-6)).toBe(true);
    });
  }
});
