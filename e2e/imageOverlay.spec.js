// =============================================================================
// Catalog overlays, blink and compare, in a browser (Prompt 182)
// -----------------------------------------------------------------------------
// OVERLAYS.md committed what the kernel must do before it existed;
// tests/overlay.test.js and tools/overlay-validate.mjs hold the numbers (the
// stars and planets against astropy, the resampling against scipy, coverage, the
// refusals) and this holds the panel: the bright stars drawn over a calibrated
// frame at the pixels their sky positions give, the planets with their bound,
// every catalog entry a read-only row of a table; a second calibrated frame held
// as the next image opened, tied through the sky or by matched stars, blinked at
// a chosen rate (by hand with reduced motion), put beside the first with linked
// cursors moved by the arrow keys and by buttons, and subtracted only where the
// two are alike; a display-only frame, a frame with no sky coordinates, no time
// and a pair that cannot be subtracted each refused in words; both languages, axe
// in both themes, and every control at least 24 px at 1280 and 390 px.
//
// The frames are synthetic and seeded, in ADU, with a pixel contract: the real
// bright stars of the site's own pack at the pixels a truth WCS gives them (the
// truth is computed here from the astrometry module, which Prompt 181 validated
// against astropy, and by a straight-line proper motion written out here, not
// from the overlay's own arithmetic), and in the second frame, a different
// pointing and rotation and one object that is not in the first.
// =============================================================================

import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test, expect } from './fixtures.js';
import { mulberry32 } from '../js/rng.js';
import { pixelOf, skyOf } from '../js/measure/astrometry.js';
import { geocentricEquatorial } from '../js/kernels/sky/planets.js';
import { truthWcs } from '../tools/astrometry-validate.mjs';
import { sidecarOf } from '../tools/overlay-validate.mjs';

const TAGS = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22aa',
  'best-practice',
];
const W = 128;
const TIME = {
  value: '2026-01-01T00:00:00',
  scale: 'UTC',
  format: 'iso',
  reference: 'mid',
};
/** Years from J2000.0 to 2026-01-01T00:00:00 UTC (TT is 69 s later: no star moves a pixel in that). */
const YEARS = (2461041.5 + 69.2 / 86400 - 2451545) / 365.25;
const SIGMA = 1.5;
const SKY = 100;

const WCS_A = truthWcs({
  crval: [84.05, -1.2],
  crpix: [64.5, 64.5],
  scaleArcsec: 90,
  positionAngleDeg: 0,
  parity: -1,
});
const WCS_B = truthWcs({
  crval: [84.15, -1.15],
  crpix: [60.5, 66.5],
  scaleArcsec: 90,
  positionAngleDeg: 3,
  parity: -1,
});
/** The object only the second frame has, in the second frame's pixels, and where the first frame puts it. */
const MOVER_B = [40.3, 90.7];
const MOVER_A = (() => {
  const s = skyOf(WCS_B, ...MOVER_B);
  const p = pixelOf(WCS_A, s.ra, s.dec);
  return [p.x, p.y];
})();

const pack = JSON.parse(
  readFileSync(
    path.join(import.meta.dirname, '../sky/bright-stars.json'),
    'utf8'
  )
).stars;
/** A pack star at the frame's time by a straight-line proper motion, degrees. */
const moved = r => {
  const dec = r[2] / 1e4;
  return {
    ra: r[1] / 1e4 + (r[5] / 3.6e6 / Math.cos((dec * Math.PI) / 180)) * YEARS,
    dec: dec + (r[6] / 3.6e6) * YEARS,
  };
};
/** The stars of V up to 4.5 inside a frame of this WCS, with the pixel the truth gives them. */
const inFrame = wcs =>
  pack
    .map(r => ({ r, p: pixelOf(wcs, ...Object.values(moved(r))) }))
    .filter(
      ({ r, p }) =>
        r[3] / 100 <= 4.5 &&
        p &&
        p.x >= 0.5 &&
        p.x <= W + 0.5 &&
        p.y >= 0.5 &&
        p.y <= W + 0.5
    )
    .map(({ r, p }) => ({
      name: r[8] || r[7],
      v: r[3] / 100,
      x: p.x,
      y: p.y,
    }));
