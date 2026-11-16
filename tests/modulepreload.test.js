// =============================================================================
// Early module fetches (tools/modulepreload.mjs)
// -----------------------------------------------------------------------------
// Every stamped page carries exactly the links the rule picks from its static
// import closure, so a module added to a page's graph, or a page that grows
// towards its served-size ceiling, fails here until the list is regenerated.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { importClosure } from '../tools/source-closure.mjs';
import {
  BEGIN,
  END,
  PAGE_CEILINGS,
  closureLevels,
  pageEntries,
  preloadPlan,
  regionFor,
  stampedPages,
  withPreload,
  withoutPreload,
} from '../tools/modulepreload.mjs';
import { precachedPages } from '../tools/shell.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = f => readFileSync(path.join(ROOT, f), 'utf8');
const pages = stampedPages();

describe('the closure by level', () => {
  const tree = {
    'js/a.js': "import './b.js';\nimport { x } from './c.js';\n",
    'js/b.js': "import './d.js';\nexport * from './c.js';\n",
    'js/c.js':
      "import './d.js';\n// import './never.js';\nconst l = () => import('./lazy.js');\n",
    'js/d.js': '',
  };
  const levels = closureLevels(['js/a.js'], { read: f => tree[f] ?? '' });

  test('is the shortest chain from an entry', () => {
    expect(levels[0]).toEqual(['js/a.js']);
    expect(levels[1]).toEqual(['js/b.js', 'js/c.js']);
    // d is two edges from a through b or c, never reached sooner.
    expect(levels[2]).toEqual(['js/d.js']);
  });

  test('does not follow a dynamic import() or a mention in a comment', () => {
    expect(levels.flat()).not.toContain('js/lazy.js');
    expect(levels.flat()).not.toContain('js/never.js');
  });
});

describe('the rule', () => {
  test("reads a page's entries from its script tags and its inline imports", () => {
    const html =
      '<script type="module" src="js/main.js"></script>\n' +
      '<script type="module">import { a } from \'/js/shell.js\';</script>';
    expect(pageEntries('index.html', html)).toEqual([
      'js/main.js',
      'js/shell.js',
    ]);
    expect(pageEntries('teaching/x/index.html', html)).toEqual([
      'teaching/x/js/main.js',
      'js/shell.js',
    ]);
  });

  test('links no entry and takes the deepest level first', () => {
    const page = 'teaching/index.html';
    const plan = preloadPlan(page, read(page));
    const entries = pageEntries(page, read(page));
    expect(plan.files.some(f => entries.includes(f))).toBe(false);
    const depthOf = f => plan.levels.findIndex(l => l.includes(f));
    const depths = plan.files.map(depthOf);
    expect([...depths].sort((a, b) => b - a)).toEqual(depths);
  });

  test('a page under a ceiling takes whole levels only and stays under it', () => {
    const html = read('index.html');
    const plan = preloadPlan('index.html', html);
    const depths = new Set(
      plan.files.map(f => plan.levels.findIndex(l => l.includes(f)))
    );
    for (const d of depths) {
      expect(plan.files).toEqual(expect.arrayContaining(plan.levels[d]));
    }
    expect(
      Buffer.byteLength(withPreload('index.html', html))
    ).toBeLessThanOrEqual(PAGE_CEILINGS['index.html']);
  });

  test('is its own fixed point', () => {
    for (const page of [
      'index.html',
      'teaching/index.html',
      'sky/index.html',
    ]) {
      const once = withPreload(page, read(page));
      expect(withPreload(page, once)).toBe(once);
      expect(withoutPreload(once)).toBe(withoutPreload(read(page)));
    }
  });
});

