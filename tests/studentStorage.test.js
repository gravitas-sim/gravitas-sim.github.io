// =============================================================================
// The student's data goes through js/storage (Roadmap II Prompt 65, step 3)
// -----------------------------------------------------------------------------
// The writers keep their keys and formats (saved work reads in every build);
// what changed is that they write through js/storage/local.js, and that the
// storage module can see them: export-all, import-all, delete-all and a copy
// into collections work over the keys the writers use. This file holds the
// parts of that no other suite does: the limits, the quota, the legacy
// fixtures, the round trip, and a guard that a writer cannot slip back to a
// direct write unnoticed.
// =============================================================================

import { beforeEach, describe, expect, test } from '@jest/globals';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import {
  COLLECTIONS,
  KEYS,
  adoptLegacy,
  collectionOf,
  legacyBackend,
  memoryBackend,
  openStudentStore,
  Store,
} from '../js/storage/index.js';
import {
  ITEM,
  drop,
  get,
  put,
  readJson,
  writeJson,
} from '../js/storage/local.js';
import * as notebook from '../js/notebook/store.js';

beforeEach(() => {
  localStorage.clear();
  notebook.setBackend(null);
});

// What older builds left in a browser: one key of each kind the writers use.
const LEGACY = {
  // progress schema 1: positional, before step ids
  gravitas_investigation_kepler: JSON.stringify({
    visited: [0, 1, 2],
    responses: { 0: { a: '1.5' } },
  }),
  'gravitas_investigation_kepler:v1': JSON.stringify({ visited: [0] }),
  gravitas_assignment_ab12cd: JSON.stringify({ schema: 2, visited: ['s1'] }),
  gravitas_student_name: 'Ada Lovelace',
  gravitas_evidence_notebook: JSON.stringify({ v: 1, entries: [{ id: 'e1' }] }),
  gravitas_experiments_index: JSON.stringify({ v: 3, items: [] }),
  gravitas_experiment_abc: JSON.stringify({ v: 3, id: 'abc' }),
  gravitas_experiment_checkpoint_9f: JSON.stringify([{ status: 'done' }]),
  gravitas_simulation_save: JSON.stringify({ settings: {}, objects: [] }),
  gravitas_guides: JSON.stringify({ 'g-1': { version: '1.0.0' } }),
  gravitas_lab3d_guide_orbits_basic: JSON.stringify({ curriculum: 1 }),
  gravitas_missionlab_hohmann_basic: JSON.stringify({ at: 2 }),
  'gravitas_composer_draft:x': JSON.stringify({ savedAt: 1, doc: { id: 'x' } }),
  gravitas_composer_last: 'x',
  'gravitas_course_draft:c': JSON.stringify({ savedAt: 1, doc: { id: 'c' } }),
  'gravitas_studio_draft:s': JSON.stringify({ savedAt: 1, doc: { id: 's' } }),
  gravitas_evaluation_draft_v1: JSON.stringify({ q1: 'a' }),
  gravitas_teaching_notes_v1: JSON.stringify({ note: 'b' }),
  gravitas_lesson_objects_open: '0',
  gravitas_course_level: 'majors',
  gravitas_theme: 'daylight',
};
const seed = () => {
  for (const [k, v] of Object.entries(LEGACY)) localStorage.setItem(k, v);
  // Not the student's work: exported never, deleted never.
  localStorage.setItem('gravitas_composer_preview', '{"lesson":1}');
  localStorage.setItem('gravitas_capability_versions', '{"p":"1.0.0"}');
  localStorage.setItem('someone_elses_key', 'x');
};

