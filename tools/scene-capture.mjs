#!/usr/bin/env node
// =============================================================================
// Capture a scene record at its exact simulated time
// -----------------------------------------------------------------------------
// Loads a `gravitas.scene-record/1` (tools/scene-record.mjs) in headless
// Chromium, builds the scenario under the record's seed, drives the real render
// loop with a fixed frame step (js/render.js setFixedStep) until the physics
// clock is within one frame advance of the target, pauses before the next
// frame can overshoot, and takes one last updatePhysics(remaining) so the
// clock equals the target to 1e-9. Then it writes the canvas and the viewport
// as PNGs and a sidecar with what the page actually reported.
//
//   node tools/scene-capture.mjs <record.json ...> --out <dir outside the repo>
//   node tools/scene-capture.mjs <record.json> --out <dir> --repeat
//        capture twice in fresh pages and compare the two images
//
// Pinning: reduced motion is emulated, which stops the starfield's twinkle; the
// frames run on Playwright's fake clock (one animation frame per 16 ms of it),
// so the page's wall-clock layers (the playback bar records a frame every
// 100 ms of real time, js/timeline.js; the paused redraw; effect lifetimes)
// stand still between frames; Math.random is replaced for the run by a stream
// seeded from the record's seed number, so effects that draw after the build
// (the black hole's disk particles) repeat; the device pixel ratio and the
// viewport come from the record; the tier is pinned before the build, where the
// population caps act. --repeat captures twice and measures any pixel that
// still differs, names the element at each group of them, and never hides it.
//
// The images are an output, not a fixture: --out must be outside this checkout.
// =============================================================================

/* global atob, createImageBitmap, Blob, OffscreenCanvas */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve, dirname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveStatic } from './static-server.mjs';
import {
  loadRecord,
  VIEW_KEYS,
  PHYSICS_KEYS,
  CLOCK_TOLERANCE,
} from './scene-record.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Start the static server and a browser; the caller closes both. */
export async function launch({ headlessArgs = [], port = 0 } = {}) {
  const server = await serveStatic({ root: ROOT, port });
  const browser = await chromium.launch({ args: headlessArgs });
  return {
    server,
    browser,
    origin: `http://localhost:${server.address().port}`,
    async close() {
      await browser.close();
      server.close();
    },
  };
}

/** A page for the record: its viewport and pixel ratio, the app booted. */
export async function openPage(
  browser,
  origin,
  record,
  { reducedMotion = true, fakeClock = false } = {}
) {
  const page = await browser.newPage({
    viewport: record.viewport,
    deviceScaleFactor: record.pixelRatio,
    reducedMotion: reducedMotion ? 'reduce' : 'no-preference',
  });
  page.on('pageerror', e => console.warn(`  ! ${e.message}`));
  await page.goto(`${origin}/`, { waitUntil: 'load' });
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
  // After boot, so the splash and the first layout ran on real time; from here
  // every clock in the page moves only when runFor says so.
  if (fakeClock) {
    await page.clock.install({ time: 1.7e12 });
    await page.clock.pauseAt(1.7e12 + 1000);
  }
  return page;
}

/**
 * Build the record's world in the page, set its view, and run it to the target
 * time. Returns what the page reports.
 *
 * `run: false` stops after the view is set (the frame-time probe runs the scene
 * itself afterwards). `driven: true` runs the frames on Playwright's fake clock
 * (`page.clock`): each runFor(16) is one animation frame and the page's own
 * clocks (Date, performance.now, the 100 ms timeline capture, the idle redraw)
 * stand still between them, so two captures of a record take the same frames.
 * Without it the loop runs on the wall clock.
 */
