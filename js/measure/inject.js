// =============================================================================
// Completeness by injection (Prompt 184, INJECTION.md)
// -----------------------------------------------------------------------------
// A detector misses faint sources, and how many depends on the frame it looked
// at. Here sources of chosen magnitudes are added to a COPY of a frame, the
// detector of Prompt 183 looks again, and the share it finds, by magnitude, is
// that frame's completeness.
//
//   plan       positions and magnitudes from stream('injection', seed, 'plan',
//              trial): uniform places 3 FWHM from the border and 4 FWHM from
//              each other and from every source the frame already holds
//   inject     each source spread through the pixel-integrated PSF of detect.js
//              (Gaussian or Moffat), each pixel's added electrons a Poisson draw
//              of its mean from stream('noise', seed, 'shot', trial)
//   recover    a source is recovered when the detector lists one within the
//              match radius; each detection answers at most one source
//   curve      bins of magnitude, k of n with the exact binomial interval, the
//              magnitudes where the curve crosses 0.5 and 0.9, and what it was
//              measured under (the PSF, the noise, the settings)
//
// The magnitude is Prompt 180's instrumental one, -2.5 log10 of the rate in
// electrons a second. A curve is the detection probability for the PSF and the
// noise it was measured under and for no other: `appliesTo` refuses a frame that
// differs, and the selection function made from a curve refuses a magnitude
// outside the injected range instead of extrapolating. A run is a pure function
// of the frame and the spec, so the same seed is the same run. Pure; no DOM.
// =============================================================================

import { gaussian, stream } from '../random/streams.js';
import { decodedBytes, LIMITS as FRAME_LIMITS } from '../dataKinds/limits.js';
import { adapt } from './photometry.js';
import { DEFAULTS as DETECT, detectIn, modelPixels } from './detect.js';
import { betaI } from '../kernels/statistics/special.js';
import { selection } from '../kernels/statistics/selection.js';

const { Math, Float64Array, Uint8Array } = globalThis;

export const VERSION = 1;
export const STEP = 'image-injection';
export const LIMITS = Object.freeze({
  countPerTrial: 500,
  trials: 200,
  total: 20000,
  bins: 60,
  fwhm: Object.freeze([0.5, 50]),
});
export const DEFAULTS = Object.freeze({
  count: 20,
  trials: 10,
  binWidth: 0.25,
  matchRadius: 2,
  margin: 3,
  separation: 4,
  level: 0.6827,
  model: 'gaussian',
  beta: 2.5,
});
/** What a curve must share with the frame it is used on (INJECTION.md). */
export const APPLIES = Object.freeze({ fwhm: 0.1, noise: 0.1 });
/** The signal to noise range a default magnitude range spans. */
export const SNR_RANGE = Object.freeze({ high: 12, low: 2.5 });
const ATTEMPTS = 200;
const SHOT_FLOOR = 1e-6;
const LISTED = 2000;
const SIGMA_PER_FWHM = 1 / (2 * Math.sqrt(2 * Math.LN2));

const refuse = (code, extra = {}) => ({ ok: false, code, ...extra });
/** An error that carries a stable code. */
export class InjectionError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'InjectionError';
    this.code = code;
  }
}

// ---- magnitudes ------------------------------------------------------------------

export const magnitudeOf = (flux, exposure) =>
  -2.5 * Math.log10(flux / exposure);
export const fluxOf = (m, exposure) => exposure * 10 ** (-0.4 * m);
/** Total electrons of a Gaussian source of matched-filter signal to noise s (INJECTION.md a1). */
export const fluxForSnr = (s, fwhm, noise) =>
  s * Math.sqrt(4 * Math.PI) * fwhm * SIGMA_PER_FWHM * noise;

/** The magnitude range of signal to noise 12 down to 2.5 at this PSF and noise. */
export function suggestRange({ fwhm, noise, exposure }) {
  return {
    min: magnitudeOf(fluxForSnr(SNR_RANGE.high, fwhm, noise), exposure),
    max: magnitudeOf(fluxForSnr(SNR_RANGE.low, fwhm, noise), exposure),
  };
}

