#!/usr/bin/env node
// =============================================================================
// Reference captures of the bodies, for a before-and-after on their drawing
// -----------------------------------------------------------------------------
// Development only.
//
//   node tools/body-shots.mjs --out shots/before
//   node tools/body-shots.mjs --out shots/after --only comet
//
// A visual change needs a picture on each side of it, and a picture is only
// evidence if the two were taken of the same thing. Everything that could
// differ between two runs is pinned here: the seed, the camera, the number of
// integration steps and the size of each one. In particular the world is
// advanced by calling updatePhysics with a fixed dt rather than by letting it
// run for a wall-clock second, because how far a second gets you depends on
// the machine - see the note on frame-rate-dependent stepping in the manual.
//
// The scenes are the seven the brief names: a familiar system, a two-body one,
// a black-hole pair, an inspiral, a real exoplanet system, something with
// comets in it, and a crowded field. Each is also framed on the body family it
// exists to show, because a comet six hundred units from the camera is a pixel
// whatever is drawn.
// =============================================================================

import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveStatic } from './static-server.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8127;
const SEED = 'body-shots';

/**
 * The scenes.
 *
 * `frame` runs in the page after the world is built and says where to point the
 * camera. Returning null keeps the scenario's own framing.
 */
const SCENES = [
  { id: 'solar-system', scenario: 'Solar System', steps: 200, zoom: 1.1 },
  { id: 'earth-moon', scenario: 'Earth-Moon System', steps: 200, zoom: 2.2 },
  { id: 'binary-bh', scenario: 'Binary BH', steps: 200, zoom: 1.5 },
  { id: 'gw150914', scenario: 'GW150914', steps: 120, zoom: 2.5 },
  { id: 'trappist1', scenario: 'TRAPPIST-1 System', steps: 200, zoom: 1.6 },
  {
    // Framed on the comet nearest the Sun. As the scenario builds them these
    // are all in the outer system, so this is the cold case on purpose: a
    // subdued nucleus, no coma, no tail. A comet seven astronomical units out
    // has none, and a picture that draws one anyway teaches the wrong thing.
    id: 'comet-cold',
    scenario: 'Solar System',
    steps: 400,
    zoom: 6,
    centreOn: 'comet',
  },
  {
    // And the warm case. The comet is moved in to just inside one astronomical
    // unit for the picture - this tool draws, it does not simulate anything
    // anyone measures - so the coma and the two tails have something to show.
    id: 'comet-active',
    scenario: 'Solar System',
    steps: 400,
    zoom: 6,
    centreOn: 'comet',
    cometAtAu: 0.8,
  },
  { id: 'star-cluster', scenario: 'Star Cluster', steps: 150, zoom: 1.0 },
  // One rocky planet, large, so the shading and the limb are legible.
  {
    id: 'planet-closeup',
    scenario: 'Solar System',
    steps: 200,
    zoom: 26,
    centreOn: 'planet',
  },
  // And one gas giant, for the bands and the rings.
  {
    id: 'gasgiant-closeup',
    scenario: 'Solar System',
    steps: 200,
    zoom: 16,
    centreOn: 'gasgiant',
  },
  // Saturn, which is the ring system everyone already has a picture of, and
  // the one an authored scenario forces on. Framed close enough to see the
  // bands, the division and the disc passing in front of the far half.
  {
    id: 'saturn',
    scenario: 'Solar System',
    steps: 200,
    zoom: 20,
    centreOnName: 'Saturn',
  },
  // A transit scene: a hot Jupiter against its star, which is the case where
  // the difference between the drawn marker and the analytic radius ratio
  // matters most - the light curve's depth comes from the second and a reader
  // will try to read it off the first.
  {
    id: 'transit',
    scenario: 'Transit Lab',
    steps: 120,
    zoom: 60,
  },
  // A generated system, for the ring fraction and the range of orientations.
  // Nothing here is authored, so every ring in it was decided by a body's own
  // seed - which is also what makes this picture reproducible.
  {
    id: 'generated-giants',
    // Supermassive BH rather than a busy exoplanet catalogue: a crowded field
    // deliberately drops to the simplified treatment, which is correct and is
    // the wrong picture for judging the detailed one.
    scenario: 'Supermassive BH',
    steps: 150,
    zoom: 22,
    centreOnRinged: true,
  },
];

