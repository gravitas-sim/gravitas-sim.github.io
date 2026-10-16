// =============================================================================
// The four layouts, measured (Roadmap II Prompt 55)
// -----------------------------------------------------------------------------
// PLATFORM_MODEL.md lays Gravitas out at 375, 768, 1024 and 1440 px. This
// checks each surface it names at the width the project stands for: 375 in
// the phone project, 768 in the tablet, 1024 and 1440 in a desktop one. It
// asserts geometry, not pixels: named regions that must not overlap, controls
// that must be on screen without scrolling, the share of the window the
// canvas keeps, and the size of what a finger has to press.
//
//   the application   the shell, the transport bar, the footer, the Menu
//                     button, the help button, the readout and the scenario
//                     card do not overlap; the footer's links stay clear of
//                     the elapsed time; nothing scrolls sideways
//   a lesson          the step, its docked instrument and graph, and the
//                     tabs that choose between them do not overlap each other
//                     or the bars; Next and Back can be pressed where they
//                     are; the transport bar is not under a panel; at least a
//                     third of the window is canvas; below the desktop the
//                     two panels of a measuring step are tabs; on a phone the
//                     objects list starts folded
//   the Observatory   with an observation open the plot, the image and the
//                     table are stacked inside the window below the laptop,
//                     a selection made in the table is the plot's, and the
//                     transform controls wait behind a closed disclosure
//   the Library, Teach, the Studio
//                     nothing scrolls sideways; the Studio is read-only on a
//                     phone and says so
//
// On a touch screen every control in those regions is at least 44 by 44 CSS
// pixels, the canvas keeps a two-finger gesture for itself, and the viewport
// tag still lets a reader zoom the page.
//
// Related, not repeated here: e2e/viewportMatrix.spec.js reaches every control
// of the most crowded measuring screen at seven sizes; e2e/mobile.spec.js
// works the phone's menu and inspector.
// =============================================================================

import { test, expect } from './fixtures.js';

/** The widths each project stands for, with the height used at each. */
const SIZES = {
  'mobile-chrome': [[375, 812]],
  tablet: [[768, 1024]],
};
const DESKTOP_SIZES = [
  [1024, 768],
  [1440, 900],
];
const sizesFor = info => SIZES[info.project.name] ?? DESKTOP_SIZES;

/** The step with an instrument and a graph, and a step of prose. */
const MEASURE_STEP = '/?author=tides&step=10';
const READ_STEP = '/?author=tides&step=1';

const APP_REGIONS = {
  shell: '.gs-app',
  transport: '#timelineBar',
  footer: '#attribution',
  menu: '#mobileMenuToggle',
  help: '#tutorialBtn',
  readout: '#overlay',
  card: '#scenarioInfoBox',
};
const LESSON_REGIONS = {
  shell: '.gs-app',
  transport: '#timelineBar',
  footer: '#attribution',
  menu: '#mobileMenuToggle',
  help: '#tutorialBtn',
  lesson: '#investigationPanel',
  tool: '#investigationTool',
  plot: '#investigationPlot',
  tabs: '#investigationDockTabs',
};
/** What the canvas is measured against: the bars and the lesson's panels. */
const COVERING = ['shell', 'transport', 'lesson', 'tool', 'plot', 'tabs'];

/**
 * The on-screen box of each named region that is actually shown, in CSS
 * pixels. Shown means rendered, opaque and not `visibility: hidden`: the
 * panel behind the tabs is laid out but not shown, which is the point.
 */
function regions(page, named) {
  return page.evaluate(named => {
    const out = {};
    for (const [name, sel] of Object.entries(named)) {
      const el = document.querySelector(sel);
      if (
        !el?.checkVisibility({
          opacityProperty: true,
          visibilityProperty: true,
          checkOpacity: true,
          checkVisibilityCSS: true,
        })
      ) {
        continue;
      }
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      out[name] = {
        left: r.left,
        top: r.top,
        right: r.right,
        bottom: r.bottom,
      };
    }
    return out;
  }, named);
}

/** Pairs of regions that overlap by more than a pixel each way. */
function overlaps(boxes) {
  const names = Object.keys(boxes);
  const found = [];
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const a = boxes[names[i]];
      const b = boxes[names[j]];
      const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (x > 1 && y > 1) {
        found.push(
          `${names[i]} and ${names[j]} (${Math.round(x)}x${Math.round(y)})`
        );
      }
    }
  }
  return found;
}

