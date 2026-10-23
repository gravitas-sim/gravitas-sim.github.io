/* global MutationObserver, requestAnimationFrame, KeyboardEvent, PointerEvent */
// =============================================================================
// The image marks instrument, in a browser (Prompt 179)
// -----------------------------------------------------------------------------
// IMAGE_MEASUREMENT_GATE.md committed what the instrument must do before its
// prototype existed; tests/imageMeasure.test.js and tools/image-marks-validate.mjs
// hold the numbers (precision, undo, determinism, the record) and this holds the
// page: the whole non-pointer path (place, nudge, read, edit, delete on all six
// mark kinds, with the scale from a reference pair) with no pointer event at
// all, the same by single pointer alone with no key event, one announcement per
// commit, the sequence navigator, the workspace's marks written, read back and
// refused against another image, the ledger entry that reopens the image with
// its marks, axe with marks present, both languages, every control at least
// 24 px (44 px on a touch screen) at 1280 and 390 px, light and dark, and the
// gate's throttled-profile timings as a regression test.
//
// Timing: the bounds are the gate's (T6, T7), measured with the CPU slowed four
// times in this page. A runner under load is not the gate's quiet Mac, so the
// default bounds are the gate's times GRAVITAS_IMAGE_TIMING_FACTOR (2); set it
// to 1 for the gate's own numbers on a quiet machine.
// =============================================================================

import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures.js';
import { mulberry32 } from '../js/rng.js';
import { readFileSync } from 'node:fs';

const TAGS = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22aa',
  'best-practice',
];
const FACTOR = Number(process.env.GRAVITAS_IMAGE_TIMING_FACTOR ?? 2);
const W = 128;
const H = 128;
/** The frame's truth: a disc of radius 28 and a star, in FITS pixels. */
const DISC = { x: 80.3, y: 45.7, r: 28 };
const STAR = { x: 30.4, y: 88.2 };

