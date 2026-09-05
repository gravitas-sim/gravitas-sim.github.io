// =============================================================================
// The application makes no third-party requests
// -----------------------------------------------------------------------------
// Gravitas used to reach three other origins during ordinary use: Google Fonts
// on every page load, jsdelivr for three.js the moment the 3-D view opened, and
// jsdelivr again for Chart.js the moment a chart did. Each was a dependency the
// lockfile did not pin, the service worker could not cache and a school network
// could block - and the fonts request happened before a reader had done
// anything at all.
//
// All three are now local, so this asserts the property directly: every request
// to anywhere but the test server is aborted, and then the application, the
// charts and the 3-D view are used anyway. If any of them still reached out,
// the feature would break here rather than in a classroom behind a firewall.
//
// Runs against both targets. In source mode the browser loads the real modules
// from the repository; in the production bundle it loads esbuild's chunks. The
// two resolve three.js and Chart.js by the same relative path into vendor/, and
// this is what proves it.
//
// DOM only, no module imports: `/js/ui.js` does not exist in dist/, which is
// why e2e/production.spec.js is written the same way.
// =============================================================================

import { test, expect } from './fixtures.js';

/** Hosts the application is allowed to talk to: the one serving it. */
const LOCAL = /^(127\.0\.0\.1|localhost|\[::1\])$/;

/**
 * Abort every request that leaves the test server, and record it.
 *
 * Blocking rather than merely observing is deliberate. A test that watched for
 * third-party requests would pass on a machine with a warm HTTP cache, and
 * would report the fonts as "not requested" while the browser served them from
 * disk. Aborting makes the dependency fatal, which is the only way to be sure
 * it is gone.
 *
 * @param {import('@playwright/test').Page} page - The page under test
 * @returns {Promise<string[]>} The list that fills with blocked URLs
 */
async function blockThirdParty(page) {
  const blocked = [];
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.protocol === 'data:' || url.protocol === 'blob:') {
      return route.continue();
    }
    if (LOCAL.test(url.hostname)) return route.continue();
    blocked.push(url.href);
    return route.abort();
  });
  return blocked;
}

test.describe('with every non-local request blocked', () => {
  test('the application boots, and reaches nothing but its own origin', async ({
    page,
    app,
  }) => {
    const blocked = await blockThirdParty(page);
    const failed = [];
    const errors = [];
    page.on('requestfailed', r => {
      const url = new URL(r.url());
      if (LOCAL.test(url.hostname)) failed.push(url.pathname);
    });
    page.on('pageerror', e => errors.push(e.message));

    await app.boot();

    // The simulation is running, not merely present.
    // Sampled across the whole canvas rather than out of one corner. The first
    // version read the top-left 40x40 pixels, which on the default scenario is
    // empty sky - so it was asserting that the starfield had reached one
    // corner, and failed intermittently for that reason rather than because
    // anything was broken.
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const c = document.getElementById('simulationCanvas');
            if (!c || !c.width || !c.height) return 0;
            const d = c
              .getContext('2d')
              .getImageData(0, 0, c.width, c.height).data;
            const seen = new Set();
            for (let i = 0; i < d.length; i += 4 * 997) {
              seen.add(`${d[i]},${d[i + 1]},${d[i + 2]},${d[i + 3]}`);
              if (seen.size > 3) return seen.size;
            }
            return seen.size;
          }),
        { timeout: 30_000, message: 'the simulation never painted' }
      )
      .toBeGreaterThan(1);

    expect(blocked, `third-party requests: ${blocked.join(', ')}`).toEqual([]);
    expect(
      failed,
      `same-origin requests that failed: ${failed.join(', ')}`
    ).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('the typography is the intended typography, served locally', async ({
    page,
    app,
  }) => {
    const blocked = await blockThirdParty(page);
    await app.boot();

    const fonts = await page.evaluate(async () => {
      await document.fonts.ready;
      const loaded = [...document.fonts]
        .filter(f => f.status === 'loaded')
        .map(f => `${f.family} ${f.weight}`);
      const body = getComputedStyle(document.body).fontFamily;
      return { loaded, body, count: document.fonts.size };
    });

    // The families the interface actually asks for, rather than a count: a
    // system fallback would leave the page looking almost right and this
    // assertion is the difference.
    expect(fonts.loaded.some(f => f.startsWith('Poppins'))).toBe(true);
    expect(fonts.body).toContain('Poppins');
    expect(blocked).toEqual([]);
  });

  test('the light curve draws, so Chart.js came from the bundle', async ({
    page,
    app,
  }) => {
    const blocked = await blockThirdParty(page);
    await app.boot();

    // No scenario is loaded first, and no module is imported to do it. Against
    // dist/ there is no /js/ui.js to reach for, and the assertion does not need
    // one: Chart.js draws the axes, the grid and the labels of an empty chart,
    // so a canvas with more than one colour on it is the library having loaded
    // and run either way.
    await app.openPanel('toggleLightCurve', 'lightCurveContainer');
    await expect(page.locator('#lightCurveCanvas')).toBeVisible({
      timeout: 30_000,
    });

    // Chart.js is what puts pixels on that canvas. Asserting the canvas has
    // drawn is asserting the library arrived and ran.
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const c = document.getElementById('lightCurveCanvas');
            if (!c || !c.width) return 0;
            const d = c
              .getContext('2d')
              .getImageData(0, 0, c.width, c.height).data;
            const seen = new Set();
            for (let i = 0; i < d.length; i += 4 * 29) {
              seen.add(`${d[i]},${d[i + 1]},${d[i + 2]},${d[i + 3]}`);
              if (seen.size > 3) return seen.size;
            }
            return seen.size;
          }),
        { timeout: 30_000, message: 'the light curve never drew' }
      )
      .toBeGreaterThan(1);

    expect(blocked, `blocked: ${blocked.join(', ')}`).toEqual([]);
  });

  test('the 3-D view opens, so three.js came from the bundle', async ({
    page,
    app,
  }) => {
    const blocked = await blockThirdParty(page);
    await app.boot();

    await app.railControl('toggle3DView');
    await page.locator('#toggle3DView').click();

    // A WebGL canvas, actually created. three.js failing to load used to leave
    // the container empty and a toast on screen.
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const host = document.getElementById('threeViewport');
            const canvas = host?.querySelector('canvas');
            return canvas ? canvas.width * canvas.height : 0;
          }),
        { timeout: 45_000, message: 'the 3-D view never produced a canvas' }
      )
      .toBeGreaterThan(0);

    expect(blocked, `blocked: ${blocked.join(', ')}`).toEqual([]);
  });
});
