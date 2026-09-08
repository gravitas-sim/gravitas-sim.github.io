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
  /**
   * Put the tracer at a stated speed IN THE ROTATING FRAME.
   *
   * This test used to add a fixed vector to the tracer's inertial velocity and
   * call the starting state "at rest in the rotating frame". It was neither.
   * The tracer is orbiting, so it already has rotating-frame motion - 0.12 at
   * the earliest moment the panel can be sampled, growing with every frame the
   * world advances - and a fixed increment adds to that vectorially. When it
   * pointed the other way the tracer got SLOWER, the Jacobi constant correctly
   * went up, and the assertion that it must fall failed: on a loaded CI runner
   * one frame later than a quiet laptop, by 0.0023.
   *
   * So the speed is constructed instead, through the exact inverse of the
   * panel's own transform, and the world is frozen before anything is read so
   * the configuration cannot move underneath the measurements.
   */
  /** Sample the panel at a series of rotating-frame speeds, one frozen world. */
  const sweepSpeeds = (page, speeds, { reverse = false } = {}) =>
    page.evaluate(
      async ([list, flip]) => {
        const physics = await import('/js/physics.js');
        const ui = await import('/js/ui.js');
        const panel = await import('/js/cr3bpPanel.js');
        // Frozen FIRST. Every number below is about one configuration, and a
        // configuration that moves between samples is several.
        ui.state.paused = true;
        if (flip) {
          for (const b of [...physics.stars, ...physics.planets]) {
            b.vel.x = -b.vel.x;
            b.vel.y = -b.vel.y;
          }
        }
        const tracer = physics.planets.find(b => b.name === 'Tracer');
        const at = speed => {
          const system = panel.readSystem();
          const v = panel.inertialVelocityFor(system, { vx: speed, vy: 0 });
          tracer.vel.x = v.x;
          tracer.vel.y = v.y;
          const state = panel.tracerState(panel.readSystem());
          const r = panel.cr3bpReadout();
          return {
            asked: speed,
            speed: Math.hypot(state.vx, state.vy),
            C: r.C,
            regime: r.regime.regime,
            l1: r.regime.l1Open,
            l2: r.regime.l2Open,
          };
        };
        const spin = panel.readSystem().spin;
        const rows = list.map(at);
        ui.state.paused = false;
        return { rows, spin };
      },
      [speeds, reverse]
    );

  for (const direction of ['as it orbits', 'with the pair reversed']) {
    const reverse = direction === 'with the pair reversed';

    test(`a slower tracer is more confined, and the panel says which gates are shut (${direction})`, async ({
      page,
      app,
    }) => {
      await openLab(page, app);
      const { rows, spin } = await sweepSpeeds(page, [0, 0.3, 0.9], {
        reverse,
      });
      const [still, moving, fast] = rows;

      // The construction worked: these ARE the speeds that were asked for.
      for (const row of rows) {
        expect(row.speed).toBeCloseTo(row.asked, 9);
      }
      expect(reverse ? spin : -spin).toBe(
        -1 * (reverse ? 1 : 1) * (reverse ? 1 : 1)
      );

      // More speed, smaller C - and by exactly the difference of the squares,
      // which is the whole content of C = 2*Omega - v^2. Checked rather than
      // assumed, because a transform with a sign error would still produce a
      // monotone sequence.
      expect(moving.C).toBeLessThan(still.C);
      expect(fast.C).toBeLessThan(moving.C);
      expect(still.C - moving.C).toBeCloseTo(0.3 ** 2, 9);
      expect(still.C - fast.C).toBeCloseTo(0.9 ** 2, 9);

      // And a smaller C opens gates rather than closing them.
      expect(still.l1).toBe(false);
      expect(still.regime).toBe('separated');
      expect(fast.l1).toBe(true);
      expect(fast.l2).toBe(true);
    });
  }

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

