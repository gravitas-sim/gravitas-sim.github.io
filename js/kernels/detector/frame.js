// =============================================================================
// A CCD frame from a source list: what the detector adds to the light
// -----------------------------------------------------------------------------
// The forward model of the calibration lab (CALIBRATION_LAB.md). A telescope
// delivers light; the detector turns it into numbers and leaves its own marks
// on them. Each mark is a stated parameter, drawn from a seed:
//
//   flat-field structure   sensitivity of each pixel: a smooth fall-off to the
//                          corners (vignetting), pixel-to-pixel scatter and
//                          dust shadows. Normalised to a mean of 1. It
//                          multiplies the light (sky and stars), not the dark.
//   dark current           electrons per second per pixel, a floor and some
//                          hot pixels; it grows with the exposure
//   photon noise           Poisson, on the electrons the light and the dark made
//   cosmic rays            a few events a frame, thousands of electrons in one
//                          or two pixels
//   saturation             a pixel holds at most `fullWell` electrons, and the
//                          converter at most `adcMax` counts
//   read noise             Gaussian, in electrons, added once per read
//   bias                   a fixed offset in counts (the converter's zero),
//                          with a column pattern, added to every frame
//
// then divided by the gain (electrons per count) and rounded to whole counts.
//
// Order in a science frame: electrons = Poisson(flat x light + dark x t) + cosmic
// rays, clipped at the full well; + read noise; counts = bias + electrons / gain,
// rounded, clipped to [0, adcMax].
//
// Simplifications, stated so a student can look for them: no blooming (a
// saturated pixel does not spill into its neighbors), no charge-transfer
// loss, no nonlinearity, a Gaussian point-spread function, stars that fall on
// the flat's structure but not on a color term. Poisson draws above 30 electrons
// use a Gaussian of the same mean and variance (its third moment is 1/sqrt(N)
// too small).
//
// Pure: no DOM. Seeds are text (js/rng.js); a frame is a pure function of its
// spec, so the same spec is the same frame.
// =============================================================================

import { stream } from '../../random/streams.js';

// Free globals are slow under Jest's vm; the local names are not.
const { Math, Float64Array, Int32Array } = globalThis;

export const VERSION = '1.0.0';
const FWHM_PER_SIGMA = 2 * Math.sqrt(2 * Math.LN2);

/** erf to 1.5e-7 (Abramowitz and Stegun 7.1.26), as js/forward/models/image.js. */
function erf(x) {
  const s = x < 0 ? -1 : 1;
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) *
      t +
      0.254829592) *
      t *
      Math.exp(-x * x);
  return s * y;
}

/** The fraction of a Gaussian of this sigma, centred at c, inside [lo, hi]. */
export const fractionIn = (lo, hi, c, sigma) =>
  0.5 *
  (erf((hi - c) / (sigma * Math.SQRT2)) - erf((lo - c) / (sigma * Math.SQRT2)));

/**
 * The detector and telescope the lessons use: a 0.4 m teaching telescope and a
 * small CCD. Every field may be overridden by a spec.
 */
export const DEFAULT_DETECTOR = Object.freeze({
  width: 48,
  height: 48,
  /** electrons per count */
  gain: 1.5,
  /** electrons, rms, per read */
  readNoise: 8,
  /** counts */
  biasLevel: 500,
  /** counts, rms, of the fixed column offsets */
  biasColumnSigma: 2,
  /** electrons per second per pixel, the floor */
  darkRate: 0.1,
  /** the fraction of pixels that are hot, and their extra electrons per second */
  hotFraction: 0.01,
  hotRate: 4,
  /** electrons a pixel holds before it saturates */
  fullWell: 50000,
  /** the converter's largest count */
  adcMax: 65535,
  /** pixel-to-pixel sensitivity scatter, as a fraction */
  qeScatter: 0.01,
  /** the corner's loss against the center, as a fraction */
  vignette: 0.3,
  /** dust shadows: how many, and the fraction of light each blocks at its middle */
  dustCount: 3,
  dustDepth: 0.08,
  /** point-spread function, full width at half maximum, pixels */
  fwhm: 2.8,
  /** cosmic-ray events per second on the whole frame */
  cosmicRate: 0.02,
});

