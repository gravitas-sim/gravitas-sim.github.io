// =============================================================================
// The first sketch
// -----------------------------------------------------------------------------
// A quiet link at the end of /model/ opens the original Gravitas - the single
// index.html of commit a5d08fc, kept byte for byte - at /history/original/.
// This walks it the way a reader would: find the link at the end of the
// documentation, follow it from the keyboard, watch the old simulation start,
// and come back with Back.
//
// Runs against both targets (BOTH_TARGETS in playwright.config.js). The
// sources are what GitHub Pages publishes; dist/ is the production build,
// which copies the page through build.js's ARCHIVAL_PAGES. Either could lose
// it or rewrite it, and the byte comparison below is what would notice.
//
// The original asks Google Fonts for its typefaces, which the current
// application deliberately does not (e2e/selfContained.spec.js). That request
// is part of the history and stays in the file, but a test must not depend on
// another origin, so it is answered here with an empty stylesheet and the page
// draws in its fallback faces - as it would behind a school firewall. It is
// the page's only request to another origin, and the walk asserts that too.
//
// DOM only, no module imports: /js/ui.js does not exist in dist/.
// =============================================================================

import { readFileSync } from 'node:fs';
import { test, expect } from './fixtures.js';

const HREF = '/history/original/';
const LOCAL = /^(127\.0\.0\.1|localhost|\[::1\])$/;
const DIST = process.env.GRAVITAS_E2E_TARGET === 'dist';

/** The committed file, which both targets have to serve unchanged. */
const ORIGINAL = readFileSync(
  new URL('../history/original/index.html', import.meta.url)
);

/**
 * Record every request, and answer any to another origin with an empty body.
 *
 * On the context rather than the page, so that it still sees the requests a
 * service worker makes on the page's behalf when one is installed.
 *
 * @param {import('@playwright/test').Page} page - The page under test
 * @returns {Promise<{local: string[], foreign: string[]}>} Paths and URLs seen
 */
async function watchRequests(page) {
  const seen = { local: [], foreign: [] };
  await page.context().route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.protocol === 'data:' || url.protocol === 'blob:') {
      return route.continue();
    }
    if (LOCAL.test(url.hostname)) {
      seen.local.push(url.pathname);
      return route.continue();
    }
    seen.foreign.push(url.href);
    return route.fulfill({ status: 200, contentType: 'text/css', body: '' });
  });
  return seen;
}

/**
 * A digest of the canvas, sampled across its whole area.
 *
 * @param {import('@playwright/test').Page} page - The page under test
 * @returns {Promise<{lit: number, hash: number}>} Painted samples and a hash
 */
function sampleCanvas(page) {
  return page.locator('#simulationCanvas').evaluate(canvas => {
    const ctx = canvas.getContext('2d');
    if (!canvas.width || !canvas.height) return { lit: 0, hash: 0 };
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let lit = 0;
    let hash = 0;
    for (let i = 0; i < data.length; i += 4 * 97) {
      if (data[i] + data[i + 1] + data[i + 2] > 0) lit++;
      hash = (hash * 31 + data[i] + 7 * data[i + 1] + 13 * data[i + 2]) | 0;
    }
    return { lit, hash };
  });
}

