// =============================================================================
// The units of Gravitas: one registry
// -----------------------------------------------------------------------------
// Every unit a number in Gravitas can carry, by a canonical id: its dimension,
// the size of one in the dimension's SI base unit, how it is written, and the
// spellings it is read from. The observation workspace, a student's answer
// (js/answerParse.js), the inference core, the experiments and the
// simulation's own readouts (js/units.js) all read this, so a unit means one
// thing everywhere and a new one is added once.
//
// What it holds to:
//   - A unit is never guessed. `''` is dimensionless, and not stated is null,
//     which is a different claim.
//   - Conversion is within one dimension and by a factor. A magnitude, a
//     logarithm or a simulation unit has no factor and converts to nothing but
//     itself; a flux per wavelength does not become a flux per frequency.
//   - The factors are the defined or nominal values: the IAU 2012 AU, the IAU
//     2015 nominal radii and mass parameters over CODATA 2018 G, the Julian
//     year. js/constants.js keeps the simulation's own model constants, which
//     are rounded (AU 1.496e11 m, solar mass 1.989e30 kg) and which the
//     physics validation and every golden are measured against; the two agree
//     to 3e-4 or better, and tests/unitsRegistry.test.js holds that.
//
// Pure: no DOM, no imports. Browser and Node alike.
// =============================================================================

/**
 * Every unit, by canonical id. `factor` is one of it in the dimension's SI
 * base unit, or null where it has none; `symbol` is how it is written, in
 * every locale unless `es` says otherwise; `integer` marks a count that is
 * never shown with a fraction.
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
  yr: { dim: 'time', factor: 31557600, symbol: 'yr', es: 'año' },
  Myr: { dim: 'time', factor: 31557600e6, symbol: 'Myr', es: 'Ma' },
  Gyr: { dim: 'time', factor: 31557600e9, symbol: 'Gyr', es: 'Ga' },

  Angstrom: { dim: 'length', factor: 1e-10, symbol: 'Å' },
  nm: { dim: 'length', factor: 1e-9, symbol: 'nm' },
  um: { dim: 'length', factor: 1e-6, symbol: 'µm' },
  m: { dim: 'length', factor: 1, symbol: 'm' },
  km: { dim: 'length', factor: 1e3, symbol: 'km' },
  Rearth: { dim: 'length', factor: 6.3781e6, symbol: 'R⊕' },
  RJup: { dim: 'length', factor: 7.1492e7, symbol: 'RJ' },
  Rsun: { dim: 'length', factor: 6.957e8, symbol: 'R☉' },
  AU: { dim: 'length', factor: 1.495978707e11, symbol: 'AU', es: 'ua' },
  ly: { dim: 'length', factor: 9460730472580800, symbol: 'ly', es: 'al' },
  pc: { dim: 'length', factor: 3.085677581491367e16, symbol: 'pc' },
  kpc: { dim: 'length', factor: 3.085677581491367e19, symbol: 'kpc' },
  Mpc: { dim: 'length', factor: 3.085677581491367e22, symbol: 'Mpc' },

  Hz: { dim: 'frequency', factor: 1, symbol: 'Hz' },
  kHz: { dim: 'frequency', factor: 1e3, symbol: 'kHz' },
  MHz: { dim: 'frequency', factor: 1e6, symbol: 'MHz' },
  GHz: { dim: 'frequency', factor: 1e9, symbol: 'GHz' },

  // One W m^-2 nm^-1 is 1e7 erg s^-1 over 1e4 cm^2 over 10 Angstrom: 100.
  'erg/s/cm2/Angstrom': {
    dim: 'flux-per-wavelength',
    factor: 1,
    symbol: 'erg s⁻¹ cm⁻² Å⁻¹',
  },
  'W/m2/nm': { dim: 'flux-per-wavelength', factor: 100, symbol: 'W m⁻² nm⁻¹' },
  Jy: { dim: 'flux-per-frequency', factor: 1, symbol: 'Jy' },
  mJy: { dim: 'flux-per-frequency', factor: 1e-3, symbol: 'mJy' },
  mag: { dim: 'magnitude', factor: null, symbol: 'mag' },
  // [Fe/H], log g and log age are written this way: not convertible.
  dex: { dim: 'logarithm', factor: null, symbol: 'dex' },

  kg: { dim: 'mass', factor: 1, symbol: 'kg' },
  // Nominal mass parameters (IAU 2015) over CODATA 2018 G.
  Mearth: { dim: 'mass', factor: 5.972167867791379e24, symbol: 'M⊕' },
  MJup: { dim: 'mass', factor: 1.8981245973360505e27, symbol: 'MJ' },
  Msun: { dim: 'mass', factor: 1.988409870698051e30, symbol: 'M☉' },

  'kg/m3': { dim: 'density', factor: 1, symbol: 'kg/m³' },
  'g/cm3': { dim: 'density', factor: 1e3, symbol: 'g/cm³' },

  rad: { dim: 'angle', factor: 1, symbol: 'rad' },
  deg: { dim: 'angle', factor: Math.PI / 180, symbol: '°' },
  arcmin: { dim: 'angle', factor: Math.PI / 10800, symbol: '′' },
  arcsec: { dim: 'angle', factor: Math.PI / 648000, symbol: '″' },
  mas: { dim: 'angle', factor: Math.PI / 648000000, symbol: 'mas' },
  arcsec2: { dim: 'solid-angle', factor: 1, symbol: 'arcsec²' },

  'm/s': { dim: 'velocity', factor: 1, symbol: 'm/s' },
  'km/h': { dim: 'velocity', factor: 1 / 3.6, symbol: 'km/h' },
  'km/s': { dim: 'velocity', factor: 1e3, symbol: 'km/s' },
  'AU/yr': {
    dim: 'velocity',
    factor: 1.495978707e11 / 31557600,
    symbol: 'AU/yr',
    es: 'ua/año',
  },

  K: { dim: 'temperature', factor: 1, symbol: 'K' },
  'electron/s': { dim: 'count-rate', factor: 1, symbol: 'e⁻/s' },
  count: {
    dim: 'count',
    factor: 1,
    symbol: 'counts',
    es: 'cuentas',
    integer: true,
  },
  pix: { dim: 'pixel', factor: 1, symbol: 'px', integer: true },

  // The simulation's own units, which are not physical ones: an energy or an
  // angular momentum in them compares with itself and converts to nothing.
  sim: { dim: 'simulation', factor: null, symbol: 'sim' },
});

/**
 * Spellings in the data Gravitas ships and in what people type, mapped to an
 * id. Written in the lower-case form they are matched in; an exact match on
 * the whole string, so "m" in "mag" is never a meter.
 */
