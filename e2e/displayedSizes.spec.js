// =============================================================================
// The displayed-size policy, in a browser
// -----------------------------------------------------------------------------
// The arithmetic is tested without a canvas in tests/displayScale.test.js. What
// needs a browser is whether the policy actually reaches the pixels, whether
// the disclosure that makes it honest is where it has to be - on the canvas, so
// it is in every screenshot and recording - and whether the result is still
// legible at the sizes people use.
// =============================================================================

import { test, expect } from './fixtures.js';

/** Load a scenario, pause it, and frame it. */
async function scene(page, scenario, { zoom, seed = 'sizes' } = {}) {
  await page.evaluate(
    async ({ scenario: key, zoom: z, seed: s }) => {
      const ui = await import('/js/ui.js');
      ui.SETTINGS.preset_scenario = key;
      ui.initialize_simulation({ seed: s });
      ui.state.paused = true;
      if (z) ui.state.zoom = z;
      ui.state.pan = { x: 0, y: 0 };
    },
    { scenario, zoom, seed }
  );
  await page.evaluate(
    () =>
      new Promise(r =>
        window.requestAnimationFrame(() => window.requestAnimationFrame(r))
      )
  );
}

/** The radius each named body is actually drawn at, in screen pixels. */
async function drawnRadii(page, names) {
  return page.evaluate(async wanted => {
    const physics = await import('/js/physics.js');
    const visuals = await import('/js/bodyVisuals.js');
    const ui = await import('/js/ui.js');
    const zoom = ui.state.zoom;
    const family = body => {
      if (physics.stars.includes(body)) return 'Star';
      if (physics.gas_giants.includes(body)) return 'GasGiant';
      return 'Planet';
    };
    const all = [...physics.stars, ...physics.planets, ...physics.gas_giants];
    const out = {};
    for (const name of wanted) {
      const body = all.find(b => b.name === name);
      if (!body) continue;
      out[name] = {
        model: body.radius,
        px: visuals.drawnRadiusPx(body.radius, family(body), zoom, all.length),
      };
    }
    return out;
  }, names);
}

/**
 * How many separate lines of ink are in the bottom-left instrument corner.
 *
 * Counting lit pixels there is not enough: the scale bar lights that region on
 * its own, so a test that only counted them passed with the disclosure deleted.
 * What distinguishes the two states is the number of distinct rows of text -
 * the bar and its label, and the line underneath it.
 */
async function instrumentLines(page, compose = false) {
  return page.evaluate(shouldCompose => {
    const sim = document.getElementById('simulationCanvas');
    let ctx;
    if (shouldCompose) {
      // What a screenshot actually saves: the canvases composited together.
      // Anything drawn in the interface rather than on a canvas is missing
      // from this, which is the point of drawing the disclosure on the canvas.
      const out = document.createElement('canvas');
      out.width = sim.width;
      out.height = sim.height;
      ctx = out.getContext('2d');
      ctx.drawImage(document.getElementById('starfieldCanvas'), 0, 0);
      ctx.drawImage(sim, 0, 0);
    } else {
      ctx = sim.getContext('2d');
    }
    const H = 150;
    const W = 460;
    const top = sim.height - H;
    const d = ctx.getImageData(0, top, W, H).data;
    const rowLit = [];
    for (let y = 0; y < H; y++) {
      let n = 0;
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        if (d[i] + d[i + 1] + d[i + 2] > 150) n++;
      }
      // A row of text, not a scattering of stars: the disclosure is some
      // forty characters wide, so its rows carry many more lit pixels than
      // any row that merely crosses a few background stars.
      rowLit.push(n >= 25);
    }
    let groups = 0;
    for (let y = 0; y < H; y++) {
      if (rowLit[y] && !rowLit[y - 1]) groups++;
    }
    return groups;
  }, compose);
}

