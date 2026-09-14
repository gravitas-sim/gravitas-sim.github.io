// =============================================================================
// The sandbox a lesson borrowed
// -----------------------------------------------------------------------------
// A lesson that stages its own scene tears down whatever the reader had built
// to make room for it. That is fine while the lesson is open and is not fine
// afterwards: the reader's own world is their work, and handing back an empty
// sky is the application throwing it away.
//
// These are browser tests because the claim is about the whole round trip -
// capture on the way in, stage, tear down, restore - and every part of it goes
// through js/ui.js. A unit test asserting that closing a lesson leaves zero
// stars does not demonstrate restoration; it demonstrates deletion, which is
// the failure.
//
// The world used here is deliberately not a scenario. It is bodies the test
// places itself, so "the sandbox came back" means those bodies came back and
// not that a scenario was rebuilt from its name.
// =============================================================================

import { test, expect } from './fixtures.js';

/** A world of the reader's own: three bodies at known places, none of them a scenario's. */
async function buildCustomSandbox(page) {
  return page.evaluate(async () => {
    const p = await import('/js/physics.js');
    const { state } = await import('/js/appState.js');
    for (const list of [
      p.stars,
      p.planets,
      p.gas_giants,
      p.asteroids,
      p.comets,
      p.bh_list,
      p.neutron_stars,
      p.white_dwarfs,
    ]) {
      list.length = 0;
    }
    const made = [];
    const star = new p.StarObject({ x: 0, y: 0 }, { x: 0, y: 0 }, 2);
    star.name = 'Reader Star';
    p.stars.push(star);
    made.push(star.name);
    for (const [i, r] of [220, 380].entries()) {
      const G = 2;
      const v = Math.sqrt((G * star.mass) / r);
      const planet = new p.Planet({ x: r, y: 0 }, { x: 0, y: v }, 1);
      planet.name = `Reader World ${i + 1}`;
      p.planets.push(planet);
      made.push(planet.name);
    }
    p.bumpWorldGeneration();
    state.paused = true;
    return made;
  });
}

const census = page =>
  page.evaluate(async () => {
    const p = await import('/js/physics.js');
    return [
      ...p.stars,
      ...p.planets,
      ...p.gas_giants,
      ...p.asteroids,
      ...p.comets,
      ...p.bh_list,
      ...p.neutron_stars,
      ...p.white_dwarfs,
    ].map(o => o.name);
  });

const openLesson = async (page, id) => {
  await page.evaluate(async lesson => {
    const loader = await import('/js/investigationsLoader.js');
    const mod = await loader.ensureInvestigations();
    await mod.openInvestigation(lesson);
  }, id);
  await expect(page.locator('#investigationPanel')).toBeVisible();
};

const closeLesson = async page => {
  await page.locator('#investigationClose').click();
  await expect(page.locator('#investigationPanel')).toBeHidden();
};