export const ALIASES = new Map(
  Object.entries({
    dimensionless: '',
    ratio: '',
    relative: '',
    fraction: '',
    'parts per million': 'ppm',
    percent: '%',
    sec: 's',
    secs: 's',
    second: 's',
    seconds: 's',
    mins: 'min',
    minute: 'min',
    minutes: 'min',
    hr: 'h',
    hrs: 'h',
    hour: 'h',
    hours: 'h',
    day: 'd',
    days: 'd',
    yrs: 'yr',
    year: 'yr',
    years: 'yr',
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
    // Input is wider than presentation: the British spellings are read.
    metre: 'm',
    metres: 'm',
    meter: 'm',
    meters: 'm',
    r_sun: 'Rsun',
    'r☉': 'Rsun',
    r_jup: 'RJup',
    r_earth: 'Rearth',
    'r⊕': 'Rearth',
    au: 'AU',
    'erg / s / cm^2 / angstrom': 'erg/s/cm2/Angstrom',
    'erg/s/cm^2/angstrom': 'erg/s/cm2/Angstrom',
    'erg s-1 cm-2 angstrom-1': 'erg/s/cm2/Angstrom',
    'w / m^2 / nm': 'W/m2/nm',
    jansky: 'Jy',
    mags: 'mag',
    magnitude: 'mag',
    m_sun: 'Msun',
    'm☉': 'Msun',
    'solar mass': 'Msun',
    'solar masses': 'Msun',
    m_earth: 'Mearth',
    'm⊕': 'Mearth',
    m_jup: 'MJup',
    'g/cm³': 'g/cm3',
    'g/cc': 'g/cm3',
    'kg/m³': 'kg/m3',
    degree: 'deg',
    degrees: 'deg',
    '°': 'deg',
    radian: 'rad',
    radians: 'rad',
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

/**
 * The canonical id a spelling names, or undefined.
 * @param {string} text - As written, trimmed
 * @returns {string|undefined}
 */
export function unitIdOf(text) {
  const s = String(text).trim();
  if (Object.hasOwn(UNITS, s)) return s;
  const key = s.toLowerCase();
  return ALIASES.get(key) ?? BY_LOWER.get(key);
}

/**
 * Every spelling of every unit of one dimension, with the factor into `base`:
 * the table a reader of typed input builds. Ids and aliases alike.
 * @param {string} dim - A dimension
 * @param {string} base - The unit the factors are into
 * @returns {Map<string, number>} Spelling to factor
 */
export function spellingsOf(dim, base) {
  const into = UNITS[base].factor;
  const out = new Map();
  for (const [id, u] of Object.entries(UNITS)) {
    if (u.dim === dim && u.factor !== null) out.set(id, u.factor / into);
  }
  for (const [alias, id] of ALIASES) {
    if (out.has(id)) out.set(alias, out.get(id));
  }
  return out;
}

/**
 * How a unit is written in a locale.
 * @param {string} id - Canonical id
 * @param {string} [locale] - 'en', 'es', …
 * @returns {string}
 */
export function symbolOf(id, locale = 'en') {
  const u = UNITS[id];
  if (!u) return id;
  return String(locale).startsWith('es') && u.es ? u.es : u.symbol;
}

/**
 * Why one unit cannot become another, or null when it can.
 * @param {{id: string, scale: number}|null} from
 * @param {{id: string, scale: number}|null} to
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
