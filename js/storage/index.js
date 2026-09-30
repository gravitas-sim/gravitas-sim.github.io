// =============================================================================
// One place for what Gravitas keeps in the browser
// -----------------------------------------------------------------------------
// Roadmap II Prompt 65, step 2. STORAGE.md is the inventory of what is stored
// today, key by key; this is the module every writer moves onto (step 3):
//
//   - namespaced collections, the nouns of the student data model (COLLECTIONS);
//   - IndexedDB, falling back to localStorage, falling back to memory - and a
//     store in memory says so (`store.fallback`), because work kept there is
//     gone when the tab closes and a reader has to be told;
//   - quota awareness: a write is refused, with a reason, when it would leave
//     less than RESERVE_BYTES of the origin's quota free, as
//     navigator.storage.estimate() reports it;
//   - a size policy per collection;
//   - a change event, in this tab and every other tab of the origin;
//   - one migration path, readVersioned, for every collection;
//   - export-all to one versioned file, and import-all with conflict handling
//     (keep both, replace, skip) and a dry run that changes nothing.
//
// A record is kept as { id, version, saved, value }. `value` is the
// collection's own document, unchanged: step 3 moves writers over without
// changing a single format.
//
// No DOM. Browser and Node alike: the memory backend is what Jest runs.
// =============================================================================

import { canonicalJson } from '../hash.js';
import { isObject, readVersioned } from '../platform/common.js';

export const EXPORT_FORMAT = 'gravitas.student-data';
export const EXPORT_VERSION = 1;

/**
 * What a write must leave free of the origin's quota. Chosen as the larger of
 * 5 MiB and a tenth of the quota: enough that the service worker's precache
 * (about 14 MB, OFFLINE_AND_LOW_END.md) can update without the browser
 * evicting the origin, and that one more autosave never lands a reader on a
 * full disk.
 */
export const RESERVE_BYTES = 5 * 1024 * 1024;
export const reserveFor = quota =>
  Math.max(RESERVE_BYTES, Math.floor((quota || 0) / 10));

const MiB = 1024 * 1024;

/**
 * The collections, and each one's size policy: the most one record may hold
 * and the most the collection may hold, in bytes of canonical JSON. The
 * experiment figures are the store's own (js/experiments/store.js LIMITS);
 * the rest are generous ceilings on what one reader can make, set so that no
 * single collection can take the reserve.
 */
export const COLLECTIONS = Object.freeze({
  progress: { item: 1 * MiB, total: 8 * MiB },
  evidence: { item: 2 * MiB, total: 16 * MiB },
  experiments: { item: 512 * 1024, total: 2 * MiB },
  drafts: { item: 2 * MiB, total: 16 * MiB },
  assignments: { item: 1 * MiB, total: 8 * MiB },
  courses: { item: 1 * MiB, total: 8 * MiB },
  installs: { item: 8 * MiB, total: 64 * MiB },
  settings: { item: 256 * 1024, total: 1 * MiB },
  preferences: { item: 64 * 1024, total: 256 * 1024 },
});

/** How many bytes a value takes, as stored. */
export const sizeOf = value =>
  new TextEncoder().encode(canonicalJson(value)).length;

// --- Backends ----------------------------------------------------------------
// Each is the same four operations over (collection, id) pairs, all async.

/** A deep copy, so a caller's later edits never reach what is stored. */
const clone = v => JSON.parse(JSON.stringify(v));

/** Records in memory: gone when the page closes. */
export function memoryBackend() {
  const data = new Map();
  const key = (c, id) => `${c}\u0000${id}`;
  return {
    mode: 'memory',
    async get(c, id) {
      return data.has(key(c, id)) ? clone(data.get(key(c, id))) : null;
    },
    async put(c, id, rec) {
      data.set(key(c, id), clone(rec));
    },
    async delete(c, id) {
      data.delete(key(c, id));
    },
    async list(c) {
      const out = [];
      for (const [k, rec] of data) {
        if (k.startsWith(`${c}\u0000`)) out.push(clone(rec));
      }
      return out;
    },
  };
}

/** The prefix of every localStorage key the fallback writes (STORAGE.md). */
export const LOCAL_PREFIX = 'gravitas_store:';

/** Records in localStorage, one key each. */
export function localBackend(storage = globalThis.localStorage) {
  const key = (c, id) => `${LOCAL_PREFIX}${c}:${id}`;
  return {
    mode: 'local',
    async get(c, id) {
      const raw = storage.getItem(key(c, id));
      return raw === null ? null : JSON.parse(raw);
    },
    async put(c, id, rec) {
      storage.setItem(key(c, id), JSON.stringify(rec));
    },
    async delete(c, id) {
      storage.removeItem(key(c, id));
    },
    async list(c) {
      const prefix = `${LOCAL_PREFIX}${c}:`;
      const out = [];
      for (let i = 0; i < storage.length; i++) {
        const k = storage.key(i);
        if (!k?.startsWith(prefix)) continue;
        try {
          out.push(JSON.parse(storage.getItem(k)));
        } catch {
          /* a damaged record is skipped, not fatal to the list */
        }
      }
      return out;
    },
  };
}

