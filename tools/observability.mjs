#!/usr/bin/env node
// =============================================================================
// What CI costs run by run, and the trend page that charts it (Prompt 292)
// -----------------------------------------------------------------------------
//   gh run view <id> --json databaseId,createdAt,startedAt,updatedAt,jobs,headSha,event,conclusion > run.json
//   node tools/observability.mjs collect --run run.json [--jest jest-counts.json]
//        [--e2e e2e-results.json] [--plan] > ci-observability.json
//   node tools/observability.mjs jest-summary .facts/jest.json > jest-counts.json
//   node tools/observability.mjs page --add ci-observability.json [more ...]
//   node tools/observability.mjs page --check
//
// `collect` writes the small record a run leaves as a facts artifact, not a
// tracked source: the CI job durations and runner-minutes (tools/ci-cost.mjs
// counts them), the balance the source shards actually had, the Jest and
// Playwright counts, the state of the flake ledger (Prompt 145's policy, as
// Carl ratified it in D-R10-02: no quarantine unless an owner and an expiry
// say so, every retried test named, retries at one), the budget lines and the
// precache sizes. Everything but the run itself is optional, so the job that
// writes it never fails for want of an input.
//
// `page` turns records into docs/CI_TRENDS.md and the charts in
// docs/ci-trends/, drawn by the plot component's own static export
// (js/plot/export.js) over jsdom, so no browser is needed and the same data
// gives the same bytes. The page carries its history inside itself, so the
// records stay out of git and the page is its own data: `--check` re-renders
// the history the page holds and fails when the page differs, which
// tests/observability.test.js runs. The checkpoints read the page.
// =============================================================================

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { summarize } from './ci-cost.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SCHEMA = 'gravitas.ci-observability/1';
export const PAGE_FILE = 'docs/CI_TRENDS.md';
export const CHART_DIR = 'docs/ci-trends';
/** The wall-time target Prompt 145 set (D-R10-01), in minutes. */
export const TARGET_WALL_MINUTES = 15;
/** The committed spread bound of the shard planner's test (Prompt 145). */
export const SHARD_SPREAD_LIMIT = 1.15;
/** Newest records the page keeps. */
export const KEEP = 40;
/** The first run of the 17-shard matrix: runs from here on are counted (Prompt 292). */
export const TARGET_FROM = '2026-11-12T01:40:00Z';
/** How many recent green runs the target is judged over (Prompt 292). */
export const TARGET_RUNS = 10;

const SHARD_JOB = /^Browser smoke tests \(sources\) (\d+)\/(\d+)$/;
const SHARD_STEP = /^Run shard \d+ of \d+$/;
const secs = (a, b) =>
  Math.max(0, Math.round((new Date(b) - new Date(a)) / 1000));
const round = (n, d = 1) => Math.round(n * 10 ** d) / 10 ** d;

// -----------------------------------------------------------------------------
// The record
// -----------------------------------------------------------------------------

/**
 * Balance of the sources shards as the run had it: how long each shard's test
 * step took, and the longest over the mean (the planner's committed bound is
 * 1.15). Falls back to the job's whole duration when a step is not listed.
 * @param {Array<object>} jobs - `gh run view --json jobs`
 */
export function shardBalance(jobs) {
  const shards = jobs
    .filter(j => SHARD_JOB.test(j.name) && j.startedAt && j.completedAt)
    .map(j => {
      const step = (j.steps || []).find(
        s => SHARD_STEP.test(s.name) && s.startedAt && s.completedAt
      );
      return step
        ? secs(step.startedAt, step.completedAt)
        : secs(j.startedAt, j.completedAt);
    });
  if (!shards.length) return null;
  const mean = shards.reduce((a, b) => a + b, 0) / shards.length;
  const max = Math.max(...shards);
  return {
    shards: shards.length,
    minSeconds: Math.min(...shards),
    maxSeconds: max,
    meanSeconds: Math.round(mean),
    spread: round(max / mean, 3),
  };
}

