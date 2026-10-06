// =============================================================================
// The Library, in a browser (Roadmap II Prompt 54, LIBRARY.md)
// -----------------------------------------------------------------------------
// tests/library.test.js holds the index to its sources, its schema and its
// routes, and the filters to the lesson browser's. This is the page and the
// two ways into it:
//   - every entry is a card that links to its route, and the count says so;
//   - search and the filters narrow it, compose, live in the address and come
//     back on a reload; an empty result says what to drop;
//   - the three grouped views;
//   - a lesson's saved progress is a badge and a filter;
//   - keyboard only: from the search box to a card, and Enter opens it;
//   - Spanish, from the stored language;
//   - Home's Library cards and its "continue" strip, the shell's link, and the
//     lesson browser's link out.
// Axe runs it in e2e/accessibility.spec.js.
// =============================================================================

import { readFileSync } from 'node:fs';
import { test, expect } from './fixtures.js';

const LIBRARY = JSON.parse(readFileSync('library/library.json', 'utf8'));
const TOTAL = LIBRARY.entries.length;
const ofKind = kind => LIBRARY.entries.filter(e => e.kind === kind);

async function openLibrary(page, query = '') {
  await page.goto(`/library/${query}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', {
    timeout: 30_000,
  });
}

const cards = page => page.locator('#libResults .lib-card');

test.describe('the Library', () => {
  test('lists every entry, each a link to the page that runs it', async ({
    page,
  }) => {
    await openLibrary(page);
    await expect(cards(page)).toHaveCount(TOTAL);
    await expect(page.locator('#libCount')).toContainText(String(TOTAL));
    for (const e of [LIBRARY.entries[0], ofKind('dataset')[0]]) {
      await expect(
        page.locator(`.lib-card[data-entry="${e.id}"] a`)
      ).toHaveAttribute('href', e.route);
    }
  });

  test('the filters narrow, compose, and live in the address', async ({
    page,
  }) => {
    await openLibrary(page);
    await page.locator('#libKind').selectOption('activity');
    await expect(cards(page)).toHaveCount(ofKind('activity').length);
    await expect(page.locator('#libCount')).toContainText(
      `${ofKind('activity').length} of ${TOTAL}`
    );
    expect(new URL(page.url()).searchParams.get('kind')).toBe('activity');

    await page.locator('#libLength').selectOption('demo');
    const demo = ofKind('activity').filter(e => e.length === 'demo');
    await expect(cards(page)).toHaveCount(demo.length);

    // A reload is the same list: the address is the state.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-ready', 'true');
    await expect(cards(page)).toHaveCount(demo.length);
    await expect(page.locator('#libKind')).toHaveValue('activity');

    await page.locator('#libClear').click();
    await expect(cards(page)).toHaveCount(TOTAL);
    await expect(page.locator('#libSearch')).toBeFocused();
    expect(new URL(page.url()).search).toBe('');
  });

  test('search reads the id and folds accents; nothing found says what to drop', async ({
    page,
  }) => {
    await openLibrary(page);
    await page.locator('#libSearch').fill('hohmann');
    await expect(
      page.locator('.lib-card[data-entry="investigation:hohmann-transfer"]')
    ).toBeVisible();

    await page.locator('#libSearch').fill('');
    await page.locator('#libKind').selectOption('course');
    await page.locator('#libLength').selectOption('demo');
    await expect(cards(page)).toHaveCount(0);
    await expect(page.locator('#libEmpty')).toBeVisible();
    const relax = page.locator('#libRelax');
    await expect(relax).toBeVisible();
    await relax.click();
    await expect(cards(page)).not.toHaveCount(0);

    await page.locator('#libSearch').fill('zzqqxx');
    await expect(page.locator('#libEmptyText')).toContainText('zzqqxx');
  });

  test('by subject, by course level and by sequence', async ({ page }) => {
    await openLibrary(page, '?group=subject');
    const headings = page.locator('#libResults .lib-group h2');
    await expect(headings.first()).toHaveText(LIBRARY.subjects[0].label.en);

    await page.locator('#libGroup').selectOption('level');
    await expect(headings.first()).toHaveText('Beginner');

    await page.locator('#libGroup').selectOption('sequence');
    await expect(headings).toHaveCount(LIBRARY.sequences.length);
    const first = LIBRARY.sequences[0];
    await expect(headings.first()).toHaveText(first.title.en);
    // An order, read as one.
    const steps = page
      .locator('#libResults .lib-group')
      .first()
      .locator('ol > li');
    await expect(steps).toHaveCount(first.entries.length);
    await expect(steps.first()).toHaveAttribute('data-entry', first.entries[0]);
  });

  test("a lesson's saved progress is a badge and a filter", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'gravitas_investigation_orbital-energy',
        JSON.stringify({ schema: 2, visited: ['a', 'b'], startedAt: null })
      );
    });
    await openLibrary(page);
    const card = page.locator(
      '.lib-card[data-entry="investigation:orbital-energy"]'
    );
    await expect(card.locator('[data-progress="going"]')).toHaveText(
      'In progress'
    );
    await page.locator('#libProgress').selectOption('going');
    await expect(cards(page)).toHaveCount(1);
    await expect(cards(page).first()).toHaveAttribute(
      'data-entry',
      'investigation:orbital-energy'
    );
  });

  test('keyboard only: from the search box to a card, and Enter opens it', async ({
    page,
    browserName,
  }) => {
    await openLibrary(page, '?q=kepler%27s');
    await page.locator('#libSearch').focus();
    const step = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
    // Eight menus and the clear button, then the first card.
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press(step);
      if (
        await page.evaluate(() =>
          Boolean(document.activeElement?.closest('.lib-card'))
        )
      )
        break;
    }
    const focused = page.locator('.lib-card a:focus');
    await expect(focused).toHaveCount(1);
    const href = await focused.getAttribute('href');
    expect(href).toBe('/#investigation=keplers-laws');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#investigation=keplers-laws$/);
  });

  test('in Spanish, from the stored language', async ({ page }) => {
    await page.addInitScript(() =>
      localStorage.setItem('gravitas_locale', 'es')
    );
    await openLibrary(page);
    await expect(page.locator('h1')).toHaveText('Biblioteca');
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    const first = LIBRARY.entries[0];
    await expect(
      page.locator(`.lib-card[data-entry="${first.id}"] .lib-title`)
    ).toHaveText(first.title.es);
  });
});

test.describe('the ways into it', () => {
  test('every page links it, and the lesson browser links out to it', async ({
    page,
    app,
  }) => {
    await app.boot();
    await expect(page.locator('.gs-nav a[href="/library/"]')).toHaveCount(1);
    await expect(page.locator('#investigationBrowserLibrary')).toHaveAttribute(
      'href',
      '/library/'
    );
  });

  test('Home leads into it by kind, and continues a lesson left part-way', async ({
    page,
    app,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'gravitas_investigation_keplers-laws',
        JSON.stringify({
          schema: 2,
          visited: ['a', 'b'],
          startedAt: '2026-10-01',
        })
      );
    });
    await app.boot();
    await page.goto('/#home', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.splashScreenEnded === true);
    await expect(page.locator('#welcomeScreen')).toBeVisible();
    const kinds = page.locator('#welcomeSections a[href^="/library/?kind="]');
    await expect(kinds).toHaveCount(LIBRARY.kinds.length);

    const strip = page.locator('#welContinue');
    await expect(strip).toBeVisible();
    await strip.locator('[data-lesson="keplers-laws"]').click();
    await expect(page.locator('#welcomeScreen')).toBeHidden();
    await expect(page.locator('#investigationPanel')).toBeVisible({
      timeout: 30_000,
    });
  });
});