// ---- the exact binomial interval --------------------------------------------------

/** The x with f(x) = p by bisection on [0, 1] (f increasing). */
function invert(f, p) {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 200; i++) {
    const mid = 0.5 * (lo + hi);
    if (mid === lo || mid === hi) break;
    if (f(mid) < p) lo = mid;
    else hi = mid;
  }
  return 0.5 * (lo + hi);
}

/**
 * The exact (Clopper and Pearson 1934) two-sided interval for k successes in n
 * trials: its coverage is at least `level` at every true probability.
 */
export function binomialInterval(k, n, level = DEFAULTS.level) {
  const a = 1 - level;
  return {
    lo: k === 0 ? 0 : invert(x => betaI(x, k, n - k + 1), a / 2),
    hi: k === n ? 1 : invert(x => betaI(x, k + 1, n - k), 1 - a / 2),
    level,
    method: 'clopper-pearson',
  };
}

// ---- the plan ----------------------------------------------------------------------

const uniformMagnitude = (u, { min, max, slope = 0 }) => {
  if (!slope || max === min) return min + u * (max - min);
  const a = 10 ** (slope * min);
  const b = 10 ** (slope * max);
  return Math.log10(a + u * (b - a)) / slope;
};

/**
 * One trial's sources.
 * @param {{seed: string|number, trial: number, count: number, width: number, height: number,
 *   exposure: number, magnitude: {min: number, max: number, slope?: number},
 *   fwhm: number, margin?: number, separation?: number, existing?: Array<{x: number, y: number}>}} p
 * @returns {{sources: Array<{x: number, y: number, m: number, flux: number}>, unplaced: number}}
 */
export function planTrial(p) {
  const draw = stream('injection', p.seed, 'plan', p.trial);
  const margin = (p.margin ?? DEFAULTS.margin) * p.fwhm;
  const apart = (p.separation ?? DEFAULTS.separation) * p.fwhm;
  const spanX = p.width - 1 - 2 * margin;
  const spanY = p.height - 1 - 2 * margin;
  const sources = [];
  let unplaced = 0;
  if (!(spanX > 0 && spanY > 0)) return { sources, unplaced: p.count };
  const clear = (x, y) =>
    sources.every(s => Math.hypot(s.x - x, s.y - y) >= apart) &&
    (p.existing ?? []).every(s => Math.hypot(s.x - x, s.y - y) >= apart);
  for (let j = 0; j < p.count; j++) {
    let done = false;
    for (let attempt = 0; attempt < ATTEMPTS && !done; attempt++) {
      const x = margin + draw() * spanX;
      const y = margin + draw() * spanY;
      if (!clear(x, y)) continue;
      const m = uniformMagnitude(draw(), p.magnitude);
      sources.push({ x, y, m, flux: fluxOf(m, p.exposure) });
      done = true;
    }
    if (!done) unplaced++;
  }
  return { sources, unplaced };
}

// ---- the injection -----------------------------------------------------------------

/** Window half-width, pixels, beyond which a source's light is dropped (Gaussian 6 sigma; Moffat 5 FWHM). */
const reachOf = (model, fwhm) =>
  model === 'moffat'
    ? Math.ceil(5 * fwhm)
    : Math.ceil(6 * fwhm * SIGMA_PER_FWHM) + 1;

const parOf = (psf, s) =>
  psf.model === 'moffat'
    ? [s.flux, s.x, s.y, psf.fwhm, psf.beta]
    : [s.flux, s.x, s.y, psf.fwhm];

/**
 * The expected electrons the sources add to every pixel, noise-free, through the
 * pixel-integrated PSF of detect.js, and the windows each touched.
 * @returns {{map: Float64Array, windows: Array<{x0: number, y0: number, n: number}>}}
 */
