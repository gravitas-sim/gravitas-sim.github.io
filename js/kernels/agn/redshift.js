// =============================================================================
// AGN kernel: the redshift of a quasar from its broad lines (R1)
// -----------------------------------------------------------------------------
// quasarRedshift   DERIVED  the galaxy kernel's direct lagged cross-correlation with a caller-supplied broad-line
//                           template, with the linear high-pass widened to 401 samples so a broad line survives it
//
// A template that is not the object, and lines that do not share one redshift (broad lines of different ionisation
// are known to disagree), are a model-limited error the correlation's interval does not contain; the caller may add
// a velocity systematic. Pure.
// =============================================================================

import { crossCorrelate } from '../galaxy/crosscorr.js';
import { C_LIGHT } from '../radiation/constants.js';

const { Math } = globalThis;

/** The high-pass window of the quasar correlation, in samples. */
export const QSO_HIGH_PASS_WINDOW = 401;

/**
 * The redshift of a quasar spectrum by correlation with a broad-line template.
 * @param {object} spec - the galaxy kernel's spectrum
 * @param {object} template - the galaxy kernel's template (source string required)
 * @param {{zRange: {min: number, max: number}, highPassWindow?: number, refuseMisfit?: boolean, systematicKmS?: number, keepProfile?: boolean}} o
 */
export function quasarRedshift(
  spec,
  template,
  {
    zRange,
    highPassWindow = QSO_HIGH_PASS_WINDOW,
    refuseMisfit = false,
    systematicKmS,
    keepProfile = false,
  } = {}
) {
  const r = crossCorrelate(spec, template, {
    zRange,
    highPassWindow,
    refuseMisfit,
    keepProfile,
  });
  const limits = [
    'the interval carries the correlation’s noise only: lines of different ionisation can disagree on the redshift and the template may not describe the object',
    'broad lines are wide: the redshift is good to a few hundred km/s at best, not to the narrow-line scale',
  ];
  if (r.status !== 'ok' && r.status !== 'low-significance')
    return { ...r, limits };
  if (systematicKmS > 0) {
    const modelSigmaZ = ((1 + r.z) * systematicKmS) / (C_LIGHT / 1000);
    return {
      ...r,
      limits,
      modelSigmaZ,
      sigmaZTotal: Math.hypot(r.sigmaZ, modelSigmaZ),
    };
  }
  return { ...r, limits, modelSigmaZ: null };
}
