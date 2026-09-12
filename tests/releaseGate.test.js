// =============================================================================
// The release gate's own regression tests
// -----------------------------------------------------------------------------
// Two things are being defended here.
//
// The first is that the gate and .github/workflows/ci.yml cannot drift apart
// again without something saying so. They did: `npm run validate:links` was in
// CI and not in the gate, which is how the repository shipped two broken links
// past a green local gate for two days, and `npm run cards:check` and
// `npm run docs:check -- --full` were in neither, which is how README.md came
// to claim 3608 jest tests against 4844.
//
// The second is that the summary cannot overstate what a run established.
// "Skipped" is not "passed"; "the engine is not installed" is not "passed";
// "passed on the second attempt" is not "passed"; and a --fast run has not
// tested the release.
// =============================================================================

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CHECKS,
  GROUPS,
  OUTCOMES,
  CI_SETUP_STEPS,
  CI_SETUP_COMMANDS,
  CI_EQUIVALENTS,
  summarise,
} from '../tools/checks.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WORKFLOW = path.join(REPO, '.github', 'workflows', 'ci.yml');

/**
 * Every command the workflow actually runs.
 *
 * Read line by line rather than through a YAML parser, and matched loosely: a
 * drift detector that breaks when somebody reindents a step is a detector
 * people delete. Multi-line `run: |` blocks contribute each of their command
 * lines; everything else contributes the one line after `run:`.
 *
 * @returns {Array<{job: string, command: string}>} One entry per command
 */
function ciCommands() {
  const lines = readFileSync(WORKFLOW, 'utf8').split('\n');
  const out = [];
  let job = '(top level)';
  let stepName = '';
  let block = null;
  for (const line of lines) {
    const jobMatch = /^ {2}([A-Za-z0-9_-]+):\s*$/.exec(line);
    if (jobMatch) {
      job = jobMatch[1];
      block = null;
    }
    const nameMatch = /^\s*- name:\s*(.+?)\s*$/.exec(line);
    if (nameMatch) {
      stepName = nameMatch[1];
      block = null;
    }
    const runBlock = /^(\s*)run:\s*\|\s*$/.exec(line);
    if (runBlock) {
      block = { indent: runBlock[1].length, job, stepName };
      continue;
    }
    if (block) {
      if (line.trim() === '') continue;
      const indent = line.length - line.trimStart().length;
      if (indent <= block.indent) {
        block = null;
      } else {
        out.push({
          job: block.job,
          step: block.stepName,
          command: line.trim(),
        });
        continue;
      }
    }
    const runMatch = /^\s*-?\s*run:\s*(?!\|)(.+?)\s*$/.exec(line);
    if (runMatch) {
      out.push({ job, step: stepName, command: runMatch[1] });
    }
  }
  return out;
}

/** A command is "ours" when it is a check rather than setup or reporting. */
const isSetupOrReporting = (step, command) =>
  CI_SETUP_STEPS.includes(step) ||
  CI_SETUP_COMMANDS.some(prefix => command.startsWith(prefix));

describe('the check registry', () => {
  test('every entry is well formed', () => {
    const ids = new Set();
    for (const check of CHECKS) {
      expect(typeof check.id).toBe('string');
      expect(check.id).not.toBe('');
      expect(ids.has(check.id)).toBe(false);
      ids.add(check.id);
      expect(typeof check.label).toBe('string');
      expect(Array.isArray(check.command)).toBe(true);
      expect(check.command.length).toBeGreaterThan(0);
      expect(['quick', 'slow', 'provenance', 'platform']).toContain(check.tier);
      expect(Object.keys(GROUPS)).toContain(check.group || 'correctness');
    }
  });

  // A gate-only check is allowed - scenario stability and the scene audit are
  // both minutes of work that the browser shards already cover in CI - but it
  // has to say why, so that "not in CI" is a decision on the record rather than
  // something nobody noticed.
  test('a gate-only check explains why it is gate-only', () => {
    for (const check of CHECKS.filter(c => c.ci === null)) {
      expect(typeof check.why).toBe('string');
      expect(check.why.length).toBeGreaterThan(10);
    }
  });

  test('platform checks name the engine they need', () => {
    for (const check of CHECKS.filter(c => c.tier === 'platform')) {
      expect(typeof check.engine).toBe('string');
    }
  });

  test('provenance checks name the source they need', () => {
    for (const check of CHECKS.filter(c => c.tier === 'provenance')) {
      expect(['gw', 'stellar']).toContain(check.sources);
    }
  });
});