// =============================================================================
// The force law, and which way round the frame goes
// -----------------------------------------------------------------------------
// The body-count and eccentricity checks were repaired first and still let
// through configurations where the law being integrated is not the one drawn:
// a dark-matter halo or MOND actually in force, or bodies close enough that
// the engine is clamping the force between them. And the drawn L4/L5 did not
// undo the reflection that a clockwise pair goes through, so on those systems
// the leading point was drawn and labelled at the trailing one.
// =============================================================================
test.describe('the force law has to be the one on the label', () => {
  test('a halo actually in force disables the overlay and says why', async ({
    page,
    app,
  }) => {
    await openLab(page, app);
    expect((await readout(page)).ok).toBe(true);

    const after = await page.evaluate(async () => {
      const physics = await import('/js/physics.js');
      const panel = await import('/js/cr3bpPanel.js');
      physics.updatePhysicsSettings({
        galaxy_gravity: 'halo',
        halo_v_flat: 6,
      });
      panel.refreshCr3bp();
      const out = panel.cr3bpReadout();
      const text = document.getElementById('cr3bpValidity').textContent;
      physics.updatePhysicsSettings({ galaxy_gravity: 'newtonian' });
      panel.refreshCr3bp();
      return { out, text };
    });

    expect(after.out.ok).toBe(false);
    expect(after.out.violations).toContain('extraPotential');
    expect(after.text).toMatch(/dark-matter halo|MOND/i);
  });

  test('MOND selected but doing nothing is not a reason to refuse', async ({
    page,
    app,
  }) => {
    // The setting is chosen and the scenario has declared no scale, so a0
    // comes out zero and the integration is Newtonian in every respect. A
    // check that refused this would be refusing a dormant setting.
    await openLab(page, app);

    const after = await page.evaluate(async () => {
      const physics = await import('/js/physics.js');
      const panel = await import('/js/cr3bpPanel.js');
      physics.updatePhysicsSettings({
        galaxy_gravity: 'mond',
        galaxy_kpc_per_unit: 0,
        galaxy_msun_per_unit: 0,
      });
      panel.refreshCr3bp();
      const out = panel.cr3bpReadout();
      physics.updatePhysicsSettings({ galaxy_gravity: 'newtonian' });
      panel.refreshCr3bp();
      return out;
    });

    // ok at all means no violations were raised, this one included.
    expect(after.ok).toBe(true);
  });

  test('MOND with a declared scale is refused', async ({ page, app }) => {
    await openLab(page, app);

    const after = await page.evaluate(async () => {
      const physics = await import('/js/physics.js');
      const panel = await import('/js/cr3bpPanel.js');
      physics.updatePhysicsSettings({
        galaxy_gravity: 'mond',
        galaxy_kpc_per_unit: 0.1,
        galaxy_msun_per_unit: 1e9,
      });
      panel.refreshCr3bp();
      const out = panel.cr3bpReadout();
      physics.updatePhysicsSettings({
        galaxy_gravity: 'newtonian',
        galaxy_kpc_per_unit: 0,
        galaxy_msun_per_unit: 0,
      });
      panel.refreshCr3bp();
      return out;
    });

    expect(after.ok).toBe(false);
    expect(after.violations).toContain('extraPotential');
  });

  test('a softening floor the bodies are inside is refused', async ({
    page,
    app,
  }) => {
    await openLab(page, app);
    expect((await readout(page)).ok).toBe(true);

    const after = await page.evaluate(async () => {
      const physics = await import('/js/physics.js');
      const panel = await import('/js/cr3bpPanel.js');
      const sys = panel.readSystem();
      // A floor bigger than the pair's own separation: the engine is clamping
      // the force between them and the picture is of a law nobody is using.
      physics.updatePhysicsSettings({
        min_interaction_distance: (sys?.separation ?? 100) * 2,
      });
      panel.refreshCr3bp();
      const out = panel.cr3bpReadout();
      physics.updatePhysicsSettings({ min_interaction_distance: 5 });
      panel.refreshCr3bp();
      return out;
    });

    expect(after.ok).toBe(false);
    expect(after.violations).toContain('softenedForces');
  });

  test('the check follows a setting back as well as forward', async ({
    page,
    app,
  }) => {
    // Responsiveness: switching the halo on and off again has to restore the
    // overlay, not leave it refusing a configuration that is now fine.
    await openLab(page, app);
    const states = await page.evaluate(async () => {
      const physics = await import('/js/physics.js');
      const panel = await import('/js/cr3bpPanel.js');
      const read = () => {
        panel.refreshCr3bp();
        return panel.cr3bpReadout().ok;
      };
      const before = read();
      physics.updatePhysicsSettings({
        galaxy_gravity: 'halo',
        halo_v_flat: 6,
      });
      const during = read();
      physics.updatePhysicsSettings({ galaxy_gravity: 'newtonian' });
      const after = read();
      return { before, during, after };
    });
    expect(states).toEqual({ before: true, during: false, after: true });
  });
});

