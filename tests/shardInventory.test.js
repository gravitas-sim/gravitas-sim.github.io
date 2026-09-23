import { describe, test, expect } from '@jest/globals';
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { inOwnTransformCache } from '../tools/playwright-cache.mjs';

// =============================================================================
// The shards add up to the suite
// -----------------------------------------------------------------------------
// The source browser suite runs as six shards across six runners because it
// stopped fitting in one job. That is only a safe change while the six of them
// between them run every test the single job ran, once each: a sharding mistake
// - a stale total, a filter applied on one side only - would quietly stop
// running some tests, and every shard would still be green.
//
// So this asks Playwright for both inventories and compares them. It lists
// rather than runs, which takes seconds.
// =============================================================================

const SHARDS = 6;

/** Every test id Playwright would run, for a given shard or for all of them. */
function inventory(shard, cacheEnv) {
  const args = ['playwright', 'test', '--list', '--reporter=list'];
  if (shard) args.push(`--shard=${shard}/${SHARDS}`);
  // Playwright refuses to run inside Jest, and rightly - but this is listing,
  // in a child process, and the markers Jest leaves in the environment are
  // what it detects. Removed rather than worked around: the child is not
  // running under Jest in any sense that matters.
  const env = { ...process.env, CI: '1', ...cacheEnv };
  delete env.JEST_WORKER_ID;
  delete env.NODE_OPTIONS;
  const out = execFileSync('npx', args, {
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024,
    env,
  });
  const ids = [];
  for (const line of out.split('\n')) {
    const m = line.match(/^\s+\[([^\]]+)\] › (\S+):(\d+):(\d+) › (.*)$/);
    if (m) ids.push(`${m[1]}|${m[2]}:${m[3]}:${m[4]}|${m[5]}`);
  }
  return ids;
}

describe('the shards cover the suite exactly once', () => {
  // The seven listings share a transform cache that is theirs alone. They run
  // one after another, so they cannot race each other; what they must not do
  // is share the machine's with a listing on another Jest worker, which once
  // made the whole inventory report e2e/spacetime.spec.js at its compiled line
  // numbers while every shard had the real ones. tools/playwright-cache.mjs
  // has the mechanism.
  const { whole, shards, compiled } = inOwnTransformCache(cacheEnv => ({
    whole: inventory(null, cacheEnv),
    shards: Array.from({ length: SHARDS }, (_, i) =>
      inventory(i + 1, cacheEnv)
    ),
    compiled: readdirSync(cacheEnv.PWTEST_CACHE_DIR).length,
  }));

  test('the listings compiled into their own cache, not the shared one', () => {
    // PWTEST_CACHE_DIR is Playwright's own variable rather than a documented
    // option. An upgrade that stopped reading it would put these listings
    // back in the shared cache without a word, and this is where it shows.
    expect(compiled).toBeGreaterThan(0);
  });

  test('the unsharded inventory is not empty, which would pass everything else', () => {
    expect(whole.length).toBeGreaterThan(400);
    expect(new Set(whole).size).toBe(whole.length);
  });

  test('every test appears in exactly one shard', () => {
    const seen = new Map();
    for (const [i, ids] of shards.entries()) {
      for (const id of ids) {
        expect(seen.has(id)).toBe(false);
        seen.set(id, i + 1);
      }
    }
    expect(seen.size).toBe(whole.length);
  });

  test('the shards and the whole suite are the same set', () => {
    const union = new Set(shards.flat());
    const missing = whole.filter(id => !union.has(id));
    const extra = [...union].filter(id => !whole.includes(id));
    expect(missing).toEqual([]);
    expect(extra).toEqual([]);
  });

  test('mobile coverage is in there, on some shard', () => {
    // The one project that is not chromium, and the easiest to lose to a
    // filter that looked right.
    const mobile = whole.filter(id => id.startsWith('mobile-chrome|'));
    expect(mobile.length).toBeGreaterThan(0);
    const union = new Set(shards.flat());
    for (const id of mobile) expect(union.has(id)).toBe(true);
  });

  test('no shard is empty and none holds more than a third', () => {
    for (const ids of shards) {
      expect(ids.length).toBeGreaterThan(0);
      expect(ids.length).toBeLessThan(whole.length / 3);
    }
  });
});
