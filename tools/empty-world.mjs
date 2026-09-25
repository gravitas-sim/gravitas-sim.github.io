// =============================================================================
// A world with nothing in it
// -----------------------------------------------------------------------------
// Shared by the browser suite, through app.emptyWorld() in e2e/fixtures.js, and
// by tools/starfield-probe.mjs.
//
// There is no empty scenario to load. 'Empty' is a placement value, not one of
// the keys in js/data/scenarioInfo.js, and SETTINGS.preset_scenario takes an
// unknown key without complaint: applyPreset resets every setting to
// DEFAULT_SETTINGS, finds no block for the name, and the builder generates the
// default population - one black hole, fifteen planets, two gas giants and ten
// asteroids, with the previous scenario's card still on screen. Six callers
// asked for 'Empty' and were given that. The probe's "empty" floor was measured
// with a lensing black hole on the sky.
//
// So this builds what the sandbox builds when no scenario is loaded - the
// 'None' scenario, which applyPreset leaves alone - with every generated
// population at zero, and then says what, if anything, is still there. It goes
// through initialize_simulation rather than emptying the lists by hand the way
// Blank Simulation does, so the world has a seed and the sky is painted from
// it.
// =============================================================================

/**
 * Build an empty world in the page.
 *
 * Runs in the browser: hand it to page.evaluate. Playwright sends the function
 * as source, so it must not reach for anything else in this module.
 *
 * The view goes back to the default, as it does for Blank Simulation. The
 * builder would otherwise leave the previous scenario's zoom, which means
 * nothing in a world with nothing in it.
 *
 * @param {{seed: string, run?: boolean}} options - The world seed, and whether
 *   to leave the simulation running
 * @returns {Promise<Object<string, number>>} Every list that is not empty, by
 *   name, with its length - so {} for an empty world
 */
export async function buildEmptyWorld({ seed, run = true }) {
  const ui = await import('/js/ui.js');
  const appState = await import('/js/appState.js');
  const physics = await import('/js/physics.js');

  // Every generated population. With no scenario loaded, these are all the
  // builder reads to decide what to make.
  for (const key of Object.keys(ui.SETTINGS)) {
    if (key.startsWith('num_')) ui.SETTINGS[key] = 0;
  }
  // The name as well as the sentinel: finding 'None', initialize_simulation
  // restores preset_scenario from the loaded scenario's name.
  ui.SETTINGS.preset_scenario = 'None';
  appState.setScenarioName('None');
  ui.initialize_simulation({ seed });
  ui.state.paused = !run;
  ui.state.zoom = 1;
  ui.state.pan = { x: 0, y: 0 };

  const left = {};
  for (const name of [
    'bh_list',
    'stars',
    'planets',
    'gas_giants',
    'asteroids',
    'comets',
    'neutron_stars',
    'white_dwarfs',
    'galaxies',
    'debris',
    'particles',
    'gravity_ripples',
    'accretion_disk_particles',
  ]) {
    if (physics[name].length) left[name] = physics[name].length;
  }
  return left;
}
