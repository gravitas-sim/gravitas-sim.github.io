// =============================================================================
// Radiation kernel: constants
// -----------------------------------------------------------------------------
// Pure data, no imports. Every value says where it comes from.
//
//   h, c, k_B     the 2019 SI redefinition: exact by definition (BIPM, SI
//                 Brochure 9th ed., 2019, Table 1).
//   sigma         derived, not typed: 2 pi^5 k^4 / (15 h^3 c^2). With exact h, k
//                 and c it is exact too: 5.670374419...e-8 W m^-2 K^-4 (CODATA
//                 2018 lists the same number).
//   Wien          the dimensionless roots of x = 5 (1 - e^-x) and
//                 x = 3 (1 - e^-x), found by Newton's method below rather than
//                 quoted, so the constants follow from h, c and k.
//   Sun, AU, pc   IAU 2015 Resolution B3 (nominal solar values; Prsa et al.
//                 2016, AJ 152, 41) and IAU 2012 Resolution B2 (the AU, exact).
//   M_bol zero    IAU 2015 Resolution B2: L0 = 3.0128e28 W, so the Sun's
//                 nominal bolometric magnitude is 4.7400 (Mamajek et al. 2015).
//   AB            Oke & Gunn 1983: m_AB = -2.5 log10(f_nu / 3631 Jy). The 3631 Jy
//                 is the flux density at which 48.60 (Oke 1974) holds in cgs.
// =============================================================================

export const H_PLANCK = 6.62607015e-34; // J s, exact
export const C_LIGHT = 299792458; // m/s, exact
export const K_BOLTZMANN = 1.380649e-23; // J/K, exact

/** Stefan-Boltzmann constant, W m^-2 K^-4, from h, c and k. */
export const SIGMA_SB =
  (2 * Math.PI ** 5 * K_BOLTZMANN ** 4) / (15 * H_PLANCK ** 3 * C_LIGHT ** 2);

/** The root of x = n (1 - e^-x) near n, by Newton's method. */
function wienRoot(n) {
  let x = n;
  for (let i = 0; i < 60; i++) {
    const e = Math.exp(-x);
    const f = x - n * (1 - e);
    const d = 1 - n * e;
    const dx = f / d;
    x -= dx;
    if (Math.abs(dx) < 1e-15) break;
  }
  return x;
}
/** 4.9651142317..., the Wien displacement root in wavelength. */
export const WIEN_X_LAMBDA = wienRoot(5);
/** 2.8214393721..., the root for the spectrum per unit frequency. */
export const WIEN_X_NU = wienRoot(3);
/** Wien displacement constant b = hc / (k x), m K (2.897771955e-3). */
export const WIEN_B_LAMBDA = (H_PLANCK * C_LIGHT) / (K_BOLTZMANN * WIEN_X_LAMBDA);
/** Wien constant for B_nu, Hz/K (5.878925757e10): nu_peak = this * T. */
export const WIEN_B_NU = (WIEN_X_NU * K_BOLTZMANN) / H_PLANCK;

export const AU_M = 149597870700; // IAU 2012 B2, exact
export const PC_M = (AU_M * 648000) / Math.PI; // IAU 2015 B2
export const R_SUN_M = 6.957e8; // IAU 2015 B3 nominal
export const L_SUN_W = 3.828e26; // IAU 2015 B3 nominal
export const TEFF_SUN_K = 5772; // IAU 2015 B3 nominal
export const L_BOL_ZERO_W = 3.0128e28; // IAU 2015 B2: M_bol = 0
export const M_BOL_SUN = 4.74; // IAU 2015 B2, nominal

/** 1 Jy in W m^-2 Hz^-1. */
export const JY = 1e-26;
/** The AB zero point, in Jy (Oke & Gunn 1983). */
export const AB_ZERO_JY = 3631;