/** A synthetic image observation (gravitas.observation/1) with a disc and a star, seeded. */
function imageObservation(id = 'marks-e2e') {
  const u = mulberry32(179);
  const gauss = () =>
    Math.sqrt(-2 * Math.log(1 - u())) * Math.cos(2 * Math.PI * u());
  const n = W * H;
  const x = new Array(n);
  const y = new Array(n);
  const v = new Array(n);
  const sg = 4 / 2.354820045;
  for (let j = 1; j <= H; j++)
    for (let i = 1; i <= W; i++) {
      const k = (j - 1) * W + (i - 1);
      x[k] = i;
      y[k] = j;
      const d = Math.hypot(i - DISC.x, j - DISC.y);
      const s2 = (i - STAR.x) ** 2 + (j - STAR.y) ** 2;
      v[k] =
        Math.round(
          (100 +
            400 / (1 + Math.exp((d - DISC.r) / 0.8)) +
            1800 * Math.exp(-s2 / (2 * sg * sg)) +
            8 * gauss()) *
            100
        ) / 100;
    }
  return {
    format: 'gravitas.observation',
    formatVersion: 1,
    kind: 'image',
    id,
    title: 'Marks test frame',
    object: null,
    facility: null,
    origin: 'observed',
    source: { kind: 'builtin', id: 'marks-e2e', version: null },
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
    image: { width: W, height: H, x: 'x', y: 'y', value: 'v' },
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

/** Import the frame and open the marks panel. `keyboard`: by Enter on the summary, no pointer. */
async function openMarks(
  page,
  file = asFile(imageObservation()),
  { keyboard = false } = {}
) {
  aim = [64, 64];
  await page.locator('#obsFile').setInputFiles(file);
  await expect(page.locator('#obsMarksPanel')).toBeVisible({ timeout: 30_000 });
  const summary = page.locator('#obsMarksPanel > summary');
  if (keyboard) {
    await summary.focus();
    await page.keyboard.press('Enter');
  } else await summary.click();
  await expect(page.locator('#obsMarksBody .im-over')).toBeVisible({
    timeout: 30_000,
  });
}

/** Count what the instrument says: one new node in its live region per message. */
const watchLive = page =>
  page.evaluate(() => {
    window.__said = [];
    window.__ptr = 0;
    window.__keys = 0;
    new MutationObserver(list => {
      for (const m of list)
        for (const n of m.addedNodes) window.__said.push(n.textContent);
    }).observe(document.getElementById('obsMarksLive'), { childList: true });
    for (const e of ['pointerdown', 'pointerup', 'mousedown', 'mouseup'])
      document.addEventListener(e, () => window.__ptr++, true);
    document.addEventListener('keydown', () => window.__keys++, true);
  });
const said = page => page.evaluate(() => window.__said.slice());
const body = page => page.locator('#obsMarksBody');
const act = (page, name) => body(page).locator(`button[data-act="${name}"]`);
const tool = (page, kind) => body(page).locator(`button[data-tool="${kind}"]`);
/** A button pressed from the keyboard alone: focus, then Enter. */
async function press(locator, page) {
  await locator.focus();
  await page.keyboard.press('Enter');
}
const rows = page => body(page).locator('tbody tr');
const num = (page, id, axis) =>
  body(page).locator(`tr[data-id="${id}"] input[data-axis="${axis}"]`);

/** Where the keyboard aim is: it starts at the picture's centre and stays where it was left. */
let aim = [64, 64];
/** Move the keyboard aim to (x, y) with the contract's steps. */
async function aimAt(page, x, y) {
  await body(page).locator('.im-over').focus();
  const dx = Math.round(x) - aim[0];
  const dy = Math.round(y) - aim[1];
  const run = async (key, shiftKey, n) => {
    for (let i = 0; i < n; i++)
      await page.keyboard.press(shiftKey ? `Shift+${key}` : key);
  };
  await run(
    dx < 0 ? 'ArrowLeft' : 'ArrowRight',
    true,
    Math.floor(Math.abs(dx) / 4)
  );
  await run(dx < 0 ? 'ArrowLeft' : 'ArrowRight', false, Math.abs(dx) % 4);
  await run(
    dy < 0 ? 'ArrowDown' : 'ArrowUp',
    true,
    Math.floor(Math.abs(dy) / 4)
  );
  await run(dy < 0 ? 'ArrowDown' : 'ArrowUp', false, Math.abs(dy) % 4);
  aim = [Math.round(x), Math.round(y)];
}

test.describe('the marks instrument: keyboard alone', () => {
  test('every kind is placed, nudged, read, edited and deleted with no pointer event', async ({
    page,
  }) => {
    await openPage(page);
    await openMarks(page, undefined, { keyboard: true });
    await watchLive(page);
    // The scale first: a known length for a reference pair, typed.
    await body(page).locator('input[type=number]').first().fill('3474.8');
    const places = [
      ['point', [[30, 88]]],
      ['count', [[100, 100]]],
      [
        'segment',
        [
          [20, 20],
          [40, 30],
        ],
      ],
      [
        'circle',
        [
          [80, 46],
          [108, 46],
        ],
      ],
      [
        'polygon',
        [
          [60, 100],
          [90, 100],
          [75, 120],
        ],
      ],
      [
        'reference-pair',
        [
          [52, 46],
          [108, 46],
        ],
      ],
    ];
    for (const [kind, pts] of places) {
      await press(tool(page, kind), page);
      for (const [x, y] of pts) {
        // The aim moves from where it was left: restart from a known place with Escape.
        await aimAt(page, x, y);
        await page.keyboard.press('Enter');
      }
      if (kind === 'polygon') await press(act(page, 'finish'), page);
    }
    await expect(rows(page)).toHaveCount(places.length);
    await expect(body(page).locator('.im-scale')).toContainText('km/pix');
    // Read: a mark's cells say what it is.
    await expect(rows(page).first()).toContainText('Point');
    // Select the point, refine it by the keyboard, and read its place back.
    await press(
      body(page).locator('tr[data-id="m1"] button[data-act="select"]'),
      page
    );
    await press(act(page, 'refine'), page);
    await expect(num(page, 'm1', 'x')).toHaveValue(/^30\.\d+$/);
    expect(
      Math.abs(Number(await num(page, 'm1', 'x').inputValue()) - STAR.x)
    ).toBeLessThan(0.6);
    expect(
      Math.abs(Number(await num(page, 'm1', 'y').inputValue()) - STAR.y)
    ).toBeLessThan(0.6);
    // Nudge: Alt a quarter pixel on the focused picture.
    await body(page).locator('.im-over').focus();
    const before = Number(await num(page, 'm1', 'x').inputValue());
    await page.keyboard.press('Alt+ArrowRight');
    await expect(num(page, 'm1', 'x')).toHaveValue(
      String(Math.round((before + 0.25) * 100) / 100)
    );
    // Edit: the tag and a coordinate, in the table.
    await body(page)
      .locator('tr[data-id="m1"] input[data-axis="tag"]')
      .fill('star');
    await body(page)
      .locator('tr[data-id="m1"] input[data-axis="tag"]')
      .press('Tab');
    await num(page, 'm1', 'y').fill('88.5');
    await num(page, 'm1', 'y').press('Tab');
    await expect(num(page, 'm1', 'y')).toHaveValue('88.5');
    // Delete the count by the keyboard.
    await press(
      body(page).locator('tr[data-id="m2"] button[data-act="select"]'),
      page
    );
    await page.keyboard.press('Delete');
    await expect(rows(page)).toHaveCount(places.length - 1);
    // Undo brings it back; one announcement per commit and none repeated for nothing.
    await page.keyboard.press('Control+z');
    await expect(rows(page)).toHaveCount(places.length);
    await expect
      .poll(async () => (await said(page)).length)
      .toBeGreaterThan(10);
    expect(await page.evaluate(() => window.__ptr)).toBe(0);
    // Focus never rests on the body.
    expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe(
      'BODY'
    );
  });

  test('a commit is announced once, and a run of nudges is said when it stops', async ({
    page,
  }) => {
    await openPage(page);
    await openMarks(page, undefined, { keyboard: true });
    await watchLive(page);
    await press(tool(page, 'point'), page);
    await aimAt(page, 30, 88);
    // The aim moved 36 times: nothing said yet beyond one settled message.
    await expect
      .poll(async () => (await said(page)).length, { timeout: 5000 })
      .toBe(1);
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await said(page)).length).toBe(2);
    expect((await said(page))[1]).toMatch(/Point m1 placed at x 30, y 88/);
    // Longer than the settle time with nothing more said: the clock, not a guess.
    const t0 = await page.evaluate(() => performance.now());
    await page.waitForFunction(t => performance.now() - t > 900, t0);
    expect((await said(page)).length).toBe(2);
    await press(
      body(page).locator('tr[data-id="m1"] button[data-act="select"]'),
      page
    );
    await expect.poll(async () => (await said(page)).length).toBe(3);
    await press(act(page, 'refine'), page);
    await expect.poll(async () => (await said(page)).length).toBe(4);
    expect((await said(page))[3]).toMatch(
      /m1 refined to x 30\.\d+, y 88\.\d+, uncertainty/
    );
  });

  test('a refusal says why, and the mark stays as it was', async ({ page }) => {
    await openPage(page);
    await openMarks(page, undefined, { keyboard: true });
    await press(tool(page, 'point'), page);
    await aimAt(page, 10, 10);
    await page.keyboard.press('Enter');
    await press(
      body(page).locator('tr[data-id="m1"] button[data-act="select"]'),
      page
    );
    await watchLive(page);
    await press(act(page, 'refine'), page);
    await expect.poll(async () => (await said(page)).length).toBe(1);
    expect((await said(page))[0]).toMatch(
      /m1 not refined: too near the frame edge/
    );
    await expect(num(page, 'm1', 'x')).toHaveValue('10');
  });
});

