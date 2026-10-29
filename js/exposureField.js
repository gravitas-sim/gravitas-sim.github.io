// =============================================================================
// The frame a plan predicts, and the measurement that checks it
// -----------------------------------------------------------------------------
// planExposure (js/kernels/detector/snr.js) predicts a signal-to-noise. This
// renders the frame that prediction describes through the detector kernel's
// forward model (js/kernels/detector/frame.js) and measures it with the same
// aperture photometry the Observatory's image panel uses (js/measure/photometry.js
// ratios over js/kernels/detector/reduce.js), so a student can compare the
// number the calculation promised with the number a measurement returns.
//
// Every frame is SYNTHETIC and says so; its truth is the plan. Several
// exposures are rendered as one stacked frame with the read noise of n reads,
// R sqrt(n), and the full well n times larger: the same variance, not a
// pixel-for-pixel stack. The prediction for a rendered frame uses the pixels the
// photometry used (their count, the light they hold, the sky ring's count), not
// the continuous aperture, so the two are compared like for like.
//
// Pure: no DOM.
// =============================================================================

import { fractionIn, simulateFrame } from './kernels/detector/frame.js';
import {
  aperturePhotometry,
  aperturePixels,
} from './kernels/detector/reduce.js';
import { FWHM_PER_SIGMA, noiseTerms } from './kernels/detector/snr.js';

const { Math, Float64Array } = globalThis;

/** The ratios Prompt 180's tool uses: aperture and annulus radii in FWHM. */
export const RATIOS = Object.freeze({ r: 1.5, rIn: 3, rOut: 5 });

/** The detector fields that make a frame free of everything the CCD equation leaves out. */
export const CLEAN = Object.freeze({
  vignette: 0,
  dustCount: 0,
  qeScatter: 0,
  hotFraction: 0,
  cosmicRate: 0,
  biasColumnSigma: 0,
});

const GAIN = 1.5;

/**
 * The frame spec for a plan.
 * @param {object} a
 * @param {{pixelScale:number, fwhm:number, readNoise:number, darkRate:number, fullWell?:number}} a.setup
 * @param {{rates:{total:number, sky:number}, seconds:number, exposures:number, geometry:object}} a.plan
 * @param {{kind:'point'}|{kind:'extended', areaArcsec2:number}} a.source
 * @param {string} a.seed
 * @param {number} [a.size=64]
 * @param {object} [a.detector] - overrides (for the unclean frame)
 */
export function planFrameSpec({
  setup,
  plan,
  source,
  seed,
  size = 64,
  detector = CLEAN,
  seconds = plan.seconds ?? plan.needed,
  exposures = plan.exposures ?? 1,
}) {
  const fwhm = setup.fwhm / setup.pixelScale;
  const c = (size - 1) / 2;
  let sources;
  if (source.kind === 'extended') {
    // A uniform disc: one source per pixel, each the surface brightness over a pixel.
    const rPix = Math.sqrt(source.areaArcsec2 / Math.PI) / setup.pixelScale;
    const per = plan.rates.total / (Math.PI * rPix * rPix || 1);
    sources = [];
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++)
        if (Math.hypot(x - c, y - c) <= rPix) sources.push({ x, y, rate: per });
  } else sources = [{ x: c, y: c, rate: plan.rates.total }];
  return {
    seed,
    kind: 'science',
    exposure: seconds,
    detector: {
      width: size,
      height: size,
      gain: GAIN,
      readNoise: setup.readNoise * Math.sqrt(exposures),
      darkRate: setup.darkRate ?? 0,
      fullWell: (setup.fullWell ?? 1e9) * exposures,
      fwhm,
      ...detector,
    },
    scene: { sky: plan.rates.sky, sources },
  };
}

/** Render the frame (counts) and add its image in electrons. */
export function renderPlan(args) {
  const spec = planFrameSpec(args);
  const frame = simulateFrame(spec);
  const d = frame.truth.detector;
  const values = Float64Array.from(
    frame.values,
    v => (v - d.biasLevel) * d.gain
  );
  return {
    spec,
    frame,
    image: { width: frame.width, height: frame.height, values },
    center: { x: (frame.width - 1) / 2, y: (frame.height - 1) / 2 },
    fwhmPixels: d.fwhm,
  };
}

/** The pixel aperture the photometry uses, and what the calculation predicts for it. */
export function pixelAperture(rendered, { r } = {}) {
  const { image, center, fwhmPixels } = rendered;
  const rr = r ?? RATIOS.r * fwhmPixels;
  const rIn = RATIOS.rIn * fwhmPixels;
  const rOut = RATIOS.rOut * fwhmPixels;
  const pix = aperturePixels(image, center.x, center.y, rr);
  const ring =
    aperturePixels(image, center.x, center.y, rOut).length -
    aperturePixels(image, center.x, center.y, rIn).length;
  return {
    r: rr,
    rIn,
    rOut,
    indices: pix,
    npix: pix.length,
    nBackground: ring,
  };
}

/** Aperture photometry of the rendered frame, as the image panel does it. */
export function measureRendered(rendered, opts = {}) {
  const ap = pixelAperture(rendered, opts);
  const d = rendered.frame.truth.detector;
  const m = aperturePhotometry(rendered.image, {
    x: rendered.center.x,
    y: rendered.center.y,
    r: ap.r,
    rIn: ap.rIn,
    rOut: ap.rOut,
    readNoise: d.readNoise,
  });
  return { ...m, aperture: ap };
}

/**
 * What the CCD equation predicts for the rendered frame's pixel aperture: the
 * true electrons the aperture holds (from the frame's own truth), the sky and
 * dark per pixel, and the noise terms.
 */
export function predictRendered(rendered, opts = {}) {
  const ap = pixelAperture(rendered, opts);
  const { truth, exposure } = rendered.frame;
  const d = truth.detector;
  const S = ap.indices.reduce((s, i) => s + truth.starElectrons[i], 0);
  const sky = truth.scene.sky * exposure + d.darkRate * exposure;
  const terms = noiseTerms({
    signal: S,
    npix: ap.npix,
    sky,
    dark: 0,
    readNoise: d.readNoise,
    nBackground: ap.nBackground,
  });
  return { signal: S, sigma: terms.noise, snr: terms.snr, terms, aperture: ap };
}

/** The fraction of a Gaussian of this FWHM (pixels) a pixel aperture holds, by the frame model's own integral. */
export function enclosedInPixels(indices, width, x, y, fwhm) {
  const s = fwhm / FWHM_PER_SIGMA;
  let sum = 0;
  for (const i of indices) {
    const px = i % width;
    const py = (i - px) / width;
    sum +=
      fractionIn(px - 0.5, px + 0.5, x, s) *
      fractionIn(py - 0.5, py + 0.5, y, s);
  }
  return sum;
}
