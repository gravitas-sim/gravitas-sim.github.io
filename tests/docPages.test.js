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
 * A page list, read out of build.js rather than imported.
 *
 * build.js runs a production build on import - it has no exports and its last
 * statement is `await run()` - so the list is parsed, the same way
 * tests/accessibilityDocs.test.js parses the SURFACES array out of its spec.
 *
 * @param {string} name - DOC_PAGES or ARCHIVAL_PAGES
 * @returns {string[]} The directories it names
 */
function pageList(name) {
  const text = readFileSync(path.join(REPO, 'build.js'), 'utf8');
  const start = text.indexOf(`const ${name} = [`);
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
  // The worker-realm spike. It has an index.html and it is deliberately not a
  // page: MULTI_WORLD_DECISION.md records that the multi-instance engine was
  // not built, and the probe pages exist so the measurement behind that answer
  // can be re-run. Shipping them would publish a prototype of something the
  // project decided against. Excluded here rather than added to DOC_PAGES,
  // which is the distinction this file is about - the rule is "every page the
  // site has", and a spike is not one.
  'spike',
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
  const docs = pageList('DOC_PAGES');
  // Copied byte for byte instead of processed: the first Gravitas, kept as it
  // was. Either list gets a page into dist/.
  const archival = pageList('ARCHIVAL_PAGES');
  const listed = [...docs, ...archival];

  test('the lists parse', () => {
    // Guards the parser: an empty list would make the assertion below
    // vacuously true and hide the very gap it exists to catch.
    expect(docs.length).toBeGreaterThan(3);
    expect(docs).toContain('instructors');
    expect(archival).toContain('history/original');
  });

  test('every page directory in the tree is in DOC_PAGES or ARCHIVAL_PAGES', () => {
    const missing = pageDirs().filter(d => !listed.includes(d));
    expect(missing).toEqual([]);
  });

  test('every entry in either list is a page that exists', () => {
    const gone = listed.filter(
      d => !existsSync(path.join(REPO, d, 'index.html'))
    );
    expect(gone).toEqual([]);
  });

  test('no page is in both lists', () => {
    // A DOC_PAGES entry has its stylesheet links rewritten, and a page in both
    // would be written twice - processed first and then overwritten, or the
    // other way round, depending on the order build.js happens to run them in.
    expect(docs.filter(d => archival.includes(d))).toEqual([]);
  });
});
