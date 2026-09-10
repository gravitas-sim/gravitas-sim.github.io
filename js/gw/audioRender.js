// =============================================================================
// Turning a signal timeline into something audible
// -----------------------------------------------------------------------------
// Buffers are filled from the timeline's own accessors at the audio device's
// sample rate. Nothing here can see a frame, a requestAnimationFrame callback
// or a display refresh, which is the structural reason an audio buffer in this
// application cannot be a recording of an animation loop.
//
// What the mapping does to the sound
// -----------------------------------------------------------------------------
// A binary black hole chirps from 20 Hz to 68 Hz over eight tenths of a second.
// That is at the very bottom of hearing on a laptop speaker, so it has to be
// moved, and every way of moving it changes something. Two are offered and
// both are described to the student in the words below rather than hidden:
//
//   speed        play N seconds of signal per second. In 'rate' mode this is
//                exactly what a tape machine does: the pitch rises by the same
//                factor. In 'pitch' mode the frequency sweep is stretched but
//                each instantaneous frequency is left alone - which is exact
//                here, not an approximation, because the model hands over a
//                closed-form phase and the stretch is one division.
//   shift        add a constant number of hertz to the whole signal. Available
//                only where there is an analytic phase; a recording cannot be
//                shifted this way without a transform this application does
//                not carry, so for real data only 'rate' is offered.
//
// Normalisation is the other thing that has to be said out loud. Peak
// normalisation makes every signal equally loud, which is what you want when
// comparing shapes and exactly what you must not do when the question is
// whether a source twice as far away is quieter. Both are available; the
// distance step of the lesson pins the fixed one.
// =============================================================================

/** Never render more than this much audio, however the controls are set. */
export const MAX_AUDIO_SECONDS = 30;

/** Leave this much of the Nyquist frequency unused before declaring trouble. */
const NYQUIST_MARGIN = 0.9;

/** Fade length at each end, seconds. Long enough that nothing clicks. */
const FADE_SECONDS = 0.02;

/**
 * Render a window of a timeline into a mono buffer.
 *
 * @param {object} timeline - From js/gw/timeline.js
 * @param {object} opts
 * @param {number} opts.sampleRate - The audio device's rate, Hz
 * @param {number} [opts.t0] - Start of the physical window
 * @param {number} [opts.t1] - End of the physical window
 * @param {number} [opts.speed] - Physical seconds played per second of audio
 * @param {'rate'|'pitch'} [opts.mode] - What `speed` does to the pitch
 * @param {number} [opts.shiftHz] - Constant frequency shift; analytic only
 * @param {'peak'|'fixed'} [opts.normalise] - How amplitude becomes loudness
 * @param {number} [opts.referenceStrain] - For 'fixed': the strain that maps to
 *   full scale. Holding this constant is what makes a distance comparison audible
 * @param {number} [opts.gain] - Final multiplier, 0 to 1
 * @returns {{samples: Float32Array, sampleRate: number, seconds: number,
 *   mapping: object}} The buffer and an exact description of what was done
 */
