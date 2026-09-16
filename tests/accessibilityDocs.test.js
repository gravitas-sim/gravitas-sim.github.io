// =============================================================================
// The accessibility document has to describe the sweep that actually runs
// -----------------------------------------------------------------------------
// ACCESSIBILITY.md is the page a reviewer reads to find out what was checked,
// and it carried three different answers to that question at once: "14
// surfaces × 2 languages × 2 themes — 56 runs" in its table, "52 clean axe
// runs" in its prose, and "all 52 combinations" beside the command. The
// SURFACES array had fifteen entries, so the sweep was 60 runs and none of the
// three numbers was right.
//
// The numbers are now fact markers, and `npm run docs:sync` keeps them. What a
// marker cannot do is notice that a surface was added to the array and never
// named in the sentence that lists them - the count would update and the prose
// would quietly describe one fewer surface than runs. So the names are checked
// here, against the array, one by one.
// =============================================================================

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => readFileSync(path.join(REPO, rel), 'utf8');

/** The `name:` of every entry in the spec's SURFACES array, in order. */
function surfaceNames() {
  const text = read('e2e/accessibility.spec.js');
  const start = text.indexOf('const SURFACES = [');
  expect(start).toBeGreaterThan(-1);
  const body = text.slice(start, text.indexOf('\n];', start));
  // Four-space indent is one level inside the array. Two entries carry a
  // comment between the brace and the name, so adjacency cannot be assumed.
  return [...body.matchAll(/^ {4}name: '([^']+)'/gm)].map(m => m[1]);
}

/** The number between a pair of fact markers. */
function fact(doc, key) {
  const m = new RegExp(`<!--fact:${key}-->(.*?)<!--/fact-->`, 's').exec(doc);
  expect(m).not.toBeNull();
  return Number(m[1]);
}

describe('ACCESSIBILITY.md against the axe matrix', () => {
  const doc = read('ACCESSIBILITY.md');
  const names = surfaceNames();

  test('the spec really does define surfaces to check against', () => {
    // Guards the parser, not the document: a regex that stopped matching would
    // make every assertion below vacuously true over an empty list.
    expect(names.length).toBeGreaterThan(10);
    expect(names).toContain('front door');
  });

  test('every surface in the array is named in the prose', () => {
    // The prose is hard-wrapped, so a two-word name can straddle a newline.
    const flat = doc.replace(/\s+/g, ' ');
    const missing = names.filter(n => !flat.includes(n));
    expect(missing).toEqual([]);
  });

  test('the marked counts agree with the array', () => {
    const themes = fact(doc, 'axeThemes');
    const locales = fact(doc, 'locales');
    expect(fact(doc, 'axeSurfaces')).toBe(names.length);
    expect(fact(doc, 'axeRuns')).toBe(names.length * locales * themes);
  });

  // The numbers outside a marker are the ones that went stale before. A plain
  // "52 combinations" beside the command is invisible to `docs:sync`, so it is
  // read back out of the document and compared here.
  test('the unmarked count beside the command agrees too', () => {
    const m = /npm run a11y:axe\s+# axe only, all (\d+) combinations/.exec(doc);
    expect(m).not.toBeNull();
    expect(Number(m[1])).toBe(fact(doc, 'axeRuns'));
  });
});
