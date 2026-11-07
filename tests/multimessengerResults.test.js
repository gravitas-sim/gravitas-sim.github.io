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
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { URL } from 'node:url';

const read = rel =>
  JSON.parse(readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8'));
const THR = read('tests/fixtures/multimessenger/thresholds.json');
const RESULTS = read('tests/fixtures/multimessenger/results.json');
const FAILED = read('tests/fixtures/multimessenger/failed-legs.json');
const AUTH = read('tests/fixtures/multimessenger/authentic-thresholds.json');
const AUTH_DIR = 'tests/fixtures/multimessenger/authentic/';
const sha = rel =>
  createHash('sha256')
    .update(readFileSync(new URL(`../${rel}`, import.meta.url)))
    .digest('hex');

describe('the committed legs and their pinned results', () => {
  test('every committed check has a row and no row is uncommitted (C1b is reported inside check C1)', () => {
    expect(
      RESULTS.rows
        .map(r => r.id)
        .filter(id => id !== 'C1b.misspecifiedHostRule')
        .sort()
    ).toEqual(
      [
        ...THR.checks.map(c => c.id),
        ...AUTH.checks.map(c => c.id).filter(id => /^(B2b|B4o|E1b)\./.test(id)),
      ].sort()
    );
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
  test('the authentic follow-up records AM5 to AM7 with the reason, before any run', () => {
    expect(AUTH.amendments.map(a => a.id)).toEqual(['AM5', 'AM6', 'AM7']);
    for (const a of AUTH.amendments)
      expect(a.when).toMatch(/before any validator run/);
  });
  test('the authentic legs: B2, B2b, B4, B4o and E1b pass, E1 and E3 are NOT RUN, none fails', () => {
    const by = Object.fromEntries(RESULTS.rows.map(r => [r.id, r.status]));
    for (const id of [
      'B2.timeAuthentic',
      'B2b.leapListParse',
      'B4.boundPublished',
      'B4o.boundOracle',
      'E1b.onsetDelayFromPacks',
    ])
      expect(by[id]).toBe('pass');
    expect(by['E1.delayFromPacks']).toBe('not-run');
    expect(by['E3.kilonovaReddening']).toBe('not-run');
    expect(FAILED.legs).toEqual([]);
  });
  test('the authentic files are the files Carl supplied, byte for byte, with a SOURCES.json entry each', () => {
    const SRC = read(`${AUTH_DIR}SOURCES.json`);
    for (const f of [
      'leap-seconds.list',
      'published-bound.json',
      'grb-trigger.json',
    ]) {
      expect(sha(`${AUTH_DIR}${f}`)).toBe(AUTH.pins[f]);
      expect(SRC[f].sha256).toBe(AUTH.pins[f]);
    }
    expect(SRC['published-bound-supplement.json'].sha256).toBe(
      sha(`${AUTH_DIR}published-bound-supplement.json`)
    );
    for (const f of [
      'leap-seconds.list',
      'published-bound.json',
      'published-bound-supplement.json',
      'grb-trigger.json',
    ]) {
      expect(SRC[f].source).toMatch(/\w/);
      expect(SRC[f].terms).toMatch(/\w/);
      expect(SRC[f].retrieved).toBe('2026-11-06');
    }
    expect(
      read(`${AUTH_DIR}published-bound-supplement.json`).source.paperTextSha256
    ).toBe(AUTH.pins.paperTextSha256);
  });
  test('the pinned oracle output was made from exactly these files', () => {
    const O = read('tests/fixtures/multimessenger/oracle-published.json');
    for (const f of [
      'leap-seconds.list',
      'published-bound.json',
      'grb-trigger.json',
    ])
      expect(O.inputs[f]).toBe(sha(`${AUTH_DIR}${f}`));
    expect(O.inputs['authentic-thresholds.json']).toBe(
      sha('tests/fixtures/multimessenger/authentic-thresholds.json')
    );
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
