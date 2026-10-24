// =============================================================================
// Frames to a light curve, in a browser (Prompt 185)
// -----------------------------------------------------------------------------
// FRAME_PIPELINE.md committed what the pipeline must do before it existed;
// tests/framePipeline.test.js and tools/frame-pipeline-validate.mjs hold the
// numbers (truth recovery, the independent oracle, coverage, refusals). This
// holds the panel: a sequence run and read one step at a time with the keyboard
// alone and the same with a single pointer and no key event, the period and the
// amplitude read back against the values the sequence was drawn with, the
// comparison-star chooser, a table of the light curve, a CSV and a ledger entry,
// a pointing lost in two frames refused with the frames named and the run
// repeated without them, the frame limit stated and enforced, both languages,
// axe in both themes, and every control at least 24 px at 1280 and 390 px.
//
// The frames are the calibration lab's own detector frames, drawn from a seed in
// the page; what was drawn (period 0.12 d, semi-amplitude 0.05 mag) is written
// here from FRAME_PIPELINE.md, not read from the panel.
// =============================================================================

import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures.js';

const TAGS = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22aa',
  'best-practice',
];
const PERIOD = 0.12;
const AMPLITUDE = 0.05;
const RUN = { en: 'Run the pipeline', es: 'Ejecutar el proceso' };
const NEXT = { en: 'Next step', es: 'Paso siguiente' };

async function openPage(page, lang = 'en') {
  await page.addInitScript(l => {
    try {
      localStorage.setItem('gravitas_locale', l);
    } catch {
      /* none */
    }
  }, lang);
  await page.goto('/observatory/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', {
    timeout: 30_000,
  });
}

const box = page => page.locator('#obsSeqBody');
const btn = (page, name) =>
  box(page).getByRole('button', { name, exact: true });
const live = page => box(page).locator('[role=status]');
const number = s => Number(String(s).replace(/[,\s]/g, '').replace('−', '-'));

/** Open the panel. `keyboard`: Enter on the summary, no pointer. */
async function openPanel(page, { keyboard = false, lang = 'en' } = {}) {
  const summary = page.locator('#obsSeqPanel > summary');
  if (keyboard) {
    await summary.focus();
    await page.keyboard.press('Enter');
  } else await summary.click();
  await expect(btn(page, RUN[lang])).toBeVisible({ timeout: 30_000 });
}

async function press(locator, page) {
  await locator.focus();
  await page.keyboard.press('Enter');
}

/** Count what the page received of each kind of input, and what the live region said. */
const watchInput = page =>
  page.evaluate(() => {
    window.__ptr = 0;
    window.__keys = 0;
    for (const e of ['pointerdown', 'pointerup', 'mousedown', 'mouseup'])
      document.addEventListener(e, () => window.__ptr++, true);
    document.addEventListener('keydown', () => window.__keys++, true);
    window.__said = [];
    const region = document.querySelector('#obsSeqBody [role=status]');
    new MutationObserver(list => {
      for (const m of list)
        for (const n of m.addedNodes) window.__said.push(n.textContent);
    }).observe(region, { childList: true });
  });
const counts = page =>
  page.evaluate(() => ({
    ptr: window.__ptr,
    keys: window.__keys,
    said: window.__said.slice(),
  }));

/** The period and the semi-amplitude, with their errors, from the sentence the panel says. */
async function said(page) {
  const text = await live(page).textContent();
  const m = text.match(
    /period ([\d.,]+) ± ([\d.,]+) days, semi-amplitude ([\d.,]+) ± ([\d.,]+)/
  );
  expect(m, `a light-curve sentence in "${text}"`).not.toBeNull();
  return {
    period: number(m[1]),
    sigmaPeriod: number(m[2]),
    amplitude: number(m[3]),
    sigmaAmplitude: number(m[4]),
  };
}

async function runAndWait(page, lang = 'en', { keyboard = false } = {}) {
  if (keyboard) await press(btn(page, RUN[lang]), page);
  else await btn(page, RUN[lang]).click();
  await expect(live(page)).toContainText(/± [\d.,]+ (days|días)/, {
    timeout: 120_000,
  });
}

