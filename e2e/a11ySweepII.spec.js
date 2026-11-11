// =============================================================================
// Accessibility sweep II: structure, focus, motion, reflow, forced colors,
// target size
// -----------------------------------------------------------------------------
// Prompt 279. Sweep I (e2e/a11ySweep.spec.js) walked every surface of the
// navigation inventory by keyboard and by single presses. This one holds the
// same inventory (tools/interaction-contract.json, `inventory`) to the five
// criteria the conformance report called "partially supports":
//
//   1. Structure   Every page has one h1, no heading that skips a level, one
//                  main, and every region and navigation named; the outline is
//                  compared with tools/page-outlines.json, in both languages.
//   2. Focus       Each pattern (a dialog, a panel opening, a lesson's step
//                  change, a disclosure) puts focus somewhere that exists and
//                  gives it back.
//   3. Motion      Every page, run with reduced motion (the system setting and
//                  the reader's own override), has no running animation and no
//                  transition; tools/motion-inventory.json is read for the
//                  sources a page-load cannot show.
//   4. Reflow      Every page at 320 CSS pixels (a 1280 pixel window at 400%
//                  zoom) puts nothing beyond the viewport except inside the
//                  scroll container it owns.
//   5. Forced colors   Every control keeps an edge, every pressed, selected or
//                  current control keeps a mark that is not a color, and focus
//                  is drawn, under the system palette.
//   6. Target size Every checkbox and radio is 24 CSS pixels or more.
//
// Regenerating the outlines (they are a record, not a snapshot to refresh on a
// failure; read the diff):
//   GRAVITAS_OUTLINE_WRITE=1 npx playwright test e2e/a11ySweepII.spec.js \
//     -g "the outline" --workers=1 --project=chromium
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import { test, expect } from './fixtures.js';
import { open } from './sweepOpen.js';

const contract = JSON.parse(
  readFileSync('tools/interaction-contract.json', 'utf8')
);
const inventory = contract.inventory;
const motion = JSON.parse(readFileSync('tools/motion-inventory.json', 'utf8'));

const OUTLINES = 'tools/page-outlines.json';
const WRITE = process.env.GRAVITAS_OUTLINE_WRITE === '1';
const record = JSON.parse(readFileSync(OUTLINES, 'utf8'));

const LOCALES = [
  { id: 'en', label: 'English' },
  { id: 'es', label: 'Spanish' },
];

/** The surfaces judged: every row of the walk inventory but the exempt. */
const pages = inventory.rows.filter(r => !record.exempt[r.surface]);

// -----------------------------------------------------------------------------
// In the page
// -----------------------------------------------------------------------------

/**
 * The page's outline and what is wrong with it. Runs in the page.
 *
 * Landmarks are the ones a screen reader lists: banner and contentinfo only
 * where they belong to the page, a section or a form only when it has a name.
 * With a modal dialog open the outline is the dialog's, because the page
 * behind it is inert.
 */
