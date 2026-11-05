// =============================================================================
// SED kernel: the blackbody fit (Prompt 245)
// -----------------------------------------------------------------------------
// The data are log flux densities y_i = ln f_nu,i with standard deviations s_i
// (a magnitude error is 0.4 ln 10 times itself; a flux error is sigma / f; a
// nonsimultaneous point's is widened in quadrature, points.js). The model is
//
//     y_i = u + g_i(ln T)         u = ln theta^2, g_i the log model per unit theta^2 (model.js)
//
// With weights w_i = 1 / s_i^2 the scale u is the weighted mean of y_i - g_i for every
// T, so it is profiled out exactly and chi-square is a function of ln T alone. The
// interval of T is the set where that profile stays within chi2Quantile(level, 1) of its
// minimum (the statistics kernel's profileInterval, polished by bisection on the
// interpolated profile); a side the profile never reaches is open and the fit says
// 'not-constrained' rather than reporting a temperature the points cannot fix. The
// covariance of (u, ln T) is (J^T W J)^-1 at the minimum.
//
// What the result is: the colour temperature of the points through a blackbody, and the
// angular radius of the blackbody with that colour. It is not an effective temperature,
// is not corrected for interstellar reddening, and is only supported between the
// shortest and the longest wavelength of the points that fixed it (range, below).
// =============================================================================

import { PC_M, SIGMA_SB } from '../radiation/index.js';
import {
  chi2Quantile,
  chi2Sf,
  levelOfSigma,
  profileInterval,
  sigmaOfLevel,
} from '../statistics/index.js';
import { applyNonsimultaneity, normalizePoints } from './points.js';
import { DOMAIN, basisSignature, interpolate, makeBasis } from './model.js';

const { Math, Float64Array } = globalThis;

const ONE_SIGMA = levelOfSigma(1);
export const DEFAULT_LEVELS = Object.freeze([ONE_SIGMA, 0.95]);
/** The adequacy test: the fit is adequate when its chi-square p-value is at least this. */
export const ADEQUACY_ALPHA = 0.01;

export const TEMPERATURE_LABEL =
  'colour temperature of the points through a blackbody; not an effective temperature, and not corrected for interstellar reddening';

/** chi-square of the u-profiled fit on every node of the basis grid. */
export function profileChi2(pts, basis) {
  const n = pts.length;
  const w = pts.map(p => 1 / (p.sigmaLnEff * p.sigmaLnEff));
  const y = pts.map(p => p.lnF);
  let s = 0;
  for (let i = 0; i < n; i++) s += w[i];
  const out = new Float64Array(basis.n);
  for (let k = 0; k < basis.n; k++) {
    let sr = 0;
    for (let i = 0; i < n; i++) sr += w[i] * (y[i] - basis.g[i][k]);
    const u = sr / s;
    let c = 0;
    for (let i = 0; i < n; i++) {
      const r = y[i] - basis.g[i][k] - u;
      c += w[i] * r * r;
    }
    out[k] = c;
  }
  return out;
}

/** chi-square and the profiled u at a continuous v = ln T, from the interpolated basis. */
function chi2At(pts, basis, w, y, v) {
  const n = pts.length;
  const r = new Float64Array(n);
  let s = 0;
  let sr = 0;
  for (let i = 0; i < n; i++) {
    r[i] = y[i] - interpolate(basis, i, v)[0];
    s += w[i];
    sr += w[i] * r[i];
  }
  const u = sr / s;
  let c = 0;
  for (let i = 0; i < n; i++) c += w[i] * (r[i] - u) * (r[i] - u);
  return { chi2: c, u };
}

/**
 * The minimum of the profile: the best node, refined by golden section on the
 * interpolated profile between its neighbours. Used alone by the bootstrap.
 */
