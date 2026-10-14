#!/usr/bin/env node
// =============================================================================
// Reference captures of the bodies, for a before-and-after on their drawing
// -----------------------------------------------------------------------------
// Development only.
//
//   node tools/body-shots.mjs --out shots/before
//   node tools/body-shots.mjs --out shots/after --only comet
//   node tools/body-shots.mjs --out shots/still --reduced-motion --tier low --deterministic
//   node tools/body-shots.mjs --out shots/other --deterministic --port 47961 --no-sky
//
// --no-sky hides the starfield canvas behind the simulation. Its repaint is
// timing dependent in a crowded scene at the full tier (two captures of one
// build differ by a few specks of sky) and none of the bodies is in it, so a
// comparison of drawers wants it out and a comparison of the sky wants the
// scenes where it is stable.
// --port lets two checkouts be captured at once (the default is 8127).
// Scenes marked `pinPulsars` hold each neutron star's pulse phase, which the
// drawing advances on every frame it paints. Scenes marked `synthetic` clear
// the world and place bodies by hand, which is how every spectral type,
// remnant, galaxy and particle gets drawn.
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
  { id: 'solar-system', scenario: 'solar-system', steps: 200, zoom: 1.1 },
  { id: 'earth-moon', scenario: 'earth-moon-system', steps: 200, zoom: 2.2 },
  { id: 'binary-bh', scenario: 'binary-bh', steps: 200, zoom: 1.5 },
  { id: 'gw150914', scenario: 'gw150914', steps: 120, zoom: 2.5 },
  { id: 'trappist1', scenario: 'trappist-1-system', steps: 200, zoom: 1.6 },
  {
    // Framed on the comet nearest the Sun. As the scenario builds them these
    // are all in the outer system, so this is the cold case on purpose: a
    // subdued nucleus, no coma, no tail. A comet seven astronomical units out
    // has none, and a picture that draws one anyway teaches the wrong thing.
    id: 'comet-cold',
    scenario: 'solar-system',
    steps: 400,
    zoom: 6,
    centerOn: 'comet',
  },
  {
    // And the warm case. The comet is moved in to just inside one astronomical
    // unit for the picture - this tool draws, it does not simulate anything
    // anyone measures - so the coma and the two tails have something to show.
    id: 'comet-active',
    scenario: 'solar-system',
    steps: 400,
    zoom: 6,
    centerOn: 'comet',
    cometAtAu: 0.8,
  },
  { id: 'star-cluster', scenario: 'star-cluster', steps: 150, zoom: 1.0 },
  // Stars, remnants, galaxies and particles (the drawers of js/bodyDrawSky.js).
  { id: 'binary-stars', scenario: 'binary-star-system', steps: 200, zoom: 2.0 },
  {
    id: 'stars-sun-close',
    scenario: 'solar-system',
    steps: 200,
    zoom: 14,
    centerOnName: 'Sun',
  },
  {
    id: 'pulsar',
    scenario: 'pulsar-system',
    steps: 150,
    zoom: 4,
    pinPulsars: true,
  },
  {
    id: 'compact-zoo',
    scenario: 'compact-object-zoo',
    steps: 150,
    zoom: 1.2,
    pinPulsars: true,
  },
  { id: 'wd-binary', scenario: 'white-dwarf-binary', steps: 150, zoom: 4 },
  {
    id: 'ns-collision',
    scenario: 'neutron-star-collision',
    steps: 150,
    zoom: 4,
    pinPulsars: true,
  },
  { id: 'spiral-galaxy', scenario: 'spiral-galaxy', steps: 100, zoom: 0.6 },
  { id: 'coma-cluster', scenario: 'coma-cluster', steps: 100, zoom: 0.2 },
  {
    id: 'tidal-disruption',
    scenario: 'tidal-disruption-event',
    steps: 150,
    zoom: 2.0,
  },
  { id: 'supermassive-bh', scenario: 'supermassive-bh', steps: 150, zoom: 1.0 },
  // By hand: a row of each kind, so the cases a scenario never reaches are drawn.
  {
    id: 'synthetic-stars',
    scenario: 'solar-system',
    steps: 0,
    zoom: 0.9,
    synthetic: 'stars',
  },
  {
    id: 'synthetic-stars-far',
    scenario: 'solar-system',
    steps: 0,
    zoom: 0.05,
    synthetic: 'stars',
  },
  {
    id: 'synthetic-remnants',
    scenario: 'solar-system',
    steps: 0,
    zoom: 4.5,
    synthetic: 'remnants',
    pinPulsars: true,
  },
  {
    id: 'synthetic-remnants-far',
    scenario: 'solar-system',
    steps: 0,
    zoom: 0.4,
    synthetic: 'remnants',
    pinPulsars: true,
  },
  {
    id: 'synthetic-galaxies',
    scenario: 'solar-system',
    steps: 0,
    zoom: 0.5,
    synthetic: 'galaxies',
  },
  {
    id: 'synthetic-particles',
    scenario: 'solar-system',
    steps: 0,
    zoom: 3,
    synthetic: 'particles',
  },
  // One rocky planet, large, so the shading and the limb are legible.
  {
    id: 'planet-closeup',
    scenario: 'solar-system',
    steps: 200,
    zoom: 26,
    centerOn: 'planet',
  },
  // And one gas giant, for the bands and the rings.
  {
    id: 'gasgiant-closeup',
    scenario: 'solar-system',
    steps: 200,
    zoom: 16,
    centerOn: 'gasgiant',
  },
  // Saturn, which is the ring system everyone already has a picture of, and
  // the one an authored scenario forces on. Framed close enough to see the
  // bands, the division and the disc passing in front of the far half.
  {
    id: 'saturn',
    scenario: 'solar-system',
    steps: 200,
    zoom: 20,
    centerOnName: 'Saturn',
  },
  // A transit scene: a hot Jupiter against its star, which is the case where
  // the difference between the drawn marker and the analytic radius ratio
  // matters most - the light curve's depth comes from the second and a reader
  // will try to read it off the first.
  {
    id: 'transit',
    scenario: 'transit-lab',
    steps: 120,
    zoom: 60,
  },
  // A generated system, for the ring fraction and the range of orientations.
  // Nothing here is authored, so every ring in it was decided by a body's own
  // seed - which is also what makes this picture reproducible.
  {
    id: 'generated-giants',
    // Supermassive BH rather than a busy exoplanet catalog: a crowded field
    // deliberately drops to the simplified treatment, which is correct and is
    // the wrong picture for judging the detailed one.
    scenario: 'supermassive-bh',
    steps: 150,
    zoom: 22,
    centerOnRinged: true,
  },
];

