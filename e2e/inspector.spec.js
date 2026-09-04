// =============================================================================
// The object inspector, and changing a physical property
// -----------------------------------------------------------------------------
// Workflows 5 and 6. The inspector is where a student reads numbers off a body,
// and the mass editor is the one place the interface lets them change the physics
// underneath a running simulation. Both are easy to break in ways that leave the
// canvas looking perfectly fine.
// =============================================================================

import { test, expect } from './fixtures.js';

test.describe('the object inspector', () => {
  test(
    'opens on a selected object and reports it',
    { tag: '@cross-browser' },
    async ({ page, app }) => {
      await app.boot();
      await app.loadScenario('Solar System');
      await app.waitForFrames(10);

      const picked = await app.selectFirstObject('StarObject');
      // The constructor is StarObject; the inspector calls it a Star.
      expect(picked.constructor).toBe('StarObject');
      expect(picked.type).toBe('Star');

      const inspector = page.locator('#objectInspector');
      await expect(inspector).toBeVisible();
      await expect(page.locator('#inspectorTitle')).not.toBeEmpty();
      await expect(page.locator('#inspectorContent')).not.toBeEmpty();

      // The application agrees with itself about what is selected.
      const sel = await app.selection();
      expect(sel.id).toBe(picked.id);
    }
  );

  test('the readout keeps up with a moving body', async ({ page, app }) => {
    await app.boot();
    await app.loadScenario('Binary Pair');
    await app.selectFirstObject('StarObject');

    const content = page.locator('#inspectorContent');
    await expect(content).toBeVisible();
    const first = await content.innerText();

    // The inspector auto-refreshes; over a second of simulation a moving star's
    // position has to change, or the panel has stopped tracking.
    await app.waitForFrames(60);
    await expect
      .poll(async () => (await content.innerText()) !== first, {
        timeout: 15_000,
      })
      .toBe(true);
  });

  test('the energy tab renders without breaking the details tab', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.loadScenario('Binary Pair');
    await app.selectFirstObject('StarObject');

    const energyTab = page.locator('#inspectorTabEnergy');
    const detailsTab = page.locator('#inspectorTabDetails');
    if (!(await energyTab.isVisible().catch(() => false))) {
      test.skip(true, 'this build has no energy tab');
    }

    await energyTab.click();
    await expect(page.locator('#energyTab')).toBeVisible();

    await detailsTab.click();
    await expect(page.locator('#detailsTab')).toBeVisible();
    await expect(page.locator('#inspectorContent')).not.toBeEmpty();
  });

  test('closing the inspector clears the selection', async ({ page, app }) => {
    await app.boot();
    await app.loadScenario('Solar System');
    await app.selectFirstObject();

    await expect(page.locator('#objectInspector')).toBeVisible();
    await page.locator('#inspectorClose').click();
    await expect.poll(() => app.selection(), { timeout: 10_000 }).toBeNull();
  });
});

test.describe('changing a physical property', () => {
  test('a new mass reaches the physics and the app stays alive', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.loadScenario('Binary Pair');
    await app.waitForFrames(10);

    const picked = await app.selectFirstObject('StarObject');
    const before = picked.mass;
    expect(before).toBeGreaterThan(0);

    // Through the same setter the inspector's mass editor uses, so this is the
    // application's own path rather than a poke at the object.
    const applied = await page.evaluate(
      async ([id, factor]) => {
        const p = await import('/js/physics.js');
        const star = p.stars.find(s => s.id === id);
        if (!star) return null;
        star.mass *= factor;
        if (typeof star.updateRadius === 'function') star.updateRadius();
        return star.mass;
      },
      [picked.id, 2]
    );
    expect(applied).toBeCloseTo(before * 2, 6);

    // The simulation has to survive the change: still running, still finite.
    await app.waitForFrames(60);
    const snap = await app.bodySnapshot();
    expect(snap.nonFinite).toBe(0);
    expect(snap.count).toBeGreaterThan(0);

    // And the interface has to survive it too.
    await expect(page.locator('#inspectorContent')).not.toBeEmpty();
    await app.railControl('loadScenarioBtn');
    await page.locator('#loadScenarioBtn').click();
    await expect(page.locator('#scenarioListModal')).toBeVisible();
  });

  test('a settings change applies and the simulation keeps running', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.loadScenario('Binary Pair');

    const gravityOf = () =>
      page.evaluate(async () => {
        const p = await import('/js/physics.js');
        return p.getPhysicsSetting('gravitational_constant');
      });

    const before = await gravityOf();
    expect(before).toBeGreaterThan(0);

    await page.evaluate(async () => {
      const p = await import('/js/physics.js');
      p.updatePhysicsSettings({ gravitational_constant: 1.5 });
    });
    await expect.poll(gravityOf, { timeout: 10_000 }).toBeCloseTo(1.5, 6);

    await app.waitForFrames(60);
    expect((await app.bodySnapshot()).nonFinite).toBe(0);
  });

  test('switching units rewrites the readouts without breaking them', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.loadScenario('Solar System');
    await app.selectFirstObject('StarObject');

    const content = page.locator('#inspectorContent');
    const physical = await content.innerText();

    await app.railControl('unitToggle');

    await page.locator('#unitToggle').click();
    await expect
      .poll(async () => (await content.innerText()) !== physical, {
        timeout: 15_000,
      })
      .toBe(true);

    // Neither mode may produce a broken number.
    const text = await content.innerText();
    expect(text).not.toMatch(/NaN|undefined|Infinity/);

    await app.railControl('unitToggle');

    await page.locator('#unitToggle').click();
    await expect(content).not.toBeEmpty();
    expect(await content.innerText()).not.toMatch(/NaN|undefined|Infinity/);
  });
});
