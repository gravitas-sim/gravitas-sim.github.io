// =============================================================================
// The sandbox instruments, the vector overlay and the integrator setting
// -----------------------------------------------------------------------------
// The parts of this feature a unit test cannot reach: whether the tools appear
// in the rail, whether they draw onto the canvas the screenshot is taken from,
// whether the arrows survive being switched on in a live scenario, and whether
// changing the integrator underneath a running simulation leaves it running.
//
// The screenshot check is the one worth explaining. The export composites the
// starfield canvas and the simulation canvas and nothing else, which is exactly
// why the instrumentation is painted onto the simulation canvas rather than
// into HTML: a screenshot that cannot say how big or how long it is is a
// picture of some dots. The test reads pixels out of the same composite the
// download produces and looks for the marks in the corner where the scale bar
// and the readout are drawn.
// =============================================================================

import { test, expect } from './fixtures.js';

/**
 * Composite the two canvases the way takeScreenshot does, and summarize a
 * region of the result.
 *
 * Two summaries, because the things being looked for are different shapes.
 * `lit` counts pixels appreciably brighter than the empty sky, which is what a
 * thin bright line like a ruler or an arrow adds. `mean` is the average
 * brightness, which is what a large dim wash like the potential underlay
 * changes - the underlay adds almost no bright pixels at all, so counting them
 * would report that it had not been drawn.
 *
 * @param {import('@playwright/test').Page} page - The page
 * @param {{x: number, y: number, w: number, h: number}} region - Fractions of
 *   the canvas
 * @returns {Promise<{lit: number, mean: number, pixels: number}>} The summary
 */
async function exportPixels(page, region) {
  return page.evaluate(r => {
    const sim = document.getElementById('simulationCanvas');
    const stars = document.getElementById('starfieldCanvas');
    const out = document.createElement('canvas');
    out.width = sim.width;
    out.height = sim.height;
    const ctx = out.getContext('2d');
    ctx.drawImage(stars, 0, 0);
    ctx.drawImage(sim, 0, 0);
    const x = Math.round(r.x * out.width);
    const y = Math.round(r.y * out.height);
    const w = Math.round(r.w * out.width);
    const h = Math.round(r.h * out.height);
    const data = ctx.getImageData(x, y, w, h).data;
    let lit = 0;
    let total = 0;
    for (let i = 0; i < data.length; i += 4) {
      const v = data[i] + data[i + 1] + data[i + 2];
      total += v;
      if (v > 150) lit++;
    }
    const pixels = w * h;
    return { lit, mean: total / pixels, pixels };
  }, region);
}

const setSettings = (page, patch) =>
  page.evaluate(async p => {
    const ui = await import('/js/ui.js');
    const physics = await import('/js/physics.js');
    Object.assign(ui.SETTINGS, p);
    physics.updatePhysicsSettings(ui.SETTINGS);
  }, patch);

/** Wait for the renderer to paint, without requiring the physics to advance. */
/* global requestAnimationFrame */
const paint = (page, n = 3) =>
  page.evaluate(
    count =>
      new Promise(resolve => {
        const step = () =>
          --count <= 0 ? resolve() : requestAnimationFrame(step);
        requestAnimationFrame(step);
      }),
    n + 1
  );

/**
 * Stop the picture from changing on its own, so a before-and-after pixel
 * comparison measures the thing being switched on rather than the scene moving
 * underneath it.
 *
 * Not `paused`: the idle path in the render loop drops to 10Hz while paused and
 * skips drawScene entirely, so a paused canvas can be several frames stale.
 * Zero simulation speed keeps the loop painting every frame over a world that
 * is not moving. The starfield and the trails go too, because both of them
 * change from frame to frame and both put far more ink on the canvas than a
 * ruler does.
 */
async function freeze(page) {
  await setSettings(page, {
    sim_speed: 0,
    star_density: 0,
    show_trails: false,
    show_dynamic_overlays: false,
  });
  await page.evaluate(async () => {
    const render = await import('/js/render.js');
    render.generateStarfield();
    render.drawStarfield();
  });
  await paint(page, 4);
}

