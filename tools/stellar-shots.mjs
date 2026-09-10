#!/usr/bin/env node
// =============================================================================
// Captures of the Stellar Lab
// -----------------------------------------------------------------------------
// Development only.
//
//   node tools/stellar-shots.mjs --out shots/stellar
//
// The same trick as tools/gw-shots.mjs, for the same reason: the lab draws into
// a lesson panel's canvas, so seeing it outside a lesson means mounting it on
// one. Everything that could differ between two runs is pinned - the track, the
// age, the cursor, the population seed - so two runs are comparable pictures.
//
// The comparison stage reads the lab's pinned list rather than its own values,
// so the shots that want stars in it pin them first, through the widget's own
// action rather than by reaching into the module.
// =============================================================================

import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveStatic } from './static-server.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8131;

/** Every picture worth having, and what it is of. */
const SHOTS = [
  { id: 'hr-sun', track: 'm100', age: 0.947, spec: { regions: true } },
  {
    id: 'hr-guides',
    track: 'm100',
    age: 0.947,
    spec: { regions: true, guides: true },
  },
  { id: 'hr-giant', track: 'm100', age: 0.999, spec: { regions: true } },
  { id: 'hr-massive', track: 'm2000', age: 0.9, spec: { regions: true } },
  {
    id: 'hr-free',
    spec: { mode: 'free', regions: true },
    teff: 4500,
    lum: 100,
  },
  {
    id: 'compare-true',
    widget: 'stellar-compare',
    pin: [
      ['m020', 0.9],
      ['m100', 0.947],
      ['m500', 0.9],
      ['m2000', 0.9],
    ],
    values: { size: 0, order: 0, sun: 1 },
  },
  {
    id: 'compare-fit',
    widget: 'stellar-compare',
    pin: [
      ['m020', 0.9],
      ['m100', 0.947],
      ['m500', 0.9],
      ['m2000', 0.9],
    ],
    values: { size: 1, order: 0, sun: 1 },
  },
  {
    id: 'compare-supergiant',
    widget: 'stellar-compare',
    pin: [
      ['m100', 0.947],
      ['m2000', 1],
    ],
    values: { size: 0, order: 0, sun: 1 },
  },
  {
    id: 'population-all',
    widget: 'stellar-population',
    values: { view: 0, threshold: -4 },
  },
  {
    id: 'population-bright',
    widget: 'stellar-population',
    values: { view: 1, threshold: -4 },
  },
  // The three the lesson opens on, and the pair it turns on.
  {
    id: 'lesson-opening-trio',
    widget: 'stellar-compare',
    spec: {
      pace: 'phase',
      anonymous: true,
      pins: [
        { track: 'm020' },
        { track: 'm500' },
        { track: 'm100', ageYr: 1.129e10 },
      ],
    },
    values: { size: 0, order: 0, sun: 0 },
  },
  {
    id: 'lesson-trio-revealed',
    widget: 'stellar-compare',
    spec: {
      pace: 'phase',
      pins: [
        { track: 'm020' },
        { track: 'm500' },
        { track: 'm100', ageYr: 1.129e10 },
      ],
    },
    values: { size: 0, order: 0, sun: 0 },
  },
  // The evolutionary playback, at the moments worth having a picture of.
  {
    id: 'evol-sun-main-sequence',
    widget: 'stellar-evolution',
    spec: { interior: true },
    track: 'm100',
    values: { position: 0.1 },
  },
  {
    id: 'evol-sun-giant',
    widget: 'stellar-evolution',
    spec: { interior: true },
    track: 'm100',
    values: { position: 0.2 },
  },
  {
    id: 'evol-sun-white-dwarf',
    widget: 'stellar-evolution',
    spec: { interior: false },
    track: 'm100',
    values: { position: 1 },
  },
  {
    id: 'evol-cloud',
    widget: 'stellar-evolution',
    spec: {},
    track: 'm100',
    values: { position: 0.02 },
  },
  {
    id: 'evol-neutron-star',
    widget: 'stellar-evolution',
    spec: {},
    track: 'm1000',
    values: { position: 1 },
  },
  {
    id: 'evol-black-hole',
    widget: 'stellar-evolution',
    spec: {},
    track: 'm4000',
    values: { position: 1 },
  },
  {
    id: 'evol-uncertain',
    widget: 'stellar-evolution',
    spec: {},
    track: 'm2000',
    values: { position: 1 },
  },
  {
    id: 'lesson-two-reds',
    widget: 'stellar-compare',
    spec: {
      pace: 'phase',
      pins: [{ track: 'm020' }, { track: 'm100', at: 0.206 }],
    },
    values: { size: 0, order: 0, sun: 0 },
  },
];