const STARS_A = inFrame(WCS_A);

function frame(wcs, { seed, extra = [], contract = {}, id, title }) {
  const u = mulberry32(seed);
  const gauss = () =>
    Math.sqrt(-2 * Math.log(1 - u())) * Math.cos(2 * Math.PI * u());
  const sources = [
    ...inFrame(wcs).map(s => ({
      x: s.x,
      y: s.y,
      amp: Math.min(30000, 4000 * 10 ** (-0.4 * (s.v - 2))),
    })),
    ...extra,
  ];
  const x = new Array(W * W);
  const y = new Array(W * W);
  const v = new Array(W * W);
  for (let j = 1; j <= W; j++)
    for (let i = 1; i <= W; i++) {
      const k = (j - 1) * W + (i - 1);
      x[k] = i;
      y[k] = j;
      let value = SKY + 3 * gauss();
      for (const s of sources) {
        const d2 = (i - s.x) ** 2 + (j - s.y) ** 2;
        if (d2 < 100) value += s.amp * Math.exp(-d2 / (2 * SIGMA * SIGMA));
      }
      v[k] = Math.round(value * 100) / 100;
    }
  const sidecar = {
    ...sidecarOf({ width: W, height: W, time: TIME, ...contract }),
    wcs,
  };
  if (contract.noTime) delete sidecar.time;
  return {
    format: 'gravitas.observation',
    formatVersion: 1,
    kind: 'image',
    id,
    title,
    object: null,
    facility: null,
    origin: 'observed',
    source: { kind: 'builtin', id, version: null },
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
    image: {
      width: W,
      height: W,
      wcs,
      x: 'x',
      y: 'y',
      value: 'v',
      sidecar,
      ...(sidecar.time ? { time: sidecar.time } : {}),
    },
    masks: [],
    annotations: [],
  };
}
const FIRST = (over = {}) =>
  frame(WCS_A, { seed: 1821, id: 'ov-a', title: 'First frame', ...over });
const SECOND = (over = {}) =>
  frame(WCS_B, {
    seed: 1822,
    id: 'ov-b',
    title: 'Second frame',
    extra: [{ x: MOVER_B[0], y: MOVER_B[1], amp: 900 }],
    ...over,
  });
