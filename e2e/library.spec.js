// =============================================================================
// The Library, in a browser (Roadmap II Prompt 54, LIBRARY.md; Roadmap III 163)
// -----------------------------------------------------------------------------
// tests/library.test.js holds the index to its sources, its schema and its
// routes, and the filters to the lesson browser's; tests/libraryRelations.test.js
// the relations and the search. This is the page and the ways into it:
//   - the default view answers questions (where to start, where you left off,
//     the pathways, the topics) and lists no grid; "Browse everything" lists
//     every entry, each a link to the page that runs it;
//   - four facets, a count on every option, the rest behind "More filters";
//     they compose, live in the address and come back on a reload;
//   - search names why a result matched, in both languages;
//   - a topic page and an item page, with the breadcrumb;
//   - the one resume record: written by a card, read by the Library and Home;
//   - a lesson's saved progress is a badge and a filter;
//   - keyboard only, and Spanish from the stored language;
//   - the scale test: three times the index, on the throttled profile;
//   - Home's "continue" strip, the shell's link, and the lesson browser's link.
// Axe runs it in e2e/accessibility.spec.js.
// =============================================================================

import { readFileSync } from 'node:fs';
import { test, expect } from './fixtures.js';

const LIBRARY = JSON.parse(readFileSync('library/library.json', 'utf8'));
const TOTAL = LIBRARY.entries.length;
const ofKind = kind => LIBRARY.entries.filter(e => e.kind === kind);
const INV = JSON.parse(readFileSync('tools/navigation-inventory.json', 'utf8'));

async function openLibrary(page, query = '') {
  await page.goto(`/library/${query}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', {
    timeout: 30_000,
  });
}

const cards = page => page.locator('#libResults .lib-card');
const urlParam = (page, name) => new URL(page.url()).searchParams.get(name);

test.describe('the default view', () => {
  test('answers "what should I do first" with a committed handful, and lists no grid', async ({
    page,
  }) => {
    await openLibrary(page);
    await expect(page.locator('html')).toHaveAttribute('data-view', 'start');
    const start = page.locator('#libStart .lib-start .lib-card');
    await expect(start).toHaveCount(INV.ceilings.library.startCards);
    for (const g of LIBRARY.starts)
      for (const id of g.entries)
        await expect(
          page.locator(`#libStart .lib-card[data-entry="${id}"] a`)
        ).toHaveAttribute('href', LIBRARY.entries.find(e => e.id === id).route);
    await expect(cards(page)).toHaveCount(0);
    await expect(page.locator('#libCount')).toHaveText('');
  });

  test('offers the sequences and courses as pathways and the subjects as topics, with counts', async ({
    page,
  }) => {
    await openLibrary(page);
    const sequences = LIBRARY.sequences.filter(
      s => !s.id.startsWith('observatory-')
    );
    await expect(
      page.locator('#libStart .lib-pathways a[href^="?sequence="]')
    ).toHaveCount(sequences.length);
    await expect(
      page.locator('#libStart .lib-pathways .lib-pathway-course')
    ).toHaveCount(ofKind('course').length);
    const topics = page.locator('#libStart .lib-topics li');
    await expect(topics).toHaveCount(LIBRARY.subjects.length);
    const exo = LIBRARY.subjects.find(s => s.id === 'exoplanets');
    await expect(
      page.locator('#libStart .lib-topics a[href="?topic=exoplanets"]')
    ).toHaveText(exo.label.en);
    await expect(
      page.locator(
        '#libStart .lib-topics a[href="?topic=exoplanets"] + .ui-note'
      )
    ).toHaveText(String(exo.count));
  });

  test('"what covers exoplanets": the topic, its paragraph and what is filed under it', async ({
    page,
  }) => {
    await openLibrary(page);
    await page.locator('#libStart a[href="?topic=exoplanets"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-ready', 'true');
    const topic = page.locator('#libDetail .lib-topic');
    await expect(topic.locator('h2')).toHaveText('Exoplanets');
    await expect(topic.locator('.lib-topic-blurb')).toHaveText(
      LIBRARY.subjects.find(s => s.id === 'exoplanets').blurb.en
    );
    for (const h of ['Sequences', 'Investigations', 'Datasets', 'Scenarios'])
      await expect(topic.getByRole('heading', { name: h })).toBeVisible();
    await expect(topic.locator('a[href="/teaching/alignment/"]')).toHaveCount(
      1
    );
    // The breadcrumb names the destination, the Library and the topic.
    const crumbs = page.locator('.gs-crumbs li');
    await expect(crumbs).toHaveCount(3);
    await expect(crumbs.last()).toHaveAttribute('aria-current', 'page');
    await expect(crumbs.last()).toHaveText('Exoplanets');
    await expect(page.locator('#libFind')).toBeHidden();
  });

  test('"what takes about a class period": the time facet, with the count on each option', async ({
    page,
  }) => {
    await openLibrary(page);
    const option = page.locator('#libLength option[value="period"]');
    const n = LIBRARY.entries.filter(e => e.length === 'period').length;
    await expect(option).toContainText(`(${n})`);
    await page.locator('#libLength').selectOption('period');
    await expect(page.locator('html')).toHaveAttribute('data-view', 'browse');
    await expect(cards(page)).toHaveCount(n);
  });

  test('"where was I": the item opened last is first, from the one resume record', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      if (!localStorage.getItem('gravitas_resume'))
        localStorage.setItem(
          'gravitas_resume',
          JSON.stringify({
            v: 1,
            items: [
              {
                id: 'dataset:tess-light-curve',
                route: '/observatory/?guide=exo-star',
                at: 2,
              },
              {
                id: 'investigation:keplers-laws',
                route: '/#investigation=keplers-laws',
                at: 1,
              },
            ],
          })
        );
    });
    await openLibrary(page);
    const box = page.locator('#libContinue');
    await expect(box).toBeVisible();
    const first = box.locator('#libContinueList a');
    await expect(first).toHaveText(
      `Continue: ${LIBRARY.entries.find(e => e.id === 'dataset:tess-light-curve').title.en}`
    );
    await expect(first).toHaveAttribute('href', '/observatory/?guide=exo-star');
    await expect(box.locator('h3')).toHaveText('Opened recently');
  });

  test('a damaged resume record shows nothing and breaks nothing', async ({
    page,
  }) => {
    await page.addInitScript(() =>
      localStorage.setItem(
        'gravitas_resume',
        '{"v":1,"items":[{"id":"x","route":"//evil.test/"}'
      )
    );
    await openLibrary(page);
    await expect(page.locator('#libContinue')).toBeHidden();
    await expect(page.locator('#libStart .lib-card').first()).toBeVisible();
  });
});

