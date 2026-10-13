#!/usr/bin/env node
// =============================================================================
// Frame-time probe
// -----------------------------------------------------------------------------
// Development only. Loads the real application in headless Chromium, runs a
// scenario for a few seconds, and reports where the frame budget goes.
//
//   npm run perf                     the default scenario set
//   npm run perf -- 'star-cluster'   one or more scenarios by name
//   npm run perf -- --seconds 8      longer sample
//   npm run perf -- --tier low       pin the quality tier
//   npm run perf -- --dpr 2          emulate a HiDPI display
//   npm run perf -- --cpu 4          throttle the CPU by that factor
//   npm run perf -- --viewport 375x812   another window size (default 1440x900)
//   npm run perf -- --json out.json  also write the numbers, for a comparison
//   npm run perf -- --trace          separate raster and composite from script
//
// --trace (Prompt 112) records a Chromium trace and the Performance API's
// long-animation-frame entries over each sample and reports, in milliseconds
// a second, the main thread's script, layout, paint and commit time and the
// compositor, raster and GPU threads' busy time (tools/perf-trace.mjs; what it
// can and cannot show is in OFFLINE_AND_LOW_END.md). The heap is always
// sampled: used JavaScript heap after a forced collection, before and after
// each scenario, so a scenario that leaves memory behind shows as growth.
//
// --dpr and --cpu exist because a resolution change cannot be judged on the
// machine that is comfortable already. The question a backing-store change has
// to answer is what it costs on the slowest machine the low tier exists for,
// at the pixel density that machine might have; --cpu 4 with --tier low is the
// closest this instrument gets to a 2019 Chromebook, and --dpr is the only way
// to see a device-pixel budget bind at all, since headless Chromium reports 1.
// --viewport is for the four layouts of PLATFORM_MODEL.md: a phone's window
// draws fewer pixels and a tablet's sheets cover more of the canvas, and the
// frame times at each width are recorded against the tiers (Prompt 55).
//
// The tier flag matters for a rendering change. Left to itself the tier is a
// measurement of the machine, so a before-and-after pair taken on 'auto' can
// differ because one run happened to demote and the other did not. Pinning it
// makes the two comparable, and makes it possible to answer the only question
// that really gates a visual change: did the slow path get slower.
//
// It measures by wrapping the renderer's own entry points rather than by
// sampling a profiler, so the numbers line up with the functions in render.js
// and can be compared directly before and after a change. requestAnimationFrame
// runs at full rate in headless Chromium, which is what makes this usable at
// all: the same measurement taken through a hidden browser tab is throttled and
// meaningless.
// =============================================================================

import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveStatic } from './static-server.mjs';
import {
  MAX_TRACE_BYTES,
  TRACE_CATEGORIES,
  summarizeLoaf,
  summarizeTrace,
  traceEvents,
} from './perf-trace.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8126;

// A spread of shapes rather than the easiest one: a two-body system, a
// multi-body system at real scale, a tightly integrated one, a dense cluster,
// an inspiral, and a scenario built out of visual effects.
const DEFAULT_SCENARIOS = [
  'binary-pair',
  'solar-system',
  'trappist-1-system',
  'star-cluster',
  'gw150914',
  'tidal-disruption-event',
];

const ms = n => `${n.toFixed(2)}ms`;

/**
 * The trace as milliseconds per animation frame, and how busy each thread was.
 *
 * Per frame, not per second: an uncapped loop runs as fast as its slowest
 * thread allows, so a per-second figure measures how many frames fit. The busy
 * fractions are the answer to "what limits this loop": a thread near 100% is
 * the limit.
 */
function describeTrace(row) {
  const t = row.trace;
  if (!t)
    return `${pad('', 24)} trace: none read (${(row.traceBytes / 1048576).toFixed(0)} MB; use a shorter --seconds)`;
  const b = t.buckets;
  const frames = Math.max(1, (t.windowMs * row.fps) / 1000);
  const f = v => ms(v / frames);
  const busy = k =>
    `${(((t.threadBusyMs[k] || 0) / t.windowMs) * 100).toFixed(0)}%`;
  const l = row.loaf;
  return (
    `${pad('', 24)} per frame: script ${f(b.script)}, layout ${f(b.layout)}, ` +
    `paint ${f(b.paint)}, commit ${f(b.commit)}; compositor+viz ` +
    `${f(b.composite)}, raster ${f(b.raster)}, GPU ${f(b.gpu)}\n` +
    `${pad('', 24)} busy: main ${busy('main')}, compositor ${busy('compositor')}, ` +
    `viz ${busy('viz')}, GPU ${busy('gpu')}; long animation frames ${l.frames} ` +
    `(script ${ms(l.scriptMs)}, render ${ms(l.renderMs)}, worst ${ms(l.worstMs)})`
  );
}

const pad = (s, n) => String(s).padEnd(n);

