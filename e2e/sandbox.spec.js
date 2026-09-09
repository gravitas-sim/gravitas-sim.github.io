// =============================================================================
// The sandbox: booting, the front door, the gallery, and the transport
// -----------------------------------------------------------------------------
// Workflows 1 to 4 of the smoke suite. Everything here is what a visitor does in
// their first thirty seconds, which makes it the part of the application that
// most needs to not be silently broken.
// =============================================================================

import { test, expect, STORAGE_KEYS } from './fixtures.js';

test.describe('loading from a clean browser', () => {
  test(
    'boots, runs, and shows a simulation',
    { tag: '@cross-browser' },
    async ({ page, app }) => {
      await app.boot({ firstVisit: true });

      // The two canvases the whole application draws into.
      await expect(page.locator('#simulationCanvas')).toBeVisible();
      await expect(page.locator('#starfieldCanvas')).toBeVisible();

      // The splash removed itself rather than being left on top of everything.
      await expect(page.locator('#splash')).toHaveCount(0);

      // A default world exists and the loop is turning it.
      await app.waitForBodies(1);
      await app.waitForFrames(5);
    }
  );

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
  test(
    'opens, filters, and loads a scenario by clicking it',
    { tag: '@cross-browser' },
    async ({ page, app }) => {
      await app.boot();

      await app.railControl('loadScenarioBtn');

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
    }
  );

  test('an empty search says so rather than showing everything', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.railControl('loadScenarioBtn');
    await page.locator('#loadScenarioBtn').click();
    await page.locator('#scenarioSearch').fill('zzzznotathing');
    await expect(page.locator('#scenarioSearchEmpty')).toBeVisible();
    await expect(
      page.locator('#scenarioListItems [data-scenario]')
    ).toHaveCount(0);
  });
});

test.describe('the space bar', () => {
  test('pauses the simulation, and resumes it', async ({ page, app }) => {
    await app.boot();
    const paused = () =>
      page.evaluate(async () => (await import('/js/ui.js')).state.paused);

    expect(await paused()).toBe(false);
    await page.keyboard.press('Space');
    expect(await paused()).toBe(true);
    await page.keyboard.press('Space');
    expect(await paused()).toBe(false);
  });

  test('exactly one handler answers it', async ({ page, app }) => {
    // The bug this is here for: js/ui.js and js/controls.js both bound space,
    // so a single press toggled `paused` twice and the key did nothing at all.
    // Counting the writes is what distinguishes a working space bar from two
    // broken ones, which is why this checks the cause and the test above
    // checks the effect.
    await app.boot();
    const writes = await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      const seen = [];
      let value = ui.state.paused;
      const original = Object.getOwnPropertyDescriptor(ui.state, 'paused');
      Object.defineProperty(ui.state, 'paused', {
        configurable: true,
        get: () => value,
        set(next) {
          seen.push(next);
          value = next;
        },
      });
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true })
      );
      await new Promise(r => window.setTimeout(r, 50));
      if (original) Object.defineProperty(ui.state, 'paused', original);
      return seen;
    });
    expect(writes).toEqual([true]);
  });

  test('the transport button follows the key', async ({ page, app }) => {
    // The handler that was cancelling the other one did not refresh the
    // transport bar, so even when it did win the button disagreed with the
    // simulation. The surviving one does.
    await app.boot();
    const label = () =>
      page.evaluate(() => {
        const btn = document.getElementById('timelinePlay');
        return btn?.getAttribute('aria-label') || btn?.title || '';
      });
    const before = await label();
    await page.keyboard.press('Space');
    await page.waitForTimeout(150);
    expect(await label()).not.toBe(before);
  });

  test('but not while a field has the focus', async ({ page, app }) => {
    await app.boot();
    // A space typed into a search box is a space, not a pause.
    await page.evaluate(() => {
      const input = document.createElement('input');
      input.id = 'spaceProbe';
      document.body.appendChild(input);
      input.focus();
    });
    await page.keyboard.press('Space');
    await page.waitForTimeout(100);
    expect(
      await page.evaluate(async () => (await import('/js/ui.js')).state.paused)
    ).toBe(false);
    await page.evaluate(() => document.getElementById('spaceProbe')?.remove());
  });
});

