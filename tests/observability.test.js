import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import yaml from 'js-yaml';
import {
  KEEP,
  SCHEMA,
  SHARD_SPREAD_LIMIT,
  TARGET_RUNS,
  chartSpecs,
  collect,
  jestCounts,
  mergeHistory,
  parseHistory,
  playwrightCounts,
  readTree,
  renderCharts,
  renderMarkdown,
  shardBalance,
  targetVerdict,
} from '../tools/observability.mjs';

// =============================================================================
// The cost artifact and its trend page (Prompt 292)
// -----------------------------------------------------------------------------
// The record a run leaves, the page built from many of them, and the workflow
// step that writes it. The page carries its own history, so the committed
// page is checked here as a fixed point: the history it holds, rendered again,
// is the page and the charts that are committed.
// =============================================================================

const at = (m, s = 0) =>
  `2026-11-11T10:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}Z`;
const job = (name, start, end, extra = {}) => ({
  name,
  startedAt: at(start),
  completedAt: at(end),
  conclusion: 'success',
  ...extra,
});
const shardJob = (k, start, end, testStart, testEnd) =>
  job(`Browser smoke tests (sources) ${k}/3`, start, end, {
    steps: [
      { name: 'Run npm ci', startedAt: at(start), completedAt: at(start, 5) },
      {
        name: `Run shard ${k} of 3`,
        startedAt: at(testStart),
        completedAt: at(testEnd),
      },
    ],
  });

const RUN = {
  databaseId: 11,
  headSha: 'abcdef0123456789',
  event: 'push',
  conclusion: null,
  createdAt: at(0),
  jobs: [
    shardJob(1, 0, 11, 1, 10),
    shardJob(2, 0, 13, 1, 12),
    shardJob(3, 0, 12, 1, 11),
    job('Lint, tests and physics validation', 0, 9),
    {
      name: 'Deploy',
      startedAt: null,
      completedAt: null,
      conclusion: 'skipped',
    },
  ],
};

describe('the record one run leaves', () => {
  test("is the run's cost, its job durations longest first, and the shard balance", () => {
    const r = collect({ run: RUN, conclusion: 'success' });
    expect(r.schema).toBe(SCHEMA);
    expect(r.run).toEqual({
      id: 11,
      sha: 'abcdef01',
      event: 'push',
      conclusion: 'success',
      createdAt: at(0),
    });
    // 11 + 13 + 12 + 9 whole minutes, a skipped job costing nothing.
    expect(r.cost.runnerMinutes).toBe(45);
    expect(r.cost.jobs).toBe(4);
    expect(r.cost.wallSeconds).toBe(13 * 60);
    expect(Object.keys(r.jobs)[0]).toBe('Browser smoke tests (sources) 2/3');
    expect(r.jobs.Deploy).toBeUndefined();
    // The balance is the tests' own step: 9, 11 and 10 minutes.
    expect(r.shards).toEqual({
      shards: 3,
      minSeconds: 540,
      maxSeconds: 660,
      meanSeconds: 600,
      spread: 1.1,
    });
    expect(r.shards.spread).toBeLessThan(SHARD_SPREAD_LIMIT);
  });

  test('needs nothing but the run: every other input may be missing', () => {
    const r = collect({ run: RUN });
    expect(r.counts).toEqual({ jest: null, playwright: null });
    expect(r.budgets).toBeNull();
    expect(r.flakes.retried).toEqual([]);
    expect(r.flakes.quarantined).toBeNull();
    expect(r.run.conclusion).toBeNull();
  });

  test('a run with no finished job is refused, not recorded as free', () => {
    expect(() => collect({ run: { createdAt: at(0), jobs: [] } })).toThrow(
      /no finished job/
    );
  });

  test("a shard with no listed step falls back to its job's duration", () => {
    const b = shardBalance([
      job('Browser smoke tests (sources) 1/2', 0, 10),
      job('Browser smoke tests (sources) 2/2', 0, 12),
      job('Lint', 0, 30),
    ]);
    expect(b.shards).toBe(2);
    expect(b.maxSeconds).toBe(720);
    expect(shardBalance([job('Lint', 0, 3)])).toBeNull();
  });

  test("reads Jest's counts, and passes a summary through unchanged", () => {
    const counts = jestCounts({
      numTotalTestSuites: 5,
      numFailedTestSuites: 1,
      numTotalTests: 40,
      numFailedTests: 2,
      numPendingTests: 3,
      numTodoTests: 1,
    });
    expect(counts).toEqual({
      suites: 5,
      suitesFailed: 1,
      tests: 40,
      failed: 2,
      skipped: 4,
    });
    expect(jestCounts(counts)).toBe(counts);
    expect(jestCounts(undefined)).toBeNull();
  });

  test('names every retried Playwright test, as the flake policy requires', () => {
    const report = {
      stats: { expected: 3, unexpected: 0, flaky: 1, skipped: 0 },
      suites: [
        {
          file: 'a.spec.js',
          specs: [
            { title: 'steady', tests: [{ status: 'expected' }] },
            { title: 'wobbly', tests: [{ status: 'flaky' }] },
          ],
          suites: [
            {
              file: 'b.spec.js',
              specs: [{ title: 'inner', tests: [{ status: 'flaky' }] }],
            },
          ],
        },
      ],
    };
    const { counts, retried } = playwrightCounts(report);
    expect(counts).toEqual({
      expected: 3,
      unexpected: 0,
      flaky: 1,
      skipped: 0,
    });
    expect(retried).toEqual(['a.spec.js > wobbly', 'b.spec.js > inner']);
  });
});

