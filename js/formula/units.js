// =============================================================================
// Dimensions, constants and unit text for the formula language
// -----------------------------------------------------------------------------
// The registry (js/units/registry.js) names a dimension and a factor for every
// unit, but not what a dimension is made of: it cannot say that a velocity
// times a time is a length. This is that table. Every registry dimension is
// written as exponents of the SI base units (and of three things that are not
// SI: counts, pixels and the logarithmic or simulation quantities), with the
// factor from the registry's base unit into the coherent SI unit of those
// exponents. A value is then held in coherent SI while it is computed, so a
// kilometer over a meter is 1000 without any conversion code, and it is
// written back in a registry unit at the end.
//
// Angles are dimensionless, as in SI: a radian is a ratio. Whether a number is
// an angle is carried beside the dimension (`a`), so that sin(x) takes
// radians, sind(x) takes degrees, and an angle added to a plain number is
// refused instead of being read as either.
//
// A magnitude, a logarithm (dex) and a simulation unit are not multiplicative
// and have an axis each: they can be added to and subtracted from their own
// kind and nothing else.
//
// Pure: no DOM. Browser and Node alike.
// =============================================================================

import { UNITS, unitIdOf } from '../units/registry.js';

/** The axes of a dimension vector: SI symbols, then the three non-SI ones. */
export const AXES = Object.freeze([
  'm',
  'kg',
  's',
  'K',
  'ct',
  'px',
  'mag',
  'dex',
  'sim',
]);
/** The first of the axes that are not multiplicative. */
const OPAQUE_FROM = 6;

const vec = o => AXES.map(a => o[a] ?? 0);
export const ZERO = vec({});

/**
 * Every registry dimension: its exponents and the factor from the registry's
 * base unit of that dimension into coherent SI. A test holds this to the
 * registry, so a dimension added there is refused here until it is written.
 */
export const DIMS = Object.freeze({
  ratio: [ZERO, 1],
  angle: [ZERO, 1],
  // One arcsec^2 in steradians, which are dimensionless.
  'solid-angle': [ZERO, (Math.PI / 648000) ** 2],
  time: [vec({ s: 1 }), 1],
  length: [vec({ m: 1 }), 1],
  frequency: [vec({ s: -1 }), 1],
  'angular-rate': [vec({ s: -1 }), 1],
  velocity: [vec({ m: 1, s: -1 }), 1],
  mass: [vec({ kg: 1 }), 1],
  density: [vec({ kg: 1, m: -3 }), 1],
  power: [vec({ kg: 1, m: 2, s: -3 }), 1],
  temperature: [vec({ K: 1 }), 1],
  // erg s^-1 cm^-2 A^-1 is 1e7 W m^-3; a jansky is 1e-26 W m^-2 Hz^-1.
  'flux-per-wavelength': [vec({ kg: 1, m: -1, s: -3 }), 1e7],
  'flux-per-frequency': [vec({ kg: 1, s: -2 }), 1e-26],
  'count-rate': [vec({ ct: 1, s: -1 }), 1],
  count: [vec({ ct: 1 }), 1],
  pixel: [vec({ px: 1 }), 1],
  magnitude: [vec({ mag: 1 }), 1],
  logarithm: [vec({ dex: 1 }), 1],
  simulation: [vec({ sim: 1 }), 1],
});

/** Whether a dimension vector has a non-multiplicative axis. */
export const isOpaque = v => v.some((e, i) => e !== 0 && i >= OPAQUE_FROM);
export const isZero = v => v.every(e => e === 0);
export const sameDim = (a, b) => a.every((e, i) => e === b[i]);
export const addDim = (a, b, k = 1) => a.map((e, i) => e + k * b[i]);
export const scaleDim = (a, p) => a.map(e => e * p + 0);
/** Whether every exponent is a whole or a half number. */
export const halfSteps = v =>
  v.every(e => Math.abs(e * 2 - Math.round(e * 2)) < 1e-9);

/**
 * A dimension as the SI units it is made of, which every language reads alike:
 * `m s^-1`; `1` for none.
 * @param {number[]} v - A dimension vector
 * @returns {string}
 */
export function showDim(v) {
  const parts = v
    .map((e, i) => (e === 0 ? '' : e === 1 ? AXES[i] : `${AXES[i]}^${e}`))
    .filter(Boolean);
  return parts.length ? parts.join(' ') : '1';
}

