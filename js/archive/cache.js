// =============================================================================
// A cached archive answer never pretends to be a new one
// -----------------------------------------------------------------------------
// An answer is kept by its query URL, with the time it was retrieved, the
// SHA-256 of its bytes and the digest of its content. Three rules follow from
// what a reader must be able to trust:
//
//   - A fresh copy (younger than a week) is used as it is, and says so.
//   - An old copy is refreshed. If the archive cannot be reached, the old
//     copy is offered as STALE, with its age and the reason, never silently.
//   - A refreshed answer whose content differs is a different observation:
//     its id carries the content digest, so a figure made from the old answer
//     still names the old one, and `changed` tells the page to say so.
//     Content, not bytes: VizieR stamps every answer with the time it was
//     asked, so the bytes differ on every request.
//
// No lesson reads this. Lessons read curated packs, which are part of the site
// and work offline; this serves only the Observatory's opt-in import. The
// store is the reader's own IndexedDB, and nothing in it leaves the device.
// =============================================================================

import { sha256Hex } from './net.js';

export const FRESH_MS = 7 * 86_400_000;

/**
 * @param {string} key - The query URL
 * @param {() => Promise<{bytes: Uint8Array, url: string}>} load - The network
 * @param {{store: {get: Function, set: Function},
 *   identify: (bytes: Uint8Array) => Promise<string>, maxAgeMs?: number,
 *   now?: () => number}} opts - `identify` gives the content digest
 * @returns {Promise<{bytes: Uint8Array, url: string, sha256: string,
 *   identity: string, retrievedMs: number, from: 'cache'|'network',
 *   ageMs: number, stale: boolean, changed: boolean, error?: Error,
 *   previous?: object|null}>}
 */
export async function cachedFetch(
  key,
  load,
  { store, identify, maxAgeMs = FRESH_MS, now = Date.now }
) {
  let held = null;
  try {
    held = (await store.get(key)) ?? null;
  } catch {
    held = null; // an unreadable store is an empty one
  }
  const age = held ? now() - held.retrievedMs : null;
  if (held && age >= 0 && age < maxAgeMs)
    return { ...held, from: 'cache', ageMs: age, stale: false, changed: false };
  let got;
  try {
    got = await load();
  } catch (error) {
    if (!held || error?.code === 'canceled') throw error;
    return {
      ...held,
      from: 'cache',
      ageMs: age,
      stale: true,
      changed: false,
      error,
    };
  }
  const entry = {
    bytes: got.bytes,
    url: got.url,
    sha256: await sha256Hex(got.bytes),
    identity: await identify(got.bytes),
    retrievedMs: now(),
  };
  try {
    await store.set(key, entry);
  } catch {
    /* a full or private store: the answer is still good, just not kept */
  }
  return {
    ...entry,
    from: 'network',
    ageMs: 0,
    stale: false,
    changed: Boolean(held && held.identity !== entry.identity),
    previous: held
      ? {
          sha256: held.sha256,
          identity: held.identity,
          retrievedMs: held.retrievedMs,
        }
      : null,
  };
}

/** A Map as a store: for tests, and for a page with no IndexedDB. */
export function memoryStore() {
  const m = new Map();
  return { get: async k => m.get(k), set: async (k, v) => void m.set(k, v) };
}

/**
 * The reader's IndexedDB as a store, one database of its own. Falls back to
 * memory where IndexedDB is missing or refused (a private window, some
 * embedded browsers).
 */
export function idbStore(name = 'gravitas-archive') {
  if (typeof indexedDB === 'undefined') return memoryStore();
  let opening = null;
  const db = () =>
    (opening ??= new Promise((resolve, reject) => {
      const req = indexedDB.open(name, 1);
      req.onupgradeneeded = () => req.result.createObjectStore('answers');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }));
  const run = (mode, fn) =>
    db().then(
      d =>
        new Promise((resolve, reject) => {
          const tx = d.transaction('answers', mode);
          const req = fn(tx.objectStore('answers'));
          tx.oncomplete = () => resolve(req.result);
          tx.onerror = () => reject(tx.error);
          tx.onabort = () => reject(tx.error);
        })
    );
  return {
    get: key => run('readonly', s => s.get(key)),
    set: (key, value) =>
      run('readwrite', s => s.put(value, key)).then(() => {}),
  };
}
