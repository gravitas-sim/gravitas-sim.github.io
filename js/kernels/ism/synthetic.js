// =============================================================================
// ISM kernel: synthetic spectra with a truth manifest (the labelled fallback)
// -----------------------------------------------------------------------------
// Three invented worlds, each a forward model with a stated truth (ISM.md):
//   generateNebula   an emission-line object: Gaussian lines (the Balmer lines by default) at a
//                    velocity, reddened through the CCM89 law, on a sloped continuum, sampled on
//                    a log-wavelength grid at SDSS-like resolution
//   generateStar     a hot star: broad Gaussian Balmer absorption at its velocity, narrow
//                    Gaussian interstellar absorption at another
//   generateSodium   an interstellar doublet, Gaussian optical depth for a column density,
//                    convolved with a Gaussian line-spread function, at high resolution
// Every sample is the pixel-integrated value (the pixel is the logarithmic step), noise is
// white Gaussian from the named stream `noise`. The line wavelengths are the pack's, not
// invented; every other number is invented by a rule and labelled so. Not a measurement
// of any object. Pure given a seed.
// =============================================================================

import { gaussian, stream } from '../../random/streams.js';
import { C_LIGHT } from '../radiation/constants.js';
import { extinctionRatio } from '../radiation/extinction.js';
import { FWHM_PER_SIGMA, gaussianArea } from '../spectrograph/lsf.js';
import { columnFromPeakDepth, peakOpticalDepth } from './constants.js';

const { Math, Float64Array } = globalThis;
const C_KM_S = C_LIGHT / 1000;

/** The label every generated spectrum carries. */
export const ISM_SYNTHETIC_LABEL =
  'SYNTHETIC ISM SPECTRUM: an invented object observed by an invented spectrograph, with stated line fluxes, reddening, velocities, column densities and noise, not a measurement of any object';

/** The defaults of the validation contract's worlds. */
export const ISM_WORLD = Object.freeze({
  resolvingPower: 1800,
  log10Step: 1e-4,
  log10Start: Math.log10(380),
  samples: 3840,
  continuum: Object.freeze({ c0: 1, slope: 0.2 }),
  sigmaPixel: 0.05,
  intrinsicSigmaKmS: 30,
  intrinsic: Object.freeze({ 'h-alpha': 3.0, 'h-gamma': 0.5 }),
  RV: 3.1,
});

/** Relativistic Doppler factor: lambda_obs / lambda_rest. */
export const dopplerFactor = vKmS => {
  const b = vKmS / C_KM_S;
  return Math.sqrt((1 + b) / (1 - b));
};

const byId = (lines, id) => {
  const l = lines.find(x => x.id === id);
  if (!l) throw new Error(`ism synthetic: no line ${id} in the pack`);
  return l;
};

function logGrid({ log10Start, log10Step, samples }) {
  const lambda = new Float64Array(samples);
  const lo = new Float64Array(samples);
  const hi = new Float64Array(samples);
  for (let i = 0; i < samples; i++) {
    lambda[i] = 10 ** (log10Start + i * log10Step);
    lo[i] = 10 ** (log10Start + (i - 0.5) * log10Step);
    hi[i] = 10 ** (log10Start + (i + 0.5) * log10Step);
  }
  return { lambda, lo, hi };
}

const continuumAt = (c, lambda) =>
  c.c0 * (1 + (c.slope * (lambda - 550)) / 550) +
  (c.curvature ? c.c0 * c.curvature * ((lambda - c.curvatureCentre) / c.curvatureHalf) ** 2 : 0);

function finish({ lambda, flux, sigmaPixel, noise, seed, label, medium, resolvingPower, truth }) {
  const n = lambda.length;
  const out = new Float64Array(flux);
  if (noise) {
    const draw = gaussian(stream('noise', seed, label));
    for (let i = 0; i < n; i++) out[i] += sigmaPixel * draw();
  }
  return {
    lambdaNm: lambda,
    flux: out,
    sigma: new Float64Array(n).fill(sigmaPixel),
    medium,
    resolvingPower,
    label: ISM_SYNTHETIC_LABEL,
    truth: { ...truth, seed, sigmaPixel, noise, resolvingPower, medium },
  };
}

/**
 * An emission-line object. The observed H-beta peak (in continuum units, the pixel-integrated amplitude) sets the scale;
 * the other lines follow from the intrinsic ratios and the reddening.
 */
