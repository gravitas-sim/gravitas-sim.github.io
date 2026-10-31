// =============================================================================
// Signals injected into noise, for testing the inference core against truth
// -----------------------------------------------------------------------------
// Seeded: the same seed gives the same noise, bit for bit, everywhere. The
// noise is Gaussian (Box-Muller over js/rng.js's mulberry32), white, and of the
// stated standard deviation; tools/inference-validate.mjs injects signals like
// these over hundreds of seeds and measures what the core recovers, and how
// often its stated uncertainty holds the truth.
// =============================================================================

import { gaussian as normals, stream } from '../random/streams.js';
import { limbDarkening, transitFlux } from './transit.js';
import { rvCurve } from './rv.js';
import { eclipseFlux } from './binaries.js';
import { rvPair } from './binaryMasses.js';
import { circularEquivalent } from './jointPlanet.js';

/** A seeded standard normal. */
export const gaussian = seed => normals(stream('noise', String(seed)));

/**
 * A transit light curve at given times, with white noise.
 * @param {{seed: string, times: ArrayLike<number>, sigma: number,
 *   truth: {t0, P, k, aRs, b, q1, q2} or {t0, P, k, aRs, b, c: [c1..c4]}
 *   (the four-coefficient law), f0?: number, exposure?: number,
 *   supersample?: number, dilution?: number, bumps?: Array<{t: number,
 *   amplitude: number, sigma: number}>}} o - bumps are Gaussian excesses in
 *   the flux, a spot the planet crosses (a model the fit does not have)
 */
export function syntheticTransit(o) {
  const law = o.truth.c ? {} : limbDarkening(o.truth.q1, o.truth.q2);
  const clean = transitFlux(
    o.times,
    { ...o.truth, ...law },
    { exposure: o.exposure ?? 0, supersample: o.supersample ?? 11, annuli: 96 }
  );
  for (const bump of o.bumps ?? [])
    for (let i = 0; i < clean.length; i++)
      clean[i] +=
        bump.amplitude *
        Math.exp(-0.5 * ((o.times[i] - bump.t) / bump.sigma) ** 2);
  const n = gaussian(o.seed);
  const f0 = o.f0 ?? 1;
  const keep = 1 - (o.dilution ?? 0);
  return {
    x: Float64Array.from(o.times),
    y: Float64Array.from(clean, v => f0 * (1 - (1 - v) * keep) + o.sigma * n()),
    sigma: new Float64Array(o.times.length).fill(o.sigma),
    groups: null,
    rows: Array.from(o.times, (_, i) => i),
    counts: {
      total: o.times.length,
      used: o.times.length,
      masked: 0,
      missing: 0,
      withoutUncertainty: 0,
    },
    columns: { x: 'time', y: 'flux', sigma: 'flux-error' },
    units: { x: 'd', y: '' },
    perDay: 1,
  };
}

/**
 * Radial velocities at given times, with white noise and a jitter.
 * @param {{seed: string, times: ArrayLike<number>, sigma: number,
 *   jitter?: number, gamma?: number, truth: {P, tc, K, sqrtEcosw,
 *   sqrtEsinw}}} o
 */
export function syntheticRv(o) {
  const clean = rvCurve(o.times, o.truth);
  const n = gaussian(o.seed);
  const spread = Math.sqrt(o.sigma ** 2 + (o.jitter ?? 0) ** 2);
  return {
    x: Float64Array.from(o.times),
    y: Float64Array.from(clean, v => v + (o.gamma ?? 0) + spread * n()),
    sigma: new Float64Array(o.times.length).fill(o.sigma),
    groups: null,
    rows: Array.from(o.times, (_, i) => i),
    counts: {
      total: o.times.length,
      used: o.times.length,
      masked: 0,
      missing: 0,
      withoutUncertainty: 0,
    },
    columns: { x: 'time', y: 'rv', sigma: 'rv-error' },
    units: { x: 'd', y: 'm/s' },
    perDay: 1,
  };
}

