// =============================================================================
// The visual-binary branch of Prompt 218 (Part B, the gate and the build)
// -----------------------------------------------------------------------------
// The contract of tests/fixtures/visual-binary/thresholds.json, committed before the
// kernel existed. The quick legs (analytic, the independent oracle's pinned two-body
// photocentre and solution) run live through tools/visual-binary-validate.mjs in a
// child process. The ensemble legs (coverage, refusals) take about a CPU-minute and a
// half, so their table is pinned in tests/fixtures/visual-binary/results.json and held
// here against failed-legs.json. The panel's numbers that the advanced steps state are
// recomputed from js/visualBinaryField.js over the kernel.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
// The shared modules first: Jest's VM loses a module several imports link at once.
import '../js/measure/orbit-fit.js';
import {
  CONTRACT,
  RULES,
  companionRoots,
  photocentreFactor,
  photocentreFunction,
  plugInSum,
} from '../js/measure/visualBinary.js';
import { PAIRS, truthOf, visualView } from '../js/visualBinaryField.js';
import { WEIGHING_THE_STARS_DEEPER as DEEP } from '../js/data/investigations/binary-masses-sequence.js';

const read = f => JSON.parse(readFileSync(f, 'utf8'));
const THR = read('tests/fixtures/visual-binary/thresholds.json');
const FAILED = read('tests/fixtures/visual-binary/failed-legs.json');
const PINNED = read('tests/fixtures/visual-binary/results.json');

describe('the committed thresholds', () => {
  test('every leg of the contract is present, the amendments are the two recorded', () => {
    expect(THR.checks.map(c => c.id)).toEqual([
      'A1.keplerClosed',
      'A2.photocentreIdentities',
      'A3.massFunctionRoundTrip',
      'A4.frameFactor',
      'B1.twoBodyPhotocentre',
      'B2.oracleSolution',
      'B3.oracleSelf',
      'C1.coverageSum',
      'C2.coverageFraction',
      'C3.coverageMasses',
      'C4.coveragePhotocentreCompanion',
      'C5.sumBias',
      'D1.noParallax',
      'D2.noFrame',
      'D3.weakParallax',
      'D4.shortArc',
      'D5.oneComponent',
      'D6.badFraction',
      'D7.noLight',
      'D8.bothRoots',
      'D9.relativeParallax',
      'D10.naivePhotocentre',
      'E1.authentic',
      'P1.speed',
    ]);
    expect(THR.amendments.map(a => a.id)).toEqual(['AM1', 'AM2']);
    expect(RULES.draws).toBe(20000);
  });

  test('the panel systems are the gate systems', () => {
    for (const [k, name] of ['V1', 'V2', 'V3'].entries()) {
      const g = THR.systems[name];
      const p = PAIRS[k];
      for (const key of [
        'MA',
        'MB',
        'P',
        'e',
        'i',
        'Omega',
        'omega',
        'T',
        'lB',
      ])
        expect(p[key]).toBe(g[key]);
      expect(p.parallaxMas).toBe(g.parallaxMas);
    }
  });
});

describe('the pinned validation table', () => {
  test('verdict A, every judged row passes, only E1 is not run', () => {
    expect(PINNED.verdict.verdict).toBe('A');
    expect(PINNED.verdict.photocentreCompanionOffered).toBe(true);
    expect(FAILED.failed).toEqual([]);
    expect(FAILED.notRun.map(r => r.id)).toEqual(['E1.authentic']);
    const judged = PINNED.rows.filter(r => r.pass !== null);
    expect(judged.every(r => r.pass === true)).toBe(true);
    expect(PINNED.rows.map(r => r.id)).toEqual(
      expect.arrayContaining([
        'C1.coverageSum',
        'C2.coverageFraction',
        'D8.bothRoots',
      ])
    );
  });

  test('the quick legs re-run live: analytic and oracle', () => {
    const out = execFileSync(
      process.execPath,
      ['tools/visual-binary-validate.mjs', '--only=A,B', '--json'],
      { encoding: 'utf8', timeout: 120000 }
    );
    const rows = JSON.parse(out).rows;
    expect(rows.map(r => r.id)).toEqual([
      'A1.keplerClosed',
      'A2.photocentreIdentities',
      'A3.massFunctionRoundTrip',
      'A4.frameFactor',
      'B1.twoBodyPhotocentre',
      'B2.sum',
      'B2.fraction',
      'B3.oracleSelf',
    ]);
    expect(rows.every(r => r.pass === true)).toBe(true);
  });
});