export function expectedMap(width, height, sources, psf) {
  const map = new Float64Array(width * height);
  const R = reachOf(psf.model, psf.fwhm);
  const n = 2 * R + 1;
  const windows = [];
  for (const s of sources) {
    const x0 = Math.round(s.x) - R;
    const y0 = Math.round(s.y) - R;
    const { m } = modelPixels(psf.model, parOf(psf, s), x0, y0, n);
    windows.push({ x0, y0, n });
    for (let j = 0; j < n; j++) {
      const y = y0 + j;
      if (y < 0 || y >= height) continue;
      for (let i = 0; i < n; i++) {
        const x = x0 + i;
        if (x >= 0 && x < width) map[y * width + x] += m[j * n + i];
      }
    }
  }
  return { map, windows };
}

/** A Poisson count of mean mu: exact below 30, a Gaussian of equal mean and variance above (the detector kernel's rule). */
function poissonDraw(rng, normal, mu) {
  if (mu < 30) {
    const limit = Math.exp(-mu);
    let k = 0;
    let p = 1;
    do {
      k++;
      p *= rng();
    } while (p > limit);
    return k - 1;
  }
  return Math.max(0, Math.round(mu + Math.sqrt(mu) * normal()));
}

/**
 * The electrons the sources add: each pixel they touch gets a Poisson draw of
 * its mean (pixels with a mean below 1e-6 electrons draw nothing), in the order
 * of the windows, each pixel once.
 * @returns {Float64Array} the added electrons, the frame's size
 */
export function shotAdded(width, height, expected, windows, seed, trial) {
  const rng = stream('noise', seed, 'shot', trial);
  const normal = gaussian(rng);
  const added = new Float64Array(width * height);
  const seen = new Uint8Array(width * height);
  for (const { x0, y0, n } of windows)
    for (let j = 0; j < n; j++) {
      const y = y0 + j;
      if (y < 0 || y >= height) continue;
      for (let i = 0; i < n; i++) {
        const x = x0 + i;
        if (x < 0 || x >= width) continue;
        const p = y * width + x;
        if (seen[p]) continue;
        seen[p] = 1;
        if (expected[p] > SHOT_FLOOR)
          added[p] = poissonDraw(rng, normal, expected[p]);
      }
    }
  return added;
}

/** The adapted frame with the sources added to a copy of its electrons; the frame itself is never written. */
export function inject(a, sources, psf, { seed, trial }) {
  const { width: W, height: H, values } = a.image;
  const { map, windows } = expectedMap(W, H, sources, psf);
  const added = shotAdded(W, H, map, windows, seed, trial);
  const out = Float64Array.from(values);
  for (let i = 0; i < out.length; i++) out[i] += added[i];
  return { ...a, image: { ...a.image, values: out }, truth: { map, added } };
}

// ---- matching ----------------------------------------------------------------------

/**
 * Detections answer injected sources, the nearest pairs first, each at most one.
 * @returns {{recovered: Array<?object>, extra: Array<object>}} the detection that answers each source (or null), and the detections that answer none and are not near a source the frame already held
 */
export function match(sources, found, radius, baseline = []) {
  const pairs = [];
  sources.forEach((s, i) =>
    found.forEach((d, j) => {
      const r = Math.hypot(s.x - d.x, s.y - d.y);
      if (r <= radius) pairs.push([r, i, j]);
    })
  );
  pairs.sort((p, q) => p[0] - q[0] || p[1] - q[1] || p[2] - q[2]);
  const recovered = sources.map(() => null);
  const used = new Set();
  for (const [r, i, j] of pairs) {
    if (recovered[i] || used.has(j)) continue;
    recovered[i] = { ...found[j], distance: r };
    used.add(j);
  }
  const extra = found.filter(
    (d, j) =>
      !used.has(j) &&
      !baseline.some(b => Math.hypot(b.x - d.x, b.y - d.y) <= radius)
  );
  return { recovered, extra };
}

// ---- the spec, its limits, the memory bound ----------------------------------------

/** The decoded bytes an injection holds: the frame's planes and one Float64 plane for the copy (js/dataKinds/limits.js). */
export function memoryBytes(a) {
  const { width, height } = a.image;
  return (
    decodedBytes(width, height, {
      data: true,
      variance: Boolean(a.variance),
      mask: Boolean(a.mask),
    }) +
    FRAME_LIMITS.bytesPerPixel.data * width * height
  );
}