describe('drift between CI and the release gate', () => {
  const commands = ciCommands();

  test('the workflow is readable and has steps to check', () => {
    expect(commands.length).toBeGreaterThan(10);
  });

  // The one that matters: a check CI runs, which could be run locally, cannot
  // vanish from the gate without this failing.
  test('every command CI runs is a registry entry, setup, or a named equivalence', () => {
    const registered = new Set(CHECKS.map(c => c.command.join(' ')));
    const orphans = [];
    for (const { job, step, command } of commands) {
      if (isSetupOrReporting(step, command)) continue;
      if (CI_EQUIVALENTS[command]) continue;
      if (registered.has(command)) continue;
      // `npm run x -- --flag` in CI against `npm run x` in the gate is the same
      // check with a different worker count, not drift.
      const base = command.replace(/\s+--\s+.*$/, '');
      if (registered.has(base)) continue;
      orphans.push(`${job} / ${step}: ${command}`);
    }
    expect(orphans).toEqual([]);
  });

  test('every named equivalence points at a real registry entry', () => {
    const ids = new Set(CHECKS.map(c => c.id));
    // 'citation' is validated in-process by release-check.mjs rather than by a
    // spawned command, so it is the one equivalence with no registry entry.
    for (const [command, id] of Object.entries(CI_EQUIVALENTS)) {
      if (id === 'citation') continue;
      expect({ command, id, known: ids.has(id) }).toEqual({
        command,
        id,
        known: true,
      });
    }
  });

  test('a registry entry claiming a CI job appears in that job', () => {
    const byJob = new Map();
    for (const { job, command } of commands) {
      if (!byJob.has(job)) byJob.set(job, []);
      byJob.get(job).push(command);
    }
    const missing = [];
    for (const check of CHECKS.filter(c => c.ci)) {
      const inJob = byJob.get(check.ci) || [];
      const joined = check.command.join(' ');
      const equivalent = Object.entries(CI_EQUIVALENTS)
        .filter(([, id]) => id === check.id)
        .map(([command]) => command);
      const found = inJob.some(
        command =>
          command === joined ||
          command.replace(/\s+--\s+.*$/, '') === joined ||
          equivalent.includes(command)
      );
      if (!found) missing.push(`${check.id} claims job "${check.ci}"`);
    }
    expect(missing).toEqual([]);
  });

  // The accessibility job is the deliberate case: CI runs two specs as their
  // own job, and the gate runs the whole browser suite, which contains them.
  // Recorded rather than duplicated - but recorded, so it is not a gap.
  test('the accessibility equivalence is on the record', () => {
    expect(CI_EQUIVALENTS['npm run a11y:axe']).toBe('e2e-sources');
    expect(CI_EQUIVALENTS['npm run a11y:manual']).toBe('e2e-sources');
  });

  // The checks the previous round found in neither list. Naming them here means
  // removing one from the registry is a test failure rather than a quiet loss.
  test('the checks that were in neither list are now in the gate', () => {
    const ids = new Set(CHECKS.map(c => c.id));
    for (const id of [
      'links',
      'links-dist',
      'teaching',
      'activities',
      'cards',
      'docs-full',
      'deps',
      'gw-structure',
      'stellar-structure',
      'gw-provenance',
      'stellar-provenance',
      'firefox',
      'webkit',
    ]) {
      expect({ id, present: ids.has(id) }).toEqual({ id, present: true });
    }
  });

  test('the two gate-only checks survive', () => {
    const ids = new Set(CHECKS.map(c => c.id));
    expect(ids.has('scenarios')).toBe(true);
    expect(ids.has('scene')).toBe(true);
  });
});

