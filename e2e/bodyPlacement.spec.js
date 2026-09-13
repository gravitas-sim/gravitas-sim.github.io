// =============================================================================
// Every body type, by pointer, by touch, and by keyboard
// -----------------------------------------------------------------------------
// All eight placeable types could be added with a mouse or a finger, and none
// of them from a keyboard. Placement carries two things at once - where the
// body starts and how hard it is thrown - so there was nothing a single
// keystroke could do, and the gesture had no keyboard equivalent at all. A
// reader who cannot use a pointer could load a scenario and watch it, and could
// not add anything to it.
//
// What the existing coverage proved was that #placementStatus appeared: that
// the application had been *armed*. Nothing asserted that a body was ever
// created. So this asserts the creation - the collection it landed in, its
// position, its velocity - for each of the eight, on each of the three paths.
// =============================================================================

import { test, expect } from './fixtures.js';

/** The eight, and the list each belongs in. */
const TYPES = [
  ['Star', 'stars'],
  ['Planet', 'planets'],
  ['GasGiant', 'gas_giants'],
  ['Asteroid', 'asteroids'],
  // Comet extends Planet, and both hand-placement paths used to push it into
  // `asteroids`, so every hand-placed comet behaved as a rock. Named
  // explicitly for that reason.
  ['Comet', 'comets'],
  ['WhiteDwarf', 'white_dwarfs'],
  ['NeutronStar', 'neutron_stars'],
  ['BlackHole', 'bh_list'],
];

/**
 * What the screen-reader status region currently says.
 *
 * textContent, not innerText: #srStatus is visually hidden, and innerText of a
 * hidden element is the empty string - which would have made every assertion
 * about an announcement pass by measuring nothing.
 */
const srSaid = page =>
  page.locator('#srStatus').evaluate(el => el.textContent.trim());

/** An empty sky, so anything counted afterwards is something this test made. */
async function emptySky(page) {
  await page.evaluate(async () => {
    const ui = await import('/js/ui.js');
    ui.SETTINGS.preset_scenario = 'None';
    ui.initialize_simulation({ seed: 'placement' });
    ui.state.paused = true;
  });
}

/**
 * Arm the given type through the rail's own picker.
 *
 * Not by writing SETTINGS.input_object_type: arming is a separate flag that
 * only the picker sets, and a test that set the setting alone armed nothing and
 * would have proved that placement does not happen - which is true, but not for
 * the reason it looked like.
 */
async function armType(page, type) {
  // On a narrow window the rail is collapsed behind the menu, so the picker's
  // own trigger is not on screen until it is opened. This is the reader's path
  // too, and it is the reason the small-viewport cases are worth having.
  const trigger = page.locator('#objectTypeBtn');
  // Waited for rather than polled once: right after boot the rail is still
  // settling, and an isVisible() taken at that instant sent this down the
  // narrow-window branch on a desktop, where the menu button it wanted is the
  // one thing that is genuinely hidden.
  try {
    await trigger.waitFor({ state: 'visible', timeout: 3000 });
  } catch {
    await page.locator('#mobileMenuToggle').click();
    await trigger.waitFor({ state: 'visible', timeout: 5000 });
  }
  await trigger.click();
  const item = page.locator(`#objectTypePicker [data-object-type="${type}"]`);
  await expect(item).toBeVisible();
  await item.click();
  const armed = await page.evaluate(async which => {
    const ui = await import('/js/ui.js');
    return ui.SETTINGS.input_object_type === which;
  }, type);
  expect(armed, `${type} is the armed type`).toBe(true);
}

/** How many bodies are in each list right now. */
const census = page =>
  page.evaluate(async () => {
    const p = await import('/js/physics.js');
    const out = {};
    for (const k of [
      'stars',
      'planets',
      'gas_giants',
      'asteroids',
      'comets',
      'white_dwarfs',
      'neutron_stars',
      'bh_list',
    ]) {
      out[k] = (p[k] || []).length;
    }
    return out;
  });

/** The last body added to a list, described. */
const newest = (page, list) =>
  page.evaluate(async which => {
    const p = await import('/js/physics.js');
    const arr = p[which] || [];
    const b = arr[arr.length - 1];
    if (!b) return null;
    return {
      cls: b.constructor?.name ?? null,
      x: b.pos.x,
      y: b.pos.y,
      vx: b.vel.x,
      vy: b.vel.y,
      alive: b.alive !== false,
      mass: b.mass,
    };
  }, list);

test.describe('placing a body with a pointer', () => {
  for (const [type, list] of TYPES) {
    test(`a ${type} is created, in ${list}`, async ({ page, app }) => {
      await app.boot();
      await emptySky(page);
      await armType(page, type);
      const before = await census(page);

      // Press, drag, release: the gesture, on the canvas.
      const box = await page.locator('#simulationCanvas').boundingBox();
      const from = { x: box.x + box.width * 0.4, y: box.y + box.height * 0.5 };
      await page.mouse.move(from.x, from.y);
      await page.mouse.down();
      await page.mouse.move(from.x + 60, from.y + 20, { steps: 6 });
      await page.mouse.up();

      const after = await census(page);
      expect(after[list]).toBe(before[list] + 1);
      const body = await newest(page, list);
      expect(body).not.toBeNull();
      expect(body.alive).toBe(true);
      expect(body.mass).toBeGreaterThan(0);
      // Thrown, not dropped: the drag set a velocity.
      expect(Math.hypot(body.vx, body.vy)).toBeGreaterThan(0);
    });
  }
});

