import { KEY_COLLECTIONS } from '../names.js';
import { readJson, writeJson } from '../storage/local.js';
import { PLATFORM_API } from '../platform/catalog.generated.js';
import {
  FORMAT,
  FORMAT_VERSION,
  GUIDES,
  MAX_ITEMS_PER_UNIT,
  validateCoursePack,
} from '../course/pack.js';
import { entryIdOfItem } from './format.js';

// =============================================================================
// Saved items and kept collections (Roadmap III Prompt 164)
// -----------------------------------------------------------------------------
// A collection is a course package with `profile: "collection"` (js/course/
// pack.js): one unit, items in order, a note and a depth where an item has
// them, no assignments. The student's favourites are one such package, kept
// here; a collection that arrived by a link or a file and was kept is another,
// in the same shape. One key holds both, in the `courses` collection, so a
// backup file carries it and My work lists it:
//
//   { v: 1, saved: <package>, received: [{ at, pack }] }
//
// `saved` is the student's own (made); each `received` is somebody else's,
// kept on the student's press of one button, never by opening a link. A 2.0.0
// build does not know the key and ignores the whole record
// (tests/compat/kinds/collections-record.mjs). Nothing here leaves the
// browser, and nothing but the package is stored: no answers and no name.
//
// Lazy and DOM-free: the Library, the course home and Teach load it when
// something asks. A damaged record, or a package that does not read as a
// collection, reads as empty and the next write replaces it.
// =============================================================================

export const COLLECTIONS_KEY = KEY_COLLECTIONS;
export const COLLECTIONS_VERSION = 1;
/** How many collections a student keeps from others. */
export const RECEIVED_MAX = 6;
/** The id of the student's own collection. */
export const SAVED_ID = 'saved-items';

const API = { locales: ['en', 'es'] };
const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);

/** A package that reads as a collection (shape only: no lesson list is asked). */
export const readsAsCollection = pack =>
  isObj(pack) &&
  pack.profile === 'collection' &&
  validateCoursePack(pack, API).length === 0;

/** The items of a collection, in order. */
export const itemsOfCollection = pack => pack?.units?.[0]?.items ?? [];

/**
 * What the student has: their own collection (or null) and the ones kept.
 * @param {Storage} [store] - Defaults to localStorage
 * @returns {{saved: ?object, received: Array<{at: number, pack: object}>}}
 */
export function readCollections(store) {
  const record = readJson(COLLECTIONS_KEY, null, store);
  const none = { saved: null, received: [] };
  if (record?.v !== COLLECTIONS_VERSION) return none;
  const seen = new Set();
  return {
    saved: readsAsCollection(record.saved) ? record.saved : null,
    received: (Array.isArray(record.received) ? record.received : [])
      .filter(r => isObj(r) && readsAsCollection(r.pack))
      .filter(r => !seen.has(r.pack.id) && seen.add(r.pack.id))
      .map(r => ({ at: Number.isFinite(r.at) ? r.at : 0, pack: r.pack }))
      .slice(0, RECEIVED_MAX),
  };
}

/** Whether the browser kept it. */
function write({ saved, received }, store) {
  return writeJson(
    COLLECTIONS_KEY,
    { v: COLLECTIONS_VERSION, ...(saved ? { saved } : {}), received },
    'courses',
    store
  );
}

const middle = d => {
  const n = Math.round(((d?.min ?? 10) + (d?.max ?? d?.min ?? 10)) / 2);
  return Math.min(600, Math.max(1, n));
};

/**
 * The item a Library entry becomes, or null where a collection cannot hold it
 * (a course, an activity, an experiment, a 3-D system or an Observatory
 * investigation). Its id is its kind and its public id.
 * @param {object} entry - A Library entry
 * @returns {?object}
 */
