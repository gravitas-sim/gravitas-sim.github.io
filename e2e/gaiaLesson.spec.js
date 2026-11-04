// =============================================================================
// "How far, and how sure?" and "What Gaia does not see", in two languages
// -----------------------------------------------------------------------------
// Roadmap III, Prompt 233 Part B. Checked here: each lesson walks from its first
// step to its last at the advanced depth (every question answered by the walker's
// own rules), the distance panel and the sample panel list their numbers with
// none of NaN or undefined, each draws a labelled chart on open, the Spanish
// lesson shows its own words, and the panels pass axe, keep every control at
// least 24 px square at 1280 and 390 px, in the dark and the light theme, and
// the page does not scroll sideways at 320, 375 and 390 px. The numbers
// themselves are held by tests/gaiaLessons.test.js.
// =============================================================================

import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures.js';
import {
  commitPredictionHeld,
  expectVerdictRevealed,
  openInvestigation,
  readout,
  setControl,
  settled,
  step,
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
    id: 'how-far-and-how-sure',
    sid: 'the-zero-point',
    row: /Distance from the likelihood/i,
    rowEs: /Distancia según la verosimilitud/i,
    titleEs: /^¿A qué distancia y con cuánta seguridad\?/,
  },
  {
    id: 'what-gaia-does-not-see',
    sid: 'cuts-overlap',
    row: /Stars left/i,
    rowEs: /Estrellas que quedan/i,
    titleEs: /^Lo que Gaia no ve/,
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
      await open(page, app, c.id, locale === 'es' ? 'es' : null, 'advanced');
      const plan = await deepPlan(page, c.id);
      expect(plan.length).toBeGreaterThan(8);
      if (locale === 'es')
        await expect(page.locator('#investigationPanel')).toContainText(
          c.titleEs,
          { useInnerText: true }
        );
      await walkToSid(page, plan, c.sid);

      const rows = page.locator('#investigationToolReadout');
      await expect(rows).toContainText(/\d/, { useInnerText: true });
      await expect(rows).toContainText(locale === 'es' ? c.rowEs : c.row, {
        useInnerText: true,
      });
      await expect(rows).not.toContainText(/NaN|undefined|loading|cargando/i);
      // The chart is drawn when the panel opens: a labelled svg with content.
      const chart = page.locator('#investigationTool svg[aria-label]:visible');
      await expect(chart.first()).toBeVisible();
      expect(await chart.first().locator('path, circle').count()).toBeGreaterThan(
        0
      );

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

test('how-far-and-how-sure: a smaller parallax error narrows the interval, and the prediction is held until the step that settles it @accepts:ce.how-far-and-how-sure', async ({
  page,
  app,
}) => {
  test.slow();
  await open(page, app, 'how-far-and-how-sure', null, 'advanced');
  const plan = await deepPlan(page, 'how-far-and-how-sure');
  const predict = step(plan, 'commit-to-a-distance');
  await walkToSid(page, plan, predict.sid);
  // The wrong option on purpose: nothing on the screen may say whether it is right yet.
  await commitPredictionHeld(page, predict);
  await expectVerdictRevealed(page, plan, predict);

  const wide = await readout(page);
  expect(wide['Distance from the likelihood']).toMatch(/2\.50 kpc|2\.5 kpc/);
  expect(wide['Distance from the likelihood']).toMatch(/2\.22/);
  // A smaller error: the same maximum, a narrower interval.
  const { before, after } = await setControl(page, 'err', 0.02);
  expect(after['Distance from the likelihood']).not.toBe(
    before['Distance from the likelihood']
  );
  expect(after['Distance from the likelihood']).toMatch(/2\.38/);
  expect(after['What it supports']).toMatch(/at least 5 times/);
  expect(after.Correction).toMatch(/None beyond the zero point/);
});

test('what-gaia-does-not-see: a tighter magnitude limit removes stars and moves the counts, and the prediction is held until the step that settles it @accepts:ce.what-gaia-does-not-see', async ({
  page,
  app,
}) => {
  test.slow();
  await open(page, app, 'what-gaia-does-not-see', null, 'advanced');
  const plan = await deepPlan(page, 'what-gaia-does-not-see');
  const predict = step(plan, 'commit-to-a-cut');
  await walkToSid(page, plan, predict.sid);
  await commitPredictionHeld(page, predict);
  await expectVerdictRevealed(page, plan, predict);

  await expect(page.locator('#investigationToolReadout')).not.toContainText(
    /loading/i
  );
  const none = await readout(page);
  expect(none['Stars left']).toMatch(/^993 of 993/);
  const { before, after } = await setControl(page, 'mag', 15);
  expect(after['Stars left']).not.toBe(before['Stars left']);
  expect(after['Stars left']).toMatch(/^238 of 993/);
  expect(after['Cuts on']).toMatch(/755 of 993/);
  // The distance is stated with its labels, and is not claimed as validated.
  expect(after['Not validated']).toMatch(/NOT RUN/);
  expect(after['Distance of the cluster']).toMatch(/no systematic floor/);
});
