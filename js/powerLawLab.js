// =============================================================================
// The bench the power-law lesson reads its numbers off
// -----------------------------------------------------------------------------
// js/powerLawGravity.js is the model. This is the thin layer between it and a
// lesson step: it decides what to measure, caches the answer, and formats it as
// label-and-value rows.
//
// Why a cache. A lesson probe is read on a timer while a step is open, and the
// measurements here take tens of milliseconds - 47 ms for a precession run, 12
// for the period-radius fit. Recomputing those every frame would be the whole
// frame budget for a number that cannot have changed, because nothing about the
// measurement depends on anything but n. So each exponent is measured once and
// remembered.
//
// Why the runs are short. The settings below are the coarsest that still give
// the same answer as a long run: at n = 2.2 the precession is 42.6671 deg per
// radial period at four revolutions and dt = 0.04, and 42.6671 at twelve
// revolutions and dt = 0.005. That is not a coincidence to be relied on
// quietly - it is the lesson's central result, that the precession is a
// property of the force law rather than of the integration - so the refinement
// table below measures it across a range of timesteps and shows the student
// the same thing.
//
// Everything here is a measurement. There are no transcribed constants: every
// number a student sees was computed by running the model when the step opened.
// =============================================================================

import {
  EXPONENT_RANGE,
  LESSON_ECCENTRICITY,
  REFERENCE_RADIUS_SIM,
  apsidalPrecessionNearCircular,
  expectedKeplerSlope,
  orbitPath,
  runConservation,
  runKeplerSlope,
  runPrecession,
} from './powerLawGravity.js';
import { simToAu } from './units.js';

/** One solar mass at the integrator's G of 1. */
const MU = 1000;

/**
 * The exponents the lesson offers as one-click presets.
 *
 * Chosen by measuring rather than by taste. The requirement is a precession
 * that is unmistakable at a classroom glance and a period-radius slope that is
 * clearly not 3/2, without an orbit that leaves the screen or an integration
 * that struggles:
 *
 *   1.8   precesses BACKWARDS, -31 deg per period. The shallower law is the
 *         half of the story a lesson about "steeper gravity" would miss.
 *   2     the control. Closed ellipse, zero precession, slope exactly 3/2.
 *   2.05  a two-percent change in the exponent, and already 9 deg per period -
 *         the answer to "surely a small change does not matter".
 *   2.2   the headline case. 43 deg per period, visible within seconds.
 *   2.5   large enough that the orbit is obviously not closing, and close
 *         enough to the n = 3 boundary to raise it.
 */
export const PRESETS = Object.freeze([1.8, 2, 2.05, 2.2, 2.5]);

/** Timesteps the refinement table walks, coarse to fine. */
const REFINEMENT_STEPS = Object.freeze([0.08, 0.04, 0.02, 0.01]);

/**
 * The three bodies the conservation panel runs.
 *
 * Unequal masses and a genuinely mutual problem: with a dominant central body
 * and test particles, momentum conservation would be trivially true because
 * nothing pushes back. These three all move.
 */
const CONSERVATION_BODIES = Object.freeze([
  Object.freeze({ mass: 1000, x: 0, y: 0, vx: 0, vy: 0 }),
  Object.freeze({ mass: 30, x: 180, y: 0, vx: 0, vy: 2.4 }),
  Object.freeze({ mass: 12, x: -260, y: 40, vx: -0.4, vy: -1.9 }),
]);

const cache = new Map();

/**
 * Measure everything the lesson reports at one exponent.
 *
 * Cached by exponent. The model is pure, so a second call with the same n must
 * give the same answer, and the cache is an optimisation rather than a
 * behavior.
 *
 * @param {number} n - Force-law exponent
 * @returns {object} Every measured quantity, with nulls where a measurement
 *   could not be taken rather than invented values
 */