export async function applyScene(
  page,
  record,
  { run = true, driven = false } = {}
) {
  const started = await page.evaluate(
    async ({ rec, run, driven, viewKeys, physicsKeys, tolerance }) => {
      const ui = await import('/js/ui.js');
      const physics = await import('/js/physics.js');
      const render = await import('/js/render.js');
      const quality = await import('/js/quality.js');
      const theme = await import('/js/theme.js');
      const ts = await import('/js/timestep.js');
      const { SETTINGS, state } = ui;

      theme.setTheme(rec.theme);
      // The tier acts on the build (population caps), so it is pinned first.
      SETTINGS.quality_tier = rec.qualityTier;
      quality.setTier(rec.qualityTier);
      SETTINGS.preset_scenario = rec.scenario;
      ui.initialize_simulation({ seed: rec.load.seed });
      SETTINGS.quality_tier = rec.qualityTier;
      quality.setTier(rec.qualityTier);

      const differ = (keys, want) =>
        keys
          .filter(k => JSON.stringify(SETTINGS[k]) !== JSON.stringify(want[k]))
          .map(k => ({ key: k, live: SETTINGS[k], record: want[k] }));
      const settingsDiffer = differ(viewKeys, rec.settings);
      const physicsDiffer = differ(physicsKeys, rec.physics);
      for (const k of viewKeys) SETTINGS[k] = rec.settings[k];

      state.zoom = rec.camera.zoom;
      state.pan = { x: rec.camera.pan.x, y: rec.camera.pan.y };
      state.paused = true;
      SETTINGS.paused = true;

      const steps = { frames: 0, last: 0 };
      const realRandom = Math.random;
      const target = rec.clock.targetSimTime;

      const finish = () => {
        if (run) {
          render.setFixedStep(0);
          const remaining = target - physics.getSimulationTime();
          if (remaining > 0) {
            const p = ts.substepPlan(remaining, SETTINGS.max_timestep);
            for (let i = 0; i < p.substeps; i++) physics.updatePhysics(p.step);
          }
          Math.random = realRandom;
          steps.last = remaining;
        }
        const t = physics.getSimulationTime();

        const card = document.getElementById('scenarioInfoBox');
        const cardOpen = !!card && card.classList.contains('showUI');
        if (card && !rec.cardOpen && cardOpen) card.classList.remove('showUI');

        const canvas = document.getElementById('simulationCanvas');
        const counts = {};
        for (const l of [
          'bh_list',
          'stars',
          'planets',
          'gas_giants',
          'asteroids',
          'comets',
          'neutron_stars',
          'white_dwarfs',
          'galaxies',
        ])
          counts[l] = physics[l].length;
        return {
          simTime: t,
          clockError: run ? Math.abs(t - target) : null,
          withinTolerance: run ? Math.abs(t - target) <= tolerance : null,
          framesDriven: steps.frames,
          lastStep: steps.last,
          zoom: state.zoom,
          pan: state.pan,
          frameOffset: { x: state.frameOffset.x, y: state.frameOffset.y },
          theme: theme.getTheme(),
          qualityTier: quality.currentTier(),
          paused: state.paused,
          cardOpenOnLoad: cardOpen,
          cardOpenAtCapture: !!card && card.classList.contains('showUI'),
          canvas: { width: canvas.width, height: canvas.height },
          devicePixelRatio: window.devicePixelRatio,
          counts,
          settingsDiffer,
          physicsDiffer,
        };
      };

      if (!run) return { report: finish() };

      const seconds = rec.clock.fixedFrameSeconds;
      const advance = ts.frameAdvance(seconds, SETTINGS.sim_speed, physics.DT);
      // Effects that draw from Math.random after the build (the black hole's
      // disk particles) are unseeded in the page; a stream seeded from the
      // record's own seed number stands in for the run, so a repeat sees the
      // same particles. It is put back before anything is drawn for the capture.
      const { mulberry32 } = await import('/js/rng.js');
      Math.random = mulberry32(rec.load.seedNumber);
      window.__sceneDone = false;
      const tick = () => {
        steps.frames++;
        // Pause before the next frame could carry the clock past the target.
        if (physics.getSimulationTime() + advance > target) {
          state.paused = true;
          SETTINGS.paused = true;
          window.__sceneDone = true;
          return;
        }
        requestAnimationFrame(tick);
      };
      render.setFixedStep(seconds);
      state.paused = false;
      SETTINGS.paused = false;
      requestAnimationFrame(tick);
      window.__sceneFinish = finish;
      if (driven) return { driving: true };
      await new Promise(resolve => {
        const wait = () =>
          window.__sceneDone ? resolve() : requestAnimationFrame(wait);
        wait();
      });
      return { report: finish() };
    },
    {
      rec: record,
      run,
      driven,
      viewKeys: VIEW_KEYS,
      physicsKeys: PHYSICS_KEYS,
      tolerance: CLOCK_TOLERANCE,
    }
  );
  if (started.report) return started.report;
  // Driven: one animation frame per 16 ms of the fake clock, until the page
  // says it has paused at the target.
  let guard = 0;
  while (!(await page.evaluate(() => window.__sceneDone))) {
    await page.clock.runFor(16);
    if (++guard > 200000) throw new Error('the scene never reached its target');
  }
  return page.evaluate(() => window.__sceneFinish());
}

const sha = buf => createHash('sha256').update(buf).digest('hex').slice(0, 16);

