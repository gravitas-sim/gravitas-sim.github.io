// =============================================================================
// The Observatory's formula column, in a browser (Prompt 100)
// -----------------------------------------------------------------------------
// tests/formula.test.js and tests/formulaSurfaces.test.js hold the language and
// the change without a page. This is the page: the form loads only when asked
// for, a formula is read and refused in words, a Spanish decimal comma reads
// through the shared reader, and the column it makes is in the table.
// =============================================================================

import { test, expect } from './fixtures.js';

async function openPage(page) {
  await page.goto('/observatory/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', {
    timeout: 30_000,
  });
  await page.locator('#obsFixture').selectOption('ngc2420-photometry');
  await page.locator('#obsOpen').click();
  await expect(page.locator('#obsWork')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('#obsTable tbody tr').first()).toBeVisible();
  await page
    .locator('#obsFormulaBox')
    .evaluate(el => (el.closest('details').open = true));
}

test.describe('the formula column', () => {
  test('is loaded when asked for, refuses a sum of unlike kinds in words, and adds a column', async ({
    page,
  }) => {
    await openPage(page);
    await expect(page.locator('#obsFormulaText')).toHaveCount(0);
    await page.locator('#obsFormulaOpen').click();
    await expect(page.locator('#obsFormulaText')).toBeVisible({
      timeout: 30_000,
    });
    await page.locator('#obsFormulaText').fill('g + 1');
    await expect(page.locator('#obsFormulaPreview')).toContainText(
      /cannot be added or subtracted/
    );
    await page.locator('#obsFormulaText').fill('g - r');
    await expect(page.locator('#obsFormulaPreview')).toContainText(/mag/);
    await page.locator('#obsFormulaName').fill('color');
    await page.locator('#obsFormulaGo').click();
    await expect(page.locator('#obsTable thead')).toContainText('color', {
      timeout: 30_000,
    });
    await expect(page.locator('#obsChangeStatus')).toHaveText('');
  });

  test('reads a Spanish decimal comma through the shared reader', async ({
    page,
  }) => {
    await openPage(page);
    await page.locator('[data-gs-lang]').selectOption('es');
    await page.locator('#obsFormulaOpen').click();
    await expect(page.locator('#obsFormulaText')).toBeVisible({
      timeout: 30_000,
    });
    await page.locator('#obsFormulaText').fill('2,5 * (g - r)');
    await expect(page.locator('#obsFormulaPreview')).not.toHaveClass(
      /is-error/
    );
    await page.locator('#obsFormulaText').fill('2.5 * (g - r)');
    await expect(page.locator('#obsFormulaPreview')).toHaveClass(/is-error/);
    await page.locator('#obsFormulaText').fill('2,5 * (g - r)');
    await page.locator('#obsFormulaName').fill('color2');
    await page.locator('#obsFormulaGo').click();
    await expect(page.locator('#obsTable thead')).toContainText('color2', {
      timeout: 30_000,
    });
  });
});