export function measureAt(n) {
  const key = String(n);
  if (cache.has(key)) return cache.get(key);

  const precession = runPrecession({
    n,
    mu: MU,
    dt: 0.04,
    eccentricity: LESSON_ECCENTRICITY,
    revolutions: 4,
  });
  const kepler = runKeplerSlope({ n, mu: MU, stepsPerOrbit: 2000 });
  const conservation = runConservation({
    bodies: CONSERVATION_BODIES.map(b => ({ ...b })),
    n,
    dt: 0.01,
    steps: 3000,
  });

  const result = Object.freeze({
    n,
    // Radians per radial period, or null when fewer than three periapsis
    // passages were seen. Null is a missing measurement and every consumer
    // below says so rather than printing a zero.
    precession: precession.precession,
    precessionDeg:
      precession.precession === null
        ? null
        : (precession.precession * 180) / Math.PI,
    // The near-circular analytic value, which is an APPROXIMATION and is
    // labeled as one everywhere it is shown.
    theoryDeg: (apsidalPrecessionNearCircular(n) * 180) / Math.PI,
    keplerSlope: kepler.slope,
    keplerExpected: expectedKeplerSlope(n),
    keplerResidual: kepler.residual,
    keplerPoints: kepler.points,
    momentumDrift: conservation.momentumDrift,
    angularDrift: conservation.angularDrift,
    energyDrift: conservation.energyDrift,
    closestApproach: precession.closestApproach,
  });
  cache.set(key, result);
  return result;
}

/**
 * Measure the precession at a range of timesteps.
 *
 * The experiment that separates a physical result from a numerical one, and
 * the reason the lesson can claim the precession is real. Integration error
 * scales with dt; a property of the force law does not.
 *
 * @param {number} n - Exponent
 * @returns {Array<{dt: number, deg: number|null}>} One row per timestep
 */
export function refinement(n) {
  const key = `refine:${n}`;
  if (cache.has(key)) return cache.get(key);
  const rows = REFINEMENT_STEPS.map(dt => {
    const r = runPrecession({
      n,
      mu: MU,
      dt,
      eccentricity: LESSON_ECCENTRICITY,
      revolutions: 4,
    });
    return {
      dt,
      deg: r.precession === null ? null : (r.precession * 180) / Math.PI,
    };
  });
  Object.freeze(rows);
  cache.set(key, rows);
  return rows;
}

/**
 * The traced orbit at one exponent, cached like every other measurement.
 * @param {number} n - Exponent
 * @returns {{points: Array<{x:number,y:number}>, maxR: number}} The path
 */
export function path(n) {
  const key = `path:${n}`;
  if (cache.has(key)) return cache.get(key);
  const p = orbitPath({ n, mu: MU, eccentricity: LESSON_ECCENTRICITY });
  cache.set(key, p);
  return p;
}

/**
 * Format a number for a readout, or say it is missing.
 *
 * A measurement that could not be taken prints as a sentence and never as 0,
 * because a zero here would be a claim - "this orbit does not precess" - that
 * nothing measured.
 *
 * @param {number|null} v - Value
 * @param {number} decimals - Digits after the point
 * @param {string} [unit] - Appended when present
 * @returns {string} Display string
 */
export const show = (v, decimals, unit = '') =>
  v === null || v === undefined || !Number.isFinite(v)
    ? 'not measured — too few passages in this run'
    : `${v.toFixed(decimals)}${unit ? ' ' + unit : ''}`;

/**
 * The reference radius, as the lesson states it.
 *
 * Derived from the same anchor the rest of the application uses rather than
 * written out, so the prose cannot drift from the model.
 *
 * @returns {{sim: number, au: number, text: string}} The radius in both units
 */
export const referenceRadius = () => ({
  sim: REFERENCE_RADIUS_SIM,
  au: simToAu(REFERENCE_RADIUS_SIM),
  text: `${simToAu(REFERENCE_RADIUS_SIM)} AU (${REFERENCE_RADIUS_SIM} simulation length units)`,
});

/**
 * The probe rows for the precession experiment.
 *
 * These rows ARE the accessible form of the result: a screen reader reads the
 * same numbers the canvas shows, because there is only one set of numbers and
 * this is it. Nothing scientifically important in this lesson exists only as
 * a drawing.
 *
 * @param {number} n - Exponent
 * @returns {Array<{label: string, value: string, emphasis?: boolean}>} Rows
 */
