// =============================================================================
// The noise a detector actually had, estimated from its own data
// -----------------------------------------------------------------------------
// js/gw/noise.js carries aligoPsd(), which is a *design* curve: the sensitivity
// Advanced LIGO was built to reach, not the noise it had on any given night. It
// is the right curve for the lab's synthetic noise and the wrong one for a real
// event. Whitening 2019 strain by a design curve and calling the result
// "whitened" would be quietly claiming a detector state nobody measured.
//
// This estimates the one-sided power spectral density of a stretch of real
// strain by Welch's method: cut it into overlapping segments, window each,
// take the periodogram, and average. Two choices matter and both are stated
// wherever the result is used.
//
//   The average is a MEDIAN, not a mean. Real strain carries glitches - short,
//   loud, non-Gaussian transients - and one of them in one segment drags a mean
//   up across every frequency it touches. The median ignores a minority of bad
//   segments. It is biased low for Gaussian noise, by a known factor, which is
//   corrected: see medianBias().
//
//   The caller can EXCLUDE an interval. A noise estimate that includes the
//   signal it is then used to whiten measures a little of the signal as noise.
//   For a short, loud binary-black-hole merger the fix is simply to leave out
//   the seconds around it. For a binary neutron star, which is in band for the
//   whole of a 32-second file, there is nothing to leave out, and the caller is
//   expected to say so.
//
// Pure: numbers in, numbers out. The build tool runs it in Node and the tests
// check it against noise of known spectrum.
// =============================================================================

import { fft, isPowerOfTwo } from './fft.js';

/**
 * The bias of a median of periodogram values, relative to their mean.
 *
 * For Gaussian noise each periodogram bin is exponentially distributed, so the
 * median of n of them sits below the mean by a factor that tends to ln 2 as n
 * grows. This is the finite-n form used by scipy.signal.welch and by the LIGO
 * FINDCHIRP estimator (Allen et al. 2012, Phys. Rev. D 85, 122006, appendix B).
 *
 * @param {number} n - Number of segments averaged
 * @returns {number} Divide the median by this to estimate the mean
 */
export function medianBias(n) {
  let bias = 1;
  for (let k = 1; k <= Math.floor((n - 1) / 2); k++) {
    bias += 1 / (2 * k + 1) - 1 / (2 * k);
  }
  return bias;
}

/** A Hann window of length n, the one Welch's method is usually run with. */
export function hann(n) {
  const w = new Float64Array(n);
  for (let i = 0; i < n; i++)
    w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / n);
  return w;
}

/**
 * One-sided power spectral density by Welch's method.
 *
 * @param {ArrayLike<number>} samples - Strain, uniformly sampled
 * @param {object} opts
 * @param {number} opts.sampleRate - Hz
 * @param {number} [opts.segmentSeconds] - Segment length; the segment in
 *   samples must be a power of two
 * @param {number} [opts.overlap] - Fraction of a segment shared with the next
 * @param {'median'|'mean'} [opts.average] - How segments are combined
 * @param {Array<[number, number]>} [opts.exclude] - Intervals, in seconds from
 *   the first sample, that no segment may touch
 * @returns {{freq: Float64Array, psd: Float64Array, segments: number,
 *   segmentSeconds: number, average: string}} PSD in (units)^2 / Hz
 */
export function welchPsd(
  samples,
  {
    sampleRate,
    segmentSeconds = 4,
    overlap = 0.5,
    average = 'median',
    exclude = [],
  } = {}
) {
  const nseg = Math.round(segmentSeconds * sampleRate);
  if (!isPowerOfTwo(nseg)) {
    throw new RangeError(
      `welchPsd: ${nseg} samples per segment is not a power of two`
    );
  }
  const step = Math.max(1, Math.round(nseg * (1 - overlap)));
  const w = hann(nseg);
  let wss = 0;
  for (let i = 0; i < nseg; i++) wss += w[i] * w[i];
  const scale = 1 / (sampleRate * wss);

  const nbin = nseg / 2 + 1;
  const columns = [];
  for (let start = 0; start + nseg <= samples.length; start += step) {
    const t0 = start / sampleRate;
    const t1 = (start + nseg) / sampleRate;
    if (exclude.some(([a, b]) => t0 < b && t1 > a)) continue;
    // Remove the segment mean first: a constant offset is not noise, and in
    // strain it would leak into the lowest bins through the window.
    let mean = 0;
    for (let i = 0; i < nseg; i++) mean += samples[start + i];
    mean /= nseg;
    const re = new Float64Array(nseg);
    const im = new Float64Array(nseg);
    for (let i = 0; i < nseg; i++) re[i] = (samples[start + i] - mean) * w[i];
    fft(re, im, false);
    const p = new Float64Array(nbin);
    for (let k = 0; k < nbin; k++) {
      const one = (re[k] * re[k] + im[k] * im[k]) * scale;
      // One-sided: every bin but DC and Nyquist carries its negative twin.
      p[k] = k === 0 || k === nseg / 2 ? one : 2 * one;
    }
    columns.push(p);
  }
  if (!columns.length) {
    throw new RangeError(
      'welchPsd: no segment fits outside the excluded intervals'
    );
  }

  const psd = new Float64Array(nbin);
  const col = new Float64Array(columns.length);
  const bias = average === 'median' ? medianBias(columns.length) : 1;
  for (let k = 0; k < nbin; k++) {
    if (average === 'median') {
      for (let s = 0; s < columns.length; s++) col[s] = columns[s][k];
      col.sort();
      const m = col.length;
      const med =
        m % 2 ? col[(m - 1) / 2] : 0.5 * (col[m / 2 - 1] + col[m / 2]);
      psd[k] = med / bias;
    } else {
      let sum = 0;
      for (let s = 0; s < columns.length; s++) sum += columns[s][k];
      psd[k] = sum / columns.length;
    }
  }
  const freq = new Float64Array(nbin);
  for (let k = 0; k < nbin; k++) freq[k] = (k * sampleRate) / nseg;
  return { freq, psd, segments: columns.length, segmentSeconds, average };
}

/**
 * A PSD as a function of frequency, by linear interpolation between bins.
 *
 * The shape js/gw/match.js whiten() takes as its `psd` option, so real strain
 * goes through the same whitening as the lab's synthetic noise does - only
 * with the noise that was really there.
 *
 * @param {{freq: Float64Array, psd: Float64Array}} estimate - From welchPsd()
 * @returns {Function} f (Hz) -> PSD
 */
export function psdFunction({ freq, psd }) {
  const df = freq[1] - freq[0];
  const last = freq.length - 1;
  return f => {
    const x = f / df;
    if (!(x > 0)) return psd[0];
    if (x >= last) return psd[last];
    const i = Math.floor(x);
    const u = x - i;
    return psd[i] * (1 - u) + psd[i + 1] * u;
  };
}
