// =============================================================================
// Homology: how a star's structure scales with its mass
// -----------------------------------------------------------------------------
// If every star of a family is a scaled copy of the same shape, then at the
// same fractional radius
//
//     rho ~ M R^-3,   P ~ M^2 R^-4,   T ~ mu M R^-1   (hydrostatic + ideal gas).
//
// Radiative transport with an opacity kappa = kappa0 rho^a T^-b gives
//
//     L ~ mu^(4+b) M^(3+b-a) R^(3a-b),
//
// (Kramers: a = 1, b = 3.5; electron scattering: a = b = 0), and a nuclear
// energy generation eps ~ rho^lambda T^nu fixes L ~ mu^nu M^(1+lambda+nu)
// R^(-3 lambda - nu). Equating the two gives the radius, R ~ M^x with
//
//     x = (lambda + nu - 2 - b + a) / (3a - b + 3 lambda + nu).
//
// This is a scaling argument: it sets exponents, not constants, and it holds
// only while one opacity law and one reaction dominate through the star. The
// tests state how far it holds against the MIST zero-age models.
// =============================================================================

import { mainSequenceAt, trackIds } from '../../stellar/tracks.js';
import { TRACKS } from '../../data/stellar/mistTracks.js';
import {
  G_SI,
  C_SI,
  H_BURNING_EFFICIENCY,
  SECONDS_PER_YEAR,
  SOLAR_MASS_KG,
  SOLAR_RADIUS_M,
  L_SUN_W,
} from './constants.js';

/** Opacity laws (a, b) and energy-generation laws (lambda, nu), the standard exponents. */
export const OPACITY = Object.freeze({
  kramers: Object.freeze({ a: 1, b: 3.5 }),
  electron: Object.freeze({ a: 0, b: 0 }),
});
export const ENERGY = Object.freeze({
  pp: Object.freeze({ lambda: 1, nu: 4 }),
  cno: Object.freeze({ lambda: 1, nu: 16 }),
});

/**
 * The exponents of L ~ M^alpha and R ~ M^x for a pair of laws, and the
 * dependence on mean molecular weight at fixed M and R.
 */
export function homologyExponents(opacity, energy) {
  const { a, b } = opacity;
  const { lambda, nu } = energy;
  const x = (lambda + nu - 2 - b + a) / (3 * a - b + 3 * lambda + nu);
  const radiativeM = 3 + b - a;
  const radiativeR = 3 * a - b;
  return {
    x,
    luminosityMass: radiativeM + radiativeR * x,
    radiativeM,
    radiativeR,
    luminosityMu: 4 + b,
  };
}

/** The ratio of M, R (relative to the Sun) to central density, pressure and temperature (relative to the Sun's). */
export function structureScaling(mSun, rSun, muRatio = 1) {
  return {
    density: mSun / rSun ** 3,
    pressure: (mSun * mSun) / rSun ** 4,
    temperature: (muRatio * mSun) / rSun,
  };
}

/** Time a star can shine on hydrogen: eps f M c^2 / L, years (f is the burned fraction, 0.1 for the Sun). */
export function nuclearTimescaleYr(massSun, lumSun, fraction = 0.1) {
  return (
    (H_BURNING_EFFICIENCY * fraction * massSun * SOLAR_MASS_KG * C_SI ** 2) /
    (lumSun * L_SUN_W) /
    SECONDS_PER_YEAR
  );
}
/** Time to radiate the gravitational energy: G M^2 / (R L), years. */
export function kelvinHelmholtzYr(massSun, radiusSun, lumSun) {
  return (
    (G_SI * (massSun * SOLAR_MASS_KG) ** 2) /
    (radiusSun * SOLAR_RADIUS_M * lumSun * L_SUN_W) /
    SECONDS_PER_YEAR
  );
}
/** Free-fall time, sqrt(R^3 / GM), seconds: how fast a star answers a change of pressure. */
export function dynamicalSeconds(massSun, radiusSun) {
  return Math.sqrt(
    (radiusSun * SOLAR_RADIUS_M) ** 3 / (G_SI * massSun * SOLAR_MASS_KG)
  );
}

/** The zero-age models of the MIST grid: one per track, mass, luminosity, radius, Teff, main-sequence life. */
export function zeroAgeModels() {
  return trackIds()
    .map(id => {
      const m = TRACKS[id].initialMassSun;
      const s = mainSequenceAt(m, 0);
      return {
        massSun: m,
        luminositySun: s.luminositySun,
        radiusSun: s.radiusSun,
        teffK: s.teffK,
        mainSequenceYr: s.mainSequenceYr,
      };
    })
    .sort((p, q) => p.massSun - q.massSun);
}

/**
 * Least-squares line of log10 y on log10 x: the exponent, its intercept and
 * the residual of every point in dex.
 */
export function fitPowerLaw(xs, ys) {
  const n = xs.length;
  const lx = xs.map(Math.log10);
  const ly = ys.map(Math.log10);
  const mx = lx.reduce((s, v) => s + v, 0) / n;
  const my = ly.reduce((s, v) => s + v, 0) / n;
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    sxx += (lx[i] - mx) ** 2;
    sxy += (lx[i] - mx) * (ly[i] - my);
  }
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  const residuals = ly.map((v, i) => v - (intercept + slope * lx[i]));
  return { slope, intercept, residuals };
}

/** Residuals in dex of the zero-age models against a power law of the given exponent through the Sun (M = 1). */
export function residualsAgainst(models, key, exponent, anchor) {
  return models.map(
    m =>
      Math.log10(m[key]) -
      (Math.log10(anchor) + exponent * Math.log10(m.massSun))
  );
}
