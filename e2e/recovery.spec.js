// =============================================================================
// Prerequisites as advice, and the way back after a wrong answer
// (Roadmap III Prompt 276, part 2)
// -----------------------------------------------------------------------------
// tests/recovery.test.js and tests/acrossInvestigations.test.js hold the rules
// without a page. These are the pages:
//   - a Library card says "You may want X first" with a link, in both
//     languages, locks nothing, and stops once X is finished;
//   - the lesson panel says the same behind More, and the link opens X;
//   - on a shipped step a wrong number offers the instrument explained, opens
//     it through the panel's own button, and the wrong answers are kept in the
//     progress record in order;
//   - on an instructor's own investigation, whose steps carry no hints, the
//     generated ladder gives the units, the order of magnitude and the formula
//     one press at a time, named as generated, by keyboard, at phone width;
//   - My work offers the same quantity measured in two investigations for
//     comparison, and one press lands on the comparison's statement.
// =============================================================================

import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures.js';
import { EXAMPLE_INVESTIGATION } from '../js/composer/example.js';
import { buildEntry } from '../js/notebook/entry.js';
import { artifact } from '../js/platform/artifact.js';

const LIBRARY = JSON.parse(readFileSync('library/library.json', 'utf8'));
const entryOf = id => LIBRARY.entries.find(e => e.id === `investigation:${id}`);
const LATER = entryOf('orbital-energy');
const FIRST = entryOf('keplers-laws');
const status = page => page.locator('#srStatus');

/** Every step of a lesson seen, as its progress record says it. */
const finish = (page, entry) =>
  page.addInitScript(
    ([id, steps]) =>
      localStorage.setItem(
        `gravitas_investigation_${id}`,
        JSON.stringify({
          schema: 2,
          lesson: id,
          visited: Array.from({ length: steps }, (_, i) => `s${i}`),
          responses: {},
          attempts: {},
          startedAt: null,
        })
      ),
    [entry.id.replace('investigation:', ''), entry.steps]
  );

