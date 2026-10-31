// =============================================================================
// The planet's mass, radius and density, and the star they depend on (Prompt 227)
// -----------------------------------------------------------------------------
// Pure formulas of the joint transit and radial-velocity model
// (./jointModel.js). Nothing here fits anything.
//
//   mass      Mp sin i is the root of
//               K = (2 pi G / P)^(1/3) Mp sin i / ((Ms + Mp)^(2/3) sqrt(1 - e^2))
//             in Mp (the sum of the masses, not the small-mass approximation).
//             Masses are ratios of the nominal GMs of the IAU 2015 resolution
//             B3, so G cancels: Mp in Jupiter masses needs GM only. The mass
//             is Mp sin i divided by sin i, with sin i from the transit; with
//             no transit it is the MINIMUM mass and is called that.
//   radius    Rp = k Rs.
//   density   rho_p = Mp / (4 pi Rp^3 / 3), the one place G enters.
//   star      the stellar mass and radius are INPUTS with a stated
//             uncertainty, a correlation and a provenance; they are never
//             fitted here. A planet's density is only as good as its star's
//             radius and mass: every planetary quantity carries the star's
//             share of its variance, and no planetary quantity is reported
//             when the star's uncertainty it needs was not stated.
//   orbit     the transit is the circular-orbit model with the first-order
//             eccentric scaling of the duration (Winn 2010): the circular
//             equivalent a/R* = a/R* (1 + e sin w) / sqrt(1 - e^2), the
//             impact parameter b at conjunction unchanged. w is the PLANET's
//             argument of periastron, the same as js/inference/rv.js and as
//             batman's w (the oracle's three-dimensional orbit checks it).
//
// Pure: no DOM, no state. The Monte Carlo propagation is the statistics
// kernel's (Prompt 154).
// =============================================================================

import { G_SI, stellarDensity } from './transit.js';
import { propagate } from '../kernels/statistics/resample.js';
import { percentileInterval } from '../kernels/statistics/intervals.js';

const { Math, Float64Array, Number: Num } = globalThis;

/** IAU 2015 B3 nominal GM, m^3 s^-2. */
export const GM = Object.freeze({
  sun: 1.3271244e20,
  jup: 1.26686534e17,
  earth: 3.986004e14,
});
const R_SUN_M = 6.957e8;
const R_JUP_M = 7.1492e7;
const DAY = 86400;

/** R_sun / R_Jup (IAU 2015 nominal), as js/inference/models.js has it. */
export const RSUN_PER_RJUP = R_SUN_M / R_JUP_M;
/** M_Jup / M_earth from the nominal GMs. */
export const MJUP_PER_MEARTH = GM.jup / GM.earth;

/**
 * The amplitude a planet of mass Mp (Jupiter masses) gives its star, m/s.
 * @param {{Mp: number, P: number, e?: number, sini?: number, Ms: number}} o
 *   P in days, Ms in solar masses
 */
export function amplitude({ Mp, P, e = 0, sini = 1, Ms }) {
  const n = (2 * Math.PI) / (P * DAY);
  return (
    (n ** (1 / 3) * GM.jup * Mp * sini) /
    ((GM.sun * Ms + GM.jup * Mp) ** (2 / 3) * Math.sqrt(1 - e * e))
  );
}

/**
 * The mass, Jupiter masses, that K, P, e and sin i give around a star of Ms
 * solar masses: the root of the full relation (a fixed-point iteration that
 * contracts at the rate of Mp / Ms). NaN where there is none.
 */
export function massFromAmplitude({ K, P, e = 0, sini = 1, Ms }) {
  if (!(K >= 0) || !(P > 0) || !(Ms > 0) || !(sini > 0) || !(e >= 0 && e < 1))
    return NaN;
  const n = (2 * Math.PI) / (P * DAY);
  const c = n ** (1 / 3) * GM.jup * sini;
  const fe = K * Math.sqrt(1 - e * e);
  let x = (fe * (GM.sun * Ms) ** (2 / 3)) / c;
  for (let i = 0; i < 100; i++) {
    const next = (fe * (GM.sun * Ms + GM.jup * x) ** (2 / 3)) / c;
    if (Math.abs(next - x) <= 1e-15 * Math.abs(next)) return next;
    x = next;
  }
  return x;
}

