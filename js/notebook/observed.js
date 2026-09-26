// =============================================================================
// A measurement on real data, as a notebook entry
// -----------------------------------------------------------------------------
// The notebook was built for a simulation, and its provenance says so: a
// scenario, a seed, a world, an integrator. None of that describes a number
// measured on a TESS light curve. So an Observatory entry keeps the notebook's
// shape - quantities, each measured, analytic or revealed, a frozen snapshot,
// a fingerprint - and carries a separate group instead of a simulation's
// conditions:
//
//   snapshot.observed = {
//     format: 'gravitas.observed', formatVersion: 1,
//     observation: { id, title, source, digest, license, credit },
//     tool: { id, version, params, at },
//     changes: [op, ...],       the workspace changes the measurement saw
//     assumptions: [...],       values the measurement took as given
//     rows: [[label, value]],   all of it in words, in the reader's language
//   }                           at capture, as the quantities' labels are
//
// The panel and the report print `rows` where they would print conditions.
// Every quantity is MEASURED: a value derived from measured data is still
// from the data, and says in its note how it was derived. An ASSUMED value is
// not a measurement and is not a quantity: it is in `assumptions` and `rows`.
//
// Pure: no DOM, no storage.
// =============================================================================

import { buildEntry, KIND, SOURCE, provenanceOf } from './entry.js';

export const OBSERVED_FORMAT = 'gravitas.observed';
export const OBSERVED_VERSION = 1;

/**
 * @param {{node: object, source: object, digest: string, changes: object[],
 *   title: string, labels: {quantity: (q: object) => string,
 *   note: (q: object) => string, rows: Array<[string, string]>},
 *   figure?: object|null, capturedAt?: number}} a - `labels` are the
 *   reader's words for the quantities and the observed rows, made by the
 *   caller's translator; `figure` is from entry.js figure(), if there is one
 * @returns {object} A notebook entry (js/notebook/entry.js)
 */
export function observedEntry({
  node,
  source,
  digest,
  changes,
  title,
  labels,
  figure = null,
  capturedAt,
}) {
  const measured = node.quantities.filter(
    q => q.kind !== 'assumed' && Number.isFinite(q.value)
  );
  const assumed = node.quantities.filter(q => q.kind === 'assumed');
  return buildEntry({
    source: SOURCE.OBSERVATORY,
    title,
    capturedAt,
    figure,
    quantities: measured.map(q => ({
      label: labels.quantity(q),
      value: q.value,
      unit: q.unit ?? '',
      kind: KIND.MEASURED,
      uncertainty: Number.isFinite(q.error) ? q.error : null,
      note: labels.note(q),
    })),
    // The simulation's conditions do not apply; the flag says why they are
    // empty, and `observed` says what does apply.
    provenance: provenanceOf({ flags: ['observed'] }),
    observed: {
      format: OBSERVED_FORMAT,
      formatVersion: OBSERVED_VERSION,
      observation: {
        id: source.id,
        title: source.title,
        source: source.source,
        digest,
        license: source.license?.status ?? null,
        credit: source.credit ?? null,
      },
      tool: {
        id: node.tool,
        version: node.version,
        params: node.params,
        at: node.at,
      },
      changes: changes.slice(0, node.at).map(c => c.op),
      assumptions: assumed.map(q => ({
        id: q.id,
        value: q.value,
        unit: q.unit ?? '',
        cite: q.cite ?? null,
      })),
      rows: labels.rows,
    },
  });
}
