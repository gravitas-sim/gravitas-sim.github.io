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
  RELEASE_REF_ONLY,
  summarize,
} from '../tools/checks.mjs';
import { ALL_GROUPS, FACT_GROUPS } from '../tools/docs-facts.mjs';

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
  // The step's own `if:`, which is policy rather than plumbing: it is how a
  // check that needs a release ref is kept off an integration branch, and a
  // drift detector that could not see it would call the two arrangements the
  // same. Reset at a job boundary as well as at a step, so a job-level
  // condition is never read as the first step's.
  let stepIf = null;
  let block = null;
  for (const line of lines) {
    const jobMatch = /^ {2}([A-Za-z0-9_-]+):\s*$/.exec(line);
    if (jobMatch) {
      job = jobMatch[1];
      stepName = '';
      stepIf = null;
      block = null;
    }
    const nameMatch = /^\s*- name:\s*(.+?)\s*$/.exec(line);
    if (nameMatch) {
      stepName = nameMatch[1];
      stepIf = null;
      block = null;
    }
    const ifMatch = /^\s+if:\s*(.+?)\s*$/.exec(line);
    if (ifMatch && stepName && !block) stepIf = ifMatch[1];
    const runBlock = /^(\s*)run:\s*\|\s*$/.exec(line);
    if (runBlock) {
      block = { indent: runBlock[1].length, job, stepName, condition: stepIf };
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
          condition: block.condition,
          command: line.trim(),
        });
        continue;
      }
    }
    const runMatch = /^\s*-?\s*run:\s*(?!\|)(.+?)\s*$/.exec(line);
    if (runMatch) {
      out.push({
        job,
        step: stepName,
        condition: stepIf,
        command: runMatch[1],
      });
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

  // `npm run build` rewrites sw-manifest.js. Any check that asks whether the
  // committed manifest is current has to be asked before that happens, or the
  // build has already made the answer yes. The gate passed 32 of 32 with a
  // stale manifest committed, and only CI - whose lint job runs `npm test`
  // against a clean checkout - could still see it.
  //
  // The gate runs group by group, so being early in the array is not enough:
  // a check in a group that runs after correctness runs after the build no
  // matter where it sits. Both conditions are asserted.
  test('the manifest is checked before the build regenerates it', () => {
    const order = CHECKS.map(c => c.id);
    const groups = Object.keys(GROUPS);
    const at = id => {
      const check = CHECKS.find(c => c.id === id);
      expect(check).toBeDefined();
      return [groups.indexOf(check.group || 'correctness'), order.indexOf(id)];
    };
    const build = at('build');
    for (const id of ['sw', 'unit']) {
      const before = at(id);
      // Same group and earlier in it, or an earlier group outright.
      expect(
        before[0] < build[0] || (before[0] === build[0] && before[1] < build[1])
      ).toBe(true);
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
    const s = summarize([row(OUTCOMES.PASS), row(OUTCOMES.PASS)]);
    expect(s.green).toBe(true);
    expect(s.complete).toBe(true);
    expect(s.headline).toBe('All 2 checks passed.');
  });

  test('unavailable is not passed', () => {
    const s = summarize([row(OUTCOMES.PASS), row(OUTCOMES.UNAVAILABLE)]);
    expect(s.green).toBe(false);
    expect(s.complete).toBe(false);
    expect(s.counts[OUTCOMES.PASS]).toBe(1);
    expect(s.headline).toMatch(/did not run/);
    expect(s.headline).not.toMatch(/All \d+ checks passed/);
  });

  test('skipped is not passed', () => {
    const s = summarize([row(OUTCOMES.PASS), row(OUTCOMES.SKIP)]);
    expect(s.green).toBe(false);
    expect(s.headline).toMatch(/not a statement about the release/);
  });

  test('passing only on a retry is not passed', () => {
    const s = summarize([row(OUTCOMES.PASS), row(OUTCOMES.RETRIED)]);
    expect(s.green).toBe(false);
    // It ran, so it is not an incomplete run - it is a run that did not settle.
    expect(s.complete).toBe(true);
    expect(s.headline).toMatch(/only on a retry/);
  });

  test('a failure outranks everything else in the headline', () => {
    const s = summarize([
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
    const s = summarize(results);
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
    const s = summarize([
      ...structural.map(c => row(OUTCOMES.PASS, c.label)),
      ...provenance.map(c => row(OUTCOMES.UNAVAILABLE, c.label)),
    ]);
    expect(s.green).toBe(false);
    expect(s.counts[OUTCOMES.UNAVAILABLE]).toBe(2);
    expect(s.headline).toMatch(/did not run/);
  });

  test('a provenance failure is a failure, not an incomplete run', () => {
    const s = summarize([
      row(OUTCOMES.PASS, 'GW150914 data is complete and self-consistent'),
      row(OUTCOMES.FAIL, 'GW150914 regenerates from the published traces'),
    ]);
    expect(s.green).toBe(false);
    expect(s.headline).toMatch(/1 check\(s\) failed/);
  });

  test('an empty run is not green', () => {
    const s = summarize([]);
    expect(s.green).toBe(false);
  });

  // A browser that would not start is neither a passing product nor a failing
  // one. Calling it a failure sends somebody looking for a bug that is not
  // there; calling it a pass is worse.
  test('a browser that would not launch is its own outcome', () => {
    const s = summarize([row(OUTCOMES.PASS), row(OUTCOMES.LAUNCH_FAILED)]);
    expect(s.green).toBe(false);
    expect(s.complete).toBe(false);
    expect(s.counts[OUTCOMES.LAUNCH_FAILED]).toBe(1);
    expect(s.headline).toMatch(/could not launch/);
    expect(s.headline).not.toMatch(/failed/);
  });

  test('every outcome has a column in the tally', () => {
    const s = summarize([row(OUTCOMES.PASS)]);
    for (const key of Object.values(OUTCOMES)) {
      expect({ key, counted: typeof s.counts[key] }).toEqual({
        key,
        counted: 'number',
      });
    }
  });

  // A suite can exit zero having declined to run part of itself, and the exit
  // code cannot say so.
  test('tests skipped inside a passing check are counted and reported', () => {
    const s = summarize([
      { status: OUTCOMES.PASS, label: 'browser suite', skippedTests: 4 },
      { status: OUTCOMES.PASS, label: 'lint' },
    ]);
    // Still green - the checks all passed - but the number is carried so the
    // report can say it rather than printing an unqualified "all passed".
    expect(s.green).toBe(true);
    expect(s.innerSkipped).toBe(4);
  });
});

describe('the skip policy', () => {
  test('allows only capability skips, each with a reason', async () => {
    const { ALLOWED_SKIPS } = await import('../tools/check-test-policy.mjs');
    expect(ALLOWED_SKIPS.length).toBeGreaterThan(0);
    for (const entry of ALLOWED_SKIPS) {
      expect(typeof entry.file).toBe('string');
      expect(typeof entry.match).toBe('string');
      // A capability is a property of the machine. "this build has no energy
      // tab" is not one, and that is the distinction the list encodes.
      expect(typeof entry.capability).toBe('string');
      expect(entry.capability.length).toBeGreaterThan(2);
      expect(entry.why.length).toBeGreaterThan(40);
    }
  });

  test('the allowlist is small, and names only platform capabilities', async () => {
    const { ALLOWED_SKIPS } = await import('../tools/check-test-policy.mjs');
    expect(ALLOWED_SKIPS.length).toBeLessThanOrEqual(4);
    expect(ALLOWED_SKIPS.map(a => a.capability).sort()).toEqual([
      'MediaRecorder',
      'WebGL',
    ]);
  });
});

// =============================================================================
// The workflow's own vocabulary is not ours to Americanize
// -----------------------------------------------------------------------------
// `cancelled()` is a GitHub Actions status function and the two-l spelling is
// part of the expression language. A pass that made the source consistently
// American rewrote six of them to `canceled()`, which is not a function that
// exists - so the workflow could not be parsed at all. The run failed in zero
// seconds with no jobs, no logs and no annotation, and Actions displayed the
// file path where the workflow's name usually goes, which is the only visible
// sign that it never got as far as reading it.
//
// Nothing local catches that: the gate runs the tests, not the workflow. This
// does, in the file that already ties the two together.
describe('the workflow uses the expression language as spelled', () => {
  const BUILT_INS = ['success', 'failure', 'always', 'cancelled'];
  const MISSPELLINGS = ['canceled', 'suceeded', 'allways'];

  test('every status function is one Actions defines', () => {
    const text = readFileSync(WORKFLOW, 'utf8');
    // Only inside ${{ }}. The comments discuss capture.canRecord(), which is
    // the application's function and nothing to do with the workflow's.
    const expressions = [...text.matchAll(/\$\{\{([^}]*)\}\}/g)].map(m => m[1]);
    const called = expressions.flatMap(expr =>
      [...expr.matchAll(/\b([a-zA-Z_]+)\(\)/g)].map(m => m[1])
    );
    expect(called.length).toBeGreaterThan(0);
    for (const fn of called) {
      expect(BUILT_INS).toContain(fn);
    }
  });

  test('no americanized spelling of a built-in survives', () => {
    const text = readFileSync(WORKFLOW, 'utf8');
    for (const wrong of MISSPELLINGS) {
      expect(text).not.toContain(`${wrong}()`);
    }
    expect(text).toContain('cancelled()');
  });
});

// =============================================================================
// Which checks a branch is asked for, and which only a release is
// -----------------------------------------------------------------------------
// One CI step now carries a condition, and a condition is a policy rather than
// a convenience, so it is checked as one.
//
// The problem it solves: `instructors:check` compares the working tree against
// the committed production ciphertext, which only the owner's passphrase can
// produce. On a long-lived integration branch with a dozen parallel lesson
// branches that is the wrong question - every one of them edits instructional
// content, so every one of them is red until somebody rebuilds a four-megabyte
// encrypted file that then conflicts with every other branch doing the same.
// Three open v1.1 pull requests were red on that and on nothing else.
//
// The thing that must not be lost is the release guarantee: a stale bundle
// must not reach the live site. So the condition is evaluated here against the
// four contexts that exist, rather than matched as a string, and the deploy
// path is checked separately - tools/verify-release.mjs asks the same question
// with no condition at all, in the job that publishes.
// =============================================================================

/**
 * Evaluate the subset of the Actions expression language the workflow uses.
 *
 * Deliberately small: equality and inequality against a literal, joined by `||`
 * and `&&`. Anything else throws rather than being guessed at, because a
 * silently mis-evaluated condition would make this file agree with a policy
 * nobody has.
 *
 * @param {string} expr - The `if:` expression
 * @param {object} ctx - Context values, e.g. {'github.ref': '...'}
 * @returns {boolean} What GitHub would decide
 */
function evaluateCondition(expr, ctx) {
  const or = expr.split('||');
  return or.some(clause =>
    clause.split('&&').every(term => {
      const m = /^\s*([A-Za-z0-9_.]+)\s*(==|!=)\s*'([^']*)'\s*$/.exec(term);
      if (!m) throw new Error(`unsupported expression term: ${term.trim()}`);
      const [, name, op, literal] = m;
      if (!(name in ctx)) throw new Error(`unknown context value: ${name}`);
      return op === '==' ? ctx[name] === literal : ctx[name] !== literal;
    })
  );
}