/** Capture one record in a fresh page; the PNG bytes and the sidecar. */
export async function captureOnce(browser, origin, record) {
  const page = await openPage(browser, origin, record, { fakeClock: true });
  try {
    const report = await applyScene(page, record, { driven: true });
    // The paused loop redraws at 10 Hz; half a second of the fake clock gives
    // it its redraws, the same number every time.
    await page.clock.runFor(500);
    const canvas = await page.locator('#simulationCanvas').screenshot();
    const viewport = await page.screenshot();
    // The one layer that follows the wall clock: the playback bar records a
    // frame every 100 ms of real time (js/timeline.js), so its label and thumb
    // show the last recorded frame, not the physics clock. Its place is
    // reported so that a repeat can say whether the difference is confined to it.
    report.timelineBar = await page.evaluate(() => {
      const bar = document.getElementById('timelineBar');
      const r = bar?.getBoundingClientRect();
      return {
        label: document.getElementById('timelineTime')?.textContent ?? null,
        rect: r ? [r.left, r.top, r.right, r.bottom] : null,
      };
    });
    return { report, canvas, viewport };
  } finally {
    await page.close();
  }
}

/** Differing pixels between two PNGs, decoded in a page. */
export async function comparePng(browser, a, b) {
  const page = await browser.newPage();
  try {
    return await page.evaluate(
      async ([x, y]) => {
        const decode = async b64 => {
          const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
          const bmp = await createImageBitmap(
            new Blob([bytes], { type: 'image/png' })
          );
          const c = new OffscreenCanvas(bmp.width, bmp.height);
          const g = c.getContext('2d');
          g.drawImage(bmp, 0, 0);
          return {
            w: bmp.width,
            h: bmp.height,
            d: g.getImageData(0, 0, bmp.width, bmp.height).data,
          };
        };
        const [p, q] = await Promise.all([decode(x), decode(y)]);
        if (p.w !== q.w || p.h !== q.h) return { sameSize: false };
        let diff = 0;
        let x0 = p.w;
        let y0 = p.h;
        let x1 = -1;
        let y1 = -1;
        let maxDelta = 0;
        for (let i = 0; i < p.d.length; i += 4) {
          const dd = Math.max(
            Math.abs(p.d[i] - q.d[i]),
            Math.abs(p.d[i + 1] - q.d[i + 1]),
            Math.abs(p.d[i + 2] - q.d[i + 2])
          );
          if (dd > 0) {
            diff++;
            maxDelta = Math.max(maxDelta, dd);
            const px = (i / 4) % p.w;
            const py = Math.floor(i / 4 / p.w);
            x0 = Math.min(x0, px);
            y0 = Math.min(y0, py);
            x1 = Math.max(x1, px);
            y1 = Math.max(y1, py);
          }
        }
        // Groups of differing pixels: 32-pixel cells, joined when they touch.
        const cell = 32;
        const cols = Math.ceil(p.w / cell);
        const cells = new Map();
        for (let i = 0; i < p.d.length; i += 4) {
          if (
            p.d[i] === q.d[i] &&
            p.d[i + 1] === q.d[i + 1] &&
            p.d[i + 2] === q.d[i + 2]
          )
            continue;
          const px = (i / 4) % p.w;
          const py = Math.floor(i / 4 / p.w);
          const key = Math.floor(py / cell) * cols + Math.floor(px / cell);
          const c = cells.get(key) ?? [px, py, px, py, 0];
          c[0] = Math.min(c[0], px);
          c[1] = Math.min(c[1], py);
          c[2] = Math.max(c[2], px);
          c[3] = Math.max(c[3], py);
          c[4]++;
          cells.set(key, c);
        }
        const clusters = [];
        const seen = new Set();
        for (const start of cells.keys()) {
          if (seen.has(start)) continue;
          const stack = [start];
          seen.add(start);
          const box = [p.w, p.h, -1, -1, 0];
          while (stack.length) {
            const k = stack.pop();
            const c = cells.get(k);
            box[0] = Math.min(box[0], c[0]);
            box[1] = Math.min(box[1], c[1]);
            box[2] = Math.max(box[2], c[2]);
            box[3] = Math.max(box[3], c[3]);
            box[4] += c[4];
            const cx = k % cols;
            const cy = Math.floor(k / cols);
            for (let dy = -1; dy <= 1; dy++)
              for (let dx = -1; dx <= 1; dx++) {
                const nx = cx + dx;
                const ny = cy + dy;
                if (nx < 0 || nx >= cols || ny < 0) continue;
                const nk = ny * cols + nx;
                if (cells.has(nk) && !seen.has(nk)) {
                  seen.add(nk);
                  stack.push(nk);
                }
              }
          }
          clusters.push(box);
        }
        clusters.sort((a, b) => b[4] - a[4]);
        return {
          sameSize: true,
          pixels: p.w * p.h,
          differing: diff,
          maxChannelDelta: maxDelta,
          box: diff ? [x0, y0, x1, y1] : null,
          clusters: clusters.slice(0, 12),
        };
      },
      [a.toString('base64'), b.toString('base64')]
    );
  } finally {
    await page.close();
  }
}

