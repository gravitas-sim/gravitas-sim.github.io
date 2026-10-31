// =============================================================================
// The centroid test: a blended neighbour on a frame series (Prompt 228, VETTING.md)
// -----------------------------------------------------------------------------
// transitFrames() draws a postage stamp of a target and a neighbour through the
// calibration lab's frame forward model (js/kernels/detector/frame.js): one of
// the two is eclipsed, on the transit's own shape, and the rest of the light is
// constant. differenceCentroid() reads such a series the way the Kepler and TESS
// pipelines do (Bryson et al. 2013): the centroid of the out-of-transit image
// minus the in-transit image sits where the eclipsed star is, so its offset from
// the target's position, in units of its uncertainty, says whether the transit
// is on the target. The centroid is js/measure/photometry.js centroid() (Prompt
// 180), the window recentring on the rounded position until it stops.
//
// The plain flux-weighted centroid shift of the aperture is reported beside it:
// to first order it is +delta f_n d toward the neighbour when the target
// eclipses and -delta f_t d (toward the target) when the neighbour does, for an
// observed depth delta, and tiny against the difference image's offset.
//
// Only the geometry and the noise of a blend are modelled here: the detector's
// fixed pattern, cosmic rays and saturation are the calibration lab's (Prompt
// 211) and are off. Every frame is synthetic and says so (`truth`).
// =============================================================================

import { simulateFrame } from '../detector/frame.js';
import { centroid } from '../../measure/photometry.js';
import { limbDarkening, transitFlux } from '../../inference/transit.js';
import { DEFAULTS, STAMP } from './constants.js';
import { checkEphemeris } from './depth.js';

const { Math, Float64Array } = globalThis;

/** The transit shape every frame eclipse follows (VETTING.md, "light"). */
export const SHAPE = Object.freeze({
  k: 0.1,
  aRs: 8.6,
  b: 0.3,
  q1: 0.4,
  q2: 0.3,
});

const shapeAt = (times, eph) => {
  const { u1, u2 } = limbDarkening(SHAPE.q1, SHAPE.q2);
  return transitFlux(
    times,
    { t0: eph.t0, P: eph.P, ...SHAPE, u1, u2 },
    { annuli: 96 }
  );
};

/** The ephemeris the frame scenarios use. */
export const FRAME_EPHEMERIS = Object.freeze({
  P: 3.2,
  t0: 0.5,
  duration: 0.12,
});

/** The frame times of a scenario: three transits, each from -1.5 to +1.5 durations in twelfths. */
export function frameTimes(eph = FRAME_EPHEMERIS, cycles = 3) {
  const out = [];
  for (let c = 0; c < cycles; c++)
    for (let j = 0; j <= 36; j++)
      out.push(eph.t0 + c * eph.P + eph.duration * (j / 12 - 1.5));
  return Float64Array.from(out);
}

/**
 * A frame series of a target and a neighbour.
 * @param {object} spec
 * @param {string} spec.seed
 * @param {'target'|'neighbour'} spec.eclipsed - whose light the transit takes
 * @param {number} [spec.rate=3000] - the target's electrons per second
 * @param {number} [spec.q=0.3] - the neighbour's rate over the target's
 * @param {number} [spec.separation=1.6] - pixels
 * @param {number} [spec.angleDeg=40]
 * @param {number} [spec.depth=0.0105] - the observed fractional depth of the summed light at mid-transit
 * @param {number} [spec.rateScale=1] - a multiplier on every rate (the noise-free legs use 10000)
 * @param {object} [spec.ephemeris]
 */
