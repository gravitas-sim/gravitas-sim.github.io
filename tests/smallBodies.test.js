// =============================================================================
// The small-body kernel (Prompt 198)
// -----------------------------------------------------------------------------
// tests/fixtures/small-bodies/thresholds.json fixed every bound before
// js/kernels/smallbodies/ had been run. tools/small-bodies-validate.mjs runs them in
// plain Node (Jest's VM makes Math reads about ten times slower, so the ensembles
// here would time the harness); this file runs it, holds every row to its bound
// (the legs that fail as committed are held to tests/fixtures/small-bodies/
// failed-legs.json) and adds what needs no ensemble: worked examples, the refusals,
// the words a lesson must carry, and the inputs that were not run (a real catalog,
// a measured light curve).
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  BELT_DEFAULTS,
  DEFAULT_GAPS,
  JUPITER_RESONANCES,
  NEPTUNE_RESONANCES,
  SELECTION_ASSUMES,
  axisRatioBound,
  amplitudeMag,
  classifyOrbit,
  countClasses,
  gapDepth,
  gapSurvey,
  histogram,
  nightlyTimes,
  resonanceAxis,
  rotationFromLightCurve,
  synthLightCurve,
  syntheticBelt,
} from '../js/kernels/smallbodies/index.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const json = f => JSON.parse(readFileSync(path.join(ROOT, f), 'utf8'));
const THRESHOLDS = json('tests/fixtures/small-bodies/thresholds.json');
const FAILED = json('tests/fixtures/small-bodies/failed-legs.json').legs;

// The full run (the ensembles, four minutes on two processes) is `npm run
// small-bodies:validate -- --record`, which writes record.json. This suite reruns the
// quick groups (the analytic, oracle and refusal rows and the real-catalog rows, about
// twenty seconds) live and holds them to that record, and holds the record to the
// thresholds and to the failed legs.
const RECORD = json('tests/fixtures/small-bodies/record.json').rows;
const run = group =>
  JSON.parse(
    spawnSync(
      process.execPath,
      [
        path.join(ROOT, 'tools/small-bodies-validate.mjs'),
        '--json',
        `--group=${group}`,
      ],
      { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 25 }
    ).stdout
  );

describe('the committed thresholds hold for the production module', () => {
  const live = [...run('fast'), ...run('authentic')];

  test('every live row passes but the recorded ones, and the inputs not run say so', () => {
    for (const r of live) {
      if (r.pass === null || FAILED[r.id]) continue;
      if (r.pass !== true)
        throw new Error(
          `${r.id}: ${r.measured} against ${JSON.stringify(r.bound)}`
        );
    }
    expect(live.filter(r => r.pass === null).map(r => r.id)).toEqual([
      'e1.cited',
      'e2.lightcurve',
    ]);
  });

  test('the live rows are the record: the same pass flags and the same numbers', () => {
    for (const r of live) {
      const rec = RECORD.find(x => x.id === r.id);
      expect([r.id, rec !== undefined]).toEqual([r.id, true]);
      expect([r.id, r.pass]).toEqual([r.id, rec.pass]);
      if (r.measured !== null)
        expect(Math.abs(r.measured - rec.measured)).toBeLessThanOrEqual(
          1e-9 * (1 + Math.abs(rec.measured))
        );
    }
  });

  test('the record holds every row but the recorded legs, and the legs fail in their range', () => {
    const failing = RECORD.filter(r => r.pass === false).map(r => r.id);
    expect([...failing].sort()).toEqual(Object.keys(FAILED).sort());
    for (const [id, leg] of Object.entries(FAILED)) {
      const r = RECORD.find(x => x.id === id);
      expect(r.measured).toBeGreaterThanOrEqual(leg.measuredRange[0]);
      expect(r.measured).toBeLessThanOrEqual(leg.measuredRange[1]);
      expect(r.bound).toEqual(leg.bound);
    }
  });

  test('every check the thresholds name is run, or declared not run', () => {
    const ids = RECORD.map(r => r.id);
    for (const id of Object.keys(THRESHOLDS.checks)) {
      const head = id.split('.')[0];
      expect(ids.some(r => r === id || r.startsWith(`${head}.`))).toBe(true);
    }
  });

  test('the record is a full run', () => {
    expect(RECORD.length).toBeGreaterThanOrEqual(100);
    expect(RECORD.some(r => r.id.startsWith('c3.noise0.03'))).toBe(true);
  });
});

