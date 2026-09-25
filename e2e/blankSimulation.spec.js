// =============================================================================
// Blank Simulation: an empty universe has nothing left in any list
// -----------------------------------------------------------------------------
// The button empties the body lists by hand in js/ui.js instead of going
// through the world builder, so it keeps its own copy of the list of lists, and
// that copy fell behind. js/world/build.js clears `galaxies` with the rest; the
// button did not, and every body of Coma Cluster - all 24 of them Galaxy -
// survived Blank Simulation, still drawn, still integrated and still measured
// by the cluster panel.
//
// Coma Cluster is the scenario to start from because it is the only one in the
// catalog that puts anything in `galaxies` (e2e/golden/world-construction.json).
// The census counts the same nine lists app.waitForBodies() does, which is the
// suite's own definition of a world with something in it.
// =============================================================================

import { test, expect } from './fixtures.js';

/** How many bodies each list holds, read through the live bindings. */
const census = page =>
  page.evaluate(async () => {
    const p = await import('/js/physics.js');
    return {
      bh_list: p.bh_list.length,
      stars: p.stars.length,
      planets: p.planets.length,
      gas_giants: p.gas_giants.length,
      asteroids: p.asteroids.length,
      comets: p.comets.length,
      neutron_stars: p.neutron_stars.length,
      white_dwarfs: p.white_dwarfs.length,
      galaxies: p.galaxies.length,
    };
  });

const EMPTY = {
  bh_list: 0,
  stars: 0,
  planets: 0,
  gas_giants: 0,
  asteroids: 0,
  comets: 0,
  neutron_stars: 0,
  white_dwarfs: 0,
  galaxies: 0,
};

const simulationTime = page =>
  page.evaluate(async () =>
    (await import('/js/physics.js')).getSimulationTime()
  );

test('Blank Simulation from Coma Cluster leaves every body list empty', async ({
  page,
  app,
}) => {
  await app.boot();
  await app.loadScenario('Coma Cluster', 'e2e', { run: false });
  // Without galaxies to begin with this would pass whether or not the button
  // clears them.
  expect((await census(page)).galaxies).toBeGreaterThan(0);

  await page.locator('#cleanSimBtn').click();

  // Blank Simulation also unpauses. The count is taken once the clock has moved
  // on, so it describes the blank world running rather than only the instant
  // of the click.
  const clickedAt = await simulationTime(page);
  await expect.poll(() => simulationTime(page)).toBeGreaterThan(clickedAt);

  expect(await census(page)).toEqual(EMPTY);
});
