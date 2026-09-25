// =============================================================================
// Signals injected into noise, for testing the inference core against truth
// -----------------------------------------------------------------------------
// Seeded: the same seed gives the same noise, bit for bit, everywhere. The
// noise is Gaussian (Box-Muller over js/rng.js's mulberry32), white, and of the
// stated standard deviation; tools/inference-validate.mjs injects signals like
// these over hundreds of seeds and measures what the core recovers, and how
// often its stated uncertainty holds the truth.
// =============================================================================

import { mulberry32, normalizeSeed } from '../rng.js';
import { limbDarkening, transitFlux } from './transit.js';
import { rvCurve } from './rv.js';

/** A seeded standard normal. */
export function gaussian(seed) {
  const u = mulberry32(normalizeSeed(String(seed)));
  let spare = null;
  return () => {
    if (spare !== null) {
      const s = spare;
      spare = null;
      return s;
    }
    let a;
    let b;
    do a = u();
    while (a <= 1e-12);
    b = u();
    const r = Math.sqrt(-2 * Math.log(a));
    spare = r * Math.sin(2 * Math.PI * b);
    return r * Math.cos(2 * Math.PI * b);
  };
}

/**
 * A transit light curve at given times, with white noise.
 * @param {{seed: string, times: ArrayLike<number>, sigma: number,
 *   truth: {t0, P, k, aRs, b, q1, q2}, f0?: number, exposure?: number,
 *   supersample?: number, dilution?: number}} o
 */
export function syntheticTransit(o) {
  const { u1, u2 } = limbDarkening(o.truth.q1, o.truth.q2);
  const clean = transitFlux(
    o.times,
    { ...o.truth, u1, u2 },
    { exposure: o.exposure ?? 0, supersample: o.supersample ?? 11, annuli: 96 }
  );
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
