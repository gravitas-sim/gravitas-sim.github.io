// Seeded inputs for the gate (Prompt 199 spike). Seed 199, js/rng.js mulberry32.
import { mulberry32 } from '../../js/rng.js';

export function makeInputs() {
  const rnd = mulberry32(199);
  const U = (a, b) => a + (b - a) * rnd();
  const L = (a, b) => Math.exp(U(Math.log(a), Math.log(b)));
  const rep = (n, f) => Array.from({ length: n }, f);
  const geom = (a, b, n) => rep(n, (_, i) => a * (b / a) ** (i / (n - 1)));
  return {
    seed: 199,
    equilibrium: rep(2000, () => ({ flux: L(0.05, 1e6), albedo: U(0, 0.95), eps: U(0, 1) })),
    onelayer: rep(1000, () => ({ te: L(20, 2000), eps: U(0, 1) })),
    grey: rep(1000, () => ({ te: L(20, 2000), tau: L(1e-3, 300) })),
    greyOde: { te: 255, tauS: geom(0.01, 200, 60) },
    scale: rep(1000, () => ({ t: U(20, 2000), mu: U(1.5, 60), g: U(0.5, 30) })),
    jeans: rep(1000, () => ({
      massEarth: L(0.01, 400),
      rKm: U(2000, 2e5),
      t: U(100, 5000),
      amu: U(1, 44),
      eta: L(1e2, 1e12),
    })),
    milneTau: [0, ...geom(1e-4, 100, 400)],
  };
}