/** Times like a TESS sector: 20-minute bins across 27 days, with a gap. */
export function tessLikeTimes(
  start = 2825.27,
  days = 27.9,
  binDays = 20 / 1440
) {
  const out = [];
  for (let t = start; t < start + days; t += binDays) {
    // The downlink gap in the middle of a sector.
    if (t > start + 13.1 && t < start + 14.4) continue;
    out.push(t);
  }
  return out;
}

/**
 * An eclipsing-binary light curve at given times, with white noise and, for a
 * misspecification test, an out-of-eclipse modulation the model does not have.
 * @param {{seed: string, times: ArrayLike<number>, sigma: number,
 *   truth: object, exposure?: number, supersample?: number,
 *   modulation?: {amplitude: number, period: number, phase: number}}} o
 *   truth is the parameter set of js/inference/binaries.js eclipseFlux()
 */
export function syntheticEclipse(o) {
  const clean = eclipseFlux(o.times, o.truth, {
    exposure: o.exposure ?? 0,
    supersample: o.supersample ?? 5,
  });
  const n = gaussian(o.seed);
  const m = o.modulation;
  return {
    x: Float64Array.from(o.times),
    y: Float64Array.from(clean, (v, i) => {
      const spot = m
        ? 1 +
          m.amplitude *
            Math.sin((2 * Math.PI * o.times[i]) / m.period + m.phase)
        : 1;
      return v * spot + o.sigma * n();
    }),
    sigma: new Float64Array(o.times.length).fill(o.sigma),
    groups: null,
    rows: Array.from(o.times, (_, i) => i),
    counts: {
      total: o.times.length,
      used: o.times.length,
      masked: 0,
      missing: 0,
      withoutUncertainty: 0,
    },
    columns: { x: 'time', y: 'flux', sigma: 'flux-error' },
    units: { x: 'd', y: '' },
    perDay: 1,
  };
}

/**
 * A double-lined spectroscopic orbit, with or without its eclipse light curve,
 * as one table whose rows are told apart by the groups column (flux rows, then
 * star 1's velocities, then star 2's): the input of js/inference/binaryJoint.js.
 * The velocities are measured at the same epochs for both stars; the epochs
 * are drawn uniformly over the span by a stream of the seed.
 * @param {{seed: string, truth: object, fluxTimes?: ArrayLike<number>|null,
 *   sigmaFlux?: number, rvTimes?: ArrayLike<number>, nRv?: number,
 *   span?: [number, number], sigmaRv: number, gamma?: number, dgamma?: number,
 *   singleLined?: boolean, swap?: boolean, modulation?: object}} o
 *   truth: binaries.js eclipseFlux()'s set plus K1 and K2 (km/s)
 */
export function syntheticSb2(o) {
  const t = o.truth;
  const noise = gaussian(o.seed);
  const draw = stream('noise', String(o.seed), 'epochs');
  const rvTimes =
    o.rvTimes ??
    Float64Array.from(
      { length: o.nRv ?? 20 },
      () => o.span[0] + (o.span[1] - o.span[0]) * draw()
    ).sort();
  const fluxTimes = o.fluxTimes ? Float64Array.from(o.fluxTimes) : null;
  const x = [];
  const y = [];
  const sigma = [];
  const groups = [];
  const roles = [];
  if (fluxTimes) {
    const clean = eclipseFlux(fluxTimes, t, {
      exposure: o.exposure ?? 0,
      supersample: o.supersample ?? 1,
    });
    const m = o.modulation;
    roles.push('flux');
    fluxTimes.forEach((time, i) => {
      const spot = m
        ? 1 + m.amplitude * Math.sin((2 * Math.PI * time) / m.period + m.phase)
        : 1;
      x.push(time);
      y.push(clean[i] * spot + o.sigmaFlux * noise());
      sigma.push(o.sigmaFlux);
      groups.push(0);
    });
  }
  const v = rvPair(rvTimes, t);
  const sets = o.singleLined
    ? [['rv1', v.v1]]
    : [
        ['rv1', v.v1],
        ['rv2', v.v2],
      ];
  for (const [role, vel] of sets) {
    roles.push(role);
    const g = roles.length - 1;
    const which = o.swap ? (role === 'rv1' ? v.v2 : v.v1) : vel;
    rvTimes.forEach((time, i) => {
      x.push(time);
      y.push(
        which[i] +
          (o.gamma ?? 0) +
          (role === 'rv2' ? (o.dgamma ?? 0) : 0) +
          o.sigmaRv * noise()
      );
      sigma.push(o.sigmaRv);
      groups.push(g);
    });
  }
  return {
    x: Float64Array.from(x),
    y: Float64Array.from(y),
    sigma: Float64Array.from(sigma),
    groups: Int32Array.from(groups),
    roles,
    rows: Array.from(x, (_, i) => i),
    counts: {
      total: x.length,
      used: x.length,
      masked: 0,
      missing: 0,
      withoutUncertainty: 0,
    },
    columns: { x: 'time', y: 'value', sigma: 'error' },
    units: { x: 'd', y: '' },
    perDay: 1,
  };
}

