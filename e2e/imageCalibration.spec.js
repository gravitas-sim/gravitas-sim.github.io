// =============================================================================
// Sky coordinates for an image, in a browser (Prompt 181)
// -----------------------------------------------------------------------------
// tests/astrometry.test.js and tools/astrometry-validate.mjs hold the numbers
// (recovery, the oracle, coverage, refusals); this holds the page. A frame is
// calibrated from five stars of the Pleiades, looked up by name in the site's
// own bright-star file and placed on a synthetic frame by a truth WCS, and the
// solution, its residuals and its uncertainties are read; the refusals (too few
// stars, stars in a line, a mismatched catalogue entry, a cell that is not a
// number) say why in words; the image's own header is read, used or refused by
// name; the calibration is kept in the ledger, written into the workspace file
// and read back; every control is at least 24 px at 1280 and 390, in English
// and Spanish, light and dark; axe finds nothing. The whole path is buttons,
// boxes and menus, with no pointer-only control.
// =============================================================================

import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures.js';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { pixelOf } from '../js/measure/astrometry.js';
import { packStars, truthWcs } from '../tools/astrometry-validate.mjs';

const TAGS = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22aa',
  'best-practice',
];
const W = 128;
const H = 128;
/** Five Pleiades by Harvard Revised number, the names a reader types, and the truth WCS of the frame. */
const STARS = [
  ['Eta Tau', 1165],
  ['27 Tau', 1178],
  ['17 Tau', 1142],
  ['20 Tau', 1149],
  ['23 Tau', 1156],
];
const TRUTH = truthWcs({
  crval: [56.75, 24.1],
  crpix: [64.5, 64.5],
  scaleArcsec: 60,
  positionAngleDeg: 25,
  parity: -1,
});
const catalogue = packStars(STARS.map(s => s[1]));
const placed = STARS.map(([name, hr]) => {
  const p = pixelOf(TRUTH, catalogue[hr].raDeg, catalogue[hr].decDeg);
  return {
    name,
    hr,
    x: Math.round(p.x * 1000) / 1000,
    y: Math.round(p.y * 1000) / 1000,
    ra: catalogue[hr].raDeg,
    dec: catalogue[hr].decDeg,
  };
});

/** A synthetic image observation (gravitas.observation/1), small and valid. */
function imageObservation({ wcs, sidecar, id = 'cal-e2e' } = {}) {
  const x = [];
  const y = [];
  const v = [];
  for (let j = 1; j <= H; j++)
    for (let i = 1; i <= W; i++) {
      x.push(i);
      y.push(j);
      v.push(100 + ((i * 7 + j * 13) % 50));
    }
  return {
    format: 'gravitas.observation',
    formatVersion: 1,
    kind: 'image',
    id,
    title: 'Calibration test frame',
    object: null,
    facility: null,
    origin: 'observed',
    source: { kind: 'builtin', id, version: null },
    credit: 'synthetic test frame',
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
    image: {
      width: W,
      height: H,
      x: 'x',
      y: 'y',
      value: 'v',
      ...(wcs ? { wcs } : {}),
      ...(sidecar ? { sidecar } : {}),
    },
    masks: [],
    annotations: [],
  };
}
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
const body = page => page.locator('#obsCalBody');
const act = (page, name) => body(page).locator(`button[data-act="${name}"]`);
const rowsOf = page => body(page).locator('tbody').first().locator('tr');
const cell = (page, row, f) => rowsOf(page).nth(row).locator(`[data-f="${f}"]`);
const refusal = page => body(page).locator(':scope > p.ui-status');
const live = page => body(page).locator('[role="status"]');

async function openPanel(page, file = asFile(imageObservation())) {
  await page.locator('#obsFile').setInputFiles(file);
  await expect(page.locator('#obsCalPanel')).toBeVisible({ timeout: 30_000 });
  await page.locator('#obsCalPanel > summary').click();
  await expect(act(page, 'solve')).toBeVisible({ timeout: 30_000 });
}
/** Type the stars into the table: names always, pixels always, sky positions only when asked. */
async function fillStars(page, stars, { sky = false } = {}) {
  await rowsOf(page).first().waitFor();
  while ((await rowsOf(page).count()) < stars.length)
    await act(page, 'add').click();
  for (const [i, s] of stars.entries()) {
    await cell(page, i, 'name').fill(s.name);
    await cell(page, i, 'x').fill(String(s.x));
    await cell(page, i, 'y').fill(String(s.y));
    await cell(page, i, 'sigma').fill('0.1');
    if (sky) {
      await cell(page, i, 'ra').fill(String(s.ra));
      await cell(page, i, 'dec').fill(String(s.dec));
    }
  }
}
const save = async page => {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#obsExportJson').click(),
  ]);
  return JSON.parse(await readFile(await download.path(), 'utf8'));
};

