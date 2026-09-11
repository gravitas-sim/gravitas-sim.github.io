// =============================================================================
// Playing a gravitational-wave signal
// -----------------------------------------------------------------------------
// This is not the sandbox's sound. js/audio.js maps orbital frequency to pitch
// and quantizes it onto a minor pentatonic scale, which is a designed thing and
// says so. What plays here is the waveform itself: a buffer filled by
// evaluating the same timeline the strain plot is drawn from, at the audio
// device's sample rate, with no scale, no quantization and no musical choices
// of any kind. The only things done to it are the ones a laptop speaker forces
// - a chirp that ends at 68 Hz is inaudible on one - and each of those is
// reported back so the interface can say what was done.
//
// The two are mutually exclusive. Starting a signal ducks the sandbox voices to
// silence and suppresses the collision and merger sounds, so a designed bass
// drop never plays underneath a chirp somebody is being asked to listen to.
//
// Nothing here starts without a gesture. The AudioContext is created by
// js/audio.js only when the reader enables sound, and this module refuses
// rather than creating one of its own.
// =============================================================================

import {
  audioContext,
  signalBus,
  ensureAudioContext,
  getSonificationState,
  setSignalAudioActive,
} from './audio.js';
import { renderAudio } from './gw/audioRender.js';
import { setSignalAudio } from './widgetRuntime.js';

/** The one thing playing, if anything is. */
let source = null;
/** A description of what was done to the last thing played. */
let mapping = null;
/** What is playing, for the speaker control to name. */
let nowPlaying = null;
/** Listeners for a change worth redrawing a control for. */
const watchers = new Set();

/** A conservative default. The chirp is short and the reader did not ask to be startled. */
export const DEFAULT_GAIN = 0.3;

const notify = () => {
  const current = state();
  for (const fn of watchers) {
    try {
      fn(current);
    } catch {
      // A broken listener must not stop the sound.
    }
  }
  // And on the window, so that the speaker control can follow what is playing
  // without importing this module. An import at start-up would fetch the chunk
  // at start-up, which is exactly what deferring it was for.
  if (
    typeof window !== 'undefined' &&
    typeof window.CustomEvent === 'function'
  ) {
    window.dispatchEvent(
      new window.CustomEvent('gravitasSignalAudio', { detail: current })
    );
  }
};

/**
 * Watch for a change in what is playing.
 * @param {Function} fn - Called with the state
 * @returns {Function} Unsubscribe
 */
export function watchSignalAudio(fn) {
  watchers.add(fn);
  return () => watchers.delete(fn);
}

/**
 * What is playing, and what was done to it to make it audible.
 * @returns {{playing: boolean, nowPlaying: ?object, mapping: ?object}} The state
 */
export function state() {
  return { playing: Boolean(source), nowPlaying, mapping };
}

/** @returns {boolean} Whether a signal is playing right now */
export const isPlaying = () => Boolean(source);

/** @returns {?object} What was done to the last buffer played */
export const currentMapping = () => mapping;

/**
 * Stop whatever is playing.
 *
 * Idempotent, and safe to call from a visibility change, a lesson exit, a
 * parameter change or a mute. The node is disconnected as well as stopped: a
 * BufferSource cannot be restarted, so keeping one is keeping a leak.
 *
 * @returns {void}
 */
export function stop() {
  if (source) {
    try {
      source.onended = null;
      source.stop();
    } catch {
      // Already stopped, or never started.
    }
    try {
      source.disconnect();
    } catch {
      // Already disconnected.
    }
    source = null;
  }
  nowPlaying = null;
  setSignalAudioActive(false);
  notify();
}

/**
 * Play a window of a timeline.
 *
 * Refuses rather than asking for permission: enabling sound is a decision the
 * reader makes at the speaker control, and a lesson step that starts a sound
 * on its own would be exactly the thing the browsers' autoplay policies exist
 * to prevent. The refusal carries a reason so the interface can say which.
 *
 * @param {object} timeline - From js/gw/timeline.js
 * @param {object} [opts] - Passed to renderAudio, plus `label`
 * @returns {{ok: boolean, reason?: string, mapping?: object}} What happened
 */