export function generateNebula({
  lines,
  law,
  seed = 'ism-nebula',
  velocityKmS = 0,
  ebv = 0,
  RV = ISM_WORLD.RV,
  hbetaPeak = 1,
  intrinsic = ISM_WORLD.intrinsic,
  intrinsicSigmaKmS = ISM_WORLD.intrinsicSigmaKmS,
  sigmaPixel = ISM_WORLD.sigmaPixel,
  noise = true,
  medium = 'vacuum',
  extraLines = [],
  stellarAbsorptionFraction = 0,
  continuum = ISM_WORLD.continuum,
  resolvingPower = ISM_WORLD.resolvingPower,
  log10Step = ISM_WORLD.log10Step,
  log10Start = ISM_WORLD.log10Start,
  samples = ISM_WORLD.samples,
} = {}) {
  const g = logGrid({ log10Start, log10Step, samples });
  const lsfKmS = C_KM_S / resolvingPower / FWHM_PER_SIGMA;
  const sKmS = Math.hypot(intrinsicSigmaKmS, lsfKmS);
  const D = dopplerFactor(velocityKmS);
  const kOf = lambda => RV * extinctionRatio(lambda, RV, law);
  const beta = byId(lines, 'h-beta');
  const restBeta = beta[medium];
  const obsSigmaBeta = (restBeta * D * sKmS) / C_KM_S;
  const fluxBetaObs = hbetaPeak * obsSigmaBeta * Math.sqrt(2 * Math.PI);
  const fluxBetaInt = fluxBetaObs * 10 ** (0.4 * kOf(restBeta) * ebv);
  const entries = [
    { id: 'h-beta', ratio: 1 },
    ...Object.entries(intrinsic).map(([id, ratio]) => ({ id, ratio })),
  ].map(({ id, ratio }) => {
    const restNm = byId(lines, id)[medium];
    const fluxIntrinsic = fluxBetaInt * ratio;
    let fluxObserved = fluxIntrinsic * 10 ** (-0.4 * kOf(restNm) * ebv);
    // stellar absorption under a line removes this fraction of H-beta's observed flux from every Balmer line's equal-width share
    if (stellarAbsorptionFraction && id === 'h-beta')
      fluxObserved *= 1 - stellarAbsorptionFraction;
    return { id, restNm, fluxIntrinsic, fluxObserved, ratio };
  });
  for (const x of extraLines)
    entries.push({
      id: x.id,
      restNm: x.restNm,
      fluxIntrinsic: x.flux,
      fluxObserved: x.flux,
      ratio: null,
      invented: true,
    });
  const flux = new Float64Array(samples);
  for (let i = 0; i < samples; i++) {
    const w = g.hi[i] - g.lo[i];
    let v = continuumAt(continuum, 0.5 * (g.lo[i] + g.hi[i]));
    for (const e of entries) {
      const centre = e.restNm * D;
      const sig = (centre * sKmS) / C_KM_S;
      if (Math.abs(g.lambda[i] - centre) > 8 * sig + w) continue;
      v += (e.fluxObserved * gaussianArea(centre, sig, g.lo[i], g.hi[i])) / w;
    }
    flux[i] = v;
  }
  return finish({
    lambda: g.lambda,
    flux,
    sigmaPixel,
    noise,
    seed,
    label: 'nebula',
    medium,
    resolvingPower,
    truth: {
      world: 'nebula',
      velocityKmS,
      ebv,
      RV,
      intrinsicRatios: { ...intrinsic },
      intrinsicSigmaKmS,
      sigmaKmSObserved: sKmS,
      continuum: { ...continuum },
      lines: entries.map(e => ({
        id: e.id,
        restNm: e.restNm,
        observedNm: e.restNm * D,
        sigmaNm: (e.restNm * D * sKmS) / C_KM_S,
        fluxIntrinsic: e.fluxIntrinsic,
        fluxObserved: e.fluxObserved,
        invented: Boolean(e.invented),
      })),
    },
  });
}

/**
 * A hot star: broad Gaussian absorption at the star's velocity and narrow Gaussian absorption at another, as flux fractions
 * of a sloped continuum. The equivalent width of each is its depth times its intrinsic sigma times sqrt(2 pi).
 */
