#!/usr/bin/env node
// =============================================================================
// Label size and overlap on each scenario the lessons load and on the stage lessons
// -----------------------------------------------------------------------------
//   node tools/lesson-framing-legibility.mjs --origin http://127.0.0.1:4603 [--out file.json]
//
// Runs the label judge of tools/visual-criteria.mjs (11 CSS px floor, no
// overlap) once on the first step of each of the scenarios lessons load by
// `setup`, and on one step of Weighing the Stars, Black Holes and the two
// gravitational-wave lessons, at a laptop and a phone size. A failure that
// belongs to the label drawing is reported, not fixed here.
// =============================================================================

import { writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { INVESTIGATIONS } from '../js/data/investigations.js';
import {
  installCanvasTextRecorder,
  judgeLabels,
  readMainCanvasLabels,
} from './visual-criteria.mjs';
import { openStepInPage, sceneSteps, startPage } from './lesson-framing.mjs';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const origin = arg('origin', 'http://127.0.0.1:4603');
const out = arg('out', '');

const list = sceneSteps(INVESTIGATIONS);
const targets = [];
const seen = new Set();
for (const e of list)
  if (e.kind === 'setup' && !seen.has(e.scene)) {
    seen.add(e.scene);
    targets.push({ ...e, label: `scenario ${e.scene}` });
  }
for (const [lesson, kind] of [
  ['weighing-stars', 'engine-stage'],
  ['black-holes', 'engine-stage'],
  ['what-is-a-gravitational-wave', 'model-stage'],
  ['listening-to-spacetime', 'model-stage'],
]) {
  const e = list.find(x => x.lesson === lesson && x.kind === kind);
  if (e) targets.push({ ...e, label: `stage ${lesson}` });
}

const sizes = [
  { width: 1280, height: 800 },
  { width: 375, height: 812 },
];
const rows = [];
const browser = await chromium.launch();
try {
  for (const size of sizes) {
    const page = await browser.newPage({ viewport: size });
    await page.addInitScript(installCanvasTextRecorder);
    for (const t of targets) {
      await startPage(page, origin);
      await openStepInPage(page, t.lesson, t.sid);
      await page.waitForTimeout(800);
      const r = await page.evaluate(readMainCanvasLabels);
      const v = judgeLabels(r.bodyLabels);
      rows.push({
        what: t.label,
        step: `${t.lesson}/${t.sid}`,
        size: `${size.width}x${size.height}`,
        labels: v.count,
        smallest: v.smallest === null ? null : Math.round(v.smallest * 10) / 10,
        small: v.small.slice(0, 3),
        overlaps: v.overlaps.slice(0, 3),
        pass: v.pass,
      });
    }
    await page.close();
  }
} finally {
  await browser.close();
}
const failed = rows.filter(r => !r.pass);
console.log(`${rows.length} readings, ${failed.length} fail`);
for (const r of failed)
  console.log(
    `${r.size} ${r.what} (${r.step}): ${r.labels} labels, smallest ${r.smallest}, small ${r.small.length}, overlaps ${r.overlaps.length}`
  );
if (out) await writeFile(out, `${JSON.stringify({ rows }, null, 1)}\n`);
