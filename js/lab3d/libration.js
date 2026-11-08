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
