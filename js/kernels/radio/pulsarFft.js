// =============================================================================
// Pulsar kernel: a radix-2 Fourier transform and the harmonic-summed power search
// -----------------------------------------------------------------------------
//   fftPower          DERIVED: |X_k|^2 / (n sigma^2) of a zero-padded real series, k = 0 ..
//                     N / 2; for white noise of standard deviation sigma each is a unit
//                     exponential variable (n the unpadded length)
//   harmonicSumSearch MEASURED: for each fundamental bin in a range, the sum over
//                     harmonics h = 1 .. H of the largest power within a window of
//                     ceil(h / 2) bins of h k (a fundamental between two bins puts its
//                     h-th harmonic up to h / 2 bins off); the maximum is the statistic.
//                     It is a search statistic for ranking trial DMs, not a calibrated
//                     significance: the significance of a period is the fold search's
//                     trial-corrected probability.
//
// No dependency. Pure: no DOM, no clock.
// =============================================================================

const { Math, Float64Array } = globalThis;

const twiddles = new Map();
function twiddle(n) {
  let t = twiddles.get(n);
  if (!t) {
    const cos = new Float64Array(n / 2);
    const sin = new Float64Array(n / 2);
    for (let i = 0; i < n / 2; i++) {
      cos[i] = Math.cos((2 * Math.PI * i) / n);
      sin[i] = -Math.sin((2 * Math.PI * i) / n);
    }
    t = { cos, sin };
    twiddles.set(n, t);
  }
  return t;
}

/** The smallest power of two at or above n. */
export function nextPow2(n) {
  let m = 1;
  while (m < n) m *= 2;
  return m;
}

/** In-place iterative radix-2 FFT of (re, im), length a power of two: X_k = sum x_j exp(-2 pi i j k / n). */
export function fft(re, im) {
  const n = re.length;
  const { cos, sin } = twiddle(n);
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i];
      re[i] = re[j];
      re[j] = tr;
      const ti = im[i];
      im[i] = im[j];
      im[j] = ti;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1;
    const step = n / len;
    for (let i = 0; i < n; i += len) {
      for (let k = 0, t = 0; k < half; k++, t += step) {
        const a = i + k;
        const b = a + half;
        const xr = re[b] * cos[t] - im[b] * sin[t];
        const xi = re[b] * sin[t] + im[b] * cos[t];
        re[b] = re[a] - xr;
        im[b] = im[a] - xi;
        re[a] += xr;
        im[a] += xi;
      }
    }
  }
}

/**
 * The normalised power spectrum of a real series (mean removed, zero-padded to `size`).
 * @returns {Float64Array} power at k = 0 .. size / 2
 */
export function fftPower(series, length, sigma, size, work) {
  const re = work?.re ?? new Float64Array(size);
  const im = work?.im ?? new Float64Array(size);
  re.fill(0);
  im.fill(0);
  let mean = 0;
  for (let j = 0; j < length; j++) mean += series[j];
  mean /= length;
  for (let j = 0; j < length; j++) re[j] = series[j] - mean;
  fft(re, im);
  const norm = 1 / (length * sigma * sigma);
  const out = new Float64Array(size / 2 + 1);
  for (let k = 0; k <= size / 2; k++)
    out[k] = (re[k] * re[k] + im[k] * im[k]) * norm;
  return out;
}

/**
 * The harmonic-summed power over fundamental bins [kLo, kHi].
 * @returns {{statistic: number, bin: number}} the maximum and where it is
 */
export function harmonicSumSearch(power, kLo, kHi, harmonics = 4) {
  const top = power.length - 1;
  let best = -Infinity;
  let bestBin = kLo;
  for (let k = Math.max(1, kLo); k <= kHi; k++) {
    let s = 0;
    for (let h = 1; h <= harmonics; h++) {
      const c = h * k;
      if (c > top) break;
      const w = Math.ceil(h / 2);
      let m = 0;
      for (let j = Math.max(0, c - w); j <= Math.min(top, c + w); j++)
        if (power[j] > m) m = power[j];
      s += m;
    }
    if (s > best) {
      best = s;
      bestBin = k;
    }
  }
  return { statistic: best, bin: bestBin };
}