export function generateStar({
  lines,
  seed = 'ism-star',
  stellarVelocityKmS = 0,
  stellarSigmaKmS = 500,
  stellarDepth = 0.5,
  stellarIds = ['h-beta', 'h-gamma', 'h-delta'],
  ismIds = ['ca2-k', 'ca2-h'],
  ismVelocityKmS = 100,
  ismSigmaKmS = 20,
  ismDepth = 0.5,
  sigmaPixel = 0.01,
  noise = true,
  medium = 'vacuum',
  continuum = ISM_WORLD.continuum,
  resolvingPower = ISM_WORLD.resolvingPower,
  log10Step = ISM_WORLD.log10Step,
  log10Start = ISM_WORLD.log10Start,
  samples = ISM_WORLD.samples,
} = {}) {
  const g = logGrid({ log10Start, log10Step, samples });
  const lsfKmS = C_KM_S / resolvingPower / FWHM_PER_SIGMA;
  const comps = [];
  const add = (id, kind, vKmS, sIntKmS, depth) => {
    const restNm = byId(lines, id)[medium];
    const centre = restNm * dopplerFactor(vKmS);
    const sObsKmS = Math.hypot(sIntKmS, lsfKmS);
    comps.push({
      id,
      kind,
      restNm,
      centre,
      sigmaObsNm: (centre * sObsKmS) / C_KM_S,
      ewNm: depth * ((centre * sIntKmS) / C_KM_S) * Math.sqrt(2 * Math.PI),
      depth,
      velocityKmS: vKmS,
      sigmaIntKmS: sIntKmS,
    });
  };
  for (const id of stellarIds) add(id, 'stellar', stellarVelocityKmS, stellarSigmaKmS, stellarDepth);
  for (const id of ismIds) add(id, 'interstellar', ismVelocityKmS, ismSigmaKmS, ismDepth);
  const flux = new Float64Array(samples);
  for (let i = 0; i < samples; i++) {
    const w = g.hi[i] - g.lo[i];
    const C = continuumAt(continuum, 0.5 * (g.lo[i] + g.hi[i]));
    let dip = 0;
    for (const c of comps) {
      if (Math.abs(g.lambda[i] - c.centre) > 8 * c.sigmaObsNm + w) continue;
      dip += (c.ewNm * gaussianArea(c.centre, c.sigmaObsNm, g.lo[i], g.hi[i])) / w;
    }
    flux[i] = C * (1 - dip);
  }
  return finish({
    lambda: g.lambda,
    flux,
    sigmaPixel,
    noise,
    seed,
    label: 'star',
    medium,
    resolvingPower,
    truth: {
      world: 'star',
      stellarVelocityKmS,
      ismVelocityKmS,
      offsetKmS: ismVelocityKmS - stellarVelocityKmS,
      continuum: { ...continuum },
      lines: comps.map(c => ({
        id: c.id,
        kind: c.kind,
        restNm: c.restNm,
        observedNm: c.centre,
        velocityKmS: c.velocityKmS,
        sigmaIntrinsicKmS: c.sigmaIntKmS,
        depthIntrinsic: c.depth,
        equivalentWidthNm: c.ewNm,
      })),
    },
  });
}

/**
 * An interstellar sodium doublet at high resolution: tau(lambda) Gaussian for each line from one column density, the flux exp(-tau)
 * convolved with a Gaussian line-spread function (direct sum on a grid eight times finer than the pixel) and averaged over each pixel.
 * Give `tau0` (the peak depth of the line with the larger f lambda^2) or `N` (cm^-2).
 */
