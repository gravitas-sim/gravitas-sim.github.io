// =============================================================================
// A FITS image, a PNG and a JPEG from the reader's own device, in a browser
// (Prompt 188)
// -----------------------------------------------------------------------------
// tools/image-import-cases.mjs committed the hostile files and the bounds before
// the import existed; tests/imageImport.test.js holds the readers against them
// in Node. This holds the page: every file of the corpus (Prompt 157's 73 FITS
// files and the PNG and JPEG files of this prompt) chosen in the real file box
// and refused in a sentence of the reader's language beside the reader's own
// English message, in time, with the ledger empty after it; a file over the
// bound refused without a byte read; the largest frame opened in time; a
// cancelled read releasing its Worker and its memory; a FITS frame imported,
// described, made quantitative by what the reader states, and measured; a PNG
// and a JPEG display-only, marked, and refused photometry in the contract's
// words; axe in both themes and every control at least 24 px at 1280 and 390,
// in both languages.
// =============================================================================

import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures.js';
import { mulberry32 } from '../js/rng.js';
import {
  BOUNDS,
  CLAIMS_CARDS,
  RASTER_ACCEPT,
  RASTER_REFUSE,
} from '../tools/image-import-cases.mjs';
import { REFUSE, image as fitsImage } from '../tools/data-kinds-cases.mjs';
import { EN_IMAGEIMPORT } from '../js/i18n/en.imageImport.js';
import { ES_IMAGEIMPORT } from '../js/i18n/es.imageImport.js';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const TAGS = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22aa',
  'best-practice',
];
// Page timings are held to BOUNDS as written; a shared CI runner gets twice the
// time (the bounds were set on a laptop), and the override is for a loaded machine.
const FACTOR = Number(
  process.env.GRAVITAS_IMAGE_TIMING_FACTOR ?? (process.env.CI ? 2 : 1)
);
const fits = JSON.parse(
  readFileSync(
    new URL(
      '../tests/fixtures/imageImport/fits-refusals.json',
      import.meta.url
    ),
    'utf8'
  )
);

const W = 96;
const GAIN = 1.5;
const SKY = 100;
const SIGMA = 3 / 2.354820045;
const STAR = { x: 40.3, y: 50.6, amp: 300 };

