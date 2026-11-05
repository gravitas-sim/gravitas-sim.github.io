// =============================================================================
// Radio kernel: heliocentric to local-standard-of-rest velocities
// -----------------------------------------------------------------------------
// A velocity measured from the Sun becomes a velocity from the local standard of
// rest by adding the component of the Sun's own motion along the sightline:
//
//   v_LSR = v_helio + (U cos l + V sin l) cos b + W sin b,
//
// (U, V, W) the Sun's velocity relative to the LSR, U toward the Galactic centre,
// V in the direction of rotation, W toward the north Galactic pole.
//
// There is no single (U, V, W). D-GAIA-03 keeps two values of the Sun's V and
// chooses neither, and this kernel does the same: 'schonrich' is Schonrich,
// Binney and Dehnen 2010's (11.1, 12.24, 7.25) and 'stromberg' keeps their U and
// W and takes V = 3.77 km/s, the Stromberg-corrected value of the register row.
// 'none' leaves the velocity heliocentric. A caller may pass its own (U, V, W).
// Every result names the option and the shift, so the choice is always shown.
//
// What the tangent-point method sees is not Theta0 alone: it measures
// Theta0 + V at a given longitude, and U separately as a difference between the
// first and fourth quadrants (RADIO.md). That is why the choice matters.
// =============================================================================

import { RadioError, finite } from './constants.js';

const DEG = Math.PI / 180;

/** The named options. Values are km/s. */
export const LSR_OPTIONS = Object.freeze({
  schonrich: Object.freeze({
    U: 11.1,
    V: 12.24,
    W: 7.25,
    label: 'Schonrich, Binney and Dehnen 2010 (U, V, W)',
  }),
  stromberg: Object.freeze({
    U: 11.1,
    V: 3.77,
    W: 7.25,
    label:
      "the Stromberg-corrected V of D-GAIA-03, with Schonrich et al.'s U and W",
  }),
  none: Object.freeze({
    U: 0,
    V: 0,
    W: 0,
    label: 'no correction: heliocentric velocities',
  }),
});

/**
 * An option as {name, U, V, W, label}: a name from LSR_OPTIONS or an object
 * {U, V, W} of the caller's own.
 */
export function resolveLsr(option = 'schonrich') {
  if (typeof option === 'string') {
    const o = LSR_OPTIONS[option];
    if (!o)
      throw new RadioError('lsr-option', `unknown LSR option "${option}"`, {
        allowed: Object.keys(LSR_OPTIONS),
      });
    return { name: option, U: o.U, V: o.V, W: o.W, label: o.label };
  }
  if (option && typeof option === 'object') {
    const { U, V, W } = option;
    finite(U, 'U');
    finite(V, 'V');
    finite(W, 'W');
    return { name: 'custom', U, V, W, label: 'the caller supplied (U, V, W)' };
  }
  throw new RadioError('lsr-option', 'an LSR option is a name or {U, V, W}');
}

/** The shift added to a heliocentric velocity, km/s, at (l, b) in degrees. */
export function lsrShift(lDeg, bDeg, option = 'schonrich') {
  const m = resolveLsr(option);
  const l = lDeg * DEG;
  const b = bDeg * DEG;
  return (
    (m.U * Math.cos(l) + m.V * Math.sin(l)) * Math.cos(b) + m.W * Math.sin(b)
  );
}

/**
 * A heliocentric velocity as an LSR velocity.
 * @returns {{v: number, shift: number, lsr: object}} v in km/s
 */
export function heliocentricToLsr(vKmS, lDeg, bDeg, option = 'schonrich') {
  const lsr = resolveLsr(option);
  const shift = lsrShift(lDeg, bDeg, lsr);
  return { v: vKmS + shift, shift, lsr };
}

/** An LSR velocity as a heliocentric one: the inverse of heliocentricToLsr. */
export function lsrToHeliocentric(vKmS, lDeg, bDeg, option = 'schonrich') {
  const lsr = resolveLsr(option);
  const shift = lsrShift(lDeg, bDeg, lsr);
  return { v: vKmS - shift, shift, lsr };
}
