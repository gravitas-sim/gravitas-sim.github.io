// =============================================================================
// The velocity dispersion, its uncertainty and its diagnostics (Prompt 250, rules R6 to R9)
// -----------------------------------------------------------------------------
// Plain estimator: s = sqrt(sum (v - mean)^2 / (n - 1)) over the members' rest-frame velocities. The
// reported dispersion divides it by the clip's truncation factor (R6) unless told not to, after taking
// the stated per-galaxy velocity errors out in quadrature (R7). Its uncertainty is analytic,
// sigma_hat / sqrt(2 (n - 1)) times s / sigma_int when errors were subtracted, or a seeded bootstrap.
// The biweight scale (Beers-type, with the caller's tuning constants and source: none is a default
// here) is the robust alternative, defined for the plain members and with a bootstrap error only.
//
// Diagnostics, which raise flags and change no number (R9): the unbiased excess kurtosis against its
// Gaussian standard error, and the expected count of field galaxies inside the clip window estimated from
// the density outside it. The kernel applies no background correction.
// =============================================================================

import { caseBootstrap } from '../../statistics/index.js';
import {
  CONTAMINATION_FLAG,
  DRAWS,
  GAUSSIAN_FLAG_SE,
  notConstrained,
  refused,
} from './constants.js';
import { median, truncationFactor } from './velocity.js';

export const mean = a => a.reduce((s, v) => s + v, 0) / a.length;

/** Sample standard deviation (n - 1) of `a` about its own mean. */
export function sampleSd(a) {
  const m = mean(a);
  let s = 0;
  for (const v of a) s += (v - m) * (v - m);
  return Math.sqrt(s / (a.length - 1));
}

/**
 * The biweight location and scale (Beers-type): M the median, MAD the unnormalised median absolute
 * deviation, u = (x - M) / (c MAD), sums over |u| < 1, n the whole count.
 */
export function biweight(x, { cLocation, cScale }) {
  const n = x.length;
  const M = median(x);
  const mad = median(Array.from(x, v => Math.abs(v - M)));
  if (!(mad > 0)) return { location: NaN, scale: NaN, mad };
  let numL = 0;
  let denL = 0;
  for (const v of x) {
    const u = (v - M) / (cLocation * mad);
    if (Math.abs(u) < 1) {
      const w = 1 - u * u;
      numL += (v - M) * w * w;
      denL += w * w;
    }
  }
  let numS = 0;
  let denS = 0;
  for (const v of x) {
    const d = v - M;
    const u = d / (cScale * mad);
    if (Math.abs(u) < 1) {
      const w = 1 - u * u;
      numS += d * d * w ** 4;
      denS += w * (1 - 5 * u * u);
    }
  }
  return {
    location: M + numL / denL,
    scale: (Math.sqrt(n) * Math.sqrt(numS)) / Math.abs(denS),
    mad,
  };
}

/**
 * The dispersion of a member set.
 * @param {number[]} v - rest-frame velocities (km/s) of the members
 * @param {{method?: 'plain'|'biweight', kappa: number, truncationCorrection?: boolean,
 *   errorsKms?: number[]|null, biweightTuning?: object, uncertainty?: 'analytic'|'bootstrap',
 *   draws?: number, seed?: string}} o
 */
