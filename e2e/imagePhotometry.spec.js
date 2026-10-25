/* global MutationObserver */
// =============================================================================
// Photometry on an image, in a browser (Prompt 180)
// -----------------------------------------------------------------------------
// PHOTOMETRY.md committed what the adapters must do before they existed;
// tests/photometry.test.js and tools/photometry-validate.mjs hold the numbers
// (the analytic cases, the oracle, coverage, the refusals) and this holds the
// panel: a measurement made with the keyboard alone and the same with a single
// pointer and no key event, the net light read back against a star of known
// flux, a display-only image and an image with no contract refused in words
// with every action disabled, a batch over the marks with a table, a CSV and a
// ledger entry, both languages, axe in both themes, and every control at
// least 24 px at 1280 and 390 px.
//
// The frame is synthetic and seeded, in ADU, with a pixel contract (gain 1.5,
// read noise 8, saturation, a linear limit) and two stars of known flux. Its
// truth is computed here from the star's analytic profile, not from the
// panel's own arithmetic.
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
const W = 96;
const GAIN = 1.5;
const SKY = 100;
const SIGMA = 3 / 2.354820045;
/** Two stars, FITS pixels, amplitude in ADU above the sky. */
const STARS = [
  { x: 30.4, y: 32.2, amp: 300 },
  { x: 62.6, y: 60.4, amp: 220 },
];
/** The flux of a Gaussian star in electrons: 2 pi sigma^2 amplitude, times the gain. */
const truth = s => 2 * Math.PI * SIGMA * SIGMA * s.amp * GAIN;

