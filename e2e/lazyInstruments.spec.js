// =============================================================================
// Instrument families fetched on demand, seen from the page
// -----------------------------------------------------------------------------
// No instrument family is part of the lesson engine: js/widgets.js fetches one
// when a step first names one of its instruments. These tests hold what a
// reader can see of that - a loading state that is announced, an instrument
// that arrives, a failure that says so and a retry or reload that recovers,
// an instrument that still draws offline - and, for every lesson, that it
// fetches only the families its steps have named so far.
//
// Runs against the sources and against dist/ (playwright.config.js,
// BOTH_TARGETS). The one difference that matters: under the sources a retry can
// re-import the family under a new URL and recover in place; a bundle's chunk
// names are fixed, so there the retry fails too and the panel offers a reload.
// Both are what the reader should be told, and both are tested.
// =============================================================================

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { test, expect } from './fixtures.js';
import {
  investigationIds,
  loadInvestigation,
} from '../js/data/investigations/registry.js';
import { LAZY_FAMILIES } from '../js/widgets.js';
import { familiesInScript } from '../tools/instrument-families.mjs';

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
 * Any instrument is on screen: the panel open, its canvas shown, and neither
 * the loading state nor a failure in its note. Not every instrument has a
 * slider - some have only buttons, the gravitational-wave lab has none - so
 * this is what "drawn" can mean for all of them.
 */
