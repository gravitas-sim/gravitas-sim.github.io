// =============================================================================
// The sandbox's four resets say what they do, and do it
// -----------------------------------------------------------------------------
// Fit View to Bodies, Restart Scenario, Reset Settings and Scenario and Clear
// All Bodies differ in what they touch: the world, the settings, the camera, the
// clock, the seed and the pause. Each button's hint states those six, in both
// languages, and this file holds each statement to the world it describes: the
// state is read before the click and in the click's own task after it, so what
// is compared is what the button left and not what a frame later did to it.
// =============================================================================

import { test, expect } from './fixtures.js';

/**
 * Define window.__read in the page: the six effects, read synchronously through
 * handles taken first, so it can run inside a click without awaiting a frame.
 */
const install = () =>
  Promise.all([
    import('/js/ui.js'),
    import('/js/physics.js'),
    import('/js/rng.js'),
  ]).then(([ui, physics, rng]) => {
    window.__read = () => ({
      scenario: ui.current_scenario_name,
      seed: rng.getWorldSeed(),
      setting: ui.SETTINGS.trail_length,
      speed: ui.SETTINGS.sim_speed,
      zoom: ui.state.zoom,
      pan: { x: ui.state.pan.x, y: ui.state.pan.y },
      clock: physics.getSimulationTime(),
      paused: ui.state.paused,
      bodies: [
        'bh_list',
        'stars',
        'planets',
        'gas_giants',
        'asteroids',
        'comets',
        'neutron_stars',
        'white_dwarfs',
        'galaxies',
      ].reduce((n, k) => n + physics[k].length, 0),
      presetZoom: ui.SETTINGS.preset_zoom || 1.5,
      defaultSetting: ui.DEFAULT_SETTINGS.trail_length,
    });
  });

/**
 * Put the world in a recognisable state, press the button, and return the state
 * before and the state the button's own handler left.
 */
async function press(page, app, id) {
  await app.boot();
  await app.loadScenario('solar-system', 'e2e', { run: false });
  await page.evaluate(install);
  const loaded = await page.evaluate(() => window.__read());
  const scenarioBodies = loaded.bodies;
  const scenarioSetting = loaded.setting;
  await page.evaluate(async () => {
    const ui = await import('/js/ui.js');
    const physics = await import('/js/physics.js');
    ui.SETTINGS.trail_length = (ui.DEFAULT_SETTINGS.trail_length ?? 0) + 7;
    ui.SETTINGS.sim_speed = 2;
    ui.state.zoom = 0.31;
    ui.state.pan = { x: 40, y: -25 };
    // Paused, so the clock is where it is until the button is pressed.
    ui.state.paused = true;
    physics.updatePhysics(physics.DT);
  });
  // Something the reader added.
  const held = (await page.evaluate(() => window.__read())).bodies;
  await page.evaluate(async () => {
    const ui = await import('/js/ui.js');
    ui.placeBody({ x: 900, y: 900 }, { x: 0, y: 0 });
  });
  const before = await page.evaluate(() => window.__read());
  expect(before.bodies).toBe(held + 1);
  await app.railControl(id);
  // Same task as the handler: nothing has run a frame yet.
  await page.evaluate(buttonId => {
    document.getElementById(buttonId).addEventListener(
      'click',
      () => {
        window.__after = window.__read();
      },
      { once: true }
    );
  }, id);
  await page.locator(`#${id}`).click();
  const after = await page.evaluate(() => window.__after);
  return { before, after, scenarioBodies, scenarioSetting };
}

/** The statements each hint makes, as patterns, in each language. */
const STATES = {
  fit: {
    en: [
      /center the camera on the bodies/i,
      /zoom to fit/i,
      /bodies, settings, seed, clock and pause stay/i,
    ],
    es: [
      /centrar la cámara en los cuerpos/i,
      /ajustar el zoom/i,
      /los cuerpos, los ajustes, la semilla, el reloj y la pausa no cambian/i,
    ],
  },
  restart: {
    en: [
      /new seed/i,
      /added or changed bodies are gone/i,
      /settings return to those the scenario sets/i,
      /camera returns to its view/i,
      /clock to zero/i,
      /simulation runs/i,
    ],
    es: [
      /semilla nueva/i,
      /cuerpos añadidos o cambiados desaparecen/i,
      /ajustes vuelven a los del escenario/i,
      /cámara vuelve a su vista/i,
      /reloj a cero/i,
      /simulación corre/i,
    ],
  },
  resetAll: {
    en: [
      /every setting to its default/i,
      /Binary Black Hole/i,
      /new seed/i,
      /clock at zero/i,
      /simulation running/i,
    ],
    es: [
      /todos los ajustes a sus valores por defecto/i,
      /Agujeros negros binarios/i,
      /semilla nueva/i,
      /reloj a cero/i,
      /simulación en marcha/i,
    ],
  },
  clear: {
    en: [
      /remove every body/i,
      /settings, seed and clock stay/i,
      /camera and speed return to 1×/i,
      /simulation runs/i,
    ],
    es: [
      /quitar todos los cuerpos/i,
      /los ajustes, la semilla y el reloj se conservan/i,
      /cámara y la velocidad vuelven a 1×/i,
      /simulación corre/i,
    ],
  },
};

