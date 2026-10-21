// =============================================================================
// Translation freshness, the glossary's labels, and the English-only surfaces
// -----------------------------------------------------------------------------
// Prompt 156. The ledger logic is pure and is tried on small tables. The
// end-to-end cases run the real tool in its own process against a copy of the
// real ledger with one row altered, which is exactly what an English edit looks
// like to it, and read the exit code and the sentence it prints: a test that
// reached into the tool's functions could pass while the gate did not.
// =============================================================================

import { execFileSync, spawnSync } from 'node:child_process';
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  GRACE_DAYS,
  daysBetween,
  digest,
  drift,
  evaluate,
  formatRow,
  parseRow,
  plan,
} from '../tools/i18n-ledger.mjs';
import { shadowPairs } from '../tools/i18n-sources.mjs';
import {
  accentVariants,
  checkLabels,
  terminology,
} from '../tools/i18n-labels.mjs';
import { checkSurfaces } from '../tools/i18n-surfaces.mjs';
import { shortHash } from '../js/assignments/assignment.js';
import { digest as composerDigest } from '../js/composer/compile.js';
import { translationState } from '../js/course/review.js';
import { mergeTranslation } from '../js/data/investigations/i18n.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const scratch = [];
const tempDir = () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'gravitas-freshness-'));
  scratch.push(dir);
  return dir;
};
afterAll(() =>
  scratch.forEach(d => rmSync(d, { recursive: true, force: true }))
);

const row = (key, en, es) => ({ key, en, es });
const stamped = (rows, today = '2026-01-01') => plan(rows, {}, today);

describe('one digest for every content type', () => {
  test('the ledger, the composer and the course review digest the same way', () => {
    for (const text of [
      '',
      'Orbit',
      'Kepler’s third law: P² ∝ a³',
      'línea\nnueva',
    ]) {
      expect(digest(text)).toBe(composerDigest(text));
      expect(digest(text)).toBe(shortHash(text));
    }
    expect(digest('Orbit')).toMatch(/^[0-9a-f]{8}$/);
  });

  test('a pack text is judged by its own esOf, with the digest the ledger uses', () => {
    const v = { en: 'Orbit', es: 'Órbita', esOf: digest('Orbit') };
    expect(translationState(v, 'es')).toBe('done');
    expect(translationState({ ...v, en: 'Orbits' }, 'es')).toBe('stale');
  });
});

describe('rows', () => {
  test('a row survives writing and reading', () => {
    const r = {
      en: ['b0000000', 'a0000000'],
      es: 'c0000000',
      since: '2026-02-03',
    };
    expect(formatRow(r)).toBe('a0000000,b0000000:c0000000@2026-02-03');
    expect(parseRow(formatRow(r))).toEqual({
      ...r,
      en: ['a0000000', 'b0000000'],
    });
    expect(parseRow('not a row')).toBeNull();
    expect(parseRow('a0000000:c0000000')).toEqual({
      en: ['a0000000'],
      es: 'c0000000',
      since: null,
    });
  });

  test('whole days between ISO dates, across a month end', () => {
    expect(daysBetween('2026-01-31', '2026-02-14')).toBe(14);
    expect(daysBetween('2026-03-01', '2026-03-01')).toBe(0);
  });
});

