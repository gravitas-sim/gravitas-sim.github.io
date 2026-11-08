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
import { createKeplerSession } from '../js/lab3d/runModes.js';
import { gravityOf } from '../js/lab3d/state.js';
import { chooseInterval } from '../js/lab3d/view/tick.js';
import {
  DEFAULT_OBSERVER,
  planeAxes,
  reorient,
} from '../js/lab3d/view/instruments.js';
import {
  ANSWERS,
  GUIDES,
  TARGETS,
  applyEdits,
  context,
  correctOption,
  evaluateCheck,
  record,
  recordedQuantity,
  stepMode,
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
  let mode = 'nbody';
  let axes = null;
  let panel = false;
  let observer = { ...DEFAULT_OBSERVER };
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
    plane: 'system',
  };
  const frame = () => ({
    t: snap.t,
    m: snap.m,
    x: snap.x,
    v: snap.v,
    alive: snap.alive,
  });
  const refreshAxes = () => {
    axes = null;
    if (controls.plane === 'system') return;
    axes = planeAxes(controls.plane, frame(), {
      units: system.units,
      observer,
    });
    if (!axes) controls.plane = 'system';
  };
  const begin = (sys, m, step) => {
    mode = m;
    system = sys;
    interval = step;
    if (m === 'kepler') {
      session = createKeplerSession(sys, { interval });
      snap = session.first;
    } else {
      const made = createLive(sys, { interval });
      if (made.problems) throw new Error(`${id}: ${made.problems[0].code}`);
      session = made.session;
      snap = session.now();
    }
    refreshAxes();
  };
  const lab = {
    read: () => ({
      system: id,
      ids: system ? system.bodies.map(b => b.id) : [],
      ...controls,
      mode,
      panel,
      playing: false,
      tau: snap ? snap.t : 0,
      t0,
    }),
    mode: () => mode,
    exact() {
      if (!snap) return null;
      const f = frame();
      return axes ? reorient(f, axes) : f;
    },
    exactSystem: () => snap && frame(),
    G: () => (system ? gravityOf(system) : 1),
    origin: () => system,
    observer: () => ({ ...observer }),
    axes: () => axes && axes.map(r => [...r]),
    now: () => restartFrom(system, snap),
    open(target, m = 'nbody') {
      id = target;
      const t = TARGETS[target];
      const sys = t.make
        ? t.make()
        : REFERENCES.find(r => r.id === t.reference).make().system;
      begin(sys, m, t.interval || chooseInterval(sys));
      t0 = snap.t;
    },
    setMode(m) {
      begin(restartFrom(system, snap), m, interval);
    },
    replace(sys) {
      begin(sys, mode, interval);
    },
    setObserver(az, el) {
      observer = { az: Number(az), el: Number(el) };
      refreshAxes();
    },
    openOrbit() {
      panel = true;
    },
    play() {},
    set(name, value) {
      controls[name] = String(value);
      if (name === 'plane') refreshAxes();
    },
    advance(k) {
      snap = mode === 'kepler' ? session.advanceNow(k) : session.advance(k);
      // As the page does: a full-length session with every body there goes
      // on from its own numbers.
      if (
        mode === 'nbody' &&
        snap.status === 'ok' &&
        snap.alive.every(Boolean)
      ) {
        system = restartFrom(system, snap);
        session = createLive(system, {
          interval: chooseInterval(system),
        }).session;
        snap = session.now();
      }
      refreshAxes();
      return snap;
    },
  };
  return lab;
}

/** Apply a step's `go` as the runner does (js/lab3d/view/guidePanel.js). */
async function go(lab, g, s) {
  const mode = stepMode(g, s);
  if (s.go?.open && (lab.read().system !== s.go.open || lab.mode() !== mode)) {
    lab.open(s.go.open, mode);
    lab.set('plane', 'system');
  } else if (s.kind !== 'read' && lab.mode() !== mode) lab.setMode(mode);
  if (s.go?.panel) lab.openOrbit();
  if (s.go?.observer) lab.setObserver(s.go.observer.az, s.go.observer.el);
  const ids = lab.read().ids;
  const entries = Object.entries(s.go?.set || {});
  // The instrument first, so its body selectors exist when they are set.
  entries.sort(([a], [b]) => (b === 'tool') - (a === 'tool'));
  for (const [name, value] of entries) {
    let v = value;
    if (['a', 'b', 'v', 'follow'].includes(name))
      v = String(ids.indexOf(value));
    if (name === 'frame' && value.startsWith('body:'))
      v = `body:${ids.indexOf(value.slice(5))}`;
    lab.set(name, v);
  }
  if (s.go?.edit) await applyEdits(lab, s.go.edit);
}

/** The particle's eccentricity about its primary, in the frame now. */
function quantityNow(lab, check) {
  return recordedQuantity(record(lab), check);
}

/**
 * Play until a `do` step's check can pass, as a reader would: through an
 * orbit for `played`; for a record step with a threshold, to the first peak
 * of the quantity beyond it (above `atLeast`, below `atMost`), kept at the
 * extreme seen.
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
  if (c.atLeast === undefined && c.atMost === undefined) {
    records[s.id] = record(lab);
    return;
  }
  // +1 looks for a maximum above atLeast, -1 for a minimum below atMost.
  const sign = c.atLeast !== undefined ? 1 : -1;
  const bar = sign * (c.atLeast ?? -c.atMost);
  const margin = c.quantity === 'phi' ? 0.02 : 0.02;
  let best = -Infinity;
  let kept = null;
  for (let n = 0; n < 200000; n++) {
    lab.advance(256);
    const v = sign * quantityNow(lab, c);
    if (v > best) {
      best = v;
      kept = record(lab);
    } else if (best >= bar && v < best - margin) break;
  }
  records[s.id] = kept;
}

/**
 * One run per guide and per path (the advanced path edits things the
 * introductory one does not, so each is played on its own).
 */
export async function referenceRun() {
  const rows = [];
  for (const g of GUIDES) {
    for (const path of ['intro', 'advanced']) {
      const lab = standIn();
      const records = {};
      for (const s of stepsOn(g, path)) {
        const row = { guide: g.id, path, step: s.id, kind: s.kind };
        if (s.kind === 'do') {
          await go(lab, g, s);
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
        rows.push(row);
      }
    }
  }
  return rows;
}

const isMain =
  process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop());
if (isMain) {
  const rows = await referenceRun();
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