/** The spec with its defaults, or the refusal naming the parameter that is out of bounds. */
export function checkSpec(spec = {}) {
  const s = { ...DEFAULTS, ...spec };
  const bad = name => refuse('bad-parameter', { name });
  const whole = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
  if (!(typeof s.seed === 'string' || Number.isFinite(s.seed)) || s.seed === '')
    return bad('seed');
  if (!whole(s.count, 1, LIMITS.countPerTrial)) return bad('count');
  if (!whole(s.trials, 1, LIMITS.trials)) return bad('trials');
  if (s.count * s.trials > LIMITS.total) return bad('total');
  if (!(s.fwhm >= LIMITS.fwhm[0] && s.fwhm <= LIMITS.fwhm[1]))
    return bad('fwhm');
  if (s.model !== 'gaussian' && s.model !== 'moffat') return bad('model');
  if (s.model === 'moffat' && !(s.beta > 1.05 && s.beta <= 60))
    return bad('beta');
  for (const k of ['matchRadius', 'margin', 'separation'])
    if (!(s[k] > 0 && s[k] <= 50)) return bad(k);
  if (!(s.level > 0 && s.level < 1)) return bad('level');
  if (s.magnitude) {
    const { min, max, slope = 0 } = s.magnitude;
    if (!(Number.isFinite(min) && Number.isFinite(max) && min <= max))
      return bad('magnitude');
    if (!Number.isFinite(slope) || Math.abs(slope) > 5) return bad('slope');
    if (!(s.binWidth > 0 && Number.isFinite(s.binWidth)))
      return bad('binWidth');
    if (Math.max(1, Math.ceil((max - min) / s.binWidth - 1e-9)) > LIMITS.bins)
      return bad('binWidth');
  } else if (!(s.binWidth > 0)) return bad('binWidth');
  return { ok: true, spec: s };
}

const medianSample = values => {
  const step = Math.max(1, Math.floor(values.length / 20000));
  const v = [];
  for (let i = 0; i < values.length; i += step)
    if (Number.isFinite(values[i])) v.push(values[i]);
  v.sort((p, q) => p - q);
  return v.length ? v[Math.floor(v.length / 2)] : 0;
};

const meshMedian = (mesh, field) => {
  const v = Array.from(mesh?.[field] ?? [])
    .filter(Number.isFinite)
    .sort((p, q) => p - q);
  return v.length ? v[Math.floor(v.length / 2)] : null;
};

/** What a curve is measured under (INJECTION.md): the PSF, the frame's noise and sky, the detection settings. */
export function conditionsOf(a, det, spec) {
  return {
    psf: {
      model: spec.model,
      fwhm: spec.fwhm,
      ...(spec.model === 'moffat' ? { beta: spec.beta } : {}),
      source: spec.psfSource ?? 'entered',
    },
    noise: meshMedian(det.mesh, 'noise'),
    sky: meshMedian(det.mesh, 'level'),
    exposure: a.exposure,
    unit: a.unit,
    route: a.route,
    detection: { ...det.params },
  };
}

/**
 * Whether a curve is the detection probability on another frame: its PSF and noise within the stated fractions and the detection settings equal.
 * @returns {{ok: true}|{ok: false, code: 'not-applicable', differs: string[]}}
 */
export function appliesTo(curveConditions, other) {
  const c = curveConditions;
  const differs = [];
  if (!(
    Math.abs(other.psf.fwhm / c.psf.fwhm - 1) <= APPLIES.fwhm &&
    other.psf.model === c.psf.model
  ))
    differs.push('psf');
  if (!(Math.abs(other.noise / c.noise - 1) <= APPLIES.noise))
    differs.push('noise');
  if (JSON.stringify(other.detection) !== JSON.stringify(c.detection))
    differs.push('detection');
  return differs.length ? refuse('not-applicable', { differs }) : { ok: true };
}

// ---- a run -------------------------------------------------------------------------

