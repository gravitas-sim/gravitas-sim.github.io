// =============================================================================
// Synthetic detector noise
// -----------------------------------------------------------------------------
// Seeded, coloured, and fixed. Two properties matter more than realism:
//
//   the same seed gives the same noise, always. A controlled comparison that
//   redrew its noise when a mass slider moved would be comparing two things at
//   once, and the student would attribute the difference to the mass.
//
//   it is a *design* curve, not the noise LIGO had in 2015. Said so in the
//   interface and in GRAVITATIONAL_WAVES.md. Real noise is in the real data.
// =============================================================================

import { mulberry32, normalizeSeed } from '../rng.js';
import { fft, nextPowerOfTwo } from './fft.js';

/**
 * One-sided power spectral density of Advanced LIGO at design sensitivity.
 *
 * A published analytic fit to the zero-detuning, high-power configuration of
 * LIGO-T0900288, in the form given by Ajith (2011), arXiv:1107.1267. Checked
 * against the design curve rather than against itself: it gives an amplitude
 * spectral density of 1.9e-23 per root hertz at 20 Hz and 4.0e-24 at 100 Hz.
 *
 * Below 10 Hz the fit rises steeply and is not meaningful; it is clamped
 * rather than allowed to produce an astronomically loud sample.
 *
 * @param {number} freqHz - Frequency, Hz
 * @returns {number} Strain^2 per hertz
 */
export function aligoPsd(freqHz) {
  const f = Math.max(freqHz, 10);
  const x = f / 245.4;
  const s =
    0.0152 * Math.pow(x, -4) +
    0.2935 * Math.pow(x, 9 / 4) +
    2.7951 * Math.pow(x, 3 / 2) -
    6.508 * Math.pow(x, 3 / 4) +
    17.7622;
  return 1e-48 * Math.max(s, 0);
}

/** The amplitude spectral density, which is what a detector curve is drawn in. */
export const aligoAsd = freqHz => Math.sqrt(aligoPsd(freqHz));

/**
 * A standard normal deviate from a uniform generator, by Box-Muller.
 *
 * Returns both of the pair, because throwing one away doubles the cost and the
 * discarded one is exactly as good.
 *
 * @param {Function} rand - Uniform [0, 1) source
 * @returns {[number, number]} Two independent N(0, 1) samples
 */
function gaussianPair(rand) {
  let u = rand();
  // log(0) is -Infinity, and one sample in four billion would be.
  if (u <= 0) u = Number.MIN_VALUE;
  const r = Math.sqrt(-2 * Math.log(u));
  const theta = 2 * Math.PI * rand();
  return [r * Math.cos(theta), r * Math.sin(theta)];
}

/**
 * A stretch of coloured Gaussian noise, in strain.
 *
 * Drawn in the frequency domain, which is the only way to get a prescribed
 * spectrum exactly rather than approximately. The normalisation is fixed by
 * Parseval: with the inverse transform carrying the 1/n, a bin's complex
 * amplitude has standard deviation sqrt(n fs S(f) / 4) per component, so the
 * variance of the result is the integral of S over the band.
 *
 * @param {object} spec
 * @param {number} spec.samples - How many samples (padded up to a power of two)
 * @param {number} spec.sampleRate - Hz
 * @param {string|number} spec.seed - Fixes the realization
 * @param {Function} [spec.psd] - One-sided PSD, strain^2/Hz. aLIGO by default
 * @param {number} [spec.fLow] - Below this the spectrum is zeroed, Hz
 * @returns {Float32Array} `samples` strain values
 */
export function colouredNoise({
  samples,
  sampleRate,
  seed = 'gw',
  psd = aligoPsd,
  fLow = 15,
} = {}) {
  const n = nextPowerOfTwo(Math.max(2, samples));
  const rand = mulberry32(normalizeSeed(seed));
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  const df = sampleRate / n;

  for (let k = 1; k < n / 2; k++) {
    const f = k * df;
    if (f < fLow) continue;
    const sigma = Math.sqrt((n * sampleRate * psd(f)) / 4);
    const [a, b] = gaussianPair(rand);
    re[k] = sigma * a;
    im[k] = sigma * b;
    // A real time series needs a Hermitian spectrum. Building it explicitly
    // rather than relying on the transform to discard an imaginary residue.
    re[n - k] = re[k];
    im[n - k] = -im[k];
  }

  fft(re, im, true);
  const out = new Float32Array(samples);
  for (let i = 0; i < samples; i++) out[i] = re[i];
  return out;
}
