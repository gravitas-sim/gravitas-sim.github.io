// =============================================================================
// One synthetic field, searched, measured and injected (Prompt 191, part 3)
// -----------------------------------------------------------------------------
// The data behind "What Is in This Field?" (IMAGE_INVESTIGATIONS.md). One frame
// made once from a fixed table of forty stars by the detector kernel
// (js/kernels/detector/frame.js: a clean detector, 192 by 192 pixels, a sky of
// 90 electrons a pixel, 8 electrons of read noise, gain 1.5, a PSF of FWHM 3
// pixels), then looked at with the tools the Observatory already ships:
//
//   searchOf         js/measure/detect.js: the sources at a threshold, matched
//                    to the table (the truth, shown only on request), and the
//                    width of the PSF measured from the stars among them
//   completenessOf   js/measure/inject.js: sources of chosen magnitudes added to
//                    a copy of the frame and looked for again, the share found
//                    by magnitude with its exact interval
//
// No statistics are computed here: every number is a tool's own, and
// tests/fieldLesson.test.js recomputes each one a lesson states. The table holds
// each star's matched-filter signal to noise (the lesson's own words for how
// bright it is) and its position; the flux is derived from it with the
// detector's noise, so a star of signal to noise 5 is the one the detector
// finds about half of the time. The frame is synthetic and says so; the truth
// is the point. Pure; no DOM (the instruments draw it).
// =============================================================================

import { simulateFrame } from './kernels/detector/frame.js';
import { permits } from './dataKinds/contract.js';
import { adapt } from './measure/photometry.js';
import {
  DEFAULTS as DETECT,
  detectIn,
  measurePsf,
  selectStars,
} from './measure/detect.js';
import {
  appliesTo,
  conditionsOf,
  fluxForSnr,
  magnitudeOf,
  run,
} from './measure/inject.js';

const { Math, Float64Array } = globalThis;

/** The detector, the exposure and the seed of the frame (the detection scene's, enlarged). */
export const FIELD = Object.freeze({
  seed: 'field-191',
  width: 192,
  height: 192,
  exposure: 30,
  skyRate: 3,
  gain: 1.5,
  readNoise: 8,
  biasLevel: 500,
  /** The width of the PSF the frame was made with, pixels. */
  fwhm: 3,
  /** A star counts as found when a source is listed within this many pixels of it. */
  matchRadius: 2,
});

/** Electrons of noise in one pixel: sky shot noise, read noise and the rounding to whole ADU. */
export const NOISE = Math.sqrt(
  FIELD.skyRate * FIELD.exposure +
    FIELD.readNoise * FIELD.readNoise +
    (FIELD.gain * FIELD.gain) / 12
);

/** Forty stars: x and y in pixels (0-based, pixel centers at integers), and matched-filter signal to noise. */
const TABLE = [
  [100.2, 14.4, 116.3],
  [47.2, 102.9, 44.8],
  [14.7, 165, 190.7],
  [48.4, 167.2, 74.1],
  [17.7, 22.5, 82.9],
  [142.6, 117.5, 86.8],
  [80.7, 46.7, 196.1],
  [169, 58.1, 9.8],
  [175.4, 128.6, 10.7],
  [104.6, 47.7, 4.4],
  [80.4, 109.4, 7.8],
  [153.8, 146.9, 3.9],
  [82.8, 73.4, 9.9],
  [17.6, 68.3, 4.4],
  [56.1, 63.6, 4.2],
  [73.1, 27.7, 7],
  [166, 33.8, 3.7],
  [110.2, 127.4, 13.1],
  [111.2, 83.1, 12.6],
  [38.5, 45.3, 22.7],
  [134.2, 96.5, 31.5],
  [140.6, 45.2, 4.3],
  [15, 116.4, 3.2],
  [162, 83.2, 20.6],
  [150.4, 167.3, 5.2],
  [128.3, 17.7, 5.2],
  [45.5, 141.2, 8.1],
  [171.8, 166.7, 7.1],
  [131.9, 153.7, 3.4],
  [111, 166.2, 6.1],
  [84.5, 140.2, 3.7],
  [60.4, 85.9, 4.9],
  [78.2, 163.1, 15],
  [144.1, 74, 11.4],
  [39.8, 17.3, 3.4],
  [18.9, 143.5, 12.8],
  [103.2, 105.4, 3.4],
  [153.3, 16.2, 3.1],
  [162.4, 105.1, 8],
  [125.9, 63.7, 10],
];

