// =============================================================================
// The statistics kernel's validation group (Prompt 154)
// -----------------------------------------------------------------------------
// Cases in the five kinds the validation contract asks of a kernel (7.5.8), as
// data, with every tolerance written here BEFORE js/kernels/statistics/ was
// written (this file is committed first; the kernel's first commit is a later
// one):
//
//   analytic    a closed form the kernel does not compute
//   oracle      a second method written here (a series where the kernel uses a
//               continued fraction, bisection where it uses a bracketed root,
//               brute-force enumeration where it uses a recurrence), or the
//               suite's own code the kernel's object would replace, compared
//               in one process
//   ensemble    seeded ensembles: the stated rate of the stated interval, and
//               the false-alarm rate of a test, held to a binomial band stated
//               beforehand (4 sigma of N trials)
//   negative    what the kernel must refuse, widen or report as open
//   authentic   published datasets and published tables, with the source
//
// A case is `run()` returning measures { name, value, expected, tolerance,
// unit }; a measure passes when |value - expected| <= tolerance.
//
// Two engines. CI runs Node 20 and a Mac runs Node 24, and Math.log, exp, pow,
// cos, sin and atan2 differ in the last bit between them: nothing here stores a
// digest or a golden of a value that passes through one of those. Every closed
// form is held to a tolerance that is orders of magnitude above one ulp; every
// ensemble uses mulberry32, which is integer arithmetic and exact on both, and
// its bands are statistical, so no last-bit difference can move a verdict.
//
// Where a tolerance depends on a count measured in the run (the members of a
// bin), the case states the rule (4 standard errors of the mean) and computes
// the bound from that count: the rule, not the value, is what was fixed first.
// =============================================================================

import { mulberry32 } from '../js/rng.js';
import { solve } from '../js/numeric/linalg.js';
import {
  createProblem,
  refine,
  covarianceAt,
  profile,
} from '../js/inference/fit.js';
import {
  lnGamma,
  gammaP,
  betaI,
  normalCdf,
  normalQuantile,
  chi2Cdf,
  chi2Quantile,
  tCdf,
  tQuantile,
  fQuantile,
  fSf,
} from '../js/kernels/statistics/special.js';
import {
  sigmaOfLevel,
  levelOfSigma,
  covarianceInterval,
  profileInterval,
  studentInterval,
  poissonInterval,
  percentileInterval,
} from '../js/kernels/statistics/intervals.js';
import {
  DRAW_BUDGET,
  caseBootstrap,
  residualBootstrap,
  propagate,
} from '../js/kernels/statistics/resample.js';
import {
  normalisedResiduals,
  runsPmf,
  runsTest,
  lagOne,
  normalProbability,
} from '../js/kernels/statistics/diagnostics.js';
import { difference, fTest } from '../js/kernels/statistics/compare.js';
import {
  selection,
  all as allOf,
  either as eitherOf,
  logisticCompleteness,
  completenessCorrect,
  eddingtonShift,
  malmquistShift,
  malmquistCutShift,
  binnedMeanShift,
  measuredShift,
} from '../js/kernels/statistics/selection.js';
import { makeUniverse, observe, malmquistFormula } from '../js/survey/model.js';
import { stream } from '../js/random/streams.js';

const TAU = 2 * Math.PI;

// --- Tolerances, fixed before the kernel ran ----------------------------------
export const TOL = Object.freeze({
  /** Special functions against closed forms (absolute, or relative to the value). */
  special: 1e-12,
  /** Special functions against a second numerical method. */
  secondMethod: 1e-10,
  /** Published tables printed to three decimals: half the last digit, rounded up. */
  table3: 5.1e-4,
  /** An interval from the fitter's covariance or profile, in units of sigma. */
  fitter: 1e-5,
  /** Rounding of an identity that is exact in real arithmetic. */
  identity: 1e-12,
  /** A rate that is a count over trials: this many binomial standard errors. */
  sigmas: 4,
  /** The percentile bootstrap's known small-sample under-coverage (Efron 1987). */
  bootstrapUnderCoverage: 0.012,
});
/** Four binomial standard errors of a rate p over N independent trials. */
const band = (p, N) => TOL.sigmas * Math.sqrt((p * (1 - p)) / N);

const measure = (name, value, expected, tolerance, unit = '') => ({
  name,
  value,
  expected,
  tolerance,
  unit,
});

/** Seeded uniforms: mulberry32, exact on every engine. */
const rng = seed => {
  const u = mulberry32(seed >>> 0);
  // Standard normals by Box-Muller (log and cos: used for noise, never stored).
  const z = () => Math.sqrt(-2 * Math.log(1 - u())) * Math.cos(TAU * u());
  return { u, z };
};

const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = xs => {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
};
const throwsCode = (fn, code) => {
  try {
    fn();
  } catch (e) {
    return e.code === code ? 1 : 0;
  }
  return 0;
};

// --- Independent references written for the cases -----------------------------

/** erf by its all-positive series, e^-x^2 sum 2^n x^(2n+1) / (2n+1)!!: no cancellation. */
function erfRef(x) {
  const a = Math.abs(x);
  let term = a;
  let sum = a;
  for (let n = 1; n < 2000 && term > 1e-18 * sum; n++) {
    term *= (2 * a * a) / (2 * n + 1);
    sum += term;
  }
  return Math.sign(x) * ((2 / Math.sqrt(Math.PI)) * Math.exp(-a * a) * sum);
}
const phiRef = z => 0.5 * (1 + erfRef(z / Math.SQRT2));
const pdfRef = z => Math.exp(-0.5 * z * z) / Math.sqrt(TAU);

/** Plain bisection: the oracle for every quantile. */
function bisect(f, a, b) {
  const fa = f(a) < 0;
  for (let i = 0; i < 200 && b - a > 1e-15 * Math.max(1, Math.abs(b)); i++) {
    const m = 0.5 * (a + b);
    if (f(m) < 0 === fa) a = m;
    else b = m;
  }
  return 0.5 * (a + b);
}
/** The two-sided z of a coverage level, by bisection on the series. */
const zRef = level => bisect(z => erfRef(z / Math.SQRT2) - level, 0, 12);

/** Composite Simpson with n (even) intervals. */
function simpson(f, a, b, n) {
  const h = (b - a) / n;
  let s = f(a) + f(b);
  for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2);
  return (s * h) / 3;
}

/** Weighted least squares for a line, in closed form (the normal equations). */
function wlsLine(x, y, s) {
  let Sw = 0;
  let Sx = 0;
  let Sxx = 0;
  let Sy = 0;
  let Sxy = 0;
  for (let i = 0; i < x.length; i++) {
    const w = 1 / (s[i] * s[i]);
    Sw += w;
    Sx += w * x[i];
    Sxx += w * x[i] * x[i];
    Sy += w * y[i];
    Sxy += w * x[i] * y[i];
  }
  const d = Sw * Sxx - Sx * Sx;
  const a = (Sxx * Sy - Sx * Sxy) / d;
  const b = (Sw * Sxy - Sx * Sy) / d;
  let chi2 = 0;
  for (let i = 0; i < x.length; i++)
    chi2 += ((y[i] - a - b * x[i]) / s[i]) ** 2;
  return {
    a,
    b,
    chi2,
    C: [
      [Sxx / d, -Sx / d],
      [-Sx / d, Sw / d],
    ],
  };
}

/** A line as a model for the fitter (fit.js asks for predict and solveLinear). */
const LINE = {
  id: 'line',
  parameters: [{ name: 'a' }, { name: 'b' }],
  predict: (v, x) => Float64Array.from(x, xi => v.a + v.b * xi),
  solveLinear: (data, w, shape) => ({ fit: shape, linear: {} }),
};
const lineProblem = (x, y, sigma) =>
  createProblem(
    LINE,
    {
      x: Float64Array.from(x),
      y: Float64Array.from(y),
      sigma: sigma ? Float64Array.from(sigma) : null,
    },
    ['a', 'b'].map(name => ({
      name,
      mode: 'fitted',
      value: 0,
      lo: -1e3,
      hi: 1e3,
    }))
  );

/** Every arrangement of n1 ones and n2 zeros, counted by its number of runs. */
function runsByEnumeration(n1, n2) {
  const n = n1 + n2;
  const counts = new Array(n + 1).fill(0);
  let total = 0;
  for (let mask = 0; mask < 1 << n; mask++) {
    let ones = 0;
    for (let b = 0; b < n; b++) ones += (mask >> b) & 1;
    if (ones !== n1) continue;
    let runs = 1;
    for (let b = 1; b < n; b++)
      if (((mask >> b) & 1) !== ((mask >> (b - 1)) & 1)) runs++;
    counts[runs]++;
    total++;
  }
  return counts.map(c => c / total);
}

/** The Wilson-Hilferty chi-square quantile: a second method good to ~1e-5 at 300 dof. */
const wilsonHilferty = (p, k) => {
  const z = zRef(2 * p - 1);
  const a = 2 / (9 * k);
  return k * (1 - a + z * Math.sqrt(a)) ** 3;
};

// --- Published data -----------------------------------------------------------

/** Cushny and Peebles (1905), as Student (1908) used it: extra sleep in hours
 *  on two drugs for ten patients (R's `sleep`). */
const SLEEP = {
  drug1: [0.7, -1.6, -0.2, -1.2, -0.1, 3.4, 3.7, 0.8, 0.0, 2.0],
  drug2: [1.9, 0.8, 1.1, 0.1, -0.1, 4.4, 5.5, 1.6, 4.6, 3.4],
};
/** Anscombe (1973), The American Statistician 27, 17: datasets I and II. */
const ANSCOMBE = {
  x: [10, 8, 13, 9, 11, 14, 6, 4, 12, 7, 5],
  y1: [8.04, 6.95, 7.58, 8.81, 8.33, 9.96, 7.24, 4.26, 10.84, 4.82, 5.68],
  y2: [9.14, 8.14, 8.74, 8.77, 9.26, 8.1, 6.13, 3.1, 9.13, 7.26, 4.74],
};
/** Bortkiewicz (1898): deaths by horse kick in 14 Prussian cavalry corps over 20
 *  years, 280 corps-years: 144 with none, 91 with one, 32 two, 11 three, 2 four. */
const HORSE_KICKS = { frequencies: [144, 91, 32, 11, 2] };