/** Peak fraction of a source's light in its brightest pixel (centred on a pixel). */
const peakFraction = psf =>
  modelPixels(
    psf.model,
    psf.model === 'moffat'
      ? [1, 0, 0, psf.fwhm, psf.beta]
      : [1, 0, 0, psf.fwhm],
    -1,
    -1,
    3
  ).m[4];

/**
 * Set a run up on an adapted frame: the checks, the detector on the frame as it
 * is (the sources it already holds and the noise and sky it will be measured
 * under), the range. Nothing is made before every check has passed.
 * @param {object} a - adapt()'s result
 * @param {object} spec - seed, count, trials, fwhm, magnitude and the rest (checkSpec)
 * @param {{detector?: Function, planner?: Function}} [o] - the detector (default:
 *   detect.js detectIn) and a planner `(trial, run) => {sources, unplaced}` that
 *   replaces the random plan (the oracle's legs run a plan drawn elsewhere)
 */
export function start(a, spec, o = {}) {
  const detector = o.detector ?? detectIn;
  if (!a?.ok) return a ?? refuse('no-frame');
  if (a.route === 'variance' && a.unit !== 'electron')
    return refuse('unit', { unit: a.unit });
  const checked = checkSpec(spec);
  if (!checked.ok) return checked;
  const bytes = memoryBytes(a);
  if (!(bytes <= FRAME_LIMITS.maxDecodedBytes))
    return refuse('too-large', {
      bytes,
      limit: FRAME_LIMITS.maxDecodedBytes,
    });
  const s = checked.spec;
  const { width: W, height: H } = a.image;
  const exposure = a.exposure;
  const psf = {
    model: s.model,
    fwhm: s.fwhm,
    ...(s.model === 'moffat' ? { beta: s.beta } : {}),
  };
  // every refusal that needs no look at the frame comes before the detector runs
  if (!(W - 1 - 2 * s.margin * s.fwhm > 0 && H - 1 - 2 * s.margin * s.fwhm > 0))
    return refuse('no-room', { reason: 'margin' });
  const known = s.magnitude
    ? rangeProblem(a, psf, s.magnitude, s.binWidth)
    : null;
  if (known) return known;
  const params = { ...DETECT, ...(s.detection ?? {}), fwhm: s.fwhm };
  const det = detector(a, params, { baseline: true });
  if (!det.ok) return det;
  const noise = meshMedian(det.mesh, 'noise');
  const magnitude =
    s.magnitude ??
    (noise ? suggestRange({ fwhm: s.fwhm, noise, exposure }) : null);
  if (!magnitude) return refuse('no-range');
  const problem = s.magnitude
    ? null
    : rangeProblem(a, psf, magnitude, s.binWidth);
  if (problem) return problem;
  const room = planTrial({
    seed: s.seed,
    trial: 0,
    count: 1,
    width: W,
    height: H,
    exposure,
    magnitude,
    fwhm: s.fwhm,
    margin: s.margin,
    separation: s.separation,
    existing: det.sources,
  });
  if (!room.sources.length) return refuse('no-room', { reason: 'sources' });
  const full = { ...s, magnitude };
  return {
    ok: true,
    a,
    spec: full,
    psf,
    params,
    baseline: det,
    conditions: conditionsOf(a, det, full),
    detector,
    planner: o.planner ?? null,
    exposure,
  };
}

/** Why a magnitude range cannot be injected into this frame, or null: too many bins, or brighter than the linearity limit allows. */
function rangeProblem(a, psf, magnitude, binWidth) {
  const bins = Math.max(
    1,
    Math.ceil((magnitude.max - magnitude.min) / binWidth - 1e-9)
  );
  if (bins > LIMITS.bins) return refuse('bad-parameter', { name: 'binWidth' });
  const sky = medianSample(a.image.values);
  const peak = peakFraction(psf);
  if (fluxOf(magnitude.min, a.exposure) * peak + sky >= a.limit)
    return refuse('beyond-linearity', {
      allowed: magnitudeOf((a.limit - sky) / peak, a.exposure),
    });
  return null;
}

