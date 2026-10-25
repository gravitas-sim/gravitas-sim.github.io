// =============================================================================
// What one CI run cost
// -----------------------------------------------------------------------------
//   gh run view <id> --json databaseId,createdAt,startedAt,updatedAt,jobs \
//     | node tools/ci-cost.mjs > ci-cost.json
//
// Reads a run's JSON and writes a small record the checkpoints read (Prompt 292
// adds the trend page): the queue time (run created to first job started), the
// wall time (run created to last job completed), and runner-minutes - each
// finished job's duration rounded UP to a whole minute, which is how GitHub
// bills hosted runners, summed. Skipped jobs cost nothing. The ci-cost job in
// .github/workflows/ci.yml writes this record as an artifact on every run (see
// DECISION_REGISTER, D-R10-01).
// =============================================================================

import { readFileSync } from 'node:fs';

const seconds = (a, b) => Math.max(0, (new Date(b) - new Date(a)) / 1000);

/** @param {{databaseId?: number, createdAt: string, jobs: Array<object>}} run */
export function summarize(run) {
  const done = run.jobs.filter(
    j => j.startedAt && j.completedAt && j.conclusion !== 'skipped'
  );
  if (!done.length) throw new Error('The run has no finished job to cost');
  const first = Math.min(...done.map(j => +new Date(j.startedAt)));
  const last = Math.max(...done.map(j => +new Date(j.completedAt)));
  const jobSeconds = done.map(j => seconds(j.startedAt, j.completedAt));
  return {
    runId: run.databaseId ?? null,
    jobs: done.length,
    queueSeconds: seconds(run.createdAt, new Date(first)),
    wallSeconds: seconds(run.createdAt, new Date(last)),
    runnerMinutes: jobSeconds.reduce((n, s) => n + Math.ceil(s / 60), 0),
    longestJob: done
      .map((j, i) => ({ name: j.name, seconds: jobSeconds[i] }))
      .sort((a, b) => b.seconds - a.seconds)[0],
  };
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const run = JSON.parse(readFileSync(0, 'utf8'));
  console.log(JSON.stringify(summarize(run), null, 2));
}
