// =============================================================================
// The photon rate of a star through a band: the exposure-time calculator's source
// -----------------------------------------------------------------------------
// From the radiation kernel's band pack, decoded by the caller:
//
//   rate = (f_nu / h) Int S(lambda) d lambda / lambda  x  area x throughput
//
// with f_nu = 3631 Jy x 10^(-0.4 m_AB), S the band's response (peak 1), and
// `throughput` the telescope, filter and detector together at the band's peak.
// The derivation: the photons a band collects are Int f_nu / (h nu) d nu, and
// d nu / nu = d lambda / lambda in magnitude.
//
// Pure: no DOM; the band is passed in (decoded), not loaded.
// =============================================================================

import { refineBand } from '../radiation/photometry.js';
import { AB_ZERO_JY, H_PLANCK, JY } from '../radiation/constants.js';

/** Int S(lambda) d lambda / lambda over a decoded band, dimensionless. */
export function bandPhotonIntegral(band) {
  const { lambdaNm: l, s } = refineBand(band);
  let acc = 0;
  for (let i = 1; i < l.length; i++)
    acc += 0.5 * (s[i - 1] / l[i - 1] + s[i] / l[i]) * (l[i] - l[i - 1]);
  return acc;
}

/**
 * Electrons per second from a star of AB magnitude m in a band.
 * @param {object} band - From decodeBand
 * @param {number} mAB
 * @param {number} areaM2 - Collecting area, square meters
 * @param {number} throughput - Peak system efficiency, 0 to 1
 */
export function photonRate(band, mAB, areaM2, throughput) {
  const fnu = AB_ZERO_JY * JY * 10 ** (-0.4 * mAB); // W m^-2 Hz^-1
  return (fnu / H_PLANCK) * bandPhotonIntegral(band) * areaM2 * throughput;
}

/** The photon rate of a Vega-system magnitude: m_AB = m_Vega + (AB - Vega). */
export const photonRateVega = (band, mVega, areaM2, throughput) =>
  photonRate(band, mVega + (band.abMinusVega ?? 0), areaM2, throughput);
