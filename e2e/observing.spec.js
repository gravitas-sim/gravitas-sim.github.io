// =============================================================================
// The observing instruments, and the geometry they share
// -----------------------------------------------------------------------------
// Workflows 7 to 10. Light curve, radial velocity and astrometry are three
// different measurements of the same system from the same place, and the thing
// most likely to break between them is that they stop agreeing about where the
// observer is standing. So each panel is checked on its own and then all three
// are checked against one move of the shared geometry.
//
// The Transit Lab scenario is used throughout: it is the one built to be
// measured, at true relative scale, with a single star and a single planet.
// =============================================================================

import { test, expect } from './fixtures.js';

/** Get all three panels open on a system worth observing. */
async function openObservatory(page, app) {
  await app.boot();
  await app.loadScenario('Transit Lab');
  await app.waitForFrames(10);
  await app.openPanel('toggleLightCurve', 'lightCurveContainer');
  await app.openPanel('toggleRadialVelocity', 'rvContainer');
  await app.openPanel('toggleAstrometry', 'astrometryContainer');
}

test.describe('the light curve', () => {
  test(
    'opens, plots, and reports a status',
    { tag: '@cross-browser' },
    async ({ page, app }) => {
      await app.boot();
      await app.loadScenario('Transit Lab');
      await app.openPanel('toggleLightCurve', 'lightCurveContainer');

      await expect(page.locator('#lightCurveCanvas')).toBeVisible();
      await expect(page.locator('#lightCurveStatus')).not.toBeEmpty();

      // It has to actually accumulate samples, not merely appear. A panel that
      // opens and then records nothing is the failure a DOM assertion misses.
      await expect
        .poll(
          () =>
            page.evaluate(async () => {
              const lc = await import('/js/lightCurve.js');
              return lc.lightCurveSeries().flux.length;
            }),
          { timeout: 20_000 }
        )
        .toBeGreaterThan(5);

      // And the brightness it records has to be a number.
      const brightness = await page.evaluate(async () => {
        const lc = await import('/js/lightCurve.js');
        return lc.currentBrightness();
      });
      expect(Number.isFinite(brightness)).toBe(true);
    }
  );

  test('closes without leaving the toggle inconsistent', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.loadScenario('Transit Lab');
    await app.openPanel('toggleLightCurve', 'lightCurveContainer');

    await page.locator('#closeLightCurve').click();
    await expect(page.locator('#lightCurveContainer')).toBeHidden();

    // Reopening from the same toggle has to work: a stale flag here leaves a
    // panel that can never be brought back without a reload.
    await app.openPanel('toggleLightCurve', 'lightCurveContainer');
    await expect(page.locator('#lightCurveContainer')).toBeVisible();
  });
});

test.describe('radial velocity', () => {
  test('opens and reports a velocity for the observed star', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.loadScenario('Exoplanet Characterization Lab');
    await app.waitForFrames(10);
    await app.openPanel('toggleRadialVelocity', 'rvContainer');

    await expect(page.locator('#rvCanvas')).toBeVisible();
    await expect(page.locator('#rvTarget')).not.toBeEmpty();

    // This scenario deliberately lets the star move, so a reflex velocity is
    // something the panel can honestly report.
    await expect
      .poll(
        () =>
          page.evaluate(async () => {
            const rv = await import('/js/radialVelocity.js');
            return rv.currentRadialVelocity();
          }),
        { timeout: 20_000 }
      )
      .not.toBeNull();
  });

  test('says nothing rather than inventing a signal when the star is pinned', async ({
    page,
    app,
  }) => {
    // Transit Lab pins the star, so a reflex velocity would be an artifact. The
    // panel refusing to report one is a deliberate behaviour worth defending.
    await app.boot();
    await app.loadScenario('Transit Lab');
    await app.openPanel('toggleRadialVelocity', 'rvContainer');

    const held = await page.evaluate(async () => {
      const rv = await import('/js/radialVelocity.js');
      return {
        pinned: rv.starIsHeldFixed(),
        velocity: rv.currentRadialVelocity(),
      };
    });
    expect(held.pinned).toBe(true);
    expect(held.velocity).toBeNull();
    // And it explains itself rather than showing a blank.
    await expect(page.locator('#rvNotice')).toBeVisible();
  });
});

test.describe('astrometry', () => {
  test('opens and reports a signature at an assumed distance', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.loadScenario('Exoplanet Characterization Lab');
    await app.waitForFrames(10);
    await app.openPanel('toggleAstrometry', 'astrometryContainer');

    await expect(page.locator('#astrometryCanvas')).toBeVisible();
    await expect(page.locator('#astrometryTarget')).not.toBeEmpty();

    const offset = await page.evaluate(async () => {
      const a = await import('/js/astrometry.js');
      return a.currentAstrometricOffset();
    });
    expect(offset).not.toBeNull();
    expect(Number.isFinite(offset.arcsec)).toBe(true);

    // Distance changes the angle and never the orbit, which is the whole point
    // of the panel.
    const scaled = await page.evaluate(async () => {
      const a = await import('/js/astrometry.js');
      const before = a.currentAstrometricOffset();
      const d0 = a.getAssumedDistance();
      a.setAssumedDistance(d0 * 2);
      const after = a.currentAstrometricOffset();
      a.setAssumedDistance(d0);
      return {
        beforeAu: before.au,
        afterAu: after.au,
        ratio: after.arcsec / before.arcsec,
      };
    });
    expect(scaled.afterAu).toBeCloseTo(scaled.beforeAu, 6);
    expect(scaled.ratio).toBeCloseTo(0.5, 3);
  });
});

