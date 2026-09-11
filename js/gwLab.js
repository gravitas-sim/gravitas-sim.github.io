// =============================================================================
// The gravitational-wave observing lab, without a canvas
// -----------------------------------------------------------------------------
// Everything the lab *is* - presets, bounded parameters, the timeline, the
// playhead, the noise realization, the pinned comparison - lives here, where it
// can be tested without a browser. js/gwWidgets.js draws it and js/gwAudio.js
// plays it; neither owns any of it.
//
// The bounded window
// -----------------------------------------------------------------------------
// A pair of neutron stars entering the band at 20 Hz radiates for 158 seconds
// and five thousand cycles. Nothing good comes of modelling all of it: the
// audio would be truncated, the noise array would be six hundred thousand
// samples, and a student would be asked to wait. So each preset declares a
// window - the last N seconds before the model's own end - and the lab reports
// both numbers, always: what it modelled, and what the whole inspiral would be.
// The window is a stated excerpt rather than a silent truncation.
// =============================================================================

import { modelTimeline } from './gw/timeline.js';
import {
  chirpMass,
  iscoFrequency,
  timeToCoalescence,
  frequencyAt,
  cyclesRemaining,
  velocityParameter,
  fidelityBand,
  effectiveDistance,
} from './gw/waveform.js';
import { colouredNoise } from './gw/noise.js';

/** The lowest frequency any preset starts at. Below this no detector is looking. */
export const BAND_FLOOR_HZ = 20;

/** The rate the noise realization and the local strain view are computed at. */
export const SIGNAL_RATE_HZ = 4096;

/** A hard cap on the modelled window, so no array here is unbounded. */
export const MAX_WINDOW_SECONDS = 8;

/**
 * The three sources.
 *
 * Every difference between them comes out of the masses. There is no
 * source-type switch that adds a feature, because the model does not have one
 * to add: a neutron-star preset is a mass choice and the interface says so.
 */
export const PRESETS = Object.freeze([
  Object.freeze({
    id: 'bbh',
    m1: 36,
    m2: 29,
    distanceMpc: 410,
    inclinationDeg: 0,
    windowSeconds: 1.2,
  }),
  Object.freeze({
    id: 'bns',
    m1: 1.4,
    m2: 1.4,
    distanceMpc: 40,
    inclinationDeg: 0,
    windowSeconds: 8,
  }),
  Object.freeze({
    id: 'nsbh',
    m1: 10,
    m2: 1.4,
    distanceMpc: 200,
    inclinationDeg: 0,
    windowSeconds: 8,
  }),
]);

/** Bounds on every control, so a slider cannot ask for a waveform that is not one. */
export const LIMITS = Object.freeze({
  m1: { min: 1, max: 60 },
  m2: { min: 1, max: 60 },
  distanceMpc: { min: 10, max: 2000 },
  inclinationDeg: { min: 0, max: 90 },
});

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * Bring a parameter set inside the limits.
 * @param {object} p - Anything shaped like a parameter set
 * @returns {object} A valid one
 */
export function clampParams(p = {}) {
  const m1 = clamp(Number(p.m1) || 1, LIMITS.m1.min, LIMITS.m1.max);
  const m2 = clamp(Number(p.m2) || 1, LIMITS.m2.min, LIMITS.m2.max);
  return {
    m1,
    m2,
    distanceMpc: clamp(
      Number(p.distanceMpc) || LIMITS.distanceMpc.min,
      LIMITS.distanceMpc.min,
      LIMITS.distanceMpc.max
    ),
    inclinationDeg: clamp(
      Number(p.inclinationDeg) || 0,
      LIMITS.inclinationDeg.min,
      LIMITS.inclinationDeg.max
    ),
    windowSeconds: clamp(
      Number(p.windowSeconds) || 1.2,
      0.05,
      MAX_WINDOW_SECONDS
    ),
  };
}

/** Reference amplitudes, worked out once per preset. */
const referenceCache = new Map();

