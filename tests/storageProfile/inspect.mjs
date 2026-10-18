// =============================================================================
// Open a captured profile on one tree and say what it holds
// -----------------------------------------------------------------------------
//   node tests/storageProfile/inspect.mjs <tree> <profile.json> [dump.json]
//
// <tree> is a directory holding js/ (the repository, or the 2.0.0 tag's js/
// unpacked by tests/compat/harness.js). The profile is localStorage as text,
// the contents of the IndexedDB databases and a Cache Storage snapshot. Prints
// one line of JSON: what My work lists, each lesson's progress as the engine
// reads it, the saved experiments, the notebook, the installed packages, the
// archive's cached answers, and whether an export imported into an empty
// profile reproduces every key a backup file carries.
//
// The same script runs against both trees, so a difference in what it prints
// is a difference in the code (tests/storageProfile.test.js). With a dump file
// it also writes the profile the import made, so the 2.0.0 reader can open what
// this tree wrote.
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { fakeIndexedDB, loadSnapshot } from './fakeIdb.mjs';

const [tree, profileFile, dumpFile] = process.argv.slice(2);
const load = rel => import(pathToFileURL(path.join(tree, rel)).href);
const profile = JSON.parse(readFileSync(profileFile, 'utf8'));

class FakeStorage {
  constructor(entries = {}) {
    this.map = new Map(Object.entries(entries));
  }
  get length() {
    return this.map.size;
  }
  key(i) {
    return [...this.map.keys()][i] ?? null;
  }
  getItem(k) {
    return this.map.has(k) ? this.map.get(k) : null;
  }
  setItem(k, v) {
    this.map.set(k, String(v));
  }
  removeItem(k) {
    this.map.delete(k);
  }
  entries() {
    return Object.fromEntries(this.map);
  }
}

const storage = new FakeStorage(profile.localStorage);
globalThis.localStorage = storage;
const idb = loadSnapshot(fakeIndexedDB(), profile.indexedDB);
globalThis.indexedDB = idb;

const out = {};
const step = async (name, fn) => {
  try {
    out[name] = await fn();
  } catch (error) {
    out[name] = { error: String(error?.message ?? error) };
  }
};

const sorted = v =>
  JSON.parse(
    JSON.stringify(v, (k, x) =>
      x && typeof x === 'object' && !Array.isArray(x)
        ? Object.fromEntries(
            Object.entries(x).sort(([a], [b]) => (a < b ? -1 : 1))
          )
        : x instanceof Set
          ? [...x].sort()
          : x
    )
  );

const index = await load('js/storage/index.js');
const store = index.openStudentStore({ storage });
const exported = await store.exportAll();

await step('myWork', async () => {
  const { flatten } = await load('js/myWork/transfer.js');
  const { describe } = await load('js/myWork/model.js');
  return sorted(describe(flatten(exported)));
});

await step('progress', async () => {
  const { getInvestigation } = await load('js/data/investigations.js');
  const { readProgress } = await load('js/investigations/progressSchema.js');
  const rows = [];
  for (const key of [...storage.map.keys()].sort()) {
    const m = key.match(/^gravitas_investigation_([a-z0-9-]+)$/);
    if (!m) continue;
    const lesson = await getInvestigation(m[1]);
    const r = readProgress(JSON.parse(storage.getItem(key)), lesson);
    rows.push({
      id: m[1],
      responses: Object.keys(r.responses).length,
      attempts: Object.keys(r.attempts).length,
      visited: r.visited.size,
      stepSid: r.stepSid,
      notes: r.notes,
      migrated: r.migrated,
    });
  }
  return rows;
});

await step('experiments', async () => {
  const exp = await load('js/experiments/store.js');
  exp.setBackend(storage);
  return exp.listExperiments().map(e => ({
    ...e,
    loads: Boolean(exp.loadExperiment(e.id)?.ok ?? exp.loadExperiment(e.id)),
  }));
});

await step('notebook', async () => {
  const nb = await load('js/notebook/store.js');
  nb.setBackend(storage);
  const r = nb.load();
  return { ok: r.ok, reason: r.reason, ids: r.entries.map(e => e.id) };
});

await step('installed', async () => {
  const cat = await load('js/catalog/store.js');
  const s = await cat.openStore({ indexedDB: idb });
  return (await s.list()).map(r => ({
    id: r.id,
    type: r.type,
    version: r.version,
    files: Object.keys(r.files ?? {}),
  }));
});

await step('archive', async () => {
  const cache = await load('js/archive/cache.js');
  const s = cache.idbStore('gravitas-archive');
  const rows = [];
  const answers =
    profile.indexedDB?.['gravitas-archive']?.stores?.answers?.rows ?? [];
  for (const { key } of answers) {
    const held = await s.get(key);
    rows.push({
      key,
      sha256: held?.sha256 ?? null,
      bytes: held?.bytes?.length ?? null,
    });
  }
  return rows;
});

await step('export', async () => {
  const fresh = new FakeStorage();
  const into = index.openStudentStore({ storage: fresh });
  const res = await into.importAll(JSON.parse(JSON.stringify(exported)), {
    mode: 'replace',
  });
  const carried = [...storage.map.keys()].filter(
    k => index.collectionOf(k) != null
  );
  const missing = [];
  const different = [];
  for (const k of carried.sort()) {
    const b = fresh.getItem(k);
    if (b === null) missing.push(k);
    else if (
      JSON.stringify(sorted(parse(storage.getItem(k)))) !==
      JSON.stringify(sorted(parse(b)))
    )
      different.push(k);
  }
  // What this tree wrote into the empty profile, for the 2.0.0 reader to open.
  if (dumpFile) {
    writeFileSync(
      dumpFile,
      JSON.stringify({
        localStorage: fresh.entries(),
        indexedDB: profile.indexedDB,
      })
    );
  }
  return {
    ok: res.ok,
    carried: carried.length,
    collections: Object.fromEntries(
      Object.entries(exported.collections).map(([c, l]) => [
        c,
        l.map(r => r.id).sort(),
      ])
    ),
    missing,
    different,
    extra: [...fresh.map.keys()].filter(k => !storage.map.has(k)),
  };
});

function parse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

console.log(JSON.stringify(out));
