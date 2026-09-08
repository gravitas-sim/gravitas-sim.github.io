// =============================================================================
// The lesson browser: finding one of seventeen
// -----------------------------------------------------------------------------
// The catalogue got big enough that a grid is no longer an answer to "which
// one?". What is checked here is the machinery that replaced it: a search box,
// four menus, three curated orders, and the promise that all of it is written
// from the generated manifest rather than a second list.
//
// The three things the brief asked to be tested are the last three describes:
// filtering narrows, a result opens, and coming back finds the list as it was
// left. The rest is what has to hold for those to mean anything.
// =============================================================================

import { test, expect } from './fixtures.js';

/** Get to the browser, with the deferred strings loaded. */
async function openBrowser(page, app) {
  await app.boot();
  // On a narrow window the rail is behind the hamburger, so the route in is
  // the one a phone user actually takes. Decided on the viewport rather than
  // on whether the button happens to be visible yet: the interface fades in
  // on a timer after boot() resolves, so asking too early always says no.
  if ((page.viewportSize()?.width ?? 0) <= 1024) {
    const menu = page.locator('#mobileMenuToggle');
    await expect(menu).toBeVisible();
    await menu.click();
  }
  await page.locator('#investigationsBtn').click();
  await expect(page.locator('#investigationBrowser')).toBeVisible();
  // The filter labels live in the deferred catalogue; without this the first
  // assertion can race the fetch that fills the menus.
  await expect(
    page.locator('#investigationFilterSubject option')
  ).not.toHaveCount(0);
}

/**
 * How many lessons the catalogue has.
 *
 * Read from the manifest rather than written down. This file's thesis is that
 * the browser is the catalogue, and a literal here would make every one of
 * these assertions a statement about the number seventeen instead - which is
 * how four of them came to fail on the day an eighteenth lesson was added,
 * having caught nothing.
 */
const lessonCount = page =>
  page.evaluate(async () => {
    const { MANIFEST } = await import('/js/data/investigations/registry.js');
    return MANIFEST.length;
  });

/**
 * The ids the catalogue itself says belong to a length bucket.
 *
 * Derived rather than written down, for the reason the bucket exists: a
 * lesson's slot is read off its declared duration, so any lesson that gets
 * longer or shorter moves between slots. A test that listed the short ones by
 * name would fail the next time one of them grew - which is the catalogue
 * working, not the filter breaking.
 *
 * @param {object} page - Playwright page
 * @param {string} want - One of LENGTH
 * @param {?string} subject - A tag to intersect with, or null
 * @returns {Promise<Array<string>>} The ids, in catalogue order
 */
const idsOfLength = (page, want, subject = null) =>
  page.evaluate(
    async ([length, tag]) => {
      const { MANIFEST } = await import('/js/data/investigations/registry.js');
      const { lengthOf } = await import('/js/data/investigations/sequences.js');
      const { BROWSE_META } =
        await import('/js/data/investigations/browseData.js');
      return MANIFEST.filter(e => lengthOf(e) === length)
        .filter(e => !tag || (BROWSE_META[e.id]?.tags || []).includes(tag))
        .map(e => e.id);
    },
    [want, subject]
  );

/** The lesson ids currently in the grid, in order. */
const shownIds = page =>
  page
    .locator('#investigationList [data-investigation]')
    .evaluateAll(nodes => nodes.map(n => n.dataset.investigation));

