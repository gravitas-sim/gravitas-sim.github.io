// =============================================================================
// Lensing kernel: the microlensing light curve
// -----------------------------------------------------------------------------
// A point lens crossing in front of a star at a constant relative speed. The
// source-lens separation in Einstein radii is
//   u(t) = sqrt(u0^2 + ((t - t0) / tE)^2)
// (Paczynski 1986) and the magnification of a point source is
//   A(u) = (u^2 + 2) / (u sqrt(u^2 + 4)).
// Two things the point-source curve leaves out are carried as parameters:
//   finite source: a uniform disk of radius rho = theta_star / theta_E; the
//     magnification is A averaged over the disk. It matters when u0 is not
//     much larger than rho.
//   blending: the flux of other stars in the aperture. fs is the source's
//     share of the baseline flux, F = F_base (fs A + (1 - fs)).
// Uniform disk only: no limb darkening, no parallax, no lens orbital motion,
// no binary lens, no second source.
//
// The Einstein-radius crossing time tE = theta_E D_l / v carries the physics;
// timescale() gives it from a mass, distances and a relative speed.
// =============================================================================

import { einsteinAngle, massFromEinstein } from './lens.js';
import { gaussian, stream } from '../../random/streams.js';

const A = u => (u * u + 2) / (u * Math.sqrt(u * u + 4));

/** The source-lens separation (Einstein radii) at time t. */
export const separationAt = (t, p) => Math.hypot(p.u0, (t - p.t0) / p.tE);

/** Point-source magnification at separation u. */
export const pointSourceMagnification = u => (u > 0 ? A(u) : Infinity);

// Sixteen-point Gauss-Legendre on [-1, 1].
const GL_X = [
  0.0950125098376374, 0.2816035507792589, 0.4580167776572274,
  0.6178762444026438, 0.755404408355003, 0.8656312023878318, 0.9445750230732326,
  0.9894009349916499,
];
const GL_W = [
  0.1894506104550685, 0.1826034150449236, 0.1691565193950025,
  0.1495959888165767, 0.1246289712555339, 0.0951585116824928,
  0.0622535239386479, 0.0271524594117541,
];

/** Integral of f on [a, b] by sixteen-point Gauss-Legendre. */
function gauss(f, a, b) {
  const h = (b - a) / 2;
  const m = (b + a) / 2;
  let s = 0;
  for (let i = 0; i < 8; i++)
    s += GL_W[i] * (f(m - h * GL_X[i]) + f(m + h * GL_X[i]));
  return s * h;
}

/** Integral of r A(r) = (r^2+2)/sqrt(r^2+4), the closed form: r sqrt(r^2+4) / 2. */
const innerIntegral = r => (r * Math.sqrt(r * r + 4)) / 2;

/**
 * The magnification of a uniform disk of radius rho (Einstein radii) whose
 * centre is at separation u: the point-source magnification averaged over the
 * disk's area. Integrated in rings about the lens, where r A(r) is smooth:
 * inside the disk's nearest approach the whole ring counts (a closed form);
 * across the disk's edge the ring's angular share is arccos(...)/pi, and the
 * integral there is Gauss-Legendre with the end points clustered.
 * At u = 0 it is exactly sqrt(rho^2 + 4) / rho.
 */
export function finiteSourceMagnification(u, rho) {
  if (!(rho > 0)) return pointSourceMagnification(u);
  // A disk far from the lens is its centre's value to second order in rho/u.
  if (u > 40 * rho && u > 3) return A(u);
  if (u < 1e-12) return Math.sqrt(rho * rho + 4) / rho;
  const lo = Math.max(0, u - rho);
  const hi = u + rho;
  let total = 0;
  // Rings wholly inside the disk (u < rho): r from 0 to rho - u.
  if (u < rho) total += innerIntegral(rho - u);
  const ringLo = u < rho ? rho - u : lo;
  const f = r => {
    if (r <= 0) return 0;
    const c = Math.min(
      1,
      Math.max(-1, (r * r + u * u - rho * rho) / (2 * r * u))
    );
    return ((r * r + 2) / Math.sqrt(r * r + 4)) * (Math.acos(c) / Math.PI);
  };
  const pieces = 24;
  for (let k = 0; k < pieces; k++) {
    const a =
      ringLo + ((hi - ringLo) * (1 - Math.cos((Math.PI * k) / pieces))) / 2;
    const b =
      ringLo +
      ((hi - ringLo) * (1 - Math.cos((Math.PI * (k + 1)) / pieces))) / 2;
    total += gauss(f, a, b);
  }
  return (2 * total) / (rho * rho);
}

/**
 * The flux of the event relative to its baseline at each time:
 * fs * A(t) + (1 - fs), with the finite-source disk of radius p.rho when set.
 * @param {ArrayLike<number>} times - days
 * @param {{t0:number, u0:number, tE:number, fs?:number, rho?:number}} p
 */
export function microlensingFlux(times, p) {
  const fs = p.fs ?? 1;
  const rho = p.rho ?? 0;
  const out = new Float64Array(times.length);
  for (let i = 0; i < times.length; i++) {
    const u = separationAt(times[i], p);
    const a = rho > 0 ? finiteSourceMagnification(u, rho) : A(u);
    out[i] = fs * a + (1 - fs);
  }
  return out;
}

/** The peak magnification of the event as the baseline sees it, at t = t0. */
export function peakFlux(p) {
  const fs = p.fs ?? 1;
  const a =
    (p.rho ?? 0) > 0
      ? finiteSourceMagnification(p.u0, p.rho)
      : pointSourceMagnification(p.u0);
  return fs * a + (1 - fs);
}

const SECONDS_PER_DAY = 86400;

/**
 * The Einstein-radius crossing time, days: tE = theta_E D_l / v, for a lens of
 * massKg at dl from a source at ds (metres) moving across the line of sight at
 * relative speed vMs (m/s) in the lens plane.
 */
export function timescale(massKg, dl, ds, vMs) {
  return (einsteinAngle(massKg, dl, ds) * dl) / vMs / SECONDS_PER_DAY;
}

/**
 * The mass that gives crossing time tE (days) for a lens at dl moving at vMs:
 * one of the many (mass, distance, speed) triples with the same light curve.
 * tE depends only on theta_E D_l / v, so a heavier, farther or faster lens can
 * make an identical event: the degeneracy a single light curve cannot break.
 */
export function massForTimescale(tEDays, dl, ds, vMs) {
  return massFromEinstein((tEDays * SECONDS_PER_DAY * vMs) / dl, dl, ds);
}

/** A seeded standard normal source (the noise stream's), for synthetic events. */
export const gaussianNoise = seed => gaussian(stream('noise', String(seed)));
