// =============================================================================
// Load and full share links: a restored world is the saved one, galaxies too
// -----------------------------------------------------------------------------
// Both paths go through rebuildWorldFromStates() in js/ui.js: empty the world,
// then rebuild it from saved states. Galaxies were missing on both halves.
// clearWorld() did not empty `galaxies`, so loading a save over Coma Cluster
// kept its 24 members alongside whatever the save held. allBodies() and the
// rebuild had no Galaxy entry, so a save or a full link could not carry one.
//
// A full link from a running cluster therefore carried no bodies at all.
// applyShareState() treats a link with nothing under `b` as a seeded one and
// rebuilds the scenario, so the reader got a cluster, but at its starting
// positions rather than where the sender's had moved to, and nothing said so.
//
// Coma Cluster is the only scenario in the catalog that puts anything in
// `galaxies` (e2e/golden/world-construction.json), so it is where every test
// here starts. Blank Simulation's copy of the same omission has its own spec,
// e2e/blankSimulation.spec.js.
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

const ONLY = counts => ({
  bh_list: 0,
  stars: 0,
  planets: 0,
  gas_giants: 0,
  asteroids: 0,
  comets: 0,
  neutron_stars: 0,
  white_dwarfs: 0,
  galaxies: 0,
  ...counts,
});

const simulationTime = page =>
  page.evaluate(async () =>
    (await import('/js/physics.js')).getSimulationTime()
  );

/**
 * Run the cluster until its members have left their seeded positions, then
 * pause it.
 *
 * A snapshot of a world that never ran cannot tell a restored member from a
 * reseeded one. A unit of travel is some thousand times what the link's seven
 * significant figures can lose on a cluster 2600 units across.
 *
 * Polled on the motion itself, not on a frame count: after twenty frames some
 * member was still where it was built in three calls out of six, with two Jest
 * runs sharing the machine.
 */
const runThenPause = async page => {
  const seeded = await page.evaluate(async () => {
    const p = await import('/js/physics.js');
    return p.galaxies.map(g => ({ x: g.pos.x, y: g.pos.y }));
  });
  await page.evaluate(async () => {
    (await import('/js/ui.js')).state.paused = false;
  });
  await expect
    .poll(
      () =>
        page.evaluate(async seeded => {
          const p = await import('/js/physics.js');
          return p.galaxies.every(
            (g, i) =>
              Math.hypot(g.pos.x - seeded[i].x, g.pos.y - seeded[i].y) > 1
          );
        }, seeded),
      { message: 'every member has moved a unit since the build' }
    )
    .toBe(true);
  await page.evaluate(async () => {
    (await import('/js/ui.js')).state.paused = true;
  });
};

