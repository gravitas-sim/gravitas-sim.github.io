// =============================================================================
// The mobile sweep (Prompt 283)
// -----------------------------------------------------------------------------
// Prompt 155 defined how a finger operates an instrument (DESIGN_SYSTEM.md,
// "Touch measurement"): place then nudge, the loupe, handles at the target
// size, the spacing and inline exceptions. This spec holds the whole to that
// at the two touch sizes the platform model names: a phone (375 x 812) and a
// tablet (768 x 1024), with touch emulation and a coarse pointer, in Chromium.
//
//   1. Targets   every interactive target on every page of the walk
//                inventory, on its states and on the surfaces a student
//                reaches (the lesson panel, the Observatory with an image
//                open, the 3-D lab, the mission lab): 24 px, or the spacing
//                or inline exception, or a browser-drawn control; e2e/
//                touchTargets.js names the rules. Nothing under 24 px
//                that is none of those passes.
//   2. Layout    one column at phone width on the four surfaces, nothing
//                scrolling sideways.
//   3. Touch     the image marks panel by finger: the precision trials
//                (IMAGE_MEASUREMENT_GATE.md's T2 bounds, on the production
//                panel), the loupe while a finger is down, on every image
//                task; apertures by handles; the plot cursor by touch.
//   4. Workflows the ten student workflows and five instrument workflows
//                (tools/mobile-workflows.json) walked by touch in both
//                languages.
//
// Emulation covers the viewport, the touch events, the coarse pointer and the
// phone user agent. It does not cover a real fingertip's contact area, a
// device's pixel density in the hand, the on-screen keyboard's effect on the
// viewport, or a mobile browser's own chrome: OFFLINE_AND_LOW_END.md says so,
// and no real device was measured (UNKNOWN in tools/evidence-status.json).
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import { mulberry32 } from '../js/rng.js';
import { test, expect } from './fixtures.js';
import { open } from './sweepOpen.js';
import { measureTargets } from './touchTargets.js';
import { frameObservation, asFile, SIZE, STARS, DISC } from './mobileFrames.js';

const contract = JSON.parse(
  readFileSync('tools/interaction-contract.json', 'utf8')
);
const inventory = contract.inventory;
const RECORD = 'tools/touch-targets.json';
const WRITE = process.env.GRAVITAS_TARGETS_WRITE === '1';

export const SIZES = [
  { id: 'phone', width: 375, height: 812 },
  { id: 'tablet', width: 768, height: 1024 },
];

/** Open a state's controls by finger, behind the phone's menu where the rail is. */
async function openState(page, controls) {
  for (const sel of controls) {
    const target = page.locator(sel).first();
    if (!(await target.isVisible())) {
      const menu = page.locator('#mobileMenuToggle');
      if (await menu.isVisible()) await menu.tap();
    }
    await target.tap();
  }
}

/** A frame of settled layout: the transport bar and the sheets stand on a measurement. */
const settle = page =>
  page.evaluate(
    () =>
      new Promise(r =>
        window.requestAnimationFrame(() => window.requestAnimationFrame(r))
      )
  );

/** What a write run collects: one worker, so one process holds it all. */
const written = {};

for (const size of SIZES) {
  test.describe(`targets at ${size.id} width (${size.width} px, touch)`, () => {
    test.use({
      viewport: { width: size.width, height: size.height },
      hasTouch: true,
      isMobile: true,
    });
    test.setTimeout(120_000);

    const rows = inventory.rows.filter(r => r.surface !== 'history-original');
    for (const row of rows) {
      test(`${row.surface} (${row.path})`, async ({ page }) => {
        await open(page, row.path, 'en');
        await settle(page);
        const m = await page.evaluate(measureTargets);
        written[`${size.id}:${row.surface}`] = m;
        expect(m.fail, 'targets under 24 px that no exception covers').toEqual(
          []
        );
      });
    }

    for (const state of inventory.states) {
      test(`${state.id} (state)`, async ({ page }) => {
        // What the state first saves, by finger, in the Library.
        for (const id of state.saved || []) {
          await open(page, `/library/?item=${encodeURIComponent(id)}`, 'en');
          await page.locator('[data-save]').tap();
          await expect(page.locator('[data-save]')).toHaveAttribute(
            'aria-pressed',
            'true'
          );
        }
        await open(page, state.path, 'en', state);
        await openState(page, state.open || []);
        await settle(page);
        const m = await page.evaluate(measureTargets);
        written[`${size.id}:${state.id}`] = m;
        expect(m.fail, 'targets under 24 px that no exception covers').toEqual(
          []
        );
      });
    }
  });
}

