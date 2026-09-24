import { describe, test, expect } from '@jest/globals';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import yaml from 'js-yaml';
import { inOwnTransformCache } from '../tools/playwright-cache.mjs';
import {
  parseListing,
  planShards,
  planDigest,
  readTimings,
  serialFiles,
  shardSpan,
  withDurations,
} from '../tools/e2e-shards.mjs';

// =============================================================================
// The shards add up to the suite
// -----------------------------------------------------------------------------
// The source browser suite runs as twelve shards of about equal duration,
// planned by tools/e2e-shards.mjs from Playwright's listing and the timings in
// tools/e2e-timings.json. That is only a safe arrangement while the twelve of
// them between them run every test the single job would, once each: a planning
// mistake - a test dropped for having no timing, a list line Playwright reads
// as something else, a project filtered on one side only - would quietly stop
// running some tests, and every shard would still be green.
//
// So this plans the split exactly as CI does and holds it to the listing, then
// hands Playwright the plan's own lines and checks it reads them back as the
// same tests. It lists rather than runs, which takes seconds. CI's coverage job
// checks the same thing again after the fact, on what actually ran.
// =============================================================================

/** The shard count, from the workflow rather than a copy of it. */
const SHARDS = yaml.load(readFileSync('.github/workflows/ci.yml', 'utf8')).jobs
  .e2e.strategy.matrix.shard.length;

/** `npx playwright test --list`, as CI's environment would print it. */
function listing(cacheEnv, extra = []) {
  // Playwright refuses to run inside Jest, and rightly - but this is listing,
  // in a child process, and the markers Jest leaves in the environment are
  // what it detects. Removed rather than worked around: the child is not
  // running under Jest in any sense that matters.
  const env = { ...process.env, CI: '1', ...cacheEnv };
  delete env.JEST_WORKER_ID;
  delete env.NODE_OPTIONS;
  return execFileSync(
    'npx',
    ['playwright', 'test', '--list', '--reporter=list', ...extra],
    { encoding: 'utf8', maxBuffer: 128 * 1024 * 1024, env }
  );
}

describe('the planned shards cover the suite exactly once', () => {
  const serial = serialFiles();
  const timings = readTimings();
  const dir = mkdtempSync(path.join(tmpdir(), 'gravitas-shards-'));

  // The listings share a transform cache that is theirs alone. They run one
  // after another, so they cannot race each other; what they must not do is
  // share the machine's with a listing on another Jest worker, which once made
  // a whole inventory report e2e/spacetime.spec.js at its compiled line
  // numbers. tools/playwright-cache.mjs has the mechanism.
  const { whole, plan, readBack, firstReadBack, compiled } =
    inOwnTransformCache(cacheEnv => {
      const whole = parseListing(listing(cacheEnv));
      const plan = planShards(whole, timings, SHARDS, { serial });
      const all = path.join(dir, 'all.txt');
      writeFileSync(
        all,
        `${plan.shards
          .flat()
          .map(t => t.line)
          .join('\n')}\n`
      );
      const first = path.join(dir, 'first.txt');
      writeFileSync(first, `${plan.shards[0].map(t => t.line).join('\n')}\n`);
      return {
        whole,
        plan,
        readBack: parseListing(listing(cacheEnv, ['--test-list', all])),
        firstReadBack: parseListing(listing(cacheEnv, ['--test-list', first])),
        compiled: readdirSync(cacheEnv.PWTEST_CACHE_DIR).length,
      };
    });
  const lines = tests => tests.map(t => t.line);

  test('the listings compiled into their own cache, not the shared one', () => {
    // PWTEST_CACHE_DIR is Playwright's own variable rather than a documented
    // option. An upgrade that stopped reading it would put these listings
    // back in the shared cache without a word, and this is where it shows.
    expect(compiled).toBeGreaterThan(0);
  });

  test('the listing is not empty, which would pass everything else', () => {
    expect(whole.length).toBeGreaterThan(400);
    expect(new Set(lines(whole)).size).toBe(whole.length);
  });

  test('the shard count is the workflow matrix, and there is more than one', () => {
    expect(SHARDS).toBeGreaterThan(1);
    expect(plan.shards).toHaveLength(SHARDS);
  });

  test('every listed test is in exactly one shard', () => {
    const seen = new Map();
    for (const [i, shard] of plan.shards.entries()) {
      for (const t of shard) {
        expect(seen.has(t.line)).toBe(false);
        seen.set(t.line, i + 1);
      }
    }
    expect([...seen.keys()].sort()).toEqual(lines(whole).sort());
  });

  test('Playwright reads the plan back as exactly the listed tests', () => {
    // The format check: a line `--test-list` matched to nothing would be a
    // test nobody runs, and a line it matched to two would be run twice.
    expect(lines(readBack).sort()).toEqual(lines(whole).sort());
    expect(lines(firstReadBack).sort()).toEqual(lines(plan.shards[0]).sort());
  });

  test('mobile coverage is in there, on some shard', () => {
    // The one project that is not chromium, and the easiest to lose to a
    // filter that looked right.
    const mobile = whole.filter(t => t.line.startsWith('[mobile-chrome]'));
    expect(mobile.length).toBeGreaterThan(0);
    const planned = new Set(lines(plan.shards.flat()));
    for (const t of mobile) expect(planned.has(t.line)).toBe(true);
  });

  test('every shard computes the same plan', () => {
    // No job hands the plan to the others; each works it out, so it must not
    // depend on anything but the listing and the timings.
    const again = planShards(whole, timings, SHARDS, { serial });
    expect(planDigest(again.shards)).toBe(planDigest(plan.shards));
  });

  test('a test the timings have never seen is still planned', () => {
    const forgotten = { ...timings };
    for (const t of whole.slice(0, 25)) delete forgotten[t.key];
    const replanned = planShards(whole, forgotten, SHARDS, { serial });
    expect(lines(replanned.shards.flat()).sort()).toEqual(lines(whole).sort());
  });

  test('no shard is empty and none holds more than a third', () => {
    for (const shard of plan.shards) {
      expect(shard.length).toBeGreaterThan(0);
      expect(shard.length).toBeLessThan(whole.length / 3);
    }
  });

  test('the timings still describe most of the suite', () => {
    // Not a correctness condition - an unknown test is planned at its file's
    // median - but a plan built mostly on guesses is not balanced any more,
    // and `node tools/e2e-shards.mjs record` is the fix. See e2e/README.md.
    const known = withDurations(whole, timings).filter(t => !t.estimated);
    expect(known.length / whole.length).toBeGreaterThan(0.8);
  });
});

describe('the simulation of a shard', () => {
  const t = (order, file, seconds) => ({ order, file, seconds });

  test('two workers take the next test in listing order', () => {
    // 60 then 10, 10, 10: the long one first leaves the other worker 30.
    expect(
      shardSpan(
        [t(0, 'a', 60), t(1, 'b', 10), t(2, 'b', 10), t(3, 'b', 10)],
        new Set()
      )
    ).toBe(60);
    // The same tests with the long one last: the second worker is free at 10,
    // takes it there, and finishes at 70.
    expect(
      shardSpan(
        [t(0, 'b', 10), t(1, 'b', 10), t(2, 'b', 10), t(3, 'a', 60)],
        new Set()
      )
    ).toBe(70);
  });

  test("a serial file's tests queue on one worker", () => {
    const tests = [t(0, 'chaos', 30), t(1, 'chaos', 30), t(2, 'x', 5)];
    expect(shardSpan(tests, new Set())).toBe(35);
    expect(shardSpan(tests, new Set(['chaos']))).toBe(60);
  });
});