async function main() {
  const args = process.argv.slice(2);
  const oi = args.indexOf('--out');
  const outDir = resolve(ROOT, oi >= 0 ? args[oi + 1] : 'shots');
  const only = args.includes('--only')
    ? args[args.indexOf('--only') + 1]
    : null;
  const tier = args.includes('--tier')
    ? args[args.indexOf('--tier') + 1]
    : 'full';

  await mkdir(outDir, { recursive: true });
  const server = await serveStatic({ root: ROOT, port: PORT });
  const browser = await chromium.launch({
    args: [
      '--use-gl=angle',
      '--use-angle=default',
      '--enable-gpu-rasterization',
    ],
  });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
  });
  page.on('pageerror', e => console.warn(`  ! ${e.message}`));

  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
  await page.evaluate(() => {
    try {
      localStorage.setItem('gravitas_welcome_seen_v1', '1');
    } catch {
      /* not required */
    }
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.splashScreenEnded === true, {
    timeout: 20000,
  });
  // The chrome fades in on a transition after the splash, and the starfield is
  // painted on a later frame than the first. Capturing immediately gives a
  // half-faded page, which is a difference between two runs that has nothing
  // to do with the drawing being compared.
  await page.waitForTimeout(1500);

  const manifest = [];
  for (const scene of SCENES) {
    if (only && scene.id !== only) continue;

    const info = await page.evaluate(
      async ({ scene, seed, tier }) => {
        const ui = await import('/js/ui.js');
        const physics = await import('/js/physics.js');
        const quality = await import('/js/quality.js');

        ui.SETTINGS.preset_scenario = scene.scenario;
        ui.initialize_simulation({ seed });
        ui.SETTINGS.quality_tier = tier;
        quality.setTier(tier);
        ui.state.paused = true;

        // A fixed number of fixed steps. Not a wall-clock run: how far the
        // world gets in a second is a property of the machine.
        for (let i = 0; i < scene.steps; i++) physics.updatePhysics(0.01);

        // For the warm-comet picture only: put one comet where a comet with a
        // tail would be. Nothing here is measured, and the scene is rebuilt
        // from the seed for every capture, so this cannot leak anywhere.
        if (scene.cometAtAu && physics.comets.length && physics.stars.length) {
          const units = await import('/js/units.js');
          const sun = physics.stars[0];
          const c = physics.comets[0];
          const r = units.auToSim(scene.cometAtAu);
          c.pos = { x: sun.pos.x + r * 0.8, y: sun.pos.y + r * 0.6 };
          // A plausible orbital velocity, so the dust tail has an orbital
          // trail to lag toward rather than lying on top of the ion tail.
          const v = Math.sqrt(
            (ui.SETTINGS.gravitational_constant * sun.mass) / r
          );
          c.vel = { x: -v * 0.6, y: v * 0.8 };
        }

        let centre = { x: 0, y: 0 };
        if (scene.centreOn === 'comet') {
          const sun = physics.stars[0];
          let best = null;
          let bestD = Infinity;
          for (const c of physics.comets) {
            const d = sun
              ? Math.hypot(c.pos.x - sun.pos.x, c.pos.y - sun.pos.y)
              : Math.hypot(c.pos.x, c.pos.y);
            if (d < bestD) {
              bestD = d;
              best = c;
            }
          }
          if (best) centre = { x: best.pos.x, y: best.pos.y };
        } else if (scene.centreOn === 'planet') {
          const p = physics.planets.find(b => b.alive) || physics.planets[0];
          if (p) centre = { x: p.pos.x, y: p.pos.y };
        } else if (scene.centreOn === 'gasgiant') {
          const g =
            physics.gas_giants.find(b => b.alive) || physics.gas_giants[0];
          if (g) centre = { x: g.pos.x, y: g.pos.y };
        } else if (scene.centreOnRinged) {
          const ringed = physics.gas_giants.find(g => g.hasRings);
          if (ringed) centre = { x: ringed.pos.x, y: ringed.pos.y };
        } else if (scene.centreOnName) {
          const named = [
            ...physics.gas_giants,
            ...physics.planets,
            ...physics.stars,
          ].find(b => b.name === scene.centreOnName);
          if (named) centre = { x: named.pos.x, y: named.pos.y };
        }

        ui.state.zoom = scene.zoom;
        ui.state.pan = { x: -centre.x * scene.zoom, y: centre.y * scene.zoom };

        // Several frames, not two.
        //
        // Two was not enough, and the way it failed is the way a capture tool
        // fails worst: silently, and with a plausible picture. The first run of
        // this tool wrote a file called trappist1.png containing the previous
        // scene's black holes at the previous scene's zoom. Nothing errored -
        // the screenshot was taken before the new world had been laid out and
        // painted, so it caught the old one. The returned `scenario` below is
        // what makes that detectable rather than something to notice by eye
        // three scenes later.
        for (let i = 0; i < 8; i++) {
          await new Promise(r => requestAnimationFrame(() => r()));
        }

        return {
          bodies: physics.allBodies ? physics.allBodies().length : null,
          comets: physics.comets.length,
          zoom: ui.state.zoom,
          scenario: ui.SETTINGS.preset_scenario,
          drawn: {
            stars: physics.stars.length,
            planets: physics.planets.length,
            gasGiants: physics.gas_giants.length,
            blackHoles: physics.bh_list.length,
          },
          centre,
        };
      },
      { scene, seed: SEED, tier }
    );

    // The world that was actually built, before anything is written. A capture
    // of the wrong scene is worse than no capture: it is evidence for a
    // comparison that was never made.
    if (Math.abs(info.zoom - scene.zoom) > 1e-6) {
      throw new Error(
        `${scene.id}: captured at zoom ${info.zoom}, asked for ${scene.zoom}`
      );
    }

    const file = join(outDir, `${scene.id}.png`);
    await page.locator('#simulationCanvas').screenshot({ path: file });
    manifest.push({ ...scene, ...info, file });
    console.log(
      `${scene.id.padEnd(18)} ${scene.scenario.padEnd(20)} zoom ${String(info.zoom).padEnd(5)} ${info.comets} comet(s)`
    );
  }

  await writeFile(
    join(outDir, 'manifest.json'),
    `${JSON.stringify({ seed: SEED, tier, scenes: manifest }, null, 2)}\n`
  );
  console.log(`\nWrote ${manifest.length} captures to ${outDir}`);

  await browser.close();
  server.close();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
