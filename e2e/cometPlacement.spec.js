// =============================================================================
// A hand-placed comet exists, and is drawn
// -----------------------------------------------------------------------------
// Two halves of one report - "hand-placed comets do not appear" - and the
// second half is why a count assertion alone would not have caught it.
// js/ui.js put the new Comet into `comets`, correctly; js/render.js never
// imported that collection, so nothing ever called Comet.draw(). The object was
// there, gravitating, invisible. A test that only counted bodies would have
// passed throughout.
//
// So this asserts both: that `comets` grew, and that the canvas changed where
// the comet was placed. The second is measured out of the composited canvas
// rather than by spying on anything, because a hook installed for the test is
// a hook that can pass while the product is broken.
//
// The low tier is covered because it is the case that breaks coordinate
// handling: it renders the canvas backing store at 0.7 of its CSS box, so a
// placement path that confuses the two lands somewhere else entirely.
// =============================================================================

import { test, expect } from './fixtures.js';

/**
 * Brightness inside a square of the composited canvas, in CSS pixel terms.
 *
 * Reads the canvas the application actually painted, converting the CSS point
 * the mouse was at into the backing store's own pixels - the same conversion
 * canvasPoint() does in js/ui.js, and the reason this works at either tier.
 */
async function brightnessAt(page, cssX, cssY, halfCss = 26) {
  return page.evaluate(
    ([x, y, half]) => {
      const canvas = document.getElementById('simulationCanvas');
      const rect = canvas.getBoundingClientRect();
      const sx = canvas.width / rect.width;
      const sy = canvas.height / rect.height;
      const px = Math.round((x - rect.left) * sx);
      const py = Math.round((y - rect.top) * sy);
      const r = Math.max(2, Math.round(half * sx));
      const left = Math.max(0, px - r);
      const top = Math.max(0, py - r);
      const w = Math.min(canvas.width - left, r * 2);
      const h = Math.min(canvas.height - top, r * 2);
      const ctx = canvas.getContext('2d');
      const data = ctx.getImageData(left, top, w, h).data;
      let total = 0;
      let lit = 0;
      for (let i = 0; i < data.length; i += 4) {
        const v = (data[i] + data[i + 1] + data[i + 2]) / 3;
        total += v;
        if (v > 60) lit++;
      }
      return { mean: total / (data.length / 4), lit, pixels: data.length / 4 };
    },
    [cssX, cssY, halfCss]
  );
}

/** How many comets the world holds. */
const cometCount = page =>
  page.evaluate(async () => {
    const p = await import('/js/physics.js');
    return p.comets.length;
  });

/**
 * Empty the world and stop it, so the canvas is a known blank and nothing
 * drifts between the two brightness readings.
 */
async function emptyPausedWorld(page) {
  await page.evaluate(async () => {
    const ui = await import('/js/ui.js');
    ui.SETTINGS.preset_scenario = 'Empty';
    ui.initialize_simulation({ seed: 'comet-e2e' });
    ui.state.paused = true;
    ui.state.zoom = 1;
    ui.state.pan = { x: 0, y: 0 };
  });
}

/** Choose a type from the real picker, the way a reader does. */
async function armFromPicker(page, type) {
  const trigger = page.locator('#objectTypeBtn');
  await expect(trigger).toBeVisible();
  await trigger.click();
  const picker = page.locator('#objectTypePicker');
  await expect(picker).toBeVisible();
  const item = picker.locator(`[data-object-type="${type}"]`);
  await expect(item).toBeVisible();
  await item.click();
  await expect(picker).toBeHidden();
  await expect(trigger).toHaveClass(/is-armed/);
}

/** One frame, so the paused renderer repaints. */
async function paint(page) {
  await page.evaluate(
    () =>
      new Promise(r =>
        window.requestAnimationFrame(() =>
          window.requestAnimationFrame(() => r())
        )
      )
  );
}

