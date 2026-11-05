// =============================================================================
// The multi-messenger validation contract and its pinned results (Prompt 244)
// -----------------------------------------------------------------------------
// tests/fixtures/multimessenger/thresholds.json fixed every bound before the kernel
// existed. tools/multimessenger-validate.mjs judges the kernel against it (about a
// second of Node); this runs it in a child process and holds the table against the
// pinned results.json and failed-legs.json. A leg that crosses its bound stays in
// failed-legs.json; only Carl resets a bound.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { URL } from 'node:url';

const read = rel =>
  JSON.parse(readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8'));
const THR = read('tests/fixtures/multimessenger/thresholds.json');
const RESULTS = read('tests/fixtures/multimessenger/results.json');
const FAILED = read('tests/fixtures/multimessenger/failed-legs.json');

describe('the committed legs and their pinned results', () => {
  test('every committed check has a row and no row is uncommitted (C1b is reported inside check C1)', () => {
    expect(
      RESULTS.rows
        .map(r => r.id)
        .filter(id => id !== 'C1b.misspecifiedHostRule')
        .sort()
    ).toEqual(THR.checks.map(c => c.id).sort());
    expect(THR.checks.find(c => c.id === 'C1.hostCalibration').what).toMatch(
      /C1b/
    );
  });
  test('the failed-legs file is exactly the failing rows', () => {
    expect(FAILED.legs.map(l => l.id).sort()).toEqual(
      RESULTS.rows
        .filter(r => r.status === 'fail')
        .map(r => r.id)
        .sort()
    );
  });
  test('only the legs the thresholds call reported or that wait for a file are not judged', () => {
    expect(
      RESULTS.rows
        .filter(r => r.status !== 'pass' && r.status !== 'fail')
        .map(r => `${r.id}:${r.status}`)
        .sort()
    ).toEqual([
      'B2.timeAuthentic:not-run',
      'B4.boundPublished:not-run',
      'C1b.misspecifiedHostRule:reported',
      'E1.delayFromPacks:not-run',
      'E3.kilonovaReddening:not-run',
      'R1.volumeVsComoving:reported',
    ]);
  });
  test('the thresholds file records its amendments with the reason, before any result', () => {
    expect(THR.amendments.map(a => a.id).sort()).toEqual([
      'AM1',
      'AM2',
      'AM3',
      'AM4',
    ]);
    for (const a of THR.amendments) expect(a.when).toMatch(/before/);
  });
  test('the committed rule names the two messengers and forbids typing published numbers', () => {
    expect(THR.rule).toMatch(/never called messengers/);
    expect(THR.rule).toMatch(/from memory/);
  });
});

describe('the validator reproduces the pinned table', () => {
  const run = () =>
    JSON.parse(
      execFileSync(
        process.execPath,
        ['tools/multimessenger-validate.mjs', '--json'],
        {
          cwd: new URL('..', import.meta.url).pathname,
          encoding: 'utf8',
          maxBuffer: 1 << 26,
        }
      )
    );
  test('every status equals its pinned status (the CPU-time figure is recorded, not compared)', () => {
    const live = run();
    expect(live.map(r => `${r.id}:${r.status}`)).toEqual(
      RESULTS.rows.map(r => `${r.id}:${r.status}`)
    );
  }, 120000);
  test('no committed leg fails', () => {
    expect(run().filter(r => r.status === 'fail')).toEqual([]);
  }, 120000);
});