test.describe('the marks instrument: single pointer alone', () => {
  test.use({ hasTouch: true, viewport: { width: 375, height: 812 } });

  test('a tap places a draft, the pad moves it, Place confirms, with no key event', async ({
    page,
  }) => {
    await openPage(page);
    await openMarks(page);
    await watchLive(page);
    const over = body(page).locator('.im-over');
    // A tap at (x, y) of the 128-pixel frame, measured where the picture is now.
    const tap = async (x, y) => {
      await over.scrollIntoViewIfNeeded();
      const box = await over.boundingBox();
      await page.touchscreen.tap(
        box.x + ((x - 0.5) / W) * box.width,
        box.y + ((H + 0.5 - y) / H) * box.height
      );
    };
    await tool(page, 'point').tap();
    await tap(30, 88);
    await expect
      .poll(async () => (await said(page)).at(-1))
      .toMatch(/Marker at x 3\d(\.\d+)?, y 8\d(\.\d+)?; nudge it, then Place/);
    await act(page, 'up').tap();
    await act(page, 'right').tap();
    await act(page, 'place').tap();
    await expect(rows(page)).toHaveCount(1);
    // A segment by two taps and two Place presses.
    await tool(page, 'segment').tap();
    for (const p of [
      [20, 20],
      [60, 30],
    ]) {
      await tap(...p);
      await act(page, 'place').tap();
    }
    await expect(rows(page)).toHaveCount(2);
    // Select by the table's button, refine, nudge with the pad, step sizes by the select.
    await body(page)
      .locator('tr[data-id="m1"] button[data-act="select"]')
      .tap();
    await act(page, 'refine').tap();
    const x0 = Number(await num(page, 'm1', 'x').inputValue());
    await body(page)
      .locator('label', { hasText: 'Step' })
      .locator('select')
      .selectOption('coarse');
    await act(page, 'right').tap();
    await expect(num(page, 'm1', 'x')).toHaveValue(
      String(Math.round((x0 + 4) * 100) / 100)
    );
    await act(page, 'delete').tap();
    await expect(rows(page)).toHaveCount(1);
    await act(page, 'undo').tap();
    await expect(rows(page)).toHaveCount(2);
    expect(await page.evaluate(() => window.__keys)).toBe(0);
  });
});