/** The four things that can trigger this workflow and carry a ref. */
const CONTEXTS = {
  'push to main': {
    'github.event_name': 'push',
    'github.ref': 'refs/heads/main',
    'github.base_ref': '',
  },
  'push to v2': {
    'github.event_name': 'push',
    'github.ref': 'refs/heads/v2',
    'github.base_ref': '',
  },
  'pull request into main': {
    'github.event_name': 'pull_request',
    'github.ref': 'refs/pull/42/merge',
    'github.base_ref': 'main',
  },
  'pull request into v2': {
    'github.event_name': 'pull_request',
    'github.ref': 'refs/pull/42/merge',
    'github.base_ref': 'v2',
  },
};

describe('the checks a release is asked for and a branch is not', () => {
  const commands = ciCommands();
  const find = command => commands.find(c => c.command === command);

  test('the evaluator handles the expression, rather than guessing at it', () => {
    // Guards the assertions below: an evaluator that threw on everything, or
    // returned undefined, would make every truth table look like whatever the
    // first expectation asked for.
    expect(() =>
      evaluateCondition("github.ref == 'x'", { 'github.ref': 'x' })
    ).not.toThrow();
    expect(evaluateCondition("github.ref == 'x'", { 'github.ref': 'x' })).toBe(
      true
    );
    expect(evaluateCondition("github.ref == 'x'", { 'github.ref': 'y' })).toBe(
      false
    );
    expect(() =>
      evaluateCondition('startsWith(github.ref, "x")', {})
    ).toThrow();
  });

  test('a registry entry that declares a condition carries it in CI', () => {
    const conditional = CHECKS.filter(c => c.ciCondition);
    expect(conditional.length).toBeGreaterThan(0);
    for (const check of conditional) {
      const step = find(check.command.join(' '));
      expect({ id: check.id, found: Boolean(step) }).toEqual({
        id: check.id,
        found: true,
      });
      expect({ id: check.id, condition: step.condition }).toEqual({
        id: check.id,
        condition: check.ciCondition,
      });
      expect(step.job).toBe(check.ci);
    }
  });

  test('a registry entry that declares none runs unconditionally', () => {
    // The other half, and the one that stops a condition being added to a
    // check quietly. A step that stopped running on pull requests without the
    // registry saying so would be a check the project believes it has.
    const unconditional = [];
    for (const check of CHECKS.filter(c => c.ci && !c.ciCondition)) {
      const step = find(check.command.join(' '));
      if (step && step.condition) {
        unconditional.push(`${check.id}: ${step.condition}`);
      }
    }
    expect(unconditional).toEqual([]);
  });

  test('the freshness check is asked on release paths and on no others', () => {
    const asked = {};
    for (const [name, ctx] of Object.entries(CONTEXTS)) {
      asked[name] = evaluateCondition(RELEASE_REF_ONLY, ctx);
    }
    expect(asked).toEqual({
      'push to main': true,
      'pull request into main': true,
      'push to v2': false,
      'pull request into v2': false,
    });
  });

  test('an integration branch is still asked the questions it can answer', () => {
    // Relaxing the freshness check would be a hole if it were the only thing
    // asked about the instructor materials. It is not: the pipeline itself is
    // exercised on every branch, with no secret, and the digest that freshness
    // rests on is checked for completeness at the same time.
    for (const command of [
      'npm run instructors:validate',
      'npm run instructors:audit',
    ]) {
      const step = find(command);
      expect({ command, found: Boolean(step) }).toEqual({
        command,
        found: true,
      });
      expect({ command, condition: step.condition }).toEqual({
        command,
        condition: null,
      });
    }
  });

  test('the deploy job still hangs off the job that asks', () => {
    const workflow = readFileSync(WORKFLOW, 'utf8');
    // `needs: [ci]` without always(), so a failed `checks` skips the deploy;
    // and the freshness step lives in `checks`.
    expect(workflow).toMatch(
      /deploy:\n\s+name: Deploy to Pages\n\s+needs: \[ci\]/
    );
    expect(workflow).toMatch(
      /needs: \[checks, build, e2e, accessibility, e2e-build, cross-browser\]/
    );
    const step = find('npm run instructors:check');
    expect(step.job).toBe('checks');
  });
});

