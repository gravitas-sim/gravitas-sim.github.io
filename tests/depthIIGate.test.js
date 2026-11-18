// =============================================================================
// Depth II gate: the verdict follows from the committed criteria
// -----------------------------------------------------------------------------
// tests/fixtures/depth-ii/thresholds.json was committed before the prototype;
// results.json holds what the spike measured. This recomputes the verdict and
// the slices from the two, so neither can drift from the other.
// =============================================================================

import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { describe, test, expect } from '@jest/globals';

const read = name =>
  JSON.parse(
    readFileSync(
      new URL(`./fixtures/depth-ii/${name}`, import.meta.url),
      'utf8'
    )
  );
const T = read('thresholds.json');
const R = read('results.json');

const passed = n => R.criteria[String(n)].status === 'pass';

function verdictOf() {
  if (T.verdicts.A.needs.every(passed)) return 'A';
  if (
    T.verdicts.B.needs.every(passed) &&
    T.verdicts.B.andAnyFailedOrNotRun.some(n => !passed(n))
  )
    return 'B';
  return 'C';
}

describe('Depth II gate', () => {
  test('every criterion has a status, and only pass, fail or not run', () => {
    for (const n of Object.keys(T.criteria))
      expect(['pass', 'fail', 'not run']).toContain(R.criteria[n]?.status);
  });

  test('the recorded verdict and slices are the ones the criteria give', () => {
    const v = verdictOf();
    expect(R.verdict).toBe(v);
    expect(R.slices).toEqual(T.verdicts[v].slices);
  });
});