/** The IndexedDB database the store uses (STORAGE.md). */
export const DB_NAME = 'gravitas-store';
const DB_VERSION = 1;
const OBJECTS = 'records';

const done = request =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

/** Records in IndexedDB, keyed [collection, id]. Rejects if it cannot open. */
export async function idbBackend(idb = globalThis.indexedDB, name = DB_NAME) {
  if (!idb) throw new Error('IndexedDB is not available');
  const open = idb.open(name, DB_VERSION);
  open.onupgradeneeded = () => {
    const db = open.result;
    if (!db.objectStoreNames.contains(OBJECTS)) {
      const s = db.createObjectStore(OBJECTS, {
        keyPath: ['collection', 'id'],
      });
      s.createIndex('collection', 'collection');
    }
  };
  const db = await done(open);
  const tx = mode => db.transaction(OBJECTS, mode).objectStore(OBJECTS);
  const strip = row => {
    if (!row) return null;
    const { collection, ...rec } = row;
    void collection;
    return rec;
  };
  return {
    mode: 'idb',
    async get(c, id) {
      return strip(await done(tx('readonly').get([c, id])));
    },
    async put(c, id, rec) {
      await done(tx('readwrite').put({ ...rec, collection: c, id }));
    },
    async delete(c, id) {
      await done(tx('readwrite').delete([c, id]));
    },
    async list(c) {
      const rows = await done(tx('readonly').index('collection').getAll(c));
      return rows.map(strip);
    },
    close() {
      db.close();
    },
  };
}

// --- The store -----------------------------------------------------------------

/**
 * Open the store on the best backend this browser has.
 *
 * @param {object} [o]
 * @param {'auto'|'idb'|'local'|'memory'} [o.backend] - 'auto' tries
 *   IndexedDB, then localStorage, then memory
 * @param {() => Promise<{usage?: number, quota?: number}>} [o.estimate] -
 *   navigator.storage.estimate by default; injected by tests
 * @param {string} [o.channel] - The BroadcastChannel other tabs listen on
 * @returns {Promise<Store>}
 */
export async function openStore({
  backend = 'auto',
  estimate = () => globalThis.navigator?.storage?.estimate?.() ?? null,
  channel = 'gravitas-store',
} = {}) {
  let chosen = null;
  const tried = [];
  const attempt = async (name, make) => {
    if (chosen || (backend !== 'auto' && backend !== name)) return;
    try {
      const b = await make();
      if (name === 'local') {
        // Probe: Safari's private mode and blocked site data throw here.
        const probe = `${LOCAL_PREFIX}probe`;
        globalThis.localStorage.setItem(probe, '1');
        globalThis.localStorage.removeItem(probe);
      }
      chosen = b;
    } catch (err) {
      tried.push(`${name}: ${err?.message || err}`);
    }
  };
  await attempt('idb', () => idbBackend());
  await attempt('local', () => {
    if (!globalThis.localStorage)
      throw new Error('localStorage is not available');
    return localBackend();
  });
  if (!chosen) chosen = memoryBackend();
  return new Store(chosen, { estimate, channel, tried });
}

/**
 * @typedef {{ok: true, record: object} | {ok: false, reason: string,
 *   message: string}} WriteResult
 */

export class Store extends EventTarget {
  constructor(backend, { estimate, channel, tried = [] } = {}) {
    super();
    this.backend = backend;
    this.mode = backend.mode;
    /**
     * Why the store is not on IndexedDB, when it is not; null when it is.
     * A page shows this: work in memory does not survive the tab.
     */
    this.fallback =
      backend.mode === 'idb'
        ? null
        : {
            mode: backend.mode,
            reasons: tried,
            persistent: backend.mode !== 'memory',
          };
    this.estimateFn = estimate;
    this.channel = null;
    if (channel && typeof globalThis.BroadcastChannel === 'function') {
      this.channel = new globalThis.BroadcastChannel(channel);
      this.channel.onmessage = e => this._emit(e.data, true);
    }
  }

  _emit(detail, remote = false) {
    this.dispatchEvent(
      new CustomEvent('change', { detail: { ...detail, remote } })
    );
    if (!remote) this.channel?.postMessage(detail);
  }

