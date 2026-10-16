import { describe, test, expect, beforeAll } from '@jest/globals';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { webcrypto } from 'node:crypto';
import { remixBuiltin } from '../js/composer/remixApi.js';
import { packApi } from '../js/composer/api.js';
import { readPackFragment } from '../js/composer/packLink.js';
import { compilePack, installedPack } from '../js/remix/open.js';
import { loadInvestigation } from '../js/data/investigations/registry.js';
import { SCENARIO_INFO, scenarioId } from '../js/data/scenarioInfo.js';
import { MANIFEST } from '../js/data/investigations/manifest.js';
import { ENTITIES } from '../js/lessonMarkup.js';
import { UNITS } from '../js/answerParse.js';
import { createMemoryStore } from '../js/catalog/store.js';
import { install, statusOf, InstallError } from '../js/catalog/install.js';
import { ARCHIVE_TYPES, archiveEntry } from '../tools/catalog.mjs';
import { remixLessonId } from '../js/platform/remix.js';
import { EN_REMIX } from '../js/i18n/en.remix.js';
import { ES_REMIX } from '../js/i18n/es.remix.js';

// =============================================================================
// Remix delivery (Prompt 78 (b)): a remix as a catalog package, installed into
// the browser's store and opened from there through the engine's loaders
// =============================================================================

// Jest's environment lacks the Web Crypto the archive reader checks with.
if (!globalThis.crypto?.subtle)
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
  });

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const clone = v => JSON.parse(JSON.stringify(v));
const facts = {
  ENTITIES,
  UNITS,
  scenarios: Object.keys(SCENARIO_INFO),
  scenarioId,
  lessons: MANIFEST.map(m => m.id),
  loadInvestigation,
};

/** An extension directory holding `pack`, archived as the catalog would. */
async function archived(pack) {
  const dir = mkdtempSync(path.join(tmpdir(), 'gx-remix-'));
  const id = `community.${pack.id}`;
  const file = (name, text) => {
    mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    writeFileSync(path.join(dir, name), text);
  };
  file(
    'gravitas-extension.json',
    JSON.stringify({
      format: 'gravitas.capability-package',
      formatVersion: 1,
      id,
      version: '1.0.0',
      kind: 'declarative',
      gravitas: '^1.0.0',
      title: { en: pack.title.en, es: pack.title.es },
      provides: {
        investigations: [{ id: pack.id, file: 'investigation.json' }],
      },
      assets: [
        { path: 'investigation.json', role: 'data', offline: 'optional' },
      ],
      citations: [],
      licenses: [{ scope: 'investigation.json', license: 'CC-BY-4.0' }],
      offline: { policy: 'precache' },
      validation: [{ check: 'registry:sdk-extensions' }],
      migrations: [],
    })
  );
  file('investigation.json', JSON.stringify(pack));
  const got = await archiveEntry({
    path: path.relative(REPO, dir),
    review: { date: '2026-10-09', checks: ['test'], notes: 'a fixture' },
  });
  return got;
}

let remix;
let built;
beforeAll(async () => {
  remix = (await remixBuiltin('tides', { id: 'my-tides-pack' })).pack;
  remix.steps[1].title = { en: 'Changed title', es: 'Título cambiado' };
  built = await archived(remix);
}, 120_000);

const fetchFrom = built_ => async () => new Uint8Array(built_.archive);
const ctxFor = (store, b) => ({
  catalog: { catalogVersion: '1.1.0', lessons: {}, locales: ['en', 'es'] },
  store,
  fetchBytes: fetchFrom(b),
  base: 'file:///',
});

