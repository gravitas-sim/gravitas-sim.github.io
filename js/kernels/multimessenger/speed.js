// =============================================================================
// The speed-of-gravity bound, as a function of the emission-delay assumption
// -----------------------------------------------------------------------------
// Gravitational waves leave a merger at the merger; photons leave when the
// electromagnetic emission starts, tau later (the INTRINSIC EMISSION DELAY: the
// time the merged object and its jet take to produce light; theory gives a
// range, not a number). The photons then arrive Dt after the gravitational
// waves (the OBSERVED DELAY). With a distance D and c the speed of light:
//
//     Dt = tau + D/c - D/v_GW      =>      delta = (v_GW - c)/c
//     delta = 1/(1 - x) - 1  (exact),    x = c (Dt - tau)/D,
//     delta ~ x = c (Dt - tau)/D          (first order, the form papers print).
//
// The observation fixes Dt - tau; the bound on delta therefore depends on the
// ASSUMED tau and on nothing else about the source:
//   - the UPPER end (how much faster than light gravity could be) uses the
//     smallest emission delay assumed, tau_min;
//   - the LOWER end (how much slower) uses the largest, tau_max.
// A bound with no stated assumption is not a statement: speedBound() requires
// both ends, returns them with the result, and refuses when the assumption by
// itself excludes equal speeds (tau_min > Dt or tau_max < Dt): then the data do
// not bound a departure, they contradict the assumption, and the interval the
// assumption implies is returned under `implied`, marked as not a bound.
//
// The distance enters as 1/D, so a distance given with a lower end uses that
// end (the conservative choice: the smaller the distance, the weaker the bound).
// The observed delay's own uncertainty (0.05 s in the published case) is far
// below any emission-delay assumption and is not propagated.
// =============================================================================

import { C_LIGHT, MPC_M, finite, refuse } from './constants.js';

/** First-order fractional speed difference for an emission delay tau, s, and the observed delay, s, at D Mpc. */
const firstOrder = (delay, tau, dMpc) =>
  (C_LIGHT * (delay - tau)) / (dMpc * MPC_M);
/** The exact fractional speed difference from x = c (Dt - tau)/D. */
const exactOf = x => x / (1 - x);

/**
 * The distance the bound uses, Mpc, and the rule that chose it.
 * @param {number|{value: number, lower?: number, upper?: number}} distance - Mpc, or a catalogue value with its
 *   (negative) lower and positive upper offsets
 */
export function boundDistance(distance) {
  if (typeof distance === 'number') {
    if (!(finite(distance, 'distance') > 0))
      refuse('bad-distance', 'the distance must be positive');
    return { distanceMpc: distance, rule: 'value' };
  }
  const v = finite(distance?.value, 'distance.value');
  if (distance.lower == null) {
    if (!(v > 0)) refuse('bad-distance', 'the distance must be positive');
    return { distanceMpc: v, rule: 'value' };
  }
  const lo = v + finite(distance.lower, 'distance.lower');
  if (!(lo > 0))
    refuse('bad-distance', 'the lower end of the distance must be positive');
  return { distanceMpc: lo, rule: 'lower-end' };
}

/**
 * The bound on (v_GW - c)/c from an observed delay under a stated emission-delay interval.
 * @param {object} p
 * @param {number} p.delay - photons minus gravitational waves, s (negative if photons arrived first)
 * @param {number|{value: number, lower?: number, upper?: number}} p.distance - Mpc
 * @param {{min: number, max: number}} p.emissionDelay - the assumed interval of tau, s, both ends required
 * @returns {{status: 'bounded'|'no-bound', lower: number|null, upper: number|null, exact: object|null,
 *   implied: object, assumption: object, distanceMpc: number, distanceRule: string, reason: string|null}}
 */
export function speedBound({ delay, distance, emissionDelay }) {
  finite(delay, 'delay');
  if (!emissionDelay || emissionDelay.min == null || emissionDelay.max == null)
    refuse(
      'assumption-required',
      'a speed bound needs the emission-delay assumption: give emissionDelay {min, max}'
    );
  const tauMin = finite(emissionDelay.min, 'emissionDelay.min');
  const tauMax = finite(emissionDelay.max, 'emissionDelay.max');
  if (tauMax < tauMin)
    refuse(
      'bad-interval',
      'emissionDelay.max must not be below emissionDelay.min'
    );
  const { distanceMpc, rule } = boundDistance(distance);
  const xHi = firstOrder(delay, tauMin, distanceMpc);
  const xLo = firstOrder(delay, tauMax, distanceMpc);
  if (Math.max(Math.abs(xHi), Math.abs(xLo)) >= 0.5)
    refuse(
      'out-of-domain',
      'the delay is too large for the distance: the speed difference is not small and the form does not apply'
    );
  const assumption = Object.freeze({
    emissionDelayMinS: tauMin,
    emissionDelayMaxS: tauMax,
    text: `photons emitted between ${tauMin} s and ${tauMax} s after the gravitational waves`,
  });
  const implied = Object.freeze({
    lower: xLo,
    upper: xHi,
    exactLower: exactOf(xLo),
    exactUpper: exactOf(xHi),
    note: 'what the assumption alone would make of the speeds; a bound only if the interval contains zero',
  });
  const consistent = tauMin <= delay && delay <= tauMax;
  return Object.freeze({
    status: consistent ? 'bounded' : 'no-bound',
    lower: consistent ? xLo : null,
    upper: consistent ? xHi : null,
    exact: consistent
      ? Object.freeze({ lower: exactOf(xLo), upper: exactOf(xHi) })
      : null,
    implied,
    assumption,
    distanceMpc,
    distanceRule: rule,
    reason: consistent
      ? null
      : tauMin > delay
        ? 'the assumed minimum emission delay exceeds the observed delay: equal speeds are excluded by the assumption, so there is no bound on a departure'
        : 'the assumed maximum emission delay is below the observed delay: equal speeds are excluded by the assumption, so there is no bound on a departure',
  });
}

/**
 * The two ends of the bound as functions of the assumed emission delay: the upper end against the smallest delay
 * assumed, the lower end against the largest. Each row says whether that assumption alone is consistent with equal
 * speeds (the upper end with tau_min <= Dt, the lower end with tau_max >= Dt).
 * @param {{delay: number, distance: number|object, tauGrid: number[]}} p
 */
export function boundCurve({ delay, distance, tauGrid }) {
  finite(delay, 'delay');
  const { distanceMpc, rule } = boundDistance(distance);
  const row = (tau, consistent) => ({
    tau: finite(tau, 'tau'),
    value: firstOrder(delay, tau, distanceMpc),
    consistent: consistent(tau),
  });
  return {
    distanceMpc,
    distanceRule: rule,
    upperVsTauMin: tauGrid.map(t => row(t, tau => tau <= delay)),
    lowerVsTauMax: tauGrid.map(t => row(t, tau => tau >= delay)),
  };
}

/** A sentence that states the bound with its assumption, in English, for documents and tests (an interface has its own). */
export function describeBound(r) {
  const f = x => x.toExponential(1);
  return r.status === 'bounded'
    ? `(v_GW - c)/c lies between ${f(r.lower)} and ${f(r.upper)}, assuming ${r.assumption.text}, at ${r.distanceMpc.toPrecision(3)} Mpc (${r.distanceRule}).`
    : `No bound: ${r.reason}. The assumption was ${r.assumption.text}.`;
}
