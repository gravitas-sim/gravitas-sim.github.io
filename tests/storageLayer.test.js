// =============================================================================
// js/storage/: the one storage module (Roadmap II Prompt 65, step 2)
// -----------------------------------------------------------------------------
// jsdom has globalThis.localStorage and no IndexedDB, which is itself the first case: the
// store falls back and says so. The IndexedDB backend, and change events
// between tabs, are exercised in a real browser by e2e/storageLayer.spec.js.
// =============================================================================

import { describe, test, expect, beforeEach } from '@jest/globals';

import {
  COLLECTIONS,
  EXPORT_FORMAT,
  LOCAL_PREFIX,
  RESERVE_BYTES,
  Store,
  localBackend,
  memoryBackend,
  openStore,
  reserveFor,
  sizeOf,
} from '../js/storage/index.js';
import { readJson, writeJson } from '../js/storage/local.js';

const memoryStore = (estimate = () => null) =>
  new Store(memoryBackend(), { estimate, channel: null });

beforeEach(() => globalThis.localStorage.clear());

describe('choosing a backend', () => {
  test('without IndexedDB it falls back to globalThis.localStorage, and says why', async () => {
    const store = await openStore({ channel: null });
    expect(store.mode).toBe('local');
    expect(store.fallback.persistent).toBe(true);
    expect(store.fallback.reasons.join()).toMatch(/IndexedDB/);
    store.close();
  });

  test('with storage blocked it keeps work in memory, and announces that it will not survive', async () => {
    const real = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new globalThis.DOMException('blocked', 'SecurityError');
      },
    });
    try {
      const store = await openStore({ channel: null });
      expect(store.mode).toBe('memory');
      expect(store.fallback).toMatchObject({
        mode: 'memory',
        persistent: false,
      });
      expect(store.fallback.reasons.length).toBe(2);
    } finally {
      Object.defineProperty(globalThis, 'localStorage', real);
    }
  });

  test('the globalThis.localStorage fallback writes only keys STORAGE.md lists', async () => {
    const store = new Store(localBackend(), { channel: null });
    await store.collection('drafts').put('lesson-a', { title: 'A' });
    const keys = Object.keys(globalThis.localStorage);
    expect(keys).toEqual([`${LOCAL_PREFIX}drafts:lesson-a`]);
  });
});

describe('a collection', () => {
  test('keeps a value, lists it, measures it and forgets it', async () => {
    const store = memoryStore();
    const drafts = store.collection('drafts');
    const value = { title: 'Orbits', steps: [1, 2, 3] };
    expect((await drafts.put('orbits', value)).ok).toBe(true);
    expect(await drafts.get('orbits')).toEqual(value);
    const [row] = await drafts.list();
    expect(row).toMatchObject({
      id: 'orbits',
      version: 1,
      bytes: sizeOf(value),
    });
    expect(await drafts.bytes()).toBe(sizeOf(value));
    await drafts.delete('orbits');
    expect(await drafts.get('orbits')).toBeNull();
    expect(await drafts.list()).toEqual([]);
  });

  test("a caller's later edits never reach what is stored", async () => {
    const drafts = memoryStore().collection('drafts');
    const value = { list: [1] };
    await drafts.put('x', value);
    value.list.push(2);
    const got = await drafts.get('x');
    got.list.push(3);
    expect(await drafts.get('x')).toEqual({ list: [1] });
  });

  test('refuses an unknown collection and a record with no name', async () => {
    const store = memoryStore();
    expect(() => store.collection('everything')).toThrow(/no collection/);
    expect((await store.collection('drafts').put('', {})).reason).toBe('id');
  });

  test('every collection of the student data model has a policy', () => {
    expect(Object.keys(COLLECTIONS).sort()).toEqual(
      [
        'assignments',
        'courses',
        'drafts',
        'evidence',
        'experiments',
        'installs',
        'preferences',
        'settings',
        'progress',
      ].sort()
    );
    for (const p of Object.values(COLLECTIONS)) {
      expect(p.item).toBeLessThanOrEqual(p.total);
    }
    // The experiment store's own limits (js/experiments/store.js LIMITS).
    expect(COLLECTIONS.experiments).toEqual({
      item: 512 * 1024,
      total: 2 * 1024 * 1024,
    });
  });
});