async function openLibrary(page, query = '?browse=1') {
  await page.goto(`/library/${query}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', {
    timeout: 30_000,
  });
}

test.describe('prerequisites are advice', () => {
  test('a Library card links what to do first, in both languages, and locks nothing', async ({
    page,
  }) => {
    expect(LATER.prerequisites).toContain(FIRST.id);
    await openLibrary(page);
    const card = page.locator(`.lib-card[data-entry="${LATER.id}"]`);
    const advice = card.locator('.lib-before');
    await expect(advice).toHaveText(
      `You may want this first: ${FIRST.title.en}`
    );
    await expect(advice.getByRole('link')).toHaveAttribute('href', FIRST.route);
    // The card it sits on still opens, and nothing on it is disabled.
    await expect(card.locator('a.lib-link')).toHaveAttribute(
      'href',
      LATER.route
    );
    await expect(
      card.locator('[disabled], [aria-disabled="true"]')
    ).toHaveCount(0);
    // An investigation that builds on nothing carries no advice.
    await expect(
      page.locator(`.lib-card[data-entry="${FIRST.id}"] .lib-before`)
    ).toHaveCount(0);

    await page.evaluate(() => localStorage.setItem('gravitas_locale', 'es'));
    await openLibrary(page);
    await expect(advice).toHaveText(
      `Quizá quieras hacer antes: ${FIRST.title.es}`
    );
  });

  test('the advice goes once the earlier investigation is finished', async ({
    page,
  }) => {
    await finish(page, FIRST);
    await openLibrary(page);
    const card = page.locator(`.lib-card[data-entry="${LATER.id}"]`);
    await expect(card).toBeVisible();
    await expect(card.locator('.lib-before')).toHaveCount(0);
  });

  test('the lesson panel says it behind More, and the link opens the earlier investigation', async ({
    page,
    app,
  }) => {
    await app.boot({ url: LATER.route });
    await expect(page.locator('#investigationPanel')).toBeVisible();
    const advice = page.locator('#investigationBefore');
    // Nothing is asked of the Library until the reader opens More.
    await expect(advice).toBeHidden();
    await page.locator('#investigationMore > summary').click();
    await expect(advice).toBeVisible();
    await expect(advice).toHaveText(
      `You may want this first: ${FIRST.title.en}`
    );
    // Advice, not a lock: the step is still there to do.
    await expect(page.locator('#investigationNext')).toBeEnabled();
    await advice.getByRole('link').click();
    await expect(page.locator('#investigationTitle')).toHaveText(
      FIRST.title.en
    );
    // The earlier investigation builds on nothing: no advice there.
    await expect(advice).toBeHidden();
  });

  test('the lesson panel says nothing once the earlier investigation is finished', async ({
    page,
    app,
  }) => {
    await finish(page, FIRST);
    await app.boot({ url: LATER.route });
    await expect(page.locator('#investigationPanel')).toBeVisible();
    const more = page.locator('#investigationMore');
    await more.locator('summary').click();
    await expect(more).toHaveJSProperty('open', true);
    await expect(page.locator('#investigationHelp')).toBeVisible();
    await expect(page.locator('#investigationBefore')).toBeHidden();
  });
});

test.describe('after a wrong answer on a shipped step', () => {
  const LESSON = 'power-law-gravity';
  const SID = 'predict-the-slope';
  const KEY = `gravitas_investigation_${LESSON}`;

  test('the instrument is explained on request and the wrong answers are kept in order', async ({
    page,
    app,
  }) => {
    // A student at the step, as a saved record puts them there.
    await page.addInitScript(
      ([key, lesson, sid]) => {
        if (!localStorage.getItem(key))
          localStorage.setItem(
            key,
            JSON.stringify({
              schema: 2,
              lesson,
              stepSid: sid,
              responses: {},
              attempts: {},
              visited: [sid],
              startedAt: '2026-11-10T00:00:00.000Z',
            })
          );
      },
      [KEY, LESSON, SID]
    );
    await app.boot({ url: `/#investigation=${LESSON}` });
    const body = page.locator('#investigationBody');
    await expect(body.locator('[data-numeric]')).toBeVisible();
    // Nothing of the way back before an answer is wrong.
    await expect(body.locator('[data-recover]')).toHaveCount(0);

    await body.locator('[data-numeric]').fill('7');
    await body.locator('[data-check-numeric]').click();
    await expect(body.locator('.inv-feedback')).toHaveClass(/is-wrong/);
    const way = body.locator('[data-recover]');
    const explain = way.getByRole('button', {
      name: 'Try again with the instrument explained',
    });
    await expect(explain).toBeVisible();
    // The author wrote this step's hints: none is generated beside them.
    await expect(way.locator('[data-gen-next]')).toHaveCount(0);
    await expect(body.locator('[data-hint]')).toBeVisible();

    await explain.focus();
    await page.keyboard.press('Enter');
    const toggle = page.locator('#investigationToolExplain');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(toggle).toBeFocused();
    await expect(page.locator('.explainer')).toBeVisible();
    await expect(status(page)).toContainText(
      /explanation of the instrument is open/
    );
    // The answer is still the student's: try again.
    await body.locator('[data-numeric]').fill('6');
    await body.locator('[data-check-numeric]').click();
    await expect(body.locator('.inv-feedback')).toHaveClass(/is-wrong/);
    await body.locator('[data-numeric]').fill('1.95');
    await body.locator('[data-check-numeric]').click();
    await expect(body.locator('.inv-feedback')).toHaveClass(/is-right/);
    await expect(body.locator('[data-recover]')).toHaveCount(0);

    const saved = await page.evaluate(
      key => JSON.parse(localStorage.getItem(key)),
      KEY
    );
    const id = `${LESSON}:${SID}`;
    expect(saved.responses[`${id}:tries`]).toBe('7\n6');
    expect(saved.responses[`${id}:first`]).toBe('7');
    expect(saved.attempts[id]).toBe(3);
    expect(saved.schema).toBe(2);
  });
});