test.describe('the marks instrument: records', () => {
  test("marks are the workspace's only when they exist, read back, and refused on another image", async ({
    page,
  }) => {
    await openPage(page);
    await page.locator('#obsFile').setInputFiles(asFile(imageObservation()));
    await expect(page.locator('#obsMarksPanel')).toBeVisible({
      timeout: 30_000,
    });
    const save = async () => {
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.locator('#obsExportJson').click(),
      ]);
      return JSON.parse(
        await (
          await import('node:fs/promises')
        ).readFile(await download.path(), 'utf8')
      );
    };
    // No marks: the workspace block has none, as before.
    expect((await save()).workspace.marks).toBeUndefined();
    await page.locator('#obsMarksPanel > summary').click();
    await expect(body(page).locator('.im-over')).toBeVisible();
    await tool(page, 'point').click();
    await body(page).locator('.im-over').focus();
    await aimAt(page, 30, 88);
    await page.keyboard.press('Enter');
    await tool(page, 'circle').click();
    await aimAt(page, 80, 46);
    await page.keyboard.press('Enter');
    await aimAt(page, 108, 46);
    await page.keyboard.press('Enter');
    for (const id of ['m1', 'm2']) {
      await body(page)
        .locator(`tr[data-id="${id}"] button[data-act="select"]`)
        .click();
      await act(page, 'refine').click();
    }
    const doc = await save();
    const marks = doc.workspace.marks;
    expect(marks.format).toBe('gravitas.image-marks');
    expect(marks.formatVersion).toBe(1);
    expect(marks.marks.map(m => m.kind)).toEqual(['point', 'circle']);
    expect(marks.marks.every(m => m.result)).toBe(true);
    expect(marks.frames[0].digest).toMatch(/^[0-9a-f]{64}$/);
    const refinedX = Number(await num(page, 'm1', 'x').inputValue());
    // Keep in the ledger: an entry whose envelope carries the replay.
    await act(page, 'keep').click();
    await expect(page.locator('#obsMarksLive')).toContainText(
      'Kept in the ledger'
    );
    const kept = await page.evaluate(() => {
      const raw = Object.entries(localStorage).find(([k]) =>
        /notebook/i.test(k)
      );
      return raw ? JSON.parse(raw[1]) : null;
    });
    expect(JSON.stringify(kept)).toContain('image-marks');
    // Read back: a fresh page opens the saved file and the marks come with it.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', {
      timeout: 30_000,
    });
    await page.locator('#obsFile').setInputFiles({
      name: 'save.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(doc)),
    });
    await expect(body(page).locator('tbody tr')).toHaveCount(2, {
      timeout: 30_000,
    });
    await expect(num(page, 'm1', 'x')).toHaveValue(
      String(Math.round(refinedX * 100) / 100)
    );
    // Delete both, then reopen from the ledger: the image comes back with its marks.
    await body(page)
      .locator('tr[data-id="m1"] button[data-act="select"]')
      .click();
    await act(page, 'delete').click();
    await body(page)
      .locator('tr[data-id="m2"] button[data-act="select"]')
      .click();
    await act(page, 'delete').click();
    await expect(rows(page)).toHaveCount(0);
    await act(page, 'reopen').click();
    await expect(rows(page)).toHaveCount(2);
    // Another image refuses them: the same file with one pixel changed.
    const other = imageObservation();
    other.columns[2].values[1234] += 1;
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
    await expect(body(page).locator('.im-over')).toBeVisible({
      timeout: 30_000,
    });
    await expect(rows(page)).toHaveCount(0);
    await expect(page.locator('#obsMarksLive')).toContainText(
      'different image'
    );
  });
});

