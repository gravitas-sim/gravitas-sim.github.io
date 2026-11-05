// =============================================================================
// SED kernel: the integrated SED and the bolometric luminosity (Prompt 245)
// -----------------------------------------------------------------------------
// The flux the points themselves carry is the integral of f_lambda between the shortest
// and the longest point wavelength, with a power law between neighbouring points
// (f_lambda = f1 (lambda / lambda1)^a, a = ln(f2 / f1) / ln(lambda2 / lambda1)): exact for a
// power law and a chord in log-log otherwise, so it is a little low across a curved peak.
// A band-integrated point enters at its pivot wavelength, which is an approximation of the
// same order (a band mean is not the monochromatic value at the pivot, SED.md). The result
// states its bounds and that the data alone were integrated.
//
// What lies below the shortest and above the longest wavelength is not data. The kernel
// returns it only when asked, from the fitted blackbody in closed form, separately, and
// labelled extrapolated, with the fraction of the total it makes up:
//
//     sigma T^4 theta^2 (15 / pi^4) times the Planck integral of x^3 / (e^x - 1) from x0 to
//     infinity (the part below the shortest wavelength) or from 0 to x0 (the part above the
//     longest), with x0 = h c / (lambda k T).
//
// The luminosity is 4 pi d^2 F with a distance the caller supplies (no default). Its
// interval is lognormal from the standard deviation of ln F over seeded parametric
// bootstrap draws (every point moved by its own effective sigma, the blackbody refitted)
// combined in quadrature with 2 sigma_d / d.
// =============================================================================

import {
  C_LIGHT,
  H_PLANCK,
  K_BOLTZMANN,
  L_SUN_W,
  PC_M,
  SIGMA_SB,
} from '../radiation/index.js';
import { gaussian, stream } from '../../random/streams.js';
import { sigmaOfLevel } from '../statistics/index.js';
import { jyToFlambda } from './conventions.js';
import { applyNonsimultaneity, normalizePoints } from './points.js';
import {
  DOMAIN,
  basisSignature,
  interpolate,
  lnMonochromatic,
  makeBasis,
} from './model.js';
import { DEFAULT_LEVELS, fitBlackbody, fitCore } from './fit.js';

const { Math } = globalThis;

const PI4_OVER_15 = Math.PI ** 4 / 15;
// Bernoulli numbers B_n for the series x^3 / (e^x - 1) = sum B_n x^(n+2) / n!
const BERNOULLI = [
  [0, 1],
  [1, -1 / 2],
  [2, 1 / 6],
  [4, -1 / 30],
  [6, 1 / 42],
  [8, -1 / 30],
  [10, 5 / 66],
  [12, -691 / 2730],
  [14, 7 / 6],
  [16, -3617 / 510],
];
const FACTORIAL = n => {
  let f = 1;
  for (let i = 2; i <= n; i++) f *= i;
  return f;
};

/** The integral of x^3 / (e^x - 1) from 0 to x, by the Bernoulli series (x at most 1). */
function lowerSeries(x) {
  let s = 0;
  for (const [n, b] of BERNOULLI)
    s += (b * x ** (n + 3)) / ((n + 3) * FACTORIAL(n));
  return s;
}
/** The integral of x^3 / (e^x - 1) from x to infinity, by the exponential series (x above 1). */
function upperSeries(x) {
  let s = 0;
  for (let k = 1; k < 400; k++) {
    const e = Math.exp(-k * x);
    const t =
      e * (x ** 3 / k + (3 * x * x) / (k * k) + (6 * x) / k ** 3 + 6 / k ** 4);
    s += t;
    if (t < 1e-18 * s) break;
  }
  return s;
}
/** The fraction (15 / pi^4) of the Planck integral that lies below x (long wavelengths): the part above a wavelength. */
export const lowerFraction = x =>
  (x <= 1 ? lowerSeries(x) : PI4_OVER_15 - upperSeries(x)) / PI4_OVER_15;
/** The fraction that lies above x (short wavelengths): the part below a wavelength. */
export const upperFraction = x =>
  (x <= 1 ? PI4_OVER_15 - lowerSeries(x) : upperSeries(x)) / PI4_OVER_15;

