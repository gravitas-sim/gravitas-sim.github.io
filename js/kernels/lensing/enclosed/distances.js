// =============================================================================
// Lens distances from redshifts, and the critical surface density (Prompt 251)
// -----------------------------------------------------------------------------
// The thin-lens relations need three angular-diameter distances, D_l (observer to lens), D_s (observer
// to source) and D_ls (lens to source). In a flat universe
//   D_l = D_M(z_l) / (1 + z_l),  D_s = D_M(z_s) / (1 + z_s),  D_ls = (D_M(z_s) - D_M(z_l)) / (1 + z_s)
// with D_M the comoving distance of the cosmology kernel (js/kernels/cosmology/flrw.js). D_ls is not
// D_s - D_l once the universe expands, which is what the Galaxy-scale lens of lens.js may assume.
//
// Refusals (R7, R8 of the contract): a missing, non-finite or non-positive redshift is
// 'not-constrained' (no redshift is ever assumed); a source not behind the lens, a non-flat universe,
// a non-positive H0 and a negative density are 'refused'. Metres inside; the Mpc is the tree's parsec
// times 1e6.
// =============================================================================

import { C_SI, G_SI, PARSEC_M } from '../../../constants.js';
import { createCosmology } from '../../cosmology/flrw.js';

export const MPC_M = PARSEC_M * 1e6;

const usable = z => typeof z === 'number' && Number.isFinite(z) && z > 0;

/**
 * Distances (metres) for a lens at zl and a source at zs.
 * @param {{zl?: number, zs?: number, cosmology: {H0: number, Om: number, OL: number}}} p
 * @returns {{status: 'ok', zl: number, zs: number, dl: number, ds: number, dls: number} |
 *   {status: 'not-constrained' | 'refused', code: string}}
 */
export function lensDistances({ zl, zs, cosmology }) {
  if (!usable(zl))
    return { status: 'not-constrained', code: 'no-lens-redshift' };
  if (!usable(zs))
    return { status: 'not-constrained', code: 'no-source-redshift' };
  const { H0, Om, OL } = cosmology ?? {};
  if (![H0, Om, OL].every(Number.isFinite) || !(H0 > 0) || Om < 0 || OL < 0)
    return { status: 'refused', code: 'bad-cosmology' };
  if (Math.abs(Om + OL - 1) > 1e-9)
    return { status: 'refused', code: 'non-flat-cosmology' };
  if (!(zs > zl)) return { status: 'refused', code: 'source-not-behind-lens' };
  const c = createCosmology({ H0, Om, OL });
  const ml = c.transverseComovingDistance(zl);
  const ms = c.transverseComovingDistance(zs);
  return {
    status: 'ok',
    zl,
    zs,
    dl: (ml / (1 + zl)) * MPC_M,
    ds: (ms / (1 + zs)) * MPC_M,
    dls: ((ms - ml) / (1 + zs)) * MPC_M,
  };
}

/**
 * The critical surface density c^2 D_s / (4 pi G D_l D_ls), kg per square metre: the projected mass
 * density at which a lens of that density everywhere would focus the source to a point.
 */
export const sigmaCritical = (dl, ds, dls) =>
  (C_SI * C_SI * ds) / (4 * Math.PI * G_SI * dl * dls);
