#!/usr/bin/env node
// =============================================================================
// Scenario thumbnail generator
// -----------------------------------------------------------------------------
// Captures one 16:9 image per built-in scenario, from the scenario actually
// running, and writes them to images/scenarios/.
//
// Development-only. Playwright is a devDependency and nothing in this file is
// bundled or shipped; the gallery just reads the committed .webp files.
//
//   npm run thumbnails                  every scenario
//   npm run thumbnails -- "Solar System" "GW150914"   just these
//   npm run thumbnails -- --check       verify the committed set, capture nothing
//
// How it captures
// ---------------
// It drives the real app rather than reimplementing the renderer, so a thumbnail
// is by construction a picture of what the user is about to load. For each
// scenario it: rebuilds the world under a fixed seed, applies any capture
// override from tools/thumbnail-config.mjs, hides every piece of chrome, lets
// the simulation run to the configured moment, then composites the starfield and
// simulation canvases into one 16:9 canvas and reads it back as WebP.
//
// Compositing in the page rather than screenshotting the viewport is what keeps
// the output free of UI: there is no chrome in those two canvases to begin with.
// =============================================================================

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, stat, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'images', 'scenarios');
const PORT = 8123;

const WIDTH = 640;
const HEIGHT = 360;
// The page is driven at 2x the output so the downscale hides canvas aliasing.
const VIEW_W = 1280;
const VIEW_H = 720;
const QUALITY = 0.82;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
};

