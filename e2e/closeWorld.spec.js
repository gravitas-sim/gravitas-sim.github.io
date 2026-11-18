// =============================================================================
// A world seen close: the lit fraction and the terminator, in pixels
// -----------------------------------------------------------------------------
// The tolerances are tests/fixtures/light-phase-tolerances.json, fixed before
// the drawing (DESIGN_SYSTEM.md, "A world seen close"). The path is the one the
// sandbox fills (js/bodyVisuals.js nightPath), drawn in the browser's own
// canvas on an 80 px disc: the lit pixel fraction against (1 + cos a) / 2 at
// each angle, and the direction of the lit part's centroid against the light
// where there is an edge to orient. tests/closeWorld.test.js checks the phase
// on the fixture world and the path's exact area; this checks what a browser
// rasterizes. Then the label: a body selected in a scene with no star says its
// shading is illustration, in the canvas description and in the inspector.
// =============================================================================

import { readFileSync } from 'node:fs';
import { test, expect } from './fixtures.js';

const TOL = JSON.parse(
  readFileSync(
    new URL('../tests/fixtures/light-phase-tolerances.json', import.meta.url),
    'utf8'
  )
);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('gravitas_orientation_seen_v1', '1');
    localStorage.setItem('gravitas_welcome_seen_v1', '1');
  });
});

test('the lit fraction and the terminator hold their tolerances', async ({
  page,
}) => {
  await page.goto('/');
  const rows = await page.evaluate(
    async ({ angles, r }) => {
      const { nightPath } = await import('/js/bodyVisuals.js');
      const size = 2 * r + 8;
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      const at = { x: size / 2, y: size / 2 };
      const out = [];
      for (const deg of angles) {
        // A light direction that is not along an axis, so the edge crosses
        // the pixel grid at an angle.
        const th = 0.61 + (deg * Math.PI) / 360;
        const light = { x: Math.cos(th), y: Math.sin(th) };
        const cosA = Math.cos((deg * Math.PI) / 180);
        ctx.clearRect(0, 0, size, size);
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(at.x, at.y, r, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = '#f00';
        nightPath(ctx, at, r, light, cosA);
        ctx.fill();
        const px = ctx.getImageData(0, 0, size, size).data;
        let disc = 0;
        let lit = 0;
        let sx = 0;
        let sy = 0;
        for (let i = 0; i < px.length; i += 4) {
          if (px[i + 3] < 128) continue;
          disc++;
          // White is lit; red (green channel low) is night.
          if (px[i + 1] < 128) continue;
          lit++;
          const p = i / 4;
          sx += (p % size) + 0.5 - at.x;
          sy += Math.floor(p / size) + 0.5 - at.y;
        }
        const lightDeg = (th * 180) / Math.PI;
        const centroidDeg = (Math.atan2(sy, sx) * 180) / Math.PI;
        let off = Math.abs(centroidDeg - lightDeg) % 360;
        if (off > 180) off = 360 - off;
        out.push({ deg, fraction: lit / disc, want: (1 + cosA) / 2, off });
      }
      return out;
    },
    { angles: TOL.angles, r: TOL.minRadiusPx }
  );
  for (const row of rows) {
    expect(
      Math.abs(row.fraction - row.want),
      `lit fraction at ${row.deg} degrees`
    ).toBeLessThanOrEqual(TOL.litFraction);
    if (TOL.orientedAngles.includes(row.deg)) {
      expect(row.off, `orientation at ${row.deg} degrees`).toBeLessThanOrEqual(
        TOL.orientationDeg
      );
    }
  }
});

test('a world in a scene with no star says its shading is illustration', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForFunction(() => window.splashScreenEnded === true);
  const said = await page.evaluate(async () => {
    const ui = await import('/js/ui.js');
    const physics = await import('/js/physics.js');
    const { summaryText } = await import('/js/canvasSummary.js');
    ui.SETTINGS.preset_scenario = 'earth-moon-system';
    ui.initialize_simulation({ seed: 'close-world' });
    const earth = physics.planets.find(p => p.name === 'Earth');
    ui.state.selectedObject = { object: earth, type: 'Planet' };
    return summaryText();
  });
  expect(said).toContain('No star in this scene: shading is illustration.');
  expect(said).toContain('Surface markings, when it is large on screen');
});
