#!/usr/bin/env node
// =============================================================================
// npm run validate:physics
// -----------------------------------------------------------------------------
// Runs the scientific validation suite and prints a PASS/FAIL table with the
// measured value, the expected value and the error against the stated tolerance.
//
// The point of having this as well as the jest suite is that a physicist who
// wants to know what Gravitas has been checked against should not have to run a
// test framework, read a test file, or take anyone's word for it. Two commands
// - npm install, npm run validate:physics - and the answer is on the screen with
// numbers attached.
//
//   --group <name>   run only groups whose name contains this string
//   --verbose        print the reason each tolerance is what it is
//   --json           machine-readable output
//
// Exit status is 0 when every check passes and 1 otherwise, so it is usable in
// CI without further plumbing.
// =============================================================================

import { runChecks, groupResults } from './physics-checks.mjs';

const argv = process.argv.slice(2);
const has = flag => argv.includes(flag);
const valueOf = flag => {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : null;
};

const asJson = has('--json');
const verbose = has('--verbose');
const groupFilter = valueOf('--group');

// Colour, but only when a human is looking at a terminal that wants it.
const useColor = process.stdout.isTTY && !process.env.NO_COLOR && !asJson;
const c = (code, s) => (useColor ? `[${code}m${s}[0m` : s);
const green = s => c('32', s);
const red = s => c('31', s);
const dim = s => c('2', s);
const bold = s => c('1', s);

/** Format a number for the table without losing what matters about it. */
function fmt(v, width = 0) {
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'string') {
    // A few checks compare strings rather than numbers - "which planets are in
    // the zone", "do the mass categories fall where they are stated to". Those
    // can be longer than their column, and left whole they run into the next
    // one and make the whole table unreadable.
    if (!width || v.length <= width - 1) return v;
    return v.slice(0, width - 2) + '\u2026';
  }
  if (!Number.isFinite(v)) return String(v);
  if (v === 0) return '0';
  const a = Math.abs(v);
  if (a >= 1e6 || a < 1e-4) return v.toExponential(4);
  return String(Number(v.toPrecision(7)));
}

/** Format the error column, which is always either relative or absolute. */
function fmtError(check) {
  if (check.toleranceKind === 'exact') return check.pass ? 'exact' : 'mismatch';
  if (check.toleranceKind === 'bound') {
    return check.pass ? 'under' : check.error.toExponential(2) + ' over';
  }
  if (!Number.isFinite(check.error)) return String(check.error);
  if (check.error === 0) return '0';
  return check.error.toExponential(2);
}

function fmtTolerance(check) {
  if (check.toleranceKind === 'exact') return 'exact';
  // A bound is one-sided: the column says what the measured value has to stay
  // under, not how close to it the value is allowed to be.
  if (check.toleranceKind === 'bound') return 'upper bound';
  const t = check.tolerance;
  const suffix = check.toleranceKind === 'absolute' ? ' abs' : ' rel';
  return (t === 0 ? '0' : t.toExponential(1)) + suffix;
}

const KIND_LABEL = {
  analytic: 'analytic',
  integration: 'integrated',
  approximation: 'APPROX',
  data: 'published',
};

function pad(s, n) {
  const str = String(s);
  return str.length >= n ? str : str + ' '.repeat(n - str.length);
}
function padLeft(s, n) {
  const str = String(s);
  return str.length >= n ? str : ' '.repeat(n - str.length) + str;
}

async function main() {
  const started = Date.now();
  let results;
  try {
    results = await runChecks();
  } catch (err) {
    console.error(red('The validation suite could not run.'));
    console.error(err);
    process.exitCode = 2;
    return;
  }
  const elapsed = Date.now() - started;

  const filtered = groupFilter
    ? results.filter(r =>
        r.group.toLowerCase().includes(groupFilter.toLowerCase())
      )
    : results;

  if (asJson) {
    console.log(
      JSON.stringify(
        {
          passed: filtered.filter(r => r.pass).length,
          failed: filtered.filter(r => !r.pass).length,
          elapsedMs: elapsed,
          checks: filtered,
        },
        null,
        2
      )
    );
    // exitCode rather than exit(): process.exit() can truncate a large
    // stdout write on a pipe before it flushes, which silently corrupts the
    // JSON output the moment it grows past a buffer.
    process.exitCode = filtered.every(r => r.pass) ? 0 : 1;
    return;
  }

  const W = {
    name: 62,
    kind: 11,
    measured: 15,
    expected: 15,
    err: 11,
    tol: 12,
  };

  console.log('');
  console.log(bold('Gravitas physics validation'));
  console.log(
    dim(
      'analytic = closed form   integrated = run through the N-body engine   ' +
        'published = literature value   APPROX = educational model, checked ' +
        'against its own stated equation'
    )
  );

  for (const { group, checks } of groupResults(filtered)) {
    console.log('');
    console.log(bold(group));
    console.log(
      dim(
        '  ' +
          pad('check', W.name) +
          pad('kind', W.kind) +
          padLeft('measured', W.measured) +
          padLeft('expected', W.expected) +
          padLeft('error', W.err) +
          padLeft('tolerance', W.tol) +
          '  result'
      )
    );
    for (const check of checks) {
      const mark = check.pass ? green('PASS') : red('FAIL');
      console.log(
        '  ' +
          pad(check.name.slice(0, W.name - 1), W.name) +
          pad(KIND_LABEL[check.kind] ?? check.kind, W.kind) +
          padLeft(fmt(check.measured, W.measured), W.measured) +
          padLeft(fmt(check.expected, W.expected), W.expected) +
          padLeft(fmtError(check), W.err) +
          padLeft(fmtTolerance(check), W.tol) +
          '  ' +
          mark
      );
      if (check.unit) {
        // Units go on their own dim line rather than in a column, because the
        // ones that matter here are long ("fraction of total |p|") and a column
        // wide enough for them would push the numbers off the screen.
        console.log(dim('    ' + check.unit));
      }
      if (verbose && check.why) {
        console.log(dim('    why: ' + check.why));
      }
      if (verbose && check.source) {
        console.log(dim('    source: ' + check.source));
      }
      if (!check.pass && check.note) {
        console.log(red('    ' + check.note));
      }
    }
  }

  const passed = filtered.filter(r => r.pass).length;
  const failed = filtered.length - passed;
  const byKind = {};
  for (const r of filtered) byKind[r.kind] = (byKind[r.kind] || 0) + 1;

  console.log('');
  console.log(
    bold(
      `${filtered.length} checks: ${passed} passed, ${failed} failed  ` +
        `(${elapsed} ms)`
    )
  );
  console.log(
    dim(
      Object.entries(byKind)
        .map(([k, n]) => `${n} ${KIND_LABEL[k] ?? k}`)
        .join('   ')
    )
  );
  if (failed) {
    console.log('');
    console.log(red('Failed:'));
    for (const r of filtered.filter(x => !x.pass)) {
      console.log(
        red(`  ${r.group} / ${r.name}`) +
          dim(`  measured ${fmt(r.measured)}, expected ${fmt(r.expected)}`)
      );
      if (r.why) console.log(dim(`    tolerance rationale: ${r.why}`));
    }
  }
  console.log('');
  console.log(dim('Full write-up: PHYSICS_VALIDATION.md'));
  console.log('');

  process.exitCode = failed ? 1 : 0;
}

main();
