// =============================================================================
// One clock, two rates
// -----------------------------------------------------------------------------
// The gravitational-wave lab has a playhead the reader can drag, and a Listen
// button. They ran on unrelated clocks: the playhead sat wherever it was left,
// and Listen rendered a buffer covering the whole signal and started it from
// sample zero. Press Listen with the playhead two thirds of the way through a
// chirp and you heard the chirp from the beginning, which is not what the
// screen was showing and not what the step asked the reader to hear.
//
// What synchronisation can honestly mean here
// -----------------------------------------------------------------------------
// Not a shared rate. The visual playhead advances at the preset's own
// playbackSpeed, chosen so a reader can watch an inspiral; the audio compresses
// the whole signal into a few seconds, because a chirp played at the visual
// rate is inaudible and a chirp stretched to the visual duration is a hum. The
// two are meant to run at different rates and the readout says which.
//
// So the relationship is about the *origin*, not the tempo: the sound starts at
// the signal time the playhead is on, and every operation that moves the
// playhead moves the origin with it. That is the claim these functions make and
// the only one the tests assert.
//
// Nothing here claims sample-accurate alignment, because a browser does not
// offer it. `AudioContext.baseLatency` and `outputLatency` are typically five to
// fifty milliseconds and are not knowable in advance on every engine, and the
// visual side is driven by requestAnimationFrame at about sixteen milliseconds
// of granularity. ALIGNMENT_TOLERANCE_S below is built from those two numbers
// rather than chosen to make a test pass.
// =============================================================================

/**
 * How far apart the two clocks may be and still be called aligned, in seconds
 * of audio.
 *
 * One animation frame at 60 Hz (16.7 ms) plus a generous allowance for output
 * latency (50 ms), rounded up. A disagreement larger than this is a transport
 * bug; a disagreement smaller than this is the platform.
 */
export const ALIGNMENT_TOLERANCE_S = 0.07;

/**
 * Where in the signal a buffer rendered from `t0` is, `elapsed` seconds in.
 *
 * The inverse of what js/gw/audioRender.js does: it fills sample i with the
 * signal at t0 + (i / sampleRate) * speed.
 *
 * @param {number} t0 - Signal time the buffer starts at
 * @param {number} elapsedAudioS - Seconds of audio played
 * @param {number} speed - Physical seconds per second of audio
 * @returns {number} Signal time
 */
export function signalTimeAt(t0, elapsedAudioS, speed) {
  if (!Number.isFinite(t0) || !Number.isFinite(elapsedAudioS)) return NaN;
  const rate = Number.isFinite(speed) && speed > 0 ? speed : 1;
  return t0 + elapsedAudioS * rate;
}

/**
 * How far into a buffer rendered from `t0` the signal time `t` sits.
 *
 * Negative when `t` is before the buffer starts, which is a caller error rather
 * than something to clamp away silently.
 *
 * @param {number} t0 - Signal time the buffer starts at
 * @param {number} t - Signal time wanted
 * @param {number} speed - Physical seconds per second of audio
 * @returns {number} Seconds of audio
 */
export function audioOffsetFor(t0, t, speed) {
  if (!Number.isFinite(t0) || !Number.isFinite(t)) return NaN;
  const rate = Number.isFinite(speed) && speed > 0 ? speed : 1;
  return (t - t0) / rate;
}

/**
 * The plan for playing from wherever the playhead is.
 *
 * The speed comes from the whole timeline and not from the remaining span, on
 * purpose: speed sets the pitch, and a signal that sounded different depending
 * on where the reader happened to have left the playhead would destroy the
 * comparison the lab is built around - two distances have to be comparable by
 * ear. So moving the playhead changes where the sound starts and how long it
 * lasts, and not what it sounds like.
 *
 * @param {object} timeline - From js/gw/timeline.js
 * @param {number} cursorT - Where the playhead is, in signal time
 * @param {object} plan - From audioPlanFor(): {speed, mode, shiftHz, ...}
 * @returns {{t0: number, seconds: number, atEnd: boolean}} Where to start,
 *   how long it will last in audio seconds, and whether there is nothing left
 */
export function playFromCursor(timeline, cursorT, plan = {}) {
  const tStart = Number.isFinite(timeline?.tStart) ? timeline.tStart : 0;
  const tEnd = Number.isFinite(timeline?.tEnd) ? timeline.tEnd : tStart;
  const speed = Number.isFinite(plan.speed) && plan.speed > 0 ? plan.speed : 1;
  // A playhead outside the span is a playhead at the nearest end of it.
  const t0 = Math.min(
    Math.max(Number.isFinite(cursorT) ? cursorT : tStart, tStart),
    tEnd
  );
  const remaining = Math.max(0, tEnd - t0);
  return {
    t0,
    seconds: remaining / speed,
    // Sitting exactly on the end: there is no sound to make, and the caller
    // should restart rather than render an empty buffer.
    atEnd: remaining <= 0,
  };
}

/**
 * Whether an audio position and a playhead agree, within the platform's slop.
 *
 * @param {number} expectedT - Signal time the audio should be at
 * @param {number} actualT - Signal time it is at
 * @param {number} speed - Physical seconds per second of audio
 * @returns {boolean} True when the difference is under one frame plus latency
 */
export function aligned(expectedT, actualT, speed) {
  if (!Number.isFinite(expectedT) || !Number.isFinite(actualT)) return false;
  const rate = Number.isFinite(speed) && speed > 0 ? speed : 1;
  // Compared in audio seconds, because the tolerance is a statement about the
  // audio clock and the frame rate rather than about the signal.
  return Math.abs(expectedT - actualT) / rate <= ALIGNMENT_TOLERANCE_S;
}