/** The stars that were placed: position, signal to noise, electrons and instrumental magnitude. */
export const STARS = Object.freeze(
  TABLE.map(([x, y, snr], i) => {
    const flux = fluxForSnr(snr, FIELD.fwhm, NOISE);
    return Object.freeze({
      id: i + 1,
      x,
      y,
      snr,
      flux,
      mag: magnitudeOf(flux, FIELD.exposure),
    });
  })
);

/** The contract the detector's tools need (a quantitative synthetic frame, bias subtracted, in ADU). */
function contract() {
  return {
    format: 'gravitas.image',
    formatVersion: 1,
    id: FIELD.seed,
    use: 'quantitative',
    width: FIELD.width,
    height: FIELD.height,
    planes: { data: { encoding: 'float64-le' } },
    pixels: {
      unit: 'adu',
      linearity: {
        status: 'linear',
        limit: 30000,
        source: 'the forward model has no nonlinearity below full well',
      },
      saturation: { level: 33333, source: 'full well over the gain' },
      gain: { value: FIELD.gain, unit: 'electron/adu', source: 'header' },
      readNoise: {
        value: FIELD.readNoise,
        unit: 'electron',
        source: 'header',
      },
    },
    time: {
      value: '2026-01-01T00:00:00Z',
      scale: 'UTC',
      format: 'iso',
      reference: 'mid',
    },
    exposure: { seconds: FIELD.exposure, kind: 'effective' },
    calibration: { state: 'bias-subtracted' },
    history: [],
    source: {
      kind: 'synthetic',
      model: {
        name: 'detector-kernel frame (js/kernels/detector/frame.js)',
        parameters: { stars: STARS.length, fwhm: FIELD.fwhm },
      },
    },
  };
}

let made = null;

/** The frame, once: `{ frame, adapted }` for the tools (the pixels in ADU, bias subtracted). */
export function fieldFrame() {
  if (made) return made;
  const f = simulateFrame({
    seed: FIELD.seed,
    exposure: FIELD.exposure,
    detector: {
      width: FIELD.width,
      height: FIELD.height,
      gain: FIELD.gain,
      readNoise: FIELD.readNoise,
      biasLevel: FIELD.biasLevel,
      biasColumnSigma: 0,
      darkRate: 0,
      hotFraction: 0,
      qeScatter: 0,
      vignette: 0,
      dustCount: 0,
      cosmicRate: 0,
      fullWell: 100000,
      fwhm: FIELD.fwhm,
    },
    scene: {
      sky: FIELD.skyRate,
      sources: STARS.map(s => ({
        x: s.x,
        y: s.y,
        rate: s.flux / FIELD.exposure,
      })),
    },
  });
  const frame = {
    id: FIELD.seed,
    width: f.width,
    height: f.height,
    data: Float64Array.from(f.values, v => v - FIELD.biasLevel),
    mask: null,
    sidecar: contract(),
  };
  made = { frame, adapted: adapt(frame, permits) };
  return made;
}

/** Which listed sources are stars that were placed, and which are not. */
export function matchTruth(sources) {
  const taken = new Set();
  const pairs = [];
  for (const star of STARS) {
    let best = null;
    for (const s of sources) {
      if (taken.has(s.id)) continue;
      const d = Math.hypot(s.x - star.x, s.y - star.y);
      if (d <= FIELD.matchRadius && (!best || d < best.d)) best = { s, d };
    }
    if (best) {
      taken.add(best.s.id);
      pairs.push({ star, source: best.s });
    }
  }
  return {
    pairs,
    found: pairs.length,
    missed: STARS.filter(s => !pairs.some(p => p.star === s)),
    false: sources.filter(s => !taken.has(s.id)),
  };
}

