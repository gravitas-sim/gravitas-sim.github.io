// =============================================================================
// One timeline drives everything
// -----------------------------------------------------------------------------
// The property under test is not "the numbers are right" - js/gw/waveform.js
// is where that is checked. It is that there is exactly one source of truth for
// a signal, that everything derived from it agrees with everything else derived
// from it, and that asking for a hundred and fifty seconds of neutron-star
// inspiral does not allocate a hundred and fifty seconds of neutron-star
// inspiral.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { modelTimeline, sampledTimeline } from '../js/gw/timeline.js';
import {
  chirpMass,
  iscoFrequency,
  timeToCoalescence,
  strainAmplitude,
} from '../js/gw/waveform.js';

const BBH = { m1: 36, m2: 29, distanceMpc: 410, inclinationDeg: 0, fStart: 20 };
const BNS = {
  m1: 1.4,
  m2: 1.4,
  distanceMpc: 40,
  inclinationDeg: 0,
  fStart: 20,
};

describe('a model timeline spans exactly what it says it does', () => {
  test('starts at the requested frequency and ends at ISCO', () => {
    const tl = modelTimeline(BBH);
    expect(tl.frequencyAtTime(tl.tStart)).toBeCloseTo(20, 6);
    expect(tl.frequencyAtTime(tl.tEnd)).toBeCloseTo(iscoFrequency(65), 4);
    expect(tl.fEnd).toBeCloseTo(iscoFrequency(65), 6);
  });

  test('ends before coalescence, and the gap is the merger it does not model', () => {
    const tl = modelTimeline(BBH);
    expect(tl.tEnd).toBeLessThan(0);
    expect(tl.tEnd).toBeCloseTo(
      -timeToCoalescence(iscoFrequency(65), chirpMass(36, 29)),
      9
    );
  });

  test('returns NaN outside its own span rather than extrapolating', () => {
    const tl = modelTimeline(BBH);
    expect(Number.isNaN(tl.strainAtTime(tl.tStart - 0.001))).toBe(true);
    expect(Number.isNaN(tl.strainAtTime(tl.tEnd + 0.001))).toBe(true);
    expect(Number.isNaN(tl.strainAtTime(0))).toBe(true);
    expect(Number.isNaN(tl.frequencyAtTime(-1e-9))).toBe(true);
  });

  test('never produces a frequency above ISCO anywhere inside its span', () => {
    const tl = modelTimeline(BBH);
    const isco = iscoFrequency(65);
    for (let i = 0; i <= 500; i++) {
      const t = tl.tStart + (tl.duration * i) / 500;
      const f = tl.frequencyAtTime(t);
      expect(f).toBeLessThanOrEqual(isco * (1 + 1e-9));
    }
  });

  test('a start frequency above ISCO is clamped, not thrown', () => {
    const tl = modelTimeline({ ...BBH, fStart: 5000 });
    expect(Number.isFinite(tl.duration)).toBe(true);
    expect(tl.duration).toBeGreaterThanOrEqual(0);
    expect(tl.fStart).toBeLessThan(tl.fEnd);
  });
});

