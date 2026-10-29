// =============================================================================
// The spectrograph's views (Prompt 213, SPECTROGRAPH.md)
// -----------------------------------------------------------------------------
// What the three panels and the Observatory's spectrograph section show, built from the
// kernel (js/kernels/spectrograph/) and nothing else: a pair of lines through an
// instrument, an arc and a star calibrated and measured, and the trade between resolving
// power, the slit and the signal-to-noise. No physics is written here; every number a
// lesson states is recomputed from these functions in tests/spectrographLessons.test.js.
//
// Everything is synthetic and says so. Pure: no DOM, no clock; the noise is the kernel's
// named `noise` stream, forked by the controls, so a view is a pure function of its
// controls.
// =============================================================================

import * as K from './kernels/spectrograph/index.js';
import { LINES } from './data/radiation/lines.js';
import { telescopeOf } from './instruments/spectrograph.js';

export const LINE_LIST = LINES;
export const SEED = 'spectrograph-213';
const { Math, Float64Array } = globalThis;

const byId = id => LINES.find(l => l.id === id);
const at = (list, i) =>
  list[Math.max(0, Math.min(list.length - 1, Math.round(i ?? 0)))];

// ---------------------------------------------------------------------------- two lines
/** The resolving powers, the samplings (pixels per FWHM) and the signal-to-noise settings the pair panel steps through. */
export const PAIR_R = Object.freeze([
  100, 200, 300, 500, 750, 1000, 1500, 2000, 3000, 5000,
]);
export const PAIR_SAMPLING = Object.freeze([1, 1.5, 2, 3, 4, 6, 8]);
/** Peak signal-to-noise of one line alone; 0 is no noise. */
export const PAIR_SNR = Object.freeze([0, 30, 100, 300]);
export const PAIR_CENTRE_NM = 500;
const PAIR_PIXELS = 240;

/** The peak, in electrons, that gives a line alone a peak signal-to-noise `snr` over the pixel's own noise. */
export const peakForSnr = (snr, background, read) => {
  const v = background + read * read;
  return 0.5 * (snr * snr + snr * Math.sqrt(snr * snr + 4 * v));
};

/**
 * Two equal emission lines through an instrument.
 * @param {{R?: number, separationNm?: number, sampling?: number, snr?: number, seed?: number}} v
 */
export function pairView(v = {}) {
  const R = v.R ?? 1000;
  const sepNm = v.separationNm ?? 0.5;
  const sampling = v.sampling ?? 3;
  const snr = v.snr ?? 0;
  const fwhm = PAIR_CENTRE_NM / R;
  const d = fwhm / sampling;
  const spec = K.makeSpectrograph({
    coefficients: [PAIR_CENTRE_NM - (PAIR_PIXELS / 2) * d, d],
    nPixels: PAIR_PIXELS,
    lsfFwhmNm: fwhm,
    readNoiseE: 5,
    name: 'practice spectrograph',
  });
  const peak = snr > 0 ? peakForSnr(snr, 20, 5) : 1e4;
  // a line alone peaks at `peak` electrons in the pixel at its centre: F d / (sigma sqrt(2 pi))
  const flux = (peak * spec.lsfSigmaNm * Math.sqrt(2 * Math.PI)) / d;
  const centre = PAIR_CENTRE_NM + 0.37 * d;
  const lines = [centre - sepNm / 2, centre + sepNm / 2].map(c =>
    K.emissionLine({ centreNm: c, fluxE: flux })
  );
  const template = {
    continuum: { perPixel: 20, density: () => 0, slope: () => 0 },
    lines,
  };
  const expo =
    snr > 0
      ? K.exposure(spec, template, {
          seed: SEED,
          labels: ['pair', R, sepNm, sampling, snr, v.seed ?? 0],
        })
      : K.exposure(spec, template);
  const xs = Float64Array.from({ length: PAIR_PIXELS }, (_, i) => i);
  const x0 = Math.round(spec.pixelOf(PAIR_CENTRE_NM));
  const fit = K.fitLine(xs, expo.counts, expo.sigma, {
    guess: x0,
    halfWidth: Math.max(8, Math.ceil(4 * sampling + (sepNm / d) * 0.6)),
    lsfFwhmPx: sampling,
  });
  // the pixels' own maxima in the noise-free spectrum
  const e = expo.expected;
  const peaks = [];
  for (let i = 1; i < e.length - 1; i++)
    if (e[i] > e[i - 1] && e[i] >= e[i + 1] && e[i] > 0.5 * Math.max(...e))
      peaks.push(i);
  const sepFwhm = sepNm / fwhm;
  return {
    spec,
    expo,
    xs,
    lines,
    R,
    fwhmNm: fwhm,
    dispersionNm: d,
    sampling,
    samplingVerdict: K.judgeSampling(sampling),
    sepNm,
    sepFwhm,
    sepPx: sepNm / d,
    dipModel: K.pairDip(sepFwhm),
    pixelPeaks: peaks.length,
    pixelsShowTwo: peaks.length >= 2,
    fit,
    peak,
    curve: lam =>
      lines.reduce(
        (s, l) =>
          s + l.fluxE * K.gaussianDensity(lam - l.centreNm, spec.lsfSigmaNm),
        20 / d
      ) * d,
  };
}

