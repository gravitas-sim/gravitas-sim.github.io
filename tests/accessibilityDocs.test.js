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

  // The count beside the command is the one that went stale before, because a
  // plain "52 combinations" in a code fence is invisible to `docs:sync`. It is
  // generated now, so the assertion is no longer "read the literal back" - it
  // is that the literal is gone and a marker stands where it was. A future
  // edit that types the number in by hand fails here rather than going quietly
  // stale for a release.
  test('the count beside the command is generated, not typed', () => {
    const line = /^npm run a11y:axe .*$/m.exec(doc);
    expect(line).not.toBeNull();
    expect(line[0]).toMatch(
      /# axe only, all <!--fact:axeRuns-->\d+<!--\/fact--> combinations/
    );
    // With the generated spans removed, the comment beside the command must
    // carry no digit of its own: one outside a marker is a number nothing
    // regenerates. Only the comment is examined, because `a11y` is part of the
    // command itself.
    const comment = line[0]
      .slice(line[0].indexOf('#'))
      .replace(/<!--fact:[^>]*-->.*?<!--\/fact-->/gs, '');
    expect(comment).not.toMatch(/\d/);
  });

  // Every place the document states the run count, whether in the table, the
  // prose or the command, is the same marker and therefore the same number.
  // `docs:sync` rewrites all of them, so a disagreement means one was hand-
  // edited out of its markers - exactly the failure the markers were added to
  // prevent.
  test('every stated run count is the marked one, and they all agree', () => {
    const marked = [
      ...doc.matchAll(/<!--fact:axeRuns-->(.*?)<!--\/fact-->/gs),
    ].map(m => Number(m[1]));
    expect(marked.length).toBeGreaterThanOrEqual(3);
    expect(new Set(marked).size).toBe(1);
    expect(marked[0]).toBe(fact(doc, 'axeRuns'));
  });
});