/**
 * How many coherent SI units one of a registry unit is.
 * @param {string} id - A registry unit id
 * @returns {number}
 */
export function multOf(id) {
  const u = UNITS[id];
  return u.factor === null ? 1 : u.factor * DIMS[u.dim][1];
}

/**
 * Pinned constants: the CODATA 2018 values (exact where the 2019 SI defines
 * them), and the IAU nominal values the registry already holds for the
 * astronomical ones, which are read from it so the two cannot drift. `unit` is
 * the registry unit a bare constant is written in. G and sigma_SB carry their
 * published uncertainty in the last digit and are treated as exact.
 */
export const CONSTANTS = Object.freeze({
  G: { value: 6.6743e-11, dim: vec({ m: 3, kg: -1, s: -2 }) },
  c: { value: 299792458, dim: vec({ m: 1, s: -1 }) },
  k_B: { value: 1.380649e-23, dim: vec({ kg: 1, m: 2, s: -2, K: -1 }) },
  h: { value: 6.62607015e-34, dim: vec({ kg: 1, m: 2, s: -1 }) },
  sigma_SB: { value: 5.670374419e-8, dim: vec({ kg: 1, s: -3, K: -4 }) },
  M_sun: { value: multOf('Msun'), dim: vec({ kg: 1 }), unit: 'Msun' },
  R_sun: { value: multOf('Rsun'), dim: vec({ m: 1 }), unit: 'Rsun' },
  AU: { value: multOf('AU'), dim: vec({ m: 1 }), unit: 'AU' },
  pc: { value: multOf('pc'), dim: vec({ m: 1 }), unit: 'pc' },
  day: { value: multOf('d'), dim: vec({ s: 1 }), unit: 'd' },
  year: { value: multOf('yr'), dim: vec({ s: 1 }), unit: 'yr' },
});

/**
 * A unit as the formula language writes one: a registry id or spelling, with a
 * power of ten in front as data write one (`1e-17 erg/s/cm2/Angstrom`); or a
 * product and quotient of such, with whole powers (`yr^2/AU^3`, `km*s`). A
 * whole spelling is tried first, so `km/s` is the registry's.
 *
 * @param {string} text - As written
 * @returns {{dim: number[], mult: number, id: string|null, scale: number,
 *   text: string, angle: boolean}|null} Null when it is not a unit
 */
export function parseUnitText(text) {
  const s = String(text).trim();
  const whole = /^(?:(1e[+-]?\d+|10\^[+-]?\d+)\s+)?(.+)$/i.exec(s);
  const scale = whole?.[1] ? Number(whole[1].replace(/^10\^/, '1e')) : 1;
  const id = whole ? unitIdOf(whole[2]) : undefined;
  if (id !== undefined) {
    const u = UNITS[id];
    return {
      dim: DIMS[u.dim][0],
      mult: scale * multOf(id),
      id,
      scale,
      text: s,
      angle: u.dim === 'angle',
    };
  }
  const parts = s.split(/([*/])/);
  if (parts.length < 3 || parts.length > 15) return null;
  let dim = ZERO;
  let mult = 1;
  let sign = 1;
  for (const [k, part] of parts.entries()) {
    if (k % 2) {
      sign = part === '*' ? 1 : -1;
      continue;
    }
    const m = /^\s*(.+?)(?:\^(-?\d))?\s*$/.exec(part);
    const f = m && unitIdOf(m[1]);
    if (f === undefined || f === null || UNITS[f].factor === null) return null;
    const p = sign * (m[2] === undefined ? 1 : Number(m[2]));
    dim = addDim(dim, DIMS[UNITS[f].dim][0], p);
    mult *= multOf(f) ** p;
    // A "/" divides the factor that follows it, not everything after it.
    sign = 1;
  }
  return { dim, mult, id: null, scale: 1, text: s, angle: false };
}

/**
 * The registry unit a dimension is written in when nothing says which: the
 * first of its units that is one coherent SI unit, else the first it has.
 * @param {number[]} v - A dimension vector
 * @returns {string|null} A registry id, or null when the registry has no unit
 *   of that dimension (a time squared per length cubed)
 */
export function unitFor(v) {
  let first = null;
  for (const [id, u] of Object.entries(UNITS)) {
    if (!sameDim(DIMS[u.dim][0], v)) continue;
    if (multOf(id) === 1) return id;
    first ??= id;
  }
  return first;
}
