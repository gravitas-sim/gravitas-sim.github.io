// =============================================================================
// Lambert's problem, bounded: the conic from r1 to r2 in a given time
// -----------------------------------------------------------------------------
// Universal variables (Bate, Mueller and White 1971, section 5.3; Curtis,
// algorithm 5.2), zero revolutions only. With A = +-sqrt(r1 r2 (1 + cos dth))
// and y(z) = r1 + r2 + A (z S(z) - 1) / sqrt C(z), the time of flight
//
//   sqrt(mu) t(z) = (y / C)^(3/2) S + A sqrt(y)
//
// increases with z from its least value to infinity as z approaches 4 pi^2.
// So the root is unique, and it is found inside a bracket that always holds
// it, by the Illinois false-position method, with a bisection whenever an
// Illinois step fails to halve the bracket. Nothing is started from a guess
// and hoped for.
//
// The branch is chosen, never inferred: 'prograde' is the transfer whose
// angular momentum has a positive component along `normal` (the reference
// plane's pole, +z by default), 'retrograde' the other. A transfer plane that
// contains the pole has no such component, and is refused as ambiguous.
//
// What is refused rather than solved, each with its code:
//
//   input            a number that is not finite, mu <= 0, a zero radius, or
//                    a time <= 0
//   revolutions      more than zero: multi-revolution branches are not
//                    supported (MISSION.md)
//   collinear        r1 and r2 point the same way: every plane holds them
//   antipodal        r1 and r2 point opposite ways, within 1e-3 radians: the
//                    plane, and the velocities with it, are then set by
//                    rounding, not by the problem. The velocities lose digits
//                    as 1 / sin^2 dth: measured against the 3-D kernel, 0.01
//                    degrees from 180 misses r2 by 2e-8 of its radius, 0.1
//                    degrees by 4e-10. (A Hohmann transfer is solved as one,
//                    ./transfers.js, not as a Lambert problem.)
//   branchAmbiguous  the transfer plane contains `normal`
//   tooFast          the time is shorter than the branch can reach before
//                    the hyperbola's speed overflows
//   noConvergence    the iteration limit came first
//   checkFailed      the solution, propagated independently (./twobody.js),
//                    misses r2 by more than 1e-8 of the radius: a solution
//                    that cannot reproduce its own problem is not returned
//
// Pure arithmetic; the Worker and the tests share it.
// =============================================================================

import {
  cross,
  dot,
  norm,
  propagate,
  scale,
  stumpffC,
  stumpffS,
  sub,
  vec3,
} from './twobody.js';

const { sqrt, abs, acos, PI } = Math;
export const MAX_ITERATIONS = 200;
/** |sin dth| below this is collinear or antipodal (1e-3 rad, 0.057 degrees). */
export const MIN_SIN = 1e-3;
/** The largest miss, relative to the radius, a checked solution may have. */
export const MAX_MISS = 1e-8;
const Z_MAX = 4 * PI * PI;
// cosh(sqrt(-z)) overflows past z = -(710)^2; stay well inside.
const Z_MIN = -4e5;

/**
 * @param {object} p
 * @param {number} p.mu - km^3/s^2
 * @param {number[]} p.r1 - km
 * @param {number[]} p.r2 - km
 * @param {number} p.tof - s
 * @param {'prograde'|'retrograde'} [p.direction]
 * @param {number[]} [p.normal] - The reference pole, default [0, 0, 1]
 * @param {number} [p.revolutions] - Must be 0
 */