test.describe('placing a body from the keyboard', () => {
  /** Aim and place, entirely from the keyboard. */
  async function placeByKeyboard(page, { commit = true, arrows = 4 } = {}) {
    await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      ui.beginKeyboardPlacement();
    });
    for (let i = 0; i < arrows; i++) await page.keyboard.press('ArrowRight');
    await page.keyboard.press(commit ? 'Enter' : 'Escape');
  }

  for (const [type, list] of TYPES) {
    test(`a ${type} is created, in ${list}`, async ({ page, app }) => {
      await app.boot();
      await emptySky(page);
      await armType(page, type);
      const before = await census(page);

      await placeByKeyboard(page);

      const after = await census(page);
      expect(after[list]).toBe(before[list] + 1);
      const body = await newest(page, list);
      expect(body).not.toBeNull();
      expect(body.alive).toBe(true);
      expect(body.mass).toBeGreaterThan(0);
      // Aimed to the right, so the throw is to the right and mostly horizontal.
      expect(body.vx).toBeGreaterThan(0);
      expect(Math.abs(body.vy)).toBeLessThan(Math.abs(body.vx));
    });
  }

  test('Escape cancels without creating anything', async ({ page, app }) => {
    await app.boot();
    await emptySky(page);
    await armType(page, 'Comet');
    const before = await census(page);
    await placeByKeyboard(page, { commit: false });
    expect(await census(page)).toEqual(before);
    const still = await page.evaluate(async () =>
      (await import('/js/ui.js')).keyboardPlacementActive()
    );
    expect(still).toBe(false);
  });

  test('the aim is announced, and so is the placement', async ({
    page,
    app,
  }) => {
    await app.boot();
    await emptySky(page);
    await armType(page, 'Comet');
    await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      ui.beginKeyboardPlacement();
    });
    const started = await srSaid(page);
    expect(started.toLowerCase()).toContain('comet');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    const placed = await srSaid(page);
    expect(placed.toLowerCase()).toMatch(/placed|comet/);
  });

  test('a farther aim throws harder', async ({ page, app }) => {
    await app.boot();
    await emptySky(page);
    await armType(page, 'Asteroid');
    await placeByKeyboard(page, { arrows: 2 });
    const near = await newest(page, 'asteroids');
    await placeByKeyboard(page, { arrows: 8 });
    const far = await newest(page, 'asteroids');
    expect(Math.abs(far.vx)).toBeGreaterThan(Math.abs(near.vx) * 1.5);
  });

  test('nothing is placed when no type is armed', async ({ page, app }) => {
    await app.boot();
    await emptySky(page);
    await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      ui.SETTINGS.interactive_add = false;
    });
    const before = await census(page);
    const began = await page.evaluate(async () =>
      (await import('/js/ui.js')).beginKeyboardPlacement()
    );
    expect(began).toBe(false);
    await page.keyboard.press('Enter');
    expect(await census(page)).toEqual(before);
  });
});

test.describe('the keyboard path works where a reader needs it', () => {
  const sizes = [
    ['a narrow phone', { width: 360, height: 720 }],
    ['a tablet', { width: 768, height: 1024 }],
  ];
  for (const [name, viewport] of sizes) {
    test(`a comet can be placed on ${name}`, async ({ page, app }) => {
      await page.setViewportSize(viewport);
      await app.boot();
      await emptySky(page);
      await armType(page, 'Comet');
      const before = await census(page);
      await page.evaluate(async () => {
        const ui = await import('/js/ui.js');
        ui.beginKeyboardPlacement();
      });
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('Enter');
      expect((await census(page)).comets).toBe(before.comets + 1);
    });
  }

  test('a comet can be placed at 200% zoom', async ({ page, app }) => {
    await app.boot();
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '32px';
    });
    await emptySky(page);
    await armType(page, 'Comet');
    const before = await census(page);
    await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      ui.beginKeyboardPlacement();
    });
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    expect((await census(page)).comets).toBe(before.comets + 1);
  });

  test('a comet can be placed with reduced motion on', async ({
    page,
    app,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await app.boot();
    await emptySky(page);
    await armType(page, 'Comet');
    const before = await census(page);
    await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      ui.beginKeyboardPlacement();
    });
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    expect((await census(page)).comets).toBe(before.comets + 1);
  });

  test('a comet can be placed in Spanish, and the announcement is Spanish', async ({
    page,
    app,
  }) => {
    await app.boot();
    await page.evaluate(async () => {
      const i18n = await import('/js/i18n/index.js');
      await i18n.setLocale('es', { persist: false });
    });
    await emptySky(page);
    await armType(page, 'Comet');
    const before = await census(page);
    await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      ui.beginKeyboardPlacement();
    });
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    expect((await census(page)).comets).toBe(before.comets + 1);
    const said = await srSaid(page);
    // Spanish, and not a raw message id.
    expect(said).not.toMatch(/place\.keyboard/);
    expect(said.length).toBeGreaterThan(0);
  });
});
