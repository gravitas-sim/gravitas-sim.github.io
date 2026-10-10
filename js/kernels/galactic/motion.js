// =============================================================================
// Galactic kernel: solar motion, dispersions and the Oort constants
// -----------------------------------------------------------------------------
// Three measurements a student makes from Gaia astrometry:
//
// - The Sun's motion relative to a sample of stars: the negative of the
//   sample's mean space velocity, its speed and the direction it points (the
//   solar apex), each with the error of the mean. For a sample of nearby
//   stars of all kinds that is the motion relative to the mean of those
//   stars, not yet relative to the local standard of rest: stars older and
//   hotter in their motions lag the rotation (asymmetric drift), which
//   lsrCorrection() estimates from the Stromberg relation.
// - Velocity dispersions with their uncertainties.
// - The Oort constants A and B from proper motions alone: to first order in
//   distance a star at Galactic longitude l has
//       4.74047 mu_l* [km/s/kpc] = A cos(2l) + B + (U sin l - V cos l) parallax
//   (parallax in mas = 1/distance in kpc; the last term is the reflex of the
//   Sun's own motion), a linear fit in four unknowns.
//
// Pure: no DOM, no clock. Estimates carry errors from the scatter about the fit
// (an unweighted fit has no other honest source) and say so.
// =============================================================================

import { K_PM, propermotionToGalactic, spaceVelocity } from './coords.js';

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

/** Mean, sample standard deviation and the error of each, of a list of numbers. */
export function dispersion(values) {
  const v = values.filter(Number.isFinite);
  const n = v.length;
  if (n < 2)
    return { n, mean: n ? v[0] : NaN, sigma: NaN, meanErr: NaN, sigmaErr: NaN };
  const mean = v.reduce((a, b) => a + b, 0) / n;
  const sigma = Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1));
  return {
    n,
    mean,
    sigma,
    // The error of the mean, and of a standard deviation of a Gaussian sample.
    meanErr: sigma / Math.sqrt(n),
    sigmaErr: sigma / Math.sqrt(2 * (n - 1)),
  };
}

/**
 * Space velocities of the stars of a sample that have the astrometry.
 * @param {Array<object>} stars - As spaceVelocity takes
 * @param {{maxDistance?: number, minDistance?: number}} [opts] - kpc
 */
export function spaceVelocities(stars, opts = {}) {
  const out = [];
  for (const s of stars) {
    const v = spaceVelocity(s);
    if (!v || !Number.isFinite(v.U + v.V + v.W)) continue;
    if (opts.maxDistance !== undefined && v.distance > opts.maxDistance)
      continue;
    if (opts.minDistance !== undefined && v.distance < opts.minDistance)
      continue;
    out.push(v);
  }
  return out;
}

/**
 * The Sun's velocity relative to the mean of a sample, its speed and apex.
 * @param {Array<{U: number, V: number, W: number}>} velocities - From spaceVelocities
 * @returns {{n: number, U: number, V: number, W: number, errU: number,
 *   errV: number, errW: number, speed: number, speedErr: number, apexL: number,
 *   apexB: number, sigma: {U: number, V: number, W: number},
 *   sigmaErr: {U: number, V: number, W: number}}}
 */
export function solarMotion(velocities) {
  const u = dispersion(velocities.map(v => v.U));
  const v = dispersion(velocities.map(x => x.V));
  const w = dispersion(velocities.map(x => x.W));
  // The Sun moves opposite to the sample's mean velocity as seen from it.
  const U = -u.mean;
  const V = -v.mean;
  const W = -w.mean;
  const speed = Math.hypot(U, V, W);
  const speedErr =
    Math.sqrt(
      (U * u.meanErr) ** 2 + (V * v.meanErr) ** 2 + (W * w.meanErr) ** 2
    ) / speed;
  return {
    n: u.n,
    U,
    V,
    W,
    errU: u.meanErr,
    errV: v.meanErr,
    errW: w.meanErr,
    speed,
    speedErr,
    apexL: (Math.atan2(V, U) * RAD + 360) % 360,
    apexB: Math.asin(W / speed) * RAD,
    sigma: { U: u.sigma, V: v.sigma, W: w.sigma },
    sigmaErr: { U: u.sigmaErr, V: v.sigmaErr, W: w.sigmaErr },
  };
}

/**
 * The asymmetric-drift estimate of how far the sample's mean V lags the local
 * standard of rest: sigma_U^2 / k with k = 80 km/s (Binney and Tremaine 2008,
 * section 4.8.2, the Stromberg relation, with Dehnen and Binney 1998's slope
 * for the solar neighbourhood). It is a correction for a whole population, not
 * for any one star, and it carries the slope's own uncertainty, which this
 * function does not pretend to know better than about 20 percent.
 * @param {number} sigmaU - km/s
 * @returns {number} km/s the sample's mean V lags the LSR; the Sun's V relative to the LSR is its V relative to the sample less this
 */
export function lsrCorrection(sigmaU) {
  return (sigmaU * sigmaU) / 80;
}

/**
 * The solar motion relative to the LSR from the sample's own dispersion: the
 * Sun's V relative to the sample's mean, less the amount the sample lags the
 * LSR.
 */
export function solarMotionLsr(velocities) {
  const m = solarMotion(velocities);
  return { ...m, V: m.V - lsrCorrection(m.sigma.U) };
}

/**
 * The Sun's V relative to the local standard of rest from the way a sample's
 * mean V depends on its velocity dispersion (Stromberg 1946; Dehnen and
 * Binney 1998): stars with larger dispersion lag the rotation more, in
 * proportion to sigma_U^2, so a straight line through the groups' mean V
 * against sigma_U^2, extended to zero dispersion, is the V of a population at
 * rest in the LSR. The intercept is minus the Sun's V, and the slope is
 * minus 1/k, k being the lag constant (about 80 km/s).
 *
 * @param {Array<Array<{U: number, V: number, W: number}>>} groups - velocities of each group (a colour bin, say)
 * @returns {{vSun: number, vSunErr: number, k: number, groups: Array<{n: number, sigmaU2: number, meanV: number}>}}
 */
