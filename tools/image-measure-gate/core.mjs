/* global console, performance */
// =============================================================================
// The gate's checks that need no browser: precision, undo, determinism and the
// record (Prompt 178 prototype measurement; spike code)
// -----------------------------------------------------------------------------
// Run in plain Node (Jest's VM slows Math reads about tenfold), on the ensembles
// frames.mjs generates from fixed seeds. Every function returns the numbers it
// measured and a status against the committed bounds (tools/image-measure-gate.mjs).
// Nothing here stores a value that passes through Math.log, exp, cos or sin:
// only bands and counts are compared across Node versions, and determinism is
// shown in-process.
// =============================================================================

import { THRESHOLDS } from '../image-measure-gate.mjs';
import { discFrame, moonSequence, pointField, makeRandom } from './frames.mjs';
import {
  createStore,
  edit,
  emptyState,
  nudge,
  place,
  refine,
  refineCircle,
  refinePoint,
  remove,
  copyForward,
} from './marks.js';
import { ReplayError, replay, writeRecord } from './record.js';
import { validateArtifact } from '../../js/platform/artifact.js';

const P = THRESHOLDS.precision;
/** Nearest-rank percentile of a sorted copy. */
export const percentile = (values, q) => {
  const s = [...values].sort((a, b) => a - b);
  return s[Math.max(0, Math.ceil(q * s.length) - 1)];
};
const round = (v, d = 4) => (Number.isFinite(v) ? Number(v.toPrecision(d)) : v);

/** T2.point: 300 sources, click within the capture disk, refined. */
export function pointPrecision({ seed = 178, n = P.points } = {}) {
  const f = pointField({ seed, n, capture: P.captureRadius });
  const errors = [];
  const refused = {};
  const zx = [];
  for (const s of f.truth) {
    const r = refinePoint(f, s.click.x, s.click.y);
    if (!r.ok) {
      refused[r.reason] = (refused[r.reason] ?? 0) + 1;
      errors.push(Infinity);
      continue;
    }
    errors.push(Math.hypot(r.x - s.x, r.y - s.y));
    zx.push(Math.abs(r.x - s.x) / r.sigma);
  }
  const refusedCount = Object.values(refused).reduce((a, b) => a + b, 0);
  const finite = errors.filter(Number.isFinite);
  const p95 = percentile(errors, 0.95);
  const bySnr = [
    [20, 40],
    [40, 80],
    [80, 200.0001],
  ].map(([a, b]) => {
    const e = f.truth
      .map((s, i) => [s.snr, errors[i]])
      .filter(([x]) => x >= a && x < b)
      .map(([, e]) => e)
      .filter(Number.isFinite);
    return {
      snr: `${a} to ${Math.min(b, 200)}`,
      n: e.length,
      p95: round(percentile(e, 0.95)),
    };
  });
  return {
    status: p95 <= P.pointP95 && refusedCount === 0 ? 'pass' : 'fail',
    bound: { p95: P.pointP95, allRefined: true },
    n: errors.length,
    refused,
    median: round(percentile(finite, 0.5)),
    p95: round(p95),
    p99: round(percentile(finite, 0.99)),
    max: round(Math.max(...finite)),
    bySnr,
    sigmaCoverage: {
      within1: round(zx.filter(z => z <= 1).length / zx.length),
      within2: round(zx.filter(z => z <= 2).length / zx.length),
      expected: [0.683, 0.954],
    },
    generated: `${f.manifest.generator}, seed ${seed}`,
  };
}

