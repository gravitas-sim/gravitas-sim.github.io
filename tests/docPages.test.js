// =============================================================================
// Every static page the repository has, the production build has too
// -----------------------------------------------------------------------------
// build.js copies document pages by name, from DOC_PAGES. A page added to the
// tree and not to that list is invisible in exactly the way that is hardest to
// notice: development serves the repository root, so the page works there, and
// the build emits its bundle and its stylesheet, so nothing in the build log
// says anything is missing. Only the HTML never arrives, and only on the
// deployed site.
//
// It has happened twice. /evaluation/ was linked from the instructor dashboard
// and from the teaching page, so `validate:links:dist` caught it - after CI had
// gone red on a branch whose author had no reason to look at build.js.
// /instructors/submissions/ was not caught at all, because nothing links to it
// by href: it is opened by pasting a submission-token URL, which a link checker
// has no way to discover.
//
// So the list is checked against the tree rather than against the links. Any
// `index.html` in the repository, at any depth, is a page somebody can ask for;
// if the build does not copy it, that is a 404 waiting for a release.
// =============================================================================

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * DOC_PAGES, read out of build.js rather than imported.
 *
 * build.js runs a production build on import - it has no exports and its last
 * statement is `await run()` - so the list is parsed, the same way
 * tests/accessibilityDocs.test.js parses the SURFACES array out of its spec.
 */
function docPages() {
  const text = readFileSync(path.join(REPO, 'build.js'), 'utf8');
  const start = text.indexOf('const DOC_PAGES = [');
  expect(start).toBeGreaterThan(-1);
  const body = text.slice(start, text.indexOf('];', start));
  return [...body.matchAll(/'([^']+)'/g)].map(m => m[1]);
}

/** Directories that are not part of the published tree. */
const NOT_THE_SITE = new Set([
  'node_modules',
  'dist',
  '.git',
  'test-results',
  'playwright-report',
  'coverage',
  'bench',
  '_siteA',
  '_siteB',
]);

/** Every directory holding an index.html, repository-relative, at any depth. */
function pageDirs(dir = '', found = []) {
  for (const entry of readdirSync(path.join(REPO, dir), {
    withFileTypes: true,
  })) {
    if (entry.name.startsWith('.')) continue;
    const rel = dir ? `${dir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (NOT_THE_SITE.has(entry.name)) continue;
      if (existsSync(path.join(REPO, rel, 'index.html'))) found.push(rel);
      pageDirs(rel, found);
    }
  }
  return found;
}

describe('the production build copies every static page', () => {
  const listed = docPages();

  test('the list parses', () => {
    // Guards the parser: an empty list would make the assertion below
    // vacuously true and hide the very gap it exists to catch.
    expect(listed.length).toBeGreaterThan(3);
    expect(listed).toContain('instructors');
  });

  test('every page directory in the tree is in DOC_PAGES', () => {
    const missing = pageDirs().filter(d => !listed.includes(d));
    expect(missing).toEqual([]);
  });

  test('every entry in DOC_PAGES is a page that exists', () => {
    const gone = listed.filter(
      d => !existsSync(path.join(REPO, d, 'index.html'))
    );
    expect(gone).toEqual([]);
  });
});
