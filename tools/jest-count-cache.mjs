// =============================================================================
// How many Jest tests are there? Counted without running them, and remembered
// -----------------------------------------------------------------------------
// tools/docs-facts.mjs quotes the number of Jest tests and suites in the
// README, the manual, CITATION.cff and .zenodo.json. It used to get them by
// running every test in the repository, about twenty thousand of them, to read
// one number off the end - and the merge queue does that on every refresh of a
// queued pull request, one pull request at a time.
//
// Two things make that unnecessary, and neither changes the number.
//
// 1. Counting does not need the tests' bodies. A test is counted when its suite
//    registers it, as the file is loaded, and Jest reports a test that a name
//    filter skipped as skipped, in the same total. So the count run loads every
//    suite exactly as a real run does (the same config, the same jsdom
//    environment, the same setup file, so anything computed while a suite loads
//    - an it.each over a fixture, a table built at the top of a describe - is
//    computed) and filters every test out by a name that matches nothing. The
//    bodies and the beforeAll/afterAll hooks around them do not run: Jest does
//    not run a hook for a block with no enabled test.
//
// 2. A suite that has not changed has not changed its count. "Has not changed"
//    is observed, not inferred from its imports: tools/jest-read-tracker.cjs
//    records every path under the repository that the suite opened, stat-ed,
//    listed or checked while it loaded, and the entry for a suite is the count
//    plus the state of each of those paths (a hash of the file, of a directory
//    listing, or "absent"). The entry is served only while every one of them is
//    exactly as it was. A suite that runs a node child as it loads (the
//    physics validation, the detection validator, ...) is followed into the
//    child, whose reads, including the modules node's own loader reads, are
//    folded into the suite's. A suite that starts anything the tracker cannot
//    follow (git or a shell, an asynchronous child, a worker thread) is never
//    stored and is counted again every time.
//
//    The physics report that tests/physicsValidation.test.js leaves for the
//    documentation (GRAVITAS_PHYSICS_REPORT) is kept with that suite's entry
//    and written out again when the entry is served, so the physics validation
//    runs once when its inputs have changed and not at all when they have not.
//
// What the key is
// -----------------------------------------------------------------------------
// An entry is valid for one *environment key*, and for one suite while its
// observed paths hold. The key covers everything that is not a repository
// path:
//
//   - the major version of Node, the platform and the architecture
//   - package-lock.json (so node_modules, which the tracker does not watch,
//     is whatever the lock says) and jest.config.js
//   - the source of the tracker and of this file
//   - CI, TZ, LANG, LC_ALL, NODE_ENV and every GRAVITAS_* variable except the
//     ones that steer this tool
//
// Change any of them and every entry is discarded. A path the tracker excludes
// (node_modules, .git) is covered by the lock file or cannot hold a test.
//
// What is not covered, and why it is acceptable: a suite whose count depends on
// the clock, the network or Math.random would count differently on every run,
// cached or not. None does. The backstop is unchanged: CI counts with a real
// run (GRAVITAS_FACTS_CACHE=.facts, written by `npm test`) and
// `docs:check:tests` fails on any documented count that is wrong.
//
// `--jest=run` (or GRAVITAS_FACTS_JEST=run) in tools/docs-facts.mjs brings back
// the old behavior, a real run of every test; `--jest=collect` counts without
// the cache.
// =============================================================================

import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const TOOLS = dirname(fileURLToPath(import.meta.url));
const TRACKER = join(TOOLS, 'jest-read-tracker.cjs');
const { stateOf, hashOf } = require('./jest-read-tracker.cjs');

const SCHEMA = 4;

/**
 * The suite that runs the physics validation as it loads and, when
 * GRAVITAS_PHYSICS_REPORT is set, leaves the report where that names. When the
 * suite is served from the cache its report is served with it: the suite's
 * entry holds only while everything the validation read is unchanged, so the
 * report it produced still is what a run would produce.
 */
const PHYSICS_SUITE = 'tests/physicsValidation.test.js';

/** A test name that nothing is called, so that every test is filtered out. */
const NEVER = '^__gravitas_count_only_never_matches__$';

/** Environment variables that steer this tool rather than describe the world. */
const CONTROL = /^GRAVITAS_(COUNT_|FACTS_|PHYSICS_REPORT$)/;

const fileHash = path => (existsSync(path) ? hashOf(readFileSync(path)) : '-');

/**
 * Everything an entry depends on that is not a path the tracker watches.
 *
 * @param {string} repo - Repository root
 * @param {NodeJS.ProcessEnv} env - The environment the count run will see
 * @returns {string} A digest
 */
