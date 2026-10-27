// =============================================================================
// The crater-chronology gate (Prompt 196, part A): the verdict, held by a test
// -----------------------------------------------------------------------------
// tests/fixtures/crater-chronology-gate/thresholds.json fixed the functions, every
// bound, the intake rules and the decision function before any age was computed;
// sources.json holds the retrieved numbers with their provenance; record.json what
// the spike (branch spike/crater-chronology-gate, never merged) measured;
// oracle-results.json and craterstats-results.json what an independent Python
// implementation and craterstats 3.2.1 gave. This applies the committed function to
// the committed bounds and the recorded numbers and holds the verdict: C (R1 and R3
// fail as committed; O1 fails and Carl accepted the ceiling B). Nothing here moves
// a bound.
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
const CS = read(`${DIR}/craterstats-results.json`);
const SRC = read(`${DIR}/sources.json`);
const FRAMES = read('frames/craters-regions.json');
const L = TH.legs;

const poly = (a, D) => {
  const x = Math.log10(D);
  let s = 0;
  for (let k = a.length - 1; k >= 0; k--) s = s * x + a[k];
  return 10 ** s;
};
const pf = D => poly(TH.functions.lunarProduction.a, D);
const { c1, lambda, c2 } = TH.functions.lunarChronology;
const n1 = T => c1 * Math.expm1(lambda * T) + c2 * T;
const F = L['R1.sites'].tolerance.densityFactor;
const inTol = r => r >= 1 / F && r <= F;
const row = id => REC.rows.find(r => r.id === id);

/** The committed decision function, first match from the top, over recorded rows. */
function decide(rows, own2) {
  const ok = prefix =>
    rows
      .filter(r => r.id.startsWith(prefix) && r.pass !== null)
      .every(r => r.pass);
  const base = ['F1', 'F2', 'F3'].every(ok);
  const data = ['R1', 'R2', 'R3'].every(ok);
  if (base && data && ok('O1') && own2) return 'A';
  if (base && data) return 'B';
  return 'C';
}