describe('the states of an entry', () => {
  const base = [row('a', 'Orbit', 'Órbita'), row('b', 'Mass', 'Masa')];

  test('an entry stamped against today’s English is fresh', () => {
    const ledger = stamped(base);
    const s = evaluate(base, ledger, '2026-01-02');
    expect(s.fresh).toEqual(['a', 'b']);
    expect(drift(ledger, plan(base, ledger, '2026-01-02'))).toEqual([]);
  });

  test('English that moved under an unchanged translation is stale, not fresh', () => {
    const ledger = stamped(base);
    const moved = [row('a', 'Orbits', 'Órbita'), base[1]];
    const s = evaluate(moved, ledger, '2026-01-02');
    expect(s.stale.map(x => x.key)).toEqual(['a']);
    expect(s.fresh).toEqual(['b']);
    // Not recorded yet: the ledger is not what --write would leave.
    expect(drift(ledger, plan(moved, ledger, '2026-01-02'))).toEqual(['a']);
  });

  test('writing records the day it was first seen and never clears it', () => {
    const ledger = stamped(base);
    const moved = [row('a', 'Orbits', 'Órbita'), base[1]];
    const day1 = plan(moved, ledger, '2026-01-02');
    expect(parseRow(day1.a).since).toBe('2026-01-02');
    // Writing again on a later day keeps the first date and the old digests.
    const day9 = plan(moved, day1, '2026-01-10');
    expect(day9.a).toBe(day1.a);
    expect(parseRow(day9.a).en).toEqual([digest('Orbit')]);
    expect(evaluate(moved, day9, '2026-01-10').stale).toHaveLength(1);
  });

  test('the grace period is committed, inclusive of its last day', () => {
    expect(GRACE_DAYS).toBe(14);
    const ledger = stamped(base);
    const moved = [row('a', 'Orbits', 'Órbita'), base[1]];
    const recorded = plan(moved, ledger, '2026-01-02');
    expect(evaluate(moved, recorded, '2026-01-16').expired).toHaveLength(0);
    expect(evaluate(moved, recorded, '2026-01-16').stale).toHaveLength(1);
    expect(
      evaluate(moved, recorded, '2026-01-17').expired.map(x => x.key)
    ).toEqual(['a']);
  });

  test('an edited translation is the translator reading the new English', () => {
    const ledger = stamped(base);
    const both = [row('a', 'Orbits', 'Órbitas'), base[1]];
    expect(evaluate(both, ledger, '2026-01-02').unrecorded).toEqual(['a']);
    const next = plan(both, ledger, '2026-01-02');
    expect(evaluate(both, next, '2026-01-02').fresh).toEqual(['a', 'b']);
    expect(parseRow(next.a).since).toBeNull();
  });

  test('a harmless English change is confirmed on purpose, and only for that key', () => {
    const ledger = stamped(base);
    const moved = [row('a', 'Orbit.', 'Órbita'), row('b', 'Masses', 'Masa')];
    const next = plan(moved, ledger, '2026-01-02', ['a']);
    expect(evaluate(moved, next, '2026-01-02').fresh).toEqual(['a']);
    expect(evaluate(moved, next, '2026-01-02').stale.map(x => x.key)).toEqual([
      'b',
    ]);
  });

  test('new entries and removed ones both have to reach the ledger', () => {
    const ledger = stamped(base);
    const grown = [...base, row('c', 'Radius', 'Radio')];
    expect(evaluate(grown, ledger, '2026-01-02').unrecorded).toEqual(['c']);
    const shrunk = [base[0]];
    expect(evaluate(shrunk, ledger, '2026-01-02').orphan).toEqual(['b']);
    expect(drift(ledger, plan(shrunk, ledger, '2026-01-02'))).toEqual(['b']);
  });

  test('a row in no known shape is reported, not guessed at', () => {
    expect(
      evaluate(
        base,
        {
          a: 'oops',
          b: formatRow({ en: [digest('Mass')], es: digest('Masa') }),
        },
        '2026-01-02'
      ).bad
    ).toEqual(['a']);
  });

  test('one Spanish text standing beside two English ones (the shared shell) is judged as a set', () => {
    const shell = [
      row('k', 'Library', 'Biblioteca'),
      row('k', 'Libraries', 'Biblioteca'),
    ];
    const ledger = stamped(shell);
    expect(evaluate(shell, ledger, '2026-01-02').fresh).toEqual(['k']);
    const moved = [
      row('k', 'Library', 'Biblioteca'),
      row('k', 'The library', 'Biblioteca'),
    ];
    expect(evaluate(moved, ledger, '2026-01-02').stale.map(x => x.key)).toEqual(
      ['k']
    );
  });
});

