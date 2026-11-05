// =============================================================================
// ISM kernel: the Balmer decrement and the reddening it gives (S8)
// -----------------------------------------------------------------------------
// The observed ratio R of two hydrogen line fluxes against the intrinsic ratio R0
// (a recombination value the CALLER states, with its source and conditions: there
// is no default, a typed one would be a published number from memory) gives the
// colour excess through an extinction law:
//
//   R = R0 10^(-0.4 (k1 - k2) E),   k(lambda) = A(lambda) / E(B-V) = R_V A(lambda)/A(V)
//   E(B-V) = 2.5 log10(R / R0) / (k2 - k1)           line 1 in the numerator
//
// The law is the CCM89 one the radiation kernel holds (the law object is passed in);
// R_V is a required input. Assumes a uniform foreground screen of dust and no
// underlying stellar absorption in the lines (both biases are reported, R1).
// =============================================================================

import { refused } from '../statistics/check.js';
import { covarianceInterval } from '../statistics/intervals.js';
import { extinctionRatio } from '../radiation/extinction.js';

const { Math, Number } = globalThis;

/** A line needs this signal-to-noise (flux over its error) to enter a decrement. */
export const MIN_LINE_SNR = 5;

const kOf = (lambdaNm, RV, law) => RV * extinctionRatio(lambdaNm, RV, law);

/**
 * The colour excess from a pair of hydrogen lines.
 * @param {object} o
 * @param {{lambdaNm: number, flux: number, sigma: number}} o.numerator - the line the intrinsic ratio puts on top (H-alpha)
 * @param {{lambdaNm: number, flux: number, sigma: number}} o.denominator - the other (H-beta)
 * @param {{ratio: number, source: string, conditions?: string}} o.intrinsic
 * @param {number} o.RV
 * @param {object} o.law - the extinction pack's LAW
 */
export function balmerDecrement({ numerator, denominator, intrinsic, RV, law } = {}) {
  if (!intrinsic || !(intrinsic.ratio > 0))
    return refused(
      'missing-intrinsic-ratio',
      'the intrinsic ratio is an input with a source; there is no default'
    );
  if (typeof intrinsic.source !== 'string' || !intrinsic.source.trim())
    return refused('missing-source', 'the intrinsic ratio needs a source string');
  if (!(Number.isFinite(RV) && RV > 0))
    return refused('missing-RV', 'R_V is an input; there is no default');
  if (!law) return refused('missing-law', 'the extinction law is required');
  for (const l of [numerator, denominator]) {
    if (!l || !(l.flux > 0) || !Number.isFinite(l.flux) || !(l.sigma > 0))
      return refused('bad-flux', 'each line needs a positive flux and a positive error');
    if (l.flux / l.sigma < MIN_LINE_SNR)
      return refused(
        'low-signal',
        `a line is under ${MIN_LINE_SNR} sigma: a decrement from it is noise`
      );
  }
  const k1 = kOf(numerator.lambdaNm, RV, law);
  const k2 = kOf(denominator.lambdaNm, RV, law);
  if (!Number.isFinite(k1) || !Number.isFinite(k2))
    return refused(
      'outside-law',
      'a line lies outside the extinction law (0.3 to 8 per micron): the law is not extrapolated'
    );
  if (!(k2 - k1 > 0))
    return refused(
      'no-lever-arm',
      'the numerator line must be redder than the denominator line'
    );
  const R = numerator.flux / denominator.flux;
  const ebv = (2.5 * Math.log10(R / intrinsic.ratio)) / (k2 - k1);
  const sigma =
    ((2.5 / Math.LN10) / (k2 - k1)) *
    Math.hypot(numerator.sigma / numerator.flux, denominator.sigma / denominator.flux);
  const interval = covarianceInterval(ebv, sigma);
  const flags = [];
  if (R < intrinsic.ratio) flags.push('below-intrinsic');
  const noReddening = interval.lo <= 0 && interval.hi >= 0;
  return {
    status: 'ok',
    ebv,
    sigma,
    interval,
    ratio: R,
    kNumerator: k1,
    kDenominator: k2,
    RV,
    law: law.law,
    intrinsic: { ...intrinsic },
    flags,
    noReddeningDetected: noReddening,
    note: noReddening
      ? 'no reddening detected: the one-sigma interval contains zero'
      : ebv < 0
        ? 'a negative excess is not physical: check the intrinsic ratio, the line fluxes and underlying stellar absorption'
        : 'a uniform foreground screen of dust and no underlying stellar absorption are assumed',
    assumes:
      'a uniform foreground dust screen; the stated intrinsic ratio; no underlying stellar absorption; independent flux errors',
  };
}

/**
 * The flux of a line corrected for the reddening: F 10^(0.4 k E(B-V)), with the uncertainty from E(B-V) alone.
 * @param {{flux: number, lambdaNm: number, ebv: number, sigmaEbv?: number, RV: number, law: object}} o
 */
export function deredden({ flux, lambdaNm, ebv, sigmaEbv = 0, RV, law } = {}) {
  if (!(Number.isFinite(RV) && RV > 0))
    return refused('missing-RV', 'R_V is an input; there is no default');
  const k = kOf(lambdaNm, RV, law);
  if (!Number.isFinite(k))
    return refused('outside-law', 'the wavelength lies outside the extinction law');
  const factor = 10 ** (0.4 * k * ebv);
  return {
    status: 'ok',
    flux: flux * factor,
    factor,
    k,
    sigmaFactor: factor * 0.4 * Math.LN10 * k * sigmaEbv,
  };
}
