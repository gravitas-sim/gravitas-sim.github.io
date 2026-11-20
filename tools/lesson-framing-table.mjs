#!/usr/bin/env node
// =============================================================================
// Measure how every lesson scene is framed, at three sizes, into a table
// -----------------------------------------------------------------------------
//   node tools/lesson-framing-table.mjs --origin http://127.0.0.1:4601 \
//        [--lessons a,b] [--language es] [--out table.json]
//
// One row per (scene step, size): where each bound body stands on screen, its
// drawn radius, whether it lies in the free region, the camera's zoom and the
// share of the free region the bound bodies span. tests/fixtures/
// lesson-framing-baseline.json is this output before the framing change, and
// lesson-framing-final.json after it. Serve the tree first
// (node tools/static-server.mjs --port 4601).
// =============================================================================

import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { INVESTIGATIONS } from '../js/data/investigations.js';
import {
  FRAMING_SIZES,
  byLesson,
  distinctScenes,
  measureLessons,
  sceneSteps,
  startPage,
} from './lesson-framing.mjs';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const origin = arg('origin', 'http://127.0.0.1:4601');
const only = arg('lessons', '').split(',').filter(Boolean);
const language = arg('language', 'en');
const out = arg('out', '');

const all = distinctScenes(sceneSteps(INVESTIGATIONS)).filter(
  e => !only.length || only.includes(e.lesson)
);
// --retry <table>: re-measure only the (step, size) pairs that failed there.
const before = arg('retry', '')
  ? JSON.parse(await readFile(arg('retry', ''), 'utf8'))
  : null;
const failedAt = before
  ? new Set(
      before.rows
        .filter(r => !r.pass)
        .map(r => `${r.size}|${r.lesson}|${r.sid}`)
    )
  : null;
const resumed =
  process.argv.includes('--resume') && out
    ? JSON.parse(await readFile(out, 'utf8').catch(() => '{"rows":[]}'))
    : null;
const rows = before ? [...before.rows] : resumed ? [...resumed.rows] : [];
const done = new Set(rows.map(r => `${r.size}|${r.lesson}|${r.sid}`));
const browser = await chromium.launch();
try {
  for (const size of FRAMING_SIZES.filter(
    z => !arg('size', '') || String(z.width) === arg('size', '')
  )) {
    const label = `${size.width}x${size.height}`;
    const entries = all.filter(e =>
      failedAt
        ? failedAt.has(`${label}|${e.lesson}|${e.sid}`)
        : !(resumed && done.has(`${label}|${e.lesson}|${e.sid}`))
    );
    if (!entries.length) continue;
    const page = await browser.newPage({
      viewport: { width: size.width, height: size.height },
    });
    page.on('pageerror', e => console.error('page error:', e.message));
    await startPage(page, origin, { language });
    let first = true;
    for (const [lesson, group] of byLesson(entries)) {
      if (!first) await startPage(page, origin, { language });
      first = false;
      for (const r of await measureLessons(page, group, { origin })) {
        const row = {
          lesson,
          sid: r.entry.sid,
          kind: r.entry.kind,
          scene: r.entry.scene,
          size: label,
          state: r.state,
          raisedPass: r.raised.pass,
          zoom: r.m.zoom,
          capped: r.m.capped,
          fill: r.m.fill,
          free: r.m.free,
          pass: r.pass,
          reasons: r.reasons,
          bodies: r.m.bodies.map(b => [
            b.role,
            b.x,
            b.y,
            b.drawnRadius,
            b.free ? 1 : 0,
          ]),
        };
        const at = rows.findIndex(
          x => x.size === label && x.lesson === lesson && x.sid === row.sid
        );
        if (at >= 0) rows[at] = row;
        else rows.push(row);
      }
      process.stderr.write(`${size.width} ${lesson}\n`);
      if (out)
        await writeFile(
          out,
          `${JSON.stringify({ language, rows }, null, 1)}\n`
        );
    }
    await page.close();
  }
} finally {
  await browser.close();
}
const failed = rows.filter(r => !r.pass);
console.log(
  `${rows.length} measurements, ${failed.length} fail, ${new Set(failed.map(r => `${r.lesson}/${r.sid}`)).size} steps`
);
for (const r of failed)
  console.log(`${r.size} ${r.lesson}/${r.sid} [${r.kind}] ${r.reasons[0]}`);
if (out)
  await writeFile(out, `${JSON.stringify({ language, rows }, null, 1)}\n`);
