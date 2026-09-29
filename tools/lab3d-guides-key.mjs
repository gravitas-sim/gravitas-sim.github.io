#!/usr/bin/env node
// =============================================================================
// The 3-D curriculum's answer key: a reference run of every guide
// -----------------------------------------------------------------------------
// Plays every guide of js/lab3d/guides/curriculum.js on both paths the way a
// reader would, through a stand-in for the page's labApi (js/lab3dLab.js):
// the same systems, the same tick (js/lab3d/view/tick.js), the same live
// sessions (js/lab3d/live.js) and the same answer functions, and records
// what passes each step. The page checks each reader against their own lab,
// not against this key; the key is what an instructor reads, and what
// tests/lab3dGuides.test.js holds the guides to.
//
//   node tools/lab3d-guides-key.mjs            the key, as a table
//   node tools/lab3d-guides-key.mjs --json     the key, as JSON
//   node tools/lab3d-guides-key.mjs --write    and write js/data/lab3dAnswerKey.js
// =============================================================================

import { writeFileSync } from 'node:fs';
import * as prettier from 'prettier';
import process from 'node:process';
import { REFERENCES } from '../js/lab3d/references.js';
import { createLive, restartFrom } from '../js/lab3d/live.js';
import { gravityOf } from '../js/lab3d/state.js';
import { chooseInterval } from '../js/lab3d/view/tick.js';
import { elementsAbout, hierarchy } from '../js/lab3d/view/instruments.js';
import {
  ANSWERS,
  GUIDES,
  TARGETS,
  context,
  correctOption,
  evaluateCheck,
  record,
} from '../js/lab3d/guides/curriculum.js';
import { stepsOn } from '../js/observatory/guides/core.js';

const OUT = 'js/data/lab3dAnswerKey.js';

/** The page's labApi, played in Node: no DOM, no Worker, the same numbers. */
function standIn() {
  let id = null;
  let system = null;
  let session = null;
  let snap = null;
  let t0 = 0;
  let interval = 0;
  const controls = {
    preset: 'oblique',
    frame: 'barycentric',
    projection: 'perspective',
    follow: '-1',
    size: 'marker',
    tool: 'none',
    a: '0',
    b: '1',
    v: '0',
    speed: '1',
  };
  return {
    read: () => ({
      system: id,
      ids: system ? system.bodies.map(b => b.id) : [],
      ...controls,
      playing: false,
      tau: snap ? snap.t : 0,
      t0,
    }),
    exact: () =>
      snap && { t: snap.t, m: snap.m, x: snap.x, v: snap.v, alive: snap.alive },
    G: () => (system ? gravityOf(system) : 1),
    open(target) {
      const t = TARGETS[target];
      system = t.make
        ? t.make()
        : REFERENCES.find(r => r.id === t.reference).make().system;
      interval = t.interval || chooseInterval(system);
      const made = createLive(system, { interval });
      if (made.problems) throw new Error(`${target}: ${made.problems[0].code}`);
      session = made.session;
      snap = session.now();
      t0 = snap.t;
      id = target;
    },
    set(name, value) {
      controls[name] = String(value);
    },
    advance(k) {
      snap = session.advance(k);
      // As the page does: a full-length session with every body there goes
      // on from its own numbers.
      if (snap.status === 'ok' && snap.alive.every(Boolean)) {
        system = restartFrom(system, snap);
        session = createLive(system, {
          interval: chooseInterval(system),
        }).session;
        snap = session.now();
      }
      return snap;
    },
  };
}

/** Apply a step's `go` as the runner does (js/lab3d/view/guidePanel.js). */
function go(lab, s) {
  if (s.go?.open && lab.read().system !== s.go.open) lab.open(s.go.open);
  const ids = lab.read().ids;
  for (const [name, value] of Object.entries(s.go?.set || {})) {
    let v = value;
    if (['a', 'b', 'v', 'follow'].includes(name))
      v = String(ids.indexOf(value));
    if (name === 'frame' && value.startsWith('body:'))
      v = `body:${ids.indexOf(value.slice(5))}`;
    lab.set(name, v);
  }
}

