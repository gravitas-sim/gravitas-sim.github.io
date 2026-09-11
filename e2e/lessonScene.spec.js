// =============================================================================
// A star in the scene and a point on a diagram, being one object
// -----------------------------------------------------------------------------
// The rules are unit-tested in tests/lessonBinding.test.js and the wiring in
// tests/lessonScene.test.js. What needs a browser is the claim those two
// cannot make: that the four surfaces a reader actually touches - the canvas,
// the accessible object list, the inspector card and the instrument - are
// showing the same object and move together.
//
// Everything below drives the shipped interface. Nothing reaches into the
// lesson engine to set state; the only evaluate() calls read what the
// application computed, which is the difference between testing the feature
// and testing the test.
// =============================================================================

import { test, expect } from './fixtures.js';

/**
 * A step whose instrument and whose star are the same object.
 *
 * Screen 8 of A Universe of Stars: the reader is asked to put the H-R cursor
 * where the Sun is, and the star standing on the canvas beside the diagram is
 * the point they are moving.
 */
const BOUND_STEP = '/?author=a-universe-of-stars&step=8';

const open = async (page, app) => {
  await app.boot();
  await page.goto(BOUND_STEP);
  // The application refuses to select anything while the splash is up, and
  // says so. Waiting for it is not test scaffolding: a reader cannot select a
  // body before then either.
  await page.waitForFunction(() => window.splashScreenEnded === true, {
    timeout: 20_000,
  });
  await expect(page.locator('.inv-step-title')).toHaveText('Find the Sun');
  await expect(page.locator('.inv-object')).toHaveCount(1);
};

/** What the star in the simulation currently is, straight off the body. */
const starState = page =>
  page.evaluate(async () => {
    const { stars } = await import('/js/physics.js');
    const s = stars[0];
    return {
      name: s?.name ?? null,
      teffK: s?.temperature ?? null,
      luminositySun: s?.luminosityInSuns ?? null,
      radiusSun: s?.radiusInSuns ?? null,
      ageYr: s?.ageYr ?? null,
      modelOwned: s?.model_owned ?? null,
      pos: s ? { x: s.pos.x, y: s.pos.y } : null,
    };
  });

/** Where the instrument's own point is, off the lab the widget is driving. */
const labPoint = page =>
  page.evaluate(async () => {
    const { activeLab } = await import('/js/stellarWidgets.js');
    const { selection } = await import('/js/stellarLab.js');
    const lab = activeLab();
    if (!lab) return null;
    const sel = selection(lab);
    return {
      mode: lab.mode,
      teffK: Math.round(sel.teffK),
      luminositySun: Number(sel.luminositySun.toFixed(3)),
      radiusSun: Number(sel.radiusSun.toFixed(3)),
      source: sel.source,
    };
  });

const selectedName = page =>
  page.evaluate(async () => {
    const { state } = await import('/js/appState.js');
    return state.selectedObject?.object?.name ?? null;
  });

