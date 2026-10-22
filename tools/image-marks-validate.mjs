#!/usr/bin/env node
/* global console, process */
// =============================================================================
// The marks instrument against the gate's thresholds (Prompt 179)
// -----------------------------------------------------------------------------
//   npm run image-marks:validate              print the table
//   npm run image-marks:validate -- --json    print it as JSON
//
// The gate (IMAGE_MEASUREMENT_GATE.md, D-R10-48) committed seven thresholds
// before its prototype existed. This runs the same checks, on the same seeded
// synthetic frames (tools/image-measure-gate/frames.mjs, truth manifests
// included), against the PRODUCTION modules in js/measure/, and judges them
// against the gate's own numbers (THRESHOLDS in tools/image-measure-gate.mjs, not
// copied). tests/imageMeasure.test.js runs this in plain Node, because Jest's VM
// makes Math and Float64Array reads about ten times slower, and asserts every
// row; npm run measure:validate prints the same two precision rows. Nothing here
// stores a value that passes through Math.log, exp, cos or sin (Node 20 and 24
// differ in the last bits): only bands and counts are judged, and determinism is
// shown in-process.
// =============================================================================

import { THRESHOLDS } from './image-measure-gate.mjs';
import {
  discFrame,
  makeRandom,
  moonSequence,
  pointField,
} from './image-measure-gate/frames.mjs';
import {
  copyForward,
  createStore,
  edit,
  emptyState,
  nudge,
  place,
  refine,
  remove,
} from '../js/measure/marks.js';
import { refineCircle, refinePoint } from '../js/measure/refine.js';
import { ReplayError, replay, writeRecord } from '../js/measure/imageRecord.js';
import { validateArtifact } from '../js/platform/artifact.js';

const P = THRESHOLDS.precision;
/** Nearest-rank percentile. */
export const percentile = (values, q) => {
  const s = [...values].sort((a, b) => a - b);
  return s[Math.max(0, Math.ceil(q * s.length) - 1)];
};
const round = (v, d = 4) => (Number.isFinite(v) ? Number(v.toPrecision(d)) : v);
const verdict = ok => (ok ? 'pass' : 'fail');

/** T2.point: 300 sources, a click inside the capture disc, refined. */
export function pointPrecision({ seed = 178, n = P.points } = {}) {
  const f = pointField({ seed, n, capture: P.captureRadius });
  const errors = [];
  const refused = {};
  for (const s of f.truth) {
    const r = refinePoint(f, s.click.x, s.click.y);
    if (!r.ok) {
      refused[r.reason] = (refused[r.reason] ?? 0) + 1;
      errors.push(Infinity);
    } else errors.push(Math.hypot(r.x - s.x, r.y - s.y));
  }
  const refusedCount = Object.values(refused).reduce((a, b) => a + b, 0);
  const p95 = percentile(errors, 0.95);
  return {
    status: verdict(p95 <= P.pointP95 && refusedCount === 0),
    bound: { p95: P.pointP95, allRefined: true },
    n: errors.length,
    refused,
    p95: round(p95),
    max: round(Math.max(...errors.filter(Number.isFinite))),
  };
}

/** T2.circle: 150 discs, two thirds bright on dark and the rest dark on bright. */
export function circlePrecision({ seed = 1000, n = P.circles } = {}) {
  const errors = [];
  const refused = {};
  for (let i = 0; i < n; i++) {
    const f = discFrame({
      seed: seed + i,
      bright: i < Math.round((2 * n) / 3),
      capture: P.captureRadius,
    });
    const c = f.click;
    const r = refineCircle(f, [c.centre.x, c.centre.y], [c.limb.x, c.limb.y]);
    if (!r.ok) {
      refused[r.reason] = (refused[r.reason] ?? 0) + 1;
      errors.push(Infinity);
    } else errors.push(Math.abs(r.r - f.truth.r) / f.truth.r);
  }
  const p95 = percentile(errors, 0.95);
  return {
    status: verdict(p95 <= P.circleP95),
    bound: { p95: P.circleP95 },
    n: errors.length,
    refused,
    p95: round(p95),
    max: round(Math.max(...errors.filter(Number.isFinite))),
  };
}

/** The refusals: a source or limb the instrument cannot stand behind says so. */
export function refusals() {
  const pf = pointField({ seed: 11, n: 30, capture: P.captureRadius });
  const flat = {
    width: 200,
    height: 200,
    data: new Float64Array(40000).fill(300),
  };
  const edge = refinePoint(pf, 5, 5);
  const far = refinePoint(pf, pf.truth[0].x + 9, pf.truth[0].y + 9);
  const noThing = refinePoint(flat, 100, 100);
  // A disc whose limb fills the frame: the gate's lunar leg (every ray leaves it).
  const f = discFrame({ seed: 1000, bright: true });
  const huge = refineCircle(f, [512.5, 512.5], [512.5 + 800, 512.5]);
  const ok = !edge.ok && !far.ok && !noThing.ok && !huge.ok;
  return {
    status: verdict(
      ok && edge.reason === 'edge' && huge.reason === 'touches-frame'
    ),
    edge: edge.reason,
    farFromAnySource: far.reason,
    flat: noThing.reason,
    limbLeavesFrame: huge.reason,
  };
}