describe('the derived views all come from the same numbers', () => {
  const tl = modelTimeline(BBH);

  test('detector strain is the plus polarization, exactly', () => {
    for (let i = 1; i < 20; i++) {
      const t = tl.tStart + (tl.duration * i) / 20;
      expect(tl.strainAtTime(t)).toBe(tl.plusAtTime(t));
    }
  });

  test('strain is the envelope times the cosine of the phase', () => {
    for (let i = 1; i < 20; i++) {
      const t = tl.tStart + (tl.duration * i) / 20;
      const rebuilt = tl.envelopeAtTime(t) * Math.cos(tl.phaseAtTime(t));
      expect(tl.strainAtTime(t)).toBeCloseTo(rebuilt, 30);
    }
  });

  test('the envelope never falls below the strain it bounds', () => {
    for (let i = 0; i <= 200; i++) {
      const t = tl.tStart + (tl.duration * i) / 200;
      expect(Math.abs(tl.strainAtTime(t))).toBeLessThanOrEqual(
        tl.envelopeAtTime(t) * (1 + 1e-12)
      );
    }
  });

  test('the orbital phase is half the wave phase', () => {
    const t = tl.tStart + tl.duration / 3;
    expect(tl.orbitalPhaseAtTime(t)).toBeCloseTo(tl.phaseAtTime(t) / 2, 12);
  });

  test('the schematic separation shrinks monotonically', () => {
    let last = Infinity;
    for (let i = 0; i <= 100; i++) {
      const s = tl.separationAtTime(tl.tStart + (tl.duration * i) / 100);
      expect(s).toBeLessThan(last);
      last = s;
    }
  });

  test('the separation reaches three Schwarzschild radii at the end', () => {
    expect(tl.separationRsAtTime(tl.tEnd)).toBeCloseTo(3, 6);
  });

  test('inclination scales every strain sample by the same factor', () => {
    const faceOn = modelTimeline({ ...BBH, inclinationDeg: 0 });
    const edgeOn = modelTimeline({ ...BBH, inclinationDeg: 90 });
    for (let i = 1; i < 10; i++) {
      const t = faceOn.tStart + (faceOn.duration * i) / 10;
      expect(edgeOn.strainAtTime(t) / faceOn.strainAtTime(t)).toBeCloseTo(
        0.5,
        9
      );
    }
    // And the cross polarization vanishes, which is the physical content.
    expect(Math.abs(edgeOn.crossAtTime(faceOn.tStart + 0.1))).toBeLessThan(
      1e-30
    );
  });

  test('distance scales every strain sample and nothing else', () => {
    const near = modelTimeline({ ...BBH, distanceMpc: 400 });
    const far = modelTimeline({ ...BBH, distanceMpc: 1200 });
    expect(far.duration).toBeCloseTo(near.duration, 12);
    for (let i = 1; i < 10; i++) {
      const t = near.tStart + (near.duration * i) / 10;
      expect(near.frequencyAtTime(t)).toBeCloseTo(far.frequencyAtTime(t), 9);
      expect(near.strainAtTime(t) / far.strainAtTime(t)).toBeCloseTo(3, 8);
    }
  });
});

describe('the envelope is bounded work and honest output', () => {
  test('a 158 second inspiral draws into 900 buckets without materialising it', () => {
    const tl = modelTimeline(BNS);
    expect(tl.duration).toBeGreaterThan(150);
    const t0 = Date.now();
    const env = tl.envelope(tl.tStart, tl.tEnd, 900);
    expect(Date.now() - t0).toBeLessThan(500);
    expect(env.min.length).toBe(900);
    // Zoomed this far out every bucket holds many cycles, so the envelope is
    // the amplitude itself and must be symmetric about zero.
    for (let i = 0; i < 900; i++) {
      expect(env.max[i]).toBeCloseTo(-env.min[i], 30);
    }
  });

  test('the envelope grows towards merger', () => {
    const tl = modelTimeline(BNS);
    const env = tl.envelope(tl.tStart, tl.tEnd, 64);
    for (let i = 1; i < 64; i++) {
      expect(env.max[i]).toBeGreaterThanOrEqual(env.max[i - 1]);
    }
  });

  test('the envelope agrees with the amplitude it is an envelope of', () => {
    const tl = modelTimeline(BNS);
    const env = tl.envelope(tl.tStart, tl.tEnd, 32);
    const width = tl.duration / 32;
    for (let i = 0; i < 32; i++) {
      const atEnd = tl.envelopeAtTime(
        Math.min(tl.tEnd, tl.tStart + (i + 1) * width)
      );
      // Float32 storage, so relative rather than absolute: the envelope arrays
      // are for drawing, and a part in ten million is a thousandth of a pixel.
      expect(Math.abs(env.max[i] / atEnd - 1)).toBeLessThan(1e-6);
    }
  });

  test('zoomed in far enough it resolves individual cycles instead', () => {
    const tl = modelTimeline(BBH);
    // A twentieth of a cycle per bucket: the envelope must now be asymmetric
    // somewhere, because it is tracking the carrier rather than bounding it.
    const from = tl.tStart;
    const to = tl.tStart + 0.05;
    const env = tl.envelope(from, to, 64);
    let asymmetric = 0;
    for (let i = 0; i < 64; i++) {
      if (Math.abs(env.max[i] + env.min[i]) > 1e-25) asymmetric++;
    }
    expect(asymmetric).toBeGreaterThan(10);
  });

  test('outside the span it reports gaps rather than zeros', () => {
    const tl = modelTimeline(BBH);
    const env = tl.envelope(tl.tStart - 1, tl.tEnd + 1, 100);
    expect(Number.isNaN(env.min[0])).toBe(true);
    expect(Number.isNaN(env.max[99])).toBe(true);
    expect(Number.isNaN(env.max[50])).toBe(false);
  });

  test('a frequency track rises monotonically across the span', () => {
    const tl = modelTimeline(BBH);
    const track = tl.frequencyTrack(tl.tStart, tl.tEnd, 50);
    for (let i = 1; i < 50; i++) expect(track[i]).toBeGreaterThan(track[i - 1]);
  });
});

