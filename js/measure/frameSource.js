// =============================================================================
// A synthetic frame sequence: the detector kernel's frames, read one at a time
// -----------------------------------------------------------------------------
// The calibration lab's own forward model (js/kernels/detector/frame.js) makes
// every frame; this module only chooses the sources of each (a variable, a
// common transparency that wanders, a pointing that jitters) and hands the
// frames over one at a time, the way js/measure/frameSeries.js reads them. With
// no pointing change the frames are exactly those of simulateSeries (a test
// holds that), so the lab's series and the pipeline's are the same data.
//
// The truth manifest says what was drawn: each frame's shift, turn and
// transparency, every variable's magnitude change, and every star's true
// position in each frame. Nothing here is observed: the sequence says so.
//
// Pure: no DOM.
// =============================================================================

import {
  calibrationSet,
  simulateFrame,
  normalizeDetector,
} from '../kernels/detector/frame.js';
import { buildMasters } from '../kernels/detector/pipeline.js';
import { stream } from '../random/streams.js';

const { Math, Float64Array } = globalThis;

export const VERSION = 1;

/** A standard normal from a stream: the kernel's own Box-Muller, draw for draw. */
function gaussian(rng) {
  let u = rng();
  while (u <= Number.EPSILON) u = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** What a set of calibration frames is, unless the spec says otherwise (the lab's). */
export const CALIBRATION = Object.freeze({
  nBias: 10,
  nDark: 7,
  darkExposure: 120,
  nFlat: 10,
  flatExposure: 5,
  flatLevel: 20000,
});

/**
 * @param {object} spec
 * @param {string} spec.seed
 * @param {Array<{id: string, x: number, y: number, rate: number}>} spec.stars - electrons per second
 * @param {number} spec.count - frames, 2 to 400
 * @param {number} spec.cadence - days between frames
 * @param {number} [spec.exposure=60]
 * @param {number} [spec.sky=3] - electrons per second per pixel
 * @param {object} [spec.detector] - overrides of DEFAULT_DETECTOR
 * @param {Array<{id: string, period: number, amplitude: number, phase?: number|'seed'}>} [spec.variables]
 * @param {number} [spec.cloud=0.1] - rms of the common transparency
 * @param {number} [spec.jitter=0] - rms shift of the pointing, pixels, each axis
 * @param {number} [spec.rotationDeg=0] - rms turn of the field, degrees
 * @param {Object<number, 'turn'|'cloud'>} [spec.replace] - frames that go wrong, by index
 * @param {object} [spec.calibration] - frames of each kind
 */
export function syntheticSequence(spec) {
  const detector = normalizeDetector(spec.detector);
  const seed = String(spec.seed);
  const exposure = spec.exposure ?? 60;
  const sky = spec.sky ?? 3;
  const count = spec.count;
  if (!(Number.isInteger(count) && count >= 2 && count <= 400))
    throw new Error('a series has 2 to 400 frames');
  const cloud = spec.cloud ?? 0.1;
  const jitter = spec.jitter ?? 0;
  const rotationDeg = spec.rotationDeg ?? 0;
  const replace = spec.replace ?? {};
  const variables = (spec.variables ?? []).map(v => ({
    ...v,
    phase:
      v.phase === 'seed'
        ? stream('noise', seed, 'phase', v.id)()
        : (v.phase ?? 0),
  }));
  const cx = (detector.width - 1) / 2;
  const cy = (detector.height - 1) / 2;

  // The same walk simulateSeries draws, then the pointing from its own stream.
  const rng = stream('noise', seed, 'transparency');
  const point = stream('noise', seed, 'pointing');
  const times = new Float64Array(count);
  const transparency = new Float64Array(count);
  const shift = [];
  const turn = new Float64Array(count);
  const deltaMag = Object.fromEntries(
    variables.map(v => [v.id, new Float64Array(count)])
  );
  let z = gaussian(rng);
  for (let k = 0; k < count; k++) {
    times[k] = k * spec.cadence;
    if (k > 0) z = 0.8 * z + Math.sqrt(1 - 0.64) * gaussian(rng);
    transparency[k] = clamp(1 + cloud * z, 0.3, 1.5);
    for (const v of variables)
      deltaMag[v.id][k] =
        v.amplitude * Math.sin(2 * Math.PI * (v.phase + times[k] / v.period));
    if ((jitter > 0 || rotationDeg > 0) && k > 0) {
      shift.push([jitter * gaussian(point), jitter * gaussian(point)]);
      turn[k] = (rotationDeg * gaussian(point) * Math.PI) / 180;
    } else shift.push([0, 0]);
  }
  for (const [k, what] of Object.entries(replace))
    if (what === 'cloud') transparency[k] = 0.03;

  /** Where star `s` is in frame k, truth. */
  const placed = (s, k) => {
    let { x, y } = s;
    if (replace[k] === 'turn') {
      const dx = x - cx;
      const dy = y - cy;
      x = cx - dy;
      y = cy + dx;
    } else if (turn[k] !== 0) {
      const c = Math.cos(turn[k]);
      const sn = Math.sin(turn[k]);
      const dx = x - cx;
      const dy = y - cy;
      x = cx + c * dx - sn * dy;
      y = cy + sn * dx + c * dy;
    }
    return { x: x + shift[k][0], y: y + shift[k][1] };
  };

  let masters = null;
  const calibration = { ...CALIBRATION, ...(spec.calibration ?? {}) };
  const out = {
    id: `synthetic-sequence:${seed}`,
    kind: 'synthetic',
    seed,
    count,
    width: detector.width,
    height: detector.height,
    exposure,
    times,
    gain: detector.gain,
    readNoise: detector.readNoise,
    darkRate: detector.darkRate,
    fullWell: detector.fullWell,
    calibration: 'raw',
    spec,
    /** The three masters, made once from the calibration set of the same seed. */
    get masters() {
      masters ??= buildMasters(
        calibrationSet({ seed, detector: spec.detector }, calibration),
        { gain: detector.gain }
      );
      return masters;
    },
    /** Frame k, raw counts. */
    frameAt(k) {
      const sources = spec.stars.map(s => {
        const v = variables.find(w => w.id === s.id);
        const p = placed(s, k);
        return {
          ...p,
          rate: v ? s.rate * 10 ** (-0.4 * deltaMag[v.id][k]) : s.rate,
        };
      });
      const f = simulateFrame({
        seed,
        detector: spec.detector,
        exposure,
        kind: 'science',
        label: `series${k}`,
        scene: { sky, sources },
        transparency: transparency[k],
      });
      return {
        width: f.width,
        height: f.height,
        exposure,
        values: f.values,
        time: times[k],
      };
    },
    truth: {
      transparency,
      deltaMag,
      shift,
      turnRad: turn,
      replace,
      variables,
      stars: spec.stars,
      positions: (id, k) =>
        placed(
          spec.stars.find(s => s.id === id),
          k
        ),
    },
  };
  return out;
}