  /** The origin's usage and quota, the reserve, and what a write may use. */
  async estimate() {
    let e = null;
    try {
      e = await this.estimateFn?.();
    } catch {
      /* no estimate: the policies still apply, the quota check cannot */
    }
    if (!e || !Number.isFinite(e.quota)) {
      return { known: false, mode: this.mode, reserve: RESERVE_BYTES };
    }
    const reserve = reserveFor(e.quota);
    const usage = e.usage || 0;
    return {
      known: true,
      mode: this.mode,
      usage,
      quota: e.quota,
      reserve,
      available: Math.max(0, e.quota - reserve - usage),
    };
  }

  /**
   * One collection.
   * @param {string} name - A key of COLLECTIONS
   * @param {{current?: number, migrations?: object, format?: string}} [rules]
   *   - The collection's version and how older records are read
   */
  collection(name, rules = {}) {
    const policy = COLLECTIONS[name];
    if (!policy) throw new Error(`no collection "${name}"`);
    const current = rules.current ?? 1;
    return {
      name,
      policy,
      /** The value, migrated to the current version; null if absent. */
      get: async id => {
        const rec = await this.backend.get(name, id);
        if (!rec) return null;
        const read = this._read(rec, rules, current);
        return read.ok ? read.doc.value : null;
      },
      /** The record itself, with why it could not be read if it cannot. */
      read: async id => {
        const rec = await this.backend.get(name, id);
        if (!rec)
          return {
            ok: false,
            reason: 'missing',
            message: 'nothing is saved under that name',
          };
        const read = this._read(rec, rules, current);
        return read.ok
          ? {
              ok: true,
              record: { ...read.doc },
              migrated: read.migrated,
              notes: read.notes,
            }
          : read;
      },
      put: (id, value) => this._put(name, id, value, current),
      delete: async id => {
        await this.backend.delete(name, id);
        this._emit({ collection: name, id, op: 'delete' });
      },
      list: async () =>
        (await this.backend.list(name)).map(r => ({
          id: r.id,
          version: r.version,
          saved: r.saved,
          bytes: r.bytes,
        })),
      /** Bytes the collection holds now. */
      bytes: async () =>
        (await this.backend.list(name)).reduce((a, r) => a + (r.bytes || 0), 0),
    };
  }

  _read(rec, rules, current) {
    // readVersioned speaks formatVersion; a record carries `version`.
    const r = readVersioned(
      { ...rec, formatVersion: rec.version },
      { current, min: rules.min ?? 1, migrations: wrap(rules.migrations) }
    );
    if (!r.ok) return r;
    const { formatVersion, ...doc } = r.doc;
    return { ...r, doc: { ...doc, version: formatVersion } };
  }

  /** @returns {Promise<WriteResult>} */
  async _put(name, id, value, version, saved = new Date().toISOString()) {
    const policy = COLLECTIONS[name];
    if (typeof id !== 'string' || !id) {
      return { ok: false, reason: 'id', message: 'a record needs a name' };
    }
    const bytes = sizeOf(value);
    if (bytes > policy.item) {
      return {
        ok: false,
        reason: 'itemTooLarge',
        message: `this is ${bytes} bytes; a ${name} record may hold ${policy.item}`,
        vars: { bytes, limit: policy.item },
      };
    }
    const existing = await this.backend.get(name, id);
    const held = (await this.backend.list(name)).reduce(
      (a, r) => a + (r.bytes || 0),
      0
    );
    const after = held - (existing?.bytes || 0) + bytes;
    if (after > policy.total) {
      return {
        ok: false,
        reason: 'collectionFull',
        message: `${name} would hold ${after} bytes; it may hold ${policy.total}`,
        vars: { bytes: after, limit: policy.total },
      };
    }
    const room = await this.estimate();
    const grows = bytes - (existing?.bytes || 0);
    if (room.known && grows > room.available) {
      return {
        ok: false,
        reason: 'quota',
        message:
          'the browser has too little room left for this; export and remove something first',
        vars: {
          bytes: grows,
          available: room.available,
          reserve: room.reserve,
        },
      };
    }
    const record = {
      id,
      version,
      saved,
      bytes,
      value,
    };
    try {
      await this.backend.put(name, id, record);
    } catch (err) {
      // The estimate is advisory; the browser has the last word.
      if (err?.name === 'QuotaExceededError') {
        return {
          ok: false,
          reason: 'quota',
          message: 'the browser refused the write: its storage is full',
        };
      }
      throw err;
    }
    this._emit({ collection: name, id, op: 'put' });
    return { ok: true, record };
  }

  // --- Export and import -----------------------------------------------------

