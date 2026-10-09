// =============================================================================
// The instructor path and the adoption pages (Roadmap II Prompt 76, ADOPTION.md)
// -----------------------------------------------------------------------------
// tests/adoptionPages.test.js holds the generated pages to their generator and
// the filters to the record. This is the path in a browser:
//   - Teach, to the index, through its filters, to one investigation's page,
//     to a preview as a student that reads and writes none of the progress
//     saved in the browser, and back;
//   - the filters narrow, say how many remain, and keep the address;
//   - the pages speak Spanish when the page's language is Spanish;
//   - no page scrolls sideways at a phone's width;
//   - axe, in both languages, at 375 and 1024 px, on the index and on one page
//     of each kind.
// =============================================================================

import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures.js';

const LESSON = 'keplers-laws';
const PROGRESS = JSON.stringify({
  schema: 2,
  lesson: LESSON,
  stepSid: 'where-is-the-star',
  visited: [
    'eight-minutes-of-arc',
    'what-you-are-looking-at',
    'where-is-the-star',
  ],
  responses: {},
  attempts: {},
  startedAt: '2026-10-01T10:00:00.000Z',
});

const quiet = page =>
  page.addInitScript(() => {
    localStorage.setItem('gravitas_orientation_seen_v1', '1');
    localStorage.setItem('gravitas_welcome_seen_v1', '1');
  });

test.describe('the instructor path', () => {
  test('Teach, the index, a page, a clean preview, and back', async ({
    page,
  }) => {
    await quiet(page);
    await page.addInitScript(
      ([k, v]) => {
        if (!localStorage.getItem(k)) localStorage.setItem(k, v);
      },
      [`gravitas_investigation_${LESSON}`, PROGRESS]
    );

    await page.goto('/teaching/', { waitUntil: 'domcontentloaded' });
    // The page is the eight-step path, in order.
    const steps = page.locator('.teach-path > li > a');
    await expect(steps).toHaveCount(8);
    await page
      .locator(
        '#find ~ .teach-find-links a.is-primary, #find + p + .teach-find-links a.is-primary'
      )
      .first()
      .click();
    await expect(page).toHaveURL(/\/teaching\/find\/$/);

    // Narrow to the investigation this walk is about, by what an instructor knows.
    await page.locator('#f-chapter').selectOption('3');
    await page.locator('#f-level').selectOption('intro');
    await expect(page).toHaveURL(/chapter=3/);
    const link = page.locator(
      `#adTable a[href="/teaching/investigation/${LESSON}/"]`
    );
    await expect(link).toBeVisible();
    await link.click();

    // The page: facts, a preview and the way to hand it out.
    await expect(page.locator('h1')).toContainText("Kepler's Laws");
    await expect(page.locator('.ad-facts')).toContainText(
      'OpenStax Astronomy 2e'
    );
    await expect(page.locator('a[href^="/?assign="]')).toHaveCount(1);
    const preview = page.locator('a[data-preview]');
    await expect(preview).toHaveAttribute(
      'href',
      `/?author=${LESSON}&view=student`
    );
    await preview.click();

    // The first step, not the saved one, and the saved progress untouched.
    await expect
      .poll(
        () =>
          page.evaluate(
            () =>
              document.querySelector('#investigationBody h3')?.textContent ??
              null
          ),
        { timeout: 60_000 }
      )
      .toBe('Eight minutes of arc');
    await page.keyboard.press('ArrowRight');
    expect(
      await page.evaluate(
        k => localStorage.getItem(k),
        `gravitas_investigation_${LESSON}`
      )
    ).toBe(PROGRESS);

    // And back: the page, then the index with its filters kept.
    await page.goBack();
    await expect(page.locator('h1')).toContainText("Kepler's Laws");
    await page.goBack();
    await expect(page.locator('#f-chapter')).toHaveValue('3');
    await expect(page.locator('#f-level')).toHaveValue('intro');
  });

  test('the index narrows, counts and remembers', async ({ page }) => {
    await page.goto('/teaching/find/?subject=exoplanets&data=time-series', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.locator('#f-subject')).toHaveValue('exoplanets');
    const total = await page.locator('#adTable tbody tr').count();
    const shown = await page.locator('#adTable tbody tr:not([hidden])').count();
    expect(shown).toBeGreaterThan(0);
    expect(shown).toBeLessThan(total);
    await expect(page.locator('#adCount')).toHaveText(
      `${shown} of ${total} shown`
    );
    await page.locator('#f-level').selectOption('beginner');
    await expect(page.locator('#adEmpty')).toBeVisible();
    await page.locator('#adClear').click();
    await expect(page.locator('#adTable tbody tr:not([hidden])')).toHaveCount(
      total
    );
    await expect(page.locator('#adEmpty')).toBeHidden();
    await expect(page).toHaveURL(/\/teaching\/find\/$/);
  });

  test('a guide, an activity and a lesson each have their page', async ({
    page,
  }) => {
    for (const [url, text] of [
      ['/teaching/investigation/exo-fit/', 'Fit the transit'],
      ['/teaching/activity/orbital-speed/', 'Orbital motion'],
      [`/teaching/investigation/${LESSON}/`, "Kepler's Laws"],
    ]) {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('h1')).toContainText(text);
      await expect(
        page.locator('main a[href="/teaching/find/"]').first()
      ).toBeVisible();
    }
  });

  test('the Spanish page is the one a Spanish reader sees', async ({
    page,
  }) => {
    await page.addInitScript(() =>
      localStorage.setItem('gravitas_locale', 'es')
    );
    await page.goto(`/teaching/investigation/${LESSON}/`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.locator('h1')).toContainText('Las leyes de Kepler');
    await expect(page.locator('main .gs-en').first()).toBeHidden();
    await expect(page.locator('main a[data-preview]')).toContainText(
      'Vista previa'
    );
  });
});

for (const width of [375, 1024]) {
  test.describe(`at ${width} px`, () => {
    test.use({ viewport: { width, height: 800 } });
    const pages = [
      '/teaching/',
      '/teaching/find/',
      `/teaching/investigation/${LESSON}/`,
      '/teaching/investigation/exo-dilution/',
      '/teaching/activity/star-sizes/',
    ];

    test('nothing scrolls sideways', async ({ page }) => {
      for (const url of pages) {
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        const over = await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth
        );
        expect({ url, over: Math.max(0, over) }).toEqual({ url, over: 0 });
      }
    });

    for (const lang of ['en', 'es']) {
      test(`axe finds nothing, in ${lang}`, async ({ page }) => {
        await page.addInitScript(
          l => localStorage.setItem('gravitas_locale', l),
          lang
        );
        for (const url of pages) {
          await page.goto(url, { waitUntil: 'domcontentloaded' });
          await expect(page.locator('html')).toHaveAttribute('lang', lang);
          if (url === '/teaching/')
            await expect(page.locator('#teachGlance li').first()).toBeVisible();
          const results = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
            .analyze();
          expect({
            url,
            violations: results.violations.map(
              v => `${v.id}: ${v.nodes.length}`
            ),
          }).toEqual({ url, violations: [] });
        }
      });
    }
  });
}
