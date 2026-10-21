// =============================================================================
// The structural navigation checks, in a browser (Prompt 161)
// -----------------------------------------------------------------------------
// tests/navigationChecks.test.js holds what the pages' markup and catalogs say;
// this holds what a browser renders: the choices above the fold at a desktop and
// a phone width against the inventory's ceilings, the Library's rendered facet
// and badge labels, and the walk from Home and the global navigation to each
// destination's first action in both languages.
//
// They are structural. They prove counts, labels and reachability; they do not
// prove that a visitor understands any of it (NAVIGATION.md says so). The
// ceilings are tools/navigation-inventory.json's. The checks the site fails by
// design run through tools/pending-acceptance.mjs: reported, not failures,
// until Prompt 166 activates them by name.
// =============================================================================

import { readFileSync } from 'node:fs';
import { test, expect } from './fixtures.js';
import { runPending } from '../tools/pending-acceptance.mjs';
import { DESTINATIONS, PLACES, WORDS } from '../tools/shell.mjs';
import { EN_LIBRARY } from '../js/i18n/en.library.js';
import { ES_LIBRARY } from '../js/i18n/es.library.js';

const inventory = JSON.parse(
  readFileSync(new URL('../tools/navigation-inventory.json', import.meta.url))
);
const library = JSON.parse(
  readFileSync(new URL('../library/library.json', import.meta.url))
);
/** The shell's own words for each destination link, by href. */
const shellWords = Object.fromEntries(
  DESTINATIONS.map(([key, href]) => [href, WORDS[key]])
);
const CATALOGS = { en: EN_LIBRARY, es: ES_LIBRARY };

const DESKTOP = { width: 1280, height: 800 };
const PHONE = { width: 390, height: 844 };

/**
 * The choices a visitor can act on inside the viewport: links, buttons, form
 * controls and disclosure summaries that are rendered, not hidden, not inert
 * and not a sliver (a visually hidden label is not a choice).
 */
const CHOICES =
  'a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="link"], [role="tab"]';
const countChoices = page =>
  page.evaluate(selector => {
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    let n = 0;
    for (const el of document.querySelectorAll(selector)) {
      if (el.closest('[inert], [hidden], [aria-hidden="true"]')) continue;
      if (el.disabled) continue;
      // A closed disclosure shows its summary and nothing else.
      let folded = false;
      for (let a = el.parentElement; a; a = a.parentElement)
        if (
          a.tagName === 'DETAILS' &&
          !a.open &&
          !(el.tagName === 'SUMMARY' && el.parentElement === a)
        )
          folded = true;
      if (folded) continue;
      const style = getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none') continue;
      const r = el.getBoundingClientRect();
      if (r.width <= 2 || r.height <= 2) continue;
      if (r.bottom <= 0 || r.top >= vh || r.right <= 0 || r.left >= vw)
        continue;
      n++;
    }
    return n;
  }, CHOICES);

const inLocale = (page, locale) =>
  page.addInitScript(l => {
    try {
      localStorage.setItem('gravitas_locale', l);
    } catch {
      /* storage unavailable: the page's own language stands */
    }
  }, locale);

const pathOf = href => href.replace(/[#?].*$/, '') || '/';

// --- The default view ---------------------------------------------------------

/**
 * The surfaces a visitor meets first, and how each is made ready. The sandbox's
 * control rail is the application, not a page of choices; its default view is
 * Prompt 167's (task-aware disclosure) and is not counted here.
 */
const VIEWS = {
  'home-first-visit': async ({ app, page }) => {
    await app.boot({ firstVisit: true });
    await expect(page.locator('#welcomeScreen')).toBeVisible();
  },
  home: async ({ app, page }) => {
    await app.boot();
    await page.evaluate(() => {
      location.hash = '#home';
    });
    await expect(page.locator('#welcomeScreen')).toBeVisible();
    await expect(page.locator('#welcomeSections')).toBeVisible();
  },
  library: async ({ page }) => {
    await page.goto('/library/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#libResults .lib-card').first()).toBeVisible();
  },
  'my-work': async ({ page }) => {
    await page.goto('/my-work/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#mwExport')).toBeVisible();
  },
  observatory: async ({ page }) => {
    await page.goto('/observatory/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#obsOpen')).toBeVisible();
  },
  teaching: async ({ page }) => {
    await page.goto('/teaching/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toBeVisible();
  },
};

test.describe('the default view: choices above the fold', () => {
  for (const [name, ready] of Object.entries(VIEWS)) {
    for (const [width, size] of [
      ['desktop', DESKTOP],
      ['phone', PHONE],
    ]) {
      test(`${name} at ${width} width stays within its ceiling`, async ({
        page,
        app,
      }) => {
        await page.setViewportSize(size);
        await ready({ page, app });
        const n = await countChoices(page);
        const ceiling = inventory.ceilings.defaultView[name]?.[width];
        expect(
          ceiling,
          `${name}/${width} has a committed ceiling`
        ).toBeGreaterThan(0);
        expect(
          n,
          `${name} shows ${n} choices at ${width} width; the ceiling is ${ceiling}. Lowering the ceiling is a prompt's work; raising it needs a register row.`
        ).toBeLessThanOrEqual(ceiling);
        test.info().annotations.push({
          type: 'choices',
          description: `${name} ${width}: ${n} of ${ceiling}`,
        });
      });
    }
  }
});