// -----------------------------------------------------------------------------
// 1b. The surfaces a student reaches, and their layout
// -----------------------------------------------------------------------------

/** Nothing scrolls sideways. */
const noSidewaysScroll = page =>
  page.evaluate(
    () =>
      Math.max(
        document.documentElement.scrollWidth,
        document.body.scrollWidth
      ) - window.innerWidth
  );

/**
 * One column: no two visible children of the region sit side by side. Runs in
 * the page. A pair is side by side if their boxes share a row (more than 4 px
 * of vertical overlap) and neither contains the other.
 */
function sideBySide(selector) {
  const root = document.querySelector(selector);
  if (!root) return ['missing'];
  const kids = [...root.children].filter(k => {
    const r = k.getBoundingClientRect();
    return (
      r.width > 1 && r.height > 1 && getComputedStyle(k).position !== 'fixed'
    );
  });
  const out = [];
  for (let i = 0; i < kids.length; i++)
    for (let j = i + 1; j < kids.length; j++) {
      const a = kids[i].getBoundingClientRect();
      const b = kids[j].getBoundingClientRect();
      const rows = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      const cols = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      if (rows > 4 && cols < 1)
        out.push(
          `${kids[i].id || kids[i].className} | ${kids[j].id || kids[j].className}`
        );
    }
  return out;
}

/** Open disclosures of the "More" pattern (Prompt 167). Runs in the page. */
const openMore = () =>
  [...document.querySelectorAll('details.more[open]')].map(
    d => d.id || d.className
  );

const SURFACES = [
  {
    id: 'lesson-panel-read',
    column: '#investigationPanel',
    async open({ page, app }) {
      await app.boot({ url: '/?author=tides&step=1' });
      await expect(page.locator('#investigationPanel')).toBeVisible({
        timeout: 25_000,
      });
    },
  },
  {
    id: 'lesson-panel-measure',
    column: '#investigationPanel',
    async open({ page, app }) {
      await app.boot({ url: '/?author=tides&step=10' });
      await expect(page.locator('#investigationNext')).toBeVisible({
        timeout: 25_000,
      });
    },
  },
  {
    id: 'observatory-image-open',
    column: '#obsMarksBody',
    async open({ page }) {
      await open(page, '/observatory/', 'en');
      await page.locator('#obsFile').setInputFiles(asFile(frameObservation()));
      await expect(page.locator('#obsMarksPanel')).toBeVisible({
        timeout: 30_000,
      });
      await page.locator('#obsMarksPanel > summary').tap();
      await expect(page.locator('#obsMarksBody .im-over')).toBeVisible({
        timeout: 30_000,
      });
    },
  },
  {
    id: 'lab3d-running',
    column: '.l3-top',
    async open({ page }) {
      await open(page, '/3d/', 'en');
      await page.locator('#l3-play').tap();
    },
  },
  {
    id: 'mission-lab-computed',
    column: '.ml-wrap',
    async open({ page }) {
      await open(page, '/mission/lab/', 'en');
      await page.locator('#ml-go').tap();
    },
  },
  {
    id: 'settings-dialog',
    async open({ page, app }) {
      await app.boot();
      await openState(page, ['#settingsBtn']);
    },
  },
];

