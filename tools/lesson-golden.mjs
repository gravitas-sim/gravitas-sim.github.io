#!/usr/bin/env node
// =============================================================================
// npm run lesson:golden -- --regenerate-lesson-golden
// -----------------------------------------------------------------------------
// Rewrites tests/lessonGolden/fixtures/ (the Node half) from the engine as it
// is now. Refuses unless asked by name, because a golden that is regenerated
// on a whim stops being a golden: rerecording is how a behavior change gets
// accepted, so it is done on purpose, in its own commit, with the diff read.
//
//   npm run lesson:coverage -- --write            first, when lessons changed
//   npm run lesson:golden -- --regenerate-lesson-golden
//   npm run lesson:golden:dom -- --regenerate-lesson-golden   (the DOM half)
// =============================================================================

import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { recordAll } from '../tests/lessonGolden/record.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const NODE_DIR = 'tests/lessonGolden/fixtures/node';
export const FLAG = '--regenerate-lesson-golden';

export const fixtureName = key => `${key.replace(/[/:]/g, '.')}.json`;

export const readCoverage = () =>
  JSON.parse(
    readFileSync(path.join(ROOT, 'tests/lessonGolden/coverage.json'), 'utf8')
  );

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (!process.argv.includes(FLAG)) {
    console.error(
      `Refusing to rerecord the lesson golden. Pass ${FLAG} to say you mean it:\n` +
        'a rerecording accepts every difference between the golden and the engine.'
    );
    process.exit(2);
  }
  const all = await recordAll(readCoverage());
  const dir = path.join(ROOT, NODE_DIR);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const write = (key, value) =>
    writeFileSync(
      path.join(dir, fixtureName(key)),
      JSON.stringify(value, null, 1) + '\n'
    );
  for (const [k, v] of Object.entries(all.lessons)) write(k, v);
  for (const [k, v] of Object.entries(all.activities))
    write(`activity:${k}`, v);
  console.log(
    `recorded ${Object.keys(all.lessons).length} lesson and ` +
      `${Object.keys(all.activities).length} activity fixtures in ${NODE_DIR}`
  );
}
