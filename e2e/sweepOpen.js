// =============================================================================
// Opening a page in a language, ready to be walked
// -----------------------------------------------------------------------------
// Shared by the sweeps (e2e/a11ySweep.spec.js, e2e/a11ySweepII.spec.js): what
// the browser holds when a page opens, and what must be on screen before a walk
// begins. Moved here from the first sweep, unchanged, so that the second does
// not keep a copy.
// =============================================================================

import { readFileSync } from 'node:fs';
import { expect } from './fixtures.js';

const LIBRARY = JSON.parse(readFileSync('library/library.json', 'utf8'));

/** A first-week record as the course home leaves one, from Library entries. */
const weekOf = ids => ({
  v: 1,
  id: 'week-one',
  t: { en: 'Week one', es: 'Semana uno' },
  items: ids.map(id => {
    const e = LIBRARY.entries.find(x => x.id === id);
    const lesson = e.format === 'lesson' ? id.split(':')[1] : null;
    return {
      t: e.title,
      h: e.route,
      ...(lesson ? { l: lesson, n: e.steps } : {}),
    };
  }),
});

/**
 * Open a page in a language and wait until it is ready to be walked.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} path
 * @param {string} locale - 'en' or 'es'
 * @param {object} [o] - What the browser holds when the page opens
 * @param {boolean} [o.firstVisit] - Leave the front door in place
 * @param {boolean} [o.oriented] - The introduction has been seen
 * @param {string[]} [o.firstWeek] - Library entries of a first-week record
 * @param {string} [o.ready] - What must be on screen before the walk begins
 */
export async function open(page, path, locale, o = {}) {
  const storage = { gravitas_locale: locale };
  if (!o.firstVisit) storage.gravitas_welcome_seen_v1 = '1';
  if (o.oriented) storage.gravitas_orientation_seen_v1 = '1';
  if (o.firstWeek)
    storage.gravitas_first_week = JSON.stringify(weekOf(o.firstWeek));
  await page.addInitScript(entries => {
    try {
      // Once: a later page of the same walk must find what this one left.
      if (window.sessionStorage.getItem('walk-seeded')) return;
      window.sessionStorage.setItem('walk-seeded', '1');
      for (const [key, value] of entries)
        window.localStorage.setItem(key, value);
    } catch {
      /* storage unavailable: the page opens in English */
    }
  }, Object.entries(storage));
  await page.goto(path, { waitUntil: 'load' });
  const app = path === '/' || path.startsWith('/#');
  if (app)
    await page.waitForFunction(() => window.splashScreenEnded === true, null, {
      timeout: 30_000,
    });
  if (o.ready) {
    await expect(page.locator(o.ready).first()).toBeVisible({
      timeout: 30_000,
    });
    // Home is a dialog: it takes focus when it has finished opening, and a
    // walk begun before that counts the stops of a page still arranging itself.
    if (app)
      await page.waitForFunction(
        () =>
          document
            .getElementById('welcomeDialog')
            ?.contains(document.activeElement),
        null,
        { timeout: 30_000 }
      );
  } else if (app)
    await page.waitForFunction(
      () =>
        document.querySelector('.ui-container')?.classList.contains('showUI'),
      null,
      { timeout: 30_000 }
    );
  // The page's own modules fill it after load; a walk begun before they have
  // would count the stops of an empty shell.
  await page.waitForLoadState('networkidle').catch(() => {});
}
