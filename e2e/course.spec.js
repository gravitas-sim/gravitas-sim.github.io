// =============================================================================
// Course packs in a browser: the course home and the course-pack builder
// -----------------------------------------------------------------------------
// tests/coursePack.test.js holds the format, the review, the links and the
// manifest. This is the two pages, against the sources and dist/:
//   - the course Gravitas ships opens on the course home, with its units,
//     time, objectives and a link on every item; the paths filter it, the
//     instructors' notes show on request, and it reads in Spanish;
//   - its assignment link opens the assignment in Gravitas, and its dataset
//     link opens the observation in the Observatory;
//   - a course link opens the course, and a damaged link, a hostile file and
//     a file that is not a course are refused, saying so;
//   - with the service worker installed, a course opens with no network;
//   - the builder opens the example with nothing to fix and every lesson as
//     pinned; a bad value is explained on its field and blocks saving;
//     choosing a step brings the steps it needs and re-issues the
//     assignment; a changed lesson waits for review and the upgrade re-pins
//     it; a catalog course migrates; the pack and the manifest save; a file
//     with the id of a different draft asks first;
//   - both pages pass axe in both languages and fit a phone.
// =============================================================================

import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures.js';
import { INTRO_ASTRONOMY } from '../js/data/courses/intro-astronomy.js';

const DIST = process.env.GRAVITAS_E2E_TARGET === 'dist';
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'];
const ITEMS = INTRO_ASTRONOMY.units.flatMap(u => u.items);
const CORE = ITEMS.filter(i => !i.path || i.path === 'core');

async function prepare(page, locale) {
  await page.addInitScript(l => {
    try {
      window.localStorage.setItem('gravitas_welcome_seen_v1', '1');
      if (l) window.localStorage.setItem('gravitas_locale', l);
    } catch {
      /* storage unavailable */
    }
  }, locale ?? null);
}

async function openHome(
  page,
  query = '?course=intro-astronomy',
  { locale } = {}
) {
  await prepare(page, locale);
  await page.goto(`/course/${query}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', {
    timeout: 30_000,
  });
}

async function openBuilder(page, { locale } = {}) {
  await prepare(page, locale);
  await page.goto('/studio/course/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toHaveAttribute('data-ready', 'true', {
    timeout: 30_000,
  });
  await clean(page);
}

/** The checks have run on the edit just made and found nothing to fix. */
const clean = page =>
  expect(page.locator('#cb-checks-summary')).toHaveText(
    /^(Nothing to fix[.;]|Nada que corregir[.;])/,
    { timeout: 30_000 }
  );

const current = async page =>
  JSON.parse(await page.locator('#st-raw-text').inputValue());

const upload = (page, selector, name, data) =>
  page.locator(selector).setInputFiles({
    name,
    mimeType: 'application/json',
    buffer: Buffer.from(
      typeof data === 'string' ? data : JSON.stringify(data, null, 2)
    ),
  });

async function enter(page, id, value) {
  const input = page.locator(`#${id}`);
  await input.fill(String(value));
  await input.press('Tab');
}

async function noOverflow(page) {
  const wide = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  );
  expect(wide).toBeLessThanOrEqual(1);
}

