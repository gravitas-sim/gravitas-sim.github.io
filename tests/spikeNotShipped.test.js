// =============================================================================
// The spike is evidence, not product
// -----------------------------------------------------------------------------
// spike/lyapunov/ is a runnable prototype kept in the repository because it is
// the evidence behind MULTI_WORLD_DECISION.md. It is not production code and
// must never reach the deployed site.
//
// Nothing enforces that on its own: build.js copies the directories named in
// its own STATIC_DIRS and DOC_PAGES lists, so the spike is excluded by being
// absent from them - which is a silent guarantee, and silent guarantees are the
// kind somebody deletes by accident while adding a directory that does belong.
//
// So this asserts the outputs rather than the intent: the committed service
// worker manifest is the list of everything a visitor is served, and it must
// not mention the spike.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = f => readFileSync(path.join(REPO, f), 'utf8');

/** Every file under a directory, relative to the repo. */
function walk(dir, out = []) {
  const full = path.join(REPO, dir);
  if (!existsSync(full)) return out;
  for (const entry of readdirSync(full, { withFileTypes: true })) {
    const next = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(next, out);
    else out.push(next);
  }
  return out;
}

describe('spike/ is not deployed', () => {
  test('the spike is actually here, so this test is about something', () => {
    // If the spike is ever removed this should be deleted with it, not left
    // passing vacuously.
    const files = walk('spike');
    expect(files.length).toBeGreaterThan(0);
    expect(files).toContain(path.join('spike', 'lyapunov', 'README.md'));
  });

  test('build.js never names it', () => {
    // STATIC_FILES, STATIC_DIRS and DOC_PAGES are the three ways a path reaches
    // dist/. None of them may mention the spike, and the cheapest way to say so
    // is that the build script does not contain the word at all.
    expect(read('build.js')).not.toMatch(/\bspike\b/);
  });

  test('the service worker does not offer it to anybody', () => {
    // sw-manifest.js is the list of everything a visitor can be served,
    // including offline. It is generated and committed, so this is checked
    // against the artifact rather than against the generator's intentions.
    expect(read('sw-manifest.js')).not.toMatch(/\bspike\b/);
  });

  test('a built site, if one is present, contains none of it', () => {
    // dist/ is gitignored and only exists after a local build, so this is a
    // conditional check by design: when there is a build to inspect, inspect it.
    if (!existsSync(path.join(REPO, 'dist'))) return;
    const shipped = walk('dist').filter(f => /spike/.test(f));
    expect(shipped).toEqual([]);
  });

  test('it is labelled as non-production where somebody will read it', () => {
    const readme = read(path.join('spike', 'lyapunov', 'README.md'));
    expect(readme).toMatch(/not production/i);
    expect(readme).toMatch(/not deployed|never deployed|not shipped/i);
  });
});
