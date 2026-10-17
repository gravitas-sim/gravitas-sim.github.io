import { describe, test, expect } from '@jest/globals';
import { summarize } from '../tools/ci-cost.mjs';

const at = s => `2026-10-17T10:${s}Z`;

describe('the CI cost record (Prompt 145)', () => {
  const run = {
    databaseId: 7,
    createdAt: at('00:00'),
    jobs: [
      {
        name: 'a',
        startedAt: at('00:30'),
        completedAt: at('02:10'),
        conclusion: 'success',
      },
      {
        name: 'b',
        startedAt: at('01:00'),
        completedAt: at('01:30'),
        conclusion: 'success',
      },
      { name: 'c', startedAt: null, completedAt: null, conclusion: 'skipped' },
    ],
  };

  test('queue, wall time and per-job rounded-up runner minutes', () => {
    expect(summarize(run)).toEqual({
      runId: 7,
      jobs: 2,
      queueSeconds: 30,
      wallSeconds: 130,
      runnerMinutes: 2 + 1,
      longestJob: { name: 'a', seconds: 100 },
    });
  });

  test('a run with nothing finished is refused rather than costed as zero', () => {
    expect(() => summarize({ createdAt: at('00:00'), jobs: [] })).toThrow(
      /no finished job/
    );
  });
});
