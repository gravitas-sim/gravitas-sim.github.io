// =============================================================================
// The timeline records galaxies: stepping back moves a cluster back too
// -----------------------------------------------------------------------------
// js/timeline.js keeps a ring buffer of rows, one per body, over the kinds in
// its KINDS list. Galaxy was not one of them. Coma Cluster, the only scenario
// with galaxies, and nothing but galaxies, recorded frames with no rows in them:
// stepping back left every member where it was, and the CSV export, which
// reads the same recording, had no galaxy in it.
//
// It also left the id counter behind. restore() sets it past the highest id it
// rebuilt, and with no rows that was 0, so the next body placed after a scrub
// took id 1, a galaxy's id, measured 2026-09-26.
//
// Coma Cluster is where every test here starts
// (e2e/golden/world-construction.json).
// =============================================================================

import { test, expect } from './fixtures.js';

const frameCount = page =>
  page.evaluate(async () => (await import('/js/timeline.js')).getFrameCount());

/** Every galaxy as it stands, in list order. */
const members = page =>
  page.evaluate(async () => {
    const p = await import('/js/physics.js');
    return p.galaxies.map(g => ({
      id: g.id,
      name: g.name,
      galaxyType: g.galaxyType,
      tilt: g.tilt,
      x: g.pos.x,
      y: g.pos.y,
    }));
  });

/** The galaxy rows of one recorded frame, counted back from live. */
const recordedGalaxies = (page, back) =>
  page.evaluate(async back => {
    const tl = await import('/js/timeline.js');
    const all = tl.recordedFrames();
    const frame = all[all.length - 1 - back];
    return frame.bodies
      .filter(b => b.kind === 'Galaxy')
      .map(b => ({ id: b.id, x: b.x, y: b.y }));
  }, back);

/** Positions by id, for comparing a list with a recorded frame. */
const byId = list => Object.fromEntries(list.map(m => [m.id, [m.x, m.y]]));

/** Load the cluster running and wait until a few frames are recorded. */
const recordTheCluster = async (page, app) => {
  await app.boot();
  await app.loadScenario('Coma Cluster', 'e2e', { run: true });
  await expect.poll(() => frameCount(page)).toBeGreaterThan(5);
};

test.describe('scrubbing a galaxy cluster', () => {
  test('stepping back puts every member where it was recorded', async ({
    page,
    app,
  }) => {
    await recordTheCluster(page, app);
    // Pausing stops the recording, so the frames read below are the ones the
    // step will land on.
    await app.pressPause();

    const live = await members(page);
    expect(live.length).toBeGreaterThan(0);
    const oneBack = await recordedGalaxies(page, 1);
    // Every member is in the recording, not only some of them.
    expect(oneBack.map(g => g.id).sort()).toEqual(live.map(g => g.id).sort());
    // And the frame is behind live, so landing on it is a visible move.
    const liveAt = byId(live);
    expect(
      oneBack.every(g => g.x !== liveAt[g.id][0] || g.y !== liveAt[g.id][1]),
      'every member has moved since the frame one step back'
    ).toBe(true);

    await app.press(page.locator('#timelineStepBack'));
    await expect
      .poll(() =>
        page.evaluate(async () =>
          (await import('/js/timeline.js')).isScrubbing()
        )
      )
      .toBe(true);

    const stepped = await members(page);
    expect(byId(stepped)).toEqual(byId(oneBack));
    // The same galaxies, not rebuilt ones: they were all still there.
    expect(
      stepped.map(({ id, name, galaxyType, tilt }) => ({
        id,
        name,
        galaxyType,
        tilt,
      }))
    ).toEqual(
      live.map(({ id, name, galaxyType, tilt }) => ({
        id,
        name,
        galaxyType,
        tilt,
      }))
    );
  });

  test('the trajectory CSV lists every member, as a galaxy', async ({
    page,
    app,
  }) => {
    await recordTheCluster(page, app);
    await app.pressPause();

    const got = await page.evaluate(async () => {
      const p = await import('/js/physics.js');
      const ex = await import('/js/dataExport.js');
      const { csv, objects } = ex.trajectoryCsv();
      const [header, ...rows] = csv.trim().split('\n');
      const type = header.split(',').indexOf('type');
      return {
        members: p.galaxies.length,
        objects,
        types: [...new Set(rows.map(r => r.split(',')[type]))],
      };
    });
    expect(got.members).toBeGreaterThan(0);
    expect(got.objects).toBe(got.members);
    expect(got.types).toEqual(['galaxy']);
  });

  test('a body placed after a scrub does not take a galaxy id', async ({
    page,
    app,
  }) => {
    await recordTheCluster(page, app);
    await app.pressPause();
    await app.press(page.locator('#timelineStepBack'));

    const got = await page.evaluate(async () => {
      const tl = await import('/js/timeline.js');
      const p = await import('/js/physics.js');
      tl.resumeLive();
      // The constructor takes the next id from the counter restore() set,
      // which is what placing a body with the mouse does too.
      const star = new p.StarObject({ x: 0, y: 0 }, { x: 0, y: 0 });
      return { id: star.id, galaxyIds: p.galaxies.map(g => g.id) };
    });
    expect(got.galaxyIds.length).toBeGreaterThan(0);
    expect(got.galaxyIds).not.toContain(got.id);
    expect(got.id).toBeGreaterThan(Math.max(...got.galaxyIds));
  });

  test('scrubbing back past Blank Simulation brings the cluster back as it was', async ({
    page,
    app,
  }) => {
    await recordTheCluster(page, app);
    await app.pressPause();
    const before = await members(page);
    const oldest = await page.evaluate(async () =>
      (await import('/js/timeline.js')).getFrameCount()
    );
    const firstFrame = await recordedGalaxies(page, oldest - 1);
    // Six of Coma Cluster's members are ellipticals. A rebuilt galaxy that lost
    // its kind would come back a spiral, so both kinds have to be here to begin
    // with for that to show.
    expect(new Set(before.map(g => g.galaxyType))).toEqual(
      new Set(['elliptical', 'spiral'])
    );

    // Blank empties the lists without resetting the recording, so every
    // member has to be rebuilt from its row.
    await page.locator('#cleanSimBtn').click();
    await expect.poll(async () => (await members(page)).length).toBe(0);

    // Blank also unpauses, and the frames recorded after it are empty. The
    // oldest frame is from before it whatever came after.
    const restored = await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      const tl = await import('/js/timeline.js');
      ui.state.paused = true;
      tl.scrubTo(tl.getFrameCount() - 1);
      return tl.isScrubbing();
    });
    expect(restored).toBe(true);

    const back = await members(page);
    expect(byId(back)).toEqual(byId(firstFrame));
    // Rebuilt, and still the same galaxies: the ids from the rows, and the
    // kinds, names and tilts the rows cannot hold.
    const identity = list =>
      list
        .map(({ id, name, galaxyType, tilt }) => ({
          id,
          name,
          galaxyType,
          tilt,
        }))
        .sort((a, b) => a.id - b.id);
    expect(identity(back)).toEqual(identity(before));
  });
});