test.describe('frames to a light curve: keyboard alone', () => {
  test('the sequence is run, read one step at a time, and its period and amplitude agree with the drawn values, with no pointer event', async ({
    page,
  }) => {
    await openPage(page);
    await openPanel(page, { keyboard: true });
    await watchInput(page);
    await expect(box(page)).toContainText('at most 256 frames');
    await runAndWait(page, 'en', { keyboard: true });
    const r = await said(page);
    expect(Math.abs(r.period - PERIOD)).toBeLessThan(
      Math.max(5 * r.sigmaPeriod, 0.003)
    );
    expect(Math.abs(r.amplitude - AMPLITUDE)).toBeLessThan(
      5 * r.sigmaAmplitude
    );
    expect(r.sigmaPeriod).toBeGreaterThan(0);
    expect(r.sigmaAmplitude).toBeGreaterThan(0);
    // One step at a time: six, each with its own table.
    await expect(box(page).locator('h3')).toContainText('Step 1 of 6');
    for (let k = 2; k <= 6; k++) {
      await press(btn(page, NEXT.en), page);
      await expect(box(page).locator('h3')).toContainText(`Step ${k} of 6`);
      await expect(
        box(page).locator('caption', { hasText: 'What this step measured' })
      ).toBeVisible();
    }
    // The comparison-star chooser: a row for each candidate, with its steadiness.
    await press(btn(page, '5. Comparison stars'), page);
    const rows = box(page).locator('table.im-table tbody tr');
    expect(await rows.count()).toBeGreaterThanOrEqual(3);
    await expect(
      box(page).locator('input[type=checkbox][data-star]').first()
    ).toBeVisible();
    // The plot and its table.
    await press(btn(page, '6. Light curve'), page);
    await expect(box(page).locator('svg.ow-plot')).toBeVisible();
    const points = box(page).locator('details table.im-table tbody tr');
    await box(page).locator('details > summary').last().focus();
    await page.keyboard.press('Enter');
    expect(await points.count()).toBe(48);
    const { ptr, keys, said: heard } = await counts(page);
    expect(ptr).toBe(0);
    expect(keys).toBeGreaterThan(0);
    expect(heard.join(' ')).toMatch(/Light curve of 48 frames/);
  });
});

test.describe('frames to a light curve: single pointer alone', () => {
  test('a run, a CSV, a ledger entry and the light curve opened in the Observatory, all by clicks and with no key event', async ({
    page,
  }) => {
    await openPage(page);
    await openPanel(page);
    await watchInput(page);
    await runAndWait(page);
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      btn(page, 'Save the light curve as CSV').click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.csv$/);
    const text = await (
      await import('node:fs/promises')
    ).readFile(await download.path(), 'utf8');
    const lines = text.replace(/^﻿/, '').trim().split(/\r?\n/);
    expect(lines).toHaveLength(49);
    expect(lines[0]).toContain('Differential magnitude');
    await btn(page, 'Keep in the ledger').click();
    await expect(live(page)).toContainText('kept in the ledger');
    const kept = await page.evaluate(() =>
      Object.keys(localStorage).filter(k => /notebook|ledger/i.test(k))
    );
    expect(kept.length).toBeGreaterThan(0);
    await btn(page, 'Open the light curve in the Observatory').click();
    await expect(live(page)).toContainText('open in the Observatory');
    await expect(
      page.locator('#obsTable, #obsTitle, main').first()
    ).toContainText('Light curve from synthetic frames (seed 1)');
    const { keys, ptr } = await counts(page);
    expect(keys).toBe(0);
    expect(ptr).toBeGreaterThan(0);
  });

  test('a comparison star ticked or unticked is used, and the run repeats with it', async ({
    page,
  }) => {
    await openPage(page);
    await openPanel(page);
    await runAndWait(page);
    await btn(page, '5. Comparison stars').click();
    const ticks = box(page).locator('input[type=checkbox][data-star]');
    const n = await ticks.count();
    expect(n).toBeGreaterThanOrEqual(3);
    const ticked = () =>
      box(page).locator('input[type=checkbox][data-star]:checked').count();
    const before = await ticked();
    expect(before).toBeGreaterThanOrEqual(3);
    await ticks.first().click();
    await btn(page, 'Use the ticked stars and run again').click();
    await expect(live(page)).toContainText('Light curve of 48 frames', {
      timeout: 120_000,
    });
    const after = await said(page);
    expect(Math.abs(after.period - PERIOD)).toBeLessThan(
      Math.max(5 * after.sigmaPeriod, 0.003)
    );
    await btn(page, '5. Comparison stars').click();
    expect(await ticked()).toBe(before - 1);
  });
});

