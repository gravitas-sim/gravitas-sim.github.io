// =============================================================================
// Counting Jest's tests without running them, and never serving a stale count
// -----------------------------------------------------------------------------
// tools/jest-count-cache.mjs gets the Jest totals for the documentation by
// loading every suite with its tests filtered out, and keeps each suite's count
// while everything the suite read is unchanged. This builds a small repository
// of three suites in a temporary directory and holds that to its two promises:
//
//   - the count is the count a real run reports, including skipped and todo
//     tests, tests generated from a directory listing, and hooks that must not
//     run (a suite's body and its beforeAll throw here, so a count run that ran
//     either would be caught)
//   - an entry is served only while its inputs hold: a changed import, a new
//     file in a directory the suite listed, a changed config or lock file each
//     bring the suite back, and a suite that starts a child process is never
//     stored
//
// The totals checked against the fixture's own real Jest run are the proof that
// counting and running agree; the full-tree equivalence was measured once when
// the cache was introduced and is recorded in the register row D-R4-DOCS-01.
// =============================================================================

/* global process */
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals';
import { execFileSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import nodeModule, { createRequire } from 'node:module';

import { countJestTests, environmentKey } from '../tools/jest-count-cache.mjs';
import { jestModeFrom } from '../tools/docs-facts.mjs';

const require = createRequire(import.meta.url);
const JEST = require.resolve('jest/bin/jest');

// A node child's ES module imports are seen through module.registerHooks
// (Node 22.15 and later). Without it, which is Node 20, the tracker marks any
// suite that runs a node child as uncacheable rather than guess, so the two
// suites that run one are loaded again every time. Both behaviors are
// correct; the expectations below say which one this Node has.
const follows = typeof nodeModule.registerHooks === 'function';
const reusedWhen = (withHooks, without) => (follows ? withHooks : without);

let repo;
let cacheFile;

const put = (rel, text) => {
  const file = path.join(repo, rel);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, text);
};

const count = (extra = {}) =>
  countJestTests({
    repo,
    cacheFile,
    workers: 1,
    physicsReport: path.join(repo, 'out', 'physics.json'),
    ...extra,
  });

/** What a real run of the fixture reports. */
const realRun = () => {
  const out = path.join(repo, 'real.json');
  const env = { ...process.env, NODE_OPTIONS: '--experimental-vm-modules' };
  delete env.JEST_WORKER_ID;
  // CI points this at a path relative to the repository's own working
  // directory, which does not exist in the fixture; the fixture's physics
  // stand-in would fail to write it and lose its tests from the real run.
  delete env.GRAVITAS_PHYSICS_REPORT;
  try {
    execFileSync(
      process.execPath,
      [JEST, '--silent', '--json', `--outputFile=${out}`],
      { cwd: repo, env, stdio: 'ignore' }
    );
  } catch {
    // the fixture's bodies throw on purpose
  }
  const r = JSON.parse(readFileSync(out, 'utf8'));
  return { tests: r.numTotalTests, suites: r.numTotalTestSuites };
};

