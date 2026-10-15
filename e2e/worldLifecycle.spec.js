// =============================================================================
// The world's lifecycle: Save, Load, Reset all, rebuild requests, hand edits
// -----------------------------------------------------------------------------
// Build, clear, rebuild, save, load and share are one block of the application
// (js/world.js) with six pieces of live state of its own. The share round trip
// has its own spec (sharing.spec.js); this one holds the parts that had none:
// the Save and Load buttons, Reset all, the rebuild request other panels send,
// and the two events that mark a world as hand-edited.
//
// Every check reads the application's own state. Nothing waits on a timer: a
// Load is read in the same task as the click that runs it, because a running
// world moves on the next frame.
// =============================================================================

import { test, expect } from './fixtures.js';

const SAVE_KEY = 'gravitas_simulation_save';

/** The nine lists in the application's order, read through the live bindings. */
const LISTS = [
  'galaxies',
  'bh_list',
  'planets',
  'stars',
  'gas_giants',
  'asteroids',
  'comets',
  'neutron_stars',
  'white_dwarfs',
  'debris',
];

/** Every body, in the order the application lists them, as plain numbers. */
const bodies = page =>
  page.evaluate(async lists => {
    const ui = await import('/js/ui.js');
    const p = await import('/js/physics.js');
    return {
      bodies: lists
        .flatMap(k => p[k])
        .map(b => ({
          id: b.id,
          type: b.constructor.name,
          x: b.pos.x,
          y: b.pos.y,
          mass: b.mass,
        })),
      zoom: ui.state.zoom,
      pan: { ...ui.state.pan },
      paused: ui.state.paused,
    };
  }, LISTS);

const toastText = page => page.locator('#gravitasToast').textContent();

const message = (page, key) =>
  page.evaluate(async k => (await import('/js/i18n/index.js')).t(k), key);

