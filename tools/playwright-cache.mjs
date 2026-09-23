// =============================================================================
// A Playwright transform cache that no other process is writing
// -----------------------------------------------------------------------------
// `playwright test --list` compiles every spec with Babel and keeps the result,
// with its source map, in one directory per user: $TMPDIR/playwright-transform-
// cache-<uid>. A test's location is read off a stack trace taken inside
// `test()` and mapped back through that source map. When the map cannot be
// read, Playwright does not fail - it reports the line in the compiled output.
//
// Two listings of the same checkout, running at once, can make it unreadable.
// A listing that misses the cache first deletes every entry for that file,
// including the map a sibling listing has just written and is about to read,
// and then rewrites it with a plain writeFileSync, which a reader can catch
// half-written. Either way the sibling reports that file's compiled lines -
// e2e/spacetime.spec.js at 84, 126, 159 and 180 where the source has 80, 115,
// 142 and 163 - and nothing says so.
//
// One Jest run does this to itself. tests/shardInventory.test.js lists the
// suite seven times, and tests/docsFactsScope.test.js runs tools/docs-facts.mjs,
// which lists it again, on another worker. A fresh worktree has nothing in the
// cache under its paths, so every listing is a writer. Four listings started
// together from an empty cache disagreed with a lone listing in every one of
// thirteen trials; with a cache each, in none of ten.
//
// PWTEST_CACHE_DIR is where Playwright looks for the cache. Pointing it at a
// directory nobody else knows about removes the race rather than narrowing it.
// Compiling from cold costs about a second and a half per listing, so a caller
// making several listings in sequence can share one - sequential listings do
// not overlap, which is the whole of the problem.
// =============================================================================

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Run `fn` with a transform cache of its own, and remove it afterwards.
 *
 * @template T
 * @param {(cacheEnv: {PWTEST_CACHE_DIR: string}) => T} fn - Called with the
 *   variable to add to the environment of every Playwright process it starts
 * @returns {T} Whatever `fn` returned
 */
export function inOwnTransformCache(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'gravitas-pw-cache-'));
  try {
    return fn({ PWTEST_CACHE_DIR: dir });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
