// =============================================================================
// SPIKE (Prompt 18): a cached archive answer never pretends to be a new one
// -----------------------------------------------------------------------------
// An archive answer is kept by its query, with the date it was retrieved and
// the SHA-256 of its bytes. Three rules follow from what a reader must be able
// to trust:
//
//   - A fresh copy (younger than maxAgeMs) is used as it is, and says so.
//   - An old copy is refreshed. If the archive cannot be reached, the old
//     copy is offered as STALE, with its age and the reason, never silently.
//   - A refreshed answer whose content differs is a different observation:
//     the id carries the checksum, so a figure made from the old answer still
//     names the old one, and `changed` tells the page to say so. Content, not
//     bytes: VizieR stamps every answer with the time it was asked, so the
//     bytes differ on every request (`identify` supplies the content digest).
//
// A lesson never reads this. Lessons read curated packs, which are part of
// the site and work offline; this cache serves only the opt-in import page.
// The store is injected: IndexedDB in a page, a Map in a test.
// =============================================================================

import { sha256Hex } from './net.js';

/**
 * @param {string} key - The query URL
 * @param {() => Promise<{bytes: Uint8Array, url: string}>} load - The network
 * @param {{store: {get: Function, set: Function}, maxAgeMs?: number,
 *   now?: () => number, identify?: (bytes: Uint8Array) => Promise<string>}} opts
 */
export async function cachedFetch(key, load, { store, maxAgeMs = 7 * 86_400_000, now = Date.now, identify = sha256Hex }) {
  const held = await store.get(key);
  const age = held ? now() - held.retrievedMs : null;
  if (held && age < maxAgeMs) return { ...held, from: 'cache', ageMs: age, stale: false, changed: false };
  let got;
  try {
    got = await load();
  } catch (err) {
    if (!held) throw err;
    return { ...held, from: 'cache', ageMs: age, stale: true, changed: false, error: err };
  }
  const entry = {
    bytes: got.bytes,
    url: got.url,
    sha256: await sha256Hex(got.bytes),
    identity: await identify(got.bytes),
    retrievedMs: now(),
  };
  await store.set(key, entry);
  return {
    ...entry,
    from: 'network',
    ageMs: 0,
    stale: false,
    changed: Boolean(held && held.identity !== entry.identity),
    previous: held ? { sha256: held.sha256, identity: held.identity, retrievedMs: held.retrievedMs } : null,
  };
}

/** A Map as a store, for tests and for a page with no IndexedDB. */
export function memoryStore() {
  const m = new Map();
  return { get: async k => m.get(k), set: async (k, v) => void m.set(k, v) };
}