describe('what the tree adds to a record', () => {
  test('the budget lines, the data plane, the quarantine tags and the pending registry', async () => {
    const tree = await readTree();
    const ids = tree.budgets.map(b => b.id);
    expect(ids).toEqual(expect.arrayContaining(['initial', 'deferred']));
    expect(tree.budgets.find(b => b.id === 'initial').limitKb).toBe(830);
    expect(tree.budgets.find(b => b.id === 'deferred').limitKb).toBeGreaterThan(
      3000
    );
    expect(tree.routes).toBeGreaterThan(10);
    expect(tree.data.map(d => d.key)).toEqual(
      expect.arrayContaining([
        'precacheFirstVisitGzipBytes',
        'precacheIdleGzipBytes',
      ])
    );
    // D-R10-02 adopted a policy and implemented no quarantine.
    expect(tree.quarantined).toEqual([]);
    const registry = JSON.parse(
      readFileSync('tools/pending-acceptance.json', 'utf8')
    );
    expect(tree.pending.registered).toBe(registry.checks.length);
  });
});

describe('the history', () => {
  const rec = (id, minute, wall, extra = {}) => ({
    schema: SCHEMA,
    run: {
      id,
      sha: null,
      event: 'push',
      conclusion: 'success',
      createdAt: `2026-11-${String(minute).padStart(2, '0')}T00:00:00Z`,
    },
    cost: {
      jobs: 3,
      queueSeconds: 1,
      wallSeconds: wall * 60,
      runnerMinutes: 100,
      longestJob: { name: 'x', seconds: 600 },
    },
    jobs: { x: 600 },
    shards: null,
    plan: null,
    counts: { jest: null, playwright: null },
    flakes: { policy: 'p', quarantined: [], retried: [], pending: null },
    budgets: null,
    ...extra,
  });

  test('is oldest first, one record per run, and only the newest keeps its jobs', () => {
    const merged = mergeHistory(
      [rec(2, 12, 30), rec(1, 11, 31)],
      [rec(2, 12, 29), rec(3, 13, 28)]
    );
    expect(merged.map(r => r.run.id)).toEqual([1, 2, 3]);
    // The record added later replaces the one with its id.
    expect(merged[1].cost.wallSeconds).toBe(29 * 60);
    expect(merged[0].jobs).toBeUndefined();
    expect(merged[2].jobs).toEqual({ x: 600 });
  });

  test('keeps the newest KEEP and refuses a record of another schema', () => {
    const many = Array.from({ length: KEEP + 5 }, (_, i) =>
      rec(i + 1, 1 + Math.floor(i / 2), 20)
    );
    // Dates are only by day here, so ties keep their run order.
    expect(mergeHistory([], many)).toHaveLength(KEEP);
    expect(() => mergeHistory([], [{ ...rec(1, 1, 1), schema: 'x' }])).toThrow(
      /Not a/
    );
  });

  test('the target is the median wall time over the newest ten green runs', () => {
    const history = Array.from({ length: TARGET_RUNS }, (_, i) =>
      rec(i + 1, i + 1, 14)
    );
    expect(targetVerdict(history).met).toBe(true);
    // One stalled run does not move a median.
    history[3] = rec(4, 4, 200);
    const v = targetVerdict(history);
    expect(v.met).toBe(true);
    expect(v.worstWallMinutes).toBe(200);
    // Fewer than ten is not yet a verdict; slow is a miss.
    expect(targetVerdict(history.slice(0, 5)).met).toBe(false);
    expect(targetVerdict(history.map(r => rec(r.run.id, 1, 35))).met).toBe(
      false
    );
    // A failed run is not one of the ten.
    const red = rec(99, 28, 1, {});
    red.run.conclusion = 'failure';
    expect(targetVerdict([...history, red]).runs).toBe(TARGET_RUNS);
    expect(targetVerdict([]).met).toBeNull();
  });

  test('a chart with nothing to draw is left out, and a point-free series with it', () => {
    const specs = chartSpecs([rec(1, 1, 30)]);
    expect(Object.keys(specs).sort()).toEqual(['runner-minutes', 'wall']);
    expect(specs.wall.series.map(s => s.id)).toEqual([
      'wall',
      'longest',
      'target',
    ]);
  });
});

