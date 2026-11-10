// =============================================================================
// Accessibility sweep I: every surface by keyboard and by one pointer
// -----------------------------------------------------------------------------
// Prompt 278. Two halves, both made of real key presses and real pointer
// presses in a real browser.
//
// 1. The walk inventory. tools/interaction-contract.json's `inventory.rows`
//    holds one row for every surface of the navigation inventory
//    (tests/interactionContract.test.js holds the two lists together). Each row
//    is walked in English and in Spanish: Tab from the top of the page until
//    focus comes round again (no trap; every stop named and on screen; every
//    control a pointer can press also reached by Tab), then Tab to the row's
//    primary control and press its key, which must change something a reader
//    can see.
//
// 2. The controls Prompt 155 found missing and this prompt built, each by
//    keyboard, by single presses with no drag, and for what is said: the
//    sandbox's view pad, the 3-D lab's view pad and its announced camera, the
//    spacetime view's pad, a window moved and sized without a drag, the
//    observer's angle, and a run of rows in the Observatory.
//
// A pointer walk here never drags: it presses at a point (page.mouse.click)
// after asserting the control's box is inside the viewport and on top, because
// locator.click() scrolls a clipped control into reach that a finger could not
// press, and toBeVisible() passes for a control below the fold.
// =============================================================================

import { readFileSync } from 'node:fs';
import { test, expect } from './fixtures.js';
import { tabWalk, tabTo } from './walk.js';

const contract = JSON.parse(
  readFileSync('tools/interaction-contract.json', 'utf8')
);
const inventory = contract.inventory;

const LOCALES = [
  { id: 'en', label: 'English' },
  { id: 'es', label: 'Spanish' },
];

/** Open a page in a language, past the front door, and wait until it is ready. */
async function open(page, path, locale) {
  await page.addInitScript(
    ([key, id]) => {
      try {
        window.localStorage.setItem('gravitas_welcome_seen_v1', '1');
        window.localStorage.setItem(key, id);
      } catch {
        /* storage unavailable: the page opens in English */
      }
    },
    ['gravitas_locale', locale]
  );
  await page.goto(path, { waitUntil: 'load' });
  if (path === '/' || path.startsWith('/#'))
    await page.waitForFunction(
      () =>
        window.splashScreenEnded === true &&
        document.querySelector('.ui-container')?.classList.contains('showUI'),
      null,
      { timeout: 30_000 }
    );
  // The page's own modules fill it after load; a walk begun before they have
  // would count the stops of an empty shell.
  await page.waitForLoadState('networkidle').catch(() => {});
}

/** What a reader could notice change after a press. Runs in the page. */
function snapshot(selector) {
  const el = document.querySelector(selector);
  const shown = [
    ...document.querySelectorAll(
      'dialog[open], [role="dialog"], [role="alertdialog"], details[open], [role="status"], [role="alert"], [aria-live], output'
    ),
  ]
    .filter(n => n.getClientRects().length)
    .map(n => `${n.id}:${n.textContent.length}`)
    .join('|');
  return {
    url: window.location.href,
    focus: document.activeElement === el,
    shown,
    control: el
      ? [
          el.value,
          el.checked,
          el.textContent,
          el.getAttribute('aria-pressed'),
          el.getAttribute('aria-expanded'),
          el.type,
        ].join('|')
      : 'gone',
    text: (document.querySelector('main') || document.body).innerText.length,
  };
}

/**
 * Press at a control's center with one pointer and no path, after asserting a
 * finger could reach it: its box is inside the viewport and nothing covers it.
 */