describe('a sampled timeline behaves like the model one', () => {
  const samples = Float32Array.from({ length: 100 }, (_, i) => Math.sin(i / 5));

  test('reports its own span from the rate and the start', () => {
    const tl = sampledTimeline({ samples, sampleRate: 100, t0: -0.5 });
    expect(tl.tStart).toBeCloseTo(-0.5, 12);
    expect(tl.tEnd).toBeCloseTo(-0.5 + 99 / 100, 12);
  });

  test('interpolates between stored samples', () => {
    const tl = sampledTimeline({
      samples: Float32Array.from([0, 2]),
      sampleRate: 1,
      t0: 0,
    });
    expect(tl.strainAtTime(0.5)).toBeCloseTo(1, 6);
  });

  test('returns NaN outside the recording rather than zero', () => {
    const tl = sampledTimeline({ samples, sampleRate: 100, t0: 0 });
    expect(Number.isNaN(tl.strainAtTime(-0.01))).toBe(true);
    expect(Number.isNaN(tl.strainAtTime(5))).toBe(true);
  });

  test('does not invent a frequency it was not given', () => {
    const tl = sampledTimeline({ samples, sampleRate: 100, t0: 0 });
    expect(Number.isNaN(tl.frequencyAtTime(0.5))).toBe(true);
    expect(tl.hasAnalyticPhase).toBe(false);
  });

  test('its envelope brackets every sample in the bucket', () => {
    const tl = sampledTimeline({ samples, sampleRate: 100, t0: 0 });
    const env = tl.envelope(0, 0.99, 10);
    for (let b = 0; b < 10; b++) {
      for (let i = b * 10; i < (b + 1) * 10 && i < 100; i++) {
        expect(samples[i]).toBeGreaterThanOrEqual(env.min[b] - 1e-6);
        expect(samples[i]).toBeLessThanOrEqual(env.max[b] + 1e-6);
      }
    }
  });

  test('carries its provenance into meta without losing the kind', () => {
    const tl = sampledTimeline({
      samples,
      sampleRate: 100,
      meta: { detector: 'H1', event: 'GW150914' },
    });
    expect(tl.meta.detector).toBe('H1');
    expect(tl.meta.kind).toBe('data');
  });
});

describe('the metadata a capture will quote', () => {
  test('records the frame the masses are in', () => {
    expect(modelTimeline(BBH).meta.massFrame).toBe('detector');
  });

  test('records where the model was stopped and why', () => {
    expect(modelTimeline(BBH).meta.terminatedAt).toBe('schwarzschild-isco');
  });

  test('records the detector response assumption in words', () => {
    expect(modelTimeline(BBH).meta.detectorResponse).toMatch(/F\+ = 1/);
  });

  test('the peak strain matches the amplitude at the end of the span', () => {
    const tl = modelTimeline(BBH);
    expect(tl.meta.peakStrain).toBeCloseTo(
      strainAmplitude(tl.fEnd, chirpMass(36, 29), 410),
      30
    );
  });

  test('meta is frozen, so a panel cannot edit a capture after the fact', () => {
    const tl = modelTimeline(BBH);
    expect(Object.isFrozen(tl.meta)).toBe(true);
    expect(Object.isFrozen(tl)).toBe(true);
  });
});
