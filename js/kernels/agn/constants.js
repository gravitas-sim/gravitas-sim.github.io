// =============================================================================
// AGN kernel: the constants of the Eddington luminosity (Prompt 252, AGN.md)
// -----------------------------------------------------------------------------
//   L_Edd = 4 pi G M m_p c / sigma_T
//
// G M_sun, m_p and sigma_T are NOT typed from memory: they are copied from tests/fixtures/agn/constants-source.json,
// which tools/agn-oracle/constants.py writes from the astropy.constants that is installed (its own reference string
// and uncertainty, read offline, nothing fetched). A test holds the three numbers below equal to that file. c is exact
// (the radiation kernel's). The module holds no value for the Eddington luminosity: it is derived here.
// Pure: no DOM, no clock.
// =============================================================================

import { C_LIGHT } from '../radiation/constants.js';

const { Math } = globalThis;

/** GM of the Sun in m^3 s^-2: the IAU nominal value as the pinned offline reading of astropy holds it. */
export const GM_SUN = 1.3271244e20;

/** The proton mass in kg, as the pinned offline reading of astropy gives it. */
export const M_PROTON_KG = 1.67262192369e-27;

/** The Thomson cross section in m^2, as the pinned offline reading of astropy gives it. */
export const SIGMA_THOMSON_M2 = 6.6524587321e-29;

/** The Eddington luminosity of one solar mass in W, DERIVED: 4 pi (GM_sun) m_p c / sigma_T. */
export const L_EDD_PER_MSUN_W =
  (4 * Math.PI * GM_SUN * M_PROTON_KG * C_LIGHT) / SIGMA_THOMSON_M2;

/** The provenance every Eddington result can cite. */
export const EDDINGTON_CONSTANTS = Object.freeze({
  derivation:
    'L_Edd = 4 pi G M m_p c / sigma_T, per solar mass with the IAU nominal GM_sun',
  status:
    'GM_sun, m_p and sigma_T are copied from tests/fixtures/agn/constants-source.json (an offline reading of the installed astropy constants, the edition its reference strings name), not typed and not verified by a fetch; c is exact',
});
