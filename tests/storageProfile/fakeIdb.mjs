// =============================================================================
// An IndexedDB with only what Gravitas uses, in memory
// -----------------------------------------------------------------------------
// js/catalog/store.js, js/archive/cache.js and js/storage/index.js (idbBackend)
// need: open with an upgrade step, object stores with an in-line (string or
// array) or out-of-line key, one index, get / getAll / put / delete, and a
// transaction that says when it is complete. That is all this does, so the
// round-trip fixture can hold IndexedDB's contents without a browser.
//
// Values survive as structured clones: a Uint8Array stays one. The fixture
// file stores bytes as {"$bytes": "<base64>"} (see toJson / fromJson).
// =============================================================================

const tick = fn => setTimeout(fn, 0);

const keyOf = (path, value, given) => {
  if (given !== undefined) return JSON.stringify(given);
  const read = p => p.split('.').reduce((v, k) => v?.[k], value);
  return JSON.stringify(Array.isArray(path) ? path.map(read) : read(path));
};

export const clone = v => structuredClone(v);

export function toJson(value) {
  return JSON.parse(
    JSON.stringify(value, function (k, v) {
      const raw = this[k];
      return raw instanceof Uint8Array
        ? { $bytes: Buffer.from(raw).toString('base64') }
        : v;
    })
  );
}

export function fromJson(value) {
  return JSON.parse(JSON.stringify(value), (k, v) =>
    v && typeof v === 'object' && '$bytes' in v
      ? new Uint8Array(Buffer.from(v.$bytes, 'base64'))
      : v
  );
}

class Request {
  constructor() {
    this.result = undefined;
    this.error = null;
    this.onsuccess = null;
    this.onerror = null;
  }
}

class Store {
  constructor(def, tx) {
    this.def = def;
    this.tx = tx;
  }
  _run(work) {
    const req = new Request();
    this.tx._pending++;
    tick(() => {
      try {
        req.result = work();
        req.onsuccess?.({ target: req });
      } catch (error) {
        req.error = error;
        req.onerror?.({ target: req });
      }
      this.tx._settle();
    });
    return req;
  }
  get(key) {
    return this._run(() =>
      clone(this.def.rows.get(JSON.stringify(key))?.value)
    );
  }
  getAll() {
    return this._run(() =>
      [...this.def.rows.values()].map(r => clone(r.value))
    );
  }
  put(value, key) {
    return this._run(() => {
      const k = keyOf(this.def.keyPath, value, key);
      this.def.rows.set(k, { value: clone(value) });
      return JSON.parse(k);
    });
  }
  delete(key) {
    return this._run(() => void this.def.rows.delete(JSON.stringify(key)));
  }
  index(name) {
    const path = this.def.indexes.get(name);
    return {
      getAll: query =>
        this._run(() =>
          [...this.def.rows.values()]
            .filter(r => keyOf(path, r.value) === JSON.stringify(query))
            .map(r => clone(r.value))
        ),
    };
  }
}

class Transaction {
  constructor(db, names) {
    this.db = db;
    this.names = names;
    this._pending = 0;
    this.oncomplete = null;
    this.onerror = null;
    this.onabort = null;
    this.error = null;
    tick(() => this._settle());
  }
  objectStore(name) {
    return new Store(this.db._data.stores.get(name), this);
  }
  _settle() {
    if (this._pending > 0) this._pending--;
    if (this._pending === 0) tick(() => this._done());
  }
  _done() {
    if (this._finished || this._pending > 0) return;
    this._finished = true;
    this.oncomplete?.({ target: this });
  }
}

class Database {
  constructor(data) {
    this._data = data;
    this.objectStoreNames = { contains: n => data.stores.has(n) };
  }
  createObjectStore(name, { keyPath = null } = {}) {
    const def = { keyPath, rows: new Map(), indexes: new Map() };
    this._data.stores.set(name, def);
    return {
      createIndex: (index, path) => void def.indexes.set(index, path),
    };
  }
  transaction(names) {
    return new Transaction(this, [].concat(names));
  }
  close() {}
}

export function fakeIndexedDB() {
  const databases = new Map();
  return {
    databases,
    open(name, version = 1) {
      const req = new Request();
      tick(() => {
        let data = databases.get(name);
        const upgrade = !data || data.version < version;
        if (!data) {
          data = { version, stores: new Map() };
          databases.set(name, data);
        }
        req.result = new Database(data);
        if (upgrade) {
          data.version = version;
          req.onupgradeneeded?.({ target: req });
        }
        tick(() => req.onsuccess?.({ target: req }));
      });
      return req;
    },
  };
}

/** Fill a factory from a fixture: {db: {version, stores: {name: {keyPath, rows}}}}. */
export function loadSnapshot(factory, snapshot) {
  for (const [name, db] of Object.entries(snapshot ?? {})) {
    const data = { version: db.version, stores: new Map() };
    for (const [store, def] of Object.entries(db.stores)) {
      const rows = new Map();
      for (const row of def.rows) {
        const value = fromJson(def.keyPath ? row : row.value);
        const key = def.keyPath
          ? keyOf(def.keyPath, value)
          : JSON.stringify(row.key);
        rows.set(key, { value });
      }
      data.stores.set(store, {
        keyPath: def.keyPath ?? null,
        rows,
        indexes: new Map(Object.entries(def.indexes ?? {})),
      });
    }
    factory.databases.set(name, data);
  }
  return factory;
}

/** The contents of a factory, as the fixture holds them. */
export function snapshotOf(factory) {
  const out = {};
  for (const [name, data] of factory.databases) {
    out[name] = { version: data.version, stores: {} };
    for (const [store, def] of data.stores) {
      out[name].stores[store] = {
        keyPath: def.keyPath,
        indexes: Object.fromEntries(def.indexes),
        rows: [...def.rows].map(([key, { value }]) =>
          def.keyPath
            ? toJson(value)
            : { key: JSON.parse(key), value: toJson(value) }
        ),
      };
    }
  }
  return out;
}