export function fitCore(pts, basis) {
  const w = pts.map(p => 1 / (p.sigmaLnEff * p.sigmaLnEff));
  const y = pts.map(p => p.lnF);
  const prof = profileChi2(pts, basis);
  let kmin = 0;
  for (let k = 1; k < basis.n; k++) if (prof[k] < prof[kmin]) kmin = k;
  const atBound = kmin === 0 || kmin === basis.n - 1;
  let a = basis.v0 + Math.max(kmin - 1, 0) * basis.dv;
  let b = basis.v0 + Math.min(kmin + 1, basis.n - 1) * basis.dv;
  const phi = (Math.sqrt(5) - 1) / 2;
  let c1 = b - phi * (b - a);
  let c2 = a + phi * (b - a);
  let f1 = chi2At(pts, basis, w, y, c1).chi2;
  let f2 = chi2At(pts, basis, w, y, c2).chi2;
  for (let it = 0; it < 80; it++) {
    if (f1 < f2) {
      b = c2;
      c2 = c1;
      f2 = f1;
      c1 = b - phi * (b - a);
      f1 = chi2At(pts, basis, w, y, c1).chi2;
    } else {
      a = c1;
      c1 = c2;
      f1 = f2;
      c2 = a + phi * (b - a);
      f2 = chi2At(pts, basis, w, y, c2).chi2;
    }
  }
  const v = 0.5 * (a + b);
  const { chi2, u } = chi2At(pts, basis, w, y, v);
  return {
    v,
    T: Math.exp(v),
    u,
    theta: Math.exp(0.5 * u),
    chi2,
    kmin,
    atBound,
    prof,
    w,
    y,
  };
}

/** The 2 x 2 covariance of (u, ln T) at the minimum: (J^T W J)^-1, J = [1, g'] */
export function covarianceAt(pts, basis, core) {
  let a = 0;
  let b = 0;
  let d = 0;
  for (let i = 0; i < pts.length; i++) {
    const gp = interpolate(basis, i, core.v)[1];
    a += core.w[i];
    b += core.w[i] * gp;
    d += core.w[i] * gp * gp;
  }
  const det = a * d - b * b;
  return { uu: d / det, uv: -b / det, vv: a / det };
}

/**
 * The interval of T where the profile is within `delta` of its minimum, polished by
 * bisection on the interpolated profile. Open sides are null.
 */
function intervalAt(pts, basis, core, delta) {
  const Ts = Float64Array.from({ length: basis.n }, (_, k) =>
    Math.exp(basis.v0 + k * basis.dv)
  );
  const points = Array.from({ length: basis.n }, (_, k) => ({
    value: Ts[k],
    chi2: core.prof[k],
  }));
  const pi = profileInterval(points, core.chi2, { deltaChi2: delta });
  if (pi.status === 'refused')
    return { lo: null, hi: null, open: [true, true] };
  const thr = core.chi2 + delta;
  const f = v => chi2At(pts, basis, core.w, core.y, v).chi2 - thr;
  const polish = (T, side) => {
    if (T === null) return null;
    const vg = Math.log(T);
    let lo = Math.max(vg - 1.5 * basis.dv, basis.v0);
    let hi = Math.min(vg + 1.5 * basis.dv, basis.v0 + (basis.n - 1) * basis.dv);
    // keep the bracket on the right side of the minimum
    if (side === 'lo') hi = Math.min(hi, core.v);
    else lo = Math.max(lo, core.v);
    let flo = f(lo);
    for (let it = 0; it < 60; it++) {
      const mid = 0.5 * (lo + hi);
      const fm = f(mid);
      if (fm * flo > 0) {
        lo = mid;
        flo = fm;
      } else hi = mid;
    }
    return Math.exp(0.5 * (lo + hi));
  };
  return {
    lo: polish(pi.lo, 'lo'),
    hi: polish(pi.hi, 'hi'),
    open: pi.open,
  };
}

const refused = r => ({
  status: 'refused',
  code: r.code,
  id: r.id ?? null,
  message: r.message,
});

/**
 * Fit a blackbody to an SED.
 *
 * @param {object[]} rawPoints - Points as points.js names them
 * @param {object} opts
 * @param {Map<string, object>|object} opts.bands - Decoded bands (radiation kernel decodeBand) by id
 * @param {number} [opts.allowance] - Fractional flux amplitude v of the nonsimultaneity rule; none by default
 * @param {number} [opts.referenceEpoch]
 * @param {number} [opts.windowDays]
 * @param {number[]} [opts.levels] - Interval levels; the first is the primary
 * @param {number} [opts.alpha] - Adequacy threshold on the chi-square p-value
 * @param {{pc: number, sigmaPc?: number}} [opts.distance] - For the blackbody luminosity and radius
 * @param {object} [opts.basis] - A basis made for the same point set (reused when its signature matches)
 * @param {object} [opts.domain]
 * @returns {object} status 'ok', 'not-constrained' or 'refused', with a code unless ok
 */