function outline() {
  const hidden = el => {
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (
        cs.display === 'none' ||
        cs.visibility === 'hidden' ||
        e.hidden ||
        e.inert ||
        e.getAttribute('aria-hidden') === 'true'
      )
        return true;
    }
    return false;
  };
  const text = node =>
    [...node.childNodes]
      .map(n => {
        if (n.nodeType === 3) return n.textContent;
        if (n.nodeType !== 1 || hidden(n)) return '';
        return n.getAttribute('aria-label') || text(n);
      })
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  const nameOf = el => {
    const by = el.getAttribute('aria-labelledby');
    if (by)
      return by
        .split(/\s+/)
        .map(id => {
          const n = document.getElementById(id);
          return n && !hidden(n) ? text(n) : '';
        })
        .join(' ')
        .trim();
    return (el.getAttribute('aria-label') || '').trim();
  };

  const modal = [
    ...document.querySelectorAll(
      'dialog[open], [role="dialog"][aria-modal="true"]'
    ),
  ].find(d => !hidden(d));
  const scope = modal || document.body;
  const inScope = el => scope.contains(el) && !hidden(el);

  const problems = [];
  const headings = [
    ...scope.querySelectorAll('h1,h2,h3,h4,h5,h6,[role=heading]'),
  ]
    .filter(inScope)
    .map(h => ({
      level: Number(h.getAttribute('aria-level') || h.tagName[1]),
      text: text(h),
    }));
  const h1s = headings.filter(h => h.level === 1);
  if (!modal && h1s.length !== 1) problems.push(`${h1s.length} h1`);
  if (modal && h1s.length) problems.push('a dialog holds an h1');
  headings.forEach((h, i) => {
    if (!h.text) problems.push(`an empty h${h.level}`);
    if (i && h.level > headings[i - 1].level + 1)
      problems.push(
        `h${headings[i - 1].level} to h${h.level} (${h.text.slice(0, 30)})`
      );
  });

  const roleOf = el => {
    const explicit = el.getAttribute('role');
    if (explicit) return explicit;
    const tag = el.tagName;
    const sectioned = el.parentElement?.closest(
      'article, aside, main, nav, section'
    );
    if (tag === 'MAIN') return 'main';
    if (tag === 'NAV') return 'navigation';
    if (tag === 'ASIDE') return 'complementary';
    if (tag === 'HEADER') return sectioned ? null : 'banner';
    if (tag === 'FOOTER') return sectioned ? null : 'contentinfo';
    if (tag === 'SECTION') return nameOf(el) ? 'region' : null;
    if (tag === 'FORM') return nameOf(el) ? 'form' : null;
    return null;
  };
  const found = [];
  for (const el of scope.querySelectorAll(
    'header, footer, main, nav, aside, section, form, [role]'
  )) {
    if (!inScope(el)) continue;
    const role = roleOf(el);
    if (
      ![
        'banner',
        'contentinfo',
        'main',
        'navigation',
        'complementary',
        'region',
        'form',
        'search',
      ].includes(role)
    )
      continue;
    const name = nameOf(el);
    if (
      ['navigation', 'complementary', 'region', 'search'].includes(role) &&
      !name
    )
      problems.push(
        `an unnamed ${role} (${el.tagName.toLowerCase()}#${el.id})`
      );
    found.push({ role, name });
  }
  if (!modal && found.filter(l => l.role === 'main').length !== 1)
    problems.push('not exactly one main');
  const labelled = found
    .filter(l => ['navigation', 'search', 'form'].includes(l.role))
    .map(l => `${l.role}:${l.name}`);
  const twice = labelled.filter((n, i) => labelled.indexOf(n) !== i);
  if (twice.length) problems.push(`the same name twice: ${twice.join(', ')}`);

  // Runs of one kind collapse: a list of forty sections is "region+".
  const collapse = items =>
    items.reduce((out, item) => {
      const last = out[out.length - 1];
      if (last && (last === item || last === `${item}+`))
        out[out.length - 1] = `${item}+`;
      else out.push(item);
      return out;
    }, []);
  return {
    scope: modal ? 'dialog' : 'page',
    h1: h1s[0]?.text ?? '',
    headings: collapse(headings.map(h => String(h.level))).join(' '),
    landmarks: collapse(
      found.map(l =>
        ['navigation', 'search', 'form'].includes(l.role)
          ? `${l.role}:${l.name}`
          : l.role
      )
    ),
    problems,
  };
}

/**
 * What lies beyond a viewport this wide. Runs in the page. A box is judged
 * where a reader meets it: not inside a scroll container of its own (a table's
 * wrapper), not a canvas or an svg (a drawing keeps its size), not hidden, and
 * not a one-pixel visually hidden label.
 */
