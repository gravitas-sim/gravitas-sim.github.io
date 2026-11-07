// =============================================================================
// The joined table, and the crossmatch as a Prompt 150 record
// (gravitas.artifact/2): the match distance and the epoch difference per row
// =============================================================================

import { artifact } from '../../platform/artifact.js';
import { LIMITS, MODEL_ID, VERSION } from './constants.js';
import { ASSUMES } from './match.js';

/**
 * The matched rows as columns: the two indices, the match distance and the
 * epoch difference, the distance's uncertainty if the catalogs gave positional
 * errors, and any pass-through columns of either catalog.
 * @param {object} result - crossmatch()'s result
 * @param {{columns?: Array<{id: string, unit: string|null, values: ArrayLike<number>}>}} a
 * @param {{columns?: Array<{id: string, unit: string|null, values: ArrayLike<number>}>}} b
 * @param {{passA?: string[], passB?: string[]}} [o]
 */
export function joinedTable(result, a, b, { passA = [], passB = [] } = {}) {
  const P = result.pairs;
  const col = (id, unit, values) => ({
    id,
    unit,
    values: Float64Array.from(values),
  });
  const columns = [
    col(
      'aIndex',
      '',
      P.map(p => p.a)
    ),
    col(
      'bIndex',
      '',
      P.map(p => p.b)
    ),
    col(
      'distance',
      'arcsec',
      P.map(p => p.distanceArcsec)
    ),
    col(
      'epochDifference',
      'yr',
      P.map(p => p.epochDifferenceYr)
    ),
  ];
  if (P.length && P.every(p => p.sigmaArcsec !== null))
    columns.push(
      col(
        'distanceSigma',
        'arcsec',
        P.map(p => p.sigmaArcsec)
      )
    );
  const pass = (cat, ids, side, pick) => {
    for (const id of ids) {
      const c = cat.columns?.find(k => k.id === id);
      if (!c) throw new Error(`catalog ${side} has no column ${id}`);
      columns.push(
        col(
          `${side}.${id}`,
          c.unit ?? null,
          P.map(p => c.values[pick(p)])
        )
      );
    }
  };
  pass(a, passA, 'a', p => p.a);
  pass(b, passB, 'b', p => p.b);
  return { n: P.length, columns };
}

const q = (id, value, unit, origin, uncertainty) => ({
  id,
  value,
  unit,
  origin,
  uncertainty,
});

/**
 * The crossmatch as a gravitas.artifact envelope.
 * @param {object} result - crossmatch()'s result
 * @param {{source: {kind: string, id: string, digest?: string}, id?: string,
 *   citations?: object[]}} o
 */
export function crossmatchRecord(result, o) {
  if (result.status !== 'ok')
    throw new Error(
      'there is no match to record: ' + (result.why ?? result.status)
    );
  const f = result.falseMatch;
  const quantities = [
    q('radius', result.radiusArcsec, 'arcsec', 'assumed', { kind: 'assumed' }),
    q('matches', result.pairs.length, 'count', 'derived', { kind: 'none' }),
    q('unmatchedA', result.unmatchedA, 'count', 'derived', { kind: 'none' }),
    q('unmatchedB', result.unmatchedB, 'count', 'derived', { kind: 'none' }),
    q('ambiguous', result.ambiguous, 'count', 'derived', { kind: 'none' }),
  ];
  if (f && f.p !== undefined) {
    quantities.push(
      q('chanceProbability', f.p, '', 'derived', {
        kind: 'interval',
        lo: f.pLo,
        hi: f.pHi,
        level: f.level,
        basis: 'data',
      })
    );
    if (f.fraction !== null)
      quantities.push(
        q('falseMatchFraction', f.fraction, '', 'derived', {
          kind: 'interval',
          lo: f.fractionLo,
          hi: f.fractionHi,
          level: f.level,
          basis: 'data',
        })
      );
  }
  result.pairs.forEach((p, k) => {
    quantities.push(
      q(
        `pair${k}.distance`,
        p.distanceArcsec,
        'arcsec',
        'derived',
        p.sigmaArcsec === null
          ? { kind: 'none' }
          : { kind: 'sigma', sigma: p.sigmaArcsec, basis: 'derived' }
      ),
      q(`pair${k}.epochDifference`, p.epochDifferenceYr, 'yr', 'derived', {
        kind: 'assumed',
      })
    );
  });
  return artifact({
    id: o.id ?? `${MODEL_ID}:${o.source.id}`,
    made: {
      model: MODEL_ID,
      modelVersion: VERSION,
      commonEpochJulianYear: result.toEpoch,
      mode: result.mode,
    },
    source: o.source,
    provenance: {
      reductions: [...ASSUMES],
      ...(o.citations ? { citations: o.citations } : {}),
    },
    quantities,
    warnings: [
      ...(f?.warnings ?? []),
      ...(result.excluded.a || result.excluded.b
        ? [
            `${result.excluded.a} rows of A and ${result.excluded.b} rows of B have no proper motion and were not matched`,
          ]
        : []),
      ...(result.pairs.length > LIMITS.rowLimit
        ? ['more pairs than the table limit']
        : []),
    ],
  });
}
