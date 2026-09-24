#!/usr/bin/env node
// =============================================================================
// Splitting the source browser suite into shards of equal duration
// -----------------------------------------------------------------------------
// Playwright's own `--shard=k/n` splits the suite into n runs of equal TEST
// COUNT, in listing order. The listing is alphabetical, and the heavy files -
// accessibility, assistExperiments, authorWalk, binarySweep, centralExperiments,
// chaos - happen to sort first, so the first shard of six took 24 to 29
// minutes while the last took 15, and the whole run waited for the first.
//
// This splits by measured DURATION instead. Every shard computes the same plan
// from the same two inputs, so no job has to hand a plan to the others:
//
//   the listing    `npx playwright test --list`, which names every test the
//                  run would execute, in the order it would execute them
//   the timings    tools/e2e-timings.json, the median duration of each test's
//                  passing attempt over recent CI runs
//
// The listing decides WHAT runs; the timings only decide WHERE. A test the
// timings have never seen is still planned - at the median of its own file, or
// of the suite - so a new test can make a shard slower than predicted, never
// make itself disappear.
//
// The plan is a longest-first assignment: each test, slowest first, goes to the
// shard whose simulated wall time grows least by taking it. The simulation is
// of Playwright itself - two workers, tests handed out in listing order to
// whichever is free first, and a file that configures `mode: 'serial'` run one
// test at a time - because a shard's wall time is not its sum divided by two
// when a seven-minute test starts last.
//
// Three checks stand between the plan and a silent gap:
//
//   each shard asks Playwright which tests its list selects and refuses to run
//   unless that is exactly the tests it planned (`plan`);
//   the coverage job merges every shard's results and fails unless each listed
//   test appears in them exactly once (`verify`);
//   tests/shardInventory.test.js proves the plan partitions the listing.
//
//   node tools/e2e-shards.mjs plan --of 12 --shard 3 --out shard-tests.txt
//   node tools/e2e-shards.mjs verify --report merged.json
//   node tools/e2e-shards.mjs record report.json [report.json ...]
//   node tools/e2e-shards.mjs preview --of 12      print the predicted shards
// =============================================================================

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const TIMINGS_FILE = path.join(REPO, 'tools', 'e2e-timings.json');

/** Workers per shard: what playwright.config.js gives CI. */
export const WORKERS = 2;

/** One test line of `--reporter=list --list`, which is also `--test-list`'s format. */
const LISTED = /^\s*\[([^\]]+)\] › (\S+?):(\d+):(\d+) › (.+)$/;

/**
 * The tests a listing names, in the order Playwright would run them.
 *
 * @param {string} text - `npx playwright test --list --reporter=list` output
 * @returns {Array<{line: string, key: string, file: string, order: number}>}
 *   Each test: its line exactly as `--test-list` accepts it, the key its
 *   timing is recorded under (the line without its line and column, which move
 *   when a file is edited), its file, and its position
 */
export function parseListing(text) {
  const tests = [];
  for (const raw of text.split('\n')) {
    const m = raw.match(LISTED);
    if (!m) continue;
    const [, project, file, , , title] = m;
    tests.push({
      line: raw.trim(),
      key: `[${project}] › ${file} › ${title}`,
      file,
      order: tests.length,
    });
  }
  return tests;
}

/**
 * The spec files that run their tests one at a time.
 *
 * @param {string} [dir] - The suite directory
 * @returns {Set<string>} File names, as the listing prints them
 */
