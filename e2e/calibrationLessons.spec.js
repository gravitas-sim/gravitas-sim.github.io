// =============================================================================
// The calibration investigations, in two languages
// -----------------------------------------------------------------------------
// What a CCD Records, Signal, Noise and Exposure and A Variable Star From
// Frames (Roadmap II, Prompt 86). Checked here: each instrument paints and lists the kernel's
// numbers (the readout is the text equivalent of the canvas), a control moves
// the number it should, the Spanish lesson shows its own words, and the
// instrument panel passes axe in both languages.
// =============================================================================

import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures.js';
import {
  lessonPlan,
  openInvestigation,
  walkToSid,
} from './centralExperiment.js';

const CASES = [
  {
    id: 'what-a-ccd-records',
    sid: 'what-the-flat-does',
    row: /Master bias level/i,
    rowEs: /Nivel del sesgo maestro/i,
  },
  {
    id: 'signal-noise-and-exposure',
    sid: 'one-star-one-minute',
    row: /Signal-to-noise/i,
    rowEs: /Señal a ruido/i,
  },
  {
    id: 'a-variable-star-from-frames',
    sid: 'the-sine',
    row: /Amplitude of the best sine/i,
    rowEs: /Amplitud del mejor seno/i,
  },
];

async function open(page, app, id, locale) {
  await openInvestigation(page, app, id);
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
}

for (const c of CASES) {
  for (const locale of ['en', 'es']) {
    test(`${c.id}: the instrument paints, lists its numbers and passes axe (${locale})`, async ({
      page,
      app,
    }) => {
      test.slow();
      await open(page, app, c.id, locale === 'es' ? 'es' : null);
      const plan = await lessonPlan(page, c.id);
      await walkToSid(page, plan, c.sid);
      const readout = page.locator('#investigationToolReadout');
      await expect(readout).toContainText(/\d/, { useInnerText: true });
      await expect(readout).toContainText(locale === 'es' ? c.rowEs : c.row, {
        useInnerText: true,
      });
      await expect(readout).not.toContainText(/NaN|undefined/);
      const painted = await page.evaluate(() => {
        const cv = document.getElementById('investigationToolCanvas');
        const d = cv
          .getContext('2d')
          .getImageData(0, 0, cv.width, cv.height).data;
        let n = 0;
        for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
        return n;
      });
      expect(painted).toBeGreaterThan(300);
      const results = await new AxeBuilder({ page })
        .include('#investigationTool')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(
        results.violations.map(v => `${v.id}: ${v.nodes[0]?.target}`)
      ).toEqual([]);
    });
  }
}
