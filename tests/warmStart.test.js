// =============================================================================
// What the worker asks the network, on a second visit (Prompt 313)
// -----------------------------------------------------------------------------
// sw.js is run here in a vm with a fake cache and a fake network, so the
// property under test is the worker's own behaviour and not a reading of its
// source. A second visit in Spanish used to send 127 requests past the browser's
// cache (the warm list, fetched again whole on every open); a hit on a
// translated lesson file the version holds was also revalidated.
// =============================================================================
/* global URL */
import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const SOURCE = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

/** The few parts of Request and Response the worker touches (Jest hides the real ones). */
class FakeRequest {
  constructor(url, init = {}) {
    this.url = new URL(
      typeof url === 'string' ? url : url.url,
      'https://x.test/'
    ).href;
    this.cache = init.cache;
  }
}
class FakeResponse {
  constructor(body) {
    this.body = body;
    this.ok = true;
    this.type = 'basic';
  }
  clone() {
    return this;
  }
}

/** Run the worker with a given manifest; returns what it did to the network. */
function boot({ precache, warm, cached }) {
  const listeners = {};
  const fetched = [];
  const store = new Map(
    cached.map(u => [new URL(u, 'https://x.test/').href, 'hit'])
  );
  const cache = {
    keys: async () => [...store.keys()].map(url => ({ url })),
    match: async req => {
      const url =
        typeof req === 'string'
          ? new URL(req, 'https://x.test/').href
          : req.url;
      return store.has(url) ? new FakeResponse('cached') : undefined;
    },
    put: async (req, res) => {
      const url =
        typeof req === 'string'
          ? new URL(req, 'https://x.test/').href
          : req.url;
      store.set(url, res);
    },
  };
  const sandbox = {
    self: null,
    importScripts: () => {},
    caches: {
      open: async () => cache,
      keys: async () => [],
      delete: async () => true,
      match: async () => undefined,
    },
    clients: { claim: async () => {} },
    console: { info() {}, warn() {} },
    URL,
    Request: FakeRequest,
    Response: FakeResponse,
    fetch: async req => {
      fetched.push(
        new URL(typeof req === 'string' ? req : req.url, 'https://x.test/')
          .pathname
      );
      return new FakeResponse('fresh');
    },
  };
  sandbox.self = {
    location: new URL('https://x.test/sw.js'),
    registration: { scope: 'https://x.test/' },
    addEventListener: (type, fn) => (listeners[type] = fn),
    __GRAVITAS_CACHE_VERSION: 'gravitas-test',
    __GRAVITAS_PRECACHE: precache,
    __GRAVITAS_PRECACHE_CORE: precache,
    __GRAVITAS_LOCALE_WARM: { es: warm },
    skipWaiting() {},
  };
  vm.runInNewContext(SOURCE, sandbox);
  const waits = [];
  const send = data =>
    listeners.message({ data, waitUntil: p => waits.push(p) });
  const get = async path => {
    const pending = [];
    let answer;
    listeners.fetch({
      request: {
        method: 'GET',
        url: `https://x.test${path}`,
        mode: 'cors',
        headers: { has: () => false },
      },
      respondWith: p => (answer = p),
      waitUntil: p => pending.push(p),
    });
    await answer;
    await Promise.all(pending);
  };
  return { fetched, send, get, waits };
}

const WARM = [
  './js/data/investigations/es/a.js',
  './js/data/investigations/es/b.js',
  './js/data/investigations/es/c.js',
];

describe('the worker on a second visit', () => {
  test('warming a locale fetches only the files the cache lacks', async () => {
    const w = boot({
      precache: ['./index.html'],
      warm: WARM,
      cached: [WARM[0], WARM[1]],
    });
    w.send({ type: 'warm-locale', locale: 'es' });
    await Promise.all(w.waits);
    expect(w.fetched).toEqual(['/js/data/investigations/es/c.js']);
  });

  test('warming a locale already held asks the network for nothing', async () => {
    const w = boot({ precache: ['./index.html'], warm: WARM, cached: WARM });
    w.send({ type: 'warm-locale', locale: 'es' });
    await Promise.all(w.waits);
    expect(w.fetched).toEqual([]);
  });

  test('a held translated lesson is served without a request', async () => {
    const w = boot({ precache: ['./index.html'], warm: WARM, cached: WARM });
    await w.get('/js/data/investigations/es/a.js');
    expect(w.fetched).toEqual([]);
  });

  test('a precached file is served without a request', async () => {
    const w = boot({
      precache: ['./js/a.js'],
      warm: WARM,
      cached: ['./js/a.js'],
    });
    await w.get('/js/a.js');
    expect(w.fetched).toEqual([]);
  });

  test('a held file that no list names is still refreshed in the background', async () => {
    const w = boot({
      precache: ['./js/a.js'],
      warm: WARM,
      cached: ['./js/other.js'],
    });
    await w.get('/js/other.js');
    expect(w.fetched).toEqual(['/js/other.js']);
  });
});
