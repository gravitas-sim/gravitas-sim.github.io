// =============================================================================
// A radix-2 complex FFT
// -----------------------------------------------------------------------------
// Sixty lines, in the repository rather than in a dependency, because the three
// things that need it - colouring synthetic detector noise, the time-frequency
// view, and the normalised overlap between two signals - are all small and none
// of them justifies a runtime library in a site that vendors everything it
// serves.
//
// In place, iterative, and length-restricted to a power of two. Callers pad.
// =============================================================================

/**
 * Whether a length can be transformed.
 * @param {number} n - Length
 * @returns {boolean} True for a positive power of two
 */
export const isPowerOfTwo = n =>
  Number.isInteger(n) && n > 0 && (n & (n - 1)) === 0;

/** The smallest power of two at least as large as n. */
export const nextPowerOfTwo = n => {
  let p = 1;
  while (p < n) p *= 2;
  return p;
};

/**
 * In-place complex FFT.
 *
 * @param {Float64Array} re - Real parts, length a power of two. Overwritten.
 * @param {Float64Array} im - Imaginary parts, same length. Overwritten.
 * @param {boolean} [inverse] - Run the inverse transform, with the 1/n scaling
 * @returns {void}
 */
export function fft(re, im, inverse = false) {
  const n = re.length;
  if (!isPowerOfTwo(n))
    throw new RangeError(`fft: length ${n} is not a power of two`);
  if (im.length !== n)
    throw new RangeError('fft: re and im must be the same length');

  // Bit-reversal permutation.
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
    const ang = (sign * 2 * Math.PI) / len;
    const wRe = Math.cos(ang);
    const wIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let curRe = 1;
      let curIm = 0;
      for (let k = 0; k < len / 2; k++) {
        const uRe = re[i + k];
        const uIm = im[i + k];
        const vRe = re[i + k + len / 2] * curRe - im[i + k + len / 2] * curIm;
        const vIm = re[i + k + len / 2] * curIm + im[i + k + len / 2] * curRe;
        re[i + k] = uRe + vRe;
        im[i + k] = uIm + vIm;
        re[i + k + len / 2] = uRe - vRe;
        im[i + k + len / 2] = uIm - vIm;
        const nextRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nextRe;
      }
    }
  }

  if (inverse) {
    for (let i = 0; i < n; i++) {
      re[i] /= n;
      im[i] /= n;
    }
  }
}
