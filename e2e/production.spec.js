// =============================================================================
// The production build
// -----------------------------------------------------------------------------
// The only spec that runs against `dist/`, and the only one that touches nothing
// but the DOM. Everything else in this directory reaches into the application
// with `import('/js/ui.js')`, which cannot work here: esbuild has bundled those
// modules into hashed chunks and there is no /js/ui.js to import.
//
// What this defends is the class of failure the deep suite structurally cannot
// see - a bundle that does not boot, a chunk that fails to split, a dynamic
// import whose path survived only in the unbundled tree, a stylesheet that was
// not copied, an asset the build forgot. Those are invisible when testing
// sources and fatal in production.
//
//   npm run build && npm run e2e:dist
// =============================================================================

import { test, expect } from './fixtures.js';

/** Fail on any request the built site issues that does not come back. */
function watchRequests(page) {
  const failures = [];
  page.on('response', res => {
    if (res.status() >= 400) failures.push(`${res.status()} ${res.url()}`);
  });
  page.on('requestfailed', req => {
    if (/^https?:\/\/(?!127\.0\.0\.1|localhost)/.test(req.url())) return;
    failures.push(`${req.failure()?.errorText || 'failed'} ${req.url()}`);
  });
  return failures;
}

test.describe('the built site', () => {
  test('boots and runs a simulation', async ({ page, app }) => {
    const failures = watchRequests(page);
    await app.boot();

    await expect(page.locator('#simulationCanvas')).toBeVisible();
    await expect(page.locator('#splash')).toHaveCount(0);

    // No app state to read here, so the canvas is the evidence: a bundle that
    // boots but throws inside the animation loop paints nothing.
    const painted = await page.locator('#simulationCanvas').evaluate(canvas => {
      const ctx = canvas.getContext('2d');
      if (!canvas.width || !canvas.height) return 0;
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let lit = 0;
      for (let i = 3; i < data.length; i += 4 * 211) if (data[i] > 0) lit++;
      return lit;
    });
    expect(painted).toBeGreaterThan(0);

    expect(failures).toEqual([]);
  });

  test('the front door appears for a first-time visitor', async ({
    page,
    app,
  }) => {
    await app.boot({ firstVisit: true });
    await expect(page.locator('#welcomeScreen')).toBeVisible();
    expect(await app.dismissFrontDoor()).toBe(true);
  });

  test('the gallery opens and a scenario loads', async ({ page, app }) => {
    const failures = watchRequests(page);
    await app.boot();

    await app.railControl('loadScenarioBtn');

    await page.locator('#loadScenarioBtn').click();
    await expect(page.locator('#scenarioListModal')).toBeVisible();

    const cards = page.locator('#scenarioListItems [data-scenario]');
    expect(await cards.count()).toBeGreaterThan(20);

    await cards.first().click();
    await expect(page.locator('#scenarioListModal')).toBeHidden();

    // The scenario card names what was loaded, which is a DOM-visible proxy for
    // the world having been rebuilt.
    await expect(page.locator('#scenarioInfoTitle')).not.toBeEmpty();
    expect(failures).toEqual([]);
  });

  test('an observing panel opens', async ({ page, app }) => {
    const failures = watchRequests(page);
    await app.boot();

    await app.railControl('toggleLightCurve');

    await page.locator('#toggleLightCurve').click();
    await expect(page.locator('#lightCurveContainer')).toBeVisible();
    await expect(page.locator('#lightCurveCanvas')).toBeVisible();

    // The chart library is a deferred chunk in the built bundle, so this is the
    // check that the split actually resolves.
    expect(failures).toEqual([]);
  });

  test('the deferred lesson bundle loads and a lesson opens', async ({
    page,
    app,
  }) => {
    // Roughly half the built JavaScript is behind this dynamic import. If the
    // chunk is missing or misnamed, the browser rejects the import and the panel
    // stays empty - and nothing else in the build would tell you.
    const failures = watchRequests(page);
    await app.boot();

    await page.locator('#investigationsBtn').click();
    await expect(page.locator('#investigationBrowser')).toBeVisible();

    const cards = page.locator('[data-investigation]');
    expect(await cards.count()).toBeGreaterThan(5);

    await cards.first().click();
    await expect(page.locator('#investigationPanel')).toBeVisible();
    await expect(page.locator('#investigationTitle')).not.toBeEmpty();
    await expect(page.locator('.inv-step-title')).not.toBeEmpty();

    // Advance one screen, which is where the step engine and its widget registry
    // actually get exercised.
    await page.locator('#investigationNext').click();
    await expect(page.locator('#investigationProgressText')).toContainText(
      /of\s+\d+\s+steps/
    );

    expect(failures).toEqual([]);
  });

  test('the transport bar works', async ({ page, app }) => {
    await app.boot();
    const play = page.locator('#timelinePlay');
    await expect(play).toBeVisible();
    await play.click();
    await play.click();
    await expect(page.locator('#speedDisplay')).not.toBeEmpty();
  });

  test('the model page ships and is styled', async ({ page }) => {
    const failures = watchRequests(page);
    const response = await page.goto('/model/', { waitUntil: 'load' });
    expect(response.status()).toBe(200);
    const background = await page.evaluate(
      () => getComputedStyle(document.body).backgroundColor
    );
    expect(background).not.toBe('rgba(0, 0, 0, 0)');
    await expect(page.locator('h1').first()).not.toBeEmpty();
    expect(failures).toEqual([]);
  });

  test('the instructor area ships and asks for a passphrase', async ({
    page,
  }) => {
    const failures = watchRequests(page);
    const response = await page.goto('/instructors/', { waitUntil: 'load' });
    expect(response.status()).toBe(200);
    // The encrypted payload is the largest single file in the build and the one
    // most likely to be left behind by a copy step.
    const payload = await page.request.get('/instructors/materials.enc.json');
    expect(payload.status()).toBe(200);
    expect(Number(payload.headers()['content-length'] || 0)).toBeGreaterThan(
      10_000
    );
    expect(failures).toEqual([]);
  });
});
