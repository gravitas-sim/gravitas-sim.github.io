// =============================================================================
// A fit, an analysis or an experiment result, kept as its envelope
// -----------------------------------------------------------------------------
// The notebook was built for readings taken off a simulation and, since the
// Observatory, for measurements on real data (./observed.js). A fit, a sweep
// analysis and an experiment result are results of their own: each is made of
// something (trials, rows of data), and a report that cites one has to say of
// what. So their entries keep the notebook's shape - quantities, a frozen
// snapshot, a fingerprint - and carry, beside it,
//
//   snapshot.artifact = a gravitas.artifact/1 envelope (js/platform/artifact.js)
//
// whose `source.digest` is the digest of the data the result was made from
// (js/analysis/seams.js: trialsDigest, rowsDigest). The panel and the report
// print citationRows(): who made it, from what, with which engine, and a line
// to cite it by. The envelope is data; the words are made when it is read, in
// the reader's language.
//
// An entry holds at most LIMITS.quantities numbers (./entry.js). The envelope
// is trimmed to the same headline numbers - means before their spreads and
// counts - and says how many it left out; the digest still identifies the
// whole of what it was made from.
//
// Pure: no DOM, no storage. A lazy module, with the panels that capture.
// =============================================================================

import { validateArtifact } from '../platform/artifact.js';
import { buildEntry, KIND, LIMITS, provenanceOf } from './entry.js';

/** The marker a trimmed envelope carries in its warnings, then the count. */
export const TRUNCATED = 'truncated:';

/** Ids that are a result's spread or count rather than its headline. */
const SECONDARY = /\.(sd|n)\|/;

/**
 * The envelope cut to what an entry can hold.
 * @param {object} env - A gravitas.artifact/1
 * @param {number} [max] - Quantities to keep
 * @returns {object} The same envelope, or a copy with fewer quantities and a
 *   `truncated:N` warning
 */
export function headline(env, max = LIMITS.quantities) {
  if (env.quantities.length <= max) return env;
  const first = env.quantities.filter(q => !SECONDARY.test(q.id));
  const rest = env.quantities.filter(q => SECONDARY.test(q.id));
  const kept = [...first, ...rest].slice(0, max);
  const left = env.quantities.length - kept.length;
  return {
    ...env,
    quantities: kept,
    warnings: [...(env.warnings ?? []), `${TRUNCATED}${left}`],
  };
}

/** The half-width of an uncertainty, in the quantity's unit; null if none. */
const plusMinus = u =>
  u?.kind === 'sigma'
    ? u.sigma
    : u?.kind === 'interval'
      ? (u.hi - u.lo) / 2
      : null;

/**
 * An entry for a result, from its envelope.
 * @param {{source: string, envelope: object, title: string,
 *   labels?: {quantity?: (q: object) => string, note?: (q: object) => string},
 *   figure?: ?object, capturedAt?: number}} a - `source` is one of
 *   SOURCE.INFERENCE_FIT, SWEEP_ANALYSIS, EXPERIMENT_RESULT; `labels` are the
 *   reader's words for the quantities, made by the caller's translator at
 *   capture, as for an observed entry
 * @returns {object} A notebook entry (./entry.js)
 * @throws {Error} When the envelope is not one, or has no source digest
 */
export function artifactEntry({
  source,
  envelope,
  title,
  labels = {},
  figure = null,
  capturedAt,
}) {
  const problems = validateArtifact(envelope);
  if (problems.length)
    throw new Error(
      `not an envelope: ${problems[0].path} ${problems[0].message}`
    );
  if (!envelope.source.digest)
    throw new Error(
      'an envelope kept as evidence names the digest of its data'
    );
  const env = headline(envelope);
  return buildEntry({
    source,
    title,
    capturedAt,
    figure,
    quantities: env.quantities.map(q => ({
      label: labels.quantity ? labels.quantity(q) : q.id,
      value: q.value,
      unit: q.unit ?? '',
      kind:
        q.origin === 'truth'
          ? KIND.TRUTH
          : q.origin === 'analytic'
            ? KIND.ANALYTIC
            : KIND.MEASURED,
      uncertainty: plusMinus(q.uncertainty),
      note: labels.note ? labels.note(q) : q.origin,
    })),
    provenance: provenanceOf(),
    artifact: env,
  });
}

/**
 * What a reader needs to cite the result: label and value pairs, in the
 * reader's language, for the panel and the report alike.
 * @param {object} env - snapshot.artifact
 * @param {(id: string, vars?: object) => string} t - The translator
 * @returns {Array<[string, string]>}
 */
export function citationRows(env, t) {
  const none = t('nb.report.notRecorded');
  const s = env.source ?? {};
  const cut = (env.warnings ?? []).find(w => w.startsWith(TRUNCATED));
  const left = cut ? Number(cut.slice(TRUNCATED.length)) || 0 : 0;
  const codes = (env.warnings ?? []).filter(w => !w.startsWith(TRUNCATED));
  const n = env.quantities?.length ?? 0;
  return [
    [
      t('nb.cite.source'),
      `${s.kind} · ${s.id}${s.version ? ` ${s.version}` : ''}`,
    ],
    [t('nb.cite.digest'), s.digest ?? none],
    [t('nb.cite.engine'), env.made?.engineFingerprint ?? none],
    [t('nb.cite.envelope'), `${env.format}/${env.formatVersion} · ${env.id}`],
    [
      t('nb.cite.count'),
      left
        ? t('nb.cite.countSome', { n, total: n + left })
        : t('nb.cite.countAll', { n }),
    ],
    [
      t('nb.cite.cite'),
      t('nb.cite.citeValue', {
        kind: s.kind,
        id: s.id,
        digest: s.digest ?? none,
      }),
    ],
    ...(codes.length ? [[t('nb.cite.warnings'), codes.join(', ')]] : []),
  ];
}