export function itemOfEntry(entry) {
  const id = String(entry?.id ?? '').slice(String(entry?.id).indexOf(':') + 1);
  if (!id) return null;
  switch (entry.format) {
    case 'lesson':
      return { id: `lesson-${id}`, kind: 'lesson', lesson: id };
    case 'lab3d':
    case 'mission':
      return Object.hasOwn(GUIDES, id)
        ? {
            id: `guide-${id}`,
            kind: 'guide',
            guide: id,
            depth: 'core',
            minutes: GUIDES[id].intro,
          }
        : null;
    case 'sandbox':
      return {
        id: `scenario-${id}`,
        kind: 'scenario',
        scenario: id,
        seed: 'start-1',
        minutes: middle(entry.duration),
      };
    case 'observation':
      return {
        id: `dataset-${id}`,
        kind: 'dataset',
        dataset: id,
        minutes: middle(entry.duration),
      };
    default:
      return null;
  }
}

/** The student's own collection holding these items. */
export const savedPack = items => ({
  format: FORMAT,
  formatVersion: FORMAT_VERSION,
  id: SAVED_ID,
  version: '1.0.0',
  gravitas: PLATFORM_API,
  locales: ['en'],
  pinning: 'compatible',
  profile: 'collection',
  title: { en: 'Saved items' },
  units: [{ id: 'saved', title: { en: 'Saved' }, items }],
});

/** Whether an entry is among the saved items. */
export const isSaved = (entryId, store) =>
  itemsOfCollection(readCollections(store).saved).some(
    i => entryIdOfItem(i) === entryId
  );

/**
 * Save an entry, or take it out again when it is saved.
 * @param {object} entry - A Library entry
 * @param {Storage} [store]
 * @returns {{ok: boolean, saved: boolean, full?: boolean}} `ok` is false when
 *   the entry cannot be saved or the browser did not keep it
 */
export function toggleSaved(entry, store) {
  const have = readCollections(store);
  const items = [...itemsOfCollection(have.saved)];
  const at = items.findIndex(i => entryIdOfItem(i) === entry.id);
  if (at >= 0) items.splice(at, 1);
  else {
    const item = itemOfEntry(entry);
    if (!item) return { ok: false, saved: false };
    if (items.length >= MAX_ITEMS_PER_UNIT)
      return { ok: false, saved: false, full: true };
    items.push(item);
  }
  const ok = write(
    { saved: items.length ? savedPack(items) : null, received: have.received },
    store
  );
  return { ok, saved: ok ? at < 0 : at >= 0 };
}

/** Take one item out of the student's own collection. */
export function removeSaved(itemId, store) {
  const have = readCollections(store);
  const items = itemsOfCollection(have.saved).filter(i => i.id !== itemId);
  return write(
    { saved: items.length ? savedPack(items) : null, received: have.received },
    store
  );
}

/** Replace the student's own collection with this one (Teach's editor). */
export function replaceSaved(pack, store) {
  if (!readsAsCollection(pack)) return false;
  const have = readCollections(store);
  return write(
    { saved: { ...pack, id: SAVED_ID }, received: have.received },
    store
  );
}

/**
 * Keep a collection that arrived by a link or a file. The same collection kept
 * twice is one; the newest is first; the oldest of too many is let go.
 * @param {object} pack - A package with profile collection
 * @param {Storage} [store]
 * @returns {boolean} Whether the browser kept it
 */
export function keepCollection(pack, store) {
  if (!readsAsCollection(pack) || pack.id === SAVED_ID) return false;
  const have = readCollections(store);
  const received = [
    { at: Date.now(), pack },
    ...have.received.filter(r => r.pack.id !== pack.id),
  ].slice(0, RECEIVED_MAX);
  return write({ saved: have.saved, received }, store);
}

/** Let go of a kept collection. */
export function dropCollection(id, store) {
  const have = readCollections(store);
  return write(
    {
      saved: have.saved,
      received: have.received.filter(r => r.pack.id !== id),
    },
    store
  );
}