async function expectInstrument(page) {
  await expect(page.locator('#investigationTool')).toBeVisible();
  const note = page.locator('#investigationToolNote');
  await expect(note).not.toHaveAttribute('role', 'status');
  await expect(note).not.toHaveText(/could not be loaded|Reload the page/);
  await expect(page.locator('#investigationToolCanvas')).toBeVisible();
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

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SERVED = {
  config: DIST ? 'build' : 'sources',
  root: DIST ? path.join(REPO, 'dist') : REPO,
};

/** Widget id -> the family module that owns it, from the manifest. */
const OWNER = Object.fromEntries(
  Object.values(LAZY_FAMILIES).flatMap(f =>
    f.ids.map(id => [id, f.path.replace(/^\.\/|\.js$/g, '')])
  )
);

/**
 * The steps of a lesson that first name each family, in order.
 * @returns {Promise<Array<{step: number, family: string}>>} Zero-based steps
 */
async function familySteps(id) {
  const inv = await loadInvestigation(id);
  const seen = new Set();
  const out = [];
  inv.steps.forEach((step, i) => {
    const family = step.tool ? OWNER[step.tool.id] : null;
    if (family && !seen.has(family)) {
      seen.add(family);
      out.push({ step: i, family });
    }
  });
  return out;
}

/**
 * Every instrument family the page has asked for, from the start.
 *
 * Counted by request rather than by response, so a family is fetched the
 * moment it is asked for; and by module - its own path under the sources,
 * its chunk's source map in a build (tools/instrument-families.mjs).
 */
function recordFamilies(page) {
  const families = new Set();
  page.on('request', req => {
    if (req.resourceType() !== 'script') return;
    for (const f of familiesInScript(req.url(), SERVED)) families.add(f);
  });
  return async () => {
    await page.waitForLoadState('networkidle');
    return [...families].sort();
  };
}

/** The one-based step on screen. */
const stepOnScreen = async page =>
  Number(
    ((
      await page.locator('#investigationBody .inv-step-count').innerText()
    ).match(/\d+/) || [0])[0]
  );

/** Press Next until the step on screen is `target`, one-based. */
async function advanceTo(page, target) {
  for (
    let guard = 0;
    guard < 80 && (await stepOnScreen(page)) < target;
    guard++
  ) {
    const now = await stepOnScreen(page);
    await page.locator('#investigationNext').click();
    await expect
      .poll(() => stepOnScreen(page), { timeout: 20_000 })
      .toBeGreaterThan(now);
  }
  expect(await stepOnScreen(page)).toBe(target);
}

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

test.describe('every lesson fetches only the families its steps name', () => {
  // All of them, in both targets: a family imported eagerly again, or one
  // that pulls in another, shows up as a family fetched early by some lesson,
  // and which lesson it is says where to look.
  for (const id of investigationIds()) {
    test(id, async ({ page }, testInfo) => {
      testInfo.setTimeout(180_000);
      const plan = await familySteps(id);
      const fetched = recordFamilies(page);
      await openLesson(page, id);
      // Its first step fetches the family that step names, or none.
      const first = plan.filter(p => p.step === 0).map(p => p.family);
      if (first.length) await expectInstrument(page);
      expect(await fetched()).toEqual(first);
      // Each later family arrives at the step that first names it, and not
      // before - and nothing else arrives with it.
      const expected = new Set(first);
      for (const { step, family } of plan.filter(p => p.step > 0)) {
        await advanceTo(page, step);
        expect({ before: step + 1, fetched: await fetched() }).toEqual({
          before: step + 1,
          fetched: [...expected].sort(),
        });
        await advanceTo(page, step + 1);
        await expectInstrument(page);
        expected.add(family);
        expect({ at: step + 1, fetched: await fetched() }).toEqual({
          at: step + 1,
          fetched: [...expected].sort(),
        });
      }
    });
  }

  test('the lessons above include ones whose families arrive on the way', async () => {
    // So the loop above is not only lessons with nothing to fetch: some open
    // on an instrument, and some reach a second family later.
    const plans = await Promise.all(investigationIds().map(familySteps));
    expect(plans.filter(p => p.some(s => s.step === 0)).length).toBeGreaterThan(
      0
    );
    expect(plans.filter(p => p.length > 1).length).toBeGreaterThan(0);
    expect(plans.filter(p => p.length === 0).length).toBeGreaterThan(0);
  });
});

test.describe('a family the first step needs', () => {
  // A Universe of Stars opens on the stellar lab, so its family is fetched
  // before the reader has done anything - the case the transit tests above do
  // not reach, where the first thing on screen is the loading state.
  const STELLAR = 'stellarWidgets';
  const isStellar = url => familiesInScript(url, SERVED).includes(STELLAR);

  test('is announced while it is on its way', async ({ page }) => {
    let release;
    const held = new Promise(r => (release = r));
    await page.route(/\.m?js(\?|$)/, async route => {
      if (isStellar(route.request().url())) await held;
      await route.continue();
    });
    await openLesson(page, 'a-universe-of-stars');
    const note = page.locator('#investigationToolNote');
    await expect(note).toHaveAttribute('role', 'status');
    await expect(note).toHaveText('Loading this instrument…');
    // The lesson itself is usable meanwhile: its text and its Next button.
    await expect(page.locator('#investigationBody')).not.toBeEmpty();
    await expect(page.locator('#investigationNext')).toBeEnabled();
    release();
    await expectDrawn(page);
  });

  test('says so when it cannot be fetched, and the offered action recovers', async ({
    page,
    errors,
  }) => {
    let blocked = true;
    await page.route(/\.m?js(\?|$)/, route =>
      blocked && isStellar(route.request().url())
        ? route.abort('failed')
        : route.continue()
    );
    await openLesson(page, 'a-universe-of-stars');
    const note = page.locator('#investigationToolNote');
    await expect(note).toHaveText(/could not be loaded/);
    await expect(note).toHaveAttribute('role', 'status');
    const retry = page.locator('#investigationToolControls button');
    await expect(retry).toHaveText('Try again');
    await expect(retry).toBeFocused();
    if (!DIST) {
      blocked = false;
      await page.keyboard.press('Enter');
      await expectDrawn(page);
    } else {
      await page.keyboard.press('Enter');
      await expect(note).toHaveText(/Reload the page to try again/);
      const reload = page.locator('#investigationToolControls button');
      await expect(reload).toBeFocused();
      blocked = false;
      await reload.click();
      await expect(page.locator('#investigationPanel')).toBeVisible({
        timeout: 60_000,
      });
      await expectDrawn(page);
    }
    errors.consoleErrors.splice(
      0,
      errors.consoleErrors.length,
      ...errors.consoleErrors.filter(
        e => !/Failed to load resource|dynamically imported module/.test(e)
      )
    );
  });
});

/**
 * Wait until the service worker says every precached file is there.
 *
 * What e2e/offline.spec.js waits for, and for the same reason. Reloading and
 * waiting for the page to be controlled raced the install: under load the
 * worker was still fetching eleven megabytes when the page came back, and a
 * page that loaded uncontrolled could wait out the timeout. Sources only, like
 * the precache: it reads js/offline.js.
 */
async function waitForPrecache(page, timeout = 120_000) {
  const deadline = Date.now() + timeout;
  let last = null;
  while (Date.now() < deadline) {
    last = await page.evaluate(async () => {
      const m = await import('/js/offline.js');
      return m.cacheStatus(2000);
    });
    if (last && last.cachedCount >= last.precacheCount) return last;
    await page.waitForTimeout(500);
  }
  throw new Error(`The precache never completed: ${JSON.stringify(last)}`);
}

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
    await waitForPrecache(page);
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

  test('and so does a family first fetched on the way, offline', async ({
    page,
    context,
  }, testInfo) => {
    test.skip(DIST, 'the precache lists the published sources, not the bundle');
    testInfo.setTimeout(180_000);
    // Lives of Stars opens on the stellar lab and reaches the evolution
    // family at its second step. Online, only the first is fetched; offline,
    // the second comes from the precache when the step is reached.
    await openLesson(page, 'lives-of-stars');
    await waitForPrecache(page);
    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#investigationPanel')).toBeVisible({
      timeout: 60_000,
    });
    const at = await stepOnScreen(page);
    if (at < 2) {
      await expectDrawn(page);
      await advanceTo(page, 2);
    }
    await expectDrawn(page);
  });
});
