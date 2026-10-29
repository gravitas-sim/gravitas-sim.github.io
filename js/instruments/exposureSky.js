// =============================================================================
// The two numbers an exposure plan takes from the other kernels
// -----------------------------------------------------------------------------
// js/instruments/exposure.js reads a facility's table and takes a zero point and
// an airmass as numbers. These make them: the zero point from a throughput and a
// radiation-kernel passband (the photon rate of a magnitude-0 object through the
// telescope's collecting area), and the airmass from an apparent altitude by the
// sky kernel's Kasten and Young formula. Kept apart so a page that already has
// both numbers does not load the radiation and sky kernels.
//
// The library states no throughput or zero point for any facility, so a
// throughput here is the caller's, and a plan records it as supplied.
//
// Pure: no DOM.
// =============================================================================

import { airmass } from '../kernels/sky/moon.js';
import { photonRate, photonRateVega } from '../kernels/detector/bands.js';

export { airmass as airmassOfAltitude };

/**
 * Electrons per second at magnitude 0 from a throughput and a decoded passband.
 * @param {object} band - From decodeBand
 * @param {number} areaM2 - Collecting area, m^2 (areaOf in exposure.js)
 * @param {number} throughput - Peak system efficiency, 0 to 1
 * @param {'ab'|'vega'} [system]
 */
export function zeroPointOf(band, areaM2, throughput, system = 'ab') {
  return (system === 'vega' ? photonRateVega : photonRate)(
    band,
    0,
    areaM2,
    throughput
  );
}