export function environmentKey(repo, env = process.env) {
  const vars = Object.keys(env)
    .filter(
      k => /^(CI|TZ|LANG|LC_ALL|NODE_ENV)$/.test(k) || /^GRAVITAS_/.test(k)
    )
    .filter(k => !CONTROL.test(k))
    .sort()
    .map(k => `${k}=${env[k]}`);
  return hashOf(
    JSON.stringify({
      schema: SCHEMA,
      node: process.versions.node.split('.')[0],
      platform: `${process.platform}-${process.arch}`,
      lock: fileHash(join(repo, 'package-lock.json')),
      config: fileHash(join(repo, 'jest.config.js')),
      tracker: fileHash(TRACKER),
      library: fileHash(fileURLToPath(import.meta.url)),
      vars,
    })
  );
}

/**
 * Whether every path an entry observed is still in the state it was.
 *
 * @param {string} repo - Repository root
 * @param {{paths: Array<[string, boolean, string]>}} entry - A stored entry
 * @param {Map<string, string>} memo - States already read in this pass
 * @returns {boolean} True when the entry can be served
 */
export function entryHolds(repo, entry, memo) {
  for (const [rel, listed, state] of entry.paths) {
    if (stateOf(join(repo, rel), listed, memo) !== state) return false;
  }
  return true;
}

/** Read the cache file, or an empty cache. */
function readCache(file, key) {
  try {
    const cache = JSON.parse(readFileSync(file, 'utf8'));
    if (cache.schema === SCHEMA && cache.key === key) return cache;
  } catch {
    // missing or unreadable: start again
  }
  return { schema: SCHEMA, key, suites: {}, artifacts: {} };
}

/** Write it whole or not at all, so an interrupted run leaves the old one. */
function writeCache(file, cache) {
  mkdirSync(dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(cache) + '\n');
  renameSync(tmp, file);
}

/** Where the cache lives unless GRAVITAS_FACTS_JEST_CACHE says otherwise. */
export function defaultCacheFile(repo, env = process.env) {
  return (
    env.GRAVITAS_FACTS_JEST_CACHE ||
    join(repo, 'node_modules', '.cache', 'gravitas', 'jest-counts.json')
  );
}

function jestBinFor(repo) {
  for (const base of [join(repo, 'package.json'), import.meta.url]) {
    try {
      return createRequire(base).resolve('jest/bin/jest');
    } catch {
      // try the next place
    }
  }
  throw new Error('jest is not installed');
}

/** The child's environment: the caller's, minus Jest's own markers, plus ours. */
function childEnv(repo, out, physicsReport) {
  const env = { ...process.env };
  delete env.JEST_WORKER_ID;
  const quoted = TRACKER.includes(' ') ? `"${TRACKER}"` : TRACKER;
  env.NODE_OPTIONS = [
    process.env.NODE_OPTIONS,
    '--experimental-vm-modules',
    `--require ${quoted}`,
  ]
    .filter(Boolean)
    .join(' ');
  env.GRAVITAS_COUNT_TRACK = '1';
  env.GRAVITAS_COUNT_REPO = repo;
  env.GRAVITAS_COUNT_OUT = out;
  if (physicsReport) env.GRAVITAS_PHYSICS_REPORT = physicsReport;
  return env;
}

/**
 * Count the tests in the suites that have to be loaded, by loading them.
 *
 * @returns {{counts: Map<string, number>, records: Map<string, object>,
 *   failed: string[]}} Per-suite counts and what each suite read
 */
