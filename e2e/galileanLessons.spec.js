// =============================================================================
// Weighing Jupiter From Its Moons, in two languages
// -----------------------------------------------------------------------------
// Roadmap III, Prompt 193. Checked here: each of the three instruments (the
// synthetic frame with its ephemeris overlay, one moon's sinusoid, and the
// weighing, which sits on the advanced steps and is reached by a link at that
// depth) paints and lists its numbers (the readout is the text equivalent of
// the canvas), the Spanish lesson shows its own words, and the panel passes
// axe and keeps every control and link at least 24 px square at 1280 and 390
// px wide, in the dark and the light theme. The numbers themselves are held by
// centralExperiments.spec.js and tests/galileanMoons.test.js.
// =============================================================================

import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures.js';
import {
  lessonPlan,
  openInvestigation,
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

/** Two frames, then every finite animation finished: the panel has stopped moving. */
const settled = page =>
  page.evaluate(async () => {
    const frames = () =>
      new Promise(resolve =>
        window.requestAnimationFrame(() =>
          window.requestAnimationFrame(resolve)
        )
      );
    await frames();
    const finite = document
      .getAnimations()
      .filter(
        a =>
          a.playState === 'running' &&
          Number.isFinite(a.effect?.getComputedTiming().endTime)
      );
    await Promise.race([
      Promise.all(finite.map(a => a.finished.catch(() => {}))),
      new Promise(resolve => window.setTimeout(resolve, 3000)),
    ]);
    await frames();
  });

const CASES = [
  {
    id: 'weighing-jupiter',
    sid: 'which-moon-is-farthest',
    row: /Time \(UT\)/i,
    rowEs: /Hora \(UT\)/i,
  },
  {
    id: 'weighing-jupiter',
    sid: 'io-period-and-radius',
    row: /^Period/im,
    rowEs: /^Período/im,
  },
  {
    id: 'weighing-jupiter',
    depth: 'advanced',
    sid: 'weigh-again-corrected',
    row: /Weighted mean of the four/i,
    rowEs: /Media ponderada de las cuatro/i,
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
