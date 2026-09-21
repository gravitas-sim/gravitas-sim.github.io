// =============================================================================
// The instructor portal, through the door rather than around it
// -----------------------------------------------------------------------------
// The portal has one screen nothing could test: the dashboard. It appears only
// after a passphrase decrypts the bundle, and the production passphrase must
// not be in a test run or a CI log - so every check the portal had stopped at
// the login form. The dashboard's layout, its counts, its downloads and its
// accessibility had never been exercised by anything.
//
// The way in is a fixture. `node tools/build-instructor-materials.js --fixture`
// renders the same inventory through the same code path, replaces each
// document with a one-page placeholder, and encrypts it with a passphrase that
// is printed in the source because it is not a secret. The ids and names are
// identical to production by construction - the same builder produced them -
// so what this drives is the real lookup, not a model of it.
//
// The fixture reaches the page by intercepting the one request for the bundle.
// Nothing about the application changes: no test hook, no bypass, no alternate
// path to ship by accident. The page fetches `materials.enc.json` exactly as it
// always does and Playwright answers.
// =============================================================================

import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';

import { test, expect } from './fixtures.js';
import { MANIFEST } from '../js/data/investigations/manifest.js';

/**
 * How many lessons the portal should be showing.
 *
 * Derived rather than written down. These counts were three literal 22s and
 * a "22 investigations, 44 documents", which is a number that is only right
 * until somebody adds a lesson - and then fails here, in a file about the
 * instructor portal, for a reason that has nothing to do with the portal.
 */
const LESSONS = MANIFEST.length;
/** A guide and an answer key each. */
const DOCUMENTS = LESSONS * 2;
/**
 * Everything the bundle holds, which is what the version line counts.
 *
 * The lesson half is derived because it is the half that moves: every new
 * investigation adds two documents and used to leave a literal behind. The
 * other two terms are the adopters guide and the curriculum map, and the eight
 * activity documents the test below asserts separately - both stable, both
 * checked in their own right, and neither of them a reason to hard-code the
 * total.
 */
const GENERAL_DOCUMENTS = 2;
const ACTIVITY_DOCUMENTS = 8;
const ALL_DOCUMENTS = GENERAL_DOCUMENTS + ACTIVITY_DOCUMENTS + DOCUMENTS;

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURE = path.join(REPO, '.instructor-fixture', 'materials.enc.json');
const PASSPHRASE = 'gravitas-fixture-not-a-secret';

/** The fixture bundle, built on demand the first time a worker needs it. */
function fixtureBundle() {
  if (!existsSync(FIXTURE)) {
    execFileSync(
      'node',
      ['tools/build-instructor-materials.js', '--fixture', FIXTURE],
      { cwd: REPO, stdio: 'ignore' }
    );
  }
  return readFileSync(FIXTURE, 'utf8');
}

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

