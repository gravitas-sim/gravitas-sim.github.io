// =============================================================================
// The spectrograph kernel: what the instrument records
// (Prompt 213, SPECTROGRAPH.md)
// -----------------------------------------------------------------------------
// The forward model. A template (a continuum and some Gaussian lines, in electrons per nm
// before the instrument) goes through the line-spread function and is integrated over each
// pixel; noise is photon noise and read noise.
//
//   DEFINED   the template: a continuum density (electrons per nm), absorption lines
//             (a relative depth and an intrinsic sigma, at a wavelength), emission lines
//             (a total in electrons and an intrinsic sigma)
//   DERIVED   the expected electrons in every pixel; an observed line is a Gaussian of
//             sigma sqrt(s_int^2 + s_l^2) whose depth falls by s_int / sigma, exactly
//   ASSUMED   a continuum smooth on the scale of the line-spread function (its smoothing
//             is neglected, bounded by check B1; a line's first-order slope term is kept),
//             Gaussian noise (the Poisson distribution above about 20 electrons)
//
// Noise draws from a named `noise` stream (js/random/streams.js) when given a seed, so the
// same seed gives the same exposure on every machine. The reported error of a pixel is
// sqrt(expected electrons + read noise^2), the variance array a pipeline would carry.
//
// Pure: no DOM, no clock.
// =============================================================================

import { planckLambda } from '../radiation/planck.js';
import { C_LIGHT, H_PLANCK, K_BOLTZMANN } from '../radiation/constants.js';
import { gaussian, stream } from '../../random/streams.js';
import { gaussianArea, gaussianDensity } from './lsf.js';

const { Math, Float64Array } = globalThis;

const GL_X = [-Math.sqrt(0.6), 0, Math.sqrt(0.6)];
const GL_W = [5 / 9, 8 / 9, 5 / 9];

/** A continuum of a constant number of electrons per nm. */
export const flatContinuum = perNm => ({
  density: () => perNm,
  slope: () => 0,
});

/**
 * A blackbody continuum scaled to a density at 500 nm (electrons per nm), with its analytic wavelength derivative.
 * @param {{temperatureK: number, densityAt500PerNm: number}} o
 */
export function blackbodyContinuum({ temperatureK, densityAt500PerNm }) {
  const T = temperatureK;
  const ref = planckLambda(500e-9, T);
  const dens = lam => (densityAt500PerNm * planckLambda(lam * 1e-9, T)) / ref;
  return {
    density: dens,
    // d ln B / d lambda = (-5 + x e^x / (e^x - 1)) / lambda, x = h c / (lambda k T)
    slope: lam => {
      const x = (H_PLANCK * C_LIGHT) / (lam * 1e-9 * K_BOLTZMANN * T);
      return (dens(lam) * (-5 + (x * Math.exp(x)) / Math.expm1(x))) / lam;
    },
  };
}

/** An absorption line: a relative depth (0 to 1) at the continuum, an intrinsic sigma (nm). */
export const absorptionLine = ({ centreNm, sigmaIntNm, depth }) => ({
  kind: 'absorption',
  centreNm,
  sigmaIntNm,
  depth,
});
/** An emission line: total electrons, an intrinsic sigma (nm; 0 for an unresolved arc line). */
export const emissionLine = ({ centreNm, fluxE, sigmaIntNm = 0, id }) => ({
  kind: 'emission',
  centreNm,
  fluxE,
  sigmaIntNm,
  id,
});

/** The equivalent width of an absorption line of a given depth and intrinsic sigma, nm. */
export const equivalentWidthOf = (depth, sigmaIntNm) =>
  depth * sigmaIntNm * Math.sqrt(2 * Math.PI);

/**
 * A line as the instrument shows it: a Gaussian of sigma sqrt(s_int^2 + s_l^2); an absorption line's central depth is
 * reduced by s_int / sigma (its equivalent width is not), an emission line's total is not.
 */
export function observedLineProfile(line, lsfSigmaNm) {
  const sigma = Math.hypot(line.sigmaIntNm, lsfSigmaNm);
  return line.kind === 'absorption'
    ? {
        sigmaNm: sigma,
        depth: (line.depth * line.sigmaIntNm) / sigma,
        ratio: line.sigmaIntNm / sigma,
      }
    : { sigmaNm: sigma, fluxE: line.fluxE };
}

const lowerBound = (a, v) => {
  let lo = 0;
  let hi = a.length;
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (a[m] < v) lo = m + 1;
    else hi = m;
  }
  return lo;
};

/** Pixel integral of a density by a fixed three-point Gauss-Legendre rule. */
export function integrateOverPixel(density, a, b) {
  const h = 0.5 * (b - a);
  const m = 0.5 * (a + b);
  let s = 0;
  for (let k = 0; k < 3; k++) s += GL_W[k] * density(m + h * GL_X[k]);
  return s * h;
}

/**
 * The expected electrons in every pixel.
 * @param {{edges: Float64Array, lsfSigmaNm: number}} spec - the instrument (or any object with both)
 * @param {{continuum: {density: Function, slope: Function}, lines?: object[]}} template
 * @returns {Float64Array}
 */
