// =============================================================================
// The event-local noise estimate and the time-frequency map
// -----------------------------------------------------------------------------
// Both are checked against inputs whose answer is known without this code: a
// white process of known variance, whose one-sided PSD is exactly 2 sigma^2 / fs;
// a first-order autoregressive process, whose spectrum has a closed form; and a
// tone and a chirp whose frequency is known at every instant. None of these
// expectations is produced by the functions under test.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { welchPsd, medianBias, psdFunction, hann } from '../js/gw/psd.js';
import {
  qScan,
  loudestFrequencyAt,
  loudestInstant,
  noiseCeiling,
  logFrequencies,
  signalEnd,
} from '../js/gw/qscan.js';

/** A seeded standard normal, so every run of this file sees the same noise. */
function gaussian(seed) {
  let s = seed >>> 0;
  const uniform = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return () => {
    const u = Math.max(uniform(), 1e-300);
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * uniform());
  };
}

const FS = 1024;

/** Mean of a PSD between two frequencies. */
const bandMean = (est, lo, hi) => {
  let s = 0;
  let n = 0;
  for (let k = 0; k < est.freq.length; k++) {
    if (est.freq[k] >= lo && est.freq[k] <= hi) {
      s += est.psd[k];
      n++;
    }
  }
  return s / n;
};

describe('the median bias', () => {
  test('is 1 for one segment and tends to ln 2', () => {
    expect(medianBias(1)).toBe(1);
    expect(medianBias(2)).toBe(1);
    // 1 + (1/3 - 1/2), the finite-n value scipy.signal.welch applies for 3.
    expect(medianBias(3)).toBeCloseTo(1 + 1 / 3 - 1 / 2, 12);
    expect(medianBias(10001)).toBeCloseTo(Math.LN2, 4);
  });
});

describe('Welch estimate of a known spectrum', () => {
  const rng = gaussian(7);
  const sigma = 3;
  const white = new Float64Array(64 * FS);
  for (let i = 0; i < white.length; i++) white[i] = sigma * rng();
  const truth = (2 * sigma * sigma) / FS; // one-sided, units^2 / Hz

  test.each(['mean', 'median'])(
    'white noise: the %s estimate recovers 2 sigma^2 / fs',
    average => {
      const est = welchPsd(white, {
        sampleRate: FS,
        segmentSeconds: 4,
        average,
      });
      expect(bandMean(est, 20, 450) / truth).toBeGreaterThan(0.97);
      expect(bandMean(est, 20, 450) / truth).toBeLessThan(1.03);
      expect(est.segments).toBe(31);
    }
  );

  test('a first-order autoregressive process: the closed-form spectrum', () => {
    // x[n] = a x[n-1] + e[n], e ~ N(0, s^2). Its one-sided PSD is
    //   S(f) = (2 s^2 / fs) / |1 - a exp(-2 pi i f / fs)|^2,
    // which is steep enough to separate an estimator that is right from one
    // that only gets the average level right.
    const a = 0.9;
    const s = 1;
    const r = gaussian(11);
    const x = new Float64Array(128 * FS);
    for (let i = 1; i < x.length; i++) x[i] = a * x[i - 1] + s * r();
    const est = welchPsd(x, { sampleRate: FS, segmentSeconds: 4 });
    const S = f =>
      (2 * s * s) / FS / (1 + a * a - 2 * a * Math.cos((2 * Math.PI * f) / FS));
    for (const f of [5, 20, 80, 200, 400]) {
      // Estimate and truth averaged over the SAME bins, so a steep spectrum's
      // curvature inside the band cancels rather than reading as error.
      let got = 0;
      let want = 0;
      let bins = 0;
      for (let k = 0; k < est.freq.length; k++) {
        if (est.freq[k] >= f * 0.8 && est.freq[k] <= f * 1.2) {
          got += est.psd[k];
          want += S(est.freq[k]);
          bins++;
        }
      }
      // The tolerance is derived, not chosen. The median of n exponential
      // periodogram values scatters by about 1.44 / sqrt(n) per bin; Hann-
      // windowed neighbours are correlated, so about half the bins are
      // independent. Four standard deviations of that.
      const tol = 4 * (1.44 / Math.sqrt(est.segments * Math.max(1, bins / 2)));
      expect(Math.abs(got / want - 1)).toBeLessThan(tol);
      expect(tol).toBeLessThan(0.35); // or the test would not be testing anything
    }
    // The spectrum falls by a factor of about 360 from 0 to Nyquist; so does the estimate.
    expect(bandMean(est, 1, 3) / bandMean(est, 480, 510)).toBeGreaterThan(200);
  });

  test('the median ignores a glitch that the mean does not', () => {
    const glitched = Float64Array.from(white);
    // A loud, short transient in one place - the kind real strain carries.
    for (let i = 0; i < 64; i++) glitched[20 * FS + i] += 400 * Math.sin(i);
    const med = bandMean(
      welchPsd(glitched, { sampleRate: FS, average: 'median' }),
      20,
      450
    );
    const mean = bandMean(
      welchPsd(glitched, { sampleRate: FS, average: 'mean' }),
      20,
      450
    );
    expect(med / truth).toBeLessThan(1.05);
    expect(mean / truth).toBeGreaterThan(1.5);
  });

  test('an excluded interval is not touched by any segment', () => {
    const all = welchPsd(white, { sampleRate: FS, segmentSeconds: 4 });
    const cut = welchPsd(white, {
      sampleRate: FS,
      segmentSeconds: 4,
      exclude: [[30, 33]],
    });
    // Segments start every 2 s and are 4 s long, so [30, 33] kills three.
    expect(cut.segments).toBe(all.segments - 3);
    const glitched = Float64Array.from(white);
    for (let i = 0; i < FS; i++) glitched[31 * FS + i] += 1e4;
    const clean = welchPsd(glitched, {
      sampleRate: FS,
      average: 'mean',
      exclude: [[30, 33]],
    });
    expect(bandMean(clean, 20, 450) / truth).toBeLessThan(1.05);
  });

  test('refuses a segment length the FFT cannot take', () => {
    expect(() =>
      welchPsd(white, { sampleRate: 1000, segmentSeconds: 4 })
    ).toThrow(/power of two/);
  });

  test('interpolates to any frequency, for whiten()', () => {
    const est = welchPsd(white, { sampleRate: FS });
    const fn = psdFunction(est);
    expect(fn(100) / truth).toBeGreaterThan(0.8);
    expect(fn(-5)).toBe(est.psd[0]);
    expect(fn(1e6)).toBe(est.psd[est.psd.length - 1]);
  });

  test('the Hann window is the periodic one Welch uses', () => {
    const w = hann(8);
    expect(w[0]).toBe(0);
    expect(w[4]).toBeCloseTo(1, 12);
  });
});

