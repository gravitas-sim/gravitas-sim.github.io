// =============================================================================
// Spin from a light curve: a bounded model (Prompt 198, SMALL_BODIES.md)
// -----------------------------------------------------------------------------
//   projectedArea, lightCurveMag  DERIVED, under ASSUMPTIONS: a triaxial ellipsoid
//                    a >= b >= c rotating about its c axis, seen at aspect angle
//                    theta from the spin axis, geometric scattering at zero phase
//                    angle (flux proportional to the projected area)
//   amplitudeMag     DERIVED: the peak-to-peak amplitude at an aspect, in closed
//                    form (Zappala et al. 1990)
//   axisRatioBound   DERIVED: a/b >= 10^(0.4 Delta m), equality only at theta = 90
//   rotationFromLightCurve  MEASURED / DERIVED: the Lomb-Scargle peak, the
//                    two-maxima rule P_rot = 2 / f_peak, a K-harmonic refinement at
//                    the double period, the amplitude of the fitted curve with an
//                    interval, the bound with the same interval, and verdicts
//                    (period, ambiguous, not-periodic)
//
// LIMITS, stated with every result. A convex ellipsoid shows two maxima and two
// minima a rotation, so the light has period P_rot / 2: that is the two-maxima rule,
// and a curve with ONE maximum a rotation (albedo markings, a very irregular shape)
// has the period 1 / f_peak instead; the answer carries both. The amplitude is a
// LOWER bound on the long to middle axis ratio (it falls as the aspect leaves 90
// degrees, which is not known) and says nothing about b/c. Zero phase angle: a real
// curve is observed at phase angles that change both the amplitude and the shape.
// Once-nightly sampling aliases the period; the answer says so (ambiguous) when it
// cannot tell. Nothing here is a shape model.
// =============================================================================

import {
  findPeriod,
  refinePeriod,
  bootstrapPeriod,
} from '../variables/period.js';
import { harmonicFit, curveStats } from '../variables/fit.js';
import { percentileInterval } from '../statistics/index.js';
import { refused } from '../statistics/check.js';
import { stream, gaussian } from '../../random/streams.js';

const { Math, Number, Float64Array } = globalThis;
const RAD = Math.PI / 180;

/** Axes a >= b >= c > 0 and an aspect in [0, 90] degrees, or a refusal. */
export function validateBody(body, thetaDeg) {
  const { a, b, c } = body ?? {};
  if (![a, b, c].every(x => Number.isFinite(x) && x > 0) || !(a >= b && b >= c))
    return refused('axes', 'the axes must satisfy a >= b >= c > 0');
  if (!Number.isFinite(thetaDeg) || thetaDeg < 0 || thetaDeg > 90)
    return refused('aspect', 'the aspect angle is between 0 and 90 degrees');
  return null;
}

/**
 * The area of the ellipsoid's silhouette seen along the unit vector n in the body
 * frame, n = (sin theta cos phi, sin theta sin phi, cos theta): pi times
 * sqrt(b^2 c^2 nx^2 + a^2 c^2 ny^2 + a^2 b^2 nz^2). theta is the angle from the
 * spin (c) axis; phi is the rotation phase.
 */
export function projectedArea(body, thetaDeg, phiDeg) {
  const bad = validateBody(body, thetaDeg);
  if (bad) return NaN;
  const { a, b, c } = body;
  const nx = Math.sin(thetaDeg * RAD) * Math.cos(phiDeg * RAD);
  const ny = Math.sin(thetaDeg * RAD) * Math.sin(phiDeg * RAD);
  const nz = Math.cos(thetaDeg * RAD);
  return (
    Math.PI *
    Math.sqrt(
      b * b * c * c * nx * nx +
        a * a * c * c * ny * ny +
        a * a * b * b * nz * nz
    )
  );
}

/** Magnitudes (m = -2.5 log10 of the area over pi a b) at the given rotation phases (degrees). */
export function lightCurveMag(body, thetaDeg, phasesDeg) {
  const ref = Math.PI * body.a * body.b;
  return Float64Array.from(
    phasesDeg,
    phi => -2.5 * Math.log10(projectedArea(body, thetaDeg, phi) / ref)
  );
}