/** A seeded 96 by 96 frame with one star of known flux, as a FITS file (float, ADU). */
function starFrame(cards = CLAIMS_CARDS) {
  const u = mulberry32(188);
  const gauss = () =>
    Math.sqrt(-2 * Math.log(1 - u())) * Math.cos(2 * Math.PI * u());
  const values = [];
  for (let j = 1; j <= W; j++)
    for (let i = 1; i <= W; i++)
      values.push(
        Math.fround(
          SKY +
            4 * gauss() +
            STAR.amp *
              Math.exp(
                -((i - STAR.x) ** 2 + (j - STAR.y) ** 2) / (2 * SIGMA * SIGMA)
              )
        )
      );
  return fitsImage({ bitpix: -32, width: W, height: W, values, cards });
}
const file = (name, buffer, mimeType = 'application/octet-stream') => ({
  name,
  mimeType,
  buffer: Buffer.from(buffer),
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

const panel = page => page.locator('#obsImageImport');
const choose = (page, f) => page.locator('#obsFile').setInputFiles(f);
/** The import module of the page itself (the same instance the page imported). */
const ledger = page =>
  page.evaluate(async () => {
    const m = await import('/js/observatory/imageImport.js');
    return m.ledgerSnapshot();
  });

/** A PNG and a JPEG drawn in the page: a gradient with one bright pixel at the top left. */
const picture = (page, type, w = 20, h = 14) =>
  page.evaluate(
    async ([type, w, h]) => {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const g = c.getContext('2d');
      const img = g.createImageData(w, h);
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const o = 4 * (y * w + x);
          img.data[o] =
            img.data[o + 1] =
            img.data[o + 2] =
              (x * 12 + y * 9) % 256;
          img.data[o + 3] = 255;
        }
      g.putImageData(img, 0, 0);
      const blob = await new Promise(r => c.toBlob(r, type, 0.92));
      return Array.from(new Uint8Array(await blob.arrayBuffer()));
    },
    [type, w, h]
  );

test.describe('every file of the corpus is refused in words, in time, and nothing is held', () => {
  for (const lang of ['en', 'es']) {
    test(`FITS, PNG and JPEG hostile files, ${lang}`, async ({ page }) => {
      test.setTimeout(240_000);
      await openPage(page, lang);
      const words = lang === 'es' ? ES_IMAGEIMPORT : EN_IMAGEIMPORT;
      const cases = [
        ...REFUSE.map(([name, build], i) => ({
          name: `FITS: ${name}`,
          file: `fits-${i}.fits`,
          bytes: build(),
          code: fits.cases[i].code,
          message: fits.cases[i].message,
        })),
        ...RASTER_REFUSE.map(([name, fname, build, code, message, opt]) => ({
          name: `raster: ${name}`,
          file: fname,
          bytes: build(),
          code,
          message,
          browser: opt?.browser,
        })),
      ];
      expect(cases.length).toBeGreaterThanOrEqual(120);
      const slowest = { ms: 0, name: '' };
      for (const c of cases) {
        await panel(page).evaluate(n => n.replaceChildren());
        const t0 = Date.now();
        await choose(page, file(c.file, c.bytes));
        const alert = panel(page).locator('[data-code]');
        await expect(alert, c.name).toBeVisible({ timeout: 20_000 });
        const ms = Date.now() - t0;
        if (ms > slowest.ms) Object.assign(slowest, { ms, name: c.name });
        expect(await alert.getAttribute('data-code'), c.name).toBe(c.code);
        await expect(alert.locator('p').first(), c.name).toHaveText(
          words[`obs.imp.no.${c.code}`]
        );
        if (c.message)
          await expect(alert.locator('span[lang=en]'), c.name).toHaveText(
            c.message
          );
        else
          await expect(alert.locator('span[lang=en]'), c.name).not.toHaveText(
            ''
          );
      }
      test.info().annotations.push({
        type: 'measured',
        description: `${cases.length} files, slowest ${slowest.ms} ms (${slowest.name})`,
      });
      expect(slowest.ms, `slowest: ${slowest.name}`).toBeLessThan(
        BOUNDS.refusalMsPage * FACTOR
      );
      // Nothing is held: no memory in the ledger, no image opened, no realm alive.
      expect(await ledger(page)).toMatchObject({ bytes: 0 });
      await expect(page.locator('#obsWork')).toBeHidden();
    });
  }

  test('a file over the bound is refused and no byte of it is read', async ({
    page,
  }) => {
    await openPage(page);
    await page.evaluate(() => {
      window.__reads = 0;
      for (const k of ['arrayBuffer', 'text', 'slice', 'stream'])
        for (const proto of [Blob.prototype]) {
          const was = proto[k];
          proto[k] = function (...a) {
            window.__reads++;
            return was.apply(this, a);
          };
        }
    });
    const over = Buffer.alloc(BOUNDS.maxFileBytes + 1);
    await choose(page, file('huge.fits', over));
    const alert = panel(page).locator('[data-code]');
    await expect(alert).toBeVisible({ timeout: 20_000 });
    expect(await alert.getAttribute('data-code')).toBe('file-too-large');
    await expect(alert.locator('span[lang=en]')).toHaveText(
      `the file is ${over.length} bytes; the most a frame and its headers can take is ${BOUNDS.maxFileBytes}`
    );
    expect(await page.evaluate(() => window.__reads)).toBe(
      BOUNDS.oversizeBytesRead
    );
    expect((await ledger(page)).bytes).toBe(0);
  });
});

test.describe('a FITS frame', () => {
  const open = async page => {
    await openPage(page);
    await choose(page, file('star.fits', starFrame()));
    await expect(panel(page).locator('#obsImpFields')).toBeVisible({
      timeout: 30_000,
    });
  };

  test('is read in a Worker, described with its claims and their cards, made quantitative by what the reader states, opened and measured', async ({
    page,
  }) => {
    await open(page);
    // The claims are shown with the card each came from, none believed yet.
    const claims = panel(page).locator('#obsImpClaims');
    await expect(claims).toContainText('Gain, electrons per count: 1.5');
    await expect(claims).toContainText('from header card GAIN');
    await expect(claims).toContainText('from header card DATE-OBS');
    await expect(panel(page).locator('dl')).toContainText('96 by 96 pixels');
    expect((await ledger(page)).bytes).toBe(0);
    // The effect of each field the reader fills is stated.
    for (const id of ['Time', 'Scale', 'Orientation'])
      await expect(panel(page).locator(`#obsImp${id}Effect`)).not.toBeEmpty();
    // The header alone: marks allowed, photometry refused, and what is missing.
    const uses = panel(page).locator('#obsImpUses');
    await expect(uses.locator('[data-use=marking]')).toHaveAttribute(
      'data-ok',
      'true'
    );
    await expect(uses.locator('[data-use=photometry]')).toHaveAttribute(
      'data-ok',
      'false'
    );
    await expect(uses.locator('[data-use=astrometry]')).toHaveAttribute(
      'data-ok',
      'false'
    );
    await expect(panel(page).locator('#obsImpMissing')).toContainText(
      'a linear range and how you know it'
    );
    await expect(panel(page).locator('#obsImpMissing')).toContainText(
      'a calibration state'
    );
    // A time with no scale is not a time.
    await panel(page).locator('#obsImpTimeScale').selectOption('');
    await expect(panel(page).locator('#obsImpProblems')).toContainText(
      'A time needs its scale'
    );
    await panel(page).locator('#obsImpOpen').click();
    await expect(page.locator('#obsWork')).toBeHidden();
    await panel(page).locator('#obsImpTimeScale').selectOption('UTC');
    // Stating the rest completes the contract.
    await panel(page).locator('#obsImpLinear').fill('50000');
    await panel(page).locator('#obsImpLinear').press('Tab');
    await panel(page).locator('#obsImpLinearHow').fill('the camera data sheet');
    await panel(page).locator('#obsImpLinearHow').press('Tab');
    await panel(page).locator('#obsImpCalibration').selectOption('calibrated');
    await expect(
      panel(page).locator('#obsImpUses [data-use=photometry]')
    ).toHaveAttribute('data-ok', 'true');
    await panel(page).locator('#obsImpOpen').click();
    await expect(page.locator('#obsWork')).toBeVisible();
    await expect(page.locator('#obsTitle')).toHaveText('star');
    await expect(page.locator('#obsMarksPanel')).toBeVisible();
    // Measured: the star's net light against its analytic flux.
    await page.locator('#obsPhotoPanel > summary').click();
    const box = page.locator('#obsPhotoBody');
    await expect(box.locator('canvas.ph-pic')).toBeVisible({ timeout: 30_000 });
    await box.getByLabel('x (pixels)', { exact: false }).fill('40');
    await box.getByLabel('y (pixels)', { exact: false }).fill('51');
    await box.getByRole('button', { name: 'Measure', exact: true }).click();
    const readout = box.locator('.ph-readout');
    await expect(readout).toContainText('Net light');
    const m = (await readout.textContent()).match(
      /Net light\s+([−\d.,]+)\s+±\s+([\d.,]+)/
    );
    const num = s => Number(String(s).replace(/[,\s]/g, '').replace('−', '-'));
    const truth = 2 * Math.PI * SIGMA * SIGMA * STAR.amp * GAIN;
    expect(Math.abs(num(m[1]) - truth)).toBeLessThan(5 * num(m[2]));
  });

  test('stated as raw, the frame is refused its photometry and told to calibrate it first', async ({
    page,
  }) => {
    await open(page);
    await panel(page).locator('#obsImpLinear').fill('50000');
    await panel(page).locator('#obsImpLinear').press('Tab');
    await panel(page).locator('#obsImpLinearHow').fill('the camera data sheet');
    await panel(page).locator('#obsImpLinearHow').press('Tab');
    await panel(page).locator('#obsImpCalibration').selectOption('raw');
    await panel(page).locator('#obsImpOpen').click();
    await page.locator('#obsPhotoPanel > summary').click();
    await expect(page.locator('#obsPhotoBody')).toContainText(
      'This frame is raw'
    );
  });

  test('with no BUNIT it is treated as display-only until the reader says the pixels are light', async ({
    page,
  }) => {
    await openPage(page);
    await choose(
      page,
      file('plain.fits', starFrame(CLAIMS_CARDS.filter(([k]) => k !== 'BUNIT')))
    );
    await expect(panel(page).locator('#obsImpFields')).toBeVisible({
      timeout: 30_000,
    });
    await expect(panel(page).locator('#obsImpPixelsAre')).toHaveValue(
      'display'
    );
    await expect(
      panel(page).locator('#obsImpUses [data-use=photometry]')
    ).toHaveAttribute('data-ok', 'false');
    await panel(page).locator('#obsImpPixelsAre').selectOption('light');
    await expect(panel(page).locator('#obsImpUnit')).toBeVisible();
  });
});

test.describe('a PNG and a JPEG', () => {
  for (const [name, type, kind] of [
    ['picture.png', 'image/png', 'PNG picture'],
    ['picture.jpg', 'image/jpeg', 'JPEG picture'],
  ]) {
    test(`${kind}: display-only, marks allowed, photometry and astrometry refused in the contract's words`, async ({
      page,
    }) => {
      await openPage(page);
      const bytes = await picture(page, type);
      await choose(page, file(name, bytes, type));
      await expect(panel(page).locator('#obsImpFields')).toBeVisible({
        timeout: 30_000,
      });
      await expect(panel(page).locator('dl')).toContainText(kind);
      await expect(panel(page).locator('dl')).toContainText('20 by 14 pixels');
      await expect(panel(page).locator('#obsImpWhy')).toContainText(
        'Photometry and astrometry are refused'
      );
      const uses = panel(page).locator('#obsImpUses');
      await expect(uses.locator('[data-use=marking]')).toHaveAttribute(
        'data-ok',
        'true'
      );
      for (const use of ['photometry', 'astrometry'])
        await expect(uses.locator(`[data-use=${use}]`)).toHaveAttribute(
          'data-ok',
          'false'
        );
      await expect(panel(page).locator('#obsImpNeeds')).toContainText(
        'a range where the detector is linear'
      );
      await panel(page).locator('#obsImpOpen').click();
      await expect(page.locator('#obsWork')).toBeVisible();
      await page.locator('#obsMarksPanel > summary').click();
      await expect(page.locator('#obsMarksBody .im-over')).toBeVisible({
        timeout: 30_000,
      });
      // The photometry panel says why, in the contract's words, and has no action.
      await page.locator('#obsPhotoPanel > summary').click();
      await expect(page.locator('#obsPhotoBody')).toContainText(
        'This image is display-only'
      );
    });
  }
});

test.describe('bounds', () => {
  test('the largest frame is read and opened within the time, and the ledger is empty after it', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await openPage(page);
    const n = 2048;
    const big = fitsImage({
      bitpix: -64,
      width: n,
      height: n,
      values: Float64Array.from(
        { length: n * n },
        (_, i) => (i * 7919) % 30000
      ),
    });
    const t0 = Date.now();
    await choose(page, file('big.fits', big));
    await expect(panel(page).locator('#obsImpFields')).toBeVisible({
      timeout: 60_000,
    });
    // The bound is chosen to shown, as the gate wrote it (BOUNDS).
    const shown = Date.now() - t0;
    await expect(panel(page).locator('dl')).toContainText('2048 by 2048');
    expect((await ledger(page)).bytes).toBe(0);
    const t1 = Date.now();
    await panel(page).locator('#obsImpOpen').click();
    await expect(page.locator('#obsWork')).toBeVisible({ timeout: 60_000 });
    await page.waitForFunction(
      () => Number(document.documentElement.dataset.opens) >= 1
    );
    const opened = Date.now() - t1;
    // Too many pixels for a saved workspace to read back: saving is off, with the reason.
    await expect(page.locator('#obsExportJson')).toBeDisabled();
    await expect(page.locator('#obsExportCsv')).toBeDisabled();
    await expect(page.locator('#obsImageSaveNote')).toContainText(
      /4,?194,?304 pixels/
    );
    await expect(page.locator('#obsImageSaveNote')).toContainText(/200,?000/);
    // Anything else opened gives the buttons back.
    await page.locator('#obsFixture').selectOption({ index: 0 });
    await page.locator('#obsOpen').click();
    await expect(page.locator('#obsExportJson')).toBeEnabled();
    await expect(page.locator('#obsImageSaveNote')).toBeHidden();
    test.info().annotations.push({
      type: 'measured',
      description: `2048 x 2048 BITPIX -64 (33.5 MB): chosen to shown ${shown} ms, then opened in ${opened} ms`,
    });
    expect(shown).toBeLessThan(BOUNDS.largestOpenMsPage * FACTOR);
  });

  test('a cancelled read ends its Worker, empties the ledger and keeps nothing', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      // Every Worker hears its first message late: the job is in flight when Cancel is pressed.
      window.__made = 0;
      window.__ended = 0;
      const Real = Worker;
      window.Worker = class extends Real {
        constructor(...a) {
          super(...a);
          window.__made++;
          const post = this.postMessage.bind(this);
          this.postMessage = (...p) => setTimeout(() => post(...p), 1500);
          const end = this.terminate.bind(this);
          this.terminate = () => {
            window.__ended++;
            end();
          };
        }
      };
    });
    await openPage(page);
    const n = 2048;
    const big = fitsImage({
      bitpix: -64,
      width: n,
      height: n,
      values: new Float64Array(n * n).fill(1),
    });
    await choose(page, file('big.fits', big));
    const cancel = panel(page).locator('#obsImpCancel');
    await expect(cancel).toBeVisible({ timeout: 20_000 });
    await expect
      .poll(() => ledger(page).then(l => l.bytes))
      .toBeGreaterThan(30_000_000);
    await cancel.click();
    await expect(panel(page)).toContainText('Canceled');
    await expect
      .poll(() => ledger(page).then(l => l.bytes), {
        timeout: BOUNDS.cancelledWorkersAfterMs,
      })
      .toBe(BOUNDS.cancelledLedgerBytes);
    await expect
      .poll(() => page.evaluate(() => [window.__made, window.__ended]), {
        timeout: BOUNDS.cancelledWorkersAfterMs,
      })
      .toEqual([1, 1]);
    await expect(page.locator('#obsWork')).toBeHidden();
    // The same file can be chosen again.
    expect(await page.locator('#obsFile').inputValue()).toBe('');
  });
});