function beyond(exempt) {
  const width = document.documentElement.clientWidth;
  const out = [];
  const skipped = el =>
    exempt.some(sel => el.closest(sel)) ||
    el.closest('canvas, svg') ||
    el.tagName === 'CANVAS';
  const scrolled = el => {
    for (
      let e = el.parentElement;
      e && e !== document.body;
      e = e.parentElement
    )
      if (/(auto|scroll)/.test(getComputedStyle(e).overflowX)) return true;
    return false;
  };
  for (const el of document.body.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    if (el.closest('[hidden], [inert], [aria-hidden="true"]')) continue;
    if (Number(cs.opacity) === 0) continue;
    const r = el.getBoundingClientRect();
    if (r.width <= 1 || r.height <= 1) continue;
    if (r.right <= width + 1 && r.left >= -1) continue;
    if (skipped(el) || scrolled(el)) continue;
    out.push(
      `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${
        typeof el.className === 'string' && el.className
          ? `.${el.className.split(' ')[0]}`
          : ''
      } ${Math.round(r.left)}..${Math.round(r.right)}`
    );
  }
  return {
    width,
    boxes: out.slice(0, 8),
    count: out.length,
    scroll: document.documentElement.scrollWidth,
  };
}

/** The motion a page shows at rest. Runs in the page. */
function movingNow() {
  const animations = document
    .getAnimations()
    // A 0.01 ms transition is still "running" for the instant it takes, on a
    // slow machine a sampled one: only what lasts long enough to be seen counts.
    .filter(
      a =>
        a.playState === 'running' &&
        (a.effect?.getComputedTiming?.().duration ?? 0) > 50
    )
    .map(a => {
      const target = a.effect?.target;
      return `${a.animationName || a.transitionProperty || 'animation'} on ${
        target?.tagName?.toLowerCase() ?? '?'
      }${target?.id ? `#${target.id}` : ''}`;
    });
  const transitions = [];
  for (const el of document.body.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    if (cs.transitionProperty === 'none') continue;
    const longest = Math.max(
      ...cs.transitionDuration
        .split(',')
        .map(d => parseFloat(d) * (d.includes('ms') ? 0.001 : 1))
    );
    if (longest > 0.05)
      transitions.push(
        `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''} ${cs.transitionDuration}`
      );
  }
  return {
    animations,
    transitions: transitions.slice(0, 6),
    ntransitions: transitions.length,
    scroll: getComputedStyle(document.documentElement).scrollBehavior,
  };
}

/** Controls that lose their edge, and marks that lose their cue, under the system palette. */
function underSystemColors() {
  const shown = el => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return (
      r.width > 0 &&
      r.height > 0 &&
      cs.visibility !== 'hidden' &&
      cs.display !== 'none' &&
      !el.closest('[hidden], [inert]')
    );
  };
  const edged = el => {
    const cs = getComputedStyle(el);
    const side = s =>
      cs[`border-${s}-style`] !== 'none' &&
      parseFloat(cs[`border-${s}-width`]) > 0;
    return (
      ['top', 'right', 'bottom', 'left'].some(side) ||
      (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0)
    );
  };
  // Read as links, a disclosure or a column header, not as boxes: their text
  // is drawn in the palette's link and button colors and carries the meaning.
  const linkLike = el =>
    el.tagName === 'SUMMARY' ||
    el.type === 'file' ||
    el.classList.contains('rail-label') ||
    el.parentElement?.tagName === 'TH' ||
    /underline/.test(getComputedStyle(el).textDecorationLine);
  const label = el =>
    `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${
      typeof el.className === 'string' && el.className
        ? `.${el.className.split(' ')[0]}`
        : ''
    }`;
  const unedged = [
    ...document.querySelectorAll(
      'button, select, textarea, input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=range])'
    ),
  ]
    .filter(el => shown(el) && !linkLike(el) && !edged(el))
    .map(label);
  const unmarked = [
    ...document.querySelectorAll(
      'button, a, [role=tab], [role=option], [role=menuitem]'
    ),
  ]
    .filter(
      el =>
        shown(el) &&
        el.matches(
          "[aria-pressed='true'], [aria-selected='true'], [aria-checked='true'], [aria-current]:not([aria-current='false'])"
        ) &&
        !/underline/.test(getComputedStyle(el).textDecorationLine)
    )
    .map(label);
  return { unedged: unedged.slice(0, 8), nunedged: unedged.length, unmarked };
}

