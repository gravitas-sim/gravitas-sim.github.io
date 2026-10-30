// The initial mass function (Kroupa 2001) as the number of stars between two
// initial masses, relative to a unit weight at the break. dN/dm = m^-a1 below
// the break and m^-a2 above it, continuous there.
const { Math } = globalThis;
import { IMF } from './constants.js';

const power = (a, b, s) =>
  Math.abs(s - 1) < 1e-12
    ? Math.log(b / a)
    : (b ** (1 - s) - a ** (1 - s)) / (1 - s);

/**
 * The relative number of stars with initial mass between m1 and m2 (m1 <= m2),
 * exact for each power-law piece and across the break.
 */
export function imfWeight(m1, m2) {
  if (!(m2 > m1)) return 0;
  const { break: mb, a1, a2 } = IMF;
  const k2 = mb ** (a2 - a1); // dN/dm continuous at mb: mb^-a1 = k2 mb^-a2
  let w = 0;
  const lo1 = Math.max(m1, IMF.lo);
  if (lo1 < mb) w += power(lo1, Math.min(m2, mb), a1);
  const lo2 = Math.max(m1, mb);
  if (m2 > lo2) w += k2 * power(lo2, m2, a2);
  return w;
}

/** dN/dm at m, for a numerical check of imfWeight. */
export const imfDensity = m =>
  m < IMF.lo ? 0 : m < IMF.break ? m ** -IMF.a1 : IMF.break ** (IMF.a2 - IMF.a1) * m ** -IMF.a2;
