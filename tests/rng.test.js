import { describe, test, expect, afterEach } from '@jest/globals';
import {
  mulberry32,
  withSeed,
  isSeeded,
  normalizeSeed,
  formatSeed,
  parseSeed,
  getWorldSeed,
  setWorldSeed,
  randomSeed,
} from '../js/rng.js';

describe('mulberry32', () => {
  test('is deterministic for a given seed', () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    const runA = Array.from({ length: 50 }, () => a());
    const runB = Array.from({ length: 50 }, () => b());
    expect(runA).toEqual(runB);
  });

  test('gives different streams for different seeds', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toBe(b());
  });

  test('stays inside [0, 1)', () => {
    const gen = mulberry32(99);
    for (let i = 0; i < 2000; i++) {
      const v = gen();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  test('does not repeat itself over a short run', () => {
    const gen = mulberry32(7);
    const seen = new Set();
    for (let i = 0; i < 5000; i++) seen.add(gen());
    // A generator whose low bits are patterned collides here; that is the
    // failure this replaced.
    expect(seen.size).toBe(5000);
  });
});

describe('withSeed', () => {
  const realRandom = Math.random;
  afterEach(() => {
    Math.random = realRandom;
  });

  test('makes a block of Math.random calls reproducible', () => {
    const draw = () => [Math.random(), Math.random(), Math.random()];
    const first = withSeed(42, draw);
    const second = withSeed(42, draw);
    expect(first).toEqual(second);
  });

  test('different seeds give different worlds', () => {
    const draw = () => Math.random();
    expect(withSeed(1, draw)).not.toBe(withSeed(2, draw));
  });

  test('restores the real Math.random afterwards', () => {
    withSeed(5, () => Math.random());
    expect(Math.random).toBe(realRandom);
  });

  test('restores Math.random even when the body throws', () => {
    expect(() =>
      withSeed(5, () => {
        throw new Error('boom');
      })
    ).toThrow('boom');
    // The whole point of the finally block: a failed scenario build must not
    // leave the page running on a deterministic generator.
    expect(Math.random).toBe(realRandom);
  });

  test('reports whether a seeded region is active', () => {
    expect(isSeeded()).toBe(false);
    withSeed(1, () => {
      expect(isSeeded()).toBe(true);
    });
    expect(isSeeded()).toBe(false);
  });

  test('returns the body result', () => {
    expect(withSeed(1, () => 'value')).toBe('value');
  });
});

describe('seed text', () => {
  test('round-trips through format and parse', () => {
    for (const seed of [0, 1, 42, 65535, 0xffffffff, 123456789]) {
      expect(parseSeed(formatSeed(seed))).toBe(seed >>> 0);
    }
  });

  test('accepts a word as a seed', () => {
    const a = normalizeSeed('kepler-lab');
    expect(Number.isInteger(a)).toBe(true);
    expect(a).toBe(normalizeSeed('kepler-lab'));
  });

  test('spreads similar words apart', () => {
    // Sequential lab names are the likely real usage, so they must not collide
    // or land next to each other.
    const a = normalizeSeed('orbit1');
    const b = normalizeSeed('orbit2');
    expect(a).not.toBe(b);
    expect(Math.abs(a - b)).toBeGreaterThan(1000);
  });

  test('keeps a plain integer as itself', () => {
    expect(normalizeSeed(2024)).toBe(2024);
    expect(normalizeSeed('2024')).toBe(2024);
  });

  test('handles empty and missing input without throwing', () => {
    expect(normalizeSeed('')).toBe(0);
    expect(normalizeSeed(null)).toBe(0);
    expect(normalizeSeed(undefined)).toBe(0);
  });
});

describe('world seed', () => {
  test('stores what it is given', () => {
    setWorldSeed(777);
    expect(getWorldSeed()).toBe(777);
  });

  test('normalizes text seeds on the way in', () => {
    const stored = setWorldSeed('lab-three');
    expect(getWorldSeed()).toBe(stored);
    expect(Number.isInteger(stored)).toBe(true);
  });

  test('randomSeed gives a 32-bit unsigned integer', () => {
    for (let i = 0; i < 20; i++) {
      const s = randomSeed();
      expect(Number.isInteger(s)).toBe(true);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(0xffffffff);
    }
  });
});
