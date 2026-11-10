// =============================================================================
// The first-week mode of Home, in a browser (Roadmap III Prompt 277)
// -----------------------------------------------------------------------------
// tests/firstWeek.test.js holds the collection's fields, the record and Home's
// reader; this is the way a first week travels and what a student sees:
//   - an instructor saves items, ticks "First week" in the distribution kit
//     and makes the link; a student in another browser opens it and lands on
//     Home showing that list and nothing else but the five destinations' names;
//   - the introduction is in the first item, with its skip, and ends there;
//   - an item opens from the list, Home comes back on a plain visit with the
//     place to continue moved on, and the mode ends when the list is done;
//   - leaving the mode is one press, and Home is itself again;
//   - the collection's choice for the "More" sections reaches the lesson panel;
//   - a first-time visitor with a lesson link that names a depth gets the
//     lesson, not Home;
//   - both languages, a phone width, and the list of seven on one screen.
// Axe runs the mode in e2e/accessibility.spec.js; the structural counts are in
// e2e/navigation.spec.js.
// =============================================================================

import { readFileSync } from 'node:fs';
import { test, expect } from './fixtures.js';

const INV = JSON.parse(readFileSync('tools/navigation-inventory.json', 'utf8'));
const LIBRARY = JSON.parse(readFileSync('library/library.json', 'utf8'));
const KEY = 'gravitas_first_week';
/** What a reader sees: one language of a two-language node. */
const INNER = { useInnerText: true };
const title = id => LIBRARY.entries.find(e => e.id === id).title;

/** A first-week record as the course home leaves one, from Library entries. */
function weekOf(ids, extra = {}) {
  return {
    v: 1,
    id: 'week-one',
    t: { en: 'Week one', es: 'Semana uno' },
    ...extra,
    items: ids.map(id => {
      const e = LIBRARY.entries.find(x => x.id === id);
      const lesson = e.format === 'lesson' ? id.split(':')[1] : null;
      return {
        t: e.title,
        h: e.route,
        ...(lesson ? { l: lesson, n: e.steps } : {}),
      };
    }),
  };
}

const SEVEN = [
  'investigation:keplers-laws',
  'scenario:solar-system',
  'investigation:color-and-temperature',
  'dataset:tess-light-curve',
  'investigation:the-turning-sky',
  'investigation:tides',
  'investigation:goldilocks-question',
];

async function seed(page, record, { locale = 'en', oriented = true } = {}) {
  await page.addInitScript(
    ([k, r, l, o]) => {
      try {
        // Once: a reload must find what the page itself left.
        if (globalThis.sessionStorage.getItem('seeded')) return;
        globalThis.sessionStorage.setItem('seeded', '1');
        localStorage.setItem(k, JSON.stringify(r));
        localStorage.setItem('gravitas_locale', l);
        if (o) localStorage.setItem('gravitas_orientation_seen_v1', '1');
      } catch {
        /* the test reads what it can */
      }
    },
    [KEY, record, locale, oriented]
  );
}

const home = page => page.locator('#welcomeScreen');
const week = page => page.locator('#welWeek');
const items = page => page.locator('#welWeek .wel-week-item');
const record = page =>
  page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), KEY);

async function openHome(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(home(page)).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('#welcomeSections')).toBeAttached();
}

/** Everything a reader can act on inside Home, as rendered. */
const choices = page =>
  page.evaluate(() =>
    [
      ...document.querySelectorAll(
        '#welcomeDialog :is(a[href], button, select, input, summary)'
      ),
    ]
      .filter(n => n.getClientRects().length && !n.closest('[inert]'))
      .map(n => n.ariaLabel || n.innerText.trim().replace(/\s+/g, ' '))
  );

