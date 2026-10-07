// =============================================================================
// Failure states, part 2: Workers that do not start
// -----------------------------------------------------------------------------
// Roadmap II Prompt 57. Each test induces a Worker script that will not download
// and checks what the reader is told and what they can do about it.
// =============================================================================

import { test, expect } from './fixtures.js';

/** The failure was induced, so the browser's report of it is expected. */
const expected = errors => {
  errors.consoleErrors = errors.consoleErrors.filter(
    m => !/Failed to load resource|Worker|worker|ERR_FAILED/.test(m)
  );
  errors.pageErrors = errors.pageErrors.filter(
    m => !/Worker|worker|Failed to fetch/.test(m)
  );
};

test.describe('a Worker that does not start', () => {
  test('the experiments page says the trial could not be built', async ({
    page,
    errors,
  }) => {
    await page.route('**/experiments/experimentWorker.js*', r => r.abort());
    await page.goto('/experiments/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#xpEstimate')).toContainText(/\S/, {
      timeout: 30_000,
    });
    await expect(page.locator('#xpEstimate')).not.toContainText('trials of');
    await expect(page.locator('#xpRun')).toBeDisabled();
    expected(errors);
  });

  test('the fit panel says the fit did not finish, and Run is available again', async ({
    page,
    errors,
  }) => {
    await page.route('**/inference/inferenceWorker.js*', r => r.abort());
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
    await page.locator('#fitRun').click();
    await expect(page.locator('#fitStatus').first()).toContainText(
      'did not finish',
      { timeout: 30_000 }
    );
    await expect(page.locator('#fitRun')).toBeEnabled();
    expected(errors);
  });

  test('the validation page says it could not run, and offers Try again', async ({
    page,
    errors,
  }) => {
    await page.route('**/js/validationWorker.js*', r => r.abort());
    await page.goto('/validation/', { waitUntil: 'domcontentloaded' });
    await page.locator('#valRunBtn').click();
    await expect(page.locator('#valRunResult')).toContainText('Could not run', {
      timeout: 30_000,
    });
    await expect(page.locator('#valRunBtn')).toHaveText('Try again');
    await expect(page.locator('#valRunBtn')).toBeEnabled();
    expected(errors);
  });
});
