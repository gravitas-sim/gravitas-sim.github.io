#!/usr/bin/env node
// =============================================================================
// Spike: what a fresh visitor downloads per route, and how long a lesson takes
// -----------------------------------------------------------------------------
// Disposable measurement for LAZY_CAPABILITIES_GATE.md. Serves a built dist/
// (node build.js) and loads each route in a new browser context - an empty
// HTTP cache every time - recording every JavaScript response and two times:
//
//   usable   navigation start to the lesson's first step on screen with its
//            title, or to window.splashScreenEnded for the non-lesson routes
//   tool     for a lesson with an instrument, pressing Next from the step
//            before its first instrument to that instrument being drawn (not
//            loading) - the moment a lazily loaded family is fetched
//
//   node spike/lazy-capabilities/route-probe.mjs <distDir> <port> [loads] [--json]
//
// Timings are only meaningful on a quiet machine; the byte counts are not
// timing and do not care.
// =============================================================================

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..'
);
const positional = process.argv.slice(2).filter(a => !a.startsWith('--'));
const [distDir, portArg, loadsArg] = positional;
// --no-sw: block the service worker, so what is counted is what the page
// itself asks for on the way to usable, not a background precache.
const NO_SW = process.argv.includes('--no-sw');
const PORT = Number(portArg || 4399);
const LOADS = Number(loadsArg || 7);
const BASE = `http://127.0.0.1:${PORT}`;

const ROUTES = [
  { name: 'front door', url: '/' },
  { name: 'sandbox scenario', url: '/?scenario=Solar%20System' },
  { name: "Kepler's Laws", url: '/#investigation=keplers-laws', lesson: true },
  {
    name: 'Transit Photometry',
    url: '/#investigation=transit-photometry',
    lesson: true,
    toolStep: 5,
  },
  {
    name: 'Power-Law Gravity',
    url: '/#investigation=power-law-gravity',
    lesson: true,
    toolStep: 3,
  },
  {
    name: 'A Universe of Stars (largest)',
    url: '/#investigation=a-universe-of-stars',
    lesson: true,
  },
  { name: 'teaching page', url: '/teaching/' },
  { name: 'evaluation page', url: '/evaluation/' },
  { name: 'instructor portal', url: '/instructors/' },
];

const server = spawn(
  process.execPath,
  [
    path.join(ROOT, 'tools/static-server.mjs'),
    '--root',
    path.resolve(distDir),
    '--port',
    String(PORT),
  ],
  { stdio: 'ignore' }
);
await new Promise(r => setTimeout(r, 800));

const median = xs => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor((s.length - 1) / 2)] : null;
};

const browser = await chromium.launch();
const results = [];
try {
  for (const route of ROUTES) {
    const runs = [];
    for (let i = 0; i < LOADS; i++) {
      const context = await browser.newContext({
        serviceWorkers: NO_SW ? 'block' : 'allow',
      });
      // A returning visitor's front-door dialog would change what loads.
      await context.addInitScript(() => {
        try {
          localStorage.setItem('gravitas_welcome_seen_v1', '1');
        } catch {
          /* fine */
        }
      });
      const page = await context.newPage();
      const js = [];
      page.on('response', async res => {
        const url = res.url();
        if (!url.startsWith(BASE) || !/\.m?js(\?|$)/.test(url)) return;
        try {
          js.push({
            url: url.slice(BASE.length),
            bytes: (await res.body()).length,
          });
        } catch {
          /* aborted by navigation; not counted */
        }
      });
      const t0 = Date.now();
      await page.goto(BASE + route.url, { waitUntil: 'domcontentloaded' });
      if (route.lesson) {
        await page.waitForFunction(
          () => {
            const panel = document.getElementById('investigationPanel');
            const title = document.getElementById('investigationTitle');
            return (
              panel &&
              !panel.hidden &&
              title &&
              title.textContent.trim().length > 0
            );
          },
          null,
          { timeout: 60_000 }
        );
      } else {
        await page
          .waitForFunction(
            () =>
              window.splashScreenEnded === true ||
              !document.getElementById('splashScreen'),
            null,
            {
              timeout: 60_000,
            }
          )
          .catch(() => {});
      }
      const usable = Date.now() - t0;
      const beforeTool = js.length;
      let tool = null;
      if (route.toolStep !== undefined) {
        for (let s = 0; s < route.toolStep - 1; s++)
          await page.locator('#investigationNext').click();
        await page.waitForTimeout(250);
        const t1 = Date.now();
        await page.locator('#investigationNext').click();
        await page.waitForFunction(
          () => {
            const panel = document.getElementById('investigationTool');
            const note = document.getElementById('investigationToolNote');
            return (
              panel &&
              !panel.hidden &&
              note &&
              note.getAttribute('role') !== 'status'
            );
          },
          null,
          { timeout: 60_000 }
        );
        tool = Date.now() - t1;
      }
      await page.waitForTimeout(500);
      runs.push({
        usable,
        tool,
        requests: js.length,
        bytes: js.reduce((n, r) => n + r.bytes, 0),
        lessonOpenBytes: js
          .slice(0, beforeTool)
          .reduce((n, r) => n + r.bytes, 0),
        files: js.map(r => r.url),
      });
      await context.close();
    }
    results.push({
      route: route.name,
      loads: runs.length,
      medianUsableMs: median(runs.map(r => r.usable)),
      medianToolMs:
        route.toolStep !== undefined ? median(runs.map(r => r.tool)) : null,
      jsRequests: median(runs.map(r => r.requests)),
      jsKb: Math.round(median(runs.map(r => r.bytes)) / 102.4) / 10,
      firstLoadFiles: runs[0].files,
    });
  }
} finally {
  await browser.close();
  server.kill();
}

if (process.argv.includes('--json')) {
  process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
} else {
  for (const r of results) {
    console.log(
      `${r.route.padEnd(30)} JS ${String(r.jsKb).padStart(7)} KB in ${String(r.jsRequests).padStart(3)} requests  usable ${String(r.medianUsableMs).padStart(5)} ms${r.medianToolMs !== null ? `  tool ${r.medianToolMs} ms` : ''}`
    );
  }
}
