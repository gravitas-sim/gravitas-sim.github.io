// The virial theorem's mass estimator for a pressure-supported cluster (Prompt 237, DYNAMICS.md):
//
//   M = eta sigma_los^2 R_h / G,   eta = 32 / pi
//
// sigma_los the intrinsic line-of-sight dispersion of the members (the maximum-likelihood fit that
// separates it from the measurement errors) and R_h the projected half-number radius. For an
// isotropic Plummer sphere <v^2> = (3 pi / 32) G M / a and the projected half-mass radius is a, so
// the factor is exact there and an assumption everywhere else: the interval carries a structure
// term of VIRIAL.structureSigma (a 1 sigma lognormal) that is a stated assumption, not a measurement.
// The statistical part is a case bootstrap of the members (Prompt 154's statistics kernel).
// Fewer than VIRIAL.minimumMembers members, or a dispersion not resolved at VIRIAL.resolvedSigmas
// times its error, is "not constrained".
import { refused, allFinite } from '../statistics/check.js';
import { caseBootstrap } from '../statistics/resample.js';
import { sigmaOfLevel } from '../statistics/intervals.js';
import { G_PC_KMS2_MSUN, VIRIAL } from './constants.js';

const { Math, Number, Float64Array } = globalThis;

/**
 * The maximum-likelihood intrinsic dispersion of velocities v with errors e, and its Fisher error.
 * @returns {{mean: number, sigma: number, sigmaError: number}} sigma is 0 when the data are no wider than the errors
 */
export function intrinsicDispersion(v, e) {
  const n = v.length;
  const solve = s2 => {
    let sw = 0;
    let swv = 0;
    for (let i = 0; i < n; i++) {
      const w = 1 / (s2 + e[i] * e[i]);
      sw += w;
      swv += w * v[i];
    }
    const mu = swv / sw;
    let g = 0;
    for (let i = 0; i < n; i++) {
      const w = 1 / (s2 + e[i] * e[i]);
      const d = v[i] - mu;
      g += w * w * d * d - w;
    }
    return { mu, g };
  };
  const g0 = solve(0);
  let mean = g0.mu;
  let sigma = 0;
  if (g0.g > 0) {
    let lo = 0;
    let hi = 1;
    let spread = 0;
    for (let i = 0; i < n; i++) spread += (v[i] - g0.mu) ** 2;
    hi = Math.sqrt(spread / n) * 2 + 1e-12;
    for (let k = 0; k < 80; k++) {
      const mid = 0.5 * (lo + hi);
      if (solve(mid * mid).g > 0) lo = mid;
      else hi = mid;
    }
    sigma = 0.5 * (lo + hi);
    mean = solve(sigma * sigma).mu;
  }
  let fisher = 0;
  for (let i = 0; i < n; i++) {
    const w = 1 / (sigma * sigma + e[i] * e[i]);
    fisher += 2 * sigma * sigma * w * w;
  }
  return { mean, sigma, sigmaError: sigma > 0 ? 1 / Math.sqrt(fisher) : Infinity };
}

/** The projected half-number radius about the centroid of the members. */
export function halfNumberRadius(x, y) {
  const n = x.length;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < n; i++) {
    cx += x[i];
    cy += y[i];
  }
  cx /= n;
  cy /= n;
  const r = new Float64Array(n);
  for (let i = 0; i < n; i++) r[i] = Math.hypot(x[i] - cx, y[i] - cy);
  r.sort();
  return n % 2 ? r[(n - 1) / 2] : 0.5 * (r[n / 2 - 1] + r[n / 2]);
}

const massOf = (sigma, rh) => (VIRIAL.eta * sigma * sigma * rh) / G_PC_KMS2_MSUN;

/**
 * The virial mass of a cluster from its members.
 *
 * @param {{x: ArrayLike<number>, y: ArrayLike<number>, v: ArrayLike<number>, e: ArrayLike<number>,
 *   level?: number, draws?: number, seed: string|number}} args - projected positions (pc), line-of-sight
 *   velocities and their errors (km/s), the coverage of the interval (0.6827), the bootstrap draws (400)
 * @returns {object} { status: 'ok', mass, lo, hi, ... } | { status: 'not-constrained', code, why } | a refusal
 */