/**
 * The strain that maps to full scale when a comparison is being listened to.
 *
 * A controlled comparison needs one reference that does **not** move when the
 * thing being compared moves. The lab used to normalise every playback against
 * the signal's own loudest moment, so doubling the distance halved the strain,
 * halved the reference with it, and produced an identical sound: three
 * distances, three plots differing by a factor of four, and one audio
 * amplitude. The ratio the student was being asked to hear was the one
 * quantity the normalisation removed.
 *
 * The reference is the preset's peak at its **own default parameters**, so it
 * belongs to the preset and not to whatever the student has changed. Moving a
 * control then changes loudness in exact proportion to strain.
 *
 * Headroom comes from the playback gain rather than from padding this number:
 * at the default the signal renders at the gain itself, about 0.3 of full
 * scale, so a configuration up to three times louder still fits. Beyond that
 * js/gw/audioRender.js clamps and reports how many samples it clamped, which
 * the readout surfaces rather than hiding.
 *
 * @param {string} presetId - Which preset
 * @returns {number} A strain, or 0 for an unknown preset
 */
export function referenceStrainFor(presetId) {
  if (referenceCache.has(presetId)) return referenceCache.get(presetId);
  const preset = PRESETS.find(x => x.id === presetId);
  const value = preset ? modelTimeline(clampParams(preset)).meta.peakStrain : 0;
  referenceCache.set(presetId, value);
  return value;
}

/**
 * The frequency at which a modelled window of a given length starts.
 *
 * Never below the band floor: a window longer than the whole inspiral from
 * 20 Hz gets the whole inspiral, and the lab says the window was shorter than
 * asked for rather than modelling a binary nobody could hear.
 *
 * @param {object} p - Clamped parameters
 * @returns {number} Hz
 */
export function startFrequencyFor(p) {
  const mc = chirpMass(p.m1, p.m2);
  const tauEnd = timeToCoalescence(iscoFrequency(p.m1 + p.m2), mc);
  return Math.max(BAND_FLOOR_HZ, frequencyAt(tauEnd + p.windowSeconds, mc));
}

/**
 * Everything about a configuration that a caption, a capture or a comparison
 * needs, derived once.
 *
 * @param {object} params - Clamped parameters
 * @returns {object} The derived facts, all of them named
 */
export function describe(params) {
  const p = clampParams(params);
  const mc = chirpMass(p.m1, p.m2);
  const total = p.m1 + p.m2;
  const isco = iscoFrequency(total);
  const fStart = startFrequencyFor(p);
  return {
    ...p,
    chirpMassSun: mc,
    totalMassSun: total,
    iscoHz: isco,
    fStartHz: fStart,
    /** The modelled excerpt. */
    windowActualSeconds:
      timeToCoalescence(fStart, mc) - timeToCoalescence(isco, mc),
    cyclesInWindow: cyclesRemaining(fStart, mc) - cyclesRemaining(isco, mc),
    /** And the whole inspiral from the band floor, which is the honest context. */
    fullBandSeconds:
      timeToCoalescence(BAND_FLOOR_HZ, mc) - timeToCoalescence(isco, mc),
    fullBandCycles:
      cyclesRemaining(BAND_FLOOR_HZ, mc) - cyclesRemaining(isco, mc),
    excerpted: fStart > BAND_FLOOR_HZ * 1.0001,
    vOverCAtStart: velocityParameter(fStart, total),
    vOverCAtEnd: velocityParameter(isco, total),
    fidelityAtStart: fidelityBand(velocityParameter(fStart, total)),
    fidelityAtEnd: fidelityBand(velocityParameter(isco, total)),
    effectiveDistanceMpc: effectiveDistance(
      p.distanceMpc,
      (p.inclinationDeg * Math.PI) / 180
    ),
  };
}

/**
 * A key that changes when, and only when, the waveform changes.
 *
 * The playhead, the pinned comparison and the audio all key off this, so that
 * dragging the cursor seeks and dragging a mass rebuilds.
 *
 * @param {object} p - Parameters
 * @returns {string} The key
 */
export const signatureOf = p => {
  const c = clampParams(p);
  return `${c.m1}|${c.m2}|${c.distanceMpc}|${c.inclinationDeg}|${c.windowSeconds}`;
};

/**
 * Build a lab state.
 *
 * @param {object} [spec]
 * @param {object} [spec.params] - Starting parameters; the first preset otherwise
 * @param {string} [spec.noiseSeed] - Fixes the noise realization
 * @param {boolean} [spec.noiseOn]
 * @param {boolean} [spec.playing]
 * @returns {object} A mutable lab state
 */