// --- The Library's kinds, rendered --------------------------------------------

test.describe('the kinds the Library exposes', () => {
  for (const locale of ['en', 'es']) {
    test(`the facet and every card's type label are the catalog's, in ${locale}`, async ({
      page,
    }) => {
      const t = CATALOGS[locale];
      await inLocale(page, locale);
      await page.goto('/library/', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('#libResults .lib-card').first()).toBeVisible();

      const options = await page
        .locator('#libKind option')
        .evaluateAll(os =>
          os.map(o => ({ value: o.value, text: o.textContent }))
        );
      const expectedKinds = library.kinds.map(k => t[`lib.kind.${k}`]);
      expect(options.map(o => o.text)).toEqual([
        t['lib.filter.kind.any'],
        ...expectedKinds,
      ]);

      const badges = await page
        .locator('#libResults .lib-card')
        .evaluateAll(cards =>
          cards.map(c => [
            c.dataset.kind,
            c.querySelector('.lib-badges .ui-badge')?.textContent,
          ])
        );
      expect(badges.length).toBe(library.entries.length);
      for (const [kind, text] of badges)
        expect(text, `a ${kind} card's type label`).toBe(
          t[`lib.badge.${kind}`]
        );

      const labels = await page
        .locator('.lib-find label.ui-field > span')
        .allTextContents();
      for (const id of [
        'lib.search',
        'lib.filter.kind',
        'lib.filter.subject',
        'lib.filter.length',
        'lib.filter.level',
      ])
        expect(labels, id).toContain(t[id]);
    });
  }

  test('what students are shown, against the model (pending until 166)', async ({
    page,
  }) => {
    await page.goto('/library/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#libResults .lib-card').first()).toBeVisible();
    const shown = await page
      .locator('#libKind option')
      .evaluateAll(os => os.map(o => o.value).filter(Boolean));
    const result = await runPending(
      'navigation.library.student-kinds-only',
      () => {
        const extra = shown.filter(k => !inventory.kinds.students.includes(k));
        if (extra.length)
          throw new Error(
            `the Library shows kinds students are not meant to see: ${extra.join(', ')}`
          );
      }
    );
    expect(['met', 'pending']).toContain(result.status);
    const placed = await runPending(
      'navigation.library.no-where-it-runs',
      async () => {
        if ((await page.locator('#libFormat').count()) > 0)
          throw new Error("the Library still offers a 'where it runs' facet");
      }
    );
    expect(['met', 'pending']).toContain(placed.status);
    const cards = await page.locator('#libResults .lib-card').count();
    const bounded = await runPending(
      'navigation.library.default-view-is-bounded',
      () => {
        const target = inventory.futureAcceptance.find(
          f => f.id === 'navigation.library.default-view-is-bounded'
        ).target;
        if (cards > target)
          throw new Error(
            `the default view renders ${cards} cards; the target is ${target}`
          );
      }
    );
    expect(['met', 'pending']).toContain(bounded.status);
  });
});

// --- The walk ----------------------------------------------------------------

