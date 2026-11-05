// =============================================================================
// Radio kernel: the terminal-velocity edge of an HI spectrum
// -----------------------------------------------------------------------------
// Along a sightline inside the solar circle the gas at the tangent point has the
// largest |LSR velocity|. Near it v(d) = v_t - a (d - d_t)^2 / 2, so the gas per
// unit velocity goes as (v_t - v)^(-1/2): an edge with a spike. The gas's own
// random motions (dispersion sigma_v, a Gaussian) smooth it. With x measured
// outward from the true edge in units of sigma_v the smoothed profile is
//
//   g(x) = 2 integral_0^inf phi(x + t^2) dt          (phi the standard normal),
//
// from the substitution s = t^2 that removes the singularity. It is universal,
// so the point where it falls to a fraction f of its own peak lies a fixed
// distance c_f sigma_v beyond the true edge, and the terminal velocity is the
// measured crossing minus that distance. c_f is computed here by quadrature.
//
// The rule (EDGE_RULE, committed in tests/fixtures/radio/thresholds.json before
// this file existed):
//   E1 the terminal side, x = s v_LSR, channels sorted by x;
//   E2 the noise from the caller or the median absolute deviation of the
//      outermost tenth of the channels;
//   E3 the outer edge of emission x_out: the end of the outermost run of 3
//      channels all at or above max(5 sigma_n, 1e-3 of the side's maximum);
//   E4 the peak T_pk in the window [x_out - 5 sigma_v, x_out]; at least 10 sigma_n;
//   E5 x_e, the outermost crossing of T = f T_pk (f = 1/2) by interpolation;
//   E6 x_t = x_e - c_f sigma_v;
//   E7 refused if x_t < 3 sigma_v: the edge is not separable from the local gas.
//
// Assumes: circular orbits, gas of uniform density near the tangent point, a
// Gaussian dispersion that is known (a stated input with its own uncertainty), an
// optically thin line. The profile departs from the universal one when the gas is
// not uniform or the line is saturated; the shape term of the uncertainty stands
// for that (tangent.js).
// =============================================================================

import { refusal } from './constants.js';

/** The committed rule's parameters. */
export const EDGE_RULE = Object.freeze({
  f: 0.5,
  runChannels: 3,
  outerSigma: 5,
  windowSigmaV: 5,
  significanceSigma: 10,
  separableSigmaV: 3,
  floorFraction: 1e-3,
  outerFraction: 0.1,
});

const SQRT_2PI = Math.sqrt(2 * Math.PI);
const phi = u => Math.exp(-0.5 * u * u) / SQRT_2PI;

/** Simpson's rule with n (even) panels. */
function simpson(f, a, b, n) {
  const h = (b - a) / n;
  let s = f(a) + f(b);
  for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2);
  return (s * h) / 3;
}

const T_PANELS = 6000;
const tMax = x => Math.sqrt(Math.max(0, -x) + 12);

/**
 * The universal edge profile g(x): the inverse-square-root tangent edge smoothed
 * by a unit Gaussian, x outward from the true edge in units of sigma_v. The
 * integrand has no singularity after s = t^2, and Simpson's rule on 6000 panels
 * is exact to rounding.
 */
export const edgeProfile = x =>
  2 * simpson(t => phi(x + t * t), 0, tMax(x), T_PANELS);

/** The derivative g'(x) = -2 integral (x + t^2) phi(x + t^2) dt. */
const edgeSlope = x =>
  -2 * simpson(t => (x + t * t) * phi(x + t * t), 0, tMax(x), T_PANELS);

/** A root of f on [a, b] by bisection (f(a), f(b) of opposite sign). */
function bisect(f, a, b, tol = 1e-13) {
  let fa = f(a);
  for (let i = 0; i < 200 && b - a > tol; i++) {
    const m = 0.5 * (a + b);
    const fm = f(m);
    if (fm === 0) return m;
    if (fa * fm < 0) b = m;
    else {
      a = m;
      fa = fm;
    }
  }
  return 0.5 * (a + b);
}

const cache = new Map();

/**
 * The shape of the smoothed edge for a level f of its peak: where the peak is
 * (x_pk, below 0), its height, and c_f, the distance from the true edge to the
 * outer point where the profile falls to f of the peak.
 * @param {number} [f] fraction of the peak, in (0, 1)
 * @returns {{f: number, xPeak: number, gPeak: number, cf: number}}
 */
export function universalEdge(f = EDGE_RULE.f) {
  if (!(f > 0 && f < 1)) throw new RangeError('f must be in (0, 1)');
  if (cache.has(f)) return cache.get(f);
  const xPeak = bisect(edgeSlope, -3, 1);
  const gPeak = edgeProfile(xPeak);
  const cf = bisect(x => edgeProfile(x) - f * gPeak, xPeak, 12);
  const r = Object.freeze({ f, xPeak, gPeak, cf });
  cache.set(f, r);
  return r;
}

