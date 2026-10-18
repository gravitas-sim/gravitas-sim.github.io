#!/usr/bin/env node
// =============================================================================
// npm run lesson:golden:dom -- --regenerate-lesson-golden
// -----------------------------------------------------------------------------
// Rerecords the rendered-screen half of the lesson golden
// (tests/lessonGolden/fixtures/dom/) by running e2e/lessonGolden.spec.js in
// record mode on the private port. Refuses unless asked by name, for the
// reason tools/lesson-golden.mjs gives. Takes about seven minutes.
// =============================================================================

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FLAG } from './lesson-golden.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

if (!process.argv.includes(FLAG)) {
  console.error(
    `Refusing to rerecord the lesson golden. Pass ${FLAG} to say you mean it:\n` +
      'a rerecording accepts every difference between the golden and the engine.'
  );
  process.exit(2);
}
const run = spawnSync(
  'npx',
  [
    'playwright',
    'test',
    'e2e/lessonGolden.spec.js',
    '--workers=2',
    '--reporter=line',
  ],
  {
    cwd: ROOT,
    stdio: 'inherit',
    env: {
      ...process.env,
      GRAVITAS_REGENERATE_LESSON_GOLDEN: 'lesson-golden',
      GRAVITAS_E2E_PORT: process.env.GRAVITAS_E2E_PORT || '4391',
    },
  }
);
process.exit(run.status ?? 1);
