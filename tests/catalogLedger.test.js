// The catalog ledger: one row per shipped activity, and a check that fails
// when the ledger and what ships disagree.
//
// Two kinds of test. The failure shapes are tested on small inventories built
// by hand, through the pure checkLedger(), so each one fails for exactly one
// reason. The facts about the real catalog (the baseline counts, the scene
// classes, the scenario owners) are read from the committed ledger, and the
// real tree is checked by running the tool itself in a child process, which is
// how `npm run ledger:check` runs it and keeps the lesson imports out of the
// Jest VM.
import { describe, test, expect } from '@jest/globals';
import { execFileSync } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  checkLedger,
  contentHash,
  SANDBOX_SCENARIO_OWNERS,
} from '../tools/catalog-ledger.mjs';

const ledger = JSON.parse(readFileSync('docs/catalog-ledger.json', 'utf8'));
const library = JSON.parse(readFileSync('library/library.json', 'utf8'));
const count = (list, f) => list.filter(f).length;

/** A closed-over row for a hand-built inventory. */
const row = (id, over = {}) => ({
  id,
  kind: 'investigation',
  format: 'lesson',
  source: [],
  shadows: [],
  instrument_files: [],
  owner: 330,
  audit: 'FOCUSED',
  scene_class: null,
  limits: null,
  open_items: [],
  editorial: 'OPEN',
  redesign: 'OPEN',
  reason: '',
  walk: 'NOT RUN',
  hash: null,
  ...over,
});
const inventoryOf = (ids, scenarios = []) => ({
  rows: ids.map(id => ({ id })),
  scenarios,
  words: {},
});
const codes = problems => problems.map(p => p.code);
const none = () => '';

describe('the baseline the ledger reproduces', () => {
  test('146 investigations: 124 lessons, 10 Observatory, 9 3-D, 3 mission', () => {
    const inv = ledger.rows.filter(r => r.kind === 'investigation');
    expect(inv).toHaveLength(146);
    for (const [format, n] of [
      ['lesson', 124],
      ['observatory', 10],
      ['lab3d', 9],
      ['mission', 3],
    ])
      expect(count(inv, r => r.format === format)).toBe(n);
  });

  test('6 activity entries, 4 bench labs, 6 courses, 11 sequences, 69 scenarios', () => {
    expect(count(ledger.rows, r => r.kind === 'activity')).toBe(6);
    expect(count(ledger.rows, r => r.kind === 'experiment')).toBe(4);
    expect(count(ledger.rows, r => r.kind === 'course')).toBe(6);
    expect(count(ledger.rows, r => r.kind === 'sequence')).toBe(11);
    expect(ledger.scenarios).toHaveLength(69);
    expect(count(ledger.scenarios, s => s.format === 'sandbox')).toBe(61);
    expect(count(ledger.scenarios, s => s.format === 'system3d')).toBe(8);
  });

  test('the six activity entries are three activities in six formats', () => {
    const ids = ledger.rows.filter(r => r.kind === 'activity').map(r => r.id);
    expect(new Set(ids.map(i => i.split('/')[0])).size).toBe(3);
    expect(ledger.notes.join(' ')).toMatch(/six formats of three activities/);
  });

  test('the seven courses are six rows and a community pack listed as out of scope', () => {
    const packs = library.entries.filter(e => e.kind === 'course');
    expect(packs).toHaveLength(7);
    const out = ledger.outOfScope.filter(o => o.id);
    expect(out.map(o => o.id)).toEqual(['course:community.pulsating-stars']);
    expect(ledger.notes.join(' ')).toMatch(/six rows here and one entry/);
  });

  test('the Library holds 16 datasets, none of them a row', () => {
    expect(count(library.entries, e => e.kind === 'dataset')).toBe(16);
    expect(ledger.rows.some(r => r.kind === 'dataset')).toBe(false);
  });

  test('the scene classes of the 124 lessons are 26, 2, 2, 94 and 0', () => {
    const lessons = ledger.rows.filter(r => r.format === 'lesson');
    const by = c => count(lessons, r => r.scene_class === c);
    expect(by('setup scenario')).toBe(26);
    expect(by('engine-integrated stage')).toBe(2);
    expect(by('model-owned stage')).toBe(2);
    expect(by('portrait or backdrop')).toBe(94);
    expect(by('no scene')).toBe(0);
    expect(lessons.every(r => r.scene_class)).toBe(true);
  });

  test('every row is seeded with its owning prompt, and the questions are empty', () => {
    for (const r of ledger.rows) {
      expect([r.id, Number.isInteger(r.owner)]).toEqual([r.id, true]);
      expect(Object.values(r.questions).every(v => v === '')).toBe(true);
    }
    expect(
      ledger.rows
        .filter(r => r.kind === 'investigation')
        .every(r => ['STRONG', 'FOCUSED', 'REDESIGN'].includes(r.audit))
    ).toBe(true);
  });

  test('the scenario sheet is owned by 462 to 466 and 482, and 494 for the 3-D systems', () => {
    const owners = {};
    for (const s of ledger.scenarios)
      owners[s.owner] = (owners[s.owner] || 0) + 1;
    expect(owners).toEqual({
      462: 11,
      463: 11,
      464: 7,
      465: 9,
      466: 11,
      482: 12,
      494: 8,
    });
    for (const s of ledger.scenarios) expect(s.disposition).toBe('OPEN');
  });
});

