#!/usr/bin/env node
// =============================================================================
// Starfield phase profile
// -----------------------------------------------------------------------------
// Development only.
//
//   node tools/starfield-probe.mjs
//   node tools/starfield-probe.mjs --seconds 8 --json before.json
//
// The general frame probe (tools/perf-probe.mjs) reports the mean starfield
// time per frame. That is the wrong statistic for this layer and hides exactly
// what matters about it: the field is repainted on some frames and skipped on
// others, so a mean over all frames is a mean over a bimodal distribution. A
// layer that costs eight milliseconds on one frame in three has a mean of two
// and a stutter you can see.
//
// So this samples per frame and reports the median and the ninety-fifth
// percentile of the frames that actually repainted, alongside how often they
// repainted. Those three numbers together are what a change to the starfield
// has to improve.
// =============================================================================

import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveStatic } from './static-server.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8129;

/**
 * The four cases the starfield behaves differently in.
 *
 * Empty is the floor: no lensing objects, no ripples, so the field repaints
 * only for twinkle. Binary BH has two lensing masses and is the scene the
 * improvement is required in. The merger case is the expensive one - an
 * expanding ripple tests every star every repaint. The crowded case is the
 * other axis: many compact objects, each tested against every star.
 */
const SCENES = [
  { id: 'empty', scenario: 'Empty' },
  { id: 'binary-bh', scenario: 'Binary BH' },
  { id: 'gw-merger', scenario: 'GW150914', forceMerge: true },
  { id: 'crowded', scenario: 'Compact Object Zoo' },
];

const pct = (sorted, p) => {
  if (!sorted.length) return 0;
  const i = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[i];
};
const ms = n => `${n.toFixed(2)}ms`;
const pad = (s, n) => String(s).padEnd(n);

async function main() {
  const args = process.argv.slice(2);
  const si = args.indexOf('--seconds');
  const seconds = si >= 0 ? Number(args[si + 1]) : 6;
  const ji = args.indexOf('--json');
  const jsonPath = ji >= 0 ? String(args[ji + 1]) : null;

  const server = await serveStatic({ root: ROOT, port: PORT });
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
  await page.waitForTimeout(1200);

  console.log(
    `\nStarfield phase, ${seconds}s per case at 1440x900, headless Chromium\n`
  );
  console.log(
    `${pad('scene', 14)} ${pad('tier', 6)} ${pad('stars', 7)} ${pad('paints/s', 9)} ` +
      `${pad('median', 9)} ${pad('p95', 9)} ${pad('max', 9)} ${pad('mean/frame', 11)} fps`
  );
  console.log('-'.repeat(96));

  const rows = [];
  for (const scene of SCENES) {
    for (const tier of ['full', 'low']) {
      const row = await page.evaluate(
        async ({ scene, tier, seconds }) => {
          const ui = await import('/js/ui.js');
          const render = await import('/js/render.js');
          const physics = await import('/js/physics.js');
          const quality = await import('/js/quality.js');
          const starfield = await import('/js/starfield.js');

          ui.SETTINGS.preset_scenario = scene.scenario;
          ui.initialize_simulation({ seed: 'starfield-probe' });
          ui.SETTINGS.quality_tier = tier;
          quality.setTier(tier);
          ui.state.paused = false;

          if (scene.forceMerge && physics.bh_list.length >= 2) {
            // A ripple has to be live for the merger case to mean anything, and
            // waiting out the inspiral is neither quick nor repeatable. Two
            // overlapping holes at a small step merge on the next few frames.
            ui.SETTINGS.max_timestep = 0.002;
            ui.SETTINGS.sim_speed = 0.2;
            physics.updatePhysicsSettings(ui.SETTINGS);
            const [a, b] = physics.bh_list;
            a.pos = { x: 0, y: 0 };
            b.pos = { x: (a.radius + b.radius) * 0.5, y: 0 };
            a.vel = { x: 0, y: 0 };
            b.vel = { x: 0, y: 0 };
            await new Promise(r => window.setTimeout(r, 400));
          }

          render.perf.reset();
          render.perf.enabled = true;

          const samples = [];
          let frames = 0;
          let paints = 0;
          let total = 0;

          await new Promise(done => {
            let lastStar = render.perf.starfield;
            let lastPaints = render.perf.starPaints;
            let last = performance.now();
            const started = last;
            const tick = now => {
              total += now - last;
              last = now;
              frames++;
              const dStar = render.perf.starfield - lastStar;
              const dPaint = render.perf.starPaints - lastPaints;
              lastStar = render.perf.starfield;
              lastPaints = render.perf.starPaints;
              // Only frames that actually repainted: a skipped frame costs
              // nothing and averaging it in is what hides the spike.
              if (dPaint > 0) {
                paints += dPaint;
                samples.push(dStar);
              }
              if (now - started < seconds * 1000) requestAnimationFrame(tick);
              else done();
            };
            requestAnimationFrame(tick);
          });

          render.perf.enabled = false;
          return {
            id: scene.id,
            tier,
            samples,
            frames,
            paints,
            elapsedMs: total,
            // The count the field was actually generated with, which is not
            // SETTINGS.star_density: that is now a proportion, and the count
            // itself comes from the window size and the tier.
            stars: starfield.starCountFor(
              document.getElementById('starfieldCanvas').width,
              document.getElementById('starfieldCanvas').height,
              quality.currentTier(),
              ui.SETTINGS.star_density
            ),
          };
        },
        { scene, tier, seconds }
      );

      const sorted = [...row.samples].sort((a, b) => a - b);
      const summary = {
        ...row,
        median: pct(sorted, 50),
        p95: pct(sorted, 95),
        max: sorted.length ? sorted[sorted.length - 1] : 0,
        meanPerFrame:
          row.samples.reduce((a, b) => a + b, 0) / Math.max(1, row.frames),
        paintsPerSecond: row.paints / (row.elapsedMs / 1000),
        fps: row.frames / (row.elapsedMs / 1000),
      };
      delete summary.samples;
      rows.push(summary);

      console.log(
        `${pad(row.id, 14)} ${pad(tier, 6)} ${pad(row.stars ?? '?', 7)} ` +
          `${pad(summary.paintsPerSecond.toFixed(1), 9)} ${pad(ms(summary.median), 9)} ` +
          `${pad(ms(summary.p95), 9)} ${pad(ms(summary.max), 9)} ` +
          `${pad(ms(summary.meanPerFrame), 11)} ${summary.fps.toFixed(0)}`
      );
    }
  }

  if (jsonPath) {
    await writeFile(
      jsonPath,
      `${JSON.stringify({ seconds, rows }, null, 2)}\n`
    );
    console.log(`\nWrote ${jsonPath}`);
  }

  await browser.close();
  server.close();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
