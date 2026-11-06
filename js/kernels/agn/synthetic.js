// =============================================================================
// AGN kernel: synthetic quasar spectra, narrow-line spectra and light curves, with a truth manifest
// -----------------------------------------------------------------------------
// The labelled fallback while no cited template, spectrum, dividing curve or correction is in the tree (AGN.md):
//   generateQuasar        a power-law continuum and broad Gaussian lines shifted by 1 + z on a logarithmic grid
//   quasarTemplate        the noise-free world at z = 0 on the rest-frame grid
//   generateNarrowLines   a continuum and four narrow lines (the pack's H-alpha and H-beta, two INVENTED lines)
//   generateSinusoidCurve a sinusoidal light curve with the closed-form fastest e-folding time
// Every number is invented by a rule and labelled so; the hydrogen wavelengths are the radiation line pack's.
// The observed spectrum is F_rest(lambda / (1 + z)), with no cosmological dimming. Pure given a seed.
// =============================================================================

import { gaussian, stream } from '../../random/streams.js';
import { C_LIGHT } from '../radiation/constants.js';
import { FWHM_PER_SIGMA, gaussianArea } from '../spectrograph/lsf.js';

const { Math, Float64Array } = globalThis;
const C_KM_S = C_LIGHT / 1000;
const TWO_PI_SQRT = Math.sqrt(2 * Math.PI);

/** The label every generated quasar spectrum carries. */
export const QUASAR_SYNTHETIC_LABEL =
  'SYNTHETIC QUASAR SPECTRUM: an invented object observed by an invented spectrograph, with a stated redshift, continuum, broad lines and noise, not a measurement of any quasar';

/** The label every generated narrow-line spectrum carries. */
export const NARROW_SYNTHETIC_LABEL =
  'SYNTHETIC NARROW-LINE SPECTRUM: an invented object with invented forbidden-line wavelengths, a stated redshift and line ratios, not a measurement of any galaxy or nucleus';

/** The label every generated template carries. */
export const QUASAR_TEMPLATE_LABEL =
  'SYNTHETIC QUASAR TEMPLATE: the noise-free invented model at z = 0, not a spectrum of any quasar';

/** The label of the invented dividing curves, bolometric factor and light curves. */
export const INVENTED_LABEL =
  'INVENTED by the contract AGN.md (tests/fixtures/agn/thresholds.json): equal to no published value';

/** The invented dividing curves of the validation worlds (not the literature's). */
export const INVENTED_BPT_CURVES = Object.freeze({
  source: INVENTED_LABEL,
  curves: Object.freeze({
    starForming: Object.freeze({ a: 0.5, b: 0.1, c: 1.0 }),
    agn: Object.freeze({ a: 0.5, b: 0.55, c: 1.1 }),
  }),
});

/** The invented bolometric factor of the validation worlds. */
export const INVENTED_BC = Object.freeze({
  value: 8.0,
  scatterDex: 0.2,
  restNm: 550,
  toleranceFraction: 0.1,
  source: INVENTED_LABEL,
});

/** The defaults of the validation contract's worlds. */
export const QUASAR_WORLD = Object.freeze({
  resolvingPower: 1000,
  log10Step: 2e-4,
  log10Start: Math.log10(380),
  samples: 2100,
  templateLog10Start: Math.log10(100),
  templateSamples: 5000,
  alpha: -1.5,
  broadSigmaKmS: 2500,
  peak: Object.freeze({
    'h-alpha': 2.5,
    'h-beta': 1.0,
    'h-gamma': 0.4,
    'invented-A': 2.0,
    'invented-B': 1.2,
    'invented-C': 1.6,
  }),
  inventedFactors: Object.freeze({
    'invented-A': 0.2,
    'invented-B': 0.3,
    'invented-C': 0.4,
  }),
});

/**
 * The non-harmonic line set of the follow-up (252b, followup-thresholds.json worlds.factorRule): factors chosen
 * to maximise the separation of the fifteen pairwise log wavelength differences of the six lines while keeping two
 * lines in the window at every redshift of the ensemble. INVENTED; equal to no published line.
 */
