// =============================================================================
// The startup lifecycle: one splash per genuine startup (Prompt 124)
// -----------------------------------------------------------------------------
// ACCESSIBILITY.md, "Startup", defines six outcomes. Every test here asserts
// what a reader sees, in order, never that a function ran once:
//   (a) the first full load of the site in a browsing context: the splash
//   (b) an internal navigation, including back and forward and returning to
//       the sandbox: no splash
//   (c) a reload of a page that showed it: none
//   (d) a new tab from outside (typed address, bookmark, external link): once
//   (e) a duplicated tab: none (it inherits the visit's sessionStorage; a
//       browser can not be told to duplicate a tab, so the inherited state is
//       what is simulated)
//   (f) a script that never runs: a visible, usable shell within six seconds
// html[data-startup] is set by an inline script in index.html's head.
// =============================================================================

import { test, expect } from './fixtures.js';

const startup = page =>
  page.evaluate(() => document.documentElement.dataset.startup);
const shellVisible = page =>
  page.evaluate(() => {
    const el = document.querySelector('.gs-shell');
    return !!el && getComputedStyle(el).visibility !== 'hidden';
  });

/** Write the welcome flag before any script runs, as app.boot does. */
async function seen(page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('gravitas_welcome_seen', '1');
    } catch {
      /* storage unavailable */
    }
  });
}

test.describe('a genuine startup (a, d)', () => {
  test('the first load shows the splash, with the shell hidden in the first paint', async ({
    page,
  }) => {
    await seen(page);
    // Recorded in the page itself at the first paint: was the shell hidden?
    await page.addInitScript(() => {
      window.__firstPaint = null;
      new PerformanceObserver(list => {
        if (window.__firstPaint) return;
        const el = document.querySelector('.gs-shell');
        window.__firstPaint = {
          startup: document.documentElement.dataset.startup,
          shell: el ? getComputedStyle(el).visibility : 'absent',
          name: list.getEntries()[0].name,
        };
      }).observe({ type: 'paint', buffered: true });
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    expect(await startup(page)).toBe('splash');
    await page.waitForFunction(() => window.__firstPaint !== null);
    const first = await page.evaluate(() => window.__firstPaint);
    expect(first.startup).toBe('splash');
    expect(first.shell).toBe('hidden');
    // Then the sequence runs and the shell is revealed.
    await page.waitForFunction(() => window.splashScreenEnded === true, null, {
      timeout: 30_000,
    });
    expect(await shellVisible(page)).toBe(true);
    await expect(page.locator('#splash')).toHaveCount(0);
  });

  test('a new tab opened from outside is a startup again; an external referrer too', async ({
    context,
    page,
  }) => {
    await seen(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.splashScreenEnded === true);
    // A typed address in a new tab: a new browsing context, no visit token.
    const typed = await context.newPage();
    await seen(typed);
    await typed.goto('/', { waitUntil: 'domcontentloaded' });
    expect(await startup(typed)).toBe('splash');
    // A link from another site.
    const external = await context.newPage();
    await seen(external);
    await external.goto('/', {
      waitUntil: 'domcontentloaded',
      referer: 'https://example.org/somewhere',
    });
    expect(await startup(external)).toBe('splash');
  });
});

test.describe('a figure frame keeps its own start (embed)', () => {
  test('?embed=1 is a startup even after a visit, so a frame never depends on its host', async ({
    page,
  }) => {
    await seen(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.splashScreenEnded === true);
    await page.goto('/?embed=1', { waitUntil: 'domcontentloaded' });
    expect(await startup(page)).toBe('splash');
  });
});

test.describe('every other load boots revealed (b, c, e) @cross-browser', () => {
  test('a reload after the splash shows none', async ({ page }) => {
    await seen(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.splashScreenEnded === true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    expect(await startup(page)).toBe('skip');
    const t0 = Date.now();
    await page.waitForFunction(() => window.splashScreenEnded === true, null, {
      timeout: 30_000,
    });
    // Far inside the 3.5 s of the sequence it replaces.
    expect(Date.now() - t0).toBeLessThan(2500);
    expect(await shellVisible(page)).toBe(true);
  });

  test('Sandbox, Library, Sandbox, back and forward: the splash runs once', async ({
    page,
  }) => {
    await seen(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    expect(await startup(page)).toBe('splash');
    await page.waitForFunction(() => window.splashScreenEnded === true);

    await page
      .locator('.gs-shell a[href="/library/"]')
      .first()
      .evaluate(a => a.click());
    await page.waitForURL('**/library/');
    await page
      .locator('.gs-shell a[href="/"]')
      .first()
      .evaluate(a => a.click());
    await page.waitForURL(url => new URL(url).pathname === '/');
    expect(await startup(page)).toBe('skip');
    await page.waitForFunction(() => window.splashScreenEnded === true);
    expect(await shellVisible(page)).toBe(true);

    await page.goBack();
    await page.waitForURL('**/library/');
    await page.goForward();
    await page.waitForURL(url => new URL(url).pathname === '/');
    expect(await startup(page)).toBe('skip');
    await page.waitForFunction(() => window.splashScreenEnded === true);
    await expect(page.locator('#splash')).toHaveCount(0);
  });

  test('a deep link followed from inside the site shows none', async ({
    page,
  }) => {
    await seen(page);
    await page.goto('/library/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      location.href = '/#investigation=keplers-laws';
    });
    await page.waitForFunction(() => window.splashScreenEnded === true, null, {
      timeout: 30_000,
    });
    expect(await startup(page)).toBe('skip');
  });

  test('a duplicated tab inherits the visit, so it shows none', async ({
    page,
  }) => {
    await seen(page);
    // A duplicated tab starts with its source's sessionStorage and no way to
    // tell the page it was duplicated; the inherited token is what it has.
    await page.addInitScript(() =>
      sessionStorage.setItem('gravitas_visit', '1')
    );
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    expect(await startup(page)).toBe('skip');
  });
});

test.describe('failure and reduced motion (f, and the policy)', () => {
  test('a script that never loads leaves a usable shell within the bound', async ({
    page,
    errors,
  }) => {
    await seen(page);
    // The aborted request logs one console error, which is the failure itself.
    await page.route('**/js/main.js*', route => route.abort());
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    expect(await startup(page)).toBe('splash');
    expect(await shellVisible(page)).toBe(false);
    await page.waitForFunction(
      () => document.documentElement.dataset.startup === 'failsafe',
      null,
      { timeout: 9000 }
    );
    expect(await shellVisible(page)).toBe(true);
    expect(
      await page.evaluate(
        () => getComputedStyle(document.getElementById('splash')).display
      )
    ).toBe('none');
    // The failure is the one console error this test provokes, and only it.
    expect(errors.consoleErrors).toEqual([
      'Failed to load resource: net::ERR_FAILED',
    ]);
    errors.consoleErrors.length = 0;
  });

  test('reduced motion reveals at once, with nothing moving', async ({
    page,
  }) => {
    await seen(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    expect(await startup(page)).toBe('splash');
    const t0 = Date.now();
    await page.waitForFunction(() => window.splashScreenEnded === true, null, {
      timeout: 30_000,
    });
    expect(Date.now() - t0).toBeLessThan(2000);
    expect(await shellVisible(page)).toBe(true);
  });
});