/** What an exposure sees: the sky and the stars, in electrons per second. */
export const DEFAULT_SCENE = Object.freeze({
  /** electrons per second per pixel */
  sky: 3,
  /** [{ x, y, rate }] positions in pixels (0-based, pixel centres at integers), rate in electrons per second */
  sources: [],
});

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** A standard normal from a stream (Box-Muller; one draw of two per call). */
function gaussian(rng) {
  let u = rng();
  while (u <= Number.EPSILON) u = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

/** A Poisson count of mean lambda from a stream. */
function poisson(rng, lambda) {
  if (!(lambda > 0)) return 0;
  if (lambda < 30) {
    const limit = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    do {
      k++;
      p *= rng();
    } while (p > limit);
    return k - 1;
  }
  return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * gaussian(rng)));
}

/** A fresh stream keyed by the seed and a label. */
const streamOf = (seed, label) => stream('noise', seed, label);

/** The detector, completed with defaults and checked. */
export function normalizeDetector(d = {}) {
  const out = { ...DEFAULT_DETECTOR, ...d };
  const pos = ['width', 'height', 'gain', 'fullWell', 'adcMax', 'fwhm'];
  for (const k of pos)
    if (!(Number.isFinite(out[k]) && out[k] > 0))
      throw new Error(`the detector's ${k} is a positive number`);
  const nonneg = [
    'readNoise',
    'biasLevel',
    'biasColumnSigma',
    'darkRate',
    'hotFraction',
    'hotRate',
    'qeScatter',
    'dustCount',
    'dustDepth',
    'cosmicRate',
  ];
  for (const k of nonneg)
    if (!(Number.isFinite(out[k]) && out[k] >= 0))
      throw new Error(`the detector's ${k} is zero or more`);
  if (!(out.vignette >= 0 && out.vignette < 1))
    throw new Error('the detector’s vignette is a fraction below 1');
  if (!(Number.isInteger(out.width) && Number.isInteger(out.height)))
    throw new Error('the detector’s width and height are whole pixels');
  if (out.width * out.height > 1_000_000)
    throw new Error('a frame is at most a million pixels');
  return out;
}

/**
 * The fixed pattern of a detector: what is the same in every frame it makes.
 * Keyed by the seed, so a calibration set and the science frames taken with it
 * share it, as at a telescope.
 *
 * @returns {{flat: Float64Array, dark: Float64Array, biasPattern: Float64Array, hot: Int32Array}}
 *   `flat` has mean 1; `dark` is electrons per second per pixel; `biasPattern`
 *   is counts, by column.
 */
export function detectorPattern(seed, detector) {
  const d = normalizeDetector(detector);
  const { width: W, height: H } = d;
  const rng = streamOf(seed, 'pattern');
  const flat = new Float64Array(W * H);
  const dust = Array.from({ length: Math.round(d.dustCount) }, () => ({
    x: rng() * W,
    y: rng() * H,
    r: 3 + rng() * 3,
  }));
  const cx = (W - 1) / 2;
  const cy = (H - 1) / 2;
  const rMax2 = cx * cx + cy * cy;
  let sum = 0;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const v = 1 - d.vignette * (((x - cx) ** 2 + (y - cy) ** 2) / rMax2);
      let s = 1;
      for (const u of dust) {
        const q = ((x - u.x) ** 2 + (y - u.y) ** 2) / (u.r * u.r);
        s -= d.dustDepth * Math.exp(-q);
      }
      const q = 1 + d.qeScatter * gaussian(rng);
      const f = v * s * q;
      flat[y * W + x] = f;
      sum += f;
    }
  const mean = sum / (W * H);
  for (let i = 0; i < flat.length; i++) flat[i] /= mean;
  const dark = new Float64Array(W * H).fill(d.darkRate);
  const hot = [];
  for (let i = 0; i < dark.length; i++)
    if (rng() < d.hotFraction) {
      dark[i] += d.hotRate * (0.5 + rng());
      hot.push(i);
    }
  const biasPattern = new Float64Array(W);
  for (let x = 0; x < W; x++)
    biasPattern[x] = d.biasColumnSigma * gaussian(rng);
  return { flat, dark, biasPattern, hot: Int32Array.from(hot) };
}