/** One trial of a started run: plan, inject, detect, match. */
export function step(run, trial) {
  const { a, spec } = run;
  const plan = run.planner
    ? run.planner(trial, run)
    : planTrial({
        seed: spec.seed,
        trial,
        count: spec.count,
        width: a.image.width,
        height: a.image.height,
        exposure: run.exposure,
        magnitude: spec.magnitude,
        fwhm: spec.fwhm,
        margin: spec.margin,
        separation: spec.separation,
        existing: run.baseline.sources,
      });
  const made = inject(a, plan.sources, run.psf, { seed: spec.seed, trial });
  const det = run.detector(made, run.params, {
    trial,
    sources: plan.sources,
    baseline: false,
  });
  if (!det.ok) return det;
  const { recovered, extra } = match(
    plan.sources,
    det.sources,
    spec.matchRadius,
    run.baseline.sources
  );
  return {
    ok: true,
    trial,
    unplaced: plan.unplaced,
    extra: extra.length,
    sources: plan.sources.map((s, i) => ({
      ...s,
      recovered: Boolean(recovered[i]),
      found: recovered[i]
        ? {
            x: recovered[i].x,
            y: recovered[i].y,
            snr: recovered[i].snr ?? null,
            flux: recovered[i].flux ?? null,
          }
        : null,
    })),
  };
}

// ---- the curve ---------------------------------------------------------------------

/** Where a completeness series (bright to faint) first falls below the target, by linear interpolation between bin centres; null if it never does or starts below. */
function crossing(centers, values, target) {
  if (!(values[0] >= target)) return null;
  for (let i = 0; i + 1 < values.length; i++)
    if (values[i + 1] < target) {
      const t = (values[i] - target) / (values[i] - values[i + 1]);
      return centers[i] + t * (centers[i + 1] - centers[i]);
    }
  return null;
}

/**
 * The completeness curve of a run's trials.
 * @param {Array<object>} trials - step() results
 * @param {{seed: *, magnitude: {min: number, max: number}, binWidth: number, level: number}} spec
 */
export function curveOf(trials, spec) {
  const { min, max } = spec.magnitude;
  const w = spec.binWidth;
  const single = max === min;
  const nb = single ? 1 : Math.max(1, Math.ceil((max - min) / w - 1e-9));
  const lo0 = single ? min - w / 2 : min;
  const bins = Array.from({ length: nb }, (_, i) => ({
    lo: lo0 + i * w,
    hi: single ? lo0 + w : Math.min(max, lo0 + (i + 1) * w),
    n: 0,
    k: 0,
  }));
  let extra = 0;
  let unplaced = 0;
  for (const t of trials) {
    extra += t.extra;
    unplaced += t.unplaced;
    for (const s of t.sources) {
      const i = Math.min(
        nb - 1,
        Math.max(0, Math.floor((s.m - lo0) / w + 1e-12))
      );
      bins[i].n++;
      if (s.recovered) bins[i].k++;
    }
  }
  for (const b of bins) {
    b.center = 0.5 * (b.lo + b.hi);
    b.p = b.n ? b.k / b.n : null;
    b.interval = b.n ? binomialInterval(b.k, b.n, spec.level) : null;
  }
  const live = bins.filter(b => b.n);
  const centers = live.map(b => b.center);
  const at = target => {
    const m = crossing(
      centers,
      live.map(b => b.p),
      target
    );
    if (m === null) return { m: null, lo: null, hi: null };
    return {
      m,
      // the brightest and faintest magnitude at which the interval's edges cross
      lo: crossing(
        centers,
        live.map(b => b.interval.lo),
        target
      ),
      hi: crossing(
        centers,
        live.map(b => b.interval.hi),
        target
      ),
    };
  };
  const injected = live.reduce((t, b) => t + b.n, 0);
  return {
    version: VERSION,
    level: spec.level,
    bins,
    injected,
    recovered: live.reduce((t, b) => t + b.k, 0),
    unplaced,
    trials: trials.length,
    extraPerTrial: trials.length ? extra / trials.length : 0,
    m50: at(0.5),
    m90: at(0.9),
  };
}

