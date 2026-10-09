// =============================================================================
// D2L Brightspace: the grades import file
// -----------------------------------------------------------------------------
// Brightspace's Grades > Import reads a CSV with an identifying column, one
// `<grade item> Points Grade` column per grade item and a last column,
// `End-of-Line Indicator`, holding `#` on every row, which is how the importer
// knows where a line ends. The identifier is the OrgDefinedId by default, or
// the Username.
//
// It has been written from that description of the import and has not been run
// against a live Brightspace: import one student's row first. The grade items
// must exist, with the maximum set to the points possible (the page says what
// that is); Brightspace matches the header on the item's name.
//
// Points only. The value a `Points Grade` column takes is points earned; a
// percentage is not an option here, and no feedback column is written because
// the import takes none.
// =============================================================================

import { toCsv } from '../csv.js';
import { scoreOf, wide } from './model.js';

/** Which of Brightspace's two identifying columns the identifier is. */
export const ID_COLUMNS = Object.freeze(['OrgDefinedId', 'Username']);

/** The columns, as the instructor-flow document lists them. */
export const COLUMNS = Object.freeze([
  {
    name: 'OrgDefinedId | Username',
    from: 'the identifier; the header is the field idColumn names (OrgDefinedId by default)',
    note: 'Written as it is, without the # Brightspace puts in front of an id in its own export.',
  },
  {
    name: '<Activity name> Points Grade',
    from: 'points earned, one column per Activity',
    note: 'The grade item of that name must exist.',
  },
  {
    name: 'End-of-Line Indicator',
    from: 'the character #',
    note: 'On every row, as the importer requires.',
  },
]);

/**
 * @param {object} model - From gradebookModel()
 * @param {object} [options] - Options
 * @param {string} [options.idColumn] - One of ID_COLUMNS
 * @returns {string} CSV, CRLF, header first
 */
export function d2lCsv(model, { idColumn = 'OrgDefinedId' } = {}) {
  const col = ID_COLUMNS.includes(idColumn) ? idColumn : ID_COLUMNS[0];
  const { students, titles } = wide(model);
  const keys = model.activities.map(a => a.key);
  const rows = [
    [
      col,
      ...keys.map(k => `${titles.get(k)} Points Grade`),
      'End-of-Line Indicator',
    ],
  ];
  for (const s of students)
    rows.push([
      s.identifier,
      ...keys.map(k =>
        s.cells.has(k) ? scoreOf(s.cells.get(k), 'points') : ''
      ),
      '#',
    ]);
  return toCsv(rows);
}