/** Jest's counts, from its `--json` report (or from jest-summary's output). */
export function jestCounts(report) {
  if (!report) return null;
  if (report.suites !== undefined) return report;
  return {
    suites: report.numTotalTestSuites,
    suitesFailed: report.numFailedTestSuites,
    tests: report.numTotalTests,
    failed: report.numFailedTests,
    skipped: (report.numPendingTests || 0) + (report.numTodoTests || 0),
  };
}

/** Every test of a Playwright JSON report, with its status and file. */
function* playwrightTests(suites, file = '') {
  for (const s of suites || []) {
    const f = s.file || file;
    for (const spec of s.specs || []) {
      for (const t of spec.tests || []) {
        yield { file: spec.file || f, title: spec.title, status: t.status };
      }
    }
    yield* playwrightTests(s.suites, f);
  }
}

/** Playwright's counts and the retried tests by name, from the merged JSON report. */
export function playwrightCounts(report) {
  if (!report) return { counts: null, retried: [] };
  const stats = report.stats || {};
  const retried = [];
  for (const t of playwrightTests(report.suites)) {
    if (t.status === 'flaky') retried.push(`${t.file} > ${t.title}`);
  }
  return {
    counts: {
      expected: stats.expected ?? 0,
      unexpected: stats.unexpected ?? 0,
      flaky: stats.flaky ?? retried.length,
      skipped: stats.skipped ?? 0,
    },
    retried: retried.sort(),
  };
}

/**
 * Facts read from the tree: the budget lines and the precache sizes, the
 * quarantine tags (D-R10-02) and the pending acceptance registry. Injected in
 * tests; `readTree` is the real reader.
 * @typedef {{budgets: Array<object>, data: Array<object>,
 *   quarantined: Array<string>, pending: {registered: number, activated: number}}} Tree
 */
export async function readTree(root = ROOT) {
  const bundle = readFileSync(
    path.join(root, 'tools/bundle-budget.mjs'),
    'utf8'
  );
  const budgets = [];
  for (const m of bundle.matchAll(
    /\{\s*id: '([\w-]+)',\s*label: '([^']*)',\s*limit: ([\d.]+),/g
  )) {
    budgets.push({ id: m[1], label: m[2], limitKb: Number(m[3]) });
  }
  const routes = JSON.parse(
    readFileSync(path.join(root, 'tools/route-budgets.json'), 'utf8')
  );
  const data = [];
  let precache = {};
  try {
    const { measure, readDataBudget, judgeData } =
      await import('./data-budget.mjs');
    precache = measure(root);
    for (const r of judgeData(readDataBudget(), precache)) data.push(r);
  } catch {
    // A tree with no sw-manifest to measure: the lines are left out.
  }
  const quarantined = [];
  const e2e = path.join(root, 'e2e');
  if (existsSync(e2e)) {
    for (const f of readdirSync(e2e).filter(f => f.endsWith('.spec.js'))) {
      const src = readFileSync(path.join(e2e, f), 'utf8');
      for (const m of src.matchAll(/@quarantine:[\w.-]+:\d{4}-\d{2}-\d{2}/g)) {
        quarantined.push(`${f} ${m[0]}`);
      }
    }
  }
  const registry = JSON.parse(
    readFileSync(path.join(root, 'tools/pending-acceptance.json'), 'utf8')
  );
  return {
    budgets,
    routes: Object.keys(routes.routes?.sources || {}).length,
    data,
    quarantined,
    pending: {
      registered: registry.checks.length,
      activated: registry.checks.filter(c => c.activated).length,
    },
  };
}

/**
 * The record one run leaves. Pure: every input is passed in.
 * @param {{run: object, jest?: object, e2e?: object, tree?: Tree,
 *   plan?: object, conclusion?: string}} input - `conclusion` is the result
 *   of the `ci` job, which the run itself does not know while it is running
 */
