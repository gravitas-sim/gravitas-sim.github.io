// =============================================================================
// Resonances and secular dynamics II (Prompt 273, RESONANCES_II.md)
// -----------------------------------------------------------------------------
// What js/resonance/elements.js stops short of: the resonant argument computed
// from 3-D elements in the primary's own equatorial frame, a libration measured
// only over a window that has seen several libration periods (with an
// uncertainty), a secular precession rate measured only over several turns, and
// the first-order theory that rate is compared with. Pure: no DOM, no fetch.
//
// The rule that shapes every function here: a window shorter than the committed
// multiple returns 'not-constrained' and no number. A fitted period on a short
// window is a number made up by the window, not by the orbit.
// =============================================================================

import { toElements } from './elements.js';
import {
  ANGLE_CRITERIA,
  ANGLE_STATE,
  DEG,
  RAD,
  classifyAngle,
  resonantArgument,
  smoothOverTime,
  unwrapDegrees,
  wrap360,
} from '../resonance/elements.js';

/** Windows must hold this many libration periods (turns, for a rate). */
export const REQUIRED_PERIODS = 3;
export const STATES = Object.freeze({
  LIBRATION: 'libration',
  CIRCULATION: 'circulation',
  NOT_CONSTRAINED: 'not-constrained',
});
/** The J2000 obliquity as js/satellites/galilean.js states it, degrees. */
export const OBLIQUITY_J2000_DEG = 23.439291111;

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const unit = a => {
  const n = Math.hypot(a[0], a[1], a[2]);
  return [a[0] / n, a[1] / n, a[2] / n];
};
const mean = xs => xs.reduce((s, x) => s + x, 0) / xs.length;
const sd = xs => {
  const m = mean(xs);
  return Math.sqrt(
    xs.reduce((s, x) => s + (x - m) * (x - m), 0) / (xs.length - 1)
  );
};

/**
 * The rotation into a primary's equatorial frame: z along the pole, x along
 * the node of the equator on the input frame's xy plane. A pole given in
 * equatorial J2000 (RA, Dec) is turned into the ecliptic first when `ecliptic`.
 * Returns the three row vectors; apply with `rotate`.
 */
export function equatorialRotation(raDeg, decDeg, { ecliptic = true } = {}) {
  const a = raDeg * RAD;
  const d = decDeg * RAD;
  let p = [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)];
  if (ecliptic) {
    const c = Math.cos(OBLIQUITY_J2000_DEG * RAD);
    const s = Math.sin(OBLIQUITY_J2000_DEG * RAD);
    p = [p[0], p[1] * c + p[2] * s, -p[1] * s + p[2] * c];
  }
  const z = unit(p);
  const x = unit(cross([0, 0, 1], z));
  const y = cross(z, x);
  return [x, y, z];
}
export const rotate = (R, v) => [dot(R[0], v), dot(R[1], v), dot(R[2], v)];

/**
 * Mean longitude and longitude of periapsis (degrees) of a relative state,
 * lambda = Omega + omega + M and varpi = Omega + omega, with the semi-major
 * axis and eccentricity. The state is relative to the primary; mu = G (M + m).
 */
export function orbitalAngles(x, v, mu) {
  const el = toElements(x, v, mu);
  return {
    lambda: wrap360((el.Omega + el.omega + el.M) * DEG),
    varpi: wrap360((el.Omega + el.omega) * DEG),
    a: el.a,
    e: el.e,
    i: el.i * DEG,
  };
}

/**
 * The argument of a p:q resonance as a series: `terms` lists, for each body,
 * its lambda and varpi arrays with the integer coefficients of the argument
 * [{lambda: [], varpi: [], coefficient, varpiCoefficient}]. The coefficients
 * must sum to zero (d'Alembert), or the whole series is refused (null).
 */
