// =============================================================================
// The shared shell, in a browser (Roadmap II Prompt 50)
// -----------------------------------------------------------------------------
// tests/shell.test.js holds the markup; this holds what a reader does with it:
// open a group and follow a link, by mouse and by keyboard; close it with
// Escape or a click elsewhere; choose a theme and a language on one page and
// find them on the next two; fold it all behind Menu on a phone.
// =============================================================================

import { test, expect } from './fixtures.js';
import { stepKey } from './keyboard.js';

const groups = page => page.locator('.gs-group');
const openGroups = page =>
  page.evaluate(
    () => [...document.querySelectorAll('.gs-group')].filter(d => d.open).length
  );

test.describe('the shell', () => {
  test('a group opens, one at a time, and Escape or a click elsewhere closes it', async ({
    page,
  }) => {
    await page.goto('/model/', { waitUntil: 'load' });
    await expect(page.locator('.gs-controls')).toBeVisible();

    await groups(page).nth(0).locator('summary').click();
    await expect(groups(page).nth(0)).toHaveAttribute('open', '');
    await groups(page).nth(4).locator('summary').click();
    await expect(groups(page).nth(4)).toHaveAttribute('open', '');
    expect(await openGroups(page)).toBe(1);

    await page.keyboard.press('Escape');
    await expect.poll(() => openGroups(page)).toBe(0);
    await expect(groups(page).nth(4).locator('summary')).toBeFocused();

    await groups(page).nth(1).locator('summary').click();
    await page.locator('h1').click();
    await expect.poll(() => openGroups(page)).toBe(0);
  });

  test('every page is two activations away, by mouse', async ({ page }) => {
    await page.goto('/model/', { waitUntil: 'load' });
    await groups(page).nth(3).locator('summary').click();
    await page
      .locator('.gs-nav a[href="/teaching/"]')
      .filter({ visible: true })
      .click();
    await expect(page).toHaveURL(/\/teaching\/$/);
    await expect(
      page.locator('.gs-nav a[aria-current="page"]')
    ).toHaveAttribute('href', '/teaching/');
  });

  test('the Investigations entry opens the lesson chooser', async ({
    page,
    app,
  }) => {
    await app.boot();
    await page.goto('/model/', { waitUntil: 'load' });
    await groups(page).nth(0).locator('summary').click();
    await page
      .locator('.gs-nav a[href="/#investigations"]')
      .filter({ visible: true })
      .click();
    await page.waitForFunction(() => window.splashScreenEnded === true);
    await expect(page.locator('#investigationBrowser')).toBeVisible({
      timeout: 30_000,
    });
  });

  test('and by keyboard', async ({ page, browserName }) => {
    await page.goto('/validation/', { waitUntil: 'load' });
    // The skip link first, then Home, then the first group.
    await page.keyboard.press(stepKey(browserName));
    await expect(page.locator('.gs-skip')).toBeFocused();
    const learn = groups(page).nth(0).locator('summary');
    await learn.focus();
    await page.keyboard.press('Enter');
    await expect(groups(page).nth(0)).toHaveAttribute('open', '');
    await page.keyboard.press(stepKey(browserName));
    const link = page.locator('.gs-nav details[open] a').first();
    await expect(link).toBeFocused();
  });

  test('the skip link goes to the content', async ({ page }) => {
    await page.goto('/model/', { waitUntil: 'load' });
    await page.locator('.gs-skip').focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#main$/);
  });

  test('a theme and a language chosen on one page hold on the next two', async ({
    page,
  }) => {
    await page.goto('/teaching/', { waitUntil: 'load' });
    await expect(page.locator('#teachDemos article').first()).toBeVisible();

    await page.locator('[data-gs-theme]').selectOption('daylight');
    await expect(page.locator('html')).toHaveAttribute(
      'data-theme',
      'daylight'
    );
    await page.locator('[data-gs-lang]').selectOption('es');
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    // The shell speaks the page's language without a reload.
    await expect(groups(page).nth(0).locator('summary .gs-es')).toBeVisible();
    await expect(groups(page).nth(0).locator('summary .gs-en')).toBeHidden();

    for (const next of ['/model/', '/validation/']) {
      await page.goto(next, { waitUntil: 'load' });
      await expect(page.locator('html')).toHaveAttribute(
        'data-theme',
        'daylight'
      );
      await expect(page.locator('[data-gs-theme]')).toHaveValue('daylight');
      // English-only pages: the choice is kept, and shown, but the page and
      // its shell stay in the language the page is written in.
      await expect(page.locator('[data-gs-lang]')).toHaveValue('es');
      await expect(groups(page).nth(0).locator('summary .gs-en')).toBeVisible();
    }

    await page.goto('/teaching/', { waitUntil: 'load' });
    await expect(page.locator('h1')).toHaveText('Enseñar con Gravitas');
    await expect(page.locator('[data-gs-theme] option:checked')).toHaveText(
      'Luz de día'
    );
  });

  test('a page whose route cannot pay for the module still navigates', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('gravitas_theme', 'deep');
      } catch {
        /* storage unavailable */
      }
    });
    await page.goto('/evaluation/', { waitUntil: 'load' });
    // The theme is applied by the head script, not the module.
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'deep');
    await expect(page.locator('.gs-controls')).toBeHidden();
    await groups(page).nth(4).locator('summary').click();
    await expect(
      page.locator('.gs-nav a[href="/model/"]').filter({ visible: true })
    ).toBeVisible();
  });

  test('on a phone it folds behind Menu, and nothing scrolls sideways', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 740 });
    await page.goto('/model/', { waitUntil: 'load' });
    const menu = page.locator('.gs-toggle');
    await expect(menu).toBeVisible();
    await expect(page.locator('.gs-nav')).toBeHidden();
    await menu.click();
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('.gs-nav')).toBeVisible();
    await groups(page).nth(2).locator('summary').click();
    await expect(
      page.locator('.gs-nav a[href="/studio/"]').filter({ visible: true })
    ).toBeVisible();
    const wide = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(wide).toBe(false);
  });
});

