// =============================================================================
// The three crater investigations, in two languages
// -----------------------------------------------------------------------------
// Roadmap III, Prompt 195. Checked here: the two instruments that draw a picture
// (the comparison of two regions and the diameter of one circle) paint it, with
// the catalog's circles over it (the pictures are fetched when first drawn), and
// the size-frequency instrument draws through the plot component (a labelled svg
// with its paths); each lists its numbers (the readout is the text equivalent),
// the Spanish lesson shows its own words, and the panel passes axe and keeps
// every control and link at least 24 px square at 1280 and 390 px wide, in the
// dark and the light theme. The numbers themselves are held by
// tests/craterLessons.test.js.
// =============================================================================

import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures.js';
import {
  lessonPlan,
  openInvestigation,
  settled,
  walkToSid,
} from './centralExperiment.js';

/** The plan with every depth, in the page's language, as a link at the advanced depth walks it. */
const deepPlan = (page, id) =>
  page.evaluate(async lessonId => {
    const reg = await import('/js/data/investigations/registry.js');
    const i18n = await import('/js/i18n/index.js');
    const depth = await import('/js/investigations/depth.js');
    const locale = i18n.getLocale();
    const lesson = await depth.withDepth(
      await reg.loadInvestigation(lessonId, locale),
      locale
    );
    return lesson.steps.map((s, index) => ({
      index,
      sid: s.sid,
      type: s.type,
      title: s.title,
      reveal: s.reveal ?? null,
      answer: s.answer,
      options: s.options?.length ?? 0,
      fields: (s.fields || []).map(f => f.id),
      tool: s.tool?.id ?? null,
    }));
  }, id);

const CASES = [
  {
    id: 'which-surface-is-older',
    sid: 'count-the-moon',
    row: /^Lunar highland$/i,
    rowEs: /^Tierras altas lunares$/i,
    picture: true,
    label: /^Which of two surfaces/i,
    labelEs: /^¿Cuál de dos superficies/i,
  },
  {
    id: 'craters-by-size',
    sid: 'highland-slope',
    row: /^Cumulative index b/i,
    rowEs: /^Índice acumulado b/i,
    title: /^How many craters are there/i,
    titleEs: /^¿Cuántos cráteres hay/i,
  },
  {
    id: 'what-a-crater-diameter-is-worth',
    sid: 'read-the-diameter',
    row: /^Diameter$/i,
    rowEs: /^Diámetro$/i,
    picture: true,
    label: /^What is the diameter/i,
    labelEs: /^¿Qué diámetro tiene/i,
  },
  {
    id: 'which-surface-is-older',
    depth: 'quantitative',
    sid: 'harder-craters',
    row: /^Lunar mare$/i,
    rowEs: /^Mar lunar$/i,
    picture: true,
    label: /^Which of two surfaces/i,
    labelEs: /^¿Cuál de dos superficies/i,
  },
];

const THEMES = ['midnight', 'daylight'];
const SIZES = [
  { width: 1280, height: 900 },
  { width: 390, height: 844 },
];

async function open(page, app, id, locale, depth) {
  await openInvestigation(page, app, depth ? `${id}/${depth}` : id);
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
    test(`${c.id} ${c.sid}: the instrument paints, lists its numbers, passes axe and keeps its controls large enough in both themes and sizes (${locale})`, async ({
      page,
      app,
    }) => {
      test.slow();
      await open(page, app, c.id, locale === 'es' ? 'es' : null, c.depth);
      const plan = c.depth
        ? await deepPlan(page, c.id)
        : await lessonPlan(page, c.id);
      await walkToSid(page, plan, c.sid);

      const readout = page.locator('#investigationToolReadout');
      await expect(readout).toContainText(/\d/, { useInnerText: true });
      await expect(readout).toContainText(locale === 'es' ? c.rowEs : c.row, {
        useInnerText: true,
      });
      await expect(readout).not.toContainText(/NaN|undefined/);
      if (c.picture) {
        // A picture on a canvas, named from the instrument and pointing at the readout.
        const canvas = page.locator('#investigationToolCanvas');
        await expect(canvas).toBeVisible();
        await expect(canvas).toHaveAttribute(
          'aria-label',
          locale === 'es' ? c.labelEs : c.label
        );
        // The picture is fetched when first drawn: wait for its gray levels.
        await expect
          .poll(
            () =>
              canvas.evaluate(cv => {
                const g = cv.getContext('2d');
                const data = g.getImageData(0, 0, cv.width, cv.height).data;
                const seen = new Set();
                for (let i = 0; i < data.length; i += 4 * 7)
                  seen.add(data[i + 1]);
                return seen.size;
              }),
            { timeout: 15000 }
          )
          .toBeGreaterThan(40);
        // The first row of the readout describes the picture, for a reader who cannot see it.
        await expect(readout).toContainText(
          locale === 'es' ? /imagen|mapa/i : /picture|map/i,
          { useInnerText: true }
        );
      } else {
        // The plot component draws an svg, labelled; its paths are where the data is.
        const plot = page.locator('#investigationTool svg[aria-label]').first();
        await expect(plot).toBeVisible();
        await expect(plot).toHaveAttribute(
          'aria-label',
          locale === 'es' ? c.titleEs : c.title
        );
        expect(await plot.locator('path').count()).toBeGreaterThan(2);
      }
      if (process.env.CRATER_SHOTS)
        await page.locator('#investigationTool').screenshot({
          path: `${process.env.CRATER_SHOTS}/${c.id}-${c.sid}-${locale}.png`,
        });

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
          await settled(page);
          await expect(page.locator('#investigationTool')).toBeVisible();
          expect(
            await undersized(page),
            `${theme} ${size.width}px controls under 24 px`
          ).toEqual([]);
        }
      }
    });
  }
}