export function resonantArgumentSeries(terms) {
  const n = terms[0].lambda.length;
  const out = new Array(n);
  for (let k = 0; k < n; k++) {
    const phi = resonantArgument(
      terms.map(t => ({
        coefficient: t.coefficient,
        varpiCoefficient: t.varpiCoefficient ?? 0,
        lambda: t.lambda[k],
        varpi: t.varpi ? t.varpi[k] : undefined,
      }))
    );
    if (phi === null) return null;
    out[k] = phi;
  }
  return out;
}

/**
 * Libration or circulation of an argument over a window, with an uncertainty.
 * `times` and `phi` (wrapped degrees) are the series, `referencePeriod` the
 * conjunction cycle it is smoothed over. The window must hold at least
 * `requiredPeriods` libration periods; otherwise 'not-constrained' and no
 * period, amplitude or centre is presented as measured.
 */
export function measureLibration({
  times,
  phi,
  referencePeriod,
  requiredPeriods = REQUIRED_PERIODS,
  floorDeg = ANGLE_CRITERIA.turnFloorDeg,
  stationaryDeg = ANGLE_CRITERIA.stationaryDeg,
  samplingFloor = 0,
  smoothSpan = referencePeriod,
}) {
  const samples = times.map((t, i) => ({ t, phi: phi[i] }));
  // A smoothing span other than the conjunction cycle scales the three
  // cycle-counted floors so that their absolute values (in time) are unchanged.
  const ratio = referencePeriod / smoothSpan;
  const c = classifyAngle(samples, {
    referencePeriod: smoothSpan,
    turnFloorDeg: floorDeg,
    stationaryDeg,
    minLibrationCycles: ANGLE_CRITERIA.minLibrationCycles * ratio,
    minCycles: ANGLE_CRITERIA.minCycles * ratio,
    confinedCycles: ANGLE_CRITERIA.confinedCycles * ratio,
  });
  const window = times[times.length - 1] - times[0];
  const refuse = reason => ({
    state: STATES.NOT_CONSTRAINED,
    reason,
    period: null,
    periodSigma: null,
    amplitude: null,
    amplitudeSigma: null,
    center: null,
    window,
    periodsObserved: null,
    classification: c,
  });
  if (c.state === ANGLE_STATE.CIRCULATION) {
    return {
      state: STATES.CIRCULATION,
      reason: c.reason,
      period: c.period,
      periodSigma: null,
      amplitude: null,
      amplitudeSigma: null,
      center: null,
      window,
      periodsObserved: null,
      classification: c,
    };
  }
  if (c.state !== ANGLE_STATE.LIBRATION || c.period === null)
    return refuse(c.reason);
  const periodsObserved = window / c.period;
  if (periodsObserved < requiredPeriods) return refuse('window-too-short');
  const halves = [];
  const swings = [];
  for (let i = 1; i < c.turns.length; i++) {
    halves.push(times[c.turns[i].index] - times[c.turns[i - 1].index]);
    swings.push(Math.abs(c.turns[i].value - c.turns[i - 1].value) / 2);
  }
  const k = halves.length;
  // A boxcar of the smoothing span attenuates a sinusoid of the libration
  // period by sin(pi s / P) / (pi s / P); the corrected amplitude undoes it.
  const x = (Math.PI * smoothSpan) / c.period;
  const gain = smoothSpan === referencePeriod ? 1 : Math.sin(x) / x;
  const scatter = k >= 2 ? (2 * sd(halves)) / Math.sqrt(k) : 0;
  return {
    state: STATES.LIBRATION,
    reason: c.reason,
    period: c.period,
    periodSigma: Math.hypot(scatter, samplingFloor),
    amplitude: c.amplitude,
    amplitudeCorrected: c.amplitude / gain,
    smoothingGain: gain,
    amplitudeSigma: k >= 2 ? sd(swings) / Math.sqrt(k) : null,
    center: c.center,
    window,
    periodsObserved,
    classification: c,
  };
}

/**
 * The secular rate of an apsidal longitude (degrees per unit time): a least-
 * squares slope of the unwrapped angle over the window, with half the
 * difference of the two halves' slopes as its uncertainty. A window in which
 * the apse has not turned `requiredTurns` times returns 'not-constrained'.
 */
