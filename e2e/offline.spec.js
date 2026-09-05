// =============================================================================
// Offline, and the quality tier
// -----------------------------------------------------------------------------
// Two features that only mean anything under conditions a normal test never
// creates: no network, and not enough CPU. Both are reachable from Playwright -
// one through the context, one through the CDP throttle - so both are tested
// rather than asserted about.
//
// The scenario being defended is a specific one. A class is twenty minutes into
// a lesson on a school connection that drops, on a machine bought in 2019. What
// has to survive is the application, the lesson they are in, the lesson they
// switch to next, and a frame rate that is worth looking at.
//
// This file opts back in to service workers. The rest of the suite blocks them
// - see the comment in playwright.config.js - because a cache is a variable and
// only these tests want it.
// =============================================================================

import { test, expect } from './fixtures.js';

/* global fetch */

test.use({ serviceWorkers: 'allow' });

/** Wait until the worker reports the whole precache is present. */
async function waitForPrecache(page, timeout = 60_000) {
  const deadline = Date.now() + timeout;
  let last = null;
  while (Date.now() < deadline) {
    last = await page.evaluate(async () => {
      const m = await import('/js/offline.js');
      return m.cacheStatus(2000);
    });
    if (last && last.cachedCount >= last.precacheCount) return last;
    await page.waitForTimeout(500);
  }
  throw new Error(
    `The precache never completed. Last status: ${JSON.stringify(last)}`
  );
}

test.describe('the application survives the network going away', () => {
  test('it boots, runs and stays styled with no network at all', async ({
    page,
    context,
    app,
  }, testInfo) => {
    testInfo.setTimeout(180_000);

    await app.boot();
    const cached = await waitForPrecache(page);
    expect(cached.precacheCount).toBeGreaterThan(150);
    expect(cached.version).toMatch(/^gravitas-[0-9a-f]{12}$/);

    // The classroom moment.
    await context.setOffline(true);

    const errors = [];
    const failed = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('requestfailed', r => failed.push(new URL(r.url()).pathname));

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.splashScreenEnded === true, null, {
      timeout: 60_000,
    });

    // Running, not merely present.
    await app.waitForFrames(20);
    const world = await page.evaluate(async () => {
      const p = await import('/js/physics.js');
      const ui = await import('/js/ui.js');
      return {
        bodies: p.stars.length + p.planets.length + p.bh_list.length,
        frames: ui.state.frame_count,
      };
    });
    expect(world.bodies).toBeGreaterThan(0);
    expect(world.frames).toBeGreaterThan(10);

    // Styled. The first version of the worker precached `css/styles.css` while
    // index.html asks for `css/styles.css?v=3`, and cache.match is exact by
    // default - so the application booted offline with no stylesheets at all
    // and every one of the assertions above still passed.
    const styling = await page.evaluate(() => ({
      sheets: document.styleSheets.length,
      background: getComputedStyle(document.body).backgroundColor,
    }));
    expect(styling.sheets).toBeGreaterThanOrEqual(6);
    expect(styling.background).not.toBe('rgba(0, 0, 0, 0)');

    expect(errors).toEqual([]);
    expect(failed).toEqual([]);
  });

  test('a lesson nobody opened before the drop still opens after it', async ({
    page,
    context,
    app,
  }, testInfo) => {
    testInfo.setTimeout(180_000);

    await app.boot();
    await waitForPrecache(page);
    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.splashScreenEnded === true, null, {
      timeout: 60_000,
    });

    // Tides has not been fetched in this session. This is the case precaching
    // all twelve English bodies exists for: the lesson already open when the
    // wifi died is in the runtime cache anyway, and the one the teacher moves
    // to next is not.
    await page.evaluate(() => {
      window.location.hash = '#investigation=tides';
    });
    await expect(page.locator('#investigationPanel')).toBeVisible({
      timeout: 30_000,
    });
    const step = await page.evaluate(
      () => document.body.innerText.match(/STEP\s+\d+\s+OF\s+\d+/i)?.[0] || null
    );
    expect(step).toMatch(/STEP\s+1\s+OF/i);
  });

  test('the scenario thumbnails are there without a network', async ({
    page,
    context,
    app,
  }, testInfo) => {
    testInfo.setTimeout(180_000);
    await app.boot();
    await waitForPrecache(page);
    await context.setOffline(true);

    // Fetched rather than looked at: a broken <img> is invisible in a DOM
    // assertion, and the gallery is the thing that would be full of holes.
    const results = await page.evaluate(async () => {
      const names = [
        'kuiper-belt',
        'solar-system',
        'galactic-collision',
        'jupiter-trojans',
      ];
      const out = [];
      for (const n of names) {
        try {
          const r = await fetch(`/images/scenarios/${n}.webp`);
          out.push({ n, ok: r.ok, bytes: (await r.blob()).size });
        } catch (err) {
          out.push({ n, ok: false, error: String(err) });
        }
      }
      return out;
    });
    for (const r of results) {
      expect(r.ok, `${r.n} was not cached`).toBe(true);
      expect(r.bytes).toBeGreaterThan(1000);
    }
  });

  test('the cache is named for its contents, so a rebuild can invalidate it', async ({
    page,
    app,
  }) => {
    await app.boot();
    const status = await waitForPrecache(page);
    // The name is a content hash of every precached file. Asserting the shape
    // rather than the value: the value changes with every commit, and a test
    // that pinned it would be edited without being read.
    expect(status.version).toMatch(/^gravitas-[0-9a-f]{12}$/);
    expect(status.precacheBytes).toBeGreaterThan(4_000_000);

    const caches = await page.evaluate(() => window.caches.keys());
    // Exactly one. An activate that failed to delete its predecessors would
    // leave the browser holding several copies of a 5MB application.
    expect(caches.filter(n => n.startsWith('gravitas-'))).toHaveLength(1);
  });
});