/** Checkboxes and radios under 24 CSS pixels. Runs in the page. */
function smallBoxes() {
  return [
    ...document.querySelectorAll('input[type=checkbox], input[type=radio]'),
  ]
    .filter(el => {
      const cs = getComputedStyle(el);
      return (
        cs.display !== 'none' &&
        cs.visibility !== 'hidden' &&
        !el.closest('[hidden]')
      );
    })
    .map(el => ({ el, r: el.getBoundingClientRect() }))
    .filter(({ r }) => r.width > 0 && (r.width < 23.5 || r.height < 23.5))
    .map(
      ({ el, r }) =>
        `${el.type}#${el.id} ${Math.round(r.width)}x${Math.round(r.height)}`
    );
}

// -----------------------------------------------------------------------------
// 1. Structure
// -----------------------------------------------------------------------------

/** What a write run collects: one worker, so one process holds it all. */
const written = {};

test.describe('the outline of every page', () => {
  test.setTimeout(90_000);

  for (const row of pages) {
    test(`the outline of ${row.surface} (${row.path}) is sound, the same in both languages, and the recorded one`, async ({
      page,
    }) => {
      const seen = {};
      for (const locale of LOCALES) {
        await open(page, row.path, locale.id);
        seen[locale.id] = await page.evaluate(outline);
        expect(
          seen[locale.id].problems,
          `${locale.label}: what is wrong`
        ).toEqual([]);
      }
      // Spanish has the English page's structure: the same levels and
      // landmark roles in the same order. Names differ, and only English's
      // are recorded.
      const roles = l => l.map(x => x.split(':')[0]);
      expect(seen.es.headings, 'headings, Spanish').toBe(seen.en.headings);
      expect(roles(seen.es.landmarks), 'landmarks, Spanish').toEqual(
        roles(seen.en.landmarks)
      );
      const mine = { ...seen.en };
      delete mine.problems;
      if (WRITE) written[row.surface] = { path: row.path, ...mine };
      else
        expect(
          { path: row.path, ...mine },
          `${row.surface}: the outline changed; if that is intended, regenerate tools/page-outlines.json and read the diff`
        ).toEqual(record.pages[row.surface]);
    });
  }

  test.afterAll(() => {
    if (!WRITE) return;
    const sorted = Object.fromEntries(
      Object.entries(written).sort(([a], [b]) => a.localeCompare(b))
    );
    writeFileSync(
      OUTLINES,
      `${JSON.stringify({ ...record, pages: sorted }, null, 2)}\n`
    );
  });

  test('the record names every page of the walk inventory, and only those', () => {
    expect(Object.keys(record.pages).sort()).toEqual(
      pages.map(r => r.surface).sort()
    );
    for (const surface of Object.keys(record.exempt))
      expect(
        inventory.rows.some(r => r.surface === surface),
        `${surface} is exempt and is a page of the inventory`
      ).toBe(true);
  });
});

// -----------------------------------------------------------------------------
// 2. Focus: one test per pattern
// -----------------------------------------------------------------------------

/** What has focus, in words a failure can show. */
const focused = page =>
  page.evaluate(() => {
    const a = document.activeElement;
    if (!a || a === document.body) return 'nothing (the body)';
    return `${a.tagName.toLowerCase()}${a.id ? `#${a.id}` : ''}`;
  });

