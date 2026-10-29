// =============================================================================
// Sampling: the profile against the pixel (Prompt 211, DETECTOR_EFFECTS.md)
// -----------------------------------------------------------------------------
// The frame model integrates the profile over each square pixel, so the pixels
// are exact for a stated Gaussian; what undersampling does is in where the star
// sits in its pixel. This module names the regime and measures two things over
// the sub-pixel phase of a Gaussian star: the peak-pixel fraction (whether the
// brightest pixel saturates depends on the phase) and the flux inside a
// proportional whole-pixel aperture (a pixel belongs when its centre lies within
// the radius). Pure; no random numbers.
// =============================================================================

import { fractionIn } from './frame.js';

const { Math } = globalThis;

export { SAMPLING, samplingOf } from './effects.js';
import { SAMPLING } from './effects.js';
const FWHM_PER_SIGMA = 2 * Math.sqrt(2 * Math.LN2);

/**
 * The peak-pixel fraction's range and the proportional aperture's flux over a
 * grid x grid set of cell-centred sub-pixel phases in [-0.5, 0.5).
 * @returns {{fwhmPx, peakMin, peakMax, peakRatio, apMean, apRelStd}} apRelStd
 *   is the population standard deviation over the mean
 */
export function phaseStats(
  fwhmPx,
  { grid = SAMPLING.phaseGrid, ratio = SAMPLING.apertureFwhmRatio } = {}
) {
  const sigma = fwhmPx / FWHM_PER_SIGMA;
  const r = ratio * fwhmPx;
  const half = Math.ceil(r) + 3;
  const n = 2 * half + 1;
  const col = c => {
    const v = new Array(n);
    for (let i = 0; i < n; i++)
      v[i] = fractionIn(i - half - 0.5, i - half + 0.5, c, sigma);
    return v;
  };
  const phases = Array.from({ length: grid }, (_, k) => (k + 0.5) / grid - 0.5);
  const cols = phases.map(col);
  let peakMin = Infinity;
  let peakMax = -Infinity;
  let sum = 0;
  let sum2 = 0;
  let count = 0;
  for (let a = 0; a < grid; a++)
    for (let b = 0; b < grid; b++) {
      const fx = cols[a];
      const fy = cols[b];
      const peak = fx[half] * fy[half];
      peakMin = Math.min(peakMin, peak);
      peakMax = Math.max(peakMax, peak);
      let ap = 0;
      for (let j = 0; j < n; j++)
        for (let i = 0; i < n; i++)
          if (Math.hypot(i - half - phases[a], j - half - phases[b]) <= r)
            ap += fx[i] * fy[j];
      sum += ap;
      sum2 += ap * ap;
      count++;
    }
  const mean = sum / count;
  return {
    fwhmPx,
    peakMin,
    peakMax,
    peakRatio: peakMax / peakMin,
    apMean: mean,
    apRelStd: Math.sqrt(Math.max(0, sum2 / count - mean * mean)) / mean,
  };
}