export function fitAsymmetricDrift(groups) {
  const g = groups
    .map(v => {
      const u = dispersion(v.map(x => x.U));
      const w = dispersion(v.map(x => x.V));
      return { n: u.n, sigmaU2: u.sigma ** 2, meanV: w.mean, err: w.meanErr };
    })
    .filter(x => x.n >= 5 && Number.isFinite(x.sigmaU2));
  if (g.length < 3) throw new Error('too few groups for the drift fit');
  let sw = 0;
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let sxy = 0;
  for (const x of g) {
    const w = 1 / (x.err * x.err);
    sw += w;
    sx += w * x.sigmaU2;
    sy += w * x.meanV;
    sxx += w * x.sigmaU2 * x.sigmaU2;
    sxy += w * x.sigmaU2 * x.meanV;
  }
  const det = sw * sxx - sx * sx;
  const slope = (sw * sxy - sx * sy) / det;
  const icpt = (sxx * sy - sx * sxy) / det;
  return {
    vSun: -icpt,
    vSunErr: Math.sqrt(sxx / det),
    k: -1 / slope,
    groups: g.map(x => ({ n: x.n, sigmaU2: x.sigmaU2, meanV: x.meanV })),
  };
}

/** Solve the normal equations of a small least-squares problem. */
function solve(a, b) {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++)
      if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
    [m[c], m[p]] = [m[p], m[c]];
    for (let r = c + 1; r < n; r++) {
      const f = m[r][c] / m[c][c];
      for (let k = c; k <= n; k++) m[r][k] -= f * m[c][k];
    }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = m[r][n];
    for (let k = r + 1; k < n; k++) s -= m[r][k] * x[k];
    x[r] = s / m[r][r];
  }
  return x;
}

function invert(a) {
  const n = a.length;
  const cols = [];
  for (let i = 0; i < n; i++) {
    const e = new Array(n).fill(0);
    e[i] = 1;
    cols.push(solve(a, e));
  }
  return a.map((_, i) => cols.map(c => c[i]));
}

/**
 * The Oort constants from proper motions in Galactic longitude.
 *
 * Each star is a row of the linear model
 *   y = 4.74047 mu_l*  =  A cos 2l + B + c1 parallax sin l - c2 parallax cos l
 * with y in km/s/kpc; c1 is the Sun's U and c2 its V (km/s) relative to the
 * stars fitted. `weight: 'distance'` weights each star by 1/parallax^2 times
 * 1, since a velocity scatter of sigma km/s is a scatter of sigma*parallax in y:
 * nearer stars are noisier in y, and an unweighted fit is dominated by them.
 *
 * @param {Array<{ra: number, dec: number, parallax: number, pmRa: number,
 *   pmDec: number}>} stars
 * @param {{maxDistance?: number, minParallaxOverError?: number,
 *   weight?: 'none'|'distance'}} [opts] - maxDistance in kpc; the weight
 *   defaults to 'distance', for the reason above
 * @returns {{n: number, A: number, B: number, errA: number, errB: number,
 *   solarU: number, solarV: number, omega: number, omegaErr: number,
 *   rms: number, errors: string}}
 *   omega = A - B, the angular speed of the local circular orbit, km/s/kpc
 */
export function fitOortConstants(stars, opts = {}) {
  const rows = [];
  for (const s of stars) {
    if (!(s.parallax > 0)) continue;
    if (opts.maxDistance !== undefined && 1 / s.parallax > opts.maxDistance)
      continue;
    const { l, pmL } = propermotionToGalactic(s.ra, s.dec, s.pmRa, s.pmDec);
    const y = K_PM * pmL;
    if (!Number.isFinite(y)) continue;
    const L = l * DEG;
    rows.push({
      x: [
        Math.cos(2 * L),
        1,
        s.parallax * Math.sin(L),
        -s.parallax * Math.cos(L),
      ],
      y,
      w: opts.weight === 'none' ? 1 : 1 / (s.parallax * s.parallax),
    });
  }
  const n = rows.length;
  if (n < 8) throw new Error('too few stars for the Oort fit');
  const k = 4;
  const ata = Array.from({ length: k }, () => new Array(k).fill(0));
  const atb = new Array(k).fill(0);
  for (const r of rows)
    for (let i = 0; i < k; i++) {
      atb[i] += r.w * r.x[i] * r.y;
      for (let j = 0; j < k; j++) ata[i][j] += r.w * r.x[i] * r.x[j];
    }
  const p = solve(ata, atb);
  let ss = 0;
  let sw = 0;
  for (const r of rows) {
    const e = r.y - r.x.reduce((a, v, i) => a + v * p[i], 0);
    ss += r.w * e * e;
    sw += r.w;
  }
  // The residual scatter, weight-normalised, sets the covariance.
  const scale = ss / (n - k);
  const cov = invert(ata).map(row => row.map(v => v * scale));
  const [A, B, solarU, solarV] = p;
  const omega = A - B;
  const omegaErr = Math.sqrt(cov[0][0] + cov[1][1] - 2 * cov[0][1]);
  return {
    n,
    A,
    B,
    errA: Math.sqrt(cov[0][0]),
    errB: Math.sqrt(cov[1][1]),
    solarU,
    solarV,
    omega,
    omegaErr,
    rms: Math.sqrt(ss / sw),
    errors:
      'from the scatter about the fit; the stars share one velocity field, so they are not independent of each other',
  };
}
