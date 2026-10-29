// =============================================================================
// Synthetic nights of standard stars, and the frames they could be measured on
// -----------------------------------------------------------------------------
// The calibration kernel (js/kernels/detector/photcal.js) solves a night; this
// makes one. Every night is SYNTHETIC and carries its truth manifest: the zero
// point, the extinction, the colour term and the noise it was made with, and the
// true magnitude of every target, so a fit can be judged against what it should
// have found. The instrumental noise is drawn from the 'noise' stream of
// js/random/streams.js, forked by the seed, so a night is the same everywhere.
//
// Two kinds:
//   a parametric night   the instrumental magnitudes follow the calibration
//                        equation exactly, plus Gaussian noise (the equation of
//                        the kernel run forwards: expectedInstrumental)
//   frames               the same stars rendered as CCD frames through the
//                        detector kernel (js/kernels/detector/frame.js) at
//                        several airmasses and measured with the Observatory's
//                        aperture photometry (js/kernels/detector/reduce.js), so
//                        the counts a student's measurement would give become
//                        the instrumental magnitudes
// Pure: no DOM.
// =============================================================================

import { gaussian, stream } from './random/streams.js';
import { simulateFrame } from './kernels/detector/frame.js';
import { aperturePhotometry } from './kernels/detector/reduce.js';
import {
  expectedInstrumental,
  instrumentalMagnitude,
} from './kernels/detector/photcal.js';

const { Math, Float64Array } = globalThis;

/** The airmasses a night's standards are observed at (the pinned nights'). */
export const AIRMASS_LIST = Object.freeze([1.05, 1.3, 1.55, 1.8, 2.15, 2.4]);

/** A night's defaults: the geometry of the oracle's N1 (14 standards, three airmasses each). */
export const NIGHT_DEFAULTS = Object.freeze({
  truth: Object.freeze({ Z1: 24.8, k: 0.21, c: 0.08, k2: 0 }),
  stars: 14,
  magnitudeStart: 11,
  magnitudeStep: 0.8,
  colourLo: -0.2,
  colourHi: 1.5,
  airmasses: AIRMASS_LIST,
  perStar: 3,
  sigmaInst: 0.005,
  sigmaStd: 0.005,
});

/**
 * A night of standards.
 * @param {object} spec
 * @param {string} spec.seed
 * @param {{Z1: number, k: number, c?: number, k2?: number}} [spec.truth]
 * @param {number} [spec.stars=14]
 * @param {number[]} [spec.airmasses] - the list each star draws its airmasses from, in order
 * @param {number} [spec.perStar=3]
 * @param {number|((M: number) => number)} [spec.sigmaInst=0.005]
 * @param {boolean} [spec.catalogueErrors=false] - draw the catalogue magnitudes with their sigma
 * @returns {{observations: object[], truth: object, spec: object, stars: object[]}}
 */
export function drawNight(spec) {
  const s = { ...NIGHT_DEFAULTS, ...spec };
  const truth = { c: 0, k2: 0, ...s.truth };
  const noise = gaussian(stream('noise', s.seed, 'night'));
  const cat = gaussian(stream('noise', s.seed, 'catalogue'));
  const sigmaOf =
    typeof s.sigmaInst === 'function' ? s.sigmaInst : () => s.sigmaInst;
  const observations = [];
  const stars = [];
  const first = Math.max(1, s.airmasses.length - s.perStar + 1);
  for (let i = 0; i < s.stars; i++) {
    const M = s.magnitudeStart + s.magnitudeStep * i;
    const C =
      s.stars > 1
        ? s.colourLo + ((s.colourHi - s.colourLo) * i) / (s.stars - 1)
        : s.colourLo;
    const Mcat = M + (s.catalogueErrors ? s.sigmaStd * cat() : 0);
    stars.push({ id: `s${String(i).padStart(2, '0')}`, M, C });
    for (let j = 0; j < s.perStar; j++) {
      const X = s.airmasses[(i % first) + j];
      const sigma = sigmaOf(M);
      observations.push({
        id: `s${String(i).padStart(2, '0')}-${j}`,
        star: `s${String(i).padStart(2, '0')}`,
        X,
        m: expectedInstrumental(truth, { M, X, C }) + sigma * noise(),
        sigma,
        M: Mcat,
        sigmaM: s.sigmaStd,
        C,
      });
    }
  }
  return { observations, truth, spec: s, stars };
}

