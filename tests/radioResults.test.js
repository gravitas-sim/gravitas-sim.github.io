// =============================================================================
// The HI spectroscopy validation contract and its pinned results (Prompt 241)
// -----------------------------------------------------------------------------
// tests/fixtures/radio/thresholds.json fixed every bound before the kernel existed.
// tools/radio-validate.mjs judges the kernel against it (about five seconds of
// Node); this runs it in a child process and holds the table against the pinned
// results.json and failed-legs.json. A leg that crosses its bound stays in
// failed-legs.json; only Carl resets a bound.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { URL } from 'node:url';

const read = rel =>
  JSON.parse(readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8'));
const THR = read('tests/fixtures/radio/thresholds.json');
const RESULTS = read('tests/fixtures/radio/results.json');
const FAILED = read('tests/fixtures/radio/failed-legs.json');

describe('the committed legs and their pinned results', () => {
  test('every committed check has a row and no row is uncommitted', () => {
    expect(RESULTS.rows.map(r => r.id).sort()).toEqual(
      THR.checks.map(c => c.id).sort()
    );
  });
  test('the failed-legs file is exactly the failing rows, each with its reason', () => {
    expect(FAILED.legs.map(l => l.id).sort()).toEqual(
      RESULTS.rows
        .filter(r => r.status === 'fail')
        .map(r => r.id)
        .sort()
    );
    for (const l of FAILED.legs) expect(l.note.length).toBeGreaterThan(40);
  });
  test('only the legs the thresholds call reported or that wait for a file are not judged', () => {
    expect(
      RESULTS.rows
        .filter(r => r.status !== 'pass' && r.status !== 'fail')
        .map(r => `${r.id}:${r.status}`)
        .sort()
    ).toEqual([
      'B7.publishedTangent:not-run',
      'C3.coverageDetail:reported',
      'E1.packContract:not-run',
      'R1.opacityOnEdge:reported',
      'R2.streaming:reported',
    ]);
  });
  test('the thresholds file records its amendments with the reason, before any result', () => {
    expect(THR.amendments.map(a => a.id).sort()).toEqual([
      'AM1',
      'AM2',
      'AM3',
      'AM4',
      'AM5',
    ]);
    for (const a of THR.amendments)
      expect(a.when).toMatch(/before any validator run/);
  });
  test('the committed rule limits the two atomic constants and forbids other typed numbers', () => {
    expect(THR.rule).toMatch(/from memory/);
    expect(THR.rule).toMatch(/not verified by a fetch/);
    expect(THR.rule).toMatch(/fixed longitude mask/);
  });
  test("the committed mask and edge rule are the kernel's", async () => {
    const K = await import('../js/kernels/radio/index.js');
    expect(THR.synthetic.mask.firstQuadrantDeg).toEqual([
      ...K.MASK.firstQuadrant,
    ]);
    expect(THR.synthetic.mask.fourthQuadrantDeg).toEqual([
      ...K.MASK.fourthQuadrant,
    ]);
    expect(THR.edgeRule).toMatchObject({
      f: K.EDGE_RULE.f,
      runChannels: K.EDGE_RULE.runChannels,
      outerSigma: K.EDGE_RULE.outerSigma,
      windowSigmaV: K.EDGE_RULE.windowSigmaV,
      significanceSigma: K.EDGE_RULE.significanceSigma,
      separableSigmaV: K.EDGE_RULE.separableSigmaV,
      floorFraction: K.EDGE_RULE.floorFraction,
      outerFraction: K.EDGE_RULE.outerFraction,
    });
    expect(THR.uncertainty.tauShape).toBe(K.SHAPE_TERM);
  });
});

describe('the validator reproduces the pinned table', () => {
  const run = () =>
    JSON.parse(
      execFileSync(process.execPath, ['tools/radio-validate.mjs', '--json'], {
        cwd: new URL('..', import.meta.url).pathname,
        encoding: 'utf8',
        maxBuffer: 1 << 26,
        stdio: ['ignore', 'pipe', 'ignore'],
      })
    );
  const live = (() => {
    try {
      return run();
    } catch (e) {
      // the validator exits 1 while a leg fails (left failing, labelled); its output is still the table
      return JSON.parse(e.stdout);
    }
  })();
  test('every status equals its pinned status (the CPU-time figure is recorded, not compared)', () => {
    expect(
      live
        .filter(r => r.id !== '_cpu')
        .map(r => `${r.id}:${r.status}`)
        .sort()
    ).toEqual(RESULTS.rows.map(r => `${r.id}:${r.status}`).sort());
  });
  test('only the legs in failed-legs.json fail', () => {
    expect(
      live
        .filter(r => r.status === 'fail')
        .map(r => r.id)
        .sort()
    ).toEqual(FAILED.legs.map(l => l.id).sort());
  });
});