test.describe('the generated ladder, on an investigation whose author wrote no hints', () => {
  const question = extra => ({
    type: 'question',
    kind: 'numeric',
    body: { en: 'Use your timing.', es: 'Usa tu medida.' },
    because: { en: 'Days over days per year.', es: 'Días entre días por año.' },
    scoring: { points: 1, attempts: 'best' },
    ...extra,
  });
  const pack = () => {
    const p = JSON.parse(JSON.stringify(EXAMPLE_INVESTIGATION));
    const at = p.steps.findIndex(s => s.sid === 'again');
    p.steps.splice(
      at,
      0,
      question({
        sid: 'ratio',
        title: { en: 'Your year', es: 'Tu año' },
        prompt: { en: 'How many years was it?', es: '¿Cuántos años fue?' },
        formula: {
          expr: 'P / 1[yr]',
          of: { P: 'time-it.period' },
          tolerancePct: 5,
        },
      }),
      question({
        sid: 'eight',
        title: { en: 'Four times as far', es: 'Cuatro veces más lejos' },
        prompt: {
          en: 'How long is a year four times as far out?',
          es: '¿Cuánto dura un año cuatro veces más lejos?',
        },
        answer: 8,
        tolerance: 0.4,
        unit: 'yr',
      })
    );
    return p;
  };

  for (const lang of ['en', 'es']) {
    test(`units, order of magnitude and formula, one press at a time, named as generated (${lang}, phone width)`, async ({
      page,
      app,
    }) => {
      const es = lang === 'es';
      await page.setViewportSize({ width: 390, height: 844 });
      await page.addInitScript(l => {
        try {
          window.localStorage.setItem('gravitas_welcome_seen_v1', '1');
          window.localStorage.setItem('gravitas_locale', l);
        } catch {
          /* storage unavailable */
        }
      }, lang);
      await page.goto('/studio/lesson/', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('body')).toHaveAttribute('data-ready', 'true', {
        timeout: 30_000,
      });
      await page.locator('#cp-file').setInputFiles({
        name: 'no-hints.json',
        mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify(pack())),
      });
      await expect(page.locator('#cp-checks-summary')).toHaveText(
        es ? 'La investigación es válida.' : 'The investigation is valid.',
        { timeout: 30_000 }
      );

      // The preview link is what stores the draft the address below opens.
      await page.evaluate(() => {
        const a = document.getElementById('cp-preview-author');
        a.addEventListener('click', e => e.preventDefault(), { once: true });
        a.click();
      });

      const p = pack();
      const stepOf = sid => p.steps.findIndex(s => s.sid === sid) + 1;
      const body = page.locator('#investigationBody');
      const way = body.locator('[data-recover]');
      const check = body.locator('[data-check-numeric]');

      // The fixed answer first: it declares a unit and a number, no formula.
      await app.boot({
        url: `/?author=draft-${p.id}&view=student&step=${stepOf('eight')}`,
      });
      await expect(body.locator('[data-numeric]')).toBeVisible();
      await expect(way).toHaveCount(0);
      await body.locator('[data-numeric]').fill('80');
      await check.click();
      await expect(way).toBeVisible();
      await expect(way.locator('.inv-gen-note')).toHaveText(
        es
          ? /Generada a partir de la comprobación de este paso/
          : /Generated from this step’s own check/
      );
      const next = way.locator('[data-gen-next]');
      await expect(next).toHaveText(
        es
          ? 'Mostrar una pista generada (1 de 2): las unidades'
          : 'Show a generated hint (1 of 2): the units'
      );
      // By keyboard, and focus lands on the hint that was shown.
      await next.focus();
      await page.keyboard.press('Enter');
      const units = way.locator('[data-gen="units"]');
      await expect(units).toBeFocused();
      await expect(units).toContainText(
        es ? 'La respuesta se pide en yr.' : 'The answer is wanted in yr.'
      );
      await expect(status(page)).toContainText(
        es ? /Pista generada a la vista/ : /Generated hint shown/
      );
      await page.keyboard.press('Tab');
      await expect(next).toBeFocused();
      await expect(next).toContainText(
        es
          ? '(2 de 2): el orden de magnitud'
          : '(2 of 2): the order of magnitude'
      );
      await page.keyboard.press('Space');
      const size = way.locator('[data-gen="magnitude"]');
      await expect(size).toContainText(
        es ? 'entre 1 y 10 yr' : 'between 1 and 10 yr'
      );
      // The ladder ends: no rung states the answer and there is no third.
      await expect(next).toHaveCount(0);
      await expect(way).not.toContainText(/\b8\b/);
      // Nothing spills sideways at phone width.
      expect(
        await way.evaluate(el => el.scrollWidth <= el.clientWidth + 1)
      ).toBe(true);
      const axe = await new AxeBuilder({ page })
        .include('#investigationBody')
        .analyze();
      expect(axe.violations.map(v => v.id)).toEqual([]);

      // The check that is a formula over the student's own measurement.
      await app.boot({
        url: `/?author=draft-${p.id}&view=student&step=${stepOf('time-it')}`,
      });
      await body.locator('[data-field]').first().fill('730.5');
      await page.locator('#investigationNext').click();
      await page.locator('#investigationNext').click();
      await expect(body).toContainText(
        es ? '¿Cuántos años fue?' : 'How many years was it?'
      );
      await body.locator('[data-numeric]').fill('5');
      await check.click();
      await expect(next).toContainText(
        es
          ? '(1 de 2): el orden de magnitud'
          : '(1 of 2): the order of magnitude'
      );
      await next.click();
      await expect(way.locator('[data-gen="magnitude"]')).toContainText(
        es ? 'entre 1 y 10' : 'between 1 and 10'
      );
      await expect(next).toContainText(
        es ? '(2 de 2): la fórmula' : '(2 of 2): the formula'
      );
      await next.click();
      const formula = way.locator('[data-gen="formula"]');
      await expect(formula.locator('code')).toHaveText('P / 1[yr]');
      await expect(formula).toContainText(
        es ? 'Cronometra la Tierra' : 'Time the Earth'
      );
      await expect(next).toHaveCount(0);
      // And the number the measurement gives is still the student's to find.
      await body.locator('[data-numeric]').fill('2');
      await check.click();
      await expect(body.locator('.inv-feedback')).toHaveClass(/is-right/);
      await expect(way).toHaveCount(0);
    });
  }
});