// ---------------------------------------------------------------------------- the arc and the star
export const ARC_SEED_COUNT = 5;
export const SCIENCE_LINES = Object.freeze([
  'h-beta',
  'h-gamma',
  'h-delta',
  'h-epsilon',
]);
export const SCIENCE_VELOCITY_KMS = 120;

let refCache = null;
/** The reference spectrograph and its lamp, made once. */
export function reference() {
  if (refCache) return refCache;
  const spec = K.referenceSpectrograph();
  const lamp = K.arcLamp(spec, LINES, 'air');
  const isolated = K.isolatedLines(spec, LINES, 'air')
    .filter(l => l.air >= spec.rangeNm[0] && l.air <= spec.rangeNm[1] - 1)
    .sort((a, b) => a.air - b.air);
  refCache = {
    spec,
    lamp,
    isolated,
    order: spreadOrder(isolated.map(l => spec.pixelOf(l.air))),
    expectedArc: K.expectedCounts(spec, lamp),
  };
  return refCache;
}

/** The order lines are marked in: the two ends first, then each next one farthest from those marked (so few lines are well spread). */
export function spreadOrder(px) {
  const n = px.length;
  if (n < 3) return px.map((_, i) => i);
  const order = [0, n - 1];
  while (order.length < n) {
    let best = -1;
    let bestD = -1;
    for (let i = 0; i < n; i++) {
      if (order.includes(i)) continue;
      const dist = Math.min(...order.map(j => Math.abs(px[i] - px[j])));
      if (dist > bestD) {
        bestD = dist;
        best = i;
      }
    }
    order.push(best);
  }
  return order;
}

/**
 * The arc, a calibration from the first `marked` lines (spread over the detector) and a star measured with it.
 * @param {{marked?: number, degree?: number, seed?: number, line?: number, restMedium?: 'air'|'vacuum'}} v
 */
export function arcView(v = {}) {
  const ref = reference();
  const { spec, lamp, isolated, order } = ref;
  const marked = Math.max(
    1,
    Math.min(isolated.length, Math.round(v.marked ?? 8))
  );
  const degree = Math.max(1, Math.min(K.MAX_DEGREE, Math.round(v.degree ?? 3)));
  const seed = Math.round(v.seed ?? 0);
  const lineId = at(SCIENCE_LINES, v.line ?? 0);
  const restMedium = v.restMedium === 'vacuum' ? 'vacuum' : 'air';
  const { counts, sigma } = K.addNoise(
    ref.expectedArc,
    spec.readNoiseE,
    K.normalStream(SEED, 'arc', seed)
  );
  const xs = Float64Array.from({ length: spec.nPixels }, (_, i) => i);
  const used = order.slice(0, marked).sort((a, b) => a - b);
  const fits = used.map(k => {
    const l = isolated[k];
    const tx = spec.pixelOf(l.air);
    return {
      line: l,
      truthPx: tx,
      fit: K.fitLine(xs, counts, sigma, {
        guess: Math.round(tx),
        halfWidth: 12,
        lsfFwhmPx: spec.fwhmPxAt(tx),
      }),
    };
  });
  const good = fits.filter(f => f.fit.status === 'ok');
  const solution = K.fitSolution(
    good.map(f => ({
      x: f.fit.centrePx,
      sigmaX: f.fit.sigmaCentrePx,
      wavelengthNm: f.line.air,
      id: f.line.id,
    })),
    degree,
    { medium: 'air' }
  );
  // the star
  const star = K.starTemplate({
    lines: SCIENCE_LINES.map(byId),
    medium: 'air',
    velocityKmS: SCIENCE_VELOCITY_KMS,
    temperatureK: 6000,
    densityAt500PerNm: 1e4 / spec.dispersionAt(spec.pixelOf(500)),
    sigmaIntNm: 0.1,
    depth: 0.4,
  });
  const sci = K.addNoise(
    K.expectedCounts(spec, star),
    spec.readNoiseE,
    K.normalStream(SEED, 'star', seed)
  );
  const rest = byId(lineId);
  const truthObs = star.lines.find(l => l.id === lineId).centreNm;
  const tx = spec.pixelOf(truthObs);
  const sciFit = K.fitLine(xs, sci.counts, sci.sigma, {
    guess: Math.round(tx),
    halfWidth: 12,
    lsfFwhmPx: spec.fwhmPxAt(tx),
  });
  let measured = null;
  if (solution.coefficients && sciFit.status === 'ok') {
    const w = solution.wavelengthOf(sciFit.centrePx, sciFit.sigmaCentrePx);
    const velocity = K.radialVelocity({
      observedNm: w.nm,
      sigmaNm: w.sigmaNm,
      restNm: rest[restMedium],
      observedMedium: 'air',
      restMedium,
    });
    const ignored = (299792.458 * (w.nm - rest[restMedium])) / rest[restMedium];
    measured = {
      line: rest,
      wavelength: w,
      velocity,
      // what the number would be if the media were ignored: shown as the wrong answer it is
      ignoringMediaKmS: ignored,
      mediaOffsetKmS: K.mediaOffsetKmS(rest),
    };
  }
  return {
    spec,
    counts,
    sigma,
    xs,
    marked,
    degree,
    seed,
    fits,
    solution,
    science: {
      counts: sci.counts,
      sigma: sci.sigma,
      fit: sciFit,
      lineId,
      restMedium,
      measured,
    },
    lampLines: lamp.lines,
    isolated,
    order,
  };
}

