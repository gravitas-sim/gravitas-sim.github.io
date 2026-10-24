// =============================================================================
// From a stack of frames to a light curve, every step a node
// -----------------------------------------------------------------------------
// Differential photometry over a sequence, put together from what the tree
// already has and nothing reimplemented (FRAME_PIPELINE.md has the contract and
// the validation):
//
//   calibrate    js/kernels/detector/reduce.js: bias, scaled dark, flat, then
//                electrons and the cosmic-ray mask; the masters are
//                js/kernels/detector/pipeline.js buildMasters
//   marks        js/measure/detect.js on one reference frame (Prompt 183), the
//                width from its PSF fit, the aperture js/measure/photometry.js's
//   register     each frame's own sources matched to the reference by a
//                translation vote, then js/measure/astrometry.js register
//                (Prompt 181)
//   photometry   every mark in every frame: exact-edge aperture through the
//                kernel's CCD equation (Prompt 180), plus the dark's and the
//                masters' noise
//   comparison   the stability test and the choice of comparison stars
//   lightcurve   the ensemble, the kernel's differentialMagnitude, the lab's
//                sinusoid scan, and the stated uncertainties
//
// Frames are read one at a time through the sequence's `frameAt(k)`; the
// pipeline never holds two. A frame that cannot be registered, or whose
// target or comparison cannot be measured, refuses the light curve and is
// named; the reader may exclude named frames and run again.
//
// Coordinates are the kernel's (pixel (0, 0) is the centre of the first
// pixel). Pure; async to give the page a turn between frames.
// =============================================================================

import {
  KIND,
  VERSION as KERNEL_VERSION,
  calibrate,
  differentialMagnitude,
  maskCosmicRays,
} from '../kernels/detector/reduce.js';
import { mastersVariance } from '../kernels/detector/pipeline.js';
import { scanPeriod } from '../kernels/detector/lightcurve.js';
import { IMAGE_FORMAT } from '../dataKinds/contract.js';
import { LIMITS } from '../dataKinds/limits.js';
import { ID_OBSERVING_SETUP } from '../names.js';
import { syntheticObservation } from '../forward/observation.js';
import { adapt, apertureFor, measure } from './photometry.js';
import { detectIn, measurePsf, selectStars } from './detect.js';
import { applyRegistration, chi2Survival, register } from './astrometry.js';

const { Math, Float64Array } = globalThis;

// The sidecar's own words for the unit of a pixel and of the gain (the data-kinds contract's).
const ELECTRON = 'electron';
const GAIN_UNIT = 'electron/adu';

export const VERSION = 1;
export const STAGES = Object.freeze([
  'calibrate',
  'marks',
  'register',
  'photometry',
  'comparison',
  'lightcurve',
]);

/** Every constant the pipeline uses, in one place (the thresholds file is the contract). */
export const RULES = Object.freeze({
  frames: LIMITS.maxFrames,
  /** Planes held at once: three masters, the raw, the calibrated and the electrons frame. */
  planes: 6,
  minFrames: 5,
  detectSigma: 5,
  detectMinArea: 5,
  maxMarks: 20,
  fwhmFallback: 3,
  targetWithin: 2,
  register: Object.freeze({
    sigma: 6,
    radius: 10,
    tolerance: 1,
    rmsMax: 0.5,
    minMatches: 3,
    minFraction: 0.5,
    centroidSigma: 0.3,
  }),
  comparison: Object.freeze({ max: 5, minSnr: 20, alpha: 0.001, minTest: 3 }),
  alpha: 0.001,
});

const refuse = (code, extra = {}) => ({ ok: false, code, ...extra });
const sorted = a => a.slice().sort((x, y) => x - y);
const median = a => {
  const s = sorted(a);
  const k = s.length >> 1;
  return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2;
};

/** How many pixels a page may hold with this pipeline's six planes (Prompt 157's bound). */
export const maxPixels = () =>
  Math.floor(LIMITS.maxDecodedBytes / (RULES.planes * 8));

// ---- the parameters -----------------------------------------------------------------

/** The first parameter outside its limit, as its name, or null. */
export function parameterProblem(p, count) {
  const num = v => typeof v === 'number' && Number.isFinite(v);
  const pos = v => num(v) && v > 0;
  if (
    p.reference !== undefined &&
    !(Number.isInteger(p.reference) && p.reference >= 0 && p.reference < count)
  )
    return 'reference';
  if (p.fwhm !== undefined && !(num(p.fwhm) && p.fwhm >= 0.5 && p.fwhm <= 50))
    return 'fwhm';
  if (p.aperture !== undefined) {
    const a = p.aperture;
    if (!(
      pos(a?.r) &&
      pos(a?.rIn) &&
      pos(a?.rOut) &&
      a.r < a.rIn &&
      a.rIn < a.rOut
    ))
      return 'aperture';
  }
  if (p.weighting !== undefined && !['exact', 'center'].includes(p.weighting))
    return 'weighting';
  if (p.exclude !== undefined) {
    if (!Array.isArray(p.exclude) || p.exclude.length > RULES.frames)
      return 'exclude';
    for (const k of p.exclude)
      if (!(Number.isInteger(k) && k >= 0 && k < count)) return 'exclude';
  }
  if (p.exclude?.includes(p.reference ?? 0)) return 'exclude';
  if (p.marks !== undefined) {
    if (
      !Array.isArray(p.marks) ||
      p.marks.length < 1 ||
      p.marks.length > RULES.maxMarks
    )
      return 'marks';
    for (const m of p.marks)
      if (!(typeof m?.id === 'string' && m.id && num(m.x) && num(m.y)))
        return 'marks';
  }
  const t = p.target;
  if (!(t && ((num(t.x) && num(t.y)) || (typeof t.id === 'string' && t.id))))
    return 'target';
  const c = p.comparison;
  if (
    c?.ids !== undefined &&
    !(
      Array.isArray(c.ids) &&
      c.ids.length >= 1 &&
      c.ids.length <= RULES.maxMarks &&
      c.ids.every(i => typeof i === 'string')
    )
  )
    return 'comparison';
  if (
    c?.max !== undefined &&
    !(Number.isInteger(c.max) && c.max >= 1 && c.max <= RULES.maxMarks)
  )
    return 'comparison';
  const per = p.period;
  if (per) {
    if (per.min !== undefined && !pos(per.min)) return 'period';
    if (per.max !== undefined && !pos(per.max)) return 'period';
    if (per.min !== undefined && per.max !== undefined && !(per.min < per.max))
      return 'period';
  }
  return null;
}

