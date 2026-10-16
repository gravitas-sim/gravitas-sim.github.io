// =============================================================================
// Where installed catalog packs live: IndexedDB, one record a pack
// -----------------------------------------------------------------------------
// An installed pack is its catalog entry's identity (id, version, checksum),
// its manifest, and its files as text: a data pack's series and record, a
// course's course.json. Nothing here is code, and nothing is ever evaluated;
// the pages that use a pack parse its JSON and decode it with the platform's
// own readers (js/observation.js, js/platform/course.js).
//
// A write is one transaction, so an install either happens whole or not at
// all: a pack is never half there. A browser without IndexedDB (a private
// window in some, or storage blocked) gets a store that says it is not
// persistent, and the page tells the reader rather than pretending.
// =============================================================================

const DB = 'gravitas-catalog';
// Records are JSON through and through, so a copy is a JSON round trip.
const copy = r => JSON.parse(JSON.stringify(r));
const VERSION = 1;
const STORE = 'packages';

/** A store that forgets on reload: for tests, and for a browser without IDB. */
export function createMemoryStore() {
  const rows = new Map();
  return {
    persistent: false,
    async list() {
      return [...rows.values()].map(r => copy(r));
    },
    async get(id) {
      return rows.has(id) ? copy(rows.get(id)) : null;
    },
    async put(record) {
      rows.set(record.id, copy(record));
    },
    async remove(id) {
      rows.delete(id);
    },
  };
}

const request = r =>
  new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });

/**
 * The browser's store, or a memory one when IndexedDB will not open.
 * @param {{indexedDB?: IDBFactory}} [opts]
 */
export async function openStore({ indexedDB = globalThis.indexedDB } = {}) {
  if (!indexedDB) return createMemoryStore();
  let db;
  try {
    const open = indexedDB.open(DB, VERSION);
    open.onupgradeneeded = () => {
      if (!open.result.objectStoreNames.contains(STORE))
        open.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    db = await request(open);
  } catch {
    return createMemoryStore();
  }
  const tx = mode => db.transaction(STORE, mode).objectStore(STORE);
  const done = t =>
    new Promise((resolve, reject) => {
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error || new Error('the write was aborted'));
    });
  return {
    persistent: true,
    async list() {
      return request(tx('readonly').getAll());
    },
    async get(id) {
      return (await request(tx('readonly').get(id))) ?? null;
    },
    async put(record) {
      const t = db.transaction(STORE, 'readwrite');
      t.objectStore(STORE).put(record);
      await done(t);
    },
    async remove(id) {
      const t = db.transaction(STORE, 'readwrite');
      t.objectStore(STORE).delete(id);
      await done(t);
    },
  };
}
