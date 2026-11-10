/**
 * The numerics instruments (NUMERICS_INSTRUMENTS.md; the approved follow-up to
 * Prompt 270): the five kernels of js/kernels/numerics/ judged, as the
 * validator judges them, against the pinned oracle output and inputs. No
 * Python and no engine run here: tools/numerics-instruments-validate.mjs
 * produced the fixtures, and this holds the instruments to them.
 */
import { describe, test, expect, beforeAll } from '@jest/globals';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NEVER_PRECACHED } from '../tools/build-service-worker.mjs';
import {
  runInstruments,
  judge,
  SUPERSEDED,
} from '../tools/numerics-instruments-validate.mjs';
import {
  twoStep,
  ledger,
  keplerPair,
  LEDGER_SCHEMES,
} from '../js/kernels/numerics/ledger.js';
import { stepHistory } from '../js/kernels/numerics/stepHistory.js';
import { ensembleRate } from '../js/kernels/numerics/divergenceRate.js';
import { fourierPeriodogram } from '../js/kernels/numerics/dft.js';
import { heldOut } from '../js/kernels/numerics/interpError.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = f => readFileSync(path.join(REPO, f), 'utf8');
const fixture = n =>
  JSON.parse(read(`tests/fixtures/numerics-instruments/${n}.json`));
const walk = dir =>
  readdirSync(path.join(REPO, dir)).flatMap(n => {
    const rel = `${dir}/${n}`;
    return statSync(path.join(REPO, rel)).isDirectory()
      ? walk(rel)
      : rel.endsWith('.js')
        ? [rel]
        : [];
  });

const thresholds = fixture('thresholds');
const pinned = fixture('results');
const first = fixture('first-run-results');
const FAILING = ['I1.ds', 'I1.i', 'I2.b', 'I4.a'];

describe('the contract', () => {
  test('five instruments, each with its legs, and two amendments that move no bound', () => {
    expect(Object.keys(thresholds.instruments)).toEqual([
      'I1',
      'I2',
      'I3',
      'I4',
      'I5',
    ]);
    expect(thresholds.amendments.map(a => a.id)).toEqual(['AM1', 'AM2']);
    const committed = Object.values(thresholds.instruments).flatMap(i =>
      i.legs.map(l => l.id)
    );
    // Every committed leg has a row, and every other row is an AM2 successor.
    const ids = pinned.rows.map(r => r.id);
    for (const id of committed) expect(ids).toContain(id);
    const am2 = thresholds.amendments[1];
    const successors = ['I1', 'I2', 'I4'].flatMap(k =>
      am2[k].legs.map(l => l.id)
    );
    expect(ids.filter(id => !committed.includes(id)).sort()).toEqual(
      successors.slice().sort()
    );
    expect(['I1', 'I2', 'I4'].flatMap(k => am2[k].superseded).sort()).toEqual(
      SUPERSEDED.slice().sort()
    );
  });

  test('the first run is pinned: three failed legs, verdict B, and it holds no successor', () => {
    expect(first.verdict).toBe('B');
    expect(first.rows.filter(r => r.pass === false).map(r => r.id)).toEqual([
      'I1.i',
      'I2.b',
      'I4.a',
    ]);
    expect(first.rows.some(r => r.id.endsWith('s'))).toBe(false);
    expect(first.amended ?? null).toBeNull();
  });

  test('the failed legs stay failing and labelled', () => {
    expect(fixture('failed-legs').legs).toEqual(FAILING);
    for (const id of FAILING)
      expect(pinned.rows.find(r => r.id === id).pass).toBe(false);
    // A superseded leg is carried from the first run, never re-judged.
    for (const id of SUPERSEDED) {
      const row = pinned.rows.find(r => r.id === id);
      expect(row.carried).toBe('first-run');
      expect(row.pass).toBe(first.rows.find(r => r.id === id).pass);
    }
  });

  test('the verdicts: B by the committed function (I3, I5); B as amended (I2, I3, I4, I5); I1 fails in both', () => {
    const passing = v =>
      Object.entries(v.instruments)
        .filter(([, i]) => i.pass)
        .map(([k]) => k);
    expect(pinned.verdict).toBe('B');
    expect(passing(pinned)).toEqual(['I3', 'I5']);
    expect(pinned.amended.verdict).toBe('B');
    expect(passing(pinned.amended)).toEqual(['I2', 'I3', 'I4', 'I5']);
    expect(pinned.amended.instruments.I1.failed).toEqual(['I1.ds']);
  });
});