/**
 * What can be refused from the sequence's description alone, before any frame
 * is read. The caller has not asked the provider for anything yet.
 */
export function checkSequence(seq, params) {
  if (!seq || !(seq.count >= 1)) return refuse('no-frames');
  if (seq.count > RULES.frames)
    return refuse('too-many-frames', { count: seq.count, limit: RULES.frames });
  const pixels = seq.width * seq.height;
  if (!(
    Number.isInteger(seq.width) &&
    Number.isInteger(seq.height) &&
    pixels >= 1
  ))
    return refuse('bad-frame', {});
  if (pixels > maxPixels())
    return refuse('too-large', {
      pixels,
      limit: maxPixels(),
      planes: RULES.planes,
    });
  if (seq.calibration === 'raw' && !seq.masters) return refuse('no-masters');
  const name = parameterProblem(params ?? {}, seq.count);
  if (name) return refuse('bad-parameter', { name });
  const used = seq.count - (params.exclude?.length ?? 0);
  if (used < RULES.minFrames)
    return refuse('too-few-frames', { used, need: RULES.minFrames });
  if (!(
    params.period?.min === undefined ||
    params.period.min >= 2 * medianCadence(seq)
  ))
    return refuse('bad-parameter', { name: 'period' });
  return { ok: true };
}

function medianCadence(seq) {
  const d = [];
  for (let k = 1; k < seq.count; k++) d.push(seq.times[k] - seq.times[k - 1]);
  return d.length ? median(d) : Infinity;
}

// ---- one frame: calibration -------------------------------------------------------------

/** The pixel contract of a calibrated frame in electrons (js/dataKinds/contract.js). */
export function sidecarOf(seq, k, extra = {}) {
  const masters = seq.calibration === 'raw';
  return {
    format: IMAGE_FORMAT,
    formatVersion: 1,
    id: `${seq.id}#${k}`,
    use: 'quantitative',
    width: seq.width,
    height: seq.height,
    planes: { data: { encoding: 'float64-le' } },
    pixels: {
      unit: ELECTRON,
      linearity: {
        status: 'linear',
        limit: seq.fullWell ?? 1e9,
        source: 'the detector holds its charge up to the full well',
      },
      saturation: {
        level: seq.fullWell ?? 1e9,
        source: 'the full well',
      },
      gain: { value: seq.gain, unit: GAIN_UNIT, source: 'header' },
      readNoise: { value: seq.readNoise, unit: ELECTRON, source: 'header' },
    },
    time: {
      value: '2026-01-01T00:00:00Z',
      scale: 'UTC',
      format: 'iso',
      reference: 'mid',
    },
    exposure: { seconds: seq.exposure, kind: 'effective' },
    calibration: { state: 'calibrated' },
    history: masters
      ? [
          {
            step: 'calibrate',
            tool: 'js/kernels/detector/reduce.js calibrate (bias, dark, flat)',
            version: KERNEL_VERSION,
            lossy: false,
          },
          {
            step: 'mask',
            tool: 'js/kernels/detector/reduce.js maskCosmicRays',
            version: KERNEL_VERSION,
            lossy: false,
          },
        ]
      : [],
    source: { kind: 'synthetic', model: { name: seq.id, parameters: {} } },
    ...extra,
  };
}

/** Raw counts to the electrons frame the photometry reads, with the cosmic-ray mask. */
export function reduceOne(seq, raw) {
  let image;
  let calibrated = null;
  if (seq.calibration === 'raw') {
    const m = seq.masters;
    const cal = calibrate(raw, { bias: m.bias, dark: m.dark, flat: m.flat });
    calibrated = cal.image;
    image = {
      width: raw.width,
      height: raw.height,
      exposure: raw.exposure,
      values: Float64Array.from(cal.image.values, v => v * seq.gain),
    };
  } else {
    image = {
      width: raw.width,
      height: raw.height,
      exposure: raw.exposure,
      values: Float64Array.from(raw.values),
    };
  }
  const cr = maskCosmicRays(image, { readNoise: seq.readNoise });
  return {
    calibrated,
    electrons: image,
    work: cr.image,
    mask: cr.mask,
    cosmic: cr.count,
  };
}

// ---- registration ---------------------------------------------------------------------

/** The translation most pairs agree on, as {n, tx, ty}, or null. */
export function vote(refs, srcs, radius, tol) {
  let best = null;
  const t2 = tol * tol;
  for (const r of refs)
    for (const s of srcs) {
      const tx = s.x - r.x;
      const ty = s.y - r.y;
      const mag = tx * tx + ty * ty;
      if (mag > radius * radius) continue;
      let n = 0;
      for (const r2 of refs) {
        const px = r2.x + tx;
        const py = r2.y + ty;
        for (const s2 of srcs)
          if ((s2.x - px) ** 2 + (s2.y - py) ** 2 <= t2) {
            n++;
            break;
          }
      }
      if (!best || n > best.n || (n === best.n && mag < best.mag))
        best = { n, tx, ty, mag };
    }
  return best;
}