export const NON_HARMONIC_FACTORS = Object.freeze({
  'invented-A': 0.175,
  'invented-B': 0.285,
  'invented-C': 0.35,
});

/** The invented-line sets a quasar world can use: the harmonic one (default, Prompt 252) and the non-harmonic one. */
export const QUASAR_LINE_SETS = Object.freeze({
  harmonic: QUASAR_WORLD.inventedFactors,
  'non-harmonic': NON_HARMONIC_FACTORS,
});

/** The narrow-line world's grid and invented lines. */
export const NARROW_WORLD = Object.freeze({
  resolvingPower: 1800,
  log10Step: 1e-4,
  log10Start: Math.log10(380),
  samples: 3840,
  alpha: -1.5,
  intrinsicSigmaKmS: 100,
  balmerDecrement: 3.0,
  factorN: 1.0046,
  factorO: 1.042,
});

const byId = (lines, id) => {
  const l = lines.find(x => x.id === id);
  if (!l) throw new Error(`agn synthetic: no line ${id} in the pack`);
  return l;
};

/** The broad lines of a quasar world: {id, restNm, peak (over the continuum), sigmaKmS}. */
export function quasarLineList({
  lines,
  medium = 'vacuum',
  lineSet = 'harmonic',
} = {}) {
  const factors = QUASAR_LINE_SETS[lineSet];
  if (!factors) throw new Error(`agn synthetic: no line set ${lineSet}`);
  const ha = byId(lines, 'h-alpha')[medium];
  const out = ['h-alpha', 'h-beta', 'h-gamma'].map(id => ({
    id,
    restNm: byId(lines, id)[medium],
    peak: QUASAR_WORLD.peak[id],
  }));
  for (const [id, f] of Object.entries(factors))
    out.push({
      id,
      restNm: ha * f,
      peak: QUASAR_WORLD.peak[id],
      invented: true,
    });
  return out;
}

function quasarModel({
  list,
  alpha,
  sigmaKmS,
  strength,
  widthScale,
  shiftKmS,
  resolvingPower,
}) {
  const lsfKmS = C_KM_S / resolvingPower / FWHM_PER_SIGMA;
  const cont = lam => (lam / 550) ** alpha;
  const em = list.map(l => {
    const sInt = sigmaKmS * (widthScale[l.id] ?? 1);
    const sConv = Math.hypot(sInt, lsfKmS);
    const mu = l.restNm * (1 + (shiftKmS[l.id] ?? 0) / C_KM_S);
    // the area: peak over the continuum at the intrinsic width, in continuum times nm
    const area =
      (strength[l.id] ?? 1) *
      l.peak *
      cont(l.restNm) *
      ((l.restNm * sInt) / C_KM_S) *
      TWO_PI_SQRT;
    return {
      id: l.id,
      restNm: mu,
      sigmaNm: (l.restNm * sConv) / C_KM_S,
      area,
      invented: Boolean(l.invented),
    };
  });
  const pixelMean = (lo, hi) => {
    const wd = hi - lo;
    let v = cont(0.5 * (lo + hi));
    for (const l of em) {
      if (Math.abs(0.5 * (lo + hi) - l.restNm) > 8 * l.sigmaNm + wd) continue;
      v += (l.area * gaussianArea(l.restNm, l.sigmaNm, lo, hi)) / wd;
    }
    return v;
  };
  return { em, pixelMean };
}

/**
 * A quasar spectrum on a logarithmic grid at a constant velocity line-spread.
 * @param {object} o
 * @param {Array<object>} o.lines - the line pack's LINES
 */
