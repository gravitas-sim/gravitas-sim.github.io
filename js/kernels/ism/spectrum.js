// =============================================================================
// ISM kernel: what a spectrum is, and the checks every function makes first
// -----------------------------------------------------------------------------
// A spectrum is { lambdaNm (ascending), flux, sigma (per-sample errors or null),
// medium ('air' | 'vacuum', required), resolvingPower (or lsfFwhmNm) }. The
// medium is required because 83 km/s at 500 nm is the difference between the two
// conventions (ISM.md). Refusals are records with a code; nothing throws for a
// bad input and nothing is converted silently.
// =============================================================================

import { refused } from '../statistics/check.js';

const { Number, Math, Float64Array } = globalThis;

export const MIN_SAMPLES = 20;

/**
 * Check a spectrum; null when it is usable, else a refusal.
 * @param {object} spec
 * @param {{needMedium?: boolean, needResolution?: boolean}} [o]
 */
export function checkSpectrum(
  spec,
  { needMedium = true, needResolution = false } = {}
) {
  if (!spec || !spec.lambdaNm || !spec.flux)
    return refused('no-spectrum', 'a spectrum needs lambdaNm and flux');
  const n = spec.lambdaNm.length;
  if (spec.flux.length !== n)
    return refused('length-mismatch', 'lambdaNm and flux differ in length');
  if (n < MIN_SAMPLES)
    return refused(
      'too-few-samples',
      `a spectrum of ${n} samples is under the ${MIN_SAMPLES} the rules need`
    );
  for (let i = 0; i < n; i++)
    if (!Number.isFinite(spec.lambdaNm[i]) || !Number.isFinite(spec.flux[i]))
      return refused(
        'not-finite',
        'a wavelength or a flux is not a finite number'
      );
  for (let i = 1; i < n; i++)
    if (!(spec.lambdaNm[i] > spec.lambdaNm[i - 1]))
      return refused('not-increasing', 'the wavelength axis does not increase');
  if (spec.sigma) {
    if (spec.sigma.length !== n)
      return refused('length-mismatch', 'sigma and flux differ in length');
    for (let i = 0; i < n; i++)
      if (!(spec.sigma[i] > 0 && spec.sigma[i] < Infinity))
        return refused('bad-error', 'a per-sample error is not positive');
  }
  if (needMedium && spec.medium !== 'air' && spec.medium !== 'vacuum')
    return refused(
      'medium-missing',
      "the spectrum's medium ('air' or 'vacuum') is required: the two differ by tens of km/s"
    );
  if (needResolution && !(spec.resolvingPower > 0 || spec.lsfFwhmNm > 0))
    return refused(
      'resolution-missing',
      'the resolving power or the line-spread FWHM is required'
    );
  return null;
}

/** The pixel widths: half the distance between the two neighbours, one-sided at the ends. */
export function pixelWidths(lambdaNm) {
  const n = lambdaNm.length;
  const w = new Float64Array(n);
  w[0] = lambdaNm[1] - lambdaNm[0];
  w[n - 1] = lambdaNm[n - 1] - lambdaNm[n - 2];
  for (let i = 1; i < n - 1; i++)
    w[i] = 0.5 * (lambdaNm[i + 1] - lambdaNm[i - 1]);
  return w;
}

/** The index of the sample nearest to a wavelength. */
export function nearestIndex(lambdaNm, x) {
  let lo = 0;
  let hi = lambdaNm.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (lambdaNm[m] <= x) lo = m;
    else hi = m;
  }
  return Math.abs(lambdaNm[lo] - x) <= Math.abs(lambdaNm[hi] - x) ? lo : hi;
}

/** The wavelength at a fractional sample index, linearly between the two samples (clamped to the axis). */
export function lambdaAtIndex(lambdaNm, x) {
  const n = lambdaNm.length;
  const i = Math.min(n - 2, Math.max(0, Math.floor(x)));
  return lambdaNm[i] + (x - i) * (lambdaNm[i + 1] - lambdaNm[i]);
}

/** The local sample width (nm per sample) at a fractional index. */
export function dispersionAtIndex(lambdaNm, x) {
  const n = lambdaNm.length;
  const i = Math.min(n - 2, Math.max(0, Math.floor(x)));
  return lambdaNm[i + 1] - lambdaNm[i];
}

/** The line-spread FWHM in nm at a wavelength. */
export const lsfFwhmAt = (spec, lambdaNm) =>
  spec.lsfFwhmNm > 0 ? spec.lsfFwhmNm : lambdaNm / spec.resolvingPower;

/** Median of a list. */
export function median(list) {
  const s = Array.from(list).sort((p, q) => p - q);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : 0.5 * (s[m - 1] + s[m]);
}

/** The white-noise level of a series from the median absolute deviation of its successive differences. */
export function robustSigma(y) {
  const d = [];
  for (let i = 1; i < y.length; i++) d.push(y[i] - y[i - 1]);
  const m = median(d);
  const mad = median(d.map(v => Math.abs(v - m)));
  return (1.4826 * mad) / Math.SQRT2;
}
