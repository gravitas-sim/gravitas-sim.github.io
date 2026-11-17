// =============================================================================
// Shared helpers for the workflow specs (the 28 files the eleven workflows of
// tools/conformance/product.json name)
// -----------------------------------------------------------------------------
// A workflow spec judges the product through the page: it clicks, types, reads
// what the reader reads, and never asks the page to `import('/js/...')`. That
// is what lets the same file run against the sources and against `dist/`,
// where those modules are hashed chunks with no such path.
//
// What a spec may still read is the application's *data and pure functions* in
// the spec's own Node process, the way e2e/production.spec.js reads DEMOS: the
// answer a lesson's step expects, the record a saved lesson is written as, the
// text of a message key. Those are the oracle the page is judged against, not a
// handle into the page. A state that lives only inside the running page (the
// body lists, the frame counter, a chart's parts) is read from what the page
// shows, or the spec is listed as one that cannot be made DOM-level
// (e2e/README.md, "Workflow specs").
// =============================================================================

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test as base, expect, makeApp } from './fixtures.js';
import { SCENARIO_INFO } from '../js/data/scenarioInfo.js';
import { getInvestigation } from '../js/data/investigations.js';
import { loadInvestigation } from '../js/data/investigations/registry.js';
import { writeProgress } from '../js/investigations/progressSchema.js';

export { getInvestigation, loadInvestigation, writeProgress };

/** The localStorage key one lesson's progress is saved under. */
export const progressKey = id => `gravitas_investigation_${id}`;

/**
 * A lesson's saved progress, written by the application's own writer in this
 * process and stored in the page's localStorage.
 *
 * @param {import('@playwright/test').Page} page - A page on the app's origin
 * @param {string} id - The lesson id
 * @param {object} [fields] - Fields of writeProgress other than `lesson`
 *   (`stepSid`, `visited`, `responses`, `attempts`, `startedAt`, `spent`);
 *   `visited` defaults to every step and `stepSid` to the last one
 * @returns {Promise<object>} The lesson as loaded
 */
export async function storeProgress(page, id, fields = {}) {
  const lesson = await loadInvestigation(id);
  const record = writeProgress({
    lesson,
    responses: {},
    attempts: {},
    visited: lesson.steps.map(s => s.sid),
    stepSid: lesson.steps.at(-1).sid,
    startedAt: null,
    spent: 0,
    ...fields,
  });
  await page.evaluate(
    ([key, text]) => localStorage.setItem(key, text),
    [progressKey(id), JSON.stringify(record)]
  );
  return lesson;
}

const I18N_DIR = new URL('../js/i18n/', import.meta.url);
const catalogs = {};

/**
 * The text of a message key in a language, read from the catalogs in this
 * process (the application's `t()` needs the page). A key that is in no
 * catalog throws, so a typo cannot pass as the key itself.
 *
 * @param {string} key - A message key such as 'inv.answer.correct'
 * @param {string} [locale] - 'en' (default) or 'es'
 * @returns {Promise<string>}
 */
export async function message(key, locale = 'en') {
  if (!catalogs[locale]) {
    const merged = {};
    const names = (await readdir(I18N_DIR)).filter(
      n => n.startsWith(`${locale}.`) && n.endsWith('.js')
    );
    for (const name of names) {
      const mod = await import(new URL(name, I18N_DIR).href);
      for (const value of Object.values(mod))
        if (value && typeof value === 'object' && !Array.isArray(value))
          Object.assign(merged, value);
    }
    catalogs[locale] = merged;
  }
  const text = catalogs[locale][key];
  if (typeof text !== 'string')
    throw new Error(`message(): no "${locale}" text for key "${key}"`);
  return text;
}

/** The localStorage key of the reader's language. */
export const LOCALE_KEY = 'gravitas_locale';

/**
 * Make a language the reader's saved one. Takes effect at the next load, as
 * the reader's own choice does; boot the page again to read it.
 *
 * @param {import('@playwright/test').Page} page - A page on the app's origin
 * @param {string} locale - 'en' or 'es'
 */
export function saveLanguage(page, locale) {
  return page.evaluate(
    ([key, value]) => localStorage.setItem(key, value),
    [LOCALE_KEY, locale]
  );
}

/**
 * A lesson's saved progress record as the page stored it, or null.
 *
 * @param {import('@playwright/test').Page} page - A page on the app's origin
 * @param {string} id - The lesson id
 * @returns {Promise<object|null>}
 */
