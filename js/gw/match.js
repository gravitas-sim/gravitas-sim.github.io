// =============================================================================
// Comparing two signals, and whitening one
// -----------------------------------------------------------------------------
// What this returns is a *match*: a normalised, noise-weighted overlap between
// two traces, maximised over time shift and over overall phase. It runs from 0
// to 1 and it is the same inner product a matched filter is built on.
//
// What it is not, and what nothing in this application may call it
// -----------------------------------------------------------------------------
// It is not a signal-to-noise ratio, a false-alarm rate, a detection
// significance or a probability. Those require a validated noise model, a
// template bank, a background estimate and a trials factor, none of which are
// here. A student can and should discover that a high match is easy to obtain
// and proves very little on its own, which is step 20 of the lesson; the
// interface says "similarity" everywhere and reports the number bare.
// =============================================================================

import { fft, nextPowerOfTwo } from './fft.js';
import { aligoPsd } from './noise.js';

/**
 * Sample a timeline onto a uniform grid.
 *
 * @param {object} timeline - From js/gw/timeline.js
 * @param {object} opts
 * @param {number} opts.sampleRate - Hz
 * @param {number} [opts.t0] - Window start
 * @param {number} [opts.t1] - Window end
 * @param {number} [opts.length] - Force a length, zero-padding or truncating
 * @returns {Float64Array} The samples
 */
export function sampleOnto(timeline, { sampleRate, t0, t1, length } = {}) {
  const a = t0 ?? timeline.tStart;
  const b = t1 ?? timeline.tEnd;
  const n = length ?? Math.max(2, Math.round((b - a) * sampleRate));
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const v = timeline.strainAtTime(a + i / sampleRate);
    out[i] = Number.isFinite(v) ? v : 0;
  }
  return out;
}

/**
 * A Tukey window, so that a finite stretch does not ring at its ends.
 *
 * The taper is the honest part of the preprocessing: without it the abrupt
 * start of a segment puts power at every frequency, and both the match and any
 * whitened plot show a filter artefact rather than a signal.
 *
 * @param {number} n - Length
 * @param {number} [alpha] - Fraction of the window spent tapering, total
 * @returns {Float64Array} The window
 */
export function tukey(n, alpha = 0.125) {
  const w = new Float64Array(n);
  const taper = Math.floor((alpha * (n - 1)) / 2);
  for (let i = 0; i < n; i++) {
    if (taper > 0 && i < taper) {
      w[i] = 0.5 * (1 + Math.cos(Math.PI * (i / taper - 1)));
    } else if (taper > 0 && i > n - 1 - taper) {
      w[i] = 0.5 * (1 + Math.cos(Math.PI * ((n - 1 - i) / taper - 1)));
    } else {
      w[i] = 1;
    }
  }
  return w;
}

/**
 * Divide a trace by the amplitude spectral density of the noise.
 *
 * Whitened data is in units of standard deviations of the noise, not in
 * strain, and the interface never draws the two on one axis. It is what makes
 * a chirp visible at all: unwhitened strain data is dominated by the seismic
 * wall at low frequency and shows nothing.
 *
 * @param {Float64Array|Float32Array|Array<number>} samples - Strain
 * @param {object} opts
 * @param {number} opts.sampleRate - Hz
 * @param {Function} [opts.psd] - One-sided PSD, strain^2/Hz
 * @param {number} [opts.fLow] - Band-pass low edge, Hz
 * @param {number} [opts.fHigh] - Band-pass high edge, Hz
 * @returns {Float64Array} Whitened, band-passed samples, in sigma
 */
export function whiten(
  samples,
  { sampleRate, psd = aligoPsd, fLow = 20, fHigh = 500 } = {}
) {
  const n0 = samples.length;
  const n = nextPowerOfTwo(n0);
  const w = tukey(n0);
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  for (let i = 0; i < n0; i++) re[i] = samples[i] * w[i];
  fft(re, im, false);
  const df = sampleRate / n;
  for (let k = 0; k <= n / 2; k++) {
    const f = k * df;
    const mirror = k === 0 || k === n / 2 ? -1 : n - k;
    let scale = 0;
    if (f >= fLow && f <= fHigh) {
      // Per root hertz, so that the result has unit variance per unit
      // bandwidth rather than a value that depends on the segment length.
      scale = 1 / Math.sqrt((psd(f) * sampleRate) / 2);
    }
    re[k] *= scale;
    im[k] *= scale;
    if (mirror > 0) {
      re[mirror] = re[k];
      im[mirror] = -im[k];
    }
  }
  fft(re, im, true);
  return re.slice(0, n0);
}

/**
 * The normalised overlap between two traces, maximised over time and phase.
 *
 * @param {Float64Array|Float32Array} a - First trace, strain
 * @param {Float64Array|Float32Array} b - Second, same rate
 * @param {object} opts
 * @param {number} opts.sampleRate - Hz
 * @param {Function} [opts.psd] - Noise weighting
 * @param {number} [opts.fLow] - Band edges, Hz
 * @param {number} [opts.fHigh]
 * @returns {{similarity: number, shiftSeconds: number, fLow: number, fHigh: number}}
 *   `similarity` runs 0 to 1. It is not a detection statistic.
 */
export function similarity(
  a,
  b,
  { sampleRate, psd = aligoPsd, fLow = 20, fHigh = 500 } = {}
) {
  const n = nextPowerOfTwo(Math.max(a.length, b.length));
  const wa = tukey(a.length);
  const wb = tukey(b.length);
  const ar = new Float64Array(n);
  const ai = new Float64Array(n);
  const br = new Float64Array(n);
  const bi = new Float64Array(n);
  for (let i = 0; i < a.length; i++) ar[i] = a[i] * wa[i];
  for (let i = 0; i < b.length; i++) br[i] = b[i] * wb[i];
  fft(ar, ai, false);
  fft(br, bi, false);

  const df = sampleRate / n;
  const zr = new Float64Array(n);
  const zi = new Float64Array(n);
  let normA = 0;
  let normB = 0;
  for (let k = 1; k < n / 2; k++) {
    const f = k * df;
    if (f < fLow || f > fHigh) continue;
    const s = psd(f);
    if (!(s > 0)) continue;
    normA += (ar[k] * ar[k] + ai[k] * ai[k]) / s;
    normB += (br[k] * br[k] + bi[k] * bi[k]) / s;
    // a * conj(b), weighted.
    zr[k] = (ar[k] * br[k] + ai[k] * bi[k]) / s;
    zi[k] = (ai[k] * br[k] - ar[k] * bi[k]) / s;
  }
  if (!(normA > 0) || !(normB > 0)) {
    return { similarity: 0, shiftSeconds: 0, fLow, fHigh };
  }

  fft(zr, zi, true);
  let best = 0;
  let bestIndex = 0;
  for (let j = 0; j < n; j++) {
    const m = Math.hypot(zr[j], zi[j]);
    if (m > best) {
      best = m;
      bestIndex = j;
    }
  }
  const value = (n * best) / Math.sqrt(normA * normB);
  const shift = bestIndex > n / 2 ? bestIndex - n : bestIndex;
  return {
    similarity: Math.min(1, value),
    shiftSeconds: shift / sampleRate,
    fLow,
    fHigh,
  };
}
