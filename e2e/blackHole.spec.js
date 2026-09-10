// =============================================================================
// Black holes: the drawing, and what it must not touch
// -----------------------------------------------------------------------------
// The checks that need a real world built by the real application. The pure
// geometry is covered without a browser in tests/blackHoleAppearance.test.js
// and the separation in tests/blackHoleSeparation.test.js; what is here is
// everything those two cannot reach.
//
// The first test is the important one. Turning the accretion disk on used to
// create thirty to sixty objects per black hole, each drawing from the seeded
// generator, so one seed produced two different worlds depending on a display
// setting. It is checked by building the same seeded scenario twice with the
// setting on and off and comparing every body.
// =============================================================================

import { test, expect } from './fixtures.js';

/** Build a scenario under a fixed seed and report what came out. */
async function build(page, { scenario, seed, settings = {} }) {
  return page.evaluate(
    async ({ scenario: name, seed: s, settings: over }) => {
      const ui = await import('/js/ui.js');
      const state = await import('/js/appState.js');
      const rng = await import('/js/rng.js');
      Object.assign(state.SETTINGS, over);
      // The world seed, which is what the build actually runs under, rather
      // than a settings key of that name.
      rng.setWorldSeed(rng.normalizeSeed(s));
      ui.loadScenarioByKey(name, { seed: rng.normalizeSeed(s) });
      // Frozen before anything is read. Without this the two builds are
      // compared a few integration steps apart and every position has drifted,
      // which looks exactly like a different world and is not one.
      state.state.paused = true;
      state.SETTINGS.paused = true;
      const sim = await import('/js/physics.js');
      const all = [
        ...(sim.bh_list || []),
        ...(sim.planets || []),
        ...(sim.stars || []),
        ...(sim.asteroids || []),
      ];
      return all.map(
        b =>
          `${b.obj_type}|${b.mass.toPrecision(12)}|${b.pos.x.toPrecision(
            12
          )}|${b.pos.y.toPrecision(12)}|${b.vel.x.toPrecision(12)}`
      );
    },
    { scenario, seed, settings }
  );
}

test.describe('a display setting cannot change the world', () => {
  test('one seed builds one world, disk on or off', async ({ page, app }) => {
    await app.boot();
    const on = await build(page, {
      scenario: 'Black Hole Lab',
      seed: 'same-seed',
      settings: {
        show_accretion_disk: true,
        show_bh_jets: true,
        bh_environment: 'jet',
      },
    });
    const off = await build(page, {
      scenario: 'Black Hole Lab',
      seed: 'same-seed',
      settings: {
        show_accretion_disk: false,
        show_bh_jets: false,
        bh_environment: 'quiescent',
      },
    });
    expect(on.length).toBeGreaterThan(0);
    expect(off).toEqual(on);
  });

  test('and the quality tier does not either', async ({ page, app }) => {
    await app.boot();
    const full = await build(page, {
      scenario: 'Black Hole Lab',
      seed: 'tier',
      settings: { quality_tier: 'full' },
    });
    const low = await build(page, {
      scenario: 'Black Hole Lab',
      seed: 'tier',
      settings: { quality_tier: 'low' },
    });
    expect(low).toEqual(full);
  });
});