/**
 * Move the pointer off the body just placed.
 *
 * The renderer draws a pulsing hover ring around whatever is under the cursor,
 * so leaving the mouse where the comet is lights those pixels whether or not
 * the comet itself is drawn - which is exactly the confusion this test exists
 * to avoid. Parked in a corner of the canvas with nothing in it.
 */
async function parkPointer(page, box) {
  await page.mouse.move(
    Math.round(box.x + 12),
    Math.round(box.y + box.height - 12)
  );
}

/**
 * Dispatch a long press on the canvas at a CSS point, and say whether it armed.
 *
 * Dispatched rather than driven through page.touchscreen, whose tap is far too
 * short for the hold timer that arms placement.
 */
function longPressAttempt(page, cx, cy) {
  return page.evaluate(
    async ([x, y]) => {
      const canvas = document.getElementById('simulationCanvas');
      const t = new Touch({
        identifier: 7,
        target: canvas,
        clientX: x,
        clientY: y,
      });
      const armed = new Promise(resolve => {
        window.addEventListener('gravitasPlacementArmed', () => resolve(true), {
          once: true,
        });
        setTimeout(() => resolve(false), 1500);
      });
      canvas.dispatchEvent(
        new TouchEvent('touchstart', {
          bubbles: true,
          cancelable: true,
          touches: [t],
          targetTouches: [t],
          changedTouches: [t],
        })
      );
      const result = await armed;
      canvas.dispatchEvent(
        new TouchEvent('touchend', {
          bubbles: true,
          cancelable: true,
          touches: [],
          targetTouches: [],
          changedTouches: [t],
        })
      );
      return result;
    },
    [cx, cy]
  );
}

/** Long-press to arm, drag by a few pixels, release. */
async function longPressAndDrag(page, cx, cy, dx, dy) {
  const armed = await page.evaluate(
    async ([x, y]) => {
      const canvas = document.getElementById('simulationCanvas');
      const t = new Touch({
        identifier: 9,
        target: canvas,
        clientX: x,
        clientY: y,
      });
      const held = new Promise(resolve => {
        window.addEventListener('gravitasPlacementArmed', () => resolve(true), {
          once: true,
        });
        setTimeout(() => resolve(false), 3000);
      });
      canvas.dispatchEvent(
        new TouchEvent('touchstart', {
          bubbles: true,
          cancelable: true,
          touches: [t],
          targetTouches: [t],
          changedTouches: [t],
        })
      );
      return held;
    },
    [cx, cy]
  );
  if (!armed) throw new Error('the long press did not arm placement');

  await page.evaluate(
    async ([x, y, ddx, ddy]) => {
      const canvas = document.getElementById('simulationCanvas');
      const at = (mx, my) =>
        new Touch({ identifier: 9, target: canvas, clientX: mx, clientY: my });
      const fire = (type, touches, changed) =>
        canvas.dispatchEvent(
          new TouchEvent(type, {
            bubbles: true,
            cancelable: true,
            touches,
            targetTouches: touches,
            changedTouches: changed,
          })
        );
      const moved = at(x + ddx, y + ddy);
      fire('touchmove', [moved], [moved]);
      fire('touchend', [], [moved]);
    },
    [cx, cy, dx, dy]
  );
}

for (const tier of ['full', 'low']) {
  test(`a comet placed with the mouse is added and drawn (${tier} quality)`, async ({
    page,
    app,
  }) => {
    await app.boot({ qualityTier: tier });
    await emptyPausedWorld(page);
    await armFromPicker(page, 'Comet');

    const box = await page.locator('#simulationCanvas').boundingBox();
    // Away from the rail on the right and the transport bar at the bottom.
    const x = Math.round(box.x + box.width * 0.32);
    const y = Math.round(box.y + box.height * 0.42);

    await paint(page);
    const before = await brightnessAt(page, x, y);
    const cometsBefore = await cometCount(page);

    // Press, small drag for a velocity, release: the placement gesture.
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 6, y + 4, { steps: 3 });
    await page.mouse.up();

    expect(await cometCount(page)).toBe(cometsBefore + 1);

    await parkPointer(page, box);
    await paint(page);
    const after = await brightnessAt(page, x, y);

    // The nucleus and its coma are pale on a near-black sky, so this is a
    // large, unambiguous change rather than a threshold to tune.
    expect(after.lit).toBeGreaterThan(before.lit);
    expect(after.mean).toBeGreaterThan(before.mean);
  });
}

