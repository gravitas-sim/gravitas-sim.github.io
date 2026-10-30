// ===========================================================================
// 36. Cluster fitting: isochrones fitted to a cluster's colour-magnitude diagram
// ===========================================================================

import * as K from '../../kernels/clusters/index.js';
import { tableOf } from '../../tableObservation.js';

/**
 * Run this group's checks (CLUSTER_FITTING.md; the full table, with the independent
 * oracle and the ensemble coverage, is `npm run cluster:validate`).
 *
 * @param {object} ctx - `add` (physicsChecks.js)
 */
export default async function run({ add }) {
  const mist = await import('../../data/observations/mistSdssIsochrones.js');
  const set = K.parseIsochrones(tableOf(mist));

  add({
    group: 'Cluster fitting',
    kind: 'analytic',
    name: 'The initial mass function’s weights of adjacent mass intervals add to the weight of their union, across the break at 0.5 solar masses',
    measured:
      (K.imfWeight(0.2, 0.7) + K.imfWeight(0.7, 3)) / K.imfWeight(0.2, 3),
    expected: 1,
    unit: '',
    tolerance: 1e-12,
    why: 'The weight is the integral of dN/dm, so it is additive; the two power laws meet continuously at the break.',
  });

  const line = {
    c: Float64Array.from({ length: 600 }, () => 0.5),
    g: Float64Array.from({ length: 600 }, (_, i) => 16.0025 + i * 0.005),
    w: new Float64Array(600).fill(1),
  };
  const h = K.hessOf(line, { dm: 0, E: 0, R: 3.245, constantSigma: 0.05 });
  const j = 30; // the row g = 17.5 to 17.6: inside the line, which covers g 16 to 19
  let s = 0;
  for (let k = 0; k < K.COLS; k++) s += h[j * K.COLS + k];
  // colour 0.50 with errors sqrt(2) 0.05 = 0.0707 in 0.04 columns: column 20 holds 0.50 to 0.54
  const mid = h[j * K.COLS + 20] / s;
  const sd = Math.hypot(0.05, 0.05);
  const erf = x => {
    // Abramowitz and Stegun 7.1.26, 1.5e-7
    const t = 1 / (1 + 0.3275911 * Math.abs(x));
    const y =
      1 -
      ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) *
        t +
        0.254829592) *
        t *
        Math.exp(-x * x);
    return x >= 0 ? y : -y;
  };
  add({
    group: 'Cluster fitting',
    kind: 'analytic',
    name: 'A vertical isochrone seen through equal errors in g and r gives a normal distribution of colour of width sqrt 2 times the error in each row',
    measured: mid,
    expected: (erf(0.04 / (sd * Math.SQRT2)) - erf(0 / (sd * Math.SQRT2))) / 2,
    unit: '',
    tolerance: 0.01,
    why: 'The colour error is the difference of two independent normal errors; the model spreads each piece exactly over the colour columns.',
  });

  const spec = {
    logAge: 9.3,
    dm: 12.06,
    feh: -0.25,
    E: 0.042,
    N: 200,
    epsTrue: 0.15,
  };
  const d = K.drawCluster(set, spec, 'validation-suite');
  const r = K.fitCluster(set, d.g, d.colour, { feh: -0.25 });
  add({
    group: 'Cluster fitting',
    kind: 'data',
    name: 'A synthetic cluster of log age 9.30 at distance modulus 12.06 (200 stars, 15 percent field, a magnitude selection the fit does not know) is recovered in age',
    measured: r.best.logAge,
    expected: 9.3,
    unit: 'dex',
    tolerance: 0.04,
    source: 'A synthetic cluster with its truth (CLUSTER_FITTING.md)',
    why: 'Recovery of a self-generated truth does not validate the model for real data; it shows the likelihood is built the way the stars were made. The ensemble coverage and the independent oracle are in the validation script.',
  });
  add({
    group: 'Cluster fitting',
    kind: 'data',
    name: 'The same synthetic cluster is recovered in distance modulus',
    measured: r.best.dm,
    expected: 12.06,
    unit: 'mag',
    tolerance: 0.08,
    source: 'A synthetic cluster with its truth (CLUSTER_FITTING.md)',
    why: 'The distance modulus is fixed by where the main sequence and its turnoff sit once the age is set; the age and the distance trade against each other, which the fit reports as a negative correlation.',
  });
}