export function collect({ run, jest, e2e, tree, plan, conclusion }) {
  const cost = summarize(run);
  const done = run.jobs.filter(
    j => j.startedAt && j.completedAt && j.conclusion !== 'skipped'
  );
  const pw = playwrightCounts(e2e);
  return {
    schema: SCHEMA,
    run: {
      id: run.databaseId ?? null,
      sha: run.headSha ? String(run.headSha).slice(0, 8) : null,
      event: run.event ?? null,
      conclusion: conclusion || run.conclusion || null,
      createdAt: run.createdAt,
    },
    cost: {
      jobs: cost.jobs,
      queueSeconds: cost.queueSeconds,
      wallSeconds: cost.wallSeconds,
      runnerMinutes: cost.runnerMinutes,
      longestJob: cost.longestJob,
    },
    jobs: Object.fromEntries(
      done
        .map(j => [j.name, secs(j.startedAt, j.completedAt)])
        .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    ),
    shards: shardBalance(run.jobs),
    plan: plan ?? null,
    counts: { jest: jestCounts(jest) ?? null, playwright: pw.counts },
    flakes: {
      policy:
        'D-R10-02: a quarantine needs an owner, an expiry and a named external cause; retries stay at 1',
      quarantined: tree?.quarantined ?? null,
      retried: pw.retried,
      pending: tree?.pending ?? null,
    },
    budgets: tree
      ? {
          ceilingsKb: Object.fromEntries(
            tree.budgets.map(b => [b.id, b.limitKb])
          ),
          routes: tree.routes,
          data: tree.data.map(d => ({
            key: d.key,
            measured: d.measured,
            ceiling: d.ceiling,
            status: d.status,
          })),
        }
      : null,
  };
}

// -----------------------------------------------------------------------------
// The page
// -----------------------------------------------------------------------------

const MARK = '<!-- ci-observability-history';
const END = '-->';

/** The history a rendered page holds. */
export function parseHistory(markdown) {
  const at = markdown.indexOf(MARK);
  if (at < 0) return [];
  const from = at + MARK.length;
  const body = markdown.slice(from, markdown.indexOf(END, from)).trim();
  return body ? body.split('\n').map(l => JSON.parse(l)) : [];
}

/**
 * Newest last, one record per run id, at most KEEP of them; only the newest
 * record keeps its per-job list (the artifact has them all).
 */
export function mergeHistory(history, added) {
  const byId = new Map();
  for (const r of [...history, ...added]) {
    if (r.schema !== SCHEMA) throw new Error(`Not a ${SCHEMA} record`);
    byId.set(r.run.id ?? `${r.run.createdAt}`, r);
  }
  const list = [...byId.values()].sort((a, b) =>
    a.run.createdAt < b.run.createdAt
      ? -1
      : a.run.createdAt > b.run.createdAt
        ? 1
        : 0
  );
  return list.slice(-KEEP).map((r, i, all) => {
    if (i === all.length - 1 || !r.jobs) return r;
    const rest = { ...r };
    delete rest.jobs;
    return rest;
  });
}

const minutes = s => round(s / 60, 1);
const day = r => r.run.createdAt.slice(0, 10);
const green = r => r.run.conclusion === 'success';

/** The median of numbers (the middle one, the lower of two). */
const median = xs => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor((s.length - 1) / 2)];
};

/**
 * The target over the newest TARGET_RUNS green runs since `since` (the first
 * run of the 17-shard matrix, D-R10-292-04): the median wall time (a queue
 * stall is one run's, not the suite's) against the 15 minutes of D-R10-01. The
 * runs before `since` are the baseline it is measured against, and the Jest
 * counts are held to the earliest record that has them.
 */
