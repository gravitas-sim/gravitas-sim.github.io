// =============================================================================
// Capture, measurement and the transport buttons
// -----------------------------------------------------------------------------
// The area sweep, the speed readout and its stepping, Reset view, demo mode and
// the bottom dock moved out of ui.js into captureMeasure.js (Prompt 107, slice
// 10). Screenshot, clip recording and the measurement tools have their own
// specs (capture, instruments); nothing exercised the wedges' arithmetic, the
// speed stepping, the camera fit or demo mode directly.
// =============================================================================

import { test, expect } from './fixtures.js';

test('the area sweep cuts equal areas, clamps its count and can be refused', async ({
  page,
  app,
}) => {
  await app.boot();
  await app.loadScenario('solar-system', 'e2e', { run: false });
  const r = await page.evaluate(async () => {
    const { command } = await import('/js/appState.js');
    const { planets } = await import('/js/physics.js');
    const ui = await import('/js/ui.js');
    const planet = planets.find(p => p.alive);
    const data = command('computeAreaSweep')(planet);
    // Each wedge is a polyline of points relative to the focus; its area is
    // the fan of triangles from the focus.
    const areas = data.wedges.map(w => {
      let a = 0;
      for (let i = 0; i + 1 < w.length; i++) {
        a += (w[i].x * w[i + 1].y - w[i + 1].x * w[i].y) / 2;
      }
      return Math.abs(a);
    });
    const counts = [100, 0, 5.4].map(n => {
      command('setAreaSweepWedges')(n);
      return command('getAreaSweepWedges')();
    });
    command('setAreaSweepWedges')(8);
    const shown = command('showAreaSweepFor')(planet);
    const overlay = {
      active: ui.state.areaSweepOverlay.active,
      same: ui.state.areaSweepOverlay.objectId === planet.id,
    };
    command('setAreaSweepSuppressed')(true);
    const refused = {
      active: ui.state.areaSweepOverlay.active,
      shown: command('showAreaSweepFor')(planet),
      flag: ui.isAreaSweepSuppressed(),
    };
    command('setAreaSweepSuppressed')(false);
    return {
      wedgeCount: data.wedgeCount,
      points: data.wedges.map(w => w.length),
      areas,
      period: data.period,
      wedgeTime: data.wedgeTime,
      e: data.e,
      a: data.a,
      counts,
      shown,
      overlay,
      refused,
    };
  });
  expect(r.wedgeCount).toBe(8);
  expect(r.points).toEqual(Array(8).fill(91));
  expect(r.a).toBeGreaterThan(0);
  expect(r.e).toBeGreaterThanOrEqual(0);
  expect(r.e).toBeLessThan(1);
  expect(r.wedgeTime).toBeCloseTo(r.period / 8, 9);
  const mean = r.areas.reduce((s, x) => s + x, 0) / r.areas.length;
  for (const area of r.areas)
    expect(Math.abs(area / mean - 1)).toBeLessThan(0.01);
  expect(r.counts).toEqual([24, 2, 5]);
  expect(r.shown).toBe(true);
  expect(r.overlay).toEqual({ active: true, same: true });
  expect(r.refused).toEqual({ active: false, shown: false, flag: true });
});

test('the speed buttons step 0.5, 0.3, 0.1, 0 and the readout follows', async ({
  page,
  app,
}) => {
  await app.boot();
  await app.emptyWorld('e2e', { run: false });
  const speed = () =>
    page.evaluate(async () => (await import('/js/ui.js')).SETTINGS.sim_speed);
  await page.evaluate(async () => {
    const ui = await import('/js/ui.js');
    ui.SETTINGS.sim_speed = 0.5;
    ui.updateSpeedDisplay();
  });
  await expect(page.locator('#speedDisplay')).toHaveText('0.5×');

  await app.railControl('speedUpBtn');
  await page.locator('#speedUpBtn').click();
  await expect.poll(speed).toBe(1);
  await expect(page.locator('#speedDisplay')).toHaveText('1.0×');

  for (const [value, text] of [
    [0.5, '0.5×'],
    [0.3, '0.3×'],
    [0.1, '0.1×'],
    [0, '0×'],
  ]) {
    await page.locator('#slowDownBtn').click();
    await expect.poll(speed).toBe(value);
    await expect(page.locator('#speedDisplay')).toHaveText(text);
  }
  // Pause is the floor: another press goes nowhere.
  await page.locator('#slowDownBtn').click();
  await expect.poll(speed).toBe(0);
  for (const value of [0.1, 0.3, 0.5, 1, 1.5]) {
    await page.locator('#speedUpBtn').click();
    await expect.poll(speed).toBe(value);
  }
});