export function precessionRows(n) {
  const m = measureAt(n);
  const r0 = referenceRadius();
  const rows = [
    { label: 'Force-law exponent n', value: n.toFixed(2) },
    { label: 'Reference radius r₀', value: r0.text },
    {
      label: 'At r₀ the pull is',
      value: 'exactly Newtonian, for every n',
    },
    {
      label: 'Measured precession',
      value: show(m.precessionDeg, 3, '° per radial period'),
      emphasis: true,
    },
    {
      label: 'Near-circular estimate (approximation)',
      value: show(m.theoryDeg, 3, '°'),
    },
  ];
  if (m.precessionDeg !== null && Number.isFinite(m.theoryDeg)) {
    const diff = Math.abs(m.precessionDeg - m.theoryDeg);
    rows.push({
      label: 'Measurement minus estimate',
      value:
        `${diff.toFixed(3)}°` +
        (Math.abs(m.theoryDeg) > 1e-9
          ? ` (${((100 * diff) / Math.abs(m.theoryDeg)).toFixed(1)}% of it)`
          : ''),
    });
  }
  rows.push({
    label: 'Orbit eccentricity',
    value: `${LESSON_ECCENTRICITY} — the estimate is only exact for a circle`,
  });
  return rows;
}

/**
 * The probe rows for the period-radius experiment.
 * @param {number} n - Exponent
 * @returns {Array<{label: string, value: string, emphasis?: boolean}>} Rows
 */
export function keplerRows(n) {
  const m = measureAt(n);
  const rows = [
    { label: 'Force-law exponent n', value: n.toFixed(2) },
    {
      label: 'Measured slope of log P against log r',
      value: m.keplerSlope === null ? 'not measured' : m.keplerSlope.toFixed(4),
      emphasis: true,
    },
    {
      label: 'Predicted slope (n+1)/2',
      value: m.keplerExpected.toFixed(4),
    },
    {
      label: 'Worst fit residual',
      value:
        m.keplerResidual === null
          ? 'not measured'
          : m.keplerResidual.toExponential(1),
    },
  ];
  for (const p of m.keplerPoints) {
    rows.push({
      label: `  orbit at ${simToAu(p.radius).toFixed(2)} AU`,
      value: `period ${p.period.toFixed(2)} simulation seconds`,
    });
  }
  return rows;
}

/**
 * The probe rows for the conservation panel.
 *
 * The point of the lesson, in four numbers. Momentum and angular momentum sit
 * at round-off for every exponent, because they follow from the interaction
 * being pairwise and central; the orbital results above do not, because they
 * follow from the exponent.
 *
 * @param {number} n - Exponent
 * @returns {Array<{label: string, value: string, emphasis?: boolean}>} Rows
 */
export function conservationRows(n) {
  const m = measureAt(n);
  return [
    { label: 'Force-law exponent n', value: n.toFixed(2) },
    {
      label: 'Linear momentum drift',
      value: m.momentumDrift.toExponential(2) + ' of total |p|',
      emphasis: true,
    },
    {
      label: 'Angular momentum drift',
      value: m.angularDrift.toExponential(2) + ' relative',
      emphasis: true,
    },
    {
      label: 'Energy drift, correct potential',
      value: m.energyDrift.toExponential(2) + ' relative',
    },
    {
      label: 'Energy is computed from',
      value: 'Φ(r) = −GM r₀^(n−2) / ((n−1) r^(n−1)), not −GM/r',
    },
  ];
}

/**
 * The probe rows for the timestep-refinement experiment.
 * @param {number} n - Exponent
 * @returns {Array<{label: string, value: string, emphasis?: boolean}>} Rows
 */
export function refinementRows(n) {
  const rows = refinement(n).map(r => ({
    label: `  timestep ${r.dt}`,
    value: show(r.deg, 5, '°'),
  }));
  const measured = refinement(n)
    .map(r => r.deg)
    .filter(v => v !== null && Number.isFinite(v));
  const spread =
    measured.length < 2 ? null : Math.max(...measured) - Math.min(...measured);
  return [
    { label: 'Force-law exponent n', value: n.toFixed(2) },
    ...rows,
    {
      label: 'Spread across all four',
      value: spread === null ? 'not measured' : `${spread.toExponential(2)}°`,
      emphasis: true,
    },
  ];
}

/**
 * Forget every cached measurement.
 *
 * For tests, which need to be able to assert that a second measurement agrees
 * with the first rather than that the cache returned the same object.
 */
export const resetLabForTests = () => cache.clear();

export { EXPONENT_RANGE, LESSON_ECCENTRICITY, REFERENCE_RADIUS_SIM };