describe('every stamped page', () => {
  test('carries the links the rule picks, and no other', () => {
    const stale = pages.filter(p => withPreload(p, read(p)) !== read(p));
    expect(stale).toEqual([]);
  });

  test('links only modules in its static closure, each once, none lazy', () => {
    for (const page of pages) {
      const html = read(page);
      const region = html.split(BEGIN)[1]?.split(END)[0] ?? '';
      const hrefs = [...region.matchAll(/href="\/([^"]+)"/g)].map(m => m[1]);
      expect(new Set(hrefs).size).toBe(hrefs.length);
      if (!hrefs.length) continue;
      const { files } = importClosure({
        root: ROOT,
        entries: pageEntries(page, html),
      });
      expect({ page, outside: hrefs.filter(h => !files.includes(h)) }).toEqual({
        page,
        outside: [],
      });
    }
  });

  test("has the same closure here as the instructor digest's walker finds", () => {
    for (const page of pages) {
      const html = read(page);
      const mine = closureLevels(pageEntries(page, html)).flat().sort();
      const theirs = importClosure({
        root: ROOT,
        entries: pageEntries(page, html),
      }).files;
      expect({ page, same: mine }).toEqual({ page, same: theirs });
    }
  });

  test('is under its served-size ceiling', () => {
    for (const [page, ceiling] of Object.entries(PAGE_CEILINGS)) {
      expect(Buffer.byteLength(read(page))).toBeLessThanOrEqual(ceiling);
    }
  });
});

describe('the served-size ceiling', () => {
  test('is the one the index decomposition test holds index.html to', () => {
    const test_ = read('tests/indexDecomposition.test.js');
    const m = /const INDEX_CEILING = Math\.ceil\(([\d.]+) \* 1024\);/.exec(
      test_
    );
    expect(m).not.toBeNull();
    expect(PAGE_CEILINGS['index.html']).toBe(Math.ceil(Number(m[1]) * 1024));
  });
});

describe('the region', () => {
  test('is absent for a page with nothing to link and written once otherwise', () => {
    expect(regionFor([])).toBe('');
    const r = regionFor(['js/a.js', 'js/b.js']);
    expect(r.startsWith(BEGIN)).toBe(true);
    expect(r.endsWith(END)).toBe(true);
    expect(r.match(/rel="modulepreload"/g)).toHaveLength(2);
  });
});

describe('the precache', () => {
  const precached = precachedPages();

  test('leaves every page the worker precaches without links', () => {
    expect(precached.size).toBeGreaterThanOrEqual(12);
    for (const page of pages) {
      const dir =
        page === 'index.html' ? '/' : `/${page.replace('index.html', '')}`;
      if (!precached.has(dir)) continue;
      const plan = preloadPlan(page, read(page));
      expect({ page, precached: plan.precached, linked: plan.files }).toEqual({
        page,
        precached: true,
        linked: [],
      });
      expect(read(page)).not.toContain(BEGIN);
    }
  });

  test('is the only reason the application page has no links: its room is not enough either', () => {
    const plan = preloadPlan('index.html', read('index.html'), {
      precached: new Set(),
    });
    // The deepest level of Home's closure is larger than the room under the
    // served-size ceiling, so the rule takes none (and never a part of one).
    expect(plan.files).toEqual([]);
    expect(plan.skipped.length).toBeGreaterThan(0);
  });

  test('a page with room takes whole levels, deepest first, and stops at the first that does not fit', () => {
    const page = 'teaching/index.html';
    const html = read(page);
    const open = preloadPlan(page, html, { precached: new Set() });
    expect(open.levels.length).toBeGreaterThan(2);
    const deepest = open.levels.at(-1);
    const size = files =>
      Buffer.byteLength(withoutPreload(html)) + regionFor(files).length + 1;
    // Room for the deepest level and not for the one above it.
    const ceilings = { [page]: size(deepest) };
    const cut = preloadPlan(page, html, { precached: new Set(), ceilings });
    expect(cut.files).toEqual(deepest);
    // Room for nothing.
    const none = preloadPlan(page, html, {
      precached: new Set(),
      ceilings: { [page]: Buffer.byteLength(withoutPreload(html)) },
    });
    expect(none.files).toEqual([]);
  });
});