function gitHead() {
  try {
    return execFileSync('git', ['rev-parse', '--short=8', 'HEAD'], {
      cwd: ROOT,
      encoding: 'utf8',
    }).trim();
  } catch {
    return 'unknown';
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const oi = argv.indexOf('--out');
  if (oi < 0)
    throw new Error('--out <directory outside the repository> is required');
  const out = resolve(argv[oi + 1]);
  if (out === ROOT || out.startsWith(ROOT + sep))
    throw new Error(
      'captures are an output: --out must be outside this checkout'
    );
  const repeat = argv.includes('--repeat');
  const files = argv.filter((a, i) => !a.startsWith('--') && i !== oi + 1);
  if (!files.length) throw new Error('name at least one scene record');
  mkdirSync(out, { recursive: true });
  const L = await launch();
  let failed = 0;
  try {
    for (const file of files) {
      const record = loadRecord(file);
      const first = await captureOnce(L.browser, L.origin, record);
      const files2 = {
        canvas: join(out, `${record.id}-canvas.png`),
        viewport: join(out, `${record.id}-viewport.png`),
      };
      writeFileSync(files2.canvas, first.canvas);
      writeFileSync(files2.viewport, first.viewport);
      const sidecar = {
        record: record.id,
        scenario: record.scenario,
        recordHash: sha(readFileSync(file)),
        tree: gitHead(),
        ...first.report,
        canvasPng: sha(first.canvas),
        viewportPng: sha(first.viewport),
      };
      if (repeat) {
        const second = await captureOnce(L.browser, L.origin, record);
        writeFileSync(
          join(out, `${record.id}-repeat-canvas.png`),
          second.canvas
        );
        const canvas = await comparePng(L.browser, first.canvas, second.canvas);
        // What is at the middle of each group, in the first capture's page.
        const page = await openPage(L.browser, L.origin, record);
        try {
          await applyScene(page, record, { run: false });
          for (const c of canvas.clusters ?? [])
            c.push(
              await page.evaluate(
                ([x, y]) => {
                  const e = document.elementFromPoint(x, y);
                  if (!e) return 'nothing';
                  const inside = e.closest('[id]');
                  return `${e.tagName.toLowerCase()}${inside ? `#${inside.id}` : ''}`;
                },
                [(c[0] + c[2]) / 2, (c[1] + c[3]) / 2]
              )
            );
        } finally {
          await page.close();
        }
        const rect = first.report.timelineBar.rect;
        const box = canvas.box;
        sidecar.repeat = {
          sameBytes: sha(second.canvas) === sha(first.canvas),
          canvas,
          clockErrorSecond: second.report.clockError,
          timelineLabels: [
            first.report.timelineBar.label,
            second.report.timelineBar.label,
          ],
          // True when every differing pixel lies inside the playback bar.
          confinedToTimelineBar:
            !box ||
            (rect &&
              box[0] >= rect[0] &&
              box[1] >= rect[1] &&
              box[2] <= rect[2] &&
              box[3] <= rect[3]),
        };
      }
      writeFileSync(
        join(out, `${record.id}.sidecar.json`),
        `${JSON.stringify(sidecar, null, 2)}\n`
      );
      const ok = sidecar.withinTolerance === true;
      if (!ok) failed++;
      console.log(
        `${ok ? 'pass' : 'FAIL'} ${record.id} clock ${sidecar.simTime} target ${record.clock.targetSimTime} error ${sidecar.clockError}` +
          (repeat
            ? ` repeat: ${sidecar.repeat.sameBytes ? 'identical' : `${sidecar.repeat.canvas.differing} of ${sidecar.repeat.canvas.pixels} pixels differ, box ${JSON.stringify(sidecar.repeat.canvas.box)}, inside the playback bar: ${sidecar.repeat.confinedToTimelineBar}, labels ${sidecar.repeat.timelineLabels.join(' / ')}; groups [x0,y0,x1,y1,pixels,element] ${JSON.stringify(sidecar.repeat.canvas.clusters)}`}`
            : '')
      );
    }
  } finally {
    await L.close();
  }
  process.exitCode = failed ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1])
  main().catch(e => {
    console.error(e);
    process.exit(2);
  });