test.describe('focus: each pattern puts it somewhere that exists, and gives it back', () => {
  test.setTimeout(90_000);

  test('a dialog takes focus inside it and returns it to the control that opened it (the settings)', async ({
    page,
    app,
  }) => {
    await app.boot();
    await page.focus('#settingsBtn');
    await page.keyboard.press('Enter');
    await expect
      .poll(() =>
        page.evaluate(() =>
          Boolean(
            document.activeElement?.closest(
              '#settingsPanel, dialog, [role=dialog]'
            )
          )
        )
      )
      .toBe(true);
    await page.keyboard.press('Escape');
    await expect(page.locator('#settingsBtn')).toBeFocused();
  });

  test('a browser dialog opened from the keyboard takes focus and Escape gives it back (the investigations)', async ({
    page,
    app,
  }) => {
    await app.boot();
    await page.focus('#investigationsBtn');
    await page.keyboard.press('Enter');
    await expect(page.locator('#investigationBrowser')).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() =>
          Boolean(document.activeElement?.closest('#investigationBrowser'))
        )
      )
      .toBe(true);
    await page.keyboard.press('Escape');
    await expect(page.locator('#investigationsBtn')).toBeFocused();
  });

  test('opening a lesson puts focus on its title, and a step change leaves it on a control that is still there', async ({
    page,
    app,
  }) => {
    await app.boot();
    await page.focus('#investigationsBtn');
    await page.keyboard.press('Enter');
    const card = page.locator('[data-investigation="missing-mass"]');
    await card.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#investigationPanel')).toBeVisible();
    await expect(page.locator('#investigationTitle')).toBeFocused();
    await page.focus('#investigationNext');
    await page.keyboard.press('Enter');
    await expect(page.locator('#investigationProgressText')).toContainText(
      '2 of'
    );
    expect(await focused(page), 'after Next').not.toBe('nothing (the body)');
    await expect(page.locator('#investigationNext')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#investigationProgressText')).toContainText(
      '3 of'
    );
    await expect(page.locator('#investigationNext')).toBeFocused();
  });

  test('opening an observation puts focus on its title', async ({ page }) => {
    await open(page, '/observatory/', 'en');
    await page.focus('#obsOpen');
    await page.keyboard.press('Enter');
    await expect(page.locator('#obsTitle')).toBeFocused({ timeout: 20_000 });
  });

  test('a disclosure keeps focus on its summary when it opens and closes (My work)', async ({
    page,
    browserName,
  }) => {
    await open(page, '/my-work/', 'en');
    const summary = page.locator('main summary').first();
    await summary.focus();
    expect(browserName).toBeTruthy();
    const was = await summary.evaluate(el => el.parentElement.open);
    await page.keyboard.press('Enter');
    expect(await summary.evaluate(el => el.parentElement.open)).toBe(!was);
    await expect(summary).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(summary).toBeFocused();
  });

  test('a panel of the rail opens from the keyboard and focus stays on the control that opened it (Tools)', async ({
    page,
    app,
  }) => {
    await app.boot();
    await page.focus('#railTools');
    await page.keyboard.press('Enter');
    await expect(page.locator('#railTools')).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    await expect(page.locator('#railTools')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#railTools')).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    await expect(page.locator('#railTools')).toBeFocused();
  });
});

/** Two frames on, so what a page starts at load has started and stopped. */
const settle = page =>
  page.evaluate(
    () =>
      new Promise(done =>
        window.requestAnimationFrame(() =>
          window.requestAnimationFrame(() => done())
        )
      )
  );

// -----------------------------------------------------------------------------
// 3. Reduced motion
// -----------------------------------------------------------------------------