describe('size policies and the quota', () => {
  test('a record over its collection’s item limit is refused, with its size', async () => {
    const prefs = memoryStore().collection('preferences');
    const big = { text: 'x'.repeat(COLLECTIONS.preferences.item) };
    const r = await prefs.put('theme', big);
    expect(r).toMatchObject({ ok: false, reason: 'itemTooLarge' });
    expect(r.vars.bytes).toBe(sizeOf(big));
    expect(await prefs.get('theme')).toBeNull();
  });

  test('a collection is refused a record that would take it past its total, but may replace one', async () => {
    const prefs = memoryStore().collection('preferences');
    const chunk = { text: 'x'.repeat(60 * 1024) };
    for (const id of ['a', 'b', 'c', 'd']) {
      expect((await prefs.put(id, chunk)).ok).toBe(true);
    }
    expect((await prefs.put('e', chunk)).reason).toBe('collectionFull');
    // Replacing a record counts what it frees.
    expect((await prefs.put('d', chunk)).ok).toBe(true);
  });

  test('a write that would eat into the reserve is refused, with what is left', async () => {
    const quota = 100 * 1024 * 1024;
    const reserve = reserveFor(quota);
    const drafts = memoryStore(async () => ({
      quota,
      usage: quota - reserve - 1000,
    })).collection('drafts');
    expect((await drafts.put('small', { t: 'x'.repeat(100) })).ok).toBe(true);
    const r = await drafts.put('large', { t: 'x'.repeat(5000) });
    expect(r).toMatchObject({ ok: false, reason: 'quota' });
    expect(r.vars.reserve).toBe(reserve);
  });

  test('the reserve is 5 MiB or a tenth of the quota, whichever is more', () => {
    expect(reserveFor(10 * 1024 * 1024)).toBe(RESERVE_BYTES);
    expect(reserveFor(1024 * 1024 * 1024)).toBe(
      Math.floor((1024 * 1024 * 1024) / 10)
    );
  });

  test('with no estimate the policies still hold and the write goes through', async () => {
    const store = memoryStore(async () => {
      throw new Error('no storage manager');
    });
    expect(await store.estimate()).toMatchObject({ known: false });
    expect((await store.collection('drafts').put('a', { t: 1 })).ok).toBe(true);
  });

  test('when the browser refuses the write anyway, the reason is the quota', async () => {
    const backend = memoryBackend();
    backend.put = async () => {
      throw new globalThis.DOMException('full', 'QuotaExceededError');
    };
    const store = new Store(backend, { channel: null });
    expect(await store.collection('drafts').put('a', { t: 1 })).toMatchObject({
      ok: false,
      reason: 'quota',
    });
  });
});

describe('versions and migrations', () => {
  test('an older record is read through the collection’s migrations; a newer one is refused, not guessed at', async () => {
    const backend = memoryBackend();
    const store = new Store(backend, { channel: null });
    await store.collection('progress').put('kepler', { answers: ['a'] });
    const v2 = store.collection('progress', {
      current: 2,
      migrations: {
        1: v => ({
          ...v,
          schema: 2,
          answers: v.answers.map(a => ({ text: a })),
        }),
      },
    });
    expect(await v2.get('kepler')).toEqual({
      schema: 2,
      answers: [{ text: 'a' }],
    });
    const read = await v2.read('kepler');
    expect(read).toMatchObject({ ok: true, migrated: true });

    await v2.put('newer', { schema: 2 });
    const v1 = store.collection('progress');
    expect(await v1.get('newer')).toBeNull();
    expect(await v1.read('newer')).toMatchObject({
      ok: false,
      reason: 'newer',
    });
  });
});

