// =============================================================================
// Collections: a profile of the course package, and the student's saved items
// (Roadmap III Prompt 164)
// -----------------------------------------------------------------------------
// js/course/pack.js holds the profile's rules; js/library/collections.js holds
// the one record. A collection must read as a collection, round-trip by link,
// and be refused by 2.0.0's reader in its own words (tests/compat/boundary.mjs).
// =============================================================================

import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, test } from '@jest/globals';
import '../js/library/collectionsDeps.js';
import {
  FORMAT,
  FORMAT_VERSION,
  MAX_ITEMS_PER_UNIT,
  PROFILES,
  validateCoursePack,
} from '../js/course/pack.js';
import { PLATFORM_API } from '../js/platform/catalog.generated.js';
import { KEY_COLLECTIONS } from '../js/names.js';
import { courseApi } from '../js/course/api.js';
import { courseLink, readCourseFragment } from '../js/course/links.js';
import { entryIdOfItem } from '../js/library/format.js';
import { deps } from '../js/library/collectionsDeps.js';
import {
  SAVED_PLATFORM,
  bind,
  RECEIVED_MAX,
  SAVED_ID,
  dropCollection,
  isSaved,
  itemOfEntry,
  keepCollection,
  readCollections,
  readsAsCollection,
  removeSaved,
  replaceSaved,
  savedPack,
  toggleSaved,
} from '../js/library/collections.js';
import { KEYS, collectionOf } from '../js/storage/index.js';
import { describe as describeWork } from '../js/myWork/model.js';

beforeEach(() => localStorage.clear());

const library = JSON.parse(readFileSync('library/library.json', 'utf8'));
const entry = id => library.entries.find(e => e.id === id);
const api = courseApi();
const problems = p => validateCoursePack(p, api).map(e => e.code);
const clone = x => JSON.parse(JSON.stringify(x));

const collection = (items, extra = {}) => ({
  format: 'gravitas.course-pack',
  formatVersion: 3,
  id: 'tides-set',
  version: '1.0.0',
  gravitas: '1.0.0',
  locales: ['en'],
  pinning: 'compatible',
  profile: 'collection',
  title: { en: 'Tides, three ways' },
  units: [{ id: 'set', title: { en: 'Set' }, items }],
  ...extra,
});
const lessonItem = (lesson = 'tides', extra = {}) => ({
  id: `lesson-${lesson}`,
  kind: 'lesson',
  lesson,
  ...extra,
});

describe('the profile', () => {
  test('is `collection`, and a pack with no profile is a course as before', () => {
    expect(PROFILES).toEqual(['collection']);
    const ok = collection([lessonItem()]);
    expect(problems(ok)).toEqual([]);
    const { profile: _drop, ...course } = ok;
    expect(problems(course)).toEqual([]);
  });

  test('holds notes, a depth and a pin on an item', () => {
    const c = collection([
      lessonItem('tides', {
        depth: 'quantitative',
        studentNote: { en: 'Start here.' },
        teacherNote: { en: 'Ten minutes in.' },
        pin: { fp: '0123abcd', n: 9 },
      }),
    ]);
    expect(problems(c)).toEqual([]);
    expect(problems({ ...c, pinning: 'exact' })).toEqual([]);
  });

  test('refuses another profile', () => {
    expect(problems(collection([lessonItem()], { profile: 'course' }))).toEqual(
      ['profile']
    );
  });

  test('has exactly one unit', () => {
    const c = collection([lessonItem()]);
    c.units.push({
      id: 'two',
      title: { en: 'Two' },
      items: [lessonItem('keplers-laws')],
    });
    expect(problems(c)).toContain('collectionUnits');
  });

  test('holds no assignment, no optional path and no needs', () => {
    const assignment = {
      id: 'a1',
      kind: 'assignment',
      lesson: 'tides',
      steps: ['intro'],
      title: { en: 'A' },
      intro: { en: 'B' },
      assignment: '2026-10-22',
      pin: { fp: '0123abcd', n: 9, f: ['0123abcd'] },
    };
    expect(problems(collection([assignment]))).toContain('collectionItem');
    expect(
      problems(collection([lessonItem('tides', { path: 'intro' })]))
    ).toContain('collectionItem');
    expect(
      problems(
        collection([
          lessonItem('tides'),
          lessonItem('keplers-laws', { needs: ['lesson-tides'] }),
        ])
      )
    ).toContain('collectionItem');
  });

  test('has no objectives, prerequisites, course level or term', () => {
    for (const extra of [
      { objectives: [{ id: 'o', text: { en: 'x' } }] },
      { prerequisites: [{ lesson: 'tides' }] },
      { courseLevel: 'survey' },
      { term: 'Spring 2027' },
    ])
      expect(problems(collection([lessonItem()], extra))).toContain(
        'collectionField'
      );
  });

  test('is a field of the schema, with the one value', () => {
    const schema = JSON.parse(
      readFileSync('sdk/schemas/course-pack-3.schema.json', 'utf8')
    );
    expect(schema.properties.profile.enum).toEqual(['collection']);
    expect(schema.required).not.toContain('profile');
  });
});

