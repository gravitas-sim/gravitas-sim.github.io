// =============================================================================
// Galaxy kernel: synthetic galaxy spectra, templates and a comb, with a truth manifest
// -----------------------------------------------------------------------------
// The labelled fallback while no cited template or galaxy spectrum is in the tree (GALAXY_SPECTRA.md):
//   generateGalaxy   a rest-frame model shifted by 1 + z, sampled on a logarithmic grid at a constant
//                    velocity line-spread, so the shifted spectrum is the template shifted in
//                    log wavelength; kinds 'star-forming' (a weak break, Balmer emission, weak absorption),
//                    'passive' (a strong break, broad absorption) and 'flat'
//   galaxyTemplate   the noise-free world of a kind at z = 0 on the rest-frame grid
//   generateComb     a comb of equally spaced lines: the aliasing world
// The continuum is F_lambda = (lambda / 550)^alpha B(lambda) with B = 1 - d / (1 + exp((lambda - 400) / w))
// (a hard step for w = 0); the observed spectrum is F_rest(lambda / (1 + z)), with no cosmological dimming.
// The line wavelengths are the pack's; every other number is invented by a rule and labelled so.
// The truth manifest carries the break's value by quadrature of the noise-free model. Pure given a seed.
// =============================================================================

import { gaussian, stream } from '../../random/streams.js';
import { C_LIGHT } from '../radiation/constants.js';
import { extinctionRatio } from '../radiation/extinction.js';
import { FWHM_PER_SIGMA, gaussianArea } from '../spectrograph/lsf.js';
import { gaussLegendre } from '../../numeric/quadrature.js';

const { Math, Float64Array } = globalThis;
const C_KM_S = C_LIGHT / 1000;

/** The label every generated spectrum carries. */
export const GALAXY_SYNTHETIC_LABEL =
  'SYNTHETIC GALAXY SPECTRUM: an invented object observed by an invented spectrograph, with a stated redshift, continuum, break, line strengths and noise, not a measurement of any galaxy';

/** The label every generated template carries. */
export const GALAXY_TEMPLATE_LABEL =
  'SYNTHETIC GALAXY TEMPLATE: the noise-free invented model of a kind at z = 0, not a spectrum of any galaxy';

/** The bands the synthetic worlds use for their break: INVENTED by a rule, equal to neither published definition. */
export const INVENTED_BREAK_BANDS = Object.freeze({
  name: 'invented bands',
  blueNm: Object.freeze([372, 388]),
  redNm: Object.freeze([412, 428]),
  source:
    'invented by the rule: each band 16 nm wide, its inner edge 12 nm from a break at 400 nm; not a published definition',
});

/** The defaults of the validation contract's worlds. */
export const GALAXY_WORLD = Object.freeze({
  resolvingPower: 1800,
  log10Step: 1e-4,
  log10Start: Math.log10(380),
  samples: 3840,
  templateLog10Start: Math.log10(300),
  templateSamples: 3802,
  kinds: Object.freeze({
    'star-forming': Object.freeze({
      alpha: -2.5,
      breakDepth: 0.12,
      breakWidthNm: 2,
      intrinsicSigmaKmS: 100,
      hbetaPeak: 3,
      emission: Object.freeze({
        'h-beta': 1,
        'h-alpha': 3.0,
        'h-gamma': 0.45,
        'h-delta': 0.25,
        'he1-5876': 0.1,
      }),
      absorptionSigmaKmS: 150,
      absorption: Object.freeze({
        'ca2-k': 0.15,
        'ca2-h': 0.12,
        'na1-d2': 0.08,
        'na1-d1': 0.06,
      }),
    }),
    passive: Object.freeze({
      alpha: -1.2,
      breakDepth: 0.45,
      breakWidthNm: 2,
      intrinsicSigmaKmS: 250,
      emission: Object.freeze({}),
      absorptionSigmaKmS: 250,
      absorption: Object.freeze({
        'ca2-k': 0.55,
        'ca2-h': 0.5,
        'h-delta': 0.15,
        'h-gamma': 0.12,
        'h-beta': 0.1,
        'fe1-4383': 0.12,
        'mg1-b4': 0.22,
        'mg1-b2': 0.2,
        'mg1-b1': 0.2,
        'na1-d2': 0.3,
        'na1-d1': 0.25,
        'fe1-5270': 0.15,
        'fe1-5328': 0.12,
      }),
    }),
    flat: Object.freeze({
      alpha: 0,
      breakDepth: 0,
      breakWidthNm: 0,
      intrinsicSigmaKmS: 100,
      emission: Object.freeze({}),
      absorption: Object.freeze({}),
      absorptionSigmaKmS: 100,
    }),
  }),
});