export function secularRate({
  times,
  angleDeg,
  requiredTurns = REQUIRED_PERIODS,
}) {
  const y = unwrapDegrees(angleDeg.map(wrap360));
  const slope = (t, v) => {
    const mt = mean(t);
    const mv = mean(v);
    let num = 0;
    let den = 0;
    for (let i = 0; i < t.length; i++) {
      num += (t[i] - mt) * (v[i] - mv);
      den += (t[i] - mt) * (t[i] - mt);
    }
    return num / den;
  };
  const window = times[times.length - 1] - times[0];
  const rate = slope(times, y);
  const turns = (Math.abs(rate) * window) / 360;
  if (!(turns >= requiredTurns)) {
    return {
      state: STATES.NOT_CONSTRAINED,
      rate: null,
      rateSigma: null,
      turns,
      window,
    };
  }
  const h = Math.floor(times.length / 2);
  const r1 = slope(times.slice(0, h), y.slice(0, h));
  const r2 = slope(times.slice(h), y.slice(h));
  return {
    state: 'measured',
    rate,
    rateSigma: Math.abs(r1 - r2) / 2,
    turns,
    window,
  };
}

/** The Laplace coefficient b_s^(j)(alpha), by the trapezoid rule on the definition. */
export function laplaceCoefficient(s, j, alpha, n = 4096) {
  let sum = 0;
  for (let k = 0; k < n; k++) {
    const psi = (2 * Math.PI * k) / n;
    sum +=
      Math.cos(j * psi) /
      Math.pow(1 - 2 * alpha * Math.cos(psi) + alpha * alpha, s);
  }
  return (2 * sum) / n;
}

/**
 * First-order (Laplace-Lagrange) apsidal rate of an inner test particle,
 * radians per unit time, from one outer perturber on a circular orbit:
 * A = (n / 4)(m'/M) alpha^2 b_{3/2}^(1)(alpha). Limits: first order in the
 * eccentricity and inclination, second-order terms in m'/M neglected, no
 * mean-motion resonance within the order of the expansion.
 */
export function secularRateFirstOrder({ n, massRatio, alpha }) {
  return (
    0.25 * n * massRatio * alpha * alpha * laplaceCoefficient(1.5, 1, alpha)
  );
}

// --- The harmonic estimator (the Part A addendum, RESONANCES_II.md section 9) ----
// The turning-point estimator above needs the ripple smoothed away first, and on
// an osculating argument whose ripple is larger than the libration no span does
// that repeatably. A tapered least-squares line does not need it: under Hann
// weights a term a few cycles per window away from the line barely reaches it.

/** The committed options of `measureLibrationHarmonic`. */
export const HARMONIC = Object.freeze({
  /** The line sought completes between REQUIRED_PERIODS and this many turns. */
  maxPeriods: 8,
  /** The amplitude must stand this many formal sigmas clear of the floor. */
  significance: 5,
  /** The two sub-windows: the first and the last of this fraction of the window. */
  subWindow: 2 / 3,
  /** Sub-window periods may differ by this fraction of the period, no more. */
  repeatability: 0.25,
  /** Scan points per cycle-per-window. */
  scanPerCycle: 8,
  /** The noise floor is read this many cycles per window above the line. */
  floorFrom: 3,
  floorTo: 26,
  minSamples: 24,
});

/** Solve the square system M z = r in place by elimination with partial pivoting. */
function solve(M, r) {
  const n = r.length;
  const A = M.map((row, i) => [...row, r[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let i = c + 1; i < n; i++)
      if (Math.abs(A[i][c]) > Math.abs(A[p][c])) p = i;
    [A[c], A[p]] = [A[p], A[c]];
    if (A[c][c] === 0) return null;
    for (let i = c + 1; i < n; i++) {
      const f = A[i][c] / A[c][c];
      for (let k = c; k <= n; k++) A[i][k] -= f * A[c][k];
    }
  }
  const z = new Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let s = A[i][n];
    for (let k = i + 1; k < n; k++) s -= A[i][k] * z[k];
    z[i] = s / A[i][i];
  }
  return z;
}