/** T2.circle: 150 discs, 100 bright and 50 dark. */
export function circlePrecision({ seed = 1000, n = P.circles } = {}) {
  const errors = [];
  const centre = [];
  const refused = {};
  const sigmaOk = [];
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
      continue;
    }
    errors.push(Math.abs(r.r - f.truth.r) / f.truth.r);
    centre.push(Math.hypot(r.x - f.truth.x, r.y - f.truth.y));
    sigmaOk.push(Math.abs(r.r - f.truth.r) <= 2 * r.sigmaR);
  }
  const finite = errors.filter(Number.isFinite);
  const p95 = percentile(errors, 0.95);
  return {
    status: p95 <= P.circleP95 ? 'pass' : 'fail',
    bound: { p95: P.circleP95 },
    n: errors.length,
    refused,
    median: round(percentile(finite, 0.5)),
    p95: round(p95),
    max: round(Math.max(...finite)),
    centreP95Px: round(percentile(centre, 0.95)),
    radiusWithin2Sigma: round(sigmaOk.filter(Boolean).length / sigmaOk.length),
  };
}

/** The negative cases: refuse, or be inside the bound; a confident wrong answer is counted. */
export function negativeCases() {
  const rnd = makeRandom(7);
  const out = {};
  const judge = (name, trials) => {
    let refusedN = 0;
    let right = 0;
    let wrong = 0;
    for (const [r, error] of trials) {
      if (!r.ok) refusedN++;
      else if (error <= P.pointP95) right++;
      else wrong++;
    }
    out[name] = {
      n: trials.length,
      refused: refusedN,
      withinBound: right,
      confidentlyWrong: wrong,
    };
  };
  // A frame of one faint source, a pair, a spike, an edge source, each many times.
  const field = pointField({ seed: 31, n: 60 });
  const make = mod => {
    const trials = [];
    for (const s of field.truth.slice(0, 40)) {
      const f = { ...field, data: Float64Array.from(field.data) };
      mod(f, s, rnd);
      const r = refinePoint(f, s.click.x, s.click.y);
      trials.push([r, r.ok ? Math.hypot(r.x - s.x, r.y - s.y) : 0]);
    }
    return trials;
  };
  const at = (f, x, y) => (Math.round(y) - 1) * f.width + (Math.round(x) - 1);
  // faint: replace the source by one below signal to noise 10 (set the peak region to sky + small bump).
  judge(
    'faint (peak S/N 3 to 8)',
    make((f, s) => {
      const sigma = s.fwhm / 2.3548;
      const amp = rnd.uniform(3, 8) * 9.7;
      for (let y = Math.round(s.y) - 14; y <= Math.round(s.y) + 14; y++)
        for (let x = Math.round(s.x) - 14; x <= Math.round(s.x) + 14; x++)
          f.data[at(f, x, y)] =
            200 +
            0.05 * (x - 512) +
            0.03 * (y - 512) +
            9.7 * rnd.gauss() +
            amp *
              Math.exp(
                -((x - s.x) ** 2 + (y - s.y) ** 2) / (2 * sigma * sigma)
              );
    })
  );
  judge(
    'blended pair (separation under one FWHM)',
    make((f, s) => {
      const sigma = s.fwhm / 2.3548;
      const sep = rnd.uniform(0.5, 1) * s.fwhm;
      for (let y = Math.round(s.y) - 14; y <= Math.round(s.y) + 14; y++)
        for (let x = Math.round(s.x) - 14; x <= Math.round(s.x) + 14; x++)
          f.data[at(f, x, y)] +=
            s.snr *
            9.7 *
            Math.exp(
              -((x - s.x - sep) ** 2 + (y - s.y) ** 2) / (2 * sigma * sigma)
            );
      s.x += sep / 2; // the truth of a blend: no one position; the centre of light
    })
  );
  judge(
    'cosmic-ray spike (one pixel)',
    make((f, s) => {
      for (let y = Math.round(s.y) - 14; y <= Math.round(s.y) + 14; y++)
        for (let x = Math.round(s.x) - 14; x <= Math.round(s.x) + 14; x++)
          f.data[at(f, x, y)] =
            200 + 0.05 * (x - 512) + 0.03 * (y - 512) + 9.7 * rnd.gauss();
      f.data[at(f, s.x + 1, s.y - 1)] += 3000;
    })
  );
  judge(
    'on the frame edge',
    make((f, s) => {
      // A real source 8 to 14 pixels from the left edge, clicked within the capture disk.
      const sigma = s.fwhm / 2.3548;
      const x0 = rnd.uniform(8, 14);
      for (let y = Math.round(s.y) - 14; y <= Math.round(s.y) + 14; y++)
        for (let x = 1; x <= 30; x++)
          f.data[at(f, x, y)] =
            200 +
            9.7 * rnd.gauss() +
            s.snr *
              9.7 *
              Math.exp(-((x - x0) ** 2 + (y - s.y) ** 2) / (2 * sigma * sigma));
      s.x = x0;
      const [dx, dy] = rnd.disk(3);
      s.click = { x: Math.max(1, x0 + dx), y: s.y + dy };
    })
  );
  const beyond = (() => {
    const trials = [];
    for (const s of field.truth.slice(0, 40)) {
      const [dx, dy] = rnd.disk(12);
      const off = {
        x: s.x + (dx >= 0 ? 4 + Math.abs(dx) : -4 - Math.abs(dx)) * 0.7,
        y: s.y + dy * 0.3,
      };
      const r = refinePoint(field, off.x, off.y);
      trials.push([r, r.ok ? Math.hypot(r.x - s.x, r.y - s.y) : 0]);
    }
    return trials;
  })();
  judge('click beyond the capture radius (4 to 12 px)', beyond);
  return out;
}

