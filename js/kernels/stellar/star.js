// =============================================================================
// A polytrope as a star: central conditions and the profile in physical units
// -----------------------------------------------------------------------------
// From the mass M and radius R of a star and a polytropic index n:
//
//     rho_c = (rho_c / rho_mean) 3M / (4 pi R^3)         (the table's ratio)
//     P_c   = G M^2 / R^4  /  (4 pi (n + 1) theta'(xi1)^2)
//     T_c   = mu m_u P_c / (rho_c k)                     (ideal gas, no radiation)
//     K     = P_c / rho_c^(1 + 1/n)
//
// The ideal-gas temperature is the model's assumption, and a fair one for a
// star of the Sun's mass: radiation pressure is a fraction of a percent of the
// Sun's central pressure. It is a poor one above about 10 solar masses.
// =============================================================================

import { polytrope, massFractionAt } from './polytrope.js';
import {
  G_SI,
  K_BOLTZMANN,
  M_UNIT_KG,
  SOLAR_MASS_KG,
  SOLAR_RADIUS_M,
} from './constants.js';

/** The mean molecular weight of fully ionized gas of the Sun's composition (X = 0.70, Y = 0.28). */
export const MU_SOLAR = 0.6;

/**
 * @param {number} n - Polytropic index, 0 to 4.5
 * @param {number} massKg
 * @param {number} radiusM
 * @param {number} [mu] - Mean molecular weight
 */
export function polytropeStar(n, massKg, radiusM, mu = MU_SOLAR) {
  const sol = polytrope(n);
  const rhoMean = (3 * massKg) / (4 * Math.PI * radiusM ** 3);
  const rhoCentral = sol.rhoRatio * rhoMean;
  const pCentral =
    (G_SI * massKg * massKg) /
    radiusM ** 4 /
    (4 * Math.PI * (n + 1) * sol.dtheta1 ** 2);
  const tCentral = (mu * M_UNIT_KG * pCentral) / (rhoCentral * K_BOLTZMANN);
  return {
    n,
    sol,
    massKg,
    radiusM,
    mu,
    rhoMean,
    rhoCentral,
    pCentral,
    tCentral,
    K: n === 0 ? NaN : pCentral / rhoCentral ** (1 + 1 / n),
    /** The length unit a = R / xi1, metres. */
    scaleM: radiusM / sol.xi1,
  };
}

/**
 * The profile of a polytropic star at `count` radii from the centre to the
 * surface: r/R, density, pressure, temperature (ideal gas) and the enclosed
 * mass fraction. Index 0 is the centre, the last is the surface.
 */
export function polytropeProfile(star, count = 60) {
  const { sol, n } = star;
  const rows = [];
  for (let i = 0; i < count; i++) {
    const f = i / (count - 1);
    const xi = f * sol.xi1;
    // theta by interpolation of the stored profile.
    let j = 1;
    while (j < sol.xi.length - 1 && sol.xi[j] < xi) j++;
    const w =
      sol.xi[j] === sol.xi[j - 1]
        ? 0
        : (xi - sol.xi[j - 1]) / (sol.xi[j] - sol.xi[j - 1]);
    const theta = Math.max(
      0,
      sol.theta[j - 1] + w * (sol.theta[j] - sol.theta[j - 1])
    );
    const rho = star.rhoCentral * (n === 0 ? 1 : theta ** n);
    const p =
      star.pCentral * (n === 0 ? (theta > 0 ? 1 : 0) : theta ** (n + 1));
    rows.push({
      r: f,
      rho,
      p: n === 0 ? star.pCentral * Math.max(0, theta) : p,
      t: n === 0 ? star.tCentral * Math.max(0, theta) : star.tCentral * theta,
      m: massFractionAt(sol, xi),
    });
  }
  return rows;
}

/**
 * The interior model that goes with a star of the Stellar Lab (and what it
 * leaves out). Main-sequence stars below 0.35 solar masses are fully convective
 * and well described by n = 3/2; the rest are close to n = 3 (Eddington's
 * standard model). A white dwarf has its own model (./whiteDwarf.js); a giant
 * has a dense core and a tenuous envelope that no single polytrope describes.
 *
 * @param {{phase?: string, currentMassSun?: number, initialMassSun?: number, radiusSun: number}} state
 * @returns {{model: string, why: string, n?: number, star?: object}}
 */
export function interiorOf(state) {
  const mass = state.currentMassSun ?? state.massSun ?? state.initialMassSun;
  if (state.phase === 'white-dwarf')
    return { model: 'white-dwarf', why: 'degenerate' };
  const ms = ['pre-main-sequence', 'main-sequence'].includes(state.phase);
  if (!ms) return { model: 'none', why: 'core-envelope' };
  const n = mass < 0.35 ? 1.5 : 3;
  return {
    model: 'polytrope',
    n,
    why: n === 1.5 ? 'convective' : 'radiative',
    star: polytropeStar(
      n,
      mass * SOLAR_MASS_KG,
      state.radiusSun * SOLAR_RADIUS_M
    ),
  };
}