/**
 * One target observed on a night: its instrumental magnitude from the night's truth and a noise draw.
 * @param {{truth: object}} night
 * @param {{id?: string, M: number, C: number, X: number, sigma: number, seed: string, knownColour?: boolean}} t
 */
export function drawTarget(night, t) {
  const noise = gaussian(stream('noise', t.seed, `target:${t.id ?? 't'}`));
  const m =
    expectedInstrumental(night.truth, { M: t.M, X: t.X, C: t.C }) +
    t.sigma * noise();
  return {
    id: t.id ?? 't',
    m,
    sigma: t.sigma,
    X: t.X,
    ...(t.knownColour === false ? {} : { C: t.C }),
    truth: { M: t.M, C: t.C },
  };
}

// ---- frames -----------------------------------------------------------------------------------------------

/** The frame geometry of the frame leg and the panel: a 96 by 96 field, a 2.8 pixel FWHM, 30 s. */
export const FRAME = Object.freeze({
  size: 96,
  fwhm: 2.8,
  seconds: 30,
  gain: 1.5,
  radius: 1.5,
  sky: 4,
  readNoise: 6,
});

/** Electrons per second of a star at the equation's truth: m = -2.5 log10(rate) with M - m from the equation. */
export function rateOf(truth, { M, X, C }) {
  return (
    10 ** (-0.4 * expectedInstrumental({ c: 0, k2: 0, ...truth }, { M, X, C }))
  );
}

/**
 * Stars on a grid with margins, in a seeded order: where the standards and the target sit on each frame.
 * @param {number} n
 * @param {string} seed
 */
export function placeStars(n, seed, size = FRAME.size) {
  const rng = stream('noise', seed, 'placement');
  const cols = Math.ceil(Math.sqrt(n));
  const cell = (size - 16) / cols;
  const out = [];
  for (let i = 0; i < n; i++) {
    const cx = i % cols;
    const cy = Math.floor(i / cols);
    out.push({
      x: 8 + cell * (cx + 0.2 + 0.6 * rng()),
      y: 8 + cell * (cy + 0.2 + 0.6 * rng()),
    });
  }
  return out;
}

/**
 * Render a frame of stars at an airmass and measure each with aperture photometry.
 * @param {object} a
 * @param {{Z1: number, k: number, c?: number}} a.truth
 * @param {{id: string, M: number, C: number}[]} a.stars
 * @param {number} a.X
 * @param {string} a.seed
 * @returns {{frame: object, measurements: object[]}} each measurement {id, X, m, sigma, net, snr, x, y}
 */
export function measureFrame({ truth, stars, X, seed, config = FRAME }) {
  const pos = placeStars(stars.length, seed, config.size);
  const sources = stars.map((s, i) => ({
    ...pos[i],
    rate: rateOf(truth, { M: s.M, X, C: s.C }),
  }));
  const frame = simulateFrame({
    seed,
    kind: 'science',
    exposure: config.seconds,
    detector: {
      width: config.size,
      height: config.size,
      gain: config.gain,
      readNoise: config.readNoise,
      darkRate: 0,
      fullWell: 1e9,
      fwhm: config.fwhm,
      vignette: 0,
      dustCount: 0,
      qeScatter: 0,
      hotFraction: 0,
      cosmicRate: 0,
      biasColumnSigma: 0,
    },
    scene: { sky: config.sky, sources },
  });
  const d = frame.truth.detector;
  const values = Float64Array.from(
    frame.values,
    v => (v - d.biasLevel) * d.gain
  );
  const image = { width: frame.width, height: frame.height, values };
  const measurements = stars.map((s, i) => {
    const r = aperturePhotometry(image, {
      x: pos[i].x,
      y: pos[i].y,
      r: config.radius * config.fwhm,
      rIn: 3 * config.fwhm,
      rOut: 5 * config.fwhm,
      readNoise: d.readNoise,
    });
    const im = instrumentalMagnitude({
      counts: r.net,
      seconds: config.seconds,
      sigmaCounts: r.sigma,
    });
    return {
      id: s.id,
      X,
      net: r.net,
      snr: r.snr,
      x: pos[i].x,
      y: pos[i].y,
      ...(im.ok ? { m: im.m, sigma: im.sigma } : { refused: im.code }),
    };
  });
  return { frame, measurements };
}