/**
 * The peak-to-peak amplitude, in magnitudes, of a rotating triaxial ellipsoid at
 * aspect theta: 2.5 log10(a/b) - 1.25 log10((a^2 cos^2 + c^2 sin^2) / (b^2 cos^2 + c^2 sin^2)).
 */
export function amplitudeMag(body, thetaDeg) {
  const bad = validateBody(body, thetaDeg);
  if (bad) return NaN;
  const { a, b, c } = body;
  const co = Math.cos(thetaDeg * RAD) ** 2;
  const si = Math.sin(thetaDeg * RAD) ** 2;
  return (
    2.5 * Math.log10(a / b) -
    1.25 * Math.log10((a * a * co + c * c * si) / (b * b * co + c * c * si))
  );
}

/** The lower bound on a/b from an amplitude in magnitudes: 10^(0.4 amplitude). A bound, not the shape. */
export const axisRatioBound = amplitude => Math.pow(10, 0.4 * amplitude);

/**
 * A synthetic light curve with its truth manifest.
 * @param {{body: {a, b, c}, thetaDeg: number, periodHours: number, phase0Deg?: number}} truth
 * @param {ArrayLike<number>} times - days
 * @param {{noiseMag?: number, seed: string|number, label?: string}} opts
 */
export function synthLightCurve(
  truth,
  times,
  { noiseMag = 0, seed, label = 'lightcurve' } = {}
) {
  const bad = validateBody(truth.body, truth.thetaDeg);
  if (bad) return bad;
  if (!(truth.periodHours > 0))
    return refused('sigma', 'the period must be positive');
  if (!Number.isFinite(noiseMag) || noiseMag < 0)
    return refused('sigma', 'the noise must be a number of at least 0');
  const t0 = times[0];
  const phase0 = truth.phase0Deg ?? 0;
  const phases = Float64Array.from(
    times,
    t => phase0 + (360 * 24 * (t - t0)) / truth.periodHours
  );
  const clean = lightCurveMag(truth.body, truth.thetaDeg, phases);
  const g = gaussian(stream('noise', seed, label));
  const m = Float64Array.from(clean, v => v + noiseMag * g());
  return {
    status: 'ok',
    t: Float64Array.from(times),
    m,
    truth: {
      synthetic: true,
      model: 'triaxial ellipsoid, geometric scattering, zero phase angle',
      body: { ...truth.body },
      thetaDeg: truth.thetaDeg,
      periodHours: truth.periodHours,
      phase0Deg: phase0,
      amplitudeMag: amplitudeMag(truth.body, truth.thetaDeg),
      noiseMag,
      seed,
      label,
    },
  };
}

/**
 * Observation times: `nights` nights a day apart, `pointsPerNight` points in each
 * `hoursPerNight` window, at random times (sorted) or on a regular cadence.
 */
export function nightlyTimes({
  nights,
  hoursPerNight,
  pointsPerNight,
  regular = false,
  jitterDay = 0,
  seed = 'times',
  label = 'times',
}) {
  const u = stream('noise', seed, label);
  const out = [];
  for (let k = 0; k < nights; k++) {
    const night = [];
    for (let j = 0; j < pointsPerNight; j++)
      night.push(
        k +
          (regular
            ? (j / pointsPerNight) * (hoursPerNight / 24)
            : u() * (hoursPerNight / 24)) +
          (jitterDay ? (u() - 0.5) * jitterDay : 0)
      );
    out.push(...night.sort((p, q) => p - q));
  }
  return Float64Array.from(out);
}

/**
 * False-alarm probability of the strongest of M independent frequencies, for a
 * generalised Lomb-Scargle power p (fraction of variance) from n points: one
 * frequency exceeds p with probability (1 - p)^((n - 3) / 2) (Zechmeister and
 * Kuerster 2009), M of them 1 - (1 - that)^M (Horne and Baliunas 1986).
 */
