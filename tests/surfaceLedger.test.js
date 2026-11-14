// The surface ledger: one row per published surface, and a check that fails
// when a page, a route parameter or a dialog has no row.
//
// Two kinds of test. Each failure shape is tested on a small inventory built by
// hand, through the pure checkLedger(), so it fails for exactly one reason. The
// facts about the real tree are read from the committed ledger, and the real
// tree is checked by running the tool in a child process, which is how
// `npm run surface-ledger:check` runs it and keeps the page imports out of the
// Jest VM.
import { describe, test, expect } from '@jest/globals';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import {
  checkLedger,
  fileOfPath,
  globTest,
  scanDialogs,
  scanReads,
  KINDS,
  OWNERS,
} from '../tools/surface-ledger.mjs';

const ledger = JSON.parse(readFileSync('docs/surface-ledger.json', 'utf8'));
const seed = JSON.parse(readFileSync('tools/surface-ledger-seed.json', 'utf8'));
const count = (list, f) => list.filter(f).length;
const codes = problems => problems.map(p => p.code);

/** A row of a hand-built ledger. */
const row = (id, kind, over = {}) => ({
  id,
  kind,
  locator: {},
  purpose: 'p',
  audience: 'a',
  primary_action: 'x',
  job: 'workspace',
  template: null,
  disposition: 'OPEN',
  redesign: null,
  owner: 497,
  supporting: [],
  reason: '',
  sitemap_reason: '',
  decision: '',
  ...over,
});

/** A tiny tree: one page, one family of two, one route, one dialog. */
function tree() {
  const files = {
    'index.html': '<main></main>',
    'a/index.html': '<main></main>',
    'fam/one/index.html': '',
    'fam/two/index.html': '',
    'js/reader.js':
      "const p = new URLSearchParams(location.search); p.get('foo');",
    'tools/gen.mjs': '',
  };
  const inventory = {
    pages: [
      'a/index.html',
      'fam/one/index.html',
      'fam/two/index.html',
      'index.html',
    ],
    tracked: Object.keys(files),
    nav: {
      surfaces: [
        { id: 'home', path: '/' },
        { id: 'a', path: '/a/' },
        { id: 'fam', path: '/fam/*' },
      ],
    },
    sitemap: new Set(['/', '/a/', '/fam/one/', '/fam/two/']),
    dialogs: [{ page: 'index.html', element: 'dlg', native: false }],
    reads: [{ file: 'js/reader.js', params: ['foo'] }],
    read: f => files[f] ?? null,
    assembledIndex:
      '<button id="open"></button><div id="dlg" role="dialog"></div>',
  };
  const doc = {
    scan: { ignored: [] },
    rows: [
      row('page:home', 'page', { locator: { nav: 'home' } }),
      row('page:a', 'page', { locator: { nav: 'a' } }),
      row('family:fam', 'generated-family', {
        locator: {
          nav: 'fam',
          generator: 'tools/gen.mjs',
          glob: 'fam/*/index.html',
          count: 2,
        },
      }),
      row('route:foo', 'route-family', {
        locator: {
          param: 'foo',
          params: ['foo'],
          via: 'URLSearchParams',
          readers: ['js/reader.js'],
        },
      }),
      row('dialog:dlg', 'dialog', {
        locator: { page: 'index.html', element: 'dlg', opener: '#open' },
      }),
    ],
  };
  return { inventory, doc };
}
const run = (t, registerIds) =>
  checkLedger({ ledger: t.doc, inventory: t.inventory, registerIds });

