// =============================================================================
// Seeded worlds: the same seed builds the same world
// -----------------------------------------------------------------------------
// Moved out of sharing.spec.js, which judges the product through the DOM and
// runs against `dist/` too. A world's bodies at generation time (before any
// step) are not on the page, so this builds the world twice from one seed and
// compares body for body through `/js/`, against the sources only. It is the
// same test, still run with the browser suite; nothing was skipped to move it.
// =============================================================================

import { test, expect } from './fixtures.js';

test.describe('a seeded world', () => {
  test('the same seed builds the same world every time', async ({
    page,
    app,
  }) => {
    // What a seeded link actually relies on, tested without the timing race that
    // comparing a running simulation would introduce: build the world twice from
    // one seed, pausing before either is read, and compare body for body.
    //
    // This is a real regression risk rather than a hypothetical one. World
    // generation is only reproducible while initialize_simulation stays
    // synchronous; the moment any part of it awaits, two builds from one seed
    // diverge and every seeded link in circulation quietly starts showing a
    // different cluster.
    await app.boot();

    const buildAndRead = () =>
      page.evaluate(async () => {
        const ui = await import('/js/ui.js');
        const p = await import('/js/physics.js');
        ui.SETTINGS.preset_scenario = 'star-cluster';
        ui.initialize_simulation({ seed: 'determinism-check' });
        ui.state.paused = true;
        return [...p.stars, ...p.planets, ...p.bh_list].map(b => [
          b.mass,
          b.pos.x,
          b.pos.y,
          b.vel.x,
          b.vel.y,
        ]);
      });

    const first = await buildAndRead();
    const second = await buildAndRead();
    expect(first.length).toBeGreaterThan(5);
    expect(second).toEqual(first);

    // And a different seed gives a different world, or the seed is being ignored.
    const other = await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      const p = await import('/js/physics.js');
      ui.SETTINGS.preset_scenario = 'star-cluster';
      ui.initialize_simulation({ seed: 'a-different-seed' });
      ui.state.paused = true;
      return [...p.stars, ...p.planets, ...p.bh_list].map(b => [
        b.mass,
        b.pos.x,
        b.pos.y,
      ]);
    });
    expect(other).not.toEqual(first.map(([m, x, y]) => [m, x, y]));
  });
});
