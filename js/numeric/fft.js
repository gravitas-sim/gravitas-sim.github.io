// The fast Fourier transform (Prompt 221, SEISMOLOGY.md). Consumer: the
// asteroseismology kernel (js/stellar/seismology.js). Pure: no imports.
//
// Contract. `fft(re, im)` is the unnormalised forward discrete Fourier
// transform, X_k = sum_n x_n exp(-2 pi i k n / N), in place, for any N >= 1:
// a power of two by the iterative radix-2 algorithm, any other length by
// Bluestein's chirp-z identity (three radix-2 transforms of the next power of
// two at or above 2N - 1). `ifft` is the inverse with the 1/N factor. The
// transform is exact up to rounding: the error of a radix-2 transform grows
// as log2 N times the machine epsilon, Bluestein's about three times that
// (FFT_VALIDATION in tests/seismology.test.js holds the measured figures).
// Lengths over MAX_LENGTH are refused so that a caller cannot allocate without
// bound.
const { Math } = globalThis;

export const MAX_LENGTH = 1 << 22;

const isPow2 = n => (n & (n - 1)) === 0;

function radix2(re, im, inverse) {
  const n = re.length;
  // bit reversal
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let t = re[i];
      re[i] = re[j];
      re[j] = t;
      t = im[i];
      im[i] = im[j];
      im[j] = t;
    }
  }
  const sign = inverse ? 1 : -1;
  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1;
    const ang = (sign * 2 * Math.PI) / len;
    // exact twiddles from the angle at each stage (not a recurrence): the
    // rounding error does not accumulate along the butterfly
    const wr = new Float64Array(half);
    const wi = new Float64Array(half);
    for (let k = 0; k < half; k++) {
      wr[k] = Math.cos(ang * k);
      wi[k] = Math.sin(ang * k);
    }
    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < half; k++) {
        const a = i + k;
        const b = a + half;
        const tr = re[b] * wr[k] - im[b] * wi[k];
        const ti = re[b] * wi[k] + im[b] * wr[k];
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
      }
    }
  }
}

function bluestein(re, im, inverse) {
  const n = re.length;
  let m = 1;
  while (m < 2 * n - 1) m <<= 1;
  const sign = inverse ? 1 : -1;
  // chirp w_k = exp(sign i pi k^2 / n); k^2 reduced mod 2n to keep the angle small
  const cr = new Float64Array(n);
  const ci = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    const kk = (k * k) % (2 * n);
    const a = (sign * Math.PI * kk) / n;
    cr[k] = Math.cos(a);
    ci[k] = Math.sin(a);
  }
  const ar = new Float64Array(m);
  const ai = new Float64Array(m);
  for (let k = 0; k < n; k++) {
    ar[k] = re[k] * cr[k] - im[k] * ci[k];
    ai[k] = re[k] * ci[k] + im[k] * cr[k];
  }
  const br = new Float64Array(m);
  const bi = new Float64Array(m);
  br[0] = cr[0];
  bi[0] = -ci[0];
  for (let k = 1; k < n; k++) {
    br[k] = br[m - k] = cr[k];
    bi[k] = bi[m - k] = -ci[k];
  }
  radix2(ar, ai, false);
  radix2(br, bi, false);
  for (let k = 0; k < m; k++) {
    const r = ar[k] * br[k] - ai[k] * bi[k];
    const i = ar[k] * bi[k] + ai[k] * br[k];
    ar[k] = r;
    ai[k] = i;
  }
  radix2(ar, ai, true);
  for (let k = 0; k < n; k++) {
    const r = ar[k] / m;
    const i = ai[k] / m;
    re[k] = r * cr[k] - i * ci[k];
    im[k] = r * ci[k] + i * cr[k];
  }
}

function check(re, im) {
  if (!re || !im || re.length !== im.length)
    throw new RangeError('fft: re and im must be arrays of one length');
  if (re.length < 1 || re.length > MAX_LENGTH)
    throw new RangeError(`fft: the length must be 1 to ${MAX_LENGTH}`);
}

/** Forward transform in place of the complex series (re, im); any length. */
export function fft(re, im) {
  check(re, im);
  if (re.length === 1) return;
  if (isPow2(re.length)) radix2(re, im, false);
  else bluestein(re, im, false);
}

/** Inverse transform in place, with the 1/N factor. */
export function ifft(re, im) {
  check(re, im);
  const n = re.length;
  if (n === 1) return;
  if (isPow2(n)) radix2(re, im, true);
  else bluestein(re, im, true);
  for (let k = 0; k < n; k++) {
    re[k] /= n;
    im[k] /= n;
  }
}

/**
 * The squared modulus |X_k|^2 of the forward transform of a real series, for
 * k = 0 .. floor(N/2). The input is not changed.
 */
export function realPower(x) {
  const n = x.length;
  const re = Float64Array.from(x);
  const im = new Float64Array(n);
  fft(re, im);
  const h = n >> 1;
  const out = new Float64Array(h + 1);
  for (let k = 0; k <= h; k++) out[k] = re[k] * re[k] + im[k] * im[k];
  return out;
}