describe('the committed ledger against the real tree', () => {
  test('npm run ledger:check passes on the shipped inventory', () => {
    const out = execFileSync('node', ['tools/catalog-ledger.mjs', '--check'], {
      encoding: 'utf8',
    });
    expect(out).toMatch(/173 rows, 69 scenarios/);
  }, 60000);
});

describe('rows against the inventory', () => {
  test('an activity with no row fails', () => {
    const p = checkLedger({
      ledger: { rows: [row('investigation:a')], scenarios: [] },
      inventory: inventoryOf(['investigation:a', 'investigation:b']),
      read: none,
    });
    expect(codes(p)).toEqual(['no-row']);
    expect(p[0].id).toBe('investigation:b');
  });

  test('a row with no activity fails', () => {
    const p = checkLedger({
      ledger: {
        rows: [row('investigation:a'), row('investigation:gone')],
        scenarios: [],
      },
      inventory: inventoryOf(['investigation:a']),
      read: none,
    });
    expect(codes(p)).toEqual(['no-activity']);
  });

  test('a row without an owning prompt, and one id twice, fail', () => {
    const p = checkLedger({
      ledger: {
        rows: [
          row('investigation:a', { owner: null }),
          row('investigation:b'),
          row('investigation:b'),
        ],
        scenarios: [],
      },
      inventory: inventoryOf(['investigation:a', 'investigation:b']),
      read: none,
    });
    expect(codes(p).sort()).toEqual(['duplicate-row', 'no-owner']);
  });

  test('a status outside the vocabulary, and a deferral with no reason, fail', () => {
    const p = checkLedger({
      ledger: {
        rows: [
          row('investigation:a', { editorial: 'DONE' }),
          row('investigation:b', {
            redesign: 'DEFERRED',
            hash: contentHash(row('x'), { read: none }),
          }),
        ],
        scenarios: [],
      },
      inventory: inventoryOf(['investigation:a', 'investigation:b']),
      read: none,
    });
    expect(codes(p).filter(c => c === 'bad-value')).toHaveLength(2);
  });
});

describe('a closed row and its content hash', () => {
  const dir = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'ledger-')));
  mkdirSync(path.join(dir, 'lessons'));
  const file = 'lessons/a.js';
  writeFileSync(path.join(dir, file), 'export default { steps: [1, 2, 3] };\n');
  const read = f => readFileSync(path.join(dir, f));
  const open = row('investigation:a', { source: [file] });
  const closed = {
    ...open,
    editorial: 'REVISED',
    redesign: 'REVIEWED CLEAR',
    hash: contentHash(open, { read, words: 'w' }),
  };
  const run = r =>
    checkLedger({
      ledger: { rows: [r], scenarios: [] },
      inventory: {
        ...inventoryOf(['investigation:a']),
        words: { 'investigation:a': 'w' },
      },
      read,
    });

  test('a closed row whose files are unchanged passes', () => {
    expect(run(closed)).toEqual([]);
  });

  test('a closed row with no recorded hash fails', () => {
    expect(codes(run({ ...closed, hash: null }))).toEqual(['hash-missing']);
  });

  test('a lesson file edit with no ledger update fails', () => {
    writeFileSync(
      path.join(dir, file),
      'export default { steps: [1, 2, 3, 4] };\n'
    );
    const p = run(closed);
    expect(codes(p)).toEqual(['hash-stale']);
    // The pull request that made the edit re-records the hash and passes.
    const rerecorded = {
      ...closed,
      hash: contentHash(open, { read, words: 'w' }),
    };
    expect(run(rerecorded)).toEqual([]);
    rmSync(dir, { recursive: true, force: true });
  });

  test('a change to the Library words of an entry also stales it', () => {
    const p = checkLedger({
      ledger: { rows: [closed], scenarios: [] },
      inventory: {
        ...inventoryOf(['investigation:a']),
        words: { 'investigation:a': 'other words' },
      },
      read: () => 'export default { steps: [1, 2, 3, 4] };\n',
    });
    expect(codes(p)).toEqual(['hash-stale']);
  });

  test('an open row never needs a hash', () => {
    expect(run(open)).toEqual([]);
  });
});