describe('the committed page', () => {
  const page = readFileSync('docs/CI_TRENDS.md', 'utf8');
  const history = parseHistory(page);

  test('holds a history of real runs, each one a record of the schema', () => {
    expect(history.length).toBeGreaterThanOrEqual(10);
    for (const r of history) {
      expect(r.schema).toBe(SCHEMA);
      expect(r.cost.runnerMinutes).toBeGreaterThan(0);
    }
  });

  test('is the page its own history renders (nothing was edited by hand)', () => {
    expect(renderMarkdown(history)).toBe(page);
  });

  test("has charts that are the plot component's export of that history, byte for byte", async () => {
    const charts = await renderCharts(history);
    expect(Object.keys(charts).length).toBeGreaterThanOrEqual(3);
    for (const [name, text] of Object.entries(charts)) {
      expect(readFileSync(`docs/ci-trends/${name}.svg`, 'utf8')).toBe(text);
      expect(text).toMatch(
        /^<svg [^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/
      );
      // A standalone image: no script, no link; only its own clip paths are referenced.
      expect(text).not.toMatch(/<script|href=|url\((?!#)/);
    }
    // And the page links exactly the charts it has.
    for (const name of Object.keys(charts)) {
      expect(page).toContain(`(ci-trends/${name}.svg)`);
    }
  });
});

describe('the workflow step that writes the record', () => {
  const workflow = yaml.load(readFileSync('.github/workflows/ci.yml', 'utf8'));
  const cost = workflow.jobs['ci-cost'];

  test('runs after CI whatever the result, fails nothing and is waited for by nothing', () => {
    expect(cost.needs).toEqual(['ci']);
    expect(cost['continue-on-error']).toBe(true);
    expect(cost.permissions).toEqual({ actions: 'read', contents: 'read' });
    for (const other of Object.values(workflow.jobs)) {
      expect([other.needs ?? []].flat()).not.toContain('ci-cost');
    }
  });

  test('collects the record and uploads it as a facts artifact, with the two counts optional', () => {
    const run = cost.steps.map(s => s.run || '').join('\n');
    expect(run).toMatch(/observability\.mjs collect --run run\.json/);
    expect(run).toMatch(/--conclusion "\$RUN_RESULT"/);
    const uploads = cost.steps
      .filter(s => (s.uses || '').includes('upload-artifact'))
      .map(s => s.with.name);
    expect(uploads).toEqual(['ci-cost', 'ci-observability']);
    const downloads = cost.steps.filter(s =>
      (s.uses || '').includes('download-artifact')
    );
    expect(downloads.map(s => s.with.name)).toEqual([
      'e2e-results-sources',
      'jest-counts',
    ]);
    for (const d of downloads) expect(d['continue-on-error']).toBe(true);
  });

  test('the checks job only summarises the report it already wrote, and cannot fail', () => {
    const steps = workflow.jobs.checks.steps;
    const i = steps.findIndex(s =>
      (s.name || '').startsWith('Keep the Jest counts')
    );
    expect(i).toBeGreaterThan(0);
    expect(steps[i - 1].name).toBe('Unit and integration tests');
    expect(steps[i]['continue-on-error']).toBe(true);
    expect(steps[i].run).toMatch(/jest-summary \.facts\/jest\.json/);
    expect(steps[i + 1].with.name).toBe('jest-counts');
    expect(steps[i + 1]['continue-on-error']).toBe(true);
  });
});