function imageObservation(extra = {}) {
  const u = mulberry32(180);
  const gauss = () =>
    Math.sqrt(-2 * Math.log(1 - u())) * Math.cos(2 * Math.PI * u());
  const n = W * W;
  const x = new Array(n);
  const y = new Array(n);
  const v = new Array(n);
  for (let j = 1; j <= W; j++)
    for (let i = 1; i <= W; i++) {
      const k = (j - 1) * W + (i - 1);
      x[k] = i;
      y[k] = j;
      let value = SKY + 4 * gauss();
      for (const s of STARS)
        value +=
          s.amp *
          Math.exp(-((i - s.x) ** 2 + (j - s.y) ** 2) / (2 * SIGMA * SIGMA));
      v[k] = Math.round(value * 100) / 100;
    }
  const o = {
    format: 'gravitas.observation',
    formatVersion: 1,
    kind: 'image',
    id: 'photometry-e2e',
    title: 'Photometry test frame',
    object: null,
    facility: null,
    origin: 'observed',
    source: { kind: 'builtin', id: 'photometry-e2e', version: null },
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
    ...extra,
  };
  return o;
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

const box = page => page.locator('#obsPhotoBody');
const field = (page, label) => box(page).getByLabel(label, { exact: false });
const btn = (page, name) =>
  box(page).getByRole('button', { name, exact: true });
const readout = page => box(page).locator('.ph-readout');
const live = page => box(page).locator('[role=status]');

/** Import the frame and open the panel. `keyboard`: Enter on the summary, no pointer. */
async function openPhoto(
  page,
  file = asFile(withContract()),
  { keyboard = false } = {}
) {
  await page.locator('#obsFile').setInputFiles(file);
  await expect(page.locator('#obsPhotoPanel')).toBeVisible({ timeout: 30_000 });
  const summary = page.locator('#obsPhotoPanel > summary');
  if (keyboard) {
    await summary.focus();
    await page.keyboard.press('Enter');
  } else await summary.click();
  await expect(box(page).locator('canvas.ph-pic')).toBeVisible({
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
    const region = document.querySelector('#obsPhotoBody [role=status]');
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
/** "Net light 6,343 ± 98 electrons" -> [6343, 98] */
async function netOf(page) {
  const m = (await readout(page).textContent()).match(
    /(?:Net light|Luz neta)\s+([−\d.,]+)\s+±\s+([\d.,]+)/
  );
  expect(m, 'the readout has a net light').not.toBeNull();
  return [number(m[1]), number(m[2])];
}
/** A button pressed from the keyboard alone: focus, then Enter. */
async function press(locator, page) {
  await locator.focus();
  await page.keyboard.press('Enter');
}

test.describe('photometry: keyboard alone', () => {
  test('a star is measured and read back against its flux, a curve of growth drawn, with no pointer event', async ({
    page,
  }) => {
    await openPage(page);
    await openPhoto(page, undefined, { keyboard: true });
    await watchInput(page);
    const s = STARS[0];
    await field(page, 'x (pixels)').fill(String(Math.round(s.x)));
    await field(page, 'y (pixels)').fill(String(Math.round(s.y)));
    await press(btn(page, 'Measure'), page);
    await expect(readout(page)).toContainText('Net light');
    const [net, sigma] = await netOf(page);
    expect(Math.abs(net - truth(s))).toBeLessThan(5 * sigma);
    expect(sigma).toBeGreaterThan(20);
    await expect(readout(page)).toContainText('Instrumental magnitude');
    await expect(box(page)).toContainText(
      '0.16 percent at the default aperture'
    );
    await expect(readout(page)).toContainText('noise from the CCD equation');
    // The same star centred first: the position moves to the star's centre.
    await box(page).getByLabel('Center on the star first').focus();
    await page.keyboard.press('Space');
    await press(btn(page, 'Measure'), page);
    await expect(readout(page)).toContainText(/Position x 30\.\d/);
    // The curve of growth is a table, not only a drawing.
    await press(btn(page, 'Curve of growth'), page);
    await expect(box(page).locator('table caption').first()).toHaveText(
      'Curve of growth'
    );
    expect(await box(page).locator('table tbody tr').count()).toBeGreaterThan(
      5
    );
    const c = await counts(page);
    expect(c.ptr, 'no pointer event').toBe(0);
    expect(c.keys).toBeGreaterThan(0);
    // The result was said once per press.
    expect(c.said.filter(x => x.startsWith('Measured')).length).toBe(2);
  });

  test('the rings resize by the buttons and the step, in order, and say so', async ({
    page,
  }) => {
    await openPage(page);
    await openPhoto(page, undefined, { keyboard: true });
    await watchInput(page);
    const r = field(page, 'Aperture radius');
    const before = Number(await r.inputValue());
    await field(page, 'Resize the').selectOption('aperture');
    await field(page, 'Step').selectOption('coarse');
    await press(btn(page, 'Larger'), page);
    const ceiling =
      Number(await field(page, 'Sky ring, inner').inputValue()) - 0.25;
    await expect(r).toHaveValue(String(Math.min(before + 4, ceiling)));
    await expect(live(page)).toContainText(/aperture radius/i);
    // The aperture cannot pass the inner ring: it stops a quarter pixel short.
    for (let i = 0; i < 6; i++) await press(btn(page, 'Larger'), page);
    const inner = Number(await field(page, 'Sky ring, inner').inputValue());
    expect(Number(await r.inputValue())).toBe(inner - 0.25);
    for (let i = 0; i < 12; i++) await press(btn(page, 'Smaller'), page);
    expect(Number(await r.inputValue())).toBe(0.25);
    expect((await counts(page)).ptr).toBe(0);
  });
});

test.describe('photometry: single pointer alone', () => {
  test('a tap on the picture sets the ring, and Measure is a click, with no key event', async ({
    page,
  }) => {
    await openPage(page);
    await openPhoto(page);
    await watchInput(page);
    const s = STARS[1];
    // Choose the position without typing: place nothing, fill by the form control.
    await field(page, 'x (pixels)').fill(String(Math.round(s.x)));
    await field(page, 'y (pixels)').fill(String(Math.round(s.y)));
    await field(page, 'y (pixels)').blur();
    await field(page, 'Resize the').selectOption('outer');
    const pic = box(page).locator('canvas.ph-pic');
    const bb = await pic.boundingBox();
    // A tap a little to the right of the centre sets the outer radius there.
    await pic.click({
      position: { x: bb.width / 2 + bb.width * 0.3, y: bb.height / 2 },
    });
    const outer = Number(await field(page, 'Sky ring, outer').inputValue());
    expect(outer).toBeGreaterThan(0.25);
    expect(outer).not.toBe(15);
    await btn(page, 'Measure').click();
    await expect(readout(page)).toContainText('Net light');
    const [net, sigma] = await netOf(page);
    expect(Math.abs(net - truth(s))).toBeLessThan(5 * sigma);
    expect((await counts(page)).keys, 'no key event').toBe(0);
  });
});

test.describe('photometry: refusals', () => {
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
      await openPhoto(page, file);
      await expect(box(page).locator('.ui-status.is-error')).toBeVisible();
      await expect(box(page).locator('.ui-status.is-error')).toContainText(
        words
      );
      for (const n of ['Measure', 'Curve of growth', 'Measure all marks'])
        await expect(btn(page, n)).toBeDisabled();
      await expect(readout(page)).toBeEmpty();
    });
  }

  test('a star too near the saturation level is not measured, and the words say how many pixels', async ({
    page,
  }) => {
    const o = withContract();
    // Burn the star's core past the linear limit (30,000 ADU in the contract).
    const k = (32 - 1) * W + (30 - 1);
    o.columns[2].values[k] = 31000;
    await openPage(page);
    await openPhoto(page, asFile(o, 'burnt.json'));
    await field(page, 'x (pixels)').fill('30');
    await field(page, 'y (pixels)').fill('32');
    await btn(page, 'Measure').click();
    await expect(readout(page)).toContainText(
      /Not measured: \d+ pixels? in the aperture reach/
    );
    await expect(readout(page)).not.toContainText('Net light');
  });
});

/** Place two point marks by the marks instrument's keyboard aim. */
async function placeMarks(page, points) {
  const summary = page.locator('#obsMarksPanel > summary');
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#obsMarksBody .im-over')).toBeVisible({
    timeout: 30_000,
  });
  await page.locator('#obsMarksBody button[data-tool="point"]').click();
  let aim = [W / 2, W / 2];
  for (const [x, y] of points) {
    await page.locator('#obsMarksBody .im-over').focus();
    const dx = Math.round(x) - aim[0];
    const dy = Math.round(y) - aim[1];
    const run = async (key, n, shift) => {
      for (let i = 0; i < n; i++)
        await page.keyboard.press(shift ? `Shift+${key}` : key);
    };
    const kx = dx < 0 ? 'ArrowLeft' : 'ArrowRight';
    const ky = dy < 0 ? 'ArrowDown' : 'ArrowUp';
    await run(kx, Math.floor(Math.abs(dx) / 4), true);
    await run(kx, Math.abs(dx) % 4, false);
    await run(ky, Math.floor(Math.abs(dy) / 4), true);
    await run(ky, Math.abs(dy) % 4, false);
    aim = [Math.round(x), Math.round(y)];
    await page.keyboard.press('Enter');
  }
  await expect(page.locator('#obsMarksBody tbody tr')).toHaveCount(
    points.length
  );
}

