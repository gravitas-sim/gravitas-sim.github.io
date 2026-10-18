// =============================================================================
// The install tier is small, whole and enough to boot; the idle tier is the rest
// -----------------------------------------------------------------------------
// Prompt 147. The first-visit install is what a reader waits for and what
// decides whether a version activates, so it has a ceiling that holds in every
// budget-policy mode (the data budget only reports while the mode is "exact").
// The main app must start from that tier alone, because the idle tier arrives
// afterwards, and the worker's idle handler must fetch only what is missing and
// survive a file that cannot be fetched.
// =============================================================================
import { describe, test, expect } from '@jest/globals';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { URL } from 'node:url';
import vm from 'node:vm';

import { measure, readDataBudget } from '../tools/data-budget.mjs';
import { idleGroupOf, IDLE_TIER } from '../tools/build-service-worker.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = rel => readFileSync(path.join(ROOT, rel), 'utf8');

function lists() {
  const ctx = { self: {} };
  ctx.self = ctx;
  vm.runInNewContext(read('sw-manifest.js'), ctx);
  const strip = a => a.map(p => p.replace(/^\.\//, ''));
  return {
    core: strip(ctx.__GRAVITAS_PRECACHE_CORE),
    optional: strip(ctx.__GRAVITAS_PRECACHE_OPTIONAL),
    idle: strip(ctx.__GRAVITAS_PRECACHE_IDLE),
    all: strip(ctx.__GRAVITAS_PRECACHE),
  };
}

describe('the precache tiers', () => {
  test('the first-visit install stays under its ceiling, in any policy mode', () => {
    const ceiling = readDataBudget().ceilings.find(
      c => c.key === 'precacheFirstVisitGzipBytes'
    ).ceiling;
    expect(measure().precacheFirstVisitGzipBytes).toBeLessThanOrEqual(ceiling);
  });

  test('the idle tier stays under its ceiling', () => {
    const ceiling = readDataBudget().ceilings.find(
      c => c.key === 'precacheIdleGzipBytes'
    ).ceiling;
    expect(measure().precacheIdleGzipBytes).toBeLessThanOrEqual(ceiling);
  });

  test('the tiers are disjoint and together are the whole precache', () => {
    const { core, optional, idle, all } = lists();
    const seen = new Set();
    for (const p of [...core, ...optional, ...idle]) {
      expect(`${p}:${seen.has(p)}`).toBe(`${p}:false`);
      seen.add(p);
    }
    expect([...seen].sort()).toEqual([...all].sort());
  });

  test('every idle file matches a rule and every rule has a file', () => {
    const { idle, core, optional } = lists();
    for (const p of idle)
      expect(`${p}:${idleGroupOf(p)}`).not.toMatch(/:null$/);
    for (const p of [...core, ...optional])
      expect(`${p}:${idleGroupOf(p)}`).toBe(`${p}:null`);
    for (const [group] of IDLE_TIER)
      expect(`${group}:${idle.some(p => idleGroupOf(p) === group)}`).toBe(
        `${group}:true`
      );
  });

  test('the main app boots from the install tier: no static import reaches the idle tier', () => {
    const { idle } = lists();
    const idleSet = new Set(idle);
    const seen = new Set();
    const walk = rel => {
      if (seen.has(rel) || !existsSync(path.join(ROOT, rel))) return;
      seen.add(rel);
      const src = read(rel);
      for (const m of src.matchAll(
        /^\s*(?:import|export)\s[^'"]*?from\s*['"](\.[^'"]+)['"]|^\s*import\s*['"](\.[^'"]+)['"]/gm
      )) {
        walk(
          path.posix.normalize(
            path.posix.join(path.posix.dirname(rel), m[1] ?? m[2])
          )
        );
      }
    };
    walk('js/main.js');
    expect(seen.size).toBeGreaterThan(50);
    expect([...seen].filter(p => idleSet.has(p))).toEqual([]);
  });
});

describe('the worker’s idle handler', () => {
  function worker({ cached = [], failing = [] } = {}) {
    const store = new Map(cached.map(u => [u, true]));
    const fetched = [];
    const listeners = {};
    const self = {
      location: { href: 'https://example.test/' },
      addEventListener: (t, f) => (listeners[t] = f),
      importScripts: () => {},
      __GRAVITAS_CACHE_VERSION: 'v-test',
      __GRAVITAS_PRECACHE_CORE: ['./a.js'],
      __GRAVITAS_PRECACHE_OPTIONAL: [],
      __GRAVITAS_PRECACHE_IDLE: ['./i1.js', './i2.js', './i3.js'],
      __GRAVITAS_PRECACHE: ['./a.js', './i1.js', './i2.js', './i3.js'],
    };
    const cache = {
      put: async (u, r) =>
        void store.set(new URL(u, self.location.href).href, r),
      keys: async () => [...store.keys()].map(url => ({ url })),
    };
    const ctx = {
      self,
      console: { info() {}, warn() {}, log() {} },
      URL,
      Request: class {
        constructor(url) {
          this.url = url;
        }
      },
      caches: { open: async () => cache, delete: async () => true },
      fetch: async req => {
        fetched.push(req.url);
        const bad = failing.some(f => req.url.endsWith(f));
        return { ok: !bad, status: bad ? 404 : 200 };
      },
      importScripts: () => {},
    };
    ctx.globalThis = ctx;
    Object.assign(ctx, self);
    vm.runInNewContext(
      read('sw.js').replace(/importScripts\([^)]*\);/, ''),
      Object.assign(ctx, { self: Object.assign(ctx, self) })
    );
    return { fetched, store, listeners };
  }

  const send = async (w, data) => {
    const waits = [];
    w.listeners.message({ data, waitUntil: p => waits.push(p), ports: [] });
    await Promise.all(waits);
  };

  test('fetches the idle files the cache lacks, and only those', async () => {
    const w = worker({ cached: ['https://example.test/i2.js'] });
    await send(w, { type: 'install-idle' });
    expect(w.fetched.map(u => u.split('/').pop()).sort()).toEqual([
      'i1.js',
      'i3.js',
    ]);
  });

  test('a second run fetches nothing', async () => {
    const w = worker();
    await send(w, { type: 'install-idle' });
    const first = w.fetched.length;
    await send(w, { type: 'install-idle' });
    expect(`${first}:${w.fetched.length}`).toBe('3:3');
  });

  test('a file that cannot be fetched is skipped and fetched again next time', async () => {
    const w = worker({ failing: ['i2.js'] });
    await send(w, { type: 'install-idle' });
    expect([...w.store.keys()].map(u => u.split('/').pop()).sort()).toEqual([
      'i1.js',
      'i3.js',
    ]);
    await send(w, { type: 'install-idle' });
    expect(w.fetched.filter(u => u.endsWith('i2.js')).length).toBe(2);
  });

  test('the page asks for the idle tier on idle, and not when the device asks for less data', () => {
    const src = read('js/offline.js');
    expect(src).toMatch(/type: 'install-idle'/);
    expect(src).toMatch(/navigator\.connection\?\.saveData/);
    expect(src).toMatch(/requestIdleCallback/);
  });
});