export async function savedProgress(page, id) {
  const text = await page.evaluate(
    key => localStorage.getItem(key),
    progressKey(id)
  );
  return text ? JSON.parse(text) : null;
}

// =============================================================================
// The DOM-level `app`
// -----------------------------------------------------------------------------
// The legacy `app` of fixtures.js reads and writes the running page through
// `import('/js/ui.js')` and `import('/js/physics.js')`. This one does what a
// reader does and reads what a reader reads, so a spec written against it runs
// against the sources and against `dist/` unchanged:
//
//   loadScenario  opens the gallery and clicks the scenario's card
//   emptyWorld    presses Blank Simulation
//   isPaused      the live readout's run state (#overlayStatus)
//   waitForBodies the live readout's object counts
//   waitForFrames the page paints that many frames and, while running, the
//                 readout's elapsed time moves
//
// "Frames" here are painted frames, not the physics step counter the legacy
// helper waits on: the step counter is inside the page and the page does not
// show it. A scenario's seed is not reachable from the page either, so a world
// loaded here is the scenario's, not the scenario at the suite's fixed seed;
// a spec that needs one exact world says so and is listed as not DOM-level.
// =============================================================================

const READOUT = '#overlayStats';

/** The objects the live readout counts, summed over every kind it lists. */
export async function readoutBodies(page) {
  return page.evaluate(sel => {
    let n = 0;
    for (const b of document.querySelectorAll(`${sel} .readout-count b`))
      n += Number(b.textContent) || 0;
    return n;
  }, READOUT);
}

/** The first metric of the live readout (Elapsed), as text. */
async function elapsedText(page) {
  return page.evaluate(
    sel =>
      document.querySelector(`${sel} .readout-metric dd`)?.textContent ?? '',
    READOUT
  );
}

function makeWorkflowApp(page) {
  const legacy = makeApp(page);
  const app = {
    ...legacy,

    /** Boot without the legacy quality-tier pin, which needs /js/ui.js. */
    async boot(options = {}) {
      // A lesson route makes more than the 250 requests the page's resource
      // timings keep by default; the specs that read them need all of them.
      await page.addInitScript(() =>
        window.performance.setResourceTimingBufferSize(10_000)
      );
      return legacy.boot.call(app, { ...options, qualityTier: null });
    },

    async loadScenario(key, _seed, { run = true } = {}) {
      if (!SCENARIO_INFO[key])
        throw new Error(`loadScenario(): "${key}" is not a scenario key`);
      const modal = page.locator('#scenarioListModal');
      if (!(await modal.isVisible().catch(() => false))) {
        await app.railControl('loadScenarioBtn');
        await page.locator('#loadScenarioBtn').click();
        await expect(modal).toBeVisible();
      }
      await page.locator(`#scenarioListItems [data-scenario="${key}"]`).click();
      await expect(modal).toBeHidden();
      await app.waitForBodies();
      if (!run && !(await app.isPaused())) await app.pressPause();
    },

    async emptyWorld(_seed, { run = true } = {}) {
      await app.railControl('cleanSimBtn');
      await page.locator('#cleanSimBtn').click();
      await expect.poll(() => readoutBodies(page), { timeout: 15_000 }).toBe(0);
      if (!run && !(await app.isPaused())) await app.pressPause();
    },

    async waitForBodies(min = 1, { timeout = 20_000 } = {}) {
      await expect
        .poll(() => readoutBodies(page), {
          timeout,
          message: `the readout counted fewer than ${min} objects`,
        })
        .toBeGreaterThanOrEqual(min);
    },

    async waitForFrames(count = 10, { timeout = 30_000 } = {}) {
      const start = await elapsedText(page);
      await app.waitForPaintedFrames(Math.max(3, Math.ceil(count / 4)), {
        timeout,
      });
      if (!(await app.isPaused()))
        await expect
          .poll(() => elapsedText(page), {
            timeout,
            message: "the readout's elapsed time never moved",
          })
          .not.toBe(start);
    },

    advanceFrames(count = 10) {
      return app.waitForFrames(count);
    },

    /** The readout's elapsed time as text: equal twice means no step between. */
    frameCount() {
      return elapsedText(page);
    },

    async isPaused() {
      return (
        (await page
          .locator('#overlayStatus')
          .getAttribute('data-state')
          .catch(() => null)) === 'paused'
      );
    },

    async setPaused(paused) {
      if ((await app.isPaused()) !== paused)
        await app.press(page.locator('#timelinePlay'));
      await expect.poll(() => app.isPaused(), { timeout: 10_000 }).toBe(paused);
    },

    /** The shared observer's geometry, as the panels' own sliders show it. */
    async observerGeometry() {
      return page.evaluate(() => {
        const host = document.querySelector('.obs-controls [data-inc-slider]');
        const root = host?.closest('.obs-controls');
        return {
          positionAngle: Number(
            root?.querySelector('[data-pa-slider]')?.value ?? NaN
          ),
          inclination: Number(host?.value ?? NaN),
        };
      });
    },

    /** Move the observer the way a reader does: drag a panel's sliders. */
    async setObserver({ positionAngle, inclination }) {
      await page.evaluate(
        ([pa, inc]) => {
          const root = document.querySelector('.obs-controls');
          const set = (selector, value) => {
            const el = root?.querySelector(selector);
            if (!el || value === undefined) return;
            el.value = String(value);
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          };
          set('[data-pa-slider]', pa);
          set('[data-inc-slider]', inc);
        },
        [positionAngle, inclination]
      );
    },

    /** What the readout shows: a count, and no unreadable number. */
    async bodySnapshot() {
      return {
        count: await readoutBodies(page),
        nonFinite: await page.evaluate(
          sel =>
            [...document.querySelectorAll(`${sel} dd, ${sel} b`)].filter(el =>
              /NaN|Infinity/.test(el.textContent)
            ).length,
          READOUT
        ),
      };
    },
  };
  return app;
}

