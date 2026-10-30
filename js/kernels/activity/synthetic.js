// =============================================================================
// Synthetic activity light curves with a truth manifest (Prompt 220)
// -----------------------------------------------------------------------------
// A spotted rotating star (js/kernels/activity/spots.js), flares drawn from a power law in
// equivalent duration with the Davenport et al. (2014) shape, and white Gaussian noise. The
// draws come from the named streams of Prompt 149: the flares from 'injection', the noise
// from 'noise', each forked by the seed, so one component's draws never depend on the
// order another drew in. The truth (the spot list, the period, every flare's time, width,
// amplitude and equivalent duration) is returned beside the light curve, because a
// synthetic curve without its truth is not a test of anything.
// Pure: no DOM, no clock.
// =============================================================================

import { gaussian, stream } from '../../random/streams.js';
import { flareProfile, TEMPLATE_INTEGRAL } from './flares.js';
import { spottedFlux } from './spots.js';

const { Math, Float64Array } = globalThis;

export const VERSION = '1.0.0';

/**
 * @param {{seed: string, days?: number, cadenceMin?: number, t0?: number, period: number,
 *   inc?: number, u?: number[], shear?: number, spots?: object[], noise?: number,
 *   flares?: {count?: number, rate?: number, alpha?: number, edMin?: number, edMax?: number,
 *   tHalfMin?: number[]}|null}} spec
 * @returns {{t: Float64Array, flux: Float64Array, err: Float64Array, cadence: number,
 *   truth: {spec: object, spotted: Float64Array, flares: object[]}}}
 */
export function syntheticActivity(spec) {
  const days = spec.days ?? 27;
  const cadence = (spec.cadenceMin ?? 2) / 1440;
  const t0 = spec.t0 ?? 0;
  const n = Math.floor(days / cadence);
  const t = Float64Array.from({ length: n }, (_, i) => t0 + i * cadence);
  const sigma = spec.noise ?? 1e-3;
  const spots = spec.spots ?? [];
  const spotted = spots.length
    ? spottedFlux(t, {
        period: spec.period,
        inc: spec.inc ?? 70,
        u: spec.u ?? [0.4, 0.22],
        shear: spec.shear ?? 0,
        t0,
        spots,
      })
    : new Float64Array(n).fill(1);
  const excess = new Float64Array(n);
  const flares = [];
  const fl = spec.flares;
  if (fl) {
    const rand = stream('injection', spec.seed, 'flares');
    const count = fl.count ?? Math.round((fl.rate ?? 2) * days);
    const alpha = fl.alpha ?? 1.8;
    const edMin = fl.edMin ?? 20;
    const edMax = fl.edMax ?? 5000;
    const [h0, h1] = fl.tHalfMin ?? [4, 40];
    for (let k = 0; k < count; k++) {
      const tPeak = t0 + 0.02 * days + rand() * 0.96 * days;
      let ed = edMin * (1 - rand()) ** (-1 / (alpha - 1));
      if (ed > edMax) ed = edMax;
      const tHalfMin = h0 * (h1 / h0) ** rand();
      const tHalf = tHalfMin / 1440;
      const amp = ed / (TEMPLATE_INTEGRAL * tHalf * 86400);
      const prof = flareProfile(t, { tPeak, tHalf, amp }, cadence);
      for (let i = 0; i < n; i++) excess[i] += prof[i];
      flares.push({ tPeak, tHalfMin, amp, ed });
    }
  }
  const noise = gaussian(stream('noise', spec.seed, 'white'));
  const flux = new Float64Array(n);
  for (let i = 0; i < n; i++)
    flux[i] = spotted[i] * (1 + excess[i]) + sigma * noise();
  return {
    t,
    flux,
    err: new Float64Array(n).fill(sigma),
    cadence,
    truth: { spec, spotted, flares: flares.sort((a, b) => a.tPeak - b.tPeak) },
  };
}
