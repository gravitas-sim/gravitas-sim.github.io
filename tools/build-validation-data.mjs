#!/usr/bin/env node
// =============================================================================
// npm run validation:data
// -----------------------------------------------------------------------------
// Runs the validation suite and writes validation/data.json, which is what the
// /validation/ page loads on first paint.
//
// The page can also run the whole suite live in a worker, and the button that
// does so is the point of the page. This file exists so the page has numbers to
// show before anyone presses it, and so those numbers carry provenance: when
// they were produced and against which version. A results table with no date on
// it is an assertion, not a measurement.
//
// Committed rather than generated on deploy, because the site is static and
// GitHub Pages runs no build of its own.
//
//   --check   compare the committed file against the suite as it is now, and
//             fail if it describes a different one. Nothing did that, and the
//             file drifted to 135 checks in four kinds while the suite reached
//             243 in five - so the published page told every reader the engine
//             had been checked 135 times, and the number in the documentation
//             that everyone kept correcting was a quotation of this file.
// =============================================================================

import { writeFile, readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runChecks } from './physics-checks.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.join(ROOT, 'validation', 'data.json');

const pkg = JSON.parse(await readFile(path.join(ROOT, 'package.json'), 'utf8'));

const CHECK_ONLY = process.argv.includes('--check');

const started = Date.now();
const checks = await runChecks();
const elapsedMs = Date.now() - started;

const passed = checks.filter(c => c.pass).length;
const failed = checks.length - passed;

/** How many of each kind, as the shape a reader is shown. */
const countKinds = list => {
  const by = {};
  for (const c of list) by[c.kind] = (by[c.kind] || 0) + 1;
  return by;
};

if (CHECK_ONLY) {
  let committed;
  try {
    committed = JSON.parse(await readFile(OUT, 'utf8'));
  } catch {
    console.error(
      'validation/data.json is missing. Run `npm run validation:data`.'
    );
    process.exit(1);
  }
  const was = countKinds(committed.checks || []);
  const now = countKinds(checks);
  const same =
    (committed.checks || []).length === checks.length &&
    JSON.stringify(Object.entries(was).sort()) ===
      JSON.stringify(Object.entries(now).sort());
  if (!same) {
    console.error(
      [
        'validation/data.json describes a different suite from the one that ran.',
        `  committed: ${(committed.checks || []).length} checks  ${JSON.stringify(was)}`,
        `  now:       ${checks.length} checks  ${JSON.stringify(now)}`,
        '',
        'The /validation/ page paints from this file, so a stale one is a wrong',
        'number on a published page. Run `npm run validation:data` and commit it.',
      ].join('\n')
    );
    process.exit(1);
  }
  console.log(
    `validation/data.json is current: ${checks.length} checks, ` +
      Object.entries(now)
        .map(([k, n]) => `${n} ${k}`)
        .join(', ')
  );
  process.exit(failed ? 1 : 0);
}

await mkdir(path.dirname(OUT), { recursive: true });
await writeFile(
  OUT,
  JSON.stringify(
    {
      // Date only. A timestamp to the second implies the numbers change that
      // often, and they do not: they change when the physics does.
      generatedAt: new Date().toISOString().slice(0, 10),
      version: pkg.version,
      passed,
      failed,
      elapsedMs,
      checks,
    },
    null,
    1
  ) + '\n'
);

console.log(
  `validation/data.json: ${checks.length} checks, ${passed} passed, ${failed} failed, ${(elapsedMs / 1000).toFixed(1)}s`
);
process.exit(failed ? 1 : 0);
