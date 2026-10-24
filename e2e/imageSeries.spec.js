/* global MutationObserver */
// =============================================================================
// Motion and parallax over time, in a browser (Prompt 186)
// -----------------------------------------------------------------------------
// ASTROMETRY.md committed what the kernel must do before it existed;
// tests/astrometricSeries.test.js and tools/astrometric-series-validate.mjs hold
// the numbers (the oracle, coverage, the refusals) and this holds the panel, which
// sits in the sky-coordinates panel: a pasted table fitted as a proper motion with
// the keyboard alone and no pointer event; a joint fit of a one-year synthetic
// series (made here with the repository's ephemeris, truth known) by clicks alone
// with the parallax, its relative-frame statement and both distance intervals,
// kept in the ledger and saved as CSV; the refusals in words (two epochs, a
// malformed row, Julian dates declared modified, a shift needs two rows) and the
// label of a two-epoch shift; a row added from a mark through the header's sky
// coordinates; both languages, axe in both themes, and every control at least 24
// px at 1280 and 390 px.
//
// The frame under the panel is a small synthetic image; the series is typed or
// pasted, since one frame is open at a time.
// =============================================================================

import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures.js';
import { createEphemeris } from '../js/mission/ephemeris.js';
import { PACK as EPH, DATA } from '../js/data/ephemeris/solarSystem2025.js';
import { heliocentric } from '../js/kernels/sky/planets.js';
import { createEarth } from '../js/measure/astrometric-series.js';
import { makeSeries, evenEpochs } from '../tools/astrometric-series-synth.mjs';

const TAGS = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22aa',
  'best-practice',
];
const W = 40;
const earth = createEarth({
  ephemeris: createEphemeris(EPH, DATA),
  heliocentric,
});
const TRUTH = {
  ra: 210,
  dec: 35,
  parallax: 0.1,
  mu: [0.25, -0.15],
  sigma: 0.005,
};

/** The pasted lines of a seeded series: epoch (JD, TDB), ra, dec (degrees), sigma (arcsec). */
const lines = (n, span, truth = TRUTH, { comma = false } = {}) =>
  makeSeries(truth, evenEpochs(2461045.5, span, n), earth, { seed: 'e2e' })
    .epochs.map(e =>
      [e.time.value.toFixed(5), e.ra.toFixed(10), e.dec.toFixed(10), e.sigma]
        .map(String)
        .map(v => (comma ? v.replace('.', ',') : v))
        .join('\t')
    )
    .join('\n');