describe('the change event', () => {
  test('fires for a write and a delete, with the collection and the name', async () => {
    const store = memoryStore();
    const seen = [];
    store.addEventListener('change', e => seen.push(e.detail));
    const drafts = store.collection('drafts');
    await drafts.put('a', { t: 1 });
    await drafts.delete('a');
    expect(seen).toEqual([
      { collection: 'drafts', id: 'a', op: 'put', remote: false },
      { collection: 'drafts', id: 'a', op: 'delete', remote: false },
    ]);
  });
});

describe('export and import', () => {
  const seed = async store => {
    await store.collection('drafts').put('orbits', { title: 'Orbits' });
    await store.collection('preferences').put('units', { system: 'physical' });
    await store
      .collection('evidence')
      .put('entry-1', { kind: 'measurement', v: 3.2 });
  };

  test('everything goes into one versioned file, and comes back the same', async () => {
    const a = memoryStore();
    await seed(a);
    const file = await a.exportAll();
    expect(file).toMatchObject({ format: EXPORT_FORMAT, formatVersion: 1 });
    expect(Object.keys(file.collections).sort()).toEqual([
      'drafts',
      'evidence',
      'preferences',
    ]);

    const b = memoryStore();
    const r = await b.importAll(JSON.parse(JSON.stringify(file)));
    expect(r.ok).toBe(true);
    expect(r.plan.every(s => s.action === 'add')).toBe(true);
    const again = await b.exportAll();
    expect(again.collections).toEqual(
      file.collections.constructor === Object
        ? stripSaved(file.collections, again.collections)
        : null
    );
  });

  test('a dry run says what would happen and changes nothing', async () => {
    const a = memoryStore();
    await seed(a);
    const file = await a.exportAll();
    const b = memoryStore();
    const r = await b.importAll(file, { dryRun: true });
    expect(r.applied).toBe(false);
    expect(r.plan.map(s => s.action)).toEqual(['add', 'add', 'add']);
    expect((await b.exportAll()).collections).toEqual({});
  });

  test('a name already taken: keep both renames, replace overwrites, skip leaves it; an identical record is left alone', async () => {
    const source = memoryStore();
    await source.collection('drafts').put('orbits', { title: 'From the file' });
    await source.collection('drafts').put('same', { title: 'Same' });
    const file = await source.exportAll();

    const target = async () => {
      const t = memoryStore();
      await t.collection('drafts').put('orbits', { title: 'Mine' });
      await t.collection('drafts').put('same', { title: 'Same' });
      return t;
    };

    const both = await target();
    const kb = await both.importAll(file, { mode: 'keep-both' });
    expect(kb.plan).toEqual([
      {
        collection: 'drafts',
        id: 'orbits',
        action: 'rename',
        as: 'orbits (2)',
      },
      { collection: 'drafts', id: 'same', action: 'same' },
    ]);
    expect(await both.collection('drafts').get('orbits')).toEqual({
      title: 'Mine',
    });
    expect(await both.collection('drafts').get('orbits (2)')).toEqual({
      title: 'From the file',
    });

    const rep = await target();
    await rep.importAll(file, { mode: 'replace' });
    expect(await rep.collection('drafts').get('orbits')).toEqual({
      title: 'From the file',
    });

    const skip = await target();
    const sk = await skip.importAll(file, { mode: 'skip' });
    expect(sk.plan[0]).toMatchObject({ action: 'skip', reason: 'exists' });
    expect(await skip.collection('drafts').get('orbits')).toEqual({
      title: 'Mine',
    });
  });

  test('refuses a file that is not an export, or is from a newer Gravitas, and skips what it cannot place', async () => {
    const store = memoryStore();
    expect(
      (await store.importAll({ format: 'gravitas.notebook', formatVersion: 1 }))
        .reason
    ).toBe('format');
    expect(
      (
        await store.importAll({
          format: EXPORT_FORMAT,
          formatVersion: 9,
          collections: {},
        })
      ).reason
    ).toBe('newer');
    expect(
      (
        await store.importAll(
          { format: EXPORT_FORMAT, formatVersion: 1, collections: {} },
          { mode: 'merge' }
        )
      ).reason
    ).toBe('mode');
    const r = await store.importAll({
      format: EXPORT_FORMAT,
      formatVersion: 1,
      collections: {
        everything: [{ id: 'x', version: 1, value: {} }],
        drafts: [{ id: 'ok', version: 1, value: { a: 1 } }, { id: 7 }],
      },
    });
    expect(r.plan).toEqual([
      {
        collection: 'everything',
        id: 'x',
        action: 'skip',
        reason: 'unknownCollection',
      },
      { collection: 'drafts', id: 'ok', action: 'add' },
      { collection: 'drafts', id: '7', action: 'skip', reason: 'malformed' },
    ]);
  });

  test('an imported record keeps its version, and is migrated when read', async () => {
    const store = memoryStore();
    await store.importAll({
      format: EXPORT_FORMAT,
      formatVersion: 1,
      collections: { progress: [{ id: 'k', version: 1, value: { n: 1 } }] },
    });
    const v2 = store.collection('progress', {
      current: 2,
      migrations: { 1: v => ({ n: v.n + 1 }) },
    });
    expect(await v2.get('k')).toEqual({ n: 2 });
  });

  test('delete-all removes every collection', async () => {
    const store = memoryStore();
    await seed(store);
    await store.deleteAll();
    expect((await store.exportAll()).collections).toEqual({});
  });
});