/** Nearest-first one-to-one pairs of reference marks and sources through a map, within tol. */
export function pairUp(refs, srcs, map, tol) {
  const cand = [];
  refs.forEach((r, i) => {
    const [px, py] = map(r.x, r.y);
    srcs.forEach((s, j) => {
      const d = Math.hypot(s.x - px, s.y - py);
      if (d <= tol) cand.push({ i, j, d });
    });
  });
  cand.sort((a, b) => a.d - b.d || a.i - b.i || a.j - b.j);
  const usedI = new Set();
  const usedJ = new Set();
  const pairs = [];
  for (const c of cand) {
    if (usedI.has(c.i) || usedJ.has(c.j)) continue;
    usedI.add(c.i);
    usedJ.add(c.j);
    pairs.push({
      id: refs[c.i].id,
      a: [refs[c.i].x, refs[c.i].y],
      b: [srcs[c.j].x, srcs[c.j].y],
    });
  }
  return pairs;
}

/**
 * Register one frame's sources to the reference marks.
 * @returns {{ok: true, matched: number, rms: number, reg: object, tx: number, ty: number, thetaDeg: number}|{ok: false, code: string, matched: number}}
 */
export function registerFrame(refs, srcs) {
  const R = RULES.register;
  const need = Math.max(R.minMatches, Math.ceil(R.minFraction * refs.length));
  const v = vote(refs, srcs, R.radius, R.tolerance);
  if (!v) return refuse('no-match', { matched: 0, need });
  let pairs = pairUp(refs, srcs, (x, y) => [x + v.tx, y + v.ty], R.tolerance);
  let reg = null;
  for (let pass = 0; pass < 2; pass++) {
    if (pairs.length < R.minMatches)
      return refuse('too-few', { matched: pairs.length, need });
    reg = register(pairs, { sigma: R.centroidSigma });
    if (!reg.ok)
      return refuse(reg.code ?? 'degenerate', { matched: pairs.length, need });
    if (pass === 0)
      pairs = pairUp(
        refs,
        srcs,
        (x, y) => applyRegistration(reg, x, y),
        R.tolerance
      );
  }
  const rms = reg.distribution.rms;
  if (pairs.length < need)
    return refuse('too-few', { matched: pairs.length, need, rms });
  if (!(rms <= R.rmsMax))
    return refuse('residual', { matched: pairs.length, need, rms });
  return {
    ok: true,
    matched: pairs.length,
    rms,
    reg,
    tx: reg.t[0],
    ty: reg.t[1],
    thetaDeg: reg.thetaDeg,
  };
}

// ---- the light curve --------------------------------------------------------------------

const LN10 = Math.LN10;

/**
 * The stability test of the comparison candidates (FRAME_PIPELINE.md).
 * @param {Array<{id: string, net: number[], sigma: number[]}>} cands - over the used frames
 * @returns {{stats: Object<string, object>, flagged: string[]}}
 */
export function stability(cands, alpha = RULES.comparison.alpha) {
  const N = cands[0]?.net.length ?? 0;
  const stats = Object.fromEntries(
    cands.map(c => [c.id, { status: 'untested', chi2red: null, p: null }])
  );
  const flagged = [];
  let pool = cands.slice();
  while (pool.length >= RULES.comparison.minTest) {
    const round = pool.map(c => {
      const rest = pool.filter(o => o !== c);
      const d = new Float64Array(N);
      const s = new Float64Array(N);
      for (let f = 0; f < N; f++) {
        let sum = 0;
        let var2 = 0;
        for (const o of rest) {
          sum += o.net[f];
          var2 += o.sigma[f] * o.sigma[f];
        }
        d[f] = -2.5 * Math.log10(c.net[f] / sum);
        s[f] =
          (2.5 / LN10) *
          Math.hypot(c.sigma[f] / c.net[f], Math.sqrt(var2) / sum);
      }
      let sw = 0;
      let swd = 0;
      for (let f = 0; f < N; f++) {
        const w = 1 / (s[f] * s[f]);
        sw += w;
        swd += w * d[f];
      }
      const mean = swd / sw;
      let chi2 = 0;
      for (let f = 0; f < N; f++) chi2 += ((d[f] - mean) / s[f]) ** 2;
      return { c, chi2, p: chi2Survival(chi2, N - 1) };
    });
    let worst = round[0];
    for (const r of round) if (r.p < worst.p) worst = r;
    for (const r of round)
      stats[r.c.id] = {
        status: 'stable',
        chi2red: r.chi2 / (N - 1),
        p: r.p,
      };
    if (worst.p < alpha) {
      stats[worst.c.id].status = 'unstable';
      flagged.push(worst.c.id);
      pool = pool.filter(c => c !== worst.c);
    } else break;
  }
  // Stars left in a pool the test could no longer run on were tested with the
  // variable one among them: they are used, and said to be untested.
  if (flagged.length && pool.length < RULES.comparison.minTest)
    for (const c of pool) stats[c.id].status = 'untested';
  return { stats, flagged };
}

/** The weighted constant and its chi-square against a flat curve. */
export function constantFit(dm, sigma) {
  let sw = 0;
  let swd = 0;
  for (let i = 0; i < dm.length; i++) {
    const w = 1 / (sigma[i] * sigma[i]);
    sw += w;
    swd += w * dm[i];
  }
  const mean = swd / sw;
  let chi2 = 0;
  for (let i = 0; i < dm.length; i++) chi2 += ((dm[i] - mean) / sigma[i]) ** 2;
  const dof = dm.length - 1;
  const p = chi2Survival(chi2, dof);
  return {
    mean,
    sigmaMean: 1 / Math.sqrt(sw),
    chi2,
    dof,
    p,
    variable: p < RULES.alpha,
  };
}