const byId = (lines, id) => {
  const l = lines.find(x => x.id === id);
  if (!l) throw new Error(`galaxy synthetic: no line ${id} in the pack`);
  return l;
};

/**
 * The rest-frame model of a world: a density function (noise-free, line-spread included) and a pixel-mean function.
 * Exposed to the generator only.
 */
function restModel({
  lines,
  law,
  kind,
  medium,
  ebv,
  RV,
  lineScale,
  sigmaScale,
  extraLines,
  resolvingPower,
  alpha,
  breakDepth,
  breakWidthNm,
  broadBalmerKmS,
}) {
  const K = GALAXY_WORLD.kinds[kind];
  if (!K) throw new Error(`galaxy synthetic: unknown kind ${kind}`);
  const a = alpha ?? K.alpha;
  const d = breakDepth ?? K.breakDepth;
  const w = breakWidthNm ?? K.breakWidthNm;
  const lsfKmS = C_KM_S / resolvingPower / FWHM_PER_SIGMA;
  const sigmaOf = (sigInt, id) => {
    let s = sigInt * sigmaScale;
    if (broadBalmerKmS && /^h-(alpha|beta|gamma|delta)$/.test(id))
      s = broadBalmerKmS;
    return Math.hypot(s, lsfKmS);
  };
  const scale = id => lineScale[id] ?? 1;
  const smooth = lam => {
    let b = 1;
    if (d > 0 && w > 0) b = 1 - d / (1 + Math.exp((lam - 400) / w));
    const dust = ebv
      ? 10 ** (-0.4 * RV * extinctionRatio(lam, RV, law) * ebv)
      : 1;
    return (lam / 550) ** a * b * dust;
  };
  const abs = [];
  for (const [id, depth] of Object.entries(K.absorption ?? {})) {
    const rest = byId(lines, id)[medium];
    const sv = sigmaOf(K.absorptionSigmaKmS, id);
    abs.push({
      id,
      rest,
      depth: depth * scale(id),
      sigmaNm: (rest * sv) / C_KM_S,
    });
  }
  const em = [];
  const ratios = K.emission ?? {};
  if (Object.keys(ratios).length) {
    const betaRest = byId(lines, 'h-beta')[medium];
    const sBeta = (betaRest * sigmaOf(K.intrinsicSigmaKmS, 'h-beta')) / C_KM_S;
    const fluxBeta =
      K.hbetaPeak * smooth(betaRest) * sBeta * Math.sqrt(2 * Math.PI);
    for (const [id, ratio] of Object.entries(ratios)) {
      const rest = byId(lines, id)[medium];
      const sigmaNm = (rest * sigmaOf(K.intrinsicSigmaKmS, id)) / C_KM_S;
      em.push({ id, rest, sigmaNm, flux: ratio * fluxBeta * scale(id) });
    }
  }
  for (const x of extraLines) {
    const sigmaNm =
      (x.restNm * Math.hypot(x.sigmaKmS ?? K.intrinsicSigmaKmS, lsfKmS)) /
      C_KM_S;
    if (x.kind === 'absorption')
      abs.push({
        id: x.id,
        rest: x.restNm,
        depth: x.depth,
        sigmaNm,
        invented: true,
      });
    else {
      const betaRest = byId(lines, 'h-beta')[medium];
      const sBeta =
        (betaRest * sigmaOf(K.intrinsicSigmaKmS, 'h-beta')) / C_KM_S;
      const fluxBeta =
        (K.hbetaPeak ?? 3) * smooth(betaRest) * sBeta * Math.sqrt(2 * Math.PI);
      em.push({
        id: x.id,
        rest: x.restNm,
        sigmaNm,
        flux: x.fractionOfHBeta * fluxBeta,
        invented: true,
      });
    }
  }
  const TWO_PI_SQ = Math.sqrt(2 * Math.PI);
  /** The noise-free density at a rest wavelength (the lines at their line-spread width). */
  const density = lam => {
    let dip = 0;
    for (const l of abs)
      dip += l.depth * Math.exp(-0.5 * ((lam - l.rest) / l.sigmaNm) ** 2);
    let v = smooth(lam) * (1 - dip);
    for (const l of em)
      v +=
        (l.flux / (l.sigmaNm * TWO_PI_SQ)) *
        Math.exp(-0.5 * ((lam - l.rest) / l.sigmaNm) ** 2);
    return v;
  };
  /** The mean of the density over a rest-frame interval (the pixel value). */
  const pixelMean = (lo, hi) => {
    const wd = hi - lo;
    const mid = 0.5 * (lo + hi);
    let b = 1;
    if (d > 0 && w === 0) {
      const frac = Math.min(1, Math.max(0, (400 - lo) / wd));
      b = 1 - d * frac;
    }
    let c = smooth(mid);
    if (d > 0 && w === 0) c *= b;
    let dip = 0;
    for (const l of abs) {
      if (Math.abs(mid - l.rest) > 8 * l.sigmaNm + wd) continue;
      dip +=
        (l.depth *
          l.sigmaNm *
          TWO_PI_SQ *
          gaussianArea(l.rest, l.sigmaNm, lo, hi)) /
        wd;
    }
    let v = c * (1 - dip);
    for (const l of em) {
      if (Math.abs(mid - l.rest) > 8 * l.sigmaNm + wd) continue;
      v += (l.flux * gaussianArea(l.rest, l.sigmaNm, lo, hi)) / wd;
    }
    return v;
  };
  return {
    density,
    pixelMean,
    abs,
    em,
    lsfKmS,
    params: { alpha: a, breakDepth: d, breakWidthNm: w },
  };
}