async function pressAt(page, selector) {
  const target = page.locator(selector).first();
  await target.scrollIntoViewIfNeeded();
  const box = await target.boundingBox();
  expect(box, `${selector} has a box`).not.toBeNull();
  const view = page.viewportSize();
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  expect(x, `${selector} is inside the viewport across`).toBeGreaterThan(0);
  expect(x).toBeLessThan(view.width);
  expect(y, `${selector} is inside the viewport down`).toBeGreaterThan(0);
  expect(y).toBeLessThan(view.height);
  const onTop = await page.evaluate(
    ([sel, px, py]) => {
      const el = document.querySelector(sel);
      const hit = document.elementFromPoint(px, py);
      return Boolean(hit && (el.contains(hit) || hit.contains(el)));
    },
    [selector, x, y]
  );
  expect(onTop, `${selector} is not covered where it is pressed`).toBe(true);
  await page.mouse.click(x, y);
}

const boxOf = (page, selector) =>
  page.evaluate(sel => {
    const r = document.querySelector(sel).getBoundingClientRect();
    return {
      left: Math.round(r.left),
      top: Math.round(r.top),
      width: Math.round(r.width),
      height: Math.round(r.height),
    };
  }, selector);

const said = page => page.locator('#srStatus').textContent();

// -----------------------------------------------------------------------------
// 1. The walk inventory
// -----------------------------------------------------------------------------

test.describe('the walk inventory: every surface by keyboard', () => {
  // A long page holds hundreds of stops, each a real key press.
  test.setTimeout(240_000);

  for (const row of inventory.rows) {
    for (const locale of LOCALES) {
      test(`${row.surface} (${row.path}), ${locale.label}: Tab reaches every control, and the primary task answers the keyboard`, async ({
        page,
        browserName,
      }) => {
        await open(page, row.path, locale.id);

        // The language the page is in. A page recorded as English only stays
        // in English with Spanish stored; when it learns Spanish this fails,
        // and the row is corrected.
        const lang = await page.evaluate(() => document.documentElement.lang);
        expect(lang.slice(0, 2)).toBe(
          locale.id === 'es' && row.spanish ? 'es' : 'en'
        );

        const walk = await tabWalk(page, browserName);
        expect(walk.trap, 'focus is never trapped').toBeNull();
        expect(walk.wrapped, 'focus comes round to where it began').toBe(true);
        expect(walk.stops.length, 'the page has Tab stops').toBeGreaterThan(2);
        expect(walk.unnamed, 'every stop has a name').toEqual([]);
        expect(
          walk.offscreen,
          'every stop is on screen while it has focus'
        ).toEqual([]);
        expect(
          walk.skipped,
          'every control a pointer can press is reached by Tab'
        ).toEqual([]);

        // The primary task, from a fresh start at the top of the page.
        await page.evaluate(() => {
          document.activeElement?.blur?.();
          window.scrollTo(0, 0);
        });
        const presses = await tabTo(page, browserName, row.reach);
        expect(presses, `Tab reaches ${row.reach}`).toBeGreaterThan(0);
        const before = await page.evaluate(snapshot, row.reach);
        if (row.press.startsWith('type:'))
          await page.keyboard.type(row.press.slice(5));
        else await page.keyboard.press(row.press);
        await expect
          .poll(
            async () => {
              // A link has taken the reader to another page: the snapshot
              // cannot run mid-navigation, and the new address is the effect.
              const after = await page
                .evaluate(snapshot, row.reach)
                .catch(() => null);
              if (!after) return 'navigating';
              return Object.keys(before)
                .filter(k => after[k] !== before[k])
                .join(',');
            },
            { message: `${row.task} (${row.press} on ${row.reach})` }
          )
          .not.toBe('');
      });
    }
  }
});

// -----------------------------------------------------------------------------
// 2. The sandbox: the view pad, K2, the windows, the observer
// -----------------------------------------------------------------------------

const view = page =>
  page.evaluate(async () => {
    const { state } = await import('/js/appState.js');
    return { zoom: state.zoom, x: state.pan.x, y: state.pan.y };
  });