/** The sinusoid through a differential curve, with its stated uncertainties. */
export function fitCurve(t, dm, sigma, limits = {}) {
  const baseline = t[t.length - 1] - t[0];
  const cadence = baseline / (t.length - 1);
  const minPeriod = limits.min ?? 4 * cadence;
  const maxPeriod = limits.max ?? baseline / 2;
  const fit = scanPeriod(t, dm, sigma, { minPeriod, maxPeriod });
  const red = fit.dof > 0 ? fit.chi2 / fit.dof : null;
  const scale = Math.sqrt(Math.max(1, red ?? 1));
  let s2 = 0;
  for (const s of sigma) s2 += s * s;
  const s = Math.sqrt(s2 / sigma.length) * scale;
  const sigmaPeriod =
    fit.amplitude > 0
      ? (fit.period * fit.period * Math.sqrt(6) * s) /
        (Math.PI * baseline * fit.amplitude * Math.sqrt(t.length))
      : null;
  return {
    period: fit.period,
    sigmaPeriod,
    amplitude: fit.amplitude,
    sigmaAmplitude: fit.sigmaAmplitude * scale,
    sigmaAmplitudeFormal: fit.sigmaAmplitude,
    a: fit.a,
    b: fit.b,
    mean: fit.c,
    sigmaMean: fit.sigmaC * scale,
    chi2: fit.chi2,
    dof: fit.dof,
    chi2red: red,
    scaled: red !== null && red > 1,
    phase: fit.phase,
    limits: { min: minPeriod, max: maxPeriod },
    baseline,
  };
}

// ---- the run ----------------------------------------------------------------------------

const q = (id, value, unit, kind, extra = {}) => ({
  id,
  value,
  unit,
  kind,
  ...extra,
});
const node = (stage, params, quantities, warnings = [], extra = {}) => ({
  id: `frames-${stage}`,
  tool: `frames-${stage}`,
  version: `${VERSION}.0.0`,
  params,
  quantities,
  warnings,
  ...extra,
});

/**
 * Run the whole pipeline on a sequence.
 * @param {object} seq - { id, count, width, height, exposure, times, gain, readNoise, darkRate, fullWell?, calibration: 'raw'|'electrons', masters?, frameAt(k), release?(k) }
 * @param {object} params - the parameters (parameterProblem lists them)
 * @param {{check: Function, signal?: {aborted: boolean}, onProgress?: Function, yieldNow?: Function, onFrame?: Function}} hooks
 * @returns {Promise<object>} { ok: true, nodes, marks, frames, comparison, curve, fit, ... } or a refusal with `nodes` so far
 */
