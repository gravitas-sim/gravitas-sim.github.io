// =============================================================================
// The controlled-run declaration as an authoring rule (`ref/variation`)
// -----------------------------------------------------------------------------
// A step's `variation: {param, values, runFor, read, label}` (js/lesson/runs.js)
// names one numeric key of the scene in force, two to four distinct values, a
// duration in simulated days and the probe rows to read. Node-only, like
// modelChecked.mjs: the sentences an author reads do not ship to students.
// =============================================================================

import { MAX_RUNS, locate, sceneIn } from '../../js/lesson/runs.js';
import { emptyProbeContext } from '../../js/authoring/rules.js';

export const VARIATION_RULE = 'ref/variation';
export const VARIATION_RULE_DESCRIPTION =
  'A controlled run names one parameter of the scene in force, 2 to 4 values, a duration and rows its probe has';

const KEYS = ['param', 'values', 'runFor', 'read', 'label'];

/**
 * What is wrong with one step's declaration, as sentences for an author.
 * @param {object} step - A step carrying `variation`
 * @param {Array<object>} steps - The steps the lesson lays out, in order
 * @param {object} [ctx] - A probe context to read the probe's row ids from
 * @returns {Array<string>} Empty when the declaration can run
 */
export function variationProblems(step, steps, ctx = emptyProbeContext()) {
  const v = step.variation;
  if (!v || typeof v !== 'object') return ['variation is an object'];
  const scene = sceneIn(steps, step);
  const bad = [];
  for (const k of Object.keys(v))
    if (!KEYS.includes(k))
      bad.push(`variation has no key "${k}" (one parameter only)`);
  if (typeof v.param !== 'string' || !v.param) bad.push('param names one key');
  else if (!locate(scene, v.param))
    bad.push(
      `param "${v.param}" is not a numeric key of the step's setup.settings (on a step with no stage) or of a starPair or system stage in force`
    );
  const vals = v.values;
  if (!Array.isArray(vals) || vals.length < 2 || vals.length > MAX_RUNS)
    bad.push(`values lists 2 to ${MAX_RUNS} numbers`);
  else if (!vals.every(Number.isFinite) || new Set(vals).size !== vals.length)
    bad.push('values are distinct finite numbers');
  if (!(v.runFor > 0)) bad.push('runFor is simulated days, above zero');
  if (!Array.isArray(v.read) || !v.read.length)
    bad.push('read lists the probe row ids to take');
  else {
    let ids = [];
    try {
      ids = (step.probe?.(ctx) || []).map(r => r.id);
    } catch {
      ids = [];
    }
    for (const id of v.read)
      if (!ids.includes(id)) bad.push(`the step's probe has no row "${id}"`);
  }
  if (typeof v.label !== 'string' || !v.label.trim())
    bad.push('label names the parameter');
  return bad;
}

/**
 * Findings for every step of every lesson that declares a variation.
 * @param {{investigations: Array<{id: string, steps: Array<object>}>}} inputs
 * @returns {Array<object>} author-check findings
 */
export function variationFindings(inputs) {
  const out = [];
  for (const lesson of inputs.investigations)
    lesson.steps.forEach((step, i) => {
      if (!step.variation) return;
      for (const message of variationProblems(step, lesson.steps))
        out.push({
          level: 'error',
          rule: VARIATION_RULE,
          lesson: lesson.id,
          step: i,
          message,
        });
    });
  return out;
}
