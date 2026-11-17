#!/usr/bin/env node
// =============================================================================
// Where do instruments open? Three lists over the catalog
// -----------------------------------------------------------------------------
//   node tools/neutral-start-report.mjs           counts per lesson, three lists
//   node tools/neutral-start-report.mjs --steps   and every step by sid
//   node tools/neutral-start-report.mjs --json    the same as JSON
//
// Runs tools/authoring/neutralStart.mjs over every core find-or-set step of the
// catalog: opens at the answer, neutral, or unmapped (a step whose fields no
// reviewed readout fills; never counted as fine). Steps that say `prepared:
// true` are listed apart. Nothing is changed or recorded here: the pilots and
// the batches fix their own steps.
// =============================================================================

import {
  isFindOrSet,
  judgeOpening,
  loadMap,
} from './authoring/neutralStart.mjs';

const LISTS = ['opens-at-answer', 'neutral', 'unmapped', 'prepared'];

/** Every core find-or-set step, judged: `{ lesson, sid, verdict, reason }`. */
export function judgeCatalog(inputs, map = loadMap()) {
  const out = [];
  for (const inv of inputs.investigations)
    for (const step of inv.steps) {
      if ((step.depth ?? 'core') !== 'core' || !isFindOrSet(step)) continue;
      const widget = inputs.widgets.find(w => w.id === step.tool.id);
      const r = judgeOpening(step, widget, map[`${inv.id}/${step.sid}`]);
      out.push({ lesson: inv.id, sid: step.sid, ...r });
    }
  return out;
}

/** `{ list: { lesson: [sid, ...] } }`. */
export function group(judged) {
  const out = Object.fromEntries(LISTS.map(l => [l, {}]));
  for (const j of judged) (out[j.verdict][j.lesson] ??= []).push(j.sid);
  return out;
}

async function main() {
  const argv = process.argv.slice(2);
  const { loadAuthoringInputs } = await import('./authoring/inputs.mjs');
  const judged = judgeCatalog(await loadAuthoringInputs());
  const lists = group(judged);
  if (argv.includes('--json')) {
    console.log(JSON.stringify(lists, null, 2));
    return;
  }
  console.log(`${judged.length} core find-or-set steps judged.`);
  for (const list of LISTS) {
    const byLesson = lists[list];
    const n = Object.values(byLesson).reduce((a, s) => a + s.length, 0);
    console.log(
      `\n${list}: ${n} step(s) in ${Object.keys(byLesson).length} lesson(s)`
    );
    for (const [lesson, sids] of Object.entries(byLesson).sort())
      console.log(
        `  ${lesson}: ${sids.length}${argv.includes('--steps') ? `  ${sids.join(', ')}` : ''}`
      );
  }
}

import { fileURLToPath } from 'node:url';
if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