test.describe('browsing everything', () => {
  test('lists every entry, each a link to the page that runs it', async ({
    page,
  }) => {
    await openLibrary(page);
    await page.locator('#libBrowse').click();
    await expect(cards(page)).toHaveCount(TOTAL);
    await expect(page.locator('#libCount')).toContainText(String(TOTAL));
    expect(urlParam(page, 'browse')).toBe('1');
    for (const e of [LIBRARY.entries[0], ofKind('dataset')[0]]) {
      await expect(
        page.locator(`.lib-card[data-entry="${e.id}"] a.lib-link`)
      ).toHaveAttribute('href', e.route);
    }
    // The button now goes back.
    await page.locator('#libBrowse').click();
    await expect(page.locator('html')).toHaveAttribute('data-view', 'start');
    await expect(cards(page)).toHaveCount(0);
  });

  test('four facets by default, the rest behind More filters, and no "where it runs"', async ({
    page,
  }) => {
    await openLibrary(page, '?browse=1');
    const defaults = page.locator('#libFind select:not(#libMore select)');
    await expect(defaults).toHaveCount(INV.ceilings.library.filters);
    await expect(page.locator('#libMore select')).toHaveCount(
      INV.ceilings.library.moreFilters + 1 // and Arrange
    );
    await expect(page.locator('#libMore')).not.toHaveAttribute('open', '');
    await expect(page.locator('#libFormat')).toHaveCount(0);
  });

  test('the filters narrow, compose, and live in the address', async ({
    page,
  }) => {
    await openLibrary(page, '?browse=1');
    // An activity is an investigation to a student: the facet folds it in.
    await page.locator('#libKind').selectOption('investigation');
    const students = LIBRARY.entries.filter(
      e => LIBRARY.kindShown[e.kind] === 'investigation'
    );
    await expect(cards(page)).toHaveCount(students.length);
    await expect(page.locator('#libCount')).toContainText(
      `${students.length} of ${TOTAL}`
    );
    expect(urlParam(page, 'kind')).toBe('investigation');

    await page.locator('#libLength').selectOption('demo');
    const demo = students.filter(e => e.length === 'demo');
    await expect(cards(page)).toHaveCount(demo.length);

    // A reload is the same list: the address is the state.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-ready', 'true');
    await expect(cards(page)).toHaveCount(demo.length);
    await expect(page.locator('#libKind')).toHaveValue('investigation');

    await page.locator('#libClear').click();
    await expect(page.locator('#libSearch')).toBeFocused();
    await expect(cards(page)).toHaveCount(TOTAL);
    expect(urlParam(page, 'kind')).toBeNull();
  });

  test('the facets behind More filters narrow too: data, mathematics, depth, sequence', async ({
    page,
  }) => {
    await openLibrary(page, '?browse=1');
    await page.locator('#libMore summary').click();
    await page.locator('#libData').selectOption('authentic');
    const authentic = LIBRARY.entries.filter(e => e.data === 'authentic');
    await expect(cards(page)).toHaveCount(authentic.length);
    await page.locator('#libMathematics').selectOption('algebra');
    const algebra = authentic.filter(e => e.mathematics === 'algebra');
    await expect(cards(page)).toHaveCount(algebra.length);
    await page.locator('#libClear').click();
    await page.locator('#libSequence').selectOption('the-sky');
    const sky = LIBRARY.sequences.find(s => s.id === 'the-sky');
    await expect(cards(page)).toHaveCount(sky.entries.length);
    await page.locator('#libClear').click();
    await page.locator('#libDepth').selectOption('deeper');
    await expect(cards(page)).toHaveCount(
      LIBRARY.entries.filter(e => (e.depths ?? 0) >= 2).length
    );
  });

  test('search ranks by field and says why each result matched; nothing found says what to drop', async ({
    page,
  }) => {
    await openLibrary(page);
    await page.locator('#libSearch').fill('hohmann');
    const hit = page.locator(
      '.lib-card[data-entry="investigation:hohmann-transfer"]'
    );
    await expect(hit).toBeVisible();
    await expect(hit.locator('.lib-why')).toContainText('Matches in');
    // A word in the title outranks one only in a summary.
    await page.locator('#libSearch').fill('transit');
    await expect(
      page.locator('#libResults .lib-card .lib-why').first()
    ).toContainText('the title');
    expect(await cards(page).count()).toBeGreaterThan(3);
    // A learning objective is searched, and named as the reason.
    await page.locator('#libSearch').fill('periapsis');
    await expect(
      page
        .locator('#libResults .lib-card .lib-why', { hasText: 'objectives' })
        .first()
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

  test('search folds accents and speaks Spanish', async ({ page }) => {
    await page.addInitScript(() =>
      localStorage.setItem('gravitas_locale', 'es')
    );
    await openLibrary(page);
    await page.locator('#libSearch').fill('energia');
    await expect(cards(page).first()).toBeVisible();
    await expect(page.locator('#libResults .lib-why').first()).toContainText(
      'Coincide en'
    );
  });

  test('by subject, by course level and by sequence', async ({ page }) => {
    await openLibrary(page, '?browse=1&group=subject');
    const headings = page.locator('#libResults .lib-group h2');
    await expect(headings.first()).toHaveText(LIBRARY.subjects[0].label.en);

    await page.locator('#libMore summary').click();
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
    await openLibrary(page, '?browse=1');
    const card = page.locator(
      '.lib-card[data-entry="investigation:orbital-energy"]'
    );
    await expect(card.locator('[data-progress="going"]')).toHaveText(
      'In progress'
    );
    await page.locator('#libMore summary').click();
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
    // Four menus and two buttons, then the first card.
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press(step);
      if (
        await page.evaluate(() =>
          Boolean(document.activeElement?.closest('.lib-card'))
        )
      )
        break;
    }
    const focused = page.locator('.lib-card a.lib-link:focus');
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
    await openLibrary(page, '?browse=1');
    await expect(page.locator('h1')).toHaveText('Biblioteca');
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    const first = LIBRARY.entries[0];
    await expect(
      page.locator(`.lib-card[data-entry="${first.id}"] .lib-title`)
    ).toHaveText(first.title.es);
    await expect(page.locator('#libBrowse')).toHaveText('Volver al inicio');
  });
});

test.describe('an item, its relations and its pathway', () => {
  const kepler = LIBRARY.entries.find(
    e => e.id === 'investigation:keplers-laws'
  );

  test('the item page shows what comes before, next and with it, and the breadcrumb names the pathway', async ({
    page,
  }) => {
    await openLibrary(page, `?item=${kepler.id}&path=seq:gravity-and-orbits`);
    const item = page.locator('#libDetail .lib-item');
    await expect(item.locator('h2')).toHaveText(kepler.title.en);
    await expect(item.locator('a.ui-button')).toHaveAttribute(
      'href',
      kepler.route
    );
    await expect(
      item.locator('a[href="' + kepler.rel.teach + '"]')
    ).toHaveCount(1);
    for (const h of ['Before this', 'Next', 'Related', 'In these pathways'])
      await expect(item.getByRole('heading', { name: h })).toBeVisible();
    for (const id of kepler.rel.next)
      await expect(
        item.locator(`.lib-row[data-entry="${id}"] a.lib-link`)
      ).toHaveAttribute('href', LIBRARY.entries.find(e => e.id === id).route);
    // A sequence and a course holding the same items say which is which.
    const lines = await item.locator('.lib-group li').allTextContents();
    expect(lines.some(l => l.startsWith('Sequence: '))).toBe(true);
    expect(lines.some(l => l.startsWith('Course: '))).toBe(true);
    const crumbs = page.locator('.gs-crumbs li');
    await expect(crumbs).toHaveCount(4);
    await expect(crumbs.nth(2)).toHaveText(
      LIBRARY.sequences.find(s => s.id === 'gravity-and-orbits').title.en
    );
    await expect(crumbs.last()).toHaveText(kepler.title.en);
  });

  test('an item with nothing after it says why', async ({ page }) => {
    const alone = LIBRARY.entries.find(e => e.rel.why === 'standalone');
    await openLibrary(page, `?item=${alone.id}`);
    await expect(page.locator('#libDetail .lib-why-none')).toHaveText(
      'Nothing in the Library builds on this yet.'
    );
  });

  test('every entry has next entries or a stated reason', () => {
    for (const e of LIBRARY.entries)
      expect(
        e.rel.next.length > 0 || ['last', 'standalone'].includes(e.rel.why),
        e.id
      ).toBe(true);
  });

  test('an unknown topic or item says so', async ({ page }) => {
    await openLibrary(page, '?topic=nope');
    await expect(page.locator('#libDetail .ui-state')).toContainText(
      'no topic'
    );
    await openLibrary(page, '?item=investigation:nope');
    await expect(page.locator('#libDetail .ui-state')).toContainText('no item');
  });
});

test.describe('the one resume record', () => {
  test('a card opened from a sequence is noted with its pathway, and the next context is left', async ({
    page,
  }) => {
    await openLibrary(page, '?sequence=the-sky&group=sequence');
    const first = LIBRARY.sequences.find(s => s.id === 'the-sky').entries[0];
    // Stay on the page: the link is followed by a navigation, so read the
    // record from the click handler's write before it unloads.
    await page
      .locator(`.lib-card[data-entry="${first}"] a.lib-link`)
      .evaluate(a => {
        a.addEventListener('click', e => e.preventDefault(), { once: true });
      });
    await page.locator(`.lib-card[data-entry="${first}"] a.lib-link`).click();
    const record = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('gravitas_resume'))
    );
    expect(record.v).toBe(1);
    expect(record.items[0]).toMatchObject({
      id: first,
      path: { k: 'seq', id: 'the-sky' },
    });
    const next = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('gravitas_next_context'))
    );
    expect(next).toEqual({ k: 'seq', id: 'the-sky' });
  });

  test('a lesson writes its step into the record, and Home and the Library continue from it', async ({
    page,
    app,
  }) => {
    await app.boot();
    await page.evaluate(() => {
      location.hash = '#investigation=keplers-laws';
    });
    await expect(page.locator('#investigationPanel')).toBeVisible({
      timeout: 30_000,
    });
    await page.waitForFunction(() => {
      try {
        return JSON.parse(localStorage.getItem('gravitas_resume'))?.items?.[0]
          ?.step;
      } catch {
        return false;
      }
    });
    const record = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('gravitas_resume'))
    );
    expect(record.items[0]).toMatchObject({
      id: 'investigation:keplers-laws',
      route: '/#investigation=keplers-laws',
    });
    expect(typeof record.items[0].step).toBe('string');

    await openLibrary(page);
    await expect(page.locator('#libContinueList a')).toHaveText(
      `Continue: ${LIBRARY.entries.find(e => e.id === 'investigation:keplers-laws').title.en}`
    );
  });
});

