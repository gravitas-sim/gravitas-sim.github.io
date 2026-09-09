// =============================================================================
// The camera moves when it is told to, and not otherwise
// -----------------------------------------------------------------------------
// "The view sometimes jumps while using the Binary BH sandbox" turned out to be
// four separate mechanisms, and this file covers all of them from the outside.
//
//   1  Two touchend events under 500ms apart reset the zoom and the pan. The
//      two fingers leaving a pinch are exactly that.
//   2  The pinch anchored on raw clientX/clientY while comparing against a
//      worldToScreen result in canvas pixels. At the low quality tier the
//      backing store is 0.7 of the CSS box, so the anchor sat 40% away from the
//      fingers and the view slid on every move.
//   3  Follow mode assigned state.pan outright every physics step, so a drag
//      made while following was overwritten before the next frame.
//   4  An object reference frame tied to a black hole lost its origin the
//      instant that black hole merged, and the view snapped to the world
//      origin - tens of thousands of units away in this scenario, at exactly
//      the moment the reader was watching for.
//
// And one control: with nobody touching anything, the camera does not move at
// all in the default world frame.
// =============================================================================

import { test, expect } from './fixtures.js';

/** The camera, as the application holds it. */
const camera = page =>
  page.evaluate(async () => {
    const ui = await import('/js/ui.js');
    return {
      zoom: ui.state.zoom,
      panX: ui.state.pan.x,
      panY: ui.state.pan.y,
    };
  });

/**
 * Dispatch a touch sequence on the canvas.
 *
 * Real Touch objects and real TouchEvents, so the application's own listeners
 * run exactly as they do under a finger. `page.touchscreen` cannot express a
 * two-finger pinch.
 */
async function touchSequence(page, steps) {
  await page.evaluate(async frames => {
    const canvas = document.getElementById('simulationCanvas');
    const make = p =>
      new Touch({
        identifier: p.id,
        target: canvas,
        clientX: p.x,
        clientY: p.y,
      });
    for (const frame of frames) {
      const touches = (frame.touches || []).map(make);
      const changed = (frame.changed || frame.touches || []).map(make);
      canvas.dispatchEvent(
        new TouchEvent(frame.type, {
          bubbles: true,
          cancelable: true,
          touches,
          targetTouches: touches,
          changedTouches: changed,
        })
      );
      if (frame.wait) await new Promise(r => setTimeout(r, frame.wait));
    }
  }, steps);
}

/** Somewhere on the canvas, in CSS pixels. */
async function canvasPoints(page) {
  const box = await page.locator('#simulationCanvas').boundingBox();
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  return { box, cx, cy };
}