/** The particle's eccentricity about its primary, in the frame now. */
function eccentricity(lab, bodyId) {
  const f = { ...lab.exact(), ids: lab.read().ids };
  const i = f.ids.indexOf(bodyId);
  const p = hierarchy(f).primary[i];
  return elementsAbout(f, i, p, lab.G()).e;
}

/**
 * Play until a `do` step's check can pass, as a reader would: through an
 * orbit for `played`; for a record step with a threshold, to the first peak
 * of the quantity above it, kept at the largest value seen.
 */
function playFor(lab, s, records) {
  const c = s.check;
  if (c.kind === 'played') {
    for (
      let n = 0;
      n < 10000 && !evaluateCheck(c, context(lab, records), s);
      n++
    )
      lab.advance(64);
    return;
  }
  if (!s.record) return;
  if (!c.atLeast) {
    records[s.id] = record(lab);
    return;
  }
  let best = -Infinity;
  let kept = null;
  for (let n = 0; n < 200000; n++) {
    lab.advance(256);
    const e = eccentricity(lab, c.body);
    if (e > best) {
      best = e;
      kept = record(lab);
    } else if (best >= c.atLeast && e < best - 0.02) break;
  }
  records[s.id] = kept;
}

/**
 * One run per guide, on the advanced path, which only adds steps that do not
 * change the lab: the introductory path's rows are its shared steps.
 */
export function referenceRun() {
  const rows = [];
  for (const g of GUIDES) {
    const lab = standIn();
    const records = {};
    const byStep = new Map();
    for (const s of stepsOn(g, 'advanced')) {
      const row = { guide: g.id, step: s.id, kind: s.kind };
      if (s.kind === 'do') {
        go(lab, s);
        playFor(lab, s, records);
        row.passes = evaluateCheck(s.check, context(lab, records), s);
        row.expected = null;
        if (s.record && records[s.id])
          row.t = Number(records[s.id].t.toPrecision(6));
      } else if (s.kind === 'answer') {
        const v = ANSWERS[s.expect.answer](context(lab, records));
        row.expected = v === null ? null : Number(v.toPrecision(6));
        row.tolerance = s.expect.tolerance;
        row.passes = v !== null;
      } else if (s.kind === 'choose') {
        row.expected = correctOption(s, context(lab, records));
        row.passes = s.correct === null ? null : row.expected !== null;
      } else {
        row.expected = null;
        row.passes = null;
      }
      byStep.set(s.id, row);
    }
    for (const path of ['intro', 'advanced'])
      for (const s of stepsOn(g, path)) {
        const { guide, step, ...rest } = byStep.get(s.id);
        rows.push({ guide, path, step, ...rest });
      }
  }
  return rows;
}

const isMain =
  process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop());
if (isMain) {
  const rows = referenceRun();
  if (process.argv.includes('--json')) {
    process.stdout.write(JSON.stringify(rows) + '\n');
  } else {
    for (const r of rows)
      console.log(
        [
          r.guide,
          r.path,
          r.step,
          r.kind,
          r.expected ?? '',
          r.passes ?? '',
        ].join('\t')
      );
  }
  if (process.argv.includes('--write')) {
    // Through Prettier, so the file is a fixed point of format:check.
    const config = (await prettier.resolveConfig(OUT)) || {};
    const text = `// =============================================================================
// The 3-D curriculum's answer key (generated)
// -----------------------------------------------------------------------------
// Written by \`npm run lab3d:key -- --write\` from a reference run of every
// guide on each path, through the page's own systems, tick, live sessions and
// answer functions. Do not edit by hand; tests/lab3dGuides.test.js fails when
// it is not what the run gives. The instructors' answer key is rendered from
// it.
// =============================================================================

export const LAB3D_KEY = ${JSON.stringify(rows, null, 2)};
`;
    writeFileSync(
      OUT,
      await prettier.format(text, { ...config, filepath: OUT })
    );
    console.error(`Wrote ${OUT}: ${rows.length} rows.`);
  }
}
