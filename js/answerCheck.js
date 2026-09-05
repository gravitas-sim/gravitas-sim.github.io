// =============================================================================
// Answer checking
// -----------------------------------------------------------------------------
// Extracted from investigations.js so that it depends on almost nothing.
//
// The lesson engine imports ui.js, which needs a browser. The instructor answer
// keys are generated at build time in Node, and they have to be judged right or
// wrong by *exactly* the rule the website applies, or the key that goes to a
// class disagrees with the site the class is using. One function, imported by
// both, is the only way to be sure of that.
//
// It reads a student's number through js/answerParse.js rather than stripping
// characters out of it. The reasoning, and the five things the old line got
// wrong, are in that file's header. What matters here is that grading now has
// three outcomes rather than two: right, wrong, and *not readable* - and the
// third is not the same as wrong. A student who typed "5 km" where the answer
// is in AU has not answered incorrectly, they have answered a different
// question, and telling them so is worth more than a red cross.
// =============================================================================

import { parseAnswer } from './answerParse.js';

/**
 * Decide whether a student's answer is correct.
 *
 * @param {Object} step - Step definition
 * @param {*} value - The student's answer
 * @param {Object} [options]
 * @param {string} [options.locale] - For the decimal separator
 * @returns {boolean|null} True, false, or null when the step is not graded
 */
export function checkAnswer(step, value, { locale = 'en' } = {}) {
  if (!step) return null;
  if (step.kind === 'choice' || step.type === 'predict') {
    if (typeof step.answer !== 'number') return null;
    return Number(value) === step.answer;
  }
  if (step.kind === 'numeric') {
    const read = parseAnswer(value, step, locale);
    // Unreadable is not correct. gradeAnswer() below is what a caller uses when
    // it wants to tell the student *why*; this keeps the boolean contract the
    // report, the answer key and every existing caller already rely on.
    if (!read.ok) return false;
    return withinTolerance(read.value, step);
  }
  return null;
}

/**
 * Grade an answer and say what happened, for a caller that can show it.
 *
 * The same decision as checkAnswer, with the reasoning attached. Kept beside it
 * rather than in the panel so the instructor materials can describe the same
 * refusals the site gives.
 *
 * @param {Object} step - Step definition
 * @param {*} value - The student's answer
 * @param {Object} [options]
 * @param {string} [options.locale] - For the decimal separator
 * @returns {{status: string, correct: ?boolean, value: ?number, reason: ?string,
 *   detail: ?Object, unit: ?string, converted: boolean}} What to say
 */
export function gradeAnswer(step, value, { locale = 'en' } = {}) {
  const blank = {
    status: 'ungraded',
    correct: null,
    value: null,
    reason: null,
    detail: null,
    unit: null,
    converted: false,
  };
  if (!step) return blank;

  if (step.kind === 'choice' || step.type === 'predict') {
    if (typeof step.answer !== 'number') return blank;
    const correct = Number(value) === step.answer;
    return { ...blank, status: correct ? 'correct' : 'incorrect', correct };
  }

  if (step.kind !== 'numeric') return blank;

  const read = parseAnswer(value, step, locale);
  if (!read.ok) {
    return {
      ...blank,
      status: 'unreadable',
      correct: false,
      reason: read.reason,
      detail: read.detail ?? null,
    };
  }

  const correct = withinTolerance(read.value, step);
  return {
    status: correct ? 'correct' : 'incorrect',
    correct,
    value: read.value,
    reason: null,
    detail: null,
    unit: read.unit,
    converted: read.converted,
  };
}

/**
 * Whether a number is inside the step's tolerance.
 *
 * The slack is because binary floating point does not represent most decimals
 * exactly: |7.6 - 8| evaluates to 0.4000000000000004, so a student who worked
 * out exactly the value at the edge of the stated tolerance was being told they
 * were wrong by four parts in 10^16.
 *
 * @param {number} n - The parsed answer
 * @param {Object} step - Step definition
 * @returns {boolean} Whether it counts
 */
function withinTolerance(n, step) {
  const tol = toleranceFor(step);
  return Math.abs(n - step.answer) <= tol * (1 + 1e-9) + 1e-12;
}

/**
 * The tolerance a numeric step actually applies, including the default.
 * @param {Object} step - Step definition
 * @returns {number|null} Tolerance, or null when the step is not numeric
 */
export function toleranceFor(step) {
  if (step?.kind !== 'numeric') return null;
  return step.tolerance ?? Math.abs(step.answer) * 0.05;
}