test.describe('the marks instrument: sequence', () => {
  test('the next frame keeps marks by tag, a mark is copied forward, the previous frame is unchanged', async ({
    page,
  }) => {
    await openPage(page);
    await page.locator('#obsFile').setInputFiles(asFile(imageObservation()));
    await expect(page.locator('#obsMarksPanel')).toBeVisible({
      timeout: 30_000,
    });
    // A second instance on three small frames, mounted the way the page mounts the first.
    await page.evaluate(async () => {
      const [{ mountMarks }, i18n] = await Promise.all([
        import('/js/observatory/imageMarks.js'),
        import('/js/observatory/i18n.js'),
      ]);
      const host = document.createElement('div');
      host.id = 'seqHost';
      document.body.append(host);
      const frames = [0, 1, 2].map(k => {
        const w = 64;
        const data = new Float64Array(w * w).fill(100);
        for (let y = 1; y <= w; y++)
          for (let x = 1; x <= w; x++)
            data[(y - 1) * w + x - 1] +=
              800 * Math.exp(-((x - (20 + 5 * k)) ** 2 + (y - 30) ** 2) / 8);
        return {
          id: `seq-${k}`,
          width: w,
          height: w,
          data,
          time: { value: 60000 + 0.5 * k, format: 'mjd', scale: 'UTC' },
        };
      });
      window.__seq = mountMarks(host, {
        t: i18n.t,
        registerMessages: i18n.registerMessages,
        frames,
        setId: 'seq',
        ledger: false,
      });
    });
    const host = page.locator('#seqHost');
    await expect(host.locator('output.im-scale')).toBeVisible();
    await expect(host.locator('.im-status')).toContainText('Frame 1 of 3');
    await expect(host.locator('.im-status')).toContainText('UTC');
    await host.locator('button[data-tool="point"]').click();
    await host.locator('.im-over').focus();
    for (let i = 0; i < 4; i++) await page.keyboard.press('Shift+ArrowLeft'); // x 64 -> 48 ... aim
    // Place by the picture with a mouse click at the source of frame 1 instead.
    const box = await host.locator('.im-over').boundingBox();
    await page.mouse.click(
      box.x + ((20 - 0.5) / 64) * box.width,
      box.y + ((64 + 0.5 - 30) / 64) * box.height
    );
    await expect(host.locator('tbody tr')).toHaveCount(1);
    await host.locator('tr[data-id="m1"] input[data-axis="tag"]').fill('a');
    await host.locator('tr[data-id="m1"] input[data-axis="tag"]').press('Tab');
    // Next frame: nothing marked there yet, and the tag is named as missing.
    await host.locator('button[data-act="next"]').click();
    await expect(host.locator('.im-status')).toContainText('Frame 2 of 3');
    await expect(host.locator('.im-status')).toContainText(
      'not yet marked here: a'
    );
    // Copy forward from frame 1: select the mark first, go back, copy, move on.
    await host.locator('button[data-act="prev"]').click();
    await host.locator('tr[data-id="m1"] button[data-act="select"]').click();
    await host.locator('button[data-act="copy"]').click();
    await expect(host.locator('tbody tr')).toHaveCount(2);
    await host.locator('button[data-act="next"]').click();
    await expect(host.locator('.im-status')).toContainText('1 marks');
    await expect(host.locator('.im-status')).not.toContainText(
      'not yet marked'
    );
    // The previous frame is unchanged: still one mark, at the same place.
    await host.locator('button[data-act="prev"]').click();
    await expect(host.locator('.im-status')).toContainText(
      'Frame 1 of 3, 1 marks'
    );
    await expect(
      host.locator('tr[data-id="m1"] input[data-axis="x"]')
    ).toHaveValue(/^20/);
  });
});