test.describe('reduced motion: a page at rest moves nothing', () => {
  test.setTimeout(90_000);

  test('the inventory names what a page load cannot show', () => {
    // The sources that run by themselves and that the pages below cannot see
    // are the ones the inventory classes `content` (the simulations, with a
    // pause) and `gap` (named, with a proposal). Everything else is a timer, a
    // workload or one frame.
    const named = motion.js
      .filter(e => ['content', 'gap'].includes(e.treatment))
      .map(e => e.file)
      .sort();
    expect(named).toEqual([
      'js/exoplanetWidgets.js',
      'js/lab3dLab.js',
      'js/main.js',
      'js/render.js',
      'js/resonanceWidgets.js',
    ]);
  });

  for (const row of pages) {
    test(`${row.surface} (${row.path}) runs no animation and no transition with the system asking for reduced motion`, async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await open(page, row.path, 'en');
      await settle(page);
      const now = await page.evaluate(movingNow);
      expect(now.animations, 'running animations').toEqual([]);
      expect(now.transitions, 'transitions that would run').toEqual([]);
      expect(now.scroll).toBe('auto');
    });

    test(`${row.surface} (${row.path}) and the reader's own Settings, Motion choice`, async ({
      page,
    }) => {
      await page.addInitScript(() => {
        try {
          window.localStorage.setItem('gravitas_motion', 'reduce');
        } catch {
          /* storage unavailable: the page opens with its defaults */
        }
      });
      await open(page, row.path, 'en');
      await settle(page);
      const reaches = motion.override.reaches.includes(row.surface);
      // The choice reaches the application and no other page (the inventory's
      // `override`): the list is exact, so a page that learns it fails here
      // until its row is corrected.
      expect(
        await page.evaluate(() => document.documentElement.dataset.motion),
        reaches ? 'the choice is applied' : 'the choice is not read here'
      ).toBe(reaches ? 'reduce' : undefined);
      if (!reaches) return;
      const now = await page.evaluate(movingNow);
      expect(now.animations, 'running animations').toEqual([]);
      expect(now.transitions, 'transitions that would run').toEqual([]);
    });
  }
});

// -----------------------------------------------------------------------------
// 4. Zoom and reflow
// -----------------------------------------------------------------------------

test.describe('reflow: 320 CSS pixels, nothing beyond the viewport but the scroll containers a page owns', () => {
  test.setTimeout(90_000);
  // Reduced motion, so a card still sliding in is not measured on its way: the
  // layout is the same at rest, and this is the layout a reader sees.
  test.use({
    viewport: { width: 320, height: 640 },
    reducedMotion: 'reduce',
  });

  for (const row of pages) {
    for (const locale of LOCALES) {
      test(`${row.surface} (${row.path}), ${locale.label}, has no horizontal scroll at 320 px`, async ({
        page,
      }) => {
        await open(page, row.path, locale.id);
        const exempt = record.reflowExempt?.[row.surface] ?? [];
        const now = await page.evaluate(
          beyond,
          exempt.map(e => e.selector)
        );
        expect(now.boxes, `boxes past ${now.width}px`).toEqual([]);
        expect(
          now.scroll,
          'the document is no wider than the viewport'
        ).toBeLessThanOrEqual(now.width + 1);
      });
    }
  }

  test('the Observatory with an observation open is one column', async ({
    page,
  }) => {
    await open(page, '/observatory/', 'en');
    await page.evaluate(() => document.querySelector('#obsOpen').click());
    await expect(page.locator('#obsTitle')).toBeVisible({ timeout: 20_000 });
    await page.waitForLoadState('networkidle').catch(() => {});
    const now = await page.evaluate(beyond, []);
    expect(now.boxes).toEqual([]);
    expect(now.scroll).toBeLessThanOrEqual(now.width + 1);
    // One column: the panels of the observation share a left edge.
    const lefts = await page.evaluate(() =>
      [
        ...document.querySelectorAll(
          'main > section, main > details, main > div'
        ),
      ]
        .filter(el => el.getBoundingClientRect().height > 20)
        .map(el => Math.round(el.getBoundingClientRect().left))
    );
    expect(new Set(lefts).size).toBe(1);
  });

  test('a lesson open beside the sandbox is one column', async ({ page }) => {
    await open(page, '/', 'en');
    await page.evaluate(() =>
      document.querySelector('#investigationsBtn').click()
    );
    await expect(page.locator('#investigationBrowser')).toBeVisible();
    await page.evaluate(() =>
      document.querySelector('[data-investigation="missing-mass"]').click()
    );
    await expect(page.locator('#investigationPanel')).toBeVisible({
      timeout: 20_000,
    });
    await page.waitForLoadState('networkidle').catch(() => {});
    const now = await page.evaluate(beyond, ['#simulationCanvas']);
    expect(now.boxes).toEqual([]);
    // The panel is as wide as the window and stands in its own column.
    const box = await page.locator('#investigationPanel').boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(-1);
    expect(box.x + box.width).toBeLessThanOrEqual(321);
    expect(box.width).toBeGreaterThan(240);
  });
});

