// =============================================================================
// First run: one overlay at a time, in order, and none twice
// -----------------------------------------------------------------------------
// PLATFORM_MODEL.md, "First run". On a first visit Home comes first and the
// card that names the scenario after it - it used to rise in the moment
// Home's module was loading and sit underneath it. Each closes from the
// keyboard, and a card the reader closed does not come back for the same
// scenario when it is rebuilt. The phone's touch tips, which wait for the
// first touch and for a clear screen, are in mobile.spec.js, the spec that runs
// on a touch profile.
// =============================================================================

import { test, expect } from './fixtures.js';

const CARD = '#scenarioInfoBox';
const shown = page =>
  page.evaluate(
    sel => document.querySelector(sel)?.classList.contains('showUI') ?? false,
    CARD
  );

test.describe('on a first visit', () => {
  test('Home first, and the scenario card only after it', async ({
    page,
    app,
  }) => {
    await app.boot({ firstVisit: true });
    await expect(page.locator('#welcomeScreen')).toBeVisible();
    expect(await shown(page), 'no card under the front door').toBe(false);

    await page.keyboard.press('Escape');
    await expect(page.locator('#welcomeScreen')).toBeHidden();
    await expect.poll(() => shown(page)).toBe(true);
  });

  test('the card closes from the keyboard, and stays closed on a rebuild', async ({
    page,
    app,
  }) => {
    await app.boot({ firstVisit: true });
    await page.keyboard.press('Escape');
    await expect.poll(() => shown(page)).toBe(true);

    await page.keyboard.press('Escape');
    await expect.poll(() => shown(page)).toBe(false);

    // Refresh rebuilds the same scenario. The card was closed for it.
    await page.locator('#refreshScenarioBtn').evaluate(el => el.click());
    await app.waitForFrames(30);
    expect(await shown(page)).toBe(false);
  });
});

test('a screen reader hears the scenario by name, not the sentinel', async ({
  page,
  app,
}) => {
  await app.boot();
  await page.locator('#refreshScenarioBtn').evaluate(el => el.click());
  const status = page.locator('#srStatus');
  await expect(status).toContainText('Loaded');
  await expect(status).not.toContainText('None');
});
