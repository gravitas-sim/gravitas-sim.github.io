// =============================================================================
// Three capabilities that arrive through their packages, seen from the page
// -----------------------------------------------------------------------------
// The platform package gate's prototype routes three built-in capabilities
// through capabilities/*.json and js/platform/resolver.js: the power-law
// instruments, the SDSS spectra and the power-law lesson. Their own specs hold
// what each does; this holds the gate's browser thresholds - that each still
// arrives and works in the sources and in dist/ (T4, T5), that no hashed chunk
// name reaches the address or saved work (T5), and that a packaged instrument
// still draws offline once precached (T6).
//
// DOM only, so it runs against dist/ too (playwright.config.js, BOTH_TARGETS).
// =============================================================================

import { test, expect } from './fixtures.js';

const DIST = process.env.GRAVITAS_E2E_TARGET === 'dist';
const CHUNK = /chunk-[A-Z0-9]{6,}/;

async function openLesson(page, id, url = '/') {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('gravitas_welcome_seen_v1', '1');
    } catch {
      /* the lesson still opens */
    }
  });
  await page.goto(`${url}#investigation=${id}`, {
    waitUntil: 'domcontentloaded',
  });
  await expect(page.locator('#investigationPanel')).toBeVisible({
    timeout: 60_000,
  });
}

/** Press Next until the counter shows `target`, one-based. */
async function advanceTo(page, target) {
  const step = async () =>
    Number(
      ((
        await page.locator('#investigationBody .inv-step-count').innerText()
      ).match(/\d+/) || [0])[0]
    );
  for (let guard = 0; guard < 60 && (await step()) < target; guard++) {
    const now = await step();
    await page.locator('#investigationNext').click();
    await expect.poll(step, { timeout: 20_000 }).toBeGreaterThan(now);
  }
}

test.describe('capabilities that arrive through their packages', () => {
  test('the packaged lesson opens and its packaged instrument draws', async ({
    page,
  }) => {
    await openLesson(page, 'power-law-gravity');
    await advanceTo(page, 4);
    await expect(page.locator('#investigationTool')).toBeVisible();
    await expect(
      page.locator('#investigationToolControls input').first()
    ).toBeVisible();
    await expect(page.locator('#investigationToolReadout')).not.toBeEmpty();
  });

  test('the packaged observations reach their instrument', async ({ page }) => {
    await openLesson(page, 'a-universe-of-stars');
    await advanceTo(page, 30);
    const readout = page.locator('#investigationToolReadout');
    // Drawn from the data, not the waiting state: a measured depth, in words.
    await expect(readout).toContainText(/Observations/i, { timeout: 30_000 });
    await expect(readout).toContainText(/\d+\.\d%/);
  });

  test('no build chunk reaches the address or saved work', async ({ page }) => {
    await openLesson(page, 'power-law-gravity');
    await advanceTo(page, 4);
    await expect(
      page.locator('#investigationToolControls input').first()
    ).toBeVisible();
    const state = await page.evaluate(() => ({
      href: location.href,
      saved: JSON.stringify({ ...localStorage }),
    }));
    // The lesson did save something, so this is not an empty comparison.
    expect(state.saved).toMatch(/power-law-gravity/);
    expect(state.href).not.toMatch(CHUNK);
    expect(state.saved).not.toMatch(CHUNK);
  });
});

test.describe('offline, with the packages precached', () => {
  test.use({ serviceWorkers: 'allow' });

  test('the packaged instrument still draws with no network', async ({
    page,
    context,
  }, testInfo) => {
    // The service worker precaches the published sources; dist/ ships none.
    test.skip(DIST, 'the precache lists the published sources, not the bundle');
    testInfo.setTimeout(180_000);
    await openLesson(page, 'power-law-gravity');
    // Synchronous predicates only: an async one returns a Promise, which is
    // truthy, so the wait would pass before anything was ready.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => Boolean(window.navigator.serviceWorker?.controller),
      null,
      { timeout: 120_000 }
    );
    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#investigationPanel')).toBeVisible({
      timeout: 60_000,
    });
    await advanceTo(page, 4);
    await expect(
      page.locator('#investigationToolControls input').first()
    ).toBeVisible();
  });
});
