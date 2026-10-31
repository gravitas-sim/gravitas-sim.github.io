// =============================================================================
// The views of the vetting panel (Prompt 228, VETTING.md)
// -----------------------------------------------------------------------------
// Pure functions of the panel's control values, shared by js/vettingWidgets.js
// and tests/vettingLessons.test.js (which recomputes every number a lesson
// states from them). Nothing is calculated here that the kernel does not:
// the tests, the blend light curves and the frames are js/kernels/vetting/, and
// every candidate is SYNTHETIC with what made it kept in `truth`, which the panel
// shows only when asked. A run is cached per candidate.
//
// Pure: no DOM, no clock.
// =============================================================================

import {
  BINARY,
  CANDIDATE,
  candidate,
  transitFrames,
  vet,
  vettingRecord,
  cycleOf,
} from './kernels/vetting/index.js';
import { RATES } from './kernels/vetting/rates.js';

const { Math, Float64Array, Map } = globalThis;

const EQUAL_LD = Object.freeze({ ldB: BINARY.ldA });

/**
 * The candidates the panel vets, by index. Each is synthetic and `truth` says what
 * made it; `story` is the key of the sentence the panel gives when the truth is asked for.
 * `frames` is null when no frames were taken.
 */
export const PRESETS = Object.freeze([
  {
    id: 'clean',
    kind: 'planet',
    sigma: CANDIDATE.sigmaWell,
    frames: { eclipsed: 'target', rate: 3000, separation: 1.6 },
  },
  {
    id: 'alternating',
    kind: 'blend-alternating',
    sigma: CANDIDATE.sigmaWell,
    frames: { eclipsed: 'neighbour', rate: 3000, separation: 1.6 },
  },
  {
    id: 'secondary',
    kind: 'eb-secondary',
    sigma: CANDIDATE.sigmaWell,
    frames: { eclipsed: 'target', rate: 3000, separation: 1.6 },
  },
  {
    id: 'twin',
    kind: 'blend-twin',
    binary: EQUAL_LD,
    sigma: CANDIDATE.sigmaWell,
    frames: null,
  },
  {
    id: 'twin-frames',
    kind: 'blend-twin',
    binary: EQUAL_LD,
    sigma: CANDIDATE.sigmaWell,
    frames: { eclipsed: 'neighbour', rate: 3000, separation: 1.6 },
  },
  {
    id: 'faint',
    kind: 'planet',
    sigma: CANDIDATE.sigmaLow,
    frames: { eclipsed: 'target', rate: 200, separation: 1.6 },
  },
  {
    id: 'close',
    kind: 'blend-twin',
    binary: EQUAL_LD,
    sigma: CANDIDATE.sigmaWell,
    frames: { eclipsed: 'neighbour', rate: 3000, separation: 0.15 },
  },
  {
    id: 'marginal',
    kind: 'planet',
    eps: 0.1,
    sigma: 0.012,
    frames: { eclipsed: 'target', rate: 3000, separation: 1.6 },
  },
]);

export const PRESET_COUNT = PRESETS.length;
const idx = v => Math.max(0, Math.min(PRESETS.length - 1, Math.round(v ?? 0)));

const runs = new Map();

/** The vetting of candidate `i`: the series, the frames, the summary and the record. */
export function runOf(i) {
  const k = idx(i);
  if (!runs.has(k)) {
    const p = PRESETS[k];
    const series = candidate({
      kind: p.kind,
      sigma: p.sigma,
      eps: p.eps,
      binary: p.binary,
      seed: `vetting-228-lesson-${p.id}`,
    });
    const frames = p.frames
      ? transitFrames({
          seed: `vetting-228-lesson-frames-${p.id}`,
          ...p.frames,
        })
      : null;
    const summary = vet({
      series,
      ephemeris: series.ephemeris,
      ...(frames ? { frames } : {}),
    });
    runs.set(k, {
      preset: p,
      series,
      frames,
      summary,
      record: vettingRecord(summary, { id: `vetting-${p.id}` }),
    });
  }
  return runs.get(k);
}

/** What made the candidate, in the panel's catalogue keys and the numbers they state. */
export function truthOf(i) {
  const r = runOf(i);
  const p = r.preset;
  return {
    id: p.id,
    kind: p.kind,
    blend: p.kind !== 'planet',
    sigma: p.sigma,
    eps: p.eps ?? 0,
    separation: p.frames?.separation ?? null,
    eclipsed: p.frames?.eclipsed ?? null,
  };
}

const BINS = 24;

/** Binned mean flux against the offset from an eclipse centre in durations, -1.5 to +1.5. */
function binned(series, eph, centre, select) {
  const sum = new Float64Array(BINS);
  const n = new Float64Array(BINS);
  for (let j = 0; j < series.t.length; j++) {
    const c = cycleOf(series.t[j], eph.P, centre);
    if (select && !select(c)) continue;
    const u = (series.t[j] - centre - c * eph.P) / eph.duration;
    if (u < -1.5 || u >= 1.5) continue;
    const b = Math.floor(((u + 1.5) / 3) * BINS);
    sum[b] += series.y[j];
    n[b]++;
  }
  const x = [];
  const y = [];
  for (let b = 0; b < BINS; b++)
    if (n[b] > 0) {
      x.push(-1.5 + ((b + 0.5) / BINS) * 3);
      y.push(sum[b] / n[b]);
    }
  return { x, y };
}

/** The plots behind the checklist's disclosure. */
export function plotsOf(i) {
  const r = runOf(i);
  const eph = r.series.ephemeris;
  const odd = binned(r.series, eph, eph.t0, c => Math.abs(c) % 2 === 1);
  const even = binned(r.series, eph, eph.t0, c => Math.abs(c) % 2 === 0);
  const sec = binned(r.series, eph, eph.t0 + 0.5 * eph.P, null);
  const c = r.summary.tests.centroid;
  return {
    oddEven: { odd, even },
    secondary: sec,
    centroid: c?.dic
      ? {
          target: r.frames.target,
          dic: c.dic,
          sigma: c.sigma,
          neighbour: r.frames.truth.neighbour,
        }
      : null,
  };
}

/** The ensemble rates the panel shows beside a verdict (VETTING.md, "rates"). */
export const ratesOf = () => RATES;

/** The tests' verdicts and the overall, flat, for a lesson to compare against. */
export function verdictsOf(i) {
  const s = runOf(i).summary;
  return {
    oddEven: s.tests.oddEven.verdict,
    secondary: s.tests.secondary.verdict,
    centroid: s.tests.centroid ? s.tests.centroid.verdict : 'not-run',
    overall: s.overall,
  };
}
