// =============================================================================
// Radiation kernel: magnitudes, distances and bolometric quantities
// -----------------------------------------------------------------------------
// The magnitude scale is m1 - m2 = -2.5 log10(F1 / F2) (Pogson 1856). Absolute
// magnitude is the apparent magnitude at 10 pc. All functions are pure.
// =============================================================================

import {
  AU_M,
  L_BOL_ZERO_W,
  L_SUN_W,
  M_BOL_SUN,
  PC_M,
} from './constants.js';

/** Magnitude difference of two fluxes: -2.5 log10(f / fRef). */
export const fluxToMag = (f, fRef = 1) => -2.5 * Math.log10(f / fRef);
/** Flux ratio for a magnitude difference. */
export const magToFluxRatio = dm => 10 ** (-0.4 * dm);

/** Distance modulus m - M = 5 log10(d / 10 pc), for d in parsecs. */
export const distanceModulus = dPc => 5 * Math.log10(dPc / 10);
/** Distance in parsecs from a distance modulus. */
export const distanceFromModulus = mu => 10 * 10 ** (mu / 5);
/** Distance modulus for a distance in metres (the Sun: 1 AU gives -31.5721). */
export const distanceModulusM = dM => distanceModulus(dM / PC_M);
export const AU_DISTANCE_MODULUS = distanceModulusM(AU_M);

/** Apparent from absolute magnitude, with optional extinction A (mag). */
export const apparentMag = (M, dPc, A = 0) => M + distanceModulus(dPc) + A;
/** Absolute from apparent magnitude. */
export const absoluteMag = (m, dPc, A = 0) => m - distanceModulus(dPc) - A;

/** Bolometric magnitude from luminosity in W (IAU 2015 B2 zero point). */
export const bolometricMag = L => -2.5 * Math.log10(L / L_BOL_ZERO_W);
/** Luminosity in W from a bolometric magnitude. */
export const luminosityFromMbol = M => L_BOL_ZERO_W * 10 ** (-0.4 * M);
/** M_bol from luminosity in solar units. */
export const bolometricMagSolar = Lsun => M_BOL_SUN - 2.5 * Math.log10(Lsun);
/** Luminosity in solar units from M_bol (relative to the nominal 4.74). */
export const luminositySolarFromMbol = M => 10 ** (-0.4 * (M - M_BOL_SUN));

/**
 * Bolometric correction BC_V(Teff) from a polynomial law, mag, where
 * M_bol = M_V + BC_V. `law` is the data of the bolometric-corrections pack:
 * ranges of log10 Teff, each with polynomial coefficients a0..a5 (the form of
 * Flower 1996 as corrected by Torres 2010). Outside the pack's stated range it
 * returns NaN: the polynomial is not extrapolated.
 */
export function bolometricCorrectionV(teffK, law) {
  const lt = Math.log10(teffK);
  if (!(lt >= law.logTeffMin && lt <= law.logTeffMax)) return NaN;
  const seg = law.segments.find(s => lt >= s.from && lt <= s.to);
  if (!seg) return NaN;
  let bc = 0;
  for (let i = seg.a.length - 1; i >= 0; i--) bc = bc * lt + seg.a[i];
  return bc;
}

/**
 * Absolute V magnitude from luminosity (solar units) and Teff, anchored on the
 * Sun as Torres 2010 (eq. 8) recommends:
 *
 *      M_V = -2.5 log10(L/Lsun) + M_V,sun - (BC_V - BC_V,sun)
 *
 * with M_V,sun = V_sun - (the Sun's distance modulus at 1 AU, -31.5721). The
 * Flower scale's own BC_V,sun is -0.080, not the -0.072 the IAU M_bol,sun = 4.74
 * implies; anchoring on the Sun makes the two cancel instead of leaving a 0.7
 * percent error in L. `law.solar` carries V_sun and BC_V,sun.
 */
export function absoluteVFromLuminosity(Lsun, teffK, law) {
  const MvSun = law.solar.vSun - AU_DISTANCE_MODULUS;
  return (
    -2.5 * Math.log10(Lsun) +
    MvSun -
    (bolometricCorrectionV(teffK, law) - law.solar.bcV)
  );
}

export { L_SUN_W };
