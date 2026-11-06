// =============================================================================
// The follow-up terms of Prompt 250 (250b; followup-thresholds.json R16 to R19)
// -----------------------------------------------------------------------------
// Three opt-in additions, each answering a finding of the first gate; every default is the first gate's
// behaviour, so the first gate's results are unchanged.
//
//  R16  the distance term of the light: the cluster redshift's own error, through L ~ D_L(z_c)^2.
//       d ln D_L / dz = 1/(1 + z) + (c / H0) / (E(z) D_C(z)) in a flat universe (closed form).
//  R17  the contamination flag on the dispersion's expected bias, b = (1/2)(N_b / n)(kappa^2/3 - 1),
//       raised when b exceeds half the dispersion's analytic relative error. An estimate that flags and
//       is never subtracted.
//  R18  the overdensity test for a field with no cluster: refuse when the exact Poisson upper tail of the
//       members in the window, against a field uniform in velocity over the extent, exceeds 0.001.
// =============================================================================

import { gammaP } from '../../statistics/index.js';
import { C_KMS } from './constants.js';

/** The probability a field uniform in velocity gives a window as full as the cluster's. */
export const OVERDENSITY_P_MAX = 0.001;

/** d ln D_L / dz for a flat cosmology made by createCosmology (comovingDistance in Mpc). */
export function dlnLuminosityDistanceDz(cosmo, z) {
  return (
    1 / (1 + z) + C_KMS / cosmo.H0 / (cosmo.E(z) * cosmo.comovingDistance(z))
  );
}

/** The statistical error of the cluster redshift: sd(z) / sqrt(n). */
export function clusterRedshiftSigma(zs) {
  const n = zs.length;
  const m = zs.reduce((s, v) => s + v, 0) / n;
  const sd = Math.sqrt(zs.reduce((s, v) => s + (v - m) ** 2, 0) / (n - 1));
  return sd / Math.sqrt(n);
}

/** The relative error of the light from the cluster redshift: 2 (d ln D_L / dz) sigma_zc. */
export const distanceRelSigma = (cosmo, zc, sigmaZc) =>
  2 * dlnLuminosityDistanceDz(cosmo, zc) * sigmaZc;

/** First-order fractional bias of the dispersion from N_b field galaxies in a window of kappa s. */
export const expectedBias = (nb, n, kappa) =>
  0.5 * (nb / n) * ((kappa * kappa) / 3 - 1);

/** Half the dispersion's own analytic relative error: the bias at which the flag is raised. */
export const biasFlagThreshold = n => 1 / (2 * Math.sqrt(2 * (n - 1)));

/** The exact Poisson upper tail P(X >= n | mu), n >= 1: the regularised lower incomplete gamma P(n, mu). */
export function poissonUpperTail(n, mu) {
  if (n <= 0) return 1;
  if (!(mu > 0)) return 0;
  return gammaP(n, mu);
}

/**
 * The overdensity test of R18.
 * @param {{nIn: number, nPre: number, halfWidthKms: number, extentKms: number|null}} p
 * @returns {{status: 'ok', mu: number, tail: number, refuse: boolean} | {status: 'unknown'}}
 */
export function overdensityTest({ nIn, nPre, halfWidthKms, extentKms }) {
  if (!(extentKms > 0)) return { status: 'unknown' };
  const mu = nPre * Math.min(1, halfWidthKms / extentKms);
  const tail = poissonUpperTail(nIn, mu);
  return { status: 'ok', mu, tail, refuse: tail > OVERDENSITY_P_MAX };
}
