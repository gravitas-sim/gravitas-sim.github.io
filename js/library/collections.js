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
// Lazy and DOM-free: the Library, the course home and the kit load it when
// something asks. A damaged record, or a package that does not read as a
// collection, reads as empty and the next write replaces it.
//
// It imports nothing. Each page that loads it hands over what the page already
// has (`bind`: how to read and write the record, the entry an item stands for,
// a checker, the platform version): the build splits a page's bundle by which
// entries reach a module, so a lazy module that imported the page's own storage
// functions, names or package checker would cost every visit one more request
// (the budget of each route holds that at none). js/library/collectionsDeps.js
// binds the real ones, for the kit and the tests.
// =============================================================================

export const COLLECTIONS_VERSION = 1;
/** How many collections a student keeps from others. */
export const RECEIVED_MAX = 6;
/** The id of the student's own collection. */
export const SAVED_ID = 'saved-items';

const FORMAT_VERSION = 2;
/** The most items a unit holds (js/course/pack.js MAX_ITEMS). */
const MAX_ITEMS = 30;
/** The platform version a saved list is written for (PLATFORM_API). */
export const SAVED_PLATFORM = '1.0.0';
const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);

/** What the page handed over (see the header). */
let io = null;

/**
 * Hand this module what the page already has.
 * @param {object} deps
 * @param {Function} deps.read - () => the stored record, or null
 * @param {Function} deps.write - (record) => whether the browser kept it
 * @param {Function} deps.entryIdOfItem - js/library/format.js
 * @param {string} deps.format - ID_COURSE_PACK (js/names.js)
 * @param {Function} [deps.validate] - (package) => a list of problems; where
 *   it is left out a package is held only to its shape
 * @param {string} [deps.platform] - PLATFORM_API
 */
export function bind(deps) {
  io = deps;
}

/** The Library entry an item stands for. */
export const entryIdOf = item => io.entryIdOfItem(item);

/** A package's shape, the part a display relies on. */
const shapeOk = pack =>
  isObj(pack.title) &&
  typeof pack.id === 'string' &&
  Array.isArray(pack.units) &&
  pack.units.length === 1 &&
  Array.isArray(pack.units[0]?.items) &&
  pack.units[0].items.length > 0 &&
  pack.units[0].items.every(
    i => isObj(i) && typeof i.id === 'string' && typeof i.kind === 'string'
  );

/** A package that reads as a collection. */
export const readsAsCollection = pack =>
  isObj(pack) &&
  pack.profile === 'collection' &&
  (io.validate ? io.validate(pack).length === 0 : shapeOk(pack));

/** The items of a collection, in order. */
export const itemsOfCollection = pack => pack?.units?.[0]?.items ?? [];

/**
 * What the student has: their own collection (or null) and the ones kept.
 * @returns {{saved: ?object, received: Array<{at: number, pack: object}>}}
 */
export function readCollections() {
  const record = io.read();
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
function write({ saved, received }) {
  return io.write({
    v: COLLECTIONS_VERSION,
    ...(saved ? { saved } : {}),
    received,
  });
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
      return {
        id: `guide-${id}`,
        kind: 'guide',
        guide: id,
        depth: 'core',
        minutes: middle(entry.duration),
      };
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
  format: io.format,
  formatVersion: FORMAT_VERSION,
  id: SAVED_ID,
  version: '1.0.0',
  gravitas: io?.platform ?? SAVED_PLATFORM,
  locales: ['en'],
  pinning: 'compatible',
  profile: 'collection',
  title: { en: 'Saved items' },
  units: [{ id: 'saved', title: { en: 'Saved' }, items }],
});

/** Whether an entry is among the saved items. */
export const isSaved = entryId =>
  itemsOfCollection(readCollections().saved).some(
    i => entryIdOf(i) === entryId
  );

/**
 * Save an entry, or take it out again when it is saved.
 * @param {object} entry - A Library entry
 * @returns {{ok: boolean, saved: boolean, full?: boolean}} `ok` is false when
 *   the entry cannot be saved or the browser did not keep it
 */
export function toggleSaved(entry) {
  const have = readCollections();
  const items = [...itemsOfCollection(have.saved)];
  const at = items.findIndex(i => entryIdOf(i) === entry.id);
  if (at >= 0) items.splice(at, 1);
  else {
    const item = itemOfEntry(entry);
    if (!item) return { ok: false, saved: false };
    if (items.length >= MAX_ITEMS)
      return { ok: false, saved: false, full: true };
    items.push(item);
  }
  const ok = write({
    saved: items.length ? savedPack(items) : null,
    received: have.received,
  });
  return { ok, saved: ok ? at < 0 : at >= 0 };
}

/** Take one item out of the student's own collection. */
export function removeSaved(itemId) {
  const have = readCollections();
  const items = itemsOfCollection(have.saved).filter(i => i.id !== itemId);
  return write({
    saved: items.length ? savedPack(items) : null,
    received: have.received,
  });
}

/** Replace the student's own collection with this one (Teach's editor). */
export function replaceSaved(pack) {
  if (!readsAsCollection(pack)) return false;
  const have = readCollections();
  return write({ saved: { ...pack, id: SAVED_ID }, received: have.received });
}

/**
 * Keep a collection that arrived by a link or a file. The same collection kept
 * twice is one; the newest is first; the oldest of too many is let go.
 * @param {object} pack - A package with profile collection
 * @returns {boolean} Whether the browser kept it
 */
export function keepCollection(pack) {
  if (!readsAsCollection(pack) || pack.id === SAVED_ID) return false;
  const have = readCollections();
  const received = [
    { at: Date.now(), pack },
    ...have.received.filter(r => r.pack.id !== pack.id),
  ].slice(0, RECEIVED_MAX);
  return write({ saved: have.saved, received });
}

/** Let go of a kept collection. */
export function dropCollection(id) {
  const have = readCollections();
  return write({
    saved: have.saved,
    received: have.received.filter(r => r.pack.id !== id),
  });
}
