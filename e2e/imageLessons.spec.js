// =============================================================================
// The image investigations, in two languages
// -----------------------------------------------------------------------------
// Measuring the Moon, How Far Is That Star?, A Binary Star's Orbit and What Is
// in This Field? (Roadmap III, Prompt 191, and its third part). Checked here: each instrument paints and lists
// its numbers (the readout is the text equivalent of the canvas), the Spanish
// lesson shows its own words, and the panel passes axe and keeps every control
// and link at least 24 px square at 1280 and 390 px wide, in the dark and the
// light theme. The numbers themselves are held by centralExperiments.spec.js.
// =============================================================================

import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures.js';
import {
  lessonPlan,
  openInvestigation,
  readout,
  settled,
  walkToSid,
} from './centralExperiment.js';

const CASES = [
  {
    id: 'measuring-the-moon',
    sid: 'measure-the-plain',
    row: /Diameter of the circle in kilometers/i,
    rowEs: /Diámetro del círculo en kilómetros/i,
  },
  {
    id: 'how-far-is-that-star',
    sid: 'the-parallax',
    row: /Chi-square of the fit/i,
    rowEs: /Chi cuadrado del ajuste/i,
  },
  {
    id: 'a-binary-stars-orbit',
    sid: 'the-mass-sum',
    row: /Mass sum/i,
    rowEs: /Suma de masas/i,
  },
  {
    id: 'what-is-in-this-field',
    sid: 'the-curve',
    row: /Magnitude\sat\s50\spercent\sfound/i,
    rowEs: /Magnitud\scon\sel\s50\spor\sciento\shallado/i,
  },
];

const THEMES = ['midnight', 'daylight'];
const SIZES = [
  { width: 1280, height: 900 },
  { width: 390, height: 844 },
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
          expect(
            await undersized(page),
            `${theme} ${size.width}px controls under 24 px`
          ).toEqual([]);
        }
      }
    });
  }
}

// The pair is the reader's decision (Measuring the Moon): the instrument opens
// with a pair that stops short of the edges, the tool takes whatever the pair
// spans as the Moon's width, and the readings are taken from the instrument.
test('measuring-the-moon: a short pair is refused in words, the pair on the edges is accepted, and the readings are the instrument’s', async ({
  page,
  app,
}) => {
  test.slow();
  await open(page, app, 'measuring-the-moon', null);
  const plan = await lessonPlan(page, 'measuring-the-moon');
  await walkToSid(page, plan, 'mark-the-disc-width');
  // The canvas is quiet: nothing is staged behind the picture.
  await expect(page.locator('body')).toHaveAttribute(
    'data-lesson-canvas',
    'quiet'
  );
  const slot = page.locator('#investigationBody [data-check-slot]');
  const field = id =>
    page.locator(`#investigationBody input[data-field$=":${id}"]`);
  const take = async () => {
    for (const id of ['pair', 'scale'])
      await page.locator(`#investigationBody [data-take="${id}"]`).click();
  };
  const place = async (id, value) => {
    const box = page.locator(`#invTool-${id}`);
    await box.fill(String(value));
    await box.dispatchEvent('change');
  };
  // The opening pair is not the answer: taken as it stands, it is refused.
  await take();
  await expect(slot).toContainText(/stops short/);
  // Both ends on the edges: accepted, and what the fields hold is what the readout prints.
  await place('x1', 3);
  await place('x2', 496);
  await take();
  await expect(slot).toContainText(/reaches both edges/);
  const rows = await readout(page);
  expect(Number(await field('pair').inputValue())).toBe(
    Number(rows['Length of the pair'].match(/\d+/)[0])
  );
  expect(await field('scale').inputValue()).toBe(
    rows['Scale from the pair'].match(/\d+\.\d+/)[0]
  );
  // The next step makes the mistake on purpose and is refused until the pair is short.
  await walkToSid(page, plan, 'a-pair-that-stops-short');
  const km = page.locator('#investigationBody [data-take="km"]');
  await page.locator('#investigationBody [data-take="scale"]').click();
  await km.click();
  await expect(slot).toContainText(/still close to the edge/);
  await place('x2', 430);
  await page.locator('#investigationBody [data-take="scale"]').click();
  await km.click();
  await expect(slot).toContainText(/did not change/);
});
