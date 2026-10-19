// =============================================================================
// Kepler's equation has one solver (Prompt 142)
// -----------------------------------------------------------------------------
// solveKepler in js/orbital.js is the bracketed Newton the 3-D lab used; eight modules had each
// solved E - e sin E = M with their own start, tolerance and cap, and three of
// them could miss the root. This holds the solver's contract on a fixture grid
// against a reference that shares none of its code (bisection to adjacent
// doubles), the two inputs the others failed on, and that no module outside it
// defines a solver again.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { solveKepler } from '../js/orbital.js';

const TWO_PI = 2 * Math.PI;

/** The root to the last bit: bisection on a monotone function, no derivative. */
function reference(M, e) {
  const wrapped = M - TWO_PI * Math.round(M / TWO_PI);
  let lo = wrapped - e - 1e-9;
  let hi = wrapped + e + 1e-9;
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2;
    if (mid === lo || mid === hi) break;
    if (mid - e * Math.sin(mid) - wrapped > 0) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2 + (M - wrapped);
}

const ECCENTRICITIES = [
  0, 1e-6, 1e-3, 0.01, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.85, 0.9,
  0.95, 0.97, 0.99, 0.995, 0.999,
];
/** Mean anomalies over three turns, both signs, and the places that are special. */
const MEANS = [
  ...Array.from(
    { length: 1081 },
    (_, i) => -3 * Math.PI + (i * 6 * Math.PI) / 1080
  ),
  1e-12,
  -1e-12,
  Math.PI - 1e-9,
  Math.PI + 1e-9,
];

describe('the fixture grid, against an independent reference', () => {
  test('the root is found to the equation’s own conditioning', () => {
    // The root's slope in M is 1 / (1 - e e cos E) <= 1 / (1 - e), so one ulp
    // in M is up to 1 / (1 - e) ulps in E: that is the bound, with a margin of
    // ten. Observed worst: 2e-13 at e = 0.999, below 3e-15 for e <= 0.9.
    let worst = { err: 0 };
    for (const e of ECCENTRICITIES) {
      for (const M of MEANS) {
        const E = solveKepler(M, e);
        const err = Math.abs(E - reference(M, e));
        const bound = (10 * 2.2e-16 * (1 + Math.abs(E))) / (1 - e);
        if (!(err <= bound))
          throw new Error(`e=${e} M=${M}: error ${err} over ${bound}`);
        if (e <= 0.9) worst = { err: Math.max(worst.err, err) };
      }
    }
    expect(worst.err).toBeLessThan(3e-15);
  });

  test('the equation holds, to rounding, on every turn', () => {
    for (const e of ECCENTRICITIES) {
      for (const M of MEANS) {
        const E = solveKepler(M, e);
        expect(Math.abs(E - e * Math.sin(E) - M)).toBeLessThan(
          8 * 2.2e-16 * (1 + Math.abs(M))
        );
      }
    }
  });

  test('the answer is on the turn of the input and odd in M', () => {
    for (const e of [0.1, 0.6, 0.95]) {
      for (const M of [0.3, 1.7, 2.9, 4.4, 6.1]) {
        const E = solveKepler(M, e);
        expect(solveKepler(-M, e)).toBeCloseTo(-E, 14);
        expect(solveKepler(M + 3 * TWO_PI, e) - 3 * TWO_PI).toBeCloseTo(E, 12);
        expect(solveKepler(M - 2 * TWO_PI, e) + 2 * TWO_PI).toBeCloseTo(E, 12);
      }
    }
  });
});

describe('the contract’s edges', () => {
  test('a circular orbit returns M', () => {
    for (const M of [-7, -1, 0, 0.5, Math.PI, 9.25]) {
      expect(solveKepler(M, 0)).toBe(M);
    }
  });

  test('periapsis and apoapsis are their own roots', () => {
    for (const e of [0, 0.3, 0.99]) {
      expect(Math.abs(solveKepler(0, e))).toBeLessThan(1e-30);
      expect(solveKepler(Math.PI, e)).toBeCloseTo(Math.PI, 14);
    }
  });

  test('the inputs the other solvers missed converge', () => {
    // A start at pi wandered here, and a start at M + e sin M never settled
    // near 2 pi at e = 0.995.
    for (const [M, e] of [
      [-1.74, 0.95],
      [-2.5395, 0.99],
      [6.2046, 0.995],
      [6.2396, 0.995],
      [-0.3316, 0.995],
      [0.0785, 0.995],
    ]) {
      const E = solveKepler(M, e);
      expect(Math.abs(E - e * Math.sin(E) - M)).toBeLessThan(1e-14);
    }
  });

  test('it is a pure function of its two arguments', () => {
    const a = solveKepler(2.2, 0.7);
    solveKepler(-5, 0.99);
    expect(solveKepler(2.2, 0.7)).toBe(a);
  });
});

describe('nothing else solves it again', () => {
  const files = [];
  const walk = dir => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (p.endsWith('.js')) files.push(p);
    }
  };
  walk('js');

  // A module that keeps its own step, and why. A new one is a decision.
  const EXCEPTIONS = {
    'js/kernels/sky/planets.js':
      'the Sky Lab route is held to its weight gate (SKY_LAB_GATE.md): it would pay the 7 KB module and a request for a step that is exact to 1e-12 at its eccentricities, 0.21 and below',
  };

  test('no module outside js/orbital.js steps Newton on Kepler’s equation, but the listed one', () => {
    // The step: (E - e sin E - M) / (1 - e cos E), in any spelling of e and M.
    const step =
      /\(\s*\w+\s*-\s*[\w.]+\s*\*\s*Math\.sin\(\s*\w+\s*\)\s*-\s*\w+\s*\)\s*\/\s*\(\s*1\s*-\s*[\w.]+\s*\*\s*Math\.cos/;
    const defines = files
      .filter(
        f =>
          f !== path.join('js', 'orbital.js') &&
          step.test(readFileSync(f, 'utf8'))
      )
      .sort();
    expect(defines).toEqual(Object.keys(EXCEPTIONS));
    for (const why of Object.values(EXCEPTIONS))
      expect(why.length).toBeGreaterThan(40);
  });

  test('the callers import it', () => {
    for (const f of [
      'js/lab3d/elements.js',
      'js/inference/rv.js',
      'js/forward/system.js',
      'js/habitability.js',
      'js/binaryWidgets.js',
      'js/systemSpec.js',
      'js/captureMeasure.js',
      'js/resonance/systems.js',
    ]) {
      expect({
        f,
        imports: /from '(\.\.?\/)+orbital\.js'/.test(readFileSync(f, 'utf8')),
      }).toEqual({
        f,
        imports: true,
      });
    }
  });

  test('the module imports nothing', () => {
    expect(readFileSync('js/orbital.js', 'utf8')).not.toMatch(/^\s*import\s/m);
  });
});