test.describe('the course home', () => {
  test('opens the course Gravitas ships, with a link on every item @cross-browser', async ({
    page,
  }) => {
    await openHome(page);
    await expect(page.locator('#ch-title')).toHaveText(
      INTRO_ASTRONOMY.title.en
    );
    await expect(page.locator('.ch-unit')).toHaveCount(4);
    await expect(page.locator('.ch-item')).toHaveCount(ITEMS.length);
    await expect(page.locator('#ch-time li[data-path="core"]')).toHaveText(
      /^The core: 4(\.5)?–5 h$/
    );
    await expect(page.locator('.ch-actions a:not([hidden])')).toHaveCount(
      ITEMS.length
    );
    await expect(
      page.locator('#ch-item-keplers-laws .ch-actions a')
    ).toHaveAttribute('href', /\/#investigation=keplers-laws$/);
    await expect(
      page.locator('#ch-item-a-real-spectrum .ch-actions a')
    ).toHaveAttribute('href', /\/observatory\/\?open=sdss-g$/);
    await expect(
      page.locator('#ch-item-reading-orbits-and-gravity .ch-actions a')
    ).toHaveAttribute(
      'href',
      'https://openstax.org/details/books/astronomy-2e'
    );
    await expect(page.locator('#ch-item-keplers-laws')).toContainText(
      'After: The Solar System, to explore'
    );
  });

  test("its paths filter it, and the instructors' notes show on request", async ({
    page,
  }) => {
    await openHome(page);
    await page.locator('#ch-path').selectOption('core');
    await expect(page.locator('.ch-item')).toHaveCount(CORE.length);
    await page.locator('#ch-path').selectOption('advanced');
    await expect(page.locator('.ch-item[data-path="intro"]')).toHaveCount(0);
    await expect(page.locator('.ch-item[data-path="advanced"]')).toHaveCount(3);
    await expect(page.locator('.ch-teacher')).toHaveCount(0);
    await page.locator('#ch-teacher').check();
    await expect(page.locator('#ch-guide-h')).toHaveText('For instructors');
    await expect(page.locator('#ch-item-a-first-transit')).toContainText(
      'A thirty-minute cut of a seventy-minute investigation.'
    );
  });

  test("reads in Spanish, with the lessons' Spanish titles @cross-browser", async ({
    page,
  }) => {
    await openHome(page, '?course=intro-astronomy', { locale: 'es' });
    await expect(page.locator('#ch-unit-0')).toHaveText(
      'Unidad 1: Movimientos en el cielo'
    );
    await expect(page.locator('#ch-item-keplers-laws h3')).toHaveText(
      'Las leyes de Kepler'
    );
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  });

  test('its assignment link opens the assignment in Gravitas', async ({
    page,
  }) => {
    await openHome(page);
    const href = await page
      .locator('#ch-item-a-first-transit .ch-actions a')
      .getAttribute('href');
    // Version 1: the item pins its steps but no package, so the deployed
    // build, which reads only version 1, opens it too.
    expect(href).toMatch(/\/#a1[zr]/);
    await page.goto(href, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toContainText(
      '6 steps of Finding Planets by Their Shadows',
      { timeout: 60_000 }
    );
  });

  test('its dataset link opens the observation', async ({ page }) => {
    await openHome(page);
    const href = await page
      .locator('#ch-item-a-real-light-curve .ch-actions a')
      .getAttribute('href');
    await page.goto(href, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#obsTitle')).toHaveText(/HD 209458/, {
      timeout: 30_000,
    });
  });

  test('a damaged link, a hostile file and a file that is not a course are refused @cross-browser', async ({
    page,
  }) => {
    await openHome(page, '#c2zbroken');
    await expect(page.locator('#ch-refused')).toBeVisible();
    await expect(page.locator('#ch-refused-h')).toHaveText(
      'This course cannot be opened'
    );
    await upload(
      page,
      '#ch-file',
      'hostile.json',
      '{"format":"gravitas.course-pack","formatVersion":2,"units":[{"__proto__":{"x":1}}]}'
    );
    await expect(page.locator('#ch-refused-why')).toContainText(
      '"__proto__" may not be a key'
    );
    expect(await page.evaluate(() => ({}).x)).toBeUndefined();
    await upload(page, '#ch-file', 'notes.json', 'not json at all');
    await expect(page.locator('#ch-refused-why')).toHaveText(
      'The file is not a course file.'
    );
    await upload(page, '#ch-file', 'intro.course.json', INTRO_ASTRONOMY);
    await expect(page.locator('#ch-title')).toHaveText(
      INTRO_ASTRONOMY.title.en
    );
    await expect(page.locator('html')).toHaveAttribute('data-source', 'file');
  });

  test('with nothing to open, it offers the example and a file', async ({
    page,
  }) => {
    await openHome(page, '');
    await expect(page.locator('#ch-empty-h')).toHaveText('No course is open');
    await page.locator('#ch-empty a[href="?course=intro-astronomy"]').click();
    await expect(page.locator('#ch-title')).toHaveText(
      INTRO_ASTRONOMY.title.en
    );
  });

  test('passes axe in both languages and fits a phone', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    for (const locale of ['en', 'es']) {
      await openHome(page, '?course=intro-astronomy', { locale });
      await page.locator('#ch-teacher').check();
      await noOverflow(page);
      const r = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      expect(r.violations.map(v => `${locale}: ${v.id}`)).toEqual([]);
    }
  });
});

test.describe('the course home offline', () => {
  test.use({ serviceWorkers: 'allow' });
  test.skip(DIST, 'the service worker is the sources’; dist/ has its own');

  test('a course opens with no network once Gravitas has been opened', async ({
    page,
    context,
    app,
  }, testInfo) => {
    testInfo.setTimeout(180_000);
    await app.boot();
    const deadline = Date.now() + 120_000;
    let cached = null;
    while (Date.now() < deadline) {
      cached = await page.evaluate(async () => {
        const m = await import('/js/offline.js');
        return m.cacheStatus(2000);
      });
      if (cached && cached.cachedCount >= cached.precacheCount) break;
      await page.waitForTimeout(500);
    }
    expect(cached?.cachedCount).toBeGreaterThanOrEqual(cached?.precacheCount);
    await context.setOffline(true);
    await openHome(page);
    await expect(page.locator('.ch-item')).toHaveCount(ITEMS.length);
    await expect(
      page.locator('#ch-item-a-first-transit .ch-actions a')
    ).toHaveAttribute('href', /#a1[zr]/);
  });
});

test.describe('the course-pack builder', () => {
  test('opens the example with nothing to fix and every lesson as pinned @cross-browser', async ({
    page,
  }) => {
    await openBuilder(page);
    await expect(page.locator('#cb-status')).toHaveText(
      'The example course: introductory astronomy.'
    );
    await expect(page.locator('#cb-review-summary')).toHaveText(
      'All 8 investigations are as pinned.'
    );
    await expect(page.locator('#cb-estimate li').first()).toHaveText(
      /^Core: 250–300 min \(4\.2–5\.0 h\)$/
    );
    await expect(page.locator('#cb-link-table tbody tr')).toHaveCount(
      ITEMS.length
    );
    await expect(page.locator('#cb-course-link')).toHaveValue(
      /\/course\/#c2[zr]/
    );
    await expect(page.locator('#cb-course-link-hint')).toHaveText(
      /^\d{4} characters\.$/
    );
    await expect(page.locator('#cb-translation-summary')).toHaveText(
      'Every text has its Spanish.'
    );
    await expect(page.locator('#cb-graph')).toContainText('assumes');
  });

  test('its course link opens the same course on the course home', async ({
    page,
  }) => {
    await openBuilder(page);
    const url = await page.locator('#cb-course-link').inputValue();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-source', 'link', {
      timeout: 30_000,
    });
    await expect(page.locator('.ch-item')).toHaveCount(ITEMS.length);
  });

  test('the preview is the course home, with the draft as it is now @cross-browser', async ({
    page,
  }) => {
    await openBuilder(page);
    await enter(page, 'cb-title-en', 'Astronomy, first term');
    await clean(page);
    await page.locator('#cb-preview-go').click();
    const frame = page.frameLocator('#cb-preview');
    await expect(frame.locator('#ch-title')).toHaveText(
      'Astronomy, first term',
      { timeout: 30_000 }
    );
    await expect(frame.locator('.ch-item')).toHaveCount(ITEMS.length);
  });

  test('a bad value is explained on its field and blocks saving, and undo takes it back', async ({
    page,
  }) => {
    await openBuilder(page);
    await page.locator('#cb-units-0 > summary').click();
    await page.locator('#cb-units-0-items-0 > summary').click();
    await enter(page, 'cb-units-0-items-0-cite-url', 'http://example.org/');
    const url = page.locator('#cb-units-0-items-0-cite-url');
    await expect(url).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#cb-units-0-items-0-cite-url-error')).toHaveText(
      'An https address.'
    );
    await expect(page.locator('#cb-save')).toBeDisabled();
    await expect(page.locator('#cb-links')).toHaveText(
      'Fix what the checks name first.'
    );
    await page.locator('#cb-undo').click();
    await clean(page);
    await expect(url).toHaveValue(
      'https://openstax.org/details/books/astronomy-2e'
    );
  });

  test('choosing a step brings the steps it needs and re-issues the assignment', async ({
    page,
  }) => {
    await openBuilder(page);
    const before = (await current(page)).units[3].items[0];
    await page.locator('#cb-units-3 > summary').click();
    await page.locator('#cb-units-3-items-0 > summary').click();
    const steps = page.locator('#cb-units-3-items-0-steps input');
    await expect(steps).toHaveCount(29);
    // "Recover the real planet" uses a measurement made at "Now measure it",
    // the step that builds the Blended Binary world it is about.
    await page
      .locator('#cb-units-3-items-0-steps label', {
        hasText: 'Recover the real planet',
      })
      .click();
    await clean(page);
    const after = (await current(page)).units[3].items[0];
    expect(after.steps).toContain('recover-the-real-planet');
    expect(after.steps).toContain('now-measure-it');
    expect(after.steps).toHaveLength(before.steps.length + 2);
    expect(after.assignment.id).not.toBe(before.assignment.id);
    expect(after.pin.f).toHaveLength(after.steps.length);
    await expect(
      page.locator('#cb-units-3-items-0-steps label', {
        hasText: 'Now measure it',
      })
    ).toContainText('(needed by a chosen step)');
  });

  test('a lesson changed since it was pinned waits for review, and the upgrade re-pins it', async ({
    page,
  }) => {
    await openBuilder(page);
    const pack = JSON.parse(JSON.stringify(INTRO_ASTRONOMY));
    pack.id = 'archived-astronomy';
    pack.pinning = 'exact';
    pack.units[0].items[2].pin.fp = '00000000';
    await upload(page, '#cb-file', 'archived.course.json', pack);
    await expect(page.locator('#cb-review-summary')).toHaveText(
      '1 to review (Exact pinning).',
      { timeout: 30_000 }
    );
    await expect(page.locator('#cb-checks')).toContainText(
      "Kepler's Laws: changed since it was pinned. It waits for review."
    );
    await page.locator('#cb-reviewed-keplers-laws').check();
    await page.locator('#cb-upgrade').click();
    await expect(page.locator('#cb-status')).toHaveText(
      '1 upgraded; the course is now version 1.1.0, a minor version.'
    );
    await expect(page.locator('#cb-review-summary')).toHaveText(
      'All 8 investigations are as pinned.'
    );
    expect((await current(page)).units[0].items[2].pin.fp).toBe(
      INTRO_ASTRONOMY.units[0].items[2].pin.fp
    );
  });

  test('a catalog course migrates, and upgrading its lessons pins them', async ({
    page,
  }) => {
    await openBuilder(page);
    const v1 = JSON.parse(
      readFileSync('extensions/pulsating-stars/course.json', 'utf8')
    );
    await upload(page, '#cb-file', 'course.json', v1);
    await expect(page.locator('#cb-status')).toContainText(
      'Opened pulsating-stars, a course of investigations from the catalog.'
    );
    const review = page.locator('#cb-review li');
    await expect(review).toHaveCount(v1.units.flatMap(u => u.lessons).length, {
      timeout: 30_000,
    });
    for (const box of await page.locator('#cb-review input').all())
      await box.check();
    await page.locator('#cb-upgrade').click();
    await expect(page.locator('#cb-status')).toContainText(
      'the course is now version 1.1.0'
    );
    const pack = await current(page);
    expect(pack.formatVersion).toBe(2);
    expect(pack.units.flatMap(u => u.items).every(i => i.pin?.fp)).toBe(true);
  });

  test('the pack and the manifest save, and the pack opens again unchanged @cross-browser', async ({
    page,
  }) => {
    await openBuilder(page);
    const [pack] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#cb-save').click(),
    ]);
    expect(pack.suggestedFilename()).toBe('intro-astronomy.course.json');
    const saved = JSON.parse(readFileSync(await pack.path(), 'utf8'));
    expect(saved).toEqual(await current(page));
    const [manifest] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#cb-manifest').click(),
    ]);
    expect(manifest.suggestedFilename()).toBe(
      'intro-astronomy.course-manifest.json'
    );
    const m = JSON.parse(readFileSync(await manifest.path(), 'utf8'));
    expect(m.format).toBe('gravitas.course-manifest');
    expect(m.items).toHaveLength(ITEMS.length);
    expect(m.course.home).toMatch(/\/course\/#c2/);
    await upload(page, '#cb-file', 'intro-astronomy.course.json', saved);
    await expect(page.locator('#cb-status')).toHaveText(
      'Opened intro-astronomy.'
    );
    await expect(page.locator('#cb-diff-summary')).toHaveText(
      'No changes since it was opened or saved.'
    );
  });

  test('a file with the id of a different draft asks first, and a hostile one is refused', async ({
    page,
  }) => {
    await openBuilder(page);
    // An edit makes the example a draft of this browser's.
    await enter(page, 'cb-version', '1.0.1');
    await clean(page);
    const other = JSON.parse(JSON.stringify(INTRO_ASTRONOMY));
    other.title.en = 'Someone else’s astronomy';
    await upload(page, '#cb-file', 'other.course.json', other);
    const dialog = page.locator('#cb-conflict');
    await expect(dialog).toBeVisible();
    await expect(page.locator('#cb-conflict-cancel')).toBeFocused();
    await page.locator('#cb-conflict-both').click();
    await expect(page.locator('#cb-status')).toContainText('intro-astronomy-2');
    expect((await current(page)).id).toBe('intro-astronomy-2');
    await upload(
      page,
      '#cb-file',
      'hostile.json',
      '{"format":"gravitas.course-pack","formatVersion":2,"id":"x","units":[],"constructor":{"prototype":{"x":1}}}'
    );
    await expect(page.locator('#cb-status')).toHaveText(
      'This file cannot be opened: “constructor” may not be a key.'
    );
    expect((await current(page)).id).toBe('intro-astronomy-2');
  });

  test('passes axe in both languages and is read-only on a phone', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    for (const locale of ['en', 'es']) {
      await openBuilder(page, { locale });
      // PLATFORM_MODEL.md: the Studio pages read, and do not edit, under
      // 768 px. The note says so and the editors are not there.
      await expect(page.locator('.st-narrow')).toBeVisible();
      await expect(page.locator('#cb-units-3 > summary')).toBeHidden();
      await noOverflow(page);
      const r = await new AxeBuilder({ page })
        .withTags(TAGS)
        .exclude('#cb-preview')
        .analyze();
      expect(r.violations.map(v => `${locale}: ${v.id}`)).toEqual([]);
    }
  });
});
