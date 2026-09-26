// =============================================================================
// The background sky, in a browser
// -----------------------------------------------------------------------------
// The model - distribution, colors, counts, the spatial index - is tested
// without a canvas in tests/starfield.test.js. What needs a browser is the part
// the rewrite actually changed: that the sky is pre-rendered and blitted rather
// than redrawn star by star, and that doing so did not quietly break
// determinism, parallax, lensing, the quality tier or reduced motion.
//
// Everything here reads the starfield canvas itself rather than the composited
// page, so nothing in the simulation on top can make a test pass or fail.
// =============================================================================

import { test, expect, requireScenarioKey } from './fixtures.js';

/**
 * A cheap, stable fingerprint of what is on the starfield canvas.
 *
 * Sampled on a grid rather than hashed pixel by pixel: a full 1440x900 read is
 * five megabytes across the bridge for every assertion, and a grid is enough to
 * tell two skies apart while being insensitive to a single star landing on a
 * different subpixel.
 */
async function skySignature(page, step = 7) {
  return page.evaluate(gridStep => {
    const canvas = document.getElementById('starfieldCanvas');
    const ctx = canvas.getContext('2d');
    const { width: w, height: h } = canvas;
    const data = ctx.getImageData(0, 0, w, h).data;
    let hash = 2166136261;
    let lit = 0;
    let total = 0;
    for (let y = 0; y < h; y += gridStep) {
      for (let x = 0; x < w; x += gridStep) {
        const i = (y * w + x) * 4;
        const v = (data[i] + data[i + 1] + data[i + 2]) / 3;
        total += v;
        if (v > 48) lit++;
        hash ^= Math.round(v);
        hash = Math.imul(hash, 16777619);
      }
    }
    return {
      hash: hash >>> 0,
      lit,
      mean: total / ((w / gridStep) * (h / gridStep)),
    };
  }, step);
}

/**
 * Count the star-like points on the starfield canvas.
 *
 * A local maximum rather than a brightness threshold, because the sky also
 * carries a smooth ambient gradient: thresholding counts the gradient and
 * would report a difference between two tiers that draw the same number of
 * stars. A star is a pixel meaningfully brighter than the pixels around it.
 */
async function starPoints(page) {
  return page.evaluate(() => {
    const canvas = document.getElementById('starfieldCanvas');
    const ctx = canvas.getContext('2d');
    const { width: w, height: h } = canvas;
    const d = ctx.getImageData(0, 0, w, h).data;
    const lum = i => (d[i] + d[i + 1] + d[i + 2]) / 3;
    let points = 0;
    for (let y = 2; y < h - 2; y++) {
      for (let x = 2; x < w - 2; x++) {
        const i = (y * w + x) * 4;
        const v = lum(i);
        if (v < 30) continue;
        const around =
          (lum(i - 8) + lum(i + 8) + lum(i - w * 8) + lum(i + w * 8)) / 4;
        if (v - around > 18) points++;
      }
    }
    return points;
  });
}

/**
 * Build a world at a chosen seed, paused, and wait until the sky shows it.
 *
 * With no scenario named the world is empty, so nothing in it lenses the sky
 * and what is read back is the sky alone. The lensing case is 'Binary BH',
 * asked for by name in its own test below.
 *
 * The rebuild paints the new seed's sky itself, but at the zoom the world was
 * built at, and the view is reset afterwards. Anything that lenses the sky
 * moves with the zoom, so where there is a black hole that is a second picture
 * of the same seed, and the render loop is what paints it. While paused, the
 * loop repaints at 10Hz. Two frames used to stand in for that repaint, and a
 * capture that fell inside the same tenth of a second as the rebuild read the
 * first picture: one seed, two skies.
 *
 * So the wait is for the loop's own count of starfield repaints to move. It is
 * read after the last change, so any repaint counted after it drew this seed
 * at this view.
 */
