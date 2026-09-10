// =============================================================================
// The sandbox's sound
// -----------------------------------------------------------------------------
// This is sonification: orbital frequency mapped to pitch and then *quantized
// onto a minor pentatonic scale* (MUSICAL_SCALE, quantizeMidi), so that an
// arbitrary collection of orbits sounds like music instead of like a siren.
// The collision and merger sounds are designed envelopes. None of it is a
// frequency the simulation computed, and nothing in the interface may describe
// it as a gravitational-wave signal.
//
// The gravitational-wave lab's audio is a different thing entirely - a buffer
// filled from a computed waveform, in js/gwAudio.js. The two share this file's
// AudioContext and nothing else, and they are mutually exclusive: while signal
// audio is playing the sandbox voices are ducked to silence and the collision
// and merger sounds do not fire, so a student never hears a designed bass drop
// underneath a chirp they are being asked to listen to.
//
// The graph
// -----------------------------------------------------------------------------
//   destination
//     outputGain      the mute and the volume. One place, both buses.
//       masterGain    the sonification voices and the event sounds
//       signalGain    the lab's waveform audio (js/gwAudio.js writes here)
// =============================================================================

import {
  bh_list,
  planets,
  stars,
  gas_giants,
  neutron_stars,
  white_dwarfs,
  gravity_ripples,
} from './physics.js';

const VOICE_CONFIGS = [
  {
    type: 'sine',
    gain: 0.09,
    filterType: 'lowpass',
    filterFreq: 1200,
    filterQ: 0.9,
  },
  {
    type: 'triangle',
    gain: 0.07,
    filterType: 'lowpass',
    filterFreq: 1000,
    filterQ: 0.8,
  },
  {
    type: 'sine',
    gain: 0.055,
    filterType: 'bandpass',
    filterFreq: 720,
    filterQ: 1.2,
  },
];
const VOICE_REFRESH_MS = 140;
const MUSICAL_SCALE = [0, 3, 5, 7, 10]; // minor pentatonic for deeper vibe
const MIN_MIDI = 38;
const MAX_MIDI = 74;
const FREQ_MAX_STEP = 28;
const GAIN_SMOOTH_FACTOR = 0.22;
const getNow = () =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

let audioCtx = null;
let masterGain = null;
let outputGain = null;
let signalGain = null;
let voices = [];
let muted = true;
let lastRippleSeen = 0;
let lastVoiceRefresh = 0;
let cachedVoiceTargets = [];
const voiceStates = [];
/** 0 to 1. Applied at outputGain, so it governs both buses. */
let volume = 0.65;
/** True while the gravitational-wave lab is playing a waveform. */
let signalActive = false;
/** The loudest voice gain at the last update, for "is anything audible". */
let voiceActivity = 0;
/** Above this a voice is doing something a listener would notice. */
const AUDIBLE_GAIN = 0.002;
/** Listeners for any change a speaker control would want to redraw for. */
const watchers = new Set();

/**
 * Recently announced mergers, so one merger makes one sound.
 *
 * A black-hole merger reaches this file twice: js/physics.js pushes an entry
 * into `gravity_ripples` and, four lines later, dispatches `gravitasMerge`.
 * Both used to call triggerBassDrop, so one merger played two overlapping bass
 * drops. Deduplicating on position and time rather than removing one of the
 * two paths, because the two paths do not cover the same set of events - a
 * gas-giant merge dispatches the event and pushes no ripple - and because it
 * keeps working if a third source is added later.
 */
const announced = [];
const ANNOUNCE_WINDOW_MS = 250;

/**
 * Whether this merger has already been heard.
 * @param {object} detail - A ripple or a merge event
 * @returns {boolean} True if a sound for it has already been made
 */
function alreadyAnnounced(detail) {
  const now = getNow();
  while (announced.length && now - announced[0].at > ANNOUNCE_WINDOW_MS) {
    announced.shift();
  }
  const x = detail?.position?.x ?? detail?.x;
  const y = detail?.position?.y ?? detail?.y;
  const hasPlace = Number.isFinite(x) && Number.isFinite(y);
  for (const a of announced) {
    if (!hasPlace || !a.hasPlace) continue;
    if (Math.abs(a.x - x) < 2 && Math.abs(a.y - y) < 2) return true;
  }
  announced.push({ at: now, x, y, hasPlace });
  return false;
}

/** Tell anyone drawing a speaker control that something changed. */
const notify = () => {
  for (const fn of watchers) {
    try {
      fn(getSonificationState());
    } catch {
      // A broken listener must not silence the simulation.
    }
  }
};

