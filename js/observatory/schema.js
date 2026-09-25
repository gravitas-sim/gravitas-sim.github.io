// =============================================================================
// gravitas.observation/1: one shape for everything the workspace holds
// -----------------------------------------------------------------------------
// A data pack (DATA_PACKS.md) is how an observation is shipped: its record,
// its pins, its encoding. This is how one is held and worked on, whatever it
// came from - a pack, a dataset Gravitas has carried since before packs, or a
// file a reader chose - and it is the shape the workspace exports, so a file
// it writes is a file it reads back.
//
//   {
//     format: 'gravitas.observation', formatVersion: 1,
//     kind: 'time-series' | 'spectrum' | 'image' | 'table',
//     id, title,
//     object:  { name, ra, dec, frame } | null,      degrees
//     facility, origin: 'observed' | 'model' | 'compilation' | 'imported',
//     source:  { kind: 'pack' | 'builtin' | 'import', id, version, file? },
//     credit, license, retrieved, citations: [{ text, url? }],
//     reductions: [text],       what was done to it before it arrived
//     columns: [{ id, name, unit, role, of?, level?, bits?, values }],
//     axes: { x, y },           the column ids a plot draws by default
//     time?:     { column, format, scale },           time-series
//     spectral?: { column, quantity, medium, frame },  spectrum
//     image?:    { width, height, wcs, x, y, value },  image
//     masks: [{ id, label, source: 'source' | 'reader', rows }],
//     annotations: [{ id, rows, text }],
//   }
//
// The contracts every view and every transformation keep:
//
// - **Units.** A column's `unit` is a canonical id from ./units.js, scaled by
//   a power of ten where the data is (SDSS flux is `1e-17 erg/s/cm2/Angstrom`),
//   `''` for dimensionless, or null for not stated. Nothing converts a column
//   whose unit is not stated.
// - **Uncertainty.** A column with role `uncertainty` is one standard
//   deviation of the column it is `of`, in that column's unit. `lower` and
//   `upper` are offsets from it to the edges of an interval holding `level`
//   of the probability (0.9 for GWOSC's catalog). A value column with none
//   has no uncertainty recorded, and the page says so rather than drawing
//   none.
// - **Missing values** are NaN in a number column and null in a text one:
//   never zero, never dropped. They are counted and shown as missing.
// - **Masks** name rows, by index, that the views and every summary leave out
//   and every export keeps, marked. A `source` mask came with the data; a
//   `reader` mask is the reader's, and is undone like any other change.
// - **Flags.** A column with role `flag` holds bit fields, and `bits` says
//   what each bit means and where that meaning comes from.
// - **Coordinates** are degrees, with the frame named; an image's `wcs` is a
//   FITS TAN projection (./wcs.js). **Time** is a format and a scale
//   (./units.js TIME_FORMATS, TIME_SCALES); a spectrum's axis names its
//   quantity, its medium (vacuum or air) and its frame.
// - **Provenance** travels with the observation: its source, credit, license,
//   citations, what was done to it before it arrived, and - in an export -
//   every change made in the workspace (./transforms.js), in order, so the
//   same source and the same list of changes give the same file.
//
// Pure: no DOM. Browser and Node alike.
// =============================================================================

import { TIME_FORMATS, TIME_SCALES, dimensionOf, parseUnit } from './units.js';

export const FORMAT = 'gravitas.observation';
export const FORMAT_VERSION = 1;
export const KINDS = Object.freeze([
  'time-series',
  'spectrum',
  'image',
  'table',
]);
export const ROLES = Object.freeze([
  'x',
  'value',
  'uncertainty',
  'lower',
  'upper',
  'flag',
  'label',
]);
export const ORIGINS = Object.freeze([
  'observed',
  'model',
  'compilation',
  'imported',
]);
export const SOURCE_KINDS = Object.freeze(['pack', 'builtin', 'import']);
export const MEDIA = Object.freeze(['vacuum', 'air', 'unknown']);

/** Roles a column may only have alongside the column they are `of`. */
const DEPENDENT = new Set(['uncertainty', 'lower', 'upper']);

