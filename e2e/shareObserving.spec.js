// =============================================================================
// A share link carries the observing context
// -----------------------------------------------------------------------------
// Inclination, position angle, reference frame, observed star and assumed
// distance used to travel only in an A/B bench payload. An ordinary link
// dropped them, so a link sent to demonstrate a 30-degree system reopened
// edge-on: the same scenario, the same seed, the same bodies, and a different
// measurement.
//
// These tests set a non-default context, encode a link, restore it into a fresh
// world, and compare what the instruments actually read - not what the payload
// says, which is the codec's job and is covered in tests/shareState.test.js.
// The tolerance is the serializer's: nine significant figures on the angles.
// =============================================================================

import { test, expect } from './fixtures.js';

/** A context nothing defaults to, so a dropped field cannot pass by accident. */
const CONTEXT = { inclination: 31.25, positionAngle: 137.5, distancePc: 480.5 };

/**
 * Set an observing context, capture a link, and restore it into a fresh world.
 *
 * @param {import('@playwright/test').Page} page - The page under test
 * @param {object} options - {kind, frameOnStar}
 * @returns {Promise<object>} What the instruments read before and after
 */
async function shareAndRestore(page, { kind, frameOnStar = false }) {
  return page.evaluate(
    async ([ctx, linkKind, useFrame]) => {
      const ui = await import('/js/ui.js');
      const share = await import('/js/shareState.js');
      const geom = await import('/js/observerGeometry.js');
      const rv = await import('/js/radialVelocity.js');
      const ast = await import('/js/astrometry.js');
      const frame = await import('/js/referenceFrame.js');
      const physics = await import('/js/physics.js');

      // The instantaneous observables, which are what has to survive.
      const observe = () => ({
        inclination: geom.getInclination(),
        positionAngle: geom.getPositionAngle(),
        distancePc: ast.getAssumedDistance(),
        starId: rv.observedStarId(),
        starName: rv.observedStar()?.name ?? null,
        frameMode: frame.frameState().mode,
        frameObjectId: frame.frameState().objectId ?? null,
        rv: rv.currentRadialVelocity(),
        offsetAu: ast.currentAstrometricOffset()?.au ?? null,
        offsetArcsec: ast.currentAstrometricOffset()?.arcsec ?? null,
      });

      // Point everything somewhere non-default.
      geom.setInclination(ctx.inclination);
      geom.setPositionAngle(ctx.positionAngle);
      ast.setAssumedDistance(ctx.distancePc);

      const liveStars = physics.stars.filter(s => s.alive);
      const chosen = liveStars[liveStars.length - 1] ?? liveStars[0] ?? null;
      if (chosen) rv.setObservedStar(chosen.id);
      if (useFrame && chosen) frame.setFrame(frame.OBJECT, chosen.id);

      const before = observe();
      const payload = ui.captureShareState({ kind: linkKind });
      const fragment = await share.encodePayload(payload);

      // Disturb everything the link is supposed to restore, so that a link
      // which carried nothing would visibly fail rather than quietly pass.
      geom.setInclination(90);
      geom.setPositionAngle(0);
      ast.setAssumedDistance(10);
      rv.setObservedStar(null);
      frame.resetFrame();

      const decoded = await share.decodePayload(`#${fragment}`);
      ui.applyShareState(decoded);

      return { before, after: observe(), fragmentLength: fragment.length };
    },
    [CONTEXT, kind, frameOnStar]
  );
}

/** Angles are stored to nine significant figures; compare to that. */
function expectContextPreserved(before, after) {
  expect(after.inclination).toBeCloseTo(before.inclination, 6);
  expect(after.positionAngle).toBeCloseTo(before.positionAngle, 6);
  expect(after.distancePc).toBeCloseTo(before.distancePc, 6);
  expect(after.starId).toBe(before.starId);
  expect(after.starName).toBe(before.starName);
}

