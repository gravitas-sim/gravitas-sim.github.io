// =============================================================================
// Parts are whole or absent, recoverable, and never student work
// -----------------------------------------------------------------------------
// Prompt 147: js/offlineParts.js (the contract), sw.js (the parts cache
// survives a version change and answers its own URLs) and js/archive/cache.js
// (least-recently-used eviction of cached answers).
// =============================================================================
import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = rel => readFileSync(path.join(ROOT, rel), 'utf8');

// Jest's realm has neither WebCrypto nor Response; the module meets the
// browser's, so the test supplies faithful stand-ins.
const { webcrypto } = await import('node:crypto');
if (!globalThis.crypto?.subtle)
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
  });
globalThis.Response ??= class {
  constructor(body) {
    this.body = body;
  }
  async json() {
    return JSON.parse(this.body);
  }
};

const parts = await import('../js/offlineParts.js');
const archive = await import('../js/archive/cache.js');

const sha = b => createHash('sha256').update(b).digest('hex');
const part = (id, text) => {
  const bytes = Buffer.from(text);
  const d = sha(bytes);
  return {
    id,
    url: `/parts/${id}.${d.slice(0, 16)}.bin`,
    sha256: d,
    bytes: bytes.length,
  };
};

function fakeCaches() {
  const stores = new Map();
  const make = () => {
    const m = new Map();
    return {
      m,
      put: async (k, r) => void m.set(typeof k === 'string' ? k : k.url, r),
      match: async k => m.get(typeof k === 'string' ? k : k.url),
      delete: async k => m.delete(typeof k === 'string' ? k : k.url),
      keys: async () => [...m.keys()].map(url => ({ url })),
    };
  };
  return {
    stores,
    open: async n => (stores.has(n) || stores.set(n, make()), stores.get(n)),
    keys: async () => [...stores.keys()],
    delete: async n => stores.delete(n),
  };
}
const server =
  (files, log = []) =>
  async url => {
    const name = new URL(url, 'http://x/').pathname;
    log.push(name);
    const body = files[name];
    if (body == null) return { ok: false, status: 404 };
    const b = Buffer.from(body);
    return {
      ok: true,
      status: 200,
      arrayBuffer: async () =>
        b.buffer.slice(b.byteOffset, b.byteOffset + b.length),
    };
  };

describe('the part declaration', () => {
  test('an immutable, digest-carrying URL is accepted', () => {
    expect(parts.partProblems(part('a', 'hello'))).toEqual([]);
  });
  test('a URL with a query, an origin or no digest prefix is refused', () => {
    const p = part('a', 'hello');
    for (const url of [
      `${p.url}?v=2`,
      `https://x.test${p.url}`,
      '/parts/a.bin',
    ])
      expect(parts.partProblems({ ...p, url }).length).toBeGreaterThan(0);
    expect(parts.partProblems({ ...p, sha256: 'xyz' }).length).toBeGreaterThan(
      0
    );
    expect(parts.partProblems({ ...p, bytes: 0 }).length).toBeGreaterThan(0);
  });
});

describe('fetching parts', () => {
  const p1 = part('one', 'first part');
  const p2 = part('two', 'second part, longer');
  const files = { [p1.url]: 'first part', [p2.url]: 'second part, longer' };

  test('a verified part is stored, and a second ask fetches nothing', async () => {
    const caches = fakeCaches();
    const log = [];
    const env = { caches, fetch: server(files, log) };
    expect(await parts.ensurePart(p1, env)).toBe('fetched');
    expect(await parts.ensurePart(p1, env)).toBe('cached');
    expect(log).toHaveLength(1);
  });

  test('corrupted or short bytes are never stored', async () => {
    const caches = fakeCaches();
    const bad = server({ [p1.url]: 'first PART' });
    await expect(parts.ensurePart(p1, { caches, fetch: bad })).rejects.toThrow(
      /digest/
    );
    const short = server({ [p1.url]: 'first' });
    await expect(
      parts.ensurePart(p1, { caches, fetch: short })
    ).rejects.toThrow(/bytes/);
    expect((await caches.open(parts.PARTS_CACHE)).m.size).toBe(0);
  });

  test('the estimate counts only what is missing and says whether it fits', async () => {
    const caches = fakeCaches();
    await parts.ensurePart(p1, { caches, fetch: server(files) });
    const storage = { estimate: async () => ({ quota: 100, usage: 90 }) };
    const e = await parts.estimate([p1, p2], { caches, storage });
    expect(e).toMatchObject({ bytes: p2.bytes, missing: 1, fits: false });
    expect(
      (await parts.estimate([p1], { caches, storage: {} })).fits
    ).toBeNull();
  });

  test('a download cut short is recovered on the next open, fetching only what is missing', async () => {
    const caches = fakeCaches();
    // First open: the network dies after part one.
    const first = await parts.makeAvailableOffline('set', [p1, p2], {
      caches,
      fetch: server({ [p1.url]: 'first part' }),
    });
    expect(first.done).toEqual(['one']);
    expect(first.failed.map(f => f.id)).toEqual(['two']);
    // Next open: recover() finishes it and does not refetch part one.
    const log = [];
    const out = await parts.recover(id => (id === 'set' ? [p1, p2] : null), {
      caches,
      fetch: server(files, log),
    });
    expect(out[0].failed).toEqual([]);
    expect(log).toEqual([p2.url]);
  });

  test('a request for a dataset that no longer exists is dropped', async () => {
    const caches = fakeCaches();
    await parts.makeAvailableOffline('gone', [p1], {
      caches,
      fetch: server(files),
    });
    expect(
      await parts.recover(() => null, { caches, fetch: server(files) })
    ).toEqual([]);
    expect((await caches.open(parts.PARTS_CACHE)).m.size).toBe(1);
  });

  test('removing a dataset keeps the parts another dataset shares', async () => {
    const caches = fakeCaches();
    const env = { caches, fetch: server(files) };
    await parts.makeAvailableOffline('a', [p1, p2], env);
    await parts.remove('a', [p1, p2], [p2], { caches });
    const keys = [...(await caches.open(parts.PARTS_CACHE)).m.keys()].map(
      k => new URL(k).pathname
    );
    expect(keys).toEqual([new URL(p2.url, 'http://x/').pathname]);
  });
});

