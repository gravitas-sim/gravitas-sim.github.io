// =============================================================================
// The transform, the noise and the overlap
// -----------------------------------------------------------------------------
// Three small pieces of signal processing, each checked against something
// other than itself: the transform against a hand-computable case and against
// its own inverse, the noise against the published Advanced LIGO design
// sensitivity and against Parseval, the overlap against the values it is
// mathematically obliged to produce at both ends of its range.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { fft, isPowerOfTwo, nextPowerOfTwo } from '../js/gw/fft.js';
import { aligoPsd, aligoAsd, colouredNoise } from '../js/gw/noise.js';
import { similarity, whiten, tukey, sampleOnto } from '../js/gw/match.js';
import { modelTimeline } from '../js/gw/timeline.js';

describe('the transform', () => {
  test('recognises the lengths it can handle', () => {
    expect(isPowerOfTwo(1024)).toBe(true);
    expect(isPowerOfTwo(1000)).toBe(false);
    expect(isPowerOfTwo(0)).toBe(false);
    expect(nextPowerOfTwo(1000)).toBe(1024);
    expect(nextPowerOfTwo(1024)).toBe(1024);
  });

  test('refuses a length it cannot handle instead of returning nonsense', () => {
    expect(() => fft(new Float64Array(3), new Float64Array(3))).toThrow(
      RangeError
    );
  });

  test('a constant transforms to a single spike at zero frequency', () => {
    const n = 8;
    const re = new Float64Array(n).fill(2);
    const im = new Float64Array(n);
    fft(re, im, false);
    expect(re[0]).toBeCloseTo(16, 10);
    for (let k = 1; k < n; k++) {
      expect(Math.hypot(re[k], im[k])).toBeLessThan(1e-10);
    }
  });

  test('a pure sinusoid lands in exactly one bin', () => {
    const n = 64;
    const bin = 7;
    const re = new Float64Array(n);
    const im = new Float64Array(n);
    for (let i = 0; i < n; i++) re[i] = Math.cos((2 * Math.PI * bin * i) / n);
    fft(re, im, false);
    expect(Math.hypot(re[bin], im[bin])).toBeCloseTo(n / 2, 8);
    expect(Math.hypot(re[n - bin], im[n - bin])).toBeCloseTo(n / 2, 8);
    expect(Math.hypot(re[bin + 1], im[bin + 1])).toBeLessThan(1e-8);
  });

  test('the inverse undoes the forward transform', () => {
    const n = 256;
    const re = new Float64Array(n);
    const im = new Float64Array(n);
    for (let i = 0; i < n; i++) re[i] = Math.sin(i) * i;
    const original = Float64Array.from(re);
    fft(re, im, false);
    fft(re, im, true);
    for (let i = 0; i < n; i++) expect(re[i]).toBeCloseTo(original[i], 8);
  });
});