const asFile = o => ({
  name: `${o.id}.json`,
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

const box = page => page.locator('#obsOverlayBody');
const btn = (page, name) =>
  box(page).getByRole('button', { name, exact: true });
const field = (page, label) => box(page).getByLabel(label, { exact: false });
const live = page => box(page).locator('[role=status]').first();
const tieNote = page => box(page).locator('p[role=status]');
const rows = page =>
  box(page).locator('table.im-table').first().locator('tbody tr');

/** Open an image and the panel. `keyboard`: Enter on the summary, no pointer. */
async function openOverlay(
  page,
  file = asFile(FIRST()),
  { keyboard = false } = {}
) {
  await page.locator('#obsFile').setInputFiles(file);
  await expect(page.locator('#obsOverlayPanel')).toBeVisible({
    timeout: 30_000,
  });
  const summary = page.locator('#obsOverlayPanel > summary');
  if (keyboard) {
    await summary.focus();
    await page.keyboard.press('Enter');
  } else await summary.click();
  await expect(box(page).locator('canvas.ov-pic').first()).toBeVisible({
    timeout: 30_000,
  });
}
/** Take the next image opened as the second frame, and open it. */
async function takeSecond(page, file = asFile(SECOND())) {
  await btn(page, 'Use the next image I open as the second frame').click();
  await page.locator('#obsFile').setInputFiles(file);
  await expect(
    box(page)
      .locator('p.ui-hint')
      .filter({ hasText: /^Second frame:/ })
  ).toBeVisible();
}
/** A button pressed from the keyboard alone: focus, then Enter. */
async function press(locator, page) {
  await locator.focus();
  await page.keyboard.press('Enter');
}
const number = s => Number(String(s).replace(/[,\s]/g, '').replace('−', '-'));
async function table(page) {
  const out = [];
  for (const r of await rows(page).all())
    out.push((await r.locator('th, td').allTextContents()).map(c => c.trim()));
  return out;
}
/** The gray at a first-frame pixel of the main picture (row 1 at the bottom). */
const grayAt = (page, x, y) =>
  page.evaluate(
    ([x0, y0]) => {
      const c = document.querySelectorAll('#obsOverlayBody canvas.ov-pic')[1];
      const k = c.width / 128;
      const d = c
        .getContext('2d')
        .getImageData(
          Math.floor((x0 - 0.5) * k),
          Math.floor((128 - y0 + 0.5) * k),
          1,
          1
        ).data;
      return d[0];
    },
    [x, y]
  );

test.describe('overlay: keyboard alone', () => {
  test('the bright stars are drawn at the pixels their sky positions give, as read-only rows, with no pointer event', async ({
    page,
  }) => {
    await openPage(page);
    await openOverlay(page, asFile(FIRST()), { keyboard: true });
    await page.evaluate(() => {
      window.__ptr = 0;
      for (const e of ['pointerdown', 'pointerup', 'mousedown', 'mouseup'])
        document.addEventListener(e, () => window.__ptr++, true);
    });
    expect(STARS_A.length).toBeGreaterThanOrEqual(3);
    await press(btn(page, 'Show the catalogs'), page);
    await expect(rows(page).first()).toBeVisible();
    const cells = await table(page);
    expect(cells.filter(c => c[1] === 'star')).toHaveLength(STARS_A.length);
    for (const s of STARS_A) {
      const mine = cells.find(c => c[0] === s.name);
      expect(mine, `row for ${s.name}`).toBeTruthy();
      expect(
        Math.hypot(number(mine[2]) - s.x, number(mine[3]) - s.y)
      ).toBeLessThan(0.02);
    }
    // Read-only: the rows have no input and the table says whose they are.
    expect(await box(page).locator('table.im-table input').count()).toBe(0);
    await expect(
      box(page).getByText('not your marks', { exact: false })
    ).toBeVisible();
    await expect(live(page)).toContainText(
      `${STARS_A.length} stars and 0 planets drawn`
    );
    // The epoch and the proper-motion treatment are stated.
    await expect(
      box(page).getByText('moved to the time of the image', { exact: false })
    ).toBeVisible();
    await expect(
      box(page).getByText('2026-01-01T00:00:00 UTC', { exact: false })
    ).toBeVisible();
    await expect(
      box(page).getByText('Sky coordinates: the image’s own header', {
        exact: false,
      })
    ).toBeVisible();
    expect(await page.evaluate(() => window.__ptr)).toBe(0);
  });

  test('a planet is drawn where the planet kernel puts it, with its bound, and a star list left out by a magnitude limit says so', async ({
    page,
  }) => {
    const g = geocentricEquatorial('jupiter', 2461041.5 + 69.2 / 86400);
    const wcs = truthWcs({
      crval: [g.raDeg, g.decDeg],
      crpix: [64.5, 64.5],
      scaleArcsec: 60,
      positionAngleDeg: 0,
      parity: -1,
    });
    await openPage(page);
    await openOverlay(
      page,
      asFile(frame(wcs, { seed: 1823, id: 'ov-j', title: 'Jupiter field' }))
    );
    await btn(page, 'Show the catalogs').click();
    await expect(rows(page).first()).toBeVisible();
    const cells = await table(page);
    const j = cells.find(c => c[0] === 'Jupiter');
    expect(j, 'a Jupiter row').toBeTruthy();
    expect(j[1]).toBe('planet');
    expect(Math.hypot(number(j[2]) - 64.5, number(j[3]) - 64.5)).toBeLessThan(
      0.05
    );
    expect(j[6]).toContain('0.2 degree');
    await expect(
      box(page).getByText('good to 0.2 degree', { exact: false })
    ).toBeVisible();
    // No planet but Jupiter: nothing else is in this small field.
    expect(cells.filter(c => c[1] === 'planet')).toHaveLength(1);
    // The faintest-star box limits the list.
    await field(page, 'Faintest star').fill('0');
    await btn(page, 'Show the catalogs').click();
    await expect(
      box(page).getByText('0 stars and 1 planets are in this frame')
    ).toBeVisible();
    expect((await table(page)).filter(c => c[1] === 'star')).toHaveLength(0);
  });

  test('a frame with no time leaves the stars unmoved and the planets undrawn, and says why', async ({
    page,
  }) => {
    await openPage(page);
    await openOverlay(page, asFile(FIRST({ contract: { noTime: true } })));
    await btn(page, 'Show the catalogs').click();
    await expect(
      box(page).getByText(
        'not moved by proper motion, because the image has no time',
        { exact: false }
      )
    ).toBeVisible();
    await expect(
      box(page).getByText('Planets are not drawn: the image has no time', {
        exact: false,
      })
    ).toBeVisible();
    await expect(rows(page).first()).toBeVisible();
  });

  test('a display-only image and an image with no sky coordinates are refused in words, and nothing is drawn or listed', async ({
    page,
  }) => {
    await openPage(page);
    await openOverlay(
      page,
      asFile(FIRST({ contract: { use: 'display-only' } }))
    );
    await btn(page, 'Show the catalogs').click();
    await expect(
      box(page).locator('.ui-status.is-error:not([hidden])')
    ).toContainText('display-only');
    await expect(rows(page)).toHaveCount(0);
    // An image with no WCS anywhere.
    const bare = FIRST({ id: 'ov-bare' });
    delete bare.image.wcs;
    delete bare.image.sidecar.wcs;
    await page.locator('#obsFile').setInputFiles(asFile(bare));
    await btn(page, 'Show the catalogs').click();
    await expect(
      box(page).locator('.ui-status.is-error:not([hidden])')
    ).toContainText('no sky coordinates');
    await expect(rows(page)).toHaveCount(0);
  });
});

test.describe('blink and compare: keyboard alone', () => {
  test('a second frame is held, tied through the sky, blinked at each rate and shown by hand', async ({
    page,
  }) => {
    await openPage(page);
    await openOverlay(page, asFile(FIRST()), { keyboard: true });
    await press(
      btn(page, 'Use the next image I open as the second frame'),
      page
    );
    await expect(box(page)).toContainText('Waiting: choose the second image');
    await page.locator('#obsFile').setInputFiles(asFile(SECOND()));
    await expect(box(page)).toContainText(
      'Second frame: Second frame (128 by 128 pixels)'
    );
    await expect(tieNote(page)).toContainText('Tied through the sky');
    // The first image is still the one open.
    await expect(page.locator('#obsTitle')).toContainText('First frame');
    const start = btn(page, 'Start blinking');
    const shown = box(page)
      .locator('p.ui-hint')
      .filter({ hasText: /^Showing/ });
    await expect(shown).toContainText('Showing the first frame');
    await press(start, page);
    const stop = btn(page, 'Stop blinking');
    await expect(stop).toHaveAttribute('data-interval-ms', '1000');
    await expect(shown).toContainText('Showing the second frame', {
      timeout: 5000,
    });
    await expect(shown).toContainText('Showing the first frame', {
      timeout: 5000,
    });
    for (const [label, ms] of [
      ['Four times a second', '250'],
      ['Every 2 seconds', '2000'],
    ]) {
      await box(page).getByLabel('Blink rate').selectOption({ label });
      await expect(btn(page, 'Stop blinking')).toHaveAttribute(
        'data-interval-ms',
        ms
      );
    }
    await box(page)
      .getByLabel('Blink rate')
      .selectOption({ label: 'Four times a second' });
    await expect(btn(page, 'Stop blinking')).toHaveAttribute(
      'data-interval-ms',
      '250'
    );
    await press(btn(page, 'Stop blinking'), page);
    await expect(btn(page, 'Start blinking')).toBeVisible();
    await expect(live(page)).toContainText('Blinking stopped');
    // By hand: the button shows the other frame and says which.
    const before = await shown.textContent();
    await press(btn(page, 'Show the other frame'), page);
    await expect(shown).not.toHaveText(before);
    await expect(live(page)).toContainText('Showing the');
  });

  test('with reduced motion the frames do not blink by themselves and the button shows the other', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openPage(page);
    await openOverlay(page);
    await takeSecond(page);
    await expect(btn(page, 'Start blinking')).toBeHidden();
    await expect(
      box(page).getByText('asks for reduced motion', { exact: false })
    ).toBeVisible();
    const shown = box(page)
      .locator('p.ui-hint')
      .filter({ hasText: /^Showing/ });
    await expect(shown).toContainText('first frame');
    await btn(page, 'Show the other frame').click();
    await expect(shown).toContainText('second frame');
    await btn(page, 'Show the other frame').click();
    await expect(shown).toContainText('first frame');
  });

  test('side by side: each cursor is linked through the tie, moved by the arrow keys, Alt and Shift, and by buttons', async ({
    page,
  }) => {
    await openPage(page);
    await openOverlay(page);
    await takeSecond(page);
    await box(page).getByLabel('View').selectOption({ label: 'Side by side' });
    const pics = box(page).locator('canvas.ov-pic');
    const [picA, picB] = [pics.nth(1), pics.nth(2)];
    await expect(picB).toBeVisible();
    const out = box(page)
      .locator('p.ui-hint')
      .filter({ hasText: /^Cursor:/ });
    const at = async () => {
      const m = (await out.textContent()).match(
        /first frame \(([-\d.,]+), ([-\d.,]+)\)\. Second frame \(([-\d.,]+), ([-\d.,]+)\)/
      );
      return m.slice(1).map(number);
    };
    const [x0, y0] = await at();
    await picA.focus();
    await page.keyboard.press('ArrowRight');
    let [x1, y1, bx1, by1] = await at();
    expect([x1 - x0, y1 - y0]).toEqual([1, 0]);
    // The second cursor is where the sky puts the first.
    const s = skyOf(WCS_A, x1, y1);
    const q = pixelOf(WCS_B, s.ra, s.dec);
    expect(Math.hypot(bx1 - q.x, by1 - q.y)).toBeLessThan(0.02);
    await page.keyboard.press('Alt+ArrowUp');
    let [, y2] = await at();
    expect(y2 - y1).toBeCloseTo(0.25, 6);
    await page.keyboard.press('Shift+ArrowLeft');
    let [x3] = await at();
    expect(x3 - x1).toBe(-4);
    // Buttons, with the step chosen.
    await box(page).getByLabel('Step (pixels)').selectOption('4');
    await btn(page, 'Cursor down').click();
    const [, y4] = await at();
    expect(y4 - y2).toBe(-4);
    // A click on the picture puts the cursor on that pixel.
    const r = await picA.boundingBox();
    await picA.click({ position: { x: r.width * 0.25, y: r.height * 0.25 } });
    const [x5, y5] = await at();
    expect(Math.abs(x5 - 32.5)).toBeLessThan(2);
    expect(Math.abs(y5 - 96.5)).toBeLessThan(2);
    // Moving the second frame's cursor moves the first through the tie.
    await picB.focus();
    await page.keyboard.press('ArrowDown');
    const [ax, ay, bx, by] = await at();
    const sb = skyOf(WCS_B, bx, by);
    const pa = pixelOf(WCS_A, sb.ra, sb.dec);
    expect(Math.hypot(ax - pa.x, ay - pa.y)).toBeLessThan(0.02);
    // Unlinked, they part.
    await box(page).getByLabel('Link the cursors').uncheck();
    const before = await at();
    await picA.focus();
    await page.keyboard.press('ArrowRight');
    const after = await at();
    expect(after[0] - before[0]).toBe(1);
    expect(after[2]).toBe(before[2]);
  });

  test('matched stars tie two frames that have no sky coordinates, and say how well', async ({
    page,
  }) => {
    const bare = o => {
      delete o.image.wcs;
      delete o.image.sidecar.wcs;
      return o;
    };
    await openPage(page);
    await openOverlay(page, asFile(bare(FIRST())));
    await takeSecond(page, asFile(bare(SECOND())));
    // No sky coordinates: the tie falls to matched stars and says it has too few.
    await expect(box(page).getByLabel('How the frames line up')).toHaveValue(
      'pairs'
    );
    await expect(tieNote(page)).toContainText('0 matched stars');
    // Five pairs, each a position in the first frame and where the truth puts it in the second.
    const pairs = [
      [20, 30],
      [100, 25],
      [64, 64],
      [30, 100],
      [105, 98],
    ].map(([x, y]) => {
      const sk = skyOf(WCS_A, x, y);
      const b = pixelOf(WCS_B, sk.ra, sk.dec);
      return [x, y, b.x, b.y];
    });
    for (const p of pairs) {
      await btn(page, 'Add a pair').click();
      const last = box(page)
        .locator('table.im-table')
        .nth(0)
        .locator('tbody tr')
        .last();
      const inputs = last.locator('input');
      for (let i = 0; i < 4; i++) await inputs.nth(i).fill(String(p[i]));
      await inputs.nth(3).dispatchEvent('change');
    }
    await expect(tieNote(page)).toContainText(
      `Tied by ${pairs.length} matched stars`
    );
    await expect(tieNote(page)).toContainText(
      'the stars agree with one rotation and shift'
    );
    const th = number(
      (await tieNote(page).textContent()).match(/rotation (−?[-\d.,]+)°/)[1]
    );
    expect(Math.abs(Math.abs(th) - 3)).toBeLessThan(0.1);
    // A swapped pair is flagged inconsistent.
    const first = box(page)
      .locator('table.im-table tbody tr')
      .first()
      .locator('input');
    const second = box(page)
      .locator('table.im-table tbody tr')
      .nth(1)
      .locator('input');
    const a = [
      await first.nth(2).inputValue(),
      await first.nth(3).inputValue(),
    ];
    const b = [
      await second.nth(2).inputValue(),
      await second.nth(3).inputValue(),
    ];
    await first.nth(2).fill(b[0]);
    await first.nth(3).fill(b[1]);
    await second.nth(2).fill(a[0]);
    await second.nth(3).fill(a[1]);
    await second.nth(3).dispatchEvent('change');
    await expect(tieNote(page)).toContainText('do NOT agree');
    await box(page).getByLabel('View').selectOption({ label: 'Difference' });
    await expect(
      box(page).locator('.ui-status.is-error:not([hidden])').last()
    ).toContainText('do not agree with one rotation and shift');
  });

  test('the difference of two calibrated frames shows what only the second has, and is labeled a picture, not a measurement', async ({
    page,
  }) => {
    await openPage(page);
    await openOverlay(page);
    await takeSecond(page);
    await box(page).getByLabel('View').selectOption({ label: 'Difference' });
    await expect(
      box(page).getByText('and is not saved', { exact: false })
    ).toBeVisible();
    await expect(
      box(page).getByText('Second minus first, in adu', { exact: false })
    ).toBeVisible();
    // The object that only the second frame has is white; the sky is mid gray.
    await expect
      .poll(() => grayAt(page, MOVER_A[0], MOVER_A[1]))
      .toBeGreaterThan(200);
    expect(await grayAt(page, 10, 10)).toBeGreaterThan(100);
    expect(await grayAt(page, 10, 10)).toBeLessThan(160);
  });

  test('a difference is refused with the reason: another calibration state, another unit, another exposure, a display-only frame', async ({
    page,
  }) => {
    await openPage(page);
    await openOverlay(page);
    const cases = [
      [
        { contract: { calibration: { state: 'calibrated' } } },
        'different stages of calibration',
      ],
      [
        { contract: { exposure: { seconds: 60, kind: 'effective' } } },
        'different exposures',
      ],
      [{ contract: { use: 'display-only' } }, 'display-only'],
    ];
    for (const [over, text] of cases) {
      await takeSecond(page, asFile(SECOND(over)));
      if (over.contract.use === 'display-only') {
        // Display-only has no sky coordinates: no tie yet, and the difference says so; then pixel for pixel.
        await box(page)
          .getByLabel('View')
          .selectOption({ label: 'Difference' });
        await expect(
          box(page).locator('.ui-status.is-error:not([hidden])')
        ).toContainText('not tied');
        await box(page)
          .getByLabel('How the frames line up')
          .selectOption({ label: 'Same pixels' });
      }
      await box(page).getByLabel('View').selectOption({ label: 'Difference' });
      await expect(
        box(page).locator('.ui-status.is-error:not([hidden])').last()
      ).toContainText(text);
      await box(page).getByLabel('View').selectOption({ label: 'Blink' });
    }
    // Blinking still works with a display-only frame: a picture to look at.
    await expect(btn(page, 'Show the other frame')).toBeEnabled();
    // Cancelling the wait leaves the next image to open as usual.
    await btn(page, 'Use the next image I open as the second frame').click();
    await btn(page, 'Cancel').click();
    await page
      .locator('#obsFile')
      .setInputFiles(asFile(FIRST({ id: 'ov-c', title: 'Third frame' })));
    await expect(page.locator('#obsTitle')).toContainText('Third frame');
  });
});

test.describe('overlay and blink: both languages, axe, and every control', () => {
  for (const lang of ['en', 'es']) {
    test(`axe with a result, and 24 px targets at 1280 and 390, ${lang}`, async ({
      page,
    }) => {
      const es = lang === 'es';
      await openPage(page, lang);
      await openOverlay(page);
      await btn(
        page,
        es ? 'Mostrar los catálogos' : 'Show the catalogs'
      ).click();
      await expect(rows(page).first()).toBeVisible();
      await btn(
        page,
        es
          ? 'Usar la próxima imagen que abra como segundo fotograma'
          : 'Use the next image I open as the second frame'
      ).click();
      await page.locator('#obsFile').setInputFiles(asFile(SECOND()));
      await expect(box(page).locator('table.im-table').nth(0)).toBeAttached();
      await expect(tieNote(page)).toContainText(
        es ? 'Unidos por el cielo' : 'Tied through the sky'
      );
      await box(page)
        .getByLabel(es ? 'Vista' : 'View')
        .selectOption({ label: es ? 'Lado a lado' : 'Side by side' });
      if (es)
        await expect(page.locator('#obsOverlayPanel > summary')).toContainText(
          'Catálogos, parpadeo y comparación'
        );
      for (const scheme of ['light', 'dark']) {
        await page.emulateMedia({ colorScheme: scheme });
        const violations = (
          await new AxeBuilder({ page })
            .withTags(TAGS)
            .include('#obsOverlayPanel')
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
              '#obsOverlayBody :is(button, input, select, a)'
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

  test('the page changing language re-words the open panel and keeps its table and its tie', async ({
    page,
  }) => {
    await openPage(page, 'en');
    await openOverlay(page);
    await btn(page, 'Show the catalogs').click();
    await expect(rows(page).first()).toBeVisible();
    const n = await rows(page).count();
    await takeSecond(page);
    await page.locator('[data-gs-lang]').selectOption('es');
    await expect(btn(page, 'Mostrar los catálogos')).toBeVisible();
    await expect(page.locator('#obsOverlayPanel > summary')).toContainText(
      'Catálogos, parpadeo y comparación'
    );
    await expect(rows(page)).toHaveCount(n);
    await expect(
      box(page).locator('caption', { hasText: 'Entradas del catálogo' })
    ).toBeVisible();
    await expect(
      box(page).getByText('Segundo fotograma: Second frame', { exact: false })
    ).toBeVisible();
  });
});
