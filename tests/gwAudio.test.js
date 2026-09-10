// =============================================================================
// Audio comes from the signal, not from the screen
// -----------------------------------------------------------------------------
// The claim being defended is architectural: a buffer is filled by evaluating
// the timeline at the audio device's rate, so its content cannot depend on a
// frame rate, a refresh, or whether a tab was visible. The tests below check
// that, and check that every way the sound is manipulated for audibility is
// reported honestly in the mapping the interface prints.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { modelTimeline, sampledTimeline } from '../js/gw/timeline.js';
import { renderAudio, MAX_AUDIO_SECONDS } from '../js/gw/audioRender.js';

const BBH = { m1: 36, m2: 29, distanceMpc: 410, inclinationDeg: 0, fStart: 20 };
const BNS = {
  m1: 1.4,
  m2: 1.4,
  distanceMpc: 40,
  inclinationDeg: 0,
  fStart: 20,
};

/** Instantaneous frequency of a buffer region, from zero crossings. */
function zeroCrossingHz(buf, from, to, rate) {
  let crossings = 0;
  for (let i = from + 1; i < to; i++) {
    if (buf[i - 1] < 0 !== buf[i] < 0) crossings++;
  }
  return (crossings * rate) / (2 * (to - from));
}

describe('the buffer is independent of any frame rate', () => {
  test('the same window at the same rate gives byte-identical samples', () => {
    const tl = modelTimeline(BBH);
    const a = renderAudio(tl, { sampleRate: 48000 });
    const b = renderAudio(tl, { sampleRate: 48000 });
    expect(Array.from(a.samples)).toEqual(Array.from(b.samples));
  });

  test('two device rates agree on the sound, sample for sample in time', () => {
    // Not on the arrays - those are different lengths - but on the waveform
    // they represent. If anything in here were driven by a tick rather than by
    // time, these would diverge.
    const tl = modelTimeline(BBH);
    const a = renderAudio(tl, {
      sampleRate: 44100,
      normalise: 'fixed',
      referenceStrain: 1e-21,
    });
    const b = renderAudio(tl, {
      sampleRate: 48000,
      normalise: 'fixed',
      referenceStrain: 1e-21,
    });
    expect(Math.abs(a.seconds - b.seconds)).toBeLessThan(0.001);
    for (let frac = 0.2; frac < 0.8; frac += 0.1) {
      const av = a.samples[Math.round(frac * a.samples.length)];
      const bv = b.samples[Math.round(frac * b.samples.length)];
      expect(Math.abs(av - bv)).toBeLessThan(0.05);
    }
  });

  test('the number of samples is the duration times the rate', () => {
    const tl = modelTimeline(BBH);
    const r = renderAudio(tl, { sampleRate: 22050 });
    expect(r.samples.length).toBe(Math.round(r.seconds * 22050));
  });
});

describe('the speed mapping does what the interface says it does', () => {
  test('rate mode multiplies the pitch by the speed', () => {
    const tl = modelTimeline(BBH);
    const r = renderAudio(tl, { sampleRate: 48000, speed: 4, mode: 'rate' });
    expect(r.mapping.pitchChanged).toBe(true);
    expect(r.mapping.pitchFactor).toBe(4);
    // 20 Hz at the start becomes 80.
    const f = zeroCrossingHz(r.samples, 200, 4000, 48000);
    expect(f).toBeGreaterThan(65);
    expect(f).toBeLessThan(95);
  });

  test('pitch mode leaves the frequencies where they were', () => {
    const tl = modelTimeline(BBH);
    const r = renderAudio(tl, {
      sampleRate: 48000,
      speed: 0.25,
      mode: 'pitch',
    });
    expect(r.mapping.pitchChanged).toBe(false);
    const f = zeroCrossingHz(r.samples, 2000, 12000, 48000);
    expect(f).toBeGreaterThan(17);
    expect(f).toBeLessThan(24);
  });

  test('pitch mode still changes the duration by the speed', () => {
    const tl = modelTimeline(BBH);
    const fast = renderAudio(tl, {
      sampleRate: 48000,
      speed: 1,
      mode: 'pitch',
    });
    const slow = renderAudio(tl, {
      sampleRate: 48000,
      speed: 0.25,
      mode: 'pitch',
    });
    expect(slow.seconds / fast.seconds).toBeCloseTo(4, 1);
  });

  test('a recording cannot be pitch-preserved, and says so instead of pretending', () => {
    const samples = Float32Array.from({ length: 4096 }, (_, i) =>
      Math.sin(i / 4)
    );
    const tl = sampledTimeline({ samples, sampleRate: 4096, t0: 0 });
    const r = renderAudio(tl, { sampleRate: 48000, speed: 2, mode: 'pitch' });
    expect(r.mapping.mode).toBe('rate');
    expect(r.mapping.modeDowngraded).toBe(true);
    expect(r.mapping.pitchChanged).toBe(true);
  });

  test('a frequency shift moves the whole signal up by that many hertz', () => {
    const tl = modelTimeline(BBH);
    const plain = renderAudio(tl, {
      sampleRate: 48000,
      speed: 1,
      mode: 'pitch',
    });
    const shifted = renderAudio(tl, {
      sampleRate: 48000,
      speed: 1,
      mode: 'pitch',
      shiftHz: 300,
    });
    const f0 = zeroCrossingHz(plain.samples, 500, 6000, 48000);
    const f1 = zeroCrossingHz(shifted.samples, 500, 6000, 48000);
    expect(f1 - f0).toBeGreaterThan(250);
    expect(f1 - f0).toBeLessThan(350);
  });

  test('a recording is not offered a frequency shift', () => {
    const samples = Float32Array.from({ length: 1024 }, (_, i) =>
      Math.sin(i / 4)
    );
    const tl = sampledTimeline({ samples, sampleRate: 1024, t0: 0 });
    const r = renderAudio(tl, { sampleRate: 48000, shiftHz: 400 });
    expect(r.mapping.shiftHz).toBe(0);
    expect(r.mapping.shiftAvailable).toBe(false);
  });
});