/**
 * Watch for changes to the sound's state.
 * @param {Function} fn - Called with the state
 * @returns {Function} Unsubscribe
 */
export function watchSonification(fn) {
  watchers.add(fn);
  return () => watchers.delete(fn);
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const freqToMidi = freq => 69 + 12 * Math.log2(freq / 440);
const midiToFreq = midi => 440 * Math.pow(2, (midi - 69) / 12);

const quantizeMidi = midiValue => {
  const clampedMidi = clamp(midiValue, MIN_MIDI, MAX_MIDI);
  let best = clampedMidi;
  let bestDiff = Number.POSITIVE_INFINITY;
  const lower = Math.floor(clampedMidi) - 12;
  const upper = Math.ceil(clampedMidi) + 12;
  for (let note = lower; note <= upper; note++) {
    const degree = ((note % 12) + 12) % 12;
    if (!MUSICAL_SCALE.includes(degree)) continue;
    const diff = Math.abs(note - clampedMidi);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = note;
    }
  }
  return best;
};

const quantizeFrequency = freq => {
  if (!freq || !Number.isFinite(freq)) return 0;
  const midi = freqToMidi(freq);
  const quantized = quantizeMidi(midi);
  return midiToFreq(quantized);
};

const smoothValue = (current, target, maxDelta) => {
  if (!Number.isFinite(current)) return target;
  const delta = target - current;
  if (Math.abs(delta) <= maxDelta) {
    return target;
  }
  return current + Math.sign(delta) * maxDelta;
};

const getObjectMass = obj => {
  if (!obj) return 1;
  if (typeof obj.mass === 'number') return obj.mass;
  if (typeof obj.massInSuns === 'number') return obj.massInSuns;
  if (typeof obj.massInEarths === 'number') return obj.massInEarths;
  return 1;
};

const resolveDetailMass = detail => {
  if (!detail) return 1;
  if (Array.isArray(detail.masses) && detail.masses.length) {
    return detail.masses.reduce(
      (sum, value) => sum + Math.max(value || 0, 0),
      0
    );
  }
  if (typeof detail.mergedMass === 'number') return detail.mergedMass;
  if (typeof detail.mass === 'number') return detail.mass;
  if (typeof detail.massInSuns === 'number') return detail.massInSuns;
  return 1;
};

const getMassProfile = massValue => {
  const safeMass = Math.max(massValue || 1, 1);
  const logMass = Math.log10(safeMass);
  const pitchShift = clamp(1 / (1 + logMass * 0.32), 0.35, 1.35);
  const loudness = clamp(0.35 + logMass * 0.14, 0.2, 1.8);
  return { logMass, pitchShift, loudness };
};

const hasAudioSupport = () =>
  typeof window !== 'undefined' &&
  (window.AudioContext || window.webkitAudioContext);

const ensureAudioContext = () => {
  if (!hasAudioSupport()) {
    return false;
  }

  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    outputGain = audioCtx.createGain();
    outputGain.gain.value = 0.0001;
    outputGain.connect(audioCtx.destination);
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 1;
    masterGain.connect(outputGain);
    signalGain = audioCtx.createGain();
    signalGain.gain.value = 1;
    signalGain.connect(outputGain);

    voices = VOICE_CONFIGS.map((config, idx) => {
      const osc = audioCtx.createOscillator();
      osc.type = config.type;
      osc.frequency.value = 220;
      const gain = audioCtx.createGain();
      gain.gain.value = 0;
      const filter = audioCtx.createBiquadFilter();
      filter.type = config.filterType || 'lowpass';
      filter.frequency.value = config.filterFreq || 1600;
      filter.Q.value = config.filterQ ?? 0.9;
      osc.connect(filter).connect(gain).connect(masterGain);
      osc.start();
      voiceStates[idx] = { freq: 220, gain: 0 };
      return { osc, gain, filter, config };
    });

    if (typeof document !== 'undefined') {
      // Suspend as well as resume. This only resumed, so a tab switched away
      // from kept its oscillators running and its context awake: audible from
      // another tab, and a Web Audio graph kept alive for a simulation nobody
      // was watching.
      document.addEventListener(
        'visibilitychange',
        () => {
          if (document.visibilityState === 'visible') {
            if (!muted) audioCtx.resume().catch(() => {});
          } else {
            audioCtx.suspend().catch(() => {});
          }
        },
        { passive: true }
      );
    }
  }

  return true;
};