function imageObservation({ wcs, time, id = 'series-e2e' } = {}) {
  const x = [];
  const y = [];
  const v = [];
  for (let j = 1; j <= W; j++)
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
    title: 'Series test frame',
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
      height: W,
      x: 'x',
      y: 'y',
      value: 'v',
      ...(wcs ? { wcs } : {}),
      ...(time ? { time } : {}),
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

const box = page => page.locator('#obsSeriesPanel');
const btn = (page, name) =>
  box(page).getByRole('button', { name, exact: true });
const field = (page, label) => box(page).getByLabel(label, { exact: false });
const live = page => box(page).locator('[role=status]');
const out = page => box(page).locator('.ph-readout');
const refusal = page => box(page).locator('p.ui-status.is-error');
const fitted = page => box(page).locator('table.im-table').nth(1);

/** Import the frame and open the series panel; `keyboard`: Enter on the summaries, no pointer. */
async function openSeries(
  page,
  file = asFile(imageObservation()),
  { keyboard = false } = {}
) {
  await page.locator('#obsFile').setInputFiles(file);
  await expect(page.locator('#obsCalPanel')).toBeVisible({ timeout: 30_000 });
  for (const sel of ['#obsCalPanel > summary', '#obsSeriesPanel > summary']) {
    const s = page.locator(sel);
    await expect(s).toBeVisible({ timeout: 30_000 });
    if (keyboard) {
      await s.focus();
      await page.keyboard.press('Enter');
    } else await s.click();
  }
  await expect(btn(page, 'Fit').or(btn(page, 'Ajustar'))).toBeVisible({
    timeout: 30_000,
  });
}
/** Paste a table and load it. */
async function load(page, text, { keyboard = false, lang = 'en' } = {}) {
  const [area, button] =
    lang === 'es'
      ? ['Filas que cargar', 'Cargar estas filas']
      : ['Rows to load', 'Load these rows'];
  const d = box(page).locator('details', {
    hasText: /Paste a table|Pegar una tabla/,
  });
  if (!(await d.evaluate(n => n.open))) {
    const s = d.locator('> summary');
    if (keyboard) {
      await s.focus();
      await page.keyboard.press('Enter');
    } else await s.click();
  }
  await field(page, area).fill(text);
  if (keyboard) {
    await btn(page, button).focus();
    await page.keyboard.press('Enter');
  } else await btn(page, button).click();
}
const watchInput = page =>
  page.evaluate(() => {
    window.__ptr = 0;
    window.__keys = 0;
    for (const e of ['pointerdown', 'pointerup', 'mousedown', 'mouseup'])
      document.addEventListener(e, () => window.__ptr++, true);
    document.addEventListener('keydown', () => window.__keys++, true);
    window.__said = [];
    const region = document.querySelector('#obsSeriesPanel [role=status]');
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
const numberOf = s =>
  Number(
    String(s)
      .replace(/[,\s±]/g, '')
      .replace('−', '-')
  );
const row = (page, name) => fitted(page).locator('tbody tr', { hasText: name });

test.describe('motion and parallax: keyboard alone', () => {
  test('a pasted table is fitted as a proper motion, with its parameters, residuals and plots, and no pointer event', async ({
    page,
  }) => {
    await openPage(page);
    await openSeries(page, undefined, { keyboard: true });
    await watchInput(page);
    await load(page, lines(6, 1000, { ...TRUTH, parallax: 0.0005 }), {
      keyboard: true,
    });
    await expect(live(page)).toContainText('6 rows loaded');
    await field(page, 'What to fit').selectOption('motion');
    await btn(page, 'Fit').focus();
    await page.keyboard.press('Enter');
    await expect(out(page)).toContainText('degrees of freedom', {
      timeout: 30_000,
    });
    await expect(fitted(page).locator('caption')).toHaveText(
      'Fitted parameters'
    );
    await expect(fitted(page).locator('tbody tr')).toHaveCount(4);
    const mux = numberOf(
      await row(page, 'right ascension').locator('td').first().innerText()
    );
    expect(Math.abs(mux - 250)).toBeLessThan(8);
    await expect(box(page).locator('svg.ow-plot')).toHaveCount(2);
    await expect(box(page).locator('svg.ow-plot').first()).toBeVisible();
    await expect(
      box(page).locator('caption', { hasText: 'Residuals' })
    ).toBeVisible();
    await expect(
      box(page).locator('table.im-table').nth(2).locator('tbody tr')
    ).toHaveCount(6);
    // no parallax and no distance in a proper-motion fit
    await expect(out(page)).not.toContainText('Distance');
    const { ptr, keys } = await counts(page);
    expect(ptr).toBe(0);
    expect(keys).toBeGreaterThan(0);
  });
});

test.describe('motion and parallax: single pointer alone', () => {
  test('a year of epochs is fitted for parallax and motion, the distance carries its interval and the frame statement, kept in the ledger and saved as CSV, all by clicks', async ({
    page,
  }) => {
    await openPage(page);
    await openSeries(page);
    await watchInput(page);
    await load(page, lines(20, 380));
    await expect(live(page)).toContainText('20 rows loaded');
    await btn(page, 'Fit').click();
    await expect(out(page)).toContainText('Parallax:', { timeout: 60_000 });
    const p = numberOf(
      await row(page, 'Parallax (relative)').locator('td').first().innerText()
    );
    const s = numberOf(
      await row(page, 'Parallax (relative)').locator('td').nth(1).innerText()
    );
    expect(Math.abs(p - 100)).toBeLessThan(5 * s);
    await expect(out(page)).toContainText(
      'consistent with the stated uncertainties'
    );
    await expect(out(page)).toContainText('68.27% interval of the distance');
    await expect(out(page)).toContainText('95% interval of the distance');
    await expect(out(page)).toContainText(
      'Relative parallax: measured against the reference frame'
    );
    // the distance interval holds 10 parsecs (1 / 0.1 arcsec)
    const text = await out(page).innerText();
    const m = text.match(
      /95% interval of the distance: ([\d.,]+) to ([\d.,]+) pc/
    );
    expect(numberOf(m[1])).toBeLessThan(10);
    expect(numberOf(m[2])).toBeGreaterThan(10);
    await btn(page, 'Keep in the ledger').click();
    await expect(live(page)).toContainText('Kept in the ledger');
    const kept = await page.evaluate(() =>
      Object.keys(localStorage).filter(k => /notebook|ledger/i.test(k))
    );
    expect(kept.length).toBeGreaterThan(0);
    const entries = await page.evaluate(() =>
      Object.keys(localStorage)
        .filter(k => /notebook|ledger/i.test(k))
        .map(k => localStorage.getItem(k))
        .join('')
    );
    expect(entries).toContain('image-series');
    expect(entries).toContain('series.distance');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      btn(page, 'Save residuals as CSV').click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/series\.csv$/);
    const csv = await (
      await import('node:fs/promises')
    ).readFile(await download.path(), 'utf8');
    expect(
      csv
        .replace(/^\uFEFF/, '')
        .trim()
        .split(/\r?\n/)
    ).toHaveLength(21);
    const { keys, ptr } = await counts(page);
    expect(keys).toBe(0);
    expect(ptr).toBeGreaterThan(0);
  });

  test('a correction to absolute parallax is applied only with its source, and both are shown', async ({
    page,
  }) => {
    await openPage(page);
    await openSeries(page);
    await load(page, lines(20, 380));
    await field(page, 'Correction to absolute parallax').fill('1.5');
    await field(page, 'Its uncertainty').fill('0.5');
    await btn(page, 'Fit').click();
    await expect(refusal(page)).toContainText('needs its source', {
      timeout: 60_000,
    });
    await expect(fitted(page)).toHaveCount(0);
    await field(page, 'Its source').fill('a typed value for the test');
    await btn(page, 'Fit').click();
    await expect(out(page)).toContainText('Corrected to absolute', {
      timeout: 60_000,
    });
    await expect(out(page)).toContainText('a typed value for the test');
    await expect(refusal(page)).toBeHidden();
  });
});

test.describe('motion and parallax: refusals', () => {
  test('too few epochs, a malformed row, wrongly declared epochs and a shift that is not two rows are refused in words', async ({
    page,
  }) => {
    await openPage(page);
    await openSeries(page);
    await load(page, lines(2, 400));
    await btn(page, 'Fit').click();
    await expect(refusal(page)).toContainText('at least 8 epochs', {
      timeout: 60_000,
    });
    // seven epochs over a year
    await load(page, lines(7, 365));
    await btn(page, 'Fit').click();
    await expect(refusal(page)).toContainText('7 epochs are too few');
    // eight epochs over half a year
    await load(page, lines(8, 180));
    await btn(page, 'Fit').click();
    await expect(refusal(page)).toContainText('at least 0.9 year');
    // Julian dates declared modified
    await load(page, lines(20, 380));
    await field(page, 'Epoch given as').selectOption('mjd');
    await btn(page, 'Fit').click();
    await expect(refusal(page)).toContainText('MJD', { timeout: 60_000 });
    await expect(refusal(page)).toContainText('outside the ephemeris');
    await field(page, 'Epoch given as').selectOption('jd');
    // a malformed row names its number
    await box(page).getByLabel('Row 3: Right ascension').fill('not an angle');
    await btn(page, 'Fit').click();
    await expect(refusal(page)).toContainText(
      'Row 3 is not a complete position'
    );
    // a shift needs two rows
    await field(page, 'What to fit').selectOption('shift');
    await box(page).getByLabel('Row 3: Right ascension').fill('210');
    await btn(page, 'Fit').click();
    await expect(refusal(page)).toContainText('exactly two rows');
  });

  test('a two-epoch shift carries its label and nothing more: no parallax, no distance, no CSV, no ledger entry', async ({
    page,
  }) => {
    await openPage(page);
    await openSeries(page);
    await load(page, lines(2, 400, { ...TRUTH, parallax: 0.0005 }));
    await field(page, 'What to fit').selectOption('shift');
    await btn(page, 'Fit').click();
    await expect(out(page)).toContainText(
      'shift under a fixed-motion assumption; not a parallax',
      { timeout: 30_000 }
    );
    await expect(out(page)).toContainText('Displacement:');
    await expect(out(page)).not.toContainText('Parallax');
    await expect(out(page)).not.toContainText('Distance');
    await expect(btn(page, 'Save residuals as CSV')).toBeDisabled();
    await expect(btn(page, 'Keep in the ledger')).toBeDisabled();
  });

  test('a half-year shift of the epochs gives a negative parallax, and the panel says so and shows no distance', async ({
    page,
  }) => {
    await openPage(page);
    await openSeries(page);
    const shifted = lines(20, 380)
      .split('\n')
      .map(l => {
        const p = l.split('\t');
        p[0] = (Number(p[0]) + 182.6).toFixed(5);
        return p.join('\t');
      })
      .join('\n');
    await load(page, shifted);
    await btn(page, 'Fit').click();
    await expect(out(page)).toContainText('negative by more than 3 times', {
      timeout: 60_000,
    });
    await expect(out(page)).toContainText('No distance is presented');
  });
});

test.describe('motion and parallax: a row from a mark', () => {
  test("a point mark's tag and the header's sky coordinates make a row, in the table's epoch scale", async ({
    page,
  }) => {
    const { PACK } =
      await import('../js/data/observations/tessHd209458S56Aperture.js');
    await openPage(page);
    await page.locator('#obsFile').setInputFiles(
      asFile(
        imageObservation({
          wcs: PACK.image.wcs,
          time: { value: 59000.25, scale: 'UTC', format: 'mjd' },
        })
      )
    );
    await expect(page.locator('#obsMarksPanel')).toBeVisible({
      timeout: 30_000,
    });
    await page.locator('#obsMarksPanel > summary').click();
    const over = page.locator('#obsMarksBody .im-over');
    await expect(over).toBeVisible({ timeout: 30_000 });
    await over.focus();
    await page.keyboard.press('Enter');
    const tag = page.locator(
      '#obsMarksBody tr[data-id="m1"] input[data-axis="tag"]'
    );
    await tag.fill('star');
    await tag.press('Tab');
    await page.locator('#obsCalPanel > summary').click();
    await page.locator('#obsCalBody .cal-header button').click();
    await page.locator('#obsSeriesPanel > summary').click();
    await expect(btn(page, 'Fit')).toBeVisible({ timeout: 30_000 });
    // the choice lists the tag, and the first (empty) row is filled, not a new one added
    await expect(field(page, 'Tag of the marked source')).toHaveValue('star');
    await btn(page, "Add a row from this image's mark").click();
    await expect(live(page)).toContainText('2 rows.');
    const rows = box(page)
      .locator('table.im-table')
      .first()
      .locator('tbody tr');
    await expect(rows).toHaveCount(2);
    const first = rows.first().locator('input');
    expect(numberOf(await first.nth(0).inputValue())).toBeCloseTo(59000.25, 4);
    const ra = numberOf(await first.nth(1).inputValue());
    expect(ra).toBeGreaterThan(300);
    expect(ra).toBeLessThan(360);
    await expect(field(page, 'Time scale')).toHaveValue('utc');
    await expect(field(page, 'Epoch given as')).toHaveValue('mjd');
  });

  test('no tag, or no sky coordinates, is refused in words', async ({
    page,
  }) => {
    await openPage(page);
    await openSeries(page);
    await btn(page, "Add a row from this image's mark").click({ force: true });
    await expect(refusal(page)).toContainText('Choose a tag');
  });
});

test.describe('motion and parallax: both languages, axe, and every control', () => {
  for (const lang of ['en', 'es']) {
    test(`axe with a result, and 24 px targets at 1280 and 390, ${lang}`, async ({
      page,
    }) => {
      await openPage(page, lang);
      await openSeries(page);
      await load(page, lines(12, 380, TRUTH, { comma: lang === 'es' }), {
        lang,
      });
      await field(
        page,
        lang === 'es' ? 'Qué ajustar' : 'What to fit'
      ).selectOption('joint');
      await btn(page, lang === 'es' ? 'Ajustar' : 'Fit').click();
      await expect(box(page).locator('svg.ow-plot').first()).toBeVisible({
        timeout: 60_000,
      });
      if (lang === 'es') {
        await expect(page.locator('#obsSeriesPanel > summary')).toContainText(
          'Movimiento y paralaje en el tiempo'
        );
        await expect(out(page)).toContainText('Paralaje relativo');
      }
      for (const scheme of ['light', 'dark']) {
        await page.emulateMedia({ colorScheme: scheme });
        const violations = (
          await new AxeBuilder({ page })
            .withTags(TAGS)
            .include('#obsSeriesPanel')
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
              '#obsSeriesPanel :is(button, input, select, textarea, a, summary)'
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
    await openSeries(page);
    await load(page, lines(8, 400, { ...TRUTH, parallax: 0.0005 }));
    await field(page, 'What to fit').selectOption('motion');
    await btn(page, 'Fit').click();
    await expect(fitted(page).locator('tbody tr')).toHaveCount(4, {
      timeout: 30_000,
    });
    await page.locator('[data-gs-lang]').selectOption('es');
    await expect(btn(page, 'Ajustar')).toBeVisible();
    await expect(page.locator('#obsSeriesPanel > summary')).toContainText(
      'Movimiento y paralaje en el tiempo'
    );
    await expect(fitted(page).locator('caption')).toHaveText(
      'Parámetros ajustados'
    );
    await expect(fitted(page).locator('tbody tr')).toHaveCount(4);
  });
});