/** Bulk density, g/cm^3, of Mp Jupiter masses in Rp equatorial Jupiter radii. */
export const bulkDensity = (Mp, Rp) =>
  (GM.jup * Mp) / G_SI / ((4 / 3) * Math.PI * (R_JUP_M * Rp) ** 3) / 1000;

/** A star's mean density, g/cm^3, from its mass (solar masses) and radius (solar radii). */
export const starDensityOf = (Ms, Rs) =>
  (GM.sun * Ms) / G_SI / ((4 / 3) * Math.PI * (R_SUN_M * Rs) ** 3) / 1000;

/** The circular-equivalent a/R* of an orbit of eccentricity e and periastron w (radians). */
export const circularEquivalent = (aRs, e, w) =>
  (aRs * (1 + e * Math.sin(w))) / Math.sqrt(1 - e * e);

/** The inverse: the true a/R* from the circular equivalent the transit fixes. */
export const trueFromCircular = (aRsC, e, w) =>
  (aRsC * Math.sqrt(1 - e * e)) / (1 + e * Math.sin(w));

/** sin i from the conjunction impact parameter and the true a/R*; NaN if it is not an orbit. */
export function sinInclination(b, aRs, e, w) {
  const cos = (b * (1 + e * Math.sin(w))) / (aRs * (1 - e * e));
  return Math.abs(cos) <= 1 ? Math.sqrt(1 - cos * cos) : NaN;
}

/** The star's density from the transit, g/cm^3, from the true a/R* and P in days. */
export const starDensityFromTransit = (aRs, P) => stellarDensity(aRs, P) / 1000;

// ---- the stellar inputs ---------------------------------------------------------

/**
 * Read the stellar inputs a request states.
 * @param {{mass?: object, radius?: object, correlation?: number}} s
 *   mass and radius are { value, sigma?, source }; the correlation is of the
 *   two uncertainties, in (-1, 1), 0 when not stated
 * @returns {{mass: ?object, radius: ?object, correlation: number,
 *   massOk: boolean, radiusOk: boolean}} ok means a value and its sigma
 */
export function stellarInputs(s) {
  const read = x =>
    x && x.value > 0
      ? {
          value: x.value,
          sigma: Num.isFinite(x.sigma) && x.sigma >= 0 ? x.sigma : null,
          source: String(x.source ?? ''),
        }
      : null;
  const mass = read(s?.mass);
  const radius = read(s?.radius);
  const r = Num.isFinite(s?.correlation) ? s.correlation : 0;
  return {
    mass,
    radius,
    correlation: Math.max(-0.999, Math.min(0.999, r)),
    massOk: Boolean(mass && mass.sigma !== null),
    radiusOk: Boolean(radius && radius.sigma !== null),
  };
}

/**
 * The planet from the orbit the fit found and the star it was stated around.
 * Every quantity is NaN where the geometry or the input does not give it.
 * @param {{K: number, P: number, e: number, w: number, aRs: number, b: number,
 *   k: number}} o - aRs is the TRUE a/R*, w in radians
 * @param {{Ms?: number, Rs?: number}} star
 * @param {boolean} transit - Whether a transit fixes the inclination
 */
export function planetOf(o, star, transit = true) {
  const sini = transit ? sinInclination(o.b, o.aRs, o.e, o.w) : NaN;
  const MpSini = massFromAmplitude({
    K: o.K,
    P: o.P,
    e: o.e,
    sini: 1,
    Ms: star.Ms,
  });
  const Mp = transit
    ? massFromAmplitude({ K: o.K, P: o.P, e: o.e, sini, Ms: star.Ms })
    : NaN;
  const Rp = transit ? o.k * star.Rs * RSUN_PER_RJUP : NaN;
  return {
    sini,
    MpSini,
    Mp,
    Rp,
    rhoP: transit ? bulkDensity(Mp, Rp) : NaN,
  };
}