test('the comet is drawn where it was placed, not somewhere else', async ({
  page,
  app,
}) => {
  // The second defect: Comet.draw() converted to screen coordinates inside a
  // context the render pass had already transformed, which puts the comet at
  // roughly zoom*pos + pan + half a canvas. With one comet in an empty world,
  // "is anything lit near it" and "is anything lit far from it" separate the
  // two answers completely.
  await app.boot();
  await emptyPausedWorld(page);
  await armFromPicker(page, 'Comet');

  const box = await page.locator('#simulationCanvas').boundingBox();
  const x = Math.round(box.x + box.width * 0.3);
  const y = Math.round(box.y + box.height * 0.35);

  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 5, y + 5, { steps: 2 });
  await page.mouse.up();
  expect(await cometCount(page)).toBe(1);

  await parkPointer(page, box);
  await paint(page);
  const here = await brightnessAt(page, x, y);
  expect(here.lit).toBeGreaterThan(0);
});

test('a comet is big enough on screen to select by clicking it', async ({
  page,
  app,
}) => {
  await app.boot();
  await emptyPausedWorld(page);
  await armFromPicker(page, 'Comet');

  const box = await page.locator('#simulationCanvas').boundingBox();
  const x = Math.round(box.x + box.width * 0.36);
  const y = Math.round(box.y + box.height * 0.46);

  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 4, y + 3, { steps: 2 });
  await page.mouse.up();
  expect(await cometCount(page)).toBe(1);

  // Clicking the same point selects it. Its physical radius is a fraction of a
  // world unit, so this only works because drawing and hit-testing share a
  // screen-space floor.
  await page.mouse.click(x, y);
  const selected = await page.evaluate(async () => {
    const ui = await import('/js/ui.js');
    const sel = ui.state.selectedObject;
    return sel ? { type: sel.type, objType: sel.object?.obj_type } : null;
  });
  expect(selected).not.toBeNull();
  expect(selected.objType).toBe('Comet');
});

for (const tier of ['full', 'low']) {
  test(`a comet placed by touch is added and drawn (${tier} quality)`, async ({
    page,
    app,
  }) => {
    await app.boot({ qualityTier: tier });
    await emptyPausedWorld(page);
    await armFromPicker(page, 'Comet');

    const box = await page.locator('#simulationCanvas').boundingBox();
    const x = Math.round(box.x + box.width * 0.4);
    const y = Math.round(box.y + box.height * 0.5);

    await paint(page);
    const before = await brightnessAt(page, x, y);

    // Touch placement needs a long press to arm, then a drag, then a release.
    // Dispatched rather than driven through page.touchscreen, which sends a tap
    // too short for the hold timer.
    const armed = await page.evaluate(
      async ([cx, cy]) => {
        const canvas = document.getElementById('simulationCanvas');
        // Real Touch objects: TouchEventInit refuses plain ones.
        const touch = id =>
          new Touch({
            identifier: id,
            target: canvas,
            clientX: cx,
            clientY: cy,
          });
        const fire = (type, touches, changed) =>
          canvas.dispatchEvent(
            new TouchEvent(type, {
              bubbles: true,
              cancelable: true,
              touches,
              targetTouches: touches,
              changedTouches: changed ?? touches,
            })
          );
        const held = new Promise(resolve => {
          window.addEventListener(
            'gravitasPlacementArmed',
            () => resolve(true),
            {
              once: true,
            }
          );
          setTimeout(() => resolve(false), 3000);
        });
        fire('touchstart', [touch(1)], [touch(1)]);
        return held;
      },
      [x, y]
    );
    expect(armed).toBe(true);

    await page.evaluate(
      async ([cx, cy]) => {
        const canvas = document.getElementById('simulationCanvas');
        const at = (id, dx, dy) =>
          new Touch({
            identifier: id,
            target: canvas,
            clientX: cx + dx,
            clientY: cy + dy,
          });
        const fire = (type, touches, changed) =>
          canvas.dispatchEvent(
            new TouchEvent(type, {
              bubbles: true,
              cancelable: true,
              touches,
              targetTouches: touches,
              changedTouches: changed ?? touches,
            })
          );
        fire('touchmove', [at(1, 6, 4)], [at(1, 6, 4)]);
        fire('touchend', [], [at(1, 6, 4)]);
      },
      [x, y]
    );

    expect(await cometCount(page)).toBe(1);

    await paint(page);
    const after = await brightnessAt(page, x, y);
    expect(after.lit).toBeGreaterThan(before.lit);
  });
}