test.describe('the same quantity in two investigations, on My work', () => {
  const q = (value, sigma) => ({
    id: 'mass',
    value,
    unit: null,
    uncertainty: { kind: 'sigma', sigma, basis: 'data' },
    origin: 'fitted',
    label: 'Mass',
  });
  const entry = (id, title, value, sigma, lesson, day) =>
    buildEntry({
      id,
      source: 'inference-fit',
      title,
      quantities: [{ label: 'x', value: 0, unit: '' }],
      capturedAt: Date.parse(day),
      context: { lesson, step: 3 },
      artifact: artifact({
        id,
        source: { kind: 'pipeline', id: 'rv-fit' },
        quantities: [q(value, sigma)],
      }),
    });
  const NOTEBOOK = JSON.stringify({
    v: 1,
    entries: [
      entry(
        'm1',
        'Mass, from the orbit',
        10,
        0.3,
        'keplers-laws',
        '2026-03-10T12:00:00'
      ),
      entry(
        'm2',
        'Mass, from the wobble',
        9,
        0.4,
        'weighing-stars',
        '2026-04-02T12:00:00'
      ),
    ],
  });

  for (const lang of ['en', 'es']) {
    test(`offers the comparison and one press lands on its statement (${lang}, phone width)`, async ({
      page,
    }) => {
      const es = lang === 'es';
      await page.setViewportSize({ width: 390, height: 844 });
      await page.addInitScript(
        ([l, nb]) => {
          localStorage.setItem('gravitas_locale', l);
          if (!localStorage.getItem('gravitas_evidence_notebook'))
            localStorage.setItem('gravitas_evidence_notebook', nb);
        },
        [lang, NOTEBOOK]
      );
      await page.goto('/my-work/', { waitUntil: 'domcontentloaded' });
      const box = page.locator('#mwAcross');
      await expect(box).toBeVisible();
      await expect(box.getByRole('heading')).toHaveText(
        es ? 'Entre tus investigaciones' : 'Across your investigations'
      );
      const item = box.locator('li');
      await expect(item).toHaveCount(1);
      await expect(item).toContainText(
        es
          ? 'Lo mediste en investigación keplers-laws, paso 3 (Mass, from the orbit) y en investigación weighing-stars, paso 3 (Mass, from the wobble).'
          : 'You measured it in investigation keplers-laws, step 3 (Mass, from the orbit) and in investigation weighing-stars, step 3 (Mass, from the wobble).'
      );
      const button = item.getByRole('button');
      await button.focus();
      await page.keyboard.press('Enter');
      const result = page.locator('#mwReview [data-rv="result"]');
      await expect(result).toBeFocused();
      await expect(result).toHaveClass(/is-ok/);
      await expect(result).toContainText(
        es ? /independencia/i : /Independence assumed/
      );
      await expect(
        page.locator('#mwReview input[data-rv="compare"]:checked')
      ).toHaveCount(2);
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth + 1
        )
      ).toBe(true);
      const axe = await new AxeBuilder({ page }).include('#mwReview').analyze();
      expect(axe.violations.map(v => v.id)).toEqual([]);
    });
  }
});