export async function runSequence(seq, params, hooks) {
  const pre = checkSequence(seq, params);
  if (!pre.ok) return pre;
  const exclude = new Set(params.exclude ?? []);
  const ref = params.reference ?? 0;
  const useK = [];
  for (let k = 0; k < seq.count; k++) if (!exclude.has(k)) useK.push(k);
  const order = [ref, ...useK.filter(k => k !== ref)];
  const turn = hooks.yieldNow ?? (() => new Promise(r => setTimeout(r, 0)));
  const raw = seq.calibration === 'raw';
  const extraVariance = raw
    ? mastersVariance(seq.masters, {
        readNoise: seq.readNoise,
        darkRate: seq.darkRate,
        exposure: seq.exposure,
      })
    : 0;
  const darkPerPixel = (seq.darkRate ?? 0) * seq.exposure;
  const weighting = params.weighting ?? 'exact';
  const doRegister = params.register !== false;

  let marks = null;
  let fwhm = null;
  let ap = null;
  let recentre = null;
  let psfNote = null;
  let target = null;
  const frames = new Map(); // k -> per-frame result
  const cosmic = [];
  const refused = [];

  const frameData = async k => {
    const f = await seq.frameAt(k);
    if (f.width !== seq.width || f.height !== seq.height)
      return refuse('frame-shape', {
        frame: k,
        width: f.width,
        height: f.height,
      });
    return { ok: true, raw: f };
  };
  const adapted = (k, red) => {
    const frame = {
      id: `${seq.id}#${k}`,
      width: seq.width,
      height: seq.height,
      data: red.work.values,
      sidecar: sidecarOf(seq, k),
    };
    const a = adapt(frame, hooks.check);
    return a.ok ? { ok: true, det: a, phot: { ...a, mask: red.mask } } : a;
  };

  for (const [at, k] of order.entries()) {
    if (hooks.signal?.aborted) return { ok: true, cancelled: true, nodes: [] };
    const got = await frameData(k);
    if (!got.ok) return got;
    const red = reduceOne(seq, got.raw);
    hooks.onFrame?.(k, red);
    cosmic.push({ k, count: red.cosmic });
    const a = adapted(k, red);
    if (!a.ok) return a;
    let result = { k, time: seq.times[k] };
    if (k === ref) {
      let det;
      if (params.marks) {
        marks = params.marks.map(m => ({
          id: m.id,
          x: m.x,
          y: m.y,
          given: true,
        }));
        fwhm = params.fwhm ?? RULES.fwhmFallback;
      } else {
        const fw0 = params.fwhm ?? RULES.fwhmFallback;
        det = detectIn(a.det, {
          fwhm: fw0,
          sigma: RULES.detectSigma,
          minArea: RULES.detectMinArea,
        });
        if (!det.ok) return det;
        if (params.fwhm === undefined) {
          const sel = selectStars(det);
          const psf = sel.length ? measurePsf(a.det, det, sel) : null;
          if (psf?.ok) fwhm = psf.fwhm.mean;
          else {
            fwhm = RULES.fwhmFallback;
            psfNote = psf ? psf.code : 'no-stars';
          }
        } else fwhm = params.fwhm;
        const good = det.sources
          .filter(
            s =>
              !s.flags.some(f =>
                ['saturated', 'edge', 'masked', 'crowded'].includes(f)
              )
          )
          .filter(s => s.flux > 0)
          .sort((x, y) => y.flux - x.flux)
          .slice(0, RULES.maxMarks);
        marks = good.map((s, i) => ({
          id: `M${i + 1}`,
          x: s.x,
          y: s.y,
          flux: s.flux,
          snr: s.snr,
        }));
      }
      const aper = apertureFor(fwhm);
      ap = params.aperture ?? { r: aper.r, rIn: aper.rIn, rOut: aper.rOut };
      recentre =
        params.recentre === false
          ? null
          : { half: aper.half, sigmaW: aper.sigmaW };
      if (!marks.length) return refuse('no-marks');
      const t = params.target;
      let best = null;
      for (const m of marks) {
        const d =
          t.id !== undefined
            ? m.id === t.id
              ? 0
              : Infinity
            : Math.hypot(m.x - t.x, m.y - t.y);
        if (d <= RULES.targetWithin && (!best || d < best.d)) best = { m, d };
      }
      if (!best) return refuse('target-not-found', { marks: marks.length });
      target = best.m.id;
      result.registration = {
        ok: true,
        matched: marks.length,
        rms: 0,
        tx: 0,
        ty: 0,
        thetaDeg: 0,
        identity: true,
        reg: { theta: 0, t: [0, 0], about: [0, 0], centre: [0, 0] },
      };
    } else if (doRegister) {
      const det = detectIn(a.det, {
        fwhm,
        sigma: RULES.register.sigma,
        minArea: RULES.detectMinArea,
      });
      const srcs = det.ok
        ? det.sources.filter(s => !s.flags.includes('saturated'))
        : [];
      const regs = registerFrame(marks, srcs);
      result.registration = regs;
    } else {
      result.registration = {
        ok: true,
        matched: marks.length,
        rms: 0,
        tx: 0,
        ty: 0,
        thetaDeg: 0,
        identity: true,
        reg: { theta: 0, t: [0, 0], about: [0, 0], centre: [0, 0] },
      };
    }
    if (result.registration.ok) {
      const reg = result.registration.reg;
      result.stars = marks.map(m => {
        const [x, y] = applyRegistration(reg, m.x, m.y);
        const r = measure(a.phot, {
          id: m.id,
          x,
          y,
          r: ap.r,
          rIn: ap.rIn,
          rOut: ap.rOut,
          weighting,
          ...(recentre ? { recentre } : {}),
          darkPerPixel,
          extraVariance,
          maskedOk: true,
        });
        return r.ok
          ? {
              id: m.id,
              ok: true,
              net: r.net,
              sigma: r.sigma,
              snr: r.snr,
              x: r.x,
              y: r.y,
              sky: r.sky,
              detected: r.detected,
              warnings: r.warnings,
            }
          : { id: m.id, ok: false, code: r.code, x, y };
      });
    } else {
      refused.push({
        k,
        code: 'registration',
        reason: result.registration.code,
        matched: result.registration.matched,
        need: result.registration.need ?? null,
      });
    }
    frames.set(k, result);
    seq.release?.(k);
    hooks.onProgress?.(at + 1, order.length);
    if ((at + 1) % 4 === 0) await turn();
  }
  return assemble(seq, params, {
    marks,
    fwhm,
    ap,
    psfNote,
    target,
    frames,
    cosmic,
    refused,
    useK,
    ref,
    extraVariance,
    weighting,
    recentre,
    doRegister,
  });
}