export function virialMass({ x, y, v, e, level = 0.6827, draws = 400, seed }) {
  const n = v?.length;
  if (!x || !y || !v || !e || x.length !== n || y.length !== n || e.length !== n)
    return refused('shape', 'the positions, the velocities and the errors must be lists of one length');
  if (!(allFinite(x) && allFinite(y) && allFinite(v) && allFinite(e)))
    return refused('finite', 'a position, a velocity or an error is not a finite number');
  for (let i = 0; i < n; i++)
    if (!(e[i] > 0)) return refused('error', `the error of member ${i} is not positive`);
  if (!(level > 0 && level < 1)) return refused('level', 'the level is not between 0 and 1');
  if (n < VIRIAL.minimumMembers)
    return {
      status: 'not-constrained',
      code: 'members',
      members: n,
      need: VIRIAL.minimumMembers,
      why: `${n} members: a dispersion from fewer than ${VIRIAL.minimumMembers} stars is not a mass`,
    };
  const rh = halfNumberRadius(x, y);
  if (!(rh > 0)) return refused('radius', 'the half-number radius is zero: every member is at one position');
  const fit = intrinsicDispersion(v, e);
  if (!(fit.sigma > 0) || fit.sigma < VIRIAL.resolvedSigmas * fit.sigmaError)
    return {
      status: 'not-constrained',
      code: 'dispersion',
      members: n,
      sigma: fit.sigma,
      sigmaError: fit.sigmaError,
      why: `the dispersion is not resolved against the errors (${fit.sigma.toFixed(3)} km/s is less than ${VIRIAL.resolvedSigmas} times its error ${Number.isFinite(fit.sigmaError) ? fit.sigmaError.toFixed(3) : 'unbounded'})`,
    };
  const M = massOf(fit.sigma, rh);
  const boot = caseBootstrap({
    n,
    seed,
    draws,
    label: 'virial-mass',
    statistic: idx => {
      const xs = new Float64Array(n);
      const ys = new Float64Array(n);
      const vs = new Float64Array(n);
      const es = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        xs[i] = x[idx[i]];
        ys[i] = y[idx[i]];
        vs[i] = v[idx[i]];
        es[i] = e[idx[i]];
      }
      const s = intrinsicDispersion(vs, es).sigma;
      const r = halfNumberRadius(xs, ys);
      return s > 0 && r > 0 ? massOf(s, r) : NaN;
    },
  });
  if (boot.status !== 'ok') return boot;
  let k = 0;
  let mean = 0;
  for (const m of boot.samples)
    if (m > 0) {
      k++;
      mean += Math.log(m);
    }
  if (k < Math.ceil(draws / 2))
    return {
      status: 'not-constrained',
      code: 'resample',
      members: n,
      why: 'more than half of the resamples have no resolved dispersion',
    };
  mean /= k;
  let var2 = 0;
  for (const m of boot.samples) if (m > 0) var2 += (Math.log(m) - mean) ** 2;
  const bootstrap = Math.sqrt(var2 / (k - 1));
  const total = Math.hypot(bootstrap, VIRIAL.structureSigma);
  const z = sigmaOfLevel(level);
  return {
    status: 'ok',
    mass: M,
    lo: M * Math.exp(-z * total),
    hi: M * Math.exp(z * total),
    level,
    members: n,
    sigmaLos: fit.sigma,
    sigmaLosError: fit.sigmaError,
    halfNumberRadius: rh,
    eta: VIRIAL.eta,
    parts: { bootstrapSigmaLn: bootstrap, structureSigmaLn: VIRIAL.structureSigma },
    method: 'case bootstrap of the members with a lognormal structure term, percentile-free (normal in the logarithm)',
    assumes: [
      'the members are a random sample of the cluster, with no foreground, no binaries inflating the dispersion and no members chosen by velocity',
      'the cluster is in virial equilibrium, pressure supported and not rotating',
      `eta = 32 / pi is exact for an isotropic Plummer sphere; a structure term of ${VIRIAL.structureSigma} (1 sigma, lognormal) stands for the other profiles and is an assumption`,
      'R_h is the projected half-number radius of the members, standing for the half-light radius',
    ],
    stream: boot.stream ?? null,
  };
}