export function generateQuasar({
  lines,
  z = 0,
  seed = 'quasar',
  snr = 10,
  noise = true,
  medium = 'vacuum',
  alpha = QUASAR_WORLD.alpha,
  sigmaKmS = QUASAR_WORLD.broadSigmaKmS,
  strength = {},
  widthScale = {},
  shiftKmS = {},
  resolvingPower = QUASAR_WORLD.resolvingPower,
  log10Step = QUASAR_WORLD.log10Step,
  log10Start = QUASAR_WORLD.log10Start,
  samples = QUASAR_WORLD.samples,
  label = QUASAR_SYNTHETIC_LABEL,
  featureless = false,
  lineSet = 'harmonic',
} = {}) {
  const list = featureless ? [] : quasarLineList({ lines, medium, lineSet });
  const m = quasarModel({
    list,
    alpha,
    sigmaKmS,
    strength,
    widthScale,
    shiftKmS,
    resolvingPower,
  });
  const f = 1 + z;
  const lambda = new Float64Array(samples);
  const flux = new Float64Array(samples);
  for (let i = 0; i < samples; i++) {
    lambda[i] = 10 ** (log10Start + i * log10Step);
    flux[i] = m.pixelMean(
      10 ** (log10Start + (i - 0.5) * log10Step) / f,
      10 ** (log10Start + (i + 0.5) * log10Step) / f
    );
  }
  const sigmaPixel = 1 / snr;
  const out = new Float64Array(flux);
  if (noise) {
    const draw = gaussian(stream('noise', seed, 'quasar'));
    for (let i = 0; i < samples; i++) out[i] += sigmaPixel * draw();
  }
  return {
    lambdaNm: lambda,
    flux: out,
    sigma: new Float64Array(samples).fill(sigmaPixel),
    medium,
    resolvingPower,
    fluxKind: 'f-lambda',
    label,
    truth: {
      world: 'quasar',
      z,
      snr,
      sigmaPixel,
      noise,
      seed,
      alpha,
      sigmaKmS,
      resolvingPower,
      medium,
      featureless,
      lineSet,
      lines: m.em.map(l => ({
        id: l.id,
        restNm: l.restNm,
        observedNm: l.restNm * f,
        area: l.area,
        invented: l.invented,
      })),
    },
  };
}

/** The noise-free quasar template at z = 0 on the rest-frame grid, with a source string that says it is synthetic. */
export function quasarTemplate({
  lines,
  medium = 'vacuum',
  resolvingPower = QUASAR_WORLD.resolvingPower,
  log10Step = QUASAR_WORLD.log10Step,
  lineSet = 'harmonic',
} = {}) {
  const w = generateQuasar({
    lines,
    lineSet,
    z: 0,
    noise: false,
    medium,
    resolvingPower,
    log10Step,
    log10Start: QUASAR_WORLD.templateLog10Start,
    samples: QUASAR_WORLD.templateSamples,
    label: QUASAR_TEMPLATE_LABEL,
  });
  return {
    lambdaNm: w.lambdaNm,
    flux: w.flux,
    medium,
    resolvingPower,
    label: QUASAR_TEMPLATE_LABEL,
    source:
      'synthetic broad-line template invented by AGN.md’s rule (three hydrogen lines of the pack and three invented ultraviolet lines); not a spectrum of any quasar',
    truth: w.truth,
  };
}

/**
 * A narrow-line spectrum: a continuum and four narrow Gaussian lines, with F(N) = 10^x F(H-alpha) and
 * F(O) = 10^y F(H-beta). The N and O wavelengths are INVENTED (factors of the hydrogen lines').
 * @param {object} o
 * @param {Array<object>} o.lines - the line pack's LINES
 */