const searches = new Map();

/**
 * The frame searched at a threshold (in sigma of the smoothed noise): the sources, the truth they match, and the
 * width of the PSF measured from the stars the detector selects (no flag, signal to noise at least 30).
 * @param {{sigma?: number}} [o]
 */
export function searchOf({ sigma = 4 } = {}) {
  const key = String(sigma);
  if (searches.has(key)) return searches.get(key);
  const { adapted: a } = fieldFrame();
  const det = detectIn(a, { ...DETECT, sigma });
  const out = { sigma, det, ok: det.ok };
  if (det.ok) {
    out.sources = det.sources;
    out.truth = matchTruth(det.sources);
    out.flagged = det.sources.filter(s => s.flags.length).length;
    const snrs = det.sources.map(s => s.snr).filter(Number.isFinite);
    out.faintest = snrs.length ? Math.min(...snrs) : null;
    out.selected = selectStars(det);
    const psf = out.selected.length
      ? measurePsf(a, det, out.selected, {})
      : { ok: false, code: 'no-stars' };
    out.psf = psf;
  }
  searches.set(key, out);
  return out;
}

/** What the completeness runs inject: twenty sources a trial, twelve trials, between two magnitudes, bins 0.3 wide. */
export const INJECTION = Object.freeze({
  seed: 'field-191-injection',
  count: 20,
  trials: 12,
  binWidth: 0.3,
  magnitude: Object.freeze({ min: -3.4, max: -1.6 }),
  /** The search a curve is compared with: the one of the first instrument's default, at the width the stars measure, to half a pixel. */
  reference: Object.freeze({ sigma: 4, fwhm: 3 }),
});

const curves = new Map();

/**
 * Sources injected into a copy of the frame and looked for again, at a threshold and a PSF width.
 * @param {{sigma?: number, width?: number}} [o] - width: the FWHM of the injected sources and of the detector's kernel
 */
export function completenessOf({ sigma = 4, width = 3 } = {}) {
  const key = `${sigma}|${width}`;
  if (curves.has(key)) return curves.get(key);
  const { adapted: a } = fieldFrame();
  const r = run(a, {
    seed: INJECTION.seed,
    count: INJECTION.count,
    trials: INJECTION.trials,
    binWidth: INJECTION.binWidth,
    magnitude: { ...INJECTION.magnitude },
    fwhm: width,
    detection: { sigma },
  });
  const out = { sigma, width, ok: r.ok, code: r.code, run: r };
  if (r.ok) {
    out.curve = r.curve;
    out.conditions = r.conditions;
    const ref = INJECTION.reference;
    const det = detectIn(a, { ...DETECT, sigma: ref.sigma, fwhm: ref.fwhm });
    const here = conditionsOf(a, det, {
      model: 'gaussian',
      fwhm: ref.fwhm,
      psfSource: 'entered',
    });
    out.applies = appliesTo(r.conditions, here);
  }
  curves.set(key, out);
  return out;
}

/** The completeness the frame's own stars would show if the curve is right: the sum over the stars of the curve at their magnitudes. */
export function expectedFound(curve) {
  const live = curve.bins.filter(b => b.n);
  const at = m => {
    if (m <= live[0].center) return live[0].p;
    if (m >= live[live.length - 1].center) return live[live.length - 1].p;
    let i = 0;
    while (live[i + 1].center < m) i += 1;
    const t = (m - live[i].center) / (live[i + 1].center - live[i].center);
    return live[i].p + t * (live[i + 1].p - live[i].p);
  };
  return STARS.reduce((sum, s) => sum + at(s.mag), 0);
}