export function targetVerdict(history, since = TARGET_FROM) {
  const med = rs => ({
    runs: rs.length,
    medianWallMinutes: rs.length
      ? round(median(rs.map(r => r.cost.wallSeconds / 60)), 1)
      : null,
    worstWallMinutes: rs.length
      ? round(Math.max(...rs.map(r => r.cost.wallSeconds / 60)), 1)
      : null,
    medianRunnerMinutes: rs.length
      ? median(rs.map(r => r.cost.runnerMinutes))
      : null,
  });
  const before = history.filter(r => green(r) && r.run.createdAt < since);
  const after = history.filter(r => green(r) && r.run.createdAt >= since);
  const counted = after.slice(-TARGET_RUNS);
  const now = med(counted);
  const base = history.find(r => r.counts?.jest)?.counts.jest;
  const last = [...counted].reverse().find(r => r.counts?.jest)?.counts.jest;
  return {
    ...now,
    baseline: med(before.slice(-TARGET_RUNS)),
    met: counted.length
      ? counted.length >= TARGET_RUNS &&
        now.medianWallMinutes <= TARGET_WALL_MINUTES
      : null,
    jestTests:
      base && last ? { baseline: base.tests, latest: last.tests } : null,
  };
}

const row = cells => `| ${cells.join(' | ')} |`;

