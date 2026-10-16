// =============================================================================
// Rubrics with criteria and levels (Prompt 79)
// -----------------------------------------------------------------------------
// A written answer carries `rubric`, the sentence of what to look for, and may
// carry `rubricCriteria`: up to six criteria, each with two to five levels, best
// first. On a reflection the criteria guide reading and mark nothing. The key
// prints them (js/instructorDocs.js) and the review page shows them beside the
// response (js/submissionReview.js). Kept out of answerKey.js, which the
// composer's route reaches through the authoring rules.
// =============================================================================
import { plainText } from './answerKey.js';

/**
 * A step's rubric criteria as plain text: each a name and its levels, best
 * first, with the points a level is worth where the author gave them.
 * @param {Object} step - Step definition
 * @returns {Array<{name: string, levels: Array<{label: string, points: ?number, text: string}>}>}
 */
export const criteriaOf = step =>
  (Array.isArray(step?.rubricCriteria) ? step.rubricCriteria : []).map(c => ({
    name: plainText(c?.name),
    levels: (Array.isArray(c?.levels) ? c.levels : []).map(l => ({
      label: plainText(l?.label),
      points: Number.isFinite(l?.points) ? l.points : null,
      text: plainText(l?.text),
    })),
  }));

/**
 * What is wrong with a step's rubric criteria; empty when there are none or
 * they are sound. A criterion needs a name and at least two levels, each with a
 * label and what it looks like, and levels that carry points list them best
 * first so a column of a printed rubric reads down.
 * @param {Object} step - Step definition
 * @returns {string[]} Problems, each without the lesson or step it is on
 */
export function rubricProblems(step) {
  if (step?.rubricCriteria === undefined) return [];
  const out = [];
  const list = step.rubricCriteria;
  if (!Array.isArray(list) || !list.length || list.length > 6)
    return ['rubricCriteria must list one to six criteria'];
  if (step.kind !== 'short')
    out.push('rubricCriteria belongs on a written answer');
  list.forEach((c, i) => {
    const at = `rubricCriteria[${i}]`;
    if (!plainText(c?.name)) out.push(`${at} has no name`);
    const levels = Array.isArray(c?.levels) ? c.levels : [];
    if (levels.length < 2 || levels.length > 5)
      out.push(`${at} needs two to five levels`);
    levels.forEach((l, j) => {
      if (!plainText(l?.label)) out.push(`${at}.levels[${j}] has no label`);
      if (!plainText(l?.text)) out.push(`${at}.levels[${j}] says nothing`);
      if (
        l?.points !== undefined &&
        !(Number.isFinite(l.points) && l.points >= 0)
      )
        out.push(`${at}.levels[${j}].points is not a number of points`);
      const prev = levels[j - 1]?.points;
      if (
        Number.isFinite(l?.points) &&
        Number.isFinite(prev) &&
        l.points > prev
      )
        out.push(
          `${at}.levels run best first; level ${j + 1} is worth more than level ${j}`
        );
    });
  });
  return out;
}
