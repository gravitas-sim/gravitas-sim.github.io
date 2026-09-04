// =============================================================================
// Galaxy gravity: three modes, and the ways a mode can escape its scenario
// -----------------------------------------------------------------------------
// tests/mond.test.js checks the arithmetic and tests/galaxyGravity.test.js
// checks the force law. What is left is everything the mode touches on its way
// through the application: a shared link, a reset, a scenario change, and the
// A/B bench that is supposed to notice when a variable moved.
//
// The failure this file is really written against is a mode that leaks. MOND is
// meaningful for a galaxy and meaningless for the Solar System, so the one
// thing that must never happen is a student loading a planetary scenario and
// silently getting modified gravity because a previous scenario left it on.
// =============================================================================

import { test, expect } from './fixtures.js';

/** The mode currently in the force law, and the legacy mirror beside it. */
const modeOf = page =>
  page.evaluate(async () => {
    const p = await import('/js/physics.js');
    return {
      mode: p.getPhysicsSetting('galaxy_gravity'),
      halo: p.getPhysicsSetting('dark_matter_halo'),
      kpc: p.getPhysicsSetting('galaxy_kpc_per_unit'),
    };
  });

const setMode = (page, mode) =>
  page.evaluate(async m => {
    const rc = await import('/js/rotationCurve.js');
    return rc.setGalaxyGravity(m);
  }, mode);

test.describe('the three modes in the running application', () => {
  test('a galaxy scenario can run all three, one at a time', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.loadScenario('Milky Way Rotation');
    await app.waitForFrames(10);

    for (const mode of ['newtonian', 'mond', 'halo', 'mond', 'newtonian']) {
      expect(await setMode(page, mode)).toBe(mode);
      const s = await modeOf(page);
      expect(s.mode).toBe(mode);
      // The invariant: the legacy boolean is the mode and nothing else.
      expect(s.halo).toBe(mode === 'halo');
    }
  });

  test('a planetary scenario refuses MOND and says why', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.loadScenario('Solar System');
    await app.waitForFrames(10);

    // The request is refused, not silently honoured.
    expect(await setMode(page, 'mond')).toBe('newtonian');
    expect((await modeOf(page)).mode).toBe('newtonian');
    expect((await modeOf(page)).kpc).toBe(0);

    await page.evaluate(async () => {
      const rc = await import('/js/rotationCurve.js');
      rc.setRotationCurveEnabled(true);
    });
    await page.waitForTimeout(400);
    await expect(page.locator('#rotationCurveModeMond')).toBeDisabled();
    // And the control explains itself rather than just being dead.
    const why = await page
      .locator('#rotationCurveModeMond')
      .getAttribute('title');
    expect(why).toMatch(/galax/i);
  });

  test('MOND does not survive a change to a scenario it does not apply to', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.loadScenario('Milky Way Rotation');
    expect(await setMode(page, 'mond')).toBe('mond');
    expect((await modeOf(page)).mode).toBe('mond');

    // The leak this test exists for.
    await app.loadScenario('Solar System');
    await app.waitForFrames(10);
    const after = await modeOf(page);
    expect(after.mode).toBe('newtonian');
    expect(after.kpc).toBe(0);
  });

  test('a reset of the same scenario returns it to the mode it ships with', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.loadScenario('Milky Way Rotation');
    // Ships with the halo, because it is the scenario that needs explaining.
    expect((await modeOf(page)).mode).toBe('halo');

    expect(await setMode(page, 'mond')).toBe('mond');
    await app.loadScenario('Milky Way Rotation');
    await app.waitForFrames(10);
    expect((await modeOf(page)).mode).toBe('halo');
  });

  test('Spiral Galaxy ships Newtonian, which is the whole point of it', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.loadScenario('Spiral Galaxy');
    await app.waitForFrames(10);
    const s = await modeOf(page);
    expect(s.mode).toBe('newtonian');
    expect(s.halo).toBe(false);
    // But MOND is available here, because it is a galaxy.
    expect(s.kpc).toBeGreaterThan(0);
    expect(await setMode(page, 'mond')).toBe('mond');
  });
});

test.describe('the mode travels with a shared link', () => {
  test('a link made under MOND reopens under MOND', async ({ page, app }) => {
    await app.boot();
    await app.loadScenario('Milky Way Rotation');
    expect(await setMode(page, 'mond')).toBe('mond');
    await app.waitForFrames(20);

    const fragment = await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      const share = await import('/js/shareState.js');
      return share.encodePayload(ui.captureShareState({ kind: 'full' }));
    });
    expect(typeof fragment).toBe('string');

    await app.boot({ url: `/#${fragment.replace(/^#/, '')}` });
    await app.waitForBodies(5);
    await app.waitForFrames(20);

    const restored = await modeOf(page);
    expect(restored.mode).toBe('mond');
    expect(restored.halo).toBe(false);
    expect(restored.kpc).toBeGreaterThan(0);
  });

  test('a link made under the halo reopens under the halo, not both', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.loadScenario('Milky Way Rotation');
    expect(await setMode(page, 'halo')).toBe('halo');
    await app.waitForFrames(20);

    const fragment = await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      const share = await import('/js/shareState.js');
      return share.encodePayload(ui.captureShareState({ kind: 'full' }));
    });

    await app.boot({ url: `/#${fragment.replace(/^#/, '')}` });
    await app.waitForBodies(5);
    await app.waitForFrames(20);

    const restored = await modeOf(page);
    expect(restored.mode).toBe('halo');
    expect(restored.halo).toBe(true);
  });
});

test.describe('the A/B bench treats the mode as a variable', () => {
  test('switching explanation is a difference the bench reports', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.loadScenario('Milky Way Rotation');
    await app.waitForFrames(10);

    // The bench hashes the canonical share payload. Two worlds that differ only
    // in which law is running have to hash differently, or a student could run
    // exactly the comparison this lesson asks for and be told that nothing
    // changed between the two runs.
    const captured = async mode => {
      await setMode(page, mode);
      await page.waitForTimeout(200);
      return page.evaluate(async () => {
        const ui = await import('/js/ui.js');
        const canon = await import('/js/experiments/canonicalState.js');
        const payload = ui.captureShareState({ kind: 'full' });
        return {
          hash: canon.hashState(canon.stripVolatile(payload)),
          json: canon.canonicalJson(canon.stripVolatile(payload)),
        };
      });
    };

    const underHalo = await captured('halo');
    const underMond = await captured('mond');

    expect(underHalo.hash).not.toBe(underMond.hash);
    expect(underMond.json).toContain('mond');
    // And the mode is a variable rather than cosmetic, so the bench is
    // entitled to warn about it having moved.
    expect(
      await page.evaluate(async () => {
        const canon = await import('/js/experiments/canonicalState.js');
        return canon.isVariableKey('galaxy_gravity');
      })
    ).toBe(true);
  });
});
