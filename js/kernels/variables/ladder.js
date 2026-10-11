// =============================================================================
// The first rung of the distance ladder: Leavitt's law
// -----------------------------------------------------------------------------
// Cepheids obey m = a + b (log10 P - 1): the longer the period, the brighter
// the star (Leavitt & Pickering 1912, Harvard Circ. 173). Calibrate the
// relation where the distance is known, and the offset of a Cepheid sample from
// it elsewhere is that sample's distance modulus:
//
//     mu_host = (<m>_host - <m>_anchor) - b (<x>_host - <x>_anchor) + mu_anchor
//
// with x = log10 P - 1 and the slope b taken from the anchor (the host's few
// Cepheids fix an offset better than a slope). Every term has an error, and
// the budget names them (ladderDistance): the scatter of the host's stars, of
// the anchor's, the slope's error carried across the difference in mean
// period, and the anchor's own distance. The metallicity of the host and the
// crowding of its stars are not terms here; they are stated assumptions.
//
// Magnitudes are Wesenheit magnitudes, m_W = F160W - R (F555W - F814W) with
// R = 0.386 (Riess et al. 2022, ApJL 934, L7), which are reddening-free if the
// extinction law's R is that one. wesenheitResidual checks that against the
// radiation kernel's own law: a star's dust must cancel.
// =============================================================================

import { extinctionRatio } from '../radiation/extinction.js';

const { Math } = globalThis;

export const VERSION = '1.0.0';

/** Pivot wavelengths, nm (HST WFC3 F555W, F814W and F160W), as the SVO filter service lists them. */
export const WFC3_PIVOT_NM = Object.freeze({
  F555W: 530.8,
  F814W: 802.4,
  F160W: 1536.9,
});

/** The Wesenheit coefficient of Riess et al. 2022: A(F160W) over A(F555W) - A(F814W) for R_V = 3.3. */
export const WESENHEIT_R = 0.386;

/**
 * The reddening a Wesenheit magnitude does not remove, per magnitude of
 * A_V, for a law and R_V: A_F160W - R (A_F555W - A_F814W), over A_V.
 * Zero would be a perfectly reddening-free combination.
 */
export function wesenheitResidual(law, rv = 3.3, r = WESENHEIT_R) {
  const A = Object.fromEntries(
    Object.entries(WFC3_PIVOT_NM).map(([k, nm]) => [k, extinctionRatio(nm, rv, law)])
  );
  return {
    A,
    exact: A.F160W / (A.F555W - A.F814W),
    residual: A.F160W - r * (A.F555W - A.F814W),
  };
}

/**
 * Ordinary least squares y = a + b x with the covariance, the scatter of the
 * residuals, and optional one-sided sigma clipping done once.
 * @returns {{n: number, a: number, b: number, sigmaA: number, sigmaB: number,
 *   rms: number, xMean: number, yMean: number, covAB: number}}
 */
export function fitLine(x, y) {
  const n = x.length;
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < n; i++) {
    sx += x[i];
    sy += y[i];
  }
  const xm = sx / n;
  const ym = sy / n;
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    sxx += (x[i] - xm) ** 2;
    sxy += (x[i] - xm) * (y[i] - ym);
  }
  const b = sxy / sxx;
  const a = ym - b * xm;
  let ss = 0;
  for (let i = 0; i < n; i++) ss += (y[i] - a - b * x[i]) ** 2;
  const s2 = ss / (n - 2);
  const sigmaB = Math.sqrt(s2 / sxx);
  return {
    n,
    a,
    b,
    sigmaA: Math.sqrt(s2 * (1 / n + (xm * xm) / sxx)),
    sigmaB,
    rms: Math.sqrt(s2),
    xMean: xm,
    yMean: ym,
    covAB: (-xm * s2) / sxx,
  };
}

/**
 * Leavitt's law from a sample: m_W against x = log10 P - 1, with one pass of
 * sigma clipping at `clip` sigma and a period range.
 * @param {ArrayLike<number>} periods - days
 * @param {ArrayLike<number>} mags
 * @returns {ReturnType<typeof fitLine> & {kept: number[], clipped: number}}
 */