test.describe('the world lifecycle', () => {
  test('Save keeps the world and Load puts back the same bodies and view', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.loadScenario('trappist-1-system', 'e2e', { run: false });
    await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      ui.state.zoom = 1.7;
      ui.state.pan = { x: 12, y: -8 };
    });
    const before = await bodies(page);
    expect(before.bodies.length).toBeGreaterThan(5);

    await app.railControl('saveBtn');
    await page.locator('#saveBtn').click();
    expect(await toastText(page)).toBe(await message(page, 'state.saved'));
    const saved = await page.evaluate(
      key => JSON.parse(localStorage.getItem(key)),
      SAVE_KEY
    );
    expect(saved.objects).toHaveLength(before.bodies.length);
    expect(saved.view).toEqual({ zoom: 1.7, pan: { x: 12, y: -8 } });

    // Blank Simulation empties every list and resets the view.
    await app.railControl('cleanSimBtn');
    await page.locator('#cleanSimBtn').click();
    expect((await bodies(page)).bodies).toHaveLength(0);

    // Click and read in one task: a world that runs moves on the next frame.
    const after = await page.evaluate(async lists => {
      const ui = await import('/js/ui.js');
      const p = await import('/js/physics.js');
      window.__resets = 0;
      window.addEventListener('gravitasSimulationReset', () => {
        window.__resets += 1;
      });
      document.getElementById('loadBtn').click();
      return {
        bodies: lists
          .flatMap(k => p[k])
          .map(b => ({
            id: b.id,
            type: b.constructor.name,
            x: b.pos.x,
            y: b.pos.y,
            mass: b.mass,
          })),
        zoom: ui.state.zoom,
        pan: { ...ui.state.pan },
        paused: ui.state.paused,
        resets: window.__resets,
        // A restored save is a hand-made world: a link of it carries bodies.
        linkCarriesBodies: Array.isArray(ui.captureShareState().b),
      };
    }, LISTS);
    expect(after.bodies).toEqual(before.bodies);
    expect(after.zoom).toBe(1.7);
    expect(after.pan).toEqual({ x: 12, y: -8 });
    expect(after.paused).toBe(false);
    expect(after.resets).toBe(1);
    expect(after.linkCarriesBodies).toBe(true);
    expect(await toastText(page)).toBe(await message(page, 'state.loaded'));
  });

  test('Load with nothing saved says so and leaves the world alone', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.loadScenario('trappist-1-system', 'e2e', { run: false });
    await page.evaluate(key => localStorage.removeItem(key), SAVE_KEY);
    const before = await bodies(page);

    await app.railControl('loadBtn');
    await page.locator('#loadBtn').click();

    expect(await toastText(page)).toBe(await message(page, 'state.none'));
    expect(await bodies(page)).toEqual(before);
  });

  test('Reset all returns to the default settings and the Binary BH world, running', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.loadScenario('binary-bh', 'e2e', { run: false });
    const binary = (await app.bodySnapshot()).count;

    await app.loadScenario('trappist-1-system', 'e2e', { run: false });
    const key = await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      const k = 'trail_length';
      ui.SETTINGS[k] = (ui.DEFAULT_SETTINGS[k] ?? 0) + 7;
      return k;
    });

    // Reset all builds on a fresh random seed and leaves the world running, so
    // the bodies it holds a frame later are not the bodies it built: a planet
    // a seed happens to put near one of the holes is absorbed within a few
    // frames, and a slow runner takes several simulated steps per frame. The
    // count is therefore read in the click's own task, after the button's
    // handler and before any frame, and the world is held there so the
    // snapshot below reads what was built. The state the button leaves is
    // read in the same task, which is also where "running" is true.
    await page.evaluate(
      async ({ k }) => {
        const ui = await import('/js/ui.js');
        const p = await import('/js/physics.js');
        window.__resetAll = null;
        const generation = p.getWorldGeneration();
        document.getElementById('resetAllBtn').addEventListener(
          'click',
          () => {
            window.__resetAll = {
              rebuilt: p.getWorldGeneration() > generation,
              scenario: ui.current_scenario_name,
              setting: ui.SETTINGS[k],
              wanted: ui.DEFAULT_SETTINGS[k],
              paused: ui.state.paused,
            };
            ui.state.paused = true;
          },
          { once: true }
        );
      },
      { k: key }
    );
    await app.railControl('resetAllBtn');
    await page.locator('#resetAllBtn').click();

    const result = await page.evaluate(() => window.__resetAll);
    expect(result).not.toBeNull();
    expect(result.rebuilt).toBe(true);
    expect(result.scenario).toBe('binary-bh');
    expect(result.setting).toBe(result.wanted);
    expect(result.paused).toBe(false);
    expect((await app.bodySnapshot()).count).toBe(binary);
  });

  test('a rebuild request from a panel rebuilds the scenario on a new seed and runs', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.loadScenario('trappist-1-system', 'e2e', { run: false });
    const before = await page.evaluate(async () => {
      const p = await import('/js/physics.js');
      const { getWorldSeed } = await import('/js/rng.js');
      p.planets.length = 0;
      return { planets: 0, seed: getWorldSeed() };
    });

    const after = await page.evaluate(async () => {
      const p = await import('/js/physics.js');
      const ui = await import('/js/ui.js');
      const { getWorldSeed } = await import('/js/rng.js');
      window.dispatchEvent(new window.CustomEvent('gravitasRequestRebuild'));
      return {
        planets: p.planets.length,
        seed: getWorldSeed(),
        paused: ui.state.paused,
        scenario: ui.current_scenario_name,
      };
    });
    expect(after.planets).toBeGreaterThan(before.planets);
    expect(after.seed).not.toBe(before.seed);
    expect(after.paused).toBe(false);
    expect(after.scenario).toBe('trappist-1-system');
  });

  test('placing a body or changing galaxy gravity makes a link carry the bodies', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.loadScenario('trappist-1-system', 'e2e', { run: false });

    const result = await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      const carries = () => Array.isArray(ui.captureShareState().b);
      const out = { fresh: carries() };

      // A mode the panel does not offer is ignored, and touches nothing.
      window.dispatchEvent(
        new window.CustomEvent('gravitasGalaxyGravityChanged', {
          detail: { mode: 'bogus' },
        })
      );
      out.afterBogus = carries();
      out.gravityAfterBogus = ui.SETTINGS.galaxy_gravity;

      window.dispatchEvent(
        new window.CustomEvent('gravitasGalaxyGravityChanged', {
          detail: { mode: 'mond' },
        })
      );
      out.afterMode = carries();
      out.gravity = ui.SETTINGS.galaxy_gravity;

      // A rebuild forgets the edit.
      ui.initialize_simulation({ seed: 'e2e' });
      out.afterRebuild = carries();

      window.dispatchEvent(
        new window.CustomEvent('gravitasObjectPlaced', {
          detail: { object: null },
        })
      );
      out.afterPlaced = carries();
      return out;
    });

    expect(result.fresh).toBe(false);
    expect(result.afterBogus).toBe(false);
    expect(result.gravityAfterBogus).not.toBe('bogus');
    expect(result.afterMode).toBe(true);
    expect(result.gravity).toBe('mond');
    expect(result.afterRebuild).toBe(false);
    expect(result.afterPlaced).toBe(true);
  });
});
