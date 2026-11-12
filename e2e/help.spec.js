// =============================================================================
// Help II (Roadmap III, Prompt 286): help where the question is
// -----------------------------------------------------------------------------
// The unit tests hold the tables (explainer registry, definitions, areas); what
// only a browser shows is that H opens the explainer of the panel focus is in,
// that a term in it opens its definition by keyboard and closes again, that the
// glossary page groups the terms and lands on one, that the Teach table reaches
// a kernel's validation group, and that all of it reads in Spanish.
// =============================================================================

import { test, expect } from './fixtures.js';

/** Open one step of an investigation directly, through the authoring preview. */
async function openStep(app, page, lesson, step) {
  await app.boot({ url: `/?author=${lesson}&step=${step}` });
  await expect(page.locator('#investigationPanel')).toBeVisible();
}

test.describe('H explains the panel you are in', () => {
  test('one key opens the instrument’s explainer, with where it is checked, and a second closes it', async ({
    page,
    app,
  }) => {
    await openStep(app, page, 'tides', 22);
    await expect(page.locator('#investigationTool')).toBeVisible();
    const button = page.locator('#investigationToolExplain');
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await page
      .locator('#investigationTool')
      .getByRole('button')
      .first()
      .focus();
    await page.keyboard.press('h');
    const region = page.locator('#investigationTool .explainer');
    await expect(region).toBeVisible();
    await expect(button).toBeFocused();
    await expect(region.locator('.where-checked')).toContainText(
      'Where this is checked'
    );
    await expect(
      region.locator('.where-checked a[href="/model/#tides"]')
    ).toBeVisible();
    await page.keyboard.press('h');
    await expect(page.locator('.explainer')).toHaveCount(0);
  });

  test('a term in the explainer opens its definition by keyboard, and the key is on the sheet', async ({
    page,
    app,
  }) => {
    await openStep(app, page, 'tides', 22);
    await page.locator('#investigationToolExplain').click();
    const term = page.locator('#investigationTool .gl-term').first();
    await expect(term).toBeVisible();
    await expect(term).toHaveAttribute('aria-expanded', 'false');
    await term.focus();
    await page.keyboard.press('Enter');
    const def = page.locator('#investigationTool .gl-def').first();
    await expect(def).toBeVisible();
    await expect(def.locator('a[href^="/glossary/#t-"]')).toBeVisible();
    await expect(term).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Enter');
    await expect(page.locator('#investigationTool .gl-def')).toHaveCount(0);
    await page.keyboard.press('Shift+Slash');
    await expect(page.locator('#shortcutOverlay')).toContainText(
      'Explain the panel you are in'
    );
  });

  test('the same words arrive in Spanish', async ({ page, app }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('gravitas_locale', 'es');
    });
    await app.boot({ url: '/?author=tides&step=22' });
    await expect(page.locator('#investigationTool')).toBeVisible();
    await page
      .locator('#investigationTool')
      .getByRole('button')
      .first()
      .focus();
    await page.keyboard.press('h');
    const region = page.locator('#investigationTool .explainer');
    await expect(region.locator('.where-checked')).toContainText(
      'Dónde se comprueba'
    );
    await region.locator('.gl-term').first().click();
    await expect(region.locator('.gl-def').first()).toContainText(
      /Roche|excentricidad/i
    );
  });
});

test.describe('the glossary page', () => {
  test('groups the terms by topic and lands on one', async ({ page }) => {
    await page.goto('/glossary/#t-roche-limit', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.locator('#terms-h')).toBeVisible();
    const topics = page.locator('.gl-topics a');
    expect(await topics.count()).toBeGreaterThanOrEqual(6);
    const target = page.locator('#t-roche-limit');
    await expect(target).toBeVisible();
    await expect(target).toBeInViewport();
    await expect(target.locator('dd a.gl-model')).toHaveAttribute(
      'href',
      '/model/#tides'
    );
    await topics.first().focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#terms-light$/);
  });

  test('speaks Spanish when the stored language is Spanish', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('gravitas_locale', 'es');
    });
    await page.goto('/glossary/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#terms-h .gs-es')).toContainText(
      'Términos de la ciencia'
    );
    await expect(page.locator('#t-roche-limit dt .gs-es')).toHaveText(
      'Límite de Roche'
    );
    await expect(page.locator('#t-roche-limit dt .gs-en')).toBeHidden();
  });
});

test.describe('where to check the physics', () => {
  test('the Teach table opens, and a row reaches the validation group', async ({
    page,
  }) => {
    await page.goto('/teaching/', { waitUntil: 'domcontentloaded' });
    const box = page.locator('#teachKernels');
    await box.locator('summary').click();
    const rows = page.locator('#teachKernelTable tbody tr');
    await expect(rows.first()).toBeVisible();
    expect(await rows.count()).toBeGreaterThan(40);
    const lensing = rows.filter({ hasText: 'Gravitational lensing' });
    await expect(lensing.locator('a[href="/model/#lensing"]')).toBeVisible();
    await lensing.locator('a[href^="/validation/#g-lensing"]').first().click();
    await expect(page).toHaveURL(/\/validation\/#g-lensing-ii/);
    const group = page.locator('.val-group[id^="g-lensing-ii"]');
    await expect(group).toBeVisible();
    await expect(group).toBeInViewport();
  });
});
