// =============================================================================
// The views of the cluster-fit panel (Prompt 219, CLUSTER_FITTING.md)
// -----------------------------------------------------------------------------
// Pure functions of the panel's control values, shared by js/clusterFitWidgets.js
// and tests/clusterLessons.test.js (which recomputes every number the lesson
// states from them). Nothing is calculated here that js/kernels/clusters/ does
// not: the two clusters are DRAWN from MIST isochrones with a known age and
// distance (the truth is in CLUSTERS and says so), and the fit is the kernel's.
//
// Pure: no DOM, no clock. A fit is cached per (cluster, metallicity, binaries).
// =============================================================================

import * as K from './kernels/clusters/index.js';
import * as MIST from './data/observations/mistSdssIsochrones.js';
import { tableOf } from './tableObservation.js';

const { Math, Map } = globalThis;

/** The seed every lesson cluster is drawn from. */
export const SEED = 'cluster-lesson-219';

/**
 * The two synthetic clusters: the same distance, the same metallicity and the
 * same reddening, drawn 0.20 dex of age apart (2.0 and 3.2 Gyr).
 */
export const CLUSTERS = Object.freeze([
  Object.freeze({
    id: 'A',
    logAge: 9.3,
    dm: 12.1,
    feh: -0.25,
    E: 0.042,
    N: 260,
    epsTrue: 0.15,
  }),
  Object.freeze({
    id: 'B',
    logAge: 9.5,
    dm: 12.1,
    feh: -0.25,
    E: 0.042,
    N: 260,
    epsTrue: 0.15,
  }),
]);

/** The metallicities the panel offers (the grid's), and the binary fraction it can add. */
export const METALLICITIES = Object.freeze([-0.5, -0.25, 0]);
export const BINARY_FRACTION = 0.3;

let setCache = null;
export const isochrones = () => (setCache ??= K.parseIsochrones(tableOf(MIST)));

const cache = new Map();

/**
 * @param {{cluster?: number, feh?: number, binaries?: number, truth?: number}} v
 */
export function clusterView(v = {}) {
  const ci = Math.max(
    0,
    Math.min(CLUSTERS.length - 1, Math.round(v.cluster ?? 0))
  );
  const feh = METALLICITIES.reduce(
    (best, f) =>
      Math.abs(f - (v.feh ?? -0.25)) < Math.abs(best - (v.feh ?? -0.25))
        ? f
        : best,
    METALLICITIES[1]
  );
  const fb = Math.round(v.binaries ?? 0) >= 1 ? BINARY_FRACTION : 0;
  const key = `${ci}|${feh}|${fb}`;
  if (!cache.has(key)) {
    const set = isochrones();
    const spec = CLUSTERS[ci];
    const d = K.drawCluster(set, { ...spec, fb }, SEED, spec.id, 0);
    const fit = K.fitCluster(set, d.g, d.colour, { feh });
    let line = [];
    if (fit.best) {
      const iso = K.isochroneAt(set, feh, fit.best.logAge);
      const shift = fit.best.dm + K.EXTINCTION_RATIO * K.DEFAULT_REDDENING;
      for (const p of iso.phases) {
        for (let i = 0; i < p.g.length; i++)
          line.push([p.g[i] - p.r[i] + K.DEFAULT_REDDENING, p.g[i] + shift]);
        line.push([NaN, NaN]);
      }
    }
    cache.set(key, { spec, feh, fb, stars: d, fit, line });
  }
  return { ...cache.get(key), truth: Math.round(v.truth ?? 0) >= 1 };
}

/** The age in Gyr of a log10 age in years. */
export const gyr = logAge => 10 ** (logAge - 9);