/** The nodes, the comparison and the light curve from the per-frame results. */
function assemble(seq, params, s) {
  const { marks, frames, useK, ref } = s;
  const nodes = [];
  const w = [];
  // calibrate
  const raw = seq.calibration === 'raw';
  const cq = [q('frames', useK.length, '', KIND.MEASURED)];
  if (raw) {
    const m = seq.masters;
    cq.push(
      q('masterBias', m.counts.bias, '', KIND.MEASURED),
      q('masterDark', m.counts.dark, '', KIND.MEASURED),
      q('masterFlat', m.counts.flat, '', KIND.MEASURED),
      q('extraVariance', s.extraVariance, 'count', KIND.DERIVED, {
        note: 'electrons squared per pixel the masters add',
      })
    );
    if (m.counts.bias < 5) w.push({ code: 'fewBias', n: m.counts.bias });
  }
  const crTotal = s.cosmic.reduce((t, c) => t + c.count, 0);
  cq.push(
    q('cosmicPixels', crTotal, '', KIND.MEASURED, {
      note: 'pixels replaced, all frames',
    }),
    q(
      'cosmicMax',
      Math.max(0, ...s.cosmic.map(c => c.count)),
      '',
      KIND.MEASURED,
      { note: 'most in one frame' }
    )
  );
  nodes.push(
    node(
      'calibrate',
      { calibration: seq.calibration },
      cq,
      raw ? [] : [{ code: 'alreadyCalibrated' }]
    )
  );
  // marks
  const mq = [
    q('marks', marks.length, '', KIND.MEASURED),
    q(
      'fwhm',
      s.fwhm,
      'pix',
      s.psfNote || params.fwhm !== undefined || marks.some(m => m.given)
        ? KIND.ASSUMED
        : KIND.MEASURED
    ),
    q('r', s.ap.r, 'pix', KIND.ASSUMED),
    q('rIn', s.ap.rIn, 'pix', KIND.ASSUMED),
    q('rOut', s.ap.rOut, 'pix', KIND.ASSUMED),
    q('reference', ref, '', KIND.ASSUMED),
  ];
  const mw = [];
  if (s.psfNote) mw.push({ code: 'psfFallback', reason: s.psfNote });
  nodes.push(node('marks', { reference: ref }, mq, mw, { target: s.target }));
  // register
  const regs = useK.map(k => frames.get(k)).filter(Boolean);
  const okRegs = regs.filter(f => f.registration.ok);
  const shifts = okRegs.map(f =>
    Math.hypot(f.registration.tx, f.registration.ty)
  );
  const rq = [
    q('registered', okRegs.length, '', KIND.MEASURED),
    q('refused', s.refused.length, '', KIND.MEASURED),
    q(
      'shiftRms',
      shifts.length
        ? Math.sqrt(shifts.reduce((t, v) => t + v * v, 0) / shifts.length)
        : 0,
      'pix',
      KIND.DERIVED
    ),
    q('shiftMax', shifts.length ? Math.max(...shifts) : 0, 'pix', KIND.DERIVED),
    q(
      'residualRms',
      okRegs.length
        ? Math.sqrt(
            okRegs.reduce((t, f) => t + f.registration.rms ** 2, 0) /
              okRegs.length
          )
        : 0,
      'pix',
      KIND.DERIVED
    ),
  ];
  const rw = s.refused.map(r => ({
    code: 'registrationRefused',
    frame: r.k,
    reason: r.reason,
    matched: r.matched,
  }));
  if (!s.doRegister) rw.push({ code: 'registrationOff' });
  nodes.push(node('register', { register: s.doRegister }, rq, rw));
  const out = {
    ok: true,
    marks,
    target: s.target,
    fwhm: s.fwhm,
    aperture: s.ap,
    frames,
    nodes,
    refusedFrames: s.refused,
  };
  if (s.refused.length)
    return {
      ...out,
      ok: false,
      code: 'registration',
      frames: s.refused.map(r => r.k).sort((a, b) => a - b),
      reasons: Object.fromEntries(s.refused.map(r => [r.k, r.reason])),
    };
  // photometry: every used frame must hold the target
  const phRefused = [];
  const t = s.target;
  for (const k of useK) {
    const f = frames.get(k);
    const star = f.stars.find(x => x.id === t);
    if (!star.ok) phRefused.push({ k, code: star.code, star: t });
  }
  const used = useK;
  const col = id => used.map(k => frames.get(k).stars.find(x => x.id === id));
  const net = {};
  const sig = {};
  const complete = [];
  const gaps = {};
  for (const m of marks) {
    const c = col(m.id);
    if (c.every(x => x.ok)) {
      net[m.id] = c.map(x => x.net);
      sig[m.id] = c.map(x => x.sigma);
      complete.push(m.id);
    } else gaps[m.id] = c.filter(x => !x.ok).length;
  }
  const targetSnr = net[t] ? median(col(t).map(x => x.snr)) : null;
  const pq = [
    q('stars', marks.length, '', KIND.MEASURED),
    q('complete', complete.length, '', KIND.MEASURED, {
      note: 'measured in every frame',
    }),
    q('targetSnr', targetSnr, '', KIND.DERIVED, { note: 'median over frames' }),
    q('refusedTarget', phRefused.length, '', KIND.MEASURED),
  ];
  const pw = [];
  for (const [id, n] of Object.entries(gaps))
    pw.push({ code: 'incompleteStar', star: id, frames: n });
  for (const r of phRefused)
    pw.push({ code: 'targetRefused', frame: r.k, reason: r.code });
  nodes.push(
    node(
      'photometry',
      { weighting: s.weighting, recentre: Boolean(s.recentre) },
      pq,
      pw
    )
  );
  out.nodes = nodes;
  out.gaps = gaps;
  out.series = Object.fromEntries(
    complete.map(id => [id, { net: net[id], sigma: sig[id] }])
  );
  if (phRefused.length)
    return {
      ...out,
      ok: false,
      code: 'photometry',
      frames: phRefused.map(r => r.k).sort((a, b) => a - b),
      reasons: Object.fromEntries(phRefused.map(r => [r.k, r.code])),
    };
  // comparison
  const rule = RULES.comparison;
  const snrOf = id => median(col(id).map(x => x.snr));
  const cands = complete
    .filter(id => id !== t)
    .filter(id => snrOf(id) >= rule.minSnr)
    .map(id => ({ id, net: net[id], sigma: sig[id] }));
  const st = stability(cands);
  const given = params.comparison?.ids;
  let chosen;
  const cw = [];
  if (given) {
    for (const id of given)
      if (!marks.some(m => m.id === id) || id === t)
        return refuse('bad-parameter', { name: 'comparison', nodes });
    for (const id of given)
      if (!net[id]) return refuse('no-comparison', { star: id, nodes });
    chosen = given.slice();
    for (const id of chosen)
      if (st.stats[id]?.status === 'unstable')
        cw.push({ code: 'unstableUsed', star: id });
  } else {
    chosen = cands
      .filter(c => st.stats[c.id].status !== 'unstable')
      .map(c => ({ id: c.id, flux: median(c.net) }))
      .sort((a, b) => b.flux - a.flux)
      .slice(0, params.comparison?.max ?? rule.max)
      .map(c => c.id);
  }
  if (!chosen.length) return { ...out, ok: false, code: 'no-comparison' };
  if (cands.length < rule.minTest && !given)
    cw.push({ code: 'stabilityNotRun', candidates: cands.length });
  if (chosen.length === 1) cw.push({ code: 'singleComparison' });
  for (const c of cands)
    if (st.stats[c.id].status === 'untested' && cands.length >= rule.minTest)
      cw.push({ code: 'untestedAfterRemoval', star: c.id });
  const kq = [
    q('chosen', chosen.length, '', KIND.DERIVED),
    q('flagged', st.flagged.length, '', KIND.DERIVED),
  ];
  for (const c of cands)
    kq.push(
      q(`${c.id}.chi2red`, st.stats[c.id].chi2red, '', KIND.DERIVED, {
        note: st.stats[c.id].status,
      })
    );
  nodes.push(
    node(
      'comparison',
      {
        comparison: given
          ? { ids: given }
          : { max: params.comparison?.max ?? rule.max },
      },
      kq,
      cw,
      {
        chosen,
        stats: st.stats,
        flagged: st.flagged,
        candidates: cands.map(c => c.id),
      }
    )
  );
  // the light curve
  const n = used.length;
  const dm = new Float64Array(n);
  const dmSigma = new Float64Array(n);
  const ensNet = new Float64Array(n);
  const ensSigma = new Float64Array(n);
  const times = new Float64Array(n);
  for (let f = 0; f < n; f++) {
    let sum = 0;
    let v = 0;
    for (const id of chosen) {
      sum += net[id][f];
      v += sig[id][f] * sig[id][f];
    }
    ensNet[f] = sum;
    ensSigma[f] = Math.sqrt(v);
    const d = differentialMagnitude(
      { net: net[t][f], sigma: sig[t][f] },
      { net: sum, sigma: ensSigma[f] }
    );
    dm[f] = d.dm;
    dmSigma[f] = d.sigma;
    times[f] = seq.times[used[f]];
  }
  const flat = constantFit(dm, dmSigma);
  const fit = fitCurve(times, dm, dmSigma, params.period ?? {});
  const lw = [];
  if (fit.scaled) lw.push({ code: 'scaledUncertainty', chi2red: fit.chi2red });
  if (flat.variable === false) lw.push({ code: 'notVariable', p: flat.p });
  if (fit.sigmaPeriod === null) lw.push({ code: 'noAmplitude' });
  else if (fit.amplitude / fit.sigmaAmplitude < 3)
    lw.push({ code: 'weakAmplitude' });
  const lq = [
    q('period', fit.period, 'd', KIND.MEASURED, {
      error: fit.sigmaPeriod ?? undefined,
      errorKind: KIND.DERIVED,
      note: 'asymptotic',
    }),
    q('amplitude', fit.amplitude, 'mag', KIND.MEASURED, {
      error: fit.sigmaAmplitude,
      errorKind: KIND.DERIVED,
    }),
    q('meanMagnitude', fit.mean, 'mag', KIND.MEASURED, {
      error: fit.sigmaMean,
      errorKind: KIND.DERIVED,
    }),
    q('chi2red', fit.chi2red, '', KIND.DERIVED),
    q('constantP', flat.p, '', KIND.DERIVED, {
      note: flat.variable ? 'variable' : 'consistent with constant',
    }),
    q('points', n, '', KIND.MEASURED),
  ];
  nodes.push(node('lightcurve', { period: params.period ?? {} }, lq, lw));
  return {
    ...out,
    ok: true,
    used,
    times,
    dm,
    dmSigma,
    ensNet,
    ensSigma,
    targetNet: Float64Array.from(net[t]),
    chosen,
    comparison: {
      chosen,
      stats: st.stats,
      flagged: st.flagged,
      candidates: cands.map(c => c.id),
    },
    fit,
    constant: flat,
    nodes,
  };
}

