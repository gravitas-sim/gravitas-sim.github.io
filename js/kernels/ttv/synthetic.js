// =============================================================================
// Synthetic transit windows (Prompt 226, TTV.md)
// -----------------------------------------------------------------------------
// One window of light curve about a known transit time, white noise from 149's
// 'noise' stream, with its truth manifest. Every number of the template is an input.
// A synthetic window says so: `synthetic: true`, and the truth it was made from.
//
// Pure: no DOM, no clock.
// =============================================================================

import { transitFlux, limbDarkening } from '../../inference/transit.js';
import { gaussian, stream } from '../../random/streams.js';

const { Float64Array } = globalThis;

/**
 * @param {{trueTime: number, template: {P: number, k: number, aRs: number, b: number,
 *   q1: number, q2: number}, sigma: number, cadence: number, halfWidth: number,
 *   center?: number, seed: string, labels?: Array<string|number>}} o
 *   `center`: the middle of the window (default the true time)
 * @returns {{t: Float64Array, flux: Float64Array, sigma: number, synthetic: true,
 *   truth: object, stream: object}}
 */
export function transitWindow(o) {
  const c = o.center ?? o.trueTime;
  const n = Math.floor((2 * o.halfWidth) / o.cadence) + 1;
  const t = new Float64Array(n);
  for (let i = 0; i < n; i++) t[i] = c - o.halfWidth + i * o.cadence;
  const { u1, u2 } = limbDarkening(o.template.q1, o.template.q2);
  const clean = transitFlux(t, {
    t0: o.trueTime,
    P: o.template.P,
    k: o.template.k,
    aRs: o.template.aRs,
    b: o.template.b,
    u1,
    u2,
  });
  const draw = stream('noise', o.seed, ...(o.labels ?? []));
  const normal = gaussian(draw);
  const flux = new Float64Array(n);
  for (let i = 0; i < n; i++) flux[i] = clean[i] + o.sigma * normal();
  return {
    t,
    flux,
    sigma: o.sigma,
    synthetic: true,
    truth: {
      trueTime: o.trueTime,
      template: { ...o.template },
      sigma: o.sigma,
    },
    stream: draw.stream,
  };
}
