#!/usr/bin/env node
// =============================================================================
// Main-thread work above a stated budget (Prompt 112, part 2)
// -----------------------------------------------------------------------------
// Development only. Loads pages in headless Chromium, drives them through a
// short session and lists every long animation frame (50 ms or more, the
// browser's own threshold) with the scripts that ran in it. It answers "what
// else runs on the page's thread for longer than it should?" with a name and a
// duration instead of a guess.
//
//   node tools/longtask-census.mjs                 every session below, 1x
//   node tools/longtask-census.mjs --cpu 4         the Chromebook proxy
//   node tools/longtask-census.mjs observatory     one session by name
//
// The budgets it judges against are stated in OFFLINE_AND_LOW_END.md: work that
// recurs every frame gets 8 ms of script on the 4x proxy (half of a 60 fps
// frame), and a single task started by the reader gets 50 ms; anything longer
// has to yield to the page or run in a Worker. CPU throttling does not reach
// Workers, which is why work that has moved to one is not slower here.
// =============================================================================

import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveStatic } from './static-server.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8127;

const args = process.argv.slice(2);
const ci = args.indexOf('--cpu');
const cpu = ci >= 0 ? Number(args[ci + 1]) : 1;
const wanted = args.filter((a, i) => !a.startsWith('--') && i !== ci + 1);

/** Pages and what a reader does on them. Each step is awaited in the page. */
const SESSIONS = {
  app: {
    url: '/',
    ready: () => window.splashScreenEnded === true,
    steps: [
      async () => {
        const ui = await import('/js/ui.js');
        for (const key of ['solar-system', 'star-cluster', 'binary-pair']) {
          ui.SETTINGS.preset_scenario = key;
          ui.initialize_simulation({ seed: 'census' });
          await new Promise(r => window.setTimeout(r, 1500));
        }
      },
      async () => {
        window.location.hash = 'investigation=keplers-laws';
        await new Promise(r => window.setTimeout(r, 2500));
      },
    ],
  },
  observatory: {
    url: '/observatory/',
    ready: () => document.documentElement.dataset.ready === 'true',
    steps: [
      async () => {
        window.__marks = [['open', Math.round(performance.now())]];
        document.getElementById('obsFixture').selectedIndex = 0;
        document.getElementById('obsOpen').click();
        await new Promise(r => window.setTimeout(r, 3000));
        for (const id of [
          'obsMeasurePanel',
          'obsFitPanel',
          'obsComparePanel',
          'obsSkyPanel',
        ]) {
          window.__marks.push([id, Math.round(performance.now())]);
          document.getElementById(id)?.querySelector('summary')?.click();
          await new Promise(r => window.setTimeout(r, 1500));
        }
      },
    ],
  },
  studio: {
    url: '/studio/',
    ready: () => document.body.dataset.ready === 'true',
    steps: [
      async () => {
        document.getElementById('st-new')?.click();
        document.getElementById('st-from-go')?.click();
        await new Promise(r => window.setTimeout(r, 2000));
      },
    ],
  },
};

async function main() {
  const server = await serveStatic({ root: ROOT, port: PORT });
  const browser = await chromium.launch();
  const names = wanted.length ? wanted : Object.keys(SESSIONS);
  console.log(`long animation frames (50 ms or more), cpu x${cpu}\n`);
  for (const name of names) {
    const session = SESSIONS[name];
    if (!session) throw new Error(`no session ${name}`);
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    if (cpu > 1) {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
    }
    await page.addInitScript(() => {
      window.__loaf = [];
      try {
        localStorage.setItem('gravitas_welcome_seen_v1', '1');
        new window.PerformanceObserver(list => {
          for (const e of list.getEntries()) {
            window.__loaf.push({
              at: Math.round(e.startTime),
              ms: Math.round(e.duration),
              scripts: e.scripts.map(s => ({
                ms: Math.round(s.duration),
                file: String(s.sourceURL).split('/').slice(-2).join('/'),
                fn: s.sourceFunctionName || s.invoker || '',
              })),
            });
          }
        }).observe({ type: 'long-animation-frame', buffered: true });
      } catch {
        /* no storage or no long-animation-frame support */
      }
    });
    await page.goto(`http://localhost:${PORT}${session.url}`);
    await page.waitForFunction(session.ready, null, { timeout: 30000 });
    for (const step of session.steps) await page.evaluate(step);
    const frames = await page.evaluate(() => window.__loaf);
    const worst = Math.max(0, ...frames.map(f => f.ms));
    console.log(`${name}: ${frames.length} long frames, worst ${worst} ms`);
    const marks = await page.evaluate(() => window.__marks || []);
    if (marks.length)
      console.log(`  steps at ms: ${marks.map(m => m.join(' ')).join(', ')}`);
    for (const f of frames.sort((a, b) => b.ms - a.ms).slice(0, 6)) {
      const top = f.scripts.sort((a, b) => b.ms - a.ms)[0];
      console.log(
        `  ${String(f.ms).padStart(5)} ms at ${String(f.at).padStart(6)}` +
          (top ? `  ${top.ms} ms ${top.file} ${top.fn}` : '')
      );
    }
    await page.close();
  }
  await browser.close();
  server.close();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
