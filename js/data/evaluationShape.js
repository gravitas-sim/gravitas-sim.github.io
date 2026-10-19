import { ID_EVALUATION } from '../names.js';
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
export const EVALUATION_KIND = ID_EVALUATION;

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

/**
 * The draft version 2 concept items' ids (`concept/2`), each with four choices.
 * Disjoint from CONCEPT_IDS on purpose: a sheet of one version has nothing in
 * common with the other's columns, so the two cannot be scored or pooled as
 * one. DRAFT: see LEARNING_STUDY.md 2.5.
 */
export const CONCEPT_V2_IDS = Object.freeze([
  'r01',
  'r02',
  'r03',
  'r04',
  'r05',
  'r06',
  'r07',
  'r08',
  'r09',
  'r10',
  'r11',
  'r12',
  'r13',
  'r14',
  'r15',
  'r16',
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

/** The `instrument` value an export of the draft version 2 carries. */
export const CONCEPT_V2_INSTRUMENT = 'concept/2';

/** The columns of a draft version 2 concept CSV, in order. */
export const CONCEPT_V2_COLUMNS = Object.freeze([
  'schema',
  'instrument',
  'occasion',
  'participant',
  ...CONCEPT_V2_IDS,
]);