test.describe('a bound star', () => {
  test('the lesson finds exactly one, and says which', async ({
    page,
    app,
  }) => {
    await open(page, app);
    const chip = page.locator('.inv-object');
    await expect(chip.locator('.inv-object-role')).toHaveText('cursor');
    await expect(chip.locator('.inv-object-name')).toHaveText('Your star');
    const problems = await page.evaluate(async () => {
      const m = await import('/js/lessonScene.js');
      return { bound: m.boundRoles(), problem: m.roleProblem('cursor') };
    });
    expect(problems).toEqual({ bound: ['cursor'], problem: null });
  });

  test('the model owns it, so the integrator leaves it alone', async ({
    page,
    app,
  }) => {
    await open(page, app);
    const before = await starState(page);
    expect(before.modelOwned).toBe(true);
    // Let the simulation run: a body the model owns must not drift.
    await page.evaluate(async () => {
      const { state } = await import('/js/appState.js');
      state.paused = false;
    });
    await page.waitForTimeout(1200);
    const after = await starState(page);
    expect(after.pos.x).toBeCloseTo(before.pos.x, 9);
    expect(after.pos.y).toBeCloseTo(before.pos.y, 9);
  });

  test('selecting it from the keyboard list moves the diagram to it', async ({
    page,
    app,
  }) => {
    await open(page, app);
    // The accessible path: a real button, reached and pressed by keyboard.
    await page.locator('.inv-object').press('Enter');
    await expect.poll(() => selectedName(page)).toBe('Your star');
    // And the keyboard is still on it afterwards, rather than back at the top
    // of the document, which is what selecting used to cost.
    await expect(page.locator('.inv-object')).toBeFocused();
    await expect(page.locator('.inv-object')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(await labPoint(page)).toMatchObject({
      teffK: 5772,
      luminositySun: 1,
      radiusSun: 1,
    });
  });

  test('and the instrument names the star it is showing', async ({
    page,
    app,
  }) => {
    await open(page, app);
    await page.locator('.inv-object').click();
    await expect(page.locator('#investigationTool')).toContainText(
      'Star in the scene'
    );
    await expect(page.locator('#investigationTool')).toContainText('Your star');
  });

  test('moving a model parameter moves the star, the card and the readout', async ({
    page,
    app,
  }) => {
    await open(page, app);
    await page.locator('.inv-object').click();
    const before = await starState(page);
    expect(before.teffK).toBeCloseTo(5772, 0);
    expect(before.radiusSun).toBeCloseTo(1, 2);

    // log10(10000) = 4: the temperature control is in log kelvin.
    const teff = page.locator('#invTool-teff');
    await teff.evaluate(el => {
      el.value = '4.0';
      el.dispatchEvent(new window.Event('input', { bubbles: true }));
    });

    // The star itself. Stefan-Boltzmann at fixed luminosity: the radius falls
    // as the square of the temperature ratio, (5772/10000)^2 = 0.333.
    await expect
      .poll(async () => (await starState(page)).teffK)
      .toBeGreaterThan(9900);
    const after = await starState(page);
    expect(after.radiusSun).toBeCloseTo(0.333, 2);

    // The instrument, reading the same state.
    expect(await labPoint(page)).toMatchObject({ teffK: 10024 });

    // The inspector card, which is the third view of it.
    await expect(page.locator('#objectInspector')).toContainText('10,000 K');
  });

  test('a free point fabricates no mass, age or lifetime', async ({
    page,
    app,
  }) => {
    await open(page, app);
    await page.locator('.inv-object').click();
    await page.locator('#invTool-teff').evaluate(el => {
      el.value = '4.2';
      el.dispatchEvent(new window.Event('input', { bubbles: true }));
    });
    await expect
      .poll(async () => (await starState(page)).teffK)
      .toBeGreaterThan(15000);
    // A temperature and a luminosity determine a radius and nothing else.
    expect((await starState(page)).ageYr).toBe(null);
    // The card would otherwise print a main-sequence lifetime derived from the
    // mass this body was built with, which is a true statement about a
    // different star.
    await expect(page.locator('#objectInspector')).toContainText(
      'not set by this model'
    );
  });

  test('closing the lesson takes the stage down with it', async ({
    page,
    app,
  }) => {
    // A staged step declares the whole scene, so leaving takes it away again:
    // a reader who closes a lesson gets their sandbox back, not a shelf of
    // somebody else's stars frozen in it.
    await open(page, app);
    expect((await starState(page)).modelOwned).toBe(true);
    await page.locator('#investigationClose').click();
    await expect
      .poll(async () =>
        page.evaluate(async () => (await import('/js/physics.js')).stars.length)
      )
      .toBe(0);
    await expect(page.locator('#investigationObjectsWrap')).toBeHidden();
  });

  test('the list follows the step, naming whatever that step stands up', async ({
    page,
    app,
  }) => {
    await open(page, app);
    await expect(page.locator('.inv-object .inv-object-role')).toHaveText(
      'cursor'
    );
    // Screen 9 is the same free cursor; screen 12 is the eight modelled stars.
    await page.goto('/?author=a-universe-of-stars&step=12');
    await page.waitForFunction(() => window.splashScreenEnded === true, {
      timeout: 20_000,
    });
    // The claim is that the list names every star the step stood up - not that
    // it happens to have eight rows, which is a fact about this step rather
    // than about the list.
    await expect
      .poll(async () =>
        page.evaluate(async () => {
          const { boundRoles } = await import('/js/lessonScene.js');
          const chips = [...document.querySelectorAll('.inv-object-role')].map(
            e => e.textContent
          );
          return { roles: boundRoles().join(','), chips: chips.join(',') };
        })
      )
      .toEqual({
        roles: 'm020,m050,m100,m200,m500,m1000,m2000,m4000',
        chips: 'm020,m050,m100,m200,m500,m1000,m2000,m4000',
      });
    expect(
      await page.evaluate(
        async () => (await import('/js/physics.js')).stars.length
      )
    ).toBe(8);
  });
});

test.describe('the layout holds where a reader has to use it', () => {
  for (const [name, width, height] of [
    ['a narrow phone', 390, 780],
    ['a tablet', 820, 1100],
  ]) {
    test(`the canvas, the lesson and the instrument all fit on ${name}`, async ({
      page,
      app,
    }) => {
      await page.setViewportSize({ width, height });
      await open(page, app);
      // Nothing may push the document sideways: a horizontal scrollbar is how
      // a panel that does not fit announces itself.
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth
      );
      expect(overflow).toBeLessThanOrEqual(1);
      await expect(page.locator('.inv-object')).toBeVisible();
      const box = await page.locator('.inv-object').boundingBox();
      // A 32-pixel target is the smallest this interface uses anywhere.
      expect(box.height).toBeGreaterThanOrEqual(32);
    });
  }

  test('and at 200% zoom', async ({ page, app }) => {
    await page.setViewportSize({ width: 640, height: 512 });
    await open(page, app);
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
    await expect(page.locator('.inv-object')).toBeVisible();
  });
});
