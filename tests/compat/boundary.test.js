import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { BOUNDARY } from './boundary.mjs';
import { archiveOld, run } from './harness.js';

// The boundary list (Prompt 134, step 4): what the 2.0.0 readers do with the
// fields later prompts plan to write. It is the content of Prompt 176 and
// decides whether 177 is 3.0.0. See boundary.mjs for the two outcomes.

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
  const variant = entry.mutate(made.value);
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
