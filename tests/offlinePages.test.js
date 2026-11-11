// =============================================================================
// Every page's offline promise is the one the manifest keeps (Prompt 284)
// -----------------------------------------------------------------------------
// tools/offline-pages.json is what a headless tour saw each page fetch
// (tools/offline-pages.mjs). Here it is held to the committed sw-manifest.js:
// every page of the tree has a row, each row's tiers are the manifest's, the
// promise follows from them, and the offline note every page carries lists a
// page as saved only when the worker has it by then. A move of a file between
// tiers that makes a promise untrue fails here until the tour is run again.
// =============================================================================
import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { pages } from '../tools/csp.mjs';
import { tierReader, promiseOf, tourPages } from '../tools/offline-tiers.mjs';
import { precachedTiers } from '../tools/shell.mjs';
import { pagesTable } from '../tools/precache-inventory.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = rel => readFileSync(path.join(ROOT, rel), 'utf8');
const record = JSON.parse(read('tools/offline-pages.json'));
const tierOf = tierReader(ROOT);

describe('the record covers the tree', () => {
  test('every HTML page has one row, and no row is for a page that is gone', async () => {
    const wanted = (await tourPages()).sort();
    expect(record.pages.map(p => p.page).sort()).toEqual(wanted);
    expect((await pages()).length).toBe(record.pages.length);
  });

  test('the record names its source and holds nothing but measurements', () => {
    expect(record.format).toBe('gravitas.offline-pages/1');
    for (const p of record.pages)
      expect(Object.keys(p).sort()).toEqual(
        [
          'core',
          'html',
          'idle',
          'never',
          'optional',
          'outside',
          'page',
          'promise',
          'requests',
          'runtime',
        ].sort()
      );
  });
});

describe('the record agrees with the manifest', () => {
  test('each page is in the tier the record says', () => {
    for (const p of record.pages)
      expect([p.page, tierOf(p.page)]).toEqual([p.page, p.html]);
  });

  test('each request the record names outside the install is in the tier it says', () => {
    for (const p of record.pages)
      for (const o of p.outside)
        expect([p.page, o.path, tierOf(o.path)]).toEqual([
          p.page,
          o.path,
          o.tier,
        ]);
  });

  test('the counts add up, and the promise follows from the tiers', () => {
    for (const p of record.pages) {
      expect(p.core + p.optional + p.idle + p.never + p.runtime).toBe(
        p.requests
      );
      expect(p.idle + p.never + p.runtime).toBe(p.outside.length);
      expect([p.page, p.promise]).toEqual([p.page, promiseOf(p)]);
    }
  });

  test('a page that promises offline from the first visit is in the install and fetches nothing outside it', () => {
    const first = record.pages.filter(p => p.promise === 'first visit');
    expect(first.length).toBeGreaterThanOrEqual(5);
    for (const p of first) {
      expect(['core', 'optional']).toContain(p.html);
      expect(p.outside).toEqual([]);
    }
  });

  // A page in the install that reads an idle file and does without it, with
  // the page's own reason. Nothing else may: the course home failed offline
  // until the idle tier came, because js/library/progress.js was idle.
  const DEGRADES = {
    '/my-work/': {
      files: ['/library/library.json'],
      why: 'js/myWorkPage.js lists items under their ids and omits sequence progress when the Library index is missing (e2e/offlineII.spec.js)',
    },
  };

  test('a page in the first-visit install fetches no idle file but the ones it does without', () => {
    for (const p of record.pages.filter(x =>
      ['core', 'optional'].includes(x.html)
    )) {
      const allowed = DEGRADES[p.page]?.files ?? [];
      expect([
        p.page,
        p.outside.filter(o => o.tier === 'idle' && !allowed.includes(o.path)),
      ]).toEqual([p.page, []]);
    }
    for (const [page, d] of Object.entries(DEGRADES)) {
      expect(d.why.length).toBeGreaterThan(20);
      const row = record.pages.find(p => p.page === page);
      expect(row.outside.map(o => o.path)).toEqual(
        expect.arrayContaining(d.files)
      );
    }
  });
});

describe('the offline note on every page tells the truth about when', () => {
  const note = html => {
    const m = /<div class="gs-offline"[\s\S]*?<\/template><\/div>/.exec(html);
    return m?.[0] ?? '';
  };
  const hrefs = text => [...text.matchAll(/href="([^"]+)"/g)].map(m => m[1]);

  test('what it calls saved is in the first-visit install, what it says follows is idle', () => {
    const { now, later } = precachedTiers();
    const sample = read('library/index.html');
    const text = note(sample).replace(
      /<span class="gs-es"[\s\S]*?<\/span>/g,
      ''
    );
    const [before, after = ''] = text.split(/These follow once/);
    expect(hrefs(before).length).toBeGreaterThan(0);
    for (const h of hrefs(before)) expect([h, now.has(h)]).toEqual([h, true]);
    expect(hrefs(after).length).toBeGreaterThan(0);
    for (const h of hrefs(after)) expect([h, later.has(h)]).toEqual([h, true]);
  });

  test('every page of the tree carries the same note', () => {
    const texts = new Set(
      record.pages
        .filter(p => p.page !== '/')
        .slice(0, 30)
        .map(p => note(read(`${p.page.slice(1)}index.html`)))
    );
    // One note per page set, differing only in the page's own crumbs, never in
    // the lists: the lists come from the manifest, not the page.
    const lists = new Set([...texts].map(t => hrefs(t).join(',')));
    expect(lists.size).toBe(1);
  });
});

describe('the table in OFFLINE_AND_LOW_END.md is the record', () => {
  test('the fact block is current', () => {
    const doc = read('OFFLINE_AND_LOW_END.md');
    const m =
      /<!--fact-block:pagePromises-->([\s\S]*?)<!--\/fact-block-->/.exec(doc);
    expect(m).not.toBeNull();
    expect(m[1]).toBe(pagesTable(ROOT));
  });
});