export function fitLeavitt(periods, mags, { pMin = 5, pMax = 120, clip = 3.3 } = {}) {
  const rows = [];
  for (let i = 0; i < periods.length; i++)
    if (periods[i] > pMin && periods[i] < pMax)
      rows.push({ i, x: Math.log10(periods[i]) - 1, y: mags[i] });
  let f = fitLine(rows.map(r => r.x), rows.map(r => r.y));
  const keep = rows.filter(r => Math.abs(r.y - f.a - f.b * r.x) <= clip * f.rms);
  f = fitLine(keep.map(r => r.x), keep.map(r => r.y));
  return { ...f, kept: keep.map(r => r.i), clipped: rows.length - keep.length };
}

export const distanceFromModulus = mu => 10 ** (mu / 5 + 1); // parsecs
export const distanceError = (mu, sigma) =>
  distanceFromModulus(mu) * (Math.LN10 / 5) * sigma;

/**
 * A host's distance modulus from an anchor sample of known distance.
 * @param {{periods: ArrayLike<number>, mags: ArrayLike<number>}} host
 * @param {{periods: ArrayLike<number>, mags: ArrayLike<number>}} anchor
 * @param {{mu: number, sigma: number}} anchorDistance - the anchor's modulus
 * @returns {{mu: number, sigma: number, budget: Array<{id: string, sigma: number}>,
 *   slope: number, slopeError: number, hostN: number, anchorN: number,
 *   distanceMpc: number, distanceErrorMpc: number}}
 */
export function ladderDistance(host, anchor, anchorDistance, opts = {}) {
  const fa = fitLeavitt(anchor.periods, anchor.mags, opts);
  const keep = (s, f) => {
    // The host uses the same period range, and the anchor's clipped stars are dropped.
    const rows = [];
    for (let i = 0; i < s.periods.length; i++)
      if (s.periods[i] > (opts.pMin ?? 5) && s.periods[i] < (opts.pMax ?? 120))
        rows.push(i);
    return f ? rows.filter(i => f.kept.includes(i)) : rows;
  };
  const ai = keep(anchor, fa);
  const hi = keep(host, null);
  const mean = (s, idx, g) => idx.reduce((t, i) => t + g(s, i), 0) / idx.length;
  const xOf = (s, i) => Math.log10(s.periods[i]) - 1;
  const yOf = (s, i) => s.mags[i];
  const xa = mean(anchor, ai, xOf);
  const ya = mean(anchor, ai, yOf);
  const xh = mean(host, hi, xOf);
  const yh = mean(host, hi, yOf);
  // The scatter about the relation, not about the mean: remove the slope's trend.
  const resid = (s, idx, xm, ym) =>
    Math.sqrt(
      idx.reduce((t, i) => t + (yOf(s, i) - ym - fa.b * (xOf(s, i) - xm)) ** 2, 0) /
        (idx.length - 1)
    );
  const sHost = resid(host, hi, xh, yh);
  const sAnchor = resid(anchor, ai, xa, ya);
  const mu = yh - ya - fa.b * (xh - xa) + anchorDistance.mu;
  const budget = [
    { id: 'host', sigma: sHost / Math.sqrt(hi.length) },
    { id: 'anchor', sigma: sAnchor / Math.sqrt(ai.length) },
    { id: 'slope', sigma: Math.abs(xh - xa) * fa.sigmaB },
    { id: 'anchorDistance', sigma: anchorDistance.sigma },
  ];
  const sigma = Math.sqrt(budget.reduce((s, b) => s + b.sigma * b.sigma, 0));
  const pc = distanceFromModulus(mu);
  return {
    mu,
    sigma,
    budget,
    slope: fa.b,
    slopeError: fa.sigmaB,
    hostN: hi.length,
    anchorN: ai.length,
    scatterHost: sHost,
    distanceMpc: pc / 1e6,
    distanceErrorMpc: distanceError(mu, sigma) / 1e6,
  };
}

/** Two measured distance moduli compared: the difference in units of the combined error. */
export const tension = (a, b) => (a.mu - b.mu) / Math.hypot(a.sigma, b.sigma);
