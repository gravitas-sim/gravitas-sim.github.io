/* global MutationObserver */
// =============================================================================
// Sources and the width of the stars, in a browser (Prompt 183)
// -----------------------------------------------------------------------------
// DETECTION.md committed what the kernel must do before it existed;
// tests/detection.test.js and tools/detection-validate.mjs hold the numbers (the
// truth cases, the oracle, coverage, the refusals) and this holds the panel:
// sources found, flagged and tabled with the keyboard alone and the same with a
// single pointer and no key event, the light read back against stars of known
// flux, the width of the stars read back against the FWHM they were drawn with,
// the stacked profile plotted with its table, a display-only image and an image
// with no contract refused in words with every action disabled, a setting out of
// range refused by name, the sources added to the marks table, a CSV and a
// ledger entry, both languages, axe in both themes, and every control at least
// 24 px at 1280 and 390 px.
//
// The frame is synthetic and seeded, in ADU, with a pixel contract (gain 1.5,
// read noise 8, saturation, a linear limit): five stars of known flux, a star at
// the border and a single hot pixel. Its truth is computed here from the
// stars' analytic profile (each pixel the mean of 4 by 4 sub-pixels), not from
// the panel's own arithmetic.
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
const GAIN = 1.5;
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
/** The flux of a Gaussian star in electrons: 2 pi sigma^2 amplitude, times the gain. */
const truth = s => 2 * Math.PI * SIGMA * SIGMA * s.amp * GAIN;

function imageObservation() {
  const u = mulberry32(183);
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
    id: 'detect-e2e',
    title: 'Detection test frame',
    object: null,
    facility: null,
    origin: 'observed',
    source: { kind: 'builtin', id: 'detect-e2e', version: null },
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

const box = page => page.locator('#obsDetectBody');
const btn = (page, name) =>
  box(page).getByRole('button', { name, exact: true });
const field = (page, label) => box(page).getByLabel(label, { exact: false });
const live = page => box(page).locator('[role=status]');
const sources = page =>
  box(page).locator('table.im-table').first().locator('tbody tr');
const readouts = page => box(page).locator('.ph-readout');

/** Import the frame and open the panel. `keyboard`: Enter on the summary, no pointer. */
async function openDetect(
  page,
  file = asFile(withContract()),
  { keyboard = false } = {}
) {
  await page.locator('#obsFile').setInputFiles(file);
  await expect(page.locator('#obsDetectPanel')).toBeVisible({
    timeout: 30_000,
  });
  const summary = page.locator('#obsDetectPanel > summary');
  if (keyboard) {
    await summary.focus();
    await page.keyboard.press('Enter');
  } else await summary.click();
  await expect(box(page).locator('canvas.dt-pic')).toBeVisible({
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
    const region = document.querySelector('#obsDetectBody [role=status]');
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
/** Each row of the sources table as its cells. */
async function table(page) {
  const out = [];
  for (const r of await sources(page).all())
    out.push((await r.locator('th, td').allTextContents()).map(c => c.trim()));
  return out;
}
const near = (cells, s) =>
  Math.hypot(number(cells[1]) - s.x, number(cells[2]) - s.y) < 1.5;
const widthOf = async page => {
  const m = (await readouts(page).last().textContent()).match(
    /\(FWHM\):\s+([\d.,]+)\s+±\s+([\d.,]+)/
  );
  expect(m, 'the readout has a width').not.toBeNull();
  return [number(m[1]), number(m[2])];
};

test.describe('sources: keyboard alone', () => {
  test('stars are found, flagged and read back against their flux, and the width is read back against the drawn FWHM, with no pointer event', async ({
    page,
  }) => {
    await openPage(page);
    await openDetect(page, undefined, { keyboard: true });
    await watchInput(page);
    await press(btn(page, 'Find sources'), page);
    await expect(readouts(page).first()).toContainText('Found');
    const rows = await table(page);
    // Every star is in the list, with its light within five of its own errors.
    for (const s of STARS) {
      const r = rows.find(c => near(c, s));
      expect(r, `star at ${s.x}, ${s.y}`).toBeDefined();
      const flux = number(r[5]);
      const sigma = flux / number(r[6]);
      expect(Math.abs(flux - truth(s)), `flux of ${s.x}`).toBeLessThan(
        5 * sigma
      );
      expect(r[10]).toBe('');
    }
    // The star at the border and the hot pixel say what they are.
    expect(rows.find(c => near(c, EDGE))[10]).toContain('edge');
    expect(rows.find(c => near(c, HOT))[10]).toContain('sharp');
    await press(btn(page, 'Measure the width'), page);
    await expect(readouts(page).last()).toContainText('Width of the stars');
    const [fwhm, sigma] = await widthOf(page);
    expect(Math.abs(fwhm - FWHM)).toBeLessThan(Math.max(0.1, 4 * sigma));
    expect(sigma).toBeGreaterThan(0);
    await expect(box(page).locator('svg.ow-plot')).toBeVisible();
    await expect(
      box(page).locator('caption', { hasText: 'Stacked radial profile' })
    ).toBeVisible();
    // The stars used are marked in the table and the readout says how many.
    await expect(readouts(page).last()).toContainText(/From \d+ stars/);
    await expect(readouts(page).last()).toContainText(
      'Moffat model on the same pixels'
    );
    const used = (await table(page)).filter(c => c[11] === 'yes');
    expect(used.length).toBeGreaterThanOrEqual(3);
    for (const c of used) expect(c[10]).toBe('');
    const { ptr, keys, said } = await counts(page);
    expect(ptr).toBe(0);
    expect(keys).toBeGreaterThan(0);
    expect(said.join(' ')).toMatch(/Found \d+ sources/);
    expect(said.join(' ')).toMatch(/Width of the stars/);
  });
});

test.describe('sources: single pointer alone', () => {
  test('the sources are found, added as marks, the width kept in the ledger, all by clicks and with no key event', async ({
    page,
  }) => {
    await openPage(page);
    await openDetect(page);
    await watchInput(page);
    await btn(page, 'Find sources').click();
    await expect(readouts(page).first()).toContainText('Found');
    const n = await sources(page).count();
    expect(n).toBeGreaterThanOrEqual(7);
    await expect(btn(page, 'Add as marks')).toBeVisible();
    await btn(page, 'Add as marks').click();
    await expect(live(page)).toContainText(`Added ${n} sources as point marks`);
    await expect(page.locator('#obsMarksBody tbody tr')).toHaveCount(n);
    await btn(page, 'Measure the width').click();
    await expect(readouts(page).last()).toContainText('Width of the stars');
    await btn(page, 'Keep in the ledger').click();
    await expect(live(page)).toContainText('Kept the width in the ledger');
    const kept = await page.evaluate(() =>
      Object.keys(localStorage).filter(k => /notebook|ledger/i.test(k))
    );
    expect(kept.length).toBeGreaterThan(0);
    const { keys, ptr } = await counts(page);
    expect(keys).toBe(0);
    expect(ptr).toBeGreaterThan(0);
  });

  test('the table is saved as a CSV with a header and a row a source', async ({
    page,
  }) => {
    await openPage(page);
    await openDetect(page);
    await btn(page, 'Find sources').click();
    await expect(readouts(page).first()).toContainText('Found');
    const n = await sources(page).count();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      btn(page, 'Save as CSV').click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/sources\.csv$/);
    const text = await (
      await import('node:fs/promises')
    ).readFile(await download.path(), 'utf8');
    expect(
      text
        .replace(/^\uFEFF/, '')
        .trim()
        .split(/\r?\n/)
    ).toHaveLength(n + 1);
  });
});

test.describe('sources: refusals and settings', () => {
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
      await openDetect(page, file);
      await expect(box(page).locator('.ui-status.is-error')).toBeVisible();
      await expect(box(page).locator('.ui-status.is-error')).toContainText(
        words
      );
      for (const n of ['Find sources', 'Save as CSV', 'Measure the width'])
        await expect(btn(page, n)).toBeDisabled();
      await expect(sources(page)).toHaveCount(0);
    });
  }

  test('a setting out of range is refused by name, and a search that finds nothing says so aloud', async ({
    page,
  }) => {
    await openPage(page);
    await openDetect(page);
    await field(page, 'Width of a star').fill('0.1');
    await btn(page, 'Find sources').click();
    await expect(readouts(page).first()).toContainText('out of range (fwhm)');
    await field(page, 'Width of a star').fill('3');
    await box(page)
      .locator('summary', { hasText: 'Detection settings' })
      .click();
    await field(page, 'Smallest source').fill('5000');
    await btn(page, 'Find sources').click();
    await expect(live(page)).toContainText(
      'No source stands above the sky at 4 sigma'
    );
    await expect(sources(page)).toHaveCount(0);
    // The same frame with the smallest source back at 5 pixels finds the stars.
    await field(page, 'Smallest source').fill('5');
    await btn(page, 'Find sources').click();
    await expect(sources(page).first()).toBeVisible();
    expect(await sources(page).count()).toBeGreaterThanOrEqual(7);
  });
});