test.describe('the instructor portal, signed in', () => {
  let bundle;

  test.beforeAll(() => {
    bundle = fixtureBundle();
  });

  /** Open the portal with the fixture standing in for the real bundle. */
  async function openPortal(page) {
    await page.route('**/instructors/materials.enc.json*', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: bundle,
      })
    );
    await page.goto('/instructors/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#loginForm')).toBeVisible();
  }

  /** Sign in and wait for the dashboard. */
  async function signIn(page, secret = PASSPHRASE) {
    await page.locator('#passwordInput').fill(secret);
    await page.locator('#loginSubmit').click();
  }

  test('a wrong passphrase is refused, and says so', async ({ page }) => {
    await openPortal(page);
    await signIn(page, 'not the passphrase');
    await expect(page.locator('#loginError')).toBeVisible();
    await expect(page.locator('#dashboard')).toBeHidden();
    // And the refusal is announced, not only drawn.
    await expect(page.locator('#loginError')).toHaveAttribute('role', 'alert');
  });

  test('the right passphrase opens the dashboard', async ({ page }) => {
    await openPortal(page);
    await signIn(page);
    await expect(page.locator('#dashboard')).toBeVisible();
    await expect(page.locator('#loginScreen')).toBeHidden();
    await expect(page.locator('#logoutBtn')).toBeVisible();
  });

  test.describe('once inside', () => {
    test.beforeEach(async ({ page }) => {
      await openPortal(page);
      await signIn(page);
      await expect(page.locator('#dashboard')).toBeVisible();
    });

    test('every investigation has a card, a guide and a key', async ({
      page,
    }) => {
      const cards = page.locator('#investigationResources .res-card');
      await expect(cards).toHaveCount(LESSONS);
      // textContent, not innerText: `.res-count` is text-transform: uppercase,
      // so innerText reports what is painted and textContent what was written.
      // Asserting the painted form would make this test fail the day somebody
      // changes a CSS property that has nothing to do with the count.
      const count = await page
        .locator('#investigationCount')
        .evaluate(el => el.textContent.trim());
      expect(count).toBe(`${LESSONS} investigations, ${DOCUMENTS} documents`);
      // Two download buttons and one "open" link on each card.
      const first = cards.first();
      await expect(first.locator('button.ui-button')).toHaveCount(2);
      await expect(first.locator('a.ui-button')).toHaveCount(1);
    });

    test('all eight activity documents are individually reachable', async ({
      page,
    }) => {
      const cards = page.locator('#activityResources .res-card');
      await expect(cards).toHaveCount(3);
      const activityCount = await page
        .locator('#activityCount')
        .evaluate(el => el.textContent.trim());
      expect(activityCount).toBe('3 activities, 8 documents');
      // Three guides, five worksheets: the demonstration is projected and
      // answered aloud, and says so rather than leaving a gap.
      const buttons = page.locator('#activityResources button.ui-button');
      await expect(buttons).toHaveCount(8);
      await expect(page.locator('#activityResources .res-none')).toHaveCount(1);
      await expect(page.locator('#activityResources .res-format')).toHaveCount(
        6
      );
    });

    test('"Open in Gravitas" uses the canonical activity route', async ({
      page,
    }) => {
      const links = page.locator('#activityResources a.ui-button');
      await expect(links).toHaveCount(6);
      const hrefs = await links.evaluateAll(els =>
        els.map(e => e.getAttribute('href'))
      );
      for (const href of hrefs) {
        expect(href).toMatch(/^\/#activity=[a-z0-9-]+\/[a-z0-9-]+$/);
      }
      expect(hrefs).toContain('/#activity=orbital-speed/route');
      expect(hrefs).toContain('/#activity=binary-planets/route');
      expect(hrefs).toContain('/#activity=star-sizes/route');
    });

    test('a download actually delivers the document', async ({ page }) => {
      const button = page
        .locator('#activityResources button.ui-button')
        .first();
      const label = (await button.innerText()).trim();
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        button.click(),
      ]);
      expect(download.suggestedFilename()).toMatch(/\.pdf$/);
      // And the status line says so, for a reader who cannot see the chrome.
      await expect(page.locator('#downloadStatus')).toContainText('downloaded');
      expect(label.length).toBeGreaterThan(0);
    });

    test('the status region is polite and empty until something happens', async ({
      page,
    }) => {
      const status = page.locator('#downloadStatus');
      await expect(status).toHaveAttribute('aria-live', 'polite');
      await expect(status).toHaveAttribute('role', 'status');
      await expect(status).toHaveText('');
    });

    test('search narrows the investigations', async ({ page }) => {
      await page.locator('#resourceSearch').fill('kepler');
      await expect
        .poll(() => page.locator('#investigationResources .res-card').count())
        .toBeLessThan(LESSONS);
      await expect(page.locator('#investigationCount')).toContainText(
        `of ${LESSONS}`
      );
      await page.locator('#resourceSearch').fill('');
      await expect(
        page.locator('#investigationResources .res-card')
      ).toHaveCount(LESSONS);
    });

    test('search that matches nothing says so rather than showing nothing', async ({
      page,
    }) => {
      await page.locator('#resourceSearch').fill('zzzznotatopic');
      await expect(page.locator('#noMatches')).toBeVisible();
      await expect(
        page.locator('#investigationResources .res-card')
      ).toHaveCount(0);
    });

    test('the filters are three buttons and a select, not a wall of pills', async ({
      page,
    }) => {
      const pills = page.locator('#resourceFilters .res-filter');
      await expect(pills).toHaveCount(3);
      const select = page.locator('#topicFilter');
      await expect(select).toBeVisible();
      // Every option carries the count it would leave showing.
      const options = await select
        .locator('option')
        .evaluateAll(els => els.map(e => e.textContent.trim()));
      expect(options.length).toBeGreaterThan(3);
      for (const o of options) expect(o).toMatch(/\(\d+\)$/);
    });

    test('a duration filter actually filters', async ({ page }) => {
      const all = await page
        .locator('#investigationResources .res-card')
        .count();
      await page
        .locator('#resourceFilters .res-filter')
        .filter({ hasText: '45 min or less' })
        .click();
      const short = await page
        .locator('#investigationResources .res-card')
        .count();
      expect(short).toBeGreaterThan(0);
      expect(short).toBeLessThan(all);
    });

    test('a topic filter actually filters', async ({ page }) => {
      const select = page.locator('#topicFilter');
      const value = await select
        .locator('option')
        .nth(1)
        .evaluate(o => o.value);
      await select.selectOption(value);
      const shown = await page
        .locator('#investigationResources .res-card')
        .count();
      expect(shown).toBeGreaterThan(0);
      expect(shown).toBeLessThan(LESSONS);
    });

    test('the version line names the catalog it is describing', async ({
      page,
    }) => {
      await expect(page.locator('#materialsVersion')).toContainText(
        `${ALL_DOCUMENTS} documents`
      );
    });
  });
});

