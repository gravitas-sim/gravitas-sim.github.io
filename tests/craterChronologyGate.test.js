// =============================================================================
// The crater-chronology gate (Prompt 196, part A): the verdict, held by a test
// -----------------------------------------------------------------------------
// tests/fixtures/crater-chronology-gate/thresholds.json fixed the functions, every
// bound and the decision function before any age was computed; record.json holds
// what the spike (branch spike/crater-chronology-gate, never merged) measured and
// oracle-results.json what an independent Python implementation gave. This applies
// the committed function to the committed bounds and the recorded numbers and holds
// the verdict: a pending C (the reference legs could not run: their data are not in
// the repository), with A out of reach on the committed frames because O1 fails.
// Nothing here moves a bound.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = p => JSON.parse(readFileSync(path.join(ROOT, p), 'utf8'));
const DIR = 'tests/fixtures/crater-chronology-gate';
const TH = read(`${DIR}/thresholds.json`);
const REC = read(`${DIR}/record.json`);
const ORA = read(`${DIR}/oracle-results.json`);
const FRAMES = read('frames/craters-regions.json');
const L = TH.legs;

const a = TH.functions.lunarProduction.a;
const pf = D => {
  const x = Math.log10(D);
  let s = 0;
  for (let k = a.length - 1; k >= 0; k--) s = s * x + a[k];
  return 10 ** s;
};
const { c1, lambda, c2 } = TH.functions.lunarChronology;
const n1 = T => c1 * Math.expm1(lambda * T) + c2 * T;

/** The bound of a recorded row, from the thresholds file. */
function boundOf(id) {
  if (id === 'F1.a0') return L['F1.a0'].bounds.relativeDifference;
  if (id === 'F1.inverse') return L['F1.inverse'].bounds.relative;
  if (id === 'F1.monotone') return L['F1.monotone'].bounds.violations;
  if (id === 'F1.oracle') return L['F1.oracle'].bounds.maxRelative;
  if (id === 'F2.coverage') return L['F2.coverage'].bounds.perCellMinimum;
  if (id === 'F3.refusals.cases') return 0;
  if (id === 'F3.refusals.control')
    return L['F3.refusals'].bounds.controlRefusalRateMaximum;
  if (id.startsWith('O1.'))
    return L['O1.feasible'].bounds.expectedCountMinimumAt3_5Ga;
  return null;
}
/** Whether a row passes its committed bound (a lower bound for F2 and O1). */
const passes = r =>
  r.id === 'F2.coverage' || r.id.startsWith('O1.')
    ? r.measured >= boundOf(r.id)
    : r.measured <= boundOf(r.id);

/** The committed decision function, first match from the top. */
function decide(rows, _notRun, passed = []) {
  const legsPass = prefix =>
    rows.filter(r => r.id.startsWith(prefix)).every(r => passes(r));
  const data = ['R1.sites', 'R2.coverage', 'R3.recount'].every(id =>
    passed.includes(id)
  );
  const base = ['F1', 'F2', 'F3'].every(legsPass);
  const own = legsPass('O1') && passed.includes('O2.own');
  if (base && data && own) return 'A';
  if (base && data) return 'B';
  return 'C';
}

describe('the contract was committed before any result', () => {
  test('the thresholds say so, carry the correction, and hold no sample age or published count', () => {
    expect(TH.committed).toMatch(/Before any age was computed/);
    expect(TH.corrections.map(c => c.id)).toEqual(['c1']);
    const text = JSON.stringify(TH);
    expect(text).not.toMatch(/"sampleAgeGa"|"publishedCount"/);
    expect(TH.legs['R1.sites'].tolerance.densityFactor).toBe(1.5);
  });

  test('every leg the document tables is in the thresholds', () => {
    for (const id of [
      'F1.a0',
      'F1.inverse',
      'F1.monotone',
      'F1.oracle',
      'F2.coverage',
      'F3.refusals',
      'R1.sites',
      'R2.coverage',
      'R3.recount',
      'O1.feasible',
      'O2.own',
      'I1.completeness',
      'M1.mars',
    ])
      expect(L[id]).toBeDefined();
  });
});