for (const tier of ['full', 'low']) {
  test(`ending a pinch does not reset the view (${tier} quality)`, async ({
    page,
    app,
  }) => {
    await app.boot({ qualityTier: tier });
    await app.setPaused(true);
    const { cx, cy } = await canvasPoints(page);

    // Put the camera somewhere unmistakably not the default, so a reset is
    // impossible to miss.
    await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      ui.state.zoom = 2.5;
      ui.state.pan = { x: 137, y: -84 };
    });
    const before = await camera(page);

    await touchSequence(page, [
      { type: 'touchstart', touches: [{ id: 1, x: cx - 60, y: cy }] },
      {
        type: 'touchstart',
        touches: [
          { id: 1, x: cx - 60, y: cy },
          { id: 2, x: cx + 60, y: cy },
        ],
        changed: [{ id: 2, x: cx + 60, y: cy }],
      },
      // Two moves: the first only records the baseline separation, so a pinch
      // that is one move long changes nothing.
      {
        type: 'touchmove',
        touches: [
          { id: 1, x: cx - 70, y: cy },
          { id: 2, x: cx + 70, y: cy },
        ],
      },
      {
        type: 'touchmove',
        touches: [
          { id: 1, x: cx - 90, y: cy },
          { id: 2, x: cx + 90, y: cy },
        ],
      },
      // Both fingers up, milliseconds apart: the sequence that used to reset.
      {
        type: 'touchend',
        touches: [{ id: 2, x: cx + 80, y: cy }],
        changed: [{ id: 1, x: cx - 80, y: cy }],
        wait: 10,
      },
      {
        type: 'touchend',
        touches: [],
        changed: [{ id: 2, x: cx + 80, y: cy }],
      },
    ]);

    const after = await camera(page);
    // The pinch itself legitimately changed the zoom; what must not have
    // happened is a snap back to the defaults.
    expect(after.zoom).not.toBe(1);
    expect(after.zoom).toBeGreaterThan(before.zoom);
    expect(Math.abs(after.panX) + Math.abs(after.panY)).toBeGreaterThan(0);
  });

  test(`the pinch anchor stays under the fingers (${tier} quality)`, async ({
    page,
    app,
  }) => {
    await app.boot({ qualityTier: tier });
    await app.setPaused(true);
    const { cx, cy } = await canvasPoints(page);

    /** The world point currently under a CSS-pixel screen position. */
    const worldUnder = (x, y) =>
      page.evaluate(
        async ([px, py]) => {
          const p = await import('/js/physics.js');
          const canvas = document.getElementById('simulationCanvas');
          const rect = canvas.getBoundingClientRect();
          const sx = canvas.width / rect.width;
          const sy = canvas.height / rect.height;
          return p.screen_to_world({
            x: (px - rect.left) * sx,
            y: (py - rect.top) * sy,
          });
        },
        [x, y]
      );

    const before = await worldUnder(cx, cy);

    await touchSequence(page, [
      { type: 'touchstart', touches: [{ id: 1, x: cx - 50, y: cy }] },
      {
        type: 'touchstart',
        touches: [
          { id: 1, x: cx - 50, y: cy },
          { id: 2, x: cx + 50, y: cy },
        ],
        changed: [{ id: 2, x: cx + 50, y: cy }],
      },
      // Symmetric spread about the same centre: whatever the zoom does, the
      // world point at that centre must not move.
      {
        type: 'touchmove',
        touches: [
          { id: 1, x: cx - 55, y: cy },
          { id: 2, x: cx + 55, y: cy },
        ],
      },
      {
        type: 'touchmove',
        touches: [
          { id: 1, x: cx - 62, y: cy },
          { id: 2, x: cx + 62, y: cy },
        ],
      },
      {
        type: 'touchmove',
        touches: [
          { id: 1, x: cx - 70, y: cy },
          { id: 2, x: cx + 70, y: cy },
        ],
      },
    ]);

    const zoomed = await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      return ui.state.zoom;
    });
    const after = await worldUnder(cx, cy);

    // It did zoom, so the anchoring assertion is about something that happened.
    expect(zoomed).toBeGreaterThan(1.0001);
    // And the point under the fingers is the same point. A CSS-versus-canvas
    // pixel mix-up moves it by tens of world units at the low tier.
    expect(Math.abs(after.x - before.x)).toBeLessThan(0.75);
    expect(Math.abs(after.y - before.y)).toBeLessThan(0.75);
  });
}