test.describe('sky coordinates: solving from reference stars', () => {
  test('five Pleiades are looked up by name, solved, read, kept, saved and read back', async ({
    page,
  }) => {
    await openPage(page);
    await openPanel(page);
    await fillStars(page, placed);
    await act(page, 'lookup').click();
    await expect(live(page)).toContainText('5 positions looked up');
    await expect(cell(page, 0, 'ra')).toHaveValue(/^56\.\d+$/);
    await act(page, 'solve').click();
    await expect(live(page)).toContainText('Solved from 5 stars: consistent');
    const out = body(page).locator('.cal-out');
    await expect(out).toContainText('The solution');
    await expect(out).toContainText(
      'The residuals are consistent with the stated uncertainties'
    );
    await expect(out).toContainText(
      'East to the left with north up'.toLowerCase()
    );
    await expect(out.locator('.cal-dl')).toContainText(/60(\.\d*)? ±/);
    await expect(out.locator('tbody tr')).toHaveCount(5);
    // The scale read from the page is the truth's, to a thousandth.
    const text = await out.locator('.cal-dl').innerText();
    expect(
      Math.abs(
        Number(/Scale[^\n]*\n(\d+(?:\.\d+)?)/.exec(text)?.[1] ?? NaN) - 60
      )
    ).toBeLessThan(0.06);
    // A position through the solution: the reference pixel is the reference position, with its uncertainty.
    await body(page).getByLabel('Pixel x').fill('64.5');
    await body(page).getByLabel('Pixel y').fill('64.5');
    await act(page, 'toSky').click();
    const sky = body(page).locator('.cal-read output').first();
    await expect(sky).toContainText('03:');
    await expect(sky).toContainText('+24:');
    await expect(sky).toContainText('″ E');
    // And back: the sky position of the first star is its pixel.
    await body(page)
      .getByLabel('Right ascension', { exact: true })
      .fill(String(placed[0].ra));
    await body(page)
      .getByLabel('Declination', { exact: true })
      .fill(String(placed[0].dec));
    await act(page, 'toPixel').click();
    const pix = body(page).locator('.cal-read output').nth(1);
    await expect(pix).toContainText(`x ${Math.floor(placed[0].x * 10) / 10}`);
    // Kept in the ledger, in the reader's words.
    await act(page, 'keep').click();
    await expect(live(page)).toContainText('Kept in the ledger');
    const kept = await page.evaluate(() => {
      const raw = Object.entries(localStorage).find(([k]) =>
        /notebook/i.test(k)
      );
      return raw ? raw[1] : '';
    });
    expect(kept).toContain('image-calibration');
    expect(kept).toContain('Reference pixel, x');
    // The workspace file carries it, and a file saved before it was solved does not.
    const doc = await save(page);
    const cal = doc.workspace.calibration;
    expect(cal.format).toBe('gravitas.image-calibration');
    expect(cal.solution.origin).toBe('fit');
    expect(cal.catalog.source).toBe('sky-bright-stars');
    expect(cal.catalog.epoch).toContain('J2000.0');
    expect(cal.result.residuals).toHaveLength(5);
    expect(cal.frame.digest).toMatch(/^[0-9a-f]{64}$/);
    // A fresh page opens the saved file and the solution comes back.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', {
      timeout: 30_000,
    });
    await page.locator('#obsFile').setInputFiles({
      name: 'save.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(doc)),
    });
    await expect(page.locator('#obsCalPanel')).toHaveAttribute('open', '', {
      timeout: 30_000,
    });
    await expect(rowsOf(page)).toHaveCount(5, { timeout: 30_000 });
    await expect(body(page).locator('.cal-out')).toContainText(
      'The residuals are consistent',
      { timeout: 30_000 }
    );
    await expect(cell(page, 0, 'name')).toHaveValue('Eta Tau');
  });

  test('a save with no calibration has no calibration, and a file made on other pixels is refused', async ({
    page,
  }) => {
    await openPage(page);
    await openPanel(page);
    expect((await save(page)).workspace.calibration).toBeUndefined();
    await fillStars(page, placed, { sky: true });
    await act(page, 'solve').click();
    await expect(live(page)).toContainText('Solved from 5 stars');
    const doc = await save(page);
    const other = imageObservation();
    other.columns[2].values[777] += 1;
    const edited = JSON.parse(JSON.stringify(doc));
    edited.columns = other.columns;
    edited.workspace.source = null;
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', {
      timeout: 30_000,
    });
    await page.locator('#obsFile').setInputFiles({
      name: 'other.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(edited)),
    });
    await expect(live(page)).toContainText('different pixels', {
      timeout: 30_000,
    });
    await expect(body(page).locator('.cal-out')).toBeHidden();
  });

  test('editing a cell makes the last solution stale: it is hidden, and nothing is kept for it', async ({
    page,
  }) => {
    await openPage(page);
    await openPanel(page);
    await fillStars(page, placed, { sky: true });
    await act(page, 'solve').click();
    await expect(body(page).locator('.cal-out')).toBeVisible();
    await cell(page, 0, 'x').fill(String(placed[0].x + 1));
    await expect(body(page).locator('.cal-out')).toBeHidden();
    await act(page, 'keep').click();
    await expect(live(page)).toContainText('There is no solution to keep');
    expect((await save(page)).workspace.calibration).toBeUndefined();
  });

  test('removing a star renumbers the rest and is announced', async ({
    page,
  }) => {
    await openPage(page);
    await openPanel(page);
    await fillStars(page, placed.slice(0, 3));
    await rowsOf(page).nth(1).getByRole('button').click();
    await expect(rowsOf(page)).toHaveCount(2);
    await expect(live(page)).toContainText('Star 2 removed');
    await expect(cell(page, 1, 'x')).toHaveAttribute(
      'aria-label',
      'Star 2: x (pixels)'
    );
  });
});

