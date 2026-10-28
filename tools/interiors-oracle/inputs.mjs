// Seeded inputs for the interiors Part A oracle (Prompt 203). Seed 2031, js/rng.js mulberry32.
//   node tools/interiors-oracle/inputs.mjs inputs.json
import { writeFileSync } from 'node:fs';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { mulberry32 } from '../../js/rng.js';
import { PLANETS, PLANET_IDS } from '../../js/kernels/interiors/bodies.js';

export function makeInputs() {
  const rnd = mulberry32(2031);
  const U = (a, b) => a + (b - a) * rnd();
  const L = (a, b) => Math.exp(U(Math.log(a), Math.log(b)));
  const rep = (n, f) => Array.from({ length: n }, f);
  return {
    seed: 2031,
    // a1: any (GM km3/s2, R km) with relative errors up to 5 percent
    points: rep(1000, () => {
      const gm = L(1e3, 2e8);
      const radius = L(500, 8e4);
      return { gm, radius, sgm: gm * U(0, 0.05), sr: radius * U(0, 0.05) };
    }),
    // b1: the nine bodies as the table states them (mean radius)
    bodies: PLANET_IDS.map(id => ({
      id,
      gm: PLANETS[id].gm,
      mean: PLANETS[id].radius.mean,
      equatorial: PLANETS[id].radius.equatorial,
    })),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url) && process.argv[2])
  writeFileSync(process.argv[2], JSON.stringify(makeInputs()));