async function sky(page, app, { scenario, seed = 'sky', tier } = {}) {
  if (tier) {
    await page.evaluate(async t => {
      const ui = await import('/js/ui.js');
      const quality = await import('/js/quality.js');
      ui.SETTINGS.quality_tier = t;
      quality.setTier(t);
    }, tier);
  }
  if (scenario) {
    await requireScenarioKey(page, scenario);
    await page.evaluate(
      async ({ scenario: key, seed: s }) => {
        const ui = await import('/js/ui.js');
        ui.SETTINGS.preset_scenario = key;
        ui.initialize_simulation({ seed: s });
        ui.state.paused = true;
        ui.state.pan = { x: 0, y: 0 };
        ui.state.zoom = 1;
      },
      { scenario, seed }
    );
  } else {
    await app.emptyWorld(seed, { run: false });
  }
  const repainted = await page.evaluate(async () => {
    const render = await import('/js/render.js');
    render.perf.enabled = true;
    const before = render.perf.starPaints;
    const giveUp = performance.now() + 10_000;
    while (render.perf.starPaints === before) {
      if (performance.now() > giveUp) return false;
      await new Promise(r => window.requestAnimationFrame(r));
    }
    return true;
  });
  expect(repainted, 'the render loop never repainted the sky').toBe(true);
}

test('the same seed paints the same sky', async ({ page, app }) => {
  // Under reduced motion, because the twinkling subset is a function of the
  // clock: two captures taken seconds apart would differ for a reason that has
  // nothing to do with the seed. That the seed fixes the twinklers too is
  // covered without a canvas in tests/starfield.test.js.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await app.boot();
  // At one tier throughout. Left on auto, the tier follows the measured frame
  // rate, and on a busy CI runner it stepped down between the first and third
  // capture - a sparser sky for the same seed, and a failure that said nothing
  // about the seed. The tiers' own skies are compared below.
  //
  // In an empty world, so this is the sky's own determinism. A black hole's
  // lensing is drawn where the hole is on screen, which makes that sky a
  // function of the zoom as well as the seed; that a hole bends the sky at all
  // is 'a black hole still bends the sky around it', below.
  await sky(page, app, { seed: 'alpha', tier: 'full' });
  const first = await skySignature(page);

  // A different world in between, so this is a rebuild rather than a no-op.
  await sky(page, app, { seed: 'beta', tier: 'full' });
  const other = await skySignature(page);

  await sky(page, app, { seed: 'alpha', tier: 'full' });
  const again = await skySignature(page);

  expect(again.hash).toBe(first.hash);
  // And the seeds genuinely differ, or the assertion above is vacuous.
  expect(other.hash).not.toBe(first.hash);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
});

test('a resize rebuilds the sky for the new window', async ({ page, app }) => {
  await page.setViewportSize({ width: 1200, height: 800 });
  await app.boot();
  await sky(page, app, { seed: 'resize' });

  const before = await page.evaluate(() => {
    const c = document.getElementById('starfieldCanvas');
    return { w: c.width, h: c.height };
  });

  await page.setViewportSize({ width: 800, height: 600 });
  await page.evaluate(
    () =>
      new Promise(r =>
        window.requestAnimationFrame(() => window.requestAnimationFrame(r))
      )
  );

  const after = await page.evaluate(() => {
    const c = document.getElementById('starfieldCanvas');
    return { w: c.width, h: c.height };
  });

  expect(after.w).toBeLessThan(before.w);
  // And it is a sky, not an empty canvas or a stretched one.
  const sig = await skySignature(page);
  expect(sig.lit).toBeGreaterThan(20);
});

test('a smaller window gets fewer stars than a large one', async ({
  page,
  app,
}) => {
  // Density per unit area, not a fixed ten thousand everywhere. The old field
  // put the same count on a phone as on a lecture projector, which was both
  // slower and denser than a sky should look at that size.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await app.boot();
  await sky(page, app, { seed: 'density' });
  const big = await starPoints(page);

  await page.setViewportSize({ width: 480, height: 700 });
  await sky(page, app, { seed: 'density' });
  const small = await starPoints(page);

  expect(big).toBeGreaterThan(200);
  expect(small).toBeLessThan(big / 2);
  // ...and it is still a sky rather than a handful of dots.
  expect(small).toBeGreaterThan(60);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
});

