import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import yaml from 'js-yaml';
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

describe('the workflow step that records it', () => {
  const workflow = yaml.load(readFileSync('.github/workflows/ci.yml', 'utf8'));
  const job = workflow.jobs['ci-cost'];

  test('it runs after CI whatever the result, and cannot fail it', () => {
    expect(job.needs).toEqual(['ci']);
    expect(String(job.if)).toMatch(/always\(\)/);
    expect(job['continue-on-error']).toBe(true);
    expect(job.permissions).toEqual({ actions: 'read', contents: 'read' });
  });

  test('nothing waits for it, so no job or pass/fail rule depends on it', () => {
    for (const [name, other] of Object.entries(workflow.jobs)) {
      if (name === 'ci-cost') continue;
      const needs = [].concat(other.needs ?? []);
      expect({ name, waits: needs.includes('ci-cost') }).toEqual({
        name,
        waits: false,
      });
    }
  });

  test('it feeds the run to tools/ci-cost.mjs and keeps the record', () => {
    const text = JSON.stringify(job.steps);
    expect(text).toMatch(/gh run view/);
    expect(text).toMatch(/tools\/ci-cost\.mjs/);
    expect(job.steps.some(s => s.with?.name === 'ci-cost')).toBe(true);
  });
});
