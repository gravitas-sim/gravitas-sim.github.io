// =============================================================================
// The adopter's guide (Roadmap II Prompt 114, ADOPTER_GUIDE.md)
// -----------------------------------------------------------------------------
// tests/adopterGuide.test.js holds the generated page to its generator and its
// words to the facts. This is the page in a browser:
//   - every link on it resolves, on this site, to the surface it names;
//   - the first week, followed from the guide alone: choose, preview, build an
//     activity, the kit, the review page, each reached by the guide's own link;
//   - its counts are the Library's counts;
//   - the Spanish page, and no sideways scroll at a phone's width;
//   - axe, in both languages, at 375 and 1024 px.
//
// It is the check that a guide link cannot go dead. It is not the newcomer
// docs test: that needs a person who has never used Gravitas, and none has
// taken it (ADOPTER_GUIDE.md).
// =============================================================================

import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';

import { test, expect } from './fixtures.js';

const LIBRARY = JSON.parse(readFileSync('library/library.json', 'utf8'));
const GUIDE = '/teaching/guide/';

const quiet = page =>
  page.addInitScript(() => {
    localStorage.setItem('gravitas_orientation_seen_v1', '1');
    localStorage.setItem('gravitas_welcome_seen_v1', '1');
    localStorage.setItem('gravitas_locale', 'en');
  });

test.describe('the adopter’s guide', () => {
  test('every link on it resolves to the surface it names', async ({
    page,
  }) => {
    await quiet(page);
    await page.goto(GUIDE, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toContainText('Adopter');
    const hrefs = await page.$$eval('main a[href]', as =>
      [...new Set(as.map(a => a.getAttribute('href')))].filter(h => h)
    );
    const internal = hrefs.filter(h => h.startsWith('/'));
    const outside = hrefs.filter(h => /^https?:/.test(h));
    const anchors = hrefs.filter(h => h.startsWith('#'));
    // The guide names at least the surfaces of the first week and semester.
    for (const want of [
      '/teaching/find/',
      '/teaching/alignment/',
      '/library/',
      '/teaching/kit/',
      '/instructors/submissions/',
      '/studio/course/',
      '/course/',
      '/instructors/',
      '/evaluation/',
      '/validation/',
    ])
      expect(internal, want).toContain(want);
    for (const href of internal) {
      const res = await page.request.get(href);
      expect({ href, status: res.status() }).toEqual({ href, status: 200 });
      const text = await res.text();
      expect({ href, page: /<h1[\s>]/.test(text) }).toEqual({
        href,
        page: true,
      });
    }
    // Outside links go to the project's own repository and nowhere else.
    for (const href of outside)
      expect(href, href).toMatch(
        /^https:\/\/github\.com\/gravitas-sim\/gravitas-sim\.github\.io\//
      );
    // Every in-page link lands on a heading that exists.
    for (const href of anchors)
      await expect(page.locator(href), href).toHaveCount(1);
  });

  test('the first week, by the guide’s own links', async ({ page }) => {
    await quiet(page);
    await page.goto(GUIDE, { waitUntil: 'domcontentloaded' });
    const week = page.locator('#week-h + p + ol');
    await expect(week.locator('> li')).toHaveCount(6);

    // 1. Choose: the index lists investigations; open one.
    await week.locator('a[href="/teaching/find/"]').click();
    await expect(page).toHaveURL(/\/teaching\/find\/$/);
    const first = page.locator('#adTable a[href^="/teaching/investigation/"]');
    await expect(first.first()).toBeVisible();
    await first.first().click();
    await expect(page).toHaveURL(/\/teaching\/investigation\/[^/]+\/$/);
    const id = new URL(page.url()).pathname.split('/')[3];

    // 2. Preview as a student, and 3. Make an activity: both are on this page.
    await expect(page.locator('a[data-preview]')).toHaveAttribute(
      'href',
      `/?author=${id}&view=student`
    );
    await page.locator(`main a[href="/?assign=${id}"]`).first().click();
    await expect(page.locator('#assignmentBuilder')).toBeVisible({
      timeout: 30_000,
    });
    await page.locator('#assignAll').click();
    await page.locator('#assignBuild').click();
    await expect(page.locator('#assignLink')).not.toHaveValue('');

    // 4. Post the link: the builder offers the kit, which makes the handout.
    const kit = await page.locator('#assignKit').getAttribute('href');
    await page.goto(kit);
    await expect(page.locator('body[data-ready="true"]')).toBeVisible();
    await expect(page.locator('#kitQr svg')).toBeVisible();

    // 6. Review: the guide's link opens the review page.
    await page.goto(GUIDE, { waitUntil: 'domcontentloaded' });
    await week.locator('a[href="/instructors/submissions/"]').click();
    await expect(page).toHaveURL(/\/instructors\/submissions\/$/);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('its counts are the Library’s', async ({ page }) => {
    const inv = LIBRARY.entries.filter(e => e.kind === 'investigation');
    const lessons = inv.filter(e => e.format === 'lesson').length;
    const scenarios = LIBRARY.entries.filter(e => e.kind === 'scenario').length;
    await quiet(page);
    await page.goto(GUIDE, { waitUntil: 'domcontentloaded' });
    const what = await page.locator('#what-h + p').innerText();
    expect(what).toContain(`${inv.length} guided investigations`);
    expect(what).toContain(`${lessons} that run in the simulation`);
    expect(what).toContain(`${inv.length - lessons} in the Observatory`);
    expect(what).toContain(`${scenarios} ready-made scenarios`);
  });

  test('the Spanish page is the one a Spanish reader sees', async ({
    page,
  }) => {
    await page.addInitScript(() =>
      localStorage.setItem('gravitas_locale', 'es')
    );
    await page.goto(GUIDE, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.locator('h1')).toContainText('Guía de adopción');
    await expect(page.locator('main .gs-en').first()).toBeHidden();
    await expect(page.locator('#week-h')).toContainText('primera semana');
  });
});

for (const width of [375, 1024]) {
  test.describe(`the guide at ${width} px`, () => {
    test.use({ viewport: { width, height: 800 } });

    test('nothing scrolls sideways', async ({ page }) => {
      await page.goto(GUIDE, { waitUntil: 'domcontentloaded' });
      const over = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth
      );
      expect(Math.max(0, over)).toBe(0);
    });

    for (const lang of ['en', 'es']) {
      test(`axe finds nothing, in ${lang}`, async ({ page }) => {
        await page.addInitScript(
          l => localStorage.setItem('gravitas_locale', l),
          lang
        );
        await page.goto(GUIDE, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('html')).toHaveAttribute('lang', lang);
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze();
        expect(
          results.violations.map(v => `${v.id}: ${v.nodes.length}`)
        ).toEqual([]);
      });
    }
  });
}
