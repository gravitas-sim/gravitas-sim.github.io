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
// Pure: no DOM, no imports. Browser and Node alike.
// =============================================================================

/**
 * Every unit, by its canonical id. `factor` is the size of one of these in the
 * dimension's base unit; `symbol` is how the page writes it.
 */
export const UNITS = Object.freeze({
  '': { dim: 'ratio', factor: 1, symbol: '' },
  ppm: { dim: 'ratio', factor: 1e-6, symbol: 'ppm' },
  ppt: { dim: 'ratio', factor: 1e-3, symbol: 'ppt' },
  '%': { dim: 'ratio', factor: 1e-2, symbol: '%' },

  s: { dim: 'time', factor: 1, symbol: 's' },
  min: { dim: 'time', factor: 60, symbol: 'min' },
  h: { dim: 'time', factor: 3600, symbol: 'h' },
  d: { dim: 'time', factor: 86400, symbol: 'd' },

  Angstrom: { dim: 'length', factor: 1e-10, symbol: 'Å' },
  nm: { dim: 'length', factor: 1e-9, symbol: 'nm' },
  um: { dim: 'length', factor: 1e-6, symbol: 'µm' },
  m: { dim: 'length', factor: 1, symbol: 'm' },
  km: { dim: 'length', factor: 1e3, symbol: 'km' },
  AU: { dim: 'length', factor: 1.495978707e11, symbol: 'AU' },
  pc: { dim: 'length', factor: 3.085677581491367e16, symbol: 'pc' },
  Mpc: { dim: 'length', factor: 3.085677581491367e22, symbol: 'Mpc' },

  Hz: { dim: 'frequency', factor: 1, symbol: 'Hz' },
  kHz: { dim: 'frequency', factor: 1e3, symbol: 'kHz' },
  MHz: { dim: 'frequency', factor: 1e6, symbol: 'MHz' },
  GHz: { dim: 'frequency', factor: 1e9, symbol: 'GHz' },

  // A flux per unit wavelength, in erg s^-1 cm^-2 Angstrom^-1. One W m^-2
  // nm^-1 is 1e7 erg s^-1 over 1e4 cm^2 over 10 Angstrom, which is 100.
  'erg/s/cm2/Angstrom': {
    dim: 'flux-per-wavelength',
    factor: 1,
    symbol: 'erg s⁻¹ cm⁻² Å⁻¹',
  },
  'W/m2/nm': { dim: 'flux-per-wavelength', factor: 100, symbol: 'W m⁻² nm⁻¹' },
  // A flux per unit frequency. Not convertible to the one above by a factor.
  Jy: { dim: 'flux-per-frequency', factor: 1, symbol: 'Jy' },
  mJy: { dim: 'flux-per-frequency', factor: 1e-3, symbol: 'mJy' },
  mag: { dim: 'magnitude', factor: null, symbol: 'mag' },

  kg: { dim: 'mass', factor: 1, symbol: 'kg' },
  // The IAU 2015 nominal solar mass parameter over CODATA 2018 G.
  Msun: { dim: 'mass', factor: 1.988409870698051e30, symbol: 'M☉' },

  rad: { dim: 'angle', factor: 1, symbol: 'rad' },
  deg: { dim: 'angle', factor: Math.PI / 180, symbol: '°' },
  arcmin: { dim: 'angle', factor: Math.PI / 10800, symbol: '′' },
  arcsec: { dim: 'angle', factor: Math.PI / 648000, symbol: '″' },

  'm/s': { dim: 'velocity', factor: 1, symbol: 'm/s' },
  'km/s': { dim: 'velocity', factor: 1e3, symbol: 'km/s' },

  K: { dim: 'temperature', factor: 1, symbol: 'K' },
  'electron/s': { dim: 'count-rate', factor: 1, symbol: 'e⁻/s' },
  count: { dim: 'count', factor: 1, symbol: 'counts' },
  pix: { dim: 'pixel', factor: 1, symbol: 'px' },
});