export function falseAlarm(power, n, M) {
  const single = Math.pow(1 - power, (n - 3) / 2);
  return -Math.expm1(M * Math.log1p(-single));
}

const HARMONICS = 4;
const AMP_GRID = 360;

/**
 * The rotation period and amplitude of a light curve, with the bound on a/b and
 * the verdicts a lesson reads.
 * @param {ArrayLike<number>} t - days
 * @param {ArrayLike<number>} m - magnitudes
 * @param {object} [opts] - minPeriodHours, maxPeriodHours (rotation), oversample,
 *   harmonics, bootstrapResamples, amplitudeDraws, level, falseAlarmMax,
 *   ambiguityRatio, phaseGapMax (the amplitude is withheld above this largest gap
 *   in the folded phase), amplitudeMax, minPoints, seed (default 'lightcurve');
 *   bootstrapResamples or amplitudeDraws of 0 skip that interval
 */
export function rotationFromLightCurve(t, m, opts = {}) {
  const o = {
    minPeriodHours: 1.5,
    maxPeriodHours: 100,
    oversample: 8,
    harmonics: HARMONICS,
    bootstrapResamples: 40,
    amplitudeDraws: 200,
    level: 0.95,
    falseAlarmMax: 0.01,
    ambiguityRatio: 0.9,
    phaseGapMax: 0.35,
    amplitudeMax: 3,
    minPoints: 20,
    seed: 'lightcurve',
    ...opts,
  };
  if (t.length !== m.length)
    return refused('sampling', 'times and magnitudes differ in length');
  for (let i = 0; i < t.length; i++)
    if (!Number.isFinite(t[i]) || !Number.isFinite(m[i]))
      return refused('non-finite', 'a time or a magnitude is NaN or infinite');
  const n = t.length;
  if (n < o.minPoints)
    return refused(
      'too-few',
      `${n} points; at least ${o.minPoints} are needed`
    );
  const order = Array.from({ length: n }, (_, i) => i).sort(
    (p, q) => t[p] - t[q]
  );
  const ts = Float64Array.from(order, i => t[i]);
  const ms = Float64Array.from(order, i => m[i]);
  const T = ts[n - 1] - ts[0];
  if (!(T > 0)) return refused('sampling', 'all the times are the same');
  const found = findPeriod(ts, ms, {
    minPeriod: o.minPeriodHours / 2 / 24,
    maxPeriod: o.maxPeriodHours / 2 / 24,
    oversample: o.oversample,
  });
  const f0 = 1 / found.period;
  const fmin = 1 / (o.maxPeriodHours / 2 / 24);
  const fmax = 1 / (o.minPeriodHours / 2 / 24);
  const M = Math.max(1, T * (fmax - fmin));
  const fap = falseAlarm(found.power, n, M);
  const base = {
    status: 'ok',
    n,
    baselineDays: T,
    power: found.power,
    falseAlarm: fap,
    peakPeriodHours: found.period * 24,
    assumes: ROTATION_ASSUMES,
  };
  if (!(fap <= o.falseAlarmMax))
    return {
      ...base,
      verdict: 'not-periodic',
      why: `the strongest peak has a false-alarm probability of ${fap.toPrecision(2)}, above ${o.falseAlarmMax}`,
    };
  // The second peak: the strongest local maximum outside 1.5 resolution elements of the first.
  const g = found.grid;
  const sp = found.spectrum;
  let second = 0;
  let secondF = null;
  for (let k = 1; k < sp.length - 1; k++) {
    const f = 1 / g[k];
    if (Math.abs(f - f0) <= 1.5 / T) continue;
    if (sp[k] >= sp[k - 1] && sp[k] >= sp[k + 1] && sp[k] > second) {
      second = sp[k];
      secondF = f;
    }
  }
  const ambiguous = second >= o.ambiguityRatio * found.power;
  const P0 = 2 * found.period;
  const refined = refinePeriod(ts, ms, P0, o.harmonics, (0.25 * P0 * P0) / T);
  const P = refined.period;
  const fit = harmonicFit(ts, ms, P, o.harmonics, { t0: ts[0] });
  if (!fit)
    return refused(
      'sampling',
      'the harmonic series is singular: too few distinct phases'
    );
  const stats = curveStats(fit, AMP_GRID);
  // The largest gap in the folded phase: where the curve was never observed the
  // harmonic series is an extrapolation, and a period near a multiple of a day (the
  // same phase every night) leaves a third of the rotation unseen.
  const phases = Array.from(ts, x => ((x - ts[0]) / P) % 1).sort(
    (p, q) => p - q
  );
  let phaseGap = 0;
  for (let i = 0; i < phases.length; i++)
    phaseGap = Math.max(
      phaseGap,
      (i + 1 < phases.length ? phases[i + 1] : phases[0] + 1) - phases[i]
    );
  const withheld =
    phaseGap > o.phaseGapMax
      ? 'phase-gap'
      : stats.amplitude > o.amplitudeMax
        ? 'ill-conditioned'
        : null;
  const boot =
    o.bootstrapResamples > 0
      ? bootstrapPeriod(ts, ms, P, {
          K: o.harmonics,
          resamples: o.bootstrapResamples,
          seed: o.seed,
        })
      : null;
  const u = stream('noise', o.seed, 'amplitude');
  const amps = [];
  const tb = new Float64Array(n);
  const mb = new Float64Array(n);
  for (let d = 0; d < (withheld ? 0 : o.amplitudeDraws); d++) {
    for (let i = 0; i < n; i++) {
      const j = Math.min(n - 1, Math.floor(u() * n));
      tb[i] = ts[j];
      mb[i] = ms[j];
    }
    const fb = harmonicFit(tb, mb, P, o.harmonics, { t0: ts[0] });
    if (fb) amps.push(curveStats(fb, AMP_GRID).amplitude);
  }
  const ai =
    amps.length > 0
      ? percentileInterval(amps, { level: o.level, method: 'case-bootstrap' })
      : { status: 'none' };
  const ampLo = ai.status === 'ok' ? ai.lo : null;
  const out = {
    ...base,
    verdict: ambiguous ? 'ambiguous' : 'period',
    periodHours: P * 24,
    sigmaHours: boot ? boot.sigma * 24 : null,
    sigmaNote: 'a bootstrap of the points: a floor on the error',
    alternative: {
      periodHours: found.period * 24,
      assumes:
        'one maximum a rotation (albedo markings, or a shape far from an ellipsoid)',
    },
    amplitudeMag: withheld ? null : stats.amplitude,
    amplitudeWithheld: withheld,
    phaseGap,
    amplitudeInterval:
      ai.status === 'ok'
        ? {
            lo: ai.lo,
            hi: ai.hi,
            level: o.level,
            method: 'case-bootstrap',
            note: 'a percentile bootstrap of a peak-to-peak statistic at the fitted period: on synthetic curves it covered the true amplitude about two times in three at a stated 95 percent (SMALL_BODIES.md), so read it as a floor on the uncertainty',
          }
        : null,
    axisRatioBound:
      ampLo === null || withheld
        ? null
        : {
            claim: 'a/b >= value',
            value: axisRatioBound(Math.max(0, ampLo)),
            atEstimate: axisRatioBound(stats.amplitude),
            level: o.level,
            note: 'a lower bound: equal to a/b only when seen equator-on, and it says nothing about b/c',
          },
    harmonics: fit.harmonics.map(h => h.amplitude),
    rms: fit.rms,
  };
  if (ambiguous)
    out.candidates = [
      { periodHours: P * 24, power: found.power },
      { periodHours: (2 / secondF) * 24, power: second },
    ];
  return out;
}

const ROTATION_ASSUMES = Object.freeze([
  'a convex shape with two maxima and two minima a rotation (the two-maxima rule): one maximum a rotation would halve the period',
  'geometric scattering at zero phase angle: the observed curve at a larger phase angle has another amplitude and shape',
  'the amplitude is a lower bound on a/b and nothing is said of b/c',
  'the points are independent, so the period error is a floor',
]);
