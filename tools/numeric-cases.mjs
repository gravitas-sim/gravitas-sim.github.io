// =============================================================================
// The numerical routines' validation group (Prompt 152)
// -----------------------------------------------------------------------------
// Cases in the five kinds the validation contract asks of a kernel (7.5.8), as
// data, with every tolerance written here before the routines in js/numeric/
// were run against them:
//
//   analytic    a closed form the routine does not compute
//   oracle      an independent result: the code the routine would replace,
//               compared bit for bit in one process (tests/fixtures/
//               numericLegacy/ holds verbatim copies of v3's own, so the proof
//               survives the day a consumer adopts the module); a second
//               method written here; or the routine's defining conditions
//   ensemble    seeded random problems against a bound stated beforehand: the
//               fraction outside it must be zero (coverage cases state a rate)
//   negative    what the routine must refuse, report or say it cannot see
//   authentic   a published test problem or a certified value
//
// A case is `run()` returning measures { name, value, expected, tolerance,
// unit }; a measure passes when |value - expected| <= tolerance. Bit identity
// is counted as mismatches against 0 +- 0.
//
// Two engines. CI runs Node 20 and a Mac runs Node 24, and Math.log, exp, cos,
// sin, atan and pow differ in the last bit between them: nothing here stores a
// digest or a golden of a value that passes through one of those. Bit
// comparisons are of two code paths in this process; every closed form is held
// to a tolerance that is several orders above one ulp. The only seeded draws
// used are mulberry32's, which is integer arithmetic and exact on every engine.
// =============================================================================

import { mulberry32 } from '../js/rng.js';
import { brent, newton } from '../js/numeric/roots.js';
import { gaussLegendre, adaptive } from '../js/numeric/quadrature.js';
import { linear, locate, cubicSpline } from '../js/numeric/interp.js';
import {
  cholesky,
  solveSpd,
  invertSpd,
  solve,
  inverse,
  eigenSymmetric,
} from '../js/numeric/linalg.js';
import { polyfit } from '../js/numeric/polyfit.js';
import {
  solveSpd as legacySolveSpd,
  invertSpd as legacyInvertSpd,
  eigenSymmetric as legacyEigen,
} from '../tests/fixtures/numericLegacy/fitLinalg.js';
import { gl as legacyGl } from '../tests/fixtures/numericLegacy/flrwGl.js';
import {
  solveSpd as liveSolveSpd,
  invertSpd as liveInvertSpd,
} from '../js/inference/fit.js';
import {
  createCosmology,
  GYR_PER_INV_H0,
} from '../js/kernels/cosmology/flrw.js';

const EPS = Number.EPSILON;
const TAU = 2 * Math.PI;

const measure = (name, value, expected, tolerance, unit = '') => ({
  name,
  value,
  expected,
  tolerance,
  unit,
});
/** How many of the numbers in `a` differ from `b` in any bit. */
const mismatches = (a, b) =>
  a.reduce((n, x, k) => n + (Object.is(x, b[k]) ? 0 : 1), 0);
const flat = m => m.flat();

/** A seeded uniform generator: mulberry32, exact on every engine. */
const rng = seed => {
  const u = mulberry32(seed >>> 0);
  const uniform = (a = 0, b = 1) => a + (b - a) * u();
  return {
    u,
    uniform,
    int: (lo, hi) => lo + Math.floor(uniform(0, hi - lo + 1)),
  };
};
/** Standard normals by Box-Muller (log and cos: used for noise, never stored). */
const normals = u => () =>
  Math.sqrt(-2 * Math.log(1 - u())) * Math.cos(TAU * u());

const throws = (fn, type = RangeError) => {
  try {
    fn();
  } catch (e) {
    return e instanceof type ? 1 : 0;
  }
  return 0;
};

// --- Independent references written for the cases -----------------------------

/** Plain bisection to a bracket of 1e-15 (or 100 halvings): the oracle for brent. */
function bisect(f, a, b) {
  let fa = f(a);
  for (let i = 0; i < 100 && b - a > 1e-15; i++) {
    const m = 0.5 * (a + b);
    const fm = f(m);
    if (fm < 0 === fa < 0) {
      a = m;
      fa = fm;
    } else b = m;
  }
  return 0.5 * (a + b);
}
/** Bisection steps to bring a bracket of width w under tol. */
const bisectionSteps = (w, tol) => Math.ceil(Math.log2(w / tol));

/** Composite Simpson with n (even) intervals: the oracle for the quadrature. */
function simpson(f, a, b, n) {
  const h = (b - a) / n;
  let s = f(a) + f(b);
  for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2);
  return (s * h) / 3;
}

const binom = (n, k) => {
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return Math.round(r);
};
/** The Hilbert matrix and its exact integer inverse (i, j from 1). */
const hilbert = n =>
  Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => 1 / (i + j + 1))
  );
const hilbertInverse = n =>
  Array.from({ length: n }, (_, a) =>
    Array.from({ length: n }, (_, c) => {
      const i = a + 1;
      const j = c + 1;
      return (
        (-1) ** (i + j) *
        (i + j - 1) *
        binom(n + i - 1, n - j) *
        binom(n + j - 1, n - i) *
        binom(i + j - 2, i - 1) ** 2
      );
    })
  );
/** Condition numbers of the Hilbert matrices (2-norm), as published. */
const HILBERT_COND = { 3: 524.06, 4: 15513.7, 5: 476607.25, 6: 14951059.5 };

const matVec = (A, x) => A.map(r => r.reduce((s, v, j) => s + v * x[j], 0));
const norm1 = A =>
  Math.max(...A.map(r => r.reduce((s, v) => s + Math.abs(v), 0)));
const vnorm = x => Math.max(...x.map(Math.abs));

/** A random symmetric positive-definite matrix and a vector, from one stream. */
function randomSpd(r, n, shift = 0.1) {
  const B = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => r.uniform(-2, 2))
  );
  const A = Array.from({ length: n }, (_, i) =>
    Array.from(
      { length: n },
      (_, j) =>
        B.reduce((s, row) => s + row[i] * row[j], 0) + (i === j ? shift : 0)
    )
  );
  return { A, b: Array.from({ length: n }, () => r.uniform(-3, 3)) };
}

/** Eigenvalues of a symmetric 3 x 3, descending, by the trigonometric closed form (Smith 1961). */
function eigen3(M) {
  const [[a, d, e], [, b, f], [, , c]] = M;
  const p1 = d * d + e * e + f * f;
  const q = (a + b + c) / 3;
  if (p1 === 0) return [a, b, c].sort((x, y) => y - x);
  const p2 = (a - q) ** 2 + (b - q) ** 2 + (c - q) ** 2 + 2 * p1;
  const p = Math.sqrt(p2 / 6);
  const B = M.map((r, i) => r.map((v, j) => (v - (i === j ? q : 0)) / p));
  const det =
    B[0][0] * (B[1][1] * B[2][2] - B[1][2] * B[2][1]) -
    B[0][1] * (B[1][0] * B[2][2] - B[1][2] * B[2][0]) +
    B[0][2] * (B[1][0] * B[2][1] - B[1][1] * B[2][0]);
  const phi = Math.acos(Math.max(-1, Math.min(1, det / 2))) / 3;
  const l1 = q + 2 * p * Math.cos(phi);
  const l3 = q + 2 * p * Math.cos(phi + TAU / 3);
  return [l1, 3 * q - l1 - l3, l3];
}