export function transitFrames(spec) {
  const eph = spec.ephemeris ?? FRAME_EPHEMERIS;
  const rate = (spec.rate ?? 3000) * (spec.rateScale ?? 1);
  const q = spec.q ?? 0.3;
  const sep = spec.separation ?? 1.6;
  const ang = ((spec.angleDeg ?? 40) * Math.PI) / 180;
  const depth = spec.depth ?? 0.0105;
  const times = spec.times ?? frameTimes(eph);
  const t = STAMP.target;
  const nb = { x: t.x + sep * Math.cos(ang), y: t.y + sep * Math.sin(ang) };
  const unit = shapeAt(times, eph);
  const mid = 1 - shapeAt([eph.t0], eph)[0];
  const share = spec.eclipsed === 'target' ? 1 / (1 + q) : q / (1 + q);
  const scale = depth / (share * mid);
  const big = (spec.rateScale ?? 1) > 1;
  const detector = {
    width: STAMP.width,
    height: STAMP.height,
    fwhm: STAMP.fwhm,
    qeScatter: 0,
    vignette: 0,
    dustCount: 0,
    hotFraction: 0,
    biasColumnSigma: 0,
    ...(big ? { fullWell: 1e15, adcMax: 1e15 } : {}),
  };
  const bias = 500;
  const gain = 1.5;
  const images = [];
  const fluxes = [];
  for (let k = 0; k < times.length; k++) {
    const m = 1 - scale * (1 - unit[k]);
    const rt = spec.eclipsed === 'target' ? rate * m : rate;
    const rn = spec.eclipsed === 'neighbour' ? rate * q * m : rate * q;
    const f = simulateFrame({
      seed: `${spec.seed}`,
      kind: 'science',
      label: `v${k}`,
      exposure: STAMP.exposure,
      detector,
      cosmicRays: false,
      scene: {
        sky: STAMP.sky,
        sources: [
          { x: t.x, y: t.y, rate: rt },
          { x: nb.x, y: nb.y, rate: rn },
        ],
      },
    });
    const e = new Float64Array(f.values.length);
    for (let i = 0; i < e.length; i++) e[i] = (f.values[i] - bias) * gain;
    images.push(e);
    fluxes.push(m);
  }
  return {
    kind: 'synthetic',
    width: STAMP.width,
    height: STAMP.height,
    times,
    images,
    ephemeris: eph,
    target: { ...t },
    truth: {
      seed: spec.seed,
      eclipsed: spec.eclipsed,
      eclipsedAt: spec.eclipsed === 'target' ? { ...t } : nb,
      neighbour: nb,
      rate,
      q,
      separation: sep,
      depth,
      sky: STAMP.sky,
      eclipsedMultiplier: fluxes,
    },
  };
}

/** Mean and per-pixel sample variance of a set of images. */
function stats(images, idx) {
  const n = idx.length;
  const len = images[0].length;
  const mean = new Float64Array(len);
  const varr = new Float64Array(len);
  for (const k of idx) for (let i = 0; i < len; i++) mean[i] += images[k][i];
  for (let i = 0; i < len; i++) mean[i] /= n;
  for (const k of idx)
    for (let i = 0; i < len; i++) varr[i] += (images[k][i] - mean[i]) ** 2;
  for (let i = 0; i < len; i++) varr[i] /= Math.max(1, n - 1);
  return { n, mean, var: varr };
}

/** Frame indices in transit (|dt| < T14 / 4) and out of it (|dt| > T14). */
export function splitFrames(times, eph) {
  const inT = [];
  const outT = [];
  for (let k = 0; k < times.length; k++) {
    const c = Math.round((times[k] - eph.t0) / eph.P);
    const dt = Math.abs(times[k] - eph.t0 - c * eph.P);
    // A hair inside the stated bounds: frames spaced at T14 / 12 sit on them exactly.
    if (dt < eph.duration / 4 - 1e-9) inT.push(k);
    else if (dt > eph.duration + 1e-9) outT.push(k);
  }
  return { inT, outT };
}

const ring = (v, W, H, half) => {
  // The median of the pixels in the outer ring of the stamp: an estimate of the sky.
  const vals = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (
        Math.min(x, y, W - 1 - x, H - 1 - y) === 0 ||
        Math.hypot(x - (W - 1) / 2, y - (H - 1) / 2) > half
      )
        vals.push(v[y * W + x]);
  vals.sort((a, b) => a - b);
  return vals[vals.length >> 1];
};

/**
 * The difference-image centroid test.
 * @param {{width: number, height: number, times: ArrayLike<number>, images: Float64Array[]}} fr - electrons
 * @param {{P: number, t0: number, duration: number}} eph
 * @param {{x: number, y: number}} target - pixels, 0-based
 * @param {object} [options] - overrides of DEFAULTS and `half`
 */
