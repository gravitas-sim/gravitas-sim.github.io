// =============================================================================
// The sandbox: booting, the front door, the gallery, and the transport
// -----------------------------------------------------------------------------
// Workflows 1 to 4 of the smoke suite. Everything here is what a visitor does in
// their first thirty seconds, which makes it the part of the application that
// most needs to not be silently broken.
// =============================================================================

import { test, expect, STORAGE_KEYS } from './fixtures.js';

test.describe('loading from a clean browser', () => {
  test('boots, runs, and shows a simulation', async ({ page, app }) => {
    await app.boot({ firstVisit: true });

    // The two canvases the whole application draws into.
    await expect(page.locator('#simulationCanvas')).toBeVisible();
    await expect(page.locator('#starfieldCanvas')).toBeVisible();

    // The splash removed itself rather than being left on top of everything.
    await expect(page.locator('#splash')).toHaveCount(0);

    // A default world exists and the loop is turning it.
    await app.waitForBodies(1);
    await app.waitForFrames(5);
  });

  test('the first-visit front door appears, and can be dismissed', async ({
    page,
    app,
  }) => {
    await app.boot({ firstVisit: true });

    const welcome = page.locator('#welcomeScreen');
    await expect(welcome).toBeVisible();
    // It is a dialog, and it says what it is.
    await expect(page.locator('#welcomeDialog')).toHaveAttribute(
      'role',
      /dialog/
    );
    await expect(page.locator('#welcomeBody')).not.toBeEmpty();

    expect(await app.dismissFrontDoor()).toBe(true);
    await expect(welcome).toBeHidden();

    // Dismissing it is remembered, which is the whole point of the flag.
    expect(await app.storage(STORAGE_KEYS.welcomeSeen)).toBeTruthy();

    // And the simulation underneath is live.
    await app.waitForFrames(5);
  });

  test('a returning visitor does not see the front door', async ({
    page,
    app,
  }) => {
    await app.boot({ firstVisit: false });
    await expect(page.locator('#welcomeScreen')).toBeHidden();
    await app.waitForFrames(5);
  });
});

test.describe('the scenario gallery', () => {
  test('opens, filters, and loads a scenario by clicking it', async ({
    page,
    app,
  }) => {
    await app.boot();

    await page.locator('#loadScenarioBtn').click();
    const modal = page.locator('#scenarioListModal');
    await expect(modal).toBeVisible();

    // The gallery is populated from the catalog rather than from markup.
    const cards = page.locator('#scenarioListItems [data-scenario]');
    const total = await cards.count();
    expect(total).toBeGreaterThan(20);

    // Search narrows it, and the count line agrees with what is on screen.
    await page.locator('#scenarioSearch').fill('trappist');
    await expect
      .poll(async () => cards.count(), { timeout: 10_000 })
      .toBeLessThan(total);
    const narrowed = await cards.count();
    expect(narrowed).toBeGreaterThan(0);
    await expect(page.locator('#scenarioResultCount')).toContainText(
      String(narrowed)
    );

    // Clicking the card is the workflow: it should close the gallery and build
    // the world.
    await cards.first().click();
    await expect(modal).toBeHidden();
    await app.waitForBodies(2);

    // current_scenario_name, not SETTINGS.preset_scenario: the latter is a
    // sentinel that apply_preset resets to 'None' once it has consumed it, so
    // reading it after a build tells you nothing about what is loaded.
    const loaded = await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      return ui.current_scenario_name;
    });
    expect(loaded).toMatch(/TRAPPIST/i);
  });

  test('an empty search says so rather than showing everything', async ({
    page,
    app,
  }) => {
    await app.boot();
    await page.locator('#loadScenarioBtn').click();
    await page.locator('#scenarioSearch').fill('zzzznotathing');
    await expect(page.locator('#scenarioSearchEmpty')).toBeVisible();
    await expect(
      page.locator('#scenarioListItems [data-scenario]')
    ).toHaveCount(0);
  });
});

test.describe('the transport controls', () => {
  test('pause stops the clock and resume starts it again', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.loadScenario('Binary Pair');
    await app.waitForFrames(5);

    const play = page.locator('#timelinePlay');
    await expect(play).toBeVisible();

    await play.click();
    await expect.poll(() => app.isPaused(), { timeout: 10_000 }).toBe(true);

    // Paused means paused: the frame counter must not move.
    const at = await app.frameCount();
    await page.waitForTimeout(600);
    expect(await app.frameCount()).toBe(at);

    await play.click();
    await expect.poll(() => app.isPaused(), { timeout: 10_000 }).toBe(false);
    await app.waitForFrames(5);
  });

  test('the speed controls change the simulation rate', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.loadScenario('Binary Pair');

    const speedOf = () =>
      page.evaluate(async () => {
        const ui = await import('/js/ui.js');
        return ui.SETTINGS.sim_speed;
      });

    const before = await speedOf();
    await page.locator('#speedUpBtn').click();
    await expect.poll(speedOf, { timeout: 10_000 }).toBeGreaterThan(before);

    const faster = await speedOf();
    await page.locator('#slowDownBtn').click();
    await expect.poll(speedOf, { timeout: 10_000 }).toBeLessThan(faster);

    await expect(page.locator('#speedDisplay')).not.toBeEmpty();
  });

  test('reset rebuilds the world and keeps it running', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.loadScenario('Solar System');
    await app.waitForFrames(30);

    const before = await app.bodySnapshot();
    expect(before.count).toBeGreaterThan(5);

    // Refresh Scenario rebuilds from the same preset, which is the reset a user
    // reaches for when they have dragged things around.
    await page.locator('#refreshScenarioBtn').click();
    await app.waitForBodies(5);
    await app.waitForFrames(10);

    const after = await app.bodySnapshot();
    expect(after.count).toBeGreaterThan(5);
    expect(after.nonFinite).toBe(0);
  });
});
