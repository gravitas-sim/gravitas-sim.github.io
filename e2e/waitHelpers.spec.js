// =============================================================================
// The app-state waits are real waits
// -----------------------------------------------------------------------------
// app.waitForFrames and app.waitForBodies used to hand page.waitForFunction an
// async predicate. A promise is truthy, so Playwright took the first poll for
// success whatever the application held, and every spec that called them was
// waiting for nothing: waitForFrames(200) returned after five steps.
//
// These tests run the helpers against a page that is not the application. The
// page serves its own /js/ui.js and /js/physics.js, whose state changes only
// after a delay the test chooses, and each test asserts what the world looks
// like when the helper returns. The modules do not run until the helper first
// imports them, so a helper that returns early returns on a world that has not
// yet changed, and the assertion fails. The other half is the failure path: a
// condition that never comes must make the helper throw, saying what it saw.
// =============================================================================

import { test, expect } from './fixtures.js';

/**
 * Serve a page whose /js/ui.js and /js/physics.js are the fixture's.
 *
 * @param {import('@playwright/test').Page} page - The page under test
 * @param {object} modules - Source text of each module
 * @param {string} modules.ui - /js/ui.js
 * @param {string} modules.physics - /js/physics.js
 */
async function serveFixture(page, { ui, physics }) {
  const js = body => ({ contentType: 'text/javascript', body });
  await page.route('**/js/ui.js', route => route.fulfill(js(ui)));
  await page.route('**/js/physics.js', route => route.fulfill(js(physics)));
  await page.route('**/wait-fixture.html', route =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><meta charset="utf-8"><title>wait fixture</title>',
    })
  );
  await page.goto('/wait-fixture.html');
}

/** A /js/ui.js whose counter starts after `after` ms, one step per `every`. */
const counter = ({ after, every, paused = false }) => `
  export const state = { frame_count: 0, paused: ${paused} };
  setTimeout(() => {
    setInterval(() => { state.frame_count += 1; }, ${every});
  }, ${after});
`;

/**
 * A /js/physics.js with the nine lists, reassigned (as the real module
 * reassigns them on a rebuild) when each entry of `arrivals` comes due.
 */
const world = arrivals => `
  export let bh_list = [], stars = [], planets = [], gas_giants = [],
    asteroids = [], comets = [], neutron_stars = [], white_dwarfs = [],
    galaxies = [];
  ${arrivals
    .map(
      ({ list, after }) =>
        `setTimeout(() => { ${list} = [...${list}, {}]; }, ${after});`
    )
    .join('\n')}
`;

const NO_PHYSICS = world([]);
/** A /js/ui.js whose counter never moves, in a paused simulation. */
const STALLED = 'export const state = { frame_count: 0, paused: true };';

test.describe('waitForFrames', () => {
  test('returns only once the counter has advanced by the count asked for', async ({
    page,
    app,
  }) => {
    await serveFixture(page, {
      ui: counter({ after: 400, every: 10 }),
      physics: NO_PHYSICS,
    });
    await app.waitForFrames(25);
    const frames = await page.evaluate(
      async () => (await import('/js/ui.js')).state.frame_count
    );
    // Not returned on the first poll, which would read 0.
    expect(frames).toBeGreaterThanOrEqual(25);
  });

  test('advanceFrames is the same wait', async ({ page, app }) => {
    await serveFixture(page, {
      ui: counter({ after: 300, every: 10 }),
      physics: NO_PHYSICS,
    });
    await app.advanceFrames(20);
    const frames = await page.evaluate(
      async () => (await import('/js/ui.js')).state.frame_count
    );
    expect(frames).toBeGreaterThanOrEqual(20);
  });

  test('throws, naming the counter and the pause, when it never advances', async ({
    page,
    app,
  }) => {
    await serveFixture(page, { ui: STALLED, physics: NO_PHYSICS });
    const started = Date.now();
    await expect(app.waitForFrames(5, { timeout: 400 })).rejects.toThrow(
      /waitForFrames\(5\): the frame counter went from 0 to 0 in 400 ms \(paused: true\)/
    );
    // It waited out the timeout rather than failing at once.
    expect(Date.now() - started).toBeGreaterThanOrEqual(350);
  });

  test('throws when the counter moves but not far enough', async ({
    page,
    app,
  }) => {
    // One step every 100 ms: 3 or 4 steps in 400 ms, 50 asked for.
    await serveFixture(page, {
      ui: counter({ after: 0, every: 100 }),
      physics: NO_PHYSICS,
    });
    await expect(app.waitForFrames(50, { timeout: 400 })).rejects.toThrow(
      /waitForFrames\(50\): the frame counter went from 0 to [1-9]/
    );
  });
});

test.describe('waitForBodies', () => {
  test('returns only once the world holds a body', async ({ page, app }) => {
    await serveFixture(page, {
      ui: counter({ after: 0, every: 10 }),
      physics: world([{ list: 'planets', after: 400 }]),
    });
    await app.waitForBodies();
    const planets = await page.evaluate(
      async () => (await import('/js/physics.js')).planets.length
    );
    expect(planets).toBe(1);
  });

  test('counts across lists and waits for the last of them', async ({
    page,
    app,
  }) => {
    await serveFixture(page, {
      ui: counter({ after: 0, every: 10 }),
      physics: world([
        { list: 'planets', after: 150 },
        { list: 'galaxies', after: 600 },
      ]),
    });
    await app.waitForBodies(2);
    const held = await page.evaluate(async () => {
      const p = await import('/js/physics.js');
      return { planets: p.planets.length, galaxies: p.galaxies.length };
    });
    expect(held).toEqual({ planets: 1, galaxies: 1 });
  });

  test('throws, naming the count, when the world stays empty', async ({
    page,
    app,
  }) => {
    await serveFixture(page, {
      ui: counter({ after: 0, every: 10 }),
      physics: NO_PHYSICS,
    });
    const started = Date.now();
    await expect(app.waitForBodies(1, { timeout: 400 })).rejects.toThrow(
      /waitForBodies\(1\): the body count was 0 after 400 ms \(wanted 1\)/
    );
    expect(Date.now() - started).toBeGreaterThanOrEqual(350);
  });

  test('throws when the world fills short of the count asked for', async ({
    page,
    app,
  }) => {
    await serveFixture(page, {
      ui: counter({ after: 0, every: 10 }),
      physics: world([{ list: 'stars', after: 100 }]),
    });
    await expect(app.waitForBodies(2, { timeout: 400 })).rejects.toThrow(
      /waitForBodies\(2\): the body count was 1 after 400 ms \(wanted 2\)/
    );
  });
});