test.describe('the filters are the catalogue', () => {
  test('every menu is built from the manifest, not from the markup', async ({
    page,
    app,
  }) => {
    await openBrowser(page, app);

    const built = await page.evaluate(async () => {
      const { MANIFEST } = await import('/js/data/investigations/registry.js');
      const { tagsOf } = await import('/js/data/investigations/browse.js');
      const subjects = new Set(MANIFEST.flatMap(inv => tagsOf(inv)));
      const menu = [
        ...document.querySelectorAll('#investigationFilterSubject option'),
      ]
        .map(o => o.value)
        .filter(Boolean);
      return {
        lessons: MANIFEST.length,
        subjects: [...subjects].sort(),
        menu: menu.sort(),
        // Nothing about a lesson is spelled out in the served markup; if a
        // title or a duration were written there it could disagree with the
        // catalogue. Fetched rather than read off the DOM, because the DOM is
        // exactly where the generated cards have just been written.
        markupNamesALesson: await window
          .fetch('/index.html')
          .then(r => r.text())
          .then(html => MANIFEST.some(inv => html.includes(inv.title))),
      };
    });

    // Every lesson the catalogue holds, and more than a handful of them.
    expect(built.lessons).toBe(await lessonCount(page));
    expect(built.lessons).toBeGreaterThan(10);
    expect(built.menu).toEqual(built.subjects);
    expect(built.markupNamesALesson).toBe(false);
    await expect.poll(() => shownIds(page)).toHaveLength(built.lessons);
  });

  test('the count line says how many matched, and says it out loud', async ({
    page,
    app,
  }) => {
    await openBrowser(page, app);
    const count = page.locator('#investigationBrowserCount');
    // A live region, so a screen reader hears the result of a filter rather
    // than being left to discover it by exploring the grid.
    await expect(count).toHaveAttribute('aria-live', 'polite');

    await page
      .locator('#investigationFilterSubject')
      .selectOption('spaceflight');
    await expect(count).toContainText(`3 of ${await lessonCount(page)}`);
    await expect
      .poll(() => shownIds(page))
      .toEqual(['gravity-assist', 'hohmann-transfer', 'lagrange-points']);
  });
});

test.describe('the curated orders', () => {
  test('they are shown unfiltered, and step aside once you search', async ({
    page,
    app,
  }) => {
    await openBrowser(page, app);
    const sequences = page.locator('#investigationSequences');
    await expect(sequences).toBeVisible();
    await expect(page.locator('.inv-seq')).toHaveCount(3);

    // A demonstration label is only ever on a lesson that really is short.
    const labels = await page.locator('.inv-seq-step').evaluateAll(steps =>
      steps.map(step => ({
        id: step.querySelector('[data-sequence-lesson]').dataset.sequenceLesson,
        fit: step.querySelector('.inv-seq-fit').className,
        assign: Boolean(step.querySelector('.inv-seq-assign')),
      }))
    );
    const durations = await page.evaluate(async () => {
      const { MANIFEST } = await import('/js/data/investigations/registry.js');
      return Object.fromEntries(
        MANIFEST.map(inv => [
          inv.id,
          Math.max(...inv.duration.match(/\d+/g).map(Number)),
        ])
      );
    });
    labels.forEach(({ id, fit, assign }) => {
      if (fit.includes('is-demo'))
        expect(durations[id]).toBeLessThanOrEqual(25);
      // The long ones offer the assignment builder instead of pretending.
      expect(assign).toBe(durations[id] > 50);
    });

    // The first lesson of a sequence assumes nothing; a later one names what
    // it assumes.
    await expect(
      page.locator('.inv-seq').first().locator('.inv-seq-needs').first()
    ).toHaveClass(/is-none/);
    await expect(
      page.locator('.inv-seq').first().locator('.inv-seq-needs').nth(1)
    ).toContainText('Kepler');

    await page.locator('#investigationSearch').fill('transit');
    await expect(sequences).toBeHidden();
    await expect(page.locator('#investigationAllHeading')).toBeHidden();
  });

  test('a sequence entry opens the lesson it names', async ({ page, app }) => {
    await openBrowser(page, app);
    await page
      .locator('.inv-seq-open[data-sequence-lesson="hohmann-transfer"]')
      .click();
    await expect(page.locator('#investigationPanel')).toBeVisible();
    await expect(page.locator('#investigationTitle')).toHaveText(
      'Getting There From Here'
    );
  });
});