describe('the instruments against the pinned oracle', () => {
  let live;
  beforeAll(async () => {
    live = judge(
      await runInstruments(fixture('inputs')),
      fixture('oracle-results'),
      first
    );
  }, 300000);

  test('every leg comes out as pinned, in this engine', () => {
    expect(live.rows.map(r => [r.id, r.pass])).toEqual(
      pinned.rows.map(r => [r.id, r.pass])
    );
    expect(live.verdict).toBe(pinned.verdict);
    expect(live.amended.verdict).toBe(pinned.amended.verdict);
  });

  test('the numbers a reader would be shown are the pinned ones, as absolute values', () => {
    const at = (rows, id) => rows.find(r => r.id === id).measured;
    // I3 on A8b's settings: 26 of 50 pairs exponential, the median rate and its bounds.
    const r = at(live.rows, 'I3.r');
    expect(r.counts.exponential).toBe(26);
    expect(r.counts.insufficient).toBe(24);
    expect(r.median).toBeCloseTo(0.12615562571642852, 9);
    expect(r.lo).toBeCloseTo(0.12119388143954639, 9);
    expect(r.hi).toBeCloseTo(0.14819023738960574, 9);
    expect(r.window).toEqual({ from: 4.5, to: 33.75 });
    // I2: the eccentric orbit's history and the cost of a fixed step of equal error.
    const c = at(live.rows, 'I2.f').instrument;
    expect(c.adaptiveEvaluations).toBe(1135);
    expect(c.fixedSteps).toBe(16384);
    expect(at(live.rows, 'I2.cs').slope).toBeCloseTo(1.5503055036, 8);
    // I5 on the MIST slice: the line is closer along mass, the spline along age.
    const m = at(live.rows, 'I5.r');
    expect(m.mass.closer).toBe('linear');
    expect(m.mass.rmsLinear).toBeCloseTo(0.04997119236770487, 10);
    expect(m.mass.rmsSpline).toBeCloseTo(0.36428599025319897, 10);
    expect(Object.values(m.age).map(a => a.closer)).toEqual([
      'spline',
      'spline',
      'spline',
    ]);
    // I4 on the TESS series: the period, beside the family's.
    const f = at(live.rows, 'I4.f');
    expect(f.points).toBe(78);
    expect(f.period).toBeCloseTo(7.502622635547257, 8);
    expect(f.glsPeriod).toBeCloseTo(7.464030450345082, 6);
  });
});

