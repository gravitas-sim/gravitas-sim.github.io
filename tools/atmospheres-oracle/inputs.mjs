// Seeded inputs for the atmospheres oracle (Prompt 200). Seed 199 (the gate's), js/rng.js mulberry32.
//   node tools/atmospheres-oracle/inputs.mjs inputs.json
import { writeFileSync } from 'node:fs';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { mulberry32 } from '../../js/rng.js';

export function makeInputs() {
  const rnd = mulberry32(199);
  const U = (a, b) => a + (b - a) * rnd();
  const L = (a, b) => Math.exp(U(Math.log(a), Math.log(b)));
  const rep = (n, f) => Array.from({ length: n }, f);
  const geom = (a, b, n) => rep(n, (_, i) => a * (b / a) ** (i / (n - 1)));
  return {
    seed: 199,
    equilibrium: rep(2000, () => ({
      flux: L(0.05, 1e6),
      albedo: U(0, 0.95),
      eps: U(0, 1),
    })),
    onelayer: rep(1000, () => ({ te: L(20, 2000), eps: U(0, 1) })),
    grey: rep(1000, () => ({ te: L(20, 2000), tau: L(1e-3, 300) })),
    greyOde: { te: 255, tauS: geom(0.01, 200, 60) },
    pinnedTauS: [0.87, 10, 141.5],
    scale: rep(1000, () => ({ t: U(20, 2000), mu: U(1.5, 60), g: U(0.5, 30) })),
    milneTau: [0, ...geom(1e-4, 100, 400)],
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url) && process.argv[2])
  writeFileSync(process.argv[2], JSON.stringify(makeInputs()));