export const CASES = [
  // === Roots (roots.js; consumers 200, 227) ===================================
  {
    id: 'R1',
    family: 'roots',
    kind: 'analytic',
    title: 'Brent on functions with a known root',
    source:
      'x^2 - 2 on [0, 2]; Wallis x^3 - 2x - 5 on [2, 3] (2.0945514815423265); sin x on [3, 4] (pi); x^9 on [-1, 2] (a flat root); a root at an end',
    why: 'xTol is 1e-14 for the first three, so the bracket is under 1e-14 plus 4 ulp of x: 1e-13 is generous. x^9 is flat, so the width the sign test can resolve is the xTol of 1e-12 and 1e-11 is ten times that. An end that is a root costs no iteration.',
    run() {
      const tight = { xTol: 1e-14 };
      const r2 = brent(x => x * x - 2, 0, 2, tight);
      const wallis = brent(x => x * x * x - 2 * x - 5, 2, 3, tight);
      const pi = brent(Math.sin, 3, 4, tight);
      const flat = brent(x => x ** 9, -1, 2, { maxIter: 300 });
      const end = brent(x => x, 0, 1);
      return [
        measure('x^2 - 2', r2.x, Math.SQRT2, 1e-13),
        measure('Wallis cubic', wallis.x, 2.0945514815423265, 1e-13),
        measure('sin x near pi', pi.x, Math.PI, 1e-13),
        measure('x^9 at 0', flat.x, 0, 1e-11),
        measure('x^9 converged', flat.converged ? 1 : 0, 1, 0),
        measure('root at an end, iterations', end.iterations, 0, 0),
        measure('root at an end, x', end.x, 0, 0),
      ];
    },
  },
  {
    id: 'R2',
    family: 'roots',
    kind: 'analytic',
    title: 'Newton: the square root of two, and the speed of the convergence',
    source: 'x^2 - 2 from x0 = 1; x0 = 1, steps 1.5, 1.41667, 1.4142157, ...',
    why: 'Newton converges quadratically from 1: |dx| of 0.5, 0.083, 0.0025, 2.1e-6, 1.6e-12, so it stops at the fifth step on the 1e-12 test; a sixth is the bound stated here. The value is the root to 1e-15.',
    run() {
      const r = newton(
        x => x * x - 2,
        x => 2 * x,
        1
      );
      const b = newton(
        x => x * x - 2,
        x => 2 * x,
        5,
        { bracket: [0, 2] }
      );
      return [
        measure('sqrt 2', r.x, Math.SQRT2, 1e-15),
        measure('iterations', r.iterations, 0, 6),
        measure(
          'bracketed, sqrt 2 from a start outside',
          b.x,
          Math.SQRT2,
          1e-12
        ),
      ];
    },
  },
  {
    id: 'R3',
    family: 'roots',
    kind: 'analytic',
    title: "Kepler's equation as a residual",
    source:
      'E - e sin E = M, e = 0.9, 60 values of M in (0, 2 pi); brent and bracketed newton',
    why: 'The root of a function the solver is given is checked by putting it back: the residual of E - e sin E - M is under 1e-14 (a few ulp of E near 2 pi), whichever solver, at an eccentricity where plain Newton from M is known to fail.',
    run() {
      let worstB = 0;
      let worstN = 0;
      const e = 0.9;
      for (let k = 1; k <= 60; k++) {
        const M = (k * TAU) / 61;
        const f = E => E - e * Math.sin(E) - M;
        const x = brent(f, 0, TAU, { xTol: 1e-14 }).x;
        const y = newton(f, E => 1 - e * Math.cos(E), M, {
          bracket: [0, TAU],
          xTol: 1e-14,
        }).x;
        worstB = Math.max(worstB, Math.abs(f(x)));
        worstN = Math.max(worstN, Math.abs(f(y)));
      }
      return [
        measure('brent residual', worstB, 0, 1e-14),
        measure('bracketed newton residual', worstN, 0, 1e-14),
      ];
    },
  },
  {
    id: 'R4',
    family: 'roots',
    kind: 'oracle',
    title: 'Brent against plain bisection, and against bracketed Newton',
    source:
      'six functions on their brackets; bisection to 1e-15 is the reference',
    why: 'Brent stops within about 5e-13 of the root at xTol 1e-12 and bisection within 1e-15, so they agree to 1e-12; two of them are 2e-12 apart at most. Brent must also earn its place: cos x - x to 1e-12 takes bisection 40 steps and Brent at most 12 evaluations beyond the two end values.',
    run() {
      const fs = [
        { f: x => Math.cos(x) - x, df: x => -Math.sin(x) - 1, a: 0, b: 1 },
        { f: x => x * x * x - 2 * x - 5, df: x => 3 * x * x - 2, a: 2, b: 3 },
        { f: x => Math.exp(x) - 3 * x, df: x => Math.exp(x) - 3, a: 0, b: 1 },
        {
          f: x => x * Math.exp(x) - 1,
          df: x => (1 + x) * Math.exp(x),
          a: 0,
          b: 1,
        },
        {
          f: x => Math.log(x) - 1 / x,
          df: x => 1 / x + 1 / (x * x),
          a: 1,
          b: 3,
        },
        {
          f: x => Math.tan(x) - 2 * x,
          df: x => 1 / Math.cos(x) ** 2 - 2,
          a: 1,
          b: 1.3,
        },
      ];
      let worstBisect = 0;
      let worstNewton = 0;
      for (const { f, df, a, b } of fs) {
        const x = brent(f, a, b).x;
        worstBisect = Math.max(worstBisect, Math.abs(x - bisect(f, a, b)));
        const y = newton(f, df, 0.5 * (a + b), { bracket: [a, b] }).x;
        worstNewton = Math.max(worstNewton, Math.abs(x - y));
      }
      const cos = brent(x => Math.cos(x) - x, 0, 1, { xTol: 1e-12 });
      return [
        measure('brent vs bisection', worstBisect, 0, 2e-12),
        measure('brent vs bracketed newton', worstNewton, 0, 2e-12),
        measure('brent iterations on cos x - x', cos.iterations, 0, 12),
        measure(
          'bisection steps on the same bracket',
          bisectionSteps(1, 1e-12),
          40,
          0
        ),
      ];
    },
  },
  {
    id: 'R5',
    family: 'roots',
    kind: 'ensemble',
    title: 'Two thousand seeded cubics',
    source:
      'a x^3 + b x^2 + c x + d, coefficients uniform in (-5, 5), seed 1521; the bracket is the first sign change on a scan of 2001 points of [-10, 10]',
    why: "Brent and bisection run on the same floating-point function and bracket, so they must land on the same root up to what the function can resolve: 2e-12 plus 50 ulp of the largest term divided by |f'|, the backward-error bound of a root. A near-double root loosens the bound with its slope, as it should. The fraction outside it must be zero.",
    run() {
      const r = rng(1521);
      let used = 0;
      let outside = 0;
      for (let k = 0; k < 2000; k++) {
        const [a, b, c, d] = [0, 0, 0, 0].map(() => r.uniform(-5, 5));
        const f = x => ((a * x + b) * x + c) * x + d;
        let lo = null;
        let hi = null;
        let prev = f(-10);
        for (let i = 1; i <= 2000 && lo === null; i++) {
          const x = -10 + (20 * i) / 2000;
          const v = f(x);
          if (prev < 0 !== v < 0) {
            lo = x - 0.01;
            hi = x;
          }
          prev = v;
        }
        if (lo === null) continue;
        used++;
        const x = brent(f, lo, hi).x;
        const ref = bisect(f, lo, hi);
        const slope = Math.abs((3 * a * x + 2 * b) * x + c);
        const scale =
          1000 * Math.abs(a) +
          100 * Math.abs(b) +
          10 * Math.abs(c) +
          Math.abs(d);
        if (Math.abs(x - ref) > 2e-12 + (50 * EPS * scale) / slope) outside++;
      }
      return [
        measure('cubics used', used >= 1900 ? 1 : 0, 1, 0),
        measure('roots outside the bound', outside, 0, 0),
      ];
    },
  },
  {
    id: 'R6',
    family: 'roots',
    kind: 'negative',
    title: 'What the root finders refuse or report',
    source:
      'an unbracketed interval, a NaN end, too few iterations, a stationary start, a diverging Newton',
    why: 'Each is a count of the right outcome against what must happen: a RangeError for no sign change (three ways), converged false when the iteration limit is hit and when Newton has no derivative, and the contrast that matters: plain Newton on atan(x) from 3 diverges and the bracketed one reaches 0.',
    run() {
      const f = x => Math.cos(x) - x;
      const plain = newton(Math.atan, x => 1 / (1 + x * x), 3, { maxIter: 50 });
      const safe = newton(Math.atan, x => 1 / (1 + x * x), 3, {
        bracket: [-1, 4],
        xTol: 1e-14,
      });
      return [
        measure(
          'brent, no sign change, RangeError',
          throws(() => brent(x => x * x + 1, -1, 1)),
          1,
          0
        ),
        measure(
          'brent, NaN at an end, RangeError',
          throws(() => brent(() => NaN, 0, 1)),
          1,
          0
        ),
        measure(
          'newton bracket, no sign change, RangeError',
          throws(() =>
            newton(
              x => x * x + 1,
              x => 2 * x,
              0.5,
              { bracket: [-1, 1] }
            )
          ),
          1,
          0
        ),
        measure(
          'brent, 3 iterations allowed, converged',
          brent(f, 0, 1, { maxIter: 3 }).converged ? 1 : 0,
          0,
          0
        ),
        measure(
          'newton at a stationary point, converged',
          newton(
            x => x * x - 1,
            x => 2 * x,
            0
          ).converged
            ? 1
            : 0,
          0,
          0
        ),
        measure(
          'plain newton on atan from 3, converged',
          plain.converged ? 1 : 0,
          0,
          0
        ),
        measure('bracketed newton on atan from 3', safe.x, 0, 1e-10),
        measure(
          'bracketed newton on atan, converged',
          safe.converged ? 1 : 0,
          1,
          0
        ),
      ];
    },
  },
  {
    id: 'R7',
    family: 'roots',
    kind: 'authentic',
    title: 'Roots of three physical equations, to published digits',
    source:
      'Wien: (x - 5) e^x + 5 = 0, x = 4.965114231744276; Planck frequency peak: (x - 3) e^x + 3 = 0, x = 2.821439372122079; omega constant: x e^x = 1, x = 0.5671432904097838; Dottie number cos x = x, 0.7390851332151607',
    why: 'The constants are the standard ones (the Wien and Planck displacement roots behind b = h c / k x; the Lambert W(1) and the fixed point of cosine) to 16 digits; brent at xTol 1e-14 reaches them to 1e-13 on both engines, whose exp and cos differ by an ulp.',
    run() {
      const t = { xTol: 1e-14 };
      return [
        measure(
          'Wien displacement root',
          brent(x => (x - 5) * Math.exp(x) + 5, 1, 10, t).x,
          4.965114231744276,
          1e-13
        ),
        measure(
          'Planck frequency-peak root',
          brent(x => (x - 3) * Math.exp(x) + 3, 1, 10, t).x,
          2.821439372122079,
          1e-13
        ),
        measure(
          'omega constant',
          brent(x => x * Math.exp(x) - 1, 0, 1, t).x,
          0.5671432904097838,
          1e-13
        ),
        measure(
          'Dottie number',
          brent(x => Math.cos(x) - x, 0, 1, t).x,
          0.7390851332151607,
          1e-13
        ),
      ];
    },
  },

  // === Quadrature (quadrature.js; consumers 200, 255) ==========================
  {
    id: 'Q1',
    family: 'quadrature',
    kind: 'analytic',
    title: 'Gauss-Legendre on integrals with a closed form',
    source:
      'sin on [0, pi] (2); e^x on [0, 1] (e - 1); x^31 on [0, 1] (1/32, the degree the rule is exact to); 1/(1 + 25 x^2) on [-1, 1] in 8 panels (2 atan(5)/5); reversed limits; no width; e^(-u/2) in u = ln(1 + z), the Einstein-de Sitter distance',
    why: 'Sixteen nodes integrate a polynomial of degree 31 exactly, so x^31 is right to the 16 digits the weights are stored to (1e-15). The Runge function has poles at +-0.2i; 8 panels of half-width 0.125 put them 3 half-widths out and the error under 1e-13. The Einstein-de Sitter integral is the flat matter-only comoving distance in the variable the cosmology kernel integrates in.',
    run() {
      const z = 3.7;
      return [
        measure(
          'sin on [0, pi]',
          gaussLegendre(Math.sin, 0, Math.PI),
          2,
          1e-14
        ),
        measure(
          'e^x on [0, 1]',
          gaussLegendre(Math.exp, 0, 1),
          Math.E - 1,
          1e-15
        ),
        measure(
          'x^31 on [0, 1]',
          gaussLegendre(x => x ** 31, 0, 1),
          1 / 32,
          1e-15
        ),
        measure(
          'Runge function, 8 panels',
          gaussLegendre(x => 1 / (1 + 25 * x * x), -1, 1, 8),
          (2 * Math.atan(5)) / 5,
          1e-13
        ),
        measure(
          'reversed limits',
          gaussLegendre(Math.sin, Math.PI, 0),
          -2,
          1e-14
        ),
        measure('zero width', gaussLegendre(Math.sin, 1, 1), 0, 0),
        measure(
          'Einstein-de Sitter in u = ln(1 + z), relative',
          gaussLegendre(u => Math.exp(-u / 2), 0, Math.log1p(z), 4) /
            (2 * (1 - 1 / Math.sqrt(1 + z))),
          1,
          1e-14
        ),
      ];
    },
  },
  {
    id: 'Q2',
    family: 'quadrature',
    kind: 'analytic',
    title: 'Adaptive Gauss-Legendre reaches its tolerance and says so',
    source:
      '4/(1 + x^2) on [0, 1] (pi); e^(-x) on [0, 10] (1 - e^-10); sqrt(x) on [0, 1] (2/3, an endpoint singularity of the derivative); a narrow peak found by splitting at it',
    why: 'The default tolerances are absTol 1e-12 and relTol 1e-10, so 1e-9 is the stated accuracy on the smooth ones. sqrt(x) converges slowly at 0 and is held to 1e-8 with maxDepth 40. A peak of width 1e-3 inside [0, 1] is missed by the first panel (see N1) and found, to 1e-10, when the caller splits at it.',
    run() {
      const a = adaptive(x => 4 / (1 + x * x), 0, 1);
      const e = adaptive(x => Math.exp(-x), 0, 10);
      const s = adaptive(Math.sqrt, 0, 1, { maxDepth: 40 });
      const peak = x => Math.exp(-(((x - 0.3) / 0.001) ** 2));
      const split = adaptive(peak, 0, 0.3).value + adaptive(peak, 0.3, 1).value;
      return [
        measure('4/(1 + x^2)', a.value, Math.PI, 1e-9),
        measure('4/(1 + x^2) converged', a.converged ? 1 : 0, 1, 0),
        measure('e^-x on [0, 10]', e.value, 1 - Math.exp(-10), 1e-9),
        measure('sqrt(x) on [0, 1]', s.value, 2 / 3, 1e-8),
        measure(
          'narrow peak, split at it',
          split,
          0.001 * Math.sqrt(Math.PI),
          1e-10
        ),
      ];
    },
  },
  {
    id: 'Q3',
    family: 'quadrature',
    kind: 'oracle',
    title: "Bit for bit against the cosmology kernel's own rule",
    source:
      "tests/fixtures/numericLegacy/flrwGl.js, flrw.js's tables and gl verbatim at 2a6ce1c5, on five integrands, four intervals and panel counts 1 to 9; and createCosmology's comovingDistance, lookbackTime and age (flrw.js now calls the module) against the same arithmetic through the verbatim copy",
    why: "The rule the module extracts is flrw.js's, so adopting it changes no bit of any distance, time or age (flrw.js adopted it in this prompt, and the kernel is compared with the verbatim copy of what it held): the count of results that differ in any bit, in one process (so one engine), must be 0. This is the compatibility proof a consumer's move needs.",
    run() {
      const fs = [
        Math.sin,
        Math.exp,
        x => 1 / (1 + x * x),
        x => x ** 7 - x,
        Math.cosh,
      ];
      const spans = [
        [0, 1],
        [-2, 3],
        [0.5, 0.75],
        [1, -1],
      ];
      const a = [];
      const b = [];
      for (const f of fs)
        for (const [lo, hi] of spans)
          for (let n = 1; n <= 9; n++) {
            a.push(legacyGl(f, lo, hi, n));
            b.push(gaussLegendre(f, lo, hi, n));
          }
      const cosmo = { H0: 70, Om: 0.3, OL: 0.7 };
      const k = createCosmology(cosmo);
      const E = k.E;
      const dh = 299792.458 / 70;
      const panels = z => Math.max(1, Math.ceil(Math.log1p(z) / 0.25));
      const integ = (g, z) =>
        z > 0
          ? legacyGl(
              u => g(Math.expm1(u)) * Math.exp(u),
              0,
              Math.log1p(z),
              panels(z)
            )
          : 0;
      const zs = [0, 0.01, 0.1, 0.5, 1, 2, 5, 10];
      const kernel = [];
      const mine = [];
      for (const z of zs) {
        kernel.push(k.comovingDistance(z), k.lookbackTime(z));
        mine.push(
          dh * integ(zp => 1 / E(zp), z),
          (GYR_PER_INV_H0 / 70) * integ(zp => 1 / ((1 + zp) * E(zp)), z)
        );
      }
      kernel.push(k.age());
      mine.push(
        (GYR_PER_INV_H0 / 70) *
          legacyGl(
            s => (2 * s * s) / Math.sqrt(0.3 + k.Ok * s * s + 0.7 * s ** 6),
            0,
            1,
            4
          )
      );
      return [
        measure(
          'rule vs flrw.js gl, results differing in a bit',
          mismatches(a, b),
          0,
          0
        ),
        measure(
          'kernel distances, times and age, differing in a bit',
          mismatches(kernel, mine),
          0,
          0
        ),
        measure('results compared', a.length + kernel.length, 180 + 17, 0),
      ];
    },
  },
  {
    id: 'Q4',
    family: 'quadrature',
    kind: 'oracle',
    title: 'Against composite Simpson, an independent rule',
    source:
      'sin on [0, pi], e^x on [0, 2], 1/(1 + x^2) on [-3, 3], x^3 e^(-x) on [0, 20], Simpson with 20000 intervals',
    why: 'Simpson at h = 1.6e-4 has a truncation error near 1e-17 and a rounding error under 1e-13 over 20000 terms; two independent rules that agree to 1e-12 on smooth integrands are both right to that.',
    run() {
      const cases = [
        [Math.sin, 0, Math.PI],
        [Math.exp, 0, 2],
        [x => 1 / (1 + x * x), -3, 3],
        [x => x ** 3 * Math.exp(-x), 0, 20],
      ];
      let g = 0;
      let ad = 0;
      for (const [f, a, b] of cases) {
        const s = simpson(f, a, b, 20000);
        g = Math.max(g, Math.abs(gaussLegendre(f, a, b, 8) - s) / Math.abs(s));
        ad = Math.max(ad, Math.abs(adaptive(f, a, b).value - s) / Math.abs(s));
      }
      return [
        measure('gaussLegendre, 8 panels, relative', g, 0, 1e-12),
        measure('adaptive, relative', ad, 0, 1e-12),
      ];
    },
  },
  {
    id: 'Q5',
    family: 'quadrature',
    kind: 'ensemble',
    title: 'Random polynomials, exact, and random oscillations, covered',
    source:
      'A: 1000 polynomials of degree 0 to 31, coefficients uniform in (-1, 1), on random intervals in [-2, 2], one panel, seed 3101, against the exact antiderivative. B: 400 sums of three sines (frequencies 5 to 30) on [0, 10], adaptive at relTol 1e-8, seed 3102, against the closed form',
    why: "A: a degree-31 polynomial is integrated exactly by 16 nodes, so the error is the rounding of the sum: under 1e-14 of the sum of the terms' sizes. B: the reported error is an estimate and not a bound, so the claim is the usual one, that the true error is below 10 times it plus 1e-13; the fraction outside must be zero.",
    run() {
      const r = rng(3101);
      let badA = 0;
      for (let k = 0; k < 1000; k++) {
        const deg = r.int(0, 31);
        const c = Array.from({ length: deg + 1 }, () => r.uniform(-1, 1));
        const lo = r.uniform(-2, 1);
        const hi = lo + r.uniform(0.1, 2);
        const f = x => c.reduceRight((s, v) => s * x + v, 0);
        const exactAt = x =>
          c.reduceRight((s, v, i) => s * x + v / (i + 1), 0) * x;
        const scale = c.reduce(
          (s, v, i) =>
            s +
            (Math.abs(v) *
              (Math.abs(lo) ** (i + 1) + Math.abs(hi) ** (i + 1))) /
              (i + 1),
          0
        );
        if (
          Math.abs(gaussLegendre(f, lo, hi) - (exactAt(hi) - exactAt(lo))) >
          1e-14 * scale
        )
          badA++;
      }
      const q = rng(3102);
      let badB = 0;
      let split = 0;
      for (let k = 0; k < 400; k++) {
        const terms = [0, 1, 2].map(() => ({
          A: q.uniform(0.2, 1),
          w: q.uniform(5, 30),
          p: q.uniform(0, TAU),
        }));
        const f = x =>
          terms.reduce((s, t) => s + t.A * Math.sin(t.w * x + t.p), 0);
        const truth = terms.reduce(
          (s, t) =>
            s + (t.A * (Math.cos(t.p) - Math.cos(10 * t.w + t.p))) / t.w,
          0
        );
        const out = adaptive(f, 0, 10, { relTol: 1e-8 });
        if (out.evaluations > 16 * 3) split++;
        if (Math.abs(out.value - truth) > 10 * out.error + 1e-13) badB++;
      }
      return [
        measure('polynomials outside 1e-14 of their scale', badA, 0, 0),
        measure('oscillations outside 10 x error + 1e-13', badB, 0, 0),
        measure(
          'oscillations that needed a split (the test is not vacuous)',
          split >= 100 ? 1 : 0,
          1,
          0
        ),
      ];
    },
  },
  {
    id: 'Q6',
    family: 'quadrature',
    kind: 'negative',
    title: 'What adaptive quadrature cannot see, and says',
    source:
      'a NaN integrand, a step at 1/3, a peak of width 0.001 at 0.3 on [0, 1]',
    why: "NaN and the step are reported as not converged (the step's answer is within 1e-5 of 1/3 all the same, from splitting 20 times). The peak is the limit stated in the contract: 16 nodes on [0, 1] are 0.06 apart and none lies inside it, so the answer is 0 and converged is true; only a caller who knows where the peak is can split there (Q2).",
    run() {
      const nan = adaptive(() => NaN, 0, 1);
      const step = adaptive(x => (x < 1 / 3 ? 1 : 0), 0, 1);
      const peak = adaptive(x => Math.exp(-(((x - 0.3) / 0.001) ** 2)), 0, 1);
      return [
        measure('NaN integrand, converged', nan.converged ? 1 : 0, 0, 0),
        measure('step, converged', step.converged ? 1 : 0, 0, 0),
        measure('step, value', step.value, 1 / 3, 1e-5),
        measure('missed peak, value', peak.value, 0, 1e-12),
        measure(
          'missed peak, converged (true: it cannot know)',
          peak.converged ? 1 : 0,
          1,
          0
        ),
      ];
    },
  },
  {
    id: 'Q7',
    family: 'quadrature',
    kind: 'authentic',
    title: 'Three integrals with published values',
    source:
      'Stefan-Boltzmann: the integral of x^3/(e^x - 1) over (0, inf) is pi^4/15 (cut at 60, e^-60 below 1e-21); the Gaussian integral, sqrt(pi); the complete elliptic integral K(m = 0.5) = 1.8540746773013719 (Abramowitz and Stegun, table 17.1)',
    why: 'The first is the integral behind the Stefan-Boltzmann constant, the second the normalisation of every normal distribution, the third a tabulated special function; each to its published digits, to 1e-9 relative on the adaptive rule (1e-12 on the smooth two).',
    run() {
      const sb = adaptive(x => x ** 3 / Math.expm1(x), 0, 60).value;
      const g = adaptive(x => Math.exp(-x * x), -8, 8).value;
      const k = adaptive(
        t => 1 / Math.sqrt(1 - 0.5 * Math.sin(t) ** 2),
        0,
        Math.PI / 2
      ).value;
      return [
        measure(
          'Stefan-Boltzmann integral, relative to pi^4/15',
          sb / (Math.PI ** 4 / 15),
          1,
          1e-9
        ),
        measure('Gaussian integral', g, Math.sqrt(Math.PI), 1e-12),
        measure('K(m = 0.5)', k, 1.8540746773013719, 1e-12),
      ];
    },
  },

  // === Interpolation (interp.js; consumers 219, 255) ===========================
  {
    id: 'I1',
    family: 'interpolation',
    kind: 'analytic',
    title: 'Lines and cubics are reproduced; the interval search',
    source:
      'linear on y = 3x - 2 inside, clamped and extrapolated; a natural spline on a line; a clamped spline with the true end slopes on x^3 - 2x^2 + x - 5 at six uneven nodes, value and slope; locate on [0, 1, 2, 3]',
    why: "A line is in every one of these spaces and a cubic in the clamped spline's, so the answer is exact up to rounding: 1e-12 for the line, 1e-11 for the cubic (its values reach 5) and 1e-10 for its slope. locate is a count of right answers.",
    run() {
      const xs = [0, 0.4, 1.1, 1.5, 2.6, 3];
      const line = xs.map(x => 3 * x - 2);
      const cub = x => x ** 3 - 2 * x * x + x - 5;
      const cubD = x => 3 * x * x - 4 * x + 1;
      const nat = cubicSpline(xs, line);
      const cl = cubicSpline(xs, xs.map(cub), { d0: cubD(0), d1: cubD(3) });
      let wl = 0;
      let wn = 0;
      let wc = 0;
      let ws = 0;
      for (let k = 0; k <= 60; k++) {
        const x = (3 * k) / 60;
        wl = Math.max(wl, Math.abs(linear(xs, line, x) - (3 * x - 2)));
        wn = Math.max(wn, Math.abs(nat.at(x) - (3 * x - 2)));
        wc = Math.max(wc, Math.abs(cl.at(x) - cub(x)));
        ws = Math.max(ws, Math.abs(cl.slope(x) - cubD(x)));
      }
      const lx = [0, 1, 2, 3];
      const want = [
        [-1, 0],
        [0, 0],
        [1, 1],
        [2.9, 2],
        [3, 2],
        [10, 2],
      ];
      return [
        measure('linear on a line', wl, 0, 1e-12),
        measure(
          'extrapolate beyond the end',
          linear(xs, line, 4, 'extrapolate'),
          10,
          1e-12
        ),
        measure('clamp beyond the end', linear(xs, line, 4), 7, 0),
        measure('natural spline on a line', wn, 0, 1e-12),
        measure('clamped spline on a cubic', wc, 0, 1e-11),
        measure('clamped spline slope on a cubic', ws, 0, 1e-10),
        measure(
          'locate, wrong answers',
          want.filter(([x, i]) => locate(lx, x) !== i).length,
          0,
          0
        ),
      ];
    },
  },
  {
    id: 'I2',
    family: 'interpolation',
    kind: 'analytic',
    title: 'Convergence order: 2 for linear, 4 for the clamped spline',
    source:
      'sin on [0, pi] with 11, 21 and 41 nodes; the order is log2 of the ratio of the largest errors over 2000 points',
    why: 'Linear interpolation is second order and a clamped cubic spline fourth: the measured order must be within 0.3 of 2 and 0.5 of 4. A spline that is silently only second order (a wrong end condition, a wrong coefficient) fails here and passes the cubic test of I1.',
    run() {
      const err = (n, kind) => {
        const xs = Array.from({ length: n }, (_, i) => (Math.PI * i) / (n - 1));
        const ys = xs.map(Math.sin);
        const s = cubicSpline(xs, ys, { d0: 1, d1: -1 });
        let w = 0;
        for (let k = 0; k <= 2000; k++) {
          const x = (Math.PI * k) / 2000;
          const v = kind === 'linear' ? linear(xs, ys, x) : s.at(x);
          w = Math.max(w, Math.abs(v - Math.sin(x)));
        }
        return w;
      };
      const order = (kind, a, b) => Math.log2(err(a, kind) / err(b, kind));
      return [
        measure('linear, 11 to 21 nodes', order('linear', 11, 21), 2, 0.3),
        measure('linear, 21 to 41 nodes', order('linear', 21, 41), 2, 0.3),
        measure(
          'clamped spline, 11 to 21 nodes',
          order('spline', 11, 21),
          4,
          0.5
        ),
        measure(
          'clamped spline, 21 to 41 nodes',
          order('spline', 21, 41),
          4,
          0.5
        ),
      ];
    },
  },
  {
    id: 'I3',
    family: 'interpolation',
    kind: 'oracle',
    title: 'The spline against its defining conditions and a second evaluation',
    source:
      'a natural spline through 12 uneven nodes of a seeded smooth function: values at the nodes, continuity of the slope across each interior node, zero second derivative at the ends, and the same piecewise cubic evaluated from its coefficients (y, b, m/2, (m1 - m0)/6h) rather than from the A and B form',
    why: 'These are the conditions that define a natural spline, checked on the output: it passes through the data (1e-12), its slope is continuous (the slopes 1e-9 either side of a node differ by 2e-9 times the curvature, under 1e-8), its end curvature is zero (a one-sided difference of the slope over 1e-6 is under 1e-4 of the largest curvature scale), and a different arithmetic of the same cubic gives the same numbers to 1e-12.',
    run() {
      const r = rng(4401);
      const n = 12;
      let x = 0;
      const xs = Array.from({ length: n }, () => (x += r.uniform(0.3, 1)));
      const ys = xs.map(v => Math.sin(1.3 * v) + 0.2 * v);
      const s = cubicSpline(xs, ys);
      const eps = 1e-9;
      let atNodes = 0;
      let slopeJump = 0;
      for (let i = 0; i < n; i++) {
        atNodes = Math.max(atNodes, Math.abs(s.at(xs[i]) - ys[i]));
        if (i > 0 && i < n - 1)
          slopeJump = Math.max(
            slopeJump,
            Math.abs(s.slope(xs[i] - eps) - s.slope(xs[i] + eps))
          );
      }
      const d = 1e-6;
      const endCurv = Math.max(
        Math.abs(s.slope(xs[0] + d) - s.slope(xs[0])) / d,
        Math.abs(s.slope(xs[n - 1]) - s.slope(xs[n - 1] - d)) / d
      );
      // The second derivatives from a dense solve of the same natural system.
      const m = (() => {
        const A = Array.from({ length: n }, () => new Array(n).fill(0));
        const rhs = new Array(n).fill(0);
        A[0][0] = 1;
        A[n - 1][n - 1] = 1;
        for (let i = 1; i < n - 1; i++) {
          const h0 = xs[i] - xs[i - 1];
          const h1 = xs[i + 1] - xs[i];
          A[i][i - 1] = h0;
          A[i][i] = 2 * (h0 + h1);
          A[i][i + 1] = h1;
          rhs[i] = 6 * ((ys[i + 1] - ys[i]) / h1 - (ys[i] - ys[i - 1]) / h0);
        }
        return solve(A, rhs);
      })();
      let second = 0;
      for (let k = 0; k <= 600; k++) {
        const v = xs[0] + ((xs[n - 1] - xs[0]) * k) / 600;
        const i = Math.min(n - 2, locate(xs, v));
        const h = xs[i + 1] - xs[i];
        const dx = v - xs[i];
        const b = (ys[i + 1] - ys[i]) / h - (h * (2 * m[i] + m[i + 1])) / 6;
        const y =
          ys[i] +
          b * dx +
          (m[i] / 2) * dx * dx +
          ((m[i + 1] - m[i]) / (6 * h)) * dx ** 3;
        second = Math.max(second, Math.abs(y - s.at(v)));
      }
      return [
        measure('values at the nodes', atNodes, 0, 1e-12),
        measure('slope jump across interior nodes', slopeJump, 0, 1e-8),
        measure('end curvature', endCurv, 0, 1e-4),
        measure('coefficient form vs the evaluation', second, 0, 1e-12),
      ];
    },
  },
  {
    id: 'I4',
    family: 'interpolation',
    kind: 'ensemble',
    title: 'Three hundred seeded smooth functions against the classical bound',
    source:
      'f = sum of three sines, amplitudes 0.2 to 1, wave numbers 0.5 to 3, on [0, 6] with 21 nodes (h = 0.3), the clamped spline with the true end slopes, 1000 points each, seed 5201',
    why: 'For a clamped cubic spline the error is at most (5/384) h^4 max|f""| (Hall and Meyer). Here max|f""| is at most the sum of A k^4, so the bound is a real one and the number of points outside it must be zero. The bound is not tight by a factor of about 3, so the test cannot pass by accident of a loose tolerance: it must hold at every point.',
    run() {
      const r = rng(5201);
      let outside = 0;
      let worstRatio = 0;
      for (let t = 0; t < 300; t++) {
        const terms = [0, 1, 2].map(() => ({
          A: r.uniform(0.2, 1),
          k: r.uniform(0.5, 3),
          p: r.uniform(0, TAU),
        }));
        const f = x =>
          terms.reduce((s, q) => s + q.A * Math.sin(q.k * x + q.p), 0);
        const df = x =>
          terms.reduce((s, q) => s + q.A * q.k * Math.cos(q.k * x + q.p), 0);
        const xs = Array.from({ length: 21 }, (_, i) => 0.3 * i);
        const s = cubicSpline(xs, xs.map(f), { d0: df(0), d1: df(6) });
        const bound =
          (5 / 384) * 0.3 ** 4 * terms.reduce((a, q) => a + q.A * q.k ** 4, 0);
        for (let i = 0; i <= 1000; i++) {
          const x = 0.006 * i;
          const e = Math.abs(s.at(x) - f(x));
          worstRatio = Math.max(worstRatio, e / bound);
          if (e > bound) outside++;
        }
      }
      return [
        measure('points outside the bound', outside, 0, 0),
        measure('worst error as a fraction of the bound', worstRatio, 0.1, 0.9),
      ];
    },
  },
  {
    id: 'I5',
    family: 'interpolation',
    kind: 'negative',
    title: 'Tables the routines refuse, and the end conditions',
    source:
      'xs not increasing, a repeated x, mismatched lengths, a NaN y, one point; a NaN query; outside="nan"; two points',
    why: 'A bad table is a RangeError when the spline is built, never a silent wrong answer; a NaN query is NaN and so is a query outside the table when asked to be; two points are a straight line whichever end condition is asked for.',
    run() {
      const xs = [0, 1, 2];
      const ys = [0, 1, 4];
      const two = cubicSpline([0, 2], [1, 5]);
      return [
        measure(
          'decreasing x',
          throws(() => cubicSpline([0, 2, 1], ys)),
          1,
          0
        ),
        measure(
          'repeated x',
          throws(() => cubicSpline([0, 1, 1], ys)),
          1,
          0
        ),
        measure(
          'length mismatch',
          throws(() => cubicSpline(xs, [0, 1])),
          1,
          0
        ),
        measure(
          'NaN y',
          throws(() => cubicSpline(xs, [0, NaN, 4])),
          1,
          0
        ),
        measure(
          'one point',
          throws(() => cubicSpline([0], [0])),
          1,
          0
        ),
        measure(
          'NaN query, linear',
          Number.isNaN(linear(xs, ys, NaN)) ? 1 : 0,
          1,
          0
        ),
        measure(
          'outside a table, nan mode',
          Number.isNaN(linear(xs, ys, 3, 'nan')) ? 1 : 0,
          1,
          0
        ),
        measure('two points, at the middle', two.at(1), 3, 1e-15),
        measure('two points, slope', two.slope(0.5), 2, 1e-15),
      ];
    },
  },
  {
    id: 'I6',
    family: 'interpolation',
    kind: 'authentic',
    title: "The cosmology kernel's distances, tabulated and interpolated",
    source:
      "createCosmology({H0: 70, Om: 0.3, OL: 0.7}) comoving distance on z = 0, 0.1, ..., 2 (21 nodes), clamped with the slope c/(H0 E(z)) at both ends, 400 intermediate redshifts; the kernel's own value is the truth",
    why: "This is consumer 255's use: a distance table read at a redshift between rows. The kernel is validated against astropy to 1.8e-12; the spline must reproduce it to 2e-5 relative (the classical bound with h = 0.1 and the fourth derivative of D_C gives about 5e-6), and the slope from the kernel's E makes the end conditions exact.",
    run() {
      const k = createCosmology({ H0: 70, Om: 0.3, OL: 0.7 });
      const dh = 299792.458 / 70;
      const zs = Array.from({ length: 21 }, (_, i) => 0.1 * i);
      const s = cubicSpline(zs, zs.map(k.comovingDistance), {
        d0: dh / k.E(0),
        d1: dh / k.E(2),
      });
      let worst = 0;
      for (let i = 1; i <= 400; i++) {
        const z = (2 * i) / 401;
        worst = Math.max(worst, Math.abs(s.at(z) / k.comovingDistance(z) - 1));
      }
      return [
        measure('relative error of the interpolated distance', worst, 0, 2e-5),
      ];
    },
  },

  // === Linear algebra (linalg.js; consumers 154, 256) ===========================
  {
    id: 'L1',
    family: 'linear algebra',
    kind: 'analytic',
    title: 'The Hilbert matrix and its exact integer inverse',
    source:
      'H(i, j) = 1/(i + j - 1), n = 3 to 6; the inverse has the integer entries (-1)^(i+j) (i + j - 1) C(n+i-1, n-j) C(n+j-1, n-i) C(i+j-2, i-1)^2; the condition numbers are 524, 1.55e4, 4.77e5, 1.50e7',
    why: 'A backward-stable method loses cond x eps of relative accuracy; each routine is held to 100 cond eps (a hundred times what it should lose), worst entry over the inverse from invertSpd, inverse and the columns of solveSpd and solve. A pivoting or factorisation bug costs orders of magnitude more.',
    run() {
      const out = [];
      for (const n of [3, 4, 5, 6]) {
        const H = hilbert(n);
        const exact = hilbertInverse(n);
        const tol = 100 * HILBERT_COND[n] * EPS;
        const rel = M => {
          let w = 0;
          for (let i = 0; i < n; i++)
            for (let j = 0; j < n; j++)
              w = Math.max(
                w,
                Math.abs(M[i][j] - exact[i][j]) / Math.abs(exact[i][j])
              );
          return w;
        };
        const cols = f =>
          Array.from({ length: n }, (_, j) =>
            f(
              H,
              Array.from({ length: n }, (__, i) => (i === j ? 1 : 0))
            )
          );
        const T = cols_ => cols_[0].map((_, i) => cols_.map(c => c[i]));
        out.push(
          measure(`n = ${n}, invertSpd`, rel(invertSpd(H)), 0, tol),
          measure(`n = ${n}, inverse`, rel(inverse(H)), 0, tol),
          measure(`n = ${n}, solveSpd columns`, rel(T(cols(solveSpd))), 0, tol),
          measure(`n = ${n}, solve columns`, rel(T(cols(solve))), 0, tol)
        );
      }
      return out;
    },
  },
  {
    id: 'L2',
    family: 'linear algebra',
    kind: 'analytic',
    title: 'Small eigenvalue problems with closed forms, and an exact factor',
    source:
      '[[2, 1], [1, 2]] (3, 1); the second-difference matrix tridiag(-1, 2, -1) of order 3 (2 + sqrt 2, 2, 2 - sqrt 2); the Cholesky factor of [[4, 12, -16], [12, 37, -43], [-16, -43, 98]], the integer matrix [[2, 0, 0], [6, 1, 0], [-8, 5, 3]]',
    why: 'The eigenvalues are closed forms to 1e-13; each eigenpair must satisfy A v = lambda v to 1e-13 and have unit length. The Cholesky factor is integer and every step of the algorithm is exact on it, so it must be reproduced exactly.',
    run() {
      const e2 = eigenSymmetric([
        [2, 1],
        [1, 2],
      ]);
      const T = [
        [2, -1, 0],
        [-1, 2, -1],
        [0, -1, 2],
      ];
      const e3 = eigenSymmetric(T);
      const L = cholesky([
        [4, 12, -16],
        [12, 37, -43],
        [-16, -43, 98],
      ]);
      const want = [
        [2, 0, 0],
        [6, 1, 0],
        [-8, 5, 3],
      ];
      let residual = 0;
      let unit = 0;
      for (const { value, vector } of e3) {
        const Av = matVec(T, vector);
        residual = Math.max(
          residual,
          ...Av.map((v, i) => Math.abs(v - value * vector[i]))
        );
        unit = Math.max(unit, Math.abs(Math.hypot(...vector) - 1));
      }
      return [
        measure('2 x 2, larger', e2[0].value, 3, 1e-14),
        measure('2 x 2, smaller', e2[1].value, 1, 1e-14),
        measure('3 x 3, 2 + sqrt 2', e3[0].value, 2 + Math.SQRT2, 1e-13),
        measure('3 x 3, 2', e3[1].value, 2, 1e-13),
        measure('3 x 3, 2 - sqrt 2', e3[2].value, 2 - Math.SQRT2, 1e-13),
        measure('3 x 3, A v - lambda v', residual, 0, 1e-13),
        measure('3 x 3, |v| - 1', unit, 0, 1e-13),
        measure(
          'Cholesky factor, entries differing',
          mismatches(flat(L), flat(want)),
          0,
          0
        ),
      ];
    },
  },
  {
    id: 'L3',
    family: 'linear algebra',
    kind: 'oracle',
    title: 'Bit for bit against js/inference/fit.js, the authority',
    source:
      'tests/fixtures/numericLegacy/fitLinalg.js (solveSpd, invertSpd, eigenSymmetric verbatim at 2a6ce1c5) and the live js/inference/fit.js, on 300 seeded SPD matrices of order 2 to 6 with right-hand sides, seed 6101',
    why: "js/numeric/linalg.js is fit.js's symmetric routines, operation for operation, so a consumer that moves from one to the other changes no bit of any covariance, correlation or rank: the count of numbers that differ in any bit, over the solution, the inverse and every eigenvalue and vector component, is 0.",
    run() {
      const r = rng(6101);
      let fixture = 0;
      let live = 0;
      let eigen = 0;
      let compared = 0;
      for (let k = 0; k < 300; k++) {
        const { A, b } = randomSpd(r, r.int(2, 6));
        const x = solveSpd(A, b);
        const inv = invertSpd(A);
        fixture +=
          mismatches(x, legacySolveSpd(A, b)) +
          mismatches(flat(inv), flat(legacyInvertSpd(A)));
        live +=
          mismatches(x, liveSolveSpd(A, b)) +
          mismatches(flat(inv), flat(liveInvertSpd(A)));
        const mine = eigenSymmetric(A);
        const old = legacyEigen(A);
        eigen += mismatches(
          mine.flatMap(e => [e.value, ...e.vector]),
          old.flatMap(e => [e.value, ...e.vector])
        );
        compared +=
          x.length + inv.length ** 2 + mine.length * (mine.length + 1);
      }
      return [
        measure(
          'solveSpd and invertSpd vs the fixture, differing in a bit',
          fixture,
          0,
          0
        ),
        measure(
          'solveSpd and invertSpd vs live fit.js, differing in a bit',
          live,
          0,
          0
        ),
        measure(
          'eigenSymmetric vs the fixture, differing in a bit',
          eigen,
          0,
          0
        ),
        measure(
          'numbers compared (a count, so the test is not empty)',
          compared > 10000 ? 1 : 0,
          1,
          0
        ),
      ];
    },
  },
  {
    id: 'L4',
    family: 'linear algebra',
    kind: 'oracle',
    title:
      'Eigenvalues against closed forms, and two solvers against each other',
    source:
      "300 seeded symmetric 2 x 2 (the quadratic formula) and 300 seeded symmetric 3 x 3 matrices (Smith's trigonometric formula), seed 6201; solve against solveSpd on 200 SPD systems of condition below 1e3, seed 6202",
    why: 'Two independent computations of the same eigenvalues agree to 1e-12 of the matrix norm (the trigonometric formula is itself good to about 1e-14 of it). Gaussian elimination and Cholesky are different algorithms: on a well-conditioned system they agree to 1e-9 relative.',
    run() {
      const r = rng(6201);
      let w2 = 0;
      let w3 = 0;
      for (let k = 0; k < 300; k++) {
        const [a, b, c] = [0, 0, 0].map(() => r.uniform(-5, 5));
        const mid = (a + c) / 2;
        const rad = Math.hypot((a - c) / 2, b);
        const e = eigenSymmetric([
          [a, b],
          [b, c],
        ]);
        w2 =
          Math.max(
            w2,
            Math.abs(e[0].value - (mid + rad)),
            Math.abs(e[1].value - (mid - rad))
          ) / 1;
        const s = Array.from({ length: 3 }, () => Array(3).fill(0));
        for (let i = 0; i < 3; i++)
          for (let j = i; j < 3; j++) s[i][j] = s[j][i] = r.uniform(-5, 5);
        const ev = eigenSymmetric(s).map(q => q.value);
        const ref = eigen3(s);
        w3 = Math.max(w3, ...ev.map((v, i) => Math.abs(v - ref[i]))) / norm1(s);
      }
      const q = rng(6202);
      let agree = 0;
      let used = 0;
      for (let k = 0; k < 200; k++) {
        const { A, b } = randomSpd(q, q.int(2, 5), 1);
        const x = solveSpd(A, b);
        const y = solve(A, b);
        const cond = norm1(A) * norm1(invertSpd(A));
        if (cond > 1e3) continue;
        used++;
        agree = Math.max(agree, vnorm(x.map((v, i) => v - y[i])) / vnorm(x));
      }
      return [
        measure(
          '2 x 2 eigenvalues vs the quadratic formula',
          w2,
          0,
          1e-12 * 10
        ),
        measure(
          '3 x 3 eigenvalues vs the trigonometric formula, of the norm',
          w3,
          0,
          1e-12
        ),
        measure('solve vs solveSpd, relative', agree, 0, 1e-9),
        measure('well-conditioned systems compared', used >= 100 ? 1 : 0, 1, 0),
      ];
    },
  },
  {
    id: 'L5',
    family: 'linear algebra',
    kind: 'ensemble',
    title: 'Five hundred seeded systems: residuals, inverses, reconstructions',
    source:
      '500 SPD systems of order 2 to 6 (B^T B + 0.1 I, B uniform in (-2, 2)), seed 6301; 300 symmetric matrices of order 2 to 6, seed 6302',
    why: "A backward-stable solver leaves |A x - b| under a modest multiple of n eps |A| |x|: 100 of them for solve, solveSpd and the inverse's columns. A V diag V^T must reproduce a symmetric matrix to 1e-12 of its norm, with V orthonormal to 1e-12. The fraction outside must be zero.",
    run() {
      const r = rng(6301);
      let badSolve = 0;
      let badInv = 0;
      for (let k = 0; k < 500; k++) {
        const n = r.int(2, 6);
        const { A, b } = randomSpd(r, n);
        const lim = 100 * n * EPS * norm1(A);
        for (const x of [solve(A, b), solveSpd(A, b)]) {
          const res = matVec(A, x).map((v, i) => v - b[i]);
          if (!(vnorm(res) <= lim * vnorm(x))) badSolve++;
        }
        const inv = invertSpd(A);
        const AI = A.map(row =>
          inv[0].map((_, j) => row.reduce((s, v, i) => s + v * inv[i][j], 0))
        );
        let dev = 0;
        for (let i = 0; i < n; i++)
          for (let j = 0; j < n; j++)
            dev = Math.max(dev, Math.abs(AI[i][j] - (i === j ? 1 : 0)));
        if (dev > 100 * n * EPS * norm1(A) * norm1(inv)) badInv++;
      }
      const q = rng(6302);
      let badEig = 0;
      for (let k = 0; k < 300; k++) {
        const n = q.int(2, 6);
        const M = Array.from({ length: n }, () => Array(n).fill(0));
        for (let i = 0; i < n; i++)
          for (let j = i; j < n; j++) M[i][j] = M[j][i] = q.uniform(-5, 5);
        const e = eigenSymmetric(M);
        let rec = 0;
        let orth = 0;
        for (let i = 0; i < n; i++)
          for (let j = 0; j < n; j++) {
            rec = Math.max(
              rec,
              Math.abs(
                e.reduce((s, p) => s + p.value * p.vector[i] * p.vector[j], 0) -
                  M[i][j]
              )
            );
            orth = Math.max(
              orth,
              Math.abs(
                e[i].vector.reduce((s, v, t) => s + v * e[j].vector[t], 0) -
                  (i === j ? 1 : 0)
              )
            );
          }
        if (rec > 1e-12 * norm1(M) || orth > 1e-12) badEig++;
      }
      return [
        measure(
          'solve and solveSpd residuals outside the bound',
          badSolve,
          0,
          0
        ),
        measure('A times its inverse outside the bound', badInv, 0, 0),
        measure('eigen-decompositions outside 1e-12', badEig, 0, 0),
      ];
    },
  },
  {
    id: 'L6',
    family: 'linear algebra',
    kind: 'negative',
    title: 'Matrices the routines must refuse',
    source:
      'an indefinite matrix, a singular positive-semidefinite one, a rank-one 3 x 3, a pivot lost to rounding, a NaN',
    why: 'null is the answer, not a number: [[1, 2], [2, 1]] has a negative eigenvalue, [[1, 1], [1, 1]] a zero one, [[1, 1], [1, 1 + 1e-17]] is the singular matrix in floating point, a rank-one matrix has no inverse, and a NaN anywhere gives null from solve.',
    run() {
      const rank1 = [
        [1, 2, 3],
        [2, 4, 6],
        [3, 6, 9],
      ];
      return [
        measure(
          'cholesky, indefinite',
          cholesky([
            [1, 2],
            [2, 1],
          ]) === null
            ? 1
            : 0,
          1,
          0
        ),
        measure(
          'solveSpd, indefinite',
          solveSpd(
            [
              [1, 2],
              [2, 1],
            ],
            [1, 1]
          ) === null
            ? 1
            : 0,
          1,
          0
        ),
        measure(
          'invertSpd, semidefinite',
          invertSpd([
            [1, 1],
            [1, 1],
          ]) === null
            ? 1
            : 0,
          1,
          0
        ),
        measure(
          'solve, rank one',
          solve(rank1, [1, 2, 3]) === null ? 1 : 0,
          1,
          0
        ),
        measure('inverse, rank one', inverse(rank1) === null ? 1 : 0, 1, 0),
        measure(
          'solve, singular in floating point',
          solve(
            [
              [1, 1],
              [1, 1 + 1e-17],
            ],
            [1, 1]
          ) === null
            ? 1
            : 0,
          1,
          0
        ),
        measure(
          'solve, NaN entry',
          solve(
            [
              [1, NaN],
              [0, 1],
            ],
            [1, 1]
          ) === null
            ? 1
            : 0,
          1,
          0
        ),
        measure(
          'eigenSymmetric, indefinite is fine',
          eigenSymmetric([
            [1, 2],
            [2, 1],
          ])[1].value,
          -1,
          1e-14
        ),
      ];
    },
  },
  {
    id: 'L7',
    family: 'linear algebra',
    kind: 'authentic',
    title: 'The Wilkinson W21+ matrix',
    source:
      'tridiagonal, diagonal |11 - i| for i = 1..21 and off-diagonals 1 (Wilkinson, The Algebraic Eigenvalue Problem, 1965): its two largest eigenvalues are 10.746194182903393 and 10.746194182903322, equal to 1e-13',
    why: 'The classical test of an eigenvalue routine: pairs of eigenvalues that agree to 14 digits. A Jacobi method must separate them from the rest and give the largest two to 1e-9 (a method that merged them would give one value twice or miss the pair); the trace is the sum of the diagonal, 110, to 1e-12.',
    run() {
      const W = Array.from({ length: 21 }, (_, i) =>
        Array.from({ length: 21 }, (_, j) =>
          i === j ? Math.abs(10 - i) : Math.abs(i - j) === 1 ? 1 : 0
        )
      );
      const e = eigenSymmetric(W).map(q => q.value);
      return [
        measure('largest', e[0], 10.746194182903393, 1e-9),
        measure('second largest', e[1], 10.746194182903322, 1e-9),
        measure('third largest is well below', e[2] < 9.8 ? 1 : 0, 1, 0),
        measure(
          'sum of the eigenvalues, the trace',
          e.reduce((a, b) => a + b, 0),
          110,
          1e-11
        ),
      ];
    },
  },

  // === Polynomial fit (polyfit.js; consumer 213) ================================
  {
    id: 'P1',
    family: 'polynomial fit',
    kind: 'analytic',
    title: 'Exact polynomials are recovered, with a degree of freedom to spare',
    source:
      'y = 2 - 3x + x^2/2 on 20 points of [-4, 6]; y = x^3 - 2x on 30 points of [0, 5]; y = 7 on 10 points (degree 0)',
    why: 'The model contains the data, so the fit reproduces them to a few ulp of their size (1e-12 absolute here, where they reach 90), the residual chi-square is rounding noise (under 1e-20), and its degrees of freedom are the points less the parameters.',
    run() {
      const x1 = Array.from({ length: 20 }, (_, i) => -4 + (10 * i) / 19);
      const f1 = x => 2 - 3 * x + 0.5 * x * x;
      const x2 = Array.from({ length: 30 }, (_, i) => (5 * i) / 29);
      const f2 = x => x ** 3 - 2 * x;
      const a = polyfit(x1, x1.map(f1), 2);
      const b = polyfit(x2, x2.map(f2), 3);
      const c = polyfit(x1.slice(0, 10), new Array(10).fill(7), 0);
      const dev = (p, xs, f) =>
        Math.max(...xs.map(x => Math.abs(p.at(x) - f(x))));
      return [
        measure('quadratic, largest deviation', dev(a, x1, f1), 0, 1e-12),
        measure('cubic, largest deviation', dev(b, x2, f2), 0, 1e-12),
        measure('constant, value', c.coefficients[0], 7, 1e-14),
        measure('residual chi-square', a.chi2, 0, 1e-20),
        measure('degrees of freedom', a.dof, 17, 0),
        measure(
          'unweighted fit says its covariance is scaled',
          a.scaled ? 1 : 0,
          1,
          0
        ),
      ];
    },
  },
  {
    id: 'P2',
    family: 'polynomial fit',
    kind: 'analytic',
    title: 'Conditioning: degree 10 on x = 1000 to 5000',
    source:
      'y = sum (k + 1)(-1)^k u^k for k = 0..10, u = (x - 3000)/2000, on 41 points of [1000, 5000]',
    why: 'In raw x the normal equations of this problem have a condition number past 1e40 and return nonsense; in the scaled variable the Vandermonde matrix has one near 1e4 and QR loses another square root of that. The fit must reproduce y to 1e-10 of its largest value everywhere.',
    run() {
      const xs = Array.from({ length: 41 }, (_, i) => 1000 + 100 * i);
      const f = x => {
        const u = (x - 3000) / 2000;
        let s = 0;
        for (let k = 10; k >= 0; k--) s = s * u + (k + 1) * (-1) ** k;
        return s;
      };
      const ys = xs.map(f);
      const p = polyfit(xs, ys, 10);
      const big = Math.max(...ys.map(Math.abs));
      let worst = 0;
      for (let i = 0; i < 400; i++) {
        const x = 1000 + (4000 * i) / 399;
        worst = Math.max(worst, Math.abs(p.at(x) - f(x)));
      }
      return [
        measure(
          'largest deviation, in units of the largest y',
          worst / big,
          0,
          1e-10
        ),
      ];
    },
  },
  {
    id: 'P3',
    family: 'polynomial fit',
    kind: 'oracle',
    title:
      'Against the normal equations, a straight-line formula and replication',
    source:
      'a seeded noisy cubic, 40 points, seed 7101: the normal equations in the scaled variable solved with solveSpd; the closed-form straight line (Sxy/Sxx); sigma = 1/sqrt(k) against each point entered k times',
    why: "QR and the normal equations are different algorithms, and at this conditioning (degree 3 on a scaled interval) agree to 1e-9. The closed-form line is the textbook regression and must agree with degree 1 to 1e-12 of the data's size. A weight of k is the same as k copies, so the two fits' coefficients agree to 1e-11.",
    run() {
      const r = rng(7101);
      const xs = Array.from({ length: 40 }, () => r.uniform(-3, 8));
      const ys = xs.map(
        x => 1 + 0.5 * x - 0.2 * x * x + 0.03 * x ** 3 + r.uniform(-0.5, 0.5)
      );
      const p = polyfit(xs, ys, 3);
      const t = xs.map(x => (x - p.center) / p.halfWidth);
      const N = Array.from({ length: 4 }, (_, i) =>
        Array.from({ length: 4 }, (_, j) =>
          t.reduce((s, v) => s + v ** (i + j), 0)
        )
      );
      const rhs = Array.from({ length: 4 }, (_, i) =>
        t.reduce((s, v, k) => s + v ** i * ys[k], 0)
      );
      const c = solveSpd(N, rhs);
      const line = polyfit(xs, ys, 1);
      const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
      const my = ys.reduce((a, b) => a + b, 0) / ys.length;
      const slope =
        xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) /
        xs.reduce((s, x) => s + (x - mx) ** 2, 0);
      let lineDev = 0;
      for (const x of xs)
        lineDev = Math.max(
          lineDev,
          Math.abs(line.at(x) - (my + slope * (x - mx)))
        );
      const px = [0, 1, 2, 3, 4, 5, 6];
      const py = [1, 2.5, 2, 4.5, 4, 6.5, 7];
      const k = [1, 3, 2, 1, 4, 2, 1];
      const weighted = polyfit(px, py, 2, {
        sigma: k.map(v => 1 / Math.sqrt(v)),
      });
      const dupX = px.flatMap((v, i) => new Array(k[i]).fill(v));
      const dupY = py.flatMap((v, i) => new Array(k[i]).fill(v));
      const copies = polyfit(dupX, dupY, 2);
      return [
        measure(
          'QR vs normal equations, coefficients',
          Math.max(...c.map((v, i) => Math.abs(v - p.coefficients[i]))),
          0,
          1e-9
        ),
        measure(
          'degree 1 vs Sxy/Sxx',
          lineDev / Math.max(...ys.map(Math.abs)),
          0,
          1e-12
        ),
        measure(
          'weights vs copies, coefficients',
          Math.max(
            ...weighted.coefficients.map((v, i) =>
              Math.abs(v - copies.coefficients[i])
            )
          ),
          0,
          1e-11
        ),
      ];
    },
  },
  {
    id: 'P4',
    family: 'polynomial fit',
    kind: 'ensemble',
    title: 'Coverage of the stated uncertainty on a thousand seeded datasets',
    source:
      'truth c = (3, -1.5, 0.8, 0.4) in t on [-1, 1], 30 jittered points, Gaussian noise of sigma 0.3, seed 7201; (a) sigma given: 1-sigma interval per coefficient and the joint chi-square of 4 parameters at 95%; (b) sigma not given, covariance scaled by chi2/dof',
    why: 'The covariance is the claim, so its coverage is what is measured. With 1000 datasets the standard error of a coverage near 0.68 is 0.015 and near 0.95 is 0.007: the bands are about four of them. (a) 1-sigma coverage 0.683 +- 0.06 for each coefficient; the joint 95% region (chi-square, 4 dof: 9.488) covers 0.95 +- 0.03. (b) with 26 degrees of freedom a Student interval at 1 sigma covers 0.674 +- 0.06.',
    run() {
      const r = rng(7201);
      const g = normals(r.u);
      const truth = [3, -1.5, 0.8, 0.4];
      const cover = [0, 0, 0, 0];
      const coverScaled = [0, 0, 0, 0];
      let joint = 0;
      const N = 1000;
      for (let t = 0; t < N; t++) {
        const xs = Array.from(
          { length: 30 },
          (_, i) => -1 + (2 * (i + r.uniform(0.1, 0.9))) / 30
        );
        const y = xs.map(
          x =>
            truth[0] +
            truth[1] * x +
            truth[2] * x * x +
            truth[3] * x ** 3 +
            0.3 * g()
        );
        const withSigma = polyfit(xs, y, 3, { sigma: new Array(30).fill(0.3) });
        // The fit's own variable is t = (x - center) / halfWidth; the truth is in x on [-1, 1],
        // and center and halfWidth are those of the sample, so compare in the fitted variable.
        const { center, halfWidth } = withSigma;
        const a = center;
        const h = halfWidth;
        const cT = [
          truth[0] + truth[1] * a + truth[2] * a * a + truth[3] * a ** 3,
          h * (truth[1] + 2 * truth[2] * a + 3 * truth[3] * a * a),
          h * h * (truth[2] + 3 * truth[3] * a),
          h ** 3 * truth[3],
        ];
        const d = withSigma.coefficients.map((v, i) => v - cT[i]);
        const C = withSigma.covariance;
        for (let i = 0; i < 4; i++)
          if (Math.abs(d[i]) <= Math.sqrt(C[i][i])) cover[i]++;
        const Ci = invertSpd(C);
        const chi = d.reduce(
          (s, v, i) => s + v * Ci[i].reduce((q, w, j) => q + w * d[j], 0),
          0
        );
        if (chi <= 9.488) joint++;
        const scaled = polyfit(xs, y, 3);
        const dd = scaled.coefficients.map((v, i) => v - cT[i]);
        for (let i = 0; i < 4; i++)
          if (Math.abs(dd[i]) <= Math.sqrt(scaled.covariance[i][i]))
            coverScaled[i]++;
      }
      return [
        ...cover.map((c, i) =>
          measure(
            `1-sigma coverage, coefficient ${i}, sigma given`,
            c / N,
            0.683,
            0.06
          )
        ),
        measure('joint 95% region, sigma given', joint / N, 0.95, 0.03),
        ...coverScaled.map((c, i) =>
          measure(
            `1-sigma coverage, coefficient ${i}, scaled`,
            c / N,
            0.674,
            0.06
          )
        ),
      ];
    },
  },
  {
    id: 'P5',
    family: 'polynomial fit',
    kind: 'negative',
    title: 'Fits the routine refuses, and the one it flags',
    source:
      'degree equal to the points; a NaN y; sigma zero; two distinct x for degree 3; all x equal',
    why: "Too few points, a non-finite value and a zero error bar are RangeErrors, an unfittable design (fewer distinct x than parameters) is null, and a fit with no error bars says its covariance is scaled by the residuals, so a reader cannot take it for the data's own.",
    run() {
      const x = [0, 1, 2, 3, 4, 5, 6, 7];
      const y = x.map(v => v * v);
      return [
        measure(
          'degree = points - 1, RangeError',
          throws(() => polyfit([0, 1, 2], [0, 1, 4], 2)),
          1,
          0
        ),
        measure(
          'NaN y, RangeError',
          throws(() =>
            polyfit(
              x,
              y.map((v, i) => (i === 3 ? NaN : v)),
              2
            )
          ),
          1,
          0
        ),
        measure(
          'sigma zero, RangeError',
          throws(() => polyfit(x, y, 2, { sigma: x.map(() => 0) })),
          1,
          0
        ),
        measure(
          'two distinct x, degree 3',
          polyfit([0, 0, 0, 0, 1, 1, 1, 1], [1, 1, 1, 1, 2, 2, 2, 2], 3) ===
            null
            ? 1
            : 0,
          1,
          0
        ),
        measure(
          'all x equal, degree 1',
          polyfit([2, 2, 2, 2], [1, 2, 3, 4], 1) === null ? 1 : 0,
          1,
          0
        ),
        measure(
          'given sigma is not scaled',
          polyfit(x, y, 2, { sigma: x.map(() => 1) }).scaled ? 1 : 0,
          0,
          0
        ),
      ];
    },
  },
  {
    id: 'P6',
    family: 'polynomial fit',
    kind: 'authentic',
    title: 'NIST StRD Wampler 1 and 2',
    source:
      'NIST Statistical Reference Datasets, Wampler 1: y = 1 + x + x^2 + x^3 + x^4 + x^5 and Wampler 2: y = 1 + 0.1 x + 0.01 x^2 + 0.001 x^3 + 1e-4 x^4 + 1e-5 x^5, x = 0..20; certified coefficients all 1 (Wampler 1) and the powers of 0.1 (Wampler 2), certified residual standard deviation 0',
    why: 'NIST built these to break least-squares codes (the raw Vandermonde matrix on 0..20 has a condition number near 1e12 for degree 5). The certified residual is exactly zero, so the fit must reproduce every y to 1e-11 of the largest y (least squares bounds the error in norm, not point by point: the data run from 1 to 3.2e6 in Wampler 1, and a point-by-point relative bound at y = 1 asks for 1e-17 of the scale of the data), and the polynomial it describes must have the certified coefficients: the fitted value and slope at x = 0 are the certified 1 and 1 (0.1 in Wampler 2) to 1e-8 absolute.',
    run() {
      const xs = Array.from({ length: 21 }, (_, i) => i);
      const w1 = x => 1 + x * (1 + x * (1 + x * (1 + x * (1 + x))));
      const w2 = x =>
        1 + x * (0.1 + x * (0.01 + x * (0.001 + x * (1e-4 + x * 1e-5))));
      const out = [];
      for (const [name, f, slope0] of [
        ['Wampler 1', w1, 1],
        ['Wampler 2', w2, 0.1],
      ]) {
        const p = polyfit(xs, xs.map(f), 5);
        let worst = 0;
        const big = Math.max(...xs.map(f));
        for (const x of xs)
          worst = Math.max(worst, Math.abs(p.at(x) - f(x)) / big);
        const d = 1e-4;
        out.push(
          measure(
            `${name}, largest deviation over the largest y`,
            worst,
            0,
            1e-11
          ),
          measure(`${name}, value at 0 (certified 1)`, p.at(0), 1, 1e-8),
          measure(
            `${name}, slope at 0 (certified ${slope0})`,
            (p.at(d) - p.at(-d)) / (2 * d),
            slope0,
            1e-6
          )
        );
      }
      return out;
    },
  },
];