export function serialFiles(dir = path.join(REPO, 'e2e')) {
  const out = new Set();
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.spec.js')) continue;
    const text = readFileSync(path.join(dir, name), 'utf8');
    if (/describe\.configure\(\{\s*mode:\s*['"]serial['"]/.test(text)) {
      out.add(name);
    }
  }
  return out;
}

/**
 * How long a shard takes, as Playwright would run it.
 *
 * Tests are handed out in listing order to whichever worker is free first; a
 * serial file's tests stay on one worker, one after another.
 *
 * @param {Array<{order: number, file: string, seconds: number}>} tests
 * @param {Set<string>} serial - Files whose tests run one at a time
 * @param {number} [workers]
 * @returns {number} Seconds
 */
export function shardSpan(tests, serial, workers = WORKERS) {
  const groups = [];
  const serialGroup = new Map();
  for (const t of [...tests].sort((a, b) => a.order - b.order)) {
    if (serial.has(t.file)) {
      if (serialGroup.has(t.file)) {
        groups[serialGroup.get(t.file)] += t.seconds;
        continue;
      }
      serialGroup.set(t.file, groups.length);
    }
    groups.push(t.seconds);
  }
  const free = new Array(workers).fill(0);
  for (const g of groups) {
    let k = 0;
    for (let i = 1; i < workers; i++) if (free[i] < free[k]) k = i;
    free[k] += g;
  }
  return Math.max(...free);
}

const median = xs => {
  const s = [...xs].sort((a, b) => a - b);
  if (!s.length) return undefined;
  const mid = s.length >> 1;
  // An even count takes the mean of the middle two, not the lower one, which
  // would bias every recorded timing short.
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

/**
 * Each test's expected duration: recorded, else its file's median, else the
 * suite's, else thirty seconds.
 *
 * @param {ReturnType<typeof parseListing>} tests
 * @param {Record<string, number>} timings - Key to seconds
 * @returns {Array<object>} The tests, each with `seconds` and `estimated`
 */
export function withDurations(tests, timings) {
  const byFile = new Map();
  for (const t of tests) {
    if (timings[t.key] === undefined) continue;
    if (!byFile.has(t.file)) byFile.set(t.file, []);
    byFile.get(t.file).push(timings[t.key]);
  }
  const suite = median(Object.values(timings)) ?? 30;
  return tests.map(t => {
    const known = timings[t.key];
    return {
      ...t,
      seconds: known ?? median(byFile.get(t.file) || []) ?? suite,
      estimated: known === undefined,
    };
  });
}

/**
 * Split the listing into `count` shards of about equal wall time.
 *
 * Deterministic: the same listing and timings give the same plan on every
 * runner, which is what lets each shard compute it alone.
 *
 * @param {ReturnType<typeof parseListing>} tests
 * @param {Record<string, number>} timings
 * @param {number} count - Shards
 * @param {{serial: Set<string>, workers?: number}} options
 * @returns {{shards: Array<Array<object>>, spans: number[]}} Each shard's tests
 *   in listing order, and its simulated seconds
 */
export function planShards(tests, timings, count, { serial, workers }) {
  const timed = withDurations(tests, timings);
  const shards = Array.from({ length: count }, () => []);
  const spans = new Array(count).fill(0);
  const slowestFirst = [...timed].sort(
    (a, b) => b.seconds - a.seconds || a.order - b.order
  );
  for (const t of slowestFirst) {
    let best = 0;
    let bestSpan = Infinity;
    for (let k = 0; k < count; k++) {
      const span = shardSpan([...shards[k], t], serial, workers);
      if (
        span < bestSpan ||
        (span === bestSpan && shards[k].length < shards[best].length)
      ) {
        best = k;
        bestSpan = span;
      }
    }
    shards[best].push(t);
    spans[best] = bestSpan;
  }
  for (const s of shards) s.sort((a, b) => a.order - b.order);
  return { shards, spans };
}

/** A short fingerprint of a plan, so shards can be seen to agree. */
export function planDigest(shards) {
  const h = createHash('sha256');
  shards.forEach((s, k) =>
    h.update(`${k}\n${s.map(t => t.line).join('\n')}\n`)
  );
  return h.digest('hex').slice(0, 12);
}

/**
 * Whether a merged run covered the listing exactly once.
 *
 * @param {ReturnType<typeof parseListing>} listed
 * @param {string[]} ran - One line per test result group in the merged report
 * @returns {{missing: string[], extra: string[], repeated: string[]}}
 */
export function checkCoverage(listed, ran) {
  const want = new Set(listed.map(t => t.line));
  const seen = new Map();
  for (const line of ran) seen.set(line, (seen.get(line) || 0) + 1);
  return {
    missing: [...want].filter(l => !seen.has(l)),
    extra: [...seen.keys()].filter(l => !want.has(l)),
    repeated: [...seen].filter(([, n]) => n > 1).map(([l]) => l),
  };
}

/**
 * The test lines a merged JSON report contains, in listing format: one per
 * first attempt, so a test two shards both ran appears twice even if the merge
 * folded the two runs into one entry, while a retry does not.
 *
 * @param {object} report - Playwright's JSON reporter output
 * @returns {string[]}
 */
export function reportedLines(report) {
  const out = [];
  const walk = (suite, titles) => {
    for (const spec of suite.specs || []) {
      for (const t of spec.tests) {
        const title = [...titles, spec.title].join(' › ');
        const line = `[${t.projectName}] › ${spec.file}:${spec.line}:${spec.column} › ${title}`;
        const firsts = t.results.filter(r => (r.retry ?? 0) === 0).length;
        // A test with no result at all was listed but never started.
        for (let i = 0; i < firsts; i++) out.push(line);
      }
    }
    for (const child of suite.suites || []) {
      walk(child, [...titles, child.title]);
    }
  };
  // The top level is one suite per file, whose title is the file name.
  for (const file of report.suites || []) walk(file, []);
  return out;
}

/**
 * Each test's median passing duration over one or more JSON reports.
 *
 * A retried test counts only the attempt that passed: a first attempt that
 * hung until its timeout says how long the hang was, not how long the test
 * takes.
 *
 * @param {object[]} reports - Playwright JSON reports
 * @returns {Record<string, number>} Key to seconds, keys sorted
 */
export function timingsFrom(reports) {
  const samples = new Map();
  for (const report of reports) {
    const walk = (suite, titles) => {
      for (const spec of suite.specs || []) {
        for (const t of spec.tests) {
          const passed = t.results.filter(r => r.status === 'passed');
          if (!passed.length) continue;
          const key = `[${t.projectName}] › ${spec.file} › ${[...titles, spec.title].join(' › ')}`;
          if (!samples.has(key)) samples.set(key, []);
          samples.get(key).push(passed[passed.length - 1].duration / 1000);
        }
      }
      for (const child of suite.suites || []) {
        walk(child, [...titles, child.title]);
      }
    };
    for (const file of report.suites || []) walk(file, []);
  }
  const out = {};
  for (const key of [...samples.keys()].sort()) {
    out[key] = Math.round(median(samples.get(key)) * 10) / 10;
  }
  return out;
}

/** The listing, from Playwright, with whatever selection options are given. */
export function listTests(extra = []) {
  return execFileSync(
    'npx',
    ['playwright', 'test', '--list', '--reporter=list', ...extra],
    { cwd: REPO, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 }
  );
}

export function readTimings(file = TIMINGS_FILE) {
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
}

function option(argv, name) {
  const i = argv.indexOf(name);
  return i === -1 ? undefined : argv[i + 1];
}

const minutes = s => (s / 60).toFixed(1);

function main(argv) {
  const [command] = argv;
  const count = Number(option(argv, '--of'));
  const serial = serialFiles();

  if (command === 'record') {
    const reports = argv.slice(1).map(f => JSON.parse(readFileSync(f, 'utf8')));
    const timings = timingsFrom(reports);
    writeFileSync(TIMINGS_FILE, `${JSON.stringify(timings, null, 2)}\n`);
    console.log(
      `Wrote ${path.relative(REPO, TIMINGS_FILE)}: ${Object.keys(timings).length} tests from ${reports.length} report(s).`
    );
    return 0;
  }

  const listed = parseListing(listTests());
  if (!listed.length) {
    console.error('Playwright listed no tests.');
    return 1;
  }

  if (command === 'verify') {
    const file = option(argv, '--report');
    if (!file) {
      console.error('Say which merged report: --report <file>.');
      return 2;
    }
    const ran = reportedLines(JSON.parse(readFileSync(file, 'utf8')));
    const { missing, extra, repeated } = checkCoverage(listed, ran);
    if (missing.length || extra.length || repeated.length) {
      console.error(
        `The shards did not run the suite once: ${missing.length} listed tests missing, ${extra.length} not in the listing, ${repeated.length} run more than once.`
      );
      for (const l of missing.slice(0, 30)) console.error(`  missing:  ${l}`);
      for (const l of extra.slice(0, 30)) console.error(`  extra:    ${l}`);
      for (const l of repeated.slice(0, 30)) console.error(`  repeated: ${l}`);
      return 1;
    }
    console.log(
      `Every one of the ${listed.length} listed tests ran exactly once.`
    );
    return 0;
  }

  if (!Number.isInteger(count) || count < 1) {
    console.error('Say how many shards: --of <n>.');
    return 2;
  }
  const { shards, spans } = planShards(listed, readTimings(), count, {
    serial,
  });
  const digest = planDigest(shards);

  if (command === 'preview') {
    shards.forEach((s, k) => {
      const est = s.filter(t => t.estimated).length;
      console.log(
        `shard ${String(k + 1).padStart(2)}: ${String(s.length).padStart(4)} tests, ${minutes(spans[k])} min predicted${est ? ` (${est} estimated)` : ''}`
      );
    });
    console.log(`plan ${digest}, ${listed.length} tests`);
    return 0;
  }

  if (command === 'plan') {
    const shard = Number(option(argv, '--shard'));
    const out = option(argv, '--out');
    if (!(shard >= 1 && shard <= count) || !out) {
      console.error('Say which shard and where: --shard <k> --out <file>.');
      return 2;
    }
    const mine = shards[shard - 1];
    writeFileSync(out, `${mine.map(t => t.line).join('\n')}\n`);
    // Refuse to run a list Playwright reads differently from how it was
    // written: a line that matches nothing would be a test nobody runs.
    const selected = parseListing(listTests(['--test-list', out])).map(
      t => t.line
    );
    const { missing, extra } = checkCoverage(mine, selected);
    if (missing.length || extra.length || selected.length !== mine.length) {
      console.error(
        `Shard ${shard}'s list selects ${selected.length} tests, not the ${mine.length} it was planned with.`
      );
      for (const l of missing.slice(0, 20))
        console.error(`  not selected: ${l}`);
      for (const l of extra.slice(0, 20)) console.error(`  not planned:  ${l}`);
      return 1;
    }
    console.log(
      `Shard ${shard} of ${count}: ${mine.length} of ${listed.length} tests, ${minutes(spans[shard - 1])} min predicted (plan ${digest}; slowest shard ${minutes(Math.max(...spans))}).`
    );
    return 0;
  }

  console.error(
    `Unknown command "${command}". Use plan, verify, record or preview.`
  );
  return 2;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  process.exitCode = main(process.argv.slice(2));
}