test('two unrelated touches do not reset the view', async ({ page, app }) => {
  await app.boot();
  await app.setPaused(true);
  // An empty world, so the touchstart handler's hit test has nothing to walk.
  //
  // The recogniser measures a real 250ms tap threshold against the page's own
  // clock, and everything the application does synchronously between the down
  // and the up counts against it - the hit test over every body most of all.
  // On a saturated runner that was enough to lose the gesture, which made this
  // a report on the machine rather than on the wiring. The thresholds
  // themselves are covered against an injected clock in tests/doubleTap.test.js.
  await page.evaluate(async () => {
    const ui = await import('/js/ui.js');
    ui.SETTINGS.preset_scenario = 'Empty';
    ui.initialize_simulation({ seed: 'tap' });
    ui.state.paused = true;
  });
  const { box } = await canvasPoints(page);

  await page.evaluate(async () => {
    const ui = await import('/js/ui.js');
    ui.state.zoom = 3;
    ui.state.pan = { x: -220, y: 65 };
  });
  const before = await camera(page);

  // Two taps in quick succession, far apart: two people, or one hand moving.
  // Time alone used to be the whole test.
  const a = {
    x: Math.round(box.x + box.width * 0.2),
    y: Math.round(box.y + box.height * 0.25),
  };
  const b = {
    x: Math.round(box.x + box.width * 0.8),
    y: Math.round(box.y + box.height * 0.75),
  };
  await touchSequence(page, [
    { type: 'touchstart', touches: [{ id: 1, x: a.x, y: a.y }], wait: 20 },
    {
      type: 'touchend',
      touches: [],
      changed: [{ id: 1, x: a.x, y: a.y }],
      wait: 60,
    },
    { type: 'touchstart', touches: [{ id: 2, x: b.x, y: b.y }], wait: 20 },
    { type: 'touchend', touches: [], changed: [{ id: 2, x: b.x, y: b.y }] },
  ]);

  expect(await camera(page)).toEqual(before);
});

test('two real taps in the same place still reset the view', async ({
  page,
  app,
}) => {
  // The gesture is kept, not removed: this is the other half of the change.
  await app.boot();
  await app.setPaused(true);
  // An empty world, so the touchstart handler's hit test has nothing to walk.
  //
  // The recogniser measures a real 250ms tap threshold against the page's own
  // clock, and everything the application does synchronously between the down
  // and the up counts against it - the hit test over every body most of all.
  // On a saturated runner that was enough to lose the gesture, which made this
  // a report on the machine rather than on the wiring. The thresholds
  // themselves are covered against an injected clock in tests/doubleTap.test.js.
  await page.evaluate(async () => {
    const ui = await import('/js/ui.js');
    ui.SETTINGS.preset_scenario = 'Empty';
    ui.initialize_simulation({ seed: 'tap' });
    ui.state.paused = true;
  });
  const { cx, cy } = await canvasPoints(page);

  await page.evaluate(async () => {
    const ui = await import('/js/ui.js');
    ui.state.zoom = 3;
    ui.state.pan = { x: -220, y: 65 };
  });

  await touchSequence(page, [
    { type: 'touchstart', touches: [{ id: 1, x: cx, y: cy }], wait: 30 },
    {
      type: 'touchend',
      touches: [],
      changed: [{ id: 1, x: cx, y: cy }],
      wait: 80,
    },
    {
      type: 'touchstart',
      touches: [{ id: 2, x: cx + 3, y: cy - 2 }],
      wait: 30,
    },
    {
      type: 'touchend',
      touches: [],
      changed: [{ id: 2, x: cx + 3, y: cy - 2 }],
    },
  ]);

  expect(await camera(page)).toEqual({ zoom: 1, panX: 0, panY: 0 });
});

/**
 * Start recording merge events in the page.
 *
 * Installed before anything is moved. Two black holes placed overlapping merge
 * on the next physics step, which arrives before a second round trip into the
 * page does, so a listener attached after the placement misses the event it is
 * waiting for. This is a listener in the test, not a hook in the product.
 */
const recordMerges = page =>
  page.evaluate(() => {
    window.__mergeEvents = [];
    window.addEventListener('gravitasMerge', e =>
      window.__mergeEvents.push(e.detail)
    );
  });

/**
 * Bring the two black holes together so they merge on the next few steps.
 *
 * The step is pinned small first, through the reader's own controls rather than
 * by touching the integrator. Two overlapping black holes at the natural frame
 * advance do not merge: the unsoftened force over a whole frame throws them
 * three thousand units apart before the merge check at the end of the step ever
 * looks at them. A small step keeps the encounter resolved, which is the same
 * reason the reliability check in the bench exists.
 *
 * @param {import('@playwright/test').Page} page - The page
 * @param {{x: number, y: number}} at - Where to put them, in world units
 * @returns {Promise<?{watched: number, other: number}>} The two ids
 */