const median = a => {
  const s = [...a].sort((p, q) => p - q);
  const n = s.length;
  return n % 2 ? s[(n - 1) / 2] : 0.5 * (s[n / 2 - 1] + s[n / 2]);
};

/**
 * Apply the edge rule to one spectrum on its terminal side.
 *
 * @param {object} o
 * @param {number[]} o.velocity - LSR velocities, km/s, any order
 * @param {number[]} o.temperature - K, same order
 * @param {1|-1} o.side - +1 for the first quadrant (maximum velocity), -1 for the fourth
 * @param {number} o.sigmaV - the assumed gas dispersion, km/s (> 0)
 * @param {number} [o.sigmaNoise] - K; estimated by E2 when absent
 * @param {number} [o.f] - the level, default EDGE_RULE.f
 * @returns {object} {status: 'ok', xOut, xPeak, tPeak, xEdge, xTerminal, cf, sigmaNoise, slope, sigmaX, width} or a refusal record
 */
export function terminalEdge({
  velocity,
  temperature,
  side,
  sigmaV,
  sigmaNoise,
  f = EDGE_RULE.f,
}) {
  const n = velocity.length;
  const order = velocity.map((_, i) => i).sort((p, q) => side * velocity[p] - side * velocity[q]);
  const x = order.map(i => side * velocity[i]);
  const T = order.map(i => temperature[i]);

  // E2
  let sn = sigmaNoise;
  if (!(sn >= 0)) {
    const k = Math.max(5, Math.ceil(EDGE_RULE.outerFraction * n));
    const tail = T.slice(n - k);
    const m = median(tail);
    sn = 1.4826 * median(tail.map(v => Math.abs(v - m)));
  }

  // E3
  let sideMax = 0;
  for (let i = 0; i < n; i++) if (x[i] >= 0 && T[i] > sideMax) sideMax = T[i];
  const level = Math.max(EDGE_RULE.outerSigma * sn, EDGE_RULE.floorFraction * sideMax);
  const run = EDGE_RULE.runChannels;
  let iOut = -1;
  for (let i = n - 1; i >= run - 1; i--) {
    let ok = true;
    for (let j = 0; j < run; j++) if (!(T[i - j] >= level) || !(T[i - j] > 0)) ok = false;
    if (ok) {
      iOut = i;
      break;
    }
  }
  if (iOut < 0)
    return refusal(
      'edge-not-significant',
      'no run of three channels stands above the noise on this side of the spectrum, so there is no edge to measure'
    );
  const xOut = x[iOut];

  // E4
  const lo = xOut - EDGE_RULE.windowSigmaV * sigmaV;
  let iPk = -1;
  for (let i = 0; i <= iOut; i++)
    if (x[i] >= lo && (iPk < 0 || T[i] > T[iPk])) iPk = i;
  if (iPk < 0 || !(T[iPk] > 0) || (sn > 0 && T[iPk] < EDGE_RULE.significanceSigma * sn))
    return refusal(
      'edge-not-significant',
      'the line at the edge is too weak (under ten times the noise) for the terminal velocity to be read'
    );
  const tPeak = T[iPk];

  // E5: the outermost downward crossing of f T_pk between the peak and x_out.
  const target = f * tPeak;
  let j = -1;
  for (let i = iOut; i > iPk; i--) {
    if (T[i] < target && T[i - 1] >= target) {
      j = i;
      break;
    }
  }
  if (j < 0)
    return refusal(
      'edge-not-significant',
      'the line does not fall to half its peak beyond the peak'
    );
  const xEdge = x[j - 1] + ((target - T[j - 1]) * (x[j] - x[j - 1])) / (T[j] - T[j - 1]);

  // The slope there by least squares over the five channels about the crossing.
  const a = Math.max(0, j - 3);
  const b = Math.min(n - 1, j + 1);
  let sx = 0, st = 0, sxx = 0, sxt = 0, m = 0;
  for (let i = a; i <= b; i++) {
    sx += x[i];
    st += T[i];
    sxx += x[i] * x[i];
    sxt += x[i] * T[i];
    m++;
  }
  const slope = (m * sxt - sx * st) / (m * sxx - sx * sx);
  const width = x[j] - x[j - 1];
  const sigmaX =
    sn > 0 && slope !== 0 ? (sn * Math.sqrt(1 + f * f)) / Math.abs(slope) : 0;

  // E6, E7
  const { cf } = universalEdge(f);
  const xTerminal = xEdge - cf * sigmaV;
  if (xTerminal < EDGE_RULE.separableSigmaV * sigmaV)
    return refusal(
      'edge-not-separable',
      'the terminal velocity is within three gas dispersions of zero, where the edge cannot be told from the local gas',
      { xTerminal }
    );
  return {
    status: 'ok',
    xOut,
    xPeak: x[iPk],
    tPeak,
    xEdge,
    xTerminal,
    cf,
    sigmaNoise: sn,
    slope,
    sigmaX,
    width,
  };
}
