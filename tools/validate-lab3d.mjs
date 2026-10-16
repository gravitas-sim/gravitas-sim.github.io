#!/usr/bin/env node
// =============================================================================
// The 3-D kernel's permanent validation
// -----------------------------------------------------------------------------
// Runs every reference problem in js/lab3d/references.js through the
// production engine (js/lab3d/engine.js runToEnd) and compares each measure
// with the tolerance VALIDATED_3D_LAB_GATE.md fixed. Node, not Jest: the long
// runs are tens of millions of force evaluations, and Jest's module VM is an
// order of magnitude slower at arithmetic than Node itself.
//
//   node tools/validate-lab3d.mjs            the table; exit 1 on any failure
//   node tools/validate-lab3d.mjs R1 R5      some problems
//   node tools/validate-lab3d.mjs --write    and write the table into LAB3D.md
//   node tools/validate-lab3d.mjs --json     one JSON line per problem
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import { runToEnd } from '../js/lab3d/engine.js';
import { REFERENCES, passes } from '../js/lab3d/references.js';

const args = process.argv.slice(2);
const ids = args.filter(a => /^R\d+$/.test(a));
const write = args.includes('--write');
const json = args.includes('--json');
// The long problems sample more often than a page may ask for.
const run = (system, options) =>
  runToEnd(system, {
    ...options,
    limits: { maxSamples: 30000, maxEvals: 1e9 },
  });

const fmt = v =>
  typeof v !== 'number'
    ? String(v)
    : v === 0
      ? '0'
      : Math.abs(v) >= 0.01 && Math.abs(v) < 1e4
        ? String(Number(v.toPrecision(3)))
        : v.toExponential(1).replace('e', 'e');
const bound = c =>
  c.diagnostic
    ? 'diagnostic'
    : c.tolerance !== undefined
      ? `≤ ${fmt(c.tolerance)}`
      : c.atLeast !== undefined
        ? `≥ ${fmt(c.atLeast)}`
        : `= ${c.exactly}`;

const rows = [];
let failed = 0;
for (const ref of REFERENCES) {
  if (ids.length && !ids.includes(ref.id)) continue;
  const started = Date.now();
  const { system, options, context } = ref.make();
  const result = run(system, options);
  const checks =
    result.status === 'ok'
      ? ref.check(result, context, run)
      : [
          {
            what: `run status ${result.status}`,
            value: result.status,
            exactly: 'ok',
          },
        ];
  const seconds = (Date.now() - started) / 1000;
  const it = system.integrator;
  const scheme =
    it.scheme === 'dopri5'
      ? `dopri5, tol ${it.tol}`
      : `${it.scheme}, h = ${fmt(it.h)}`;
  for (const c of checks) {
    const ok = passes(c);
    if (!ok) failed++;
    rows.push({
      id: ref.id,
      title: ref.title,
      scheme,
      what: c.what,
      value: c.value,
      bound: bound(c),
      ok,
      evals: result.stats.evals,
      seconds,
    });
  }
  if (json)
    console.log(
      JSON.stringify({
        id: ref.id,
        status: result.status,
        stats: result.stats,
        residuals: result.residuals,
        checks,
      })
    );
  else
    process.stderr.write(
      `${ref.id} ${checks.every(passes) ? 'pass' : 'FAIL'} (${seconds.toFixed(1)} s, ${result.stats.evals.toExponential(2)} force evaluations)\n`
    );
}

const table = [
  '| # | Problem | Integrator | Measured | Value | Tolerance | |',
  '|---|---|---|---|---|---|---|',
  ...rows.map(
    r =>
      `| ${r.id} | ${r.title} | ${r.scheme} | ${r.what} | ${fmt(r.value)} | ${r.bound} | ${r.ok ? 'pass' : '**fail**'} |`
  ),
].join('\n');

if (!json) console.log(table);
if (write) {
  const doc = readFileSync('LAB3D.md', 'utf8');
  const open = '<!-- lab3d:validation -->';
  const close = '<!-- /lab3d:validation -->';
  const a = doc.indexOf(open);
  const b = doc.indexOf(close);
  if (a < 0 || b < a) throw new Error('LAB3D.md has no validation block');
  writeFileSync(
    'LAB3D.md',
    `${doc.slice(0, a + open.length)}\n${table}\n${doc.slice(b)}`
  );
}
if (failed) {
  console.error(`${failed} check(s) failed.`);
  process.exit(1);
}
