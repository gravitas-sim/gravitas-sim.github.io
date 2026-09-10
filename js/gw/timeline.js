// =============================================================================
// The canonical signal timeline
// -----------------------------------------------------------------------------
// One object per signal. The strain plot, the frequency view, the schematic
// source, the wave overlay, the audio buffer, the event markers and the
// evidence capture all read this and nothing else. There is deliberately no
// second copy of a waveform anywhere: a plot that draws from one array while
// audio plays from another is how a cursor ends up two hundred milliseconds
// away from what a student is hearing.
//
// Two implementations, one shape
// -----------------------------------------------------------------------------
//   modelTimeline()   closed-form leading-order inspiral (js/gw/waveform.js).
//                     Every accessor is an evaluation, so it is exact at any
//                     sample rate and costs nothing to store.
//   sampledTimeline() a bundled recording - real detector data, or a published
//                     reconstruction. Interpolated between stored samples.
//
// Callers are written against the shape, not against which one they were
// handed, which is what lets one plot draw a model and a measurement on the
// same axes and one audio path play either.
//
// On bounded work
// -----------------------------------------------------------------------------
// A binary-neutron-star inspiral from 20 Hz is 158 seconds and five thousand
// cycles. Nothing here ever materialises that: envelope() is O(buckets) and
// resolves each bucket analytically when more than a cycle falls inside it,
// which is the standard way an audio editor draws an hour of sound into nine
// hundred pixels and the only way this plot stays honest when zoomed out.
// =============================================================================

import {
  chirpMass,
  symmetricMassRatio,
  iscoFrequency,
  timeToCoalescence,
  frequencyAt,
  phaseAt,
  strainAmplitude,
  inclinationFactors,
  effectiveDistance,
  separationMetres,
  separationInSchwarzschildRadii,
  velocityParameter,
  fidelityBand,
  T_SUN as T_SUN_S,
} from './waveform.js';

/** How many points an envelope bucket is evaluated at when it holds under a cycle. */
const SUB_SAMPLES = 12;

/** A hard ceiling on the work one envelope() call may do. */
const MAX_EVALUATIONS = 200000;

/**
 * A leading-order inspiral, as a timeline.
 *
 * Time runs to coalescence: t is negative before it and zero at it. The
 * timeline ends at the innermost stable circular orbit, which is before
 * coalescence - `tEnd` is negative, and the gap between it and zero is the
 * merger this model does not have.
 *
 * @param {object} spec
 * @param {number} spec.m1 - Detector-frame component mass, solar masses
 * @param {number} spec.m2 - The other, solar masses
 * @param {number} spec.distanceMpc - Luminosity distance, megaparsecs
 * @param {number} spec.inclinationDeg - Inclination, degrees (0 = face-on)
 * @param {number} [spec.fStart] - Wave frequency the model starts at, Hz
 * @param {string} [spec.id] - An identifier carried into captures
 * @returns {object} A timeline
 */
