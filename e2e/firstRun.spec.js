// =============================================================================
// First run: one overlay at a time, in order, and none twice
// -----------------------------------------------------------------------------
// PLATFORM_MODEL.md, "First run". On a first visit Home comes first and the
// card that names the scenario after it - it used to rise in the moment
// Home's module was loading and sit underneath it. Each closes from the
// keyboard, and a card the reader closed does not come back for the same
// scenario when it is rebuilt. The phone's touch tips, which wait for the
// first touch and for a clear screen, are in mobile.spec.js, the spec that runs
// on a touch profile.
// =============================================================================

import { test, expect } from './fixtures.js';

const CARD = '#scenarioInfoBox';
const shown = page =>
  page.evaluate(
    sel => document.querySelector(sel)?.classList.contains('showUI') ?? false,
    CARD
  );

test.describe('on a first visit', () => {
  test('Home first, and the scenario card only after it', async ({
    page,
    app,
  }) => {
    await app.boot({ firstVisit: true });
    await expect(page.locator('#welcomeScreen')).toBeVisible();
    expect(await shown(page), 'no card under the front door').toBe(false);

    await page.keyboard.press('Escape');
    await expect(page.locator('#welcomeScreen')).toBeHidden();
    await expect.poll(() => shown(page)).toBe(true);
  });

  test('the card closes from the keyboard, and stays closed on a rebuild', async ({
    page,
    app,
  }) => {
    await app.boot({ firstVisit: true });
    await page.keyboard.press('Escape');
    await expect.poll(() => shown(page)).toBe(true);

    await page.keyboard.press('Escape');
    await expect.poll(() => shown(page)).toBe(false);

    // Refresh rebuilds the same scenario. The card was closed for it.
    await page.locator('#refreshScenarioBtn').evaluate(el => el.click());
    await app.waitForFrames(30);
    expect(await shown(page)).toBe(false);
  });
});

test('Home hides the page behind it, and gives back only what it took', async ({
  page,
  app,
}) => {
  await page.addInitScript(() => {
    // Inert before Home opens, as a closed dialog is.
    document.addEventListener('DOMContentLoaded', () => {
      const probe = document.createElement('div');
      probe.id = 'inertProbe';
      probe.setAttribute('inert', '');
      document.body.appendChild(probe);
    });
  });
  await app.boot({ firstVisit: true });
  await expect(page.locator('#welcomeScreen')).toBeVisible();
  // What is announced over Home is still said.
  await expect(page.locator('#srStatus')).not.toHaveAttribute(
    'aria-hidden',
    'true'
  );
  await page.keyboard.press('Escape');
  await expect(page.locator('#welcomeScreen')).toBeHidden();
  // Closing Home used to clear inert from every child of <body>.
  await expect(page.locator('#inertProbe')).toHaveAttribute('inert', '');
});

test('a screen reader hears the scenario by name, not the sentinel', async ({
  page,
  app,
}) => {
  await app.boot();
  await page.locator('#refreshScenarioBtn').evaluate(el => el.click());
  const status = page.locator('#srStatus');
  await expect(status).toContainText('Loaded');
  await expect(status).not.toContainText('None');
});

// P75 F-1, F-2, F-6: the welcome close button covered the shell's Menu button
// (a tap on the visible label closed Home), sat over the Investigations
// browser's text on a phone, and left focus on <body> when it was done.
for (const width of [375, 1024]) {
  test(`the welcome close button leaves Menu reachable at ${width} px, and focus lands somewhere`, async ({
    page,
    app,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await app.boot({ firstVisit: true });
    await expect(page.locator('#welcomeScreen')).toBeVisible();
    const menu = page.locator('.gs-shell .gs-toggle');
    await expect(menu).toBeVisible();
    const hit = await page.evaluate(() => {
      const m = document.querySelector('.gs-shell .gs-toggle');
      const r = m.getBoundingClientRect();
      const at = (fx, fy) => {
        const el = document.elementFromPoint(
          r.left + r.width * fx,
          r.top + r.height * fy
        );
        return !!el && (el === m || m.contains(el));
      };
      const c = document.getElementById('welcomeClose').getBoundingClientRect();
      return {
        centre: at(0.5, 0.5),
        right: at(0.8, 0.5),
        overlap: !(
          c.right <= r.left ||
          c.left >= r.right ||
          c.bottom <= r.top ||
          c.top >= r.bottom
        ),
      };
    });
    expect(hit.centre, 'Menu centre hits Menu').toBe(true);
    expect(hit.right, 'Menu 80% point hits Menu').toBe(true);
    expect(hit.overlap, 'close button and Menu do not overlap').toBe(false);

    await page.keyboard.press('Escape');
    await expect(page.locator('#welcomeScreen')).toBeHidden();
    await expect
      .poll(() => page.evaluate(() => document.activeElement?.tagName))
      .not.toBe('BODY');
  });
}

test('the investigations browser close chip clears its text at 375 px', async ({
  page,
  app,
}) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await app.boot();
  await page.locator('#investigationsBtn').evaluate(el => el.click());
  await expect(page.locator('#investigationBrowser')).toBeVisible();
  const clash = await page.evaluate(() => {
    const chip = document
      .getElementById('investigationBrowserChip')
      .getBoundingClientRect();
    const hit = r =>
      !(
        r.right <= chip.left ||
        r.left >= chip.right ||
        r.bottom <= chip.top ||
        r.top >= chip.bottom
      );
    const out = [];
    for (const el of document.querySelectorAll(
      '#investigationBrowserTitle, .inv-browser-sub, .inv-browser-links'
    )) {
      // A paragraph's box may be wider than its text: measure the text.
      const range = document.createRange();
      range.selectNodeContents(el);
      for (const r of range.getClientRects())
        if (hit(r)) out.push(el.className || el.id);
    }
    return out;
  });
  expect(clash).toEqual([]);
});