/**
 * The Hann-weighted least-squares line on samples lo..hi (inclusive) of the
 * unwrapped argument u: c0 + c1 (t - tm) + a cos w (t - tm) + b sin w (t - tm).
 * Returns the weighted residual sum of squares at a frequency, the fit there,
 * and the pieces the uncertainty needs.
 */
function taperedLine(times, u, lo, hi) {
  const n = hi - lo + 1;
  const t0 = times[lo];
  const W = times[hi] - t0;
  const tm = t0 + W / 2;
  const half = W / 2;
  const x = new Float64Array(n);
  const w = new Float64Array(n);
  const y = new Float64Array(n);
  let sw = 0;
  let swy = 0;
  for (let k = 0; k < n; k++) {
    x[k] = times[lo + k] - tm;
    w[k] = 0.5 * (1 - Math.cos((2 * Math.PI * (times[lo + k] - t0)) / W));
    sw += w[k];
    swy += w[k] * u[lo + k];
  }
  const ybar = swy / sw;
  let syy = 0;
  for (let k = 0; k < n; k++) {
    y[k] = u[lo + k] - ybar;
    syy += w[k] * y[k] * y[k];
  }
  // Basis 1, x / half, cos, sin: the normal equations at one frequency.
  const fit = f => {
    const om = 2 * Math.PI * f;
    const M = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const r = [0, 0, 0, 0];
    const b = [1, 0, 0, 0];
    for (let k = 0; k < n; k++) {
      b[1] = x[k] / half;
      b[2] = Math.cos(om * x[k]);
      b[3] = Math.sin(om * x[k]);
      for (let i = 0; i < 4; i++) {
        const wb = w[k] * b[i];
        r[i] += wb * y[k];
        for (let j = i; j < 4; j++) M[i][j] += wb * b[j];
      }
    }
    for (let i = 1; i < 4; i++) for (let j = 0; j < i; j++) M[i][j] = M[j][i];
    const z = solve(M, r);
    if (!z) return { ssr: syy, z: null };
    let ssr = syy;
    for (let i = 0; i < 4; i++) ssr -= z[i] * r[i];
    return { ssr, z };
  };
  /** The minimum of the residual between two frequencies, by golden section. */
  const refine = (fa, fb) => {
    const g = (Math.sqrt(5) - 1) / 2;
    let a = fa;
    let b = fb;
    let c = b - g * (b - a);
    let d = a + g * (b - a);
    let sc = fit(c).ssr;
    let sd2 = fit(d).ssr;
    for (let i = 0; i < 60 && b - a > 1e-12 * b; i++) {
      if (sc < sd2) {
        b = d;
        d = c;
        sd2 = sc;
        c = b - g * (b - a);
        sc = fit(c).ssr;
      } else {
        a = c;
        c = d;
        sc = sd2;
        d = a + g * (b - a);
        sd2 = fit(d).ssr;
      }
    }
    return (a + b) / 2;
  };
  const describe = f => {
    const { z, ssr } = fit(f);
    if (!z) return null;
    return {
      f,
      period: 1 / f,
      amplitude: Math.hypot(z[2], z[3]),
      c0: z[0] + ybar,
      c0Centered: z[0],
      slope: z[1] / half,
      a: z[2],
      b: z[3],
      ssr,
    };
  };
  return { n, W, x, w, y, half, fit, refine, describe };
}

