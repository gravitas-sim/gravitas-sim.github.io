// =============================================================================
// What the transit model gained in Prompt 225, pure and DOM-free
// -----------------------------------------------------------------------------
//   claretLaw          a four-coefficient limb-darkening law, checked: positive
//                      everywhere and brightest at the centre, or refused
//   lookupClaret       coefficients from a table by Teff, logg and [Fe/H]
//                      (multilinear on a complete grid; a star outside the
//                      table is refused, never extrapolated)
//   confidenceEllipse  the ellipse of a 2 x 2 covariance, and of two
//                      parameters of a fit (scaled as the fit's sigmas are)
//   transitChecks      after a fit: whether the radius ratio and the impact
//                      parameter are fixed by the data, and whether the
//                      residuals in transit look like noise
//
// Equations, limits, assumptions and the validation table are in
// TRANSIT_DELTA.md. The ensembles that measure the checks are
// tools/transit-delta-validate.mjs against tests/fixtures/transit-delta/.
// =============================================================================

import { chi2Sf } from '../kernels/statistics/special.js';
import { claretIntensity, halfDuration } from './transit.js';

const { Math, Number } = globalThis;

/**
 * Whether four coefficients are a star: finite, I(mu) above 0 everywhere and
 * not falling toward the centre. Null when they are, else why not.
 * @param {ArrayLike<number>} c
 */
export function claretRefusal(c) {
  if (!c || c.length !== 4 || !Array.from(c).every(Number.isFinite))
    return 'the four-coefficient law needs four finite numbers c1 to c4';
  let prev = -Infinity;
  for (let i = 0; i <= 200; i++) {
    const mu = i / 200;
    const v = claretIntensity(mu, c);
    if (!(v > 0))
      return 'these coefficients give a star with no light at some angle (I <= 0)';
    if (v < prev - 1e-12)
      return 'these coefficients make the limb brighter than a point inside it';
    prev = v;
  }
  return null;
}

/**
 * Multilinear coefficients from a table.
 * @param {{rows: Array<{teff: number, logg: number, feh: number, c: number[]}>}} table
 *   a complete grid of Teff, logg and [Fe/H]
 * @param {{teff: number, logg: number, feh: number}} star
 * @returns {{status: 'ok', c: number[]}|{status: 'refused', code: string, why: string}}
 */
export function lookupClaret(table, star) {
  const axes = ['teff', 'logg', 'feh'].map(key => {
    const v = [...new Set(table.rows.map(r => r[key]))].sort((a, b) => a - b);
    return { key, v };
  });
  const index = new Map(
    table.rows.map(r => [`${r.teff}|${r.logg}|${r.feh}`, r.c])
  );
  const grid = axes.reduce((n, a) => n * a.v.length, 1);
  if (index.size !== grid || grid !== table.rows.length)
    return {
      status: 'refused',
      code: 'incomplete',
      why: 'the table is not a complete grid of Teff, logg and [Fe/H]',
    };
  const cells = [];
  for (const { key, v } of axes) {
    const x = star[key];
    if (!Number.isFinite(x))
      return {
        status: 'refused',
        code: 'missing',
        why: `${key} is not a number`,
      };
    if (x < v[0] || x > v[v.length - 1])
      return {
        status: 'refused',
        code: 'outside',
        why: `${key} ${x} is outside the table (${v[0]} to ${v[v.length - 1]})`,
      };
    let i = v.findIndex(g => g > x) - 1;
    if (i < 0) i = v.length - 2;
    if (v.length === 1) cells.push({ lo: v[0], hi: v[0], w: 0 });
    else
      cells.push({ lo: v[i], hi: v[i + 1], w: (x - v[i]) / (v[i + 1] - v[i]) });
  }
  const c = [0, 0, 0, 0];
  for (let a = 0; a < 2; a++)
    for (let b = 0; b < 2; b++)
      for (let d = 0; d < 2; d++) {
        const w =
          (a ? cells[0].w : 1 - cells[0].w) *
          (b ? cells[1].w : 1 - cells[1].w) *
          (d ? cells[2].w : 1 - cells[2].w);
        if (w === 0) continue;
        const node = index.get(
          `${a ? cells[0].hi : cells[0].lo}|${b ? cells[1].hi : cells[1].lo}|${d ? cells[2].hi : cells[2].lo}`
        );
        for (let k = 0; k < 4; k++) c[k] += w * node[k];
      }
  return { status: 'ok', c };
}

/** The Mahalanobis radius squared that holds `level` of a 2-D Gaussian. */
export const ellipseScale2 = level => -2 * Math.log(1 - level);

/**
 * The ellipse of a 2 x 2 covariance [[a, b], [b, c]] at a probability level.
 * @returns {{semiMajor: number, semiMinor: number, angle: number,
 *   points: Array<[number, number]>}|null} offsets from the centre; the angle
 *   of the major axis from the x axis, radians; null if the matrix is not
 *   positive definite
 */
export function confidenceEllipse(cov, level = 0.6827, n = 90) {
  const a = cov[0][0];
  const b = cov[0][1];
  const c = cov[1][1];
  const half = (a + c) / 2;
  const root = Math.sqrt(((a - c) / 2) ** 2 + b * b);
  const l1 = half + root;
  const l2 = half - root;
  if (!(l2 > 0) || !Number.isFinite(l1)) return null;
  const s = Math.sqrt(ellipseScale2(level));
  const angle = 0.5 * Math.atan2(2 * b, a - c);
  const A = s * Math.sqrt(l1);
  const B = s * Math.sqrt(l2);
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  const points = [];
  for (let i = 0; i <= n; i++) {
    const t = (2 * Math.PI * i) / n;
    const u = A * Math.cos(t);
    const v = B * Math.sin(t);
    points.push([u * ca - v * sa, u * sa + v * ca]);
  }
  return { semiMajor: A, semiMinor: B, angle, scale: s, points };
}