export function createLab({
  params = PRESETS[0],
  noiseSeed = 'gw-lab-1',
  noiseOn = false,
  playing = false,
} = {}) {
  const state = {
    params: clampParams(params),
    signature: '',
    timeline: null,
    facts: null,
    cursorT: 0,
    playing,
    /** Physical seconds per second of wall clock. Set from the preset. */
    playbackSpeed: 1,
    noiseOn,
    noiseSeed,
    noise: null,
    noiseT0: 0,
    /** A pinned configuration, for a controlled comparison. */
    pinned: null,
    /** Bumped whenever a rebuild happens, so a consumer can invalidate. */
    generation: 0,
  };
  rebuild(state);
  return state;
}

/**
 * Rebuild the timeline from the current parameters, if they have changed.
 *
 * The playhead is preserved as a fraction of the span, which is what makes a
 * mass slider feel like a comparison rather than a reset: the same point in the
 * inspiral stays on screen while the waveform under it changes.
 *
 * @param {object} state - From createLab()
 * @param {boolean} [force] - Rebuild even if the signature is unchanged
 * @returns {boolean} Whether anything was rebuilt
 */
export function rebuild(state, force = false) {
  const sig = signatureOf(state.params);
  if (!force && sig === state.signature && state.timeline) return false;
  const p = clampParams(state.params);
  const fraction = state.timeline
    ? (state.cursorT - state.timeline.tStart) / (state.timeline.duration || 1)
    : 0;
  state.params = p;
  state.signature = sig;
  state.facts = describe(p);
  state.timeline = modelTimeline({
    m1: p.m1,
    m2: p.m2,
    distanceMpc: p.distanceMpc,
    inclinationDeg: p.inclinationDeg,
    fStart: state.facts.fStartHz,
    id: 'gw-lab',
  });
  state.cursorT =
    state.timeline.tStart +
    clamp(Number.isFinite(fraction) ? fraction : 0, 0, 1) *
      state.timeline.duration;
  // The realization is keyed to the seed and the span, not to the parameters:
  // changing a mass must not redraw the noise, or a controlled comparison is
  // comparing two things.
  state.noise = null;
  state.playbackSpeed = defaultSpeedFor(state.facts);
  state.generation++;
  return true;
}

/**
 * How fast to play, so that every preset takes a similar time to watch.
 *
 * Reported to the student as a mapping rather than applied invisibly: a
 * neutron-star inspiral eight seconds long played at 1x is eight seconds, and
 * a black-hole one at 0.25x stretches 0.8 seconds into three.
 *
 * @param {object} facts - From describe()
 * @returns {number} Physical seconds per second of wall clock
 */
export function defaultSpeedFor(facts) {
  const target = 6;
  const raw = facts.windowActualSeconds / target;
  // Round to something a caption can print: 0.1, 0.25, 0.5, 1, 2, 5, ...
  const steps = [0.1, 0.25, 0.5, 1, 2, 5, 10, 20, 50];
  let best = steps[0];
  for (const s of steps) {
    if (Math.abs(Math.log(s / raw)) < Math.abs(Math.log(best / raw))) best = s;
  }
  return best;
}

/**
 * The noise realization for the current span, made once and kept.
 *
 * @param {object} state - Lab state
 * @returns {Float32Array} Strain, at SIGNAL_RATE_HZ from the timeline's start
 */
export function noiseFor(state) {
  if (state.noise) return state.noise;
  const samples = Math.min(
    Math.ceil(MAX_WINDOW_SECONDS * SIGNAL_RATE_HZ),
    Math.max(64, Math.ceil(state.timeline.duration * SIGNAL_RATE_HZ) + 1)
  );
  state.noise = colouredNoise({
    samples,
    sampleRate: SIGNAL_RATE_HZ,
    seed: state.noiseSeed,
  });
  state.noiseT0 = state.timeline.tStart;
  return state.noise;
}

/**
 * The noise at a moment, interpolated. Zero outside the realization.
 * @param {object} state - Lab state
 * @param {number} t - Time on the timeline
 * @returns {number} Strain
 */