/** Electrons per pixel from point sources of the given rate and exposure. */
function lightMap(d, sources, exposure, scale) {
  const { width: W, height: H } = d;
  const sigma = d.fwhm / FWHM_PER_SIGMA;
  const out = new Float64Array(W * H);
  const reach = Math.ceil(6 * sigma) + 1;
  for (const s of sources) {
    const e = s.rate * exposure * scale;
    const x0 = Math.max(0, Math.floor(s.x) - reach);
    const x1 = Math.min(W - 1, Math.ceil(s.x) + reach);
    const y0 = Math.max(0, Math.floor(s.y) - reach);
    const y1 = Math.min(H - 1, Math.ceil(s.y) + reach);
    for (let y = y0; y <= y1; y++) {
      const fy = fractionIn(y - 0.5, y + 0.5, s.y, sigma);
      for (let x = x0; x <= x1; x++)
        out[y * W + x] += e * fractionIn(x - 0.5, x + 0.5, s.x, sigma) * fy;
    }
  }
  return out;
}

/**
 * One frame.
 *
 * @param {object} spec
 * @param {string} spec.seed - Text; keys the fixed pattern and this frame's draws
 * @param {'science'|'bias'|'dark'|'flat'} [spec.kind='science']
 * @param {string} [spec.label] - Keys this frame's own noise (default: the kind)
 * @param {number} [spec.exposure=0] - Seconds (a bias is 0)
 * @param {object} [spec.detector] - Overrides of DEFAULT_DETECTOR
 * @param {object} [spec.scene] - { sky, sources } for a science frame
 * @param {number} [spec.transparency=1] - A multiplier on the stars (clouds, air)
 * @param {number} [spec.flatLevel=20000] - Electrons per pixel a flat holds
 * @param {boolean} [spec.cosmicRays] - Default: science and dark frames only
 * @returns {{kind, width, height, exposure, values: Float64Array, truth: object}}
 *   `values` are counts. `truth` holds what the frame was made of.
 */
export function simulateFrame(spec) {
  const d = normalizeDetector(spec.detector);
  const kind = spec.kind ?? 'science';
  if (!['science', 'bias', 'dark', 'flat'].includes(kind))
    throw new Error(`no frame kind ${kind}`);
  const seed = String(spec.seed ?? 'frame');
  const exposure = kind === 'bias' ? 0 : (spec.exposure ?? 0);
  if (!(exposure >= 0)) throw new Error('the exposure is zero or more');
  const { width: W, height: H } = d;
  const n = W * H;
  const pat = detectorPattern(seed, d);
  const rng = streamOf(seed, `frame:${spec.label ?? kind}`);
  const transparency = spec.transparency ?? 1;
  const scene = { ...DEFAULT_SCENE, ...(spec.scene ?? {}) };

  // Expected electrons per pixel, before the draw.
  const mean = new Float64Array(n);
  let flatLevel = 0;
  let starMap = null;
  if (kind === 'science') {
    starMap = lightMap(d, scene.sources, exposure, transparency);
    for (let i = 0; i < n; i++)
      mean[i] =
        pat.flat[i] * (scene.sky * exposure + starMap[i]) +
        pat.dark[i] * exposure;
  } else if (kind === 'flat') {
    flatLevel = spec.flatLevel ?? 20000;
    for (let i = 0; i < n; i++)
      mean[i] = pat.flat[i] * flatLevel + pat.dark[i] * exposure;
  } else if (kind === 'dark') {
    for (let i = 0; i < n; i++) mean[i] = pat.dark[i] * exposure;
  }

  const electrons = new Float64Array(n);
  for (let i = 0; i < n; i++) electrons[i] = poisson(rng, mean[i]);

  // Cosmic rays: a Poisson number of events, each a core pixel and sometimes
  // a neighbor with 30 percent of its charge.
  const cosmic = [];
  const wantsCosmic =
    spec.cosmicRays ?? (kind === 'science' || kind === 'dark');
  if (wantsCosmic && d.cosmicRate > 0 && exposure > 0) {
    const events = poisson(rng, d.cosmicRate * exposure);
    for (let k = 0; k < events; k++) {
      const x = Math.floor(rng() * W);
      const y = Math.floor(rng() * H);
      const e = 3000 + 12000 * rng();
      const dx = rng() < 0.5 ? 1 : -1;
      const withNeighbor = rng() < 0.5;
      electrons[y * W + x] += e;
      cosmic.push({ x, y, electrons: e });
      if (withNeighbor && x + dx >= 0 && x + dx < W) {
        electrons[y * W + x + dx] += 0.3 * e;
        cosmic.push({ x: x + dx, y, electrons: 0.3 * e });
      }
    }
  }

  let saturated = 0;
  const values = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let e = electrons[i];
    if (e >= d.fullWell) {
      e = d.fullWell;
      saturated++;
    }
    e += d.readNoise * gaussian(rng);
    const c = d.biasLevel + pat.biasPattern[i % W] + e / d.gain;
    values[i] = clamp(Math.round(c), 0, d.adcMax);
  }

  return {
    kind,
    width: W,
    height: H,
    exposure,
    values,
    truth: {
      detector: d,
      scene: kind === 'science' ? scene : null,
      transparency,
      flatLevel,
      flat: pat.flat,
      dark: pat.dark,
      biasPattern: pat.biasPattern,
      hot: pat.hot,
      starElectrons: starMap,
      cosmic,
      saturated,
    },
  };
}