test.describe('the transport controls', () => {
  test(
    'pause stops the clock and resume starts it again',
    { tag: '@cross-browser' },
    async ({ page, app }) => {
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
    }
  );

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
    await app.railControl('speedUpBtn');
    await page.locator('#speedUpBtn').click();
    await expect.poll(speedOf, { timeout: 10_000 }).toBeGreaterThan(before);

    const faster = await speedOf();
    await app.railControl('slowDownBtn');
    await page.locator('#slowDownBtn').click();
    await expect.poll(speedOf, { timeout: 10_000 }).toBeLessThan(faster);

    await expect(page.locator('#speedDisplay')).not.toBeEmpty();
  });

  test(
    'reset rebuilds the world and keeps it running',
    { tag: '@cross-browser' },
    async ({ page, app }) => {
      await app.boot();
      await app.loadScenario('Solar System');
      await app.waitForFrames(30);

      const before = await app.bodySnapshot();
      expect(before.count).toBeGreaterThan(5);

      // Refresh Scenario rebuilds from the same preset, which is the reset a user
      // reaches for when they have dragged things around.
      await app.railControl('refreshScenarioBtn');
      await page.locator('#refreshScenarioBtn').click();
      await app.waitForBodies(5);
      await app.waitForFrames(10);

      const after = await app.bodySnapshot();
      expect(after.count).toBeGreaterThan(5);
      expect(after.nonFinite).toBe(0);
    }
  );
});

// =============================================================================
// Adding an object has to be meant
// -----------------------------------------------------------------------------
// The rail button used to cycle through eight object types, one click at a
// time, and a left-click anywhere on empty canvas placed one immediately.
// Aiming at a small planet to open its inspector and missing by a few pixels
// therefore created a star, and an unwanted mass perturbs everything already
// in the system - there is no undo for the trajectories it has already bent.
//
// Placement is now armed: a type is chosen from a picker, and only then does a
// click on empty space place anything. Touch already worked this way, needing a
// long press, because a single finger had to stay free for panning.
// =============================================================================
test.describe('placing an object is deliberate', () => {
  /** Every body in the world, however it is classified. */
  const bodyCount = page =>
    page.evaluate(async () => {
      const p = await import('/js/physics.js');
      return (
        p.bh_list.length +
        p.stars.length +
        p.planets.length +
        p.gas_giants.length +
        p.asteroids.length +
        p.comets.length +
        p.neutron_stars.length +
        p.white_dwarfs.length
      );
    });

  /**
   * Stop the world, so the only thing that can change the body count is a click.
   *
   * Placement is an interface action rather than a physics one, so it still
   * works; what stops is the merging and absorbing that was moving the number
   * underneath these assertions.
   */
  const freezeWorld = page =>
    page.evaluate(async () => {
      const physics = await import('/js/physics.js');
      physics.state.paused = true;
    });

  test('a click on empty space adds nothing until a type is chosen', async ({
    page,
    app,
  }) => {
    await app.boot();
    await page.waitForTimeout(500);
    // Frozen for the duration. The default scenario is a live world whose
    // bodies can merge while a test is counting them, and a count that drops
    // by one between two reads looks exactly like a click that did something
    // - which is how this test came to fail on runs where nothing was wrong.
    await freezeWorld(page);

    const before = await bodyCount(page);
    expect(before).toBeGreaterThan(0);

    // Three clicks on empty sky, which under the old behaviour was three stars.
    await page.mouse.click(1000, 620);
    await page.mouse.click(1040, 660);
    await page.mouse.click(980, 700);
    await page.waitForTimeout(400);
    expect(await bodyCount(page), 'an unarmed click created a body').toBe(
      before
    );
  });

  test('choosing a type arms placement, and Escape disarms it', async ({
    page,
    app,
  }) => {
    await app.boot();
    await page.waitForTimeout(500);
    await freezeWorld(page);

    await page.click('#objectTypeBtn');
    await expect(page.locator('#objectTypePicker')).toBeVisible();
    // Every type reachable in one click, which was the other half of the
    // complaint: eight types behind up to seven presses of a cycling button.
    expect(await page.locator('.object-picker-item').count()).toBe(8);

    await page.click('.object-picker-item[data-object-type="GasGiant"]');
    await expect(page.locator('#objectTypePicker')).toBeHidden();
    await expect(page.locator('body')).toHaveClass(/is-adding/);
    expect(
      await page.evaluate(
        async () => (await import('/js/ui.js')).SETTINGS.input_object_type
      )
    ).toBe('GasGiant');

    const armed = await bodyCount(page);
    await page.mouse.click(1000, 620);
    await page.waitForTimeout(400);
    expect(
      await bodyCount(page),
      'an armed click placed nothing'
    ).toBeGreaterThan(armed);

    await page.keyboard.press('Escape');
    await expect(page.locator('body')).not.toHaveClass(/is-adding/);

    const disarmed = await bodyCount(page);
    await page.mouse.click(1040, 660);
    await page.waitForTimeout(400);
    expect(await bodyCount(page), 'a click after Escape created a body').toBe(
      disarmed
    );
  });
});
