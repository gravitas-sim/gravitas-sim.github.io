// =============================================================================
// Does a Library route open what it names?
// -----------------------------------------------------------------------------
// Every Library entry links to the surface that runs it (LIBRARY.md), and most
// of those links name the thing in a query or a fragment the page reads rather
// than in a path: `/#investigation=<id>`, `/observatory/?guide=<id>`, a world's
// share fragment. A link checker that only looks for the file passes all of
// them when the id is wrong, and the page opens on nothing. So each route is
// resolved here against the source its page reads it from.
//
// tools/check-links.mjs runs this over library/library.json in the tree it
// checks (the repository, or dist/), and tests/library.test.js over the
// generator's output.
// =============================================================================

import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = rel => import(pathToFileURL(path.join(REPO, rel)).href);

/** The ids each page resolves, read from the modules the pages read. */
export async function routeTables() {
  const ids = list => new Set(list.map(x => x.id));
  const { MANIFEST } = await load('js/data/investigations/manifest.js');
  const { ACTIVITIES } = await load('js/data/activities.js');
  const { FIXTURES } = await load('js/observatory/fixtures.js');
  const { SUITES } = await load('js/observatory/guides/suites.js');
  const { BUILTIN_COURSES } = await load('js/data/courses/index.js');
  const { SCENARIO_INFO } = await load('js/data/scenarioInfo.js');
  const lab3d = await load('js/lab3d/guides/curriculum.js');
  const mission = await load('js/mission/lab/curriculum.js');
  const observatory = new Set();
  for (const s of SUITES)
    for (const g of (await s.load()).GUIDES) observatory.add(g.id);
  return {
    lessons: ids(MANIFEST),
    activities: new Set(
      ACTIVITIES.flatMap(a => a.formats.map(f => `${a.id}/${f.id}`))
    ),
    fixtures: ids(FIXTURES),
    guides: {
      '/observatory/': observatory,
      '/3d/': ids(lab3d.GUIDES),
      '/mission/lab/': ids(mission.GUIDES),
    },
    courses: new Set(Object.keys(BUILTIN_COURSES)),
    scenarios: new Set(Object.keys(SCENARIO_INFO)),
  };
}

/**
 * Why a route does not open what it names, or null when it does.
 *
 * @param {string} route - A Library entry's route
 * @param {object} tables - From routeTables()
 * @param {string} [root] - The tree the page must exist in
 * @returns {Promise<?string>} The reason, or null
 */
export async function routeProblem(route, tables, root = REPO) {
  const url = new URL(route, 'https://gravitas.invalid');
  if (url.origin !== 'https://gravitas.invalid') return 'not on this site';
  const page = url.pathname;
  const file = page.endsWith('/')
    ? path.join(root, page, 'index.html')
    : path.join(root, page);
  if (!existsSync(file)) return `no page at ${page}`;

  const query = [...url.searchParams.keys()].sort().join(',');
  const fragment = decodeURIComponent(url.hash.slice(1));
  const q = name => url.searchParams.get(name);

  if (page === '/') {
    if (query === 'activity,format') {
      const id = `${q('activity')}/${q('format')}`;
      if (!tables.activities.has(id)) return `no activity format "${id}"`;
      return fragment === `activity=${id}`
        ? null
        : `the fragment must name activity=${id}`;
    }
    if (query) return `the application reads no ?${query} here`;
    const lesson = /^investigation=([\w-]+)$/.exec(fragment);
    if (lesson)
      return tables.lessons.has(lesson[1])
        ? null
        : `no investigation "${lesson[1]}"`;
    if (/^1[zr]/.test(fragment)) {
      const { decodeTagged } = await load('js/shareState.js');
      try {
        const { payload } = await decodeTagged('', fragment, 1);
        return tables.scenarios.has(payload.s)
          ? null
          : `the world names no scenario "${payload.s}"`;
      } catch (err) {
        return `the world link does not decode (${err.message})`;
      }
    }
    return `the application does not route #${fragment}`;
  }
  if (fragment) return `${page} routes no fragment`;
  if (Object.hasOwn(tables.guides, page) && query === 'guide')
    return tables.guides[page].has(q('guide'))
      ? null
      : `${page} has no guide "${q('guide')}"`;
  if (page === '/observatory/' && query === 'open')
    return tables.fixtures.has(q('open'))
      ? null
      : `the Observatory has no observation "${q('open')}"`;
  if (page === '/course/' && query === 'course')
    return tables.courses.has(q('course'))
      ? null
      : `no built-in course "${q('course')}"`;
  return query ? `${page} reads no ?${query}` : null;
}
