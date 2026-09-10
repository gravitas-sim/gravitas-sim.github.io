#!/usr/bin/env node
// =============================================================================
// What a black hole costs to draw
// -----------------------------------------------------------------------------
// Development only.
//
//   node tools/blackhole-profile.mjs [port] [tag]
//
// Loads four representative scenes, frames the camera on the first hole in
// each, and times BlackHole.draw() over two hundred calls after a warm-up.
// Written to run unchanged against an older checkout, so a before/after pair
// is the same measurement twice: it touches only the scenario loader, the
// camera and the object's own draw method, all of which predate this tool.
//
// It times the black-hole drawing specifically rather than the whole frame,
// because the whole frame is dominated by the starfield and the trails and
// would hide a factor of seven in the thing being measured.
// =============================================================================

import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveStatic } from './static-server.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.argv[2] || 8137);
const TAG = process.argv[3] || '';
const SCENES = [
  'Quasar Cannon',
  'Black Hole Lab',
  'GW150914',
  'Triple BH System',
];

const server = await serveStatic({ root: ROOT, port: PORT });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 640 } });
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.evaluate(() =>
  localStorage.setItem('gravitas_welcome_seen_v1', '1')
);
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForTimeout(1800);
await page.evaluate(() => document.getElementById('welcomeClose')?.click());

for (const scene of SCENES) {
  const ms = await page.evaluate(async name => {
    const ui = await import('/js/ui.js');
    const state = await import('/js/appState.js');
    const sim = await import('/js/physics.js');
    ui.loadScenarioByKey(name);
    const bh = sim.bh_list[0];
    const c = document.getElementById('simulationCanvas');
    state.state.zoom = (0.12 * (c.clientHeight || 640)) / bh.radius || 1;
    state.state.pan = { x: -bh.pos.x, y: -bh.pos.y };
    await new Promise(r => window.setTimeout(r, 700));
    const g = c.getContext('2d');
    const holes = sim.bh_list;
    for (let i = 0; i < 20; i++) for (const h of holes) h.draw(g);
    const t0 = performance.now();
    const N = 200;
    for (let i = 0; i < N; i++) for (const h of holes) h.draw(g);
    return (performance.now() - t0) / N;
  }, scene);
  console.log(
    `${TAG.padEnd(7)} ${scene.padEnd(20)} ${ms.toFixed(3)} ms/frame (all holes)`
  );
}

await browser.close();
await server.close();
