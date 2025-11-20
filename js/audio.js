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
let voices = [];
let muted = true;
let lastRippleSeen = 0;
let lastVoiceRefresh = 0;
let cachedVoiceTargets = [];
const voiceStates = [];

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
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.0001;
    masterGain.connect(audioCtx.destination);

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
      document.addEventListener(
        'visibilitychange',
        () => {
          if (document.visibilityState === 'visible' && !muted) {
            audioCtx.resume().catch(() => {});
          }
        },
        { passive: true }
      );
    }
  }

  return true;
};

const getSonificationState = () => ({
  muted,
  supported: hasAudioSupport(),
  enabled: !muted && !!audioCtx && audioCtx.state !== 'closed',
  contextState: audioCtx?.state ?? 'suspended',
});

const setSonificationMuted = (nextMuted = true) => {
  const targetMuted = !!nextMuted;

  if (!targetMuted) {
    if (!ensureAudioContext()) {
      return getSonificationState();
    }
    audioCtx.resume().catch(() => {});
  }

  muted = targetMuted;

  if (masterGain && audioCtx) {
    const now = audioCtx.currentTime;
    masterGain.gain.cancelScheduledValues(now);
    const targetGain = muted ? 0.0001 : 0.65;
    masterGain.gain.linearRampToValueAtTime(
      targetGain,
      now + (muted ? 0.15 : 0.4)
    );
  }

  return getSonificationState();
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
  });
};

const triggerBassDrop = detail => {
  if (!audioCtx || muted) return;

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
  if (!audioCtx || muted) return;

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
  getSonificationState,
  ensureAudioContext,
};
