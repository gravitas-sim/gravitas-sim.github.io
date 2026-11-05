// =============================================================================
// ISM kernel: a star's own lines against the gas in front of it (S9)
// -----------------------------------------------------------------------------
// Narrow interstellar lines sit in a broad stellar spectrum, and the two are told
// apart by width and by velocity: a stellar line is as broad as the star's other
// lines and sits at its velocity; an interstellar line is narrow (at SDSS-like
// resolution, as narrow as the instrument) and usually offset from it.
//
//   narrow   sigma_obs <= 1.5 sigma_lsf, or sigma_obs <= 0.5 sigma_ref
//   offset   |v - v_star| >= 3 sigma_d, sigma_d the two uncertainties in quadrature
//   narrow and offset           'interstellar-candidate'
//   narrow and not offset       'ambiguous' (a narrow line at the star's velocity is
//                               stellar in a cool star and interstellar at the same
//                               velocity in any: the data cannot say)
//   not narrow and not offset   'stellar'
//   not narrow and offset       'ambiguous'
//
// A classification is never a proof, and the result says so.
// =============================================================================

import { refused } from '../statistics/check.js';
import { C_LIGHT } from '../radiation/constants.js';
import { FWHM_PER_SIGMA } from '../spectrograph/lsf.js';
import { lineVelocity } from './measure.js';
import { checkSpectrum, lsfFwhmAt, dispersionAtIndex, nearestIndex } from './spectrum.js';

const { Math, Number } = globalThis;
const C_KM_S = C_LIGHT / 1000;

export const NARROW_LSF_FACTOR = 1.5;
export const NARROW_REF_FACTOR = 0.5;
export const OFFSET_SIGMAS = 3;

/** The velocity per sample (km/s) at a wavelength. */
export function kmPerSample(spec, lambdaNm) {
  const i = nearestIndex(spec.lambdaNm, lambdaNm);
  return (C_KM_S * dispersionAtIndex(spec.lambdaNm, i)) / spec.lambdaNm[i];
}

/**
 * The star's velocity from its broad lines: the inverse-variance weighted mean of the lines' Gaussian velocities.
 * @param {object} spec
 * @param {{lines: Array<{restNm: number, restMedium: string}>, broadSigmaKmS: number, z0?: number}} o
 *   broadSigmaKmS is the analyst's prior for the broad lines' width; the fit window is 5 of them each side
 */
export function stellarVelocity(spec, { lines, broadSigmaKmS, z0 = 0 } = {}) {
  const bad = checkSpectrum(spec, { needResolution: true });
  if (bad) return bad;
  if (!Array.isArray(lines) || !lines.length || !(broadSigmaKmS > 0))
    return refused('bad-input', 'broad lines and a prior width are needed');
  let sw = 0;
  let sv = 0;
  let ss = 0;
  const per = [];
  for (const l of lines) {
    const half = Math.ceil((5 * broadSigmaKmS) / kmPerSample(spec, l.restNm));
    const r = lineVelocity(spec, { ...l, z0, halfWidthPx: half });
    if (r.status !== 'ok') continue;
    const w = 1 / r.sigmaKmS ** 2;
    sw += w;
    sv += w * r.velocityKmS;
    ss += w * ((C_KM_S * r.fit.sigmaNm) / r.fit.centreNm);
    per.push({ restNm: l.restNm, velocityKmS: r.velocityKmS, sigmaKmS: r.sigmaKmS });
  }
  if (!per.length)
    return refused('no-stellar-lines', 'no broad line could be fitted');
  return {
    status: 'ok',
    velocityKmS: sv / sw,
    sigmaKmS: Math.sqrt(1 / sw),
    sigmaRefKmS: ss / sw,
    lines: per,
  };
}

/**
 * Classify an absorption feature against a star.
 * @param {object} spec
 * @param {object} feature - a lineVelocity result (status ok) of the feature
 * @param {{velocityKmS: number, sigmaKmS: number, sigmaRefKmS?: number}} star
 */
export function classifyAbsorption(spec, feature, star) {
  if (!feature || feature.status !== 'ok' || !feature.fit)
    return refused('no-feature', 'a fitted feature is required');
  if (feature.fit.kind !== 'absorption')
    return refused('not-absorption', 'the classification is for absorption lines');
  const bad = checkSpectrum(spec, { needResolution: true });
  if (bad) return bad;
  const lambda = feature.fit.centreNm;
  const sigmaObsKmS = (C_KM_S * feature.fit.sigmaNm) / lambda;
  // sigma_lsf in km/s: FWHM / lambda * c / FWHM_PER_SIGMA
  const sigmaLsf = (C_KM_S * lsfFwhmAt(spec, lambda)) / lambda / FWHM_PER_SIGMA;
  const narrow =
    sigmaObsKmS <= NARROW_LSF_FACTOR * sigmaLsf ||
    (Number.isFinite(star.sigmaRefKmS) &&
      sigmaObsKmS <= NARROW_REF_FACTOR * star.sigmaRefKmS);
  const delta = feature.velocityKmS - star.velocityKmS;
  const sigmaDelta = Math.hypot(feature.sigmaKmS, star.sigmaKmS);
  const offset = Math.abs(delta) >= OFFSET_SIGMAS * sigmaDelta;
  const cls =
    narrow && offset
      ? 'interstellar-candidate'
      : !narrow && !offset
        ? 'stellar'
        : 'ambiguous';
  return {
    status: 'ok',
    class: cls,
    narrow,
    offset,
    deltaKmS: delta,
    sigmaDeltaKmS: sigmaDelta,
    sigmaObsKmS,
    sigmaLsfKmS: sigmaLsf,
    note: 'a class from width and velocity offset is evidence, never a proof; a narrow line at the star\'s own velocity can be stellar or interstellar',
  };
}