test.describe('which way round the pair goes', () => {
  test('L4 leads the secondary whichever direction the pair orbits', async ({
    page,
    app,
  }) => {
    // The physical fact: L4 sits 60 degrees ahead of the secondary in the
    // direction of motion, and L5 the same distance behind. The drawn points
    // were computed in the counter-clockwise convention and rotated back into
    // the world without undoing the reflection a clockwise pair goes through,
    // so on those systems the two were swapped.
    await openLab(page, app);

    const check = await page.evaluate(async () => {
      const panel = await import('/js/cr3bpPanel.js');
      const physics = await import('/js/physics.js');

      /** Signed angle from the secondary to a point, about the barycentre. */
      const leadOf = (system, point) => {
        const ang = p =>
          Math.atan2(p.y - system.origin.y, p.x - system.origin.x);
        let d = ang(point) - ang(system.secondary.pos);
        while (d > Math.PI) d -= 2 * Math.PI;
        while (d < -Math.PI) d += 2 * Math.PI;
        // Positive means "ahead in the direction of motion" for either spin.
        return d * (system.spin ?? 1);
      };

      const measure = () => {
        const system = panel.readSystem();
        const points = panel.lagrangePointsInWorld(system);
        const at = name => points.find(p => p.name === name);
        return {
          spin: system.spin,
          mu: system.mu,
          l4: leadOf(system, at('L4')),
          l5: leadOf(system, at('L5')),
        };
      };

      const forward = measure();

      // Reverse the pair. Every velocity flips, so the same system now goes
      // round the other way and the frame's reflection kicks in.
      for (const b of [...physics.stars, ...physics.planets]) {
        b.vel.x = -b.vel.x;
        b.vel.y = -b.vel.y;
      }
      panel.refreshCr3bp();
      const reversed = measure();

      for (const b of [...physics.stars, ...physics.planets]) {
        b.vel.x = -b.vel.x;
        b.vel.y = -b.vel.y;
      }
      panel.refreshCr3bp();
      return { forward, reversed };
    });

    // Ahead and behind by the same angle, in both directions of travel. The
    // angle is not exactly sixty degrees as seen from the barycentre - the
    // equilateral triangle is on the primary-secondary line, and the
    // barycentre sits at -mu along it - so the expectation is computed rather
    // than assumed, from the same mass ratio the panel reports.
    for (const state of [check.forward, check.reversed]) {
      const expected = Math.atan2(Math.sqrt(3) / 2, 0.5 - state.mu);
      expect(state.l4).toBeCloseTo(expected, 6);
      expect(state.l5).toBeCloseTo(-expected, 6);
      // Leading, not trailing: the sign is the whole point.
      expect(state.l4).toBeGreaterThan(0);
      expect(state.l5).toBeLessThan(0);
    }
    // And the two runs really were different directions.
    expect(check.forward.spin).toBe(-check.reversed.spin);
  });
});