test.describe('what the decoder gives', () => {
  test('PNG files of four colour types and depths are read at their header’s size', async ({
    page,
  }) => {
    await openPage(page);
    for (const [fname, size] of [
      ['gray.png', '16 by 12'],
      ['rgb.png', '7 by 5'],
      ['g16.png', '9 by 4'],
      ['rgba.png', '5 by 5'],
    ]) {
      const [, , build] = RASTER_ACCEPT.find(r => r[1] === fname);
      await panel(page).evaluate(n => n.replaceChildren());
      await choose(page, file(fname, build(), 'image/png'));
      await expect(panel(page).locator('dl')).toContainText(size, {
        timeout: 20_000,
      });
    }
  });

  test('a photograph turned by its orientation tag is opened as the decoder turned it, and its history says so', async ({
    page,
  }) => {
    await openPage(page);
    const jpg = Buffer.from(await picture(page, 'image/jpeg', 20, 14));
    // APP1 "Exif" with one IFD entry: Orientation (0x0112) = 6, rotate 90 degrees.
    const exif = Buffer.from([
      0xff, 0xe1, 0x00, 0x22, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00, 0x4d, 0x4d,
      0x00, 0x2a, 0x00, 0x00, 0x00, 0x08, 0x00, 0x01, 0x01, 0x12, 0x00, 0x03,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x06, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    ]);
    const turned = Buffer.concat([jpg.subarray(0, 2), exif, jpg.subarray(2)]);
    await choose(page, file('phone.jpg', turned, 'image/jpeg'));
    await expect(panel(page).locator('dl')).toContainText('14 by 20 pixels', {
      timeout: 20_000,
    });
  });
});