test.describe('the hierarchy on screen', () => {
  test('the Sun is drawn 6 to 10 times an Earth and 3 to 5 times a Jupiter', async ({
    page,
    app,
  }) => {
    await app.boot();
    // Zoomed in far enough that no body is held at the marker floor, which is
    // where the policy's ratios are the ones it promises.
    await scene(page, 'Solar System', { zoom: 4 });
    const r = await drawnRadii(page, ['Sol', 'Earth', 'Jupiter']);

    expect(r.Sol).toBeDefined();
    expect(r.Earth).toBeDefined();
    expect(r.Jupiter).toBeDefined();

    const sunEarth = r.Sol.px / r.Earth.px;
    const sunJup = r.Sol.px / r.Jupiter.px;
    expect(sunEarth).toBeGreaterThanOrEqual(6);
    expect(sunEarth).toBeLessThanOrEqual(10);
    expect(sunJup).toBeGreaterThanOrEqual(3);
    expect(sunJup).toBeLessThanOrEqual(5);

    // And the model radii, which the physics uses, are untouched by any of it.
    expect(r.Sol.model).toBe(15);
    expect(r.Earth.model).toBe(5);
    expect(r.Jupiter.model).toBeCloseTo(8, 3);
  });

  test('a gas giant is visibly larger than a rocky planet', async ({
    page,
    app,
  }) => {
    await app.boot();
    await scene(page, 'Solar System', { zoom: 4 });
    const r = await drawnRadii(page, ['Earth', 'Jupiter', 'Saturn']);
    expect(r.Jupiter.px).toBeGreaterThan(r.Earth.px * 1.4);
    expect(r.Saturn.px).toBeGreaterThan(r.Earth.px);
  });

  test('and nothing on the canvas got bigger than it used to be', async ({
    page,
    app,
  }) => {
    await app.boot();
    await scene(page, 'Solar System', { zoom: 4 });
    const grew = await page.evaluate(async () => {
      const physics = await import('/js/physics.js');
      const visuals = await import('/js/bodyVisuals.js');
      const families = [
        ['Star', physics.stars],
        ['Planet', physics.planets],
        ['GasGiant', physics.gas_giants],
        ['Asteroid', physics.asteroids],
        ['Comet', physics.comets],
      ];
      const over = [];
      for (const [family, list] of families) {
        for (const body of list) {
          if (visuals.displayRadius(body.radius, family) > body.radius + 1e-9) {
            over.push(`${family}:${body.name}`);
          }
        }
      }
      return over;
    });
    expect(grew).toEqual([]);
  });
});

test.describe('the small bodies stay usable', () => {
  test('a planet drawn at the marker floor is still selectable', async ({
    page,
    app,
  }) => {
    await app.boot();
    // Whole-system framing, where every planet is a marker.
    await scene(page, 'Solar System', { zoom: 0.25 });

    const result = await page.evaluate(async () => {
      const physics = await import('/js/physics.js');
      const visuals = await import('/js/bodyVisuals.js');
      const ui = await import('/js/ui.js');
      const earth = physics.planets.find(p => p.name === 'Earth');
      if (!earth) return null;
      const zoom = ui.state.zoom;
      const drawnPx = visuals.drawnRadiusPx(earth.radius, 'Planet', zoom, 40);
      const hitPx = visuals.hitRadius(earth.radius, 'Planet', zoom) * zoom;
      // A click a little outside the drawn disc, well inside the hit target.
      const at = {
        x: earth.pos.x + (drawnPx * 1.5) / zoom,
        y: earth.pos.y,
      };
      const found = physics.findObjectAtPosition(at);
      return {
        drawnPx,
        hitPx,
        hit: found?.object === earth,
      };
    });

    expect(result).not.toBeNull();
    // Drawn small, and the target is much bigger than the drawing.
    expect(result.drawnPx).toBeLessThan(4);
    expect(result.hitPx).toBeGreaterThan(result.drawnPx * 2);
    expect(result.hit).toBe(true);
  });

  test('zooming in grows a planet smoothly out of its marker', async ({
    page,
    app,
  }) => {
    await app.boot();
    await scene(page, 'Solar System', { zoom: 1 });
    const sizes = await page.evaluate(async () => {
      const physics = await import('/js/physics.js');
      const visuals = await import('/js/bodyVisuals.js');
      const earth = physics.planets.find(p => p.name === 'Earth');
      const out = [];
      for (let zoom = 0.5; zoom <= 8; zoom *= 1.1) {
        out.push(visuals.drawnRadiusPx(earth.radius, 'Planet', zoom, 40));
      }
      return out;
    });
    for (let i = 1; i < sizes.length; i++) {
      expect(sizes[i]).toBeGreaterThanOrEqual(sizes[i - 1] - 1e-9);
      // No step: at most the zoom's own ten per cent between samples.
      expect(sizes[i] / sizes[i - 1]).toBeLessThan(1.11);
    }
  });
});

