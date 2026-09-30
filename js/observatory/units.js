// =============================================================================
// Units and time systems the observation workspace can name and convert
// -----------------------------------------------------------------------------
// Every numeric column in the workspace carries a unit from this registry, or
// says in so many words that it has none: `''` is dimensionless, a ratio such
// as a relative flux, and `null` is "not stated", which is what an imported
// column is until the reader chooses. The two are different claims, and the
// difference is the rule this file exists to hold: a unit is never guessed.
// A header that reads "wavelength (Angstrom)" gives a suggestion the page
// shows and the reader accepts; nothing here fills one in on its own.
//
// Conversion is within one dimension and by a factor, and nothing else:
//   - Angstroms to nanometres, days to hours, parts per million to a fraction.
//   - Not a flux per wavelength to a flux per frequency: that needs the
//     wavelength of every sample, and is a transformation, not a unit change.
//   - Not magnitudes to anything: they are logarithmic and need a zero point.
// A conversion this cannot do is refused with the reason, never approximated.
//
// Time is a unit and a system. A column in days may count from any epoch on
// any time scale, so a time column also names its format (JD, MJD, BJD, BTJD,
// or time since its first sample) and its scale (TDB, UTC, ...). Formats that
// share a system differ by a constant and convert exactly; changing system -
// JD in UTC at the observatory to BJD in TDB at the solar-system barycenter -
// needs the target's position and the observer's, and is refused.
//
// Pure: no DOM. Browser and Node alike.
// =============================================================================

import {
  UNITS,
  cannotConvert,
  conversionFactor,
  unitIdOf,
} from '../units/registry.js';

// The units themselves are js/units/registry.js, the one registry of
// Gravitas; this module reads them the way a data column is written and adds
// the time systems a column also names.
export { UNITS, cannotConvert, conversionFactor };

/** The medium a wavelength is measured in, where the spelling says. */
const MEDIUM = /,\s*(vacuum|air)\s*$/i;

/**
 * Read a unit as the data spells it.
 *
 * A leading power of ten is kept as a scale: `1e-17 erg / s / cm^2 /
 * Angstrom`, the SDSS flux unit, is the flux-per-wavelength unit times 1e-17.
 *
 * @param {string|null} text - As written; null means not stated
 * @returns {{ok: true, unit: {id: string, scale: number}|null, medium?: string}
 *   | {ok: false, reason: string}}
 */
export function parseUnit(text) {
  if (text === null || text === undefined) return { ok: true, unit: null };
  let s = String(text).trim();
  let medium;
  const m = MEDIUM.exec(s);
  if (m) medium = m[1].toLowerCase();
  let scale = 1;
  const scaled = /^(1e[+-]?\d+|10\^[+-]?\d+)\s+(.+)$/i.exec(s);
  if (scaled) {
    scale = Number(scaled[1].replace(/^10\^/, '1e'));
    s = scaled[2];
  }
  const id = unitIdOf(s);
  if (id === undefined) {
    return {
      ok: false,
      reason: `"${text}" is not a unit this workspace knows`,
    };
  }
  return { ok: true, unit: { id, scale }, ...(medium ? { medium } : {}) };
}

/** The unit's dimension, or null when it is not stated. */
export const dimensionOf = unit => (unit ? UNITS[unit.id].dim : null);

/**
 * How the page writes a unit. Not stated is written as such, not as blank.
 * @param {{id: string, scale: number}|null} unit
 * @param {string} [notStated] - What to write for null
 */
export function formatUnit(unit, notStated = 'unit not stated') {
  if (!unit) return notStated;
  const symbol = UNITS[unit.id].symbol;
  if (unit.scale === 1) return symbol;
  const exp = Math.round(Math.log10(unit.scale));
  // Parsed, not raised: `10 ** -17` is not 1e-17 on every engine (pow is not
  // correctly rounded everywhere), and the literal always is.
  const power =
    Number(`1e${exp}`) === unit.scale ? `10^${exp}` : String(unit.scale);
  return symbol ? `${power} ${symbol}` : power;
}

/** A unit as a string the registry reads back: the canonical id, scaled. */
export function unitId(unit) {
  if (!unit) return null;
  return unit.scale === 1 ? unit.id : `${unit.scale} ${unit.id}`;
}

// --- Time ------------------------------------------------------------------------

/**
 * How a time column counts. `offset` is the Julian date the column's zero is
 * at, in days; `barycentric` says whether it is a date at the solar-system
 * barycenter. `relative` counts from the first sample and has no epoch.
 */
export const TIME_FORMATS = Object.freeze({
  JD: { offset: 0, barycentric: false },
  MJD: { offset: 2400000.5, barycentric: false },
  BJD: { offset: 0, barycentric: true },
  BTJD: { offset: 2457000, barycentric: true },
  relative: { offset: null, barycentric: null },
});

/** Time scales a column may say it is in; `unknown` is a statement too. */
export const TIME_SCALES = Object.freeze([
  'TDB',
  'TT',
  'TAI',
  'UTC',
  'unknown',
]);

/**
 * Why a time column cannot change format, or null when it can.
 * @returns {string|null}
 */
export function cannotConvertTime(from, to) {
  const a = TIME_FORMATS[from];
  const b = TIME_FORMATS[to];
  if (!a || !b) return 'not a time format this workspace knows';
  if (a.offset === null || b.offset === null) {
    return from === to
      ? null
      : 'time since the first sample has no epoch to convert from';
  }
  if (a.barycentric !== b.barycentric) {
    return 'a barycentric date and an observatory date differ by the light travel time to the target, which needs its position and the observer’s';
  }
  return null;
}

/**
 * The constant, in days, that turns a time in format `from` into format `to`.
 * @throws {Error} With the reason, when they do not convert
 */
export function timeOffset(from, to) {
  const why = cannotConvertTime(from, to);
  if (why) throw new Error(why);
  if (from === to) return 0;
  return TIME_FORMATS[from].offset - TIME_FORMATS[to].offset;
}
