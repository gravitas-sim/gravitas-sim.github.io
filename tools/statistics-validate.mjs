#!/usr/bin/env node
// =============================================================================
// npm run validate:statistics - the statistics kernel's validation group
// -----------------------------------------------------------------------------
// Runs every case in tools/statistics-cases.mjs (closed forms, second methods,
// seeded ensembles, refusals, published data and tables) and compares each
// measure with its fixed bound. Node, not Jest, because Jest's module VM is far
// slower at arithmetic.
//
//   node tools/statistics-validate.mjs            the table; exit 1 on any failure
//   node tools/statistics-validate.mjs S1 I7      some cases
//   node tools/statistics-validate.mjs --write    and write the table into
//                                                 STATISTICS.md
//   node tools/statistics-validate.mjs --json     one JSON line per case
//
// The seeds are fixed and every draw is mulberry32's. A measured value is a
// rounding error or a sample and can end in other digits on another engine; what
// the table promises is the bound, so the document prints values to four figures.
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import { CASES, runCase, table } from './statistics-cases.mjs';

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
  for (const c of failed)
    for (const m of c.measures.filter(x => !x.ok))
      console.log(
        `FAIL ${c.id}: ${m.name}: value ${m.value}, expected ${m.expected} +- ${m.tolerance}`
      );
}

if (write) {
  const file = new URL('../STATISTICS.md', import.meta.url);
  const begin = '<!-- statistics-validation:begin -->';
  const end = '<!-- statistics-validation:end -->';
  const doc = readFileSync(file, 'utf8');
  const a = doc.indexOf(begin);
  const b = doc.indexOf(end);
  if (a < 0 || b < a) {
    console.error('STATISTICS.md has no statistics-validation block.');
    process.exit(1);
  }
  writeFileSync(
    file,
    `${doc.slice(0, a + begin.length)}\n\n${table(results)}\n\n${doc.slice(b)}`
  );
  console.log('Wrote STATISTICS.md');
}
process.exit(failed.length ? 1 : 0);
