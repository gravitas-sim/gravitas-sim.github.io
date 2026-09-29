#!/usr/bin/env node
// =============================================================================
// The mission lab's answer key: a reference run of every guide
// -----------------------------------------------------------------------------
// Plays the three guides of js/mission/lab/curriculum.js on both paths as a
// reader would: from the lab's default plan, doing each "do" step the way its
// `go` says, computing the mission and the window as the Worker does
// (js/mission/solar.js, js/mission/window.js on the ephemeris pack), and
// recording what each checked step expects. tests/missionLab.test.js holds
// the committed key to a fresh run.
//
//   node tools/mission-lab-key.mjs            the key, as a table
//   node tools/mission-lab-key.mjs --write    and write js/data/missionLabKey.js
// =============================================================================

import { writeFileSync } from 'node:fs';
import process from 'node:process';
import { PACK, DATA } from '../js/data/ephemeris/solarSystem2025.js';
import { createEphemeris } from '../js/mission/ephemeris.js';
import { DEFAULT_PLAN, computeMission, statesFrom } from '../js/mission/solar.js';
import { computeWindow } from '../js/mission/window.js';
import { GUIDES, correctOption, stepsOn } from '../js/mission/lab/curriculum.js';

const OUT = 'js/data/missionLabKey.js';
const eph = createEphemeris(PACK, DATA);
const clone = x => JSON.parse(JSON.stringify(x));

/** Apply a step's `go` as the page does: a plan patch, or a window to compute. */
function apply(state, patch) {
  const { window: w, ...planPatch } = patch;
  if (w) state.window = computeWindow({ ...w, fromAltitude: state.plan.depot.altitude, toAltitude: state.plan.arrive.periapsisAltitude }, { states: statesFrom(eph) });
  if (Object.keys(planPatch).length) {
    state.plan = { ...state.plan, ...clone(planPatch) };
    state.mission = computeMission(eph, state.plan);
  }
}

/** Play every guide on one path, in order, from the default plan. */
export function referenceRun(path) {
  const state = { plan: clone(DEFAULT_PLAN), mission: null, window: null };
  state.mission = computeMission(eph, state.plan);
  const rows = [];
  for (const g of GUIDES) {
    for (const s of stepsOn(g, path)) {
      if (s.kind === 'do') apply(state, s.go(state));
      const row = { guide: g.id, path, step: s.id, kind: s.kind, expected: null };
      if (s.kind === 'answer') {
        row.expected = Number(s.answer(state).toPrecision(6));
        row.tolerance = s.tolerance;
        row.unit = s.unit;
      }
      if (s.kind === 'choose') row.expected = correctOption(s, state);
      if (s.kind === 'do') row.passed = !!s.check(state);
      rows.push(row);
    }
  }
  return rows;
}

const key = [...referenceRun('intro'), ...referenceRun('advanced')];
const failedDo = key.filter(r => r.kind === 'do' && !r.passed);
if (failedDo.length) {
  console.error(`A "do" step's own go does not pass its check: ${failedDo.map(r => `${r.guide}/${r.step}`).join(', ')}`);
  process.exit(1);
}
if (process.argv.includes('--write')) {
  const rows = key.map(({ passed: _p, ...r }) => r);
  const source = `// Written by \`npm run mission:key -- --write\` from a reference run of every\n// guide (tools/mission-lab-key.mjs). Do not edit by hand;\n// tests/missionLab.test.js fails when it is stale.\n\nexport const MISSION_LAB_KEY = ${JSON.stringify(rows, null, 2)};\n`;
  const prettier = await import('prettier');
  const options = (await prettier.resolveConfig(OUT)) || {};
  writeFileSync(OUT, await prettier.format(source, { ...options, filepath: OUT }));
  console.log(`Wrote ${OUT}: ${rows.length} rows.`);
} else {
  for (const r of key)
    console.log(`${r.path.padEnd(8)} ${r.guide.padEnd(10)} ${r.step.padEnd(11)} ${r.kind.padEnd(8)} ${r.expected ?? ''}${r.tolerance !== undefined ? ` ± ${r.tolerance} ${r.unit}` : ''}`);
}