function collect({ repo, files, workers, work, physicsReport, jestBin }) {
  const out = join(work, 'records');
  mkdirSync(out, { recursive: true });
  const json = join(work, 'report.json');
  const args = [
    jestBin,
    '--silent',
    `--testNamePattern=${NEVER}`,
    '--json',
    `--outputFile=${json}`,
    ...(workers ? [`--maxWorkers=${workers}`] : []),
    '--runTestsByPath',
    ...files.map(f => join(repo, f)),
  ];
  try {
    execFileSync(process.execPath, args, {
      cwd: repo,
      env: childEnv(repo, out, physicsReport),
      stdio: ['ignore', 'ignore', 'ignore'],
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch {
    // A failing suite exits non-zero but still leaves its report.
  }
  const counts = new Map();
  const failed = [];
  if (existsSync(json)) {
    const report = JSON.parse(readFileSync(json, 'utf8'));
    for (const r of report.testResults) {
      const rel = relative(repo, r.name).split(sep).join('/');
      counts.set(rel, r.assertionResults.length);
      if (r.status === 'failed') failed.push(rel);
    }
  }
  const records = new Map();
  for (const f of readdirSync(out).filter(n => n.endsWith('.json'))) {
    const rec = JSON.parse(readFileSync(join(out, f), 'utf8'));
    records.set(relative(repo, rec.testPath).split(sep).join('/'), rec);
  }
  return { counts, records, failed };
}

/** List the suites exactly as Jest would run them. */
function listSuites(repo, jestBin) {
  const out = execFileSync(
    process.execPath,
    [jestBin, '--listTests', '--json'],
    {
      cwd: repo,
      encoding: 'utf8',
      env: { ...process.env, NODE_OPTIONS: '--experimental-vm-modules' },
      maxBuffer: 64 * 1024 * 1024,
    }
  );
  return JSON.parse(out)
    .map(f => relative(repo, f).split(sep).join('/'))
    .sort();
}

/**
 * The Jest totals the documentation quotes.
 *
 * @param {object} options
 * @param {string} options.repo - Repository root
 * @param {string} [options.cacheFile] - Where entries are kept
 * @param {boolean} [options.cached=true] - False counts every suite afresh
 * @param {number} [options.workers] - Jest's --maxWorkers, when set
 * @param {string} [options.physicsReport] - Path the physics suite's own test
 *   writes its report to (GRAVITAS_PHYSICS_REPORT), so one run serves both
 * @param {NodeJS.ProcessEnv} [options.env] - For the key
 * @returns {{tests: number, suites: number, reused: number, counted: number,
 *   uncacheable: string[], failed: string[]}} The totals and how they were had
 */
export function countJestTests({
  repo,
  cacheFile = defaultCacheFile(repo),
  cached = true,
  workers,
  physicsReport,
  env = process.env,
}) {
  repo = resolve(repo);
  const jestBin = jestBinFor(repo);
  const key = environmentKey(repo, env);
  const cache = cached
    ? readCache(cacheFile, key)
    : { schema: SCHEMA, key, suites: {}, artifacts: {} };

  const listed = listSuites(repo, jestBin);
  const memo = new Map();
  const counts = new Map();
  const todo = [];
  for (const rel of listed) {
    const entry = cache.suites[rel];
    if (entry && entryHolds(repo, entry, memo)) counts.set(rel, entry.count);
    else todo.push(rel);
  }
  const reused = counts.size;
  const kept = cache.artifacts.physics;
  if (
    physicsReport &&
    kept &&
    kept.suite === PHYSICS_SUITE &&
    counts.has(PHYSICS_SUITE)
  ) {
    writeFileSync(physicsReport, kept.report);
  }

  const uncacheable = [];
  let failed = [];
  if (todo.length) {
    const work = mkdtempSync(join(tmpdir(), 'gravitas-jest-count-'));
    try {
      const got = collect({
        repo,
        files: todo,
        workers,
        work,
        physicsReport,
        jestBin,
      });
      failed = got.failed;
      for (const rel of todo) {
        if (!got.counts.has(rel)) {
          // Jest said nothing about it: fail loudly rather than undercount.
          throw new Error(`the count run did not report ${rel}`);
        }
        counts.set(rel, got.counts.get(rel));
        const rec = got.records.get(rel);
        delete cache.suites[rel];
        if (!rec || rec.uncacheable) {
          uncacheable.push(rel);
          continue;
        }
        if (got.failed.includes(rel)) continue;
        // The suite file itself is an input whatever the tracker saw first.
        const seen = new Map(rec.paths);
        if (!seen.has(rel)) seen.set(rel, 'seen');
        const paths = [];
        for (const [p, how] of [...seen].sort(([a], [b]) => (a < b ? -1 : 1))) {
          const isListed = how === 'listed';
          paths.push([p, isListed, stateOf(join(repo, p), isListed)]);
        }
        cache.suites[rel] = { count: got.counts.get(rel), paths };
      }
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
    if (todo.includes(PHYSICS_SUITE)) {
      delete cache.artifacts.physics;
      if (
        cache.suites[PHYSICS_SUITE] &&
        physicsReport &&
        existsSync(physicsReport)
      ) {
        const report = readFileSync(physicsReport, 'utf8');
        try {
          JSON.parse(report);
          cache.artifacts.physics = { suite: PHYSICS_SUITE, report };
        } catch {
          // not a whole report: do not keep it
        }
      }
    }
  }
  // Suites that no longer exist leave the cache.
  const keep = new Set(listed);
  for (const rel of Object.keys(cache.suites)) {
    if (!keep.has(rel)) delete cache.suites[rel];
  }
  if (cached) writeCache(cacheFile, cache);

  let tests = 0;
  for (const n of counts.values()) tests += n;
  return {
    tests,
    suites: listed.length,
    reused,
    counted: todo.length,
    uncacheable,
    failed,
  };
}
