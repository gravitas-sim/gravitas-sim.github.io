// =============================================================================
// Requests, assets and the pages outside the app
// -----------------------------------------------------------------------------
// The checks a browser can make that a file scan cannot: whether the requests a
// page actually issues all succeed, whether images decode, and whether the
// document pages load with their stylesheets.
//
// tools/check-links.mjs covers the static half of this - every reference in
// every HTML file resolving to a file that exists - and runs in the fast job.
// This covers what only a running page knows: dynamically imported chunks,
// fetches issued by scripts, and fonts.
// =============================================================================

import { test, expect } from './fixtures.js';

/** Watch every request a page makes and report the ones that failed. */
function watchRequests(page) {
  const failures = [];
  page.on('response', res => {
    if (res.status() >= 400) {
      failures.push(`${res.status()} ${res.url()}`);
    }
  });
  page.on('requestfailed', req => {
    const why = req.failure()?.errorText || 'failed';
    // A test that fails because a CDN was unreachable is a test people learn to
    // ignore, so third-party hosts are excluded. Everything served by this
    // repository is not.
    if (/^https?:\/\/(?!127\.0\.0\.1|localhost)/.test(req.url())) return;
    failures.push(`${why} ${req.url()}`);
  });
  return failures;
}

test.describe('the application loads everything it asks for', () => {
  test(
    'booting issues no failed requests',
    { tag: '@cross-browser' },
    async ({ page, app }) => {
      const failures = watchRequests(page);
      await app.boot();
      await app.waitForFrames(20);
      expect(failures).toEqual([]);
    }
  );

  test('the deferred lesson code loads on demand', async ({ page, app }) => {
    // Half the application by weight is behind a dynamic import. A chunk that
    // fails to resolve leaves the lesson browser empty and logs nothing useful.
    const failures = watchRequests(page);
    await app.boot();
    await page.locator('#investigationsBtn').click();
    await expect(page.locator('#investigationBrowser')).toBeVisible();
    await expect(page.locator('[data-investigation]').first()).toBeVisible();
    expect(failures).toEqual([]);
  });

  test(
    'the chart panels load their deferred dependency',
    { tag: '@cross-browser' },
    async ({ page, app }) => {
      const failures = watchRequests(page);
      await app.boot();
      await app.loadScenario('Transit Lab');
      await app.openPanel('toggleLightCurve', 'lightCurveContainer');
      await app.waitForFrames(30);
      expect(failures).toEqual([]);
    }
  );

  test('every scenario thumbnail decodes', async ({ page, app }) => {
    // The file existing is checked by npm run thumbnails:check. This checks the
    // browser can actually decode it, which a truncated or mislabelled .webp
    // fails while still being a file of the right name and a plausible size.
    await app.boot();
    await app.railControl('loadScenarioBtn');
    await page.locator('#loadScenarioBtn').click();
    await expect(page.locator('#scenarioListModal')).toBeVisible();

    const report = await page.evaluate(async () => {
      const imgs = [...document.querySelectorAll('#scenarioListItems img')];
      // Force everything to load rather than trusting lazy loading to have run.
      // Firefox will not load an off-screen lazy image at all, so without this
      // the wait below never resolves and the test hangs rather than failing.
      for (const img of imgs) img.loading = 'eager';
      await Promise.all(
        imgs.map(
          img =>
            new Promise(done => {
              if (img.complete) return done();
              img.addEventListener('load', done, { once: true });
              img.addEventListener('error', done, { once: true });
              setTimeout(done, 5000);
            })
        )
      );
      return {
        total: imgs.length,
        broken: imgs
          .filter(img => img.naturalWidth === 0)
          .map(img => img.getAttribute('src')),
      };
    });

    expect(report.total).toBeGreaterThan(20);
    expect(report.broken).toEqual([]);
  });
});

test.describe('the document pages', () => {
  for (const [name, path] of [
    ['the model page', '/model/'],
    ['the instructor area', '/instructors/'],
  ]) {
    test(
      `${name} loads and is styled`,
      { tag: '@cross-browser' },
      async ({ page }) => {
        const failures = watchRequests(page);
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));

        const response = await page.goto(path, { waitUntil: 'load' });
        expect(response.status()).toBe(200);

        // A stylesheet that 404s leaves a readable but unstyled page, which is the
        // kind of break that survives review.
        const styled = await page.evaluate(
          () => getComputedStyle(document.body).backgroundColor
        );
        expect(styled).not.toBe('');
        expect(styled).not.toBe('rgba(0, 0, 0, 0)');

        await expect(page.locator('h1').first()).not.toBeEmpty();
        expect(failures).toEqual([]);
        expect(errors).toEqual([]);
      }
    );
  }

  test(
    'the model page anchors all resolve',
    { tag: '@cross-browser' },
    async ({ page }) => {
      // Its table of contents is the navigation for a long document; a dead anchor
      // silently does nothing when clicked.
      await page.goto('/model/', { waitUntil: 'load' });
      const dead = await page.evaluate(() =>
        [...document.querySelectorAll('a[href^="#"]')]
          .map(a => a.getAttribute('href').slice(1))
          .filter(id => id && !document.getElementById(id))
      );
      expect(dead).toEqual([]);
    }
  );
});