test.describe('a lesson gives the sandbox back', () => {
  test('a custom world survives a staged lesson', async ({ page, app }) => {
    test.slow();
    await app.boot();
    await page.waitForFunction(() => window.splashScreenEnded === true);
    const mine = await buildCustomSandbox(page);
    expect(await census(page)).toEqual(mine);

    // black-holes stages its own hole and four orbiters on every step, so it
    // destroys the sandbox rather than borrowing a scenario.
    await openLesson(page, 'black-holes');
    const during = await census(page);
    expect(during).not.toEqual(mine);
    expect(during.some(n => /Black Hole|Orbiter/.test(n))).toBe(true);

    await closeLesson(page);
    // The whole point. Not "no stars left" - those exact bodies, by name.
    await expect.poll(() => census(page), { timeout: 15_000 }).toEqual(mine);
  });

  test('nothing the lesson staged is left behind', async ({ page, app }) => {
    test.slow();
    await app.boot();
    await page.waitForFunction(() => window.splashScreenEnded === true);
    const mine = await buildCustomSandbox(page);
    await openLesson(page, 'black-holes');
    await closeLesson(page);
    const after = await census(page);
    // clearStage() used to remove from `stars` alone, so the four asteroid
    // orbiters and the hole itself stayed on the canvas beside the restored
    // world.
    expect(after.filter(n => /Orbiter|Black Hole/.test(n))).toEqual([]);
    expect(after).toEqual(mine);
  });

  test('the restored bodies are moving again, not frozen', async ({
    page,
    app,
  }) => {
    test.slow();
    await app.boot();
    await page.waitForFunction(() => window.splashScreenEnded === true);
    await buildCustomSandbox(page);
    await openLesson(page, 'black-holes');
    await closeLesson(page);

    const moved = await page.evaluate(async () => {
      const p = await import('/js/physics.js');
      const { state } = await import('/js/appState.js');
      state.paused = false;
      const world = p.planets.find(o => o.name === 'Reader World 1');
      if (!world) return null;
      const before = { x: world.pos.x, y: world.pos.y };
      for (let n = 0; n < 120; n++) p.updatePhysics(1 / 60);
      return Math.hypot(world.pos.x - before.x, world.pos.y - before.y);
    });
    // A body handed back still flagged model_owned is a body the integrator
    // will never touch again, and it looks exactly like a restored world until
    // somebody presses play.
    expect(moved).not.toBeNull();
    expect(moved).toBeGreaterThan(1);
  });

  test('opening and closing repeatedly does not accumulate or lose anything', async ({
    page,
    app,
  }) => {
    test.slow();
    await app.boot();
    await page.waitForFunction(() => window.splashScreenEnded === true);
    const mine = await buildCustomSandbox(page);
    for (let cycle = 0; cycle < 3; cycle++) {
      await openLesson(page, 'black-holes');
      await closeLesson(page);
      await expect.poll(() => census(page), { timeout: 15_000 }).toEqual(mine);
    }
  });

  test('a scenario the reader loads after closing is left alone', async ({
    page,
    app,
  }) => {
    test.slow();
    await app.boot();
    await page.waitForFunction(() => window.splashScreenEnded === true);
    await buildCustomSandbox(page);
    await openLesson(page, 'black-holes');
    await closeLesson(page);
    // The sandbox came back; now the reader deliberately goes somewhere else.
    await expect
      .poll(() => census(page), { timeout: 15_000 })
      .toContain('Reader Star');

    await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      ui.SETTINGS.preset_scenario = 'Solar System';
      ui.initialize_simulation();
    });
    const chosen = await census(page);
    expect(chosen).not.toContain('Reader Star');

    // Nothing the closed lesson left behind may reach back and replace it.
    // A restore that fired on a timer, or a probe tick that outlived the
    // panel, would show up here as the reader's choice being undone.
    await page.waitForTimeout(2000);
    expect(await census(page)).toEqual(chosen);
  });

  test('a lesson owns the canvas while it is open', async ({ page, app }) => {
    test.slow();
    await app.boot();
    await page.waitForFunction(() => window.splashScreenEnded === true);
    await buildCustomSandbox(page);
    await openLesson(page, 'black-holes');
    // Deliberate, and the other half of the rule above: while the panel is up
    // the step's scene is what the step is about, so a world replaced under it
    // is put back. What must not happen is the reader's own sandbox being the
    // thing that comes back - that is saved for the close.
    await page.evaluate(async () => {
      const p = await import('/js/physics.js');
      for (const list of [p.stars, p.planets, p.asteroids, p.bh_list]) {
        list.length = 0;
      }
      p.bumpWorldGeneration();
    });
    await expect
      .poll(() => census(page), { timeout: 15_000 })
      .toEqual(expect.arrayContaining(['Black Hole']));
    expect(await census(page)).not.toContain('Reader Star');
  });

  test('lesson progress survives the round trip @covers:ce.black-holes', async ({
    page,
    app,
  }) => {
    test.slow();
    await app.boot();
    await page.waitForFunction(() => window.splashScreenEnded === true);
    await buildCustomSandbox(page);
    await openLesson(page, 'black-holes');
    // Move off the first screen, so there is progress to lose.
    for (let n = 0; n < 3; n++) {
      await page.locator('#investigationNext').click({ timeout: 8000 });
      await page.waitForTimeout(250);
    }
    const reached = await page.locator('.inv-step-title').innerText();
    await closeLesson(page);
    await openLesson(page, 'black-holes');
    // Restoring the world must not restore the reader's place in the lesson to
    // the beginning: those are different kinds of state.
    await expect(page.locator('.inv-step-title')).toHaveText(reached);
  });
});

test.describe('what else comes back with the bodies', () => {
  test('the camera, the clock, the selection and the pause state', async ({
    page,
    app,
  }) => {
    test.slow();
    await app.boot();
    await page.waitForFunction(() => window.splashScreenEnded === true);
    await buildCustomSandbox(page);

    // A reader's context, not defaults: a particular view, a running clock, a
    // chosen body, and the transport left running.
    const before = await page.evaluate(async () => {
      const p = await import('/js/physics.js');
      const { state } = await import('/js/appState.js');
      const ui = await import('/js/ui.js');
      state.zoom = 2.75;
      state.pan = { x: 130, y: -70 };
      state.paused = false;
      for (let n = 0; n < 240; n++) p.updatePhysics(1 / 60);
      const world = p.planets.find(o => o.name === 'Reader World 2');
      ui.showObjectInspector?.(world, 'Planet');
      state.selectedObject = { object: world, type: 'Planet' };
      return {
        zoom: state.zoom,
        pan: { ...state.pan },
        paused: state.paused,
        selected: world.name,
        clock: p.getSimulationTime?.() ?? null,
      };
    });
    expect(before.selected).toBe('Reader World 2');

    await openLesson(page, 'black-holes');
    await closeLesson(page);
    await expect
      .poll(() => census(page), { timeout: 15_000 })
      .toContain('Reader Star');

    const after = await page.evaluate(async () => {
      const p = await import('/js/physics.js');
      const { state } = await import('/js/appState.js');
      return {
        zoom: state.zoom,
        pan: state.pan ? { ...state.pan } : null,
        paused: state.paused,
        selected: state.selectedObject?.object?.name ?? null,
        clock: p.getSimulationTime?.() ?? null,
      };
    });

    // The camera the reader framed, not the one the lesson left.
    expect(after.zoom).toBeCloseTo(before.zoom, 6);
    expect(after.pan.x).toBeCloseTo(before.pan.x, 6);
    expect(after.pan.y).toBeCloseTo(before.pan.y, 6);
    // The transport they left it on.
    expect(after.paused).toBe(before.paused);
    // The body they had open. Restored by id against the world that came
    // back, so it is the same object a measurement would have referred to.
    expect(after.selected).toBe('Reader World 2');
    // And the clock, where the payload supports it: a world restored at t=0
    // is a different world from one four seconds in.
    if (before.clock !== null && after.clock !== null) {
      expect(after.clock).toBeGreaterThan(0);
    }
  });
});