const KINDS = {
  point: 1,
  count: 1,
  segment: 2,
  'reference-pair': 2,
  circle: 2,
  polygon: 3,
};

/** T5.undo: seeded random sequences; every step undone exactly, and redone. */
export function undoProperty({ sequences = 200, steps = 25, seed = 5 } = {}) {
  const rnd = makeRandom(seed);
  const f = discFrame({ seed: 77, bright: true });
  const frames = [f, f];
  const kinds = Object.keys(KINDS);
  const clone = x => JSON.parse(JSON.stringify(x));
  let ops = 0;
  let failures = 0;
  for (let q = 0; q < sequences; q++) {
    const store = createStore(emptyState());
    const states = [clone(store.state)];
    for (let i = 0; i < steps; i++) {
      const s = store.state;
      const roll = rnd.u();
      let next = s;
      if (roll < 0.35 || !s.marks.length) {
        const kind = kinds[Math.floor(rnd.u() * kinds.length)];
        const x = rnd.uniform(100, 900);
        const y = rnd.uniform(100, 900);
        next = place(s, {
          kind,
          frame: Math.floor(rnd.u() * 2),
          tag: rnd.u() < 0.5 ? 'a' : '',
          pts: Array.from({ length: KINDS[kind] }, (_, j) => [
            x + 9 * j,
            y + 4 * j,
          ]),
          length:
            kind === 'reference-pair'
              ? { value: 3474.8, unit: 'km' }
              : undefined,
        });
      } else {
        const m = s.marks[Math.floor(rnd.u() * s.marks.length)];
        if (roll < 0.55)
          next = nudge(
            s,
            m.id,
            Math.floor(rnd.u() * m.pts.length),
            rnd.uniform(-4, 4),
            rnd.uniform(-4, 4)
          );
        else if (roll < 0.7)
          next = edit(s, m.id, {
            tag: 'b',
            handle: 0,
            x: rnd.uniform(100, 900),
          });
        else if (roll < 0.8) next = remove(s, m.id);
        else if (roll < 0.92) next = refine(s, m.id, frames).state;
        else next = copyForward(s, m.id, 1);
      }
      if (next === s) continue;
      store.apply(next);
      store.seal();
      states.push(clone(store.state));
      ops++;
    }
    for (let i = states.length - 2; i >= 0; i--) {
      store.undo();
      if (JSON.stringify(store.state) !== JSON.stringify(states[i])) failures++;
    }
    for (let i = 1; i < states.length; i++) {
      store.redo();
      if (JSON.stringify(store.state) !== JSON.stringify(states[i])) failures++;
    }
  }
  return {
    status: verdict(failures === 0),
    bound: { failures: 0 },
    sequences,
    operations: ops,
    stateComparisons: ops * 2,
    failures,
  };
}

/** T5.determinism: the same bits, repeated, reordered, and in a fresh module instance. */
export async function determinism() {
  const pf = pointField({ seed: 9, n: 40 });
  const discs = [0, 1, 2, 3, 4, 5].map(i =>
    discFrame({ seed: 300 + i, bright: i < 4 })
  );
  const run = (mod, order, corder) => {
    const out = new Map();
    for (const i of order) {
      const s = pf.truth[i];
      const r = mod.refinePoint(pf, s.click.x, s.click.y);
      out.set(`p${i}`, r.ok ? [r.x, r.y, r.sigma] : r.reason);
    }
    for (const i of corder) {
      const c = discs[i].click;
      const r = mod.refineCircle(
        discs[i],
        [c.centre.x, c.centre.y],
        [c.limb.x, c.limb.y]
      );
      out.set(`c${i}`, r.ok ? [r.x, r.y, r.r, r.sigmaR] : r.reason);
    }
    return out;
  };
  const same = (a, b) =>
    [...a].every(([k, v]) =>
      Array.isArray(v)
        ? v.every((x, j) => Object.is(x, b.get(k)[j]))
        : v === b.get(k)
    );
  const here = await import('../js/measure/refine.js');
  const order = [...pf.truth.keys()];
  const corder = [0, 1, 2, 3, 4, 5];
  const base = run(here, order, corder);
  let mismatches = 0;
  for (let rep = 0; rep < 10; rep++)
    if (!same(base, run(here, order, corder))) mismatches++;
  if (!same(base, run(here, [...order].reverse(), [5, 3, 1, 0, 2, 4])))
    mismatches++;
  const fresh = await import(`../js/measure/refine.js?instance=${Date.now()}`);
  const freshInstance = fresh !== here && same(base, run(fresh, order, corder));
  if (!freshInstance) mismatches++;
  return {
    status: verdict(mismatches === 0),
    bound: { mismatches: 0 },
    repeats: 10,
    freshModuleInstance: freshInstance,
    mismatches,
  };
}

