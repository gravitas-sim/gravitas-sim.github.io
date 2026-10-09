// =============================================================================
// Radiation kernel: the Planck function and its laws
// -----------------------------------------------------------------------------
// Pure functions of SI numbers. B_lambda is in W m^-3 sr^-1 (per metre of
// wavelength), B_nu in W m^-2 Hz^-1 sr^-1. Both use expm1 so that the
// Rayleigh-Jeans end (h nu << k T) keeps its digits, and return 0 rather than
// overflowing in the Wien tail.
// =============================================================================

import {
  C_LIGHT,
  H_PLANCK,
  K_BOLTZMANN,
  SIGMA_SB,
  WIEN_B_LAMBDA,
  WIEN_B_NU,
} from './constants.js';

/** B_lambda(T), W m^-3 sr^-1. lambdaM in metres, T in kelvin. */
export function planckLambda(lambdaM, T) {
  if (!(lambdaM > 0) || !(T > 0)) return 0;
  const x = (H_PLANCK * C_LIGHT) / (lambdaM * K_BOLTZMANN * T);
  if (x > 700) return 0;
  return (2 * H_PLANCK * C_LIGHT * C_LIGHT) / (lambdaM ** 5 * Math.expm1(x));
}

/** B_nu(T), W m^-2 Hz^-1 sr^-1. nuHz in hertz. */
export function planckNu(nuHz, T) {
  if (!(nuHz > 0) || !(T > 0)) return 0;
  const x = (H_PLANCK * nuHz) / (K_BOLTZMANN * T);
  if (x > 700) return 0;
  return (2 * H_PLANCK * nuHz ** 3) / (C_LIGHT * C_LIGHT * Math.expm1(x));
}

/** Wavelength of the peak of B_lambda, metres (Wien's law). */
export const wienPeakLambda = T => WIEN_B_LAMBDA / T;
/** Frequency of the peak of B_nu, hertz. Not c over the wavelength peak. */
export const wienPeakNu = T => WIEN_B_NU * T;
/** Temperature from the B_lambda peak wavelength, kelvin. */
export const temperatureFromPeak = lambdaM => WIEN_B_LAMBDA / lambdaM;

/** Surface flux of a blackbody, W m^-2 (Stefan-Boltzmann). */
export const exitance = T => SIGMA_SB * T ** 4;
/** Luminosity of a blackbody sphere, W. */
export const luminosity = (radiusM, T) =>
  4 * Math.PI * radiusM * radiusM * exitance(T);
/** Effective temperature from luminosity and radius, K. */
export const effectiveTemperature = (L, radiusM) =>
  (L / (4 * Math.PI * radiusM * radiusM * SIGMA_SB)) ** 0.25;

/**
 * Integral of B_lambda from a to b (metres), W m^-2 sr^-1, by composite
 * Simpson on a grid of n intervals in log wavelength. n = 2000 is converged to
 * 1e-10 over any band that holds the peak; the tails beyond are what the
 * validation group integrates to show the total is sigma T^4 / pi.
 */
export function bandRadiance(a, b, T, n = 2000) {
  const la = Math.log(a);
  const h = (Math.log(b) - la) / n;
  let s = 0;
  for (let i = 0; i <= n; i++) {
    const lam = Math.exp(la + i * h);
    const w = i === 0 || i === n ? 1 : i % 2 ? 4 : 2;
    s += w * planckLambda(lam, T) * lam;
  }
  return (s * h) / 3;
}
