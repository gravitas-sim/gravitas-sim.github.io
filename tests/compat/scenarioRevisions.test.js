import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import path from 'node:path';
import { REPO, V3_COMMIT, OLD_COMMIT, archiveOld, run } from './harness.js';

// =============================================================================
// A world at revision 2 of a scenario, against the readers of 2.0.0 and 3.0
// -----------------------------------------------------------------------------
// SCENARIO_REVISIONS.md. The records are made by the current build with a fixture
// registered (the registry ships empty), then read by each archived build, which
// has no registry and holds revision 1 as its only row. The rollback corpus:
//
//   a link (version 3)          refused, in the existing "newer version" words
//   an experiment store record  accepted, and it restores the same settings and
//   an experiment manifest      bodies (form (i): full, and every setting in d)
//   the three pack formats      refused, naming the key they do not know
//
// and a control, the capture a writer without form (i) would make, which an old
// reader does restore differently (settings from revision 1's row).
// =============================================================================

const DIR = path.join(REPO, 'tests', 'compat', 'scenario-revisions');
const read = (tree, what, doc) =>
  run(tree, 'records', 'read', { what, doc }, DIR);

const BUILDS = [
  ['2.0.0', OLD_COMMIT],
  ['3.0', V3_COMMIT],
];

let made;
beforeAll(() => {
  const m = run(REPO, 'records', 'make', undefined, DIR);
  expect(m).toMatchObject({ ok: true });
  made = m.value;
});

/** The packs, each with the key a revision 2 file would carry. */
const withKey = {
  scenarioPack: doc => ({ ...doc, scenarioRevision: 2 }),
  investigationPack: doc => {
    const out = JSON.parse(JSON.stringify(doc));
    out.steps[0].setup.revision = 2;
    return out;
  },
  coursePack: doc => {
    const out = JSON.parse(JSON.stringify(doc));
    out.units.flatMap(u => u.items).find(i => i.kind === 'scenario').revision =
      2;
    return out;
  },
};

describe('the current build', () => {
  test('reads every record it writes, and rebuilds the same settings and bodies', () => {
    expect(read(REPO, 'link', made.link).value.value).toEqual({
      s: 'pulsar-system',
      r: 2,
    });
    for (const what of ['store', 'manifest']) {
      const r = read(REPO, what, made[what]);
      expect(r.ok && r.value.accepted).toBe(true);
      expect(r.value.value.settings).toEqual(made.expected.settings);
      expect(r.value.value.bodies).toEqual(made.expected.bodies);
    }
    for (const what of Object.keys(withKey)) {
      const r = read(REPO, what, withKey[what](made[what]));
      expect({ what, accepted: r.value.accepted, p: r.value.problems }).toEqual(
        {
          what,
          accepted: true,
          p: undefined,
        }
      );
    }
  });

  test('a capture with its stamp and every setting is not the delta a naive writer makes', () => {
    const naive = read(REPO, 'store', made.naiveStore);
    // Read as text, with no stamp, it means revision 1 and gets that row.
    expect(naive.value.value.settings.trail_length).not.toBe(
      made.expected.settings.trail_length
    );
  });
});

describe.each(BUILDS)(
  '%s, handed what the current build writes',
  (name, commit) => {
    let old;
    beforeAll(() => {
      old = archiveOld(commit);
    });
    afterAll(() => old?.cleanup());

    test('refuses a version 3 link in the words it already has', () => {
      const r = read(old.tree, 'link', made.link);
      expect(r.ok).toBe(true);
      expect(r.value.accepted).toBe(false);
      expect(r.value.problems.join('; ')).toContain(
        'This link was made by a newer version of Gravitas'
      );
    });

    test.each(['store', 'manifest'])(
      'reads the experiment %s and rebuilds the same settings and bodies, whatever row it holds',
      what => {
        const r = read(old.tree, what, made[what]);
        expect(r.ok).toBe(true);
        expect(r.value.accepted).toBe(true);
        expect(r.value.value.settings).toEqual(made.expected.settings);
        expect(r.value.value.bodies).toEqual(made.expected.bodies);
      }
    );

    test('the control: a capture written as a delta from revision 2 is rebuilt from the old row, so form (i) is what keeps it equal', () => {
      const r = read(old.tree, 'store', made.naiveStore);
      expect(r.value.accepted).toBe(true);
      expect(r.value.value.settings.trail_length).not.toBe(
        made.expected.settings.trail_length
      );
    });

    test.each([
      ['scenarioPack', /scenarioRevision|not a scenario-pack field/],
      ['investigationPack', /revision|setup field/],
      ['coursePack', /revision/],
    ])(
      'refuses the %s that names a revision, and reads it without',
      (what, words) => {
        const base = read(old.tree, what, made[what]);
        expect(base.value.accepted).toBe(true);
        const variant = read(old.tree, what, withKey[what](made[what]));
        expect(variant.ok).toBe(true);
        expect(variant.value.accepted).toBe(false);
        expect(variant.value.problems.join('; ')).toMatch(words);
      }
    );
  }
);
