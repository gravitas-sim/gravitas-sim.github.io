// =============================================================================
// A measurement screen, at every size somebody teaches on
// -----------------------------------------------------------------------------
// The failure this exists to catch is specific and silent: a lesson step that
// asks for a number, on a screen where the box to type it into is off the
// bottom, under something, or narrower than a finger. The step is then not
// hard - it is impossible - and nothing in the application says so.
//
// One screen is checked rather than many, and it is deliberately the most
// crowded one in the catalog: a docked instrument with its own canvas and
// readout, a scatter plot with its table of points, eight response fields, the
// object list, and the main simulation behind all of it. If the layout holds
// there it holds on a page of prose.
//
// The sizes are the ones people actually teach on, not a sweep: a small phone
// held in portrait, a current phone, a tablet, a low laptop, the two common
// laptop widths, and a projector. In both languages, because Spanish runs
// about a third longer than English and a label that fits in one can push a
// control off the other.
//
// What is asserted, per size
// -----------------------------------------------------------------------------
//   nothing pushes the document sideways
//   the instrument's canvas is on screen and inside the viewport
//   the readout, the plot table, a response field and Next can all be reached
//   the things a finger has to hit are at least 32 px tall
//   nothing inside the lesson panel is wider than the panel
//
// Related, and not duplicated here: e2e/lessonRecovery.spec.js checks that the
// object list is operable at three sizes, and e2e/accessibilityManual.spec.js
// checks reflow at 200% and 400% zoom.
// =============================================================================

import { test, expect } from './fixtures.js';
import { scrollLikeAReader } from './reach.js';

/** The sizes, named for what they are rather than for their numbers. */
const VIEWPORTS = [
  ['small phone', 320, 700],
  ['phone', 390, 844],
  ['tablet', 768, 1024],
  ['short laptop', 1024, 700],
  ['laptop', 1366, 768],
  ['large laptop', 1440, 900],
  ['projector', 1920, 1080],
];

/**
 * The most crowded screen in the catalog: instrument, plot, fields and list.
 * Tides step 10 rather than a lesson opener, which is a page of prose and
 * proves nothing about layout.
 */
const STEP = '/?author=tides&step=10';

/** Fill the response fields so the plot and its table have something in them. */
async function fillFields(page) {
  await page.evaluate(() => {
    const fields = [
      ...document.querySelectorAll('#investigationBody input[data-field]'),
    ];
    const vals = [
      '0.25',
      '4.00',
      '0.50',
      '2.00',
      '1.00',
      '1.00',
      '2.00',
      '0.50',
    ];
    fields.forEach((f, i) => {
      f.value = vals[i] ?? '1';
      f.dispatchEvent(new Event('input', { bubbles: true }));
      f.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });
  await page.waitForTimeout(400);
}

/**
 * Reachable means scrollable-to and actually on top at its own center.
 *
 * `toBeVisible` is not enough: an element can be visible and have a panel
 * painted over it, which is exactly what a layout that has run out of room
 * does.
 */
async function reachable(page, selector, { minHeight = 0 } = {}) {
  const el = page.locator(selector).first();
  // Scrolled only where a reader can scroll, which `scrollIntoView` is not: it
  // scrolls an `overflow: hidden` box as readily as any other, and that is how
  // a Next button clipped off the lesson sheet at 390px passed here. See
  // e2e/reach.js.
  //
  // Centered rather than minimally scrolled. `scrollIntoViewIfNeeded` stops the
  // moment an element is technically inside its scroll container, which leaves
  // it flush against the edge - and a point sampled at the very edge of a
  // scrolling panel hits the panel, not the control. That is a property of
  // this test, not of the layout, and it failed six of fourteen sizes before
  // it was pinned down.
  expect(
    await page.evaluate(scrollLikeAReader, selector),
    `${selector} can be scrolled to`
  ).toBe('ok');
  await page.waitForTimeout(120);
  await expect(el, `${selector} is visible`).toBeVisible();
  const box = await el.boundingBox();
  expect(box, `${selector} has a box`).toBeTruthy();
  if (minHeight) {
    expect(
      box.height,
      `${selector} is tall enough to hit`
    ).toBeGreaterThanOrEqual(minHeight);
  }
  const onTop = await page.evaluate(
    ([x, y, sel]) => {
      const at = document.elementFromPoint(x, y);
      return Boolean(at && (at.matches(sel) || at.closest(sel)));
    },
    [box.x + box.width / 2, box.y + box.height / 2, selector]
  );
  expect(onTop, `${selector} is not painted over`).toBe(true);
  return box;
}

for (const lang of ['en', 'es']) {
  test.describe(`a measurement screen in ${lang}`, () => {
    for (const [name, width, height] of VIEWPORTS) {
      test(`${name} ${width}x${height}`, async ({ page, app }) => {
        test.slow();
        await page.setViewportSize({ width, height });
        // The language is a stored preference rather than a query parameter,
        // and it has to be in place before the first script runs or the first
        // paint is in English whatever it says afterwards.
        await page.addInitScript(id => {
          try {
            window.localStorage.setItem('gravitas_locale', id);
          } catch {
            /* storage unavailable; the layout is still worth measuring */
          }
        }, lang);
        await app.boot({ url: STEP });
        await expect
          .poll(() => page.evaluate(() => document.documentElement.lang))
          .toBe(lang);
        await page.waitForSelector('#investigationToolCanvas', {
          timeout: 25_000,
        });
        await fillFields(page);

        // 1. Nothing pushes the document sideways.
        const overflow = await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth
        );
        expect(overflow, 'horizontal document overflow').toBeLessThanOrEqual(1);

        // 2. The instrument is on screen and inside the viewport.
        const canvas = await reachable(page, '#investigationToolCanvas');
        expect(canvas.x).toBeGreaterThanOrEqual(-1);
        expect(canvas.x + canvas.width).toBeLessThanOrEqual(width + 1);

        // 3. Everything the step needs can be got to.
        await reachable(page, '#investigationToolReadout .inv-tool-row');
        await reachable(page, '#investigationPlotTable');
        await reachable(page, '#investigationBody input[data-field]', {
          minHeight: 32,
        });
        await reachable(page, '#investigationNext', { minHeight: 32 });

        // 4. Nothing inside the lesson panel is wider than the panel. A
        // readout row or a table that overflows its own column is how a
        // number ends up under the scrollbar.
        const wide = await page.evaluate(() => {
          const panel = document.getElementById('investigationPanel');
          if (!panel) return [];
          const limit = panel.clientWidth + 2;
          return [...panel.querySelectorAll('*')]
            .filter(el => {
              const style = getComputedStyle(el);
              if (style.display === 'none' || style.overflowX === 'auto') {
                return false;
              }
              return el.scrollWidth > limit;
            })
            .map(el =>
              `${el.tagName.toLowerCase()}.${el.className}`.slice(0, 60)
            )
            .slice(0, 5);
        });
        expect(wide, 'elements wider than the lesson panel').toEqual([]);
      });
    }
  });
}