for (const size of SIZES) {
  test.describe(`surfaces at ${size.id} width`, () => {
    test.use({
      viewport: { width: size.width, height: size.height },
      hasTouch: true,
      isMobile: true,
    });
    test.setTimeout(120_000);

    for (const surface of SURFACES) {
      test(`${surface.id}: targets, one column on a phone, nothing sideways`, async ({
        page,
        app,
      }) => {
        await surface.open({ page, app });
        await settle(page);
        const m = await page.evaluate(measureTargets);
        written[`${size.id}:${surface.id}`] = m;
        expect(m.measured, 'something was measured').toBeGreaterThan(5);
        expect(m.fail, 'targets under 24 px that no exception covers').toEqual(
          []
        );
        expect(await noSidewaysScroll(page)).toBeLessThanOrEqual(2);
        if (size.id === 'phone')
          expect(
            await page.evaluate(openMore),
            'a "More" disclosure (Prompt 167) is closed until opened'
          ).toEqual([]);
        if (size.id === 'phone' && surface.column) {
          expect(
            await page.evaluate(sideBySide, surface.column),
            `${surface.column} is one column at ${size.width} px`
          ).toEqual([]);
        }
      });
    }
  });
}

// -----------------------------------------------------------------------------
// 2. Touch measurement: the pattern of DESIGN_SYSTEM.md, on the production panels
// -----------------------------------------------------------------------------

const PHONE = { width: 375, height: 812 };
const fingerJitter = mulberry32(283);

/** Import the seeded frame and open one of the Observatory's image panels. */
async function openPanel(page, panel) {
  await open(page, '/observatory/', 'en');
  await page.locator('#obsFile').setInputFiles(asFile(frameObservation()));
  await expect(page.locator(`#${panel}Panel`)).toBeVisible({ timeout: 30_000 });
  await page.locator(`#${panel}Panel > summary`).tap();
}

/** A finger down and not yet lifted, which Playwright's tap does not hold. */
async function fingerDown(page, x, y) {
  const cdp = await page.context().newCDPSession(page);
  const send = (type, points) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
  await send('touchStart', [{ x, y }]);
  return {
    move: (nx, ny) => send('touchMove', [{ x: nx, y: ny }]),
    up: () => send('touchEnd', []),
  };
}

