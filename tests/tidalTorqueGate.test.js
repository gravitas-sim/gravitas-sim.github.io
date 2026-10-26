// =============================================================================
// The tidal-torque gate (Prompt 204, part B): the verdict, held by a test
// -----------------------------------------------------------------------------
// tests/fixtures/tidal-torque-gate/thresholds.json fixed every bound and the
// decision function before the spike existed; record.json holds what the spike
// (branch spike/tidal-torque-gate, never merged) measured. This applies the
// committed function to the committed bounds and the recorded numbers, and holds
// the verdict: B. It also holds the counterfactual that goes to Carl: the three
// legs that fail, and that the same function gives A if those bounds were reset
// (a reset is Carl's alone; nothing here moves one).
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = p => JSON.parse(readFileSync(path.join(ROOT, p), 'utf8'));
const TH = read('tests/fixtures/tidal-torque-gate/thresholds.json');
const REC = read('tests/fixtures/tidal-torque-gate/record.json');
const SCHEMES = Object.keys(TH.harness.stepsPerOrbit);
const B = TH.bounds;

/** The committed bound of a harness row, from the thresholds file. */
function boundOf(id) {
  const m = id.match(/^(G\d)\.[^.]+\.(.+)$/);
  if (!m) return null;
  const [, leg, scheme] = m;
  const key = Object.keys(B).find(k => k.startsWith(`${leg}.`));
  const b = B[key].bounds;
  if (leg === 'G4') return b[scheme];
  if (leg === 'G3' || leg === 'G6') return b[scheme];
  if (leg === 'G5') return b.relative;
  if (leg === 'G7')
    return id.startsWith('G7.rises') ? b.rise : b.dissipationRelative;
  return null;
}

/** Whether a row passes its committed bound. */
function passes(row, reset = []) {
  if (reset.includes(row.id)) return true;
  const b = boundOf(row.id);
  if (row.id.startsWith('G2.')) return row.measured === 0;
  if (Array.isArray(b)) return row.measured >= b[0] && row.measured <= b[1];
  return row.measured <= b;
}

const legsOf = rows => {
  const out = {};
  for (const r of rows) {
    if (!/^G\d\./.test(r.id)) continue;
    const leg = r.id.slice(0, 2);
    (out[leg] = out[leg] || []).push(r);
  }
  return out;
};

/** The committed decision function: the first match from the top. */
function decide(legs, g1, g8, reset = []) {
  const ok = r => passes(r, reset);
  const g2ok = (legs.G2 || []).every(ok);
  if (!g1 || !g2ok) return 'C';
  const others =
    ['G3', 'G4', 'G5', 'G6', 'G7'].every(l => (legs[l] || []).every(ok)) && g8;
  return others ? 'A' : 'B';
}

describe('the recorded run against the committed bounds', () => {
  const rows = REC.harness.filter(r => /^G\d\./.test(r.id));
  const legs = legsOf(rows);

  test('every row stored a pass flag equal to what its committed bound says', () => {
    for (const r of rows) expect([r.id, passes(r)]).toEqual([r.id, r.pass]);
  });

  test('every leg G2 to G7 has a row for every scheme (G5 to G7 may have several)', () => {
    for (const leg of ['G2', 'G3', 'G4', 'G5', 'G6', 'G7']) {
      const ids = (legs[leg] || []).map(r => r.id);
      for (const s of SCHEMES)
        expect(ids.some(i => i.endsWith(`.${s}`))).toBe(true);
    }
  });

  test('G1 (off is bit-identical) and G2 (zero strength is bit-identical) pass', () => {
    expect(REC.G1.pass).toBe(true);
    for (const x of REC.G1.seededStepIdentical) expect(x.spike).toBe(x.base);
    expect((legs.G2 || []).every(r => passes(r))).toBe(true);
  });

  test('G8: the empty-registry seam costs under the committed bound', () => {
    expect(REC.G8.relative).toBeLessThan(B['G8.overhead'].bounds.relative);
    expect(REC.G8.pass).toBe(true);
  });

  test('the verdict is B, and exactly three legs fail', () => {
    const failing = rows
      .filter(r => !passes(r))
      .map(r => r.id)
      .sort();
    expect(failing).toEqual([
      'G3.closedForm.Velocity Verlet',
      'G4.order.RK4',
      'G4.order.Symplectic Euler',
    ]);
    expect(decide(legs, REC.G1.pass, REC.G8.pass)).toBe('B');
  });

  test('the counterfactual for Carl: with those three bounds reset the same function gives A', () => {
    const three = [
      'G3.closedForm.Velocity Verlet',
      'G4.order.RK4',
      'G4.order.Symplectic Euler',
    ];
    expect(decide(legs, REC.G1.pass, REC.G8.pass, three)).toBe('A');
    // and a single reset is not enough
    for (const one of three) {
      expect(decide(legs, REC.G1.pass, REC.G8.pass, [one])).toBe('B');
    }
  });

  test('the recorded orders are what the numbers say, not what the bound expected', () => {
    // A circular orbit has r.v = 0 at every instant, so the first-order term of
    // symplectic Euler's modified energy vanishes there and the error at the
    // end of an orbit is second order. The bound expected 1.
    expect(REC.slopes['Symplectic Euler'].slope).toBeGreaterThan(1.5);
    expect(REC.slopes['Velocity Verlet'].slope).toBeGreaterThan(1.8);
    expect(REC.slopes.RK4.slope).toBeGreaterThan(4.5);
  });

  test('the kernel closed form is within 2e-6 of the independent DOP853 run', () => {
    const r = rows
      .concat(REC.harness)
      .find(x => x.id === 'ref.closedForm.vs.oracle');
    expect(r.measured).toBeLessThan(2e-6);
  });
});