/** The share of the window no covering region lies over, on an 8 px grid. */
function freeShare(boxes, width, height) {
  const cover = COVERING.map(n => boxes[n]).filter(Boolean);
  let free = 0;
  let all = 0;
  for (let x = 4; x < width; x += 8) {
    for (let y = 4; y < height; y += 8) {
      all++;
      if (
        !cover.some(
          b => x >= b.left && x < b.right && y >= b.top && y < b.bottom
        )
      ) {
        free++;
      }
    }
  }
  return free / all;
}

/** Nothing pushes the document sideways (a pixel of rounding allowed). */
async function expectNoSidewaysScroll(page) {
  const over = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth
  );
  expect(over, 'the page scrolls sideways').toBeLessThanOrEqual(1);
}

/**
 * The control can be pressed where it is, without scrolling anything: its box
 * is inside the window and the hit test at its centre lands on it. A click
 * would scroll a box a finger cannot (e2e/reach.js says why), so this does not
 * click.
 */
async function expectPressable(page, selector) {
  const at = await page.evaluate(sel => {
    const el = document.querySelector(sel);
    if (!el) return 'missing';
    const r = el.getBoundingClientRect();
    if (
      r.top < 0 ||
      r.left < 0 ||
      r.bottom > window.innerHeight ||
      r.right > window.innerWidth
    ) {
      return `outside the window: ${Math.round(r.top)}..${Math.round(r.bottom)}`;
    }
    const hit = document.elementFromPoint(
      r.left + r.width / 2,
      r.top + r.height / 2
    );
    return hit && el.contains(hit)
      ? 'ok'
      : `under ${hit?.id || hit?.className || hit?.tagName}`;
  }, selector);
  expect(at, `${selector} can be pressed where it is`).toBe('ok');
}

/**
 * On a touch screen, every shown control inside these regions that is on
 * screen is at least 44 by 44. A link inside a line of text is the
 * criterion's inline exception; a slider is measured by its height alone.
 */
async function expectFingerSized(page, roots, { required = [] } = {}) {
  if (
    !(await page.evaluate(() => window.matchMedia('(pointer: coarse)').matches))
  ) {
    return;
  }
  // A region that is still opening is measured at a scale and an opacity it
  // will not keep, and its controls are skipped as not yet shown: the check
  // then passes on nothing. So wait for it to settle, and for the controls
  // the caller names, scroll to them and insist they were measured.
  await page.waitForFunction(
    roots =>
      roots.every(r => {
        const el = document.querySelector(r);
        return (
          !el ||
          (el.checkVisibility({ opacityProperty: true }) &&
            // Only what will end: a pulse that repeats for ever never settles.
            el
              .getAnimations({ subtree: true })
              .every(
                a =>
                  a.playState !== 'running' ||
                  a.effect.getComputedTiming().endTime === Infinity
              ))
        );
      }),
    roots
  );
  for (const sel of required) {
    await page.locator(sel).first().scrollIntoViewIfNeeded();
  }
  const { small, measured } = await page.evaluate(roots => {
    const measured = [];
    const out = [];
    const controls = roots.flatMap(r => [
      ...document.querySelectorAll(
        `${r} :is(button, a[href], select, summary, input:not([type=hidden]):not([type=radio]):not([type=file]), label:has(> input[type=radio]))`
      ),
    ]);
    for (const el of new Set(controls)) {
      if (
        !el.checkVisibility({
          opacityProperty: true,
          visibilityProperty: true,
          checkOpacity: true,
          checkVisibilityCSS: true,
        })
      ) {
        continue;
      }
      const r = el.getBoundingClientRect();
      if (
        r.width < 1 ||
        r.bottom < 0 ||
        r.top > window.innerHeight ||
        r.right < 0 ||
        r.left > window.innerWidth
      ) {
        continue;
      }
      // Inside a scroller and scrolled out of it: not something to press now.
      const hit = document.elementFromPoint(
        r.left + r.width / 2,
        r.top + r.height / 2
      );
      if (!hit || !(el.contains(hit) || hit.contains(el))) continue;
      const style = getComputedStyle(el);
      if (el.matches('a') && style.display === 'inline') continue;
      if (el.id) measured.push(`#${el.id}`);
      const range = el.matches('input[type=range]');
      if (r.height < 43.5 || (!range && r.width < 43.5)) {
        out.push(
          `${el.id ? '#' + el.id : el.tagName.toLowerCase()} ${Math.round(r.width)}x${Math.round(r.height)}`
        );
      }
    }
    return { small: out, measured };
  }, roots);
  expect(small, 'controls smaller than a fingertip').toEqual([]);
  for (const sel of required) {
    expect(measured, `${sel} was measured, not skipped`).toContain(sel);
  }
}

