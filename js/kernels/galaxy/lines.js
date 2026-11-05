// =============================================================================
// Galaxy kernel: the redshift from line identification (L1, L2)
// -----------------------------------------------------------------------------
// redshiftFromLines   DERIVED   the ISM kernel's detection and identification against the
//                               radiation line pack over a redshift grid, each identified line
//                               refitted with a free-width Gaussian, an inverse-variance mean with
//                               a scatter inflation
//
// One identified line cannot fix a redshift (its identity and the redshift are degenerate), so
// fewer than two is 'not-constrained'. The grid is the caller's: there is no default range. Pure.
// =============================================================================

import { refused } from '../statistics/check.js';
import { covarianceInterval } from '../statistics/intervals.js';
import {
  checkSpectrum,
  nearestIndex,
  dispersionAtIndex,
} from '../ism/spectrum.js';
import { detectFeatures, solveRedshift, DETECTION_SNR } from '../ism/detect.js';
import { fitGaussianLine } from '../ism/measure.js';

const { Math, Number } = globalThis;

/** The fewest identified lines a redshift needs. */
export const MIN_LINES = 2;

const notConstrained = (code, why, extra = {}) => ({
  status: 'not-constrained',
  code,
  why,
  ...extra,
});

/**
 * The redshift of a spectrum from the lines it shows.
 * @param {object} spec - a spectrum (medium and resolving power required)
 * @param {Array<object>} lines - the line pack's LINES
 * @param {{zRange: {min: number, max: number, step: number}, snrMin?: number}} o
 */
export function redshiftFromLines(
  spec,
  lines,
  { zRange, snrMin = DETECTION_SNR } = {}
) {
  const bad = checkSpectrum(spec, { needResolution: true });
  if (bad) return bad;
  if (
    !zRange ||
    !Number.isFinite(zRange.min) ||
    !Number.isFinite(zRange.max) ||
    !(zRange.step > 0) ||
    !(zRange.min < zRange.max)
  )
    return refused(
      'bad-z-range',
      'a redshift grid {min < max, step > 0} is required; there is no default'
    );
  const det = detectFeatures(spec, { snrMin });
  if (det.status !== 'ok') return det;
  if (det.features.length < MIN_LINES)
    return notConstrained(
      'too-few-features',
      `${det.features.length} feature(s) detected at a signal to noise of ${snrMin}: a redshift needs at least ${MIN_LINES} lines`,
      { detected: det.features.length }
    );
  const mid = spec.lambdaNm.length >> 1;
  const pixelNm = spec.lambdaNm[mid + 1] - spec.lambdaNm[mid];
  const sol = solveRedshift(det.features, lines, {
    medium: spec.medium,
    zRange,
    pixelNm,
  });
  if (sol.status === 'refused' && sol.code === 'no-match')
    return notConstrained(
      'no-match',
      'no redshift in the grid identifies a detected feature with a line of the pack',
      { detected: det.features.length }
    );
  if (sol.status !== 'ok') return sol;
  // refit every identified line with a free-width Gaussian, in two passes
  const used = sol.features.filter(f => f.label === 'identified');
  const fits = [];
  for (const f of used) {
    let fit = fitGaussianLine(spec, { guessNm: f.centreNm });
    if (fit.status === 'ok' && fit.lsfFwhmPx > 0) {
      const disp = dispersionAtIndex(
        spec.lambdaNm,
        nearestIndex(spec.lambdaNm, fit.centreNm)
      );
      const half2 = Math.ceil((3 * fit.fwhmNm) / disp);
      const half1 = Math.max(8, Math.ceil(4 * fit.lsfFwhmPx));
      if (half2 > half1) {
        const again = fitGaussianLine(spec, {
          guessNm: fit.centreNm,
          halfWidthPx: half2,
        });
        if (again.status === 'ok') fit = again;
      }
    }
    if (
      fit.status !== 'ok' ||
      !Number.isFinite(fit.centreNm) ||
      !(fit.sigmaCentreNm > 0) ||
      fit.samplingVerdict === 'severe'
    )
      continue;
    const rest = f.line.restNm;
    fits.push({
      id: f.line.id,
      restNm: rest,
      centreNm: fit.centreNm,
      z: fit.centreNm / rest - 1,
      sigmaZ: fit.sigmaCentreNm / rest,
      kind: f.kind,
      snr: f.snr,
    });
  }
  if (fits.length < MIN_LINES)
    return notConstrained(
      fits.length ? 'single-line' : 'no-fit',
      `${fits.length} identified line(s) fitted: one line leaves its identity and the redshift degenerate`,
      { identified: used.length, trial: sol.trial }
    );
  let sw = 0;
  let sz = 0;
  for (const l of fits) {
    const wi = 1 / (l.sigmaZ * l.sigmaZ);
    sw += wi;
    sz += wi * l.z;
  }
  const z = sz / sw;
  let sigmaZ = Math.sqrt(1 / sw);
  let chi2 = 0;
  for (const l of fits) chi2 += ((l.z - z) / l.sigmaZ) ** 2;
  const dof = fits.length - 1;
  const inflated = fits.length >= 3 && chi2 / dof > 1;
  if (inflated) sigmaZ *= Math.sqrt(chi2 / dof);
  return {
    status: 'ok',
    z,
    sigmaZ,
    interval: covarianceInterval(z, sigmaZ),
    lines: fits,
    matched: fits.length,
    chi2,
    dof,
    flags: inflated ? ['scatter-inflated'] : [],
    trial: sol.trial,
    medium: spec.medium,
    method:
      'identification against the line pack over a redshift grid, each line refitted with a free-width Gaussian, an inverse-variance mean',
    assumes:
      'one redshift; Gaussian line profiles; independent pixel errors; the pack’s rest wavelengths in the spectrum’s medium',
  };
}