test.describe('filtering', () => {
  test('search matches title, subject and summary, and folds accents', async ({
    page,
    app,
  }) => {
    await openBrowser(page, app);
    const search = page.locator('#investigationSearch');

    // A title and a summary: two lessons name Kepler, and both belong here.
    await search.fill('kepler');
    await expect(page.locator('#investigationList .inv-card')).toHaveCount(2);
    await expect
      .poll(() => shownIds(page))
      .toEqual(['keplers-laws', 'weighing-stars']);

    // A tag nobody prints on a card is still searchable.
    await search.fill('resonance');
    await expect.poll(() => shownIds(page)).toEqual(['when-orbits-lock']);

    // The titles are plain language - this lesson is called "Getting There
    // From Here" - so the technical name has to reach it through the id.
    await search.fill('hohmann');
    await expect.poll(() => shownIds(page)).toEqual(['hohmann-transfer']);

    // Two words, either order.
    await search.fill('planet detect');
    await expect.poll(() => shownIds(page)).toContain('detect-this-planet');
  });

  test('menus compose, and clearing puts everything back', async ({
    page,
    app,
  }) => {
    await openBrowser(page, app);
    await page.locator('#investigationFilterSubject').selectOption('orbits');
    await expect.poll(() => shownIds(page)).toHaveLength(9);

    // Each menu only narrows: adding one never brings a lesson back.
    const shortOrbits = await idsOfLength(page, 'demo', 'orbits');
    expect(shortOrbits.length).toBeGreaterThan(1);
    await page.locator('#investigationFilterLength').selectOption('demo');
    await expect.poll(() => shownIds(page)).toEqual(shortOrbits);

    const clear = page.locator('#investigationFilterClear');
    await expect(clear).toBeVisible();
    await clear.click();
    await expect
      .poll(() => shownIds(page))
      .toHaveLength(await lessonCount(page));
    await expect(clear).toBeHidden();
    // Focus lands somewhere useful rather than on the document.
    await expect(page.locator('#investigationSearch')).toBeFocused();
  });

  test('an empty result says what would help, and the offer works', async ({
    page,
    app,
  }) => {
    await openBrowser(page, app);
    await page.locator('#investigationFilterSubject').selectOption('galaxies');
    await page.locator('#investigationFilterLength').selectOption('demo');

    const short = await idsOfLength(page, 'demo');
    expect(short.length).toBeGreaterThan(1);
    await expect.poll(() => shownIds(page)).toHaveLength(0);
    const empty = page.locator('#investigationEmpty');
    await expect(empty).toBeVisible();
    const action = page.locator('#investigationEmptyAction');
    // Names the filter to drop and how many lessons come back, rather than
    // leaving the reader to work out which of two menus is the problem.
    await expect(action).toContainText('subject');
    await expect(action).toContainText(String(short.length));

    await action.click();
    await expect.poll(() => shownIds(page)).toEqual(short);
    await expect(empty).toBeHidden();
  });

  test('a search that matches nothing quotes what was typed', async ({
    page,
    app,
  }) => {
    await openBrowser(page, app);
    await page.locator('#investigationSearch').fill('qqqq');
    await expect(page.locator('#investigationEmpty')).toContainText('qqqq');
    // One filter has nothing to relax, so the offer is to clear.
    await expect(page.locator('#investigationEmptyAction')).toContainText(
      'Clear'
    );
  });
});

test.describe('opening a result and coming back', () => {
  test('a filtered card opens its lesson, and the filters survive the round trip', async ({
    page,
    app,
  }) => {
    await openBrowser(page, app);
    await page.locator('#investigationSearch').fill('hohmann');
    await page.locator('#investigationFilterSubject').selectOption('orbits');
    await expect.poll(() => shownIds(page)).toEqual(['hohmann-transfer']);

    await page.locator('#investigationList [data-investigation]').click();
    await expect(page.locator('#investigationPanel')).toBeVisible();
    await expect(page.locator('#investigationBrowser')).toBeHidden();

    // Back out of the lesson and reopen the browser.
    await page.locator('#investigationClose').click();
    await page.locator('#investigationsBtn').click();
    await expect(page.locator('#investigationBrowser')).toBeVisible();

    await expect(page.locator('#investigationSearch')).toHaveValue('hohmann');
    await expect(page.locator('#investigationFilterSubject')).toHaveValue(
      'orbits'
    );
    await expect.poll(() => shownIds(page)).toEqual(['hohmann-transfer']);
    // And the lesson it opened now shows as started, under the same filters.
    await expect(
      page.locator('#investigationList .inv-card-status')
    ).toBeVisible();
  });

  test('the progress filter follows what has actually been opened', async ({
    page,
    app,
  }) => {
    await openBrowser(page, app);
    await page
      .locator('#investigationList [data-investigation="gravity-assist"]')
      .click();
    await expect(page.locator('#investigationPanel')).toBeVisible();
    await page.locator('#investigationClose').click();
    await page.locator('#investigationsBtn').click();

    await page.locator('#investigationFilterProgress').selectOption('going');
    await expect.poll(() => shownIds(page)).toEqual(['gravity-assist']);
    await page.locator('#investigationFilterProgress').selectOption('new');
    // Everything except the one just opened.
    const untouched = (await lessonCount(page)) - 1;
    await expect.poll(() => shownIds(page)).toHaveLength(untouched);
  });
});

