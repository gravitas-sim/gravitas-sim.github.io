// =============================================================================
// AGN kernel: the redshift of a quasar from its broad lines (R1)
// -----------------------------------------------------------------------------
// quasarRedshift   DERIVED  the galaxy kernel's direct lagged cross-correlation with a caller-supplied broad-line
//                           template, with the linear high-pass widened to 401 samples so a broad line survives it
//
// A template that is not the object, and lines that do not share one redshift (broad lines of different ionisation
// are known to disagree), are a model-limited error the correlation's interval does not contain; the caller may add
// a velocity systematic. Without one, a floor derived from the grid alone is carried (AGN-RULE-2 R2, 252b): the
// standard deviation of a uniform error over one sample, a floor and not an estimate of that disagreement. Pure.
// =============================================================================

import { crossCorrelate } from '../galaxy/crosscorr.js';
import { C_LIGHT } from '../radiation/constants.js';

const { Math } = globalThis;

/**
 * The model-limited velocity floor of a correlation redshift on a sampled grid, in km/s: c ln(10) step / sqrt(12),
 * with step the spectrum's own log10 wavelength step (the median of the successive differences). The standard
 * deviation of a uniform error spread over one sample: the template's placement against the spectrum is not known
 * to better than that whatever the noise. AGN-RULE-2 R2; a floor, not a model of line-family disagreement.
 * @param {{lambdaNm: ArrayLike<number>}} spec
 */
export function gridFloorKmS(spec) {
  const lam = spec.lambdaNm;
  const d = [];
  for (let i = 1; i < lam.length; i++)
    d.push(Math.log10(lam[i]) - Math.log10(lam[i - 1]));
  d.sort((a, b) => a - b);
  const step =
    d.length % 2
      ? d[(d.length - 1) / 2]
      : 0.5 * (d[d.length / 2 - 1] + d[d.length / 2]);
  return ((C_LIGHT / 1000) * Math.LN10 * step) / Math.sqrt(12);
}

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
  const caller = Number.isFinite(systematicKmS) && systematicKmS > 0;
  const vKmS = caller ? systematicKmS : gridFloorKmS(spec);
  const modelSigmaZ = ((1 + r.z) * vKmS) / (C_LIGHT / 1000);
  return {
    ...r,
    limits,
    modelSigmaZ,
    sigmaZTotal: Math.hypot(r.sigmaZ, modelSigmaZ),
    modelTerm: {
      kind: caller ? 'caller-systematic' : 'grid-floor',
      velocityKmS: vKmS,
      rule: caller
        ? 'the caller’s velocity systematic, replacing the grid floor'
        : 'c ln(10) step / sqrt(12): the sd of a uniform error over one sample of the spectrum’s grid; a floor, not an estimate of the template’s mismatch or of line-family disagreement',
    },
  };
}
