// =============================================================================
// Failure states, part 3: files the browser cannot read,
// -----------------------------------------------------------------------------
// Roadmap II Prompt 57. The read is made to fail by stubbing File.text, the way
// a file removed or locked after it was chosen fails.
// =============================================================================

import { test, expect } from './fixtures.js';

const unreadable = page =>
  page.addInitScript(() => {
    window.File.prototype.text = () =>
      Promise.reject(new Error('NotReadableError'));
  });

const file = {
  name: 'x.csv',
  mimeType: 'text/csv',
  buffer: Buffer.from('a,b'),
};

test.describe('a file the browser cannot read', () => {
  test('the Observatory says so once and stays usable', async ({ page }) => {
    await unreadable(page);
    await page.goto('/observatory/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', {
      timeout: 30_000,
    });
    await page.locator('#obsFile').setInputFiles(file);
    const alert = page.locator('#obsImportProblems');
    await expect(alert).toContainText('could not read that file');
    await expect(alert).toHaveAttribute('role', 'alert');
    await expect(page.locator('#obsImportForm')).toBeHidden();
    await expect(page.locator('#obsOpen')).toBeEnabled();
  });

  test('the submissions page lists it as not read', async ({ page }) => {
    await unreadable(page);
    await page.goto('/instructors/submissions/', {
      waitUntil: 'domcontentloaded',
    });
    await page.locator('#picker').setInputFiles(file);
    await expect(page.locator('main')).toContainText(
      'the browser could not read the file',
      { timeout: 30_000 }
    );
  });
});