const collideBlackHoles = (page, at) =>
  page.evaluate(async where => {
    const p = await import('/js/physics.js');
    const ui = await import('/js/ui.js');
    if (p.bh_list.length < 2) return null;
    ui.SETTINGS.max_timestep = 0.002;
    ui.SETTINGS.sim_speed = 0.2;
    p.updatePhysicsSettings(ui.SETTINGS);
    const [a, b] = p.bh_list;
    a.pos = { x: where.x, y: where.y };
    b.pos = { x: where.x + (a.radius + b.radius) * 0.5, y: where.y };
    a.vel = { x: 0, y: 0 };
    b.vel = { x: 0, y: 0 };
    return { watched: a.id, other: b.id };
  }, at);

/** The first merge that has been recorded, waiting for one if need be. */
async function firstMerge(page) {
  await page
    .waitForFunction(() => (window.__mergeEvents || []).length > 0, null, {
      timeout: 45_000,
    })
    .catch(() => {});
  return page.evaluate(() => (window.__mergeEvents || [])[0] ?? null);
}

test('Binary BH does not move the camera on its own', async ({ page, app }) => {
  await app.boot();
  await app.loadScenario('Binary BH', 'camera-drift');
  await app.waitForFrames(5);

  const before = await camera(page);
  // Long enough for the inspiral to be visibly under way, with no input at all.
  await app.waitForFrames(240);
  const after = await camera(page);

  expect(after).toEqual(before);
  // And the world frame is what this ran in, which is the default.
  const frame = await page.evaluate(async () => {
    const rf = await import('/js/referenceFrame.js');
    return rf.frameState();
  });
  expect(frame.mode).toBe('world');
});

test('a drag while Follow mode is on is kept, and following continues', async ({
  page,
  app,
}) => {
  // Driven by a fixed number of fixed-size steps rather than by wall-clock
  // frames.
  //
  // Two earlier versions of this test were reports on how loaded the runner
  // was. Follow mode resets the manual offset when the followed thing changes,
  // which is correct, and on a slow machine each frame covers more simulated
  // time - enough for Binary BH's pair to merge, or for a planet to be
  // absorbed, either of which legitimately changes the target mid-test. And
  // "the camera is still moving" needs the target to have moved, which a
  // wall-clock wait does not guarantee either.
  //
  // updatePhysics is where the follow step lives, so calling it directly
  // exercises exactly the code under test, and a small step over a short span
  // cannot merge anything.
  await app.boot();
  await app.loadScenario('Solar System', 'follow-offset');
  await app.setPaused(true);

  const step = (n, dt = 0.01) =>
    page.evaluate(
      async ([count, size]) => {
        const physics = await import('/js/physics.js');
        for (let i = 0; i < count; i++) physics.updatePhysics(size);
      },
      [n, dt]
    );

  await page.evaluate(async () => {
    const ui = await import('/js/ui.js');
    const physics = await import('/js/physics.js');
    ui.SETTINGS.follow_mode = 'Planet';
    physics.updatePhysicsSettings(ui.SETTINGS);
  });
  await step(20);

  /** Follow mode's accumulated manual offset. */
  const followOffset = () =>
    page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      return { ...ui.state.followOffset };
    });

  // Following, and nothing has been dragged yet.
  expect(await followOffset()).toEqual({ x: 0, y: 0 });
  const bodies = await page.evaluate(async () => {
    const physics = await import('/js/physics.js');
    return physics.planets.length;
  });
  expect(bodies).toBeGreaterThan(1);

  // A drag: the same thing the pointer handlers do.
  await page.evaluate(async () => {
    const ui = await import('/js/ui.js');
    ui.state.pan.x += 90;
    ui.state.pan.y -= 45;
  });

  const dragged = await camera(page);
  await step(120);
  const later = await camera(page);

  // The offset survived a hundred and twenty steps. Before this change the
  // very next one overwrote it outright, so the view fought the reader and
  // snapped back. Asserted on the offset rather than on the pan: the planets
  // are moving the whole time, so the pan legitimately is too.
  const offset = await followOffset();
  expect(offset.x).toBeCloseTo(90, 6);
  expect(offset.y).toBeCloseTo(-45, 6);

  // The target is the same one, so nothing was reset along the way.
  expect(
    await page.evaluate(async () => {
      const physics = await import('/js/physics.js');
      return physics.planets.length;
    })
  ).toBe(bodies);

  // And it is still following: the camera keeps moving with the planets rather
  // than sitting where the drag left it.
  expect(later).not.toEqual(dragged);

  // Reset view is a command, and clears the offset rather than absorbing it.
  await app.railControl('resetViewBtn');
  await page.locator('#resetViewBtn').click();
  const cleared = await page.evaluate(async () => {
    const ui = await import('/js/ui.js');
    return { ...ui.state.followOffset };
  });
  expect(cleared).toEqual({ x: 0, y: 0 });
});