test.describe('the measurement tools', () => {
  test('the rail carries a ruler, a protractor and a stopwatch', async ({
    page,
    app,
  }) => {
    await app.boot();
    for (const id of ['toggleRuler', 'toggleProtractor', 'toggleStopwatch']) {
      const button = page.locator(`#${id}`);
      await expect(button).toHaveCount(1);
      await expect(button).toHaveAttribute('aria-pressed', 'false');
    }
    // The stopwatch's transport is hidden until the stopwatch is out, so the
    // rail does not carry four buttons for a tool nobody has switched on.
    await expect(page.locator('#stopwatchControls')).toBeHidden();
  });

  test('switching a tool on presses its button and draws it', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.loadScenario("Kepler's 2nd Law");
    await freeze(page);

    // The middle of the view, where a newly shown tool is laid out.
    const box = { x: 0.2, y: 0.3, w: 0.6, h: 0.5 };
    const before = await exportPixels(page, box);

    await app.railControl('toggleRuler');

    await page.locator('#toggleRuler').click();
    await expect(page.locator('#toggleRuler')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await paint(page);
    const after = await exportPixels(page, box);
    expect(after.lit).toBeGreaterThan(before.lit + 100);

    // And switching it off takes it away again. Back to within a pixel or two
    // rather than exactly: a few of the object glows breathe on a wall clock
    // rather than on the simulated one, so a frozen world is not a frozen
    // picture down to the last pixel.
    await app.railControl('toggleRuler');
    await page.locator('#toggleRuler').click();
    await paint(page);
    const off = await exportPixels(page, box);
    expect(Math.abs(off.lit - before.lit)).toBeLessThan(20);
  });

  test('the stopwatch transport appears with the stopwatch', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.railControl('toggleStopwatch');
    await page.locator('#toggleStopwatch').click();
    await expect(page.locator('#stopwatchControls')).toBeVisible();
    for (const id of [
      'stopwatchMark',
      'stopwatchStop',
      'stopwatchLatch',
      'stopwatchReset',
    ]) {
      await expect(page.locator(`#${id}`)).toBeVisible();
    }
    await app.railControl('toggleStopwatch');
    await page.locator('#toggleStopwatch').click();
    await expect(page.locator('#stopwatchControls')).toBeHidden();
  });

  test('the stopwatch runs on simulated time, so pausing stops it', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.loadScenario("Kepler's 2nd Law");
    await app.railControl('toggleStopwatch');
    await page.locator('#toggleStopwatch').click();
    await expect(page.locator('#stopwatchControls')).toBeVisible();
    await app.railControl('stopwatchMark');
    await page.locator('#stopwatchMark').click();

    const reading = () =>
      page.evaluate(async () => {
        const st = await import('/js/sandboxTools.js');
        return st.stopwatch().elapsed();
      });

    // The clock is fed from the render loop, so it is the loop that has to be
    // waited on rather than the physics frame counter. expect.poll rather than
    // waitForFunction: the reading has to come out of a dynamic import, and a
    // predicate that returns a promise is a predicate that is always truthy.
    await expect.poll(async () => (await reading()) ?? 0).toBeGreaterThan(0);
    const running = await reading();
    expect(running).toBeGreaterThan(0);

    // Paused, the clock has to hold: it counts simulated time, and none is
    // passing.
    await app.setPaused(true);
    await paint(page, 2);
    const held = await reading();
    await page.waitForTimeout(500);
    expect(await reading()).toBeCloseTo(held, 9);
  });

  test('latching without a selection says so rather than doing nothing', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.loadScenario("Kepler's 2nd Law");
    await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      ui.state.selectedObject = null;
    });
    await app.railControl('toggleStopwatch');
    await page.locator('#toggleStopwatch').click();
    await app.railControl('stopwatchLatch');
    await page.locator('#stopwatchLatch').click();
    await expect(page.locator('#gravitasToast')).toContainText('Select a body');
  });
});