test.describe('sandbox.view: the view pad', () => {
  test('the view pad zooms and pans from the keyboard', async ({
    page,
    app,
    browserName,
  }) => {
    await app.boot();
    expect(await tabTo(page, browserName, '#railTools')).toBeGreaterThan(0);
    await page.keyboard.press('Enter');
    expect(await tabTo(page, browserName, '#viewZoomIn')).toBeGreaterThan(0);
    const start = await view(page);
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    const zoomed = await view(page);
    expect(zoomed.zoom).toBeCloseTo(start.zoom * 1.25 * 1.25, 6);
    // Shift+Tab goes back one control: zoom out is the button before.
    await page.keyboard.press('Shift+Tab');
    await expect(page.locator('#viewZoomOut')).toBeFocused();
    await page.keyboard.press('Enter');
    expect((await view(page)).zoom).toBeCloseTo(start.zoom * 1.25, 6);
    expect(await tabTo(page, browserName, '#panLeft')).toBeGreaterThan(0);
    const before = await view(page);
    await page.keyboard.press('Enter');
    const after = await view(page);
    // What the Left arrow does on the canvas: one step of 40 px over the zoom.
    expect(after.x - before.x).toBeCloseTo(40 / before.zoom, 6);
    expect(after.y).toBe(before.y);
  });

  test('the view pad pans and zooms the sandbox with single presses', async ({
    page,
    app,
  }) => {
    await app.boot();
    await pressAt(page, '#railTools');
    const start = await view(page);
    await pressAt(page, '#viewZoomIn');
    expect((await view(page)).zoom).toBeCloseTo(start.zoom * 1.25, 6);
    await pressAt(page, '#viewZoomOut');
    expect((await view(page)).zoom).toBeCloseTo(start.zoom, 6);
    const step = 40 / start.zoom;
    const moves = [
      ['#panLeft', step, 0],
      ['#panRight', -step, 0],
      ['#panUp', 0, step],
      ['#panDown', 0, -step],
    ];
    for (const [selector, dx, dy] of moves) {
      const before = await view(page);
      await pressAt(page, selector);
      const after = await view(page);
      expect(after.x - before.x).toBeCloseTo(dx, 6);
      expect(after.y - before.y).toBeCloseTo(dy, 6);
    }
  });

  for (const locale of LOCALES)
    test(`the zoom is said once, after the pressing stops (${locale.label})`, async ({
      page,
    }) => {
      await open(page, '/', locale.id);
      await pressAt(page, '#railTools');
      await pressAt(page, '#viewZoomIn');
      await pressAt(page, '#viewZoomIn');
      await pressAt(page, '#viewZoomIn');
      // Nothing yet: three presses are one change, said when they stop.
      expect(await said(page)).not.toMatch(/Zoom/);
      const { zoom } = await view(page);
      await expect(page.locator('#srStatus')).toHaveText(
        locale.id === 'es'
          ? `Zoom de ${zoom.toFixed(2)} aumentos`
          : `Zoom ${zoom.toFixed(2)} times`,
        { timeout: 5_000 }
      );
      // And the pad's buttons are named in the page's language.
      await expect(page.locator('#viewZoomIn')).toHaveAccessibleName(
        locale.id === 'es' ? 'Acercar' : 'Zoom in'
      );
      await expect(page.locator('#panLeft')).toHaveAccessibleName(
        locale.id === 'es'
          ? 'Mover la vista a la izquierda'
          : 'Move the view left'
      );
    });

  test('A arms a placement and does not also pan', async ({ page, app }) => {
    await app.boot();
    // Nothing armed: A pans, as W, S and D do.
    await page.locator('#simulationCanvas').hover();
    let before = await view(page);
    await page.keyboard.press('a');
    expect((await view(page)).x).toBeGreaterThan(before.x);
    // Arm a type from the keyboard, then press A: the aim begins, the view stays.
    await page.locator('#objectTypeBtn').focus();
    await page.keyboard.press('Enter');
    // The picker opens with focus on its first type; Enter arms it.
    await expect(
      page.locator('#objectTypePicker [role="menuitemradio"]').first()
    ).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#placementStatus')).toBeVisible();
    before = await view(page);
    await page.keyboard.press('a');
    expect(await view(page)).toEqual(before);
    await expect(page.locator('#srStatus')).not.toHaveText('');
    // The arrows now aim, and Escape gives them back to the view.
    await page.keyboard.press('Escape');
    await page.keyboard.press('ArrowLeft');
    expect((await view(page)).x).toBeGreaterThan(before.x);
  });
});

