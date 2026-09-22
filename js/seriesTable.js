// =============================================================================
// The numbers behind a plot, as a table somebody can read
// -----------------------------------------------------------------------------
// The light curve, the radial-velocity trace and the rotation curve are drawn
// to a canvas, which is opaque to assistive technology. Their headline numbers
// were already available as text - the readouts and the investigation probes
// report the depth, the period, the fitted exponent - but the series behind
// them was not: a reader who wanted the fourteenth sample, or wanted to check
// that a dip really is where the readout says, had to look at pixels.
//
// This renders the series as an HTML table. Two decisions do most of the work.
//
// It renders whatever the CSV exporter produced, parsed back with fromCsv().
// The alternative is a second row-builder beside the one in js/dataExport.js,
// and two row-builders agree right up until one of them is changed. Here the
// table and the downloaded file are the same bytes by construction, so "does
// the export match the plot?" and "does the table match the export?" are one
// question with one answer. The cost is parsing a string this process just
// serialized, which happens once when a reader opens the table and never in a
// frame.
//
// It samples rather than paginates. A light curve can run to thousands of
// samples and a table of thousands of rows is not an accessible alternative to
// anything - a screen reader will read "row 1 of 4000" and the reader will
// leave. An evenly spaced subset, with the first and last rows always kept and
// the sampling stated in the caption, is a thing somebody can actually get
// through. The full series stays one button away as CSV, which is the right
// home for all four thousand rows.
// =============================================================================

import { t, getLocale, registerMessages } from './i18n/index.js';
import { fromCsv } from './csv.js';

/**
 * Bring in this feature's own strings, for the locale in use.
 *
 * They are not in the deferred catalog, and that is deliberate: four separate
 * bundles embed that catalog, so fifty strings added there are downloaded four
 * times by the reader who needs them and three times by readers who cannot
 * reach the feature at all. That accounted for the whole of a deferred-budget
 * overrun when these strings first landed. The same split js/i18n/en.activities.js
 * made, for the same reason.
 *
 * @returns {Promise<void>} Resolves once t() can answer
 */
export async function ensurePlacementMessages() {
  const locale = getLocale();
  const module =
    locale === 'es'
      ? await import('./i18n/es.placement.js')
      : await import('./i18n/en.placement.js');
  registerMessages(locale, module.ES_PLACEMENT || module.EN_PLACEMENT);
}

/** Rows to show before sampling kicks in. */
export const MAX_ROWS = 200;

/**
 * Take an evenly spaced subset, keeping the ends.
 *
 * The ends matter more than the middle in every series here: the first and last
 * samples are what a reader needs to know the span they are looking at, and an
 * even stride that happened to drop the last row would understate it.
 *
 * @param {Array<Array<string>>} rows - Data rows, no header
 * @param {number} limit - How many to keep
 * @returns {{rows: Array<Array<string>>, stride: number, sampled: boolean}} The subset
 */
export function sampleRows(rows, limit = MAX_ROWS) {
  if (rows.length <= limit) return { rows, stride: 1, sampled: false };
  const stride = Math.ceil(rows.length / limit);
  const out = [];
  for (let i = 0; i < rows.length; i += stride) out.push(rows[i]);
  const last = rows[rows.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return { rows: out, stride, sampled: true };
}

/**
 * A CSV column name as a heading, and its unit as a separate word.
 *
 * The export column names carry their unit as a suffix - `t_days`, `rv_ms`,
 * `r_au` - which is exactly right in a file and wrong read aloud, where
 * "underscore days" is noise. This splits the two so the heading can say
 * "Time (days)" and a screen reader can say something a person would.
 *
 * Unknown columns fall through to the raw name rather than to a guess. A
 * heading that invents a unit is worse than one that shows the column id.
 *
 * @param {string} column - A CSV column name
 * @returns {{label: string, unit: string}} Pieces for the heading
 */
export function headingFor(column) {
  const UNITS = {
    days: 'days',
    d: 'days',
    au: 'AU',
    kms: 'km/s',
    ms: 'm/s',
    solar: 'solar masses',
    deg: 'degrees',
    relative: 'relative',
    pc: 'parsecs',
    mas: 'milliarcseconds',
  };
  const parts = String(column).split('_');
  const tail = parts.length > 1 ? parts[parts.length - 1] : '';
  const unit = UNITS[tail] || '';
  const stem = unit ? parts.slice(0, -1).join(' ') : parts.join(' ');
  const label = t(`series.column.${column}`);
  return {
    // A translated name when the catalog has one, and the column's own words
    // when it does not - so a column added to an exporter tomorrow still gets a
    // readable heading rather than an untranslated message id.
    label: label === `series.column.${column}` ? stem : label,
    unit,
  };
}

/**
 * Build the table for one exported series.
 *
 * @param {string} csv - Whatever the exporter returned
 * @param {object} [opts] - {limit}
 * @returns {{table: ?HTMLTableElement, rows: number, shown: number,
 *   stride: number, sampled: boolean, columns: number}} The table and what is in it
 */
export function buildSeriesTable(csv, { limit = MAX_ROWS } = {}) {
  const parsed = fromCsv(csv);
  const header = parsed[0] || [];
  const body = parsed.slice(1);
  if (!header.length) {
    return {
      table: null,
      rows: 0,
      shown: 0,
      stride: 1,
      sampled: false,
      columns: 0,
    };
  }

  const { rows, stride, sampled } = sampleRows(body, limit);

  const table = document.createElement('table');
  table.className = 'series-table';

  const thead = document.createElement('thead');
  const hrow = document.createElement('tr');
  for (const column of header) {
    const th = document.createElement('th');
    th.scope = 'col';
    const { label, unit } = headingFor(column);
    th.textContent = unit ? `${label} (${unit})` : label;
    hrow.append(th);
  }
  thead.append(hrow);

  const tbody = document.createElement('tbody');
  for (const row of rows) {
    const tr = document.createElement('tr');
    row.forEach((cell, i) => {
      // The first column is the independent variable - time, or radius - and
      // making it a row header is what lets a screen reader say "at 3.2 days,
      // flux 0.991" instead of reading five unlabelled numbers.
      const el = document.createElement(i === 0 ? 'th' : 'td');
      if (i === 0) el.scope = 'row';
      el.textContent = cell;
      tr.append(el);
    });
    tbody.append(tr);
  }

  table.append(thead, tbody);
  return {
    table,
    rows: body.length,
    shown: rows.length,
    stride,
    sampled,
    columns: header.length,
  };
}

/**
 * One sentence saying what the reader is looking at.
 *
 * Announced and used as the table's caption, because a table that appears with
 * no warning is a table a screen-reader user has to explore to identify.
 *
 * @param {string} name - The series name, already translated
 * @param {{rows: number, shown: number, stride: number, sampled: boolean}} info - From buildSeriesTable
 * @returns {string} The sentence
 */
export function describeTable(name, info) {
  if (!info.rows) return t('series.table.empty', { name });
  return info.sampled
    ? t('series.table.sampled', {
        name,
        shown: info.shown,
        rows: info.rows,
        stride: info.stride,
      })
    : t('series.table.all', { name, rows: info.rows });
}