test.describe('the image marks panel by finger', () => {
  test.use({
    viewport: PHONE,
    hasTouch: true,
    isMobile: true,
  });
  test.setTimeout(240_000);

  const body = page => page.locator('#obsMarksBody');
  const act = (page, name) => body(page).locator(`button[data-act="${name}"]`);
  const live = page => page.locator('#obsMarksLive');

  /** Where on the screen the frame's pixel (x, y) is. */
  async function screenOf(page, x, y) {
    const over = body(page).locator('.im-over');
    await over.scrollIntoViewIfNeeded();
    const box = await over.boundingBox();
    return {
      x: box.x + ((x - 0.5) / SIZE) * box.width,
      y: box.y + ((SIZE + 0.5 - y) / SIZE) * box.height,
    };
  }

  /** The draft the last announcement names. */
  const draftOf = async page => {
    const text = await live(page).textContent();
    const m = /Marker at x ([\d.]+), y ([\d.]+)/.exec(text ?? '');
    return m ? { x: Number(m[1]), y: Number(m[2]) } : null;
  };

  const pads = { n: 0 };

  /** Tap at the truth, then move the draft with the pad until it is within 1 px. */
  async function placeByFinger(page, truth) {
    const at = await screenOf(page, truth.x, truth.y);
    // A fingertip is not a point: the tap lands up to 8 CSS px (about 6 image
    // px here) from where it was aimed, at a seeded offset, and the pad
    // brings the draft the rest of the way.
    const miss = () => Math.round((fingerJitter() - 0.5) * 16);
    await page.touchscreen.tap(at.x + miss(), at.y + miss());
    await expect.poll(() => draftOf(page)).not.toBeNull();
    let draft = await draftOf(page);
    let pressed = 0;
    for (; pressed < 40; pressed++) {
      const dx = truth.x - draft.x;
      const dy = truth.y - draft.y;
      if (Math.hypot(dx, dy) <= 1) break;
      const coarse = Math.max(Math.abs(dx), Math.abs(dy)) >= 4;
      await body(page)
        .locator('label', { hasText: 'Step' })
        .locator('select')
        .selectOption(coarse ? 'coarse' : 'normal');
      const axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
      const d = axis === 'x' ? dx : dy;
      const name =
        axis === 'x' ? (d > 0 ? 'right' : 'left') : d > 0 ? 'up' : 'down';
      const step = coarse ? 4 : 1;
      await act(page, name).tap();
      draft = {
        x: draft.x + (axis === 'x' ? Math.sign(d) * step : 0),
        y: draft.y + (axis === 'y' ? Math.sign(d) * step : 0),
      };
    }
    pads.n += pressed;
    return { draft, pressed };
  }

  const cell = (page, id, axis) =>
    body(page).locator(`tr[data-id="${id}"] input[data-axis="${axis}"]`);

  test("the precision trials of Prompt 178's T2, by touch on the production panel: a tap, the pad, Place, Refine", async ({
    page,
  }) => {
    await openPanel(page, 'obsMarks');
    await body(page).locator('button[data-tool="point"]').tap();
    const trials = [];
    for (const [n, star] of STARS.entries()) {
      const { draft } = await placeByFinger(page, star);
      await act(page, 'place').tap();
      const id = `m${n + 1}`;
      await expect(body(page).locator(`tr[data-id="${id}"]`)).toHaveCount(1);
      const placed = {
        x: Number(await cell(page, id, 'x').inputValue()),
        y: Number(await cell(page, id, 'y').inputValue()),
      };
      await body(page)
        .locator(`tr[data-id="${id}"] button[data-act="select"]`)
        .tap();
      await act(page, 'refine').tap();
      // Refinement moves the mark: wait for it to settle on a value.
      await expect
        .poll(async () => Number(await cell(page, id, 'x').inputValue()), {
          timeout: 20_000,
        })
        .not.toBe(placed.x);
      const refined = {
        x: Number(await cell(page, id, 'x').inputValue()),
        y: Number(await cell(page, id, 'y').inputValue()),
      };
      trials.push({
        hand: Math.hypot(placed.x - star.x, placed.y - star.y),
        refined: Math.hypot(refined.x - star.x, refined.y - star.y),
        draft,
      });
    }
    expect(pads.n, 'the pad did some of the work').toBeGreaterThan(0);
    const worstHand = Math.max(...trials.map(t => t.hand));
    const worstRefined = Math.max(...trials.map(t => t.refined));
    test.info().annotations.push({
      type: 'precision',
      description: `8 points by touch, ${pads.n} pad presses: hand placement worst ${worstHand.toFixed(3)} px, refined worst ${worstRefined.toFixed(3)} px`,
    });
    // The gate's bounds: the hand within 1.0 px, every refined source within 0.5 px.
    expect(
      worstHand,
      'a finger, then the pad, places within 1 px'
    ).toBeLessThanOrEqual(1.05);
    expect(
      worstRefined,
      'every refined source within 0.5 px'
    ).toBeLessThanOrEqual(0.5);
  });

  test('the loupe: a circle of the pixels above the finger while it is down, gone when it lifts', async ({
    page,
  }) => {
    await openPanel(page, 'obsMarks');
    const loupe = body(page).locator('.im-loupe');
    await expect(loupe).toBeHidden();
    const at = await screenOf(page, STARS[3].x, STARS[3].y);
    const finger = await fingerDown(page, Math.round(at.x), Math.round(at.y));
    await expect(loupe).toBeVisible();
    const box = await loupe.boundingBox();
    // 96 px across, drawn above the contact (below it near the top edge).
    expect(Math.round(box.width)).toBeGreaterThanOrEqual(96);
    expect(Math.round(box.width)).toBeLessThanOrEqual(100); // with its border
    const stage = await body(page).locator('.im-over').boundingBox();
    const above = at.y - stage.y >= 168;
    if (above) expect(box.y + box.height).toBeLessThanOrEqual(at.y - 60);
    else expect(box.y).toBeGreaterThanOrEqual(at.y + 60);
    await finger.up();
    await expect(loupe).toBeHidden();
    await expect.poll(() => draftOf(page)).not.toBeNull();
  });

  test('a circle by touch: centre, limb, Place each, Refine: the radius within 2 percent', async ({
    page,
  }) => {
    await openPanel(page, 'obsMarks');
    await body(page).locator('button[data-tool="circle"]').tap();
    for (const p of [DISC, { x: DISC.x + DISC.r, y: DISC.y }]) {
      await placeByFinger(page, p);
      await act(page, 'place').tap();
    }
    await expect(body(page).locator('tr[data-id="m1"]')).toHaveCount(1);
    await body(page)
      .locator('tr[data-id="m1"] button[data-act="select"]')
      .tap();
    await act(page, 'refine').tap();
    await expect(live(page)).toContainText(/refined|Refined/i, {
      timeout: 20_000,
    });
    const size = await body(page)
      .locator('tr[data-id="m1"] td')
      .nth(5)
      .textContent();
    const radius = Number.parseFloat(size);
    test.info().annotations.push({
      type: 'precision',
      description: `disc radius by touch: ${radius} px of ${DISC.r}`,
    });
    expect(Math.abs(radius - DISC.r) / DISC.r).toBeLessThanOrEqual(0.02);
  });
});