test('Reset view frames the bodies by mass, and an empty world gets the default view', async ({
  page,
  app,
}) => {
  await app.boot();
  await app.emptyWorld('e2e', { run: false });
  const view = () =>
    page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      return { zoom: ui.state.zoom, x: ui.state.pan.x, y: ui.state.pan.y };
    });
  const set = (zoom, x, y) =>
    page.evaluate(
      async ({ zoom, x, y }) => {
        const ui = await import('/js/ui.js');
        ui.state.zoom = zoom;
        ui.state.pan = { x, y };
      },
      { zoom, x, y }
    );

  await set(3, 120, -80);
  await app.railControl('resetViewBtn');
  await page.locator('#resetViewBtn').click();
  await expect.poll(view).toEqual({ zoom: 1, x: 0, y: 0 });

  await app.loadScenario('binary-pair', 'e2e', { run: false });
  await set(5, 500, 500);
  await page.locator('#resetViewBtn').click();
  const expected = await page.evaluate(async () => {
    const p = await import('/js/physics.js');
    const all = [
      ...p.bh_list,
      ...p.stars,
      ...p.neutron_stars,
      ...p.white_dwarfs,
      ...p.gas_giants,
      ...p.planets,
      ...p.asteroids,
      ...p.comets,
    ].filter(o => o.alive);
    let m = 0;
    let cx = 0;
    let cy = 0;
    for (const o of all) {
      m += o.mass;
      cx += o.pos.x * o.mass;
      cy += o.pos.y * o.mass;
    }
    return { cx: cx / m, cy: cy / m };
  });
  await expect.poll(async () => (await view()).zoom).not.toBe(5);
  const v = await view();
  expect(v.zoom).toBeGreaterThanOrEqual(0.1);
  expect(v.zoom).toBeLessThanOrEqual(2);
  expect(v.x).toBeCloseTo(-expected.cx * v.zoom, 6);
  expect(v.y).toBeCloseTo(expected.cy * v.zoom, 6);
});

test('demo mode starts on a scenario, relabels its button and stops again', async ({
  page,
  app,
}) => {
  await app.boot();
  await app.emptyWorld('e2e', { run: false });
  const button = page.locator('#demoModeBtn');
  const state = () =>
    button.evaluate(b => ({
      active: b.classList.contains('active'),
      icon: b.querySelector('.icon')?.getAttribute('class'),
      label: (b.querySelector('[data-i18n]') || b).dataset.i18n,
    }));
  expect(await state()).toMatchObject({
    active: false,
    icon: 'icon icon-clapper',
    label: 'settings.demoMode',
  });

  // The button sits in the Settings panel; the handler is on the element.
  await button.evaluate(b => b.click());
  await expect.poll(state).toMatchObject({
    active: true,
    icon: 'icon icon-stop',
    label: 'settings.demoMode.stop',
  });
  // It started a scenario at once, and the simulation is running. The scenario
  // is the one the world records as loaded: SETTINGS.preset_scenario is spent
  // (reset to 'None') as soon as the world is built, so it names nothing here.
  // (expect.poll, not waitForFunction: an async predicate passes that on its
  // first poll, whatever it resolves to.)
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const ui = await import('/js/ui.js');
        const { current_scenario_name } = await import('/js/appState.js');
        const { SCENARIO_INFO } = await import('/js/data/scenarioInfo.js');
        return (
          ui.state.paused === false &&
          current_scenario_name in SCENARIO_INFO &&
          current_scenario_name !== 'None'
        );
      })
    )
    .toBe(true);

  await button.evaluate(b => b.click());
  await expect.poll(state).toMatchObject({
    active: false,
    icon: 'icon icon-clapper',
    label: 'settings.demoMode',
  });
});

test('the bottom dock publishes its measurements as custom properties', async ({
  page,
  app,
}) => {
  await app.boot();
  const read = () =>
    page.evaluate(() => {
      const css = getComputedStyle(document.documentElement);
      return [
        '--attribution-width',
        '--attribution-height',
        '--rail-footer-inset',
        '--transport-max',
        '--transport-reserve',
        '--footer-reserve',
      ].map(name => css.getPropertyValue(name).trim());
    });
  await expect
    .poll(async () => (await read()).every(v => /^\d+px$/.test(v)))
    .toBe(true);
  const [, , , transportMax, , footerReserve] = await read();
  expect(parseInt(transportMax, 10)).toBeLessThanOrEqual(
    page.viewportSize().width
  );
  expect(parseInt(footerReserve, 10)).toBeGreaterThan(0);
});