beforeAll(() => {
  repo = realpathSync(mkdtempSync(path.join(tmpdir(), 'gravitas-count-fx-')));
  cacheFile = path.join(repo, 'cache', 'jest-counts.json');
  mkdirSync(path.join(repo, 'out'));
  put('package.json', '{"name":"fx","type":"module"}\n');
  put('package-lock.json', '{}\n');
  put(
    'jest.config.js',
    "export default { testEnvironment: 'jsdom', transform: {}, testMatch: ['**/tests/**/*.test.js'] };\n"
  );
  put('lib/a.js', 'export const n = 3;\n');
  put(
    'tests/a.test.js',
    `import { n } from '../lib/a.js';
describe('a', () => {
  for (let i = 0; i < n; i++) test('t' + i, () => { throw new Error('body ran'); });
  test.todo('later');
  test.skip('skipped', () => {});
});
`
  );
  put('data/one.txt', '1\n');
  put('data/two.txt', '2\n');
  put(
    'tests/b.test.js',
    `import { readdirSync } from 'node:fs';
describe.each(readdirSync(new URL('../data/', import.meta.url)))('file %s', () => {
  beforeAll(() => { throw new Error('hook ran'); });
  it.each([1, 2])('case %i', () => {});
});
`
  );
  // c: a node child, run as the suite loads, whose own imports decide the count
  put('lib/val.mjs', 'export const v = 2;\n');
  put('lib/child.mjs', "import { v } from './val.mjs';\nconsole.log(v);\n");
  put(
    'tests/c.test.js',
    `import { execFileSync } from 'node:child_process';
const out = execFileSync(process.execPath, [new URL('../lib/child.mjs', import.meta.url).pathname], { encoding: 'utf8' });
for (let i = 0; i < Number(out); i++) test('c' + i, () => {});
`
  );
  // d: a child that is not node, which nothing can see into
  put(
    'tests/d.test.js',
    `import { execFileSync } from 'node:child_process';
const out = execFileSync('sh', ['-c', 'echo 1'], { encoding: 'utf8' });
for (let i = 0; i < Number(out); i++) test('d' + i, () => {});
`
  );
  // The physics suite's stand-in: runs a node child that writes the report
  put('lib/checks.mjs', 'export const checks = [1, 2];\n');
  put(
    'lib/phys.mjs',
    `import { writeFileSync } from 'node:fs';
import { checks } from './checks.mjs';
const text = JSON.stringify({ checks });
if (process.env.GRAVITAS_PHYSICS_REPORT) writeFileSync(process.env.GRAVITAS_PHYSICS_REPORT, text);
console.log(text);
`
  );
  put(
    'tests/physicsValidation.test.js',
    `import { execFileSync } from 'node:child_process';
const report = JSON.parse(execFileSync(process.execPath, [new URL('../lib/phys.mjs', import.meta.url).pathname], { encoding: 'utf8', env: { ...process.env } }));
for (const c of report.checks) test('check ' + c, () => {});
`
  );
});

afterAll(() => {
  rmSync(repo, { recursive: true, force: true });
});