/** The Markdown of the page, without the charts' pixels. */
export function renderMarkdown(history, { charts = true } = {}) {
  const out = [];
  const latest = history.at(-1);
  const v = targetVerdict(history);
  out.push(
    '# CI cost and test-runtime trends',
    '',
    '<!-- Generated by `node tools/observability.mjs page`; do not edit. The history is carried at the end of this file. -->',
    '',
    "Each run of `.github/workflows/ci.yml` leaves one record (`tools/observability.mjs collect`, written by the `ci-cost` job as the `ci-observability` artifact). The records are not tracked; this page is their trend, drawn with the plot component's static export (`js/plot/export.js`), and it carries its own data so `node tools/observability.mjs page --check` can say whether it is current. Prompt 292 (`DECISION_REGISTER.md`, D-R10-292-01 to -08) made it; Prompt 145 set the 15-minute target (D-R10-01).",
    ''
  );
  if (!latest) {
    out.push('No run has been recorded yet.', '');
  } else {
    out.push(
      '## The target',
      '',
      `Aggregate CI at or under ${TARGET_WALL_MINUTES} minutes (run created to last job completed) over ${TARGET_RUNS} green runs, with the test counts at or above the baseline.`,
      '',
      row(['Measure', 'Value']),
      row(['---', '---']),
      row([
        'Green runs counted, since the 17-shard matrix',
        `${v.runs} of ${TARGET_RUNS}`,
      ]),
      row(['Median wall time', v.runs ? `${v.medianWallMinutes} min` : 'n/a']),
      row(['Slowest wall time', v.runs ? `${v.worstWallMinutes} min` : 'n/a']),
      row([
        'Median runner-minutes',
        v.runs ? String(v.medianRunnerMinutes) : 'n/a',
      ]),
      row([
        `Baseline: the ${v.baseline.runs} green runs before it`,
        v.baseline.runs
          ? `median ${v.baseline.medianWallMinutes} min wall (slowest ${v.baseline.worstWallMinutes}), ${v.baseline.medianRunnerMinutes} runner-minutes`
          : 'none recorded',
      ]),
      row([
        'Jest tests, first record with counts to latest',
        v.jestTests
          ? `${v.jestTests.baseline} to ${v.jestTests.latest}`
          : 'not recorded',
      ]),
      row([
        'Verdict',
        v.met === null
          ? `NOT YET MEASURED (no green run since the matrix changed; the baseline median was ${v.baseline.medianWallMinutes} min)`
          : v.met
            ? 'MET'
            : v.runs < TARGET_RUNS
              ? `NOT YET MET (${v.runs} runs counted; the median is ${v.medianWallMinutes} min)`
              : `MISSED (the median of ${TARGET_RUNS} is ${v.medianWallMinutes} min, the slowest ${v.worstWallMinutes} min)`,
      ]),
      ''
    );
    out.push(
      '## The latest run',
      '',
      row([
        'Run',
        'Commit',
        'Event',
        'Result',
        'Jobs',
        'Queue',
        'Wall',
        'Runner-minutes',
        'Longest job',
      ]),
      row(['---', '---', '---', '---', '---:', '---:', '---:', '---:', '---']),
      row([
        latest.run.id ?? 'local',
        latest.run.sha ?? 'n/a',
        latest.run.event ?? 'n/a',
        latest.run.conclusion ?? 'n/a',
        latest.cost.jobs,
        `${latest.cost.queueSeconds} s`,
        `${minutes(latest.cost.wallSeconds)} min`,
        latest.cost.runnerMinutes,
        `${latest.cost.longestJob.name} (${minutes(latest.cost.longestJob.seconds)} min)`,
      ]),
      ''
    );
    if (latest.shards) {
      const s = latest.shards;
      out.push(
        `Source shards: ${s.shards} of them, test step ${minutes(s.minSeconds)} to ${minutes(s.maxSeconds)} min, mean ${minutes(s.meanSeconds)}; longest over mean ${s.spread} (the planner's committed bound is ${SHARD_SPREAD_LIMIT}).`,
        ''
      );
    }
    if (latest.plan) {
      out.push(
        `Planned balance (tools/e2e-shards.mjs preview): ${latest.plan.shards} shards, ${latest.plan.tests} tests, longest ${latest.plan.maxMinutes} min predicted, mean ${latest.plan.meanMinutes}, ratio ${latest.plan.ratio}.`,
        ''
      );
    }
    const c = latest.counts || {};
    out.push(
      `Counts: Jest ${c.jest ? `${c.jest.suites} suites, ${c.jest.tests} tests, ${c.jest.failed} failed` : 'not recorded'}; Playwright (sources) ${c.playwright ? `${c.playwright.expected} expected, ${c.playwright.unexpected} unexpected, ${c.playwright.flaky} retried, ${c.playwright.skipped} skipped` : 'not recorded'}.`,
      ''
    );
    const f = latest.flakes || {};
    out.push(
      `Flake ledger: ${f.quarantined ? `${f.quarantined.length} quarantined` : 'quarantine tags not scanned'}; ${f.retried?.length ?? 0} retried by name${f.retried?.length ? ` (${f.retried.join('; ')})` : ''}; pending acceptance ${f.pending ? `${f.pending.activated} of ${f.pending.registered} activated` : 'not scanned'}. Policy: ${f.policy}.`,
      ''
    );
    if (latest.budgets) {
      const b = latest.budgets;
      out.push(
        'Budget lines: ' +
          Object.entries(b.ceilingsKb)
            .map(([k, v2]) => `${k} ${v2} KB`)
            .join(', ') +
          `; ${b.routes} route ceilings; data plane ` +
          (b.data.length
            ? b.data
                .map(
                  d =>
                    `${d.key} ${d.measured ?? 'not measured'} of ${d.ceiling} (${d.status})`
                )
                .join(', ')
            : 'not measured') +
          '.',
        ''
      );
    }
    if (latest.jobs) {
      out.push(
        '<details><summary>Job durations in the latest run</summary>',
        '',
        row(['Job', 'Minutes']),
        row(['---', '---:']),
        ...Object.entries(latest.jobs).map(([n, s]) => row([n, minutes(s)])),
        '',
        '</details>',
        ''
      );
    }
  }
  if (charts && history.length) {
    out.push(
      '## Trends',
      '',
      'x is the run, oldest first; the table below names each.',
      '',
      '![Wall time and the longest job, in minutes](ci-trends/wall.svg)',
      '',
      '![Runner-minutes per run](ci-trends/runner-minutes.svg)',
      '',
      '![Source shard spread, longest over mean, against the committed bound](ci-trends/shard-spread.svg)',
      '',
      '![Test counts: Jest tests and Playwright expected tests](ci-trends/counts.svg)',
      ''
    );
  }
  if (history.length) {
    out.push(
      '## Runs',
      '',
      row([
        '#',
        'Date',
        'Run',
        'Result',
        'Wall (min)',
        'Runner-min',
        'Jest tests',
        'Playwright tests',
      ]),
      row(['---:', '---', '---', '---', '---:', '---:', '---:', '---:']),
      ...history.map((r, i) =>
        row([
          i + 1,
          day(r),
          r.run.id ?? 'local',
          r.run.conclusion ?? 'n/a',
          minutes(r.cost.wallSeconds),
          r.cost.runnerMinutes,
          r.counts?.jest?.tests ?? '',
          r.counts?.playwright
            ? r.counts.playwright.expected + r.counts.playwright.flaky
            : '',
        ])
      ),
      ''
    );
  }
  out.push(
    '## What the wall time is made of',
    '',
    'Measured on the first run of the 17-shard matrix on v3 (run 43169241344, push, 59d82585; Prompt 292 follow-up, D-R10-292-10): **29.7 minutes** from the run being created to the last job finishing (28.9 by the cost record, which stops at the last gated job), against the 15-minute target and the 21 to 25 the planner predicted. The chain, by job start and end in minutes: the longest source shard 9/17 ran 0.1 to 21.1 (shards 14.8 to 21.0, all under the 24-minute step stop, longest over mean 1.18 against the 1.15 bound); the accessibility job 0.0 to 18.6; Jest 14.0; the production-build job 14.1 to 24.9. The two jobs that gate the shards (the coverage check and the report, 25 seconds each) were created at 21.0 and **started at 28.3: seven minutes waiting for a runner**, because another run on the same pool (a pull request created 40 seconds after this push) held the 20 slots. So 21.1 minutes of tests, 7.2 minutes of runner queue, and about 1.4 for the gate and the cost record. The queue is not a property of this workflow: the pool is shared by every run on the repository. On the same push a first attempt of the accessibility job was cancelled at its 25-minute limit with no failing test (it ran 18.6 to 23.7 minutes on other heads), which is why that job is now two parts.',
    '',
    '**Floor.** The runner-minutes (376 to 408 a run) divided by the 20 slots is 19 to 20.4 minutes before any queueing behind another run. A 15-minute pull-request wall time is not reachable by planning. **The recommendation is to reset the pull-request target to 22 minutes** (D-R10-292-06) and to judge it on runs that did not overlap another: read the gap between a gate job being created and started in the run before blaming the suite.',
    ''
  );
  out.push(`${MARK}`, ...history.map(r => JSON.stringify(r)), `${END}`, '');
  return out.join('\n');
}