describe('resonance locations', () => {
  test('the Kirkwood gaps sit where Kepler puts them', () => {
    const at = id => JUPITER_RESONANCES.find(r => r.id === id).aAu;
    expect(at('4:1')).toBeCloseTo(2.065, 3);
    expect(at('3:1')).toBeCloseTo(2.5013, 4);
    expect(at('5:2')).toBeCloseTo(2.8246, 4);
    expect(at('7:3')).toBeCloseTo(2.9575, 4);
    expect(at('2:1')).toBeCloseTo(3.2776, 4);
    expect(at('3:2')).toBeCloseTo(3.9705, 4);
    expect(at('1:1')).toBeCloseTo(5.202887, 6);
  });

  test('the plutinos are 3:2 with Neptune, the bodies being the outer ones', () => {
    const pl = NEPTUNE_RESONANCES.find(r => r.name === 'the plutinos');
    expect(pl.aAu).toBeCloseTo(39.402, 3);
    expect(pl.body).toBe('outer');
    expect(pl.periodRatio).toBeCloseTo(1.5, 12);
  });

  test('an invalid argument is NaN, never a number', () => {
    expect(resonanceAxis(-1, { inner: 3, outer: 1 })).toBeNaN();
    expect(resonanceAxis(5.2, { inner: 0, outer: 1 })).toBeNaN();
    expect(resonanceAxis(5.2, { inner: 3, outer: 1, body: 'both' })).toBeNaN();
  });
});

describe('the belts', () => {
  const gaps = DEFAULT_GAPS.map(g => ({ ...g, dmax: 0.8 }));

  test('a histogram counts what is in range and says what is not', () => {
    const h = histogram([2.0, 2.005, 2.015, 3.4999, 3.5, 1.0], {
      lo: 2.0,
      hi: 3.5,
      binWidth: 0.01,
    });
    expect(h.counts.length).toBe(150);
    expect(h.counts[0]).toBe(2);
    expect(h.counts[1]).toBe(1);
    expect(h.counts[149]).toBe(1);
    expect(h.above).toBe(1);
    expect(h.below).toBe(1);
  });

  test('a measured gap carries its window, its interval and its assumptions', () => {
    const belt = syntheticBelt({ n0: 6000, seed: 'unit', gaps });
    const r = gapDepth(belt.a, DEFAULT_GAPS[1], {
      exclude: [
        DEFAULT_GAPS[0],
        DEFAULT_GAPS[2],
        DEFAULT_GAPS[3],
        DEFAULT_GAPS[4],
      ],
      seed: 'unit',
      draws: 100,
    });
    expect(r.status).toBe('ok');
    expect(r.gap.id).toBe('3:1');
    expect(r.gap.verdict).toBe('resolved');
    expect(r.gap.lo).toBeLessThan(r.gap.depletion);
    expect(r.gap.hi).toBeGreaterThan(r.gap.depletion);
    expect(r.method).toBe('case-bootstrap');
    expect(r.assumes.join(' ')).toMatch(/found, not the objects there are/);
  });

  test('a cut too small to show a gap says "not resolved" and why', () => {
    const belt = syntheticBelt({ n0: 150, seed: 'unit-small', gaps });
    const r = gapSurvey(belt.a, { seed: 'unit', draws: 100 });
    const g = r.gaps.find(x => x.id === '3:1');
    expect(g.verdict).toBe('not resolved');
    expect(g.reason).toMatch(/too-few-expected|interval-includes-zero/);
  });

  test('a window on a cliff is flagged and never called resolved', () => {
    const belt = syntheticBelt({
      n0: 8000,
      seed: 'unit-cliff',
      gaps: [],
      cliff: true,
    });
    const r = gapSurvey(belt.a, { seed: 'unit', draws: 100 });
    const g = r.gaps.find(x => x.id === '2:1');
    expect(g.warnings).toContain('steep-baseline');
    expect(g.resolved).toBe(false);
  });

  test('the interval is reproducible from its seed, and a different seed moves it', () => {
    const belt = syntheticBelt({ n0: 4000, seed: 'unit-repeat', gaps });
    const a = gapSurvey(belt.a, { seed: 's1', draws: 50 }).gaps[1];
    const b = gapSurvey(belt.a, { seed: 's1', draws: 50 }).gaps[1];
    const c = gapSurvey(belt.a, { seed: 's2', draws: 50 }).gaps[1];
    expect(a.lo).toBe(b.lo);
    expect(a.hi).toBe(b.hi);
    expect(a.lo).not.toBe(c.lo);
  });

  test('draws of zero gives the point estimate and says no verdict was assessed', () => {
    const belt = syntheticBelt({ n0: 4000, seed: 'unit-point', gaps });
    const g = gapSurvey(belt.a, { draws: 0 }).gaps[1];
    expect(g.lo).toBeNull();
    expect(g.verdict).toBe('not assessed');
    expect(g.depletion).toBeGreaterThan(0.2);
  });

  test('orbit classes are rules, counted without a catalog being called the population', () => {
    expect(classifyOrbit({ a: 2.3, e: 0.1, i: 5 })).toBe('innerMainBelt');
    expect(classifyOrbit({ a: 3.97, e: 0.15, i: 8 })).toBe('hilda');
    expect(classifyOrbit({ a: 5.2, e: 0.05, i: 12 })).toBe('trojan');
    expect(classifyOrbit({ a: 39.4, e: 0.2, i: 12 })).toBe('plutino');
    expect(classifyOrbit({ a: 44, e: 0.05, i: 2 })).toBe('kuiperClassical');
    expect(classifyOrbit({ a: 3.4, e: 0.1, i: 5 })).toBe('other');
    expect(classifyOrbit({ a: NaN, e: 0.1, i: 5 })).toBeNull();
    const t = countClasses([
      { a: 2.3, e: 0.1, i: 5 },
      { a: NaN, e: 0, i: 0 },
    ]);
    expect(t.total).toBe(1);
    expect(t.notFinite).toBe(1);
  });

  test('the defaults are the committed rules', () => {
    expect(BELT_DEFAULTS.baselineDegree).toBe(THRESHOLDS.rules.baselineDegree);
    expect(BELT_DEFAULTS.minExpected).toBe(THRESHOLDS.rules.minExpected);
  });

  test('the selection sentences a lesson must carry say found, not there', () => {
    const text = SELECTION_ASSUMES.join(' ');
    expect(text).toMatch(/found, not the objects there are/);
    expect(text).toMatch(/inward/);
  });
});