/** A whole run, synchronously: the set-up, every trial, the curve. */
export function run(a, spec, o = {}) {
  const r = start(a, spec, o);
  if (!r.ok) return r;
  const trials = [];
  for (let t = 0; t < r.spec.trials; t++) {
    const s = step(r, t);
    if (!s.ok) return s;
    trials.push(s);
  }
  return { ...r, trials, curve: curveOf(trials, r.spec) };
}

/** A run on a decoded frame: the contract's refusals first, then the memory bound (before any array is made), then the run. */
export function runFrame(frame, check, spec, o = {}) {
  const side = frame.sidecar;
  if (!side) return refuse('no-contract');
  const ok = check(side, 'photometry');
  if (!ok.ok) return refuse(ok.code, ok.missing ? { missing: ok.missing } : {});
  const bytes =
    decodedBytes(frame.width, frame.height, {
      data: true,
      variance: Boolean(frame.variance),
      mask: Boolean(frame.mask),
    }) +
    FRAME_LIMITS.bytesPerPixel.data * frame.width * frame.height;
  if (!(bytes <= FRAME_LIMITS.maxDecodedBytes))
    return refuse('too-large', { bytes, limit: FRAME_LIMITS.maxDecodedBytes });
  const a = adapt(frame, check);
  return a.ok ? run(a, spec, o) : a;
}

// ---- the curve as a selection function (Prompt 154) ---------------------------------

/** The completeness at a magnitude: linear between bin centres, flat within the outer half bins, refused outside the injected range. */
export function completenessAt(curve, m) {
  const live = curve.bins.filter(b => b.n);
  const first = live[0];
  const last = live[live.length - 1];
  if (!(m >= first.lo && m <= last.hi))
    throw new InjectionError(
      'out-of-range',
      `a completeness curve says nothing at magnitude ${m}: it was measured from ${first.lo} to ${last.hi}`
    );
  if (m <= first.center) return first.p;
  if (m >= last.center) return last.p;
  let i = 0;
  while (live[i + 1].center < m) i++;
  const t = (m - live[i].center) / (live[i + 1].center - live[i].center);
  return live[i].p + t * (live[i + 1].p - live[i].p);
}

/** Prompt 154's selection object for a curve, on the observable `m`, carrying what the curve was measured under. */
export function selectionOf(curve, conditions, name = 'image completeness') {
  const sel = selection({
    name,
    observable: 'm',
    probability: m => completenessAt(curve, m),
  });
  const live = curve.bins.filter(b => b.n);
  return Object.freeze({
    ...sel,
    conditions,
    range: { min: live[0].lo, max: live[live.length - 1].hi },
  });
}

/**
 * A logistic completeness 1 / (1 + exp((m - m50) / width)), the form of the survey
 * suite's instruments (js/survey/model.js), through the curve: the weighted least
 * squares of the logit over the bins strictly between 0 and 1 (weights n p (1 - p)).
 * Null when fewer than two bins are strictly between.
 */
export function logisticOf(curve) {
  const pts = curve.bins.filter(b => b.n && b.k > 0 && b.k < b.n);
  if (pts.length < 2) return null;
  let sw = 0;
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let sxy = 0;
  for (const b of pts) {
    const w = b.n * b.p * (1 - b.p);
    const y = Math.log(b.p / (1 - b.p));
    sw += w;
    sx += w * b.center;
    sy += w * y;
    sxx += w * b.center * b.center;
    sxy += w * b.center * y;
  }
  const slope = (sw * sxy - sx * sy) / (sw * sxx - sx * sx);
  const icept = (sy - slope * sx) / sw;
  // logit p = -(m - m50) / width = icept + slope m
  return slope < 0 ? { m50: -icept / slope, width: -1 / slope } : null;
}

// ---- the record, its replay, the lists as CSV ---------------------------------------

/**
 * The curve as the envelope's quantities (Prompt 150's uncertainty kinds): the
 * magnitudes at 50 and 90 percent with the interval the edges of the bin
 * intervals give, each bin's completeness with its exact interval, and the extra
 * detections a trial.
 */