/**
 * Everything a speaker control has to tell the reader apart.
 *
 * `enabled` is not `playing`. An AudioContext existing is not a sound: a
 * student who presses the speaker on a paused, empty sandbox has permitted
 * audio and will hear nothing, and an icon that claims otherwise is lying to
 * them. `blocked` is the browser's autoplay policy - permitted here, refused
 * there - which is a different state again and has a different remedy.
 *
 * @returns {object} The state
 */
const getSonificationState = () => {
  const supported = Boolean(hasAudioSupport());
  const contextState = audioCtx?.state ?? null;
  const permitted = !muted;
  const live = permitted && !!audioCtx && contextState === 'running';
  return {
    supported,
    muted,
    permitted,
    contextState,
    /** Permitted, but the browser has not let the context start. */
    blocked: permitted && !!audioCtx && contextState === 'suspended',
    /** Which of the two things the sound would be. */
    mode: signalActive ? 'signal' : 'sandbox',
    /** Whether anything is actually making a sound right now. */
    playing: live && (signalActive || voiceActivity > AUDIBLE_GAIN),
    volume,
    /** Kept for callers that predate the fuller state. */
    enabled: permitted && !!audioCtx && contextState !== 'closed',
  };
};

const setSonificationMuted = (nextMuted = true) => {
  const targetMuted = !!nextMuted;

  if (!targetMuted) {
    if (!ensureAudioContext()) {
      return getSonificationState();
    }
    audioCtx.resume().catch(() => {});
  }

  muted = targetMuted;
  applyOutputGain();
  notify();
  return getSonificationState();
};

/** Ramp the output to the current mute and volume. Never a step: steps click. */
function applyOutputGain() {
  if (!outputGain || !audioCtx) return;
  const now = audioCtx.currentTime;
  outputGain.gain.cancelScheduledValues(now);
  const target = muted ? 0.0001 : Math.max(0.0001, volume);
  outputGain.gain.linearRampToValueAtTime(target, now + (muted ? 0.15 : 0.4));
}

/**
 * Set the output volume, 0 to 1.
 * @param {number} next - The wanted volume
 * @returns {object} The state
 */
const setSonificationVolume = next => {
  volume = Math.min(1, Math.max(0, Number(next) || 0));
  applyOutputGain();
  notify();
  return getSonificationState();
};

/**
 * The bus the gravitational-wave lab writes into.
 *
 * Exposed rather than letting that module make its own context: two contexts
 * means two mute buttons, and one of them would be the wrong one.
 *
 * @returns {?GainNode} The bus, or null if audio has never been enabled
 */
const signalBus = () => signalGain;

/** The shared context, or null. @returns {?AudioContext} It */
const audioContext = () => audioCtx;

/**
 * Duck the sandbox while the lab plays a waveform, and un-duck afterwards.
 *
 * Also suppresses the collision and merger sounds for the duration: those are
 * designed envelopes, and hearing one over a chirp a student is being asked to
 * listen to would be actively misleading about what they were hearing.
 *
 * @param {boolean} on - Whether signal audio is playing
 * @returns {void}
 */
const setSignalAudioActive = on => {
  const next = Boolean(on);
  if (next === signalActive) return;
  signalActive = next;
  if (masterGain && audioCtx) {
    const now = audioCtx.currentTime;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.linearRampToValueAtTime(
      signalActive ? 0.0001 : 1,
      now + 0.25
    );
  }
  notify();
};

const toggleSonification = () => setSonificationMuted(!muted);

const mapOrbitersToVoices = () => {
  const candidates = [
    ...bh_list,
    ...stars,
    ...planets,
    ...gas_giants,
    ...neutron_stars,
    ...white_dwarfs,
  ].filter(obj => obj && obj.alive && obj.pos && obj.vel);

  const scored = candidates
    .map(obj => {
      const speed = Math.hypot(obj.vel.x || 0, obj.vel.y || 0);
      const radius = Math.max(5, Math.hypot(obj.pos.x || 0, obj.pos.y || 0));
      const orbitalFrequency = speed / (2 * Math.PI * radius);
      const closeness = 1 / radius;
      const massProfile = getMassProfile(getObjectMass(obj));
      const score =
        orbitalFrequency * 0.5 +
        closeness * 35 +
        Math.max(0, massProfile.logMass) * 0.08;
      const intensity = Math.min(
        1,
        speed / 55 + Math.max(0, massProfile.logMass) * 0.05 + closeness * 8
      );
      return {
        score,
        orbitalFrequency,
        intensity,
        label: obj.obj_type || obj.constructor?.name || 'Object',
        pitchShift: massProfile.pitchShift,
        loudness: massProfile.loudness,
        massFactor: massProfile.logMass,
      };
    })
    .sort((a, b) => b.score - a.score);

  const limit = voices.length || VOICE_CONFIGS.length;
  return scored.slice(0, limit);
};