describe('a light curve gives a rotation and a bound, never a shape', () => {
  const body = { a: 1.6, b: 1, c: 0.8 };
  const times = nightlyTimes({
    nights: 5,
    hoursPerNight: 7,
    pointsPerNight: 40,
    seed: 'unit',
  });
  const lc = synthLightCurve({ body, thetaDeg: 70, periodHours: 7.3 }, times, {
    noiseMag: 0.01,
    seed: 'unit',
  });

  test('the synthetic curve is labelled and carries its truth', () => {
    expect(lc.truth.synthetic).toBe(true);
    expect(lc.truth.periodHours).toBe(7.3);
    expect(lc.truth.model).toMatch(/triaxial ellipsoid/);
    expect(lc.truth.amplitudeMag).toBeCloseTo(amplitudeMag(body, 70), 12);
  });

  test('the period is twice the peak and the one-maximum alternative is listed', () => {
    const r = rotationFromLightCurve(lc.t, lc.m, { seed: 'unit' });
    expect(r.verdict).toBe('period');
    expect(Math.abs(r.periodHours - 7.3) / 7.3).toBeLessThan(2e-3);
    expect(r.peakPeriodHours).toBeCloseTo(r.periodHours / 2, 1);
    expect(r.alternative.periodHours).toBeCloseTo(r.periodHours / 2, 1);
    expect(r.alternative.assumes).toMatch(/one maximum a rotation/);
  });

  test('the shape is a lower bound on a/b, below the truth at this aspect', () => {
    const r = rotationFromLightCurve(lc.t, lc.m, { seed: 'unit' });
    expect(r.axisRatioBound.claim).toBe('a/b >= value');
    expect(r.axisRatioBound.value).toBeLessThanOrEqual(1.6);
    expect(r.axisRatioBound.value).toBeGreaterThan(1.3);
    expect(r.axisRatioBound.note).toMatch(/lower bound/);
    expect(r.axisRatioBound.note).toMatch(/b\/c/);
    expect(r.assumes.join(' ')).toMatch(/lower bound on a\/b/);
  });

  test('the bound is exact only equator-on', () => {
    expect(axisRatioBound(amplitudeMag(body, 90))).toBeCloseTo(1.6, 12);
    expect(axisRatioBound(amplitudeMag(body, 40))).toBeLessThan(1.45);
  });

  test('a refusal is a record with a code', () => {
    const r = rotationFromLightCurve([0, 1, 2], [0, 1, 0], {});
    expect(r).toMatchObject({ status: 'refused', code: 'too-few' });
  });
});
