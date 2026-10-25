import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { BOUNDARY, LINKS } from './boundary.mjs';
import { FORMATS } from '../../tools/formats.mjs';
import { REPO, archiveOld, run } from './harness.js';

// The boundary list (Prompt 134, step 4): what the 2.0.0 readers do with the
// fields later prompts write. Prompt 176 settled it for 3.0.0: for each entry
// that is carried, the payload as the current writer makes it is handed to the
// 2.0.0 reader (the rollback rehearsal), which says what boundary.mjs records,
// and to the current reader, which reads it. See boundary.mjs.

let old;
beforeAll(() => {
  old = archiveOld();
});
afterAll(() => old?.cleanup());

const clone = x => JSON.parse(JSON.stringify(x));

/** What the 2.0.0 reader says of the fixture with the planned field added. */
async function outcome(entry) {
  const made = run(old.tree, entry.kind, 'make');
  expect(made.ok).toBe(true);
  const variant = await entry.mutate(made.value);
  const base = run(old.tree, entry.kind, 'read', made.value);
  const read = run(old.tree, entry.kind, 'read', variant);
  expect(read.ok).toBe(true);
  expect(base.value.accepted).toBe(true);
  if (!read.value.accepted)
    return { outcome: 'refused', message: read.value.problems.join('; ') };
  return { outcome: 'ignored', message: '' };
}

describe.each(BOUNDARY)('$id (Prompt $prompt)', entry => {
  test(`the 2.0.0 reader ${entry.expect} it`, async () => {
    const got = await outcome(entry);
    expect({ id: entry.id, outcome: got.outcome }).toEqual({
      id: entry.id,
      outcome: entry.expect,
    });
  });
});

/** The version a written payload says: its formatVersion, or its link prefix. */
const versionOf = doc =>
  doc.formatVersion ??
  Number(/^#?[a-z](\d+)/.exec(doc.hash ?? doc.fragment)?.[1]);

// The rollback rehearsal (Prompt 176): a payload the current build wrote,
// opened by the 2.0.0 build of the corpus, per record.
describe.each(BOUNDARY.filter(b => b.boundary))(
  'rollback: $id',
  ({ boundary: b, kind, mutate }) => {
    let made;
    let written;
    beforeAll(async () => {
      made = run(old.tree, kind, 'make').value;
      written = await b.write(await mutate(made));
    });

    test('the writer says the version the list names', () => {
      expect(versionOf(written)).toBe(b.to);
    });

    test('a payload that needs nothing new is written as 2.0.0 wrote it', async () => {
      expect(await b.write(made)).toEqual(made);
      expect(versionOf(made)).toBe(b.from);
    });

    test(`a 2.0.0 build is handed it and ${b.rollback}`, () => {
      const read = run(old.tree, kind, 'read', written);
      expect(read.ok).toBe(true);
      if (b.rollback === 'refused') {
        expect(read.value.accepted).toBe(false);
        expect(read.value.problems.join('; ')).toContain(b.says);
      } else {
        expect(b.rollback).toBe('opens-without');
        expect(read.value.accepted).toBe(true);
      }
    });

    test('the current build reads it, and a rewrite reads the same', () => {
      const read = run(REPO, kind, 'read', written);
      expect(read.ok).toBe(true);
      expect(read.value.accepted).toBe(true);
      const again = run(REPO, kind, 'rewrite', written);
      expect(again.ok).toBe(true);
      expect(run(REPO, kind, 'read', again.value).value).toEqual(read.value);
    });
  }
);

describe('what a 2.0.0 artifact reader is given (Prompt 150)', () => {
  test('legacyView turns every state it refuses into one it opens, and lists the loss', async () => {
    const { legacyView } = await import('../../js/platform/artifact.js');
    const made = run(old.tree, 'artifact', 'make');
    const extended = clone(made.value);
    extended.quantities = [
      {
        id: 'a',
        value: 1,
        unit: 'd',
        origin: 'measured',
        uncertainty: { kind: 'not-constrained' },
      },
      {
        id: 'b',
        value: 2,
        unit: 'd',
        origin: 'measured',
        uncertainty: { kind: 'limit', bound: 'upper', basis: 'data' },
      },
      {
        id: 'c',
        value: 3,
        unit: 'd',
        origin: 'fitted',
        uncertainty: { kind: 'sigma', sigma: 0.1, basis: 'data' },
        correlatedWith: [{ id: 'a', rho: 0.3 }],
      },
    ];
    extended.fit = {
      model: { id: 'm', version: '1' },
      parameters: ['a', 'b', 'c'],
    };
    const refused = run(old.tree, 'artifact', 'read', extended);
    expect(refused.value.accepted).toBe(false);
    const view = legacyView(extended);
    const read = run(old.tree, 'artifact', 'read', view);
    expect(read.value.accepted).toBe(true);
    expect(view.warnings).toEqual([
      'extended:a:not-constrained',
      'extended:b:limit',
    ]);
    expect(view.fit).toBeUndefined();
  });
});

describe('the list', () => {
  test('covers every planned extension the prompt names', () => {
    const prompts = new Set(BOUNDARY.map(b => b.prompt));
    // R12's package field (164), 163's resume record, 150's envelope extension,
    // 179's workspace marks and 265's ensemble fields.
    for (const p of [150, 163, 164, 179, 265])
      expect(prompts.has(p)).toBe(true);
  });

  test('every entry is carried by the boundary or says why not', () => {
    const formats = new Set(FORMATS.map(f => f.name.replace(/\s*\(.*\)$/, '')));
    for (const e of BOUNDARY) {
      expect({ id: e.id, has: Boolean(e.boundary || e.note) }).toEqual({
        id: e.id,
        has: true,
      });
      if (!e.boundary) continue;
      const b = e.boundary;
      expect(formats.has(b.format)).toBe(true);
      expect(b.to >= b.from).toBe(true);
      expect(['refused', 'opens-without']).toContain(b.rollback);
      expect(typeof b.rule).toBe('string');
      expect(typeof b.requires).toBe('string');
      expect(typeof b.write).toBe('function');
      expect(b.rollback === 'refused' ? typeof b.says : b.says).toBe(
        b.rollback === 'refused' ? 'string' : null
      );
    }
  });

  test('the link kinds that changed are rows of the format table', () => {
    const names = new Set(FORMATS.map(f => f.name));
    for (const l of LINKS) expect(l.link && l.versions && l.old).toBeTruthy();
    for (const n of ['course home link', 'investigation link'])
      expect(names.has(n)).toBe(true);
  });

  test('every entry names a corpus kind', async () => {
    const { readdirSync } = await import('node:fs');
    const kinds = new Set(
      readdirSync(new URL('./kinds/', import.meta.url))
        .filter(f => f.endsWith('.mjs') && !f.startsWith('_'))
        .map(f => f.replace(/\.mjs$/, ''))
    );
    for (const b of BOUNDARY) expect(kinds.has(b.kind)).toBe(true);
  });
});