/** The break of the noise-free density: the ratio of the band means of F_nu = lambda^2 F_lambda by quadrature. */
function breakTruth(density, def) {
  const mean = band => {
    const f = lam => lam * lam * density(lam);
    return gaussLegendre(f, band[0], band[1], 200) / (band[1] - band[0]);
  };
  return mean(def.redNm) / mean(def.blueNm);
}

/**
 * A galaxy spectrum on a logarithmic grid at a constant velocity line-spread.
 * @param {object} o
 * @param {Array<object>} o.lines - the line pack's LINES
 * @param {object} [o.law] - the CCM89 law (needed only when ebv > 0)
 * @param {'star-forming'|'passive'|'flat'} o.kind
 */
export function generateGalaxy({
  lines,
  law,
  kind,
  z = 0,
  seed = 'galaxy',
  snr = 10,
  noise = true,
  medium = 'vacuum',
  ebv = 0,
  RV = 3.1,
  lineScale = {},
  sigmaScale = 1,
  extraLines = [],
  broadBalmerKmS = null,
  alpha,
  breakDepth,
  breakWidthNm,
  resolvingPower = GALAXY_WORLD.resolvingPower,
  log10Step = GALAXY_WORLD.log10Step,
  log10Start = GALAXY_WORLD.log10Start,
  samples = GALAXY_WORLD.samples,
  label = GALAXY_SYNTHETIC_LABEL,
  truthBands = INVENTED_BREAK_BANDS,
} = {}) {
  const m = restModel({
    lines,
    law,
    kind,
    medium,
    ebv,
    RV,
    lineScale,
    sigmaScale,
    extraLines,
    resolvingPower,
    alpha,
    breakDepth,
    breakWidthNm,
    broadBalmerKmS,
  });
  const f = 1 + z;
  const lambda = new Float64Array(samples);
  const flux = new Float64Array(samples);
  for (let i = 0; i < samples; i++) {
    lambda[i] = 10 ** (log10Start + i * log10Step);
    const lo = 10 ** (log10Start + (i - 0.5) * log10Step) / f;
    const hi = 10 ** (log10Start + (i + 0.5) * log10Step) / f;
    flux[i] = m.pixelMean(lo, hi);
  }
  const sigmaPixel = 1 / snr;
  const out = new Float64Array(flux);
  if (noise) {
    const draw = gaussian(stream('noise', seed, 'galaxy', kind));
    for (let i = 0; i < samples; i++) out[i] += sigmaPixel * draw();
  }
  const truth = {
    world: 'galaxy',
    kind,
    z,
    snr,
    sigmaPixel,
    noise,
    seed,
    resolvingPower,
    medium,
    ebv,
    RV,
    ...m.params,
    intrinsicSigmaKmS: GALAXY_WORLD.kinds[kind].intrinsicSigmaKmS * sigmaScale,
    lineScale: { ...lineScale },
    broadBalmerKmS,
    lines: [
      ...m.abs.map(l => ({
        id: l.id,
        kind: 'absorption',
        restNm: l.rest,
        observedNm: l.rest * f,
        depth: l.depth,
        invented: Boolean(l.invented),
      })),
      ...m.em.map(l => ({
        id: l.id,
        kind: 'emission',
        restNm: l.rest,
        observedNm: l.rest * f,
        flux: l.flux,
        invented: Boolean(l.invented),
      })),
    ],
    breakTruth: truthBands
      ? { definition: truthBands, D: breakTruth(m.density, truthBands) }
      : null,
  };
  return {
    lambdaNm: lambda,
    flux: out,
    sigma: new Float64Array(samples).fill(sigmaPixel),
    medium,
    resolvingPower,
    fluxKind: 'f-lambda',
    label,
    truth,
  };
}

