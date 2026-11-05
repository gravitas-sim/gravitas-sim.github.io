// =============================================================================
// AGN kernel: a variability time scale and the light-crossing size bound (V1, V2)
// -----------------------------------------------------------------------------
// fastestTimescale   DERIVED  over pairs of epochs the fastest significant e-folding time, and a conservative upper form
// sizeBound          BOUND    R <= c tau delta / (1 + z): an upper limit on the size of one coherent varying region
//
// The pair statistic tau_ij = (t_j - t_i) / |ln(F_j / F_i)| over significant pairs; its minimum is the point estimate,
// and the minimum of the form with the log ratio lowered by kGuard sigma is what the size bound uses. Epoch times in
// days. Pure.
// =============================================================================

import { refused } from '../statistics/check.js';
import { C_LIGHT } from '../radiation/constants.js';

const { Math, Number } = globalThis;

/** The significance a pair's flux change must have (in sigmas of the difference). */
export const N_SIGMA = 5;
/** The guard subtracted from a pair's log flux ratio, in sigmas of that ratio, for the conservative form. */
export const K_GUARD = 3;
/** The fewest epochs a light curve needs. */
export const MIN_EPOCHS = 5;
/** The floor of the guarded log ratio (rule V1's tiny). */
export const TINY = 1e-12;
/** Seconds in a day. */
export const DAY_S = 86400;

/**
 * The fastest significant e-folding time of a light curve.
 * @param {{t: ArrayLike<number>, flux: ArrayLike<number>, sigma: ArrayLike<number>, nSigma?: number, kGuard?: number}} o
 */
export function fastestTimescale({
  t,
  flux,
  sigma,
  nSigma = N_SIGMA,
  kGuard = K_GUARD,
} = {}) {
  const n = t?.length ?? 0;
  if (!n || flux?.length !== n || sigma?.length !== n)
    return refused(
      'length-mismatch',
      'times, fluxes and errors must be arrays of one length'
    );
  if (n < MIN_EPOCHS)
    return refused(
      'too-few-epochs',
      `${n} epochs: at least ${MIN_EPOCHS} are required`
    );
  for (let i = 0; i < n; i++) {
    if (
      !Number.isFinite(t[i]) ||
      !Number.isFinite(flux[i]) ||
      !Number.isFinite(sigma[i])
    )
      return refused('not-finite', 'every time, flux and error must be finite');
    if (!(sigma[i] > 0))
      return refused('bad-error', 'every flux error must be positive');
    if (i && !(t[i] > t[i - 1]))
      return refused(
        'times-not-increasing',
        'the epoch times must be strictly increasing'
      );
  }
  let best = null;
  let bestUp = null;
  let significant = 0;
  for (let i = 0; i < n - 1; i++) {
    if (!(flux[i] > 0)) continue;
    for (let j = i + 1; j < n; j++) {
      if (!(flux[j] > 0)) continue;
      const diff = Math.abs(flux[j] - flux[i]);
      if (diff < nSigma * Math.hypot(sigma[i], sigma[j])) continue;
      significant++;
      const dt = t[j] - t[i];
      const lr = Math.abs(Math.log(flux[j] / flux[i]));
      const sl = Math.hypot(sigma[i] / flux[i], sigma[j] / flux[j]);
      const tau = dt / lr;
      const up = dt / Math.max(lr - kGuard * sl, TINY);
      if (!best || tau < best.tauDays)
        best = { tauDays: tau, i, j, sigmaTauDays: (tau * sl) / lr };
      if (!bestUp || up < bestUp.tauUpDays) bestUp = { tauUpDays: up, i, j };
    }
  }
  if (!best)
    return {
      status: 'not-constrained',
      code: 'no-significant-pair',
      why: `no pair of epochs differs by ${nSigma} sigma: the light curve shows no variability the errors allow, so no time scale and no size bound`,
      epochs: n,
    };
  return {
    status: 'ok',
    tauDays: best.tauDays,
    sigmaTauDays: best.sigmaTauDays,
    pair: [best.i, best.j],
    tauUpDays: bestUp.tauUpDays,
    pairUp: [bestUp.i, bestUp.j],
    significantPairs: significant,
    nSigma,
    kGuard,
    statement:
      'the point estimate is the minimum over significant pairs and is biased low by the selection; the conservative form lowers each pair’s log ratio by the guard and is the one the size bound uses',
  };
}

/**
 * The light-crossing size bound R <= c tau delta / (1 + z), in metres.
 * @param {{tauDays: number, z: number, delta?: number}} o
 */
export function sizeBound({ tauDays, z, delta = 1 } = {}) {
  if (!(tauDays > 0) || !Number.isFinite(tauDays))
    return refused(
      'bad-timescale',
      'the time scale must be positive and finite'
    );
  if (!Number.isFinite(z) || z < 0)
    return refused(
      'bad-redshift',
      'the redshift must be finite and not negative'
    );
  if (!(delta >= 1) || !Number.isFinite(delta))
    return refused(
      'bad-doppler',
      'the Doppler factor must be at least 1 (1 means no beaming)'
    );
  return {
    status: 'ok',
    kind: 'upper-bound',
    sign: 'R <=',
    sizeM: (C_LIGHT * tauDays * DAY_S * delta) / (1 + z),
    tauDays,
    z,
    delta,
    assumes: [
      'one coherent region varying as a whole',
      'the observed time scale is stretched by 1 + z, so the rest-frame time scale is tau / (1 + z)',
      delta === 1
        ? 'no relativistic beaming (the Doppler factor is 1)'
        : `the Doppler factor ${delta} stated by the caller`,
      'no gravitational lensing',
    ],
    statement:
      'an upper limit on the size of the region that varies, not its measured size: a region can be smaller than the light-crossing bound',
  };
}