/** Boot a lesson step at this size, with nothing in storage. */
async function openStep(page, app, url) {
  await app.boot({ url });
  await expect(page.locator('#investigationPanel')).toBeVisible({
    timeout: 25_000,
  });
  await expect(page.locator('#investigationNext')).toBeVisible();
  // The transport bar's height is measured and the sheets stand on it; give
  // the measurement the frame it takes.
  await page.evaluate(
    () =>
      new Promise(r =>
        window.requestAnimationFrame(() => window.requestAnimationFrame(r))
      )
  );
}

test.describe('the four layouts', () => {
  test('the application leaves every corner to one thing', async ({
    page,
    app,
  }, info) => {
    for (const [width, height] of sizesFor(info)) {
      await test.step(`${width}x${height}`, async () => {
        await page.setViewportSize({ width, height });
        await app.boot();
        // The scenario card fades in once the front door has gone.
        await expect(page.locator('#scenarioInfoBox')).toBeVisible();
        await expect
          .poll(async () => overlaps(await regions(page, APP_REGIONS)), {
            message: 'regions that overlap',
          })
          .toEqual([]);
        // The footer and the elapsed time: they overlapped at 1024 px.
        const time = await page.locator('#timelineTime').boundingBox();
        const footer = await regions(page, { footer: '#attribution' });
        if (footer.footer) {
          expect(
            overlaps({
              time: {
                left: time.x,
                top: time.y,
                right: time.x + time.width,
                bottom: time.y + time.height,
              },
              ...footer,
            }),
            'the footer over the elapsed time'
          ).toEqual([]);
        }
        await expectNoSidewaysScroll(page);
        await expectPressable(page, '#timelinePlay');
        await expectFingerSized(page, [
          '.gs-app',
          '#timelineBar',
          '#overlay',
          '#scenarioInfoBox',
        ]);
      });
    }
  });

  test('a measuring step: the step, the instrument, the graph and the canvas', async ({
    page,
    app,
  }, info) => {
    for (const [width, height] of sizesFor(info)) {
      await test.step(`${width}x${height}`, async () => {
        await page.setViewportSize({ width, height });
        await openStep(page, app, MEASURE_STEP);
        await expect(page.locator('#investigationToolCanvas')).toBeVisible();

        const tabbed = width <= 1200;
        const boxes = await regions(page, LESSON_REGIONS);
        expect(
          Boolean(boxes.tabs),
          'the tabs are there below the desktop only'
        ).toBe(tabbed);
        expect(Boolean(boxes.tool), 'the instrument is shown').toBe(true);
        expect(
          Boolean(boxes.plot),
          'the graph is shown beside it on a desktop only'
        ).toBe(!tabbed);
        expect(overlaps(boxes), 'regions that overlap').toEqual([]);
        expect(
          freeShare(boxes, width, height),
          'the share of the window left to the canvas'
        ).toBeGreaterThanOrEqual(1 / 3);
        await expectPressable(page, '#investigationNext');
        await expectPressable(page, '#investigationPrev');
        await expectPressable(page, '#timelinePlay');
        await expectNoSidewaysScroll(page);
        await expectFingerSized(page, [
          '#investigationPanel',
          '#investigationTool',
          '#investigationDockTabs',
          '#timelineBar',
        ]);

        // The phone folds the objects list the first time; elsewhere it opens.
        const objects = page.locator('#investigationObjectsDisclosure');
        await expect(objects).toHaveJSProperty('open', width >= 768);

        if (tabbed) {
          // The other tab brings the graph forward in the same place.
          await page.locator('label:has(#investigationDockPlot)').click();
          await expect(page.locator('#investigationDockPlot')).toBeChecked();
          const swapped = await regions(page, LESSON_REGIONS);
          expect(Boolean(swapped.plot), 'the graph is shown').toBe(true);
          expect(Boolean(swapped.tool), 'the instrument steps back').toBe(
            false
          );
          expect(overlaps(swapped), 'regions that overlap').toEqual([]);
          expect(freeShare(swapped, width, height)).toBeGreaterThanOrEqual(
            1 / 3
          );
          await expectPressable(page, '#investigationPlotLog');
          // And it is a radio group, so the keyboard moves between them.
          await page.locator('#investigationDockPlot').focus();
          await page.keyboard.press('ArrowLeft');
          await expect(page.locator('#investigationDockTool')).toBeChecked();
        }
      });
    }
  });

  test('a step of prose keeps Next on screen and the canvas in view', async ({
    page,
    app,
  }, info) => {
    for (const [width, height] of sizesFor(info)) {
      await test.step(`${width}x${height}`, async () => {
        await page.setViewportSize({ width, height });
        await openStep(page, app, READ_STEP);
        const boxes = await regions(page, LESSON_REGIONS);
        expect(overlaps(boxes), 'regions that overlap').toEqual([]);
        expect(freeShare(boxes, width, height)).toBeGreaterThanOrEqual(1 / 3);
        await expectPressable(page, '#investigationNext');
        await expectPressable(page, '#investigationClose');
        await expectNoSidewaysScroll(page);
      });
    }
  });

  test('the Observatory stacks its views and keeps them linked', async ({
    page,
  }, info) => {
    for (const [width, height] of sizesFor(info)) {
      await test.step(`${width}x${height}`, async () => {
        await page.setViewportSize({ width, height });
        await page.goto('/observatory/?open=tess-light-curve', {
          waitUntil: 'domcontentloaded',
        });
        await expect(page.locator('#obsTable tbody tr').first()).toBeVisible({
          timeout: 30_000,
        });
        await expectNoSidewaysScroll(page);

        const box = sel =>
          page.evaluate(sel => {
            const r = document.querySelector(sel).getBoundingClientRect();
            return {
              left: r.left,
              right: r.right,
              top: r.top + window.scrollY,
              bottom: r.bottom + window.scrollY,
            };
          }, sel);
        const plot = await box('#obsPlot');
        const table = await box('#obsTable');
        const wrap = await page.evaluate(() => {
          const r = document
            .getElementById('obsTable')
            .parentElement.getBoundingClientRect();
          return { left: r.left, right: r.right };
        });
        expect(plot.left).toBeGreaterThanOrEqual(0);
        expect(plot.right).toBeLessThanOrEqual(width);
        // A wide table scrolls inside its own box, never the page.
        expect(wrap.left).toBeGreaterThanOrEqual(0);
        expect(wrap.right).toBeLessThanOrEqual(width);
        // Stacked: the plot above the table, whatever the width.
        expect(plot.bottom).toBeLessThanOrEqual(table.top);
        if (width <= 900) {
          // Below the laptop the plot takes the column rather than sharing it.
          expect(plot.right - plot.left).toBeGreaterThan((width - 64) * 0.9);
        }

        // The transform controls wait behind a disclosure that starts closed.
        await expect(page.locator('#obsCropBox')).toBeHidden();
        expect(
          await page
            .locator('#obsCropBox')
            .evaluate(el => el.closest('details')?.open)
        ).toBe(false);

        // A selection made in the table is the plot's: the linkage holds.
        await page.locator('#obsTable tbody tr[tabindex="0"]').focus();
        await page.keyboard.press('Home');
        await page.keyboard.press('Shift+ArrowDown');
        await page.keyboard.press('Shift+ArrowDown');
        await expect(page.locator('#obsSelected')).toHaveText('3 selected');
        await expect(page.locator('#obsPlot .ow-pt.is-selected')).toHaveCount(
          3
        );
        await expectFingerSized(page, ['#obsWork']);
      });
    }
  });

  test('the image of an observation fits the window', async ({
    page,
  }, info) => {
    for (const [width, height] of sizesFor(info)) {
      await test.step(`${width}x${height}`, async () => {
        await page.setViewportSize({ width, height });
        await page.goto('/observatory/?open=tess-aperture', {
          waitUntil: 'domcontentloaded',
        });
        await expect(page.locator('#obsImage')).toBeVisible({
          timeout: 30_000,
        });
        const image = await page.locator('#obsImage').evaluate(el => {
          const r = el.getBoundingClientRect();
          return { left: r.left, right: r.right };
        });
        expect(image.left).toBeGreaterThanOrEqual(0);
        expect(image.right).toBeLessThanOrEqual(width);
        await expectNoSidewaysScroll(page);
      });
    }
  });

  test('the Library and Teach fit the window', async ({ page }, info) => {
    for (const [width, height] of sizesFor(info)) {
      await test.step(`${width}x${height}`, async () => {
        await page.setViewportSize({ width, height });
        await page.goto('/library/', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('html')).toHaveAttribute(
          'data-ready',
          'true',
          { timeout: 30_000 }
        );
        await expect(
          page.locator('#libResults .lib-card').first()
        ).toBeVisible();
        await expectNoSidewaysScroll(page);
        const wide = await page.evaluate(
          () =>
            [...document.querySelectorAll('#libResults .lib-card')].filter(
              c => c.getBoundingClientRect().right > window.innerWidth + 1
            ).length
        );
        expect(wide, 'cards wider than the window').toBe(0);
        await expectFingerSized(page, ['main']);

        await page.goto('/teaching/', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('h1').first()).toBeVisible();
        await expectNoSidewaysScroll(page);
      });
    }
  });

  test('the Studio edits from the tablet up, and reads on a phone', async ({
    page,
  }, info) => {
    for (const [width, height] of sizesFor(info)) {
      await test.step(`${width}x${height}`, async () => {
        await page.setViewportSize({ width, height });
        await page.goto('/studio/', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('body')).toHaveAttribute(
          'data-ready',
          'true',
          { timeout: 30_000 }
        );
        const phone = width < 768;
        const note = page.locator('.st-narrow');
        if (phone) {
          await expect(note).toBeVisible();
          await expect(note.locator('.gs-en')).toBeVisible();
          await expect(page.locator('#st-editor')).toBeHidden();
          await expect(page.locator('#st-save')).toBeHidden();
          await expect(page.locator('#st-raw')).toBeHidden();
          // What reads the document stays.
          await expect(page.locator('#st-checks-h')).toBeVisible();
          await expect(page.locator('#st-preview-go')).toBeVisible();
        } else {
          await expect(note).toBeHidden();
          await expect(page.locator('#st-editor')).toBeVisible();
          await expect(page.locator('#st-save')).toBeVisible();
        }
        await expectNoSidewaysScroll(page);
      });
    }
  });
});

