// =============================================================================
// Canvas input: wheel zoom, drag to pan, keys to pan, speed keys, Home
// -----------------------------------------------------------------------------
// The pointer and keyboard handlers moved out of ui.js into placement.js
// (Prompt 107, slice 9), and nothing exercised the wheel, the pan keys or the
// speed keys directly: a handler left unregistered would have left every
// placement test green. These use real mouse and keyboard events on the
// paused empty world, so the camera is the only thing that moves.
// =============================================================================

import { test, expect } from './fixtures.js';

const camera = page =>
  page.evaluate(async () => {
    const ui = await import('/js/ui.js');
    return {
      zoom: ui.state.zoom,
      x: ui.state.pan.x,
      y: ui.state.pan.y,
      speed: ui.SETTINGS.sim_speed,
    };
  });

/** Let the page handle everything already dispatched, and draw twice. */
const settle = page =>
  page.evaluate(
    () =>
      new Promise(done =>
        window.requestAnimationFrame(() =>
          window.requestAnimationFrame(() => done())
        )
      )
  );

/** The world point under a canvas pixel, in the camera as it stands. */
const worldAt = (page, point) =>
  page.evaluate(async point => {
    const { screen_to_world } = await import('/js/physics.js');
    return screen_to_world(point);
  }, point);

/** Boot an empty paused world with the camera at its defaults. */
async function ready(page, app) {
  await app.boot();
  await app.emptyWorld('e2e', { run: false });
  await page.evaluate(async () => {
    const ui = await import('/js/ui.js');
    ui.state.zoom = 1;
    ui.state.pan = { x: 0, y: 0 };
  });
  // Focus on the page, not on a control the keys would be typed into.
  await page
    .locator('#simulationCanvas')
    .hover({ position: { x: 300, y: 300 } });
  await page.evaluate(() => document.activeElement?.blur?.());
}

test('the wheel zooms about the pointer and stops at its limits', async ({
  page,
  app,
}) => {
  await ready(page, app);
  const canvas = await page.locator('#simulationCanvas').boundingBox();
  const at = { x: canvas.x + 420, y: canvas.y + 260 };
  await page.mouse.move(at.x, at.y);
  const cssToCanvas = await page.evaluate(({ x, y }) => {
    const c = document.getElementById('simulationCanvas');
    const r = c.getBoundingClientRect();
    return {
      x: (x - r.left) * (c.width / r.width),
      y: (y - r.top) * (c.height / r.height),
    };
  }, at);
  const before = await worldAt(page, cssToCanvas);

  await page.mouse.wheel(0, -100);
  await expect.poll(async () => (await camera(page)).zoom).toBeCloseTo(1.05, 6);
  const after = await worldAt(page, cssToCanvas);
  // The world point under the pointer does not move: that is the anchor.
  expect(after.x).toBeCloseTo(before.x, 4);
  expect(after.y).toBeCloseTo(before.y, 4);

  await page.mouse.wheel(0, 100);
  await expect.poll(async () => (await camera(page)).zoom).toBeCloseTo(1, 6);

  await page.evaluate(async () => {
    (await import('/js/ui.js')).state.zoom = 100;
  });
  await page.mouse.wheel(0, -100);
  await settle(page);
  expect((await camera(page)).zoom).toBe(100);
});

test('W, A, S, D and the arrows pan, and Home resets the view', async ({
  page,
  app,
}) => {
  await ready(page, app);
  const step = 40;
  const expectPan = async (x, y) => {
    await expect
      .poll(async () => {
        const c = await camera(page);
        return [c.x, c.y];
      })
      .toEqual([x, y]);
  };
  await page.keyboard.press('d');
  await expectPan(-step, 0);
  await page.keyboard.press('a');
  await expectPan(0, 0);
  await page.keyboard.press('w');
  await expectPan(0, step);
  await page.keyboard.press('s');
  await expectPan(0, 0);
  await page.keyboard.press('ArrowLeft');
  await expectPan(step, 0);
  await page.keyboard.press('ArrowDown');
  await expectPan(step, -step);

  await page.evaluate(async () => {
    (await import('/js/ui.js')).state.zoom = 2;
  });
  await page.keyboard.press('Home');
  await expect.poll(async () => (await camera(page)).zoom).toBe(1);
  await expectPan(0, 0);
});

test('typing in a field does not pan the view', async ({ page, app }) => {
  await ready(page, app);
  await page.evaluate(() => {
    const field = document.createElement('input');
    field.id = 'canvasInputProbe';
    document.body.appendChild(field);
    field.focus();
  });
  await page.keyboard.type('dddwww');
  await settle(page);
  const c = await camera(page);
  expect([c.x, c.y]).toEqual([0, 0]);
});

test('= and - step the simulation speed and the readout follows', async ({
  page,
  app,
}) => {
  await ready(page, app);
  const start = (await camera(page)).speed;
  await page.keyboard.press('=');
  await expect
    .poll(async () => (await camera(page)).speed)
    .toBeGreaterThan(start);
  const raised = (await camera(page)).speed;
  const readout = await page
    .locator('#speedDisplay')
    .textContent()
    .catch(() => null);
  await page.keyboard.press('-');
  await expect.poll(async () => (await camera(page)).speed).toBe(start);
  if (readout !== null) {
    await expect(page.locator('#speedDisplay')).not.toHaveText(readout);
  }
  expect(raised).toBeGreaterThan(start);
});

test('dragging on empty canvas pans the view with the pointer', async ({
  page,
  app,
}) => {
  await ready(page, app);
  const canvas = await page.locator('#simulationCanvas').boundingBox();
  const from = { x: canvas.x + 500, y: canvas.y + 300 };
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x - 60, from.y + 40, { steps: 6 });
  await page.mouse.up();
  const c = await camera(page);
  expect(c.x).toBeLessThan(-30);
  expect(c.y).toBeGreaterThan(20);
});
