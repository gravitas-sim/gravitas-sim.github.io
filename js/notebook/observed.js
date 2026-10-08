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
//     observation: { id, title, source, digest, license, credit,
//                    retrieved?, citations? },   the last two, since the
//                    first release, are what the report cites the data by
//     tool: { id, version, params, at },
//     changes: [op, ...],       the workspace changes the measurement saw
//     assumptions: [...],       values the measurement took as given
//     warnings: [{code, ...}],  what the tool said of its result, as codes
//     steps: [[id, state]],     a guide's steps and where each stood
//   }
//
// Nothing here is a sentence. Before the evidence ledger the group also held
// `rows`, all of it in words in the language of the capture; no producer
// writes them now and an entry that has them is read from the fields above
// like any other (./ledger.js observedRows()), in its reader's language.
// The panel and the report print those rows where they would print conditions.
// Every quantity is MEASURED: a value derived from measured data is still
// from the data, and says in its note how it was derived. An ASSUMED value is
// not a measurement and is not a quantity: it is in `assumptions`.
//
// Pure: no DOM, no storage.
// =============================================================================

import { buildEntry, KIND, SOURCE, provenanceOf } from './entry.js';

export const OBSERVED_FORMAT = 'gravitas.observed';
export const OBSERVED_VERSION = 1;

/**
 * @param {{node: object, source: object, digest: string, changes: object[],
 *   title: string, labels: {quantity: (q: object) => string,
 *   note: (q: object) => string}, steps?: Array<[string, string]>,
 *   figure?: object|null, capturedAt?: number, context?: ?object}} a -
 *   `labels` are the reader's words for the quantities, made by the caller's
 *   translator; `figure` is from entry.js figure(), if there is one
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
  context = null,
  steps = null,
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
      // Its own id and origin, so a report names it in its reader's language
      // and tells a derived value from a measured one (./ledger.js).
      qid: q.id,
      og: q.kind === 'derived' ? 'derived' : 'measured',
      ub: q.errorKind === 'assumed' ? 'assumed' : 'data',
    })),
    // The simulation's conditions do not apply; the flag says why they are
    // empty, and `observed` says what does apply.
    provenance: provenanceOf({ flags: ['observed'] }),
    ...(context ? { context } : {}),
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
        // What the data are cited by and when they were fetched: kept as the
        // observation states them, not re-derived from the id.
        ...(source.retrieved ? { retrieved: source.retrieved } : {}),
        ...(source.citations?.length
          ? {
              citations: source.citations.map(c => ({
                text: c.text,
                ...(c.url ? { url: c.url } : {}),
              })),
            }
          : {}),
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
      ...(node.warnings?.length
        ? { warnings: JSON.parse(JSON.stringify(node.warnings)) }
        : {}),
      ...(steps ? { steps } : {}),
    },
  });
}