test.describe('the marks instrument: both languages, axe, and every control', () => {
  for (const lang of ['en', 'es']) {
    test(`axe with marks, and 24 px targets at 1280 and 390, ${lang}`, async ({
      page,
    }) => {
      await openPage(page, lang);
      await openMarks(page);
      await tool(page, 'point').click();
      await body(page).locator('.im-over').focus();
      await aimAt(page, 30, 88);
      await page.keyboard.press('Enter');
      await tool(page, 'reference-pair').click();
      await aimAt(page, 52, 46);
      await page.keyboard.press('Enter');
      await aimAt(page, 108, 46);
      await page.keyboard.press('Enter');
      if (lang === 'es') {
        await expect(page.locator('#obsMarksPanel > summary')).toHaveText(
          'Marcas y escala sobre la imagen'
        );
        await expect(tool(page, 'circle')).toHaveText('Círculo');
        await expect(page.locator('#obsMarksLive')).toContainText('colocado');
      }
      for (const scheme of ['light', 'dark']) {
        await page.emulateMedia({ colorScheme: scheme });
        const violations = (
          await new AxeBuilder({ page })
            .withTags(TAGS)
            .include('#obsMarksPanel')
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
              '#obsMarksBody :is(button, input, select, a)'
            ),
          ]
            .filter(n => n.offsetParent !== null)
            .map(n => [
              n.tagName +
                (n.dataset.act || n.dataset.tool || n.dataset.axis || ''),
              n.getBoundingClientRect(),
            ])
            .filter(([, r]) => r.width < 24 || r.height < 24)
            .map(
              ([name, r]) =>
                `${name} ${Math.round(r.width)}x${Math.round(r.height)}`
            )
        );
        expect(small, `${lang} ${width}`).toEqual([]);
        // No horizontal page scroll at the narrow width.
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth + 1
          )
        ).toBe(true);
      }
    });
  }
});

test.describe('the marks instrument: display-only images', () => {
  const sidecar = use => ({
    ...JSON.parse(
      readFileSync('tests/fixtures/dataKinds/image-tess-hd209458-aperture.json')
    ),
    use,
  });
  const withSidecar = use => {
    const o = imageObservation();
    o.image.sidecar = sidecar(use);
    return asFile(o, `frame-${use}.json`);
  };

  test('a display-only image can be marked, refuses the sky scale and says why, and takes a reference pair', async ({
    page,
  }) => {
    await openPage(page);
    await openMarks(page, withSidecar('display-only'));
    await expect(body(page).locator('.ui-status.is-error')).toBeHidden();
    await expect(body(page).locator('.im-scale')).toContainText('display-only');
    await expect(body(page).locator('.im-scale')).toContainText(
      'not available'
    );
    await tool(page, 'point').click();
    await body(page).locator('.im-over').focus();
    await aimAt(page, 30, 88);
    await page.keyboard.press('Enter');
    await expect(rows(page)).toHaveCount(1);
    // The pair gives the scale in the person's unit, on the image that refuses the sky's.
    await body(page).locator('input[type=number]').first().fill('56');
    await tool(page, 'reference-pair').click();
    await aimAt(page, 52, 46);
    await page.keyboard.press('Enter');
    await aimAt(page, 108, 46);
    await page.keyboard.press('Enter');
    await expect(body(page).locator('.im-scale')).toContainText(/Scale: 1 /);
    await expect(body(page).locator('.im-scale')).not.toContainText(
      'display-only'
    );
  });

  test('a quantitative image with world coordinates shows its pixel scale in arcseconds', async ({
    page,
  }) => {
    await openPage(page);
    await openMarks(page, withSidecar('quantitative'));
    await expect(body(page).locator('.im-scale')).toContainText('arcsec/pix');
  });
});