/**
 * The column with this id.
 * @returns {object|undefined}
 */
export const columnOf = (o, id) => o.columns.find(c => c.id === id);

/** How many rows an observation has. */
export const rowCount = o => o.columns[0]?.values.length ?? 0;

/**
 * The columns that describe the uncertainty of one column.
 * @returns {{sigma?: object, lower?: object, upper?: object}}
 */
export function uncertaintyOf(o, id) {
  const out = {};
  for (const c of o.columns) {
    if (c.of !== id) continue;
    if (c.role === 'uncertainty') out.sigma = c;
    if (c.role === 'lower') out.lower = c;
    if (c.role === 'upper') out.upper = c;
  }
  return out;
}

/** Row indices a mask covers, all masks together, as a Set. */
export function maskedRows(o) {
  const out = new Set();
  for (const m of o.masks || []) for (const r of m.rows) out.add(r);
  return out;
}

/** How many values of a column are missing. */
export function missingCount(column) {
  let n = 0;
  for (const v of column.values) {
    if (
      v === null ||
      v === undefined ||
      (typeof v === 'number' && Number.isNaN(v))
    )
      n++;
  }
  return n;
}

/**
 * Everything wrong with an observation, each with where it is.
 * @returns {Array<{path: string, message: string}>} Empty when it is valid
 */