test.describe('what a screenshot carries with it', () => {
  test('the scale bar and the clock are on the exported canvas', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.loadScenario("Kepler's 2nd Law");
    await freeze(page);

    // The bottom-left corner, where the instrumentation is drawn.
    const corner = { x: 0.0, y: 0.72, w: 0.32, h: 0.28 };
    const on = await exportPixels(page, corner);

    await setSettings(page, {
      show_scale_bar: false,
      show_elapsed_time: false,
      show_conservation_diagnostics: false,
    });
    await paint(page);
    const off = await exportPixels(page, corner);

    // Turning the instrumentation off has to remove ink from the corner of the
    // exported image, which is the only way to show that it was in the export
    // rather than merely on the screen.
    expect(on.lit).toBeGreaterThan(off.lit + 200);
  });

  test('the ruler is in the export too', async ({ page, app }) => {
    await app.boot();
    await app.loadScenario("Kepler's 2nd Law");
    await freeze(page);
    const box = { x: 0.15, y: 0.55, w: 0.55, h: 0.3 };
    const before = await exportPixels(page, box);
    await app.railControl('toggleRuler');
    await page.locator('#toggleRuler').click();
    await paint(page);
    const after = await exportPixels(page, box);
    expect(after.lit).toBeGreaterThan(before.lit + 50);
  });

  test('the screenshot button downloads a PNG', async ({ page, app }) => {
    await app.boot();
    await app.waitForFrames(5);
    const download = page.waitForEvent('download', { timeout: 15000 });
    await app.railControl('screenshotBtn');
    await page.locator('#screenshotBtn').click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^gravitas-screenshot-\d+\.png$/);
  });
});

test.describe('the vector overlay', () => {
  test('draws for the selected body and disappears with the setting', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.loadScenario("Kepler's 2nd Law");
    await app.setPaused(true);

    // Put the eccentric orbiter somewhere general on its orbit and select it.
    await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      const P = await import('/js/physics.js');
      const ecc = P.planets.find(p => p.name === 'Eccentric Orbiter');
      const star = P.stars[0];
      for (let i = 0; i < 20000; i++) {
        P.updatePhysics(0.05);
        const r = Math.hypot(ecc.pos.x - star.pos.x, ecc.pos.y - star.pos.y);
        if (i > 200 && r > 180) break;
      }
      ui.state.selectedObject = { object: ecc, type: 'Planet' };
      ui.state.areaSweepOverlay.active = false;
    });

    await setSettings(page, {
      show_velocity_vectors: false,
      show_acceleration_vectors: false,
    });
    await freeze(page);
    const box = { x: 0.25, y: 0.25, w: 0.5, h: 0.5 };
    const none = await exportPixels(page, box);

    await setSettings(page, {
      show_velocity_vectors: true,
      show_acceleration_vectors: true,
    });
    await paint(page);
    const both = await exportPixels(page, box);
    expect(both.lit).toBeGreaterThan(none.lit + 100);
  });

  test('velocity and acceleration are far from parallel on the eccentric orbit', async ({
    page,
    app,
  }) => {
    // The lesson the overlay exists to teach, measured rather than looked at.
    await app.boot();
    await app.loadScenario("Kepler's 2nd Law");
    const angles = await page.evaluate(async () => {
      const P = await import('/js/physics.js');
      const ecc = P.planets.find(p => p.name === 'Eccentric Orbiter');
      const out = [];
      for (let i = 0; i < 30000; i++) {
        P.updatePhysics(0.05);
        if (i % 500) continue;
        const parts = P.accelerationBreakdown(ecc);
        const dot = ecc.vel.x * parts.total.ax + ecc.vel.y * parts.total.ay;
        const cross = ecc.vel.x * parts.total.ay - ecc.vel.y * parts.total.ax;
        out.push((Math.abs(Math.atan2(cross, dot)) * 180) / Math.PI);
      }
      return out;
    });
    expect(angles.length).toBeGreaterThan(20);
    const min = Math.min(...angles);
    const max = Math.max(...angles);
    // Never within forty degrees of pointing the same way, and never within
    // forty of pointing opposite. At e = 0.65 the bound is 90 +/- asin(e).
    expect(min).toBeGreaterThan(40);
    expect(max).toBeLessThan(140);
    // And it does swing, so the picture is showing something.
    expect(max - min).toBeGreaterThan(30);
  });

  test('the potential well draws under the scene', async ({ page, app }) => {
    await app.boot();
    await app.loadScenario('Binary Star System');
    await freeze(page);
    const box = { x: 0.1, y: 0.1, w: 0.8, h: 0.8 };
    const off = await exportPixels(page, box);
    await setSettings(page, { show_potential_well: true });
    await paint(page, 6);
    const on = await exportPixels(page, box);
    // The underlay is a dim wash rather than bright ink, so it is measured by
    // the average brightness of the region and not by counting lit pixels.
    expect(on.mean).toBeGreaterThan(off.mean + 2);
  });
});