/** Variance of a quantity from the star's two inputs: g^T S g, S from sigma and correlation. */
export function stellarVariance(g, star) {
  const sm = star.sigmaMs ?? 0;
  const sr = star.sigmaRs ?? 0;
  const r = star.correlation ?? 0;
  return (
    g.Ms * g.Ms * sm * sm +
    g.Rs * g.Rs * sr * sr +
    2 * r * g.Ms * g.Rs * sm * sr
  );
}

/**
 * The central interval of a planetary quantity from draws of the fit and of
 * the star together (the statistics kernel's propagation, Prompt 154).
 * @param {{names: string[], mean: number[], covariance: number[][],
 *   star: {mass: {value, sigma}, radius: {value, sigma}, correlation?: number},
 *   transit?: boolean, draws?: number, seed: string, level?: number,
 *   starFixed?: boolean}} o - the fit's P, k, aRs, b, K (and sqrtEcosw,
 *   sqrtEsinw when fitted) by name; aRs is the TRUE a/R*
 * @returns {{status: string, Mp?: object, Rp?: object, rhoP?: object}}
 */
export function propagatePlanet({
  names,
  mean,
  covariance,
  star,
  transit = true,
  draws = 20000,
  seed,
  level = 0.6827,
  starFixed = false,
  fixed = {},
}) {
  const idx = n => names.indexOf(n);
  const k = names.length;
  const sm = star.mass.sigma;
  const sr = star.radius.sigma;
  const rho = star.correlation ?? 0;
  const dim = starFixed ? k : k + 2;
  const m = mean.slice();
  const cov = Array.from({ length: dim }, (_, i) =>
    Array.from({ length: dim }, (_, j) =>
      i < k && j < k ? covariance[i][j] : 0
    )
  );
  if (!starFixed) {
    m.push(star.mass.value, star.radius.value);
    cov[k][k] = sm * sm;
    cov[k + 1][k + 1] = sr * sr;
    cov[k][k + 1] = cov[k + 1][k] = rho * sm * sr;
  }
  const get = (theta, n, fallback) => {
    const i = idx(n);
    return i >= 0 ? theta[i] : (fixed[n] ?? fallback);
  };
  const res = propagate({
    mean: m,
    covariance: cov,
    seed,
    draws,
    label: 'planet',
    fn(theta) {
      const sx = get(theta, 'sqrtEcosw', 0);
      const sy = get(theta, 'sqrtEsinw', 0);
      const e = sx * sx + sy * sy;
      const w = e > 0 ? Math.atan2(sy, sx) : Math.PI / 2;
      const star2 = starFixed
        ? { Ms: star.mass.value, Rs: star.radius.value }
        : { Ms: theta[k], Rs: theta[k + 1] };
      const p = planetOf(
        {
          K: get(theta, 'K'),
          P: get(theta, 'P'),
          e,
          w,
          aRs: get(theta, 'aRs'),
          b: get(theta, 'b'),
          k: get(theta, 'k'),
        },
        star2,
        transit
      );
      return [p.Mp, p.Rp, p.rhoP, p.MpSini];
    },
  });
  if (res.status !== 'ok') return res;
  const out = { status: 'ok', draws: res.draws, level };
  ['Mp', 'Rp', 'rhoP', 'MpSini'].forEach((name, j) => {
    const col = Float64Array.from(res.samples, row => row[j]);
    const iv = percentileInterval(col, { level, method: 'propagation' });
    out[name] =
      iv.status === 'ok'
        ? {
            value: iv.value,
            lo: iv.lo,
            hi: iv.hi,
            sigma: (iv.hi - iv.lo) / 2,
            dropped: iv.dropped,
          }
        : iv;
  });
  return out;
}

/**
 * The orbit and the amplitude of a planet built from its mass: a from Kepler's
 * third law with the sum of the masses, a/R*, the inclination from the
 * impact parameter at conjunction, and K from the full relation.
 * @param {{P: number, Mp: number, Ms: number, Rs: number, b: number,
 *   e?: number, w?: number}} o - P in days, Mp in Jupiter masses, Ms and Rs
 *   solar, w in radians (the planet's)
 * @returns {{aRs: number, sini: number, K: number, a_m: number}}
 */