test.describe('the workspace file', () => {
  test('a small imported frame is saved with its file’s digest, sidecar and marks, and read back with the marks', async ({
    page,
  }) => {
    await openPage(page);
    const bytes = starFrame();
    const digest = createHash('sha256').update(bytes).digest('hex');
    await choose(page, file('star.fits', bytes));
    await expect(panel(page).locator('#obsImpFields')).toBeVisible({
      timeout: 30_000,
    });
    await panel(page).locator('#obsImpOpen').click();
    await expect(page.locator('#obsWork')).toBeVisible();
    await page.locator('#obsMarksPanel > summary').click();
    const marks = page.locator('#obsMarksBody');
    await expect(marks.locator('.im-over')).toBeVisible({ timeout: 30_000 });
    await marks.locator('button[data-tool="point"]').focus();
    await page.keyboard.press('Enter');
    await marks.locator('.im-over').focus();
    await page.keyboard.press('Enter');
    await expect(marks.locator('tbody tr')).toHaveCount(1);
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#obsExportJson').click(),
    ]);
    const saved = JSON.parse(readFileSync(await download.path(), 'utf8'));
    expect(saved.workspace.openedFrom).toMatchObject({
      kind: 'import',
      id: 'star.fits',
      file: { name: 'star.fits', bytes: bytes.length, digest },
    });
    expect(saved.image.sidecar).toMatchObject({
      format: 'gravitas.image',
      use: 'quantitative',
      pixels: { unit: 'adu', gain: { value: 1.5, source: 'header' } },
      time: { scale: 'UTC', format: 'iso' },
    });
    expect(saved.image.import.fromHeader.gain).toBe('header GAIN');
    expect(saved.workspace.marks.format).toBe('gravitas.image-marks');
    expect(saved.workspace.marks.marks).toHaveLength(1);
    // Read back through the same box: the marks return with the image.
    await choose(
      page,
      file('saved.json', JSON.stringify(saved), 'application/json')
    );
    await expect(marks.locator('tbody tr')).toHaveCount(1, { timeout: 30_000 });
    await expect(page.locator('#obsSource')).toContainText('star.fits');
  });
});