test.describe('sky coordinates: what it refuses, and says', () => {
  test('too few, a line, a cell that is not a number, a mismatched entry', async ({
    page,
  }) => {
    await openPage(page);
    await openPanel(page);
    await fillStars(page, placed.slice(0, 2), { sky: true });
    await act(page, 'solve').click();
    await expect(refusal(page)).toContainText(
      'Not constrained: 2 stars is too few'
    );
    await expect(body(page).locator('.cal-out')).toBeHidden();
    // Three stars in a line of pixels on a field the sky puts them in a line on.
    await fillStars(page, placed.slice(0, 3), { sky: true });
    await cell(page, 0, 'x').fill('20');
    await cell(page, 0, 'y').fill('20');
    await cell(page, 1, 'x').fill('64');
    await cell(page, 1, 'y').fill('64');
    await cell(page, 2, 'x').fill('108');
    await cell(page, 2, 'y').fill('108');
    for (const [i, dec] of [
      [0, '24.0'],
      [1, '24.1'],
      [2, '24.2'],
    ]) {
      await cell(page, i, 'ra').fill('56.75');
      await cell(page, i, 'dec').fill(dec);
    }
    await act(page, 'solve').click();
    await expect(refusal(page)).toContainText('the stars lie along a line');
    // A cell that is not a number says which.
    await cell(page, 0, 'x').fill('');
    await act(page, 'solve').click();
    await expect(refusal(page)).toContainText(
      'Star 1: the x (pixels) is not a number'
    );
    // A mismatched catalogue entry: two stars' sky positions swapped.
    await fillStars(page, placed, { sky: true });
    const a = [
      await cell(page, 0, 'ra').inputValue(),
      await cell(page, 0, 'dec').inputValue(),
    ];
    await cell(page, 0, 'ra').fill(await cell(page, 4, 'ra').inputValue());
    await cell(page, 0, 'dec').fill(await cell(page, 4, 'dec').inputValue());
    await cell(page, 4, 'ra').fill(a[0]);
    await cell(page, 4, 'dec').fill(a[1]);
    await act(page, 'solve').click();
    await expect(body(page).locator('.cal-out')).toContainText(
      'The residuals are too large for the stated uncertainties'
    );
    await expect(
      body(page).locator('.cal-out .ui-status.is-error')
    ).toBeVisible();
  });

  test('three stars fix it exactly and the page says nothing checks the match', async ({
    page,
  }) => {
    await openPage(page);
    await openPanel(page);
    await fillStars(page, placed.slice(0, 3), { sky: true });
    await act(page, 'solve').click();
    await expect(body(page).locator('.cal-out')).toContainText(
      'no degree of freedom is left'
    );
  });

  test('lookup names what it could not find, and leaves the rest', async ({
    page,
  }) => {
    await openPage(page);
    await openPanel(page);
    await fillStars(page, [
      { ...placed[0] },
      { ...placed[1], name: 'Not a star' },
    ]);
    await act(page, 'lookup').click();
    await expect(live(page)).toContainText(
      '1 positions looked up; not found, or not one star: Not a star'
    );
    await expect(cell(page, 1, 'ra')).toHaveValue('');
  });
});