describe('the lesson shadows are read the way the engine lays them', () => {
  const english = {
    id: 'lesson',
    title: 'Kepler',
    steps: [
      {
        sid: 'one',
        title: 'One',
        body: 'First',
        options: ['a', 'b'],
        probe: () => 'machinery',
      },
      { sid: 'two', title: 'Two', body: 'Second' },
    ],
  };
  const spanish = {
    id: 'leccion',
    title: 'Kepler',
    steps: [
      { sid: 'uno', title: 'Uno', options: ['x', null] },
      null,
      { title: 'extra' },
    ],
    extra: 'not a key of the English',
  };
  const STRUCTURAL = new Set(['id', 'sid']);

  test('pairs are exactly the strings the merge would take from the shadow', () => {
    const pairs = [];
    shadowPairs(english, spanish, STRUCTURAL, pairs, 'k');
    expect(pairs.map(p => [p.key, p.en, p.es])).toEqual([
      ['k/title', 'Kepler', 'Kepler'],
      ['k/steps[0].title', 'One', 'Uno'],
      ['k/steps[0].options[0]', 'a', 'x'],
    ]);
    const merged = mergeTranslation(english, spanish);
    expect(merged.steps[0].title).toBe('Uno');
    expect(merged.steps[0].options).toEqual(['x', 'b']);
    expect(merged.id).toBe('lesson');
    expect(merged.steps[1].body).toBe('Second');
  });

  test('a step inserted into the English slides every later pair, loudly', () => {
    const pairs = [];
    shadowPairs(
      english,
      { steps: [{ title: 'Uno' }, { title: 'Dos' }] },
      STRUCTURAL,
      pairs,
      'k'
    );
    const ledger = stamped(pairs);
    const inserted = {
      ...english,
      steps: [english.steps[0], { sid: 'new', title: 'New' }, english.steps[1]],
    };
    const after = [];
    shadowPairs(
      inserted,
      { steps: [{ title: 'Uno' }, { title: 'Dos' }] },
      STRUCTURAL,
      after,
      'k'
    );
    expect(evaluate(after, ledger, '2026-01-02').stale.map(x => x.key)).toEqual(
      ['k/steps[1].title']
    );
  });
});

describe('the label check', () => {
  const en = {
    'lib.title': 'Library',
    'lib.main.label': 'Library',
    'x.lib': 'Library',
    'speed.a': 'Speed',
    'speed.b': 'Speed',
  };
  const es = {
    'lib.title': 'Biblioteca',
    'lib.main.label': 'Biblioteca',
    'x.lib': 'Biblioteca',
    'speed.a': 'Rapidez',
    'speed.b': 'Rapidez',
  };
  const labels = [
    {
      id: 'library',
      kind: 'navigation',
      en: 'Library',
      es: 'Biblioteca',
      ids: ['lib.title', 'lib.main.label'],
    },
    {
      id: 'speed',
      kind: 'quantity',
      en: 'Speed',
      es: 'Rapidez',
      ids: ['speed.a'],
    },
  ];

  test('agreement passes, and the sweep reaches ids the table does not name', () => {
    const r = checkLabels(en, es, labels);
    expect(r.problems).toEqual([]);
    expect(r.checked).toBe(5);
  });

  test('a label translated another way fails, named by id', () => {
    const r = checkLabels(en, { ...es, 'x.lib': 'Librería' }, labels);
    expect(r.problems).toHaveLength(1);
    expect(r.problems[0]).toMatch(/x\.lib.*Librería.*Biblioteca/);
  });

  test('an allowed synonym passes only where the table did not name the id', () => {
    const table = [{ ...labels[0], allow: ['Librería'] }];
    expect(
      checkLabels(en, { ...es, 'x.lib': 'Librería' }, table).problems
    ).toEqual([]);
    expect(
      checkLabels(en, { ...es, 'lib.title': 'Librería' }, table).problems
    ).toHaveLength(1);
  });

  test('English that changed under the glossary fails until the glossary moves too', () => {
    const r = checkLabels({ ...en, 'lib.title': 'Libraries' }, es, labels);
    expect(r.problems[0]).toMatch(/the English is "Libraries"/);
  });

  test('a known divergence is a ratchet: allowed as recorded, an error once fixed or changed', () => {
    const known = [
      labels[0],
      { ...labels[1], known: { 'speed.b': 'Velocidad' } },
    ];
    const drifted = { ...es, 'speed.b': 'Velocidad' };
    expect(checkLabels(en, drifted, known).problems).toEqual([]);
    expect(checkLabels(en, drifted, known).known).toBe(1);
    expect(checkLabels(en, es, known).problems[0]).toMatch(
      /remove it from known/
    );
    expect(
      checkLabels(en, { ...es, 'speed.b': 'Ritmo' }, known).problems[0]
    ).toMatch(/records "Velocidad" as known/);
  });

  test('a new divergence of a swept id is not covered by an old record', () => {
    const known = [
      labels[0],
      { ...labels[1], known: { 'speed.b': 'Velocidad' } },
    ];
    const r = checkLabels(
      en,
      { ...es, 'speed.b': 'Velocidad', 'speed.a': 'Velocidad' },
      known
    );
    expect(r.problems).toHaveLength(1);
    expect(r.problems[0]).toMatch(/speed\.a/);
  });

  test('two labels may not claim one id', () => {
    const r = checkLabels(en, es, [labels[0], { ...labels[0], id: 'again' }]);
    expect(r.problems.some(p => /claimed by two labels/.test(p))).toBe(true);
  });
});

