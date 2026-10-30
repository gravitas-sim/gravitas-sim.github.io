// =============================================================================
// The model's colour-magnitude diagram: an isochrone seen through the errors
// -----------------------------------------------------------------------------
// m_jk is the relative number of stars the model expects in row j (g, 0.1 mag)
// and colour column k (g - r, 0.04 mag) of the window. Each short piece of the
// isochrone (./isochrones.js `pieces`) is moved to the cluster (distance
// modulus dm; reddening E in colour and R E in g), given independent Gaussian
// errors in g and in r from the error model at its own apparent magnitude, and
// its weight is spread over the bins: the g error by five Gauss-Hermite nodes
// (each node assigns the star to a row), the colour error exactly, because a
// star's colour is g' - r' = (g_true + n_g - r_true - n_r), so at a node's g
// error the colour is normal with the r error's width about the shifted
// colour. The errors of g and of colour are therefore correlated exactly as
// independent errors in two bands make them.
// =============================================================================

const { Math, Float64Array } = globalThis;
import { COLS, ERROR_MODEL, ROWS, WINDOW } from './constants.js';

// Probabilists' Gauss-Hermite, five nodes, weights summing to 1.
const NODES = [-2.8569700138728056, -1.3556261799742659, 0, 1.3556261799742659, 2.8569700138728056];
const WEIGHTS = [0.011257411327720691, 0.2220759220056126, 0.5333333333333333, 0.2220759220056126, 0.011257411327720691];

// The standard normal CDF by a table and linear interpolation (error < 4e-6).
const T_LO = -8;
const T_HI = 8;
const T_STEP = 1 / 256;
const TABLE = (() => {
  const n = Math.round((T_HI - T_LO) / T_STEP) + 1;
  const t = new Float64Array(n);
  // erf by the series of Abramowitz and Stegun 7.1.5 for |x| < 3, the
  // continued tail beyond, in double precision.
  for (let i = 0; i < n; i++) t[i] = normalCdfExact(T_LO + i * T_STEP);
  return t;
})();

function erfSeries(x) {
  let term = x;
  let sum = x;
  const x2 = x * x;
  for (let n = 1; n < 80; n++) {
    term *= -x2 / n;
    const add = term / (2 * n + 1);
    sum += add;
    if (Math.abs(add) < 1e-17 * Math.abs(sum)) break;
  }
  return (2 / Math.sqrt(Math.PI)) * sum;
}
function erfcFraction(x) {
  // erfc for x >= 2 by the continued fraction (Lentz), accurate to 1e-15.
  let f = 0;
  for (let k = 60; k >= 1; k--) f = k / 2 / (x + f);
  return Math.exp(-x * x) / (Math.sqrt(Math.PI) * (x + f));
}
function normalCdfExact(z) {
  const x = Math.abs(z) / Math.SQRT2;
  const tail = x < 2 ? 0.5 * (1 - erfSeries(x)) : 0.5 * erfcFraction(x);
  return z >= 0 ? 1 - tail : tail;
}

/** Phi(z) from the table (0 below -8, 1 above 8). */
export function cdf(z) {
  if (z <= T_LO) return 0;
  if (z >= T_HI) return 1;
  const u = (z - T_LO) / T_STEP;
  const i = Math.floor(u);
  const f = u - i;
  return TABLE[i] + f * (TABLE[i + 1] - TABLE[i]);
}
export { normalCdfExact };

/** The error model's sigma at an apparent magnitude m, for either band. */
export const sigmaAt = (m, em = ERROR_MODEL) =>
  Math.sqrt(em.floor ** 2 + (em.sigmaAt * 10 ** (0.4 * (m - em.magAt))) ** 2);

/**
 * The model diagram.
 * @param {{c: Float64Array, g: Float64Array, w: Float64Array}} pcs - pieces
 * @param {{dm: number, E: number, R: number, errorModel?: object,
 *   constantSigma?: number}} o - constantSigma replaces the error model (tests)
 * @returns {Float64Array} ROWS x COLS, row-major
 */
export function hessOf(pcs, o) {
  const { dm, E, R } = o;
  const em = o.errorModel ?? ERROR_MODEL;
  const out = new Float64Array(ROWS * COLS);
  const [g0, g1] = WINDOW.g;
  const [c0, c1] = WINDOW.colour;
  const dg = WINDOW.rowMag;
  const dc = WINDOW.colourWidth;
  const shiftG = dm + R * E;
  for (let i = 0; i < pcs.w.length; i++) {
    const gApp = pcs.g[i] + shiftG;
    const cApp = pcs.c[i] + E;
    const rApp = gApp - cApp;
    const sg = o.constantSigma ?? sigmaAt(gApp, em);
    const sr = o.constantSigma ?? sigmaAt(rApp, em);
    if (gApp - 6 * sg >= g1 || gApp + 6 * sg < g0) continue;
    if (cApp - 6 * sr >= c1 || cApp + 6 * sr < c0) continue;
    const w = pcs.w[i];
    for (let v = 0; v < 5; v++) {
      const gp = gApp + sg * NODES[v];
      const j = Math.floor((gp - g0) / dg);
      if (j < 0 || j >= ROWS) continue;
      const mu = cApp + sg * NODES[v];
      let k0 = Math.floor((mu - 6 * sr - c0) / dc);
      let k1 = Math.floor((mu + 6 * sr - c0) / dc);
      if (k0 < 0) k0 = 0;
      if (k1 >= COLS) k1 = COLS - 1;
      if (k1 < k0) continue;
      const wv = w * WEIGHTS[v];
      let prev = cdf((c0 + k0 * dc - mu) / sr);
      const base = j * COLS;
      for (let k = k0; k <= k1; k++) {
        const next = cdf((c0 + (k + 1) * dc - mu) / sr);
        out[base + k] += wv * (next - prev);
        prev = next;
      }
    }
  }
  return out;
}
