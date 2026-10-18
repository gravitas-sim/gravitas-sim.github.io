import { describe, test, expect } from '@jest/globals';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { KEYS } from '../js/storage/index.js';
import {
  EXPORT_WORDS,
  OWNERSHIP,
  corpusKinds,
  matrix,
  render,
} from '../tools/storage-matrix.mjs';

// =============================================================================
// The storage ownership matrix (Roadmap III, Prompt 146)
// -----------------------------------------------------------------------------
// Every record a student's browser holds has an owner, a migration, an export
// status and a row in the compatibility corpus, and STORAGE.md and My work say
// so from one file. A key, a writer or a corpus row that is missing here fails.
// =============================================================================

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('the ownership file covers every record', () => {
  test('there is exactly one row for each prefix in KEYS', () => {
    expect(OWNERSHIP.records.map(r => r.prefix).sort()).toEqual(
      KEYS.map(([p]) => p).sort()
    );
  });

  test('each row resolves to its own collection and names an owner that exists', async () => {
    for (const r of await matrix()) {
      expect([r.prefix, r.known, r.resolves]).toEqual([r.prefix, true, true]);
      expect([r.prefix, existsSync(path.join(ROOT, r.owner))]).toEqual([
        r.prefix,
        true,
      ]);
    }
  });

  test('each row has a corpus kind that exists, or says why it has none', async () => {
    const kinds = new Set(corpusKinds());
    const rows = [...(await matrix()), ...OWNERSHIP.others];
    for (const r of rows) {
      const id = r.prefix ?? r.where;
      if (r.corpus) expect([id, kinds.has(r.corpus)]).toEqual([id, true]);
      else expect([id, typeof r.corpusWhy]).toEqual([id, 'string']);
    }
  });

  test('each export status is one the page can say', async () => {
    for (const r of [...(await matrix()), ...OWNERSHIP.others]) {
      expect(Object.keys(EXPORT_WORDS)).toContain(r.export);
    }
  });

  test('a durable record is in a collection the backup file carries', async () => {
    for (const r of await matrix()) {
      if (r.export === 'durable') {
        expect([r.prefix, r.collection]).not.toEqual([r.prefix, null]);
      }
    }
  });
});

describe('the direct writers are listed with what they lack', () => {
  test('every one names a file that exists', () => {
    for (const w of OWNERSHIP.writers) {
      expect([w.file, existsSync(path.join(ROOT, w.file))]).toEqual([
        w.file,
        true,
      ]);
    }
  });

  test('every one that cites a measured lack says how much and where', () => {
    for (const w of OWNERSHIP.writers) {
      if (!w.lacks) continue;
      expect(typeof w.lacks.route).toBe('string');
      expect(w.lacks.kb + w.lacks.requests).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('what is generated is current', () => {
  test('STORAGE.md and My work say what the file says', async () => {
    for (const [file, text] of await render()) {
      expect([
        file,
        readFileSync(path.join(ROOT, file), 'utf8') === text,
      ]).toEqual([file, true]);
    }
  });
});