test.describe('restoring a world', () => {
  test('Load over Coma Cluster keeps only the bodies in the save', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.loadScenario('Coma Cluster', 'e2e', { run: false });
    // Without galaxies to begin with this would pass whether or not Load
    // clears them.
    expect((await census(page)).galaxies).toBeGreaterThan(0);

    await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      const p = await import('/js/physics.js');
      const star = new p.StarObject({ x: 400, y: 0 }, { x: 0, y: 0 });
      localStorage.setItem(
        'gravitas_simulation_save',
        JSON.stringify({
          settings: { ...ui.SETTINGS },
          view: { zoom: ui.state.zoom, pan: { ...ui.state.pan } },
          objects: [star.get_state()],
        })
      );
      ui.load_simulation_state();
    });

    // Load also unpauses. The count is taken once the clock has moved on, so it
    // describes the loaded world running and not only the instant of loading.
    const loadedAt = await simulationTime(page);
    await expect.poll(() => simulationTime(page)).toBeGreaterThan(loadedAt);

    expect(await census(page)).toEqual(ONLY({ stars: 1 }));
  });

  test('Save and Load bring a running cluster back as it was', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.loadScenario('Coma Cluster', 'e2e', { run: false });
    await runThenPause(page);

    const saved = await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      const p = await import('/js/physics.js');
      ui.save_simulation_state();
      return p.galaxies.map(g => ({
        id: g.id,
        name: g.name,
        galaxyType: g.galaxyType,
        tilt: g.tilt,
        mass: g.mass,
        pos: { ...g.pos },
        vel: { ...g.vel },
      }));
    });
    expect(saved.length).toBeGreaterThan(0);
    // Both kinds, so a restore that forgot the kind would be caught whichever
    // way it defaulted.
    expect(new Set(saved.map(g => g.galaxyType))).toEqual(
      new Set(['elliptical', 'spiral'])
    );

    // A different world in between, so Load has something to replace and the
    // halo setting has somewhere else to have been.
    await app.loadScenario('TRAPPIST-1 System', 'e2e', { run: false });
    expect((await census(page)).galaxies).toBe(0);
    expect(
      await page.evaluate(
        async () => (await import('/js/ui.js')).SETTINGS.galaxy_gravity
      )
    ).not.toBe('halo');

    // Read in the same turn as the load. Load unpauses, and the members would
    // have moved on by the next evaluate.
    const loaded = await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      const p = await import('/js/physics.js');
      ui.load_simulation_state();
      return {
        galaxyGravity: ui.SETTINGS.galaxy_gravity,
        galaxies: p.galaxies.map(g => ({
          id: g.id,
          name: g.name,
          galaxyType: g.galaxyType,
          tilt: g.tilt,
          mass: g.mass,
          pos: { ...g.pos },
          vel: { ...g.vel },
        })),
      };
    });

    // A save is JSON, which carries a double exactly, so nothing here needs a
    // tolerance.
    expect(loaded.galaxies).toEqual(saved);
    // The halo is what holds the cluster together. Without it the restored
    // members fly apart at the speeds they were saved with.
    expect(loaded.galaxyGravity).toBe('halo');

    const loadedAt = await simulationTime(page);
    await expect.poll(() => simulationTime(page)).toBeGreaterThan(loadedAt);
    expect(await census(page)).toEqual(ONLY({ galaxies: saved.length }));
  });

  test('a full link from a running cluster opens on its own members', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.loadScenario('Coma Cluster', 'e2e', { run: false });
    await runThenPause(page);

    const sent = await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      const p = await import('/js/physics.js');
      const share = await import('/js/shareState.js');
      const payload = ui.captureShareState({ kind: 'full' });
      return {
        fragment: await share.encodePayload(payload),
        galaxies: p.galaxies.map(g => ({
          id: g.id,
          name: g.name,
          galaxyType: g.galaxyType,
          tilt: g.tilt,
          mass: g.mass,
          pos: { ...g.pos },
          vel: { ...g.vel },
        })),
      };
    });
    expect(sent.galaxies.length).toBeGreaterThan(0);

    // A fresh page, the way a reader receiving the link opens it.
    const url = sent.fragment.startsWith('#')
      ? sent.fragment
      : `#${sent.fragment}`;
    await app.boot({ url: `/${url}` });

    // The link is decoded after boot and then applied in one synchronous call,
    // and the boot's own world is not Coma Cluster. So once the scenario reads
    // Coma Cluster the restore has finished.
    await expect
      .poll(async () =>
        page.evaluate(
          async () => (await import('/js/ui.js')).current_scenario_name
        )
      )
      .toBe('Coma Cluster');

    const got = await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      const p = await import('/js/physics.js');
      return {
        paused: ui.state.paused,
        galaxies: p.galaxies.map(g => ({
          id: g.id,
          name: g.name,
          galaxyType: g.galaxyType,
          tilt: g.tilt,
          mass: g.mass,
          pos: { ...g.pos },
          vel: { ...g.vel },
        })),
      };
    });
    // Captured paused, so it opens paused and nothing has moved since.
    expect(got.paused).toBe(true);
    // Only the link's members. Twice as many would be the seeded cluster left
    // under the restored one.
    expect(await census(page)).toEqual(
      ONLY({ galaxies: sent.galaxies.length })
    );

    // The link carries seven significant figures, so positions, velocities and
    // masses come back to within a part in a million. A member at its seeded
    // position would be off by far more than that after twenty frames.
    const close = (a, b) => Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(b));
    got.galaxies.forEach((g, i) => {
      const s = sent.galaxies[i];
      const at = `member ${i} (${s.name})`;
      // No ids travel on an ordinary link, so these are re-minted in the order
      // the bodies were packed. Galaxies go first, which gives every member its
      // old id back, and the drawing's tilt with it.
      expect(
        { id: g.id, name: g.name, type: g.galaxyType, tilt: g.tilt },
        at
      ).toEqual({ id: s.id, name: s.name, type: s.galaxyType, tilt: s.tilt });
      expect(close(g.mass, s.mass), `${at} mass`).toBe(true);
      expect(close(g.pos.x, s.pos.x), `${at} x`).toBe(true);
      expect(close(g.pos.y, s.pos.y), `${at} y`).toBe(true);
      expect(close(g.vel.x, s.vel.x), `${at} vx`).toBe(true);
      expect(close(g.vel.y, s.vel.y), `${at} vy`).toBe(true);
    });
  });
});