/** The four charts' data: series of [x, y] over the run index. */
export function chartSpecs(history) {
  const xs = history.map((_, i) => i + 1);
  const ys = f => history.map(f);
  const only = (arr, pick) => {
    const keep = arr
      .map((r, i) => (pick(r) == null ? -1 : i))
      .filter(i => i >= 0);
    return { x: keep.map(i => xs[i]), y: keep.map(i => pick(arr[i])) };
  };
  const series = (id, label, color, data, extra = {}) => ({
    id,
    label,
    color,
    width: 2,
    ...data,
    ...extra,
  });
  const specs = {
    wall: {
      label: 'CI wall time and the longest job',
      xTitle: 'Run (oldest first)',
      yTitle: 'Minutes',
      series: [
        series('wall', 'Wall time', '#1f6fb2', {
          x: xs,
          y: ys(r => minutes(r.cost.wallSeconds)),
        }),
        series(
          'longest',
          'Longest job',
          '#b25e1f',
          { x: xs, y: ys(r => minutes(r.cost.longestJob.seconds)) },
          { dash: [5, 3] }
        ),
        series(
          'target',
          'Target',
          '#2a8a4a',
          {
            x: [xs[0], xs.at(-1) + (xs.length < 2 ? 1 : 0)],
            y: [TARGET_WALL_MINUTES, TARGET_WALL_MINUTES],
          },
          { dash: [2, 3], width: 1.5 }
        ),
      ],
    },
    'runner-minutes': {
      label: 'Runner-minutes per run',
      xTitle: 'Run (oldest first)',
      yTitle: 'Runner-minutes',
      series: [
        series('rm', 'Runner-minutes', '#7a3fb2', {
          x: xs,
          y: ys(r => r.cost.runnerMinutes),
        }),
      ],
    },
    'shard-spread': {
      label: 'Source shard spread',
      xTitle: 'Run (oldest first)',
      yTitle: 'Longest over mean',
      series: [
        series(
          'spread',
          'Observed',
          '#1f6fb2',
          only(history, r => r.shards?.spread)
        ),
        series(
          'bound',
          'Bound',
          '#b21f1f',
          {
            x: [xs[0], xs.at(-1) + (xs.length < 2 ? 1 : 0)],
            y: [SHARD_SPREAD_LIMIT, SHARD_SPREAD_LIMIT],
          },
          { dash: [5, 3], width: 1.5 }
        ),
      ],
    },
    counts: {
      label: 'Test counts',
      xTitle: 'Run (oldest first)',
      yTitle: 'Tests',
      series: [
        series(
          'jest',
          'Jest tests',
          '#1f6fb2',
          only(history, r => r.counts?.jest?.tests ?? null)
        ),
        series(
          'pw',
          'Playwright tests (sources)',
          '#b25e1f',
          only(history, r =>
            r.counts?.playwright
              ? r.counts.playwright.expected + r.counts.playwright.flaky
              : null
          )
        ),
      ],
    },
  };
  // A series with no points is left out; a chart of none is not drawn.
  for (const [k, spec] of Object.entries(specs)) {
    spec.series = spec.series.filter(s => s.x.length > 0);
    if (!spec.series.some(s => s.id !== 'target' && s.id !== 'bound'))
      delete specs[k];
  }
  return specs;
}