  /** Everything the store holds, as one versioned document. */
  async exportAll() {
    const collections = {};
    for (const name of Object.keys(COLLECTIONS)) {
      const recs = await this.backend.list(name);
      if (!recs.length) continue;
      collections[name] = recs
        .map(({ id, version, saved, value }) => ({ id, version, saved, value }))
        .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    }
    return {
      format: EXPORT_FORMAT,
      formatVersion: EXPORT_VERSION,
      exported: new Date().toISOString(),
      collections,
    };
  }

  /**
   * Bring an export back.
   *
   * @param {unknown} file - A gravitas.student-data document
   * @param {{mode?: 'keep-both'|'replace'|'skip', dryRun?: boolean}} [o] -
   *   What to do with a record whose name is taken by a different one;
   *   a record identical to what is stored is always left alone
   * @returns {Promise<{ok: true, plan: Array<{collection: string, id: string,
   *   action: 'add'|'replace'|'skip'|'same'|'rename', as?: string,
   *   reason?: string}>, applied: boolean} | {ok: false, reason: string,
   *   message: string}>}
   */
  async importAll(file, { mode = 'keep-both', dryRun = false } = {}) {
    if (!['keep-both', 'replace', 'skip'].includes(mode)) {
      return { ok: false, reason: 'mode', message: `no import mode "${mode}"` };
    }
    const read = readVersioned(file, {
      format: EXPORT_FORMAT,
      current: EXPORT_VERSION,
    });
    if (!read.ok) return read;
    const { collections } = read.doc;
    if (!isObject(collections)) {
      return {
        ok: false,
        reason: 'shape',
        message: 'this file lists no collections',
      };
    }
    const plan = [];
    for (const [name, recs] of Object.entries(collections)) {
      if (!COLLECTIONS[name]) {
        for (const r of recs || [])
          plan.push({
            collection: name,
            id: String(r?.id),
            action: 'skip',
            reason: 'unknownCollection',
          });
        continue;
      }
      const taken = new Set((await this.backend.list(name)).map(r => r.id));
      for (const r of Array.isArray(recs) ? recs : []) {
        if (
          !isObject(r) ||
          typeof r.id !== 'string' ||
          !Number.isInteger(r.version)
        ) {
          plan.push({
            collection: name,
            id: String(r?.id),
            action: 'skip',
            reason: 'malformed',
          });
          continue;
        }
        const here = await this.backend.get(name, r.id);
        if (!here) {
          plan.push({ collection: name, id: r.id, action: 'add', record: r });
        } else if (canonicalJson(here.value) === canonicalJson(r.value)) {
          plan.push({ collection: name, id: r.id, action: 'same' });
        } else if (mode === 'replace') {
          plan.push({
            collection: name,
            id: r.id,
            action: 'replace',
            record: r,
          });
        } else if (mode === 'skip') {
          plan.push({
            collection: name,
            id: r.id,
            action: 'skip',
            reason: 'exists',
          });
        } else {
          let n = 2;
          while (taken.has(`${r.id} (${n})`)) n++;
          const as = `${r.id} (${n})`;
          taken.add(as);
          plan.push({
            collection: name,
            id: r.id,
            action: 'rename',
            as,
            record: r,
          });
        }
      }
    }
    if (!dryRun) {
      for (const step of plan) {
        if (!step.record) continue;
        const id = step.as ?? step.id;
        const result = await this._putRecord(step.collection, id, step.record);
        if (!result.ok) {
          step.action = 'skip';
          step.reason = result.reason;
        }
      }
    }
    return {
      ok: true,
      applied: !dryRun,
      plan: plan.map(({ record, ...s }) => {
        void record;
        return s;
      }),
    };
  }

  /** Store an imported record at its own version, through the policies. */
  async _putRecord(name, id, r) {
    // When it was saved is part of the record: an import keeps it.
    const saved =
      typeof r.saved === 'string' && !Number.isNaN(Date.parse(r.saved))
        ? r.saved
        : undefined;
    return this._put(name, id, r.value, r.version, saved);
  }

  /** Remove every record of every collection. */
  async deleteAll() {
    for (const name of Object.keys(COLLECTIONS)) {
      for (const r of await this.backend.list(name)) {
        await this.backend.delete(name, r.id);
      }
    }
    this._emit({ collection: '*', id: '*', op: 'deleteAll' });
  }

  close() {
    this.channel?.close();
    this.backend.close?.();
  }
}

/**
 * readVersioned migrations over records. A collection's `migrations[n]`
 * takes a version-n value and returns the version n + 1 value.
 */
function wrap(migrations = {}) {
  const out = {};
  for (const [k, step] of Object.entries(migrations)) {
    out[k] = rec => ({ ...rec, value: step(rec.value) });
  }
  return out;
}