/** Run one case: its measures, each with the verdict. */
export function runCase(c) {
  const measures = c.run().map(m => ({
    ...m,
    ok: Math.abs(m.value - m.expected) <= m.tolerance,
  }));
  return { ...c, measures, ok: measures.every(m => m.ok) };
}

// --- The table --------------------------------------------------------------

const fmt = v =>
  typeof v !== 'number'
    ? String(v)
    : v === 0
      ? '0'
      : Math.abs(v) >= 0.01 && Math.abs(v) < 1e6
        ? String(Number(v.toPrecision(4)))
        : v.toExponential(0);
const bound = m =>
  m.tolerance === 0
    ? `= ${fmt(m.expected)}`
    : `${fmt(m.expected)} ± ${fmt(m.tolerance)}${m.unit ? ` ${m.unit}` : ''}`;

/** The markdown table of results, one row per measure. */
export function table(results) {
  const rows = [
    '| Case | Kind | Measure | Value | Bound | |',
    '| --- | --- | --- | --- | --- | --- |',
  ];
  for (const c of results)
    c.measures.forEach((m, k) =>
      rows.push(
        `| ${k === 0 ? `**${c.id}** ${c.title}` : ''} | ${k === 0 ? c.kind : ''} | ${m.name} | ${fmt(m.value)} | ${bound(m)} | ${m.ok ? 'pass' : '**FAIL**'} |`
      )
    );
  return rows.join('\n');
}
