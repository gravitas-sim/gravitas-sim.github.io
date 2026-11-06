// =============================================================================
// Constants and conventions of the galaxy-cluster kernel (Prompt 250)
// -----------------------------------------------------------------------------
// Every number here is a rule of tests/fixtures/clusters/thresholds.json (committed before the kernel
// existed) or a unit conversion from the tree. No published cluster value, projection factor, solar
// magnitude or tuning constant lives in this directory.
// =============================================================================

import { PARSEC_M } from '../../../constants.js';
import { C_KMS } from '../../cosmology/flrw.js';

export { C_KMS };

/** The tree's Mpc in metres. */
export const MPC_M = PARSEC_M * 1e6;

/** Rule R4: the clip level, in standard deviations, and the pass cap. */
export const KAPPA = 3;
export const MAX_PASSES = 10;

/** Rule R5: fewer members than this is 'not-constrained'. */
export const MIN_MEMBERS = 20;

/** Rule R9: the kurtosis flag at this many standard errors and the contamination flag at this share. */
export const GAUSSIAN_FLAG_SE = 3;
export const CONTAMINATION_FLAG = 0.1;

/** Rule R8 and R10: the bootstrap's default draw count (the statistics kernel's default). */
export const DRAWS = 1000;

export const DEGREES = Math.PI / 180;

export const SYNTHETIC_LABEL =
  'SYNTHETIC: an invented cluster with a truth manifest, not a measurement';

/** The result codes a refusal or a not-constrained answer can carry (D4). */
export const refused = (code, why) => ({ status: 'refused', code, why });
export const notConstrained = (code, why, extra = {}) => ({
  status: 'not-constrained',
  code,
  why,
  ...extra,
});