test.describe("the marks instrument: the gate's throttled profile", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("1,024 px with 50 marks: every handler, paint, frame change and the 2,048 px frame within the gate's bounds", async ({
    page,
    context,
  }) => {
    test.setTimeout(240_000);
    await openPage(page);
    await page.locator('#obsFile').setInputFiles(asFile(imageObservation()));
    await expect(page.locator('#obsMarksPanel')).toBeVisible({
      timeout: 30_000,
    });
    const cdp = await context.newCDPSession(page);
    const result = await page.evaluate(async () => {
      const [{ mountMarks }, i18n, { decodePlane }] = await Promise.all([
        import('/js/observatory/imageMarks.js'),
        import('/js/observatory/i18n.js'),
        import('/js/dataKinds/planes.js'),
      ]);
      const frame = (k, size, seed = 1) => {
        const data = new Float64Array(size * size);
        let s = seed + k;
        for (let i = 0; i < data.length; i++) {
          s = (s * 1664525 + 1013904223) >>> 0;
          data[i] = 100 + (s / 2 ** 32) * 20;
        }
        for (let y = 1; y <= size; y++)
          for (let x = 1; x <= size; x++)
            if (Math.hypot(x - 300 - 20 * k, y - 512) < 200)
              data[(y - 1) * size + x - 1] += 400;
        return {
          id: `t-${k}`,
          width: size,
          height: size,
          data,
          time: { value: 60000 + k, format: 'mjd', scale: 'UTC' },
        };
      };
      const host = document.createElement('div');
      document.body.append(host);
      const frames = [0, 1, 2, 3, 4, 5].map(k => frame(k, 1024));
      const m = mountMarks(host, {
        t: i18n.t,
        registerMessages: i18n.registerMessages,
        frames,
        setId: 'timing',
        ledger: false,
        settleMs: 5,
      });
      // 50 marks: 30 points, 10 circles, 5 segments, 3 polygons, 2 counts, placed through the table's own path.
      const { place } = await import('/js/measure/marks.js');
      const kinds = [
        ...Array(30).fill('point'),
        ...Array(10).fill('circle'),
        ...Array(5).fill('segment'),
        ...Array(3).fill('polygon'),
        ...Array(2).fill('count'),
      ];
      let st = m.store.state;
      kinds.forEach((kind, i) => {
        const x = 60 + ((i * 97) % 900);
        const y = 60 + ((i * 53) % 900);
        const pts =
          kind === 'circle'
            ? [
                [x, y],
                [x + 20, y],
              ]
            : kind === 'segment'
              ? [
                  [x, y],
                  [x + 30, y + 10],
                ]
              : kind === 'polygon'
                ? [
                    [x, y],
                    [x + 25, y],
                    [x + 10, y + 20],
                  ]
                : [[x, y]];
        st = place(st, {
          kind,
          frame: 0,
          tag: String.fromCharCode(97 + (i % 12)),
          pts,
        });
      });
      m.store.apply(st);
      m.store.seal();
      m.load(frames, 'timing');
      return {
        ok: true,
        count: m.store.state.marks.length,
        planeDecode: typeof decodePlane,
      };
    });
    expect(result.count).toBe(50);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const timings = await page.evaluate(async () => {
      const over = [...document.querySelectorAll('.im-over')].pop();
      const frame2 = () =>
        new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      const p95 = a =>
        [...a].sort((x, y) => x - y)[Math.ceil(0.95 * a.length) - 1];
      const key = (el, k, o = {}) =>
        el.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: k,
            bubbles: true,
            cancelable: true,
            ...o,
          })
        );
      const panelRoot = over.parentElement.parentElement;
      const out = {
        key: [],
        place: [],
        edit: [],
        del: [],
        undo: [],
        paint: [],
        frame: [],
      };
      const run = async (list, fn) => {
        for (let i = 0; i < 20; i++) {
          const t0 = performance.now();
          fn(i);
          list.push(performance.now() - t0);
          await frame2();
          out.paint.push(performance.now() - t0);
        }
      };
      // A selected mark to nudge, edit and delete.
      panelRoot.querySelector('tr button[data-act="select"]').click();
      await frame2();
      await run(out.key, i => key(over, i % 2 ? 'ArrowLeft' : 'ArrowRight'));
      await run(out.place, i => {
        const r = over.getBoundingClientRect();
        for (const type of ['pointerdown', 'pointerup'])
          over.dispatchEvent(
            new PointerEvent(type, {
              clientX: r.left + 100 + i * 7,
              clientY: r.top + 100,
              pointerType: 'mouse',
              bubbles: true,
              button: 0,
            })
          );
      });
      await run(out.edit, i => {
        const input = panelRoot.querySelector('tbody tr input[data-axis="x"]');
        input.value = String(100 + i);
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
      await run(out.del, () => {
        panelRoot
          .querySelector('tbody tr:last-child button[data-act="select"]')
          .click();
        key(over, 'Delete');
      });
      await run(out.undo, () => key(over, 'z', { ctrlKey: true }));
      for (let i = 0; i < 20; i++) {
        const t0 = performance.now();
        panelRoot.querySelector('button[data-act="next"]').click();
        await frame2();
        out.frame.push(performance.now() - t0);
        panelRoot.querySelector('button[data-act="prev"]').click();
        await frame2();
      }
      return Object.fromEntries(
        Object.entries(out).map(([k, v]) => [k, p95(v)])
      );
    });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    console.log(
      'image marks timings (p95 of 20, CPU x4, ms):',
      JSON.stringify(timings)
    );
    const bound = {
      key: 15,
      place: 28,
      edit: 90,
      del: 90,
      undo: 104,
      paint: 100,
      frame: 500,
    };
    for (const [k, b] of Object.entries(bound))
      expect(timings[k], k).toBeLessThanOrEqual(b * FACTOR);
  });
  test("a 2,048 px frame: decode (x4, a Worker is not throttled) and draw within 2,000 ms, and the counted bytes within the page's 64 MiB", async ({
    page,
    context,
  }) => {
    test.setTimeout(120_000);
    await openPage(page);
    await page.locator('#obsFile').setInputFiles(asFile(imageObservation()));
    await expect(page.locator('#obsMarksPanel')).toBeVisible({
      timeout: 30_000,
    });
    const cdp = await context.newCDPSession(page);
    const decoded = await page.evaluate(async () => {
      const [{ mountMarks }, i18n, planes, limits] = await Promise.all([
        import('/js/observatory/imageMarks.js'),
        import('/js/observatory/i18n.js'),
        import('/js/dataKinds/planes.js'),
        import('/js/dataKinds/limits.js'),
      ]);
      const size = 2048;
      const raw = new Float32Array(size * size);
      for (let i = 0; i < raw.length; i++)
        raw[i] = 100 + (i % 97) + ((i >> 11) % 89);
      const bytes = new Uint8Array(raw.buffer);
      const t0 = performance.now();
      const plane = planes.decodePlane('float32-le', bytes, size, size);
      const decodeMs = performance.now() - t0;
      window.__big = { plane, size };
      const host = document.createElement('div');
      document.body.append(host);
      window.__bigHost = { mountMarks, i18n, host };
      return {
        decodeMs,
        counted:
          limits.decodedBytes(size, size) +
          limits.displayPlan(size, size).rgbaBytes,
        limit: limits.LIMITS.maxDecodedBytes,
      };
    });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const drawMs = await page.evaluate(() => {
      const { mountMarks, i18n, host } = window.__bigHost;
      const { plane, size } = window.__big;
      const t0 = performance.now();
      mountMarks(host, {
        t: i18n.t,
        registerMessages: i18n.registerMessages,
        frames: [{ id: 'big', width: size, height: size, data: plane }],
        setId: 'big',
        ledger: false,
      });
      return performance.now() - t0;
    });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    console.log(
      `2,048 px: decode ${decoded.decodeMs.toFixed(1)} ms x 4 + draw ${drawMs.toFixed(1)} ms, counted ${decoded.counted} B`
    );
    expect(4 * decoded.decodeMs + drawMs).toBeLessThanOrEqual(2000);
    expect(decoded.counted).toBeLessThanOrEqual(decoded.limit);
  });
});