export function expectedCounts(spec, template) {
  const { edges, lsfSigmaNm } = spec;
  const n = edges.length - 1;
  const out = new Float64Array(n);
  const { continuum, lines = [] } = template;
  if (continuum.perPixel !== undefined) out.fill(continuum.perPixel);
  else
    for (let i = 0; i < n; i++)
      out[i] = integrateOverPixel(continuum.density, edges[i], edges[i + 1]);
  for (const line of lines) {
    const sig = Math.hypot(line.sigmaIntNm, lsfSigmaNm);
    const i0 = Math.max(0, lowerBound(edges, line.centreNm - 10 * sig) - 1);
    const i1 = Math.min(n, lowerBound(edges, line.centreNm + 10 * sig) + 1);
    if (line.kind === 'emission') {
      for (let i = i0; i < i1; i++)
        out[i] +=
          line.fluxE * gaussianArea(line.centreNm, sig, edges[i], edges[i + 1]);
    } else {
      // The line removes ew (C0 + rho C1 u) g_t(u): exact for a continuum linear across the line, because
      // (u g_i) convolved with the line-spread function is rho u (g_i convolved with it), rho = s_int^2 / sigma^2.
      const ew = equivalentWidthOf(line.depth, line.sigmaIntNm);
      const c0 = continuum.density(line.centreNm);
      const c1 = continuum.slope(line.centreNm);
      const rho = (line.sigmaIntNm * line.sigmaIntNm) / (sig * sig);
      for (let i = i0; i < i1; i++) {
        const a = edges[i];
        const b = edges[i + 1];
        const area = gaussianArea(line.centreNm, sig, a, b);
        const ga = gaussianDensity(a - line.centreNm, sig);
        const gb = gaussianDensity(b - line.centreNm, sig);
        out[i] -= ew * (c0 * area + rho * c1 * sig * sig * (ga - gb));
      }
    }
  }
  return out;
}

/**
 * Noise on expected counts: Gaussian with variance expected + read^2.
 * @param {Float64Array} expected
 * @param {number} readNoiseE
 * @param {() => number} normal - standard normals (see `normalStream`)
 */
export function addNoise(expected, readNoiseE, normal) {
  const n = expected.length;
  const counts = new Float64Array(n);
  const sigma = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    sigma[i] = Math.sqrt(Math.max(expected[i], 0) + readNoiseE * readNoiseE);
    counts[i] = expected[i] + sigma[i] * normal();
  }
  return { counts, sigma };
}

/** Standard normals from the named `noise` stream of a seed (forked by labels), for `addNoise`. */
export const normalStream = (seed, ...labels) =>
  gaussian(stream('noise', seed, ...labels));

/** The result of an exposure: the expected counts, the noisy counts, the reported errors. */
export function exposure(
  spec,
  template,
  { seed = null, labels = [], normal = null } = {}
) {
  const expected = expectedCounts(spec, template);
  if (seed === null && !normal) {
    const sigma = new Float64Array(expected.length);
    for (let i = 0; i < sigma.length; i++)
      sigma[i] = Math.sqrt(Math.max(expected[i], 0) + spec.readNoiseE ** 2);
    return {
      expected,
      counts: Float64Array.from(expected),
      sigma,
      noisy: false,
    };
  }
  const draw = normal ?? normalStream(seed, ...labels);
  const { counts, sigma } = addNoise(expected, spec.readNoiseE, draw);
  return { expected, counts, sigma, noisy: true };
}

/**
 * The lamp of the reference arc: every line of a list (a pack's lines, with an `air` and a `vacuum` wavelength) that
 * falls on the detector, in the stated medium, as an unresolved emission line. The totals are teaching values, the
 * k-th line of the list having `2e4 (1 + k mod 4)` electrons, never a real lamp's relative intensities.
 */
export function arcLamp(
  spec,
  lines,
  medium,
  { continuumE = 20, total = k => 2e4 * (1 + (k % 4)) } = {}
) {
  if (medium !== 'air' && medium !== 'vacuum')
    throw new RangeError('the medium is air or vacuum');
  const [lo, hi] = [spec.rangeNm[0] + 0, spec.rangeNm[1] - 1];
  const on = [];
  lines.forEach((l, k) => {
    const lam = l[medium];
    if (lam >= lo && lam <= hi)
      on.push({
        ...emissionLine({ centreNm: lam, fluxE: total(k), id: l.id }),
        k,
      });
  });
  // the lamp's continuum is a number of electrons per pixel (`perPixel`); its density per nm is the
  // mid-detector figure, for display only
  return {
    medium,
    lines: on,
    continuum: {
      perPixel: continuumE,
      density: () => continuumE / spec.dispersionAt(spec.nPixels / 2),
      slope: () => 0,
    },
  };
}

/** The lamp's lines that are isolated: every other lamp line is farther than `gapFwhm` FWHM away (all the list's lines count). */
export function isolatedLines(spec, lines, medium, gapFwhm = 6) {
  const gap = gapFwhm * spec.lsfFwhmNm;
  return lines.filter((l, k) => {
    const lam = l[medium];
    return lines.every((m, j) => j === k || Math.abs(m[medium] - lam) > gap);
  });
}

/**
 * A star's spectrum: a blackbody with Balmer-type absorption lines at a velocity, in the stated medium.
 * @param {object} o
 * @param {Array<{air: number, vacuum: number}>} o.lines - the rest lines to put in
 * @param {'air'|'vacuum'} o.medium
 * @param {number} o.velocityKmS - the relativistic Doppler factor applies
 */
export function starTemplate({
  lines,
  medium,
  velocityKmS,
  temperatureK = 6000,
  densityAt500PerNm = 1e5,
  sigmaIntNm = 0.1,
  depth = 0.4,
}) {
  const b = velocityKmS / (C_LIGHT / 1000);
  const f = Math.sqrt((1 + b) / (1 - b));
  return {
    medium,
    continuum: blackbodyContinuum({ temperatureK, densityAt500PerNm }),
    lines: lines.map(l => ({
      ...absorptionLine({ centreNm: l[medium] * f, sigmaIntNm, depth }),
      id: l.id,
    })),
  };
}