/**
 * A calibration set from the same detector: bias frames, dark frames and flat
 * frames, each with its own noise and the shared fixed pattern.
 *
 * @param {object} spec - seed, detector; as simulateFrame
 * @param {object} [opts]
 * @param {number} [opts.nBias=10]
 * @param {number} [opts.nDark=7]
 * @param {number} [opts.darkExposure=120] - seconds
 * @param {number} [opts.nFlat=10]
 * @param {number} [opts.flatExposure=5] - seconds
 * @param {number} [opts.flatLevel=20000] - electrons per pixel
 */
export function calibrationSet(spec, opts = {}) {
  const {
    nBias = 10,
    nDark = 7,
    darkExposure = 120,
    nFlat = 10,
    flatExposure = 5,
    flatLevel = 20000,
  } = opts;
  const base = { seed: spec.seed, detector: spec.detector };
  const make = (kind, count, extra) =>
    Array.from({ length: count }, (_, k) =>
      simulateFrame({ ...base, kind, label: `${kind}${k}`, ...extra })
    );
  return {
    bias: make('bias', nBias, {}),
    dark: make('dark', nDark, { exposure: darkExposure }),
    flat: make('flat', nFlat, { exposure: flatExposure, flatLevel }),
  };
}

/**
 * A time series of science frames of one field: every frame the same stars,
 * a variable star among them, and a transparency that wanders from frame to
 * frame (thin cloud, air mass) which multiplies every star at once.
 *
 * @param {object} spec - seed, detector, exposure, scene ({ sky, sources })
 * @param {object} series
 * @param {number} series.count - Frames
 * @param {number} series.cadence - Days between frames
 * @param {number} [series.variable=0] - Index into sources of the variable star
 * @param {number} series.period - Days
 * @param {number} series.amplitude - Semi-amplitude, magnitudes
 * @param {number} [series.phase=0] - Cycles at the first frame
 * @param {number} [series.cloud=0.1] - rms of the transparency, a fraction
 * @returns {{frames: Array<object>, times: Float64Array, truth: object}}
 */
export function simulateSeries(spec, series) {
  const {
    count,
    cadence,
    variable = 0,
    period,
    amplitude,
    phase = 0,
    cloud = 0.1,
  } = series;
  if (!(Number.isInteger(count) && count >= 2 && count <= 400))
    throw new Error('a series has 2 to 400 frames');
  const rng = streamOf(spec.seed, 'transparency');
  const sources0 = spec.scene?.sources ?? [];
  const times = new Float64Array(count);
  const transparency = new Float64Array(count);
  const deltaMag = new Float64Array(count);
  const frames = [];
  let z = gaussian(rng);
  for (let k = 0; k < count; k++) {
    times[k] = k * cadence;
    // A damped walk, correlation 0.8 from frame to frame, never below 0.3.
    if (k > 0) z = 0.8 * z + Math.sqrt(1 - 0.64) * gaussian(rng);
    transparency[k] = clamp(1 + cloud * z, 0.3, 1.5);
    deltaMag[k] =
      amplitude * Math.sin(2 * Math.PI * (phase + times[k] / period));
    const sources = sources0.map((s, i) =>
      i === variable ? { ...s, rate: s.rate * 10 ** (-0.4 * deltaMag[k]) } : s
    );
    frames.push(
      simulateFrame({
        ...spec,
        kind: 'science',
        label: `series${k}`,
        scene: { ...spec.scene, sources },
        transparency: transparency[k],
      })
    );
  }
  return {
    frames,
    times,
    truth: { transparency, deltaMag, variable, period, amplitude, phase },
  };
}

/** Counts to electrons. */
export const toElectrons = (frame, gain) => ({
  ...frame,
  values: Float64Array.from(frame.values, v => v * gain),
});
