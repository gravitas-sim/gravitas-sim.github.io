// =============================================================================
// The spacetime view
// -----------------------------------------------------------------------------
// This panel had stopped appearing at all. Its base CSS rule - the one holding
// `position: fixed` and everything that depended on it - had gone missing, so
// the element fell into the document flow below a simulation container that is
// already the height of the window, and opening the view put a perfectly good
// WebGL panel 900 pixels below the bottom of a page that does not scroll.
//
// Nothing in the DOM looked wrong: the button toggled, the container's display
// went to block, the renderer reported "LIVE · 32 bodies". So the checks here
// are about geometry and about pixels, which are the two things that were
// actually false.
//
// WebGL is not available on every CI runner, and the application is written to
// degrade rather than break when it is missing. These tests skip themselves in
// that case rather than failing for a reason nobody can act on.
// =============================================================================

import { test, expect } from './fixtures.js';

/** Open the view and give the renderer a moment to build its first frames. */
async function openSpacetimeView(page, app) {
  await app.railControl('toggle3DView');
  await page.locator('#toggle3DView').click();
  await expect(page.locator('#threeViewportContainer')).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.locator('#threeViewport canvas')).toHaveCount(1);
}

/** @returns {Promise<boolean>} Whether this browser can render the view at all */
function hasWebGL(page) {
  return page.evaluate(() => {
    try {
      const c = document.createElement('canvas');
      return Boolean(c.getContext('webgl2') || c.getContext('webgl'));
    } catch {
      return false;
    }
  });
}

/**
 * The fraction of the 3-D canvas that is not background, as a percentage.
 *
 * Sampled over several frames and reduced with a maximum, because a WebGL
 * drawing buffer read outside the frame that drew it can come back empty; one
 * good frame is proof that the scene renders.
 */
function drawnPercent(page) {
  return page.evaluate(async () => {
    const canvas = document.querySelector('#threeViewport canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return 0;
    let best = 0;
    for (let frame = 0; frame < 12; frame++) {
      await new Promise(resolve => window.requestAnimationFrame(resolve));
      const { width, height } = canvas;
      const pixels = new Uint8Array(4 * width * height);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      let lit = 0;
      for (let p = 0; p < pixels.length; p += 4) {
        // The scene's background is 0x010102, so anything brighter is drawn.
        if (Math.max(pixels[p], pixels[p + 1], pixels[p + 2]) > 12) lit++;
      }
      best = Math.max(best, (100 * lit) / (width * height));
    }
    return best;
  });
}

test.describe('the spacetime view', () => {
  test.beforeEach(async ({ page, app }) => {
    await app.boot();
    await app.dismissFrontDoor();
    test.skip(!(await hasWebGL(page)), 'no WebGL in this browser');
  });

  test('opens into the window, not below it', async ({ page, app }) => {
    await app.loadScenario('Binary BH');
    await openSpacetimeView(page, app);

    const box = await page.evaluate(() => {
      const el = document.getElementById('threeViewportContainer');
      const rect = el.getBoundingClientRect();
      const stage = document
        .getElementById('threeViewport')
        .getBoundingClientRect();
      return {
        position: getComputedStyle(el).position,
        display: getComputedStyle(el).display,
        rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
        stageHeight: stage.height,
        viewport: { w: window.innerWidth, h: window.innerHeight },
      };
    });

    // Fixed, because everything else about where it sits depends on it.
    expect(box.position).toBe('fixed');
    // A flex column: the stage inside is `flex: 1` and gets its height here.
    // Set to `block` and the WebGL canvas silently collapses to nothing.
    expect(box.display).toBe('flex');
    expect(box.stageHeight).toBeGreaterThan(100);

    // Wholly on screen.
    expect(box.rect.w).toBeGreaterThan(200);
    expect(box.rect.h).toBeGreaterThan(200);
    expect(box.rect.x).toBeGreaterThanOrEqual(0);
    expect(box.rect.y).toBeGreaterThanOrEqual(0);
    expect(box.rect.x + box.rect.w).toBeLessThanOrEqual(box.viewport.w);
    expect(box.rect.y + box.rect.h).toBeLessThanOrEqual(box.viewport.h);
  });

  test('queues with the other instruments instead of covering them', async ({
    page,
    app,
  }) => {
    await app.loadScenario('Binary BH');
    await openSpacetimeView(page, app);
    await app.railControl('toggleLightCurve');
    await page.locator('#toggleLightCurve').click();
    await expect(page.locator('#lightCurveContainer')).toBeVisible();

    const { three, curve } = await page.evaluate(() => {
      const get = id => {
        const r = document.getElementById(id).getBoundingClientRect();
        return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
      };
      return {
        three: get('threeViewportContainer'),
        curve: get('lightCurveContainer'),
      };
    });

    // Same corner, stacked: the light curve keeps the anchored spot it has
    // always had and the spacetime view sits above it, clear of it.
    expect(Math.abs(three.left - curve.left)).toBeLessThan(4);
    expect(three.bottom).toBeLessThanOrEqual(curve.top);
  });

  test(
    'draws the scene, at any scale',
    { tag: '@cross-browser' },
    async ({ page, app }) => {
      // A compact scenario and a wide one. The wide one is the regression: the
      // camera's far plane was pinned at 6000 world units, and the Solar System
      // with its comets is 20,000 across, so the whole scene sat behind it and
      // the panel rendered nothing but its background.
      await app.loadScenario('Binary BH');
      await openSpacetimeView(page, app);
      expect(await drawnPercent(page)).toBeGreaterThan(2);

      // No Reset click: loading a world re-frames the view on its own, which is
      // what stops a scenario change from leaving the panel pointed at empty
      // space where the last scenario used to be.
      await app.loadScenario('Solar System');
      await page.waitForTimeout(2000);
      expect(await drawnPercent(page)).toBeGreaterThan(2);
    }
  );

  test('closes cleanly and gives the corner back', async ({ page, app }) => {
    await app.loadScenario('Binary BH');
    await openSpacetimeView(page, app);
    await page.locator('#close3DViewBtn').click();
    await expect(page.locator('#threeViewportContainer')).toBeHidden();
    await expect(page.locator('#toggle3DView')).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });
});
