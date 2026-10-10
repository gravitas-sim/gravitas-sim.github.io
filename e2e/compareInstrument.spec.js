// =============================================================================
// The comparison instrument in the Observatory (Roadmap II Prompt 85)
// -----------------------------------------------------------------------------
// A synthetic transit made from the HD 209458 system is opened as a reader's
// file. The comparison panel lays the system over it: the overlay and the
// residual plot are drawn, the chi-square is stated, every number the model was
// given says what kind it is. A keyboard moves one element, the overlay and the
// objective change, the page says where the model now misses, and the one
// element moved is marked as moved and still only assumed: nothing is refitted.
// =============================================================================

import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures.js';
import { runForward } from '../js/forward/index.js';
import { stateFromExoplanet } from '../js/compare/system.js';
import { observationJson } from '../js/observatory/export.js';

const TAGS = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22aa',
  'best-practice',
];

const file = () => {
  const o = runForward('transit', stateFromExoplanet('hd209458'), {
    format: 'gravitas.observing-setup',
    formatVersion: 1,
    seed: 'e2e-compare',
    epochs: { kind: 'regular', duration: 8, count: 400 },
    noise: { white: { sigma: 0.0004 } },
    instrument: { kind: 'photometer' },
  });
  return observationJson(o, { source: o, changes: [] });
};

test('a system over its own noisy data, then one element moved by keyboard', async ({
  page,
}) => {
  await page.goto('/observatory/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', {
    timeout: 30_000,
  });
  await page.locator('#obsFile').setInputFiles({
    name: 'synthetic.json',
    mimeType: 'application/json',
    buffer: Buffer.from(file()),
  });
  await expect(page.locator('#obsTitle')).toContainText('(synthetic)', {
    timeout: 30_000,
  });
  await page.locator('#obsComparePanel summary').click();
  const summary = page.locator('#cmpSummary');
  await expect(summary).toContainText('Chi-square', { timeout: 30_000 });
  await expect(page.locator('#cmpPlot .ow-overlay')).toHaveCount(1);
  await expect(page.locator('#cmpResiduals .ow-pt').first()).toBeVisible();
  // The truth through the noise it was made with: consistent, in every region.
  await expect(summary).toContainText('consistent with the stated errors');
  const before = await summary.innerText();
  const params = page.locator('.ow-cmp-params');
  await expect(params).toContainText('assumed (given to the model)');
  await expect(params).toContainText('derived');
  await expect(params).not.toContainText('fitted (a fit');

  const slider = page.locator('#cmpEl-radiusEarth');
  await slider.focus();
  for (let i = 0; i < 30; i++) await page.keyboard.press('ArrowRight');
  await expect(summary).not.toHaveText(before);
  await expect(summary).toContainText('the model is');
  await expect(params).toContainText('moved by you');
  // Moving it never fitted anything: the degrees of freedom still count none.
  await expect(summary).toContainText('estimated (0)');
  const box = await page.locator('#cmpPlot').boundingBox();
  expect(box.width).toBeGreaterThan(200);

  // The residuals are in a table too, for a reader who cannot see the plot.
  await page.locator('#cmpRows summary').click();
  await expect(page.locator('#cmpRows tbody tr').first()).toBeVisible();
  const violations = (
    await new AxeBuilder({ page }).withTags(TAGS).analyze()
  ).violations.map(v => `${v.id}: ${v.nodes.map(n => n.target).join(' ')}`);
  expect(violations).toEqual([]);
});
