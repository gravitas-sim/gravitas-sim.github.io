// =============================================================================
// The transient-detection rule on difference-flux light curves, and its completeness
// -----------------------------------------------------------------------------
// THE RULE. A survey reports, at each epoch, the flux of a position after the
// reference image is subtracted (the difference flux) and its uncertainty. A new
// source is DETECTED when at least k epochs have difference flux of at least n
// sigma. (k = 2 guards against a single bad epoch; n = 5 is the customary
// threshold. Both are inputs.)
//
//   false alarm   P(at least k of N noise epochs reach n sigma) = I_p(k, N-k+1),
//                 p = 1 - Phi(n)   (the regularised incomplete beta, no
//                 cancellation)
//   detection     for epochs with mean flux mu_i and sigma_i each epoch succeeds
//                 with p_i = 1 - Phi(n - mu_i/sigma_i); the count of successes is
//                 Poisson-binomial and P(detect) is its upper tail (exact, by
//                 dynamic programming over the counts)
//   completeness  the fraction of INJECTED transients the rule detects, with the
//                 exact (Clopper-Pearson) binomial interval
//
// What this does not do: it works on light curves, not on difference images
// (subtraction, registration and the PSF are not modelled here; the injection
// kernels of the image pipeline are), it assumes independent Gaussian epochs, and
// it does not model a survey's real cadence gaps, weather or galaxy background.
// A completeness is a statement about the injected population under the rule, not
// about what a survey missed.
// =============================================================================

import { betaI, normalSf } from '../statistics/special.js';
import { gaussian, stream } from '../../random/streams.js';
import { finite, refuse } from './constants.js';

function checkRule(thresholdSigma, minDetections) {
  if (!(finite(thresholdSigma, 'thresholdSigma') > 0))
    refuse('bad-threshold', 'the threshold is positive sigma');
  if (!Number.isInteger(minDetections) || minDetections < 1)
    refuse('bad-k', 'k is an integer of at least 1');
}

/**
 * Apply the rule to one position's light curve.
 * @param {{epochs: {t: number, flux: number, sigma: number}[], thresholdSigma?: number, minDetections?: number}} p
 * @returns {{detected: boolean, nDetections: number, firstDetection: {t: number, snr: number}|null, peakSnr: number}}
 */
export function detectTransient({
  epochs,
  thresholdSigma = 5,
  minDetections = 2,
}) {
  checkRule(thresholdSigma, minDetections);
  if (!Array.isArray(epochs) || epochs.length < minDetections)
    refuse(
      'not-enough-epochs',
      `the rule needs at least ${minDetections} epochs`
    );
  let n = 0;
  let first = null;
  let peak = -Infinity;
  for (const e of epochs) {
    finite(e.flux, 'flux');
    if (!(finite(e.sigma, 'sigma') > 0))
      refuse('bad-sigma', "an epoch's uncertainty is positive");
    const snr = e.flux / e.sigma;
    if (snr > peak) peak = snr;
    if (snr >= thresholdSigma) {
      n++;
      if (!first) first = { t: e.t, snr };
    }
  }
  const detected = n >= minDetections;
  return {
    detected,
    nDetections: n,
    firstDetection: detected ? first : null,
    peakSnr: peak,
  };
}

/** P(Binomial(N, p) >= k) as a regularised incomplete beta (k >= 1). */
const binomialTail = (N, k, p) =>
  k > N ? 0 : k <= 0 ? 1 : betaI(p, k, N - k + 1);

/**
 * The probability that pure noise passes the rule: at least k of `epochs` reach the threshold.
 * @param {{epochs: number, thresholdSigma?: number, minDetections?: number}} p
 */
export function falseAlarmProbability({
  epochs,
  thresholdSigma = 5,
  minDetections = 2,
}) {
  checkRule(thresholdSigma, minDetections);
  if (!Number.isInteger(epochs) || epochs < minDetections)
    refuse(
      'not-enough-epochs',
      `the rule needs at least ${minDetections} epochs`
    );
  return binomialTail(epochs, minDetections, normalSf(thresholdSigma));
}

