// =============================================================================
// What a submission token says of the evidence behind its answers
// -----------------------------------------------------------------------------
// A v2 token carries `ev`: the digest of the student's evidence ledger, the ids
// of the envelopes it was made from, and the rows of the evidence table the
// report printed (js/notebook/ledger.js ledgerRecord(), capped). The review page
// recomputes the digest from the rows it was handed. A match says the table in
// front of the instructor is the table the digest was made from; it does not
// say who made it, and a token that is edited and re-digested passes. Like the
// answers, it verifies structure, not identity.
//
// Kept to hash.js so the review page and the lesson's token path load neither
// the unit registry nor the notebook.
// =============================================================================

import { canonicalJsonExact, sha256Hex } from '../hash.js';

/** @param {{ids: string[], rows: Array<Array<*>>}} r - A ledger record */
export const ledgerDigest = ({ ids, rows }) =>
  sha256Hex(canonicalJsonExact({ ids, rows }));

/**
 * Whether a token's evidence is what its digest says.
 * @param {?object} ev - The token's `ev`, if it has one
 * @returns {Promise<{state: 'none'|'verified'|'partial'|'mismatch', rows:
 *   Array<Array<*>>, ids: string[], digest: ?string, total: number}>}
 *   `partial` is a table cut to the token's limit: the digest covers more rows
 *   than the token carries and cannot be recomputed
 */
export async function checkEvidence(ev) {
  if (!ev) return { state: 'none', rows: [], ids: [], digest: null, total: 0 };
  const rows = Array.isArray(ev.r) ? ev.r : [];
  const ids = Array.isArray(ev.i) ? ev.i : [];
  const total = Number.isInteger(ev.n) ? ev.n : rows.length;
  const base = { rows, ids, digest: ev.d ?? null, total };
  if (total > rows.length) return { state: 'partial', ...base };
  return {
    state:
      (await ledgerDigest({ ids, rows })) === ev.d ? 'verified' : 'mismatch',
    ...base,
  };
}
