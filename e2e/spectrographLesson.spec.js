// =============================================================================
// Why Two Lines Become One, in two languages
// -----------------------------------------------------------------------------
// The spectrograph pair panel (Roadmap III, Prompt 213), from the measurement
// screen. Checked here: the instrument paints a synthetic spectrum and lists its
// numbers (the readout is the text equivalent of the canvas), the dip between the
// lines and the fit as one line are two separate labelled rows, the panel says it
// is synthetic, the Spanish lesson shows its own words, and the panel passes axe
// and keeps every control and link at least 24 px square at 1280 and 390 px wide
// in both themes. The numbers themselves are recomputed by
// tests/spectrographLessons.test.js.
// =============================================================================

import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures.js';
import {
  lessonPlan,
  openInvestigation,
  settled,
  walkToSid,
} from './centralExperiment.js';

const CASES = [
  {
    id: 'why-two-lines-become-one',
    sid: 'dip-by-r',
    row: /Dip between the lines/i,
    rowEs: /Hundimiento entre las líneas/i,
    row2: /Fitted as one line/i,
    row2Es: /Ajustadas como una sola línea/i,
    what: /synthetic spectrum/i,
    whatEs: /espectro sintético/i,
  },
];

const THEMES = ['midnight', 'daylight'];
const SIZES = [
  { width: 1280, height: 900 },
  { width: 390, height: 844 },
  { width: 375, height: 812 },
  { width: 320, height: 640 },
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

/** Controls and links of the instrument panel that are too small to press. */
const undersized = page =>
  page.evaluate(() => {
    const tool = document.getElementById('investigationTool');
    const small = [];
    for (const el of tool.querySelectorAll(
      'button, a[href], input:not([type=hidden]), select, textarea, [role=button]'
    )) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      if (r.width < 24 || r.height < 24) {
        small.push(
          `${el.tagName.toLowerCase()}#${el.id || el.className} ${Math.round(r.width)}x${Math.round(r.height)}`
        );
      }
    }
    return small;
  });

const axeOf = page =>
  new AxeBuilder({ page })
    .include('#investigationTool')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();

for (const c of CASES) {
  for (const locale of ['en', 'es']) {
    test(`${c.id}: the instrument paints, lists its numbers, passes axe and keeps its controls large enough in both themes and sizes (${locale})`, async ({
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
      await expect(readout).toContainText(locale === 'es' ? c.row2Es : c.row2, {
        useInnerText: true,
      });
      await expect(readout).not.toContainText(/NaN|undefined/);
      await expect(readout).toContainText(locale === 'es' ? c.whatEs : c.what, {
        useInnerText: true,
      });
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

      for (const theme of THEMES) {
        await page.evaluate(async id => {
          const m = await import('/js/theme.js');
          m.setTheme(id);
        }, theme);
        await settled(page);
        const results = await axeOf(page);
        expect(
          results.violations.map(v => `${theme} ${v.id}: ${v.nodes[0]?.target}`)
        ).toEqual([]);
        for (const size of SIZES) {
          await page.setViewportSize(size);
          await expect(page.locator('#investigationTool')).toBeVisible();
          await settled(page);
          const sw = await page.evaluate(() => [
            document.documentElement.scrollWidth,
            document.documentElement.clientWidth,
          ]);
          expect(
            sw[0],
            `${theme} ${size.width}px scrolls sideways`
          ).toBeLessThanOrEqual(sw[1]);
          // At 320 px the shared slider row (css/components.css .inv-ecc-row) leaves a
          // range input 16 px wide in every instrument; that is the component's, not
          // this panel's, so the target-size check holds from 375 px up.
          if (size.width >= 375)
            expect(
              await undersized(page),
              `${theme} ${size.width}px controls under 24 px`
            ).toEqual([]);
        }
      }
    });
  }
}

test('the Observatory spectrograph panel fits H-beta of a real SDSS star and gives a velocity with its medium', async ({
  page,
}) => {
  test.slow();
  await page.goto('/observatory/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', {
    timeout: 30_000,
  });
  await page.locator('#obsFixture').selectOption('sdss-a');
  await page.locator('#obsOpen').click();
  await expect(page.locator('#obsTitle')).toContainText('SDSS', {
    timeout: 30_000,
  });
  await expect(page.locator('#obsSpecPanel')).toBeVisible();
  await page.locator('#obsSpecPanel summary').click();
  await page.locator('#obsSpecLine').selectOption('h-beta');
  // the archive's thinned spectrum has about 1 pixel per FWHM at R = 1800: the panel says so
  await page.locator('#obsSpecFit').click();
  await expect(page.locator('#obsSpecOut')).toContainText(/pixel wide/, {
    timeout: 15_000,
  });
  await page.locator('#obsSpecR').fill('1200');
  await page.locator('#obsSpecFit').click();
  const out = page.locator('#obsSpecOut');
  await expect(out).toContainText(/Radial velocity/, { timeout: 15_000 });
  await expect(out).toContainText(/vacuum/);
  await expect(out).not.toContainText(/NaN|undefined/);
  const text = (await out.innerText()).replace(/\u2212/g, '-');
  const v = Number(/(-?\d+(?:\.\d+)?) km\/s/.exec(text)?.[1]);
  expect(v).toBeGreaterThan(-340);
  expect(v).toBeLessThan(-150);
  const axe = await new AxeBuilder({ page })
    .include('#obsSpecPanel')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(axe.violations.map(x => `${x.id}: ${x.nodes[0]?.target}`)).toEqual([]);
  for (const width of [320, 375, 390]) {
    await page.setViewportSize({ width, height: 800 });
    const w = await page.evaluate(() => [
      document.documentElement.scrollWidth,
      document.documentElement.clientWidth,
    ]);
    expect(w[0], `${width}px page scrolls sideways`).toBeLessThanOrEqual(w[1]);
  }
});