describe('the kernel’s arithmetic', () => {
  test('the closed case and the photocentre contract', () => {
    expect(plugInSum(0.1, 1, 0.1)).toBeCloseTo(1.0000378, 6);
    expect(photocentreFactor(0.4, 0.1)).toBeCloseTo(-0.3, 15);
    expect(photocentreFactor(0.4, 0)).toBeCloseTo(-0.4, 15);
    expect(photocentreFactor(0.4, 0.4)).toBe(0);
    // l = 0: the astrometric mass function M2^3 / (M1 + M2)^2
    expect(photocentreFunction(0.9, 0.6, 0)).toBeCloseTo(
      0.6 ** 3 / 1.5 ** 2,
      14
    );
    expect(CONTRACT.photocentre).toMatch(/l − B/);
  });

  test('a companion has two roots when f is below M1 l^3, one otherwise', () => {
    const f = photocentreFunction(1.0, 0.5, 0.6);
    const roots = companionRoots(f, 1.0, 0.6);
    expect(roots.map(r => r.side)).toEqual(['above', 'below']);
    expect(roots[1].B).toBeCloseTo(1 / 3, 9);
    expect(roots[1].M2).toBeCloseTo(0.5, 9);
    expect(companionRoots(0.5, 1.0, 0.02)).toHaveLength(1);
    expect(companionRoots(0, 1, 0.1)).toEqual([]);
  });
});

describe('the panel and the numbers the advanced steps state', () => {
  const step = sid => DEEP.steps.find(s => s.sid === sid);

  test('the photocentre of system A is 0.30 of the pair’s ellipse', () => {
    const m = visualView({ system: 0, view: 1 });
    expect(m.result.ok).toBe(true);
    const ratio = m.result.orbit.elements.a.value / m.truth.aArcsec;
    expect(ratio).toBeCloseTo(0.3, 2);
    expect(m.result.orbit.elements.a.value).toBeCloseTo(0.09, 3);
    expect(m.truth.aArcsec).toBeCloseTo(0.3, 3);
    expect(Math.abs(m.truth.factor)).toBeCloseTo(0.3, 12);
    expect(step('how-small-is-the-photocentre').answer).toBe(0);
  });

  test('the resolved pair A: B and the sum as the measure step reads them', () => {
    const m = visualView({ system: 0, view: 0 });
    const r = m.result;
    expect(r.ok && r.fraction.ok && r.sum.ok).toBe(true);
    expect(r.fraction.value).toBeCloseTo(0.4004, 3);
    expect(Math.abs(r.fraction.value - m.truth.B)).toBeLessThan(
      3 * r.fraction.sigma
    );
    expect(r.sum.value).toBeCloseTo(1.309, 3);
    expect(
      step('weigh-a-visual-pair').validate({
        b: r.fraction.value,
        s: r.sum.value,
      }).level
    ).toBe('ok');
    expect(step('weigh-a-visual-pair').validate({ b: 0.5, s: 1.3 }).level).toBe(
      'error'
    );
    expect(r.masses.M1.value + r.masses.M2.value).toBeCloseTo(r.sum.value, 9);
  });

  test('pair B, one photocentre: a tiny orbit and two roots, the first the truth', () => {
    const m = visualView({ system: 1, view: 1 });
    const c = m.result.companion;
    expect(c.ok).toBe(true);
    expect(c.roots).toHaveLength(2);
    expect(c.roots[0].M2).toBeCloseTo(0.979, 2);
    expect(c.roots[1].M2).toBeCloseTo(0.525, 2);
    expect(c.roots[1].flag).toBe('ambiguous-root');
    expect(m.result.orbit.elements.a.value).toBeCloseTo(0.031, 3);
    expect(m.truth.aArcsec).toBeCloseTo(0.41, 2);
    expect(Math.abs(c.roots[0].M2 - m.truth.MB)).toBeLessThan(0.05);
    expect(truthOf(1).MB).toBe(1.0);
  });

  test('the refusals reach the panel: a short arc gives words and no numbers', () => {
    const m = visualView({ system: 0, view: 0, arc: 0.3 });
    expect(m.result.ok).toBe(false);
    expect(m.result.message).toMatch(/period/);
    expect(m.result.sum).toBeUndefined();
  });
});
