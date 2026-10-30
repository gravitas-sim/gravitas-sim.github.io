// =============================================================================
// The fit as a Prompt 150 record (gravitas.artifact/2)
// -----------------------------------------------------------------------------
// Every quantity says what kind of number it is: fitted (log age, distance
// modulus, each with its profile interval or "not constrained"), derived (the
// age in Gyr, the distance in pc, the member count), fixed or assumed (the
// metallicity, the reddening, the extinction ratio, the contamination). The
// assumptions the result is conditional on are in provenance.reductions, and
// the statistic and what it conditions on are in `fit`.
// =============================================================================

import { artifact } from '../../platform/artifact.js';
import { MODEL_ID, VERSION } from './constants.js';

export const ASSUMPTIONS = Object.freeze([
  'Fixed [Fe/H], taken as stated; the result is conditional on it (a different metallicity shifts the age and the distance by more than the intervals).',
  'Fixed reddening E(g - r) with the extinction ratio A_g / E(g - r) = 3.245 (Schlafly and Finkbeiner 2011).',
  'MIST v1.2 isochrones, non-rotating, scaled-solar, in the SDSS bands: a model, not a measurement; between grid ages and metallicities the curve is a morph of its neighbours.',
  'Single stars: no binaries in the model. A binary fraction biases the distance and the age and the intervals do not widen (CLUSTER_FITTING.md reports by how much).',
  "The members are the reader's own cut; a stated share of the stars in it are not cluster members and add a floor to every colour.",
  "The sample's selection in magnitude is unknown and is conditioned on (the statistic compares colours at each magnitude, not counts).",
  'Photometric errors follow a stated model of typical SDSS values, independent in g and r.',
  'Intervals are profile intervals of the deviance at 68.27 percent (Delta D = 1): coverage statements about repeated data, not posterior probabilities.',
]);

const quantity = (id, value, unit, origin, uncertainty) => ({
  id,
  value,
  unit,
  origin,
  uncertainty,
});

const intervalOf = (iv, map = x => x) =>
  iv && iv.status === 'ok' && !iv.withheld
    ? {
        kind: 'interval',
        lo: map(iv.lo),
        hi: map(iv.hi),
        level: iv.level,
        basis: 'profile',
      }
    : { kind: 'not-constrained' };

/**
 * @param {object} r - fitCluster's result (status ok or open)
 * @param {{source: {kind: string, id: string, digest?: string}, id?: string,
 *   citations?: object[]}} o
 */
export function clusterRecord(r, o) {
  if (!r.best)
    throw new Error(
      'there is no fit to record: ' + (r.why ?? r.reason ?? r.status)
    );
  const s = r.settings;
  const { logAge, dm } = r.intervals;
  const age = x => 10 ** (x - 9);
  const dist = x => 10 ** (x / 5 + 1);
  const q = [
    quantity('logAge', r.best.logAge, 'dex', 'fitted', intervalOf(logAge)),
    quantity(
      'age',
      age(r.best.logAge),
      'Gyr',
      'derived',
      intervalOf(logAge, age)
    ),
    quantity('dm', r.best.dm, 'mag', 'fitted', intervalOf(dm)),
    quantity(
      'distance',
      dist(r.best.dm),
      'pc',
      'derived',
      intervalOf(dm, dist)
    ),
    quantity('feh', s.feh, 'dex', 'fixed', { kind: 'assumed' }),
    quantity('E', s.E, 'mag', 'fixed', { kind: 'assumed' }),
    quantity('R', s.R, '', 'assumed', { kind: 'assumed' }),
    quantity('contamination', s.eps, '', 'assumed', { kind: 'assumed' }),
    quantity('members', r.members, '', 'derived', { kind: 'none' }),
  ];
  const notConstrained = ['logAge', 'dm'].filter(
    k => r.intervals[k].status !== 'ok'
  );
  return artifact({
    id: o.id ?? `${MODEL_ID}:${o.source.id}`,
    made: { model: MODEL_ID, modelVersion: VERSION },
    source: o.source,
    provenance: {
      reductions: [...ASSUMPTIONS],
      ...(o.citations ? { citations: o.citations } : {}),
    },
    quantities: q,
    fit: {
      model: { id: MODEL_ID, version: VERSION },
      parameters: ['logAge', 'dm'],
      covariance: null,
      statistic: {
        name: 'magnitude-conditional binned multinomial deviance',
        value: r.deviance,
        dof: Math.max(0, r.stars - 2),
      },
      convergence: { converged: r.status !== 'not-constrained' },
      rank: {
        free: 2,
        rank: 2 - notConstrained.length,
        status: notConstrained.length ? 'deficient' : 'full',
        notConstrained,
      },
    },
    warnings: [
      ...(r.warnings ?? []),
      ...(r.correlation !== null && r.correlation !== undefined
        ? [
            `correlation of log age and distance modulus in the 2.30 region: ${r.correlation.toFixed(2)}`,
          ]
        : []),
    ],
  });
}