test('the scenario comets nobody could see are on screen now', async ({
  page,
  app,
}) => {
  // The Solar System scenario has built ten comets all along - num_comets: 10
  // in js/scenarios.js - and not one of them was ever painted.
  await app.boot();
  await app.loadScenario('Solar System', 'comet-scenario');
  const count = await cometCount(page);
  expect(count).toBeGreaterThan(0);

  const drawn = await page.evaluate(async () => {
    const p = await import('/js/physics.js');
    const ui = await import('/js/ui.js');
    // Count the comets that actually paint: a body whose draw is never called
    // cannot increment this.
    let calls = 0;
    for (const c of p.comets) {
      const original = c.draw.bind(c);
      c.draw = ctx => {
        calls++;
        return original(ctx);
      };
    }
    ui.state.paused = true;
    await new Promise(r =>
      window.requestAnimationFrame(() =>
        window.requestAnimationFrame(() => r())
      )
    );
    return calls;
  });
  expect(drawn).toBeGreaterThan(0);
});

for (const tier of ['full', 'low']) {
  test(`a touch release gives the comet the velocity the drag described (${tier} quality)`, async ({
    page,
    app,
  }) => {
    // The release point used to go into screen_to_world as raw clientX/clientY,
    // which that function reads as canvas pixels. The press was converted and
    // the release was not, so the difference between them - which is the
    // velocity - picked up the whole conversion error. At the low tier, where
    // the backing store is 0.7 of the CSS box, a six-pixel nudge became a
    // several-hundred-unit throw.
    await app.boot({ qualityTier: tier });
    await emptyPausedWorld(page);
    await armFromPicker(page, 'Comet');

    const box = await page.locator('#simulationCanvas').boundingBox();
    const x = Math.round(box.x + box.width * 0.55);
    const y = Math.round(box.y + box.height * 0.6);

    await longPressAndDrag(page, x, y, 6, 4);
    expect(await cometCount(page)).toBe(1);

    const speed = await page.evaluate(async () => {
      const p = await import('/js/physics.js');
      const c = p.comets[0];
      return Math.hypot(c.vel.x, c.vel.y);
    });

    // Six CSS pixels of drag at this zoom is a handful of world units, tripled.
    // The bound is loose enough not to encode the exact arithmetic and tight
    // enough that the conversion error - two orders of magnitude larger - has
    // nowhere to hide.
    expect(speed).toBeLessThan(60);
  });
}

test('a touch over the transport bar does not place anything', async ({
  page,
  app,
}) => {
  // The guard that stops a touch on the chrome from reaching the canvas asks
  // document.elementFromPoint, which is a DOM API and takes CSS pixels. It was
  // being handed canvas pixels, so at the low tier it asked about a different
  // place on the screen than the finger was.
  await app.boot({ qualityTier: 'low' });
  await emptyPausedWorld(page);
  await armFromPicker(page, 'Comet');

  const bar = await page.locator('#timelineBar').boundingBox();
  expect(bar).not.toBeNull();
  const x = Math.round(bar.x + bar.width / 2);
  const y = Math.round(bar.y + bar.height / 2);

  const armed = await longPressAttempt(page, x, y);
  expect(armed).toBe(false);
  expect(await cometCount(page)).toBe(0);
});
