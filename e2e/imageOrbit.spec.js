/* global MutationObserver */
// =============================================================================
// The orbit of a binary star and the track of a moving object, in a browser (Prompt 187)
// -----------------------------------------------------------------------------
// ORBIT_FIT_GATE.md committed what the fit must do before it existed;
// tests/orbitFit.test.js and tools/orbit-fit-validate.mjs hold the numbers (the
// oracles, coverage, the refusals) and this holds the panel, which sits in the
// sky-coordinates panel beside the series tool: the synthetic binary fitted with
// the keyboard alone and no pointer event; the same by clicks alone, its mass sum
// with the reference-frame statement, kept in the ledger and saved as CSV; the
// refusals in words (a short arc, too few epochs, a malformed paste, a regular
// cadence); the moving object found among the static sources of the synthetic
// field, and the refusal when none moves; both languages, axe in both themes, and
// every control at least 24 px at 1280 and 390 px.
//
// The frame under the panel is a small synthetic image; the table is the panel's
// own synthetic example (a program made it from known elements) or a few typed lines.
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
const W = 40;

function imageObservation({ wcs, time, id = 'orbit-e2e' } = {}) {
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
    title: 'Orbit test frame',
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

const box = page => page.locator('#obsOrbitPanel');
const btn = (page, name) =>
  box(page).getByRole('button', { name, exact: true });
const field = (page, label) => box(page).getByLabel(label, { exact: false });
const live = page => box(page).locator('[role=status]');
const out = page => box(page).locator('.ph-readout');
const refusal = page => box(page).locator('p.ui-status.is-error');
const elements = page => box(page).locator('table.im-table').first();
const L = {
  en: {
    example: 'Load a synthetic example',
    fit: 'Fit the orbit',
    find: 'Find the mover',
    mode: 'Tool',
    track: 'Track of a moving object',
    data: 'Table to fit',
    keep: 'Keep in the ledger',
    csv: 'Save the residuals as CSV',
  },
  es: {
    example: 'Cargar un ejemplo sintético',
    fit: 'Ajustar la órbita',
    find: 'Buscar el objeto en movimiento',
    mode: 'Herramienta',
    track: 'Trayectoria de un objeto en movimiento',
    data: 'Tabla que ajustar',
    keep: 'Guardar en el registro',
    csv: 'Guardar los residuos como CSV',
  },
};

/** Import the frame and open the orbit panel; `keyboard`: Enter on the summaries, no pointer. */
async function openOrbit(page, { keyboard = false, lang = 'en' } = {}) {
  await page.locator('#obsFile').setInputFiles(asFile(imageObservation()));
  await expect(page.locator('#obsCalPanel')).toBeVisible({ timeout: 30_000 });
  for (const sel of ['#obsCalPanel > summary', '#obsOrbitPanel > summary']) {
    const s = page.locator(sel);
    await expect(s).toBeVisible({ timeout: 30_000 });
    if (keyboard) {
      await s.focus();
      await page.keyboard.press('Enter');
    } else await s.click();
  }
  await expect(btn(page, L[lang].example)).toBeVisible({ timeout: 30_000 });
}
const watchInput = page =>
  page.evaluate(() => {
    window.__ptr = 0;
    window.__keys = 0;
    for (const e of ['pointerdown', 'pointerup', 'mousedown', 'mouseup'])
      document.addEventListener(e, () => window.__ptr++, true);
    document.addEventListener('keydown', () => window.__keys++, true);
    window.__said = [];
    const region = document.querySelector('#obsOrbitPanel [role=status]');
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
  Number(String(s).split('±')[0].replace(/[,\s]/g, '').replace('−', '-'));
const row = (page, name) =>
  elements(page).locator('tbody tr', { hasText: name });
/** Activate a button by the keyboard alone. */
async function press(page, name) {
  await btn(page, name).focus();
  await page.keyboard.press('Enter');
}

test.describe('orbit and track: keyboard alone', () => {
  test('the synthetic binary is fitted with its elements, period interval, mass sum, plots and residuals, and no pointer event', async ({
    page,
  }) => {
    await openPage(page);
    await openOrbit(page, { keyboard: true });
    await watchInput(page);
    await press(page, L.en.example);
    await expect(live(page)).toContainText('synthetic binary');
    await press(page, L.en.fit);
    await expect(out(page)).toContainText('Mass sum', { timeout: 60_000 });
    await expect(elements(page).locator('caption')).toHaveText('The orbit');
    // the elements recover the synthetic truth (a 0.9 arcsec = 900 mas, P 14.2 yr, i 62 deg)
    const val = async name =>
      numberOf(await row(page, name).locator('td').first().innerText());
    const P = await val('Period');
    expect(Math.abs(P - 14.2)).toBeLessThan(1.5);
    const a = await val('Semi-major axis');
    expect(Math.abs(a - 900)).toBeLessThan(120);
    await expect(out(page)).toContainText('68.27 percent');
    await expect(out(page)).toContainText('95 percent');
    await expect(out(page)).toContainText('ascending node');
    await expect(out(page)).toContainText(
      'The parallax is relative to the reference stars'
    );
    await expect(box(page).locator('svg.ow-plot')).toHaveCount(2);
    await expect(box(page).locator('svg.ow-plot').first()).toBeVisible();
    await expect(
      box(page).locator('caption', { hasText: 'Residuals' })
    ).toBeVisible();
    await expect(
      box(page).locator('table.im-table').nth(1).locator('tbody tr')
    ).toHaveCount(12);
    const { ptr, keys } = await counts(page);
    expect(ptr).toBe(0);
    expect(keys).toBeGreaterThan(0);
  });
});

test.describe('orbit and track: single pointer alone', () => {
  test('the binary is fitted and the mass sum carries its frame statement, kept in the ledger and saved as CSV, all by clicks', async ({
    page,
  }) => {
    await openPage(page);
    await openOrbit(page);
    await watchInput(page);
    await btn(page, L.en.example).click();
    await btn(page, L.en.fit).click();
    await expect(out(page)).toContainText('Mass sum', { timeout: 60_000 });
    await expect(out(page)).toContainText('95 percent');
    await expect(out(page)).toContainText('degrees of freedom');
    await btn(page, L.en.keep).click();
    await expect(live(page)).toContainText('Kept in the ledger');
    const entries = await page.evaluate(() =>
      Object.keys(localStorage)
        .filter(k => /notebook|ledger/i.test(k))
        .map(k => localStorage.getItem(k))
        .join('')
    );
    expect(entries).toContain('image-orbit');
    expect(entries).toContain('orbit.P');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      btn(page, L.en.csv).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/orbit\.csv$/);
    const csv = await (
      await import('node:fs/promises')
    ).readFile(await download.path(), 'utf8');
    expect(
      csv
        .replace(/^\uFEFF/, '')
        .trim()
        .split(/\r?\n/)
    ).toHaveLength(13);
    const { keys, ptr } = await counts(page);
    expect(keys).toBe(0);
    expect(ptr).toBeGreaterThan(0);
  });

  test('a circular fit of the same table is a different model and says so', async ({
    page,
  }) => {
    await openPage(page);
    await openOrbit(page);
    await btn(page, L.en.example).click();
    await field(page, 'Orbit model').selectOption('circular');
    await btn(page, L.en.fit).click();
    // the elliptical example is not described by a circle: either a refusal in words or a fit
    // that says it was circular by choice; never a silent number
    await expect(
      refusal(page).or(out(page).getByText('circular orbit was fitted'))
    ).toBeVisible({ timeout: 60_000 });
  });

  test('the synthetic field gives its moving object, with a rate and a position angle, among the static sources', async ({
    page,
  }) => {
    await openPage(page);
    await openOrbit(page);
    await field(page, L.en.mode).selectOption('track');
    await btn(page, L.en.example).click();
    await expect(live(page)).toContainText('synthetic field');
    await btn(page, L.en.find).click();
    await expect(out(page)).toContainText('7 static sources', {
      timeout: 30_000,
    });
    const rate = numberOf(
      await row(page, 'Rate of motion').locator('td').first().innerText()
    );
    expect(Math.abs(rate - 0.8)).toBeLessThan(0.1);
    const pa = numberOf(
      await row(page, 'Position angle').locator('td').first().innerText()
    );
    expect(Math.abs(pa - 60)).toBeLessThan(5);
    await expect(box(page).locator('svg.ow-plot').first()).toBeVisible();
    await btn(page, L.en.keep).click();
    await expect(live(page)).toContainText('Kept in the ledger');
  });
});

test.describe('orbit and track: refusals', () => {
  test('too few epochs, a short arc, a malformed table and a table with nothing moving are refused in words', async ({
    page,
  }) => {
    await openPage(page);
    await openOrbit(page);
    const area = field(page, L.en.data);
    // a malformed table
    await area.fill('not a table');
    await btn(page, L.en.fit).click();
    await expect(refusal(page)).toContainText('needs 4 numbers');
    // three epochs
    await area.fill(
      '2000 0.1 0.1 0.01\n2001 0.12 0.1 0.01\n2002 0.13 0.11 0.01'
    );
    await btn(page, L.en.fit).click();
    await expect(refusal(page)).toContainText('Not constrained');
    await expect(refusal(page)).toContainText('epochs');
    // ten epochs over a small part of a long period: a straight run of points
    const arc = Array.from(
      { length: 10 },
      (_, k) =>
        `${2000 + k * 0.7 + (k % 3) * 0.05} ${(0.5 + 0.01 * k).toFixed(4)} ${(0.2 - 0.004 * k).toFixed(4)} 0.01`
    ).join('\n');
    await area.fill(arc);
    await btn(page, L.en.fit).click();
    await expect(refusal(page)).toContainText('Not constrained');
    expect(await out(page).innerText()).toBe('');
    // nothing moves: the same seven sources in five frames
    await field(page, L.en.mode).selectOption('track');
    const fixed = [0, 1, 2, 3, 4]
      .flatMap(f =>
        [0, 1, 2, 3, 4, 5, 6].map(
          k =>
            `${2460000 + f * 0.02} ${(k * 7 - 20).toFixed(3)} ${(k * 3).toFixed(3)} 0.04`
        )
      )
      .join('\n');
    await area.fill(fixed);
    await btn(page, L.en.find).click();
    await expect(refusal(page)).toContainText('No mover');
    await expect(btn(page, L.en.csv)).toBeDisabled();
    await expect(btn(page, L.en.keep)).toBeDisabled();
  });
});

test.describe('orbit and track: both languages, axe, and every control', () => {
  for (const lang of ['en', 'es']) {
    test(`axe with a result, and 24 px targets at 1280 and 390, ${lang}`, async ({
      page,
    }) => {
      await openPage(page, lang);
      await openOrbit(page, { lang });
      await btn(page, L[lang].example).click();
      await btn(page, L[lang].fit).click();
      await expect(box(page).locator('svg.ow-plot').first()).toBeVisible({
        timeout: 60_000,
      });
      if (lang === 'es') {
        await expect(page.locator('#obsOrbitPanel > summary')).toContainText(
          'Órbita de una estrella binaria'
        );
        await expect(out(page)).toContainText('Suma de masas');
      }
      for (const scheme of ['light', 'dark']) {
        await page.emulateMedia({ colorScheme: scheme });
        const violations = (
          await new AxeBuilder({ page })
            .withTags(TAGS)
            .include('#obsOrbitPanel')
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
              '#obsOrbitPanel :is(button, input, select, textarea, a, summary)'
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
    await openOrbit(page);
    await btn(page, L.en.example).click();
    await btn(page, L.en.fit).click();
    await expect(elements(page).locator('tbody tr').first()).toBeVisible({
      timeout: 60_000,
    });
    const n = await elements(page).locator('tbody tr').count();
    await page.locator('[data-gs-lang]').selectOption('es');
    await expect(btn(page, L.es.fit)).toBeVisible();
    await expect(page.locator('#obsOrbitPanel > summary')).toContainText(
      'Órbita de una estrella binaria'
    );
    await expect(elements(page).locator('caption')).toHaveText('La órbita');
    await expect(elements(page).locator('tbody tr')).toHaveCount(n);
  });
});