export function renderAudio(timeline, opts = {}) {
  const {
    sampleRate,
    t0 = timeline.tStart,
    t1 = timeline.tEnd,
    speed = 1,
    mode = 'rate',
    shiftHz = 0,
    normalise = 'peak',
    referenceStrain = null,
    gain = 0.35,
  } = opts;

  const analytic = Boolean(timeline.hasAnalyticPhase);
  const usableMode = analytic ? mode : 'rate';
  const usableShift = analytic ? shiftHz : 0;
  const span = Math.max(0, t1 - t0);
  const wantedSeconds = span / Math.max(speed, 1e-9);
  const seconds = Math.min(wantedSeconds, MAX_AUDIO_SECONDS);
  const n = Math.max(1, Math.round(seconds * sampleRate));
  const out = new Float32Array(n);
  if (!(span > 0) || !(sampleRate > 0)) {
    return {
      samples: out,
      sampleRate,
      seconds: 0,
      mapping: { empty: true },
    };
  }

  const nyquist = sampleRate / 2;
  const ceilingHz = nyquist * NYQUIST_MARGIN;
  let highestPlayed = 0;
  let stoppedAtHz = null;
  let written = n;

  const phase0 = analytic ? timeline.phaseAtTime(t0) : 0;

  for (let i = 0; i < n; i++) {
    const s = i / sampleRate;
    const t = t0 + s * speed;
    if (t > t1) {
      written = i;
      break;
    }
    if (analytic) {
      const env = timeline.envelopeAtTime(t);
      if (!Number.isFinite(env)) continue;
      const phi = timeline.phaseAtTime(t);
      if (!Number.isFinite(phi)) continue;
      const fHere =
        (usableMode === 'pitch'
          ? timeline.frequencyAtTime(t)
          : timeline.frequencyAtTime(t) * speed) + usableShift;
      // Past the device's Nyquist frequency the buffer would not hold the
      // chirp, it would hold a descending alias of it - which sounds like the
      // opposite of what is happening. Stop, and say where.
      if (fHere > ceilingHz) {
        stoppedAtHz = fHere;
        written = i;
        break;
      }
      const carried =
        usableMode === 'pitch' ? phase0 + (phi - phase0) / speed : phi;
      const played = carried + 2 * Math.PI * usableShift * s;
      out[i] = env * Math.cos(played);
      if (fHere > highestPlayed) highestPlayed = fHere;
    } else {
      const v = timeline.strainAtTime(t);
      if (!Number.isFinite(v)) continue;
      out[i] = v;
    }
  }

  // Normalise. Peak is measured on what was actually rendered; fixed divides
  // by a strain the caller pins, so two renders at different distances come
  // out at different loudnesses, which is the entire point of that mode.
  let scale = 0;
  let peak = 0;
  for (let i = 0; i < written; i++) peak = Math.max(peak, Math.abs(out[i]));
  if (normalise === 'fixed' && referenceStrain > 0) {
    scale = 1 / referenceStrain;
  } else if (peak > 0) {
    scale = 1 / peak;
  }
  let clipped = 0;
  for (let i = 0; i < written; i++) {
    let v = out[i] * scale * gain;
    if (v > 1) {
      v = 1;
      clipped++;
    } else if (v < -1) {
      v = -1;
      clipped++;
    }
    out[i] = v;
  }

  // Fades. Without them the buffer starts and ends on a discontinuity and the
  // click is louder than the chirp.
  const fade = Math.min(
    Math.round(FADE_SECONDS * sampleRate),
    Math.floor(n / 2)
  );
  for (let i = 0; i < fade; i++) {
    const w = i / fade;
    out[i] *= w;
    out[n - 1 - i] *= w;
  }

  return {
    samples: out,
    sampleRate,
    seconds: n / sampleRate,
    mapping: {
      /** Physical seconds per second of audio. */
      speed,
      /** Which speed mode was actually used, after the analytic check. */
      mode: usableMode,
      /** Whether the caller asked for a mode this timeline cannot provide. */
      modeDowngraded: mode !== usableMode,
      shiftHz: usableShift,
      shiftAvailable: analytic,
      /** True when playback rate changed the pitch, which the interface says. */
      pitchChanged: usableMode === 'rate' && speed !== 1,
      pitchFactor: usableMode === 'rate' ? speed : 1,
      normalise:
        normalise === 'fixed' && referenceStrain > 0 ? 'fixed' : 'peak',
      referenceStrain: normalise === 'fixed' ? referenceStrain : null,
      peakStrain: peak,
      gain,
      clippedSamples: clipped,
      /** The highest frequency actually played, and whether it aliased. */
      highestPlayedHz: highestPlayed || null,
      /** Set when playback stopped because the pitch left the device's range. */
      stoppedAtHz,
      windowSeconds: span,
      truncated: wantedSeconds > MAX_AUDIO_SECONDS,
      t0,
      t1,
    },
  };
}
