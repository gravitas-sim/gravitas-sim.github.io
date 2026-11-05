// =============================================================================
// Radio kernel: the HI column density from the integrated line
// -----------------------------------------------------------------------------
// For an optically thin line in the Rayleigh-Jeans limit, with the upper level
// holding three quarters of the atoms (the statistical-weight ratio 3:1, true
// when h nu0 / k is far below the spin temperature),
//
//   integral T_B dv = 3 h c^3 A10 N / (32 pi k nu0^2),
//
// so N = (32 pi k nu0^2 / (3 h c^3 A10)) integral T_B dv. In cm^-2 for T_B in K
// and v in km/s the coefficient is COLUMN_COEFFICIENT, about 1.8e18.
//
// The thin assumption fails when the line is not thin. For a single slab at spin
// temperature T_s the peak optical depth is tau = -ln(1 - T_peak / T_s), and
// the thin estimate then falls short at the peak by tau / (1 - e^-tau). The
// diagnostic states the assumption as failed when tau exceeds TAU_LIMIT (0.1,
// a bias of about 5 percent at the peak) and refuses a column when the peak
// reaches T_s. With no spin temperature the opacity is not assessed and the
// result says so. Layered gas, cold clouds on a warm background and
// self-absorption by foreground gas make the thin estimate worse than the slab
// bound suggests: the diagnostic is a floor on the problem, not a ceiling.
// =============================================================================

import {
  H_PLANCK,
  HI_LINE,
  K_BOLTZMANN,
  C_LIGHT,
  refuse,
} from './constants.js';

/** The peak optical depth above which the thin assumption is reported failed. */
export const TAU_LIMIT = 0.1;

/**
 * cm^-2 per (K km/s): 32 pi k nu0^2 / (3 h c^3 A10) in SI (m^-2 per K m/s),
 * times 1e3 (km to m) and 1e-4 (m^-2 to cm^-2).
 */
export function columnCoefficient(
  restHz = HI_LINE.restFrequencyHz,
  rateS = HI_LINE.spinFlipRateS
) {
  const si =
    (32 * Math.PI * K_BOLTZMANN * restHz * restHz) /
    (3 * H_PLANCK * C_LIGHT ** 3 * rateS);
  return si * 1e3 * 1e-4;
}

/** The coefficient for the line's own constants, cm^-2 per K km/s. */
export const COLUMN_COEFFICIENT = columnCoefficient();

/** The integral of T dv (K km/s) by the trapezoid rule over channels in any order. */
export function integratedLine(velocity, temperature) {
  const n = velocity.length;
  const idx = velocity
    .map((_, i) => i)
    .sort((p, q) => velocity[p] - velocity[q]);
  let s = 0;
  for (let k = 1; k < n; k++) {
    const i = idx[k - 1];
    const j = idx[k];
    s += 0.5 * (temperature[i] + temperature[j]) * (velocity[j] - velocity[i]);
  }
  return s;
}

/**
 * The thin column density of a line and the verdict on the thin assumption.
 *
 * @param {object} o
 * @param {number[]} o.velocity - km/s
 * @param {number[]} o.temperature - K
 * @param {number} [o.spinTemperatureK] - assumed T_s; without it the opacity is not assessed
 * @param {number} [o.tauLimit]
 * @returns {{status: 'ok'|'thin-assumption-fails'|'saturated'|'opacity-not-assessed', columnCm2: number|null, integralKKmS: number, tauPeak: number|null, peakBias: number|null, note: string}}
 */
export function columnDensityThin({
  velocity,
  temperature,
  spinTemperatureK,
  tauLimit = TAU_LIMIT,
}) {
  if (!velocity?.length || velocity.length !== temperature?.length)
    refuse(
      'bad-spectrum',
      'velocity and temperature must be arrays of one length'
    );
  const integral = integratedLine(velocity, temperature);
  const column = COLUMN_COEFFICIENT * integral;
  const peak = Math.max(...temperature);
  if (!(spinTemperatureK > 0))
    return {
      status: 'opacity-not-assessed',
      columnCm2: column,
      integralKKmS: integral,
      tauPeak: null,
      peakBias: null,
      note: 'opacity not assessed: no spin temperature was given, so this column assumes the line is optically thin and is a lower bound if it is not',
    };
  if (peak >= spinTemperatureK)
    return {
      status: 'saturated',
      columnCm2: null,
      integralKKmS: integral,
      tauPeak: Infinity,
      peakBias: null,
      note: 'the line reaches the spin temperature: it is saturated and the thin assumption gives no column',
    };
  const tauPeak = -Math.log(1 - peak / spinTemperatureK);
  const peakBias = tauPeak > 0 ? tauPeak / (1 - Math.exp(-tauPeak)) : 1;
  const thin = tauPeak <= tauLimit;
  return {
    status: thin ? 'ok' : 'thin-assumption-fails',
    columnCm2: column,
    integralKKmS: integral,
    tauPeak,
    peakBias,
    note: thin
      ? 'the peak optical depth is below the limit, so the thin column is a lower bound within a few percent'
      : `the peak optical depth (${Math.round(tauPeak * 100) / 100}) is above ${tauLimit}: the thin assumption fails and the column is a lower bound that may be far too low`,
  };
}
