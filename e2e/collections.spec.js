// =============================================================================
// Collections and saved items, in a browser (Roadmap III Prompt 164)
// -----------------------------------------------------------------------------
// tests/collections.test.js holds the profile and the record, tests/
// libraryCollections.test.js the starts, tests/instructorCollections.test.js the
// editor; this is the pages and the way a collection travels:
//   - the Library's start view is drawn from the starts' collections and looks
//     as it did (the same cards, in the same order);
//   - a Save button on an item page, "Your collections" on the start page, a
//     Remove button, and it all survives a reload;
//   - no Save button where a collection cannot hold the entry;
//   - an instructor saves two things, makes the link in the distribution kit,
//     and a student in another browser opens it, keeps it, and finds it in the
//     Library and in My work; nothing is kept before the button is pressed;
//   - every new control is at least 24 px in both languages and both themes,
//     at a desktop and at a phone width.
// Axe runs the new surfaces in e2e/accessibility.spec.js.
// =============================================================================

import { readFileSync } from 'node:fs';
import { test, expect } from './fixtures.js';

const LIBRARY = JSON.parse(readFileSync('library/library.json', 'utf8'));
const INV = JSON.parse(readFileSync('tools/navigation-inventory.json', 'utf8'));
const KEY = 'gravitas_collections';