/**
 * The charts as SVG text, by file stem, drawn with js/plot/chart.js and
 * exported by js/plot/export.js over jsdom.
 */
export async function renderCharts(history) {
  const { JSDOM } = await import('jsdom');
  const { createChart } = await import('../js/plot/chart.js');
  const { exportSvg } = await import('../js/plot/export.js');
  // Under Jest's jsdom environment a window already exists (its own
  // getComputedStyle only takes its own elements); in Node one is made.
  const ambient = globalThis.window;
  const win =
    ambient?.XMLSerializer && ambient.document?.createElementNS
      ? ambient
      : new JSDOM('<!doctype html><body></body>').window;
  const saved = {};
  // Plain Node has none of these; a Jest jsdom environment has some it will
  // not let go of, and those serve as they are.
  const set = (k, v) => {
    const before = Object.getOwnPropertyDescriptor(globalThis, k);
    try {
      Object.defineProperty(globalThis, k, {
        value: v,
        configurable: true,
        writable: true,
      });
      saved[k] = before ?? null;
    } catch {
      // Left as the environment has it.
    }
  };
  set('window', win);
  set('document', win.document);
  set('getComputedStyle', win.getComputedStyle.bind(win));
  try {
    const result = {};
    for (const [name, spec] of Object.entries(chartSpecs(history))) {
      const host = win.document.createElement('div');
      win.document.body.append(host);
      const chart = createChart(host, {
        number: v => String(round(v, 2)),
        labels: {
          legend: 'Series',
          toggled: (l, s) => `${l} ${s ? 'shown' : 'hidden'}`,
        },
        theme: false,
      });
      chart.element.getBoundingClientRect = () => ({
        left: 0,
        top: 0,
        width: 640,
        height: 220,
      });
      chart.draw(spec);
      result[name] =
        exportSvg(chart.parts(), { background: '#ffffff' }).text + '\n';
    }
    return result;
  } finally {
    for (const [k, d] of Object.entries(saved)) {
      if (d) Object.defineProperty(globalThis, k, d);
      else delete globalThis[k];
    }
  }
}