// =============================================================================
// The application template (Prompt 50, Part 3)
// -----------------------------------------------------------------------------
// The canvas stays full-bleed; the bar is fixed over it, and everything the
// application anchors to the top moves down by --shell-height.
// =============================================================================

/** What the application places from the top of the window. */
const TOP_ANCHORED = [
  '#overlay',
  '#mainControls',
  '#mobileMenuToggle',
  '#scenarioInfoDisplay',
  '#scenarioInfoBox',
  '#objectInspector',
  '.investigation-panel',
];

test.describe('the shell on the application', () => {
  for (const [width, height] of [
    [1440, 900],
    [1024, 768],
    [768, 1024],
    [375, 740],
  ]) {
    test(`at ${width} px nothing the application draws starts under the bar`, async ({
      page,
      app,
    }) => {
      await page.setViewportSize({ width, height });
      await app.boot();
      await expect(page.locator('#mainControls')).toHaveClass(/showUI/);
      const got = await page.evaluate(sels => {
        const bar = document.querySelector('.gs-shell').getBoundingClientRect();
        const canvas = document
          .getElementById('simulationCanvas')
          .getBoundingClientRect();
        const under = [];
        for (const s of sels) {
          const e = document.querySelector(s);
          if (!e) continue;
          const cs = getComputedStyle(e);
          const r = e.getBoundingClientRect();
          if (cs.display === 'none' || cs.visibility === 'hidden' || !r.height)
            continue;
          // Under the bar means sharing its box: beside it is fine, which is
          // where the docked rail sits on a wide window.
          const overlaps =
            r.top < bar.bottom - 0.5 &&
            r.bottom > bar.top + 0.5 &&
            r.left < bar.right - 0.5 &&
            r.right > bar.left + 0.5;
          if (overlaps) under.push(`${s} at ${r.top},${r.left}`);
        }
        return {
          under,
          barBottom: bar.bottom,
          canvasTop: canvas.top,
          canvasHeight: canvas.height,
          innerHeight: window.innerHeight,
          wide: document.documentElement.scrollWidth > window.innerWidth,
        };
      }, TOP_ANCHORED);
      expect(got.under).toEqual([]);
      expect(got.barBottom).toBe(48);
      // The canvas does not move: it still fills the window behind the bar.
      expect(got.canvasTop).toBe(0);
      expect(got.canvasHeight).toBe(got.innerHeight);
      expect(got.wide).toBe(false);
    });
  }

  test('the theme switch is the application theme, and follows the T shortcut', async ({
    page,
    app,
  }) => {
    await app.boot();
    await page.locator('[data-gs-theme]').selectOption('daylight');
    await expect(page.locator('html')).toHaveAttribute(
      'data-theme',
      'daylight'
    );
    expect(
      await page.evaluate(() => localStorage.getItem('gravitas_theme'))
    ).toBe('daylight');
    // js/theme.js cycles on T; the select follows the theme, not its clicks.
    await page
      .locator('#simulationCanvas')
      .click({ position: { x: 5, y: 300 } });
    await page.keyboard.press('t');
    await expect(page.locator('[data-gs-theme]')).not.toHaveValue('daylight');
  });

  test('the language switch translates the application in place', async ({
    page,
    app,
  }) => {
    await app.boot();
    const learn = page.locator('#railLearn [data-i18n="rail.railLearn"]');
    await expect(learn).toHaveText('Learn');
    await page.evaluate(() => {
      window.__stillHere = true;
    });
    await page.locator('[data-gs-lang]').selectOption('es');
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(learn).toHaveText('Aprender');
    // In place: the page was not reloaded.
    expect(await page.evaluate(() => window.__stillHere)).toBe(true);
  });

  test('an embedded figure and a lecture have no bar', async ({
    page,
    app,
  }) => {
    await app.boot({ url: '/?embed=1' });
    await expect(page.locator('.gs-shell')).toBeHidden();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.splashScreenEnded === true);
    await expect(page.locator('#mainControls')).toHaveClass(/showUI/);
    await page
      .locator('#simulationCanvas')
      .click({ position: { x: 5, y: 300 } });
    await page.keyboard.press('v');
    await expect(page.locator('body')).toHaveAttribute(
      'data-presentation',
      'lecture'
    );
    await expect(page.locator('.gs-shell')).toBeHidden();
    await expect(page.locator('#overlay')).toBeVisible();
    // The readout eases to its lecture place (a 0.3 s transition), up into
    // the room the bar left.
    await expect
      .poll(() =>
        page.locator('#overlay').evaluate(e => e.getBoundingClientRect().top)
      )
      .toBeLessThan(48);
  });
});