test.describe('sandbox.windows: moved and sized without a drag', () => {
  const MOVE = '#threeViewportContainer [data-window="move"]';
  const SIZE = '#threeViewportContainer [data-window="size"]';

  /** Open the spacetime view from the keyboard. */
  async function openSpacetime(page, browserName) {
    expect(await tabTo(page, browserName, '#railTools')).toBeGreaterThan(0);
    await page.keyboard.press('Enter');
    expect(await tabTo(page, browserName, '#toggle3DView')).toBeGreaterThan(0);
    await page.keyboard.press('Enter');
    await expect(page.locator(MOVE)).toBeVisible({ timeout: 20_000 });
  }

  test('the arrow keys move and size a window from its Move and Size buttons', async ({
    page,
    app,
    browserName,
  }) => {
    await app.boot();
    await openSpacetime(page, browserName);
    expect(await tabTo(page, browserName, MOVE)).toBeGreaterThan(0);
    const start = await boxOf(page, '#threeViewportContainer');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Shift+ArrowUp');
    await page.keyboard.press('Alt+ArrowRight');
    const moved = await boxOf(page, '#threeViewportContainer');
    // One step is 16 px; Shift is four steps and Alt a quarter of one.
    expect(moved.left - start.left).toBe(20);
    expect(moved.top - start.top).toBe(-64);
    expect(moved.width).toBe(start.width);
    await page.keyboard.press('Tab');
    await expect(page.locator(SIZE)).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowUp');
    const sized = await boxOf(page, '#threeViewportContainer');
    expect(sized.width - moved.width).toBe(16);
    expect(sized.height - moved.height).toBe(16);
    // The bottom left corner stays where it is, as it does under the drag.
    expect(sized.left).toBe(moved.left);
    expect(sized.top + sized.height).toBe(moved.top + moved.height);
  });

  test('a window goes where one press says, with no drag', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.openPanel('toggle3DView', 'threeViewportContainer');
    await expect(page.locator(MOVE)).toBeVisible({ timeout: 20_000 });

    // The spacetime view: Move, then a press where its corner goes.
    await pressAt(page, MOVE);
    await expect(page.locator(MOVE)).toHaveAttribute('aria-pressed', 'true');
    await page.mouse.click(300, 220);
    let box = await boxOf(page, '#threeViewportContainer');
    expect([box.left, box.top]).toEqual([300, 220]);
    await expect(page.locator('[data-window-veil]')).toHaveCount(0);
    await expect(page.locator(MOVE)).toHaveAttribute('aria-pressed', 'false');
    // Size: a press where the top right corner goes.
    await pressAt(page, SIZE);
    await page.mouse.click(800, 160);
    const sized = await boxOf(page, '#threeViewportContainer');
    expect(sized.left).toBe(300);
    expect(sized.width).toBe(500);
    expect(sized.top).toBe(160);
    expect(sized.top + sized.height).toBe(box.top + box.height);
    // The press went to the veil and nowhere else: no body was placed and no
    // object was picked by it.
    await expect(page.locator('#objectInspector')).not.toBeVisible();
    await page.locator('#close3DViewBtn').click();

    // The inspector.
    await app.setPaused(true);
    await app.selectFirstObject();
    const INSPECTOR = '#objectInspector [data-window="move"]';
    await expect(page.locator(INSPECTOR)).toBeVisible({ timeout: 20_000 });
    await pressAt(page, INSPECTOR);
    await page.mouse.click(520, 260);
    box = await boxOf(page, '#objectInspector');
    expect([box.left, box.top]).toEqual([520, 260]);

    // A pinned card: it leaves the automatic column, as a dragged card does.
    await pressAt(page, '#inspectorPin');
    const PIN = '#pinnedInspectors .insp-pin [data-window="move"]';
    await expect(page.locator(PIN)).toBeVisible({ timeout: 20_000 });
    await pressAt(page, PIN);
    await page.mouse.click(180, 330);
    box = await boxOf(page, '#pinnedInspectors .insp-pin');
    expect([box.left, box.top]).toEqual([180, 330]);
  });

  for (const locale of LOCALES)
    test(`arming a move says what to do, and the move is said (${locale.label})`, async ({
      page,
    }) => {
      await open(page, '/', locale.id);
      await pressAt(page, '#railTools');
      await pressAt(page, '#toggle3DView');
      await expect(page.locator(MOVE)).toBeVisible({ timeout: 20_000 });
      await expect(page.locator(MOVE)).toHaveAccessibleName(
        locale.id === 'es' ? 'Mover este panel' : 'Move this panel'
      );
      await expect(page.locator(SIZE)).toHaveAccessibleName(
        locale.id === 'es'
          ? 'Cambiar el tamaño de este panel'
          : 'Resize this panel'
      );
      await page.locator(MOVE).focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('#srStatus')).toContainText(
        locale.id === 'es' ? 'esquina superior izquierda' : 'top left corner'
      );
      // Escape disarms, and nothing moved.
      const start = await boxOf(page, '#threeViewportContainer');
      await page.keyboard.press('Escape');
      await expect(page.locator('[data-window-veil]')).toHaveCount(0);
      expect(await boxOf(page, '#threeViewportContainer')).toEqual(start);
      await expect(page.locator(MOVE)).toBeFocused();
      // Armed again and placed: said.
      await page.keyboard.press('Enter');
      await page.mouse.click(260, 200);
      await expect(page.locator('#srStatus')).toHaveText(
        locale.id === 'es' ? 'Panel movido.' : 'Panel moved.'
      );
      await expect(page.locator(MOVE)).toBeFocused();
    });
});