/** The page and its charts, from a history. */
export async function renderPage(history) {
  return {
    markdown: renderMarkdown(history),
    charts: await renderCharts(history),
  };
}

// -----------------------------------------------------------------------------
// The command line
// -----------------------------------------------------------------------------

const option = (argv, name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};
const readJson = file => JSON.parse(readFileSync(file, 'utf8'));

async function main(argv) {
  const [command, ...rest] = argv;
  if (command === 'jest-summary') {
    const report = readJson(rest[0]);
    console.log(JSON.stringify(jestCounts(report)));
    return 0;
  }
  if (command === 'collect') {
    const runFile = option(rest, '--run');
    if (!runFile) {
      console.error('Say which run: --run <gh run view json>.');
      return 2;
    }
    const maybe = flag => {
      const f = option(rest, flag);
      return f && existsSync(f) ? readJson(f) : undefined;
    };
    let plan;
    if (rest.includes('--plan')) {
      const shards = await import('./e2e-shards.mjs');
      const listed = shards.parseListing(shards.listTests());
      const count = option(rest, '--of') ? Number(option(rest, '--of')) : 20;
      const { spans } = shards.planShards(listed, shards.readTimings(), count, {
        serial: shards.serialFiles(),
      });
      const mean = spans.reduce((a, b) => a + b, 0) / spans.length;
      plan = {
        shards: count,
        tests: listed.length,
        maxMinutes: round(Math.max(...spans) / 60, 1),
        meanMinutes: round(mean / 60, 1),
        ratio: round(Math.max(...spans) / mean, 3),
      };
    }
    const record = collect({
      run: readJson(runFile),
      jest: maybe('--jest'),
      e2e: maybe('--e2e'),
      tree: await readTree(),
      conclusion: option(rest, '--conclusion'),
      plan,
    });
    console.log(JSON.stringify(record, null, 2));
    return 0;
  }
  if (command === 'page') {
    const pagePath = path.join(ROOT, PAGE_FILE);
    const current = existsSync(pagePath) ? readFileSync(pagePath, 'utf8') : '';
    const added = [];
    for (let i = 0; i < rest.length; i++) {
      if (rest[i] === '--add') {
        for (let j = i + 1; j < rest.length && !rest[j].startsWith('--'); j++) {
          added.push(readJson(rest[j]));
        }
      }
    }
    const history = mergeHistory(parseHistory(current), added);
    const { markdown, charts } = await renderPage(history);
    if (rest.includes('--check')) {
      const stale = [];
      if (markdown !== current) stale.push(PAGE_FILE);
      for (const [name, text] of Object.entries(charts)) {
        const f = path.join(ROOT, CHART_DIR, `${name}.svg`);
        if (!existsSync(f) || readFileSync(f, 'utf8') !== text)
          stale.push(`${CHART_DIR}/${name}.svg`);
      }
      if (stale.length) {
        console.error(
          `Stale: ${stale.join(', ')}. Run node tools/observability.mjs page.`
        );
        return 1;
      }
      console.log(`${PAGE_FILE} is current (${history.length} runs).`);
      return 0;
    }
    mkdirSync(path.join(ROOT, CHART_DIR), { recursive: true });
    writeFileSync(pagePath, markdown);
    for (const [name, text] of Object.entries(charts)) {
      writeFileSync(path.join(ROOT, CHART_DIR, `${name}.svg`), text);
    }
    console.log(
      `Wrote ${PAGE_FILE} and ${Object.keys(charts).length} charts (${history.length} runs).`
    );
    return 0;
  }
  console.error('Use collect, jest-summary or page.');
  return 2;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main(process.argv.slice(2)).then(code => {
    process.exitCode = code;
  });
}