test.describe('a finger on the canvas', () => {
  test('two fingers zoom the simulation, not the page, and the page can still zoom', async ({
    page,
    app,
  }) => {
    await app.boot();
    // The browser starts no gesture of its own on the canvas, so a pinch
    // there is the simulation's alone (js/ui.js zooms it).
    expect(
      await page
        .locator('#simulationCanvas')
        .evaluate(el => getComputedStyle(el).touchAction)
    ).toBe('none');
    // Everywhere else the page zooms: nothing forbids it.
    const viewport = await page
      .locator('meta[name="viewport"]')
      .getAttribute('content');
    expect(viewport).not.toMatch(/user-scalable\s*=\s*(no|0)/);
    expect(viewport).not.toMatch(/maximum-scale/);
  });

  test('a body can be placed precisely, without dragging', async ({
    page,
    app,
  }, info) => {
    for (const [width, height] of sizesFor(info)) {
      await test.step(`${width}x${height}`, async () => {
        await page.setViewportSize({ width, height });
        await app.boot();
        // Below the desktop the rail is behind the Menu button.
        const menu = page.locator('#mobileMenuToggle');
        if (await menu.isVisible()) await menu.click();
        const open = page.locator('#precisePlaceBtn');
        await expect(open).toBeVisible();
        await expectFingerSized(page, ['#mainControls'], {
          required: ['#loadScenarioBtn', '#objectTypeBtn', '#precisePlaceBtn'],
        });
        await open.click();
        const form = page.locator('#precisePlaceDialog');
        await expect(form).toBeVisible();
        const r = await form.evaluate(el => {
          const b = el.getBoundingClientRect();
          return {
            top: b.top,
            left: b.left,
            bottom: b.bottom,
            right: b.right,
            w: window.innerWidth,
            h: window.innerHeight,
          };
        });
        expect(r.top).toBeGreaterThanOrEqual(0);
        expect(r.left).toBeGreaterThanOrEqual(0);
        expect(r.bottom).toBeLessThanOrEqual(r.h);
        expect(r.right).toBeLessThanOrEqual(r.w);
      });
    }
  });
});