test.describe('sandbox.spacetime: the camera without a drag', () => {
  const camera = page =>
    page.evaluate(() =>
      (document.getElementById('threeViewport').dataset.camera || '')
        .split(',')
        .map(Number)
    );
  const distance = c => Math.hypot(c[0] - c[3], c[1] - c[4], c[2] - c[5]);

  /** The pad's ten presses, by `press`, each checked against the camera. */
  async function walkPad(page, press) {
    const drew = await page.evaluate(
      () => document.querySelector('#threeViewport canvas') !== null
    );
    await press('turn,1,0');
    if (!drew) {
      // No WebGL in this browser: the view shows its message, the pad is
      // inert and nothing throws. Nothing else can be measured here.
      expect(await camera(page)).toEqual([0]);
      return;
    }
    const turned = await camera(page);
    expect(turned).toHaveLength(6);
    await press('turn,-1,0');
    await press('turn,-1,0');
    const back = await camera(page);
    // A turn keeps the distance and the target and moves the eye.
    expect(distance(back)).toBeCloseTo(distance(turned), 1);
    expect(back.slice(3)).toEqual(turned.slice(3));
    expect(back.slice(0, 3)).not.toEqual(turned.slice(0, 3));
    await press('turn,0,1');
    const tilted = await camera(page);
    expect(tilted[1]).toBeGreaterThan(back[1]);
    await press('turn,0,-1');
    await press('zoom,0.8');
    const near = await camera(page);
    expect(distance(near)).toBeLessThan(distance(tilted));
    await press('zoom,1.25');
    expect(distance(await camera(page))).toBeGreaterThan(distance(near));
    // A move carries the eye and the target together.
    const before = await camera(page);
    await press('move,1,0');
    const moved = await camera(page);
    expect(moved.slice(3)).not.toEqual(before.slice(3));
    expect(distance(moved)).toBeCloseTo(distance(before), 1);
    await press('move,-1,0');
    await press('move,0,1');
    await press('move,0,-1');
    expect(distance(await camera(page))).toBeCloseTo(distance(before), 1);
  }

  test('the spacetime pad turns, moves and zooms from the keyboard', async ({
    page,
    app,
    browserName,
  }) => {
    // Some eighty key presses beside a running simulation and a WebGL view.
    test.setTimeout(240_000);
    await app.boot();
    expect(await tabTo(page, browserName, '#railTools')).toBeGreaterThan(0);
    await page.keyboard.press('Enter');
    expect(await tabTo(page, browserName, '#toggle3DView')).toBeGreaterThan(0);
    await page.keyboard.press('Enter');
    await expect(page.locator('#threeViewPad')).toBeVisible({
      timeout: 20_000,
    });
    // Tab from the rail comes round to the pad, which is earlier in the page.
    expect(
      await tabTo(page, browserName, '#threeViewPad [data-cam="turn,1,0"]')
    ).toBeGreaterThan(0);
    // Forward with Tab, or back with Shift+Tab: the pad's buttons are
    // neighbours, and a reader does not go round the page to reach one.
    await walkPad(page, async what => {
      const selector = `#threeViewPad [data-cam="${what}"]`;
      const there = () =>
        page.evaluate(
          s => document.activeElement?.matches(s) === true,
          selector
        );
      // Ten forward covers the pad; coming back passes it again to the start.
      for (const [key, presses] of [
        ['Tab', 10],
        ['Shift+Tab', 22],
      ])
        for (let i = 0; i < presses && !(await there()); i++)
          await page.keyboard.press(key);
      expect(await there(), `the keyboard reaches ${what}`).toBe(true);
      await page.keyboard.press('Enter');
    });
  });

  for (const locale of LOCALES)
    test(`the spacetime pad turns, moves and zooms with single presses (${locale.label})`, async ({
      page,
    }) => {
      await open(page, '/', locale.id);
      await pressAt(page, '#railTools');
      await pressAt(page, '#toggle3DView');
      await expect(page.locator('#threeViewPad')).toBeVisible({
        timeout: 20_000,
      });
      await walkPad(page, what =>
        pressAt(page, `#threeViewPad [data-cam="${what}"]`)
      );
      await expect(
        page.locator('#threeViewPad [data-cam="turn,-1,0"]')
      ).toHaveAccessibleName(
        locale.id === 'es' ? 'Girar a la izquierda' : 'Turn left'
      );
      await expect(page.locator('#threeViewPad')).toHaveAccessibleName(
        locale.id === 'es'
          ? 'Girar, mover y ampliar la vista del espaciotiempo'
          : 'Turn, move and zoom the spacetime view'
      );
    });
});

