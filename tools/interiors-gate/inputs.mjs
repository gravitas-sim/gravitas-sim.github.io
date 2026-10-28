// Seeded inputs for the interiors gate (Prompt 203). Seed 203 (the gate's), js/rng.js mulberry32.
//   node tools/interiors-gate/inputs.mjs inputs.json
// The ranges below were fixed before the oracle ran (INTERIORS_GATE.md, O2 and O6 name the counts; the ranges are here).
import { writeFileSync } from 'node:fs';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { mulberry32 } from '../../js/rng.js';

export function makeInputs() {
  const rnd = mulberry32(203);
  const U = (a, b) => a + (b - a) * rnd();
  const L = (a, b) => Math.exp(U(Math.log(a), Math.log(b)));
  const rep = (n, f) => Array.from({ length: n }, f);
  return {
    seed: 203,
    // I1, I2: two-layer structures, radius in m, densities in kg/m3 (bulk density stays above 3000)
    twoLayer: rep(1500, () => {
      const rhoMantle = U(3000, 5000);
      return {
        radius: U(1e6, 8e6),
        x: U(0.05, 0.9),
        rhoMantle,
        rhoCore: rhoMantle + U(800, 8000),
      };
    }),
    // O1: Darwin-Radau closed forms
    radau: rep(1000, () => ({
      q: L(1e-4, 0.1),
      moment: U(0.05, 0.395),
      fFrac: U(0.3, 1.0),
    })),
    // O2: profiles for the Clairaut oracle (x in [0.1, 0.8], contrast in [1.2, 4.0]) and O6's (the Earth-like ones)
    clairaut: rep(200, () => ({ x: U(0.1, 0.8), kappa: U(1.2, 4.0) })),
    ensembleO6: rep(1000, () => ({
      x: U(0.3, 0.6),
      kappa: U(1.5, 3.2),
    })),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url) && process.argv[2])
  writeFileSync(process.argv[2], JSON.stringify(makeInputs()));