test('the low tier keeps a sky, and a cheaper one', async ({ page, app }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await app.boot({ qualityTier: 'full' });
  await sky(page, app, { seed: 'tier', tier: 'full' });
  const full = await starPoints(page);

  await sky(page, app, { seed: 'tier', tier: 'low' });
  const low = await starPoints(page);

  // Genuinely fewer stars drawn, not merely a dimmer backdrop.
  expect(low).toBeLessThan(full * 0.6);
  // ...but still a field worth looking at, not an empty backdrop.
  expect(low).toBeGreaterThan(60);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
});

test('the density setting still reaches the sky', async ({ page, app }) => {
  // The rewrite moved the star count out of SETTINGS and into a function of
  // the window and the tier, which quietly left the settings panel's Star
  // density slider connected to nothing. It is now read as a proportion.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await app.boot();
  await sky(page, app, { seed: 'slider' });
  const normal = await starPoints(page);

  const setDensity = value =>
    page.evaluate(async v => {
      const ui = await import('/js/ui.js');
      const render = await import('/js/render.js');
      ui.SETTINGS.star_density = v;
      render.generateStarfield();
      await new Promise(r =>
        window.requestAnimationFrame(() => window.requestAnimationFrame(r))
      );
    }, value);

  await setDensity(2500);
  const quarter = await starPoints(page);
  expect(quarter).toBeLessThan(normal * 0.5);
  expect(quarter).toBeGreaterThan(20);

  await setDensity(0);
  expect(await starPoints(page)).toBe(0);

  await setDensity(10000);
  expect(await starPoints(page)).toBe(normal);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
});

test('nothing moves in the sky when reduced motion is asked for', async ({
  page,
  app,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await app.boot();
  expect(
    await page.evaluate(
      () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
  ).toBe(true);
  await sky(page, app, { seed: 'still' });

  const first = await skySignature(page);
  // Long enough for several twinkle repaints at 20Hz.
  await page.waitForTimeout(700);
  await page.evaluate(async () => {
    const render = await import('/js/render.js');
    render.drawStarfield();
  });
  const later = await skySignature(page);

  expect(later.hash).toBe(first.hash);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
});

test('a few stars do twinkle when motion is allowed', async ({ page, app }) => {
  await app.boot();
  await sky(page, app, { seed: 'twinkle' });

  // Sampled from the field rather than from the canvas: the twinkling set is
  // deliberately tiny, so a grid sample of the whole sky may miss all of it.
  const change = await page.evaluate(async () => {
    const render = await import('/js/render.js');
    const canvas = document.getElementById('starfieldCanvas');
    const ctx = canvas.getContext('2d');
    const read = () => {
      const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let sum = 0;
      for (let i = 0; i < d.length; i += 4) sum += d[i];
      return sum;
    };
    const a = read();
    // Advance the clock the twinkle is a function of.
    await new Promise(r => window.setTimeout(r, 420));
    render.drawStarfield();
    return Math.abs(read() - a);
  });

  expect(change).toBeGreaterThan(0);
});

test('panning moves the sky, but barely', async ({ page, app }) => {
  // Parallax is meant to be felt rather than seen: enough that the sky is not
  // painted onto the simulation, not so much that the background races the
  // foreground. Measured by correlating column brightness before and after a
  // pan, which aggregates hundreds of stars and so survives a sparse field.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await app.boot();
  await sky(page, app, { seed: 'parallax' });

  const columns = () =>
    page.evaluate(() => {
      const canvas = document.getElementById('starfieldCanvas');
      const ctx = canvas.getContext('2d');
      const { width: w, height: h } = canvas;
      const d = ctx.getImageData(0, 0, w, h).data;
      const sums = new Float64Array(w);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          sums[x] += (d[i] + d[i + 1] + d[i + 2]) / 3;
        }
      }
      return Array.from(sums);
    });

  const before = await columns();

  const PAN = 600;
  await page.evaluate(async pan => {
    const ui = await import('/js/ui.js');
    const render = await import('/js/render.js');
    ui.state.pan = { x: pan, y: 0 };
    render.drawStarfield();
    await new Promise(r => window.requestAnimationFrame(r));
  }, PAN);

  const after = await columns();

  // The shift that best explains the new picture. Searched across the whole
  // width, wrapping the way the layers themselves wrap, so a sky that moved
  // with the camera is found rather than falling off the end of the search.
  const W = before.length;
  let best = 0;
  let bestScore = Infinity;
  for (let shift = 0; shift < W; shift++) {
    let score = 0;
    for (let x = 0; x < W; x += 3) {
      score += Math.abs(before[x] - after[(x + shift) % W]);
    }
    if (score < bestScore) {
      bestScore = score;
      best = shift;
    }
  }
  if (best > W / 2) best -= W;

  // It moved...
  expect(Math.abs(best)).toBeGreaterThan(0);
  // ...by a few percent of the camera, not with it.
  expect(Math.abs(best)).toBeLessThan(PAN * 0.05);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
});