test.describe('sandbox.observer: the position angle', () => {
  const SLIDER = '#lightCurveObserverControls [data-pa-slider]';

  test('the position angle slider turns the observer from the keyboard', async ({
    page,
    app,
    browserName,
  }) => {
    await app.boot();
    expect(await tabTo(page, browserName, '#railTools')).toBeGreaterThan(0);
    await page.keyboard.press('Enter');
    expect(await tabTo(page, browserName, '#toggleLightCurve')).toBeGreaterThan(
      0
    );
    await page.keyboard.press('Enter');
    await expect(page.locator(SLIDER)).toBeVisible({ timeout: 20_000 });
    expect(await tabTo(page, browserName, SLIDER)).toBeGreaterThan(0);
    const start = (await app.observerGeometry()).positionAngle;
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    // The observer the drag of the canvas handle turns: the same number.
    expect((await app.observerGeometry()).positionAngle).toBe(start + 3);
    await expect(
      page.locator('#lightCurveObserverControls [data-pa-value]')
    ).toHaveText(`${start + 3}°`);
    await page.keyboard.press('Home');
    expect((await app.observerGeometry()).positionAngle).toBe(0);
  });

  test('one press on the slider turns the observer, with no drag', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.openPanel('toggleLightCurve', 'lightCurveContainer');
    const slider = page.locator(SLIDER);
    await expect(slider).toBeVisible({ timeout: 20_000 });
    const box = await slider.boundingBox();
    const view = page.viewportSize();
    expect(box.y).toBeGreaterThan(0);
    expect(box.y + box.height).toBeLessThan(view.height);
    // One press three quarters of the way along the track, and one at a quarter.
    await page.mouse.click(box.x + box.width * 0.75, box.y + box.height / 2);
    const far = (await app.observerGeometry()).positionAngle;
    expect(far).toBeGreaterThan(230);
    expect(far).toBeLessThan(310);
    await page.mouse.click(box.x + box.width * 0.25, box.y + box.height / 2);
    const near = (await app.observerGeometry()).positionAngle;
    expect(near).toBeGreaterThan(50);
    expect(near).toBeLessThan(130);
  });
});

