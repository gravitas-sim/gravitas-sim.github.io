// =============================================================================
// Labelled synthetic clusters (Prompt 250; thresholds.json worlds)
// -----------------------------------------------------------------------------
// Everything here is SYNTHETIC: invented clusters with a truth manifest, drawn from the 'noise' stream of
// js/random/streams.js forked by the leg's seed and the world index and, within a world, by a purpose, so
// a world does not depend on the order the others were drawn in. Nothing is a measurement.
//
// The toy cluster is a truncated r^-2 sphere (r = r_t U, cos(theta) uniform) with isotropic Gaussian
// velocities of dispersion sigma at every radius: not a self-consistent system, no equilibrium is
// asserted. Its declared truth is the mass of the singular isothermal halo that would bind such tracers,
// M(<r_t) = 2 sigma^2 r_t / G. The projected half-number radius is x_half r_t where P(x) = 1 - sqrt(1 -
// x^2) + x arccos(x) equals 1/2, so K_phys = 2 / x_half makes K sigma^2 R_half / G the truth.
// Redshifts are z = z_c + (1 + z_c) v / c, the exact inverse of the kernel's linear velocity.
// =============================================================================

import { gaussian, stream } from '../../../random/streams.js';
import { G_SI } from '../../../constants.js';
import { C_KMS, MPC_M, SYNTHETIC_LABEL } from './constants.js';
import { cosmologyOf, destination } from './geometry.js';

/** P(x): the fraction of a truncated r^-2 sphere's members projected inside x r_t. */
export const projectedFraction = x =>
  1 - Math.sqrt(1 - x * x) + x * Math.acos(x);

/** x_half, the root of P(x) = 1/2, by bisection. */
export function xHalf() {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 200; i++) {
    const mid = 0.5 * (lo + hi);
    if (mid === lo || mid === hi) break;
    if (projectedFraction(mid) < 0.5) lo = mid;
    else hi = mid;
  }
  return 0.5 * (lo + hi);
}

/** The projection factor that makes K sigma^2 R_half / G equal the toy cluster's declared mass. */
export const kPhys = () => 2 / xHalf();

/** The declared truth mass of a toy cluster, kg: 2 sigma^2 r_t / G (sigma km/s, r_t Mpc). */
export const toyMassKg = (sigmaKms, rtMpc) =>
  (2 * (sigmaKms * 1000) ** 2 * (rtMpc * MPC_M)) / G_SI;

const ln = Math.log;

/**
 * One world.
 * @param {{seed: string, index: number, cosmology: object, kind?: 'toy'|'bimodal'|'field',
 *   N?: number, sigma?: number, zc?: number, rt?: number, interloperFraction?: number,
 *   errorKms?: number, etaSigma?: number, eta?: number, light?: boolean, extentKms?: number}} o
 */
export function clusterWorld(o) {
  const { seed, index, cosmology, kind = 'toy' } = o;
  const cosmo = cosmologyOf(cosmology);
  const u = stream('noise', seed, String(index));
  const dN = u();
  const dSigma = u();
  const dZ = u();
  const dR = u();
  const dRa = u();
  const dDec = u();
  const dGuess = u();
  const N = o.N ?? Math.round(Math.exp(ln(40) + dN * (ln(300) - ln(40))));
  const sigma = o.sigma ?? Math.exp(ln(400) + dSigma * (ln(1200) - ln(400)));
  const zc = o.zc ?? 0.02 + dZ * 0.13;
  const rt = o.rt ?? Math.exp(dR * ln(2));
  const centre = { ra: dRa * 360, dec: -60 + 120 * dDec };
  const guessKms = (2 * dGuess - 1) * 1500;
  const extentKms = o.extentKms ?? 8000;
  const errorKms = o.errorKms ?? 50;
  const frac = o.interloperFraction ?? 0.02;
  const pos = stream('noise', seed, String(index), 'pos');
  const vel = gaussian(stream('noise', seed, String(index), 'vel'));
  const err = gaussian(stream('noise', seed, String(index), 'err'));
  const intr = stream('noise', seed, String(index), 'int');
  const etaN = gaussian(stream('noise', seed, String(index), 'eta'));
  const da = cosmo.angularDiameterDistance(zc);
  const galaxies = [];
  const zOf = vObs => zc + ((1 + zc) * vObs) / C_KMS;
  const zErr = (errorKms * (1 + zc)) / C_KMS;
  const apertureMpc = 1.001 * rt;

  const memberCount = kind === 'field' ? 0 : N;
  for (let i = 0; i < memberCount; i++) {
    const r = rt * pos();
    const c = 2 * pos() - 1;
    const bearing = 2 * Math.PI * pos();
    const R = r * Math.sqrt(1 - c * c);
    const sky = destination(centre.ra, centre.dec, bearing, R / da);
    let v;
    if (kind === 'bimodal') v = (i % 2 ? 1 : -1) * 3 * 400 + 400 * vel();
    else v = sigma * vel();
    galaxies.push({
      ...sky,
      z: zOf(v + errorKms * err()),
      zErr,
    });
  }
  const nInt = kind === 'field' ? N : Math.round(frac * N);
  let insideWindow = 0;
  for (let i = 0; i < nInt; i++) {
    const R = apertureMpc * Math.sqrt(intr());
    const bearing = 2 * Math.PI * intr();
    const sky = destination(centre.ra, centre.dec, bearing, R / da);
    const v = (2 * intr() - 1) * extentKms;
    if (Math.abs(v) < 3 * sigma) insideWindow++;
    galaxies.push({ ...sky, z: zOf(v + errorKms * err()), zErr });
  }

  const etaSigma = o.etaSigma ?? 0;
  const etaDraw = Math.max(-3, Math.min(3, etaN()));
  const eta = o.eta ?? etaSigma * etaDraw;
  const truth = {
    kind,
    index,
    sigma,
    zc,
    rt,
    members: memberCount,
    memberIds: Array.from({ length: memberCount }, (_, i) => i),
    interlopers: nInt,
    interlopersInsideWindow3Sigma: insideWindow,
    eta,
    massKg: toyMassKg(sigma, rt) * (1 + eta),
    idealisedMassKg: toyMassKg(sigma, rt),
    xHalf: xHalf(),
    kPhys: kPhys(),
    rHalfMpc: xHalf() * rt,
    angularDiameterMpc: da,
    errorKms,
  };

  const world = {
    synthetic: true,
    label: SYNTHETIC_LABEL,
    truth,
    galaxies,
    centre,
    zGuess: zc + ((1 + zc) * guessKms) / C_KMS,
    aperture: { radiusMpc: apertureMpc },
    cosmology: { ...cosmology },
    velocityExtentKms: extentKms,
  };

  if (o.light) {
    const phot = gaussian(stream('noise', seed, String(index), 'phot'));
    const absM = stream('noise', seed, String(index), 'absm');
    const dm = cosmo.distanceModulus(zc);
    const k = 0.05;
    const A = 0.1;
    const magErr = 0.05;
    const solar = 4.5;
    const limitAbs = -19;
    let truthSum = 0;
    for (let i = 0; i < memberCount; i++) {
      const M = -23 + 6 * absM();
      galaxies[i].mag = M + dm + k + A + magErr * phot();
      galaxies[i].magErr = magErr;
      galaxies[i].k = k;
      galaxies[i].A = A;
      if (M <= limitAbs) truthSum += 10 ** (-0.4 * (M - solar));
    }
    truth.lightSolar = truthSum;
    world.light = {
      solarAbsMag: { value: solar, source: 'invented for the test' },
      limitMag: limitAbs + dm + k + A,
    };
  }
  return world;
}
