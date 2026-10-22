// =============================================================================
// Preview parity (Prompt 175)
// -----------------------------------------------------------------------------
// Every kind the Library lists opens as a student would meet it, with a banner
// that says so, and reads and writes none of the student's record. The guard is
// one place (js/storage/local.js: every writer of the record comes through it);
// this holds that place to the storage module's own key table, so a key added
// later cannot be left out, and holds the address every kind is previewed at.
// The browser walk of each kind is e2e/previewParity.spec.js.
// =============================================================================

import { afterEach, describe, expect, test } from '@jest/globals';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { KEYS } from '../js/storage/index.js';
import {
  RECORD_KEYS,
  drop,
  get,
  noteResume,
  previewing,
  put,
  readJson,
  setPreview,
  writeJson,
} from '../js/storage/local.js';
import { previewRoute } from '../js/library/format.js';
import {
  KEY_EXPERIMENT_CHECKPOINT_PREFIX,
  KEY_LOCALE,
  KEY_RESUME,
  KEY_THEME,
} from '../js/names.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const library = JSON.parse(
  readFileSync(path.join(ROOT, 'library', 'library.json'), 'utf8')
);

/** A localStorage that records what reached it. */
function fake() {
  const data = new Map();
  const log = [];
  return {
    data,
    log,
    getItem: k => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => (log.push(['set', k]), data.set(k, String(v))),
    removeItem: k => (log.push(['remove', k]), data.delete(k)),
  };
}

afterEach(() => {
  setPreview(false);
  delete globalThis.localStorage;
});

describe('the guard in the storage module', () => {
  test('a record key is held in memory in a preview: nothing reaches storage', () => {
    const store = fake();
    store.data.set('gravitas_investigation_tides', '{"saved":1}');
    globalThis.localStorage = store;
    setPreview(true);
    expect(previewing()).toBe(true);
    // Reads see a clean record, not the student's.
    expect(get('gravitas_investigation_tides')).toBeNull();
    expect(readJson('gravitas_investigation_tides', 'clean')).toBe('clean');
    // Writes work for the page and go nowhere else.
    expect(
      writeJson('gravitas_investigation_tides', { a: 1 }, 'progress')
    ).toBe(true);
    expect(readJson('gravitas_investigation_tides')).toEqual({ a: 1 });
    expect(noteResume({ id: 'investigation:tides', route: '/x' })).toBe(true);
    drop('gravitas_investigation_tides');
    expect(get('gravitas_investigation_tides')).toBeNull();
    expect(store.log).toEqual([]);
    expect(store.data.get('gravitas_investigation_tides')).toBe('{"saved":1}');
  });

  test('a preference goes through as ever: language and theme are the reader’s', () => {
    const store = fake();
    store.data.set(KEY_LOCALE, 'es');
    globalThis.localStorage = store;
    setPreview(true);
    expect(get(KEY_LOCALE)).toBe('es');
    put(KEY_THEME, 'light', 'preferences');
    expect(store.log).toEqual([['set', KEY_THEME]]);
  });

  test('and with no preview it is the storage module it was', () => {
    const store = fake();
    globalThis.localStorage = store;
    expect(previewing()).toBe(false);
    put('gravitas_investigation_tides', 'x', 'progress');
    expect(store.data.get('gravitas_investigation_tides')).toBe('x');
    drop('gravitas_investigation_tides');
    expect(store.log).toEqual([
      ['set', 'gravitas_investigation_tides'],
      ['remove', 'gravitas_investigation_tides'],
    ]);
  });

  test('a store handed in explicitly is the caller’s own, and is not held', () => {
    setPreview(true);
    const own = fake();
    put('gravitas_investigation_tides', 'x', 'progress', own);
    expect(own.data.get('gravitas_investigation_tides')).toBe('x');
  });

  test('every key the student’s record is kept under is guarded, and nothing else is', () => {
    // The storage module's key table (js/storage/index.js KEYS) is the
    // inventory. The student's work is these collections; two keys of other
    // collections are the record's too: the experiment checkpoint (a draft) and
    // the resume record (a preference). Authors' drafts, the reader's own
    // preferences and the name they typed are not a preview's to hold back.
    const record = new Set([
      'progress',
      'evidence',
      'experiments',
      'assignments',
      'courses',
      'made',
    ]);
    // As the guard decides it: a record prefix, less the course keys that are
    // not (the key table lists those first).
    const guarded = key => {
      const store = fake();
      globalThis.localStorage = store;
      setPreview(true);
      put(key, 'x', 'preferences');
      return store.log.length === 0;
    };
    for (const [prefix, collection] of KEYS) {
      const want =
        record.has(collection) ||
        prefix === KEY_EXPERIMENT_CHECKPOINT_PREFIX ||
        prefix === KEY_RESUME;
      expect([prefix, guarded(prefix)]).toEqual([prefix, want]);
    }
    // And the list names nothing the table does not.
    for (const p of RECORD_KEYS) expect(KEYS.some(([k]) => k === p)).toBe(true);
  });

  test('no module outside the storage folder writes a record key by hand', () => {
    const files = [];
    const walk = dir => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (p.endsWith('.js')) files.push(p);
      }
    };
    walk(path.join(ROOT, 'js'));
    const names = [
      'KEY_INVESTIGATION_PREFIX',
      'KEY_GUIDES',
      'KEY_LAB3D_GUIDE_PREFIX',
      'KEY_MISSIONLAB_PREFIX',
      'KEY_ASSIGNMENT_PREFIX',
      'KEY_COURSE_PREFIX',
      'KEY_EVIDENCE_NOTEBOOK',
      'KEY_MADE_PREFIX',
      'KEY_EXPERIMENT',
      'KEY_RESUME',
    ];
    const offenders = [];
    for (const file of files) {
      if (file.includes(`${path.sep}storage${path.sep}`)) continue;
      const text = readFileSync(file, 'utf8');
      if (!/localStorage\??\.(setItem|removeItem)/.test(text)) continue;
      if (names.some(n => text.includes(n))) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });
});

describe('the address of every kind', () => {
  test('the Library lists six kinds and every entry has a preview address', () => {
    expect(new Set(library.entries.map(e => e.kind))).toEqual(
      new Set(library.kinds)
    );
    for (const entry of library.entries) {
      const href = previewRoute(entry);
      expect(href.startsWith('/')).toBe(true);
      expect(href.startsWith('//')).toBe(false);
      expect(href.match(/preview=student/g)).toHaveLength(1);
      // Before the hash, where a page that rewrites its own hash cannot lose it.
      expect(href.split('#')[0]).toContain('preview=student');
      const cut = entry.route.indexOf('#');
      if (cut >= 0 && entry.format !== 'lesson')
        expect(href.endsWith(entry.route.slice(cut))).toBe(true);
    }
  });

  test('a lesson goes through the progress-free view the lessons already have', () => {
    const lesson = library.entries.find(
      e => e.id === 'investigation:keplers-laws'
    );
    expect(previewRoute(lesson)).toBe(
      '/?author=keplers-laws&view=student&preview=student'
    );
  });

  test('every guide, activity, course, dataset, scenario and experiment keeps its own route', () => {
    for (const entry of library.entries.filter(e => e.format !== 'lesson')) {
      const [path0] = entry.route.split('#');
      expect(previewRoute(entry).startsWith(path0)).toBe(true);
    }
  });
});
