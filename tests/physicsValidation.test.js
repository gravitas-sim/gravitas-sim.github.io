// =============================================================================
// The scientific validation suite, as a test
// -----------------------------------------------------------------------------
// The checks themselves live in tools/physics-checks.mjs, which is also what
// `npm run validate:physics` runs. This file exists so that a physics
// regression fails `npm test` and therefore fails a pull request, rather than
// waiting for someone to remember to print the table.
//
// Nothing is duplicated between the two front ends on purpose. A test file with
// its own copy of the expected values would eventually disagree with the table,
// and the table is the artifact a reviewer actually reads.
//
// Why a subprocess
// -----------------------------------------------------------------------------
// The suite integrates about a million N-body steps. Imported directly into
// this file it runs under jsdom, where the same arithmetic takes four times as
// long - jsdom's Date.now is a jest mock, every trail append calls it, and the
// module registry is instrumented. That turned a 15-second suite into two
// minutes and made `npm test` unpleasant enough that people would stop running
// it, which is the one failure mode a validation suite cannot survive.
//
// So the checks run in plain node, exactly as `npm run validate:physics` runs
// them, and this file asserts on the JSON they produce. One implementation, one
// set of numbers, and the fast path for both.
//
// Every check carries its own tolerance and a written justification for it. If
// one fails, read the rationale in the failure message before touching the
// tolerance: the tolerances are derived from the integrator's convergence order
// and from the precision of the published values, so a failure means one of
// those assumptions broke.
//
// See PHYSICS_VALIDATION.md for the full write-up.
// =============================================================================

// `process` is node's, not the browser's: this suite shells out to plain node.
// The project's eslint config treats tests/ as browser code, which is right for
// every other suite here, so the exception is declared locally rather than by
// widening the config for one file.
/* global process */
import { describe, test, expect } from '@jest/globals';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const runner = path.join(here, '..', 'tools', 'validate-physics.mjs');

/**
 * Run the suite in plain node and parse its report.
 *
 * A non-zero exit status means checks failed, which is not an error here: the
 * failures are in the JSON and each becomes its own failing test below. Only an
 * unparseable result is a problem with the harness itself.
 *
 * @returns {object} The parsed report
 */
function runSuite() {
  let stdout;
  try {
    stdout = execFileSync(process.execPath, [runner, '--json'], {
      encoding: 'utf8',
      // The report is a few hundred kilobytes and grows with the suite.
      maxBuffer: 64 * 1024 * 1024,
      env: { ...process.env, NO_COLOR: '1' },
    });
  } catch (err) {
    // execFileSync throws on a non-zero exit, which is the normal path when a
    // check fails. The output is still on the error.
    stdout = err.stdout;
    if (!stdout) {
      throw new Error(
        `The physics validation runner could not start.\n${err.stderr || err.message}`
      );
    }
  }
  try {
    return JSON.parse(stdout);
  } catch {
    throw new Error(
      'The physics validation runner produced output that is not JSON:\n' +
        String(stdout).slice(0, 2000)
    );
  }
}

const report = runSuite();
const results = report.checks;

/** Group the flat result list, preserving first-seen order. */
function groupResults(list) {
  const order = [];
  const map = new Map();
  for (const r of list) {
    if (!map.has(r.group)) {
      map.set(r.group, []);
      order.push(r.group);
    }
    map.get(r.group).push(r);
  }
  return order.map(group => ({ group, checks: map.get(group) }));
}

/**
 * Render a failure the way the table does, so the message is self-contained.
 * @param {object} c - A scored check
 * @returns {string} The explanation
 */
const explain = c =>
  [
    `FAILED: ${c.group} / ${c.name}`,
    `  measured: ${c.measured}`,
    `  expected: ${c.expected}${c.unit ? ' ' + c.unit : ''}`,
    `  error:    ${c.error}  (${c.toleranceKind} tolerance ${c.tolerance})`,
    c.why ? `  tolerance rationale: ${c.why}` : '',
    c.source ? `  source: ${c.source}` : '',
  ]
    .filter(Boolean)
    .join('\n');

describe('physics validation suite', () => {
  test('the suite ran and covers every area it claims to', () => {
    expect(results.length).toBeGreaterThan(100);
    const groups = new Set(results.map(r => r.group));
    // Named explicitly rather than counted: a group silently disappearing -
    // because a module was renamed and an import quietly resolved to something
    // else - would otherwise look like a smaller but still passing suite.
    for (const required of [
      'Unit system',
      'Circular two-body orbit',
      'Eccentric Kepler orbit',
      'Conservation laws',
      'Reference frames',
      'Binary stars',
      'Escape and binding',
      'Observer geometry',
      'Transit geometry',
      'Radial velocity',
      'Astrometry',
      'Habitable zone',
      'Dark matter',
      'Compact objects',
      'Mergers',
      'Inspiral (approximation)',
      'Real systems',
    ]) {
      expect(groups).toContain(required);
    }
  });

  test('every check states a tolerance and justifies it', () => {
    // A tolerance with no stated reason is a number chosen to make a test pass.
    // The exception is the handful of exact comparisons, where there is nothing
    // to justify.
    const undocumented = results.filter(
      r => !r.why && r.toleranceKind !== 'exact'
    );
    expect(undocumented.map(r => r.name)).toEqual([]);
  });

  test('every published value names its source', () => {
    const unsourced = results.filter(r => r.kind === 'data' && !r.source);
    expect(unsourced.map(r => r.name)).toEqual([]);
  });

  test('the integrator is exercised, not just the closed forms', () => {
    // A suite of nothing but algebra would pass forever while the engine rotted.
    const integrated = results.filter(r => r.kind === 'integration');
    expect(integrated.length).toBeGreaterThanOrEqual(20);
  });

  for (const { group, checks } of groupResults(results)) {
    describe(group, () => {
      for (const check of checks) {
        test(check.name, () => {
          if (!check.pass) throw new Error(explain(check));
        });
      }
    });
  }
});