test.describe('the integrator setting', () => {
  test('is Symplectic Euler on a fresh load', async ({ page, app }) => {
    await app.boot();
    const chosen = await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      const P = await import('/js/physics.js');
      return { setting: ui.SETTINGS.integrator, active: P.activeIntegrator() };
    });
    expect(chosen.setting).toBe('Symplectic Euler');
    expect(chosen.active).toBe('Symplectic Euler');
  });

  // The four scenarios allowed to choose their own integrator, and why.
  //
  // The rule this list is an exception to is worth keeping: the catalog was
  // laid out and timed against symplectic Euler's error, and a scenario that
  // quietly switched scheme would change what every other check measures. So
  // the exceptions are named here rather than inferred, and adding a fifth
  // means editing this list and saying why.
  //
  // These four measure resonant angles, which are secular quantities
  // accumulated over hundreds of orbits, and first-order phase error
  // accumulates straight into them. Measured over 1,400 Io orbits, symplectic
  // Euler at the substep these scenarios can afford reports a Laplace
  // libration amplitude of 9 degrees and a period of 273 Io orbits; Velocity
  // Verlet reports 23 and 1,249, within 3% of what RK4 gives. The full table
  // is in RESONANCE_INVESTIGATION.md.
  const NON_DEFAULT_INTEGRATOR = {
    'Galilean Resonance': 'Velocity Verlet',
    'Broken Laplace Resonance': 'Velocity Verlet',
    'Pluto and Neptune': 'Velocity Verlet',
    'Jupiter Trojans': 'Velocity Verlet',
  };

  test('every shipped scenario loads under the scheme it declares', async ({
    page,
    app,
  }) => {
    await app.boot();
    const seen = await page.evaluate(async expected => {
      const ui = await import('/js/ui.js');
      const P = await import('/js/physics.js');
      const info = await import('/js/data/scenarioInfo.js');
      const out = [];
      for (const key of Object.keys(info.SCENARIO_INFO)) {
        ui.SETTINGS.preset_scenario = key;
        ui.initialize_simulation({ seed: 'integrator-default' });
        const want = expected[key] || 'Symplectic Euler';
        const got = P.activeIntegrator();
        if (got !== want) out.push(`${key}: ${got}, expected ${want}`);
      }
      return out;
    }, NON_DEFAULT_INTEGRATOR);
    expect(seen).toEqual([]);
  });

  test('a scenario that changes the scheme does not leave it changed', async ({
    page,
    app,
  }) => {
    // The other half of the guard, and the part that would actually hurt: the
    // setting is global, so a scenario that raised it and did not put it back
    // would silently re-time every scenario loaded after it.
    await app.boot();
    const after = await page.evaluate(async keys => {
      const ui = await import('/js/ui.js');
      const P = await import('/js/physics.js');
      const out = [];
      for (const key of keys) {
        ui.SETTINGS.preset_scenario = key;
        ui.initialize_simulation({ seed: 'integrator-default' });
        ui.SETTINGS.preset_scenario = 'Solar System';
        ui.initialize_simulation({ seed: 'integrator-default' });
        if (P.activeIntegrator() !== 'Symplectic Euler') {
          out.push(`${key} left ${P.activeIntegrator()} in force`);
        }
      }
      return out;
    }, Object.keys(NON_DEFAULT_INTEGRATOR));
    expect(after).toEqual([]);
  });

  test('can be changed while the simulation runs, without breaking it', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.loadScenario('Binary Star System');
    await app.waitForFrames(10);

    for (const scheme of ['Velocity Verlet', 'RK4', 'Symplectic Euler']) {
      await setSettings(page, { integrator: scheme });
      await app.waitForFrames(20);
      const state = await page.evaluate(async () => {
        const P = await import('/js/physics.js');
        const bodies = [
          ...P.bh_list,
          ...P.stars,
          ...P.planets,
          ...P.gas_giants,
          ...P.asteroids,
        ];
        return {
          active: P.activeIntegrator(),
          bodies: bodies.length,
          finite: bodies.every(
            b =>
              Number.isFinite(b.pos.x) &&
              Number.isFinite(b.pos.y) &&
              Number.isFinite(b.vel.x) &&
              Number.isFinite(b.vel.y)
          ),
        };
      });
      expect(state.active).toBe(scheme);
      expect(state.bodies).toBeGreaterThan(0);
      expect(state.finite).toBe(true);
    }
  });

  test('the conservation readout names the scheme in force', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.loadScenario('Binary Star System');
    for (const scheme of ['RK4', 'Symplectic Euler']) {
      await setSettings(page, { integrator: scheme });
      await app.waitForFrames(5);
      const named = await page.evaluate(async () => {
        const P = await import('/js/physics.js');
        return P.conservationDrift(true).integrator;
      });
      expect(named).toBe(scheme);
    }
  });
});