test.describe('the appearance is a display choice and nothing else', () => {
  test('changing it moves no body', async ({ page, app }) => {
    await app.boot();
    const moved = await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      const sim = await import('/js/physics.js');
      ui.loadScenarioByKey('Black Hole Lab');
      const snap = () =>
        [...sim.bh_list, ...sim.planets].map(
          b =>
            `${b.mass}|${b.pos.x}|${b.pos.y}|${b.vel.x}|${b.vel.y}|${b.radius}`
        );
      const before = snap();
      for (const bh of sim.bh_list) {
        for (const inc of [0, 45, 90]) {
          for (const env of ['quiescent', 'accreting', 'jet']) {
            bh.setAppearance({ inclinationDeg: inc, environment: env });
          }
        }
      }
      const after = snap();
      return { before, after };
    });
    expect(moved.after).toEqual(moved.before);
  });

  test('and it survives a save and a restore', async ({ page, app }) => {
    await app.boot();
    const round = await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      const sim = await import('/js/physics.js');
      ui.loadScenarioByKey('Black Hole Lab');
      const bh = sim.bh_list[0];
      bh.setAppearance({
        environment: 'jet',
        inclinationDeg: 23,
        positionAngleDeg: 111,
        spin: -1,
        jetStrength: 0.33,
      });
      const state = bh.get_state();
      const clone = new sim.BlackHole({ x: 0, y: 0 }, 1);
      clone.set_state(JSON.parse(JSON.stringify(state)));
      return { from: bh.appearance, to: clone.appearance };
    });
    expect(round.to).toEqual(round.from);
  });

  test('a state with no appearance restores a stable, quiescent one', async ({
    page,
    app,
  }) => {
    await app.boot();
    const out = await page.evaluate(async () => {
      const sim = await import('/js/physics.js');
      const bh = new sim.BlackHole({ x: 0, y: 0 }, 100);
      const state = bh.get_state();
      delete state.appearance;
      delete state.jet_orientation;
      const a = new sim.BlackHole({ x: 0, y: 0 }, 1);
      const b = new sim.BlackHole({ x: 0, y: 0 }, 1);
      a.set_state({ ...state });
      b.set_state({ ...state });
      return { a: a.appearance, b: b.appearance };
    });
    expect(out.b).toEqual(out.a);
    expect(out.a.environment).toBe('quiescent');
  });
});