export function noiseAt(state, t) {
  if (!state.noiseOn) return 0;
  const n = noiseFor(state);
  const x = (t - state.noiseT0) * SIGNAL_RATE_HZ;
  if (!(x >= 0) || x >= n.length - 1) return 0;
  const i = Math.floor(x);
  const f = x - i;
  return n[i] * (1 - f) + n[i + 1] * f;
}

/**
 * What the detector sees: the signal, plus the noise if it is switched on.
 * @param {object} state - Lab state
 * @param {number} t - Time on the timeline
 * @returns {number} Strain
 */
export function observedAt(state, t) {
  const h = state.timeline.strainAtTime(t);
  if (!Number.isFinite(h)) return NaN;
  return h + noiseAt(state, t);
}

/** Put the playhead somewhere, clamped to the span. */
export function seek(state, t) {
  state.cursorT = clamp(t, state.timeline.tStart, state.timeline.tEnd);
}

/** Put the playhead at a fraction of the span. */
export function seekFraction(state, fraction) {
  seek(
    state,
    state.timeline.tStart + clamp(fraction, 0, 1) * state.timeline.duration
  );
}

/** Where the playhead is, as a fraction. */
export const cursorFraction = state =>
  state.timeline.duration > 0
    ? (state.cursorT - state.timeline.tStart) / state.timeline.duration
    : 0;

/**
 * Advance the playhead by a wall-clock interval.
 *
 * Stops at the end rather than looping. A looped inspiral would be a lie: the
 * binary does not go round again.
 *
 * @param {object} state - Lab state
 * @param {number} dtSeconds - Wall-clock seconds since the last call
 * @returns {boolean} Whether the playhead reached the end on this call
 */
export function advance(state, dtSeconds) {
  if (!state.playing) return false;
  const next = state.cursorT + dtSeconds * state.playbackSpeed;
  if (next >= state.timeline.tEnd) {
    state.cursorT = state.timeline.tEnd;
    state.playing = false;
    return true;
  }
  state.cursorT = next;
  return false;
}

/** Back to the start, still playing or not as it was. */
export function restart(state) {
  state.cursorT = state.timeline.tStart;
}

/** Start over and run. */
export function replay(state) {
  restart(state);
  state.playing = true;
}

/** Draw a new noise realization, deliberately. */
export function newNoiseRealization(state) {
  state.noiseSeed = `${state.noiseSeed}+`;
  state.noise = null;
}

/**
 * Remember the current configuration for a controlled comparison.
 *
 * The noise seed travels with it, so that A and B are compared under one
 * realization unless the student asks for another.
 *
 * @param {object} state - Lab state
 * @returns {object} What was pinned
 */
export function pin(state) {
  state.pinned = {
    params: { ...state.params },
    facts: state.facts,
    signature: state.signature,
    noiseSeed: state.noiseSeed,
    timeline: state.timeline,
  };
  return state.pinned;
}

/** Forget the pinned configuration. */
export function unpin(state) {
  state.pinned = null;
}

/**
 * What changed between the pinned configuration and the current one.
 *
 * Named fields rather than a diff of numbers, because the question a
 * controlled comparison has to answer is "what did you change" and the answer
 * "0.2" is not one.
 *
 * @param {object} state - Lab state
 * @returns {?{changed: string[], held: string[], a: object, b: object}} The
 *   comparison, or null when nothing is pinned
 */
export function comparison(state) {
  if (!state.pinned) return null;
  const a = state.pinned.params;
  const b = state.params;
  const fields = ['m1', 'm2', 'distanceMpc', 'inclinationDeg'];
  const changed = fields.filter(f => a[f] !== b[f]);
  const held = fields.filter(f => a[f] === b[f]);
  return {
    changed,
    held,
    a: state.pinned.facts,
    b: state.facts,
    sameNoise: state.pinned.noiseSeed === state.noiseSeed,
    controlled: changed.length === 1,
  };
}

/**
 * A capture-ready snapshot: every number a claim about this run could rest on.
 *
 * @param {object} state - Lab state
 * @returns {object} Plain data, safe to freeze
 */
