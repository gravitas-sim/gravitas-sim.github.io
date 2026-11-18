// =============================================================================
// Why Rings?, Tides That Move the Moon and Io's Fire, in two languages
// -----------------------------------------------------------------------------
// Roadmap III, Prompt 204 part 2. Checked here: each of the four ring and tide
// instruments (Roche limits, a resonance in a ring, the Moon's recession, Io's
// heating) draws through the plot component (a labelled svg with its paths) and
// lists its numbers (the readout is the text equivalent), the Spanish lesson shows
// its own words, and the panel passes axe and keeps every control and link at
// least 24 px square at 1280 and 390 px wide, in the dark and the light theme; and
// the two scale-model scenarios the lessons open (Ring Gap, Roche Pass) build the
// bodies their geometry declares. The numbers themselves are held by
// tests/tidesLessons.test.js and tests/tidesScenarios.test.js.
// =============================================================================

import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures.js';
import {
  commitPredictionHeld,
  lessonPlan,
  openInvestigation,
  readout,
  recordFields,
  row,
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
    id: 'why-rings',
    sid: 'sl9-limits',
    row: /Rigid limit/i,
    rowEs: /Límite rígido/i,
    title: /^Where does a moon fall apart/i,
    titleEs: /^¿Dónde se desintegra/i,
  },
  {
    id: 'why-rings',
    sid: 'where-the-gap-falls',
    row: /Radius\sof\sthe\s2:1\sresonance/i,
    rowEs: /Radio de la resonancia 2:1/i,
    title: /^Where does a moon’s resonance/i,
    titleEs: /^¿Dónde cae la resonancia/i,
  },
  {
    id: 'tides-that-move-the-moon',
    sid: 'match-the-recession',
    row: /Moon’s recession now/i,
    rowEs: /Alejamiento de la Luna ahora/i,
    title: /^How the Moon/i,
    titleEs: /^Cómo cambian/i,
  },
  {
    id: 'ios-fire',
    sid: 'heating-at-two-eccentricities',
    row: /Heating/i,
    rowEs: /Calentamiento/i,
    title: /^How much heat/i,
    titleEs: /^¿Cuánto calor/i,
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

const SCENARIOS = [
  { sid: 'a-pass-inside-the-limit', id: 'why-rings', bodies: 61 },
  { sid: 'a-ring-with-a-resonance', id: 'why-rings', bodies: 203 },
];

for (const c of SCENARIOS) {
  test(`${c.id} ${c.sid}: the scenario the step opens builds the ${c.bodies} bodies its declaration gives`, async ({
    page,
    app,
  }) => {
    test.slow();
    await open(page, app, c.id);
    const plan = await lessonPlan(page, c.id);
    await walkToSid(page, plan, c.sid);
    await expect
      .poll(
        () =>
          page.evaluate(async () => {
            const p = await import('/js/physics.js');
            return (
              p.stars.length +
              p.planets.length +
              p.gas_giants.length +
              p.asteroids.length
            );
          }),
        { timeout: 15000 }
      )
      .toBe(c.bodies);
  });
}

// The two searches of Prompt 331: a pair of k2 and Q, and a Q, are found on the
// instrument and written down; the check refuses what lies on the wrong side of
// the observed value in the lesson's own words and accepts any answer inside it.
const verdictOf = page => page.locator('#investigationBody .inv-check');

test('ios-fire find-the-interiors: any two pairs inside the observed range pass, one outside is refused in words', async ({
  page,
  app,
}) => {
  test.slow();
  await openInvestigation(page, app, 'ios-fire');
  const plan = await lessonPlan(page, 'ios-fire');
  const predict = await walkToSid(page, plan, 'double-predict');
  await commitPredictionHeld(page, predict);
  await walkToSid(page, plan, 'find-the-interiors');

  // The instrument opens with k2 = 0.8 and Q = 250: under the observed range, not at it.
  const opening = row(await readout(page), /^Heating$/i);
  expect(opening.text).toMatch(/10¹³/);

  // Too much heat: k2 = 1.5 and Q = 50 give 1.87 x 10^14 W.
  await setControl(page, 'k2', 1.5);
  await setControl(page, 'Q', 50);
  expect(row(await readout(page), /^Heating$/i).text).toMatch(/10¹⁴/);
  const L = 'ios-fire';
  const S = 'find-the-interiors';
  await recordFields(page, L, S, { k2a: 1.5, qa: 50, k2b: 0.5, qb: 30 });
  await expect(verdictOf(page)).toHaveClass(/is-error/);
  await expect(verdictOf(page)).toContainText(/^Too much/);

  // Two pairs the instrument puts inside the range, with k2 at least 0.2 apart.
  await setControl(page, 'k2', 0.5);
  await setControl(page, 'Q', 30);
  const pairOne = row(await readout(page), /^Heating$/i).text;
  expect(pairOne).toMatch(/10¹⁴/);
  await recordFields(page, L, S, { k2a: 0.5, qa: 30, k2b: 1.0, qb: 60 });
  await expect(verdictOf(page)).toHaveClass(/is-ok/);
  await expect(verdictOf(page)).toContainText(/cannot tell these interiors/);

  // Two pairs with the same k2 are one interior.
  await recordFields(page, L, S, { k2b: 0.55, qb: 33 });
  await expect(verdictOf(page)).toHaveClass(/is-error/);
  await expect(verdictOf(page)).toContainText(/nearly the same interior/);
});

test('ios-fire: the two readings are taken from the instrument by a button, and the reveal sets them beside the prediction', async ({
  page,
  app,
}) => {
  test.slow();
  await openInvestigation(page, app, 'ios-fire');
  const plan = await lessonPlan(page, 'ios-fire');
  const predict = await walkToSid(page, plan, 'double-predict');
  await commitPredictionHeld(page, predict);
  await walkToSid(page, plan, 'heating-at-two-eccentricities');

  // The instrument opens at the smallest eccentricity, away from either reading.
  const first = await readout(page);
  expect(row(first, /^Heating$/i).text).toMatch(/10¹²/);
  const take = field =>
    page.locator(`#investigationBody [data-take="${field}"]`);
  await setControl(page, 'e', 0.0041);
  await take('p1').focus();
  await page.keyboard.press('Enter');
  await setControl(page, 'e', 0.0082);
  await take('p2').focus();
  await page.keyboard.press('Enter');
  await expect(
    page.locator(
      '#investigationBody [data-field="ios-fire:heating-at-two-eccentricities:p1"]'
    )
  ).toHaveValue('1.99');
  await expect(
    page.locator(
      '#investigationBody [data-field="ios-fire:heating-at-two-eccentricities:p2"]'
    )
  ).toHaveValue('7.96');
  await expect(verdictOf(page)).toHaveClass(/is-ok/);

  await walkToSid(page, plan, 'what-doubling-did');
  const verdict = page.locator('#investigationBody .inv-verdict');
  await expect(verdict).toBeVisible();
  await expect(verdict).toContainText('1.99');
  await expect(verdict).toContainText('7.96');
  await expect(verdict).toContainText(/Taken from/);
  expect(step(plan, 'what-doubling-did').type).toBe('read');
});

test('tides-that-move-the-moon match-the-recession: the Q is found on the slider against the measured value', async ({
  page,
  app,
}) => {
  test.slow();
  await openInvestigation(page, app, 'tides-that-move-the-moon');
  const plan = await lessonPlan(page, 'tides-that-move-the-moon');
  const L = 'tides-that-move-the-moon';
  const S = 'match-the-recession';
  await walkToSid(page, plan, S);
  // Opens at Q = 40, which recedes more slowly than laser ranging measures.
  expect(row(await readout(page), /Moon’s recession now/i).text).toMatch(
    /^1\.1/
  );
  await recordFields(page, L, S, { q: 40, day: 0.7 });
  await expect(verdictOf(page)).toHaveClass(/is-error/);
  await expect(verdictOf(page)).toContainText(/slower than laser/);
  await setControl(page, 'Q', 12);
  expect(row(await readout(page), /Moon’s recession now/i).text).toMatch(
    /^3\.7/
  );
  await recordFields(page, L, S, { q: 12, day: 2.05 });
  await expect(verdictOf(page)).toHaveClass(/is-ok/);
});