test.describe('photometry: the marks, a table, a file and the ledger', () => {
  test('two marks are chosen by name, measured together, tabled, saved as CSV and kept in the ledger', async ({
    page,
  }) => {
    await openPage(page);
    await page.locator('#obsFile').setInputFiles(asFile(withContract()));
    await expect(page.locator('#obsMarksPanel')).toBeVisible({
      timeout: 30_000,
    });
    await placeMarks(
      page,
      STARS.map(s => [Math.round(s.x), Math.round(s.y)])
    );
    await page.locator('#obsPhotoPanel > summary').click();
    await expect(box(page).locator('canvas.ph-pic')).toBeVisible({
      timeout: 30_000,
    });
    // A mark is a choice in the list, and choosing it moves the position.
    const target = box(page).locator('select').first();
    await expect(target.locator('option')).toHaveCount(3);
    await target.selectOption({ index: 2 });
    await expect(field(page, 'x (pixels)')).toHaveValue('63');
    await btn(page, 'Measure all marks').click();
    await expect(box(page).locator('table tbody tr')).toHaveCount(2);
    for (const [i, s] of STARS.entries()) {
      const cells = await box(page)
        .locator('table tbody tr')
        .nth(i)
        .locator('td')
        .allTextContents();
      const net = number(cells[2]);
      const sigma = number(cells[3]);
      expect(Math.abs(net - truth(s)), `star ${i + 1}`).toBeLessThan(5 * sigma);
      expect(cells[7]).toBe('measured');
    }
    // The CSV is a file with a header and a row per mark.
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      btn(page, 'Save as CSV').click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/photometry\.csv$/);
    const text = await (
      await import('node:fs/promises')
    ).readFile(await download.path(), 'utf8');
    expect(
      text
        .replace(/^\uFEFF/, '')
        .trim()
        .split(/\r?\n/)
    ).toHaveLength(3);
    // The ledger takes it as a record that replays.
    await btn(page, 'Keep in the ledger').click();
    await expect(live(page)).toContainText(/Kept \d+ quantities/);
    const kept = await page.evaluate(() =>
      Object.keys(localStorage).filter(k => /notebook|ledger/i.test(k))
    );
    expect(kept.length).toBeGreaterThan(0);
  });
});

test.describe('photometry: both languages, axe, and every control', () => {
  for (const lang of ['en', 'es']) {
    test(`axe with a result, and 24 px targets at 1280 and 390, ${lang}`, async ({
      page,
    }) => {
      await openPage(page, lang);
      await openPhoto(page);
      await field(page, lang === 'es' ? 'x (píxeles)' : 'x (pixels)').fill(
        '30'
      );
      await field(page, lang === 'es' ? 'y (píxeles)' : 'y (pixels)').fill(
        '32'
      );
      await btn(page, lang === 'es' ? 'Medir' : 'Measure')
        .first()
        .click();
      await expect(readout(page)).toContainText(
        lang === 'es' ? 'Luz neta' : 'Net light'
      );
      await btn(page, lang === 'es' ? /Curva/ : 'Curve of growth').click();
      if (lang === 'es')
        await expect(page.locator('#obsPhotoPanel > summary')).toHaveText(
          'Fotometría en la imagen'
        );
      for (const scheme of ['light', 'dark']) {
        await page.emulateMedia({ colorScheme: scheme });
        const violations = (
          await new AxeBuilder({ page })
            .withTags(TAGS)
            .include('#obsPhotoPanel')
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
              '#obsPhotoBody :is(button, input, select, a)'
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
    await openPhoto(page);
    await field(page, 'x (pixels)').fill('30');
    await field(page, 'y (pixels)').fill('32');
    await btn(page, 'Measure').click();
    await expect(readout(page)).toContainText('Net light');
    await page.locator('[data-gs-lang]').selectOption('es');
    await expect(btn(page, 'Medir').first()).toBeVisible();
    await expect(page.locator('#obsPhotoPanel > summary')).toHaveText(
      'Fotometría en la imagen'
    );
  });
});