export function snapshotOf(state) {
  const f = state.facts;
  const t = state.cursorT;
  return {
    model: state.timeline.meta.model,
    massFrame: 'detector',
    m1: f.m1,
    m2: f.m2,
    chirpMassSun: f.chirpMassSun,
    totalMassSun: f.totalMassSun,
    distanceMpc: f.distanceMpc,
    inclinationDeg: f.inclinationDeg,
    effectiveDistanceMpc: f.effectiveDistanceMpc,
    detectorResponse: state.timeline.meta.detectorResponse,
    fStartHz: f.fStartHz,
    iscoHz: f.iscoHz,
    terminatedAt: state.timeline.meta.terminatedAt,
    windowSeconds: f.windowActualSeconds,
    cyclesInWindow: f.cyclesInWindow,
    fullBandSeconds: f.fullBandSeconds,
    fullBandCycles: f.fullBandCycles,
    excerpted: f.excerpted,
    cursorSecondsToMerger: -t,
    frequencyAtCursorHz: state.timeline.frequencyAtTime(t),
    strainAtCursor: state.timeline.strainAtTime(t),
    envelopeAtCursor: state.timeline.envelopeAtTime(t),
    separationRsAtCursor: state.timeline.separationRsAtTime(t),
    vOverCAtCursor: state.timeline.velocityAtTime(t),
    fidelityAtCursor: state.timeline.fidelityAtTime(t),
    peakStrain: state.timeline.meta.peakStrain,
    noise: state.noiseOn
      ? { seed: state.noiseSeed, curve: 'aLIGO design (LIGO-T0900288 fit)' }
      : null,
    playbackSpeed: state.playbackSpeed,
  };
}

// -----------------------------------------------------------------------------
// Making a signal audible without lying about it
// -----------------------------------------------------------------------------

/** Roughly how long a listen should last, in seconds of wall clock. */
const LISTEN_SECONDS = 3;

/** The lowest and highest frequencies worth sending to a laptop speaker. */
const AUDIBLE_LOW = 80;
const AUDIBLE_HIGH = 6000;

/**
 * How to play a signal so that it can be heard, and what that does to it.
 *
 * Two ways out of the problem that a stellar-mass binary black hole chirps
 * from 20 Hz to 68 Hz, which is at the very bottom of hearing:
 *
 *   rate      play it faster. Every frequency is multiplied by the same factor,
 *             so the chirp keeps its shape - it is the same interval, in the
 *             musical sense - and the whole thing gets shorter. This is what a
 *             tape machine does, and it is the honest first choice.
 *   pitch     stretch the time without moving the frequencies, then add a
 *             constant number of hertz. Used when speeding up would leave a
 *             blip too short to hear: a 0.8-second inspiral played fast enough
 *             to be audible lasts a tenth of a second.
 *
 * The chosen plan is reported to the reader in full, including that a shift
 * compresses the chirp - 20 to 68 Hz is a factor of 3.4, and 150 to 198 Hz is
 * a factor of 1.3, so a shifted signal sweeps far less than the real one.
 *
 * @param {object} timeline - The signal
 * @returns {{mode: string, speed: number, shiftHz: number, lowHz: number,
 *   highHz: number, sweepFactor: number, trueSweepFactor: number}} The plan
 */
export function audioPlanFor(timeline) {
  const duration = Math.max(timeline.duration, 1e-6);
  const speed = duration / LISTEN_SECONDS;
  const f0 = timeline.fStart || timeline.frequencyAtTime(timeline.tStart) || 20;
  const f1 = timeline.fEnd || timeline.frequencyAtTime(timeline.tEnd) || f0;
  const trueSweepFactor = f1 / f0;

  const ratedLow = f0 * speed;
  const ratedHigh = f1 * speed;
  if (ratedLow >= AUDIBLE_LOW && ratedHigh <= AUDIBLE_HIGH) {
    return {
      mode: 'rate',
      speed,
      shiftHz: 0,
      lowHz: ratedLow,
      highHz: ratedHigh,
      sweepFactor: trueSweepFactor,
      trueSweepFactor,
    };
  }

  const shiftHz = Math.max(0, Math.round(AUDIBLE_LOW * 1.9 - f0));
  return {
    mode: 'pitch',
    speed,
    shiftHz,
    lowHz: f0 + shiftHz,
    highHz: Math.min(AUDIBLE_HIGH, f1 + shiftHz),
    sweepFactor: (f1 + shiftHz) / (f0 + shiftHz),
    trueSweepFactor,
  };
}