describe('the scenarios sheet', () => {
  const sc = (id, format = 'sandbox') => ({ id, format });
  const srow = (id, owner, over = {}) => ({
    id,
    owner,
    disposition: 'OPEN',
    ...over,
  });
  const check = (rows, shipped) =>
    checkLedger({
      ledger: { rows: [], scenarios: rows },
      inventory: inventoryOf([], shipped),
      read: none,
    });

  test('a scenario with no row fails', () => {
    const p = check(
      [srow('scenario:a', 462)],
      [sc('scenario:a'), sc('scenario:b')]
    );
    expect(codes(p)).toEqual(['scenario-no-row']);
  });

  test('a row with no scenario fails', () => {
    const p = check(
      [srow('scenario:a', 462), srow('scenario:gone', 463)],
      [sc('scenario:a')]
    );
    expect(codes(p)).toEqual(['scenario-no-scenario']);
  });

  test('an owner outside 462 to 466 and 482 fails, for 3-D systems 494 is the only owner', () => {
    for (const owner of [461, 467, 481, 483, 494, null])
      expect(
        codes(check([srow('scenario:a', owner)], [sc('scenario:a')]))
      ).toEqual(['scenario-bad-owner']);
    for (const owner of SANDBOX_SCENARIO_OWNERS)
      expect(check([srow('scenario:a', owner)], [sc('scenario:a')])).toEqual(
        []
      );
    expect(
      check([srow('scenario:3d', 494)], [sc('scenario:3d', 'system3d')])
    ).toEqual([]);
    expect(
      codes(check([srow('scenario:3d', 462)], [sc('scenario:3d', 'system3d')]))
    ).toEqual(['scenario-bad-owner']);
  });

  test('a scenario owned twice fails, as two rows or as two owners', () => {
    const twoRows = check(
      [srow('scenario:a', 462), srow('scenario:a', 463)],
      [sc('scenario:a')]
    );
    expect(codes(twoRows)).toContain('scenario-owned-twice');
    const twoOwners = check(
      [srow('scenario:a', [462, 463])],
      [sc('scenario:a')]
    );
    expect(codes(twoOwners)).toEqual(['scenario-owned-twice']);
  });
});

describe('pointers into the tree and the register', () => {
  test('a limits fixture, a leg or a register row that has gone fails', () => {
    const limited = (limits, openItems = []) =>
      checkLedger({
        ledger: {
          rows: [row('investigation:a', { limits, open_items: openItems })],
          scenarios: [],
        },
        inventory: inventoryOf(['investigation:a']),
        read: f => {
          if (f === 'fx.json') return '{"failed":[{"id":"B1"}]}';
          throw new Error('no such file');
        },
        registerIds: new Set(['D-R10-1']),
      });
    const fixture = legs => ({
      labels: ['x'],
      failed_legs: [{ fixture: 'fx.json', legs }],
      register: ['D-R10-1'],
    });
    expect(limited(fixture(['failed:B1']))).toEqual([]);
    expect(codes(limited(fixture(['failed:B9'])))).toEqual(['pointer']);
    expect(
      codes(
        limited({
          labels: [],
          failed_legs: [{ fixture: 'gone.json', legs: [] }],
          register: [],
        })
      )
    ).toEqual(['pointer']);
    expect(
      codes(limited(null, [{ ref: 'D-R10-999', owner: 1, note: '' }]))
    ).toEqual(['pointer']);
  });

  test('every register row and fixture the committed limits name exists', () => {
    const limited = ledger.rows.filter(r => r.limits);
    expect(limited.length).toBeGreaterThan(15);
    for (const r of limited) {
      expect(r.limits.register.length).toBeGreaterThan(0);
      for (const fx of r.limits.failed_legs)
        expect(readFileSync(fx.fixture, 'utf8')).toContain('"id"');
    }
  });
});
