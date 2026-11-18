// =============================================================================
// A crowded scene: labels, trails, tiers
// -----------------------------------------------------------------------------
// The star cluster (255 bodies) and the Kuiper belt (309), at the states of
// tests/fixtures/scene-records, at both window sizes and both pixel ratios:
//
//   - no two body labels overlap, none is under 11 CSS px, and no more are
//     drawn than the cap (js/bodyLabels.js), at the record's zoom and closer in;
//   - a crowd draws trails for the selected body and the heaviest only, and the
//     readout and the canvas say so;
//   - at the low tier a scene that builds fewer bodies says "n of N", and the
//     full tier says nothing;
//   - within one built world, 60 frames drawn at the low, full and ultra tiers
//     leave the same bodies in the same places: the tier changes the picture
//     and the build, never the integration.
// The tier's build counts, for every scenario, are tests/crowdedScenes.test.js.
// =============================================================================

/* global requestAnimationFrame */
import { test, expect } from './fixtures.js';
import { loadRecord } from '../tools/scene-record.mjs';
import { applyScene } from '../tools/scene-capture.mjs';
import {
  DEVICE_PIXEL_RATIOS,
  installCanvasTextRecorder,
  judgeLabels,
  readMainCanvasLabels,
} from '../tools/visual-criteria.mjs';
import { LABEL_CAP } from '../js/bodyLabels.js';

const SCENES = ['star-cluster', 'kuiper-belt'];
const WIDTHS = [1366, 375];
const record = (scene, width) =>
  loadRecord(`tests/fixtures/scene-records/${scene}-midnight-${width}.json`);

/** Let the canvas draw a few whole frames. */
const frames = (page, n = 4) =>
  page.evaluate(
    n =>
      new Promise(done => {
        const tick = left =>
          left ? requestAnimationFrame(() => tick(left - 1)) : done();
        tick(n);
      }),
    n
  );

/** The record's scene in the booted page, its card closed, at this zoom. */
async function open(page, app, scene, width, { zoom, tier = 'full' } = {}) {
  await page.addInitScript(installCanvasTextRecorder);
  await app.boot({ qualityTier: tier });
  const rec = { ...record(scene, width), cardOpen: false, qualityTier: tier };
  await page.setViewportSize(rec.viewport);
  await applyScene(page, rec);
  if (zoom)
    await page.evaluate(async z => {
      (await import('/js/ui.js')).state.zoom = z;
    }, zoom);
  await frames(page);
}

for (const dpr of DEVICE_PIXEL_RATIOS) {
  test.describe(`crowded scene labels at device pixel ratio ${dpr}`, () => {
    test.use({ deviceScaleFactor: dpr });
    for (const scene of SCENES)
      for (const width of WIDTHS)
        for (const zoom of [undefined, 6]) {
          test(`${scene} at ${width} wide, zoom ${zoom ?? 'as recorded'}: no overlap, none small, within the cap`, async ({
            page,
            app,
          }) => {
            await open(page, app, scene, width, { zoom });
            const r = await page.evaluate(readMainCanvasLabels);
            const v = judgeLabels(r.bodyLabels);
            expect(
              { small: v.small, overlaps: v.overlaps },
              `canvas scale ${r.canvasScale.toFixed(2)}`
            ).toEqual({ small: [], overlaps: [] });
            // A label is up to three drawn pieces (number, unit, suffix).
            expect(v.count).toBeLessThanOrEqual(LABEL_CAP * 3);
          });
        }
  });
}

test.describe('trails and notes in a crowd', () => {
  test('the cluster draws the heaviest trails only and says so, in the readout and on the canvas', async ({
    page,
    app,
  }) => {
    await open(page, app, 'star-cluster', 1366);
    const note = /Trails: the selected body and the 12 heaviest of \d+ bodies/;
    await expect(page.locator('#overlayStats')).toContainText(note);
    const r = await page.evaluate(readMainCanvasLabels);
    expect(
      [...r.bodyLabels, ...r.otherText].some(b => note.test(b.text)),
      'the canvas states it too'
    ).toBe(true);
    // The summary a screen reader gets carries the same sentence.
    await expect(page.locator('#canvasSummary')).toContainText(
      /Trails: the selected body and the 12 heaviest/
    );
  });

  test('a scene below the crowd says nothing about trails', async ({
    page,
    app,
  }) => {
    await page.addInitScript(installCanvasTextRecorder);
    await app.boot();
    await app.loadScenario('binary-pair', 'e2e', { run: false });
    await frames(page);
    await expect(page.locator('#overlayStats')).not.toContainText(
      /Trails: the selected body/
    );
  });
});

test.describe('the tiers', () => {
  test('the low tier says "n of N", the full tier does not', async ({
    page,
    app,
  }) => {
    await open(page, app, 'star-cluster', 1366, { tier: 'low' });
    await expect(page.locator('#overlayStats')).toContainText(
      /Reduced population on this device: \d+ of 255 bodies/
    );
    const r = await page.evaluate(readMainCanvasLabels);
    expect(
      [...r.bodyLabels, ...r.otherText].some(b =>
        /Reduced population on this device/.test(b.text)
      ),
      'the canvas states it too'
    ).toBe(true);
  });

  test('the full tier builds the whole cluster and says nothing of it', async ({
    page,
    app,
  }) => {
    await open(page, app, 'star-cluster', 1366);
    await expect(page.locator('#overlayStats')).not.toContainText(
      /Reduced population/
    );
  });

  for (const scene of SCENES)
    test(`${scene}: 60 frames drawn at the low, full and ultra tiers leave the same bodies in the same places`, async ({
      page,
      app,
    }) => {
      test.setTimeout(240000);
      await app.boot();
      const runs = await page.evaluate(async scene => {
        const ui = await import('/js/ui.js');
        const physics = await import('/js/physics.js');
        const render = await import('/js/render.js');
        const quality = await import('/js/quality.js');
        const { mulberry32 } = await import('/js/rng.js');
        const lists = [
          'bh_list',
          'stars',
          'planets',
          'gas_giants',
          'asteroids',
          'comets',
          'neutron_stars',
          'white_dwarfs',
          'galaxies',
        ];
        const out = {};
        for (const tier of ['low', 'full', 'ultra']) {
          // One world, built at the full tier; only the drawing differs.
          quality.setTier('full');
          ui.SETTINGS.quality_tier = 'full';
          ui.SETTINGS.preset_scenario = scene;
          ui.initialize_simulation({ seed: 'tier-run' });
          quality.setTier(tier);
          ui.SETTINGS.quality_tier = tier;
          Math.random = mulberry32(1234);
          render.setFixedStep(1 / 60);
          ui.state.paused = false;
          ui.SETTINGS.paused = false;
          await new Promise(done => {
            let n = 60;
            const tick = () => (n-- > 0 ? requestAnimationFrame(tick) : done());
            requestAnimationFrame(tick);
          });
          ui.state.paused = true;
          ui.SETTINGS.paused = true;
          render.setFixedStep(0);
          out[tier] = {
            time: physics.getSimulationTime(),
            bodies: lists
              .flatMap(l => physics[l])
              .filter(b => b.alive !== false)
              .map(b => [b.id, b.pos.x, b.pos.y]),
          };
        }
        return out;
      }, scene);
      expect(runs.low.bodies.length).toBeGreaterThan(100);
      expect(runs.full.bodies).toEqual(runs.low.bodies);
      expect(runs.ultra.bodies).toEqual(runs.low.bodies);
      expect(runs.full.time).toBe(runs.low.time);
      expect(runs.ultra.time).toBe(runs.low.time);
    });
});