// -----------------------------------------------------------------------------
// 3. The 3-D lab's camera
// -----------------------------------------------------------------------------

test.describe('lab3d.camera: the view pad and what is said', () => {
  const camera = page => page.evaluate(() => window.gravitasLab3d.camera());
  const dist = c => Math.hypot(...c.eye.map((v, i) => v - c.target[i]));

  async function openLab(page, locale) {
    await open(page, '/3d/?system=R1', locale);
    await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', {
      timeout: 30_000,
    });
    return page.evaluate(() => window.gravitasLab3d.webgl);
  }

  test('the 3-D view pad turns, moves and zooms with single presses', async ({
    page,
  }) => {
    const webgl = await openLab(page, 'en');
    await expect(page.locator('#l3-pad')).toBeVisible();
    await pressAt(page, '#l3-pad [data-cam="1,0"]');
    if (!webgl) {
      // No WebGL: the lab keeps its tables, the pad is inert and nothing
      // throws. The camera cannot be measured in this browser.
      expect(await camera(page)).toBeNull();
      return;
    }
    const start = await camera(page);
    await pressAt(page, '#l3-pad [data-cam="1,0"]');
    const turned = await camera(page);
    expect(turned.eye).not.toEqual(start.eye);
    expect(turned.target).toEqual(start.target);
    expect(dist(turned)).toBeCloseTo(dist(start), 6);
    await pressAt(page, '#l3-pad [data-cam="0,1"]');
    await pressAt(page, '#l3-pad [data-cam="0,-1"]');
    await pressAt(page, '#l3-pad [data-cam="-1,0"]');
    await pressAt(page, '#l3-pad-in');
    const near = await camera(page);
    expect(dist(near)).toBeLessThan(dist(turned));
    await pressAt(page, '#l3-pad-out');
    expect(dist(await camera(page))).toBeGreaterThan(dist(near));
    // The same four arrows move the view once the select says so.
    await page.locator('#l3-pad-mode').selectOption('move');
    await expect(
      page.locator('#l3-pad [data-cam="-1,0"]')
    ).toHaveAccessibleName('Move the view left');
    const before = await camera(page);
    await pressAt(page, '#l3-pad [data-cam="1,0"]');
    const moved = await camera(page);
    expect(moved.target).not.toEqual(before.target);
    expect(dist(moved)).toBeCloseTo(dist(before), 6);
  });

  for (const locale of LOCALES)
    test(`the 3-D camera says where it is once the pressing stops (${locale.label})`, async ({
      page,
    }) => {
      const webgl = await openLab(page, locale.id);
      const status = page.locator('#l3-camera');
      await expect(status).toHaveAttribute('role', 'status');
      await expect(
        page.locator('#l3-pad [data-cam="-1,0"]')
      ).toHaveAccessibleName(
        locale.id === 'es'
          ? 'Girar la vista a la izquierda'
          : 'Turn the view left'
      );
      if (!webgl) return; // nothing moves, so nothing is said
      await page.locator('#l3-canvas').focus();
      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('Shift+ArrowUp');
      await page.keyboard.press('+');
      // Four presses, nothing said yet; then one sentence with the numbers.
      expect(await status.textContent()).toBe('');
      await expect(status).toHaveText(
        locale.id === 'es'
          ? /^Vista desde \d+° por (encima|debajo) del plano de referencia, a \d+° alrededor\. La vista es [\d,.]+ veces tan alta como el sistema\.$/
          : /^Looking from \d+° (above|below) the reference plane, \d+° around it\. The view is [\d.]+ times as tall as the system\.$/,
        { timeout: 5_000 }
      );
      // The numbers are the camera's: the height above the plane, in degrees.
      const c = await camera(page);
      const p = c.eye.map((v, i) => v - c.target[i]);
      const above = Math.round(
        Math.abs((Math.asin(p[2] / Math.hypot(...p)) * 180) / Math.PI)
      );
      expect(await status.textContent()).toContain(`${above}°`);
      // The pad says it too.
      await pressAt(page, '#l3-pad-out');
      await expect(status).not.toHaveText(/^$/);
    });
});

