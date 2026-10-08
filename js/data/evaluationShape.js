// =============================================================================
// The classroom evidence kit's shape
// -----------------------------------------------------------------------------
// What the page at /evaluation/ needs of the instruments, and no more: the
// ids, the kind of control each takes, and the fidelity choices. The words of
// every question are in the printed forms (evaluation/index.html) and, with
// the scoring key, in js/data/evaluation.js, which the Node summary tool and
// the tests read. Keeping the two apart is what stops the page downloading a
// second copy of its own questions. tests/evaluationKit.test.js holds this
// file to that one, item by item.
// =============================================================================

/** Bumped when the shape of an exported record changes. */
export const EVALUATION_SCHEMA = 1;

/** The kind marker every export carries, so an importer can refuse a stranger. */
export const EVALUATION_KIND = 'gravitas.evaluation';

/** The concept items' ids, each with four choices (a to d). */
export const CONCEPT_IDS = Object.freeze([
  'q01',
  'q02',
  'q03',
  'q04',
  'q05',
  'q06',
  'q07',
  'q08',
  'q09',
  'q10',
  'q11',
  'q12',
]);

/** The choices of each fidelity item that has them, by id. */
export const FIDELITY_CHOICES = Object.freeze({
  setting: ['lecture', 'lab', 'recitation', 'homework', 'mixed', 'other'],
  grouping: ['alone', 'pairs', 'small groups', 'mixed'],
  intervention: [
    'no',
    'demonstrated the interface only',
    'worked some answers',
    'worked most answers',
  ],
});

/** The fidelity items' ids, in order; a choice item has FIDELITY_CHOICES. */
export const FIDELITY_IDS = Object.freeze([
  'investigations',
  'setting',
  'minutes',
  'grouping',
  'intervention',
  'deviations',
]);

/** The usability items' ids, in order. */
export const USABILITY_IDS = Object.freeze([
  'u1',
  'u2',
  'u3',
  'u4',
  'u5',
  'u6',
  'u7',
  'u8',
  'u9',
]);

/** How many of them, from the first, are agreement ratings; the rest are text. */
export const USABILITY_RATED = 7;

/** Points on the agreement scale, stored as 1-5 in an export. */
export const AGREE_POINTS = 5;

/**
 * The columns a concept-assessment CSV carries, in order.
 *
 * `participant` is the anonymous code and may be blank. There is deliberately
 * no column for a name, an email address, a student number or an institution:
 * a column that exists gets filled in, and a spreadsheet with a name column is
 * a spreadsheet that cannot be handed to anybody.
 */
export const CONCEPT_COLUMNS = Object.freeze([
  'schema',
  'instrument',
  'occasion',
  'participant',
  ...CONCEPT_IDS,
]);