describe('a collection round-trips by link', () => {
  test('the course home link holds the whole package and reads back equal', async () => {
    const c = collection(
      [
        lessonItem('tides', { studentNote: { en: 'Start here.' } }),
        { id: 'ds', kind: 'dataset', dataset: 'tess-light-curve', minutes: 20 },
        {
          id: 'sc',
          kind: 'scenario',
          scenario: 'solar-system',
          seed: 'start-1',
          minutes: 10,
        },
      ],
      { summary: { en: 'Three things to do before Friday.' } }
    );
    const { url, comfortable } = await courseLink(c, {
      root: 'https://example.test/',
    });
    expect(comfortable).toBe(true);
    const back = await readCourseFragment(url.split('#')[1]);
    expect(back).toEqual(c);
    expect(readsAsCollection(back)).toBe(true);
  });
});

describe('which Library entries a collection can hold', () => {
  const kinds = new Map();
  for (const e of library.entries) {
    const item = itemOfEntry(e);
    kinds.set(e.format, kinds.get(e.format) || item !== null);
  }

  test('lessons, guides, scenarios and datasets; nothing else', () => {
    expect(Object.fromEntries([...kinds].sort())).toEqual({
      course: false,
      demonstration: false,
      guided: false,
      lab: false,
      lab3d: true,
      lesson: true,
      mission: true,
      observation: true,
      observatory: false,
      'data-pack': false,
      'course-pack': false,
      route: false,
      sandbox: true,
      sweep: false,
      system3d: false,
    });
  });

  test('every entry that can be saved makes an item the checker accepts, and its entry again', () => {
    let n = 0;
    for (const e of library.entries) {
      const item = itemOfEntry(e);
      if (!item) continue;
      n++;
      expect({ id: e.id, problems: problems(collection([item])) }).toEqual({
        id: e.id,
        problems: [],
      });
      expect(entryIdOfItem(item)).toBe(e.id);
    }
    expect(n).toBeGreaterThan(90);
  });
});