describe('the refusals, one by one', () => {
  const circle = keplerPair({ e: 0 });
  test('the ledger: four schemes, and a number is withheld at the rounding floor, for an unbound orbit and for too few steps', () => {
    expect(Object.keys(LEDGER_SCHEMES)).toEqual([
      'explicit-euler',
      'symplectic-euler',
      'velocity-verlet',
      'rk4',
    ]);
    expect(twoStep(circle, 'rk4', { h: 0.001, span: 0.016 }).refused).toBe(
      'rounding-floor'
    );
    expect(
      twoStep(keplerPair({ e: 0.9 }), 'explicit-euler', {
        h: Math.PI / 10,
        span: 20 * Math.PI,
      }).refused
    ).toBe('unbound');
    expect(ledger(circle, 'rk4', { h: 0.01, span: 0.07 }).refused).toBe(
      'too-few-steps'
    );
    expect(() => ledger(circle, 'heun', { h: 0.01, span: 1 })).toThrow(
      RangeError
    );
    // Explicit Euler gains energy on a circle: the orbit drifts outward.
    const run = ledger(circle, 'explicit-euler', { h: 0.01, span: 1 });
    expect(run.end).toBeGreaterThan(0);
    expect(run.separation.end).toBeGreaterThan(run.separation.start);
  });

  test('the step history refuses a tolerance that is not a positive number', () => {
    expect(() => stepHistory(circle, 1, { tol: 0 })).toThrow(RangeError);
    expect(() => stepHistory([circle[0]], 1, { tol: 1e-9 })).toThrow(
      RangeError
    );
    const h = stepHistory(circle, 1, { tol: 1e-9 });
    expect(h.steps[0].first).toBe(true);
    expect(h.steps[h.steps.length - 1].last).toBe(true);
    expect(h.evaluations).toBe(1 + 6 * (h.accepted + h.rejected));
  });

  test('the ensemble rate refuses nine pairs and a linear separation', () => {
    const line = k =>
      Array.from({ length: 201 }, (_, i) => ({
        t: i * 0.5,
        d: 1e-6 * (1 + k / 10) * 2 * Math.abs(Math.sin(0.0025 * i)) + 1e-9,
      }));
    const many = (n, f) => Array.from({ length: n }, (_, k) => f(k));
    expect(ensembleRate(many(9, line)).refused).toBe('too-few-pairs');
    const r = ensembleRate(many(12, line));
    expect(r.refused).toBe('not-exponential');
    expect(r.behavior).toBe('linear');
    expect(r.median).toBeUndefined();
    expect(() => ensembleRate([], { level: 1 })).toThrow(RangeError);
  });

  test('the periodogram names no period when an alias is as tall', () => {
    const t = Array.from({ length: 40 }, (_, i) => i);
    const r = fourierPeriodogram(
      t,
      t.map(v => Math.cos(2 * Math.PI * 0.3 * v)),
      { fmin: 0.05, fmax: 0.95, n: 901 }
    );
    expect(r.refused).toBe('alias');
    expect(r.peak).toBeUndefined();
    expect(r.candidates).toHaveLength(2);
    expect(
      fourierPeriodogram([0, 1, 2], [1, 2, 3], { fmin: 0.1, fmax: 0.4, n: 5 })
        .refused
    ).toBe('too-few');
  });

  test('the held-out error refuses a table too coarse for either method', () => {
    const xs = [0, 1, 2, 3, 4].map(k => k * Math.PI);
    const r = heldOut(xs, xs.map(Math.cos), { limit: 0.05 });
    expect(r.refused).toBe('too-coarse');
    expect(r.closer).toBeUndefined();
    expect(heldOut([0, 1, 2, 3], [0, 1, 4, 9]).refused).toBe('too-few');
    expect(() => heldOut([0, 1, 1, 2, 3], [0, 1, 2, 3, 4])).toThrow(RangeError);
  });
});

describe('the consumers rule', () => {
  test('the kernel directory is never precached and no module outside it imports it', () => {
    expect(
      NEVER_PRECACHED.some(re => re.test('js/kernels/numerics/ledger.js'))
    ).toBe(true);
    const importers = walk('js')
      .filter(f => !f.startsWith('js/kernels/numerics/'))
      .filter(f => /kernels\/numerics\//.test(read(f)));
    expect(importers).toEqual([]);
  });

  test('nothing in the kernel, the validator or the record names the compute page', () => {
    for (const f of [
      ...walk('js/kernels/numerics'),
      'tools/numerics-instruments-validate.mjs',
    ])
      expect(read(f)).not.toMatch(/compute\/|computePage|js\/compute/);
    expect(read('NUMERICS_INSTRUMENTS.md')).not.toMatch(/\]\((\.\/)?compute\//);
  });

  test('the oracle imports numpy, scipy and the standard library only', () => {
    const imports = read('tools/numerics-instruments-oracle/oracle.py')
      .split('\n')
      .filter(l => /^(import|from)\s/.test(l))
      .map(l => l.split(/\s+/)[1].split('.')[0]);
    expect([...new Set(imports)].sort()).toEqual([
      'json',
      'math',
      'numpy',
      'scipy',
      'sys',
    ]);
  });

  test('the record holds no home path', () => {
    for (const f of [
      'NUMERICS_INSTRUMENTS.md',
      'tests/fixtures/numerics-instruments/thresholds.json',
      'tests/fixtures/numerics-instruments/results.json',
    ])
      expect(read(f)).not.toMatch(/\/Users\/|\/private\/tmp/);
  });
});
