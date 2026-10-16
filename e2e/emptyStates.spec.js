// =============================================================================
// Empty states with a next action (Roadmap II Prompt 57, step F)
// -----------------------------------------------------------------------------
// Each is induced the way a reader meets it: a page before anything is done,
// a search that finds nothing, a results file that cannot be read.
// =============================================================================

import { test, expect } from './fixtures.js';

const ready = async (page, url) => {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', {
    timeout: 30_000,
  });
};

test.describe('empty states say what to do next', () => {
  test('the Observatory archive and fit panel, before anything is asked', async ({
    page,
  }) => {
    await ready(page, '/observatory/');
    await page.locator('#obsArchivePanel > summary').click();
    const arc = page.locator('#arcResults .ui-state.is-empty');
    await expect(arc).toContainText('press Find');
    await page.locator('#obsFixture').selectOption('tess-light-curve');
    await page.locator('#obsOpen').click();
    await expect(page.locator('#obsTable tbody tr').first()).toBeVisible({
      timeout: 30_000,
    });
    await page.locator('#obsFitPanel summary').click();
    await expect(page.locator('#fitEmpty')).toContainText('press Fit');
    await expect(page.locator('#fitEmpty')).toHaveClass(/ui-state/);
  });

  test('the Observatory empty states are in Spanish', async ({ page }) => {
    await page.addInitScript(() =>
      localStorage.setItem('gravitas_locale', 'es')
    );
    await ready(page, '/observatory/');
    await page.locator('#obsArchivePanel > summary').click();
    await expect(page.locator('#arcResults .ui-state')).toContainText(
      'pulsa Buscar'
    );
  });

  test('the experiments page asks for a run before it shows results', async ({
    page,
  }) => {
    await page.goto('/experiments/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#xpRun')).toBeVisible();
    await expect(page.locator('#xpResultsEmpty')).toBeVisible();
    await expect(page.locator('#xpResultsEmpty')).toContainText('press Run');
    await expect(page.locator('#xpResults')).toBeHidden();
  });

  test('the catalog says how to get its entries back', async ({ page }) => {
    await page.goto('/catalog/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('article[data-entry]').first()).toBeVisible({
      timeout: 30_000,
    });
    await page.locator('#catSearch').fill('zzzz-no-such-entry');
    await expect(page.locator('article[data-entry]')).toHaveCount(0);
    await expect(page.locator('#catCount')).toContainText('Nothing matches');
    await expect(page.locator('#catCount')).toContainText('Clear the search');
  });

  test('the validation page names what to press when its results cannot be read', async ({
    page,
    errors,
  }) => {
    await page.route('**/validation/data.json', route =>
      route.fulfill({ status: 404, body: 'gone' })
    );
    await page.goto('/validation/', { waitUntil: 'domcontentloaded' });
    const state = page.locator('#valGroups2 .ui-state.is-empty');
    await expect(state).toContainText('Press Run all checks');
    await expect(page.locator('#valRunBtn')).toBeEnabled();
    // The failure was induced, so the browser's report of it is expected.
    errors.consoleErrors = errors.consoleErrors.filter(
      m => !/Failed to load resource/.test(m)
    );
  });

  test('the instructor page keeps an empty filter state with its next action', async ({
    page,
  }) => {
    await page.goto('/instructors/', { waitUntil: 'domcontentloaded' });
    const none = page.locator('#noMatches');
    await expect(none).toHaveClass(/ui-state/);
    await expect(none).toContainText('remove the filter');
    await expect(none).toContainText('quita el filtro');
  });
});