describe('the time-frequency map', () => {
  test('a tone burst lands in the row nearest its frequency', () => {
    // A burst, not a steady tone: every row is normalised to its own median,
    // so anything stationary - a tone, or a detector's spectral line -
    // normalises away. What the map shows is transient excess, which is the
    // property it exists for.
    const n = 4 * FS;
    const rng = gaussian(5);
    const x = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / FS;
      const envelope = Math.exp(-0.5 * ((t - 2) / 0.1) ** 2);
      x[i] = 4 * envelope * Math.sin(2 * Math.PI * 100 * t) + rng();
    }
    const scan = qScan(x, {
      sampleRate: FS,
      fMin: 30,
      fMax: 400,
      rows: 48,
      q: 8,
    });
    const step = Math.log(400 / 30) / 47;
    const got = loudestFrequencyAt(scan, 2);
    expect(got.freq).not.toBeNull();
    // Interpolated, so within half a row of the truth rather than a row.
    expect(Math.abs(Math.log(got.freq / 100))).toBeLessThan(0.5 * step);
  });

  test('a burst between two rows is reported between them', () => {
    // The case the interpolation exists for: halfway between rows, where the
    // loudest row alone is a coin toss between two neighbours.
    const f = logFrequencies(30, 400, 48);
    const truth = Math.sqrt(f[20] * f[21]);
    const n = 4 * FS;
    const rng = gaussian(8);
    const x = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / FS;
      x[i] =
        5 *
          Math.exp(-0.5 * ((t - 2) / 0.15) ** 2) *
          Math.sin(2 * Math.PI * truth * t) +
        rng();
    }
    const scan = qScan(x, {
      sampleRate: FS,
      fMin: 30,
      fMax: 400,
      rows: 48,
      q: 8,
    });
    const got = loudestFrequencyAt(scan, 2);
    expect(got.freq).toBeGreaterThan(f[20]);
    expect(got.freq).toBeLessThan(f[21]);
    const step = Math.log(400 / 30) / 47;
    expect(Math.abs(Math.log(got.freq / truth))).toBeLessThan(0.25 * step);
  });

  test('a steady tone does not show, because the map shows transients', () => {
    const n = 4 * FS;
    const rng = gaussian(6);
    const x = new Float64Array(n);
    for (let i = 0; i < n; i++)
      x[i] = 4 * Math.sin((2 * Math.PI * 100 * i) / FS) + rng();
    const scan = qScan(x, {
      sampleRate: FS,
      fMin: 30,
      fMax: 400,
      rows: 48,
      q: 8,
    });
    expect(loudestFrequencyAt(scan, 2).freq).toBeNull();
  });

  test('a chirp in noise: the loudest frequency follows the known track', () => {
    // f(t) = f0 + k t, known exactly, buried in white noise.
    const n = 4 * FS;
    const rng = gaussian(3);
    const f0 = 40;
    const k = 60; // Hz per second: 40 Hz at t = 0 to 280 Hz at t = 4
    const x = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / FS;
      x[i] = 3 * Math.sin(2 * Math.PI * (f0 * t + 0.5 * k * t * t)) + rng();
    }
    const scan = qScan(x, {
      sampleRate: FS,
      fMin: 30,
      fMax: 400,
      rows: 48,
      q: 8,
    });
    const step = Math.log(400 / 30) / 47; // log spacing between rows
    for (const t of [0.5, 1.5, 2.5, 3.5]) {
      const got = loudestFrequencyAt(scan, t);
      expect(got.freq).not.toBeNull();
      const truth = f0 + k * t;
      // Within two rows of the true frequency.
      expect(Math.abs(Math.log(got.freq / truth))).toBeLessThan(2.5 * step);
    }
  });

  test('pure noise almost never clears the ceiling', () => {
    // The claim the whole measurement rests on: "above the noise" is rare in
    // noise. Measured over many independent slices, not assumed.
    let found = 0;
    let slices = 0;
    for (let seed = 1; seed <= 6; seed++) {
      const rng = gaussian(100 + seed);
      const x = new Float64Array(8 * FS);
      for (let i = 0; i < x.length; i++) x[i] = rng();
      const scan = qScan(x, {
        sampleRate: FS,
        fMin: 30,
        fMax: 400,
        rows: 48,
        q: 8,
      });
      for (let t = 0.5; t < 7.5; t += 0.25) {
        slices++;
        if (loudestFrequencyAt(scan, t).freq !== null) found++;
      }
    }
    expect(slices).toBeGreaterThan(150);
    expect(found / slices).toBeLessThan(0.02);
  });

  test('the ceiling rises with the number of pixels searched', () => {
    expect(noiseCeiling(1024)).toBeCloseTo(10 + 8, 12);
    expect(noiseCeiling(4096)).toBeGreaterThan(noiseCeiling(1024));
  });

  test('the loudest instant finds a pulse where it was put', () => {
    const rng = gaussian(9);
    const x = new Float64Array(4 * FS);
    for (let i = 0; i < x.length; i++) x[i] = rng();
    const at = Math.round(2.7 * FS);
    for (let i = -20; i <= 20; i++)
      x[at + i] += 12 * Math.exp(-(i * i) / 50) * Math.sin(i);
    const scan = qScan(x, {
      sampleRate: FS,
      fMin: 30,
      fMax: 400,
      rows: 48,
      q: 8,
    });
    const got = loudestInstant(scan, 2.5, 2.9);
    expect(Math.abs(got.time - 2.7)).toBeLessThan(0.02);
    expect(got.energy).toBeGreaterThan(got.ceiling);
  });

  test('the end of a signal is where it stops, not where it is loudest', () => {
    // A chirp that is loudest early and fades to its end at a known time: the
    // shape that fooled "loudest instant" on GW190814.
    const rng = gaussian(21);
    const x = new Float64Array(4 * FS);
    const tEnd = 2.6;
    for (let i = 0; i < x.length; i++) {
      const t = i / FS;
      if (t > 1.6 && t < tEnd) {
        const amp = 9 - 5 * ((t - 1.6) / (tEnd - 1.6)); // loud first, fading
        x[i] += amp * Math.sin(2 * Math.PI * (60 * t + 40 * t * t));
      }
      x[i] += rng();
    }
    const scan = qScan(x, {
      sampleRate: FS,
      fMin: 30,
      fMax: 400,
      rows: 48,
      q: 8,
    });
    const loud = loudestInstant(scan, 1.5, 2.8);
    const end = signalEnd(scan, 1.5, 2.8);
    expect(end.time).not.toBeNull();
    expect(Math.abs(end.time - tEnd)).toBeLessThan(0.05);
    // ...and the loudest instant is somewhere else, which is the point.
    expect(end.time - loud.time).toBeGreaterThan(0.3);
  });

  test('pure noise has no end, almost always', () => {
    let found = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const rng = gaussian(500 + seed);
      const x = new Float64Array(2 * FS);
      for (let i = 0; i < x.length; i++) x[i] = rng();
      const scan = qScan(x, {
        sampleRate: FS,
        fMin: 30,
        fMax: 400,
        rows: 48,
        q: 8,
      });
      if (signalEnd(scan, 0.8, 1.2).time !== null) found++;
    }
    expect(found).toBeLessThanOrEqual(1);
  });

  test('log-spaced rows span exactly the band asked for', () => {
    const f = logFrequencies(30, 400, 48);
    expect(f[0]).toBeCloseTo(30, 12);
    expect(f[47]).toBeCloseTo(400, 9);
  });
});