// ---------------------------------------------------------------------------- the trade
export const TRADE_R_RS = Object.freeze([1000, 2000, 3000, 4000, 6000]);
export const TRADE_APERTURES = Object.freeze(['lco-0m35', 'lco-1m0', 'rubin']);
/** Photons per second per square metre per nm at V = 0: a teaching value of the order of Vega's V-band flux (SPECTROGRAPH.md). */
export const PHOTONS_V0 = 1.0e8;
/** Everything else between the sky and an electron: telescope, optics, grating, detector, a teaching 0.3. */
export const TRADE_EFFICIENCY = 0.3;
export const TRADE_LAMBDA_NM = 500;

/**
 * One point and the curve of the resolving-power trade for a line in a star's spectrum.
 * @param {{R?: number, Rs?: number, seeing?: number, sigmaIntNm?: number, ewNm?: number, vmag?: number, facility?: string, exposureS?: number}} v
 */
export function tradeView(v = {}) {
  const Rs = v.Rs ?? 3000;
  const R = v.R ?? Rs;
  const seeing = v.seeing ?? 1;
  const sigmaIntNm = v.sigmaIntNm ?? 0;
  const ewNm = v.ewNm ?? 0.02;
  const vmag = v.vmag ?? 12;
  const facility = at(TRADE_APERTURES, v.facility ?? 1);
  const exposureS = v.exposureS ?? 600;
  const area = telescopeOf(facility);
  const full =
    PHOTONS_V0 *
    10 ** (-0.4 * vmag) *
    area.areaM2 *
    TRADE_EFFICIENCY *
    exposureS;
  const common = {
    Rs,
    lambdaNm: TRADE_LAMBDA_NM,
    sigmaIntNm,
    ewNm,
    continuumPerNmFull: full,
    readNoiseE: 5,
  };
  const point = K.tradePoint({ R, ...common });
  const curve = [];
  const n = 60;
  const lo = Rs / 10;
  const hi = 10 * Rs;
  for (let i = 0; i < n; i++) {
    const r = lo * (hi / lo) ** (i / (n - 1));
    curve.push(K.tradePoint({ R: r, ...common }));
  }
  const optimum = K.optimumResolvingPower({
    Rs,
    lambdaNm: TRADE_LAMBDA_NM,
    sigmaIntNm,
    lo,
    hi,
  });
  const best = K.tradePoint({ R: optimum.R, ...common });
  return {
    facility,
    areaM2: area.areaM2,
    area,
    Rs,
    R,
    seeing,
    slitArcsec: K.slitWidthFor(R, Rs, seeing),
    point,
    curve,
    optimum: { ...optimum, point: best },
    continuumPerNmFull: full,
    sigmaIntNm,
    ewNm,
    vmag,
    exposureS,
  };
}
