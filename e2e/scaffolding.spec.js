// =============================================================================
// Scaffolding: hints, feedback by outcome class, named mistakes, explainers
// -----------------------------------------------------------------------------
// Roadmap II, Prompt 71. The engine's rules are proved in unit tests; what only
// a browser shows is the order things arrive in, what a screen reader is told,
// where keyboard focus goes after a reveal, and that an explainer opens on
// request, in the reader's language, as a named region.
// =============================================================================

import { test, expect } from './fixtures.js';

/** Open one step of an investigation directly, through the authoring preview. */
async function openStep(app, page, lesson, step) {
  await app.boot({ url: `/?author=${lesson}&step=${step}` });
  await expect(page.locator('#investigationPanel')).toBeVisible();
}

const status = page => page.locator('#srStatus');

test.describe('a ladder of hints, one at a time', () => {
  test('each press shows one more, in order, and the worked answer comes last', async ({
    page,
    app,
  }) => {
    // Hohmann: the semi-major axis of the transfer ellipse, two hints and a worked answer.
    await openStep(app, page, 'hohmann-transfer', 8);
    await expect(page.locator('.inv-hint')).toHaveCount(0);

    await page.locator('[data-hint]').click();
    await expect(page.locator('.inv-hint')).toHaveCount(1);
    await expect(page.locator('.inv-hint').first()).toContainText(
      /Hint 1 of 2/
    );

    await page.locator('[data-hint]').click();
    await expect(page.locator('.inv-hint')).toHaveCount(2);
    await expect(page.locator('.inv-hint').nth(1)).toContainText(/Hint 2 of 2/);
    await expect(page.locator('.inv-hint.is-worked')).toHaveCount(0);

    await page.locator('[data-hint]').click();
    await expect(page.locator('.inv-hint.is-worked')).toBeVisible();
    await expect(page.locator('[data-hint]')).toHaveCount(0);
    await expect(page.locator('.inv-hint-tally')).toContainText(/2 hint/);
  });

  test('a reveal is spoken in full and keeps keyboard focus in place', async ({
    page,
    app,
  }) => {
    await openStep(app, page, 'hohmann-transfer', 8);
    await page.locator('[data-hint]').focus();
    await page.keyboard.press('Enter');
    // The hint text itself is announced, not just that something appeared.
    await expect(status(page)).toContainText(/Hint shown/);
    await expect(status(page)).toContainText(/through the star/i);
    // Focus is on the hint that was shown, so the next press is one Tab away.
    await expect(page.locator('.inv-hint').first()).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-hint]')).toBeFocused();
    await page.keyboard.press('Space');
    await expect(page.locator('.inv-hint')).toHaveCount(2);
  });

  test('a choice question can carry hints too', async ({ page, app }) => {
    await openStep(app, page, 'orbital-energy', 8);
    await page.locator('[data-hint]').click();
    await expect(page.locator('.inv-hint')).toHaveCount(1);
    await expect(status(page)).toContainText(/Hint shown/);
  });
});

test.describe('feedback says which check to make, not the answer', () => {
  test('a number in the wrong unit is told so', async ({ page, app }) => {
    await openStep(app, page, 'keplers-laws', 16);
    // 8 years is 2922 days.
    await page.locator('[data-numeric]').fill('2922');
    await page.locator('[data-check-numeric]').click();
    await expect(page.locator('.inv-feedback')).toHaveClass(/is-wrong/);
    await expect(page.locator('.inv-class')).toContainText(/days/i);
    await expect(status(page)).toContainText(/days/i);
  });

  test('a number a power of ten out gets its own words', async ({
    page,
    app,
  }) => {
    await openStep(app, page, 'keplers-laws', 16);
    await page.locator('[data-numeric]').fill('80');
    await page.locator('[data-check-numeric]').click();
    await expect(page.locator('.inv-class')).toContainText(/power of ten/i);
  });

  test('a named mistake still wins over the class', async ({ page, app }) => {
    await openStep(app, page, 'keplers-laws', 16);
    await page.locator('[data-numeric]').fill('64');
    await page.locator('[data-check-numeric]').click();
    await expect(page.locator('.inv-misconception')).toContainText(
      /square root/i
    );
  });

  test('a wrong option names the mistake it is, and says so aloud', async ({
    page,
    app,
  }) => {
    await openStep(app, page, 'orbital-energy', 15);
    await page.locator('[data-option="0"]').click();
    await expect(page.locator('.inv-misconception')).toContainText(
      /no range limit/i
    );
    await expect(status(page)).toContainText(/no range limit/i);
  });
});

test.describe('"What am I looking at?"', () => {
  test('opens on request from the docked instrument, as a named region', async ({
    page,
    app,
  }) => {
    await openStep(app, page, 'transit-photometry', 6);
    const tool = page.locator('#investigationTool');
    await expect(tool).toBeVisible();
    const button = page.locator('#investigationToolExplain');
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('.explainer')).toHaveCount(0);
    await button.click();
    const region = page.locator('#investigationTool .explainer');
    await expect(region).toBeVisible();
    await expect(region).toHaveAttribute('role', 'region');
    await expect(region.locator('dt')).toHaveCount(4);
    await expect(region).toContainText(/cannot show|can.t show/i);
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await button.click();
    await expect(page.locator('.explainer')).toHaveCount(0);
  });

  test('the same words arrive in Spanish', async ({ page, app }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('gravitas_locale', 'es');
    });
    await app.boot({ url: '/?author=transit-photometry&step=6' });
    await expect(page.locator('#investigationTool')).toBeVisible();
    await page.locator('#investigationToolExplain').click();
    await expect(
      page.locator('#investigationTool .explainer dt').first()
    ).toContainText(/ejes/i);
  });
});