// ---- undo ------------------------------------------------------------------

/** T5.undo: seeded random sequences; every step undone exactly, and redone. */
export function undoProperty({ sequences = 200, steps = 25, seed = 5 } = {}) {
  const rnd = makeRandom(seed);
  const f = discFrame({ seed: 77, bright: true });
  const frames = [f, f];
  const kinds = [
    'point',
    'segment',
    'circle',
    'polygon',
    'count',
    'reference-pair',
  ];
  let ops = 0;
  let failures = 0;
  const clone = x => JSON.parse(JSON.stringify(x));
  for (let q = 0; q < sequences; q++) {
    const store = createStore(emptyState());
    const states = [clone(store.state)];
    for (let i = 0; i < steps; i++) {
      const s = store.state;
      const roll = rnd.u();
      let next = s;
      if (roll < 0.35 || !s.marks.length) {
        const kind = kinds[Math.floor(rnd.u() * kinds.length)];
        const n = {
          point: 1,
          count: 1,
          segment: 2,
          'reference-pair': 2,
          circle: 2,
          polygon: 3,
        }[kind];
        const x = rnd.uniform(100, 900);
        const y = rnd.uniform(100, 900);
        next = place(s, {
          kind,
          frame: Math.floor(rnd.u() * 2),
          tag: rnd.u() < 0.5 ? 'a' : '',
          pts: Array.from({ length: n }, (_, j) => [x + 9 * j, y + 4 * j]),
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
      // A refusal (or any operation that changes nothing) is not a step.
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
    status: failures === 0 ? 'pass' : 'fail',
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
  const run = (refinePt, refineC, order) => {
    const out = new Map();
    for (const i of order) {
      const s = pf.truth[i];
      const r = refinePt(pf, s.click.x, s.click.y);
      out.set(`p${i}`, r.ok ? [r.x, r.y, r.sigma] : r.reason);
    }
    return out;
  };
  const discs = [0, 1, 2, 3, 4, 5].map(i =>
    discFrame({ seed: 300 + i, bright: i < 4 })
  );
  const runC = (refineC, order) => {
    const out = new Map();
    for (const i of order) {
      const c = discs[i].click;
      const r = refineC(
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
  const order = [...pf.truth.keys()];
  const reversed = [...order].reverse();
  const base = run(refinePoint, null, order);
  let mismatches = 0;
  for (let rep = 0; rep < 10; rep++)
    if (!same(base, run(refinePoint, null, order))) mismatches++;
  if (!same(base, run(refinePoint, null, reversed))) mismatches++;
  const baseC = runC(refineCircle, [0, 1, 2, 3, 4, 5]);
  for (let rep = 0; rep < 10; rep++)
    if (!same(baseC, runC(refineCircle, [0, 1, 2, 3, 4, 5]))) mismatches++;
  if (!same(baseC, runC(refineCircle, [5, 3, 1, 0, 2, 4]))) mismatches++;
  const fresh = await import(`./marks.js?instance=${Date.now()}`);
  const freshInstance =
    fresh !== (await import('./marks.js')) &&
    same(base, run(fresh.refinePoint, null, order)) &&
    same(baseC, runC(fresh.refineCircle, [0, 1, 2, 3, 4, 5]));
  if (!freshInstance) mismatches++;
  return {
    status: mismatches === 0 ? 'pass' : 'fail',
    bound: { mismatches: 0 },
    repeats: 10,
    sources: 40,
    discs: 6,
    freshModuleInstance: freshInstance,
    mismatches,
  };
}

// ---- the record --------------------------------------------------------------

/** T4: one valid envelope, JSON round trip, replay, refusal on a changed image, a two-frame record. */
export async function recordChecks() {
  const seq = moonSequence({ seed: 1787, frames: 2 });
  const frames = seq.frames;
  const sidecar = { knownLength: seq.knownLength };
  const t = frames.map(f => f.truth);
  let s = emptyState();
  // a reference pair on the limb, a circle on the disc, tagged craters, in both frames
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
    id: 'gate-record',
    setId: seq.id,
    frames,
    sidecar,
    state: s,
  });
  const problems = validateArtifact(record);
  const uncertain = record.quantities.every(q =>
    ['sigma', 'assumed'].includes(q.uncertainty?.kind)
  );
  const parsed = JSON.parse(JSON.stringify(record));
  const r = await replay(parsed, frames);
  const sameMarks =
    JSON.stringify(
      r.state.marks.map(({ id, kind, frame, tag, pts, refined }) => ({
        id,
        kind,
        frame,
        tag,
        pts,
        refined,
      }))
    ) ===
    JSON.stringify(
      s.marks.map(({ id, kind, frame, tag, pts, refined }) => ({
        id,
        kind,
        frame,
        tag,
        pts,
        refined,
      }))
    );
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
  const kinds = new Set(record.quantities.map(q => q.uncertainty.kind));
  return {
    record: {
      status:
        problems.length === 0 &&
        uncertain &&
        !!scale &&
        record.source.digest.length === 64 &&
        red.frames.every(f => f.digest.length === 64)
          ? 'pass'
          : 'fail',
      validateArtifactProblems: problems.length,
      quantities: record.quantities.length,
      uncertaintyKinds: [...kinds].sort(),
      scale: scale
        ? {
            value: round(scale.value),
            sigma: round(scale.uncertainty.sigma),
            truth: round(3474.8 / (2 * R)),
          }
        : null,
      imageIdentity: record.source.digest.slice(0, 12),
      jsonBytes: JSON.stringify(record).length,
    },
    replay: {
      status:
        sameMarks && r.identical && refusal === 'image-changed'
          ? 'pass'
          : 'fail',
      sameMarks,
      refinementBitIdentical: r.identical,
      differ: r.differ,
      refusesChangedImage: refusal,
    },
    sequence: {
      status: sequence && r.identical ? 'pass' : 'fail',
      frames: red.frames.length,
      timeScale: red.frames[0].time?.scale,
    },
  };
}

export async function runCore() {
  const t0 = performance.now();
  const point = pointPrecision();
  const circle = circlePrecision();
  const negative = negativeCases();
  const undo = undoProperty();
  const det = await determinism();
  const rec = await recordChecks();
  console.log(`core checks ${Math.round(performance.now() - t0)} ms`);
  return { point, circle, negative, undo, determinism: det, ...rec };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify(await runCore(), null, 1));
}