test.describe('the shared observer geometry', () => {
  test('all three panels are open at once and none of them break', async ({
    page,
    app,
  }) => {
    await openObservatory(page, app);
    await expect(page.locator('#lightCurveContainer')).toBeVisible();
    await expect(page.locator('#rvContainer')).toBeVisible();
    await expect(page.locator('#astrometryContainer')).toBeVisible();
    await app.waitForFrames(30);
  });

  test('moving the observer reaches every panel', async ({ page, app }) => {
    await openObservatory(page, app);

    const before = await app.observerGeometry();
    expect(before.inclination).toBe(90);

    // Each panel owns an observer control, and all of them are views onto one
    // shared geometry. If they had each kept their own, this would drift.
    const controls = [
      '#lightCurveObserverControls',
      '#rvObserverControls',
      '#astrometryObserverControls',
    ];
    for (const sel of controls) {
      await expect(page.locator(sel)).toHaveCount(1);
    }

    await app.setObserver({ inclination: 45, positionAngle: 120 });
    await expect
      .poll(() => app.observerGeometry(), { timeout: 10_000 })
      .toEqual({ positionAngle: 120, inclination: 45 });

    // The panels have to survive being rephased, and keep running. The check is
    // on the containers rather than on the canvases: with three instruments open
    // the stack deliberately collapses the least recently used ones to their
    // title bar, so a hidden canvas here is the layout working, not a break.
    await app.waitForFrames(30);
    for (const id of [
      '#lightCurveContainer',
      '#rvContainer',
      '#astrometryContainer',
    ]) {
      await expect(page.locator(id)).toBeVisible();
    }
    await expect(page.locator('#rvStatus')).not.toBeEmpty();
    await expect(page.locator('#astrometryStatus')).not.toBeEmpty();
  });

  test('a collapsed panel comes back when its title bar is clicked', async ({
    page,
    app,
  }) => {
    // The promise the stacking layout makes: nothing is lost, a collapsed panel
    // is one click from full size. Worth defending, because the alternative
    // failure - a panel that collapses and can never be reopened - looks
    // identical until someone tries.
    await openObservatory(page, app);
    await app.waitForFrames(10);

    const collapsed = page.locator('.is-collapsed').first();
    const anyCollapsed = (await page.locator('.is-collapsed').count()) > 0;
    test.skip(
      !anyCollapsed,
      'this viewport fits all three panels, so none collapsed'
    );

    const id = await collapsed.evaluate(el => el.id);
    await collapsed.click();
    await expect
      .poll(
        () =>
          page.evaluate(
            sel =>
              !document.querySelector(sel)?.classList.contains('is-collapsed'),
            `#${id}`
          ),
        { timeout: 10_000 }
      )
      .toBe(true);
  });

  test('a face-on orbit produces no radial-velocity amplitude', async ({
    page,
    app,
  }) => {
    // A physics claim the panels have to agree with: at i = 0 the line of sight
    // is perpendicular to the orbit and there is nothing to measure.
    await app.boot();
    await app.loadScenario('Exoplanet Characterization Lab');
    await app.openPanel('toggleRadialVelocity', 'rvContainer');
    await app.waitForFrames(20);

    await app.setObserver({ inclination: 0 });
    await app.waitForFrames(30);

    const rv = await page.evaluate(async () => {
      const m = await import('/js/radialVelocity.js');
      return m.currentRadialVelocity();
    });
    // Either it reports nothing, or it reports something indistinguishable from
    // zero. Both are honest; a finite amplitude would not be.
    if (rv !== null) expect(Math.abs(rv)).toBeLessThan(1e-6);
  });

  test('the reference frame selector re-expresses the view', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.loadScenario('Solar System');
    await app.waitForFrames(20);

    // The rail is an accordion, so the Tools section has to be open before the
    // frame selector is reachable - which is what a user does too.
    await app.railControl('referenceFrameSelect');
    const select = page.locator('#referenceFrameSelect');

    await select.selectOption('barycenter');
    await expect
      .poll(
        () =>
          page.evaluate(async () => {
            const f = await import('/js/referenceFrame.js');
            return f.frameMode();
          }),
        { timeout: 10_000 }
      )
      .toBe('barycenter');

    await app.waitForFrames(30);
    expect((await app.bodySnapshot()).nonFinite).toBe(0);

    await select.selectOption('world');
    await expect
      .poll(
        () =>
          page.evaluate(async () => {
            const f = await import('/js/referenceFrame.js');
            return f.frameMode();
          }),
        { timeout: 10_000 }
      )
      .toBe('world');
  });
});
