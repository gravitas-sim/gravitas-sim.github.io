// =============================================================================
// The recorded results of the Part B gate spike (Prompt 251, LENSING_DELAYS_GATE.md)
// -----------------------------------------------------------------------------
// The prototype (the delay model, the conditional Hubble constant, the rho search and the blend profile) lives
// on spike/lensing-delays-gate, which is never merged; this pull request carries only what it measured against
// the committed thresholds and the pinned oracle numbers. These tests hold the record: every leg has a row, a
// failing leg is in the failed-legs file, the verdict is the committed function of the rows, the amendments
// were recorded before the run and moved no bound, and no prototype code is in this tree.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { existsSync, readFileSync } from 'node:fs';
import { URL } from 'node:url';

const read = rel => JSON.parse(readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8'));
const GATE = read('tests/fixtures/lensing2/gate-thresholds.json');
const SPIKE = read('tests/fixtures/lensing2/gate-spike-results.json');
const FAILED = read('tests/fixtures/lensing2/gate-spike-failed-legs.json');
const FINITE = read('tests/fixtures/lensing2/oracle-finite.json');

const protoIds = GATE.checks.filter(c => c.leg === 'prototype' || c.leg === 'data').map(c => c.id);

describe('the recorded gate spike', () => {
  test('every prototype and data leg has one row, in committed order', () => {
    expect(SPIKE.rows.map(r => r.id).sort()).toEqual([...protoIds].sort());
  });
  test('G6 and G9 are not run: nothing was fetched', () => {
    for (const id of ['G6.', 'G9.'])
      expect(SPIKE.rows.find(r => r.id.startsWith(id)).status).toBe('not-run');
  });
  test('the failed-legs file is exactly the failing rows, each with its measured numbers', () => {
    expect(FAILED.legs.map(l => l.id).sort()).toEqual(
      SPIKE.rows.filter(r => r.status === 'fail').map(r => r.id).sort()
    );
    for (const l of FAILED.legs)
      expect(l.measured).toEqual(SPIKE.rows.find(r => r.id === l.id).measured);
  });
  test('the verdict is the committed function of the rows', () => {
    const st = p => SPIKE.rows.find(r => r.id.startsWith(`${p}.`)).status;
    const ok = l => l.every(p => st(p) === 'pass');
    const bDelay = ok(['G1', 'G2', 'G3', 'G4', 'G5']);
    const bFinite = ok(['G7', 'G8']);
    const a = bDelay && bFinite && ok(['G6', 'G9']);
    expect(SPIKE.verdict.verdict).toBe(a ? 'A' : bDelay || bFinite ? 'B' : 'C');
    expect(SPIKE.verdict.bDelay).toBe(bDelay);
    expect(SPIKE.verdict.bFinite).toBe(bFinite);
    expect(GATE.verdicts.A).toMatch(/G6 and G9 have data/);
  });
  test('the spike is a recorded commit on a branch that is not merged, and its code is not in this tree', () => {
    expect(SPIKE.spike.branch).toBe('spike/lensing-delays-gate');
    expect(SPIKE.spike.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(existsSync(new URL('../js/kernels/lensing/enclosed/delays.js', import.meta.url))).toBe(false);
    expect(existsSync(new URL('../js/kernels/lensing/enclosed/finiteFit.js', import.meta.url))).toBe(false);
  });
  test('the amendments were recorded before the run and moved no bound', () => {
    expect(GATE.amendments.map(a => a.id)).toEqual(['AM1', 'AM2', 'AM3']);
    for (const a of GATE.amendments) {
      expect(a.when).toBe('before any prototype run');
      expect(a.boundMoved).toBe(false);
    }
  });
  test('the first run is kept on record beside the second', () => {
    expect(SPIKE.run1.rows.length).toBe(SPIKE.rows.length);
    expect(SPIKE.run1.note).toMatch(/optimiser/);
  });
  test('the independent fit of the G7 events agrees with the pinned integral and is real', () => {
    expect(FINITE.selfCheckWorstRelVsQuad).toBeLessThan(1e-8);
    expect(FINITE.fits.length).toBe(200);
    expect(FINITE.versions.scipy).toBeTruthy();
  });
});