describe('the check on a hand-built tree', () => {
  test('a tree whose every surface has a row is clean', () => {
    expect(run(tree())).toEqual([]);
  });

  test('a published page with no row and no navigation surface fails', () => {
    const t = tree();
    t.inventory.pages.push('new/index.html');
    t.inventory.tracked.push('new/index.html');
    expect(codes(run(t))).toEqual(['page-no-row']);
  });

  test('a row whose file is gone fails', () => {
    const t = tree();
    t.inventory.tracked = t.inventory.tracked.filter(f => f !== 'a/index.html');
    t.inventory.pages = t.inventory.pages.filter(f => f !== 'a/index.html');
    expect(codes(run(t))).toContain('row-file-gone');
  });

  test('a row whose reader file is gone fails', () => {
    const t = tree();
    t.doc.rows[3].locator.readers = ['js/missing.js'];
    expect(codes(run(t))).toContain('row-file-gone');
  });

  test('a navigation surface with no row fails', () => {
    const t = tree();
    t.inventory.nav.surfaces.push({ id: 'extra', path: '/extra/' });
    expect(codes(run(t))).toEqual(['nav-no-row']);
  });

  test('a row naming a navigation id the inventory lacks fails', () => {
    const t = tree();
    t.doc.rows[1].locator.nav = 'nowhere';
    expect(codes(run(t))).toContain('nav-unknown');
  });

  test('a family whose file count differs from the files fails', () => {
    const t = tree();
    t.inventory.tracked.push('fam/three/index.html');
    t.inventory.pages.push('fam/three/index.html');
    t.inventory.sitemap.add('/fam/three/');
    expect(codes(run(t))).toEqual(['family-count']);
  });

  test('a route parameter read in js/ with no row fails, in a file with no row', () => {
    const t = tree();
    t.inventory.reads.push({ file: 'js/other.js', params: ['bar'] });
    t.inventory.tracked.push('js/other.js');
    expect(codes(run(t))).toEqual(['param-no-row']);
  });

  test('a parameter read in a file a row does name, but does not declare, fails', () => {
    const t = tree();
    t.inventory.reads[0].params = ['foo', 'surprise'];
    expect(
      run(t)
        .map(p => p.message)
        .join()
    ).toMatch(/"surprise"/);
    expect(codes(run(t))).toEqual(['param-no-row']);
  });

  test('an ignored read passes only with a reason', () => {
    const t = tree();
    t.inventory.reads.push({ file: 'js/other.js', params: ['bar'] });
    t.inventory.tracked.push('js/other.js');
    t.doc.scan.ignored = [{ file: 'js/other.js', reason: '' }];
    expect(codes(run(t))).toContain('param-no-row');
    t.doc.scan.ignored = [{ file: 'js/other.js', reason: 'sends a request' }];
    expect(run(t)).toEqual([]);
  });

  test('a declared parameter no reader mentions any more fails', () => {
    const t = tree();
    t.doc.rows[3].locator.params = ['foo', 'gone'];
    expect(codes(run(t))).toEqual(['reader-stale']);
  });

  test('a dialog and a native dialog with no row fail', () => {
    const t = tree();
    t.inventory.dialogs.push({
      page: 'index.html',
      element: 'second',
      native: false,
    });
    expect(codes(run(t))).toEqual(['dialog-no-row']);
    const n = tree();
    n.inventory.dialogs.push({
      page: 'a/index.html',
      element: 'nat',
      native: true,
    });
    expect(
      run(n)
        .map(p => p.message)
        .join()
    ).toMatch(/native dialog #nat/);
  });

  test('a dialog opener that is not in its page fails', () => {
    const t = tree();
    t.doc.rows[4].locator.opener = '#absent';
    expect(codes(run(t))).toEqual(['opener-gone']);
  });

  test('a page missing from the sitemap with no sitemap_reason fails', () => {
    const t = tree();
    t.inventory.sitemap.delete('/a/');
    expect(codes(run(t))).toEqual(['sitemap-reason']);
    t.doc.rows[1].sitemap_reason = 'kept out of search on purpose';
    expect(run(t)).toEqual([]);
  });

  test('a closed row with no reason fails', () => {
    const t = tree();
    Object.assign(t.doc.rows[1], {
      disposition: 'REVISED',
      redesign: 'LANDED',
    });
    expect(codes(run(t))).toEqual(['closed-no-reason']);
    t.doc.rows[1].reason = 'the composition landed in the family prompt';
    expect(run(t)).toEqual([]);
  });

  test('an owner outside the list of closing prompts fails', () => {
    const t = tree();
    t.doc.rows[1].owner = 452;
    expect(codes(run(t))).toEqual(['owner']);
  });

  test('a vocabulary outside the lists fails', () => {
    const t = tree();
    t.doc.rows[1].kind = 'screen';
    t.doc.rows[0].job = 'toy';
    t.doc.rows[3].disposition = 'DONE';
    const said = run(t)
      .map(p => p.message)
      .join('\n');
    expect(said).toMatch(/kind "screen"/);
    expect(said).toMatch(/job "toy"/);
    expect(said).toMatch(/disposition "DONE"/);
  });

  test('a repeated id fails', () => {
    const t = tree();
    t.doc.rows.push({ ...t.doc.rows[1] });
    expect(codes(run(t))).toContain('bad-row');
  });

  describe('a deferred redesign needs the maintainer’s recorded decision', () => {
    const deferred = decision => {
      const t = tree();
      Object.assign(t.doc.rows[1], {
        disposition: 'DEFERRED',
        redesign: 'FOUNDATIONS ONLY',
        reason: 'the family waits for the chosen direction',
        decision,
      });
      return t;
    };
    test('without a decision it fails', () => {
      expect(codes(run(deferred(''), new Set(['D-X-1'])))).toEqual([
        'deferral-unrecorded',
      ]);
    });
    test('a decision the register does not hold fails', () => {
      expect(codes(run(deferred('D-NOPE'), new Set(['D-X-1'])))).toEqual([
        'deferral-unrecorded',
      ]);
    });
    test('a register row passes', () => {
      expect(run(deferred('D-X-1'), new Set(['D-X-1']))).toEqual([]);
    });
    test('FOUNDATIONS ONLY on a REVISED or REVIEWED CLEAR row fails: it is OPEN or DEFERRED', () => {
      const t = tree();
      Object.assign(t.doc.rows[1], {
        disposition: 'REVISED',
        redesign: 'FOUNDATIONS ONLY',
        reason: 'x',
      });
      expect(codes(run(t))).toContain('combination');
    });
    test('an OPEN row may say FOUNDATIONS ONLY: the composition has not landed', () => {
      const t = tree();
      t.doc.rows[1].redesign = 'FOUNDATIONS ONLY';
      expect(run(t)).toEqual([]);
    });
  });

  test('REVIEWED CLEAR, REVISED and NOT A SURFACE each need their own redesign', () => {
    const t = tree();
    Object.assign(t.doc.rows[1], {
      disposition: 'REVIEWED CLEAR',
      redesign: 'LANDED',
      reason: 'x',
    });
    expect(codes(run(t))).toContain('combination');
    const n = tree();
    Object.assign(n.doc.rows[1], {
      disposition: 'NOT A SURFACE',
      redesign: 'NOT APPLICABLE',
      reason: 'x',
    });
    expect(codes(run(n))).toContain('combination'); // a page is a surface
  });
});

describe('the scans', () => {
  test('route parameters: literal reads of an address, not writes', () => {
    const src = {
      'a.js':
        "const q = new URLSearchParams(s); q.get('x'); q.has('y'); q.set('z', 1);",
      'b.js': "m.get('nothing here');",
    };
    expect(scanReads(['a.js', 'b.js'], f => src[f])).toEqual([
      { file: 'a.js', params: ['x', 'y'] },
    ]);
  });

  test('dialogs: role dialog and native, with their ids', () => {
    const html =
      '<div id="a" role="dialog"></div><dialog id="b"></dialog><div role="alertdialog" id="c"></div><div role="menu" id="d"></div>';
    expect(scanDialogs('p.html', html)).toEqual([
      { page: 'p.html', element: 'a', native: false },
      { page: 'p.html', element: 'b', native: true },
      { page: 'p.html', element: 'c', native: false },
    ]);
  });

  test('a navigation path names its file, and a glob counts files', () => {
    expect(fileOfPath('/')).toBe('index.html');
    expect(fileOfPath('/a/b/')).toBe('a/b/index.html');
    expect(fileOfPath('/x.pdf')).toBe('x.pdf');
    expect(fileOfPath('/#investigations')).toBe('index.html');
    expect(globTest('t/*/index.html').test('t/a/index.html')).toBe(true);
    expect(globTest('t/*/index.html').test('t/a/b/index.html')).toBe(false);
    expect(globTest('s/**/*.html').test('s/a/b/c.html')).toBe(true);
  });
});

describe('the committed ledger and the real tree', () => {
  test('the tool agrees with the tree and its two files are current', () => {
    const out = execFileSync('node', ['tools/surface-ledger.mjs', '--check'], {
      encoding: 'utf8',
    });
    expect(out).toMatch(/matches the tree: \d+ rows/);
  });

  test('the baseline: 178 pages are covered by 29 page rows and two families', () => {
    const pageRows = ledger.rows.filter(
      r =>
        r.kind === 'page' &&
        !['manual', 'history-original'].includes(r.locator.nav)
    );
    const families = ledger.rows.filter(r => r.kind === 'generated-family');
    expect(pageRows).toHaveLength(29);
    expect(families.map(f => f.locator.count).sort((a, b) => a - b)).toEqual([
      3, 146,
    ]);
    expect(29 + 3 + 146).toBe(178);
  });

  test('every row has a kind, an owner among the closing prompts and starts OPEN or is closed with a reason', () => {
    for (const r of ledger.rows) {
      expect(KINDS).toContain(r.kind);
      expect(OWNERS).toContain(r.owner);
      if (r.disposition !== 'OPEN') expect(r.reason.trim()).not.toBe('');
    }
  });

  test('every kind has rows, and 13 + 4 dialogs are recorded', () => {
    for (const k of KINDS)
      expect(count(ledger.rows, r => r.kind === k)).toBeGreaterThan(0);
    expect(count(ledger.rows, r => r.kind === 'dialog')).toBe(17);
    expect(
      count(ledger.rows, r => r.kind === 'dialog' && r.locator.native)
    ).toBe(4);
  });

  test('the ten pages missing from the sitemap each carry a reason', () => {
    const reasons = ledger.rows.filter(r => r.sitemap_reason);
    expect(reasons.map(r => r.locator.nav).sort()).toEqual(
      [
        'catalog',
        'compute',
        'evaluation',
        'glossary',
        'instructors',
        'library',
        'my-work',
        'sky-lab',
        'submissions',
        'validation',
      ].sort()
    );
  });

  test('the seed and the ledger hold the same rows', () => {
    expect(ledger.rows.map(r => r.id)).toEqual(seed.rows.map(r => r.id));
  });

  test('a measured row declares its state: seeds, a ready element and a primary action or none', () => {
    const measured = ledger.rows.flatMap(r => r.measure.map(m => ({ r, m })));
    expect(measured.length).toBeGreaterThan(40);
    for (const { r, m } of measured) {
      expect(typeof m.path).toBe('string');
      expect(Array.isArray(m.seeds)).toBe(true);
      expect(m.primary === null || typeof m.primary.selector === 'string').toBe(
        true
      );
      expect(r.measure.map(x => x.id)).toContain(m.id);
    }
  });
});