export function quantitiesOf(curve) {
  const out = [];
  const q = (id, value, unit, uncertainty) =>
    out.push({ id, value, unit, origin: 'derived', uncertainty });
  for (const [id, c] of [
    ['completeness.m50', curve.m50],
    ['completeness.m90', curve.m90],
  ]) {
    if (c.m === null)
      out.push({
        id,
        value: null,
        unit: 'mag',
        origin: 'derived',
        uncertainty: { kind: 'failed', reason: 'never-crosses' },
      });
    else
      q(
        id,
        c.m,
        'mag',
        c.lo !== null && c.hi !== null
          ? {
              kind: 'interval',
              lo: Math.min(c.lo, c.m),
              hi: Math.max(c.hi, c.m),
              level: curve.level,
              basis: 'data',
            }
          : { kind: 'none' }
      );
  }
  curve.bins.forEach((b, i) => {
    if (b.n)
      q(`completeness.bin.${i}`, b.p, '', {
        kind: 'interval',
        lo: b.interval.lo,
        hi: b.interval.hi,
        level: curve.level,
        basis: 'data',
      });
  });
  q('completeness.extra', curve.extraPerTrial, '', { kind: 'none' });
  return out;
}

/** What lets a run be made again: the frame's identity, the spec, the conditions, the streams, the counts and (up to 2,000 sources) the lists. */
export function reductionOf(frame, digest, r) {
  const sources = r.trials.flatMap(t =>
    t.sources.map(s => [
      t.trial,
      s.x,
      s.y,
      s.m,
      s.recovered ? 1 : 0,
      ...(s.found ? [s.found.x, s.found.y] : []),
    ])
  );
  return {
    step: STEP,
    version: VERSION,
    route: r.a.route,
    unit: r.a.unit,
    frame: { id: frame.id, width: frame.width, height: frame.height, digest },
    spec: r.spec,
    conditions: r.conditions,
    streams: {
      injection: stream('injection', r.spec.seed).stream,
      noise: stream('noise', r.spec.seed).stream,
    },
    result: {
      injected: r.curve.injected,
      recovered: r.curve.recovered,
      unplaced: r.curve.unplaced,
      extra: r.trials.reduce((t, x) => t + x.extra, 0),
      counts: r.curve.bins.map(b => [b.n, b.k]),
    },
    ...(sources.length <= LISTED
      ? {
          listed: true,
          columns: ['trial', 'x', 'y', 'm', 'recovered', 'foundX', 'foundY'],
          sources,
        }
      : { listed: false }),
  };
}

/**
 * Run a record again on the frame now open: refuse if its pixels changed, then
 * redo the run from the spec and say whether the counts are identical.
 */
export async function replay(red, frame, { check, digest }) {
  if (
    frame.width !== red.frame.width ||
    frame.height !== red.frame.height ||
    (await digest(frame)) !== red.frame.digest
  )
    return refuse('image-changed');
  const r = runFrame(frame, check, red.spec);
  if (!r.ok) return r;
  const now = r.curve.bins.map(b => [b.n, b.k]);
  const identical = JSON.stringify(now) === JSON.stringify(red.result.counts);
  const near = now.every(
    (c, i) =>
      c[0] === red.result.counts[i][0] &&
      Math.abs(c[1] - red.result.counts[i][1]) <= 1
  );
  return { ok: true, identical, agrees: identical || near };
}

/** The injected and recovered lists as CSV rows through js/csv.js; the header is the reader's words. */
export function csvRows(trials, header, num) {
  return [
    header,
    ...trials.flatMap(t =>
      t.sources.map((s, i) => [
        `t${t.trial + 1}.${i + 1}`,
        num(s.x + 1),
        num(s.y + 1),
        num(s.m),
        num(s.flux),
        s.recovered ? '1' : '0',
        num(s.found ? s.found.x + 1 : NaN),
        num(s.found ? s.found.y + 1 : NaN),
      ])
    ),
  ];
}