export function generateNarrowLines({
  lines,
  z = 0.1,
  x = -0.5,
  y = 0,
  hAlphaFlux = 2,
  snr = 10,
  seed = 'narrow',
  noise = true,
  medium = 'vacuum',
  restSeparationNm,
  resolvingPower = NARROW_WORLD.resolvingPower,
  log10Step = NARROW_WORLD.log10Step,
  log10Start = NARROW_WORLD.log10Start,
  samples = NARROW_WORLD.samples,
  label = NARROW_SYNTHETIC_LABEL,
} = {}) {
  const ha = byId(lines, 'h-alpha')[medium];
  const hb = byId(lines, 'h-beta')[medium];
  const rest = {
    ha,
    hb,
    n:
      restSeparationNm === undefined
        ? ha * NARROW_WORLD.factorN
        : ha + restSeparationNm,
    o: hb * NARROW_WORLD.factorO,
  };
  const fHa = hAlphaFlux;
  const flux = {
    ha: fHa,
    hb: fHa / NARROW_WORLD.balmerDecrement,
    n: 10 ** x * fHa,
    o: (10 ** y * fHa) / NARROW_WORLD.balmerDecrement,
  };
  const lsfKmS = C_KM_S / resolvingPower / FWHM_PER_SIGMA;
  const sConv = Math.hypot(NARROW_WORLD.intrinsicSigmaKmS, lsfKmS);
  const cont = lam => (lam / 550) ** NARROW_WORLD.alpha;
  const f = 1 + z;
  const lambda = new Float64Array(samples);
  const mean = new Float64Array(samples);
  for (let i = 0; i < samples; i++) {
    lambda[i] = 10 ** (log10Start + i * log10Step);
    const lo = 10 ** (log10Start + (i - 0.5) * log10Step) / f;
    const hi = 10 ** (log10Start + (i + 0.5) * log10Step) / f;
    let v = cont(0.5 * (lo + hi));
    for (const k of ['ha', 'hb', 'n', 'o']) {
      const sig = (rest[k] * sConv) / C_KM_S;
      if (Math.abs(0.5 * (lo + hi) - rest[k]) > 8 * sig + (hi - lo)) continue;
      v += (flux[k] * gaussianArea(rest[k], sig, lo, hi)) / (hi - lo);
    }
    mean[i] = v;
  }
  const sigmaPixel = 1 / snr;
  const out = new Float64Array(mean);
  if (noise) {
    const draw = gaussian(stream('noise', seed, 'narrow'));
    for (let i = 0; i < samples; i++) out[i] += sigmaPixel * draw();
  }
  return {
    lambdaNm: lambda,
    flux: out,
    sigma: new Float64Array(samples).fill(sigmaPixel),
    medium,
    resolvingPower,
    fluxKind: 'f-lambda',
    label,
    truth: {
      world: 'narrow-lines',
      z,
      x,
      y,
      snr,
      sigmaPixel,
      noise,
      seed,
      restNm: rest,
      observedNm: Object.fromEntries(
        Object.entries(rest).map(([k, v]) => [k, v * f])
      ),
      flux,
      sources: { n: INVENTED_LABEL, o: INVENTED_LABEL },
      intrinsicSigmaKmS: NARROW_WORLD.intrinsicSigmaKmS,
    },
  };
}

/**
 * A sinusoidal light curve F = F0 (1 + A sin(omega t + phi)) at evenly spaced epochs, with the closed-form fastest
 * instantaneous e-folding time tau_min = sqrt(1 - A^2) / (A omega) (the minimum of F / |dF/dt|).
 */
export function generateSinusoidCurve({
  amplitude,
  periodDays,
  epochs,
  spanPeriods = 2,
  relativeError,
  seed = 'curve',
  noise = true,
  f0 = 1,
  phase = 0,
} = {}) {
  const omega = (2 * Math.PI) / periodDays;
  const t = new Float64Array(epochs);
  const truth = new Float64Array(epochs);
  for (let i = 0; i < epochs; i++) {
    t[i] = (spanPeriods * periodDays * i) / (epochs - 1);
    truth[i] = f0 * (1 + amplitude * Math.sin(omega * t[i] + phase));
  }
  const flux = new Float64Array(truth);
  const sigma = new Float64Array(epochs);
  const draw = noise ? gaussian(stream('noise', seed, 'curve')) : null;
  for (let i = 0; i < epochs; i++) {
    sigma[i] = relativeError * truth[i];
    if (draw) flux[i] += sigma[i] * draw();
  }
  return {
    t,
    flux,
    sigma,
    label:
      'SYNTHETIC LIGHT CURVE: a sinusoid of invented amplitude and period with Gaussian errors, not a measurement of any source',
    truth: {
      amplitude,
      periodDays,
      omega,
      tauMinDays: Math.sqrt(1 - amplitude * amplitude) / (amplitude * omega),
    },
  };
}