export const CASES = [
  // ===========================================================================
  // Special functions
  // ===========================================================================
  {
    id: 'S1',
    family: 'special functions',
    kind: 'analytic',
    title: 'ln Gamma at integers and half-integers',
    source:
      'Gamma(n) = (n-1)!; Gamma(1/2) = sqrt(pi), Gamma(3/2) = sqrt(pi)/2, Gamma(5/2) = 3 sqrt(pi)/4 (Abramowitz and Stegun 6.1.8, 6.1.12)',
    why: 'Every distribution below rests on ln Gamma; an error here moves all of them.',
    run() {
      const out = [];
      let fact = 1;
      for (let n = 1; n <= 20; n++) {
        if (n > 1) fact *= n - 1;
        out.push(
          measure(
            `ln Gamma(${n}) against ln ${n - 1}!`,
            lnGamma(n),
            Math.log(fact),
            TOL.special * Math.max(1, Math.log(fact))
          )
        );
      }
      const rp = Math.sqrt(Math.PI);
      out.push(
        measure(
          'Gamma(1/2) against sqrt(pi)',
          Math.exp(lnGamma(0.5)),
          rp,
          TOL.special * rp
        ),
        measure(
          'Gamma(3/2) against sqrt(pi)/2',
          Math.exp(lnGamma(1.5)),
          rp / 2,
          TOL.special * rp
        ),
        measure(
          'Gamma(5/2) against 3 sqrt(pi)/4',
          Math.exp(lnGamma(2.5)),
          (3 * rp) / 4,
          TOL.special * rp
        )
      );
      return out;
    },
  },
  {
    id: 'S2',
    family: 'special functions',
    kind: 'analytic',
    title: 'The regularised incomplete gamma function in closed form',
    source:
      'P(1, x) = 1 - e^-x; P(2, x) = 1 - e^-x (1 + x) (A&S 6.5.13 with integer a); P(1/2, x) = erf(sqrt(x)) (A&S 6.5.12)',
    why: 'Chi-square and the normal tails are P and Q of these shapes; the closed forms need no second algorithm.',
    run() {
      const out = [];
      let w1 = 0;
      let w2 = 0;
      let w3 = 0;
      for (const x of [0.01, 0.1, 0.5, 1, 2, 5, 10, 20, 40]) {
        w1 = Math.max(w1, Math.abs(gammaP(1, x) - (1 - Math.exp(-x))));
        w2 = Math.max(
          w2,
          Math.abs(gammaP(2, x) - (1 - Math.exp(-x) * (1 + x)))
        );
        w3 = Math.max(w3, Math.abs(gammaP(0.5, x) - erfRef(Math.sqrt(x))));
      }
      out.push(
        measure('P(1, x), largest deviation over 9 x', w1, 0, TOL.special),
        measure('P(2, x), largest deviation over 9 x', w2, 0, TOL.special),
        measure(
          'P(1/2, x) against the series for erf(sqrt x), largest deviation',
          w3,
          0,
          TOL.special
        )
      );
      return out;
    },
  },
  {
    id: 'S3',
    family: 'special functions',
    kind: 'analytic',
    title: 'The regularised incomplete beta function in closed form',
    source:
      'I_x(1, b) = 1 - (1-x)^b; I_x(a, 1) = x^a; I_x(1/2, 1/2) = (2/pi) asin(sqrt x); I_x(a, b) = 1 - I_(1-x)(b, a) (A&S 26.5.1-26.5.2, 26.5.8)',
    why: 'Student t and F tails are I of these shapes.',
    run() {
      let w1 = 0;
      let w2 = 0;
      let w3 = 0;
      let w4 = 0;
      for (const x of [0.001, 0.05, 0.2, 0.5, 0.7, 0.95, 0.999]) {
        for (const b of [1, 2.5, 10])
          w1 = Math.max(w1, Math.abs(betaI(x, 1, b) - (1 - (1 - x) ** b)));
        for (const a of [1, 3, 12.5])
          w2 = Math.max(w2, Math.abs(betaI(x, a, 1) - x ** a));
        w3 = Math.max(
          w3,
          Math.abs(betaI(x, 0.5, 0.5) - (2 / Math.PI) * Math.asin(Math.sqrt(x)))
        );
        for (const [a, b] of [
          [2, 3],
          [0.7, 4.2],
          [15, 9],
        ])
          w4 = Math.max(
            w4,
            Math.abs(betaI(x, a, b) - (1 - betaI(1 - x, b, a)))
          );
      }
      return [
        measure('I_x(1, b), largest deviation', w1, 0, TOL.special),
        measure('I_x(a, 1), largest deviation', w2, 0, TOL.special),
        measure(
          'I_x(1/2, 1/2) against the arcsine law, largest deviation',
          w3,
          0,
          TOL.special
        ),
        measure(
          'reflection I_x(a, b) + I_(1-x)(b, a) = 1, largest deviation',
          w4,
          0,
          TOL.special
        ),
      ];
    },
  },
  {
    id: 'S4',
    family: 'special functions',
    kind: 'oracle',
    title: 'A second method for the normal and gamma distributions',
    source:
      'the all-positive series for erf written in this file; composite Simpson quadrature of t^(a-1) e^-t after t = u^2, with Gamma(5/2) = 3 sqrt(pi)/4 and Gamma(9/2) = 105 sqrt(pi)/16',
    why: 'The kernel evaluates these by a continued fraction and a series; the oracle shares no step with either.',
    run() {
      let wn = 0;
      for (let z = -5; z <= 5; z += 0.25)
        wn = Math.max(wn, Math.abs(normalCdf(z) - phiRef(z)));
      const rp = Math.sqrt(Math.PI);
      const quad = (a, gam, x) =>
        simpson(
          u => 2 * u ** (2 * a - 1) * Math.exp(-u * u),
          0,
          Math.sqrt(x),
          4000
        ) / gam;
      let wg = 0;
      for (const x of [0.3, 1, 2.5, 6, 12, 25])
        wg = Math.max(
          wg,
          Math.abs(gammaP(2.5, x) - quad(2.5, (3 * rp) / 4, x)),
          Math.abs(gammaP(4.5, x) - quad(4.5, (105 * rp) / 16, x))
        );
      return [
        measure(
          'normal CDF against the erf series, z from -5 to 5, largest deviation',
          wn,
          0,
          TOL.secondMethod
        ),
        measure(
          'P(5/2, x) and P(9/2, x) against Simpson, largest deviation',
          wg,
          0,
          TOL.secondMethod
        ),
      ];
    },
  },
  {
    id: 'S5',
    family: 'special functions',
    kind: 'analytic',
    title: 'Quantiles in closed form and by bisection',
    source:
      'chi-square, 2 dof: x = -2 ln(1-p); Student t, 1 dof: t = tan(pi (p - 1/2)); t, 2 dof: t = (2p - 1) / sqrt(2 p (1-p)); normal by bisection on the erf series',
    why: 'A quantile is the inverse of a CDF the kernel also supplies; closed inverses fix the pair.',
    run() {
      let wc = 0;
      let w1 = 0;
      let w2 = 0;
      let wn = 0;
      for (const p of [0.5, 0.683, 0.8, 0.9, 0.95, 0.99, 0.999]) {
        const rel = v => Math.abs(v);
        wc = Math.max(wc, rel(chi2Quantile(p, 2) / (-2 * Math.log(1 - p)) - 1));
        w1 = Math.max(
          w1,
          rel(tQuantile(p, 1) / Math.tan(Math.PI * (p - 0.5)) - 1)
        );
        w2 = Math.max(
          w2,
          rel(tQuantile(p, 2) / ((2 * p - 1) / Math.sqrt(2 * p * (1 - p))) - 1)
        );
        wn = Math.max(wn, Math.abs(normalQuantile((1 + p) / 2) - zRef(p)));
      }
      return [
        measure(
          'chi-square quantile, 2 dof, largest relative deviation',
          wc,
          0,
          1e-10
        ),
        measure('t quantile, 1 dof, largest relative deviation', w1, 0, 1e-10),
        measure('t quantile, 2 dof, largest relative deviation', w2, 0, 1e-10),
        measure(
          'normal quantile against bisection on the series, largest deviation',
          wn,
          0,
          1e-10
        ),
      ];
    },
  },
  {
    id: 'S6',
    family: 'special functions',
    kind: 'authentic',
    title: 'Critical values from the NIST/SEMATECH tables',
    source:
      'NIST/SEMATECH e-Handbook of Statistical Methods, sections 1.3.6.7.1 (normal), 1.3.6.7.2 (t), 1.3.6.7.3 (chi-square) and 1.3.6.7.3 (F, upper 5%), printed to three decimals',
    why: 'The tables were computed by other people with other code; they fix the quantiles at the values every statistics course teaches.',
    run() {
      const out = [];
      const row = (name, value, expected) =>
        out.push(measure(name, value, expected, TOL.table3));
      row('normal, two-sided 95% (z = 1.960)', normalQuantile(0.975), 1.96);
      row('normal, two-sided 99% (z = 2.576)', normalQuantile(0.995), 2.576);
      for (const [p, k, v] of [
        [0.95, 1, 3.841],
        [0.99, 1, 6.635],
        [0.95, 2, 5.991],
        [0.99, 2, 9.21],
        [0.95, 5, 11.07],
        [0.95, 10, 18.307],
        [0.95, 30, 43.773],
      ])
        row(`chi-square, ${k} dof, ${p}`, chi2Quantile(p, k), v);
      for (const [nu, v] of [
        [1, 12.706],
        [2, 4.303],
        [5, 2.571],
        [9, 2.262],
        [10, 2.228],
        [30, 2.042],
      ])
        row(`Student t, ${nu} dof, 0.975`, tQuantile(0.975, nu), v);
      for (const [d1, d2, v] of [
        [1, 10, 4.965],
        [2, 10, 4.103],
        [5, 10, 3.326],
        [3, 20, 3.098],
        [10, 10, 2.978],
      ])
        row(`F, ${d1} and ${d2} dof, 0.95`, fQuantile(0.95, d1, d2), v);
      return out;
    },
  },
  {
    id: 'S7',
    family: 'special functions',
    kind: 'negative',
    title: 'Arguments outside the domain are NaN, never a number',
    source:
      'the definitions: P(a, x) needs a > 0 and x >= 0; I_x needs 0 <= x <= 1, a, b > 0; a quantile needs 0 <= p <= 1',
    why: 'A silent number for an impossible argument becomes a wrong interval three calls later.',
    run() {
      const nan = v => (Number.isNaN(v) ? 1 : 0);
      return [
        measure(
          'gammaP(-1, 1), gammaP(1, -1), gammaP(NaN, 1) are NaN',
          nan(gammaP(-1, 1)) + nan(gammaP(1, -1)) + nan(gammaP(NaN, 1)),
          3,
          0
        ),
        measure(
          'betaI with x = 1.5, a = 0, b = -2 is NaN',
          nan(betaI(1.5, 1, 1)) +
            nan(betaI(0.5, 0, 1)) +
            nan(betaI(0.5, 1, -2)),
          3,
          0
        ),
        measure(
          'quantile at p = -0.1 and 1.1 is NaN',
          nan(chi2Quantile(-0.1, 1)) +
            nan(tQuantile(1.1, 5)) +
            nan(normalQuantile(2)),
          3,
          0
        ),
        measure(
          'quantile at p = 0 and p = 1 is the end of the support',
          Number(normalQuantile(0) === -Infinity) +
            Number(normalQuantile(1) === Infinity) +
            Number(chi2Quantile(0, 3) === 0) +
            Number(chi2Quantile(1, 3) === Infinity),
          4,
          0
        ),
        measure(
          'CDFs at their support ends are 0 and 1',
          Number(chi2Cdf(0, 3) === 0) +
            Number(tCdf(-Infinity, 4) === 0) +
            Number(tCdf(Infinity, 4) === 1),
          3,
          0
        ),
      ];
    },
  },

  // ===========================================================================
  // Intervals
  // ===========================================================================
  {
    id: 'I1',
    family: 'intervals',
    kind: 'analytic',
    title: 'A coverage level is a number of sigmas, and back',
    source:
      'the normal law: P(|Z| < k) = erf(k / sqrt 2); 1 sigma = 0.6826894921370859, 2 sigma = 0.9544997361036416, 3 sigma = 0.9973002039367398',
    why: 'The fitter reports a Delta chi-square = 1 interval; the kernel must call it what it is: 68.27%, not "68%".',
    run() {
      const out = [];
      for (const [k, lvl] of [
        [1, 0.6826894921370859],
        [2, 0.9544997361036416],
        [3, 0.9973002039367398],
      ]) {
        out.push(
          measure(`level of ${k} sigma`, levelOfSigma(k), lvl, 1e-13),
          measure(`sigma of level ${lvl}`, sigmaOfLevel(lvl), k, 1e-9)
        );
      }
      const iv = covarianceInterval(10, 2, { level: 0.9544997361036416 });
      out.push(
        measure(
          'covarianceInterval(10, 2) at 2 sigma: low end',
          iv.lo,
          6,
          1e-8
        ),
        measure('... high end', iv.hi, 14, 1e-8),
        measure(
          '... the label is its method',
          Number(iv.method === 'covariance'),
          1,
          0
        ),
        measure(
          '... a Delta chi-square = 1 interval is 68.27%: chi2Cdf(1, 1)',
          chi2Cdf(1, 1),
          0.6826894921370859,
          1e-12
        )
      );
      return out;
    },
  },
  {
    id: 'I2',
    family: 'intervals',
    kind: 'analytic',
    title:
      'Linear least squares: the fitter and the closed form agree, and the covariance interval is theirs',
    source:
      'the normal equations of a weighted line: b = (Sw Sxy - Sx Sy) / D, a = (Sxx Sy - Sx Sxy) / D, C = (1/D) [[Sxx, -Sx], [-Sx, Sw]], D = Sw Sxx - Sx^2 (Press et al., Numerical Recipes, 15.2)',
    why: 'The kernel labels intervals; the numbers under them come from fit.js, whose covariance must be the closed form for a model that is linear.',
    run() {
      const { u, z } = rng(20154);
      const n = 15;
      const x = Array.from({ length: n }, (_, i) => i * 0.8);
      const s = x.map((_, i) => 0.4 + 0.05 * (i % 4));
      const y = x.map((xi, i) => 1.5 + 2 * xi + s[i] * z());
      void u;
      const cf = wlsLine(x, y, s);
      const problem = lineProblem(x, y, s);
      const fit = refine(problem, [0, 0], {
        tolerance: 1e-14,
        maxIterations: 400,
      });
      const cov = covarianceAt(problem, fit.theta);
      const sa = Math.sqrt(cf.C[0][0]);
      const sb = Math.sqrt(cf.C[1][1]);
      const level = 0.95;
      const ivb = covarianceInterval(fit.theta[1], cov.sigma[1], { level });
      const zc = zRef(level);
      return [
        measure(
          'intercept, fit minus closed form, in sigma',
          (fit.theta[0] - cf.a) / sa,
          0,
          TOL.fitter
        ),
        measure(
          'slope, fit minus closed form, in sigma',
          (fit.theta[1] - cf.b) / sb,
          0,
          TOL.fitter
        ),
        measure(
          'chi-square, fit minus closed form, relative',
          fit.best.chi2 / cf.chi2 - 1,
          0,
          TOL.fitter
        ),
        measure(
          'covariance sigma of the slope against the closed form, relative',
          cov.sigma[1] / sb - 1,
          0,
          TOL.fitter
        ),
        measure(
          '95% covariance interval of the slope: half-width over z sigma, minus 1',
          (ivb.hi - ivb.lo) / 2 / (zc * sb) - 1,
          0,
          TOL.fitter
        ),
        measure(
          '... centred on the fitted slope, in sigma',
          ((ivb.hi + ivb.lo) / 2 - cf.b) / sb,
          0,
          TOL.fitter
        ),
      ];
    },
  },
  {
    id: 'I3',
    family: 'intervals',
    kind: 'analytic',
    title: 'A profile interval against the analytic ellipse',
    source:
      'for a model linear in two parameters the chi-square is a quadratic form, so profiling one parameter gives Delta chi^2 = (b - b0)^2 / C_bb, and the interval at coverage L is b0 +- z_L sqrt(C_bb), the shadow of the joint ellipse (Press et al., 15.6)',
    why: 'The fitter profiles by re-fitting; the interval kernel reads the crossing off the profile. Both must land on the ellipse.',
    run() {
      const { z } = rng(20155);
      const n = 14;
      const x = Array.from({ length: n }, (_, i) => i - 3);
      const s = x.map(() => 0.6);
      const y = x.map((xi, i) => -0.5 + 0.7 * xi + s[i] * z());
      const cf = wlsLine(x, y, s);
      const sb = Math.sqrt(cf.C[1][1]);
      const problem = lineProblem(x, y, s);
      const fit = refine(problem, [0, 0], {
        tolerance: 1e-14,
        maxIterations: 400,
      });
      const values = Array.from(
        { length: 25 },
        (_, i) => fit.theta[1] + (i - 12) * 0.5 * sb
      );
      const pts = profile(problem, fit.theta, 1, values, {
        tolerance: 1e-14,
        profileIterations: 80,
      });
      const out = [];
      for (const level of [0.6826894921370859, 0.9, 0.95, 0.99]) {
        const iv = profileInterval(pts, fit.best.chi2, { level });
        const half = zRef(level) * sb;
        out.push(
          measure(
            `level ${level.toFixed(4)}: low end against b0 - z sigma, in sigma`,
            (iv.lo - (cf.b - half)) / sb,
            0,
            TOL.fitter
          ),
          measure(
            `level ${level.toFixed(4)}: high end against b0 + z sigma, in sigma`,
            (iv.hi - (cf.b + half)) / sb,
            0,
            TOL.fitter
          )
        );
      }
      const d1 = profileInterval(pts, fit.best.chi2, { deltaChi2: 1 });
      out.push(
        measure(
          'deltaChi2 = 1 is labelled with its coverage 0.6827',
          d1.level,
          0.6826894921370859,
          1e-12
        ),
        measure(
          'deltaChi2 = 1 gives b0 +- sigma, in sigma',
          (d1.hi - d1.lo) / 2 / sb,
          1,
          TOL.fitter
        ),
        measure(
          'the label is the method',
          Number(d1.method === 'profile'),
          1,
          0
        )
      );
      return out;
    },
  },
  {
    id: 'I4',
    family: 'intervals',
    kind: 'analytic',
    title:
      'A Poisson count fit against the analytic maximum, and its profile against a second method',
    source:
      'for counts n_i in exposures t_i the likelihood is maximal at lambda = sum n / sum t exactly; the deviance D(L) = 2 (L - N - N ln (L / N)), L = lambda sum t, N = sum n, is chi-square distributed with 1 dof in the large-count limit (Cash 1979, ApJ 228, 939)',
    why: 'Counting is the other half of the survey and occurrence work; the maximum is closed form, the interval is a root.',
    run() {
      const counts = [3, 5, 2, 7, 4, 6, 1, 4];
      const N = counts.reduce((a, b) => a + b, 0);
      const t = 1.5;
      const T = t * counts.length;
      const out = [];
      const dev = lam => 2 * (lam * T - N - N * Math.log((lam * T) / N));
      for (const level of [0.6826894921370859, 0.95]) {
        const iv = poissonInterval(counts, { exposure: t, level });
        const thr = zRef(level) ** 2;
        const lam0 = N / T;
        const lo = bisect(l => dev(l) - thr, 1e-9, lam0);
        const hi = bisect(l => thr - dev(l), lam0, 10 * lam0);
        out.push(
          measure(
            `rate is sum n / sum t (level ${level.toFixed(3)})`,
            iv.rate,
            lam0,
            1e-14
          ),
          measure(
            `low end against bisection on the deviance (level ${level.toFixed(3)}), relative`,
            iv.lo / lo - 1,
            0,
            TOL.secondMethod
          ),
          measure(
            `high end against bisection on the deviance (level ${level.toFixed(3)}), relative`,
            iv.hi / hi - 1,
            0,
            TOL.secondMethod
          )
        );
      }
      return out;
    },
  },
  {
    id: 'I5',
    family: 'intervals',
    kind: 'oracle',
    title:
      'The profile deviance interval against the exact (Garwood) interval for many counts',
    source:
      'Garwood (1936): for N events the exact interval is chi2_((1-L)/2)(2N) / 2 to chi2_((1+L)/2)(2N + 2) / 2, here by the Wilson-Hilferty approximation (Wilson and Hilferty 1931) written in this file',
    why: 'For large N the likelihood interval and the exact one agree to the order 1/N; the horse-kick total (196) and 1,000 events must.',
    run() {
      const out = [];
      for (const [N, years] of [
        [196, 280],
        [1000, 1],
      ]) {
        const iv = poissonInterval([N], { exposure: years, level: 0.95 });
        const gl = wilsonHilferty(0.025, 2 * N) / 2 / years;
        const gh = wilsonHilferty(0.975, 2 * N + 2) / 2 / years;
        out.push(
          measure(
            `N = ${N}: low end over the Garwood low end, minus 1`,
            iv.lo / gl - 1,
            0,
            0.01
          ),
          measure(
            `N = ${N}: high end over the Garwood high end, minus 1`,
            iv.hi / gh - 1,
            0,
            0.01
          )
        );
      }
      return out;
    },
  },
  {
    id: 'I6',
    family: 'intervals',
    kind: 'ensemble',
    title: 'The stated interval covers the truth at the stated rate',
    source:
      'a seeded ensemble of 1,500 straight-line data sets (n = 12, known sigma = 0.5, truth a = 1, b = 2) and of 1,500 samples of a Student-t mean (n = 8): the fraction of intervals that contain the truth, against the stated level, in a band of 4 binomial standard errors',
    why: 'An interval is a promise about a rate; the rate is measured, not asserted.',
    run() {
      const out = [];
      const trials = 1500;
      const { z } = rng(15401);
      const x = Array.from({ length: 12 }, (_, i) => i * 0.5);
      const s = x.map(() => 0.5);
      const hit = { cov68: 0, prof68: 0, cov95: 0, prof95: 0, t95: 0 };
      const L68 = 0.6826894921370859;
      for (let k = 0; k < trials; k++) {
        const y = x.map((xi, i) => 1 + 2 * xi + s[i] * z());
        const cf = wlsLine(x, y, s);
        const sb = Math.sqrt(cf.C[1][1]);
        for (const [tag, level] of [
          ['68', L68],
          ['95', 0.95],
        ]) {
          const c = covarianceInterval(cf.b, sb, { level });
          if (c.lo <= 2 && 2 <= c.hi) hit[`cov${tag}`]++;
          // The profile of a linear model is a parabola; the kernel reads the crossing.
          const pts = Array.from({ length: 21 }, (_, i) => {
            const v = cf.b + (i - 10) * 0.4 * sb;
            return { value: v, chi2: cf.chi2 + ((v - cf.b) / sb) ** 2 };
          });
          const p = profileInterval(pts, cf.chi2, { level });
          if (p.lo <= 2 && 2 <= p.hi) hit[`prof${tag}`]++;
        }
        const sample = Array.from({ length: 8 }, () => 3 + 2 * z());
        const t = studentInterval(sample, { level: 0.95 });
        if (t.lo <= 3 && 3 <= t.hi) hit.t95++;
      }
      for (const [name, key, level] of [
        ['covariance interval, 68.27%', 'cov68', L68],
        ['profile interval, 68.27%', 'prof68', L68],
        ['covariance interval, 95%', 'cov95', 0.95],
        ['profile interval, 95%', 'prof95', 0.95],
        ['Student-t interval of a mean, 95%', 't95', 0.95],
      ])
        out.push(
          measure(
            `${name}: coverage`,
            hit[key] / trials,
            level,
            band(level, trials)
          )
        );
      return out;
    },
  },
  {
    id: 'I7',
    family: 'intervals',
    kind: 'oracle',
    title:
      'The bootstrap interval of a Gaussian mean against the t interval, within the Monte Carlo error',
    source:
      'the exact bootstrap standard error of a mean is s_n / sqrt(n) with s_n the divisor-n standard deviation (Efron and Tibshirani 1993, 6.2); an endpoint quantile of B draws has standard deviation SE sqrt(p (1-p) / B) / phi(z)',
    why: 'The roadmap names this comparison: at the fixed seed the bootstrap and the t interval differ by the Monte Carlo error and by the known small difference in the pivot, and by nothing else.',
    run() {
      const n = 400;
      const B = 4000;
      const { z } = rng(15402);
      const data = Array.from({ length: n }, () => 10 + 3 * z());
      const run = caseBootstrap({
        n,
        statistic: idx => {
          let s = 0;
          for (let i = 0; i < idx.length; i++) s += data[idx[i]];
          return s / idx.length;
        },
        draws: B,
        seed: 'statistics-I7',
      });
      const boot = percentileInterval(run.samples, { level: 0.95 });
      const t = studentInterval(data, { level: 0.95 });
      const se = sd(data) / Math.sqrt(n);
      const mcEnd = (se * Math.sqrt((0.025 * 0.975) / B)) / pdfRef(1.959964);
      // Allowance for the pivot: the bootstrap SE is smaller by sqrt((n-1)/n),
      // and z is 1.960 where t is 1.966: about 0.8% of the half-width, plus the
      // sample's skewness (order 1/sqrt n of the half-width): 2% of one SE.
      const pivot = 0.02 * se;
      const sn = Math.sqrt(
        data.reduce((a, v) => a + (v - mean(data)) ** 2, 0) / n
      );
      return [
        measure(
          'low end, bootstrap minus t, in SE of the mean',
          (boot.lo - t.lo) / se,
          0,
          (TOL.sigmas * mcEnd + pivot) / se
        ),
        measure(
          'high end, bootstrap minus t, in SE of the mean',
          (boot.hi - t.hi) / se,
          0,
          (TOL.sigmas * mcEnd + pivot) / se
        ),
        measure(
          'standard deviation of the draws over the exact bootstrap SE, minus 1',
          sd(run.samples) / (sn / Math.sqrt(n)) - 1,
          0,
          TOL.sigmas / Math.sqrt(2 * B)
        ),
        measure(
          'the estimate is the sample mean',
          run.estimate,
          mean(data),
          1e-12
        ),
      ];
    },
  },
  {
    id: 'I8',
    family: 'intervals',
    kind: 'ensemble',
    title: 'Coverage of the bootstrap percentile interval on a fixed ensemble',
    source:
      'Efron and Tibshirani (1993), ch. 13: the percentile interval of a mean under-covers slightly at small n; 300 samples of n = 40, 600 draws each',
    why: "The bootstrap's stated level must hold to within its known small-sample deficit.",
    run() {
      const { z } = rng(15403);
      const trials = 300;
      let hit = 0;
      for (let k = 0; k < trials; k++) {
        const data = Array.from({ length: 40 }, () => 5 + 2 * z());
        const run = caseBootstrap({
          n: 40,
          statistic: idx => {
            let s = 0;
            for (let i = 0; i < idx.length; i++) s += data[idx[i]];
            return s / idx.length;
          },
          draws: 600,
          seed: `statistics-I8-${k}`,
        });
        const iv = percentileInterval(run.samples, { level: 0.95 });
        if (iv.lo <= 5 && 5 <= iv.hi) hit++;
      }
      return [
        measure(
          '95% percentile interval of a mean: coverage',
          hit / trials,
          0.95,
          band(0.95, trials) + TOL.bootstrapUnderCoverage
        ),
      ];
    },
  },
  {
    id: 'I9',
    family: 'intervals',
    kind: 'ensemble',
    title: 'Monte Carlo propagation of a covariance through a function',
    source:
      'for g = theta_0 + 2 theta_1 of a Gaussian vector, mean g(mean) and variance C_00 + 4 C_11 + 4 C_01 exactly; the sample covariance entry has variance (C_00 C_11 + C_01^2) / B',
    why: 'Propagation is only as good as its treatment of the correlation; a linear function has an exact answer.',
    run() {
      const mean0 = [1, 2];
      const C = [
        [0.04, 0.012],
        [0.012, 0.09],
      ];
      const B = 20000;
      const run = propagate({
        mean: mean0,
        covariance: C,
        fn: t => t[0] + 2 * t[1],
        draws: B,
        seed: 'statistics-I9',
      });
      const v = 0.04 + 4 * 0.09 + 4 * 0.012;
      const iv = percentileInterval(run.samples, { level: 0.95 });
      const mcEnd =
        (Math.sqrt(v) * Math.sqrt((0.025 * 0.975) / B)) / pdfRef(1.959964);
      const both = propagate({
        mean: mean0,
        covariance: C,
        fn: t => [t[0], t[1]],
        draws: B,
        seed: 'statistics-I9-vector',
      });
      const m0 = mean(both.samples.map(r => r[0]));
      const m1 = mean(both.samples.map(r => r[1]));
      const c01 =
        both.samples.reduce((a, r) => a + (r[0] - m0) * (r[1] - m1), 0) /
        (B - 1);
      return [
        measure(
          'mean of g',
          mean(run.samples),
          5,
          (TOL.sigmas * Math.sqrt(v)) / Math.sqrt(B)
        ),
        measure(
          'variance of g over the analytic, minus 1',
          sd(run.samples) ** 2 / v - 1,
          0,
          TOL.sigmas * Math.sqrt(2 / B)
        ),
        measure(
          '95% interval, low end',
          iv.lo,
          5 - 1.959964 * Math.sqrt(v),
          TOL.sigmas * mcEnd
        ),
        measure(
          '95% interval, high end',
          iv.hi,
          5 + 1.959964 * Math.sqrt(v),
          TOL.sigmas * mcEnd
        ),
        measure(
          'sample covariance of the two parameters',
          c01,
          0.012,
          (TOL.sigmas * Math.sqrt(0.04 * 0.09 + 0.012 ** 2)) / Math.sqrt(B)
        ),
        measure(
          'the stream that drew is recorded (seed key and id)',
          Number(
            run.stream?.id === 'noise' && typeof run.stream?.key === 'string'
          ),
          1,
          0
        ),
        measure(
          'the same seed gives the same draws, bit for bit',
          Number(
            Object.is(
              propagate({
                mean: mean0,
                covariance: C,
                fn: t => t[0] + 2 * t[1],
                draws: B,
                seed: 'statistics-I9',
              }).samples[7],
              run.samples[7]
            )
          ),
          1,
          0
        ),
      ];
    },
  },
  {
    id: 'I10',
    family: 'intervals',
    kind: 'ensemble',
    title: 'The residual bootstrap of a fitted slope',
    source:
      "for a straight line with white noise the slope's sampling standard deviation is sigma sqrt(C_bb) of the closed form; the residual bootstrap (Efron and Tibshirani 1993, 9.5) estimates it from the residuals, with the n/(n-p) inflation for the parameters used",
    why: 'The second resampling scheme, on a model whose answer is closed form.',
    run() {
      const { z } = rng(15404);
      const n = 60;
      const x = Array.from({ length: n }, (_, i) => i / 10);
      const s = x.map(() => 1);
      const y = x.map(xi => 0.5 + 1.2 * xi + 0.8 * z());
      const cf = wlsLine(x, y, s);
      const fit = x.map(xi => cf.a + cf.b * xi);
      const residuals = y.map((yi, i) => yi - fit[i]);
      const B = 3000;
      const run = residualBootstrap({
        fit,
        residuals,
        parameters: 2,
        refit: yb => wlsLine(x, yb, s).b,
        draws: B,
        seed: 'statistics-I10',
      });
      const s2 = residuals.reduce((a, r) => a + r * r, 0) / (n - 2);
      const expected = Math.sqrt(s2 * cf.C[1][1]);
      return [
        measure(
          'standard deviation of the bootstrapped slopes over sigma sqrt(C_bb), minus 1',
          sd(run.samples) / expected - 1,
          0,
          TOL.sigmas / Math.sqrt(2 * B) + 0.02
        ),
        measure(
          'the draws are centred on the fitted slope, in SE',
          (mean(run.samples) - cf.b) / expected,
          0,
          TOL.sigmas / Math.sqrt(B)
        ),
      ];
    },
  },
  {
    id: 'I11',
    family: 'intervals',
    kind: 'negative',
    title:
      'Refusals: no sigma, an open profile, a covariance that is not one, a draw count over the budget',
    source:
      'the contract in STATISTICS.md: a method answers "refused" with a code, or reports a side as open, rather than return a number it cannot stand behind',
    why: 'Misspecification must be visible in the result, not in a later chart.',
    run() {
      const flat = Array.from({ length: 9 }, (_, i) => ({
        value: i,
        chi2: 10 + 0.01 * i,
      }));
      const open = profileInterval(flat, 10, { deltaChi2: 1 });
      const nonPsd = propagate({
        mean: [0, 0],
        covariance: [
          [1, 2],
          [2, 1],
        ],
        fn: t => t[0],
        draws: 100,
        seed: 's',
      });
      const missing = propagate({
        mean: [0, 0],
        covariance: null,
        fn: t => t[0],
        draws: 100,
        seed: 's',
      });
      return [
        measure(
          'covarianceInterval with sigma NaN is refused',
          Number(covarianceInterval(1, NaN).status === 'refused'),
          1,
          0
        ),
        measure(
          'covarianceInterval with sigma < 0 is refused',
          Number(covarianceInterval(1, -2).status === 'refused'),
          1,
          0
        ),
        measure(
          'a profile that never rises by the level has both sides open',
          Number(
            open.lo === null && open.hi === null && open.open[0] && open.open[1]
          ),
          1,
          0
        ),
        measure(
          '... and it still names its method and level',
          Number(
            open.method === 'profile' &&
              Math.abs(open.level - 0.6826894921370859) < 1e-12
          ),
          1,
          0
        ),
        measure(
          'a covariance that is not positive semidefinite is refused',
          Number(nonPsd.status === 'refused' && nonPsd.code === 'covariance'),
          1,
          0
        ),
        measure(
          'a missing covariance is refused',
          Number(missing.status === 'refused'),
          1,
          0
        ),
        measure(
          'a draw count over the budget throws "budget"',
          throwsCode(
            () =>
              caseBootstrap({
                n: 10,
                statistic: () => 0,
                draws: DRAW_BUDGET.max + 1,
                seed: 's',
              }),
            'budget'
          ),
          1,
          0
        ),
        measure(
          'a non-integer draw count throws "draws"',
          throwsCode(
            () =>
              propagate({
                mean: [0],
                covariance: [[1]],
                fn: () => 0,
                draws: 12.5,
                seed: 's',
              }),
            'draws'
          ),
          1,
          0
        ),
        measure(
          'a bootstrap of one row is refused',
          Number(
            caseBootstrap({ n: 1, statistic: () => 0, draws: 10, seed: 's' })
              .status === 'refused'
          ),
          1,
          0
        ),
        measure(
          'the Student interval of one value is refused',
          Number(studentInterval([4]).status === 'refused'),
          1,
          0
        ),
        measure(
          'the budget is a fixed number the contract states',
          DRAW_BUDGET.default,
          1000,
          0
        ),
      ];
    },
  },
  {
    id: 'I12',
    family: 'intervals',
    kind: 'authentic',
    title: "Student's sleep data: the paired t interval and test",
    source:
      "Cushny and Peebles (1905), in Student (1908), Biometrika 6, 1; as printed by R's t.test(extra ~ group, data = sleep, paired = TRUE): t = -4.0621, df = 9, p = 0.002833, 95% interval -2.4598858 to -0.7001142, mean difference -1.58 (the sign is the order of the groups)",
    why: 'A real dataset and a published result nobody tuned the kernel to: the t interval and the paired difference of two correlated measurements.',
    run() {
      const d = SLEEP.drug2.map((v, i) => v - SLEEP.drug1[i]);
      const iv = studentInterval(d, { level: 0.95 });
      const se = sd(d) / Math.sqrt(d.length);
      const t = mean(d) / se;
      const p = 2 * (1 - tCdf(Math.abs(t), 9));
      return [
        measure('mean difference', iv.value, 1.58, 1e-9),
        measure('degrees of freedom', iv.dof, 9, 0),
        measure('low end of the 95% interval', iv.lo, 0.7001142, 5e-7),
        measure('high end of the 95% interval', iv.hi, 2.4598858, 5e-7),
        measure('t statistic', t, 4.0621, 5e-5),
        measure('two-sided p value', p, 0.002833, 5e-7),
      ];
    },
  },

  // ===========================================================================
  // Residual diagnostics
  // ===========================================================================
  {
    id: 'R1',
    family: 'diagnostics',
    kind: 'analytic',
    title:
      'Normalised residuals, lag-one autocorrelation and the runs distribution in closed form',
    source:
      'for an alternating sequence +a, -a, ... of length n the lag-one coefficient is -(n-1)/n; the runs of n1 ones and n2 zeros have mean 2 n1 n2 / n + 1 and variance 2 n1 n2 (2 n1 n2 - n) / (n^2 (n-1)) (Wald and Wolfowitz 1940)',
    why: 'The three diagnostics each have an exact value on a sequence anyone can write down.',
    run() {
      const alt = Array.from({ length: 20 }, (_, i) => (i % 2 ? -3 : 3));
      const r1 = lagOne(alt);
      const nr = normalisedResiduals({
        y: [3, 5, 8],
        fit: [2, 5, 6],
        sigma: [0.5, 1, 2],
      });
      const pmf = runsPmf(7, 9);
      const n = 16;
      let m = 0;
      let m2 = 0;
      let tot = 0;
      pmf.forEach((p, r) => {
        tot += p;
        m += p * r;
        m2 += p * r * r;
      });
      return [
        measure(
          'lag-one of an alternating sequence of 20',
          r1.r1,
          -19 / 20,
          1e-14
        ),
        measure(
          'normalised residuals: (3-2)/0.5, 0, (8-6)/2',
          Math.abs(nr.values[0] - 2) +
            Math.abs(nr.values[1]) +
            Math.abs(nr.values[2] - 1),
          0,
          1e-15
        ),
        measure('runs distribution sums to 1', tot, 1, 1e-13),
        measure(
          'runs distribution: mean against 2 n1 n2 / n + 1',
          m,
          (2 * 7 * 9) / n + 1,
          1e-12
        ),
        measure(
          'runs distribution: variance against the closed form',
          m2 - m * m,
          (2 * 7 * 9 * (2 * 7 * 9 - n)) / (n * n * (n - 1)),
          1e-12
        ),
        measure(
          'without error bars the residuals are scaled by their own rms and the result says so',
          Number(
            normalisedResiduals({
              y: [1, 2, 3, 4],
              fit: [1.1, 1.9, 3.2, 3.8],
              parameters: 1,
            }).scale === 'estimated'
          ),
          1,
          0
        ),
      ];
    },
  },
  {
    id: 'R2',
    family: 'diagnostics',
    kind: 'oracle',
    title:
      'The exact runs distribution against brute-force enumeration, and the normal approximation against it',
    source:
      'enumeration of every arrangement of n1 ones and n2 zeros for n <= 14 (written in this file); the normal approximation with continuity correction at n = 60',
    why: 'The kernel uses a recurrence; the oracle counts arrangements.',
    run() {
      let worst = 0;
      for (const [n1, n2] of [
        [1, 5],
        [3, 3],
        [4, 7],
        [6, 8],
        [7, 7],
        [2, 12],
      ]) {
        const ref = runsByEnumeration(n1, n2);
        const pmf = runsPmf(n1, n2);
        for (let r = 0; r < ref.length; r++)
          worst = Math.max(worst, Math.abs((pmf[r] ?? 0) - ref[r]));
      }
      const signs = Array.from({ length: 60 }, (_, i) =>
        i % 5 === 0 || i % 7 === 1 ? 1 : -1
      );
      const ex = runsTest(signs, { center: 0, method: 'exact' });
      const ap = runsTest(signs, { center: 0, method: 'normal' });
      return [
        measure(
          'exact distribution against enumeration over six splits, largest deviation',
          worst,
          0,
          1e-13
        ),
        measure(
          'exact against normal two-sided p at n = 60',
          ap.pTwoSided - ex.pTwoSided,
          0,
          0.03
        ),
      ];
    },
  },
  {
    id: 'R3',
    family: 'diagnostics',
    kind: 'analytic',
    title:
      'A normal-probability plot of exact normal quantiles is a straight line of slope 1',
    source:
      'Blom plotting positions p_i = (i - 3/8) / (n + 1/4) (Blom 1958); values equal to the quantiles at those positions fall on y = x (Filliben 1975: probability plot correlation coefficient = 1)',
    why: "The plot's axes are a quantile function; a sample that is exactly the quantiles must come out exact.",
    run() {
      const n = 25;
      const vals = Array.from({ length: n }, (_, i) =>
        zq((i + 1 - 0.375) / (n + 0.25))
      ).reverse();
      const plot = normalProbability(vals);
      return [
        measure('correlation of the plot', plot.correlation, 1, 1e-9),
        measure('slope', plot.slope, 1, 1e-8),
        measure('intercept', plot.intercept, 0, 1e-8),
        measure(
          'theoretical position 1 against the quantile by bisection',
          plot.theoretical[0],
          zq((1 - 0.375) / (n + 0.25)),
          1e-9
        ),
      ];
      function zq(p) {
        return bisect(z => phiRef(z) - p, -12, 12);
      }
    },
  },
  {
    id: 'R4',
    family: 'diagnostics',
    kind: 'ensemble',
    title:
      'False-alarm rates of the diagnostics on white noise, and their power',
    source:
      'a seeded ensemble of 2,000 white-noise series of n = 100 (and n = 200 for lag one): the fraction flagged at 5% against 0.05, in 4 binomial standard errors, widened by 0.02 for the runs test (its distribution is discrete, so it cannot reach 5% exactly); power on an AR(1) series with phi = 0.6 and on exponential residuals',
    why: 'A diagnostic that cries wolf, or never does, is worse than none.',
    run() {
      const { z } = rng(15405);
      const trials = 2000;
      let runsHit = 0;
      let lagHit = 0;
      let arHit = 0;
      let better = 0;
      for (let k = 0; k < trials; k++) {
        const w = Array.from({ length: 100 }, () => z());
        if (runsTest(w, { center: 'median' }).pTwoSided < 0.05) runsHit++;
        const w2 = Array.from({ length: 200 }, () => z());
        if (lagOne(w2).p < 0.05) lagHit++;
        if (k < 300) {
          const ar = [];
          let prev = 0;
          for (let i = 0; i < 200; i++) {
            prev = 0.6 * prev + z();
            ar.push(prev);
          }
          if (lagOne(ar).p < 0.05) arHit++;
        }
      }
      // The comparison of plots: Gaussian samples against exponential ones, paired.
      const { u } = rng(15406);
      const m = 300;
      for (let k = 0; k < m; k++) {
        const g = Array.from({ length: 100 }, () => z());
        const e = Array.from({ length: 100 }, () => -Math.log(1 - u()));
        if (normalProbability(g).correlation > normalProbability(e).correlation)
          better++;
      }
      return [
        measure(
          'runs test about the median, white noise: rate flagged at 5%',
          runsHit / trials,
          0.05,
          band(0.05, trials) + 0.02
        ),
        measure(
          'lag-one test, white noise: rate flagged at 5%',
          lagHit / trials,
          0.05,
          band(0.05, trials) + 0.01
        ),
        measure(
          'lag-one test on AR(1) phi = 0.6: rate flagged (power)',
          arHit / 300,
          1,
          0.01
        ),
        measure(
          'probability-plot correlation: Gaussian above exponential, fraction of pairs',
          better / m,
          1,
          0.01
        ),
      ];
    },
  },
  {
    id: 'R5',
    family: 'diagnostics',
    kind: 'negative',
    title: 'Diagnostics that cannot be computed say so',
    source:
      'the definitions: a runs test needs both signs present; a lag-one coefficient needs 3 values and a variance; a probability plot needs 3 values',
    why: 'A constant residual list must not come back as "random".',
    run() {
      return [
        measure(
          'runs test of all-positive values is refused',
          Number(runsTest([1, 2, 3, 4], { center: 0 }).status === 'refused'),
          1,
          0
        ),
        measure(
          'runs test of fewer than 2 values is refused',
          Number(runsTest([1]).status === 'refused'),
          1,
          0
        ),
        measure(
          'lag one of a constant series is refused',
          Number(lagOne([2, 2, 2, 2]).status === 'refused'),
          1,
          0
        ),
        measure(
          'lag one of 2 values is refused',
          Number(lagOne([1, 2]).status === 'refused'),
          1,
          0
        ),
        measure(
          'a probability plot of 2 values is refused',
          Number(normalProbability([1, 2]).status === 'refused'),
          1,
          0
        ),
        measure(
          'residuals with a zero sigma are refused',
          Number(
            normalisedResiduals({ y: [1, 2], fit: [1, 1], sigma: [1, 0] })
              .status === 'refused'
          ),
          1,
          0
        ),
        measure(
          'residuals of different lengths are refused',
          Number(
            normalisedResiduals({ y: [1, 2], fit: [1] }).status === 'refused'
          ),
          1,
          0
        ),
      ];
    },
  },
  {
    id: 'R6',
    family: 'diagnostics',
    kind: 'authentic',
    title:
      "Anscombe's quartet: the line of dataset I, and the pattern in the residuals of dataset II",
    source:
      "Anscombe (1973), The American Statistician 27, 17: datasets I and II share the fit y = 3.00 + 0.500 x, residual sum of squares 13.75, standard error of the slope 0.118 (the paper's own figures); dataset II is a smooth curve, and the runs of its residuals about the line are the standard picture of a wrong model",
    why: 'Published values the kernel was not tuned to, and the case every course shows to explain why a fit statistic is not enough. Fixed before the run: the runs test of dataset II must flag too few runs at 5% (one-sided), and that of dataset I need not.',
    run() {
      const out = [];
      for (const [tag, y] of [
        ['I', ANSCOMBE.y1],
        ['II', ANSCOMBE.y2],
      ]) {
        const problem = lineProblem(ANSCOMBE.x, y, null);
        const fit = refine(problem, [0, 0], {
          tolerance: 1e-14,
          maxIterations: 400,
        });
        const cov = covarianceAt(problem, fit.theta);
        const dof = y.length - 2;
        const rss = fit.best.chi2;
        const se = Math.sqrt(cov.covariance[1][1] * (rss / dof));
        out.push(
          measure(`dataset ${tag}: intercept`, fit.theta[0], 3.0, 0.005),
          measure(`dataset ${tag}: slope`, fit.theta[1], 0.5, 0.005),
          measure(`dataset ${tag}: residual sum of squares`, rss, 13.75, 0.03),
          measure(
            `dataset ${tag}: standard error of the slope`,
            se,
            0.118,
            0.0006
          )
        );
        if (tag === 'II') {
          const res = y.map(
            (v, i) => v - fit.theta[0] - fit.theta[1] * ANSCOMBE.x[i]
          );
          // Order by x, as a plot would: the runs are in the order of the abscissa.
          const order = ANSCOMBE.x
            .map((_, i) => i)
            .sort((a, b) => ANSCOMBE.x[a] - ANSCOMBE.x[b]);
          const r = runsTest(
            order.map(i => res[i]),
            { center: 0, method: 'exact' }
          );
          out.push(
            measure(
              'dataset II: runs test, one-sided p for too few runs is at most 0.05',
              Number(r.pFew <= 0.05),
              1,
              0
            )
          );
        }
      }
      return out;
    },
  },

  // ===========================================================================
  // Comparison and the F-test
  // ===========================================================================
  {
    id: 'C1',
    family: 'comparison',
    kind: 'analytic',
    title: 'Var(A - B) with the covariance, and the case where it matters',
    source:
      'Var(A - B) = Var A + Var B - 2 Cov(A, B); for a line fitted to x = 0..10 the difference of the predictions at x1 and x2 has variance Var(b) (x1 - x2)^2, because the intercept cancels (Bevington and Robinson 2003, 3.4)',
    why: "Two estimates from the same data are correlated; the roadmap's comparison of 229, 252 and 264 needs the correction, and the case shows what ignoring it does.",
    run() {
      const x = Array.from({ length: 11 }, (_, i) => i);
      const s = x.map(() => 1);
      const y = x.map(xi => 2 + 1.5 * xi);
      const cf = wlsLine(x, y, s);
      const [x1, x2] = [4.5, 5.5];
      const C = cf.C;
      const v = xv => C[0][0] + 2 * xv * C[0][1] + xv * xv * C[1][1];
      const cov12 = C[0][0] + (x1 + x2) * C[0][1] + x1 * x2 * C[1][1];
      const d = difference({
        a: cf.a + cf.b * x1,
        b: cf.a + cf.b * x2,
        varA: v(x1),
        varB: v(x2),
        covAB: cov12,
      });
      const naive = difference({
        a: cf.a + cf.b * x1,
        b: cf.a + cf.b * x2,
        varA: v(x1),
        varB: v(x2),
      });
      const same = difference({ a: 3, b: 3, varA: 0.5, varB: 0.5, covAB: 0.5 });
      return [
        measure(
          'variance with the covariance against Var(b) (x1 - x2)^2',
          d.variance,
          C[1][1] * (x1 - x2) ** 2,
          1e-12
        ),
        measure('value is A - B', d.value, cf.b * (x1 - x2), 1e-12),
        measure(
          'variance without the covariance (the covariance taken as zero) is larger, and says it assumed zero',
          Number(
            naive.variance > 10 * d.variance && naive.used.covariance === 0
          ),
          1,
          0
        ),
        measure(
          'an estimate compared with itself has zero variance and no z',
          Number(
            same.variance === 0 &&
              same.z === null &&
              same.status === 'degenerate'
          ),
          1,
          0
        ),
        measure(
          'the label names the method',
          Number(d.method === 'difference'),
          1,
          0
        ),
      ];
    },
  },
  {
    id: 'C2',
    family: 'comparison',
    kind: 'ensemble',
    title:
      'The comparison with the covariance has its stated false-alarm rate; ignoring the covariance does not',
    source:
      'the setting of C1 at 2,000 seeded data sets (sigma = 1, truth a = 2, b = 1.5), testing the true difference of the predictions at x = 4.5 and 5.5 at 5%; the rate without the covariance is 2 (1 - Phi(1.96 sqrt(V_naive / V_true))) exactly',
    why: 'The effect of the correction is measured in a rate, not shown in one example.',
    run() {
      const { z } = rng(15407);
      const x = Array.from({ length: 11 }, (_, i) => i);
      const s = x.map(() => 1);
      const [x1, x2] = [4.5, 5.5];
      let withCov = 0;
      let without = 0;
      const trials = 2000;
      let Vn = 0;
      let Vt = 0;
      for (let k = 0; k < trials; k++) {
        const y = x.map(xi => 2 + 1.5 * xi + z());
        const cf = wlsLine(x, y, s);
        const C = cf.C;
        const v = xv => C[0][0] + 2 * xv * C[0][1] + xv * xv * C[1][1];
        const cov12 = C[0][0] + (x1 + x2) * C[0][1] + x1 * x2 * C[1][1];
        const a = cf.a + cf.b * x1;
        const b = cf.a + cf.b * x2;
        const truth = 1.5 * (x1 - x2);
        const dc = difference({ a, b, varA: v(x1), varB: v(x2), covAB: cov12 });
        const dn = difference({ a, b, varA: v(x1), varB: v(x2) });
        if (Math.abs((dc.value - truth) / dc.sigma) > 1.959964) withCov++;
        if (Math.abs((dn.value - truth) / dn.sigma) > 1.959964) without++;
        Vn = dn.variance;
        Vt = dc.variance;
      }
      const expectedNaive = 2 * (1 - phiRef(1.959964 * Math.sqrt(Vn / Vt)));
      return [
        measure(
          'with the covariance: rate of false alarms at 5%',
          withCov / trials,
          0.05,
          band(0.05, trials)
        ),
        measure(
          'without it: rate of false alarms against the exact value for the wrong variance',
          without / trials,
          expectedNaive,
          band(Math.max(expectedNaive, 1e-4), trials) + 1e-3
        ),
        measure(
          'without it, the stated 5% is not the rate: the rate is below 1%',
          Number(without / trials < 0.01),
          1,
          0
        ),
      ];
    },
  },
  {
    id: 'C3',
    family: 'comparison',
    kind: 'analytic',
    title: 'The F-test of one added parameter is the square of its t test',
    source:
      'for nested linear models differing by one parameter F = t^2 with F on (1, n - p) and t on n - p dof (Draper and Smith 1998, 6.1); the coefficient and its variance from the normal equations of the full model, solved with js/numeric/linalg.js',
    why: 'An identity between two tests, one of which the kernel does not compute, ties the F distribution to the t and the F-test to the regression.',
    run() {
      const { z } = rng(15408);
      const n = 14;
      const x = Array.from({ length: n }, (_, i) => i / 2);
      const y = x.map(xi => 1 + 0.5 * xi + 0.03 * xi * xi + 0.3 * z());
      const fitPoly = deg => {
        const X = x.map(xi =>
          Array.from({ length: deg + 1 }, (_, j) => xi ** j)
        );
        const A = Array.from({ length: deg + 1 }, (_, a) =>
          Array.from({ length: deg + 1 }, (_, b) =>
            X.reduce((s, row) => s + row[a] * row[b], 0)
          )
        );
        const rhs = Array.from({ length: deg + 1 }, (_, a) =>
          X.reduce((s, row, i) => s + row[a] * y[i], 0)
        );
        const c = solve(A, rhs);
        const rss = X.reduce(
          (s, row, i) =>
            s + (y[i] - row.reduce((q, v, j) => q + v * c[j], 0)) ** 2,
          0
        );
        return { c, rss, A };
      };
      const f1 = fitPoly(1);
      const f2 = fitPoly(2);
      const dof = n - 3;
      const s2 = f2.rss / dof;
      // (X^T X)^-1 for the quadratic term, by solving for the unit vector.
      const col = solve(f2.A, [0, 0, 1]);
      const t = f2.c[2] / Math.sqrt(s2 * col[2]);
      const res = fTest({
        rssReduced: f1.rss,
        pReduced: 2,
        rssFull: f2.rss,
        pFull: 3,
        n,
      });
      const pT = 2 * (1 - tCdf(Math.abs(t), dof));
      return [
        measure('F over t^2, minus 1', res.F / (t * t) - 1, 0, 1e-9),
        measure(
          'degrees of freedom (1, n - 3)',
          res.d1 + res.d2 / 100,
          1 + dof / 100,
          1e-12
        ),
        measure('p value against 2 (1 - t CDF)', res.p, pT, 1e-9),
        measure(
          'p value against 1 - F CDF written as the survival function',
          res.p,
          fSf(res.F, 1, dof),
          1e-13
        ),
      ];
    },
  },
  {
    id: 'C4',
    family: 'comparison',
    kind: 'ensemble',
    title: 'The F-test of nested regular models: its level, and its power',
    source:
      'a seeded ensemble of 1,500 data sets of n = 20 from a straight line (null) and from a line with curvature 0.06 per unit^2 (alternative), line against quadratic at 5% (Draper and Smith 1998, 6.1)',
    why: 'In its valid class the test has the level it states.',
    run() {
      const { z } = rng(15409);
      const trials = 1500;
      const x = Array.from({ length: 20 }, (_, i) => (i - 9.5) / 3);
      let nullHit = 0;
      let altHit = 0;
      const rssOf = (y, deg) => {
        const X = x.map(xi =>
          Array.from({ length: deg + 1 }, (_, j) => xi ** j)
        );
        const A = Array.from({ length: deg + 1 }, (_, a) =>
          Array.from({ length: deg + 1 }, (_, b) =>
            X.reduce((s, row) => s + row[a] * row[b], 0)
          )
        );
        const rhs = Array.from({ length: deg + 1 }, (_, a) =>
          X.reduce((s, row, i) => s + row[a] * y[i], 0)
        );
        const c = solve(A, rhs);
        return X.reduce(
          (s, row, i) =>
            s + (y[i] - row.reduce((q, v, j) => q + v * c[j], 0)) ** 2,
          0
        );
      };
      for (let k = 0; k < trials; k++) {
        const e = x.map(() => 0.5 * z());
        const y0 = x.map((xi, i) => 1 + 0.4 * xi + e[i]);
        const y1 = x.map((xi, i) => 1 + 0.4 * xi + 0.3 * xi * xi + e[i]);
        const r0 = fTest({
          rssReduced: rssOf(y0, 1),
          pReduced: 2,
          rssFull: rssOf(y0, 2),
          pFull: 3,
          n: 20,
        });
        const r1 = fTest({
          rssReduced: rssOf(y1, 1),
          pReduced: 2,
          rssFull: rssOf(y1, 2),
          pFull: 3,
          n: 20,
        });
        if (r0.p < 0.05) nullHit++;
        if (r1.p < 0.05) altHit++;
      }
      return [
        measure(
          'rate of rejecting a true line at 5%',
          nullHit / trials,
          0.05,
          band(0.05, trials)
        ),
        measure(
          'rate of rejecting a clearly curved law (power)',
          altHit / trials,
          1,
          0.02
        ),
      ];
    },
  },
  {
    id: 'C5',
    family: 'comparison',
    kind: 'negative',
    title:
      'The F-test refuses a searched period, a boundary alternative, and models that are not nested',
    source:
      'Protassov et al. (2002), ApJ 571, 545 (the F-test is not valid for a line, or for a parameter on the boundary of its space); Lomb (1976) and Scargle (1982): a periodogram peak is the best of many trials, so its significance needs the number of independent frequencies, not an F distribution; Gregory (2005, 12.8)',
    why: 'The misspecified case of the contract: a period searched on a grid is the standard way to get a false detection, and the kernel must say no before it prints a p value. The reason is measured: on pure noise the naive F-test of the best sinusoid on a 100-frequency grid flags at a rate near 1 - 0.95^k for k independent frequencies, here far above 5%.',
    run() {
      const refused = (o, code) =>
        Number(
          fTest({
            rssReduced: 10,
            pReduced: 1,
            rssFull: 8,
            pFull: 3,
            n: 30,
            ...o,
          }).status === 'refused' &&
            fTest({
              rssReduced: 10,
              pReduced: 1,
              rssFull: 8,
              pFull: 3,
              n: 30,
              ...o,
            }).code === code
        );
      // The measured reason: a sinusoid whose period is searched, on white noise.
      const { z } = rng(15410);
      const n = 40;
      const t = Array.from({ length: n }, (_, i) => i + 0.37 * ((i * 7) % 5));
      const periods = Array.from({ length: 100 }, (_, i) => 2.2 + i * 0.4);
      const trials = 400;
      let naive = 0;
      let fixedHit = 0;
      for (let k = 0; k < trials; k++) {
        const y = t.map(() => z());
        const my = mean(y);
        const rss0 = y.reduce((s, v) => s + (v - my) ** 2, 0);
        let best = Infinity;
        let first = Infinity;
        periods.forEach((P, pi) => {
          const w = TAU / P;
          const rows = t.map(ti => [1, Math.sin(w * ti), Math.cos(w * ti)]);
          const M = Array.from({ length: 3 }, (_, a) =>
            Array.from({ length: 3 }, (_, b) =>
              rows.reduce((s, r) => s + r[a] * r[b], 0)
            )
          );
          const rhs = Array.from({ length: 3 }, (_, a) =>
            rows.reduce((s, r, i) => s + r[a] * y[i], 0)
          );
          const c = solve(M, rhs);
          const rss = rows.reduce(
            (s, r, i) =>
              s + (y[i] - r.reduce((q, v, j) => q + v * c[j], 0)) ** 2,
            0
          );
          if (rss < best) best = rss;
          if (pi === 0) first = rss;
        });
        const p = rss =>
          fTest({ rssReduced: rss0, pReduced: 1, rssFull: rss, pFull: 3, n }).p;
        if (p(best) < 0.05) naive++;
        if (p(first) < 0.05) fixedHit++;
      }
      return [
        measure(
          'a searched period is refused, code "searched"',
          refused({ searched: true }, 'searched'),
          1,
          0
        ),
        measure(
          'a boundary alternative (a variance component at zero) is refused, code "boundary"',
          refused({ boundary: true }, 'boundary'),
          1,
          0
        ),
        measure(
          'models that are not nested (the full one has no more parameters) are refused, code "not-nested"',
          refused({ pFull: 1 }, 'not-nested'),
          1,
          0
        ),
        measure(
          'no degrees of freedom left is refused, code "no-dof"',
          refused({ pFull: 30 }, 'no-dof'),
          1,
          0
        ),
        measure(
          'a worse full model (larger RSS) is refused, code "not-nested"',
          refused({ rssFull: 11 }, 'not-nested'),
          1,
          0
        ),
        measure(
          'why: on white noise the naive F-test of the best of 100 searched periods flags at a rate far above 5% (expected order 1 - 0.95^20 = 0.64)',
          naive / trials,
          0.64,
          0.25
        ),
        measure(
          'and at ONE fixed period the same test has its level',
          fixedHit / trials,
          0.05,
          band(0.05, trials)
        ),
      ];
    },
  },
  {
    id: 'C6',
    family: 'comparison',
    kind: 'authentic',
    title: 'Anscombe II: the straight line is rejected for the quadratic',
    source:
      'Anscombe (1973), dataset II, a smooth curve; the nested F-test of line against quadratic (Draper and Smith 1998, 6.1). Fixed before the run: p below 1e-6',
    why: 'A published dataset on which the answer is not in doubt.',
    run() {
      const x = ANSCOMBE.x;
      const y = ANSCOMBE.y2;
      const rssOf = deg => {
        const X = x.map(xi =>
          Array.from({ length: deg + 1 }, (_, j) => xi ** j)
        );
        const A = Array.from({ length: deg + 1 }, (_, a) =>
          Array.from({ length: deg + 1 }, (_, b) =>
            X.reduce((s, row) => s + row[a] * row[b], 0)
          )
        );
        const rhs = Array.from({ length: deg + 1 }, (_, a) =>
          X.reduce((s, row, i) => s + row[a] * y[i], 0)
        );
        const c = solve(A, rhs);
        return X.reduce(
          (s, row, i) =>
            s + (y[i] - row.reduce((q, v, j) => q + v * c[j], 0)) ** 2,
          0
        );
      };
      const r = fTest({
        rssReduced: rssOf(1),
        pReduced: 2,
        rssFull: rssOf(2),
        pFull: 3,
        n: 11,
      });
      return [
        measure('p of line against quadratic on dataset II', r.p, 0, 1e-6),
      ];
    },
  },

  // ===========================================================================
  // The selection function and the biases
  // ===========================================================================
  {
    id: 'B1',
    family: 'selection',
    kind: 'analytic',
    title:
      'A selection function applied to a population has the analytic inclusion fraction',
    source:
      'a population uniform in magnitude on [a, b] and a logistic completeness 1 / (1 + e^((m - m50) / w)): the included fraction is (w / (b - a)) ln((1 + e^-((a - m50)/w)) / (1 + e^-((b - m50)/w))), from the integral of 1 / (1 + e^u) = -ln(1 + e^-u)',
    why: "The object's two ingredients, a cut and an inclusion probability, against the integral of the probability.",
    run() {
      const { u } = rng(15411);
      const N = 40000;
      const [a, b, m50, w] = [14, 20, 17, 0.4];
      const rows = Array.from({ length: N }, () => ({ m: a + (b - a) * u() }));
      const sel = selection({
        name: 'logistic',
        observable: 'm',
        probability: logisticCompleteness({ m50, width: w }),
      });
      const draw = rng(15412).u;
      const res = sel.apply(rows, () => draw());
      const analytic =
        (w / (b - a)) *
        Math.log(
          (1 + Math.exp(-(a - m50) / w)) / (1 + Math.exp(-(b - m50) / w))
        );
      const cut = selection({ name: 'cut', observable: 'm', cut: { max: 17 } });
      const cr = cut.apply(rows, () => 0.5);
      return [
        measure(
          'included fraction against the integral',
          res.included.length / N,
          analytic,
          band(analytic, N)
        ),
        measure(
          'the sum of the probabilities (the expected count) over N against the integral',
          res.expected / N,
          analytic,
          (TOL.sigmas * 0.5) / Math.sqrt(N)
        ),
        measure(
          'a cut at m <= 17 includes the fraction (17 - 14) / 6',
          cr.included.length / N,
          0.5,
          band(0.5, N)
        ),
        measure(
          'the weights of the included objects are 1 / p',
          Math.abs(res.weights[0] * sel.inclusion(rows[res.included[0]]) - 1),
          0,
          1e-15
        ),
      ];
    },
  },
  {
    id: 'B2',
    family: 'selection',
    kind: 'analytic',
    title:
      'Selections compose: independent selections multiply, and the union is 1 - prod (1 - p)',
    source:
      'independent inclusion probabilities: P(all) = prod p_i; P(any) = 1 - prod (1 - p_i)',
    why: 'Composability is the point of the object: survey, then detection, then vetting.',
    run() {
      const { u } = rng(15413);
      const rows = Array.from({ length: 2000 }, () => ({
        m: 14 + 6 * u(),
        c: u(),
      }));
      const s1 = selection({
        name: 'detect',
        observable: 'm',
        probability: logisticCompleteness({ m50: 17, width: 0.4 }),
      });
      const s2 = selection({
        name: 'colour',
        observable: 'c',
        cut: { max: 0.5 },
      });
      const s3 = selection({
        name: 'vet',
        observable: 'c',
        probability: c => 0.9 - 0.4 * c,
      });
      const both = allOf(s1, s2, s3);
      const any = eitherOf(s1, s3);
      let dAll = 0;
      let dAny = 0;
      for (const r of rows) {
        dAll = Math.max(
          dAll,
          Math.abs(
            both.inclusion(r) -
              s1.inclusion(r) * s2.inclusion(r) * s3.inclusion(r)
          )
        );
        dAny = Math.max(
          dAny,
          Math.abs(
            any.inclusion(r) -
              (1 - (1 - s1.inclusion(r)) * (1 - s3.inclusion(r)))
          )
        );
      }
      const N = 30000;
      const big = Array.from({ length: N }, () => ({
        m: 14 + 6 * u(),
        c: u(),
      }));
      const draw = rng(15414).u;
      const res = both.apply(big, () => draw());
      const expected = big.reduce((s, r) => s + both.inclusion(r), 0) / N;
      return [
        measure(
          'all(): inclusion against the product, largest deviation',
          dAll,
          0,
          1e-15
        ),
        measure(
          'either(): inclusion against 1 - prod(1 - p), largest deviation',
          dAny,
          0,
          1e-15
        ),
        measure(
          'the observables of a composite are the union',
          Number(both.observables.join(',') === 'm,c'),
          1,
          0
        ),
        measure(
          'rate included against the mean inclusion',
          res.included.length / N,
          expected,
          band(expected, N)
        ),
      ];
    },
  },
  {
    id: 'B3',
    family: 'selection',
    kind: 'analytic',
    title:
      'Eddington bias: the exact shift for an exponential population, and the measured difference on a synthetic one',
    source:
      'for a population with density proportional to exp(-S/s0) on S >= 0 and Gaussian noise sigma, the posterior of the true S given the observation x is a Gaussian N(x - sigma^2/s0, sigma^2) truncated to S >= 0, with mean mu + sigma phi(a) / (1 - Phi(a)), a = -mu / sigma (Eddington 1913; Jeffreys 1938; Teerikorpi 2004)',
    why: 'The shift is exact in closed form, so a measured difference on a synthetic population can be held to it to the Monte Carlo error. Conditioning on the observed values in a bin, the expected difference is the mean over those objects of the shift at their own observed value.',
    run() {
      const s0 = 1;
      const sigma = 0.4;
      const shiftRef = x => {
        const mu = x - (sigma * sigma) / s0;
        const a = -mu / sigma;
        return mu + (sigma * pdfRef(a)) / (1 - phiRef(a)) - x;
      };
      const out = [];
      let worst = 0;
      for (const x of [0.05, 0.3, 0.8, 1.5, 3, 6])
        worst = Math.max(
          worst,
          Math.abs(
            eddingtonShift({ observed: x, sigma, scale: s0 }) - shiftRef(x)
          )
        );
      out.push(
        measure(
          'eddingtonShift against the truncated-Gaussian formula, largest deviation',
          worst,
          0,
          1e-12
        )
      );
      out.push(
        measure(
          'far from the cut the shift is -sigma^2 / s0',
          eddingtonShift({ observed: 20, sigma, scale: s0 }),
          -(sigma * sigma) / s0,
          1e-12
        )
      );
      const { u, z } = rng(15415);
      const N = 400000;
      const truth = new Float64Array(N);
      const obs = new Float64Array(N);
      for (let i = 0; i < N; i++) {
        truth[i] = -s0 * Math.log(1 - u());
        obs[i] = truth[i] + sigma * z();
      }
      const bins = binnedMeanShift({
        observed: obs,
        truth,
        edges: [0.5, 0.6, 1, 1.1, 2, 2.1, 3, 3.1],
      });
      for (const b of bins) {
        if (b.n < 200) continue;
        let exp = 0;
        for (let i = 0; i < N; i++)
          if (obs[i] >= b.lo && obs[i] < b.hi) exp += shiftRef(obs[i]);
        exp /= b.n;
        out.push(
          measure(
            `observed in [${b.lo}, ${b.hi}): mean (true - observed) against the exact shift (n = ${b.n})`,
            b.shift,
            exp,
            (TOL.sigmas * sigma) / Math.sqrt(b.n)
          )
        );
      }
      return out;
    },
  },
  {
    id: 'B4',
    family: 'selection',
    kind: 'analytic',
    title:
      'Malmquist bias: the shift at a fixed apparent magnitude, and the shift of a magnitude cut at a fixed distance',
    source:
      'number counts growing as 10^(alpha m) and Gaussian absolute magnitudes of scatter sigma give <M> - M0 = -alpha ln(10) sigma^2 at a fixed apparent magnitude, and alpha = 3/5 (uniform density in Euclidean space) gives -1.3816 sigma^2 (Malmquist 1936; Teerikorpi 1997, ARA&A 35, 101); a cut M < M_lim of a Gaussian gives -sigma phi(z) / Phi(z), z = (M_lim - M0) / sigma (a truncated normal; Johnson, Kotz and Balakrishnan 1994, 10.1)',
    why: 'Both Malmquist effects have exact closed forms; the population is drawn uniformly in volume with Gaussian absolute magnitudes, and only the objects whose apparent magnitude falls in a bin are kept.',
    run() {
      const sigma = 0.5;
      const M0 = 0;
      const alpha = 0.6;
      const out = [
        measure(
          'malmquistShift(sigma = 0.5, 3/5) = -1.3816 sigma^2',
          malmquistShift({ sigma }),
          -((3 * Math.LN10) / 5) * sigma * sigma,
          1e-14
        ),
        measure(
          'malmquistShift is -alpha ln10 sigma^2 for another slope (0.4)',
          malmquistShift({ sigma, slope: 0.4 }),
          -0.4 * Math.LN10 * sigma * sigma,
          1e-14
        ),
      ];
      const { u, z } = rng(15416);
      const [mlo, mhi] = [10, 10.5];
      // Distances that can reach the bin for |M - M0| < 6 sigma, sampled uniformly in volume.
      const rlo = 10 ** ((mlo - 6 * sigma - M0 + 5) / 5);
      const rhi = 10 ** ((mhi + 6 * sigma - M0 + 5) / 5);
      const sel = [];
      for (let i = 0; i < 400000; i++) {
        const M = M0 + sigma * z();
        const r = (rlo ** 3 + u() * (rhi ** 3 - rlo ** 3)) ** (1 / 3);
        const m = M + 5 * Math.log10(r / 10);
        if (m >= mlo && m < mhi) sel.push(M);
      }
      const ms = measuredShift(sel, M0);
      out.push(
        measure(
          `measured <M> - M0 at m in [10, 10.5) against -alpha ln10 sigma^2 (n = ${sel.length})`,
          ms.shift,
          -alpha * Math.LN10 * sigma * sigma,
          TOL.sigmas * ms.se
        )
      );
      // The cut at a fixed distance.
      const zc = 0.5;
      const cutM = [];
      const ru = rng(15417);
      for (let i = 0; i < 200000; i++) {
        const M = M0 + sigma * ru.z();
        if (M <= M0 + zc * sigma) cutM.push(M);
      }
      const mc = measuredShift(cutM, M0);
      out.push(
        measure(
          'malmquistCutShift against the truncated-normal formula',
          malmquistCutShift({ sigma, z: zc }),
          -(sigma * pdfRef(zc)) / phiRef(zc),
          1e-12
        ),
        measure(
          `measured shift of a cut at z = 0.5 (n = ${cutM.length})`,
          mc.shift,
          -(sigma * pdfRef(zc)) / phiRef(zc),
          TOL.sigmas * mc.se
        )
      );
      return out;
    },
  },
  {
    id: 'B5',
    family: 'selection',
    kind: 'ensemble',
    title:
      'The completeness correction recovers the true counts and covers them',
    source:
      'a fixed population of N_k objects per bin, each detected with probability c_k: n_k ~ Binomial(N_k, c_k), the estimate n_k / c_k is unbiased with variance N_k (1 - c_k) / c_k, estimated by n_k (1 - c_k) / c_k^2; 2,000 seeded trials, four bins (c = 0.95, 0.8, 0.6, 0.4)',
    why: 'The roadmap\'s "basic completeness correction", with its sampling error carried.',
    run() {
      const { u } = rng(15418);
      const N = [200, 150, 100, 80];
      const c = [0.95, 0.8, 0.6, 0.4];
      const trials = 2000;
      const sum = N.map(() => 0);
      const cover = N.map(() => 0);
      for (let k = 0; k < trials; k++) {
        const n = N.map((Nk, j) => {
          let d = 0;
          for (let i = 0; i < Nk; i++) if (u() < c[j]) d++;
          return d;
        });
        const res = completenessCorrect({
          observed: n,
          completeness: c,
          population: 'fixed',
        });
        res.bins.forEach((b, j) => {
          sum[j] += b.corrected;
          if (Math.abs(b.corrected - N[j]) <= b.sigma) cover[j]++;
        });
      }
      const out = [];
      N.forEach((Nk, j) => {
        const sdBin = Math.sqrt(Nk * c[j] * (1 - c[j])) / c[j];
        out.push(
          measure(
            `bin ${j + 1} (c = ${c[j]}): mean corrected count against N = ${Nk}`,
            sum[j] / trials,
            Nk,
            (TOL.sigmas * sdBin) / Math.sqrt(trials)
          ),
          measure(
            `bin ${j + 1}: coverage of +-1 sigma`,
            cover[j] / trials,
            0.6826894921370859,
            band(0.6826894921370859, trials) + 0.03
          )
        );
      });
      const p = completenessCorrect({
        observed: [10],
        completeness: [0.5],
        population: 'poisson',
      });
      out.push(
        measure(
          'Poisson population: variance estimate is n / c^2',
          p.bins[0].sigma ** 2,
          10 / 0.25,
          1e-12
        )
      );
      return out;
    },
  },
  {
    id: 'B6',
    family: 'selection',
    kind: 'oracle',
    title:
      "The object reproduces the selection-effects suite's detection, flag for flag",
    source:
      'js/survey/model.js observe(): detected = (observed magnitude <= limit) and (a draw from stream(injection, seed:obs, detect, i) < the logistic completeness); the object is that cut and probability; Malmquist: malmquistFormula(sigma) = -(3 ln 10 / 5) sigma^2',
    why: 'The adoption is held to what it replaces: the same stars detected, in one process, so the day the suite swaps its inline test for the object nothing a student sees moves.',
    run() {
      const u = makeUniverse({
        kind: 'gaussian',
        count: 800,
        seed: 'stats-b6',
        meanM: 5,
        sigmaM: 0.7,
      });
      const inst = { limit: 17.6, completeness: { m50: 17.1, width: 0.35 } };
      const obs = observe(u, inst);
      const sel = selection({
        name: 'survey',
        observable: 'm',
        cut: { max: inst.limit },
        probability: logisticCompleteness({
          m50: inst.completeness.m50,
          width: inst.completeness.width,
        }),
      });
      const key = `${u.seed}:obs`;
      const rows = Array.from({ length: u.n }, (_, i) => ({ m: obs.mObs[i] }));
      const res = sel.apply(rows, i => stream('injection', key, 'detect', i)());
      let diff = 0;
      for (let i = 0; i < u.n; i++)
        if (res.flags[i] !== obs.detected[i]) diff++;
      const out = [
        measure(
          'stars whose detection flag differs from observe()',
          diff,
          0,
          0
        ),
        measure('count detected', res.included.length, obs.count, 0),
        measure(
          'the sample is not trivial (some detected, some missed)',
          Number(obs.count > 50 && obs.missed > 50),
          1,
          0
        ),
      ];
      const rel = malmquistShift({ sigma: 0.7 }) / malmquistFormula(0.7) - 1;
      out.push(
        measure(
          "malmquistShift against the suite's malmquistFormula, relative (equal to rounding, not bit for bit: 0.6 ln10 against 3 ln10 / 5)",
          rel,
          0,
          1e-15
        )
      );
      return out;
    },
  },
  {
    id: 'B7',
    family: 'selection',
    kind: 'negative',
    title:
      'Refusals: a probability outside [0, 1], a completeness too low to correct, a scale that is not positive',
    source:
      'the contract in STATISTICS.md: a correction is not made where it multiplies a handful of objects by a large number; an inclusion probability is a probability',
    why: 'Correcting by 1/c with c near zero is how a survey paper gets a number it cannot defend.',
    run() {
      const bad = selection({
        name: 'bad',
        observable: 'x',
        probability: () => 1.5,
      });
      const res = completenessCorrect({
        observed: [5, 3],
        completeness: [0.5, 0.05],
        population: 'poisson',
      });
      return [
        measure(
          'an inclusion probability above 1 throws "probability"',
          throwsCode(() => bad.inclusion({ x: 1 }), 'probability'),
          1,
          0
        ),
        measure(
          'a NaN probability throws',
          throwsCode(
            () =>
              selection({
                name: 'nan',
                observable: 'x',
                probability: () => NaN,
              }).inclusion({ x: 1 }),
            'probability'
          ),
          1,
          0
        ),
        measure(
          'a bin whose completeness is below the floor (0.1) is refused, not corrected',
          Number(
            res.bins[1].status === 'refused' && res.bins[1].corrected === null
          ),
          1,
          0
        ),
        measure(
          '... and the bin above it is corrected',
          res.bins[0].corrected,
          10,
          1e-12
        ),
        measure(
          'a selection with neither a cut nor a probability includes everything',
          Number(selection({ name: 'all' }).inclusion(3) === 1),
          1,
          0
        ),
        measure(
          'eddingtonShift with a non-positive scale is NaN',
          Number(
            Number.isNaN(eddingtonShift({ observed: 1, sigma: 0.2, scale: 0 }))
          ),
          1,
          0
        ),
        measure(
          'a population of one with a bin of no objects is refused by measuredShift',
          Number(measuredShift([], 0).status === 'refused'),
          1,
          0
        ),
      ];
    },
  },
  {
    id: 'B8',
    family: 'selection',
    kind: 'authentic',
    title: "Bortkiewicz's horse kicks: a count fit and its interval",
    source:
      'Bortkiewicz (1898), Das Gesetz der kleinen Zahlen, as tabulated by Quine and Seneta (1987): 280 corps-years, frequencies 144, 91, 32, 11, 2 of 0 to 4 deaths, 196 deaths in all, a Poisson mean of 0.70 per corps-year',
    why: 'The classic count dataset: the fit is the published mean, and the interval has the rate we measured elsewhere.',
    run() {
      const f = HORSE_KICKS.frequencies;
      const counts = f.flatMap((nk, deaths) =>
        Array.from({ length: nk }, () => deaths)
      );
      const iv = poissonInterval(counts, { exposure: 1, level: 0.95 });
      return [
        measure('corps-years', counts.length, 280, 0),
        measure('Poisson mean per corps-year', iv.rate, 0.7, 1e-12),
        measure(
          'the 95% interval contains the mean, low end below',
          Number(iv.lo < 0.7),
          1,
          0
        ),
        measure('the 95% interval, high end above', Number(iv.hi > 0.7), 1, 0),
        measure(
          'the 95% interval is of relative half-width about 1.96 / sqrt(196)',
          (iv.hi - iv.lo) / 2 / 0.7,
          1.96 / Math.sqrt(196),
          0.01
        ),
      ];
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
