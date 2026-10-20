// Named random streams (Prompt 149, docs/SEEDING.md): mulberry32 seeded by
// js/rng.js's hash of the seed's text, so every sequence reproducible today is
// the same one. js/rng.js is wrapped, never changed.
import { mulberry32, normalizeSeed, withSeed } from '../rng.js';

export const ALGORITHM = 'mulberry32';
export const VERSION = 1;
export const STREAMS = [
  'engine',
  'effects',
  'forward',
  'noise',
  'experiments',
  'injection',
];

const named = (id, draw, key) => {
  if (!STREAMS.includes(id)) throw new Error(`unknown random stream: ${id}`);
  draw.stream = { id, algorithm: ALGORITHM, version: VERSION, key };
  return draw;
};

/**
 * A uniform stream in [0, 1) from `seed` as given, or from the seed forked by
 * labels ("seed:a:b"). `.fork(...)` is a sibling stream, so one sub-experiment's
 * draws never depend on the order another drew in.
 */
export function stream(id, seed, ...labels) {
  const key = labels.length ? [seed, ...labels].map(String).join(':') : seed;
  const draw = named(id, mulberry32(normalizeSeed(key)), key);
  draw.fork = (...more) => stream(id, seed, ...labels, ...more);
  return draw;
}

/** A stream from a 32-bit state that a site salts or mixes for itself. */
export const state = (id, s) => named(id, mulberry32(s), s >>> 0);

/** Standard normals from a uniform stream: Box-Muller, the spare kept. */
export function gaussian(draw) {
  let spare = null;
  return () => {
    if (spare !== null) {
      const s = spare;
      spare = null;
      return s;
    }
    let a;
    do a = draw();
    while (a <= 1e-12);
    const r = Math.sqrt(-2 * Math.log(a));
    const t = 2 * Math.PI * draw();
    spare = r * Math.sin(t);
    return r * Math.cos(t);
  };
}

/** The engine's stream, and the effects bursts that draw from it. */
export const engine = withSeed;