export function systemFromMass({ P, Mp, Ms, Rs, b, e = 0, w = Math.PI / 2 }) {
  const Ps = P * DAY;
  const a =
    (((GM.sun * Ms + GM.jup * Mp) * Ps * Ps) / (4 * Math.PI ** 2)) ** (1 / 3);
  const aRs = a / (Rs * R_SUN_M);
  const sini = sinInclination(b, aRs, e, w);
  return { aRs, sini, K: amplitude({ Mp, P, e, sini, Ms }), a_m: a };
}

/**
 * The planet's mass, radius and density with the first-order uncertainty of
 * the fit (its covariance) and of the star (its two sigmas and their
 * correlation) kept apart, and the share of the variance the star holds. The
 * same linearization as the fit's own derived quantities
 * (js/inference/infer.js), for a stored fit or a lesson.
 * @param {{names: string[], mean: number[], covariance: number[][],
 *   star: {mass: object, radius: object, correlation?: number},
 *   fixed?: object}} o - names of the fit's P, k, aRs (TRUE), b, K, and
 *   sqrtEcosw, sqrtEsinw when fitted; `fixed` holds the ones that are not
 * @returns {Object<string, {value: number, sigmaFit: number, sigmaStar: number,
 *   sigma: number, share: number}>} keys Mp, Rp, rhoP, MpSini
 */
export function linearPlanet({ names, mean, covariance, star, fixed = {} }) {
  const pick = (theta, n, d) => {
    const i = names.indexOf(n);
    return i >= 0 ? theta[i] : (fixed[n] ?? d);
  };
  const f = (theta, Ms, Rs) => {
    const sx = pick(theta, 'sqrtEcosw', 0);
    const sy = pick(theta, 'sqrtEsinw', 0);
    const e = sx * sx + sy * sy;
    const p = planetOf(
      {
        K: pick(theta, 'K'),
        P: pick(theta, 'P'),
        e,
        w: e > 0 ? Math.atan2(sy, sx) : Math.PI / 2,
        aRs: pick(theta, 'aRs'),
        b: pick(theta, 'b'),
        k: pick(theta, 'k'),
      },
      { Ms, Rs },
      true
    );
    return [p.Mp, p.Rp, p.rhoP, p.MpSini];
  };
  const Ms = star.mass.value;
  const Rs = star.radius.value;
  const base = f(mean, Ms, Rs);
  const sm = star.mass.sigma ?? 0;
  const sr = star.radius.sigma ?? 0;
  const out = {};
  ['Mp', 'Rp', 'rhoP', 'MpSini'].forEach((name, j) => {
    const g = mean.map((v, i) => {
      const h = 1e-6 * (Math.abs(v) || 1);
      const up = mean.slice();
      const dn = mean.slice();
      up[i] += h;
      dn[i] -= h;
      return (f(up, Ms, Rs)[j] - f(dn, Ms, Rs)[j]) / (2 * h);
    });
    let vf = 0;
    for (let a = 0; a < g.length; a++)
      for (let b = 0; b < g.length; b++) vf += g[a] * covariance[a][b] * g[b];
    const hM = 1e-4 * Ms;
    const hR = 1e-4 * Rs;
    const gs = {
      Ms: (f(mean, Ms + hM, Rs)[j] - f(mean, Ms - hM, Rs)[j]) / (2 * hM),
      Rs: (f(mean, Ms, Rs + hR)[j] - f(mean, Ms, Rs - hR)[j]) / (2 * hR),
    };
    const vs = stellarVariance(gs, {
      sigmaMs: sm,
      sigmaRs: sr,
      correlation: star.correlation ?? 0,
    });
    out[name] = {
      value: base[j],
      sigmaFit: Math.sqrt(Math.max(0, vf)),
      sigmaStar: Math.sqrt(Math.max(0, vs)),
      sigma: Math.sqrt(Math.max(0, vf + vs)),
      share: vf + vs > 0 ? vs / (vf + vs) : 0,
    };
  });
  return out;
}

export const CONSTANTS = Object.freeze({
  G: G_SI,
  GM,
  R_SUN_M,
  R_JUP_M,
});