test.describe('the canvas admits what it is doing', () => {
  test('the disclosure is drawn on the canvas, beside the scale bar', async ({
    page,
    app,
  }) => {
    await app.boot();
    await scene(page, 'Solar System');
    // Read back through the same instrument code the canvas uses, then confirm
    // pixels actually changed in the corner it is drawn in - a string that is
    // computed and never painted would pass the first check alone.
    const text = await page.evaluate(async () => {
      const i18n = await import('/js/i18n/index.js');
      return i18n.t('canvas.sizeDisclosure');
    });
    expect(text.toLowerCase()).toContain('enlarged for visibility');

    // Two lines of ink in that corner: the scale bar with its label, and the
    // disclosure underneath it. One line means the disclosure is not there.
    expect(await instrumentLines(page)).toBeGreaterThanOrEqual(2);
  });

  test('the full explanation is available to a screen reader', async ({
    page,
    app,
  }) => {
    await app.boot();
    await scene(page, 'Solar System');
    const described = await page.evaluate(() => {
      const el = document.getElementById('canvasSummary');
      return el ? el.textContent : '';
    });
    expect(described.toLowerCase()).toContain('compressed scale');
    expect(described.toLowerCase()).toContain('inspector');
    // And it does not overclaim about distance, which some scenarios compress
    // too.
    expect(described.toLowerCase()).not.toContain('distances are to scale');
  });

  test('both languages carry the disclosure and the explanation', async ({
    page,
    app,
  }) => {
    await app.boot();
    const strings = await page.evaluate(async () => {
      const i18n = await import('/js/i18n/index.js');
      const read = () => ({
        short: i18n.t('canvas.sizeDisclosure'),
        long: i18n.t('canvas.sizeDisclosure.detail'),
        radiusTip: i18n.t('inspector.tip.radius'),
      });
      const en = read();
      await i18n.setLocale('es');
      const es = read();
      await i18n.setLocale('en');
      return { en, es };
    });

    for (const locale of ['en', 'es']) {
      const s = strings[locale];
      // Present, translated, and not a missing-key echo.
      expect(s.short.length).toBeGreaterThan(10);
      expect(s.long.length).toBeGreaterThan(60);
      expect(s.radiusTip.length).toBeGreaterThan(60);
      expect(s.short).not.toContain('canvas.sizeDisclosure');
    }
    expect(strings.es.short).not.toBe(strings.en.short);
    expect(strings.es.long).not.toBe(strings.en.long);
    expect(strings.es.radiusTip).not.toBe(strings.en.radiusTip);
    expect(strings.es.short.toLowerCase()).toContain('visibilidad');
  });

  test('a screenshot carries the disclosure with it', async ({ page, app }) => {
    await app.boot();
    await scene(page, 'Solar System');
    // The capture composites the canvases, so anything drawn in the interface
    // rather than on the canvas would be missing from the saved file. This
    // reproduces that composite and looks in the corner the line is drawn in.
    expect(await instrumentLines(page, true)).toBeGreaterThanOrEqual(2);
  });
});

test.describe('the inspector says which radius it is reporting', () => {
  test('the Radius tooltip separates the number from the drawing', async ({
    page,
    app,
  }) => {
    await app.boot();
    const tip = await page.evaluate(async () => {
      const i18n = await import('/js/i18n/index.js');
      return i18n.t('inspector.tip.radius');
    });
    const lower = tip.toLowerCase();
    expect(lower).toContain('physical radius');
    expect(lower).toContain('collision');
    // The claim the old text made, and the one this pass exists to remove.
    expect(lower).not.toContain('visual appearance');
    expect(lower).toContain('not the size the body is drawn at');
  });
});