/** T4: one valid envelope, JSON round trip, replay, refusal on a changed image, a two-frame record. */
export async function recordChecks() {
  const seq = moonSequence({ seed: 1787, frames: 2 });
  const frames = seq.frames;
  const t = frames.map(f => f.truth);
  let s = emptyState();
  const R = t[0].disc.r;
  const click = (x, y) => [x + 1.2, y - 0.8];
  for (let k = 0; k < 2; k++) {
    const d = t[k].disc;
    s = place(s, {
      kind: 'reference-pair',
      frame: k,
      tag: 'diameter',
      pts: [click(d.x - R, d.y), click(d.x + R, d.y)],
      length: { value: 3474.8, unit: 'km' },
    });
    s = place(s, {
      kind: 'circle',
      frame: k,
      tag: 'limb',
      pts: [click(d.x, d.y), click(d.x + R, d.y)],
    });
    for (const f of t[k].features.slice(0, 3))
      s = place(s, {
        kind: 'point',
        frame: k,
        tag: f.tag,
        pts: [click(f.x, f.y)],
      });
  }
  for (const m of s.marks.filter(
    m => m.kind === 'circle' || m.kind === 'point'
  ))
    s = refine(s, m.id, frames).state;
  const record = await writeRecord({
    id: 'marks-check',
    setId: seq.id,
    frames,
    state: s,
  });
  const problems = validateArtifact(record);
  const uncertain = record.quantities.every(q =>
    ['sigma', 'assumed'].includes(q.uncertainty?.kind)
  );
  const parsed = JSON.parse(JSON.stringify(record));
  const r = await replay(parsed, frames);
  const view = st =>
    JSON.stringify(
      st.marks.map(({ id, kind, frame, tag, pts, refined }) => ({
        id,
        kind,
        frame,
        tag,
        pts,
        refined,
      }))
    );
  const sameMarks = view(r.state) === view(s);
  let refusal = null;
  const changed = { ...frames[0], data: Float64Array.from(frames[0].data) };
  changed.data[1234] += 1;
  try {
    await replay(parsed, [changed, frames[1]]);
  } catch (e) {
    refusal = e instanceof ReplayError ? e.code : `other: ${e.message}`;
  }
  const red = parsed.provenance.reductions[0];
  const sequence =
    red.frames.length === 2 &&
    red.frames.every(
      f => f.time?.scale === 'UTC' && /^[0-9a-f]{64}$/.test(f.digest)
    ) &&
    [...new Set(red.marks.map(m => m.frame))].sort().join() === '0,1' &&
    record.quantities.some(q => q.id === 'frame1.time') &&
    record.quantities.some(q => q.id === 'frame2.time');
  const scale = record.quantities.find(q => q.id === 'scale');
  return {
    record: {
      status: verdict(
        problems.length === 0 &&
          uncertain &&
          !!scale &&
          record.source.digest.length === 64
      ),
      validateArtifactProblems: problems.length,
      quantities: record.quantities.length,
      scale: scale
        ? {
            value: round(scale.value),
            sigma: round(scale.uncertainty.sigma),
            truth: round(3474.8 / (2 * R)),
          }
        : null,
    },
    replay: {
      status: verdict(sameMarks && r.identical && refusal === 'image-changed'),
      sameMarks,
      refinementBitIdentical: r.identical,
      refusesChangedImage: refusal,
    },
    sequence: {
      status: verdict(sequence && r.identical),
      frames: red.frames.length,
    },
  };
}

export async function runValidation() {
  const record = await recordChecks();
  return {
    'T2.point': pointPrecision(),
    'T2.circle': circlePrecision(),
    refusals: refusals(),
    'T5.undo': undoProperty(),
    'T5.determinism': await determinism(),
    'T4.record': record.record,
    'T4.replay': record.replay,
    'T4.sequence': record.sequence,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const results = await runValidation();
  if (process.argv.includes('--json'))
    console.log(JSON.stringify(results, null, 1));
  else
    for (const [id, r] of Object.entries(results))
      console.log(
        `${r.status.padEnd(5)} ${id.padEnd(16)} ${JSON.stringify({ ...r, status: undefined })}`
      );
  process.exitCode = Object.values(results).every(r => r.status === 'pass')
    ? 0
    : 1;
}