test.describe('the first-week mode', () => {
  test('an instructor marks a collection and a student lands on its list, and nothing else', async ({
    page,
    browser,
  }) => {
    test.setTimeout(120_000);
    // The instructor: two saved items, the kit, the tick, the link.
    for (const id of ['investigation:tides', 'scenario:solar-system']) {
      await page.goto(`/library/?item=${encodeURIComponent(id)}`, {
        waitUntil: 'domcontentloaded',
      });
      await page.locator('[data-save]').click();
      await expect(page.locator('[data-save]')).toHaveAttribute(
        'aria-pressed',
        'true'
      );
    }
    await page.goto('/teaching/kit/#collections', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.locator('[data-k="coll.week"]')).toContainText(
      'first week'
    );
    await expect(page.locator('.coll-item')).toHaveCount(2);
    await page.locator('[data-f="title.en"]').fill('Week one');
    await expect(page.locator('#coll-more')).toBeDisabled();
    await page.locator('#coll-week').check();
    await page.locator('#coll-more').selectOption('open');
    await page.locator('#coll-link-make').click();
    await expect(page.locator('#coll-link')).toHaveValue(/#c3z/);
    const url = await page.locator('#coll-link').inputValue();

    // The student, in a browser that has never been here.
    const context = await browser.newContext();
    const student = await context.newPage();
    try {
      await student.goto(url.replace(/^https?:\/\/[^/]+/, ''), {
        waitUntil: 'domcontentloaded',
      });
      await student.waitForURL(/\/#home$/, { timeout: 30_000 });
      await expect(home(student)).toBeVisible({ timeout: 30_000 });
      await expect(week(student)).toBeVisible();
      await expect(student.locator('#welWeekTitle')).toHaveText(
        'Week one',
        INNER
      );
      await expect(items(student)).toHaveCount(2);

      // A first visit: the introduction is in the first item, with its skip.
      const intro = items(student).first().locator('#welOrient');
      await expect(intro).toBeVisible();
      await expect(
        intro.getByRole('button', { name: 'Skip the introduction' })
      ).toBeVisible();
      await expect(items(student).nth(1)).toBeVisible();
      await intro.getByRole('button', { name: 'Next' }).click();
      await expect(student.locator('#srStatus')).toContainText('Five places');
      await expect(intro.locator('.wel-orient-places li')).toHaveCount(
        INV.destinations.length
      );
      for (const d of INV.destinations) {
        const row = intro.locator('.wel-orient-places li', {
          hasText: d.says.en,
        });
        await expect(row.locator('strong')).toHaveText(d.en, INNER);
        await expect(row.locator('a')).toHaveText(d.first.en, INNER);
      }
      await intro.getByRole('button', { name: 'Next' }).click();
      await intro.getByRole('button', { name: 'Start exploring' }).click();
      await expect(intro).toBeHidden();
      const start = items(student).first().locator('.wel-week-go');
      await expect(start).toBeFocused();
      await expect(start).toHaveText(/^Start:\s*Tides$/, INNER);

      // Nothing else: the list, the introduction on request, and the way out.
      expect(await choices(student)).toEqual([
        'Close and enter the sandbox',
        'Start: Tides',
        'Show the introduction',
        title('scenario:solar-system').en,
        'Leave the first week: show all of Home',
      ]);
      await expect(student.locator('.gs-nav a[data-dest]')).toHaveCount(5);
      const kept = await record(student);
      expect(kept).toMatchObject({ v: 1, mo: 'open' });
      expect(kept.items.map(i => i.l ?? null)).toEqual(['tides', null]);

      // The first item opens the lesson, with More as the collection said.
      await start.click();
      await expect(home(student)).toBeHidden();
      await expect(student.locator('#investigationPanel')).toBeVisible({
        timeout: 30_000,
      });
      await expect(student.locator('#investigationMore')).toHaveAttribute(
        'open',
        ''
      );
    } finally {
      await context.close();
    }
  });

  test('the place to continue moves on, a plain visit returns to the list, and it ends when the list is done', async ({
    page,
  }) => {
    const rec = weekOf(['scenario:solar-system', 'dataset:tess-light-curve']);
    await seed(page, rec);
    await page.addInitScript(() =>
      localStorage.setItem('gravitas_welcome_seen_v1', '1')
    );
    await openHome(page);
    await expect(items(page)).toHaveCount(2);
    await expect(items(page).first()).toHaveAttribute('aria-current', 'step');
    await expect(items(page).first().locator('.wel-week-go')).toHaveText(
      /^Start:/,
      INNER
    );

    // A scenario is on this page: Home closes and the world loads.
    await items(page).first().locator('.wel-week-go').click();
    await expect(home(page)).toBeHidden();
    expect((await record(page)).items[0].o).toBe(1);

    // A plain visit: Home again, though it was seen, with the second item next.
    await openHome(page);
    await expect(items(page).first()).toContainText('Opened');
    await expect(items(page).first()).not.toHaveAttribute('aria-current');
    const next = items(page).nth(1).locator('.wel-week-go');
    await expect(next).toHaveText(/^Continue:/, INNER);
    await expect(items(page).nth(1)).toHaveAttribute('aria-current', 'step');

    // The last item is on another page; the list is then done.
    await next.click();
    await page.waitForURL(/\/observatory\//);
    await openHome(page);
    await expect(week(page)).toBeHidden();
    await expect(page.locator('#welWeekDone')).toBeVisible();
    await expect(page.locator('#welWeekDone')).toContainText('Week one');
    await expect(page.locator('#welcomeSections .wel-start')).toBeVisible();
    expect(await record(page)).toBeNull();
    // And a plain visit after that is the sandbox, as for anyone.
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#simulationCanvas')).toBeVisible();
    await page.waitForFunction(() => window.splashScreenEnded === true);
    await expect(home(page)).toBeHidden();
  });

  test('leaving is one press, and Home is all of itself again', async ({
    page,
  }) => {
    await seed(page, weekOf(SEVEN.slice(0, 3)));
    await openHome(page);
    await expect(week(page)).toBeVisible();
    await expect(page.locator('#welcomeSections .wel-start')).toBeHidden();
    await expect(page.locator('#welcomeSections .wel-doors')).toBeHidden();
    await expect(page.locator('.wel-lede')).toBeHidden();

    await page.locator('[data-action="leave"]').click();
    await expect(week(page)).toBeHidden();
    await expect(page.locator('#welWeekLeft')).toBeVisible();
    await expect(page.locator('#srStatus')).toContainText(
      'You left the first week'
    );
    await expect(page.locator('#welcomeSections .wel-start')).toBeVisible();
    await expect(page.locator('#welcomeSections .wel-doors')).toBeVisible();
    await expect(page.locator('.wel-lede')).toBeVisible();
    expect(await record(page)).toBeNull();
    // The introduction is back where Home keeps it.
    await page.locator('.wel-foot [data-action="orient"]').click();
    await expect(page.locator('#welcomeSections > #welOrient')).toBeVisible();
  });

  test('a lesson link that names a depth is not covered by Home on a first visit', async ({
    page,
  }) => {
    await page.goto('/#investigation=keplers-laws/quantitative', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.locator('#investigationPanel')).toBeVisible({
      timeout: 30_000,
    });
    await expect(home(page)).toBeHidden();
  });

  test('a record that is not one Home can show is dropped, and Home is itself', async ({
    page,
  }) => {
    const bad = weekOf(SEVEN.slice(0, 2));
    bad.items[1].h = '//elsewhere.example/';
    await seed(page, bad);
    await openHome(page);
    await expect(week(page)).toBeHidden();
    await expect(page.locator('#welcomeSections .wel-start')).toBeVisible();
    await expect(page.locator('#welWeekDone')).toBeHidden();
    expect(await record(page)).toBeNull();
  });
});

for (const [name, size] of [
  ['desktop', { width: 1280, height: 800 }],
  ['phone', { width: 390, height: 844 }],
])
  for (const locale of ['en', 'es'])
    test(`seven items fit on one screen at ${name} width, in ${locale}, with the five names`, async ({
      page,
    }) => {
      await page.setViewportSize(size);
      await seed(page, weekOf(SEVEN), { locale });
      await openHome(page);
      await expect(items(page)).toHaveCount(INV.ceilings.home.firstWeekItems);
      for (const [n, id] of SEVEN.entries())
        await expect(items(page).nth(n)).toContainText(title(id)[locale]);
      await expect(page.locator('.wel-eyebrow:visible')).toHaveText(
        // Set in capitals by the style sheet, which innerText reports.
        locale === 'es' ? /^tu primera semana$/i : /^your first week$/i,
        INNER
      );
      // One screen: Home does not scroll, and the way out is in view.
      const fits = await home(page).evaluate(
        el => el.scrollHeight <= el.clientHeight + 1
      );
      expect(fits).toBe(true);
      await expect(page.locator('[data-action="leave"]')).toBeInViewport();
      // The five names, once: in the bar where it shows them, else in Home.
      const names = await page.evaluate(() =>
        [
          ...document.querySelectorAll(
            '.gs-nav a[data-dest], .wel-week-places a'
          ),
        ]
          .filter(n => n.getClientRects().length)
          .map(n => n.innerText.trim())
      );
      expect(names).toEqual(INV.destinations.map(d => d[locale]));
      // Every control is a finger's width where a finger is used.
      const small = await page.evaluate(
        () =>
          [...document.querySelectorAll('#welWeek :is(a, button)')]
            .filter(n => n.getClientRects().length)
            .map(n => n.getBoundingClientRect())
            .filter(r => Math.min(r.width, r.height) < 24).length
      );
      expect(small).toBe(0);
    });