test.describe('the quality tier is chosen from the frame rate', () => {
  test('a throttled machine is demoted, and the canvas shrinks with it', async ({
    page,
    context,
    app,
  }, testInfo) => {
    testInfo.setTimeout(180_000);

    await app.boot();
    await app.loadScenario('Solar System');
    await app.waitForFrames(30);

    // Full tier to begin with, on an unthrottled machine.
    const before = await page.evaluate(async () => {
      const q = await import('/js/quality.js');
      const c = document.getElementById('simulationCanvas');
      return { tier: q.currentTier(), width: c.width, css: window.innerWidth };
    });
    expect(before.tier).toBe('full');
    expect(before.width).toBe(before.css);

    // Six times slower. Applied after boot so it is the running application
    // being measured, not start-up.
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
    await page.evaluate(async () => {
      const q = await import('/js/quality.js');
      const ui = await import('/js/ui.js');
      // Take the measurement back. boot() pins the tier to 'full' so that the
      // rest of the suite is not a report on how loaded the runner is; this is
      // the one test that wants the sampler deciding.
      ui.SETTINGS.quality_tier = 'auto';
      q.resetSamples();
    });

    await expect
      .poll(
        async () =>
          page.evaluate(async () => {
            const q = await import('/js/quality.js');
            return q.currentTier();
          }),
        {
          timeout: 60_000,
          message:
            'the tier never dropped under a 6x CPU throttle - the classifier ' +
            'is not seeing the frame rate',
        }
      )
      .toBe('low');

    const after = await page.evaluate(async () => {
      const q = await import('/js/quality.js');
      const c = document.getElementById('simulationCanvas');
      return {
        tier: q.currentTier(),
        fps: q.measuredFps(),
        width: c.width,
        css: window.innerWidth,
        scale: q.renderScale(),
      };
    });
    expect(after.fps).toBeLessThan(32);
    // The resolution cap actually took effect, rather than only being decided.
    expect(after.width).toBeLessThan(after.css);
    expect(after.width / after.css).toBeCloseTo(after.scale, 1);

    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  });

  test('a click still lands on the body under it at the low tier', async ({
    page,
    app,
  }) => {
    // The reason a resolution cap is dangerous. The canvas is laid out by CSS
    // at 100% and its backing store is smaller, so a pointer event - which
    // arrives in CSS pixels - is no longer a canvas coordinate. If the
    // conversion in js/ui.js were missing, every click would land short and to
    // the left of where it was aimed, and nothing would throw.
    await app.boot();
    await page.evaluate(async () => {
      const q = await import('/js/quality.js');
      const ui = await import('/js/ui.js');
      ui.SETTINGS.quality_tier = 'low';
      q.setTier('low');
    });
    await app.loadScenario('Solar System');
    await app.waitForFrames(20);

    // Polled rather than read once. js/render.js defers the resize to the next
    // animation frame on purpose - reallocating three canvases mid-frame drops
    // exactly the frame the machine has just proved it cannot afford - so the
    // shrink is guaranteed to happen but not guaranteed to have happened yet.
    // Read synchronously, this passed on an idle machine and failed under a
    // loaded one, which is a test measuring the runner again.
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const c = document.getElementById('simulationCanvas');
            return c.width < window.innerWidth;
          }),
        { message: 'the low tier did not shrink the canvas' }
      )
      .toBe(true);

    // Put a body at a known place on screen, then click that place.
    const target = await page.evaluate(async () => {
      const p = await import('/js/physics.js');
      const ui = await import('/js/ui.js');
      const body = p.planets[0] || p.stars[0];
      if (!body) return null;
      // Centre the view on it so the click point is unambiguous.
      ui.state.pan = { x: 0, y: 0 };
      ui.state.zoom = 1;
      const canvas = document.getElementById('simulationCanvas');
      const rect = canvas.getBoundingClientRect();
      const utils = await import('/js/utils.js');
      const screen = utils.worldToScreen(body.pos, ui.state, canvas);
      // Canvas pixels back to CSS pixels, which is where a mouse lives.
      return {
        id: body.id,
        clientX: rect.left + (screen.x * rect.width) / canvas.width,
        clientY: rect.top + (screen.y * rect.height) / canvas.height,
      };
    });
    expect(target).not.toBeNull();

    await page.mouse.click(target.clientX, target.clientY);
    await page.waitForTimeout(500);

    const selected = await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      return ui.state.selectedObject?.object?.id ?? null;
    });
    expect(selected, 'the click missed the body it was aimed at').toBe(
      target.id
    );
  });

  test('hand-built systems keep every body at the low tier', async ({
    page,
    app,
  }) => {
    // The line the caps must not cross. A Laplace resonance with two of its
    // three moons removed is not a cheaper version of the lesson.
    await app.boot();

    const count = async (scenario, tier) =>
      page.evaluate(
        async ([k, t]) => {
          const q = await import('/js/quality.js');
          const ui = await import('/js/ui.js');
          const p = await import('/js/physics.js');
          q.setTier(t);
          ui.SETTINGS.quality_tier = t;
          ui.SETTINGS.preset_scenario = k;
          ui.initialize_simulation({ seed: 'caps' });
          const lists = [
            'bh_list',
            'stars',
            'planets',
            'gas_giants',
            'asteroids',
            'comets',
            'neutron_stars',
            'white_dwarfs',
            'galaxies',
          ];
          return lists.reduce((s, l) => s + (p[l] || []).length, 0);
        },
        [scenario, tier]
      );

    for (const scenario of [
      'Galilean Resonance',
      'TRAPPIST-1 System',
      'Solar System',
      'Milky Way Rotation',
    ]) {
      const full = await count(scenario, 'full');
      const low = await count(scenario, 'low');
      expect(low, `${scenario} lost bodies at the low tier`).toBe(full);
    }

    // And the generic populations do come down, or the tier would be doing
    // nothing where it matters most.
    const galacticFull = await count('Galactic Collision', 'full');
    const galacticLow = await count('Galactic Collision', 'low');
    expect(galacticLow).toBeLessThan(galacticFull / 2);
  });

  test("the tier never edits the reader's own settings", async ({
    page,
    app,
  }) => {
    // The bug this exists for shipped, and it was found by the world-
    // construction golden rather than by anything here. The caps were applied
    // by assigning them into the live SETTINGS, so building a world on a slow
    // machine permanently rewrote num_asteroids and trail_length - and SETTINGS
    // is the reader's document. It is what a share link serialises, what a
    // saved state restores, and what the A/B bench hashes to decide whether two
    // runs differ. A teacher on a 2019 Chromebook would have exported a capped
    // world to a class on faster machines without either side knowing.
    //
    // Asserted on the settings rather than on the bodies on purpose: the body
    // count is allowed to fall, that is the entire feature. The document is not.
    await app.boot();

    const keys = [
      'num_asteroids',
      'num_comets',
      'num_planets',
      'num_gas_giants',
      'num_micro_stars',
      'num_stars',
      'star_density',
      'trail_length',
    ];

    const result = await page.evaluate(async watched => {
      const q = await import('/js/quality.js');
      const ui = await import('/js/ui.js');
      const p = await import('/js/physics.js');

      // Galactic Collision, because it is a generic-placement scenario whose
      // populations genuinely exceed the caps - so the caps actually run.
      //
      // An earlier version of this test used Solar System, which is
      // hand-placed and therefore exempt, and so passed against the broken
      // code. The golden caught the leak on Solar System only because a
      // *previous* scenario in that run had already rewritten the shared
      // SETTINGS and the damage persisted into every build after it, which is
      // the leak in one sentence.
      ui.SETTINGS.preset_scenario = 'Galactic Collision';

      q.setTier('full');
      ui.initialize_simulation({ seed: 'no-edit' });
      const before = Object.fromEntries(watched.map(k => [k, ui.SETTINGS[k]]));
      const bodiesFull = p.asteroids.length + p.stars.length;

      q.setTier('low');
      ui.initialize_simulation({ seed: 'no-edit' });
      const after = Object.fromEntries(watched.map(k => [k, ui.SETTINGS[k]]));
      const bodiesLow = p.asteroids.length + p.stars.length;

      return { before, after, bodiesFull, bodiesLow };
    }, keys);

    // The document is untouched.
    expect(result.after).toEqual(result.before);
    // And the caps did reach the world - without this, the assertion above
    // could pass simply because they never ran.
    expect(result.bodiesLow).toBeLessThan(result.bodiesFull);
  });
});