test.describe('both languages, axe, and every control', () => {
  for (const lang of ['en', 'es']) {
    test(`the form and a refusal: axe in both themes and 24 px targets at 1280 and 390, ${lang}`, async ({
      page,
    }) => {
      await openPage(page, lang);
      await choose(page, file('star.fits', starFrame()));
      await expect(panel(page).locator('#obsImpFields')).toBeVisible({
        timeout: 30_000,
      });
      await panel(page).locator('#obsImpPixelsAre').selectOption('light');
      for (const scheme of ['light', 'dark']) {
        await page.emulateMedia({ colorScheme: scheme });
        const violations = (
          await new AxeBuilder({ page })
            .withTags(TAGS)
            .include('#obsImageImport')
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
              '#obsImageImport :is(button, input, select, a), #obsFile'
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
      // A refusal, in the same two themes and sizes.
      await choose(page, file('cube.fits', REFUSE[0][1]()));
      await expect(panel(page).locator('[data-code]')).toBeVisible();
      for (const scheme of ['light', 'dark']) {
        await page.emulateMedia({ colorScheme: scheme });
        const violations = (
          await new AxeBuilder({ page })
            .withTags(TAGS)
            .include('#obsImageImport')
            .analyze()
        ).violations.map(v => v.id);
        expect(violations, `${lang} refusal ${scheme}`).toEqual([]);
      }
    });
  }

  test('the keyboard alone completes the import, and the page changing language re-words the open form', async ({
    page,
  }) => {
    await openPage(page, 'en');
    await choose(page, file('star.fits', starFrame()));
    await expect(panel(page).locator('#obsImpFields')).toBeVisible({
      timeout: 30_000,
    });
    // The heading takes focus, so a keyboard reader starts at the form.
    await expect(panel(page).locator('#obsImpTitle')).toBeFocused();
    await panel(page).locator('#obsImpOpen').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#obsWork')).toBeVisible();
    await choose(page, file('star2.fits', starFrame()));
    await expect(panel(page).locator('#obsImpFields')).toBeVisible({
      timeout: 30_000,
    });
    await page.locator('[data-gs-lang]').selectOption('es');
    await expect(panel(page).locator('#obsImpTitle')).toHaveText(
      ES_IMAGEIMPORT['obs.imp.title']
    );
    await expect(panel(page).locator('#obsImpOpen')).toHaveText(
      ES_IMAGEIMPORT['obs.imp.open']
    );
  });
});
