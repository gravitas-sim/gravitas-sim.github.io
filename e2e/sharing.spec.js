// =============================================================================
// Shared-state links
// -----------------------------------------------------------------------------
// Workflow 14. A share link is how an instructor hands a class one identical
// system, so a break here is a break in an assignment that has already been
// distributed. The encoding is compressed and base64'd into a URL fragment, and
// there is no server involved, which means a change to the codec silently
// invalidates every link anyone has ever handed out.
//
// The test is a round trip: build a state, encode it, open it in a fresh page,
// and check the world that comes back is the world that went in.
// =============================================================================

import { test, expect } from './fixtures.js';

test.describe('a shared link', () => {
  test('round-trips a scenario through the URL', async ({ page, app }) => {
    await app.boot();
    await app.loadScenario('TRAPPIST-1 System');
    await app.waitForFrames(20);

    const before = await app.bodySnapshot();
    expect(before.count).toBeGreaterThan(5);

    // Capture and encode through the application's own codec.
    const fragment = await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      const share = await import('/js/shareState.js');
      const payload = ui.captureShareState({ kind: 'full' });
      return share.encodePayload(payload);
    });
    expect(typeof fragment).toBe('string');
    expect(fragment.length).toBeGreaterThan(10);

    // Open it in a genuinely fresh page, the way a student receiving the link
    // would: new context, nothing in storage, no prior world.
    const url = fragment.startsWith('#') ? fragment : `#${fragment}`;
    await app.boot({ url: `/${url}` });

    // The link is applied asynchronously after boot, so wait for a world.
    await app.waitForBodies(5);
    await app.waitForFrames(20);

    const after = await app.bodySnapshot();
    expect(after.nonFinite).toBe(0);
    // The same system, not merely some system.
    expect(after.count).toBe(before.count);
    expect(after.totalMass).toBeCloseTo(before.totalMass, 3);

    const scenario = await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      return ui.current_scenario_name;
    });
    expect(scenario).toMatch(/TRAPPIST/i);
  });

  test('a seeded link carries its seed and scenario intact', async ({
    page,
    app,
  }) => {
    // The seeded kind is the small link: it stores a seed rather than every body,
    // so everything about it depends on the seed surviving the round trip.
    await app.boot();
    await app.loadScenario('Star Cluster', 'shared-seed');
    await app.waitForFrames(10);

    const round = await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      const share = await import('/js/shareState.js');
      const sent = ui.captureShareState({ kind: 'seeded' });
      const fragment = await share.encodePayload(sent);
      const got = await share.decodePayload(`#${fragment}`);
      return {
        sentSeed: share.payloadSeed(sent),
        gotSeed: share.payloadSeed(got),
        sentScenario: sent.scenario ?? null,
        gotScenario: got.scenario ?? null,
        fragmentLength: fragment.length,
      };
    });

    expect(round.gotSeed).toEqual(round.sentSeed);
    expect(round.gotScenario).toEqual(round.sentScenario);
    // The point of the seeded kind is that it is short.
    expect(round.fragmentLength).toBeLessThan(2000);
  });

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
        ui.SETTINGS.preset_scenario = 'Star Cluster';
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
      ui.SETTINGS.preset_scenario = 'Star Cluster';
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

  test('the share dialog produces a usable link', async ({ page, app }) => {
    await app.boot();
    await app.loadScenario('Binary Pair');
    await app.waitForFrames(10);

    await page.locator('#shareBtn').click();
    await expect(page.locator('#shareModal')).toBeVisible();

    const field = page.locator('#shareUrl');
    await expect
      .poll(async () => (await field.inputValue()).length, { timeout: 15_000 })
      .toBeGreaterThan(20);

    const value = await field.inputValue();
    expect(value).toContain('#');
    // A link longer than a browser will carry is a link that does not work.
    expect(value.length).toBeLessThan(16_000);

    await page.locator('#shareCloseBtn').click();
    await expect(page.locator('#shareModal')).toBeHidden();
  });

  test('a corrupt link fails safely rather than breaking the app', async ({
    page,
    app,
  }) => {
    // Links get truncated by chat clients and email. The application has to end
    // up somewhere usable rather than half-built or blank.
    await app.boot({ url: '/#s=not-a-real-payload-at-all' });
    await app.waitForFrames(10);

    // Still running, still has a world, no NaNs.
    const snap = await app.bodySnapshot();
    expect(snap.nonFinite).toBe(0);

    // And the interface is still operable.
    await page.locator('#loadScenarioBtn').click();
    await expect(page.locator('#scenarioListModal')).toBeVisible();
  });
});
