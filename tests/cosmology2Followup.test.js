// =============================================================================
// The Cosmology II follow-up legs and their pinned results (Prompt 255b)
// -----------------------------------------------------------------------------
// tests/fixtures/cosmology2/followup-thresholds.json committed four new legs (A7b, B1b, B3b, F3b) and the rule
// that sets their bounds before any code of the follow-up existed. The four old legs they replace stay failing
// in failed-legs.json and reproduce to the digit. This holds the pinned follow-up table and runs it live once.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { URL } from 'node:url';
import * as K from '../js/kernels/cosmology/late/index.js';

const read = rel =>
  JSON.parse(readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8'));
const FU = read('tests/fixtures/cosmology2/followup-thresholds.json');
const RES = read('tests/fixtures/cosmology2/followup-results.json');
const OLD = read('tests/fixtures/cosmology2/results.json');
const OLDFAILED = read('tests/fixtures/cosmology2/failed-legs.json');
const FIRST = read('tests/fixtures/cosmology2/followup-first-run.json');

describe('the follow-up legs and their pinned results', () => {
  test('every committed follow-up check has a row and no row is uncommitted', () => {
    expect(RES.rows.map(r => r.id).sort()).toEqual(
      FU.checks.map(c => c.id).sort()
    );
  });
  test('the four follow-up legs pass, and the old four are still failing and untouched', () => {
    expect(RES.rows.map(r => r.status)).toEqual([
      'pass',
      'pass',
      'pass',
      'pass',
    ]);
    expect(OLDFAILED.legs.map(l => l.id)).toEqual([
      'A7.matterOnlyNotFlat',
      'B1.astropyTenSets',
      'B3.oracleAgreesWithItself',
      'F3.hubbleScaling',
    ]);
    expect(OLD.gate.kernelVerdict).toBe('C');
    expect(RES.meta.oldLegsReproduce).toBe(true);
  });
  test('the follow-up verdict is the committed function with the four replaced, and the original stays C', () => {
    expect(Object.entries(FU.gate.verdictFunction.replaces)).toEqual([
      ['A7', 'A7b'],
      ['B1', 'B1b'],
      ['B3', 'B3b'],
      ['F3', 'F3b'],
    ]);
    expect(RES.gate.followupKernelVerdict).toBe('A');
    expect(RES.gate.originalKernelVerdict).toBe('C');
    expect(RES.gate.productVerdict).toMatch(/NOT ESTABLISHED/);
    expect(RES.gate.consumers).toMatch(/^unmet/);
  });
  test('no bound is read from an old measurement: every limit equals an old committed bound or is a stated fraction', () => {
    const old = id =>
      read('tests/fixtures/cosmology2/thresholds.json').checks.find(c =>
        c.id.startsWith(`${id}.`)
      ).limits;
    const f = id => FU.checks.find(c => c.id.startsWith(`${id}.`)).limits;
    expect(f('A7b').maxRel).toBe(old('A7').maxRel);
    expect(f('B1b').maxRel).toBe(old('B1').maxRel);
    expect(f('B1b').maxAbsMu).toBe(old('B1').maxAbsMu);
    expect(f('B3b').maxRel).toBe(old('B3').maxRel);
    expect(f('F3b').maxAbsLogSlope).toBe(old('F3').maxAbsLogSlope);
    expect(f('F3b').maxRelSlope).toBe(old('F2').maxRelSlope);
    expect(FU.ruleForBounds).toMatch(/No bound of a new leg is read from a measurement/);
  });
  test('the first run of the follow-up validator is kept: B3b failed on an implementation slip', () => {
    expect(FIRST.rows.filter(r => r.status === 'fail').map(r => r.id)).toEqual([
      'B3b.oracleAgreesWhereAstropyIsConsistent',
    ]);
    expect(FU.amendments).toEqual([]);
  });
  test('the rule excludes astropy rows, not geometry: under half the age rows, and the own quadrature is consistent', () => {
    for (const id of ['B1b', 'B3b']) {
      const m = RES.rows.find(r => r.id.startsWith(`${id}.`)).measured;
      expect(m.ageRowsExcludedByTheRule / m.ageRows).toBeLessThan(0.5);
      expect(m.oracleOwnIdentityWorst).toBeLessThanOrEqual(1e-10);
    }
  });
});

describe('the opt-in differencing rule', () => {
  const base = { H0: 70, Om: 0.3, w: -1, flat: true };
  const spec = { base, z: 0.3, quantity: 'luminosity', x: 'Om', y: 'H0' };
  test('the default is the five-point rule, unchanged; Richardson is closer to the exact 1/H0 scaling', () => {
    const d = K.quantityAt(base, {}, 0.3, 'luminosity');
    const five = K.degeneracyDirection(spec);
    expect(K.degeneracyDirection({ ...spec, rule: 'five-point' })).toEqual(
      five
    );
    const err = r => Math.abs((r.gradient.dy * 70) / d + 1);
    expect(err(five)).toBeGreaterThan(1e-8);
    expect(
      err(K.degeneracyDirection({ ...spec, rule: 'richardson' }))
    ).toBeLessThan(1e-9);
  });
  test('an unknown rule is refused', () => {
    expect(() => K.degeneracyDirection({ ...spec, rule: 'nope' })).toThrow(
      K.FriedmannDomainError
    );
  });
});

describe('the follow-up validator reproduces the pinned table', () => {
  test('every status and measured number equals the pinned one, and the old legs reproduce', () => {
    const r = JSON.parse(
      execFileSync(
        process.execPath,
        ['tools/cosmology2-followup.mjs', '--json'],
        {
          cwd: new URL('..', import.meta.url).pathname,
          encoding: 'utf8',
          maxBuffer: 1 << 26,
        }
      )
    );
    expect(r.rows).toEqual(RES.rows);
    expect(r.gate).toEqual(RES.gate);
    expect(r.meta.oldLegsReproduce).toBe(true);
  }, 300000);
});
