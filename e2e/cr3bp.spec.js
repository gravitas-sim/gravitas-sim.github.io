// =============================================================================
// The restricted three-body teaching mode
// -----------------------------------------------------------------------------
// tests/cr3bp.test.js pins the mathematics: where the equilibria are, that the
// Jacobi constant is conserved by the equations, and where access opens. What
// only a browser can establish is that the overlay is describing the system on
// screen - that the scenario really is the circular restricted problem, that
// the constant is conserved by the application's own integrator rather than by
// a test one, and that the claims switch off when they stop being true.
// =============================================================================

import { test, expect } from './fixtures.js';

/** Load the lab and wait for the panel its scenario brings. */
async function openLab(page, app) {
  await app.boot();
  await app.loadScenario('Lagrange Point Lab');
  await app.waitForFrames(5);
  await expect(page.locator('#cr3bpContainer')).toBeVisible({
    timeout: 30_000,
  });
}

/** Whatever the panel is currently reporting. */
const readout = page =>
  page.evaluate(async () => {
    const m = await import('/js/cr3bpPanel.js');
    return m.cr3bpReadout();
  });

test.describe('the scenario is the problem it claims to be', () => {
  test('two bodies, a circular orbit, and a tracer nobody notices', async ({
    page,
    app,
  }) => {
    await openLab(page, app);
    const out = await readout(page);

    expect(out.ok).toBe(true);
    // Circular to nine figures, which is what makes a static zero-velocity
    // curve a drawing of this system rather than of an average of it.
    expect(out.eccentricity).toBeLessThan(1e-6);
    // Below Routh's ratio, so L4 and L5 are stable and the lesson can show a
    // stable equilibrium beside three that never are.
    expect(out.mu).toBeGreaterThan(0);
    expect(out.mu).toBeLessThan(0.0385208965);
    expect(out.points.filter(p => p.linearlyStable).map(p => p.name)).toEqual([
      'L4',
      'L5',
    ]);
  });

  test('the bodies sit where the normalisation says they do', async ({
    page,
    app,
  }) => {
    await openLab(page, app);
    const geom = await page.evaluate(async () => {
      const p = await import('/js/physics.js');
      const { massRatio } = await import('/js/cr3bp.js');
      const [a, b] = p.stars;
      const M = a.mass + b.mass;
      const bx = (a.mass * a.pos.x + b.mass * b.pos.x) / M;
      const sep = Math.hypot(b.pos.x - a.pos.x, b.pos.y - a.pos.y);
      const by = (a.mass * a.pos.y + b.mass * b.pos.y) / M;
      // Distances from the barycentre, not x-coordinates. The pair has been
      // turning since the world was built, so an inertial x-coordinate is
      // mu*cos(theta) and says more about when it was measured than about how
      // the world was constructed.
      return {
        mu: massRatio(a.mass, b.mass),
        primary: Math.hypot(a.pos.x - bx, a.pos.y - by) / sep,
        secondary: Math.hypot(b.pos.x - bx, b.pos.y - by) / sep,
      };
    });
    // The heavier body at mu from the barycentre and the lighter at 1-mu. If
    // the world were built any other way the overlay would be drawn in the
    // wrong place.
    expect(geom.primary).toBeCloseTo(geom.mu, 6);
    expect(geom.secondary).toBeCloseTo(1 - geom.mu, 6);
  });
});

test.describe('the Jacobi constant, through the real integrator', () => {
  test('is conserved as the application integrates the tracer', async ({
    page,
    app,
  }, testInfo) => {
    testInfo.setTimeout(240_000);
    await openLab(page, app);

    const out = await page.evaluate(async () => {
      const physics = await import('/js/physics.js');
      const ui = await import('/js/ui.js');
      const panel = await import('/js/cr3bpPanel.js');
      ui.state.paused = true;

      const first = panel.cr3bpReadout().C;
      // Integrated by physics.js, not by anything this test wrote. That is the
      // point: the constant has to hold for the engine the lesson runs on.
      for (let i = 0; i < 20000; i++) physics.updatePhysics(0.02);
      const second = panel.cr3bpReadout().C;
      ui.state.paused = false;
      return { first, second };
    });

    expect(Number.isFinite(out.first)).toBe(true);
    // Four hundred time units, several orbits of the pair. Velocity Verlet at
    // this step holds the constant to a few parts in a hundred thousand; the
    // scenario picks that integrator for exactly this reason.
    expect(Math.abs(out.second - out.first) / Math.abs(out.first)).toBeLessThan(
      1e-4
    );
  });
});