test.describe('at three times the size', () => {
  /** The index with every entry twice more, under new ids, relations following. */
  const scaled = () => {
    const lib = JSON.parse(JSON.stringify(LIBRARY));
    const extra = [];
    for (const n of [2, 3]) {
      const rename = id => `${id}-x${n}`;
      for (const e of LIBRARY.entries) {
        const c = JSON.parse(JSON.stringify(e));
        c.id = rename(e.id);
        c.rel.pre = c.rel.pre.map(rename);
        c.rel.next = c.rel.next.map(rename);
        c.rel.related = c.rel.related.map(rename);
        c.title = { en: `${e.title.en} ${n}`, es: `${e.title.es} ${n}` };
        extra.push(c);
      }
    }
    lib.entries.push(...extra);
    return lib;
  };

  test('the default view keeps its ceiling, and a filter or a search answers inside its budget on the throttled profile', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'CPU throttling is a Chromium tool');
    const big = scaled();
    expect(big.entries.length).toBe(TOTAL * 3);
    await page.route('**/library/library.json', route =>
      route.fulfill({ json: big })
    );
    await page.setViewportSize({ width: 1280, height: 800 });
    await openLibrary(page);
    const defaultView = await page.evaluate(() => ({
      cards: document.querySelectorAll('main .lib-card').length,
      links: document.querySelectorAll('#libStart a').length,
    }));
    expect(defaultView.cards).toBe(INV.ceilings.library.startCards);
    // The topic list does not grow with the content: subjects, not entries.
    expect(defaultView.links).toBeLessThan(60);

    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const took = await page.evaluate(async () => {
      const wait = () => new Promise(r => setTimeout(r, 0));
      const timeIt = async act => {
        const t0 = performance.now();
        act();
        // The page re-renders in the change handler; the next task is after it.
        await wait();
        await wait();
        return performance.now() - t0;
      };
      const select = (id, value) => () => {
        const el = document.getElementById(id);
        el.value = value;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      const out = {};
      out.browse = await timeIt(() =>
        document.getElementById('libBrowse').click()
      );
      out.filter = await timeIt(select('libLength', 'period'));
      out.facet = await timeIt(select('libSubject', 'exoplanets'));
      return out;
    });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    test.info().annotations.push({
      type: 'interaction ms at 4x throttle, 3x index',
      description: JSON.stringify(took),
    });
    // The budget: a change answers inside three quarters of a second even at a quarter of the
    // speed, over 525 entries.
    for (const [what, ms] of Object.entries(took))
      expect(ms, `${what} took ${Math.round(ms)} ms`).toBeLessThan(750);
    // The search, the first time: loads its code and the objectives, then ranks.
    const t0 = Date.now();
    await page.locator('#libSearch').fill('transit');
    await expect(page.locator('#libResults .lib-why').first()).toBeVisible();
    expect(Date.now() - t0).toBeLessThan(3000);
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

  test('Home leads into it by the Learn destination, and continues a lesson left part-way', async ({
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
    // Learn is one of Home's five destinations and goes to the Library; Home
    // no longer lists the Library's kinds with their counts (Prompt 162).
    await expect(
      page.locator('#welcomeSections [data-dest="learn"] a[href="/library/"]')
    ).toHaveCount(1);
    await expect(
      page.locator('#welcomeSections a[href^="/library/?kind="]')
    ).toHaveCount(0);

    const strip = page.locator('#welContinue');
    await expect(strip).toBeVisible();
    await strip.locator('[data-lesson="keplers-laws"]').click();
    await expect(page.locator('#welcomeScreen')).toBeHidden();
    await expect(page.locator('#investigationPanel')).toBeVisible({
      timeout: 30_000,
    });
  });
});
