// =============================================================================
// Why Venus Is Hot and Two Greenhouse Models, in two languages
// -----------------------------------------------------------------------------
// Roadmap III, Prompt 200. Checked here: each of the three atmosphere
// instruments (the energy balance, the two greenhouse models, the scale height)
// draws through the plot component (a labelled svg with its paths) and lists its
// numbers (the readout is the text equivalent), the Spanish lesson shows its own
// words, and the panel passes axe and keeps every control and link at least 24
// px square at 1280 and 390 px wide, in the dark and the light theme. The
// numbers themselves are held by tests/atmosphereLessons.test.js.
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
    id: 'why-venus-is-hot',
    sid: 'venus-sunlight-alone',
    row: /Equilibrium temperature/i,
    rowEs: /Temperatura de equilibrio/i,
    title: /^What temperature/i,
    titleEs: /^¿Qué temperatura/i,
  },
  {
    id: 'why-venus-is-hot',
    sid: 'one-layer-for-venus',
    row: /Ground temperature, one layer/i,
    rowEs: /Temperatura del suelo, una capa/i,
    title: /^Two greenhouse models/i,
    titleEs: /^Dos modelos/i,
  },
  {
    id: 'why-venus-is-hot',
    depth: 'advanced',
    sid: 'how-thick-is-venus',
    row: /Scale height/i,
    rowEs: /Altura de escala/i,
    title: /^How quickly/i,
    titleEs: /^¿Con qué rapidez/i,
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
      // The plot component draws an svg, labelled; its paths are where the data is.
      const plot = page.locator('#investigationTool svg[aria-label]').first();
      await expect(plot).toBeVisible();
      await expect(plot).toHaveAttribute(
        'aria-label',
        locale === 'es' ? c.titleEs : c.title
      );
      expect(await plot.locator('path').count()).toBeGreaterThan(2);
      if (process.env.ATM_SHOTS)
        await page.locator('#investigationTool').screenshot({
          path: `${process.env.ATM_SHOTS}/${c.id}-${c.sid}-${locale}.png`,
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