// ---- the record, its replay, the table and the observation ----------------------------------

export const STEP = 'image-sequence';

/** The 150 quantities of a finished run: the fit and the stability of each comparison star. */
export function quantitiesOf(res) {
  const f = res.fit;
  const out = [];
  const add = (id, label, value, unit, origin, uncertainty) =>
    out.push({ id, label, value, unit, origin, uncertainty });
  add(
    'lc.period',
    'period',
    f.period,
    'd',
    'measured',
    f.sigmaPeriod === null
      ? { kind: 'assumed' }
      : { kind: 'sigma', sigma: f.sigmaPeriod, basis: 'derived' }
  );
  add('lc.amplitude', 'semi-amplitude', f.amplitude, 'mag', 'measured', {
    kind: 'sigma',
    sigma: f.sigmaAmplitude,
    basis: 'derived',
  });
  add('lc.mean', 'mean differential magnitude', f.mean, 'mag', 'measured', {
    kind: 'sigma',
    sigma: f.sigmaMean,
    basis: 'derived',
  });
  add(
    'lc.chi2red',
    'reduced chi-square of the sinusoid',
    f.chi2red,
    null,
    'derived',
    { kind: 'none' }
  );
  add(
    'lc.constantP',
    'chance of a constant star this scattered',
    res.constant.p,
    null,
    'derived',
    { kind: 'none' }
  );
  for (const [id, s] of Object.entries(res.comparison.stats))
    add(
      `cmp.${id}.chi2red`,
      `${id}: stability (reduced chi-square)`,
      s.chi2red,
      null,
      'derived',
      { kind: 'none' }
    );
  res.used.forEach((k, i) => {
    add(`lc.t.${k}`, `frame ${k + 1}: time`, res.times[i], 'd', 'assumed', {
      kind: 'assumed',
    });
    add(
      `lc.m.${k}`,
      `frame ${k + 1}: differential magnitude`,
      res.dm[i],
      'mag',
      'derived',
      {
        kind: 'sigma',
        sigma: res.dmSigma[i],
        basis: 'derived',
      }
    );
  });
  return out;
}

