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
// So this asserts the outputs rather than the intent. The committed service
// worker manifest is the list of everything a visitor is served offline, and it
// must not mention the spike. And the deploy publishes the committed tree, not
// dist/ (RELEASE.md), so the tree it stages is what reaches the site: the last
// block runs the deploy's own staging (tools/prepare-pages.mjs, as
// tests/deployRehearsal.test.js does) and holds that tree to the same rule, for
// spike/ and for the other directories the site does not serve (NOT_PUBLISHED).
// =============================================================================

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import {
  readFileSync,
  existsSync,
  readdirSync,
  mkdtempSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { NOT_PUBLISHED, preparePages } =
  await import('../tools/prepare-pages.mjs');
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

describe('the tree the deploy stages', () => {
  let staging;
  let site;

  beforeAll(() => {
    staging = mkdtempSync(path.join(tmpdir(), 'gravitas-unpublished-'));
    site = preparePages({ out: path.join(staging, '_site') }).out;
  }, 120_000);
  afterAll(() => rmSync(staging, { recursive: true, force: true }));

  /** Every file under the staged tree, relative to it. */
  const files = (dir = '', out = []) => {
    for (const entry of readdirSync(path.join(site, dir), {
      withFileTypes: true,
    })) {
      const next = dir ? `${dir}/${entry.name}` : entry.name;
      if (entry.isDirectory()) files(next, out);
      else out.push(next);
    }
    return out;
  };
  const unpublished = rel =>
    NOT_PUBLISHED.some(d => rel === d || rel.startsWith(`${d}/`));

  test('has none of spike/, tests/, e2e/ or tools/', () => {
    expect(NOT_PUBLISHED).toEqual(['spike', 'tests', 'e2e', 'tools']);
    for (const dir of NOT_PUBLISHED)
      expect([dir, existsSync(path.join(site, dir))]).toEqual([dir, false]);
    expect(files().filter(unpublished)).toEqual([]);
  });

  test('and nothing a page loads points into them', () => {
    // What a reader's browser loads: the pages, their modules and styles, and
    // the service worker. sdk/ is published too, for its schemas' $id URLs
    // (https://gravitas-sim.online/sdk/schemas/...), but its lib/ is a Node
    // command line no page loads; it imports tools/ and runs from a checkout.
    const loaded = rel =>
      /\.html$/.test(rel) ||
      /^(js|css)\//.test(rel) ||
      rel === 'sw.js' ||
      rel === 'sw-manifest.js';
    const problems = [];
    for (const rel of files()) {
      if (!/\.(html|js|mjs|css)$/.test(rel) || !loaded(rel)) continue;
      const text = readFileSync(path.join(site, rel), 'utf8');
      const refs = [
        ...text.matchAll(/(?:from\s*|import\(\s*)['"]([^'"]+)['"]/g),
        ...text.matchAll(/(?:src|href)\s*=\s*["']([^"'#?]+)/g),
      ].map(m => m[1]);
      for (const ref of refs) {
        if (/^[a-z]+:|^\/\//i.test(ref)) continue;
        const target = ref.startsWith('/')
          ? ref.slice(1)
          : path.posix.normalize(path.posix.join(path.posix.dirname(rel), ref));
        if (unpublished(target)) problems.push(`${rel} -> ${ref}`);
      }
    }
    expect(problems).toEqual([]);
  });

  test('and its service worker precaches nothing from them', () => {
    const manifest = readFileSync(path.join(site, 'sw-manifest.js'), 'utf8');
    const listed = [...manifest.matchAll(/'\.\/([^']+)'/g)].map(m => m[1]);
    expect(listed.length).toBeGreaterThan(100);
    expect(listed.filter(unpublished)).toEqual([]);
    for (const p of listed)
      expect([p, existsSync(path.join(site, p))]).toEqual([p, true]);
  });
});
