// =============================================================================
// A pipeline node as a gravitas.artifact/1 envelope
// -----------------------------------------------------------------------------
// Beside js/measure/pipeline.js, not in it: the Observatory loads the pipeline
// with its measure panel, the registry at start-up, and a module both reached
// would become a chunk and a request of its own for every visitor (the same
// reason js/observatory/fitPanel.js is handed its page's modules). Nothing on a
// page calls this yet; a caller there passes through the page's context.
// =============================================================================

import { artifact } from '../platform/artifact.js';
import { unitIdOf } from '../units/registry.js';
import { KIND } from './pipeline.js';

/**
 * A unit as the registry names it, and the factor a value takes into it: a
 * column in `1e-3 d` holds thousandths of a day. Null is not stated.
 */
function registryUnit(unit) {
  if (unit === null || unit === undefined) return { id: null, scale: 1 };
  if (unit === '') return { id: '', scale: 1 };
  // As js/observatory/units.js unitId() writes a scaled unit: a number, a
  // space, the id ("0.001 d", "1e-17 erg/s/cm2/Angstrom"), or as data do,
  // "10^-3 d". A spelling with a space in it ("solar masses") is not a number
  // first, and stays whole.
  const m = /^(\S+)\s+(.+)$/.exec(unit);
  const scale = m ? Number(m[1].replace(/^10\^/, '1e')) : NaN;
  if (m && Number.isFinite(scale) && scale > 0)
    return { id: unitIdOf(m[2]) ?? m[2], scale };
  return { id: unitIdOf(unit) ?? unit, scale: 1 };
}

/**
 * A node's result as a gravitas.artifact/1 envelope (js/platform/artifact.js,
 * PROVENANCE.md): the tool and its version as the source, the content digest
 * of the data it read, each numeric quantity in its registry unit with its
 * uncertainty and origin, and what a quantity only cites as provenance.
 *
 * KIND's three values are envelope origins already. An error the tool derived
 * from the data has the basis `data`; one it had to assume, where the data
 * carry no uncertainty, `assumed`.
 *
 * @param {object} node - From runNode
 * @returns {object} The envelope
 */
export function nodeArtifact(node) {
  const citations = [];
  const quantities = [];
  for (const x of node.quantities || []) {
    if (x.cite) citations.push(x.cite);
    if (!Number.isFinite(x.value)) continue;
    const { id: unit, scale } = registryUnit(x.unit);
    quantities.push({
      id: x.id,
      value: x.value * scale,
      unit,
      uncertainty: Number.isFinite(x.error)
        ? {
            kind: 'sigma',
            sigma: x.error * scale,
            basis: x.errorKind === KIND.ASSUMED ? 'assumed' : 'data',
          }
        : { kind: 'none' },
      origin: x.kind,
    });
  }
  return artifact({
    id: node.id,
    source: {
      kind: 'pipeline',
      id: node.tool,
      version: String(node.version),
      digest: node.input?.digest,
    },
    ...(citations.length ? { provenance: { citations } } : {}),
    quantities,
    warnings: (node.warnings || []).map(w =>
      typeof w === 'string' ? w : (w?.message ?? String(w?.code ?? w))
    ),
  });
}
