// =============================================================================
// A comparison as an evidence envelope
// -----------------------------------------------------------------------------
// gravitas.artifact/1 around one comparison: the data it read (a digest of the
// rows and the observation's id), the model's identity and every parameter it
// was given with the kind of number each is, the objective and the residual
// summary. A report cites it like a fit's. Nothing in it is prose; the reader's
// language is the report's.
// =============================================================================

import { artifact } from '../platform/artifact.js';
import { canonicalJson, fnvHex8 } from '../hash.js';
import { rowsDigest } from '../analysis/seams.js';
import { unitIdOf } from '../units/registry.js';

const ORIGIN = {
  fitted: 'fitted',
  fixed: 'fixed',
  derived: 'derived',
  assumed: 'assumed',
};

/**
 * @param {object} comparison - compareModel()'s result
 * @param {{observation: object, units?: {y?: string}}} o - The observation the
 *   comparison read, for its id and source
 * @returns {object} The envelope
 */
export function comparisonArtifact(comparison, o) {
  const c = comparison;
  const unitFor = text => {
    const id = unitIdOf(text);
    return id === undefined ? null : id;
  };
  const quantities = [];
  for (const p of c.parameters) {
    if (!Number.isFinite(p.value)) continue;
    quantities.push({
      id: p.id,
      value: p.value,
      unit: unitFor(p.unit),
      uncertainty:
        Number.isFinite(p.sigma) && p.sigma >= 0
          ? { kind: 'sigma', sigma: p.sigma, basis: 'data' }
          : { kind: 'none' },
      origin: ORIGIN[p.status] ?? 'assumed',
    });
  }
  const stat = (id, value, unit) => {
    if (Number.isFinite(value))
      quantities.push({
        id,
        value,
        unit,
        uncertainty: { kind: 'none' },
        origin: 'derived',
      });
  };
  stat(
    `objective:${c.objective.name}`,
    c.objective.value,
    c.data.weighted ? '' : null
  );
  stat('m2lnL', c.objective.m2lnL, '');
  stat('reducedChi2', c.reducedChi2, '');
  stat('n', c.n, '');
  stat('dof', c.dof, '');
  stat('residual-mean', c.mean, unitFor(c.data.units.y));
  stat('residual-rms', c.rms, unitFor(c.data.units.y));
  const values = canonicalJson(quantities.map(q => [q.id, q.value]));
  return artifact({
    id: `comparison:${c.source.kind}:${c.source.id}:${fnvHex8(values)}`,
    made: {
      observation: {
        id: o.observation.id,
        ...(o.observation.source
          ? {
              source: {
                kind: o.observation.source.kind,
                id: o.observation.source.id ?? null,
                digest: o.observation.source.digest ?? null,
              },
            }
          : {}),
      },
      comparison: {
        version: c.version,
        model: c.source,
        objective: c.objective.name,
        residualPattern: c.pattern.structured ? 'structured' : 'consistent',
        regions: c.pattern.bins.map(b => [b.from, b.to, b.sense]),
      },
    },
    source: {
      kind: 'comparison',
      id: o.observation.id,
      version: c.version,
      digest: rowsDigest({ x: c.x, y: c.y, sigma: c.sigma }),
    },
    quantities,
    warnings: [
      ...(c.skipped ? [`rows:${c.skipped}-without-a-model-value`] : []),
      ...(c.data.weighted ? [] : ['no-uncertainties']),
    ],
  });
}