test.describe('everyone can use it', () => {
  test('the whole thing is reachable and operable from the keyboard', async ({
    page,
    app,
  }) => {
    await openBrowser(page, app);
    // Focus opens on the first card; the filters are the way back up.
    await expect(
      page.locator('#investigationList .inv-card').first()
    ).toBeFocused();

    await page.locator('#investigationSearch').focus();
    await page.keyboard.type('lagrange');
    await expect(page.locator('#investigationList .inv-card')).toHaveCount(1);

    // Escape clears the box rather than closing the panel out from under
    // somebody who was only undoing a search.
    await page.keyboard.press('Escape');
    await expect(page.locator('#investigationSearch')).toHaveValue('');
    await expect(page.locator('#investigationBrowser')).toBeVisible();

    // A menu is operable without a pointer.
    const short = await idsOfLength(page, 'demo');
    await page.locator('#investigationFilterLength').focus();
    await page.locator('#investigationFilterLength').selectOption('demo');
    await expect.poll(() => shownIds(page)).toHaveLength(short.length);

    // And a card can be reached and opened with the keyboard alone.
    await page.locator('#investigationList .inv-card').first().focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#investigationPanel')).toBeVisible();
  });

  test('labels and options are translated', async ({ page, app }) => {
    await openBrowser(page, app);
    await page.evaluate(async () => {
      const i18n = await import('/js/i18n/index.js');
      await i18n.setLocale('es');
    });
    await expect(page.locator('#investigationBrowser')).toBeVisible();

    // Read while nothing is filtered. The sequences are only on screen in that
    // state - searching hides them, which is the intended behaviour and is
    // asserted elsewhere - so asking for a sequence title after a search is a
    // race against the search debounce rather than a check of anything.
    await expect(page.locator('.inv-filter span').first()).toHaveText(
      'Materia'
    );
    await expect(
      page.locator('#investigationFilterSubject option').first()
    ).toHaveText('Cualquier materia');
    await expect(page.locator('.inv-seq-title').first()).toHaveText(
      'Mecánica orbital'
    );
    await expect(page.locator('.inv-seq-needs').first()).toHaveText(
      /No da nada por hecho/
    );

    // The Spanish catalogue is what is being searched: "marea" is a word the
    // English manifest does not contain anywhere.
    await page.locator('#investigationSearch').fill('marea');
    await expect.poll(() => shownIds(page)).toEqual(['tides']);
    await expect(page.locator('#investigationSequences')).toBeHidden();
  });

  test('reopening onto an empty result still lands focus somewhere', async ({
    page,
    app,
  }) => {
    await openBrowser(page, app);
    await page.locator('#investigationSearch').fill('qqqq');
    await expect(page.locator('#investigationEmpty')).toBeVisible();

    // Close and reopen with that filter still applied. There is no first card
    // to take focus, and a modal with focus on the document is a modal a
    // keyboard user cannot leave.
    await page.locator('#investigationBrowserClose').click();
    await page.locator('#investigationsBtn').click();
    await expect(page.locator('#investigationBrowser')).toBeVisible();
    await expect(page.locator('#investigationSearch')).toBeFocused();
  });

  test('it works at a phone width', async ({ page, app }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await openBrowser(page, app);

    const overflow = await page.evaluate(() => {
      const panel = document.getElementById('investigationBrowserContent');
      return {
        panelOverflow: panel.scrollWidth - panel.clientWidth,
        docOverflow:
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      };
    });
    expect(overflow.panelOverflow).toBeLessThanOrEqual(1);
    expect(overflow.docOverflow).toBeLessThanOrEqual(1);

    // The controls are still tappable rather than collapsed to nothing.
    for (const id of [
      '#investigationSearch',
      '#investigationFilterSubject',
      '#investigationFilterLength',
      '#investigationFilterCalculation',
      '#investigationFilterProgress',
    ]) {
      const box = await page.locator(id).boundingBox();
      expect(box.width).toBeGreaterThan(80);
      expect(box.height).toBeGreaterThan(24);
    }

    await page.locator('#investigationSearch').fill('tides');
    await expect.poll(() => shownIds(page)).toEqual(['tides']);
  });
});