const xOf = (lambdaNm, T) =>
  (H_PLANCK * C_LIGHT) / (lambdaNm * 1e-9 * K_BOLTZMANN * T);

/** The flux (W m^-2) of the model sigma T^4 theta^2 shape between two wavelengths, nm. */
export function modelFluxBetween(T, theta, aNm, bNm) {
  const total = SIGMA_SB * T ** 4 * theta * theta;
  const xa = xOf(aNm, T);
  const xb = xOf(bNm, T);
  return (
    total *
    (xb <= 1 && xa <= 1
      ? lowerFraction(xa) - lowerFraction(xb)
      : upperFraction(xb) - upperFraction(xa))
  );
}

/** The model's flux below and above a range of wavelengths (nm), W m^-2. */
export function modelTails(T, theta, loNm, hiNm) {
  const total = SIGMA_SB * T ** 4 * theta * theta;
  return {
    below: total * upperFraction(xOf(loNm, T)),
    above: total * lowerFraction(xOf(hiNm, T)),
    total,
  };
}

/** The integral of f_lambda (W m^-2 nm^-1) over wavelengths (nm) with power-law chords, W m^-2. */
export function chordFlux(lambdaNm, flambda) {
  let F = 0;
  for (let i = 1; i < lambdaNm.length; i++) {
    const l1 = lambdaNm[i - 1];
    const l2 = lambdaNm[i];
    const f1 = flambda[i - 1];
    const f2 = flambda[i];
    const a = Math.log(f2 / f1) / Math.log(l2 / l1);
    F +=
      Math.abs(a + 1) < 1e-9
        ? f1 * l1 * Math.log(l2 / l1)
        : ((f1 * l1) / (a + 1)) * ((l2 / l1) ** (a + 1) - 1);
  }
  return F;
}

/** The points sorted by wavelength, equal wavelengths joined by the geometric mean of their fluxes. */
function sortedFlambda(pts) {
  const s = [...pts].sort((p, q) => p.lambdaNm - q.lambdaNm);
  const lam = [];
  const fl = [];
  for (const p of s) {
    const f = jyToFlambda(Math.exp(p.lnF), p.lambdaNm);
    if (lam.length && Math.abs(p.lambdaNm / lam[lam.length - 1] - 1) < 1e-9) {
      fl[fl.length - 1] = Math.sqrt(fl[fl.length - 1] * f);
    } else {
      lam.push(p.lambdaNm);
      fl.push(f);
    }
  }
  return { lam, fl };
}

/**
 * The flux in the data range by the model-residual integration: the exact flux of the fitted
 * blackbody between the first and the last wavelength, plus the trapezoid integral (in
 * wavelength, in f_lambda) of the residuals. A point's residual is its monochromatic
 * equivalent at its wavelength (f_i mono_i / m_i, with m_i the model through the point's band
 * and mono_i the model at the wavelength: 1 for a monochromatic point) minus mono_i. With a
 * blackbody that fits, the residuals are small and the chords' bias (a chord through a curved
 * SED, a band point placed at its pivot) is not in the answer; nothing outside the range is data.
 * @param {object[]} pts - Normalised points, in the order the basis was made for
 * @param {object} basis - The basis of those points
 * @param {number} u - ln theta^2 of the fit
 * @param {number} v - ln T of the fit
 */
export function residualDataFlux(pts, basis, u, v) {
  const T = Math.exp(v);
  const theta = Math.exp(0.5 * u);
  const items = pts
    .map((p, i) => {
      const m = Math.exp(u + interpolate(basis, i, v)[0]);
      const mono = Math.exp(u + lnMonochromatic(T, p.lambdaNm));
      return {
        lam: p.lambdaNm,
        r: jyToFlambda((Math.exp(p.lnF) / m - 1) * mono, p.lambdaNm),
      };
    })
    .sort((a, b) => a.lam - b.lam);
  let resid = 0;
  for (let i = 1; i < items.length; i++)
    resid +=
      0.5 * (items[i].r + items[i - 1].r) * (items[i].lam - items[i - 1].lam);
  return {
    fluxWm2:
      modelFluxBetween(T, theta, items[0].lam, items[items.length - 1].lam) +
      resid,
    residualWm2: resid,
  };
}