describe('the reports that never fail', () => {
  test('terminology counts each form and samples where it occurs', () => {
    const r = terminology(
      ['el laboratorio 3-D', 'el laboratorio 3D y otro', 'laboratorio 3D'],
      [
        {
          id: 'lab',
          prefer: /laboratorio 3-D/gi,
          variants: [/laboratorio 3D\b/gi],
        },
      ]
    );
    expect(r[0].preferred).toBe(1);
    expect(r[0].variants[0].count).toBe(2);
    expect(r[0].variants[0].sample).toMatch(/laboratorio 3D/);
  });

  test('accent variants show a word spelled both ways and skip the valid pairs', () => {
    const r = accentVariants([
      'la dirección',
      'la direccion',
      'qué cosa',
      'que cosa',
      'dirección',
    ]);
    expect(r.map(x => x.word)).toEqual(['direccion']);
    expect(r[0]).toMatchObject({ bare: 1, accented: { dirección: 2 } });
  });
});

describe('English-only surfaces are decisions', () => {
  const surfaces = {
    englishOnly: [
      {
        id: 'frame',
        kind: 'page',
        path: 'frame/index.html',
        reason: 'a frame',
        decided: 'somewhere',
      },
    ],
  };
  const html = {
    'a/index.html':
      '<p><span class="gs-en">Hi</span><span class="gs-es">Hola</span></p>',
    'b/index.html': '<button data-i18n="x.y">Go</button>',
    'frame/index.html': '<p>English only</p>',
  };
  const opts = {
    surfaces,
    pages: Object.keys(html),
    html: f => html[f],
    exists: () => true,
  };

  test('pages that carry Spanish, and the declared one, pass', () => {
    expect(checkSurfaces(opts).problems).toEqual([]);
  });

  test('an undeclared English-only page fails, saying how to declare it', () => {
    const r = checkSurfaces({
      ...opts,
      pages: [...opts.pages, 'new/index.html'],
      html: f => (f === 'new/index.html' ? '<p>x</p>' : html[f]),
    });
    expect(r.problems).toEqual([
      expect.stringMatching(
        /new\/index\.html carries no Spanish and is not declared.*TRANSLATION\.md/
      ),
    ]);
  });

  test('a declared page that gained Spanish loses its exemption, and a dangling path fails', () => {
    const r = checkSurfaces({
      ...opts,
      html: f => (f === 'frame/index.html' ? html['a/index.html'] : html[f]),
      exists: () => false,
    });
    expect(
      r.problems.some(p => /declared English only and carries Spanish/.test(p))
    ).toBe(true);
    expect(r.problems.some(p => /does not exist/.test(p))).toBe(true);
  });

  test('a declaration without a reason or a source is refused', () => {
    const bad = {
      englishOnly: [{ id: 'x', kind: 'page', path: 'a/index.html' }],
    };
    expect(
      checkSurfaces({ ...opts, surfaces: bad }).problems.filter(p =>
        /is missing/.test(p)
      )
    ).toHaveLength(2);
  });
});

