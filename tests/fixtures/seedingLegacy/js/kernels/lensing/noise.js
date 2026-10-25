// A seeded standard-normal generator: Box-Muller over js/rng.js's mulberry32,
// the same construction the inference core's synthetic signals use, kept here
// so the lensing instruments do not import the inference core's transit and
// radial-velocity code.
import { mulberry32, normalizeSeed } from '../../../../../../js/rng.js';

export function gaussianNoise(seed) {
  const u = mulberry32(normalizeSeed(String(seed)));
  let spare = null;
  return () => {
    if (spare !== null) {
      const s = spare;
      spare = null;
      return s;
    }
    let a;
    do a = u();
    while (a <= 1e-12);
    const b = u();
    const r = Math.sqrt(-2 * Math.log(a));
    spare = r * Math.sin(2 * Math.PI * b);
    return r * Math.cos(2 * Math.PI * b);
  };
}