/** What lets a run be done again: the sequence's identity, the parameters, and what came out. */
export async function reductionOf(seq, params, res, digest) {
  return {
    step: STEP,
    version: VERSION,
    kernel: { tool: 'reduceFrame', version: KERNEL_VERSION },
    sequence: {
      id: seq.id,
      count: seq.count,
      width: seq.width,
      height: seq.height,
      exposure: seq.exposure,
      digest: await digest(seq),
    },
    params,
    result: {
      frames: res.used.length,
      target: res.target,
      chosen: res.chosen,
      flagged: res.comparison.flagged,
      period: res.fit.period,
      amplitude: res.fit.amplitude,
      dm: Array.from(res.dm),
      dmSigma: Array.from(res.dmSigma),
    },
  };
}

/**
 * Run a record again on the sequence now open: refuse if the sequence changed,
 * then say whether the light curve is bit-identical or within a part in 1e9.
 */
export async function replay(red, seq, hooks, digest) {
  if ((await digest(seq)) !== red.sequence.digest)
    return refuse('sequence-changed');
  const res = await runSequence(seq, red.params, hooks);
  if (!res.ok) return { ok: false, code: res.code, frames: res.frames };
  const want = red.result;
  const same = (a, b) =>
    a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const close = (a, b) =>
    a.length === b.length &&
    a.every(
      (v, i) =>
        Math.abs(v - b[i]) <= 1e-9 * Math.max(1, Math.abs(v), Math.abs(b[i]))
    );
  const dm = Array.from(res.dm);
  const sg = Array.from(res.dmSigma);
  const identical = same(dm, want.dm) && same(sg, want.dmSigma);
  const agrees = close(dm, want.dm) && close(sg, want.dmSigma);
  return {
    ok: true,
    identical,
    agrees,
    chosenSame: res.chosen.join() === want.chosen.join(),
  };
}

/** The light curve as CSV rows (header first). */
export function csvRows(res, header, num) {
  return [
    header,
    ...res.used.map((k, i) => [
      k + 1,
      num(res.times[i]),
      num(res.dm[i]),
      num(res.dmSigma[i]),
      num(res.targetNet[i]),
      num(res.ensNet[i]),
    ]),
  ];
}

// ---- the pipeline's nodes: one tool a stage (js/measure/pipeline.js TOOLS) ------------------

/** A sequence as the measurement pipeline sees it: an observation-like view of kind image-sequence. */
export const viewOf = (seq, digest) => ({
  kind: 'image-sequence',
  id: seq.id,
  sequence: seq,
  digest: () => digest(seq),
  cache: new Map(),
});

/**
 * One stage as a pipeline node's result. The whole run is made once for a view
 * and a set of parameters (the stages share it) and each node reads its own.
 * @returns {Promise<{raw: object, quantities: object[], warnings: object[]}>}
 */
export async function runStage(view, stage, params, hooks = {}) {
  const key = JSON.stringify(params);
  let run = view.cache.get(key);
  if (!run) {
    const check =
      hooks.check ?? (await import('../dataKinds/contract.js')).permits;
    run = await runSequence(view.sequence, params, { ...hooks, check });
    view.cache.set(key, run);
  }
  const n = run.nodes?.find(x => x.id === `frames-${stage}`);
  if (!n)
    throw Object.assign(new Error(run.code ?? 'cancelled'), {
      code: run.code ?? 'canceled',
      detail: { frames: run.frames ?? [], reasons: run.reasons ?? {} },
    });
  const { quantities, warnings, ...raw } = n;
  return { raw, quantities, warnings };
}

/**
 * The light curve as an observation of the Observatory (gravitas.observation/1,
 * a time series with its uncertainty column), so the period tool, the fit panel
 * and the variables kernel read it like any other. A synthetic sequence gives a
 * synthetic observation whose truth manifest holds the variable's period and
 * semi-amplitude.
 * @param {object} res - a finished run
 * @param {object} seq
 * @param {{title: string, names: {time: string, dm: string, sigma: string}}} o
 */
export function observationOf(res, seq, { title, names }) {
  const v = seq.truth?.variables?.find(x => x.id === res.target);
  return syntheticObservation({
    model: 'ccd-sequence',
    version: String(VERSION),
    setup: {
      format: ID_OBSERVING_SETUP,
      formatVersion: 1,
      seed: String(seq.seed ?? seq.id),
      instrument: { kind: 'imager' },
    },
    kind: 'time-series',
    title,
    columns: [
      {
        id: 'time',
        name: names.time,
        unit: 'd',
        role: 'x',
        values: Array.from(res.times),
      },
      {
        id: 'dm',
        name: names.dm,
        unit: 'mag',
        role: 'value',
        values: Array.from(res.dm),
      },
      {
        id: 'dm-sigma',
        name: names.sigma,
        unit: 'mag',
        role: 'uncertainty',
        of: 'dm',
        values: Array.from(res.dmSigma),
      },
    ],
    axes: { x: 'time', y: 'dm' },
    truth: {
      parameters: v
        ? [
            { id: 'period', name: 'period', value: v.period, unit: 'd' },
            {
              id: 'amplitude',
              name: 'semi-amplitude',
              value: v.amplitude,
              unit: 'mag',
            },
          ]
        : [],
      injected: {
        whiteSigma: null,
        redSigma: null,
        offset: null,
        trend: null,
        outlierRows: [],
      },
      notes: [
        'a differential light curve from synthetic frames (js/measure/frameSeries.js): the noise is the detector kernel’s, not injected into the curve',
      ],
    },
    extra: { time: { column: 'time', format: 'relative', scale: 'unknown' } },
  });
}
