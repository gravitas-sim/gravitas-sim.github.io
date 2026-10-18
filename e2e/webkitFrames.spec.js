// =============================================================================
// Does the page keep getting frames after the lesson browser opens? (D-TOOL-03)
// -----------------------------------------------------------------------------
// On Linux WebKit (Playwright 1.64) requestAnimationFrame stops firing for the
// page once the lesson browser is open, though timers fire at once and the page
// is visible and focused (e2e/investigations.spec.js says how it was found).
// Each variant changes one thing BEFORE the browser opens and asks again, so
// the failure message of whichever variants still starve says what does not
// matter, and the one that recovers says what does. A diagnostic, kept while
// the cause is open; it fails on purpose when any variant has no frame, so the
// numbers are in the log, and passes when all of them draw.
// =============================================================================

import { test, expect } from './fixtures.js';

const frames = (page, wait) =>
  page.evaluate(
    ms =>
      new Promise(resolve => {
        const t0 = performance.now();
        let frame = null;
        window.requestAnimationFrame(() => (frame = performance.now() - t0));
        window.setTimeout(() => resolve(frame), ms);
      }),
    wait
  );

const VARIANTS = {
  plain: '',
  'no backdrop blur':
    '*{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}',
  'no canvases': 'canvas{display:none!important}',
  'no blur and no canvases':
    '*{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}canvas{display:none!important}',
  'overlay without its background':
    '#investigationBrowser{background:none!important;backdrop-filter:none!important}',
};

test.describe('frames after the lesson browser opens @cross-browser', () => {
  for (const [name, css] of Object.entries(VARIANTS)) {
    test(`${name}`, async ({ page, app }) => {
      await app.boot();
      if (css) await page.addStyleTag({ content: css });
      const atBoot = await frames(page, 400);
      await page.locator('#investigationsBtn').click();
      await expect(page.locator('#investigationBrowser')).toBeVisible();
      const afterOpen = [];
      for (const wait of [300, 1000, 1000])
        afterOpen.push(await frames(page, wait));
      expect(
        { variant: name, atBoot, afterOpen },
        `frames (ms to first frame; null is none): ${JSON.stringify({ variant: name, atBoot, afterOpen })}`
      ).toMatchObject({
        afterOpen: [expect.any(Number), expect.any(Number), expect.any(Number)],
      });
    });
  }
});