const simFrequencyToHz = freq => {
  const clamped = Math.max(0.005, Math.min(freq, 2));
  const scaled = Math.log2(1 + clamped * 40);
  return 80 + scaled * 420;
};

const updateVoices = targets => {
  if (!audioCtx || !voices.length) {
    return;
  }
  const now = audioCtx.currentTime;
  let loudest = 0;

  voices.forEach((voice, idx) => {
    const target = targets[idx];
    const voiceState = voiceStates[idx] || { freq: 220, gain: 0 };
    const pitchShift = target?.pitchShift ?? 1;
    const rawFreq = target
      ? simFrequencyToHz(target.orbitalFrequency) * pitchShift
      : 0;
    const quantizedFreq = target ? quantizeFrequency(rawFreq) : voiceState.freq;
    const nextFreq = target
      ? smoothValue(
          voiceState.freq || quantizedFreq,
          quantizedFreq,
          FREQ_MAX_STEP
        )
      : smoothValue(
          voiceState.freq || quantizedFreq,
          quantizedFreq * 0.8,
          FREQ_MAX_STEP
        );
    voiceState.freq = nextFreq;
    voiceStates[idx] = voiceState;

    if (nextFreq > 0 && Number.isFinite(nextFreq)) {
      voice.osc.frequency.cancelScheduledValues(now);
      voice.osc.frequency.linearRampToValueAtTime(nextFreq, now + 0.28);
    }

    const loudnessWeight = target?.loudness ?? 1;
    const desiredGain = target
      ? Math.min(1.2, voice.config.gain * target.intensity * loudnessWeight)
      : 0;
    const smoothedGain =
      voiceState.gain + (desiredGain - voiceState.gain) * GAIN_SMOOTH_FACTOR;
    voiceState.gain = smoothedGain;

    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.linearRampToValueAtTime(
      Math.max(0.0001, smoothedGain),
      now + 0.18
    );
    if (smoothedGain > loudest) loudest = smoothedGain;
  });
  // Only the boolean matters to a speaker control, and only a change to it is
  // worth a repaint: this runs on every frame.
  const wasAudible = voiceActivity > AUDIBLE_GAIN;
  voiceActivity = loudest;
  if (wasAudible !== loudest > AUDIBLE_GAIN) notify();
};

const triggerBassDrop = detail => {
  if (!audioCtx || muted || signalActive) return;
  if (alreadyAnnounced(detail)) return;

  const massProfile = getMassProfile(resolveDetailMass(detail));
  const isKilonova = detail?.kilonova === true;
  const crescendo = isKilonova ? 2.2 : 1;
  const energyTerm = detail?.gw_strength || 0.4;
  const intensity =
    (energyTerm * 0.6 + massProfile.loudness * 0.65 || 0.5) * crescendo;
  const duration = (isKilonova ? 1.4 : 0.95) + intensity * 0.4;
  const baseFreq = quantizeFrequency(
    clamp((120 + energyTerm * 240) * massProfile.pitchShift, 40, 520)
  );
  const lowOsc = audioCtx.createOscillator();
  lowOsc.type = 'sine';
  const overtone = audioCtx.createOscillator();
  overtone.type = 'triangle';
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 420 + Math.min(900, baseFreq * 1.6);
  filter.Q.value = isKilonova ? 1.3 : 1.0;
  const gainNode = audioCtx.createGain();
  gainNode.gain.value = 0.0001;

  lowOsc.connect(filter);
  overtone.connect(filter);
  filter.connect(gainNode).connect(masterGain);

  const now = audioCtx.currentTime;
  gainNode.gain.linearRampToValueAtTime(0.28 * intensity, now + 0.05);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  lowOsc.frequency.setValueAtTime(baseFreq, now);
  lowOsc.frequency.exponentialRampToValueAtTime(
    Math.max(35, baseFreq * 0.4),
    now + duration * 0.9
  );

  overtone.frequency.setValueAtTime(baseFreq, now);
  overtone.frequency.exponentialRampToValueAtTime(
    baseFreq * 0.75,
    now + duration * 0.95
  );

  lowOsc.start(now);
  overtone.start(now);
  lowOsc.stop(now + duration + 0.2);
  overtone.stop(now + duration + 0.2);

  if (isKilonova) {
    const choir = audioCtx.createOscillator();
    choir.type = 'sawtooth';
    const choirGain = audioCtx.createGain();
    choirGain.gain.value = 0.0001;
    choir.connect(choirGain).connect(masterGain);
    choir.frequency.setValueAtTime(baseFreq * 1.8, now);
    choirGain.gain.linearRampToValueAtTime(0.18 * crescendo, now + 0.35);
    choirGain.gain.exponentialRampToValueAtTime(0.0001, now + duration + 0.7);
    choir.start(now);
    choir.stop(now + duration + 0.9);

    const noise = audioCtx.createBufferSource();
    const noiseFrames = Math.max(
      1,
      Math.ceil(audioCtx.sampleRate * (duration + 1))
    );
    const noiseBuffer = audioCtx.createBuffer(
      1,
      noiseFrames,
      audioCtx.sampleRate
    );
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const fade = 1 - i / data.length;
      data[i] = (Math.random() * 2 - 1) * fade;
    }
    noise.buffer = noiseBuffer;
    const noiseGain = audioCtx.createGain();
    noiseGain.gain.value = 0.0001;
    noise.connect(noiseGain).connect(masterGain);
    noiseGain.gain.linearRampToValueAtTime(0.1 * crescendo, now + 0.45);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + duration + 0.9);
    noise.start(now);
    noise.stop(now + duration + 1.1);
  }
};