export function play(timeline, opts = {}) {
  const sound = getSonificationState();
  if (!sound.supported) return { ok: false, reason: 'unsupported' };
  if (sound.muted) return { ok: false, reason: 'muted' };
  if (!ensureAudioContext()) return { ok: false, reason: 'unsupported' };

  const ctx = audioContext();
  const bus = signalBus();
  if (!ctx || !bus) return { ok: false, reason: 'unsupported' };
  // A context the browser has not allowed to start. Resuming is worth trying -
  // this call is on the stack of a click - but it is asynchronous, so the
  // caller is told rather than left with silence and a playing icon.
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  stop();

  const rendered = renderAudio(timeline, {
    gain: DEFAULT_GAIN,
    ...opts,
    sampleRate: ctx.sampleRate,
  });
  if (!rendered.samples.length) return { ok: false, reason: 'empty' };

  const buffer = ctx.createBuffer(1, rendered.samples.length, ctx.sampleRate);
  buffer.copyToChannel
    ? buffer.copyToChannel(rendered.samples, 0)
    : buffer.getChannelData(0).set(rendered.samples);

  source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(bus);
  source.onended = () => {
    // Only if this is still the current one: a new play() replaces it, and the
    // old node's ended event must not turn the new one off.
    if (source && source.buffer === buffer) stop();
  };

  mapping = rendered.mapping;
  nowPlaying = {
    kind: timeline.kind,
    id: timeline.id,
    label: opts.label || null,
    // Who this playback belongs to. A sound describes one configuration of one
    // instrument, so when that configuration changes the sound is out of date
    // and has to go: the owner is what lets the caller notice without keeping
    // a second copy of the state here.
    owner: opts.owner || null,
    seconds: rendered.seconds,
    detector: timeline.meta?.detector || null,
    role: timeline.meta?.role || null,
  };
  setSignalAudioActive(true);
  source.start();
  notify();
  return { ok: true, mapping };
}

/** @returns {?string} What the current playback belongs to */
export const currentOwner = () => (source ? nowPlaying?.owner || null : null);

/**
 * Stop, but only if the playback belongs to `owner`.
 *
 * The lab uses this on every repaint: a sound started for one distance is
 * wrong the moment the distance changes, and stopping unconditionally would
 * also silence a different instrument that happened to be playing.
 *
 * @param {string} owner - The token given to play()
 * @returns {boolean} Whether anything was stopped
 */
export function stopIfOwner(owner) {
  if (!source || !owner || nowPlaying?.owner !== owner) return false;
  stop();
  return true;
}

/**
 * Stop anything whose owner begins with `prefix`.
 *
 * The scope end: a lesson closing releases everything its instruments started,
 * without needing to know which of them was sounding.
 *
 * @param {string} prefix - An owner prefix, such as 'gw-lab:'
 * @returns {boolean} Whether anything was stopped
 */
export function stopIfOwnerStartsWith(prefix) {
  const owner = currentOwner();
  if (!owner || !prefix || !owner.startsWith(prefix)) return false;
  stop();
  return true;
}

// The one way in from the rest of the application, and deliberately the only
// one: the speaker control's stop button, the lesson panel leaving a step or
// closing, and a scenario rebuild all arrive here. None of them can import this
// module - doing so would fetch the waveform model on every page load - and one
// listener registered once at module load is what keeps that from becoming a
// listener per lesson, per step, per rebuild.
//
// `detail.scope` narrows it to playback whose owner begins with that string, so
// the lesson panel can release what a lesson started without silencing
// something a reader started somewhere else. No scope means stop everything.
if (typeof window !== 'undefined') {
  window.addEventListener('gravitasStopSignalAudio', event => {
    const scope = event?.detail?.scope;
    if (scope) stopIfOwnerStartsWith(scope);
    else stop();
  });
}

// Stop on a hidden tab. js/audio.js suspends the context, which pauses the
// buffer mid-flight rather than ending it; a signal that resumes three minutes
// later halfway through a chirp is worse than one that stopped.
if (typeof document !== 'undefined') {
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.visibilityState !== 'visible' && source) stop();
    },
    { passive: true }
  );
}

// The lab's Listen button calls js/widgetRuntime.js rather than importing this
// module, because importing this module means importing js/audio.js and then
// js/physics.js, and the authoring CLI reads that widget in a process with no
// DOM. Installing the implementation here is what connects the two.
setSignalAudio({
  play,
  stop,
  isPlaying,
  currentMapping,
  currentOwner,
  stopIfOwner,
  stopIfOwnerStartsWith,
});