test.describe('the other image tasks by finger', () => {
  test.use({ viewport: PHONE, hasTouch: true, isMobile: true });
  test.setTimeout(120_000);

  test('the photometry stamp: the loupe under a finger, a ring chosen by its handle (a 56 px target), the radius set by a tap', async ({
    page,
  }) => {
    await openPanel(page, 'obsPhoto');
    const pic = page.locator('#obsPhotoBody canvas.ph-pic');
    await expect(pic).toBeVisible({ timeout: 30_000 });
    await pic.scrollIntoViewIfNeeded();
    const where = await pic.evaluate(c => ({
      handles: JSON.parse(c.dataset.handles),
      width: c.width,
    }));
    const box = await pic.boundingBox();
    const scale = box.width / where.width;
    // Each handle is its own target: 56 CSS px across, so a tap anywhere
    // within 28 px chooses it. The handle for the outer ring first.
    const [hx, hy] = where.handles.outer;
    const tapAt = [box.x + hx * scale, box.y + hy * scale];
    // 24 px below the handle, with the inner ring's handle 32 px away: the
    // outer ring's, inside its 56 px target. Only a selection says "outer".
    const live = page.locator('#obsPhotoBody [role=status]');
    await page.touchscreen.tap(Math.round(tapAt[0]), Math.round(tapAt[1] + 24));
    await expect(live).toContainText(/outer/i);
    // The loupe, while a finger is down on the stamp.
    const loupe = page.locator('#obsPhotoBody .im-loupe');
    const finger = await fingerDown(
      page,
      Math.round(tapAt[0]),
      Math.round(tapAt[1])
    );
    await expect(loupe).toBeVisible();
    await finger.up();
    await expect(loupe).toBeHidden();
    // The chosen ring's radius is then set by a tap beyond the handle.
    const before = await pic.getAttribute('data-handles');
    await page.touchscreen.tap(Math.round(tapAt[0] + 10), Math.round(tapAt[1]));
    await expect.poll(() => pic.getAttribute('data-handles')).not.toBe(before);
  });

  test('the pixel image: the loupe under a finger on the Observatory image', async ({
    page,
  }) => {
    await open(page, '/observatory/', 'en');
    await page.locator('#obsFile').setInputFiles(asFile(frameObservation()));
    const image = page.locator('#obsImage');
    await expect(image).toBeVisible({ timeout: 30_000 });
    await image.scrollIntoViewIfNeeded();
    const box = await image.boundingBox();
    const loupe = page.locator('.im-loupe').first();
    const finger = await fingerDown(
      page,
      Math.round(box.x + box.width / 2),
      Math.round(box.y + box.height / 2)
    );
    await expect(
      page.locator('#obsImage ~ .im-loupe, .im-loupe:visible').first()
    ).toBeVisible();
    await finger.up();
    await expect(loupe).toBeHidden();
  });
});

