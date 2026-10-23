// =============================================================================
// Preview parity (Prompt 175)
// -----------------------------------------------------------------------------
// Every format the Library lists opens at its preview address with a visible
// banner, and after the page has loaded and a student's first moves have been
// made, none of the student's record is in this browser's storage: not the
// progress of a lesson or a guide, not a notebook entry, not a resume note.
// tests/previewParity.test.js holds the guard to the storage module's key table
// and the address of every entry; this is the browser seeing it hold.
// =============================================================================

import { readFileSync } from 'node:fs';
import { test, expect } from './fixtures.js';
import AxeBuilder from '@axe-core/playwright';
import { previewRoute } from '../js/library/format.js';
import { RECORD_KEYS } from '../js/storage/local.js';

const library = JSON.parse(readFileSync('library/library.json', 'utf8'));

/** One entry of each kind and format: the preview matrix. */
const matrix = [];
const seen = new Set();
for (const entry of library.entries) {
  const key = `${entry.kind}/${entry.format}`;
  if (seen.has(key)) continue;
  seen.add(key);
  matrix.push(entry);
}

/** What a student's first moves are on each kind, where there are any. */
const MOVES = {
  lesson: ['#investigationNext', '#investigationNext'],
  demonstration: ['#investigationNext'],
  route: ['#investigationNext'],
  guided: ['#investigationNext'],
  lab: ['#investigationNext'],
  observatory: ['#gdStart', '#gdNext'],
  lab3d: ['#l3-guide-next'],
};

test.describe('the preview matrix', () => {
  test('the matrix covers every kind and format the Library lists', () => {
    expect(matrix.length).toBe(15);
    expect(new Set(matrix.map(e => e.kind))).toEqual(new Set(library.kinds));
  });

  for (const entry of matrix) {
    test(`${entry.kind}/${entry.format}: a banner, and no record kept`, async ({
      page,
    }) => {
      // The reader's own choices are not the record: a language chosen.
      await page.addInitScript(() => {
        try {
          localStorage.setItem('gravitas_locale', 'en');
        } catch {
          /* no storage */
        }
      });
      await page.goto(previewRoute(entry));
      const banner = page.locator('#previewBanner');
      await expect(banner).toBeVisible({ timeout: 30_000 });
      await expect(banner).toHaveAttribute('role', 'status');
      await expect(banner).toContainText('nothing here is saved');

      for (const selector of MOVES[entry.format] || []) {
        const control = page.locator(selector).first();
        if ((await control.isVisible()) && (await control.isEnabled()))
          await control.click();
      }
      await page.waitForLoadState('networkidle');

      const kept = await page.evaluate(() => Object.keys(localStorage));
      const record = kept.filter(k => RECORD_KEYS.some(p => k.startsWith(p)));
      expect(record).toEqual([]);
    });
  }

  test('the mission guide moves on without keeping anything', async ({
    page,
  }) => {
    await page.goto(previewRoute(matrix.find(e => e.format === 'mission')));
    await expect(page.locator('#previewBanner')).toBeVisible({
      timeout: 30_000,
    });
    await page
      .getByRole('button', { name: 'Next', exact: true })
      .first()
      .click();
    const kept = await page.evaluate(() => Object.keys(localStorage));
    expect(kept.filter(k => RECORD_KEYS.some(p => k.startsWith(p)))).toEqual(
      []
    );
  });

  test('without the preview the same page does keep its record', async ({
    page,
  }) => {
    const guide = matrix.find(e => e.format === 'observatory');
    await page.goto(guide.route);
    await page.locator('#gdStart').click();
    await expect(page.locator('#previewBanner')).toHaveCount(0);
    const kept = await page.evaluate(() => Object.keys(localStorage));
    expect(kept.some(k => k.startsWith('gravitas_guides'))).toBe(true);
  });

  test('the banner is in Spanish for a reader in Spanish', async ({ page }) => {
    await page.addInitScript(() =>
      localStorage.setItem('gravitas_locale', 'es')
    );
    await page.goto(previewRoute(matrix.find(e => e.kind === 'course')));
    await expect(page.locator('#previewBanner')).toContainText(
      'nada de esto se guarda',
      { timeout: 30_000 }
    );
  });

  test('a preview link is on the Library item page, and opens the preview', async ({
    page,
  }) => {
    await page.goto('/library/?item=course:intro-astronomy');
    const link = page.locator('a[data-preview]');
    await expect(link).toHaveAttribute(
      'href',
      '/course/?course=intro-astronomy&preview=student'
    );
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 800 });
      const box = await link.boundingBox();
      expect([width, box.height >= 24, box.width >= 24]).toEqual([
        width,
        true,
        true,
      ]);
    }
    await link.click();
    await expect(page.locator('#previewBanner')).toBeVisible();
  });
});

// The banner at the two widths, in both languages and the two themes the
// accessibility suite holds every page to: no axe finding, and it fits.
for (const [width, language, theme] of [
  [1280, 'en', 'midnight'],
  [1280, 'es', 'daylight'],
  [390, 'en', 'daylight'],
  [390, 'es', 'midnight'],
]) {
  test(`the banner at ${width} px: ${language}, ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.addInitScript(
      ([l, t]) => {
        localStorage.setItem('gravitas_locale', l);
        localStorage.setItem('gravitas_theme', t);
      },
      [language, theme]
    );
    await page.goto(previewRoute(matrix.find(e => e.kind === 'course')));
    const banner = page.locator('#previewBanner');
    await expect(banner).toBeVisible({ timeout: 30_000 });
    const box = await banner.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth
      )
    ).toBe(true);
    await page.evaluate(() =>
      Promise.all(
        document
          .getAnimations()
          .filter(a => a.effect?.getTiming?.().iterations !== Infinity)
          .map(a => a.finished.catch(() => {}))
      )
    );
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(
      violations.map(v => [
        v.id,
        v.nodes.slice(0, 3).map(n => n.target.join(' ')),
      ])
    ).toEqual([]);
  });
}