test.describe('access opens and closes with the tracer', () => {
  test('a slower tracer is more confined, and the panel says which gates are shut', async ({
    page,
    app,
  }) => {
    await openLab(page, app);

    const out = await page.evaluate(async () => {
      const physics = await import('/js/physics.js');
      const ui = await import('/js/ui.js');
      const panel = await import('/js/cr3bpPanel.js');
      ui.state.paused = true;
      const tracer = physics.planets.find(b => b.name === 'Tracer');
      const base = { x: tracer.vel.x, y: tracer.vel.y };

      const sample = () => {
        const r = panel.cr3bpReadout();
        return {
          C: r.C,
          regime: r.regime.regime,
          l1: r.regime.l1Open,
          l2: r.regime.l2Open,
        };
      };

      // At rest in the rotating frame: the largest C the tracer can have here,
      // and the most confined it can be.
      const still = sample();

      // Give it some speed in the rotating frame. C must fall.
      tracer.vel.x = base.x + 0.35;
      tracer.vel.y = base.y + 0.2;
      const moving = sample();

      // Enough speed to open everything.
      tracer.vel.x = base.x + 1.4;
      tracer.vel.y = base.y + 0.9;
      const fast = sample();

      tracer.vel.x = base.x;
      tracer.vel.y = base.y;
      ui.state.paused = false;
      return { still, moving, fast };
    });

    // The sign convention, checked on the live system: more speed, smaller C.
    expect(out.moving.C).toBeLessThan(out.still.C);
    expect(out.fast.C).toBeLessThan(out.moving.C);

    // And a smaller C opens gates rather than closing them.
    expect(out.still.l1).toBe(false);
    expect(out.still.regime).toBe('separated');
    expect(out.fast.l1).toBe(true);
    expect(out.fast.l2).toBe(true);
  });

  test('the L1 neck opens within a hair of the predicted critical value', async ({
    page,
    app,
  }) => {
    await openLab(page, app);

    const out = await page.evaluate(async () => {
      const physics = await import('/js/physics.js');
      const ui = await import('/js/ui.js');
      const panel = await import('/js/cr3bpPanel.js');
      const { energeticallyAccessible } = await import('/js/cr3bp.js');
      ui.state.paused = true;

      const r = panel.cr3bpReadout();
      const l1 = r.points.find(p => p.name === 'L1');
      // Bisect on the tracer's speed for the value at which the neck opens,
      // then compare the Jacobi constant there against C1. The two should be
      // the same number: that is what "the neck opens at C1" means.
      const tracer = physics.planets.find(b => b.name === 'Tracer');
      const base = { x: tracer.vel.x, y: tracer.vel.y };
      const dir = { x: 0.6, y: 0.8 };
      const open = speed => {
        tracer.vel.x = base.x + dir.x * speed;
        tracer.vel.y = base.y + dir.y * speed;
        const C = panel.cr3bpReadout().C;
        return { C, open: energeticallyAccessible(l1.x, 0, r.mu, C) };
      };

      let lo = 0;
      let hi = 3;
      for (let i = 0; i < 60; i++) {
        const mid = (lo + hi) / 2;
        if (open(mid).open) hi = mid;
        else lo = mid;
      }
      const atThreshold = open(hi).C;
      tracer.vel.x = base.x;
      tracer.vel.y = base.y;
      ui.state.paused = false;
      return { atThreshold, C1: l1.C };
    });

    // The critical value found by bisecting the live system is the critical
    // value the closed form predicts.
    expect(out.atThreshold).toBeCloseTo(out.C1, 6);
  });
});