export function fitBlackbody(rawPoints, opts = {}) {
  const {
    bands = {},
    allowance,
    referenceEpoch,
    windowDays,
    levels = DEFAULT_LEVELS,
    alpha = ADEQUACY_ALPHA,
    distance = null,
    basis = null,
    domain = DOMAIN,
  } = opts;
  const norm = normalizePoints(rawPoints, bands);
  if (!norm.ok) return refused(norm);
  if (norm.points.length < 3)
    return {
      status: 'not-constrained',
      code: 'too-few-points',
      n: norm.points.length,
      message:
        'a blackbody has two free parameters; fewer than three points leave no degree of freedom to say anything about its temperature',
    };
  const wid = applyNonsimultaneity(norm.points, {
    allowance,
    referenceEpoch,
    windowDays,
  });
  if (!wid.ok) return refused(wid);
  const pts = wid.points;
  const bs =
    basis && basis.signature === basisSignature(pts, domain)
      ? basis
      : makeBasis(pts, bands, domain);
  const core = fitCore(pts, bs);
  const lambdas = pts.map(p => p.lambdaNm);
  const range = {
    lambdaMinNm: Math.min(...lambdas),
    lambdaMaxNm: Math.max(...lambdas),
    nPoints: pts.length,
    note: 'the model is supported only between these wavelengths; outside them it is extrapolation and is labelled',
  };
  const intervals = levels.map(level => {
    const delta = chi2Quantile(level, 1);
    return { level, deltaChi2: delta, ...intervalAt(pts, bs, core, delta) };
  });
  const dof = pts.length - 2;
  const reduced = core.chi2 / dof;
  const scale = Math.max(1, reduced);
  const scaled =
    scale > 1
      ? levels.map(level => ({
          level,
          ...intervalAt(pts, bs, core, chi2Quantile(level, 1) * scale),
        }))
      : null;
  const p = chi2Sf(core.chi2, dof);
  const cov = covarianceAt(pts, bs, core);
  const common = {
    chi2: core.chi2,
    dof,
    reducedChi2: reduced,
    p,
    adequate: p >= alpha,
    alpha,
    range,
    widening: wid.widening,
    label: TEMPERATURE_LABEL,
    points: pts.map((pt, i) => ({
      id: pt.id,
      kind: pt.kind,
      lambdaNm: pt.lambdaNm,
      sigmaLn: pt.sigmaLn,
      sigmaLnEff: pt.sigmaLnEff,
      nonsimultaneous: pt.nonsimultaneous,
      pull:
        (core.y[i] - core.u - interpolate(bs, i, core.v)[0]) / pt.sigmaLnEff,
    })),
  };
  const primary = intervals[0];
  const attach = r =>
    Object.defineProperty(r, 'basis', { value: bs, enumerable: false });
  if (core.atBound || primary.open[0] || primary.open[1])
    return attach({
      status: 'not-constrained',
      code: 'temperature-open',
      message: `the profile of chi-square does not close inside ${domain.minK} K to ${domain.maxK} K at the primary level (${Math.round(primary.level * 10000) / 100} percent): these points do not fix a temperature`,
      bestFit: {
        T: core.T,
        theta: Math.exp(0.5 * core.u),
        unconstrained: true,
      },
      intervals,
      ...common,
    });
  const theta = Math.exp(0.5 * core.u);
  const result = {
    status: 'ok',
    T: {
      value: core.T,
      sigmaLn: Math.sqrt(cov.vv),
      intervals,
      scaledIntervals: scaled,
    },
    theta: { value: theta, sigmaLn: 0.5 * Math.sqrt(cov.uu) },
    covariance: {
      uu: cov.uu,
      uv: cov.uv,
      vv: cov.vv,
      order: '(u = ln theta^2, v = ln T)',
    },
    model: {
      T: core.T,
      theta,
      rangeNm: [range.lambdaMinNm, range.lambdaMaxNm],
    },
    luminosity: null,
    ...common,
  };
  if (distance && distance.pc > 0) {
    const d = distance.pc * PC_M;
    const lnL = Math.log(4 * Math.PI * d * d * SIGMA_SB) + core.u + 4 * core.v;
    const fracD =
      distance.sigmaPc > 0 ? (2 * distance.sigmaPc) / distance.pc : 0;
    const varLn = cov.uu + 8 * cov.uv + 16 * cov.vv + fracD * fracD;
    const sigmaLn = Math.sqrt(varLn);
    result.luminosity = {
      watts: Math.exp(lnL),
      sigmaLn,
      radiusM: theta * d,
      intervals: levels.map(level => {
        const z = sigmaOfLevel(level);
        return {
          level,
          lo: Math.exp(lnL - z * sigmaLn),
          hi: Math.exp(lnL + z * sigmaLn),
        };
      }),
      method:
        'covariance of (u, ln T) of a blackbody with the fitted colour, linearised; the integrated SED is bolometric.js',
    };
  }
  return attach(result);
}