export function lambert({
  mu,
  r1,
  r2,
  tof,
  direction = 'prograde',
  normal = [0, 0, 1],
  revolutions = 0,
}) {
  const refuse = (code, extra = {}) => ({ ok: false, status: code, ...extra });
  if (
    !(Number.isFinite(mu) && mu > 0) ||
    !vec3(r1) ||
    !vec3(r2) ||
    !vec3(normal) ||
    !Number.isFinite(tof)
  )
    return refuse('input');
  if (direction !== 'prograde' && direction !== 'retrograde')
    return refuse('input');
  if (revolutions !== 0) return refuse('revolutions');
  const n1 = norm(r1);
  const n2 = norm(r2);
  if (!(n1 > 0) || !(n2 > 0) || !(tof > 0) || !(norm(normal) > 0))
    return refuse('input');

  const c = cross(r1, r2);
  const cosT = Math.max(-1, Math.min(1, dot(r1, r2) / (n1 * n2)));
  const sinAbs = norm(c) / (n1 * n2);
  if (sinAbs < MIN_SIN) return refuse(cosT > 0 ? 'collinear' : 'antipodal');
  const along = dot(c, normal) / (norm(c) * norm(normal));
  if (abs(along) < 1e-9) return refuse('branchAmbiguous');
  // The short way (dth < pi) when the plane's own sense agrees with the one
  // asked for; the long way otherwise.
  const short = along > 0 === (direction === 'prograde');
  const dth = short ? acos(cosT) : 2 * PI - acos(cosT);
  const A = (short ? 1 : -1) * sqrt(n1 * n2 * (1 + cosT));

  const smu = sqrt(mu);
  const y = z => n1 + n2 + (A * (z * stumpffS(z) - 1)) / sqrt(stumpffC(z));
  const F = z => {
    const yz = y(z);
    if (yz < 0) return -smu * tof;
    const ratio = yz / stumpffC(z);
    return ratio * sqrt(ratio) * stumpffS(z) + A * sqrt(yz) - smu * tof;
  };

  // The bracket. Above: just short of 4 pi^2, where t(z) is unbounded.
  let hi = Z_MAX * (1 - 1e-12);
  let iterations = 0;
  // Below: where y reaches zero on the short way (t is 0 there, less than
  // any time asked for), or far down the hyperbolic side on the long way.
  let lo;
  if (A > 0) {
    let a = -4 * PI * PI;
    while (y(a) >= 0) {
      a *= 4;
      if (a < Z_MIN) return refuse('tooFast', { iterations });
    }
    let b = hi;
    for (let k = 0; k < 200 && b - a > 1e-14 * (1 + abs(a)); k++) {
      const m = (a + b) / 2;
      if (y(m) < 0) a = m;
      else b = m;
    }
    lo = b;
  } else {
    // On the long way t(z) is the difference of two terms that both grow
    // without bound as z falls, so far enough down it is rounding (at
    // z = -1e5 both are 1e60 and t reads 0). Step down only while the terms
    // are within 1e5 of the time asked for, which keeps F to 1e-11 of it;
    // a root further down is refused, not found in the noise.
    const terms = z => {
      const yz = y(z);
      const ratio = yz / stumpffC(z);
      return Math.max(ratio * sqrt(ratio) * stumpffS(z), abs(A) * sqrt(yz));
    };
    lo = -4 * PI * PI;
    while (!(F(lo) <= 0)) {
      lo *= 4;
      if (lo < Z_MIN || !(terms(lo) <= 1e5 * smu * tof))
        return refuse('tooFast', { iterations });
    }
  }

  // Illinois false position on [lo, hi]: F(lo) <= 0 < F(hi).
  let flo = F(lo);
  let fhi = F(hi);
  if (!Number.isFinite(fhi)) fhi = Number.MAX_VALUE;
  let z = lo;
  let fz = flo;
  let side = 0;
  let width = hi - lo;
  const target = 1e-13 * smu * tof;
  for (; iterations < MAX_ITERATIONS; iterations++) {
    z = (lo * fhi - hi * flo) / (fhi - flo);
    if (!(z > lo && z < hi)) z = (lo + hi) / 2;
    fz = F(z);
    if (!Number.isFinite(fz)) fz = Number.MAX_VALUE;
    if (abs(fz) <= target) break;
    if (fz > 0) {
      hi = z;
      fhi = fz;
      if (side === 1) flo /= 2;
      side = 1;
    } else {
      lo = z;
      flo = fz;
      if (side === -1) fhi /= 2;
      side = -1;
    }
    // An Illinois step that did not halve the bracket is followed by a
    // bisection, which always does.
    if (hi - lo > width / 2) {
      const m = (lo + hi) / 2;
      const fm = F(m);
      if (fm > 0) {
        hi = m;
        fhi = Number.isFinite(fm) ? fm : Number.MAX_VALUE;
      } else {
        lo = m;
        flo = fm;
      }
      side = 0;
    }
    width = hi - lo;
    if (width <= 1e-15 * (1 + abs(z))) break;
  }
  if (iterations >= MAX_ITERATIONS)
    return refuse('noConvergence', { iterations });

  const yz = y(z);
  const f = 1 - yz / n1;
  const g = A * sqrt(yz / mu);
  const gdot = 1 - yz / n2;
  const v1 = scale(sub(r2, scale(r1, f)), 1 / g);
  const v2 = scale(sub(scale(r2, gdot), r1), 1 / g);
  if (![...v1, ...v2].every(Number.isFinite))
    return refuse('noConvergence', { iterations });

  // The independent check: carry v1 forward by Kepler's equation instead.
  const check = propagate(mu, r1, v1, tof);
  const miss = check.ok ? norm(sub(check.r, r2)) / Math.max(n1, n2) : Infinity;
  const residual = abs(F(z)) / (smu * tof);
  const energy = dot(v1, v1) / 2 - mu / n1;
  const result = {
    z,
    v1,
    v2,
    iterations: iterations + 1,
    residual,
    miss,
    transferAngle: dth,
    branch: short ? 'short' : 'long',
    direction,
    conic: abs(z) < 1e-10 ? 'parabola' : z > 0 ? 'ellipse' : 'hyperbola',
    a: -mu / (2 * energy),
    condition: 1 / sinAbs,
  };
  if (!(miss <= MAX_MISS)) return refuse('checkFailed', result);
  return { ok: true, status: 'ok', ...result };
}