// =============================================================================
// The facts CI gathers, against the facts this project knows how to produce
// -----------------------------------------------------------------------------
// `npm run docs:check` passes while the counts that cost a test run are stale,
// because it reports them as not measured and then prints "Documentation
// matches the source". CI ran that form. README.md claimed 3608 jest tests
// against 4844 and 579 browser tests against 1061, and three open pull requests
// were carrying stale counts behind a green tick at the time this was written.
//
// The expensive facts are grouped now by what each costs, and CI runs each
// group in the job that has already paid for it. This is the assertion that
// makes that arrangement mean something: a fact in no group CI runs is a fact a
// pull request can leave stale, whichever group somebody put it in.
// =============================================================================
describe('the documentation facts CI gathers', () => {
  const commands = ciCommands();

  /** The fact groups the workflow asks for, from the commands it runs. */
  function groupsInCi() {
    const asked = new Set();
    for (const { command } of commands) {
      const m = /^npm run docs:check:(\w+)$/.exec(command);
      if (m && ALL_GROUPS.includes(m[1])) asked.add(m[1]);
      if (/^npm run docs:check:full$/.test(command)) {
        for (const g of ALL_GROUPS) asked.add(g);
      }
    }
    return asked;
  }

  test('CI asks for at least one group, so the check below is not vacuous', () => {
    expect(groupsInCi().size).toBeGreaterThan(0);
  });

  test('every deferred fact belongs to a group CI runs', () => {
    const asked = groupsInCi();
    const covered = new Set();
    for (const group of asked) {
      for (const key of FACT_GROUPS[group].keys) covered.add(key);
      for (const block of FACT_GROUPS[group].blocks)
        covered.add(`block:${block}`);
    }
    const everything = [];
    for (const group of ALL_GROUPS) {
      for (const key of FACT_GROUPS[group].keys) everything.push(key);
      for (const block of FACT_GROUPS[group].blocks) {
        everything.push(`block:${block}`);
      }
    }
    expect(everything.filter(k => !covered.has(k))).toEqual([]);
  });

  test('no fact belongs to two groups, so neither job can be dropped safely', () => {
    const seen = new Map();
    const duplicated = [];
    for (const group of ALL_GROUPS) {
      for (const key of FACT_GROUPS[group].keys) {
        if (seen.has(key))
          duplicated.push(`${key}: ${seen.get(key)}, ${group}`);
        seen.set(key, group);
      }
    }
    expect(duplicated).toEqual([]);
  });

  test('the gate still runs the undivided form', () => {
    const full = CHECKS.find(c => c.id === 'docs-full');
    expect(full).toBeDefined();
    expect(full.command).toEqual(['npm', 'run', 'docs:check:full']);
    // Both halves name it, so removing either from CI is a drift failure
    // rather than a silent narrowing.
    expect(CI_EQUIVALENTS['npm run docs:check:tests']).toBe('docs-full');
    expect(CI_EQUIVALENTS['npm run docs:check:build']).toBe('docs-full');
  });
});