describe('the limits the writers share with the storage module', () => {
  test('local.js states the same per-record limit as COLLECTIONS, collection by collection', () => {
    for (const [name, kib] of Object.entries(ITEM)) {
      expect({ name, bytes: kib * 1024 }).toEqual({
        name,
        bytes: COLLECTIONS[name].item,
      });
    }
    // installs is the platform's: no writer in local.js keeps it
    expect(Object.keys(COLLECTIONS).filter(n => !(n in ITEM))).toEqual([
      'installs',
    ]);
  });

  test('a record over its collection limit is refused as a full disk is, and the old record stands', () => {
    put('gravitas_student_name', 'old', 'settings');
    let error;
    try {
      put('gravitas_student_name', 'x'.repeat(256 * 1024 + 1), 'settings');
    } catch (e) {
      error = e;
    }
    expect(error).toMatchObject({
      name: 'QuotaExceededError',
      reason: 'itemTooLarge',
      collection: 'settings',
    });
    expect(get('gravitas_student_name')).toBe('old');
    // the limit itself is allowed
    put('gravitas_student_name', 'x'.repeat(256 * 1024), 'settings');
    expect(get('gravitas_student_name').length).toBe(256 * 1024);
  });

  test('writeJson reports a refusal and does not throw; so does a browser that is full', () => {
    expect(
      writeJson('gravitas_guides', { a: 'x'.repeat(2e6) }, 'progress')
    ).toBe(false);
    expect(localStorage.getItem('gravitas_guides')).toBeNull();
    const full = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('full', 'QuotaExceededError');
      },
    };
    expect(writeJson('gravitas_guides', {}, 'progress', full)).toBe(false);
    // and put lets a caller classify it, as investigations.js does
    expect(() => put('gravitas_guides', '{}', 'progress', full)).toThrow(
      expect.objectContaining({ name: 'QuotaExceededError' })
    );
  });

  test('a key with no collection is stored without a limit, as before', () => {
    put('gravitas_composer_preview', 'x'.repeat(3e6));
    expect(get('gravitas_composer_preview').length).toBe(3e6);
  });

  test('drop removes the key; reading it again is null', () => {
    put('gravitas_guides', '{}', 'progress');
    drop('gravitas_guides');
    expect(readJson('gravitas_guides', 'none')).toBe('none');
  });

  test('the notebook store writes through it: same key, same text, quota still reported', () => {
    expect(notebook.save([{ id: 'e1' }]).ok).toBe(true);
    expect(localStorage.getItem(notebook.KEY)).toBe(
      JSON.stringify({ v: 1, entries: [{ id: 'e1' }] })
    );
    expect(notebook.load().entries).toEqual([{ id: 'e1' }]);
    notebook.setBackend({
      getItem: () => null,
      setItem: () => {
        throw new DOMException('full', 'QuotaExceededError');
      },
      removeItem() {},
    });
    expect(notebook.save([{ id: 'e1' }])).toMatchObject({
      ok: false,
      reason: 'quota',
    });
  });
});