const refused = r => ({
  status: 'refused',
  code: r.code,
  id: r.id ?? null,
  message: r.message,
});

export const DATA_ONLY_LABEL =
  'the integral of the points alone between the shortest and the longest wavelength; nothing outside them is included';
export const TAIL_LABEL =
  'EXTRAPOLATED: the fitted blackbody beyond the data, not a measurement; its size relative to the total is stated';

/**
 * The integrated SED: flux between the first and last point, and on request the model's tails.
 * @param {object[]} rawPoints
 * @param {{bands: object, fit?: object, includeModelTails?: boolean, allowance?: number, referenceEpoch?: number, windowDays?: number}} opts
 */
export function integrateSed(
  rawPoints,
  { bands = {}, fit = null, includeModelTails = false } = {}
) {
  const norm = normalizePoints(rawPoints, bands);
  if (!norm.ok) return refused(norm);
  if (norm.points.length < 2)
    return {
      status: 'not-constrained',
      code: 'too-few-points',
      message: 'an integral needs at least two points',
    };
  const { lam, fl } = sortedFlambda(norm.points);
  const lo = lam[0];
  const hi = lam[lam.length - 1];
  const data = chordFlux(lam, fl);
  const out = {
    status: 'ok',
    bounds: { lambdaMinNm: lo, lambdaMaxNm: hi },
    dataFluxWm2: data,
    interpolation:
      'power-law chords between neighbouring points; a band-integrated point is placed at its pivot wavelength',
    label: DATA_ONLY_LABEL,
    tails: null,
    totalFluxWm2: null,
    extrapolatedFraction: null,
  };
  if (includeModelTails) {
    if (fit?.status !== 'ok')
      return {
        status: 'refused',
        code: 'no-model-for-tails',
        message: 'the model tails need a fit that is constrained',
      };
    const t = modelTails(fit.model.T, fit.model.theta, lo, hi);
    out.tails = {
      belowWm2: t.below,
      aboveWm2: t.above,
      extrapolated: true,
      label: TAIL_LABEL,
    };
    out.totalFluxWm2 = data + t.below + t.above;
    out.extrapolatedFraction = (t.below + t.above) / out.totalFluxWm2;
  }
  return out;
}

/**
 * The bolometric luminosity of the integrated SED with a distance.
 * @param {object[]} rawPoints
 * @param {object} opts
 * @param {{pc: number, sigmaPc?: number}} opts.distance - Required
 * @param {boolean} [opts.includeModelTails] - Add the labelled model tails (needs a constrained fit)
 * @param {'chords'|'model-residual'} [opts.integration] - The data-range integral: power-law chords (default) or the model-residual integration (needs a constrained fit)
 * @param {number} [opts.draws] - Bootstrap draws (200)
 * @param {number|string} [opts.seed] - Seed of the bootstrap stream
 * @param {number[]} [opts.levels]
 */
