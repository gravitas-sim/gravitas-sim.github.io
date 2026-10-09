// =============================================================================
// Radiation kernel: Doppler shift, redshift, and air and vacuum wavelengths
// -----------------------------------------------------------------------------
// Two forms, with their ranges stated.
//
//   Non-relativistic   z = v / c.  It differs from the relativistic form by about
//     beta^2 / 2 in z (the series of sqrt((1+b)/(1-b))): under 1e-4 for
//     v < 0.014 c (4,200 km/s) and under 1e-6 for a star's 30 km/s, where a
//     stellar radial velocity or a galaxy's rotation lives.
//   Relativistic       1 + z = sqrt((1 + beta) / (1 - beta)), beta = v/c.
//     Exact for a source in uniform motion along the line of sight in flat
//     spacetime. A transverse-only motion gives 1 + z = gamma.
//
// Neither is the cosmological redshift: for z beyond about 0.1 the redshift of a
// distant galaxy is the expansion of space, not a velocity, and "the velocity"
// computed here is the speed it would have if it were a Doppler shift. The
// functions do the arithmetic; they do not decide which one applies.
//
// Wavelength convention: lambdaObs = lambdaRest (1 + z), both in the same
// medium. Air to vacuum is Morton 2000 (ApJS 130, 403), the conversion SDSS
// documents; it holds from 200 nm to 2 um (error below about 0.001 nm there).
// =============================================================================

import { C_LIGHT } from './constants.js';

const C_KM_S = C_LIGHT / 1000;

/** z from radial velocity, km/s, non-relativistic. */
export const zFromVelocityClassical = v => v / C_KM_S;
/** Radial velocity, km/s, from z, non-relativistic (valid for |v| << c). */
export const velocityFromZClassical = z => z * C_KM_S;

/** z from radial velocity, km/s, relativistic longitudinal. */
export const zFromVelocity = v => {
  const b = v / C_KM_S;
  return Math.sqrt((1 + b) / (1 - b)) - 1;
};
/** Radial velocity, km/s, from z, relativistic longitudinal. */
export const velocityFromZ = z => {
  const s = (1 + z) ** 2;
  return (C_KM_S * (s - 1)) / (s + 1);
};
/** z of a purely transverse motion at speed v km/s: gamma - 1. */
export const zTransverse = v => 1 / Math.sqrt(1 - (v / C_KM_S) ** 2) - 1;

/** Observed wavelength of a line at redshift z. */
export const observedWavelength = (restNm, z) => restNm * (1 + z);
/** z from an observed and a rest wavelength in the same medium. */
export const redshiftFromWavelengths = (obsNm, restNm) => obsNm / restNm - 1;

/** Velocity from a wavelength shift, km/s, in the chosen form. */
export function velocityFromWavelengths(obsNm, restNm, form = 'relativistic') {
  const z = redshiftFromWavelengths(obsNm, restNm);
  return form === 'classical' ? velocityFromZClassical(z) : velocityFromZ(z);
}

/**
 * How far the two forms differ at a velocity: (z_rel - z_classical) / z_rel.
 * Use it to state, not assume, whether the cheap form is good enough.
 */
export function classicalError(vKmS) {
  const zr = zFromVelocity(vKmS);
  return (zr - zFromVelocityClassical(vKmS)) / zr;
}

/** The range of the air and vacuum conversions, nm (Morton 2000). */
export const AIR_RANGE_NM = [200, 2000];

/**
 * Air wavelength to vacuum, nm (Morton 2000, the formula the SDSS and the
 * Stellar Lab use). Air is standard air: 15 C, 101325 Pa, dry (Edlen 1966's
 * index, the IAU standard). Valid from 200 nm to 2 um; NaN outside, the
 * formula's polynomial in 1/lambda^2 is not an index of refraction beyond it.
 * The wavenumber term s = 1e3 / lambda is evaluated at the air wavelength, as
 * the formula is written (Morton's own text); the physical index would be
 * evaluated at the vacuum wavelength, which moves the result by at most 1e-5 nm
 * (measured over 200 nm to 2 um, worst at 200 nm).
 */
export function airToVacuumNm(airNm) {
  if (!(airNm >= AIR_RANGE_NM[0] && airNm <= AIR_RANGE_NM[1])) return NaN;
  const s = 1e3 / airNm; // um^-1 uses lambda in nm: 1e4 / A, A = 10 nm
  const s2 = s * s;
  return (
    airNm *
    (1 + 0.0000834254 + 0.02406147 / (130 - s2) + 0.00015998 / (38.9 - s2))
  );
}
/**
 * Vacuum wavelength to air, nm: lambda_vac / n with n evaluated at the vacuum
 * wavelength, so it inverts the physical index exactly and airToVacuumNm (which
 * evaluates it at the air wavelength) to within 1e-5 nm. Same range and
 * standard air; NaN outside.
 */
export function vacuumToAirNm(vacNm) {
  return vacNm / (airToVacuumNm(vacNm) / vacNm);
}