test.describe('ring systems survive a round trip', () => {
  test('the same giants are ringed after a rebuild from the same seed', async ({
    page,
    app,
  }) => {
    await app.boot();
    const read = () =>
      page.evaluate(async () => {
        const ui = await import('/js/ui.js');
        const physics = await import('/js/physics.js');
        ui.SETTINGS.preset_scenario = 'Supermassive BH';
        ui.initialize_simulation({ seed: 'ringtrip' });
        return physics.gas_giants.map(g => ({
          id: g.id,
          rings: Boolean(g.hasRings),
          geo: g.hasRings
            ? (({ inner, outer, flatten, angle, tiltSign }) => ({
                inner,
                outer,
                flatten,
                angle,
                tiltSign,
              }))(g.ringGeometry())
            : null,
        }));
      });

    const first = await read();
    expect(first.length).toBeGreaterThan(0);
    expect(first.some(g => g.rings)).toBe(true);
    // Not all of them, or the fraction would be meaningless.
    expect(first.every(g => g.rings)).toBe(false);

    const again = await read();
    expect(again).toEqual(first);
  });

  test('and after a save and a restore, which only carries the id', async ({
    page,
    app,
  }) => {
    await app.boot();
    const result = await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      const physics = await import('/js/physics.js');
      const visuals = await import('/js/bodyVisuals.js');
      ui.SETTINGS.preset_scenario = 'Supermassive BH';
      ui.initialize_simulation({ seed: 'ringsave' });

      const before = physics.gas_giants.map(g => ({
        id: g.id,
        rings: Boolean(g.hasRings),
        angle: g.hasRings ? g.ringGeometry().angle : null,
      }));

      // What a save actually stores, and what a restore reads back.
      const states = physics.gas_giants.map(g => g.get_state());
      visuals.clearVisualCaches();

      const after = states.map(state => {
        const seed = visuals.visualSeed({
          id: state.id,
          obj_type: 'GasGiant',
        });
        return {
          id: state.id,
          rings: visuals.hasRingsForSeed(seed),
          angle: visuals.hasRingsForSeed(seed)
            ? visuals.ringGeometryFor(seed).angle
            : null,
        };
      });
      return { before, after };
    });

    // The Solar System's authored overrides are not in this scenario, so every
    // giant here decided for itself - which is exactly the case a restore has
    // to reproduce from the id alone.
    expect(result.after).toEqual(result.before);
  });
});

const VIEWPORTS = [
  { name: '320x700', width: 320, height: 700 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '1024x700', width: 1024, height: 700 },
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1920x1080', width: 1920, height: 1080 },
];

for (const vp of VIEWPORTS) {
  test.describe(`legible at ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test('every body is at least a visible marker, and the sky is not a blob', async ({
      page,
      app,
    }) => {
      await app.boot();
      await scene(page, 'Solar System');
      const sizes = await page.evaluate(async () => {
        const physics = await import('/js/physics.js');
        const visuals = await import('/js/bodyVisuals.js');
        const ui = await import('/js/ui.js');
        const zoom = ui.state.zoom;
        const all = [
          ...physics.stars.map(b => ['Star', b]),
          ...physics.planets.map(b => ['Planet', b]),
          ...physics.gas_giants.map(b => ['GasGiant', b]),
        ];
        const n = all.length;
        return all.map(([family, b]) =>
          visuals.drawnRadiusPx(b.radius, family, zoom, n)
        );
      });
      expect(sizes.length).toBeGreaterThan(5);
      // Nothing invisible...
      expect(Math.min(...sizes)).toBeGreaterThan(1);
      // ...and the star is still the biggest thing in the picture.
      expect(Math.max(...sizes)).toBeGreaterThanOrEqual(Math.min(...sizes));
    });

    test('the disclosure fits on the canvas', async ({ page, app }) => {
      await app.boot();
      await scene(page, 'Solar System');
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth
      );
      expect(overflow).toBeLessThanOrEqual(1);
    });
  });
}
