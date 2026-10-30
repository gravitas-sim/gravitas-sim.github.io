// =============================================================================
// The statistic: a magnitude-conditional binned multinomial deviance
// -----------------------------------------------------------------------------
// Stars are binned by g into rows and by g - r into columns (./constants.js).
// The model gives, row by row, the probability of each colour column,
//   p_jk = (1 - eps) m_jk / M_j + eps u_k,   M_j = sum_k m_jk,   u_k = 1 / COLS
// (a row the isochrone does not reach has p_jk = u_k), and the statistic is
//   D = -2 sum n_jk ln p_jk + 2 sum n_jk ln(n_jk / n_j),
// zero when every row's counts follow its own fractions. The row totals n_j
// are conditioned on, so the sample's selection in magnitude (SEGUE's targeting,
// say) and the luminosity function do not enter; the floor eps u_k is the share
// of the members' cut that is not the cluster, and bounds a star's penalty at
// -2 ln(eps u). Equivalent to a Poisson likelihood with a free scale per row,
// profiled out.
// =============================================================================

const { Math, Float64Array } = globalThis;
import { COLS, ROWS, WINDOW } from './constants.js';

const ROW_RELATIVE_FLOOR = 1e-6;

/**
 * Bin stars. A star outside the window, or with a missing g or colour, is
 * counted in `dropped` and used nowhere.
 * @param {ArrayLike<number>} g
 * @param {ArrayLike<number>} colour - g - r
 */
export function binStars(g, colour) {
  const cells = new Map();
  const rows = new Float64Array(ROWS);
  let n = 0;
  let dropped = 0;
  for (let i = 0; i < g.length; i++) {
    const j = Math.floor((g[i] - WINDOW.g[0]) / WINDOW.rowMag);
    const k = Math.floor((colour[i] - WINDOW.colour[0]) / WINDOW.colourWidth);
    if (
      !Number.isFinite(g[i]) ||
      !Number.isFinite(colour[i]) ||
      j < 0 ||
      j >= ROWS ||
      k < 0 ||
      k >= COLS
    ) {
      dropped++;
      continue;
    }
    const idx = j * COLS + k;
    cells.set(idx, (cells.get(idx) ?? 0) + 1);
    rows[j]++;
    n++;
  }
  const list = [...cells.entries()].sort((a, b) => a[0] - b[0]);
  let saturated = 0;
  for (const [idx, c] of list)
    saturated += 2 * c * Math.log(c / rows[Math.floor(idx / COLS)]);
  return {
    n,
    dropped,
    rows,
    cells: Int32Array.from(list.map(e => e[0])),
    counts: Float64Array.from(list.map(e => e[1])),
    saturated,
  };
}

/** The all-field deviance: every row's colours uniform. */
export function floorDeviance(data) {
  return 2 * data.n * Math.log(COLS) + data.saturated;
}

/**
 * The deviance of binned stars against a model diagram.
 * @param {Float64Array} hess - ROWS x COLS
 * @param {ReturnType<typeof binStars>} data
 * @param {number} eps - the contamination floor
 */
export function deviance(hess, data, eps) {
  const sums = new Float64Array(ROWS);
  let maxSum = 0;
  for (let j = 0; j < ROWS; j++) {
    let s = 0;
    const b = j * COLS;
    for (let k = 0; k < COLS; k++) s += hess[b + k];
    sums[j] = s;
    if (s > maxSum) maxSum = s;
  }
  const u = 1 / COLS;
  let d = data.saturated;
  const { cells, counts } = data;
  for (let i = 0; i < cells.length; i++) {
    const idx = cells[i];
    const j = (idx / COLS) | 0;
    const s = sums[j];
    const p =
      s > ROW_RELATIVE_FLOOR * maxSum
        ? (1 - eps) * (hess[idx] / s) + eps * u
        : u;
    d -= 2 * counts[i] * Math.log(p);
  }
  return d;
}

/** The most one star can add to D at this floor. */
export const maxPenalty = eps => -2 * Math.log(eps / COLS);

/**
 * The model's probabilities p_jk, ROWS x COLS: what `deviance` uses, as a
 * matrix (for the panel's diagram and the validator).
 */
export function probabilities(hess, eps) {
  const p = new Float64Array(ROWS * COLS);
  const sums = new Float64Array(ROWS);
  let maxSum = 0;
  for (let j = 0; j < ROWS; j++) {
    let s = 0;
    for (let k = 0; k < COLS; k++) s += hess[j * COLS + k];
    sums[j] = s;
    if (s > maxSum) maxSum = s;
  }
  const u = 1 / COLS;
  for (let j = 0; j < ROWS; j++) {
    const on = sums[j] > ROW_RELATIVE_FLOOR * maxSum;
    for (let k = 0; k < COLS; k++)
      p[j * COLS + k] = on
        ? (1 - eps) * (hess[j * COLS + k] / sums[j]) + eps * u
        : u;
  }
  return p;
}
