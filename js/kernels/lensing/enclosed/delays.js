// =============================================================================
// SPIKE (Prompt 251 Part B, never merged): the time-delay model and the conditional Hubble constant
// -----------------------------------------------------------------------------
// The Fermat potential for an SIS with a uniform sheet,
//   tau(theta) = (D_dt / c) [ (theta - beta)^2 / 2 - theta_E |theta| - kappa_s theta^2 / 2 ],
//   D_dt = (1 + z_l) D_l D_s / D_ls,
// the images (the roots of beta = (1 - kappa_s) theta - theta_E sign theta), the delay between them (the inner
// image, nearer the lens, arrives later), the mass-sheet transformation, and `hubbleFromDelay`, which
// returns a Hubble constant only with a stated external convergence (gate-thresholds.json, models).
// =============================================================================

import { C_SI } from '../../../constants.js';
import { GYR_PER_INV_H0 } from '../../cosmology/flrw.js';
import { pointImages } from '../lens.js';
import { MPC_M, lensDistances } from './distances.js';
import { normalQuantile } from '../../statistics/special.js';
import { G_SI } from '../../../constants.js';

/** The metre of a Mpc the cosmology kernel's own Gyr scale implies (AM1): derived, not typed. */
export const MPC_EXACT_M = GYR_PER_INV_H0 * 365.25 * 86400 * 1e9 * 1e3;

/** The time-delay distance (metres) from the distances and the lens redshift. */
export const timeDelayDistance = ({ dl, ds, dls, zl }) =>
  ((1 + zl) * dl * ds) / dls;

/** Distances with the cosmology kernel's exact Mpc (AM1) or, with exact false, the tree's rounded parsec. */
export function delayDistances({ zl, zs, cosmology, exact = true }) {
  const d = lensDistances({ zl, zs, cosmology });
  if (d.status !== 'ok') return d;
  const k = exact ? MPC_EXACT_M / MPC_M : 1;
  return {
    ...d,
    dl: d.dl * k,
    ds: d.ds * k,
    dls: d.dls * k,
    ddt: timeDelayDistance({ dl: d.dl * k, ds: d.ds * k, dls: d.dls * k, zl }),
  };
}

/** The mass-sheet transformation of an SIS (thetaE, beta): the lens with the same images. */
export const massSheetTransform = ({ thetaE, beta, lambda }) => ({
  thetaE: lambda * thetaE,
  kappaS: 1 - lambda,
  beta: lambda * beta,
});

/** The Fermat potential in angle squared (dimensionless factor of the delay). */
export const fermatPotential = (theta, { thetaE, beta, kappaS = 0 }) =>
  (theta - beta) ** 2 / 2 -
  thetaE * Math.abs(theta) -
  (kappaS * theta * theta) / 2;

/** The two images of an SIS with a sheet; null when beta >= theta_E (one image) or the lens is not a lens (kappa_s >= 1). */
export function sheetImages({ thetaE, beta, kappaS = 0 }) {
  const g = 1 - kappaS;
  if (!(g > 0) || !(beta < thetaE) || !(beta >= 0)) return null;
  const plus = (beta + thetaE) / g;
  const minus = (beta - thetaE) / g;
  return { theta: [plus, minus], mu: [plus / (g * beta), minus / (g * beta)] };
}

/**
 * The delay (seconds) between the two images, inner minus outer, from the Fermat potentials, for a time-delay
 * distance ddt (metres).
 */
export function sisSheetDelay({ thetaE, beta, kappaS = 0, ddt }) {
  const im = sheetImages({ thetaE, beta, kappaS });
  if (!im) return { status: 'refused', code: 'single-image' };
  const p = { thetaE, beta, kappaS };
  const delayS =
    (ddt / C_SI) *
    (fermatPotential(im.theta[1], p) - fermatPotential(im.theta[0], p));
  return { status: 'ok', delayS, images: im.theta, mu: im.mu };
}

/** The point-lens delay from the Fermat potential at the two roots (seconds). */
export function pointDelayFermat({ massKg, y, zl = 0 }) {
  const im = pointImages(y).x;
  const phi = x => (x - y) ** 2 / 2 - Math.log(Math.abs(x));
  return (
    (1 + zl) * ((4 * G_SI * massKg) / C_SI ** 3) * (phi(im[1]) - phi(im[0]))
  );
}

/**
 * H0 from one delay, conditional on the lens model (the SIS with no sheet) and the other cosmological parameters:
 * D_dt scales as 1 / H0, so H0 = H0_ref * delay_model(H0_ref) / delay_observed.
 */
export function hubbleConditional({
  delayS,
  thetaE,
  beta,
  zl,
  zs,
  cosmology,
  exact = true,
}) {
  const d = delayDistances({ zl, zs, cosmology, exact });
  if (d.status !== 'ok') return d;
  const m = sisSheetDelay({ thetaE, beta, kappaS: 0, ddt: d.ddt });
  if (m.status !== 'ok') return m;
  return { status: 'ok', h0Model: (cosmology.H0 * m.delayS) / delayS };
}

/**
 * The Hubble constant from a delay, with the mass-sheet degeneracy stated. Without an external convergence
 * (`kappaExt` {value, sigma, source}) the value is null and the scaling law is returned; with one, the value is
 * (1 - kappa_ext) H0_model with a relative sigma from the delay's relative error and the convergence's.
 */
export function hubbleFromDelay({
  delayS,
  sigmaDelayRel,
  thetaE,
  beta,
  zl,
  zs,
  cosmology,
  kappaExt,
  level = 0.68,
  exact = true,
}) {
  const c = hubbleConditional({
    delayS,
    thetaE,
    beta,
    zl,
    zs,
    cosmology,
    exact,
  });
  if (c.status !== 'ok') return c;
  const law = 'H0_true = (1 - kappa_ext) * H0_model';
  const k = kappaExt;
  if (
    !k ||
    !Number.isFinite(k.value) ||
    !(k.sigma >= 0) ||
    typeof k.source !== 'string' ||
    !k.source
  )
    return {
      status: 'degenerate',
      code: 'mass-sheet-degenerate',
      value: null,
      h0Model: c.h0Model,
      law,
    };
  const value = (1 - k.value) * c.h0Model;
  const z = normalQuantile((1 + level) / 2);
  const rel = Math.hypot(sigmaDelayRel, k.sigma / (1 - k.value));
  return {
    status: 'ok',
    value,
    h0Model: c.h0Model,
    law,
    relSigma: rel,
    interval: {
      lo: value * (1 - z * rel),
      hi: value * (1 + z * rel),
      level,
      z,
    },
    terms: { delay: sigmaDelayRel, kappaExt: k.sigma / (1 - k.value) },
  };
}