/**
 * Spellings in the data Gravitas already ships, and the common ones in a
 * spreadsheet a student made, mapped to a canonical id. An exact match on the
 * whole string, after trimming and ignoring case: no pattern matching that
 * could turn "m" in "mag" into a meter.
 */
const ALIASES = new Map(
  Object.entries({
    dimensionless: '',
    ratio: '',
    relative: '',
    fraction: '',
    'parts per million': 'ppm',
    percent: '%',
    sec: 's',
    second: 's',
    seconds: 's',
    minute: 'min',
    minutes: 'min',
    hr: 'h',
    hour: 'h',
    hours: 'h',
    day: 'd',
    days: 'd',
    å: 'Angstrom',
    angstrom: 'Angstrom',
    angstroms: 'Angstrom',
    'angstrom, vacuum': 'Angstrom',
    'angstrom, air': 'Angstrom',
    nanometre: 'nm',
    nanometer: 'nm',
    micron: 'um',
    microns: 'um',
    µm: 'um',
    'erg / s / cm^2 / angstrom': 'erg/s/cm2/Angstrom',
    'erg/s/cm^2/angstrom': 'erg/s/cm2/Angstrom',
    'erg s-1 cm-2 angstrom-1': 'erg/s/cm2/Angstrom',
    'w / m^2 / nm': 'W/m2/nm',
    jansky: 'Jy',
    mags: 'mag',
    magnitude: 'mag',
    m_sun: 'Msun',
    msun: 'Msun',
    'solar mass': 'Msun',
    'solar masses': 'Msun',
    degree: 'deg',
    degrees: 'deg',
    'km s-1': 'km/s',
    'm s-1': 'm/s',
    kelvin: 'K',
    'e-/s': 'electron/s',
    'electrons/s': 'electron/s',
    counts: 'count',
    pixel: 'pix',
    pixels: 'pix',
  })
);

/**
 * Case is ignored only for ids of three letters or more: `MPC` is a
 * megaparsec, but `M` is not a meter and `S` is not a second.
 */
const BY_LOWER = new Map(
  Object.keys(UNITS)
    .filter(id => id.length >= 3)
    .map(id => [id.toLowerCase(), id])
);

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
  const key = s.toLowerCase();
  // Aliases are matched without case; an alias that needs its case, like the
  // symbol Å, is written in the table as the lower-case form it folds to.
  const id = Object.hasOwn(UNITS, s)
    ? s
    : (ALIASES.get(key) ?? BY_LOWER.get(key));
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
  const power = 10 ** exp === unit.scale ? `10^${exp}` : String(unit.scale);
  return symbol ? `${power} ${symbol}` : power;
}

/** A unit as a string the registry reads back: the canonical id, scaled. */
export function unitId(unit) {
  if (!unit) return null;
  return unit.scale === 1 ? unit.id : `${unit.scale} ${unit.id}`;
}

/**
 * Why one unit cannot become another, or null when it can.
 * @returns {string|null}
 */
export function cannotConvert(from, to) {
  if (!from)
    return 'its unit is not stated, so there is nothing to convert from';
  if (!to) return 'there is no unit to convert to';
  const a = UNITS[from.id];
  const b = UNITS[to.id];
  if (a.dim === 'magnitude' || b.dim === 'magnitude') {
    return from.id === to.id && from.scale === to.scale
      ? null
      : 'magnitudes are logarithmic and need a zero point';
  }
  if (a.dim !== b.dim) {
    if (
      new Set([a.dim, b.dim]).size === 2 &&
      [a.dim, b.dim].every(d => d.startsWith('flux-per-'))
    ) {
      return 'a flux per wavelength and a flux per frequency differ by the wavelength of each sample, not by a factor';
    }
    return `${a.dim} cannot become ${b.dim}`;
  }
  return null;
}

/**
 * The factor that turns a value in `from` into one in `to`.
 * @throws {Error} With the reason, when they do not convert
 */
export function conversionFactor(from, to) {
  const why = cannotConvert(from, to);
  if (why) throw new Error(why);
  if (UNITS[from.id].factor === null) return 1;
  return (
    (from.scale * UNITS[from.id].factor) / (to.scale * UNITS[to.id].factor)
  );
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
