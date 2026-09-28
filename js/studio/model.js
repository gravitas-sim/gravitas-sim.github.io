// =============================================================================
// The Scenario Studio's state: history, drafts and differences
// -----------------------------------------------------------------------------
// Pure, and small on purpose, because these are the parts of an editor that
// lose work when they are wrong. A document is a scenario pack, always a plain
// JSON value; nothing here knows what one means (js/platform/scenario.js
// does).
//
//   History   every committed edit is a snapshot; undo and redo walk them.
//             A snapshot is the document's JSON, so an undone state is byte
//             for byte the state it was.
//   Drafts    the document is saved to this browser after every commit, by
//             id, so a closed tab or a crash loses nothing but the edit being
//             typed. Storage that refuses (a private window, a full disk) is
//             reported, never thrown.
//   Diff      what changed between two documents, field by field, for the
//             review before an export and for a conflict on import.
// =============================================================================

/** Two-space JSON with a final newline: what the Studio writes to a file. */
export const serialize = doc => `${JSON.stringify(doc, null, 2)}\n`;

const clone = v => JSON.parse(JSON.stringify(v));

/**
 * An undo history of committed documents.
 *
 * @param {object} initial - The document to start from
 * @param {number} [limit] - Snapshots kept before the oldest is dropped
 */
export function createHistory(initial, limit = 200) {
  let past = [];
  let present = JSON.stringify(initial);
  let future = [];
  return {
    /** The current document, as a fresh copy. */
    current: () => JSON.parse(present),
    /**
     * Commit a new document. Nothing is recorded when it is the same.
     * @returns {boolean} Whether anything changed
     */
    commit(doc) {
      const next = JSON.stringify(doc);
      if (next === present) return false;
      past.push(present);
      if (past.length > limit) past = past.slice(-limit);
      present = next;
      future = [];
      return true;
    },
    undo() {
      if (!past.length) return null;
      future.push(present);
      present = past.pop();
      return JSON.parse(present);
    },
    redo() {
      if (!future.length) return null;
      past.push(present);
      present = future.pop();
      return JSON.parse(present);
    },
    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0,
    /** Start again from a document, forgetting everything before it. */
    reset(doc) {
      past = [];
      future = [];
      present = JSON.stringify(doc);
    },
  };
}

const DRAFT_PREFIX = 'gravitas_studio_draft:';
const LAST_KEY = 'gravitas_studio_last';

/**
 * Drafts kept in a Storage (localStorage in the page, a stand-in in tests).
 * @param {Storage} store
 */
export function createDrafts(store) {
  const safe = fn => {
    try {
      return { ok: true, value: fn() };
    } catch {
      return { ok: false, value: null };
    }
  };
  return {
    /** @returns {{ok: boolean}} Whether the browser kept it */
    save(doc, savedAt = Date.now()) {
      const r = safe(() => {
        store.setItem(
          `${DRAFT_PREFIX}${doc.id}`,
          JSON.stringify({ savedAt, doc })
        );
        store.setItem(LAST_KEY, doc.id);
      });
      return { ok: r.ok };
    },
    /** @returns {?{savedAt: number, doc: object}} */
    load(id) {
      const r = safe(() => JSON.parse(store.getItem(`${DRAFT_PREFIX}${id}`)));
      return r.ok && r.value?.doc ? r.value : null;
    },
    remove(id) {
      safe(() => store.removeItem(`${DRAFT_PREFIX}${id}`));
    },
    /** Every draft, newest first. One that cannot be read is left out. */
    list() {
      const keys = safe(() => {
        const out = [];
        for (let i = 0; i < store.length; i++) out.push(store.key(i));
        return out;
      });
      if (!keys.ok) return [];
      const out = [];
      for (const key of keys.value) {
        if (!key?.startsWith(DRAFT_PREFIX)) continue;
        const d = safe(() => JSON.parse(store.getItem(key))).value;
        if (d?.doc)
          out.push({ id: d.doc.id, savedAt: d.savedAt, title: d.doc.title });
      }
      return out.sort((a, b) => b.savedAt - a.savedAt);
    },
    /** The id of the draft saved last, or null. */
    last() {
      const r = safe(() => store.getItem(LAST_KEY));
      return r.ok ? r.value : null;
    },
  };
}

const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * Every field that differs between two documents.
 *
 * Objects are compared key by key and arrays index by index, down to the
 * values; a value that is an array of numbers (a black-hole mass list) is one
 * field. Paths are the validator's (`settings.num_planets`, `bodies[1].mass`),
 * so a change and a complaint about it name the same place.
 *
 * @param {*} before
 * @param {*} after
 * @returns {Array<{path: string, kind: 'added'|'removed'|'changed', before: *, after: *}>}
 */
export function semanticDiff(before, after) {
  const out = [];
  const walk = (a, b, path) => {
    if (JSON.stringify(a) === JSON.stringify(b)) return;
    const leafArray = v =>
      Array.isArray(v) && v.every(x => !isObject(x) && !Array.isArray(x));
    if (isObject(a) && isObject(b)) {
      for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
        walk(a[k], b[k], path ? `${path}.${k}` : k);
      }
      return;
    }
    if (
      Array.isArray(a) &&
      Array.isArray(b) &&
      !(leafArray(a) && leafArray(b))
    ) {
      for (let i = 0; i < Math.max(a.length, b.length); i++)
        walk(a[i], b[i], `${path}[${i}]`);
      return;
    }
    const kind =
      a === undefined ? 'added' : b === undefined ? 'removed' : 'changed';
    out.push({
      path,
      kind,
      before: a === undefined ? undefined : clone(a),
      after: b === undefined ? undefined : clone(b),
    });
  };
  walk(before, after, '');
  return out;
}