/** Formal covariance of (a, b, w) for a fitted line, from the residual's floor. */
function lineCovariance(L, line) {
  const { n, W, x, w, y, half } = L;
  const om = 2 * Math.PI * line.f;
  const dt = W / (n - 1);
  const res = new Float64Array(n);
  const M1 = Array.from({ length: 5 }, () => [0, 0, 0, 0, 0]);
  const M2 = Array.from({ length: 5 }, () => [0, 0, 0, 0, 0]);
  const J = [1, 0, 0, 0, 0];
  const z1 = line.slope * half;
  let sw2 = 0;
  for (let k = 0; k < n; k++) {
    const c = Math.cos(om * x[k]);
    const s = Math.sin(om * x[k]);
    J[1] = x[k] / half;
    J[2] = c;
    J[3] = s;
    // d/dw, scaled by the half-window so the column is of order the amplitude.
    J[4] = (x[k] / half) * (-line.a * s + line.b * c);
    res[k] = y[k] - (line.c0Centered + z1 * J[1] + line.a * c + line.b * s);
    sw2 += w[k] * w[k];
    for (let i = 0; i < 5; i++)
      for (let j = 0; j < 5; j++) {
        M1[i][j] += w[k] * J[i] * J[j];
        M2[i][j] += w[k] * w[k] * J[i] * J[j];
      }
  }
  // The floor: the median Hann-periodogram ordinate above the line, over ln 2.
  const ords = [];
  for (let m = HARMONIC.floorFrom; m <= HARMONIC.floorTo; m++) {
    const f = line.f + m / W;
    if (f >= 0.5 / dt) break;
    let re = 0;
    let im = 0;
    for (let k = 0; k < n; k++) {
      const ph = 2 * Math.PI * f * x[k];
      re += w[k] * res[k] * Math.cos(ph);
      im -= w[k] * res[k] * Math.sin(ph);
    }
    ords.push((dt * (re * re + im * im)) / sw2);
  }
  let S0;
  if (ords.length >= 4) {
    ords.sort((p, q) => p - q);
    const h = ords.length >> 1;
    S0 = (ords.length % 2 ? ords[h] : (ords[h - 1] + ords[h]) / 2) / Math.LN2;
  } else {
    let s = 0;
    let sw = 0;
    for (let k = 0; k < n; k++) {
      s += w[k] * res[k] * res[k];
      sw += w[k];
    }
    S0 = (dt * s) / sw;
  }
  // cov = (S0 / dt) M1^-1 M2 M1^-1, column by column.
  const X = [];
  for (let j = 0; j < 5; j++) {
    const col = solve(
      M1,
      M2.map(row => row[j])
    );
    if (!col) return null;
    X.push(col);
  }
  // X[j][i] = (M1^-1 M2)[i][j]; cov[i][l] = sum_j (M1^-1 M2)[i][j] M1inv[j][l].
  const cov = (i, l) => {
    const e = [0, 0, 0, 0, 0];
    e[l] = 1;
    const mi = solve(M1, e);
    let s = 0;
    for (let j = 0; j < 5; j++) s += X[j][i] * mi[j];
    return (S0 / dt) * s;
  };
  const A = Math.hypot(line.a, line.b);
  const vA =
    (line.a * line.a * cov(2, 2) +
      line.b * line.b * cov(3, 3) +
      2 * line.a * line.b * cov(2, 3)) /
    (A * A);
  return {
    amplitudeSigma: Math.sqrt(Math.max(vA, 0)),
    omegaSigma: Math.sqrt(Math.max(cov(4, 4), 0)) / half,
    noiseFloor: S0,
  };
}

/**
 * Libration of an argument by a Hann-tapered least-squares line, for a series
 * whose ripple is larger than the libration. The line sought completes between
 * `requiredPeriods` and `maxPeriods` turns in the window; a window whose
 * dominant slow term is longer than that returns 'not-constrained' and no
 * number, as does a line that does not stand clear of the floor, a centre that
 * drifts, or a line the two sub-windows do not both show.
 */