const triggerCollisionChime = detail => {
  if (!audioCtx || muted || signalActive) return;

  const relativeSpeed = Math.max(detail?.relativeSpeed || 4, 2);
  const massProfile = getMassProfile(resolveDetailMass(detail));
  const baseFreq = quantizeFrequency(
    clamp((230 + relativeSpeed * 16) * massProfile.pitchShift, 80, 900)
  );
  const shimmerFreq = baseFreq * (1.2 + 0.2 * (1 - massProfile.pitchShift));

  const osc = audioCtx.createOscillator();
  osc.type = 'sine';
  const shimmer = audioCtx.createOscillator();
  shimmer.type = 'triangle';
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 280;
  filter.Q.value = 0.8;
  const gainNode = audioCtx.createGain();
  gainNode.gain.value = 0.0001;

  osc.connect(filter);
  shimmer.connect(filter);
  filter.connect(gainNode).connect(masterGain);

  const now = audioCtx.currentTime;
  gainNode.gain.linearRampToValueAtTime(
    0.12 * massProfile.loudness + 0.05,
    now + 0.025
  );
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

  osc.frequency.setValueAtTime(baseFreq, now);
  osc.frequency.linearRampToValueAtTime(baseFreq * 1.05, now + 0.24);

  shimmer.frequency.setValueAtTime(shimmerFreq, now);
  shimmer.frequency.linearRampToValueAtTime(shimmerFreq * 0.85, now + 0.24);

  filter.frequency.linearRampToValueAtTime(1600, now + 0.22);

  osc.start(now);
  shimmer.start(now);
  osc.stop(now + 0.65);
  shimmer.stop(now + 0.65);
};

const processGravityRipples = () => {
  if (!gravity_ripples?.length) return;
  const newRipples = gravity_ripples.filter(r => {
    const created = typeof r.created === 'number' ? r.created : getNow();
    return created > lastRippleSeen;
  });
  if (!newRipples.length) return;

  newRipples.forEach(r => triggerBassDrop(r));
  const newest = Math.max(
    lastRippleSeen,
    ...newRipples.map(r =>
      typeof r.created === 'number' ? r.created : getNow()
    )
  );
  lastRippleSeen = newest;
};

const updateSonification = (timestamp = getNow()) => {
  if (!audioCtx || !voices.length) {
    return;
  }
  if (signalActive) {
    voiceActivity = 0;
    return;
  }

  if (timestamp - lastVoiceRefresh > VOICE_REFRESH_MS) {
    cachedVoiceTargets = mapOrbitersToVoices();
    lastVoiceRefresh = timestamp;
  }

  updateVoices(cachedVoiceTargets);
  processGravityRipples();
};

if (typeof window !== 'undefined') {
  window.addEventListener('gravitasMerge', e => {
    if (!muted) {
      triggerBassDrop(e.detail);
    }
  });
  window.addEventListener('gravitasCollision', e => {
    if (!muted) {
      triggerCollisionChime(e.detail);
    }
  });
}

export {
  updateSonification,
  toggleSonification,
  setSonificationMuted,
  setSonificationVolume,
  getSonificationState,
  ensureAudioContext,
  signalBus,
  audioContext,
  setSignalAudioActive,
};
