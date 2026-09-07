// =============================================================================
// The notebook: an ordered list of entries, and the file it travels in
// -----------------------------------------------------------------------------
// Pure list operations over the entries from entry.js, kept separate from
// store.js so the ordering rules can be tested without a browser and so the
// panel has one place to call for "move this up".
//
// Order is the student's argument. A notebook is read top to bottom by whoever
// marks it, so reorder is not a convenience - it is how a student says which
// reading their conclusion actually rests on. Nothing here sorts by date.
// =============================================================================

import { SCHEMA_VERSION, reviveEntry, validateEntry } from './entry.js';

/** What a downloaded notebook file says it is. */
export const BACKUP_KIND = 'gravitas.evidence.notebook';

/** The file format's version, independent of an entry's schema version. */
export const BACKUP_VERSION = 1;

/** Refuse to parse a file larger than this; see validateBackup. */
export const MAX_BACKUP_BYTES = 1024 * 1024;

/** How many entries one notebook may hold. */
export const MAX_ENTRIES = 60;

/**
 * Append an entry.
 *
 * At the end, not the front: the newest reading is the one the student has
 * just taken and has not yet placed in their argument, and putting it on top
 * would silently re-order the argument every time they save something.
 *
 * @param {Array<object>} entries - The notebook
 * @param {object} entry - From buildEntry()
 * @returns {Array<object>} A new list
 */
export function addEntry(entries, entry) {
  if (!entry) return entries;
  return [...entries.filter(e => e.id !== entry.id), entry];
}

/**
 * Replace one entry in place, keeping its position.
 *
 * Used by annotate: revising the prose must not move the entry, because its
 * position is part of what the student wrote.
 *
 * @param {Array<object>} entries - The notebook
 * @param {object} entry - The revised entry
 * @returns {Array<object>} A new list
 */
export function replaceEntry(entries, entry) {
  return entries.map(e => (e.id === entry.id ? entry : e));
}

/**
 * Remove one entry.
 *
 * @param {Array<object>} entries - The notebook
 * @param {string} id - Entry id
 * @returns {Array<object>} A new list
 */
export function removeEntry(entries, id) {
  return entries.filter(e => e.id !== id);
}

/**
 * Move an entry by a number of places, clamped to the ends.
 *
 * Clamped rather than wrapping: a reader pressing "up" on the top entry means
 * nothing, and moving it to the bottom would be a surprising answer to that.
 *
 * @param {Array<object>} entries - The notebook
 * @param {string} id - Entry id
 * @param {number} delta - Places to move; negative is towards the top
 * @returns {Array<object>} A new list
 */
export function moveEntry(entries, id, delta) {
  const from = entries.findIndex(e => e.id === id);
  if (from < 0 || !delta) return entries;
  const to = Math.max(0, Math.min(entries.length - 1, from + delta));
  if (to === from) return entries;
  const out = [...entries];
  const [moved] = out.splice(from, 1);
  out.splice(to, 0, moved);
  return out;
}

/**
 * Put the entries in a given order, dropping ids the notebook does not have.
 *
 * Any entry the order does not mention keeps its relative position at the end,
 * so a partial order - which is what a drag produces - cannot lose an entry.
 *
 * @param {Array<object>} entries - The notebook
 * @param {Array<string>} order - Entry ids, in the wanted order
 * @returns {Array<object>} A new list
 */
export function reorder(entries, order) {
  const byId = new Map(entries.map(e => [e.id, e]));
  const out = [];
  for (const id of order || []) {
    const found = byId.get(id);
    if (found && !out.includes(found)) out.push(found);
  }
  for (const e of entries) if (!out.includes(e)) out.push(e);
  return out;
}

/** How many entries came from each instrument. @returns {object} Counts by source */
export function tallyBySource(entries) {
  const out = {};
  for (const e of entries) out[e.source] = (out[e.source] || 0) + 1;
  return out;
}

/**
 * The downloadable notebook.
 *
 * Entries go in whole, snapshot and prose alike, because the point of the file
 * is that a student can carry their evidence to another machine and still have
 * the provenance. The order is the array order.
 *
 * @param {object} spec
 * @param {Array<object>} spec.entries - The notebook
 * @param {?string} [spec.student] - A name, if one was given
 * @param {string} [spec.revision] - The build that wrote the file
 * @returns {object} The file payload
 */
export function buildBackup({ entries, student = null, revision = 'dev' }) {
  return {
    kind: BACKUP_KIND,
    version: BACKUP_VERSION,
    entrySchema: SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    app: { revision: String(revision || 'dev') },
    student: student || null,
    entries: entries.map(e => ({
      id: e.id,
      source: e.source,
      title: e.title,
      prose: { ...e.prose },
      snapshot: e.snapshot,
      fingerprint: e.fingerprint,
      ...(e.revisedAt ? { revisedAt: e.revisedAt } : {}),
    })),
  };
}

/**
 * Check that a parsed object really is one of our notebooks.
 *
 * Every refusal is a reason the panel can say out loud, rather than a throw.
 *
 * @param {*} data - Whatever came out of the file
 * @returns {{ok: boolean, reason: string}} The verdict
 */
export function validateBackup(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, reason: 'notAnObject' };
  }
  if (data.kind !== BACKUP_KIND) return { ok: false, reason: 'notANotebook' };
  if (!Number.isInteger(data.version) || data.version < 1) {
    return { ok: false, reason: 'noVersion' };
  }
  if (data.version > BACKUP_VERSION) return { ok: false, reason: 'tooNew' };
  if (!Array.isArray(data.entries)) return { ok: false, reason: 'noEntries' };
  if (data.entries.length > MAX_ENTRIES) {
    return { ok: false, reason: 'tooManyEntries' };
  }
  for (const entry of data.entries) {
    const verdict = validateEntry(entry);
    if (!verdict.ok) return { ok: false, reason: verdict.reason };
  }
  return { ok: true, reason: '' };
}

/**
 * Turn a validated file into entries.
 *
 * Ids are kept, so restoring a notebook over one that already holds the same
 * entry replaces it rather than duplicating it. Anything whose checksum no
 * longer matches its snapshot is kept and marked, not dropped: a student whose
 * file was mangled should be able to see which entry it was.
 *
 * @param {object} data - A payload that passed validateBackup
 * @returns {{entries: Array<object>, tampered: number}} The restored notebook
 */
export function restoreBackup(data) {
  const entries = data.entries.map(reviveEntry);
  return {
    entries,
    tampered: entries.filter(e => e.tampered).length,
  };
}

/**
 * A filename for a downloaded notebook.
 *
 * @param {Date} [now] - For a deterministic name in tests
 * @returns {string} Filename
 */
export function backupFilename(now = new Date()) {
  const stamp = now.toISOString().slice(0, 16).replace(/[:T]/g, '-');
  return `gravitas-evidence-${stamp}.json`;
}