describe('normalisation is stated, and fixed gain preserves the physics', () => {
  test('peak normalisation makes two distances equally loud', () => {
    const near = renderAudio(modelTimeline({ ...BBH, distanceMpc: 400 }), {
      sampleRate: 48000,
    });
    const far = renderAudio(modelTimeline({ ...BBH, distanceMpc: 1600 }), {
      sampleRate: 48000,
    });
    const peak = b => b.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
    expect(peak(near.samples)).toBeCloseTo(peak(far.samples), 3);
    expect(near.mapping.normalise).toBe('peak');
  });

  test('fixed gain makes twice the distance exactly half as loud', () => {
    const opts = {
      sampleRate: 48000,
      normalise: 'fixed',
      referenceStrain: 2e-21,
    };
    const near = renderAudio(modelTimeline({ ...BBH, distanceMpc: 400 }), opts);
    const far = renderAudio(modelTimeline({ ...BBH, distanceMpc: 800 }), opts);
    const peak = b => b.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
    expect(peak(near.samples) / peak(far.samples)).toBeCloseTo(2, 2);
    expect(near.mapping.normalise).toBe('fixed');
    expect(near.mapping.referenceStrain).toBe(2e-21);
  });

  test('falls back to peak when a fixed reference was not supplied', () => {
    const r = renderAudio(modelTimeline(BBH), {
      sampleRate: 48000,
      normalise: 'fixed',
    });
    expect(r.mapping.normalise).toBe('peak');
  });

  test('never leaves a sample outside the representable range', () => {
    const r = renderAudio(modelTimeline(BBH), {
      sampleRate: 48000,
      normalise: 'fixed',
      referenceStrain: 1e-24,
      gain: 1,
    });
    for (const v of r.samples) expect(Math.abs(v)).toBeLessThanOrEqual(1);
    expect(r.mapping.clippedSamples).toBeGreaterThan(0);
  });

  test('reports the peak strain it saw, in strain', () => {
    const tl = modelTimeline(BBH);
    const r = renderAudio(tl, { sampleRate: 48000 });
    // Close to the envelope's own peak but under it: the largest *sample* is
    // wherever the last crest happened to fall, not the crest itself. Reported
    // as measured rather than as the envelope, because the interface prints it
    // beside a plot of the same samples.
    expect(r.mapping.peakStrain).toBeLessThanOrEqual(tl.meta.peakStrain);
    expect(r.mapping.peakStrain / tl.meta.peakStrain).toBeGreaterThan(0.9);
  });
});

describe('bounds', () => {
  test('a 158 second inspiral is not rendered as 158 seconds of audio', () => {
    const tl = modelTimeline(BNS);
    const r = renderAudio(tl, { sampleRate: 48000, speed: 1 });
    expect(r.seconds).toBeLessThanOrEqual(MAX_AUDIO_SECONDS + 0.01);
    expect(r.mapping.truncated).toBe(true);
  });

  test('playback stops rather than aliasing when the pitch leaves the range', () => {
    const tl = modelTimeline(BNS);
    const r = renderAudio(tl, { sampleRate: 48000, speed: 20, mode: 'rate' });
    expect(r.mapping.stoppedAtHz).toBeGreaterThan(20000);
    expect(r.mapping.highestPlayedHz).toBeLessThan(24000);
  });

  test('pitch-preserving playback of the same window never needs to stop', () => {
    const tl = modelTimeline(BNS);
    const r = renderAudio(tl, { sampleRate: 48000, speed: 20, mode: 'pitch' });
    expect(r.mapping.stoppedAtHz).toBe(null);
  });

  test('an empty window produces an empty buffer, not an exception', () => {
    const tl = modelTimeline(BBH);
    const r = renderAudio(tl, {
      sampleRate: 48000,
      t0: tl.tStart,
      t1: tl.tStart,
    });
    expect(r.seconds).toBe(0);
    expect(r.mapping.empty).toBe(true);
  });

  test('the buffer fades in and out, so nothing clicks', () => {
    const r = renderAudio(modelTimeline(BBH), { sampleRate: 48000 });
    expect(Math.abs(r.samples[0])).toBeLessThan(1e-6);
    expect(Math.abs(r.samples[r.samples.length - 1])).toBeLessThan(1e-6);
  });

  test('every sample is a finite number', () => {
    const r = renderAudio(modelTimeline(BNS), {
      sampleRate: 44100,
      speed: 8,
      mode: 'pitch',
    });
    for (const v of r.samples) expect(Number.isFinite(v)).toBe(true);
  });
});

describe('the mapping is a complete description of what was heard', () => {
  test('records the window, the speed, the mode and the shift', () => {
    const tl = modelTimeline(BBH);
    const r = renderAudio(tl, {
      sampleRate: 48000,
      speed: 0.5,
      mode: 'pitch',
      shiftHz: 250,
      t0: tl.tStart,
      t1: tl.tEnd,
    });
    expect(r.mapping.speed).toBe(0.5);
    expect(r.mapping.mode).toBe('pitch');
    expect(r.mapping.shiftHz).toBe(250);
    expect(r.mapping.t0).toBeCloseTo(tl.tStart, 12);
    expect(r.mapping.t1).toBeCloseTo(tl.tEnd, 12);
    expect(r.mapping.windowSeconds).toBeCloseTo(tl.duration, 12);
  });
});