test('a black hole still bends the sky around it', async ({ page, app }) => {
  await app.boot();
  await sky(page, app, { scenario: 'Binary BH', seed: 'lens' });

  // The sky near a hole differs from the sky far from it in a way that a plain
  // blit cannot produce: the stars there have been displaced.
  const bent = await page.evaluate(async () => {
    const physics = await import('/js/physics.js');
    const render = await import('/js/render.js');
    const canvas = document.getElementById('starfieldCanvas');
    const ctx = canvas.getContext('2d');
    const bh = physics.bh_list[0];
    if (!bh) return null;
    const at = physics.world_to_screen(bh.pos);
    const box = (cx, cy, r) => {
      const x = Math.max(0, Math.round(cx - r));
      const y = Math.max(0, Math.round(cy - r));
      const w = Math.min(canvas.width - x, r * 2);
      const h = Math.min(canvas.height - y, r * 2);
      if (w <= 0 || h <= 0) return null;
      return ctx.getImageData(x, y, w, h).data;
    };

    const before = box(at.x, at.y, 60);
    // Switch the lensing off and repaint: the same patch of sky, undistorted.
    const ui = await import('/js/ui.js');
    ui.SETTINGS.show_object_lensing = false;
    render.drawStarfield();
    const after = box(at.x, at.y, 60);
    ui.SETTINGS.show_object_lensing = true;
    render.drawStarfield();

    if (!before || !after) return null;
    let diff = 0;
    for (let i = 0; i < before.length; i += 4) {
      if (Math.abs(before[i] - after[i]) > 8) diff++;
    }
    return diff;
  });

  expect(bent).not.toBeNull();
  expect(bent).toBeGreaterThan(0);
});

test('the sky stays dark enough to read overlays against', async ({
  page,
  app,
}) => {
  // A background that got brighter would put the trails, vectors, scale bar and
  // labels drawn over it below contrast. Measured as the mean of the sky, which
  // is what those sit on.
  await app.boot();
  for (const theme of ['midnight', 'daylight']) {
    await page.evaluate(async t => {
      const themes = await import('/js/theme.js');
      themes.setTheme(t);
    }, theme);
    await sky(page, app, { seed: 'contrast' });
    const sig = await skySignature(page);
    if (theme === 'midnight') {
      // Dark ground: white text over it is high contrast.
      expect(sig.mean).toBeLessThan(60);
    }
    // And in either theme the field is not a wash of near-white.
    expect(sig.mean).toBeLessThan(210);
  }
});
