import { describe, expect, test } from '@jest/globals';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { COMPAT, FORMATS } from '../../tools/formats.mjs';
import { KIND_DIR } from './harness.js';

// FORMATS.md's compatibility table says, per format, which corpus kind
// exercises its 2.0.0 reader and what that reader does with an unknown field.
// This holds the table to the kinds themselves, so it cannot say what the
// corpus does not measure (matrix.test.js measures the declared value).

const kinds = readdirSync(KIND_DIR)
  .filter(f => f.endsWith('.mjs') && !f.startsWith('_'))
  .map(f => f.replace(/\.mjs$/, ''));
const spec = async kind =>
  (await import(pathToFileURL(path.join(KIND_DIR, `${kind}.mjs`)).href))
    .default;

describe('the compatibility inventory', () => {
  test('every entry is a format in the table, and names a corpus kind', () => {
    const names = new Set(FORMATS.map(f => f.name));
    for (const [name, c] of Object.entries(COMPAT)) {
      expect({ name, listed: names.has(name) }).toEqual({ name, listed: true });
      expect({ name, kind: kinds.includes(c.fixture) }).toEqual({
        name,
        kind: true,
      });
    }
  });

  test('what it says of an unknown field is what the kind declares', async () => {
    for (const [name, c] of Object.entries(COMPAT)) {
      const s = await spec(c.fixture);
      expect({ name, unknown: c.unknown }).toEqual({
        name,
        unknown: s.unknownFields,
      });
    }
  });

  test('every corpus kind is behind a format, or is a record with no format of its own', () => {
    // The catalog's IndexedDB record is a store row, not a versioned file: it
    // holds a capability-package manifest, which has its own row.
    const NO_ROW = ['archive-record'];
    const used = new Set(Object.values(COMPAT).map(c => c.fixture));
    for (const k of kinds.filter(k => !NO_ROW.includes(k)))
      expect({ k, used: used.has(k) }).toEqual({ k, used: true });
  });

  test('the corpus covers each record kind the prompt names', () => {
    for (const k of [
      'course-pack',
      'course-pack-extension',
      'investigation-pack',
      'artifact',
      'ledger-entry',
      'observation',
      'experiment',
      'experiment-store',
      'report-files',
      'assignment-link',
      'share-link',
      'progress-store',
      'progress-backup',
      'capability-package',
      'archive-record',
      'course-home-link',
      'submission-token',
      'submission-results',
    ])
      expect({ k, there: kinds.includes(k) }).toEqual({ k, there: true });
  });
});
