// =============================================================================
// A stale count cannot hide in the "full" set
// -----------------------------------------------------------------------------
// `npm run docs:check` verifies the facts that cost milliseconds and *reports*
// the ones that cost a test run - the jest counts, the browser-suite count, the
// physics total, the bundle sizes - as not measured. Then it prints
// "Documentation matches the source" and exits zero.
//
// CI ran that form, in a step called "Documentation counts and links". So a
// branch could add a test file, leave README.md claiming the old number, and
// collect a green tick for a document that was no longer true. It did, more
// than once: README.md claimed 3608 jest tests against 4844 and 579 browser
// tests against 1061, and three of the open v1.1 pull requests were each
// carrying stale counts at the time this was written.
//
// The expensive facts are grouped now by what each costs to measure, and CI
// runs each group in the job that has already paid for it. These tests are the
// demonstration that the arrangement does what the old one did not: the same
// wrong number that the cheap check waves through fails the check CI runs.
//
// Nothing here runs jest or the physics suite. The measurement is what gets
// perturbed, not the document: GRAVITAS_FACTS_CACHE is pointed at a report
// claiming one test in one suite, which no README could be describing. That
// keeps the test fast, deterministic, and independent of whatever the true
// counts happen to be this week.
// =============================================================================

import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ALL_GROUPS, FACT_GROUPS } from '../tools/docs-facts.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let cache;

/** A reports directory whose numbers are deliberately impossible. */
function lyingCache() {
  const dir = mkdtempSync(path.join(tmpdir(), 'gravitas-facts-'));
  writeFileSync(
    path.join(dir, 'jest.json'),
    JSON.stringify({
      numTotalTests: 1,
      numTotalTestSuites: 1,
      numFailedTests: 0,
    })
  );
  // One check, so physicsChecks is wrong too, and the coverage block with it.
  writeFileSync(
    path.join(dir, 'physics.json'),
    JSON.stringify({
      passed: 1,
      failed: 0,
      elapsedMs: 1,
      checks: [
        {
          group: 'Unit system',
          kind: 'analytic',
          name: 'a stand-in',
          pass: true,
        },
      ],
    })
  );
  return dir;
}

/**
 * Run the facts tool and report how it went, without throwing on a failure.
 *
 * @param {string[]} args - Arguments after the script name
 * @returns {{code: number, out: string}} Exit status and everything it printed
 */
function docsFacts(args) {
  try {
    const out = execFileSync(
      process.execPath,
      ['tools/docs-facts.mjs', ...args],
      {
        cwd: REPO,
        encoding: 'utf8',
        env: { ...process.env, GRAVITAS_FACTS_CACHE: cache },
        maxBuffer: 32 * 1024 * 1024,
      }
    );
    return { code: 0, out };
  } catch (err) {
    return {
      code: err.status ?? 1,
      out: `${err.stdout || ''}${err.stderr || ''}`,
    };
  }
}

beforeEach(() => {
  cache = lyingCache();
});
afterEach(() => {
  rmSync(cache, { recursive: true, force: true });
});

describe('a fact that only the wider check measures', () => {
  test('the cheap check passes over it, and says that it did', () => {
    // The old CI step, on a tree whose measured test count is impossible. It
    // has nothing to say, which is the defect: "Documentation matches the
    // source" is printed by a run that did not look.
    const cheap = docsFacts(['--check']);
    expect(cheap.code).toBe(0);
    expect(cheap.out).toMatch(/Documentation matches the source/);
    expect(cheap.out).toMatch(/needs --groups=tests:.*jestTests/);
  });

  test('the check CI runs now does not', () => {
    const wider = docsFacts(['--check', '--groups=tests']);
    expect(wider.code).toBe(1);
    expect(wider.out).toMatch(/"jestTests" says \d+, the source says 1/);
    expect(wider.out).toMatch(/documentation problem/);
  });

  test('and so does the undivided form the release gate runs', () => {
    const full = docsFacts(['--check', '--full']);
    expect(full.code).toBe(1);
    expect(full.out).toMatch(/"jestTests" says \d+, the source says 1/);
  });
});

describe('the groups partition the facts that cost something', () => {
  test('every group is reachable from the command line', () => {
    for (const group of ALL_GROUPS) {
      const out = docsFacts(['--groups=' + group, '--json']);
      expect({ group, code: out.code }).toEqual({ group, code: 0 });
      const facts = JSON.parse(out.out);
      for (const key of FACT_GROUPS[group].keys) {
        expect({ group, key, present: key in facts }).toEqual({
          group,
          key,
          present: true,
        });
      }
    }
  });

  test('a group that does not exist is refused rather than ignored', () => {
    // Silently gathering nothing would be the same defect one level up: a
    // command that looks like it checked something and did not.
    const out = docsFacts(['--check', '--groups=everything']);
    expect(out.code).toBe(2);
    expect(out.out).toMatch(/Unknown fact group/);
  });

  test('--full is exactly every group', () => {
    const full = JSON.parse(docsFacts(['--full', '--json']).out);
    for (const group of ALL_GROUPS) {
      for (const key of FACT_GROUPS[group].keys) {
        expect({ key, present: key in full }).toEqual({ key, present: true });
      }
    }
  });
}, 120000);
