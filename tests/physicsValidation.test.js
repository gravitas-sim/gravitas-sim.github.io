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
import { readFileSync } from 'node:fs';
import { KIND_ORDER, KIND_LABEL, KIND_SHORT } from '../js/physicsKinds.js';
import { score } from '../tools/physics-checks.mjs';
import { conjunctions, conjunctionCluster } from '../js/resonance/elements.js';
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

// =============================================================================
// Everything that groups by kind has to know about every kind
// -----------------------------------------------------------------------------
// The suite grew a fifth kind and four separate places kept their own list of
// four. Each failed quietly: the validator's label map fell through to the raw
// name, so it printed correctly; the published validation page filtered by its
// own KIND_ORDER, so the empirical check vanished from a page whose heading
// promises every check by kind; the stylesheet had four hues, so a fifth chip
// would have rendered with an unset custom property; and the documentation was
// transcribed from the first of those.
//
// The vocabulary has one owner now. These tests are the part a shared import
// cannot enforce on its own - that the page's prose and the stylesheet's hues
// keep up with it.
describe('the kind vocabulary has one owner', () => {
  const read = rel => readFileSync(path.join(here, '..', rel), 'utf8');

  test('the validation page describes every kind the suite can produce', () => {
    const page = read('js/validationPage.js');
    // An empty order would make the loop below pass without checking anything.
    expect(KIND_ORDER.length).toBeGreaterThan(1);
    for (const kind of KIND_ORDER) {
      expect(page).toMatch(new RegExp(`\\b${kind}:\\s*\\{`));
    }
  });

  test('the page does not keep a second list of kinds', () => {
    const page = read('js/validationPage.js');
    expect(page).toMatch(
      /import \{[^}]*KIND_ORDER[^}]*\} from '\.\/physicsKinds\.js'/
    );
    expect(page).not.toMatch(/const KIND_ORDER\s*=/);
  });

  test('every kind has a color, so no chip renders unstyled', () => {
    const css = read('css/page.css');
    expect(KIND_ORDER.length).toBeGreaterThan(1);
    for (const kind of KIND_ORDER) {
      expect(css).toContain(`[data-kind='${kind}']`);
    }
  });

  test('the prose label is spelled out and the terminal one is short', () => {
    expect(KIND_LABEL.approximation).toBe('approximation');
    expect(KIND_SHORT.approximation).toBe('APPROX');
  });
});

// =============================================================================
// A measurement that cannot be taken costs its own row, not the registry
// -----------------------------------------------------------------------------
// `conjunctionCluster` returns null when a run produced no conjunctions at all.
// That is a degenerate result rather than an impossible one - a body that has
// left its resonance may never line up with its neighbour inside the window the
// run covers - and the Pluto checks read the cluster to report where Pluto sits
// on its own orbit at each line-up.
//
// Read without a guard, that null threw inside runChecks(), and because every
// check is built before any of them is reported, the whole registry came back
// as "the validation suite could not run". Two hundred and forty-three checks
// disappeared because one of them had nothing to measure, which is the wrong
// answer twice over: it hides the other checks, and it hides which check went
// missing.
//
// The three tests below cover the path in the order it runs. Between them they
// fail if the producer stops returning null for an empty run, if the scorer
// stops recording a missing number as a failure, or if the registry goes back
// to reaching through the cluster without checking it.
//
// What none of them do is run the registry itself against a degenerate world,
// because there is no way to produce one without changing the physics, and the
// only honest way to change the physics is to change it for everybody. That
// case was verified out of band instead, by loading the suite with
// `conjunctionCluster` forced to return null: the registry completed all 243
// checks and reported exactly one failure, this one. The commit message and the
// pull request carry the numbers.
// =============================================================================
describe('a missing measurement fails its own row, not the suite', () => {
  test('a window with no line-up yields no conjunctions and so no cluster', () => {
    // Two bodies whose relative longitude drifts from 10 to 100 degrees and
    // never completes a circuit: real motion, no conjunction in the window.
    // This is the shape of the rows the Pluto check derives its anomalies from.
    const samples = Array.from({ length: 50 }, (_, i) => ({
      t: i,
      outer: i * 3,
      inner: i * 3 + 10 + (i * 90) / 49,
    }));
    const events = conjunctions(samples);
    expect(events).toEqual([]);

    // The registry maps events to the true anomaly at each one, so no events
    // means no anomalies, and an empty set has no mean direction to report.
    const anomalies = events.map(() => ({ longitude: 0 }));
    expect(conjunctionCluster(anomalies)).toBeNull();
  });

  test('a measurement that is not a number is scored as a failure, not thrown', () => {
    // The contract the guard depends on. score() is the registry's own scorer,
    // imported rather than reimplemented, so this cannot drift from it.
    const cluster = conjunctionCluster([]);
    expect(cluster).toBeNull();

    const row = score({
      group: 'Orbital resonance',
      kind: 'integration',
      name: 'a check whose measurement could not be taken',
      measured: cluster ? cluster.mean : NaN,
      expected: 180,
      tolerance: 10,
      toleranceKind: 'absolute',
    });
    expect(row.pass).toBe(false);
    expect(row.note).toMatch(/not finite/);
    expect(row.name).toBe('a check whose measurement could not be taken');
  });

  test('the registry never reaches through a conjunction cluster', () => {
    // The structural half, and the one that catches the original mistake coming
    // back. A behavioural test cannot see this without a degenerate world to run
    // the registry in, so the invariant is asserted on the source: every read of
    // atConjunction goes through a guard, and a bare `atConjunction.` is the bug.
    const registry = readFileSync(
      path.join(here, '..', 'tools', 'physics-checks.mjs'),
      'utf8'
    );
    // Guard against the test silently passing because the name changed.
    expect(registry).toContain('atConjunction');
    // Every line that dereferences the cluster has to test it on the same line.
    // `pluto.atConjunction ? pluto.atConjunction.mean : NaN` satisfies this;
    // the `pluto.atConjunction.mean` that used to be there does not.
    const dereferences = registry
      .split('\n')
      .filter(line => /atConjunction\s*\./.test(line));
    expect(dereferences.length).toBeGreaterThan(0);
    for (const line of dereferences) {
      expect(line).toMatch(/atConjunction\s*(\?|&&)/);
    }
  });
});