export function differenceCentroid(fr, eph, target, options) {
  checkEphemeris(eph);
  if (!fr?.images?.length || fr.images.length !== fr.times.length)
    throw new RangeError('the frames and their times differ in number');
  if (!target || !Number.isFinite(target.x) || !Number.isFinite(target.y))
    throw new TypeError('the target position is missing');
  const T = { ...DEFAULTS, ...(options ?? {}) };
  const half = options?.half ?? STAMP.half;
  const W = fr.width;
  const H = fr.height;
  const { inT, outT } = splitFrames(fr.times, eph);
  const out = {
    test: 'centroid',
    verdict: 'inconclusive',
    reason: 'too-few-frames',
    nIn: inT.length,
    nOut: outT.length,
    dic: null,
    offset: null,
    sigma: null,
    r: NaN,
    exclusionRadius: NaN,
    snr: NaN,
    apertureShift: null,
    thresholds: {
      rFail: T.rFail,
      requiredExclusionPx: T.requiredExclusionPx,
      minDifferenceSnr: T.minDifferenceSnr,
    },
  };
  if (inT.length < T.minFramesPerSide || outT.length < T.minFramesPerSide)
    return out;
  const a = stats(fr.images, inT);
  const b = stats(fr.images, outT);
  const len = W * H;
  const D = new Float64Array(len);
  const V = new Float64Array(len);
  for (let i = 0; i < len; i++) {
    D[i] = b.mean[i] - a.mean[i];
    V[i] = b.var[i] / b.n + a.var[i] / a.n;
  }
  const c = centroid(
    { width: W, height: H, values: D },
    { x: target.x, y: target.y, half, sky: 0, variance: V }
  );
  out.apertureShift = apertureShift(a, b, W, H, target, options);
  if (!c.ok) {
    out.reason =
      c.code === 'no-flux' ? 'no-difference-signal' : `centroid-${c.code}`;
    return out;
  }
  // The difference image's summed signal in the window the centroid settled on.
  const [wx, wy] = c.window;
  let sum = 0;
  let v = 0;
  for (let j = wy - half; j <= wy + half; j++)
    for (let i = wx - half; i <= wx + half; i++) {
      sum += D[j * W + i];
      v += V[j * W + i];
    }
  out.snr = sum / Math.sqrt(v);
  out.dic = { x: c.x, y: c.y };
  out.offset = { dx: c.x - target.x, dy: c.y - target.y };
  out.sigma = { x: c.sigmaX, y: c.sigmaY };
  out.r = Math.hypot(out.offset.dx / c.sigmaX, out.offset.dy / c.sigmaY);
  out.exclusionRadius = T.rFail * Math.max(c.sigmaX, c.sigmaY);
  if (!(out.snr >= T.minDifferenceSnr)) out.reason = 'no-difference-signal';
  else if (out.r >= T.rFail) {
    out.verdict = 'fail';
    out.reason = 'off-target';
  } else if (out.exclusionRadius > T.requiredExclusionPx)
    out.reason = 'low-power';
  else {
    out.verdict = 'pass';
    out.reason = 'on-target';
  }
  return out;
}

/** The aperture's flux-weighted centroid in transit minus out of it, with its uncertainty. */
function apertureShift(a, b, W, H, target, options) {
  const half = options?.apertureHalf ?? STAMP.apertureHalf;
  const mk = s => ({ width: W, height: H, values: s.mean });
  const skyA = ring(a.mean, W, H, half + 2);
  const skyB = ring(b.mean, W, H, half + 2);
  const cin = centroid(mk(a), {
    x: target.x,
    y: target.y,
    half,
    sky: skyA,
    variance: Float64Array.from(a.var, x => x / a.n),
  });
  const cout = centroid(mk(b), {
    x: target.x,
    y: target.y,
    half,
    sky: skyB,
    variance: Float64Array.from(b.var, x => x / b.n),
  });
  if (!cin.ok || !cout.ok) return null;
  return {
    dx: cin.x - cout.x,
    dy: cin.y - cout.y,
    sigmaX: Math.hypot(cin.sigmaX, cout.sigmaX),
    sigmaY: Math.hypot(cin.sigmaY, cout.sigmaY),
  };
}