test('a merger carries the reference frame onto the black hole it made', async ({
  page,
  app,
}, testInfo) => {
  testInfo.setTimeout(90_000);
  await app.boot();
  await app.loadScenario('Binary BH', 'merge-frame');

  // The recorder goes in first. The merge fires on the very next physics step
  // once the two overlap, which is sooner than a second round trip into the
  // page - a listener attached afterwards misses it every time.
  await recordMerges(page);

  // Frame on one of the two black holes FIRST. Once they are moved they merge
  // within a couple of steps, which is sooner than another round trip into the
  // page: a frame chosen afterwards is chosen after the event it is about.
  const ids = await page.evaluate(async () => {
    const p = await import('/js/physics.js');
    const rf = await import('/js/referenceFrame.js');
    if (p.bh_list.length < 2) return null;
    const [a, b] = p.bh_list;
    rf.setFrame(rf.OBJECT, a.id);
    return { watched: a.id, other: b.id };
  });
  expect(ids).not.toBeNull();

  // Positions are set directly rather than waiting out the inspiral: the merge
  // is what is being tested, not how long it takes to arrive.
  const setup = await collideBlackHoles(page, { x: 300, y: -200 });
  expect(setup).not.toBeNull();
  expect(setup.watched).toBe(ids.watched);

  const merged = await firstMerge(page);
  expect(merged).not.toBeNull();
  expect(merged.resultId).toBeDefined();
  expect(merged.resultId).not.toBeNull();

  const frame = await page.evaluate(async () => {
    const rf = await import('/js/referenceFrame.js');
    return rf.frameState();
  });
  // Still an object frame, now on the merger product rather than back at the
  // world origin thousands of units away.
  expect(frame.mode).toBe('object');
  expect(frame.objectId).toBe(merged.resultId);
  expect([setup.watched, setup.other]).not.toContain(frame.objectId);
});

test('a merger leaves a world-frame reader alone', async ({
  page,
  app,
}, testInfo) => {
  testInfo.setTimeout(90_000);
  await app.boot();
  await app.loadScenario('Binary BH', 'merge-world');

  await recordMerges(page);

  await page.evaluate(async () => {
    const rf = await import('/js/referenceFrame.js');
    rf.resetFrame();
  });
  const ok = await collideBlackHoles(page, { x: 260, y: 140 });
  expect(ok).not.toBeNull();

  const merged = await firstMerge(page);
  expect(merged).not.toBeNull();

  const frame = await page.evaluate(async () => {
    const rf = await import('/js/referenceFrame.js');
    return rf.frameState();
  });
  expect(frame).toEqual({ mode: 'world', objectId: null });
});