export function bolometricLuminosity(rawPoints, opts = {}) {
  const {
    bands = {},
    distance,
    includeModelTails = false,
    integration = 'chords',
    draws = 200,
    seed = 0,
    levels = DEFAULT_LEVELS,
    allowance,
    referenceEpoch,
    windowDays,
    basis = null,
    domain = DOMAIN,
  } = opts;
  if (!(distance?.pc > 0))
    return {
      status: 'refused',
      code: 'distance',
      message: 'a luminosity needs a distance; there is no default',
    };
  const norm = normalizePoints(rawPoints, bands);
  if (!norm.ok) return refused(norm);
  const wid = applyNonsimultaneity(norm.points, {
    allowance,
    referenceEpoch,
    windowDays,
  });
  if (!wid.ok) return refused(wid);
  const pts = wid.points;
  if (pts.length < 2)
    return {
      status: 'not-constrained',
      code: 'too-few-points',
      message: 'an integral needs at least two points',
    };
  const residual = integration === 'model-residual';
  if (!residual && integration !== 'chords')
    return {
      status: 'refused',
      code: 'integration',
      message: "integration must be 'chords' or 'model-residual'",
    };
  let bs = null;
  let fit = null;
  if (includeModelTails || residual) {
    bs =
      basis && basis.signature === basisSignature(pts, domain)
        ? basis
        : makeBasis(pts, bands, domain);
    fit = fitBlackbody(rawPoints, {
      bands,
      allowance,
      referenceEpoch,
      windowDays,
      levels,
      basis: bs,
      domain,
    });
  }
  if (residual && fit.status !== 'ok')
    return {
      status: 'refused',
      code: 'no-model-for-residual',
      message: 'the model-residual integration needs a constrained fit',
    };
  const base = integrateSed(rawPoints, { bands, fit, includeModelTails });
  if (base.status !== 'ok') return base;
  const chordData = base.dataFluxWm2;
  if (residual) {
    const rd = residualDataFlux(
      pts,
      bs,
      2 * Math.log(fit.model.theta),
      Math.log(fit.model.T)
    );
    base.dataFluxWm2 = rd.fluxWm2;
    if (includeModelTails)
      base.totalFluxWm2 =
        rd.fluxWm2 + base.tails.belowWm2 + base.tails.aboveWm2;
    if (includeModelTails)
      base.extrapolatedFraction =
        (base.tails.belowWm2 + base.tails.aboveWm2) / base.totalFluxWm2;
  }
  const flux = includeModelTails ? base.totalFluxWm2 : base.dataFluxWm2;
  // seeded parametric bootstrap: move each point by its effective sigma, refit, integrate again
  const draw = gaussian(stream('noise', seed, 'sed-luminosity'));
  const lnFs = [];
  let failed = 0;
  for (let d = 0; d < draws; d++) {
    const star = pts.map(p => {
      const lnF = p.lnF + p.sigmaLnEff * draw();
      return { ...p, lnF };
    });
    const { lam, fl } = sortedFlambda(star);
    let f = chordFlux(lam, fl);
    if (includeModelTails || residual) {
      const core = fitCore(star, bs);
      if (core.atBound) {
        failed++;
        continue;
      }
      if (residual) f = residualDataFlux(star, bs, core.u, core.v).fluxWm2;
      if (includeModelTails) {
        const t = modelTails(core.T, core.theta, lam[0], lam[lam.length - 1]);
        f += t.below + t.above;
      }
    }
    lnFs.push(Math.log(f));
  }
  const m = lnFs.reduce((a, b) => a + b, 0) / lnFs.length;
  const sdFlux = Math.sqrt(
    lnFs.reduce((a, b) => a + (b - m) ** 2, 0) / (lnFs.length - 1)
  );
  const fracD = distance.sigmaPc > 0 ? (2 * distance.sigmaPc) / distance.pc : 0;
  const sigmaLn = Math.sqrt(sdFlux * sdFlux + fracD * fracD);
  const d = distance.pc * PC_M;
  const watts = 4 * Math.PI * d * d * flux;
  return {
    status: 'ok',
    bounds: base.bounds,
    dataFluxWm2: base.dataFluxWm2,
    tails: base.tails,
    totalFluxWm2: base.totalFluxWm2,
    extrapolatedFraction: base.extrapolatedFraction,
    includesExtrapolation: includeModelTails,
    integration,
    ...(residual
      ? {
          chordDataFluxWm2: chordData,
          modelAdequate: fit.adequate,
          dataFluxNote: fit.adequate
            ? "the data-range flux is the fitted blackbody plus the integral of the residuals; the chords' bias is not in it"
            : "the data-range flux is model-dependent: the blackbody is not an adequate fit, so the residuals are large and the flux is the data's only through their trapezoid",
        }
      : {}),
    label: includeModelTails
      ? `${base.label}; plus the model tails, ${TAIL_LABEL}`
      : base.label,
    luminosity: {
      watts,
      solar: watts / L_SUN_W,
      sigmaLn,
      sigmaLnFlux: sdFlux,
      intervals: levels.map(level => {
        const z = sigmaOfLevel(level);
        return {
          level,
          lo: watts * Math.exp(-z * sigmaLn),
          hi: watts * Math.exp(z * sigmaLn),
        };
      }),
      method:
        'lognormal from the standard deviation of ln F over seeded parametric-bootstrap draws, in quadrature with 2 sigma_d / d',
    },
    bootstrap: { draws, used: lnFs.length, failed },
  };
}