async function openLibrary(page, query = '') {
  await page.goto(`/library/${query}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', {
    timeout: 30_000,
  });
}

const record = page =>
  page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), KEY);

/** Save entries through the item page, as a student does. */
async function saveThrough(page, ids) {
  for (const id of ids) {
    await openLibrary(page, `?item=${encodeURIComponent(id)}`);
    const button = page.locator('[data-save]');
    await expect(button).toBeVisible();
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
  }
}

async function prefer(page, locale, theme) {
  await page.addInitScript(
    ([l, t]) => {
      try {
        localStorage.setItem('gravitas_locale', l);
        localStorage.setItem('gravitas_theme', t);
      } catch {
        /* the test measures what it can */
      }
    },
    [locale, theme]
  );
}

test.describe('the starts are collections', () => {
  test('the start view draws them as it always did', async ({ page }) => {
    await openLibrary(page);
    const withCollection = LIBRARY.starts.filter(s => s.collection);
    expect(withCollection.map(s => s.id)).toEqual(['new', 'course']);
    const start = page.locator('#libStart .lib-start .lib-card');
    await expect(start).toHaveCount(INV.ceilings.library.startCards);
    for (const g of LIBRARY.starts) {
      const group = page.locator('#libStart .lib-start-group', {
        has: page.locator(`h3:text-is("${g.audience.en}")`),
      });
      await expect(group.locator('.lib-card')).toHaveCount(g.entries.length);
      for (const id of g.entries)
        await expect(
          group.locator(`.lib-card[data-entry="${id}"]`)
        ).toHaveCount(1);
    }
    await expect(page.locator('#libCollections')).toBeHidden();
  });
});

test.describe('saved items', () => {
  test('saves from an item page, shows on the start page, removes, and survives a reload', async ({
    page,
  }) => {
    await openLibrary(page, `?item=investigation:keplers-laws`);
    const button = page.locator('[data-save]');
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.lib-save-note')).toHaveText(
      'Saved to your collection.'
    );
    expect((await record(page)).saved.units[0].items[0]).toMatchObject({
      kind: 'lesson',
      lesson: 'keplers-laws',
    });

    await page.reload();
    await expect(page.locator('[data-save]')).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    await openLibrary(page);
    const block = page.locator('#libCollections');
    await expect(block).toBeVisible();
    await expect(block.locator('h3')).toHaveText('Saved items');
    await expect(
      block.locator('a.lib-link[data-entry="investigation:keplers-laws"]')
    ).toHaveCount(1);

    await block.locator('[data-remove]').click();
    await expect(block).toBeHidden();
    expect((await record(page)).saved).toBeUndefined();
  });

  test('is in Spanish when the language is', async ({ page }) => {
    await prefer(page, 'es', 'midnight');
    await openLibrary(page, `?item=investigation:keplers-laws`);
    await page.locator('[data-save]').click();
    await expect(page.locator('.lib-save-note')).toHaveText(
      'Guardado en tu colección.'
    );
    await openLibrary(page);
    await expect(page.locator('#libCollections h2')).toHaveText(
      'Tus colecciones'
    );
    await expect(page.locator('#libCollections h3')).toHaveText(
      'Elementos guardados'
    );
  });

  test('has no Save button where a collection cannot hold the entry', async ({
    page,
  }) => {
    for (const id of ['course:intro-astronomy', 'investigation:exo-star']) {
      await openLibrary(page, `?item=${encodeURIComponent(id)}`);
      await expect(page.locator('.lib-item')).toBeVisible();
      await expect(page.locator('[data-save]')).toHaveCount(0);
    }
  });

  test('is refused at thirty, and says so', async ({ page }) => {
    const lessons = LIBRARY.entries.filter(e => e.format === 'lesson');
    await openLibrary(page, `?item=${encodeURIComponent(lessons[30].id)}`);
    await page.evaluate(
      ([k, ids]) => {
        const items = ids.map(id => ({
          id: `lesson-${id}`,
          kind: 'lesson',
          lesson: id,
        }));
        localStorage.setItem(
          k,
          JSON.stringify({
            v: 1,
            saved: {
              format: 'gravitas.course-pack',
              formatVersion: 2,
              id: 'saved-items',
              version: '1.0.0',
              gravitas: '1.0.0',
              locales: ['en'],
              pinning: 'compatible',
              profile: 'collection',
              title: { en: 'Saved items' },
              units: [{ id: 'saved', title: { en: 'Saved' }, items }],
            },
            received: [],
          })
        );
      },
      [KEY, lessons.slice(0, 30).map(e => e.id.split(':')[1])]
    );
    await page.reload();
    await expect(page.locator('[data-save]')).toBeVisible();
    await page.locator('[data-save]').click();
    await expect(page.locator('.lib-save-note')).toHaveText(
      'Your collection is full: 30 items.'
    );
  });
});

test.describe('a collection travels by link', () => {
  test('an instructor makes it in the kit; a student keeps it and finds it', async ({
    page,
    browser,
  }, testInfo) => {
    testInfo.setTimeout(120_000);
    await saveThrough(page, ['investigation:tides', 'scenario:solar-system']);

    await page.goto('/teaching/kit/#collections', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.locator('#kitCollections .coll-item')).toHaveCount(2);
    await page.locator('[data-f="title.en"]').fill('Tides, then the system');
    await page.locator('#coll-note-en-0').fill('Start here.');
    await page.locator('#coll-link-make').click();
    const link = page.locator('#coll-link');
    await expect(link).toHaveValue(/\/course\/#c2z/);
    const url = await link.inputValue();

    // The student: a fresh browser, no storage of the instructor's.
    const baseURL = testInfo.project.use.baseURL;
    const context = await browser.newContext({ baseURL });
    const student = await context.newPage();
    try {
      await student.goto(url.replace(/^https?:\/\/[^/]+/, ''), {
        waitUntil: 'domcontentloaded',
      });
      await expect(student.locator('#ch-title')).toHaveText(
        'Tides, then the system'
      );
      await expect(student.locator('.ch-actions a')).toHaveCount(2, {
        timeout: 20_000,
      });
      // Nothing is kept until the button is pressed.
      expect(
        await student.evaluate(k => localStorage.getItem(k), KEY)
      ).toBeNull();
      const keep = student.locator('#ch-keep button');
      await expect(keep).toBeVisible();
      await keep.click();
      await expect(keep).toHaveAttribute('aria-pressed', 'true');
      await expect(student.locator('.ch-keep-note')).toContainText('Kept');
      expect(
        (await student.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY))
          .received[0].pack.id
      ).toBe('tides-then-the-system');

      await openLibrary(student);
      const block = student.locator('#libCollections');
      await expect(block.locator('h3')).toHaveText('Tides, then the system');
      await expect(
        block.locator('a.lib-link[data-entry="investigation:tides"]')
      ).toHaveCount(1);
      await expect(
        block.locator('a.lib-link[data-entry="scenario:solar-system"]')
      ).toHaveCount(1);

      await student.goto('/my-work/', { waitUntil: 'domcontentloaded' });
      await expect(
        student.locator('#mwCourses', { hasText: 'Tides, then the system' })
      ).toBeVisible();

      // Let go of it from the Library.
      await openLibrary(student);
      await student.locator('[data-drop]').click();
      await expect(block).toBeHidden();
    } finally {
      await context.close();
    }
  });

  test('a collection file opens in the kit as a course does', async ({
    page,
  }) => {
    await saveThrough(page, ['investigation:tides']);
    await page.goto('/teaching/kit/#collections', {
      waitUntil: 'domcontentloaded',
    });
    await page.locator('[data-f="title.en"]').fill('Just tides');
    const download = page.waitForEvent('download');
    await page.locator('#coll-file').click();
    const file = await download;
    expect(file.suggestedFilename()).toBe('just-tides.collection.json');
    const text = readFileSync(await file.path(), 'utf8');
    const pack = JSON.parse(text);
    expect(pack).toMatchObject({
      format: 'gravitas.course-pack',
      formatVersion: 2,
      profile: 'collection',
    });
  });
});

const COMBOS = [];
for (const locale of ['en', 'es'])
  for (const theme of ['midnight', 'daylight'])
    for (const [width, height] of [
      [1280, 800],
      [390, 844],
    ])
      COMBOS.push({ locale, theme, width, height });

test.describe('every new control is at least 24 px', () => {
  for (const c of COMBOS) {
    test(`${c.locale}, ${c.theme}, ${c.width} px`, async ({
      page,
    }, testInfo) => {
      testInfo.setTimeout(120_000);
      await page.setViewportSize({ width: c.width, height: c.height });
      await prefer(page, c.locale, c.theme);
      const small = async (selector, what) => {
        const boxes = await page.locator(selector).evaluateAll(nodes =>
          nodes
            .filter(n => n.getClientRects().length)
            .map(n => {
              const r = n.getBoundingClientRect();
              return { w: Math.round(r.width), h: Math.round(r.height) };
            })
        );
        expect(boxes.length, `${what}: none found`).toBeGreaterThan(0);
        for (const b of boxes)
          expect(
            Math.min(b.w, b.h),
            `${what} is ${b.w} by ${b.h}`
          ).toBeGreaterThanOrEqual(24);
      };

      await saveThrough(page, ['investigation:tides', 'scenario:solar-system']);
      await openLibrary(page, '?item=investigation:tides');
      await small('[data-save]', 'the Save button');

      // A kept collection, for the drop button and the course home.
      await page.evaluate(
        ([k, lib]) => {
          const have = JSON.parse(localStorage.getItem(k));
          have.received = [
            { at: 1, pack: lib.starts.find(s => s.collection).collection },
          ];
          localStorage.setItem(k, JSON.stringify(have));
        },
        [KEY, LIBRARY]
      );
      await openLibrary(page);
      await small('#libCollections [data-remove]', 'a Remove button');
      await small('#libCollections [data-drop]', 'the Stop keeping button');
      await small('#libCollections a', 'a link in Your collections');

      await page.goto('/teaching/', { waitUntil: 'domcontentloaded' });
      await small('a[href="/teaching/kit/#collections"]', "Teach's link");

      await page.goto('/teaching/kit/#collections', {
        waitUntil: 'domcontentloaded',
      });
      await expect(page.locator('.coll-item')).toHaveCount(2);
      await small('#kitCollOpen', "the kit's button");
      await small('#kitCollections button', "the editor's buttons");
      await small('#kitCollections input', "the editor's fields");
      await small('#kitCollections textarea', "the editor's notes");
      await small('#kitCollections select', "the editor's depth");

      await page.locator('[data-f="title.en"]').fill('Two things');
      await page.locator('#coll-link-make').click();
      await expect(page.locator('#coll-link')).toHaveValue(/#c2z/);
      const url = await page.locator('#coll-link').inputValue();
      await page.goto(url.replace(/^https?:\/\/[^/]+/, ''), {
        waitUntil: 'domcontentloaded',
      });
      await expect(page.locator('#ch-keep button')).toBeVisible({
        timeout: 20_000,
      });
      await small('#ch-keep button', 'the Keep button');
    });
  }
});