describe('the recorded run against the committed bounds', () => {
  test('every row stored a pass flag equal to what its committed bound says', () => {
    for (const r of REC.rows) expect([r.id, passes(r)]).toEqual([r.id, r.pass]);
  });

  test('F1, F2 and F3 pass; the two O1 rows fail as committed', () => {
    const failing = REC.rows
      .filter(r => !r.pass)
      .map(r => r.id)
      .sort();
    expect(failing).toEqual(['O1.moon-highland', 'O1.moon-mare']);
  });

  test('the legs that need data are NOT RUN, with the reason, and none was simulated', () => {
    expect(Object.keys(REC.notRun).sort()).toEqual([
      'I1.completeness',
      'O2.own',
      'R1.sites',
      'R2.coverage',
      'R3.recount',
    ]);
    for (const why of Object.values(REC.notRun))
      expect(why.length).toBeGreaterThan(20);
    expect(REC.rows.some(r => /^R[123]/.test(r.id))).toBe(false);
  });

  test('F2: 24 cells, each covering at or above the floor', () => {
    const cells = REC.rows.find(r => r.id === 'F2.coverage').cells;
    expect(cells).toHaveLength(24);
    for (const c of cells)
      expect(c.coverage).toBeGreaterThanOrEqual(
        L['F2.coverage'].bounds.perCellMinimum
      );
  });

  test('F3: nine refusal cases, each its named status and no age', () => {
    const d = REC.rows.find(r => r.id === 'F3.refusals.cases').detail;
    expect(d).toHaveLength(9);
    for (const c of d)
      expect([c.want, c.got, c.ok]).toEqual([c.want, c.want, true]);
    expect(new Set(d.map(c => c.want))).toEqual(
      new Set([
        'secondaries',
        'tooFew',
        'saturated',
        'beyondChronology',
        'count',
        'diameter',
        'mars',
      ])
    );
  });
});

describe('the functions, recomputed here against the record and the oracle', () => {
  test('10^a0 is the chronology linear coefficient to the recorded 1.0e-4', () => {
    const rel = Math.abs(10 ** a[0] - c2) / c2;
    expect(rel).toBeLessThan(L['F1.a0'].bounds.relativeDifference);
    expect(rel).toBeCloseTo(REC.rows.find(r => r.id === 'F1.a0').measured, 8);
  });

  test('the production function and the chronology agree with the independent implementation', () => {
    ORA.D.forEach((D, i) =>
      expect(Math.abs(pf(D) / ORA.pf[i] - 1)).toBeLessThan(1e-9)
    );
    ORA.T.forEach((T, i) =>
      expect(Math.abs(n1(T) / ORA.n1[i] - 1)).toBeLessThan(1e-9)
    );
  });

  test('O1 follows from the regions file: about two craters at 3.5 Ga, against 30', () => {
    for (const k of ['moon-highland', 'moon-mare']) {
      const r = FRAMES.regions[k];
      const dMin = Math.max(8 * r.geometry.kmPerPixelAtCentre, 1);
      const expected = (r.areaKm2 * pf(dMin) * n1(3.5)) / pf(1);
      const row = REC.rows.find(x => x.id === `O1.${k}`);
      expect(Math.abs(expected / row.measured - 1)).toBeLessThan(1e-9);
      expect(expected).toBeLessThan(3);
      expect(expected).toBeLessThan(
        L['O1.feasible'].bounds.expectedCountMinimumAt3_5Ga
      );
    }
  });

  test('no Martian chronology is built: the Martian constants are recorded, not coded', () => {
    expect(TH.functions.martianChronology.form).toMatch(/NOT implemented/);
    expect(
      REC.rows
        .find(r => r.id === 'F3.refusals.cases')
        .detail.some(c => c.want === 'mars')
    ).toBe(true);
  });
});

describe('the verdict by the committed function', () => {
  const notRun = Object.keys(REC.notRun);
  test('the verdict is C, and a pending C', () => {
    expect(decide(REC.rows, notRun)).toBe('C');
  });

  test('the counterfactual for Carl: with R1 to R3 run and passing the same function gives B, never A', () => {
    const data = ['R1.sites', 'R2.coverage', 'R3.recount'];
    expect(decide(REC.rows, notRun, data)).toBe('B');
    expect(decide(REC.rows, notRun, [...data, 'O2.own'])).toBe('B');
  });

  test("A needs O1 to pass, and it does so only if a bound or the frames change (Carl's)", () => {
    const reset = REC.rows.map(r =>
      r.id.startsWith('O1.') ? { ...r, measured: 30 } : r
    );
    const data = ['R1.sites', 'R2.coverage', 'R3.recount', 'O2.own'];
    expect(decide(reset, notRun, data)).toBe('A');
  });
});
