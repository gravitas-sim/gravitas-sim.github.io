import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { KEYS } from '../js/storage/index.js';
import { archiveOld } from './compat/harness.js';

// =============================================================================
// A 2.0.0 student's whole profile, opened on the tip (Roadmap III, Prompt 146)
// -----------------------------------------------------------------------------
// tests/storageProfile/profile-2.0.0.json is what a 2.0.0 student's browser
// holds: every localStorage key group (written by 2.0.0's own writers where a
// module writes it), the contents of the IndexedDB databases and a Cache
// Storage snapshot. report-2.0.0.json is what 2.0.0 itself makes of it.
//
// Here the tip opens the same profile and must say the same: the same My work
// inventory, lesson progress, experiments, notebook, installed packages and
// archive; an export imported into an empty profile reproduces every key a
// backup file carries; and 2.0.0's readers (a rollback, or a tab still running
// the old code) read what the tip wrote.
//
// Every prompt that touches a saved record runs this file. To recapture the
// profile, on purpose: npm run storage:profile -- --capture
// =============================================================================

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROFILE = path.join(ROOT, 'tests/storageProfile/profile-2.0.0.json');
const profile = JSON.parse(readFileSync(PROFILE, 'utf8'));
const expected = JSON.parse(
  readFileSync(
    path.join(ROOT, 'tests/storageProfile/report-2.0.0.json'),
    'utf8'
  )
);

const inspect = (tree, file, dump) =>
  JSON.parse(
    execFileSync(
      process.execPath,
      [
        path.join(ROOT, 'tests/storageProfile/inspect.mjs'),
        tree,
        file,
        ...(dump ? [dump] : []),
      ],
      { encoding: 'utf8', maxBuffer: 1 << 26 }
    )
      .trim()
      .split('\n')
      .at(-1)
  );

describe('the profile holds everything a 2.0.0 student could have', () => {
  test('every key group in the storage module has a key in it', () => {
    const keys = Object.keys(profile.localStorage);
    // Keys that did not exist in 2.0.0, so no 2.0.0 student could hold one:
    // gravitas_motion (Prompt 155, a one-word preference read by js/quality.js),
    // gravitas_resume (Prompt 163, the one resume record), gravitas_disclosure
    // (Prompt 167, which More sections the reader left open),
    // gravitas_terms (Prompt 168, the courses opened that name a term),
    // gravitas_collections (Prompt 164, saved items and kept collections).
    const SINCE_2_0_0 = [
      'gravitas_collections',
      'gravitas_motion',
      'gravitas_resume',
      'gravitas_disclosure',
      'gravitas_terms',
    ];
    const bare = KEYS.map(([p]) => p).filter(
      p => !SINCE_2_0_0.includes(p) && !keys.some(k => k.startsWith(p))
    );
    expect(bare).toEqual([]);
  });

  test('both IndexedDB databases 2.0.0 fills and a Cache Storage snapshot are there', () => {
    expect(Object.keys(profile.indexedDB).sort()).toEqual([
      'gravitas-archive',
      'gravitas-catalog',
    ]);
    const [name] = Object.keys(profile.cacheStorage);
    expect(name.startsWith('gravitas-')).toBe(true);
  });

  test('the service worker deletes a gravitas- cache that is not the current build', () => {
    const sw = readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
    expect(sw).toContain("name.startsWith('gravitas-') && name !== VERSION");
  });

  test('each key says who wrote it', () => {
    expect(Object.keys(profile.origins).sort()).toEqual(
      Object.keys(profile.localStorage).sort()
    );
  });
});

describe('the tip opens it as 2.0.0 does', () => {
  let tip;
  let dir;
  let rollback;

  beforeAll(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'gravitas-profile-'));
    tip = inspect(ROOT, PROFILE, path.join(dir, 'written-by-tip.json'));
    const old = archiveOld();
    try {
      rollback = inspect(old.tree, path.join(dir, 'written-by-tip.json'));
    } finally {
      old.cleanup();
    }
  }, 120000);

  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  test.each([
    'myWork',
    'progress',
    'experiments',
    'notebook',
    'installed',
    'archive',
  ])('%s is what 2.0.0 reports', section => {
    expect(tip[section]).toEqual(expected[section]);
  });

  test('an export imported into an empty profile reproduces every key a backup carries', () => {
    expect(tip.export).toEqual(expected.export);
    expect(tip.export.ok).toBe(true);
    expect([
      tip.export.missing,
      tip.export.different,
      tip.export.extra,
    ]).toEqual([[], [], []]);
  });

  test('2.0.0 reads what the tip wrote: a rollback loses nothing', () => {
    for (const section of [
      'progress',
      'experiments',
      'notebook',
      'installed',
      'archive',
    ]) {
      expect([section, rollback[section]]).toEqual([
        section,
        expected[section],
      ]);
    }
    expect(rollback.myWork).toEqual(expected.myWork);
  });
});
