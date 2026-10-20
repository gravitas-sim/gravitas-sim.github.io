#!/usr/bin/env node
// =============================================================================
// npm run validate:orbital - the orbital layer's validation group
// -----------------------------------------------------------------------------
// Runs every case in tools/orbital-cases.mjs (analytic closed forms, the 3-D
// kernel's corpus and the mission core's Kepler fixture as oracles, seeded
// round-trip ensembles, the refusals, and a textbook example) and compares
// each measure with its fixed bound. Node, not Jest, for the reason
// validate:lab3d and validate:mission give: Jest's module VM is far slower at
// arithmetic.
//
//   node tools/orbital-validate.mjs            the table; exit 1 on any failure
//   node tools/orbital-validate.mjs A1 O1      some cases
//   node tools/orbital-validate.mjs --write    and write the table into
//                                              ORBITAL_LAYER.md
//   node tools/orbital-validate.mjs --json     one JSON line per case
//
// The seeds are fixed. A measured value is a rounding error and can end in
// other digits on another engine; what the table promises is the bound, so
// the document prints the value to one figure and the test holds the rows,
// not the digits.
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import { CASES, runCase, table } from './orbital-cases.mjs';

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
  const file = new URL('../ORBITAL_LAYER.md', import.meta.url);
  const begin = '<!-- orbital-validation:begin -->';
  const end = '<!-- orbital-validation:end -->';
  const doc = readFileSync(file, 'utf8');
  const a = doc.indexOf(begin);
  const b = doc.indexOf(end);
  if (a < 0 || b < a) {
    console.error('ORBITAL_LAYER.md has no orbital-validation block.');
    process.exit(1);
  }
  writeFileSync(
    file,
    `${doc.slice(0, a + begin.length)}\n\n${table(results)}\n\n${doc.slice(b)}`
  );
  console.log('Wrote ORBITAL_LAYER.md');
}
process.exit(failed.length ? 1 : 0);
