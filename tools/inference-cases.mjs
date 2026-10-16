// =============================================================================
// The cases the inference core is validated and timed on
// -----------------------------------------------------------------------------
// Shared by tools/inference-validate.mjs, which fits each over many seeds and
// measures what it recovers, and tools/inference-bench.mjs, which times one
// seed of each in the browser's Workers. Chosen to find where recovery
// breaks, not to show where it works.
// =============================================================================

import {
  syntheticRv,
  syntheticTransit,
  tessLikeTimes,
} from '../js/inference/synthetic.js';

export const EXPOSURE = 20 / 1440;

export const HD = {
  t0: 2826.782,
  P: 3.5247486,
  k: 0.1209,
  aRs: 8.76,
  b: 0.503,
  q1: 0.36,
  q2: 0.3,
};
export const TIMES = tessLikeTimes();

const transitCase = (name, truth, sigma, bounds, what) => ({
  name,
  what,
  kind: 'transit',
  truth,
  data: seed =>
    syntheticTransit({
      seed: `${name}-${seed}`,
      times: TIMES,
      sigma,
      truth,
      exposure: EXPOSURE,
    }),
  request: {
    model: { id: 'transit-quadratic' },
    parameters: {
      t0: { lo: bounds.t0lo, hi: bounds.t0lo + bounds.P[1] },
      P: { lo: bounds.P[0], hi: bounds.P[1] },
    },
    settings: { exposure: EXPOSURE, supersample: 5, annuli: 32 },
  },
  check: ['t0', 'P', 'k', 'aRs', 'b'],
  profiled: ['k', 'b'],
});

const RV_TIMES = n =>
  Array.from(
    { length: n },
    (_, i) => 100 + (i * 30) / n + 0.3 * Math.sin(i * 7.1)
  );
const rvCase = (name, truth, n, what) => ({
  name,
  what,
  kind: 'rv',
  truth,
  data: seed =>
    syntheticRv({
      seed: `${name}-${seed}`,
      times: RV_TIMES(n),
      sigma: 3,
      jitter: 4,
      gamma: -12,
      truth,
    }),
  request: {
    model: { id: 'rv-keplerian' },
    parameters: { P: { lo: 3.5, hi: 5 }, tc: { lo: 99, hi: 99 + 5 } },
  },
  check: ['P', 'tc', 'K', 'sqrtEcosw', 'sqrtEsinw'],
  profiled: ['K'],
});

export const CASES = [
  transitCase(
    'hd209458',
    HD,
    213e-6,
    { t0lo: TIMES[0], P: [3.4, 3.65] },
    'HD 209458 b as TESS sees it: depth 1.6%, 213 ppm per 20-minute point, eight transits'
  ),
  transitCase(
    'shallow',
    { ...HD, k: 0.05 },
    213e-6,
    { t0lo: TIMES[0], P: [3.4, 3.65] },
    'a Neptune: Rp/R* 0.05, depth 0.3%'
  ),
  transitCase(
    'grazing',
    { ...HD, b: 0.95 },
    213e-6,
    { t0lo: TIMES[0], P: [3.4, 3.65] },
    'a grazing transit, b = 0.95: V-shaped'
  ),
  transitCase(
    'noisy',
    HD,
    2000e-6,
    { t0lo: TIMES[0], P: [3.4, 3.65] },
    'the same planet at 2000 ppm a point'
  ),
  transitCase(
    'long',
    { ...HD, t0: 2830.2, P: 17.3, aRs: 26 },
    213e-6,
    { t0lo: TIMES[0], P: [12, 24] },
    'P = 17.3 d: two transits in the window, one in the gap-free half'
  ),
  rvCase(
    'rv-circular',
    { P: 4.2308, tc: 100.3, K: 55.9, sqrtEcosw: 0, sqrtEsinw: 0 },
    40,
    'a circular hot Jupiter, 40 velocities over 30 days, 3 m/s errors, 4 m/s jitter'
  ),
  rvCase(
    'rv-eccentric',
    { P: 4.2308, tc: 100.3, K: 55.9, sqrtEcosw: 0.25, sqrtEsinw: -0.2 },
    40,
    'the same with e = 0.10'
  ),
  rvCase(
    'rv-sparse',
    { P: 4.2308, tc: 100.3, K: 55.9, sqrtEcosw: 0.25, sqrtEsinw: -0.2 },
    12,
    'e = 0.10 from 12 velocities'
  ),
];
