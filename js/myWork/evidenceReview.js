// =============================================================================
// Reviewing the whole ledger, and comparing two entries of it (Prompt 275, part A)
// -----------------------------------------------------------------------------
// The evidence notebook is the ledger: one entry per thing a student recorded,
// each holding a gravitas.artifact/1 envelope (js/notebook/ledger.js). This
// reads it as a whole: a row per entry that can be filtered by investigation,
// kind and date, and a comparison of one quantity of two entries of one kind.
//
// The comparison is the difference A - B and its variance
//
//     Var(A - B) = Var(A) + Var(B) - 2 Cov(A, B)
//
// from Prompt 151's comparison (js/compare/estimates.js compareEstimates and
// describeComparison), which uses the covariance when it is known, says
// "independence assumed" when it is not, and refuses what it cannot treat. It
// is the statistics kernel's `difference` (Prompt 154) computed again: the
// kernel is not imported because it is NEVER_PRECACHED with no adopter, and a
// first adopter would carry its nine files into the install; the test checks
// the two agree.
// The covariance is known when
//   - both quantities are of one record (one fit), and that record states the
//     coefficient between them (`correlatedWith`, Prompt 150);
//   - or the student states a correlation (or a covariance) for two records
//     that share data or calibration, which the page offers when it sees that
//     they do.
// Two different records state no coefficient of each other: nothing here
// infers one. Records that share data and have none are compared with
// independence assumed and a louder statement that the errors probably move
// together.
//
// Pure: no DOM, no storage, no catalogs. Lazy: only My work's review loads it.
// =============================================================================

import { envelopeOf } from '../notebook/ledger.js';
import {
  compareEstimates,
  correlationBetween,
  sigmaOf,
} from '../compare/estimates.js';

const DATA_SOURCES = new Set(['pipeline', 'guide']);
const DAY = 86400000;

/**
 * Where in the student's work an entry was kept, as a key to filter on and the
 * parts a reader says (js/notebook/ledger.js contextText).
 * @param {object} env - The entry's envelope
 * @returns {{key: string, ctx: ?object}}
 */
export function investigationOf(env) {
  const c = env.provenance?.context ?? null;
  if (c?.lesson) return { key: `lesson:${c.lesson}`, ctx: c };
  if (c?.guide) return { key: `guide:${c.guide}`, ctx: c };
  if (c?.page) return { key: `page:${c.page}`, ctx: c };
  return { key: `source:${env.source.id}`, ctx: null };
}

/**
 * One row per entry, in the notebook's order.
 * @param {Array<object>} entries - The notebook's entries
 * @returns {Array<{id: string, title: string, kind: string,
 *   investigation: string, ctx: ?object, sourceId: string, when: number,
 *   marked: boolean, tampered: boolean, quantities: number, entry: object}>}
 */
export function reviewRows(entries) {
  return entries.map(entry => {
    const env = envelopeOf(entry);
    const inv = investigationOf(env);
    return {
      id: entry.id,
      title: entry.title || entry.id,
      kind: entry.source || env.source.kind,
      investigation: inv.key,
      ctx: inv.ctx,
      sourceId: env.source.id,
      when: Number(entry.snapshot?.capturedAt) || 0,
      marked: entry.marked === true,
      tampered: entry.tampered === true,
      quantities: env.quantities.length,
      entry,
    };
  });
}

/**
 * The start of day `from` and the end of day `to` (both 'YYYY-MM-DD', the
 * reader's local days), as milliseconds; null for an empty or unreadable one.
 * @param {string} from
 * @param {string} to
 * @returns {{from: ?number, to: ?number}}
 */
export function dayBounds(from, to) {
  const at = s => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s ?? '');
    return m ? new Date(+m[1], +m[2] - 1, +m[3]).getTime() : null;
  };
  const [a, b] = [at(from), at(to)];
  return { from: a, to: b === null ? null : b + DAY - 1 };
}

/**
 * The rows that pass every filter that is set.
 * @param {Array<object>} rows - reviewRows()
 * @param {{investigation?: string, kind?: string, from?: ?number,
 *   to?: ?number, marked?: boolean}} [f]
 * @returns {Array<object>}
 */
export function filterRows(rows, f = {}) {
  return rows.filter(
    r =>
      (!f.investigation || r.investigation === f.investigation) &&
      (!f.kind || r.kind === f.kind) &&
      (f.from == null || r.when >= f.from) &&
      (f.to == null || r.when <= f.to) &&
      (!f.marked || r.marked)
  );
}

/** The distinct values of a field, in first-seen order, for a filter's menu. */
export const distinct = (rows, field) => [...new Set(rows.map(r => r[field]))];

/**
 * Whether two records are known to share what makes their errors move
 * together. `data`: the same record (one fit), or two measurements of one
 * observation (the same digest). `calibration`: both took the same assumed
 * quantity (same id, value and unit) as given. Null when nothing says so,
 * which does not mean they are independent: only that the record does not say.
 * @param {object} a - An envelope
 * @param {object} b - Another
 * @returns {?('data'|'calibration')}
 */
