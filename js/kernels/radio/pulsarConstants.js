// =============================================================================
// Pulsar kernel: the dispersion constant and where it comes from
// -----------------------------------------------------------------------------
// A radio pulse crossing cold, unmagnetised plasma arrives later at a lower
// frequency: t(f) = K DM / f^2, with DM = integral of n_e dl and, in SI,
//
//   K = e^2 / (8 pi^2 eps0 m_e c) = (e^2 / (4 pi eps0)) / (2 pi m_e c)
//     = alpha h / (4 pi^2 m_e)          (e^2 / (4 pi eps0) = alpha hbar c).
//
// h is exact. The two measured inputs, the fine-structure constant and the
// electron mass, are NOT typed from memory: they are copied from
// tests/fixtures/pulsars/constants-source.json, which tools/pulsar-oracle/
// constants.py writes from the astropy.constants that is installed (its own
// reference string and uncertainty, read offline, nothing fetched). A test holds
// the two numbers below equal to that file. The library's reference names an
// edition of the constants that may not be the current one; the effect on K is
// of order 1e-9 and is far below the measurement's use here, and the kernel says
// so in `DISPERSION.status`.
//
// K is a physical constant; a pulsar-timing package may adopt a rounded
// conventional value for it instead, which differs from this one at the level a
// tenth of a percent can matter for a DM. Every kernel function takes the
// constant as an option and every result names the constant it used.
//
// Pure: no DOM, no clock.
// =============================================================================

import { H_PLANCK } from './constants.js';
import { PC_M } from '../radiation/constants.js';

/** The fine-structure constant, as the pinned offline reading of astropy gives it. */
export const ALPHA_FS = 0.0072973525693;

/** The electron mass in kg, as the pinned offline reading of astropy gives it. */
export const M_ELECTRON_KG = 9.1093837015e-31;

/** K in SI: m^2 / s (the delay is K DM / f^2 with DM in m^-2 and f in Hz). */
export const DISPERSION_SI =
  (ALPHA_FS * H_PLANCK) / (4 * Math.PI * Math.PI * M_ELECTRON_KG);

/**
 * K in seconds times MHz^2 per (pc / cm^3): the form every function below uses.
 * One pc/cm3 is PC_M * 1e6 electrons per m^2, and 1 / Hz^2 = 1e-12 / MHz^2.
 */
export const DISPERSION_CONSTANT = (DISPERSION_SI * PC_M * 1e6) / 1e12;

/** The provenance every result can cite. */
export const DISPERSION = Object.freeze({
  constant: DISPERSION_CONSTANT,
  unit: 's MHz^2 / (pc cm^-3)',
  derivation:
    'K = alpha h / (4 pi^2 m_e), times the parsec in metres and 1e6 per cm3 over 1e12',
  alpha: ALPHA_FS,
  electronMassKg: M_ELECTRON_KG,
  status:
    'alpha and m_e are copied from tests/fixtures/pulsars/constants-source.json (an offline reading of the installed astropy constants, CODATA edition as its reference says), not typed and not verified by a fetch; a timing package may use a rounded conventional constant instead (PULSARS.md)',
});
