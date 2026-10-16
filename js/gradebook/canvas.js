// =============================================================================
// Canvas: the gradebook import file
// -----------------------------------------------------------------------------
// Canvas's Gradebook > Import reads a CSV whose first columns identify the
// student and whose later columns are assignments. This writes that layout from
// the canonical rows (./model.js) and nothing else.
//
// The layout is the one Canvas's own gradebook export has, which is what its
// importer is documented to take. It has been written from that description
// and has not been run against a live Canvas: import one student's row first.
//
// Matching. Canvas matches a row on any of ID, SIS User ID or SIS Login ID. The
// identifier the instructor chose (a roster id or the name a student typed) is
// written into exactly one of them, the one `idColumn` names, and the other two
// are left empty. `Student` carries the name as typed, for a person's eyes;
// Canvas does not match on it.
//
// An assignment column that Canvas does not know is created by the import, with
// the points possible from the second row. A column for an assignment that
// already exists must carry its number, `Title (12345)`; rename the header
// after export, or pass `columnIds`.
// =============================================================================

import { toCsv } from '../csv.js';
import { scoreOf, wide } from './model.js';

/** Which of Canvas's three identifying columns the identifier goes in. */
export const ID_COLUMNS = Object.freeze(['SIS Login ID', 'SIS User ID', 'ID']);

/** The columns, as the instructor-flow document lists them. */
export const COLUMNS = Object.freeze([
  {
    name: 'Student',
    from: 'name_as_typed',
    note: 'What the student typed into the report; Canvas does not match on it.',
  },
  {
    name: 'ID',
    from: 'the identifier, when idColumn is ID',
    note: 'Empty otherwise.',
  },
  {
    name: 'SIS User ID',
    from: 'the identifier, when idColumn is SIS User ID',
    note: 'Empty otherwise.',
  },
  {
    name: 'SIS Login ID',
    from: 'the identifier, when idColumn is SIS Login ID (the default)',
    note: 'Empty otherwise.',
  },
  { name: 'Section', from: 'nothing', note: 'Always empty.' },
  {
    name: '<Activity name>',
    from: 'points (or percent), one column per Activity',
    note: 'The second row holds the points possible.',
  },
]);

/**
 * @param {object} model - From gradebookModel()
 * @param {object} [options] - Options
 * @param {string} [options.idColumn] - One of ID_COLUMNS
 * @param {'points'|'percent'} [options.scale] - Points earned or a percentage
 * @param {Object<string, string|number>} [options.columnIds] - Canvas
 *   assignment numbers by Activity key, for assignments that already exist
 * @returns {string} CSV, CRLF, header first
 */
export function canvasCsv(
  model,
  { idColumn = 'SIS Login ID', scale = 'points', columnIds = {} } = {}
) {
  const col = ID_COLUMNS.includes(idColumn) ? idColumn : ID_COLUMNS[0];
  const { students, titles } = wide(model);
  const keys = model.activities.map(a => a.key);
  const head = ['Student', 'ID', 'SIS User ID', 'SIS Login ID', 'Section'];
  for (const k of keys)
    head.push(
      columnIds[k] ? `${titles.get(k)} (${columnIds[k]})` : titles.get(k)
    );
  const rows = [head];
  rows.push([
    '    Points Possible',
    '',
    '',
    '',
    '',
    ...model.activities.map(a =>
      scale === 'percent' ? 100 : Math.round(a.pointsPossible * 100) / 100
    ),
  ]);
  for (const s of students)
    rows.push([
      s.name ?? '',
      col === 'ID' ? s.identifier : '',
      col === 'SIS User ID' ? s.identifier : '',
      col === 'SIS Login ID' ? s.identifier : '',
      '',
      ...keys.map(k => (s.cells.has(k) ? scoreOf(s.cells.get(k), scale) : '')),
    ]);
  return toCsv(rows);
}
