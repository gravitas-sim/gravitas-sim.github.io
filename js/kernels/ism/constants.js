// =============================================================================
// ISM kernel: the classical electron radius and the column-density constant
// -----------------------------------------------------------------------------
// The linear part of the curve of growth. An absorption line of equivalent
// width W (a length) from N absorbers per unit area with oscillator strength f,
// optically thin, has
//
//   W / lambda = (pi e^2 / (m_e c^2)) (N f lambda) = pi r_e N f lambda,
//   N = W / (pi r_e f lambda^2),
//
// with r_e = e^2 / (4 pi eps0 m_e c^2) = alpha h / (2 pi m_e c), the classical
// electron radius. h and c are exact. The fine-structure constant and the
// electron mass are NOT typed from memory: they are copied from
// tests/fixtures/ism/constants-source.json, which tools/ism-oracle/constants.py
// writes from the astropy.constants that is installed (its own reference
// string and uncertainty, read offline, nothing fetched). A test holds the two
// numbers below equal to that file. The module holds no value for r_e: it is
// derived here, and so is every number that uses it.
//
// Pure: no DOM, no clock.
// =============================================================================

import { H_PLANCK, C_LIGHT } from '../radiation/constants.js';

const { Math } = globalThis;

/** The fine-structure constant, as the pinned offline reading of astropy gives it. */
export const ALPHA_FS = 0.0072973525693;

/** The electron mass in kg, as the pinned offline reading of astropy gives it. */
export const M_ELECTRON_KG = 9.1093837015e-31;

/** The classical electron radius in m, DERIVED: alpha h / (2 pi m_e c). */
export const ELECTRON_RADIUS_M =
  (ALPHA_FS * H_PLANCK) / (2 * Math.PI * M_ELECTRON_KG * C_LIGHT);

/** The classical electron radius in cm. */
export const ELECTRON_RADIUS_CM = ELECTRON_RADIUS_M * 100;

/** The provenance every column-density result can cite. */
export const COLUMN_CONSTANT = Object.freeze({
  electronRadiusCm: ELECTRON_RADIUS_CM,
  derivation: 'r_e = alpha h / (2 pi m_e c); N = W / (pi r_e f lambda^2)',
  alpha: ALPHA_FS,
  electronMassKg: M_ELECTRON_KG,
  status:
    'alpha and m_e are copied from tests/fixtures/ism/constants-source.json (an offline reading of the installed astropy constants, the CODATA edition its reference string names), not typed and not verified by a fetch; h and c are exact',
});

/**
 * The column density of an optically thin line, cm^-2, from its equivalent width and wavelength in one length unit
 * (nm here) and an oscillator strength. No default for f.
 * @param {number} widthNm - Equivalent width, nm (positive for absorption)
 * @param {number} lambdaNm - Rest wavelength, nm
 * @param {number} f - Oscillator strength
 */
export const columnFromWidth = (widthNm, lambdaNm, f) =>
  (widthNm / (lambdaNm * lambdaNm) / (Math.PI * ELECTRON_RADIUS_CM * f)) * 1e7;

/**
 * The peak optical depth of a Gaussian line of column density N (cm^-2), oscillator strength f, rest wavelength
 * lambdaNm and velocity dispersion sigmaKmS (the line's intrinsic one): tau0 = pi r_e N f lambda^2 / (sigma_lambda sqrt(2 pi))
 * with sigma_lambda = lambda sigma_v / c.
 */
export function peakOpticalDepth(N, f, lambdaNm, sigmaKmS) {
  const lambdaCm = lambdaNm * 1e-7;
  const sigmaLambdaCm = (lambdaCm * sigmaKmS * 1000) / C_LIGHT;
  return (
    (Math.PI * ELECTRON_RADIUS_CM * N * f * lambdaCm * lambdaCm) /
    (sigmaLambdaCm * Math.sqrt(2 * Math.PI))
  );
}

/** The inverse of peakOpticalDepth: the column density that gives a peak optical depth tau0. */
export const columnFromPeakDepth = (tau0, f, lambdaNm, sigmaKmS) =>
  tau0 / peakOpticalDepth(1, f, lambdaNm, sigmaKmS);
