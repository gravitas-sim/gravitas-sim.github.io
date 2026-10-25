import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import yaml from 'js-yaml';
import { classify, readModel } from '../tools/pr-class.mjs';

const model = readModel(readFileSync('INTEGRATION.md', 'utf8'));
const train = { name: '2.1', base: 'abc', owner: 'queue', state: 'open' };
const withTrain = { ...model, trains: [train] };
const window = { name: 'w', from: '2026-12-15', to: '2026-12-20' };
const run = (args, m = withTrain) => classify({ model: m, ...args });

describe('the pull-request class check', () => {
  test('INTEGRATION.md names main, the open v3 train and no window', () => {
    expect(model.integrationBranch).toBe('main');
    expect(model.trains.map(t => [t.branch, t.state])).toEqual([
      ['v3', 'open'],
    ]);
    expect(model.windows).toEqual([]);
  });

  test('a pull request into the v3 train is allowed in any class', () => {
    for (const labels of [
      ['invisible'],
      ['visible'],
      ['visible', 'instructional'],
    ])
      expect(
        classify({ labels, base: 'v3', checksResult: 'failure', model }).ok
      ).toBe(true);
  });

  test('a pull request needs exactly one class label', () => {
    expect(run({ labels: [], base: 'main' }).ok).toBe(false);
    expect(run({ labels: ['invisible', 'visible'], base: 'main' }).ok).toBe(
      false
    );
    expect(run({ labels: ['invisible'], base: 'main' }).ok).toBe(true);
  });

  test('a visible pull request into main fails outside a window', () => {
    expect(run({ labels: ['visible'], base: 'main' }).ok).toBe(false);
  });

  test('hotfix or an open window lets a visible pull request into main', () => {
    expect(run({ labels: ['visible', 'hotfix'], base: 'main' }).ok).toBe(true);
    const m = { ...withTrain, windows: [window] };
    const inside = new Date('2026-12-16');
    const outside = new Date('2026-12-25');
    expect(run({ labels: ['visible'], base: 'main', now: inside }, m).ok).toBe(
      true
    );
    expect(run({ labels: ['visible'], base: 'main', now: outside }, m).ok).toBe(
      false
    );
  });

  test('an instructional pull request into main needs instructors:check current', () => {
    const a = { labels: ['invisible', 'instructional'], base: 'main' };
    expect(run({ ...a, checksResult: 'failure' }).ok).toBe(false);
    expect(run({ ...a, checksResult: 'unknown' }).ok).toBe(false);
    expect(run({ ...a, checksResult: 'success' }).ok).toBe(true);
  });

  test('a pull request into an open train is exempt from window and ciphertext', () => {
    const r = run({
      labels: ['visible', 'instructional'],
      base: 'train/2.1',
      checksResult: 'failure',
    });
    expect(r.ok).toBe(true);
  });

  test('an unknown or frozen train refuses work', () => {
    expect(run({ labels: ['visible'], base: 'train/9.9' }).ok).toBe(false);
    const frozen = { ...model, trains: [{ ...train, state: 'frozen' }] };
    expect(run({ labels: ['visible'], base: 'train/2.1' }, frozen).ok).toBe(
      false
    );
  });

  test('stacked work is judged when its prerequisite lands; dependabot is invisible', () => {
    expect(run({ labels: ['visible'], base: 'feat/x' }).ok).toBe(true);
    const bot = run({ labels: [], base: 'main', author: 'dependabot[bot]' });
    expect(bot.ok).toBe(true);
    expect(bot.class).toBe('invisible');
  });
});

describe('the workflow wiring', () => {
  const wf = yaml.load(readFileSync('.github/workflows/ci.yml', 'utf8'));
  const job = wf.jobs['pr-class'];

  test('the job runs only for pull requests and reads the labels live', () => {
    // The steps, not the job: a job skipped on a push would skip deploy too
    // (the implicit success() reads every job in the needs chain).
    expect(String(job.if)).not.toContain("github.event_name == 'pull_request'");
    for (const step of job.steps)
      expect(String(step.if)).toContain("github.event_name == 'pull_request'");
    const script = JSON.stringify(job.steps);
    expect(script).toContain('node tools/pr-class.mjs --fetch');
  });

  test('the aggregate CI job requires it', () => {
    expect(wf.jobs.ci.needs).toContain('pr-class');
  });
});