export function modelTimeline({
  m1,
  m2,
  distanceMpc,
  inclinationDeg,
  fStart = 20,
  id = 'model',
} = {}) {
  const totalMass = m1 + m2;
  const mc = chirpMass(m1, m2);
  const isco = iscoFrequency(totalMass);
  const iota = (inclinationDeg * Math.PI) / 180;
  const { plus: cPlus, cross: cCross } = inclinationFactors(iota);

  // The model may not be asked to start above where it ends. Clamped rather
  // than rejected: a mass slider dragged upward walks the ISCO frequency down
  // past a fixed start frequency, and the honest response is a timeline of
  // almost no length that says so, not an exception in a drag handler.
  const startF = Math.min(Math.max(fStart, 1e-3), isco * 0.999);
  const tauStart = timeToCoalescence(startF, mc);
  const tauEnd = timeToCoalescence(isco, mc);
  const tStart = -tauStart;
  const tEnd = -tauEnd;

  // A caller that walks its own span - `tStart + duration * i / n` - lands an
  // ulp or two outside it at the last step, and answering NaN to a request for
  // the timeline's own endpoint is a trap rather than a safeguard. Inside the
  // tolerance the time is clamped to the boundary, which is a value the model
  // has; outside it the answer is still NaN, because that is extrapolation.
  const EDGE = Math.max(Math.abs(tStart), Math.abs(tEnd), 1) * 1e-9;
  const inRange = t => t >= tStart - EDGE && t <= tEnd + EDGE;
  const tauOf = t => -Math.min(Math.max(t, tStart), tEnd);

  const frequencyAtTime = t => (inRange(t) ? frequencyAt(tauOf(t), mc) : NaN);
  const phaseAtTime = t => (inRange(t) ? phaseAt(tauOf(t), mc) : NaN);
  const amplitudeAtTime = t => {
    const f = frequencyAtTime(t);
    return Number.isFinite(f) ? strainAmplitude(f, mc, distanceMpc) : NaN;
  };
  const plusAtTime = t => {
    const a = amplitudeAtTime(t);
    return Number.isFinite(a) ? a * cPlus * Math.cos(phaseAtTime(t)) : NaN;
  };
  const crossAtTime = t => {
    const a = amplitudeAtTime(t);
    return Number.isFinite(a) ? a * cCross * Math.sin(phaseAtTime(t)) : NaN;
  };
  // The detector strain. The source is overhead with polarization angle zero,
  // so F_plus = 1 and F_cross = 0 and this is h_plus exactly. Stated in the
  // interface next to the plot, not only here.
  const strainAtTime = plusAtTime;
  // The detector strain's envelope, without the carrier. What audio and the
  // overlay want: both need to change the phase without losing the amplitude,
  // and reconstructing it by dividing out a cosine is not a thing that works.
  const envelopeAtTime = t => {
    const a = amplitudeAtTime(t);
    return Number.isFinite(a) ? a * cPlus : NaN;
  };

  /**
   * Min and max of the detector strain over each of `buckets` equal slices.
   *
   * Analytic where a whole cycle fits inside a bucket, which is the common
   * case when zoomed out and the reason this is affordable at all.
   */
  const envelope = (from, to, buckets) => {
    const n = Math.max(1, Math.floor(buckets));
    const min = new Float32Array(n);
    const max = new Float32Array(n);
    const width = (to - from) / n;
    let budget = MAX_EVALUATIONS;
    for (let i = 0; i < n; i++) {
      const a = from + i * width;
      const b = a + width;
      if (b <= tStart || a >= tEnd) {
        min[i] = NaN;
        max[i] = NaN;
        continue;
      }
      const lo = Math.max(a, tStart);
      const hi = Math.min(b, tEnd);
      const pa = phaseAtTime(lo);
      const pb = phaseAtTime(hi);
      const swept = Math.abs(pb - pa);
      if (swept >= 2 * Math.PI) {
        // A full cycle or more: the extremes are the envelope itself, and the
        // amplitude grows monotonically, so the later end bounds it.
        const amp = amplitudeAtTime(hi) * cPlus;
        min[i] = -amp;
        max[i] = amp;
        continue;
      }
      let lowest = Infinity;
      let highest = -Infinity;
      const steps = Math.min(SUB_SAMPLES, Math.max(2, budget));
      budget -= steps;
      for (let k = 0; k <= steps; k++) {
        const v = strainAtTime(lo + ((hi - lo) * k) / steps);
        if (!Number.isFinite(v)) continue;
        if (v < lowest) lowest = v;
        if (v > highest) highest = v;
      }
      min[i] = lowest === Infinity ? NaN : lowest;
      max[i] = highest === -Infinity ? NaN : highest;
      if (budget <= 0) budget = 1;
    }
    return { min, max };
  };

  /**
   * The moment at which the wave phase had a given value.
   *
   * The exact inverse of phaseAt(), which the wave overlay needs: a wavefront
   * drawn at a screen radius has to carry the phase that was *emitted* when the
   * light-travel time to that radius began, and finding those emission moments
   * by searching the timeline would be both slower and approximate.
   *
   * @param {number} phi - A phase, radians, negative before coalescence
   * @returns {number} The time on this timeline, or NaN if it is outside it
   */
  const timeAtPhase = phi => {
    if (!(phi <= 0) || !Number.isFinite(phi)) return NaN;
    const theta = mc * T_SUN_S;
    const tau = 5 * theta * Math.pow(-phi / 2, 8 / 5);
    const t = -tau;
    return inRange(t) ? t : NaN;
  };

  /** The instantaneous frequency sampled uniformly across a window. */
  const frequencyTrack = (from, to, buckets) => {
    const n = Math.max(1, Math.floor(buckets));
    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      out[i] = frequencyAtTime(from + ((to - from) * (i + 0.5)) / n);
    }
    return out;
  };

  const meta = Object.freeze({
    kind: 'model',
    id,
    model: 'leading-order quasi-circular inspiral (0PN, quadrupole)',
    massFrame: 'detector',
    m1,
    m2,
    totalMassSun: totalMass,
    chirpMassSun: mc,
    symmetricMassRatio: symmetricMassRatio(m1, m2),
    distanceMpc,
    inclinationDeg,
    effectiveDistanceMpc: effectiveDistance(distanceMpc, iota),
    fStartHz: startF,
    fEndHz: isco,
    iscoHz: isco,
    terminatedAt: 'schwarzschild-isco',
    detectorResponse: 'F+ = 1, Fx = 0 (source overhead, polarization angle 0)',
    strainUnit: 'dimensionless',
    cyclesModelled:
      Math.abs(phaseAt(tauStart, mc) - phaseAt(tauEnd, mc)) / (2 * Math.PI),
    peakStrain: strainAmplitude(isco, mc, distanceMpc) * cPlus,
    vOverCAtEnd: velocityParameter(isco, totalMass),
  });

  return Object.freeze({
    kind: 'model',
    id,
    tStart,
    tEnd,
    duration: tEnd - tStart,
    /** Wave frequency at the start and the end of the modelled span. */
    fStart: startF,
    fEnd: isco,
    hasAnalyticPhase: true,
    frequencyAtTime,
    phaseAtTime,
    amplitudeAtTime,
    plusAtTime,
    crossAtTime,
    strainAtTime,
    envelopeAtTime,
    /** Schematic source geometry, driven by the same timeline. */
    separationAtTime: t => {
      const f = frequencyAtTime(t);
      return Number.isFinite(f) ? separationMetres(f, totalMass) : NaN;
    },
    separationRsAtTime: t => {
      const f = frequencyAtTime(t);
      return Number.isFinite(f)
        ? separationInSchwarzschildRadii(f, totalMass)
        : NaN;
    },
    /** Orbital phase is half the wave phase for the dominant quadrupole mode. */
    orbitalPhaseAtTime: t => {
      const p = phaseAtTime(t);
      return Number.isFinite(p) ? p / 2 : NaN;
    },
    velocityAtTime: t => {
      const f = frequencyAtTime(t);
      return Number.isFinite(f) ? velocityParameter(f, totalMass) : NaN;
    },
    fidelityAtTime: t => {
      const f = frequencyAtTime(t);
      return Number.isFinite(f)
        ? fidelityBand(velocityParameter(f, totalMass))
        : 'unknown';
    },
    timeAtPhase,
    envelope,
    frequencyTrack,
    meta,
  });
}