test.describe('the dashboard on a small screen and by keyboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/instructors/materials.enc.json*', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: fixtureBundle(),
      })
    );
    await page.goto('/instructors/', { waitUntil: 'domcontentloaded' });
    await page.locator('#passwordInput').fill(PASSPHRASE);
    await page.locator('#loginSubmit').click();
    await expect(page.locator('#dashboard')).toBeVisible();
  });

  // 320 is the narrowest viewport worth supporting, 390 a current phone, and
  // 640 is what 1280 looks like at 200% zoom.
  for (const [label, width, height] of [
    ['320x700', 320, 700],
    ['390x844', 390, 844],
    ['640x800 (200% zoom)', 640, 800],
    ['768x1024', 768, 1024],
    ['1440x900', 1440, 900],
  ]) {
    test(`${label}: nothing overflows, nothing is clipped`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height });
      const report = await page.evaluate(() => {
        const de = document.documentElement;
        const small = [];
        for (const el of document.querySelectorAll(
          '#dashboard button, #dashboard a.ui-button, #dashboard input, #dashboard select'
        )) {
          const r = el.getBoundingClientRect();
          if (r.height > 0 && r.height < 44) {
            small.push(
              `${(el.textContent || el.id).trim().slice(0, 24)} h=${Math.round(r.height)}`
            );
          }
        }
        const clipped = [];
        for (const el of document.querySelectorAll(
          '#dashboard .res-card, #dashboard .res-format'
        )) {
          if (el.scrollWidth > el.clientWidth + 1) {
            clipped.push(
              el
                .querySelector('h3,.res-format-name')
                ?.textContent?.slice(0, 24) ?? '?'
            );
          }
        }
        return {
          overflowX: de.scrollWidth > de.clientWidth + 1,
          tooSmall: small,
          clipped,
        };
      });
      expect(report).toEqual({ overflowX: false, tooSmall: [], clipped: [] });
    });
  }

  test('the dashboard can be operated from the keyboard alone', async ({
    page,
  }) => {
    await page.locator('#resourceSearch').focus();
    // Tab forward and confirm focus keeps landing on something operable with a
    // visible ring, rather than disappearing into the page.
    const seen = [];
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      const at = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const cs = getComputedStyle(el);
        return {
          tag: el.tagName,
          focusVisible: el.matches(':focus-visible'),
          outline: cs.outlineStyle,
          width: Math.round(el.getBoundingClientRect().width),
        };
      });
      if (at) seen.push(at);
    }
    expect(seen.length).toBeGreaterThan(8);
    expect(
      seen.every(s => ['BUTTON', 'A', 'INPUT', 'SELECT'].includes(s.tag))
    ).toBe(true);
    // Every stop draws a ring. A focus outline of `none` is the defect this
    // catches, and it is invisible in a screenshot taken without tabbing.
    expect(seen.filter(s => s.focusVisible && s.outline === 'none')).toEqual(
      []
    );
  });

  test('axe finds nothing on the dashboard', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    // Assert there is something to check before checking it. axe over an empty
    // container is a clean run that proves nothing, and an empty container is
    // exactly what a broken render looks like from here.
    await expect(page.locator('#investigationResources .res-card')).toHaveCount(
      LESSONS
    );
    await expect(page.locator('#activityResources .res-format')).toHaveCount(6);
    const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    const violations = results.violations.map(v => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.slice(0, 3).map(n => n.target.join(' ')),
    }));
    expect(violations).toEqual([]);
  });
});