const HINT_KEY = {
  fit: 'rail.resetView.hint',
  restart: 'rail.refreshScenario.hint',
  resetAll: 'rail.resetAll.hint',
  clear: 'rail.cleanSim.hint',
};

const NAME_KEY = {
  fit: 'rail.resetView',
  restart: 'rail.refreshScenario',
  resetAll: 'rail.resetAll',
  clear: 'rail.cleanSim',
};

test.describe('the four resets: names and hints', () => {
  for (const [lang, names] of [
    [
      'en',
      [
        'Fit View to Bodies',
        'Restart Scenario',
        'Reset Settings and Scenario',
        'Clear All Bodies',
      ],
    ],
    [
      'es',
      [
        'Ajustar vista a los cuerpos',
        'Reiniciar escenario',
        'Restablecer ajustes y escenario',
        'Quitar todos los cuerpos',
      ],
    ],
  ]) {
    test(`${lang}: each name and hint states its effects`, async ({
      page,
      app,
    }) => {
      await app.boot();
      const said = await page.evaluate(
        async ({ lang, hintKeys, nameKeys }) => {
          const i18n = await import('/js/i18n/index.js');
          await i18n.setLocale(lang, { persist: false });
          const out = {};
          for (const [k, key] of Object.entries(hintKeys))
            out[k] = { hint: i18n.t(key), name: i18n.t(nameKeys[k]) };
          return out;
        },
        { lang, hintKeys: HINT_KEY, nameKeys: NAME_KEY }
      );
      const order = ['fit', 'restart', 'resetAll', 'clear'];
      order.forEach((k, i) => {
        expect(said[k].name).toBe(names[i]);
        for (const re of STATES[k][lang]) expect(said[k].hint).toMatch(re);
      });
    });
  }
});

test.describe('the four resets: what each one leaves', () => {
  test('Fit View to Bodies changes only the camera', async ({ page, app }) => {
    const { before, after } = await press(page, app, 'resetViewBtn');
    expect(after.bodies).toBe(before.bodies);
    expect(after.setting).toBe(before.setting);
    expect(after.seed).toBe(before.seed);
    expect(after.clock).toBe(before.clock);
    expect(after.paused).toBe(true);
    expect(after.scenario).toBe(before.scenario);
    expect(after.zoom).not.toBe(before.zoom);
    expect(after.pan).not.toEqual(before.pan);
  });

  test('Restart Scenario rebuilds on a new seed with its own settings', async ({
    page,
    app,
  }) => {
    const { before, after, scenarioBodies, scenarioSetting } = await press(
      page,
      app,
      'refreshScenarioBtn'
    );
    expect(after.scenario).toBe(before.scenario);
    expect(after.seed).not.toBe(before.seed);
    expect(after.bodies).toBe(scenarioBodies);
    expect(after.setting).toBe(scenarioSetting);
    expect(after.setting).not.toBe(before.setting);
    expect(after.zoom).toBe(before.presetZoom);
    expect(after.pan).toEqual({ x: 0, y: 0 });
    expect(after.clock).toBe(0);
    expect(after.paused).toBe(false);
  });

  test('Reset Settings and Scenario restores the defaults and Binary Black Hole', async ({
    page,
    app,
  }) => {
    const { before, after } = await press(page, app, 'resetAllBtn');
    expect(after.scenario).toBe('binary-bh');
    expect(after.seed).not.toBe(before.seed);
    expect(after.setting).toBe(before.defaultSetting);
    expect(after.zoom).toBe(after.presetZoom);
    expect(after.pan).toEqual({ x: 0, y: 0 });
    expect(after.clock).toBe(0);
    expect(after.paused).toBe(false);
  });

  test('Clear All Bodies empties the world and keeps settings, seed and clock', async ({
    page,
    app,
  }) => {
    const { before, after } = await press(page, app, 'cleanSimBtn');
    expect(after.bodies).toBe(0);
    expect(after.scenario).toBe('None');
    expect(after.setting).toBe(before.setting);
    expect(after.seed).toBe(before.seed);
    expect(after.clock).toBe(before.clock);
    expect(after.speed).toBe(1);
    expect(after.zoom).toBe(1);
    expect(after.pan).toEqual({ x: 0, y: 0 });
    expect(after.paused).toBe(false);
  });
});
