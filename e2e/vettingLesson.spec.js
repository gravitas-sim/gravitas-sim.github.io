// =============================================================================
// "Planet or Not?", the vetting investigation, in two languages
// -----------------------------------------------------------------------------
// Roadmap III, Prompt 228. Checked here: the lesson walks from its first step
// to its last at the advanced depth (every question answered by the walker's
// own rules), the vetting panel lists its tests, the overall verdict and the
// rates behind the thresholds, none of NaN or undefined, the plots stay behind
// their disclosure until asked for, the Spanish lesson shows its own words, and
// the panel passes axe, keeps every control at least 24 px square at 1280 and
// 390 px, in the dark and the light theme, and the page does not scroll
// sideways at 320, 375 and 390 px. The numbers themselves are held by
// tests/vetting.test.js and tests/vettingLessons.test.js.
// =============================================================================

import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures.js';
import { openInvestigation, settled, walkToSid } from './centralExperiment.js';

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
    id: 'planet-or-not',
    sid: 'the-exclusion-radius',
    row: /Test 1: odd and even depths/i,
    rowEs: /Prueba 1: profundidades impar y par/i,
    titleEs: /^¿Planeta o no\?/,
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
    test(`${c.id}: walks to its deepest step, the panel lists its numbers, passes axe, keeps its controls large enough in both themes and sizes and does not scroll sideways at 320 to 390 px (${locale})`, async ({
      page,
      app,
    }) => {
      test.slow();
      await open(
        page,
        app,
        c.id,
        locale === 'es' ? 'es' : null,
        'advanced'
      );
      const plan = await deepPlan(page, c.id);
      expect(plan.length).toBeGreaterThan(8);
      if (locale === 'es')
        await expect(page.locator('#investigationPanel')).toContainText(
          c.titleEs,
          { useInnerText: true }
        );
      await walkToSid(page, plan, c.sid);

      const readout = page.locator('#investigationToolReadout');
      await expect(readout).toContainText(/\d/, { useInnerText: true });
      await expect(readout).toContainText(locale === 'es' ? c.rowEs : c.row, {
        useInnerText: true,
      });
      await expect(readout).not.toContainText(/NaN|undefined/);
      await expect(readout).toContainText(
        locale === 'es' ? /En conjunto/i : /Overall/i,
        { useInnerText: true }
      );
      // The plots are behind a disclosure: nothing is drawn until it is asked for.
      await expect(page.locator('#investigationToolCanvas')).toBeHidden();

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
      // A narrow phone does not scroll the page sideways.
      for (const width of [320, 375, 390]) {
        await page.setViewportSize({ width, height: 800 });
        await settled(page);
        const wide = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth
        );
        expect(wide, `${width}px scrolls sideways`).toBeLessThanOrEqual(0);
      }
      // And the last step is reachable: nothing in the lesson stops a walker.
      await page.setViewportSize({ width: 1280, height: 900 });
      await walkToSid(page, plan, plan[plan.length - 1].sid);
    });
  }
}
