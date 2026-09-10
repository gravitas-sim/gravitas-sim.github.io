#!/usr/bin/env node
// =============================================================================
// Captures of the black holes
// -----------------------------------------------------------------------------
// Development only.
//
//   node tools/blackhole-shots.mjs --out shots/bh
//
// Loads the application, puts one scenario on screen, parks the camera and
// takes the same shot at several zooms. Written to run unchanged against an
// older checkout so that a before/after pair is the same scene twice rather
// than two different scenes: it drives the scenario picker and the zoom, both
// of which have been there all along, and touches nothing this pass added.
//
// The simulation is paused for every shot, which is the point of one of the
// checks: the picture must not depend on when the screenshot was taken.
// =============================================================================

import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveStatic } from './static-server.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8133;

/**
 * Every picture worth having.
 *
 * `framings` are the fraction of the viewport's height the black hole's drawn
 * radius should take up, not raw zoom levels: the drawn radius varies by three
 * orders of magnitude between a stellar-mass hole and a supermassive one, so a
 * fixed zoom shows a dot in one scenario and the inside of the horizon in
 * another. Framing by the object is what makes the same three shots comparable
 * across scenarios and across the before/after pair.
 */
const SHOTS = [
  { id: 'quiescent', scenario: 'Stellar Graveyard', framings: [0.02, 0.12] },
  { id: 'accreting', scenario: 'Black Hole Lab', framings: [0.02, 0.06, 0.16] },
  { id: 'jets', scenario: 'Quasar Cannon', framings: [0.02, 0.06, 0.16] },
  { id: 'merger', scenario: 'GW150914', framings: [0.03, 0.1] },
  { id: 'agn', scenario: 'Galactic Center', framings: [0.08] },
];

const args = process.argv.slice(2);
const outArg = args.indexOf('--out');
const OUT = resolve(ROOT, outArg >= 0 ? args[outArg + 1] : 'shots/bh');
const tagArg = args.indexOf('--tag');
const TAG = tagArg >= 0 ? args[tagArg + 1] : '';

const server = await serveStatic({ root: ROOT, port: PORT });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 640 } });
const problems = [];
page.on('pageerror', e => problems.push(`page error: ${e.message}`));

// The welcome layer has to be gone before anything is captured: it is drawn
// over the canvas, and a screenshot of the canvas element still catches it.
// Setting the flag has to happen before the load that renders it, so this
// loads once to get an origin, sets the flag, and loads again.
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.evaluate(() =>
  localStorage.setItem('gravitas_welcome_seen_v1', '1')
);
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => document.readyState === 'complete');
await page.waitForTimeout(1500);
await page.evaluate(() => document.getElementById('welcomeClose')?.click());
await page.waitForTimeout(500);
await page
  .locator('#welcomeOverlay')
  .waitFor({ state: 'hidden', timeout: 5000 })
  .catch(() => {});
await mkdir(OUT, { recursive: true });

for (const shot of SHOTS) {
  for (const framing of shot.framings) {
    await page.evaluate(
      async ({ scenario, framing: f }) => {
        const ui = await import('/js/ui.js');
        const state = await import('/js/appState.js');
        // The application's own entry point, so the scenario is built exactly
        // as a reader's click would build it.
        ui.loadScenarioByKey(scenario);
        // Centre on a black hole rather than on the origin: at a close zoom
        // the origin is often empty sky, and a screenshot of empty sky proves
        // nothing about how a black hole is drawn.
        const sim = await import('/js/physics.js');
        const holes = sim.bh_list || [];
        const at = holes.length ? holes[0].pos : { x: 0, y: 0 };
        const drawn = holes.length ? holes[0].radius : 30;
        const canvas = document.getElementById('simulationCanvas');
        const height = canvas.clientHeight || window.innerHeight || 640;
        state.state.zoom = (f * height) / drawn;
        state.state.pan = { x: -at.x, y: -at.y };
        state.state.paused = true;
        state.SETTINGS.paused = true;
      },
      { scenario: shot.scenario, framing }
    );
    await page.waitForTimeout(700);
    const canvas = await page.locator('#simulationCanvas');
    const buf = await canvas.screenshot();
    const name = `${TAG ? TAG + '-' : ''}${shot.id}-f${String(framing).replace('.', '_')}.png`;
    await writeFile(join(OUT, name), buf);
    console.log(`  ${name}`);
  }
}

await browser.close();
await server.close();
if (problems.length) {
  console.error(`\n${problems.length} page problem(s):`);
  for (const p of [...new Set(problems)]) console.error(`  ${p}`);
  process.exitCode = 1;
}
console.log(`\nWrote captures to ${OUT}`);