async function main() {
  const args = process.argv.slice(2);
  const oi = args.indexOf('--out');
  const outDir = resolve(ROOT, oi >= 0 ? args[oi + 1] : 'shots');
  const only = args.includes('--only')
    ? args[args.indexOf('--only') + 1]
    : null;
  const deterministic = args.includes('--deterministic');
  const port = args.includes('--port')
    ? Number(args[args.indexOf('--port') + 1])
    : PORT;
  const tier = args.includes('--tier')
    ? args[args.indexOf('--tier') + 1]
    : 'full';

  await mkdir(outDir, { recursive: true });
  const server = await serveStatic({ root: ROOT, port });
  const browser = await chromium.launch({
    args: [
      '--use-gl=angle',
      '--use-angle=default',
      '--enable-gpu-rasterization',
    ],
  });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
    reducedMotion: args.includes('--reduced-motion')
      ? 'reduce'
      : 'no-preference',
  });
  page.on('pageerror', e => console.warn(`  ! ${e.message}`));

  await page.goto(`http://localhost:${port}/`, { waitUntil: 'load' });
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
  if (args.includes('--no-sky')) {
    await page.addStyleTag({
      content: '#starfieldCanvas { visibility: hidden !important; }',
    });
  }

  const manifest = [];
  // The first scene drawn after a page loads is caught still settling (the
  // render tier and the first frames), and came out two ways between runs of
  // one build. Drawn once and not kept, it is the same every time after.
  const WARM_UP = { ...SCENES[0], id: 'warm-up', warmUp: true };
  for (const scene of [WARM_UP, ...SCENES]) {
    if (only && scene.id !== only && !scene.warmUp) continue;

    const info = await page.evaluate(
      async ({ scene, seed, tier, deterministic }) => {
        const ui = await import('/js/ui.js');
        const physics = await import('/js/physics.js');
        const quality = await import('/js/quality.js');

        // --deterministic: some scenes draw on Math.random while they are built
        // or stepped (the star cluster's field, a disk's spiral factor), and
        // the live loop may step the world once between the build and the
        // pause, so two captures of one build differ by whole fields of stars.
        // Replacing Math.random with a fixed stream and pausing first makes a
        // capture a function of the code alone, which is what a comparison
        // between two builds needs.
        if (deterministic) {
          let a = 0x9e3779b9;
          Math.random = () => {
            a = (a + 0x6d2b79f5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
          };
          ui.state.paused = true;
          // The render loop scales trail length by how long its last frames
          // took (SETTINGS.adaptive_detail), so a crowded scene at the full
          // tier was drawn with different trails on every run, and was taken
          // to be chaotic. Off, and at full detail, it is a function of the
          // code. It is set again after the build because a scenario's own
          // settings are stamped over it.
          ui.SETTINGS.adaptive_detail = false;
          physics.setDetailScale(1);
        }
        ui.SETTINGS.preset_scenario = scene.scenario;
        ui.initialize_simulation({ seed });
        ui.SETTINGS.quality_tier = tier;
        quality.setTier(tier);
        if (deterministic) {
          ui.SETTINGS.adaptive_detail = false;
          physics.setDetailScale(1);
        }
        ui.state.paused = true;

        // A fixed number of fixed steps. Not a wall-clock run: how far the
        // world gets in a second is a property of the machine.
        for (let i = 0; i < scene.steps; i++) physics.updatePhysics(0.01);

        // By-hand bodies, placed after the steps and drawn without any being
        // taken. Every number is written down here and every random field a
        // constructor draws is overwritten, so the picture is a function of
        // the drawing code alone.
        if (scene.synthetic) {
          for (const list of [
            physics.bh_list,
            physics.planets,
            physics.stars,
            physics.gas_giants,
            physics.asteroids,
            physics.comets,
            physics.debris,
            physics.particles,
            physics.neutron_stars,
            physics.white_dwarfs,
            physics.galaxies,
            physics.accretion_disk_particles,
          ]) {
            list.length = 0;
          }
          const at = (i, n, gap) => ({ x: (i - (n - 1) / 2) * gap, y: 0 });
          const still = { x: 0, y: 0 };
          if (scene.synthetic === 'stars') {
            // O to M by temperature and mass, then the cases the drawing
            // branches on: an authored color, an anonymous star, the Sun's
            // name label, an investigation's stageRadius override.
            const spec = [
              [35000, 20],
              [15000, 5],
              [9000, 2.2],
              [6800, 1.4],
              [5800, 1.0],
              [4400, 0.7],
              [3200, 0.2],
              [5800, 1.0, { baseColor: '#ff8844' }],
              [5800, 1.0, { anonymous: true }],
              [5800, 1.0, { isSolarSystemSun: true, name: 'Sol' }],
              [5800, 1.0, { stageRadius: 25 }],
            ];
            spec.forEach(([teff, m, extra], i) => {
              const star = new physics.StarObject(
                at(i, spec.length, 70),
                still,
                m
              );
              star.temperature = teff;
              Object.assign(star, extra);
              physics.stars.push(star);
            });
          } else if (scene.synthetic === 'remnants') {
            const ns = [true, false, true];
            ns.forEach((pulsar, i) => {
              const b = new physics.NeutronStar(
                { x: -40 + i * 20, y: 12 },
                still,
                1.4 + i * 0.3,
                pulsar
              );
              b.magnetic_field_strength = 0.3 + i * 0.4;
              b.pulsar_period = 0.4 + i * 0.5;
              physics.neutron_stars.push(b);
            });
            [4000, 8000, 12000, 18000].forEach((temperature, i) => {
              const w = new physics.WhiteDwarf(
                { x: 20 + i * 20, y: 12 },
                still,
                0.6 + i * 0.15
              );
              w.temperature = temperature;
              physics.white_dwarfs.push(w);
            });
            const lone = new physics.NeutronStar(
              { x: 0, y: -14 },
              still,
              1.6,
              true
            );
            lone.pulsar_period = 1.3;
            physics.neutron_stars.push(lone);
          } else if (scene.synthetic === 'galaxies') {
            for (let i = 0; i < 8; i++) {
              const g = new physics.Galaxy(
                { x: (i % 4) * 420 - 630, y: i < 4 ? 180 : -180 },
                still,
                1e5,
                i % 2 === 0 ? 'spiral' : 'elliptical'
              );
              physics.galaxies.push(g);
            }
          } else if (scene.synthetic === 'particles') {
            const hole = new physics.BlackHole({ x: 0, y: 0 }, still, 5);
            physics.bh_list.push(hole);
            [0.05, 0.3, 0.8].forEach((heating, i) => {
              const p = new physics.AccretionDiskParticle(
                { x: 30 + i * 12, y: 20 - i * 15 },
                { x: 0, y: -30 },
                hole
              );
              p.heating_intensity = heating;
              p.radius = 3;
              physics.accretion_disk_particles.push(p);
            });
            for (let i = 0; i < 12; i++) {
              const p = new physics.Particle(
                { x: -80 + i * 14, y: -40 },
                still,
                1.0,
                9,
                2,
                `rgb(${255 - i * 10}, ${120 + i * 8}, ${60 + i * 12})`
              );
              p.age = (i / 12) * 0.9;
              if (i % 3 === 0) {
                p.kilonova_glow = true;
                p.glow_intensity = 0.6 + (i % 2) * 0.4;
              }
              physics.particles.push(p);
            }
          }
        }

        // Hold every neutron star's pulse phase. The drawing advances it on
        // each frame it paints, so after a few frames of unknown count the
        // beams point wherever the page's frame timing left them.
        if (scene.pinPulsars) {
          physics.neutron_stars.forEach((b, i) => {
            const phase = 0.7 + i * 0.9;
            Object.defineProperty(b, 'pulsar_phase', {
              get: () => phase,
              set: () => {},
              configurable: true,
            });
          });
        }

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

        let center = { x: 0, y: 0 };
        if (scene.centerOn === 'comet') {
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
          if (best) center = { x: best.pos.x, y: best.pos.y };
        } else if (scene.centerOn === 'planet') {
          const p = physics.planets.find(b => b.alive) || physics.planets[0];
          if (p) center = { x: p.pos.x, y: p.pos.y };
        } else if (scene.centerOn === 'gasgiant') {
          const g =
            physics.gas_giants.find(b => b.alive) || physics.gas_giants[0];
          if (g) center = { x: g.pos.x, y: g.pos.y };
        } else if (scene.centerOnRinged) {
          const ringed = physics.gas_giants.find(g => g.hasRings);
          if (ringed) center = { x: ringed.pos.x, y: ringed.pos.y };
        } else if (scene.centerOnName) {
          const named = [
            ...physics.gas_giants,
            ...physics.planets,
            ...physics.stars,
          ].find(b => b.name === scene.centerOnName);
          if (named) center = { x: named.pos.x, y: named.pos.y };
        }

        ui.state.zoom = scene.zoom;
        ui.state.pan = { x: -center.x * scene.zoom, y: center.y * scene.zoom };

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
            neutronStars: physics.neutron_stars.length,
            whiteDwarfs: physics.white_dwarfs.length,
            galaxies: physics.galaxies.length,
            particles: physics.particles.length,
            diskParticles: physics.accretion_disk_particles.length,
          },
          center,
        };
      },
      { scene, seed: SEED, tier, deterministic }
    );

    // The world that was actually built, before anything is written. A capture
    // of the wrong scene is worse than no capture: it is evidence for a
    // comparison that was never made.
    if (Math.abs(info.zoom - scene.zoom) > 1e-6) {
      throw new Error(
        `${scene.id}: captured at zoom ${info.zoom}, asked for ${scene.zoom}`
      );
    }

    if (scene.warmUp) continue;

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
