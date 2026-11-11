// =============================================================================
// The footprint ceiling, and what is evicted when a store reaches it (Prompt 284)
// -----------------------------------------------------------------------------
// tools/data-budget.json commits a ceiling for what IndexedDB and Cache Storage
// hold together (indexedDbAndCacheBytes, 200 MiB: Prompt 133, measured by the
// worker probe of Prompt 153). Three things hold it:
//
//   - the precache is a known size, so the room left for the reader's own
//     parts and the archive is arithmetic, not a hope;
//   - the archive's cached answers are evicted least recently used at their own
//     cap, however many are offered, so the one growing store cannot reach the
//     ceiling by itself;
//   - what can be evicted is exactly what STORAGE.md's matrix calls evictable:
//     no durable record of a student's lives in a store the eviction reaches.
// =============================================================================
import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

import { readDataBudget } from '../tools/data-budget.mjs';
import { OWNERSHIP, matrix } from '../tools/storage-matrix.mjs';

const { LIMITS, memoryStore, victims } = await import('../js/archive/cache.js');
const { LARGE_PART_BYTES } = await import('../js/offlineParts.js');

const ROOT = path.resolve(import.meta.dirname, '..');
const read = rel => readFileSync(path.join(ROOT, rel), 'utf8');
const MiB = 1048576;
const ceiling = readDataBudget().ceilings.find(
  c => c.key === 'indexedDbAndCacheBytes'
).ceiling;

const manifest = () => {
  const ctx = { self: {} };
  ctx.self = ctx;
  vm.runInNewContext(read('sw-manifest.js'), ctx);
  return ctx;
};

describe('the arithmetic under the ceiling', () => {
  test('the precache and a full archive leave room for at least one large part and a margin', () => {
    const precache = manifest().__GRAVITAS_PRECACHE_BYTES;
    const room = ceiling - precache - LIMITS.maxBytes;
    // The precache is stored uncompressed in Cache Storage, so its raw size is
    // the figure; the archive's cap is the most the one growing store holds.
    expect(precache).toBeGreaterThan(10 * MiB);
    expect(room).toBeGreaterThanOrEqual(2 * LARGE_PART_BYTES);
    // Stated in OFFLINE_AND_LOW_END.md for the reader of the table.
    expect(Math.floor(room / MiB)).toBeGreaterThan(64);
  });

  test('the archive cap is itself under the ceiling, by a margin', () => {
    expect(LIMITS.maxBytes).toBeLessThan(ceiling / 2);
  });
});

describe('eviction at the ceiling', () => {
  // An answer that is `n` bytes to the eviction code without allocating them.
  const answer = n => ({ bytes: { byteLength: n } });

  test('offering the whole ceiling to the archive leaves it at its own cap, newest kept', async () => {
    let t = 0;
    const store = memoryStore(LIMITS, () => ++t);
    const n = ceiling / MiB; // 1 MiB answers, one ceiling's worth
    for (let i = 0; i < n; i++) await store.set(`q${i}`, answer(MiB));
    const { entries, bytes } = await store.usage();
    expect(bytes).toBeLessThanOrEqual(LIMITS.maxBytes);
    expect(entries).toBeLessThanOrEqual(LIMITS.maxEntries);
    expect(entries).toBe(LIMITS.maxBytes / MiB);
    // The survivors are the most recent ones; the first were evicted.
    expect(await store.get('q0')).toBeUndefined();
    expect(await store.get(`q${n - 1}`)).toBeDefined();
    expect(await store.get(`q${n - entries}`)).toBeDefined();
    expect(await store.get(`q${n - entries - 1}`)).toBeUndefined();
  });

  test('many small answers are held to the entry cap, not the byte cap', async () => {
    const store = memoryStore(LIMITS, () => 0);
    for (let i = 0; i < LIMITS.maxEntries + 50; i++)
      await store.set(`s${i}`, answer(1000));
    expect((await store.usage()).entries).toBe(LIMITS.maxEntries);
  });

  test('a row an older build wrote, with no use time, goes first', () => {
    const rows = [
      { key: 'legacy', usedMs: 0, size: 30 },
      { key: 'fresh', usedMs: 100, size: 30 },
    ];
    expect(victims(rows, { maxBytes: 40, maxEntries: 10 })).toEqual(['legacy']);
  });
});

describe('no durable record is in a store eviction reaches', () => {
  const reached = /IndexedDB gravitas-(archive|catalog)|Cache Storage/;

  test('every row in those stores is evictable, and none that is durable is in them', async () => {
    const rows = [
      ...(await matrix()).map(r => ({ where: r.prefix, export: r.export })),
      ...OWNERSHIP.others.map(r => ({ where: r.where, export: r.export })),
    ];
    const inReached = rows.filter(r => reached.test(r.where));
    expect(inReached.length).toBeGreaterThanOrEqual(3);
    for (const r of inReached)
      expect([r.where, r.export]).toEqual([r.where, 'evictable']);
    for (const r of rows.filter(r => r.export === 'durable'))
      expect([r.where, reached.test(r.where)]).toEqual([r.where, false]);
  });

  test('the eviction code names only its own database and its own object store', () => {
    const src = read('js/archive/cache.js');
    expect(src).toMatch(/KEY_DB_ARCHIVE/);
    // Every transaction is on 'answers'; nothing opens another database.
    expect(
      [...src.matchAll(/transaction\('([a-z]+)'/g)].map(m => m[1])
    ).toEqual(['answers', 'answers']);
    expect(src.match(/indexedDB\.open\(/g)).toHaveLength(1);
    expect(src).not.toMatch(/localStorage|sessionStorage|caches\./);
  });

  test('the worker deletes only older builds of its own cache, and keeps the parts', () => {
    const sw = read('sw.js');
    expect(sw).toMatch(/CACHE_PARTS|gravitas-parts/);
    expect(sw).not.toMatch(/localStorage/);
  });
});