describe('the real tree', () => {
  const run = (args, env = {}) =>
    spawnSync(
      process.execPath,
      [path.join(ROOT, 'tools', 'i18n-freshness.mjs'), ...args],
      {
        cwd: ROOT,
        encoding: 'utf8',
        env: { ...process.env, ...env },
      }
    );

  test('the committed ledger is current for every source, and i18n:check passes', () => {
    const r = run(['--json']);
    expect(r.status).toBe(0);
    const report = JSON.parse(r.stdout);
    expect(report.problems).toEqual([]);
    const names = report.sources.map(s => s.name);
    for (const name of [
      'catalog:es',
      'lesson:es',
      'depth:es',
      'page:es',
      'summary:es',
      'explain:es',
      'kit:es',
      'instructor-labels:es',
      'sdk-strings:es',
      'document:es',
    ])
      expect(names).toContain(name);
    expect(
      report.sources.find(s => s.name === 'catalog:es').entries
    ).toBeGreaterThan(9000);
    expect(
      report.sources.every(
        s =>
          s.stale === 0 &&
          s.expired === 0 &&
          s.unrecorded === 0 &&
          s.orphan === 0
      )
    ).toBe(true);
    expect(report.packs.stale ?? 0).toBe(0);
  });

  test('an English edit is stale, is tolerated for the grace period, then fails the gate', () => {
    // An English edit looks like this to the tool: the digest the ledger holds
    // for an entry is not the digest of the English that stands.
    const dir = tempDir();
    cpSync(path.join(ROOT, 'tools', 'i18n-freshness'), dir, {
      recursive: true,
    });
    const file = path.join(dir, 'catalog-es.json');
    const doc = JSON.parse(readFileSync(file, 'utf8'));
    const key = 'lib.title';
    const parsed = parseRow(doc.rows[key]);
    doc.rows[key] = formatRow({ ...parsed, en: ['deadbeef'] });
    writeFileSync(file, `${JSON.stringify(doc, null, 2)}\n`);
    const args = day => ['--ledger', dir, '--today', day];

    const first = run(args('2026-03-01'));
    expect(first.status).toBe(1);
    expect(first.stdout).toMatch(/1 newly stale/);
    expect(first.stdout).toMatch(/--write/);

    const written = run([...args('2026-03-01'), '--write']);
    expect(written.status).toBe(0);
    expect(written.stdout).toMatch(new RegExp(`stale ${key} since 2026-03-01`));
    expect(JSON.parse(readFileSync(file, 'utf8')).rows[key]).toMatch(
      /@2026-03-01$/
    );

    // Writing on a later day changes nothing about the date, and nothing is clearer.
    expect(run([...args('2026-03-10'), '--write']).status).toBe(0);
    expect(JSON.parse(readFileSync(file, 'utf8')).rows[key]).toMatch(
      /@2026-03-01$/
    );

    expect(run(args('2026-03-15')).status).toBe(0);
    const late = run(args('2026-03-16'));
    expect(late.status).toBe(1);
    expect(late.stdout).toMatch(/stale for more than 14 days/);

    // Confirming the English change clears it, in a diff a reviewer reads.
    const confirmed = run([
      ...args('2026-03-16'),
      '--write',
      '--confirm',
      `catalog:es/${key}`,
    ]);
    expect(confirmed.status).toBe(0);
    expect(JSON.parse(readFileSync(file, 'utf8')).rows[key]).not.toMatch(/@/);
    expect(run(args('2026-03-16')).status).toBe(0);
  });

  test('the ledger holds one file per source, as prettier-stable JSON with sorted rows', () => {
    const dir = path.join(ROOT, 'tools', 'i18n-freshness');
    for (const f of readdirSync(dir)) {
      const text = readFileSync(path.join(dir, f), 'utf8');
      const doc = JSON.parse(text);
      expect(text).toBe(`${JSON.stringify(doc, null, 2)}\n`);
      expect(doc.format).toBe('gravitas.i18n-freshness/1');
      const keys = Object.keys(doc.rows);
      expect(keys).toEqual(
        [...keys].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
      );
      for (const v of Object.values(doc.rows))
        expect(parseRow(v)).not.toBeNull();
    }
  });

  test('the audit prints the three new sections and exits clean', () => {
    const out = execFileSync(
      process.execPath,
      [path.join(ROOT, 'tools', 'i18n-audit.mjs')],
      {
        cwd: ROOT,
        encoding: 'utf8',
      }
    );
    expect(out).toMatch(/Translation freshness/);
    expect(out).toMatch(/Glossary labels:/);
    expect(out).toMatch(/Surfaces:/);
    expect(out).not.toMatch(/TRANSLATION CONTRACT/);
  });
});