test.describe('sky coordinates: the marks and the header', () => {
  test("'Use my point marks' takes the points of the marks panel into the table", async ({
    page,
  }) => {
    await openPage(page);
    await page.locator('#obsFile').setInputFiles(asFile(imageObservation()));
    await expect(page.locator('#obsMarksPanel')).toBeVisible({
      timeout: 30_000,
    });
    await page.locator('#obsMarksPanel > summary').click();
    const over = page.locator('#obsMarksBody .im-over');
    await expect(over).toBeVisible({ timeout: 30_000 });
    await over.focus();
    await page.keyboard.press('Enter');
    await page.locator('#obsCalPanel > summary').click();
    await expect(act(page, 'marks')).toBeVisible({ timeout: 30_000 });
    await act(page, 'marks').click();
    await expect(live(page)).toContainText('1 point marks are in the table');
    await expect(cell(page, 0, 'name')).toHaveValue('m1');
    expect(Number(await cell(page, 0, 'x').inputValue())).toBeGreaterThan(0);
  });

  test("an image's own header is read, used, and checked against stars; a SIN header is refused by name", async ({
    page,
  }) => {
    const { PACK } =
      await import('../js/data/observations/tessHd209458S56Aperture.js');
    await openPage(page);
    await openPanel(page, asFile(imageObservation({ wcs: PACK.image.wcs })));
    await expect(body(page).locator('.cal-header')).toContainText(
      'tangent-plane projection about 22:03'
    );
    await expect(body(page).locator('.cal-header')).toContainText(
      'not solved here'
    );
    await body(page).locator('.cal-header button').click();
    await expect(body(page).locator('.cal-out')).toContainText('no residuals');
    await body(page)
      .getByLabel('Pixel x')
      .fill(String(PACK.image.wcs.crpix[0]));
    await body(page)
      .getByLabel('Pixel y')
      .fill(String(PACK.image.wcs.crpix[1]));
    await act(page, 'toSky').click();
    await expect(body(page).locator('.cal-read output').first()).toContainText(
      '330.79508'
    );
    // The record says it came from the header.
    const doc = await save(page);
    expect(doc.workspace.calibration.solution.origin).toBe('header');
    expect(doc.workspace.calibration.result).toBeNull();
    // A SIN header is refused by name.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', {
      timeout: 30_000,
    });
    await openPanel(
      page,
      asFile(
        imageObservation({
          wcs: { ...PACK.image.wcs, ctype: ['RA---SIN', 'DEC--SIN'] },
        })
      )
    );
    await expect(body(page).locator('.cal-header')).toContainText(
      'uses the SIN projection'
    );
    await expect(body(page).locator('.cal-header button')).toHaveCount(0);
  });

  test('a display-only image is not offered sky coordinates, and says why', async ({
    page,
  }) => {
    const sidecar = {
      ...JSON.parse(
        readFileSync(
          'tests/fixtures/dataKinds/image-tess-hd209458-aperture.json',
          'utf8'
        )
      ),
      use: 'display-only',
    };
    await openPage(page);
    await openPanel(page, asFile(imageObservation({ sidecar })));
    await expect(body(page).locator('.cal-header')).toContainText(
      'display-only'
    );
  });
});

test.describe('sky coordinates: both languages, axe, and every control', () => {
  for (const lang of ['en', 'es']) {
    test(`axe with a solution, and 24 px targets at 1280 and 390, ${lang}`, async ({
      page,
    }) => {
      await openPage(page, lang);
      await openPanel(page);
      await fillStars(page, placed, { sky: true });
      await act(page, 'solve').click();
      await expect(body(page).locator('.cal-out')).toBeVisible();
      if (lang === 'es') {
        await expect(page.locator('#obsCalPanel > summary')).toHaveText(
          'Coordenadas celestes de la imagen'
        );
        await expect(live(page)).toContainText(
          'Resuelta con 5 estrellas: coherente'
        );
        await expect(body(page).locator('.cal-out')).toContainText(
          'coherentes con las incertidumbres'
        );
      }
      for (const scheme of ['light', 'dark']) {
        await page.emulateMedia({ colorScheme: scheme });
        const violations = (
          await new AxeBuilder({ page })
            .withTags(TAGS)
            .include('#obsCalPanel')
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
              '#obsCalBody :is(button, input, select, a)'
            ),
          ]
            .filter(n => n.offsetParent !== null)
            .map(n => [
              n.tagName + (n.dataset.act || n.dataset.f || ''),
              n.getBoundingClientRect(),
            ])
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
          )
        ).toBe(true);
      }
    });
  }
});
