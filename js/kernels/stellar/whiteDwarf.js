// =============================================================================
// White-dwarf structure from a cold, ideal degenerate electron gas
// -----------------------------------------------------------------------------
// The equation of state is Chandrasekhar's: electrons filling the momentum
// states up to p_F = x m_e c, with the ions only supplying mass (mu_e nucleons
// per electron):
//
//     P(x)   = (pi m_e^4 c^5 / 3 h^3) [ x (2x^2 - 3) sqrt(x^2 + 1) + 3 asinh x ]
//     rho(x) = (8 pi mu_e m_u / 3) (m_e c / h)^3 x^3.
//
// Hydrostatic equilibrium and the mass integral are integrated outward from a
// central x_c; with q = x^2 the equations are regular at the surface (q = 0):
//
//     dq/dr = - G m B sqrt(1 + q) / (4 A r^2),   dm/dr = 4 pi r^2 B q^(3/2)
//
// with A = pi m_e^4 c^5 / 3 h^3 and B = 8 pi mu_e m_u (m_e c / h)^3 / 3. The
// mass rises with x_c toward a limit that nothing in the integration puts in:
// it appears as the integration is repeated at higher and higher central
// density. What it leaves out: Coulomb corrections, composition layers, finite
// temperature, general relativity and the inverse-beta decay that ends real
// white dwarfs a little below the limit.
// =============================================================================

import {
  G_SI,
  C_SI,
  H_PLANCK,
  M_ELECTRON_KG,
  M_UNIT_KG,
  SOLAR_MASS_KG,
  SOLAR_RADIUS_M,
} from './constants.js';

const A = (Math.PI * M_ELECTRON_KG ** 4 * C_SI ** 5) / (3 * H_PLANCK ** 3);
const bOf = muE =>
  (8 * Math.PI * muE * M_UNIT_KG * ((M_ELECTRON_KG * C_SI) / H_PLANCK) ** 3) /
  3;

/** Pressure of the degenerate electron gas at Fermi momentum x m_e c, pascals. */
export const degeneratePressure = x =>
  A * (x * (2 * x * x - 3) * Math.sqrt(x * x + 1) + 3 * Math.asinh(x));

/** Mass density, kg per cubic metre. */
export const degenerateDensity = (x, muE = 2) => bOf(muE) * x ** 3;

/** Fermi momentum parameter of a density. */
export const fermiX = (rho, muE = 2) => (rho / bOf(muE)) ** (1 / 3);

const q32 = q => (q > 0 ? q ** 1.5 : 0);

/**
 * One white dwarf: radius, mass and central density for a central Fermi
 * parameter x_c.
 *
 * @param {number} xc - Central x = p_F / m_e c
 * @param {number} [muE] - Nucleons per electron (2 for carbon, oxygen, helium)
 */
export function whiteDwarf(xc, muE = 2) {
  const B = bOf(muE);
  const rhoC = B * xc ** 3;
  const pC = degeneratePressure(xc);
  const rc = Math.sqrt(pC / (G_SI * rhoC * rhoC));
  const h = rc / 1500;
  const f = (r, q, m) => [
    (-G_SI * m * B * Math.sqrt(1 + Math.max(q, 0))) / (4 * A * r * r),
    4 * Math.PI * r * r * B * q32(q),
  ];
  let r = h;
  let q =
    xc * xc -
    ((Math.PI * G_SI * B * B * xc ** 3 * Math.sqrt(1 + xc * xc)) / (6 * A)) *
      r *
      r;
  let m = (4 * Math.PI * rhoC * r ** 3) / 3;
  const step = (r0, q0, m0, s) => {
    const [a1, b1] = f(r0, q0, m0);
    const [a2, b2] = f(r0 + s / 2, q0 + (s / 2) * a1, m0 + (s / 2) * b1);
    const [a3, b3] = f(r0 + s / 2, q0 + (s / 2) * a2, m0 + (s / 2) * b2);
    const [a4, b4] = f(r0 + s, q0 + s * a3, m0 + s * b3);
    return [
      q0 + (s / 6) * (a1 + 2 * a2 + 2 * a3 + a4),
      m0 + (s / 6) * (b1 + 2 * b2 + 2 * b3 + b4),
    ];
  };
  let guard = 0;
  while (guard++ < 1e6) {
    const [q2, m2] = step(r, q, m, h);
    if (q2 <= 0) {
      let lo = 0;
      let hi = h;
      for (let k = 0; k < 50; k++) {
        const mid = (lo + hi) / 2;
        if (step(r, q, m, mid)[0] > 0) lo = mid;
        else hi = mid;
      }
      const s = (lo + hi) / 2;
      const [, mS] = step(r, q, m, s);
      r += s;
      m = mS;
      break;
    }
    r += h;
    q = q2;
    m = m2;
  }
  return {
    xc,
    muE,
    radiusM: r,
    massKg: m,
    massSun: m / SOLAR_MASS_KG,
    radiusSun: r / SOLAR_RADIUS_M,
    rhoCentral: rhoC,
    meanDensity: m / ((4 * Math.PI * r ** 3) / 3),
  };
}

/** The mass-radius relation: one dwarf for each central Fermi parameter. */
export const massRadiusCurve = (
  xs = Array.from({ length: 41 }, (_, i) => 10 ** (-1 + (i * 3.5) / 40)),
  muE = 2
) => xs.map(x => whiteDwarf(x, muE));

/**
 * The limit the relation approaches, from the n = 3 polytrope constants:
 * M = 4 pi (-xi1^2 theta'1) (K / (pi G))^(3/2) with K the relativistic
 * constant of the gas, which is (hc/8)(3/pi)^(1/3) / (mu_e m_u)^(4/3).
 * Closed form, used as the independent check of the numerical limit.
 */
export function chandrasekharMassSun(muE = 2, omega3 = 2.018236) {
  const K =
    (((H_PLANCK * C_SI) / 8) * (3 / Math.PI) ** (1 / 3)) /
    (muE * M_UNIT_KG) ** (4 / 3);
  const M = 4 * Math.PI * omega3 * (K / (Math.PI * G_SI)) ** 1.5;
  return M / SOLAR_MASS_KG;
}

/**
 * The central Fermi parameter that gives a mass: bisection on the monotone
 * part of the relation. Returns NaN above the limit.
 */
export function centralXForMass(massSun, muE = 2) {
  let lo = 0.02;
  let hi = 200;
  if (massSun >= whiteDwarf(hi, muE).massSun) return NaN;
  for (let k = 0; k < 40; k++) {
    const mid = Math.sqrt(lo * hi);
    if (whiteDwarf(mid, muE).massSun < massSun) lo = mid;
    else hi = mid;
  }
  return Math.sqrt(lo * hi);
}
