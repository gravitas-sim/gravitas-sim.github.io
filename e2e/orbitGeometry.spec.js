// Orbit geometry and the Sizes statement, walked as a reader would: the
// overlay switched on from the inspector, its points chosen from the keyboard
// list and by one press on the canvas, the distance announced; the readout's
// Sizes button opening the statement. The three walks named in
// tools/interaction-contract.json (sandbox.orbitGeometry) are here.
import { test, expect, requireScenarioKey } from './fixtures.js';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('gravitas_orientation_seen_v1', '1');
    localStorage.setItem('gravitas_welcome_seen_v1', '1');
  });
});

/** Kepler's 2nd Law, paused and framed, with the Eccentric Orbiter inspected. */
async function orbiter(page, app) {
  await app.boot();
  await requireScenarioKey(page, 'keplers-2nd-law');
  await page.evaluate(async () => {
    const ui = await import('/js/ui.js');
    ui.SETTINGS.preset_scenario = 'keplers-2nd-law';
    ui.initialize_simulation({ seed: 'orbit-geometry' });
    ui.state.paused = true;
    ui.state.zoom = 1;
    ui.state.pan = { x: 0, y: 0 };
    const physics = await import('/js/physics.js');
    const body = physics.planets.find(p => p.name === 'Eccentric Orbiter');
    const inspector = await import('/js/inspectorWindow.js');
    inspector.showObjectInspector(body, 'Planet');
  });
  const toggle = page.locator('#orbitGeometryToggleBtn');
  await expect(toggle).toBeVisible();
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#orbitGeometryPanel')).toBeVisible();
  await expect(page.locator('#ogList [role=option]')).toHaveCount(4);
}

/** Where a marker is on screen, in CSS pixels of the page. */
async function markerOnPage(page, id) {
  return page.evaluate(async which => {
    const physics = await import('/js/physics.js');
    const settings = await import('/js/twoBodySettings.js');
    const geo = await import('/js/orbitGeometry.js');
    const body = physics.planets.find(p => p.name === 'Eccentric Orbiter');
    physics.barycenterBodies();
    const g = geo.orbitGeometry(
      body,
      physics.gravitySourcesFor(body),
      settings.twoBodySettings()
    );
    const p = g.foci[which] || g.apsides[which];
    const s = physics.world_to_screen(p);
    const c = document.getElementById('simulationCanvas');
    const r = c.getBoundingClientRect();
    const k = c.width / r.width;
    return { x: r.left + s.x / k, y: r.top + s.y / k };
  }, id);
}

test('orbit points are chosen from the keyboard list', async ({
  page,
  app,
}) => {
  await orbiter(page, app);
  const list = page.locator('#ogList');
  await list.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press(' ');
  await expect(page.locator('#og-periapsis')).toHaveAttribute(
    'aria-selected',
    'true'
  );
  await expect(page.locator('#og-apoapsis')).toHaveAttribute(
    'aria-selected',
    'true'
  );
  // Periapsis to apoapsis is the major axis, 2a: a is 142.857 units here.
  await expect(page.locator('#ogDistance')).toContainText(
    'Distance between Periapsis (nearest) and Apoapsis (farthest): 2.86 AU'
  );
  await page.keyboard.press('Escape');
  await expect(page.locator('#ogList [aria-selected=true]')).toHaveCount(0);
  // A hidden part takes its points out of the list.
  await page.locator('[data-part=foci]').uncheck();
  await expect(page.locator('#ogList [role=option]')).toHaveCount(2);
});

test('one press on a marker chooses it and places nothing', async ({
  page,
  app,
}) => {
  await orbiter(page, app);
  const before = await page.evaluate(async () => {
    const physics = await import('/js/physics.js');
    return physics.planets.length + physics.stars.length;
  });
  // Periapsis: the body starts there, so the press lands on the body too and
  // must still choose the marker rather than the body underneath.
  const at = await markerOnPage(page, 'periapsis');
  // Off centre, inside the 24 px target.
  await page.mouse.click(at.x + 6, at.y - 5);
  await expect(page.locator('#og-periapsis')).toHaveAttribute(
    'aria-selected',
    'true'
  );
  const after = await page.evaluate(async () => {
    const physics = await import('/js/physics.js');
    const ui = await import('/js/ui.js');
    return {
      n: physics.planets.length + physics.stars.length,
      selected: ui.state.selectedObject?.object?.name,
    };
  });
  expect(after.n).toBe(before);
  expect(after.selected).toBe('Eccentric Orbiter');
});

test('the distance is announced when the second point is chosen', async ({
  page,
  app,
}) => {
  await orbiter(page, app);
  await page.locator('#og-focus-primary').click();
  await page.locator('#og-focus-empty').click();
  // The two foci are 2ae apart: 2 x 142.857 x 0.65 units.
  await expect(page.locator('#srStatus')).toContainText(
    'Distance between Focus at Kepler Star and Empty focus: 1.86 AU'
  );
});

test('the Sizes button opens the statement, and Escape closes it', async ({
  page,
  app,
}) => {
  await app.boot();
  await requireScenarioKey(page, 'solar-system');
  await page.evaluate(async () => {
    const ui = await import('/js/ui.js');
    ui.SETTINGS.preset_scenario = 'solar-system';
    ui.initialize_simulation({ seed: 'sizes' });
    ui.state.paused = true;
  });
  const button = page.locator('#readoutSizes');
  // Named and shown once the size facts have loaded with the description.
  await expect(button).toBeVisible();
  await expect(button).toHaveText('Sizes');
  await button.focus();
  await page.keyboard.press('Enter');
  const dialog = page.locator('#sizesStatement');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('What is drawn to scale');
  await expect(dialog.locator('tbody tr')).toHaveCount(5);
  await expect(dialog).toContainText('440×');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(button).toBeFocused();
});

test('switched on and straight off, the overlay ends off', async ({
  page,
  app,
}) => {
  await app.boot();
  await requireScenarioKey(page, 'keplers-2nd-law');
  const after = await page.evaluate(async () => {
    const ui = await import('/js/ui.js');
    ui.SETTINGS.preset_scenario = 'keplers-2nd-law';
    ui.initialize_simulation({ seed: 'orbit-geometry' });
    ui.state.paused = true;
    const physics = await import('/js/physics.js');
    const body = physics.planets.find(p => p.name === 'Eccentric Orbiter');
    const og = await import('/js/orbitGeometryOverlay.js');
    // The first call waits for the overlay's words; the second must win.
    const on = og.setOrbitGeometry(true, body);
    const off = og.setOrbitGeometry(false);
    await Promise.all([on, off]);
    const panel = document.getElementById('orbitGeometryPanel');
    return {
      active: ui.state.orbitGeometry.active,
      shown: !!panel && !panel.hidden,
    };
  });
  expect(after).toEqual({ active: false, shown: false });
});

test('closing the panel returns focus to the switch', async ({ page, app }) => {
  await orbiter(page, app);
  await page.locator('#ogClose').click();
  await expect(page.locator('#orbitGeometryPanel')).toBeHidden();
  await expect(page.locator('#orbitGeometryToggleBtn')).toBeFocused();
  await expect(page.locator('#orbitGeometryToggleBtn')).toHaveAttribute(
    'aria-checked',
    'false'
  );
});
