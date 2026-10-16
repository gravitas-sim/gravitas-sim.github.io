// =============================================================================
// Comparing named models, in the Observatory's fit panel
// -----------------------------------------------------------------------------
// tests/analysis.test.js holds js/analysis/modelCompare.js to synthetic radial
// velocities in Node. This is the comparison where a reader meets it: two fits
// of HD 209458 b's TESS transit, one with the limb darkening free and one with
// it fixed, compared with each other and with a constant, in the panel's own
// lazy chunk; its tables, the nested test between them, the correlations of the
// fitted parameters, the saved comparison with both fits' documents inside, and
// no accessibility violations.
// =============================================================================

import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { test, expect } from './fixtures.js';

const TAGS = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22aa',
  'best-practice',
];

async function openPanel(page) {
  await page.goto('/observatory/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', {
    timeout: 30_000,
  });
  await page.locator('#obsFixture').selectOption('tess-light-curve');
  await page.locator('#obsOpen').click();
  await expect(page.locator('#obsTable tbody tr').first()).toBeVisible({
    timeout: 30_000,
  });
  await page.locator('#obsFitPanel summary').click();
  await expect(page.locator('#fitRun')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('#fitEstimate')).toContainText(/About \d+ s/);
  await page.locator('#fitProfiles').uncheck();
}

async function fit(page) {
  const before = await page.locator('#fitCompareList li').count();
  await page.locator('#fitRun').click();
  await expect(page.locator('#fitStatus')).toContainText(/Fitted in/, {
    timeout: 120_000,
  });
  await expect(page.locator('#fitCompareList li')).toHaveCount(before + 1);
}

test.describe('comparing named models', () => {
  test('two fits and a constant: the criteria, the nested test and the residuals', async ({
    page,
  }, info) => {
    await openPanel(page);
    await fit(page);
    // The first fit's correlations: which parameters the data separate.
    await expect(
      page.locator('#fitCorrelation tbody tr').first()
    ).toBeVisible();
    await expect(page.locator('#fitCompareList li').first()).toContainText(
      'every parameter free'
    );

    // The same model with its limb darkening held fixed.
    for (const q of ['q1', 'q2']) {
      await page.locator(`#fitMode-${q}`).selectOption('fixed');
      await page.locator(`#fitValue-${q}`).fill(q === 'q1' ? '0.36' : '0.3');
    }
    await fit(page);
    await expect(page.locator('#fitCompareList li').nth(1)).toContainText(
      'Limb darkening q1 = 0.36'
    );

    await page.locator('#fitCompareRun').click();
    const rows = page.locator('#fitCompareTable tbody tr');
    await expect(rows).toHaveCount(3);
    await expect(rows.first()).toContainText('A constant (no signal)');
    // A transit two thousand rows deep is nothing like a constant.
    const dAic = await page
      .locator('#fitCompareTable tbody tr:first-child td:nth-child(6)')
      .textContent();
    expect(Number(dAic.replace(/[^\d.]/g, ''))).toBeGreaterThan(100);
    // Fixed limb darkening is the free fit with two numbers held: nested, two
    // degrees of freedom.
    const nested = page.locator('#fitCompareNested tbody tr', {
      hasText: 'Fit 2',
    });
    await expect(
      nested.filter({ hasText: 'Fit 1' }).locator('td').nth(2)
    ).toHaveText('2');
    await expect(page.locator('#fitCompareResiduals tbody tr')).toHaveCount(3);
    await expect(page.locator('#fitComparePreferred')).toContainText(
      /preferred|do not choose/
    );
    await expect(page.locator('#fitCompareMethods')).toContainText(
      'model-comparison 1.0.0'
    );

    const [saved] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#fitCompareExport').click(),
    ]);
    const path = info.outputPath('models.json');
    await saved.saveAs(path);
    const doc = JSON.parse(readFileSync(path, 'utf8'));
    expect(doc).toMatchObject({
      format: 'gravitas.analysis',
      kind: 'models',
      tool: { id: 'model-comparison' },
    });
    expect(doc.sources).toHaveLength(2);
    expect(
      doc.sources.every(s => s.document.format === 'gravitas.inference')
    ).toBe(true);
    expect(doc.sources[1].document.parameters.q1).toEqual({
      mode: 'fixed',
      value: 0.36,
    });
    expect(doc.comparison.models.map(m => m.k)).toEqual([
      1,
      expect.any(Number),
      expect.any(Number),
    ]);

    const scan = await new AxeBuilder({ page })
      .withTags(TAGS)
      .include('#obsFitPanel')
      .analyze();
    expect(scan.violations).toEqual([]);
  });
});
