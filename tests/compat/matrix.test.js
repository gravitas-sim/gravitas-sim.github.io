import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { KIND_DIR, REPO, archiveOld, run } from './harness.js';

// =============================================================================
// The 2.0.0 reader corpus (Prompt 134)
// -----------------------------------------------------------------------------
// For each record kind, the same spec (tests/compat/kinds/<kind>.mjs) builds and
// reads records with the 2.0.0 code and with the current code. A writer may
// change only when its row here is green for the change (FORMATS.md, "The
// compatibility policy"), and where a change makes the old reader refuse or
// misread, that is a major-version boundary.
//
// Rows, per kind:
//   old->new       the current reader reads what 2.0.0 wrote, losslessly
//   new->old       what the 2.0.0 reader says of what the current writer
//                  makes: accepted, or refused with the message recorded here.
//                  This is also the rollback row (a new record read by the old
//                  build after a rollback) and the mixed-tab / old-cache row (an
//                  old build's cached code reading a link a new build wrote).
//   round trip     read with the current reader, rewrite, read with 2.0.0: the
//                  same reading as the original
//   capabilities   the capability a record requires of its reader, declared
// =============================================================================

const kinds = readdirSync(KIND_DIR)
  .filter(f => f.endsWith('.mjs') && !f.startsWith('_'))
  .map(f => f.replace(/\.mjs$/, ''))
  .sort();

let old;
beforeAll(() => {
  old = archiveOld();
});
afterAll(() => old?.cleanup());

const spec = async kind =>
  (await import(pathToFileURL(path.join(KIND_DIR, `${kind}.mjs`)).href))
    .default;

describe.each(kinds)('%s', kind => {
  test('the 2.0.0 reader reads what 2.0.0 wrote', async () => {
    const made = run(old.tree, kind, 'make');
    expect(made.ok).toBe(true);
    const read = run(old.tree, kind, 'read', made.value);
    expect(read.ok).toBe(true);
    expect(read.value.accepted).toBe(true);
  });

  test('old -> new: the current reader reads it, losslessly', async () => {
    const made = run(old.tree, kind, 'make').value;
    const before = run(old.tree, kind, 'read', made).value;
    const after = run(REPO, kind, 'read', made);
    expect(after.ok).toBe(true);
    expect(after.value).toEqual(before);
  });

  test('new -> old: what 2.0.0 says of the current writer (and so of a rollback)', async () => {
    const s = await spec(kind);
    const made = run(REPO, kind, 'make');
    expect(made.ok).toBe(true);
    const read = run(old.tree, kind, 'read', made.value);
    expect(read.ok).toBe(true);
    expect(read.value.accepted ? 'accepts' : 'refuses').toBe(s.newToOld);
    if (s.newToOld === 'refuses') {
      expect(read.value.problems.join('; ')).toMatch(s.refusal);
    }
  });

  test('round trip: read, rewritten by the current code, read again by 2.0.0', async () => {
    const made = run(old.tree, kind, 'make').value;
    const before = run(old.tree, kind, 'read', made).value;
    const rewritten = run(REPO, kind, 'rewrite', made);
    expect(rewritten.ok).toBe(true);
    const after = run(old.tree, kind, 'read', rewritten.value);
    expect(after.value).toEqual(before);
  });

  test('an unknown top-level field: what 2.0.0 does, as declared', async () => {
    const s = await spec(kind);
    expect(['refused', 'ignored', 'n/a']).toContain(s.unknownFields);
    if (s.unknownFields === 'n/a') return;
    const made = run(old.tree, kind, 'make').value;
    const read = run(old.tree, kind, 'read', { ...made, __compat_probe: 1 });
    expect(read.ok).toBe(true);
    expect(read.value.accepted ? 'ignored' : 'refused').toBe(s.unknownFields);
  });

  test('capabilities: the record declares what it needs of a reader', async () => {
    const s = await spec(kind);
    expect(s.capabilities).toBeTruthy();
    expect(s.format).toBeTruthy();
  });
});
