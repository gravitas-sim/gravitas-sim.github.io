// =============================================================================
// Offline states: what is saved, said once (Roadmap II Prompt 57, step G)
// -----------------------------------------------------------------------------
// The shell stamps one note into every page (tools/shell.mjs); the connection
// is dropped with context.setOffline, which fires the window's offline event.
// =============================================================================

import { test, expect } from './fixtures.js';

const PAGES = [
  '/catalog/',
  '/library/',
  '/observatory/',
  '/experiments/',
  '/studio/',
  '/evaluation/',
  '/validation/',
  '/teaching/',
  '/instructors/',
];

test.describe('the offline note', () => {
  // Pictures load as they scroll into view; a real page would fail them
  // offline, which is not what is under test.
  test.beforeEach(({ page }) =>
    page.route(/\.(webp|png|jpg|svg)$/, route =>
      route.fulfill({ status: 200, contentType: 'image/webp', body: '' })
    )
  );

  for (const url of PAGES) {
    test(`${url} says what is saved, once, and goes when the connection returns`, async ({
      page,
      context,
    }) => {
      await page.goto(url, { waitUntil: 'load' });
      const box = page.locator('.gs-offline-box');
      await expect(box).toHaveCount(0);
      await context.setOffline(true);
      await expect(box).toHaveCount(1);
      await expect(box).toBeVisible();
      await expect(box).toContainText('You are offline.');
      // From the precache list: the Library is saved, the teaching page is not.
      await expect(box.locator('a[href="/library/"]')).toHaveCount(1);
      await expect(box.locator('a[href="/teaching/"]')).toHaveCount(0);
      await expect(page.locator('.gs-offline')).toHaveAttribute(
        'role',
        'status'
      );
      await context.setOffline(false);
      await expect(box).toHaveCount(0);
    });
  }

  test('Escape dismisses it, and it is not shown again until the next drop', async ({
    page,
    context,
  }) => {
    await page.goto('/library/', { waitUntil: 'load' });
    await context.setOffline(true);
    const box = page.locator('.gs-offline-box');
    await expect(box).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(box).toHaveCount(0);
    await context.setOffline(false);
    await context.setOffline(true);
    await expect(box).toHaveCount(1);
    await box.getByRole('button', { name: 'Dismiss' }).click();
    await expect(box).toHaveCount(0);
    await context.setOffline(false);
  });

  test('a page opened offline already knows, and speaks Spanish', async ({
    page,
    context,
  }) => {
    await page.goto('/library/', { waitUntil: 'load' });
    await page.evaluate(() => {
      localStorage.setItem('gravitas_locale', 'es');
      document.documentElement.lang = 'es';
    });
    await page.reload({ waitUntil: 'load' });
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await context.setOffline(true);
    const box = page.locator('.gs-offline-box');
    await expect(box).toContainText('Estás sin conexión.');
    await expect(box).toContainText('guardadas en este dispositivo');
    await expect(box.getByRole('button', { name: 'Cerrar' })).toBeVisible();
    await context.setOffline(false);
  });
});
