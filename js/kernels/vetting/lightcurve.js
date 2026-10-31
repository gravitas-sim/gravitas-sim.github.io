// =============================================================================
// Odd-even depths and the secondary-eclipse search (Prompt 228, VETTING.md)
// -----------------------------------------------------------------------------
// Two tests of a candidate's light curve at a given ephemeris. Each returns a
// verdict (pass, fail, inconclusive), the reason, and the numbers behind it
// with their uncertainties; the thresholds are js/kernels/vetting/constants.js's
// and the verdict carries any other it was given.
//
//   odd-even   D_odd - D_even over its uncertainty. An eclipsing binary of two
//              unequal stars, taken at half its period, alternates deep and
//              shallow eclipses; a planet's transits do not. Fails at zFail
//              sigma; passes only when the test could have seen a difference of
//              detectFraction of the depth (otherwise: inconclusive, 'low-power').
//   secondary  the depth at phase 0.5 (or the phase given), where a binary's
//              second eclipse would be. A planet's own light is a small share of
//              the primary; fails when a detected secondary is deeper than
//              binaryRatio of it; passes only when the test could have seen one
//              that deep.
//
// A passed test rules out some false positives and leaves the rest. It is not
// evidence that the candidate is a planet (VETTING.md, "What a pass means").
// =============================================================================

import { DEFAULTS } from './constants.js';
import { boxDepth, checkSeries } from './depth.js';

const { Math } = globalThis;

const merge = o => ({ ...DEFAULTS, ...(o ?? {}) });

const pick = b => ({
  depth: b.depth,
  sigma: b.sigma,
  beta: b.beta,
  cycles: b.cycles,
});

/**
 * @param {{t: ArrayLike<number>, y: ArrayLike<number>, dy?: ArrayLike<number>}} s
 * @param {{P: number, t0: number, duration: number}} eph
 * @param {object} [options] - overrides of DEFAULTS
 */
export function oddEvenTest(s, eph, options) {
  checkSeries(s, eph);
  const T = merge(options);
  const odd = boxDepth(s, eph, { select: c => Math.abs(c) % 2 === 1 });
  const even = boxDepth(s, eph, { select: c => Math.abs(c) % 2 === 0 });
  const out = {
    test: 'odd-even',
    verdict: 'inconclusive',
    reason: 'too-few-transits',
    odd: odd && pick(odd),
    even: even && pick(even),
    difference: NaN,
    sigma: NaN,
    z: NaN,
    meanDepth: NaN,
    minDetectableDifference: NaN,
    thresholds: { zFail: T.zFail, detectFraction: T.detectFraction },
  };
  if (
    !odd ||
    !even ||
    odd.cycles < T.minTransitsPerParity ||
    even.cycles < T.minTransitsPerParity
  )
    return out;
  out.difference = odd.depth - even.depth;
  out.sigma = Math.hypot(odd.sigma, even.sigma);
  out.z = Math.abs(out.difference) / out.sigma;
  out.meanDepth = (odd.depth + even.depth) / 2;
  out.minDetectableDifference = T.zFail * out.sigma;
  const sigmaMean = out.sigma / 2;
  if (!(out.meanDepth >= T.minDepthSnr * sigmaMean)) out.reason = 'no-signal';
  else if (out.z >= T.zFail) {
    out.verdict = 'fail';
    out.reason = 'depths-differ';
  } else if (out.minDetectableDifference > T.detectFraction * out.meanDepth)
    out.reason = 'low-power';
  else {
    out.verdict = 'pass';
    out.reason = 'depths-agree';
  }
  return out;
}

/**
 * The secondary-eclipse search.
 * @param {object} s
 * @param {{P: number, t0: number, duration: number}} eph
 * @param {object} [options] - overrides of DEFAULTS, and `phase` (0.5)
 */
export function secondaryTest(s, eph, options) {
  checkSeries(s, eph);
  const T = merge(options);
  const phase = options?.phase ?? 0.5;
  const prim = boxDepth(s, eph);
  const sec = boxDepth(s, eph, { phase });
  const out = {
    test: 'secondary',
    verdict: 'inconclusive',
    reason: 'no-coverage',
    phase,
    primary: prim && pick(prim),
    secondary: sec && pick(sec),
    depth: NaN,
    sigma: NaN,
    upperLimit: NaN,
    ratio: NaN,
    thresholds: { zDetect: T.zDetect, binaryRatio: T.binaryRatio },
    assumes: 'the secondary is at the phase searched (0.5 is a circular orbit)',
  };
  if (!sec || sec.cycles < T.minTransitsPerParity) return out;
  out.depth = sec.depth;
  out.sigma = sec.sigma;
  out.upperLimit = T.zDetect * sec.sigma;
  if (!prim || !(prim.depth >= T.minDepthSnr * prim.sigma)) {
    out.reason = 'no-signal';
    return out;
  }
  out.ratio = sec.depth / prim.depth;
  const detected = sec.depth >= T.zDetect * sec.sigma;
  if (detected && out.ratio > T.binaryRatio) {
    out.verdict = 'fail';
    out.reason = 'deep-secondary';
  } else if (detected) {
    out.verdict = 'pass';
    out.reason = 'detected-below-limit';
  } else if (out.upperLimit > T.binaryRatio * prim.depth)
    out.reason = 'low-power';
  else {
    out.verdict = 'pass';
    out.reason = 'not-detected';
  }
  return out;
}