/** The collections as exported, with each record's save time from `after`. */
function stripSaved(before, after) {
  const out = {};
  for (const [name, recs] of Object.entries(before)) {
    out[name] = recs.map((r, i) => ({ ...r, saved: after[name][i].saved }));
  }
  return out;
}

// The one-key helper the existing writers moved onto: same key, same text.
describe('readJson and writeJson', () => {
  const fake = (over = {}) => {
    const data = new Map();
    return {
      getItem: k => (data.has(k) ? data.get(k) : null),
      setItem: (k, v) => data.set(k, v),
      data,
      ...over,
    };
  };

  test('write stores plain JSON text under the key, and read returns it', () => {
    const s = fake();
    expect(writeJson('k', { a: [1, 2] }, s)).toBe(true);
    expect(s.data.get('k')).toBe('{"a":[1,2]}');
    expect(readJson('k', null, s)).toEqual({ a: [1, 2] });
  });

  test('a value an older build wrote is read unchanged', () => {
    const s = fake();
    s.setItem('k', '["a","b"]');
    expect(readJson('k', [], s)).toEqual(['a', 'b']);
  });

  test('absent, damaged, empty and literal null all give the fallback', () => {
    const s = fake();
    expect(readJson('k', {}, s)).toEqual({});
    for (const text of ['{oops', '', 'null']) {
      s.setItem('k', text);
      expect(readJson('k', { d: 1 }, s)).toEqual({ d: 1 });
    }
    expect(readJson('k', undefined, s)).toBeNull();
  });

  test('a store that throws, on a read or a full-quota write, is not fatal', () => {
    const s = fake({
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new DOMException('full', 'QuotaExceededError');
      },
    });
    expect(readJson('k', 7, s)).toBe(7);
    expect(writeJson('k', 1, s)).toBe(false);
  });

  test('with no store given it uses the page localStorage', () => {
    localStorage.clear();
    expect(writeJson('gravitas_t', { n: 1 })).toBe(true);
    expect(localStorage.getItem('gravitas_t')).toBe('{"n":1}');
    expect(readJson('gravitas_t', {})).toEqual({ n: 1 });
    localStorage.clear();
  });
});