// -----------------------------------------------------------------------------
// 5. Forced colors
// -----------------------------------------------------------------------------

test.describe('forced colors: edges, marks and focus under the system palette', () => {
  test.setTimeout(90_000);

  for (const row of pages) {
    test(`${row.surface} (${row.path}): every control has an edge and every pressed or current control a mark that is not a color`, async ({
      page,
    }) => {
      await page.emulateMedia({ forcedColors: 'active' });
      await open(page, row.path, 'en');
      expect(
        await page.evaluate(
          () => window.matchMedia('(forced-colors: active)').matches
        )
      ).toBe(true);
      const now = await page.evaluate(underSystemColors);
      expect(now.unedged, 'controls with no edge').toEqual([]);
      expect(
        now.unmarked,
        'pressed, selected or current controls with no mark'
      ).toEqual([]);
    });
  }

  test('focus is drawn under the system palette on the first stops of a tool page and of the sandbox', async ({
    page,
  }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    for (const path of ['/library/', '/observatory/', '/']) {
      await open(page, path, 'en');
      for (let i = 0; i < 6; i++) {
        await page.keyboard.press('Tab');
        const ring = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el || el === document.body) return null;
          const cs = getComputedStyle(el);
          return {
            style: cs.outlineStyle,
            width: parseFloat(cs.outlineWidth),
            what: el.tagName.toLowerCase() + (el.id ? `#${el.id}` : ''),
          };
        });
        expect(ring, `${path}: a stop ${i + 1} has focus`).not.toBeNull();
        expect(
          [ring.what, ring.style !== 'none' && ring.width >= 1],
          `${path}: ${ring.what} draws a focus ring`
        ).toEqual([ring.what, true]);
      }
    }
  });

  test('a plot keeps its content: it is drawn in its own palette, not the system one', async ({
    page,
  }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await open(page, '/observatory/', 'en');
    await page.evaluate(() => document.querySelector('#obsOpen').click());
    await expect(page.locator('#obsTitle')).toBeVisible({ timeout: 20_000 });
    const plot = page.locator('.ow-plot').first();
    await expect(plot).toBeVisible();
    const drawn = await plot.evaluate(el => {
      const colors = new Set();
      for (const mark of el.querySelectorAll('*')) {
        const cs = getComputedStyle(mark);
        for (const c of [cs.fill, cs.stroke]) if (c !== 'none') colors.add(c);
      }
      return {
        adjust: getComputedStyle(el).forcedColorAdjust,
        colors: colors.size,
      };
    });
    expect(drawn.adjust, 'the palette does not recolor the plot').toBe('none');
    expect(drawn.colors, 'distinct colors in the drawing').toBeGreaterThan(2);
  });
});

// -----------------------------------------------------------------------------
// 6. Target size: the design system's checkbox and radio
// -----------------------------------------------------------------------------

test.describe('target size: every checkbox and radio is 24 CSS pixels or more', () => {
  test.setTimeout(90_000);

  for (const row of pages) {
    test(`${row.surface} (${row.path}) has no checkbox or radio under 24 px`, async ({
      page,
    }) => {
      await open(page, row.path, 'en');
      expect(await page.evaluate(smallBoxes)).toEqual([]);
    });
  }

  test('the lesson panel and the settings dialog, where the checklist and the choices are', async ({
    page,
    app,
  }) => {
    await app.boot();
    await page.focus('#settingsBtn');
    await page.keyboard.press('Enter');
    await expect(page.locator('#settingsBtn')).toBeVisible();
    expect(await page.evaluate(smallBoxes), 'the settings dialog').toEqual([]);
    await page.keyboard.press('Escape');
    await page.focus('#investigationsBtn');
    await page.keyboard.press('Enter');
    await page.locator('[data-investigation="missing-mass"]').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#investigationPanel')).toBeVisible();
    expect(await page.evaluate(smallBoxes), 'the lesson panel').toEqual([]);
  });
});