/** The noise-free template of a kind at z = 0 on the rest-frame grid, with a source string that says it is synthetic. */
export function galaxyTemplate({
  lines,
  kind,
  medium = 'vacuum',
  resolvingPower = GALAXY_WORLD.resolvingPower,
  log10Step = GALAXY_WORLD.log10Step,
} = {}) {
  const w = generateGalaxy({
    lines,
    kind,
    z: 0,
    noise: false,
    medium,
    resolvingPower,
    log10Step,
    log10Start: GALAXY_WORLD.templateLog10Start,
    samples: GALAXY_WORLD.templateSamples,
    label: GALAXY_TEMPLATE_LABEL,
    truthBands: null,
  });
  return {
    lambdaNm: w.lambdaNm,
    flux: w.flux,
    medium,
    resolvingPower,
    label: GALAXY_TEMPLATE_LABEL,
    source: `synthetic template of the ${kind} kind, invented by GALAXY_SPECTRA.md's rule; not a spectrum of any galaxy`,
    kind,
    truth: w.truth,
  };
}

/**
 * The aliasing world: a comb of equally spaced Gaussian lines in log wavelength, as spectrum and template.
 * Positions are in samples of the logarithmic grid, so the redshift is a fractional shift.
 */
export function generateComb({
  teeth = 12,
  spacingSamples = 60,
  sigmaSamples = 1.5,
  peak = 3,
  z = 0,
  seed = 'comb',
  snr = 10,
  noise = true,
  log10Step = GALAXY_WORLD.log10Step,
} = {}) {
  const N = GALAXY_WORLD.samples;
  const M = GALAXY_WORLD.templateSamples;
  const L0 = GALAXY_WORLD.log10Start;
  const T0 = GALAXY_WORLD.templateLog10Start;
  const R = 1 / (sigmaSamples * FWHM_PER_SIGMA * Math.LN10 * log10Step);
  // the first tooth, in template samples: chosen so that every tooth of a 12-tooth comb stays inside the spectrum for 0.02 <= z <= 0.2
  const first = 1300;
  const profile = (n, shiftSamples) => {
    const y = new Float64Array(n);
    for (let t = 0; t < teeth; t++) {
      const c = first + t * spacingSamples + shiftSamples;
      for (
        let i = Math.max(0, Math.floor(c - 8 * sigmaSamples));
        i <= Math.min(n - 1, Math.ceil(c + 8 * sigmaSamples));
        i++
      )
        y[i] += peak * gaussianArea(c, sigmaSamples, i - 0.5, i + 0.5);
    }
    for (let i = 0; i < n; i++) y[i] += 1;
    return y;
  };
  const grid = (n, start) => {
    const l = new Float64Array(n);
    for (let i = 0; i < n; i++) l[i] = 10 ** (start + i * log10Step);
    return l;
  };
  // the template sample j is at rest log10(lambda) = T0 + j step; the spectrum sample i at L0 + i step
  // observed = rest + log10(1 + z), so spectrum position of template sample j is j + (T0 - L0 + log10(1+z)) / step
  const shift = (T0 - L0 + Math.log10(1 + z)) / log10Step;
  const flux = profile(N, shift);
  const sigmaPixel = 1 / snr;
  if (noise) {
    const draw = gaussian(stream('noise', seed, 'comb'));
    for (let i = 0; i < N; i++) flux[i] += sigmaPixel * draw();
  }
  return {
    spectrum: {
      lambdaNm: grid(N, L0),
      flux,
      sigma: new Float64Array(N).fill(sigmaPixel),
      medium: 'vacuum',
      resolvingPower: R,
      label: GALAXY_SYNTHETIC_LABEL,
      truth: { world: 'comb', z, teeth, spacingSamples, sigmaPixel, seed },
    },
    template: {
      lambdaNm: grid(M, T0),
      flux: profile(M, 0),
      medium: 'vacuum',
      resolvingPower: R,
      label: GALAXY_TEMPLATE_LABEL,
      source: 'synthetic comb template, invented; not a spectrum of any galaxy',
    },
  };
}