/**
 * A joint transit and velocity table (the model `transit-rv-joint`): the
 * light curve of one group and the velocities of one or more instruments, in
 * one table with a groups column, white noise and a jitter on the velocities.
 * The truth is the model's own parameter set with a/R* the TRUE ratio.
 * @param {{seed: string, lc: {times: ArrayLike<number>, sigma: number,
 *   exposure?: number, supersample?: number}, rv: {times: ArrayLike<number>,
 *   groups: ArrayLike<number>, sigma: number, jitter?: number,
 *   zeroPoints: number[]}, truth: {t0, P, k, aRs, b, q1, q2, K, sqrtEcosw,
 *   sqrtEsinw}}} o - velocity groups are numbered from 0; the table's group
 *   of instrument j is j + 1 and the light curve is group 0
 */
export function syntheticJoint(o) {
  const t = o.truth;
  const e = t.sqrtEcosw ** 2 + t.sqrtEsinw ** 2;
  const w = e > 0 ? Math.atan2(t.sqrtEsinw, t.sqrtEcosw) : Math.PI / 2;
  const { u1, u2 } = limbDarkening(t.q1, t.q2);
  const clean = transitFlux(
    o.lc.times,
    {
      t0: t.t0,
      P: t.P,
      k: t.k,
      aRs: circularEquivalent(t.aRs, e, w),
      b: t.b,
      u1,
      u2,
    },
    {
      exposure: o.lc.exposure ?? 0,
      supersample: o.lc.supersample ?? 11,
      annuli: 96,
    }
  );
  const curve = rvCurve(o.rv.times, { ...t, tc: t.t0 });
  const n = gaussian(o.seed);
  const spread = Math.sqrt(o.rv.sigma ** 2 + (o.rv.jitter ?? 0) ** 2);
  const nf = o.lc.times.length;
  const nr = o.rv.times.length;
  const x = new Float64Array(nf + nr);
  const y = new Float64Array(nf + nr);
  const sigma = new Float64Array(nf + nr);
  const groups = new Int32Array(nf + nr);
  for (let i = 0; i < nf; i++) {
    x[i] = o.lc.times[i];
    y[i] = clean[i] + o.lc.sigma * n();
    sigma[i] = o.lc.sigma;
  }
  for (let j = 0; j < nr; j++) {
    x[nf + j] = o.rv.times[j];
    y[nf + j] = curve[j] + o.rv.zeroPoints[o.rv.groups[j]] + spread * n();
    sigma[nf + j] = o.rv.sigma;
    groups[nf + j] = 1 + o.rv.groups[j];
  }
  return {
    x,
    y,
    sigma,
    groups,
    rows: Array.from(x, (_, i) => i),
    counts: {
      total: nf + nr,
      used: nf + nr,
      masked: 0,
      missing: 0,
      withoutUncertainty: 0,
    },
    columns: { x: 'time', y: 'value', sigma: 'error' },
    units: { x: 'd', y: '' },
    perDay: 1,
  };
}