/**
 * A recording, as a timeline.
 *
 * Same shape, no closed form. Frequency is not stored and not inferred:
 * `frequencyAtTime` returns NaN unless a track was supplied with the samples,
 * because guessing an instantaneous frequency from a noisy trace and then
 * plotting it beside a model's exact one would put a derived quantity and a
 * measured one on the same footing.
 *
 * @param {object} spec
 * @param {Float32Array|Array<number>} spec.samples - The trace
 * @param {number} spec.sampleRate - Hz
 * @param {number} spec.t0 - Time of the first sample, in the timeline's own convention
 * @param {object} [spec.meta] - Provenance, carried into every capture
 * @param {Float32Array} [spec.frequency] - An accompanying frequency track, same rate
 * @param {string} [spec.id]
 * @returns {object} A timeline
 */
export function sampledTimeline({
  samples,
  sampleRate,
  t0 = 0,
  meta = {},
  frequency = null,
  id = 'data',
} = {}) {
  const data =
    samples instanceof Float32Array
      ? samples
      : Float32Array.from(samples || []);
  const n = data.length;
  const dt = 1 / sampleRate;
  const tStart = t0;
  const tEnd = t0 + (n - 1) * dt;

  // The same edge tolerance the model timeline carries, for the same reason.
  const EDGE = dt * 1e-6;

  /** Linear interpolation. The traces are band-limited well below Nyquist. */
  const at = (arr, t0v) => {
    if (!arr || !(n > 1) || !(t0v >= tStart - EDGE) || !(t0v <= tEnd + EDGE)) {
      return NaN;
    }
    const t = Math.min(Math.max(t0v, tStart), tEnd);
    const x = (t - tStart) / dt;
    const i = Math.floor(x);
    if (i >= n - 1) return arr[n - 1];
    const frac = x - i;
    return arr[i] * (1 - frac) + arr[i + 1] * frac;
  };

  const strainAtTime = t => at(data, t);

  const envelope = (from, to, buckets) => {
    const b = Math.max(1, Math.floor(buckets));
    const min = new Float32Array(b);
    const max = new Float32Array(b);
    const width = (to - from) / b;
    for (let i = 0; i < b; i++) {
      const a = from + i * width;
      const z = a + width;
      let i0 = Math.ceil((a - tStart) / dt);
      let i1 = Math.floor((z - tStart) / dt);
      if (i1 < 0 || i0 > n - 1 || z < tStart || a > tEnd) {
        min[i] = NaN;
        max[i] = NaN;
        continue;
      }
      i0 = Math.max(0, i0);
      i1 = Math.min(n - 1, i1);
      let lowest = Infinity;
      let highest = -Infinity;
      // A bucket narrower than one sample still has to draw something: fall
      // back to the interpolated value at its centre rather than a gap.
      if (i1 < i0) {
        const v = strainAtTime((a + z) / 2);
        min[i] = v;
        max[i] = v;
        continue;
      }
      for (let k = i0; k <= i1; k++) {
        const v = data[k];
        if (v < lowest) lowest = v;
        if (v > highest) highest = v;
      }
      min[i] = lowest;
      max[i] = highest;
    }
    return { min, max };
  };

  return Object.freeze({
    kind: 'data',
    id,
    tStart,
    tEnd,
    duration: tEnd - tStart,
    sampleRate,
    sampleCount: n,
    hasAnalyticPhase: false,
    strainAtTime,
    plusAtTime: strainAtTime,
    crossAtTime: () => NaN,
    envelopeAtTime: () => NaN,
    frequencyAtTime: t => (frequency ? at(frequency, t) : NaN),
    phaseAtTime: () => NaN,
    amplitudeAtTime: () => NaN,
    separationAtTime: () => NaN,
    separationRsAtTime: () => NaN,
    orbitalPhaseAtTime: () => NaN,
    velocityAtTime: () => NaN,
    fidelityAtTime: () => 'unknown',
    timeAtPhase: () => NaN,
    envelope,
    frequencyTrack: (from, to, buckets) => {
      const b = Math.max(1, Math.floor(buckets));
      const out = new Float32Array(b);
      for (let i = 0; i < b; i++) {
        out[i] = frequency
          ? at(frequency, from + ((to - from) * (i + 0.5)) / b)
          : NaN;
      }
      return out;
    },
    meta: Object.freeze({ kind: 'data', id, ...meta }),
  });
}