const args = process.argv.slice(2);
const outArg = args.indexOf('--out');
const OUT = resolve(ROOT, outArg >= 0 ? args[outArg + 1] : 'shots/stellar');

const server = await serveStatic({ root: ROOT, port: PORT });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 640, height: 1000 } });
const problems = [];
page.on('pageerror', e => problems.push(`page error: ${e.message}`));
page.on('console', m => {
  if (m.type() === 'error') problems.push(`console: ${m.text()}`);
});

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' });
await page.waitForFunction(() => document.readyState === 'complete');
await mkdir(OUT, { recursive: true });

for (const shot of SHOTS) {
  const rect = await page.evaluate(async spec => {
    document.getElementById('stellarShot')?.remove();
    const host = document.createElement('div');
    host.id = 'stellarShot';
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

    const stepSpec = { capture: false, ...(spec.spec || {}) };
    const w = getWidget(spec.widget || 'stellar-lab');

    // Anything pinned is pinned through the lab widget, the way a student
    // would, so the comparison stage sees exactly what a lesson would give it.
    if (spec.pin) {
      const labW = getWidget('stellar-lab');
      const lv = widgetDefaults(labW, {});
      labW.reset(lv, { autorun: false, spec: { capture: false } });
      // Through the widget's own action: the pinned list lives in the lab
      // module, and clearing a freshly created one clears the wrong lab.
      getWidget('stellar-compare').act('clear', {}, {});
      const { TRACK_IDS } = await import('/js/data/stellar/mistTracks.js');
      for (const [track, age] of spec.pin) {
        lv.track = TRACK_IDS.indexOf(track);
        lv.age = age;
        labW.act('pin', lv, { capture: false });
      }
    }

    const values = widgetDefaults(w, {});
    Object.assign(values, spec.values || {});
    if (spec.track) {
      const { TRACK_IDS } = await import('/js/data/stellar/mistTracks.js');
      values.track = TRACK_IDS.indexOf(spec.track);
    }
    if (spec.age !== undefined) values.age = spec.age;
    if (spec.teff) values.teff = Math.log10(spec.teff);
    if (spec.lum) values.lum = Math.log10(spec.lum);

    // reset() re-seats the instrument from the step's spec, and choosing a
    // different star restarts an evolutionary playback. The values are the
    // point of the shot, so they go on afterwards and the draw follows them.
    w.reset?.(values, { autorun: false, spec: stepSpec });
    Object.assign(values, spec.values || {});
    if (spec.track) {
      const { TRACK_IDS } = await import('/js/data/stellar/mistTracks.js');
      values.track = TRACK_IDS.indexOf(spec.track);
      w.reset?.(values, { autorun: false, spec: stepSpec });
      Object.assign(values, spec.values || {});
    }
    if (spec.age !== undefined) values.age = spec.age;
    if (spec.teff) values.teff = Math.log10(spec.teff);
    if (spec.lum) values.lum = Math.log10(spec.lum);
    w.draw(canvas, values, undefined, stepSpec);
    rows.innerHTML = w
      .readout(values, undefined, stepSpec)
      .map(r => `<div><b>${r.label}</b>: ${r.value}</div>`)
      .join('');

    const box = host.getBoundingClientRect();
    return { x: box.x, y: box.y, width: box.width, height: box.height };
  }, shot);

  const buf = await page.screenshot({ clip: rect });
  await writeFile(join(OUT, `${shot.id}.png`), buf);
  console.log(`  ${shot.id}.png`);
}

await browser.close();
await server.close();
if (problems.length) {
  console.error(`\n${problems.length} page problem(s):`);
  for (const p of [...new Set(problems)]) console.error(`  ${p}`);
  process.exitCode = 1;
}
console.log(`\nWrote ${SHOTS.length} captures to ${OUT}`);