test.describe('the mass a body gravitates with and the mass it reports', () => {
  test('agree, in every scenario in the catalog', async ({ page, app }) => {
    // The failure this catches is the one MASS_UNITS.md was written about:
    // code that writes `mass` and leaves the class's own unit count behind, so
    // the body pulls as one thing and the inspector describes another. It is
    // invisible from inside either half - only the comparison finds it - and it
    // has been reintroduced four separate times in this codebase's history.
    await app.boot();
    const bad = await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      const P = await import('/js/physics.js');
      const info = await import('/js/data/scenarioInfo.js');
      const out = [];
      const check = (body, stored, unit, name, scenario, tol) => {
        if (stored == null) return;
        const derived = body.mass / unit;
        const scale = Math.max(Math.abs(stored), 1e-12);
        if (Math.abs(derived - stored) / scale > tol) {
          out.push({
            scenario,
            body: body.name || name,
            stored,
            derived,
          });
        }
      };
      for (const key of Object.keys(info.SCENARIO_INFO)) {
        ui.SETTINGS.preset_scenario = key;
        ui.initialize_simulation({ seed: 'mass-agreement' });
        // A looser bound for the planets and giants: several scenarios build a
        // body from a mass in one of those two units and label it in the other,
        // and the round trip goes through two independently published ratios
        // that disagree in the fourth digit. HD 209458 b is the clearest case -
        // a Planet object carrying a gas giant's mass. That is a property of
        // the constants rather than a stale field, and it is three hundred
        // times smaller than the smallest mistake this test exists to catch: a
        // field left behind is wrong by a factor, not by a fiftieth of a
        // percent.
        for (const p of P.planets) {
          check(p, p.massInEarths, P.EARTH_MASS_UNIT, 'planet', key, 1e-3);
        }
        for (const g of P.gas_giants) {
          check(g, g.massInJupiters, P.JUPITER_MASS_UNIT, 'giant', key, 1e-3);
        }
        for (const a of P.asteroids) {
          check(a, a.massInCeres, P.CERES_MASS_UNIT, 'asteroid', key, 1e-6);
        }
        for (const c of P.comets) {
          check(c, c.massInComets, P.HALLEY_MASS_UNIT, 'comet', key, 1e-6);
        }
        for (const d of P.debris) {
          check(d, d.massInFragments, P.DEBRIS_MASS_UNIT, 'debris', key, 1e-6);
        }
        for (const s of [...P.stars, ...P.neutron_stars, ...P.white_dwarfs]) {
          check(s, s.massInSuns, P.SOLAR_MASS_UNIT, 'star', key, 1e-6);
        }
      }
      return out.slice(0, 12);
    });
    expect(bad).toEqual([]);
  });
});
