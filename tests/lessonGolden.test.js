import { describe, test, expect } from '@jest/globals';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { derive, ENGINE_PATHS, withTable } from '../tools/lesson-coverage.mjs';
import { recordAll } from './lessonGolden/record.mjs';
import { NODE_DIR, fixtureName } from '../tools/lesson-golden.mjs';

// =============================================================================
// The lesson-engine golden (Roadmap III, Prompt 138)
// -----------------------------------------------------------------------------
// js/investigations.js is about to be cut into seams (Prompt 139). This holds
// what the engine does today - grading, saved progress, backups, the evidence
// ledger, submission tokens, assignments and their pins - for the smallest set
// of investigations and activity cuts that exercises every branch, in English
// and Spanish. A seam that moves behavior fails here with a diff.
//
// To accept a change on purpose: npm run lesson:golden -- --regenerate-lesson-golden
// =============================================================================

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));

describe('the coverage table', () => {
  test('is what the lessons and activities derive today', async () => {
    const derived = JSON.parse(JSON.stringify(await derive()));
    expect(read('tests/lessonGolden/coverage.json')).toEqual(derived);
  });

  test('is the table in docs/LESSON_GOLDEN.md', async () => {
    const doc = readFileSync(path.join(ROOT, 'docs/LESSON_GOLDEN.md'), 'utf8');
    expect(doc).toBe(withTable(doc, await derive()));
  });

  test('covers more than eight investigations and names every engine path', () => {
    const cov = read('tests/lessonGolden/coverage.json');
    expect(cov.lessons.length).toBeGreaterThan(8);
    expect(cov.activities.length).toBeGreaterThan(0);
    expect(cov.enginePaths).toEqual([...ENGINE_PATHS]);
  });
});

describe('the Node golden', () => {
  const cov = read('tests/lessonGolden/coverage.json');
  const dir = path.join(ROOT, NODE_DIR);
  let all;

  test('has exactly the fixtures the coverage table names', () => {
    const want = [
      ...cov.lessons.flatMap(id =>
        ['en', 'es'].map(l => fixtureName(`${id}:${l}`))
      ),
      ...cov.activities.map(c => fixtureName(`activity:${c}`)),
    ].sort();
    expect(readdirSync(dir).sort()).toEqual(want);
  });

  test('matches the engine as it is now', async () => {
    all = await recordAll(cov);
    const wrong = [];
    for (const [key, value] of Object.entries(all.lessons)) {
      const have = read(`${NODE_DIR}/${fixtureName(key)}`);
      if (JSON.stringify(have) !== JSON.stringify(value)) wrong.push(key);
    }
    for (const [key, value] of Object.entries(all.activities)) {
      const have = read(`${NODE_DIR}/${fixtureName(`activity:${key}`)}`);
      if (JSON.stringify(have) !== JSON.stringify(value)) wrong.push(key);
    }
    expect(wrong).toEqual([]);
  }, 120000);
});
