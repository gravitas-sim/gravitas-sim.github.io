// =============================================================================
// Instrument families fetched on demand, seen from the page
// -----------------------------------------------------------------------------
// The transit and power-law families are no longer part of the lesson engine:
// js/widgets.js fetches one when a step names one of its instruments. These
// tests hold what a reader can see of that - a loading state that is announced,
// an instrument that arrives, a failure that says so and a retry or reload that
// recovers - and that a lesson which names neither family never fetches one.
//
// Runs against the sources and against dist/ (playwright.config.js,
// BOTH_TARGETS). The one difference that matters: under the sources a retry can
// re-import the family under a new URL and recover in place; a bundle's chunk
// names are fixed, so there the retry fails too and the panel offers a reload.
// Both are what the reader should be told, and both are tested.
// =============================================================================

import { test, expect } from './fixtures.js';

const DIST = process.env.GRAVITAS_E2E_TARGET === 'dist';

/** A string only the transit family's implementation contains. */
const TRANSIT_MARK = 'blockedFraction';
/** And one only the power-law family's does. */
const POWER_LAW_MARK = 'stabilityBoundary';
/** And the GWOSC event family's, which is in it and its strain data only. */
const GW_EVENTS_MARK = 'strainVersion';

async function openLesson(page, id) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('gravitas_welcome_seen_v1', '1');
    } catch {
      /* the lesson still opens */
    }
  });
  await page.goto(`/#investigation=${id}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#investigationPanel')).toBeVisible({
    timeout: 60_000,
  });
}

async function next(page, times) {
  for (let i = 0; i < times; i++) {
    await page.locator('#investigationNext').click();
  }
}

/** The instrument is drawn: panel open, controls rendered, nothing pending. */
async function expectDrawn(page) {
  await expect(page.locator('#investigationTool')).toBeVisible();
  await expect(
    page.locator('#investigationToolControls input').first()
  ).toBeVisible();
  await expect(page.locator('#investigationToolNote')).not.toHaveAttribute(
    'role',
    'status'
  );
}

/**
 * Record every script the page fetches, with its text, from before it opens.
 *
 * Read from the network, not from the resource-timing buffer. That buffer
 * holds 250 entries and then drops new ones in silence; a lesson under the
 * sources fetches about 180 resources before its first screen, and a first
 * look that fetched every script again to read it filled the buffer, so the
 * second look could not see the family it was looking for. The same fault
 * would make "never fetches one" pass for a page that had fetched it.
 */
function recordScripts(page) {
  const texts = [];
  // A response arrives before its body does; count a body only once read.
  const reading = new Set();
  page.on('response', res => {
    if (res.request().resourceType() !== 'script') return;
    const read = res
      .text()
      .then(
        text => texts.push(text),
        () => {
          /* navigated away mid-body */
        }
      )
      .finally(() => reading.delete(read));
    reading.add(read);
  });
  return async () => {
    await page.waitForLoadState('networkidle');
    while (reading.size) await Promise.allSettled([...reading]);
    return [...texts];
  };
}
const contains = (texts, mark) => texts.some(t => t.includes(mark));

test.describe('instrument families fetched on demand', () => {
  test('a lesson that names neither family never fetches one', async ({
    page,
  }) => {
    const scriptsSoFar = recordScripts(page);
    await openLesson(page, 'keplers-laws');
    await next(page, 3);
    const scripts = await scriptsSoFar();
    // Not vacuous: the lesson engine itself is among what was read.
    expect(contains(scripts, 'investigationNext')).toBe(true);
    expect(contains(scripts, TRANSIT_MARK)).toBe(false);
    expect(contains(scripts, POWER_LAW_MARK)).toBe(false);
    expect(contains(scripts, GW_EVENTS_MARK)).toBe(false);
  });

  test('a lesson fetches the family its step names, and only that one', async ({
    page,
  }) => {
    const scriptsSoFar = recordScripts(page);
    await openLesson(page, 'transit-photometry');
    // Before the instrument step, the family has not been fetched.
    expect(contains(await scriptsSoFar(), TRANSIT_MARK)).toBe(false);
    await next(page, 5);
    await expectDrawn(page);
    const after = await scriptsSoFar();
    expect(contains(after, TRANSIT_MARK)).toBe(true);
    expect(contains(after, POWER_LAW_MARK)).toBe(false);
    expect(contains(after, GW_EVENTS_MARK)).toBe(false);
  });

  test('while the family is on its way, the panel says so to a screen reader', async ({
    page,
  }) => {
    await openLesson(page, 'power-law-gravity');
    await page.waitForLoadState('networkidle');
    // Hold every script requested from here on, so the loading state stays up
    // long enough to be read.
    let release;
    const held = new Promise(r => (release = r));
    await page.route(/\.m?js(\?|$)/, async route => {
      await held;
      await route.continue();
    });
    await next(page, 3);
    const note = page.locator('#investigationToolNote');
    await expect(note).toHaveAttribute('role', 'status');
    await expect(note).toHaveText('Loading this instrument…');
    release();
    await expectDrawn(page);
  });

  test('a family that fails to load says so, and the offered action recovers', async ({
    page,
    errors,
  }) => {
    await openLesson(page, 'transit-photometry');
    await page.waitForLoadState('networkidle');
    // Fail only what carries the family's code, found by its content because a
    // bundle's chunk names are not known in advance. Failing every script would
    // also fail imports the page makes on its own schedule - in dist/ a
    // settings chunk arrives late and its import is not this test's subject.
    let blocked = true;
    await page.route(/\.m?js(\?|$)/, async route => {
      if (!blocked) return route.continue();
      const response = await route.fetch();
      const body = await response.text();
      if (body.includes(TRANSIT_MARK)) return route.abort('failed');
      return route.fulfill({ response, body });
    });
    await next(page, 5);
    const note = page.locator('#investigationToolNote');
    await expect(note).toHaveText(/could not be loaded/);
    await expect(note).toHaveAttribute('role', 'status');
    const retry = page.locator('#investigationToolControls button');
    await expect(retry).toHaveText('Try again');
    await expect(retry).toBeFocused();

    if (!DIST) {
      // The sources: a retry under a new URL recovers without a reload.
      blocked = false;
      await page.keyboard.press('Enter');
      await expectDrawn(page);
    } else {
      // A bundle: the retry cannot name a new chunk, so it fails too, and the
      // panel stops offering something that cannot work.
      await page.keyboard.press('Enter');
      await expect(note).toHaveText(/Reload the page to try again/);
      const reload = page.locator('#investigationToolControls button');
      await expect(reload).toHaveText('Reload the page');
      await expect(reload).toBeFocused();
      blocked = false;
      await reload.click();
      await expect(page.locator('#investigationPanel')).toBeVisible({
        timeout: 60_000,
      });
      // The reader's place and answers survive the reload; the instrument
      // draws once the step is reached again.
      if (!(await page.locator('#investigationTool').isVisible())) {
        await next(page, 5);
      }
      await expectDrawn(page);
    }
    // The aborted requests are the point of this test, not a fault in it.
    errors.consoleErrors.splice(
      0,
      errors.consoleErrors.length,
      ...errors.consoleErrors.filter(
        e => !/Failed to load resource|dynamically imported module/.test(e)
      )
    );
  });
});

test.describe('offline, with the family precached', () => {
  test.use({ serviceWorkers: 'allow' });

  test('a lazily loaded instrument still draws with no network', async ({
    page,
    context,
  }, testInfo) => {
    // The service worker precaches the source tree; dist/ is not what is
    // published and is not what it precaches.
    test.skip(DIST, 'the precache lists the published sources, not the bundle');
    testInfo.setTimeout(180_000);
    await openLesson(page, 'transit-photometry');
    await page.waitForFunction(
      async () => {
        const reg = await window.navigator.serviceWorker?.ready;
        return Boolean(reg?.active);
      },
      null,
      { timeout: 120_000 }
    );
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() =>
      Boolean(window.navigator.serviceWorker?.controller)
    );
    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#investigationPanel')).toBeVisible({
      timeout: 60_000,
    });
    if (!(await page.locator('#investigationTool').isVisible())) {
      await next(page, 5);
    }
    await expectDrawn(page);
  });
});