describe('the worker and the parts cache', () => {
  function worker(caches, networkOffline = true) {
    const listeners = {};
    const ctx = {
      console: { info() {}, warn() {} },
      URL,
      Response: class {
        constructor(body, init = {}) {
          Object.assign(this, { body, ...init });
        }
        static error() {
          return new ctx.Response('', { status: 0 });
        }
      },
      Request: class {
        constructor(url) {
          this.url = url;
        }
      },
      caches,
      clients: { claim: async () => {} },
      fetch: async () => {
        if (networkOffline) throw new Error('offline');
        return {
          ok: true,
          status: 200,
          type: 'basic',
          clone() {
            return this;
          },
        };
      },
    };
    ctx.self = Object.assign(ctx, {
      location: {
        href: 'http://localhost/',
        origin: 'http://localhost',
      },
      registration: { scope: 'http://localhost/' },
      addEventListener: (t, f) => (listeners[t] = f),
      __GRAVITAS_CACHE_VERSION: 'gravitas-v2',
      __GRAVITAS_PRECACHE_CORE: [],
      __GRAVITAS_PRECACHE_OPTIONAL: [],
      __GRAVITAS_PRECACHE_IDLE: [],
      __GRAVITAS_PRECACHE: [],
    });
    vm.runInNewContext(
      read('sw.js').replace(/importScripts\([^)]*\);/, ''),
      ctx
    );
    return listeners;
  }
  const wait = async (listeners, type, event) => {
    const waits = [];
    listeners[type]({ ...event, waitUntil: p => waits.push(p) });
    await Promise.all(waits);
  };

  test('activating a new version deletes old caches but keeps the parts', async () => {
    const caches = fakeCaches();
    for (const n of ['gravitas-v1', 'gravitas-v2', parts.PARTS_CACHE])
      await caches.open(n);
    await wait(worker(caches), 'activate', {});
    expect([...(await caches.keys())].sort()).toEqual([
      'gravitas-parts',
      'gravitas-v2',
    ]);
  });

  test('a part the reader kept answers its own URL with the network gone', async () => {
    const caches = fakeCaches();
    const p = part('one', 'first part');
    await parts.ensurePart(p, {
      caches,
      fetch: server({ [p.url]: 'first part' }),
    });
    let answer;
    const l = worker(caches);
    l.fetch({
      request: {
        method: 'GET',
        url: `http://localhost${p.url}`,
        mode: 'cors',
        headers: new Map(),
      },
      respondWith: pr => (answer = pr),
      waitUntil() {},
    });
    const r = await answer;
    expect(r).toBeDefined();
    expect(r.status === 504).toBe(false);
  });
});

describe('the archive cache makes room', () => {
  const answer = (n, usedAt) => ({ bytes: new Uint8Array(n), usedAt });

  test('the least recently used answers go first, until the rest fits', () => {
    const rows = [
      { key: 'old', usedMs: 1, size: 40 },
      { key: 'new', usedMs: 9, size: 40 },
      { key: 'mid', usedMs: 5, size: 40 },
    ];
    expect(archive.victims(rows, { maxBytes: 80, maxEntries: 10 })).toEqual([
      'old',
    ]);
    expect(archive.victims(rows, { maxBytes: 1000, maxEntries: 1 })).toEqual([
      'old',
      'mid',
    ]);
    expect(archive.victims(rows, { maxBytes: 1000, maxEntries: 10 })).toEqual(
      []
    );
  });

  test('reading an answer protects it; the unread one is evicted', async () => {
    let t = 0;
    const store = archive.memoryStore(
      { maxBytes: 250, maxEntries: 10 },
      () => ++t
    );
    await store.set('a', answer(100));
    await store.set('b', answer(100));
    await store.get('a');
    await store.set('c', answer(100));
    expect(await store.get('b')).toBeUndefined();
    expect(await store.get('a')).toBeDefined();
    expect(await store.get('c')).toBeDefined();
    expect((await store.usage()).entries).toBe(2);
  });

  test('clearing is the reader’s say, and it leaves nothing', async () => {
    const store = archive.memoryStore();
    await store.set('a', answer(10));
    await store.clear();
    expect(await store.usage()).toEqual({ entries: 0, bytes: 0 });
  });

  test('the archive cache holds no student work', () => {
    expect(read('js/archive/cache.js')).not.toMatch(
      /gravitas_(assignment|progress|response)/
    );
  });
});