test.describe('frames to a light curve: refusals and limits', () => {
  test('a pointing lost in two frames is refused with the frames named, and the run repeats without them', async ({
    page,
  }) => {
    await openPage(page);
    await openPanel(page);
    await box(page).getByLabel('Lose the pointing', { exact: false }).check();
    await btn(page, RUN.en).click();
    await expect(box(page).locator('.ui-status.is-error')).toContainText(
      'could not be lined up',
      { timeout: 120_000 }
    );
    await expect(box(page).locator('.ui-status.is-error')).toContainText(
      '11, 12'
    );
    for (const n of [
      'Save the light curve as CSV',
      'Keep in the ledger',
      'Open the light curve in the Observatory',
    ])
      await expect(btn(page, n)).toBeDisabled();
    await btn(page, 'Leave out the named frames and run again').click();
    await expect(live(page)).toContainText('Light curve of 46 frames', {
      timeout: 120_000,
    });
  });

  test('the frame limit is stated, and a count beyond it is refused by number', async ({
    page,
  }) => {
    await openPage(page);
    await openPanel(page);
    await expect(box(page)).toContainText('1,398,101 pixels');
    await box(page)
      .getByLabel('Frames (5 to 256)', { exact: false })
      .fill('300');
    await btn(page, RUN.en).click();
    await expect(box(page).locator('.ui-status.is-error')).toContainText(
      'at most 256 frames; this one has 300'
    );
    await box(page).getByLabel('Frames (5 to 256)', { exact: false }).fill('3');
    await btn(page, RUN.en).click();
    await expect(box(page).locator('.ui-status.is-error')).toContainText(
      'At least 5 frames are needed'
    );
  });
});

test.describe('frames to a light curve: both languages, axe, and every control', () => {
  for (const lang of ['en', 'es']) {
    test(`axe with a result, and 24 px targets at 1280 and 390, ${lang}`, async ({
      page,
    }) => {
      await openPage(page, lang);
      await openPanel(page, { lang });
      await runAndWait(page, lang);
      await btn(
        page,
        lang === 'es' ? '6. Curva de luz' : '6. Light curve'
      ).click();
      await expect(box(page).locator('svg.ow-plot')).toBeVisible();
      if (lang === 'es')
        await expect(page.locator('#obsSeqPanel > summary')).toContainText(
          'De imágenes a una curva de luz'
        );
      for (const scheme of ['light', 'dark']) {
        await page.emulateMedia({ colorScheme: scheme });
        const violations = (
          await new AxeBuilder({ page })
            .withTags(TAGS)
            .include('#obsSeqPanel')
            .analyze()
        ).violations.map(
          v => `${v.id}: ${v.nodes.map(n => n.target).join(' ')}`
        );
        expect(violations, `${lang} ${scheme}`).toEqual([]);
      }
      await btn(
        page,
        lang === 'es' ? '5. Estrellas de comparación' : '5. Comparison stars'
      ).click();
      for (const width of [1280, 390]) {
        await page.setViewportSize({ width, height: 900 });
        const small = await page.evaluate(() =>
          [
            ...document.querySelectorAll(
              '#obsSeqBody :is(button, input, select, a, summary)'
            ),
          ]
            .filter(n => n.offsetParent !== null)
            .map(n => [n.tagName + (n.type ?? ''), n.getBoundingClientRect()])
            .filter(([, r]) => r.width < 24 || r.height < 24)
            .map(
              ([name, r]) =>
                `${name} ${Math.round(r.width)}x${Math.round(r.height)}`
            )
        );
        expect(small, `${lang} ${width}`).toEqual([]);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth + 1
          ),
          `no horizontal scroll at ${width}`
        ).toBe(true);
      }
    });
  }

  test('the page changing language re-words the open panel and keeps its result', async ({
    page,
  }) => {
    await openPage(page, 'en');
    await openPanel(page);
    await runAndWait(page);
    await page.locator('[data-gs-lang]').selectOption('es');
    await expect(btn(page, RUN.es)).toBeVisible();
    await expect(page.locator('#obsSeqPanel > summary')).toContainText(
      'De imágenes a una curva de luz'
    );
    await expect(btn(page, 'Guardar la curva de luz como CSV')).toBeEnabled();
    await expect(
      box(page).locator('caption', { hasText: 'Lo que midió este paso' })
    ).toBeVisible();
  });
});
