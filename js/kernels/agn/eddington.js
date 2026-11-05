// =============================================================================
// AGN kernel: the Eddington luminosity and the mass it bounds (E1)
// -----------------------------------------------------------------------------
// eddingtonLuminosity   DERIVED  4 pi G M m_p c / sigma_T from the pinned constants
// eddingtonMassBound    BOUND    M >= L_bol / L_Edd(1 M_sun): a LOWER bound, never an estimate of the mass
// eddingtonRatio        DERIVED  L_bol / L_Edd(M) for a mass the caller supplies
//
// The bound holds for a steadily radiating, spherically symmetric, ionised-hydrogen source whose luminosity does not
// exceed the Eddington value; it says nothing about how far above the bound the true mass lies. Pure.
// =============================================================================

import { refused } from '../statistics/check.js';
import { L_EDD_PER_MSUN_W } from './constants.js';
import { ONE_SIDED_95 } from './luminosity.js';

const { Number } = globalThis;

/** The assumptions every bound carries. */
export const EDDINGTON_ASSUMES = Object.freeze([
  'radiation pressure on free electrons only (electron scattering, the Thomson cross section)',
  'steady emission: the luminosity is not a flare that outran the accretion',
  'spherical symmetry: no beaming, no disc geometry',
  'fully ionised hydrogen (the proton mass per electron)',
  'the bolometric luminosity does not exceed the Eddington value of the true mass',
]);

/**
 * The Eddington luminosity in W of a mass in solar masses.
 * @param {number} massSolar
 */
export function eddingtonLuminosity(massSolar) {
  if (!(massSolar > 0) || !Number.isFinite(massSolar))
    return refused('bad-mass', 'the mass must be positive and finite');
  return { status: 'ok', luminosityW: massSolar * L_EDD_PER_MSUN_W, massSolar };
}

/**
 * The mass a source must exceed to radiate at its luminosity without exceeding the Eddington limit.
 * From a bolometric result (its lower limit at 95 percent one-sided) or from a luminosity with a linear error.
 * @param {{bolometric?: object, luminosityW?: number, sigmaW?: number}} o
 */
export function eddingtonMassBound({
  bolometric,
  luminosityW,
  sigmaW = 0,
} = {}) {
  let L;
  let lower;
  let how;
  if (bolometric) {
    if (bolometric.status !== 'ok')
      return refused(
        'no-luminosity',
        'a bolometric luminosity result is required'
      );
    L = bolometric.luminosityW;
    lower = bolometric.lowerLimit95W;
    how =
      'the lower limit of the log-normal luminosity at one-sided 95 percent (total sigma)';
  } else {
    if (!(luminosityW > 0) || !Number.isFinite(luminosityW))
      return refused(
        'bad-luminosity',
        'the luminosity must be positive and finite'
      );
    if (!(sigmaW >= 0) || !Number.isFinite(sigmaW))
      return refused('bad-error', 'the luminosity error must not be negative');
    L = luminosityW;
    lower = luminosityW - ONE_SIDED_95 * sigmaW;
    how = 'the lower limit of a normal luminosity at one-sided 95 percent';
    if (!(lower > 0))
      return {
        status: 'not-constrained',
        code: 'no-lower-limit',
        why: 'the luminosity’s one-sided 95 percent lower limit is not positive: no mass bound follows',
        luminosityW: L,
      };
  }
  return {
    status: 'ok',
    kind: 'lower-bound',
    sign: 'M >=',
    massBoundSolar: L / L_EDD_PER_MSUN_W,
    massBoundLower95Solar: lower / L_EDD_PER_MSUN_W,
    luminosityW: L,
    lowerLimitW: lower,
    how,
    assumes: EDDINGTON_ASSUMES,
    statement:
      'a lower bound on the mass, not an estimate: the true mass is this or larger, by an amount the luminosity alone cannot say',
  };
}

/**
 * The Eddington ratio L_bol / L_Edd(M).
 * @param {{luminosityW: number, massSolar: number}} o
 */
export function eddingtonRatio({ luminosityW, massSolar } = {}) {
  const e = eddingtonLuminosity(massSolar);
  if (e.status !== 'ok') return e;
  if (!(luminosityW > 0) || !Number.isFinite(luminosityW))
    return refused(
      'bad-luminosity',
      'the luminosity must be positive and finite'
    );
  return { status: 'ok', ratio: luminosityW / e.luminosityW };
}