// -----------------------------------------------------------------------------
// 4. The Observatory: a run of rows
// -----------------------------------------------------------------------------

test.describe('observatory.selection: a run without a held key', () => {
  async function openTable(page, locale) {
    await open(page, '/observatory/', locale);
    await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', {
      timeout: 30_000,
    });
    await page.locator('#obsFixture').selectOption('tess-light-curve');
    await page.locator('#obsOpen').click();
    await expect(page.locator('#obsWork')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('#obsTable tbody tr').first()).toBeVisible();
  }
  const row = n => `#obsTable tbody tr[data-row="${n}"]`;
  const selected = page =>
    page.locator('#obsTable tbody tr[aria-selected="true"]').count();

  for (const locale of LOCALES)
    test(`a run of rows is chosen with single presses and no held key (${locale.label})`, async ({
      page,
    }) => {
      await openTable(page, locale.id);
      await pressAt(page, row(2));
      expect(await selected(page)).toBe(1);
      await pressAt(page, '#obsSelectRun');
      await expect(page.locator('#obsSelectRun')).toHaveAttribute(
        'aria-pressed',
        'true'
      );
      await expect(page.locator('#obsTable')).toHaveAttribute(
        'data-select-run',
        ''
      );
      // What to do is the button's description, in the page's language.
      await expect(page.locator('#obsSelectRun')).toHaveAccessibleDescription(
        locale.id === 'es'
          ? 'Elige la primera fila del tramo, pulsa este botón y después elige la última fila.'
          : 'Choose the first row of the run, press this, then choose the last row.'
      );
      await pressAt(page, row(7));
      // Rows 3 to 8, as Shift-click selects them, and the run is over.
      expect(await selected(page)).toBe(6);
      await expect(page.locator('#obsSelectRun')).toHaveAttribute(
        'aria-pressed',
        'false'
      );
      // The next press is an ordinary choice again.
      await pressAt(page, row(4));
      expect(await selected(page)).toBe(1);
    });

  test('the run is armed from the keyboard too', async ({
    page,
    browserName,
  }) => {
    await openTable(page, 'en');
    // Tab into the table: its one stop is the row in focus, the first. Space
    // selects it, and the row says so (it did not, until this walk).
    expect(await tabTo(page, browserName, row(0))).toBeGreaterThan(0);
    await page.keyboard.press(' ');
    await expect(page.locator(row(0))).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    expect(await tabTo(page, browserName, '#obsSelectRun')).toBeGreaterThan(0);
    await page.keyboard.press('Enter');
    await expect(page.locator('#obsSelectRun')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    // Pressed again, it is put down and nothing is selected by it.
    await page.keyboard.press('Enter');
    await expect(page.locator('#obsSelectRun')).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(await selected(page)).toBe(1);
    // Escape in the table clears the selection, and the rows say so.
    await page.locator(row(2)).focus();
    await page.keyboard.press('Escape');
    expect(await selected(page)).toBe(0);
  });
});
