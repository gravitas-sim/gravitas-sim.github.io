#!/usr/bin/env node
// =============================================================================
// npm run validate:numeric - the numerical routines' validation group
// -----------------------------------------------------------------------------
// Runs every case in tools/numeric-cases.mjs (closed forms, the code a routine
// would replace and second methods as oracles, seeded ensembles, the refusals,
// published test problems) and compares each measure with its fixed bound.
// Node, not Jest, because Jest's module VM is far slower at arithmetic.
//
//   node tools/numeric-validate.mjs            the table; exit 1 on any failure
//   node tools/numeric-validate.mjs R1 Q3      some cases
//   node tools/numeric-validate.mjs --write    and write the table into
//                                              NUMERICS.md
//   node tools/numeric-validate.mjs --json     one JSON line per case
//
// The seeds are fixed and every draw is mulberry32's. A measured value is a
// rounding error and can end in other digits on another engine; what the table
// promises is the bound, so the document prints the value to one figure.
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import { CASES, runCase, table } from './numeric-cases.mjs';

const args = process.argv.slice(2);
const ids = args.filter(a => /^[A-Z]\d+$/.test(a));
const write = args.includes('--write');
const json = args.includes('--json');

const results = CASES.filter(c => !ids.length || ids.includes(c.id)).map(
  runCase
);
const failed = results.filter(c => !c.ok);

if (json)
  for (const c of results)
    console.log(JSON.stringify(c, (k, v) => (k === 'run' ? undefined : v)));
else {
  console.log(table(results));
  console.log(
    `\n${results.length} cases, ${results.reduce((n, c) => n + c.measures.length, 0)} measures, ${failed.length} failing.`
  );
}

if (write) {
  const file = new URL('../NUMERICS.md', import.meta.url);
  const begin = '<!-- numeric-validation:begin -->';
  const end = '<!-- numeric-validation:end -->';
  const doc = readFileSync(file, 'utf8');
  const a = doc.indexOf(begin);
  const b = doc.indexOf(end);
  if (a < 0 || b < a) {
    console.error('NUMERICS.md has no numeric-validation block.');
    process.exit(1);
  }
  writeFileSync(
    file,
    `${doc.slice(0, a + begin.length)}\n\n${table(results)}\n\n${doc.slice(b)}`
  );
  console.log('Wrote NUMERICS.md');
}
process.exit(failed.length ? 1 : 0);