test.describe('sources: both languages, axe, and every control', () => {
  for (const lang of ['en', 'es']) {
    test(`axe with a result, and 24 px targets at 1280 and 390, ${lang}`, async ({
      page,
    }) => {
      await openPage(page, lang);
      await openDetect(page);
      await btn(
        page,
        lang === 'es' ? 'Encontrar fuentes' : 'Find sources'
      ).click();
      await expect(sources(page).first()).toBeVisible();
      await btn(
        page,
        lang === 'es' ? 'Medir el ancho' : 'Measure the width'
      ).click();
      await expect(box(page).locator('svg.ow-plot')).toBeVisible();
      if (lang === 'es')
        await expect(page.locator('#obsDetectPanel > summary')).toContainText(
          'Fuentes y ancho de las estrellas'
        );
      for (const scheme of ['light', 'dark']) {
        await page.emulateMedia({ colorScheme: scheme });
        const violations = (
          await new AxeBuilder({ page })
            .withTags(TAGS)
            .include('#obsDetectPanel')
            .analyze()
        ).violations.map(
          v => `${v.id}: ${v.nodes.map(n => n.target).join(' ')}`
        );
        expect(violations, `${lang} ${scheme}`).toEqual([]);
      }
      for (const width of [1280, 390]) {
        await page.setViewportSize({ width, height: 900 });
        const small = await page.evaluate(() =>
          [
            ...document.querySelectorAll(
              '#obsDetectBody :is(button, input, select, a)'
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
    await openDetect(page);
    await btn(page, 'Find sources').click();
    await expect(sources(page).first()).toBeVisible();
    const n = await sources(page).count();
    await page.locator('[data-gs-lang]').selectOption('es');
    await expect(btn(page, 'Encontrar fuentes')).toBeVisible();
    await expect(page.locator('#obsDetectPanel > summary')).toContainText(
      'Fuentes y ancho de las estrellas'
    );
    await expect(sources(page)).toHaveCount(n);
    await expect(
      box(page).locator('caption', { hasText: 'Fuentes encontradas' })
    ).toBeVisible();
  });
});
