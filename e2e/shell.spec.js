// =============================================================================
// The shared shell, in a browser (Roadmap II Prompt 50)
// -----------------------------------------------------------------------------
// tests/shell.test.js holds the markup; this holds what a reader does with it:
// open a group and follow a link, by mouse and by keyboard; close it with
// Escape or a click elsewhere; choose a theme and a language on one page and
// find them on the next two; fold it all behind Menu on a phone.
// =============================================================================

import { test, expect } from './fixtures.js';
import { stepKey } from './keyboard.js';

const groups = page => page.locator('.gs-group');
const openGroups = page =>
  page.evaluate(
    () => [...document.querySelectorAll('.gs-group')].filter(d => d.open).length
  );

test.describe('the shell', () => {
  test('a group opens, one at a time, and Escape or a click elsewhere closes it', async ({
    page,
  }) => {
    await page.goto('/model/', { waitUntil: 'load' });
    await expect(page.locator('.gs-controls')).toBeVisible();

    await groups(page).nth(0).locator('summary').click();
    await expect(groups(page).nth(0)).toHaveAttribute('open', '');
    await groups(page).nth(4).locator('summary').click();
    await expect(groups(page).nth(4)).toHaveAttribute('open', '');
    expect(await openGroups(page)).toBe(1);

    await page.keyboard.press('Escape');
    await expect.poll(() => openGroups(page)).toBe(0);
    await expect(groups(page).nth(4).locator('summary')).toBeFocused();

    await groups(page).nth(1).locator('summary').click();
    await page.locator('h1').click();
    await expect.poll(() => openGroups(page)).toBe(0);
  });

  test('every page is two activations away, by mouse', async ({ page }) => {
    await page.goto('/model/', { waitUntil: 'load' });
    await groups(page).nth(3).locator('summary').click();
    await page
      .locator('.gs-nav a[href="/teaching/"]')
      .filter({ visible: true })
      .click();
    await expect(page).toHaveURL(/\/teaching\/$/);
    await expect(
      page.locator('.gs-nav a[aria-current="page"]')
    ).toHaveAttribute('href', '/teaching/');
  });

  test('and by keyboard', async ({ page, browserName }) => {
    await page.goto('/validation/', { waitUntil: 'load' });
    // The skip link first, then Home, then the first group.
    await page.keyboard.press(stepKey(browserName));
    await expect(page.locator('.gs-skip')).toBeFocused();
    const learn = groups(page).nth(0).locator('summary');
    await learn.focus();
    await page.keyboard.press('Enter');
    await expect(groups(page).nth(0)).toHaveAttribute('open', '');
    await page.keyboard.press(stepKey(browserName));
    const link = page.locator('.gs-nav details[open] a').first();
    await expect(link).toBeFocused();
  });

  test('the skip link goes to the content', async ({ page }) => {
    await page.goto('/model/', { waitUntil: 'load' });
    await page.locator('.gs-skip').focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#main$/);
  });

  test('a theme and a language chosen on one page hold on the next two', async ({
    page,
  }) => {
    await page.goto('/teaching/', { waitUntil: 'load' });
    await expect(page.locator('#teachDemos article').first()).toBeVisible();

    await page.locator('[data-gs-theme]').selectOption('daylight');
    await expect(page.locator('html')).toHaveAttribute(
      'data-theme',
      'daylight'
    );
    await page.locator('[data-gs-lang]').selectOption('es');
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    // The shell speaks the page's language without a reload.
    await expect(groups(page).nth(0).locator('summary .gs-es')).toBeVisible();
    await expect(groups(page).nth(0).locator('summary .gs-en')).toBeHidden();

    for (const next of ['/model/', '/validation/']) {
      await page.goto(next, { waitUntil: 'load' });
      await expect(page.locator('html')).toHaveAttribute(
        'data-theme',
        'daylight'
      );
      await expect(page.locator('[data-gs-theme]')).toHaveValue('daylight');
      // English-only pages: the choice is kept, and shown, but the page and
      // its shell stay in the language the page is written in.
      await expect(page.locator('[data-gs-lang]')).toHaveValue('es');
      await expect(groups(page).nth(0).locator('summary .gs-en')).toBeVisible();
    }

    await page.goto('/teaching/', { waitUntil: 'load' });
    await expect(page.locator('h1')).toHaveText('Enseñar con Gravitas');
    await expect(page.locator('[data-gs-theme] option:checked')).toHaveText(
      'Luz de día'
    );
  });

  test('a page whose route cannot pay for the module still navigates', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('gravitas_theme', 'deep');
      } catch {
        /* storage unavailable */
      }
    });
    await page.goto('/evaluation/', { waitUntil: 'load' });
    // The theme is applied by the head script, not the module.
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'deep');
    await expect(page.locator('.gs-controls')).toBeHidden();
    await groups(page).nth(4).locator('summary').click();
    await expect(
      page.locator('.gs-nav a[href="/model/"]').filter({ visible: true })
    ).toBeVisible();
  });

  test('on a phone it folds behind Menu, and nothing scrolls sideways', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 740 });
    await page.goto('/model/', { waitUntil: 'load' });
    const menu = page.locator('.gs-toggle');
    await expect(menu).toBeVisible();
    await expect(page.locator('.gs-nav')).toBeHidden();
    await menu.click();
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('.gs-nav')).toBeVisible();
    await groups(page).nth(2).locator('summary').click();
    await expect(
      page.locator('.gs-nav a[href="/studio/"]').filter({ visible: true })
    ).toBeVisible();
    const wide = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(wide).toBe(false);
  });
});