export function validateObservation(o) {
  const out = [];
  const need = (ok, path, message) => {
    if (!ok) out.push({ path, message });
    return ok;
  };
  if (!need(o && typeof o === 'object', '', 'is not an object')) return out;
  need(o.format === FORMAT, 'format', `is not ${FORMAT}`);
  need(o.formatVersion === FORMAT_VERSION, 'formatVersion', 'is not 1');
  need(KINDS.includes(o.kind), 'kind', `is not one of ${KINDS.join(', ')}`);
  need(typeof o.id === 'string' && o.id !== '', 'id', 'is required');
  need(typeof o.title === 'string' && o.title !== '', 'title', 'is required');
  need(
    ORIGINS.includes(o.origin),
    'origin',
    `is not one of ${ORIGINS.join(', ')}`
  );
  need(
    SOURCE_KINDS.includes(o.source?.kind),
    'source.kind',
    `is not one of ${SOURCE_KINDS.join(', ')}`
  );
  if (o.origin === 'imported') {
    need(
      o.source?.kind === 'import',
      'source.kind',
      'an imported observation came from a file'
    );
  } else {
    // Anything the workspace did not import names who to credit.
    need(
      typeof o.credit === 'string' && o.credit !== '',
      'credit',
      'is required'
    );
    need(
      o.license && typeof o.license.status === 'string',
      'license',
      'is required'
    );
  }
  if (o.object) {
    if (o.object.ra !== undefined || o.object.dec !== undefined) {
      need(
        Number.isFinite(o.object.ra) && o.object.ra >= 0 && o.object.ra < 360,
        'object.ra',
        'is degrees in [0, 360)'
      );
      need(
        Number.isFinite(o.object.dec) && Math.abs(o.object.dec) <= 90,
        'object.dec',
        'is degrees in [-90, 90]'
      );
      need(
        typeof o.object.frame === 'string',
        'object.frame',
        'names the frame'
      );
    }
  }
  if (
    !need(Array.isArray(o.columns) && o.columns.length, 'columns', 'is empty')
  )
    return out;

  const n = o.columns[0].values?.length ?? 0;
  need(n > 0, 'columns', 'hold no rows');
  const ids = new Set();
  o.columns.forEach((c, i) => {
    const at = `columns[${i}]`;
    need(typeof c.id === 'string' && c.id !== '', `${at}.id`, 'is required');
    need(!ids.has(c.id), `${at}.id`, `repeats "${c.id}"`);
    ids.add(c.id);
    need(
      typeof c.name === 'string' && c.name !== '',
      `${at}.name`,
      'is required'
    );
    need(
      ROLES.includes(c.role),
      `${at}.role`,
      `is not one of ${ROLES.join(', ')}`
    );
    need(
      (Array.isArray(c.values) || ArrayBuffer.isView(c.values)) &&
        c.values.length === n,
      `${at}.values`,
      `holds ${c.values?.length ?? 0} values, not ${n}`
    );
    if (c.role === 'label') return;
    const parsed = parseUnit(c.unit);
    need(parsed.ok, `${at}.unit`, parsed.reason);
    if (c.role === 'flag') {
      need(
        Array.isArray(c.bits) &&
          c.bits.every(
            b =>
              Number.isInteger(b.value) &&
              b.value > 0 &&
              typeof b.meaning === 'string'
          ),
        `${at}.bits`,
        'says what each bit means'
      );
    }
    if (DEPENDENT.has(c.role)) {
      need(
        o.columns.some(
          d => d.id === c.of && d.role !== c.role && !DEPENDENT.has(d.role)
        ),
        `${at}.of`,
        'names no value column'
      );
      if (c.role !== 'uncertainty') {
        need(
          c.level > 0 && c.level < 1,
          `${at}.level`,
          'is the probability the interval holds'
        );
      }
    }
  });

  for (const axis of ['x', 'y']) {
    need(ids.has(o.axes?.[axis]), `axes.${axis}`, 'names no column');
  }
  // A time series folded and then binned has phase along its axis and no
  // time column left; any other time series names its time system.
  const phased = o.kind === 'time-series' && !o.time && o.axes?.x === 'phase';
  if (o.kind === 'time-series' && !phased) {
    const t = o.time;
    if (need(ids.has(t?.column), 'time.column', 'names no column')) {
      need(
        dimensionOf(parseUnit(columnOf(o, t.column).unit).unit) === 'time',
        'time.column',
        'is not a time'
      );
    }
    need(
      Object.hasOwn(TIME_FORMATS, t?.format),
      'time.format',
      'is not a time format'
    );
    need(TIME_SCALES.includes(t?.scale), 'time.scale', 'is not a time scale');
    if (t && TIME_FORMATS[t.format]?.offset !== null && ids.has(t.column)) {
      need(
        columnOf(o, t.column).unit === 'd',
        'time.column',
        `a ${t.format} is counted in days`
      );
    }
  }
  if (o.kind === 'spectrum') {
    const s = o.spectral;
    if (need(ids.has(s?.column), 'spectral.column', 'names no column')) {
      const dim = dimensionOf(parseUnit(columnOf(o, s.column).unit).unit);
      need(
        (s.quantity === 'wavelength' && dim === 'length') ||
          (s.quantity === 'frequency' && dim === 'frequency'),
        'spectral.quantity',
        'does not match the axis unit'
      );
    }
    need(
      MEDIA.includes(s?.medium),
      'spectral.medium',
      `is not one of ${MEDIA.join(', ')}`
    );
    need(
      typeof s?.frame === 'string' && s.frame !== '',
      'spectral.frame',
      'is required'
    );
  }
  if (o.kind === 'image') {
    const im = o.image;
    need(
      Number.isInteger(im?.width) &&
        Number.isInteger(im?.height) &&
        im.width * im.height === n,
      'image',
      `is not ${n} pixels`
    );
    for (const k of ['x', 'y', 'value'])
      need(ids.has(im?.[k]), `image.${k}`, 'names no column');
  }
  (o.masks || []).forEach((m, i) => {
    need(typeof m.id === 'string', `masks[${i}].id`, 'is required');
    need(
      ['source', 'reader'].includes(m.source),
      `masks[${i}].source`,
      'is source or reader'
    );
    need(
      Array.isArray(m.rows) &&
        m.rows.every(r => Number.isInteger(r) && r >= 0 && r < n),
      `masks[${i}].rows`,
      `are row indices below ${n}`
    );
  });
  (o.annotations || []).forEach((a, i) => {
    need(
      typeof a.text === 'string' && a.text.trim() !== '',
      `annotations[${i}].text`,
      'is empty'
    );
    need(
      Array.isArray(a.rows) &&
        a.rows.length === 2 &&
        a.rows[0] <= a.rows[1] &&
        a.rows[1] < n,
      `annotations[${i}].rows`,
      'is a first and last row'
    );
  });
  return out;
}