test.describe('the picture', () => {
  /** Load a scenario, park the camera on its first hole, and freeze it. */
  async function frame(page, scenario, framing = 0.12) {
    return page.evaluate(
      async ({ scenario: name, framing: f }) => {
        const ui = await import('/js/ui.js');
        const state = await import('/js/appState.js');
        const sim = await import('/js/physics.js');
        const rng = await import('/js/rng.js');
        // A named seed, so "the same scene twice" really is.
        ui.loadScenarioByKey(name, { seed: rng.normalizeSeed('shot') });
        const bh = sim.bh_list[0];
        const canvas = document.getElementById('simulationCanvas');
        const h = canvas.clientHeight || 640;
        state.state.zoom = (f * h) / bh.radius;
        state.state.pan = { x: -bh.pos.x, y: -bh.pos.y };
        state.state.paused = true;
        state.SETTINGS.paused = true;
        return { radius: bh.radius, env: bh.appearance.environment };
      },
      { scenario, framing }
    );
  }

  /** A hash of the canvas, so two frames can be compared. */
  const pixels = page =>
    page.evaluate(() => {
      const c = document.getElementById('simulationCanvas');
      const g = c.getContext('2d');
      const d = g.getImageData(0, 0, c.width, c.height).data;
      let h = 2166136261;
      for (let i = 0; i < d.length; i += 97) {
        h ^= d[i];
        h = Math.imul(h, 16777619);
      }
      return h >>> 0;
    });

  test('pausing freezes the disk and the jets', async ({ page, app }) => {
    await app.boot();
    await frame(page, 'Quasar Cannon');
    await page.waitForTimeout(500);
    const first = await pixels(page);
    await page.waitForTimeout(1400);
    const second = await pixels(page);
    expect(second).toBe(first);
  });

  /** The brightest pixel in the annulus a disk would occupy. */
  const flowBrightness = page =>
    page.evaluate(() => {
      const c = document.getElementById('simulationCanvas');
      const g = c.getContext('2d');
      const cx = Math.round(c.width / 2);
      const cy = Math.round(c.height / 2);
      // A band out along the horizontal, starting outside the horizon.
      const d = g.getImageData(cx + 40, cy - 8, 80, 16).data;
      let max = 0;
      for (let i = 0; i < d.length; i += 4) {
        max = Math.max(max, d[i] + d[i + 1] + d[i + 2]);
      }
      return max;
    });

  test('a vacuum merger stays dark where an accreting hole is bright', async ({
    page,
    app,
  }) => {
    await app.boot();
    const seen = await frame(page, 'GW150914', 0.1);
    expect(seen.env).toBe('quiescent');
    await page.waitForTimeout(400);
    const dark = await flowBrightness(page);

    await frame(page, 'Black Hole Lab', 0.1);
    await page.waitForTimeout(400);
    const lit = await flowBrightness(page);

    // Not an absolute threshold: stars are on this canvas too. The claim is
    // that the merger has no flow where the accreting hole plainly does.
    expect(lit).toBeGreaterThan(dark * 1.6);
  });

  test('an accreting hole is not dark, and the centre still is', async ({
    page,
    app,
  }) => {
    await app.boot();
    await frame(page, 'Black Hole Lab', 0.1);
    await page.waitForTimeout(500);
    const read = await page.evaluate(() => {
      const c = document.getElementById('simulationCanvas');
      const g = c.getContext('2d');
      const mid = g.getImageData(
        Math.round(c.width / 2) - 2,
        Math.round(c.height / 2) - 2,
        4,
        4
      ).data;
      let centre = 0;
      for (let i = 0; i < mid.length; i += 4) {
        centre = Math.max(centre, mid[i] + mid[i + 1] + mid[i + 2]);
      }
      // A band out along the disk's major axis, which is where the flow is.
      const band = g.getImageData(
        Math.round(c.width / 2) + 40,
        Math.round(c.height / 2) - 6,
        60,
        12
      ).data;
      let flow = 0;
      for (let i = 0; i < band.length; i += 4) {
        flow = Math.max(flow, band[i] + band[i + 1] + band[i + 2]);
      }
      return { centre, flow };
    });
    expect(read.centre).toBeLessThan(90);
    expect(read.flow).toBeGreaterThan(read.centre);
  });

  test('the same state at the same time draws the same picture', async ({
    page,
    app,
  }) => {
    await app.boot();
    await frame(page, 'Quasar Cannon');
    await page.waitForTimeout(400);
    const a = await pixels(page);
    // Rebuild the identical scene and compare.
    await frame(page, 'Quasar Cannon');
    await page.waitForTimeout(400);
    const b = await pixels(page);
    expect(b).toBe(a);
  });
});

test.describe('the inspector says which numbers are which', () => {
  test('it offers the appearance controls, and they change no mass', async ({
    page,
    app,
  }) => {
    await app.boot();
    await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      ui.loadScenarioByKey('Black Hole Lab');
      const sim = await import('/js/physics.js');
      ui.showObjectInspector(sim.bh_list[0], 'BlackHole');
    });
    const panel = page.locator('#detailsTab');
    await expect(panel).toContainText(/Appearance and environment/i);

    // It is a disclosure, and closed is the right default: these are display
    // choices and not what most people open the inspector for.
    const block = page.locator('details.insp-appearance');
    await expect(block).not.toHaveAttribute('open', '');
    await block.locator('summary').click();

    const before = await page.evaluate(async () => {
      const sim = await import('/js/physics.js');
      return sim.bh_list[0].mass;
    });
    await page.locator('#bhEnvironment').selectOption('jet');
    await page.locator('#bhInclination').fill('12');
    await page.locator('#bhInclination').dispatchEvent('input');
    const after = await page.evaluate(async () => {
      const sim = await import('/js/physics.js');
      const bh = sim.bh_list[0];
      return {
        mass: bh.mass,
        env: bh.appearance.environment,
        inc: bh.appearance.inclinationDeg,
      };
    });
    expect(after.mass).toBe(before);
    expect(after.env).toBe('jet');
    expect(after.inc).toBe(12);
  });
});