describe('the student record', () => {
  test('is one key in the courses collection, so a backup carries it', () => {
    expect(KEY_COLLECTIONS).toBe('gravitas_collections');
    expect(KEYS.filter(([p]) => p === KEY_COLLECTIONS)).toHaveLength(1);
    expect(collectionOf(KEY_COLLECTIONS)).toBe('courses');
  });

  test('saves an entry, says so, and takes it out again', () => {
    const e = entry('investigation:keplers-laws');
    expect(isSaved(e.id)).toBe(false);
    expect(toggleSaved(e)).toEqual({ ok: true, saved: true });
    expect(isSaved(e.id)).toBe(true);
    const { saved } = readCollections();
    expect(saved.id).toBe(SAVED_ID);
    expect(problems(saved)).toEqual([]);
    expect(toggleSaved(e)).toEqual({ ok: true, saved: false });
    expect(readCollections().saved).toBe(null);
  });

  test('keeps the order it was saved in and refuses what it cannot hold', () => {
    for (const id of [
      'investigation:tides',
      'scenario:solar-system',
      'dataset:tess-light-curve',
    ])
      toggleSaved(entry(id));
    expect(readCollections().saved.units[0].items.map(entryIdOfItem)).toEqual([
      'investigation:tides',
      'scenario:solar-system',
      'dataset:tess-light-curve',
    ]);
    expect(toggleSaved(entry('course:intro-astronomy'))).toEqual({
      ok: false,
      saved: false,
    });
  });

  test('is full at thirty items, as a unit is', () => {
    const lessons = library.entries.filter(e => e.format === 'lesson');
    for (const e of lessons.slice(0, 30)) toggleSaved(e);
    expect(toggleSaved(lessons[30])).toEqual({
      ok: false,
      saved: false,
      full: true,
    });
    expect(readCollections().saved.units[0].items).toHaveLength(30);
  });

  test('removes one item, and the last one removes the collection', () => {
    toggleSaved(entry('investigation:tides'));
    toggleSaved(entry('investigation:keplers-laws'));
    removeSaved('lesson-tides');
    expect(readCollections().saved.units[0].items.map(i => i.id)).toEqual([
      'lesson-keplers-laws',
    ]);
    removeSaved('lesson-keplers-laws');
    expect(readCollections().saved).toBe(null);
  });

  test('keeps a collection somebody sent, newest first, once, capped', () => {
    const made = n => collection([lessonItem()], { id: `set-${n}` });
    expect(keepCollection(made(1))).toBe(true);
    keepCollection(made(2));
    keepCollection(made(1));
    expect(readCollections().received.map(r => r.pack.id)).toEqual([
      'set-1',
      'set-2',
    ]);
    for (let n = 3; n < RECEIVED_MAX + 4; n++) keepCollection(made(n));
    const kept = readCollections().received;
    expect(kept).toHaveLength(RECEIVED_MAX);
    expect(kept[0].pack.id).toBe(`set-${RECEIVED_MAX + 3}`);
    dropCollection(kept[0].pack.id);
    expect(readCollections().received).toHaveLength(RECEIVED_MAX - 1);
  });

  test('does not keep what is not a collection, or one that claims the student’s own id', () => {
    const { profile: _drop, ...course } = collection([lessonItem()]);
    expect(keepCollection(course)).toBe(false);
    expect(keepCollection(collection([lessonItem()], { id: SAVED_ID }))).toBe(
      false
    );
    expect(keepCollection({ nonsense: true })).toBe(false);
    expect(localStorage.getItem(KEY_COLLECTIONS)).toBe(null);
  });

  test('reads a damaged or foreign record as empty, and the next write replaces it', () => {
    for (const bad of [
      'not json',
      '{"v":2,"saved":{}}',
      '{"v":1,"saved":{"profile":"collection"},"received":[{"pack":5}]}',
      '[]',
    ]) {
      localStorage.setItem(KEY_COLLECTIONS, bad);
      expect(readCollections()).toEqual({ saved: null, received: [] });
    }
    toggleSaved(entry('investigation:tides'));
    expect(readCollections().saved).not.toBe(null);
  });

  test('stores only the package: no answer, no name, no link', () => {
    toggleSaved(entry('investigation:tides'));
    keepCollection(collection([lessonItem()]));
    const record = JSON.parse(localStorage.getItem(KEY_COLLECTIONS));
    expect(Object.keys(record).sort()).toEqual(['received', 'saved', 'v']);
    expect(Object.keys(record.received[0]).sort()).toEqual(['at', 'pack']);
    expect(JSON.stringify(record)).not.toMatch(/http|answer|name/i);
  });

  test('replaceSaved takes a collection the student edited, and nothing else', () => {
    toggleSaved(entry('investigation:tides'));
    const edited = clone(readCollections().saved);
    edited.units[0].items[0].studentNote = { en: 'Do this first.' };
    expect(replaceSaved(edited)).toBe(true);
    expect(readCollections().saved.units[0].items[0].studentNote.en).toBe(
      'Do this first.'
    );
    expect(replaceSaved({ ...edited, profile: 'course' })).toBe(false);
  });

  test('My work lists them without reading the module', () => {
    toggleSaved(entry('investigation:tides'));
    toggleSaved(entry('scenario:solar-system'));
    keepCollection(collection([lessonItem()]));
    const records = [
      {
        collection: 'courses',
        id: KEY_COLLECTIONS,
        value: JSON.parse(localStorage.getItem(KEY_COLLECTIONS)),
      },
    ];
    const d = describeWork(records);
    expect(d.collections).toEqual({
      saved: 2,
      received: [{ id: 'tides-set', title: { en: 'Tides, three ways' }, n: 1 }],
    });
  });

  test('savedPack is valid for any one item', () => {
    expect(problems(savedPack([lessonItem()]))).toEqual([]);
  });
});

describe('the module imports nothing, so a page\u2019s bundle is not split', () => {
  test('collections.js and collectionsView.js import only each other', () => {
    const imports = file =>
      [
        ...readFileSync(file, 'utf8').matchAll(
          /^(?:import|\}) [^']*?from '([^']*)';$/gm
        ),
      ].map(m => m[1]);
    expect(imports('js/library/collections.js')).toEqual([]);
    expect(imports('js/library/collectionsView.js')).toEqual([
      './collections.js',
    ]);
  });

  test('its copies of the package constants are the package\u2019s', () => {
    expect(SAVED_PLATFORM).toBe(PLATFORM_API);
    const made = savedPack([lessonItem()]);
    expect(made.format).toBe(FORMAT);
    expect(made.formatVersion).toBe(FORMAT_VERSION);
    const lessons = library.entries.filter(e => e.format === 'lesson');
    for (const e of lessons.slice(0, MAX_ITEMS_PER_UNIT)) toggleSaved(e);
    expect(toggleSaved(lessons[MAX_ITEMS_PER_UNIT]).full).toBe(true);
  });

  test('without a checker a package is held to its shape, and the real checker still agrees on what it writes', () => {
    toggleSaved(entry('investigation:tides'));
    const written = readCollections().saved;
    bind({ ...deps, validate: undefined });
    try {
      expect(readCollections().saved).toEqual(written);
      localStorage.setItem(
        KEY_COLLECTIONS,
        JSON.stringify({
          v: 1,
          saved: { profile: 'collection', units: [] },
          received: [],
        })
      );
      expect(readCollections().saved).toBe(null);
    } finally {
      bind(deps);
    }
  });
});