export function sharedBasis(a, b) {
  if (!a || !b) return null;
  if (a.id === b.id) return 'data';
  const [da, db] = [a.source.digest, b.source.digest];
  if (da && da === db && DATA_SOURCES.has(a.source.kind)) return 'data';
  const assumed = e =>
    e.quantities.filter(
      q => q.origin === 'assumed' || q.id.startsWith('assumed:')
    );
  for (const x of assumed(a))
    if (
      assumed(b).some(
        y => y.id === x.id && y.value === x.value && y.unit === x.unit
      )
    )
      return 'calibration';
  return null;
}

/**
 * The quantities two entries of one kind can be compared on: the ids both
 * hold with one unit, the first of them first.
 * @param {object} a - An envelope
 * @param {object} b - Another
 * @returns {Array<{id: string, unit: ?string}>}
 */
export function commonQuantities(a, b) {
  const out = [];
  for (const q of a.quantities) {
    const p = b.quantities.find(x => x.id === q.id);
    if (p && p.unit === q.unit && !q.id.startsWith('assumed:'))
      out.push({ id: q.id, unit: q.unit });
  }
  return out;
}

/**
 * Compare quantity `idA` of entry A with quantity `idB` of entry B.
 * Refuses (`{ok: false, reason}`) two entries of different kinds, a missing
 * quantity, two units, an uncertainty that is not one standard deviation
 * (js/compare/estimates.js sigmaOf), and a covariance the uncertainties do not
 * allow. Otherwise the difference, its sigma, its significance and p, and the
 * assumptions it rests on, as js/compare/estimates.js describeComparison says
 * them.
 * @param {object} entryA - A notebook entry
 * @param {object} entryB - Another, of the same kind (`source`)
 * @param {{idA?: string, idB?: string, rho?: ?number, covariance?: ?number,
 *   shared?: ?('data'|'calibration')}} [o] - `shared` overrides what the two
 *   records say when the student knows better; a number `rho`/`covariance`
 *   is the student's, and wins over what a record states
 * @returns {object}
 */
export function compareEntries(entryA, entryB, o = {}) {
  if (!entryA || !entryB) return { ok: false, reason: 'entries' };
  if (entryA.source !== entryB.source) return { ok: false, reason: 'kind' };
  const [ea, eb] = [envelopeOf(entryA), envelopeOf(entryB)];
  const common = commonQuantities(ea, eb);
  const idA =
    o.idA ??
    common[0]?.id ??
    ea.quantities.find(q => eb.quantities.some(x => x.id === q.id))?.id;
  const idB = o.idB ?? idA;
  const qa = ea.quantities.find(q => q.id === idA);
  const qb = eb.quantities.find(q => q.id === idB);
  if (!qa || !qb) return { ok: false, reason: 'quantity' };
  if (qa.unit !== qb.unit) return { ok: false, reason: 'unit' };
  const [sa, sb] = [sigmaOf(qa), sigmaOf(qb)];
  if ('reason' in sa) return { ok: false, reason: sa.reason, which: 'a' };
  if ('reason' in sb) return { ok: false, reason: sb.reason, which: 'b' };

  const stated = ea.id === eb.id ? correlationBetween(ea, idA, idB) : null;
  const basis = o.shared ?? sharedBasis(ea, eb);
  // What is known of how the two move together: the student's own number
  // first, then what the record states between two of its own quantities.
  let known = {};
  let from = null;
  if (Number.isFinite(o.covariance))
    [known, from] = [{ covariance: o.covariance }, 'student'];
  else if (Number.isFinite(o.rho)) [known, from] = [{ rho: o.rho }, 'student'];
  else if (stated !== null) [known, from] = [{ rho: stated }, 'record'];
  const r = compareEstimates(qa, qb, { ...known, shared: basis });
  if (!r.ok) return r;
  return { ...r, idA, idB, unit: qa.unit, a: qa, b: qb, covarianceFrom: from };
}

/**
 * The comparisons that apply across investigations (Prompt 276): pairs of
 * entries of one kind, kept in two different investigations (investigationOf),
 * that hold a quantity in common which compareEntries can compare as they
 * stand: one unit and a one-sigma uncertainty on each. An entry whose checksum
 * no longer matches is left out. The newest pairs first.
 *
 * Nothing is inferred: a pair is listed because the two records say they hold
 * the same quantity, and the comparison itself is compareEntries, with its
 * covariance rule unchanged.
 *
 * @param {Array<object>} entries - The notebook's entries
 * @param {number} [limit] - The most pairs listed
 * @returns {Array<{a: string, b: string, id: string, unit: ?string}>} Entry
 *   ids and the quantity to compare
 */
export function acrossInvestigations(entries, limit = 6) {
  const rows = reviewRows(entries)
    .filter(r => !r.tampered)
    .map(r => ({ ...r, env: envelopeOf(r.entry) }));
  const out = [];
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const [a, b] = [rows[i], rows[j]];
      if (a.entry.source !== b.entry.source) continue;
      if (a.investigation === b.investigation) continue;
      const q = commonQuantities(a.env, b.env).find(
        x => compareEntries(a.entry, b.entry, { idA: x.id }).ok
      );
      if (q)
        out.push({
          a: a.id,
          b: b.id,
          id: q.id,
          unit: q.unit ?? null,
          when: Math.max(a.when, b.when),
        });
    }
  }
  return out
    .sort((x, y) => y.when - x.when)
    .slice(0, limit)
    .map(({ when: _when, ...pair }) => pair);
}