export function dispersion(v, o) {
  const {
    method = 'plain',
    kappa,
    truncationCorrection = true,
    errorsKms = null,
    biweightTuning = null,
    uncertainty = 'analytic',
    draws = DRAWS,
    seed = 'clusters',
  } = o;
  const n = v.length;
  if (n < 2) return notConstrained('too-few-members', 'fewer than two members');
  if (method === 'biweight') {
    if (
      !biweightTuning ||
      !(biweightTuning.cLocation > 0) ||
      !(biweightTuning.cScale > 0) ||
      !biweightTuning.source
    )
      return refused(
        'missing-tuning',
        'the biweight needs cLocation, cScale and a source; there is no default'
      );
    if (errorsKms)
      return refused(
        'errors-with-biweight',
        'the quadrature correction for velocity errors is defined for the plain estimator only'
      );
    const b = biweight(v, biweightTuning);
    if (!Number.isFinite(b.scale))
      return notConstrained(
        'zero-scatter',
        'the median absolute deviation is 0'
      );
    const boot = caseBootstrap({
      n,
      statistic: idx =>
        biweight(
          Array.from(idx, i => v[i]),
          biweightTuning
        ).scale,
      draws,
      seed,
      label: 'dispersion',
    });
    if (boot.status !== 'ok') return boot;
    const finite = Array.from(boot.samples).filter(Number.isFinite);
    return {
      status: 'ok',
      method: 'biweight',
      raw: b.scale,
      truncationFactor: null,
      kms: b.scale,
      sigmaKms: sampleSd(finite),
      uncertainty: 'bootstrap',
      samples: finite,
      n,
      location: b.location,
    };
  }
  const s = sampleSd(v);
  if (!(s > 0))
    return notConstrained('zero-scatter', 'the members have no scatter');
  let intrinsic = s;
  let amp = 1;
  let errorSubtracted = null;
  if (errorsKms) {
    const e2 = mean(errorsKms.map(e => e * e));
    const var0 = s * s - e2;
    if (!(var0 > 0))
      return notConstrained(
        'errors-exceed-scatter',
        'the stated velocity errors are as large as the scatter'
      );
    intrinsic = Math.sqrt(var0);
    amp = s / intrinsic;
    errorSubtracted = { meanSquareKms2: e2, observedKms: s };
  }
  let x = 1;
  if (truncationCorrection) {
    const f = truncationFactor(kappa);
    if (typeof f !== 'number') return f;
    x = f;
  }
  const kms = intrinsic / x;
  const analytic = (amp * kms) / Math.sqrt(2 * (n - 1));
  const out = {
    status: 'ok',
    method: 'plain',
    raw: s,
    truncationFactor: truncationCorrection ? x : null,
    kms,
    n,
    errorSubtracted,
  };
  if (uncertainty === 'bootstrap') {
    const stat = idx => {
      const sub = Array.from(idx, i => v[i]);
      const si = sampleSd(sub);
      let ii = si;
      if (errorsKms) {
        const e2 = mean(Array.from(idx, i => errorsKms[i] ** 2));
        ii = Math.sqrt(Math.max(si * si - e2, 0));
      }
      return ii / x;
    };
    const boot = caseBootstrap({
      n,
      statistic: stat,
      draws,
      seed,
      label: 'dispersion',
    });
    if (boot.status !== 'ok') return boot;
    const finite = Array.from(boot.samples).filter(Number.isFinite);
    return {
      ...out,
      sigmaKms: sampleSd(finite),
      uncertainty: 'bootstrap',
      samples: finite,
    };
  }
  return { ...out, sigmaKms: analytic, uncertainty: 'analytic' };
}

/**
 * The excess kurtosis (unbiased) and its Gaussian standard error. Needs n >= 4.
 * @returns {{status: 'ok', g2: number, se: number, z: number, flag: boolean} | {status: 'refused'}}
 */
export function excessKurtosis(values) {
  const n = values.length;
  if (n < 4)
    return refused('too-few-values', 'the excess kurtosis needs n >= 4');
  const m = mean(values);
  let m2 = 0;
  let m4 = 0;
  for (const x of values) {
    const d = x - m;
    m2 += d * d;
    m4 += d ** 4;
  }
  m2 /= n;
  m4 /= n;
  const g2 = m4 / (m2 * m2) - 3;
  const G2 = ((n - 1) / ((n - 2) * (n - 3))) * ((n + 1) * g2 + 6);
  const se = Math.sqrt(
    (24 * n * (n - 1) ** 2) / ((n - 3) * (n - 2) * (n + 3) * (n + 5))
  );
  return {
    status: 'ok',
    g2: G2,
    se,
    z: G2 / se,
    flag: Math.abs(G2) > GAUSSIAN_FLAG_SE * se,
  };
}

/**
 * The expected number of field galaxies inside the clip window, from the density outside it (R9).
 * @param {{uKms: number[], centre: number, halfWidth: number, extentKms: number, members: number}} p
 *   uKms: velocities of the pre-selected galaxies about z_0; centre and halfWidth: the window
 * @returns {{status: 'ok'|'unknown', expectedInside?: number, share?: number, flag?: boolean}}
 */
export function contamination({ uKms, centre, halfWidth, extentKms, members }) {
  if (!(extentKms > 0)) return { status: 'unknown' };
  const lo = centre - halfWidth;
  const hi = centre + halfWidth;
  const outside = uKms.filter(u => u < lo || u > hi).length;
  const widthOutside = Math.max(2 * extentKms - 2 * halfWidth, 0);
  if (!(widthOutside > 0)) return { status: 'unknown' };
  const expectedInside = (outside / widthOutside) * (2 * halfWidth);
  const share = expectedInside / members;
  return {
    status: 'ok',
    expectedInside,
    share,
    flag: share > CONTAMINATION_FLAG,
  };
}