describe('which collection holds which key', () => {
  test('every key STORAGE.md lists as a student own, and each preference, has a collection', () => {
    const doc = readFileSync('STORAGE.md', 'utf8');
    const owned = doc.slice(
      doc.indexOf('## What a student owns'),
      doc.indexOf('## Previews')
    );
    const keys = [...owned.matchAll(/`(gravitas_[a-z0-9_:]+)/g)].map(m => m[1]);
    expect(keys.length).toBeGreaterThan(15);
    for (const key of keys) {
      expect({ key, c: typeof collectionOf(key) }).toEqual({
        key,
        c: 'string',
      });
    }
  });

  test('previews and the platform stamps are kept but not exported', () => {
    for (const k of [
      'gravitas_composer_preview',
      'gravitas_course_preview',
      'gravitas_capability_versions',
    ]) {
      expect(collectionOf(k)).toBeNull();
    }
    expect(collectionOf('someone_elses_key')).toBeUndefined();
  });

  test('a checkpoint is a draft, not an experiment: it may be 1.5 million characters', () => {
    expect(collectionOf('gravitas_experiment_checkpoint_9f')).toBe('drafts');
    expect(collectionOf('gravitas_experiments_index')).toBe('experiments');
    expect(collectionOf('gravitas_course_level')).toBe('preferences');
    expect(collectionOf('gravitas_course_draft:c')).toBe('courses');
    expect(COLLECTIONS.drafts.item).toBeGreaterThan(1.5e6);
  });

  test('every collection in KEYS is a real one', () => {
    for (const [, c] of KEYS) expect(c === null || c in COLLECTIONS).toBe(true);
  });

  // The collection a writer names must be the one KEYS gives its keys. Source
  // text, because the pages cannot be imported here.
  test.each([
    [
      'js/investigations.js',
      [
        'gravitas_investigation_',
        'gravitas_assignment_',
        'gravitas_student_name',
        'gravitas_lesson_objects_open',
      ],
    ],
    ['js/notebook/store.js', ['gravitas_evidence_notebook']],
    ['js/observatory/guidePanel.js', ['gravitas_guides']],
    ['js/mission/lab/guidePanel.js', ['gravitas_missionlab_']],
    ['js/lab3d/view/guidePanel.js', ['gravitas_lab3d_guide_']],
    ['js/teachingPage.js', ['gravitas_teaching_notes_v1']],
    ['js/studioPage.js', ['gravitas_studio_draft:']],
  ])('%s names the collection of the keys it writes', (file, keys) => {
    const src = readFileSync(file, 'utf8');
    const named = new Set(
      [
        ...src.matchAll(
          /'(progress|evidence|experiments|drafts|assignments|courses|settings|preferences)'/g
        ),
      ].map(m => m[1])
    );
    const expected = new Set(keys.map(k => collectionOf(k)));
    expect([...named].sort()).toEqual([...expected].sort());
  });
});

describe('saved state from every earlier build reads and round-trips unchanged', () => {
  test('exportAll carries each key of the fixtures, parsed, and nothing that is not the student’s', async () => {
    seed();
    const store = openStudentStore({ channel: null });
    const file = await store.exportAll();
    const ids = Object.values(file.collections).flatMap(rs =>
      rs.map(r => r.id)
    );
    expect(ids.sort()).toEqual(Object.keys(LEGACY).sort());
    expect(ids).not.toContain('gravitas_composer_preview');
    expect(ids).not.toContain('gravitas_capability_versions');
    expect(ids).not.toContain('someone_elses_key');
    const byId = Object.fromEntries(
      Object.values(file.collections).flatMap(rs => rs.map(r => [r.id, r]))
    );
    expect(byId.gravitas_student_name.value).toBe('Ada Lovelace');
    expect(byId.gravitas_investigation_kepler.value.visited).toEqual([0, 1, 2]);
    expect(file.collections.progress.map(r => r.id)).toContain(
      'gravitas_guides'
    );
    expect(file.collections.courses.map(r => r.id)).toEqual([
      'gravitas_course_draft:c',
    ]);
  });

  test('export, wipe, import: every key comes back with the same text', async () => {
    seed();
    const store = openStudentStore({ channel: null });
    const file = JSON.parse(JSON.stringify(await store.exportAll()));
    const before = { ...LEGACY };
    for (const k of Object.keys(LEGACY)) localStorage.removeItem(k);
    const result = await store.importAll(file);
    expect(result.ok).toBe(true);
    expect(result.plan.every(s => s.action === 'add')).toBe(true);
    for (const [k, text] of Object.entries(before)) {
      expect({ k, text: localStorage.getItem(k) }).toEqual({ k, text });
    }
    // what is not the student's was never touched
    expect(localStorage.getItem('someone_elses_key')).toBe('x');
    expect(localStorage.getItem('gravitas_composer_preview')).toBe(
      '{"lesson":1}'
    );
  });

  test('a dry run changes nothing; replace brings back an edited record; skip leaves it', async () => {
    seed();
    const store = openStudentStore({ channel: null });
    const file = JSON.parse(JSON.stringify(await store.exportAll()));
    localStorage.setItem('gravitas_student_name', 'Grace');
    const dry = await store.importAll(file, { dryRun: true });
    expect(dry.applied).toBe(false);
    expect(dry.plan.find(s => s.id === 'gravitas_student_name').action).toBe(
      'rename'
    );
    expect(localStorage.getItem('gravitas_student_name')).toBe('Grace');
    await store.importAll(file, { mode: 'skip' });
    expect(localStorage.getItem('gravitas_student_name')).toBe('Grace');
    await store.importAll(file, { mode: 'replace' });
    expect(localStorage.getItem('gravitas_student_name')).toBe('Ada Lovelace');
  });

  test('an import never writes a key that is not the collection’s, and says so', async () => {
    const store = openStudentStore({ channel: null });
    const result = await store.importAll({
      format: 'gravitas.student-data',
      formatVersion: 1,
      collections: {
        progress: [{ id: 'not_a_gravitas_key', version: 1, value: {} }],
        settings: [
          {
            id: 'gravitas_student_name',
            version: 1,
            value: 'x'.repeat(300000),
          },
        ],
      },
    });
    expect(result.ok).toBe(true);
    expect(result.plan.map(s => [s.id, s.action, s.reason])).toEqual([
      ['not_a_gravitas_key', 'skip', 'unknownKey'],
      ['gravitas_student_name', 'skip', 'itemTooLarge'],
    ]);
    expect(localStorage.length).toBe(0);
  });

  test('delete-all removes the student’s keys and only those', async () => {
    seed();
    await openStudentStore({ channel: null }).deleteAll();
    expect(Object.keys(localStorage).sort()).toEqual([
      'gravitas_capability_versions',
      'gravitas_composer_preview',
      'someone_elses_key',
    ]);
  });

  test('a record over the Store’s own limit is refused with its reason, not thrown', async () => {
    const store = openStudentStore({ channel: null });
    const r = await store
      .collection('settings')
      .put('gravitas_student_name', 'x'.repeat(300000));
    expect(r).toMatchObject({ ok: false, reason: 'itemTooLarge' });
  });

  test('the browser refusing the write is reported as quota, and the old text stands', async () => {
    seed();
    const real = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new DOMException('full', 'QuotaExceededError');
    };
    try {
      const r = await openStudentStore({ channel: null })
        .collection('settings')
        .put('gravitas_student_name', 'Grace');
      expect(r).toMatchObject({ ok: false, reason: 'quota' });
    } finally {
      Storage.prototype.setItem = real;
    }
    expect(localStorage.getItem('gravitas_student_name')).toBe('Ada Lovelace');
  });

  test('the Store’s reserve still refuses a write that would leave too little room', async () => {
    const store = new Store(legacyBackend(localStorage), {
      estimate: async () => ({ usage: 99e6, quota: 100e6 }),
      channel: null,
    });
    const r = await store
      .collection('settings')
      .put('gravitas_student_name', 'x'.repeat(5000));
    expect(r).toMatchObject({ ok: false, reason: 'quota' });
  });
});

describe('copying the legacy keys into collections (adoptLegacy)', () => {
  test('copies each record once, leaves every key where it is, and a second run copies nothing', async () => {
    seed();
    const target = new Store(memoryBackend(), { channel: null });
    const first = await adoptLegacy(target);
    expect(first.copied.sort()).toEqual(Object.keys(LEGACY).sort());
    expect(first.refused).toEqual([]);
    for (const [k, text] of Object.entries(LEGACY)) {
      expect(localStorage.getItem(k)).toBe(text);
    }
    expect(
      await target.collection('settings').get('gravitas_student_name')
    ).toBe('Ada Lovelace');
    const second = await adoptLegacy(target);
    expect(second.copied).toEqual([]);
    expect(second.present.length).toBe(first.copied.length);
  });

  test('a copy already in the collection wins; an oversize record is reported, not dropped from the key', async () => {
    seed();
    const target = new Store(memoryBackend(), { channel: null });
    await target.collection('settings').put('gravitas_student_name', 'Newer');
    localStorage.setItem(
      'gravitas_teaching_notes_v1',
      JSON.stringify({ n: 'x'.repeat(2.1e6) })
    );
    const r = await adoptLegacy(target);
    expect(
      await target.collection('settings').get('gravitas_student_name')
    ).toBe('Newer');
    expect(r.refused).toEqual([
      { id: 'gravitas_teaching_notes_v1', reason: 'itemTooLarge' },
    ]);
    expect(
      localStorage.getItem('gravitas_teaching_notes_v1').length
    ).toBeGreaterThan(2e6);
  });
});

describe('no writer slips back to a direct write', () => {
  // Every direct write that remains, and why. A new one fails this list; a
  // moved one must leave it.
  const DIRECT = {
    'js/notebook/store.js': 'the availability probe, removed at once',
    'js/studio/model.js':
      'writes through the Storage a page hands it (Studio hands a guarded one)',
    'js/platform/resolver.js': 'the platform stamps, not student work',
    'js/instructorPortal.js':
      'sessionStorage: the instructor key, for the session',
    'js/shell.js': 'the shell’s own theme and language choice, every route',
    'js/experiments/store.js': 'route at its request ceiling (STORAGE.md)',
    'js/experimentsPage.js': 'route at its request ceiling (STORAGE.md)',
    'js/myWork/made.js':
      'reached from the Sandbox: a second importer would split storage/local.js into a chunk every lesson fetches (STORAGE.md)',
    'js/composerPage.js': 'route at its request ceiling (STORAGE.md)',
    'js/coursePage.js': 'route at its request ceiling (STORAGE.md)',
    'js/evaluationKit.js': 'route has 0.7 KB of room (STORAGE.md)',
    'js/ui.js':
      'a new shared chunk costs every lesson route a request (STORAGE.md)',
    'js/controls.js': 'preference, same chunk cost',
    'js/lecture.js': 'preference, same chunk cost',
    'js/main.js': 'preference, same chunk cost',
    'js/welcomeGate.js': 'preference, same chunk cost',
    'js/settingsSchema.js': 'preference, same chunk cost',
    'js/theme.js': 'preference, same chunk cost',
    'js/units.js': 'preference, same chunk cost',
    'js/i18n/index.js': 'the language, each page’s catalog loader',
    'js/courseHome.js':
      'gravitas_next_context: where a lesson was opened from, not student work (STORAGE.md)',
    'js/libraryPage.js': 'gravitas_next_context, as above',
    'js/investigations.js': 'gravitas_next_context, as above',
    'js/investigations/next.js': 'gravitas_next_context, as above',
  };
  test('the files that call setItem or removeItem on a Storage are exactly the listed ones', () => {
    const lines = execFileSync(
      'git',
      ['grep', '-nE', '\\.(setItem|removeItem)\\(', '--', 'js'],
      { encoding: 'utf8' }
    )
      .split('\n')
      .filter(l => l && !l.startsWith('js/storage/'));
    const files = new Set(
      lines
        .filter(l => !/^\S+:\d+:\s*(\/\/|\*)/.test(l))
        .map(l => l.split(':')[0])
    );
    const perPage = [...files].filter(f => /\/i18n\.js$/.test(f));
    expect(perPage.length).toBeGreaterThan(10);
    const rest = [...files].filter(f => !/\/i18n\.js$/.test(f)).sort();
    expect(rest).toEqual(Object.keys(DIRECT).sort());
  });
});
