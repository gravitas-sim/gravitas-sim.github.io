/* global MutationObserver */
// =============================================================================
// Completeness by injection, in a browser (Prompt 184)
// -----------------------------------------------------------------------------
// INJECTION.md committed what the kernel must do before it existed;
// tests/injection.test.js and tools/injection-validate.mjs hold the numbers (the
// closed form, the independent oracle, coverage, the refusals) and this holds the
// panel: a run with the keyboard alone and the same with a single pointer and no
// key event, the width of the stars measured from the image and read back
// against the FWHM they were drawn with, a run that is the same again from the
// same seed, a run stopped part way, the curve plotted with its table, the lists
// saved as CSV and the curve kept in the ledger, a display-only image and an
// image with no contract refused in words with every action disabled, settings out
// of range refused by name, both languages, axe in both themes, and every
// control at least 24 px at 1280 and 390 px.
//
// The frame is synthetic and seeded, in ADU, with a pixel contract (gain 1.5,
// read noise 8, saturation, a linear limit): five stars, a star at the border and
// a single hot pixel, as in the detection spec.
// =============================================================================

import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures.js';
import { mulberry32 } from '../js/rng.js';
import { sidecar } from '../tools/photometry-validate.mjs';

const TAGS = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22aa',
  'best-practice',
];
const W = 128;
const SKY = 100;
const FWHM = 3;
const SIGMA = FWHM / 2.354820045;
/** Stars, FITS pixels, amplitude in ADU above the sky. */
const STARS = [
  { x: 30.4, y: 32.2, amp: 900 },
  { x: 62.6, y: 60.4, amp: 800 },
  { x: 95.3, y: 40.7, amp: 700 },
  { x: 40.2, y: 95.5, amp: 650 },
  { x: 100.4, y: 100.1, amp: 600 },
];
const EDGE = { x: 3.3, y: 64.5, amp: 700 };
const HOT = { x: 70, y: 100, adu: 3000 };

function imageObservation() {
  const u = mulberry32(184);
  const gauss = () =>
    Math.sqrt(-2 * Math.log(1 - u())) * Math.cos(2 * Math.PI * u());
  const n = W * W;
  const x = new Array(n);
  const y = new Array(n);
  const v = new Array(n);
  const all = [...STARS, EDGE];
  for (let j = 1; j <= W; j++)
    for (let i = 1; i <= W; i++) {
      const k = (j - 1) * W + (i - 1);
      x[k] = i;
      y[k] = j;
      let value = SKY + 9.7 * gauss();
      for (const s of all) {
        let p = 0;
        for (let b = 0; b < 4; b++)
          for (let a = 0; a < 4; a++) {
            const dx = i - 0.5 + (a + 0.5) / 4 - s.x;
            const dy = j - 0.5 + (b + 0.5) / 4 - s.y;
            p += Math.exp(-(dx * dx + dy * dy) / (2 * SIGMA * SIGMA));
          }
        value += (s.amp * p) / 16;
      }
      if (i === HOT.x && j === HOT.y) value += HOT.adu;
      v[k] = Math.round(value * 100) / 100;
    }
  return {
    format: 'gravitas.observation',
    formatVersion: 1,
    kind: 'image',
    id: 'inject-e2e',
    title: 'Injection test frame',
    object: null,
    facility: null,
    origin: 'observed',
    source: { kind: 'builtin', id: 'inject-e2e', version: null },
    credit: 'synthetic test frame (seeded)',
    license: { status: 'cc0' },
    retrieved: null,
    citations: [],
    reductions: [],
    columns: [
      { id: 'x', name: 'column', unit: 'pix', role: 'x', values: x },
      { id: 'y', name: 'row', unit: 'pix', role: 'x', values: y },
      { id: 'v', name: 'counts', unit: 'count', role: 'value', values: v },
    ],
    axes: { x: 'x', y: 'y' },
    image: { width: W, height: W, x: 'x', y: 'y', value: 'v' },
    masks: [],
    annotations: [],
  };
}
const withContract = (over = {}) => {
  const o = imageObservation();
  o.image.sidecar = { ...sidecar({ width: W, height: W }), ...over };
  return o;
};
const asFile = (o, name = 'frame.json') => ({
  name,
  mimeType: 'application/json',
  buffer: Buffer.from(JSON.stringify(o)),
});

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

