#!/usr/bin/env node
// =============================================================================
// Frame-time probe
// -----------------------------------------------------------------------------
// Development only. Loads the real application in headless Chromium, runs a
// scenario for a few seconds, and reports where the frame budget goes.
//
//   npm run perf                     the default scenario set
//   npm run perf -- "Star Cluster"   one or more scenarios by name
//   npm run perf -- --seconds 8      longer sample
//
// It measures by wrapping the renderer's own entry points rather than by
// sampling a profiler, so the numbers line up with the functions in render.js
// and can be compared directly before and after a change. requestAnimationFrame
// runs at full rate in headless Chromium, which is what makes this usable at
// all: the same measurement taken through a hidden browser tab is throttled and
// meaningless.
// =============================================================================

import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveStatic } from './static-server.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8126;

// A spread of shapes rather than the easiest one: a two-body system, a
// multi-body system at real scale, a tightly integrated one, a dense cluster,
// an inspiral, and a scenario built out of visual effects.
const DEFAULT_SCENARIOS = [
  'Binary Pair',
  'Solar System',
  'TRAPPIST-1 System',
  'Star Cluster',
  'GW150914',
  'Tidal Disruption Event',
];

const ms = n => `${n.toFixed(2)}ms`;
const pad = (s, n) => String(s).padEnd(n);

async function main() {
  const args = process.argv.slice(2);
  const si = args.indexOf('--seconds');
  const seconds = si >= 0 ? Number(args[si + 1]) : 5;
  const wanted = args.filter((a, i) => !a.startsWith('--') && i !== si + 1);
  const scenarios = wanted.length ? wanted : DEFAULT_SCENARIOS;

  const server = await serveStatic({ root: ROOT, port: PORT });
  // Headless Chromium rasterises the canvas in software by default, which caps
  // the loop far below what a real machine does and hides every saving that
  // comes from skipping work: if each frame already takes 80ms, no throttle
  // ever fires. These flags hand rasterisation to the GPU where one is
  // available and lift the vsync cap, which brings the sample close enough to
  // a real frame budget for the skip rates to mean something.
  const browser = await chromium.launch({
    args: [
      '--use-gl=angle',
      '--use-angle=default',
      '--enable-gpu-rasterization',
      '--ignore-gpu-blocklist',
      '--disable-gpu-vsync',
      '--disable-frame-rate-limit',
    ],
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
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

  console.log(
    `\nFrame-time probe: ${seconds}s per scenario at 1440x900, headless Chromium\n`
  );
  console.log(
    `${pad('scenario', 24)} ${pad('fps', 7)} ${pad('frame', 9)} ${pad('starfield', 11)} ${pad('star%', 7)} ${pad('scene', 9)} ${pad('bloom', 9)} bloom%`
  );
  console.log('-'.repeat(92));

  const results = [];
  for (const key of scenarios) {
    const row = await page.evaluate(
      async ({ key, seconds }) => {
        const ui = await import('/js/ui.js');
        const render = await import('/js/render.js');

        ui.SETTINGS.preset_scenario = key;
        ui.initialize_simulation({ seed: 'perf-probe' });
        ui.state.paused = false;

        // The renderer keeps its own per-phase counters, off by default.
        render.perf.reset();
        render.perf.enabled = true;

        // Frame timing comes from rAF itself: the gap between callbacks is the
        // number a user actually feels, whatever the renderer spends inside it.
        const stats = { frames: 0, total: 0 };
        await new Promise(done => {
          let last = performance.now();
          const started = last;
          const tick = now => {
            stats.total += now - last;
            stats.frames++;
            last = now;
            if (now - started < seconds * 1000) requestAnimationFrame(tick);
            else done();
          };
          requestAnimationFrame(tick);
        });

        render.perf.enabled = false;
        const n = Math.max(1, stats.frames);
        const r = Math.max(1, render.perf.frames);
        return {
          key,
          fps: 1000 / (stats.total / n),
          frame: stats.total / n,
          star: render.perf.starfield / r,
          scene: render.perf.scene / r,
          bloom: render.perf.bloom / r,
          starPct: (render.perf.starPaints / r) * 100,
          bloomPct: (render.perf.bloomPaints / r) * 100,
          bodies: (await import('/js/physics.js')).allBodies?.().length ?? 0,
        };
      },
      { key, seconds }
    );

    results.push(row);
    console.log(
      `${pad(key, 24)} ${pad(row.fps.toFixed(1), 7)} ${pad(ms(row.frame), 9)} ` +
        `${pad(ms(row.star), 11)} ${pad(row.starPct.toFixed(0) + '%', 7)} ` +
        `${pad(ms(row.scene), 9)} ${pad(ms(row.bloom), 9)} ${row.bloomPct.toFixed(0)}%`
    );
  }

  // Idle cost matters as much as the busy case: a tab left open on a paused
  // simulation should not keep a core warm.
  const idle = await page.evaluate(async seconds => {
    const ui = await import('/js/ui.js');
    const render = await import('/js/render.js');
    ui.state.paused = true;
    render.perf.reset();
    render.perf.enabled = true;
    const stats = { frames: 0, total: 0 };
    await new Promise(done => {
      let last = performance.now();
      const started = last;
      const tick = now => {
        stats.total += now - last;
        stats.frames++;
        last = now;
        if (now - started < seconds * 1000) requestAnimationFrame(tick);
        else done();
      };
      requestAnimationFrame(tick);
    });
    render.perf.enabled = false;
    ui.state.paused = false;
    const r = Math.max(1, render.perf.frames);
    return {
      fps: 1000 / (stats.total / Math.max(1, stats.frames)),
      // What matters when paused is not the loop rate but how much of it does
      // any work: an empty callback sixty times a second costs nothing.
      drawMs: (render.perf.scene + render.perf.starfield) / r,
      scenePct: (render.perf.starPaints / r) * 100,
    };
  }, 3);

  console.log('-'.repeat(92));
  const avg = k => results.reduce((a, r) => a + r[k], 0) / results.length;
  console.log(
    `${pad('mean', 24)} ${pad(avg('fps').toFixed(1), 7)} ${pad(ms(avg('frame')), 9)} ` +
      `${pad(ms(avg('star')), 11)} ${pad(avg('starPct').toFixed(0) + '%', 7)} ` +
      `${pad(ms(avg('scene')), 9)} ${pad(ms(avg('bloom')), 9)} ${avg('bloomPct').toFixed(0)}%`
  );
  console.log(
    `\nPaused: ${idle.fps.toFixed(1)} fps loop, ${ms(idle.drawMs)} drawing per frame, ` +
      `starfield repainted on ${idle.scenePct.toFixed(0)}% of frames`
  );

  await browser.close();
  server.close();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