/**
 * The exact probability that a transient with known mean fluxes passes the rule.
 * @param {{means: number[], sigmas: number[]|number, thresholdSigma?: number, minDetections?: number}} p
 */
export function detectionProbability({
  means,
  sigmas,
  thresholdSigma = 5,
  minDetections = 2,
}) {
  checkRule(thresholdSigma, minDetections);
  if (!Array.isArray(means) || means.length < minDetections)
    refuse(
      'not-enough-epochs',
      `the rule needs at least ${minDetections} epochs`
    );
  const sig = Array.isArray(sigmas) ? sigmas : means.map(() => sigmas);
  if (sig.length !== means.length)
    refuse('bad-sigma', 'one uncertainty per epoch');
  // pmf over the number of successes
  let pmf = [1];
  means.forEach((mu, i) => {
    finite(mu, 'mean');
    if (!(finite(sig[i], 'sigma') > 0))
      refuse('bad-sigma', "an epoch's uncertainty is positive");
    const p = normalSf(thresholdSigma - mu / sig[i]);
    const next = new Array(pmf.length + 1).fill(0);
    for (let j = 0; j < pmf.length; j++) {
      next[j] += pmf[j] * (1 - p);
      next[j + 1] += pmf[j] * p;
    }
    pmf = next;
  });
  let tail = 0;
  for (let j = pmf.length - 1; j >= minDetections; j--) tail += pmf[j];
  return Math.min(1, tail);
}

/** The x with f(x) = p by bisection on [0, 1] (f increasing). */
function invert(f, p) {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 200; i++) {
    const mid = 0.5 * (lo + hi);
    if (mid === lo || mid === hi) break;
    if (f(mid) < p) lo = mid;
    else hi = mid;
  }
  return 0.5 * (lo + hi);
}

/**
 * The exact (Clopper and Pearson 1934) two-sided interval for k successes in n trials; its coverage is at least
 * `level` at every true probability.
 */
export function binomialInterval(k, n, level = 0.95) {
  if (!Number.isInteger(k) || !Number.isInteger(n) || k < 0 || n < 1 || k > n)
    refuse('bad-counts', 'k of n with 0 <= k <= n');
  const a = 1 - level;
  return {
    lo: k === 0 ? 0 : invert(x => betaI(x, k, n - k + 1), a / 2),
    hi: k === n ? 1 : invert(x => betaI(x, k + 1, n - k), 1 - a / 2),
    level,
    method: 'clopper-pearson',
  };
}

/**
 * Completeness by injection: draw noisy light curves around a known flux sequence and count the rule's detections.
 * @param {object} p
 * @param {{t: number, flux: number}[]} p.truth - the injected transient's mean flux at each epoch
 * @param {number} p.sigma - the (constant) difference-flux uncertainty
 * @param {number} p.trials
 * @param {string|number} p.seed
 * @param {string} [p.label] - forks the random stream so cells do not share draws
 * @param {number} [p.thresholdSigma=5]
 * @param {number} [p.minDetections=2]
 * @param {number} [p.level=0.95]
 * @returns {{detected: number, trials: number, fraction: number, interval: object, analytic: number}}
 */
export function injectionCompleteness({
  truth,
  sigma,
  trials,
  seed,
  label = 'cell',
  thresholdSigma = 5,
  minDetections = 2,
  level = 0.95,
}) {
  if (!Number.isInteger(trials) || trials < 1)
    refuse('bad-counts', 'trials is a positive integer');
  const draw = gaussian(stream('injection', seed, label));
  let detected = 0;
  for (let i = 0; i < trials; i++) {
    const epochs = truth.map(e => ({
      t: e.t,
      flux: e.flux + sigma * draw(),
      sigma,
    }));
    if (detectTransient({ epochs, thresholdSigma, minDetections }).detected)
      detected++;
  }
  return {
    detected,
    trials,
    fraction: detected / trials,
    interval: binomialInterval(detected, trials, level),
    analytic: detectionProbability({
      means: truth.map(e => e.flux),
      sigmas: sigma,
      thresholdSigma,
      minDetections,
    }),
  };
}