describe('the count and the cache', () => {
  jest.setTimeout(240000);

  const physics = () => path.join(repo, 'out', 'physics.json');

  test('a cold count equals what a real run reports', () => {
    const cold = count();
    // a: 3 + todo + skip = 5; b: two files x two cases = 4; c: 2; d: 1;
    // physics stand-in: 2 checks
    expect(cold.tests).toBe(14);
    expect(cold.suites).toBe(5);
    expect(cold.reused).toBe(0);
    expect(cold.counted).toBe(5);
    expect({ tests: cold.tests, suites: cold.suites }).toEqual(realRun());
    expect(JSON.parse(readFileSync(physics(), 'utf8')).checks).toHaveLength(2);
  });

  test('a warm count serves what it can, and a child that is not node is never kept', () => {
    rmSync(physics());
    const warm = count();
    expect(warm.tests).toBe(14);
    expect(warm.reused).toBe(reusedWhen(4, 2));
    expect(warm.counted).toBe(reusedWhen(1, 3));
    expect(warm.uncacheable).toEqual(
      reusedWhen(
        ['tests/d.test.js'],
        [
          'tests/c.test.js',
          'tests/d.test.js',
          'tests/physicsValidation.test.js',
        ]
      )
    );
    // the suite that produced the physics report was served, and so was the report
    expect(JSON.parse(readFileSync(physics(), 'utf8')).checks).toHaveLength(2);
  });

  test('an entry is served as stored, which is what makes it a cache', () => {
    const cache = JSON.parse(readFileSync(cacheFile, 'utf8'));
    cache.suites['tests/a.test.js'].count = 99;
    writeFileSync(cacheFile, JSON.stringify(cache));
    expect(count().tests).toBe(14 - 5 + 99);
    // and loading the suite again puts the truth back
    put('lib/a.js', 'export const n = 3; // touched\n');
    expect(count().tests).toBe(14);
  });

  test('a changed import brings its suite back and leaves the others', () => {
    put('lib/a.js', 'export const n = 4;\n');
    const after = count();
    expect(after.tests).toBe(15);
    expect(after.reused).toBe(reusedWhen(3, 1));
    expect(after.counted).toBe(reusedWhen(2, 4));
    expect(after.tests).toBe(realRun().tests);
  });

  test("a change in a child's own import brings the suite that ran it back", () => {
    put('lib/val.mjs', 'export const v = 3;\n');
    const after = count();
    expect(after.tests).toBe(16);
    expect(after.reused).toBe(reusedWhen(3, 2));
    expect(after.tests).toBe(realRun().tests);
  });

  test('a new file in a directory a suite listed brings that suite back', () => {
    put('data/three.txt', '3\n');
    const after = count();
    expect(after.tests).toBe(18);
    expect(after.reused).toBe(reusedWhen(3, 1));
    expect(after.tests).toBe(realRun().tests);
  });

  test('a file nobody listed does not', () => {
    put('lib/unlisted.txt', 'x\n');
    const after = count();
    expect(after.reused).toBe(reusedWhen(4, 2));
    expect(after.tests).toBe(18);
  });

  test('the physics report follows its suite: changed inputs, a new report', () => {
    put('lib/checks.mjs', 'export const checks = [1, 2, 3];\n');
    const after = count();
    expect(after.tests).toBe(19);
    expect(after.reused).toBe(reusedWhen(3, 2));
    expect(JSON.parse(readFileSync(physics(), 'utf8')).checks).toHaveLength(3);
    // and the new report is what a later, fully cached run serves
    rmSync(physics());
    count();
    expect(JSON.parse(readFileSync(physics(), 'utf8')).checks).toHaveLength(3);
  });

  test('a changed suite file brings it back', () => {
    put(
      'tests/a.test.js',
      "describe('a', () => { test('only', () => {}); });\n"
    );
    const after = count();
    expect(after.tests).toBe(19 - 6 + 1);
    expect(after.reused).toBe(reusedWhen(3, 1));
  });

  test('a changed Jest config, lock file or environment discards everything', () => {
    const before = environmentKey(repo);
    put(
      'jest.config.js',
      "export default { testEnvironment: 'jsdom', transform: {}, testMatch: ['**/tests/**/*.test.js'], verbose: false };\n"
    );
    expect(environmentKey(repo)).not.toBe(before);
    expect(count().reused).toBe(0);

    const afterConfig = environmentKey(repo);
    put('package-lock.json', '{"lockfileVersion":3}\n');
    expect(environmentKey(repo)).not.toBe(afterConfig);
    expect(count().reused).toBe(0);

    const env = { ...process.env, TZ: 'Pacific/Kiritimati' };
    expect(environmentKey(repo, env)).not.toBe(environmentKey(repo));
    const noisy = { ...process.env, GRAVITAS_FACTS_JEST: 'collect' };
    expect(environmentKey(repo, noisy)).toBe(environmentKey(repo));
  });

  test('--jest=collect keeps nothing and agrees', () => {
    const none = count({ cached: false });
    expect(none.reused).toBe(0);
    expect(none.counted).toBe(5);
    expect(none.tests).toBe(realRun().tests);
  });
});

describe('choosing how the totals are had', () => {
  test('the default is the cached count, and a flag or variable chooses', () => {
    expect(jestModeFrom([], {})).toBe('cached');
    expect(jestModeFrom(['--jest=run'], {})).toBe('run');
    expect(jestModeFrom([], { GRAVITAS_FACTS_JEST: 'collect' })).toBe(
      'collect'
    );
    expect(
      jestModeFrom(['--jest=run'], { GRAVITAS_FACTS_JEST: 'collect' })
    ).toBe('run');
  });

  test('a mode that does not exist is refused rather than ignored', () => {
    expect(() => jestModeFrom(['--jest=fast'], {})).toThrow(
      /Unknown Jest mode/
    );
  });
});