/**
 * The ellipse of two fitted parameters of a result: the fit's covariance,
 * scaled by the same factor the stated sigmas carry (reduced chi-square above
 * one; or, unweighted, always), centred on the best fit.
 * @param {object} fit - a fitOnce() result
 * @returns {null|{x: string, y: string, center: number[], ellipse: object,
 *   correlation: number}}
 */
export function ellipseOfFit(fit, x, y, level = 0.6827) {
  const ix = fit.free.indexOf(x);
  const iy = fit.free.indexOf(y);
  if (ix < 0 || iy < 0 || !fit.covariance) return null;
  const px = fit.parameters.find(p => p.name === x);
  const py = fit.parameters.find(p => p.name === y);
  const sx = Math.sqrt(fit.covariance[ix][ix]);
  const factor = Number.isFinite(px.sigma) && sx > 0 ? (px.sigma / sx) ** 2 : 1;
  const cov = [
    [fit.covariance[ix][ix] * factor, fit.covariance[ix][iy] * factor],
    [fit.covariance[iy][ix] * factor, fit.covariance[iy][iy] * factor],
  ];
  const ellipse = confidenceEllipse(cov, level);
  if (!ellipse) return null;
  return {
    x,
    y,
    center: [px.value, py.value],
    ellipse,
    correlation: cov[0][1] / Math.sqrt(cov[0][0] * cov[1][1]),
  };
}

/** The tolerance the rank check uses is its own; these are this check's. */
const GRAZING_CORRELATION = 0.95;
const RESIDUAL_P = 0.01;

/**
 * Whether the radius ratio and the impact parameter are fixed by the data.
 * 'not-constrained' when EITHER the fitted b plus its stated sigma reaches
 * 1 - k (a flat-bottomed solution is not excluded, so a V-shape is ambiguous)
 * OR the rank check names k or b. 'fixed' when b was held. Otherwise
 * 'constrained'. The correlation of k and b is reported beside the status and
 * is not a reason (amendment AM2: the committed rule also flagged a pair
 * correlated beyond 0.95, and every clean transit of the ensemble is, 0.98 to
 * 0.99, so it said "not constrained" for all of them). The committed rule is
 * kept for the validator as `{ committed: true }`, so that its legs D1 and D2
 * still measure it.
 * @param {object} fit - a fitOnce() result
 * @param {{committed?: boolean}} [options]
 */
export function constraintKB(fit, options = {}) {
  const k = fit.parameters.find(p => p.name === 'k');
  const b = fit.parameters.find(p => p.name === 'b');
  if (!k || !b) return null;
  if (b.mode === 'fixed' || k.mode === 'fixed')
    return { status: 'fixed', reasons: [] };
  const reasons = [];
  if (b.value + (b.sigma || 0) >= 1 - k.value) reasons.push('grazing');
  if (fit.rank?.notConstrained?.some(n => n === 'k' || n === 'b'))
    reasons.push('rank');
  const ik = fit.free.indexOf('k');
  const ib = fit.free.indexOf('b');
  const correlation =
    fit.correlation && ik >= 0 && ib >= 0 ? fit.correlation[ik][ib] : null;
  if (
    options.committed &&
    correlation !== null &&
    Math.abs(correlation) > GRAZING_CORRELATION
  )
    reasons.push('correlated');
  return {
    status: reasons.length ? 'not-constrained' : 'constrained',
    reasons,
    correlation,
    bPlusSigma: b.value + (b.sigma || 0),
    grazingLimit: 1 - k.value,
  };
}

/**
 * The residuals in transit against the noise the error bars promise: the
 * chi-square of the points within T14 / 2 + exposure / 2 of a mid-transit,
 * against its count, one-sided. A spot the planet crosses, or any shape the
 * model does not have, adds to it. Fails when p < 0.01 or the fit already
 * carries the correlatedNoise warning.
 * @param {object} fit - a fitOnce() result
 * @param {object} data - dataFrom()
 */
export function residualTest(fit, data, exposure = 0) {
  const v = Object.fromEntries(fit.parameters.map(p => [p.name, p.value]));
  const half = halfDuration(v);
  if (!Number.isFinite(half)) return null;
  const reach = half + exposure / 2;
  let chi2 = 0;
  let m = 0;
  for (let i = 0; i < data.x.length; i++) {
    const cycles = (data.x[i] - v.t0) / v.P;
    const dt = (cycles - Math.round(cycles)) * v.P;
    if (Math.abs(dt) > reach) continue;
    const s = data.sigma ? data.sigma[i] : fit.residualRms;
    chi2 += (fit.residuals[i] / s) ** 2;
    m++;
  }
  if (m < 5) return null;
  const p = chi2Sf(chi2, m);
  const correlated = fit.warnings?.some(w => w.code === 'correlatedNoise');
  return {
    chi2,
    points: m,
    p,
    correlatedNoise: !!correlated,
    fails: p < RESIDUAL_P || !!correlated,
  };
}

/** Everything the transit family adds to a result. */
export function transitChecks(fit, data, request) {
  return {
    kb: constraintKB(fit),
    residual: residualTest(fit, data, request.settings?.exposure || 0),
  };
}