describe('the contract was committed before any result', () => {
  test('the thresholds say so, carry both corrections, and hold no sample age or published count', () => {
    expect(TH.committed).toMatch(/Before any age was computed/);
    expect(TH.corrections.map(c => c.id)).toEqual(['c1', 'c2']);
    expect(TH.intake.committed).toMatch(/before any R1, R2 or R3 value/);
    expect(JSON.stringify(TH)).not.toMatch(
      /"sampleAgeGa"|"publishedCount"|"n1Neo"/
    );
    expect(L['R1.sites'].tolerance.densityFactor).toBe(1.5);
  });

  test('every leg the document tables is in the thresholds', () => {
    for (const id of [
      'F1.a0',
      'F1.inverse',
      'F1.monotone',
      'F1.oracle',
      'F1.craterstats',
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

  test('the sources are recorded with their provenance and the unretrieved ones with their reasons', () => {
    for (const s of SRC.retrieved_items) {
      expect(s.url).toMatch(/^https:/);
      expect(JSON.stringify(s)).toMatch(/[0-9a-f]{64}/);
      expect(s.licence).toBeTruthy();
    }
    expect(SRC.not_retrieved.map(s => s.id)).toEqual(
      expect.arrayContaining([
        'neukum2001',
        'stoffler2001',
        'robbins2014',
        'iqbal2020-apollo12',
      ])
    );
    for (const s of SRC.not_retrieved) expect(s.why.length).toBeGreaterThan(20);
  });
});

describe('the recorded run against the committed bounds', () => {
  test('every judged row stored a pass flag consistent with its bound', () => {
    for (const r of REC.rows) {
      if (r.pass === null) continue;
      const b = r.bound;
      let want;
      if (Array.isArray(b) && r.id.startsWith('R2.'))
        want = r.measured >= b[0] && r.measured <= b[1];
      else if (Array.isArray(b)) want = inTol(r.measured);
      else if (
        r.id === 'F2.coverage' ||
        r.id.startsWith('O1.') ||
        r.id === 'R1.count' ||
        r.id === 'R3.sites'
      )
        want = r.measured >= b;
      else want = r.measured <= b;
      expect([r.id, want]).toEqual([r.id, r.pass]);
    }
  });

  test('the failing rows are exactly: O1 (both boxes), eight R1 rows, the R1 total and R3.sites', () => {
    const failing = REC.rows
      .filter(r => r.pass === false)
      .map(r => r.id)
      .sort();
    expect(failing).toEqual(
      [
        'O1.moon-highland',
        'O1.moon-mare',
        'R1.Copernicus Crater (cont. ejecta)',
        'R1.Copernicus Crater (crater floor)',
        'R1.Cone Crater',
        'R1.Descartes Formation',
        'R1.Mare Imbrium',
        'R1.North Ray crater',
        'R1.Tycho crater (cont. ejecta, large craters)',
        'R1.Tycho crater (cont. ejecta, small craters)',
        'R1.rowsOutside',
        'R3.sites',
      ].sort()
    );
  });

  test('O2 and I1 are NOT RUN with their reasons, and nothing was simulated', () => {
    expect(Object.keys(REC.notRun).sort()).toEqual([
      'I1.completeness',
      'O2.own',
    ]);
    for (const why of Object.values(REC.notRun))
      expect(why.length).toBeGreaterThan(20);
  });

  test('F2: 24 cells at or above the floor; F3: nine refusal cases, each its named status and no age', () => {
    const cells = row('F2.coverage').cells;
    expect(cells).toHaveLength(24);
    for (const c of cells)
      expect(c.coverage).toBeGreaterThanOrEqual(
        L['F2.coverage'].bounds.perCellMinimum
      );
    const d = row('F3.refusals.cases').detail;
    expect(d).toHaveLength(9);
    for (const c of d)
      expect([c.want, c.got, c.ok]).toEqual([c.want, c.want, true]);
  });
});

describe('the retrieved data, recomputed here against the record', () => {
  test('R1: each ratio is the published NEO density over N1 at the sample age; the judged rows are the committed ones', () => {
    const names = SRC.marchi2009Table1.rows.map(r => r.name);
    expect(TH.intake.R1.rows.length).toBe(names.length);
    for (const x of SRC.marchi2009Table1.rows) {
      const r = row(`R1.${x.name}`);
      expect(r.measured / (x.n1Neo / n1(x.ageGa))).toBeCloseTo(1, 12);
      expect(r.pass).toBe(inTol(r.measured));
    }
    const outside = SRC.marchi2009Table1.rows.filter(
      x => !inTol(x.n1Neo / n1(x.ageGa))
    );
    expect(outside).toHaveLength(8);
    expect(row('R1.rowsOutside').measured).toBe(8);
  });

  test('R1 detail: the ten old rows have eight in tolerance, and every young row is outside', () => {
    const rows = SRC.marchi2009Table1.rows;
    const old = rows.filter(x => x.ageGa > 3);
    const young = rows.filter(x => x.ageGa < 1);
    expect(old).toHaveLength(10);
    expect(old.filter(x => inTol(x.n1Neo / n1(x.ageGa)))).toHaveLength(8);
    expect(young).toHaveLength(6);
    for (const x of young) expect(inTol(x.n1Neo / n1(x.ageGa))).toBe(false);
    // a reset of the factor to 2 (Carl's alone) would still leave four rows outside
    const at2 = rows.filter(x => {
      const q = x.n1Neo / n1(x.ageGa);
      return q > 2 || q < 0.5;
    });
    expect(at2).toHaveLength(4);
  });

  test('R3: three post-2001 recounts, all at Apollo 11, all within tolerance; one site against the minimum of two', () => {
    const rec = SRC.apollo11Counts.rows.filter(c => c.year > 2001);
    expect(rec).toHaveLength(3);
    for (const c of rec)
      expect(inTol(c.n1 / n1(SRC.sampleAgesGa['apollo11-young']))).toBe(true);
    expect(row('R3.sites').measured).toBe(1);
    expect(L['R3.recount'].bounds.minimumRecountSites).toBe(2);
  });

  test('R2: all six Apollo 11 counts meet the sample window', () => {
    expect(SRC.apollo11Counts.rows).toHaveLength(6);
    expect(row('R2.rowsOutside').measured).toBe(0);
  });

  test('the functions agree with craterstats 3.2.1 and with the independent implementation', () => {
    CS.D.forEach((D, i) =>
      expect(Math.abs(pf(D) / CS.pf1983[i] - 1)).toBeLessThan(1e-9)
    );
    CS.T.forEach((T, i) =>
      expect(Math.abs(n1(T) / CS.n1[i] - 1)).toBeLessThan(1e-9)
    );
    ORA.D.forEach((D, i) =>
      expect(Math.abs(pf(D) / ORA.pf[i] - 1)).toBeLessThan(1e-9)
    );
  });

  test('R0: the recalled table differed from the sourced one, and the 2001 polynomial is reported, not judged', () => {
    expect(row('info.R0.recalledVsSourced').measured).toBeGreaterThan(0.1);
    expect(row('info.pf2001vs1983').pass).toBeNull();
    const a01 = TH.functions.lunarProduction.variant2001.a;
    const D = 16.2;
    expect(poly(a01, D) / pf(D)).toBeGreaterThan(2);
  });

  test('O1 follows from the regions file: about two craters at 3.5 Ga, against 30 (about five under the 2001 polynomial)', () => {
    for (const k of ['moon-highland', 'moon-mare']) {
      const r = FRAMES.regions[k];
      const dMin = Math.max(8 * r.geometry.kmPerPixelAtCentre, 1);
      const expected = (r.areaKm2 * pf(dMin) * n1(3.5)) / pf(1);
      expect(Math.abs(expected / row(`O1.${k}`).measured - 1)).toBeLessThan(
        1e-9
      );
      expect(expected).toBeLessThan(3);
      const e01 =
        (r.areaKm2 *
          poly(TH.functions.lunarProduction.variant2001.a, dMin) *
          n1(3.5)) /
        poly(TH.functions.lunarProduction.variant2001.a, 1);
      expect(e01).toBeLessThan(
        L['O1.feasible'].bounds.expectedCountMinimumAt3_5Ga
      );
    }
  });

  test('no Martian chronology is built: the Martian constants are recorded, not coded', () => {
    expect(TH.functions.martianChronology.form).toMatch(/NOT implemented/);
    expect(row('F3.refusals.cases').detail.some(c => c.want === 'mars')).toBe(
      true
    );
  });
});

describe('the verdict by the committed function', () => {
  test('the verdict is C', () => {
    expect(decide(REC.rows, false)).toBe('C');
  });

  test('R1 and R3 are what hold it at C: with only those rows reset the function gives B (O1 and O2 do not bear on B)', () => {
    const reset = REC.rows.map(r =>
      /^R[13]\./.test(r.id) && r.pass === false ? { ...r, pass: true } : r
    );
    expect(decide(reset, false)).toBe('B');
    // R3 alone, or R1 alone, is not enough
    const onlyR3 = REC.rows.map(r =>
      r.id.startsWith('R3.') ? { ...r, pass: true } : r
    );
    const onlyR1 = REC.rows.map(r =>
      r.id.startsWith('R1.') ? { ...r, pass: true } : r
    );
    expect(decide(onlyR3, false)).toBe('C');
    expect(decide(onlyR1, false)).toBe('C');
  });

  test("A needs O1 and O2 as well, and O1 stays failing on Carl's ruling of 2026-10-27: the ceiling is B", () => {
    const reset = REC.rows.map(r =>
      r.pass === false ? { ...r, pass: true } : r
    );
    expect(decide(reset, true)).toBe('A');
    expect(decide(reset, false)).toBe('B');
    expect(row('O1.moon-mare').pass).toBe(false);
  });
});