export function measureLibrationHarmonic({
  times,
  phi,
  referencePeriod,
  requiredPeriods = REQUIRED_PERIODS,
  maxPeriods = HARMONIC.maxPeriods,
  significance = HARMONIC.significance,
  samplingFloor = 0,
}) {
  const n = times.length;
  const window = n > 1 ? times[n - 1] - times[0] : 0;
  const out = (state, reason, extra = {}) => ({
    state,
    reason,
    period: null,
    periodSigma: null,
    amplitude: null,
    amplitudeSigma: null,
    center: null,
    window,
    periodsObserved: null,
    ...extra,
  });
  if (n < HARMONIC.minSamples || !(window > 0))
    return out(STATES.NOT_CONSTRAINED, 'too-few-samples');
  const u = unwrapDegrees(phi.map(wrap360));
  const smooth = smoothOverTime(u, times, referencePeriod);
  const drift = Math.abs(smooth[n - 1] - smooth[0]);
  if (drift >= ANGLE_CRITERIA.circulationDeg)
    return out(STATES.CIRCULATION, 'net-drift', {
      period: window / (drift / 360),
    });
  const L = taperedLine(times, u, 0, n - 1);
  const step = 1 / (HARMONIC.scanPerCycle * window);
  const jLo = Math.round(0.5 * HARMONIC.scanPerCycle);
  const jHi = Math.round(maxPeriods * HARMONIC.scanPerCycle);
  let best = jLo;
  let bestSsr = Infinity;
  for (let j = jLo; j <= jHi; j++) {
    const s = L.fit(j * step).ssr;
    if (s < bestSsr) {
      bestSsr = s;
      best = j;
    }
  }
  const f = L.refine(
    Math.max(jLo, best - 1) * step,
    Math.min(jHi, best + 1) * step
  );
  const line = L.describe(f);
  if (!line) return out(STATES.NOT_CONSTRAINED, 'no-line');
  const periodsObserved = window * f;
  if (periodsObserved < requiredPeriods)
    return out(STATES.NOT_CONSTRAINED, 'window-too-short');
  const formal = lineCovariance(L, line);
  if (!formal || !(line.amplitude >= significance * formal.amplitudeSigma))
    return out(STATES.NOT_CONSTRAINED, 'no-line', {
      significance: formal ? line.amplitude / formal.amplitudeSigma : null,
    });
  if (Math.abs(line.slope) * window > 2 * line.amplitude)
    return out(STATES.NOT_CONSTRAINED, 'drifting-center');
  // Repeatability: the first and the last two thirds of the window.
  const tSplitA = times[0] + HARMONIC.subWindow * window;
  const tSplitB = times[n - 1] - HARMONIC.subWindow * window;
  let hiA = n - 1;
  while (hiA > 0 && times[hiA] > tSplitA) hiA--;
  let loB = 0;
  while (loB < n - 1 && times[loB] < tSplitB) loB++;
  const sub = [
    [0, hiA],
    [loB, n - 1],
  ].map(([lo, hi]) => {
    const S = taperedLine(times, u, lo, hi);
    return S.describe(S.refine(0.75 * f, 1.25 * f));
  });
  const period = 1 / f;
  const repeatable =
    sub.every(
      s =>
        s &&
        s.amplitude >= 0.5 * line.amplitude &&
        s.amplitude <= 2 * line.amplitude
    ) &&
    Math.abs(sub[0].period - sub[1].period) <= HARMONIC.repeatability * period;
  const subWindows = sub.map(
    s => s && { period: s.period, amplitude: s.amplitude }
  );
  if (!repeatable)
    return out(STATES.NOT_CONSTRAINED, 'not-repeatable', { subWindows });
  return {
    state: STATES.LIBRATION,
    reason: 'tapered-line',
    period,
    periodSigma: Math.hypot(
      (period * period * formal.omegaSigma) / (2 * Math.PI),
      Math.abs(sub[0].period - sub[1].period) / 2,
      samplingFloor
    ),
    amplitude: line.amplitude,
    amplitudeSigma: Math.hypot(
      formal.amplitudeSigma,
      Math.abs(sub[0].amplitude - sub[1].amplitude) / 2
    ),
    center: wrap360(line.c0),
    slope: line.slope,
    window,
    periodsObserved,
    significance: line.amplitude / formal.amplitudeSigma,
    noiseFloor: formal.noiseFloor,
    subWindows,
  };
}