/** A static server over the repository root, so the app loads as it does live. */
function serve() {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://localhost:${PORT}`);
      let path = decodeURIComponent(url.pathname);
      if (path.endsWith('/')) path += 'index.html';
      const file = join(ROOT, path);
      if (!file.startsWith(ROOT)) {
        res.writeHead(403).end();
        return;
      }
      const body = await readFile(file);
      res.writeHead(200, {
        'Content-Type': MIME[extname(file)] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      res.end(body);
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  return new Promise(resolve => server.listen(PORT, () => resolve(server)));
}

// --- Reporting ---------------------------------------------------------------

const kb = n => `${(n / 1024).toFixed(0)} KB`;
const pad = (s, n) => String(s).padEnd(n);

/**
 * Check the committed set without launching a browser.
 * @param {Array<string>} keys - Scenario keys
 * @param {Object} info - SCENARIO_INFO
 * @returns {Promise<number>} Exit code
 */
async function check(keys, info) {
  const problems = [];
  let total = 0;
  for (const key of keys) {
    const rel = info[key].thumbnail;
    if (!rel) {
      problems.push(`${key}: no thumbnail path in the catalog`);
      continue;
    }
    const file = join(ROOT, rel);
    if (!existsSync(file)) {
      problems.push(`${key}: ${rel} is not committed`);
      continue;
    }
    const { size } = await stat(file);
    total += size;
    if (size < 2048) problems.push(`${key}: ${rel} is only ${size} bytes`);
    if (size > 200 * 1024)
      problems.push(`${key}: ${rel} is ${kb(size)}, too heavy`);
  }

  // Files with no scenario left pointing at them, after a rename.
  const referenced = new Set(
    keys.map(k => info[k].thumbnail?.split('/').pop())
  );
  const onDisk = existsSync(OUT_DIR) ? await readdir(OUT_DIR) : [];
  for (const f of onDisk) {
    if (f.endsWith('.webp') && !referenced.has(f)) {
      problems.push(
        `orphan: images/scenarios/${f} is referenced by no scenario`
      );
    }
  }

  const ok = keys.length - problems.length;
  console.log(
    `\n${ok}/${keys.length} scenario thumbnails present, ${kb(total)} total.`
  );
  if (problems.length) {
    console.log('\nProblems:');
    for (const p of problems) console.log(`  ✗ ${p}`);
    return 1;
  }
  return 0;
}

// --- Capture -----------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes('--check');
  const wanted = args.filter(a => !a.startsWith('--'));

  const { SCENARIO_INFO } = await import(
    `file://${join(ROOT, 'js/data/scenarioInfo.js')}`
  );
  const { captureFor, THUMBNAIL_SEED } = await import(
    `file://${join(ROOT, 'tools/thumbnail-config.mjs')}`
  );

  const all = Object.keys(SCENARIO_INFO);
  const keys = wanted.length ? wanted : all;
  const unknown = keys.filter(k => !SCENARIO_INFO[k]);
  if (unknown.length) {
    console.error(`Unknown scenario(s): ${unknown.join(', ')}`);
    process.exit(2);
  }

  if (checkOnly) process.exit(await check(all, SCENARIO_INFO));

  await mkdir(OUT_DIR, { recursive: true });
  const server = await serve();
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: VIEW_W, height: VIEW_H },
    deviceScaleFactor: 1,
  });
  page.on('pageerror', e => console.warn(`  ! page error: ${e.message}`));

  console.log(
    `Capturing ${keys.length} scenario thumbnails at ${WIDTH}x${HEIGHT}\n`
  );

  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });

  // Get past the splash and the first-visit front door: both cover the canvas,
  // and neither belongs in a thumbnail.
  await page.evaluate(() => {
    try {
      localStorage.setItem('gravitas_welcome_seen_v1', '1');
    } catch {
      /* storage is not required */
    }
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.splashScreenEnded === true, {
    timeout: 20000,
  });

  // Hide every piece of chrome for the whole run. The composite below reads the
  // canvases directly, so this is belt and braces, but it also keeps the live
  // page legible if anyone watches with --headed.
  await page.addStyleTag({
    content: `#mainControls, #overlay, #scenarioInfoBox, #scenarioInfoDisplay,
              #timelineBar, #tutorialBtn, #attribution, #objectInspector,
              #mobileMenuToggle, #welcomeScreen, #scenarioListModal,
              #investigationBrowser, #investigationPanel, .mobile-menu-toggle,
              #sonificationControl, #mobileInstructions { display: none !important; }`,
  });

  const results = [];
  for (const [i, key] of keys.entries()) {
    const cfg = captureFor(key);
    const label = `[${String(i + 1).padStart(2)}/${keys.length}] ${pad(key, 28)}`;
    try {
      // Build the world. One fixed seed for the whole set, so a regeneration
      // frames the random scenarios the same way it did last time.
      await page.evaluate(
        async ({ key, cfg, seed }) => {
          const ui = await import('/js/ui.js');
          const physics = await import('/js/physics.js');
          ui.SETTINGS.preset_scenario = key;
          ui.initialize_simulation({ seed });

          // Overrides land after the build, because apply_preset resets
          // settings to the scenario's own on the way through.
          if (cfg.speed !== null) ui.SETTINGS.sim_speed = cfg.speed;
          if (cfg.trail !== null) {
            // A longer tail than the scenario runs with. The scenario's own
            // length is tuned for watching it live, where the trail is a hint
            // of recent motion; a still frame has only the trail to say that
            // anything is moving at all, so an orbit needs most of an arc.
            ui.SETTINGS.show_trails = true;
            ui.SETTINGS.trail_length = cfg.trail;
          }
          // The trail budget is read from the physics module's own copy of the
          // settings, so an assignment to SETTINGS alone does nothing.
          physics.updatePhysicsSettings(ui.SETTINGS);

          // Framing. A scenario's preset_zoom is chosen for a full browser
          // window, where fine structure is legible; the same framing in a
          // 640x360 card leaves the subject a speck in an empty starfield.
          //
          // Three ways to frame, in order of preference: `zoom` replaces the
          // scenario's own value outright, `boost` scales it, and `autoframe`
          // measures where the bodies are and fits them.
          //
          // The default is none of them, because most of the catalog's own
          // preset_zoom values are well chosen and second-guessing them made
          // good thumbnails worse. Only the scenarios that captured badly carry
          // an override, and each says why.
          if (cfg.zoom !== null) {
            ui.state.zoom = cfg.zoom;
          } else if (cfg.boost !== 1) {
            ui.state.zoom *= cfg.boost;
          } else if (cfg.autoframe) {
            const bodies = [
              ...physics.stars,
              ...physics.planets,
              ...physics.gas_giants,
              ...physics.bh_list,
              ...physics.neutron_stars,
              ...physics.white_dwarfs,
              ...physics.asteroids,
            ].filter(b => b.alive && Number.isFinite(b.pos?.x));
            if (bodies.length) {
              // A percentile, not the maximum: one ejected body or a comet at
              // aphelion would otherwise pull the frame out until the system
              // itself vanished. This keeps the bulk of the system in shot and
              // lets the stragglers fall off the edge, which is what a
              // photographer would do.
              const radii = bodies
                .map(b => Math.hypot(b.pos.x, b.pos.y))
                .sort((a, b) => a - b);
              const r = radii[Math.floor(radii.length * 0.82)] || radii.at(-1);
              // 16:9 is height-limited, and 0.4 of the height leaves the
              // subject filling about four fifths of the frame.
              //
              // Clamped, because a scenario whose bodies all sit at the origin
              // gives r -> 0 and a zoom of infinity, which renders as a blank
              // frame. Outside a sane range the scenario's own framing is a
              // better guess than a measurement of nothing.
              const fitted = (window.innerHeight * 0.4) / r;
              if (
                r > 0 &&
                Number.isFinite(fitted) &&
                fitted > 1e-3 &&
                fitted < 500
              ) {
                ui.state.zoom = fitted;
              }
            }
          }
          ui.state.pan = { x: 0, y: 0 };
          ui.state.paused = false;
        },
        { key, cfg, seed: THUMBNAIL_SEED }
      );

      // Let it run to its representative moment. Real elapsed time, so trails
      // build the way a student would see them build.
      await page.waitForTimeout(cfg.settle * 1000);

      // Recenter on where the bodies have ended up. Several scenarios are not
      // initialized in their center-of-mass frame and drift steadily in one
      // direction: Binary Star System leaves the frame entirely within a few
      // seconds, and captured a black rectangle. This is a camera move, not a
      // physics change, and it is the same move a user would make by panning.
      if (cfg.recenter) {
        await page.evaluate(async () => {
          const ui = await import('/js/ui.js');
          const physics = await import('/js/physics.js');
          const bodies = [
            ...physics.stars,
            ...physics.planets,
            ...physics.gas_giants,
            ...physics.bh_list,
            ...physics.neutron_stars,
            ...physics.white_dwarfs,
          ].filter(b => b.alive && Number.isFinite(b.pos?.x));
          if (!bodies.length) return;
          // Only the bodies already in shot. Blended Binary's companion sits
          // 300 AU away and is half a solar mass: a mass-weighted centroid over
          // everything put the camera in empty space between the two, and the
          // capture came back blank.
          const reach = (window.innerHeight / 2) * 1.5;
          const inFrame = bodies.filter(
            b => Math.hypot(b.pos.x, b.pos.y) * ui.state.zoom < reach
          );
          const framed = inFrame.length ? inFrame : bodies;
          let m = 0;
          let cx = 0;
          let cy = 0;
          for (const b of framed) {
            const w = Math.max(b.mass || 0, 1e-6);
            m += w;
            cx += w * b.pos.x;
            cy += w * b.pos.y;
          }
          cx /= m;
          cy /= m;
          // The canvas transform is translate(W/2 + pan) then scale(z, -z), so
          // centering a world point means panning by its scaled position, with
          // y negated for the flipped axis.
          ui.state.pan = { x: -ui.state.zoom * cx, y: ui.state.zoom * cy };
        });
        await page.waitForTimeout(120);
      }

      // Composite the two canvases into one 16:9 frame and read it back. The
      // simulation canvas is the viewport's aspect already, so this is a
      // straight downscale rather than a crop.
      const dataUrl = await page.evaluate(
        ({ w, h, q }) => {
          const star = document.getElementById('starfieldCanvas');
          const sim = document.getElementById('simulationCanvas');
          const out = document.createElement('canvas');
          out.width = w;
          out.height = h;
          const ctx = out.getContext('2d');
          ctx.imageSmoothingQuality = 'high';
          // The page background shows through wherever neither canvas paints.
          ctx.fillStyle =
            getComputedStyle(document.documentElement)
              .getPropertyValue('--space-far')
              .trim() || '#000004';
          ctx.fillRect(0, 0, w, h);
          for (const c of [star, sim]) {
            if (c && c.width && c.height) ctx.drawImage(c, 0, 0, w, h);
          }
          return out.toDataURL('image/webp', q);
        },
        { w: WIDTH, h: HEIGHT, q: QUALITY }
      );

      if (!dataUrl.startsWith('data:image/webp')) {
        throw new Error('browser did not encode WebP');
      }
      const buf = Buffer.from(dataUrl.split(',')[1], 'base64');

      // Checked before writing, not after. A frame that encodes to almost
      // nothing is a black frame: the scenario failed to build, or everything
      // is off screen. Writing first would let a failed capture quietly replace
      // a good committed thumbnail with a black rectangle.
      if (buf.length < 2048) {
        throw new Error(`only ${buf.length} bytes: blank frame, not written`);
      }
      await writeFile(join(ROOT, SCENARIO_INFO[key].thumbnail), buf);

      results.push({ key, ok: true, size: buf.length });
      console.log(`${label} ${pad(kb(buf.length), 8)} ok`);
    } catch (err) {
      results.push({ key, ok: false, error: err.message });
      console.log(`${label} FAILED: ${err.message}`);
    }
  }

  await browser.close();
  server.close();

  const ok = results.filter(r => r.ok);
  const failed = results.filter(r => !r.ok);
  const total = ok.reduce((a, r) => a + r.size, 0);
  const biggest = [...ok].sort((a, b) => b.size - a.size).slice(0, 3);

  console.log(
    `\n${ok.length}/${keys.length} scenario thumbnails generated, ${kb(total)} total.`
  );
  if (ok.length) {
    console.log(
      `Largest: ${biggest.map(r => `${r.key} ${kb(r.size)}`).join(', ')}`
    );
  }
  if (failed.length) {
    console.log('\nFailed:');
    for (const f of failed) console.log(`  ✗ ${f.key}: ${f.error}`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