test.describe('the claims switch off when they stop being true', () => {
  test('adding a third massive body disables the overlay and says why', async ({
    page,
    app,
  }) => {
    await openLab(page, app);
    expect((await readout(page)).ok).toBe(true);

    const after = await page.evaluate(async () => {
      const physics = await import('/js/physics.js');
      const panel = await import('/js/cr3bpPanel.js');
      // A third star, which is exactly what a curious student does next.
      const model = physics.stars[0];
      const extra = Object.create(Object.getPrototypeOf(model));
      Object.assign(extra, model, {
        id: 9999,
        pos: { x: model.pos.x + 500, y: 400 },
        vel: { x: 0, y: 0 },
        name: 'Interloper',
      });
      physics.stars.push(extra);
      panel.refreshCr3bp();
      const out = panel.cr3bpReadout();
      const text = document.getElementById('cr3bpValidity').textContent;
      physics.stars.pop();
      panel.refreshCr3bp();
      return { out, text };
    });

    expect(after.out.ok).toBe(false);
    expect(after.out.violations).toContain('bodyCount');
    // Named on screen, not merely switched off: "this does not apply" without
    // a reason is indistinguishable from a broken panel.
    expect(after.text).toMatch(/two massive bodies/i);
  });

  test('a tracer heavy enough to matter disables it', async ({ page, app }) => {
    await openLab(page, app);

    const after = await page.evaluate(async () => {
      const physics = await import('/js/physics.js');
      const panel = await import('/js/cr3bpPanel.js');
      const tracer = physics.planets.find(b => b.name === 'Tracer');
      const was = tracer.mass;
      tracer.mass = physics.stars[0].mass * 0.1;
      panel.refreshCr3bp();
      const out = panel.cr3bpReadout();
      tracer.mass = was;
      panel.refreshCr3bp();
      return out;
    });

    expect(after.ok).toBe(false);
    expect(after.violations).toContain('tracerTooHeavy');
  });

  test('the overlay is not registered in scenarios that are not this one', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.loadScenario('Solar System');
    await app.waitForFrames(5);
    // Nothing loaded it, so nothing draws.
    const count = await page.evaluate(async () => {
      const o = await import('/js/overlays.js');
      return o.overlayCount();
    });
    expect(count).toBe(0);
  });
});

test.describe('what the panel says', () => {
  test('states the normalisation and the sign convention', async ({
    page,
    app,
  }) => {
    await openLab(page, app);
    const text = await page.locator('#cr3bpContainer').innerText();
    // The convention is on screen, not in a comment.
    expect(text).toMatch(/barycentre|baricentro/i);
    expect(text).toMatch(/2Ω|2Ω/);
    expect(text).toMatch(/SLOWER|LARGER/);
  });

  test('separates accessible from reachable from stable', async ({
    page,
    app,
  }) => {
    await openLab(page, app);
    await page.evaluate(() => {
      document.querySelector('.cr3bp-claims').open = true;
    });
    const text = await page.locator('.cr3bp-claims').innerText();
    expect(text).toMatch(/gap in a wall, not a route/i);
    expect(text).toMatch(/Only integrating the trajectory settles it/i);
    expect(text).toMatch(/Nothing in a zero-velocity curve implies it/i);
  });

  test('renders in both languages with every string resolved', async ({
    page,
    app,
  }) => {
    for (const locale of ['en', 'es']) {
      await page.addInitScript(loc => {
        localStorage.setItem('gravitas_locale', loc);
      }, locale);
      await openLab(page, app);
      await page.evaluate(() => {
        document.querySelector('.cr3bp-claims').open = true;
      });
      const text = await page.locator('#cr3bpContainer').innerText();
      expect(text).not.toMatch(/cr3bp\./);
      expect(text.length).toBeGreaterThan(200);
    }
  });
});