describe('an investigation pack as a catalog package', () => {
  test('the catalog serves it, with its summary in both languages', () => {
    expect(ARCHIVE_TYPES).toContain('investigation-pack');
    expect(built.entry.type).toBe('investigation-pack');
    expect(built.entry.delivery).toBe('archive');
    expect(Object.keys(built.entry.summary).sort()).toEqual(['en', 'es']);
    expect(built.entry.provides.investigations[0].id).toBe('my-tides-pack');
  });

  test('installs whole into the store, and reads back as a pack', async () => {
    const store = createMemoryStore();
    expect(statusOf(built.entry, null)).toBe('available');
    const record = await install(built.entry, ctxFor(store, built));
    expect(record.type).toBe('investigation-pack');
    expect(statusOf(built.entry, await store.get(record.id))).toBe('installed');
    const got = await installedPack(record.id, store);
    expect(got.ok).toBe(true);
    expect(got.pack.derivedFrom.id).toBe('tides');
    expect(got.pack.steps[1].title.en).toBe('Changed title');
  });

  test('is judged by the remix rules when opened, and calls the original by reference', async () => {
    const store = createMemoryStore();
    const record = await install(built.entry, ctxFor(store, built));
    const { pack } = await installedPack(record.id, store);
    const got = await compilePack(pack, facts);
    expect(got.errors).toBeUndefined();
    expect(got.ok).toBe(true);
    expect(got.compiled.lesson.id).toBe(remixLessonId(pack));
    const original = await loadInvestigation('tides', 'en');
    const sid = got.compiled.lesson.steps.find(
      s => typeof s.validate === 'function'
    );
    if (sid)
      expect(original.steps.map(s => s.validate)).toContain(sid.validate);
  });

  test('a stored pack whose answer was changed is refused, naming the field', async () => {
    const store = createMemoryStore();
    const record = await install(built.entry, ctxFor(store, built));
    const { pack } = await installedPack(record.id, store);
    const bad = clone(pack);
    const i = bad.steps.findIndex(s => s.type === 'question' && 'answer' in s);
    expect(i).toBeGreaterThanOrEqual(0);
    bad.steps[i].answer = bad.steps[i].answer === 1 ? 2 : 1;
    const got = await compilePack(bad, facts);
    expect(got.ok).toBe(false);
    expect(got.errors[0].path).toContain(`steps[${i}].answer`);
  });

  test('a record that is not an investigation pack is not opened', async () => {
    const store = createMemoryStore();
    expect((await installedPack('nope.nothing', store)).reason).toBe(
      'notInstalled'
    );
    await store.put({ id: 'a.b', type: 'course-pack' });
    expect((await installedPack('a.b', store)).reason).toBe('notInstalled');
    await store.put({
      id: 'c.d',
      type: 'investigation-pack',
      manifest: { provides: { investigations: [{ file: 'x.json' }] } },
      files: { 'x.json': '{"format": "other"}' },
    });
    expect((await installedPack('c.d', store)).reason).toBe('notPack');
  });

  test('an archive whose pack is another id is refused before anything is kept', async () => {
    const other = clone(remix);
    other.id = 'my-other-pack';
    const b = await archived(other);
    const entry = { ...b.entry, id: built.entry.id };
    const store = createMemoryStore();
    const err = await install(entry, ctxFor(store, b)).catch(e => e);
    expect(err).toBeInstanceOf(InstallError);
    expect(['manifest', 'content', 'archive']).toContain(err.code);
    expect(await store.list()).toEqual([]);
  });
});

describe('the link that opens an installed package', () => {
  const fragment = id =>
    `i1r${Buffer.from(JSON.stringify({ k: id })).toString('base64url')}`;

  test('names the package, and nothing else', async () => {
    const r = await readPackFragment(`#${fragment('community.my-pack')}`);
    expect(r).toEqual({ ok: true, installed: 'community.my-pack' });
  });

  test('refuses a name that is not a package id, and extra fields', async () => {
    expect((await readPackFragment(`#${fragment('../x')}`)).ok).toBe(false);
    const extra = `i1r${Buffer.from('{"k":"a.b","p":{}}').toString('base64url')}`;
    expect((await readPackFragment(`#${extra}`)).ok).toBe(false);
  });

  test('a pack and a difference still read as they did', async () => {
    const enc = o =>
      `i1r${Buffer.from(JSON.stringify(o)).toString('base64url')}`;
    expect(
      (await readPackFragment(`#${enc({ p: { id: 'x' } })}`)).pack
    ).toEqual({ id: 'x' });
    expect(
      (await readPackFragment(`#${enc({ d: { id: 'x' } })}`)).delta
    ).toEqual({ id: 'x' });
  });
});

describe('the words', () => {
  test('English and Spanish agree, and name the new refusal', () => {
    expect(Object.keys(ES_REMIX).sort()).toEqual(Object.keys(EN_REMIX).sort());
    expect(EN_REMIX['remix.error.notInstalled']).toContain('{id}');
  });
});

test('the api the install check leaves to the engine is this build’s', () => {
  expect(packApi().lessons).toContain('tides');
});
