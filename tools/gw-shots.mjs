#!/usr/bin/env node
// =============================================================================
// Captures of the gravitational-wave lab
// -----------------------------------------------------------------------------
// Development only.
//
//   node tools/gw-shots.mjs --out shots/gw
//
// The lab draws into a lesson panel's canvas, so the only way to see it outside
// a lesson is to mount it on one. This does that: it loads the site, makes a
// canvas of a panel's width, imports the widget family, and draws each view of
// each preset at a fixed point on the timeline. Everything that could differ
// between two runs is pinned - the parameters, the cursor position, the noise
// seed - so two runs of this are comparable pictures rather than two moments.
// =============================================================================

import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveStatic } from './static-server.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8129;

/** Every picture worth having, and what it is of. */
const SHOTS = [
  { id: 'bbh-signal', preset: 'bbh', view: 'signal', cursor: 0.72 },
  { id: 'bbh-source', preset: 'bbh', view: 'source', cursor: 0.72 },
  { id: 'bbh-both', preset: 'bbh', view: 'both', cursor: 0.72 },
  { id: 'bbh-noise', preset: 'bbh', view: 'signal', cursor: 0.72, noise: true },
  { id: 'bns-signal', preset: 'bns', view: 'signal', cursor: 0.6 },
  { id: 'bns-source', preset: 'bns', view: 'source', cursor: 0.6 },
  { id: 'nsbh-both', preset: 'nsbh', view: 'both', cursor: 0.55 },
  {
    id: 'distant',
    preset: 'bbh',
    view: 'signal',
    cursor: 0.72,
    distance: 1200,
  },
  { id: 'edge-on', preset: 'bbh', view: 'both', cursor: 0.72, inclination: 90 },
  {
    id: 'real-detectors',
    widget: 'gw-real',
    mode: 'detectors',
    values: { shift: 0, invert: 0 },
  },
  {
    id: 'real-aligned',
    widget: 'gw-real',
    mode: 'detectors',
    values: { shift: 6.9, invert: 1 },
  },
  {
    id: 'real-reconstruction',
    widget: 'gw-real',
    mode: 'reconstruction',
    values: { shift: 0, invert: 0 },
  },
];

const args = process.argv.slice(2);
const outArg = args.indexOf('--out');
const OUT = resolve(ROOT, outArg >= 0 ? args[outArg + 1] : 'shots/gw');

const server = await serveStatic({ root: ROOT, port: PORT });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 640, height: 900 } });
page.on('pageerror', e => console.error('page error:', e.message));

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => document.readyState === 'complete');
await mkdir(OUT, { recursive: true });

for (const shot of SHOTS) {
  const rect = await page.evaluate(async spec => {
    document.getElementById('gwShot')?.remove();
    const host = document.createElement('div');
    host.id = 'gwShot';
    host.style.cssText =
      'position:fixed;left:20px;top:20px;width:460px;z-index:99999;' +
      'background:var(--surface-1,#12151c);padding:10px;border-radius:8px;';
    const canvas = document.createElement('canvas');
    canvas.style.width = '440px';
    host.appendChild(canvas);
    const rows = document.createElement('div');
    rows.style.cssText =
      'font:11px ui-monospace,Menlo,monospace;color:#c9d1e0;margin-top:8px;';
    host.appendChild(rows);
    document.body.appendChild(host);

    const [{ getWidget, widgetDefaults }, { ensureDeferredMessages }] =
      await Promise.all([
        import('/js/widgets.js'),
        import('/js/i18n/deferredMessages.js'),
      ]);
    await ensureDeferredMessages();
    const w = getWidget(spec.widget || 'gw-lab');
    const values = widgetDefaults(w, {});
    if (spec.widget === 'gw-real') {
      Object.assign(values, spec.values || {});
      w.draw(canvas, values, undefined, { mode: spec.mode });
      rows.innerHTML = w
        .readout(values, undefined, { mode: spec.mode })
        .map(r => `<div>${r.label}: ${r.value}</div>`)
        .join('');
    } else {
      const { PRESETS } = await import('/js/gwLab.js');
      const p = PRESETS.find(x => x.id === spec.preset);
      Object.assign(values, {
        m1: p.m1,
        m2: p.m2,
        distance: spec.distance ?? p.distanceMpc,
        inclination: spec.inclination ?? p.inclinationDeg,
        cursor: spec.cursor,
      });
      const stepSpec = {
        preset: spec.preset,
        view: spec.view,
        noise: Boolean(spec.noise),
        autoplay: false,
      };
      w.reset(values, { autorun: false, spec: stepSpec });
      w.draw(canvas, values, undefined, stepSpec);
      rows.innerHTML = w
        .readout(values, undefined, stepSpec)
        .map(r => `<div>${r.label}: ${r.value}</div>`)
        .join('');
    }
    const box = host.getBoundingClientRect();
    return { x: box.x, y: box.y, width: box.width, height: box.height };
  }, shot);

  const buf = await page.screenshot({ clip: rect });
  await writeFile(join(OUT, `${shot.id}.png`), buf);
  console.log(`  ${shot.id}.png`);
}

await browser.close();
await server.close();
console.log(`\nWrote ${SHOTS.length} captures to ${OUT}`);