const box = page => page.locator('#obsInjectBody');
const btn = (page, name) =>
  box(page).getByRole('button', { name, exact: true });
const field = (page, label) => box(page).getByLabel(label, { exact: false });
const live = page => box(page).locator('[role=status]');
const readouts = page => box(page).locator('.ph-readout');
const rows = page =>
  box(page).locator('table.im-table').first().locator('tbody tr');

/** Import the frame and open the panel. `keyboard`: Enter on the summary, no pointer. */
async function openInject(
  page,
  file = asFile(withContract()),
  { keyboard = false } = {}
) {
  await page.locator('#obsFile').setInputFiles(file);
  await expect(page.locator('#obsInjectPanel')).toBeVisible({
    timeout: 30_000,
  });
  const summary = page.locator('#obsInjectPanel > summary');
  if (keyboard) {
    await summary.focus();
    await page.keyboard.press('Enter');
  } else await summary.click();
  await expect(
    btn(page, 'Inject and look again').or(
      btn(page, 'Inyectar y volver a mirar')
    )
  ).toBeVisible({
    timeout: 30_000,
  });
}

/** Count what the page received of each kind of input. */
const watchInput = page =>
  page.evaluate(() => {
    window.__ptr = 0;
    window.__keys = 0;
    for (const e of ['pointerdown', 'pointerup', 'mousedown', 'mouseup'])
      document.addEventListener(e, () => window.__ptr++, true);
    document.addEventListener('keydown', () => window.__keys++, true);
    window.__said = [];
    const region = document.querySelector('#obsInjectBody [role=status]');
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
const number = s => Number(String(s).replace(/[,\s]/g, '').replace('−', '-'));
/** A button pressed from the keyboard alone: focus, then Enter. */
async function press(locator, page) {
  await locator.focus();
  await page.keyboard.press('Enter');
}
/** The settings of a small run, the same every time. */
const LABELS = {
  en: ['Sources in a trial', 'Trials', 'Seed'],
  es: ['Fuentes por ensayo', 'Ensayos', 'Semilla'],
};
async function small(
  page,
  { count = 10, trials = 4, seed = 'e2e', lang = 'en' } = {}
) {
  const [a, b, c] = LABELS[lang];
  await field(page, a).fill(String(count));
  await field(page, b).fill(String(trials));
  await field(page, c).fill(seed);
}
const tableText = page =>
  box(page).locator('table.im-table').first().innerText();
const injectedOf = async page => {
  const m = (await readouts(page).first().textContent()).match(
    /Injected (\d+) sources in (\d+) trials; the detector found (\d+)/
  );
  expect(m, 'the readout counts what was injected and found').not.toBeNull();
  return { injected: Number(m[1]), trials: Number(m[2]), found: Number(m[3]) };
};

test.describe('completeness: keyboard alone', () => {
  test('a run is made, plotted and tabled, and is the same again from the same seed, with no pointer event', async ({
    page,
  }) => {
    await openPage(page);
    await openInject(page, undefined, { keyboard: true });
    await watchInput(page);
    await small(page);
    await press(btn(page, 'Inject and look again'), page);
    await expect(readouts(page).first()).toContainText('Injected', {
      timeout: 60_000,
    });
    const first = await injectedOf(page);
    expect(first.trials).toBe(4);
    expect(first.injected).toBeGreaterThan(20);
    expect(first.injected).toBeLessThanOrEqual(40);
    expect(first.found).toBeGreaterThan(0);
    expect(first.found).toBeLessThan(first.injected + 1);
    await expect(box(page).locator('svg.ow-plot')).toBeVisible();
    await expect(
      box(page).locator('caption', { hasText: 'Completeness by magnitude' })
    ).toBeVisible();
    expect(await rows(page).count()).toBeGreaterThanOrEqual(3);
    // what it was measured under, and that it is not for another width or sky
    await expect(readouts(page).first()).toContainText(
      'not the chance of detection'
    );
    await expect(readouts(page).first()).toContainText('entered by hand');
    // the range chosen from the frame's own noise is written back into the boxes
    expect(
      number(await field(page, 'Brightest magnitude').inputValue())
    ).toBeLessThan(
      number(await field(page, 'Faintest magnitude').inputValue())
    );
    const table1 = await tableText(page);
    await press(btn(page, 'Inject and look again'), page);
    await expect(live(page)).toContainText('Injected', { timeout: 60_000 });
    expect(await tableText(page)).toBe(table1);
    expect(await injectedOf(page)).toEqual(first);
    // another seed is another run
    await field(page, 'Seed').fill('another');
    await press(btn(page, 'Inject and look again'), page);
    await expect
      .poll(async () => tableText(page), { timeout: 60_000 })
      .not.toBe(table1);
    const { ptr, keys, said } = await counts(page);
    expect(ptr).toBe(0);
    expect(keys).toBeGreaterThan(0);
    expect(said.join(' ')).toMatch(/Trial 1 of 4/);
    expect(said.join(' ')).toMatch(/Injected \d+ sources, found \d+/);
  });

  test('the width of the stars is measured from the image and read back against the FWHM they were drawn with', async ({
    page,
  }) => {
    await openPage(page);
    await openInject(page, undefined, { keyboard: true });
    await field(page, 'Width of a star').fill('2');
    await press(btn(page, 'Measure it from this image'), page);
    await expect(live(page)).toContainText('Width of the stars', {
      timeout: 60_000,
    });
    const w = number(await field(page, 'Width of a star').inputValue());
    expect(Math.abs(w - FWHM)).toBeLessThan(0.25);
    await small(page, { trials: 2 });
    await press(btn(page, 'Inject and look again'), page);
    await expect(readouts(page).first()).toContainText(
      'measured from this image',
      {
        timeout: 60_000,
      }
    );
    // typing a width afterwards makes it the reader's again
    await field(page, 'Width of a star').fill('3.5');
    await press(btn(page, 'Inject and look again'), page);
    await expect(readouts(page).first()).toContainText('entered by hand', {
      timeout: 60_000,
    });
  });
});

test.describe('completeness: single pointer alone', () => {
  test('a run is stopped part way, made again, kept in the ledger and saved as CSV, all by clicks and with no key event', async ({
    page,
  }) => {
    await openPage(page);
    await openInject(page);
    await watchInput(page);
    // a long run, stopped as soon as it has begun
    await small(page, { count: 40, trials: 200 });
    await btn(page, 'Inject and look again').click();
    await btn(page, 'Stop').click();
    await expect(live(page)).toContainText(/Stopped after \d+ trials/, {
      timeout: 60_000,
    });
    const stopped = await injectedOf(page);
    expect(stopped.trials).toBeLessThan(200);
    await expect(btn(page, 'Stop')).toBeDisabled();
    // a short run, kept and saved
    await small(page, { trials: 3 });
    await btn(page, 'Inject and look again').click();
    await expect(readouts(page).first()).toContainText('in 3 trials', {
      timeout: 60_000,
    });
    const { injected } = await injectedOf(page);
    await btn(page, 'Keep in the ledger').click();
    await expect(live(page)).toContainText(
      'Kept the completeness in the ledger'
    );
    const kept = await page.evaluate(() =>
      Object.keys(localStorage).filter(k => /notebook|ledger/i.test(k))
    );
    expect(kept.length).toBeGreaterThan(0);
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      btn(page, 'Save the lists as CSV').click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/injection\.csv$/);
    const text = await (
      await import('node:fs/promises')
    ).readFile(await download.path(), 'utf8');
    expect(
      text
        .replace(/^\uFEFF/, '')
        .trim()
        .split(/\r?\n/)
    ).toHaveLength(injected + 1);
    const { keys, ptr } = await counts(page);
    expect(keys).toBe(0);
    expect(ptr).toBeGreaterThan(0);
  });
});

test.describe('completeness: refusals and settings', () => {
  for (const [name, file, words] of [
    [
      'that is display-only',
      asFile(withContract({ use: 'display-only' }), 'display.json'),
      /display-only/,
    ],
    [
      'with no contract',
      asFile(imageObservation(), 'plain.json'),
      /no pixel contract/,
    ],
  ]) {
    test(`an image ${name} says why, and every action is disabled`, async ({
      page,
    }) => {
      await openPage(page);
      await openInject(page, file);
      await expect(box(page).locator('.ui-status.is-error')).toBeVisible();
      await expect(box(page).locator('.ui-status.is-error')).toContainText(
        words
      );
      for (const n of [
        'Inject and look again',
        'Measure it from this image',
        'Save the lists as CSV',
        'Keep in the ledger',
      ])
        await expect(btn(page, n)).toBeDisabled();
      await expect(rows(page)).toHaveCount(0);
    });
  }

  test('a setting out of range is refused by name, a half-filled range is refused, and a magnitude too bright for the detector says the brightest allowed', async ({
    page,
  }) => {
    await openPage(page);
    await openInject(page);
    await small(page, { count: 0 });
    await btn(page, 'Inject and look again').click();
    await expect(box(page).locator('.ui-status.is-error')).toContainText(
      'out of range (count)'
    );
    await small(page, { count: 5, trials: 2 });
    await field(page, 'Brightest magnitude').fill('-3');
    await btn(page, 'Inject and look again').click();
    await expect(box(page).locator('.ui-status.is-error')).toContainText(
      'Fill both magnitudes'
    );
    await field(page, 'Brightest magnitude').fill('-30');
    await field(page, 'Faintest magnitude').fill('-29');
    await btn(page, 'Inject and look again').click();
    await expect(box(page).locator('.ui-status.is-error')).toContainText(
      /brightest allowed is magnitude -?\d/
    );
    await expect(rows(page)).toHaveCount(0);
    // the same frame with sensible settings runs, and the refusal goes away
    await field(page, 'Brightest magnitude').fill('');
    await field(page, 'Faintest magnitude').fill('');
    await btn(page, 'Inject and look again').click();
    await expect(readouts(page).first()).toContainText('Injected', {
      timeout: 60_000,
    });
    await expect(box(page).locator('.ui-status.is-error')).toBeHidden();
  });
});

test.describe('completeness: both languages, axe, and every control', () => {
  for (const lang of ['en', 'es']) {
    test(`axe with a result, and 24 px targets at 1280 and 390, ${lang}`, async ({
      page,
    }) => {
      await openPage(page, lang);
      await openInject(page);
      await small(page, { trials: 3, lang });
      await btn(
        page,
        lang === 'es' ? 'Inyectar y volver a mirar' : 'Inject and look again'
      ).click();
      await expect(rows(page).first()).toBeVisible({ timeout: 60_000 });
      await expect(box(page).locator('svg.ow-plot')).toBeVisible();
      if (lang === 'es')
        await expect(page.locator('#obsInjectPanel > summary')).toContainText(
          'Completitud: lo que el detector no ve'
        );
      for (const scheme of ['light', 'dark']) {
        await page.emulateMedia({ colorScheme: scheme });
        const violations = (
          await new AxeBuilder({ page })
            .withTags(TAGS)
            .include('#obsInjectPanel')
            .analyze()
        ).violations.map(
          v => `${v.id}: ${v.nodes.map(n => n.target).join(' ')}`
        );
        expect(violations, `${lang} ${scheme}`).toEqual([]);
      }
      for (const width of [1280, 390]) {
        await page.setViewportSize({ width, height: 900 });
        const smallTargets = await page.evaluate(() =>
          [
            ...document.querySelectorAll(
              '#obsInjectBody :is(button, input, select, a)'
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
        expect(smallTargets, `${lang} ${width}`).toEqual([]);
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
    await openInject(page);
    await small(page, { trials: 3 });
    await btn(page, 'Inject and look again').click();
    await expect(rows(page).first()).toBeVisible({ timeout: 60_000 });
    const n = await rows(page).count();
    await page.locator('[data-gs-lang]').selectOption('es');
    await expect(btn(page, 'Inyectar y volver a mirar')).toBeVisible();
    await expect(page.locator('#obsInjectPanel > summary')).toContainText(
      'Completitud: lo que el detector no ve'
    );
    await expect(rows(page)).toHaveCount(n);
    await expect(
      box(page).locator('caption', { hasText: 'Completitud por magnitud' })
    ).toBeVisible();
  });
});