describe('the Advanced LIGO design curve', () => {
  // Anchors from the published zero-detuning high-power sensitivity rather
  // than from the fit. Stated only where the design curve is well known to a
  // factor better than the tolerance quoted; the shape assertions below carry
  // the rest, and between them a transcription error in any coefficient moves
  // something out of range.
  test.each([
    [10, 7e-23, 0.3],
    [20, 2e-23, 0.2],
    [100, 4e-24, 0.15],
  ])(
    'at %i Hz the amplitude spectral density is about %p',
    (f, expected, tol) => {
      expect(Math.abs(aligoAsd(f) / expected - 1)).toBeLessThan(tol);
    }
  );

  test('bottoms out at a few times 1e-24 in the hundreds of hertz', () => {
    let best = Infinity;
    let bestF = 0;
    for (let f = 10; f < 4000; f *= 1.02) {
      if (aligoAsd(f) < best) {
        best = aligoAsd(f);
        bestF = f;
      }
    }
    expect(bestF).toBeGreaterThan(150);
    expect(bestF).toBeLessThan(400);
    expect(best).toBeGreaterThan(2e-24);
    expect(best).toBeLessThan(6e-24);
  });

  test('is a bucket: far worse at both ends than at the bottom', () => {
    const best = aligoAsd(250);
    expect(aligoAsd(10)).toBeGreaterThan(best * 10);
    expect(aligoAsd(20)).toBeGreaterThan(best * 3);
    expect(aligoAsd(4000)).toBeGreaterThan(best * 2);
  });

  test('falls steeply through the seismic wall, as a real detector does', () => {
    // Roughly an order of magnitude between 10 and 30 Hz. This is the feature
    // the x^-4 term exists for, and the one a lost minus sign would flatten.
    expect(aligoAsd(10) / aligoAsd(30)).toBeGreaterThan(5);
  });

  test('is clamped below 10 Hz rather than diverging', () => {
    expect(Number.isFinite(aligoPsd(1))).toBe(true);
    expect(aligoPsd(1)).toBe(aligoPsd(10));
    expect(aligoPsd(0)).toBe(aligoPsd(10));
  });

  test('is never negative, at any frequency', () => {
    for (let f = 1; f < 8192; f *= 1.3) {
      expect(aligoPsd(f)).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('synthetic noise', () => {
  const fs = 4096;
  const n = fs * 4;

  test('has the variance the spectrum says it should', () => {
    // Parseval, computed from the PSD by an independent numerical integral.
    const x = colouredNoise({ samples: n, sampleRate: fs, seed: 'variance' });
    let sum = 0;
    for (const v of x) sum += v * v;
    const rms = Math.sqrt(sum / n);
    let integral = 0;
    for (let f = 15; f < fs / 2; f += 0.5) integral += aligoPsd(f) * 0.5;
    expect(Math.abs(rms / Math.sqrt(integral) - 1)).toBeLessThan(0.05);
  });

  test('is real: no residual imaginary part leaking through', () => {
    const x = colouredNoise({ samples: 1024, sampleRate: 2048, seed: 'real' });
    for (const v of x) expect(Number.isFinite(v)).toBe(true);
  });

  test('has zero mean to within the sampling error', () => {
    const x = colouredNoise({ samples: n, sampleRate: fs, seed: 'mean' });
    let sum = 0;
    for (const v of x) sum += v;
    let sq = 0;
    for (const v of x) sq += v * v;
    const rms = Math.sqrt(sq / n);
    expect(Math.abs(sum / n)).toBeLessThan(rms);
  });

  test('the same seed gives the same realization, every time', () => {
    const a = colouredNoise({ samples: 2048, sampleRate: fs, seed: 'fixed' });
    const b = colouredNoise({ samples: 2048, sampleRate: fs, seed: 'fixed' });
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  test('a different seed gives a different one', () => {
    const a = colouredNoise({ samples: 2048, sampleRate: fs, seed: 'one' });
    const b = colouredNoise({ samples: 2048, sampleRate: fs, seed: 'two' });
    let identical = 0;
    for (let i = 0; i < 2048; i++) if (a[i] === b[i]) identical++;
    expect(identical).toBeLessThan(10);
  });

  test('changing the length does not change the seed stream it draws from', () => {
    // Both round up to the same power of two, so both must be identical over
    // the shorter one. A student who shortens a window must not find that the
    // noise underneath the signal has been redrawn.
    const short = colouredNoise({ samples: 1000, sampleRate: fs, seed: 'len' });
    const long = colouredNoise({ samples: 1024, sampleRate: fs, seed: 'len' });
    for (let i = 0; i < 1000; i++) expect(short[i]).toBeCloseTo(long[i], 30);
  });

  test('carries no power below the low-frequency cut', () => {
    const x = colouredNoise({
      samples: 4096,
      sampleRate: fs,
      seed: 'cut',
      fLow: 100,
    });
    const re = Float64Array.from(x);
    const im = new Float64Array(4096);
    fft(re, im, false);
    const df = fs / 4096;
    // Relative to the power that is in band: an inverse and a forward
    // transform of a 1e-22 signal leave rounding noise, and an absolute
    // threshold would be testing the width of a double.
    let inBand = 0;
    for (let k = Math.ceil(150 / df); k < Math.floor(400 / df); k++) {
      inBand = Math.max(inBand, Math.hypot(re[k], im[k]));
    }
    for (let k = 1; k < Math.floor(90 / df); k++) {
      expect(Math.hypot(re[k], im[k])).toBeLessThan(inBand * 1e-6);
    }
  });
});

describe('the taper', () => {
  test('starts and ends at zero and is one in the middle', () => {
    const w = tukey(1000);
    expect(w[0]).toBeCloseTo(0, 10);
    expect(w[999]).toBeCloseTo(0, 10);
    expect(w[500]).toBeCloseTo(1, 10);
  });

  test('is symmetric', () => {
    const w = tukey(512);
    for (let i = 0; i < 256; i++) expect(w[i]).toBeCloseTo(w[511 - i], 9);
  });

  test('never exceeds one', () => {
    for (const v of tukey(300)) expect(v).toBeLessThanOrEqual(1 + 1e-12);
  });
});

describe('whitening', () => {
  test('flattens coloured noise towards unit variance per bin', () => {
    const fs = 2048;
    const n = 4096;
    const x = colouredNoise({ samples: n, sampleRate: fs, seed: 'white' });
    const w = whiten(x, { sampleRate: fs, fLow: 30, fHigh: 400 });
    // The ratio of power in two bands of equal width must be near one after
    // whitening, where before it differs by more than an order of magnitude.
    const band = (arr, lo, hi) => {
      const re = Float64Array.from(arr);
      const im = new Float64Array(re.length);
      fft(re, im, false);
      const df = fs / re.length;
      let p = 0;
      for (let k = Math.ceil(lo / df); k < Math.floor(hi / df); k++) {
        p += re[k] * re[k] + im[k] * im[k];
      }
      return p;
    };
    // 30-60 Hz against 300-330 Hz: the design curve puts about nine times the
    // power per hertz in the first, so an equal-width comparison should show
    // it before whitening and not after.
    const rawRatio = band(x, 30, 60) / band(x, 300, 330);
    const whiteRatio = band(w, 30, 60) / band(w, 300, 330);
    expect(rawRatio).toBeGreaterThan(3);
    expect(whiteRatio).toBeLessThan(rawRatio / 2);
    expect(whiteRatio).toBeGreaterThan(0.25);
    expect(whiteRatio).toBeLessThan(4);
  });

  test('returns the same number of samples it was given', () => {
    const out = whiten(new Float64Array(1000), { sampleRate: 1024 });
    expect(out.length).toBe(1000);
  });
});

describe('similarity is a match, and only a match', () => {
  const fs = 2048;
  const bbh = modelTimeline({
    m1: 36,
    m2: 29,
    distanceMpc: 410,
    inclinationDeg: 0,
    fStart: 20,
  });
  const signal = sampleOnto(bbh, { sampleRate: fs, length: 2048 });

  test('a signal matches itself exactly', () => {
    expect(
      similarity(signal, signal, { sampleRate: fs }).similarity
    ).toBeCloseTo(1, 6);
  });

  test('is blind to amplitude, which is why it is not a detection statistic', () => {
    const scaled = Float64Array.from(signal, v => v * 0.001);
    const r = similarity(signal, scaled, { sampleRate: fs });
    expect(r.similarity).toBeCloseTo(1, 6);
  });

  test('is blind to overall phase', () => {
    // A quarter-cycle phase shift built by mixing the two polarizations.
    const shifted = new Float64Array(2048);
    for (let i = 0; i < 2048; i++) {
      const t = bbh.tStart + i / fs;
      const env = bbh.envelopeAtTime(t);
      const phi = bbh.phaseAtTime(t);
      shifted[i] = Number.isFinite(env) ? env * Math.cos(phi + Math.PI / 3) : 0;
    }
    expect(
      similarity(signal, shifted, { sampleRate: fs }).similarity
    ).toBeGreaterThan(0.97);
  });

  test('falls when the chirp mass is wrong', () => {
    const other = modelTimeline({
      m1: 20,
      m2: 16,
      distanceMpc: 410,
      inclinationDeg: 0,
      fStart: 20,
    });
    const r = similarity(
      signal,
      sampleOnto(other, { sampleRate: fs, length: 2048 }),
      {
        sampleRate: fs,
      }
    );
    expect(r.similarity).toBeLessThan(0.6);
  });

  test('is small against noise, but not zero, which is the lesson', () => {
    const noise = colouredNoise({
      samples: 2048,
      sampleRate: fs,
      seed: 'match',
    });
    const r = similarity(signal, Float64Array.from(noise), { sampleRate: fs });
    expect(r.similarity).toBeGreaterThan(0);
    expect(r.similarity).toBeLessThan(0.5);
  });

  test('finds the time shift between a signal and a delayed copy', () => {
    const delayed = new Float64Array(2048);
    const shift = 64;
    for (let i = shift; i < 2048; i++) delayed[i] = signal[i - shift];
    const r = similarity(signal, delayed, { sampleRate: fs });
    expect(Math.abs(Math.abs(r.shiftSeconds) - shift / fs)).toBeLessThan(
      2 / fs
    );
  });

  test('never exceeds one, whatever it is handed', () => {
    const noise = colouredNoise({ samples: 2048, sampleRate: fs, seed: 'cap' });
    for (const other of [
      signal,
      Float64Array.from(noise),
      new Float64Array(2048),
    ]) {
      expect(
        similarity(signal, other, { sampleRate: fs }).similarity
      ).toBeLessThanOrEqual(1);
    }
  });

  test('reports zero rather than NaN when a trace is empty', () => {
    expect(
      similarity(new Float64Array(512), new Float64Array(512), {
        sampleRate: fs,
      }).similarity
    ).toBe(0);
  });
});