test.describe('a plot cursor by touch', () => {
  test.use({ viewport: PHONE, hasTouch: true, isMobile: true });
  test.setTimeout(120_000);

  for (const locale of ['en', 'es']) {
    test(`a tap puts the readout on the nearest point, a drag scrubs it, the steps move it by one, and it stays, ${locale}`, async ({
      page,
    }) => {
      await open(page, '/', locale);
      await openState(page, ['#railTools', '#toggleLightCurve']);
      const svg = page.locator('#lightCurveChart svg[role=group]');
      await expect(svg).toBeVisible({ timeout: 30_000 });
      await svg.scrollIntoViewIfNeeded();
      const box = await svg.boundingBox();
      const status = page
        .locator('#lightCurveChart svg ~ [role=status]')
        .first();
      const steps = page.locator('#lightCurveChart button');
      await expect(steps).toHaveCount(0);
      await page.touchscreen.tap(
        box.x + box.width * 0.4,
        box.y + box.height / 2
      );
      await expect(steps).toHaveCount(2);
      await expect(steps.first()).toBeVisible();
      await expect.poll(() => status.textContent()).not.toBe('');
      const first = await status.textContent();
      // The readout stays on screen after the finger has lifted.
      const tip = page.locator('#lightCurveChart svg + div');
      await expect(tip).toBeVisible();
      // One point on, by a press, with no drag.
      await steps.last().tap();
      await expect.poll(() => status.textContent()).not.toBe(first);
      const second = await status.textContent();
      await steps.first().tap();
      await expect.poll(() => status.textContent()).toBe(first);
      expect(second).not.toBe(first);
      // The buttons are the words of the page's language, and finger-sized.
      const names = await steps.allTextContents();
      expect(names).toEqual(
        locale === 'es'
          ? ['Punto anterior', 'Punto siguiente']
          : ['Previous point', 'Next point']
      );
      for (const b of await steps.all()) {
        const r = await b.boundingBox();
        expect(r.height).toBeGreaterThanOrEqual(24);
        expect(r.width).toBeGreaterThanOrEqual(24);
      }
      // A finger dragged along the plot scrubs the cursor.
      await svg.scrollIntoViewIfNeeded();
      const now = await svg.boundingBox();
      const finger = await fingerDown(
        page,
        now.x + now.width * 0.3,
        now.y + now.height / 2
      );
      await finger.move(now.x + now.width * 0.7, now.y + now.height / 2);
      await finger.up();
      await expect.poll(() => status.textContent()).not.toBe(first);
    });
  }
});

test.afterAll(() => {
  if (!WRITE || !Object.keys(written).length) return;
  const rec = JSON.parse(readFileSync(RECORD, 'utf8'));
  rec.measured = {};
  for (const [k, v] of Object.entries(written).sort(([a], [b]) =>
    a.localeCompare(b)
  ))
    rec.measured[k] = {
      targets: v.measured,
      atSize: v.ok,
      spacing: v.spacing,
      inline: v.inline,
      control: v.control,
      under44: v.under44,
    };
  writeFileSync(RECORD, `${JSON.stringify(rec, null, 2)}\n`);
});
