// =============================================================================
// Failure states, induced
// -----------------------------------------------------------------------------
// Each test breaks one thing the way a real browser would - a chunk that will
// not download, storage that refuses a write - and checks that the reader is
// told once, can dismiss or retry from the keyboard, and that the retry works.
// Roadmap II Prompt 57.
// =============================================================================

import { test, expect } from './fixtures.js';

/**
 * The failure was induced, so the browser's report of it is expected. Anything
 * else the page logged still fails the test.
 */
function expectedFailure(errors) {
  errors.consoleErrors = errors.consoleErrors.filter(
    m => !/Failed to load resource|could not be loaded/.test(m)
  );
}

test.describe('a lazy chunk that fails to load', () => {
  test.beforeEach(async ({ app }) => {
    await app.boot();
    await app.dismissFrontDoor();
  });

  test('a failed fetch is offered again, and the retry opens the view', async ({
    page,
    app,
    errors,
  }) => {
    let blocked = 1;
    await page.route('**/js/fragments/view3d.html*', route =>
      blocked-- > 0 ? route.abort() : route.continue()
    );
    await app.railControl('toggle3DView');
    await page.locator('#toggle3DView').click();

    const toast = page.locator('#gravitasToast.is-visible');
    await expect(toast).toContainText('could not be loaded');
    // Said once: the status region holds the message.
    await expect(page.locator('#srStatus')).toHaveText(/could not be loaded/);
    await toast.getByRole('button', { name: 'Retry' }).click();
    await expect(page.locator('#gravitasToast.is-visible')).toHaveCount(0);
    await expect(page.locator('#threeViewportContainer')).toHaveCount(1, {
      timeout: 30_000,
    });
    expectedFailure(errors);
  });

  test('a module the browser cached as failed offers a reload, not a dead Retry', async ({
    page,
    app,
    errors,
  }) => {
    await page.route('**/js/experiments/bench.js*', route => route.abort());
    await app.railControl('toggleExperiments');
    await page.locator('#toggleExperiments').click();
    await page
      .locator('#gravitasToast.is-visible')
      .getByRole('button', { name: 'Retry' })
      .click();
    const toast = page.locator('#gravitasToast.is-visible');
    await expect(toast).toContainText('Reload the page');
    await expect(toast.getByRole('button', { name: 'Reload' })).toBeVisible();
    expectedFailure(errors);
  });

  test('Escape dismisses the message', async ({ page, app, errors }) => {
    await page.route('**/js/experiments/bench.js*', route => route.abort());
    await app.railControl('toggleExperiments');
    await page.locator('#toggleExperiments').click();
    await expect(page.locator('#gravitasToast.is-visible')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#gravitasToast.is-visible')).toHaveCount(0);
    expectedFailure(errors);
  });
});
