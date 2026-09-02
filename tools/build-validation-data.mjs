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
// =============================================================================

import { writeFile, readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runChecks } from './physics-checks.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.join(ROOT, 'validation', 'data.json');

const pkg = JSON.parse(await readFile(path.join(ROOT, 'package.json'), 'utf8'));

const started = Date.now();
const checks = await runChecks();
const elapsedMs = Date.now() - started;

const passed = checks.filter(c => c.pass).length;
const failed = checks.length - passed;

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
