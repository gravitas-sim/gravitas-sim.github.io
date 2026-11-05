// =============================================================================
// SED kernel: the blackbody model per unit solid angle and its tabulated basis (Prompt 245)
// -----------------------------------------------------------------------------
// The model of a point is the f_nu of a blackbody of temperature T and angular
// radius theta (radians): a disk of solid angle pi theta^2 radiating B_nu, so
//
//   monochromatic   f_nu = pi theta^2 B_nu(T)
//   band-integrated the photon-weighted mean f_nu through the band (radiation kernel
//                   meanFluxJy) of pi theta^2 B_lambda(T), never f_nu at the pivot.
//
// Both are proportional to theta^2, so ln f = u + g(ln T) with u = ln theta^2 and g the
// log of the model per unit theta^2. g is tabulated once per point set on a uniform grid
// in ln T (a "basis") and read back by 4-point Lagrange interpolation, so a fit, an
// interval and an ensemble of thousands of fits cost a table and not a band integral each.
// =============================================================================

import {
  C_LIGHT,
  H_PLANCK,
  K_BOLTZMANN,
  JY,
  blackbodySed,
  meanFluxJy,
  planckNu,
} from '../radiation/index.js';

const { Math, Float64Array } = globalThis;

/** The temperature domain of a fit and the grid on it. */
export const DOMAIN = Object.freeze({ minK: 800, maxK: 50000, nodes: 1200 });

/** ln of the monochromatic model per unit theta^2 (Jy), without underflow in the Wien tail. */
export function lnMonochromatic(T, lambdaNm) {
  const nu = C_LIGHT / (lambdaNm * 1e-9);
  const x = (H_PLANCK * nu) / (K_BOLTZMANN * T);
  const lnExpm1 =
    x > 30 ? x + Math.log1p(-Math.exp(-x)) : Math.log(Math.expm1(x));
  const lnBnu =
    Math.log((2 * H_PLANCK) / (C_LIGHT * C_LIGHT)) + 3 * Math.log(nu) - lnExpm1;
  return Math.log(Math.PI) + lnBnu - Math.log(JY);
}

/** The monochromatic model per unit theta^2 in Jy (for tests against the Planck function). */
export const monochromaticJy = (T, lambdaNm) =>
  (Math.PI * planckNu(C_LIGHT / (lambdaNm * 1e-9), T)) / JY;

/** The band-integrated model per unit theta^2 in Jy: the photon-weighted mean f_nu of pi B_lambda. */
export const bandIntegratedJy = (band, T) =>
  meanFluxJy(band, blackbodySed(T, 1));

/** The signature of a point set's model: what the basis depends on and nothing else. */
export const basisSignature = (points, domain = DOMAIN) =>
  `${domain.minK}:${domain.maxK}:${domain.nodes}|` +
  points
    .map(p =>
      p.kind === 'band-integrated' ? `b:${p.band}` : `m:${p.lambdaNm}`
    )
    .join(',');

/**
 * Tabulate g_i(ln T) for every point on the domain's uniform ln T grid.
 * @param {object[]} points - Normalised points
 * @param {Map<string, object>|object} bands - Decoded bands by id
 * @param {object} [domain]
 */
export function makeBasis(points, bands, domain = DOMAIN) {
  const n = domain.nodes;
  const v0 = Math.log(domain.minK);
  const dv = (Math.log(domain.maxK) - v0) / (n - 1);
  const get = b => (bands instanceof Map ? bands.get(b) : bands[b]);
  const g = points.map(p => {
    const row = new Float64Array(n);
    const band = p.kind === 'band-integrated' ? get(p.band) : null;
    for (let k = 0; k < n; k++) {
      const T = Math.exp(v0 + k * dv);
      row[k] = band
        ? Math.log(Math.max(bandIntegratedJy(band, T), 1e-300))
        : lnMonochromatic(T, p.lambdaNm);
    }
    return row;
  });
  return { signature: basisSignature(points, domain), domain, v0, dv, n, g };
}

/** Lagrange weights for 4 nodes at 0..3 and the value and derivative at t. */
function weights(t) {
  const a = t - 1;
  const b = t - 2;
  const c = t - 3;
  return [
    [-(a * b * c) / 6, -(b * c + a * c + a * b) / 6],
    [(t * b * c) / 2, (b * c + t * c + t * b) / 2],
    [-(t * a * c) / 2, -(a * c + t * c + t * a) / 2],
    [(t * a * b) / 6, (a * b + t * b + t * a) / 6],
  ];
}

/**
 * g_i(v) and dg_i/dv at v = ln T by 4-point Lagrange interpolation of the basis.
 * @returns {[number, number]}
 */
export function interpolate(basis, i, v) {
  const { v0, dv, n, g } = basis;
  const x = (v - v0) / dv;
  const k0 = Math.min(Math.max(Math.floor(x) - 1, 0), n - 4);
  const w = weights(x - k0);
  const row = g[i];
  let val = 0;
  let der = 0;
  for (let j = 0; j < 4; j++) {
    val += w[j][0] * row[k0 + j];
    der += w[j][1] * row[k0 + j];
  }
  return [val, der / dv];
}

/**
 * The model of a fit at a wavelength: monochromatic f_nu in Jy, labelled extrapolated when
 * the wavelength is outside the range of the points that fixed it.
 * @param {{T: number, theta: number, rangeNm: [number, number]}} model
 * @param {number} lambdaNm
 */
export function evaluateModel(model, lambdaNm) {
  const [lo, hi] = model.rangeNm;
  return {
    fnuJy: Math.exp(
      2 * Math.log(model.theta) + lnMonochromatic(model.T, lambdaNm)
    ),
    extrapolated: lambdaNm < lo || lambdaNm > hi,
    rangeNm: [lo, hi],
  };
}