test.describe('the reachability walk', () => {
  test('Home offers links that land, and the way into the sandbox', async ({
    page,
    app,
  }) => {
    await app.boot();
    await page.evaluate(() => {
      location.hash = '#home';
    });
    await expect(page.locator('#welcomeSections')).toBeVisible();
    const hrefs = await page
      .locator('#welcomeScreen a[href^="/"]')
      .evaluateAll(as => [...new Set(as.map(a => a.getAttribute('href')))]);
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      const response = await page.request.get(pathOf(href));
      expect(response.status(), `Home's link ${href}`).toBe(200);
    }
    await page.locator('#welcomeScreen [data-action="enter"]').first().click();
    await expect(page.locator('#welcomeScreen')).toBeHidden();
    await expect(page.locator('#simulationCanvas')).toBeVisible();
  });

  for (const locale of ['en', 'es']) {
    test(`the global navigation reaches every destination's first action, in ${locale}`, async ({
      page,
    }) => {
      await inLocale(page, locale);
      await page.addInitScript(() => {
        try {
          localStorage.setItem('gravitas_welcome_seen_v1', '1');
        } catch {
          /* storage unavailable */
        }
      });
      for (const destination of inventory.destinations) {
        await page.goto('/model/', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('.gs-controls')).toBeVisible();
        const link = page
          .locator(`.gs-nav a[href="${destination.first.path}"]`)
          .first();
        await link.click();
        await expect(page).toHaveURL(
          new RegExp(
            `${destination.first.path === '/' ? '/$' : destination.first.path.replace(/\//g, '\\/')}$`
          )
        );
        await expect(
          page.locator(destination.first.selector).first(),
          `${destination.id}: ${destination.first[locale]}`
        ).toBeVisible();
      }
    });
  }

  test('every global-navigation entry carries the shell words and opens its page', async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await page.addInitScript(() => {
      try {
        localStorage.setItem('gravitas_welcome_seen_v1', '1');
      } catch {
        /* storage unavailable */
      }
    });
    await page.goto('/model/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.gs-controls')).toBeVisible();
    const entries = await page.locator('.gs-nav a').evaluateAll(as =>
      as.map(a => ({
        href: a.getAttribute('href'),
        en: a.querySelector('.gs-en')?.textContent ?? a.textContent,
        es: a.querySelector('.gs-es')?.textContent ?? a.textContent,
      }))
    );
    expect(entries.length).toBe(inventory.ceilings.menu.entries);

    for (const entry of entries) {
      expect(
        [entry.en, entry.es],
        `the shell's words for ${entry.href}`
      ).toEqual(shellWords[entry.href]);
      await page.goto('/model/', { waitUntil: 'domcontentloaded' });
      const link = page.locator(`.gs-nav a[href="${entry.href}"]`).first();
      await link.click();
      if (entry.href.endsWith('.pdf')) {
        // A browser downloads a PDF rather than navigating to it.
        const response = await page.request.get(entry.href);
        expect(response.status(), entry.en).toBe(200);
        continue;
      }
      const target = entry.href.replace(/#.*$/, '');
      await expect(page, entry.en).toHaveURL(
        new RegExp(`${target === '/' ? '' : target}(#.*)?$`)
      );
      await expect(
        page.locator('h1, main, #simulationCanvas').first()
      ).toBeAttached();
    }
  });
});

// --- Places and breadcrumbs (Prompt 162) ---------------------------------------

test.describe('what used to be a menu entry', () => {
  for (const locale of ['en', 'es']) {
    test(`is a place on its destination's page, and opens, in ${locale}`, async ({
      page,
    }) => {
      test.setTimeout(240_000);
      await inLocale(page, locale);
      for (const [here, [, blocks]] of Object.entries(PLACES)) {
        if (here === '/') continue; // Home's Explore entry, walked above
        await page.goto(here, { waitUntil: 'domcontentloaded' });
        const places = page.locator('.gs-places a');
        const hrefs = blocks.flatMap(([, links]) => links.map(l => l[1]));
        await expect(places).toHaveCount(hrefs.length);
        expect(
          await places.evaluateAll(as => as.map(a => a.getAttribute('href')))
        ).toEqual(hrefs);
        // The labels are the shell's words, in the page's language.
        const words = blocks.flatMap(([, links]) =>
          links.map(l => WORDS[l[0]][locale === 'es' ? 1 : 0])
        );
        expect(
          await places.evaluateAll(as =>
            as.map(
              a =>
                [...a.querySelectorAll('span')].find(
                  s => getComputedStyle(s).display !== 'none'
                )?.textContent
            )
          )
        ).toEqual(words);
        for (const href of hrefs) {
          const response = await page.request.get(pathOf(href));
          expect(response.status(), `${here} offers ${href}`).toBe(200);
        }
      }
    });
  }

  test('a page says where it sits, and its destination is the marked one', async ({
    page,
  }) => {
    await page.goto('/experiments/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.gs-crumbs li')).toHaveCount(2);
    await expect(
      page.locator('.gs-crumbs [aria-current="page"]')
    ).toBeVisible();
    await expect(
      page.locator('.gs-nav a[data-dest="observe"]')
    ).toHaveAttribute('aria-current', 'true');
    await page.locator('.gs-crumbs a[href="/observatory/"]').click();
    await expect(page).toHaveURL(/\/observatory\/$/);
    await expect(
      page.locator('.gs-nav a[data-dest="observe"]')
    ).toHaveAttribute('aria-current', 'page');
  });

  test('Home says what Gravitas is, where to start, and the five places, and nothing else', async ({
    page,
    app,
  }) => {
    await app.boot();
    await page.evaluate(() => {
      location.hash = '#home';
    });
    await expect(page.locator('#welcomeSections')).toBeVisible();
    await expect(page.locator('#welcomeSections .wel-start li')).toHaveCount(
      inventory.firstWeek.starts.length
    );
    await expect(page.locator('#welcomeSections [data-dest]')).toHaveCount(5);
    await expect(page.locator('#welcomeSections')).not.toContainText(/\(\d+\)/);
    // The introduction is reachable on request, not forced again.
    await page.locator('#welcomeSections [data-action="orient"]').click();
    await expect(page.locator('#welOrient')).toBeVisible();
  });
});