export const test = base.extend({
  app: async ({ page }, use) => {
    await use(makeWorkflowApp(page));
  },
});

export { expect };
export { openMore, openObjectsList, STORAGE_KEYS } from './fixtures.js';

const ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

/**
 * The text of a piece of markup as the page's `textContent` would give it:
 * tags gone, entities decoded. For the lesson prose the specs compare with.
 *
 * @param {string} html - Markup
 * @returns {string}
 */
export function plainText(html) {
  return String(html ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (whole, name) => {
      if (name[0] === '#') {
        const code =
          name[1].toLowerCase() === 'x'
            ? parseInt(name.slice(2), 16)
            : parseInt(name.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
      }
      return ENTITIES[name.toLowerCase()] ?? whole;
    });
}

/** The page's own language, as the document declares it ('en' or 'es'). */
export async function pageLanguage(page) {
  const lang = await page.evaluate(() => document.documentElement.lang || 'en');
  return lang.toLowerCase().startsWith('es') ? 'es' : 'en';
}

/**
 * A string that is in one source file and in no other file of `js/`: 40 ASCII
 * characters of a string literal, with no quote or backslash. A bundler renames
 * and merges files but leaves string contents alone, so the string finds the
 * file's contents wherever the build put them.
 *
 * @param {string} file - A path under the repository root
 * @returns {Promise<string>}
 */
export async function markerFrom(file) {
  const files = [];
  const walk = async dir => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (entry.name.endsWith('.js')) files.push(path);
    }
  };
  await walk(join(process.cwd(), 'js'));
  const texts = await Promise.all(files.map(f => readFile(f, 'utf8')));
  const own = await readFile(join(process.cwd(), file), 'utf8');
  // Text inside a string literal: a minifier rewrites numbers and layout but
  // not the characters of a string.
  const literal = /(['"`])((?:(?!\1)[ -&(-[\]-~]){40,})\1/g;
  const found = [...own.matchAll(literal)]
    .map(m => m[2].slice(0, 40))
    .find(c => texts.filter(t => t.includes(c)).length === 1);
  if (!found) throw new Error(`no marker string unique to ${file}`);
  return found;
}

/**
 * How many of the page's script requests so far carried a marker string,
 * read from what the page fetched (its resource timings, then each script's
 * text from the cache), so it is the same question against the sources and
 * the build.
 *
 * @param {import('@playwright/test').Page} page - The page under test
 * @param {string} marker - From markerFrom
 * @returns {Promise<number>}
 */
export function scriptsCarrying(page, marker) {
  return page.evaluate(async needle => {
    const urls = performance
      .getEntriesByType('resource')
      .map(r => r.name)
      .filter(n => /\.m?js(\?|$)/.test(n));
    let count = 0;
    for (const url of urls) {
      const text = await window
        .fetch(url, { cache: 'force-cache' })
        .then(r => r.text())
        .catch(() => '');
      if (text.includes(needle)) count++;
    }
    return count;
  }, marker);
}
