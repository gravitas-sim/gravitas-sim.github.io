// =============================================================================
// The sky sequence, in two languages (Roadmap II, Prompt 89)
// -----------------------------------------------------------------------------
// The first investigation opens with the Sky Lab instrument, draws and lists
// the kernel's numbers (the readout is the text equivalent of the canvas), the
// Spanish lesson shows its own words and instrument labels, and the instrument
// panel passes axe at desktop and phone width. The experiments themselves are
// in e2e/centralExperiments.spec.js.
// =============================================================================

import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures.js';
import {
  lessonPlan,
  openInvestigation,
  walkToSid,
} from './centralExperiment.js';

const ID = 'the-turning-sky';

async function open(page, app, locale) {
  await openInvestigation(page, app, ID);
  if (locale) {
    await page.evaluate(async l => {
      const i18n = await import('/js/i18n/index.js');
      await i18n.setLocale(l, { persist: true });
    }, locale);
    await page.reload();
    await expect(page.locator('#investigationPanel')).toBeVisible();
    await expect(page.locator('.inv-step-title')).not.toBeEmpty();
    await page.waitForFunction(() => window.splashScreenEnded === true);
  }
  const plan = await lessonPlan(page, ID);
  await walkToSid(page, plan, 'rise-shift');
}

for (const [locale, title, row] of [
  [undefined, /Measure the shift/i, /Sidereal time at midnight/i],
  ['es', /Mide el adelanto/i, /Tiempo sidéreo a medianoche/i],
]) {
  test(`the instrument and the lesson are in ${locale || 'en'}`, async ({
    page,
    app,
  }) => {
    test.slow();
    await open(page, app, locale);
    await expect(page.locator('.inv-step-title')).toHaveText(title);
    await expect(
      page.locator('#investigationToolReadout, .inv-tool-readout').first()
    ).toContainText(row);
    const results = await new AxeBuilder({ page })
      .include('#investigationPanel')
      .analyze();
    expect(results.violations).toEqual([]);
  });
}

test('the instrument fits a phone and passes axe', async ({ page, app }) => {
  test.slow();
  await page.setViewportSize({ width: 360, height: 740 });
  await open(page, app);
  const box = await page.locator('canvas').first().boundingBox();
  expect(box.width).toBeLessThanOrEqual(360);
  const results = await new AxeBuilder({ page })
    .include('#investigationPanel')
    .analyze();
  expect(results.violations).toEqual([]);
});
