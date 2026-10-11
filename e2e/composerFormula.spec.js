// =============================================================================
// A formula question in the Investigation Composer, in a browser (Prompt 100)
// -----------------------------------------------------------------------------
// tests/formulaSurfaces.test.js holds the checks and the grading without a page.
// This is the page: a numeric question whose expected value is a formula over
// the student's own measurement opens valid, shows its rule in the answer key,
// says in the preview that it cannot be checked until the student has measured,
// and then accepts the number that measurement gives.
// =============================================================================

import { test, expect } from './fixtures.js';
import { EXAMPLE_INVESTIGATION } from '../js/composer/example.js';

const pack = () => {
  const p = JSON.parse(JSON.stringify(EXAMPLE_INVESTIGATION));
  const at = p.steps.findIndex(s => s.sid === 'again');
  p.steps.splice(at, 0, {
    sid: 'ratio',
    type: 'question',
    kind: 'numeric',
    title: { en: 'Your year', es: 'Tu año' },
    body: { en: 'Use your timing.', es: 'Usa tu medida.' },
    prompt: { en: 'How many years was it?', es: '¿Cuántos años fue?' },
    because: { en: 'Days over days per year.', es: 'Días entre días por año.' },
    formula: {
      expr: 'P / 1[yr]',
      of: { P: 'time-it.period' },
      tolerancePct: 5,
    },
    scoring: { points: 1, attempts: 'best' },
  });
  return p;
};

test('a formula question is valid, keyed by its rule, and graded against the student’s own measurement', async ({
  page,
}) => {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('gravitas_welcome_seen_v1', '1');
    } catch {
      /* storage unavailable */
    }
  });
  await page.goto('/studio/lesson/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toHaveAttribute('data-ready', 'true', {
    timeout: 30_000,
  });
  await page.locator('#cp-file').setInputFiles({
    name: 'formula.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(pack())),
  });
  await expect(page.locator('#cp-checks-summary')).toHaveText(
    'The investigation is valid.',
    { timeout: 30_000 }
  );
  await expect(page.locator('#cp-key')).toContainText('P / 1[yr]');

  const p = pack();
  const frame = () =>
    page.evaluate(() => document.getElementById('cp-preview').contentWindow);
  void frame;
  await page.evaluate(() => {
    const a = document.getElementById('cp-preview-author');
    a.addEventListener('click', e => e.preventDefault(), { once: true });
    a.click();
  });
  const stepOf = sid => p.steps.findIndex(s => s.sid === sid) + 1;
  const open = n =>
    page.evaluate(
      ([id, k]) => {
        document.getElementById('cp-preview').src =
          `${location.origin}/?author=draft-${id}&view=student&step=${k}`;
      },
      [p.id, n]
    );
  const body = () =>
    page.evaluate(
      () =>
        document
          .getElementById('cp-preview')
          .contentWindow?.document?.getElementById('investigationBody')
          ?.textContent ?? ''
    );

  // Straight to the question: nothing measured, nothing to check against.
  await open(stepOf('ratio'));
  await expect
    .poll(body, { timeout: 30_000 })
    .toContain('checked against your own measurements');

  // Measure, move on to the question, and answer with what the measurement gives.
  await open(stepOf('time-it'));
  await expect.poll(body, { timeout: 30_000 }).toContain('Time the Earth');
  const fill = (selector, value) =>
    page.evaluate(
      ([s, v]) => {
        const w = document.getElementById('cp-preview').contentWindow;
        const input = w.document.querySelector(s);
        input.value = v;
        input.dispatchEvent(new w.Event('input', { bubbles: true }));
      },
      [selector, value]
    );
  const press = id =>
    page.evaluate(
      i =>
        document
          .getElementById('cp-preview')
          .contentWindow.document.getElementById(i)
          .click(),
      id
    );
  await fill('[data-field]', '730.5');
  await press('investigationNext');
  await press('investigationNext');
  await expect.poll(body, { timeout: 30_000 }).toContain('How many years');
  expect(await body()).not.toContain('checked against your own measurements');
  const check = () =>
    page.evaluate(() => {
      const w = document.getElementById('cp-preview').contentWindow;
      [...w.document.querySelectorAll('#investigationBody button')]
        .find(b => b.textContent.trim() === 'Check')
        .click();
    });
  await fill('.inv-answer-num', '5');
  await check();
  const wrong = await body();
  await fill('.inv-answer-num', '2');
  await check();
  await expect.poll(body).not.toBe(wrong);
});