describe('the summary cannot overstate a run', () => {
  const row = (status, label = status) => ({ status, label });

  test('all passing is the only way to be green', () => {
    const s = summarise([row(OUTCOMES.PASS), row(OUTCOMES.PASS)]);
    expect(s.green).toBe(true);
    expect(s.complete).toBe(true);
    expect(s.headline).toBe('All 2 checks passed.');
  });

  test('unavailable is not passed', () => {
    const s = summarise([row(OUTCOMES.PASS), row(OUTCOMES.UNAVAILABLE)]);
    expect(s.green).toBe(false);
    expect(s.complete).toBe(false);
    expect(s.counts[OUTCOMES.PASS]).toBe(1);
    expect(s.headline).toMatch(/did not run/);
    expect(s.headline).not.toMatch(/All \d+ checks passed/);
  });

  test('skipped is not passed', () => {
    const s = summarise([row(OUTCOMES.PASS), row(OUTCOMES.SKIP)]);
    expect(s.green).toBe(false);
    expect(s.headline).toMatch(/not a statement about the release/);
  });

  test('passing only on a retry is not passed', () => {
    const s = summarise([row(OUTCOMES.PASS), row(OUTCOMES.RETRIED)]);
    expect(s.green).toBe(false);
    // It ran, so it is not an incomplete run - it is a run that did not settle.
    expect(s.complete).toBe(true);
    expect(s.headline).toMatch(/only on a retry/);
  });

  test('a failure outranks everything else in the headline', () => {
    const s = summarise([
      row(OUTCOMES.FAIL),
      row(OUTCOMES.SKIP),
      row(OUTCOMES.RETRIED),
    ]);
    expect(s.green).toBe(false);
    expect(s.headline).toMatch(/failed/);
    expect(s.headline).toMatch(/Nothing was tagged/);
  });

  // The shape of a --fast run: the quick checks pass and every slow, provenance
  // and platform check is skipped. It must not read as a release having passed.
  test('a --fast run cannot claim the complete release passed', () => {
    const results = [
      ...CHECKS.filter(c => c.tier === 'quick').map(c =>
        row(OUTCOMES.PASS, c.label)
      ),
      ...CHECKS.filter(c => c.tier !== 'quick').map(c =>
        row(OUTCOMES.SKIP, c.label)
      ),
    ];
    const s = summarise(results);
    expect(s.green).toBe(false);
    expect(s.headline).not.toMatch(/All \d+ checks passed/);
    expect(s.headline).toMatch(/did not run/);
    expect(s.counts[OUTCOMES.SKIP]).toBeGreaterThan(0);
  });

  // Structural validity and provenance are separate entries, so a structural
  // pass cannot stand in for a provenance one: with the sources absent the
  // provenance rows are unavailable and the run is not green, even though
  // every structural check passed.
  test('structural success cannot cover for unavailable provenance', () => {
    const structural = CHECKS.filter(c =>
      ['gw-structure', 'stellar-structure'].includes(c.id)
    );
    const provenance = CHECKS.filter(c => c.tier === 'provenance');
    expect(structural).toHaveLength(2);
    expect(provenance).toHaveLength(2);
    const s = summarise([
      ...structural.map(c => row(OUTCOMES.PASS, c.label)),
      ...provenance.map(c => row(OUTCOMES.UNAVAILABLE, c.label)),
    ]);
    expect(s.green).toBe(false);
    expect(s.counts[OUTCOMES.UNAVAILABLE]).toBe(2);
    expect(s.headline).toMatch(/did not run/);
  });

  test('a provenance failure is a failure, not an incomplete run', () => {
    const s = summarise([
      row(OUTCOMES.PASS, 'GW150914 data is complete and self-consistent'),
      row(OUTCOMES.FAIL, 'GW150914 regenerates from the published traces'),
    ]);
    expect(s.green).toBe(false);
    expect(s.headline).toMatch(/1 check\(s\) failed/);
  });

  test('an empty run is not green', () => {
    const s = summarise([]);
    expect(s.green).toBe(false);
  });
});