export function generateSodium({
  lines,
  f,
  seed = 'ism-sodium',
  tau0,
  N,
  intrinsicSigmaKmS = 3,
  velocityKmS = 0,
  sigmaPixel = 0.002,
  noise = true,
  medium = 'vacuum',
  resolvingPower = 30000,
  log10Step = 4e-6,
  windowNm = [580, 600],
  ids = ['na1-d1', 'na1-d2'],
} = {}) {
  const sub = 8;
  const rest = ids.map(id => byId(lines, id)[medium]);
  const D = dopplerFactor(velocityKmS);
  const strong = ids
    .map((id, k) => ({ k, s: f[id] * rest[k] * rest[k] }))
    .sort((p, q) => q.s - p.s)[0].k;
  const NCm2 =
    N ?? columnFromPeakDepth(tau0, f[ids[strong]], rest[strong], intrinsicSigmaKmS);
  const lambdaMid = 0.5 * (windowNm[0] + windowNm[1]);
  const sigmaLsfNm = lambdaMid / resolvingPower / FWHM_PER_SIGMA;
  const comps = ids.map((id, k) => {
    const centre = rest[k] * D;
    const sigmaNm = (centre * intrinsicSigmaKmS) / C_KM_S;
    const t0 = peakOpticalDepth(NCm2, f[id], rest[k], intrinsicSigmaKmS);
    return { id, restNm: rest[k], centre, sigmaNm, tau0: t0, f: f[id] };
  });
  const log0 = Math.log10(windowNm[0]);
  const samples = Math.floor((Math.log10(windowNm[1]) - log0) / log10Step) + 1;
  const g = logGrid({ log10Start: log0, log10Step, samples });
  // the fine grid: sub samples per pixel, padded by 5 sigma_lsf each side
  const fine = samples * sub;
  const fineLambda = new Float64Array(fine);
  const stepFine = log10Step / sub;
  // build it plainly: sub-sample m of pixel i sits at log10 position (i - 0.5 + (m + 0.5) / sub) step
  for (let i = 0; i < samples; i++)
    for (let m = 0; m < sub; m++)
      fineLambda[i * sub + m] = 10 ** (log0 + (i - 0.5 + (m + 0.5) / sub) * log10Step);
  const depth = new Float64Array(fine); // 1 - exp(-tau) before the line-spread function
  const ewTruth = comps.map(() => 0);
  for (let j = 0; j < fine; j++) {
    let tau = 0;
    for (const c of comps) tau += c.tau0 * Math.exp((-0.5 * ((fineLambda[j] - c.centre) / c.sigmaNm) ** 2));
    depth[j] = 1 - Math.exp(-tau);
  }
  // the equivalent width of each line alone, by the fine grid (the convolution conserves area)
  comps.forEach((c, k) => {
    let s = 0;
    for (let j = 0; j < fine; j++) {
      if (Math.abs(fineLambda[j] - c.centre) > 10 * c.sigmaNm) continue;
      const w =
        fineLambda[j] * Math.LN10 * stepFine;
      s += (1 - Math.exp(-c.tau0 * Math.exp(-0.5 * ((fineLambda[j] - c.centre) / c.sigmaNm) ** 2))) * w;
    }
    ewTruth[k] = s;
  });
  // convolve the depth with a Gaussian of sigma_lsf (in fine samples, from the local sample width), only near the lines
  const flux = new Float64Array(samples).fill(1);
  const sigmaFine = sigmaLsfNm / (lambdaMid * Math.LN10 * stepFine);
  const half = Math.ceil(5 * sigmaFine);
  const kern = new Float64Array(2 * half + 1);
  let ks = 0;
  for (let q = -half; q <= half; q++) {
    kern[q + half] = Math.exp(-0.5 * (q / sigmaFine) ** 2);
    ks += kern[q + half];
  }
  for (let q = 0; q < kern.length; q++) kern[q] /= ks;
  const near = comps.map(c => [
    c.centre - 8 * c.sigmaNm - 5 * sigmaLsfNm - 1e-9,
    c.centre + 8 * c.sigmaNm + 5 * sigmaLsfNm + 1e-9,
  ]);
  for (let i = 0; i < samples; i++) {
    if (!near.some(([a, b]) => g.hi[i] >= a && g.lo[i] <= b)) continue;
    let acc = 0;
    for (let m = 0; m < sub; m++) {
      const j = i * sub + m;
      let s = 0;
      for (let q = -half; q <= half; q++) {
        const jj = j + q;
        if (jj >= 0 && jj < fine) s += kern[q + half] * depth[jj];
      }
      acc += s;
    }
    flux[i] = 1 - acc / sub;
  }
  return finish({
    lambda: g.lambda,
    flux,
    sigmaPixel,
    noise,
    seed,
    label: 'sodium',
    medium,
    resolvingPower,
    truth: {
      world: 'sodium',
      velocityKmS,
      columnCm2: NCm2,
      intrinsicSigmaKmS,
      lines: comps.map((c, k) => ({
        id: c.id,
        restNm: c.restNm,
        observedNm: c.centre,
        f: c.f,
        tau0: c.tau0,
        equivalentWidthNm: ewTruth[k],
        equivalentWidthLinearNm:
          c.tau0 * c.sigmaNm * Math.sqrt(2 * Math.PI),
        fInvented: true,
      })),
    },
  });
}
