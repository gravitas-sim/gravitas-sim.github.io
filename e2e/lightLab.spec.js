// =============================================================================
// The Light Lab and "Color and Temperature", in two languages
// -----------------------------------------------------------------------------
// The blackbody explorer is the instrument; the lesson is the first of the
// Light investigations (Roadmap II, Prompt 83). Checked here: the instrument
// draws and lists the kernel's numbers (the readout is the text equivalent of
// the canvas), a color index moves the right way, the Spanish lesson shows its
// own words, and the instrument panel passes axe in both languages and at phone
// width. The experiment itself is e2e/centralExperiments.spec.js.
// =============================================================================

import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures.js';
import {
  lessonPlan,
  openInvestigation,
  setControl,
  walkToSid,
  reading,
  controlOf,
  declared,
} from './centralExperiment.js';

const ID = 'color-and-temperature';

async function toThreeColors(page, app, locale) {
  await openInvestigation(page, app, ID);
  if (locale) {
    // The language is chosen, then the page reloaded, so the lesson is served
    // in it from the start: an open lesson is not re-translated in place.
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
  await walkToSid(page, plan, 'three-colors');
  return plan;
}

test.describe('the blackbody explorer', () => {
  for (const locale of ['en', 'es']) {
    test(`reads like a thermometer and passes axe (${locale})`, async ({
      page,
      app,
    }) => {
      test.slow();
      await toThreeColors(page, app, locale === 'es' ? 'es' : null);
      const { control } = controlOf(declared(ID));
      const readout = page.locator('#investigationToolReadout');
      await expect(readout).toContainText(/\d/, { useInnerText: true });

      // The canvas paints something.
      const painted = await page.evaluate(() => {
        const c = document.getElementById('investigationToolCanvas');
        const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
        let n = 0;
        for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
        return n;
      });
      expect(painted).toBeGreaterThan(500);

      // A cooler blackbody has the larger B - V.
      const at = {};
      for (const T of [3000, 10000]) {
        const { after } = await setControl(page, control, T);
        at[T] = reading(after, /B . V|índice de color/i);
      }
      expect(at[3000]).toBeGreaterThan(at[10000]);

      const results = await new AxeBuilder({ page })
        .include('#investigationTool')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(
        results.violations.map(v => `${v.id}: ${v.nodes[0]?.target}`)
      ).toEqual([]);

      if (locale === 'es') {
        await expect(page.locator('.inv-step-title')).toHaveText(
          'Mide un índice de color'
        );
      }
    });
  }

  test('fits a phone', async ({ page, app }) => {
    test.slow();
    await page.setViewportSize({ width: 390, height: 780 });
    await toThreeColors(page, app, null);
    const box = await page.locator('#investigationToolCanvas').boundingBox();
    expect(box.width).toBeLessThanOrEqual(390);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1
    );
    expect(overflow).toBe(false);
  });
});

// -----------------------------------------------------------------------------
// The spectrum viewer and "Lines and Motion"
// -----------------------------------------------------------------------------

const MOTION = 'lines-and-motion';

async function toMeasure(page, app, locale) {
  await openInvestigation(page, app, MOTION);
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
  const plan = await lessonPlan(page, MOTION);
  await walkToSid(page, plan, 'measure-one-shift');
  return plan;
}

test.describe('the spectrum viewer', () => {
  for (const locale of ['en', 'es']) {
    test(`lists the line it measured and passes axe (${locale})`, async ({
      page,
      app,
    }) => {
      test.slow();
      await toMeasure(page, app, locale === 'es' ? 'es' : null);
      const { control } = controlOf(declared(MOTION));
      const readout = page.locator('#investigationToolReadout');
      await expect(readout).toContainText(/km\/s/, { useInnerText: true });

      const painted = await page.evaluate(() => {
        const c = document.getElementById('investigationToolCanvas');
        const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
        let n = 0;
        for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
        return n;
      });
      expect(painted).toBeGreaterThan(500);

      // Star 1 recedes and star 2 approaches: the readout's sign says which.
      const at = {};
      for (const src of [4, 5]) {
        const { after } = await setControl(page, control, src);
        at[src] = reading(after, /velocidad|velocity/i);
      }
      expect(at[4]).toBeGreaterThan(0);
      expect(at[5]).toBeLessThan(0);

      const results = await new AxeBuilder({ page })
        .include('#investigationTool')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(
        results.violations.map(v => `${v.id}: ${v.nodes[0]?.target}`)
      ).toEqual([]);

      if (locale === 'es') {
        await expect(page.locator('.inv-step-title')).toHaveText(
          'Mide dos corrimientos'
        );
      }
    });
  }

  test('fits a phone', async ({ page, app }) => {
    test.slow();
    await page.setViewportSize({ width: 390, height: 780 });
    await toMeasure(page, app, null);
    const box = await page.locator('#investigationToolCanvas').boundingBox();
    expect(box.width).toBeLessThanOrEqual(390);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1
    );
    expect(overflow).toBe(false);
  });
});

// -----------------------------------------------------------------------------
// The Kirchhoff demonstrator and "What a Spectrum Is Made Of"
// -----------------------------------------------------------------------------

const MADE_OF = 'what-a-spectrum-is-made-of';

async function toMeasureClouds(page, app, locale) {
  await openInvestigation(page, app, MADE_OF);
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
  const plan = await lessonPlan(page, MADE_OF);
  await walkToSid(page, plan, 'measure-two-clouds');
  return plan;
}

test.describe('the Kirchhoff demonstrator', () => {
  for (const locale of ['en', 'es']) {
    test(`draws, lists its numbers and passes axe (${locale})`, async ({
      page,
      app,
    }) => {
      test.slow();
      await toMeasureClouds(page, app, locale === 'es' ? 'es' : null);
      const { control } = controlOf(declared(MADE_OF));
      const readout = page.locator('#investigationToolReadout');
      await expect(readout).toContainText(/Å/, { useInnerText: true });

      const painted = await page.evaluate(() => {
        const c = document.getElementById('investigationToolCanvas');
        const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
        let n = 0;
        for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
        return n;
      });
      expect(painted).toBeGreaterThan(500);

      // A cooler cloud reads below the source's brightness, a hotter one above.
      const at = {};
      for (const Tc of [4000, 8000]) {
        const { after } = await setControl(page, control, Tc);
        at[Tc] = reading(after, /h-alfa|h-alpha/i);
      }
      expect(at[4000]).toBeLessThan(100);
      expect(at[8000]).toBeGreaterThan(100);

      const results = await new AxeBuilder({ page })
        .include('#investigationTool')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(
        results.violations.map(v => `${v.id}: ${v.nodes[0]?.target}`)
      ).toEqual([]);

      if (locale === 'es') {
        await expect(page.locator('.inv-step-title')).toHaveText(
          'Mide dos nubes'
        );
      }
    });
  }

  test('fits a phone', async ({ page, app }) => {
    test.slow();
    await page.setViewportSize({ width: 390, height: 780 });
    await toMeasureClouds(page, app, null);
    const box = await page.locator('#investigationToolCanvas').boundingBox();
    expect(box.width).toBeLessThanOrEqual(390);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1
    );
    expect(overflow).toBe(false);
  });
});
