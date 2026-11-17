// The authoring rule for a prediction that meets the student's readings (answer/evidence):
// an estimate has a unit and no key, and a reveal's evidence is an earlier field of a measure
// step that comes after the prediction it is held against.

import { isEstimate } from '../investigations/evidence.js';

/**
 * What is wrong with the estimate or the evidence one step declares.
 * @param {Object} step - The step
 * @param {Object[]} steps - The lesson's steps, in order
 * @param {number} at - This step's index
 * @returns {string[]} Messages, none when the step declares neither
 */
export function evidenceProblems(step, steps, at) {
  const bad = [];
  if (isEstimate(step)) {
    if (typeof step.unit !== 'string' || !step.unit.trim())
      bad.push('an estimate names its unit');
    if (step.range !== undefined && typeof step.range !== 'boolean')
      bad.push('range is true or false');
    if (step.options !== undefined || step.answer !== undefined)
      bad.push('an estimate is never marked: it takes no options or answer');
    const out = steps.find(s => s.sid === step.reveal);
    if (step.reveal === undefined)
      bad.push('an estimate names the reveal it is held for');
    else if (out && !out.evidence?.length)
      bad.push(
        `the reveal "${step.reveal}" names no evidence to set the estimate beside`
      );
    else if (out) {
      const f = readingField(steps, out.evidence[0]);
      if (f && typeof step.unit === 'string' && (f.unit || '') !== step.unit)
        bad.push(
          `the estimate is in ${step.unit} and the first reading in ${f.unit || 'no unit'}`
        );
    }
  } else if (step.kind === 'estimate') bad.push('an estimate is a prediction');
  if (step.compare !== undefined && !step.evidence)
    bad.push('compare is the sentence beside evidence');
  if (step.evidence === undefined) return bad;
  const asked = steps.filter(s => s.reveal === step.sid);
  if (!asked.length)
    bad.push('evidence belongs to a step a prediction names as its reveal');
  if (!Array.isArray(step.evidence) || !step.evidence.length)
    return [...bad, 'evidence lists the fields to set beside the prediction'];
  if (
    step.compare !== undefined &&
    (typeof step.compare !== 'string' || !step.compare.trim())
  )
    bad.push('compare is one sentence');
  for (const e of step.evidence) {
    const from = steps.findIndex(s => s.sid === e?.step);
    if (from < 0 || from >= at)
      bad.push(`evidence names "${e?.step}", which is not an earlier step`);
    else if (steps[from].type !== 'measure' || !readingField(steps, e))
      bad.push(
        `evidence "${e.step}.${e.field}" is not a field of a measure step`
      );
    else if (asked.some(p => steps.indexOf(p) >= from))
      bad.push(
        `evidence "${e.step}.${e.field}" comes before the prediction it is held against`
      );
  }
  return bad;
}

const readingField = (steps, e) =>
  steps.find(s => s.sid === e?.step)?.fields?.find(f => f.id === e.field);
