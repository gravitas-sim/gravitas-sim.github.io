// =============================================================================
// The window function of a sampling pattern (Prompt 214, OBSERVING_STRATEGY.md)
// -----------------------------------------------------------------------------
//   spectralWindow    MEASURED from the epochs: |W(f)|^2, W(f) = (1/N) sum exp(-2 pi i f (t - tbar))
//   sinusoidResponse  MEASURED through the periodogram family: the Lomb-Scargle power
//                     (js/kernels/variables/period.js, read unchanged) of a noise-free
//                     unit sinusoid at f0 sampled at the epochs: 1 at f0, about
//                     |W(f - f0)|^2 at an alias
//   findPeaks         the local maxima of a spectrum, highest first
//
// The window is a property of the TIMES and nothing else: it says which frequencies
// a pattern cannot tell apart, whatever is observed. W(0) = 1 always; N regular
// epochs D apart give the Dirichlet kernel and an exact comb at every k / D.
// The two functions are close for f0 T >> 1 and are not the same (the floating mean
// and the negative-frequency image differ), which the panel shows side by side.
// Pure: no DOM, no clock, no random draws.
// =============================================================================

import { periodogram } from '../variables/period.js';

const { Math, Float64Array } = globalThis;

const mean = a => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i];
  return s / a.length;
};

/**
 * |W(f)|^2 at each frequency (cycles per day for epochs in days).
 * @param {ArrayLike<number>} times
 * @param {ArrayLike<number>} freqs
 * @returns {Float64Array} power in [0, 1]
 */
export function spectralWindow(times, freqs) {
  const n = times.length;
  const tbar = mean(times);
  const out = new Float64Array(freqs.length);
  if (!n) return out;
  for (let k = 0; k < freqs.length; k++) {
    const w = 2 * Math.PI * freqs[k];
    let re = 0;
    let im = 0;
    for (let i = 0; i < n; i++) {
      const x = w * (times[i] - tbar);
      re += Math.cos(x);
      im += Math.sin(x);
    }
    out[k] = Math.min(1, (re * re + im * im) / (n * n));
  }
  return out;
}

/**
 * The periodogram of a noise-free unit cosine at f0, at each frequency.
 * @param {ArrayLike<number>} times
 * @param {number} f0 - the signal frequency
 * @param {ArrayLike<number>} freqs - positive frequencies
 * @param {number} [phase] - radians
 * @returns {Float64Array} Lomb-Scargle power in [0, 1]
 */
export function sinusoidResponse(times, f0, freqs, phase = 0) {
  const y = Float64Array.from(times, t =>
    Math.cos(2 * Math.PI * f0 * t + phase)
  );
  const periods = Float64Array.from(freqs, f => 1 / f);
  return periodogram(Float64Array.from(times), y, periods);
}

/** Frequencies from fMin to fMax with `oversample` points per 1 / baseline. */
export function frequencyGrid(fMin, fMax, baseline, oversample = 10) {
  const df = 1 / (oversample * baseline);
  const m = Math.floor((fMax - fMin) / df + 1e-9) + 1;
  return Float64Array.from({ length: m }, (_, k) => fMin + k * df);
}

/**
 * Local maxima of a spectrum, highest first.
 * @returns {{frequency: number, power: number, index: number}[]}
 */
export function findPeaks(freqs, power, { top = 8, minPower = 0 } = {}) {
  const out = [];
  for (let i = 1; i < power.length - 1; i++)
    if (
      power[i] > power[i - 1] &&
      power[i] >= power[i + 1] &&
      power[i] >= minPower
    )
      out.push({ frequency: freqs[i], power: power[i], index: i });
  out.sort((a, b) => b.power - a.power);
  return out.slice(0, top);
}

/** The span of the epochs. */
export function baselineOf(times) {
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < times.length; i++) {
    if (times[i] < lo) lo = times[i];
    if (times[i] > hi) hi = times[i];
  }
  return hi - lo;
}