test.describe('an ordinary share link reproduces the viewing context', () => {
  for (const kind of ['seeded', 'full']) {
    test(`${kind}: inclination, position angle, distance and star`, async ({
      page,
      app,
    }) => {
      await app.boot();
      await app.loadScenario('Binary Star System');
      await app.waitForFrames(20);

      const { before, after } = await shareAndRestore(page, { kind });
      expectContextPreserved(before, after);

      // Instantaneous observables are compared only for a full link, and the
      // distinction is the point of the two kinds. A full link restores the
      // bodies where they were, so the reading must match. A seeded link
      // restores *the world as generated* - t = 0, not the moment of capture -
      // so the star is at a different orbital phase and the radial velocity
      // legitimately differs. Asserting otherwise would be asserting that a
      // seeded link is a full one.
      if (kind === 'full') {
        if (before.rv !== null && after.rv !== null) {
          expect(after.rv).toBeCloseTo(before.rv, 1);
        }
        if (before.offsetArcsec !== null) {
          expect(after.offsetArcsec).toBeCloseTo(before.offsetArcsec, 9);
        }
      }
    });

    test(`${kind}: a body-centred reference frame and its target`, async ({
      page,
      app,
    }) => {
      await app.boot();
      await app.loadScenario('Binary Star System');
      await app.waitForFrames(20);

      const { before, after } = await shareAndRestore(page, {
        kind,
        frameOnStar: true,
      });
      expect(before.frameMode).toBe('object');
      expect(after.frameMode).toBe('object');
      // The id must survive: regenerated from the seed, or carried with the
      // bodies for a full link.
      expect(after.frameObjectId).toBe(before.frameObjectId);
      expectContextPreserved(before, after);
    });
  }

  test('opening the astrometry panel does not overwrite the restored distance', async ({
    page,
    app,
  }) => {
    // adoptScenarioDistance() runs when the panel opens and used to overwrite
    // the distance unconditionally, so a link that specified one lost it the
    // moment anyone looked at the panel it applied to.
    await app.boot();
    await app.loadScenario('Exoplanet Characterization Lab');
    await app.waitForFrames(20);

    const distances = await page.evaluate(async pc => {
      const ui = await import('/js/ui.js');
      const share = await import('/js/shareState.js');
      const ast = await import('/js/astrometry.js');

      ast.setAssumedDistance(pc);
      const fragment = await share.encodePayload(
        ui.captureShareState({ kind: 'seeded' })
      );
      ast.setAssumedDistance(10);
      ui.applyShareState(await share.decodePayload(`#${fragment}`));

      const restored = ast.getAssumedDistance();
      ast.setAstrometryEnabled(true);
      const afterOpening = ast.getAssumedDistance();
      ast.setAstrometryEnabled(false);
      return { restored, afterOpening };
    }, CONTEXT.distancePc);

    expect(distances.restored).toBeCloseTo(CONTEXT.distancePc, 6);
    expect(distances.afterOpening).toBeCloseTo(CONTEXT.distancePc, 6);
  });

  test('a link made before this feature still opens on the defaults', async ({
    page,
    app,
  }) => {
    await app.boot();
    const defaults = await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      const share = await import('/js/shareState.js');
      const geom = await import('/js/observerGeometry.js');
      const ast = await import('/js/astrometry.js');

      geom.setInclination(20);
      geom.setPositionAngle(200);

      // A payload with no `x` block at all, which is every link ever made
      // before the extras existed.
      const payload = ui.captureShareState({ kind: 'seeded' });
      delete payload.x;
      ui.applyShareState(
        await share.decodePayload(`#${await share.encodePayload(payload)}`)
      );

      return {
        inclination: geom.getInclination(),
        positionAngle: geom.getPositionAngle(),
        distance: ast.getAssumedDistance(),
      };
    });

    expect(defaults.inclination).toBe(90);
    expect(defaults.positionAngle).toBe(0);
    expect(defaults.distance).toBeGreaterThan(0);
  });
});

test.describe('embed mode', () => {
  test('?embed=1 restores the same observing context', async ({
    page,
    app,
  }) => {
    await app.boot();
    await app.loadScenario('Binary Star System');
    await app.waitForFrames(20);

    const fragment = await page.evaluate(async ctx => {
      const ui = await import('/js/ui.js');
      const share = await import('/js/shareState.js');
      const geom = await import('/js/observerGeometry.js');
      const ast = await import('/js/astrometry.js');
      const rv = await import('/js/radialVelocity.js');
      const physics = await import('/js/physics.js');

      geom.setInclination(ctx.inclination);
      geom.setPositionAngle(ctx.positionAngle);
      ast.setAssumedDistance(ctx.distancePc);
      const live = physics.stars.filter(s => s.alive);
      if (live.length) rv.setObservedStar(live[live.length - 1].id);

      return share.encodePayload(ui.captureShareState({ kind: 'seeded' }));
    }, CONTEXT);

    // A fresh page in embed mode, opened on the link.
    await app.boot({ url: `/?embed=1#${fragment}` });
    await app.waitForFrames(20);

    const restored = await page.evaluate(async () => {
      const geom = await import('/js/observerGeometry.js');
      const ast = await import('/js/astrometry.js');
      return {
        embed: document.body.getAttribute('data-presentation'),
        inclination: geom.getInclination(),
        positionAngle: geom.getPositionAngle(),
        distancePc: ast.getAssumedDistance(),
      };
    });

    expect(restored.inclination).toBeCloseTo(CONTEXT.inclination, 6);
    expect(restored.positionAngle).toBeCloseTo(CONTEXT.positionAngle, 6);
    expect(restored.distancePc).toBeCloseTo(CONTEXT.distancePc, 6);
  });
});
