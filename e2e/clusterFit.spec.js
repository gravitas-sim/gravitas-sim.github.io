// =============================================================================
// The cluster fit panel, in a browser (Prompt 219, CLUSTER_FITTING.md)
// -----------------------------------------------------------------------------
// tests/clusterFit.test.js holds the kernel and its validation. This is the
// page: the disclosure under the colour-magnitude diagram of NGC 2420's SEGUE
// table fits an age and a distance at the stated metallicity, draws the fitted
// isochrone over the data, the profile plots and the valley, lists what was
// assumed and offers the record; Spanish; no horizontal scroll at phone widths;
// no accessibility violations.
// =============================================================================

import AxeBuilder from '@axe-core/playwright';
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
  await page.goto('/observatory/?open=ngc2420-segue', {
    waitUntil: 'domcontentloaded',
  });
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', {
    timeout: 30_000,
  });
  await page.locator('#obsClusterPanel').evaluate(el => (el.open = true));
  await expect(page.locator('#obsClFit')).toBeVisible({ timeout: 30_000 });
}

test.describe('the cluster fit panel', () => {
  test('fits NGC 2420 at a stated metallicity and says what it assumed', async ({
    page,
  }) => {
    await openPanel(page);
    await page.locator('#obsClFit').click();
    await expect(page.locator('#obsClTable')).toBeVisible({ timeout: 90_000 });
    await expect(page.locator('#obsClOut')).toContainText('Gyr');
    await expect(page.locator('#obsClRecord')).toBeVisible();
    await expect(page.locator('#obsClOut svg').first()).toBeVisible();
    expect(await page.locator('#obsClOut svg').count()).toBeGreaterThanOrEqual(
      3
    );
  });

  for (const width of [320, 375, 390]) {
    test(`no horizontal scroll at ${width} px, with a result shown`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });
      await openPanel(page);
      await page.locator('#obsClFit').click();
      await expect(page.locator('#obsClTable')).toBeVisible({
        timeout: 90_000,
      });
      const over = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth
      );
      expect(over).toBeLessThanOrEqual(0);
    });
  }

  test('Spanish, and no accessibility violations in either language', async ({
    page,
  }) => {
    await openPanel(page);
    await page.locator('#obsClFit').click();
    await expect(page.locator('#obsClTable')).toBeVisible({ timeout: 90_000 });
    const en = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    expect(en.violations).toEqual([]);
    await page.locator('[data-gs-lang]').selectOption('es');
    await expect(page.locator('#obsClusterPanel summary')).toContainText(
      'Cúmulo'
    );
    await page.locator('#obsClusterPanel').evaluate(el => (el.open = true));
    const es = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    expect(es.violations).toEqual([]);
  });
});