test.describe('the first sketch', () => {
  test(
    'the link at the end of /model/ opens the original, and Back returns',
    { tag: '@cross-browser' },
    async ({ page }) => {
      const seen = await watchRequests(page);

      await page.goto('/model/', { waitUntil: 'load' });
      // The documentation page does not fetch it, prefetch it or preload it.
      expect(seen.local.filter(p => p.startsWith('/history/'))).toEqual([]);

      // One link, in the document's text: after its last heading and outside
      // the table of contents, the footer and anything styled as a callout.
      const link = page.getByRole('link', { name: 'The first sketch' });
      await expect(link).toHaveCount(1);
      await expect(link).toHaveAttribute('href', HREF);
      const where = await link.evaluate(a => ({
        inMain: Boolean(a.closest('main')),
        inChrome: Boolean(a.closest('nav, header, footer, aside, .doc-toc')),
        afterLastHeading: Boolean(
          [...document.querySelectorAll('main h2')]
            .at(-1)
            .compareDocumentPosition(a) &
          window.Node.DOCUMENT_POSITION_FOLLOWING
        ),
        tag: a.parentElement.tagName,
      }));
      expect(where).toEqual({
        inMain: true,
        inChrome: false,
        afterLastHeading: true,
        tag: 'P',
      });

      // Readable: it has a box and the text color is not the background's.
      await link.scrollIntoViewIfNeeded();
      await expect(link).toBeVisible();
      const ink = await link.evaluate(a => {
        const s = getComputedStyle(a);
        return { color: s.color, opacity: s.opacity, size: s.fontSize };
      });
      expect(ink.opacity).toBe('1');
      expect(parseFloat(ink.size)).toBeGreaterThanOrEqual(14);
      expect(ink.color).not.toBe(
        await page.evaluate(
          () => getComputedStyle(document.body).backgroundColor
        )
      );

      // Reached from the keyboard: it is the last stop in the document before
      // the footer, so one Shift+Tab from the footer's first link lands on it,
      // and Enter follows it.
      await page.locator('footer a').first().focus();
      await page.keyboard.press('Shift+Tab');
      await expect(link).toBeFocused();
      await Promise.all([
        page.waitForURL(`**${HREF}`),
        page.keyboard.press('Enter'),
      ]);

      // The page served is the file committed, byte for byte, in both targets.
      const served = await page.request.get(HREF);
      expect(served.status()).toBe(200);
      expect(Buffer.compare(await served.body(), ORIGINAL)).toBe(0);

      // The original, running: its own title and controls, a painted canvas,
      // an overlay that says so, and a picture that changes from one sample to
      // the next because the bodies are moving.
      await expect(page).toHaveTitle('Gravitas - Web Black Hole Sandbox');
      await expect(page.locator('#settingsBtn')).toHaveText('Settings');
      await expect(page.locator('#overlay')).toContainText('Status: Running');
      await expect
        .poll(async () => (await sampleCanvas(page)).lit, { timeout: 10_000 })
        .toBeGreaterThan(0);
      const first = await sampleCanvas(page);
      await expect
        .poll(async () => (await sampleCanvas(page)).hash, { timeout: 10_000 })
        .not.toBe(first.hash);

      // Its only request to another origin is the Google Fonts stylesheet.
      expect(seen.foreign.length).toBeGreaterThan(0);
      for (const url of seen.foreign) {
        expect(new URL(url).hostname).toBe('fonts.googleapis.com');
      }

      await page.goBack();
      await expect(page).toHaveURL(/\/model\/$/);
      await expect(
        page.getByRole('link', { name: 'The first sketch' })
      ).toHaveCount(1);
    }
  );

  test('the application starts without fetching it', async ({ page, app }) => {
    const seen = await watchRequests(page);
    await app.boot();
    await expect(page.locator('#simulationCanvas')).toBeVisible();
    expect(seen.local.length).toBeGreaterThan(0);
    expect(seen.local.filter(p => p.startsWith('/history/'))).toEqual([]);
  });
});

// The worker, installed. Playwright blocks service workers by default, and the
// one this site ships answers navigations to the application's own route from
// its precache - so without this, nothing would show that a reader who has
// opened Gravitas before is not handed the sandbox at /history/original/, or
// that the old page is left out of the cache the worker fills for everyone.
test.describe('the first sketch with the service worker installed', () => {
  test.use({ serviceWorkers: 'allow' });
  test.skip(DIST, 'the service worker is the sources’; dist/ has its own');

  test('it is itself, not the sandbox, and nothing caches it', async ({
    page,
    app,
  }, testInfo) => {
    testInfo.setTimeout(180_000);
    await watchRequests(page);
    await app.boot();

    // The same wait e2e/offline.spec.js uses: every precached file is in.
    const deadline = Date.now() + 120_000;
    let status = null;
    while (Date.now() < deadline) {
      status = await page.evaluate(async () => {
        const m = await import('/js/offline.js');
        return m.cacheStatus(2000);
      });
      if (status && status.cachedCount >= status.precacheCount) break;
      await page.waitForTimeout(500);
    }
    expect(status?.cachedCount).toBeGreaterThanOrEqual(status?.precacheCount);
    expect(
      await page.evaluate(() =>
        Boolean(window.navigator.serviceWorker.controller)
      )
    ).toBe(true);

    await page.goto(HREF, { waitUntil: 'load' });
    await expect(page).toHaveTitle('Gravitas - Web Black Hole Sandbox');
    await expect(page.locator('#overlay')).toContainText('Status: Running');
    // The sandbox's own chrome, which is what the shell would have brought.
    await expect(page.locator('#welcomeScreen')).toHaveCount(0);
    await expect(page.locator('#investigationsBtn')).toHaveCount(0);

    const cached = await page.evaluate(async () => {
      const out = [];
      for (const name of await window.caches.keys()) {
        const cache = await window.caches.open(name);
        for (const req of await cache.keys()) {
          out.push(new URL(req.url).pathname);
        }
      }
      return out;
    });
    expect(cached.length).toBeGreaterThan(100);
    expect(cached.filter(p => p.startsWith('/history/'))).toEqual([]);
  });
});