async function main() {
  const args = process.argv.slice(2);
  const si = args.indexOf('--seconds');
  const seconds = si >= 0 ? Number(args[si + 1]) : 5;
  const ti = args.indexOf('--tier');
  const tier = ti >= 0 ? String(args[ti + 1]) : 'auto';
  if (!['auto', 'low', 'full'].includes(tier)) {
    throw new Error(`--tier ${tier} is not auto, low or full`);
  }
  const ji = args.indexOf('--json');
  const jsonPath = ji >= 0 ? String(args[ji + 1]) : null;
  const di = args.indexOf('--dpr');
  const dpr = di >= 0 ? Number(args[di + 1]) : 1;
  if (!(dpr > 0)) throw new Error(`--dpr ${args[di + 1]} is not a number > 0`);
  const ci = args.indexOf('--cpu');
  const cpu = ci >= 0 ? Number(args[ci + 1]) : 1;
  if (!(cpu >= 1))
    throw new Error(`--cpu ${args[ci + 1]} is not a number >= 1`);
  const vi = args.indexOf('--viewport');
  const [width, height] = (vi >= 0 ? String(args[vi + 1]) : '1440x900')
    .split('x')
    .map(Number);
  if (!(width > 0 && height > 0)) {
    throw new Error(`--viewport ${args[vi + 1]} is not WIDTHxHEIGHT`);
  }
  const trace = args.includes('--trace');
  const valueIndexes = new Set(
    [si, ti, ji, di, ci, vi].filter(i => i >= 0).map(i => i + 1)
  );
  const wanted = args.filter(
    (a, i) => !a.startsWith('--') && !valueIndexes.has(i)
  );
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
    viewport: { width, height },
    deviceScaleFactor: dpr,
  });
  page.on('pageerror', e => console.warn(`  ! ${e.message}`));

  // CPU throttling is a CDP-only control; Playwright has no wrapper for it.
  // Applied before the first navigation so page construction is throttled too,
  // which is where a slow machine actually hurts.
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  if (cpu > 1) {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  }
  // Used JavaScript heap in MB, after a forced collection when asked: what is
  // still reachable, not what the allocator has not yet got round to freeing.
  const heapMB = async collect => {
    if (collect) await cdp.send('HeapProfiler.collectGarbage');
    const { metrics } = await cdp.send('Performance.getMetrics');
    return metrics.find(m => m.name === 'JSHeapUsedSize').value / 1048576;
  };
  console.log(
    `profile: viewport ${width}x${height}, dpr ${dpr}, cpu x${cpu}, tier ${tier}`
  );

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
    `\nFrame-time probe: ${seconds}s per scenario at 1440x900, headless ` +
      `Chromium, quality tier ${tier}\n`
  );
  console.log(
    `${pad('scenario', 24)} ${pad('fps', 7)} ${pad('frame', 9)} ${pad('starfield', 11)} ${pad('star%', 7)} ${pad('scene', 9)} ${pad('bloom', 9)} bloom%`
  );
  console.log('-'.repeat(92));

  const results = [];
  for (const key of scenarios) {
    const heapBefore = await heapMB(true);
    await page.evaluate(
      async ({ key, tier }) => {
        const ui = await import('/js/ui.js');
        const quality = await import('/js/quality.js');

        ui.SETTINGS.preset_scenario = key;
        ui.initialize_simulation({ seed: 'perf-probe' });
        ui.state.paused = false;
        // After the build, because apply_preset resets the settings. 'auto'
        // is the reader's own default and is left to the sampler.
        if (tier !== 'auto') {
          ui.SETTINGS.quality_tier = tier;
          quality.setTier(tier);
        }
      },
      { key, tier }
    );
    // Observers go in after the build, so the entries are the sample's.
    await page.evaluate(() => {
      window.__loaf = [];
      window.__longTasks = [];
      const watch = (type, into) => {
        try {
          new window.PerformanceObserver(list =>
            into.push(...list.getEntries())
          ).observe({ type });
        } catch {
          /* the entry type is not supported by this browser */
        }
      };
      watch('long-animation-frame', window.__loaf);
      watch('longtask', window.__longTasks);
    });
    if (trace)
      await browser.startTracing(page, { categories: TRACE_CATEGORIES });
    const row = await page.evaluate(
      async ({ key, seconds }) => {
        const render = await import('/js/render.js');

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
    if (trace) {
      const raw = await browser.stopTracing();
      // A busy uncapped loop writes hundreds of megabytes a minute; a trace
      // that cannot be parsed is reported, and a shorter --seconds fixes it.
      const events = raw.length > MAX_TRACE_BYTES ? [] : traceEvents(raw);
      row.trace = summarizeTrace(events);
      row.traceBytes = raw.length;
      row.loaf = summarizeLoaf(
        await page.evaluate(() =>
          window.__loaf.map(e => ({
            startTime: e.startTime,
            duration: e.duration,
            renderStart: e.renderStart,
            styleAndLayoutStart: e.styleAndLayoutStart,
            blockingDuration: e.blockingDuration,
            scripts: e.scripts.map(x => ({ duration: x.duration })),
          }))
        )
      );
    }
    row.longTasks = await page.evaluate(() => ({
      count: window.__longTasks.length,
      worstMs: Math.max(0, ...window.__longTasks.map(t => t.duration)),
    }));
    row.heapBeforeMB = heapBefore;
    row.heapAfterMB = await heapMB(true);

    results.push(row);
    console.log(
      `${pad(key, 24)} ${pad(row.fps.toFixed(1), 7)} ${pad(ms(row.frame), 9)} ` +
        `${pad(ms(row.star), 11)} ${pad(row.starPct.toFixed(0) + '%', 7)} ` +
        `${pad(ms(row.scene), 9)} ${pad(ms(row.bloom), 9)} ${row.bloomPct.toFixed(0)}%`
    );
    console.log(
      `${pad('', 24)} heap ${row.heapBeforeMB.toFixed(1)} -> ` +
        `${row.heapAfterMB.toFixed(1)} MB, ${row.longTasks.count} long tasks ` +
        `(worst ${ms(row.longTasks.worstMs)})`
    );
    if (row.trace) console.log(describeTrace(row, seconds));
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

  if (jsonPath) {
    // Written for a before-and-after comparison rather than for a dashboard:
    // the numbers as measured, with the tier they were measured at, because a
    // pair taken at different tiers is not a comparison of anything.
    await writeFile(
      jsonPath,
      `${JSON.stringify({ tier, seconds, cpu, dpr, viewport: [width, height], results, idle }, null, 2)}\n`
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
